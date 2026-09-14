/* GET /blog/feed.xml — RSS for the published posts. */

import { siteOrigin } from '../_lib/render.js';
import { escapeHtml, toPlainText } from '../_lib/markdown.js';
import { notConfigured } from '../_lib/viewer.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return notConfigured('The news feed');

  const origin = siteOrigin(env, request);
  const { results } = await env.DB.prepare(
    `SELECT slug, title, summary, body, author_name, published_at
       FROM posts WHERE status = 'published'
      ORDER BY published_at DESC LIMIT 30`,
  ).all();

  const items = results.map((post) => {
    const link = `${origin}/blog/${post.slug}`;
    const description = post.summary?.trim() || toPlainText(post.body, 400);
    const pubDate = post.published_at
      ? new Date(post.published_at).toUTCString()
      : new Date().toUTCString();
    return `  <item>
    <title>${escapeHtml(post.title)}</title>
    <link>${escapeHtml(link)}</link>
    <guid isPermaLink="true">${escapeHtml(link)}</guid>
    <pubDate>${pubDate}</pubDate>
    ${post.author_name ? `<dc:creator>${escapeHtml(post.author_name)}</dc:creator>` : ''}
    <description>${escapeHtml(description)}</description>
  </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Falkner Heritage — News &amp; Stories</title>
  <link>${origin}/blog</link>
  <atom:link href="${origin}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>News from the Falkner Heritage Museum Project in Falkner, Mississippi.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
