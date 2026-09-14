/* GET /api/users  — everyone who has signed in (owners only).
 * PUT /api/users  — change somebody's role (owners only). */

import {
  json, ROLES, canManageUsers, bootstrapOwners,
} from '../_lib/db.js';

export async function onRequestGet({ env, data }) {
  if (!canManageUsers(data.user)) {
    return json({ error: 'Only an owner can see the people list.' }, 403);
  }

  const { results } = await env.DB.prepare(
    'SELECT email, name, role, created_at, last_seen FROM users ORDER BY created_at ASC',
  ).all();

  const owners = bootstrapOwners(env);
  const people = results.map((person) => ({
    ...person,
    role: owners.includes(person.email) ? 'owner' : person.role,
    locked: owners.includes(person.email),   // set in OWNER_EMAILS, cannot be demoted here
  }));

  return json({ users: people });
}

export async function onRequestPut({ request, env, data }) {
  const { user } = data;
  if (!canManageUsers(user)) {
    return json({ error: 'Only an owner can change what people may do.' }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Could not read that request.' }, 400);
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const role = String(payload.role || '').trim();

  if (!email) return json({ error: 'Which person?' }, 400);
  if (!ROLES.includes(role)) return json({ error: 'Unknown role.' }, 400);

  if (email === user.email && role !== 'owner') {
    return json({ error: 'You cannot remove your own owner access.' }, 400);
  }
  if (bootstrapOwners(env).includes(email) && role !== 'owner') {
    return json({
      error: 'That address is listed in the site settings as an owner. Remove it from OWNER_EMAILS in Cloudflare first.',
    }, 400);
  }

  const existing = await env.DB.prepare('SELECT email FROM users WHERE email = ?')
    .bind(email).first();
  if (!existing) return json({ error: 'That person has not signed in yet.' }, 404);

  await env.DB.prepare('UPDATE users SET role = ? WHERE email = ?').bind(role, email).run();
  return json({ email, role });
}
