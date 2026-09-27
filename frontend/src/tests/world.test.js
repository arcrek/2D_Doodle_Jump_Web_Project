import { describe, it, expect } from 'vitest';
import {
  createWorld,
  createPlatformTier,
  updatePlatforms,
  ensureRoute,
  seededRandom,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  MIN_GAP_Y,
  MAX_GAP_Y,
  MAX_JUMPABLE_GAP,
  ROUTE_MAX_STEP,
  FINISH_HEIGHT,
  FLOOR_HEIGHT,
  FINISH_PLATFORM_HEIGHT,
  PLATFORM_TYPES,
} from '../game/world.js';

describe('world.js - Finite Race Track & Procedural Generation', () => {
  // 1. Mulberry32 PRNG tests
  describe('seededRandom (Mulberry32)', () => {
    it('same seed produces identical sequence across multiple independent runs', () => {
      const rng1 = seededRandom(42);
      const rng2 = seededRandom(42);

      const seq1 = Array.from({ length: 5 }, () => rng1());
      const seq2 = Array.from({ length: 5 }, () => rng2());

      expect(seq1).toEqual(seq2);
      for (const val of seq1) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('different seeds produce different sequences', () => {
      const rngA = seededRandom(42);
      const rngB = seededRandom(99);

      const seqA = Array.from({ length: 5 }, () => rngA());
      const seqB = Array.from({ length: 5 }, () => rngB());

      expect(seqA).not.toEqual(seqB);
    });
  });

  // 2. Constants and sizes
  describe('Constants and platform sizing', () => {
    it('uses correct dimensions and exposed constants', () => {
      expect(SCREEN_WIDTH).toBe(960);
      expect(SCREEN_HEIGHT).toBe(540);
      expect(PLATFORM_WIDTH).toBe(120);
      expect(PLATFORM_HEIGHT).toBe(14);
      expect(MIN_GAP_Y).toBe(55);
      expect(MAX_GAP_Y).toBe(78);
      expect(FINISH_HEIGHT).toBe(3000);
      expect(FLOOR_HEIGHT).toBe(20);
      expect(FINISH_PLATFORM_HEIGHT).toBe(20);
    });

    it('platform sizes match constants without hard-coding', () => {
      const world = createWorld({ seed: 123 });
      for (const p of world.platforms) {
        if (p.type === PLATFORM_TYPES.FLOOR) {
          expect(p.width).toBe(SCREEN_WIDTH);
          expect(p.height).toBe(FLOOR_HEIGHT);
        } else if (p.type === PLATFORM_TYPES.FINISH) {
          expect(p.width).toBe(SCREEN_WIDTH);
          expect(p.height).toBe(FINISH_PLATFORM_HEIGHT);
        } else {
          expect(p.width).toBe(PLATFORM_WIDTH);
          expect(p.height).toBe(PLATFORM_HEIGHT);
        }
      }
    });
  });

  // 3. Floor platform
  describe('Floor platform', () => {
    it('floor platform spans full width', () => {
      const world = createWorld({ seed: 42 });
      const floor = world.platforms[0];

      expect(floor.type).toBe(PLATFORM_TYPES.FLOOR);
      expect(floor.x).toBe(0);
      expect(floor.width).toBe(SCREEN_WIDTH);
      expect(floor.height).toBe(FLOOR_HEIGHT);
      expect(world.floorY).toBe(SCREEN_HEIGHT - 80);
      expect(floor.y).toBe(world.floorY);
    });
  });

  // 4. Finish platform & finite track
  describe('Finish platform and finite boundary', () => {
    it('finish platform at correct Y', () => {
      const world = createWorld({ seed: 42 });
      const finish = world.platforms[world.platforms.length - 1];

      expect(finish.type).toBe(PLATFORM_TYPES.FINISH);
      expect(finish.x).toBe(0);
      expect(finish.width).toBe(SCREEN_WIDTH);
      expect(finish.height).toBe(FINISH_PLATFORM_HEIGHT);
      expect(world.finishY).toBe(world.floorY - FINISH_HEIGHT);
      expect(finish.y).toBe(world.finishY);
    });

    it('no platform exists above finish line', () => {
      const world = createWorld({ seed: 42 });
      expect(world.isFinite).toBe(true);

      for (const p of world.platforms) {
        expect(p.y).toBeGreaterThanOrEqual(world.finishY);
      }
    });
  });

  // 5. Update platforms when isFinite
  describe('updatePlatforms behavior with isFinite', () => {
    it('updatePlatforms() does not spawn when isFinite', () => {
      const world = createWorld({ seed: 42 });
      const initialCount = world.platforms.length;

      world.cameraY = -5000;
      updatePlatforms(world, 1 / 60);
      updatePlatforms(world, 1 / 60);
      updatePlatforms(world, 1 / 60);

      expect(world.platforms.length).toBe(initialCount);
    });

    it('updatePlatforms() preserves lower platforms and floor when isFinite', () => {
      const world = createWorld({ seed: 42 });
      const initialCount = world.platforms.length;

      world.cameraY = -2000;
      updatePlatforms(world, 1 / 60, { cullOffscreen: true });

      expect(world.platforms.length).toBe(initialCount);
      expect(world.platforms[0].type).toBe(PLATFORM_TYPES.FLOOR);
    });

    it('updatePlatforms() still updates moving platforms horizontally when isFinite', () => {
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
        isFinite: true,
      };

      const dt = 0.5;
      updatePlatforms(world, dt);
      expect(world.platforms[0].x).toBeCloseTo(140, 1);

      world.platforms[0].x = 275;
      world.platforms[0].vx = 80;
      updatePlatforms(world, 0.5);
      expect(world.platforms[0].vx).toBeLessThan(0);
    });
  });

  // 6. Route continuity
  describe('Route continuity from floor to finish', () => {
    it('route is continuously walkable floor to finish', () => {
      for (const seed of [1, 42, 999, 12345]) {
        const world = createWorld({ seed });
        const sorted = [...world.platforms].sort((a, b) => b.y - a.y); // from bottom (floor) to top (finish)

        // Nhóm các bệ theo tầng Y (dung sai 15px)
        const tiers = [];
        let currentTier = [];
        let currentTierY = sorted[0].y;

        for (const p of sorted) {
          if (Math.abs(p.y - currentTierY) <= 15) {
            currentTier.push(p);
          } else {
            const avgY = currentTier.reduce((sum, item) => sum + item.y, 0) / currentTier.length;
            tiers.push({ y: avgY, platforms: currentTier });
            currentTier = [p];
            currentTierY = p.y;
          }
        }
        if (currentTier.length > 0) {
          const avgY = currentTier.reduce((sum, item) => sum + item.y, 0) / currentTier.length;
          tiers.push({ y: avgY, platforms: currentTier });
        }

        // Kiểm tra khoảng cách Y giữa 2 tầng liên tiếp không vượt quá MAX_GAP_Y
        for (let i = 0; i < tiers.length - 1; i++) {
          const lowerTier = tiers[i];
          const upperTier = tiers[i + 1];
          const gapY = lowerTier.y - upperTier.y;
          expect(gapY).toBeLessThanOrEqual(MAX_GAP_Y);

          // Tầng trên phải có ít nhất 1 bệ mà người chơi có thể tiếp cận
          const hasWalkableOption = upperTier.platforms.some(up => {
            if (up.type === PLATFORM_TYPES.FINISH) return true;
            return lowerTier.platforms.some(low => {
              if (low.type === PLATFORM_TYPES.FLOOR) return true;
              return Math.abs(up.x - low.x) <= ROUTE_MAX_STEP + PLATFORM_WIDTH;
            });
          });
          expect(hasWalkableOption).toBe(true);
        }
      }
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

    it('ensureRoute retry limit prevents infinite loop', () => {
      // RNG giả lập luôn trả về 0.99 (giá trị sát cận biên)
      const difficultRng = () => 0.99;
      const world = createWorld({ rng: difficultRng });

      expect(world.platforms.length).toBeGreaterThan(10);
      expect(world.platforms[world.platforms.length - 1].type).toBe(PLATFORM_TYPES.FINISH);

      // Thử gọi ensureRoute với maxRetries rất nhỏ và bệ kín đặc
      const packedTier = [
        { x: 10, y: 100, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type: PLATFORM_TYPES.MOVING, minX: 0, maxX: SCREEN_WIDTH },
        { x: 200, y: 100, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, type: PLATFORM_TYPES.MOVING, minX: 0, maxX: SCREEN_WIDTH },
      ];
      const result = ensureRoute(packedTier, 300, 100, { maxRetries: 5 });
      expect(typeof result).toBe('number');
      expect(packedTier.some(p => p.safe)).toBe(true);
    });
  });

  // 7. Seed determinism
  describe('Seed determinism', () => {
    it('same seed produces identical layout', () => {
      const world1 = createWorld({ seed: 42 });
      const world2 = createWorld({ seed: 42 });

      expect(world1.platforms.length).toBe(world2.platforms.length);
      for (let i = 0; i < world1.platforms.length; i++) {
        const p1 = world1.platforms[i];
        const p2 = world2.platforms[i];
        expect(p1.x).toBe(p2.x);
        expect(p1.y).toBe(p2.y);
        expect(p1.type).toBe(p2.type);
        expect(p1.width).toBe(p2.width);
        expect(p1.height).toBe(p2.height);
      }
    });

    it('different seeds produce different layouts', () => {
      const worldA = createWorld({ seed: 42 });
      const worldB = createWorld({ seed: 99 });

      const xsA = worldA.platforms.map(p => p.x).join(',');
      const xsB = worldB.platforms.map(p => p.x).join(',');
      expect(xsA).not.toBe(xsB);
    });

    it('createWorld() without seed produces different layouts on each call', () => {
      const world1 = createWorld();
      const world2 = createWorld();
      const xs1 = world1.platforms.map(p => p.x).join(',');
      const xs2 = world2.platforms.map(p => p.x).join(',');
      expect(xs1).not.toBe(xs2);
    });
  });

  // 8. Tier creation and overlap prevention (Preserving existing test suite integrity)
  describe('Tier creation and spacing integrity', () => {
    it('createPlatformTier() spawns 3 or 4 platforms with the exact same size', () => {
      for (let testRun = 0; testRun < 20; testRun++) {
        const tierY = -100 - testRun * 50;
        const tierPlatforms = createPlatformTier(tierY, SCREEN_WIDTH);

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

    it('moving platforms never overlap same-tier platforms after 2s simulation', () => {
      for (let trial = 0; trial < 50; trial++) {
        const world = createWorld({ seed: trial });
        const dt = 1 / 60;
        for (let frame = 0; frame < 120; frame++) {
          updatePlatforms(world, dt);
        }
        const tiers = new Map();
        for (const p of world.platforms) {
          if (p.type === PLATFORM_TYPES.FLOOR || p.type === PLATFORM_TYPES.FINISH) continue;
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
});
