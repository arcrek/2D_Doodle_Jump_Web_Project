// =============================================================================
// FILE: doodle-jump-usth/frontend/src/game/engine.js
// VAI TRÒ: CORE GAME ENGINE & ĐIỀU PHỐI VÒNG LẶP CHUYỂN CẢNH (CINEMATIC ENGINE)
// =============================================================================
// Module này quản lý toàn bộ vòng đời ván đấu:
// 1. Giai đoạn mở đầu (Cinematic Intro): Tiêu đề bầu trời -> Camera trượt xuống
//    (Slide down) -> Xuất hiện bệ đầu -> Nhân vật nhảy vào -> Hiện các bệ khác.
// 2. Giai đoạn thi đấu chính (Active Gameplay 60 FPS): Vật lý, Va chạm bệ,
//    Điều khiển ngang, AI 4 Bot đối thủ, Cuộn camera đuổi theo độ cao.
// 3. Giai đoạn kết thúc & Chuyển cảnh (Transitions): Wipe Curtain che màn hình
//    khi chơi lại (Restart), hoặc trượt ngược camera lên trời (Return to Title).
// =============================================================================

import { createInput } from './input.js';
import { createPlayer, updateHorizontal } from './player.js';
import { applyPhysics, handlePlatformCollisions, handleScreenWrap } from './physics.js';
import {
  createWorld,
  updatePlatforms,
  fillGameplayPlatforms,
  SCREEN_HEIGHT
} from './world.js';
import { render } from './render.js';
import { createStartingBots, findCompanionPlatform } from './bots.js';
import { sound, soundManager } from './audio.js';
import {
  createLavaState,
  updateLava,
  createPowerupState,
  spawnPowerupsForPlatforms,
  updatePowerups,
  updateBotCompanion,
} from './mechanics.js';
import {
  CAMERA_SIGHT_RATIO,
  JUMP_VELOCITY,
  POWERUP_SPAWN_CHANCE,
  POWERUP_ROCKET_CHANCE,
  POWERUP_TYPES,
} from './index.js';
import { preloadSprites } from './sprites.js';
import { INTRO_CAMERA_DURATION_MS, sampleIntroCameraMotion } from './intro-camera-motion.js';
import { BOT_CUT_IN_DURATION_MS } from './bot-entrance.js';

// =============================================================================
// CÁC HÀM TOÁN HỌC & HẰNG SỐ CẤU HÌNH THỜI GIAN CHUYỂN CẢNH
// =============================================================================

/**
 * Hàm nội suy gia tốc Ease-In-Out bậc 3 (Cubic Easing).
 * Giúp chuyển động bắt đầu chậm, tăng tốc nhanh ở giữa, và hãm phanh êm dịu khi tới đích.
 * @param {number} t - Tiến độ chuẩn hóa từ 0.0 đến 1.0
 * @returns {number} Giá trị nội suy tương ứng từ 0.0 đến 1.0
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Tọa độ thế giới của Camera trên đỉnh bầu trời khi ở màn hình tiêu đề (Y = -2400px)
const Y_INTRO = -2400;

// Đường cong Custom Bezier theo motion spec, phát chậm trong 2,4 giây.
const SLIDE_DURATION_MS = INTRO_CAMERA_DURATION_MS;
const MENU_DELAY_MS = 500;

// Thời gian bệ xuất phát đầu tiên phóng to dần hiện lên (500ms)
const START_PLATFORM_DURATION_MS = 500;

// Thời gian nhân vật nhảy vòng cung Parabol từ ngoài màn hình vào bệ xuất phát (900ms)
const PLAYER_ENTRANCE_DURATION_MS = 900;

// Thời gian các bệ đỡ xung quanh lần lượt hiện ngẫu hứng như nét vẽ chì (1800ms)
const PLATFORM_REVEAL_DURATION_MS = 1800;

// Thời gian từng Bot nhảy vòng cung từ 2 bên mép vào màn chơi (900ms)
const BOT_ENTRANCE_DURATION_MS = 900;

// Các mốc thời gian (mili-giây tính từ khi leo) mà lần lượt 4 Bot sẽ tham gia cuộc đua
const BOT_JOIN_TIMES_MS = [8000, 16000, 24000, 32000];

// Thời gian nhún nhảy nhẹ khởi động (Warmup Hop) trước khi phóng lên (550ms)
const RESTART_WARMUP_MS = 550;

// Thời gian camera trượt ngược từ mặt đất bay lên lại bầu trời (2400ms)
const RETURN_DURATION_MS = 2400;
const LAVA_EXIT_DURATION_MS = 650;
// Leave room for the warning strip and embers above the lava surface.
const LAVA_EXIT_CLEARANCE = 180;

// Thời gian hiệu ứng rèm gạt Wipe quét qua toàn màn hình khi bấm Chơi Lại (900ms)
const WIPE_DURATION_MS = 900;

// Vận tốc nảy nhẹ trong nhịp nhún chờ (khởi động không nhảy quá cao: -340 px/s)
const WARMUP_HOP_VY = -340;

// Tọa độ thế giới neo giữ tiêu đề "DOODLE JUMP" vẽ trên Canvas (ở độ cao -2140px)
const TITLE_WORLD_Y = Y_INTRO + 260;

/**
 * Xáo trộn ngẫu nhiên thứ bậc xuất hiện của các bệ đỡ trên màn hình (Fisher-Yates Shuffle).
 * Giúp các bệ xuất hiện rải rác bất quy tắc, tạo cảm giác người vẽ đang phác thảo từng nét bút.
 * @param {Array} platforms - Mảng danh sách bệ đỡ của thế giới game
 * @returns {Array<number>} Mảng chỉ số thứ tự xuất hiện của từng bệ
 */
function shuffledRevealRanks(platforms) {
  // Chỉ lọc các bệ nằm trong vùng nhìn thấy được của khung nhìn ban đầu (trừ bệ xuất phát index 0)
  const indices = platforms.map((platform, index) => ({ platform, index }))
    .filter(({ platform, index }) => index > 0 && platform.y > -40 && platform.y < SCREEN_HEIGHT + 40)
    .map(({ index }) => index);

  // Xáo trộn mảng index ngẫu nhiên
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }

  // Gán thứ hạng xuất hiện tương ứng cho từng bệ
  const ranks = Array(platforms.length).fill(0);
  indices.forEach((platformIndex, rank) => { ranks[platformIndex] = rank; });
  return ranks;
}

// =============================================================================
// HÀM KHỞI TẠO GAME CHÍNH: createGame()
// =============================================================================
/**
 * Tạo và khởi động Engine game độc lập trên thẻ HTML5 Canvas.
 * @param {HTMLCanvasElement} canvas - Phần tử canvas để vẽ game 2D
 * @param {Object} config - Cấu hình tham số từ server (finish_height, max_duration_ms, rules...)
 * @param {Object} options - Các callback vòng đời (onFrame, onStats, onGameOver, onPhaseChange...)
 */
export function createGame(canvas, config, {
  onFrame,
  onStats,
  onGameOver,
  onPhaseChange,
  isPaused,
  enableIntro = false,
  initialPhase,
  renderInitial = false,
} = {}) {
  // Lấy ngữ cảnh vẽ 2D của Canvas
  const context = canvas.getContext('2d');

  // Nạp trước các hình ảnh sprite (nhân vật giáo viên, bot, các loại bệ đỡ)
  preloadSprites();

  // Kiểm tra cấu hình hệ điều hành của người dùng: có bật chế độ giảm chuyển động không?
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Kiểm tra thiết bị có phải màn hình cảm ứng không có chuột hover không
  const touchMode = typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

  // Xác định trạng thái xuất phát ban đầu:
  // Nếu có bật intro cinematic -> bắt đầu từ 'intro_title' (bầu trời).
  // Nếu không bật intro -> bắt đầu ngay ở 'running'.
  let phase = initialPhase ?? (enableIntro ? 'intro_title' : 'running');

  // Khởi tạo thế giới trò chơi (World):
  // Khi ở màn hình tiêu đề 'intro_title', thế giới là tờ giấy trắng tinh (platforms = []),
  // camera đặt ở vị trí cao Y_INTRO (-2400px). Chỉ khi bắt đầu trượt xuống mới sinh bệ.
  const world = enableIntro && phase === 'intro_title'
    ? { platforms: [], cameraY: Y_INTRO }
    : createWorld({ forIntro: enableIntro });
  if (enableIntro && phase === 'intro_sliding') world.cameraY = Y_INTRO;
  world.lava = createLavaState();
  spawnPowerupsForPlatforms(world.platforms);

  // Khởi tạo thực thể người chơi (Player) tại vị trí bệ sàn (x: 300, y: 388)
  const player = createPlayer();
  player.powerup = createPowerupState();

  // Danh sách các Bot: nếu có intro thì chưa xuất hiện bot ngay (bots = []),
  // ngược lại nếu vào chơi ngay thì khởi tạo sẵn 4 Bot
  const bots = enableIntro ? [] : createStartingBots(388);

  // Biến trạng thái toàn cục của Engine (State Container)
  const state = {
    player,
    bots,
    world,
    config,
    nickname: config?.nickname || 'Bạn',
    phase,
    ui: {
      botEntrances: [],
      botEntranceClockMs: 0,
      reduceMotion,
      isStartButtonHovered: false,   // Chuột có đang rê vào nút START trên Canvas không
      wipeProgress: 0,               // Tiến độ hiệu ứng gạt màn hình (0.0 -> 1.0)
      platformReveal: 0,             // Tiến độ hiện bệ xuất phát (0.0 -> 1.0)
      revealRanks: [],               // Thứ tự ngẫu nhiên xuất hiện của các bệ đỡ
      revealProgress: 0,             // Tiến độ xuất hiện các bệ trên đường đua (0.0 -> 1.0)
      motionBlurPx: 0,               // Độ nhòe vệt chuyển động khi camera lao dốc (px)
      playerEntranceProgress: 0,     // Tiến độ nhân vật nhảy từ cánh gà vào bệ (0.0 -> 1.0)
      titleWorldY: TITLE_WORLD_Y,    // Tọa độ Y cố định của tiêu đề trên Canvas
      touchMode,                     // Trạng thái thiết bị cảm ứng
    }
  };

  // Khởi tạo bộ lắng nghe phím bấm (A/D, Mũi tên trái/phải)
  const input = createInput();

  let previousTime = null;           // Mốc thời gian của frame trước (để tính dt)
  let frameCount = 0;                // Tổng số khung hình đã vẽ
  let stopped = false;               // Cờ báo hiệu game đã bị hủy (destroy)
  let frameId;                       // ID của requestAnimationFrame
  let hiddenAt = typeof document !== 'undefined' && document.hidden ? performance.now() : null;
  let hiddenDurationMs = 0;
  let maxHeight = 0;                 // Kỷ lục độ cao tối đa leo được trong ván (m)
  let isGameOver = false;            // Cờ chống gọi onGameOver lặp lại nhiều lần
  let elapsedMs = 0;                 // Tổng thời gian leo thực tế (mili-giây)
  let lastStatsAt = -Infinity;       // Mốc thời gian gửi cập nhật thống kê gần nhất

  // Các biến theo dõi thời điểm bắt đầu của từng hiệu ứng chuyển cảnh
  let slideStartTime = null;         // Mốc thời gian bắt đầu trượt camera từ trên trời
  let wipeStartTime = null;          // Mốc thời gian bắt đầu hiệu ứng rèm gạt Wipe
  let wipeResetTriggered = false;    // Đã reset dữ liệu game ở giữa nhịp rèm đóng chưa
  let settleStartTime = null;        // Mốc thời gian dừng lại sau khi trượt tới đất
  let entranceStartTime = null;      // Mốc thời gian nhân vật bắt đầu nhảy vào sân
  let revealStartTime = null;        // Mốc thời gian bắt đầu hiện các bệ đỡ xung quanh
  let nextBotIndex = enableIntro ? 0 : BOT_JOIN_TIMES_MS.length; // Chỉ số của Bot tiếp theo sẽ vào sân (0..3)
  let warmupStartTime = null;        // Mốc thời gian bắt đầu nhún nhảy nhẹ khởi động
  let returnStartTime = null;        // Mốc thời gian bắt đầu trượt ngược lên trời
  let returnLavaFromScreenY = null;
  let returnFromY = 0;               // Tọa độ camera lúc bấm quay về tiêu đề

  // ===========================================================================
  // CÁC HÀM TIỆN ÍCH NỘI BỘ (INTERNAL HELPERS)
  // ===========================================================================

  /**
   * Phát đi thông số độ cao, thời gian và bảng xếp hạng thời gian thực (giới hạn tối đa 10 lần/giây)
   */
  function publishStats(time) {
    if (time - lastStatsAt < 100) return; // Throttling: tối thiểu cách nhau 100ms
    lastStatsAt = time;

    // Tính độ cao hiện tại: lấy điểm gốc xuất phát (y = 388) trừ đi tọa độ hiện tại
    const currentHeight = Math.max(0, Math.round(388 - state.player.y));

    // Tính khoảng cách dung nham còn cách người chơi bao nhiêu mét
    const isGameplayPhase = ['running', 'paused', 'finished', 'warmup_hop'].includes(phase);
    const lavaDistance = (state.world?.lava && isGameplayPhase)
      ? Math.max(0, Math.round(state.world.lava.y - (state.player.y + state.player.height)))
      : null;

    // Gửi dữ liệu ra React Component (HUD)
    onStats?.({
      currentHeight,
      maxHeight,
      elapsedMs: Math.round(elapsedMs),
      placement: 1,
      ranking: [],
      player: state.player,
      bots: state.bots,
      lavaDistance,
    });
  }

  /**
   * Kết thúc ván chơi (chạm đích, rơi vực hoặc hết giờ)
   * @param {'goal'|'fall'|'timeout'} reason - Nguyên nhân kết thúc
   * @param {number} time - Mốc thời gian kết thúc
   */
  function endRun(reason, time) {
    if (isGameOver) return;
    isGameOver = true;
    soundManager.stopBGM();

    const isEndless = Boolean(config?.isEndless || config?.finish_height == null);
    const finishHeight = config?.finish_height ?? 3000;
    const outcome = (!isEndless && (reason === 'goal' || maxHeight >= finishHeight)) ? 'finished' : 'dnf';
    if (!isEndless && typeof config?.finish_height === 'number') {
      maxHeight = Math.min(config.finish_height, maxHeight);
    }
    publishStats(time);

    setPhase('finished');

    // Phát âm thanh chiến thắng khi về đích hoặc âm thanh rơi chết
    if (outcome === 'finished') sound.playLaunch();
    else sound.playGameOver();

    const elapsed = Math.round(elapsedMs);
    const validElapsed = isEndless
      ? Math.max(1, elapsed)
      : Math.max(1, Math.min(config?.max_duration_ms ?? 180000, elapsed));

    // Báo kết quả cuối cùng cho React Page lưu vào Backend SQLite
    onGameOver?.({
      finalHeight: maxHeight,
      finalMaxHeight: maxHeight,
      elapsedMs: validElapsed,
      placement: 1, // Tương thích API lưu lượt solo, các thầy không thi đua.
      outcome,
      reason,
      ranking: []
    });
  }

  /**
   * Đổi trạng thái ván đấu (Phase State Machine) và thông báo cho listener bên ngoài
   * @param {string} newPhase - Trạng thái mới
   */
  function setPhase(newPhase) {
    if (!['running', 'paused'].includes(newPhase)) state.ui.botEntrances = [];
    if (newPhase === 'warmup_hop' && phase !== 'warmup_hop') warmupStartTime = null;
    phase = newPhase;
    state.phase = newPhase;
    onPhaseChange?.(newPhase);
  }

  // ===========================================================================
  // CÁC HÀM XỬ LÝ CHUYỂN CẢNH (TRANSITION TRIGGERS)
  // ===========================================================================

  function clearReturnState() {
    returnStartTime = null;
    returnLavaFromScreenY = null;
    delete state.ui.returnTitleWorldY;
    delete state.ui.returnDrawingTime;
  }

  /**
   * [TRỌNG TÂM] Kích hoạt Camera trượt từ bầu trời xuống mặt đất (Slide Down)
   * Được gọi khi người chơi bấm nút "START" hoặc ấn Space/Enter ở màn hình đầu tiên.
   */


  function startSlideDown() {
    if (phase !== 'intro_title') return;
    clearReturnState();

    // 1. Tạo danh sách bệ đỡ cho cả chặng đường và rải bệ mây dọc bầu trời
    state.world = createWorld({ forIntro: true });
    fillGameplayPlatforms(state.world);
    state.world.lava = createLavaState();
    spawnPowerupsForPlatforms(state.world.platforms);

    // 2. Đặt camera ở trên cùng (Y = -2400)
    state.world.cameraY = Y_INTRO;

    // 3. Khởi tạo trạng thái ẩn toàn bộ bệ để chờ camera hạ xuống mới hiện dần
    state.ui.platformReveal = 0;
    state.ui.revealProgress = 0;
    state.ui.revealRanks = shuffledRevealRanks(state.world.platforms);
    state.ui.motionBlurPx = 0;
    state.bots = [];
    nextBotIndex = 0;

    // 4. Chuyển sang phase 'intro_sliding' để game loop bắt đầu trượt camera
    setPhase('intro_sliding');
    slideStartTime = null;

    // 5. Phát âm thanh gió rít Whoosh tăng cảm giác lao dốc tốc độ cao
    sound.playWhoosh(reduceMotion ? 0.1 : 1.8);
  }

  /**
   * Phóng nhân vật và các bot bắt đầu leo cao (khi bấm phím di chuyển ở phase chờ)
   */
  function startLaunch() {
    if (phase !== 'intro_wait_input' && phase !== 'warmup_hop') return;
    setPhase('running');
    elapsedMs = 0;
    lastStatsAt = -Infinity;
    nextBotIndex = 0;
    sound.playLaunch();
    soundManager.playSFX('jump');
    soundManager.playBGM();

    // Cung cấp vận tốc nhảy ban đầu cho người chơi để bắt đầu chặng đua
    state.player.vy = JUMP_VELOCITY;
    state.world.lava = createLavaState();
  }

  /**
   * Bắt đầu hoạt cảnh nhân vật nhảy từ cánh gà vào đậu trên bệ xuất phát
   */
  function beginPlayerEntrance() {
    if (phase !== 'ready') return;
    entranceStartTime = null;
    settleStartTime = null;
    state.ui.playerEntranceProgress = 0;
    setPhase('intro_platform');
  }

  /**
   * Đưa 1 Bot đối thủ mới xuất hiện nhảy vào màn chơi khi tới mốc thời gian quy định
   */
  function joinNextBot() {
    const bot = createStartingBots(388)[nextBotIndex];
    if (!bot) return;

    // Tìm một bệ đỡ an toàn không bị gãy gần người chơi để bot đáp xuống
    const safePlatforms = state.world.platforms.filter(platform => !platform.broken && ['standard', 'bouncy'].includes(platform.type)
      && platform.y - state.world.cameraY > 145 && platform.y - state.world.cameraY < canvas.height - 65);
    let platform = findCompanionPlatform(bot, safePlatforms, state.player, state.bots, state.world.lava?.y);

    // Nếu không có bệ an toàn gần đó, tạo tạm 1 bệ đỡ
    if (!platform) {
      platform = {
        x: nextBotIndex % 2 === 0 ? 80 : canvas.width - 200,
        y: Math.max(state.world.cameraY + 160, Math.min(state.player.y + 65, state.world.cameraY + canvas.height - 80)),
        width: 120, height: 14, type: 'standard'
      };
      state.world.platforms.push(platform);
    }

    // Thiết lập quỹ đạo bay từ ngoài mép màn hình vào bệ cho Bot
    const fromLeft = nextBotIndex % 2 === 0;
    bot.x = fromLeft ? -bot.width - 20 : canvas.width + 20;
    bot.y = platform.y - bot.height;
    bot.vy = 0;
    bot.isEntering = true;
    bot.entranceFromX = bot.x;
    bot.entranceToX = platform.x + (platform.width - bot.width) / 2;
    bot.entranceY = bot.y;
    bot.entranceStartedAt = elapsedMs;
    bot.entrancePlatform = platform;
    bot.lastPlatformY = platform.y;
    state.bots.push(bot);
    state.ui.botEntrances = [...state.ui.botEntrances, {
      botId: bot.id, type: bot.type, name: bot.name,
      side: fromLeft ? 'left' : 'right', startMs: elapsedMs,
      impactWorldPosition: null, impactPlayed: false,
    }].slice(-4);
    nextBotIndex += 1;
    if (!soundManager.isMuted) sound.playBotEntrance(soundManager.config?.sfx?.botEntrance?.volume ?? 0.065);
  }

  /**
   * Kích hoạt hiệu ứng rèm gạt Wipe Transition khi người chơi nhấn "Chơi Lại"
   */
  function triggerRestartWipe() {
    if (phase === 'wipe_reset') return;
    clearReturnState();
    setPhase('wipe_reset');
    wipeStartTime = null;
    wipeResetTriggered = false;
    sound.playWipe();
  }

  /**
   * Kích hoạt chuyển động camera trượt ngược từ mặt đất bay lên lại màn hình tiêu đề
   */
  function returnToTitleMenu() {
    if (phase === 'returning_title' || phase === 'intro_title') return;
    soundManager.stopBGM();
    returnFromY = state.world.cameraY;
    const lavaExitY = canvas.height + LAVA_EXIT_CLEARANCE;
    returnLavaFromScreenY = state.world.lava
      ? Math.max(-LAVA_EXIT_CLEARANCE, Math.min(lavaExitY, state.world.lava.y - returnFromY))
      : null;
    state.player.powerup = createPowerupState();
    // Anchor the title above this frozen scene so it enters with the returning camera.
    state.ui.returnTitleWorldY = returnFromY + (state.ui.titleWorldY ?? TITLE_WORLD_Y);
    // Keep the visible scene frozen, discard scenery that would enter during the return.
    state.world.platforms = state.world.platforms.filter(p => !p.broken && p.y + p.height >= returnFromY - 12 && p.y <= returnFromY + SCREEN_HEIGHT + 12);
    state.bots = state.bots.filter(bot => bot.y + bot.height >= returnFromY - 30 && bot.y <= returnFromY + SCREEN_HEIGHT + 30);
    state.ui.returnDrawingTime = performance.now() / 1000;
    returnStartTime = null;
    setPhase('returning_title');
    sound.playWhoosh(reduceMotion ? 0.1 : 1);
  }

  // ===========================================================================
  // XỬ LÝ SỰ KIỆN CHUỘT / CẢM ỨNG & BÀN PHÍM TRÊN CANVAS
  // ===========================================================================

  /**
   * Bắt sự kiện Click / Chạm màn hình trên Canvas:
   * Kiểm tra xem người dùng có click trúng nút "START" ở màn hình tiêu đề hay không.
   */
  function handlePointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Chuyển đổi tọa độ pixel trên màn hình CSS sang tọa độ chuẩn của Canvas 2D (scaleX, scaleY)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Nếu đang ở màn hình tiêu đề mở đầu 'intro_title'
    if (phase === 'intro_title') {
      const titleWorldY = TITLE_WORLD_Y;
      const titleScreenY = titleWorldY - state.world.cameraY;

      // Khung chữ nhật bao quanh nút "START" vẽ trên Canvas (mở rộng đệm 15px để bấm nhạy hơn)
      const btnBounds = {
        x: canvas.width / 2 - 110,
        y: titleScreenY + 70,
        width: 220,
        height: 50,
      };

      // Nếu tọa độ click nằm trong nút bấm -> Bắt đầu trượt camera xuống!
      if (
        clickX >= btnBounds.x - 15 && clickX <= btnBounds.x + btnBounds.width + 15 &&
        clickY >= btnBounds.y - 15 && clickY <= btnBounds.y + btnBounds.height + 15
      ) {
        startSlideDown();
      }
    } else if (phase === 'intro_wait_input') {
      // Khi đang đứng nhún chờ, click chuột vào canvas cũng cho phép phóng nhân vật bắt đầu leo
      startLaunch();
    }
  }

  /**
   * Bắt sự kiện rê chuột (Hover) trên Canvas để đổi con trỏ chuột sang hình bàn tay (pointer)
   */
  function handlePointerMove(e) {
    if (phase === 'intro_title') {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const titleWorldY = TITLE_WORLD_Y;
      const titleScreenY = titleWorldY - state.world.cameraY;
      const btnBounds = {
        x: canvas.width / 2 - 110,
        y: titleScreenY + 70,
        width: 220,
        height: 50,
      };

      const isHovered = (
        mouseX >= btnBounds.x && mouseX <= btnBounds.x + btnBounds.width &&
        mouseY >= btnBounds.y && mouseY <= btnBounds.y + btnBounds.height
      );

      // Cập nhật trạng thái hover cho render.js vẽ viền sáng nút và đổi cursor
      state.ui.isStartButtonHovered = isHovered;
      canvas.style.cursor = isHovered ? 'pointer' : 'default';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  /**
   * Bắt sự kiện phím bấm nhanh:
   * - Space / Enter ở màn hình đầu: Cho phép trượt camera ngay không cần click chuột.
   * - Phím mũi tên / A / D ở màn hình nhún chờ: Phóng nhân vật bắt đầu leo.
   */
  function handleKeyDown(e) {
    if (phase === 'intro_title') {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        startSlideDown();
      }
    } else if (phase === 'intro_wait_input' && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      startLaunch();
    }
  }

  // Đăng ký các sự kiện lắng nghe chuột và bàn phím
  if (canvas?.addEventListener) {
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', handleKeyDown);
  }

  function handleVisibilityChange() {
    if (stopped) return;
    if (document.hidden) {
      if (hiddenAt !== null) return;
      hiddenAt = performance.now();
      cancelAnimationFrame(frameId);
      input.reset();
      previousTime = null;
    } else if (hiddenAt !== null) {
      // RAF timestamps and all intro/cut-in timers share this foreground clock.
      // Excluding hidden time prevents a return to the tab from fast-forwarding
      // the intro or spawning every remaining bot in the first frame.
      hiddenDurationMs += Math.max(0, performance.now() - hiddenAt);
      hiddenAt = null;
      previousTime = null;
      frameId = requestAnimationFrame(frame);
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Nếu có tùy chọn renderInitial -> vẽ ngay frame 0 đồng bộ để chống chớp trắng màn hình
  if (renderInitial) {
    render(context, state);
  }

  // ===========================================================================
  // VÒNG LẶP TRÒ CHƠI CHÍNH (MAIN GAME LOOP - 60 FPS)
  // ===========================================================================
  function frame(time) {
    if (stopped || hiddenAt !== null) return;
    time -= hiddenDurationMs;

    // Nếu game đang ở trạng thái Tạm Dừng (Paused), bỏ qua cập nhật vật lý nhưng vẫn giữ frame
    if (isPaused?.() || (phase === 'paused')) {
      previousTime = time;
      if (!stopped) frameId = requestAnimationFrame(frame);
      return;
    }

    // Tính delta-time (dt) kẹp từ 0 đến 1/30 giây để chống hiện tượng nhảy cóc/xuyên tường
    const rawDt = previousTime === null ? 0 : Math.max((time - previousTime) / 1000, 0);
    const dt = Math.min(rawDt, 1 / 30);
    previousTime = time;

    // -------------------------------------------------------------------------
    // STAGE 1: INTRO TITLE (MÀN HÌNH MỞ ĐẦU TRÊN BẦU TRỜI)
    // -------------------------------------------------------------------------
    if (phase === 'intro_title') {
      // Giữ camera cố định ở trên cao, nhân vật đứng yên
      state.world.cameraY = Y_INTRO;
      state.player.vx = 0;
      state.player.vy = 0;
    }

    // -------------------------------------------------------------------------
    // STAGE 2: CAMERA SLIDE DOWN (CAMERA TRƯỢT LAO DỐC TỪ TRỜI XUỐNG ĐẤT)
    // -------------------------------------------------------------------------
    else if (phase === 'intro_sliding') {
      if (slideStartTime === null) slideStartTime = time;
      const elapsed = time - slideStartTime;

      // Tiến độ thời gian; giải tọa độ thời gian Bézier trước khi lấy vị trí.
      const progress = Math.min(Math.max(elapsed / (reduceMotion ? 350 : SLIDE_DURATION_MS), 0), 1);
      const motion = sampleIntroCameraMotion(progress);

      // Cập nhật vị trí Camera di chuyển từ Y_INTRO (-2400) về 0 (Mặt đất)
      state.world.cameraY = Y_INTRO + (0 - Y_INTRO) * motion.value;

      // Tính toán độ nhòe chuyển động (Motion Blur) dựa trên vận tốc rơi camera
      // Đạo hàm của chính đường vị trí; tối đa 9px, không dùng easing độc lập.
      state.ui.motionBlurPx = reduceMotion ? 0 : Math.min(9, Math.abs(motion.velocity) * 1.5);

      // Khi hoàn tất 100% quãng đường trượt:
      if (progress >= 1) {
        state.world.cameraY = 0;        // Cố định camera tại mặt đất
        state.ui.motionBlurPx = 0;       // Tắt hoàn toàn motion blur
        settleStartTime = time;
        setPhase('intro_menu_delay');
      }
    }

    else if (phase === 'intro_menu_delay') {
      state.world.cameraY = 0;
      if (time - settleStartTime >= MENU_DELAY_MS) setPhase('ready');
    }

    // -------------------------------------------------------------------------
    // STAGE 3.1: INTRO PLATFORM (BỆ XUẤT PHÁT ĐẦU TIÊN HIỆN RA)
    // -------------------------------------------------------------------------
    else if (phase === 'intro_platform') {
      state.world.cameraY = 0;
      if (settleStartTime === null) settleStartTime = time;
      // Bệ phóng to dần từ 85% lên 100% trong 500ms
      state.ui.platformReveal = Math.min(1, (time - settleStartTime) / (reduceMotion ? 100 : START_PLATFORM_DURATION_MS));
      if (state.ui.platformReveal >= 1) setPhase('intro_player');
    }

    // -------------------------------------------------------------------------
    // STAGE 3.2: INTRO PLAYER (NHÂN VẬT NHẢY TỪ NGOÀI VÀO BỆ)
    // -------------------------------------------------------------------------
    else if (phase === 'intro_player') {
      if (entranceStartTime === null) entranceStartTime = time;
      const progress = Math.min(1, (time - entranceStartTime) / (reduceMotion ? 150 : PLAYER_ENTRANCE_DURATION_MS));
      state.ui.playerEntranceProgress = progress;

      // Khi nhân vật đã đáp ngay ngắn lên giữa bệ (x: 300, y: 388)
      if (progress >= 1) {
        state.player.x = 300;
        state.player.y = 388;
        revealStartTime = time;
        setPhase('intro_reveal'); // Chuyển sang giai đoạn hiện các bệ xung quanh
      }
    }

    // -------------------------------------------------------------------------
    // STAGE 3.3: INTRO REVEAL (CÁC BỆ KHÁC LẦN LƯỢT XUẤT HIỆN)
    // -------------------------------------------------------------------------
    else if (phase === 'intro_reveal') {
      state.ui.revealProgress = Math.min(1, (time - revealStartTime) / (reduceMotion ? 150 : PLATFORM_REVEAL_DURATION_MS));
      if (state.ui.revealProgress >= 1) setPhase('intro_wait_input'); // Chuyển sang nhún chờ bấm phím
    }

    // -------------------------------------------------------------------------
    // STAGE 3.4: INTRO WAIT INPUT (ĐỨNG TRÊN BỆ CHỜ NGƯỜI CHƠI BẤM PHÍM BẮT ĐẦU)
    // -------------------------------------------------------------------------
    else if (phase === 'intro_wait_input') {
      state.world.cameraY = 0;
    }

    // -------------------------------------------------------------------------
    // STAGE 3.5: RETURNING TITLE (CAMERA TRƯỢT NGƯỢC LÊN LẠI BẦU TRỜI)
    // -------------------------------------------------------------------------
    else if (phase === 'returning_title') {
      if (returnStartTime === null) returnStartTime = time;
      const progress = Math.min((time - returnStartTime) / (reduceMotion ? 100 : RETURN_DURATION_MS), 1);
      // Nội suy tọa độ camera từ vị trí hiện tại về Y_INTRO (-2400)
      state.world.cameraY = returnFromY + Y_INTRO * easeInOutCubic(progress);

      // Lava exits in screen space independently of the returning camera.
      // Its old world coordinate must never survive the final camera reset.
      if (state.world.lava && returnLavaFromScreenY !== null) {
        const lavaProgress = Math.min((time - returnStartTime) / (reduceMotion ? 100 : LAVA_EXIT_DURATION_MS), 1);
        const lavaExitY = canvas.height + LAVA_EXIT_CLEARANCE;
        state.world.lava.y = state.world.cameraY + returnLavaFromScreenY
          + (lavaExitY - returnLavaFromScreenY) * easeInOutCubic(lavaProgress);
        if (lavaProgress >= 1) delete state.world.lava;
      }

      // Khi đã bay lên tới đỉnh trời: dọn dẹp sạch tài nguyên ván cũ
      if (progress >= 1) {
        delete state.world.lava;
        clearReturnState();
        state.world.cameraY = Y_INTRO;
        state.world.platforms = [];
        state.ui.platformReveal = 0;
        state.ui.revealProgress = 0;
        state.ui.revealRanks = [];
        state.ui.playerEntranceProgress = 0;
        state.ui.botEntranceClockMs = 0;
        state.ui.wipeProgress = 0;
        state.ui.motionBlurPx = 0;
        state.player.x = 300;
        state.player.y = 388;
        state.player.vx = 0;
        state.player.vy = 0;
        state.bots = [];
        nextBotIndex = 0;
        maxHeight = 0;
        elapsedMs = 0;
        isGameOver = false;
        setPhase('intro_title'); // Trở lại màn hình tiêu đề gốc
      }
    }

    // -------------------------------------------------------------------------
    // GIAI ĐOẠN CHỌN PROFILE & KHỞI ĐỘNG (READY & WARMUP HOP)
    // -------------------------------------------------------------------------
    else if (phase === 'ready') {
      state.world.cameraY = 0; // Giữ yên camera trên mặt đất để người chơi chọn tên/skin
    }

    else if (phase === 'warmup_hop') {
      // Nhún nhảy nhẹ tại chỗ (Hop) trước khi thực sự phóng lên
      if (warmupStartTime === null) warmupStartTime = time;
      state.world.cameraY = 0;

      // Người chơi nảy nhẹ
      state.player.y += state.player.vy * dt;
      state.player.vy += 1200 * dt;
      state.player.vx = 0;
      if (state.player.vy >= 0 && state.player.y >= 388) {
        state.player.y = 388;
        state.player.vy = WARMUP_HOP_VY;
        sound.playHop(440);
      }

      // Các bot đối thủ cũng nhún nhảy theo nhịp trên bệ của mình
      state.bots.forEach(bot => {
        bot.y += (bot.vy || 0) * dt;
        bot.vy = (bot.vy || 0) + 1200 * dt;
        bot.vx = 0;
        if (bot.vy >= 0 && bot.y >= 388) {
          bot.y = 388;
          bot.vy = WARMUP_HOP_VY;
        }
      });

      // Hết thời gian khởi động -> phóng lên bắt đầu ván chơi
      if (time - warmupStartTime >= (reduceMotion ? 100 : RESTART_WARMUP_MS)) startLaunch();
    }

    // -------------------------------------------------------------------------
    // STAGE 4: ACTIVE 60 FPS GAMEPLAY (TRẬN ĐẤU ĐANG DIỄN RA)
    // -------------------------------------------------------------------------
    else if (phase === 'running') {
      elapsedMs += rawDt * 1000;
      state.ui.botEntranceClockMs = elapsedMs;

      // Kiểm tra xem đã đến lúc thả thêm Bot đối thủ vào cuộc đua chưa
      while (nextBotIndex < BOT_JOIN_TIMES_MS.length && elapsedMs >= BOT_JOIN_TIMES_MS[nextBotIndex]) joinNextBot();

      // 1. Tính toán hướng di chuyển ngang của người chơi (A/D hoặc phím mũi tên)
      const direction = Number(input.state.right) - Number(input.state.left);
      updateHorizontal(state.player, direction, dt);
      const prevPlayerX = state.player.x;
      handleScreenWrap(state.player, canvas.width);

      // 3. Cập nhật các bệ đỡ di động & sinh bệ vô hạn (không xóa bệ khi trôi khỏi màn hình)
      const prevPlatformCount = state.world.platforms.length;
      updatePlatforms(state.world, dt, { cullOffscreen: false });
      if (state.world.platforms.length > prevPlatformCount) {
        for (let i = prevPlatformCount; i < state.world.platforms.length; i++) {
          const p = state.world.platforms[i];
          if (p.type !== 'floor' && p.type !== 'finish' && p.type !== 'fragile') {
            if (Math.random() < POWERUP_SPAWN_CHANCE) {
              p.powerup = Math.random() < POWERUP_ROCKET_CHANCE ? POWERUP_TYPES.ROCKET : POWERUP_TYPES.SHIELD;
            }
          }
        }
      }

      // 4. Áp dụng hiệu lực vật phẩm bổ trợ (Powerups)
      updatePowerups({ player: state.player, platforms: state.world.platforms, dt, soundManager });

      // 5. Áp dụng trọng lực cho người chơi (Bỏ qua trọng lực khi Rocket đang bay)
      if (state.player.powerup?.rocketTimer > 0) {
        state.player.y += state.player.vy * dt;
      } else {
        applyPhysics(state.player, dt);
      }

      // 6. Kiểm tra va chạm dẫm lên bệ đỡ (AABB collision - chỉ nảy khi rơi xuống)
      const landed = handlePlatformCollisions(state.player, state.world.platforms);
      if (landed) {
        soundManager.playSFX('jump');
      }

      // 7. Cập nhật trí tuệ nhân tạo (AI) và vật lý cho 4 Bot
      state.bots.forEach(bot => {
        // Nếu bot đang trong hoạt cảnh bay vào bệ
        if (bot.isEntering) {
          const progress = Math.min(1, (elapsedMs - bot.entranceStartedAt) / BOT_ENTRANCE_DURATION_MS);
          bot.x = bot.entranceFromX + (bot.entranceToX - bot.entranceFromX) * easeInOutCubic(progress);
          bot.y = bot.entranceY - Math.sin(Math.PI * progress) * 75;
          if (progress >= 1) {
            bot.isEntering = false;
            bot.y = bot.entranceY;
            bot.vy = JUMP_VELOCITY;
            const entry = state.ui.botEntrances.find(item => item.botId === bot.id);
            if (entry && !entry.impactPlayed) {
              entry.impactWorldPosition = { x: bot.x + bot.width / 2, y: bot.y + bot.height };
              entry.impactPlayed = true;
              soundManager.playSFX('botImpact');
            }
          }
          return;
        }

        updateBotCompanion(bot, state.world, state.player, dt, state.bots, canvas.height);
      });
      state.ui.botEntrances = state.ui.botEntrances.filter(entry => elapsedMs - entry.startMs < BOT_CUT_IN_DURATION_MS);

      // 8. Cập nhật Dung nham dâng (Rising Lava)
      updateLava({
        lava: state.world.lava,
        dt,
        world: state.world,
        player: state.player,
        bots: state.bots,
        soundManager,
        onGameOver: (reason) => endRun(reason, time),
      });

      // 7. Tính toán độ cao leo được (m) và cập nhật kỷ lục cao nhất
      const currentHeight = Math.max(0, Math.round(388 - state.player.y));
      if (currentHeight > maxHeight) {
        maxHeight = currentHeight;
      }
      publishStats(time);

      // 8. Camera cuộn theo độ cao của người chơi (Camera Follow 2D)
      // Camera đi theo nhân vật cả khi leo lên lẫn khi rơi xuống (kéo màn xuống theo người chơi)
      const topSightRatio = config?.cameraRatio ?? CAMERA_SIGHT_RATIO ?? 0.60;
      const bottomSightRatio = 0.72; // Vùng đệm đáy: khi rơi xuống thì kéo camera hạ xuống theo nhân vật
      const targetMinCameraY = state.player.y - canvas.height * topSightRatio;
      const targetMaxCameraY = state.player.y - canvas.height * bottomSightRatio;

      if (state.world.cameraY > targetMinCameraY) {
        // Leo lên cao: camera kéo lên ngay lập tức để giữ góc nhìn thoáng phía trên
        state.world.cameraY = targetMinCameraY;
      } else if (state.world.cameraY < targetMaxCameraY) {
        // Rơi xuống dưới: kéo camera xuống theo nhân vật
        state.world.cameraY = targetMaxCameraY;
      }

      // 9. Kiểm tra các điều kiện kết thúc ván đấu:
      const isEndless = Boolean(config?.isEndless || config?.finish_height == null);
      if (!isEndless && typeof config?.finish_height === 'number' && maxHeight >= config.finish_height) {
        endRun('goal', time);
      }
      else if (!isEndless && typeof config?.max_duration_ms === 'number' && elapsedMs >= config.max_duration_ms) {
        endRun('timeout', time);
      }
      else if (!state.world?.lava && state.player.y - state.world.cameraY > canvas.height + state.player.height) {
        endRun('fall', time);
      }
    }

    // -------------------------------------------------------------------------
    // STAGE 5: WIPE RESTART TRANSITION (HIỆU ỨNG RÈM QUÉT KHI BẤM CHƠI LẠI)
    // -------------------------------------------------------------------------
    else if (phase === 'wipe_reset') {
      if (wipeStartTime === null) wipeStartTime = time;
      const wipeElapsed = time - wipeStartTime;
      const wipeDuration = reduceMotion ? 100 : WIPE_DURATION_MS;
      let progress = Math.min(Math.max(wipeElapsed / wipeDuration, 0), 1);

      // Khi rèm đóng kín hoàn toàn ở giữa nhịp (progress >= 0.5):
      // Âm thầm reset sạch dữ liệu thế giới game đằng sau bức rèm
      if (progress >= 0.5 && !wipeResetTriggered) {
        wipeResetTriggered = true;
        // A dropped frame may skip the covered interval. Always present one
        // fully closed page with the new world, then time the opening from it.
        progress = 0.5;
        wipeStartTime = time - wipeDuration * 0.5;
        state.world.cameraY = 0;
        state.world = createWorld({ soloStart: true });
        state.world.lava = createLavaState();
        spawnPowerupsForPlatforms(state.world.platforms);
        state.player.x = 300;
        state.player.y = 388;
        state.player.vx = 0;
        state.player.vy = WARMUP_HOP_VY;
        state.player.powerup = createPowerupState();
        state.bots = [];
        nextBotIndex = 0;
        maxHeight = 0;
        elapsedMs = 0;
        warmupStartTime = null;
        isGameOver = false;
        publishStats(time);
      }
      state.ui.wipeProgress = progress;

      // Khi rèm mở ra hoàn toàn -> chuyển sang nhún nhẹ khởi động
      if (progress >= 1) {
        state.ui.wipeProgress = 0;
        setPhase('warmup_hop');
      }
    }

    // =========================================================================
    // VẼ KHUNG HÌNH LÊN CANVAS (RENDER FRAME)
    // =========================================================================
    render(context, state);
    frameCount += 1;
    onFrame?.({ frameCount, dt });

    // Lên lịch vẽ tiếp khung hình tiếp theo nếu game chưa bị hủy
    if (!stopped) frameId = requestAnimationFrame(frame);
  }

  // Khởi động vòng lặp game loop
  if (hiddenAt === null) frameId = requestAnimationFrame(frame);

  // ===========================================================================
  // CÁC HÀM ĐIỀU KHIỂN CÔNG KHAI (PUBLIC API) TRẢ VỀ CHO REACT / CALLER
  // ===========================================================================
  return {
    /**
     * Hủy game và dọn dẹp sạch tài nguyên, event listener chống rò rỉ bộ nhớ
     */
    destroy() {
      if (stopped) return;
      stopped = true;
      state.ui.botEntrances = [];
      soundManager.stopBGM();
      input.destroy();
      cancelAnimationFrame(frameId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (canvas?.removeEventListener) {
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointermove', handlePointerMove);
      }
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('keydown', handleKeyDown);
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
    },

    /**
     * Điều khiển cảm ứng nút bấm trái/phải trên điện thoại
     */
    setDirection(dir, active) {
      if (input?.state) {
        input.state[dir] = active;
      }
      if (active && phase === 'intro_wait_input') startLaunch();
    },

    // Kích hoạt trượt camera xuống từ màn hình tiêu đề
    startFromTitle: startSlideDown,

    // Bắt đầu cho nhân vật nhảy vào bệ
    beginPlayerEntrance,

    // Bắt đầu phóng lên leo cao
    startLaunch,

    // Kích hoạt rèm gạt Wipe để chơi lại
    triggerRestartWipe,

    // Trượt ngược camera lên lại màn hình tiêu đề
    returnToTitleMenu,

    // Bật/tắt tạm dừng game
    togglePause() {
      if (phase === 'running') setPhase('paused');
      else if (phase === 'paused') setPhase('running');
    },

    // Ép đổi phase thủ công (dùng cho testing/debug)
    setPhase: (p) => setPhase(p),

    // Thay đổi trang phục (Skin) và màu sắc nhân vật
    setPlayerSkin(skinId) {
      const SKIN_COLORS = {
        doodle: '#e8ad48',
        red: '#ee6263',
        purple: '#a47bd3',
        blue: '#5d9fd7',
        gray: '#9ba1a7',
      };
      state.player.skinId = skinId;
      state.player.skinColor = SKIN_COLORS[skinId] || '#e8ad48';
    },

    // Cập nhật biệt danh người chơi
    setPlayerName(name) { state.nickname = name; },

    // Lấy trạng thái phase hiện tại
    getPhase: () => phase,

    // Lấy toàn bộ state nội bộ
    getState: () => state,

    // Chụp nhanh ảnh thống kê hiện tại
    getSnapshot: () => {
      const isGameplayPhase = ['running', 'paused', 'finished', 'warmup_hop'].includes(phase);
      return {
        height: Math.max(0, Math.round(388 - state.player.y)),
        maxHeight,
        elapsedMs: Math.round(elapsedMs),
        ranking: [],
        lavaDistance: (state.world?.lava && isGameplayPhase)
          ? Math.max(0, Math.round(state.world.lava.y - (state.player.y + state.player.height)))
          : null,
      };
    },
  };
}
