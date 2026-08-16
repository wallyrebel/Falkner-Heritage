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

## Local preview

No build step is needed, but pages look best over HTTP rather than `file://`:

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>.

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
