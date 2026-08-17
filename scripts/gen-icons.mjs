/**
 * Icon generator: renders the muted-speaker mark to PNG at any size using
 * nothing but Node's zlib. No image dependencies, fully reproducible —
 * icons are build outputs, not checked-in binaries.
 *
 * The mark: white speaker glyph on a slate rounded square, red slash.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { crc32 } from "./lib/crc32.mjs";

// ---------------------------------------------------------------- palette
const BG = [30, 41, 59]; // slate-800
const GLYPH = [248, 250, 252]; // slate-50
const SLASH = [248, 113, 113]; // red-400

// ------------------------------------------------------------- geometry
// All shapes are defined in the unit square and tested per sample point.
const inRoundedSquare = (u, v) => {
  const margin = 0.04;
  const radius = 0.2;
  const x = Math.abs(u - 0.5) - (0.5 - margin - radius);
  const y = Math.abs(v - 0.5) - (0.5 - margin - radius);
  return Math.hypot(Math.max(x, 0), Math.max(y, 0)) <= radius;
};

// Speaker = driver box ∪ cone (narrow at the box, widening rightward).
const inSpeaker = (u, v) => {
  const inBox = u >= 0.2 && u <= 0.36 && v >= 0.4 && v <= 0.6;
  const inCone =
    u >= 0.32 &&
    u <= 0.62 &&
    Math.abs(v - 0.5) <= 0.1 + ((u - 0.32) / 0.3) * 0.16;
  return inBox || inCone;
};

// Diagonal bar, top-left to bottom-right, drawn over the glyph.
const inSlash = (u, v) => Math.abs(v - u) <= 0.05 && u > 0.16 && u < 0.84;

/** Color of one sample point, as [r, g, b, a]. */
function shade(u, v) {
  if (!inRoundedSquare(u, v)) return [0, 0, 0, 0];
  if (inSlash(u, v)) return [...SLASH, 255];
  if (inSpeaker(u, v)) return [...GLYPH, 255];
  return [...BG, 255];
}

// -------------------------------------------------------------- raster
/** Render one pixel by averaging a 4×4 supersample grid (cheap anti-alias). */
function renderPixel(x, y, size) {
  const sum = [0, 0, 0, 0];
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const sample = shade((x + (sx + 0.5) / 4) / size, (y + (sy + 0.5) / 4) / size);
      for (let c = 0; c < 4; c++) sum[c] += sample[c];
    }
  }
  return sum.map((total) => Math.round(total / 16));
}

// ----------------------------------------------------------- png writer
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Render the icon at `size` px and encode it as a PNG buffer. */
export function renderIconPng(size) {
  // Raw scanlines: filter byte 0 + RGBA per pixel.
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      raw.set(renderPixel(x, y, size), row + 1 + x * 4);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // bytes 10-12 (compression, filter, interlace) stay 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Standalone use: write PNGs into assets/ for store listings and docs.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL("../assets/icons/", import.meta.url));
  mkdirSync(out, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    writeFileSync(`${out}icon-${size}.png`, renderIconPng(size));
  }
  console.log(`wrote assets/icons/icon-{16,32,48,128}.png`);
}
