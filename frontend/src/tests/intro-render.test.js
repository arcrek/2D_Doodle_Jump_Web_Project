import { afterEach, expect, it, vi } from 'vitest';
import { render } from '../game/render.js';

afterEach(() => vi.restoreAllMocks());

function context(canvas) {
  return new Proxy({ canvas, globalAlpha: 1, measureText: () => ({ width: 10 }) }, {
    get(target, key) {
      if (!(key in target)) target[key] = vi.fn();
      return target[key];
    },
  });
}

it('reuses title ink during camera travel and blurs only the composed image', () => {
  const canvas = { width: 1280, height: 720 };
  const ctx = context(canvas);
  const ink = context({});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ink);
  const state = { player: {}, world: { platforms: [], cameraY: -2400 }, bots: [], phase: 'intro_title', ui: { titleWorldY: -2040 } };
  render(ctx, state);
  const pencilMarks = ink.fillRect.mock.calls.length;
  expect(pencilMarks).toBeGreaterThan(0);
  state.phase = 'intro_sliding';
  state.ui.motionBlurPx = 5;
  state.world.cameraY = -2300;
  render(ctx, state);
  state.world.cameraY = -2200;
  render(ctx, state);
  expect(ink.fillRect.mock.calls.length).toBe(pencilMarks);
  expect(ink.filter).not.toBe('blur(5px)');
  expect(ctx.drawImage).toHaveBeenCalledTimes(3);
});

it('draws the anchored title before the returning camera finishes, at its world position', () => {
  const ctx = context({ width: 1280, height: 720 });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context({}));
  const state = { player: { x: 300, y: 400, width: 34, height: 42 },
    world: { platforms: [], cameraY: -1000 }, bots: [], phase: 'returning_title',
    ui: { returnTitleWorldY: -3140, titleWorldY: -2140, returnDrawingTime: 0 } };
  render(ctx, state);
  expect(ctx.drawImage).not.toHaveBeenCalled();
  state.world.cameraY = -3200;
  render(ctx, state);
  expect(ctx.drawImage.mock.calls.at(-1).slice(1)).toEqual([0, -60]);
  state.world.cameraY = -3400;
  render(ctx, state);
  expect(ctx.drawImage.mock.calls.at(-1).slice(1)).toEqual([0, 140]);
});
