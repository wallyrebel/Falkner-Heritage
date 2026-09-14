/* GET  /api/posts — the posts this person may work on.
 * POST /api/posts — start a new draft. */

import {
  json, newId, nowIso, uniqueSlug, canPublish,
} from '../../_lib/db.js';

const COLUMNS = `id, slug, title, summary, status, hero_image_id, hero_alt,
                 author_email, author_name, created_at, updated_at, published_at`;

export async function onRequestGet({ env, data }) {
  const { user } = data;

  // Editors and owners run the blog, so they see everything. An author sees
  // their own work, which is all they are able to change anyway.
  const query = canPublish(user)
    ? env.DB.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY updated_at DESC LIMIT 500`)
    : env.DB.prepare(`SELECT ${COLUMNS} FROM posts WHERE author_email = ? ORDER BY updated_at DESC LIMIT 500`).bind(user.email);

  const { results } = await query.all();
  return json({ posts: results, scope: canPublish(user) ? 'all' : 'mine' });
}

export async function onRequestPost({ request, env, data }) {
  const { user } = data;

  let payload = {};
  try { payload = await request.json(); } catch { /* an empty new draft is fine */ }

  const title = String(payload.title || '').trim().slice(0, 200) || 'Untitled post';
  const id = newId();
  const slug = await uniqueSlug(env.DB, title);
  const stamp = nowIso();

  await env.DB.prepare(
    `INSERT INTO posts (id, slug, title, summary, body, hero_image_id, hero_alt,
                        status, author_email, author_name, created_at, updated_at)
     VALUES (?, ?, ?, '', '', NULL, '', 'draft', ?, ?, ?, ?)`,
  ).bind(id, slug, title, user.email, user.name || '', stamp, stamp).run();

  const post = await env.DB.prepare(`SELECT ${COLUMNS}, body FROM posts WHERE id = ?`)
    .bind(id).first();

  return json({ post }, 201);
}
