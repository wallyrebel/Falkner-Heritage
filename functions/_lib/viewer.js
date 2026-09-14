/* Who, if anyone, is signed in — used so a contributor can preview their own
 * post before it is public. Never throws: a public reader simply has no
 * viewer, and the blog must keep working even if Access is unconfigured. */

import { verifyAccess } from './access.js';
import { resolveUser } from './db.js';

export async function optionalViewer(request, env) {
  if (!env.DB) return null;
  try {
    const identity = await verifyAccess(request, env);
    if (!identity) return null;
    return await resolveUser(env.DB, env, identity);
  } catch {
    return null;
  }
}

export function notConfigured(what) {
  return new Response(
    `${what} is not configured yet. See docs/BLOG-SETUP.md.`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    },
  );
}
