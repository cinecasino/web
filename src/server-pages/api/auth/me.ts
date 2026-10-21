import type { APIRoute } from 'astro';
import { getSetting } from '../../../server/db';
import { json } from '../../../server/http';

export const prerender = false;

/** Usuario actual (o null) y el anuncio global del panel de administración. */
export const GET: APIRoute = async ({ locals }) => {
  const raw = await getSetting('announcement').catch(() => null);
  return json({ user: locals.user, announcement: raw ? JSON.parse(raw) : null });
};
