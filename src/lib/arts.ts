// Artes (acabados) de las cartas: se sortean al ganar cada premio, independientes de la rareza.
// Todos se pintan con CSS (src/styles/artes.css) sobre el póster real: no hay ilustraciones.
import { activeEvent, type GameEvent } from './events';
import { esc, weighted } from './util';

export type Arte =
  | 'normal'
  | 'brillante'
  | 'holografico'
  | 'noir'
  | 'vhs'
  | 'popart'
  | 'pixel'
  | 'dorado'
  | 'glitch'
  | 'lenticular'
  | 'firmada'
  | 'billete'
  | 'embrujada';

export type ArteFamily = 'base' | 'retro' | 'ultra' | 'evento';

export interface ArteInfo {
  label: string;
  emoji: string;
  /** Peso en el sorteo (sobre 10 000 con suerte 1). */
  weight: number;
  /** Escalón del Taller: 0 normal, 1 brillante, 2 holográfico, 3 retro, 4 dorado. null = solo por suerte. */
  tier: number | null;
  family: ArteFamily;
  desc: string;
  event?: GameEvent['id'];
}

export const ARTES: Record<Arte, ArteInfo> = {
  normal: { label: 'Normal', emoji: '🖼️', weight: 7000, tier: 0, family: 'base', desc: 'El póster tal cual' },
  brillante: { label: 'Brillante', emoji: '✨', weight: 1400, tier: 1, family: 'base', desc: 'Un destello cruza la carta' },
  holografico: { label: 'Holográfico', emoji: '🌈', weight: 700, tier: 2, family: 'base', desc: 'Arcoíris que se mueve al inclinarla' },
  noir: { label: 'Noir', emoji: '🎞️', weight: 300, tier: 3, family: 'retro', desc: 'Blanco y negro con mucho contraste' },
  vhs: { label: 'VHS', emoji: '📼', weight: 200, tier: 3, family: 'retro', desc: 'Líneas de escaneo y colores corridos' },
  popart: { label: 'Pop-art', emoji: '🟨', weight: 150, tier: 3, family: 'retro', desc: 'Trama de cómic y un ¡POW!' },
  pixel: { label: 'Píxel', emoji: '👾', weight: 100, tier: 3, family: 'retro', desc: 'Píxeles gordos de 8 bits' },
  dorado: { label: 'Dorado', emoji: '🥇', weight: 80, tier: 4, family: 'base', desc: 'Tinte y marco de oro con chispas' },
  glitch: { label: 'Glitch', emoji: '🌀', weight: 40, tier: null, family: 'ultra', desc: 'La imagen se rompe en franjas' },
  lenticular: { label: 'Lenticular', emoji: '🪟', weight: 20, tier: null, family: 'ultra', desc: 'Al inclinarla aparece un fotograma de la peli' },
  firmada: { label: 'Firmada', emoji: '✍️', weight: 8, tier: null, family: 'ultra', desc: 'Con la firma de quien la dirigió. Edición 1/1' },
  billete: { label: 'Billete dorado', emoji: '🎫', weight: 2, tier: null, family: 'ultra', desc: 'Como el de Willy Wonka: trae 5.000 fichas' },
  embrujada: { label: 'Embrujada', emoji: '🎃', weight: 300, tier: null, family: 'evento', desc: 'Solo en Halloween: verde fantasmal y telarañas', event: 'halloween' },
};

export const ARTE_IDS = Object.keys(ARTES) as Arte[];
export const RETRO: Arte[] = ['noir', 'vhs', 'popart', 'pixel'];
export const GOLDEN_TICKET_COINS = 5000;

/** Solo en desarrollo: ?arte=<id> fuerza ese arte en todos los premios, para revisar cómo se ve. */
function forcedArte(): Arte | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  const a = new URLSearchParams(location.search).get('arte') as Arte | null;
  return a && a in ARTES ? a : null;
}

/** Sortea un arte. `luck` multiplica la probabilidad de todo lo que no es normal. */
export function rollArte(luck = 1, event = activeEvent()?.id): Arte {
  const forced = forcedArte();
  if (forced) return forced;
  const pool = ARTE_IDS.filter((a) => !ARTES[a].event || ARTES[a].event === event);
  return weighted(pool, (a) => (a === 'normal' ? ARTES[a].weight : ARTES[a].weight * luck));
}

/** Suerte según la apuesta (tragaperras): 50 → 1, 100 → 1,5, 250 → 2,5. */
export const luckForBet = (bet: number) => (bet >= 250 ? 2.5 : bet >= 100 ? 1.5 : 1);

/** Cuántos artes "especiales" (no normales) tiene una lista de cartas. */
export const isSpecial = (a?: Arte) => !!a && a !== 'normal';

// ---------- Taller ----------

export const TALLER_COPIES = 3;
/** Fichas para subir AL escalón indicado. */
export const TALLER_COINS: Record<number, number> = { 1: 200, 2: 400, 3: 800, 4: 1500 };

/** Artes a los que se puede subir desde `a` en el Taller (vacío si ya no se puede). */
export function upgradesFrom(a: Arte = 'normal'): Arte[] {
  const tier = ARTES[a].tier;
  if (tier === null || tier >= 4) return [];
  return ARTE_IDS.filter((x) => ARTES[x].tier === tier + 1);
}

// ---------- Pintado ----------

export interface ArteRender {
  /** Clases para el contenedor (tile o flip-front). */
  cls: string;
  /** Tamaño de póster a pedir (Píxel usa uno minúsculo a propósito). */
  size?: string;
  /** HTML extra dentro de la carta (capas, firma, pegatinas). */
  extra: string;
}

/**
 * Cómo se pinta un arte. `img` es la URL del póster ya resuelta; `backdrop` y `sig` son opcionales
 * (Lenticular y Firmada). Las capas extra van encima de la imagen y debajo de las etiquetas.
 */
export function arteRender(a: Arte = 'normal', o: { img?: string; backdrop?: string | null; sig?: string } = {}): ArteRender {
  const cls = a === 'normal' ? '' : `arte arte-${a}`;
  switch (a) {
    case 'pixel':
      return { cls, size: 'w92', extra: '' };
    case 'vhs':
      return { cls, extra: '<span class="ar-layer ar-vhs" aria-hidden="true"></span><span class="ar-rec" aria-hidden="true">▶ PLAY</span>' };
    case 'popart':
      return { cls, extra: '<span class="ar-layer ar-dots" aria-hidden="true"></span><span class="ar-pow" aria-hidden="true">¡POW!</span>' };
    case 'dorado':
      return { cls, extra: '<span class="ar-spark s1" aria-hidden="true">✦</span><span class="ar-spark s2" aria-hidden="true">✦</span><span class="ar-spark s3" aria-hidden="true">✧</span>' };
    case 'glitch':
      return o.img ? { cls, extra: `<img class="ar-g g1" src="${o.img}" alt="" aria-hidden="true"><img class="ar-g g2" src="${o.img}" alt="" aria-hidden="true">` } : { cls, extra: '' };
    case 'lenticular':
      return o.backdrop
        ? { cls, extra: `<img class="ar-lent" src="https://image.tmdb.org/t/p/w780${o.backdrop}" alt="" aria-hidden="true" loading="lazy">` }
        : { cls: 'arte arte-holografico', extra: '' };
    case 'firmada':
      return { cls, extra: `<span class="ar-sig" aria-hidden="true">${esc(o.sig || 'Edición especial')}</span><span class="ar-ed">EDICIÓN 1/1</span>` };
    case 'billete':
      return { cls, extra: '<span class="ar-ticket" aria-hidden="true">🎫 BILLETE DORADO</span>' };
    case 'embrujada':
      return { cls, extra: '<span class="ar-web w1" aria-hidden="true">🕸️</span><span class="ar-web w2" aria-hidden="true">🕸️</span><span class="ar-ghost" aria-hidden="true">👻</span>' };
    default:
      return { cls, extra: '' };
  }
}

export const arteBadge = (a: Arte) => `<span class="arte-badge arte-b-${a}">${ARTES[a].emoji} ${ARTES[a].label}</span>`;
