import type { APIRoute } from 'astro';
import { all, one } from '../../../server/db';
import { json, str } from '../../../server/http';

export const prerender = false;

const SORTS: Record<string, string> = {
  recent: 'u.created_at DESC',
  login: 'u.last_login_at DESC',
  coins: 's.coins DESC',
  level: 's.level DESC',
  botin: 's.botin DESC',
  plays: 's.plays DESC',
};
const PAGE = 25;

export const GET: APIRoute = async ({ url }) => {
  const q = str(url.searchParams.get('q'), 100);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const order = SORTS[url.searchParams.get('sort') ?? ''] ?? SORTS.recent;
  const where = q ? 'WHERE u.email LIKE ? OR u.username LIKE ?' : '';
  const args = q ? [`%${q}%`, `%${q}%`] : [];
  const rows = await all(
    `SELECT u.id, u.email, u.username, u.role, u.status, u.created_at, u.last_login_at,
            COALESCE(s.coins, 0) AS coins, COALESCE(s.level, 1) AS level, COALESCE(s.botin, 0) AS botin,
            COALESCE(s.plays, 0) AS plays, s.updated_at AS save_at
     FROM users u LEFT JOIN saves s ON s.user_id = u.id ${where}
     ORDER BY ${order} NULLS LAST LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
    args,
  );
  const total = Number((await one<{ n: number }>(`SELECT COUNT(*) AS n FROM users u ${where}`, args))?.n ?? 0);
  return json({ users: rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE)) });
};
