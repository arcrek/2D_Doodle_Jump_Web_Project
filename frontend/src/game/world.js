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

export const PLATFORM_TYPES = {
  STANDARD: 'standard',
  MOVING: 'moving',
  FRAGILE: 'fragile',
  BOUNCY: 'bouncy',
};

// Chọn loại bệ ngẫu nhiên có trọng số
export function pickRandomType() {
  const rand = Math.random();
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
export function createPlatformTier(tierY, screenWidth = SCREEN_WIDTH) {
  const platformCount = Math.random() < 0.5 ? 3 : 4; // Ngẫu nhiên 3 hoặc 4 bệ
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
      ? 0.3 + Math.random() * 0.3
      : 0.7 + Math.random() * 0.4
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
    const type = pickRandomType();
    const yJitter = (Math.random() - 0.5) * 8; // ±4px lệch dọc tự nhiên
    const y = Math.round(tierY + yJitter);

    const platform = {
      x: xPositions[i],
      y,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type,
    };

    if (type === PLATFORM_TYPES.MOVING) {
      platform.vx = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 30);
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

// Khởi tạo thế giới: 1 bệ chuẩn dưới chân nhân vật + sinh tầng bệ lên trên lấp đầy màn hình
export function createWorld({ forIntro = false, soloStart = false } = {}) {
  // Bệ đầu tiên gần đáy màn hình, căn giữa dưới chân nhân vật
  // Nhân vật: x=300, width=34 → tâm = 317
  const startY = SCREEN_HEIGHT - 110;
  const playerCenterX = 300 + 17; // tâm nhân vật (x + width/2)
  const startPlatform = {
    x: Math.round(playerCenterX - PLATFORM_WIDTH / 2), y: startY,
    width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT,
    type: PLATFORM_TYPES.STANDARD,
  };

  // 4 bệ xuất phát riêng biệt cho 4 Bot đối thủ (rải đều trên màn hình 960px)
  const botPlatforms = [
    { x: 47, y: startY, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type: PLATFORM_TYPES.STANDARD },
    { x: 447, y: startY, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type: PLATFORM_TYPES.STANDARD },
    { x: 637, y: startY, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type: PLATFORM_TYPES.STANDARD },
    { x: 797, y: startY, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type: PLATFORM_TYPES.STANDARD },
  ];

  const platforms = forIntro || soloStart ? [startPlatform] : [startPlatform, ...botPlatforms];

  let routeX = startPlatform.x;
  // Sinh tầng bệ lên trên bắt đầu ngay từ bệ xuất phát (khoảng cách 55-85px chuẩn dev)
  let highestY = startPlatform.y;
  const targetCeiling = forIntro ? -1400 : -50;
  while (highestY > targetCeiling) {
    const deltaY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = highestY - deltaY;
    // Khi forIntro: Giữ khu vực Tiêu đề và nút BẮT ĐẦU (-650 đến -220) hoàn toàn thoáng đãng
    if (!forIntro || tierY < -650 || tierY > -220) {
      const tierPlatforms = createPlatformTier(tierY);
      routeX = ensureRoute(tierPlatforms, routeX, tierY);
      for (const p of tierPlatforms) {
        platforms.push(p);
      }
    }
    highestY = tierY;
  }

  return { platforms, cameraY: 0, routeX };
}

// Sinh bệ bổ sung lấp đầy không gian bầu trời phục vụ camera trượt từ trên cao xuống
export function spawnIntroPlatforms(world, targetCeiling = -1400) {
  let highestY = Math.min(...world.platforms.map(p => p.y));
  while (highestY > targetCeiling) {
    const deltaY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = highestY - deltaY;
    if (tierY < -650 || tierY > -220) {
      const tierPlatforms = createPlatformTier(tierY);
      for (const p of tierPlatforms) {
        world.platforms.push(p);
      }
    }
    highestY = tierY;
  }
}

// Lấp đầy các tầng bệ vào khu vực bầu trời (-650 đến -220) khi vào game để người chơi leo tháp liên tục không bị hẫng
export function fillGameplayPlatforms(world) {
  const hasGapInSky = !world.platforms.some(p => p.y >= -600 && p.y <= -260);
  if (hasGapInSky) {
    let tierY = -220;
    while (tierY > -650) {
      const deltaY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);
      tierY -= deltaY;
      if (tierY > -650) {
        const tierPlatforms = createPlatformTier(tierY);
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

  // 2. Tìm bệ cao nhất hiện tại (y nhỏ nhất)
  let highestY = Math.min(...world.platforms.map(p => p.y));

  // 3. Nếu bệ cao nhất chưa che phủ đủ chiều cao phía trên camera hoặc đối tượng leo cao nhất, sinh thêm tầng bệ
  const targetCeiling = highestEntityY !== null && Number.isFinite(highestEntityY)
    ? Math.min(world.cameraY, highestEntityY)
    : world.cameraY;
  const spawnCeiling = targetCeiling - 250; // Đón đầu 250px phía trên
  while (highestY > spawnCeiling) {
    const deltaY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = highestY - deltaY;
    const tierPlatforms = createPlatformTier(tierY);
    world.routeX = ensureRoute(tierPlatforms, world.routeX ?? 300, tierY);
    for (const p of tierPlatforms) {
      world.platforms.push(p);
    }
    highestY = Math.min(...tierPlatforms.map(p => p.y));
  }

  // 4. Dọn rác: Bỏ các bệ đã trôi khỏi mép dưới màn hình (> 550px so với camera)
  if (cullOffscreen) {
    world.platforms = world.platforms.filter(p => p.y - world.cameraY < 550);
  }
}

export function ensureRoute(tier, previousX, y) {
  const MARGIN = 10;
  const xMin = MARGIN;
  const xMax = SCREEN_WIDTH - PLATFORM_WIDTH - MARGIN;
  const clampX = (v) => Math.max(xMin, Math.min(xMax, v));
  const minSeparation = PLATFORM_WIDTH + 15;

  // hasOverlap xét toàn bộ phạm vi di chuyển [minX, maxX] nếu bệ là MOVING
  const hasOverlap = (xPos) => tier.some(p => {
    const pMinX = (p.type === PLATFORM_TYPES.MOVING) ? (p.minX ?? p.x) : p.x;
    const pMaxX = (p.type === PLATFORM_TYPES.MOVING)
      ? (p.maxX ?? (p.x + p.width))
      : (p.x + p.width);
    return (xPos + PLATFORM_WIDTH + 15 > pMinX) && (xPos < pMaxX + 15);
  });

  // 1. Kiểm tra bệ gần nhất: nếu đã nằm trong ngưỡng ROUTE_MAX_STEP thì dùng luôn
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

  // 2. Thử các offset ưu tiên quanh candidateX theo hướng tiến tới route.x
  const direction = Math.sign(route.x - previousX) || 1;
  const candidateX = clampX(previousX + direction * 80);
  const offsets = [0, PLATFORM_WIDTH + 20, -(PLATFORM_WIDTH + 20)];

  for (const offset of offsets) {
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

  // 4. Fallback cuối cùng: Đặt bệ safe tại routeX và giải quyết xung đột bố cục toàn tầng
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

