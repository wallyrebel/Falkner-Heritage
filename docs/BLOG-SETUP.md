# Setting up the blog and its contributors

The news section at `/blog` is written through a private editor at `/admin`.
Contributors sign in with **their email address and a six-digit code** — no
password, no GitHub account, nothing to install. Behind that sign-in there is
only the post composer, so a contributor cannot change any other page on the
site.

Everything below is free: Cloudflare Access is free for up to 50 people, and
the database and Functions sit inside the Pages free tier.

---

## What you are setting up

| Piece | What it does |
| --- | --- |
| **D1 database** (`falkner-blog`) | Holds the posts, the photographs, and who may do what |
| **Binding** `DB` | Lets the site read and write that database |
| **Access application** | The email sign-in in front of `/admin` |
| **Four settings** | Tell the site which Access application to trust |

---

## The quick way

On your own computer, in a clone of this repository.

**macOS or Linux:**

```bash
npx wrangler login                      # opens your browser, sign in to Cloudflare
bash scripts/setup-blog-db.sh           # creates the database and its tables
```

**Windows PowerShell:**

```powershell
npx wrangler login
powershell -ExecutionPolicy Bypass -File scripts\setup-blog-db.ps1
```

> Windows PowerShell 5.1 does not understand `&&` between commands. Put each
> command on its own line, or use `;` to separate them.

Bind it (six clicks, no way around this one):

> **Workers & Pages → your Pages project → Settings → Bindings → Add binding**
> D1 database · Variable name `DB` · Database `falkner-blog`
> Do this for **Production** and **Preview**.

Then turn on the sign-in:

**macOS or Linux:**

```bash
export CF_API_TOKEN=...      # My Profile -> API Tokens -> Create Token
                             #   permission: Access: Apps and Policies -> Edit
export CF_ACCOUNT_ID=...     # shown on the Workers & Pages page
bash scripts/setup-access.sh you@example.com helper@example.com
```

**Windows PowerShell:**

```powershell
$env:CF_API_TOKEN  = "..."   # My Profile -> API Tokens -> Create Token
                             #   permission: Access: Apps and Policies -> Edit
$env:CF_ACCOUNT_ID = "..."   # shown on the Workers & Pages page
powershell -ExecutionPolicy Bypass -File scripts\setup-access.ps1 you@example.com helper@example.com
```

That prints four settings. Add them under **Settings → Variables and Secrets**
for both Production and Preview, then redeploy once.

---

## The clicking way

<details>
<summary>If you would rather not use the command line</summary>

**1. Make the database**
Workers & Pages → D1 → Create database → name it `falkner-blog`.
Open it, choose **Console**, paste the contents of `schema.sql`, run it.

**2. Bind it**
Your Pages project → Settings → Bindings → Add binding → D1 database.
Variable name `DB`, database `falkner-blog`. Add it to Production *and* Preview.

**3. Turn on Zero Trust**
Left sidebar → Zero Trust. If it asks you to choose a plan, pick **Free** and
choose a team name — that becomes `yourteam.cloudflareaccess.com`.

**4. Add the application**
Zero Trust → Access → Applications → Add an application → **Self-hosted**.

- Application name: `Falkner Heritage blog editor`
- Session duration: 24 hours
- Public hostname: domain `falknermsheritage.com`, path `admin`
- Identity providers: leave **One-time PIN** on — that is the email code

Add a policy: name it `Blog contributors`, action **Allow**, and add an
include rule of **Emails** listing everyone who should be able to write.

After saving, open the application's **Overview** tab and copy the
**Application Audience (AUD) Tag**.

**5. Add the settings**
Your Pages project → Settings → Variables and Secrets. For Production *and*
Preview:

| Name | Value |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | `yourteam.cloudflareaccess.com` |
| `ACCESS_AUD` | the AUD tag you copied |
| `SITE_ORIGIN` | `https://falknermsheritage.com` |
| `OWNER_EMAILS` | your own email address |

**6. Redeploy** the Pages project once so the settings take effect.

</details>

---

## Adding and removing people

**To let someone in:** Zero Trust → Access → Applications → your application →
Policies → add their email to the `Blog contributors` rule. They can sign in
straight away; nothing is sent to them until they visit `/admin` themselves.

**To cut someone off:** remove their email from that same rule. They lose
access immediately, and the posts they wrote stay where they are.

`OWNER_EMAILS` is a safety net: whoever is listed there is always an owner,
even if the database says otherwise, so you cannot lock yourself out.

---

## Who can do what

| | Author | Editor | Owner |
| --- | :-: | :-: | :-: |
| Write and edit their own posts | ✅ | ✅ | ✅ |
| Send a post for review | ✅ | ✅ | ✅ |
| Preview a post before it is public | ✅ | ✅ | ✅ |
| Edit a post after it is published | own posts | any | any |
| Put a post on the site / take it off | — | ✅ | ✅ |
| Edit or delete other people's posts | — | ✅ | ✅ |
| Change what people may do | — | — | ✅ |

Everyone starts as an **Author**. Change someone to **Editor** on the
**People** screen in `/admin` — that is the switch between "submits for
approval" and "publishes directly", and you can move it either way at any time.

Anyone can go back and edit a post after it is published, including their own
live posts; a saved change appears on the site immediately.

---

## Everyday use

- Contributors go to **falknermsheritage.com/admin**, type their email, and
  paste the code Cloudflare emails them. The sign-in lasts 24 hours.
- **Write a new post** → headline, short summary, a photograph, the text.
- **Preview** shows exactly how it will look, before anyone else can see it.
- Photographs are shrunk in the browser before they upload, so a phone picture
  taken out at the park works fine on a weak signal.
- Posts appear at `/blog`, are added to `sitemap.xml` automatically for Google,
  and go out on the RSS feed at `/blog/feed.xml`.

---

## Keeping a copy of the posts

The posts live in the D1 database rather than in this repository. To pull a
full copy down at any time:

```
npx wrangler d1 export falkner-blog --remote --output=blog-backup.sql
```

That one works the same in PowerShell, Command Prompt and a Unix shell.

Worth doing every few months, and before any big change.

---

## If something is wrong

| What you see | What it means |
| --- | --- |
| "The blog database is not connected yet" | The `DB` binding is missing, or was only added to Production. Add it to both, then redeploy. |
| "Sign-in is not configured yet" | `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is missing. Check both environments, then redeploy. |
| "Please sign in" on a `.pages.dev` address | Expected. Access only guards the real domain, so use `falknermsheritage.com/admin`. |
| A contributor never gets the code | Check their address is in the Access policy, and have them look in spam for a message from Cloudflare. |
| Changed a setting and nothing happened | Pages settings only apply to a new deployment. Redeploy once. |
