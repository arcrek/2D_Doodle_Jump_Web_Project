import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  MAX_VX,
  ACCE,
  MASATTRUOT,
} from './index.js';

export { PLAYER_WIDTH, PLAYER_HEIGHT };
export const HORIZONTAL_SPEED = 240;

export function createPlayer(overrides = {}) {
  return {
    x: 300,
    y: 388,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    ...overrides,
  };
}

/**
 * Cập nhật di chuyển ngang bằng hệ thống quán tính:
 * - Nhấn phím: gia tốc ACCE
 * - Bẻ lái đảo chiều: gia tốc ACCE + ma sát MASATTRUOT để bẻ lái đầm tay
 * - Nhả phím: ma sát MASATTRUOT hãm trớn mượt mà về 0
 */
export function updateHorizontal(player, direction, dt) {
  if (!player || typeof dt !== 'number') return player;

  const maxVx = MAX_VX || 420;
  const acce = ACCE || 1800;
  const friction = MASATTRUOT || 2000;

  // Di chuyển sang TRÁI
  if (direction < 0) {
    player.direction = 'left';
    if (player.vx > 0) {
      player.vx = Math.max(-maxVx, player.vx - (acce + friction) * dt);
    } else {
      player.vx = Math.max(-maxVx, player.vx - acce * dt);
    }
  }
  // Di chuyển sang PHẢI
  else if (direction > 0) {
    player.direction = 'right';
    if (player.vx < 0) {
      player.vx = Math.min(maxVx, player.vx + (acce + friction) * dt);
    } else {
      player.vx = Math.min(maxVx, player.vx + acce * dt);
    }
  }
  // NHẢ PHÍM: ma sát trượt hãm trớn mượt mà về 0
  else {
    if (player.vx > 0) {
      player.vx = Math.max(0, player.vx - friction * dt);
    } else if (player.vx < 0) {
      player.vx = Math.min(0, player.vx + friction * dt);
    }
  }

  // Cập nhật vị trí X từ vận tốc ngang vx
  player.x += player.vx * dt;
  return player;
}

/**
 * Tính toán vị trí, vận tốc và tỷ lệ biến dạng (squash & stretch) của nhân vật
 * trong hoạt cảnh bay từ mép trái vào bệ xuất phát (cinematic entrance jump).
 *
 * Đường chuyển động kết hợp:
 * - Trục X: ease-out quad giúp giảm tốc dần và triệt tiêu quán tính ngang khi dừng.
 * - Trục Y: đường cong parabol tự nhiên đạt đỉnh ở giữa chặng (~0.44 progress),
 *   đồng thời triệt tiêu hoàn toàn vận tốc rơi khi chạm bệ (v = 0 tại progress = 1),
 *   giúp tiếp đất cực kỳ êm ái, không bị giật cục hay khựng hình.
 * - Squash & stretch: độ co giãn chân thực khi bật nhảy và đệm lún nhẹ khi chạm bệ.
 * - Tương thích Reduce Motion: chuyển động phẳng không nảy để giảm chóng mặt.
 *
 * @param {number} progress - Tiến độ cú nhảy từ 0.0 (mép trái) đến 1.0 (đã tiếp đất).
 * @param {Object} [options] - Cấu hình tùy chọn tọa độ và hiệu ứng.
 * @param {number} [options.startX] - Tọa độ X xuất phát ngoài mép trái (mặc định: -PLAYER_WIDTH - 20 = -54).
 * @param {number} [options.targetX=300] - Tọa độ X bệ đầu tiên (mặc định: 300).
 * @param {number} [options.startY=388] - Tọa độ Y xuất phát (mặc định: 388).
 * @param {number} [options.targetY=388] - Tọa độ Y tiếp đất trên bệ đầu (mặc định: 388).
 * @param {number} [options.peakHeight=110] - Độ cao cực đại của cung nhảy (mặc định: 110px).
 * @param {number} [options.playerWidth=PLAYER_WIDTH] - Chiều rộng nhân vật (mặc định: 34).
 * @param {number} [options.playerHeight=PLAYER_HEIGHT] - Chiều cao nhân vật (mặc định: 42).
 * @param {boolean} [options.reduceMotion=false] - Chế độ giảm chuyển động (không nhảy bổng, không co giãn).
 * @param {number} [options.durationMs=900] - Thời lượng cú nhảy tính bằng ms để tính vận tốc tức thời.
 * @returns {{
 *   x: number,
 *   y: number,
 *   vx: number,
 *   vy: number,
 *   scaleX: number,
 *   scaleY: number,
 *   progress: number,
 *   isLanded: boolean
 * }}
 */
export function getEntranceJumpPosition(progress, options = {}) {
  const rawProgress = typeof progress === 'number' && !Number.isNaN(progress) ? progress : 0;
  const p = Math.max(0, Math.min(1, rawProgress));

  const {
    playerWidth = PLAYER_WIDTH,
    startX = -playerWidth - 26, // -60px: ngoài mép trái màn hình
    targetX = 300,
    startY = 398,              // Nhẹ nhàng bật từ cánh gà
    targetY = 388,
    peakHeight = 120,          // Cung bổng 120px vừa vặn, êm ái
    reduceMotion = false,
    durationMs = 2000,         // ~2 giây (2000ms): chilling, siêu chậm, thư thái và bay bổng
  } = options;

  const dtSec = Math.max(0.001, (durationMs || 2000) / 1000);

  // Chế độ giảm chuyển động (Reduce Motion):
  // Di chuyển ngang mượt mà, giữ nguyên cao độ, không nảy bổng và không biến dạng hình thể
  if (reduceMotion) {
    const x = startX + (targetX - startX) * p;
    const y = targetY;
    const vx = p >= 1 ? 0 : (targetX - startX) / dtSec;
    return {
      x,
      y,
      vx: Math.round(vx * 100) / 100,
      vy: 0,
      rotationDeg: 0,
      scaleX: 1,
      scaleY: 1,
      progress: p,
      isLanded: p >= 1,
    };
  }

  if (p >= 1) {
    return {
      x: targetX,
      y: targetY,
      vx: 0,
      vy: 0,
      rotationDeg: 0,
      scaleX: 1,
      scaleY: 1,
      progress: 1,
      isLanded: true,
    };
  }

  // 1. Quỹ đạo ngang X: Vận tốc ngang tự nhiên đều như một cú nhảy thực tế
  const x = startX + (targetX - startX) * p;
  const vx = ((targetX - startX)) / dtSec;

  // 2. Quỹ đạo dọc Y (Cung parabol trọng lực tự nhiên):
  // arc(p) = peakHeight * 4 * p * (1 - p)
  // - Tại p = 0: arc = 0, y = startY
  // - Tại p = 0.5: arc = peakHeight, đạt đỉnh nhảy
  // - Tại p = 1: arc = 0, rơi thẳng xuống bệ
  const arc = peakHeight * 4 * p * (1 - p);
  const baseY = startY + (targetY - startY) * p;
  const y = baseY - arc;

  // Vận tốc tức thời (px/s):
  // dy/dp = (targetY - startY) - peakHeight * (4 - 8p)
  // Khi rơi (p > 0.5): dy/dp > 0 (rơi nhanh dần theo trọng lực, không bị hãm phanh)
  const dy_dp = (targetY - startY) - peakHeight * (4 - 8 * p);
  const vy = dy_dp / dtSec;

  // 3. Hiệu ứng động lực học (Squash & Stretch + Góc nghiêng thân người chilling):
  // - Giai đoạn bật nhảy vươn lên (p: 0 -> 0.35): dãn nhẹ dọc người + nghiêng nhẹ (+4°)
  // - Giai đoạn lơ lửng đỉnh cung (p: 0.35 -> 0.65): cân bằng 0°, giữ trọn form dáng để người chơi ngắm skin
  // - Giai đoạn rơi tự do hạ độ cao (p: 0.65 -> 0.85): nghiêng nhẹ chúc xuống (-2.5°)
  // - Giai đoạn chạm bệ tiếp đất (p: 0.82 -> 0.98): đứng thẳng 0°, nén lún đệm chân nhẹ nhàng (squash)
  let scaleX = 1;
  let scaleY = 1;
  let rotationDeg = 0;

  if (p > 0 && p < 0.35) {
    const s = Math.sin((p / 0.35) * Math.PI);
    scaleX = 1 - 0.04 * s;
    scaleY = 1 + 0.05 * s;
  } else if (p >= 0.82 && p < 0.98) {
    const sq = Math.sin(((p - 0.82) / 0.16) * Math.PI);
    scaleX = 1 + 0.08 * sq;
    scaleY = 1 - 0.08 * sq;
  }

  if (p > 0 && p < 0.45) {
    rotationDeg = Math.sin((p / 0.45) * Math.PI) * 4;
  } else if (p >= 0.55 && p < 0.92) {
    rotationDeg = -Math.sin(((p - 0.55) / 0.37) * Math.PI) * 2.5;
  }

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    vx: Math.round(vx * 100) / 100,
    vy: Math.round(vy * 100) / 100,
    rotationDeg: Math.round(rotationDeg * 10) / 10,
    scaleX: Math.round(scaleX * 1000) / 1000,
    scaleY: Math.round(scaleY * 1000) / 1000,
    progress: p,
    isLanded: false,
  };
}
