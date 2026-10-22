import type { MediaType, Title } from './tmdb';
import { rarityOf, RARITY, statusOf, type Rarity } from './rarity';
import { availableAchievements, type Achievement } from './achievements';
import { ARTES, GOLDEN_TICKET_COINS, TALLER_COINS, TALLER_COPIES, upgradesFrom, type Arte } from './arts';
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
  /** Acabado de la carta (sin él, normal). */
  arte?: Arte;
  /** Copias repetidas que te han tocado: material para el Taller. */
  copies?: number;
  /** Idioma original y popularidad: para los sellos. */
  lang?: string;
  pop?: number;
  /** Fotograma de fondo (arte Lenticular). */
  backdrop?: string | null;
  /** Firma del arte Firmada (quien la dirigió o creó). */
  sig?: string;
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
  // La rareza se recalcula siempre con los datos guardados: así las partidas antiguas pasan a las 9 rarezas
  const botin: Saved[] = (Array.isArray(s?.botin) ? s.botin : []).map((b: Saved) => ({ ...b, rarity: rarityOf(b) }));
  return { ...base, ...s, botin, stats: { ...base.stats, ...s?.stats }, daily: { ...base.daily, ...s?.daily } };
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

export const savedOf = (key: string) => state.botin.find((b) => b.key === key);

/**
 * Guarda el título en el botín con su arte. Devuelve la XP ganada.
 * Si ya lo tenías, suma una copia para el Taller y devuelve 0.
 * El Billete dorado trae además sus fichas (aviso con casino:golden-ticket).
 */
export function addToBotin(t: Title, arte: Arte = 'normal'): number {
  const had = savedOf(t.key);
  if (had) {
    had.copies = (had.copies ?? 0) + 1;
    commit();
    emit('casino:copy', { title: had.title, copies: had.copies });
    return 0;
  }
  const rarity = rarityOf(t);
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
    arte,
    lang: t.lang,
    pop: Math.round(t.popularity),
    backdrop: t.backdrop,
  });
  if (arte === 'billete') {
    state.coins += GOLDEN_TICKET_COINS;
    state.stats.won += GOLDEN_TICKET_COINS;
    emit('casino:golden-ticket', { title: t.title, coins: GOLDEN_TICKET_COINS });
  }
  const xp = RARITY[rarity].xp;
  addXp(xp);
  return xp;
}

/** Cambia datos de una carta guardada (p. ej. la firma, que llega después con la ficha). */
export function patchSaved(key: string, patch: Partial<Pick<Saved, 'sig' | 'backdrop'>>) {
  const b = savedOf(key);
  if (!b) return;
  Object.assign(b, patch);
  commit();
}

/**
 * Taller: sube el arte de una carta un escalón, pagando con copias o con fichas.
 * Devuelve false si el salto no es válido o no te llega.
 */
export function upgradeArte(key: string, to: Arte, pay: 'copies' | 'coins'): boolean {
  const b = savedOf(key);
  if (!b || !upgradesFrom(b.arte).includes(to)) return false;
  if (pay === 'copies') {
    if ((b.copies ?? 0) < TALLER_COPIES) return false;
    b.copies = (b.copies ?? 0) - TALLER_COPIES;
  } else {
    const cost = TALLER_COINS[ARTES[to].tier!];
    if (state.coins < cost) {
      emit('casino:broke', { need: cost });
      return false;
    }
    state.coins -= cost;
    state.stats.spent += cost;
  }
  b.arte = to;
  commit({ coinsDelta: pay === 'coins' ? -TALLER_COINS[ARTES[to].tier!] : 0 });
  return true;
}

export function removeFromBotin(key: string) {
  state.botin = state.botin.filter((b) => b.key !== key);
  commit();
}

/** Marca como vista. Devuelve las fichas ganadas (0 si ya estaba vista). */
export function markSeen(t: { key: string; vote: number; votes: number; year?: string; date?: string }): number {
  if (isSeen(t.key) || statusOf(t) === 'upcoming') return 0;
  state.seenKeys.push(t.key);
  state.stats.seen++;
  const item = state.botin.find((b) => b.key === t.key);
  if (item) item.seen = true;
  const r = RARITY[rarityOf(t)];
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
