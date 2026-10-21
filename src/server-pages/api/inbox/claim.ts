import type { APIRoute } from 'astro';
import { run } from '../../../server/db';
import { body, fail, json } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return fail('Inicia sesión.', 401);
  const b = await body<{ ids?: unknown }>(request);
  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isInteger).slice(0, 100) : [];
  for (const id of ids) await run('UPDATE inbox SET claimed_at = ? WHERE id = ? AND user_id = ? AND claimed_at IS NULL', [Date.now(), id, user.id]);
  return json({ ok: true });
};
