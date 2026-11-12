/**
 * Generates the local placeholder artwork used by the demo dataset.
 * Pure Node — no dependencies. Run: node tools/generate-art.mjs
 *
 * These are intentionally abstract (no photos) so the repo stays light and
 * offline-safe. Replace `image_url` with Supabase Storage uploads via the admin
 * dashboard once real festival photography is available.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'img', 'art');
mkdirSync(outDir, { recursive: true });

const palettes = {
  purple: ['#6d63ff', '#a855f7', '#4f46e5'],
  magenta: ['#d946ef', '#f472b6', '#a21caf'],
  cyan: ['#06b6d4', '#22d3ee', '#3b82f6'],
  amber: ['#f59e0b', '#fbbf24', '#f97316'],
  emerald: ['#22c55e', '#34d399', '#0d9488'],
};

const waves = (a, b, c, w = 800, h = 450) => `
  <g filter="url(#blur)" fill="none" stroke-linecap="round">
    <path d="M-60 ${h * 0.62} C ${w * 0.2} ${h * 0.3}, ${w * 0.42} ${h * 0.95}, ${w * 0.62} ${h * 0.58} S ${w * 0.92} ${h * 0.28}, ${w + 60} ${h * 0.5}" stroke="${a}" stroke-width="${h * 0.055}" opacity=".85"/>
    <path d="M-60 ${h * 0.78} C ${w * 0.18} ${h * 0.5}, ${w * 0.4} ${h * 1.02}, ${w * 0.64} ${h * 0.7} S ${w * 0.9} ${h * 0.44}, ${w + 60} ${h * 0.66}" stroke="${b}" stroke-width="${h * 0.03}" opacity=".7"/>
    <path d="M-60 ${h * 0.42} C ${w * 0.24} ${h * 0.16}, ${w * 0.46} ${h * 0.7}, ${w * 0.7} ${h * 0.4} S ${w * 0.94} ${h * 0.12}, ${w + 60} ${h * 0.3}" stroke="${c}" stroke-width="${h * 0.02}" opacity=".55"/>
  </g>`;

function eventArt(name) {
  const [a, b, c] = palettes[name];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a1024"/><stop offset=".55" stop-color="#101838"/><stop offset="1" stop-color="#08101f"/>
    </linearGradient>
    <radialGradient id="glow" cx=".3" cy=".2" r=".9">
      <stop offset="0" stop-color="${a}" stop-opacity=".38"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset=".5" stop-color="${a}"/><stop offset="1" stop-color="${b}" stop-opacity=".1"/>
    </linearGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${b}" stop-opacity="0"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}" stop-opacity=".2"/>
    </linearGradient>
    <linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${a}" stop-opacity=".15"/>
    </linearGradient>
    <filter id="blur" x="-20%" y="-40%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".035"/></feComponentTransfer></filter>
  </defs>
  <rect width="800" height="450" fill="url(#bg)"/>
  <rect width="800" height="450" fill="url(#glow)"/>
  <g opacity=".5">
    ${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="450" stroke="#8b96d6" stroke-opacity=".07"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="800" y2="${i * 60}" stroke="#8b96d6" stroke-opacity=".06"/>`).join('')}
  </g>
  ${waves('url(#g1)', 'url(#g2)', 'url(#g3)')}
  <rect width="800" height="450" fill="url(#bg)" opacity=".18"/>
  <rect width="800" height="450" filter="url(#grain)" opacity=".7"/>
</svg>`;
}

function vendorArt(name, motif) {
  const [a, b, c] = palettes[name];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img">
  <defs>
    <linearGradient id="vbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111a3f"/><stop offset="1" stop-color="#0a1024"/>
    </linearGradient>
    <radialGradient id="vglow" cx=".25" cy=".2" r=".9">
      <stop offset="0" stop-color="${a}" stop-opacity=".42"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vstroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${c}"/>
    </linearGradient>
    <filter id="vblur"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="400" height="400" fill="url(#vbg)"/>
  <rect width="400" height="400" fill="url(#vglow)"/>
  <circle cx="300" cy="320" r="110" fill="${b}" opacity=".16" filter="url(#vblur)"/>
  <g stroke="url(#vstroke)" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".9">
    ${motif}
  </g>
  <g stroke="#ffffff" stroke-opacity=".05" fill="none">
    <circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="118"/>
  </g>
</svg>`;
}

const motifs = {
  coffee: '<path d="M120 170h130v60a60 60 0 0 1-60 60h-10a60 60 0 0 1-60-60z"/><path d="M250 185h20a26 26 0 0 1 0 52h-20"/><path d="M160 130c0-16 12-16 12-32M200 130c0-16 12-16 12-32"/><path d="M120 300h170"/>',
  fashion: '<path d="M200 120v40"/><path d="M200 160 120 210l30 40 34-18v78h32v-78l34 18 30-40z"/><path d="M160 120a40 40 0 0 1 80 0"/>',
  tech: '<rect x="140" y="140" width="120" height="120" rx="12"/><rect x="175" y="175" width="50" height="50" rx="6"/><path d="M170 140v-30M200 140v-30M230 140v-30M170 260v30M200 260v30M230 260v30M140 170h-30M140 200h-30M140 230h-30M260 170h30M260 200h30M260 230h30"/>',
  art: '<path d="M120 260c40-20 60-90 90-120s70 20 70 60-30 30-40 60-10 60-40 60-60-20-80-20-30 10-40 10"/><circle cx="160" cy="150" r="14"/><path d="M280 110l30 30-70 70-30-30z"/>',
  food: '<path d="M110 200h180a90 90 0 0 1-90 90 90 90 0 0 1-90-90z"/><path d="M90 200h220"/><path d="M170 170c0-20 14-26 14-46M210 170c0-20 14-26 14-46"/><path d="M150 320h100"/>',
  merch: '<path d="M200 120l70 40-20 40-30-14v94h-40v-94l-30 14-20-40z"/><circle cx="200" cy="150" r="8"/>',
  books: '<rect x="120" y="240" width="160" height="30" rx="6"/><rect x="135" y="200" width="140" height="30" rx="6"/><rect x="150" y="160" width="120" height="30" rx="6"/><path d="M200 160v-20"/>',
};

const eventFiles = ['purple', 'magenta', 'cyan', 'amber', 'emerald'];
for (const name of eventFiles) {
  writeFileSync(join(outDir, `wave-${name}.svg`), eventArt(name), 'utf8');
}
const vendorPalettes = {
  coffee: 'amber',
  fashion: 'magenta',
  tech: 'cyan',
  art: 'purple',
  food: 'emerald',
  merch: 'magenta',
  books: 'emerald',
};
for (const [motifName, motif] of Object.entries(motifs)) {
  const palette = vendorPalettes[motifName] || 'purple';
  writeFileSync(join(outDir, `vendor-${motifName}.svg`), vendorArt(palette, motif), 'utf8');
}
console.log(`Wrote ${eventFiles.length + Object.keys(motifs).length} artwork files to assets/img/art/`);
