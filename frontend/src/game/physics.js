// Canvas coordinates: positive Y points down. Horizontal movement belongs to FE-01.
import { isLandingOnPlatform, checkAABB } from './collision.js';

export const GRAVITY = 1200;
export const MAX_VY = 900;
export const JUMP_VELOCITY = -520;

export const Kinematics = {
  velocityAt: (v0, g, t) => v0 + g * t,
  positionAt: (y0, v0, g, t) => y0 + v0 * t + 0.5 * g * t * t,
  peakTime: (v0, g) => Math.abs(v0) / g,
  maxHeight: (v0, g) => (v0 * v0) / (2 * g),
  airTime: (v0, g) => (2 * Math.abs(v0)) / g,
};

export function applyPhysics(player, dt) {
  player.prevY = player.y;
  player.vy = Math.min(MAX_VY, player.vy + GRAVITY * dt);
  player.y += player.vy * dt;
}

export function handlePlatformCollisions(player, platforms, onBounce = null) {
  // Khi rơi qua nhiều bệ trong một frame, chạm bệ cao nhất trước (tọa độ y nhỏ nhất).
  let landing = null;
  for (const platform of platforms) {
    if (platform.broken || !isLandingOnPlatform(player, platform)) continue;
    if (!landing || platform.y < landing.y) landing = platform;
  }
  if (!landing) return null;

  const bounceMultiplier = landing.type === 'bouncy'
    ? (landing.bounceMultiplier || 1.45)
    : 1;
  player.y = landing.y - player.height;
  player.vy = JUMP_VELOCITY * bounceMultiplier;

  if (landing.type === 'fragile' || landing.type === 'breakable') {
    landing.broken = true;
  }

  if (typeof onBounce === 'function') {
    onBounce(player, landing);
  }

  return landing;
}

export function handleScreenWrap(player, width) {
  if (player.x > width) player.x = -player.width;
  else if (player.x + player.width < 0) player.x = width;
}

export function detectCollision(rectA, rectB) {
  return checkAABB(rectA, rectB);
}
