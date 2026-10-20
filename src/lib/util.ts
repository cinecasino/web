export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function weighted<T>(items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let x = Math.random() * total;
  for (const t of items) {
    x -= weight(t);
    if (x <= 0) return t;
  }
  return items[items.length - 1];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('es-ES');

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
