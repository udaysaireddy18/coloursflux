-- ============================================================================
-- ColoursFlux — festival seed data
-- ----------------------------------------------------------------------------
-- Run AFTER schema.sql, policies.sql and storage.sql in a fresh project.
--
-- This seed mirrors the official "Schedule of Events" PDF: CREO, cultural and
-- sports events on 9–11 January 2027, using the Aditya University campus map
-- for venue positions.
--
-- Rows are flagged `is_sample = true` so the dashboard can tell they came from
-- this bundled seed rather than hand entry. Remove the flag once the programme
-- is confirmed:
--
--   update public.events     set is_sample = false;
--   update public.locations  set is_sample = false;
--   update public.announcements set is_sample = false;
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
  '2027-01-09T09:00:00+05:30',
  '2027-01-11T18:00:00+05:30',
  'Asia/Kolkata',
  '',
  '',
  '+91 96660 66844',
  '[]'::jsonb,
  2,
  true
)
on conflict (id) do update set
  festival_name = excluded.festival_name,
  tagline = excluded.tagline,
  festival_start = excluded.festival_start,
  festival_end = excluded.festival_end,
  contact_phone = excluded.contact_phone,
  data_version = excluded.data_version;

-- ----------------------------------------------------------------------------
-- Reset previous bundled seed rows
-- ----------------------------------------------------------------------------
-- Keeps the seed idempotent and removes the older placeholder programme
-- (Event 1–11) when re-running it against an existing demo project.

delete from public.offers        where is_sample;
delete from public.events        where is_sample;
delete from public.vendors       where is_sample;
delete from public.locations     where is_sample;
delete from public.announcements where is_sample;
delete from public.sponsorships  where is_sample;

-- ----------------------------------------------------------------------------
-- Locations — Aditya University campus map
-- ----------------------------------------------------------------------------

insert into public.locations
  (id, name, location_type, description, map_x, map_y, is_published, is_sample)
values
  ('11111111-1111-4111-8111-000000000001', 'Ratan Tata Bhavan (RTB)', 'venue',
   'CREO and cultural rooms — RTB-210, RTB-212 and RTB Seminar Hall-411.', 17, 19, true, true),
  ('11111111-1111-4111-8111-000000000002', 'Cotton Bhavan (CB)', 'venue',
   'CB Seminar Hall-208 — mimicry, stand-up comedy and skit.', 22.5, 19, true, true),
  ('11111111-1111-4111-8111-000000000003', 'KL Rao Bhavan (KLRB)', 'venue',
   'KLRB Drawing Hall-406 — spot painting.', 31, 19, true, true),
  ('11111111-1111-4111-8111-000000000004', 'Bill Gates Bhavan', 'venue',
   'Academic block on the north campus row.', 43, 19, true, true),
  ('11111111-1111-4111-8111-000000000005', 'Visweswaraya Bhavan (VB)', 'venue',
   'VB Seminar Hall-011 — dance solo and dance group.', 54, 19, true, true),
  ('11111111-1111-4111-8111-000000000006', 'C.V. Raman Bhavan (CVB)', 'venue',
   'Table tennis and chess rooms — CV Raman Bhavan-003, -005 and -009.', 66, 19, true, true),
  ('11111111-1111-4111-8111-000000000007', 'Ramanujan Bhavan (RB)', 'venue',
   'RB Seminar Hall-005 and rooms 101, 111 — literary, music and mehandi events.', 81, 19, true, true),
  ('11111111-1111-4111-8111-000000000008', 'Newton Bhavan (NB)', 'venue',
   'NB Seminar Hall-201 — mime and mono action.', 91, 19, true, true),

  ('11111111-1111-4111-8111-000000000009', 'Open Air Auditorium', 'stage',
   'Open-air stage beside KL Rao Ground.', 34, 29, true, true),
  ('11111111-1111-4111-8111-000000000010', 'KL Rao Ground', 'sports',
   'Athletics track, relay, jumps, throws, volleyball and basketball.', 34, 37, true, true),
  ('11111111-1111-4111-8111-000000000011', 'KL Rao Bhavan Ground', 'sports',
   'Women''s basketball, tennikoit and throwball.', 29, 41, true, true),
  ('11111111-1111-4111-8111-000000000012', 'Fete Ground', 'other',
   'Festival fete, stalls and activity zone.', 45, 36, true, true),
  ('11111111-1111-4111-8111-000000000013', 'Ramanujan Ground (RB Ground)', 'sports',
   'Rangoli competition and outdoor events.', 74, 22, true, true),
  ('11111111-1111-4111-8111-000000000014', 'CV Raman Ground', 'sports',
   'Kabaddi, kho-kho and throwball.', 68, 32, true, true),
  ('11111111-1111-4111-8111-000000000015', 'Mango Garden', 'other',
   'Shaded garden seating and stall row.', 55, 33, true, true),
  ('11111111-1111-4111-8111-000000000016', 'Temples', 'other',
   'Campus temple complex.', 55, 45, true, true),
  ('11111111-1111-4111-8111-000000000017', 'Boys Hostels A & B Blocks', 'venue',
   'Badminton courts for men''s singles.', 67, 44, true, true),
  ('11111111-1111-4111-8111-000000000018', 'Girls Hostels A & B Blocks', 'venue',
   'Badminton courts for women''s singles.', 17, 67, true, true),

  ('11111111-1111-4111-8111-000000000019', 'Parking', 'parking',
   'Visitor and participant parking near the west gate.', 12, 31, true, true),
  ('11111111-1111-4111-8111-000000000020', 'Guest House', 'venue',
   'Guest accommodation on the east side of campus.', 90, 39, true, true),
  ('11111111-1111-4111-8111-000000000021', 'Aditya Global Business Incubator', 'venue',
   'Startup and innovation block.', 20, 53, true, true),
  ('11111111-1111-4111-8111-000000000022', 'Water Pond', 'other',
   'Landmark near the central junction.', 44, 55, true, true),
  ('11111111-1111-4111-8111-000000000023', 'Bus Ground', 'parking',
   'Buses and large-vehicle parking.', 67, 62, true, true),
  ('11111111-1111-4111-8111-000000000024', 'Aditya Pharmacy College', 'venue',
   'Pharmacy college block.', 31, 67, true, true),
  ('11111111-1111-4111-8111-000000000025', 'Abdul Kalam Bhavan', 'venue',
   'Academic block near the pharmacy campus.', 45, 67, true, true),
  ('11111111-1111-4111-8111-000000000026', 'Aditya College of Pharmacy (ACOP)', 'venue',
   'ACOP Seminar Hall-019 — fashion show.', 29, 82, true, true),
  ('11111111-1111-4111-8111-000000000027', 'Aditya Degree & PG College', 'venue',
   'Degree and postgraduate college block.', 44, 82, true, true),
  ('11111111-1111-4111-8111-000000000028', 'Aditya Polytechnic College', 'venue',
   'Polytechnic college block.', 29, 90, true, true),
  ('11111111-1111-4111-8111-000000000029', 'BPED Ground (BPD Ground)', 'sports',
   'Football and major outdoor sports.', 68, 78, true, true)
on conflict (id) do update set
  name = excluded.name,
  location_type = excluded.location_type,
  description = excluded.description,
  map_x = excluded.map_x,
  map_y = excluded.map_y,
  is_published = excluded.is_published;

-- ----------------------------------------------------------------------------
-- Events — CREO, cultural and sports
-- ----------------------------------------------------------------------------

insert into public.events
  (id, title, slug, description, category, event_date, start_time, end_time,
   location_id, image_url, status, featured, is_sample)
values
  -- CREO — day 1
  ('22222222-2222-4222-8222-000000000001', 'Spot Photography', 'spot-photography',
   'On-the-spot photography contest. Bring your own camera or phone; entries are judged on composition and story. Venue: RTB-210.',
   'arts', '2027-01-09', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/events/spot-photography.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000002', 'Sahityam', 'sahityam',
   'Literary showcase with poetry, essay and creative-writing rounds. Venue: RTB-212.',
   'literature', '2027-01-09', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/events/sahityam.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000003', 'Mehandi', 'mehandi',
   'Traditional mehandi design competition judged on pattern, finish and speed. Venue: RB-111.',
   'art', '2027-01-09', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000007', 'assets/img/events/mehandi.jpg',
   'published', false, true),

  -- CREO — day 2
  ('22222222-2222-4222-8222-000000000004', 'Spot Painting', 'spot-painting',
   'On-the-spot painting with a surprise theme announced at the venue. Materials to be arranged by participants. Venue: KLRB Drawing Hall-406.',
   'arts', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000003', 'assets/img/events/spot-painting.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000005', 'Movie Making', 'movie-making',
   'Short-film challenge — shoot and edit within the given window. Venue: RTB-210.',
   'arts', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/events/movie-making.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000006', 'Fashion Show', 'fashion-show',
   'Team runway showcase judged on styling, walk and concept. Venue: ACOP Seminar Hall-019.',
   'fashion', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000026', 'assets/img/events/fashion-show.jpg',
   'published', true, true),

  -- CREO — day 3
  ('22222222-2222-4222-8222-000000000007', 'Rangoli', 'rangoli',
   'Rangoli competition on the ground. Colours and materials to be brought by participants. Venue: RB Ground.',
   'art', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000013', 'assets/img/events/rangoli.jpg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000008', 'Dumb Charades', 'dumb-charades',
   'Team-based dumb charades with movie and theme rounds. Venue: RTB Seminar Hall-411.',
   'theatre', '2027-01-11', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/events/dumb-charades.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000009', 'Treasure Hunt', 'treasure-hunt',
   'Campus-wide clue trail. Teams report at the start point with a charged phone. Venue: RB-101.',
   'other', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000007', 'assets/img/events/treasure-hunt.jpg',
   'published', false, true),

  -- Cultural — day 1
  ('22222222-2222-4222-8222-000000000010', 'Dance — Solo', 'dance-solo',
   'Solo dance competition across classical and contemporary styles. Venue: VB Seminar Hall-011.',
   'dance', '2027-01-09', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000005', 'assets/img/events/dance-solo.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000011', 'Dance — Duet', 'dance-duet',
   'Partner dance competition judged on coordination and expression. Venue: RTB Seminar Hall-006.',
   'dance', '2027-01-09', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000001', 'assets/img/events/dance-duet.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000012', 'Instrumental', 'instrumental',
   'Solo instrumental performance. Instruments other than the keyboard to be brought by participants. Venue: RB Seminar Hall-005.',
   'music', '2027-01-09', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000007', 'assets/img/events/instrumental.jpg',
   'published', false, true),

  -- Cultural — day 2
  ('22222222-2222-4222-8222-000000000013', 'Singing', 'singing',
   'Solo singing competition across film, classical and light music. Venue: RB Seminar Hall-005.',
   'music', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000007', 'assets/img/events/singing.jpg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000014', 'Mime', 'mime',
   'Silent storytelling performance judged on expression and clarity. Venue: NB Seminar Hall-201.',
   'theatre', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000008', 'assets/img/events/mime.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000015', 'Mono Action', 'mono-action',
   'Single-actor performance without dialogue. Venue: NB Seminar Hall-201.',
   'theatre', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000008', 'assets/img/events/mono-action.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000016', 'Mimicry', 'mimicry',
   'Voice and impersonation rounds. Venue: CB Seminar Hall-208.',
   'theatre', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000002', 'assets/img/events/mimicry.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000017', 'Stand-up Comedy', 'stand-up-comedy',
   'Open-mic stand-up set. Material must be original. Venue: CB Seminar Hall-208.',
   'theatre', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000002', 'assets/img/events/stand-up-comedy.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000018', 'Skit', 'skit',
   'Team skit performance. Venue: CB Seminar Hall-208.',
   'theatre', '2027-01-10', '10:00', '12:00',
   '11111111-1111-4111-8111-000000000002', 'assets/img/events/skit.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000019', 'Dance — Group', 'dance-group',
   'Group dance competition. Teams report 30 minutes early with their track. Venue: VB Seminar Hall-011.',
   'dance', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000005', 'assets/img/events/dance-group.jpg',
   'published', true, true),

  -- Sports — athletics, day 1
  ('22222222-2222-4222-8222-000000000020', 'Running', 'running',
   '100 m, 200 m, 400 m, 800 m, 1500 m and 5 km cross-country. Venue: KL Rao Ground.',
   'sports', '2027-01-09', '09:00', '11:00',
   '11111111-1111-4111-8111-000000000010', 'assets/img/events/running.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000021', 'Relay', 'relay',
   '4 × 100 m and 4 × 400 m relays. Venue: KL Rao Ground.',
   'sports', '2027-01-09', '11:00', '12:00',
   '11111111-1111-4111-8111-000000000010', 'assets/img/events/relay.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000022', 'Jumping', 'jumping',
   'Long jump, high jump and triple jump. Venue: KL Rao Ground.',
   'sports', '2027-01-09', '09:00', '11:30',
   '11111111-1111-4111-8111-000000000010', 'assets/img/events/jumping.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000023', 'Throwing', 'throwing',
   'Discus throw and shot put. Venue: KL Rao Ground.',
   'sports', '2027-01-09', '09:00', '11:30',
   '11111111-1111-4111-8111-000000000010', 'assets/img/events/throwing.jpg',
   'published', false, true),

  -- Sports — men, day 2
  ('22222222-2222-4222-8222-000000000024', 'Football (Men)', 'football-men',
   'Men''s football tournament. Venue: BPED Ground.',
   'sports', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000029', 'assets/img/events/football-men.jpg',
   'published', true, true),

  ('22222222-2222-4222-8222-000000000025', 'Volleyball (Men)', 'volleyball-men',
   'Men''s volleyball. Venue: KL Rao Ground.',
   'sports', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000010', 'assets/img/events/volleyball-men.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000026', 'Basketball (Men)', 'basketball-men',
   'Men''s basketball. Venue: KL Rao Ground.',
   'sports', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000010', 'assets/img/events/basketball-men.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000027', 'Kabaddi (Men)', 'kabaddi-men',
   'Men''s kabaddi. Venue: CV Raman Ground.',
   'sports', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000014', 'assets/img/events/kabaddi-men.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000028', 'Kho-Kho (Men)', 'kho-kho-men',
   'Men''s kho-kho. Venue: CV Raman Ground.',
   'sports', '2027-01-10', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000014', 'assets/img/events/kho-kho-men.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000029', 'Table Tennis Singles (Men)', 'table-tennis-singles-men',
   'Men''s table tennis singles. Venue: CV Raman Bhavan-005.',
   'sports', '2027-01-10', '10:00', '14:00',
   '11111111-1111-4111-8111-000000000006', 'assets/img/events/table-tennis-singles-men.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000030', 'Shuttle Badminton Singles (Men)', 'shuttle-badminton-singles-men',
   'Men''s badminton singles. Venue: Boys Hostel A & B Blocks.',
   'sports', '2027-01-10', '10:00', '14:00',
   '11111111-1111-4111-8111-000000000017', 'assets/img/events/shuttle-badminton-singles-men.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000031', 'Chess (Men)', 'chess-men',
   'Men''s chess tournament. Venue: CV Raman Bhavan-003.',
   'sports', '2027-01-10', '10:00', '16:00',
   '11111111-1111-4111-8111-000000000006', 'assets/img/events/chess-men.jpg',
   'published', false, true),

  -- Sports — women, day 3
  ('22222222-2222-4222-8222-000000000032', 'Basketball (Women)', 'basketball-women',
   'Women''s basketball. Venue: KL Rao Bhavan Ground.',
   'sports', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000011', 'assets/img/events/basketball-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000033', 'Kabaddi (Women)', 'kabaddi-women',
   'Women''s kabaddi. Venue: CV Raman Bhavan Ground.',
   'sports', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000014', 'assets/img/events/kabaddi-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000034', 'Kho-Kho (Women)', 'kho-kho-women',
   'Women''s kho-kho. Venue: CV Raman Bhavan Ground.',
   'sports', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000014', 'assets/img/events/kho-kho-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000035', 'Throwball (Women)', 'throwball-women',
   'Women''s throwball. Venue: KL Rao Bhavan Ground.',
   'sports', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000011', 'assets/img/events/throwball-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000036', 'Tennikoit Singles (Women)', 'tennikoit-singles-women',
   'Women''s tennikoit singles. Venue: KL Rao Bhavan Ground.',
   'sports', '2027-01-11', '10:00', '13:00',
   '11111111-1111-4111-8111-000000000011', 'assets/img/events/tennikoit-singles-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000037', 'Table Tennis Singles (Women)', 'table-tennis-singles-women',
   'Women''s table tennis singles. Venue: CV Raman Bhavan-005.',
   'sports', '2027-01-11', '10:00', '14:00',
   '11111111-1111-4111-8111-000000000006', 'assets/img/events/table-tennis-singles-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000038', 'Shuttle Badminton Singles (Women)', 'shuttle-badminton-singles-women',
   'Women''s badminton singles. Venue: Girls Hostel A & B Blocks.',
   'sports', '2027-01-11', '10:00', '14:00',
   '11111111-1111-4111-8111-000000000018', 'assets/img/events/shuttle-badminton-singles-women.jpg',
   'published', false, true),

  ('22222222-2222-4222-8222-000000000039', 'Chess (Women)', 'chess-women',
   'Women''s chess tournament. Venue: CV Raman Bhavan-009.',
   'sports', '2027-01-11', '10:00', '16:00',
   '11111111-1111-4111-8111-000000000006', 'assets/img/events/chess-women.jpg',
   'published', false, true)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  category = excluded.category,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  location_id = excluded.location_id,
  image_url = excluded.image_url,
  status = excluded.status,
  featured = excluded.featured;

-- ----------------------------------------------------------------------------
-- Vendors
-- ----------------------------------------------------------------------------

insert into public.vendors
  (id, name, category, description, location_id, image_url, contact_url,
   opening_hours, approval_status, is_featured, featured_until, is_sample)
values
  ('33333333-3333-4333-8333-000000000001', 'Stall 1', 'food',
   'Cold brew, filter coffee and festival specials brewed on site.',
   '11111111-1111-4111-8111-000000000012', 'assets/img/art/vendor-coffee.svg',
   '', '11 AM – 10 PM', 'approved', true, '2027-01-15T00:00:00+05:30', true),

  ('33333333-3333-4333-8333-000000000002', 'Stall 2', 'fashion',
   'Hand-printed tees, tote bags and campus merch from student designers.',
   '11111111-1111-4111-8111-000000000015', 'assets/img/art/vendor-fashion.svg',
   '', '11 AM – 9 PM', 'approved', true, '2027-01-15T00:00:00+05:30', true),

  ('33333333-3333-4333-8333-000000000003', 'Stall 3', 'tech',
   'On-demand 3D prints, custom keychains and mini figure printing.',
   '11111111-1111-4111-8111-000000000012', 'assets/img/art/vendor-tech.svg',
   '', '10 AM – 8 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000004', 'Stall 4', 'art',
   'Handmade ceramics, painted magnets and a make-your-own mini workshop.',
   '11111111-1111-4111-8111-000000000015', 'assets/img/art/vendor-art.svg',
   '', '11 AM – 8 PM', 'approved', true, '2027-01-09T00:00:00+05:30', true),

  ('33333333-3333-4333-8333-000000000005', 'Stall 5', 'food',
   'Steamed and fried momos with three house chutneys. Vegetarian options available.',
   '11111111-1111-4111-8111-000000000012', 'assets/img/art/vendor-food.svg',
   '', '12 PM – 11 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000006', 'Stall 6', 'merch',
   'Vinyl stickers, enamel pins and festival lanyards.',
   '11111111-1111-4111-8111-000000000012', 'assets/img/art/vendor-merch.svg',
   '', '11 AM – 9 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000007', 'Stall 7', 'other',
   'Second-hand books, zines and student publications.',
   '11111111-1111-4111-8111-000000000015', 'assets/img/art/vendor-books.svg',
   '', '10 AM – 6 PM', 'approved', false, null, true),

  ('33333333-3333-4333-8333-000000000008', 'Stall 8', 'fashion',
   'Festival makeup, hair braiding and photo-ready touch-ups.',
   '11111111-1111-4111-8111-000000000009', 'assets/img/art/vendor-fashion.svg',
   '', '2 PM – 10 PM', 'approved', false, null, true)
on conflict (id) do update set
  description = excluded.description,
  location_id = excluded.location_id,
  approval_status = excluded.approval_status;

-- ----------------------------------------------------------------------------
-- Offers
-- ----------------------------------------------------------------------------

insert into public.offers
  (id, vendor_id, title, description, valid_from, valid_until, status, is_sample)
values
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000001',
   'Buy 1 get 1 cold brew',
   'Valid on all cold brew sizes between 2 PM and 4 PM.',
   '2027-01-09T00:00:00+05:30', '2027-01-11T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000002', '33333333-3333-4333-8333-000000000002',
   '10% off campus merch',
   'Show your festival pass at the counter.',
   '2027-01-09T00:00:00+05:30', '2027-01-11T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000003', '33333333-3333-4333-8333-000000000004',
   'Free mini magnet',
   'With any ceramic purchase above ₹499.',
   '2027-01-09T00:00:00+05:30', '2027-01-10T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000004', '33333333-3333-4333-8333-000000000005',
   'Student combo ₹99',
   'Six momos plus a soft drink. Valid with student ID.',
   '2027-01-09T00:00:00+05:30', '2027-01-11T23:59:00+05:30', 'active', true),

  ('44444444-4444-4444-8444-000000000005', '33333333-3333-4333-8333-000000000003',
   'Free keychain on 3D print',
   'One keychain per order while stocks last.',
   '2027-01-01T00:00:00+05:30', '2027-01-05T23:59:00+05:30', 'expired', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Announcements
-- ----------------------------------------------------------------------------

insert into public.announcements
  (id, title, message, priority, status, published_at, expires_at, is_sample)
values
  ('55555555-5555-4555-8555-000000000001', 'Colours 2K27 schedule is live',
   'The full CREO, cultural and sports schedule runs from 9 to 11 January 2027. Check the Events page for dates, times and venues.',
   'high', 'published', '2027-01-01T09:00:00+05:30', '2027-01-12T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000002', 'Registration desks',
   'Registration and other details: Dr. N. Raja Babu 9849265690, Mr. P. Raju 8374245400, Dr. N. Ravi 9912393905, Dr. B. Srinivas 9866732745.',
   'normal', 'published', '2027-01-01T09:00:00+05:30', '2027-01-12T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000003', 'Helpdesk numbers',
   'For on-campus help during the fest: Dr. Akash Gupta 9666066844, B. Govindarajulu 9666893731, M. Prasanthi Kumari 9391410983.',
   'normal', 'published', '2027-01-01T09:00:00+05:30', '2027-01-12T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000004', 'Sports reporting time',
   'Sports participants should report 30 minutes before their event. Football is at BPED Ground; track events and volleyball/basketball are at KL Rao Ground.',
   'high', 'published', '2027-01-09T09:00:00+05:30', '2027-01-12T00:00:00+05:30', true),

  ('55555555-5555-4555-8555-000000000005', 'Venue guide',
   'RTB Ratan Tata Bhavan, CB Cotton Bhavan, KLRB KL Rao Bhavan, VB Visweswaraya Bhavan, CVB CV Raman Bhavan, RB Ramanujan Bhavan, NB Newton Bhavan. Use the Campus Map for directions.',
   'normal', 'published', '2027-01-10T09:00:00+05:30', null, true),

  ('55555555-5555-4555-8555-000000000006', 'Campus map updated',
   'The map now shows all event venues, grounds, hostels, parking and college blocks across the Aditya University campus.',
   'low', 'published', '2027-01-11T09:00:00+05:30', null, true)
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  priority = excluded.priority,
  status = excluded.status,
  published_at = excluded.published_at,
  expires_at = excluded.expires_at;

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
on conflict (id) do nothing;

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
