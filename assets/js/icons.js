/**
 * A small local icon set drawn in the Lucide 24px / 1.75-stroke style.
 * Kept as inline markup (no CDN, no sprite fetch) so icons work fully offline.
 */

const P = {
  home: '<path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.4V21h13V9.4"/><path d="M10 21v-6h4v6"/>',
  calendar:
    '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/><path d="M7.5 14h3M7.5 17.5h3M13.5 14h3"/>',
  map: '<path d="M9 3 3 5.2V21l6-2.2 6 2.2 6-2.2V3l-6 2.2z"/><path d="M9 3v15.8M15 5.2V21"/>',
  store:
    '<path d="M3.2 9 4.7 4h14.6l1.5 5"/><path d="M4.5 9v11.5h15V9"/><path d="M9.5 20.5V14h5v6.5"/><path d="M3.2 9h17.6"/>',
  megaphone:
    '<path d="M3 10.5v3A1.5 1.5 0 0 0 4.5 15H7l5 4V5L7 9H4.5A1.5 1.5 0 0 0 3 10.5z"/><path d="M16.5 8.2a5.5 5.5 0 0 1 0 7.6"/><path d="M19.5 5.2a9.5 9.5 0 0 1 0 13.6"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 16.5V11.5M12 7.8h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16 16"/>',
  filter: '<path d="M3 5.5h18M6.5 12h11M10 18.5h4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
  'more-horizontal': '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  'chevron-right': '<path d="M9 5.5 15.5 12 9 18.5"/>',
  'chevron-down': '<path d="M5.5 9 12 15.5 18.5 9"/>',
  'chevron-left': '<path d="M15 5.5 8.5 12 15 18.5"/>',
  'arrow-right': '<path d="M4 12h15.5M13.5 6l6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H4.5M10.5 6l-6 6 6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  star: '<path d="m12 3.4 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.8l6-.9z"/>',
  bookmark: '<path d="M6.5 3.5h11V21l-5.5-4-5.5 4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.3 2"/>',
  'map-pin':
    '<path d="M12 21.2s7-5.8 7-11.2a7 7 0 1 0-14 0c0 5.4 7 11.2 7 11.2z"/><circle cx="12" cy="10" r="2.6"/>',
  wifi: '<path d="M2.5 8.6a15.5 15.5 0 0 1 19 0"/><path d="M5.5 12.2a10.5 10.5 0 0 1 13 0"/><path d="M8.6 15.7a5.6 5.6 0 0 1 6.8 0"/><path d="M12 19.2h.01"/>',
  'wifi-off':
    '<path d="M2 2.5 22 22"/><path d="M8.6 15.7a5.6 5.6 0 0 1 6.8 0"/><path d="M5.5 12.2a10.5 10.5 0 0 1 3.8-2.4"/><path d="M15.4 9.5a10.5 10.5 0 0 1 3.1 2.7"/><path d="M2.5 8.6a15.5 15.5 0 0 1 5.9-3.3"/><path d="M16.6 5.6a15.5 15.5 0 0 1 4.9 3"/><path d="M12 19.2h.01"/>',
  refresh:
    '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.7 3.5V9h-5.4"/>',
  download: '<path d="M12 3.5V15M7.2 11l4.8 4.8L16.8 11"/><path d="M4 20.5h16"/>',
  upload: '<path d="M12 20.5V9M7.2 13 12 8.2 16.8 13"/><path d="M4 3.5h16"/>',
  plus: '<path d="M12 4.5v15M4.5 12h15"/>',
  pencil: '<path d="M4 20.2h4.2L20 8.4l-4.2-4.2L4 16z"/><path d="M14.4 5.6l4 4"/>',
  trash: '<path d="M4 7h16M9.5 7V4.2h5V7"/><path d="M6.5 7 7.6 21h8.8L17.5 7"/>',
  check: '<path d="M4.5 12.4 9.6 17.5 19.5 6.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.4 11 15.4 16.3 9"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  'alert-triangle':
    '<path d="M12 3.2 2.4 20.8h19.2z"/><path d="M12 9.4v5.2M12 18h.01"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v5.8M12 16.6h.01"/>',
  image:
    '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.6" cy="10" r="1.6"/><path d="m3.8 17 4.6-4.4 3.4 3.2 3-2.8 5.4 5"/>',
  settings:
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.5 7.5l2.2 1.3M17.3 15.2l2.2 1.3M4.5 16.5l2.2-1.3M17.3 8.8l2.2-1.3"/>',
  users:
    '<path d="M15.5 20.5v-1.8a4 4 0 0 0-4-4H6.8a4 4 0 0 0-4 4v1.8"/><circle cx="9.2" cy="7.2" r="3.6"/><path d="M17.2 4.2a3.7 3.7 0 0 1 0 7.2"/><path d="M21.2 20.5v-1.8a4 4 0 0 0-2.9-3.8"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2"/><path d="M10 21v-3h4v3"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2.8 12.8V3h9.8l8 8a2 2 0 0 1 0 2.4z"/><circle cx="7.6" cy="7.6" r="1.2"/>',
  gift: '<rect x="3" y="8" width="18" height="4.2" rx="1"/><path d="M5 12.2V21h14v-8.8"/><path d="M12 8v13"/><path d="M12 8s-2.8-5-5.4-2.6C4.2 7.8 12 8 12 8z"/><path d="M12 8s2.8-5 5.4-2.6C19.8 7.8 12 8 12 8z"/>',
  shield: '<path d="M12 2.8 20 5.8v5.6c0 5-3.6 8.3-8 9.8-4.4-1.5-8-4.8-8-9.8V5.8z"/>',
  'log-out':
    '<path d="M14.5 3.5H19a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4.5"/><path d="M10 16.5 14.5 12 10 7.5"/><path d="M14.5 12H3"/>',
  'external-link':
    '<path d="M14 3.5h6.5V10"/><path d="M20.5 3.5 11.5 12.5"/><path d="M17.5 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/>',
  sparkles:
    '<path d="m12 2.8 2 5.2 5.2 2-5.2 2-2 5.2-2-5.2-5.2-2 5.2-2z"/><path d="m19 15 .9 2.1 2.1.9-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  eye: '<path d="M2.2 12S5.8 5.2 12 5.2 21.8 12 21.8 12 18.2 18.8 12 18.8 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':
    '<path d="M2.2 12S5.8 5.2 12 5.2c1.6 0 3 .4 4.3 1"/><path d="M18.6 7.5c2 1.7 3.2 4.5 3.2 4.5S18.2 18.8 12 18.8c-1.3 0-2.5-.3-3.6-.7"/><path d="M2 2.5 22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  layout:
    '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9.2h18M9.5 21V9.2"/>',
  ticket:
    '<path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h13a2 2 0 0 1 2 2v1.2a2.3 2.3 0 0 0 0 4.6v1.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.2a2.3 2.3 0 0 0 0-4.6z"/><path d="M12 7v10" stroke-dasharray="1.5 3"/>',
  utensils: '<path d="M5.5 3v6.5a2.5 2.5 0 0 0 5 0V3"/><path d="M8 9.5V21"/><path d="M17.5 3c-1.2 1.8-1.8 3.6-1.8 5.6 0 1.7.8 2.6 2.3 2.6s2.2-1 2.2-2.7c0-2-.6-3.7-1.7-5.5z"/><path d="M17.5 11.2V21"/>',
  shirt:
    '<path d="M9 3.2 3.6 6.4l2 4.2 2.9-1.4V21h7V9.2l2.9 1.4 2-4.2-5.4-3.2-2.4 1.6z"/>',
  palette:
    '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.6 0 2.2-1 2.2-2s-.6-2-1.8-2h-1.9a2.2 2.2 0 0 1 0-4.4h6a4.6 4.6 0 0 0 4.6-4.6c0-2.8-4-4.6-9.1-4.6z"/><circle cx="7.8" cy="10" r="1.1"/><circle cx="10.4" cy="6.9" r="1.1"/><circle cx="15" cy="7" r="1.1"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="3" y="3" width="18" height="18" rx="3" opacity=".35"/><path d="M9.5 2v2M14.5 2v2M9.5 20v2M14.5 20v2M2 9.5h2M2 14.5h2M20 9.5h2M20 14.5h2"/>',
  'shopping-bag': '<path d="M6 8h12l1.2 13H4.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  send: '<path d="M21.5 2.5 11 13"/><path d="M21.5 2.5 14.8 21.5 10.8 13 2.5 9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.6 7 8.4 6 8.4-6"/>',
  phone:
    '<path d="M6.3 3.2h3.1l1.5 4-2.1 1.5a12.5 12.5 0 0 0 6.5 6.5l1.5-2.1 4 1.5v3.1a2.1 2.1 0 0 1-2.3 2.1A17.4 17.4 0 0 1 4.2 5.5 2.1 2.1 0 0 1 6.3 3.2z"/>',
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.6h.01"/>',
  github:
    '<path d="M9 19.5c-4 1.5-4-2.5-5-3"/><path d="M14 21.5v-3.9c0-.9.1-1.3-.5-1.9 2.8-.3 4.5-1.8 4.5-5a3.9 3.9 0 0 0-1.1-2.7 3.6 3.6 0 0 0-.1-2.7s-.9-.3-3 1a10.4 10.4 0 0 0-5.6 0c-2.1-1.3-3-1-3-1a3.6 3.6 0 0 0-.1 2.7A3.9 3.9 0 0 0 5 8c0 3.2 1.7 4.7 4.5 5-.5.6-.6 1.1-.5 2v4.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3h-3zM20.5 14v.01M14 20.5v.01M17.5 20.5h3M20.5 17.5v3"/>',
  share: '<circle cx="18" cy="5.5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="18.5" r="2.8"/><path d="m8.5 10.6 7-3.6M8.5 13.4l7 3.6"/>',
  navigation: '<path d="M3.2 10.8 21 3l-7.8 17.8-2.2-7.2z"/>',
  layers: '<path d="m12 3.2 9 4.8-9 4.8-9-4.8z"/><path d="m3.6 12.4 8.4 4.4 8.4-4.4"/>',
  list: '<path d="M8.5 6.2h12M8.5 12h12M8.5 17.8h12"/><path d="M3.8 6.2h.01M3.8 12h.01M3.8 17.8h.01"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  flame: '<path d="M12 2.8s5.2 4.2 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-2 1-3.6 2-4.6.5 2 1.5 2.6 2 2.6s1.5-1 1-4c-.3-1.5.2-3.2.2-3.2z"/>',
  zap: '<path d="M13.5 2 4 14h6.2l-1 8L20 10h-6.4z"/>',
  music:
    '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5.2l12-2V16"/>',
  mic: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5 11.5a7 7 0 0 0 14 0"/><path d="M12 18.5V21.5"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2.2A3 3 0 0 0 8 10.2"/><path d="M16 5h3v2.2a3 3 0 0 1-3 3"/><path d="M12 13v4"/><path d="M9 21h6M9.5 17h5"/>',
  coffee:
    '<path d="M4 8.5h12.5v5.8a4.8 4.8 0 0 1-4.8 4.8H8.8A4.8 4.8 0 0 1 4 14.3z"/><path d="M16.5 9.5H18a2.5 2.5 0 0 1 0 5h-1.5"/><path d="M3.5 22h14"/>',
  bell: '<path d="M18 9.5a6 6 0 1 0-12 0c0 5.5-2 6.5-2 6.5h16s-2-1-2-6.5"/><path d="M10.2 20a2.2 2.2 0 0 0 3.6 0"/>',
  link: '<path d="M10.5 13.5a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.5 1.5"/><path d="M13.5 10.5a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.5-1.5"/>',
  'file-text':
    '<path d="M14 3H6.5A2 2 0 0 0 4.5 5v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7.5z"/><path d="M14 3v4.5h5.5"/><path d="M8.5 13h7M8.5 17h5"/>',
  sliders:
    '<path d="M4 7h6M14 7h6M4 17h10M18 17h2"/><circle cx="12" cy="7" r="2.2"/><circle cx="16" cy="17" r="2.2"/>',
  activity:
    '<path d="M3 12h3.5l2.5-7 4 14 2.5-7H21"/>',
  'rotate-ccw': '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.3 3.5V9h5.4"/>',
  'maximize': '<path d="M8 3.5H3.5V8M16 3.5h4.5V8M20.5 16v4.5H16M8 20.5H3.5V16"/>',
  'database':
    '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
};

export const ICON_NAMES = Object.keys(P);

/**
 * @returns {string} inline SVG markup
 */
export function icon(name, { size = 20, cls = '', strokeWidth = 1.75, fill = false } = {}) {
  const body = P[name] || P.info;
  const classes = ['icon', cls].filter(Boolean).join(' ');
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/** Replaces every `<i data-icon="name">` placeholder in `root` with real SVG. */
export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((node) => {
    const size = Number(node.dataset.size || 20);
    node.innerHTML = icon(node.dataset.icon, { size });
    node.classList.add('icon-wrap');
    delete node.dataset.icon;
  });
}
