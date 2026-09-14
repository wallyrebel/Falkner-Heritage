/* GET /blog — the published posts, newest first. */

import { layout, htmlResponse, siteOrigin, formatDate } from '../_lib/render.js';
import { escapeHtml, toPlainText } from '../_lib/markdown.js';
import { notConfigured } from '../_lib/viewer.js';

const PER_PAGE = 12;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return notConfigured('The news section');

  const url = new URL(request.url);
  const origin = siteOrigin(env, request);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [{ results }, countRow] = await Promise.all([
    env.DB.prepare(
      `SELECT slug, title, summary, body, hero_image_id, hero_alt, author_name, published_at
         FROM posts
        WHERE status = 'published'
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?`,
    ).bind(PER_PAGE, offset).all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'").first(),
  ]);

  const total = Number(countRow?.n || 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const cards = results.map((post) => {
    const summary = post.summary?.trim() || toPlainText(post.body, 180);
    const media = post.hero_image_id
      ? `<div class="card-media"><img src="/media/${escapeHtml(post.hero_image_id)}" alt="${escapeHtml(post.hero_alt)}" loading="lazy" decoding="async" width="800" height="600"></div>`
      : '';
    const byline = [formatDate(post.published_at), post.author_name].filter(Boolean).join(' &middot; ');
    return `        <article class="card reveal">
          ${media}
          <div class="card-body">
            <span class="kicker">${byline}</span>
            <h3><a href="/blog/${escapeHtml(post.slug)}" style="color:inherit;text-decoration:none">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(summary)}</p>
            <a class="card-link" href="/blog/${escapeHtml(post.slug)}">Read more</a>
          </div>
        </article>`;
  }).join('\n');

  const empty = `        <p class="lede">There are no posts here yet. Check back soon &mdash; or follow along on
          <a href="https://www.facebook.com/groups/1320477038065060" target="_blank" rel="noopener">our Facebook group</a>.</p>`;

  const older = page < pages
    ? `<a class="btn btn--ghost" href="/blog?page=${page + 1}">Older posts</a>` : '';
  const newer = page > 1
    ? `<a class="btn btn--ghost" href="${page - 1 === 1 ? '/blog' : `/blog?page=${page - 1}`}">Newer posts</a>` : '';
  const pager = (older || newer)
    ? `\n      <div class="btn-row" style="margin-top:3rem">${newer}${older}</div>` : '';

  const canonical = page === 1 ? `${origin}/blog` : `${origin}/blog?page=${page}`;

  const main = `
  <section class="banner">
    <img class="banner-img" src="/assets/img/museum-display.jpg" alt="" aria-hidden="true">
    <div class="banner-body">
      <div class="wrap">
        <div class="rail" aria-hidden="true"></div>
        <span class="kicker">News &amp; stories</span>
        <h1>From the Museum.</h1>
        <p class="lede">Updates from Falkner Heritage Park &mdash; progress on the Community Center,
          what turns up in the collection, and the stories people bring us.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="grid grid--3">
${results.length ? cards : empty}
      </div>${pager}
    </div>
  </section>`;

  const body = layout({
    title: page === 1
      ? 'News & Stories | Falkner MS Heritage'
      : `News & Stories, page ${page} | Falkner MS Heritage`,
    description: 'News from the Falkner Heritage Museum Project in Falkner, Mississippi — Community Center progress, museum collection finds, and stories from North Tippah County.',
    canonical,
    origin,
    navCurrent: '/blog',
    robots: page === 1 ? 'index, follow, max-image-preview:large, max-snippet:-1' : 'noindex, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Falkner Heritage News',
      url: `${origin}/blog`,
      publisher: {
        '@type': 'Organization',
        name: 'Falkner Heritage Museum Project',
        url: origin,
      },
    },
    main,
  });

  return htmlResponse(body);
}
