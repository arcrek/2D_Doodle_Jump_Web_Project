import { afterEach, expect, it, vi } from 'vitest';
import { renderPowerups } from '../game/mechanics.js';
import { drawSprite, POWERUP_EFFECT_PATHS } from '../game/sprites.js';

vi.mock('../game/sprites.js', async original => ({ ...await original(), drawSprite: vi.fn(() => true) }));
afterEach(() => vi.clearAllMocks());
const player = { x: 100, y: 200, width: 34, height: 42, powerup: { rocketTimer: 2, shieldTimer: 4 } };
function context() {
  return new Proxy({ globalAlpha: 1 }, {
    get(object, key) { return key in object ? object[key] : (object[key] = vi.fn()); },
  });
}

it('holds identical artwork within a stop-motion frame and follows the player feet', () => {
  const ctx = context();
  renderPowerups(ctx, null, player, 80, 1.01);
  const first = structuredClone(drawSprite.mock.calls.map(call => call.slice(1)));
  expect(ctx.translate).toHaveBeenCalledWith(117, 159);
  vi.clearAllMocks();
  renderPowerups(ctx, null, player, 80, 1.04);
  expect(drawSprite.mock.calls.map(call => call.slice(1))).toEqual(first);
  expect(first.map(call => call[0])).toEqual([POWERUP_EFFECT_PATHS.rocket, POWERUP_EFFECT_PATHS.shield]);
});

it('removes both effects immediately when powerups expire', () => {
  renderPowerups(context(), null, { ...player, powerup: { rocketTimer: 0, shieldTimer: 0 } }, 0, 2);
  expect(drawSprite).not.toHaveBeenCalled();
});

it('draws a hollow shield fallback without an opaque disc when art is unavailable', () => {
  drawSprite.mockReturnValueOnce(false);
  const ctx = context();
  renderPowerups(ctx, null, { ...player, powerup: { shieldTimer: 3 } }, 0, 0);
  expect(ctx.stroke).toHaveBeenCalledTimes(2);
  expect(ctx.fill).not.toHaveBeenCalled();
});
