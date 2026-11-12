/**
 * PWA plumbing: service worker registration, install prompt and update prompt.
 * Deliberately conservative — no silent reloads while a user is browsing.
 */
import { LS } from './config.js';
import { icon, mountIcons } from './icons.js';
import { toast } from './ui.js';

let deferredPrompt = null;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function mountInstallButtons(root = document) {
  root.querySelectorAll('[data-install-app]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (isStandalone()) {
        toast('ColoursFlux is already installed on this device.', { type: 'success' });
        return;
      }
      if (!deferredPrompt) {
        location.href = 'install.html';
        return;
      }
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') toast('Installing ColoursFlux…', { type: 'success' });
      deferredPrompt = null;
    });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.querySelectorAll('[data-install-app]').forEach((b) => b.removeAttribute('hidden'));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  toast('ColoursFlux installed. It now opens offline.', { type: 'success' });
});

function showUpdateBanner(onAccept) {
  if (localStorage.getItem(LS.updateDismissed) === '1') return;
  const bar = document.createElement('div');
  bar.className = 'sync-bar';
  bar.dataset.tone = 'warn';
  bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:110;max-width:520px;margin:auto';
  bar.innerHTML = `${icon('download', { size: 16 })}
    <span>A new version of ColoursFlux is ready.</span>
    <span class="spacer"></span>
    <button class="btn btn-sm" data-update>Reload</button>
    <button class="btn btn-sm btn-ghost" data-dismiss aria-label="Dismiss">Dismiss</button>`;
  mountIcons(bar);
  bar.querySelector('[data-update]').addEventListener('click', onAccept);
  bar.querySelector('[data-dismiss]').addEventListener('click', () => {
    localStorage.setItem(LS.updateDismissed, '1');
    bar.remove();
  });
  document.body.appendChild(bar);
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  if (location.protocol === 'file:') {
    console.info('[ColoursFlux] Service workers need http(s); run a local server to test offline mode.');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });

    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(() => {
            worker.postMessage({ type: 'SKIP_WAITING' });
          });
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });

    // Ask the worker for a manual content revalidate on reconnect.
    window.addEventListener('online', () => {
      navigator.serviceWorker.controller?.postMessage({ type: 'REVALIDATE' });
    });

    return reg;
  } catch (err) {
    console.warn('[ColoursFlux] Service worker registration failed', err);
    return null;
  }
}
