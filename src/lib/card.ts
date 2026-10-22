import { collectionParts, details, img, type Details, type Title } from './tmdb';
import { atLeast, rarityOf, RARITY, STATUS, statusOf } from './rarity';
import { addToBotin, getState, inBotin, isSeen, markSeen, patchSaved, savedOf, type Saved } from './store';
import { ARTES, arteBadge, arteRender, isSpecial, rollArte, type Arte } from './arts';
import { detailSellos, selloHTML, sellosOf } from './sellos';
import { regionName } from './region';
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
    backdrop: s.backdrop ?? null,
    vote: s.vote,
    votes: s.votes,
    year: s.year,
    date: s.date,
    genres: s.genres ?? [],
    popularity: s.pop ?? 0,
    lang: s.lang,
  };
}

const longDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/** Clase de marco y texto de la nota según si está valorado, sin valorar o por estrenar. */
function look(t: Title) {
  const st = statusOf(t);
  const r = rarityOf(t);
  if (st === 'rated') return { st, r, cls: `r-${r}`, rating: `⭐ ${t.vote.toFixed(1)}` };
  return { st, r, cls: STATUS[st].cls, rating: st === 'upcoming' ? `🔮 ${t.year || 'Pronto'}` : '❔ s/n' };
}

export interface TileOpts {
  extra?: string;
  cls?: string;
  open?: boolean;
  size?: string;
  /** Arte de la carta (las guardadas o los premios ya sorteados). */
  arte?: Arte;
  sig?: string;
  /** false = sin pegatinas de sellos (tiras de las cajas, demos). */
  sellos?: boolean;
}

export function tileHTML(t: Title, o: TileOpts = {}): string {
  register(t);
  const L = look(t);
  const open = o.open === false ? '' : ` data-title-key="${t.key}" role="button" tabindex="0"`;
  const base = img(t.poster, o.size ?? 'w342');
  const A = arteRender(o.arte, { img: base, backdrop: t.backdrop, sig: o.sig });
  const sellos = o.sellos === false ? [] : sellosOf(t);
  return `<div class="tile ${L.cls} ${A.cls} ${o.cls ?? ''}"${open} title="${esc(t.title)}${isSpecial(o.arte) ? ` · Arte ${ARTES[o.arte!].label}` : ''}">
    <img loading="lazy" decoding="async" src="${A.size ? img(t.poster, A.size) : base}" alt="">
    ${A.extra}
    ${L.st === 'upcoming' ? '<span class="soon-ribbon">PRÓXIMAMENTE</span>' : ''}
    <span class="tile-rating">${L.rating}</span>
    <span class="tile-type">${t.type === 'movie' ? '🎬' : '📺'}</span>
    ${sellos.length ? `<span class="tile-sellos">${selloHTML(sellos)}</span>` : ''}
    <span class="tile-title">${esc(t.title)}</span>
    ${o.extra ?? ''}
  </div>`;
}

/** Póster de una carta del botín, con su arte y su firma. */
export const savedTileHTML = (s: Saved, o: TileOpts = {}) => tileHTML(fromSaved(s), { arte: s.arte, sig: s.sig, ...o });

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
  const mine = new Set(getState().providers);
  return `<div class="prov-row"><span>${label}</span>${list
    .map((p) => `<img src="${img(p.logo, 'w92')}" alt="${esc(p.name)}" title="${esc(p.name)}${mine.has(p.id) ? ' · la tienes' : ''}"${mine.has(p.id) ? ' class="mine"' : ''}>`)
    .join('')}</div>`;
}

// Premios pendientes de cobrar en esta visita, con el arte que les ha tocado: solo estos títulos se
// pueden meter en el botín. Abrir un póster cualquiera (ticker, tendencias, landing…) es solo mirar.
const claimable = new Map<string, Arte>();

/** Marca un título como premio y le sortea el arte (una sola vez: repetir no vuelve a sortear). */
export function grantClaim(t: Title, luck = 1): Arte {
  register(t);
  let a = claimable.get(t.key);
  if (!a) claimable.set(t.key, (a = rollArte(luck)));
  return a;
}
export const canClaim = (key: string) => claimable.has(key);

/**
 * Completa una carta recién guardada con datos de la ficha: saga y directores (para Colecciones)
 * y la firma del arte Firmada. La ficha casi siempre está ya en caché porque se acaba de abrir.
 */
export async function enrich(t: Pick<Title, 'key' | 'type' | 'id'>, arte?: Arte) {
  try {
    const d = await details(t.type, t.id);
    const name = d.director.split(',')[0]?.trim();
    patchSaved(t.key, {
      ...(t.type === 'movie' ? { col: d.collection, dirs: d.directors } : {}),
      ...(arte === 'firmada' && name ? { sig: name } : {}),
    });
  } catch {}
}

/** Guarda un título ganado con su arte (o suma una copia si ya lo tenías). Devuelve la XP. */
export function collect(t: Title, arte: Arte): number {
  const xp = addToBotin(t, arte);
  if (xp) enrich(t, arte);
  return xp;
}

export async function showTitle(
  t: Title,
  o: { headline?: string; reveal?: boolean; prize?: boolean; luck?: number; arte?: Arte } = {},
): Promise<void> {
  register(t);
  if (o.prize) grantClaim(t, o.luck);
  const { st, r, cls } = look(t);
  const R = RARITY[r];
  const badge = st === 'rated' ? R : STATUS[st];
  const saved = savedOf(t.key);
  // El arte que se enseña: el que se pide, el del premio pendiente o el de tu carta guardada
  const arte: Arte = o.arte ?? claimable.get(t.key) ?? saved?.arte ?? 'normal';
  const A = arteRender(arte, { img: img(t.poster, 'w500'), backdrop: t.backdrop ?? saved?.backdrop, sig: saved?.sig });
  const fancy = (st === 'rated' && atLeast(r, 'epica')) || isSpecial(arte);
  const sellos = sellosOf(t);
  const score =
    st === 'rated'
      ? `<span class="stars" style="--p:${t.vote * 10}%">★★★★★</span><b>${t.vote.toFixed(1)}</b><small>${fmt(t.votes)} votos</small>`
      : st === 'upcoming'
        ? `<span class="tm-soon">🔮 ${t.date ? `Se estrena el ${longDate(t.date)}` : 'Sin fecha de estreno'} · aún sin nota</span>`
        : `<span class="tm-soon">❔ Todavía sin valoraciones suficientes (${fmt(t.votes)} votos)</span>`;
  const inner = openModal(
    `<div class="title-modal ${cls}">
      ${o.headline ? `<div class="tm-headline">${o.headline}</div>` : ''}
      <div class="tm-grid">
        <div class="flip${o.reveal ? '' : ' flipped'}">
          <div class="flip-inner">
            <div class="flip-back"><span>🎰</span><b>${esc(SITE.logo.join(' '))}</b></div>
            <div class="flip-front ${A.cls}"><img src="${img(t.poster, A.size ?? 'w500')}" alt="">${A.extra}</div>
          </div>
          <div class="rarity-stamp">${badge.label}</div>
        </div>
        <div class="tm-info">
          <div class="tm-badges" data-f="badges">
            <span class="rarity-badge">${badge.emoji} ${badge.label}</span>
            ${isSpecial(arte) ? arteBadge(arte) : ''}
            ${saved?.copies ? `<span class="chip" title="Copias repetidas: material para el Taller">🧩 ${saved.copies} cop${saved.copies === 1 ? 'ia' : 'ias'}</span>` : ''}
            ${sellos.length ? `<span class="tm-sellos">${selloHTML(sellos)}</span>` : ''}
            <span class="chip">${t.type === 'movie' ? '🎬 Película' : '📺 Serie'}</span>
            ${t.year ? `<span class="chip">📅 ${t.year}</span>` : ''}
            ${t.offPlatform ? '<span class="chip off-platform" title="No había nada con tus plataformas para esta jugada">📡 Fuera de tus plataformas</span>' : ''}
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
            <button class="btn btn-ghost" data-act="share" title="Crea una imagen con la carta para enviarla">📤 Compartir</button>
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
    btnBotin.disabled = !won;
    btnBotin.innerHTML = won
      ? has
        ? '➕ Copia al Taller'
        : `💰 Al botín <small>+${R.xp} XP</small>`
      : has
        ? '✅ En tu botín'
        : '🔒 Solo se consigue jugando';
    btnBotin.title = won && has ? 'Ya la tienes: guárdala como copia para mejorar su arte en el Taller (Mi Botín)' : has || won ? '' : 'Los títulos del botín se ganan en los juegos del casino';
    // "Ya la vi" solo para lo que ya es tuyo: si no, se podrían farmear fichas mirando carteles
    const seen = isSeen(t.key);
    btnSeen.hidden = !has && !seen;
    btnSeen.disabled = seen || st === 'upcoming';
    btnSeen.innerHTML = seen ? '✅ Vista' : st === 'upcoming' ? '🔮 Aún no estrenada' : `👁️ Ya la vi <small>+${R.coins} 🪙</small>`;
  };
  sync();

  btnBotin.onclick = () => {
    const a = claimable.get(t.key);
    if (!a) return;
    claimable.delete(t.key);
    const xp = collect(t, a);
    sfx.coin();
    if (xp) {
      fx.floatFrom(btnBotin, `+${xp} XP`, 'xp');
      fx.burst({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: [R.color, '#ffffff'] });
    } else fx.floatFrom(btnBotin, '+1 copia', 'pos');
    sync();
  };
  const btnShare = $<HTMLButtonElement>('[data-act="share"]');
  btnShare.onclick = async () => {
    btnShare.disabled = true;
    btnShare.innerHTML = '<span class="loading-dots">Preparando</span>';
    try {
      const { shareTitle } = await import('./share');
      await shareTitle(t, arte, savedOf(t.key)?.sig);
    } finally {
      btnShare.disabled = false;
      btnShare.innerHTML = '📤 Compartir';
    }
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
    if (fancy) fx.shake(st === 'rated' && atLeast(r, 'legendaria') ? 'lg' : 'sm');
    if (st === 'rated') fx.rarityBurst(r);
    else fx.burst({ particleCount: 50, colors: ['#29f0ff', '#ffffff'] });
    if (isSpecial(arte)) {
      // Un arte especial merece su propio momento
      setTimeout(() => {
        sfx.win();
        fx.toast(`<b>¡Arte ${ARTES[arte].label}!</b><br>${ARTES[arte].desc}`, { icon: ARTES[arte].emoji, color: 'var(--gold)', ms: 4500 });
        if (arte === 'billete') fx.banner('¡BILLETE DORADO!', 'Guárdala en tu botín y cobra 5.000 fichas', 'var(--gold)', 2400);
      }, 700);
    }
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
      // Sellos que solo se saben con la ficha (duración, temporadas) y la firma si aún no la había
      const extra = detailSellos(d, t.type);
      if (extra.length) $('[data-f="badges"]').insertAdjacentHTML('beforeend', `<span class="tm-sellos">${selloHTML(extra)}</span>`);
      const sig = inner.querySelector<HTMLElement>('.ar-sig');
      if (sig && !saved?.sig && d.director) sig.textContent = d.director.split(',')[0];
      // Saga: cuántas partes tienes ya en el botín
      if (d.collection) {
        const col = d.collection;
        // (la propia carta cuenta aunque aún no se haya guardado su saga)
        const owned = getState().botin.filter((b) => b.col?.id === col.id || b.key === t.key).length;
        const chip = document.createElement('a');
        chip.className = 'chip saga-chip';
        chip.href = `${u('colecciones')}#saga-${col.id}`;
        chip.innerHTML = `🧩 ${esc(col.name.replace(/\s*-\s*(Colección|Collection)$/i, ''))}`;
        $('[data-f="badges"]').appendChild(chip);
        collectionParts(col.id)
          .then(({ parts }) => parts.length && (chip.innerHTML += ` · <b>${Math.min(owned, parts.length)}/${parts.length}</b>`))
          .catch(() => {});
      }
      const p = d.providers;
      const rows = provRow('Incluida en', p.flatrate) + provRow('Alquiler', p.rent) + provRow('Compra', p.buy);
      const country = esc(regionName(getState().region));
      $('[data-f="providers"]').innerHTML = rows
        ? `<h4>📡 Dónde verla en ${country}</h4>${rows}${p.link ? `<a class="muted-link" href="${p.link}" target="_blank" rel="noopener">Ver todas las opciones ↗</a>` : ''}<p class="attrib">Datos de plataformas: JustWatch</p>`
        : `<h4>📡 Dónde verla</h4><p class="muted">No figura en plataformas de ${country} ahora mismo.</p>`;
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
