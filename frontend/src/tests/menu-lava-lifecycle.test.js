import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createGame } from '../game/engine.js';
import { render } from '../game/render.js';

vi.mock('../game/render.js', () => ({ render: vi.fn() }));

let pending;
let game;
const canvas = { width: 640, height: 520, getContext: () => ({ clearRect: vi.fn() }) };

beforeEach(() => {
  pending = new Map();
  let nextId = 0;
  vi.stubGlobal('requestAnimationFrame', callback => {
    pending.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', id => pending.delete(id));
});

afterEach(() => {
  game?.destroy();
  vi.mocked(render).mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function tick(time) {
  const callbacks = [...pending.values()];
  pending.clear();
  callbacks.forEach(callback => callback(time));
}

it('slides high-run lava below the viewport before removing it and leaves a clean title', () => {
  game = createGame(canvas, {}, { enableIntro: true, initialPhase: 'finished' });
  const state = game.getState();
  state.world.cameraY = -7000;
  state.world.lava.y = -6700;
  state.player.powerup.rocketTimer = 4;
  state.player.powerup.shieldTimer = 6;
  game.returnToTitleMenu();
  tick(0);
  expect(state.world.lava.y - state.world.cameraY).toBe(300);
  tick(325);
  const middleSurface = state.world.lava.y - state.world.cameraY;
  expect(middleSurface).toBeGreaterThan(450);
  expect(middleSurface).toBeLessThan(700);
  tick(650);
  expect(state.world.lava).toBeUndefined();
  expect(game.getPhase()).toBe('returning_title');
  tick(2400);
  expect(game.getPhase()).toBe('intro_title');
  expect(state.world.cameraY).toBe(-2400);
  expect(state.world.lava).toBeUndefined();
  expect(state.player.powerup.rocketTimer).toBe(0);
  expect(state.player.powerup.shieldTimer).toBe(0);
  expect(state.ui.returnTitleWorldY).toBeUndefined();
  expect(state.ui.returnDrawingTime).toBeUndefined();
  game.startFromTitle();
  expect(state.world.lava).toBeDefined();
  expect(state.world.lava.elapsed).toBe(0);
});

it('clears a lava surface above the viewport and handles an interrupted return/restart', () => {
  game = createGame(canvas, {}, { enableIntro: true, initialPhase: 'finished' });
  const state = game.getState();
  state.world.cameraY = -5000;
  state.world.lava.y = -12000;
  game.returnToTitleMenu();
  tick(0);
  tick(650);
  expect(state.world.lava).toBeUndefined();
  game.triggerRestartWipe();
  tick(700);
  tick(1160);
  expect(state.world.lava).toBeDefined();
  tick(1610);
  expect(game.getPhase()).toBe('warmup_hop');
  expect(state.ui.returnTitleWorldY).toBeUndefined();
  expect(state.ui.returnDrawingTime).toBeUndefined();
});

it('cleans lava and transient effects when reduced motion completes the menu return', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  game = createGame(canvas, {}, { enableIntro: true, initialPhase: 'paused' });
  const state = game.getState();
  state.world.cameraY = -5000;
  state.world.lava.y = -4800;
  state.ui.botEntrances = [{ botId: 'stale' }];
  game.returnToTitleMenu();
  tick(0);
  tick(100);
  expect(game.getPhase()).toBe('intro_title');
  expect(state.world.lava).toBeUndefined();

  expect(state.ui.returnTitleWorldY).toBeUndefined();
});

it.each([
  { reduced: true, before: [0, 16, 32, 48], resetAt: 64, duration: 100 },
  { reduced: false, before: [0, 300], resetAt: 700, duration: 900 },
  { reduced: false, before: [0], resetAt: 1500, duration: 900 },
])('renders a fully covered reset frame after skipped midpoint ($reduced, $resetAt ms)', ({ reduced, before, resetAt, duration }) => {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  const frames = [];
  vi.mocked(render).mockImplementation((context, state) => {
    frames.push({ world: state.world, phase: state.phase, progress: state.ui.wipeProgress });
  });
  game = createGame(canvas, {}, { enableIntro: true, initialPhase: 'finished' });
  const oldWorld = game.getState().world;
  game.triggerRestartWipe();
  before.forEach(tick);
  expect(game.getState().world).toBe(oldWorld);
  tick(resetAt);
  const newWorld = game.getState().world;
  expect(newWorld).not.toBe(oldWorld);
  expect(frames.at(-1)).toEqual({ world: newWorld, phase: 'wipe_reset', progress: 0.5 });
  tick(resetAt + duration / 4);
  expect(game.getState().world).toBe(newWorld);
  expect(frames.at(-1)).toEqual({ world: newWorld, phase: 'wipe_reset', progress: 0.75 });
  tick(resetAt + duration / 2);
  expect(game.getState().world).toBe(newWorld);
  expect(frames.at(-1)).toEqual({ world: newWorld, phase: 'warmup_hop', progress: 0 });
});
