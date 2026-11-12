/**
 * Admin data layer.
 *
 * Loads the *unpublished* rows the public site never sees (drafts, pending
 * vendors, archived notices) and keeps an in-memory copy that the table views
 * render from. Every write goes straight to PostgREST; Row Level Security is the
 * authority on whether it is allowed. The local copy is only updated after the
 * server confirms the change, so the dashboard never shows a phantom success.
 */
import { adminDelete, adminInsert, adminSelect, adminUpdate, uploadImage } from '../api.js';
import { RESOURCES } from './schemas.js';

export const TABLE_KEYS = Object.keys(RESOURCES);

export const state = {
  loading: false,
  loaded: false,
  error: null,
  lastLoad: null,
  profile: null,
  tables: Object.fromEntries(TABLE_KEYS.map((key) => [key, []])),
  config: null,
  activity: [],
  profiles: [],
  warnings: [],
};

/** Rows for one resource, in the schema's display order. */
export function rows(key) {
  return state.tables[key] || [];
}

/** Find a row in the already-loaded tables. */
export function findRow(key, id) {
  return rows(key).find((r) => r.id === id) || null;
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const LOOKUP = {
  locations: { label: 'name', table: 'locations' },
  vendors: { label: 'name', table: 'vendors' },
};

/** Options for a `<select>` backed by another table. */
export function lookupOptions(source) {
  const cfg = LOOKUP[source];
  if (!cfg) return [];
  return rows(cfg.table)
    .map((r) => ({ value: r.id, label: r[cfg.label] || 'Untitled' }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function lookupLabel(source, id) {
  if (!id) return '';
  const cfg = LOOKUP[source];
  if (!cfg) return '';
  const found = rows(cfg.table).find((r) => r.id === id);
  return found?.[cfg.label] || '';
}

export const locationName = (id) => lookupLabel('locations', id);
export const vendorName = (id) => lookupLabel('vendors', id);

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

function orderQuery(key) {
  const order = RESOURCES[key]?.order;
  return `select=*${order ? `&order=${order}` : ''}`;
}

async function selectTable(key) {
  return adminSelect(key, orderQuery(key));
}

let loadingPromise = null;

/**
 * Load every admin collection. The content tables must all succeed; auxiliary
 * feeds (activity, team) degrade gracefully so a strict RLS policy on those
 * tables cannot take down the whole dashboard.
 */
export function loadAll(profile = state.profile) {
  if (loadingPromise) return loadingPromise;
  loadingPromise = loadAllInner(profile).finally(() => {
    loadingPromise = null;
  });
  return loadingPromise;
}

async function loadAllInner(profile) {
  state.loading = true;
  state.error = null;
  state.warnings = [];

  try {
    const results = await Promise.all(TABLE_KEYS.map((key) => selectTable(key)));
    TABLE_KEYS.forEach((key, i) => {
      state.tables[key] = results[i] || [];
    });

    const [configRows, activity, profiles] = await Promise.all([
      adminSelect('app_config', 'select=*&id=eq.app&limit=1').catch((err) => {
        state.warnings.push(`Settings could not be loaded: ${err.message}`);
        return [];
      }),
      adminSelect('activity_log', 'select=*&order=created_at.desc&limit=25').catch((err) => {
        state.warnings.push(`Activity feed unavailable: ${err.message}`);
        return [];
      }),
      profile?.role === 'admin'
        ? adminSelect('profiles', 'select=*&order=created_at.asc').catch((err) => {
            state.warnings.push(`Team list unavailable: ${err.message}`);
            return [];
          })
        : Promise.resolve([]),
    ]);

    state.config = Array.isArray(configRows) ? configRows[0] || null : configRows;
    state.activity = activity || [];
    state.profiles = profiles || [];
    state.profile = profile || state.profile;
    state.loaded = true;
    state.lastLoad = new Date().toISOString();
    return state;
  } catch (err) {
    state.error = err;
    throw err;
  } finally {
    state.loading = false;
  }
}

/** Re-fetch one table, e.g. after a write. */
export async function reloadTable(key) {
  state.tables[key] = await selectTable(key);
  return state.tables[key];
}

export async function reloadConfig() {
  const configRows = await adminSelect('app_config', 'select=*&id=eq.app&limit=1');
  state.config = Array.isArray(configRows) ? configRows[0] || null : configRows;
  return state.config;
}

export async function reloadActivity() {
  try {
    state.activity = await adminSelect(
      'activity_log',
      'select=*&order=created_at.desc&limit=25'
    );
  } catch {
    /* activity is informative only */
  }
  return state.activity;
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export async function createRow(key, values) {
  const result = await adminInsert(key, values);
  const row = Array.isArray(result) ? result[0] : result;
  await Promise.all([reloadTable(key), reloadActivity()]);
  return row;
}

export async function updateRow(key, id, patch) {
  const result = await adminUpdate(key, id, patch);
  const row = Array.isArray(result) ? result[0] : result;
  await Promise.all([reloadTable(key), reloadActivity()]);
  return row;
}

export async function deleteRow(key, id) {
  await adminDelete(key, id);
  await Promise.all([reloadTable(key), reloadActivity()]);
  return true;
}

export async function saveConfig(values) {
  const result = state.config
    ? await adminUpdate('app_config', 'app', values)
    : await adminInsert('app_config', { id: 'app', ...values });
  const row = Array.isArray(result) ? result[0] : result;
  state.config = row;
  await reloadActivity();
  return row;
}

export async function saveProfileRole(id, role) {
  const result = await adminUpdate('profiles', id, { role });
  const row = Array.isArray(result) ? result[0] : result;
  if (row) {
    state.profiles = state.profiles.map((p) => (p.id === id ? { ...p, ...row } : p));
  } else {
    await loadProfiles();
  }
  return row;
}

export async function loadProfiles() {
  state.profiles = await adminSelect('profiles', 'select=*&order=created_at.asc');
  return state.profiles;
}

/* ------------------------------------------------------------------ */
/* Storage                                                            */
/* ------------------------------------------------------------------ */

export function upload(file, folder) {
  return uploadImage(file, folder);
}

/* ------------------------------------------------------------------ */
/* Derived values                                                     */
/* ------------------------------------------------------------------ */

export function sampleRowCount() {
  return TABLE_KEYS.reduce(
    (total, key) => total + rows(key).filter((r) => r.is_sample).length,
    0
  );
}

export function stats() {
  const events = rows('events');
  const vendors = rows('vendors');
  const offers = rows('offers');
  const announcements = rows('announcements');
  return {
    events: events.length,
    eventsPublished: events.filter((e) => e.status === 'published').length,
    eventsDraft: events.filter((e) => e.status === 'draft').length,
    vendors: vendors.length,
    vendorsPending: vendors.filter((v) => v.approval_status === 'pending').length,
    offersActive: offers.filter((o) => o.status === 'active').length,
    announcementsPublished: announcements.filter((a) => a.status === 'published').length,
    locations: rows('locations').length,
    sponsorsActive: rows('sponsorships').filter((s) => s.status === 'active').length,
  };
}

/** Upcoming published events, soonest first (calendar-date comparison). */
export function upcoming(limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  return rows('events')
    .filter((e) => e.status === 'published' && e.event_date >= today)
    .sort((a, b) =>
      `${a.event_date}T${a.start_time || ''}`.localeCompare(`${b.event_date}T${b.start_time || ''}`)
    )
    .slice(0, limit);
}

export function lastLoadLabel() {
  if (!state.lastLoad) return 'not loaded yet';
  return new Date(state.lastLoad).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
