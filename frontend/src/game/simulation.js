import { createPlayer, updateHorizontal } from './player.js';
import { createWorld, updatePlatforms } from './world.js';
import { applyPhysics, handlePlatformCollisions, handleScreenWrap } from './physics.js';
import { createRaceBots, updateBotAI, onBotBounce } from './bots.js';
import { getRanking } from './ranking.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './index.js';

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
  const ranking = getRanking(state.player, state.bots).map((racer) => ({
    id: racer.id,
    name: racer.name,
    progress: Math.floor(racer.progress),
    finished: racer.finishedAt !== null,
    isDead: Boolean(racer.isDead),
    sprite_id: racer.sprite_id,
  }));
  return {
    height: Math.floor(state.player.progress),
    maxHeight: Math.floor(state.maxHeight),
    elapsedMs: Math.round(state.elapsedMs),
    ranking,
    placement: ranking.findIndex((item) => item.id === 'player') + 1,
    reason: state.reason,
    result: state.result,
  };
}

export function finish(state, reason) {
  if (state.finished) return;
  state.finished = true;
  state.reason = reason;
  const ranking = getRanking(state.player, state.bots);
  state.result = {
    height: Math.floor(state.player.progress),
    elapsed_ms: Math.max(1, state.config.max_duration_ms ? Math.min(state.config.max_duration_ms, Math.round(state.elapsedMs)) : Math.round(state.elapsedMs)),
    outcome: reason === 'goal' ? 'finished' : 'dnf',
    placement: ranking.findIndex((item) => item.id === 'player') + 1,
  };
}

export function step(state, dt, direction) {
  if (state.finished) return;
  const { player, world, config, bots } = state;
  state.elapsedMs = config.max_duration_ms ? Math.min(config.max_duration_ms, state.elapsedMs + dt * 1000) : (state.elapsedMs + dt * 1000);

  // Sinh bệ đón đầu theo đối tượng cao nhất (Player hoặc Bot dẫn đầu)
  let highestEntityY = player.y;
  for (const bot of bots) {
    if (!bot.isDead && bot.y < highestEntityY) {
      highestEntityY = bot.y;
    }
  }
  updatePlatforms(world, dt, highestEntityY);

  // Cập nhật Player
  updateHorizontal(player, direction, dt);
  handleScreenWrap(player, SCREEN_WIDTH);
  applyPhysics(player, dt);
  handlePlatformCollisions(player, world.platforms);

  player.progress = typeof config.finish_height === 'number'
    ? Math.min(config.finish_height, Math.max(player.progress, 388 - player.y))
    : Math.max(player.progress, 388 - player.y);
  state.maxHeight = Math.max(state.maxHeight, player.progress);
  world.cameraY = Math.min(world.cameraY, player.y - 210);

  // Cập nhật 4 Bot với Full Vật Lý & AI (Hướng B)
  for (const bot of bots) {
    if (bot.finishedAt !== null || bot.isDead) continue;

    // AI chọn bệ & điều hướng ngang
    updateBotAI(bot, world.platforms, dt, bots, world.cameraY);

    // Trọng lực rơi tự do & cập nhật Y
    applyPhysics(bot, dt);

    // Xuyên màn hình ngang
    handleScreenWrap(bot, SCREEN_WIDTH);

    // Xử lý va chạm tiếp đất và nảy
    handlePlatformCollisions(bot, world.platforms, (b, platform) => {
      onBotBounce(b, platform);
    });

    // Cập nhật tiến độ độ cao bot leo được
    const botProgress = Math.max(0, Math.round(388 - bot.y));
    bot.progress = typeof config.finish_height === 'number'
      ? Math.min(config.finish_height, Math.max(bot.progress, botProgress))
      : Math.max(bot.progress, botProgress);

    // Đạt đích hoặc rơi vực
    if (typeof config.finish_height === 'number' && bot.progress >= config.finish_height) {
      bot.finishedAt = state.elapsedMs;
    } else if (bot.y - world.cameraY > SCREEN_HEIGHT + bot.height + 60) {
      bot.isDead = true;
    }
  }

  // Kiểm tra điều kiện kết thúc của Player
  if (typeof config.finish_height === 'number' && player.progress >= config.finish_height) {
    player.finishedAt = state.elapsedMs;
    finish(state, 'goal');
  } else if (player.y - world.cameraY > SCREEN_HEIGHT + player.height) {
    finish(state, 'fall');
  } else if (typeof config.max_duration_ms === 'number' && state.elapsedMs >= config.max_duration_ms) {
    finish(state, 'timeout');
  }
}
