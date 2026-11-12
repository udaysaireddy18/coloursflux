/**
 * Data access layer.
 *
 * Public reads use the Supabase REST (PostgREST) endpoints with the public
 * anon key, so no heavy SDK is needed on the public site and everything can be
 * cached offline. Admin writes reuse the same endpoints with the signed-in
 * user's access token; Row Level Security decides what is actually allowed.
 *
 * Supabase Auth is the GoTrue REST API (`/auth/v1`), which is exactly what
 * supabase-js talks to under the hood.
 */
import { APP, LS, REST, AUTH, STORAGE_PUBLIC, hasSupabase } from './config.js';
import { ENV } from './env.js';

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const isConfigured = hasSupabase;

const baseHeaders = () => ({
  apikey: ENV.SUPABASE_ANON_KEY,
  Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
});

async function parseError(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* no json body */
  }
  const message =
    body?.message || body?.error_description || body?.error || `Request failed (${res.status})`;
  return new ApiError(message, { status: res.status, details: body });
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

const NOW = () => new Date().toISOString();

const PUBLIC_QUERIES = {
  events:
    'select=*,location:locations(id,name,location_type,map_x,map_y,is_published)' +
    '&status=in.(published,cancelled)&order=event_date.asc,start_time.asc',
  locations: 'select=*&is_published=is.true&order=name.asc',
  vendors:
    'select=*,location:locations(id,name,location_type,map_x,map_y)' +
    '&approval_status=eq.approved&order=is_featured.desc,name.asc',
  offers:
    'select=*,vendor:vendors(id,name,category,is_featured)' +
    `&status=eq.active&or=(valid_until.is.null,valid_until.gt.${encodeURIComponent(NOW())})` +
    '&order=created_at.desc',
  announcements:
    'select=*&status=eq.published' +
    `&or=(expires_at.is.null,expires_at.gt.${encodeURIComponent(NOW())})` +
    '&order=published_at.desc',
  sponsorships: 'select=*&status=eq.active&order=created_at.desc',
  config: 'select=*&id=eq.app&limit=1',
};

async function get(table, query, { token = null, signal } = {}) {
  if (!hasSupabase()) throw new ApiError('Supabase is not configured.');
  const headers = token
    ? { apikey: ENV.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    : baseHeaders();
  const res = await fetch(`${REST()}/${table}?${query}`, { headers, signal });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

/** Fetch every public collection in parallel. Throws on the first failure. */
export async function fetchPublicData({ signal } = {}) {
  const entries = Object.entries(PUBLIC_QUERIES);
  const results = await Promise.all(
    entries.map(async ([table, query]) => [table, await get(table, query, { signal })])
  );
  const data = Object.fromEntries(results);
  data.config = Array.isArray(data.config) ? data.config[0] || null : data.config;
  return data;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

const authHeaders = () => ({
  apikey: ENV.SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
});

export async function signIn(email, password) {
  if (!hasSupabase()) throw new ApiError('Supabase is not configured. Add your keys to assets/js/env.js.');
  const res = await fetch(`${AUTH()}/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseError(res);
  const session = await res.json();
  saveSession(session);
  return session;
}

export async function refreshSession(session) {
  if (!session?.refresh_token) throw new ApiError('Session expired. Please sign in again.');
  const res = await fetch(`${AUTH()}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!res.ok) {
    clearSession();
    throw new ApiError('Session expired. Please sign in again.', { status: 401 });
  }
  const next = await res.json();
  saveSession(next);
  return next;
}

export async function signOut(session) {
  const token = session?.access_token;
  clearSession();
  if (!token || !hasSupabase()) return;
  try {
    await fetch(`${AUTH()}/logout`, {
      method: 'POST',
      headers: { apikey: ENV.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
  } catch {
    /* offline sign-out still clears the local session */
  }
}

function saveSession(session) {
  const expiresAt = Date.now() + (session.expires_in || 3600) * 1000;
  localStorage.setItem(
    LS.auth,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: expiresAt,
      user: session.user || null,
    })
  );
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(LS.auth);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.access_token ? session : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(LS.auth);
}

/** Guarantees a valid access token, refreshing if it expires within 60s. */
export async function getAccessToken() {
  let session = loadSession();
  if (!session) throw new ApiError('Not signed in.', { status: 401 });
  if (session.expires_at && session.expires_at - 60_000 < Date.now()) {
    session = await refreshSession(session);
  }
  return session.access_token;
}

export async function getProfile() {
  const session = loadSession();
  if (!session?.user?.id) return null;
  const rows = await adminSelect(
    'profiles',
    `select=*&id=eq.${encodeURIComponent(session.user.id)}&limit=1`
  );
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/* Admin CRUD                                                          */
/* ------------------------------------------------------------------ */

const authHeader = async () => ({
  apikey: ENV.SUPABASE_ANON_KEY,
  Authorization: `Bearer ${await getAccessToken()}`,
  'Content-Type': 'application/json',
});

/** Retries once after a refresh if the token was rejected. */
async function withAuthRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const session = loadSession();
      if (session?.refresh_token) {
        await refreshSession(session);
        return fn();
      }
    }
    throw err;
  }
}

export async function adminSelect(table, query = 'select=*') {
  return withAuthRetry(async () => {
    const res = await fetch(`${REST()}/${table}?${query}`, { headers: await authHeader() });
    if (!res.ok) throw await parseError(res);
    return res.json();
  });
}

export async function adminInsert(table, row) {
  return withAuthRetry(async () => {
    const res = await fetch(`${REST()}/${table}`, {
      method: 'POST',
      headers: { ...(await authHeader()), Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw await parseError(res);
    return res.json();
  });
}

export async function adminUpdate(table, id, patch) {
  return withAuthRetry(async () => {
    const res = await fetch(`${REST()}/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...(await authHeader()), Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw await parseError(res);
    return res.json();
  });
}

export async function adminDelete(table, id) {
  return withAuthRetry(async () => {
    const res = await fetch(`${REST()}/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await authHeader(),
    });
    if (!res.ok) throw await parseError(res);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/**
 * Uploads an image to the public `festival-media` bucket.
 * Type and size are validated client-side; the bucket policy enforces the same
 * limits server-side.
 */
export async function uploadImage(file, folder = 'events') {
  if (!file) throw new ApiError('Choose an image first.');
  if (!APP.upload.types.includes(file.type)) {
    throw new ApiError('Only PNG, JPEG or WebP images are allowed.');
  }
  if (file.size > APP.upload.maxBytes) {
    throw new ApiError(`Image must be smaller than ${APP.upload.maxBytes / 1024 / 1024} MB.`);
  }
  const token = await getAccessToken();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const res = await fetch(`${ENV.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${APP.storageBucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: ENV.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: file,
  });
  if (!res.ok) throw await parseError(res);
  return `${STORAGE_PUBLIC()}/${path}`;
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

/** Lightweight connectivity probe against the configured backend. */
export async function ping() {
  if (!hasSupabase()) return false;
  try {
    const res = await fetch(`${REST()}/app_config?select=id&limit=1`, {
      headers: baseHeaders(),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
