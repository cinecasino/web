import type { APIRoute } from 'astro';
import { one, run } from '../../../server/db';
import { createSession, hashPassword, MIN_PASSWORD, SESSION_COOKIE, setSessionCookie, verifyPassword } from '../../../server/auth';
import { body, fail, isSecure, json } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request, cookies, url }) => {
  const user = locals.user;
  if (!user) return fail('Inicia sesión.', 401);
  const b = await body(request);
  const current = typeof b.current === 'string' ? b.current : '';
  const next = typeof b.next === 'string' ? b.next : '';
  if (next.length < MIN_PASSWORD || next.length > 200) return fail(`La nueva contraseña necesita al menos ${MIN_PASSWORD} caracteres.`);
  const row = await one<{ pass_hash: string }>('SELECT pass_hash FROM users WHERE id = ?', [user.id]);
  if (!row || !(await verifyPassword(current, row.pass_hash))) return fail('La contraseña actual no es correcta.', 401);
  await run('UPDATE users SET pass_hash = ? WHERE id = ?', [await hashPassword(next), user.id]);
  // Cierra todas las demás sesiones y deja abierta solo esta
  await run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  if (cookies.get(SESSION_COOKIE)) setSessionCookie(cookies, await createSession(user.id), isSecure(url));
  return json({ ok: true });
};
