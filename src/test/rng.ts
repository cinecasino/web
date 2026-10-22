import { vi } from 'vitest';

/** Sustituye Math.random por un generador con semilla (mulberry32): mismas tiradas en cada ejecución. */
export function seedRandom(seed = 42) {
  let a = seed >>> 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
