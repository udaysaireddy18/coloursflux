/**
 * ColoursFlux — cultural festival ident controller.
 *
 * The overlay markup lives at the top of index.html so it paints before the
 * hero. This module builds the rangoli rings around the emblem and dismisses
 * the ident on tap, key press, wheel or timeout. It greets the first home-page
 * load of a browsing session; index.html marks later arrivals to stay quiet.
 * ?intro=0 skips it, ?intro=1 replays it.
 */

const OUTER_PETALS = 18;
const INNER_PETALS = 14;
const KOLAM_DOTS = 28;

const OUTER_COLOURS = ['#4b0fa8', '#6b2bd0', '#8b22c2', '#b7209b', '#751aa3', '#9a2ecb'];
const INNER_COLOURS = ['#6b2bd0', '#a02fc4', '#c535a8', '#7a28c9'];
const DOT_COLOURS = ['#b7209b', '#8b22c2', '#6b2bd0', '#d02a9f'];

function petalMarkup(count, colours) {
  let markup = '';
  for (let i = 0; i < count; i += 1) {
    const angle = (360 / count) * i;
    const colour = colours[i % colours.length];
    markup += `<i class="intro-petal" aria-hidden="true" style="--a:${angle}deg;--i:${i};--c:${colour}"></i>`;
  }
  return markup;
}

function dotMarkup(count, colours) {
  let markup = '';
  for (let i = 0; i < count; i += 1) {
    const angle = (360 / count) * i;
    const colour = colours[i % colours.length];
    markup += `<i class="intro-dot" aria-hidden="true" style="--a:${angle}deg;--i:${i};--c:${colour}"></i>`;
  }
  return markup;
}

function buildRangoli(root) {
  const outer = root.querySelector('.intro-petals-outer');
  const inner = root.querySelector('.intro-petals-inner');
  const kolam = root.querySelector('.intro-kolam');
  // Phones get a lighter rangoli: the bloom reads the same, with fewer
  // independently animated elements competing for the main thread.
  const compact = window.matchMedia('(max-width: 720px)').matches;

  if (outer) outer.innerHTML = petalMarkup(compact ? 11 : OUTER_PETALS, OUTER_COLOURS);
  if (inner) inner.innerHTML = petalMarkup(compact ? 8 : INNER_PETALS, INNER_COLOURS);
  if (kolam) kolam.innerHTML = dotMarkup(compact ? 14 : KOLAM_DOTS, DOT_COLOURS);
}

export function mountIntro() {
  const root = document.getElementById('fest-intro');
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const skip = params.get('intro') === '0';
  const replay = params.get('intro') === '1';

  // Browsers that ask for less motion go straight to the guide; the ident also
  // stays quiet when the visitor arrived from another page of the site.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (
    reducedMotion ||
    skip ||
    (!replay && document.documentElement.classList.contains('intro-seen'))
  ) {
    root.remove();
    document.documentElement.classList.remove('intro-open');
    return;
  }

  buildRangoli(root);
  document.documentElement.classList.add('intro-open');

  let closed = false;
  let timer = 0;

  const onKey = () => close(true);
  const onWheel = () => close(true);

  const cleanup = () => {
    root.remove();
    document.documentElement.classList.remove('intro-open');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
  };

  const close = (instant = false) => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    if (instant) root.style.setProperty('--exit-time', '0.42s');
    root.classList.add('is-leaving');
    window.setTimeout(cleanup, instant ? 470 : 900);
  };

  root.addEventListener('click', () => close(true));
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: true });

  // Long enough for the rangoli to bloom and the lockup to be read.
  timer = window.setTimeout(() => close(false), 4000);
}
