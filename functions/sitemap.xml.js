/* GET /sitemap.xml
 *
 * The hand-maintained sitemap.xml in the repository stays authoritative for
 * the static pages. This reads it and splices the published blog posts in
 * before the closing tag, so nobody has to remember to update it. */

import { siteOrigin, dateOnly } from './_lib/render.js';
import { escapeHtml } from './_lib/markdown.js';

export async function onRequestGet({ request, env }) {
  const origin = siteOrigin(env, request);

  // env.ASSETS bypasses Functions routing and reads the static file directly.
  const asset = await env.ASSETS.fetch(new URL('/sitemap.xml', request.url));
  let xml = await asset.text();

  if (env.DB) {
    const { results } = await env.DB.prepare(
      `SELECT slug, published_at, updated_at FROM posts
        WHERE status = 'published' ORDER BY published_at DESC LIMIT 2000`,
    ).all();

    const extra = [
      `
  <url>
    <loc>${origin}/blog</loc>
    <lastmod>${dateOnly(results[0]?.published_at) || new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ...results.map((post) => `
  <url>
    <loc>${origin}/blog/${escapeHtml(post.slug)}</loc>
    <lastmod>${dateOnly(post.updated_at || post.published_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`),
    ].join('');

    xml = xml.replace('</urlset>', `${extra}\n\n</urlset>`);
  }

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
