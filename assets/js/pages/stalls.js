import store from '../store.js';
import {
  mountChrome,
  mountSyncBar,
  vendorCard,
  emptyState,
  wireDataDownload,
  categoryOf,
  imgTag,
  mountImageFallbacks,
} from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, debounce, formatDay, isExpired, initials, hueFor, safeUrl, param } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const filters = { q: param('q'), cat: param('cat'), offersOnly: param('offers') === '1' };
let vendors = [];

function syncUrl() {
  const url = new URL(location.href);
  const map = { q: filters.q, cat: filters.cat };
  for (const [key, value] of Object.entries(map)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (filters.offersOnly) url.searchParams.set('offers', '1');
  else url.searchParams.delete('offers');
  history.replaceState(null, '', url);
}

function offerBadgeCount(vendorId) {
  return store.offersForVendor(vendorId).length;
}

function apply() {
  const q = filters.q.trim().toLowerCase();
  return vendors.filter((v) => {
    if (filters.cat && v.category !== filters.cat) return false;
    if (filters.offersOnly && offerBadgeCount(v.id) === 0) return false;
    if (q) {
      const loc = store.locationOf(v);
      const offers = store.offersForVendor(v.id).map((o) => `${o.title} ${o.description || ''}`).join(' ');
      const hay = `${v.name} ${v.description || ''} ${v.category || ''} ${loc?.name || ''} ${offers}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function render() {
  const rows = apply();
  $('#vendor-count').textContent = `${rows.length} stall${rows.length === 1 ? '' : 's'} · ${store.activeOffers().length} active offer${store.activeOffers().length === 1 ? '' : 's'}`;

  const grid = $('#vendor-grid');
  grid.innerHTML = rows.length
    ? rows.map(vendorCard).join('')
    : emptyState({
        iconName: 'store',
        title: vendors.length ? 'No stalls match those filters' : 'No approved stalls yet',
        text: vendors.length
          ? 'Try another category, clear the offers filter, or search for a different stall.'
          : 'Vendor applications appear here after organisers approve them.',
        action: vendors.length ? '<button class="btn btn-sm btn-outline" data-clear>Clear filters</button>' : '',
      });
  grid.querySelector('[data-clear]')?.addEventListener('click', clear);

  // featured rail
  const featured = store.featuredVendors();
  const rail = $('#featured-host');
  rail.innerHTML = featured.length
    ? `<div class="section-head" style="margin-bottom:14px">
         <div>
           <span class="eyebrow">${icon('star', { size: 12 })} Featured stalls</span>
           <h2 style="font-size:1.35rem;margin-top:8px">Worth a stop</h2>
         </div>
         <span class="badge badge-amber">Promoted placements are labelled</span>
       </div>
       <div class="featured-vendor-rail">${featured.map(vendorCard).join('')}</div>`
    : '';

  const sponsors = store.activeSponsorships('stalls_banner');
  $('#stalls-sponsors').innerHTML = sponsors.length
    ? `<div class="stack" style="--gap:8px">${sponsors
        .map(
          (s) => `<div class="cluster" style="gap:10px">
            ${s.logo_url ? imgTag(s.logo_url, s.sponsor_name) : icon('sparkles', { size: 16 })}
            <span><b>${esc(s.sponsor_name)}</b><br /><small class="micro dim">Campaign ends ${esc(formatDay(String(s.campaign_end).slice(0, 10)))}</small></span>
          </div>`
        )
        .join('')}</div>
       <p class="micro dim" style="margin-top:10px">Paid sponsor placement. Approved by the organisers.</p>`
    : `<p class="small dim">No sponsored placement is active right now.</p>`;

  mountIcons(grid);
  mountImageFallbacks(grid);
}

function clear() {
  Object.assign(filters, { q: '', cat: '', offersOnly: false });
  $('#vendor-search').value = '';
  $('#offers-only').setAttribute('aria-pressed', 'false');
  $('#vendor-categories').querySelectorAll('[data-cat]').forEach((c, i) => c.setAttribute('aria-pressed', String(i === 0)));
  syncUrl();
  render();
}

function buildCategories() {
  const cats = [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort();
  if (filters.cat && !cats.includes(filters.cat)) cats.unshift(filters.cat);
  const host = $('#vendor-categories');
  host.innerHTML = [`<button class="chip" data-cat="" aria-pressed="${!filters.cat}">All stalls</button>`]
    .concat(
      cats.map((c) => {
        const cat = categoryOf(c);
        return `<button class="chip" data-cat="${esc(c)}" aria-pressed="${filters.cat === c}">${icon(cat.icon, { size: 14 })} ${esc(cat.label)}</button>`;
      })
    )
    .join('');
  host.querySelectorAll('[data-cat]').forEach((chip) =>
    chip.addEventListener('click', () => {
      filters.cat = chip.dataset.cat;
      host.querySelectorAll('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      syncUrl();
      render();
    })
  );
}

function openVendor(id) {
  const vendor = store.vendorById(id);
  if (!vendor) return;
  const cat = categoryOf(vendor.category);
  const loc = store.locationOf(vendor);
  const offers = store.offersForVendor(vendor.id);
  const dialog = $('#vendor-dialog');
  $('#vendor-dialog-title').textContent = vendor.name;
  $('#vendor-dialog-body').innerHTML = `
    <div class="vendor-head" style="margin-bottom:14px">
      <div class="vendor-logo" style="${vendor.image_url ? '' : `background:linear-gradient(150deg, hsl(${hueFor(vendor.name)} 60% 26%), #16204a);width:64px;height:64px`}">
        ${vendor.image_url ? imgTag(vendor.image_url, `${vendor.name} logo`) : esc(initials(vendor.name))}
      </div>
      <div>
        <div class="cluster" style="gap:6px">
          <span class="badge" style="color:${cat.color};border-color:${cat.color}55">${icon(cat.icon, { size: 12 })} ${esc(cat.label)}</span>
          ${vendor.is_featured && !isExpired(vendor.featured_until) ? '<span class="badge badge-amber">Sponsored</span>' : ''}
        </div>
        <p class="micro dim" style="margin-top:6px">${esc(loc?.name || 'Location to be announced')}</p>
      </div>
    </div>
    <p class="small" style="line-height:1.7">${esc(vendor.description || 'No description provided.')}</p>
    <div class="detail-facts" style="margin-top:16px">
      <div class="fact">${icon('map-pin', { size: 17 })}<div><b>${esc(loc?.name || 'Location TBA')}</b><small>${esc(loc?.description || 'Campus location')}</small></div></div>
      ${vendor.opening_hours ? `<div class="fact">${icon('clock', { size: 17 })}<div><b>${esc(vendor.opening_hours)}</b><small>Stall hours</small></div></div>` : ''}
    </div>
    <div class="divider" style="margin:16px 0"></div>
    <h3 style="font-size:0.95rem;margin-bottom:10px">Offers</h3>
    ${offers.length
      ? `<div class="stack" style="--gap:8px">${offers
          .map(
            (o) => `<div class="offer-line">${icon('tag', { size: 13 })}<span><b>${esc(o.title)}</b>${o.description ? ` — ${esc(o.description)}` : ''}${
              o.valid_until ? `<br /><small class="dim">Valid until ${esc(formatDay(String(o.valid_until).slice(0, 10)))}</small>` : ''
            }</span></div>`
          )
          .join('')}</div>`
      : '<p class="small dim">No active offers for this stall right now.</p>'}
    <div class="cluster" style="margin-top:18px">
      <a class="btn btn-sm btn-outline" href="map.html?location=${encodeURIComponent(vendor.location_id || '')}">${icon('map', { size: 15 })} Find on campus map</a>
      ${vendor.contact_url ? `<a class="btn btn-sm btn-ghost" href="${esc(safeUrl(vendor.contact_url))}" target="_blank" rel="noopener noreferrer">${icon('external-link', { size: 15 })} Vendor link</a>` : ''}
    </div>
    <p class="micro dim" style="margin-top:14px">Offers are published by the vendor and expire automatically. This app does not process payments.</p>
  `;
  mountIcons($('#vendor-dialog-body'));
  mountImageFallbacks($('#vendor-dialog-body'));
  dialog.showModal();
}

function wireDialog() {
  const dialog = $('#vendor-dialog');
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-vendor]');
    if (btn) openVendor(btn.dataset.vendor);
  });
}

async function boot() {
  mountChrome();
  mountIcons();
  await store.init();
  mountChrome();

  vendors = store.state.vendors;
  mountSyncBar($('#stalls-status'));
  buildCategories();
  $('#vendor-search').value = filters.q;
  $('#offers-only').setAttribute('aria-pressed', String(filters.offersOnly));
  render();
  wireDialog();

  $('#vendor-search').addEventListener(
    'input',
    debounce((e) => {
      filters.q = e.target.value;
      syncUrl();
      render();
    }, 180)
  );

  $('#offers-only').addEventListener('click', (e) => {
    filters.offersOnly = !filters.offersOnly;
    e.currentTarget.setAttribute('aria-pressed', String(filters.offersOnly));
    syncUrl();
    render();
  });

  wireDataDownload(document.querySelector('[data-download-data]'));
}

boot();
