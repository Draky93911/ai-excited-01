// ai-excited-01 entry: "HOLD ON!" — a humpback whale bursts out of a cinema
// screen into the audience. This program copies the entry image beside it to
// $MAKEFUN_OUTPUT_DIR/entry.png, byte for byte, every time.
//
// Node 22+, standard library only, no network. Deterministic: the output is
// an exact copy of entry.png, so two runs always produce identical bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Gate limits enforced here before writing anything:
//   - entry.png must exist and start with the PNG magic bytes
//   - dimensions at most 1024 x 1024 pixels (read from the IHDR chunk)
//   - file size at most 1 MiB (1048576 bytes)

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? join(here, 'out');
const target = join(outDir, 'entry.png');

if (!existsSync(source)) {
  throw new Error(`entry image missing: ${source}`);
}

const bytes = readFileSync(source);
if (bytes.length > MAX_BYTES) {
  throw new Error(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
}
if (!bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
  throw new Error('entry.png does not start with the PNG magic bytes');
}
if (bytes.length < 33 || bytes.toString('latin1', 12, 16) !== 'IHDR') {
  throw new Error('entry.png has no readable PNG IHDR chunk');
}
const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
  throw new Error(`entry.png is ${width}x${height}, over the 1024x1024 limit`);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);

// Read the copy back and compare it byte for byte with the source, so a
// truncated or altered write can never pass silently.
const copied = readFileSync(target);
if (!copied.equals(bytes)) {
  throw new Error('output differs from entry.png after copy');
}

const written = statSync(target).size;
if (written !== bytes.length) {
  throw new Error(`wrote ${written} bytes, expected ${bytes.length}`);
}
console.log(`wrote ${target} (${width}x${height}, ${written} bytes)`);
