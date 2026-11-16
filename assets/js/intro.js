/**
 * ColoursFlux — cultural festival ident controller.
 *
 * The overlay markup lives at the top of index.html so it paints before the
 * hero. This module builds the rangoli rings around the emblem and dismisses
 * the ident on tap, key press, wheel or timeout. Add ?intro=0 to skip it once.
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

  if (outer) outer.innerHTML = petalMarkup(OUTER_PETALS, OUTER_COLOURS);
  if (inner) inner.innerHTML = petalMarkup(INNER_PETALS, INNER_COLOURS);
  if (kolam) kolam.innerHTML = dotMarkup(KOLAM_DOTS, DOT_COLOURS);
}

export function mountIntro() {
  const root = document.getElementById('fest-intro');
  if (!root) return;

  const skip = new URLSearchParams(location.search).get('intro') === '0';

  // Browsers that ask for less motion go straight to the guide; ?intro=0 skips.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || skip || document.documentElement.classList.contains('intro-seen')) {
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
