// Lógica pura de la tragaperras (sin DOM), separada de la página para poder probarla.
import { SYMBOLS } from './genres';
import { weighted } from './util';

export type Sym = { key: string; emoji: string; name: string; movie?: number; tv?: number };
export type Kind = 'none' | 'pair' | 'jackpot' | 'mega';

export const WILD: Sym = { key: 'wild', emoji: '⭐', name: 'COMODÍN' };
const REEL_KEYS = ['accion', 'comedia', 'terror', 'scifi', 'drama', 'animacion', 'crimen'];
export const POOL: Sym[] = [...SYMBOLS.filter((s) => REEL_KEYS.includes(s.key)).map((s) => ({ ...s, name: s.short ?? s.name })), WILD];
export const WILD_WEIGHT = 0.55;

export const roll = () => weighted(POOL, (s) => (s.key === 'wild' ? WILD_WEIGHT : 1));

export const matches = (a: Sym, b: Sym) => a.key === b.key || a.key === 'wild' || b.key === 'wild';

/** Tres comodines = mega jackpot (el bote); tres iguales (con comodines) = x10; dos = x1,5. */
export function evaluate(r: Sym[]): { kind: Kind; mult: number } {
  const wilds = r.filter((s) => s.key === 'wild').length;
  if (wilds === 3) return { kind: 'mega', mult: 0 };
  const counts = new Map<string, number>();
  r.forEach((s) => s.key !== 'wild' && counts.set(s.key, (counts.get(s.key) ?? 0) + 1));
  const best = Math.max(...counts.values()) + wilds;
  if (best >= 3) return { kind: 'jackpot', mult: 10 };
  if (best === 2) return { kind: 'pair', mult: 1.5 };
  return { kind: 'none', mult: 0 };
}
