// Cấu hình thế giới và sinh bệ
// Kích thước khung game theo cấu hình mới (960×540)
export const SCREEN_WIDTH = 960;
export const SCREEN_HEIGHT = 540;
export const PLATFORM_WIDTH = 120;  // Bệ nhỏ gọn hơn, phù hợp màn rộng
export const PLATFORM_HEIGHT = 14;  // Chiều cao chuẩn đồng nhất cho mọi bệ
export const MIN_GAP_Y = 55;
export const MAX_GAP_Y = 78;  // Đảm bảo nhân vật luôn nhảy tới được (từ 85 → 78)

export const MAX_JUMPABLE_GAP = 200; // px - khoảng cách giữa 2 bệ kề nhau (edge-to-edge) tối đa có thể nhảy qua
export const MAX_JUMPABLE_X_DISTANCE = MAX_JUMPABLE_GAP; // Alias tương thích ngược
export const ROUTE_MAX_STEP = 100; // px - khoảng cách ngang tối đa giữa 2 bệ route liên tiếp

export const FINISH_HEIGHT = 3000; // Chiều dài mặc định của đường đua (px)
export const FLOOR_HEIGHT = 20; // Chiều cao bệ sàn xuất phát
export const FINISH_PLATFORM_HEIGHT = 20; // Chiều cao bệ vạch đích

export const PLATFORM_TYPES = {
  STANDARD: 'standard',
  MOVING: 'moving',
  FRAGILE: 'fragile',
  BOUNCY: 'bouncy',
  FLOOR: 'floor',
  FINISH: 'finish',
};

// PRNG Mulberry32: Trả về hàm sinh số ngẫu nhiên [0, 1) deterministic theo seed
export function seededRandom(seed) {
  let s = (typeof seed === 'number' ? seed : 1) >>> 0;
  return function() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Chọn loại bệ ngẫu nhiên có trọng số
export function pickRandomType(rng = Math.random) {
  const rand = rng();
  if (rand < 0.50) return PLATFORM_TYPES.STANDARD; // 50% bệ chuẩn vững chắc
  if (rand < 0.70) return PLATFORM_TYPES.MOVING;   // 20% bệ di động
  if (rand < 0.85) return PLATFORM_TYPES.FRAGILE;  // 15% bệ nứt vỡ
  return PLATFORM_TYPES.BOUNCY;                    // 15% bệ lò xo bật cao
}

// Hàm giải quyết xung đột khoảng cách và giới hạn di chuyển của các bệ trong cùng một tầng
export function resolveTier(tier, screenWidth = SCREEN_WIDTH) {
  tier.sort((a, b) => a.x - b.x);
  for (let i = 0; i < tier.length - 1; i++) {
    if (tier[i].x + PLATFORM_WIDTH + 10 > tier[i + 1].x) {
      tier[i + 1].x = tier[i].x + PLATFORM_WIDTH + 10;
    }
  }
  if (tier[tier.length - 1].x + PLATFORM_WIDTH > screenWidth - 10) {
    const over = tier[tier.length - 1].x + PLATFORM_WIDTH - (screenWidth - 10);
    tier[tier.length - 1].x -= over;
    for (let i = tier.length - 1; i >= 1; i--) {
      if (tier[i].x < tier[i - 1].x + PLATFORM_WIDTH + 10) {
        tier[i - 1].x = tier[i].x - PLATFORM_WIDTH - 10;
      }
    }
  }
  for (let i = 0; i < tier.length - 1; i++) {
    const leftP = tier[i];
    const rightP = tier[i + 1];
    if (leftP.type === PLATFORM_TYPES.MOVING && rightP.type === PLATFORM_TYPES.MOVING) {
      const mid = Math.round((leftP.x + leftP.width + rightP.x) / 2);
      leftP.maxX = Math.min(leftP.maxX ?? screenWidth - 5, mid - 2);
      rightP.minX = Math.max(rightP.minX ?? 5, mid + 3);
    } else if (leftP.type === PLATFORM_TYPES.MOVING) {
      leftP.maxX = Math.min(leftP.maxX ?? screenWidth - 5, rightP.x - 5);
    } else if (rightP.type === PLATFORM_TYPES.MOVING) {
      rightP.minX = Math.max(rightP.minX ?? 5, leftP.x + leftP.width + 5);
    }
  }
  for (const p of tier) {
    if (p.type === PLATFORM_TYPES.MOVING) {
      p.minX = Math.min(p.minX, p.x);
      p.maxX = Math.max(p.maxX, p.x + p.width);
    }
  }
}

// Sinh một tầng bệ: 3-4 bệ cùng kích thước (120×14), trải đều trên màn hình 960px
export function createPlatformTier(tierY, screenWidth = SCREEN_WIDTH, rng = Math.random) {
  const platformCount = rng() < 0.5 ? 3 : 4; // Ngẫu nhiên 3 hoặc 4 bệ
  const totalPlatformWidth = platformCount * PLATFORM_WIDTH;
  const totalFreeSpace = screenWidth - totalPlatformWidth;

  // Chia khoảng trống thành các phần: lề trái, các khe giữa, lề phải
  const minGap = 30; // Khoảng cách tối thiểu giữa 2 bệ kề nhau
  const minMargin = 10; // Lề tối thiểu trái/phải
  const numInternalGaps = platformCount - 1;
  const reservedSpace = minGap * numInternalGaps + minMargin * 2;
  const flexibleSpace = Math.max(0, totalFreeSpace - reservedSpace);

  // Phân bổ ngẫu nhiên khoảng trống cho các vùng:
  // Lề nhận trọng số nhẹ (0.3 - 0.6) còn khe giữa nhận trọng số lớn hơn (0.7 - 1.1) để bệ trải đều màn hình
  const numSlots = numInternalGaps + 2;
  const rawWeights = Array.from({ length: numSlots }, (_, idx) => (
    (idx === 0 || idx === numSlots - 1)
      ? 0.3 + rng() * 0.3
      : 0.7 + rng() * 0.4
  ));
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
  const shares = rawWeights.map(w => w / totalWeight);

  const maxInternalExtra = MAX_JUMPABLE_GAP - minGap; // 200 - 30 = 170px extra tối đa mỗi khe giữa

  // Phân phối flexibleSpace, clamp riêng từng slot nội bộ để không vượt MAX_JUMPABLE_GAP
  const rawExtras = shares.map(s => Math.round(s * flexibleSpace));
  const rawSum = rawExtras.reduce((s, e) => s + e, 0);
  rawExtras[0] += (flexibleSpace - rawSum); // Bù sai số làm tròn vào lề trái

  let surplus = 0;
  const spacings = rawExtras.map((extra, idx) => {
    if (idx === 0 || idx === numSlots - 1) {
      return minMargin + extra;
    }
    const clampedExtra = Math.min(extra, maxInternalExtra);
    surplus += extra - clampedExtra;
    return minGap + clampedExtra;
  });

  // Tái phân bổ phần surplus bị cắt từ các khe giữa vào 2 lề để bảo đảm bệ phủ đều màn hình
  const halfSurplus = Math.round(surplus / 2);
  spacings[0] += halfSurplus;
  spacings[numSlots - 1] += surplus - halfSurplus;

  // Giới hạn lề phải và lề trái không vượt 220px (đảm bảo tầng 3 bệ luôn dưới 250px)
  if (spacings[numSlots - 1] > 220) {
    const excess = spacings[numSlots - 1] - 220;
    spacings[numSlots - 1] = 220;
    spacings[0] += excess;
  }
  if (spacings[0] > 220) {
    const excess = spacings[0] - 220;
    spacings[0] = 220;
    spacings[1] += excess;
  }

  // Tính vị trí x cho từng bệ
  const xPositions = [];
  let currentX = spacings[0];
  for (let i = 0; i < platformCount; i++) {
    xPositions.push(Math.round(currentX));
    if (i < platformCount - 1) {
      currentX += PLATFORM_WIDTH + spacings[i + 1];
    }
  }

  // An toàn: kẹp bệ cuối không được tràn khỏi màn hình
  const lastX = xPositions[platformCount - 1];
  if (lastX + PLATFORM_WIDTH > screenWidth) {
    const overflow = lastX + PLATFORM_WIDTH - screenWidth;
    // Dồn tất cả bệ sang trái để vừa màn hình
    for (let i = 0; i < platformCount; i++) {
      xPositions[i] = Math.max(0, xPositions[i] - overflow - 5);
    }
  }

  // Tạo bệ với loại đa dạng
  const platforms = [];
  for (let i = 0; i < platformCount; i++) {
    const type = pickRandomType(rng);
    const yJitter = (rng() - 0.5) * 8; // ±4px lệch dọc tự nhiên
    const y = Math.round(tierY + yJitter);

    const platform = {
      x: xPositions[i],
      y,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type,
    };

    if (type === PLATFORM_TYPES.MOVING) {
      platform.vx = (rng() < 0.5 ? -1 : 1) * (60 + rng() * 30);
      platform.minX = Math.max(5, platform.x - 60);
      platform.maxX = Math.min(screenWidth - 5, platform.x + platform.width + 60);
    } else if (type === PLATFORM_TYPES.BOUNCY) {
      platform.bounceMultiplier = 1.45;
    } else if (type === PLATFORM_TYPES.FRAGILE) {
      platform.broken = false;
    }

    platforms.push(platform);
  }

  // Đảm bảo không để cả tầng đều là bệ vỡ (tránh bẫy người chơi)
  const allFragile = platforms.every(p => p.type === PLATFORM_TYPES.FRAGILE);
  if (allFragile && platforms.length > 0) {
    platforms[0].type = PLATFORM_TYPES.STANDARD;
    delete platforms[0].broken;
  }

  resolveTier(platforms, screenWidth);

  return platforms;
}

// Khởi tạo thế giới: Sàn xuất phát full-width + sinh trọn đường đua hữu hạn lên đến vạch đích
export function createWorld({
  forIntro = false,
  soloStart = false,
  seed = null,
  finishHeight = FINISH_HEIGHT,
  rng: customRng = null,
} = {}) {
  const resolvedSeed = (seed !== null && seed !== undefined)
    ? (seed >>> 0)
    : Math.floor(Math.random() * 2147483647);
  const rng = customRng ?? seededRandom(resolvedSeed);

  const floorY = SCREEN_HEIGHT - 80;
  const finishY = floorY - finishHeight;

  // Sàn xuất phát duy nhất trải dài toàn bộ chiều rộng màn hình (thay cho startPlatform + botPlatforms)
  const floorPlatform = {
    x: 0,
    y: floorY,
    width: SCREEN_WIDTH,
    height: FLOOR_HEIGHT,
    type: PLATFORM_TYPES.FLOOR,
    safe: true,
  };

  const platforms = [floorPlatform];

  // Khởi tạo điểm route bắt đầu ngay trên sàn dưới chân nhân vật
  const playerCenterX = 300 + 17;
  let routeX = Math.round(playerCenterX - PLATFORM_WIDTH / 2);

  // Sinh các tầng bệ đi lên đến vạch đích
  let highestY = floorY;
  const maxStepY = MAX_GAP_Y - 8; // 70px, để sau khi cộng jitter ±4px khoảng cách thực tế giữa các bệ không vượt MAX_GAP_Y (78px)
  while (highestY - finishY > MAX_GAP_Y) {
    let deltaY = MIN_GAP_Y + rng() * (maxStepY - MIN_GAP_Y);
    let tierY = Math.round(highestY - deltaY);
    if (tierY - finishY < MIN_GAP_Y) {
      // Nếu từ highestY có thể nhảy trực tiếp tới đích (<= MAX_GAP_Y) thì dừng
      if (highestY - finishY <= MAX_GAP_Y) {
        break;
      }
      // Nếu không, chia đôi khoảng cách còn lại để cả 2 bước đều <= MAX_GAP_Y
      tierY = Math.round((highestY + finishY) / 2);
    }

    // Khi forIntro: Giữ khu vực Tiêu đề và nút BẮT ĐẦU (-650 đến -220) hoàn toàn thoáng đãng
    if (!forIntro || tierY < -650 || tierY > -220) {
      const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH, rng);
      routeX = ensureRoute(tierPlatforms, routeX, tierY, { rng });
      for (const p of tierPlatforms) {
        platforms.push(p);
      }
    }
    highestY = tierY;
  }

  // Đảm bảo không có khoảng cách nào từ tầng cao nhất tới finishY vượt quá MAX_GAP_Y
  while (highestY - finishY > MAX_GAP_Y) {
    const step = Math.min(maxStepY, Math.max(MIN_GAP_Y, Math.round((highestY - finishY) / 2)));
    const tierY = highestY - step;
    if (!forIntro || tierY < -650 || tierY > -220) {
      const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH, rng);
      routeX = ensureRoute(tierPlatforms, routeX, tierY, { rng });
      for (const p of tierPlatforms) {
        platforms.push(p);
      }
    }
    highestY = tierY;
  }

  // Bệ vạch đích phủ toàn màn hình tại đúng finishY
  const finishPlatform = {
    x: 0,
    y: finishY,
    width: SCREEN_WIDTH,
    height: FINISH_PLATFORM_HEIGHT,
    type: PLATFORM_TYPES.FINISH,
    safe: true,
  };
  platforms.push(finishPlatform);

  return {
    platforms,
    cameraY: 0,
    routeX,
    floorY,
    finishY,
    seed: resolvedSeed,
    isFinite: true,
    rng,
  };
}

// Sinh bệ bổ sung lấp đầy không gian bầu trời phục vụ camera trượt từ trên cao xuống
export function spawnIntroPlatforms(world, targetCeiling = -1400, rng = Math.random) {
  const activeRng = world.rng ?? rng;
  let highestY = Math.min(...world.platforms.map(p => p.y));
  while (highestY > targetCeiling) {
    const deltaY = MIN_GAP_Y + activeRng() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = Math.round(highestY - deltaY);
    if (tierY < -650 || tierY > -220) {
      const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH, activeRng);
      for (const p of tierPlatforms) {
        world.platforms.push(p);
      }
    }
    highestY = tierY;
  }
}

// Lấp đầy các tầng bệ vào khu vực bầu trời (-650 đến -220) khi vào game để người chơi leo tháp liên tục không bị hẫng
export function fillGameplayPlatforms(world, rng = Math.random) {
  const hasGapInSky = !world.platforms.some(p => p.y >= -600 && p.y <= -260);
  if (hasGapInSky) {
    let tierY = -220;
    const activeRng = world.rng ?? rng;
    while (tierY > -650) {
      const deltaY = MIN_GAP_Y + activeRng() * (MAX_GAP_Y - MIN_GAP_Y);
      tierY = Math.round(tierY - deltaY);
      if (tierY > -650) {
        const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH, activeRng);
        if (world.routeX !== undefined) {
          world.routeX = ensureRoute(tierPlatforms, world.routeX, tierY, { rng: activeRng });
        }
        for (const p of tierPlatforms) {
          world.platforms.push(p);
        }
      }
    }
  }
}

// Dọn sạch bệ trong khu vực tiêu đề (-650 đến -220) khi quay lại màn hình mở đầu
export function clearIntroTitleZone(world) {
  world.platforms = world.platforms.filter(p => p.y < -650 || p.y > -220);
}

// Cập nhật bệ theo cameraY và thời gian dt
export function updatePlatforms(world, dt = 1 / 60, options = {}) {
  if (!world.platforms || world.platforms.length === 0) return;

  const cullOffscreen = typeof options === 'object' && options !== null && 'cullOffscreen' in options
    ? options.cullOffscreen
    : true;
  const highestEntityY = typeof options === 'number'
    ? options
    : (options?.highestEntityY ?? null);

  // 1. Cập nhật vị trí các bệ di động (moving)
  if (dt > 0) {
    for (const p of world.platforms) {
      if (p.type === PLATFORM_TYPES.MOVING && p.vx) {
        p.x += p.vx * dt;
        const minX = p.minX ?? 0;
        const maxX = (p.maxX ?? SCREEN_WIDTH) - p.width;
        if (p.x <= minX) {
          p.x = minX;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx);
        }

        // Lưới an toàn runtime: kiểm tra va chạm giữa các bệ cùng tầng
        for (const other of world.platforms) {
          if (other === p) continue;
          if (Math.abs(other.y - p.y) > 10) continue;
          if (p.vx > 0 && p.x + p.width > other.x && p.x < other.x) {
            p.x = other.x - p.width;
            p.vx = -Math.abs(p.vx);
          } else if (p.vx < 0 && p.x < other.x + other.width && p.x + p.width > other.x + other.width) {
            p.x = other.x + other.width;
            p.vx = Math.abs(p.vx);
          }
        }
      }
    }
  }

  // 2. Với đường đua hữu hạn (isFinite): dừng tại đây, không sinh thêm và không xóa bệ gốc
  if (world.isFinite) {
    return;
  }

  // 3. Với đường đua vô hạn cũ: sinh bệ theo camera
  let highestY = Math.min(...world.platforms.map(p => p.y));
  const targetCeiling = highestEntityY !== null && Number.isFinite(highestEntityY)
    ? Math.min(world.cameraY, highestEntityY)
    : world.cameraY;
  const spawnCeiling = targetCeiling - 250; // Đón đầu 250px phía trên
  const activeRng = world.rng ?? Math.random;

  while (highestY > spawnCeiling) {
    const deltaY = MIN_GAP_Y + activeRng() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = highestY - deltaY;
    const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH, activeRng);
    world.routeX = ensureRoute(tierPlatforms, world.routeX ?? 300, tierY, { rng: activeRng });
    for (const p of tierPlatforms) {
      world.platforms.push(p);
    }
    highestY = Math.min(...tierPlatforms.map(p => p.y));
  }

  // 4. Dọn rác chỉ cho chế độ vô hạn: Bỏ các bệ đã trôi khỏi mép dưới màn hình (> 550px so với camera)
  if (cullOffscreen) {
    world.platforms = world.platforms.filter(p => p.y - world.cameraY < 550);
  }
}

export function ensureRoute(tier, previousX, y, options = {}) {
  const MARGIN = 10;
  const xMin = MARGIN;
  const xMax = SCREEN_WIDTH - PLATFORM_WIDTH - MARGIN;
  const clampX = (v) => Math.max(xMin, Math.min(xMax, v));
  const maxRetries = options?.maxRetries ?? 20;

  // hasOverlap xét toàn bộ phạm vi di chuyển [minX, maxX] nếu bệ là MOVING
  const hasOverlap = (xPos) => tier.some(p => {
    const pMinX = (p.type === PLATFORM_TYPES.MOVING) ? (p.minX ?? p.x) : p.x;
    const pMaxX = (p.type === PLATFORM_TYPES.MOVING)
      ? (p.maxX ?? (p.x + p.width))
      : (p.x + p.width);
    return (xPos + PLATFORM_WIDTH + 15 > pMinX) && (xPos < pMaxX + 15);
  });

  // 1. Kiểm tra bệ gần nhất: nếu đã nằm trong ngưỡng ROUTE_MAX_STEP thì dùng luôn
  if (tier.length > 0) {
    let route = tier.reduce((best, platform) => (
      Math.abs(platform.x - previousX) < Math.abs(best.x - previousX) ? platform : best
    ));

    if (Math.abs(route.x - previousX) <= ROUTE_MAX_STEP) {
      route.type = PLATFORM_TYPES.STANDARD;
      route.safe = true;
      delete route.vx;
      delete route.bounceMultiplier;
      delete route.broken;
      delete route.minX;
      delete route.maxX;
      return route.x;
    }
  }

  // 2. Thử các offset ưu tiên quanh candidateX theo hướng tiến tới bệ gần nhất
  const targetX = tier.length > 0
    ? tier.reduce((best, p) => Math.abs(p.x - previousX) < Math.abs(best.x - previousX) ? p : best).x
    : previousX;
  const direction = Math.sign(targetX - previousX) || 1;
  const candidateX = clampX(previousX + direction * 80);
  const offsets = [0, PLATFORM_WIDTH + 20, -(PLATFORM_WIDTH + 20)];

  let attempts = 0;
  for (const offset of offsets) {
    attempts++;
    if (attempts > maxRetries) break;
    const testX = clampX(candidateX + offset);
    if (Math.abs(testX - previousX) <= ROUTE_MAX_STEP && !hasOverlap(testX)) {
      const newRoute = {
        x: testX,
        y,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: PLATFORM_TYPES.STANDARD,
        safe: true,
      };
      tier.push(newRoute);
      resolveTier(tier, SCREEN_WIDTH);
      return newRoute.x;
    }
  }

  // 3. Quét toàn bộ dải hợp lệ trong ngưỡng ROUTE_MAX_STEP tìm khe trống
  const sweepMin = clampX(previousX - ROUTE_MAX_STEP);
  const sweepMax = clampX(previousX + ROUTE_MAX_STEP);
  const SWEEP_STEP = 5;
  let bestSweepX = null;
  let bestSweepDist = Infinity;

  for (let sx = sweepMin; sx <= sweepMax; sx += SWEEP_STEP) {
    attempts++;
    if (attempts > maxRetries) break;
    if (!hasOverlap(sx)) {
      const dist = Math.abs(sx - previousX);
      if (dist < bestSweepDist) {
        bestSweepDist = dist;
        bestSweepX = sx;
      }
    }
  }

  if (bestSweepX !== null) {
    const newRoute = {
      x: bestSweepX,
      y,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type: PLATFORM_TYPES.STANDARD,
      safe: true,
    };
    tier.push(newRoute);
    resolveTier(tier, SCREEN_WIDTH);
    return newRoute.x;
  }

  // 4. Fallback an toàn (hoặc khi vượt quá giới hạn retry): Đặt bệ safe tại routeX và giải quyết xung đột bố cục toàn tầng
  const routeX = clampX(previousX);
  const newRoute = {
    x: routeX,
    y,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
    type: PLATFORM_TYPES.STANDARD,
    safe: true,
  };
  tier.push(newRoute);
  resolveTier(tier, SCREEN_WIDTH);
  return newRoute.x;
}
