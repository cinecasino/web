import { afterEach, describe, expect, it, vi } from 'vitest';
import { atLeast, RARITIES, rarityOf, statusOf } from './rarity';

describe('rarityOf', () => {
  it.each([
    [8.6, 5000, '2001', 'divina'],
    [8.6, 4999, '2001', 'mitica'],
    [8.2, 1500, '2001', 'mitica'],
    [8.2, 1499, '2001', 'legendaria'],
    [8.0, 300, '1969', 'reliquia'],
    [8.0, 600, '1970', 'legendaria'],
    [8.0, 299, '1950', 'epica'],
    [8.0, 100, '1950', 'rara'],
    [7.7, 500, '2001', 'legendaria'],
    [7.7, 499, '2001', 'epica'],
    [7.1, 150, '2001', 'epica'],
    [7.1, 149, '2001', 'rara'],
    [6.4, 0, '2001', 'rara'],
    [6.39, 9999, '2001', 'pococomun'],
    [5.6, 50, '2001', 'pococomun'],
    [5.59, 50, '2001', 'comun'],
    [4.51, 50, '2001', 'comun'],
    [4.5, 50, '2001', 'bodrio'],
  ])('nota %s, %s votos, año %s → %s', (vote, votes, year, r) => {
    expect(rarityOf({ vote, votes, year })).toBe(r);
  });

  it('sin año nunca es Reliquia', () => {
    expect(rarityOf({ vote: 8.1, votes: 600, year: '' })).toBe('legendaria');
    expect(rarityOf({ vote: 8.1, votes: 600, year: '1950' })).toBe('reliquia');
  });

  it('atLeast compara por el orden de RARITIES', () => {
    expect(RARITIES[0]).toBe('bodrio');
    expect(RARITIES.at(-1)).toBe('divina');
    expect(atLeast('reliquia', 'legendaria')).toBe(true);
    expect(atLeast('epica', 'legendaria')).toBe(false);
  });
});

describe('statusOf', () => {
  afterEach(() => vi.useRealTimers());

  it('distingue próximamente, sin valorar y valorado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T12:00:00Z'));
    expect(statusOf({ votes: 5000, date: '2026-12-01' })).toBe('upcoming');
    expect(statusOf({ votes: 5000, date: '' })).toBe('upcoming');
    expect(statusOf({ votes: 19, date: '2020-01-01' })).toBe('unrated');
    expect(statusOf({ votes: 20, date: '2020-01-01' })).toBe('rated');
  });
  it('los datos antiguos sin fecha cuentan como estrenados', () => {
    expect(statusOf({ votes: 100 })).toBe('rated');
  });
});
