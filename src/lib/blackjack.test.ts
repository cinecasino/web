import { describe, expect, it } from 'vitest';
import { cardLabel, cardValue, dealerHits, handValue, isAce, isBlackjack, PAYOUT, settle, type BjCard } from './blackjack';

// Cartas de prueba: la nota es el valor; un As es una Mítica (≥ 8,2 y 1.500 votos)
const c = (vote: number): BjCard => ({ vote, votes: 800, year: '2000' });
const ACE: BjCard = { vote: 8.5, votes: 3000, year: '2000' };

describe('valor de las cartas', () => {
  it('nota redondeada entre 2 y 10', () => {
    expect(cardValue(c(6.4))).toBe(6);
    expect(cardValue(c(6.5))).toBe(7);
    expect(cardValue(c(1.2))).toBe(2);
    expect(cardValue(c(9.8))).toBe(10);
  });
  it('las Míticas y Divinas son el As', () => {
    expect(isAce(ACE)).toBe(true);
    expect(isAce(c(8.5))).toBe(false); // nota alta pero pocos votos: Legendaria, no As
    expect(cardLabel(ACE)).toBe('A');
    expect(cardLabel(c(7.2))).toBe('7');
  });
});

describe('mano', () => {
  it('el As vale 11 o 1 según convenga', () => {
    expect(handValue([ACE, c(7)])).toEqual({ total: 18, soft: true });
    expect(handValue([ACE, c(7), c(9)])).toEqual({ total: 17, soft: false });
    expect(handValue([ACE, ACE])).toEqual({ total: 12, soft: true });
  });
  it('blackjack es 21 con dos cartas', () => {
    expect(isBlackjack([ACE, c(10)])).toBe(true);
    expect(isBlackjack([c(7), c(7), c(7)])).toBe(false);
  });
  it('la banca pide hasta 17', () => {
    expect(dealerHits([c(10), c(6)])).toBe(true);
    expect(dealerHits([c(10), c(7)])).toBe(false);
    expect(dealerHits([ACE, c(6)])).toBe(false); // 17 blando: se planta
  });
});

describe('resultado', () => {
  it.each([
    [[c(10), c(9)], [c(10), c(8)], 'win'],
    [[c(10), c(8)], [c(10), c(9)], 'lose'],
    [[c(10), c(8)], [c(10), c(8)], 'push'],
    [[c(10), c(8), c(5)], [c(10), c(8)], 'lose'],
    [[c(10), c(8)], [c(10), c(6), c(9)], 'win'],
    [[ACE, c(10)], [c(10), c(7), c(4)], 'blackjack'],
    [[c(10), c(7), c(4)], [ACE, c(10)], 'lose'],
    [[ACE, c(10)], [ACE, c(10)], 'push'],
  ] as [BjCard[], BjCard[], string][])('%#: %s', (p, d, out) => {
    expect(settle(p, d)).toBe(out);
  });
  it('pagos: blackjack 3:2, victoria 1:1, empate devuelve', () => {
    expect(PAYOUT).toEqual({ blackjack: 2.5, win: 2, push: 1, lose: 0 });
  });
});
