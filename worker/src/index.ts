// Proxy de TMDB para el modo pages, en Cloudflare Workers (plan gratuito: 100 000 peticiones al día).
// El token de TMDB vive aquí como secreto (TMDB_TOKEN) y nunca llega al navegador. Solo pasan las rutas y
// los parámetros de la lista blanca, solo se responde con CORS a los orígenes permitidos, y cada respuesta
// se guarda en la caché de Cloudflare el tiempo que marca su ruta, así casi ninguna visita llega a TMDB.
import { PARAMS, routeTtl } from '../../src/lib/tmdb-routes';

export interface Env {
  TMDB_TOKEN: string;
  /** Orígenes que pueden usar el proxy desde el navegador, separados por comas. */
  ALLOWED_ORIGINS: string;
}

/** Lo mínimo de la Cache API de Workers que se usa (caches.default). */
export interface EdgeCache {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, res: Response): Promise<void>;
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

export async function handle(req: Request, env: Env, cache: EdgeCache, ctx: Ctx, fetchFn: typeof fetch = fetch): Promise<Response> {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  // Sin cabecera Origin (curl, comprobaciones del workflow) se responde, pero sin CORS: un navegador no podría leerlo
  if (origin && !allowed.includes(origin)) return json({ error: 'Origen no permitido' }, 403);
  const cors: Record<string, string> = origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } });
  if (req.method !== 'GET') return json({ error: 'Método no permitido' }, 405, cors);
  if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true, tmdb: Boolean(env.TMDB_TOKEN) }, 200, cors);

  const path = url.pathname.replace(/^\/3\//, '');
  const ttl = url.pathname.startsWith('/3/') ? routeTtl(path) : null;
  if (ttl === null) return json({ error: 'Ruta no permitida' }, 404, cors);
  if (!env.TMDB_TOKEN) return json({ error: 'Falta el secreto TMDB_TOKEN en el Worker' }, 500, cors);

  const upstream = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [k, v] of url.searchParams) if (PARAMS.has(k)) upstream.searchParams.set(k, v.slice(0, 100));
  upstream.searchParams.set('include_adult', 'false');
  upstream.searchParams.sort(); // mismos parámetros en otro orden = misma entrada de caché

  const key = new Request(upstream.toString());
  let res = await cache.match(key);
  if (!res) {
    const r = await fetchFn(upstream, { headers: { accept: 'application/json', authorization: `Bearer ${env.TMDB_TOKEN}` } });
    res = new Response(await r.text(), {
      status: r.status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': r.ok ? `public, max-age=${ttl}` : 'no-store' },
    });
    if (r.ok) ctx.waitUntil(cache.put(key, res.clone()));
  }
  // Al navegador, 5 minutos como mucho: la caché larga es la de Cloudflare
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': res.ok ? 'public, max-age=300' : 'no-store', ...cors },
  });
}

export default {
  fetch(req: Request, env: Env, ctx: Ctx) {
    return handle(req, env, (caches as unknown as { default: EdgeCache }).default, ctx);
  },
};
