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
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from './index.js';
import { onBotBounce, updateBotAI, findCompanionPlatform } from './bots.js';
import { isLandingOnPlatform } from './collision.js';
import { drawSprite, POWERUP_PATHS, POWERUP_EFFECT_PATHS, LAVA_PATH, LAVA_FLAME_PATH } from './sprites.js';

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

  // Các thầy bất tử; dung nham chỉ kết thúc lượt của người chơi.
}

// =============================================================================
// 2. CÂN BẰNG NHỊP NHẢY BOT (BOT JUMP COOLDOWN & PACING)
// =============================================================================
export function updateBotPhysics(bot, platforms, dt, { cameraY = null } = {}) {
  if (bot.isDead || bot.isEntering) return;

  // Trạng thái đang đậu trên bệ chờ dậm nhảy
  if (bot.isGrounded) {
    bot.vy = 0;
    if (bot.standingPlatform) {
      if (bot.standingPlatform.broken || !platforms.includes(bot.standingPlatform)) {
        bot.isGrounded = false;
        bot.standingPlatform = null;
        bot.waitingForCamera = false;
        bot.prevY = bot.y;
        return;
      } else {
        bot.y = bot.standingPlatform.y - bot.height;
        if (bot.standingPlatform.vx) {
          bot.x += bot.standingPlatform.vx * dt;
        }
        bot.prevY = bot.y;
        bot.vx = 0;
        const screenY = cameraY === null ? Infinity : bot.y - cameraY;
        bot.waitingForCamera = screenY < (bot.waitingForCamera ? 140 : 80);
        if (bot.waitingForCamera) return;
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
  const prevY = bot.y;
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

      const aheadOfCamera = cameraY !== null && landing.y - bot.height - cameraY < 80;
      if (cooldown > 0 || aheadOfCamera) {
        // Nếu có cấu hình độ trễ dậm nhảy thì đứng chờ trên bệ
        bot.y = landing.y - bot.height;
        bot.vy = 0;
        bot.isGrounded = true;
        bot.standingPlatform = landing;
        bot.jumpCooldownTimer = cooldown;
        bot.waitingForCamera = aheadOfCamera;
        bot.vx = 0;
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

/** Nhảy cao bắt kịp tới bệ gần người chơi; chỉ camera người chơi quyết định nhịp chờ. */
export function updateBotCompanion(bot, world, player, dt, allBots = [], screenHeight = SCREEN_HEIGHT) {
  if (bot.isEntering) return;
  bot.isDead = false;
  const platforms = world.platforms;
  const lavaY = world.lava?.y ?? Infinity;
  const invalidCatchUp = bot.catchUp && (bot.catchUp.platform.broken
    || !platforms.includes(bot.catchUp.platform) || bot.catchUp.platform.y >= lavaY - 24);
  if (invalidCatchUp) bot.catchUp = null;
  const behind = bot.y - world.cameraY > screenHeight
    || bot.y + bot.height >= lavaY - 12;
  if (!bot.catchUp && (behind || invalidCatchUp)) {
    const platform = findCompanionPlatform(bot, platforms, player, allBots, lavaY);
    if (platform) {
      const targetX = platform.x + (platform.width - bot.width) / 2;
      let dx = targetX - bot.x;
      if (dx > SCREEN_WIDTH / 2) dx -= SCREEN_WIDTH;
      if (dx < -SCREEN_WIDTH / 2) dx += SCREEN_WIDTH;
      bot.catchUp = { platform, x: bot.x, y: bot.y, elapsed: 0,
        targetX, dx,
        duration: Math.min(1.4, Math.max(0.65, Math.abs(bot.y - platform.y) / 900)) };
      bot.targetPlatform = platform;
      bot.targetOffsetX = 0;
      bot.isGrounded = false;
      bot.waitingForCamera = false;
      bot.standingPlatform = null;
      bot.reactionTimer = 0;
    } else if (bot.vy >= 0) {
      // Bệ chưa được sinh lại: bật lên và tìm bệ ở frame kế tiếp.
      bot.vy = -900;
      bot.isGrounded = false;
      bot.standingPlatform = null;
    }
  }

  if (bot.catchUp) {
    const jump = bot.catchUp;
    jump.elapsed += dt;
    const p = Math.min(1, jump.elapsed / jump.duration);
    const targetX = jump.platform.x + (jump.platform.width - bot.width) / 2;
    const targetY = jump.platform.y - bot.height;
    // Giữ hướng xuyên mép đã chọn khi bật nhảy, cộng chuyển động thật của bệ.
    const dx = jump.dx + targetX - jump.targetX;
    bot.prevY = bot.y;
    bot.x = ((jump.x + dx * p) % SCREEN_WIDTH + SCREEN_WIDTH) % SCREEN_WIDTH;
    const arc = Math.abs(targetY - jump.y) + 480;
    bot.y = jump.y + (targetY - jump.y) * p - arc * p * (1 - p);
    bot.vx = dx / jump.duration;
    bot.vy = ((targetY - jump.y) - arc * (1 - 2 * p)) / jump.duration;
    bot.direction = dx >= 0 ? 'right' : 'left';
    if (p === 1) {
      bot.x = targetX;
      bot.y = targetY;
      bot.prevY = targetY;
      bot.vx = bot.vy = 0;
      bot.isGrounded = true;
      bot.standingPlatform = jump.platform;
      bot.jumpCooldownTimer = bot.profile?.jumpCooldown ?? 0;
      bot.catchUp = null;
      onBotBounce(bot, jump.platform);
      bot.waitingForCamera = bot.y - world.cameraY < 80;
    }
    return;
  }

  updateBotAI(bot, platforms, dt, allBots, world.cameraY);
  updateBotPhysics(bot, platforms, dt, { cameraY: world.cameraY });
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
// Sample inside the illustrated block: the master JPG includes a paper border.
const LAVA_SOURCE_RECT = [176, 210, 912, 510];
const LAVA_TILE_WIDTH = 640;
const LAVA_TILE_HEIGHT = LAVA_TILE_WIDTH * LAVA_SOURCE_RECT[3] / LAVA_SOURCE_RECT[2];
const LAVA_WAVE_ENVELOPE = 33; // 20px rolling wave + 7px ripple + 6px bob.

function lavaSurfaceY(surfaceY, x, time) {
  const phase = time * Math.PI / 2;
  const shift = Math.sin(phase) * 28;
  return surfaceY + Math.sin(phase * 2) * 6
    + Math.sin((x - shift) / 76 - phase) * 20
    + Math.sin((x + shift) / 39 + phase * 2) * 7;
}

function drawLavaArtwork(ctx, surfaceY, width, height, time) {
  if (typeof ctx.drawImage !== 'function' || typeof ctx.clip !== 'function') return false;
  const shift = Math.sin(time * Math.PI / 2) * 28; // One gentle left/right cycle every 4s.
  const bob = Math.sin(time * Math.PI) * 6;
  const top = surfaceY + bob - 29; // Cover every crest, including while bobbing.
  const firstRow = Math.max(0, Math.floor(-top / LAVA_TILE_HEIGHT));
  const lastRow = Math.ceil((height - top) / LAVA_TILE_HEIGHT);
  const lastColumn = Math.ceil((width - shift) / LAVA_TILE_WIDTH);
  let ready = false;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, lavaSurfaceY(surfaceY, 0, time));
  for (let x = 8; x < width; x += 8) {
    ctx.lineTo(x, lavaSurfaceY(surfaceY, x, time));
  }
  ctx.lineTo(width, lavaSurfaceY(surfaceY, width, time));
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.clip();

  // Extra tiles stay outside both screen edges throughout the sway. Mirroring
  // makes adjoining edges share the same pixels without a paper gap.
  for (let row = firstRow; row < lastRow; row += 1) {
    for (let column = -1; column < lastColumn; column += 1) {
      const flipX = Math.abs(column % 2) === 1;
      const flipY = row % 2 === 1;
      const x = column * LAVA_TILE_WIDTH + shift;
      const y = top + row * LAVA_TILE_HEIGHT;
      ctx.save();
      ctx.translate(x + (flipX ? LAVA_TILE_WIDTH : 0), y + (flipY ? LAVA_TILE_HEIGHT : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ready = drawSprite(ctx, LAVA_PATH, 0, 0, LAVA_TILE_WIDTH, LAVA_TILE_HEIGHT, LAVA_SOURCE_RECT);
      ctx.restore();
      if (!ready) break;
    }
    if (!ready) break;
  }
  ctx.restore();
  return ready;
}

// A paper warning belongs to the scene, behind platforms and characters.
// Its position follows the lava directly; never clamp it to the HUD.
export function renderLavaDanger(ctx, lava, cameraY, width, height, time = 0) {
  if (!lava) return;
  const y = lava.y - cameraY - 88;
  if (y > height + 45 || y < -65) return;
  const drawing = Math.floor(time * 7.5);
  const tilt = Math.sin(drawing * .19) * 1.2;
  ctx.save();
  ctx.globalAlpha *= .64;
  ctx.fillStyle = '#eed399';
  ctx.strokeStyle = '#9d7750';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -20; x <= width + 30; x += 16) {
    const edgeY = y + Math.sin(x * .16) * 1.5 + tilt * x / width;
    if (x === -20) ctx.moveTo(x, edgeY); else ctx.lineTo(x, edgeY);
  }
  for (let x = width + 30; x >= -20; x -= 16) ctx.lineTo(x, y + 39 + Math.sin(x * .21) * 1.5 + tilt * x / width);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#923d2c';
  ctx.font = '24px "Doodle Hand", "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let x = 64; x < width + 100; x += 142) {
    ctx.fillText('DANGER', x, y + 20 + tilt * x / width);
    ctx.beginPath();
    ctx.moveTo(x + 59, y + 11); ctx.lineTo(x + 51, y + 29);
    ctx.moveTo(x + 66, y + 11); ctx.lineTo(x + 58, y + 29);
    ctx.stroke();
  }
  ctx.restore();
}

const FLAME_FRAMES = [[140, 48, 670, 800], [977, 48, 670, 800]];

function drawLavaEmbers(ctx, surfaceY, width, height, time) {
  const drawing = Math.floor(time * 7.5);
  const count = Math.min(16, Math.ceil(width / 86));
  for (let i = 0; i < count; i += 1) {
    const cycle = (time * (.27 + (i % 3) * .035) + i * .618) % 1;
    const x = (i + .5) * width / count + Math.sin(time * 1.3 + i * 2.4) * 13;
    const baseY = lavaSurfaceY(surfaceY, x, time);
    const size = 25 + (i % 4) * 6;
    const flameY = baseY + 9 - size - cycle * 16;
    if (flameY > height + 40 || flameY + size < -10) continue;
    ctx.save();
    ctx.globalAlpha *= .58 + Math.sin(cycle * Math.PI) * .38;
    const frame = FLAME_FRAMES[(drawing + i) % 2];
    const flameWidth = size * frame[2] / frame[3];
    if (!drawSprite(ctx, LAVA_FLAME_PATH, x - flameWidth / 2, flameY, flameWidth, size, frame)) {
      ctx.fillStyle = '#ee8e19';
      ctx.beginPath();
      ctx.moveTo(x, flameY); ctx.lineTo(x + size * .24, flameY + size * .7);
      ctx.lineTo(x, flameY + size); ctx.lineTo(x - size * .23, flameY + size * .72);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // Analytic lifetimes keep particles bounded: no list growth or reset debris.
  for (let i = 0; i < count * 2; i += 1) {
    const age = (time * (.22 + (i % 5) * .02) + i * .381966) % 1;
    const x = ((i * 137.5 + Math.sin(time + i) * 19) % width + width) % width;
    const y = lavaSurfaceY(surfaceY, x, time) - 8 - age * 125;
    if (y < -8 || y > height + 8) continue;
    ctx.save();
    ctx.globalAlpha *= (1 - age) * .75;
    ctx.strokeStyle = i % 2 ? '#cc622d' : '#eca928';
    ctx.lineWidth = 1.5 + (i % 3) * .45;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + (i % 2), y - 4 - (i % 3)); ctx.stroke();
    ctx.restore();
  }
}

export function renderLava(ctx, lava, cameraY, width, height, time = 0) {
  if (!lava) return;
  const screenLavaY = lava.y - cameraY;
  if (screenLavaY > height + 145) return;

  if (screenLavaY <= height + LAVA_WAVE_ENVELOPE + 2 && !drawLavaArtwork(ctx, screenLavaY, width, height, time)) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, screenLavaY, 0, screenLavaY + 200);
    grad.addColorStop(0, '#ff471a');
    grad.addColorStop(0.35, '#e62e00');
    grad.addColorStop(1, '#990000');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, lavaSurfaceY(screenLavaY, 0, time));
    for (let x = 8; x < width; x += 8) {
      ctx.lineTo(x, lavaSurfaceY(screenLavaY, x, time));
    }
    ctx.lineTo(width, lavaSurfaceY(screenLavaY, width, time));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
  }
  drawLavaEmbers(ctx, screenLavaY, width, height, time);
}

export function renderPowerups(ctx, platforms, player, cameraY, time = 0) {
  // Hold each pencil pose for 1/7.5s. A frozen drawing time also freezes effects.
  const drawing = Math.floor(time * 7.5);
  const heldTime = drawing / 7.5;
  // 1. Vật phẩm trên bệ
  if (Array.isArray(platforms)) {
    for (const p of platforms) {
      if (!p.powerup || p.broken) continue;
      const itemX = p.x + p.width / 2;
      const itemY = p.y - 14 - cameraY;
      const floatOffset = Math.sin(heldTime * 5 + p.x) * 2;

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
        cfg.height,
        cfg.sourceRect
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
    const pose = drawing % 4;
    const flameHeight = [39, 34, 43, 37][pose];
    const flameWidth = [29, 32, 27, 31][pose];
    ctx.translate(feetX + [0, -1, 1, 0][pose], feetY - 3);
    if (!drawSprite(ctx, POWERUP_EFFECT_PATHS.rocket, -flameWidth / 2, 0, flameWidth, flameHeight, [100, 210, 1060, 1030])) {
      ctx.fillStyle = '#f5a12a';
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(-12, 15); ctx.lineTo(-5, 12);
      ctx.lineTo(0, flameHeight); ctx.lineTo(8, 14); ctx.lineTo(11, 17); ctx.lineTo(8, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b65d26'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Hiệu ứng vòng khiên Shield năng lượng
  if (player?.powerup?.shieldTimer > 0) {
    ctx.save();
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2 - cameraY;
    const diameter = player.height * 2.25 + [0, 2, -1, 1][drawing % 4];
    ctx.translate(centerX, centerY);
    ctx.rotate([-.025, .018, -.012, .025][drawing % 4]);
    ctx.globalAlpha *= player.powerup.shieldTimer < .8 && drawing % 2 ? .45 : .9;
    if (!drawSprite(ctx, POWERUP_EFFECT_PATHS.shield, -diameter / 2, -diameter / 2, diameter, diameter, [48, 42, 1170, 1170])) {
      ctx.strokeStyle = '#66cbd4';
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath();
        for (let step = 0; step <= 48; step++) {
          const angle = step * Math.PI / 24;
          const radius = diameter * .43 + ring * 3 + Math.sin(angle * 5 + drawing) * 1.1;
          const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
          if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
