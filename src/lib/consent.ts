import { ACCOUNTS, u } from '../site';
// Consentimiento: lo necesario (partida en localStorage, cookie de sesión) no requiere permiso;
// el contenido externo (tráileres de YouTube) solo se carga si se acepta.
const KEY = 'cc-consent';

export interface Consent {
  v: 1;
  external: boolean;
  at: number;
}

export function getConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return c?.v === 1 ? c : null;
  } catch {
    return null;
  }
}

export function setConsent(external: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, external, at: Date.now() } satisfies Consent));
  } catch {}
  window.dispatchEvent(new CustomEvent('casino:consent', { detail: external }));
}

export const allowsExternal = () => getConsent()?.external === true;

export function showCookieBanner(force = false) {
  if (!force && getConsent()) return;
  document.querySelector('.cookie-banner')?.remove();
  const external = allowsExternal();
  const el = document.createElement('div');
  el.className = 'cookie-banner';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Preferencias de cookies');
  el.innerHTML = `
    <div class="cb-text">
      <b>🍪 Cookies y almacenamiento</b>
      <p>Guardamos tu partida en el almacenamiento local del navegador${ACCOUNTS ? ', y si inicias sesión usamos una cookie técnica de sesión. Son imprescindibles' : '. Es imprescindible'} y no rastrea nada.
      Opcionalmente, los tráileres se cargan desde YouTube, que puede poner sus propias cookies. <a href="${u('cookies')}">Más información</a></p>
      <label class="cb-toggle"><input type="checkbox" ${external ? 'checked' : ''} data-ext> Permitir contenido externo (tráileres de YouTube)</label>
    </div>
    <div class="cb-actions">
      <button class="btn btn-ghost" data-c="necessary">Solo necesarias</button>
      <button class="btn btn-ghost" data-c="save">Guardar selección</button>
      <button class="btn btn-gold" data-c="all">Aceptar todo</button>
    </div>`;
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-c]');
    if (!b) return;
    const choice = b.dataset.c;
    setConsent(choice === 'all' ? true : choice === 'necessary' ? false : (el.querySelector('[data-ext]') as HTMLInputElement).checked);
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  });
  document.body.appendChild(el);
}
