/**
 * Minimal QR Code encoder (byte mode, error-correction level M, versions 1–10).
 * Used only by the launch page to generate a QR code for a confirmed URL.
 *
 * Follows ISO/IEC 18004: mode indicator, character count, Reed–Solomon blocks,
 * interleaving, function patterns, format/version information and masking.
 * Everything runs locally — no QR service and no network request.
 */

/* EC level M tables: [ecCodewordsPerBlock, blocksGroup1, dataPerBlock1, blocksGroup2, dataPerBlock2] */
const EC_M = {
  1: [10, 1, 16, 0, 0],
  2: [16, 1, 28, 0, 0],
  3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0],
  6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0],
  8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44],
};

const ALIGN = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

/* ---------------- GF(256) / Reed–Solomon ---------------- */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const rem = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.shift();
    rem.push(0);
    for (let i = 0; i < degree; i++) rem[i] ^= mul(gen[i + 1], factor);
  }
  return rem;
}

/* ---------------- bit buffer ---------------- */

class BitBuffer {
  constructor() {
    this.bits = [];
  }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() {
    return this.bits.length;
  }
}

/* ---------------- encoding ---------------- */

function chooseVersion(byteLength) {
  for (let v = 1; v <= 10; v++) {
    const [, b1, d1, b2, d2] = EC_M[v];
    const dataCodewords = b1 * d1 + b2 * d2;
    const countBits = v <= 9 ? 8 : 16;
    const needed = 4 + countBits + byteLength * 8;
    if (needed <= dataCodewords * 8) return { version: v, countBits, dataCodewords };
  }
  throw new Error('This URL is too long for the built-in QR encoder (max ~210 characters). Use a short URL.');
}

function buildCodewords(bytes, version, countBits, dataCodewords) {
  const bb = new BitBuffer();
  bb.put(0b0100, 4);
  bb.put(bytes.length, countBits);
  for (const b of bytes) bb.put(b, 8);

  const capacity = dataCodewords * 8;
  bb.put(0, Math.min(4, capacity - bb.length));
  while (bb.length % 8 !== 0) bb.bits.push(0);

  const data = [];
  for (let i = 0; i < bb.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
    data.push(byte);
  }
  for (let pad = 0xec; data.length < dataCodewords; pad ^= 0xec ^ 0x11) data.push(pad);
  return data;
}

function interleave(data, version) {
  const [ecLen, b1, d1, b2, d2] = EC_M[version];
  const blocks = [];
  let offset = 0;
  for (let i = 0; i < b1 + b2; i++) {
    const len = i < b1 ? d1 : d2;
    const chunk = data.slice(offset, offset + len);
    offset += len;
    blocks.push({ data: chunk, ec: rsRemainder(chunk, ecLen) });
  }

  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) if (i < block.data.length) out.push(block.data[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of blocks) out.push(block.ec[i]);
  }
  return out;
}

/* ---------------- matrix ---------------- */

function bchFormat(ecBits, mask) {
  const data = (ecBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersion(version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

export function qrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text));
  const { version, countBits, dataCodewords } = chooseVersion(bytes.length);
  const size = 17 + 4 * version;
  const codewords = interleave(buildCodewords(bytes, version, countBits, dataCodewords), version);

  const bits = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
  for (let i = 0; i < REMAINDER_BITS[version]; i++) bits.push(0);

  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));

  const setF = (x, y, dark) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    m[y][x] = !!dark;
    fn[y][x] = true;
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setF(6, i, i % 2 === 0);
    setF(i, 6, i % 2 === 0);
  }

  // Finder patterns + separators
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        setF(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // Alignment patterns
  const centers = ALIGN[version];
  for (const cy of centers) {
    for (const cx of centers) {
      const nearFinder =
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === size - 7) ||
        (cx === size - 7 && cy === 6);
      if (nearFinder) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setF(cx + dx, cy + dy, dist !== 1);
        }
      }
    }
  }

  // Reserve format areas (values written after masking; true = function module)
  for (let i = 0; i <= 8; i++) {
    setF(8, i, false);
    setF(i, 8, false);
  }
  for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, false);
  for (let i = 0; i < 7; i++) setF(8, size - 1 - i, false);
  setF(8, size - 8, true);

  // Version information (v7+)
  if (version >= 7) {
    const vbits = bchVersion(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vbits >>> i) & 1) === 1;
      const row = Math.floor(i / 3);
      const col = (i % 3) + size - 11;
      setF(col, row, bit);
      setF(row, col, bit);
    }
  }

  // Data placement (two-column zigzag from bottom-right)
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && idx < bits.length) {
          m[y][x] = bits[idx] === 1;
          idx++;
        }
      }
    }
  }

  // Mask 0: (x + y) % 2 === 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!fn[y][x] && (x + y) % 2 === 0) m[y][x] = !m[y][x];
    }
  }

  // Format information (EC level M = 0b00, mask 0)
  const format = bchFormat(0b00, 0);
  const bit = (n) => ((format >>> n) & 1) === 1;
  for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
  setF(8, 7, bit(6));
  setF(8, 8, bit(7));
  setF(7, 8, bit(8));
  for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
  setF(8, size - 8, true);

  return { size, modules: m };
}

/** Draws a QR code onto a canvas with a quiet zone. */
export function drawQR(canvas, text, { scale = 6, quiet = 4, dark = '#0b1129', light = '#ffffff' } = {}) {
  const { size, modules } = qrMatrix(text);
  const px = (size + quiet * 2) * scale;
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = dark;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) {
        ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
  }
  return { size: px, count: size };
}
