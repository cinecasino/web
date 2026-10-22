import type { APIRoute } from 'astro';
import { u } from '../site';

// Ojo: los buscadores solo leen /robots.txt en la raíz del dominio. Bajo /<repo>/ en GitHub Pages
// no se usa, pero no estorba; con dominio propio o con el repo <org>.github.io funciona tal cual.
export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', `Disallow: ${u('offline/')}`];
  if (site) lines.push(`Sitemap: ${new URL(u('sitemap.xml'), site).href}`);
  return new Response(`${lines.join('\n')}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
