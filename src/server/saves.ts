/** Columnas resumen de una partida, para listar y ordenar en el panel sin parsear el JSON. */
export function summarize(data: any) {
  const s = data?.stats ?? {};
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0);
  return {
    coins: n(data?.coins),
    level: Math.max(1, n(data?.level)),
    botin: Array.isArray(data?.botin) ? data.botin.length : 0,
    plays: n(s.slots) + n(s.roulette) + n(s.scratches) + n(s.boxes) + n(s.hilo),
  };
}

export const MAX_SAVE_BYTES = 512_000;
