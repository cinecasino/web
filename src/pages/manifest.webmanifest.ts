import type { APIRoute } from 'astro';
import { SITE, u } from '../site';

// Se genera al compilar a partir de src/site.ts, así el nombre de la app instalada siempre coincide con el de la web.
export const GET: APIRoute = () => {
  const icon192 = [{ src: u('icons/icon-192.png'), sizes: '192x192' }];
  const manifest = {
    id: u(''),
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    lang: 'es',
    start_url: `${u()}?source=pwa`,
    scope: u(''),
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    background_color: '#0a0512',
    theme_color: '#0a0512',
    categories: ['entertainment', 'games'],
    icons: [
      { src: u('icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: u('icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: u('icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: u('screenshots/wide.png'), sizes: '1366x900', type: 'image/png', form_factor: 'wide', label: 'Tragaperras de géneros' },
      { src: u('screenshots/narrow.png'), sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'Lobby' },
    ],
    shortcuts: [
      { name: 'Tragaperras', url: u('tragaperras'), icons: icon192 },
      { name: 'Mi Botín', url: u('botin'), icons: icon192 },
      { name: 'Cajas de botín', url: u('cajas'), icons: icon192 },
      { name: 'Blackjack', url: u('blackjack'), icons: icon192 },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
};
