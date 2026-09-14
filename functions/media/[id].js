/* GET /media/<id> — a photograph uploaded with a post.
 *
 * Images are stored in D1 under a random id and are never rewritten, so they
 * can be cached hard and forever. Uploads are shrunk in the browser before
 * they get here (see /admin), which keeps rows small and pages fast. */

import { notConfigured } from '../_lib/viewer.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function onRequestGet({ env, params }) {
  if (!env.DB) return notConfigured('Image storage');

  const id = String(params.id || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!id) return new Response('Not found', { status: 404 });

  const row = await env.DB.prepare('SELECT mime, bytes FROM images WHERE id = ?')
    .bind(id).first();
  if (!row) return new Response('Not found', { status: 404 });

  // D1 hands BLOBs back as a number array in some runtime versions and as an
  // ArrayBuffer in others. Accept either.
  let body = row.bytes;
  if (Array.isArray(body)) body = new Uint8Array(body);

  const mime = ALLOWED.has(row.mime) ? row.mime : 'application/octet-stream';

  return new Response(body, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
