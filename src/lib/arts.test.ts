import { describe, expect, it } from 'vitest';
import { ARTE_IDS, ARTES, arteRender, luckForBet, rollArte, upgradesFrom, type Arte } from './arts';
import { seedRandom } from '../test/rng';

function sample(n: number, luck: number, event?: 'halloween') {
  const count = Object.fromEntries(ARTE_IDS.map((a) => [a, 0])) as Record<Arte, number>;
  for (let i = 0; i < n; i++) count[rollArte(luck, event)]++;
  return count;
}

describe('rollArte', () => {
  it('con suerte 1 sale normal ~72 % de las veces (sin evento)', () => {
    seedRandom(1);
    const c = sample(100_000, 1);
    const total = ARTE_IDS.filter((a) => !ARTES[a].event).reduce((s, a) => s + ARTES[a].weight, 0);
    expect(c.normal / 100_000).toBeCloseTo(ARTES.normal.weight / total, 2);
    expect(c.embrujada).toBe(0);
  });

  it('más suerte = menos cartas normales', () => {
    seedRandom(2);
    const a = sample(50_000, 1).normal;
    seedRandom(2);
    const b = sample(50_000, 4).normal;
    expect(b).toBeLessThan(a * 0.65);
  });

  it('la Embrujada solo sale con Halloween activo', () => {
    seedRandom(3);
    expect(sample(20_000, 1, 'halloween').embrujada).toBeGreaterThan(0);
  });

  it('la suerte de la apuesta', () => {
    expect([25, 50, 100, 250].map(luckForBet)).toEqual([1, 1, 1.5, 2.5]);
  });
});

describe('Taller', () => {
  it('sube de escalón en escalón y los ultra raros no se fabrican', () => {
    expect(upgradesFrom('normal')).toEqual(['brillante']);
    expect(upgradesFrom(undefined)).toEqual(['brillante']);
    expect(upgradesFrom('brillante')).toEqual(['holografico']);
    expect(upgradesFrom('holografico').sort()).toEqual(['noir', 'pixel', 'popart', 'vhs']);
    expect(upgradesFrom('vhs')).toEqual(['dorado']);
    expect(upgradesFrom('dorado')).toEqual([]);
    for (const a of ['glitch', 'lenticular', 'firmada', 'billete', 'embrujada'] as Arte[]) {
      expect(upgradesFrom(a)).toEqual([]);
      expect(ARTE_IDS.flatMap((x) => upgradesFrom(x))).not.toContain(a);
    }
  });
});

describe('arteRender', () => {
  it('Píxel pide el póster minúsculo y Lenticular sin fotograma cae a Holográfico', () => {
    expect(arteRender('pixel').size).toBe('w92');
    expect(arteRender('lenticular', { backdrop: null }).cls).toContain('arte-holografico');
    expect(arteRender('lenticular', { backdrop: '/x.jpg' }).extra).toContain('/x.jpg');
  });
  it('la firma se escapa', () => {
    expect(arteRender('firmada', { sig: '<b>Kubrick</b>' }).extra).toContain('&lt;b&gt;Kubrick');
  });
});
