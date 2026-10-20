import type { APIRoute } from 'astro';
import { one, run, audit } from '../../../server/db';
import {
  createSession,
  EMAIL_RE,
  hashPassword,
  isAdminEmail,
  MIN_PASSWORD,
  newUserId,
  rateLimit,
  setSessionCookie,
  USERNAME_RE,
} from '../../../server/auth';
import { body, fail, isSecure, json, str } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  const b = await body(request);
  const email = str(b.email, 254).toLowerCase();
  const username = str(b.username, 20);
  const password = typeof b.password === 'string' ? b.password : '';

  if (!EMAIL_RE.test(email)) return fail('Email no válido.');
  if (!USERNAME_RE.test(username)) return fail('El nombre debe tener 3-20 caracteres: letras, números, punto, guion o guion bajo.');
  if (password.length < MIN_PASSWORD) return fail(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`);
  if (password.length > 200) return fail('Contraseña demasiado larga.');
  if (b.consent !== true) return fail('Debes aceptar la política de privacidad.');
  if (!(await rateLimit(`register:${clientAddress}`, 8, 3_600_000))) return fail('Demasiados registros desde esta conexión. Prueba en una hora.', 429);

  const taken = await one<{ email: string }>('SELECT email FROM users WHERE email = ? OR username = ?', [email, username]);
  if (taken) return fail(taken.email.toLowerCase() === email ? 'Ya existe una cuenta con ese email.' : 'Ese nombre ya está cogido.', 409);

  const id = newUserId();
  const now = Date.now();
  const role = isAdminEmail(email) ? 'admin' : 'user';
  await run('INSERT INTO users (id, email, username, pass_hash, role, created_at, last_login_at, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    id,
    email,
    username,
    await hashPassword(password),
    role,
    now,
    now,
    now,
  ]);
  await audit(null, 'register', id, role === 'admin' ? 'admin por ADMIN_EMAILS' : '');
  setSessionCookie(cookies, await createSession(id), isSecure(url));
  return json({ user: { id, email, username, role, createdAt: now } }, 201);
};
