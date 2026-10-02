// frontend/src/game/mechanics.js
// Triển khai logic 4 cơ chế gameplay mới:
// 1. Dung nham dâng (Rising Lava)
// 2. Cân bằng nhịp nhảy Bot (Bot Jump Cooldown & Pacing)
// 3. Hệ thống Vật phẩm bổ trợ (Powerups: Rocket, Shield)
// 4. Render hiệu ứng đồ họa bổ trợ

import {
  GRAVITY,
  JUMP_VELOCITY,
  MAX_VY,
  LAVA_INITIAL_SPEED,
  LAVA_ACCEL,
  LAVA_MAX_SPEED,
  LAVA_INITIAL_Y,
  POWERUP_SPAWN_CHANCE,
  POWERUP_ROCKET_CHANCE,
  POWERUP_TYPES,
  POWERUP_CONFIG,
  ROCKET_DURATION,
  ROCKET_SPEED_Y,
  SHIELD_DURATION,
  SHIELD_LAVA_REBOUND_VELOCITY,
} from './index.js';
import { onBotBounce } from './bots.js';
import { isLandingOnPlatform } from './collision.js';
import { drawSprite, POWERUP_PATHS } from './sprites.js';
import { t } from '../i18n/index.js';

// =============================================================================
// 1. CƠ CHẾ DUNG NHAM DÂNG (RISING LAVA)
// =============================================================================
export function createLavaState() {
  return {
    y: LAVA_INITIAL_Y,
    speed: LAVA_INITIAL_SPEED,
    elapsed: 0,
  };
}

export function updateLava({
  lava,
  dt,
  world,
  player,
  bots = [],
  soundManager,
  onGameOver,
}) {
  if (!lava) return;

  // Dâng dần từ dưới lên theo trục Y (trong Canvas Y giảm là đi lên trên)
  lava.elapsed += dt;
  lava.speed = Math.min(LAVA_MAX_SPEED, LAVA_INITIAL_SPEED + LAVA_ACCEL * lava.elapsed);
  lava.y -= lava.speed * dt;

  // Xóa bệ đỡ bị dung nham nuốt chửng
  if (Array.isArray(world?.platforms)) {
    world.platforms = world.platforms.filter((p) => p.y < lava.y);
  }

  // Va chạm với Player
  const playerBottom = player.y + player.height;
  if (playerBottom >= lava.y) {
    const isRocketActive = player.powerup?.rocketTimer > 0;
    const isShieldActive = player.powerup?.shieldTimer > 0;

    if (isRocketActive) {
      // Rocket bất tử hoàn toàn với dung nham
    } else if (isShieldActive) {
      // Khiên tiêu biến ngay lập tức để cứu mạng và bật nảy siêu mạnh
      player.powerup.shieldTimer = 0;
      player.vy = SHIELD_LAVA_REBOUND_VELOCITY;
      player.y = lava.y - player.height - 4;
      soundManager?.playSFX('shieldBreak');
    } else {
      // Chết tức thì nếu không có khiên
      soundManager?.playSFX('lavaBurn');
      onGameOver?.('lava');
    }
  }

  // Va chạm với Bot đối thủ
  for (const bot of bots) {
    if (bot.isDead) continue;
    if (bot.y + bot.height >= lava.y) {
      bot.isDead = true;
    }
  }
}

// =============================================================================
// 2. CÂN BẰNG NHỊP NHẢY BOT (BOT JUMP COOLDOWN & PACING)
// =============================================================================
export function updateBotPhysics(bot, platforms, dt) {
  if (bot.isDead || bot.isEntering) return;

  // Trạng thái đang đậu trên bệ chờ dậm nhảy
  if (bot.isGrounded) {
    bot.vy = 0;
    if (bot.standingPlatform) {
      if (bot.standingPlatform.broken) {
        bot.isGrounded = false;
        bot.standingPlatform = null;
      } else {
        bot.y = bot.standingPlatform.y - bot.height;
        if (bot.standingPlatform.vx) {
          bot.x += bot.standingPlatform.vx * dt;
        }
      }
    }

    bot.jumpCooldownTimer = (bot.jumpCooldownTimer || 0) - dt;
    if (bot.jumpCooldownTimer <= 0) {
      bot.isGrounded = false;
      const bounceMult = bot.standingPlatform?.type === 'bouncy' ? 1.45 : 1.0;
      bot.vy = JUMP_VELOCITY * bounceMult;
      onBotBounce(bot, bot.standingPlatform);
      bot.standingPlatform = null;
      bot.prevY = bot.y;
    }
    return;
  }

  // Trạng thái trên không: Ép dùng chung GRAVITY với Player
  // Lưu tọa độ Y trước khi rơi để kiểm tra va chạm đáp bệ từ trên xuống
  const prevY = Number.isFinite(bot.prevY) ? bot.prevY : bot.y;
  bot.vy = Math.min(MAX_VY, bot.vy + GRAVITY * dt);
  bot.y += bot.vy * dt;
  bot.prevY = prevY;

  // Kiểm tra tiếp đất lên bệ: CHỈ TIẾP ĐẤT KHI ĐANG RƠI XUỐNG VÀ ĐÁP TỪ TRÊN XUỐNG
  // (Dùng chung chuẩn isLandingOnPlatform với Player, không bắt bệ khi nhảy từ dưới lên)
  if (bot.vy > 0) {
    let landing = null;
    for (const p of platforms) {
      if (p.broken) continue;
      if (isLandingOnPlatform(bot, p)) {
        if (!landing || p.y < landing.y) {
          landing = p;
        }
      }
    }

    if (landing) {
      const bounceMult = landing.type === 'bouncy' ? 1.45 : 1.0;
      const cooldown = bot.profile?.jumpCooldown ?? 0;

      if (cooldown > 0) {
        // Nếu có cấu hình độ trễ dậm nhảy thì đứng chờ trên bệ
        bot.y = landing.y - bot.height;
        bot.vy = 0;
        bot.isGrounded = true;
        bot.standingPlatform = landing;
        bot.jumpCooldownTimer = cooldown;
      } else {
        // Nhảy lên ngay lập tức khi tiếp đất giống hệt Người chơi (không bị dính bệ)
        bot.y = landing.y - bot.height;
        bot.vy = JUMP_VELOCITY * bounceMult;
        bot.isGrounded = false;
        bot.standingPlatform = null;
        onBotBounce(bot, landing);
      }

      if (landing.type === 'fragile' || landing.type === 'breakable') {
        landing.broken = true;
      }
    }
  }

  bot.prevY = bot.y;
}

// =============================================================================
// 3. HỆ THỐNG VẬT PHẨM BỔ TRỢ (POWERUPS)
// =============================================================================
export function createPowerupState() {
  return {
    rocketTimer: 0,
    shieldTimer: 0,
  };
}

export function spawnPowerupsForPlatforms(platforms, rng = Math.random) {
  if (!Array.isArray(platforms)) return;
  for (let i = 1; i < platforms.length; i++) {
    const p = platforms[i];
    if (p.type === 'floor' || p.type === 'finish' || p.type === 'fragile') continue;

    if (rng() < POWERUP_SPAWN_CHANCE) {
      p.powerup = rng() < POWERUP_ROCKET_CHANCE ? POWERUP_TYPES.ROCKET : POWERUP_TYPES.SHIELD;
    }
  }
}

export function updatePowerups({ player, platforms, dt, soundManager }) {
  if (!player.powerup) player.powerup = createPowerupState();

  // Nhặt vật phẩm
  if (Array.isArray(platforms)) {
    for (const p of platforms) {
      if (!p.powerup || p.broken) continue;

      const itemX = p.x + p.width / 2 - 12;
      const itemY = p.y - 24;
      const itemWidth = 24;
      const itemHeight = 24;

      const isOverlap =
        player.x + player.width > itemX &&
        player.x < itemX + itemWidth &&
        player.y + player.height > itemY &&
        player.y < itemY + itemHeight;

      if (isOverlap) {
        if (p.powerup === POWERUP_TYPES.ROCKET) {
          // Không cho phép nhặt chồng Tên lửa khi đang trong hiệu lực bay (chống bay liên tục)
          if (player.powerup.rocketTimer > 0) continue;
          player.powerup.rocketTimer = ROCKET_DURATION;
          player.vy = ROCKET_SPEED_Y;
          soundManager?.playSFX('rocket');
          delete p.powerup;
        } else if (p.powerup === POWERUP_TYPES.SHIELD) {
          player.powerup.shieldTimer = SHIELD_DURATION;
          soundManager?.playSFX('shield');
          delete p.powerup;
        }
      }
    }
  }

  // Cập nhật hiệu lực Rocket (bỏ qua trọng lực)
  if (player.powerup.rocketTimer > 0) {
    player.powerup.rocketTimer -= dt;
    player.vy = ROCKET_SPEED_Y;
    if (player.powerup.rocketTimer <= 0) {
      player.vy = -180;
    }
  }

  // Cập nhật hiệu lực Shield
  if (player.powerup.shieldTimer > 0) {
    player.powerup.shieldTimer = Math.max(0, player.powerup.shieldTimer - dt);
  }
}

// =============================================================================
// 4. RENDER ĐỒ HỌA DUNG NHAM & HIỆU ỨNG POWERUPS
// =============================================================================
export function renderLava(ctx, lava, cameraY, width, height, time = 0, player = null) {
  if (!lava) return;
  const screenLavaY = lava.y - cameraY;

  // 1. Cảnh báo khoảng cách Dung nham (Lava Distance Warning)
  if (player) {
    const playerBottom = player.y + player.height;
    const lavaDistance = Math.max(0, Math.round(lava.y - playerBottom));

    // Hiển thị huy hiệu cảnh báo khi dung nham cách dưới 250m
    if (lavaDistance < 250) {
      ctx.save();
      const isCritical = lavaDistance < 100;
      const pulse = Math.sin(time * 8) * (isCritical ? 2.5 : 1.2);
      ctx.font = 'bold 12px sans-serif';
      const warningText = isCritical
        ? t('game.lava_warning_critical', { distance: lavaDistance })
        : t('game.lava_warning_notice', { distance: lavaDistance });
      const textW = typeof ctx.measureText === 'function' ? ctx.measureText(warningText)?.width || 0 : 0;
      const badgeW = Math.max(210, textW + 24);
      const badgeH = 30;
      const badgeX = (width - badgeW) / 2;
      const badgeY = Math.min(height - 42, Math.max(20, screenLavaY - 42)) + pulse;

      ctx.fillStyle = isCritical ? 'rgba(220, 38, 38, 0.92)' : 'rgba(234, 88, 12, 0.88)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(warningText, width / 2, badgeY + badgeH / 2);
      ctx.restore();
    }
  }

  if (screenLavaY > height + 40) return;

  ctx.save();
  const grad = ctx.createLinearGradient(0, screenLavaY, 0, screenLavaY + 200);
  grad.addColorStop(0, '#ff471a');
  grad.addColorStop(0.35, '#e62e00');
  grad.addColorStop(1, '#990000');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, screenLavaY);

  const waveLength = 48;
  const waveAmp = 5;
  for (let x = 0; x <= width; x += 12) {
    const yWave = Math.sin((x / waveLength) + time * 4.5) * waveAmp;
    ctx.lineTo(x, screenLavaY + yWave);
  }

  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
}

export function renderPowerups(ctx, platforms, player, cameraY, time = 0) {
  // 1. Vật phẩm trên bệ
  if (Array.isArray(platforms)) {
    for (const p of platforms) {
      if (!p.powerup || p.broken) continue;
      const itemX = p.x + p.width / 2;
      const itemY = p.y - 14 - cameraY;
      const floatOffset = Math.sin(time * 5 + p.x) * 3;

      ctx.save();
      ctx.translate(itemX, itemY + floatOffset);

      const cfg = POWERUP_CONFIG?.[p.powerup] || { width: 24, height: 26 };
      const spritePath = cfg.src || POWERUP_PATHS?.[p.powerup];
      const drawn = drawSprite(
        ctx,
        spritePath,
        -cfg.width / 2,
        -cfg.height / 2,
        cfg.width,
        cfg.height
      );

      // Nếu ảnh chưa sẵn sàng hoặc không tải được -> dùng vector doodle fallback
      if (!drawn) {
        if (p.powerup === POWERUP_TYPES.ROCKET) {
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(8, 8);
          ctx.lineTo(-8, 8);
          ctx.closePath();
          ctx.fill();
        } else if (p.powerup === POWERUP_TYPES.SHIELD) {
          ctx.strokeStyle = '#3498db';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // 2. Hiệu ứng phụt lửa Rocket dưới chân
  if (player?.powerup?.rocketTimer > 0) {
    ctx.save();
    const feetX = player.x + player.width / 2;
    const feetY = player.y + player.height - cameraY;
    ctx.fillStyle = Math.random() < 0.5 ? '#ff9900' : '#ff3300';
    ctx.beginPath();
    ctx.moveTo(feetX - 8, feetY);
    ctx.lineTo(feetX + 8, feetY);
    ctx.lineTo(feetX, feetY + 22 + Math.random() * 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 3. Hiệu ứng vòng khiên Shield năng lượng
  if (player?.powerup?.shieldTimer > 0) {
    ctx.save();
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2 - cameraY;
    const pulse = Math.sin(time * 6) * 2;
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.85)';
    ctx.fillStyle = 'rgba(52, 152, 219, 0.18)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, player.height * 0.72 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
