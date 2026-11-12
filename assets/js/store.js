/**
 * Central store: cached reads, live sync, bookmarks and connectivity state.
 *
 * Pages never talk to the network directly — they call `store.init()` and read
 * from `store.state`. That keeps loading / empty / offline / stale states in one
 * place instead of being re-implemented on every page.
 */
import { FALLBACK_CONFIG, LS, hasSupabase } from './config.js';
import { fetchPublicData, isConfigured } from './api.js';
import { getAll, replaceAll, getMeta, setMeta, clearAll } from './idb.js';
import { SAMPLE } from './sample-data.js';
import { isExpired } from './util.js';

const TABLES = ['events', 'locations', 'vendors', 'offers', 'announcements', 'sponsorships'];

export const state = {
  status: 'idle', // idle | loading | ready | error
  source: 'empty', // live | cache | sample | empty
  online: navigator.onLine,
  lastSync: null,
  dataVersion: null,
  error: null,
  stale: false,
  events: [],
  locations: [],
  vendors: [],
  offers: [],
  announcements: [],
  sponsorships: [],
  config: { ...FALLBACK_CONFIG },
};

let initialized = false;
let syncing = null;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(type) {
  for (const fn of listeners) {
    try {
      fn(type, state);
    } catch (err) {
      console.error('[store] listener failed', err);
    }
  }
  window.dispatchEvent(new CustomEvent(`cf:${type}`, { detail: state }));
}

const withSampleFlag = (rows) => rows.map((r) => ({ ...r, _sample: true }));

/** Preserve the database `is_sample` flag in the UI. */
const tagSamples = (rows) =>
  (rows || []).map((row) => (row.is_sample ? { ...row, _sample: true } : row));

function normalizeConfig(raw) {
  const cfg = { ...FALLBACK_CONFIG, ...(raw || {}) };
  if (typeof cfg.social_links === 'string') {
    try {
      cfg.social_links = JSON.parse(cfg.social_links);
    } catch {
      cfg.social_links = [];
    }
  }
  if (!Array.isArray(cfg.social_links)) cfg.social_links = [];
  return cfg;
}

/* ---------------------------------------------------------------- */
/* Hydration                                                        */
/* ---------------------------------------------------------------- */

async function hydrate() {
  const [events, locations, vendors, offers, announcements, sponsorships, configRows, lastSync, dataVersion] =
    await Promise.all([
      getAll('events'),
      getAll('locations'),
      getAll('vendors'),
      getAll('offers'),
      getAll('announcements'),
      getAll('sponsorships'),
      getAll('config'),
      getMeta('lastSync'),
      getMeta('dataVersion'),
    ]);

  const hasCache = events.length + locations.length + vendors.length + announcements.length > 0;

  state.events = events;
  state.locations = locations;
  state.vendors = vendors;
  state.offers = offers;
  state.announcements = announcements;
  state.sponsorships = sponsorships;
  state.config = configRows[0] ? normalizeConfig(configRows[0]) : { ...FALLBACK_CONFIG };
  state.lastSync = lastSync || null;
  state.dataVersion = dataVersion ?? null;

  if (hasCache) {
    state.source = 'cache';
    state.stale = true;
  }
  return hasCache;
}

function loadSample() {
  state.events = withSampleFlag(SAMPLE.events);
  state.locations = withSampleFlag(SAMPLE.locations);
  state.vendors = withSampleFlag(SAMPLE.vendors);
  state.offers = withSampleFlag(SAMPLE.offers);
  state.announcements = withSampleFlag(SAMPLE.announcements);
  state.sponsorships = withSampleFlag(SAMPLE.sponsorships);
  state.config = { ...SAMPLE.config[0], _sample: true };
  state.source = 'sample';
  state.lastSync = null;
}

/* ---------------------------------------------------------------- */
/* Sync                                                             */
/* ---------------------------------------------------------------- */

/**
 * Pull published content into memory + IndexedDB.
 * Never fakes success: on failure the previous cache (or sample data) is kept
 * and the error is surfaced.
 */
export async function sync({ reason = 'manual' } = {}) {
  if (!isConfigured()) {
    const err = new Error('Connect Supabase to sync live festival data.');
    err.code = 'not-configured';
    throw err;
  }
  if (!navigator.onLine) {
    const err = new Error('You are offline. Showing saved data.');
    err.code = 'offline';
    throw err;
  }
  if (syncing) return syncing;

  syncing = (async () => {
    emit('syncing');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const data = await fetchPublicData({ signal: controller.signal });
      const next = {
        events: tagSamples(data.events),
        locations: tagSamples(data.locations),
        vendors: tagSamples((data.vendors || []).filter((v) => v.approval_status === 'approved')),
        offers: tagSamples(data.offers),
        announcements: tagSamples(data.announcements),
        sponsorships: tagSamples(data.sponsorships),
      };
      await Promise.all(TABLES.map((t) => replaceAll(t, next[t])));
      const config = normalizeConfig(data.config);
      if (data.config?.is_sample) config._sample = true;
      await replaceAll('config', [{ ...config, id: 'app' }]);
      const now = new Date().toISOString();
      await Promise.all([
        setMeta('lastSync', now),
        setMeta('dataVersion', config.data_version ?? null),
      ]);

      Object.assign(state, next, {
        config,
        source: 'live',
        status: 'ready',
        online: true,
        stale: false,
        lastSync: now,
        dataVersion: config.data_version ?? null,
        error: null,
      });
      emit('sync');
      return state;
    } catch (err) {
      const friendly =
        err?.name === 'AbortError'
          ? new Error('The server took too long to respond.')
          : err;
      state.error = friendly;
      state.stale = true;
      if (state.source === 'empty' && !state.events.length) {
        state.status = 'error';
      }
      emit('sync-error');
      throw friendly;
    } finally {
      clearTimeout(timer);
      syncing = null;
    }
  })();

  return syncing;
}

export async function init({ autoSync = true } = {}) {
  if (initialized) return state;
  state.status = 'loading';
  emit('loading');

  const hasCache = await hydrate();

  if (!isConfigured()) {
    // No backend configured: labelled demo mode, never presented as live.
    loadSample();
    state.status = 'ready';
    state.stale = true;
    initialized = true;
    emit('ready');
    return state;
  }

  if (autoSync && navigator.onLine) {
    try {
      await sync({ reason: 'init' });
    } catch {
      /* state already carries the error + cache/sample fallback */
    }
  }

  if (!state.events.length && state.source !== 'live') {
    state.source = 'empty';
    state.status = state.error ? 'error' : 'ready';
  } else {
    state.status = 'ready';
  }

  initialized = true;
  emit('ready');
  return state;
}

/** "Download festival data" / pull-to-refresh action. */
export async function refresh() {
  if (!isConfigured()) {
    const err = new Error('Live sync needs Supabase credentials. Demo data is shown instead.');
    err.code = 'not-configured';
    throw err;
  }
  return sync({ reason: 'manual' });
}

export async function wipeCache() {
  await clearAll();
  state.events = [];
  state.locations = [];
  state.vendors = [];
  state.offers = [];
  state.announcements = [];
  state.sponsorships = [];
  state.config = { ...FALLBACK_CONFIG };
  state.source = 'empty';
  state.lastSync = null;
  state.dataVersion = null;
  state.stale = false;
  emit('wipe');
}

/* ---------------------------------------------------------------- */
/* Connectivity                                                     */
/* ---------------------------------------------------------------- */

function setOnline(value) {
  if (state.online === value) return;
  state.online = value;
  emit('connection');
  if (value && isConfigured() && initialized) {
    // Reconnect: quietly refresh published content.
    sync({ reason: 'reconnect' }).catch(() => {});
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
}

/* ---------------------------------------------------------------- */
/* Bookmarks (device-local)                                        */
/* ---------------------------------------------------------------- */

function readBookmarks() {
  try {
    const raw = localStorage.getItem(LS.bookmarks);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function bookmarks() {
  return readBookmarks();
}

export function isBookmarked(id) {
  return readBookmarks().includes(id);
}

export function toggleBookmark(id) {
  const current = readBookmarks();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
  localStorage.setItem(LS.bookmarks, JSON.stringify(next.slice(0, 200)));
  emit('bookmarks');
  return next.includes(id);
}

/* ---------------------------------------------------------------- */
/* Selectors                                                        */
/* ---------------------------------------------------------------- */

export const byId = (rows, id) => rows.find((r) => r.id === id) || null;

export function locationOf(record) {
  if (!record) return null;
  if (record.location && typeof record.location === 'object') return record.location;
  return byId(state.locations, record.location_id);
}

export function publishedEvents() {
  return state.events.filter((e) => e.status === 'published' || e.status === 'cancelled');
}

export function featuredEvents() {
  return publishedEvents().filter((e) => e.featured);
}

export function upcomingEvents(limit = 6) {
  return publishedEvents().slice(0, limit);
}

export function activeOffers() {
  return state.offers.filter((o) => o.status === 'active' && !isExpired(o.valid_until));
}

export function offersForVendor(vendorId) {
  return activeOffers().filter((o) => o.vendor_id === vendorId);
}

export function vendorById(id) {
  return byId(state.vendors, id);
}

export function featuredVendors() {
  return state.vendors.filter(
    (v) => v.is_featured && v.approval_status === 'approved' && !isExpired(v.featured_until)
  );
}

export function publishedAnnouncements() {
  return [...state.announcements]
    .filter((a) => a.status === 'published' && !isExpired(a.expires_at))
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
}

export function activeSponsorships(placement) {
  return state.sponsorships.filter(
    (s) =>
      s.status === 'active' &&
      !isExpired(s.campaign_end) &&
      (!placement || s.placement === placement)
  );
}

export function isSampleMode() {
  return state.source === 'sample';
}

/** True when any currently loaded record is a seeded sample row. */
export function hasSampleRecords() {
  return TABLES.some((table) => (state[table] || []).some((row) => row._sample));
}

export function lastSyncLabel() {
  if (!state.lastSync) return 'Never synced';
  return new Date(state.lastSync).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const store = {
  state,
  init,
  sync,
  refresh,
  subscribe,
  wipeCache,
  bookmarks,
  isBookmarked,
  toggleBookmark,
  byId,
  locationOf,
  publishedEvents,
  featuredEvents,
  upcomingEvents,
  activeOffers,
  offersForVendor,
  vendorById,
  featuredVendors,
  publishedAnnouncements,
  activeSponsorships,
  isSampleMode,
  hasSampleRecords,
  lastSyncLabel,
  hasSupabase,
};

export default store;
