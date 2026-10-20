import type { APIRoute } from 'astro';
import { all, one } from '../../../server/db';
import { fail } from '../../../server/http';

export const prerender = false;

/** Derecho de acceso/portabilidad: todo lo que guardamos de ti, en un JSON. */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return fail('Inicia sesión.', 401);
  const account = await one('SELECT id, email, username, role, status, created_at, last_login_at, consent_at FROM users WHERE id = ?', [user.id]);
  const save = await one<{ data: string; updated_at: number }>('SELECT data, updated_at FROM saves WHERE user_id = ?', [user.id]);
  const sessions = await all('SELECT created_at, expires_at FROM sessions WHERE user_id = ?', [user.id]);
  const inbox = await all('SELECT kind, amount, message, created_at, claimed_at FROM inbox WHERE user_id = ?', [user.id]);
  const payload = {
    exportedAt: new Date().toISOString(),
    account,
    sessions,
    inbox,
    save: save ? { updatedAt: save.updated_at, data: JSON.parse(save.data) } : null,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="cine-casino-mis-datos.json"`,
      'cache-control': 'no-store',
    },
  });
};
