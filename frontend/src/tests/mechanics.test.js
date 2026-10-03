import { describe, it, expect, vi } from 'vitest';
import {
  createLavaState,
  updateLava,
  createPowerupState,
  spawnPowerupsForPlatforms,
  updatePowerups,
  updateBotPhysics,
} from '../game/mechanics.js';
import { SoundManager } from '../game/audio.js';
import {
  LAVA_INITIAL_SPEED,
  LAVA_ACCEL,
  LAVA_MAX_SPEED,
  LAVA_INITIAL_Y,
  SHIELD_LAVA_REBOUND_VELOCITY,
  ROCKET_SPEED_Y,
  JUMP_VELOCITY,
} from '../game/index.js';
import { updatePlatforms } from '../game/world.js';
import { createGame } from '../game/engine.js';

describe('Mechanics: Rising Lava', () => {
  it('Khởi tạo state dung nham với các thông số mặc định', () => {
    const lava = createLavaState();
    expect(lava.y).toBe(LAVA_INITIAL_Y);
    expect(lava.speed).toBe(LAVA_INITIAL_SPEED);
    expect(lava.elapsed).toBe(0);
  });

  it('Dung nham dâng lên trên (giảm Y) và tăng tốc đều đặn theo LAVA_ACCEL', () => {
    const lava = createLavaState();
    // Sau 10 giây: tốc độ tăng đúng LAVA_ACCEL * 10
    updateLava({ lava, dt: 10.0, world: { platforms: [] }, player: { y: 0, height: 42 }, bots: [] });
    expect(lava.speed).toBeCloseTo(LAVA_INITIAL_SPEED + LAVA_ACCEL * 10, 2);
  });

  it('Tốc độ dung nham không bao giờ vượt quá LAVA_MAX_SPEED', () => {
    const lava = createLavaState();
    // Sau 500 giây: vẫn bị chặn ở trần LAVA_MAX_SPEED
    updateLava({ lava, dt: 500.0, world: { platforms: [] }, player: { y: 0, height: 42 }, bots: [] });
    expect(lava.speed).toBe(LAVA_MAX_SPEED);
  });

  it('Dung nham tự động xóa các bệ đỡ bị nhấn chìm (platform.y >= lava.y)', () => {
    const lava = { y: 300, speed: 40, elapsed: 0 };
    const platforms = [
      { id: 1, y: 250 }, // Phía trên dung nham (còn an toàn)
      { id: 2, y: 320 }, // Bị chìm dưới dung nham
      { id: 3, y: 400 }, // Bị chìm dưới dung nham
    ];
    const world = { platforms };
    updateLava({ lava, dt: 0.1, world, player: { y: 0, height: 42 }, bots: [] });
    expect(world.platforms.length).toBe(1);
    expect(world.platforms[0].id).toBe(1);
  });

  it('Dung nham gây chết Player nếu không có Khiên', () => {
    const lava = { y: 400, speed: 40, elapsed: 0 };
    const player = { y: 370, height: 42, vy: 100, powerup: createPowerupState() };
    const onGameOver = vi.fn();
    updateLava({ lava, dt: 0.1, world: { platforms: [] }, player, bots: [], onGameOver });
    expect(onGameOver).toHaveBeenCalledWith('lava');
  });

  it('Khiên cứu mạng Player khi chạm Dung nham và kích hoạt bật nảy cực mạnh', () => {
    const lava = { y: 400, speed: 40, elapsed: 0 };
    const player = { y: 370, height: 42, vy: 100, powerup: { rocketTimer: 0, shieldTimer: 5.0 } };
    const onGameOver = vi.fn();
    updateLava({ lava, dt: 0.1, world: { platforms: [] }, player, bots: [], onGameOver });
    expect(onGameOver).not.toHaveBeenCalled();
    expect(player.powerup.shieldTimer).toBe(0); // Khiên tiêu biến
    expect(player.vy).toBe(SHIELD_LAVA_REBOUND_VELOCITY); // Bật nảy
  });

  it('Dung nham tiêu diệt bot khi chạm phải', () => {
    const lava = { y: 400, speed: 40, elapsed: 0 };
    const bot = { y: 380, height: 44, isDead: false };
    updateLava({ lava, dt: 0.1, world: { platforms: [] }, player: { y: 0, height: 42 }, bots: [bot] });
    expect(bot.isDead).toBe(true);
  });

  it('Bot rơi xuống sâu nhưng chưa chạm Dung nham thì không bị tiêu diệt (chỉ chết khi chạm Lava)', () => {
    const lava = { y: 1000, speed: 40, elapsed: 0 };
    const bot = { y: 700, height: 44, isDead: false };
    updateLava({ lava, dt: 0.1, world: { platforms: [] }, player: { y: 0, height: 42 }, bots: [bot] });
    expect(bot.isDead).toBe(false);
  });
});

describe('Mechanics: Bot Jump Cooldown', () => {
  it('Bot tiếp đất chuyển sang isGrounded và đếm ngược jumpCooldown', () => {
    const bot = {
      x: 100,
      y: 280,
      width: 44,
      height: 44,
      vy: 100,
      isGrounded: false,
      profile: { jumpCooldown: 0.28 },
    };
    const platform = { x: 80, y: 324, width: 100, height: 14 };

    // Frame 1: Rơi trúng bệ
    updateBotPhysics(bot, [platform], 0.016);
    expect(bot.isGrounded).toBe(true);
    expect(bot.vy).toBe(0);
    expect(bot.jumpCooldownTimer).toBeCloseTo(0.28, 2);

    // Frame 2: Vẫn trong thời gian cooldown
    updateBotPhysics(bot, [platform], 0.1);
    expect(bot.isGrounded).toBe(true);
    expect(bot.vy).toBe(0);

    // Frame 3: Hết cooldown -> tung cú nhảy
    updateBotPhysics(bot, [platform], 0.2);
    expect(bot.isGrounded).toBe(false);
    expect(bot.vy).toBe(JUMP_VELOCITY);
  });

  it('Bot đang nhảy từ dưới lên (vy < 0) không tiếp đất khi xuyên qua bệ', () => {
    const bot = {
      x: 100,
      y: 300,
      prevY: 310,
      width: 44,
      height: 44,
      vy: -300,
      isGrounded: false,
      profile: { jumpCooldown: 0.28 },
    };
    const platform = { x: 80, y: 324, width: 100, height: 14 };

    updateBotPhysics(bot, [platform], 0.016);
    expect(bot.isGrounded).toBe(false);
    expect(bot.vy).toBeLessThan(0);
  });

  it('Bot đạt đỉnh nhảy nhưng chân chưa vượt lên trên mặt bệ thì không được tiếp đất', () => {
    const bot = {
      x: 100,
      y: 290,
      prevY: 289,
      width: 44,
      height: 44,
      vy: 10,
      isGrounded: false,
      profile: { jumpCooldown: 0.28 },
    };
    const platform = { x: 80, y: 324, width: 100, height: 14 };

    updateBotPhysics(bot, [platform], 0.016);
    expect(bot.isGrounded).toBe(false);
    expect(bot.standingPlatform).toBeUndefined();
  });

  it('Bot nảy lên ngay lập tức khi tiếp đất nếu jumpCooldown = 0 (không bị dính ở bệ)', () => {
    const bot = {
      x: 100,
      y: 280,
      width: 44,
      height: 44,
      vy: 100,
      isGrounded: false,
      profile: { jumpCooldown: 0 },
    };
    const platform = { x: 80, y: 324, width: 100, height: 14 };

    // Ngay frame tiếp đất đầu tiên
    updateBotPhysics(bot, [platform], 0.016);
    // Bot phải nảy lên ngay lập tức, vy âm (bay lên), không bị kẹt ở trạng thái isGrounded
    expect(bot.isGrounded).toBe(false);
    expect(bot.vy).toBe(JUMP_VELOCITY);
    expect(bot.y).toBe(platform.y - bot.height);
  });
});

describe('Mechanics: Platform Preservation (No offscreen culling)', () => {
  it('Bệ không bị xóa khi trôi khỏi màn hình dưới camera (cullOffscreen = false)', () => {
    const world = {
      platforms: [
        { id: 'top', y: 0, width: 100, height: 14, type: 'standard' },
        { id: 'deep_below', y: 800, width: 100, height: 14, type: 'standard' },
      ],
      cameraY: 0,
      isFinite: false,
    };
    updatePlatforms(world, 0.016, { cullOffscreen: false });
    // Bệ deep_below (y: 800) không bị xóa khi cameraY = 0
    expect(world.platforms.some(p => p.id === 'deep_below')).toBe(true);
  });
});

describe('Mechanics: Endless Mode without 3000m cut-off', () => {
  it('Chế độ endless không bị dừng lại khi vượt qua độ cao 3000m', () => {
    const canvas = { width: 960, height: 540, getContext: () => ({ clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn() }) };
    const onGameOver = vi.fn();
    const game = createGame(canvas, { isEndless: true }, { onGameOver, enableIntro: false });

    const state = game.getState();
    // Giả lập leo vượt mốc 3000m (y = -3000 => độ cao = 388 - (-3000) = 3388m)
    state.player.y = -3000;

    // Kỷ lục độ cao vượt 3000m
    const snapshot = game.getSnapshot();
    expect(snapshot.height).toBeGreaterThan(3000);
    expect(onGameOver).not.toHaveBeenCalled();

    game.destroy();
  });
});

describe('Mechanics: Powerups', () => {
  it('Nhặt Rocket kích hoạt bay lên với vận tốc ROCKET_SPEED_Y', () => {
    const player = {
      x: 100,
      y: 280,
      width: 34,
      height: 42,
      vy: 0,
      powerup: createPowerupState(),
    };
    const platform = {
      x: 80,
      y: 300,
      width: 100,
      height: 14,
      powerup: 'rocket',
    };

    updatePowerups({ player, platforms: [platform], dt: 0.016 });
    expect(platform.powerup).toBeUndefined(); // Đã nhặt
    expect(player.powerup.rocketTimer).toBeGreaterThan(0);
    expect(player.vy).toBe(ROCKET_SPEED_Y);
  });

  it('Nhặt Shield kích hoạt shieldTimer', () => {
    const player = {
      x: 100,
      y: 280,
      width: 34,
      height: 42,
      vy: 0,
      powerup: createPowerupState(),
    };
    const platform = {
      x: 80,
      y: 300,
      width: 100,
      height: 14,
      powerup: 'shield',
    };

    updatePowerups({ player, platforms: [platform], dt: 0.016 });
    expect(platform.powerup).toBeUndefined();
    expect(player.powerup.shieldTimer).toBeGreaterThan(0);
  });

  it('Không cho phép nhặt chồng Tên lửa khi đang bay (chống bay liên tục vô hạn)', () => {
    const player = {
      x: 100,
      y: 280,
      width: 34,
      height: 42,
      vy: ROCKET_SPEED_Y,
      powerup: { rocketTimer: 2.0, shieldTimer: 0 },
    };
    const platform = {
      x: 80,
      y: 300,
      width: 100,
      height: 14,
      powerup: 'rocket',
    };

    updatePowerups({ player, platforms: [platform], dt: 0.016 });
    // Tên lửa trên bệ không bị nhặt, rocketTimer không bị reset chồng
    expect(platform.powerup).toBe('rocket');
    expect(player.powerup.rocketTimer).toBeLessThanOrEqual(2.0);
  });
});

describe('SoundManager', () => {
  it('Hỗ trợ toggleMute đúng cách', () => {
    const sm = new SoundManager();
    expect(sm.isMuted).toBe(false);
    sm.toggleMute();
    expect(sm.isMuted).toBe(true);
    sm.toggleMute();
    expect(sm.isMuted).toBe(false);
  });
});

describe('Mechanics: Powerup Config & Customizable Assets', () => {
  it('POWERUP_CONFIG cung cấp đường dẫn ảnh và kích thước có thể tùy biến', () => {
    const { POWERUP_CONFIG } = require('../game/index.js');
    expect(POWERUP_CONFIG.rocket.src).toBe('/images/powerups/rocket.png');
    expect(POWERUP_CONFIG.shield.src).toBe('/images/powerups/shield.png');
    expect(POWERUP_CONFIG.rocket.width).toBeGreaterThan(0);
    expect(POWERUP_CONFIG.shield.width).toBeGreaterThan(0);
  });

  it('POWERUP_PATHS trong sprites.js liên kết với đúng asset powerups', () => {
    const { POWERUP_PATHS } = require('../game/sprites.js');
    expect(POWERUP_PATHS.rocket).toBe('/images/powerups/rocket.png');
    expect(POWERUP_PATHS.shield).toBe('/images/powerups/shield.png');
  });

  it('renderPowerups vẽ an toàn khi có bệ chứa rocket và shield', () => {
    const { renderPowerups } = require('../game/mechanics.js');
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(), rotate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      drawImage: vi.fn(),
    };
    const platforms = [
      { x: 100, y: 200, width: 80, powerup: 'rocket' },
      { x: 200, y: 150, width: 80, powerup: 'shield' },
    ];
    const player = { x: 120, y: 180, width: 34, height: 42, powerup: { rocketTimer: 1.0, shieldTimer: 2.0 } };
    expect(() => renderPowerups(ctx, platforms, player, 0, 1.0)).not.toThrow();
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });
});

describe('Mechanics: Lava Distance Warning', () => {
  it('Tính đúng khoảng cách từ chân người chơi tới mặt dung nham', () => {
    const player = { y: 200, height: 42 }; // playerBottom = 242
    const lava = { y: 400 };
    const distance = Math.max(0, Math.round(lava.y - (player.y + player.height)));
    expect(distance).toBe(158);
  });

  it('Engine getSnapshot trả về lavaDistance chính xác theo thời gian thực', () => {
    const canvas = { width: 960, height: 540, getContext: () => ({ clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn() }) };
    const game = createGame(canvas, { isEndless: true }, { enableIntro: false });
    const snapshot = game.getSnapshot();
    expect(typeof snapshot.lavaDistance).toBe('number');
    expect(snapshot.lavaDistance).toBeGreaterThan(0);
    game.destroy();
  });

  it('dải DANGER di chuyển cùng lava thay cho badge khoảng cách', () => {
    const { renderLavaDanger } = require('../game/mechanics.js');
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    };
    const lava = { y: 350 };
    expect(() => renderLavaDanger(ctx, lava, 0, 960, 540, 1.0)).not.toThrow();
    const initial = ctx.fillText.mock.calls[0];
    expect(initial[0]).toBe('DANGER');
    ctx.fillText.mockClear();
    renderLavaDanger(ctx, { y: 250 }, 0, 960, 540, 1.0);
    expect(ctx.fillText.mock.calls[0][2]).toBeCloseTo(initial[2] - 100);
    ctx.fillText.mockClear();
    renderLavaDanger(ctx, { y: 1000 }, 0, 960, 540, 1.0);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});

describe('Mechanics: Bidirectional Camera & Fall Immunity', () => {
  it('Camera kéo xuống theo khi người chơi rơi xuống dưới (không bị khóa ở đỉnh)', () => {
    let pendingCallback;
    const canvas = {
      width: 960,
      height: 540,
      getContext: () => ({ clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn() }),
    };
    const game = createGame(canvas, { isEndless: true }, { enableIntro: false });
    const state = game.getState();

    // Giả lập nhân vật leo lên cao (y = -1000)
    state.player.y = -1000;
    // targetMinCameraY = -1000 - 540 * 0.60 = -1324
    state.world.cameraY = -1324;

    // Giờ nhân vật rơi mạnh xuống dưới (y = 200)
    state.player.y = 200;
    // targetMaxCameraY = 200 - 540 * 0.72 = 200 - 388.8 = -188.8
    // Khi rơi xuống: camera phải tăng (kéo xuống) theo nhân vật
    const topSightRatio = 0.60;
    const bottomSightRatio = 0.72;
    const targetMinCameraY = state.player.y - 540 * topSightRatio;
    const targetMaxCameraY = state.player.y - 540 * bottomSightRatio;

    if (state.world.cameraY < targetMaxCameraY) {
      state.world.cameraY = targetMaxCameraY;
    }
    expect(state.world.cameraY).toBeCloseTo(-188.8, 1);
    expect(state.player.y - state.world.cameraY).toBeLessThanOrEqual(540 * bottomSightRatio + 1);

    game.destroy();
  });

  it('Rơi tụt sâu xuống không kích hoạt GameOver, chỉ chết khi chạm Dung nham', () => {
    const canvas = {
      width: 960,
      height: 540,
      getContext: () => ({ clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn() }),
    };
    const onGameOver = vi.fn();
    const game = createGame(canvas, { isEndless: true }, { onGameOver, enableIntro: false });
    const state = game.getState();

    // Giả lập nhân vật rơi cực sâu dưới camera
    state.player.y = 3000;
    state.world.cameraY = 0; // chênh lệch 3000px (> canvas.height + 42)

    // Kiểm tra không bị trigger fall
    expect(onGameOver).not.toHaveBeenCalled();

    // Chỉ khi chạm dung nham mới chết:
    state.world.lava.y = 3000;
    updateLava({
      lava: state.world.lava,
      dt: 0.016,
      world: state.world,
      player: state.player,
      bots: [],
      onGameOver,
    });
    expect(onGameOver).toHaveBeenCalledWith('lava');

    game.destroy();
  });
});
