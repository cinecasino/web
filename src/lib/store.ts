import type { MediaType, Title } from './tmdb';
import { rarityOf, RARITY, statusOf, type Rarity } from './rarity';
import { availableAchievements, type Achievement } from './achievements';
import { localDate } from './util';

export type Mode = MediaType | 'both';
export type Lang = 'es-ES' | 'en-US';

export interface Saved {
  key: string;
  id: number;
  type: MediaType;
  title: string;
  poster: string | null;
  vote: number;
  votes: number;
  year: string;
  date?: string;
  genres: number[];
  rarity: Rarity;
  addedAt: number;
  seen: boolean;
}

export interface Stats {
  slots: number;
  jackpots: number;
  roulette: number;
  quiebras: number;
  scratches: number;
  boxes: number;
  hilo: number;
  hiloBest: number;
  /** Cajas Malditas abiertas (Halloween). */
  cursed: number;
  bankrupt: number;
  seen: number;
  won: number;
  spent: number;
}

export interface State {
  v: 1;
  coins: number;
  xp: number;
  level: number;
  jackpot: number;
  botin: Saved[];
  seenKeys: string[];
  achievements: Record<string, number>;
  stats: Stats;
  daily: { last: string; streak: number };
  mode: Mode;
  muted: boolean;
  /** Plataformas elegidas (ids de proveedor de TMDB, dependen del país). */
  providers: number[];
  /** Si está activo y hay plataformas elegidas, los juegos solo dan títulos incluidos en ellas. */
  providersOnly: boolean;
  /** Idioma de títulos y sinopsis de TMDB. La interfaz sigue en español. */
  lang: Lang;
  /** País para "dónde verla" y para la lista de plataformas. */
  region: string;
  /** Última modificación: decide qué versión gana al sincronizar con la cuenta. */
  updatedAt: number;
  /** Cuenta dueña de esta partida (undefined = invitado). */
  ownerId?: string;
}

export const MIN_BET = 25;
const KEY = 'cine-casino-v1';
const JACKPOT_SEED = 5000;

const fresh = (): State => ({
  v: 1,
  coins: 500,
  xp: 0,
  level: 1,
  jackpot: JACKPOT_SEED,
  botin: [],
  seenKeys: [],
  achievements: {},
  stats: { slots: 0, jackpots: 0, roulette: 0, quiebras: 0, scratches: 0, boxes: 0, hilo: 0, hiloBest: 0, cursed: 0, bankrupt: 0, seen: 0, won: 0, spent: 0 },
  daily: { last: '', streak: 0 },
  mode: 'movie',
  muted: false,
  providers: [],
  providersOnly: false,
  lang: 'es-ES',
  region: 'ES',
  updatedAt: 0,
});

function normalize(s: any): State {
  const base = fresh();
  return { ...base, ...s, stats: { ...base.stats, ...s?.stats }, daily: { ...base.daily, ...s?.daily } };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return fresh();
}

let state: State = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export interface ChangeDetail {
  coinsDelta: number;
  xpDelta: number;
}

function emit(name: string, detail: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function commit(detail: Partial<ChangeDetail> = {}) {
  state.updatedAt = Date.now();
  persist();
  emit('casino:change', { coinsDelta: 0, xpDelta: 0, ...detail });
  checkAchievements();
}

function checkAchievements() {
  const unlocked: Achievement[] = [];
  for (const a of availableAchievements(state)) {
    if (state.achievements[a.id]) continue;
    if (a.value(state) >= a.goal) {
      state.achievements[a.id] = Date.now();
      state.coins += a.reward;
      unlocked.push(a);
    }
  }
  if (!unlocked.length) return;
  persist();
  unlocked.forEach((a, i) => setTimeout(() => emit('casino:achievement', a), i * 700));
  emit('casino:change', { coinsDelta: unlocked.reduce((s, a) => s + a.reward, 0), xpDelta: 0 });
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  state = load();
  emit('casino:change', { coinsDelta: 0, xpDelta: 0 });
});

export const getState = () => state;

export const xpForLevel = (l: number) => Math.round(120 * Math.pow(l, 1.35));

export function spend(n: number): boolean {
  if (state.coins < n) {
    emit('casino:broke', { need: n });
    return false;
  }
  state.coins -= n;
  state.stats.spent += n;
  commit({ coinsDelta: -n });
  return true;
}

export function earn(n: number) {
  n = Math.round(n);
  if (n <= 0) return;
  state.coins += n;
  state.stats.won += n;
  commit({ coinsDelta: n });
}

export function addXp(n: number) {
  state.xp += n;
  let bonus = 0;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    const b = 100 * state.level;
    bonus += b;
    state.coins += b;
    emit('casino:levelup', { level: state.level, bonus: b });
  }
  commit({ xpDelta: n, coinsDelta: bonus });
}

export function stat(k: keyof Stats, inc = 1) {
  state.stats[k] += inc;
  commit();
}

export function statMax(k: keyof Stats, v: number) {
  if (v > state.stats[k]) {
    state.stats[k] = v;
    commit();
  }
}

/** `save = false` para el crecimiento decorativo del bote: se guardará con la siguiente jugada. */
export function bumpJackpot(n: number, save = true) {
  state.jackpot += Math.round(n);
  if (save) persist();
}

export function takeJackpot(): number {
  const amount = state.jackpot;
  state.jackpot = JACKPOT_SEED;
  earn(amount);
  return amount;
}

export function setMode(m: Mode) {
  state.mode = m;
  commit();
}

export function toggleMute() {
  state.muted = !state.muted;
  commit();
}

export function setProviders(ids: number[], only = state.providersOnly) {
  state.providers = [...new Set(ids)];
  state.providersOnly = only;
  commit();
}

export function setLang(lang: Lang) {
  state.lang = lang;
  commit();
}

/** Los ids de plataforma cambian según el país: al cambiar de país se vacía la selección. */
export function setRegion(region: string) {
  if (region === state.region) return;
  state.region = region;
  state.providers = [];
  commit();
}

/** El filtro "solo mis plataformas" solo cuenta si hay alguna elegida. */
export const providerFilterOn = () => state.providersOnly && state.providers.length > 0;

export const inBotin = (key: string) => state.botin.some((b) => b.key === key);
export const isSeen = (key: string) => state.seenKeys.includes(key);

/** Guarda el título en el botín. Devuelve la XP ganada (0 si ya estaba). */
export function addToBotin(t: Title): number {
  if (inBotin(t.key)) return 0;
  const rarity = rarityOf(t.vote, t.votes);
  state.botin.unshift({
    key: t.key,
    id: t.id,
    type: t.type,
    title: t.title,
    poster: t.poster,
    vote: t.vote,
    votes: t.votes,
    year: t.year,
    date: t.date,
    genres: t.genres,
    rarity,
    addedAt: Date.now(),
    seen: isSeen(t.key),
  });
  const xp = RARITY[rarity].xp;
  addXp(xp);
  return xp;
}

export function removeFromBotin(key: string) {
  state.botin = state.botin.filter((b) => b.key !== key);
  commit();
}

/** Marca como vista. Devuelve las fichas ganadas (0 si ya estaba vista). */
export function markSeen(t: { key: string; vote: number; votes: number; date?: string }): number {
  if (isSeen(t.key) || statusOf(t) === 'upcoming') return 0;
  state.seenKeys.push(t.key);
  state.stats.seen++;
  const item = state.botin.find((b) => b.key === t.key);
  if (item) item.seen = true;
  const r = RARITY[rarityOf(t.vote, t.votes)];
  state.coins += r.coins;
  state.stats.won += r.coins;
  addXp(r.xp * 2);
  emit('casino:change', { coinsDelta: r.coins, xpDelta: 0 });
  return r.coins;
}

export const dailyAvailable = () => state.daily.last !== localDate();

export function claimDaily(): { amount: number; streak: number } | null {
  if (!dailyAvailable()) return null;
  const streak = state.daily.last === localDate(-1) ? state.daily.streak + 1 : 1;
  const amount = Math.min(150 + (streak - 1) * 50, 600);
  state.daily = { last: localDate(), streak };
  earn(amount);
  return { amount, streak };
}

export function rescue(): number {
  if (state.coins >= MIN_BET) return 0;
  state.stats.bankrupt++;
  earn(200);
  return 200;
}

export function exportData(): string {
  return JSON.stringify(state, null, 2);
}

export function importData(json: string) {
  const s = JSON.parse(json);
  if (s?.v !== 1) throw new Error('Formato no válido');
  state = { ...normalize(s), ownerId: state.ownerId };
  commit();
}

export function resetAll() {
  state = { ...fresh(), ownerId: state.ownerId };
  commit();
}

// ---------- Sincronización con la cuenta ----------

export const hasProgress = (s: State = state) =>
  s.botin.length > 0 || s.level > 1 || s.stats.slots + s.stats.roulette + s.stats.scratches + s.stats.boxes + s.stats.hilo > 0;

/** Sustituye la partida local por la de la cuenta sin marcarla como modificada. */
export function replaceState(data: unknown, ownerId: string) {
  state = { ...normalize(data), ownerId };
  persist();
  emit('casino:change', { coinsDelta: 0, xpDelta: 0 });
}

/** Adopta la partida de invitado para la cuenta (se subirá en el siguiente guardado). */
export function setOwner(ownerId: string) {
  state.ownerId = ownerId;
  commit();
}

/** Al cerrar sesión: la partida de la cuenta no se queda en este navegador. */
export function clearLocal() {
  state = fresh();
  persist();
  emit('casino:change', { coinsDelta: 0, xpDelta: 0 });
}
