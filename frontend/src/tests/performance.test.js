import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BOT_SPRITE_VARIANTS } from '../game/bot-sprite-variants.js';
import { render } from '../game/render.js';
import { drawDoodleTitle, drawDoodleStartButton } from '../game/doodle-art.js';

let images;
let sprites;

beforeEach(async () => {
  vi.resetModules();
  images = [];
  vi.stubGlobal('Image', class {
    constructor() { images.push(this); }
  });
  sprites = await import('../game/sprites.js');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('preloads derivative bot images without decoding masters and reuses pending/loaded entries', () => {
  sprites.preloadSprites();
  const paths = images.map(image => image.src);
  const derivatives = Object.values(BOT_SPRITE_VARIANTS).flat().map(item => item.path);
  for (const path of derivatives) expect(paths).toContain(path);
  for (const path of Object.values(sprites.BOT_PATHS)) expect(paths).not.toContain(path);
  expect(new Set(paths).size).toBe(paths.length);
  sprites.preloadSprites();
  expect(images.map(image => image.src)).toEqual(paths);
  for (const image of images) image.onload();
  sprites.preloadSprites();
  expect(images.map(image => image.src)).toEqual(paths);
});

it.each(Object.entries(BOT_SPRITE_VARIANTS).flatMap(([master, variants]) => (
  variants.map(variant => [master, variant])
)))('known crop of %s draws its derivative at the unchanged destination', (master, variant) => {
  const ctx = { drawImage: vi.fn() };
  const destination = [12, -38, 44, 51];
  expect(sprites.drawSprite(ctx, master, ...destination, [...variant.sourceRect])).toBe(false);
  expect(images.map(image => image.src)).toEqual([variant.path]);
  expect(ctx.drawImage).not.toHaveBeenCalled();
  images[0].onload();
  expect(sprites.drawSprite(ctx, master, ...destination, [...variant.sourceRect])).toBe(true);
  const localCrop = variant.drawRect ?? [];
  expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(images[0], ...localCrop, ...destination);
  expect(images).toHaveLength(1);
});

it('arbitrary source crops keep the original image and coordinates', () => {
  const ctx = { drawImage: vi.fn() };
  const master = sprites.BOT_PATHS.NOVICE;
  const source = [1, 2, 200, 210];
  expect(sprites.drawSprite(ctx, master, 10, 20, 30, 40, source)).toBe(false);
  expect(images[0].src).toBe(master);
  images[0].onload();
  expect(sprites.drawSprite(ctx, master, 10, 20, 30, 40, source)).toBe(true);
  expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(images[0], ...source, 10, 20, 30, 40);
});

it('a failed derivative loads the master once and preserves crop fallback', () => {
  const ctx = { drawImage: vi.fn() };
  const master = sprites.BOT_PATHS.PERFECT;
  const variant = BOT_SPRITE_VARIANTS[master][0];
  sprites.drawSprite(ctx, master, 1, 2, 3, 4, variant.sourceRect);
  images[0].onerror();
  expect(sprites.drawSprite(ctx, master, 1, 2, 3, 4, variant.sourceRect)).toBe(false);
  expect(images.map(image => image.src)).toEqual([variant.path, master]);
  sprites.preloadSprites();
  sprites.drawSprite(ctx, master, 1, 2, 3, 4, variant.sourceRect);
  expect(images.filter(image => image.src === master)).toHaveLength(1);
  expect(images.filter(image => image.src === variant.path)).toHaveLength(1);
  images[1].onload();
  expect(sprites.drawSprite(ctx, master, 1, 2, 3, 4, variant.sourceRect)).toBe(true);
  expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(images[1], ...variant.sourceRect, 1, 2, 3, 4);
});

function drawingContext(canvas) {
  const operations = [];
  return new Proxy({ canvas, operations, globalAlpha: 1, measureText: () => ({ width: 10 }) }, {
    get(target, key) {
      if (!(key in target)) target[key] = vi.fn((...args) => operations.push([key, ...args]));
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      if (key !== 'operations') operations.push(['set', key, value]);
      return true;
    },
  });
}

it('reuses one title surface across held poses and paints each changed pose with the original artwork', () => {
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const surface = document.createElement('canvas');
  const ink = drawingContext(surface);
  vi.spyOn(surface, 'getContext').mockReturnValue(ink);
  const createCanvas = vi.spyOn(document, 'createElement').mockReturnValue(surface);
  const ctx = drawingContext({ width: 960, height: 540 });
  const state = { player: {}, world: { platforms: [], cameraY: -2400 }, bots: [], phase: 'intro_title', ui: { titleWorldY: -2040 } };

  const assertArtwork = (time, hovered) => {
    const direct = drawingContext({});
    direct.clearRect(0, 0, 960, 280);
    drawDoodleTitle(direct, 480, 120, time);
    drawDoodleStartButton(direct, { x: 370, y: 190, width: 220, height: 50 }, hovered, time);
    expect(ink.operations).toEqual(direct.operations);
  };
  render(ctx, state);
  assertArtwork(0, false);
  const firstPose = ink.operations.slice();
  clock = 50;
  render(ctx, state);
  expect(ink.operations).toEqual(firstPose);
  for (const time of [200, 400, 800]) {
    clock = time;
    ink.operations.length = 0;
    render(ctx, state);
    assertArtwork(time / 1000, false);
  }
  ink.operations.length = 0;
  state.ui.isStartButtonHovered = true;
  render(ctx, state);
  assertArtwork(0.8, true);
  const heldPose = ink.operations.slice();
  state.phase = 'intro_sliding';
  state.ui.motionBlurPx = 5;
  state.world.cameraY = -2300;
  clock = 1000;
  render(ctx, state);
  expect(ink.operations).toEqual(heldPose);
  expect(createCanvas).toHaveBeenCalledTimes(1);
  expect(surface.width).toBe(960);
  expect(surface.height).toBe(280);
  expect(ctx.drawImage.mock.calls.at(-1)).toEqual([surface, 0, 140]);
  expect(ctx.operations).toContainEqual(['set', 'filter', 'blur(5px)']);
});
