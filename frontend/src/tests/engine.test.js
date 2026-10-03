import { createElement, StrictMode } from 'react';
import { act, cleanup, render as mount } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createGame } from '../game/engine.js';
import { SCREEN_HEIGHT } from '../game/world.js';
import { LAVA_INITIAL_Y } from '../game/index.js';
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

it('trượt mềm trong 2,4 giây, chờ menu rồi hiện bệ sau khi chọn skin', () => {
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
  tick(1300);
  // Supplied checkpoints and control points are rounded independently.
  expect(game.getState().world.cameraY).toBeCloseTo(-2400 + 24 * 53.625664, 2);
  expect(game.getState().ui.platformReveal).toBe(0);
  expect(game.getState().ui.motionBlurPx).toBeGreaterThan(0);
  tick(2440.22);
  expect(game.getState().world.cameraY).toBeCloseTo(24 * 0.060694, 2);
  expect(game.getState().ui.motionBlurPx).toBeGreaterThanOrEqual(0);
  tick(2500);
  expect(game.getPhase()).toBe('intro_menu_delay');
  expect(game.getState().world.cameraY).toBe(0);
  expect(game.getState().ui.motionBlurPx).toBe(0);
  tick(2999);
  expect(game.getPhase()).toBe('intro_menu_delay');
  tick(3000);
  expect(game.getPhase()).toBe('ready');
  expect(game.getState().ui.platformReveal).toBe(0);
  game.setPlayerSkin('red');
  game.beginPlayerEntrance();
  expect(game.getPhase()).toBe('intro_platform');
  tick(3100);
  tick(3350);
  expect(game.getState().ui.platformReveal).toBeCloseTo(0.5);
  tick(3600);
  expect(game.getPhase()).toBe('intro_player');
  tick(3700);
  tick(4150);
  expect(game.getState().ui.playerEntranceProgress).toBeCloseTo(0.5);
  tick(4600);
  expect(game.getPhase()).toBe('intro_reveal');
  tick(5500);
  expect(game.getState().ui.revealProgress).toBeCloseTo(0.5);
  tick(6400);
  expect(game.getPhase()).toBe('intro_wait_input');
  expect(game.getState().bots).toHaveLength(0);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
  expect(game.getPhase()).toBe('running');
  tick(6500);
  expect(game.getState().player.vx).toBeGreaterThan(0);
  expect(phases.filter(phase => phase === 'intro_sliding')).toHaveLength(1);
  game.destroy();
});

it('đóng băng bệ đang thấy khi trượt lên, chỉ dọn hết khi đã ra khỏi màn hình', () => {
  const game = createGame(canvas, {}, { enableIntro: true });
  tick(0);
  game.startFromTitle();
  tick(100);
  tick(6100);
  tick(6600);
  const initialCamera = game.getState().world.cameraY;
  const visible = game.getState().world.platforms.filter(p => !p.broken && p.y + p.height >= initialCamera - 12 && p.y <= initialCamera + SCREEN_HEIGHT + 12);
  expect(visible.length).toBeGreaterThan(0);
  game.returnToTitleMenu();
  expect(game.getPhase()).toBe('returning_title');
  expect(game.getState().world.platforms).toEqual(visible);
  const frozenPositions = visible.map(p => [p.x, p.y]);
  const returnTitleY = game.getState().ui.returnTitleWorldY;
  expect(returnTitleY - initialCamera).toBeLessThan(-160);
  tick(6700);
  tick(7100);
  expect(game.getPhase()).toBe('returning_title');
  expect(game.getState().world.platforms.map(p => [p.x, p.y])).toEqual(frozenPositions);
  expect(game.getState().world.cameraY).toBeLessThan(initialCamera);
  tick(8900);
  const enteringTitleY = returnTitleY - game.getState().world.cameraY;
  expect(enteringTitleY).toBeGreaterThan(0);
  expect(enteringTitleY).toBeLessThan(game.getState().ui.titleWorldY + 2400);
  tick(9100);
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
  tick(550);
  expect(game.getState().world).not.toBe(oldWorld);
  expect(game.getState().bots).toHaveLength(0);
  expect(game.getPhase()).toBe('wipe_reset');
  tick(1010);
  expect(game.getPhase()).toBe('warmup_hop');
  game.destroy();
});

it('rút ngắn đoạn trượt và nhịp chờ khi bật giảm chuyển độment', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const game = createGame(canvas, {}, { enableIntro: true });
  tick(0);
  game.startFromTitle();
  tick(100);
  tick(450);
  expect(game.getPhase()).toBe('intro_menu_delay');
  expect(game.getState().ui.motionBlurPx).toBe(0);
  tick(950);
  expect(game.getPhase()).toBe('ready');
  game.beginPlayerEntrance();
  tick(1000);
  tick(1100);
  tick(1150);
  tick(1300);
  tick(1450);
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
  tick(7200);
  tick(7300);
  tick(8200);
  tick(10000);
  game.setDirection('left', true);
  tick(10100);
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
  tick(53450);
  expect(game.getState().bots).toHaveLength(0);
  tick(53900);
  tick(54450);
  tick(55000);
  expect(game.getPhase()).toBe('running');
  tick(62999);
  expect(game.getState().bots).toHaveLength(0);
  tick(63001);
  expect(game.getState().bots.map(bot => bot.name)).toEqual(['Thầy Sơn']);
  game.destroy();
});

it('chế độ endless không bị giới hạn thời gian 180s và ghi nhận elapsedMs chính xác', () => {
  const onGameOver = vi.fn();
  const game = createGame(canvas, { isEndless: true }, { onGameOver });
  tick(0);
  // Mô phỏng chơi qua 185s (> 180s)
  tick(185000);
  expect(game.getPhase()).toBe('running');
  expect(onGameOver).not.toHaveBeenCalled();

  // Khi game kết thúc do chạm dung nham
  const state = game.getState();
  state.world.lava.y = state.player.y;
  tick(185016);

  expect(game.getPhase()).toBe('finished');
  expect(onGameOver).toHaveBeenCalledTimes(1);
  expect(onGameOver.mock.calls[0][0]).toMatchObject({
    outcome: 'dnf',
    reason: 'lava',
  });
  expect(onGameOver.mock.calls[0][0].elapsedMs).toBeGreaterThanOrEqual(185000);
  game.destroy();
});

it('engine preserves visible lava until replay coverage or animated menu exit', () => {
  const game = createGame(canvas, { isEndless: true }, { enableIntro: true });
  tick(0);
  const state = game.getState();
  expect(state.world.lava).toBeDefined();

  // Giả lập dung nham dâng cao
  state.world.lava.y = -1000;
  expect(state.world.lava.y).toBe(-1000);

  // Kích hoạt restart wipe
  game.triggerRestartWipe();
  expect(state.world.lava.y).toBe(-1000);

  // Giả lập tiếp tục dâng cao
  state.world.lava.y = -2000;
  expect(state.world.lava.y).toBe(-2000);

  // Kích hoạt về menu
  game.returnToTitleMenu();
  expect(state.world.lava.y).toBe(-2000);

  game.destroy();
});

it('engine cleans up lava state when returning_title completes', () => {
  const game = createGame(canvas, { isEndless: true }, { enableIntro: false });
  tick(0);
  expect(game.getPhase()).toBe('running');
  const state = game.getState();
  game.returnToTitleMenu();
  expect(game.getPhase()).toBe('returning_title');

  // Đổi lava.y trong khi đang returning
  state.world.lava.y = -500;
  // Nhịp đầu để gán returnStartTime, nhịp sau để vượt qua RETURN_DURATION_MS (2400ms)
  tick(100);
  tick(2600);
  expect(game.getPhase()).toBe('intro_title');
  expect(state.world.lava).toBeUndefined();

  game.destroy();
});

it('engine guards lavaDistance in snapshot and only exposes it in gameplay phases', () => {
  // 1. Kiểm tra màn hình menu và intro: lavaDistance luôn là null
  const introGame = createGame(canvas, { isEndless: true }, { enableIntro: true });
  tick(0);
  expect(introGame.getPhase()).toBe('intro_title');
  expect(introGame.getSnapshot().lavaDistance).toBeNull();

  introGame.startFromTitle();
  tick(100);
  tick(2500);
  expect(introGame.getPhase()).toBe('intro_menu_delay');
  expect(introGame.getSnapshot().lavaDistance).toBeNull();

  tick(3000);
  expect(introGame.getPhase()).toBe('ready');
  expect(introGame.getSnapshot().lavaDistance).toBeNull();
  introGame.destroy();

  // 2. Kiểm tra gameplay phases: running, paused -> có số; wipe_reset, returning_title -> null
  const game = createGame(canvas, { isEndless: true }, { enableIntro: false });
  tick(0);
  expect(game.getPhase()).toBe('running');
  expect(typeof game.getSnapshot().lavaDistance).toBe('number');

  game.togglePause();
  expect(game.getPhase()).toBe('paused');
  expect(typeof game.getSnapshot().lavaDistance).toBe('number');

  game.togglePause();
  expect(game.getPhase()).toBe('running');

  game.triggerRestartWipe();
  expect(game.getPhase()).toBe('wipe_reset');
  expect(game.getSnapshot().lavaDistance).toBeNull();

  game.returnToTitleMenu();
  expect(game.getPhase()).toBe('returning_title');
  expect(game.getSnapshot().lavaDistance).toBeNull();

  game.destroy();
});

it('chế độ vô tận không dừng ở 3000m và trả độ cao đạt được khi kết thúc', () => {
  const onGameOver = vi.fn();
  const game = createGame(canvas, { isEndless: true, finish_height: null }, { onGameOver });
  tick(0);
  const state = game.getState();
  state.player.y = 388 - 3500;
  tick(100);
  expect(game.getPhase()).toBe('running');
  expect(onGameOver).not.toHaveBeenCalled();

  state.world.lava.y = state.player.y + state.player.height;
  tick(120);
  expect(game.getPhase()).toBe('finished');
  expect(onGameOver).toHaveBeenCalledTimes(1);
  expect(onGameOver.mock.calls[0][0]).toMatchObject({
    finalHeight: 3500,
    finalMaxHeight: 3500,
    outcome: 'dnf',
    reason: 'lava',
  });
  game.destroy();
});
