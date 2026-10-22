// Tarjeta del premio: una imagen de 1080×1350 (formato vertical de redes) dibujada en canvas con el póster,
// la rareza, los sellos y el arte, y compartida con la Web Share API (WhatsApp, Telegram…) o descargada.
import { img, type Title } from './tmdb';
import { rarityOf, RARITY, statusOf } from './rarity';
import { ARTES, isSpecial, type Arte } from './arts';
import { SELLOS, sellosOf } from './sellos';
import * as fx from './fx';
import { SITE, u } from '../site';

const W = 1080;
const H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const im = new Image();
    // image.tmdb.org manda Access-Control-Allow-Origin: * solo si la petición lleva Origin, y no avisa con
    // "Vary: Origin". Así que la copia en caché del <img> normal no sirve para el canvas: se pide con una
    // URL distinta (TMDB ignora el parámetro) para que el navegador no la reutilice.
    im.crossOrigin = 'anonymous';
    im.onload = () => ok(im);
    im.onerror = fail;
    im.src = `${src}${src.includes('?') ? '&' : '?'}cc=share`;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Corta un texto en como mucho `max` líneas que quepan en `width`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= width) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
    if (lines.length === max) break;
  }
  if (lines.length < max && line) lines.push(line);
  if (lines.length === max && words.join(' ') !== lines.join(' ')) {
    let last = lines[max - 1];
    while (ctx.measureText(`${last}…`).width > width && last.length) last = last.slice(0, -1);
    lines[max - 1] = `${last}…`;
  }
  return lines;
}

/** Filtro de canvas que imita el arte (lo que no se puede imitar con filtros se dibuja encima). */
const ARTE_FILTER: Partial<Record<Arte, string>> = {
  noir: 'grayscale(1) contrast(1.4) brightness(0.95)',
  vhs: 'saturate(1.5) contrast(1.15) hue-rotate(-8deg)',
  popart: 'saturate(2.2) contrast(1.35)',
  pixel: 'saturate(1.35) contrast(1.1)',
  dorado: 'sepia(0.6) saturate(1.7) hue-rotate(-12deg) brightness(1.05)',
  billete: 'sepia(0.5) saturate(1.5) brightness(1.05)',
  embrujada: 'sepia(0.35) hue-rotate(55deg) saturate(1.5) brightness(0.9)',
};

export async function renderShareCard(t: Title, arte: Arte = 'normal', sig?: string): Promise<Blob> {
  await Promise.allSettled([document.fonts.load('80px Bungee'), document.fonts.load('800 40px Rubik'), document.fonts.load('80px Caveat')]);
  const rated = statusOf(t) === 'rated';
  const r = rarityOf(t);
  const color = rated ? RARITY[r].color : '#29f0ff';
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Fondo: el mismo neón de la web
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#3b0a5e');
  bg.addColorStop(0.55, '#140924');
  bg.addColorStop(1, '#0a3b5e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 560, 50, W / 2, 560, 700);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Cabecera
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '64px Bungee';
  ctx.shadowColor = '#ff2bd6';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffd6f6';
  ctx.fillText(`🎰 ${SITE.logo.join(' ')}`, W / 2, 110);
  ctx.shadowBlur = 0;

  // Póster con marco de la rareza
  const pw = 600;
  const ph = 900;
  const px = (W - pw) / 2;
  const py = 160;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 60;
  roundRect(ctx, px - 10, py - 10, pw + 20, ph + 20, 34);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 26);
  ctx.clip();
  try {
    const poster = await loadImage(img(t.poster, arte === 'pixel' ? 'w92' : 'w500'));
    ctx.filter = ARTE_FILTER[arte] ?? 'none';
    ctx.imageSmoothingEnabled = arte !== 'pixel';
    ctx.drawImage(poster, px, py, pw, ph);
    ctx.filter = 'none';
  } catch {
    ctx.fillStyle = '#2a1240';
    ctx.fillRect(px, py, pw, ph);
  }
  drawArteOverlay(ctx, arte, px, py, pw, ph, sig);
  ctx.restore();

  // Sello de rareza sobre el póster
  const label = rated ? `${RARITY[r].emoji} ${RARITY[r].label.toUpperCase()}` : '🔮 PRÓXIMAMENTE';
  ctx.font = '44px Bungee';
  const lw = ctx.measureText(label).width + 50;
  ctx.save();
  ctx.translate(W / 2, py + ph - 30);
  ctx.rotate(-0.12);
  roundRect(ctx, -lw / 2, -40, lw, 70, 16);
  ctx.fillStyle = '#000c';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(label, 0, 12);
  ctx.restore();

  // Título y datos
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 54px Rubik';
  const lines = wrap(ctx, t.title, W - 140, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, py + ph + 100 + i * 62));
  const after = py + ph + 100 + lines.length * 62;
  const bits = [rated ? `⭐ ${t.vote.toFixed(1)}` : '', t.year, t.type === 'movie' ? '🎬 Película' : '📺 Serie', isSpecial(arte) ? `${ARTES[arte].emoji} ${ARTES[arte].label}` : '']
    .filter(Boolean)
    .join('  ·  ');
  ctx.font = '600 34px Rubik';
  ctx.fillStyle = '#ffc93c';
  ctx.fillText(bits, W / 2, after + 4);
  const sellos = sellosOf(t);
  if (sellos.length) {
    ctx.font = '600 30px Rubik';
    ctx.fillStyle = '#bba8d8';
    ctx.fillText(sellos.map((s) => `${SELLOS[s].emoji} ${SELLOS[s].label}`).join('   '), W / 2, after + 50);
  }

  // Pie
  ctx.font = '600 30px Rubik';
  ctx.fillStyle = '#bba8d8';
  ctx.fillText(`Me ha tocado en ${SITE.name} · ${new URL(u(), location.origin).host}`, W / 2, H - 40);

  return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('No se pudo crear la imagen'))), 'image/png'));
}

/** Capas de los artes que no se imitan solo con filtros. Se dibuja dentro del recorte del póster. */
function drawArteOverlay(ctx: CanvasRenderingContext2D, arte: Arte, x: number, y: number, w: number, h: number, sig?: string) {
  if (arte === 'brillante' || arte === 'holografico' || arte === 'dorado') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (arte === 'holografico') ['#ff00ea44', '#00f0ff44', '#fff20044', '#2bff8844'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    else {
      g.addColorStop(0.3, 'transparent');
      g.addColorStop(0.5, arte === 'dorado' ? '#ffd23c66' : '#ffffff66');
      g.addColorStop(0.7, 'transparent');
    }
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (arte === 'vhs') {
    ctx.fillStyle = '#0005';
    for (let yy = y; yy < y + h; yy += 6) ctx.fillRect(x, yy, w, 2);
    ctx.font = '700 32px ui-monospace, monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('▶ PLAY', x + 24, y + h - 140);
    ctx.textAlign = 'center';
  }
  if (arte === 'popart') {
    ctx.fillStyle = '#0006';
    for (let yy = y; yy < y + h; yy += 12) for (let xx = x; xx < x + w; xx += 12) ctx.fillRect(xx, yy, 4, 4);
  }
  if (arte === 'noir' || arte === 'embrujada') {
    const v = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.3, x + w / 2, y + h / 2, w * 0.9);
    v.addColorStop(0, 'transparent');
    v.addColorStop(1, arte === 'noir' ? '#000c' : '#1b5e20aa');
    ctx.fillStyle = v;
    ctx.fillRect(x, y, w, h);
  }
  if (arte === 'firmada' && sig) {
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.72);
    ctx.rotate(-0.16);
    ctx.font = '96px Caveat';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 16;
    ctx.fillText(sig, 0, 0);
    ctx.restore();
  }
  if (arte === 'billete') {
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.45);
    ctx.rotate(-0.24);
    const g = ctx.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, '#b8860b');
    g.addColorStop(0.5, '#ffe27a');
    g.addColorStop(1, '#b8860b');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -40, w * 2, 80);
    ctx.font = '48px Bungee';
    ctx.fillStyle = '#3a1f00';
    ctx.fillText('🎫 BILLETE DORADO', 0, 16);
    ctx.restore();
  }
}

/** Comparte la tarjeta con el menú del sistema; si no se puede, la descarga y copia el texto. */
export async function shareTitle(t: Title, arte: Arte = 'normal', sig?: string) {
  const url = new URL(u(), location.origin).href;
  const r = statusOf(t) === 'rated' ? RARITY[rarityOf(t)].label : 'Próximamente';
  const text = `🎰 Me ha tocado «${t.title}»${t.year ? ` (${t.year})` : ''}, ${r.toLowerCase()}${isSpecial(arte) ? ` con arte ${ARTES[arte].label}` : ''}, en ${SITE.name}. ¿Qué te toca a ti?`;
  let blob: Blob;
  try {
    blob = await renderShareCard(t, arte, sig);
  } catch {
    // Sin imagen (p. ej. sin conexión): al menos el texto
    if (navigator.share) await navigator.share({ title: t.title, text, url }).catch(() => {});
    else await copy(`${text} ${url}`);
    return;
  }
  const slug = t.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const file = new File([blob], `cine-casino-${slug || 'premio'}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: t.title, text: `${text} ${url}` }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  await copy(`${text} ${url}`);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    fx.toast('Imagen descargada y texto copiado: pégalo donde quieras compartirlo. 📋', { icon: '📤' });
  } catch {
    fx.toast('Imagen descargada. 📥', { icon: '📤' });
  }
}
