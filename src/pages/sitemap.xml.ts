import type { APIRoute } from 'astro';
import { u } from '../site';

// Se genera al compilar a partir de las páginas de src/pages, así no hay que mantener una lista a mano.
// Sin SITE_URL no se puede escribir una URL absoluta: entonces el sitemap sale vacío.
const HIDDEN = new Set(['404', 'offline', 'ruleta-terror']);

export const GET: APIRoute = ({ site }) => {
  const pages = Object.keys(import.meta.glob('./*.astro'))
    .map((f) => f.replace(/^\.\/|\.astro$/g, ''))
    .filter((p) => !HIDDEN.has(p))
    .map((p) => (p === 'index' ? '' : `${p}/`));
  const urls = site ? pages.map((p) => `  <url><loc>${new URL(u(p), site).href}</loc></url>`).join('\n') : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
