import { clearLocal, earn, getState, hasProgress, replaceState, resetAll, setOwner } from './store';
import { openModal, closeModal, modalClosed } from './card';
import * as fx from './fx';
import { sfx } from './sfx';
import { esc, fmt } from './util';

export interface Me {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: number;
}

export interface Announcement {
  /** Número para los anuncios del panel de admin; texto para los de eventos de temporada. */
  id: number | string;
  text: string;
  level: 'info' | 'event' | 'warning';
}

interface ServerSave {
  data: any;
  updatedAt: number;
}

let me: Me | null = null;
export const currentUser = () => me;

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const { json: payload, ...rest } = init;
  const r = await fetch(path, {
    ...rest,
    headers: { accept: 'application/json', ...(payload !== undefined ? { 'content-type': 'application/json' } : {}), ...rest.headers },
    body: payload !== undefined ? JSON.stringify(payload) : rest.body,
    credentials: 'same-origin',
  });
  let data: any = null;
  try {
    data = await r.json();
  } catch {}
  return { ok: r.ok, status: r.status, data };
}

// ---------- Subida de la partida ----------

let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
let pushing = false;

async function push(force = false) {
  if (!me || getState().ownerId !== me.id || pushing) return;
  pushing = true;
  dirty = false;
  const s = getState();
  try {
    const r = await api<{ conflict?: boolean; save?: ServerSave }>('/api/save', { method: 'POST', json: { data: s, updatedAt: s.updatedAt, force } });
    if (r.status === 409 && r.data.save) {
      // Otro dispositivo guardó algo más nuevo: gana el servidor
      replaceState(r.data.save.data, me.id);
      fx.toast('Partida actualizada desde otro dispositivo. 🔄', { icon: '☁️' });
    } else if (!r.ok) dirty = true;
  } catch {
    dirty = true;
  } finally {
    pushing = false;
  }
}

function schedule() {
  if (!me || getState().ownerId !== me.id) return;
  dirty = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => push(), 2500);
}

function flushBeacon() {
  if (!me || !dirty || getState().ownerId !== me.id) return;
  const s = getState();
  navigator.sendBeacon?.('/api/save', new Blob([JSON.stringify({ data: s, updatedAt: s.updatedAt })], { type: 'application/json' }));
  dirty = false;
}

// ---------- Bajada / fusión al entrar ----------

function chooseSave(server: ServerSave): Promise<'account' | 'device'> {
  const l = getState();
  const r = server.data;
  return new Promise((resolve) => {
    const inner = openModal(`
      <div class="choose-save">
        <h2 class="neon-gold">¿Qué partida usamos?</h2>
        <p class="muted">Tienes progreso como invitado en este dispositivo y también una partida en tu cuenta.</p>
        <div class="save-options">
          <button class="save-opt" data-pick="account">
            <b>☁️ La de mi cuenta</b>
            <span>Nivel ${r.level ?? 1} · ${fmt(r.coins ?? 0)} 🪙 · ${(r.botin ?? []).length} en botín</span>
          </button>
          <button class="save-opt" data-pick="device">
            <b>📱 La de este dispositivo</b>
            <span>Nivel ${l.level} · ${fmt(l.coins)} 🪙 · ${l.botin.length} en botín</span>
          </button>
        </div>
        <p class="muted small">La que no elijas se descarta.</p>
      </div>`);
    inner.querySelector('.modal-x')?.remove();
    // Si cierra el diálogo sin elegir (Esc o clic fuera), se queda la de la cuenta
    modalClosed().then(() => resolve('account'));
    inner.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        resolve(b.dataset.pick as 'account' | 'device');
        closeModal();
      }),
    );
  });
}

async function syncDown() {
  if (!me) return;
  const r = await api<{ save: ServerSave | null; inbox: any[] }>('/api/save');
  if (!r.ok) return;
  const server = r.data.save;
  const local = getState();

  if (!server) {
    if (local.ownerId && local.ownerId !== me.id) clearLocal();
    setOwner(me.id); // sube lo que haya (partida de invitado o nueva)
    await push(true);
  } else if (local.ownerId === me.id) {
    if (server.updatedAt > local.updatedAt) replaceState(server.data, me.id);
    else if (local.updatedAt > server.updatedAt) await push();
  } else if (!local.ownerId && hasProgress(local)) {
    if ((await chooseSave(server)) === 'account') replaceState(server.data, me.id);
    else {
      setOwner(me.id);
      await push(true);
    }
  } else {
    replaceState(server.data, me.id);
  }

  await applyInbox(r.data.inbox ?? []);
}

async function applyInbox(items: { id: number; kind: string; amount: number; message: string }[]) {
  if (!items.length) return;
  for (const it of items) {
    if (it.kind === 'coins') {
      earn(it.amount);
      sfx.coins(8);
      fx.coinRain(40);
      fx.toast(`<b>¡Regalo de la casa!</b> +${fmt(it.amount)} 🪙<br>${esc(it.message)}`, { icon: '🎁', color: 'var(--gold)', ms: 7000 });
    } else if (it.kind === 'reset') {
      resetAll();
      fx.toast(esc(it.message), { icon: '🔄', color: 'var(--red)', ms: 8000 });
    } else {
      fx.toast(`<b>Mensaje de la administración</b><br>${esc(it.message)}`, { icon: '📣', color: 'var(--cyan)', ms: 9000 });
    }
  }
  await api('/api/inbox/claim', { method: 'POST', json: { ids: items.map((i) => i.id) } });
}

// ---------- Arranque en cada página ----------

export async function initAccount(): Promise<{ user: Me | null; announcement: Announcement | null }> {
  let announcement: Announcement | null = null;
  try {
    const r = await api<{ user: Me | null; announcement: Announcement | null }>('/api/auth/me');
    me = r.ok ? r.data.user : null;
    announcement = r.ok ? r.data.announcement : null;
  } catch {
    me = null;
  }
  window.dispatchEvent(new CustomEvent('casino:user', { detail: me }));
  if (me) {
    try {
      await syncDown();
    } catch {}
    window.addEventListener('casino:change', schedule);
    window.addEventListener('pagehide', flushBeacon);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushBeacon());
  } else if (getState().ownerId) {
    // La sesión caducó o se cerró en otro sitio: no dejamos aquí la partida de esa cuenta
    clearLocal();
  }
  return { user: me, announcement };
}

export async function logout() {
  if (me) await push(true).catch(() => {});
  await api('/api/auth/logout', { method: 'POST' });
  me = null;
  clearLocal();
}
