import type { Rarity } from './rarity';

export interface Box {
  id: string;
  name: string;
  icon: string;
  price: number;
  color: string;
  odds: Record<Rarity, number>;
}

export const BOXES: Box[] = [
  { id: 'bronce', name: 'Caja de Bronce', icon: '📦', price: 40, color: '#cd7f32', odds: { comun: 55, rara: 28, epica: 12, legendaria: 4, mitica: 1 } },
  { id: 'plata', name: 'Caja de Plata', icon: '🎁', price: 120, color: '#c8d0e0', odds: { comun: 22, rara: 38, epica: 26, legendaria: 10, mitica: 4 } },
  { id: 'oro', name: 'Caja de Oro', icon: '👑', price: 300, color: '#ffc93c', odds: { comun: 0, rara: 15, epica: 42, legendaria: 30, mitica: 13 } },
  { id: 'diamante', name: 'Caja Diamante', icon: '💎', price: 750, color: '#29f0ff', odds: { comun: 0, rara: 0, epica: 25, legendaria: 45, mitica: 30 } },
];

/** Fichas que te llevas según la rareza del título que toque. */
export const BOX_VALUE: Record<Rarity, number> = { comun: 10, rara: 30, epica: 80, legendaria: 250, mitica: 600 };
