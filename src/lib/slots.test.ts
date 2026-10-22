import { describe, expect, it } from 'vitest';
import { evaluate, POOL, roll, WILD, WILD_WEIGHT, type Sym } from './slots';
import { seedRandom } from '../test/rng';

const sym = (key: string): Sym => (key === 'wild' ? WILD : POOL.find((s) => s.key === key)!);
const reel = (...keys: string[]) => keys.map(sym);

describe('evaluate', () => {
  it('tres comodines son el mega jackpot', () => {
    expect(evaluate(reel('wild', 'wild', 'wild')).kind).toBe('mega');
  });
  it('tres iguales, o completadas con comodines, son jackpot x10', () => {
    expect(evaluate(reel('terror', 'terror', 'terror'))).toEqual({ kind: 'jackpot', mult: 10 });
    expect(evaluate(reel('terror', 'wild', 'terror'))).toEqual({ kind: 'jackpot', mult: 10 });
    expect(evaluate(reel('wild', 'comedia', 'wild'))).toEqual({ kind: 'jackpot', mult: 10 });
  });
  it('dos iguales, o uno con comodín, son pareja x1,5', () => {
    expect(evaluate(reel('drama', 'drama', 'accion'))).toEqual({ kind: 'pair', mult: 1.5 });
    expect(evaluate(reel('drama', 'wild', 'accion'))).toEqual({ kind: 'pair', mult: 1.5 });
  });
  it('tres distintos no pagan', () => {
    expect(evaluate(reel('drama', 'comedia', 'accion'))).toEqual({ kind: 'none', mult: 0 });
  });
});

describe('economía de la tragaperras', () => {
  const weight = (s: Sym) => (s.key === 'wild' ? WILD_WEIGHT : 1);
  const total = POOL.reduce((n, s) => n + weight(s), 0);

  // Recorre las 512 combinaciones con su probabilidad exacta: si alguien toca pesos o premios, salta aquí
  function exact() {
    let rtp = 0;
    let mega = 0;
    for (const a of POOL)
      for (const b of POOL)
        for (const c of POOL) {
          const p = (weight(a) * weight(b) * weight(c)) / total ** 3;
          const r = evaluate([a, b, c]);
          if (r.kind === 'mega') mega += p;
          else rtp += p * r.mult;
        }
    return { rtp, mega };
  }

  it('devuelve el 125,9 % de lo apostado sin contar el bote', () => {
    expect(exact().rtp).toBeCloseTo(1.2593, 3);
  });
  it('el mega jackpot sale más o menos 1 de cada 2600 tiradas', () => {
    expect(1 / exact().mega).toBeGreaterThan(2400);
    expect(1 / exact().mega).toBeLessThan(2800);
  });
  it('roll() respeta el peso del comodín', () => {
    seedRandom(7);
    const n = 50_000;
    let wilds = 0;
    for (let i = 0; i < n; i++) if (roll().key === 'wild') wilds++;
    expect(wilds / n).toBeCloseTo(WILD_WEIGHT / total, 2);
  });
});
