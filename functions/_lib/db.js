/* Shared database helpers and the role model. */

export const ROLES = ['author', 'editor', 'owner'];

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function bootstrapOwners(env) {
  return String(env.OWNER_EMAILS || '')
    .split(/[,\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/* Look the signed-in person up, creating their row the first time they appear.
 * Anyone named in OWNER_EMAILS is an owner regardless of what the table says,
 * so you can never lock yourself out of your own site. */
export async function resolveUser(db, env, identity) {
  const owners = bootstrapOwners(env);
  const isBootstrapOwner = owners.includes(identity.email);

  const existing = await db
    .prepare('SELECT email, name, role FROM users WHERE email = ?')
    .bind(identity.email)
    .first();

  if (!existing) {
    const role = isBootstrapOwner ? 'owner' : 'author';
    const stamp = nowIso();
    await db
      .prepare('INSERT INTO users (email, name, role, created_at, last_seen) VALUES (?, ?, ?, ?, ?)')
      .bind(identity.email, identity.name || '', role, stamp, stamp)
      .run();
    return { email: identity.email, name: identity.name || '', role };
  }

  await db
    .prepare('UPDATE users SET last_seen = ?, name = COALESCE(NULLIF(?, \'\'), name) WHERE email = ?')
    .bind(nowIso(), identity.name || '', identity.email)
    .run();

  return {
    email: existing.email,
    name: identity.name || existing.name || '',
    role: isBootstrapOwner ? 'owner' : existing.role,
  };
}

export function canPublish(user) {
  return user.role === 'editor' || user.role === 'owner';
}

export function canManageUsers(user) {
  return user.role === 'owner';
}

/* Authors may only touch their own work; editors and owners may touch anything. */
export function canEditPost(user, post) {
  if (!post) return false;
  if (canPublish(user)) return true;
  return post.author_email === user.email;
}

export function slugify(input) {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
  return base || `post-${newId().slice(0, 8)}`;
}

export async function uniqueSlug(db, desired, ignoreId = null) {
  const base = slugify(desired);
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    // eslint-disable-next-line no-await-in-loop
    const clash = await db
      .prepare('SELECT id FROM posts WHERE slug = ? AND id IS NOT ?')
      .bind(candidate, ignoreId)
      .first();
    if (!clash) return candidate;
  }
  return `${base}-${newId().slice(0, 6)}`;
}
