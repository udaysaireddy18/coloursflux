# Supabase setup

Four SQL files, run once, in this order. Everything is written for the SQL
Editor of a fresh Supabase project.

| # | File | Creates |
| --- | --- | --- |
| 1 | [`schema.sql`](schema.sql) | Tables, constraints, indexes, `updated_at` triggers, `activity_log` triggers, last-admin guard |
| 2 | [`policies.sql`](policies.sql) | Row Level Security, role helpers (`is_staff`/`is_editor`/`is_admin`), grants |
| 3 | [`storage.sql`](storage.sql) | `festival-media` bucket (public read, 2 MB, PNG/JPEG/WebP) and its policies |
| 4 | [`seed.sql`](seed.sql) | **Optional demo rows**, all flagged `is_sample = true` |

```
schema.sql → policies.sql → storage.sql → seed.sql (demo only)
```

Run each file as a single query. They are idempotent enough to re-run
(`create ... if not exists`, `drop policy if exists`), but `seed.sql` uses
`on conflict do nothing`, so re-running it will not overwrite your edits.

> **Do not run `seed.sql` against production.** It contains invented events,
> vendors, offers and notices. Delete statements are at the top of the file.

## Why the order matters

- `policies.sql` references tables and creates functions used by the storage
  policies. Running it before `schema.sql` fails.
- `storage.sql` calls `public.is_editor()` / `public.is_admin()`, which are
  defined in `policies.sql`.
- Triggers in `schema.sql` write `activity_log` with `SECURITY DEFINER`. There is
  deliberately no insert policy on that table, so the browser can never forge an
  audit entry.

## First admin

Authentication alone grants nothing. An admin needs a row in `public.profiles`.

1. **Authentication → Users → Add user**: email + strong password, confirm the
   email.
2. Copy the new user's UUID.
3. Run:

```sql
insert into public.profiles (id, email, full_name, role)
values ('<auth-user-uuid>', 'organiser@example.edu', 'Festival Lead', 'admin')
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = 'admin';
```

4. Open `/admin/` and sign in.

There is no signup page and no auto-profile trigger on purpose — an unexpected
sign-up can never reach the dashboard.

### Making another organiser

Create the Auth user first, then either assign the role in **Admin → Team** or
run the insert above with `'editor'` / `'viewer'`.

| Role | Rights |
| --- | --- |
| `admin` | Everything, incl. settings, sponsors, team roles, deletes |
| `editor` | Create/edit events, locations, vendors, offers, announcements; upload media |
| `viewer` | Read-only dashboard |

The last admin cannot be demoted or deleted (trigger `guard_last_admin`).

## Auth configuration

- **Authentication → Providers → Email**: enabled.
- **Allow new users to sign up**: off. There is no public account feature.
- Email confirmation may stay on; confirm users manually.
- Password resets are done from the Supabase dashboard. The app has no reset flow.

## Connect the front end

Copy `assets/js/env.example.js` to `assets/js/env.js` and fill in:

```js
export const ENV = {
  SUPABASE_URL: 'https://<project-ref>.supabase.co',
  SUPABASE_ANON_KEY: '<anon-or-publishable-key>',
};
```

Only the **anon / publishable** key belongs in the browser. Never place the
`service_role` key, a database password or a JWT secret in this repository.

## Verifying RLS

```bash
SUPABASE_URL="https://<ref>.supabase.co"
ANON="<anon-key>"

# public rows only
curl -s "$SUPABASE_URL/rest/v1/events?select=title,status" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# must be empty for anon
curl -s "$SUPABASE_URL/rest/v1/profiles?select=email,role" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# must be rejected
curl -i -X POST "$SUPABASE_URL/rest/v1/events" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"title":"Probe","slug":"probe","event_date":"2027-01-07"}'
```

The full matrix, including editor/viewer write probes and storage limits, is in
[`../docs/testing.md`](../docs/testing.md).

## Schema notes

- `app_config` is a singleton (`id = 'app'`). `festival_start` drives the public
  countdown; it is never hardcoded.
- `events.status`: `draft`, `published`, `cancelled`, `archived`. Cancelled
  events stay publicly visible with a warning; archived ones disappear.
- `vendors.approval_status`: `pending`, `approved`, `rejected`.
- `offers.status`: `draft`, `active`, `expired`. `valid_until` is the public gate.
- `announcements.status`: `draft`, `published`, `archived`. Publish time is
  stamped by a trigger when left blank.
- `sponsorships.status`: `draft`, `active`, `ended`. `is_paid` is a manually
  verified flag — the app processes no payments.
- `locations.map_x` / `map_y` are percentages on a stylised map, not surveyed
  coordinates. `latitude`/`longitude` are optional.
- `activity_log` is written only by triggers and readable by staff.

Adding a table means adding: the table + `updated_at` trigger + activity trigger
in `schema.sql`, RLS policies and grants in `policies.sql`, and a resource
definition in `assets/js/admin/schemas.js`.
