import { createElement, StrictMode } from 'react';
import { act, cleanup, render as mount } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createGame } from '../game/engine.js';
import { render } from '../game/render.js';
import GameCanvas from '../components/GameCanvas.jsx';

vi.mock('../game/render.js', () => ({ render: vi.fn() }));
// Isolate scheduling/input. Real physics integration has its own tests.
vi.mock('../game/physics.js', () => ({ applyPhysics: vi.fn(), handlePlatformCollisions: vi.fn(), handleScreenWrap: vi.fn() }));

let pending;
let canvas;
let context;

beforeEach(() => {
  pending = new Map();
  let nextId = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    pending.set(++nextId, callback);
    return nextId;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(id => pending.delete(id)));
  context = { clearRect: vi.fn() };
  canvas = { width: 640, height: 520, getContext: () => context };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function tick(time) {
  const callbacks = [...pending.values()];
  pending.clear();
  for (const callback of callbacks) callback(time);
}

it.each([30, 60, 144])('vẽ liên tục ở %i khung/giây mà không đổi vị trí nhân vật', fps => {
  const onFrame = vi.fn();
  const game = createGame(canvas, {}, { onFrame });
  tick(0);
  for (let index = 1; index <= fps; index += 1) {
    tick(index * 1000 / fps);
    expect(pending.size).toBe(1);
  }
  expect(render).toHaveBeenCalledTimes(fps + 1);
  expect(onFrame.mock.calls[0][0]).toEqual({ frameCount: 1, dt: 0 });
  const elapsed = onFrame.mock.calls.reduce((sum, [frame]) => sum + frame.dt, 0);
  expect(elapsed).toBeCloseTo(1, 6);
  expect(render.mock.lastCall[1].player).toMatchObject({
    x: 300, y: 388, width: 34, height: 42, vx: 0, vy: 0,
  });
  game.destroy();
});

it('nối bàn phím vào di chuyển ngang, dừng khi thả phím hoặc mất focus', () => {
  const game = createGame(canvas, {});
  tick(0);
  const player = render.mock.lastCall[1].player;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
  tick(25);
  expect(player.x).toBeCloseTo(301.125, 3);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
  tick(50);
  expect(player.x).toBeCloseTo(301.125, 3);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
  tick(75);
  expect(player.x).toBeCloseTo(300, 3);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
  tick(100);
  expect(player.x).toBeCloseTo(300, 3);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
  window.dispatchEvent(new Event('blur'));
  tick(125);
  expect(player.x).toBeCloseTo(300, 3);
  expect(player.y).toBe(388);
  const remove = vi.spyOn(window, 'removeEventListener');
  game.destroy();
  for (const event of ['keydown', 'keyup', 'blur']) expect(remove).toHaveBeenCalledWith(event, expect.any(Function));
});

it('giới hạn dt khi quay lại sau 10 giây và không cho dt âm', () => {
  const onFrame = vi.fn();
  const game = createGame(canvas, {}, { onFrame });
  tick(0);
  tick(10000);
  expect(onFrame.mock.lastCall[0].dt).toBe(1 / 30);
  tick(9999);
  expect(onFrame.mock.lastCall[0].dt).toBe(0);
  game.destroy();
});

it('destroy dừng cả khung đang chờ và không vẽ/báo số nữa', () => {
  const onFrame = vi.fn();
  const game = createGame(canvas, {}, { onFrame });
  tick(0);
  const lateCallback = [...pending.values()][0];
  game.destroy();
  game.destroy();
  lateCallback(16);
  expect(pending.size).toBe(0);
  expect(render).toHaveBeenCalledTimes(1);
  expect(onFrame).toHaveBeenCalledTimes(1);
  expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 640, 520);
});

it('đóng game ngay trong callback cũng không tạo khung mới', () => {
  let game;
  game = createGame(canvas, {}, { onFrame: () => game.destroy() });
  tick(0);
  expect(pending.size).toBe(0);
});

it('tạo và đóng 10 lần không để vòng lặp cũ chạy vào game mới', () => {
  const oldCallbacks = [];
  for (let index = 0; index < 10; index += 1) {
    const game = createGame(canvas, {});
    oldCallbacks.push([...pending.values()][0]);
    game.destroy();
    expect(pending.size).toBe(0);
  }
  const game = createGame(canvas, {});
  for (const callback of oldCallbacks) callback(1000);
  expect(render).not.toHaveBeenCalled();
  expect(pending.size).toBe(1);
  tick(1000);
  expect(render).toHaveBeenCalledTimes(1);
  game.destroy();
});

it('React StrictMode và cập nhật bộ đếm vẫn chỉ giữ một vòng lặp', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  const config = {};
  const view = mount(createElement(StrictMode, null,
    createElement(GameCanvas, { config, showLoopDemo: true }),
  ));
  expect(pending.size).toBe(1);
  act(() => tick(0));
  expect(view.getByLabelText('Số khung đã vẽ').textContent).toBe('1');
  for (let index = 1; index <= 19; index += 1) act(() => tick(index * 1000 / 60));
  expect(view.getByLabelText('Số khung đã vẽ').textContent).toBe('20');
  expect(render).toHaveBeenCalledTimes(20);
  expect(pending.size).toBe(1);
  view.unmount();
  expect(pending.size).toBe(0);
});

it('trượt 6 giây, hiện bệ đầu, chọn skin, cho nhân vật vào rồi chờ phím di chuyển', () => {
  const phases = [];
  const game = createGame(canvas, {}, { enableIntro: true, onPhaseChange: phase => phases.push(phase) });
  tick(0);
  expect(game.getState().world.platforms).toHaveLength(0);
  game.startFromTitle();
  game.startFromTitle();
  expect(game.getState().world.platforms.length).toBeGreaterThan(0);
  expect(game.getState().ui.platformReveal).toBe(0);
  expect(game.getState().bots).toHaveLength(0);
  tick(100);
  expect(game.getState().world.cameraY).toBe(-2400);
  tick(3100);
  expect(game.getState().world.cameraY).toBeCloseTo(-1200, 0);
  expect(game.getState().ui.platformReveal).toBe(0);
  expect(game.getState().ui.motionBlurPx).toBeGreaterThan(0);
  tick(6100);
  expect(game.getPhase()).toBe('intro_platform');
  expect(game.getState().world.cameraY).toBe(0);
  expect(game.getState().ui.motionBlurPx).toBe(0);
  tick(6600);
  expect(game.getPhase()).toBe('ready');
  game.setPlayerSkin('red');
  game.beginPlayerEntrance();
  expect(game.getPhase()).toBe('intro_player');
  tick(6700);
  tick(7150);
  expect(game.getState().ui.playerEntranceProgress).toBeCloseTo(0.5);
  tick(7600);
  expect(game.getPhase()).toBe('intro_reveal');
  tick(8500);
  expect(game.getState().ui.revealProgress).toBeCloseTo(0.5);
  tick(9400);
  expect(game.getPhase()).toBe('intro_wait_input');
  expect(game.getState().bots).toHaveLength(0);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
  expect(game.getPhase()).toBe('running');
  tick(9500);
  expect(game.getState().player.vx).toBeGreaterThan(0);
  expect(phases.filter(phase => phase === 'intro_sliding')).toHaveLength(1);
  game.destroy();
});

it('về màn tiêu đề sẽ dọn hết bệ và lần trượt tiếp theo mới sinh lại', () => {
  const game = createGame(canvas, {}, { enableIntro: true });
  tick(0);
  game.startFromTitle();
  tick(100);
  tick(6100);
  tick(6600);
  game.returnToTitleMenu();
  tick(6700);
  tick(7800);
  expect(game.getPhase()).toBe('intro_title');
  expect(game.getState().world.platforms).toHaveLength(0);
  game.startFromTitle();
  expect(game.getState().world.platforms.length).toBeGreaterThan(0);
  game.destroy();
});

it('wipe che kín trước khi thay thế thế giới và chỉ mở game sau khi wipe kết thúc', () => {
  const game = createGame(canvas, {});
  tick(0);
  const oldWorld = game.getState().world;
  game.triggerRestartWipe();
  tick(100);
  tick(390);
  expect(game.getState().world).toBe(oldWorld);
  tick(430);
  expect(game.getState().world).not.toBe(oldWorld);
  expect(game.getState().bots).toHaveLength(0);
  expect(game.getPhase()).toBe('wipe_reset');
  tick(760);
  expect(game.getPhase()).toBe('warmup_hop');
  game.destroy();
});

it('rút ngắn đoạn trượt và nhịp chờ khi bật giảm chuyển động', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const game = createGame(canvas, {}, { enableIntro: true });
  tick(0);
  game.startFromTitle();
  tick(100);
  tick(450);
  expect(game.getPhase()).toBe('intro_platform');
  expect(game.getState().ui.motionBlurPx).toBe(0);
  tick(550);
  expect(game.getPhase()).toBe('ready');
  game.beginPlayerEntrance();
  tick(600);
  tick(750);
  tick(900);
  expect(game.getPhase()).toBe('intro_wait_input');
  game.setDirection('right', true);
  expect(game.getPhase()).toBe('running');
  game.destroy();
});

it('bot vào ở giây 8/16/24/32 của lượt chơi, pause không tính giờ', () => {
  const game = createGame(canvas, {}, { enableIntro: true });
  tick(0);
  game.startFromTitle();
  tick(100);
  tick(6100);
  tick(6600);
  game.beginPlayerEntrance();
  tick(6700);
  tick(7600);
  tick(9400);
  game.setDirection('left', true);
  tick(9500);
  expect(game.getState().bots).toHaveLength(0);
  game.togglePause();
  tick(20000);
  expect(game.getState().bots).toHaveLength(0);
  game.togglePause();
  tick(28000);
  expect(game.getState().bots.map(bot => bot.name)).toEqual(['Thầy Sơn']);
  tick(36000);
  tick(44000);
  tick(52000);
  expect(game.getState().bots.map(bot => bot.name)).toEqual(['Thầy Sơn', 'Thầy Việt', 'Thầy Hiệp', 'Thầy Nam']);
  game.triggerRestartWipe();
  tick(53000);
  tick(53330);
  expect(game.getState().bots).toHaveLength(0);
  tick(53650);
  tick(54200);
  tick(54750);
  expect(game.getPhase()).toBe('running');
  tick(62749);
  expect(game.getState().bots).toHaveLength(0);
  tick(62751);
  expect(game.getState().bots.map(bot => bot.name)).toEqual(['Thầy Sơn']);
  game.destroy();
});

it('kết thúc một lần khi hết giờ và trả dữ liệu hợp lệ để lưu', () => {
  const onGameOver = vi.fn();
  const game = createGame(canvas, { max_duration_ms: 100, finish_height: 3000 }, { onGameOver });
  tick(0);
  tick(120);
  expect(game.getPhase()).toBe('finished');
  expect(onGameOver).toHaveBeenCalledTimes(1);
  expect(onGameOver.mock.calls[0][0]).toMatchObject({ elapsedMs: 100, outcome: 'dnf', reason: 'timeout' });
  tick(240);
  expect(onGameOver).toHaveBeenCalledTimes(1);
  game.destroy();
});
