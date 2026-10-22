// Comportamiento común a todas las páginas (casino, landing, legales, cuenta, admin).
import { closeModal, lookup, showTitle } from './card';
import { initAccount, type Announcement, type Me } from './account';
import { showCookieBanner } from './consent';
import { initPwa } from './pwa';
import { sfx } from './sfx';
import * as fx from './fx';
import { esc, pick, rand } from './util';
import { activeEvent } from './events';
import { ACCOUNTS, u } from '../site';

// Clic en cualquier póster registrado → ficha
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-cookie-prefs]')) return showCookieBanner(true);
  if (target.closest('[data-noopen]')) return;
  const el = target.closest<HTMLElement>('[data-title-key]');
  if (!el) return;
  const t = lookup(el.dataset.titleKey!);
  if (t) {
    sfx.click();
    showTitle(t);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  // Solo si el foco está en el propio póster (role="button"), no en un botón que contenga
  const el = e.target as HTMLElement;
  if (!el.matches?.('[data-title-key]')) return;
  e.preventDefault();
  el.click();
});
// Artes Holográfico y Lenticular: siguen al puntero (una actualización por fotograma como mucho)
let tiltEl: HTMLElement | null = null;
let tiltX = 0;
let tiltY = 0;
let tiltRaf = 0;
document.addEventListener(
  'pointermove',
  (e) => {
    tiltEl = (e.target as HTMLElement).closest?.<HTMLElement>('.arte-holografico, .arte-lenticular') ?? null;
    tiltX = e.clientX;
    tiltY = e.clientY;
    if (!tiltEl || tiltRaf) return;
    tiltRaf = requestAnimationFrame(() => {
      tiltRaf = 0;
      if (!tiltEl) return;
      const r = tiltEl.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (tiltX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (tiltY - r.top) / r.height));
      tiltEl.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      tiltEl.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      tiltEl.style.setProperty('--mxn', x.toFixed(3));
    });
  },
  { passive: true },
);

document.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('.btn, .chip, .nav a')) sfx.click();
});

// Modal: cerrar con ✕ o clic fuera
const modal = document.getElementById('modal') as HTMLDialogElement;
modal.addEventListener('click', (e) => {
  if (e.target === modal || (e.target as HTMLElement).closest('[data-close]')) closeModal();
});
modal.addEventListener('close', () => {
  // El evento "close" llega después de cerrar: si mientras tanto se ha abierto otra ficha
  // (p. ej. el Taller cierra y enseña la carta mejorada), no hay que vaciarla
  if (modal.open) return;
  (modal.querySelector('.modal-inner') as HTMLElement).innerHTML = '';
  fx.liftFx(null);
});

// Evento de temporada: tema de colores y lo que se compila oculto con data-event (tarjetas, cajas, menú)
const ev = activeEvent();
if (ev) document.body.classList.add(`ev-${ev.id}`);
document.querySelectorAll<HTMLElement>('[data-event]').forEach((el) => (el.hidden = el.dataset.event !== ev?.id));
const eventAnnouncement = (): Announcement | null => (ev ? { id: `ev-${ev.id}-${new Date().getFullYear()}`, text: ev.banner, level: 'event' } : null);

// Fondo: emojis flotando (menos en móvil y ninguno si se ha pedido reducir el movimiento)
const floaters = document.getElementById('floaters');
if (floaters && !fx.reducedMotion()) {
  const EMOJIS = ev?.floaters ?? ['🎰', '🍒', '💎', '🎬', '🍿', '⭐', '🪙', '🎲', '🃏', '7️⃣', '📺', '🎟️', '💰', '🔔'];
  const n = innerWidth < 640 ? 10 : 22;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'floater';
    s.textContent = pick(EMOJIS);
    s.style.left = `${rand(0, 100)}%`;
    s.style.fontSize = `${rand(18, 46)}px`;
    s.style.animationDuration = `${rand(16, 34)}s`;
    s.style.animationDelay = `${-rand(0, 34)}s`;
    floaters.appendChild(s);
  }
}

function renderUser(user: Me | null) {
  document.querySelectorAll<HTMLElement>('[data-user-slot]').forEach((slot) => {
    slot.innerHTML = user
      ? `<a class="chip user-chip" href="${u('cuenta')}" title="Tu cuenta">👤 ${esc(user.username)}</a>${user.role === 'admin' ? `<a class="chip admin-chip" href="${u('admin')}" title="Panel de administración">🛠️ Admin</a>` : ''}`
      : `<a class="chip" href="${u('cuenta')}" title="Entrar o crear cuenta">👤 Entrar</a>`;
  });
}

const DISMISS_KEY = 'cc-ann-dismissed';
function renderAnnouncement(a: Announcement | null) {
  const el = document.getElementById('announce');
  if (!el) return;
  let dismissed = '';
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) ?? '';
  } catch {}
  if (!a || dismissed === String(a.id)) {
    el.hidden = true;
    return;
  }
  const icon = a.level === 'event' ? '🎉' : a.level === 'warning' ? '⚠️' : '📣';
  el.className = `announce lvl-${a.level}`;
  el.innerHTML = `<span>${icon} ${esc(a.text)}</span><button aria-label="Cerrar aviso">✕</button>`;
  el.hidden = false;
  el.querySelector('button')!.addEventListener('click', () => {
    el.hidden = true;
    try {
      localStorage.setItem(DISMISS_KEY, String(a.id));
    } catch {}
  });
}

if (document.getElementById('hud-coins')) import('./hud');
showCookieBanner();
initPwa();
// Modo pages: sin servidor no hay cuentas ni anuncios (solo el del evento); la partida vive solo en este navegador
if (ACCOUNTS)
  initAccount().then(({ user, announcement }) => {
    renderUser(user);
    renderAnnouncement(announcement ?? eventAnnouncement());
  });
else renderAnnouncement(eventAnnouncement());
