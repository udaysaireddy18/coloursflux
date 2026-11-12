import store from '../store.js';
import { mountChrome, mountSyncBar, wireDataDownload, toast } from '../ui.js';
import { mountIcons } from '../icons.js';
import { isStandalone, mountInstallButtons, registerServiceWorker } from '../pwa.js';
import { drawQR } from '../qr.js';
import { formatBytes, storageEstimate } from '../idb.js';
import { esc } from '../util.js';

const $ = (sel) => document.querySelector(sel);

async function paintSummary() {
  const s = store.state;
  const parts = [
    `${s.events.length} events`,
    `${s.locations.length} locations`,
    `${s.vendors.length} stalls`,
    `${s.announcements.length} notices`,
  ];
  const est = await storageEstimate();
  $('#offline-summary-text').innerHTML = `Saved on this device: <b>${parts.join(' · ')}</b>${
    s.lastSync ? ` — synced ${new Date(s.lastSync).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ' — not yet synced from a server'
  }${est ? ` · ${formatBytes(est.usage)} used` : ''}`;
}

function setupQr() {
  const input = $('#qr-url');
  const error = $('#qr-error');
  const output = $('#qr-output');
  const caption = $('#qr-caption');
  const download = $('#qr-download');
  let dataUrl = null;

  const clean = () => {
    error.hidden = true;
    download.hidden = true;
    dataUrl = null;
  };

  $('#qr-use-current').addEventListener('click', () => {
    input.value = location.href.split('#')[0];
    input.focus();
  });

  $('#qr-generate').addEventListener('click', () => {
    clean();
    const raw = input.value.trim();
    if (!raw) {
      error.textContent = 'Enter the confirmed deployed URL first.';
      error.hidden = false;
      return;
    }
    let url;
    try {
      url = new URL(raw);
    } catch {
      error.textContent = 'That does not look like a valid URL. Include https:// at the start.';
      error.hidden = false;
      return;
    }
    if (!/^https?:$/.test(url.protocol)) {
      error.textContent = 'Only http(s) links can be encoded.';
      error.hidden = false;
      return;
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      error.textContent = 'This is a local address. Scanning it on a phone will not open the site — use the deployed HTTPS URL.';
      error.hidden = false;
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      const { size, count } = drawQR(canvas, url.href, { scale: 6 });
      dataUrl = canvas.toDataURL('image/png');
      output.innerHTML = '';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `QR code linking to ${url.href}`);
      output.appendChild(canvas);
      caption.innerHTML = `Encoded <span class="mono">${esc(url.href)}</span> · ${count}×${count} modules · ${size}px`;
      download.hidden = false;
      toast('QR code generated locally.', { type: 'success' });
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  });

  download.addEventListener('click', () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'coloursflux-qr.png';
    a.click();
  });
}

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();
  mountChrome();

  mountSyncBar($('#install-status'));
  await paintSummary();
  mountInstallButtons();
  wireDataDownload(document.querySelector('[data-download-data]'));
  setupQr();
  registerServiceWorker();

  const stateBadge = $('#install-state');
  stateBadge.textContent = isStandalone() ? 'Installed' : 'Browser';
  stateBadge.className = `badge ${isStandalone() ? 'badge-green' : 'badge-neutral'}`;

  $('#clear-data').addEventListener('click', async () => {
    const ok = window.confirm(
      'This removes the saved festival schedule, map, stalls and notices from this device. You will need a connection to download them again. Continue?'
    );
    if (!ok) return;
    await store.wipeCache();
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* cache API may be unavailable */
    }
    toast('Saved data cleared. Reloading…', { type: 'info' });
    setTimeout(() => location.reload(), 900);
  });

  store.subscribe((type) => {
    if (['sync', 'ready', 'wipe'].includes(type)) paintSummary();
  });
}

boot();
