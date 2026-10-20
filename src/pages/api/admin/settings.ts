import type { APIRoute } from 'astro';
import { audit, setSetting } from '../../../server/db';
import { body, json, str } from '../../../server/http';

export const prerender = false;

/** Anuncio global (aparece arriba a todos los jugadores). Texto vacío = quitarlo. */
export const POST: APIRoute = async ({ request, locals }) => {
  const b = await body(request);
  const text = str(b.announcement, 280);
  const level = ['info', 'event', 'warning'].includes(b.level as string) ? (b.level as string) : 'info';
  await setSetting('announcement', text ? JSON.stringify({ id: Date.now(), text, level }) : null);
  await audit(locals.user!.id, 'announcement', null, text || '(quitado)');
  return json({ ok: true });
};
