/* The same gate in front of the /admin page itself.
 *
 * On the real domain Cloudflare Access shows its own sign-in screen long
 * before a request gets here, so this is the backstop for any hostname the
 * Access policy does not cover. */

import { verifyAccess, accessConfig } from '../_lib/access.js';
import { escapeHtml } from '../_lib/markdown.js';

function notice(title, message, status) {
  const body = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/css/site.css">
</head><body>
<section class="section"><div class="wrap wrap--narrow">
<span class="kicker">Falkner Heritage</span>
<h1>${escapeHtml(title)}</h1>
<p class="lede">${message}</p>
<p><a class="btn btn--ghost" href="/">Back to the website</a></p>
</div></section>
</body></html>`;
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;

  if (!accessConfig(env).configured) {
    return notice(
      'Not set up yet',
      'Sign-in for the blog editor has not been configured. The setup steps are in <code>docs/BLOG-SETUP.md</code>.',
      503,
    );
  }

  let identity;
  try {
    identity = await verifyAccess(request, env);
  } catch (err) {
    return notice('Not set up yet', escapeHtml(err.message), 503);
  }

  if (!identity) {
    const site = String(env.SITE_ORIGIN || 'https://falknermsheritage.com').replace(/\/+$/, '');
    return notice(
      'Please sign in',
      `Open <a href="${escapeHtml(site)}/admin">${escapeHtml(site)}/admin</a> and sign in with your email address.`,
      401,
    );
  }

  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, headers });
}
