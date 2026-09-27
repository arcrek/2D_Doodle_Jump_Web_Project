// Cấu hình thế giới và sinh bệ
// Kích thước khung game theo cấu hình mới (960×540)
export const SCREEN_WIDTH = 960;
export const SCREEN_HEIGHT = 540;
export const PLATFORM_WIDTH = 120;  // Bệ nhỏ gọn hơn, phù hợp màn rộng
export const PLATFORM_HEIGHT = 14;  // Chiều cao chuẩn đồng nhất cho mọi bệ
export const MIN_GAP_Y = 55;
export const MAX_GAP_Y = 85;

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

// Sinh một tầng bệ: 3-4 bệ cùng kích thước (120×14), trải đều trên màn hình 960px
export function createPlatformTier(tierY, screenWidth = SCREEN_WIDTH) {
  const platformCount = Math.random() < 0.5 ? 3 : 4; // Ngẫu nhiên 3 hoặc 4 bệ
  const totalPlatformWidth = platformCount * PLATFORM_WIDTH;
  const totalFreeSpace = screenWidth - totalPlatformWidth;

  // Chia khoảng trống thành 5 phần: lề trái, 3 khe giữa, lề phải
  const minGap = 30; // Khoảng cách tối thiểu giữa 2 bệ kề nhau
  const minMargin = 10; // Lề tối thiểu trái/phải
  const numInternalGaps = platformCount - 1; // 3 khe giữa
  const reservedSpace = minGap * numInternalGaps + minMargin * 2; // 110px
  const flexibleSpace = Math.max(0, totalFreeSpace - reservedSpace); // 370px linh hoạt

  // Phân bổ ngẫu nhiên khoảng trống cho 5 vùng
  const numSlots = numInternalGaps + 2; // 5 vùng
  const rawWeights = Array.from({ length: numSlots }, () => 0.2 + Math.random());
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
  const shares = rawWeights.map(w => w / totalWeight);

  const spacings = shares.map((s, idx) => {
    const extra = Math.round(s * flexibleSpace);
    if (idx === 0 || idx === numSlots - 1) {
      return minMargin + extra; // Lề trái/phải
    }
    return minGap + extra; // Khe giữa
  });

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

  // Sinh tầng bệ lên trên bắt đầu ngay từ bệ xuất phát (khoảng cách 55-85px chuẩn dev)
  let highestY = startPlatform.y;
  const targetCeiling = forIntro ? -1400 : -50;
  while (highestY > targetCeiling) {
    const deltaY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = highestY - deltaY;
    // Khi forIntro: Giữ khu vực Tiêu đề và nút BẮT ĐẦU (-650 đến -220) hoàn toàn thoáng đãng
    if (!forIntro || tierY < -650 || tierY > -220) {
      const tierPlatforms = createPlatformTier(tierY);
      for (const p of tierPlatforms) {
        platforms.push(p);
      }
    }
    highestY = tierY;
  }

  return { platforms, cameraY: 0 };
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
export function updatePlatforms(world, dt = 1 / 60, { cullOffscreen = true } = {}) {
  if (!world.platforms || world.platforms.length === 0) return;

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
      }
    }
  }

  // 2. Tìm bệ cao nhất hiện tại (y nhỏ nhất)
  let highestY = Math.min(...world.platforms.map(p => p.y));

  // 3. Nếu bệ cao nhất chưa che phủ đủ chiều cao phía trên camera, sinh thêm tầng bệ
  const spawnCeiling = world.cameraY - 200; // Đón đầu 200px phía trên khung nhìn
  while (highestY > spawnCeiling) {
    const deltaY = MIN_GAP_Y + Math.random() * (MAX_GAP_Y - MIN_GAP_Y);
    const tierY = highestY - deltaY;
    const tierPlatforms = createPlatformTier(tierY);
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
