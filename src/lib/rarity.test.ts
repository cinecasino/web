import { afterEach, describe, expect, it, vi } from 'vitest';
import { rarityOf, statusOf } from './rarity';

describe('rarityOf', () => {
  it.each([
    [8.2, 1500, 'mitica'],
    [8.2, 1499, 'legendaria'],
    [7.7, 500, 'legendaria'],
    [7.7, 499, 'epica'],
    [7.1, 150, 'epica'],
    [7.1, 149, 'rara'],
    [6.4, 0, 'rara'],
    [6.39, 9999, 'comun'],
  ])('nota %s con %s votos → %s', (vote, votes, r) => {
    expect(rarityOf(vote, votes)).toBe(r);
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
