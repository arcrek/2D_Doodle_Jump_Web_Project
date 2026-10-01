import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  createWorld,
  createPlatformTier,
  updatePlatforms,
  ensureRoute,
  fillGameplayPlatforms,
  seededRandom,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  MIN_GAP_Y,
  MAX_GAP_Y,
  MAX_TIER_STEP,
  TIER_STEP_Y,
  TIER_SPAN,
  tierStaggerOffsets,
  MAX_JUMPABLE_GAP,
  ROUTE_MAX_STEP,
  FINISH_HEIGHT,
  FLOOR_HEIGHT,
  FINISH_PLATFORM_HEIGHT,
  PLATFORM_TYPES,
  getPlatformCountForHeight,
} from '../game/world.js';
import { GRAVITY, JUMP_VELOCITY } from '../game/physics.js';

// Chiều cao nhảy tối đa mà vật lý thực sự cho phép: v0^2 / (2g)
const MAX_JUMP_RISE = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);

// Sàn xuất phát của world vô hạn. Tầng bệ ở độ cao `altitude` nằm tại
// tierY = START_Y - altitude, khớp với chân người chơi lúc spawn.
const START_Y = SCREEN_HEIGHT - 110;

// (TIER_CLUSTER_PX khai báo ở groupIntoTiers bên dưới, dùng chung cho file.)

// Trung bình số bệ/tầng tại một độ cao, lấy mẫu nhiều lần với RNG đã gieo
// để kết quả ổn định chứ không phụ thuộc thứ tự lời gọi.
function meanDensity(altitude, samples = 4000) {
  const tierY = START_Y - altitude;
  let seed = (Math.imul(altitude, 2654435761) ^ 0x9e3779b9) >>> 0;
  let sum = 0;
  for (let i = 0; i < samples; i += 1) {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    sum += getPlatformCountForHeight(tierY, () => ((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return sum / samples;
}

// Nhóm bệ theo tầng Y.
//
// Ngưỡng gom bệ thành tầng khi đo. Bệ trong một tầng bậc thang nên trải
// rộng tối đa TIER_SPAN (42px, tầng 4 bệ), nên ngưỡng phải bằng đúng con số
// đó — nhỏ hơn thì một tầng bị tách thành nhiều "tầng", lớn hơn thì hai tầng
// kề bị gộp làm một và mọi phép đo mật độ ra sai.
//
// LƯU Ý: bề rộng tầng (42px) LỚN HƠN khoảng cách giữa hai tầng kề
// (MIN_GAP_Y = 62px), nên các tầng kề có thể chồng lấn theo trục Y. Vì vậy
// phép gom cụm ở đây KHÔNG đáng tin với cấu hình bậc thang — các test đo
// tầng phải nhận diện theo dấu vết sinh, không theo vị trí Y.
const TIER_CLUSTER_PX = TIER_SPAN;

function groupIntoTiers(platforms) {
  const sorted = [...platforms].sort((a, b) => b.y - a.y); // từ dưới lên trên
  const tiers = [];
  let current = [];
  let currentY = sorted[0]?.y ?? 0;
  for (const p of sorted) {
    if (Math.abs(p.y - currentY) <= TIER_CLUSTER_PX) current.push(p);
    else { tiers.push(current); current = [p]; currentY = p.y; }
  }
  if (current.length) tiers.push(current);
  return tiers;
}

// Khoảng cách dọc nhỏ nhất giữa tầng dưới và tầng trên
function minVerticalGap(lowerTier, upperTier) {
  let min = Infinity;
  for (const low of lowerTier) for (const up of upperTier) min = Math.min(min, low.y - up.y);
  return min;
}

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
      expect(MIN_GAP_Y).toBe(62);
      expect(MAX_GAP_Y).toBe(78);
      expect(MAX_TIER_STEP).toBe(70);
      expect(TIER_STEP_Y).toBe(14);
      expect(TIER_SPAN).toBe(42);
      expect(FINISH_HEIGHT).toBe(3000);
      expect(FLOOR_HEIGHT).toBe(20);
      expect(FINISH_PLATFORM_HEIGHT).toBe(20);
    });

    // Hằng số "chết": export nhưng không dòng nào trong world.js dùng tới.
    // Y_SPREAD = 15 đã sống sót sau khi đổi sang bậc thang 14px — mọi test
    // vẫn xanh vì không test nào import nó. Phải đọc file nguồn thay vì tin
    // vào danh sách import, nếu không lỗi loại này sẽ lặp lại.
    //
    // Danh sách ALLOW_DEAD là các alias tương thích ngược: cố ý không dùng
    // trong world.js nhưng giữ để code gọi từ ngoài không vỡ.
    const ALLOW_DEAD = new Set(['MAX_JUMPABLE_X_DISTANCE']);
    it('leaves no dead exported constants behind', () => {
      // readFileSync bằng đường dẫn tương đối từ gốc frontend. KHÔNG dùng
    // import.meta.url: jsdom đổi nó thành URL scheme http://, readFileSync
    // chỉ nhận scheme file://.
    const worldPath = existsSync('src/game/world.js') ? 'src/game/world.js' : 'frontend/src/game/world.js';
    const src = readFileSync(worldPath, 'utf8');
      const exported = [...src.matchAll(/export const (\w+)\s*=/g)].map((m) => m[1]);
      expect(exported.length).toBeGreaterThan(5);
      for (const name of exported) {
        if (ALLOW_DEAD.has(name)) continue;
        const uses = [...src.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length;
        expect(uses, `world.js export "${name}" nhung khong dung o dau`).toBeGreaterThan(1);
      }
    });

    it('platform sizes match constants without hard-coding', () => {
      const world = createWorld({ isFinite: true, seed: 123 });
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
      const world = createWorld({ isFinite: true, seed: 42 });
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
      const world = createWorld({ isFinite: true, seed: 42 });
      const finish = world.platforms[world.platforms.length - 1];

      expect(finish.type).toBe(PLATFORM_TYPES.FINISH);
      expect(finish.x).toBe(0);
      expect(finish.width).toBe(SCREEN_WIDTH);
      expect(finish.height).toBe(FINISH_PLATFORM_HEIGHT);
      expect(world.finishY).toBe(world.floorY - FINISH_HEIGHT);
      expect(finish.y).toBe(world.finishY);
    });

    it('no platform exists above finish line', () => {
      const world = createWorld({ isFinite: true, seed: 42 });
      expect(world.isFinite).toBe(true);

      for (const p of world.platforms) {
        expect(p.y).toBeGreaterThanOrEqual(world.finishY);
      }
    });
  });

  // 5. Update platforms when isFinite
  describe('updatePlatforms behavior with isFinite', () => {
    it('updatePlatforms() does not spawn when isFinite', () => {
      const world = createWorld({ isFinite: true, seed: 42 });
      const initialCount = world.platforms.length;

      world.cameraY = -5000;
      updatePlatforms(world, 1 / 60);
      updatePlatforms(world, 1 / 60);
      updatePlatforms(world, 1 / 60);

      expect(world.platforms.length).toBe(initialCount);
    });

    it('updatePlatforms() preserves lower platforms and floor when isFinite', () => {
      const world = createWorld({ isFinite: true, seed: 42 });
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

        // Gom bệ theo tầng. Bệ trong tầng rung ±Y_SPREAD nên lệch nhau tới
        // 2×Y_SPREAD; cụm 15px cũ sẽ tách một tầng thành nhiều cụm 1 bệ và
        // phá vỡ kiểm tra route bên dưới. Gom theo giữa cụm, không theo bệ đầu.
        const tiers = [];
        let currentTier = [];
        const midOf = (arr) => {
          const ys = arr.map((q) => q.y);
          return (Math.min(...ys) + Math.max(...ys)) / 2;
        };
        let currentTierY = midOf([sorted[0]]);

        for (const p of sorted) {
          if (Math.abs(p.y - currentTierY) <= TIER_CLUSTER_PX) {
            currentTier.push(p);
            currentTierY = midOf(currentTier);
          } else {
            tiers.push({ y: midOf(currentTier), platforms: currentTier });
            currentTier = [p];
            currentTierY = midOf(currentTier);
          }
        }
        if (currentTier.length > 0) {
          tiers.push({ y: midOf(currentTier), platforms: currentTier });
        }

        // Kiểm tra khoảng cách Y giữa 2 tầng liên tiếp không vượt quá MAX_GAP_Y
        for (let i = 0; i < tiers.length - 1; i++) {
          const lowerTier = tiers[i];
          const upperTier = tiers[i + 1];
          const gapY = lowerTier.y - upperTier.y;
          // Bước tối đa bây giờ là MAX_TIER_STEP + 2×Y_SPREAD, không còn là
          // MAX_GAP_Y (78). Ngưỡng phải lấy từ công thức đó, không hardcode.
          expect(gapY).toBeLessThanOrEqual(MAX_TIER_STEP + TIER_SPAN);

          // Tầng trên phải có ít nhất 1 bệ mà người chơi tiếp cận được: vừa
          // đủ gần theo X, vừa không cao hơn giới hạn nhảy. Bản cũ chỉ so X,
          // nên một bệ treo quá cao vẫn bị tính là "tiếp cận được" — sót lỗi.
          const hasWalkableOption = upperTier.platforms.some(up => {
            if (up.type === PLATFORM_TYPES.FINISH) return true;
            return lowerTier.platforms.some(low => {
              if (low.type === PLATFORM_TYPES.FLOOR) return true;
              const reachableX = Math.abs(up.x - low.x) <= ROUTE_MAX_STEP + PLATFORM_WIDTH;
              const reachableY = lowerTier.y - up.y <= MAX_JUMP_RISE;
              return reachableX && reachableY;
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
      const world = createWorld({ isFinite: true, rng: difficultRng });

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

  // 6b. Vertical reachability of the world the player actually gets
  describe('Vertical reachability of the live intro world', () => {
    // Đây chính là world mà engine.js dựng ra khi bấm Start:
    // createWorld({ forIntro: true }) + fillGameplayPlatforms().
    const buildLiveWorld = (seed) => {
      const world = createWorld({ forIntro: true, seed });
      fillGameplayPlatforms(world);
      return world;
    };

    it('never leaves a tier further above than one jump, across 200 seeds', () => {
      const deadEnds = [];
      for (let seed = 1; seed <= 200; seed += 1) {
        const tiers = groupIntoTiers(buildLiveWorld(seed).platforms);
        for (let i = 1; i < tiers.length; i += 1) {
          const gap = minVerticalGap(tiers[i - 1], tiers[i]);
          if (gap > MAX_JUMP_RISE) {
            deadEnds.push({ seed, from: tiers[i - 1][0].y, to: tiers[i][0].y, gap });
          }
        }
      }
      expect(deadEnds).toEqual([]);
    });

    it('leaves no vertical dead end at either edge of the intro title band', () => {
      // Dải [-650, -220] bị createWorld(forIntro) bỏ qua rồi fillGameplayPlatforms lấp lại.
      // Hai mốc này là nơi dễ để lại lỗ hổng nếu vòng lặp lấp không neo vào tầng thật.
      const BAND_TOP = -650;
      const BAND_BOTTOM = -220;
      const problems = [];

      for (let seed = 1; seed <= 200; seed += 1) {
        const tiers = groupIntoTiers(buildLiveWorld(seed).platforms);
        for (let i = 1; i < tiers.length; i += 1) {
          const lowerY = tiers[i - 1][0].y;
          const upperY = tiers[i][0].y;
          const crossesBottom = lowerY > BAND_BOTTOM && upperY <= BAND_BOTTOM;
          const crossesTop = lowerY > BAND_TOP && upperY <= BAND_TOP;
          if (!crossesBottom && !crossesTop) continue;
          const gap = minVerticalGap(tiers[i - 1], tiers[i]);
          if (gap > MAX_JUMP_RISE) problems.push({ seed, edge: crossesBottom ? 'bottom' : 'top', gap });
        }
      }

      expect(problems).toEqual([]);
    });

    // ensureRoute chỉ đẩy thêm bệ khi tầng hiện tại không có bệ nào nằm trong
    // ROUTE_MAX_STEP của bệ trước. Ở cao độ lớn getPlatformCountForHeight rút
    // xuống còn 1 bệ/tầng nên nhánh đẩy mới thực sự xảy ra - đó là nơi lỗi lộ ra.
    function* walkRouteChain(seed, startTierY, stepPx, tierCount) {
      const rng = seededRandom(seed);
      let previousX = 300;
      let pushed = 0;
      for (let i = 0; i < tierCount; i += 1) {
        const tierY = startTierY - i * stepPx;
        const tier = createPlatformTier(tierY, SCREEN_WIDTH, rng, { densityScale: true });
        const before = tier.length;
        const returned = ensureRoute(tier, previousX, tierY, { rng });
        if (tier.length > before) pushed += 1;
        const routePlatform = tier.find(p => p.safe);
        yield { tier, returned, routePlatform, previousX, pushed };
        previousX = routePlatform.x;
      }
    };

    it('ensureRoute returns the x of the route platform actually left in the tier', () => {
      const mismatches = [];
      let totalPushed = 0;
      // cao độ thấp (nhiều bệ/tầng) và cao độ cao (1-2 bệ/tầng)
      for (const [start, step] of [[-100, 70], [-4600, 70]]) {
        for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
          for (const { tier, returned, routePlatform, pushed } of walkRouteChain(seed, start, step, 80)) {
            if (routePlatform && returned !== routePlatform.x) {
              mismatches.push({ seed, start, returned, actual: routePlatform.x });
            }
            totalPushed = pushed;
          }
        }
      }

      expect(totalPushed).toBeGreaterThan(0);
      expect(mismatches).toEqual([]);
    });

    it('keeps consecutive route platforms within ROUTE_MAX_STEP by real position', () => {
      const breaks = [];
      for (const [start, step] of [[-100, 70], [-4600, 70]]) {
        for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
          for (const { routePlatform, previousX } of walkRouteChain(seed, start, step, 80)) {
            if (Math.abs(routePlatform.x - previousX) > ROUTE_MAX_STEP) {
              breaks.push({ seed, start, from: previousX, to: routePlatform.x });
            }
          }
        }
      }

      expect(breaks).toEqual([]);
    });
  });

  // 6c. Mặc định sinh vô hạn, không có bệ full-width nào
  describe('Endless is the default mode (no full-width platform)', () => {
    it('createWorld() with no options returns an endless world', () => {
      const world = createWorld({ seed: 42 });

      expect(world.isFinite).toBe(false);
      expect(world.finishY).toBeNull();
      expect(world.platforms.some(p => p.type === PLATFORM_TYPES.FLOOR)).toBe(false);
      expect(world.platforms.some(p => p.type === PLATFORM_TYPES.FINISH)).toBe(false);
      for (const p of world.platforms) expect(p.width).toBe(PLATFORM_WIDTH);
    });

    it('the world the game actually builds has no full-width platform anywhere', () => {
      // Đúng chuỗi mà engine.js gọi: createWorld({ forIntro: true }) + fillGameplayPlatforms().
      // Không được có bệ dài nào - không ở đáy lúc spawn, không ở mốc 3000m.
      for (const seed of [1, 7, 42, 175, 2024]) {
        const world = createWorld({ forIntro: true, seed });
        fillGameplayPlatforms(world);

        const fullWidth = world.platforms.filter(p => p.width > PLATFORM_WIDTH);
        expect(fullWidth).toEqual([]);
      }
    });

    it('keeps spawning climbable platforms all the way past the 3000m line', () => {
      const world = createWorld({ seed: 5 });
      let playerY = 430;
      let starved = null;

      for (let step = 0; step < 20000 && playerY > -3600; step += 1) {
        playerY -= 8;
        world.cameraY = Math.min(world.cameraY, playerY - 540 * 0.6);
        updatePlatforms(world, 1 / 60);

        if (step % 60 === 0) {
          const hasPlatformAbove = world.platforms
            .some(p => p.y < playerY - 20 && playerY - p.y <= MAX_JUMP_RISE);
          if (!hasPlatformAbove && !starved) {
            starved = { step, playerY, height: Math.round(388 - playerY) };
          }
        }
      }

      expect(388 - playerY).toBeGreaterThan(3000);
      expect(starved).toBeNull();
    });

    it('never leaves a dead end while climbing, from spawn to past 3000m', () => {
      const world = createWorld({ seed: 11 });
      let playerY = 430;

      for (let step = 0; step < 20000 && playerY > -3400; step += 1) {
        playerY -= 8;
        world.cameraY = Math.min(world.cameraY, playerY - 540 * 0.6);
        updatePlatforms(world, 1 / 60);
      }

      const tiers = groupIntoTiers(world.platforms.filter(p => !p.broken));
      const deadEnds = [];
      for (let i = 1; i < tiers.length; i += 1) {
        const gap = minVerticalGap(tiers[i - 1], tiers[i]);
        if (gap > MAX_JUMP_RISE) deadEnds.push({ from: tiers[i - 1][0].y, to: tiers[i][0].y, gap });
      }

      expect(deadEnds).toEqual([]);
    });

    // WORLD-01 vẫn còn nguyên: chỉ mặc định đổi, không xoá chế độ hữu hạn.
    it('finite mode is still reachable on demand, floor and finish intact', () => {
      const world = createWorld({ isFinite: true, seed: 42 });

      expect(world.isFinite).toBe(true);

      const floor = world.platforms[0];
      expect(floor.type).toBe(PLATFORM_TYPES.FLOOR);
      expect(floor.width).toBe(SCREEN_WIDTH);

      const finish = world.platforms[world.platforms.length - 1];
      expect(finish.type).toBe(PLATFORM_TYPES.FINISH);
      expect(finish.width).toBe(SCREEN_WIDTH);

      const before = world.platforms.length;
      world.cameraY = -5000;
      updatePlatforms(world, 1 / 60);
      expect(world.platforms.length).toBe(before);
    });
  });

  // 6d. Mật độ bệ giảm mượt theo độ cao (độ khó tăng dần)
  describe('Platform density thins out gradually with altitude', () => {
    // Đường cong đã chốt: DENSITY_FADE_SPAN = 1000, nên 4 -> 3 -> 2 với
    // mỗi nấc mất đúng 1 bệ sau mỗi 1000px leo.
    //   0m    -> 4.00   (đáy, vùng làm quen)
    //   500m  -> 3.50
    //   1000m -> 3.00   (hết nấc 4 bệ)
    //   1500m -> 2.50
    //   2000m -> 2.00   (đạt sàn, dừng mỏng)
    // Trước đây span là 1500 nên 1500m còn 3 bệ; ngưỡng cũ không còn đúng.
    it('follows the spec curve: 4 at the bottom, 3 at 1000m, 2 from 2000m', () => {
      expect(meanDensity(0)).toBeGreaterThanOrEqual(3.9);
      expect(meanDensity(500)).toBeGreaterThanOrEqual(3.4);
      expect(meanDensity(1000)).toBeGreaterThanOrEqual(2.9);
      expect(meanDensity(1500)).toBeGreaterThanOrEqual(2.4);
      expect(meanDensity(2000)).toBeGreaterThanOrEqual(1.9);
      expect(meanDensity(3000)).toBeGreaterThanOrEqual(1.9);
      expect(meanDensity(6000)).toBeGreaterThanOrEqual(1.9);
    });

    // Chênh lệch giữa các độ cao phải thấy rõ: mỗi 1000px mất đúng 1 bệ.
    // Đây là yêu cầu trực tiếp — trước đó span 1500 làm người chơi không
    // cảm nhận được khác biệt giữa các độ cao.
    it('drops by a full platform across each 1000m step', () => {
      const at = (a) => meanDensity(a, 4000);
      expect(at(0) - at(1000)).toBeGreaterThan(0.9);
      expect(at(1000) - at(2000)).toBeGreaterThan(0.9);
      // Dưới sàn 2 bệ thì phải đứng yên, không âm thêm nữa.
      expect(at(2000) - at(3000)).toBeLessThan(0.1);
    });

    it('never decreases, and never drops more than one platform across 1000m', () => {
      const samples = [];
      for (let altitude = 0; altitude <= 3000; altitude += 50) {
        samples.push({ altitude, mean: meanDensity(altitude, 2000) });
      }

      for (let i = 1; i < samples.length; i += 1) {
        const drop = samples[i - 1].mean - samples[i].mean;
        expect(samples[i].mean).toBeLessThanOrEqual(samples[i - 1].mean + 0.05);
        expect(drop).toBeLessThanOrEqual(1);
      }
    });

    it('never drops below 2 platforms per tier, however high the climb', () => {
      for (const altitude of [0, 500, 1000, 2000, 3000, 4000, 6000, 10000, 20000]) {
        const tierY = START_Y - altitude;
        for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
          expect(getPlatformCountForHeight(tierY, () => r)).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('leaves no vertical dead end when tiers get thinner', () => {
      const deadEnds = [];
      const density = [];

      for (const seed of [1, 5, 11, 42, 175, 999, 31337, 777]) {
        const world = createWorld({ seed });
        // Gom tầng TRONG LÚC leo: updatePlatforms cull mọi tầng đã lọt khỏi
        // màn hình, nên đọc world.platforms ở cuối sẽ mất sạch tầng cao.
        const seen = new Set();
        const collected = [];
        let playerY = START_Y;
        for (let step = 0; step < 20000 && playerY > -2700; step += 1) {
          playerY -= 8;
          world.cameraY = Math.min(world.cameraY, playerY - SCREEN_HEIGHT * 0.6);
          updatePlatforms(world, 1 / 60, { cullOffscreen: true });
          if (step % 20 !== 0) continue;

          const sorted = world.platforms.filter(p => !seen.has(p)).sort((a, b) => b.y - a.y);
          // Cụm theo ngưỡng TIER_CLUSTER_PX. Bệ trong một tầng rung ±Y_SPREAD
          // (=±15) nên lệch nhau tối đa 30px; gom bằng tier[0].y sẽ tách nhầm
          // một tầng thành 2-3 cụm và đếm mật độ sai. Ngưỡng phải lớn hơn
          // 2×Y_SPREAD. Gom theo GIỮA cụm chứ không theo phần tử đầu, vì
          // phần tử đầu vênh ±15px làm lệch cả các bệ sau.
          const midOf = (arr) => {
            const ys = arr.map((q) => q.y);
            return (Math.min(...ys) + Math.max(...ys)) / 2;
          };
          let tier = [];
          for (const p of sorted) {
            if (tier.length && Math.abs(p.y - midOf(tier)) <= TIER_CLUSTER_PX) tier.push(p);
            else {
              if (tier.length > 1) collected.push({ y: midOf(tier), n: tier.length });
              tier = [p];
            }
          }
          if (tier.length > 1) collected.push({ y: midOf(tier), n: tier.length });
          for (const p of sorted) seen.add(p);
        }

        collected.sort((a, b) => b.y - a.y);
        for (let i = 1; i < collected.length; i += 1) {
          const gap = collected[i - 1].y - collected[i].y;
          if (gap > MAX_JUMP_RISE) deadEnds.push({ seed, from: collected[i - 1].y, gap });
        }

        const meanOf = list => list.reduce((s, c) => s + c.n, 0) / Math.max(1, list.length);
        density.push({
          seed,
          early: meanOf(collected.filter(c => c.y > -1600)),
          late: meanOf(collected.filter(c => c.y < -2000)),
        });
      }

      expect(deadEnds).toEqual([]);
      // Tầng cao phải thưa hơn tầng thấp trong chính world đang chơi
      for (const d of density) {
        expect(d.late).toBeLessThan(d.early);
      }
    });

    it('finite mode keeps 3-4 platforms per tier, unchanged', () => {
      for (let y = START_Y; y > -2500; y -= 70) {
        const tier = createPlatformTier(y, SCREEN_WIDTH, seededRandom(y + 3000), {
          densityScale: false,
        });
        expect(tier.length).toBeGreaterThanOrEqual(3);
        expect(tier.length).toBeLessThanOrEqual(4);
      }
    });

    // Rung ±Y_SPREAD mở ra một lỗi mà rung chung ±4px không có: hai bệ cùng
    // tầng có thể rung NGƯỢC pha, rơi sát nhau theo phương ngang ở hai cao độ
    // gần nhau, rồi chồng lên nhau. resolveTier chỉ dồn theo trục x nên không
    // bắt được trường hợp này.
    it('never stacks two platforms on top of each other despite the 14px stagger', () => {
      for (const seed of [1, 7, 42, 99, 175, 999, 31337, 777, 2024, 60606]) {
        for (let y = START_Y; y > -3000; y -= MAX_TIER_STEP) {
          const tier = createPlatformTier(y, SCREEN_WIDTH, seededRandom(seed * 7919 + y), {
            densityScale: false,
          });
          for (let i = 0; i < tier.length; i += 1) {
            for (let j = i + 1; j < tier.length; j += 1) {
              const dx = Math.abs(tier[i].x - tier[j].x);
              const dy = Math.abs(tier[i].y - tier[j].y);
              const overlapX = dx < PLATFORM_WIDTH;
              const overlapY = dy < PLATFORM_HEIGHT;
              expect(
                overlapX && overlapY,
                `seed ${seed} tai y=${y}: be ${i} va ${j} chong nhau (dx=${dx}, dy=${dy})`,
              ).toBe(false);
            }
          }
        }
      }
    });

    // Bậc thang: mỗi bệ lệch bệ kề đúng PLATFORM_HEIGHT (14px). Đây là yêu
    // cầu trực tiếp — trước đó bệ trong tầng rung ngẫu nhiên nên không có
    // quy luật nào đo được.
    it('staggers every platform by exactly PLATFORM_HEIGHT within a tier', () => {
      let checked = 0;
      for (let s = 0; s < 40; s += 1) {
        const tier = createPlatformTier(START_Y - 900, SCREEN_WIDTH, seededRandom(s * 104729 + 7), {
          densityScale: false,
        });
        if (tier.length < 2) continue;
        checked += 1;

        // Sắp theo X: bậc thang được đặt theo thứ tự X nên phải đơn điệu.
        const ys = [...tier].sort((a, b) => a.x - b.x).map((p) => p.y);
        for (let i = 1; i < ys.length; i += 1) {
          // createPlatformTier gọi resolveTier (sort theo X) sau khi gán y,
          // nên chênh lệch luôn dương hoặc luôn âm, đúng TIER_STEP_Y.
          expect(Math.abs(ys[i] - ys[i - 1])).toBe(TIER_STEP_Y);
        }
      }
      expect(checked).toBeGreaterThan(30);
    });

    // Tầng 4 bệ phải trải rộng đúng TIER_SPAN và không bệ nào chồng nhau.
    it('spans exactly TIER_SPAN on a 4-platform tier, with no overlap', () => {
      const tier = createPlatformTier(START_Y - 900, SCREEN_WIDTH, seededRandom(99), {
        densityScale: false,
        platformCount: 4,
      });
      expect(tier).toHaveLength(4);
      const ys = tier.map((p) => p.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBe(TIER_SPAN);

      for (let i = 0; i < tier.length; i += 1) {
        for (let j = i + 1; j < tier.length; j += 1) {
          expect(Math.abs(tier[i].x - tier[j].x)).toBeGreaterThanOrEqual(PLATFORM_WIDTH);
        }
      }
    });

    // Tầng 1 bệ không có bậc thang — lệch 0, giữ nguyên hành vi cũ.
    it('leaves a single-platform tier unshifted', () => {
      expect(tierStaggerOffsets(1)).toEqual([0]);
      expect(tierStaggerOffsets(1, true)).toEqual([0]);
      const tier = createPlatformTier(START_Y - 900, SCREEN_WIDTH, seededRandom(7), {
        platformCount: 1,
      });
      expect(tier[0].y).toBe(START_Y - 900);
    });

    // Bước dọc xấu nhất = MAX_TIER_STEP + TIER_SPAN phải nằm dưới giới hạn
    // nhảy thật. Hàng phòng thủ: nếu ai đó tăng TIER_SPAN mà quên hạ
    // MAX_TIER_STEP, đường đi vỡ trong lúc chơi chứ không phải trong test.
    it('keeps the worst-case vertical step inside the real jump limit', () => {
      const worstCase = MAX_TIER_STEP + TIER_SPAN;
      expect(worstCase).toBeLessThan(MAX_JUMP_RISE);
      expect(TIER_STEP_Y).toBe(PLATFORM_HEIGHT);
    });

    // TẦNG BẬC THANG CHỒNG LẤN TẦNG KỀ — đây là hệ quả trực tiếp của yêu
    // cầu "mỗi bệ lệch nhau 14px": tầng 4 bệ rộng 42px trong khi hai tầng kề
    // chỉ cách nhau MIN_GAP_Y = 62px, mà 62 < 2×42.
    //
    // Hệ quả ĐO LƯỜNG: gom bệ theo cụm vị trí Y KHÔNG còn tách được tầng,
    // nên các test đo mật độ phải nhận diện tầng theo dấu vết sinh.
    // Ràng buộc này không suy ra được từ giới hạn nhảy, nên phải chặn riêng.
    it('flags that tier bands overlap, so y-clustering is unreliable', () => {
      expect(MIN_GAP_Y < 2 * TIER_SPAN).toBe(true);
      expect(MAX_TIER_STEP + TIER_SPAN).toBeLessThan(MAX_JUMP_RISE);
    });

    // Khoảng cách bệ đã kéo dài đúng yêu cầu "bệ cách xa hơn theo chiều dọc":
    // mỗi tầng phải nằm xa nhau hơn trước khi MIN_GAP_Y = 55.
    it('places tiers far enough apart vertically', () => {
      const steps = [];
      for (let seed = 1; seed <= 12; seed += 1) {
        const world = createWorld({ seed });
        const seen = new Set();
        let playerY = START_Y;
        for (let step = 0; step < 3000 && playerY > -2500; step += 1) {
          playerY -= 8;
          world.cameraY = Math.min(world.cameraY, playerY - SCREEN_HEIGHT * 0.6);
          updatePlatforms(world, 1 / 60, { cullOffscreen: true });
          if (step % 20 !== 0) continue;
          const fresh = world.platforms.filter((p) => !seen.has(p)).sort((a, b) => b.y - a.y);
          for (const p of fresh) seen.add(p);
          const midOf = (arr) => {
            const ys = arr.map((q) => q.y);
            return (Math.min(...ys) + Math.max(...ys)) / 2;
          };
          const mids = [];
          let cur = [];
          for (const p of fresh) {
            if (cur.length && Math.abs(p.y - midOf(cur)) <= TIER_CLUSTER_PX) cur.push(p);
            else { if (cur.length > 1) mids.push(midOf(cur)); cur = [p]; }
          }
          if (cur.length > 1) mids.push(midOf(cur));
          for (let i = 1; i < mids.length; i += 1) steps.push(mids[i - 1] - mids[i]);
        }
      }
      expect(steps.length).toBeGreaterThan(200);
      const sorted = [...steps].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      // Trước khi kéo dài (MIN_GAP_Y = 55, MAX_TIER_STEP = 65): trung vị ~55px.
      expect(median).toBeGreaterThan(65);
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

  // 9. Endless Mode & Density Scaling (Issue #22 & #26)
  describe('Endless Mode & Density Scaling (Issue #22 & #26)', () => {
    it('getPlatformCountForHeight() reduces density as altitude increases but never drops below 1', () => {
      // Dưới 1000px: 3 - 4 bệ
      for (let i = 0; i < 20; i++) {
        const count = getPlatformCountForHeight(460 - 500);
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(4);
      }

      // 1000px - 2500px: 2 - 3 bệ
      for (let i = 0; i < 20; i++) {
        const count = getPlatformCountForHeight(460 - 1800);
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(3);
      }

      // Trên 5000px: 1 - 2 bệ (cực khó nhưng luôn >= 1 bệ)
      for (let i = 0; i < 20; i++) {
        const count = getPlatformCountForHeight(460 - 6000);
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(2);
      }
    });

    it('createPlatformTier() correctly supports 1 and 2 platforms without overlap or trap', () => {
      // 1 platform
      for (let i = 0; i < 20; i++) {
        const tier = createPlatformTier(-500, SCREEN_WIDTH, Math.random, { platformCount: 1 });
        expect(tier.length).toBe(1);
        expect(tier[0].type).not.toBe(PLATFORM_TYPES.FRAGILE);
        expect(tier[0].x).toBeGreaterThanOrEqual(0);
        expect(tier[0].x + tier[0].width).toBeLessThanOrEqual(SCREEN_WIDTH);
      }

      // 2 platforms
      for (let i = 0; i < 20; i++) {
        const tier = createPlatformTier(-500, SCREEN_WIDTH, Math.random, { platformCount: 2 });
        expect(tier.length).toBe(2);
        expect(tier[0].x).toBeGreaterThanOrEqual(0);
        expect(tier[1].x + tier[1].width).toBeLessThanOrEqual(SCREEN_WIDTH);
        const gap = tier[1].x - (tier[0].x + tier[0].width);
        expect(gap).toBeGreaterThanOrEqual(20);
        expect(gap).toBeLessThanOrEqual(MAX_JUMPABLE_GAP);
      }
    });

    it('createWorld({ isFinite: false }) initializes endless mode without floor or finish', () => {
      const world = createWorld({ isFinite: false, seed: 42 });
      expect(world.isFinite).toBe(false);
      expect(world.finishY).toBeNull();
      // Không có bệ loại floor hoặc finish
      expect(world.platforms.some(p => p.type === PLATFORM_TYPES.FLOOR)).toBe(false);
      expect(world.platforms.some(p => p.type === PLATFORM_TYPES.FINISH)).toBe(false);
      // Bệ đầu tiên là bệ tiêu chuẩn dưới chân nhân vật
      expect(world.platforms[0].type).toBe(PLATFORM_TYPES.STANDARD);
    });

    it('updatePlatforms() in endless mode spawns dynamically with density scaling and maintains continuous route', () => {
      const world = createWorld({ isFinite: false, seed: 777 });
      const initialCount = world.platforms.length;

      // Cuộn camera lên cao dần
      for (let cam = -200; cam >= -4000; cam -= 300) {
        world.cameraY = cam;
        updatePlatforms(world, 1 / 60, { cullOffscreen: false });
      }

      // Bệ phải tiếp tục sinh vô hạn theo camera
      expect(world.platforms.length).toBeGreaterThan(initialCount);

      // Kiểm tra các tầng sinh ở độ cao lớn (y < -2500) có mật độ ít bệ hơn (1-2 bệ)
      const highPlatforms = world.platforms.filter(p => p.y < -2500);
      expect(highPlatforms.length).toBeGreaterThan(0);

      // Vẫn đảm bảo có bệ safe đảm bảo lộ trình nhảy được
      expect(world.platforms.some(p => p.safe)).toBe(true);
    });
  });
});
