import type { APIRoute } from 'astro';
import { TMDB_API_KEY, TMDB_TOKEN } from 'astro:env/server';
import { dbConfig, one } from '../../server/db';

export const prerender = false;

/** Estado del servidor para el despliegue y la monitorización. Solo muestra nombres de variables, nunca valores. */
export const GET: APIRoute = async () => {
  const cfg = dbConfig();
  let db = 'ok';
  try {
    await one('SELECT 1 AS ok');
  } catch (e) {
    db = e instanceof Error ? e.message.replace(/libsql:\/\/\S+/g, 'libsql://…').slice(0, 200) : 'error';
  }
  const tmdb = TMDB_TOKEN || TMDB_API_KEY ? 'ok' : 'falta TMDB_TOKEN';
  const healthy = db === 'ok' && tmdb === 'ok';
  return new Response(JSON.stringify({ ok: healthy, db, dbUrlVar: cfg.urlVar, dbTokenVar: cfg.tokenVar, tmdb }), {
    status: healthy ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
