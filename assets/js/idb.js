/**
 * IndexedDB wrapper for offline festival data.
 * One database, one object store per table, plus a `meta` store for sync state.
 */
import { APP } from './config.js';

const DB_NAME = 'coloursflux';
const DB_VERSION = APP.schemaVersion;
const STORES = [
  'events',
  'locations',
  'vendors',
  'offers',
  'announcements',
  'sponsorships',
  'config',
  'meta',
];

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error || new Error('Could not open local database.'));
    req.onblocked = () => reject(new Error('Local database is blocked by another tab.'));
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    try {
      result = fn(os);
    } catch (err) {
      reject(err);
      return;
    }
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
    t.onerror = () => reject(t.error || new Error('Local database write failed.'));
    t.onabort = () => reject(t.error || new Error('Local database write aborted.'));
  });
}

export async function getAll(store) {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readonly');
      const req = t.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function replaceAll(store, rows) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const os = t.objectStore(store);
    os.clear();
    for (const row of rows) {
      if (row && row.id != null) os.put(row);
    }
    t.oncomplete = () => resolve(rows.length);
    t.onerror = () => reject(t.error || new Error('Could not save offline data.'));
  });
}

export async function put(store, value) {
  return tx(store, 'readwrite', (os) => os.put(value));
}

export async function del(store, key) {
  return tx(store, 'readwrite', (os) => os.delete(key));
}

export async function clearAll() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES, 'readwrite');
    for (const name of STORES) t.objectStore(name).clear();
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

export async function setMeta(key, value) {
  return put('meta', { id: key, value });
}

export async function getMeta(key, fallback = null) {
  try {
    const db = await open();
    const row = await new Promise((resolve, reject) => {
      const t = db.transaction('meta', 'readonly');
      const req = t.objectStore('meta').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

/** Approximate storage usage, used by the offline settings card. */
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}
