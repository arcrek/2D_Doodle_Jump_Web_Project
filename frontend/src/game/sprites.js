const sprites = new Map();

export const SKIN_PATHS = {
  doodle: '/images/skins/doodle.svg',
  red: '/images/skins/red.svg',
  purple: '/images/skins/purple.svg',
  blue: '/images/skins/blue.svg',
  gray: '/images/skins/gray.svg',
};

export const BOT_PATHS = {
  NOVICE: '/images/bots/son.png',
  STANDARD: '/images/bots/viet.png',
  SPEEDRUNNER: '/images/bots/hiep.png',
  PERFECT: '/images/bots/nam.png',
};

const PLATFORM_PATHS = {
  standard: '/images/skins/platform-standard.svg',
  moving: '/images/skins/platform-moving.svg',
  fragile: '/images/skins/platform-fragile.svg',
};

export function preloadSprites() {
  if (typeof Image === 'undefined') return;
  for (const path of [...Object.values(SKIN_PATHS), ...Object.values(BOT_PATHS), ...Object.values(PLATFORM_PATHS)]) {
    if (sprites.has(path)) continue;
    const image = new Image();
    const sprite = { image, ready: false, failed: false };
    sprites.set(path, sprite);
    image.onload = () => { sprite.ready = true; };
    image.onerror = () => { sprite.failed = true; };
    image.src = path;
  }
}

export function drawSprite(ctx, path, x, y, width, height, sourceRect) {
  const sprite = sprites.get(path);
  if (!sprite?.ready || typeof ctx.drawImage !== 'function') return false;
  if (sourceRect) {
    ctx.drawImage(sprite.image, ...sourceRect, x, y, width, height);
  } else {
    ctx.drawImage(sprite.image, x, y, width, height);
  }
  return true;
}

export function platformSprite(type) {
  return PLATFORM_PATHS[type] || PLATFORM_PATHS.standard;
}
