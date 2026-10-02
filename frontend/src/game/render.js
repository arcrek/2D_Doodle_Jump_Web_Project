// =============================================================================
// FILE: doodle-jump-usth/frontend/src/game/render.js
// VAI TRÒ: BỘ XUẤT HÌNH ẢNH & ĐỒ HỌA LÊN CANVAS 2D (CANVAS 2D RENDERER)
// PHỤ TRÁCH: Module Render · Core / Lead
// =============================================================================
// Module này chịu trách nhiệm vẽ toàn bộ các lớp đồ họa theo từng khung hình (frame):
// 1. Lớp nền (Background): Giấy kẻ ô tập vở Doodle (Seamless Grid 28x28px) cuộn theo cameraY,
//    tự động kéo dãn và áp dụng filter làm nhòe (Motion Blur) khi camera lao dốc.
// 2. Lớp bệ đỡ (Platforms): Vẽ bệ tiêu chuẩn (xanh), bệ di động (xanh dương), bệ dễ vỡ (nâu),
//    bệ lò xo (tím kèm lò xo vàng), hỗ trợ hiệu ứng phóng to mờ dần (reveal) trong hoạt cảnh intro.
// 3. Lớp đối thủ máy (Bots): Vẽ ảnh chân dung giảng viên hoặc nhân vật hạt đậu, hiển thị tên trên đầu.
// 4. Lớp người chơi (Player): Vẽ sprite skin giáo viên lựa chọn, quỹ đạo nhảy Parabol khi xuất hiện.
// 5. Lớp giao diện Canvas (HUD & Overlays):
//    - Tiêu đề "DOODLE JUMP" và nút "BẮT ĐẦU CHƠI" ở màn hình mở đầu.
//    - Gợi ý điều khiển phím mũi tên ở góc phải dưới khi chờ bấm phím.
//    - Rèm gạt chuyển cảnh Wipe Transition khi bấm Chơi Lại.
// =============================================================================

import {
  drawDoodleTitle,
  drawDoodleStartButton,
  drawDoodleArrowGuide,
  drawDoodleCharacter,
  drawDoodlePlatform,
  drawDoodleWipe
} from './doodle-art.js';
import { BOT_COLORS } from './index.js';
import { SKIN_PATHS, BOT_PATHS, drawSprite, platformSprite } from './sprites.js';
import { getEntranceJumpPosition } from './player.js';
import { renderLava, renderPowerups } from './mechanics.js';

const introArtwork = new WeakMap();

function paintIntroArtwork(ctx, width, centerY, drawingTime, hovered, sliding, blurPx) {
  // Rasterise the pencil grain once per held drawing. During camera travel reuse it:
  // blurring thousands of individual strokes creates thousands of filter passes.
  let cached = introArtwork.get(ctx.canvas);
  const drawing = Math.floor(drawingTime * 7.5);
  if (!cached || cached.width !== width || (!sliding && (cached.drawing !== drawing || cached.hovered !== hovered))) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 280;
    const ink = canvas.getContext('2d');
    if (!ink) return;
    drawDoodleTitle(ink, width / 2, 120, drawingTime);
    drawDoodleStartButton(ink, { x: width / 2 - 110, y: 190, width: 220, height: 50 }, hovered, drawingTime);
    cached = { canvas, width, drawing, hovered };
    introArtwork.set(ctx.canvas, cached);
  }
  ctx.save();
  if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(cached.canvas, 0, centerY - 120);
  ctx.restore();
}

/**
 * Hàm vẽ chính của trò chơi, được gọi liên tục ở mỗi khung hình trong Game Loop
 * @param {CanvasRenderingContext2D} ctx - Ngữ cảnh vẽ 2D của Canvas
 * @param {Object} state - Trạng thái toàn cục của game { player, world, bots, phase, ui... }
 */
export function render(ctx, state) {
  const { player, world, bots = [], phase = 'running', ui = {} } = state;
  const { width, height } = ctx.canvas;
  const cameraY = world.cameraY || 0;
  const timeSec = phase === 'returning_title' ? (ui.returnDrawingTime ?? 0) : performance.now() / 1000;
  const drawingTime = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : timeSec;
  const blurPx = phase === 'intro_sliding' ? Math.max(0, ui.motionBlurPx || 0) : 0;

  // Xóa sạch toàn bộ khung hình cũ trước khi vẽ khung hình mới
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Kiểm tra nếu đang chạy trong môi trường test mock cơ bản (thiếu các hàm canvas mở rộng)
  const isMock = typeof ctx.beginPath !== 'function' || typeof ctx.roundRect !== 'function' || typeof ctx.closePath !== 'function';

  // ===========================================================================
  // 1. NỀN GIẤY KẺ Ô TẬP VỞ DOODLE (SEAMLESS GRID) NỐI DÀI THEO CAMERAY
  // ===========================================================================
  if (!isMock) {
    // The faint grid uses the light velocity streaks below instead of a full-canvas blur.
    const gridSize = 28; // Kích thước mỗi ô vuông giấy tập là 28x28px
    const startY = -(cameraY % gridSize);
    ctx.strokeStyle = 'rgba(0, 70, 30, 0.06)'; // Màu xanh nhạt của dòng kẻ vở ô ly
    ctx.lineWidth = 1;

    // Vẽ các đường kẻ ngang
    // Một path chung: chỉ chạy bộ lọc blur một lần cho toàn bộ lưới mỗi frame.
    ctx.beginPath();
    for (let y = startY - gridSize; y <= height + gridSize; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    // Vẽ các đường kẻ dọc
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    // Vẽ thêm các vệt bóng kẻ dọc kéo dãn tạo cảm giác tốc độ khi camera lao dốc
    if (blurPx > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(35, 90, 62, ${Math.min(0.08, blurPx / 110)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const offset of [-3, -1.5, 1.5, 3]) {
        for (let y = startY - gridSize; y <= height + gridSize; y += gridSize) {
          ctx.moveTo(0, y + offset * blurPx);
          ctx.lineTo(width, y + offset * blurPx);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // ===========================================================================
  // 2. VẼ DANH SÁCH BỆ ĐỠ (PLATFORMS)
  // ===========================================================================
  // Ở màn hình mở đầu 'intro_title' hoặc lúc đang trượt 'intro_sliding', ẩn toàn bộ bệ
  const hiddenPlatforms = ['intro_title', 'intro_sliding', 'intro_menu_delay'].includes(phase);
  // Ở giai đoạn xuất hiện bệ, bệ sẽ hiện dần dần theo độ mờ alpha
  const limitedPlatforms = ['intro_platform', 'ready', 'intro_player', 'intro_reveal'].includes(phase);
  const revealCount = Math.max(1, ...(ui.revealRanks || [])) + 1;

  for (const [index, platform] of (hiddenPlatforms ? [] : world.platforms).entries()) {
    if (platform.broken) continue; // Bỏ qua bệ đã gãy vỡ

    // Tính tọa độ Y trên màn hình = Tọa độ thế giới trừ đi cameraY
    const py = platform.y - cameraY;
    // Cắt tỉa (Frustum Culling): không vẽ các bệ nằm ngoài tầm nhìn màn hình
    if (py < -40 || py > height + 40) continue;

    let alpha = 1;
    if (limitedPlatforms) {
      // Bệ xuất phát (index 0) hiện lên trước
      if (index === 0) alpha = Math.max(0, Math.min(1, ui.platformReveal ?? 0));
      else if (phase !== 'intro_reveal') alpha = 0;
      else alpha = Math.max(0, Math.min(1, (ui.revealProgress ?? 0) * revealCount - (ui.revealRanks?.[index] ?? 0)));
    }
    if (alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha ?? 1) * alpha;

    // Hiệu ứng phóng to nhẹ từ 85% lên 100% khi bệ xuất phát hiện ra
    if (limitedPlatforms && index === 0 && alpha < 1) {
      const scale = 0.85 + alpha * 0.15;
      ctx.translate(platform.x + platform.width / 2, py + platform.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(platform.x + platform.width / 2), -(py + platform.height / 2));
    }

    // Bảng màu dự phòng theo chủng loại bệ
    ctx.fillStyle = {
      moving: '#397fa0',   // Xanh dương cho bệ di động
      fragile: '#ad7351',  // Nâu gỗ cho bệ dễ vỡ
      bouncy: '#8654ae',   // Tím cho bệ lò xo
    }[platform.type] || '#43765c'; // Xanh lá cây cho bệ chuẩn

    if (!isMock) {
      drawDoodlePlatform(ctx, platform, py, drawingTime, index);
    } else {
      ctx.fillRect(platform.x, py, platform.width, platform.height);
    }
    ctx.restore();
  }

  // ===========================================================================
  // 3. VẼ CÁC BOT ĐỐI THỦ (RACE BOTS)
  // ===========================================================================
  if (!isMock) {
    for (const bot of bots) {
      if (bot.isDead) continue; // Bỏ qua bot đã tử nạn rơi vực
      const botY = bot.y - cameraY;
      if (botY < -60 || botY > height + 60) continue;

      // Ưu tiên vẽ ảnh chân dung Avatar của Giảng viên (Thầy Sơn, Thầy Việt, Thầy Hiệp, Thầy Nam)
      const drawn = drawSprite(ctx, BOT_PATHS[bot.type], bot.x - 8, botY - 14, bot.width + 16, bot.height + 16, [170, 130, 900, 1020]);
      // Nếu không nạp được ảnh -> vẽ nhân vật hạt đậu phong cách vẽ chì dự phòng
      if (!drawn) {
        ctx.fillStyle = BOT_COLORS[bot.type] || '#3498db';
        drawDoodleCharacter(ctx, bot, cameraY, timeSec, false, ctx.fillStyle);
      }

      // Vẽ tên của Bot phía trên đầu
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bot.name, bot.x + bot.width / 2, botY - 6);
    }
  }

  // ===========================================================================
  // 4. VẼ NHÂN VẬT NGƯỜI CHƠI (PLAYER)
  // ===========================================================================
  // Chỉ vẽ người chơi khi đã qua khỏi màn hình tiêu đề và trượt camera
  const showPlayer = !['intro_title', 'intro_sliding', 'intro_menu_delay', 'intro_platform', 'ready'].includes(phase);
  const entranceProgress = Math.max(0, Math.min(1, ui.playerEntranceProgress ?? 0));
  const entrancePos = phase === 'intro_player'
    ? getEntranceJumpPosition(entranceProgress, {
        playerWidth: player.width,
        playerHeight: player.height,
        targetX: 300,
        targetY: 388,
      })
    : null;
  const displayPlayer = entrancePos
    ? { ...player, x: entrancePos.x, y: entrancePos.y }
    : player;

  const playerY = displayPlayer.y - cameraY;
  const playerSprite = SKIN_PATHS[player.skinId] || SKIN_PATHS.doodle;

  if (showPlayer) {
    // Vẽ sprite skin người chơi
    if (!drawSprite(ctx, playerSprite, displayPlayer.x - 15, playerY - 10, displayPlayer.width + 30, displayPlayer.height + 15)) {
      if (!isMock) {
        drawDoodleCharacter(ctx, displayPlayer, cameraY, timeSec, true, player.skinColor || '#e8ad48');
      } else {
        ctx.fillStyle = player.skinColor || '#e8ad48';
        ctx.fillRect(displayPlayer.x, playerY, displayPlayer.width, displayPlayer.height);
      }
    }
  }

  // ===========================================================================
  // 4.5. HIỆU ỨNG VẬT PHẨM (POWERUPS) & DUNG NHAM (LAVA)
  // ===========================================================================
  if (!isMock) {
    const isGameplayPhase = ['running', 'paused', 'finished', 'warmup_hop', 'wipe_reset'].includes(phase);
    if (isGameplayPhase) {
      renderPowerups(ctx, world?.platforms, displayPlayer, cameraY, timeSec);
    }
    if (world?.lava && isGameplayPhase) {
      renderLava(ctx, world.lava, cameraY, width, height, timeSec, showPlayer ? displayPlayer : null);
    }
  }

  // ===========================================================================
  // 5. CÁC LỚP PHỦ GIAO DIỆN VẼ TAY TRÊN CANVAS (OVERLAYS)
  // ===========================================================================
  if (!isMock) {
    // a. Tiêu đề Doodle và nút START neo tại tọa độ thế giới trên cao (chỉ vẽ khi mở màn)
    if (phase === 'intro_title' || phase === 'intro_sliding' || phase === 'returning_title') {
      const titleWorldY = phase === 'returning_title' ? ui.returnTitleWorldY : (ui.titleWorldY ?? -490);
      const titleScreenY = titleWorldY - cameraY;

      if (titleScreenY > -160 && titleScreenY < height + 160) {
        paintIntroArtwork(ctx, width, titleScreenY, drawingTime, Boolean(ui.isStartButtonHovered), phase === 'intro_sliding' || phase === 'returning_title', blurPx);
      }
    }

    // b. Gợi ý điều khiển phác thảo Doodle ở góc phải dưới (khi nhún nhẹ chờ phím)
    if ((phase === 'intro_wait_input' && !ui.touchMode) || phase === 'warmup_hop') {
      drawDoodleArrowGuide(ctx, width, height, drawingTime);
    }

    // c. Hiệu ứng quét Wipe Transition (khi bấm 'Chơi lại')
    if (ui.wipeProgress !== undefined && ui.wipeProgress > 0 && ui.wipeProgress < 1) {
      drawDoodleWipe(ctx, ui.wipeProgress, width, height);
    }
  }

  ctx.restore();
}
