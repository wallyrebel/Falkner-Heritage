/* GET / PUT / DELETE  /api/posts/<id> */

import {
  json, nowIso, uniqueSlug, canPublish, canEditPost,
} from '../../_lib/db.js';

const STATUSES = new Set(['draft', 'review', 'published']);

const LIMITS = {
  title: 200,
  summary: 500,
  hero_alt: 300,
  body: 100000,
};

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim().slice(0, limit);
}

async function load(env, id) {
  return env.DB.prepare(
    `SELECT id, slug, title, summary, body, hero_image_id, hero_alt, status,
            author_email, author_name, created_at, updated_at, published_at
       FROM posts WHERE id = ?`,
  ).bind(id).first();
}

export async function onRequestGet({ env, data, params }) {
  const post = await load(env, String(params.id));
  if (!post) return json({ error: 'That post no longer exists.' }, 404);
  if (!canEditPost(data.user, post)) return json({ error: 'That is not your post.' }, 403);
  return json({ post });
}

export async function onRequestPut({ request, env, data, params }) {
  const { user } = data;
  const post = await load(env, String(params.id));
  if (!post) return json({ error: 'That post no longer exists.' }, 404);
  if (!canEditPost(user, post)) return json({ error: 'That is not your post.' }, 403);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }

  const title = clean(payload.title, LIMITS.title) || post.title;
  const summary = clean(payload.summary, LIMITS.summary);
  const body = clean(payload.body, LIMITS.body);
  const heroAlt = clean(payload.hero_alt, LIMITS.hero_alt);

  let heroImageId = payload.hero_image_id == null
    ? null
    : String(payload.hero_image_id).replace(/[^a-zA-Z0-9]/g, '');
  if (heroImageId) {
    const exists = await env.DB.prepare('SELECT id FROM images WHERE id = ?')
      .bind(heroImageId).first();
    if (!exists) heroImageId = null;
  } else {
    heroImageId = null;
  }

  const requested = String(payload.status || post.status);
  if (!STATUSES.has(requested)) return json({ error: 'Unknown status.' }, 400);

  // Putting a post on the public site, or taking it off again, is an editor's
  // call. Correcting one that is already up is not: an author keeps editing
  // their own live post, and the change simply goes live with it.
  let status = requested;
  if (!canPublish(user)) {
    if (post.status === 'published') {
      status = 'published';
    } else if (requested === 'published') {
      return json({
        error: 'Only an editor can publish. Save it as "Ready for review" and someone will put it live.',
      }, 403);
    }
  }

  if (status === 'published' && !title.trim()) {
    return json({ error: 'Give the post a title before publishing it.' }, 400);
  }
  if (status === 'published' && !body.trim()) {
    return json({ error: 'The post is empty. Write something before publishing it.' }, 400);
  }
  if (status === 'published' && heroImageId && !heroAlt.trim()) {
    return json({
      error: 'Describe the photograph in the "photo description" box. Screen readers and Google both read it.',
    }, 400);
  }

  // The address is frozen once a post has been public, so links that are
  // already out in the world keep working.
  const slug = post.published_at
    ? post.slug
    : await uniqueSlug(env.DB, title, post.id);

  const stamp = nowIso();
  const publishedAt = status === 'published'
    ? (post.published_at || stamp)
    : post.published_at;

  await env.DB.prepare(
    `UPDATE posts
        SET slug = ?, title = ?, summary = ?, body = ?, hero_image_id = ?, hero_alt = ?,
            status = ?, updated_at = ?, published_at = ?
      WHERE id = ?`,
  ).bind(
    slug, title, summary, body, heroImageId, heroAlt,
    status, stamp, publishedAt, post.id,
  ).run();

  return json({ post: await load(env, post.id) });
}

export async function onRequestDelete({ env, data, params }) {
  const { user } = data;
  const post = await load(env, String(params.id));
  if (!post) return json({ error: 'That post no longer exists.' }, 404);
  if (!canEditPost(user, post)) return json({ error: 'That is not your post.' }, 403);

  // Taking something off the public site is an editor's call.
  if (post.status === 'published' && !canPublish(user)) {
    return json({ error: 'This post is live. Ask an editor to take it down.' }, 403);
  }

  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(post.id).run();
  return json({ deleted: post.id });
}
