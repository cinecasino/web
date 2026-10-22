import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Title } from './tmdb';

// store.ts lee localStorage al cargarse: cada test importa una copia nueva del módulo
async function fresh() {
  vi.resetModules();
  return import('./store');
}

const title = (o: Partial<Title> = {}): Title => ({
  key: 'movie-1',
  id: 1,
  type: 'movie',
  title: 'Peli',
  original: '',
  overview: '',
  poster: null,
  backdrop: null,
  vote: 7.5,
  votes: 800,
  year: '2001',
  date: '2001-05-01',
  genres: [27],
  popularity: 10,
  ...o,
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('fichas', () => {
  it('empieza con 500 fichas y nivel 1', async () => {
    const s = await fresh();
    expect(s.getState().coins).toBe(500);
    expect(s.getState().level).toBe(1);
  });

  it('spend sin saldo no cobra y avisa con casino:broke', async () => {
    const s = await fresh();
    const broke = vi.fn();
    window.addEventListener('casino:broke', broke);
    expect(s.spend(600)).toBe(false);
    expect(s.getState().coins).toBe(500);
    expect(broke).toHaveBeenCalledOnce();
    window.removeEventListener('casino:broke', broke);
  });

  it('spend y earn llevan la cuenta de lo apostado y lo ganado', async () => {
    const s = await fresh();
    expect(s.spend(100)).toBe(true);
    s.earn(40);
    const st = s.getState();
    expect(st.stats.spent).toBe(100);
    expect(st.stats.won).toBeGreaterThanOrEqual(40);
  });

  it('el rescate solo existe por debajo de la apuesta mínima', async () => {
    const s = await fresh();
    expect(s.rescue()).toBe(0);
    s.spend(500 - 10);
    expect(s.rescue()).toBe(200);
  });
});

describe('XP y niveles', () => {
  it('addXp sube varios niveles de golpe y da 100 × nivel de bonus por cada uno', async () => {
    const s = await fresh();
    const before = s.getState().coins;
    s.addXp(s.xpForLevel(1) + s.xpForLevel(2) + 5);
    const st = s.getState();
    expect(st.level).toBe(3);
    expect(st.xp).toBe(5);
    // 200 (nivel 2) + 300 (nivel 3), más los logros que se desbloqueen por el camino
    expect(st.coins - before).toBeGreaterThanOrEqual(500);
  });
});

describe('bonus diario', () => {
  it('la racha sube con días seguidos, se rompe si fallas uno y tiene tope de 600', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1, 12));
    const s = await fresh();
    expect(s.claimDaily()).toEqual({ amount: 150, streak: 1 });
    expect(s.claimDaily()).toBeNull();

    vi.setSystemTime(new Date(2026, 9, 2, 12));
    expect(s.claimDaily()).toEqual({ amount: 200, streak: 2 });

    vi.setSystemTime(new Date(2026, 9, 4, 12));
    expect(s.claimDaily()).toEqual({ amount: 150, streak: 1 });

    for (let d = 5; d <= 15; d++) {
      vi.setSystemTime(new Date(2026, 9, d, 12));
      s.claimDaily();
    }
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    expect(s.claimDaily()?.amount).toBe(600);
  });
});

describe('botín', () => {
  it('addToBotin da XP una sola vez por título', async () => {
    const s = await fresh();
    expect(s.addToBotin(title())).toBeGreaterThan(0);
    expect(s.addToBotin(title())).toBe(0);
    expect(s.getState().botin).toHaveLength(1);
  });

  it('markSeen paga una vez y nunca por un estreno futuro', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T12:00:00Z'));
    const s = await fresh();
    const t = title();
    s.addToBotin(t);
    expect(s.markSeen(t)).toBeGreaterThan(0);
    expect(s.markSeen(t)).toBe(0);
    expect(s.markSeen(title({ key: 'movie-2', date: '2027-01-01' }))).toBe(0);
  });
});

describe('logros', () => {
  it('la primera partida desbloquea "Bautismo de fuego" con su premio', async () => {
    const s = await fresh();
    const before = s.getState().coins;
    s.stat('slots');
    expect(s.getState().achievements.first).toBeTruthy();
    expect(s.getState().coins - before).toBe(50);
  });
});

describe('ajustes', () => {
  it('el filtro de plataformas solo cuenta con alguna elegida, y cambiar de país las vacía', async () => {
    const s = await fresh();
    s.setProviders([], true);
    expect(s.providerFilterOn()).toBe(false);
    s.setProviders([8, 119, 8], true);
    expect(s.getState().providers).toEqual([8, 119]);
    expect(s.providerFilterOn()).toBe(true);
    s.setRegion('MX');
    expect(s.getState().providers).toEqual([]);
    expect(s.providerFilterOn()).toBe(false);
  });

  it('las partidas antiguas sin ajustes cargan con los valores por defecto', async () => {
    localStorage.setItem('cine-casino-v1', JSON.stringify({ v: 1, coins: 77 }));
    const s = await fresh();
    expect(s.getState()).toMatchObject({ coins: 77, lang: 'es-ES', region: 'ES', providers: [], providersOnly: false });
  });
});

describe('guardado', () => {
  it('importData rechaza un archivo que no es una partida', async () => {
    const s = await fresh();
    expect(() => s.importData('{"v":2}')).toThrow();
  });

  it('exportar e importar conserva la partida', async () => {
    const s = await fresh();
    s.addToBotin(title());
    const json = s.exportData();
    s.resetAll();
    expect(s.getState().botin).toHaveLength(0);
    s.importData(json);
    expect(s.getState().botin).toHaveLength(1);
  });

  it('la partida sobrevive a recargar la página', async () => {
    const a = await fresh();
    a.spend(100);
    const b = await fresh();
    expect(b.getState().coins).toBe(400);
  });

  it('el crecimiento decorativo del bote no escribe en localStorage', async () => {
    const s = await fresh();
    s.spend(25); // guarda la partida una vez
    const saved = () => JSON.parse(localStorage.getItem('cine-casino-v1')!).jackpot;
    const start = saved();
    s.bumpJackpot(5, false);
    expect(saved()).toBe(start);
    s.bumpJackpot(5);
    expect(saved()).toBe(start + 10);
  });
});
