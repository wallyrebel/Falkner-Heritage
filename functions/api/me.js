/* GET /api/me — who is signed in and what they are allowed to do. */

import { json, canPublish, canManageUsers } from '../_lib/db.js';

export async function onRequestGet({ data }) {
  const { user } = data;
  return json({
    email: user.email,
    name: user.name,
    role: user.role,
    canPublish: canPublish(user),
    canManageUsers: canManageUsers(user),
  });
}
