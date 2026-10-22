// Blackjack de películas: cada carta vale su nota redondeada (2–10) y las Míticas o mejores son el As.
// Lógica pura, sin DOM, para poder probarla.
import { atLeast, rarityOf } from './rarity';

export interface BjCard {
  vote: number;
  votes: number;
  year?: string;
}

export const isAce = (c: BjCard) => atLeast(rarityOf(c), 'mitica');

/** Valor de una carta que no es As: la nota redondeada, entre 2 y 10. */
export const cardValue = (c: BjCard) => Math.min(10, Math.max(2, Math.round(c.vote)));

/** Lo que se pinta en la carta: "A" para los Ases, el número para el resto. */
export const cardLabel = (c: BjCard) => (isAce(c) ? 'A' : String(cardValue(c)));

/** Total de la mano: los Ases valen 11 salvo que eso te pase de 21 (entonces 1). */
export function handValue(cards: BjCard[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (isAce(c)) {
      aces++;
      total += 11;
    } else total += cardValue(c);
  }
  while (total > 21 && aces) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards: BjCard[]) => cards.length === 2 && handValue(cards).total === 21;
export const isBust = (cards: BjCard[]) => handValue(cards).total > 21;

/** La banca pide carta hasta llegar a 17 (y se planta con 17 blando). */
export const dealerHits = (cards: BjCard[]) => handValue(cards).total < 17;

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose';

export function settle(player: BjCard[], dealer: BjCard[]): Outcome {
  const p = handValue(player).total;
  const d = handValue(dealer).total;
  if (p > 21) return 'lose';
  const pbj = isBlackjack(player);
  const dbj = isBlackjack(dealer);
  if (pbj && !dbj) return 'blackjack';
  if (dbj && !pbj) return 'lose';
  if (d > 21) return 'win';
  if (p > d) return 'win';
  if (p < d) return 'lose';
  return 'push';
}

/** Fichas que se devuelven por cada ficha apostada (incluida la apuesta): blackjack paga 3:2. */
export const PAYOUT: Record<Outcome, number> = { blackjack: 2.5, win: 2, push: 1, lose: 0 };
