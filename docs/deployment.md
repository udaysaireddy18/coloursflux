# Deployment

ColoursFlux is a static site. If a host can serve files over HTTPS, it can serve
ColoursFlux. There is no Node server, bundler or runtime secret.

## 1. Before you upload

- [ ] `assets/js/env.js` contains your **Project URL** and **anon/publishable**
      key. It contains no `service_role` key.
- [ ] `supabase/schema.sql`, `policies.sql` and `storage.sql` have been run.
- [ ] The first admin exists in `profiles` and can sign in at `/admin/`.
- [ ] Festival dates and timezone are set in **Admin → Settings**, not in code.
- [ ] Sample rows are removed (dashboard shows "0 seeded sample records").
- [ ] Real contacts/social links are filled in only if approved.
- [ ] You have tested the site on a real phone, including one offline reload.

The demo build works without these steps, but it is clearly labelled demo mode.

## 2. Root layout

Upload the repository root **as the site root**. The important relative paths
are:

```text
/index.html
/events.html, /event.html, /map.html, /stalls.html,
/announcements.html, /about.html, /install.html,
/privacy.html, /terms.html, /offline.html
/manifest.webmanifest
/sw.js
/admin/index.html
/assets/…
```

Everything is linked relatively, so a subdirectory deployment (for example a
GitHub Pages project site at `/coloursflux/`) also works, as long as `/admin/`
stays a subdirectory of the public root.

## 3. Host-specific notes

### Netlify

- Build command: **none**
- Publish directory: `.` (or the repository root)
- Add a `_headers` file beside `index.html`:

```text
/sw.js
  Cache-Control: no-cache

/*.html
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: public, max-age=3600

/assets/*
  Cache-Control: public, max-age=3600

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), camera=(), microphone=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co; worker-src 'self'; manifest-src 'self'
```

`style-src 'unsafe-inline'` is required because the UI uses inline `style`
attributes for one-off layout values. Scripts are all external modules, so
`script-src 'self'` can stay strict.

### Vercel

Equivalent `vercel.json`:

```json
{
  "cleanUrls": false,
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/(.*).html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600" }]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "geolocation=(), camera=(), microphone=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co; worker-src 'self'; manifest-src 'self'"
        }
      ]
    }
  ]
}
```

### GitHub Pages

- Push the repository and enable Pages on the branch/root you want.
- Everything is relative, so a project path such as
  `https://<user>.github.io/coloursflux/` works.
- GitHub Pages cannot set custom headers. HTTPS and MIME types are still fine;
  `sw.js` may be cached for a short time, so after deploying a new build open the
  site twice or use DevTools → Application → Service Workers → **Update**.
- Do not enable Jekyll processing if you add files with `_` prefixes; this repo
  does not use them.

### Other hosts (S3, Cloudflare Pages, nginx)

- Serve `.js` as `text/javascript` and `.webmanifest` as
  `application/manifest+json` (some hosts default to `text/plain`; browsers are
  forgiving, but correct MIME is safer).
- Serve the site over HTTPS. Service workers and install prompts require a
  secure context (localhost is exempt).
- Disable directory listing; `/admin/` must resolve to `admin/index.html`.

## 4. Cache strategy

The service worker owns offline caching. Keep HTTP caching conservative:

| File | Recommended |
| --- | --- |
| `sw.js` | `no-cache` — browsers must revalidate to see new versions |
| `*.html` | `no-cache` — public content changes during the festival |
| `manifest.webmanifest` | `public, max-age=3600` |
| `/assets/*` | `public, max-age=3600` (no content hashes, so avoid `immutable`) |

Filenames are not fingerprinted. If you set a one-year immutable cache, an
updated CSS/JS file will not reach users until you rename it or bump the service
worker cache version.

`assets/js/env.js` is served network-first by the service worker, so adding or
changing Supabase credentials takes effect on the next reload even if the rest of
the shell is cached. Offline, the last cached copy is used.

## 5. Shipping an update during the festival

1. Edit content in the dashboard (no redeploy needed for content).
2. For code changes, bump `VERSION` in `sw.js` (`v1.0.0` → `v1.0.1`).
3. Deploy.
4. Users get an "Update available" prompt from `pwa.js`; the new worker waits
   until they accept, so nobody is reloaded mid-schedule.
5. Verify `/sw.js` is served fresh and the old cache is gone in DevTools.

Emergency rollback: redeploy the previous build, restore the previous
`VERSION`, and reload. IndexedDB data survives; the cache version bump forces a
refresh of the shell.

## 6. Post-deploy verification

- Open the deployed URL in a private window. No console errors, no mixed
  content, no `file://` assumptions.
- Sign in at `/admin/`, create a draft event, confirm it is **not** visible on
  the public schedule, then publish it and confirm it appears.
- Turn the network off, reload the public site: cached pages open; `/admin/`
  shows a network/connection error rather than stale editor data.
- Run Lighthouse (mobile) and confirm installability, HTTPS and a service
  worker. Scores vary by host; fix accessibility issues before chasing points.
- Scan the QR code from `/install.html` on a phone that is **not** on the same
  Wi-Fi, to prove it points at the public URL.
