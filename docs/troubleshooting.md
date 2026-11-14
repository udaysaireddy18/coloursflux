# Troubleshooting

Common failures, why they happen and what to do. If a fix involves the database,
run it in the Supabase SQL editor and then hard-reload the browser.

---

## 1. The page is blank or only shows a spinner

**Most likely cause: opened with `file://`.** ES modules and service workers need
`http(s)`. `index.html` opened by double-clicking cannot load `assets/js/pages/home.js`.

```bash
npx serve . -l 4173      # or: python -m http.server 4173
```

Then open <http://localhost:4173>.

Other checks:

- DevTools → Console. A `Failed to load module script` or `404` means a path is
  wrong or `assets/` was not uploaded beside the HTML.
- A `MIME type of "text/html"` error means the host returned a 404 page for a
  `.js` file — the file is missing, not mis-typed.
- A blank page with `SyntaxError` usually means an edit broke a module. Parse the
  files:

```powershell
Get-ChildItem -Recurse assets\js\*.js | ForEach-Object {
  Get-Content -Raw $_.FullName | node --input-type=module --check
}
```

- If it only fails in one browser, check for an extension or a proxy blocking
  `sw.js`.

---

## 2. The "Sample records" strip will not go away

The strip is driven by `is_sample = true` on loaded rows — not by whether
credentials exist. Work through these in order.

1. **`assets/js/env.js` is still blank.** It must contain both values:

   ```js
   export const ENV = {
     SUPABASE_URL: 'https://<ref>.supabase.co',
     SUPABASE_ANON_KEY: '<anon-key>',
   };
   ```

   Watch for trailing spaces, smart quotes pasted from a document, or a missing
   comma. Reload after editing.

2. **A cached copy of `env.js`.** The service worker serves `env.js`
   network-first as of `v1.0.1`. On an older build, hit **Reload** twice, or
   DevTools → Application → Service Workers → **Update**, or **Clear site data**.

3. **The seeded rows are still there.** Demo rows stay flagged even after
   credentials are added. Delete or replace them:

   ```sql
   delete from public.offers        where is_sample;
   delete from public.events        where is_sample;
   delete from public.vendors       where is_sample;
   delete from public.locations     where is_sample;
   delete from public.announcements where is_sample;
   delete from public.sponsorships  where is_sample;
   update public.app_config set is_sample = false where id = 'app';
   ```

4. **Only some tables loaded.** The strip appears if *any* row is a sample. A
   single leftover sample vendor or notice is enough to keep it on.

If the public site shows the strip but the dashboard reports zero samples, the
public data is coming from the offline cache: clear it from **Install → Clear
saved data** and reload.

---

## 3. Admin shows "Connect Supabase" even though `env.js` is filled

The setup screen appears when the app considers itself unconfigured.

- Confirm both values are non-empty strings in `assets/js/env.js`.
- Confirm the file is the one being served (view source or DevTools → Network →
  `env.js`). A host that rewrites or ignores `assets/js/` will serve the old file.
- The URL must be the full `https://<ref>.supabase.co` — no trailing slash
  problems, no `/rest/v1`.
- The key must be the **anon / publishable** key. A `service_role` key must never
  be used; a wrong key fails at the first request instead.
- Hard-reload. If the service worker is old, bump `VERSION` in `sw.js` or clear
  site data.
- DevTools → Console: a module error means `env.js` did not parse (usually a
  quote or comma problem).

---

## 4. "Email or password is incorrect"

- Confirm the account exists in **Authentication → Users**, not just in
  `profiles`.
- If email confirmation is enabled, the user must be confirmed. Unconfirmed
  users cannot sign in; confirm them in the dashboard.
- Email provider must be enabled in **Authentication → Providers → Email**.
- Too many attempts are rate-limited by Supabase temporarily. Wait a minute.
- Reset the password from **Authentication → Users → …** — this project has no
  password-reset email flow of its own.
- Check for a leading/trailing space in the email field.

A `404` during sign-in usually means the project URL is wrong.

---

## 5. "This account has no dashboard role"

Authentication succeeded but there is no `public.profiles` row. This is
intentional: signing up grants nothing.

```sql
insert into public.profiles (id, email, full_name, role)
values ('<auth-user-uuid>', 'organiser@example.edu', 'Festival Lead', 'editor')
on conflict (id) do update set role = excluded.role;
```

Get the UUID from **Authentication → Users**. Sign in again afterwards. Existing
sessions pick up the new role on the next request, but a reload is the easy fix.

If the SQL fails with `relation "profiles" does not exist`, `supabase/schema.sql`
has not been run.

---

## 6. Reads return an empty array, or writes silently do nothing

These are RLS and grant problems, not front-end bugs.

1. **Run order matters.** `schema.sql` → `policies.sql` → `storage.sql`
   (→ optional `seed.sql`). Running policies before the tables fails.
2. **Public read returns nothing:** the row's status must match the policy.
   Check the actual value:

   ```sql
   select id, title, status, is_sample from public.events order by created_at desc limit 20;
   ```

   - Events: `published` or `cancelled`
   - Vendors: `approval_status = 'approved'`
   - Offers: `status = 'active'`, `valid_until` null or future, vendor approved
   - Announcements: `published` and not expired
   - Sponsorships: `status = 'active'`
   - Locations: `is_published = true`
3. **Writes return `200`/`204` with an empty body.** PostgREST reports a
   blocked `PATCH`/`DELETE` as an empty result rather than an error. Re-read the
   row to see whether it changed. An empty array means RLS removed it.
4. **Editor cannot delete.** Correct — delete is admin-only. Editors can create
   and update.
5. **Viewer cannot write.** Correct — viewer is read-only.
6. **`permission denied for table …`** means the grants block was not applied.
   Re-run `policies.sql`; it revokes everything first, then grants deliberately.
7. **`infinite recursion detected in policy for relation "profiles"`** means the
   role helper functions were replaced by plain SQL functions. Re-run
   `policies.sql` so `is_staff()`, `is_editor()` and `is_admin()` are
   `SECURITY DEFINER`.

Quick probes are in [`testing.md`](testing.md#4-rls-probes-with-curl).

---

## 7. Image upload fails

| Symptom | Cause |
| --- | --- |
| "Choose a PNG, JPEG or WebP" | Wrong file type — GIF, HEIC and SVG are rejected on purpose |
| "Image must be under 2 MB" | Client limit; compress first (1600×900 is plenty) |
| `403` on upload | Bucket policies missing, or the account is a `viewer` |
| `404` / bucket not found | `supabase/storage.sql` was not run |
| Uploads, but the image is broken | Object is private or the row points at a path that was never saved |
| Works in the dashboard preview, broken on the public site | A bundled `assets/…` path is fine; an `http://` image on an HTTPS page is blocked as mixed content |

Fixes: re-run `storage.sql`, confirm the user's role, and check the file size.
Only editors and admins can write; only admins can delete objects.

Seeded rows use bundled paths like `assets/img/art/wave-purple.svg`. Those are
valid in the editor and preview. Replace them with real uploads before launch.

---

## 8. The deployed site still shows the old version

- Bump `VERSION` in `sw.js`. The cache names include it, so a bump forces a new
  shell.
- Serve `sw.js` and `*.html` with `Cache-Control: no-cache` (see
  [`deployment.md`](deployment.md#4-cache-strategy)). Immutable caching on
  non-fingerprinted files means the browser never asks for the update.
- After deploy: DevTools → Application → Service Workers → **Update**, or close
  every tab of the site and reopen. A worker only updates when no old tab is
  holding it open.
- The update banner is intentionally manual: it will not reload someone
  mid-schedule. If it was dismissed, the dismissal flag is stored in
  `localStorage`; clear site data to see it again.
- Verify the deployment actually replaced the files (open `/sw.js` directly and
  read `VERSION`).

---

## 9. Countdown is wrong, blank or says the date is unavailable

The countdown reads `app_config.festival_start`. It never falls back to a
hardcoded timer.

1. **No `app_config` row.** Insert it, or run `seed.sql` in a demo project:

   ```sql
   select id, festival_start, festival_end, timezone from public.app_config;
   ```

   Expect exactly one row with `id = 'app'`.

2. **Dates in the past.** The UI then shows the festival as started/ended rather
   than counting down. Update **Admin → Settings**.

3. **Timezone.** `festival_start` is a `timestamptz`. Enter the wall-clock time
   for the campus (`Asia/Kolkata`) in the settings form; it converts to UTC for
   storage and back for editing. If you edit SQL directly, include the offset:

   ```sql
   update public.app_config
   set festival_start = '2027-01-07T10:00:00+05:30',
       festival_end   = '2027-01-09T23:00:00+05:30',
       timezone       = 'Asia/Kolkata'
   where id = 'app';
   ```

4. **In demo mode** the date comes from `FALLBACK_CONFIG` / the sample config
   (7 Jan 2027) and is labelled as sample data. That is a configured date, not a
   fake timer.
5. **Cached page.** Reload; the countdown is computed from the loaded config.

---

## 10. Map pins are missing, stacked or in the wrong place

- `map_x`/`map_y` are **percentages** of the map box: `0` = left/top,
  `100` = right/bottom. Values outside `0–100` are rejected by the database
  check; a pin at `100/100` sits on the edge and may look clipped.
- Two locations with the same coordinates overlap. Nudge one.
- The location must be **published** (`is_published = true`) to appear.
- The type filter or search on the map page may be hiding it.
- Buildings and paths in the illustration are decorative. The pins are the only
  positional data — this is a guide, not a surveyed campus plan, and
  `latitude`/`longitude` are optional. Do not publish unverified coordinates.

Related: an event attached to an unpublished location shows "Venue TBA" rather
than a broken link. That is expected.

---

## 11. Times are off by a few hours

- Event dates are `date` + `time` values interpreted in the festival timezone
  (`app_config.timezone`), so `18:00` means 6 PM on campus, not 6 PM UTC.
- Announcement `published_at`, offer `valid_until` and `festival_start` are
  `timestamptz` and display in the visitor's locale. Two phones in different
  zones will show different clock times for the same instant — that is correct.
- If the whole schedule looks shifted, check `timezone` in **Admin → Settings**
  (`Asia/Kolkata`, not `Asia/Calcutta`/`IST`).
- Overnight events (end before start) are rejected. Split them into two rows or
  end at `23:59`.

---

## 12. `event.html?slug=…` shows "not found"

- The event is `draft` or `archived`. Only `published` and `cancelled` are
  publicly readable.
- The slug changed after the link was shared. Slugs are unique and should be set
  once; if it must change, update the shared links.
- The slug has capitals, spaces or underscores. The database only allows
  lowercase letters, numbers and single hyphens.
- The link is from a build pointed at a different Supabase project.

`cancelled` events are *supposed* to stay visible with a warning. If a cancelled
event vanished, its status is probably `archived`.

---

## 13. "Saved data" bar / data will not refresh

- You are offline, or the request timed out (12 seconds). Saved IndexedDB data
  is shown and labelled.
- Supabase is paused (free projects pause after inactivity) or returning `5xx`.
  Check the project status.
- An ad-blocker or privacy extension is blocking `*.supabase.co`. Test in a
  private window with extensions disabled.
- The query is blocked by RLS — the page then shows an honest empty state
  instead of stale rows. See section 6.
- To force a fresh copy: **Install → Download festival data**, or
  **Clear saved data** followed by a reload.

---

## 14. Install prompt does not appear

- The site must be on **HTTPS** (localhost is exempt). `http://192.168.x.x` will
  not install.
- The manifest and all three icons must load. DevTools → Application → Manifest
  shows installability errors.
- Chrome will not prompt if the app is already installed, or if it was dismissed
  recently.
- iOS Safari has no automatic prompt: use **Share → Add to Home Screen**. The
  in-app instructions on `/install.html` cover this.
- Firefox desktop generally does not offer installation; the app still works.

---

## 15. Console shows Content-Security-Policy errors

The CSP in [`deployment.md`](deployment.md) allows only `'self'` plus Supabase.
Errors like `Refused to connect … supabase.co` mean the host is overriding the
header:

- `connect-src` must include `https://*.supabase.co` (REST + Auth).
- `img-src` must include `data: blob: https://*.supabase.co` for uploads and
  previews.
- `style-src 'unsafe-inline'` is required for inline `style` attributes. Scripts
  are all external, so `script-src 'self'` stays strict.
- A different CSP from a proxy or CDN wins if it is more restrictive.

Do not "fix" a CSP error by adding `'unsafe-eval'` — nothing here needs it.

---

## 16. The activity feed is empty

- Sample rows inserted by `seed.sql` do log inserts, but if you ran the seed
  before creating the triggers, nothing was recorded.
- Edits made directly in the SQL editor are logged with no actor email (no JWT),
  which can look like a blank entry.
- The policy only lets staff read `activity_log`. A `viewer` still sees it; anon
  cannot.
- Deleting a row does not remove its history, so old entries remain after a
  cleanup.

---

## 17. A vendor, offer or notice is missing from the public site

Check the gate, in this order:

| Content | Must be true |
| --- | --- |
| Vendor | `approval_status = 'approved'` |
| Offer | `status = 'active'`, `valid_until` empty or in the future, vendor approved |
| Announcement | `status = 'published'`, `expires_at` empty or in the future |
| Event | `status = 'published'` or `'cancelled'` |
| Sponsor | `status = 'active'` |
| Location | `is_published = true` |

Campaign dates on sponsors and `valid_from` on offers are informational — they are
shown in the UI but do not hide the record. `status` is the switch.

The client also applies the same filters after loading, so a row that is public
in SQL but hidden in the UI usually has a mismatched status value (for example
`Approved` with a capital A, which the `check` constraint should have rejected).

---

## 18. "At least one admin account is required"

A trigger blocks demoting or deleting the last admin. Promote another account
first:

```sql
update public.profiles set role = 'admin'
where email = 'second-admin@example.edu';
```

Then retry. This also fires if you try to change your own role through SQL.

---

## 19. "Could not load the dashboard"

This screen appears when the dashboard cannot read its tables at all — it never
falls back to stale data on purpose.

- Check the connection and Supabase project status.
- Run the probes in section 6. A missing `profiles` row gives "No dashboard
  role", not this screen, so a failure here is usually credentials, URL, RLS on
  every table, or a paused project.
- `/admin/` is never cached by the service worker. If you are offline it will
  show a connection page, and that is intended.
- Press **Retry** after fixing the cause; **Sign out** clears the local session.

---

## 20. QR code will not generate or will not scan

- The URL must be `http(s)`, not `localhost`/`127.0.0.1`. A phone cannot reach
  your laptop's loopback address.
- The encoder covers versions 1–10 (roughly 210–213 characters for common URLs).
  Shorten the link; do not add tracking parameters.
- Print at least 3 × 3 cm with a 4-module quiet zone, dark modules on a light
  background. See [`qr-code.md`](qr-code.md).
- If it scans but opens a cached old build, bump `VERSION` and redeploy before
  printing.

---

## Still stuck?

Collect this before asking for help:

1. The exact page and action.
2. DevTools → Console output (full error text) and the failing request from
   Network (status, response body).
3. Whether the app is in demo mode (sample strip visible) or live.
4. The relevant row from SQL: `select * from public.events where id = '…';`
5. Your role: `select * from public.profiles where id = auth.uid();`
6. Browser and version, and whether it happens in a private window.

Never paste your Supabase `service_role` key, database password or a full access
token into a message, issue or screenshot.
