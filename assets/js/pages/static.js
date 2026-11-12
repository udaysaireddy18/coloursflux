/**
 * Shared behaviour for mostly-static pages (privacy, terms, 404-ish pages):
 * render the chrome, load config for the footer, and wire install buttons.
 */
import store from '../store.js';
import { mountChrome } from '../ui.js';
import { mountIcons } from '../icons.js';
import { mountInstallButtons, registerServiceWorker } from '../pwa.js';

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();
  mountChrome();
  mountIcons();
  mountInstallButtons();
  registerServiceWorker();

  const date = document.querySelector('#policy-date');
  if (date) {
    date.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

boot();
