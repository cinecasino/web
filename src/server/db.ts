import { createClient, type Client, type InValue } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from 'astro:env/server';

// Esquema idempotente: se aplica en la primera consulta de cada arranque.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    consent_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS saves (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    coins INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    botin INTEGER NOT NULL DEFAULT 0,
    plays INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    claimed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS inbox_user ON inbox(user_id, claimed_at)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    window_start INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    detail TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

let client: Client | null = null;
let ready: Promise<unknown> | null = null;

/** Nombre de la primera variable de entorno que es `name` o termina en `_name`, con valor. */
function findEnv(name: string): string | undefined {
  const env = process.env;
  if (env[name]) return name;
  return Object.keys(env)
    .sort()
    .find((k) => k.endsWith(`_${name}`) && env[k]);
}

/**
 * Conexión a la base de datos. Prioridad:
 *  1. DATABASE_URL / DATABASE_AUTH_TOKEN puestas a mano.
 *  2. Las de la integración Turso de Vercel (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN, con o sin prefijo,
 *     p. ej. `supertable_TURSO_AUTH_TOKEN`). Así sobreviven a la rotación de secretos de la integración.
 *  3. Archivo local `data/casino.db` (solo desarrollo).
 */
export function dbConfig() {
  const urlVar = process.env.DATABASE_URL ? 'DATABASE_URL' : findEnv('TURSO_DATABASE_URL');
  const tokenVar = process.env.DATABASE_AUTH_TOKEN ? 'DATABASE_AUTH_TOKEN' : findEnv('TURSO_AUTH_TOKEN');
  return {
    url: urlVar ? process.env[urlVar]! : DATABASE_URL,
    authToken: tokenVar ? process.env[tokenVar] : DATABASE_AUTH_TOKEN,
    // Solo nombres de variables (nunca valores), para /api/health
    urlVar: urlVar ?? 'por defecto',
    tokenVar: tokenVar ?? (DATABASE_AUTH_TOKEN ? 'DATABASE_AUTH_TOKEN' : 'ninguna'),
  };
}

export async function db(): Promise<Client> {
  if (!client) {
    const { url, authToken } = dbConfig();
    if (url.startsWith('file:')) {
      if (process.env.VERCEL) throw new Error('En Vercel no hay disco persistente: conecta Turso (DATABASE_URL o la integración de Vercel).');
      mkdirSync(dirname(url.slice(5)), { recursive: true });
    }
    client = createClient({ url, authToken });
    ready = client.batch(SCHEMA, 'write').catch((e) => {
      // Si falla (token caducado, red…), el siguiente intento vuelve a conectar
      client = null;
      throw e;
    });
  }
  const c = client;
  await ready;
  return c;
}

export async function one<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | null> {
  const r = await (await db()).execute({ sql, args });
  return (r.rows[0] as T | undefined) ?? null;
}

export async function all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  const r = await (await db()).execute({ sql, args });
  return r.rows as T[];
}

export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}

export async function getSetting(key: string): Promise<string | null> {
  return (await one<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]))?.value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  if (value === null) await run('DELETE FROM settings WHERE key = ?', [key]);
  else await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export async function audit(adminId: string | null, action: string, targetId: string | null, detail = '') {
  await run('INSERT INTO audit_log (admin_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?)', [adminId, action, targetId, detail, Date.now()]);
}
