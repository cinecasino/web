import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { ADMIN_EMAILS } from 'astro:env/server';
import { one, run } from './db';

export const SESSION_COOKIE = 'cc_session';
const SESSION_DAYS = 30;
const DAY = 86_400_000;

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: number;
}

interface UserRow {
  id: string;
  email: string;
  username: string;
  pass_hash: string;
  role: string;
  status: string;
  created_at: number;
}

export const toSessionUser = (u: UserRow): SessionUser => ({
  id: u.id,
  email: u.email,
  username: u.username,
  role: u.role === 'admin' ? 'admin' : 'user',
  createdAt: Number(u.created_at),
});

// ---------- Contraseñas (scrypt con sal aleatoria) ----------

function scryptAsync(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((res, rej) => scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const key = await scryptAsync(pw, Buffer.from(salt, 'base64'));
  const expected = Buffer.from(hash, 'base64');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// ---------- Validación ----------

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;
export const MIN_PASSWORD = 8;

export const isAdminEmail = (email: string) =>
  ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

// ---------- Sesiones: el token va en la cookie y en BD solo su hash ----------

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  await run('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [sha256(token), userId, now, now + SESSION_DAYS * DAY]);
  return token;
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const id = sha256(token);
  const row = await one<UserRow & { expires_at: number }>(
    `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    [id],
  );
  if (!row) return null;
  const now = Date.now();
  if (Number(row.expires_at) < now || row.status !== 'active') {
    await run('DELETE FROM sessions WHERE id = ?', [id]);
    return null;
  }
  // Renovación deslizante: si queda menos de la mitad, se alarga
  if (Number(row.expires_at) - now < (SESSION_DAYS / 2) * DAY) {
    await run('UPDATE sessions SET expires_at = ? WHERE id = ?', [now + SESSION_DAYS * DAY, id]);
  }
  return toSessionUser(row);
}

export async function deleteSession(token: string) {
  await run('DELETE FROM sessions WHERE id = ?', [sha256(token)]);
}

export function setSessionCookie(cookies: AstroCookies, token: string, secure: boolean) {
  cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86_400 });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

// ---------- Limitador de intentos (por IP / cuenta) ----------

/** Devuelve true si se permite el intento. */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const row = await one<{ count: number; window_start: number }>('SELECT count, window_start FROM login_attempts WHERE key = ?', [key]);
  if (!row || now - Number(row.window_start) > windowMs) {
    await run(
      'INSERT INTO login_attempts (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start',
      [key, now],
    );
    return true;
  }
  if (Number(row.count) >= max) return false;
  await run('UPDATE login_attempts SET count = count + 1 WHERE key = ?', [key]);
  return true;
}

export const newUserId = () => randomUUID();

export function tempPassword() {
  return randomBytes(9).toString('base64url');
}
