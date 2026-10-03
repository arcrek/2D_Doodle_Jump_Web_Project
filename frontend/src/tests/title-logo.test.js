import { createElement } from 'react';
import { cleanup, fireEvent, render as mount, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TitleLogo from '../components/TitleLogo.jsx';

let images;
let sprites;
let title;
let art;
let renderer;

beforeEach(async () => {
  vi.resetModules();
  images = [];
  vi.stubGlobal('Image', class {
    constructor() { images.push(this); }
  });
  sprites = await import('../game/sprites.js');
  title = await import('../game/title-logo.js');
  art = await import('../game/doodle-art.js');
  renderer = await import('../game/render.js');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function context(canvas = {}) {
  return new Proxy({ canvas, globalAlpha: 1, measureText: () => ({ width: 10 }) }, {
    get(target, key) {
      if (!(key in target)) target[key] = vi.fn();
      return target[key];
    },
  });
}

function loadedLogo() {
  sprites.isSpriteReady(sprites.TITLE_LOGO_PATH);
  const image = images.find(item => item.src === sprites.TITLE_LOGO_PATH);
  image.onload();
  return image;
}

it('draws the original subtitle/stars, lettering and underline as three separate transparent layers', () => {
  const image = loadedLogo();
  const ctx = context();
  expect(title.drawTitleLogo(ctx, 320, 120, 0)).toBe(true);
  expect(ctx.drawImage).toHaveBeenCalledTimes(3);
  const crops = ctx.drawImage.mock.calls.map(([source, ...args]) => {
    expect(source).toBe(image);
    expect(args).toHaveLength(8);
    return args.slice(0, 4);
  });
  expect(new Set(crops.map(crop => JSON.stringify(crop))).size).toBe(3);
  expect(title.TITLE_LOGO.layers.map(layer => layer.name)).toEqual(['subtitle', 'letters', 'underline']);
  for (const [x, y, width, height] of crops) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(title.TITLE_LOGO.width);
    expect(y + height).toBeLessThanOrEqual(title.TITLE_LOGO.height);
  }
  expect(ctx.fillText).not.toHaveBeenCalled();
});

it('holds each drawing for 1/7.5 second and gives all three layers distinct pencil poses', () => {
  loadedLogo();
  const posesAt = time => {
    const ctx = context();
    title.drawTitleLogo(ctx, 320, 120, time);
    return { translation: ctx.translate.mock.calls, angles: ctx.rotate.mock.calls };
  };
  const first = posesAt(.01);
  expect(posesAt(.12)).toEqual(first);
  const next = posesAt(.134);
  for (let index = 0; index < 3; index += 1) {
    expect(next.translation[index]).not.toEqual(first.translation[index]);
    expect(next.angles[index]).not.toEqual(first.angles[index]);
  }
  expect(new Set(first.angles.map(([angle]) => angle)).size).toBe(3);
  expect(posesAt(0)).toEqual(posesAt(0));
});

it.each(['pending', 'failed'])('keeps a readable Canvas title while the image is %s', status => {
  const ctx = context();
  sprites.isSpriteReady(sprites.TITLE_LOGO_PATH);
  if (status === 'failed') images[0].onerror();
  art.drawDoodleTitle(ctx, 320, 120, 0);
  expect(ctx.drawImage).not.toHaveBeenCalled();
  expect(ctx.fillText.mock.calls.map(([text]) => text)).toContain('★ USTH WEB PROJECT ★');
  expect(ctx.fillText.mock.calls.map(([text]) => text)).toContain('DOODLE JUMP');
  expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
});

it('replaces the cached fallback if the logo finishes loading during camera travel', () => {
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const ink = context();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ink);
  const ctx = context({ width: 960, height: 540 });
  const state = { player: {}, world: { platforms: [], cameraY: -2400 }, bots: [],
    phase: 'intro_title', ui: { titleWorldY: -2040 } };
  renderer.render(ctx, state);
  expect(ink.fillText.mock.calls.map(([text]) => text)).toContain('DOODLE JUMP');
  expect(ink.drawImage).not.toHaveBeenCalled();
  state.phase = 'intro_sliding';
  clock = 200;
  state.world.cameraY = -2300;
  renderer.render(ctx, state);
  expect(ink.clearRect).toHaveBeenCalledTimes(1);
  images.find(item => item.src === sprites.TITLE_LOGO_PATH).onload();
  renderer.render(ctx, state);
  expect(ink.clearRect).toHaveBeenCalledTimes(2);
  expect(ink.drawImage).toHaveBeenCalledTimes(3);
  clock = 400;
  state.world.cameraY = -2200;
  renderer.render(ctx, state);
  expect(ink.clearRect).toHaveBeenCalledTimes(2);
  expect(ink.drawImage).toHaveBeenCalledTimes(3);
  expect(ctx.drawImage.mock.calls.at(-1).slice(1)).toEqual([0, 40]);
});

it('uses the zero-time held drawing for reduced motion even when the clock advances', () => {
  loadedLogo();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  let clock = 910;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const ink = context();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ink);
  const ctx = context({ width: 960, height: 540 });
  const state = { player: {}, world: { platforms: [], cameraY: -2400 }, bots: [],
    phase: 'intro_title', ui: { titleWorldY: -2040 } };
  renderer.render(ctx, state);
  const direct = context();
  title.drawTitleLogo(direct, 480, 120, 0);
  expect(ink.translate.mock.calls.slice(0, 3)).toEqual(direct.translate.mock.calls);
  expect(ink.rotate.mock.calls.slice(0, 3)).toEqual(direct.rotate.mock.calls);
  clock = 5100;
  renderer.render(ctx, state);
  expect(ink.clearRect).toHaveBeenCalledTimes(1);
});

it('keeps the menu heading readable while loading, accessible after load and readable after an image error', () => {
  const { container } = mount(createElement(TitleLogo));
  expect(screen.queryByRole('img')).toBeNull();
  expect(container.textContent).toContain('★ USTH WEB PROJECT ★');
  expect(container.textContent).toContain('DOODLE JUMP');
  fireEvent.load(container.querySelector('image'));
  expect(screen.getByRole('img', { name: /DOODLE JUMP.*USTH WEB PROJECT/ })).toBeTruthy();
  const layers = container.querySelectorAll('.title-logo-layer');
  expect(layers).toHaveLength(3);
  for (const layer of layers) expect(layer.getAttribute('overflow')).toBe('hidden');
  fireEvent.error(container.querySelector('image'));
  expect(screen.queryByRole('img')).toBeNull();
  expect(container.textContent).toContain('★ USTH WEB PROJECT ★');
  expect(container.textContent).toContain('DOODLE JUMP');
});
