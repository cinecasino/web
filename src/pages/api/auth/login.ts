import type { APIRoute } from 'astro';
import { one, run } from '../../../server/db';
import { createSession, isAdminEmail, rateLimit, setSessionCookie, toSessionUser, verifyPassword } from '../../../server/auth';
import { body, fail, isSecure, json, str } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  const b = await body(request);
  const login = str(b.login, 254);
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  if (!login || !password) return fail('Escribe tu email o nombre y la contraseña.');

  const okIp = await rateLimit(`login-ip:${clientAddress}`, 30, 900_000);
  const okAcc = await rateLimit(`login:${login.toLowerCase()}`, 8, 900_000);
  if (!okIp || !okAcc) return fail('Demasiados intentos. Espera 15 minutos.', 429);

  const u = await one<any>('SELECT * FROM users WHERE email = ? OR username = ?', [login.toLowerCase(), login]);
  if (!u || !(await verifyPassword(password, u.pass_hash))) return fail('Credenciales incorrectas.', 401);
  if (u.status !== 'active') return fail('Esta cuenta está suspendida. Contacta con la administración.', 403);

  // Los emails de ADMIN_EMAILS se promocionan al entrar (útil para el primer admin)
  if (u.role !== 'admin' && isAdminEmail(u.email)) {
    u.role = 'admin';
    await run("UPDATE users SET role = 'admin' WHERE id = ?", [u.id]);
  }
  await run('UPDATE users SET last_login_at = ? WHERE id = ?', [Date.now(), u.id]);
  setSessionCookie(cookies, await createSession(u.id), isSecure(url));
  return json({ user: toSessionUser(u) });
};
