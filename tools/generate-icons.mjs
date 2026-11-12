/**
 * Rasterises the brand SVGs into the PNG sizes required for PWA install prompts
 * and iOS home screens.
 *
 * Requires a build-time dependency (not used by the site at runtime):
 *   npm install --no-save sharp
 *   node tools/generate-icons.mjs
 *
 * The generated PNGs are committed, so this only needs to run when the logo
 * changes.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'assets', 'icons');
mkdirSync(iconsDir, { recursive: true });

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp is not installed. Run: npm install --no-save sharp');
  process.exit(1);
}

const jobs = [
  { src: 'logo.svg', out: 'icon-192.png', size: 192 },
  { src: 'logo.svg', out: 'icon-512.png', size: 512 },
  { src: 'logo.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'logo-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
];

for (const job of jobs) {
  const svg = readFileSync(join(iconsDir, job.src));
  const png = await sharp(svg, { density: 384 }).resize(job.size, job.size).png().toBuffer();
  writeFileSync(join(iconsDir, job.out), png);
  console.log(`wrote ${job.out} (${png.length} bytes)`);
}
