import type { APIRoute } from 'astro';
import { audit, one, run } from '../../../../server/db';
import { hashPassword, tempPassword } from '../../../../server/auth';
import { deleteUserCompletely } from '../../../../server/users';
import { body, fail, json, str } from '../../../../server/http';

export const prerender = false;

const inbox = (userId: string, kind: string, amount: number, message: string) =>
  run('INSERT INTO inbox (user_id, kind, amount, message, created_at) VALUES (?, ?, ?, ?, ?)', [userId, kind, amount, message, Date.now()]);

export const POST: APIRoute = async ({ params, request, locals }) => {
  const admin = locals.user!;
  const id = params.id!;
  const target = await one<{ id: string; username: string; role: string }>('SELECT id, username, role FROM users WHERE id = ?', [id]);
  if (!target) return fail('Usuario no encontrado.', 404);
  const b = await body(request);
  const action = str(b.action, 20);
  const self = id === admin.id;
  if (self && ['ban', 'role', 'delete'].includes(action)) return fail('No puedes hacerte eso a ti mismo.');

  switch (action) {
    case 'ban':
      await run("UPDATE users SET status = 'banned' WHERE id = ?", [id]);
      await run('DELETE FROM sessions WHERE user_id = ?', [id]);
      break;
    case 'unban':
      await run("UPDATE users SET status = 'active' WHERE id = ?", [id]);
      break;
    case 'role': {
      const role = b.role === 'admin' ? 'admin' : 'user';
      await run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
      await audit(admin.id, 'role', id, role);
      return json({ ok: true });
    }
    case 'grant': {
      const amount = Math.round(Number(b.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) return fail('Cantidad entre 1 y 1.000.000.');
      const message = str(b.message, 200) || 'Regalo de la casa';
      await inbox(id, 'coins', amount, message);
      await audit(admin.id, 'grant', id, `${amount} · ${message}`);
      return json({ ok: true });
    }
    case 'message': {
      const message = str(b.message, 300);
      if (!message) return fail('Escribe un mensaje.');
      await inbox(id, 'message', 0, message);
      await audit(admin.id, 'message', id, message);
      return json({ ok: true });
    }
    case 'reset':
      await run('DELETE FROM saves WHERE user_id = ?', [id]);
      await inbox(id, 'reset', 0, str(b.message, 200) || 'Tu partida ha sido reiniciada por la administración.');
      break;
    case 'password': {
      const pw = tempPassword();
      await run('UPDATE users SET pass_hash = ? WHERE id = ?', [await hashPassword(pw), id]);
      await run('DELETE FROM sessions WHERE user_id = ?', [id]);
      await audit(admin.id, 'password', id, '');
      return json({ ok: true, tempPassword: pw });
    }
    case 'delete':
      await deleteUserCompletely(id);
      await audit(admin.id, 'delete', id, target.username);
      return json({ ok: true });
    default:
      return fail('Acción desconocida.');
  }
  await audit(admin.id, action, id, '');
  return json({ ok: true });
};
