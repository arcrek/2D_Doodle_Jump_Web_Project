import { describe, it, expect } from 'vitest';
import { createBots, createBot, findTargetPlatform, updateBotAI, onBotBounce } from '../game/bots.js';

describe('bots & AI (BOT-01)', () => {
  it('createBots sao chép đúng dữ liệu và thêm progress = 0', () => {
    const profiles = [
      { id: 'teacher-1', name: 'Ghost 1', base_speed: 44 },
      { id: 'teacher-2', name: 'Ghost 2', base_speed: 48 },
    ];
    const bots = createBots(profiles);

    expect(bots).toEqual([
      { id: 'teacher-1', name: 'Ghost 1', base_speed: 44, progress: 0 },
      { id: 'teacher-2', name: 'Ghost 2', base_speed: 48, progress: 0 },
    ]);

    // Không mutate dữ liệu truyền vào
    expect(profiles[0].progress).toBeUndefined();
    expect(bots[0]).not.toBe(profiles[0]);
  });

  it('createBot tạo bot khởi tạo đúng với vận tốc nảy vy âm trong Canvas', () => {
    const bot = createBot('STANDARD', 200, 388);
    expect(bot.x).toBe(200);
    expect(bot.y).toBe(388);
    expect(bot.vy).toBeLessThan(0); // Bật nhảy lên trong Canvas
    expect(bot.isDead).toBe(false);
  });

  it('findTargetPlatform chọn bệ phía trên trong tầm với', () => {
    const bot = createBot('STANDARD', 200, 430);
    bot.lastPlatformY = 430;
    const platforms = [
      { x: 200, y: 360, width: 100, height: 14, type: 'normal' },
      { x: 200, y: 100, width: 100, height: 14, type: 'normal' },
    ];
    const target = findTargetPlatform(bot, platforms);
    expect(target).toBe(platforms[0]);
  });

  it('updateBotAI điều hướng bot về bệ mục tiêu và cập nhật vị trí ngang x', () => {
    const bot = createBot('STANDARD', 100, 430);
    bot.reactionTimer = 0;
    bot.targetPlatform = { x: 300, y: 360, width: 100, height: 14 };
    const prevX = bot.x;
    updateBotAI(bot, [bot.targetPlatform], 0.05);
    expect(bot.x).toBeGreaterThan(prevX);
    expect(bot.direction).toBe('right');
  });

  it('onBotBounce làm mới mục tiêu và cập nhật lastPlatformY', () => {
    const bot = createBot('STANDARD', 100, 360);
    bot.targetPlatform = { x: 100, y: 360, width: 100, height: 14 };
    onBotBounce(bot, bot.targetPlatform);
    expect(bot.targetPlatform).toBeNull();
    expect(bot.lastPlatformY).toBe(360);
  });
});
