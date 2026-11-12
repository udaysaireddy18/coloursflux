/**
 * Offline fallback behaviour. Kept as an external module (rather than an inline
 * script) so the site can ship a strict script-src 'self' Content Security
 * Policy. This file is precached with the rest of the app shell.
 */
const state = document.getElementById('conn-state');
const retry = document.getElementById('retry');

function paint() {
  if (!state) return;
  if (navigator.onLine) {
    state.textContent = 'Connection restored — try again.';
    retry?.classList.add('btn-primary');
  } else {
    state.textContent = 'Waiting for a connection…';
  }
}

retry?.addEventListener('click', () => location.reload());
window.addEventListener('online', paint);
window.addEventListener('offline', paint);
paint();
