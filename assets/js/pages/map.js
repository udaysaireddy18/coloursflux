import store from '../store.js';
import { mountChrome, mountSyncBar, emptyState, mapPlate, locationTypeOf } from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, param, debounce } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const typeOf = locationTypeOf;

const filters = { q: '', type: '', selected: param('location') };
let locations = [];

function visible() {
  const q = filters.q.trim().toLowerCase();
  return locations.filter((loc) => {
    if (filters.type && loc.location_type !== filters.type) return false;
    if (q && !`${loc.name} ${loc.description || ''} ${loc.location_type || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function markers(rows) {
  return rows
    .filter((loc) => loc.map_x != null && loc.map_y != null)
    .map((loc) => {
      const t = typeOf(loc.location_type);
      return `<button class="map-marker ${loc.id === filters.selected ? 'is-active' : ''}"
        style="left:${Number(loc.map_x)}%;top:${Number(loc.map_y)}%;--mc:${t.color}"
        data-loc="${esc(loc.id)}"
        aria-label="${esc(loc.name)} — show details"
        aria-pressed="${loc.id === filters.selected}">
        <span class="pin">${icon(t.icon, { size: 15 })}</span>
        <span class="pin-label">${esc(loc.name)}</span>
      </button>`;
    })
    .join('');
}

function list(rows) {
  if (!rows.length) {
    return emptyState({ iconName: 'search', title: 'No locations match', text: 'Try a different search term or reset the filters.' });
  }
  return rows
    .map((loc) => {
      const t = typeOf(loc.location_type);
      const eventCount = store.publishedEvents().filter((e) => e.location_id === loc.id).length;
      return `<button class="location-item ${loc.id === filters.selected ? 'is-active' : ''}" data-loc="${esc(loc.id)}">
        <span class="li-icon" style="color:${t.color}">${icon(t.icon, { size: 16 })}</span>
        <span style="min-width:0;flex:1">
          <b>${esc(loc.name)}</b>
          <small>${esc(t.label)}${eventCount ? ` · ${eventCount} event${eventCount === 1 ? '' : 's'}` : ''}</small>
        </span>
        ${icon('chevron-right', { size: 14 })}
      </button>`;
    })
    .join('');
}

function detail(loc) {
  const host = $('#location-detail');
  if (!loc) {
    host.innerHTML = `<p class="small muted">Select a location to see its details.</p>`;
    return;
  }
  const t = typeOf(loc.location_type);
  const hasCoords = loc.latitude != null && loc.longitude != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
    : null;
  const events = store.publishedEvents().filter((e) => e.location_id === loc.id).slice(0, 3);

  host.innerHTML = `
    <div class="cluster" style="justify-content:space-between;margin-bottom:10px">
      <span class="badge" style="color:${t.color};border-color:${t.color}55">${icon(t.icon, { size: 12 })} ${esc(t.label)}</span>
      <span class="badge badge-neutral">${loc.map_x != null ? 'On map' : 'Directory only'}</span>
    </div>
    <h2 style="font-size:1.2rem">${esc(loc.name)}</h2>
    <p class="small" style="margin-top:6px">${esc(loc.description || 'No description provided by the organiser.')}</p>
    ${events.length ? `<div class="divider" style="margin:14px 0"></div>
      <p class="micro dim" style="margin-bottom:8px">EVENTS AT THIS VENUE</p>
      <div class="stack" style="--gap:6px">${events
        .map(
          (e) => `<a class="meta-row" href="event.html?slug=${encodeURIComponent(e.slug || e.id)}">${icon('calendar', { size: 13 })}<span>${esc(e.title)}</span></a>`
        )
        .join('')}</div>` : ''}
    <div class="divider" style="margin:14px 0"></div>
    <div class="stack" style="--gap:8px">
      <button class="btn btn-sm btn-outline btn-block" data-focus-loc="${esc(loc.id)}">${icon('map', { size: 15 })} Show on map</button>
      ${mapsUrl
        ? `<a class="btn btn-sm btn-ghost btn-block" href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer">${icon('navigation', { size: 15 })} Open in maps</a>`
        : `<p class="micro dim">No verified coordinates for this location, so directions are not available. Ask at the registration desk.</p>`}
    </div>`;

  host.querySelector('[data-focus-loc]')?.addEventListener('click', () => {
    document.querySelector(`.map-marker[data-loc="${CSS.escape(loc.id)}"]`)?.focus();
  });
  mountIcons(host);
}

function render() {
  const rows = visible();
  $('#map-markers').innerHTML = markers(rows);
  $('#location-list').innerHTML = list(rows);
  const selected = locations.find((l) => l.id === filters.selected) || null;
  detail(selected);

  document.querySelectorAll('[data-loc]').forEach((node) => {
    node.addEventListener('click', () => {
      filters.selected = node.dataset.loc;
      const url = new URL(location.href);
      url.searchParams.set('location', filters.selected);
      history.replaceState(null, '', url);
      render();
      document.querySelector(`.map-marker[data-loc="${CSS.escape(filters.selected)}"]`)?.focus();
    });
  });
}

function buildTypeChips() {
  const types = [...new Set(locations.map((l) => l.location_type).filter(Boolean))];
  const host = $('#type-chips');
  host.innerHTML = [`<button class="chip" data-type="" aria-pressed="${!filters.type}">All locations</button>`]
    .concat(
      types.sort().map((t) => {
        const cfg = typeOf(t);
        return `<button class="chip" data-type="${esc(t)}" aria-pressed="${filters.type === t}">${icon(cfg.icon, { size: 14 })} ${esc(cfg.label)}</button>`;
      })
    )
    .join('');
  host.querySelectorAll('[data-type]').forEach((chip) =>
    chip.addEventListener('click', () => {
      filters.type = chip.dataset.type;
      host.querySelectorAll('[data-type]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      filters.selected = '';
      render();
    })
  );
}

async function boot() {
  mountChrome();
  mountIcons();
  $('#map-art').innerHTML = mapPlate();
  await store.init();
  mountChrome();

  locations = store.state.locations;
  mountSyncBar($('#map-status'));

  if (!locations.length) {
    $('#map-markers').innerHTML = '';
    $('#location-list').innerHTML = emptyState({
      iconName: 'map',
      title: 'Campus map not published',
      text: 'Organisers have not published any locations yet. The map becomes available once locations are added in the dashboard.',
    });
    document.querySelector('#location-detail').innerHTML =
      '<p class="small muted">No location selected.</p>';
    return;
  }

  buildTypeChips();
  render();

  $('#location-search').addEventListener(
    'input',
    debounce((e) => {
      filters.q = e.target.value;
      filters.selected = '';
      render();
    }, 160)
  );

  $('#reset-location').addEventListener('click', () => {
    Object.assign(filters, { q: '', type: '', selected: '' });
    $('#location-search').value = '';
    $('#type-chips').querySelectorAll('[data-type]').forEach((c, i) => c.setAttribute('aria-pressed', String(i === 0)));
    history.replaceState(null, '', location.pathname);
    render();
  });
}

boot();
