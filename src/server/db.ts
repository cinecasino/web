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

export async function db(): Promise<Client> {
  if (!client) {
    if (DATABASE_URL.startsWith('file:')) {
      if (process.env.VERCEL) throw new Error('En Vercel no hay disco persistente: configura DATABASE_URL con una base de datos Turso (libsql://…).');
      mkdirSync(dirname(DATABASE_URL.slice(5)), { recursive: true });
    }
    client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
    ready = client.batch(SCHEMA, 'write');
  }
  await ready;
  return client;
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
