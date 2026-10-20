import type { APIRoute } from 'astro';
import { audit, one } from '../../../server/db';
import { clearSessionCookie, verifyPassword } from '../../../server/auth';
import { deleteUserCompletely } from '../../../server/users';
import { body, fail, json } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request, cookies }) => {
  const user = locals.user;
  if (!user) return fail('Inicia sesión.', 401);
  const b = await body(request);
  const row = await one<{ pass_hash: string }>('SELECT pass_hash FROM users WHERE id = ?', [user.id]);
  if (!row || !(await verifyPassword(typeof b.password === 'string' ? b.password : '', row.pass_hash))) return fail('Contraseña incorrecta.', 401);
  await deleteUserCompletely(user.id);
  await audit(null, 'self-delete', user.id, '');
  clearSessionCookie(cookies);
  return json({ ok: true });
};
