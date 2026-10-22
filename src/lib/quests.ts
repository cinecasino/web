// Misiones diarias (3) y semanales (2). Se sortean con la fecha como semilla, así todas las pestañas
// y dispositivos ven las mismas el mismo día. El progreso es value(ahora) − value(al crearlas).
import type { State } from './store';
import { SYMBOLS } from './genres';
import { atLeast } from './rarity';
import { isSpecial } from './arts';
import { sellosOf } from './sellos';

export type Period = 'day' | 'week';

export interface Quest {
  id: string;
  period: Period;
  icon: string;
  text: string;
  goal: number;
  reward: number;
  /** Contador que la misión vigila; el progreso es lo que ha subido desde que se creó. */
  value: (s: State) => number;
}

export interface QuestItem {
  id: string;
  period: Period;
  base: number;
  claimed: boolean;
  /** Ya se avisó de que estaba completa (para no repetir el aviso). */
  notified?: boolean;
}

export interface QuestState {
  day: string;
  week: string;
  items: QuestItem[];
}

const plays = (s: State) => s.stats.slots + s.stats.roulette + s.stats.scratches + s.stats.boxes + s.stats.hilo + s.stats.blackjack;
const botinWhere = (f: (b: State['botin'][number]) => boolean) => (s: State) => s.botin.filter(f).length;
const genreOf = (key: string) => SYMBOLS.find((g) => g.key === key)!;
const hasGenre = (key: string) => {
  const g = genreOf(key);
  return (b: State['botin'][number]) => b.genres.includes(b.type === 'movie' ? g.movie : g.tv);
};

// Géneros que salen en las misiones (los de la tragaperras y la ruleta: se pueden conseguir de verdad)
const QUEST_GENRES = ['accion', 'comedia', 'terror', 'scifi', 'drama', 'crimen', 'animacion', 'fantasia', 'misterio', 'aventura', 'romance'];

/** Convierte un id como "genre:terror:2" en su misión. null si el id ya no existe (versiones antiguas). */
export function resolveQuest(id: string, period: Period): Quest | null {
  const [kind, arg, n] = id.split(':');
  const goal = Number(n) || 1;
  const k = period === 'week' ? 3 : 1; // las semanales pagan más
  switch (kind) {
    case 'slots':
      return { id, period, icon: '🎰', text: `Haz ${goal} tiradas en la tragaperras`, goal, reward: 25 * goal * k, value: (s) => s.stats.slots };
    case 'wheel':
      return { id, period, icon: '🎡', text: `Gira la ruleta ${goal} veces`, goal, reward: 40 * goal * k, value: (s) => s.stats.roulette };
    case 'scratch':
      return { id, period, icon: '🎟️', text: `Rasca ${goal} boletos`, goal, reward: 40 * goal * k, value: (s) => s.stats.scratches };
    case 'boxes':
      return { id, period, icon: '🎁', text: `Abre ${goal} cajas`, goal, reward: 60 * goal * k, value: (s) => s.stats.boxes };
    case 'hilo':
      return { id, period, icon: '🃏', text: `Juega ${goal} partidas de ¿Más o Menos?`, goal, reward: 50 * goal * k, value: (s) => s.stats.hilo };
    case 'bj':
      return { id, period, icon: '🂡', text: `Juega ${goal} manos de Blackjack`, goal, reward: 30 * goal * k, value: (s) => s.stats.blackjack };
    case 'plays':
      return { id, period, icon: '🎲', text: `Juega ${goal} partidas, a lo que sea`, goal, reward: 15 * goal * k, value: plays };
    case 'seen':
      return { id, period, icon: '🍿', text: goal > 1 ? `Marca ${goal} títulos como vistos` : 'Marca un título como visto', goal, reward: 60 * goal * k, value: (s) => s.stats.seen };
    case 'genre': {
      const g = genreOf(arg);
      if (!g) return null;
      return { id, period, icon: g.emoji, text: `Guarda ${goal} título${goal > 1 ? 's' : ''} de ${g.name.toLowerCase()}`, goal, reward: 70 * goal * k, value: botinWhere(hasGenre(arg)) };
    }
    case 'epic':
      return { id, period, icon: '🟣', text: goal > 1 ? `Guarda ${goal} títulos Épicos o mejores` : 'Guarda un título Épico o mejor', goal, reward: 150 * goal * k, value: botinWhere((b) => atLeast(b.rarity, 'epica')) };
    case 'legend':
      return { id, period, icon: '🟠', text: 'Guarda un título Legendario o mejor', goal, reward: 300 * k, value: botinWhere((b) => atLeast(b.rarity, 'legendaria')) };
    case 'arte':
      return { id, period, icon: '🎨', text: goal > 1 ? `Consigue ${goal} cartas con arte especial` : 'Consigue una carta con arte especial', goal, reward: 200 * goal * k, value: botinWhere((b) => isSpecial(b.arte)) };
    case 'sello': {
      const label = arg === 'joya' ? 'Joya oculta' : arg === 'clasico' ? 'Clásico' : 'título Internacional';
      return { id, period, icon: arg === 'joya' ? '💎' : arg === 'clasico' ? '🏛️' : '🌍', text: `Guarda un${arg === 'joya' ? 'a' : ''} ${label}`, goal, reward: 250 * k, value: botinWhere((b) => sellosOf({ ...b, popularity: b.pop }).includes(arg as never)) };
    }
    default:
      return null;
  }
}

// ---------- Sorteo con semilla ----------

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Candidatas de cada periodo; cada una es una función que, con el azar del día, da un id. */
const POOLS: Record<Period, ((r: () => number) => string)[]> = {
  day: [
    (r) => `slots::${[5, 8, 10][Math.floor(r() * 3)]}`,
    () => 'wheel::3',
    () => 'scratch::3',
    () => 'boxes::2',
    () => 'hilo::2',
    () => 'bj::3',
    () => 'seen::1',
    (r) => `genre:${QUEST_GENRES[Math.floor(r() * QUEST_GENRES.length)]}:2`,
    () => 'epic::1',
    () => 'plays::12',
  ],
  week: [
    () => 'plays::60',
    () => 'legend::1',
    () => 'arte::2',
    (r) => `genre:${QUEST_GENRES[Math.floor(r() * QUEST_GENRES.length)]}:6`,
    () => 'seen::5',
    () => 'epic::5',
    (r) => `sello:${['joya', 'clasico', 'internacional'][Math.floor(r() * 3)]}:1`,
  ],
};

/** Las misiones de un periodo para una fecha (YYYY-MM-DD del día, o del lunes de la semana). */
export function questIdsFor(period: Period, key: string): string[] {
  const r = rng(`${period}-${key}`);
  const pool = [...POOLS[period]];
  const n = period === 'day' ? 3 : 2;
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0](r));
  return out;
}

/** Lunes (YYYY-MM-DD, hora local) de la semana de `d`. */
export function weekKey(d = new Date()): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

export function progressOf(item: QuestItem, s: State): { quest: Quest; done: number; complete: boolean } | null {
  const quest = resolveQuest(item.id, item.period);
  if (!quest) return null;
  const done = Math.max(0, Math.min(quest.goal, quest.value(s) - item.base));
  return { quest, done, complete: done >= quest.goal };
}
