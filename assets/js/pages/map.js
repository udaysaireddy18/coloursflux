import store from '../store.js';
import { mountChrome, mountSyncBar, emptyState, mapPlate, locationTypeOf } from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, param, debounce } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const typeOf = locationTypeOf;

const filters = { q: '', type: '', selected: param('location') };
let locations = [];

/* ---------------------------------------------------------------- */
/* Pan / zoom view                                                   */
/* ---------------------------------------------------------------- */

const MIN_SCALE = 1;
const MAX_SCALE = 2.8;

const view = { scale: 1, x: 0, y: 0 };
let viewTimer = 0;

const boardEl = () => $('#map-board');
const canvasEl = () => $('#map-canvas');

function hideHint() {
  $('#map-hint')?.classList.add('is-hidden');
}

function clampView() {
  const board = boardEl();
  if (!board) return;
  const { width, height } = board.getBoundingClientRect();
  view.x = Math.min(0, Math.max(width - width * view.scale, view.x));
  view.y = Math.min(0, Math.max(height - height * view.scale, view.y));
}

function applyView() {
  const canvas = canvasEl();
  const board = boardEl();
  if (!canvas || !board) return;
  canvas.style.transform = `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`;
  canvas.style.setProperty('--mz', view.scale.toFixed(3));
  const scale = $('#map-scale');
  if (scale) scale.textContent = `${Math.round(view.scale * 100)}%`;
}

function animateView() {
  const canvas = canvasEl();
  if (!canvas) return;
  canvas.classList.add('is-easing');
  clearTimeout(viewTimer);
  viewTimer = window.setTimeout(() => canvas.classList.remove('is-easing'), 300);
}

function zoomAt(factor, clientX, clientY) {
  const board = boardEl();
  if (!board) return;
  const rect = board.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
  if (Math.abs(next - view.scale) < 0.001) return;
  const wx = (px - view.x) / view.scale;
  const wy = (py - view.y) / view.scale;
  view.scale = next;
  view.x = px - wx * next;
  view.y = py - wy * next;
  clampView();
  animateView();
  applyView();
  hideHint();
}

function zoomTo(next) {
  const board = boardEl();
  if (!board) return;
  const rect = board.getBoundingClientRect();
  zoomAt(next / view.scale, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function resetView() {
  Object.assign(view, { scale: 1, x: 0, y: 0 });
  animateView();
  applyView();
}

function centerOn(id) {
  const board = boardEl();
  const loc = locations.find((l) => l.id === id);
  if (!board || !loc || loc.map_x == null || loc.map_y == null) return;
  const rect = board.getBoundingClientRect();
  const scale = Math.max(view.scale, 1.55);
  const wx = (rect.width * Number(loc.map_x)) / 100;
  const wy = (rect.height * Number(loc.map_y)) / 100;
  view.scale = scale;
  view.x = rect.width / 2 - wx * scale;
  view.y = rect.height / 2 - wy * scale + 14;
  clampView();
  animateView();
  applyView();
  hideHint();
}

function focusLocation(id) {
  const marker = document.querySelector(`.map-marker[data-loc="${CSS.escape(id)}"]`);
  if (!marker) return;
  centerOn(id);
  marker.focus({ preventScroll: true });
}

function buildKey() {
  const host = $('#map-key');
  if (!host) return;
  const types = [...new Set(locations.map((l) => l.location_type).filter(Boolean))].sort();
  host.innerHTML = types
    .map((type) => {
      const t = typeOf(type);
      return `<span style="--kc:${t.color}"><i aria-hidden="true"></i>${esc(t.label)}</span>`;
    })
    .join('');
}

function wireView() {
  const board = boardEl();
  if (!board) return;

  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let moved = false;

  const suppressClick = (e) => {
    if (!moved) return;
    moved = false;
    e.stopPropagation();
    e.preventDefault();
  };
  board.addEventListener('click', suppressClick, true);

  board.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;

    if (pointers.size === 1) {
      pinch = null;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx: view.x, ty: view.y, captured: false };
    } else if (pointers.size === 2) {
      drag = null;
      for (const id of pointers.keys()) {
        try { board.setPointerCapture(id); } catch { /* pointer already gone */ }
      }
      const [a, b] = [...pointers.values()];
      const rect = board.getBoundingClientRect();
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      pinch = {
        dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        scale: view.scale,
        worldX: (midX - view.x) / view.scale,
        worldY: (midY - view.y) / view.scale,
      };
    }
  });

  board.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const rect = board.getBoundingClientRect();
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist;
      view.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.scale * factor));
      view.x = midX - pinch.worldX * view.scale;
      view.y = midY - pinch.worldY * view.scale;
      moved = true;
      clampView();
      applyView();
      hideHint();
      return;
    }

    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!moved && !drag.captured) {
      try { board.setPointerCapture(e.pointerId); } catch { /* keep dragging without capture */ }
      drag.captured = true;
    }
    moved = true;
    view.x = drag.tx + dx;
    view.y = drag.ty + dy;
    clampView();
    applyView();
    hideHint();
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (drag && drag.id === e.pointerId) drag = null;
    if (pointers.size < 2) pinch = null;
    if (moved) window.setTimeout(() => { moved = false; }, 0);
  };
  board.addEventListener('pointerup', endPointer);
  board.addEventListener('pointercancel', endPointer);

  board.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY);
    },
    { passive: false }
  );

  board.addEventListener('dblclick', (e) => {
    e.preventDefault();
    zoomAt(1.6, e.clientX, e.clientY);
  });

  board.addEventListener('keydown', (e) => {
    const step = 52;
    if (e.key === 'ArrowLeft') view.x += step;
    else if (e.key === 'ArrowRight') view.x -= step;
    else if (e.key === 'ArrowUp') view.y += step;
    else if (e.key === 'ArrowDown') view.y -= step;
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); return zoomTo(view.scale * 1.3); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); return zoomTo(view.scale / 1.3); }
    else if (e.key === '0') { e.preventDefault(); return resetView(); }
    else return;
    e.preventDefault();
    clampView();
    applyView();
    hideHint();
  });

  document.querySelectorAll('[data-map-action]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const action = btn.dataset.mapAction;
      if (action === 'zoom-in') zoomTo(view.scale * 1.35);
      else if (action === 'zoom-out') zoomTo(view.scale / 1.35);
      else if (action === 'reset') resetView();
      else if (action === 'fullscreen') toggleFullscreen();
    })
  );

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      clampView();
      applyView();
    }).observe(board);
  }
}

function toggleFullscreen() {
  const frame = $('#map-frame');
  if (!frame) return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    frame.requestFullscreen?.().catch(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  const frame = $('#map-frame');
  const btn = document.querySelector('[data-map-action="fullscreen"]');
  const on = Boolean(frame && document.fullscreenElement === frame);
  if (btn) {
    btn.innerHTML = icon(on ? 'minimize' : 'maximize', { size: 15 });
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Exit fullscreen' : 'Fullscreen';
    btn.setAttribute('aria-label', on ? 'Exit fullscreen map' : 'Toggle fullscreen map');
  }
  window.requestAnimationFrame(() => {
    clampView();
    applyView();
  });
});

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
    focusLocation(loc.id);
  });
  mountIcons(host);
}

function render() {
  const rows = visible();
  $('#map-markers').innerHTML = markers(rows);
  $('#location-list').innerHTML = list(rows);
  const mapped = rows.filter((loc) => loc.map_x != null && loc.map_y != null).length;
  const count = $('#map-count');
  if (count) {
    count.textContent =
      mapped === locations.length
        ? `${mapped} mapped locations`
        : `${mapped} of ${locations.length} locations shown`;
  }
  const selected = locations.find((l) => l.id === filters.selected) || null;
  detail(selected);

  document.querySelectorAll('[data-loc]').forEach((node) => {
    node.addEventListener('click', () => {
      filters.selected = node.dataset.loc;
      const url = new URL(location.href);
      url.searchParams.set('location', filters.selected);
      history.replaceState(null, '', url);
      render();
      focusLocation(filters.selected);
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
  wireView();
  applyView();
  await store.init();
  mountChrome();

  locations = store.state.locations;
  mountSyncBar($('#map-status'));

  if (!locations.length) {
    $('#map-markers').innerHTML = '';
    const count = $('#map-count');
    if (count) count.textContent = 'No locations published yet';
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
  buildKey();
  render();
  if (filters.selected) window.requestAnimationFrame(() => centerOn(filters.selected));

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
