import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// En Vercel (variable VERCEL=1 durante el build) se usa su adaptador; en local o en un VPS, Node standalone.
const adapter = process.env.VERCEL ? vercel() : node({ mode: 'standalone' });

export default defineConfig({
  // Las páginas son estáticas salvo las que declaran `export const prerender = false` (API, cuenta, admin).
  output: 'static',
  adapter,
  server: { open: true },
  env: {
    schema: {
      TMDB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      TMDB_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', default: 'file:data/casino.db' }),
      DATABASE_AUTH_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_EMAILS: envField.string({ context: 'server', access: 'secret', default: '' }),
    },
  },
});
