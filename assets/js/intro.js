/**
 * ColoursFlux — opening animation controller.
 *
 * The overlay markup lives at the top of index.html so it paints before the
 * hero. This module builds the rangoli, plays the sequence once per browser
 * session, and dismisses the overlay on tap, key press, wheel or timeout.
 * Add ?intro=1 to replay it deliberately.
 */

const SEEN_KEY = 'cf.intro.seen.v1';
const OUTER_PETALS = 20;
const INNER_PETALS = 12;
const DOTS = 24;
const RANGOLI_COLOURS = [
  '#ffb703',
  '#ffe066',
  '#ff70a6',
  '#f15bb5',
  '#9b5de5',
  '#6c63ff',
  '#22d3ee',
  '#2ec4b6',
];

function buildRangoli(root) {
  const petals = root.querySelector('.intro-petals');
  const dots = root.querySelector('.intro-dots');
  if (!petals || !dots) return;

  let petalMarkup = '';
  for (let i = 0; i < OUTER_PETALS; i += 1) {
    const angle = (360 / OUTER_PETALS) * i;
    const colour = RANGOLI_COLOURS[i % RANGOLI_COLOURS.length];
    petalMarkup += `<i class="intro-petal" style="--a:${angle}deg;--i:${i};--c:${colour}"></i>`;
  }
  for (let i = 0; i < INNER_PETALS; i += 1) {
    const angle = (360 / INNER_PETALS) * i + 7.5;
    const colour = RANGOLI_COLOURS[(i + 3) % RANGOLI_COLOURS.length];
    petalMarkup += `<i class="intro-petal intro-petal-inner" style="--a:${angle}deg;--i:${
      i + OUTER_PETALS
    };--c:${colour}"></i>`;
  }
  petals.innerHTML = petalMarkup;

  let dotMarkup = '';
  for (let i = 0; i < DOTS; i += 1) {
    const angle = (360 / DOTS) * i;
    const colour = RANGOLI_COLOURS[(i * 2) % RANGOLI_COLOURS.length];
    dotMarkup += `<i class="intro-dot" style="--a:${angle}deg;--i:${i};--c:${colour}"></i>`;
  }
  dots.innerHTML = dotMarkup;
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* private mode or storage disabled — the intro can simply play again */
  }
}

export function mountIntro() {
  const root = document.getElementById('fest-intro');
  if (!root) return;

  const replay = new URLSearchParams(location.search).get('intro') === '1';
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    seen = false;
  }

  // Browsers that ask for less motion go straight to the guide.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || (seen && !replay) || document.documentElement.classList.contains('intro-seen')) {
    markSeen();
    root.remove();
    return;
  }

  buildRangoli(root);
  document.documentElement.classList.add('intro-open');

  let closed = false;
  let timer = 0;

  const onKey = () => close(true);
  const onWheel = () => close(true);

  const cleanup = () => {
    // Remember it only after it has actually played. A service-worker update
    // can reload the page mid-animation, and the reload should still get the
    // opening sequence instead of being marked as "already seen".
    markSeen();
    root.remove();
    document.documentElement.classList.remove('intro-open');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
  };

  const close = (instant = false) => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    if (instant) root.style.setProperty('--exit-time', '0.38s');
    root.classList.add('is-leaving');
    window.setTimeout(cleanup, instant ? 430 : 990);
  };

  root.addEventListener('click', () => close(true));
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: true });

  // Long enough to enjoy the rangoli, short enough not to hold anyone up.
  timer = window.setTimeout(() => close(false), 6000);
}
