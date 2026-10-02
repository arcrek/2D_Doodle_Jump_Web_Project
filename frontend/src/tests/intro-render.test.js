import { afterEach, expect, it, vi } from 'vitest';
import { render } from '../game/render.js';

afterEach(() => vi.restoreAllMocks());

function context(canvas) {
  const gradient = { addColorStop: vi.fn() };
  return new Proxy({ canvas, globalAlpha: 1, measureText: () => ({ width: 10 }), createLinearGradient: vi.fn(() => gradient) }, {
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

it('phase-gates lava rendering so lava and warning badges are suppressed outside gameplay', () => {
  const ctx = context({ width: 640, height: 520 });
  const lava = { y: 100, speed: 40, elapsed: 10 };
  const player = { x: 300, y: 120, width: 34, height: 42 };

  // Phase 'ready': không được vẽ dung nham dù dung nham đang ở gần người chơi
  const readyState = {
    player,
    world: { platforms: [], cameraY: 0, lava },
    bots: [],
    phase: 'ready',
    ui: {},
  };
  render(ctx, readyState);
  expect(ctx.createLinearGradient).not.toHaveBeenCalled();
  const readyTexts = ctx.fillText.mock.calls.map(c => c[0]);
  expect(readyTexts.some(t => typeof t === 'string' && t.includes('DUNG NHAM'))).toBe(false);

  // Phase 'intro_title': không được vẽ dung nham
  const introState = { ...readyState, phase: 'intro_title' };
  render(ctx, introState);
  expect(ctx.createLinearGradient).not.toHaveBeenCalled();

  // Phase 'running': được vẽ dung nham và gradient cảnh báo
  const runningState = { ...readyState, phase: 'running' };
  render(ctx, runningState);
  expect(ctx.createLinearGradient).toHaveBeenCalled();
  const runningTexts = ctx.fillText.mock.calls.map(c => c[0]);
  expect(runningTexts.some(t => typeof t === 'string' && t.includes('DUNG NHAM'))).toBe(true);
});

