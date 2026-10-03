// Small build-time integrity check. No image library or runtime overhead.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { BOT_SPRITE_SOURCE_HASHES, BOT_SPRITE_VARIANTS } from '../frontend/src/game/bot-sprite-variants.js';
import { BOT_PATHS } from '../frontend/src/game/sprites.js';
import { BOT_ENTRANCE_PROFILES } from '../frontend/src/game/bot-entrance.js';

const publicRoot = fileURLToPath(new URL('../frontend/public/', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  for (const [type, sourcePath] of Object.entries(BOT_PATHS)) {
    const source = await readFile(join(publicRoot, '.' + sourcePath));
    if (sha(source) !== BOT_SPRITE_SOURCE_HASHES[sourcePath]) throw new Error(`Master changed: ${sourcePath}`);
    const variants = BOT_SPRITE_VARIANTS[sourcePath];
    const expected = [[170, 130, 900, 1020], BOT_ENTRANCE_PROFILES[type].crop];
    if (!variants || variants.length !== 2) throw new Error(`Missing variants: ${sourcePath}`);
    for (const [i, variant] of variants.entries()) {
      if (JSON.stringify(expected[i]) !== JSON.stringify(variant.sourceRect)) throw new Error(`Crop changed: ${sourcePath}`);
      const bytes = await readFile(join(publicRoot, '.' + variant.path));
      if (!variant.path.endsWith(`-${sha(bytes).slice(0, 12)}.png`)) throw new Error(`Variant hash mismatch: ${variant.path}`);
      if (bytes.readUInt32BE(16) !== variant.width || bytes.readUInt32BE(20) !== variant.height) throw new Error(`Variant dimensions mismatch: ${variant.path}`);
    }
  }
  console.log('Bot asset masters, crops and 8 derivatives are in sync.');
} catch (error) {
  console.error(`${error.message}\nRebuild derivatives with node scripts/prepare-game-assets.mjs (sharp required; see docs/PERFORMANCE.md).`);
  process.exitCode = 1;
}
