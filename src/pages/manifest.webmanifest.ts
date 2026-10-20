import type { APIRoute } from 'astro';
import { SITE } from '../site';

// Se genera al compilar a partir de src/site.ts, así el nombre de la app instalada siempre coincide con el de la web.
export const GET: APIRoute = () => {
  const icon192 = [{ src: '/icons/icon-192.png', sizes: '192x192' }];
  const manifest = {
    id: '/',
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    lang: 'es',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    background_color: '#0a0512',
    theme_color: '#0a0512',
    categories: ['entertainment', 'games'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshots/wide.png', sizes: '1366x900', type: 'image/png', form_factor: 'wide', label: 'Tragaperras de géneros' },
      { src: '/screenshots/narrow.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'Lobby' },
    ],
    shortcuts: [
      { name: 'Tragaperras', url: '/tragaperras', icons: icon192 },
      { name: 'Mi Botín', url: '/botin', icons: icon192 },
      { name: 'Cajas de botín', url: '/cajas', icons: icon192 },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
};
