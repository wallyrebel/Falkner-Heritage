/* Who is allowed to do what. */
const ROOT = new URL('../functions/', import.meta.url).pathname;

function makeDb(posts, images = [{ id: 'img1' }]) {
  return {
    prepare(sql) {
      const q = { sql, args: [] };
      q.bind = (...a) => { q.args = a; return q; };
      q.first = async () => {
        if (/FROM posts WHERE id/.test(sql)) return posts.find((p) => p.id === q.args[0]) || null;
        if (/FROM images WHERE id/.test(sql)) return images.find((i) => i.id === q.args[0]) || null;
        if (/FROM posts WHERE slug/.test(sql)) return null;   // slug always free
        return null;
      };
      q.all = async () => ({ results: posts });
      q.run = async () => {
        if (/^UPDATE posts/.test(sql.trim())) {
          const p = posts.find((x) => x.id === q.args[q.args.length - 1]);
          if (p) { [p.slug, p.title, p.summary, p.body, p.hero_image_id, p.hero_alt, p.status, p.updated_at, p.published_at] = q.args; }
        }
        if (/^DELETE FROM posts/.test(sql.trim())) {
          const i = posts.findIndex((x) => x.id === q.args[0]); if (i >= 0) posts.splice(i, 1);
        }
        return { success: true };
      };
      return q;
    },
  };
}

const basePost = () => ({
  id: 'p1', slug: 'a-post', title: 'A post', summary: '', body: 'Some words here.',
  hero_image_id: null, hero_alt: '', status: 'draft',
  author_email: 'jo@example.com', author_name: 'Jo',
  created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', published_at: null,
});

const AUTHOR = { email: 'jo@example.com', name: 'Jo', role: 'author' };
const OTHER  = { email: 'sam@example.com', name: 'Sam', role: 'author' };
const EDITOR = { email: 'pat@example.com', name: 'Pat', role: 'editor' };

const detail = await import(`${ROOT}api/posts/[id].js`);

function putReq(body) {
  return new Request('https://x/api/posts/p1', { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

const checks = [];
const expect = (label, ok, d) => checks.push({ label, ok: !!ok, detail: d });

// 1. An author may not publish.
{
  const posts = [basePost()];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'Some words.', status: 'published' }), env: { DB: makeDb(posts) }, data: { user: AUTHOR }, params: { id: 'p1' } });
  expect('author cannot publish', res.status === 403, `got ${res.status}`);
  expect('author post stays draft', posts[0].status === 'draft', posts[0].status);
}

// 2. An author may not touch someone else's post.
{
  const posts = [basePost()];
  const res = await detail.onRequestPut({ request: putReq({ title: 'Hijacked', body: 'x' }), env: { DB: makeDb(posts) }, data: { user: OTHER }, params: { id: 'p1' } });
  expect('author cannot edit others', res.status === 403, `got ${res.status}`);
  expect('other post untouched', posts[0].title === 'A post');
}

// 3. An author may submit for review.
{
  const posts = [basePost()];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'Some words.', status: 'review' }), env: { DB: makeDb(posts) }, data: { user: AUTHOR }, params: { id: 'p1' } });
  expect('author can send for review', res.status === 200 && posts[0].status === 'review', `${res.status}/${posts[0].status}`);
}

// 4. An editor may publish.
{
  const posts = [basePost()];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'Some words.', status: 'published' }), env: { DB: makeDb(posts) }, data: { user: EDITOR }, params: { id: 'p1' } });
  expect('editor can publish', res.status === 200 && posts[0].status === 'published', `${res.status}/${posts[0].status}`);
  expect('published_at stamped', !!posts[0].published_at);
}

// 5. The author can still edit it after it is live, and it stays live.
{
  const posts = [{ ...basePost(), status: 'published', published_at: '2026-09-02T00:00:00Z' }];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'Corrected text.', status: 'published' }), env: { DB: makeDb(posts) }, data: { user: AUTHOR }, params: { id: 'p1' } });
  expect('author edits own live post', res.status === 200 && posts[0].body === 'Corrected text.', `${res.status}`);
  expect('stays published', posts[0].status === 'published');
  expect('published_at unchanged', posts[0].published_at === '2026-09-02T00:00:00Z', posts[0].published_at);
}

// 6. The address is frozen once a post has been public.
{
  const posts = [{ ...basePost(), status: 'published', published_at: '2026-09-02T00:00:00Z' }];
  await detail.onRequestPut({ request: putReq({ title: 'A completely different headline', body: 'x', status: 'published' }), env: { DB: makeDb(posts) }, data: { user: EDITOR }, params: { id: 'p1' } });
  expect('slug frozen after publish', posts[0].slug === 'a-post', posts[0].slug);
}

// 7. An author may not delete a live post.
{
  const posts = [{ ...basePost(), status: 'published' }];
  const res = await detail.onRequestDelete({ env: { DB: makeDb(posts) }, data: { user: AUTHOR }, params: { id: 'p1' } });
  expect('author cannot delete live post', res.status === 403 && posts.length === 1, `got ${res.status}`);
}

// 8. Publishing requires alt text when there is a photograph.
{
  const posts = [basePost()];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'Words.', hero_image_id: 'img1', hero_alt: '', status: 'published' }), env: { DB: makeDb(posts) }, data: { user: EDITOR }, params: { id: 'p1' } });
  expect('alt text required to publish', res.status === 400, `got ${res.status}`);
}

// 9. Unknown status is refused.
{
  const posts = [basePost()];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'x', status: 'archived' }), env: { DB: makeDb(posts) }, data: { user: EDITOR }, params: { id: 'p1' } });
  expect('unknown status refused', res.status === 400, `got ${res.status}`);
}

// 10. The API middleware: no token, and unconfigured.
{
  const mw = await import(`${ROOT}api/_middleware.js`);
  const env = { DB: makeDb([]), ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'abc123' };
  const r = await mw.onRequest({ request: new Request('https://x/api/posts'), env, data: {}, next: async () => new Response('leaked') });
  expect('no token -> 401', r.status === 401, `got ${r.status}`);
  expect('no token -> nothing leaked', !(await r.text()).includes('leaked'));

  const r2 = await mw.onRequest({ request: new Request('https://x/api/posts'), env: { DB: makeDb([]) }, data: {}, next: async () => new Response('leaked') });
  expect('unconfigured -> fails closed', r2.status === 503, `got ${r2.status}`);
  expect('unconfigured -> nothing leaked', !(await r2.text()).includes('leaked'));
}

// 11. Owner-only user management.
{
  const users = await import(`${ROOT}api/users.js`);
  const r = await users.onRequestGet({ env: { DB: makeDb([]) }, data: { user: EDITOR } });
  expect('editor cannot list people', r.status === 403, `got ${r.status}`);
  const r2 = await users.onRequestPut({ request: new Request('https://x/api/users', { method: 'PUT', body: '{"email":"a@b.c","role":"owner"}' }), env: { DB: makeDb([]) }, data: { user: AUTHOR } });
  expect('author cannot grant roles', r2.status === 403, `got ${r2.status}`);
}

// 12. An author may not quietly unpublish their own live post.
{
  const posts = [{ ...basePost(), status: 'published', published_at: '2026-09-02T00:00:00Z' }];
  const res = await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'x', status: 'draft' }), env: { DB: makeDb(posts) }, data: { user: AUTHOR }, params: { id: 'p1' } });
  expect('author cannot unpublish', res.status === 200 && posts[0].status === 'published', `${res.status}/${posts[0].status}`);
}

// 13. An editor may unpublish.
{
  const posts = [{ ...basePost(), status: 'published', published_at: '2026-09-02T00:00:00Z' }];
  await detail.onRequestPut({ request: putReq({ title: 'A post', body: 'x', status: 'draft' }), env: { DB: makeDb(posts) }, data: { user: EDITOR }, params: { id: 'p1' } });
  expect('editor can unpublish', posts[0].status === 'draft', posts[0].status);
}

let bad = 0;
for (const c of checks) {
  if (!c.ok) { bad++; console.log(`FAIL  ${c.label}${c.detail ? '  (' + c.detail + ')' : ''}`); }
  else console.log(`ok    ${c.label}`);
}
console.log(bad ? `\n${bad} of ${checks.length} failed` : `\nAll ${checks.length} permission checks passed`);
process.exit(bad ? 1 : 0);
