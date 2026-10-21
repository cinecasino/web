import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── Modo de despliegue ────────────────────────────────────────────────────────
//  pages  (por defecto): web 100 % estática para GitHub Pages. Solo invitado; el navegador habla con TMDB.
//  server: con servidor Node. Añade cuentas, partida en la nube, panel /admin y el proxy de TMDB.
// Se elige con DEPLOY_TARGET (entorno o .env) o con `--mode server` (scripts dev:server / build:server).
const argMode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : undefined;
const env = loadEnv(argMode ?? process.env.NODE_ENV ?? 'production', process.cwd(), '');
const target = process.env.DEPLOY_TARGET ?? env.DEPLOY_TARGET ?? (argMode === 'server' ? 'server' : 'pages');
const isStatic = target !== 'server';

// En GitHub Pages un repo normal se sirve en /<repo>/; el de la organización (<org>.github.io), en la raíz.
// El workflow pasa BASE_PATH (p. ej. "/web") y SITE_URL desde actions/configure-pages.
const basePath = (process.env.BASE_PATH ?? env.BASE_PATH ?? '').replace(/\/+$/, '');

/** Las rutas de src/server-pages solo existen en modo server (GitHub Pages no puede ejecutarlas). */
function serverRoutes(enabled) {
  const root = 'src/server-pages';
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  return {
    name: 'server-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (!enabled) return;
        for (const file of walk(root)) {
          const rel = relative(root, file).replace(/\\/g, '/');
          const pattern = '/' + rel.replace(/\.(astro|ts)$/, '').replace(/(^|\/)index$/, '');
          injectRoute({ pattern, entrypoint: `./${root}/${rel}`, prerender: false });
        }
      },
    },
  };
}

export default defineConfig({
  site: process.env.SITE_URL || env.SITE_URL || undefined,
  base: `${basePath}/`,
  output: 'static',
  adapter: isStatic ? undefined : node({ mode: 'standalone' }),
  integrations: [serverRoutes(!isStatic)],
  server: { open: true },
  vite: {
    define: { __STATIC_BUILD__: JSON.stringify(isStatic) },
  },
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
