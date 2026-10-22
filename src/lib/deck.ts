// Mazo de títulos con nota fiable (para los juegos de cartas: ¿Más o Menos? y Blackjack).
import { randomDiscover, typesForMode, type Title } from './tmdb';
import { shuffle } from './util';

export class Deck {
  private queue: Title[] = [];

  constructor(private readonly minVotes = 400) {}

  async refill(exclude: Iterable<string> = []) {
    const jobs = typesForMode().flatMap((t) => [randomDiscover(t, { minVotes: this.minVotes }, 40), randomDiscover(t, { minVotes: this.minVotes }, 40)]);
    const res = await Promise.allSettled(jobs);
    const seen = new Set([...exclude, ...this.queue.map((q) => q.key)]);
    const fresh = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).filter((t) => t.votes > 0 && !seen.has(t.key) && !!seen.add(t.key));
    this.queue.push(...shuffle(fresh));
  }

  /** Siguiente carta que cumpla `ok` (o la primera si ninguna). Lanza un error si TMDB no da nada. */
  async next(ok: (t: Title) => boolean = () => true, exclude: Iterable<string> = []): Promise<Title> {
    if (this.queue.length < 6) await this.refill(exclude);
    const idx = this.queue.findIndex(ok);
    const t = this.queue.splice(Math.max(0, idx), 1)[0];
    if (!t) throw new Error('TMDB no ha devuelto títulos');
    return t;
  }

  get size() {
    return this.queue.length;
  }
}
