/**
 * Shared UI chrome + reusable render helpers.
 * Every page includes `<header id="site-header">` / `<div id="site-footer">`
 * placeholders and calls `mountChrome()`.
 */
import { APP, NAV } from './config.js';
import { icon, mountIcons } from './icons.js';
import { esc, formatTime, formatTimeRange, formatDayShort, timeAgo, breakDown, pad2, initials, violetHueFor, safeUrl, isExpired } from './util.js';
import store, { lastSyncLabel, isSampleMode, hasSampleRecords } from './store.js';

/* ---------------------------------------------------------------- */
/* Brand art                                                        */
/* ---------------------------------------------------------------- */

export const BRAND_MARK = `<img class="brand-img" src="assets/icons/logo-mark.svg" alt="" width="56" height="56" decoding="async" />`;

/** Layered gold ornamentation used behind hero sections. */
export function waveArt() {
  return `<div class="hero-art" aria-hidden="true">
    <div class="hero-aurora"><i></i><i></i><i></i></div>
    <div class="hero-sheen"><i></i><i></i><i></i></div>
    <div class="hero-sun"></div>
    <div class="hero-orbits"><i></i><i></i><i></i></div>
    <div class="hero-glow"></div>
    <div class="hero-rings"></div>
    <div class="hero-grid"></div>
    <svg class="hero-lines" viewBox="0 0 1440 620" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#4a0fae" stop-opacity="0"/>
          <stop offset=".35" stop-color="#7c3ad9"/>
          <stop offset=".62" stop-color="#c04ad8"/>
          <stop offset="1" stop-color="#b7209b" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="wave-line w1" d="M-40 420C160 330 320 520 560 440s340-250 540-160 280 230 420 180"/>
      <path class="wave-line w2" d="M-40 480C180 400 340 560 580 500s330-210 520-140 290 200 430 160"/>
      <path class="wave-line w3" d="M-40 330C180 250 300 430 520 380s320-190 520-120 300 210 460 150"/>
    </svg>
    <div class="hero-petals"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="hero-scrim"></div>
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
let motionReady = false;

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

/* ---------------------------------------------------------------- */
/* Motion polish                                                    */
/* ---------------------------------------------------------------- */

/** Shared reduced-motion check for every progressive effect. */
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KINETIC_SELECTOR = '.hero h1, .page-head h1, .detail-title, .section-head h2, .day-head h2';
const kineticSeen = new WeakSet();
const kineticObserved = new WeakSet();
let kineticObserver = null;

const liquidSeen = new WeakSet();
let liquidObserver = null;

const shimmerSeen = new WeakSet();
let shimmerObserver = null;

let storyMounted = false;
let storyItems = [];
let storyTicking = false;

/** Three very soft colour clouds behind the lilac page surface. */
function mountAmbientLight() {
  if (document.querySelector('.ambient-light')) return;
  const layer = document.createElement('div');
  layer.className = 'ambient-light';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<i></i><i></i><i></i>';
  document.body.prepend(layer);
}

/** A quiet, progressive page entrance that never blocks content if JS fails. */
function mountPageEnter() {
  document.documentElement.classList.add('page-ready');
  document.getElementById('main')?.classList.add('page-enter');
}

let activeTiltCard = null;

function clearCardTilt() {
  if (!activeTiltCard) return;
  activeTiltCard.classList.remove('is-tilting');
  activeTiltCard.style.removeProperty('--tilt-x');
  activeTiltCard.style.removeProperty('--tilt-y');
  activeTiltCard.style.removeProperty('--tilt-glow-x');
  activeTiltCard.style.removeProperty('--tilt-glow-y');
  activeTiltCard = null;
}

/** Pointer-tracked 3D tilt for event cards plus button sheen coordinates. */
function mountPointerPolish() {
  if (prefersReducedMotion()) return;

  document.addEventListener(
    'pointermove',
    (e) => {
      const card = e.target.closest?.('.event-card');
      if (card) {
        if (activeTiltCard && activeTiltCard !== card) clearCardTilt();
        if (window.matchMedia('(pointer: fine)').matches) {
          const box = card.getBoundingClientRect();
          const px = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
          const py = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
          card.style.setProperty('--tilt-x', `${((0.5 - py) * 5.5).toFixed(2)}deg`);
          card.style.setProperty('--tilt-y', `${((px - 0.5) * 7).toFixed(2)}deg`);
          card.style.setProperty('--tilt-glow-x', `${(px * 100).toFixed(1)}%`);
          card.style.setProperty('--tilt-glow-y', `${(py * 100).toFixed(1)}%`);
          card.classList.add('is-tilting');
          activeTiltCard = card;
        }
      } else if (!card) {
        clearCardTilt();
      }

      const control = e.target.closest?.('.btn, .chip, .social-btn, .map-tool');
      if (!control) return;
      const box = control.getBoundingClientRect();
      if (!box.width || !box.height) return;
      control.style.setProperty('--btn-x', `${(((e.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
      control.style.setProperty('--btn-y', `${(((e.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
    },
    { passive: true }
  );

  document.addEventListener(
    'pointerout',
    (e) => {
      if (!activeTiltCard) return;
      if (e.relatedTarget && activeTiltCard.contains(e.relatedTarget)) return;
      clearCardTilt();
    },
    { passive: true }
  );

  window.addEventListener('blur', clearCardTilt);
}

/* ---------- full-screen artwork previews ------------------------ */

let lightbox = null;
let lightboxItems = [];
let lightboxIndex = 0;
let lightboxToken = 0;

function lightboxDialog() {
  if (lightbox) return lightbox;
  lightbox = document.createElement('dialog');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('aria-label', 'Artwork preview');
  lightbox.innerHTML = `
    <div class="lightbox-shell">
      <button type="button" class="lightbox-close" data-lightbox-close aria-label="Close preview">${icon('x', { size: 18 })}</button>
      <div class="lightbox-stage">
        <button type="button" class="lightbox-nav lightbox-prev" data-lightbox-prev aria-label="Previous image">${icon('chevron-left', { size: 22 })}</button>
        <figure class="lightbox-figure">
          <img class="lightbox-image" alt="" decoding="async" />
          <figcaption class="lightbox-caption"></figcaption>
        </figure>
        <button type="button" class="lightbox-nav lightbox-next" data-lightbox-next aria-label="Next image">${icon('chevron-right', { size: 22 })}</button>
      </div>
    </div>`;
  document.body.appendChild(lightbox);
  mountIcons(lightbox);

  lightbox.querySelector('[data-lightbox-close]').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('[data-lightbox-prev]').addEventListener('click', () => stepLightbox(-1));
  lightbox.querySelector('[data-lightbox-next]').addEventListener('click', () => stepLightbox(1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });
  lightbox.addEventListener('close', () => document.documentElement.classList.remove('lightbox-open'));
  return lightbox;
}

function paintLightbox(direction = 0) {
  const item = lightboxItems[lightboxIndex];
  if (!item || !lightbox) return;
  const figure = lightbox.querySelector('.lightbox-figure');
  const image = lightbox.querySelector('.lightbox-image');
  const caption = lightbox.querySelector('.lightbox-caption');
  const token = ++lightboxToken;

  lightbox.querySelectorAll('.lightbox-nav').forEach((btn) => {
    btn.hidden = lightboxItems.length < 2;
  });
  caption.textContent = item.caption || '';

  const swap = () => {
    if (token !== lightboxToken) return;
    image.src = item.src;
    image.alt = item.caption || 'Artwork preview';
  };

  if (prefersReducedMotion() || !figure.animate || !direction) {
    swap();
    return;
  }

  figure
    .animate(
      [
        { opacity: 1, transform: 'none', clipPath: 'circle(140% at 50% 50%)', filter: 'blur(0px)' },
        { opacity: 0, transform: `translateX(${-direction * 14}px)`, clipPath: 'circle(10% at 30% 50%)', filter: 'blur(7px)' },
      ],
      { duration: 140, easing: 'ease-in', fill: 'forwards' }
    )
    .finished.then(() => {
      if (token !== lightboxToken) return;
      swap();
      figure
        .animate(
          [
            { opacity: 0, transform: `translateX(${direction * 14}px)`, clipPath: 'circle(10% at 70% 50%)', filter: 'blur(7px)' },
            { opacity: 1, transform: 'none', clipPath: 'circle(140% at 50% 50%)', filter: 'blur(0px)' },
          ],
          { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' }
        )
        .finished.catch(() => {});
    })
    .catch(() => {});
}

function stepLightbox(step) {
  if (lightboxItems.length < 2) return;
  lightboxIndex = (lightboxIndex + step + lightboxItems.length) % lightboxItems.length;
  paintLightbox(step);
}

function mountLightbox() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest?.('[data-preview-src]');
    if (!trigger || trigger.closest('.lightbox')) return;
    e.preventDefault();
    lightboxItems = [...document.querySelectorAll('[data-preview-src]')].map((el) => ({
      src: el.dataset.previewSrc,
      caption: el.dataset.previewCaption || el.getAttribute('aria-label') || '',
    }));
    const found = lightboxItems.findIndex((item) => item.src === trigger.dataset.previewSrc);
    if (found < 0) return;
    lightboxIndex = found;
    const dialog = lightboxDialog();
    paintLightbox();
    document.documentElement.classList.add('lightbox-open');
    if (!dialog.open) dialog.showModal();
  });
}

/* ---------- restrained section parallax ------------------------- */

const PARALLAX_TARGETS = [
  { selector: '.hero-aurora', factor: 0.1 },
  { selector: '.hero-sun', factor: 0.07 },
  { selector: '.hero-rings', factor: 0.05 },
  { selector: '.page-ornament', factor: 0.12 },
  { selector: '.detail-hero img', factor: 0.05 },
];

let parallaxItems = [];

function refreshParallax() {
  parallaxItems = [];
  if (prefersReducedMotion()) return;
  PARALLAX_TARGETS.forEach(({ selector, factor }) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.style.setProperty('--parallax-y', '0px');
      parallaxItems.push({ el, factor, top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight });
    });
  });
  updateParallax();
}

let parallaxTicking = false;

function updateParallax() {
  parallaxTicking = false;
  if (!parallaxItems.length) return;
  const viewport = window.innerHeight;
  const scale = window.innerWidth < 720 ? 0.5 : 1;
  parallaxItems.forEach(({ el, factor, top, height }) => {
    const distance = window.scrollY + viewport / 2 - (top + height / 2);
    const limit = window.innerWidth < 720 ? 18 : 34;
    const y = Math.max(-limit, Math.min(limit, distance * factor * scale));
    el.style.setProperty('--parallax-y', `${y.toFixed(1)}px`);
  });
}

function mountParallax() {
  if (prefersReducedMotion()) return;
  const onScroll = () => {
    if (parallaxTicking) return;
    parallaxTicking = true;
    requestAnimationFrame(updateParallax);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refreshParallax, { passive: true });
  refreshParallax();
}

/* ---------- kinetic festival typography -------------------------- */

function splitKineticHeading(el) {
  if (kineticSeen.has(el)) return;
  kineticSeen.add(el);
  const label = el.textContent.replace(/\s+/g, ' ').trim();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
  }

  let index = 0;
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.nodeValue.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement('span');
      word.className = 'kinetic-word';
      word.style.setProperty('--kinetic-delay', `${Math.min(index, 14) * 55}ms`);
      const glyph = document.createElement('span');
      glyph.className = 'kinetic-glyph';
      glyph.textContent = part;
      word.appendChild(glyph);
      frag.appendChild(word);
      index += 1;
    });
    node.parentNode.replaceChild(frag, node);
  });
  if (label) el.setAttribute('aria-label', label);
}

function mountKineticType(root = document) {
  if (prefersReducedMotion()) return;
  const headings = [...root.querySelectorAll(KINETIC_SELECTOR)].filter(
    (el) => !el.classList.contains('sr-only') && !el.closest('.intro')
  );
  if (!headings.length) return;
  if (!kineticObserver && 'IntersectionObserver' in window) {
    kineticObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('kinetic-in');
          kineticObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
  }
  headings.forEach((el) => {
    splitKineticHeading(el);
    if (kineticObserved.has(el)) return;
    kineticObserved.add(el);
    if (!kineticObserver || el.getBoundingClientRect().top < window.innerHeight * 0.94) {
      el.classList.add('kinetic-in');
    } else {
      kineticObserver.observe(el);
    }
  });
}

/* ---------- liquid artwork reveals -------------------------------- */

function mountLiquidImages(root = document) {
  if (prefersReducedMotion()) return;
  const frames = [...root.querySelectorAll('.event-media, .detail-hero')];
  if (!frames.length) return;
  if (!liquidObserver && 'IntersectionObserver' in window) {
    liquidObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('liquid-in');
          liquidObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.12 }
    );
  }
  frames.forEach((frame) => {
    if (liquidSeen.has(frame)) return;
    liquidSeen.add(frame);
    const box = frame.getBoundingClientRect();
    if (!liquidObserver || (box.top < window.innerHeight * 0.96 && box.bottom > 0)) {
      frame.classList.add('liquid-in');
    } else {
      liquidObserver.observe(frame);
    }
  });
}

/* ---------- aurora shimmer ---------------------------------------- */

const SHIMMER_SELECTOR = '.hero, .page-head, .section, .section-tight, .event-media, .detail-hero';

function mountAuroraShimmer(root = document) {
  if (prefersReducedMotion()) return;
  const matches = root.matches?.(SHIMMER_SELECTOR) ? [root] : [];
  const hosts = [...new Set([...matches, ...root.querySelectorAll(SHIMMER_SELECTOR)])];
  if (!hosts.length) return;

  if (!shimmerObserver && 'IntersectionObserver' in window) {
    shimmerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('shimmer-in');
          shimmerObserver.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
  }

  hosts.forEach((host, index) => {
    if (shimmerSeen.has(host)) return;
    shimmerSeen.add(host);
    if (![...host.children].some((child) => child.classList.contains('aurora-shimmer'))) {
      host.insertAdjacentHTML('afterbegin', '<span class="aurora-shimmer" aria-hidden="true"></span>');
    }
    host.classList.add('has-shimmer');
    host.style.setProperty('--shimmer-delay', `${Math.min(index, 12) * 70}ms`);
    const box = host.getBoundingClientRect();
    if (!shimmerObserver || (box.top < window.innerHeight * 0.96 && box.bottom > 0)) {
      host.classList.add('shimmer-in');
    } else {
      shimmerObserver.observe(host);
    }
  });
}

/* ---------- scroll-driven storytelling --------------------------- */

const STORY_TARGETS = [
  ['.hero-copy', 12, 0.012, 1.5],
  ['.section-head > div', 12, 0.01, 1.5],
  ['.quick-grid', 18, 0.015, 2],
  ['.grid', 20, 0.014, 2],
  ['.home-map-grid', 22, 0.02, 2.5],
  ['.announce-feed', 16, 0.012, 2],
  ['.filter-panel', 12, 0.01, 1.5],
  ['.day-head', 10, 0.01, 1.5],
  ['.schedule-list', 14, 0.01, 1.5],
  ['.detail-hero', 24, 0.018, 2.5],
];

function updateStory() {
  storyTicking = false;
  const viewport = window.innerHeight || 1;
  storyItems.forEach(({ el, amount, scale, blur }) => {
    if (!el.isConnected) return;
    const box = el.getBoundingClientRect();
    if (box.bottom < -viewport * 0.25 || box.top > viewport * 1.25) return;
    const progress = (viewport - box.top) / (viewport + Math.max(box.height, 1));
    const p = Math.min(1, Math.max(0, progress));
    const wave = Math.sin((p - 0.5) * Math.PI);
    el.style.setProperty('--story-y', `${(-wave * amount).toFixed(1)}px`);
    el.style.setProperty('--story-scale', (1 - Math.abs(wave) * scale).toFixed(4));
    el.style.setProperty('--story-blur', `${(Math.abs(wave) * blur).toFixed(1)}px`);
  });
}

function refreshStory() {
  storyItems = [];
  if (prefersReducedMotion()) return;
  const mobile = window.innerWidth < 720;
  STORY_TARGETS.forEach(([selector, amount, scale, blur]) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.closest('.intro')) return;
      el.classList.add('story-float');
      storyItems.push({
        el,
        amount: amount * (mobile ? 0.45 : 1),
        scale: scale * (mobile ? 0.5 : 1),
        blur: blur * (mobile ? 0.5 : 1),
      });
    });
  });
  updateStory();
}

function mountStoryScroll() {
  if (storyMounted || prefersReducedMotion()) return;
  storyMounted = true;
  window.addEventListener(
    'scroll',
    () => {
      if (storyTicking) return;
      storyTicking = true;
      requestAnimationFrame(updateStory);
    },
    { passive: true }
  );
  window.addEventListener('resize', refreshStory, { passive: true });
  refreshStory();
}

/** Mount every additive effect once; refresh image hooks after renders. */
export function mountMotion(root = document) {
  if (!motionReady) {
    motionReady = true;
    mountAmbientLight();
    mountPageEnter();
    mountPointerPolish();
    mountLightbox();
    mountParallax();
    mountStoryScroll();
  } else {
    refreshParallax();
  }
  if (!prefersReducedMotion()) document.documentElement.classList.add('js-motion');
  mountKineticType(root);
  mountLiquidImages(root);
  mountAuroraShimmer(root);
  refreshStory();
  mountImageFallbacks(root);
}

/* ---------------------------------------------------------------- */
/* Pointer flourish                                                 */
/* ---------------------------------------------------------------- */

const BURST_COLOURS = ['#6b2bd0', '#8b22c2', '#b7209b', '#c0249f', '#7c3ad9', '#a8437a'];

/** A colour burst wherever the user clicks or taps. */
function mountPointerFx() {
  if (window.__cfPointerFx) return;
  window.__cfPointerFx = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let layer = null;
  const touchStarts = new Map();
  const dropIfEmpty = () => {
    if (layer && !layer.childElementCount) {
      layer.remove();
      layer = null;
    }
  };
  const burstAt = (x, y) => {
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'tap-burst';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }

    const ring = document.createElement('i');
    ring.className = 'tap-ring';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    layer.appendChild(ring);
    ring
      .animate(
        [
          { transform: 'scale(0.35)', opacity: 0.75 },
          { transform: 'scale(2.7)', opacity: 0 },
        ],
        { duration: 560, easing: 'cubic-bezier(.2,.72,.3,1)' }
      )
      .addEventListener('finish', () => { ring.remove(); dropIfEmpty(); }, { once: true });

    for (let i = 0; i < 11; i += 1) {
      const colour = BURST_COLOURS[i % BURST_COLOURS.length];
      const dot = document.createElement('i');
      const size = 4 + Math.random() * 6;
      const angle = (Math.PI * 2 * i) / 11 + Math.random() * 0.7;
      const reach = 26 + Math.random() * 46;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = colour;
      dot.style.boxShadow = `0 0 12px -2px ${colour}`;
      layer.appendChild(dot);
      dot
        .animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 0.95 },
            {
              transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px) scale(${0.35 + Math.random() * 0.45})`,
              opacity: 0,
            },
          ],
          { duration: 520 + Math.random() * 280, easing: 'cubic-bezier(.16,.72,.3,1)' }
        )
        .addEventListener('finish', () => { dot.remove(); dropIfEmpty(); }, { once: true });
    }
  };

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch') {
        touchStarts.set(e.pointerId, { x: e.clientX, y: e.clientY, t: Date.now() });
        return;
      }
      burstAt(e.clientX, e.clientY);
    },
    { passive: true }
  );

  // a touch only bursts on a tap, never while scrolling
  window.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerType !== 'touch') return;
      const start = touchStarts.get(e.pointerId);
      touchStarts.delete(e.pointerId);
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (moved > 12 || Date.now() - start.t > 700) return;
      burstAt(e.clientX, e.clientY);
    },
    { passive: true }
  );

  window.addEventListener('pointercancel', (e) => touchStarts.delete(e.pointerId), { passive: true });
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

  if (!document.querySelector('.gold-dust')) {
    const dust = document.createElement('div');
    dust.className = 'gold-dust';
    dust.setAttribute('aria-hidden', 'true');
    document.body.prepend(dust);
  }

  const pageHead = document.querySelector('.page-head');
  if (pageHead && !pageHead.querySelector('.page-ornament')) {
    const ornament = document.createElement('div');
    ornament.className = 'page-ornament';
    ornament.setAttribute('aria-hidden', 'true');
    ornament.innerHTML = '<i></i><i></i>';
    pageHead.prepend(ornament);
  }


  mountIcons();
  mountMotion();
  initReveals();
  mountPointerFx();
  chromeMounted = true;
}

function mountBottomNav(page) {
  const items = NAV.filter((n) => n.href !== 'about.html').map((n) => ({
    ...n,
    label: n.href === 'announcements.html' ? 'Alerts' : n.href === 'map.html' ? 'Map' : n.label,
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
  if (cfg.contact_email) contact.push(esc(cfg.contact_email));
  if (cfg.contact_phone) contact.push(esc(cfg.contact_phone));

  return `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="brand footer-logo" aria-label="${APP.name} home">
            <span class="brand-mark">${BRAND_MARK}</span>
          </span>
          <p>${esc(cfg.tagline || APP.tagline)} An unofficial digital campaign for ${esc(APP.institution)} — schedule, campus map, stalls and live notices in one place.</p>
          ${social.length ? `<div class="footer-social">${social
            .map((s) => `<span class="social-btn" aria-label="${esc(s.label || 'Social link')}">${icon(s.icon || 'link', { size: 17 })}</span>`)
            .join('')}</div>` : ''}
        </div>

        <div class="footer-col">
          <h4>Festival</h4>
          <ul>
            <li>Events &amp; schedule</li>
            <li>Campus map</li>
            <li>Stalls &amp; offers</li>
            <li>Announcements</li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Using the app</h4>
          <ul>
            <li>Install &amp; go offline</li>
            <li>How offline mode works</li>
            <li>FAQ</li>
            <li>Help</li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Official</h4>
          <ul>
            <li>Official website — https://colours.adityauniversity.in/</li>
            ${contact.length ? `<li>${contact.join('</li><li>')}</li>` : ''}
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${esc(APP.name)} · ${esc(APP.institution)}. Built as a student festival project.</span>
        <p class="footer-legal"><span>Privacy</span><span>Terms</span><span>About</span></p>
      </div>
      ${isSampleMode() ? `<p class="micro dim" style="padding-bottom:18px">Showing the bundled Colours 2K27 programme.</p>` : hasSampleRecords() ? `<p class="micro dim" style="padding-bottom:18px">Some records come from the bundled programme.</p>` : ''}
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
      <span><b>Bundled programme.</b> You are viewing the Colours 2K27 schedule, map and stalls stored with the site.</span>
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
      // Only the last value (seconds) animates; other units update quietly.
      if (!valid || i !== cells.length - 1) return;
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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f2fe"/><stop offset=".5" stop-color="#ece2f8"/><stop offset="1" stop-color="#e3d5f6"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><g fill="none" stroke="#7c3ad9" stroke-width="2" opacity=".55"><path d="M-20 250c120-70 180 60 320 10s180-140 360-80"/><path d="M-20 300c140-60 200 50 340 0s180-120 380-60"/></g><text x="320" y="188" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#4a0fae" opacity=".8">ColoursFlux</text></svg>`
)}`;

export function mountImageFallbacks(root = document) {
  root.querySelectorAll('img[data-fallback]:not([data-fallback-ready])').forEach((img) => {
    img.dataset.fallbackReady = '1';
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
  return `<img src="${esc(safeUrl(src, PLACEHOLDER))}" alt="${esc(alt)}" class="${cls}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${eager ? 'high' : 'auto'}" data-fallback>`;
}

/** Optional full-screen preview affordance for existing artwork. */
export function previewButton(src, caption, { cls = '' } = {}) {
  return `<button type="button" class="image-preview-btn ${cls}" data-preview-src="${esc(safeUrl(src, PLACEHOLDER))}" data-preview-caption="${esc(caption)}" aria-label="Preview ${esc(caption)} artwork">${icon('maximize', { size: 15 })}</button>`;
}

/* ---------------------------------------------------------------- */
/* Cards                                                            */
/* ---------------------------------------------------------------- */

export const CATEGORIES = {
  music: { label: 'Music', icon: 'music', color: '#4a12b0' },
  dance: { label: 'Dance', icon: 'zap', color: '#b7209b' },
  theatre: { label: 'Theatre', icon: 'mic', color: '#7a4a86' },
  tech: { label: 'Tech', icon: 'cpu', color: '#2c6e78' },
  arts: { label: 'Arts', icon: 'palette', color: '#4f5f8a' },
  sports: { label: 'Sports', icon: 'trophy', color: '#3d6b3a' },
  food: { label: 'Food', icon: 'utensils', color: '#c2417a' },
  literature: { label: 'Literature', icon: 'file-text', color: '#3d6489' },
  fashion: { label: 'Fashion', icon: 'shirt', color: '#a8437a' },
  art: { label: 'Art & crafts', icon: 'palette', color: '#4f5f8a' },
  merch: { label: 'Merchandise', icon: 'shopping-bag', color: '#6b5c8c' },
  other: { label: 'Other', icon: 'tag', color: '#6b5c8c' },
};

export function categoryOf(key) {
  return CATEGORIES[key] || { label: key ? String(key) : 'Other', icon: 'tag', color: '#6b5c8c' };
}

/* ---------------------------------------------------------------- */
/* Campus map                                                       */
/* ---------------------------------------------------------------- */

export const LOCATION_TYPES = {
  stage: { label: 'Stages', icon: 'mic', color: '#4a12b0' },
  food: { label: 'Food & drink', icon: 'utensils', color: '#c2417a' },
  venue: { label: 'Venues', icon: 'building', color: '#35097c' },
  sports: { label: 'Sports', icon: 'trophy', color: '#3d6b3a' },
  service: { label: 'Services', icon: 'info', color: '#2c6e78' },
  parking: { label: 'Parking', icon: 'navigation', color: '#6b5c8c' },
  other: { label: 'Other', icon: 'map-pin', color: '#6b5c8c' },
};

export function locationTypeOf(type) {
  return LOCATION_TYPES[type] || LOCATION_TYPES.other;
}

/**
 * Decorative campus plate. Markers are positioned as a percentage of the
 * board, so the SVG stretches to the container and stays aligned at any size.
 */
export function mapPlate({ eager = false } = {}) {
  return `<img class="map-img" src="assets/img/campus-map.webp" alt="Aditya University campus map showing bhavans, grounds, hostels, parking and college blocks" width="1700" height="1178" loading="${eager ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${eager ? 'high' : 'auto'}" draggable="false" data-fallback />`;
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
        <span class="badge event-cat-badge cat-badge-solid" style="--cat:${cat.color}">${icon(cat.icon, { size: 12 })} ${esc(cat.label)}</span>
        ${ev.featured ? `<span class="badge badge-magenta">${icon('star', { size: 12 })} Featured</span>` : ''}
      </div>
      <div class="date-chip">
        <b>${esc(formatDayShort(ev.event_date))}</b>
        <span>${esc(formatTime(ev.start_time) || 'TBA')}</span>
      </div>
      ${phase === 'cancelled' ? '<span class="badge badge-red" style="position:absolute;right:12px;bottom:12px;z-index:2">Cancelled</span>' : ''}
    </a>
    ${previewButton(ev.image_url, ev.title)}
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
        <span aria-hidden="true">·</span> <i class="cat-dot" style="--dot:${cat.color}" aria-hidden="true"></i>${esc(cat.label)}
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
      <div class="vendor-logo" style="${vendor.image_url ? '' : `background:linear-gradient(150deg, hsl(${violetHueFor(vendor.name)} 34% 90%), #e9defb)`}">
        ${vendor.image_url ? imgTag(vendor.image_url, `${vendor.name} logo`) : esc(initials(vendor.name))}
      </div>
      <div style="min-width:0;flex:1">
        <div class="cluster" style="gap:6px">
          <h3 class="vendor-name">${esc(vendor.name)}</h3>
          ${featured ? `<span class="badge badge-magenta">${icon('star', { size: 11 })} Featured</span>` : ''}
        </div>
        <div class="meta-row" style="margin-top:3px">${icon(cat.icon, { size: 13 })}<i class="cat-dot" style="--dot:${cat.color}" aria-hidden="true"></i><span>${esc(cat.label)}</span></div>
      </div>
    </div>
    <p class="vendor-desc">${esc(vendor.description || '')}</p>
    <div class="cluster" style="gap:8px">
      <span class="badge badge-neutral">${icon('map-pin', { size: 12 })} ${esc(loc?.name || 'Location TBA')}</span>
      ${featured ? '<span class="badge badge-magenta">Sponsored placement</span>' : ''}
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
  high: { label: 'High priority', cls: 'badge-magenta', icon: 'alert-circle' },
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
      if (err.code === 'not-configured') {
        toast('This copy already includes the full festival programme.', { type: 'info' });
      } else {
        toast(err.message, { type: 'error' });
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
      mountIcons(btn);
    }
  });
}
