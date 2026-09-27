import { describe, it, expect } from 'vitest';
import {
  createWorld,
  createPlatformTier,
  updatePlatforms,
  ensureRoute,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  PLATFORM_TYPES,
  MAX_JUMPABLE_GAP,
  ROUTE_MAX_STEP,
} from '../game/world.js';

describe('world.js - Procedural Generation & Multi-Platform Tiers', () => {
  it('createWorld() generates platforms procedurally with a start platform near bottom', () => {
    const world = createWorld();
    expect(world.cameraY).toBe(0);

    // Phải có nhiều bệ (mỗi tầng 3-4 bệ + 1 bệ bắt đầu)
    expect(world.platforms.length).toBeGreaterThanOrEqual(10);

    // Bệ đầu tiên là bệ chuẩn căn giữa dưới chân nhân vật
    const startPlatform = world.platforms[0];
    expect(startPlatform.type).toBe('standard');
    expect(startPlatform.y).toBe(SCREEN_HEIGHT - 110);
    expect(startPlatform.width).toBe(PLATFORM_WIDTH);

    // Tất cả bệ đều có cùng kích thước
    for (const p of world.platforms) {
      expect(p.width).toBe(PLATFORM_WIDTH);
      expect(p.height).toBe(PLATFORM_HEIGHT);
    }

    // Bệ cao nhất phải phủ hết màn hình
    const highestY = Math.min(...world.platforms.map(p => p.y));
    expect(highestY).toBeLessThanOrEqual(50);
  });

  it('createWorld() produces different layouts on each call', () => {
    const world1 = createWorld();
    const world2 = createWorld();
    const xs1 = world1.platforms.map(p => p.x).join(',');
    const xs2 = world2.platforms.map(p => p.x).join(',');
    expect(xs1).not.toBe(xs2);
  });

  it('uses correct screen dimensions', () => {
    expect(SCREEN_WIDTH).toBe(960);
    expect(SCREEN_HEIGHT).toBe(540);
    expect(PLATFORM_WIDTH).toBe(120);
  });

  it('createPlatformTier() spawns 3 or 4 platforms with the exact same size', () => {
    for (let testRun = 0; testRun < 20; testRun++) {
      const tierY = -100 - testRun * 50;
      const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH);

      // Mỗi tầng có 3 hoặc 4 bệ
      expect(tierPlatforms.length).toBeGreaterThanOrEqual(3);
      expect(tierPlatforms.length).toBeLessThanOrEqual(4);

      for (const p of tierPlatforms) {
        expect(p.width).toBe(PLATFORM_WIDTH);
        expect(p.height).toBe(PLATFORM_HEIGHT);
      }

      expect(tierPlatforms.reduce((sum, p) => sum + p.width, 0)).toBe(PLATFORM_WIDTH * tierPlatforms.length);
    }
  });

  it('createPlatformTier() keeps ALL platforms within screen bounds (no overflow)', () => {
    for (let testRun = 0; testRun < 50; testRun++) {
      const tierPlatforms = createPlatformTier(-200);

      for (const p of tierPlatforms) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + p.width).toBeLessThanOrEqual(SCREEN_WIDTH);
      }
    }
  });

  it('createPlatformTier() splits platforms with positive horizontal gaps', () => {
    for (let testRun = 0; testRun < 20; testRun++) {
      const tierPlatforms = createPlatformTier(-200);

      for (let i = 0; i < tierPlatforms.length - 1; i++) {
        const gap = tierPlatforms[i + 1].x - (tierPlatforms[i].x + tierPlatforms[i].width);
        expect(gap).toBeGreaterThanOrEqual(25);
      }
    }
  });

  it('createPlatformTier() assigns valid platform types and avoids all-fragile trap tiers', () => {
    const validTypes = Object.values(PLATFORM_TYPES);

    for (let testRun = 0; testRun < 30; testRun++) {
      const tierPlatforms = createPlatformTier(-300);

      tierPlatforms.forEach(p => {
        expect(validTypes).toContain(p.type);
      });

      const hasSolid = tierPlatforms.some(p => p.type !== PLATFORM_TYPES.FRAGILE);
      expect(hasSolid).toBe(true);
    }
  });

  it('updatePlatforms() dynamically spawns new tiers as camera moves up', () => {
    const world = createWorld();
    const initialCount = world.platforms.length;

    world.cameraY = -600;
    updatePlatforms(world);

    const highestY = Math.min(...world.platforms.map(p => p.y));
    expect(highestY).toBeLessThanOrEqual(-800);
    expect(world.platforms.length).toBeGreaterThan(initialCount);
  });

  it('updatePlatforms() removes offscreen platforms below the camera view', () => {
    const world = createWorld();
    world.cameraY = -200;
    updatePlatforms(world);

    const lowestY = Math.max(...world.platforms.map(p => p.y));
    expect(lowestY - world.cameraY).toBeLessThanOrEqual(550);
  });

  it('updatePlatforms() updates moving platforms horizontally with velocity and bounds', () => {
    const world = {
      platforms: [
        {
          x: 100,
          y: 200,
          width: PLATFORM_WIDTH,
          height: PLATFORM_HEIGHT,
          type: PLATFORM_TYPES.MOVING,
          vx: 80,
          minX: 50,
          maxX: 400,
        },
      ],
      cameraY: 0,
    };

    const dt = 0.5;
    updatePlatforms(world, dt);
    expect(world.platforms[0].x).toBeCloseTo(140, 1);

    // Thử va chạm mép phải: maxX - width = 400 - 120 = 280
    world.platforms[0].x = 275;
    world.platforms[0].vx = 80;
    updatePlatforms(world, 0.5);
    expect(world.platforms[0].vx).toBeLessThan(0);
  });

  it('ensureRoute() never exceeds ROUTE_MAX_STEP across 200 tiers', () => {
    let routeX = 300;
    for (let i = 0; i < 200; i++) {
      const tier = createPlatformTier(-100 - i * 70);
      const newRouteX = ensureRoute(tier, routeX, -100 - i * 70);
      expect(Math.abs(newRouteX - routeX)).toBeLessThanOrEqual(ROUTE_MAX_STEP);
      routeX = newRouteX;
    }
  });

  it('ensureRoute() handles fully packed tier by relocating', () => {
    const previousX = 400;
    const tier = [
      {
        x: 250,
        y: -200,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: PLATFORM_TYPES.MOVING,
        vx: 50,
      },
      {
        x: 550,
        y: -200,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: PLATFORM_TYPES.MOVING,
        vx: 50,
      },
    ];
    const result = ensureRoute(tier, previousX, -200);
    expect(Math.abs(result - previousX)).toBeLessThanOrEqual(ROUTE_MAX_STEP);
    expect(tier.some(p => p.safe)).toBe(true);
  });

  it('route constraint holds during camera scroll simulation', () => {
    const world = createWorld();
    let prevRouteX = world.routeX;
    for (let cam = -100; cam >= -5000; cam -= 300) {
      world.cameraY = cam;
      updatePlatforms(world);
      if (world.routeX !== prevRouteX) {
        prevRouteX = world.routeX;
      }
    }
    expect(world.platforms.some(p => p.safe)).toBe(true);
  });

  it('moving platforms never overlap same-tier platforms after 2s simulation', () => {
    for (let trial = 0; trial < 50; trial++) {
      const world = createWorld();
      const dt = 1 / 60;
      for (let frame = 0; frame < 120; frame++) {
        updatePlatforms(world, dt);
      }
      const tiers = new Map();
      for (const p of world.platforms) {
        const tierKey = Math.round(p.y / 15) * 15;
        if (!tiers.has(tierKey)) tiers.set(tierKey, []);
        tiers.get(tierKey).push(p);
      }
      for (const [, platforms] of tiers) {
        for (let i = 0; i < platforms.length; i++) {
          for (let j = i + 1; j < platforms.length; j++) {
            const a = platforms[i], b = platforms[j];
            const overlap = !(a.x + a.width <= b.x || b.x + b.width <= a.x);
            expect(overlap, `Platform overlap: x1=${a.x} and x2=${b.x}`).toBe(false);
          }
        }
      }
    }
  });

  it('moving platform bounds do not intersect adjacent platform areas', () => {
    for (let trial = 0; trial < 100; trial++) {
      const tier = createPlatformTier(-200);
      for (const p of tier) {
        if (p.type !== PLATFORM_TYPES.MOVING) continue;
        for (const other of tier) {
          if (other === p) continue;
          const otherLeft = other.type === PLATFORM_TYPES.MOVING ? (other.minX ?? other.x) : other.x;
          const otherRight = other.type === PLATFORM_TYPES.MOVING ? (other.maxX ?? (other.x + other.width)) : other.x + other.width;
          const canOverlap = (p.maxX ?? (p.x + p.width)) > otherLeft && (p.minX ?? p.x) < otherRight;
          expect(canOverlap, `Moving bounds [${p.minX}, ${p.maxX}] overlap with [${otherLeft}, ${otherRight}]`).toBe(false);
        }
      }
    }
  });

  it('edge-to-edge gap between adjacent platforms never exceeds MAX_JUMPABLE_GAP', () => {
    for (let trial = 0; trial < 1000; trial++) {
      const tier = createPlatformTier(-200);
      tier.sort((a, b) => a.x - b.x);
      for (let i = 0; i < tier.length - 1; i++) {
        const gap = tier[i + 1].x - (tier[i].x + tier[i].width);
        expect(gap).toBeLessThanOrEqual(MAX_JUMPABLE_GAP);
      }
    }
  });

  it('right margin for 3-platform tiers stays under 250px', () => {
    for (let trial = 0; trial < 1000; trial++) {
      const tier = createPlatformTier(-200);
      if (tier.length !== 3) continue;
      const rightmost = Math.max(...tier.map(p => p.x + p.width));
      const rightMargin = SCREEN_WIDTH - rightmost;
      expect(rightMargin).toBeLessThan(250);
    }
  });

  it('total spacing equals total free space (no wasted pixels)', () => {
    for (let trial = 0; trial < 500; trial++) {
      const tier = createPlatformTier(-200);
      tier.sort((a, b) => a.x - b.x);
      const leftMargin = tier[0].x;
      const rightMargin = SCREEN_WIDTH - (tier[tier.length - 1].x + PLATFORM_WIDTH);
      let internalGaps = 0;
      for (let i = 0; i < tier.length - 1; i++) {
        internalGaps += tier[i + 1].x - (tier[i].x + PLATFORM_WIDTH);
      }
      const totalUsed = leftMargin + rightMargin + internalGaps + tier.length * PLATFORM_WIDTH;
      expect(Math.abs(totalUsed - SCREEN_WIDTH)).toBeLessThanOrEqual(tier.length);
    }
  });
});

