// HUD del casino (fichas, nivel, bonus diario, modo, sonido) y ticker de tendencias. Solo en páginas de juego.
import { claimDaily, dailyAvailable, getState, MIN_BET, rescue, setMode, toggleMute, xpForLevel, type Mode } from './store';
import { sfx } from './sfx';
import * as fx from './fx';
import { openModal, register } from './card';
import { trending } from './tmdb';
import type { Achievement } from './achievements';
import { esc, fmt, sleep } from './util';

const $ = (id: string) => document.getElementById(id)!;
const MODES: Record<Mode, string> = { movie: '🎬 Pelis', tv: '📺 Series', both: '🎲 Todo' };
const ORDER: Mode[] = ['movie', 'tv', 'both'];

let shown = getState().coins;

function render() {
  const s = getState();
  const coinsEl = $('coins-val');
  if (s.coins !== shown) {
    fx.countUp(coinsEl, shown, s.coins, 700);
    const hc = $('hud-coins');
    hc.classList.remove('bump-up', 'bump-down');
    void hc.offsetWidth;
    hc.classList.add(s.coins > shown ? 'bump-up' : 'bump-down');
    shown = s.coins;
  } else coinsEl.textContent = fmt(s.coins);
  $('lvl-val').textContent = String(s.level);
  const need = xpForLevel(s.level);
  $('xp-fill').style.width = `${Math.min(100, (s.xp / need) * 100)}%`;
  $('xp-text').textContent = `${fmt(s.xp)} / ${fmt(need)} XP`;
  $('hud-daily').classList.toggle('available', dailyAvailable());
  ($('hud-rescue') as HTMLButtonElement).hidden = s.coins >= MIN_BET;
  $('hud-mode').textContent = MODES[s.mode];
  $('hud-mute').textContent = s.muted ? '🔇' : '🔊';
  $('hud-mute').setAttribute('aria-pressed', String(s.muted));
}

render();

window.addEventListener('casino:change', (e) => {
  render();
  const d = (e as CustomEvent).detail;
  if (d?.coinsDelta) fx.floatFrom($('hud-coins'), `${d.coinsDelta > 0 ? '+' : ''}${fmt(d.coinsDelta)}`, d.coinsDelta > 0 ? 'pos' : 'neg');
});

window.addEventListener('casino:levelup', (e) => {
  const { level, bonus } = (e as CustomEvent).detail;
  setTimeout(() => {
    sfx.levelup();
    fx.fireworks(2200);
    fx.banner(`¡NIVEL ${level}!`, `+${fmt(bonus)} fichas de regalo`, 'var(--cyan)');
  }, 400);
});

window.addEventListener('casino:achievement', (e) => {
  const a = (e as CustomEvent<Achievement>).detail;
  sfx.win();
  fx.burst({ particleCount: 60, origin: { x: 0.9, y: 0.15 } });
  fx.toast(`<b>¡Logro desbloqueado!</b><br>${esc(a.name)} · <span class="gold">+${fmt(a.reward)} 🪙</span>`, { icon: a.icon, color: 'var(--gold)', ms: 5000 });
});

window.addEventListener('casino:broke', (e) => {
  const need = (e as CustomEvent).detail.need;
  sfx.error();
  fx.shake('sm');
  fx.toast(`Te faltan fichas: necesitas <b>${fmt(need)}</b>.${getState().coins < MIN_BET ? ' Pide un 🆘 rescate.' : ''}`, { icon: '🪙', color: 'var(--red)' });
  const rescueBtn = $('hud-rescue');
  rescueBtn.classList.remove('wiggle');
  void rescueBtn.offsetWidth;
  rescueBtn.classList.add('wiggle');
});

$('hud-mode').addEventListener('click', () => {
  const s = getState();
  const next = ORDER[(ORDER.indexOf(s.mode) + 1) % ORDER.length];
  setMode(next);
  sfx.click();
  fx.toast(`Modo: <b>${MODES[next]}</b>. Los juegos te darán ${next === 'movie' ? 'películas' : next === 'tv' ? 'series' : 'de todo'}.`, { icon: '🎛️' });
});

$('hud-mute').addEventListener('click', () => {
  toggleMute();
  sfx.click();
});

$('hud-rescue').addEventListener('click', () => {
  const n = rescue();
  if (!n) return;
  sfx.coins(8);
  fx.coinRain(25);
  fx.toast('El casino se apiada de ti: <b>+200 fichas</b>. La casa siempre vuelve a por ti. 😈', { icon: '🆘' });
});

$('hud-daily').addEventListener('click', async () => {
  if (!dailyAvailable()) {
    const s = getState();
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const h = Math.floor((+midnight - +now) / 3.6e6);
    const m = Math.floor(((+midnight - +now) % 3.6e6) / 6e4);
    fx.toast(`Ya cobraste hoy. Vuelve en <b>${h}h ${m}m</b>. Racha: ${s.daily.streak} 🔥`, { icon: '⏳' });
    return;
  }
  const s = getState();
  const inner = openModal(
    `<div class="daily">
      <h2 class="neon-gold">BONUS DIARIO</h2>
      <p class="muted">Racha actual: <b>${s.daily.streak} 🔥</b> · cada día seguido suma +50</p>
      <button class="chest" id="chest">🎁</button>
      <p class="muted" id="chest-hint">¡Toca el cofre!</p>
      <div class="daily-amount" id="daily-amount"></div>
    </div>`,
  );
  const chest = inner.querySelector('#chest') as HTMLButtonElement;
  chest.onclick = async () => {
    chest.disabled = true;
    chest.classList.add('shaking');
    sfx.drumroll(1200);
    await sleep(1250);
    const res = claimDaily();
    if (!res) return;
    chest.classList.remove('shaking');
    chest.classList.add('open');
    chest.textContent = '💰';
    sfx.jackpot();
    fx.burst({ particleCount: 180, spread: 120 });
    fx.coinRain(60);
    const amt = inner.querySelector('#daily-amount') as HTMLElement;
    fx.countUp(amt, 0, res.amount, 1400, (n) => `+${fmt(n)} 🪙`);
    (inner.querySelector('#chest-hint') as HTMLElement).innerHTML = `Racha de <b>${res.streak}</b> días. ¡Mañana más!`;
    render();
  };
});

// Ticker inferior con tendencias reales
trending()
  .then((list) => {
    const html = list
      .slice(0, 20)
      .map((t) => {
        register(t);
        return `<span class="tick-item" data-title-key="${t.key}">🔥 ${esc(t.title)} <b>${t.votes >= 20 ? `⭐ ${t.vote.toFixed(1)}` : '🔮 estreno'}</b></span>`;
      })
      .join('<span class="tick-sep">✦</span>');
    $('ticker').innerHTML = `<div class="ticker-run">${html}</div><div class="ticker-run" aria-hidden="true">${html}</div>`;
  })
  .catch(() => {
    $('ticker').innerHTML = '<div class="ticker-run">📡 Sin señal de TMDB ahora mismo. Los juegos lo volverán a intentar.</div>';
  });
