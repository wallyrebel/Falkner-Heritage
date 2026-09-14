/* The site's furniture, rebuilt for server-rendered pages.
 *
 * This mirrors the header and footer in the static .html files. Blog pages
 * live at /blog/<slug>, one level deep, so every link and asset path here is
 * root-relative rather than the relative form the flat pages use.
 */

import { escapeHtml } from './markdown.js';

export const MARK_SVG = `<svg class="mark" viewBox="0 0 48 48" role="img" aria-label="Falkner Heritage Museum">
        <g>
          <path class="mark-building" d="M24 4.5 46.5 21.5 1.5 21.5Z"/>
          <rect class="mark-building" x="9" y="21.5" width="30" height="19"/>
          <rect class="mark-accent" x="12.5" y="25.5" width="6" height="7.5" rx="1"/>
          <rect class="mark-accent" x="29.5" y="25.5" width="6" height="7.5" rx="1"/>
          <rect class="mark-accent" x="21" y="29" width="6" height="11.5" rx="1"/>
          <rect class="mark-accent" x="1.5" y="42.5" width="45" height="3.5" rx="1"/>
        </g>
      </svg>`;

const NAV = [
  ['/', 'Home'],
  ['/history', 'Falkner History'],
  ['/schoolhouse', 'Cooper Hill School'],
  ['/community-center', 'Community Center'],
  ['/events', 'Events'],
  ['/blog', 'News'],
  ['/visit', 'Visit'],
];

export function siteOrigin(env, request) {
  const configured = String(env.SITE_ORIGIN || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return new URL(request.url).origin;
}

function header(current) {
  const items = NAV.map(([href, label]) => {
    const active = href === current ? ' aria-current="page"' : '';
    return `        <li><a href="${href}"${active}>${label}</a></li>`;
  }).join('\n');

  return `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      ${MARK_SVG}
      <span class="brand-text">
        <span class="brand-name">Falkner Heritage</span>
        <span class="brand-sub">Museum &amp; Park &middot; Falkner, Mississippi</span>
      </span>
    </a>

    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="bars"><span></span></span> Menu
    </button>

    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>
${items}
        <li class="nav-cta"><a href="/support">Donate</a></li>
      </ul>
    </nav>
  </div>
</header>`;
}

const FOOTER = `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        ${MARK_SVG.replace('role="img" aria-label="Falkner Heritage Museum"', 'aria-hidden="true"')}
        <p><strong>Falkner Heritage Museum Project</strong><br>A Mississippi non-profit organization, founded 2016.</p>
        <p class="footer-tagline">&ldquo;Preserving the past for Falkner&rsquo;s future generations.&rdquo;</p>
      </div>
      <div>
        <h4>Visit</h4>
        <address class="addr footer-list">
          10161 CR 200<br>
          Falkner, Mississippi 38629<br>
          <span style="color:rgba(250,246,238,.55)">Just off Hwy 15, behind City Hall</span>
        </address>
      </div>
      <div>
        <h4>Contact</h4>
        <ul class="footer-list">
          <li>Museum &amp; events<br><a href="tel:+16625874067">662-587-4067</a></li>
          <li>Community Center plans<br><a href="tel:+16625128048">662-512-8048</a></li>
          <li>Donations<br>PO Box 113, Falkner, MS 38629</li>
        </ul>
      </div>
      <div>
        <h4>Explore</h4>
        <ul class="footer-list">
          <li><a href="/history">Falkner History</a></li>
          <li><a href="/schoolhouse">Cooper Hill School</a></li>
          <li><a href="/community-center">Community Center</a></li>
          <li><a href="/events">Upcoming Events</a></li>
          <li><a href="/blog">News &amp; Stories</a></li>
          <li><a href="/visit">Visit &amp; Directions</a></li>
          <li><a href="/support">Donate &amp; Volunteer</a></li>
          <li style="margin-top:1rem">
            <a class="fb-link" href="https://www.facebook.com/groups/1320477038065060" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              Facebook Group
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span id="year">2026</span> Falkner Heritage Museum Project. All rights reserved.</span>
      <span>Falkner, Mississippi &mdash; North Tippah County</span>
    </div>
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>`;

export function layout(options) {
  const {
    title,
    description,
    canonical,
    origin,
    ogImage,
    ogImageAlt = 'Falkner Heritage Museum Project, Falkner, Mississippi.',
    ogType = 'website',
    jsonLd = null,
    navCurrent = '/blog',
    robots = 'index, follow, max-image-preview:large, max-snippet:-1',
    main,
    extraHead = '',
  } = options;

  const image = ogImage || `${origin}/assets/img/og-falkner-heritage.jpg`;
  const jsonLdBlock = jsonLd
    ? `\n<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="robots" content="${escapeHtml(robots)}">
<meta name="author" content="Falkner Heritage Museum Project">
<meta name="geo.region" content="US-MS">
<meta name="geo.placename" content="Falkner, Tippah County, Mississippi">

<meta property="og:type" content="${escapeHtml(ogType)}">
<meta property="og:site_name" content="Falkner MS Heritage">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<meta name="theme-color" content="#8e3129">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="Falkner Heritage news" href="${origin}/blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">${jsonLdBlock}${extraHead}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

${header(navCurrent)}

<main id="main">
${main}
</main>

${FOOTER}
</body>
</html>`;
}

export function htmlResponse(body, status = 200, cache = 'public, max-age=0, must-revalidate') {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cache,
    },
  });
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago',
  });
}

export function dateOnly(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
