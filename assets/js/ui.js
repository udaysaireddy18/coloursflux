/**
 * Shared UI chrome + reusable render helpers.
 * Every page includes `<header id="site-header">` / `<div id="site-footer">`
 * placeholders and calls `mountChrome()`.
 */
import { APP, NAV } from './config.js';
import { icon, mountIcons } from './icons.js';
import { esc, formatTime, formatTimeRange, formatDayShort, timeAgo, breakDown, pad2, initials, hueFor, safeUrl, isExpired } from './util.js';
import store, { lastSyncLabel, isSampleMode, hasSampleRecords } from './store.js';

/* ---------------------------------------------------------------- */
/* Brand art                                                        */
/* ---------------------------------------------------------------- */

export const BRAND_MARK = `<img class="brand-img" src="assets/icons/logo-mark.svg" alt="" width="56" height="56" decoding="async" />`;

/** Glowing wave artwork used behind hero sections. */
export function waveArt() {
  return `<div class="hero-art" aria-hidden="true">
    <div class="hero-aurora"><i></i><i></i><i></i></div>
    <div class="hero-moon"></div>
    <div class="hero-beam hero-beam-a"></div>
    <div class="hero-beam hero-beam-b"></div>
    <div class="hero-mandala"></div>
    <svg class="hero-paint" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="paint1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6366f1" stop-opacity=".9"/>
          <stop offset=".55" stop-color="#a855f7" stop-opacity=".7"/>
          <stop offset="1" stop-color="#ec4899" stop-opacity=".35"/>
        </linearGradient>
        <linearGradient id="paint2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#22d3ee" stop-opacity=".8"/>
          <stop offset=".5" stop-color="#818cf8" stop-opacity=".65"/>
          <stop offset="1" stop-color="#d946ef" stop-opacity=".4"/>
        </linearGradient>
        <linearGradient id="paint3" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#f4c46a" stop-opacity=".55"/>
          <stop offset=".6" stop-color="#e879f9" stop-opacity=".5"/>
          <stop offset="1" stop-color="#06b6d4" stop-opacity=".3"/>
        </linearGradient>
        <filter id="paintBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="22"/>
        </filter>
      </defs>
      <g class="paint-group" filter="url(#paintBlur)">
        <path class="paint-blob p1" fill="url(#paint1)" d="M140 340C150 170 360 80 520 150S820 250 900 400s-30 250-190 300S300 720 190 560 130 450 140 340Z"/>
        <path class="paint-blob p2" fill="url(#paint2)" d="M520 180C650 60 880 100 990 240s90 300-40 400-330 130-450 20S400 300 520 180Z"/>
        <path class="paint-blob p3" fill="url(#paint3)" d="M60 540C150 420 360 410 470 510s120 250 10 320S150 880 70 750 0 640 60 540Z"/>
      </g>
    </svg>
    <svg class="hero-waves" viewBox="0 0 1440 620" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#4f46e5" stop-opacity="0"/>
          <stop offset=".28" stop-color="#8b5cf6"/>
          <stop offset=".6" stop-color="#d946ef"/>
          <stop offset=".88" stop-color="#22d3ee"/>
          <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="wg2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#06b6d4" stop-opacity="0"/>
          <stop offset=".35" stop-color="#22d3ee"/>
          <stop offset=".72" stop-color="#6366f1"/>
          <stop offset="1" stop-color="#d946ef" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="wg3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#4f46e5"/>
          <stop offset=".5" stop-color="#d946ef"/>
          <stop offset="1" stop-color="#06b6d4"/>
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
      </defs>
      <g filter="url(#soft)">
        <path class="wave-line w3" d="M-40 330C180 250 300 430 520 380s320-190 520-120 300 210 460 150"/>
        <path class="wave-line w1" d="M-40 420C160 330 320 520 560 440s340-250 540-160 280 230 420 180"/>
        <path class="wave-line w2" d="M-40 480C180 400 340 560 580 500s330-210 520-140 290 200 430 160"/>
        <path class="wave-line w4" d="M-40 560C200 480 330 620 600 560s340-190 520-130 280 170 400 150"/>
        <path class="wave-line w2" d="M-40 250C200 190 340 330 600 290s330-150 520-90 300 130 420 120" opacity=".45"/>
      </g>
    </svg>
    <div class="hero-prism"></div>
    <div class="hero-orbit"><i></i><i></i></div>
    <div class="hero-sparkles"></div>
    <div class="orb orb-a"></div>
    <div class="orb orb-b"></div>
    <div class="orb orb-c"></div>
    <div class="hero-scrim"></div>
    <div class="hero-grid"></div>
    <div class="hero-fest">
      <svg class="fest-wheel" viewBox="0 0 240 270" aria-hidden="true">
        <defs>
          <linearGradient id="festWheelGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffd166"/>
            <stop offset=".45" stop-color="#f15bb5"/>
            <stop offset="1" stop-color="#22d3ee"/>
          </linearGradient>
          <g id="festCabin">
            <line x1="120" y1="112" x2="120" y2="38" stroke="url(#festWheelGrad)" stroke-width="1.5"/>
            <rect x="111" y="25" width="18" height="12" rx="4" fill="url(#festWheelGrad)"/>
          </g>
        </defs>
        <g class="fest-wheel-spin">
          <circle cx="120" cy="112" r="78" fill="none" stroke="url(#festWheelGrad)" stroke-width="2.4"/>
          <circle cx="120" cy="112" r="58" fill="none" stroke="url(#festWheelGrad)" stroke-width="1" opacity=".45"/>
          <use href="#festCabin"/>
          <use href="#festCabin" transform="rotate(30 120 112)"/>
          <use href="#festCabin" transform="rotate(60 120 112)"/>
          <use href="#festCabin" transform="rotate(90 120 112)"/>
          <use href="#festCabin" transform="rotate(120 120 112)"/>
          <use href="#festCabin" transform="rotate(150 120 112)"/>
          <use href="#festCabin" transform="rotate(180 120 112)"/>
          <use href="#festCabin" transform="rotate(210 120 112)"/>
          <use href="#festCabin" transform="rotate(240 120 112)"/>
          <use href="#festCabin" transform="rotate(270 120 112)"/>
          <use href="#festCabin" transform="rotate(300 120 112)"/>
          <use href="#festCabin" transform="rotate(330 120 112)"/>
          <circle cx="120" cy="112" r="6" fill="#ffe9b0"/>
        </g>
        <g class="fest-wheel-base" stroke="url(#festWheelGrad)" stroke-width="2.5" stroke-linecap="round" fill="none">
          <path d="M120 112 82 238"/>
          <path d="M120 112 158 238"/>
          <path d="M64 242h112"/>
        </g>
      </svg>

      <svg class="fest-dancers" viewBox="0 0 320 90" aria-hidden="true">
        <defs>
          <linearGradient id="festDanceGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ffd166"/>
            <stop offset=".5" stop-color="#f15bb5"/>
            <stop offset="1" stop-color="#22d3ee"/>
          </linearGradient>
        </defs>
        <g stroke="url(#festDanceGrad)" stroke-width="4.5" stroke-linecap="round" fill="none">
          <g transform="translate(50 74)"><g class="dancer d1">
            <circle cx="0" cy="-58" r="6" fill="url(#festDanceGrad)" stroke="none"/>
            <path d="M0-50V-20"/><path d="M0-44l-16-16M0-44l16-12"/>
            <path d="M0-20l-12 20M0-20l12 20"/>
          </g></g>
          <g transform="translate(120 76)"><g class="dancer d2">
            <circle cx="0" cy="-60" r="6" fill="url(#festDanceGrad)" stroke="none"/>
            <path d="M0-52V-22"/><path d="M0-46l-17-8M0-46l15-18"/>
            <path d="M0-22l-14 22M0-22l13 20"/>
          </g></g>
          <g transform="translate(190 74)"><g class="dancer d3">
            <circle cx="0" cy="-58" r="6" fill="url(#festDanceGrad)" stroke="none"/>
            <path d="M0-50V-20"/><path d="M0-42l-20-4M0-42l20-4"/>
            <path d="M0-20l-11 20M0-20l11 20"/>
          </g></g>
          <g transform="translate(258 77)"><g class="dancer d4">
            <circle cx="0" cy="-61" r="6" fill="url(#festDanceGrad)" stroke="none"/>
            <path d="M0-53V-23"/><path d="M0-47l-14-20M0-47l14-20"/>
            <path d="M0-23l-10 10-4 13M0-23l12 23"/>
          </g></g>
        </g>
      </svg>

      <div class="fest-dhol" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <defs>
            <linearGradient id="festDholGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#f4c46a"/>
              <stop offset=".5" stop-color="#f15bb5"/>
              <stop offset="1" stop-color="#22d3ee"/>
            </linearGradient>
          </defs>
          <path d="M26 42Q60 30 94 42L94 84Q60 96 26 84Z" fill="url(#festDholGrad)"/>
          <ellipse cx="26" cy="63" rx="8" ry="21" fill="#160f2e" stroke="url(#festDholGrad)" stroke-width="2"/>
          <ellipse cx="94" cy="63" rx="8" ry="21" fill="#160f2e" stroke="url(#festDholGrad)" stroke-width="2"/>
          <path d="M26 42Q60 30 94 42" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>
          <circle class="beat-ring" cx="60" cy="63" r="26"/>
          <circle class="beat-ring beat-ring-2" cx="60" cy="63" r="26"/>
        </svg>
      </div>

      <span class="fest-diya" style="--x: 34%; --d: 0s"></span>
      <span class="fest-diya" style="--x: 48%; --d: -1.1s"></span>
      <span class="fest-diya" style="--x: 62%; --d: -2.3s"></span>
      <span class="fest-diya" style="--x: 76%; --d: -.7s"></span>
      <span class="fest-diya" style="--x: 89%; --d: -1.7s"></span>

      <span class="fest-firework" style="--x: 46%; --y: 20%; --c: #f15bb5; --d: 0s"></span>
      <span class="fest-firework" style="--x: 63%; --y: 26%; --c: #22d3ee; --d: -2.4s"></span>
      <span class="fest-firework" style="--x: 80%; --y: 14%; --c: #ffd166; --d: -4.8s"></span>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- */
/* Header / footer / nav                                            */
/* ---------------------------------------------------------------- */

function currentPage() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return file || 'index.html';
}

let chromeMounted = false;
let revealReady = false;

function initReveals() {
  if (revealReady) return;
  revealReady = true;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-reveal');

  const pending = new Set();
  const sections = [...document.querySelectorAll('#main > section')];
  sections.forEach((section, index) => {
    const alreadyVisible = section.getBoundingClientRect().top < window.innerHeight * 0.92;
    if (alreadyVisible) {
      // Already on screen: skip the fade but keep the class pair so newly
      // rendered cards/lists (filters, async data) still stagger in.
      section.classList.add('reveal', 'is-in');
      return;
    }
    section.classList.add('reveal');
    section.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 55}ms`);
    pending.add(section);
  });
  if (!pending.size) return;

  const reveal = (el) => {
    el.classList.add('is-in');
    pending.delete(el);
    io.unobserve(el);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) reveal(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.04 }
  );
  pending.forEach((el) => io.observe(el));

  // Safety net: fast scrolls or anchor jumps can skip past a section without
  // the observer ever seeing it intersect.
  let ticking = false;
  const sweep = () => {
    ticking = false;
    const limit = window.innerHeight * 0.94;
    for (const el of [...pending]) {
      if (el.getBoundingClientRect().top < limit) reveal(el);
    }
    if (!pending.size) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sweep);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

export function mountChrome({ active } = {}) {
  const page = active || currentPage();
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');

  if (header && !chromeMounted) {
    header.innerHTML = `
      <div class="container nav">
        <a class="brand" href="index.html" aria-label="${APP.name} home">
          <span class="brand-mark">${BRAND_MARK}</span>
        </a>

        <nav class="nav-links" aria-label="Primary">
          ${NAV.map(
            (item) =>
              `<a class="nav-link" href="${item.href}" ${item.href === page ? 'aria-current="page"' : ''}>${item.label}</a>`
          ).join('')}
        </nav>

        <div class="nav-actions">
          <span class="net-pill" id="net-pill" data-state="${navigator.onLine ? 'online' : 'offline'}" title="Connection status">
            <span class="dot"></span><span class="label">${navigator.onLine ? 'Online' : 'Offline'}</span>
          </span>
          <a class="btn btn-primary btn-sm" href="events.html">Explore</a>
          <button class="btn btn-icon menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
            ${icon('menu', { size: 20 })}
          </button>
        </div>
      </div>`;

    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobile-menu';
    menu.innerHTML = `
      <div class="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Site menu">
        <div class="mobile-menu-head">
          <span class="brand" aria-hidden="true">
            <span class="brand-mark">${BRAND_MARK}</span>
          </span>
          <button class="btn btn-icon" id="menu-close" aria-label="Close menu">${icon('x', { size: 20 })}</button>
        </div>
        <nav class="mobile-nav" aria-label="Mobile">
          ${NAV.map(
            (item) =>
              `<a href="${item.href}" ${item.href === page ? 'aria-current="page"' : ''}>${icon(item.icon, { size: 18 })} ${item.label}</a>`
          ).join('')}
          <a href="install.html">${icon('download', { size: 18 })} Install &amp; offline</a>
          <a href="admin/index.html">${icon('shield', { size: 18 })} Organiser login</a>
        </nav>
        <div class="divider" style="margin:18px 0"></div>
        <p class="micro dim">${esc(APP.institution)} · ${esc(APP.event)}</p>
      </div>`;
    document.body.appendChild(menu);

    const toggle = header.querySelector('#menu-toggle');
    const close = menu.querySelector('#menu-close');
    const open = () => {
      menu.setAttribute('open', '');
      toggle.setAttribute('aria-expanded', 'true');
      close.focus();
    };
    const hide = () => {
      menu.removeAttribute('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    };
    toggle.addEventListener('click', open);
    close.addEventListener('click', hide);
    menu.addEventListener('click', (e) => {
      if (e.target === menu) hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.hasAttribute('open')) hide();
    });

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (!chromeMounted) mountBottomNav(page);
  if (footer) footer.innerHTML = footerMarkup();
  if (!chromeMounted) mountNetPill();

  if (!document.querySelector('.scroll-progress')) {
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.prepend(progress);
  }

  if (!document.querySelector('.colour-aura')) {
    const aura = document.createElement('div');
    aura.className = 'colour-aura';
    aura.setAttribute('aria-hidden', 'true');
    aura.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
    document.body.prepend(aura);
  }

  mountIcons();
  mountImageFallbacks();
  initReveals();
  chromeMounted = true;
}

function mountBottomNav(page) {
  const items = NAV.filter((n) => n.href !== 'about.html').map((n) => ({
    ...n,
    label: n.href === 'announcements.html' ? 'Alerts' : n.label,
  }));
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Quick navigation');
  nav.innerHTML = `<ul>${items
    .map(
      (item) =>
        `<li><a href="${item.href}" ${item.href === page ? 'aria-current="page"' : ''}>${icon(item.icon, { size: 19 })}<span>${item.label}</span></a></li>`
    )
    .join('')}</ul>`;
  document.body.appendChild(nav);
}

function mountNetPill() {
  const pill = document.getElementById('net-pill');
  if (!pill) return;
  const paint = () => {
    const online = navigator.onLine;
    pill.dataset.state = online ? 'online' : 'offline';
    pill.querySelector('.label').textContent = online ? 'Online' : 'Offline';
    pill.title = online ? 'Connected — live data available' : 'Offline — showing saved data';
  };
  window.addEventListener('online', paint);
  window.addEventListener('offline', paint);
  paint();
}

function footerMarkup() {
  const cfg = store.state.config;
  const social = (cfg.social_links || []).filter((s) => s && s.url);
  const contact = [];
  if (cfg.contact_email) contact.push(`<a href="mailto:${esc(cfg.contact_email)}">${esc(cfg.contact_email)}</a>`);
  if (cfg.contact_phone) contact.push(`<a href="tel:${esc(cfg.contact_phone)}">${esc(cfg.contact_phone)}</a>`);

  return `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand footer-logo" href="index.html" aria-label="${APP.name} home">
            <span class="brand-mark">${BRAND_MARK}</span>
          </a>
          <p>${esc(cfg.tagline || APP.tagline)} The festival companion for ${esc(APP.institution)} — schedule, campus map, stalls and live notices in one place.</p>
          ${social.length ? `<div class="footer-social">${social
            .map(
              (s) =>
                `<a class="social-btn" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label || 'Social link')}">${icon(s.icon || 'link', { size: 17 })}</a>`
            )
            .join('')}</div>` : ''}
        </div>

        <div class="footer-col">
          <h4>Festival</h4>
          <ul>
            <li><a href="events.html">Events &amp; schedule</a></li>
            <li><a href="map.html">Campus map</a></li>
            <li><a href="stalls.html">Stalls &amp; offers</a></li>
            <li><a href="announcements.html">Announcements</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Using the app</h4>
          <ul>
            <li><a href="install.html">Install &amp; go offline</a></li>
            <li><a href="about.html#offline">How offline mode works</a></li>
            <li><a href="about.html#faq">FAQ</a></li>
            <li><a href="about.html#help">Help</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Organisers</h4>
          <ul>
            <li><a href="admin/index.html">Admin dashboard</a></li>
            <li><a href="install.html#qr">QR code &amp; launch</a></li>
            <li><a href="about.html#vendors">Vendor promotion</a></li>
            ${contact.length ? `<li>${contact.join('</li><li>')}</li>` : ''}
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${esc(APP.name)} · ${esc(APP.institution)}. Built as a student festival project.</span>
        <nav aria-label="Legal">
          <a href="privacy.html">Privacy</a>
          <a href="terms.html">Terms</a>
          <a href="about.html">About</a>
        </nav>
      </div>
      ${isSampleMode() ? `<p class="micro dim" style="padding-bottom:18px">Showing the bundled Colours 2K27 programme — the live database is not connected.</p>` : hasSampleRecords() ? `<p class="micro dim" style="padding-bottom:18px">Some records come from the bundled programme. Connect the live database to manage them from the dashboard.</p>` : ''}
    </div>`;
}

/* ---------------------------------------------------------------- */
/* Feedback                                                         */
/* ---------------------------------------------------------------- */

let toastHost;

export function toast(message, { type = 'info', timeout = 4200 } = {}) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-stack';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
  }

  // A success means the previous failure is resolved, so drop stale error
  // toasts instead of showing "required field" next to "created". Conversely a
  // failure invalidates an earlier success: that save did not actually land,
  // so "Event created." must not linger beside the error.
  if (type === 'success') {
    toastHost.querySelectorAll('.toast[data-type="error"]').forEach((node) => node.remove());
  } else if (type === 'error') {
    toastHost.querySelectorAll('.toast[data-type="success"]').forEach((node) => node.remove());
  }

  // Keep the stack short enough to read on a phone.
  const existing = [...toastHost.querySelectorAll('.toast')];
  existing.slice(0, Math.max(0, existing.length - 2)).forEach((node) => node.remove());

  const node = document.createElement('div');
  node.className = 'toast';
  node.dataset.type = type;
  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : type === 'warn' ? 'alert-triangle' : 'info';
  node.innerHTML = `${icon(iconName, { size: 17 })}<span>${esc(message)}</span><button class="toast-close" aria-label="Dismiss">${icon('x', { size: 14 })}</button>`;
  const remove = () => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(6px)';
    setTimeout(() => node.remove(), 180);
  };
  node.querySelector('.toast-close').addEventListener('click', remove);
  toastHost.appendChild(node);
  if (timeout) setTimeout(remove, timeout);
}

/* ---------------------------------------------------------------- */
/* Status strips                                                    */
/* ---------------------------------------------------------------- */

export function syncBarMarkup() {
  const s = store.state;
  if (s.source === 'sample') {
    return `<div class="sync-bar" data-tone="sample">
      ${icon('sparkles', { size: 16 })}
      <span><b>Bundled schedule.</b> The live database is not connected, so you are viewing the Colours 2K27 programme stored with the site.</span>
      <span class="spacer"></span>
      <a class="btn btn-sm" href="admin/index.html">Connect Supabase</a>
    </div>`;
  }
  if (s.source === 'empty') {
    return `<div class="sync-bar" data-tone="error">
      ${icon('alert-triangle', { size: 16 })}
      <span>No festival data is available yet${s.error ? ` — ${esc(s.error.message)}` : ''}.</span>
    </div>`;
  }
  if (!s.online) {
    return `<div class="sync-bar" data-tone="warn" id="sync-bar">
      ${icon('wifi-off', { size: 16 })}
      <span>You are offline. Showing data saved ${esc(lastSyncLabel().toLowerCase())}; it may be out of date.</span>
      <span class="spacer"></span>
      <button class="btn btn-sm" data-action="retry-sync">${icon('refresh', { size: 14 })} Retry</button>
    </div>`;
  }
  if (s.stale && s.source === 'cache') {
    return `<div class="sync-bar" data-tone="warn" id="sync-bar">
      ${icon('alert-circle', { size: 16 })}
      <span>Showing saved data from ${esc(lastSyncLabel().toLowerCase())}.</span>
      <span class="spacer"></span>
      <button class="btn btn-sm" data-action="retry-sync">${icon('refresh', { size: 14 })} Refresh</button>
    </div>`;
  }
  if (hasSampleRecords()) {
    return `<div class="sync-bar" data-tone="sample">
      ${icon('sparkles', { size: 16 })}
      <span><b>Sample records.</b> Some content is seeded demo data and must be replaced before launch.</span>
      <span class="spacer"></span>
      <a class="btn btn-sm" href="admin/index.html">Manage content</a>
    </div>`;
  }
  return '';
}

export async function mountSyncBar(target) {
  if (!target) return;
  const paint = () => {
    target.innerHTML = syncBarMarkup();
    const btn = target.querySelector('[data-action="retry-sync"]');
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `${icon('refresh', { size: 14 })} Syncing…`;
        try {
          await store.refresh();
          toast('Festival data updated.', { type: 'success' });
        } catch (err) {
          toast(err.message || 'Could not refresh right now.', { type: 'error' });
        }
        paint();
      });
    }
  };
  paint();
  store.subscribe((type) => {
    if (['sync', 'sync-error', 'connection', 'ready'].includes(type)) paint();
  });
}

/* ---------------------------------------------------------------- */
/* Countdown                                                        */
/* ---------------------------------------------------------------- */

export function countdownMarkup() {
  return `<div class="countdown" role="timer" aria-live="off" data-countdown>
    ${['Days', 'Hours', 'Mins', 'Secs']
      .map(
        (label, i) =>
          `<div class="cd-cell"><span class="cd-value" data-cd="${i}">--</span><span class="cd-label">${label}</span></div>`
      )
      .join('')}
  </div>`;
}

export function mountCountdown(root, { onPhase } = {}) {
  if (!root) return () => {};
  let el = root.querySelector('[data-countdown]');
  if (!el) {
    // The host is an empty container on the home page; render the cells once.
    root.insertAdjacentHTML('beforeend', countdownMarkup());
    el = root.querySelector('[data-countdown]');
  }
  if (!el) return () => {};
  const cfg = store.state.config;
  const start = new Date(cfg.festival_start);
  const end = new Date(cfg.festival_end || cfg.festival_start);
  const valid = !Number.isNaN(start.getTime());

  const paint = () => {
    const now = Date.now();
    const target = now < start.getTime() ? start.getTime() : end.getTime();
    const remaining = target - now;
    const b = breakDown(remaining);
    const cells = el.querySelectorAll('[data-cd]');
    const values = [pad2(b.days), pad2(b.hours), pad2(b.minutes), pad2(b.seconds)];
    cells.forEach((c, i) => {
      const next = valid ? values[i] : '--';
      if (c.textContent === next) return;
      c.textContent = next;
      if (!valid) return;
      c.classList.remove('is-tick');
      void c.offsetWidth;
      c.classList.add('is-tick');
    });
    if (valid) {
      el.setAttribute('aria-label', b.done ? 'The festival window has ended' : `${b.days} days ${b.hours} hours until the next milestone`);
    }
    onPhase?.(!valid ? 'unknown' : b.done ? 'ended' : now >= start.getTime() ? 'live' : 'upcoming');
  };

  paint();
  const id = setInterval(paint, 1000);
  window.addEventListener('pagehide', () => clearInterval(id), { once: true });
  return () => clearInterval(id);
}

export function eventPhase(ev) {
  if (ev.status === 'cancelled') return 'cancelled';
  if (ev.status === 'archived') return 'archived';
  const end = new Date(`${ev.event_date}T${ev.end_time || ev.start_time || '23:59'}`);
  const start = new Date(`${ev.event_date}T${ev.start_time || '00:00'}`);
  if (Number.isNaN(start.getTime())) return 'upcoming';
  if (Date.now() > end.getTime()) return 'past';
  if (Date.now() >= start.getTime()) return 'live';
  return 'upcoming';
}

export function phaseBadge(ev) {
  const phase = eventPhase(ev);
  const map = {
    live: ['badge-green', 'Live now'],
    cancelled: ['badge-red', 'Cancelled'],
    past: ['badge-neutral', 'Completed'],
    archived: ['badge-neutral', 'Archived'],
  };
  return map[phase] ? `<span class="badge ${map[phase][0]}">${map[phase][1]}</span>` : '';
}

/* ---------------------------------------------------------------- */
/* Images                                                           */
/* ---------------------------------------------------------------- */

const PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2350"/><stop offset=".5" stop-color="#3b2b6b"/><stop offset="1" stop-color="#0d3b4a"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><g fill="none" stroke="url(#g)" stroke-width="2" opacity=".5"><path d="M-20 250c120-70 180 60 320 10s180-140 360-80" stroke="#8b5cf6"/><path d="M-20 300c140-60 200 50 340 0s180-120 380-60" stroke="#22d3ee"/></g><text x="320" y="188" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#c7d2fe" opacity=".85">ColoursFlux</text></svg>`
)}`;

export function mountImageFallbacks(root = document) {
  root.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        img.src = PLACEHOLDER;
        img.classList.add('img-fallback');
      },
      { once: true }
    );
  });
}

export function imgTag(src, alt, { cls = '', eager = false } = {}) {
  return `<img src="${esc(safeUrl(src, PLACEHOLDER))}" alt="${esc(alt)}" class="${cls}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" data-fallback>`;
}

/* ---------------------------------------------------------------- */
/* Cards                                                            */
/* ---------------------------------------------------------------- */

export const CATEGORIES = {
  music: { label: 'Music', icon: 'music', color: '#d946ef' },
  dance: { label: 'Dance', icon: 'zap', color: '#f472b6' },
  theatre: { label: 'Theatre', icon: 'mic', color: '#a78bfa' },
  tech: { label: 'Tech', icon: 'cpu', color: '#22d3ee' },
  arts: { label: 'Arts', icon: 'palette', color: '#818cf8' },
  sports: { label: 'Sports', icon: 'trophy', color: '#34d399' },
  food: { label: 'Food', icon: 'utensils', color: '#fbbf24' },
  literature: { label: 'Literature', icon: 'file-text', color: '#60a5fa' },
  fashion: { label: 'Fashion', icon: 'shirt', color: '#f0abfc' },
  art: { label: 'Art & crafts', icon: 'palette', color: '#818cf8' },
  merch: { label: 'Merchandise', icon: 'shopping-bag', color: '#a5b4fc' },
  other: { label: 'Other', icon: 'tag', color: '#94a3b8' },
};

export function categoryOf(key) {
  return CATEGORIES[key] || { label: key ? String(key) : 'Other', icon: 'tag', color: '#94a3b8' };
}

/* ---------------------------------------------------------------- */
/* Campus map                                                       */
/* ---------------------------------------------------------------- */

export const LOCATION_TYPES = {
  stage: { label: 'Stages', icon: 'mic', color: '#d946ef' },
  food: { label: 'Food & drink', icon: 'utensils', color: '#f59e0b' },
  venue: { label: 'Venues', icon: 'building', color: '#6d63ff' },
  sports: { label: 'Sports', icon: 'trophy', color: '#22c55e' },
  service: { label: 'Services', icon: 'info', color: '#06b6d4' },
  parking: { label: 'Parking', icon: 'navigation', color: '#94a3b8' },
  other: { label: 'Other', icon: 'map-pin', color: '#94a3b8' },
};

export function locationTypeOf(type) {
  return LOCATION_TYPES[type] || LOCATION_TYPES.other;
}

/**
 * Decorative campus plate. Markers are positioned as a percentage of the
 * board, so the SVG stretches to the container and stays aligned at any size.
 */
export function mapPlate() {
  return `<img class="map-img" src="assets/img/campus-map.webp" alt="" decoding="async" draggable="false" />`;
}

/**
 * Non-interactive markers for map previews. The surrounding board is
 * decorative; the adjacent list carries the accessible names.
 */
export function staticMapMarkers(locations, { max = 10, labels = 4 } = {}) {
  return locations
    .filter((loc) => loc.map_x != null && loc.map_y != null)
    .slice(0, max)
    .map((loc, i) => {
      const t = locationTypeOf(loc.location_type);
      return `<span class="map-marker map-marker-static${i < labels ? ' has-label' : ''}"
        style="left:${Number(loc.map_x)}%;top:${Number(loc.map_y)}%;--mc:${t.color}">
        <span class="pin">${icon(t.icon, { size: 13 })}</span>
        <span class="pin-label">${esc(loc.name)}</span>
      </span>`;
    })
    .join('');
}

export function eventCard(ev) {
  const cat = categoryOf(ev.category);
  const loc = store.locationOf(ev);
  const saved = store.isBookmarked(ev.id);
  const phase = eventPhase(ev);
  return `<article class="card event-card" style="--cat:${cat.color}">
    <a href="event.html?slug=${encodeURIComponent(ev.slug || ev.id)}" class="event-media" aria-label="${esc(ev.title)}">
      ${imgTag(ev.image_url, `${ev.title} artwork`)}
      <div class="event-media-top">
        <span class="badge" style="color:${cat.color};border-color:${cat.color}55">${icon(cat.icon, { size: 12 })} ${esc(cat.label)}</span>
        ${ev.featured ? `<span class="badge badge-magenta">${icon('star', { size: 12 })} Featured</span>` : ''}
      </div>
      <div class="date-chip">
        <b>${esc(formatDayShort(ev.event_date))}</b>
        <span>${esc(formatTime(ev.start_time) || 'TBA')}</span>
      </div>
      ${phase === 'cancelled' ? '<span class="badge badge-red" style="position:absolute;right:12px;bottom:12px;z-index:2">Cancelled</span>' : ''}
    </a>
    <div class="event-body">
      <h3 class="event-title"><a href="event.html?slug=${encodeURIComponent(ev.slug || ev.id)}">${esc(ev.title)}</a></h3>
      <div class="meta-row">${icon('map-pin', { size: 14 })}<span>${esc(loc?.name || 'Venue to be announced')}</span></div>
      <div class="meta-row">${icon('clock', { size: 14 })}<span>${esc(formatTimeRange(ev.start_time, ev.end_time))}</span></div>
      <div class="event-foot">
        <a class="btn btn-sm btn-ghost" href="event.html?slug=${encodeURIComponent(ev.slug || ev.id)}">Details ${icon('arrow-right', { size: 14 })}</a>
        <button class="bookmark-btn" data-bookmark="${esc(ev.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved events' : 'Save this event'}">
          ${icon('bookmark', { size: 16 })}
        </button>
      </div>
    </div>
  </article>`;
}

export function scheduleRow(ev) {
  const loc = store.locationOf(ev);
  const cat = categoryOf(ev.category);
  const saved = store.isBookmarked(ev.id);
  return `<div class="schedule-row" style="--cat:${cat.color}">
    <div class="schedule-time">${esc(formatTime(ev.start_time)) || 'TBA'}<small>${esc(formatTime(ev.end_time) || '')}</small></div>
    <div class="schedule-main">
      <b><a href="event.html?slug=${encodeURIComponent(ev.slug || ev.id)}">${esc(ev.title)}</a></b>
      <small>
        ${icon('map-pin', { size: 12 })} ${esc(loc?.name || 'TBA')}
        <span aria-hidden="true">·</span> ${esc(cat.label)}
        ${ev.status === 'cancelled' ? '<span class="badge badge-red" style="margin-left:6px">Cancelled</span>' : ''}
        ${ev.featured ? '<span class="badge badge-magenta" style="margin-left:6px">Featured</span>' : ''}
      </small>
    </div>
    <div class="schedule-actions">
      <button class="bookmark-btn" data-bookmark="${esc(ev.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved events' : 'Save this event'}">${icon('bookmark', { size: 16 })}</button>
      <a class="btn btn-icon" href="event.html?slug=${encodeURIComponent(ev.slug || ev.id)}" aria-label="Open ${esc(ev.title)}">${icon('chevron-right', { size: 16 })}</a>
    </div>
  </div>`;
}

export function vendorCard(vendor) {
  const cat = categoryOf(vendor.category);
  const loc = store.locationOf(vendor);
  const offers = store.offersForVendor(vendor.id);
  const featured = vendor.is_featured && !isExpired(vendor.featured_until);
  return `<article class="card vendor-card">
    <div class="vendor-head">
      <div class="vendor-logo" style="${vendor.image_url ? '' : `background:linear-gradient(150deg, hsl(${hueFor(vendor.name)} 60% 26%), #16204a)`}">
        ${vendor.image_url ? imgTag(vendor.image_url, `${vendor.name} logo`) : esc(initials(vendor.name))}
      </div>
      <div style="min-width:0;flex:1">
        <div class="cluster" style="gap:6px">
          <h3 class="vendor-name">${esc(vendor.name)}</h3>
          ${featured ? `<span class="badge badge-magenta">${icon('star', { size: 11 })} Featured</span>` : ''}
        </div>
        <div class="meta-row" style="margin-top:3px">${icon(cat.icon, { size: 13 })}<span>${esc(cat.label)}</span></div>
      </div>
    </div>
    <p class="vendor-desc">${esc(vendor.description || '')}</p>
    <div class="cluster" style="gap:8px">
      <span class="badge badge-neutral">${icon('map-pin', { size: 12 })} ${esc(loc?.name || 'Location TBA')}</span>
      ${featured ? '<span class="badge badge-amber">Sponsored placement</span>' : ''}
    </div>
    ${offers.slice(0, 2).map((o) => `<div class="offer-line">${icon('tag', { size: 13 })}<span><b>${esc(o.title)}</b>${o.description ? ` — ${esc(o.description)}` : ''}</span></div>`).join('')}
    <div class="event-foot">
      <button class="btn btn-sm btn-ghost" data-vendor="${esc(vendor.id)}">View stall ${icon('arrow-right', { size: 14 })}</button>
      ${vendor.contact_url ? `<a class="btn btn-icon" href="${esc(safeUrl(vendor.contact_url))}" target="_blank" rel="noopener noreferrer" aria-label="Contact ${esc(vendor.name)}">${icon('external-link', { size: 15 })}</a>` : ''}
    </div>
  </article>`;
}

const PRIORITY = {
  urgent: { label: 'Urgent', cls: 'badge-red', icon: 'alert-triangle' },
  high: { label: 'High priority', cls: 'badge-amber', icon: 'alert-circle' },
  normal: { label: 'Notice', cls: 'badge-purple', icon: 'megaphone' },
  low: { label: 'Info', cls: 'badge-cyan', icon: 'info' },
};

export function announcementCard(a) {
  const pri = PRIORITY[a.priority] || PRIORITY.normal;
  return `<article class="announce-card" data-priority="${esc(a.priority || 'normal')}">
    <div class="announce-icon">${icon(pri.icon, { size: 17 })}</div>
    <div style="min-width:0">
      <div class="cluster" style="gap:8px">
        <span class="badge ${pri.cls}">${pri.label}</span>
        ${a.expires_at && !isExpired(a.expires_at) ? `<span class="badge badge-neutral nowrap">Until ${esc(new Date(a.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))}</span>` : ''}
      </div>
      <h3 class="announce-title" style="margin-top:8px">${esc(a.title)}</h3>
      <p class="announce-msg">${esc(a.message)}</p>
      <div class="announce-foot">
        <span>${icon('clock', { size: 12 })} ${esc(timeAgo(a.published_at))}</span>
        <span>${icon('calendar', { size: 12 })} ${esc(a.published_at ? new Date(a.published_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '')}</span>
      </div>
    </div>
  </article>`;
}

export function emptyState({ iconName = 'search', title, text, action = '', headingLevel = 3 }) {
  const tag = `h${Math.min(Math.max(headingLevel, 1), 6)}`;
  return `<div class="state">
    <div class="state-icon">${icon(iconName, { size: 24 })}</div>
    <${tag}>${esc(title)}</${tag}>
    <p>${esc(text)}</p>
    ${action}
  </div>`;
}

export function skeletons(n = 3, { media = true } = {}) {
  return Array.from({ length: n })
    .map(
      () => `<div class="sk-card">
        ${media ? '<div class="sk sk-media"></div>' : ''}
        <div style="padding:18px;display:grid;gap:10px">
          <div class="sk sk-line w60"></div>
          <div class="sk sk-line w80"></div>
          <div class="sk sk-line w40"></div>
        </div>
      </div>`
    )
    .join('');
}

/* ---------------------------------------------------------------- */
/* Bookmark wiring (delegated, works after re-render)               */
/* ---------------------------------------------------------------- */

export function wireBookmarks(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bookmark]');
    if (!btn) return;
    const id = btn.dataset.bookmark;
    const saved = store.toggleBookmark(id);
    document.querySelectorAll(`[data-bookmark="${CSS.escape(id)}"]`).forEach((b) => {
      b.setAttribute('aria-pressed', String(saved));
      b.setAttribute('aria-label', saved ? 'Remove from saved events' : 'Save this event');
    });
    toast(saved ? 'Event saved to this device.' : 'Event removed from saved events.', {
      type: saved ? 'success' : 'info',
      timeout: 2400,
    });
  });
}

/** Shared "save data for offline" behaviour. */
export function wireDataDownload(btn) {
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh', { size: 16 })} Downloading…`;
    try {
      await store.refresh();
      toast('Festival data saved on this device.', { type: 'success' });
    } catch (err) {
      toast(
        err.code === 'not-configured'
          ? 'Demo mode: connect Supabase to download live festival data.'
          : err.message,
        { type: 'error' }
      );
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
      mountIcons(btn);
    }
  });
}
