// Ajustes del jugador: plataformas ("solo lo que puedo ver"), país e idioma de los datos de TMDB.
import { getState, providerFilterOn, setLang, setProviders, setRegion, type Lang } from './store';
import { img, providerList } from './tmdb';
import { openModal } from './card';
import { REGIONS, regionName } from './region';
import * as fx from './fx';
import { esc } from './util';

const LANGS: [Lang, string][] = [
  ['es-ES', 'Español'],
  ['en-US', 'English'],
];

export function openSettings() {
  const s = getState();
  const inner = openModal(
    `<div class="settings">
      <h2 class="neon-gold">⚙️ AJUSTES</h2>
      <section>
        <h3>📡 Mis plataformas</h3>
        <label class="check"><input type="checkbox" data-only ${s.providersOnly ? 'checked' : ''}> <span>Solo títulos incluidos en mis plataformas <small class="muted">(en la suscripción, sin alquiler ni compra)</small></span></label>
        <div class="prov-grid" data-provs><p class="muted small loading-dots">Cargando plataformas</p></div>
        <p class="muted small" data-hint></p>
      </section>
      <section>
        <h3>🌍 País</h3>
        <select class="select" data-region aria-label="País">
          ${REGIONS.map((r) => `<option value="${r}" ${r === s.region ? 'selected' : ''}>${esc(regionName(r))}</option>`).join('')}
        </select>
        <p class="muted small">Decide qué plataformas salen y dónde se busca "dónde verla".</p>
      </section>
      <section>
        <h3>🗣️ Idioma de títulos y sinopsis</h3>
        <div class="chips" data-langs>
          ${LANGS.map(([l, label]) => `<button class="chip${l === s.lang ? ' active' : ''}" data-lang="${l}" aria-pressed="${l === s.lang}">${label}</button>`).join('')}
        </div>
        <p class="muted small">Los títulos que ya tienes en el botín se quedan en el idioma en que los ganaste.</p>
      </section>
    </div>`,
  );

  const grid = inner.querySelector<HTMLElement>('[data-provs]')!;
  const hint = inner.querySelector<HTMLElement>('[data-hint]')!;
  const only = inner.querySelector<HTMLInputElement>('[data-only]')!;

  const refreshHint = () => {
    const st = getState();
    hint.textContent = !st.providersOnly
      ? 'Desactivado: los juegos dan títulos de cualquier sitio.'
      : st.providers.length
        ? `Activo: ${st.providers.length} plataforma${st.providers.length > 1 ? 's' : ''} en ${regionName(st.region)}.`
        : 'Elige al menos una plataforma para que el filtro funcione.';
  };

  async function loadProviders() {
    grid.innerHTML = '<p class="muted small loading-dots">Cargando plataformas</p>';
    try {
      const list = await providerList();
      const mine = new Set(getState().providers);
      grid.innerHTML = list
        .map(
          (p) =>
            `<button class="prov-btn" data-id="${p.id}" aria-pressed="${mine.has(p.id)}" title="${esc(p.name)}"><img src="${img(p.logo, 'w92')}" alt="" loading="lazy"><span>${esc(p.name)}</span></button>`,
        )
        .join('');
    } catch {
      grid.innerHTML = '<p class="muted small">📡 No se pudo cargar la lista de plataformas.</p>';
    }
    refreshHint();
  }

  grid.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-id]');
    if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    const ids = [...grid.querySelectorAll<HTMLElement>('[aria-pressed="true"]')].map((x) => Number(x.dataset.id));
    // Elegir la primera plataforma activa el filtro: es lo que se espera al tocarla
    const first = getState().providers.length === 0 && ids.length > 0;
    setProviders(ids, first || getState().providersOnly);
    only.checked = getState().providersOnly;
    refreshHint();
  });
  only.addEventListener('change', () => {
    setProviders(getState().providers, only.checked);
    refreshHint();
  });
  inner.querySelector<HTMLSelectElement>('[data-region]')!.addEventListener('change', (e) => {
    setRegion((e.target as HTMLSelectElement).value);
    loadProviders();
  });
  inner.querySelector('[data-langs]')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-lang]');
    if (!b) return;
    setLang(b.dataset.lang as Lang);
    inner.querySelectorAll<HTMLElement>('[data-lang]').forEach((x) => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    fx.toast(`Títulos y sinopsis en <b>${b.textContent}</b>.`, { icon: '🗣️' });
  });

  loadProviders();
}

/** Texto corto para el HUD cuando el filtro está activo. */
export const filterBadge = () => (providerFilterOn() ? ' 📡' : '');
