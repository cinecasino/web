import type { APIRoute } from 'astro';
import { TMDB_API_KEY, TMDB_TOKEN } from 'astro:env/server';
import { one } from '../../server/db';

export const prerender = false;

/** Estado del servidor para el despliegue y la monitorización. No expone ningún dato sensible. */
export const GET: APIRoute = async () => {
  let db = 'ok';
  try {
    await one('SELECT 1 AS ok');
  } catch (e) {
    db = e instanceof Error ? e.message.slice(0, 200) : 'error';
  }
  const tmdb = TMDB_TOKEN || TMDB_API_KEY ? 'ok' : 'falta TMDB_TOKEN';
  const healthy = db === 'ok' && tmdb === 'ok';
  return new Response(JSON.stringify({ ok: healthy, db, tmdb }), {
    status: healthy ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
