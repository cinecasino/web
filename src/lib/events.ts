// Eventos de temporada. Se repiten cada año entre `from` y `to` (MM-DD, ambos incluidos, hora local).
// Para probar uno fuera de fecha: ?evento=halloween (se recuerda en la pestaña); ?evento=off lo quita.
export interface GameEvent {
  id: 'halloween';
  name: string;
  from: string;
  to: string;
  floaters: string[];
  banner: string;
}

export const EVENTS: GameEvent[] = [
  {
    id: 'halloween',
    name: 'Halloween',
    from: '10-24',
    to: '11-02',
    floaters: ['🎃', '👻', '🦇', '🕸️', '💀', '🕷️', '🧛', '🍬', '🪦', '🔮'],
    banner: '🎃 ¡Halloween en el casino! Ruleta del Terror, Caja Maldita y logros que solo existen hasta el 2 de noviembre.',
  },
];

const FORCE_KEY = 'cc-force-event';

/** Inicio y fin (ms) del evento en el año de `now`. */
export function eventWindow(ev: GameEvent, now = new Date()): [number, number] {
  const y = now.getFullYear();
  const [fm, fd] = ev.from.split('-').map(Number);
  const [tm, td] = ev.to.split('-').map(Number);
  return [new Date(y, fm - 1, fd).getTime(), new Date(y, tm - 1, td + 1).getTime() - 1];
}

function forced(): string | null {
  try {
    const q = new URLSearchParams(location.search).get('evento');
    if (q === 'off') sessionStorage.removeItem(FORCE_KEY);
    else if (q) sessionStorage.setItem(FORCE_KEY, q);
    return sessionStorage.getItem(FORCE_KEY);
  } catch {
    return null;
  }
}

export function activeEvent(now = new Date()): GameEvent | null {
  const f = typeof location === 'undefined' ? null : forced();
  if (f) return EVENTS.find((e) => e.id === f) ?? null;
  const t = now.getTime();
  return EVENTS.find((e) => {
    const [a, b] = eventWindow(e, now);
    return t >= a && t <= b;
  }) ?? null;
}

export const isEventActive = (id: GameEvent['id']) => activeEvent()?.id === id;
