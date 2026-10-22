/** true en el modo `pages` (GitHub Pages, sin servidor). Lo define astro.config.mjs. */
declare const __STATIC_BUILD__: boolean;

interface ImportMetaEnv {
  /** Solo modo pages: URL del Worker de Cloudflare (worker/) que hace de proxy de TMDB. Si existe, no se usa el token. */
  readonly PUBLIC_TMDB_PROXY?: string;
  /** Solo modo pages: token de lectura de TMDB que irá en el JavaScript público. */
  readonly PUBLIC_TMDB_TOKEN?: string;
  /** Alternativa al token: API key v3 de TMDB (también pública en modo pages). */
  readonly PUBLIC_TMDB_API_KEY?: string;
}

declare namespace App {
  interface Locals {
    user: import('./server/auth').SessionUser | null;
  }
}
