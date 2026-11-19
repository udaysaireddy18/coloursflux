import store from '../store.js';
import { mountChrome, mountSyncBar, emptyState, mapPlate, locationTypeOf } from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, param, debounce } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const typeOf = locationTypeOf;

const filters = { q: '', type: '', selected: param('location') };
const directions = { from: param('from'), to: param('to'), route: null };
const requestedView = param('view') === 'live' ? 'live' : 'plate';
let locations = [];

/* ---------------------------------------------------------------- */
/* Real-world coordinates                                             */
/*                                                                   */
/* The published campus plate has no GPS data, so real-world points    */
/* are derived from the illustrated campus anchor. They are useful for */
/* orientation, not survey-grade placement.                            */
/* ---------------------------------------------------------------- */

const CAMPUS_CENTRE = { lat: 17.0893372, lng: 82.0670772 };
const CAMPUS_HALF_SPAN = { lat: 0.0044, lng: 0.0048 };

function geoFromPercent(x, y) {
  return [
    +(CAMPUS_CENTRE.lat + ((50 - Number(y)) / 50) * CAMPUS_HALF_SPAN.lat).toFixed(6),
    +(CAMPUS_CENTRE.lng + ((Number(x) - 50) / 50) * CAMPUS_HALF_SPAN.lng).toFixed(6),
  ];
}

function geoForLocation(loc) {
  return loc.map_x == null || loc.map_y == null ? null : geoFromPercent(loc.map_x, loc.map_y);
}

/* ---------------------------------------------------------------- */
/* In-campus waypoint graph                                           */
/*                                                                   */
/* These are the main walking junctions on the official campus plate. */
/* Every mapped place is attached to its nearest junction, then the   */
/* shortest path across the junction graph becomes the route.         */
/* ---------------------------------------------------------------- */

const WAYPOINTS = [
  { id: 'west', name: 'the west gate near Parking', x: 13, y: 38 },
  { id: 'nwest', name: 'the west end of the bhavan row', x: 20, y: 24 },
  { id: 'nmid', name: 'the middle of the bhavan row', x: 48, y: 24 },
  { id: 'neast', name: 'the east end of the bhavan row', x: 80, y: 24 },
  { id: 'centre', name: 'the Water Pond junction', x: 44, y: 50 },
  { id: 'east', name: 'the Guest House side', x: 84, y: 44 },
  { id: 'bus', name: 'the Bus Ground junction', x: 67, y: 62 },
  { id: 'smid', name: 'the Abdul Kalam Bhavan junction', x: 44, y: 70 },
  { id: 'swest', name: 'the college block row', x: 29, y: 81 },
  { id: 'seast', name: 'the BPD Ground side', x: 67, y: 82 },
];

const NODE_BY_ID = Object.fromEntries(WAYPOINTS.map((n) => [n.id, n]));

const LINKS = [
  ['nwest', 'nmid', 'the bhavan row road'],
  ['nmid', 'neast', 'the bhavan row road past Visweswaraya Bhavan'],
  ['nwest', 'west', 'the west gate road'],
  ['nmid', 'centre', 'the central path by KL Rao Ground'],
  ['neast', 'east', 'the east side road by the bhavan grounds'],
  ['west', 'centre', 'the road past the Incubator'],
  ['centre', 'east', 'the central road by the temples'],
  ['centre', 'bus', 'the road by the Bus Ground'],
  ['centre', 'smid', 'the central road beside the pond'],
  ['east', 'bus', 'the east road by the hostels'],
  ['bus', 'smid', 'the road by Abdul Kalam Bhavan'],
  ['bus', 'seast', 'the east road near the BPD Ground'],
  ['smid', 'swest', 'the college block row'],
  ['smid', 'seast', 'the college block row'],
  ['west', 'swest', 'the west road past the girls hostels'],
];

/* Explicit attachments keep well-known places on their natural road. */
const LOCATION_NODE = {
  'loc-rtb': 'nwest',
  'loc-cotton': 'nwest',
  'loc-klrao-bhavan': 'nwest',
  'loc-billgates': 'nmid',
  'loc-visweswaraya': 'nmid',
  'loc-cvraman-bhavan': 'neast',
  'loc-ramanujan': 'neast',
  'loc-newton': 'neast',
  'loc-ramanujan-ground': 'neast',
  'loc-cvraman-ground': 'neast',
  'loc-open-air-auditorium': 'centre',
  'loc-klrao-ground': 'centre',
  'loc-klrao-bhavan-ground': 'centre',
  'loc-fete': 'centre',
  'loc-mango-garden': 'centre',
  'loc-temples': 'centre',
  'loc-water-pond': 'centre',
  'loc-boys-hostel': 'east',
  'loc-guest-house': 'east',
  'loc-parking': 'west',
  'loc-girls-hostel': 'west',
  'loc-incubator': 'west',
  'loc-bus-ground': 'bus',
  'loc-pharmacy-college': 'swest',
  'loc-abdul-kalam': 'smid',
  'loc-degree-college': 'smid',
  'loc-acop': 'swest',
  'loc-polytechnic': 'swest',
  'loc-bpd-ground': 'seast',
};

function buildAdjacency() {
  const graph = Object.fromEntries(WAYPOINTS.map((n) => [n.id, []]));
  LINKS.forEach(([a, b, hint]) => {
    if (!graph[a] || !graph[b]) return;
    const weight = Math.hypot(NODE_BY_ID[a].x - NODE_BY_ID[b].x, NODE_BY_ID[a].y - NODE_BY_ID[b].y);
    graph[a].push({ id: b, weight, hint });
    graph[b].push({ id: a, weight, hint });
  });
  return graph;
}

const ADJACENCY = buildAdjacency();

function nodeFor(loc) {
  if (!loc || loc.map_x == null || loc.map_y == null) return null;
  const pinned = LOCATION_NODE[loc.id] && NODE_BY_ID[LOCATION_NODE[loc.id]];
  if (pinned) return pinned;
  let best = null;
  let bestDistance = Infinity;
  const x = Number(loc.map_x);
  const y = Number(loc.map_y);
  WAYPOINTS.forEach((node) => {
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  });
  return best;
}

function shortestNodePath(startId, endId) {
  if (startId === endId) return [startId];
  const distance = Object.fromEntries(WAYPOINTS.map((n) => [n.id, Infinity]));
  const previous = {};
  const visited = new Set();
  distance[startId] = 0;

  while (visited.size < WAYPOINTS.length) {
    let current = null;
    let best = Infinity;
    WAYPOINTS.forEach((node) => {
      if (!visited.has(node.id) && distance[node.id] < best) {
        best = distance[node.id];
        current = node.id;
      }
    });
    if (!current || current === endId) break;
    visited.add(current);
    ADJACENCY[current].forEach((edge) => {
      const candidate = distance[current] + edge.weight;
      if (candidate < distance[edge.id]) {
        distance[edge.id] = candidate;
        previous[edge.id] = current;
      }
    });
  }

  if (!Number.isFinite(distance[endId])) return null;
  const path = [endId];
  while (path[0] !== startId) {
    const parent = previous[path[0]];
    if (!parent) return null;
    path.unshift(parent);
  }
  return path;
}

function linkHint(aId, bId) {
  return (ADJACENCY[aId] || []).find((edge) => edge.id === bId)?.hint || '';
}

function compass(a, b) {
  const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return names[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}

function pointOfLocation(loc) {
  return { id: loc.id, name: loc.name, x: Number(loc.map_x), y: Number(loc.map_y), isPlace: true };
}

function pointOfNode(node) {
  return { id: node.id, name: node.name, x: node.x, y: node.y, isJunction: true };
}

function describeRoute(points, toName) {
  const steps = [`Start at ${points[0].name}.`];
  let previousDirection = '';

  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    const direction = compass(from, to);
    let step;

    if (i === 0) {
      const target = to.isJunction ? `toward ${to.name}` : `to ${to.name}`;
      step = `Head ${direction} ${target}.`;
    } else if (i === points.length - 2) {
      step = `${direction === previousDirection ? 'Continue' : 'Turn'} ${direction} to ${toName}.`;
    } else {
      const hint = linkHint(from.id, to.id);
      const lead = direction === previousDirection ? 'Continue' : `At ${from.name}, turn`;
      step = `${lead} ${direction} toward ${to.name}${hint ? ` via ${hint}` : ''}.`;
    }

    steps.push(step);
    previousDirection = direction;
  }

  steps.push(`Arrive at ${toName}.`);
  return steps;
}

function buildRoute(from, to) {
  const startNode = nodeFor(from);
  const endNode = nodeFor(to);
  if (!startNode || !endNode) return null;
  const nodePath = shortestNodePath(startNode.id, endNode.id);
  if (!nodePath) return null;

  const points =
    nodePath.length === 1
      ? [pointOfLocation(from), pointOfLocation(to)]
      : [pointOfLocation(from), ...nodePath.map((id) => pointOfNode(NODE_BY_ID[id])), pointOfLocation(to)];

  let metres = 0;
  points.slice(0, -1).forEach((point, i) => {
    const next = points[i + 1];
    metres += Math.hypot((next.x - point.x) * 7, (next.y - point.y) * 5);
  });

  return {
    from,
    to,
    points,
    steps: describeRoute(points, to.name),
    minutes: Math.max(1, Math.round(metres / 75)),
  };
}

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

function centerOnPoint(x, y, minimumScale = 1.7) {
  const board = boardEl();
  if (!board) return;
  const rect = board.getBoundingClientRect();
  view.scale = Math.max(view.scale, minimumScale);
  view.x = rect.width / 2 - (x / 100) * rect.width * view.scale;
  view.y = rect.height / 2 - (y / 100) * rect.height * view.scale;
  clampView();
  animateView();
  applyView();
  hideHint();
}

function fitRoute() {
  const route = directions.route;
  const board = boardEl();
  if (!route || !board) return;
  const xs = route.points.map((p) => p.x);
  const ys = route.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max((maxX - minX) / 100, 0.06);
  const spanY = Math.max((maxY - minY) / 100, 0.06);
  const rect = board.getBoundingClientRect();
  const scale = Math.min(MAX_SCALE, Math.max(1.15, Math.min(0.82 / spanX, 0.82 / spanY)));

  view.scale = scale;
  view.x = rect.width / 2 - ((minX + maxX) / 2 / 100) * rect.width * scale;
  view.y = rect.height / 2 - ((minY + maxY) / 2 / 100) * rect.height * scale;
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
  const route = directions.route;
  return rows
    .filter((loc) => loc.map_x != null && loc.map_y != null)
    .map((loc) => {
      const t = typeOf(loc.location_type);
      const routeClass = route
        ? loc.id === route.from.id || loc.id === route.to.id
          ? ' is-route-end'
          : ' is-route-dim'
        : '';
      return `<button class="map-marker ${loc.id === filters.selected ? 'is-active' : ''}${routeClass}"
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
      <button class="btn btn-sm btn-primary btn-block" data-dir-to="${esc(loc.id)}">${icon('navigation', { size: 15 })} Directions to here</button>
      <button class="btn btn-sm btn-ghost btn-block" data-dir-from="${esc(loc.id)}">${icon('map-pin', { size: 15 })} Start directions here</button>
      ${mapsUrl
        ? `<a class="btn btn-sm btn-ghost btn-block" href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer">${icon('external-link', { size: 15 })} Open in maps</a>`
        : ''}
    </div>`;

  host.querySelector('[data-focus-loc]')?.addEventListener('click', () => {
    focusLocation(loc.id);
  });
  host.querySelector('[data-dir-to]')?.addEventListener('click', () => setDirectionEndpoint('to', loc.id));
  host.querySelector('[data-dir-from]')?.addEventListener('click', () => setDirectionEndpoint('from', loc.id));
  mountIcons(host);
}

/* ---------------------------------------------------------------- */
/* Directions UI                                                      */
/* ---------------------------------------------------------------- */

function populateDirections() {
  const from = $('#dir-from');
  const to = $('#dir-to');
  if (!from || !to) return;

  const options = (placeholder) =>
    `<option value="">${placeholder}</option>` +
    locations
      .filter((loc) => loc.map_x != null && loc.map_y != null)
      .map((loc) => `<option value="${esc(loc.id)}">${esc(loc.name)}</option>`)
      .join('');

  from.innerHTML = options('Choose your starting point');
  to.innerHTML = options('Choose your destination');
  if (directions.from && !locations.some((loc) => loc.id === directions.from)) directions.from = '';
  if (directions.to && !locations.some((loc) => loc.id === directions.to)) directions.to = '';
  from.value = directions.from;
  to.value = directions.to;
}

function syncRouteUrl() {
  try {
    const url = new URL(location.href);
    if (directions.from) url.searchParams.set('from', directions.from);
    else url.searchParams.delete('from');
    if (directions.to) url.searchParams.set('to', directions.to);
    else url.searchParams.delete('to');
    history.replaceState(null, '', url);
  } catch {
    /* history access can be blocked in sandboxed frames — ignore */
  }
}

function renderRoute() {
  const svg = $('#map-route');
  const host = $('#map-route-points');
  if (!svg || !host) return;
  const route = directions.route;

  if (!route) {
    svg.innerHTML = '';
    host.innerHTML = '';
    return;
  }

  const path = route.points
    .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  svg.innerHTML = `<path class="map-route-glow" d="${path}"></path><path class="map-route-line" d="${path}"></path>`;

  const first = route.points[0];
  const last = route.points[route.points.length - 1];
  host.innerHTML = [
    `<span class="route-point route-point-a" style="left:${first.x}%;top:${first.y}%">A</span>`,
    ...route.points
      .slice(1, -1)
      .map((p) => `<span class="route-point route-point-mid" style="left:${p.x}%;top:${p.y}%"></span>`),
    `<span class="route-point route-point-b" style="left:${last.x}%;top:${last.y}%">B</span>`,
  ].join('');
}

function renderDirectionResult() {
  const host = $('#dir-result');
  const route = directions.route;
  if (!host) return;
  const clear = $('#dir-clear');
  if (clear) clear.hidden = false;
  if (!route) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <div class="dir-summary">
      <span class="dir-endpoint dir-endpoint-a">A</span>
      <span class="dir-summary-names"><b>${esc(route.from.name)}</b><span>to</span><b>${esc(route.to.name)}</b></span>
      <span class="dir-time">${icon('clock', { size: 13 })} About ${route.minutes} min walk</span>
    </div>
    <p class="micro dim dir-note">Approximate walking time. Tap a step to zoom in on that point.</p>
    <ol class="dir-steps">
      ${route.steps.map((step, i) => `<li tabindex="0" data-step="${i}" title="Zoom to this point">${esc(step)}</li>`).join('')}
    </ol>
    <div class="dir-actions">
      <button class="btn btn-sm btn-outline" id="dir-fit" type="button">${icon('maximize', { size: 14 })} Show full route</button>
      <button class="btn btn-sm btn-ghost" id="dir-clear-route" type="button">${icon('x', { size: 14 })} Clear route</button>
    </div>`;

  host.querySelector('#dir-fit')?.addEventListener('click', fitRoute);
  host.querySelector('#dir-clear-route')?.addEventListener('click', clearDirections);
  host.querySelectorAll('[data-step]').forEach((item) => {
    const focus = () => {
      const point = route.points[Math.min(Number(item.dataset.step), route.points.length - 1)];
      if (point) centerOnPoint(point.x, point.y);
    };
    item.addEventListener('click', focus);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        focus();
      }
    });
  });
}

function scrollToDirections() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  $('#directions-panel')?.scrollIntoView({ behavior, block: 'start' });
}

function computeDirections({ scroll = false } = {}) {
  const from = locations.find((loc) => loc.id === directions.from) || null;
  const to = locations.find((loc) => loc.id === directions.to) || null;
  const host = $('#dir-result');
  const clear = $('#dir-clear');

  if (!from || !to) {
    directions.route = null;
    if (host) {
      host.innerHTML = to && !from ? '<p class="micro dim">Now choose your starting point above to see the route.</p>' : '';
    }
    if (clear) clear.hidden = true;
  } else if (from.id === to.id) {
    directions.route = null;
    if (host) host.innerHTML = '<p class="micro dim">Choose two different places to get directions.</p>';
    if (clear) clear.hidden = false;
  } else {
    directions.route = buildRoute(from, to);
    renderDirectionResult();
  }

  renderRoute();
  render();
  syncLiveRoute();
  syncRouteUrl();
  if (scroll) scrollToDirections();
}

function clearDirections() {
  directions.from = '';
  directions.to = '';
  directions.route = null;
  const from = $('#dir-from');
  const to = $('#dir-to');
  if (from) from.value = '';
  if (to) to.value = '';
  const clear = $('#dir-clear');
  if (clear) clear.hidden = true;
  const host = $('#dir-result');
  if (host) host.innerHTML = '';
  renderRoute();
  render();
  syncLiveRoute();
  syncRouteUrl();
}

function setDirectionEndpoint(which, id) {
  directions[which] = id;
  const select = $(`#dir-${which}`);
  if (select) select.value = id;
  computeDirections({ scroll: true });
}

function wireDirections() {
  const from = $('#dir-from');
  const to = $('#dir-to');
  if (!from || !to) return;

  from.addEventListener('change', () => {
    directions.from = from.value;
    computeDirections();
  });
  to.addEventListener('change', () => {
    directions.to = to.value;
    computeDirections();
  });
  $('#dir-go')?.addEventListener('click', () => computeDirections({ scroll: true }));
  $('#dir-swap')?.addEventListener('click', () => {
    const previous = from.value;
    from.value = to.value;
    to.value = previous;
    directions.from = from.value;
    directions.to = to.value;
    computeDirections();
  });
  $('#dir-clear')?.addEventListener('click', clearDirections);
}

/* ---------------------------------------------------------------- */
/* Real-world map view — loaded only when the visitor asks for it      */
/* ---------------------------------------------------------------- */

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

let liveMap = null;
let livePlaces = null;
let liveRouteLine = null;
let liveRouteEnds = null;
let leafletPromise = null;

function liveStatus(message) {
  const host = $('#live-map-status');
  if (!host) return;
  const label = host.querySelector('span');
  if (label) label.textContent = message || '';
  host.hidden = !message;
}

function selectMapTab(name) {
  document.querySelectorAll('[data-map-view]').forEach((btn) => {
    const active = btn.dataset.mapView === name;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  try {
    const url = new URL(location.href);
    if (name === 'live') url.searchParams.set('view', 'live');
    else url.searchParams.delete('view');
    history.replaceState(null, '', url);
  } catch {
    /* ignore blocked history */
  }
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Map library unavailable')));
    script.onerror = () => reject(new Error('Map library could not load'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function syncLiveMarkers() {
  if (!liveMap || !window.L) return;
  const L = window.L;
  if (livePlaces) liveMap.removeLayer(livePlaces);
  livePlaces = L.layerGroup().addTo(liveMap);

  locations.forEach((loc) => {
    const geo = geoForLocation(loc);
    if (!geo) return;
    const t = typeOf(loc.location_type);
    const marker = L.circleMarker(geo, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: t.color,
      fillOpacity: 1,
    });
    marker.bindTooltip(esc(loc.name), { direction: 'top', offset: [0, -6] });
    marker.bindPopup(`<b>${esc(loc.name)}</b><small>${esc(t.label)}${loc.description ? ` · ${esc(loc.description)}` : ''}</small>`);
    marker.on('click', () => {
      filters.selected = loc.id;
      try {
        const url = new URL(location.href);
        url.searchParams.set('location', loc.id);
        history.replaceState(null, '', url);
      } catch {
        /* ignore blocked history */
      }
      render();
    });
    livePlaces.addLayer(marker);
  });
}

function syncLiveRoute() {
  if (!liveMap || !window.L) return;
  const L = window.L;
  if (liveRouteLine) {
    liveMap.removeLayer(liveRouteLine);
    liveRouteLine = null;
  }
  if (liveRouteEnds) {
    liveMap.removeLayer(liveRouteEnds);
    liveRouteEnds = null;
  }
  if (!directions.route) return;

  const latlngs = directions.route.points.map((p) => geoFromPercent(p.x, p.y));
  liveRouteLine = L.polyline(latlngs, {
    color: '#7c3ad9',
    weight: 5,
    opacity: 0.92,
    dashArray: '9 7',
  }).addTo(liveMap);

  liveRouteEnds = L.layerGroup().addTo(liveMap);
  const ends = [
    [latlngs[0], 'live-end live-end-a', 'A'],
    [latlngs[latlngs.length - 1], 'live-end live-end-b', 'B'],
  ];
  ends.forEach(([position, className, label]) => {
    L.marker(position, {
      icon: L.divIcon({ className, html: label, iconSize: [24, 24], iconAnchor: [12, 12] }),
    }).addTo(liveRouteEnds);
  });
  liveMap.fitBounds(liveRouteLine.getBounds(), { padding: [46, 46], maxZoom: 16 });
}

async function initLiveMap() {
  liveStatus('Loading real-world map…');
  try {
    const L = await loadLeaflet();
    if (!liveMap) {
      liveMap = L.map('live-map', { zoomControl: true, scrollWheelZoom: true }).setView(
        [CAMPUS_CENTRE.lat, CAMPUS_CENTRE.lng],
        15
      );
      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(liveMap);
    }
    syncLiveMarkers();
    syncLiveRoute();
    liveStatus('');
    window.requestAnimationFrame(() => liveMap?.invalidateSize());
    return true;
  } catch {
    liveStatus('');
    selectMapTab('plate');
    $('#map-frame')?.classList.remove('is-live');
    const shell = $('#live-map-shell');
    if (shell) shell.hidden = true;
    const note = $('#map-view-note');
    if (note) note.textContent = 'Live map needs internet — showing the offline campus plate.';
    return false;
  }
}

async function setMapView(name) {
  const frame = $('#map-frame');
  const shell = $('#live-map-shell');
  const note = $('#map-view-note');

  if (name === 'live' && !navigator.onLine) {
    selectMapTab('plate');
    if (note) note.textContent = 'Live map needs internet — showing the offline campus plate.';
    return;
  }

  selectMapTab(name);
  if (name === 'plate') {
    frame?.classList.remove('is-live');
    if (shell) shell.hidden = true;
    if (note) note.textContent = 'Offline-ready · real-world positions are approximate';
    return;
  }

  if (shell) shell.hidden = false;
  frame?.classList.add('is-live');
  if (note) note.textContent = 'Approximate positions from the campus illustration · © OpenStreetMap';
  await initLiveMap();
}

function wireLiveView() {
  document.querySelectorAll('[data-map-view]').forEach((btn) =>
    btn.addEventListener('click', () => setMapView(btn.dataset.mapView))
  );
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
  populateDirections();
  wireDirections();
  wireLiveView();
  syncLiveMarkers();
  if (directions.from && directions.to) computeDirections();
  if (filters.selected) window.requestAnimationFrame(() => centerOn(filters.selected));
  if (requestedView === 'live') setMapView('live');

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
