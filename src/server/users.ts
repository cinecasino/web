import { run } from './db';

/** Borrado completo de un usuario y todo lo asociado (derecho de supresión). */
export async function deleteUserCompletely(id: string) {
  await run('DELETE FROM sessions WHERE user_id = ?', [id]);
  await run('DELETE FROM saves WHERE user_id = ?', [id]);
  await run('DELETE FROM inbox WHERE user_id = ?', [id]);
  await run('DELETE FROM users WHERE id = ?', [id]);
}
