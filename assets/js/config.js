import { ENV } from './env.js';

/** Static app-wide config. Anything festival-specific lives in the database. */
export const APP = {
  name: 'ColoursFlux',
  event: 'Colours 2K27',
  institution: 'Aditya University',
  tagline: 'Feel the Flow. Live the Colours.',
  description:
    'Your ultimate digital companion for the biggest cultural fest of the year.',
  /** Bump when shipping breaking offline-shape changes (invalidates IndexedDB). */
  schemaVersion: 1,
  storageBucket: 'festival-media',
  /** Optional CDN for @supabase/supabase-js, used by the admin dashboard only. */
  supabaseJsUrl:
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm',
  /** Hard limits mirrored by the storage bucket policy. */
  upload: {
    maxBytes: 2 * 1024 * 1024,
    types: ['image/png', 'image/jpeg', 'image/webp'],
  },
  /** Illustrative prices for the demo only. Not confirmed rates. */
  pricing: [
    { label: 'Basic listing', price: 'Free', note: 'Vendor name, category, location, hours.' },
    { label: 'Featured listing', price: '₹99', note: 'Highlighted in the featured vendor row.' },
    { label: 'Sponsored promotion', price: '₹199', note: 'Labelled sponsored card placement.' },
    { label: 'Sponsor package', price: '₹499+', note: 'Logo placement in the sponsor strip.' },
  ],
};

export const NAV = [
  { href: 'index.html', label: 'Home', icon: 'home' },
  { href: 'events.html', label: 'Events', icon: 'calendar' },
  { href: 'map.html', label: 'Campus Map', icon: 'map' },
  { href: 'stalls.html', label: 'Stalls', icon: 'store' },
  { href: 'announcements.html', label: 'Announcements', icon: 'megaphone' },
  { href: 'about.html', label: 'About', icon: 'info' },
];

/** Used only while the database is unreachable AND nothing is cached yet. */
export const FALLBACK_CONFIG = {
  festival_name: 'Colours 2K27',
  festival_start: '2027-01-07T09:00:00+05:30',
  festival_end: '2027-01-09T18:00:00+05:30',
  timezone: 'Asia/Kolkata',
  tagline: APP.tagline,
  logo_url: '',
  data_version: 0,
  contact_email: '',
  contact_phone: '',
  social_links: [],
};

export const hasSupabase = () =>
  Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);

export const REST = () =>
  `${ENV.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

export const AUTH = () =>
  `${ENV.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;

export const STORAGE_PUBLIC = () =>
  `${ENV.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${APP.storageBucket}`;

/** localStorage keys — only non-sensitive UI preferences and the admin session. */
export const LS = {
  bookmarks: 'cf.bookmarks.v1',
  auth: 'cf.auth.v1',
  updateDismissed: 'cf.updateDismissed.v1',
};
