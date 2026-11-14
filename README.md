# ColoursFlux

**The offline-first festival companion for Colours 2K27 at Aditya University.**

ColoursFlux is a static, installable web app (PWA) with a separate organiser
dashboard. Visitors can browse the schedule, campus map, stalls, offers and
announcements online, then keep using everything after they lose signal. The
dashboard talks straight to Supabase and never pretends a failed write worked.

- **Public site:** plain HTML, CSS and ES modules. No framework, no build step.
- **Backend:** Supabase Auth, PostgreSQL and Storage, protected by Row Level
  Security (RLS).
- **Offline:** service-worker app shell + IndexedDB data cache.
- **Admin:** `/admin/` — a network-only dashboard for events, locations, vendors,
  offers, announcements, sponsors, settings and team roles.

> **Placeholder notice.** Demo dates (9-11 Jan 2027), the campus map layout,
> vendor names, notices and prices are illustrative sample content, not official
> festival information. Confirm every date, venue, contact and price with the
> organisers before launch. See [Sample data and placeholders](#sample-data-and-placeholders).

---

## Contents

1. [Quick start (demo mode)](#quick-start-demo-mode)
2. [Connect Supabase](#connect-supabase)
3. [Create the first admin](#create-the-first-admin)
4. [Admin dashboard](#admin-dashboard)
5. [Content model](#content-model)
6. [Offline behaviour](#offline-behaviour)
7. [Project structure](#project-structure)
8. [Deploy](#deploy)
9. [Testing](#testing)
10. [QR code](#qr-code)
11. [Sample data and placeholders](#sample-data-and-placeholders)
12. [Security notes](#security-notes)
13. [Docs](#docs)

---

## Quick start (demo mode)

The repo ships with blank Supabase credentials in `assets/js/env.js`. In that
state the site runs in **labelled demo mode**: it uses the sample dataset from
`assets/js/sample-data.js` and shows a "Sample records" strip. Nothing is sent
to a server and the admin dashboard intentionally refuses to log in.

Serve the folder over HTTP — opening `index.html` from disk (`file://`) breaks
ES modules and the service worker.

```bash
# Node 18+ (no install needed)
npx serve . -l 4173

# or Python 3
python -m http.server 4173
```

Then open <http://localhost:4173>.

Useful routes:

| Route | Purpose |
| --- | --- |
| `/` | Home: hero, countdown, quick access, featured content |
| `/events.html` | Searchable schedule and grid |
| `/event.html?slug=…` | Shareable event detail page |
| `/map.html` | Stylised campus map with pins |
| `/stalls.html` | Vendors, offers and sponsor placement |
| `/announcements.html` | Notices, filterable by priority |
| `/install.html` | Install guide, offline status and QR generator |
| `/admin/` | Organiser dashboard (requires Supabase + a role) |

The home page opens with a one-per-session rangoli animation that reveals
**COLOURS** letter by letter in rainbow colours, then appends **FLUX** in white.
Append `?intro=1` to replay it; motion-sensitive visitors skip it
automatically via `prefers-reduced-motion`.

To change the demo artwork or regenerate icons:

```bash
node tools/generate-art.mjs          # SVGs, no dependencies
npm install --no-save sharp          # only if you change the logo
node tools/generate-icons.mjs        # PNG app icons
```

Generated files are committed, so these scripts are maintenance tools, not a
build step.

---

## Connect Supabase

You need a Supabase project. The public anon key is safe to ship; the
`service_role` key must never appear in this repo.

### 1. Create the project

Create a project at <https://supabase.com/dashboard>. Note the **Project URL**
and the **anon / publishable key** from *Project Settings → API*.

### 2. Run the SQL files, in order

In *SQL Editor → New query*, run each file from `supabase/` in this order:

| Order | File | What it does |
| --- | --- | --- |
| 1 | `supabase/schema.sql` | Tables, checks, indexes, `updated_at`, activity logging and last-admin guard |
| 2 | `supabase/policies.sql` | Enables RLS and grants the exact read/write surface per role |
| 3 | `supabase/storage.sql` | Creates the `festival-media` bucket (2 MB, PNG/JPEG/WebP) and its policies |
| 4 | `supabase/seed.sql` *(optional)* | Sample rows, all flagged `is_sample = true` |

Do **not** run `seed.sql` against production. If you already ran it, the file
contains the delete statements needed to remove sample rows.

### 3. Add the browser credentials

Copy the example and fill in the two public values:

```bash
cp assets/js/env.example.js assets/js/env.js
```

```js
// assets/js/env.js
export const ENV = {
  SUPABASE_URL: 'https://<project-ref>.supabase.co',
  SUPABASE_ANON_KEY: '<anon-or-publishable-key>',
};
```

Reload the site. The sample strip disappears once live rows are returned and
the dashboard setup screen becomes a login form.

> The root `.env.example` is only a reference for CI/hosting scripts. The static
> app reads `assets/js/env.js`, not `.env`.

### 4. Auth settings

In *Authentication → Providers → Email*:

- Keep **Enable email provider** on.
- Turn **Allow new users to sign up** **off**. There is no public account
  feature; organise accounts yourself.
- Email confirmation can stay on. Admins create accounts from the dashboard.

There is deliberately **no signup page and no auto-profile trigger**. A user who
somehow authenticates still sees "No dashboard role" until an admin inserts
their profile row.

---

## Create the first admin

1. In *Authentication → Users → Add user*, create an account with a real email
   and a strong password. Confirm the email if confirmation is enabled.
2. Copy the user's UUID.
3. Run this once in the SQL editor:

```sql
insert into public.profiles (id, email, full_name, role)
values (
  '<auth-user-uuid>',
  'organiser@example.edu',
  'Festival Lead',
  'admin'
)
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = 'admin';
```

4. Open `/admin/` and sign in.

Additional organisers follow the same flow: create the Auth user, then assign a
role in **Admin → Team** (or with the SQL above). Removing the last admin is
blocked by a database trigger.

### Roles

| Role | Can do |
| --- | --- |
| `admin` | Everything: content, sponsors, settings, team roles, deletes |
| `editor` | Create/edit events, locations, vendors, offers and announcements |
| `viewer` | Read-only dashboard access |

RLS enforces these rules server-side. Hiding a button is never the security
boundary.

---

## Admin dashboard

`/admin/` is deliberately **not** cached by the service worker: it refuses to
operate offline, because an organiser editing stale data is worse than an
organiser waiting for signal.

- **Overview** — publication counts, pending vendors, active offers, next
  events, confirmed activity feed, settings summary and a launch checklist.
- **Events / Locations / Vendors / Offers / Announcements / Sponsors** — search,
  filter, create, edit, preview, quick status actions and delete (admin only).
- **Settings** — festival name, tagline, start/end (drives the countdown),
  timezone, logo, contact details, social links and `data_version`.
- **Team** — change existing profile roles; new users are added in Supabase Auth
  first. You cannot change your own role from the dashboard.

Every save goes to PostgREST and is followed by a targeted reload. If the write
fails, the dialog stays open, the field is highlighted and the error is shown —
there are no optimistic "Saved!" toasts.

Step-by-step guidance: [`docs/admin-guide.md`](docs/admin-guide.md).

---

## Content model

| Table | Public visibility | Notes |
| --- | --- | --- |
| `app_config` | Always | Singleton row (`id = 'app'`). Drives countdown, footer, contacts |
| `locations` | `is_published = true` | Map pin percentages, optional verified coordinates |
| `events` | `status in ('published','cancelled')` | Cancelled events stay visible with a warning; drafts/archived hidden |
| `vendors` | `approval_status = 'approved'` | Pending/rejected stay dashboard-only |
| `offers` | `status = 'active'` and unexpired | Hidden if the vendor is not approved |
| `announcements` | `status = 'published'` and unexpired | Publish time stamped by a trigger |
| `sponsorships` | `status = 'active'` | Admin-only editing. Payment flag is verified manually |
| `activity_log` | Dashboard only | Written by triggers, never by the browser |
| `profiles` | Self + admins | A row is required for dashboard access |

Status vocabularies are fixed by `check` constraints and mirrored in
`assets/js/admin/schemas.js`. See `supabase/schema.sql` for the authoritative
list.

---

## Offline behaviour

1. First visit: the service worker precaches the app shell; `store.js` fetches
   public data and writes it to IndexedDB.
2. Later visits: cached data renders immediately, then a background sync
   refreshes it. A "saved data" bar appears if the sync fails.
3. Navigation requests are network-first → cache → `/offline.html`.
4. `/admin/`, Supabase REST and Auth traffic are never cached. Only public
   Storage images are cached (bounded to 60 entries).
5. `assets/js/env.js` is network-first (cache is only the offline fallback), so
   adding your Supabase credentials takes effect on the next reload.
6. **Download for offline** on the install page forces a fresh snapshot; **Clear
   saved data** removes both IndexedDB and Cache Storage.

The countdown always comes from `app_config.festival_start`. If the date is
missing or invalid the UI says so; it never falls back to a fake hardcoded timer.

---

## Project structure

```text
coloursflux/
├─ index.html, events.html, event.html, map.html,
│  stalls.html, announcements.html, about.html,
│  install.html, privacy.html, terms.html, offline.html
├─ manifest.webmanifest
├─ sw.js
├─ admin/
│  └─ index.html                 # dashboard shell
├─ assets/
│  ├─ css/  base.css, components.css, pages.css, admin.css
│  ├─ icons/                     # logo + generated PNG/SVG icons
│  ├─ img/art/                   # generated, licence-clean artwork
│  └─ js/
│     ├─ env.js / env.example.js # public Supabase config
│     ├─ config.js, icons.js, util.js, idb.js
│     ├─ qr.js                   # dependency-free QR encoder
│     ├─ api.js, store.js, ui.js, pwa.js
│     ├─ sample-data.js
│     ├─ pages/                  # one entry module per public page
│     └─ admin/                  # app, data, schemas, components, views, forms
├─ supabase/
│  ├─ README.md                  # run order + first admin
│  ├─ schema.sql
│  ├─ policies.sql
│  ├─ storage.sql
│  └─ seed.sql
├─ docs/                         # deployment, testing, QR, admin, troubleshooting
├─ tools/                        # art/icon generators (not used at runtime)
├─ .env.example
└─ .gitignore
```

---

## Deploy

Any static host with HTTPS works; there is no server-side code in this repo.

1. Fill `assets/js/env.js`.
2. Upload the repository root as the site root (keep `admin/`, `assets/` and
   `sw.js` beside the HTML).
3. Make sure `sw.js` and HTML are served without long-lived immutable caching.
4. Open the deployed URL, check the console, install the PWA and test offline.

Host-specific steps, cache headers, CSP and a launch checklist live in
[`docs/deployment.md`](docs/deployment.md).

---

## Testing

Minimum pre-launch pass:

```bash
# ES-module syntax check (Windows PowerShell)
Get-ChildItem -Recurse assets\js\*.js | ForEach-Object {
  Get-Content -Raw $_.FullName | node --input-type=module --check
}
```

Then follow [`docs/testing.md`](docs/testing.md): public pages, admin CRUD,
RLS probes with `curl`, offline/reload behaviour, accessibility and the
sample-data cleanup check. There is no automated browser suite committed; the
document is a repeatable manual matrix.

---

## QR code

`/install.html` generates a QR code **in the browser** for any confirmed
deployed HTTPS URL — no third-party QR service, no tracking, works offline.
Download the PNG and print it. The encoder handles URLs up to roughly 210
characters; longer links fail with a clear message.

Sizing, placement and print tips: [`docs/qr-code.md`](docs/qr-code.md).

---

## Sample data and placeholders

Everything below is **illustrative** and must be replaced or confirmed:

- **Festival dates** - 9-11 January 2027. Confirm with the organisers, then
  update *Admin → Settings*. The countdown follows this value.
- **Campus map** — `map_x`/`map_y` are percentages on a stylised map, not a
  surveyed layout. Confirm every pin. Coordinates are optional and blank by
  default.
- **Vendors, events and notices** — invented for the demo, including the
  "Robotics Demo Arena cancelled" notice.
- **Pricing** — Free / ₹99 / ₹199 / ₹499+ are sample listing tiers. No payment
  is processed anywhere in this project, and sponsorships only record a manual
  "payment verified" checkbox.
- **Contacts and social links** — blank by design. Only publish details the
  organisers have approved.
- **Artwork** — abstract SVGs generated by `tools/generate-art.mjs`, not photos
  of the real campus.

The public site shows a visible strip while any loaded row has `is_sample =
true`, and the dashboard warns with a count. Seed rows should be deleted or
replaced before sharing the QR code.

---

## Security notes

- Only the Supabase **anon** key is in the browser. RLS is the enforcement layer.
- Public reads are restricted to published/approved/live rows.
- Delete is admin-only; sponsors, settings and team roles are admin-only.
- The last admin cannot be demoted or deleted (database trigger).
- `activity_log` has no insert/update/delete policy — triggers write it with
  `SECURITY DEFINER`.
- Uploads are limited to 2 MB and PNG/JPEG/WebP, client- and server-side.
- The service worker never caches `/admin/`, auth responses or REST JSON.
- The dashboard never reports a save that the server did not confirm.

If you find a security issue, contact the project maintainers privately rather
than opening a public issue with exploit details.

---

## Docs

- [`docs/deployment.md`](docs/deployment.md) — hosting, caching, CSP, launch checklist
- [`docs/admin-guide.md`](docs/admin-guide.md) — day-to-day organiser workflows
- [`docs/testing.md`](docs/testing.md) — manual and RLS test matrix
- [`docs/qr-code.md`](docs/qr-code.md) — QR generation and print guidance
- [`docs/troubleshooting.md`](docs/troubleshooting.md) — common failures and fixes

---

## Licence and credits

The interface, icon set, QR encoder and placeholder artwork are written for this
project; no third-party icon font, photo library or QR service is bundled. Add a
project licence before publishing the repository, and confirm usage rights for
any real photographs, logos or sponsor artwork uploaded through the dashboard.
