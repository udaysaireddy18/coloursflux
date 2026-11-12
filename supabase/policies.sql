-- ============================================================================
-- ColoursFlux — Row Level Security
-- ----------------------------------------------------------------------------
-- Run AFTER schema.sql. Every table is locked down here; the browser only ever
-- holds the public anon key, so these policies are the real security boundary.
--
-- Rules in one place:
--   anon / visitors  → published events, published locations, approved vendors,
--                      live offers, unexpired notices, active sponsors.
--   viewer           → read everything in the dashboard.
--   editor           → read everything + create/edit content.
--   admin            → everything, including settings, sponsors and deletes.
--
-- There is deliberately NO insert policy on activity_log: it is written only by
-- the SECURITY DEFINER trigger in schema.sql, which keeps the audit trail
-- trustworthy.
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.app_config    enable row level security;
alter table public.locations     enable row level security;
alter table public.events        enable row level security;
alter table public.vendors       enable row level security;
alter table public.offers        enable row level security;
alter table public.announcements enable row level security;
alter table public.sponsorships  enable row level security;
alter table public.activity_log  enable row level security;

-- ----------------------------------------------------------------------------
-- Role helpers
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER lets these read profiles without tripping the profiles RLS
-- policy (which would otherwise recurse). They only ever return a boolean.
-- ----------------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor', 'viewer')
  );
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_staff()  from public;
revoke all on function public.is_editor() from public;
revoke all on function public.is_admin()  from public;
grant execute on function public.is_staff()  to anon, authenticated;
grant execute on function public.is_editor() to authenticated;
grant execute on function public.is_admin()  to authenticated;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------

drop policy if exists "profiles self read"   on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles admin read"  on public.profiles;
create policy "profiles admin read"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- app_config
-- ----------------------------------------------------------------------------
-- Publicly readable: it only contains festival branding, dates and contacts.
-- Writable by admins only. The singleton is never deleted through the API.
-- ----------------------------------------------------------------------------

drop policy if exists "app_config public read" on public.app_config;
create policy "app_config public read"
  on public.app_config for select
  to anon, authenticated
  using (true);

drop policy if exists "app_config admin insert" on public.app_config;
create policy "app_config admin insert"
  on public.app_config for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "app_config admin update" on public.app_config;
create policy "app_config admin update"
  on public.app_config for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
-- Cancelled events stay visible on purpose: visitors must be able to see that
-- something they planned around was called off. Archived/draft stay private.
-- ----------------------------------------------------------------------------

drop policy if exists "events public read" on public.events;
create policy "events public read"
  on public.events for select
  to anon, authenticated
  using (status in ('published', 'cancelled'));

drop policy if exists "events staff read" on public.events;
create policy "events staff read"
  on public.events for select
  to authenticated
  using (public.is_staff());

drop policy if exists "events editor insert" on public.events;
create policy "events editor insert"
  on public.events for insert
  to authenticated
  with check (public.is_editor());

drop policy if exists "events editor update" on public.events;
create policy "events editor update"
  on public.events for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists "events admin delete" on public.events;
create policy "events admin delete"
  on public.events for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- locations
-- ----------------------------------------------------------------------------

drop policy if exists "locations public read" on public.locations;
create policy "locations public read"
  on public.locations for select
  to anon, authenticated
  using (is_published);

drop policy if exists "locations staff read" on public.locations;
create policy "locations staff read"
  on public.locations for select
  to authenticated
  using (public.is_staff());

drop policy if exists "locations editor insert" on public.locations;
create policy "locations editor insert"
  on public.locations for insert
  to authenticated
  with check (public.is_editor());

drop policy if exists "locations editor update" on public.locations;
create policy "locations editor update"
  on public.locations for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists "locations admin delete" on public.locations;
create policy "locations admin delete"
  on public.locations for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- vendors
-- ----------------------------------------------------------------------------
-- Only approved vendors are public. Pending/rejected rows stay dashboard-only.
-- ----------------------------------------------------------------------------

drop policy if exists "vendors public read" on public.vendors;
create policy "vendors public read"
  on public.vendors for select
  to anon, authenticated
  using (approval_status = 'approved');

drop policy if exists "vendors staff read" on public.vendors;
create policy "vendors staff read"
  on public.vendors for select
  to authenticated
  using (public.is_staff());

drop policy if exists "vendors editor insert" on public.vendors;
create policy "vendors editor insert"
  on public.vendors for insert
  to authenticated
  with check (public.is_editor());

drop policy if exists "vendors editor update" on public.vendors;
create policy "vendors editor update"
  on public.vendors for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists "vendors admin delete" on public.vendors;
create policy "vendors admin delete"
  on public.vendors for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- offers
-- ----------------------------------------------------------------------------
-- An offer is public only while active, unexpired, and tied to an approved
-- vendor. Expired rows are kept for the dashboard. `valid_from` is informational
-- (shown on the card) rather than a hard gate, matching the client query.
-- ----------------------------------------------------------------------------

drop policy if exists "offers public read" on public.offers;
create policy "offers public read"
  on public.offers for select
  to anon, authenticated
  using (
    status = 'active'
    and (valid_until is null or valid_until > now())
    and exists (
      select 1 from public.vendors v
      where v.id = offers.vendor_id and v.approval_status = 'approved'
    )
  );

drop policy if exists "offers staff read" on public.offers;
create policy "offers staff read"
  on public.offers for select
  to authenticated
  using (public.is_staff());

drop policy if exists "offers editor insert" on public.offers;
create policy "offers editor insert"
  on public.offers for insert
  to authenticated
  with check (public.is_editor());

drop policy if exists "offers editor update" on public.offers;
create policy "offers editor update"
  on public.offers for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists "offers admin delete" on public.offers;
create policy "offers admin delete"
  on public.offers for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- announcements
-- ----------------------------------------------------------------------------

drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read"
  on public.announcements for select
  to anon, authenticated
  using (
    status = 'published'
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "announcements staff read" on public.announcements;
create policy "announcements staff read"
  on public.announcements for select
  to authenticated
  using (public.is_staff());

drop policy if exists "announcements editor insert" on public.announcements;
create policy "announcements editor insert"
  on public.announcements for insert
  to authenticated
  with check (public.is_editor());

drop policy if exists "announcements editor update" on public.announcements;
create policy "announcements editor update"
  on public.announcements for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

drop policy if exists "announcements admin delete" on public.announcements;
create policy "announcements admin delete"
  on public.announcements for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- sponsorships — admins only, except the active public placement
-- ----------------------------------------------------------------------------
-- `status` is the authoritative on/off switch. Campaign dates are recorded for
-- the organiser's own reporting and are not used to hide the sponsor.

drop policy if exists "sponsorships public read" on public.sponsorships;
create policy "sponsorships public read"
  on public.sponsorships for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "sponsorships admin read" on public.sponsorships;
create policy "sponsorships admin read"
  on public.sponsorships for select
  to authenticated
  using (public.is_admin());

drop policy if exists "sponsorships admin insert" on public.sponsorships;
create policy "sponsorships admin insert"
  on public.sponsorships for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "sponsorships admin update" on public.sponsorships;
create policy "sponsorships admin update"
  on public.sponsorships for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "sponsorships admin delete" on public.sponsorships;
create policy "sponsorships admin delete"
  on public.sponsorships for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- activity_log — read-only for the team, written by triggers only
-- ----------------------------------------------------------------------------

drop policy if exists "activity staff read" on public.activity_log;
create policy "activity staff read"
  on public.activity_log for select
  to authenticated
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Privileges
-- ----------------------------------------------------------------------------
-- RLS decides which rows are visible; these grants decide which verbs are even
-- attempted. Revoking first keeps the surface small even if a future Supabase
-- default privilege changes.
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on public.profiles      from anon, authenticated;
revoke all on public.app_config    from anon, authenticated;
revoke all on public.locations     from anon, authenticated;
revoke all on public.events        from anon, authenticated;
revoke all on public.vendors       from anon, authenticated;
revoke all on public.offers        from anon, authenticated;
revoke all on public.announcements from anon, authenticated;
revoke all on public.sponsorships  from anon, authenticated;
revoke all on public.activity_log  from anon, authenticated;

-- Visitors (anon): read-only public content.
grant select on public.app_config    to anon, authenticated;
grant select on public.locations     to anon, authenticated;
grant select on public.events        to anon, authenticated;
grant select on public.vendors       to anon, authenticated;
grant select on public.offers        to anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant select on public.sponsorships  to anon, authenticated;

-- Signed-in dashboard users: RLS narrows these down by role.
grant select on public.profiles to authenticated;
grant insert, update, delete on public.profiles to authenticated;

grant insert, update, delete on public.app_config    to authenticated;
grant insert, update, delete on public.locations     to authenticated;
grant insert, update, delete on public.events        to authenticated;
grant insert, update, delete on public.vendors       to authenticated;
grant insert, update, delete on public.offers        to authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant insert, update, delete on public.sponsorships  to authenticated;

grant select on public.activity_log to authenticated;
