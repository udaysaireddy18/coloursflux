/** Small shared helpers. No framework, no dependencies. */

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Escape untrusted strings before inserting into innerHTML. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow http(s) and same-origin relative URLs in href/src attributes. */
export function safeUrl(value, fallback = '') {
  if (!value) return fallback;
  try {
    const url = new URL(String(value), location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    /* ignore */
  }
  return fallback;
}

export const debounce = (fn, wait = 220) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Parse a plain `YYYY-MM-DD` date as a calendar date (no timezone drift).
 * Returns null for invalid input.
 */
export function parseDateOnly(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2027-01-07" -> "Fri, 7 Jan 2027" */
export function formatDay(str, { long = false } = {}) {
  const d = parseDateOnly(str);
  if (!d) return 'Date to be announced';
  const names = long ? DAYS_LONG : DAYS;
  const months = long ? MONTHS_LONG : MONTHS;
  return `${names[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "2027-01-07" -> "12 Feb" */
export function formatDayShort(str) {
  const d = parseDateOnly(str);
  if (!d) return 'TBA';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function weekday(str) {
  const d = parseDateOnly(str);
  return d ? DAYS[d.getUTCDay()] : 'TBA';
}

/** "18:30:00" -> "6:30 PM" */
export function formatTime(str) {
  if (!str) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(str));
  if (!m) return String(str);
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

export function formatTimeRange(start, end) {
  if (!start) return '';
  const s = formatTime(start);
  const e = formatTime(end);
  return e ? `${s} – ${e}` : s;
}

/** ISO timestamp -> "7 Jan 2027, 6:30 PM" in the given IANA timezone. */
export function formatDateTime(iso, timezone = 'Asia/Kolkata') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/** ISO timestamp -> "3 min ago" */
export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.round((Date.now() - then) / 1000);
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.round(diff / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Difference broken into days/hours/minutes/seconds for countdowns. */
export function breakDown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: total <= 0,
  };
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isExpired(dateLike) {
  if (!dateLike) return false;
  const t = new Date(dateLike).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

/** Read a query param from the current URL. */
export function param(name, fallback = '') {
  return new URLSearchParams(location.search).get(name) ?? fallback;
}

export function setParam(name, value) {
  const url = new URL(location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  return url;
}

/** Simple deterministic colour for letter avatars. */
export function hueFor(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

/** Group items by a key, preserving insertion order. */
export function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function sortByDate(items) {
  return [...items].sort((a, b) => {
    const ka = `${a.event_date || ''} ${a.start_time || ''}`;
    const kb = `${b.event_date || ''} ${b.start_time || ''}`;
    return ka.localeCompare(kb);
  });
}

/** Returns unique sorted `event_date` values from a list of events. */
export function uniqueDays(events) {
  return [...new Set(events.map((e) => e.event_date).filter(Boolean))].sort();
}

export function money(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

/** Trailing-edge timer that survives re-renders. */
export function raf(fn) {
  return requestAnimationFrame(fn);
}
