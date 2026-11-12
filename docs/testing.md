# Testing

There is no committed automated browser suite. This document is the repeatable
test pass to run before sharing the QR code. Run it on a desktop browser and at
least one real phone.

## 0. Static checks

```powershell
# Windows PowerShell — parse every ES module
Get-ChildItem -Recurse assets\js\*.js | ForEach-Object {
  Get-Content -Raw $_.FullName | node --input-type=module --check
}

# All paths in the service-worker precache exist
@'
import fs from "node:fs";
const src = fs.readFileSync("sw.js", "utf8");
const list = [...src.matchAll(/^  '\.\/([^']*)',$/gm)].map(m => m[1]).filter(Boolean);
const missing = list.filter(p => !fs.existsSync(p));
console.log(missing.length ? "MISSING:\n" + missing.join("\n") : `All ${list.length} shell files exist.`);
'@ | node --input-type=module
```

Also confirm the service worker `VERSION` was bumped for the current release.

## 1. Demo mode (no credentials)

Temporarily blank `assets/js/env.js` (keep a copy) and serve the folder:

```bash
npx serve . -l 4173
# or: python -m http.server 4173
```

| Check | Expected |
| --- | --- |
| Home loads | Hero, countdown, featured events/vendors, notices, footer |
| Sample strip | Visible "Sample records" bar; footer note says sample data |
| Countdown | Counts toward 7 Jan 2027, not a fake 3-day timer |
| Events | Search, day/category/venue filters, schedule/grid toggle, bookmarks |
| Event detail | Opens `event.html?slug=…`; cancelled event shows warning |
| Map | Pins render; type filter and list work; no invented coordinates |
| Stalls | Approved vendors only; offers show; pending vendor absent |
| Announcements | Priorities filter; sample notices visible |
| About / privacy / terms | Render, links work, no dead buttons |
| Install | Install instructions, storage summary, QR tool |
| Admin | Shows "Connect Supabase" setup screen (no fake login) |
| Console | No errors or 404s |

The countdown in demo mode follows `FALLBACK_CONFIG` / `sampleConfig`. That is
still a configured date, not an unconfigurable demo timer.

## 2. Public pages against live Supabase

With real credentials and seed data (or real content):

- [ ] Loaded data replaces sample data; the strip disappears when no row has
      `is_sample = true`.
- [ ] Draft/archived events are not visible; cancelled events **are** visible
      with the warning.
- [ ] Pending/rejected vendors and their offers are absent.
- [ ] Expired announcements and offers are absent.
- [ ] Every event card links to a working detail page; the slug round-trips.
- [ ] Unknown slug shows a helpful not-found state, not a blank page.
- [ ] `Download festival data` then airplane mode: pages already visited reload
      from cache; navigation to an uncached page shows `offline.html`.
- [ ] With an empty database, pages show honest empty states ("No events yet"),
      not fake rows.

## 3. Dashboard

Sign in as each role.

### Admin

- [ ] Overview counts match the tables.
- [ ] Create a draft event → appears in the dashboard, not on the public site.
- [ ] Publish it → appears publicly after reloading the public tab.
- [ ] Cancel it → remains public with the warning. Archive it → gone publicly.
- [ ] Feature/unfeature updates the home page.
- [ ] Edit a location's X/Y → pin moves on the map.
- [ ] Approve a pending vendor → vendor and eligible offers appear publicly.
- [ ] Publish a notice → appears on home + announcements with "time ago".
- [ ] Settings: change festival start → public countdown updates on reload.
- [ ] Invalid settings (end before start, bad timezone) show inline errors.
- [ ] Upload a valid PNG/JPEG/WebP under 2 MB → preview and saved URL work.
- [ ] Upload a 3 MB file or a GIF → clear error, nothing saved.
- [ ] Delete an event → confirm dialog, then row disappears and activity logs it.
- [ ] Change another user's role → their access changes on reload.
- [ ] Try to change your own role → select is disabled.
- [ ] Try to delete/demote the last admin via SQL → trigger raises an error.

### Editor

- [ ] Can create/edit events, locations, vendors, offers and announcements.
- [ ] Cannot see Settings, Team or Sponsors navigation.
- [ ] Delete controls are absent, and a direct `DELETE` request is rejected.

### Viewer

- [ ] Can read every table.
- [ ] No create/edit/delete controls.
- [ ] Direct writes are rejected by RLS.

### Failure handling

- [ ] Stop the network, then save: dialog stays open, error is shown, no success
      toast, activity feed does not gain an entry.
- [ ] Expire the session (or clear the access token) and make a request: the
      dashboard signs you out or refreshes once, then explains what happened.
- [ ] Refresh with a valid session: you land back on the same hash route.
- [ ] Sign out clears the local session and "Back" does not restore the shell.

## 4. RLS probes with curl

Set values first:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co"
ANON="<anon-key>"
```

### Anonymous reads

```bash
# Should return only published/cancelled events
curl -s "$SUPABASE_URL/rest/v1/events?select=title,status" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# Should not return any draft, archived, pending vendor, expired offer or notice
curl -s "$SUPABASE_URL/rest/v1/vendors?select=name,approval_status" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# Should return nothing (RLS hides the whole table from anon)
curl -s "$SUPABASE_URL/rest/v1/profiles?select=email,role" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

### Anonymous writes

```bash
curl -i -X POST "$SUPABASE_URL/rest/v1/announcements" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"title":"Probe","message":"should fail"}'
```

Expected: `401`/`403` or an RLS error. No row is created.

### Editor / viewer writes

Get a token:

```bash
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"editor@example.edu","password":"…"}' | jq -r .access_token)
```

- As an **editor**, `PATCH /rest/v1/events?id=eq.<id>` should update allowed
  content but `DELETE` should affect zero rows.
- As a **viewer**, the same `PATCH` should affect zero rows.
- As an **admin**, both succeed.

PostgREST often reports a blocked `PATCH`/`DELETE` as `200`/`204` with an empty
array instead of an error. Always check the returned representation and re-read
the row; do not trust the status code alone.

### Storage

- Anonymous `GET` of a public image URL works.
- A signed-in **viewer** upload is rejected (`403`).
- An **editor** upload of a 3 MB file or a `image/gif` is rejected by the bucket
  limits even if the client check is bypassed with curl.
- `/admin/` is never present in Cache Storage (DevTools → Application → Cache
  Storage), even after visiting it.

## 5. Accessibility and motion

- [ ] Keyboard only: skip link, nav, dialogs, forms, tables and row actions are
      reachable in a sensible order.
- [ ] Focus is visible on every interactive element.
- [ ] Dialogs trap focus and close with Escape.
- [ ] Icon-only buttons have accessible names (`aria-label`/`title`).
- [ ] Colour contrast is readable for body text and status pills.
- [ ] With OS "reduce motion" enabled, large animations and the countdown do not
      rely on motion; no content is lost.
- [ ] The page works at 320 px width and at 200% browser zoom.
- [ ] Form errors are announced/visible and focus the offending field.

## 6. PWA and offline

1. Load the site over HTTPS (or localhost) twice.
2. DevTools → Application → Service Workers: worker is activated and controlling.
3. Application → Manifest: name, icons, start URL and theme colour are correct;
   no install warnings.
4. Install the app, launch it from the home screen, then turn off the network.
5. Confirm cached pages open, cached images render, and the sync bar explains
   the stale data.
6. Clear saved data from `/install.html`; confirm it asks for confirmation and
   that afterwards an offline navigation falls back to `offline.html`.
7. Go offline and open `/admin/`: it shows the "needs a connection" page rather
   than a login form, and `/admin/` never appears in Cache Storage.
8. Deploy a new `VERSION`; confirm the update prompt appears and the page does
   not reload until you accept.

## 7. QR code

- [ ] `/install.html` rejects `localhost` and non-HTTP URLs with a clear message.
- [ ] Generated QR scans on a phone that is not on the same network.
- [ ] The downloaded PNG opens and prints legibly (see `docs/qr-code.md`).
- [ ] A URL longer than the encoder limit fails with an explanation rather than
      drawing an invalid code.

## 8. Performance sanity

- [ ] First load has no render-blocking third-party requests. There are none by
      design.
- [ ] Public pages work with JavaScript modules cached; no layout shift from
      late-injected chrome.
- [ ] Images are under a few hundred KB each; seeded SVGs are tiny.
- [ ] The schedule remains usable with 100+ events (filters are client-side; if
      you expect thousands, paginate or narrow the public query).

## 9. Launch sign-off

- [ ] Sample rows = 0 in the dashboard.
- [ ] Festival dates/timezone confirmed by the organisers.
- [ ] Contacts and social links approved.
- [ ] Every published event has a real date, venue and time.
- [ ] At least one live notice, and cancellation notices for affected events.
- [ ] Public site tested on Android Chrome and iOS Safari.
- [ ] QR code printed and scanned from the final deployed URL.
- [ ] A second organiser can sign in and edit content.
- [ ] Rollback plan agreed (previous deployment + `sw.js` version).
