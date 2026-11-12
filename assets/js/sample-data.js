/**
 * DEMO DATA — not real festival information.
 *
 * Every record here carries `_sample: true`. The UI renders a visible
 * "Sample data" badge whenever the app is running without Supabase credentials,
 * and these records are replaced automatically once the database is connected.
 *
 * Dates below are placeholders for Colours 2K27 and must be confirmed by the
 * organisers in Admin → Settings before launch.
 */

const day = (n) => `2027-01-${String(7 + n).padStart(2, '0')}`;

export const sampleLocations = [
  { id: 'loc-main-stage', name: 'Main Stage', location_type: 'stage', description: 'Headline concerts, DJ nights and the closing ceremony.', map_x: 50, map_y: 30, latitude: null, longitude: null, is_published: true },
  { id: 'loc-cultural-stage', name: 'Cultural Stage', location_type: 'stage', description: 'Dance, theatre and classical performances.', map_x: 24, map_y: 42, latitude: null, longitude: null, is_published: true },
  { id: 'loc-food-court', name: 'Food Court', location_type: 'food', description: 'Food stalls, beverages and seating area.', map_x: 72, map_y: 52, latitude: null, longitude: null, is_published: true },
  { id: 'loc-tech-block', name: 'Tech Block A', location_type: 'venue', description: 'Technical events, workshops and hackathon rooms.', map_x: 30, map_y: 70, latitude: null, longitude: null, is_published: true },
  { id: 'loc-sports-ground', name: 'Sports Ground', location_type: 'sports', description: 'Outdoor sports and the campus carnival zone.', map_x: 82, map_y: 26, latitude: null, longitude: null, is_published: true },
  { id: 'loc-central-lawn', name: 'Central Lawn', location_type: 'venue', description: 'Open-air hangout zone and photo spots.', map_x: 55, map_y: 62, latitude: null, longitude: null, is_published: true },
  { id: 'loc-registration', name: 'Registration Desk', location_type: 'service', description: 'Pass collection and help desk near the main gate.', map_x: 16, map_y: 20, latitude: null, longitude: null, is_published: true },
  { id: 'loc-parking', name: 'North Parking', location_type: 'parking', description: 'Two-wheeler and four-wheeler parking, subject to campus approval.', map_x: 88, map_y: 74, latitude: null, longitude: null, is_published: true },
  { id: 'loc-restrooms', name: 'Restrooms — Block C', location_type: 'service', description: 'Accessible restrooms next to the cultural stage.', map_x: 18, map_y: 58, latitude: null, longitude: null, is_published: true },
  { id: 'loc-library', name: 'Central Library', location_type: 'venue', description: 'Literary events and quiet zone.', map_x: 68, map_y: 78, latitude: null, longitude: null, is_published: true },
];

export const sampleEvents = [
  {
    id: 'evt-001', title: 'Event 1', slug: 'neon-waves-opening-concert',
    description: 'The festival opens with a full-stage light show, a live band and the first wave of ColoursFlux visuals. Gates open 30 minutes before the show.',
    category: 'music', event_date: day(0), start_time: '18:00:00', end_time: '21:00:00',
    location_id: 'loc-main-stage', image_url: 'assets/img/art/wave-purple.svg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-002', title: 'Event 2', slug: 'flux-dance-battle',
    description: 'Crews from across the campus go head to head. Open to registered teams; spectators welcome.',
    category: 'dance', event_date: day(0), start_time: '14:00:00', end_time: '17:00:00',
    location_id: 'loc-cultural-stage', image_url: 'assets/img/art/wave-magenta.svg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-003', title: 'Event 3', slug: 'build-night-hack',
    description: 'A student hackathon with mentors from the tech community. Bring your own laptop; power and Wi-Fi provided on site.',
    category: 'tech', event_date: day(1), start_time: '09:00:00', end_time: '21:00:00',
    location_id: 'loc-tech-block', image_url: 'assets/img/art/wave-cyan.svg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-004', title: 'Event 4', slug: 'street-food-trail',
    description: 'A guided walk across the food court with student vendors and local partners. Pay per stall.',
    category: 'food', event_date: day(1), start_time: '12:00:00', end_time: '16:00:00',
    location_id: 'loc-food-court', image_url: 'assets/img/art/wave-amber.svg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-005', title: 'Event 5', slug: 'canvas-and-code',
    description: 'Generative art showcase where design students and coders present interactive installations.',
    category: 'arts', event_date: day(1), start_time: '16:30:00', end_time: '19:00:00',
    location_id: 'loc-central-lawn', image_url: 'assets/img/art/wave-magenta.svg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-006', title: 'Event 6', slug: 'improv-night',
    description: 'Short-form improv sets from the campus theatre society. Audience prompts encouraged.',
    category: 'theatre', event_date: day(1), start_time: '19:30:00', end_time: '21:00:00',
    location_id: 'loc-cultural-stage', image_url: 'assets/img/art/wave-purple.svg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-007', title: 'Event 7', slug: 'dj-set-afterglow',
    description: 'Closing night dance set with a visual mapping show. Subject to sound-permission timings.',
    category: 'music', event_date: day(2), start_time: '20:00:00', end_time: '23:00:00',
    location_id: 'loc-main-stage', image_url: 'assets/img/art/wave-cyan.svg',
    status: 'published', featured: true,
  },
  {
    id: 'evt-008', title: 'Event 8', slug: 'campus-cricket-cup',
    description: 'Inter-department knockout tournament. Reporting time 30 minutes before the first match.',
    category: 'sports', event_date: day(2), start_time: '08:00:00', end_time: '13:00:00',
    location_id: 'loc-sports-ground', image_url: 'assets/img/art/wave-emerald.svg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-009', title: 'Event 9', slug: 'slam-poetry-open-mic',
    description: 'Sign-up on the day at the library desk. Three minutes per performer.',
    category: 'literature', event_date: day(2), start_time: '15:00:00', end_time: '17:00:00',
    location_id: 'loc-library', image_url: 'assets/img/art/wave-purple.svg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-010', title: 'Event 10', slug: 'closing-ceremony',
    description: 'Prize distribution, sponsor acknowledgements and the festival close-out.',
    category: 'music', event_date: day(2), start_time: '17:30:00', end_time: '19:30:00',
    location_id: 'loc-main-stage', image_url: 'assets/img/art/wave-magenta.svg',
    status: 'published', featured: false,
  },
  {
    id: 'evt-011', title: 'Event 11', slug: 'robotics-demo-arena',
    description: 'Student robotics teams run live demos. Cancellation notice will appear here if the venue changes.',
    category: 'tech', event_date: day(1), start_time: '11:00:00', end_time: '14:00:00',
    location_id: 'loc-tech-block', image_url: 'assets/img/art/wave-emerald.svg',
    status: 'cancelled', featured: false,
  },
];

export const sampleVendors = [
  {
    id: 'ven-001', name: 'Stall 1', category: 'food',
    description: 'Cold brew, filter coffee and festival specials brewed on site.',
    location_id: 'loc-food-court', image_url: 'assets/img/art/vendor-coffee.svg',
    contact_url: '', approval_status: 'approved', is_featured: true,
    featured_until: '2027-01-15T00:00:00+05:30',
  },
  {
    id: 'ven-002', name: 'Stall 2', category: 'fashion',
    description: 'Hand-printed tees, tote bags and campus merch from student designers.',
    location_id: 'loc-central-lawn', image_url: 'assets/img/art/vendor-fashion.svg',
    contact_url: '', approval_status: 'approved', is_featured: true,
    featured_until: '2027-01-15T00:00:00+05:30',
  },
  {
    id: 'ven-003', name: 'Stall 3', category: 'tech',
    description: 'On-demand 3D prints, custom keychains and mini figure printing.',
    location_id: 'loc-tech-block', image_url: 'assets/img/art/vendor-tech.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-004', name: 'Stall 4', category: 'art',
    description: 'Handmade ceramics, painted magnets and a make-your-own mini workshop.',
    location_id: 'loc-central-lawn', image_url: 'assets/img/art/vendor-art.svg',
    contact_url: '', approval_status: 'approved', is_featured: true,
    featured_until: '2027-01-09T00:00:00+05:30',
  },
  {
    id: 'ven-005', name: 'Stall 5', category: 'food',
    description: 'Steamed and fried momos with three house chutneys. Vegetarian options available.',
    location_id: 'loc-food-court', image_url: 'assets/img/art/vendor-food.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-006', name: 'Stall 6', category: 'merch',
    description: 'Vinyl stickers, enamel pins and festival lanyards.',
    location_id: 'loc-central-lawn', image_url: 'assets/img/art/vendor-merch.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-007', name: 'Stall 7', category: 'other',
    description: 'Second-hand books, zines and student publications.',
    location_id: 'loc-library', image_url: 'assets/img/art/vendor-books.svg',
    contact_url: '', approval_status: 'approved', is_featured: false, featured_until: null,
  },
  {
    id: 'ven-008', name: 'Stall 8', category: 'fashion',
    description: 'Festival makeup, hair braiding and photo-ready touch-ups.',
    location_id: 'loc-cultural-stage', image_url: 'assets/img/art/vendor-fashion.svg',
    contact_url: '', approval_status: 'pending', is_featured: false, featured_until: null,
  },
];

export const sampleOffers = [
  { id: 'off-001', vendor_id: 'ven-001', title: 'Buy 1 get 1 cold brew', description: 'Valid on all cold brew sizes between 2 PM and 4 PM.', valid_from: '2027-01-07T00:00:00+05:30', valid_until: '2027-01-09T23:59:00+05:30', status: 'active' },
  { id: 'off-002', vendor_id: 'ven-002', title: '10% off campus merch', description: 'Show your festival pass at the counter.', valid_from: '2027-01-07T00:00:00+05:30', valid_until: '2027-01-09T23:59:00+05:30', status: 'active' },
  { id: 'off-003', vendor_id: 'ven-004', title: 'Free mini magnet', description: 'With any ceramic purchase above ₹499.', valid_from: '2027-01-07T00:00:00+05:30', valid_until: '2027-01-08T23:59:00+05:30', status: 'active' },
  { id: 'off-004', vendor_id: 'ven-005', title: 'Student combo ₹99', description: 'Six momos plus a soft drink. Valid with student ID.', valid_from: '2027-01-07T00:00:00+05:30', valid_until: '2027-01-09T23:59:00+05:30', status: 'active' },
  { id: 'off-005', vendor_id: 'ven-003', title: 'Free keychain on 3D print', description: 'One keychain per order while stocks last.', valid_from: '2027-01-01T00:00:00+05:30', valid_until: '2027-01-05T23:59:00+05:30', status: 'expired' },
];

export const sampleAnnouncements = [
  { id: 'ann-001', title: 'Festival gates open at 4 PM', message: 'Registration and the main gate open at 4 PM on day one. Carry a valid student ID for pass verification.', priority: 'normal', published_at: '2027-01-06T10:00:00+05:30', expires_at: '2027-01-10T00:00:00+05:30', status: 'published' },
  { id: 'ann-002', title: 'Event 11 cancelled', message: 'Event 11, scheduled for day two, has been cancelled due to venue unavailability. Refunds are not applicable as the event was free.', priority: 'high', published_at: '2027-01-05T18:30:00+05:30', expires_at: '2027-01-10T00:00:00+05:30', status: 'published' },
  { id: 'ann-003', title: 'New stall: Stall 6', message: 'Stall 6 has joined the Central Lawn stall row with festival lanyards and pins.', priority: 'normal', published_at: '2027-01-04T12:00:00+05:30', expires_at: null, status: 'published' },
  { id: 'ann-004', title: 'Shuttle timing update', message: 'The evening shuttle now leaves the north parking gate every 20 minutes from 6 PM to 11 PM. This is a sample notice — confirm real transport details with the organiser.', priority: 'high', published_at: '2027-01-03T09:15:00+05:30', expires_at: '2027-01-10T00:00:00+05:30', status: 'published' },
  { id: 'ann-005', title: 'Event 7 moved to 8 PM', message: 'Event 7 will now start at 8 PM instead of 7:30 PM. The venue is unchanged.', priority: 'urgent', published_at: '2027-01-02T20:00:00+05:30', expires_at: '2027-01-10T00:00:00+05:30', status: 'published' },
  { id: 'ann-006', title: 'Lost & found desk', message: 'A lost and found desk operates at the registration counter during festival hours.', priority: 'low', published_at: '2027-01-01T11:00:00+05:30', expires_at: null, status: 'published' },
];

export const sampleSponsorships = [
  { id: 'spo-001', sponsor_name: 'Nova Foods', logo_url: '', placement: 'home_strip', campaign_start: '2027-01-01', campaign_end: '2027-01-31', status: 'active', is_paid: true },
  { id: 'spo-002', sponsor_name: 'Bluewave Audio', logo_url: '', placement: 'home_strip', campaign_start: '2027-01-01', campaign_end: '2027-01-31', status: 'active', is_paid: true },
  { id: 'spo-003', sponsor_name: 'Campus Print Co.', logo_url: '', placement: 'stalls_banner', campaign_start: '2027-01-02', campaign_end: '2027-01-15', status: 'active', is_paid: false },
];

export const sampleConfig = {
  id: 'app',
  festival_name: 'Colours 2K27',
  festival_start: '2027-01-07T10:00:00+05:30',
  festival_end: '2027-01-09T23:00:00+05:30',
  timezone: 'Asia/Kolkata',
  tagline: 'Feel the Flow. Live the Colours.',
  logo_url: '',
  data_version: 1,
  contact_email: '',
  contact_phone: '',
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
