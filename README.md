# Falkner MS Heritage — falknermsheritage.com

The website of the **Falkner Heritage Museum Project**, a Mississippi non-profit organization
founded in 2016 in Falkner, Tippah County, Mississippi.

> "Preserving the past for Falkner's future generations."

10161 CR 200, Falkner, Mississippi 38629 — just off Highway 15, on CR 200 behind City Hall.

---

## What this is

A static, dependency-free website. Plain HTML, one stylesheet, one small JavaScript file.
No build step, no framework, no package manager. Anyone who can edit a text file can edit
this site.

### Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home — mission, what's at the park, events CTA, donation call |
| `history.html` | The history of Falkner, Mississippi, with a dated timeline |
| `schoolhouse.html` | The Cooper Hill School House — its founder, buildings, students and teachers |
| `community-center.html` | The Community Center project, its phases, and the call for Phase 2 estimates |
| `events.html` | Upcoming events and fundraising — the Founder's Day Car & Jeep Show, the Heirloom Quilt Expo |
| `visit.html` | Address, directions, map, what to see, contact |
| `/blog` | News & stories — written in the browser, not in this repository |
| `/admin` | The private editor contributors sign in to |
| `support.html` | Donating, volunteering, dedicating a bench, bidding on Phase 2 |
| `404.html` | Not-found page (served automatically by Cloudflare Pages) |

### Supporting files

| File | Purpose |
| --- | --- |
| `assets/css/site.css` | The entire design system — colours, type, components |
| `assets/js/site.js` | Mobile menu and reveal-on-scroll. The site works without it |
| `assets/img/` | Web-optimised photographs and the site mark |
| `sitemap.xml`, `robots.txt` | Search engine discovery |
| `site.webmanifest` | Icons and theme colour for mobile home screens |
| `_headers`, `_redirects` | Cloudflare Pages caching, security headers, and short URLs |
| `functions/` | The blog: its public pages, its private editor, and the sign-in check |
| `admin/index.html` | The editor screen contributors see after signing in |
| `schema.sql` | The blog database tables |

---

## Editing the site

**To change wording:** open the relevant `.html` file in any text editor and edit the text
between the tags. Look for the HTML comment banners (`<!-- ====== EVENTS ====== -->`) to find
your way around.

**To change a photograph:** drop a new JPEG into `assets/img/` and point the `src` at it.
Keep images under about 2400 pixels wide so pages stay fast, and always update the `alt`
text to describe what the new picture actually shows — screen readers and Google both read it.

**To add an event:** copy an existing `<article class="card">` or `<div class="event">` block
in `events.html` and change the details. If it is the next event coming up, also update the
red band near the top of `index.html`.

**Colours and fonts** all live in the `:root` block at the top of `assets/css/site.css`.
Changing a value there changes it everywhere.

### Things marked for you to fill in

Search the HTML for `EDIT ME` to find the two places waiting on information only the
organisation can supply:

- **`visit.html`** — real opening hours, if the Museum ever settles on regular ones.
- **`support.html`** — 501(c)(3) status and EIN, so donors know whether gifts are
  tax-deductible. Leave it out until it is confirmed.

---

## The blog

`/blog` is the one part of this site that is **not** edited by changing files
here. Posts are written at `/admin` by contributors who sign in with their
email address, and they are stored in a Cloudflare D1 database.

This exists so that remote volunteers can add news without being given access
to the rest of the site: behind the sign-in there is nothing but the post
composer, so there is no way to reach `history.html` or the donation page from
it.

Roles are **author** (writes, submits for review), **editor** (also publishes)
and **owner** (also manages people). Everyone starts as an author; you change
someone on the *People* screen inside `/admin`.

**Setting it up takes about fifteen minutes and costs nothing.** The steps are
in [`docs/BLOG-SETUP.md`](docs/BLOG-SETUP.md), with scripts for both PowerShell
and Unix shells under `scripts/`. Until it is set up, `/blog` and
`/admin` politely say so and the rest of the site is unaffected.

The pages under `functions/` are Cloudflare Pages Functions. They still need
no build step — Cloudflare picks the folder up on deploy.

A note on links: everything else on this site links with the `.html` suffix so
the pages work when opened straight from disk. The blog cannot, because it is
generated on request, so it is linked as `/blog`. That link only works on the
deployed site.

---

## Local preview

No build step is needed, but pages look best over HTTP rather than `file://`:

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>.

That serves the static pages only. To work on the blog as well, which needs
the database and sign-in, use `npx wrangler pages dev .` instead.

### Checks

```bash
bash tests/run.sh
```

Plain Node, no packages to install. It checks that a post body cannot inject
anything into the site, that the blog pages render, and that each role can do
only what it should.

---

## Deployment — Cloudflare Pages

The site deploys straight from this repository. No build command and no output
directory are required; Cloudflare serves the repository root as-is.

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `/` |
| Production branch | `main` |

Cloudflare Pages serves clean URLs: `/history` resolves to `history.html`. The canonical
URLs in each page's `<head>` and in `sitemap.xml` use that extensionless form, which is why
they do not end in `.html`. Internal links keep the `.html` suffix so the site also works
when opened directly from disk.

`_redirects` sends `www` to the apex domain and maps a few short paths that are easy to say
out loud or print on a flyer (`/donate`, `/car-show`, `/directions`).

After the first deploy, submit `https://falknermsheritage.com/sitemap.xml` in
[Google Search Console](https://search.google.com/search-console) and
[Bing Webmaster Tools](https://www.bing.com/webmasters).

---

## Credits

Photographs and historical material courtesy of the Falkner Heritage Museum Project.
The Cooper Hill School history is drawn from the account preserved by the museum.

Contact: 662-587-4067 (museum and events) · 662-512-8048 (Community Center plans)
Donations: Falkner Heritage, PO Box 113, Falkner, MS 38629
Facebook: <https://www.facebook.com/groups/1320477038065060>
