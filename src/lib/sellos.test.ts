import { describe, expect, it } from 'vitest';
import { detailSellos, sellosOf, TAQUILLAZO_POP } from './sellos';

const NOW = new Date('2026-10-22T12:00:00').getTime();
const base = { vote: 6, votes: 1000, year: '2010', date: '2010-05-01', popularity: 10, lang: 'en' };

describe('sellosOf', () => {
  it('una peli normal no tiene sellos', () => {
    expect(sellosOf(base, NOW)).toEqual([]);
  });
  it('Clásico antes de 1980 y Cine mudo antes de 1930 (los dos a la vez)', () => {
    expect(sellosOf({ ...base, year: '1979' }, NOW)).toEqual(['clasico']);
    expect(sellosOf({ ...base, year: '1980' }, NOW)).toEqual([]);
    expect(sellosOf({ ...base, year: '1927' }, NOW)).toEqual(['clasico', 'mudo']);
  });
  it('Joya oculta: 7,5 o más con menos de 500 votos (y al menos 20)', () => {
    expect(sellosOf({ ...base, vote: 7.5, votes: 499 }, NOW)).toContain('joya');
    expect(sellosOf({ ...base, vote: 7.5, votes: 500 }, NOW)).not.toContain('joya');
    expect(sellosOf({ ...base, vote: 9, votes: 5 }, NOW)).not.toContain('joya');
  });
  it('Taquillazo por popularidad', () => {
    expect(sellosOf({ ...base, popularity: TAQUILLAZO_POP }, NOW)).toContain('taquillazo');
  });
  it('Recién salida: menos de 60 días, y nunca si aún no se ha estrenado', () => {
    expect(sellosOf({ ...base, date: '2026-09-01' }, NOW)).toContain('reciente');
    expect(sellosOf({ ...base, date: '2026-08-01' }, NOW)).not.toContain('reciente');
    expect(sellosOf({ ...base, date: '2026-12-01' }, NOW)).not.toContain('reciente');
  });
  it('Internacional: ni inglés ni español', () => {
    expect(sellosOf({ ...base, lang: 'ja' }, NOW)).toContain('internacional');
    expect(sellosOf({ ...base, lang: 'es' }, NOW)).not.toContain('internacional');
    expect(sellosOf({ ...base, lang: undefined }, NOW)).not.toContain('internacional');
  });
});

describe('detailSellos', () => {
  it('Maratón para series largas y Exprés para pelis cortas', () => {
    expect(detailSellos({ runtime: null, seasons: 5 }, 'tv')).toEqual(['maraton']);
    expect(detailSellos({ runtime: 89, seasons: null }, 'movie')).toEqual(['expres']);
    expect(detailSellos({ runtime: 90, seasons: null }, 'movie')).toEqual([]);
  });
});
