import type { APIRoute } from 'astro';
import { clearSessionCookie, deleteSession, SESSION_COOKIE } from '../../../server/auth';
import { json } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  clearSessionCookie(cookies);
  return json({ ok: true });
};
