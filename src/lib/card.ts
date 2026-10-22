import { details, img, type Details, type Title } from './tmdb';
import { rarityOf, rarityRank, RARITY, STATUS, statusOf } from './rarity';
import { addToBotin, inBotin, isSeen, markSeen, type Saved } from './store';
import { sfx } from './sfx';
import * as fx from './fx';
import { esc, fmt, preload, sleep } from './util';
import { allowsExternal, setConsent } from './consent';
import { SITE, u } from '../site';

// Registro global de títulos pintados, para abrir su ficha desde cualquier sitio con data-title-key.
const registry = new Map<string, Title>();
export const register = (t: Title) => {
  registry.set(t.key, t);
  return t;
};
export const lookup = (k: string) => registry.get(k);

export function fromSaved(s: Saved): Title {
  return {
    key: s.key,
    id: s.id,
    type: s.type,
    title: s.title,
    original: '',
    overview: '',
    poster: s.poster,
    backdrop: null,
    vote: s.vote,
    votes: s.votes,
    year: s.year,
    date: s.date,
    genres: s.genres ?? [],
    popularity: 0,
  };
}

const longDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/** Clase de marco y texto de la nota según si está valorado, sin valorar o por estrenar. */
function look(t: Title) {
  const st = statusOf(t);
  const r = rarityOf(t.vote, t.votes);
  if (st === 'rated') return { st, r, cls: `r-${r}${rarityRank(r) >= 2 ? ' holo' : ''}`, rating: `⭐ ${t.vote.toFixed(1)}` };
  return { st, r, cls: STATUS[st].cls, rating: st === 'upcoming' ? `🔮 ${t.year || 'Pronto'}` : '❔ s/n' };
}

export function tileHTML(t: Title, o: { extra?: string; cls?: string; open?: boolean; size?: string } = {}): string {
  register(t);
  const L = look(t);
  const open = o.open === false ? '' : ` data-title-key="${t.key}" role="button" tabindex="0"`;
  return `<div class="tile ${L.cls} ${o.cls ?? ''}"${open} title="${esc(t.title)}">
    <img loading="lazy" decoding="async" src="${img(t.poster, o.size ?? 'w342')}" alt="">
    ${L.st === 'upcoming' ? '<span class="soon-ribbon">PRÓXIMAMENTE</span>' : ''}
    <span class="tile-rating">${L.rating}</span>
    <span class="tile-type">${t.type === 'movie' ? '🎬' : '📺'}</span>
    <span class="tile-title">${esc(t.title)}</span>
    ${o.extra ?? ''}
  </div>`;
}

const dlg = () => document.getElementById('modal') as HTMLDialogElement;

export function openModal(html: string, cls = ''): HTMLElement {
  const m = dlg();
  const inner = m.querySelector('.modal-inner') as HTMLElement;
  inner.className = `modal-inner ${cls}`;
  inner.innerHTML = `<button class="modal-x" data-close aria-label="Cerrar">✕</button>${html}`;
  if (!m.open) m.showModal();
  fx.liftFx(m);
  inner.scrollTop = 0;
  return inner;
}

export function closeModal() {
  const m = dlg();
  if (m.open) m.close();
}

export const modalClosed = () => new Promise<void>((r) => dlg().addEventListener('close', () => r(), { once: true }));

function provRow(label: string, list: Details['providers']['flatrate']) {
  if (!list.length) return '';
  return `<div class="prov-row"><span>${label}</span>${list
    .map((p) => `<img src="${img(p.logo, 'w92')}" alt="${esc(p.name)}" title="${esc(p.name)}">`)
    .join('')}</div>`;
}

// Premios pendientes de cobrar en esta visita: solo estos títulos se pueden meter en el botín.
// Abrir un póster cualquiera (ticker, tendencias, landing…) es solo mirar, no coleccionar.
const claimable = new Set<string>();
export const grantClaim = (t: Title) => claimable.add(register(t).key);
export const canClaim = (key: string) => claimable.has(key);

export async function showTitle(t: Title, o: { headline?: string; reveal?: boolean; prize?: boolean } = {}): Promise<void> {
  register(t);
  if (o.prize) grantClaim(t);
  const { st, r, cls } = look(t);
  const R = RARITY[r];
  const badge = st === 'rated' ? R : STATUS[st];
  const fancy = st === 'rated' && rarityRank(r) >= 2;
  const score =
    st === 'rated'
      ? `<span class="stars" style="--p:${t.vote * 10}%">★★★★★</span><b>${t.vote.toFixed(1)}</b><small>${fmt(t.votes)} votos</small>`
      : st === 'upcoming'
        ? `<span class="tm-soon">🔮 ${t.date ? `Se estrena el ${longDate(t.date)}` : 'Sin fecha de estreno'} · aún sin nota</span>`
        : `<span class="tm-soon">❔ Todavía sin valoraciones suficientes (${fmt(t.votes)} votos)</span>`;
  const inner = openModal(
    `<div class="title-modal ${cls.replace(' holo', '')}">
      ${o.headline ? `<div class="tm-headline">${o.headline}</div>` : ''}
      <div class="tm-grid">
        <div class="flip${o.reveal ? '' : ' flipped'}">
          <div class="flip-inner">
            <div class="flip-back"><span>🎰</span><b>${esc(SITE.logo.join(' '))}</b></div>
            <div class="flip-front${fancy ? ' holo' : ''}"><img src="${img(t.poster, 'w500')}" alt=""></div>
          </div>
          <div class="rarity-stamp">${badge.label}</div>
        </div>
        <div class="tm-info">
          <div class="tm-badges">
            <span class="rarity-badge">${badge.emoji} ${badge.label}</span>
            <span class="chip">${t.type === 'movie' ? '🎬 Película' : '📺 Serie'}</span>
            ${t.year ? `<span class="chip">📅 ${t.year}</span>` : ''}
          </div>
          <h2 class="tm-title">${esc(t.title)}</h2>
          ${t.original && t.original !== t.title ? `<p class="tm-original">${esc(t.original)}</p>` : ''}
          <div class="tm-score">${score}</div>
          <p class="tm-tagline" data-f="tagline"></p>
          <p class="tm-overview" data-f="overview">${t.overview ? esc(t.overview) : '<span class="loading-dots">Cargando sinopsis</span>'}</p>
          <div class="tm-meta" data-f="meta"></div>
          <div class="tm-providers" data-f="providers"></div>
          <div class="tm-actions">
            <button class="btn btn-gold" data-act="botin"></button>
            <button class="btn btn-green" data-act="seen"></button>
            <button class="btn btn-ghost" data-act="trailer" hidden>▶ Tráiler</button>
            <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.themoviedb.org/${t.type}/${t.id}">TMDB ↗</a>
          </div>
          <div class="tm-trailer" data-f="trailer"></div>
        </div>
      </div>
    </div>`,
    'wide',
  );
  inner.dataset.key = t.key;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => inner.querySelector(sel) as T;
  const btnBotin = $<HTMLButtonElement>('[data-act="botin"]');
  const btnSeen = $<HTMLButtonElement>('[data-act="seen"]');
  const btnTrailer = $<HTMLButtonElement>('[data-act="trailer"]');

  const sync = () => {
    const has = inBotin(t.key);
    const won = canClaim(t.key);
    btnBotin.disabled = has || !won;
    btnBotin.innerHTML = has ? '✅ En tu botín' : won ? `💰 Al botín <small>+${R.xp} XP</small>` : '🔒 Solo se consigue jugando';
    btnBotin.title = has || won ? '' : 'Los títulos del botín se ganan en los juegos del casino';
    // "Ya la vi" solo para lo que ya es tuyo: si no, se podrían farmear fichas mirando carteles
    const seen = isSeen(t.key);
    btnSeen.hidden = !has && !seen;
    btnSeen.disabled = seen || st === 'upcoming';
    btnSeen.innerHTML = seen ? '✅ Vista' : st === 'upcoming' ? '🔮 Aún no estrenada' : `👁️ Ya la vi <small>+${R.coins} 🪙</small>`;
  };
  sync();

  btnBotin.onclick = () => {
    if (!canClaim(t.key)) return;
    claimable.delete(t.key);
    const xp = addToBotin(t);
    if (!xp) return;
    sfx.coin();
    fx.floatFrom(btnBotin, `+${xp} XP`, 'xp');
    fx.burst({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: [R.color, '#ffffff'] });
    sync();
  };
  btnSeen.onclick = () => {
    if (!inBotin(t.key)) return;
    const coins = markSeen(t);
    if (!coins) return;
    sfx.coins(5);
    fx.floatFrom(btnSeen, `+${coins} 🪙`, 'pos');
    fx.coinRain(14);
    sync();
  };

  const closed = modalClosed();

  if (o.reveal) {
    sfx.drumroll(700);
    // Se gira la carta cuando el cartel ya está listo, para no destapar un hueco en conexiones lentas
    await Promise.all([sleep(750), preload(img(t.poster, 'w500'), 2000)]);
    if (inner.dataset.key !== t.key) return closed;
    $('.flip').classList.add('flipped');
    sfx.reveal();
    if (fancy) fx.shake(rarityRank(r) >= 3 ? 'lg' : 'sm');
    if (st === 'rated') fx.rarityBurst(r);
    else fx.burst({ particleCount: 50, colors: ['#29f0ff', '#ffffff'] });
  }

  details(t.type, t.id)
    .then((d) => {
      if (inner.dataset.key !== t.key) return;
      if (d.tagline) $('[data-f="tagline"]').textContent = `“${d.tagline}”`;
      $('[data-f="overview"]').textContent = d.overview || 'Sin sinopsis disponible. Vívelo a ciegas. 🎲';
      const meta: string[] = d.genres.map((g) => `<span class="chip">${esc(g)}</span>`);
      if (d.runtime) meta.push(`<span class="chip">⏱️ ${d.runtime} min</span>`);
      if (d.seasons) meta.push(`<span class="chip">📺 ${d.seasons} temp.</span>`);
      let metaHtml = `<div class="chips">${meta.join('')}</div>`;
      if (d.director) metaHtml += `<p><b>${t.type === 'movie' ? 'Dirección' : 'Creación'}:</b> ${esc(d.director)}</p>`;
      if (d.cast.length) metaHtml += `<p><b>Reparto:</b> ${d.cast.map(esc).join(', ')}</p>`;
      $('[data-f="meta"]').innerHTML = metaHtml;
      const p = d.providers;
      const rows = provRow('Incluida en', p.flatrate) + provRow('Alquiler', p.rent) + provRow('Compra', p.buy);
      $('[data-f="providers"]').innerHTML = rows
        ? `<h4>📡 Dónde verla en España</h4>${rows}${p.link ? `<a class="muted-link" href="${p.link}" target="_blank" rel="noopener">Ver todas las opciones ↗</a>` : ''}<p class="attrib">Datos de plataformas: JustWatch</p>`
        : '<h4>📡 Dónde verla</h4><p class="muted">No figura en plataformas españolas ahora mismo.</p>';
      if (d.trailer) {
        btnTrailer.hidden = false;
        const play = () => {
          $('[data-f="trailer"]').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${d.trailer}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
          btnTrailer.hidden = true;
        };
        btnTrailer.onclick = () => {
          if (allowsExternal()) return play();
          // Sin consentimiento no se contacta con YouTube
          const box = $('[data-f="trailer"]');
          box.innerHTML = `<div class="consent-gate">
            <p>🍪 El tráiler se carga desde <b>YouTube</b>, que puede usar sus propias cookies. <a href="${u('cookies')}" target="_blank">Más info</a></p>
            <button class="btn btn-gold" data-allow>Permitir y ver</button>
            <a class="btn btn-ghost" href="https://www.youtube.com/watch?v=${d.trailer}" target="_blank" rel="noopener">Abrir en YouTube ↗</a>
          </div>`;
          box.querySelector<HTMLButtonElement>('[data-allow]')!.onclick = () => {
            setConsent(true);
            play();
          };
        };
      }
    })
    .catch(() => {
      if (inner.dataset.key === t.key && !t.overview) $('[data-f="overview"]').textContent = 'No se pudo cargar la ficha.';
    });

  return closed;
}
