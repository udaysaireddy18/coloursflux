-- ============================================================================
-- ColoursFlux — DEMO SEED DATA (do not run in production)
-- ----------------------------------------------------------------------------
-- Run AFTER schema.sql, policies.sql and storage.sql, in a fresh project, if
-- you want the dashboard and public site populated while you build the real
-- programme.
--
-- Every row below is flagged `is_sample = true`, and the public site shows a
-- "Sample records" strip while any such row is loaded. Dates, vendors, prices
-- and notices are illustrative placeholders for Colours 2K27 — they are NOT
-- confirmed festival information. Delete or replace them before launch:
--
--   delete from public.events        where is_sample;
--   delete from public.offers        where is_sample;  -- before vendors
--   delete from public.vendors       where is_sample;
--   delete from public.locations     where is_sample;
--   delete from public.announcements where is_sample;
--   delete from public.sponsorships  where is_sample;
--   update public.app_config set is_sample = false where id = 'app';
--
-- Images use the bundled SVG artwork so the seed works without uploading
-- anything. Replace them from Admin → any image field when real artwork exists.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Festival configuration
-- ----------------------------------------------------------------------------

insert into public.app_config (
  id, festival_name, tagline, festival_start, festival_end, timezone,
  logo_url, contact_email, contact_phone, social_links, data_version, is_sample
) values (
  'app',
  'Colours 2K27',
  'Feel the Flow. Live the Colours.',
  '2027-01-07T10:00:00+05:30',
  '2027-01-09T23:00:00+05:30',
  'Asia/Kolkata',
  '',
  '',
  '',
  '[]'::jsonb,
  1,
  true
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Locations
-- ----------------------------------------------------------------------------

insert into public.locations
  (id, name, location_type, description, map_x, map_y, is_published, is_sample)
values
  ('11111111-1111-4111-8111-000000000001', 'Main Stage', 'stage',
   'Headline concerts, DJ nights and the closing ceremony.', 50, 30, true, true),
  ('11111111-1111-4111-8111-000000000002', 'Cultural Stage', 'stage',
   'Dance, theatre and classical performances.', 24, 42, true, true),
  ('11111111-1111-4111-8111-000000000003', 'Food Court', 'food',
   'Food stalls, beverages and seating area.', 72, 52, true, true),
  ('11111111-1111-4111-8111-000000000004', 'Tech Block A', 'venue',
   'Technical events, workshops and hackathon rooms.', 30, 70, true, true),
  ('11111111-1111-4111-8111-000000000005', 'Sports Ground', 'sports',
   'Outdoor sports and the campus carnival zone.', 82, 26, true, true),
  ('11111111-1111-4111-8111-000000000006', 'Central Lawn', 'venue',
   'Open-air hangout zone and photo spots.', 55, 62, true, true),
  ('11111111-1111-4111-8111-000000000007', 'Registration Desk', 'service',
   'Pass collection and help desk near the main gate.', 16, 20, true, true),
  ('11111111-1111-4111-8111-000000000008', 'North Parking', 'parking',
   'Two-wheeler and four-wheeler parking, subject to campus approval.', 88, 74, true, true),
  ('11111111-1111-4111-8111-000000000009', 'Restrooms — Block C', 'service',
   'Accessible restrooms next to the cultural stage.', 18, 58, true, true),
  ('11111111-1111-4111-8111-000000000010', 'Central Library', 'venue',
   'Literary events and quiet zone.', 68, 78, true, true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Events
-- ----------------------------------------------------------------------------

insert into public.events
  (id, title, slug, description, category, event_date, start_time, end_time,
   location_id, image_url, status, featured, is_sample)
values
  ('22222222-2222-4222-8222-000000000001', 'Event 1',
   'neon-waves-opening-concert',
   'The festival opens with a full-stage light show, a live band and the first wave of ColoursFlux visuals. Gates open 30 minutes before the show.',
   'music', '2027-01-07', '18:00', '21:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/art/wave-purple.svg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000002', 'Event 2', 'flux-dance-battle',
   'Crews from across the campus go head to head. Open to registered teams; spectators welcome.',
   'dance', '2027-01-07', '14:00', '17:00',
   '11111111-1111-4111-8111-000000000002', 'assets/img/art/wave-magenta.svg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000003', 'Event 3', 'build-night-hack',
   'A student hackathon with mentors from the tech community. Bring your own laptop; power and Wi-Fi provided on site.',
   'tech', '2027-01-08', '09:00', '21:00',
   '11111111-1111-4111-8111-000000000004', 'assets/img/art/wave-cyan.svg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000004', 'Event 4', 'street-food-trail',
   'A guided walk across the food court with student vendors and local partners. Pay per stall.',
   'food', '2027-01-08', '12:00', '16:00',
   '11111111-1111-4111-8111-000000000003', 'assets/img/art/wave-amber.svg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000005', 'Event 5', 'canvas-and-code',
   'Generative art showcase where design students and coders present interactive installations.',
   'arts', '2027-01-08', '16:30', '19:00',
   '11111111-1111-4111-8111-000000000006', 'assets/img/art/wave-magenta.svg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000006', 'Event 6', 'improv-night',
   'Short-form improv sets from the campus theatre society. Audience prompts encouraged.',
   'theatre', '2027-01-08', '19:30', '21:00',
   '11111111-1111-4111-8111-000000000002', 'assets/img/art/wave-purple.svg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000007', 'Event 7', 'dj-set-afterglow',
   'Closing night dance set with a visual mapping show. Subject to sound-permission timings.',
   'music', '2027-01-09', '20:00', '23:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/art/wave-cyan.svg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000008', 'Event 8', 'campus-cricket-cup',
   'Inter-department knockout tournament. Reporting time 30 minutes before the first match.',
   'sports', '2027-01-09', '08:00', '13:00',
   '11111111-1111-4111-8111-000000000005', 'assets/img/art/wave-emerald.svg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000009', 'Event 9', 'slam-poetry-open-mic',
   'Sign-up on the day at the library desk. Three minutes per performer.',
   'literature', '2027-01-09', '15:00', '17:00',
   '11111111-1111-4111-8111-000000000010', 'assets/img/art/wave-purple.svg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000010', 'Event 10', 'closing-ceremony',
   'Prize distribution, sponsor acknowledgements and the festival close-out.',
   'music', '2027-01-09', '17:30', '19:30',
   '11111111-1111-4111-8111-000000000001', 'assets/img/art/wave-magenta.svg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000011', 'Event 11', 'robotics-demo-arena',
   'Student robotics teams run live demos. Cancellation notice will appear here if the venue changes.',
   'tech', '2027-01-08', '11:00', '14:00',
   '11111111-1111-4111-8111-000000000004', 'assets/img/art/wave-emerald.svg',
   'cancelled', false, true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Vendors
-- ----------------------------------------------------------------------------

insert into public.vendors
  (id, name, category, description, location_id, image_url, contact_url,
   opening_hours, approval_status, is_featured, featured_until, is_sample)
values
  ('33333333-3333-4333-8333-000000000001', 'Stall 1', 'food',
   'Cold brew, filter coffee and festival specials brewed on site.',
   '11111111-1111-4111-8111-000000000003', 'assets/img/art/vendor-coffee.svg',
   '', '11 AM – 10 PM', 'approved', true, '2027-01-15T00:00:00+05:30', true),

  ('33333333-3333-4333-8333-000000000002', 'Stall 2', 'fashion',
   'Hand-printed tees, tote bags and campus merch from student designers.',
   '11111111-1111-4111-8111-000000000006', 'assets/img/art/vendor-fashion.svg',
   '', '11 AM – 9 PM', 'approved', true, '2027-01-15T00:00:00+05:30', true),

  ('33333333-3333-4333-8333-000000000003', 'Stall 3', 'tech',
   'On-demand 3D prints, custom keychains and mini figure printing.',
   '11111111-1111-4111-8111-000000000004', 'assets/img/art/vendor-tech.svg',
   '', '10 AM – 8 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000004', 'Stall 4', 'art',
   'Handmade ceramics, painted magnets and a make-your-own mini workshop.',
   '11111111-1111-4111-8111-000000000006', 'assets/img/art/vendor-art.svg',
   '', '11 AM – 8 PM', 'approved', true, '2027-01-09T00:00:00+05:30', true),

  ('33333333-3333-4333-8333-000000000005', 'Stall 5', 'food',
   'Steamed and fried momos with three house chutneys. Vegetarian options available.',
   '11111111-1111-4111-8111-000000000003', 'assets/img/art/vendor-food.svg',
   '', '12 PM – 11 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000006', 'Stall 6', 'merch',
   'Vinyl stickers, enamel pins and festival lanyards.',
   '11111111-1111-4111-8111-000000000006', 'assets/img/art/vendor-merch.svg',
   '', '11 AM – 9 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000007', 'Stall 7', 'other',
   'Second-hand books, zines and student publications.',
   '11111111-1111-4111-8111-000000000010', 'assets/img/art/vendor-books.svg',
   '', '10 AM – 6 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000008', 'Stall 8', 'fashion',
   'Festival makeup, hair braiding and photo-ready touch-ups. Pending organiser approval.',
   '11111111-1111-4111-8111-000000000002', 'assets/img/art/vendor-fashion.svg',
   '', '2 PM – 10 PM', 'pending', false, null, true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Offers
-- ----------------------------------------------------------------------------

insert into public.offers
  (id, vendor_id, title, description, valid_from, valid_until, status, is_sample)
values
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000001',
   'Buy 1 get 1 cold brew',
   'Valid on all cold brew sizes between 2 PM and 4 PM.',
   '2027-01-07T00:00:00+05:30', '2027-01-09T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000002', '33333333-3333-4333-8333-000000000002',
   '10% off campus merch',
   'Show your festival pass at the counter.',
   '2027-01-07T00:00:00+05:30', '2027-01-09T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000003', '33333333-3333-4333-8333-000000000004',
   'Free mini magnet',
   'With any ceramic purchase above ₹499.',
   '2027-01-07T00:00:00+05:30', '2027-01-08T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000004', '33333333-3333-4333-8333-000000000005',
   'Student combo ₹99',
   'Six momos plus a soft drink. Valid with student ID.',
   '2027-01-07T00:00:00+05:30', '2027-01-09T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000005', '33333333-3333-4333-8333-000000000003',
   'Free keychain on 3D print',
   'One keychain per order while stocks last.',
   '2027-01-01T00:00:00+05:30', '2027-01-05T23:59:00+05:30', 'expired', true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Announcements
-- ----------------------------------------------------------------------------

insert into public.announcements
  (id, title, message, priority, status, published_at, expires_at, is_sample)
values
  ('55555555-5555-4555-8555-000000000001', 'Festival gates open at 4 PM',
   'Registration and the main gate open at 4 PM on day one. Carry a valid student ID for pass verification.',
   'normal', 'published', '2027-01-06T10:00:00+05:30', '2027-01-10T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000002', 'Event 11 cancelled',
   'Event 11, scheduled for day two, has been cancelled due to venue unavailability. Refunds are not applicable as the event was free.',
   'high', 'published', '2027-01-05T18:30:00+05:30', '2027-01-10T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000003', 'New stall: Stall 6',
   'Stall 6 has joined the Central Lawn stall row with festival lanyards and pins.',
   'normal', 'published', '2027-01-04T12:00:00+05:30', null, true),

  ('55555555-5555-4555-8555-000000000004', 'Shuttle timing update',
   'The evening shuttle now leaves the north parking gate every 20 minutes from 6 PM to 11 PM. This is a sample notice — confirm real transport details with the organiser.',
   'high', 'published', '2027-01-03T09:15:00+05:30', '2027-01-10T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000005', 'Event 7 moved to 8 PM',
   'Event 7 will now start at 8 PM instead of 7:30 PM. The venue is unchanged.',
   'urgent', 'published', '2027-01-02T20:00:00+05:30', '2027-01-10T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000006', 'Lost & found desk',
   'A lost and found desk operates at the registration counter during festival hours.',
   'low', 'published', '2027-01-01T11:00:00+05:30', null, true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Sponsorships (illustrative placements only)
-- ----------------------------------------------------------------------------

insert into public.sponsorships
  (id, sponsor_name, logo_url, placement, campaign_start, campaign_end, status, is_paid, is_sample)
values
  ('66666666-6666-4666-8666-000000000001', 'Nova Foods', '',
   'home_strip', '2027-01-01', '2027-01-31', 'active', true, true),
  ('66666666-6666-4666-8666-000000000002', 'Bluewave Audio', '',
   'home_strip', '2027-01-01', '2027-01-31', 'active', true, true),
  ('66666666-6666-4666-8666-000000000003', 'Campus Print Co.', '',
   'stalls_banner', '2027-01-02', '2027-01-15', 'active', false, true)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- First admin
-- ----------------------------------------------------------------------------
-- Intentionally not seeded: profiles reference auth.users, and creating a user
-- from SQL would bypass Supabase Auth. Do this once by hand instead:
--
--   1. Supabase Dashboard → Authentication → Users → "Add user"
--      (email + password, email confirmed).
--   2. Copy the user's UUID and run:
--
--        insert into public.profiles (id, email, full_name, role)
--        values ('<auth-user-uuid>', 'organiser@example.edu', 'Festival Lead', 'admin')
--        on conflict (id) do update set role = 'admin';
--
--   3. Sign in at /admin/ with those credentials.
-- ----------------------------------------------------------------------------
