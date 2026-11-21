import store from '../store.js';
import { mountChrome, mountSyncBar, emptyState, mapPlate, locationTypeOf, mountMotion } from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, param, debounce } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const typeOf = locationTypeOf;

const filters = { q: '', type: '', selected: param('location') };
const directions = { from: param('from'), to: param('to'), route: null };
let locations = [];

/* ---------------------------------------------------------------- */
/* Road-only walking network                                          */
/*                                                                   */
/* The campus plate is offline, so directions follow the roads drawn  */
/* on it. Every road below is traced from a road centreline in the     */
/* picture (plate percentages). A venue snaps to the closest road,     */
/* then the route follows only those roads — never a straight cut      */
/* across a ground, building or the pond.                              */
/* ---------------------------------------------------------------- */

const WAYPOINTS = [
  { id: 'nw-tip', name: 'the west end of the bhavan road', x: 16.5, y: 25.5 },
  { id: 'n-west', name: 'the bhavan road at the west road', x: 27, y: 25.5 },
  { id: 'n-midwest', name: 'the bhavan road at the pharmacy road', x: 39, y: 25.5 },
  { id: 'n-centre', name: 'the bhavan road at the central road', x: 51, y: 25.5 },
  { id: 'n-eastmid', name: 'the bhavan road at the east bhavan road', x: 63, y: 25.5 },
  { id: 'n-east', name: 'the bhavan road at the guest house road', x: 87, y: 25.5 },
  { id: 'ne-tip', name: 'the east end of the bhavan road', x: 96, y: 25.5 },
  { id: 'west-north', name: 'the north end of the west road', x: 27, y: 13.6 },
  { id: 'west-gate', name: 'the west gate junction', x: 27, y: 47 },
  { id: 'west-south', name: 'the west road at the lower cross road', x: 27, y: 64.7 },
  { id: 'edge-north', name: 'the north end of the boundary road', x: 2.3, y: 9.3 },
  { id: 'edge-gate', name: 'the west gate on the boundary road', x: 2.3, y: 40 },
  { id: 'edge-south', name: 'the south end of the boundary road', x: 2.3, y: 97.5 },
  { id: 'midwest-south', name: 'the pharmacy road at the lower cross road', x: 39, y: 64.7 },
  { id: 'midwest-end', name: 'the south end of the pharmacy road', x: 39, y: 90.2 },
  { id: 'centre-north', name: 'the north end of the central road', x: 51, y: 13.6 },
  { id: 'centre-top', name: 'the south end of the upper central road', x: 51, y: 49.5 },
  { id: 'centre-low', name: 'the north end of the lower central road', x: 51, y: 56 },
  { id: 'middle-west', name: 'the west end of the middle cross road', x: 53.5, y: 52.5 },
  { id: 'centre-south', name: 'the central road at the lower cross road', x: 51, y: 64.7 },
  { id: 'centre-end', name: 'the central road at the south cross road', x: 51, y: 90.2 },
  { id: 'centre-tip', name: 'the south end of the central road', x: 51, y: 97.5 },
  { id: 'eastmid-north', name: 'the north end of the east bhavan road', x: 63, y: 13.6 },
  { id: 'eastmid-south', name: 'the east bhavan road at the middle cross road', x: 63, y: 53 },
  { id: 'east-north', name: 'the north end of the guest house road', x: 87, y: 19.5 },
  { id: 'east-south', name: 'the guest house road at the middle cross road', x: 87, y: 53 },
];

const NODE_BY_ID = Object.fromEntries(WAYPOINTS.map((n) => [n.id, n]));

/*
 * These polylines are traced from the roads drawn on campus-map.webp (plate
 * percentages, not guesses). Each segment follows a dark road centreline on
 * the picture: the bhavan road, the west/boundary roads, the central road and
 * the three cross roads. Venues snap to the nearest of these lines.
 */
const ROAD_DEFS = [
  ['nw-tip', 'n-west', 'the bhavan road', [[16.5, 25.5], [27, 25.5]]],
  ['n-west', 'n-midwest', 'the bhavan road', [[27, 25.5], [39, 25.5]]],
  ['n-midwest', 'n-centre', 'the bhavan road', [[39, 25.5], [51, 25.5]]],
  ['n-centre', 'n-eastmid', 'the bhavan road', [[51, 25.5], [63, 25.5]]],
  ['n-eastmid', 'n-east', 'the bhavan road', [[63, 25.5], [87, 25.5]]],
  ['n-east', 'ne-tip', 'the bhavan road', [[87, 25.5], [96, 25.5]]],
  ['west-north', 'n-west', 'the west road', [[27, 13.6], [27, 25.5]]],
  ['n-west', 'west-gate', 'the west road', [[27, 25.5], [27, 47]]],
  ['west-gate', 'west-south', 'the west road', [[27, 47], [27, 64.7]]],
  ['edge-north', 'edge-gate', 'the west boundary road', [[2.3, 9.3], [2.3, 40]]],
  ['edge-gate', 'edge-south', 'the west boundary road', [[2.3, 40], [2.3, 97.5]]],
  ['edge-gate', 'west-gate', 'the west gate road', [[2.3, 40], [12, 42], [20, 45], [27, 47]]],
  ['n-midwest', 'midwest-south', 'the pharmacy college road', [[39, 25.5], [39, 64.7]]],
  ['midwest-south', 'midwest-end', 'the pharmacy college road', [[39, 64.7], [39, 90.2]]],
  ['centre-north', 'n-centre', 'the central road', [[51, 13.6], [51, 25.5]]],
  ['n-centre', 'centre-top', 'the upper central road', [[51, 25.5], [51, 49.5]]],
  ['centre-low', 'centre-south', 'the lower central road', [[51, 56], [51, 64.7]]],
  ['centre-south', 'centre-end', 'the central road', [[51, 64.7], [51, 90.2]]],
  ['centre-end', 'centre-tip', 'the central road', [[51, 90.2], [51, 97.5]]],
  ['eastmid-north', 'n-eastmid', 'the east bhavan road', [[63, 13.6], [63, 25.5]]],
  ['n-eastmid', 'eastmid-south', 'the east bhavan road', [[63, 25.5], [63, 53]]],
  ['east-north', 'n-east', 'the guest house road', [[87, 19.5], [87, 25.5]]],
  ['n-east', 'east-south', 'the guest house road', [[87, 25.5], [87, 53]]],
  ['middle-west', 'eastmid-south', 'the middle cross road', [[53.5, 52.5], [63, 53]]],
  ['eastmid-south', 'east-south', 'the middle cross road', [[63, 53], [87, 53]]],
  ['west-south', 'midwest-south', 'the lower cross road', [[27, 64.7], [39, 64.7]]],
  ['midwest-south', 'centre-south', 'the lower cross road', [[39, 64.7], [51, 64.7]]],
  ['midwest-end', 'centre-end', 'the south cross road', [[39, 90.2], [51, 90.2]]],
];

function makeRoad([a, b, hint, coords]) {
  const points = coords.map(([x, y]) => ({ x, y }));
  const at = [0];
  for (let i = 1; i < points.length; i += 1) {
    at.push(at[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { a, b, hint, points, at, length: at[at.length - 1] };
}

const ROADS = ROAD_DEFS.map(makeRoad);

function roadBetween(aId, bId) {
  return ROADS.find((r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)) || null;
}

function linkHint(aId, bId) {
  return roadBetween(aId, bId)?.hint || '';
}

function pointAt(road, s) {
  const target = Math.min(Math.max(s, 0), road.length);
  for (let i = 1; i < road.points.length; i += 1) {
    if (target <= road.at[i] || i === road.points.length - 1) {
      const span = road.at[i] - road.at[i - 1];
      const t = span ? (target - road.at[i - 1]) / span : 0;
      const a = road.points[i - 1];
      const b = road.points[i];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { ...road.points[0] };
}

function roadSlice(road, fromS, toS) {
  if (fromS > toS) return roadSlice(road, toS, fromS).reverse();
  const pts = [pointAt(road, fromS)];
  for (let i = 0; i < road.points.length; i += 1) {
    const s = road.at[i];
    if (s > fromS + 0.01 && s < toS - 0.01) pts.push({ ...road.points[i] });
  }
  pts.push(pointAt(road, toS));
  return pts;
}

function nearestRoadPoint(loc) {
  const x = Number(loc.map_x);
  const y = Number(loc.map_y);
  let best = null;
  ROADS.forEach((road) => {
    for (let i = 0; i < road.points.length - 1; i += 1) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const span = road.at[i + 1] - road.at[i];
      const t = span ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / (span * span))) : 0;
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const distance = Math.hypot(x - px, y - py);
      if (!best || distance < best.distance) {
        best = { road, s: road.at[i] + span * t, point: { x: px, y: py }, distance };
      }
    }
  });
  return best;
}

function routeEdge(edges, from, to, road, s1, s2) {
  edges.push({ from, to, road, s1, s2, weight: Math.abs(s2 - s1) });
}

function shortestEdgePath(startId, endId, edges) {
  const ids = [...new Set(edges.flatMap((e) => [e.from, e.to]))];
  const dist = { [startId]: 0 };
  const previous = {};
  const visited = new Set();

  while (true) {
    let current = null;
    let best = Infinity;
    ids.forEach((id) => {
      if (!visited.has(id) && (dist[id] ?? Infinity) < best) {
        best = dist[id];
        current = id;
      }
    });
    if (!current || current === endId) break;
    visited.add(current);
    edges.forEach((edge) => {
      if (edge.from !== current) return;
      const candidate = best + edge.weight;
      if (candidate < (dist[edge.to] ?? Infinity)) {
        dist[edge.to] = candidate;
        previous[edge.to] = edge;
      }
    });
  }

  if (!(endId in dist)) return null;
  const chain = [];
  let node = endId;
  while (node !== startId) {
    const edge = previous[node];
    if (!edge) return null;
    chain.unshift(edge);
    node = edge.from;
  }
  return chain;
}

function compass(a, b) {
  const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return names[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}

function pointOfLocation(loc) {
  return { id: loc.id, name: loc.name, x: Number(loc.map_x), y: Number(loc.map_y), isPlace: true };
}

function pointOfNode(node, hint = '') {
  return { id: node.id, name: node.name, x: node.x, y: node.y, isJunction: true, hint };
}

function pointOnRoad(point, road) {
  return { ...point, name: road.hint, hint: road.hint, isRoad: true };
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
      step = `Head ${direction} ${to.isJunction ? 'toward' : 'to'} ${to.name}.`;
    } else if (i === points.length - 2) {
      step = `${direction === previousDirection ? 'Continue' : 'Turn'} ${direction} to ${toName}.`;
    } else {
      const hint = to.hint || (from.isJunction && to.isJunction ? linkHint(from.id, to.id) : '');
      const lead = direction === previousDirection ? 'Continue' : `At ${from.name}, turn`;
      const target = hint && to.name === hint ? '' : ` toward ${to.name}`;
      const via = hint && hint !== from.name ? ` via ${hint}` : '';
      step = `${lead} ${direction}${target}${via}.`;
    }

    steps.push(step);
    previousDirection = direction;
  }

  steps.push(`Arrive at ${toName}.`);
  return steps;
}

function dedupePoints(points) {
  return points.filter((p, i) => {
    if (i === 0) return true;
    const prev = points[i - 1];
    return Math.hypot(p.x - prev.x, p.y - prev.y) > 0.05;
  });
}

function buildRoute(from, to) {
  if (from.map_x == null || to.map_x == null) return null;
  const start = nearestRoadPoint(from);
  const end = nearestRoadPoint(to);
  if (!start || !end) return null;

  const edges = [];
  ROADS.forEach((road) => {
    routeEdge(edges, road.a, road.b, road, 0, road.length);
    routeEdge(edges, road.b, road.a, road, road.length, 0);
  });
  if (start.road === end.road) {
    routeEdge(edges, 'S', 'E', start.road, start.s, end.s);
  } else {
    routeEdge(edges, 'S', start.road.a, start.road, start.s, 0);
    routeEdge(edges, 'S', start.road.b, start.road, start.s, start.road.length);
    routeEdge(edges, end.road.a, 'E', end.road, 0, end.s);
    routeEdge(edges, end.road.b, 'E', end.road, end.road.length, end.s);
  }

  const chain = shortestEdgePath('S', 'E', edges);
  if (!chain) return null;

  const drawn = [pointOfLocation(from), start.point];
  chain.forEach((edge) => drawn.push(...roadSlice(edge.road, edge.s1, edge.s2)));

  const concept = [pointOfLocation(from), pointOnRoad(start.point, start.road)];
  chain.forEach((edge) => {
    if (edge.to !== 'E') concept.push(pointOfNode(NODE_BY_ID[edge.to], edge.road.hint));
  });
  concept.push(pointOnRoad(end.point, end.road), pointOfLocation(to));
  drawn.push(end.point, pointOfLocation(to));

  const points = dedupePoints(drawn);
  let metres = 0;
  points.slice(0, -1).forEach((point, i) => {
    const next = points[i + 1];
    metres += Math.hypot((next.x - point.x) * 7, (next.y - point.y) * 5);
  });

  return {
    from,
    to,
    points,
    stepPoints: dedupePoints(concept),
    steps: describeRoute(concept, to.name),
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
    <p class="micro dim dir-note">Routes follow campus roads only. Approximate walking time — tap a step to zoom in.</p>
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
      const targets = route.stepPoints || route.points;
      const point = targets[Math.min(Number(item.dataset.step), targets.length - 1)];
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
  $('#map-art').innerHTML = mapPlate({ eager: true });
  mountMotion(document);
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
  if (directions.from && directions.to) computeDirections();
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
