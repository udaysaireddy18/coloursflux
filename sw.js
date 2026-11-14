/* eslint-env serviceworker */
/**
 * ColoursFlux service worker.
 *
 * Rules:
 *  - Public app shell is precached so a later visit works offline.
 *  - Navigations are network-first, falling back to cache and then offline.html.
 *  - Same-origin assets use stale-while-revalidate. `env.js` is the exception:
 *    it is network-first so new credentials take effect without a cache bump.
 *  - Public Supabase Storage images may be cached (bounded); auth/REST traffic
 *    is NEVER cached, so admin sessions and private responses cannot leak.
 *  - /admin/ is network-only by design.
 */

const VERSION = 'v1.7.0';
const SHELL_CACHE = `coloursflux-shell-${VERSION}`;
const IMAGE_CACHE = `coloursflux-images-${VERSION}`;
const OFFLINE_URL = 'offline.html';
const IMAGE_LIMIT = 60;

const SHELL = [
  './',
  './index.html',
  './events.html',
  './event.html',
  './map.html',
  './stalls.html',
  './announcements.html',
  './about.html',
  './install.html',
  './privacy.html',
  './terms.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/css/base.css',
  './assets/css/components.css',
  './assets/css/pages.css',
  './assets/css/intro.css?v=3',
  './assets/js/env.js',
  './assets/js/config.js',
  './assets/js/icons.js',
  './assets/js/util.js',
  './assets/js/idb.js',
  './assets/js/sample-data.js',
  './assets/js/api.js',
  './assets/js/store.js',
  './assets/js/ui.js',
  './assets/js/intro.js?v=4',
  './assets/js/pwa.js',
  './assets/js/qr.js',
  './assets/js/pages/home.js',
  './assets/js/pages/events.js',
  './assets/js/pages/event.js',
  './assets/js/pages/map.js',
  './assets/js/pages/stalls.js',
  './assets/js/pages/announcements.js',
  './assets/js/pages/about.js',
  './assets/js/pages/install.js',
  './assets/js/pages/offline.js',
  './assets/js/pages/static.js',
  './assets/fonts/fraunces-latin.woff2',
  './assets/fonts/space-grotesk-latin.woff2',
  './assets/icons/favicon.svg',
  './assets/icons/favicon.png',
  './assets/icons/logo.png',
  './assets/icons/logo-mark.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/img/art/wave-purple.svg',
  './assets/img/art/wave-magenta.svg',
  './assets/img/art/wave-cyan.svg',
  './assets/img/art/wave-amber.svg',
  './assets/img/art/wave-emerald.svg',
  './assets/img/art/vendor-coffee.svg',
  './assets/img/art/vendor-fashion.svg',
  './assets/img/art/vendor-tech.svg',
  './assets/img/art/vendor-art.svg',
  './assets/img/art/vendor-food.svg',
  './assets/img/art/vendor-merch.svg',
  './assets/img/art/vendor-books.svg',
  './assets/img/events/basketball-men.jpg',
  './assets/img/events/basketball-women.jpg',
  './assets/img/events/chess-men.jpg',
  './assets/img/events/chess-women.jpg',
  './assets/img/events/dance-duet.jpg',
  './assets/img/events/dance-group.jpg',
  './assets/img/events/dance-solo.jpg',
  './assets/img/events/dumb-charades.jpg',
  './assets/img/events/fashion-show.jpg',
  './assets/img/events/football-men.jpg',
  './assets/img/events/instrumental.jpg',
  './assets/img/events/jumping.jpg',
  './assets/img/events/kabaddi-men.jpg',
  './assets/img/events/kabaddi-women.jpg',
  './assets/img/events/kho-kho-men.jpg',
  './assets/img/events/kho-kho-women.jpg',
  './assets/img/events/mehandi.jpg',
  './assets/img/events/mime.jpg',
  './assets/img/events/mimicry.jpg',
  './assets/img/events/mono-action.jpg',
  './assets/img/events/movie-making.jpg',
  './assets/img/events/rangoli.jpg',
  './assets/img/events/relay.jpg',
  './assets/img/events/running.jpg',
  './assets/img/events/sahityam.jpg',
  './assets/img/events/shuttle-badminton-singles-men.jpg',
  './assets/img/events/shuttle-badminton-singles-women.jpg',
  './assets/img/events/singing.jpg',
  './assets/img/events/skit.jpg',
  './assets/img/events/spot-painting.jpg',
  './assets/img/events/spot-photography.jpg',
  './assets/img/events/stand-up-comedy.jpg',
  './assets/img/events/table-tennis-singles-men.jpg',
  './assets/img/events/table-tennis-singles-women.jpg',
  './assets/img/events/tennikoit-singles-women.jpg',
  './assets/img/events/throwball-women.jpg',
  './assets/img/events/throwing.jpg',
  './assets/img/events/treasure-hunt.jpg',
  './assets/img/events/volleyball-men.jpg',
  './assets/img/campus-map.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll is all-or-nothing; add individually so one 404 cannot block install.
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (res.ok) await cache.put(url, res);
          } catch {
            /* keep installing with whatever succeeded */
          }
        })
      );
      // Take over as soon as the new shell is cached. The page listens for
      // `controllerchange` and reloads once, so a version bump reaches every
      // visitor without them having to dismiss an update banner.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('coloursflux-') && ![SHELL_CACHE, IMAGE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'REVALIDATE') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        await Promise.all(
          SHELL.map(async (url) => {
            try {
              const res = await fetch(new Request(url, { cache: 'no-cache' }));
              if (res.ok) await cache.put(url, res);
            } catch {
              /* offline: keep the existing copy */
            }
          })
        );
      })()
    );
  }
});

const isAdmin = (url) => url.pathname.includes('/admin/');

/**
 * Configuration that must never go stale. `env.js` only changes when an
 * organiser adds their Supabase credentials, and a cached blank copy would keep
 * the site in demo mode forever. Network-first, cache only as an offline
 * fallback.
 */
const isLiveConfig = (url) => /\/assets\/js\/env\.js$/.test(url.pathname);

const isPublicStorageImage = (url) =>
  url.pathname.includes('/storage/v1/object/public/');

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

/** Cache lookup that ignores the query string (event.html?slug=...). */
async function matchIgnoringSearch(request) {
  const cache = await caches.open(SHELL_CACHE);
  const direct = await cache.match(request);
  if (direct) return direct;
  const url = new URL(request.url);
  url.search = '';
  return cache.match(url.href);
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  if (isAdmin(url)) {
    try {
      return await fetch(request);
    } catch {
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>Connection required</title>
         <link rel="icon" href="../assets/icons/favicon.svg" type="image/svg+xml">
         <body style="background:#080b1a;color:#f8fafc;font-family:system-ui;padding:40px;line-height:1.6">
         <h1 style="font-size:1.4rem">The admin dashboard needs a connection</h1>
         <p style="color:#a7b0d0">Admin pages are never cached, so they cannot be opened offline.</p>
         <a href="../index.html" style="color:#a5b4fc">Go to the public site</a></body>`,
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  }

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await matchIgnoringSearch(request);
    if (cached) return cached;
    const offline = await caches.match(new URL(OFFLINE_URL, self.registration.scope).href);
    if (offline) return offline;
    return new Response('You are offline and this page is not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(SHELL_CACHE);

  // env.js: always prefer the network so newly added credentials take effect
  // without a cache version bump. Fall back to the cached copy when offline.
  if (isLiveConfig(new URL(request.url))) {
    try {
      const res = await fetch(new Request(request, { cache: 'no-cache' }));
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    } catch {
      const fallback = await cache.match(request);
      if (fallback) return fallback;
      return new Response('', { status: 504, statusText: 'Offline and not cached' });
    }
  }

  const cached = await cache.match(request);

  // Code and styles are network-first so a deploy never leaves a visitor on an
  // old bundle (which is how stale dates, event artwork and maps happened).
  // Images keep stale-while-revalidate for fast repeat loads.
  if (['script', 'style', 'manifest'].includes(request.destination)) {
    try {
      const fresh = await fetch(new Request(request, { cache: 'no-cache' }));
      if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    } catch {
      if (cached) return cached;
      return new Response('', { status: 504, statusText: 'Offline and not cached' });
    }
  }

  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);

  if (cached) {
    // Revalidate in the background.
    network.catch(() => {});
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  return new Response('', { status: 504, statusText: 'Offline and not cached' });
}

async function handleStorageImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (res) => {
      if (res && res.ok) {
        await cache.put(request, res.clone());
        trimCache(IMAGE_CACHE, IMAGE_LIMIT);
      }
      return res;
    })
    .catch(() => null);
  if (cached) {
    network.catch(() => {});
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  return new Response('', { status: 504, statusText: 'Image unavailable offline' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) {
    // Never cache auth or REST responses. Only public storage images.
    if (isPublicStorageImage(url) && request.destination === 'image') {
      event.respondWith(handleStorageImage(request));
    }
    return;
  }

  // /admin/ is never cached. Navigations still go through the worker so an
  // offline organiser gets a friendly explanation instead of the browser's
  // dinosaur page; its assets are left entirely to the browser.
  if (isAdmin(url)) {
    if (request.mode === 'navigate') event.respondWith(handleNavigation(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (['style', 'script', 'image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(handleAsset(request));
  }
});
