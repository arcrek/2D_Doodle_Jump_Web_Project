import { describe, it, expect } from 'vitest';
import { createPlayer, updateHorizontal, getEntranceJumpPosition } from '../game/player.js';

describe('player & updateHorizontal (FE-01 + Inertia Physics)', () => {
  it('createPlayer tạo đúng dữ liệu ban đầu theo quy ước', () => {
    const player = createPlayer();
    expect(player).toEqual({
      x: 300,
      y: 388,
      width: 34,
      height: 42,
      vx: 0,
      vy: 0,
    });
  });

  it('đi phải 30 bước dt = 1/60 từ x = 300 tăng tốc đạt max_vx và tới x = 464.5', () => {
    const player = createPlayer();
    const dt = 1 / 60;

    for (let i = 0; i < 30; i += 1) {
      updateHorizontal(player, 1, dt);
    }

    expect(player.x).toBeCloseTo(464.5, 1);
    expect(player.vx).toBe(420);
    expect(player.direction).toBe('right');
  });

  it('đi trái 30 bước dt = 1/60 từ x = 300 tăng tốc đạt -max_vx và tới x = 135.5', () => {
    const player = createPlayer();
    const dt = 1 / 60;

    for (let i = 0; i < 30; i += 1) {
      updateHorizontal(player, -1, dt);
    }

    expect(player.x).toBeCloseTo(135.5, 1);
    expect(player.vx).toBe(-420);
    expect(player.direction).toBe('left');
  });

  it('chia cùng khoảng thời gian 0.5s thành 60 bước dt = 1/120 tăng tốc mượt', () => {
    const player = createPlayer();
    const dt = 1 / 120; // 60 bước * (1/120) = 0.5s

    for (let i = 0; i < 60; i += 1) {
      updateHorizontal(player, 1, dt);
    }

    expect(player.x).toBeCloseTo(462.75, 1);
    expect(player.vx).toBe(420);
  });

  it('hướng 0 khi đứng yên thì nhân vật không di chuyển', () => {
    const player = createPlayer();
    const dt = 1 / 60;

    // Nhấn cả hai: direction = Number(true) - Number(true) = 0
    updateHorizontal(player, 0, dt);
    expect(player.x).toBe(300);
    expect(player.vx).toBe(0);

    // Không nhấn gì: direction = 0
    updateHorizontal(player, 0, 1.0);
    expect(player.x).toBe(300);
    expect(player.vx).toBe(0);
  });

  it('nhả phím khi đang có trớn: ma sát trượt hãm tốc độ về 0', () => {
    const player = createPlayer({ vx: 180 });
    // dt = 0.05s, ma sát 2000px/s^2 hãm 100px/s -> vx còn 80
    updateHorizontal(player, 0, 0.05);
    expect(player.vx).toBe(80);

    // Thêm 0.05s nữa -> vx hãm tiếp về 0 (không bị âm)
    updateHorizontal(player, 0, 0.05);
    expect(player.vx).toBe(0);
  });

  it('chỉ thay đổi x và vx, giữ nguyên y, width, height, vy', () => {
    const player = createPlayer();
    updateHorizontal(player, 1, 0.1);

    expect(player.x).toBeCloseTo(318, 1);
    expect(player.y).toBe(388);
    expect(player.width).toBe(34);
    expect(player.height).toBe(42);
    expect(player.vx).toBe(180);
    expect(player.vy).toBe(0);
  });
});

describe('getEntranceJumpPosition (Cinematic Intro v2 - Smooth Landing Arc)', () => {
  it('đầu cú nhảy (progress = 0): xuất phát ngoài mép trái (-60), y chân cánh gà (398), chưa tiếp đất', () => {
    const pos = getEntranceJumpPosition(0);

    expect(pos.progress).toBe(0);
    expect(pos.x).toBe(-60); // -PLAYER_WIDTH (34) - 26 = -60
    expect(pos.y).toBe(398);
    expect(pos.isLanded).toBe(false);
    expect(pos.scaleX).toBe(1);
    expect(pos.scaleY).toBe(1);
    expect(pos.rotationDeg).toBe(0);
  });

  it('giữa cú nhảy (progress = 0.5): đạt đỉnh bổng apex cao 120px, cân bằng dáng để nhìn rõ skin', () => {
    const mid = getEntranceJumpPosition(0.5);

    // Peak height là 120, y đạt đỉnh đúng (398 + 388)/2 - 120 = 273
    expect(mid.y).toBeCloseTo(273, 1);
    // x ngay chính giữa startX (-60) và targetX (300) = 120
    expect(mid.x).toBeCloseTo(120, 1);
    expect(mid.isLanded).toBe(false);
    expect(mid.scaleX).toBe(1);
    expect(mid.scaleY).toBe(1);
    expect(mid.rotationDeg).toBeCloseTo(0, 1);
  });

  it('động lực học khi bay: nghiêng nhẹ vươn tới khi bật nhảy và chúc nhẹ khi rơi', () => {
    const rising = getEntranceJumpPosition(0.25);
    expect(rising.rotationDeg).toBeGreaterThan(0); // Nghiêng tiến lên
    expect(rising.scaleY).toBeGreaterThan(1);      // Dãn nhẹ dọc

    const falling = getEntranceJumpPosition(0.75);
    expect(falling.rotationDeg).toBeLessThan(0);    // Nghiêng nhẹ chúc xuống
  });

  it('cuối cú nhảy (progress = 1.0): dừng chính xác tại bệ đầu (300, 388), đứng thẳng và triệt tiêu vận tốc', () => {
    const landed = getEntranceJumpPosition(1.0);

    expect(landed.progress).toBe(1.0);
    expect(landed.x).toBe(300);
    expect(landed.y).toBe(388);
    expect(landed.vx).toBe(0);
    expect(landed.vy).toBe(0);
    expect(landed.rotationDeg).toBe(0);
    expect(landed.isLanded).toBe(true);
    expect(landed.scaleX).toBe(1);
    expect(landed.scaleY).toBe(1);
  });

  it('rơi xuống bệ có vận tốc rơi thực tế như cú nhảy (không bị chậm dần khựng hình)', () => {
    const p90 = getEntranceJumpPosition(0.9);
    const p95 = getEntranceJumpPosition(0.95);
    const p100 = getEntranceJumpPosition(1.0);

    // X tiến dần về 300 với quán tính bay ngang
    expect(p90.x).toBeLessThan(p95.x);
    expect(p95.x).toBeLessThan(p100.x);
    expect(p100.x).toBe(300);

    // Y hạ dần từ trên xuống bệ (388) và không bị vượt qua (overshoot)
    expect(p90.y).toBeLessThan(p95.y);
    expect(p95.y).toBeLessThan(p100.y);
    expect(p100.y).toBe(388);

    // Vận tốc rơi dọc vy > 0 thực tế khi rơi xuống bệ (gia tốc do trọng lực)
    expect(p90.vy).toBeGreaterThan(0);
    expect(p95.vy).toBeGreaterThan(p90.vy);
    expect(p100.vy).toBe(0);
  });

  it('xử lý co giãn squash & stretch tự nhiên khi lún chân tiếp đất', () => {
    const preLanding = getEntranceJumpPosition(0.9);
    // Khi chuẩn bị chạm đất, nhân vật hơi dẹt ngang và lún dọc để giảm sốc
    expect(preLanding.scaleX).toBeGreaterThan(1);
    expect(preLanding.scaleY).toBeLessThan(1);

    const landed = getEntranceJumpPosition(1.0);
    expect(landed.scaleX).toBe(1);
    expect(landed.scaleY).toBe(1);
  });

  it('chế độ Reduce Motion: di chuyển phẳng ngang, không nhảy bổng và không biến dạng', () => {
    const start = getEntranceJumpPosition(0, { reduceMotion: true });
    const mid = getEntranceJumpPosition(0.5, { reduceMotion: true });
    const end = getEntranceJumpPosition(1.0, { reduceMotion: true });

    expect(start.y).toBe(388);
    expect(mid.y).toBe(388);
    expect(end.y).toBe(388);

    expect(mid.scaleX).toBe(1);
    expect(mid.scaleY).toBe(1);
    expect(mid.rotationDeg).toBe(0);
    expect(mid.x).toBeCloseTo(120, 1);
    expect(end.x).toBe(300);
    expect(end.isLanded).toBe(true);
  });

  it('xử lý an toàn các giá trị biên (progress âm, > 1, NaN, undefined)', () => {
    const neg = getEntranceJumpPosition(-0.5);
    expect(neg.progress).toBe(0);
    expect(neg.x).toBe(-60);
    expect(neg.isLanded).toBe(false);

    const over = getEntranceJumpPosition(1.8);
    expect(over.progress).toBe(1);
    expect(over.x).toBe(300);
    expect(over.isLanded).toBe(true);

    const nanVal = getEntranceJumpPosition(NaN);
    expect(nanVal.progress).toBe(0);
    expect(nanVal.x).toBe(-60);

    const undefVal = getEntranceJumpPosition(undefined);
    expect(undefVal.progress).toBe(0);
  });

  it('hỗ trợ tùy chỉnh tọa độ xuất phát và bệ đáp tùy biến', () => {
    const custom = getEntranceJumpPosition(1.0, {
      startX: -100,
      targetX: 450,
      startY: 500,
      targetY: 250,
      peakHeight: 150,
    });

    expect(custom.x).toBe(450);
    expect(custom.y).toBe(250);
    expect(custom.isLanded).toBe(true);
    expect(custom.vx).toBe(0);
    expect(custom.vy).toBe(0);
  });
});
