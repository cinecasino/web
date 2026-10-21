import type { APIRoute } from 'astro';
import { TMDB_API_KEY, TMDB_TOKEN } from 'astro:env/server';

export const prerender = false;

// Proxy de TMDB: el token nunca sale del servidor y solo se permiten las rutas que usa la app.
const ROUTES: [RegExp, number][] = [
  [/^discover\/(movie|tv)$/, 3600],
  [/^(movie|tv)\/top_rated$/, 21600],
  [/^trending\/(all|movie|tv)\/week$/, 3600],
  [/^(movie|tv)\/\d{1,9}$/, 86400],
];
const PARAMS = new Set([
  'language',
  'sort_by',
  'with_genres',
  'vote_average.gte',
  'vote_average.lte',
  'vote_count.gte',
  'include_adult',
  'page',
  'append_to_response',
  'include_video_language',
]);

const cache = new Map<string, { at: number; ttl: number; status: number; body: string }>();
const MAX_ENTRIES = 800;

export const GET: APIRoute = async ({ params, url }) => {
  const path = params.path ?? '';
  const route = ROUTES.find(([re]) => re.test(path));
  if (!route) return new Response('Ruta no permitida', { status: 404 });
  if (!TMDB_TOKEN && !TMDB_API_KEY) return new Response('Falta TMDB_TOKEN en el servidor', { status: 500 });

  const upstream = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [k, v] of url.searchParams) if (PARAMS.has(k)) upstream.searchParams.set(k, v.slice(0, 100));
  upstream.searchParams.set('include_adult', 'false');
  const headers: Record<string, string> = { accept: 'application/json' };
  if (TMDB_TOKEN) headers.authorization = `Bearer ${TMDB_TOKEN}`;
  else upstream.searchParams.set('api_key', TMDB_API_KEY!);

  const key = upstream.toString();
  const ttl = route[1];
  const hit = cache.get(key);
  let status: number;
  let text: string;
  if (hit && Date.now() - hit.at < hit.ttl * 1000) {
    ({ status, body: text } = hit);
  } else {
    const r = await fetch(upstream, { headers });
    status = r.status;
    text = await r.text();
    if (r.ok) {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: Date.now(), ttl, status, body: text });
    }
  }
  return new Response(text, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // El CDN (Vercel/Netlify/Cloudflare) cachea por URL: casi ninguna visita llega a TMDB
      'cache-control': status === 200 ? `public, max-age=300, s-maxage=${ttl}, stale-while-revalidate=${ttl}` : 'no-store',
    },
  });
};
