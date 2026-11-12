import store from '../store.js';
import { mountChrome, mountSyncBar, wireDataDownload } from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc } from '../util.js';

const $ = (sel) => document.querySelector(sel);

function range() {
  const cfg = store.state.config;
  const tz = cfg.timezone || 'Asia/Kolkata';
  const start = new Date(cfg.festival_start);
  if (Number.isNaN(start.getTime())) return 'Dates to be announced';
  const fmt = (d, opts) => new Intl.DateTimeFormat('en-IN', { timeZone: tz, ...opts }).format(d);
  const end = new Date(cfg.festival_end || cfg.festival_start);
  return `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function render() {
  const cfg = store.state.config;
  const facts = $('#about-facts');
  if (facts) {
    facts.innerHTML = [
      { icon: 'calendar', label: 'Festival', value: cfg.festival_name || 'Colours 2K27' },
      { icon: 'clock', label: 'Dates', value: range() },
      { icon: 'map-pin', label: 'Campus', value: 'Aditya University' },
      { icon: 'wifi-off', label: 'Offline', value: 'Schedule, map, stalls saved locally' },
    ]
      .map(
        (f) => `<div class="info-tile">
          <div class="meta-row" style="margin-bottom:6px">${icon(f.icon, { size: 14 })}<span>${esc(f.label)}</span></div>
          <b>${esc(f.value)}</b>
        </div>`
      )
      .join('');
  }

  const contact = [];
  if (cfg.contact_email) contact.push(`<p>Email: <a href="mailto:${esc(cfg.contact_email)}">${esc(cfg.contact_email)}</a></p>`);
  if (cfg.contact_phone) contact.push(`<p>Phone: <a href="tel:${esc(cfg.contact_phone)}">${esc(cfg.contact_phone)}</a></p>`);
  const social = (cfg.social_links || []).filter((s) => s && s.url);
  if (social.length) {
    contact.push(
      `<p>Social: ${social
        .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`)
        .join(' · ')}</p>`
    );
  }
  const block = $('#contact-block');
  if (block) {
    block.innerHTML = contact.length
      ? contact.join('')
      : '<p>The organising team has not published contact details in this deployment yet. Add them in Admin → Settings so they appear here.</p>';
  }
}

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();
  mountChrome();
  render();
  mountSyncBar($('#about-sync'));
  
  // Every FAQ summary needs a consistent chevron.
  document.querySelectorAll('#faq-list summary').forEach((summary) => {
    const old = summary.querySelector('svg');
    if (old) old.remove();
    summary.insertAdjacentHTML('beforeend', icon('chevron-down', { size: 16 }));
  });

  wireDataDownload(document.querySelector('[data-download-data]'));
  mountIcons();
}

boot();
