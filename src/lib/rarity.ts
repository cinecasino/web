export type Rarity = 'bodrio' | 'comun' | 'pococomun' | 'rara' | 'epica' | 'legendaria' | 'reliquia' | 'mitica' | 'divina';

/** De peor a mejor. El orden importa: cajas, filtros y efectos comparan por posición. */
export const RARITIES: Rarity[] = ['bodrio', 'comun', 'pococomun', 'rara', 'epica', 'legendaria', 'reliquia', 'mitica', 'divina'];

export const RARITY: Record<Rarity, { label: string; color: string; emoji: string; xp: number; coins: number }> = {
  bodrio: { label: 'Bodrio', color: '#9a7a4a', emoji: '💩', xp: 3, coins: 5 },
  comun: { label: 'Común', color: '#a7b0c0', emoji: '⚪', xp: 5, coins: 10 },
  pococomun: { label: 'Poco común', color: '#4cd964', emoji: '🟢', xp: 7, coins: 15 },
  rara: { label: 'Rara', color: '#3fa9ff', emoji: '🔵', xp: 10, coins: 20 },
  epica: { label: 'Épica', color: '#b44cff', emoji: '🟣', xp: 20, coins: 40 },
  legendaria: { label: 'Legendaria', color: '#ffb020', emoji: '🟠', xp: 40, coins: 80 },
  reliquia: { label: 'Reliquia', color: '#e3c98f', emoji: '👁️', xp: 60, coins: 120 },
  mitica: { label: 'Mítica', color: '#ff3d7f', emoji: '🌈', xp: 80, coins: 150 },
  divina: { label: 'Divina', color: '#fff3b0', emoji: '✨', xp: 150, coins: 300 },
};

/** Texto de la regla de cada rareza, para la landing. */
export const RARITY_RULE: Record<Rarity, string> = {
  divina: '8,6 o más y al menos 5.000 votos',
  mitica: '8,2 o más y al menos 1.500 votos',
  reliquia: '8 o más, 300 votos y estrenada antes de 1970',
  legendaria: '7,7 o más y al menos 500 votos',
  epica: '7,1 o más y al menos 150 votos',
  rara: 'Nota de 6,4 o más',
  pococomun: 'Nota de 5,6 o más',
  comun: 'Nota por encima de 4,5',
  bodrio: 'Nota de 4,5 o menos',
};

/** La rareza sale de la nota media, de cuánta gente la ha votado y (para las Reliquias) del año. */
export function rarityOf(t: { vote: number; votes: number; year?: string }): Rarity {
  const { vote, votes } = t;
  const year = Number(t.year) || 0;
  if (vote >= 8.6 && votes >= 5000) return 'divina';
  if (vote >= 8.2 && votes >= 1500) return 'mitica';
  if (vote >= 8.0 && votes >= 300 && year > 0 && year < 1970) return 'reliquia';
  if (vote >= 7.7 && votes >= 500) return 'legendaria';
  if (vote >= 7.1 && votes >= 150) return 'epica';
  if (vote >= 6.4) return 'rara';
  if (vote >= 5.6) return 'pococomun';
  if (vote > 4.5) return 'comun';
  return 'bodrio';
}

export const rarityRank = (r: Rarity) => RARITIES.indexOf(r);

/** ¿`r` es `min` o mejor? Más legible que comparar posiciones a mano. */
export const atLeast = (r: Rarity, min: Rarity) => rarityRank(r) >= rarityRank(min);

/** Sin estrenar o con tan pocos votos que la nota no significa nada: no se les asigna rareza. */
export type Status = 'rated' | 'upcoming' | 'unrated';

export const MIN_VOTES_RATED = 20;

export const STATUS: Record<Exclude<Status, 'rated'>, { label: string; emoji: string; cls: string }> = {
  upcoming: { label: 'Próximamente', emoji: '🔮', cls: 'r-upcoming' },
  unrated: { label: 'Sin valorar', emoji: '❔', cls: 'r-unrated' },
};

const today = () => new Date().toISOString().slice(0, 10);

/** `date` undefined = dato antiguo sin fecha guardada: se trata como estrenado. */
export function statusOf(t: { votes: number; date?: string }): Status {
  if (t.date !== undefined && (t.date === '' || t.date > today())) return 'upcoming';
  if (t.votes < MIN_VOTES_RATED) return 'unrated';
  return 'rated';
}
