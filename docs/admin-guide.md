# Admin guide

The dashboard lives at `/admin/`. It is a real editor backed by Supabase — not a
mock. It requires a network connection and an account with a role.

## Signing in

1. Open `https://<your-site>/admin/`.
2. Use the email and password created for you in Supabase Authentication.
3. If you see **"No dashboard role"**, the Auth account exists but no
   `profiles` row does. Ask an admin to add you, or run the SQL in the README.

There is no public sign-up and no password-reset email built into this project.
Reset passwords from Supabase *Authentication → Users*.

Sessions refresh automatically. If your access token expires and the refresh
fails, the dashboard signs you out and asks you to sign in again rather than
showing stale data.

## Roles at a glance

| | Viewer | Editor | Admin |
| --- | --- | --- | --- |
| View dashboard | ✓ | ✓ | ✓ |
| Create/edit events, locations, vendors, offers, notices | | ✓ | ✓ |
| Upload images | | ✓ | ✓ |
| Delete content | | | ✓ |
| Sponsors | | | ✓ |
| Settings | | | ✓ |
| Team roles | | | ✓ |

Buttons are hidden for roles that cannot use them, and RLS rejects the request
even if someone bypasses the UI. You cannot change your own role from the
dashboard, and the last admin cannot be demoted or deleted.

## The overview screen

- **Stat cards** — published vs total events, drafts, vendors pending approval,
  active offers and live notices.
- **Next on the schedule** — the next five published events from today.
- **Recent activity** — confirmed inserts, updates and deletes, with the account
  that made them. This feed is written by database triggers, so a failed save
  never appears here.
- **Festival setup** — current dates, timezone, data version and last load time.
- **Launch checklist** — a reminder list, not an automated audit.

The **Reload** button in the header refetches every collection. Use it if
another organiser changed content while your tab was open.

## Publishing an event

1. **Events → New event**.
2. Fill in:
   - **Title** — public headline.
   - **URL slug** — generated from the title; lowercase letters, numbers and
     single hyphens. It forms `event.html?slug=…`. Changing it breaks old shared
     links, so set it once.
   - **Description** — what visitors need to know, not internal notes.
   - **Category** — used for filters and colour coding.
   - **Date, start and end time** — end must be after start; overnight events
     are not supported by the public schedule.
   - **Venue** — pick a location, or leave blank for "Venue TBA".
   - **Image** — upload PNG/JPEG/WebP (2 MB max) or paste a URL.
   - **Status** — `draft`, `published`, `cancelled` or `archived`.
   - **Feature on the home page** — puts the event in the featured row.
3. Use **Preview** to check the content before saving. Preview is a rendering of
   the record, not the live public page.
4. **Create** / **Save changes**.

Status behaviour:

- **Draft** — dashboard only.
- **Published** — visible on the home page, schedule and event page.
- **Cancelled** — stays visible with a cancellation warning. Use this instead of
  deleting when people may already have planned around it.
- **Archived** — hidden from visitors. Use after the festival or for mistakes.

Quick actions in the table: publish/unpublish, feature/unfeature, cancel and
archive. Each runs immediately against the database and asks for confirmation
where it matters.

## Managing locations and the map

**Locations** are shared by events and vendors. Set:

- **Name** and **description** — shown on the map list and cards.
- **Type** — stage, food, venue, sports, service, parking or other. Drives the
  icon and filter.
- **Map X/Y (%)** — position on the stylised map (`0` = left/top, `100` =
  right/bottom). The supplied map is a guide, not a surveyed campus plan.
- **Latitude/longitude** — optional. Only add verified coordinates; blank is
  better than wrong. When present, the map can offer an "Open in maps" link.
- **Show on the public campus map** — publish only locations visitors should
  see.

Unpublished locations can still be attached to draft events; the public event
page will show "Venue TBA" until the location is published.

## Vendors and offers

### Vendors

- **Approval status** — only `approved` vendors appear publicly. Keep new
  applications on `pending` until checked.
- **Featured placement** — labels the vendor as promoted. Do not imply editorial
  endorsement.
- **Featured until** — optional expiry. Leave blank for no expiry.
- **Opening hours** and **contact link** are optional public information.
- **Category** controls the filter on the stalls page.

Rejecting a vendor hides them publicly without deleting their record. Deleting
is admin-only and irreversible.

### Offers

- Choose the **vendor** (required), a clear **title** and the offer details.
- **Valid from / Valid until** are timestamps in the festival timezone.
- **Status** must be `active` for the offer to appear. An offer also disappears
  automatically after `valid_until`, and stays hidden if its vendor is not
  approved.
- Never advertise a discount as guaranteed if the vendor has not agreed to it.

There is **no payment processing** anywhere in this app. Prices and tiers are
illustrative text.

## Announcements

Use notices for changes visitors must see: timing, venue, cancellation, safety,
transport. Keep them short and actionable.

- **Priority** — `urgent`, `high`, `normal` or `low`. Reserve urgent for real
  problems.
- **Status** — `draft`, `published` or `archived`.
- **Publish time** — stamped automatically when you publish from the table if
  left blank.
- **Expires at** — optional. Expired notices vanish from the public site but
  stay in the dashboard.

Publishing is a quick action with a confirmation-free single click; the
activity feed records it. Unpublishing and archiving ask for confirmation.

## Sponsors

Admin-only. Record the sponsor name, optional logo, placement, campaign dates,
campaign status and whether payment has been **manually verified**.

- Only `active` rows appear publicly.
- `is_paid` is an internal record. Never tick it without real proof of payment.
- The demo pricing tiers are placeholders and are not enforced by the database.

## Settings

**Settings** edits the single `app_config` row:

| Field | Effect |
| --- | --- |
| Festival name | Footer, about page and metadata context |
| Tagline | Hero/footer copy |
| Festival start / end | **Start drives the public countdown** |
| Timezone | IANA zone used to render dates and times, e.g. `Asia/Kolkata` |
| Logo | Optional; falls back to the built-in wordmark |
| Contact email / phone | Only shown when filled in |
| Social links | One per line: `Label | https://url | icon-name` |
| Data version | Increment after a large content refresh so clients detect change |

Dates are stored as timestamps. Enter them in the campus timezone; the form
converts to UTC for storage and back for editing. If the start date is invalid,
the public countdown says so instead of inventing a timer.

Static branding (app name, institution, storage bucket limits, default tagline)
lives in `assets/js/config.js` and is intentionally not editable from the
database.

## Team

- New organisers must first exist in **Supabase → Authentication → Users**.
- Then change their role here: Admin, Editor or Viewer.
- The roles apply immediately on their next request; existing sessions do not
  need to be recreated, but the dashboard may need a reload.
- Your own role select is disabled. Ask another admin if you need it changed.
- Removing the last admin fails at the database level.

The "Authentication dashboard" button opens Supabase in a new tab. It is a
convenience link, not an embedded user manager.

## Images

- Formats: PNG, JPEG, WebP.
- Maximum: 2 MB per file (client and bucket both enforce it).
- Uploads go to the public `festival-media` bucket under a folder named after
  the content type (`events`, `vendors`, `sponsors`, `branding`, `misc`).
- Only editors/admins can upload; only admins can delete objects in Supabase.
- Seeded rows use bundled relative paths (`assets/img/art/…`). Those are valid
  in the editor and preview; replace them with real uploads when available.
- Prefer landscape images around 1600×900 for event covers. Logos look best on a
  transparent or dark background.

If an upload fails, check the file type/size first, then the storage policies in
`supabase/storage.sql`, then your connection.

## Removing sample content

The dashboard shows a warning with the number of rows where `is_sample = true`.
Before launch:

1. Replace sample events, vendors, offers and notices with real content, or
   delete them.
2. Keep at least one published event and one published notice so the home page
   is not empty.
3. Clear the flag on `app_config` if you kept the row:
   `update public.app_config set is_sample = false where id = 'app';`
4. Confirm the public "Sample records" strip is gone.

`supabase/seed.sql` ends with the delete statements in dependency order.

## Working offline

The dashboard is network-only. If you lose signal:

- You can still read what is currently rendered, but saves will fail.
- Do not assume a change was saved because the form closed — it will not close
  on failure.
- Reconnect, use **Reload**, and re-apply the change.

The public site can be used offline after a visit or an explicit download. That
is separate from the dashboard and never includes drafts or unapproved vendors.

## Content quality checklist

- [ ] Dates, times and venues match the final programme.
- [ ] Cancellations are marked cancelled, not deleted.
- [ ] Vendor approvals are current; no pending vendor is publicly visible.
- [ ] Offers have an end time and the vendor has agreed to them.
- [ ] Announcements are short, specific and have an expiry where relevant.
- [ ] No sample rows, placeholder contacts or invented approvals remain.
- [ ] Images are compressed, correctly oriented and free to use.
- [ ] You have previewed the home page and one event page on a phone.
