import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, SESSION_COOKIE } from './server/auth';

export const onRequest = defineMiddleware(async (ctx, next) => {
  if (ctx.isPrerendered) return next();
  const { pathname } = ctx.url;

  // CSRF: cualquier escritura debe venir de nuestro propio origen.
  // Sec-Fetch-Site lo pone el navegador y una web ajena no puede falsearlo; si falta, se compara Origin con Host.
  const method = ctx.request.method;
  if (method !== 'GET' && method !== 'HEAD') {
    const h = ctx.request.headers;
    const site = h.get('sec-fetch-site');
    const origin = h.get('origin');
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const crossSite = site ? site !== 'same-origin' && site !== 'none' : !!origin && new URL(origin).host !== host;
    if (crossSite) return new Response('Origen no permitido', { status: 403 });
  }

  const token = ctx.cookies.get(SESSION_COOKIE)?.value;
  ctx.locals.user = token ? await getSessionUser(token).catch(() => null) : null;

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (ctx.locals.user?.role !== 'admin') {
      if (pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'Solo administradores' }), { status: 403 });
      return ctx.redirect(`/cuenta?next=${encodeURIComponent(pathname)}`);
    }
  }
  return next();
});
