import store from '../store.js';
import {
  mountChrome,
  mountSyncBar,
  announcementCard,
  emptyState,
  wireDataDownload,
  toast,
} from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { timeAgo } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const NOTIFY_KEY = 'cf.notify.v1';
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const PRIORITY_LABEL = { urgent: 'Urgent', high: 'High', normal: 'Notice', low: 'Info' };
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f59e0b', normal: '#6d63ff', low: '#06b6d4' };

let filter = '';

function notifyPref() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFY_KEY) || '{"enabled":false}');
  } catch {
    return { enabled: false };
  }
}

function savePref(pref) {
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(pref));
}

/** Fires a local notification only when the app is open and a genuinely new notice arrives. */
async function maybeNotify(announcements) {
  const pref = notifyPref();
  if (!pref.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (!announcements.length || !store.state.online) return;
  const newest = announcements[0];
  if (!pref.lastSeenId) {
    savePref({ ...pref, lastSeenId: newest.id });
    return;
  }
  if (newest.id === pref.lastSeenId) return;
  savePref({ ...pref, lastSeenId: newest.id });
  if (!document.hidden) return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const body = newest.message.length > 120 ? `${newest.message.slice(0, 117)}…` : newest.message;
    if (reg) {
      await reg.showNotification(newest.title, { body, icon: 'assets/icons/icon-192.png', tag: 'coloursflux-announcement' });
    } else {
      new Notification(newest.title, { body });
    }
  } catch {
    /* notifications are best-effort; never claim delivery */
  }
}

function render() {
  const all = store.publishedAnnouncements();
  const rows = filter ? all.filter((a) => a.priority === filter) : all;

  $('#announce-feed').innerHTML = rows.length
    ? rows.map(announcementCard).join('')
    : emptyState({
        iconName: all.length ? 'filter' : 'megaphone',
        title: all.length ? 'No notices with that priority' : 'No announcements yet',
        text: all.length
          ? 'Try a different priority filter.'
          : 'When organisers publish a notice it will appear here and in your offline copy.',
        action: all.length ? '<button class="btn btn-sm btn-outline" data-clear-priority>Show all notices</button>' : '',
      });

  $('#announce-feed').querySelector('[data-clear-priority]')?.addEventListener('click', () => {
    filter = '';
    paintChips();
    render();
  });

  $('#last-updated').textContent = store.state.lastSync
    ? `Last updated: ${timeAgo(store.state.lastSync)}`
    : store.state.source === 'sample'
      ? 'Bundled schedule — not synced'
      : 'Not yet synchronised';

  mountIcons($('#announce-feed'));
}

function paintChips() {
  const all = store.publishedAnnouncements();
  const host = $('#priority-chips');
  const present = PRIORITIES.filter((p) => all.some((a) => a.priority === p));
  host.innerHTML = [`<button class="chip" data-pri="" aria-pressed="${!filter}">All notices (${all.length})</button>`]
    .concat(
      present.map(
        (p) =>
          `<button class="chip" data-pri="${p}" aria-pressed="${filter === p}"><span style="width:7px;height:7px;border-radius:50%;background:${PRIORITY_COLOR[p]}"></span> ${PRIORITY_LABEL[p]} (${all.filter((a) => a.priority === p).length})</button>`
      )
    )
    .join('');
  host.querySelectorAll('[data-pri]').forEach((chip) =>
    chip.addEventListener('click', () => {
      filter = chip.dataset.pri;
      paintChips();
      render();
    })
  );
}

function setupNotifications() {
  const btn = $('#notify-btn');
  const state = $('#notify-state');
  const copy = $('#notify-copy');

  if (!('Notification' in window)) {
    state.textContent = 'This browser does not support notifications. Announcements still work normally.';
    return;
  }
  if (!window.isSecureContext) {
    state.textContent = 'Notifications need an HTTPS connection. Announcements still work normally.';
    return;
  }

  btn.hidden = false;
  const paint = () => {
    const pref = notifyPref();
    const granted = Notification.permission === 'granted';
    btn.textContent = pref.enabled ? 'Disable alerts' : 'Enable alerts';
    btn.classList.toggle('btn-primary', !pref.enabled && Notification.permission !== 'denied');
    if (Notification.permission === 'denied') {
      btn.disabled = true;
      state.textContent = 'Alerts are blocked in your browser settings. You can re-enable them from the site settings menu.';
    } else if (pref.enabled && granted) {
      state.textContent = 'Alerts are on for this device. You will only be alerted while the app is open and online.';
    } else {
      state.textContent = 'Alerts are off. Nothing is sent while the device is offline.';
    }
  };

  btn.addEventListener('click', async () => {
    const pref = notifyPref();
    if (pref.enabled) {
      savePref({ ...pref, enabled: false });
      toast('Browser alerts turned off.', { type: 'info' });
      paint();
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast('Alerts were not enabled. You can still read announcements here.', { type: 'warn' });
      paint();
      return;
    }
    const newest = store.publishedAnnouncements()[0];
    savePref({ enabled: true, lastSeenId: newest?.id || null });
    toast('Alerts enabled for this device.', { type: 'success' });
    paint();
  });

  copy.textContent =
    'Alerts are generated locally by this app while it is open in a tab or installed window. There is no push server, so a device that is offline cannot receive new notices — open the app when you reconnect.';
  paint();
}

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();
  mountChrome();

  mountSyncBar($('#announce-status'));
  paintChips();
  render();
  setupNotifications();
  maybeNotify(store.publishedAnnouncements());

  store.subscribe((type) => {
    if (type === 'sync') {
      paintChips();
      render();
      maybeNotify(store.publishedAnnouncements());
    }
  });

  $('#refresh-announcements').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh', { size: 14 })} Refreshing…`;
    try {
      await store.refresh();
      toast('Announcements updated.', { type: 'success' });
    } catch (err) {
      toast(err.code === 'not-configured' ? 'Demo mode: live notices need Supabase.' : err.message, { type: 'error' });
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('refresh', { size: 14 })} Refresh`;
      mountIcons(btn);
    }
  });

  wireDataDownload(document.querySelector('[data-download-data]'));
}

boot();
