import {
  drawDoodleTitle,
  drawDoodleStartButton,
  drawDoodleArrowGuide,
  drawDoodleCharacter,
  drawDoodleWipe
} from './doodle-art.js';
import { BOT_COLORS } from './index.js';
import { SKIN_PATHS, BOT_PATHS, drawSprite, platformSprite } from './sprites.js';

export function render(ctx, state) {
  const { player, world, bots = [], phase = 'running', ui = {} } = state;
  const { width, height } = ctx.canvas;
  const cameraY = world.cameraY || 0;
  const timeSec = (performance.now() / 1000);

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Kiểm tra nếu đang chạy trong môi trường test mock cơ bản (thiếu các hàm canvas mở rộng)
  const isMock = typeof ctx.beginPath !== 'function' || typeof ctx.roundRect !== 'function' || typeof ctx.closePath !== 'function';

  // 1. Nền giấy kẻ ô Doodle (Seamless Grid) nối dài theo cameraY
  if (!isMock) {
    const gridSize = 28;
    const startY = -(cameraY % gridSize);
    ctx.strokeStyle = 'rgba(0, 70, 30, 0.06)';
    ctx.lineWidth = 1;

    for (let y = startY - gridSize; y <= height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  // Keep the title empty; platforms fade in as the camera starts moving.
  const platformReveal = phase === 'intro_title' ? 0
    : phase === 'intro_sliding' ? Math.max(0, Math.min(1, ui.platformReveal ?? 0)) : 1;
  ctx.save();
  ctx.globalAlpha = (ctx.globalAlpha ?? 1) * platformReveal;
  for (const platform of platformReveal > 0 ? world.platforms : []) {
    if (platform.broken) continue;
    const py = platform.y - cameraY;
    if (py < -40 || py > height + 40) continue;

    ctx.fillStyle = {
      moving: '#397fa0',
      fragile: '#ad7351',
      bouncy: '#8654ae',
    }[platform.type] || '#43765c';

    if (!drawSprite(ctx, platformSprite(platform.type), platform.x, py - 5, platform.width, platform.height + 10)) {
      ctx.fillRect(platform.x, py, platform.width, platform.height);
    }

    if (!isMock && platform.type === 'bouncy') {
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(platform.x + platform.width / 2 - 6, py + 2, 12, 4);
    }
  }
  ctx.restore();

  // 3. Vẽ các Bot đối thủ theo đúng phong cách chữ nhật nguyên bản dev
  if (!isMock) {
    for (const bot of bots) {
      if (bot.isDead) continue;
      const botY = bot.y - cameraY;
      if (botY < -60 || botY > height + 60) continue;

      const drawn = drawSprite(ctx, BOT_PATHS[bot.type], bot.x - 8, botY - 14, bot.width + 16, bot.height + 16, [170, 130, 900, 1020]);
      if (!drawn) {
        ctx.fillStyle = BOT_COLORS[bot.type] || '#3498db';
        drawDoodleCharacter(ctx, bot, cameraY, timeSec, false, ctx.fillStyle);
      }

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bot.name, bot.x + bot.width / 2, botY - 6);
    }
  }

  // 4. Vẽ nhân vật người chơi (Player) - Nguyên bản dev với skin màu
  const playerY = player.y - cameraY;
  const playerSprite = SKIN_PATHS[player.skinId] || SKIN_PATHS.doodle;
  if (!drawSprite(ctx, playerSprite, player.x - 15, playerY - 10, player.width + 30, player.height + 15)) {
    if (!isMock) drawDoodleCharacter(ctx, player, cameraY, timeSec, true, player.skinColor || '#e8ad48');
    else {
      ctx.fillStyle = player.skinColor || '#e8ad48';
      ctx.fillRect(player.x, playerY, player.width, player.height);
    }
  }

  if (!isMock) {
    // 5. Tiêu đề Doodle và nút START neo tại tọa độ thế giới trên cùng y = -490 (chỉ vẽ khi mở màn, vẽ trên bệ)
    if (phase === 'intro_title' || phase === 'intro_sliding') {
      const titleWorldY = -490;
      const titleScreenY = titleWorldY - cameraY;

      if (titleScreenY > -160 && titleScreenY < height + 160) {
        drawDoodleTitle(ctx, width / 2, titleScreenY, timeSec);

        const btnBounds = {
          x: width / 2 - 110,
          y: titleScreenY + 70,
          width: 220,
          height: 50,
        };
        drawDoodleStartButton(ctx, btnBounds, Boolean(ui.isStartButtonHovered), timeSec);
      }
    }

    // 6. Gợi ý điều khiển phác thảo Doodle ở góc phải dưới (khi nhún nhẹ chờ phím)
    if (phase === 'warmup_hop') {
      drawDoodleArrowGuide(ctx, width, height, timeSec);
    }

    // 7. Hiệu ứng quét Wipe Transition (khi bấm 'Chơi lại')
    if (ui.wipeProgress !== undefined && ui.wipeProgress > 0 && ui.wipeProgress < 1) {
      drawDoodleWipe(ctx, ui.wipeProgress, width, height);
    }
  }

  ctx.restore();
}
