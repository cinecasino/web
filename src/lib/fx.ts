import confettiLib from 'canvas-confetti';
import { RARITY, type Rarity } from './rarity';
import { fmt, rand } from './util';

const layer = () => document.getElementById('fx-layer')!;
const Z = 9999;

// Con "reducir movimiento" activado en el sistema no hay confeti, lluvia de monedas, temblores ni destellos.
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => motionQuery.matches;

// Confeti en un canvas propio dentro de #fx-layer, para que pueda subir a la capa del modal.
let shoot: confettiLib.CreateTypes | null = null;
function confetti(o: confettiLib.Options) {
  if (reducedMotion()) return;
  if (!shoot) {
    const c = document.createElement('canvas');
    c.className = 'confetti-canvas';
    layer().appendChild(c);
    shoot = confettiLib.create(c, { resize: true, useWorker: false });
  }
  shoot(o);
}

/** Mueve efectos y toasts dentro del <dialog> abierto (top layer) o los devuelve al body. */
export function liftFx(into: HTMLElement | null) {
  const target = into ?? document.body;
  for (const id of ['fx-layer', 'toasts']) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== target) target.appendChild(el);
  }
}

export function burst(o: confettiLib.Options = {}) {
  confetti({ particleCount: 110, spread: 80, startVelocity: 45, origin: { y: 0.65 }, zIndex: Z, ...o });
}

export function cannons(colors?: string[]) {
  confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0, y: 0.85 }, colors, zIndex: Z });
  confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.85 }, colors, zIndex: Z });
}

export function fireworks(duration = 2500, colors?: string[]) {
  if (reducedMotion()) return;
  const end = Date.now() + duration;
  const iv = setInterval(() => {
    if (Date.now() > end) return clearInterval(iv);
    confetti({
      particleCount: 45,
      startVelocity: 32,
      spread: 360,
      ticks: 70,
      origin: { x: rand(0.1, 0.9), y: rand(0.1, 0.5) },
      colors,
      zIndex: Z,
    });
  }, 220);
}

export function rarityBurst(r: Rarity) {
  const c = RARITY[r].color;
  if (r === 'bodrio') burst({ particleCount: 25, spread: 40, startVelocity: 20, colors: [c, '#5a4020'] });
  else if (r === 'comun' || r === 'pococomun') burst({ particleCount: 40, colors: [c, '#ffffff'] });
  else if (r === 'rara') burst({ particleCount: 90, colors: [c, '#ffffff'] });
  else if (r === 'epica') {
    burst({ particleCount: 140, colors: [c, '#ffffff', '#e0b0ff'] });
    cannons([c, '#ffffff']);
  } else if (r === 'legendaria' || r === 'reliquia') {
    cannons([c, '#ffffff', '#ffe08a']);
    fireworks(1800, [c, '#ffffff', '#ffe08a']);
    coinRain(30);
  } else if (r === 'mitica') {
    cannons();
    fireworks(3000);
    coinRain(50);
    flash('#ff3d7f');
  } else {
    // Divina: lo máximo
    cannons(['#fff3b0', '#ffffff', '#ffe08a']);
    fireworks(4000, ['#fff3b0', '#ffffff', '#ffd23c', '#29f0ff']);
    coinRain(80, '✨');
    flash('#fff6d0');
  }
}

export function coinRain(n = 40, emoji = '🪙') {
  if (reducedMotion()) return;
  const L = layer();
  // En móvil, la mitad: cada moneda es un elemento animado más
  if (innerWidth < 640) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'coin-drop';
    s.textContent = Math.random() < 0.12 ? '💎' : emoji;
    s.style.left = `${rand(0, 100)}vw`;
    s.style.fontSize = `${rand(18, 44)}px`;
    s.style.animationDuration = `${rand(1.4, 2.8)}s`;
    s.style.animationDelay = `${rand(0, 0.8)}s`;
    s.style.setProperty('--spin', `${rand(-720, 720)}deg`);
    s.addEventListener('animationend', () => s.remove());
    L.appendChild(s);
  }
}

export function floatText(text: string, x: number, y: number, cls = '') {
  const s = document.createElement('span');
  s.className = `float-text ${cls}`;
  s.textContent = text;
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.addEventListener('animationend', () => s.remove());
  layer().appendChild(s);
}

export function floatFrom(el: Element, text: string, cls = '') {
  const r = el.getBoundingClientRect();
  floatText(text, r.left + r.width / 2, r.top + r.height / 2, cls);
}

export function shake(level: 'sm' | 'md' | 'lg' = 'md') {
  const m = document.querySelector('main');
  if (!m || reducedMotion()) return;
  m.classList.remove('shake-sm', 'shake-md', 'shake-lg');
  void (m as HTMLElement).offsetWidth;
  m.classList.add(`shake-${level}`);
  setTimeout(() => m.classList.remove(`shake-${level}`), 650);
}

export function flash(color = '#ffffff') {
  if (reducedMotion()) return;
  const d = document.createElement('div');
  d.className = 'flash';
  d.style.background = color;
  d.addEventListener('animationend', () => d.remove());
  layer().appendChild(d);
}

/** Cartelón a pantalla completa ("¡JACKPOT!"). */
export function banner(title: string, sub = '', color = 'var(--gold)', ms = 2200): Promise<void> {
  const d = document.createElement('div');
  d.className = 'banner';
  d.style.setProperty('--bc', color);
  d.innerHTML = `<div class="banner-rays"></div><div class="banner-text"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  layer().appendChild(d);
  return new Promise((res) =>
    setTimeout(() => {
      d.classList.add('out');
      setTimeout(() => {
        d.remove();
        res();
      }, 400);
    }, ms),
  );
}

export function toast(html: string, o: { icon?: string; color?: string; ms?: number } = {}) {
  const root = document.getElementById('toasts')!;
  const t = document.createElement('div');
  t.className = 'toast';
  if (o.color) t.style.setProperty('--tc', o.color);
  t.innerHTML = `<span class="toast-icon">${o.icon ?? '🎰'}</span><div>${html}</div>`;
  root.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 400);
  }, o.ms ?? 3800);
}

const rafs = new WeakMap<HTMLElement, number>();
export function countUp(el: HTMLElement, from: number, to: number, ms = 800, f: (n: number) => string = fmt, onTick?: () => void) {
  const start = performance.now();
  const prev = rafs.get(el);
  if (prev) cancelAnimationFrame(prev);
  let last = '';
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    const txt = f(from + (to - from) * e);
    if (txt !== last) {
      el.textContent = txt;
      if (onTick && last) onTick();
      last = txt;
    }
    if (p < 1) rafs.set(el, requestAnimationFrame(step));
  };
  rafs.set(el, requestAnimationFrame(step));
}

/** Bombillas de feria alrededor de un contenedor (position: relative). */
export function bulbs(container: HTMLElement, perSide = 12, perSideV = 8) {
  const wrap = document.createElement('div');
  wrap.className = 'bulbs';
  wrap.setAttribute('aria-hidden', 'true');
  const pts: [number, number][] = [];
  for (let i = 0; i < perSide; i++) pts.push([(i / perSide) * 100, 0]);
  for (let i = 0; i < perSideV; i++) pts.push([100, (i / perSideV) * 100]);
  for (let i = 0; i < perSide; i++) pts.push([100 - (i / perSide) * 100, 100]);
  for (let i = 0; i < perSideV; i++) pts.push([0, 100 - (i / perSideV) * 100]);
  pts.forEach(([x, y], i) => {
    const b = document.createElement('i');
    b.style.left = `${x}%`;
    b.style.top = `${y}%`;
    b.style.animationDelay = `${(i % 3) * 0.18}s`;
    wrap.appendChild(b);
  });
  container.appendChild(wrap);
  return wrap;
}

export function party(el: Element, ms = 2500) {
  el.classList.add('party');
  setTimeout(() => el.classList.remove('party'), ms);
}
