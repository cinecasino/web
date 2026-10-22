import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { questIdsFor, resolveQuest, weekKey } from './quests';

async function fresh() {
  vi.resetModules();
  return import('./store');
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('sorteo de misiones', () => {
  it('es el mismo para la misma fecha y cambia de un día a otro', () => {
    expect(questIdsFor('day', '2026-10-22')).toEqual(questIdsFor('day', '2026-10-22'));
    const days = new Set(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map((d) => questIdsFor('day', d).join()));
    expect(days.size).toBeGreaterThan(1);
  });
  it('3 diarias y 2 semanales, sin repetir y todas válidas', () => {
    for (let d = 1; d <= 28; d++) {
      const day = questIdsFor('day', `2026-02-${String(d).padStart(2, '0')}`);
      expect(day).toHaveLength(3);
      expect(new Set(day.map((id) => id.split(':')[0])).size).toBe(3);
      day.forEach((id) => expect(resolveQuest(id, 'day')).not.toBeNull());
    }
    const week = questIdsFor('week', '2026-10-19');
    expect(week).toHaveLength(2);
    week.forEach((id) => expect(resolveQuest(id, 'week')).not.toBeNull());
  });
  it('la semana empieza en lunes', () => {
    expect(weekKey(new Date(2026, 9, 22))).toBe('2026-10-19'); // jueves → lunes 19
    expect(weekKey(new Date(2026, 9, 25))).toBe('2026-10-19'); // domingo → mismo lunes
    expect(weekKey(new Date(2026, 9, 26))).toBe('2026-10-26');
  });
});

describe('misiones en la partida', () => {
  it('cuentan desde que se crean, se cobran una vez y se renuevan al día siguiente', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 22, 10));
    localStorage.setItem('cine-casino-v1', JSON.stringify({ v: 1, stats: { slots: 50 } }));
    const s = await fresh();
    // Una misión de tragaperras conocida, para no depender del sorteo del día
    const st = s.getState();
    st.quests.items = [{ id: 'slots::2', period: 'day', base: st.stats.slots, claimed: false }];
    expect(s.questList()[0]).toMatchObject({ done: 0, complete: false });
    s.stat('slots');
    s.stat('slots');
    expect(s.questList()[0]).toMatchObject({ done: 2, complete: true });
    expect(s.claimableQuests()).toBe(1);
    const coins = s.getState().coins;
    expect(s.claimQuest('slots::2', 'day')).toBeGreaterThan(0);
    expect(s.claimQuest('slots::2', 'day')).toBe(0);
    expect(s.getState().coins).toBeGreaterThan(coins);

    vi.setSystemTime(new Date(2026, 9, 23, 10));
    const tomorrow = s.questList().filter((q) => q.item.period === 'day');
    expect(tomorrow).toHaveLength(3);
    expect(tomorrow.every((q) => !q.item.claimed && q.done === 0)).toBe(true);
  });

  it('un premio de colección solo se cobra una vez', async () => {
    const s = await fresh();
    expect(s.claimCollection('saga:230', 450)).toBe(true);
    expect(s.claimCollection('saga:230', 450)).toBe(false);
    expect(s.getState().collections['saga:230']).toBeTruthy();
  });
});
