/**
 * ColoursFlux — opening splash controller.
 *
 * The overlay markup lives at the top of index.html so it paints before the
 * hero. This module starts the sequence timer and dismisses the splash on tap,
 * key press, wheel or timeout. Add ?intro=0 to skip it once.
 */

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
    if (instant) root.style.setProperty('--exit-time', '0.38s');
    root.classList.add('is-leaving');
    window.setTimeout(cleanup, instant ? 430 : 860);
  };

  root.addEventListener('click', () => close(true));
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: true });

  // Long enough to read the name and dates, short enough not to hold anyone up.
  timer = window.setTimeout(() => close(false), 3700);
}
