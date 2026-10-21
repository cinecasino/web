import type { APIRoute } from 'astro';
import { all, one, run } from '../../server/db';
import { fail, json } from '../../server/http';
import { MAX_SAVE_BYTES, summarize } from '../../server/saves';

export const prerender = false;

/** Partida guardada en la cuenta + regalos/avisos pendientes del buzón. */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return fail('Inicia sesión.', 401);
  const row = await one<{ data: string; updated_at: number }>('SELECT data, updated_at FROM saves WHERE user_id = ?', [user.id]);
  const inbox = await all('SELECT id, kind, amount, message, created_at FROM inbox WHERE user_id = ? AND claimed_at IS NULL ORDER BY id', [user.id]);
  return json({ save: row ? { data: JSON.parse(row.data), updatedAt: Number(row.updated_at) } : null, inbox });
};

/** Guarda la partida. Gana la versión más reciente salvo `force` (el usuario eligió conservar la de este dispositivo). */
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return fail('Inicia sesión.', 401);
  const text = await request.text();
  if (text.length > MAX_SAVE_BYTES) return fail('Partida demasiado grande.', 413);
  let b: any;
  try {
    b = JSON.parse(text);
  } catch {
    return fail('JSON no válido.');
  }
  const data = b?.data;
  const updatedAt = Number(b?.updatedAt);
  if (!data || data.v !== 1 || !Number.isFinite(updatedAt)) return fail('Formato de partida no válido.');

  const current = await one<{ data: string; updated_at: number }>('SELECT data, updated_at FROM saves WHERE user_id = ?', [user.id]);
  if (current && !b.force && Number(current.updated_at) > updatedAt) {
    return json({ conflict: true, save: { data: JSON.parse(current.data), updatedAt: Number(current.updated_at) } }, 409);
  }
  const s = summarize(data);
  await run(
    `INSERT INTO saves (user_id, data, coins, level, botin, plays, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, coins = excluded.coins, level = excluded.level,
       botin = excluded.botin, plays = excluded.plays, updated_at = excluded.updated_at`,
    [user.id, JSON.stringify(data), s.coins, s.level, s.botin, s.plays, updatedAt],
  );
  return json({ ok: true, updatedAt });
};
