/* GET /blog/<slug> — one post.
 *
 * A post that is not yet published returns 404 to the public, but is shown to
 * its author (and to any editor) with a draft notice, so contributors can see
 * exactly how their post will look before it goes live. */

import { layout, htmlResponse, siteOrigin, formatDate, dateOnly } from '../_lib/render.js';
import { escapeHtml, renderMarkdown, toPlainText } from '../_lib/markdown.js';
import { optionalViewer, notConfigured } from '../_lib/viewer.js';
import { canEditPost } from '../_lib/db.js';

async function notFound(request, env) {
  try {
    const page = await env.ASSETS.fetch(new URL('/404.html', request.url));
    return new Response(page.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) return notConfigured('The news section');

  const slug = String(params.slug || '').toLowerCase();
  const post = await env.DB.prepare(
    `SELECT id, slug, title, summary, body, hero_image_id, hero_alt, status,
            author_email, author_name, published_at, updated_at
       FROM posts WHERE slug = ?`,
  ).bind(slug).first();

  if (!post) return notFound(request, env);

  let draftNotice = '';
  if (post.status !== 'published') {
    const viewer = await optionalViewer(request, env);
    if (!viewer || !canEditPost(viewer, post)) return notFound(request, env);
    draftNotice = `
      <div class="wrap wrap--narrow">
        <p class="note" style="margin-bottom:0"><strong>This is a preview.</strong>
          The post is ${post.status === 'review' ? 'waiting to be approved' : 'still a draft'} and is not on the public site.
          <a href="/admin">Back to the editor</a>.</p>
      </div>`;
  }

  const origin = siteOrigin(env, request);
  const canonical = `${origin}/blog/${post.slug}`;
  const description = post.summary?.trim() || toPlainText(post.body, 300);
  const heroUrl = post.hero_image_id ? `${origin}/media/${post.hero_image_id}` : null;

  const hero = post.hero_image_id
    ? `
  <section class="section section--tight" style="padding-top:0">
    <div class="wrap">
      <figure class="figure" style="margin:0">
        <img src="/media/${escapeHtml(post.hero_image_id)}" alt="${escapeHtml(post.hero_alt)}" width="1600" height="1067" decoding="async">
        ${post.hero_alt ? `<figcaption>${escapeHtml(post.hero_alt)}</figcaption>` : ''}
      </figure>
    </div>
  </section>` : '';

  const byline = [formatDate(post.published_at || post.updated_at), post.author_name]
    .filter(Boolean).join(' &middot; ');

  const main = `
  <section class="banner banner--plain">
    <div class="banner-body">
      <div class="wrap wrap--narrow">
        <div class="rail" aria-hidden="true"></div>
        <span class="kicker">${byline}</span>
        <h1>${escapeHtml(post.title)}</h1>
        ${post.summary?.trim() ? `<p class="lede">${escapeHtml(post.summary.trim())}</p>` : ''}
      </div>
    </div>
  </section>
${draftNotice}${hero}
  <section class="section${post.hero_image_id ? ' section--tight' : ''}"${post.hero_image_id ? ' style="padding-top:0"' : ''}>
    <div class="wrap wrap--narrow">
      <article class="prose">
${renderMarkdown(post.body)}
      </article>

      <p style="margin-top:3.5rem"><a class="btn btn--ghost" href="/blog">&larr; All news</a></p>
    </div>
  </section>

  <section class="section section--paper2 section--tight">
    <div class="wrap wrap--narrow" style="text-align:center">
      <h2>Help us keep building.</h2>
      <p class="lede">Every dollar goes into the Museum and the Community Center here in Falkner.</p>
      <p class="btn-row" style="justify-content:center"><a class="btn" href="/support">Donate or volunteer</a></p>
    </div>
  </section>`;

  const body = layout({
    title: `${post.title} | Falkner MS Heritage`,
    description,
    canonical,
    origin,
    ogType: 'article',
    ogImage: heroUrl || undefined,
    ogImageAlt: post.hero_alt || 'Falkner Heritage Museum Project, Falkner, Mississippi.',
    navCurrent: '/blog',
    robots: post.status === 'published'
      ? 'index, follow, max-image-preview:large, max-snippet:-1'
      : 'noindex, nofollow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      datePublished: dateOnly(post.published_at),
      dateModified: dateOnly(post.updated_at),
      ...(heroUrl ? { image: heroUrl } : {}),
      ...(post.author_name ? { author: { '@type': 'Person', name: post.author_name } } : {}),
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      publisher: {
        '@type': 'Organization',
        name: 'Falkner Heritage Museum Project',
        url: origin,
      },
    },
    main,
  });

  return htmlResponse(
    body,
    200,
    post.status === 'published' ? 'public, max-age=0, must-revalidate' : 'no-store',
  );
}
