/* Public blog pages, feed and sitemap, against a stubbed database. */
const ROOT = new URL('../functions/', import.meta.url).pathname;

const POSTS = [{
  id: 'p1', slug: 'groundbreaking-day', title: 'Groundbreaking day at the Community Center',
  summary: 'Volunteers turned the first dirt on Saturday.',
  body: '## A good turnout\n\nWe had **forty people** out at the park. See the [events page](/events).\n\n- Coffee at 8\n- Dirt at 9\n\n![Volunteers with shovels](/media/img1)',
  hero_image_id: 'img1', hero_alt: 'Volunteers turning the first dirt', status: 'published',
  author_email: 'jo@example.com', author_name: 'Jo', created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-02T12:00:00Z', published_at: '2026-09-01T15:00:00Z',
}];

// Minimal D1 stub: enough to answer the queries these pages actually make.
const DB = {
  prepare(sql) {
    const q = { sql, args: [] };
    q.bind = (...a) => { q.args = a; return q; };
    q.first = async () => {
      if (/COUNT\(\*\)/.test(sql)) return { n: POSTS.length };
      if (/FROM posts WHERE slug/.test(sql)) return POSTS.find((p) => p.slug === q.args[0]) || null;
      return null;
    };
    q.all = async () => ({ results: POSTS });
    return q;
  },
};

const env = { DB, SITE_ORIGIN: 'https://falknermsheritage.com', ASSETS: { fetch: async () => new Response('<urlset>\n</urlset>') } };

function req(path) { return new Request(`https://falknermsheritage.com${path}`); }

const checks = [];
function expect(label, cond, detail) { checks.push({ label, ok: !!cond, detail }); }

const index = await import(`${ROOT}blog/index.js`);
const r1 = await index.onRequestGet({ request: req('/blog'), env });
const h1 = await r1.text();
expect('index 200', r1.status === 200);
expect('index has nav News', h1.includes('<li><a href="/blog" aria-current="page">News</a></li>'));
expect('index shows post', h1.includes('Groundbreaking day at the Community Center'));
expect('index hero img', h1.includes('src="/media/img1"'));
expect('index canonical', h1.includes('<link rel="canonical" href="https://falknermsheritage.com/blog">'));
expect('index single doctype', (h1.match(/<!DOCTYPE/gi) || []).length === 1);
expect('index tags balanced', (h1.match(/<div/g) || []).length === (h1.match(/<\/div>/g) || []).length,
  `${(h1.match(/<div/g) || []).length} open vs ${(h1.match(/<\/div>/g) || []).length} close`);
expect('index section balanced', (h1.match(/<section/g) || []).length === (h1.match(/<\/section>/g) || []).length);

const post = await import(`${ROOT}blog/[slug].js`);
const r2 = await post.onRequestGet({ request: req('/blog/groundbreaking-day'), env, params: { slug: 'groundbreaking-day' } });
const h2 = await r2.text();
expect('post 200', r2.status === 200);
expect('post h1', h2.includes('<h1>Groundbreaking day at the Community Center</h1>'));
expect('post body rendered', h2.includes('<strong>forty people</strong>'));
expect('post list rendered', h2.includes('<li>Coffee at 8</li>'));
expect('post inline figure', h2.includes('<figcaption>Volunteers with shovels</figcaption>'));
expect('post og:type article', h2.includes('<meta property="og:type" content="article">'));
expect('post og:image absolute', h2.includes('content="https://falknermsheritage.com/media/img1"'));
expect('post jsonld BlogPosting', h2.includes('"@type": "BlogPosting"'));
expect('post indexable', h2.includes('content="index, follow'));
expect('post div balanced', (h2.match(/<div/g) || []).length === (h2.match(/<\/div>/g) || []).length);
expect('post section balanced', (h2.match(/<section/g) || []).length === (h2.match(/<\/section>/g) || []).length);

// A draft must be invisible to the public.
POSTS[0].status = 'draft';
const r3 = await post.onRequestGet({ request: req('/blog/groundbreaking-day'), env, params: { slug: 'groundbreaking-day' } });
expect('draft is 404 to public', r3.status === 404, `got ${r3.status}`);
POSTS[0].status = 'published';

const feed = await import(`${ROOT}blog/feed.xml.js`);
const r4 = await feed.onRequestGet({ request: req('/blog/feed.xml'), env });
const x4 = await r4.text();
expect('feed 200', r4.status === 200);
expect('feed has item', x4.includes('<guid isPermaLink="true">https://falknermsheritage.com/blog/groundbreaking-day</guid>'));
expect('feed xml decl first', x4.startsWith('<?xml'));

const sm = await import(`${ROOT}sitemap.xml.js`);
const r5 = await sm.onRequestGet({ request: req('/sitemap.xml'), env });
const x5 = await r5.text();
expect('sitemap has blog', x5.includes('<loc>https://falknermsheritage.com/blog</loc>'));
expect('sitemap has post', x5.includes('<loc>https://falknermsheritage.com/blog/groundbreaking-day</loc>'));
expect('sitemap closes once', (x5.match(/<\/urlset>/g) || []).length === 1);

let bad = 0;
for (const c of checks) {
  if (!c.ok) { bad++; console.log(`FAIL  ${c.label}${c.detail ? '  (' + c.detail + ')' : ''}`); }
  else console.log(`ok    ${c.label}`);
}
console.log(bad ? `\n${bad} of ${checks.length} failed` : `\nAll ${checks.length} render checks passed`);
process.exit(bad ? 1 : 0);
