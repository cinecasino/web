import { getState } from './store';

// Todos los sonidos se sintetizan con WebAudio: nada de archivos.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (getState().muted) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  at?: number;
  slide?: number;
}

function tone(freq: number, dur: number, { type = 'square', vol = 0.2, at = 0, slide }: ToneOpts = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

interface NoiseOpts {
  vol?: number;
  at?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
}

function noise(dur: number, { vol = 0.15, at = 0, freq = 2000, q = 1, type = 'bandpass' }: NoiseOpts = {}) {
  const c = ac();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  click() {
    tone(520, 0.05, { vol: 0.07 });
  },
  tick() {
    tone(1500 + Math.random() * 300, 0.025, { type: 'triangle', vol: 0.1 });
  },
  thud() {
    tone(140, 0.18, { type: 'sine', vol: 0.5, slide: 55 });
    noise(0.07, { vol: 0.12, freq: 500 });
  },
  lever() {
    noise(0.25, { vol: 0.15, freq: 900, q: 4 });
    tone(200, 0.2, { type: 'sawtooth', vol: 0.06, slide: 90 });
  },
  coin() {
    tone(988, 0.07, { vol: 0.12 });
    tone(1319, 0.22, { vol: 0.12, at: 0.07 });
  },
  coins(n = 6) {
    for (let i = 0; i < n; i++) {
      tone(988 + Math.random() * 200, 0.06, { vol: 0.07, at: i * 0.07 });
      tone(1319 + Math.random() * 200, 0.14, { vol: 0.07, at: i * 0.07 + 0.05 });
    }
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { vol: 0.13, at: i * 0.08 }));
  },
  jackpot() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    for (let r = 0; r < 2; r++) seq.forEach((f, i) => tone(f, 0.12, { vol: 0.12, at: r * 0.75 + i * 0.09 }));
    [1047, 1319, 1568, 2093].forEach((f) => tone(f, 1.1, { type: 'sawtooth', vol: 0.04, at: 1.55 }));
    sfx.coins(12);
  },
  lose() {
    [392, 370, 349, 294].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.22, { type: 'sawtooth', vol: 0.07, at: i * 0.22 }));
  },
  levelup() {
    [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => tone(f, 0.1, { vol: 0.11, at: i * 0.06 }));
    tone(1047, 0.7, { type: 'triangle', vol: 0.15, at: 0.5 });
  },
  whoosh() {
    noise(0.45, { vol: 0.18, freq: 1200, q: 0.7 });
  },
  scratch() {
    noise(0.05, { vol: 0.05, freq: 4000, type: 'highpass' });
  },
  reveal() {
    tone(330, 0.5, { type: 'triangle', vol: 0.15, slide: 990 });
    noise(0.3, { vol: 0.07, freq: 3000 });
  },
  drumroll(ms = 1200) {
    const n = Math.floor(ms / 45);
    for (let i = 0; i < n; i++) noise(0.04, { vol: 0.05 + (i / n) * 0.14, freq: 300, q: 0.5, at: i * 0.045 });
  },
  tension() {
    tone(220, 1.4, { type: 'sawtooth', vol: 0.05, slide: 660 });
  },
  error() {
    tone(180, 0.15, { vol: 0.1 });
    tone(140, 0.2, { vol: 0.1, at: 0.12 });
  },
};
