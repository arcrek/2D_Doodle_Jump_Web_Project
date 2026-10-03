import { createPlayer, updateHorizontal } from './player.js';
import { createWorld, updatePlatforms } from './world.js';
import { applyPhysics, handlePlatformCollisions, handleScreenWrap } from './physics.js';
import { createRaceBots } from './bots.js';
import { updateBotCompanion } from './mechanics.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH, TARGET_HEIGHT } from './index.js';

export function createState(config = {}) {
  const player = {
    ...createPlayer(),
    id: 'player',
    name: config.nickname || 'Bạn',
    sprite_id: config.skin_id || config.skins?.[0]?.id || 'nam',
    progress: 0,
    finishedAt: null,
  };
  return {
    player,
    world: createWorld(),
    bots: createRaceBots(config.bots),
    config: { finish_height: null, max_duration_ms: null, ...config },
    elapsedMs: 0,
    maxHeight: 0,
    finished: false,
    reason: '',
    result: null,
  };
}

export function snapshot(state) {
  return {
    height: Math.floor(state.player.progress),
    maxHeight: Math.floor(state.maxHeight),
    elapsedMs: Math.round(state.elapsedMs),
    ranking: [],
    placement: 1,
    reason: state.reason,
    result: state.result,
  };
}

export function finish(state, reason) {
  if (state.finished) return;
  state.finished = true;
  state.reason = reason;
  const isEndless = Boolean(state.config.isEndless || state.config.finish_height == null);
  const finishHeight = state.config.finish_height ?? 3000;
  const height = Math.floor(state.maxHeight || state.player.progress);
  const outcome = (!isEndless && (reason === 'goal' || height >= finishHeight)) ? 'finished' : 'dnf';
  const elapsed = Math.round(state.elapsedMs);
  const validElapsed = isEndless
    ? Math.max(1, elapsed)
    : Math.max(1, Math.min(state.config.max_duration_ms ?? 180000, elapsed));
  state.result = {
    height,
    elapsed_ms: validElapsed,
    outcome,
    placement: 1,
  };
}

export function step(state, dt, direction) {
  if (state.finished) return;
  const { player, world, config, bots } = state;
  const isEndless = Boolean(config.isEndless || config.finish_height == null);
  state.elapsedMs = isEndless ? (state.elapsedMs + dt * 1000) : Math.min(config.max_duration_ms ?? 180000, state.elapsedMs + dt * 1000);

  updatePlatforms(world, dt, player.y);

  // Cập nhật Player
  updateHorizontal(player, direction, dt);
  handleScreenWrap(player, SCREEN_WIDTH);
  applyPhysics(player, dt);
  handlePlatformCollisions(player, world.platforms);

  const playerHeight = Math.max(0, 388 - player.y);
  player.progress = isEndless ? Math.max(player.progress, playerHeight) : Math.min(config.finish_height, Math.max(player.progress, playerHeight));
  state.maxHeight = Math.max(state.maxHeight, player.progress);
  world.cameraY = Math.min(world.cameraY, player.y - 210);

  // Cập nhật 4 Bot với Full Vật Lý & AI (Hướng B)
  for (const bot of bots) {
    updateBotCompanion(bot, world, player, dt, bots);
  }

  // Kiểm tra điều kiện kết thúc của Player
  if (!isEndless && config.finish_height && player.progress >= config.finish_height) {
    player.finishedAt = state.elapsedMs;
    finish(state, 'goal');
  } else if (player.y - world.cameraY > SCREEN_HEIGHT + player.height) {
    finish(state, 'fall');
  } else if (!isEndless && config.max_duration_ms && state.elapsedMs >= config.max_duration_ms) {
    finish(state, 'timeout');
  }
}
