export type Rarity = 'comun' | 'rara' | 'epica' | 'legendaria' | 'mitica';

export const RARITIES: Rarity[] = ['comun', 'rara', 'epica', 'legendaria', 'mitica'];

export const RARITY: Record<Rarity, { label: string; color: string; emoji: string; xp: number; coins: number }> = {
  comun: { label: 'Común', color: '#a7b0c0', emoji: '⚪', xp: 5, coins: 10 },
  rara: { label: 'Rara', color: '#3fa9ff', emoji: '🔵', xp: 10, coins: 20 },
  epica: { label: 'Épica', color: '#b44cff', emoji: '🟣', xp: 20, coins: 40 },
  legendaria: { label: 'Legendaria', color: '#ffb020', emoji: '🟠', xp: 40, coins: 80 },
  mitica: { label: 'Mítica', color: '#ff3d7f', emoji: '🌈', xp: 80, coins: 150 },
};

/** La rareza sale de la nota media y de cuánta gente la ha votado. */
export function rarityOf(vote: number, votes: number): Rarity {
  if (vote >= 8.2 && votes >= 1500) return 'mitica';
  if (vote >= 7.7 && votes >= 500) return 'legendaria';
  if (vote >= 7.1 && votes >= 150) return 'epica';
  if (vote >= 6.4) return 'rara';
  return 'comun';
}

export const rarityRank = (r: Rarity) => RARITIES.indexOf(r);

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
