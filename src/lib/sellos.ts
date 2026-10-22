// Sellos: pegatinas que salen de los datos de TMDB. Una carta puede tener varios a la vez.
export type SelloId = 'clasico' | 'mudo' | 'joya' | 'taquillazo' | 'reciente' | 'internacional' | 'maraton' | 'expres';

export const SELLOS: Record<SelloId, { emoji: string; label: string; desc: string }> = {
  clasico: { emoji: '🏛️', label: 'Clásico', desc: 'Estrenada antes de 1980' },
  mudo: { emoji: '🎞️', label: 'Cine mudo', desc: 'Estrenada antes de 1930' },
  joya: { emoji: '💎', label: 'Joya oculta', desc: 'Nota de 7,5 o más con menos de 500 votos' },
  taquillazo: { emoji: '🔥', label: 'Taquillazo', desc: 'De lo más popular en TMDB ahora mismo' },
  reciente: { emoji: '🆕', label: 'Recién salida', desc: 'Estrenada hace menos de 60 días' },
  internacional: { emoji: '🌍', label: 'Internacional', desc: 'Rodada en un idioma que no es inglés ni español' },
  maraton: { emoji: '📺', label: 'Maratón', desc: 'Serie de 5 temporadas o más' },
  expres: { emoji: '⏱️', label: 'Exprés', desc: 'Película de menos de 90 minutos' },
};

export const TAQUILLAZO_POP = 100;
const DAY = 86_400_000;

export interface SelloInput {
  year?: string;
  date?: string;
  vote: number;
  votes: number;
  /** Popularidad de TMDB (Title.popularity o Saved.pop). */
  popularity?: number;
  /** Idioma original (ISO 639-1). */
  lang?: string;
}

/** Sellos que se pueden saber con los datos de una búsqueda (sin pedir la ficha). */
export function sellosOf(t: SelloInput, now = Date.now()): SelloId[] {
  const out: SelloId[] = [];
  const year = Number(t.year) || 0;
  if (year && year < 1980) out.push('clasico');
  if (year && year < 1930) out.push('mudo');
  if (t.vote >= 7.5 && t.votes >= 20 && t.votes < 500) out.push('joya');
  if ((t.popularity ?? 0) >= TAQUILLAZO_POP) out.push('taquillazo');
  if (t.date) {
    const age = now - new Date(`${t.date}T00:00`).getTime();
    if (age >= 0 && age < 60 * DAY) out.push('reciente');
  }
  if (t.lang && t.lang !== 'en' && t.lang !== 'es') out.push('internacional');
  return out;
}

/** Sellos que solo se conocen al cargar la ficha (duración y temporadas). */
export function detailSellos(d: { runtime: number | null; seasons: number | null }, type: 'movie' | 'tv'): SelloId[] {
  const out: SelloId[] = [];
  if (type === 'tv' && (d.seasons ?? 0) >= 5) out.push('maraton');
  if (type === 'movie' && d.runtime && d.runtime < 90) out.push('expres');
  return out;
}

export const selloHTML = (ids: SelloId[]) =>
  ids.map((id) => `<span class="sello" title="${SELLOS[id].label}: ${SELLOS[id].desc}">${SELLOS[id].emoji}</span>`).join('');
