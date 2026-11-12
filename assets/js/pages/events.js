import store from '../store.js';
import {
  mountChrome,
  mountSyncBar,
  eventCard,
  scheduleRow,
  emptyState,
  wireBookmarks,
  wireDataDownload,
  categoryOf,
} from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, debounce, param, uniqueDays, groupBy, formatDay, sortByDate } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const filters = {
  q: param('q'),
  day: param('day'),
  cat: param('cat'),
  venue: param('venue'),
  saved: param('saved') === '1',
  view: param('view') === 'grid' ? 'grid' : 'schedule',
};

let allEvents = [];

function syncUrl() {
  const url = new URL(location.href);
  const map = { q: filters.q, day: filters.day, cat: filters.cat, venue: filters.venue, view: filters.view === 'grid' ? 'grid' : '' };
  for (const [k, v] of Object.entries(map)) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  if (filters.saved) url.searchParams.set('saved', '1');
  else url.searchParams.delete('saved');
  history.replaceState(null, '', url);
}

function buildControls() {
  const days = uniqueDays(allEvents);
  const daySel = $('#day-filter');
  daySel.innerHTML = `<option value="">All days</option>${days
    .map((d) => `<option value="${esc(d)}">${esc(formatDay(d))}</option>`)
    .join('')}`;
  daySel.value = filters.day;

  const venues = [...groupBy(allEvents, (e) => store.locationOf(e)?.name || 'TBA').keys()].sort();
  const venueSel = $('#venue-filter');
  venueSel.innerHTML = `<option value="">All venues</option>${venues
    .map((v) => `<option value="${esc(v)}">${esc(v)}</option>`)
    .join('')}`;
  venueSel.value = filters.venue;

  const cats = [...new Set(allEvents.map((e) => e.category).filter(Boolean))].sort();
  const chips = $('#category-chips');
  chips.innerHTML = [`<button class="chip" data-cat="" aria-pressed="${!filters.cat}">All categories</button>`]
    .concat(
      cats.map((c) => {
        const cat = categoryOf(c);
        return `<button class="chip" data-cat="${esc(c)}" aria-pressed="${filters.cat === c}">${icon(cat.icon, { size: 14 })} ${esc(cat.label)}</button>`;
      })
    )
    .join('');

  $('#saved-toggle').setAttribute('aria-pressed', String(filters.saved));
  $('#event-search').value = filters.q;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === filters.view)));
}

function applyFilters() {
  const q = filters.q.trim().toLowerCase();
  return sortByDate(
    allEvents.filter((ev) => {
      if (filters.day && ev.event_date !== filters.day) return false;
      if (filters.cat && ev.category !== filters.cat) return false;
      if (filters.venue && (store.locationOf(ev)?.name || 'TBA') !== filters.venue) return false;
      if (filters.saved && !store.isBookmarked(ev.id)) return false;
      if (q) {
        const loc = store.locationOf(ev);
        const haystack = `${ev.title} ${ev.description || ''} ${ev.category || ''} ${loc?.name || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
  );
}

function render() {
  const host = $('#events-results');
  const count = $('#results-count');
  const rows = applyFilters();
  const days = uniqueDays(rows);

  count.textContent = rows.length
    ? `${rows.length} event${rows.length === 1 ? '' : 's'} · ${days.length} day${days.length === 1 ? '' : 's'}`
    : 'No matching events';

  if (!allEvents.length) {
    host.innerHTML = emptyState({
      iconName: 'calendar',
      title: 'The schedule is not published yet',
      text: 'Organisers have not published events. Announcements will confirm when the schedule goes live.',
      action: '<a class="btn btn-sm btn-outline" href="announcements.html">Read announcements</a>',
    });
    return;
  }

  if (!rows.length) {
    host.innerHTML = emptyState({
      iconName: 'search',
      title: 'Nothing matches those filters',
      text: filters.saved
        ? 'You have not saved any events yet. Tap the bookmark icon on an event card to keep it on this device.'
        : 'Try a different day, category or search term.',
      action: '<button class="btn btn-sm btn-outline" data-clear>Clear filters</button>',
    });
    host.querySelector('[data-clear]')?.addEventListener('click', clearFilters);
    return;
  }

  if (filters.view === 'grid') {
    host.innerHTML = `<div class="grid grid-3">${rows.map(eventCard).join('')}</div>`;
    return;
  }

  const grouped = groupBy(rows, (e) => e.event_date || 'TBA');
  host.innerHTML = [...grouped.entries()]
    .map(([day, list]) => {
      const weekday = day !== 'TBA' ? new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' }) : '';
      return `<section class="day-block" aria-label="${esc(weekday || day)}">
        <div class="day-head">
          <div class="day-badge">
            <b>${esc(day !== 'TBA' ? day.slice(8) : '--')}</b>
            <span>${esc(day !== 'TBA' ? new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' }) : 'TBA')}</span>
          </div>
          <div>
            <h2>${esc(weekday || 'Date to be announced')}</h2>
            <small>${esc(formatDay(day))} · ${list.length} event${list.length === 1 ? '' : 's'}</small>
          </div>
        </div>
        <div class="schedule-list">${list.map(scheduleRow).join('')}</div>
      </section>`;
    })
    .join('');
}

function clearFilters() {
  Object.assign(filters, { q: '', day: '', cat: '', venue: '', saved: false });
  buildControls();
  syncUrl();
  render();
}

function bind() {
  $('#event-search').addEventListener(
    'input',
    debounce((e) => {
      filters.q = e.target.value;
      syncUrl();
      render();
    }, 180)
  );

  $('#day-filter').addEventListener('change', (e) => {
    filters.day = e.target.value;
    syncUrl();
    render();
  });

  $('#venue-filter').addEventListener('change', (e) => {
    filters.venue = e.target.value;
    syncUrl();
    render();
  });

  $('#category-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    filters.cat = chip.dataset.cat;
    document.querySelectorAll('#category-chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    syncUrl();
    render();
  });

  $('#saved-toggle').addEventListener('click', (e) => {
    filters.saved = !filters.saved;
    e.currentTarget.setAttribute('aria-pressed', String(filters.saved));
    syncUrl();
    render();
  });

  document.querySelectorAll('[data-view]').forEach((btn) =>
    btn.addEventListener('click', () => {
      filters.view = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      syncUrl();
      render();
    })
  );

  store.subscribe((type) => {
    if (type === 'bookmarks' && filters.saved) render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $('#event-search')) {
      e.preventDefault();
      $('#event-search').focus();
    }
  });
}

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();

  mountChrome();
  allEvents = store.publishedEvents();
  buildControls();
  bind();
  render();
  mountSyncBar($('#events-status'));

  wireBookmarks(document);
  wireDataDownload(document.querySelector('[data-download-data]'));
  document.querySelectorAll('[data-icon]').forEach(() => mountIcons());
  mountIcons();
}

boot();
