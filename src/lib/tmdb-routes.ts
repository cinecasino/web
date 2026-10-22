// Lista blanca de TMDB compartida por el proxy del modo server y el Worker de Cloudflare:
// solo pasan las rutas y los parámetros que usa la app, cada ruta con su tiempo de caché (segundos).
export const ROUTES: [RegExp, number][] = [
  [/^discover\/(movie|tv)$/, 3600],
  [/^(movie|tv)\/top_rated$/, 21600],
  [/^trending\/(all|movie|tv)\/week$/, 3600],
  [/^(movie|tv)\/\d{1,9}$/, 86400],
  [/^watch\/providers\/(movie|tv)$/, 86400],
];

export const PARAMS = new Set([
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
  'with_watch_providers',
  'watch_region',
  'with_watch_monetization_types',
  'region',
]);

/** Tiempo de caché de la ruta, o null si no está permitida. */
export function routeTtl(path: string): number | null {
  return ROUTES.find(([re]) => re.test(path))?.[1] ?? null;
}
