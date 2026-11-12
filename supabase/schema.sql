-- ============================================================================
-- ColoursFlux — database schema
-- ----------------------------------------------------------------------------
-- Run this FIRST in the Supabase SQL editor, then policies.sql, then
-- storage.sql. seed.sql is optional demo content and must not be run against a
-- production project.
--
-- Design notes
--  * Every content table carries `is_sample`, so seeded demo rows are visible to
--    organisers and can be filtered/removed before launch.
--  * `activity_log` is written by triggers, never by the browser, which gives
--    the dashboard a truthful "recent activity" feed.
--  * All money figures shown by the site are illustrative only. There is no
--    payment table or payment processing anywhere in this schema.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Shared helpers
-- ----------------------------------------------------------------------------

-- Keep `updated_at` honest without trusting the client.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — dashboard roles (separate from auth.users)
-- ----------------------------------------------------------------------------
-- A row here is REQUIRED for dashboard access. Authentication alone grants
-- nothing, so a leaked public sign-up cannot reach the admin UI.
-- Roles:
--   admin  — everything, including settings, sponsors and team roles
--   editor — create/edit events, locations, vendors, offers, announcements
--   viewer — read-only dashboard access
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'viewer'
              check (role in ('admin', 'editor', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Dashboard roles. Access requires a row here; public sign-ups never grant access.';

-- ----------------------------------------------------------------------------
-- app_config — one singleton row that drives the public festival settings
-- ----------------------------------------------------------------------------

create table if not exists public.app_config (
  id            text primary key default 'app' check (id = 'app'),
  festival_name text not null default 'Colours 2K27',
  tagline       text,
  festival_start timestamptz not null,
  festival_end   timestamptz not null,
  timezone      text not null default 'Asia/Kolkata',
  logo_url      text,
  contact_email text,
  contact_phone text,
  -- [{"label":"Instagram","url":"https://…","icon":"instagram"}, …]
  social_links  jsonb not null default '[]'::jsonb
                check (jsonb_typeof(social_links) = 'array'),
  data_version  integer not null default 0 check (data_version >= 0),
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint app_config_dates check (festival_end > festival_start)
);

comment on table public.app_config is
  'Single row (id = ''app''). festival_start drives the public countdown; it is never hardcoded.';

-- ----------------------------------------------------------------------------
-- locations — campus map pins
-- ----------------------------------------------------------------------------

create table if not exists public.locations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 120),
  description    text,
  location_type  text not null default 'venue'
                 check (location_type in ('stage', 'food', 'venue', 'sports', 'service', 'parking', 'other')),
  -- Percentage positions on the stylised campus map. The map is a guide, not a
  -- surveyed campus layout; do not present these as official coordinates.
  map_x          numeric(5, 2) check (map_x is null or (map_x >= 0 and map_x <= 100)),
  map_y          numeric(5, 2) check (map_y is null or (map_y >= 0 and map_y <= 100)),
  latitude       double precision check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude      double precision check (longitude is null or (longitude >= -180 and longitude <= 180)),
  is_published   boolean not null default false,
  is_sample      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- events — schedule
-- ----------------------------------------------------------------------------

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 160),
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description  text,
  category     text not null default 'other'
               check (category in ('music', 'dance', 'theatre', 'tech', 'arts', 'sports',
                                   'food', 'literature', 'fashion', 'art', 'merch', 'other')),
  event_date   date not null,
  start_time   time,
  end_time     time,
  location_id  uuid references public.locations (id) on delete set null,
  image_url    text,
  status       text not null default 'draft'
               check (status in ('draft', 'published', 'cancelled', 'archived')),
  featured     boolean not null default false,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Events spanning midnight are not supported by the public schedule.
  constraint events_time_order
    check (end_time is null or start_time is null or end_time > start_time)
);

comment on column public.events.status is
  'Cancelled events stay publicly visible with a warning. Archived events are hidden.';

-- ----------------------------------------------------------------------------
-- vendors — stalls
-- ----------------------------------------------------------------------------

create table if not exists public.vendors (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 120),
  description     text,
  category        text not null default 'other'
                  check (category in ('food', 'fashion', 'art', 'tech', 'merch', 'other')),
  location_id     uuid references public.locations (id) on delete set null,
  image_url       text,
  contact_url     text check (contact_url is null or contact_url ~* '^https?://'),
  opening_hours   text,
  approval_status text not null default 'pending'
                  check (approval_status in ('pending', 'approved', 'rejected')),
  is_featured     boolean not null default false,
  featured_until  timestamptz,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.vendors.is_featured is
  'Promoted placement. The public UI labels featured vendors so they are not mistaken for editorial picks.';

-- ----------------------------------------------------------------------------
-- offers — time-limited vendor offers (no payment processing)
-- ----------------------------------------------------------------------------

create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid not null references public.vendors (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 160),
  description text,
  valid_from  timestamptz,
  valid_until timestamptz,
  status      text not null default 'draft'
              check (status in ('draft', 'active', 'expired')),
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint offers_validity
    check (valid_until is null or valid_from is null or valid_until > valid_from)
);

-- ----------------------------------------------------------------------------
-- announcements — notices
-- ----------------------------------------------------------------------------

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 140),
  message      text not null,
  priority     text not null default 'normal'
               check (priority in ('urgent', 'high', 'normal', 'low')),
  status       text not null default 'draft'
               check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  expires_at   timestamptz,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint announcements_expiry
    check (expires_at is null or published_at is null or expires_at > published_at)
);

-- Publishing a notice always stamps a real publish time, even if the editor
-- left the field blank. This keeps ordering and "time ago" truthful.
create or replace function public.stamp_announcement_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- sponsorships — sponsor placements, verified manually
-- ----------------------------------------------------------------------------

create table if not exists public.sponsorships (
  id             uuid primary key default gen_random_uuid(),
  sponsor_name   text not null check (char_length(sponsor_name) between 1 and 120),
  logo_url       text,
  placement      text not null default 'home_strip'
                 check (placement in ('home_strip', 'stalls_banner', 'events_banner')),
  campaign_start date,
  campaign_end   date,
  status         text not null default 'draft'
                 check (status in ('draft', 'active', 'ended')),
  is_paid        boolean not null default false,
  is_sample      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint sponsorships_campaign_order
    check (campaign_end is null or campaign_start is null or campaign_end >= campaign_start)
);

comment on column public.sponsorships.is_paid is
  'Manually verified payment flag. The app never processes payments; never set this without proof of payment.';

-- ----------------------------------------------------------------------------
-- activity_log — truthful change history for the dashboard
-- ----------------------------------------------------------------------------

create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  summary     text,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  created_at  timestamptz not null default now()
);

-- Generic trigger body. It uses to_jsonb() so one function works for every
-- content table, including tables that do not have a `title` column.
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload     jsonb;
  row_id      text;
  label       text;
  actor       uuid := auth.uid();
  actor_mail  text;
  claims      jsonb;
begin
  if tg_op = 'DELETE' then
    payload := to_jsonb(old);
    row_id := payload ->> 'id';
  else
    payload := to_jsonb(new);
    row_id := payload ->> 'id';
  end if;

  label := coalesce(
    nullif(payload ->> 'title', ''),
    nullif(payload ->> 'name', ''),
    nullif(payload ->> 'sponsor_name', ''),
    nullif(payload ->> 'email', ''),
    row_id
  );

  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := null;
  end;

  select p.email into actor_mail from public.profiles p where p.id = actor;
  actor_mail := coalesce(actor_mail, claims ->> 'email');

  insert into public.activity_log (table_name, row_id, action, summary, actor_id, actor_email)
  values (
    tg_table_name,
    row_id,
    tg_op,
    format('%s %s "%s"', initcap(tg_op), replace(tg_table_name, '_', ' '), coalesce(label, 'record')),
    actor,
    actor_mail
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- The API/trigger functions run as the table owner, so revoke any accidental
-- public execute rights on the logging helper.
revoke all on function public.log_activity() from public;

-- ----------------------------------------------------------------------------
-- Guard: never allow the last admin to be demoted or deleted
-- ----------------------------------------------------------------------------

create or replace function public.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.role = 'admin' and new.role <> 'admin'
       and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'At least one admin account is required.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'admin'
       and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'At least one admin account is required.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_last_admin() from public;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_guard_last_admin on public.profiles;
create trigger profiles_guard_last_admin
  before update or delete on public.profiles
  for each row execute function public.guard_last_admin();

drop trigger if exists app_config_touch on public.app_config;
create trigger app_config_touch
  before update on public.app_config
  for each row execute function public.touch_updated_at();

drop trigger if exists locations_touch on public.locations;
create trigger locations_touch
  before update on public.locations
  for each row execute function public.touch_updated_at();

drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists vendors_touch on public.vendors;
create trigger vendors_touch
  before update on public.vendors
  for each row execute function public.touch_updated_at();

drop trigger if exists offers_touch on public.offers;
create trigger offers_touch
  before update on public.offers
  for each row execute function public.touch_updated_at();

drop trigger if exists announcements_touch on public.announcements;
create trigger announcements_touch
  before update on public.announcements
  for each row execute function public.touch_updated_at();

drop trigger if exists announcements_publish_time on public.announcements;
create trigger announcements_publish_time
  before insert or update on public.announcements
  for each row execute function public.stamp_announcement_published_at();

drop trigger if exists sponsorships_touch on public.sponsorships;
create trigger sponsorships_touch
  before update on public.sponsorships
  for each row execute function public.touch_updated_at();

-- Activity triggers (one per table the dashboard edits).
drop trigger if exists profiles_activity on public.profiles;
create trigger profiles_activity
  after insert or update or delete on public.profiles
  for each row execute function public.log_activity();

drop trigger if exists app_config_activity on public.app_config;
create trigger app_config_activity
  after insert or update or delete on public.app_config
  for each row execute function public.log_activity();

drop trigger if exists locations_activity on public.locations;
create trigger locations_activity
  after insert or update or delete on public.locations
  for each row execute function public.log_activity();

drop trigger if exists events_activity on public.events;
create trigger events_activity
  after insert or update or delete on public.events
  for each row execute function public.log_activity();

drop trigger if exists vendors_activity on public.vendors;
create trigger vendors_activity
  after insert or update or delete on public.vendors
  for each row execute function public.log_activity();

drop trigger if exists offers_activity on public.offers;
create trigger offers_activity
  after insert or update or delete on public.offers
  for each row execute function public.log_activity();

drop trigger if exists announcements_activity on public.announcements;
create trigger announcements_activity
  after insert or update or delete on public.announcements
  for each row execute function public.log_activity();

drop trigger if exists sponsorships_activity on public.sponsorships;
create trigger sponsorships_activity
  after insert or update or delete on public.sponsorships
  for each row execute function public.log_activity();

-- ----------------------------------------------------------------------------
-- Indexes for the queries the app actually runs
-- ----------------------------------------------------------------------------

create index if not exists events_public_idx
  on public.events (event_date, start_time)
  where status in ('published', 'cancelled');

create index if not exists events_location_idx on public.events (location_id);
create index if not exists events_featured_idx on public.events (featured) where status = 'published';

create index if not exists locations_public_idx on public.locations (name) where is_published;
create index if not exists vendors_public_idx on public.vendors (name) where approval_status = 'approved';
create index if not exists vendors_location_idx on public.vendors (location_id);
create index if not exists offers_public_idx on public.offers (vendor_id, created_at desc) where status = 'active';
create index if not exists announcements_public_idx
  on public.announcements (published_at desc)
  where status = 'published';
create index if not exists sponsorships_public_idx
  on public.sponsorships (placement, created_at desc)
  where status = 'active';
create index if not exists activity_log_recent_idx on public.activity_log (created_at desc);
