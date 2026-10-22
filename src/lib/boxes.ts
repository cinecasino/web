import type { Rarity } from './rarity';
import type { GameEvent } from './events';

export interface Box {
  id: string;
  name: string;
  icon: string;
  price: number;
  color: string;
  /** Probabilidad (%) de cada rareza; las que faltan no salen. Suman 100. */
  odds: Partial<Record<Rarity, number>>;
  /** Multiplica la probabilidad de que el título salga con un arte especial. */
  luck: number;
  /** Caja de temporada: solo se vende durante ese evento. */
  event?: GameEvent['id'];
  /** Solo títulos de estos géneros de película (la Maldita: terror). */
  genres?: number[];
}

export const BOXES: Box[] = [
  { id: 'bronce', name: 'Caja de Bronce', icon: '📦', price: 40, color: '#cd7f32', luck: 1, odds: { bodrio: 4, comun: 40, pococomun: 22, rara: 22, epica: 9, legendaria: 2.5, mitica: 0.5 } },
  { id: 'plata', name: 'Caja de Plata', icon: '🎁', price: 120, color: '#c8d0e0', luck: 1.5, odds: { comun: 12, pococomun: 15, rara: 35, epica: 25, legendaria: 9, reliquia: 1, mitica: 3 } },
  { id: 'oro', name: 'Caja de Oro', icon: '👑', price: 300, color: '#ffc93c', luck: 2.5, odds: { rara: 15, epica: 40, legendaria: 28, reliquia: 5, mitica: 10, divina: 2 } },
  { id: 'diamante', name: 'Caja Diamante', icon: '💎', price: 750, color: '#29f0ff', luck: 4, odds: { epica: 22, legendaria: 40, reliquia: 8, mitica: 24, divina: 6 } },
  { id: 'maldita', name: 'Caja Maldita', icon: '🎃', price: 333, color: '#ff7a1a', luck: 2, odds: { comun: 25, pococomun: 10, rara: 28, epica: 20, legendaria: 10, reliquia: 3, mitica: 4 }, event: 'halloween', genres: [27] },
];

/** Fichas que te llevas según la rareza del título que toque. */
export const BOX_VALUE: Record<Rarity, number> = { bodrio: 5, comun: 10, pococomun: 20, rara: 30, epica: 80, legendaria: 250, reliquia: 350, mitica: 600, divina: 1200 };

export const odd = (b: Box, r: Rarity) => b.odds[r] ?? 0;
