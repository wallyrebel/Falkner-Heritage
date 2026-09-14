/* Every /api request must carry a valid Cloudflare Access token.
 *
 * Access already gates these paths at the edge on the real domain. Verifying
 * the token here too means the API stays shut even when reached by a route
 * the Access policy does not cover, such as a *.pages.dev preview URL.
 *
 * If Access is not configured, this fails CLOSED rather than open. */

import { verifyAccess, accessConfig } from '../_lib/access.js';
import { resolveUser, json } from '../_lib/db.js';

export async function onRequest(context) {
  const { request, env, next, data } = context;

  if (!env.DB) {
    return json({ error: 'The blog database is not connected yet. See docs/BLOG-SETUP.md.' }, 503);
  }
  if (!accessConfig(env).configured) {
    return json({ error: 'Sign-in is not configured yet. See docs/BLOG-SETUP.md.' }, 503);
  }

  let identity;
  try {
    identity = await verifyAccess(request, env);
  } catch (err) {
    return json({ error: `Sign-in check failed: ${err.message}` }, 503);
  }
  if (!identity) return json({ error: 'Not signed in.' }, 401);

  data.user = await resolveUser(env.DB, env, identity);
  return next();
}
