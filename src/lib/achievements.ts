import type { State } from './store';
import { activeEvent, EVENTS, eventWindow, type GameEvent } from './events';
import { symbol } from './genres';
import { isSpecial, RETRO, type Arte } from './arts';
import { sellosOf, type SelloId } from './sellos';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  goal: number;
  reward: number;
  value: (s: State) => number;
  /** Logro de temporada: solo se puede conseguir (y solo se enseña, si no lo tienes) durante ese evento. */
  event?: GameEvent['id'];
}

const plays = (s: State) => s.stats.slots + s.stats.roulette + s.stats.scratches + s.stats.boxes + s.stats.hilo;
const owned = (r: string) => (s: State) => s.botin.filter((b) => b.rarity === r).length;
const withArte = (...a: Arte[]) => (s: State) => s.botin.filter((b) => b.arte && a.includes(b.arte)).length;
const specials = (s: State) => s.botin.filter((b) => isSpecial(b.arte)).length;
const distinctArtes = (s: State) => new Set(s.botin.map((b) => b.arte).filter(isSpecial)).size;
const retroSet = (s: State) => RETRO.filter((a) => s.botin.some((b) => b.arte === a)).length;
const withSello = (id: SelloId) => (s: State) => s.botin.filter((b) => sellosOf({ ...b, popularity: b.pop }).includes(id)).length;

// Halloween: títulos de terror guardados dentro de las fechas del evento de este año
const HALLOWEEN = EVENTS.find((e) => e.id === 'halloween')!;
const YEAR = new Date().getFullYear();
const TERROR = symbol('terror');
const horrorDuringEvent = (s: State) => {
  const [from, to] = eventWindow(HALLOWEEN);
  return s.botin.filter((b) => b.addedAt >= from && b.addedAt <= to && b.genres.includes(b.type === 'movie' ? TERROR.movie : TERROR.tv)).length;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', icon: '🎲', name: 'Bautismo de fuego', desc: 'Juega tu primera partida', goal: 1, reward: 50, value: plays },
  { id: 'plays50', icon: '🤑', name: 'Cliente habitual', desc: 'Juega 50 partidas', goal: 50, reward: 250, value: plays },
  { id: 'plays250', icon: '🧟', name: 'Ludópata certificado', desc: 'Juega 250 partidas', goal: 250, reward: 1000, value: plays },
  { id: 'jackpot', icon: '🎰', name: '¡JACKPOT!', desc: 'Consigue un jackpot en la tragaperras', goal: 1, reward: 300, value: (s) => s.stats.jackpots },
  { id: 'botin10', icon: '💼', name: 'Coleccionista', desc: 'Guarda 10 títulos en tu botín', goal: 10, reward: 150, value: (s) => s.botin.length },
  { id: 'botin50', icon: '🏦', name: 'Bóveda llena', desc: 'Guarda 50 títulos en tu botín', goal: 50, reward: 600, value: (s) => s.botin.length },
  { id: 'legend', icon: '🟠', name: 'Toque de oro', desc: 'Consigue un título Legendario', goal: 1, reward: 200, value: owned('legendaria') },
  { id: 'mythic', icon: '🌈', name: 'Mítico', desc: 'Consigue un título Mítico', goal: 1, reward: 400, value: owned('mitica') },
  { id: 'mythic5', icon: '🦄', name: 'Panteón', desc: 'Ten 5 títulos Míticos', goal: 5, reward: 1000, value: owned('mitica') },
  { id: 'seen5', icon: '🍿', name: 'Palomitero', desc: 'Marca 5 títulos como vistos', goal: 5, reward: 150, value: (s) => s.stats.seen },
  { id: 'seen25', icon: '🎞️', name: 'Cinéfilo', desc: 'Marca 25 títulos como vistos', goal: 25, reward: 500, value: (s) => s.stats.seen },
  { id: 'broke', icon: '🆘', name: 'Tocando fondo', desc: 'Pide un rescate al casino', goal: 1, reward: 25, value: (s) => s.stats.bankrupt },
  { id: 'quiebra', icon: '💀', name: 'Mala racha', desc: 'Cae en QUIEBRA en la ruleta', goal: 1, reward: 50, value: (s) => s.stats.quiebras },
  { id: 'hilo5', icon: '🃏', name: 'Adivino', desc: 'Racha de 5 en ¿Más o Menos?', goal: 5, reward: 200, value: (s) => s.stats.hiloBest },
  { id: 'hilo10', icon: '🔮', name: 'Vidente', desc: 'Racha de 10 en ¿Más o Menos?', goal: 10, reward: 750, value: (s) => s.stats.hiloBest },
  { id: 'rich', icon: '🐋', name: 'Ballena', desc: 'Acumula 5.000 fichas', goal: 5000, reward: 500, value: (s) => s.coins },
  { id: 'lvl5', icon: '⭐', name: 'Cliente VIP', desc: 'Alcanza el nivel 5', goal: 5, reward: 250, value: (s) => s.level },
  { id: 'lvl10', icon: '👑', name: 'High Roller', desc: 'Alcanza el nivel 10', goal: 10, reward: 1000, value: (s) => s.level },
  { id: 'daily7', icon: '📅', name: 'Fiel a la casa', desc: 'Racha de 7 días de bonus diario', goal: 7, reward: 500, value: (s) => s.daily.streak },
  { id: 'boxes10', icon: '🎁', name: 'Unboxer', desc: 'Abre 10 cajas de botín', goal: 10, reward: 250, value: (s) => s.stats.boxes },
  { id: 'scratch10', icon: '🎟️', name: 'Uñas de acero', desc: 'Rasca 10 boletos', goal: 10, reward: 150, value: (s) => s.stats.scratches },
  { id: 'wheel25', icon: '🎡', name: 'Mareado', desc: 'Gira la ruleta 25 veces', goal: 25, reward: 200, value: (s) => s.stats.roulette },
  // Rarezas nuevas
  { id: 'divine', icon: '✨', name: 'Toque divino', desc: 'Consigue un título Divino', goal: 1, reward: 800, value: owned('divina') },
  { id: 'relic', icon: '👁️', name: 'Arqueólogo', desc: 'Consigue una Reliquia (obra maestra anterior a 1970)', goal: 1, reward: 400, value: owned('reliquia') },
  { id: 'trash5', icon: '💩', name: 'Coleccionista de bodrios', desc: 'Ten 5 Bodrios en tu botín', goal: 5, reward: 150, value: owned('bodrio') },
  // Sellos
  { id: 'gems5', icon: '💎', name: 'Buscador de joyas', desc: 'Ten 5 Joyas ocultas', goal: 5, reward: 300, value: withSello('joya') },
  { id: 'classics10', icon: '🏛️', name: 'Filmoteca', desc: 'Ten 10 Clásicos (antes de 1980)', goal: 10, reward: 300, value: withSello('clasico') },
  { id: 'world10', icon: '🌍', name: 'Cine del mundo', desc: 'Ten 10 títulos Internacionales', goal: 10, reward: 300, value: withSello('internacional') },
  // Artes
  { id: 'arte1', icon: '🎨', name: 'Edición especial', desc: 'Consigue una carta con arte especial', goal: 1, reward: 100, value: specials },
  { id: 'artes5', icon: '🖌️', name: 'Galerista', desc: 'Ten 5 artes distintos', goal: 5, reward: 500, value: distinctArtes },
  { id: 'retro4', icon: '📼', name: 'Nostalgia total', desc: 'Ten los 4 artes retro: Noir, VHS, Pop-art y Píxel', goal: 4, reward: 600, value: retroSet },
  { id: 'firmada', icon: '✍️', name: 'Autógrafo', desc: 'Consigue una carta Firmada', goal: 1, reward: 1000, value: withArte('firmada') },
  { id: 'billete', icon: '🎫', name: 'Willy Wonka', desc: 'Encuentra un Billete dorado', goal: 1, reward: 500, value: withArte('billete') },
  { id: `halloween-${YEAR}`, icon: '🎃', name: `Noche de difuntos ${YEAR}`, desc: 'Guarda 3 títulos de terror durante Halloween', goal: 3, reward: 666, value: horrorDuringEvent, event: 'halloween' },
  { id: 'cursed-box', icon: '⚰️', name: 'Profanador', desc: 'Abre la Caja Maldita de Halloween', goal: 1, reward: 300, value: (s) => s.stats.cursed, event: 'halloween' },
  { id: 'haunted', icon: '👻', name: 'Poseída', desc: 'Consigue una carta Embrujada', goal: 1, reward: 300, value: withArte('embrujada'), event: 'halloween' },
];

/** Los de temporada solo cuentan con su evento activo, salvo los que ya tienes. */
export function availableAchievements(s: State): Achievement[] {
  const ev = activeEvent()?.id;
  return ACHIEVEMENTS.filter((a) => !a.event || a.event === ev || s.achievements[a.id]);
}
