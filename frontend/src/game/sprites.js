
const sprites = new Map();

export const LAVA_PATH = '/Lava.jpg';
export const TITLE_LOGO_PATH = '/images/doodle-jump-logo.png';
export const LAVA_FLAME_PATH = '/images/lava-flames.png';

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

export const POWERUP_PATHS = {
  rocket: '/images/powerups/rocket.png',
  shield: '/images/powerups/shield.png',
};

export const POWERUP_EFFECT_PATHS = {
  shield: '/images/powerups/shield-aura.png',
  rocket: '/images/powerups/jet-flame.png',
};

function loadSprite(path) {
  if (sprites.has(path)) return sprites.get(path);
  if (typeof Image === 'undefined') return undefined;
  const image = new Image();
  image.decoding = 'async';
  const sprite = { image, ready: false, failed: false };
  sprites.set(path, sprite);
  image.onload = () => {
    sprite.ready = true;
    image.onload = image.onerror = null;
  };
  image.onerror = () => {
    sprite.failed = true;
    image.onload = image.onerror = null;
  };
  image.src = path;
  return sprite;
}

export function preloadSprites() {
  if (typeof Image === 'undefined') return;
  for (const path of [
    ...Object.values(SKIN_PATHS),
    ...Object.values(BOT_PATHS),
    ...Object.values(PLATFORM_PATHS),
    ...Object.values(POWERUP_PATHS),
    ...Object.values(POWERUP_EFFECT_PATHS),
    LAVA_PATH,
    TITLE_LOGO_PATH,
    LAVA_FLAME_PATH,
  ]) {
    loadSprite(path);
  }
}

export function isSpriteReady(path) {
  return Boolean(loadSprite(path)?.ready);
}

export function drawSprite(ctx, path, x, y, width, height, sourceRect) {
  if (!path) return false;
  const sprite = loadSprite(path);
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
