// Lógica de la ruleta, compartida por la normal y la del terror. El SVG lo pinta components/Wheel.astro.
import { spend, earn, stat } from './store';
import { luckyPick, pickType, type MediaType, type Title } from './tmdb';
import { grantClaim, showTitle, tileHTML } from './card';
import { sfx } from './sfx';
import * as fx from './fx';
import { sleep, weighted } from './util';

export type SegKind = 'genre' | 'mult' | 'quiebra' | 'jackpot';

export interface WheelSeg {
  kind: SegKind;
  key: string;
  emoji: string;
  name: string;
  color: string;
  /** Géneros de TMDB que se combinan (AND) al caer en la casilla. Sin `tv`, la casilla solo da películas. */
  movie?: number[];
  tv?: number[];
  /** Casillas 'mult': multiplica el precio del giro y regala el siguiente. */
  mult?: number;
}

export interface WheelOpts {
  cost: number;
  jackpotCoins: number;
  /** Título del jackpot: nota y votos mínimos, y géneros opcionales (sin `tv`, solo películas). */
  jackpot: { minVote: number; minVotes: number; movie?: number[]; tv?: number[] };
  spinLabel: string;
  jackpotHeadline: string;
  genreHeadline: (seg: WheelSeg) => string;
}

const SPIN_MS = 6000;

/** Película o serie: si la casilla no tiene géneros de series, siempre película. */
const typeFor = (g?: { movie?: number[]; tv?: number[] }): MediaType => (g && !g.tv ? 'movie' : pickType());

export function initWheel(o: WheelOpts) {
  const wheel = document.getElementById('wheel') as unknown as SVGSVGElement;
  const pointer = document.getElementById('pointer')!;
  const resultEl = document.getElementById('wheel-result')!;
  const btn = document.getElementById('spin-wheel') as HTMLButtonElement;
  const history = document.getElementById('history')!;
  const segs: WheelSeg[] = JSON.parse(wheel.dataset.segs!);
  const N = segs.length;
  const A = 360 / N;

  let rot = 0;
  let spinning = false;
  let free = false;

  const angleNow = () => {
    const m = new DOMMatrix(getComputedStyle(wheel).transform);
    return ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
  };
  const segAt = (angle: number) => Math.floor(((((360 - angle) % 360) + 360) % 360) / A) % N;

  function watchTicks() {
    let last = segAt(angleNow());
    const loop = () => {
      if (!spinning) return;
      const s = segAt(angleNow());
      if (s !== last) {
        last = s;
        sfx.tick();
        pointer.classList.remove('flick');
        void pointer.offsetWidth;
        pointer.classList.add('flick');
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function addHistory(html: string) {
    if (history.querySelector('p')) history.innerHTML = '';
    history.insertAdjacentHTML('afterbegin', html);
    while (history.children.length > 12) history.lastElementChild!.remove();
  }

  function titleFor(seg: WheelSeg): Promise<Title | null> {
    if (seg.kind === 'genre') {
      const type = typeFor(seg);
      return luckyPick(type, { genres: seg[type], minVote: 6.3, minVotes: 200 }, 20);
    }
    if (seg.kind === 'jackpot') {
      const j = o.jackpot;
      const type = j.movie || j.tv ? typeFor(j) : pickType();
      return luckyPick(type, { genres: j[type], minVote: j.minVote, minVotes: j.minVotes }, 8);
    }
    return Promise.resolve(null);
  }

  async function spinWheel() {
    if (spinning) return;
    if (!free && !spend(o.cost)) return;
    free = false;
    spinning = true;
    btn.disabled = true;
    stat('roulette');
    sfx.whoosh();
    resultEl.innerHTML = '🎡 Girando…';
    wheel.classList.add('spinning');

    const idx = weighted(
      segs.map((_, i) => i),
      (i) => (segs[i].kind === 'jackpot' ? 0.45 : segs[i].kind === 'quiebra' ? 0.9 : 1),
    );
    const center = idx * A + A / 2;
    const jitter = (Math.random() - 0.5) * A * 0.7;
    const desired = (((360 - center + jitter) % 360) + 360) % 360;
    rot += 360 * (6 + Math.floor(Math.random() * 3)) + ((desired - (rot % 360) + 360) % 360);
    wheel.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.75,.1,1)`;
    wheel.style.transform = `rotate(${rot}deg)`;
    watchTicks();

    const seg = segs[idx];
    const titleP = titleFor(seg).catch(() => null);

    setTimeout(() => sfx.drumroll(1500), SPIN_MS - 1700);
    await sleep(SPIN_MS + 100);
    spinning = false;
    wheel.classList.remove('spinning');
    btn.disabled = false;

    if (seg.kind === 'quiebra') {
      stat('quiebras');
      sfx.lose();
      fx.shake('lg');
      fx.flash('#000000');
      resultEl.innerHTML = '💀 <b>QUIEBRA.</b> La casa gana. Vuelve a intentarlo…';
      addHistory('<div class="hist-chip bad">💀 QUIEBRA</div>');
      return;
    }
    if (seg.kind === 'mult') {
      const won = o.cost * (seg.mult ?? 2);
      earn(won);
      free = true;
      sfx.win();
      sfx.coins(6);
      fx.burst();
      resultEl.innerHTML = `${seg.emoji} <b>¡${seg.name}!</b> +${won} fichas y el próximo giro es gratis`;
      btn.innerHTML = '🎁 ¡GIRO GRATIS!';
      addHistory(`<div class="hist-chip good">${seg.emoji} ${seg.name}</div>`);
      return;
    }
    btn.innerHTML = o.spinLabel;
    if (seg.kind === 'jackpot') {
      earn(o.jackpotCoins);
      sfx.jackpot();
      fx.shake('lg');
      fx.fireworks(3000);
      fx.coinRain(80);
      resultEl.innerHTML = `${seg.emoji} <b>¡¡JACKPOT!!</b> +${o.jackpotCoins} fichas`;
      await fx.banner('¡JACKPOT!', `+${o.jackpotCoins} fichas y un título de élite`, 'var(--gold)');
    } else {
      sfx.win();
      fx.burst({ particleCount: 60 });
      resultEl.innerHTML = `${seg.emoji} ¡Ha salido <b>${seg.name}</b>!`;
    }
    const t = await titleP;
    if (!t) {
      fx.toast('TMDB no ha devuelto nada. ¡Otra vuelta!', { icon: '🤷' });
      return;
    }
    grantClaim(t);
    addHistory(tileHTML(t, { size: 'w185' }));
    showTitle(t, { headline: seg.kind === 'jackpot' ? o.jackpotHeadline : o.genreHeadline(seg), reveal: true, prize: true });
  }

  btn.addEventListener('click', spinWheel);
  wheel.addEventListener('click', spinWheel);
}
