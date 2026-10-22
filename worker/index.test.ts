// @vitest-environment node
// (happy-dom imita a un navegador y quita la cabecera Origin de las Request; el Worker corre en servidor)
import { describe, expect, it, vi } from 'vitest';
import { handle, type EdgeCache, type Env } from './src/index';

const env: Env = { TMDB_TOKEN: 'secreto', ALLOWED_ORIGINS: 'https://cinecasino.github.io,http://localhost:4321' };
const W = 'https://cinecasino-tmdb.ejemplo.workers.dev';

function setup() {
  const store = new Map<string, Response>();
  const cache: EdgeCache = {
    match: async (k) => store.get(k.url)?.clone(),
    put: async (k, r) => void store.set(k.url, r),
  };
  const waits: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void waits.push(p) };
  const fetchFn = vi.fn(async () => new Response('{"results":[]}', { status: 200 }));
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await handle(new Request(W + path, init), env, cache, ctx, fetchFn as unknown as typeof fetch);
    await Promise.all(waits);
    return res;
  };
  return { call, fetchFn, store };
}

describe('Worker de TMDB', () => {
  it('reenvía una ruta permitida con el token y solo los parámetros de la lista blanca', async () => {
    const { call, fetchFn } = setup();
    const res = await call('/3/discover/movie?with_genres=27&api_key=robado&page=2', { headers: { origin: 'https://cinecasino.github.io' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://cinecasino.github.io');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toContain('with_genres=27');
    expect(url.toString()).not.toContain('api_key');
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secreto');
  });

  it('bloquea rutas fuera de la lista y orígenes ajenos', async () => {
    const { call, fetchFn } = setup();
    expect((await call('/3/account/1')).status).toBe(404);
    expect((await call('/3/movie/550', { headers: { origin: 'https://otra-web.com' } })).status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('la segunda petición igual sale de la caché, aunque los parámetros vengan en otro orden', async () => {
    const { call, fetchFn } = setup();
    await call('/3/discover/movie?page=1&with_genres=27');
    const res = await call('/3/discover/movie?with_genres=27&page=1');
    expect(res.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('no guarda en caché los errores de TMDB', async () => {
    const { call, fetchFn, store } = setup();
    fetchFn.mockResolvedValueOnce(new Response('{"status_message":"x"}', { status: 401 }));
    expect((await call('/3/movie/550')).status).toBe(401);
    expect(store.size).toBe(0);
  });

  it('responde al preflight y a la comprobación de salud', async () => {
    const { call } = setup();
    expect((await call('/3/movie/550', { method: 'OPTIONS', headers: { origin: 'http://localhost:4321' } })).status).toBe(204);
    expect(await (await call('/health')).json()).toEqual({ ok: true, tmdb: true });
  });
});
