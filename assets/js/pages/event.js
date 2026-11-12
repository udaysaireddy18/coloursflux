import store from '../store.js';
import {
  mountChrome,
  mountSyncBar,
  eventCard,
  emptyState,
  wireBookmarks,
  categoryOf,
  imgTag,
  phaseBadge,
  eventPhase,
  toast,
} from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, param, formatDay, formatTimeRange, slugify } from '../util.js';

const $ = (sel) => document.querySelector(sel);

let current = null;

function findEvent() {
  const key = param('slug') || param('id');
  if (!key) return null;
  return (
    store.publishedEvents().find((e) => e.slug === key || e.id === key) ||
    store.state.events.find((e) => e.id === key) ||
    null
  );
}

function icsFor(ev) {
  const date = (ev.event_date || '').replace(/-/g, '');
  const start = (ev.start_time || '09:00:00').replace(/:/g, '').slice(0, 6);
  const end = (ev.end_time || ev.start_time || '10:00:00').replace(/:/g, '').slice(0, 6);
  const loc = store.locationOf(ev);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ColoursFlux//Festival//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@coloursflux`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${date}T${start}`,
    `DTEND:${date}T${end}`,
    `SUMMARY:${(ev.title || '').replace(/[,;\\]/g, ' ')}`,
    `LOCATION:${(loc?.name || 'Aditya University').replace(/[,;\\]/g, ' ')}`,
    `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n').replace(/[,;\\]/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

function downloadIcs(ev) {
  const url = URL.createObjectURL(icsFor(ev));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(ev.title) || 'colours-event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Calendar file downloaded.', { type: 'success' });
}

async function share(ev) {
  const url = location.href;
  const data = { title: ev.title, text: `${ev.title} — ${formatDay(ev.event_date)}`, url };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch {
      /* user cancelled — fall through to clipboard */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied to clipboard.', { type: 'success' });
  } catch {
    toast('Copy this page address from your browser bar to share.', { type: 'info' });
  }
}

function renderNotFound() {
  document.title = 'Event not found · ColoursFlux';
  $('#event-root').innerHTML = emptyState({
    iconName: 'calendar',
    title: 'Event not found',
    text: 'This event may have been unpublished, renamed, or the link is incomplete. Saved offline data may be out of date.',
    action: '<a class="btn btn-sm btn-outline" href="events.html">Back to the schedule</a>',
    headingLevel: 1,
  });
}

function render(ev) {
  current = ev;
  const cat = categoryOf(ev.category);
  const loc = store.locationOf(ev);
  const saved = store.isBookmarked(ev.id);
  const isCancelled = ev.status === 'cancelled';
  const mapsUrl =
    loc && loc.latitude != null && loc.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
      : null;

  document.title = `${ev.title} · ColoursFlux`;
  $('#crumb-current').textContent = ev.title;

  const related = store
    .publishedEvents()
    .filter((other) => other.id !== ev.id && (other.category === ev.category || other.location_id === ev.location_id))
    .slice(0, 3);

  $('#event-root').innerHTML = `
    <div class="detail-layout">
      <article>
        <div class="detail-hero">
          ${imgTag(ev.image_url, `${ev.title} artwork`, { eager: true })}
          <div class="hero-tags">
            <span class="badge" style="color:${cat.color};border-color:${cat.color}55;background:rgba(8,11,26,.7)">${icon(cat.icon, { size: 12 })} ${esc(cat.label)}</span>
            ${ev.featured ? `<span class="badge badge-magenta">${icon('star', { size: 12 })} Featured</span>` : ''}
            ${phaseBadge(ev)}
          </div>
        </div>

        <h1 class="detail-title">${esc(ev.title)}</h1>

        ${isCancelled
          ? `<div class="cancelled-banner" style="margin-top:16px">${icon('alert-triangle', { size: 18 })}
              <div><b>This event has been cancelled.</b><br />The organiser has marked it cancelled. Check Announcements for any replacement or refund information.</div>
            </div>`
          : ''}

        <p class="detail-desc">${esc(ev.description || 'Full description will be published by the organisers.')}</p>

        <div class="detail-facts">
          <div class="fact">${icon('calendar', { size: 18 })}
            <div><b>${esc(formatDay(ev.event_date, { long: true }))}</b><small>Festival day</small></div>
          </div>
          <div class="fact">${icon('clock', { size: 18 })}
            <div><b>${esc(formatTimeRange(ev.start_time, ev.end_time) || 'Time to be announced')}</b><small>Local campus time</small></div>
          </div>
          <div class="fact">${icon('map-pin', { size: 18 })}
            <div><b>${esc(loc?.name || 'Venue to be announced')}</b><small>${esc(loc?.description || 'Campus venue')}</small></div>
          </div>
        </div>

        <div class="cluster" style="margin-top:22px">
          <button class="btn btn-primary" data-save-event aria-pressed="${saved}">
            ${icon('bookmark', { size: 16 })} <span>${saved ? 'Saved on this device' : 'Save this event'}</span>
          </button>
          <button class="btn" data-calendar>${icon('calendar', { size: 16 })} Add to calendar</button>
          <button class="btn btn-ghost" data-share>${icon('share', { size: 16 })} Share</button>
        </div>

        <div class="pill-note" style="margin-top:20px">
          ${icon('info', { size: 16 })}
          <span>Timings are set by the festival organisers and can change on the day. This page works offline once loaded, but new changes need a connection.</span>
        </div>
      </article>

      <aside class="card side-card">
        <h3>Venue</h3>
        <div class="stack" style="--gap:10px">
          <div class="meta-row" style="align-items:flex-start">${icon('map-pin', { size: 16 })}<span style="white-space:normal">${esc(loc?.name || 'Venue to be announced')}</span></div>
          ${loc ? `<a class="btn btn-sm btn-outline btn-block" href="map.html?location=${encodeURIComponent(loc.id)}">${icon('map', { size: 15 })} Open campus map</a>` : ''}
          ${mapsUrl ? `<a class="btn btn-sm btn-ghost btn-block" href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer">${icon('navigation', { size: 15 })} Open in maps</a>` : `<p class="micro dim">Directions appear once the organiser adds verified map coordinates for this venue.</p>`}
        </div>
        <div class="divider"></div>
        <h3>Status</h3>
        <div class="stack" style="--gap:8px">
          <span class="badge ${isCancelled ? 'badge-red' : ev.featured ? 'badge-magenta' : 'badge-neutral'}">${isCancelled ? 'Cancelled' : ev.featured ? 'Featured event' : 'Scheduled'}</span>
          <p class="micro dim">Data shown from ${store.state.source === 'live' ? 'the live festival database' : store.state.source === 'cache' ? 'this device’s offline copy' : 'labelled sample records'}.</p>
        </div>
        <div class="divider"></div>
        <a class="btn btn-sm btn-ghost btn-block" href="events.html">${icon('arrow-left', { size: 15 })} All events</a>
      </aside>
    </div>

    ${related.length ? `<section style="margin-top:44px">
      <div class="section-head"><div><span class="eyebrow">More like this</span><h2 style="margin-top:10px;font-size:1.4rem">Related events</h2></div></div>
      <div class="grid grid-3">${related.map(eventCard).join('')}</div>
    </section>` : ''}
  `;

  const saveBtn = document.querySelector('[data-save-event]');
  saveBtn?.addEventListener('click', () => {
    const next = store.toggleBookmark(ev.id);
    saveBtn.setAttribute('aria-pressed', String(next));
    saveBtn.querySelector('span').textContent = next ? 'Saved on this device' : 'Save this event';
    toast(next ? 'Event saved to this device.' : 'Event removed from saved events.', { type: next ? 'success' : 'info' });
  });

  document.querySelector('[data-calendar]')?.addEventListener('click', () => downloadIcs(ev));
  document.querySelector('[data-share]')?.addEventListener('click', () => share(ev));
  mountIcons($('#event-root'));
}

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();
  mountChrome();

  const ev = findEvent();
  if (!ev) {
    renderNotFound();
  } else {
    render(ev);
    const phase = eventPhase(ev);
    if (phase === 'cancelled') {
      $('#event-status').innerHTML = `<div class="sync-bar" data-tone="error">${icon('alert-triangle', { size: 16 })}<span>This event is cancelled. Details are kept online for reference.</span></div>`;
    } else {
      mountSyncBar($('#event-status'));
    }
  }

  wireBookmarks(document);
  document.querySelectorAll('[data-icon]').forEach(() => mountIcons());
  mountIcons();
}

boot();
