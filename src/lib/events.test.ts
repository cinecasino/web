import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeEvent } from './events';
import { availableAchievements } from './achievements';
import type { State } from './store';

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
});

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('Halloween', () => {
  it('está activo del 24 de octubre al 2 de noviembre, ambos incluidos', () => {
    expect(activeEvent(at(2026, 10, 23, 23))).toBeNull();
    expect(activeEvent(at(2026, 10, 24, 0))?.id).toBe('halloween');
    expect(activeEvent(at(2026, 11, 2, 23))?.id).toBe('halloween');
    expect(activeEvent(at(2026, 11, 3, 0))).toBeNull();
  });

  it('se repite cada año', () => {
    expect(activeEvent(at(2031, 10, 31))?.id).toBe('halloween');
  });

  it('?evento=halloween lo fuerza fuera de fecha y ?evento=off lo quita', () => {
    history.replaceState(null, '', '/?evento=halloween');
    expect(activeEvent(at(2026, 3, 1))?.id).toBe('halloween');
    history.replaceState(null, '', '/');
    expect(activeEvent(at(2026, 3, 1))?.id).toBe('halloween'); // se recuerda en la pestaña
    history.replaceState(null, '', '/?evento=off');
    expect(activeEvent(at(2026, 3, 1))).toBeNull();
    history.replaceState(null, '', '/');
  });
});

describe('logros de temporada', () => {
  const state = (achievements: Record<string, number> = {}) => ({ achievements }) as unknown as State;

  it('solo se ofrecen durante su evento, salvo los ya conseguidos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(2026, 3, 1));
    expect(availableAchievements(state()).some((a) => a.event)).toBe(false);
    expect(availableAchievements(state({ 'cursed-box': 1 })).some((a) => a.id === 'cursed-box')).toBe(true);
    vi.setSystemTime(at(2026, 10, 30));
    expect(availableAchievements(state()).filter((a) => a.event)).toHaveLength(3);
  });
});
