import { getState } from './store';
import { pick } from './util';

export type MediaType = 'movie' | 'tv';

export interface Title {
  key: string;
  id: number;
  type: MediaType;
  title: string;
  original: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  vote: number;
  votes: number;
  year: string;
  /** Fecha de estreno (YYYY-MM-DD); '' si TMDB no la tiene. */
  date?: string;
  genres: number[];
  popularity: number;
}

export interface Provider {
  name: string;
  logo: string | null;
}

export interface Details {
  tagline: string;
  overview: string;
  runtime: number | null;
  seasons: number | null;
  genres: string[];
  director: string;
  cast: string[];
  trailer: string | null;
  providers: { flatrate: Provider[]; rent: Provider[]; buy: Provider[]; link: string | null };
}

// Todas las llamadas pasan por nuestro proxy (/api/tmdb): el token vive solo en el servidor.
const REGION = 'ES';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="#2a1240"/><text x="100" y="165" font-size="64" text-anchor="middle">🎬</text></svg>',
  );

export const img = (path: string | null, size = 'w342') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : PLACEHOLDER);

const cache = new Map<string, Promise<any>>();

function get(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<any> {
  const url = new URL(`/api/tmdb${path}`, location.origin);
  url.searchParams.set('language', 'es-ES');
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));

  const k = url.toString();
  let p = cache.get(k);
  if (!p) {
    p = fetch(url, { headers: { accept: 'application/json' } }).then(async (r) => {
      if (!r.ok) throw new Error(`TMDB ${r.status}: ${await r.text()}`);
      return r.json();
    });
    p.catch(() => cache.delete(k));
    cache.set(k, p);
  }
  return p;
}

export function normalize(r: any, type?: MediaType): Title {
  const t: MediaType = type ?? r.media_type ?? (r.title !== undefined ? 'movie' : 'tv');
  const date: string = r.release_date || r.first_air_date || '';
  return {
    key: `${t}-${r.id}`,
    id: r.id,
    type: t,
    title: r.title ?? r.name ?? '???',
    original: r.original_title ?? r.original_name ?? '',
    overview: r.overview ?? '',
    poster: r.poster_path ?? null,
    backdrop: r.backdrop_path ?? null,
    vote: Math.round((r.vote_average ?? 0) * 10) / 10,
    votes: r.vote_count ?? 0,
    year: date.slice(0, 4),
    date,
    genres: r.genre_ids ?? r.genres?.map((g: any) => g.id) ?? [],
    popularity: r.popularity ?? 0,
  };
}

/** Película o serie según el modo elegido en el HUD. */
export function pickType(): MediaType {
  const m = getState().mode;
  return m === 'both' ? (Math.random() < 0.5 ? 'movie' : 'tv') : m;
}

export const typesForMode = (): MediaType[] => {
  const m = getState().mode;
  return m === 'both' ? ['movie', 'tv'] : [m];
};

export interface DiscoverOpts {
  genres?: number[];
  join?: 'and' | 'or';
  minVote?: number;
  maxVote?: number;
  minVotes?: number;
  sort?: string;
  page?: number;
}

export async function discover(type: MediaType, o: DiscoverOpts = {}) {
  const data = await get(`/discover/${type}`, {
    sort_by: o.sort ?? 'popularity.desc',
    with_genres: o.genres?.length ? o.genres.join(o.join === 'or' ? '|' : ',') : undefined,
    'vote_average.gte': o.minVote,
    'vote_average.lte': o.maxVote,
    'vote_count.gte': o.minVotes ?? 150,
    include_adult: false,
    page: o.page ?? 1,
  });
  return {
    results: (data.results as any[]).filter((r) => r.poster_path).map((r) => normalize(r, type)),
    totalPages: Math.min(data.total_pages ?? 0, 500),
  };
}

/** Una página aleatoria de discover (reintenta si la página pedida no existe). */
export async function randomDiscover(type: MediaType, o: DiscoverOpts = {}, maxPage = 20): Promise<Title[]> {
  const page = 1 + Math.floor(Math.random() * maxPage);
  const res = await discover(type, { ...o, page });
  if (!res.results.length && res.totalPages > 0 && page > res.totalPages) {
    return (await discover(type, { ...o, page: 1 + Math.floor(Math.random() * res.totalPages) })).results;
  }
  return res.results;
}

export async function topRated(type: MediaType, page = 1): Promise<Title[]> {
  const d = await get(`/${type}/top_rated`, { page });
  return (d.results as any[]).filter((r) => r.poster_path).map((r) => normalize(r, type));
}

export async function trending(): Promise<Title[]> {
  const m = getState().mode;
  const d = await get(m === 'both' ? '/trending/all/week' : `/trending/${m}/week`);
  return (d.results as any[])
    .filter((r) => r.poster_path && (m !== 'both' || r.media_type === 'movie' || r.media_type === 'tv'))
    .map((r) => normalize(r, m === 'both' ? r.media_type : m));
}

/** Prefiere títulos que aún no están en el botín ni vistos. */
export function freshest(list: Title[]): Title {
  const s = getState();
  const known = new Set([...s.seenKeys, ...s.botin.map((b) => b.key)]);
  const fresh = list.filter((t) => !known.has(t.key));
  return pick(fresh.length ? fresh : list);
}

/** Busca un título al azar relajando los filtros si no hay resultados. */
export async function luckyPick(type: MediaType, o: DiscoverOpts = {}, maxPage = 20): Promise<Title | null> {
  const attempts: [DiscoverOpts, number][] = [
    [o, maxPage],
    [o, 2],
  ];
  if ((o.genres?.length ?? 0) > 1) attempts.push([{ ...o, join: 'or' }, maxPage]);
  attempts.push([{ ...o, minVote: undefined, minVotes: 50 }, 5]);
  for (const [opts, mp] of attempts) {
    const list = await randomDiscover(type, opts, mp);
    if (list.length) return freshest(list);
  }
  return null;
}

export async function details(type: MediaType, id: number): Promise<Details> {
  const d = await get(`/${type}/${id}`, {
    append_to_response: 'videos,watch/providers,credits',
    include_video_language: 'es,en',
  });
  let overview: string = d.overview ?? '';
  if (!overview) {
    try {
      overview = (await get(`/${type}/${id}`, { language: 'en-US' })).overview ?? '';
    } catch {}
  }
  const yt = ((d.videos?.results ?? []) as any[]).filter((v) => v.site === 'YouTube');
  const trailer =
    (yt.find((v) => v.type === 'Trailer' && v.iso_639_1 === 'es') ?? yt.find((v) => v.type === 'Trailer') ?? yt.find((v) => v.type === 'Teaser') ?? yt[0])
      ?.key ?? null;
  const pr = d['watch/providers']?.results?.[REGION] ?? {};
  const prov = (a: any[] | undefined): Provider[] => (a ?? []).map((p) => ({ name: p.provider_name, logo: p.logo_path }));
  const director =
    type === 'movie'
      ? ((d.credits?.crew ?? []) as any[]).filter((c) => c.job === 'Director').map((c) => c.name).join(', ')
      : ((d.created_by ?? []) as any[]).map((c) => c.name).join(', ');
  return {
    tagline: d.tagline ?? '',
    overview,
    runtime: d.runtime ?? d.episode_run_time?.[0] ?? null,
    seasons: d.number_of_seasons ?? null,
    genres: ((d.genres ?? []) as any[]).map((g) => g.name),
    director,
    cast: ((d.credits?.cast ?? []) as any[]).slice(0, 6).map((c) => c.name),
    trailer,
    providers: { flatrate: prov(pr.flatrate), rent: prov(pr.rent), buy: prov(pr.buy), link: pr.link ?? null },
  };
}
