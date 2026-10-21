import { openModal } from './card';
import * as fx from './fx';
import { SITE, u } from '../site';

// Instalación como app (Android, Chrome/Edge de escritorio) y modo sin conexión.
let deferred: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function refreshButtons() {
  document.querySelectorAll<HTMLElement>('[data-install]').forEach((b) => {
    // Los de "siempre" (landing) se muestran con instrucciones aunque el navegador no ofrezca el aviso nativo
    b.hidden = isStandalone() || (!deferred && b.dataset.install !== 'always');
  });
}

function instructions() {
  const ios = isIOS();
  openModal(`
    <div class="install-help">
      <h2 class="neon-gold">📲 Instalar ${SITE.name}</h2>
      ${
        ios
          ? `<ol><li>Abre esta web en <b>Safari</b>.</li><li>Pulsa el botón <b>Compartir</b> (cuadrado con flecha).</li><li>Elige <b>“Añadir a pantalla de inicio”</b>.</li></ol>`
          : `<ol><li>En <b>Chrome o Edge</b> (Android, Windows, macOS, Linux) abre el menú <b>⋮</b>.</li><li>Elige <b>“Instalar aplicación”</b> o <b>“Añadir a pantalla de inicio”</b>.</li><li>También puede salir un icono de instalar en la barra de direcciones.</li></ol>`
      }
      <p class="muted small">Firefox de escritorio no permite instalar webs. Necesitas HTTPS (en local, localhost también vale).</p>
    </div>`);
}

export function initPwa() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register(u('sw.js'), { scope: u() }).catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as typeof deferred;
    refreshButtons();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    refreshButtons();
    fx.burst();
    fx.toast('¡Instalada! Ya tienes el casino en tu dispositivo. 📲', { icon: '🎰' });
  });
  document.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest('[data-install]');
    if (!b) return;
    if (!deferred) return instructions();
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    refreshButtons();
  });
  refreshButtons();
}
