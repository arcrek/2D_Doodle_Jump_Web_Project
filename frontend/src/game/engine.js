import { createInput } from './input.js';
import { createPlayer, updateHorizontal } from './player.js';
import { applyPhysics, handlePlatformCollisions, handleScreenWrap } from './physics.js';
import {
  createWorld,
  updatePlatforms,
  spawnIntroPlatforms,
  fillGameplayPlatforms,
  clearIntroTitleZone,
  SCREEN_HEIGHT
} from './world.js';
import { render } from './render.js';
import { createStartingBots, updateBotAI, onBotBounce } from './bots.js';
import { sound } from './audio.js';
import { CAMERA_SIGHT_RATIO, JUMP_VELOCITY } from './index.js';
import { getRanking } from './ranking.js';
import { preloadSprites } from './sprites.js';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

const Y_INTRO = -2400;
const SLIDE_DURATION_MS = 6000;
const START_PLATFORM_DURATION_MS = 500;
const PLAYER_ENTRANCE_DURATION_MS = 1000;
const PLATFORM_REVEAL_DURATION_MS = 1800;
const BOT_ENTRANCE_DURATION_MS = 900;
const BOT_JOIN_TIMES_MS = [8000, 16000, 24000, 32000];
const RESTART_WARMUP_MS = 550;
const RETURN_DURATION_MS = 1000;
const WIPE_DURATION_MS = 650;
const WARMUP_HOP_VY = -340;
const TITLE_WORLD_Y = Y_INTRO + 260;

function shuffledRevealRanks(platforms) {
  const indices = platforms.map((platform, index) => ({ platform, index }))
    .filter(({ platform, index }) => index > 0 && platform.y > -40 && platform.y < SCREEN_HEIGHT + 40)
    .map(({ index }) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }
  const ranks = Array(platforms.length).fill(0);
  indices.forEach((platformIndex, rank) => { ranks[platformIndex] = rank; });
  return ranks;
}

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
  const context = canvas.getContext('2d');
  preloadSprites();
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const touchMode = typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

  // Determine starting phase
  let phase = initialPhase ?? (enableIntro ? 'intro_title' : 'running');

  // World initialization
  // The title is an empty stretch of paper. Build the platforms only when the
  // camera begins descending, so they enter the scene with the movement.
  const world = enableIntro && phase === 'intro_title'
    ? { platforms: [], cameraY: Y_INTRO }
    : createWorld({ forIntro: enableIntro });
  if (enableIntro && phase === 'intro_sliding') world.cameraY = Y_INTRO;

  const player = createPlayer();
  const bots = enableIntro ? [] : createStartingBots(388);

  const state = {
    player,
    bots,
    world,
    config,
    nickname: config?.nickname || 'Bạn',
    phase,
    ui: {
      isStartButtonHovered: false,
      wipeProgress: 0,
      platformReveal: 0,
      revealRanks: [],
      revealProgress: 0,
      motionBlurPx: 0,
      playerEntranceProgress: 0,
      titleWorldY: TITLE_WORLD_Y,
      touchMode,
    }
  };

  const input = createInput();
  let previousTime = null;
  let frameCount = 0;
  let stopped = false;
  let frameId;
  let maxHeight = 0;
  let isGameOver = false;
  let elapsedMs = 0;
  let lastStatsAt = -Infinity;

  // Transition state tracking
  let slideStartTime = null;
  let wipeStartTime = null;
  let wipeResetTriggered = false;
  let settleStartTime = null;
  let entranceStartTime = null;
  let revealStartTime = null;
  let nextBotIndex = 0;
  let warmupStartTime = null;
  let returnStartTime = null;
  let returnFromY = 0;

  function publishStats(time) {
    if (time - lastStatsAt < 100) return;
    lastStatsAt = time;
    const currentHeight = Math.max(0, Math.round(388 - state.player.y));
    const ranking = getRanking({ id: 'player', name: state.nickname, progress: maxHeight }, state.bots);
    onStats?.({ currentHeight, maxHeight, elapsedMs: Math.round(elapsedMs), placement: ranking.findIndex(item => item.id === 'player') + 1, ranking, player: state.player, bots: state.bots });
  }

  function endRun(reason, time) {
    if (isGameOver) return;
    isGameOver = true;
    const outcome = reason === 'goal' ? 'finished' : 'dnf';
    maxHeight = Math.min(config?.finish_height ?? 3000, maxHeight);
    publishStats(time);
    const ranking = getRanking({ id: 'player', name: state.nickname, progress: maxHeight }, state.bots);
    setPhase('finished');
    if (outcome === 'finished') sound.playLaunch();
    else sound.playGameOver();
    onGameOver?.({ finalHeight: maxHeight, finalMaxHeight: maxHeight, elapsedMs: Math.max(1, Math.min(config?.max_duration_ms ?? 180000, Math.round(elapsedMs))), placement: ranking.findIndex(item => item.id === 'player') + 1, outcome, reason, ranking });
  }

  function setPhase(newPhase) {
    if (newPhase === 'warmup_hop' && phase !== 'warmup_hop') warmupStartTime = null;
    phase = newPhase;
    state.phase = newPhase;
    onPhaseChange?.(newPhase);
  }

  function startSlideDown() {
    if (phase !== 'intro_title') return;
    state.world = createWorld({ forIntro: true });
    fillGameplayPlatforms(state.world);
    state.world.cameraY = Y_INTRO;
    state.ui.platformReveal = 0;
    state.ui.revealProgress = 0;
    state.ui.revealRanks = shuffledRevealRanks(state.world.platforms);
    state.ui.motionBlurPx = 0;
    state.bots = [];
    nextBotIndex = 0;
    setPhase('intro_sliding');
    slideStartTime = null;
    sound.playWhoosh(reduceMotion ? 0.1 : 1.8);
  }

  function startLaunch() {
    if (phase !== 'intro_wait_input' && phase !== 'warmup_hop') return;
    setPhase('running');
    elapsedMs = 0;
    lastStatsAt = -Infinity;
    nextBotIndex = 0;
    sound.playLaunch();

    // Launch player and bots with full jump velocity
    state.player.vy = JUMP_VELOCITY;
  }

  function beginPlayerEntrance() {
    if (phase !== 'ready') return;
    entranceStartTime = null;
    state.ui.playerEntranceProgress = 0;
    setPhase('intro_player');
  }

  function joinNextBot() {
    const bot = createStartingBots(388)[nextBotIndex];
    if (!bot) return;
    const safePlatforms = state.world.platforms.filter(platform => !platform.broken && ['standard', 'bouncy'].includes(platform.type)
      && platform.y - state.world.cameraY > 145 && platform.y - state.world.cameraY < canvas.height - 65);
    let platform = safePlatforms.sort((a, b) => Math.abs(a.y - state.player.y) - Math.abs(b.y - state.player.y))[0];
    if (!platform) {
      platform = {
        x: nextBotIndex % 2 === 0 ? 80 : canvas.width - 200,
        y: Math.max(state.world.cameraY + 160, Math.min(state.player.y + 65, state.world.cameraY + canvas.height - 80)),
        width: 120, height: 14, type: 'standard'
      };
      state.world.platforms.push(platform);
    }
    const fromLeft = nextBotIndex % 2 === 0;
    bot.x = fromLeft ? -bot.width - 20 : canvas.width + 20;
    bot.y = platform.y - bot.height;
    bot.vy = 0;
    bot.isEntering = true;
    bot.entranceFromX = bot.x;
    bot.entranceToX = platform.x + (platform.width - bot.width) / 2;
    bot.entranceY = bot.y;
    bot.entranceStartedAt = elapsedMs;
    bot.progress = Math.max(0, Math.round(388 - bot.y));
    bot.lastPlatformY = platform.y;
    state.bots.push(bot);
    nextBotIndex += 1;
    sound.playBotEntrance();
  }

  function triggerRestartWipe() {
    if (phase === 'wipe_reset') return;
    setPhase('wipe_reset');
    wipeStartTime = null;
    wipeResetTriggered = false;
    sound.playWipe();
  }

  function returnToTitleMenu() {
    if (phase === 'returning_title' || phase === 'intro_title') return;
    clearIntroTitleZone(state.world);
    spawnIntroPlatforms(state.world, -1400);
    returnFromY = state.world.cameraY;
    returnStartTime = null;
    setPhase('returning_title');
    sound.playWhoosh(reduceMotion ? 0.1 : 1);
  }

  // Pointer & Click handling for Canvas
  function handlePointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (phase === 'intro_title') {
      const titleWorldY = TITLE_WORLD_Y;
      const titleScreenY = titleWorldY - state.world.cameraY;
      const btnBounds = {
        x: canvas.width / 2 - 110,
        y: titleScreenY + 70,
        width: 220,
        height: 50,
      };

      if (
        clickX >= btnBounds.x && clickX <= btnBounds.x + btnBounds.width &&
        clickY >= btnBounds.y && clickY <= btnBounds.y + btnBounds.height
      ) {
        startSlideDown();
      }
    }
  }

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
      state.ui.isStartButtonHovered = isHovered;
      canvas.style.cursor = isHovered ? 'pointer' : 'default';
    } else {
      canvas.style.cursor = 'default';
    }
  }

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

  if (canvas?.addEventListener) {
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', handleKeyDown);
  }

  // Initial synchronous render if requested
  if (renderInitial) {
    render(context, state);
  }

  function frame(time) {
    if (stopped) return;

    if (isPaused?.() || (phase === 'paused')) {
      previousTime = time;
      if (!stopped) frameId = requestAnimationFrame(frame);
      return;
    }

    const rawDt = previousTime === null ? 0 : Math.max((time - previousTime) / 1000, 0);
    const dt = Math.min(rawDt, 1 / 30);
    previousTime = time;

    // =========================================================================
    // STAGE 1: INTRO TITLE
    // =========================================================================
    if (phase === 'intro_title') {
      state.world.cameraY = Y_INTRO;
      state.player.vx = 0;
      state.player.vy = 0;
    }

    // =========================================================================
    // STAGE 2: CAMERA SLIDE DOWN
    // =========================================================================
    else if (phase === 'intro_sliding') {
      if (slideStartTime === null) slideStartTime = time;
      const elapsed = time - slideStartTime;
      const progress = Math.min(Math.max(elapsed / (reduceMotion ? 350 : SLIDE_DURATION_MS), 0), 1);
      const ease = easeInOutCubic(progress);

      state.world.cameraY = Y_INTRO + (0 - Y_INTRO) * ease;
      state.ui.motionBlurPx = reduceMotion ? 0 : Math.min(9, (progress < 0.5 ? 12 * progress * progress : 12 * (1 - progress) * (1 - progress)) * 1.5);

      if (progress >= 1) {
        state.world.cameraY = 0;
        state.ui.motionBlurPx = 0;
        settleStartTime = time;
        setPhase('intro_platform');
      }
    }

    else if (phase === 'intro_platform') {
      state.world.cameraY = 0;
      state.ui.platformReveal = Math.min(1, (time - settleStartTime) / (reduceMotion ? 100 : START_PLATFORM_DURATION_MS));
      if (state.ui.platformReveal >= 1) setPhase('ready');
    }

    else if (phase === 'intro_player') {
      if (entranceStartTime === null) entranceStartTime = time;
      state.ui.playerEntranceProgress = Math.min(1, (time - entranceStartTime) / PLAYER_ENTRANCE_DURATION_MS);
      if (state.ui.playerEntranceProgress >= 1) {
        state.player.x = 300;
        state.player.y = 388;
        revealStartTime = time;
        setPhase('intro_reveal');
      }
    }

    else if (phase === 'intro_reveal') {
      state.ui.revealProgress = Math.min(1, (time - revealStartTime) / (reduceMotion ? 150 : PLATFORM_REVEAL_DURATION_MS));
      if (state.ui.revealProgress >= 1) setPhase('intro_wait_input');
    }

    else if (phase === 'intro_wait_input') {
      state.world.cameraY = 0;
    }

    else if (phase === 'returning_title') {
      if (returnStartTime === null) returnStartTime = time;
      const progress = Math.min((time - returnStartTime) / (reduceMotion ? 100 : RETURN_DURATION_MS), 1);
      state.world.cameraY = returnFromY + (Y_INTRO - returnFromY) * easeInOutCubic(progress);
      updatePlatforms(state.world, dt, { cullOffscreen: false });
      if (progress >= 1) {
        state.world.cameraY = Y_INTRO;
        state.world.platforms = [];
        state.ui.platformReveal = 0;
        state.ui.revealProgress = 0;
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
        setPhase('intro_title');
      }
    }

    // =========================================================================
    // Profile selection stays still; restart keeps the short warmup hop.
    // =========================================================================
    else if (phase === 'ready') {
      state.world.cameraY = 0;
    }

    else if (phase === 'warmup_hop') {
      if (warmupStartTime === null) warmupStartTime = time;
      state.world.cameraY = 0;

      // Player gentle hop
      state.player.y += state.player.vy * dt;
      state.player.vy += 1200 * dt;
      state.player.vx = 0;
      if (state.player.vy >= 0 && state.player.y >= 388) {
        state.player.y = 388;
        state.player.vy = WARMUP_HOP_VY;
        sound.playHop(440);
      }

      // Bots gentle hop on their assigned platforms
      state.bots.forEach(bot => {
        bot.y += (bot.vy || 0) * dt;
        bot.vy = (bot.vy || 0) + 1200 * dt;
        bot.vx = 0;
        if (bot.vy >= 0 && bot.y >= 388) {
          bot.y = 388;
          bot.vy = WARMUP_HOP_VY;
        }
      });

      if (time - warmupStartTime >= (reduceMotion ? 100 : RESTART_WARMUP_MS)) startLaunch();
    }

    // =========================================================================
    // STAGE 4: ACTIVE 60 FPS GAMEPLAY
    // =========================================================================
    else if (phase === 'running') {
      elapsedMs += rawDt * 1000;
      while (nextBotIndex < BOT_JOIN_TIMES_MS.length && elapsedMs >= BOT_JOIN_TIMES_MS[nextBotIndex]) joinNextBot();
      const direction = Number(input.state.right) - Number(input.state.left);
      updateHorizontal(state.player, direction, dt);
      const prevPlayerX = state.player.x;
      handleScreenWrap(state.player, canvas.width);
      if (Math.abs(state.player.x - prevPlayerX) > canvas.width / 2) {
        sound.playPlayerWrap();
      }
      updatePlatforms(state.world, dt);
      applyPhysics(state.player, dt);
      handlePlatformCollisions(state.player, state.world.platforms, (_player, platform) => {
        sound.playPlayerBounce(platform.type);
      });

      // Update Bots AI and physics
      state.bots.forEach(bot => {
        if (bot.isDead) return;
        if (bot.isEntering) {
          const progress = Math.min(1, (elapsedMs - bot.entranceStartedAt) / BOT_ENTRANCE_DURATION_MS);
          bot.x = bot.entranceFromX + (bot.entranceToX - bot.entranceFromX) * easeInOutCubic(progress);
          bot.y = bot.entranceY - Math.sin(Math.PI * progress) * 75;
          if (progress >= 1) {
            bot.isEntering = false;
            bot.y = bot.entranceY;
            bot.vy = JUMP_VELOCITY;
          }
          return;
        }
        updateBotAI(bot, state.world.platforms, dt, state.bots, state.world.cameraY);
        // Bot gravity & collision
        bot.y += bot.vy * dt;
        bot.vy += 1200 * dt;
        if (bot.vy > 0) {
          for (const p of state.world.platforms) {
            if (p.broken) continue;
            if (
              bot.x + bot.width > p.x &&
              bot.x < p.x + p.width &&
              bot.y + bot.height >= p.y &&
              bot.y + bot.height <= p.y + p.height + 15
            ) {
              bot.y = p.y - bot.height;
              bot.vy = JUMP_VELOCITY * (p.type === 'bouncy' ? 1.45 : 1.0);
              onBotBounce(bot, p);
              sound.playBotBounce(p.type, bot.x / canvas.width);
              break;
            }
          }
        }
        if (bot.y - state.world.cameraY > canvas.height + 100) {
          bot.isDead = true;
          sound.playBotFall(bot.x / canvas.width);
        }
      });

      // Calculate climb height
      const currentHeight = Math.max(0, Math.round(388 - state.player.y));
      if (currentHeight > maxHeight) {
        maxHeight = currentHeight;
      }
      for (const bot of state.bots) bot.progress = Math.max(bot.progress || 0, Math.round(388 - bot.y));
      publishStats(time);

      // Camera follows upward
      const sightRatio = config?.cameraRatio ?? CAMERA_SIGHT_RATIO ?? 0.60;
      const cameraTargetY = state.player.y - canvas.height * sightRatio;
      state.world.cameraY = Math.min(state.world.cameraY, cameraTargetY);

      // Check fall offscreen
      if (maxHeight >= (config?.finish_height ?? 3000)) endRun('goal', time);
      else if (elapsedMs >= (config?.max_duration_ms ?? 180000)) endRun('timeout', time);
      else if (state.player.y - state.world.cameraY > canvas.height + state.player.height) endRun('fall', time);
    }

    // =========================================================================
    // STAGE 5: WIPE RESTART TRANSITION
    // =========================================================================
    else if (phase === 'wipe_reset') {
      if (wipeStartTime === null) wipeStartTime = time;
      const wipeElapsed = time - wipeStartTime;
      const progress = Math.min(Math.max(wipeElapsed / (reduceMotion ? 100 : WIPE_DURATION_MS), 0), 1);
      state.ui.wipeProgress = progress;

      // Halfway through wipe: reset state underneath curtain
      if (progress >= 0.5 && !wipeResetTriggered) {
        wipeResetTriggered = true;
        state.world.cameraY = 0;
        state.world = createWorld({ soloStart: true });
        state.player.x = 300;
        state.player.y = 388;
        state.player.vx = 0;
        state.player.vy = WARMUP_HOP_VY;
        state.bots = [];
        nextBotIndex = 0;
        maxHeight = 0;
        elapsedMs = 0;
        warmupStartTime = null;
        isGameOver = false;
        publishStats(time);
      }

      if (progress >= 1) {
        state.ui.wipeProgress = 0;
        setPhase('warmup_hop');
      }
    }

    // Render frame
    render(context, state);
    frameCount += 1;
    onFrame?.({ frameCount, dt });

    if (!stopped) frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);

  return {
    destroy() {
      if (stopped) return;
      stopped = true;
      input.destroy();
      cancelAnimationFrame(frameId);
      if (canvas?.removeEventListener) {
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointermove', handlePointerMove);
      }
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('keydown', handleKeyDown);
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
    setDirection(dir, active) {
      if (input?.state) {
        input.state[dir] = active;
      }
      if (active && phase === 'intro_wait_input') startLaunch();
    },
    startFromTitle: startSlideDown,
    beginPlayerEntrance,
    startLaunch,
    triggerRestartWipe,
    returnToTitleMenu,
    togglePause() {
      if (phase === 'running') setPhase('paused');
      else if (phase === 'paused') setPhase('running');
    },
    setPhase: (p) => setPhase(p),
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
    setPlayerName(name) { state.nickname = name; },
    getPhase: () => phase,
    getState: () => state,
    getSnapshot: () => ({
      height: Math.max(0, Math.round(388 - state.player.y)),
      maxHeight,
      elapsedMs: Math.round(elapsedMs),
      ranking: getRanking({ id: 'player', name: state.nickname, progress: maxHeight }, state.bots),
    }),
  };
}
