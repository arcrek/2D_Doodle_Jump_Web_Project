import { describe, it, expect } from 'vitest';
import { createStartingBots, createBot, findTargetPlatform, updateBotAI } from '../game/bots.js';
import { updateBotCompanion, updateBotPhysics } from '../game/mechanics.js';
import { createState, step } from '../game/simulation.js';

const platform = (x, y, type = 'standard') => ({ x, y, width: 120, height: 14, type });
const player = { x: 400, y: 240, height: 42 };

describe('Các thầy đồng hành', () => {
  it('mọi cá tính tránh bệ đã được chọn, vẫn chia sẻ khi chỉ còn một bệ', () => {
    const bots = createStartingBots();
    const platforms = [0, 75, 150, 225].map(x => platform(x, 360));
    for (const bot of bots) {
      bot.x = 120;
      bot.y = 366;
      bot.lastPlatformY = 410;
      bot.vy = -520;
      bot.targetPlatform = findTargetPlatform(bot, platforms, bots);
    }
    expect(new Set(bots.map(b => b.targetPlatform)).size).toBe(4);
    expect(findTargetPlatform(bots[0], [platforms[1]], bots)).toBe(platforms[1]);
  });

  it('dùng chung bệ với tới được khi bệ còn trống nằm quá xa ngang', () => {
    const bot = createBot('STANDARD', 100, 344);
    bot.lastPlatformY = 388;
    bot.reactionTimer = 0;
    const near = platform(80, 298);
    const far = platform(580, 298);
    const other = { targetPlatform: near };
    expect(findTargetPlatform(bot, [near, far], [bot, other])).toBe(near);
  });

  it('thầy tụt khỏi đáy nhảy theo quỹ đạo tới các bệ khác nhau gần người chơi', () => {
    const bots = createStartingBots(680);
    const world = { cameraY: 0, platforms: [platform(100, 270), platform(400, 285), platform(700, 300)] };
    const startY = bots[0].y;
    for (const bot of bots) updateBotCompanion(bot, world, player, 1 / 60, bots);
    expect(new Set(bots.map(b => b.catchUp.platform)).size).toBe(3);
    expect(bots[0].y).toBeLessThan(startY);
    expect(bots[0].y).toBeGreaterThan(500); // Nhảy liên tục, không dịch chuyển tức thời.
    let sawDescending = false;
    for (let i = 0; i < 100 && bots[0].catchUp; i++) {
      updateBotCompanion(bots[0], world, player, 1 / 60, bots);
      sawDescending ||= bots[0].vy > 0;
    }
    expect(sawDescending).toBe(true);
    expect(bots[0].catchUp).toBeNull();
    expect(bots[0].isDead).toBe(false);
    expect(bots[0].y + bots[0].height).toBe(bots[0].standingPlatform.y);
  });

  it('theo bệ di động khi bắt kịp, đổi đích nếu bệ bị xóa', () => {
    const bot = createBot('STANDARD', 100, 700);
    const first = platform(200, 280, 'moving');
    const second = platform(600, 300);
    const world = { cameraY: 0, platforms: [first, second], lava: { y: 600 } };
    updateBotCompanion(bot, world, player, 0.1, [bot]);
    expect(bot.catchUp.platform).toBe(first);
    world.platforms = [second];
    updateBotCompanion(bot, world, player, 0.1, [bot]);
    expect(bot.catchUp.platform).toBe(second);
    second.x += 50;
    updateBotCompanion(bot, world, player, 2, [bot]);
    expect(bot.x).toBe(second.x + (second.width - bot.width) / 2);
    expect(bot.y + bot.height).toBe(second.y);
  });

  it('đứng trên bệ cao chờ camera, không trôi ngang; camera tới thì nhảy tiếp', () => {
    const bot = createBot('SPEEDRUNNER', 100, -90);
    const high = platform(80, -40, 'moving');
    high.vx = 30;
    bot.y = -90;
    bot.vy = 150;
    updateBotPhysics(bot, [high], 0.04, { cameraY: 0 });
    expect(bot.isGrounded).toBe(true);
    expect(bot.waitingForCamera).toBe(true);
    const y = bot.y;
    high.x += 3;
    updateBotAI(bot, [high], 0.1);
    updateBotPhysics(bot, [high], 0.1, { cameraY: 0 });
    expect(bot.y).toBe(y);
    expect(bot.vy).toBe(0);
    updateBotPhysics(bot, [high], 0.1, { cameraY: -250 });
    expect(bot.waitingForCamera).toBe(false);
    expect(bot.isGrounded).toBe(false);
    expect(bot.vy).toBeLessThan(0);
  });

  it('bệ di động vượt nửa màn hình không đảo hướng hoặc dịch chuyển tức thì', () => {
    const bot = createBot('STANDARD', 100, 700);
    const moving = platform(540, 280, 'moving');
    const world = { cameraY: 0, platforms: [moving] };
    updateBotCompanion(bot, world, player, 0.32, [bot]);
    const x = bot.x;
    moving.x += 3;
    updateBotCompanion(bot, world, player, 1 / 60, [bot]);
    expect(Math.abs(bot.x - x)).toBeLessThan(30);
  });

  it('bệ đang chờ bị xóa thì thầy thoát trạng thái đứng và không nhảy từ bệ mất', () => {
    const bot = createBot('STANDARD', 100, 200);
    bot.isGrounded = true;
    bot.standingPlatform = platform(100, 244);
    bot.waitingForCamera = true;
    updateBotPhysics(bot, [], 0.016, { cameraY: 0 });
    expect(bot.isGrounded).toBe(false);
    expect(bot.standingPlatform).toBeNull();
  });

  it('mô phỏng cũng bắt kịp, không chết hoặc tính điểm cho các thầy', () => {
    const state = createState({ isEndless: true, bots: [{ id: 'son', sprite_id: 'son' }] });
    state.bots[0].y = 800;
    step(state, 1 / 60, 0);
    expect(state.bots[0].catchUp).toBeTruthy();
    expect(state.bots[0].isDead).toBe(false);
    expect(state.bots[0].progress).toBeUndefined();
  });
});
