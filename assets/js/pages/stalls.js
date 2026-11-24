import { mountChrome, mountMotion, emptyState } from '../ui.js';
import { mountIcons, icon } from '../icons.js';
import { esc, debounce, param } from '../util.js';

const $ = (sel) => document.querySelector(sel);

const FOOD_STALLS = [
  'Biryani',
  'Cool Drinks',
  'Fried Rice',
  'Chaat & Pani Puri',
  'Ice Cream',
  'Manchurian',
  'Chocolate Fountain',
  'Juice Point',
  'Rolls & Frankies',
  'Haleem',
  'Fried Chicken',
  'Tandoori',
  'Bajji & Samosa',
  'Momos',
  'Milk Items',
  'Bamboo Chicken',
  'Seafood',
  'Desserts',
  'Fruits & Coconut',
  'Shawarma',
  'Bakery Products',
  'Dosa',
  'Soups',
  'Tiffins',
  'Bread Omelette & Egg',
  'Kulfi',
  'Chapathi & Pulka',
  'French Fries & Spring Potato',
  'Peechumittai',
  'Coffee & Tea',
  'Noodles',
  'Sugarcane Juice',
  'Kerala Specials',
  'Live bobbatlu',
  'Pizza',
  'Roti',
  'Fire paan',
  'Veg Starters',
  'Pav Bhaji & Vada Pav',
  'Kulfi',
  'Live Putharekulu',
  'Ice Crush',
  'Ragi Sangati & Natu Kodi Pulusu',
  'Waffles',
  'Korean Cuisine',
];

let query = param('q') || '';

function syncUrl() {
  const url = new URL(location.href);
  if (query.trim()) url.searchParams.set('q', query.trim());
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}

function card(name, index) {
  const hue = 258 + ((index * 13) % 62);
  return `<article class="card event-card food-stall-card" style="--stall-hue:${hue};--cat:hsl(${hue} 58% 45%)">
    <div class="food-stall-media">
      <span class="badge badge-purple">${icon('utensils', { size: 12 })} Proposed</span>
      <span class="food-stall-icon">${icon('utensils', { size: 28 })}</span>
    </div>
    <div class="event-body">
      <h3 class="event-title">${esc(name)}</h3>
      <div class="meta-row">${icon('store', { size: 14 })}<span>Food stall · Colours 2K27</span></div>
    </div>
  </article>`;
}

function render() {
  const q = query.trim().toLowerCase();
  const rows = FOOD_STALLS.map((name, index) => ({ name, index })).filter(
    (row) => !q || row.name.toLowerCase().includes(q)
  );

  const grid = $('#food-stall-grid');
  grid.innerHTML = rows.length
    ? rows.map((row) => card(row.name, row.index)).join('')
    : emptyState({
        iconName: 'search',
        title: 'No food stalls match',
        text: 'Try a different search term.',
        action: '<button class="btn btn-sm btn-outline" data-clear-search>Show all stalls</button>',
      });

  grid.querySelector('[data-clear-search]')?.addEventListener('click', () => {
    query = '';
    $('#food-search').value = '';
    syncUrl();
    render();
  });

  mountIcons(grid);
  mountMotion(grid);
}

function boot() {
  mountChrome();
  $('#food-search').value = query;
  render();

  $('#food-search').addEventListener(
    'input',
    debounce((e) => {
      query = e.target.value;
      syncUrl();
      render();
    }, 160)
  );
}

boot();
