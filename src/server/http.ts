export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

export const fail = (message: string, status = 400) => json({ error: message }, status);

export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    if (text.length > 600_000) return {} as T;
    return (JSON.parse(text || '{}') ?? {}) as T;
  } catch {
    return {} as T;
  }
}

export const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const isSecure = (url: URL) => url.protocol === 'https:';
