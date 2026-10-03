// frontend/src/game/bots.js
// BOT-01 · Nguyễn Đình Phú Vinh
// Các thầy đồng hành: dữ liệu và cá tính chọn bệ.

import {
  SCREEN_WIDTH,
  MAX_VX,
  BOT_WIDTH,
  BOT_HEIGHT,
  BOT_ACCEL,
  BOT_PROFILES,
  JUMP_VELOCITY,
  GRAVITY,
} from './index.js';

export { BOT_PROFILES };

const PROFILE_MAP = {
  son: 'NOVICE',
  viet: 'STANDARD',
  quang: 'SPEEDRUNNER',
  hiep: 'SPEEDRUNNER',
  nam: 'PERFECT',
};

export function createStartingBots(startY = 388) {
  return createRaceBots([
    { id: 'teacher-son', name: 'Thầy Sơn', sprite_id: 'son' },
    { id: 'teacher-viet', name: 'Thầy Việt', sprite_id: 'viet' },
    { id: 'teacher-quang', name: 'Thầy Quang', sprite_id: 'quang' },
    { id: 'teacher-nam', name: 'Thầy Nam', sprite_id: 'nam' },
  ]).map((bot) => ({ ...bot, y: startY, prevY: startY, vy: 0 }));
}

/**
 * BOT-01: Tạo danh sách bot từ cấu hình profiles nhận vào.
 * Sao chép từng phần tử, không mutate dữ liệu truyền vào.
 */
export function createBots(profiles = []) {
  return profiles.map((profile) => ({
    ...profile,
  }));
}

export function createRaceBots(profiles = []) {
  return profiles.map((profile, index) => {
    const laneX = 96 + index * 230;
    const spriteId = profile.sprite_id || profile.id || 'nam';
    const profileKey = PROFILE_MAP[spriteId] || (profile.type || '').toUpperCase();
    const bot = createBot(profileKey, laneX, 388, {
      id: profile.id || `bot-${index}`,
      name: profile.name || `Bot ${index + 1}`,
      sprite_id: spriteId,
      base_speed: profile.base_speed || 44,
      lane: laneX,
      isDead: false,
    });
    return bot;
  });
}

/**
 * Khởi tạo một đối tượng Bot hoàn chỉnh khi đưa vào game loop
 */
export function createBot(typeKey, startX, startY = 388, overrides = {}) {
  const profile = BOT_PROFILES[typeKey] || BOT_PROFILES.STANDARD;
  const randomSide = Math.random() < 0.5 ? -1 : 1;
  const currentAimOffset = (profile.aimOffset || 0) * randomSide;

  return {
    id: typeKey.toLowerCase(),
    type: typeKey,
    name: profile.name,
    x: startX,
    y: startY,
    prevY: startY,
    width: BOT_WIDTH,
    height: BOT_HEIGHT,
    vx: 0,
    vy: JUMP_VELOCITY, // Bật nhảy lên ngay khi xuất phát
    isDead: false,
    direction: 'right',

    // Trạng thái AI
    profile,
    targetPlatform: null,
    targetOffsetX: currentAimOffset,
    lastPlatformY: startY,
    lastPlatformType: 'standard',
    reactionTimer: profile.reactionDelay || 0,
    ...overrides,
  };
}

// Chia mục tiêu cho mọi cá tính, vẫn dùng chung khi không có lựa chọn khác.
function preferUnclaimed(bot, platforms, allBots, superJump = false) {
  const claims = new Set(allBots.filter(other => other !== bot)
    .flatMap(other => [other.targetPlatform, other.standingPlatform, other.catchUp?.platform,
      other.isEntering ? other.entrancePlatform : null])
    .filter(Boolean));
  // Tránh giành bệ chỉ sau khi kiểm tra thời gian bay và tầm di chuyển ngang.
  // Cú nhảy bắt kịp có quỹ đạo riêng nên không bị giới hạn bởi cú nhảy thường.
  const reachable = superJump ? platforms : platforms.filter(platform => {
    const vy = bot.isGrounded ? JUMP_VELOCITY : bot.vy;
    const discriminant = vy * vy + 2 * GRAVITY * (platform.y - (bot.y + bot.height));
    if (discriminant < 0) return false;
    const airTime = (-vy + Math.sqrt(discriminant)) / GRAVITY;
    const maxVx = MAX_VX * (bot.profile?.speedMultiplier || 0.8);
    const steeringTime = Math.max(0, airTime - (bot.reactionTimer || 0));
    const travel = Math.max(0, maxVx * steeringTime - maxVx * maxVx / (2 * BOT_ACCEL));
    const directDx = Math.abs(platform.x + platform.width / 2 - (bot.x + bot.width / 2));
    const dx = Math.min(directDx, Math.abs(SCREEN_WIDTH - directDx));
    const requiredTravel = Math.max(0, dx - (platform.width + bot.width) / 2 + 8);
    return requiredTravel <= travel;
  });
  const pool = reachable.length ? reachable : platforms;
  const free = pool.filter(platform => !claims.has(platform));
  return free.length ? free : pool;
}

export function findCompanionPlatform(bot, platforms, player, allBots = [], lavaY = Infinity) {
  const safe = platforms.filter(p => !p.broken && p.y < lavaY - 24
    && p.type !== 'fragile' && p.type !== 'breakable');
  const nearPlayer = safe.filter(p => Math.abs(p.y - (player.y + player.height)) <= 120);
  const pool = preferUnclaimed(bot, nearPlayer.length ? nearPlayer : safe, allBots, true);
  return pool.sort((a, b) => Math.abs(a.y - (player.y + player.height))
    - Math.abs(b.y - (player.y + player.height)))[0] || null;
}

/**
 * Tìm kiếm bệ đỡ mục tiêu tốt nhất cho bot theo cá tính AI (hệ tọa độ Canvas)
 */
export function findTargetPlatform(bot, platforms = [], allBots = []) {
  if (!Array.isArray(platforms) || platforms.length === 0) return null;

  const botCenterX = bot.x + bot.width / 2;
  const currentY = bot.lastPlatformY !== undefined ? bot.lastPlatformY : bot.y;
  const isBouncy = bot.lastPlatformType === 'bouncy';
  const effectiveMaxReach = isBouncy ? (bot.profile?.maxJumpReach || 175) : Math.min(108, bot.profile?.maxJumpReach || 108);

  // 1. Trường hợp cấp cứu: Bot đang rơi xuống (vy > 0 trong Canvas), tìm bệ ngay dưới chân
  if (bot.vy > 0) {
    const landingTargets = preferUnclaimed(bot, platforms.filter((p) => {
      if (p.broken) return false;
      const dropDy = p.y - (bot.y + bot.height);
      return dropDy >= -10 && dropDy <= 140;
    }), allBots);

    if (landingTargets.length > 0) {
      landingTargets.sort((a, b) => {
        const aDx = Math.min(Math.abs(a.x + a.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(a.x + a.width / 2 - botCenterX));
        const bDx = Math.min(Math.abs(b.x + b.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(b.x + b.width / 2 - botCenterX));
        return aDx - bDx;
      });
      return landingTargets[0];
    }
  }

  // 2. Các bệ phía trên trong tầm với (trong Canvas: bệ ở trên có p.y < currentY)
  // Khoảng cách hướng lên: dy = currentY - p.y > 0
  const reachableAbove = platforms.filter((p) => {
    if (p.broken) return false;
    const dy = currentY - p.y;
    return dy >= 20 && dy <= effectiveMaxReach;
  });

  const safePlatforms = reachableAbove.filter((p) => p.type === 'normal' || p.type === 'standard' || p.type === 'moving' || p.type === 'bouncy');
  const breakablePlatforms = reachableAbove.filter((p) => p.type === 'fragile' || p.type === 'breakable');

  const mistakeChance = bot.profile?.breakableMistakeChance ?? 0.008;
  const isMistake = breakablePlatforms.length > 0 && Math.random() < mistakeChance;

  let targetPool = [];
  if (isMistake) {
    targetPool = breakablePlatforms;
  } else if (safePlatforms.length > 0) {
    targetPool = safePlatforms;
  } else {
    targetPool = reachableAbove;
  }

  if (targetPool.length > 0) {
    targetPool = preferUnclaimed(bot, targetPool, allBots);
    // Tách bệ nhảy vượt tầng
    const tier2Platforms = isBouncy ? targetPool.filter((p) => {
      const dy = currentY - p.y;
      if (dy < 110) return false;
      const targetCenterX = p.x + p.width / 2;
      const directDx = targetCenterX - botCenterX;
      const wrapDx = directDx > 0 ? directDx - SCREEN_WIDTH : directDx + SCREEN_WIDTH;
      const chosenDx = Math.min(Math.abs(directDx), Math.abs(wrapDx));
      return chosenDx <= SCREEN_WIDTH * 0.32;
    }) : [];

    const shouldAttemptSkipJump = tier2Platforms.length > 0 && Math.random() < (bot.profile?.skipJumpChance || 0);

    if (shouldAttemptSkipJump) {
      if (bot.profile?.strategy === 'highest_aggressive') {
        tier2Platforms.sort((a, b) => {
          const aDx = Math.min(Math.abs(a.x + a.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(a.x + a.width / 2 - botCenterX));
          const bDx = Math.min(Math.abs(b.x + b.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(b.x + b.width / 2 - botCenterX));
          const scoreA = (currentY - a.y) - (aDx * 0.30);
          const scoreB = (currentY - b.y) - (bDx * 0.30);
          return scoreB - scoreA;
        });
        return tier2Platforms[0];
      }

      return tier2Platforms.reduce((best, curr) => {
        const cDx = Math.min(Math.abs(curr.x + curr.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(curr.x + curr.width / 2 - botCenterX));
        const bDx = Math.min(Math.abs(best.x + best.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(best.x + best.width / 2 - botCenterX));
        return cDx < bDx ? curr : best;
      });
    }

    if (bot.profile?.strategy === 'highest_aggressive') {
      targetPool.sort((a, b) => {
        const aDx = Math.min(Math.abs(a.x + a.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(a.x + a.width / 2 - botCenterX));
        const bDx = Math.min(Math.abs(b.x + b.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(b.x + b.width / 2 - botCenterX));
        const scoreA = (currentY - a.y) - (aDx * 0.30);
        const scoreB = (currentY - b.y) - (bDx * 0.30);
        return scoreB - scoreA;
      });
      return targetPool[0];
    }

    if (bot.profile?.strategy === 'optimal_uncontested' && targetPool.length > 1) {
      const otherTargets = new Set(
        allBots
          .filter((b) => b !== bot && b.targetPlatform)
          .map((b) => b.targetPlatform)
      );
      const uncontested = targetPool.filter((p) => !otherTargets.has(p));
      const pool = uncontested.length > 0 ? uncontested : targetPool;

      return pool.reduce((best, curr) => {
        const cDx = Math.min(Math.abs(curr.x + curr.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(curr.x + curr.width / 2 - botCenterX));
        const bDx = Math.min(Math.abs(best.x + best.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(best.x + best.width / 2 - botCenterX));
        return cDx < bDx ? curr : best;
      });
    }

    if (bot.profile?.strategy === 'nearest_wide') {
      targetPool.sort((a, b) => {
        const aDx = Math.min(Math.abs(a.x + a.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(a.x + a.width / 2 - botCenterX));
        const bDx = Math.min(Math.abs(b.x + b.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(b.x + b.width / 2 - botCenterX));
        return (aDx - a.width * 0.4) - (bDx - b.width * 0.4);
      });
      return targetPool[0];
    }

    return targetPool.reduce((best, curr) => {
      const cDx = Math.min(Math.abs(curr.x + curr.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(curr.x + curr.width / 2 - botCenterX));
      const bDx = Math.min(Math.abs(best.x + best.width / 2 - botCenterX), SCREEN_WIDTH - Math.abs(best.x + best.width / 2 - botCenterX));
      return cDx < bDx ? curr : best;
    });
  }

  // Dự phòng: Lấy bệ phía trên gần nhất nếu có (p.y < currentY)
  const allAbove = preferUnclaimed(bot, platforms.filter((p) => !p.broken && p.y < currentY - 20), allBots);
  if (allAbove.length > 0) {
    allAbove.sort((a, b) => b.y - a.y);
    return allAbove[0];
  }

  // Dự phòng: Bệ phía dưới khi đang rơi
  const allBelow = preferUnclaimed(bot, platforms.filter((p) => !p.broken && p.y >= bot.y), allBots);
  if (allBelow.length > 0) {
    allBelow.sort((a, b) => a.y - b.y);
    return allBelow[0];
  }

  return platforms.find((p) => !p.broken) || platforms[0] || null;
}

/**
 * Cập nhật AI của Bot mỗi frame
 */
export function updateBotAI(bot, platforms, dt, allBots = [], cameraY = 0) {
  if (bot.isDead || bot.isGrounded || bot.catchUp) return;

  const speedMult = bot.profile?.speedMultiplier || 0.8;
  const maxVx = MAX_VX * speedMult;

  // Thời gian phản xạ / ngập ngừng
  if (bot.reactionTimer > 0) {
    bot.reactionTimer -= dt;
    if (bot.reactionTimer > 0) return;
  }

  // Làm mới mục tiêu nếu cần:
  // - Chưa có mục tiêu
  // - Mục tiêu đã bị vỡ hoặc bị xóa khỏi danh sách bệ (dung nham nuốt chửng)
  // - Mục tiêu quá xa bên dưới vị trí bot
  // - Hoặc bot đã rơi vượt quá mục tiêu mà chưa nảy
  const hasNoTarget = !bot.targetPlatform;
  const isTargetBroken = bot.targetPlatform?.broken;
  const isTargetDestroyed = bot.targetPlatform && !platforms.includes(bot.targetPlatform);
  const isTargetTooFarBelow = bot.targetPlatform && (bot.targetPlatform.y - bot.y > 180);
  const isMissed = bot.targetPlatform && bot.vy > 0 && (bot.y + bot.height > bot.targetPlatform.y + 16);

  if (hasNoTarget || isTargetBroken || isTargetDestroyed || isTargetTooFarBelow || isMissed) {
    bot.targetPlatform = findTargetPlatform(bot, platforms, allBots);
  }

  // Di chuyển về phía mục tiêu
  if (bot.targetPlatform) {
    const targetCenterX = bot.targetPlatform.x + bot.targetPlatform.width / 2 + (bot.targetOffsetX || 0);
    const botCenterX = bot.x + bot.width / 2;

    const directDx = targetCenterX - botCenterX;
    const wrapDx = directDx > 0 ? directDx - SCREEN_WIDTH : directDx + SCREEN_WIDTH;
    const chosenDx = Math.abs(directDx) <= Math.abs(wrapDx) ? directDx : wrapDx;

    const absDx = Math.abs(chosenDx);
    if (absDx > 6) {
      const speedFactor = absDx < 42 ? Math.max(0.35, absDx / 42) : 1.0;
      const targetVx = (chosenDx > 0 ? maxVx : -maxVx) * speedFactor;

      if (bot.vx < targetVx) {
        bot.vx = Math.min(targetVx, bot.vx + BOT_ACCEL * dt);
      } else if (bot.vx > targetVx) {
        bot.vx = Math.max(targetVx, bot.vx - BOT_ACCEL * dt);
      }

      bot.direction = bot.vx >= 0 ? 'right' : 'left';
    } else {
      if (Math.abs(bot.vx) > 20) {
        bot.vx *= 0.75;
      } else {
        bot.vx = 0;
      }
    }
  }

  // Cập nhật vị trí X cho bot
  bot.x += bot.vx * dt;

  // Xuyên màn hình ngang
  if (bot.x > SCREEN_WIDTH) {
    bot.x = -bot.width;
  } else if (bot.x + bot.width < 0) {
    bot.x = SCREEN_WIDTH;
  }
}

/**
 * Xử lý khi Bot tiếp đất và bật nảy
 */
export function onBotBounce(bot, platform = null) {
  if (platform) {
    bot.lastPlatformY = platform.y;
    bot.lastPlatformType = platform.type;
  } else {
    bot.lastPlatformY = bot.y;
    bot.lastPlatformType = 'standard';
  }

  bot.targetPlatform = null;
  bot.reactionTimer = bot.profile?.reactionDelay || 0;

  if (bot.profile?.aimOffset > 0) {
    bot.targetOffsetX = (Math.random() * 2 - 1) * bot.profile.aimOffset;
  }
}
