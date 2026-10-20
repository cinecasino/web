// Comportamiento común a todas las páginas (casino, landing, legales, cuenta, admin).
import { closeModal, lookup, showTitle } from './card';
import { initAccount, type Announcement, type Me } from './account';
import { showCookieBanner } from './consent';
import { initPwa } from './pwa';
import { sfx } from './sfx';
import * as fx from './fx';
import { esc, pick, rand } from './util';

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
  if (e.key !== 'Enter') return;
  const el = (e.target as HTMLElement).closest?.<HTMLElement>('[data-title-key]');
  if (el) el.click();
});
document.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('.btn, .chip, .nav a')) sfx.click();
});

// Modal: cerrar con ✕ o clic fuera
const modal = document.getElementById('modal') as HTMLDialogElement;
modal.addEventListener('click', (e) => {
  if (e.target === modal || (e.target as HTMLElement).closest('[data-close]')) closeModal();
});
modal.addEventListener('close', () => {
  (modal.querySelector('.modal-inner') as HTMLElement).innerHTML = '';
  fx.liftFx(null);
});

// Fondo: emojis flotando
const floaters = document.getElementById('floaters');
if (floaters) {
  const EMOJIS = ['🎰', '🍒', '💎', '🎬', '🍿', '⭐', '🪙', '🎲', '🃏', '7️⃣', '📺', '🎟️', '💰', '🔔'];
  for (let i = 0; i < 22; i++) {
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
      ? `<a class="chip user-chip" href="/cuenta" title="Tu cuenta">👤 ${esc(user.username)}</a>${user.role === 'admin' ? '<a class="chip admin-chip" href="/admin" title="Panel de administración">🛠️ Admin</a>' : ''}`
      : '<a class="chip" href="/cuenta" title="Entrar o crear cuenta">👤 Entrar</a>';
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
initAccount().then(({ user, announcement }) => {
  renderUser(user);
  renderAnnouncement(announcement);
});
