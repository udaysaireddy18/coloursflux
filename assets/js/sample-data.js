/**
 * ColoursFlux — published festival data.
 *
 * This file mirrors the programme from the official "Schedule of Events" PDF:
 * CREO, cultural and sports events across 9–11 January, with the Aditya
 * University campus map used for venue locations.
 *
 * The site still flags these as bundled records (`_sample`) whenever Supabase
 * is not connected, so organisers know they are reading the local copy. Once
 * the database is connected, the same rows can be imported from seed.sql or
 * edited in Admin.
 */

const day = (n) => `2027-01-${String(9 + n).padStart(2, '0')}`;

/* ------------------------------------------------------------------ */
/* Campus locations — positions match the Aditya University map plate  */
/* ------------------------------------------------------------------ */

export const sampleLocations = [
  { id: 'loc-rtb', name: 'Ratan Tata Bhavan (RTB)', location_type: 'venue', description: 'CREO and cultural rooms — RTB-210, RTB-212 and RTB Seminar Hall-411.', map_x: 17, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-cotton', name: 'Cotton Bhavan (CB)', location_type: 'venue', description: 'CB Seminar Hall-208 — mimicry, stand-up comedy and skit.', map_x: 22.5, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-klrao-bhavan', name: 'KL Rao Bhavan (KLRB)', location_type: 'venue', description: 'KLRB Drawing Hall-406 — spot painting.', map_x: 31, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-billgates', name: 'Bill Gates Bhavan', location_type: 'venue', description: 'Academic block on the north campus row.', map_x: 43, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-visweswaraya', name: 'Visweswaraya Bhavan (VB)', location_type: 'venue', description: 'VB Seminar Hall-011 — dance solo and dance group.', map_x: 54, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-cvraman-bhavan', name: 'C.V. Raman Bhavan (CVB)', location_type: 'venue', description: 'Table tennis and chess rooms — CV Raman Bhavan-003, -005 and -009.', map_x: 66, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-ramanujan', name: 'Ramanujan Bhavan (RB)', location_type: 'venue', description: 'RB Seminar Hall-005 and rooms 101, 111 — literary, music and mehandi events.', map_x: 81, map_y: 19, latitude: null, longitude: null, is_published: true },
  { id: 'loc-newton', name: 'Newton Bhavan (NB)', location_type: 'venue', description: 'NB Seminar Hall-201 — mime and mono action.', map_x: 91, map_y: 19, latitude: null, longitude: null, is_published: true },

  { id: 'loc-open-air-auditorium', name: 'Open Air Auditorium', location_type: 'stage', description: 'Open-air stage beside KL Rao Ground.', map_x: 34, map_y: 29, latitude: null, longitude: null, is_published: true },
  { id: 'loc-klrao-ground', name: 'KL Rao Ground', location_type: 'sports', description: 'Athletics track, relay, jumps, throws, volleyball and basketball.', map_x: 34, map_y: 37, latitude: null, longitude: null, is_published: true },
  { id: 'loc-klrao-bhavan-ground', name: 'KL Rao Bhavan Ground', location_type: 'sports', description: "Women's basketball, tennikoit and throwball.", map_x: 29, map_y: 41, latitude: null, longitude: null, is_published: true },
  { id: 'loc-fete', name: 'Fete Ground', location_type: 'other', description: 'Festival fete, stalls and activity zone.', map_x: 45, map_y: 36, latitude: null, longitude: null, is_published: true },
  { id: 'loc-ramanujan-ground', name: 'Ramanujan Ground (RB Ground)', location_type: 'sports', description: 'Rangoli competition and outdoor events.', map_x: 74, map_y: 22, latitude: null, longitude: null, is_published: true },
  { id: 'loc-cvraman-ground', name: 'CV Raman Ground', location_type: 'sports', description: 'Kabaddi, kho-kho and throwball.', map_x: 68, map_y: 32, latitude: null, longitude: null, is_published: true },
  { id: 'loc-mango-garden', name: 'Mango Garden', location_type: 'other', description: 'Shaded garden seating and stall row.', map_x: 55, map_y: 33, latitude: null, longitude: null, is_published: true },
  { id: 'loc-temples', name: 'Temples', location_type: 'other', description: 'Campus temple complex.', map_x: 55, map_y: 45, latitude: null, longitude: null, is_published: true },
  { id: 'loc-boys-hostel', name: 'Boys Hostels A & B Blocks', location_type: 'venue', description: "Badminton courts for men's singles.", map_x: 67, map_y: 44, latitude: null, longitude: null, is_published: true },
  { id: 'loc-girls-hostel', name: 'Girls Hostels A & B Blocks', location_type: 'venue', description: "Badminton courts for women's singles.", map_x: 17, map_y: 67, latitude: null, longitude: null, is_published: true },

  { id: 'loc-parking', name: 'Parking', location_type: 'parking', description: 'Visitor and participant parking near the west gate.', map_x: 12, map_y: 31, latitude: null, longitude: null, is_published: true },
  { id: 'loc-guest-house', name: 'Guest House', location_type: 'venue', description: 'Guest accommodation on the east side of campus.', map_x: 90, map_y: 39, latitude: null, longitude: null, is_published: true },
  { id: 'loc-incubator', name: 'Aditya Global Business Incubator', location_type: 'venue', description: 'Startup and innovation block.', map_x: 20, map_y: 53, latitude: null, longitude: null, is_published: true },
  { id: 'loc-water-pond', name: 'Water Pond', location_type: 'other', description: 'Landmark near the central junction.', map_x: 44, map_y: 55, latitude: null, longitude: null, is_published: true },
  { id: 'loc-bus-ground', name: 'Bus Ground', location_type: 'parking', description: 'Buses and large-vehicle parking.', map_x: 67, map_y: 62, latitude: null, longitude: null, is_published: true },
  { id: 'loc-pharmacy-college', name: 'Aditya Pharmacy College', location_type: 'venue', description: 'Pharmacy college block.', map_x: 31, map_y: 67, latitude: null, longitude: null, is_published: true },
  { id: 'loc-abdul-kalam', name: 'Abdul Kalam Bhavan', location_type: 'venue', description: 'Academic block near the pharmacy campus.', map_x: 45, map_y: 67, latitude: null, longitude: null, is_published: true },
  { id: 'loc-acop', name: 'Aditya College of Pharmacy (ACOP)', location_type: 'venue', description: 'ACOP Seminar Hall-019 — fashion show.', map_x: 29, map_y: 82, latitude: null, longitude: null, is_published: true },
  { id: 'loc-degree-college', name: 'Aditya Degree & PG College', location_type: 'venue', description: 'Degree and postgraduate college block.', map_x: 44, map_y: 82, latitude: null, longitude: null, is_published: true },
  { id: 'loc-polytechnic', name: 'Aditya Polytechnic College', location_type: 'venue', description: 'Polytechnic college block.', map_x: 29, map_y: 90, latitude: null, longitude: null, is_published: true },
  { id: 'loc-bpd-ground', name: 'BPED Ground (BPD Ground)', location_type: 'sports', description: "Football and major outdoor sports.", map_x: 68, map_y: 78, latitude: null, longitude: null, is_published: true },
];

/* ------------------------------------------------------------------ */
/* Events — CREO, cultural and sports                                  */
/* ------------------------------------------------------------------ */

export const sampleEvents = [
  /* CREO — day 1 */
  {
    id: 'evt-001', title: 'Spot Photography', slug: 'spot-photography',
    description: 'On-the-spot photography contest. Bring your own camera or phone; entries are judged on composition and story. Venue: RTB-210.',
    category: 'arts', event_date: day(0), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-rtb', image_url: 'assets/img/events/spot-photography.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-002', title: 'Sahityam', slug: 'sahityam',
    description: 'Literary showcase with poetry, essay and creative-writing rounds. Venue: RTB-212.',
    category: 'literature', event_date: day(0), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-rtb', image_url: 'assets/img/events/sahityam.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-003', title: 'Mehandi', slug: 'mehandi',
    description: 'Traditional mehandi design competition judged on pattern, finish and speed. Venue: RB-111.',
    category: 'art', event_date: day(0), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-ramanujan', image_url: 'assets/img/events/mehandi.jpg',
    status: 'published', featured: false,
  },

  /* CREO — day 2 */
  {
    id: 'evt-004', title: 'Spot Painting', slug: 'spot-painting',
    description: 'On-the-spot painting with a surprise theme announced at the venue. Materials to be arranged by participants. Venue: KLRB Drawing Hall-406.',
    category: 'arts', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-klrao-bhavan', image_url: 'assets/img/events/spot-painting.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-005', title: 'Movie Making', slug: 'movie-making',
    description: 'Short-film challenge — shoot and edit within the given window. Venue: RTB-210.',
    category: 'arts', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-rtb', image_url: 'assets/img/events/movie-making.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-006', title: 'Fashion Show', slug: 'fashion-show',
    description: 'Team runway showcase judged on styling, walk and concept. Venue: ACOP Seminar Hall-019.',
    category: 'fashion', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-acop', image_url: 'assets/img/events/fashion-show.jpg',
    status: 'published', featured: true,
  },

  /* CREO — day 3 */
  {
    id: 'evt-007', title: 'Rangoli', slug: 'rangoli',
    description: 'Rangoli competition on the ground. Colours and materials to be brought by participants. Venue: RB Ground.',
    category: 'art', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-ramanujan-ground', image_url: 'assets/img/events/rangoli.jpg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-008', title: 'Dumb Charades', slug: 'dumb-charades',
    description: 'Team-based dumb charades with movie and theme rounds. Venue: RTB Seminar Hall-411.',
    category: 'theatre', event_date: day(2), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-rtb', image_url: 'assets/img/events/dumb-charades.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-009', title: 'Treasure Hunt', slug: 'treasure-hunt',
    description: 'Campus-wide clue trail. Teams report at the start point with a charged phone. Venue: RB-101.',
    category: 'other', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-ramanujan', image_url: 'assets/img/events/treasure-hunt.jpg',
    status: 'published', featured: false,
  },

  /* Cultural — day 1 */
  {
    id: 'evt-010', title: 'Dance — Solo', slug: 'dance-solo',
    description: 'Solo dance competition across classical and contemporary styles. Venue: VB Seminar Hall-011.',
    category: 'dance', event_date: day(0), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-visweswaraya', image_url: 'assets/img/events/dance-solo.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-011', title: 'Dance — Duet', slug: 'dance-duet',
    description: 'Partner dance competition judged on coordination and expression. Venue: RTB Seminar Hall-006.',
    category: 'dance', event_date: day(0), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-rtb', image_url: 'assets/img/events/dance-duet.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-012', title: 'Instrumental', slug: 'instrumental',
    description: 'Solo instrumental performance. Instruments other than the keyboard to be brought by participants. Venue: RB Seminar Hall-005.',
    category: 'music', event_date: day(0), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-ramanujan', image_url: 'assets/img/events/instrumental.jpg',
    status: 'published', featured: false,
  },

  /* Cultural — day 2 */
  {
    id: 'evt-013', title: 'Singing', slug: 'singing',
    description: 'Solo singing competition across film, classical and light music. Venue: RB Seminar Hall-005.',
    category: 'music', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-ramanujan', image_url: 'assets/img/events/singing.jpg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-014', title: 'Mime', slug: 'mime',
    description: 'Silent storytelling performance judged on expression and clarity. Venue: NB Seminar Hall-201.',
    category: 'theatre', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-newton', image_url: 'assets/img/events/mime.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-015', title: 'Mono Action', slug: 'mono-action',
    description: 'Single-actor performance without dialogue. Venue: NB Seminar Hall-201.',
    category: 'theatre', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-newton', image_url: 'assets/img/events/mono-action.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-016', title: 'Mimicry', slug: 'mimicry',
    description: 'Voice and impersonation rounds. Venue: CB Seminar Hall-208.',
    category: 'theatre', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-cotton', image_url: 'assets/img/events/mimicry.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-017', title: 'Stand-up Comedy', slug: 'stand-up-comedy',
    description: 'Open-mic stand-up set. Material must be original. Venue: CB Seminar Hall-208.',
    category: 'theatre', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-cotton', image_url: 'assets/img/events/stand-up-comedy.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-018', title: 'Skit', slug: 'skit',
    description: 'Team skit performance. Venue: CB Seminar Hall-208.',
    category: 'theatre', event_date: day(1), start_time: '10:00:00', end_time: '12:00:00',
    location_id: 'loc-cotton', image_url: 'assets/img/events/skit.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-019', title: 'Dance — Group', slug: 'dance-group',
    description: 'Group dance competition. Teams report 30 minutes early with their track. Venue: VB Seminar Hall-011.',
    category: 'dance', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-visweswaraya', image_url: 'assets/img/events/dance-group.jpg',
    status: 'published', featured: true,
  },

  /* Sports — athletics, day 1 */
  {
    id: 'evt-020', title: 'Running', slug: 'running',
    description: '100 m, 200 m, 400 m, 800 m, 1500 m and 5 km cross-country. Venue: KL Rao Ground.',
    category: 'sports', event_date: day(0), start_time: '09:00:00', end_time: '11:00:00',
    location_id: 'loc-klrao-ground', image_url: 'assets/img/events/running.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-021', title: 'Relay', slug: 'relay',
    description: '4 × 100 m and 4 × 400 m relays. Venue: KL Rao Ground.',
    category: 'sports', event_date: day(0), start_time: '11:00:00', end_time: '12:00:00',
    location_id: 'loc-klrao-ground', image_url: 'assets/img/events/relay.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-022', title: 'Jumping', slug: 'jumping',
    description: 'Long jump, high jump and triple jump. Venue: KL Rao Ground.',
    category: 'sports', event_date: day(0), start_time: '09:00:00', end_time: '11:30:00',
    location_id: 'loc-klrao-ground', image_url: 'assets/img/events/jumping.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-023', title: 'Throwing', slug: 'throwing',
    description: 'Discus throw and shot put. Venue: KL Rao Ground.',
    category: 'sports', event_date: day(0), start_time: '09:00:00', end_time: '11:30:00',
    location_id: 'loc-klrao-ground', image_url: 'assets/img/events/throwing.jpg',
    status: 'published', featured: false,
  },

  /* Sports — men, day 2 */
  {
    id: 'evt-024', title: 'Football (Men)', slug: 'football-men',
    description: "Men's football tournament. Venue: BPED Ground.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-bpd-ground', image_url: 'assets/img/events/football-men.jpg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-025', title: 'Volleyball (Men)', slug: 'volleyball-men',
    description: "Men's volleyball. Venue: KL Rao Ground.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-klrao-ground', image_url: 'assets/img/events/volleyball-men.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-026', title: 'Basketball (Men)', slug: 'basketball-men',
    description: "Men's basketball. Venue: KL Rao Ground.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-klrao-ground', image_url: 'assets/img/events/basketball-men.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-027', title: 'Kabaddi (Men)', slug: 'kabaddi-men',
    description: "Men's kabaddi. Venue: CV Raman Ground.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-cvraman-ground', image_url: 'assets/img/events/kabaddi-men.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-028', title: 'Kho-Kho (Men)', slug: 'kho-kho-men',
    description: "Men's kho-kho. Venue: CV Raman Ground.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-cvraman-ground', image_url: 'assets/img/events/kho-kho-men.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-029', title: 'Table Tennis Singles (Men)', slug: 'table-tennis-singles-men',
    description: "Men's table tennis singles. Venue: CV Raman Bhavan-005.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '14:00:00',
    location_id: 'loc-cvraman-bhavan', image_url: 'assets/img/events/table-tennis-singles-men.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-030', title: 'Shuttle Badminton Singles (Men)', slug: 'shuttle-badminton-singles-men',
    description: "Men's badminton singles. Venue: Boys Hostel A & B Blocks.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '14:00:00',
    location_id: 'loc-boys-hostel', image_url: 'assets/img/events/shuttle-badminton-singles-men.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-031', title: 'Chess (Men)', slug: 'chess-men',
    description: "Men's chess tournament. Venue: CV Raman Bhavan-003.",
    category: 'sports', event_date: day(1), start_time: '10:00:00', end_time: '16:00:00',
    location_id: 'loc-cvraman-bhavan', image_url: 'assets/img/events/chess-men.jpg',
    status: 'published', featured: false,
  },

  /* Sports — women, day 3 */
  {
    id: 'evt-032', title: 'Basketball (Women)', slug: 'basketball-women',
    description: "Women's basketball. Venue: KL Rao Bhavan Ground.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-klrao-bhavan-ground', image_url: 'assets/img/events/basketball-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-033', title: 'Kabaddi (Women)', slug: 'kabaddi-women',
    description: "Women's kabaddi. Venue: CV Raman Bhavan Ground.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-cvraman-ground', image_url: 'assets/img/events/kabaddi-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-034', title: 'Kho-Kho (Women)', slug: 'kho-kho-women',
    description: "Women's kho-kho. Venue: CV Raman Bhavan Ground.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-cvraman-ground', image_url: 'assets/img/events/kho-kho-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-035', title: 'Throwball (Women)', slug: 'throwball-women',
    description: "Women's throwball. Venue: KL Rao Bhavan Ground.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-klrao-bhavan-ground', image_url: 'assets/img/events/throwball-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-036', title: 'Tennikoit Singles (Women)', slug: 'tennikoit-singles-women',
    description: "Women's tennikoit singles. Venue: KL Rao Bhavan Ground.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '13:00:00',
    location_id: 'loc-klrao-bhavan-ground', image_url: 'assets/img/events/tennikoit-singles-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-037', title: 'Table Tennis Singles (Women)', slug: 'table-tennis-singles-women',
    description: "Women's table tennis singles. Venue: CV Raman Bhavan-005.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '14:00:00',
    location_id: 'loc-cvraman-bhavan', image_url: 'assets/img/events/table-tennis-singles-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-038', title: 'Shuttle Badminton Singles (Women)', slug: 'shuttle-badminton-singles-women',
    description: "Women's badminton singles. Venue: Girls Hostel A & B Blocks.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '14:00:00',
    location_id: 'loc-girls-hostel', image_url: 'assets/img/events/shuttle-badminton-singles-women.jpg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-039', title: 'Chess (Women)', slug: 'chess-women',
    description: "Women's chess tournament. Venue: CV Raman Bhavan-009.",
    category: 'sports', event_date: day(2), start_time: '10:00:00', end_time: '16:00:00',
    location_id: 'loc-cvraman-bhavan', image_url: 'assets/img/events/chess-women.jpg',
    status: 'published', featured: false,
  },
];

export const sampleVendors = [
  {
    id: 'ven-001', name: 'Stall 1', category: 'food',
    description: 'Cold brew, filter coffee and festival specials brewed on site.',
    location_id: 'loc-fete', image_url: 'assets/img/art/vendor-coffee.svg',
    contact_url: '', approval_status: 'approved', is_featured: true,
    featured_until: '2027-01-15T00:00:00+05:30',
  },
  {
    id: 'ven-002', name: 'Stall 2', category: 'fashion',
    description: 'Hand-printed tees, tote bags and campus merch from student designers.',
    location_id: 'loc-mango-garden', image_url: 'assets/img/art/vendor-fashion.svg',
    contact_url: '', approval_status: 'approved', is_featured: true,
    featured_until: '2027-01-15T00:00:00+05:30',
  },
  {
    id: 'ven-003', name: 'Stall 3', category: 'tech',
    description: 'On-demand 3D prints, custom keychains and mini figure printing.',
    location_id: 'loc-fete', image_url: 'assets/img/art/vendor-tech.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-004', name: 'Stall 4', category: 'art',
    description: 'Handmade ceramics, painted magnets and a make-your-own mini workshop.',
    location_id: 'loc-mango-garden', image_url: 'assets/img/art/vendor-art.svg',
    contact_url: '', approval_status: 'approved', is_featured: true,
    featured_until: '2027-01-09T00:00:00+05:30',
  },
  {
    id: 'ven-005', name: 'Stall 5', category: 'food',
    description: 'Steamed and fried momos with three house chutneys. Vegetarian options available.',
    location_id: 'loc-fete', image_url: 'assets/img/art/vendor-food.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-006', name: 'Stall 6', category: 'merch',
    description: 'Vinyl stickers, enamel pins and festival lanyards.',
    location_id: 'loc-fete', image_url: 'assets/img/art/vendor-merch.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-007', name: 'Stall 7', category: 'other',
    description: 'Second-hand books, zines and student publications.',
    location_id: 'loc-mango-garden', image_url: 'assets/img/art/vendor-books.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-008', name: 'Stall 8', category: 'fashion',
    description: 'Festival makeup, hair braiding and photo-ready touch-ups.',
    location_id: 'loc-open-air-auditorium', image_url: 'assets/img/art/vendor-fashion.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
];

export const sampleOffers = [
  { id: 'off-001', vendor_id: 'ven-001', title: 'Buy 1 get 1 cold brew', description: 'Valid on all cold brew sizes between 2 PM and 4 PM.', valid_from: '2027-01-09T00:00:00+05:30', valid_until: '2027-01-11T23:59:00+05:30', status: 'active' },
  { id: 'off-002', vendor_id: 'ven-002', title: '10% off campus merch', description: 'Show your festival pass at the counter.', valid_from: '2027-01-09T00:00:00+05:30', valid_until: '2027-01-11T23:59:00+05:30', status: 'active' },
  { id: 'off-003', vendor_id: 'ven-004', title: 'Free mini magnet', description: 'With any ceramic purchase above ₹499.', valid_from: '2027-01-09T00:00:00+05:30', valid_until: '2027-01-10T23:59:00+05:30', status: 'active' },
  { id: 'off-004', vendor_id: 'ven-005', title: 'Student combo ₹99', description: 'Six momos plus a soft drink. Valid with student ID.', valid_from: '2027-01-09T00:00:00+05:30', valid_until: '2027-01-11T23:59:00+05:30', status: 'active' },
  { id: 'off-005', vendor_id: 'ven-003', title: 'Free keychain on 3D print', description: 'One keychain per order while stocks last.', valid_from: '2027-01-01T00:00:00+05:30', valid_until: '2027-01-05T23:59:00+05:30', status: 'expired' },
];

export const sampleAnnouncements = [
  { id: 'ann-001', title: 'Colours 2K27 schedule is live', message: 'The full CREO, cultural and sports schedule runs from 9 to 11 January 2027. Check the Events page for dates, times and venues.', priority: 'high', published_at: '2027-01-01T09:00:00+05:30', expires_at: '2027-01-12T00:00:00+05:30', status: 'published' },
  { id: 'ann-002', title: 'Registration desks', message: 'Registration and other details: Dr. N. Raja Babu 9849265690, Mr. P. Raju 8374245400, Dr. N. Ravi 9912393905, Dr. B. Srinivas 9866732745.', priority: 'normal', published_at: '2027-01-01T09:00:00+05:30', expires_at: '2027-01-12T00:00:00+05:30', status: 'published' },
  { id: 'ann-003', title: 'Helpdesk numbers', message: 'For on-campus help during the fest: Dr. Akash Gupta 9666066844, B. Govindarajulu 9666893731, M. Prasanthi Kumari 9391410983.', priority: 'normal', published_at: '2027-01-01T09:00:00+05:30', expires_at: '2027-01-12T00:00:00+05:30', status: 'published' },
  { id: 'ann-004', title: 'Sports reporting time', message: 'Sports participants should report 30 minutes before their event. Football is at BPED Ground; track events and volleyball/basketball are at KL Rao Ground.', priority: 'high', published_at: '2027-01-09T09:00:00+05:30', expires_at: '2027-01-12T00:00:00+05:30', status: 'published' },
  { id: 'ann-005', title: 'Venue guide', message: 'RTB Ratan Tata Bhavan, CB Cotton Bhavan, KLRB KL Rao Bhavan, VB Visweswaraya Bhavan, CVB CV Raman Bhavan, RB Ramanujan Bhavan, NB Newton Bhavan. Use the Campus Map for directions.', priority: 'normal', published_at: '2027-01-10T09:00:00+05:30', expires_at: null, status: 'published' },
  { id: 'ann-006', title: 'Campus map updated', message: 'The map now shows all event venues, grounds, hostels, parking and college blocks across the Aditya University campus.', priority: 'low', published_at: '2027-01-11T09:00:00+05:30', expires_at: null, status: 'published' },
];

export const sampleSponsorships = [
  { id: 'spo-001', sponsor_name: 'Nova Foods', logo_url: '', placement: 'home_strip', campaign_start: '2027-01-01', campaign_end: '2027-01-31', status: 'active', is_paid: true },
  { id: 'spo-002', sponsor_name: 'Bluewave Audio', logo_url: '', placement: 'home_strip', campaign_start: '2027-01-01', campaign_end: '2027-01-31', status: 'active', is_paid: true },
  { id: 'spo-003', sponsor_name: 'Campus Print Co.', logo_url: '', placement: 'stalls_banner', campaign_start: '2027-01-02', campaign_end: '2027-01-15', status: 'active', is_paid: false },
];

export const sampleConfig = {
  id: 'app',
  festival_name: 'Colours 2K27',
  festival_start: '2027-01-09T09:00:00+05:30',
  festival_end: '2027-01-11T18:00:00+05:30',
  timezone: 'Asia/Kolkata',
  tagline: 'Feel the Flow. Live the Colours.',
  logo_url: '',
  data_version: 2,
  contact_email: '',
  contact_phone: '+91 96660 66844',
  social_links: [
    { label: 'Instagram', url: '', icon: 'instagram' },
    { label: 'YouTube', url: '', icon: 'globe' },
  ],
};

export const SAMPLE = {
  events: sampleEvents,
  locations: sampleLocations,
  vendors: sampleVendors,
  offers: sampleOffers,
  announcements: sampleAnnouncements,
  sponsorships: sampleSponsorships,
  config: [sampleConfig],
};
