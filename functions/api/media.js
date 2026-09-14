/* POST /api/media — store a photograph for a post.
 *
 * The browser shrinks pictures before they get here (a phone photo is far too
 * big for a web page anyway), so anything arriving oversized is refused rather
 * than silently mangled. D1 caps how large a single row may be. */

import { json, newId, nowIso } from '../_lib/db.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 1_200_000;

export async function onRequestPost({ request, env, data }) {
  const { user } = data;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Could not read that upload.' }, 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return json({ error: 'No photograph was attached.' }, 400);
  }

  const mime = String(file.type || '').toLowerCase();
  if (!ALLOWED.has(mime)) {
    return json({ error: 'Please use a JPEG, PNG or WebP photograph.' }, 415);
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength === 0) return json({ error: 'That file was empty.' }, 400);
  if (buffer.byteLength > MAX_BYTES) {
    return json({
      error: `That photograph is still ${Math.round(buffer.byteLength / 1024)} KB after resizing. Please try a smaller one.`,
    }, 413);
  }

  const id = newId();
  const width = Math.max(0, parseInt(form.get('width') || '0', 10) || 0);
  const height = Math.max(0, parseInt(form.get('height') || '0', 10) || 0);

  await env.DB.prepare(
    `INSERT INTO images (id, mime, bytes, width, height, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, mime, new Uint8Array(buffer), width, height, user.email, nowIso()).run();

  return json({ id, url: `/media/${id}`, width, height, bytes: buffer.byteLength }, 201);
}
