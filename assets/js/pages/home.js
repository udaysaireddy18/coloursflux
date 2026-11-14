import store from '../store.js';
import {
  mountChrome,
  waveArt,
  mountCountdown,
  mountSyncBar,
  eventCard,
  vendorCard,
  announcementCard,
  emptyState,
  wireBookmarks,
  wireDataDownload,
  categoryOf,
  mapPlate,
  staticMapMarkers,
  locationTypeOf,
} from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc } from '../util.js';
import { registerServiceWorker, mountInstallButtons } from '../pwa.js';

const $ = (sel) => document.querySelector(sel);

function festivalRange() {
  const cfg = store.state.config;
  const tz = cfg.timezone || 'Asia/Kolkata';
  const start = new Date(cfg.festival_start);
  const end = new Date(cfg.festival_end || cfg.festival_start);
  if (Number.isNaN(start.getTime())) return 'Dates to be announced';
  const fmt = (d, opts) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: tz, ...opts }).format(d);
  const sameMonth =
    fmt(start, { month: 'short', year: 'numeric' }) === fmt(end, { month: 'short', year: 'numeric' });
  const startDay = fmt(start, { day: 'numeric' });
  const endDay = fmt(end, { day: 'numeric' });
  const month = fmt(start, { month: 'short' });
  const year = fmt(start, { year: 'numeric' });
  return sameMonth ? `${startDay} – ${endDay} ${month} ${year}` : `${startDay} ${month} – ${endDay} ${fmt(end, { month: 'short' })} ${year}`;
}

function festivalPhase() {
  const cfg = store.state.config;
  const start = new Date(cfg.festival_start).getTime();
  const end = new Date(cfg.festival_end || cfg.festival_start).getTime();
  if (Number.isNaN(start)) return { label: 'Dates TBA', cls: 'badge-purple' };
  const now = Date.now();
  if (now < start) return { label: 'Upcoming', cls: 'badge-purple' };
  if (now <= end) return { label: 'Live now', cls: 'badge-green' };
  return { label: 'Completed', cls: 'badge-neutral' };
}

function render() {
  const s = store.state;
  const events = store.publishedEvents();
  const vendors = store.featuredVendors();
  const announcements = store.publishedAnnouncements();

  // dates + phase
  const dates = $('#festival-dates');
  if (dates) dates.innerHTML = `${icon('calendar', { size: 15 })}<span>${esc(festivalRange())}</span>`;
  const phaseEl = $('#festival-phase');
  const phase = festivalPhase();
  if (phaseEl) {
    phaseEl.className = `badge ${phase.cls}`;
    phaseEl.textContent = phase.label;
  }

  // quick card meta
  const mapped = s.locations.filter((loc) => loc.map_x != null && loc.map_y != null);
  const days = new Set(events.map((ev) => ev.event_date)).size;
  const offerCount = store.activeOffers().length;
  const setText = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };

  setText('#quick-events', `${events.length} event${events.length === 1 ? '' : 's'}${days ? ` · ${days} day${days === 1 ? '' : 's'}` : ''}`);
  setText('#quick-locations', `${mapped.length} mapped location${mapped.length === 1 ? '' : 's'}`);
  setText('#quick-vendors', `${s.vendors.length} stall${s.vendors.length === 1 ? '' : 's'}${offerCount ? ` · ${offerCount} offer${offerCount === 1 ? '' : 's'}` : ''}`);
  setText(
    '#quick-announcements',
    announcements.length
      ? `${announcements.length} published notice${announcements.length === 1 ? '' : 's'}`
      : 'No notices yet'
  );

  // vendor category chips link into the stalls directory
  const chipHost = $('#home-vendor-chips');
  if (chipHost) {
    const counts = new Map();
    for (const vendor of s.vendors) {
      if (!vendor.category) continue;
      counts.set(vendor.category, (counts.get(vendor.category) || 0) + 1);
    }
    const chips = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6);
    chipHost.innerHTML = chips.length
      ? chips
          .map(([key, count]) => {
            const cat = categoryOf(key);
            return `<a class="chip" href="stalls.html?cat=${encodeURIComponent(key)}">${icon(cat.icon, { size: 14 })} ${esc(cat.label)} <span class="micro dim">${count}</span></a>`;
          })
          .join('')
      : `<a class="chip" href="stalls.html">${icon('store', { size: 14 })} Browse all stalls</a>`;
  }

  // campus map preview — real configured markers
  const artHost = $('#home-map-art');
  if (artHost) artHost.innerHTML = mapPlate();
  const markerHost = $('#home-map-markers');
  if (markerHost) markerHost.innerHTML = mapped.length ? staticMapMarkers(mapped, { max: 10, labels: 0 }) : '';
  setText('#home-map-count', `${mapped.length} locations`);

  const mapList = $('#home-map-list');
  if (mapList) {
    mapList.innerHTML = mapped.length
      ? mapped
          .slice(0, 5)
          .map((loc) => {
            const t = locationTypeOf(loc.location_type);
            return `<a class="home-map-item" href="map.html?location=${encodeURIComponent(loc.id)}">
              <span class="li-icon" style="color:${t.color}">${icon(t.icon, { size: 15 })}</span>
              <span style="min-width:0;flex:1"><b>${esc(loc.name)}</b><small>${esc(t.label)}</small></span>
              ${icon('chevron-right', { size: 14 })}
            </a>`;
          })
          .join('')
      : `<p class="micro dim">No campus locations have been published yet.</p>`;
  }

  const legendHost = $('#home-map-legend');
  if (legendHost) {
    const types = [...new Set(mapped.map((loc) => loc.location_type).filter(Boolean))].slice(0, 5);
    legendHost.innerHTML = types
      .map((type) => {
        const t = locationTypeOf(type);
        return `<span><i style="background:${t.color}"></i>${esc(t.label)}</span>`;
      })
      .join('');
  }

  // featured events
  const featuredHost = $('#featured-events');
  const featured = store.featuredEvents();
  const pick = (featured.length ? featured : events).slice(0, 3);
  if (featuredHost) {
    featuredHost.innerHTML = pick.length
      ? pick.map(eventCard).join('')
      : emptyState({
          iconName: 'calendar',
          title: 'No events published yet',
          text: 'The schedule is still being finalised. Check back soon or look for announcements.',
          action: '<a class="btn btn-sm btn-outline" href="announcements.html">Read announcements</a>',
        });
  }

  // vendors
  const vendorHost = $('#featured-vendors');
  if (vendorHost) {
    const picks = (vendors.length ? vendors : s.vendors).slice(0, 3);
    vendorHost.innerHTML = picks.length
      ? picks.map(vendorCard).join('')
      : emptyState({
          iconName: 'store',
          title: 'No approved stalls yet',
          text: 'Vendor listings appear here once organisers approve them.',
        });
  }

  // announcements
  const annHost = $('#home-announcements');
  if (annHost) {
    annHost.innerHTML = announcements.length
      ? announcements.slice(0, 3).map(announcementCard).join('')
      : emptyState({
          iconName: 'megaphone',
          title: 'No announcements yet',
          text: 'Urgent notices and schedule changes will appear here.',
        });
  }

  // facts
  const facts = $('#festival-facts');
  if (facts) {
    const locCount = s.locations.length;
    facts.innerHTML = [
      { icon: 'calendar', label: 'Festival dates', value: festivalRange() },
      { icon: 'map-pin', label: 'Campus', value: 'Aditya University' },
      { icon: 'ticket', label: 'Entry', value: 'Check organiser pass info' },
      { icon: 'store', label: 'On ground', value: `${locCount} locations mapped` },
    ]
      .map(
        (f) => `<div class="info-tile">
          <div class="meta-row" style="margin-bottom:6px">${icon(f.icon, { size: 14 })}<span>${esc(f.label)}</span></div>
          <b>${esc(f.value)}</b>
        </div>`
      )
      .join('');
  }

  // sponsors
  const sponsors = store.activeSponsorships('home_strip');
  const sponsorHost = $('#sponsor-strip-host');
  if (sponsorHost) {
    sponsorHost.innerHTML = sponsors.length
      ? `<p class="micro dim" style="margin-bottom:8px">Supported by</p>
         <div class="sponsor-strip">${sponsors
           .map(
             (sp) => `<span class="sponsor-pill">${sp.logo_url ? `<img src="${esc(sp.logo_url)}" alt="">` : icon('sparkles', { size: 14 })}${esc(sp.sponsor_name)}</span>`
           )
           .join('')}</div>
         <p class="micro dim" style="margin-top:8px">Paid placements are labelled and managed by the organisers.</p>`
      : `<p class="micro dim">Sponsor placements appear here when campaigns are active.</p>`;
  }

  mountSyncBar($('#home-status'));
  mountCountdown($('#countdown-host'), {
    onPhase: (p) => {
      const label = $('#countdown-label');
      if (!label) return;
      label.textContent =
        p === 'live' ? 'Happening now — enjoy the fest' : p === 'ended' ? 'Festival window ended' : p === 'unknown' ? 'Countdown' : 'Festival begins in';
    },
  });
}

async function boot() {
  mountChrome();
  document.querySelector('.hero')?.insertAdjacentHTML('afterbegin', waveArt());
  mountIcons();
  mountInstallButtons();

  await store.init();
  mountChrome();
  render();

  wireBookmarks(document);
  wireDataDownload(document.querySelector('[data-download-data]'));
  registerServiceWorker();
}

boot();
