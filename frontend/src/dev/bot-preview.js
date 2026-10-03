import { render as initialRenderer } from '../game/render.js';
import * as initialEntrance from '../game/bot-entrance.js';
import { createStartingBots } from '../game/bots.js';
import { createPlayer } from '../game/player.js';
import { preloadSprites } from '../game/sprites.js';

let paint = initialRenderer;
let entrance = initialEntrance;
const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
const controls = Object.fromEntries(['bot', 'speed', 'play', 'replay', 'reduce', 'time', 'clock', 'status'].map(id => [id, document.getElementById(id)]));
const listeners = new AbortController();
const profiles = createStartingBots(388);
let age = 0;
let playing = true;
let previousTime = null;
let frameId;
let revision = 0;
const state = {
  phase: 'running', player: { ...createPlayer(), x: 460, y: 350 }, bots: [],
  world: { cameraY: 0, platforms: [
    { x: 65, y: 425, width: 165, height: 14, type: 'standard' },
    { x: 350, y: 392, width: 150, height: 14, type: 'standard' },
    { x: 735, y: 290, width: 165, height: 14, type: 'standard' },
  ] }, ui: { botEntrances: [], botEntranceClockMs: 0, reduceMotion: false },
};
preloadSprites();

function draw() {
  const bot = { ...profiles[Number(controls.bot.value)] };
  const targetX = 130;
  const floorY = 425;
  const duration = entrance.BOT_ENTRANCE_IMPACT_MS;
  const progress = Math.min(1, age / duration);
  const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  const startX = -bot.width - 20;
  bot.x = startX + (targetX - bot.width / 2 - startX) * eased;
  bot.y = floorY - bot.height - Math.sin(Math.PI * progress) * 75;
  bot.isEntering = age < duration;
  state.bots = [bot];
  state.ui.reduceMotion = controls.reduce.checked;
  state.ui.botEntranceClockMs = age;
  state.ui.botEntrances = [{
    botId: bot.id, type: bot.type, name: bot.name, side: 'left', startMs: 0,
    impactWorldPosition: age >= duration ? { x: targetX, y: floorY } : null,
    impactPlayed: age >= duration,
  }];
  ctx.fillStyle = '#faf7ed';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paint(ctx, state);
  controls.time.max = entrance.BOT_CUT_IN_DURATION_MS + 200;
  controls.time.value = Math.round(age);
  controls.clock.value = `${Math.round(age)} ms`;
}

function frame(now) {
  if (playing && previousTime !== null) {
    age = (age + Math.min(now - previousTime, 100) * Number(controls.speed.value)) % (entrance.BOT_CUT_IN_DURATION_MS + 200);
  }
  previousTime = now;
  draw();
  frameId = requestAnimationFrame(frame);
}

function updatePlayButton() { controls.play.textContent = playing ? 'Tạm dừng' : 'Chạy'; }
controls.play.addEventListener('click', () => { playing = !playing; updatePlayButton(); }, { signal: listeners.signal });
controls.replay.addEventListener('click', () => { age = 0; playing = true; updatePlayButton(); }, { signal: listeners.signal });
controls.time.addEventListener('input', () => { age = Number(controls.time.value); playing = false; updatePlayButton(); draw(); }, { signal: listeners.signal });
for (const control of [controls.bot, controls.reduce]) {
  control.addEventListener('change', draw, { signal: listeners.signal });
}

function codeUpdated() {
  revision += 1;
  // Keep scrubbed/paused frames in place; replay immediately while playing.
  if (playing) age = 0;
  age = Math.min(age, entrance.BOT_CUT_IN_DURATION_MS + 200);
  controls.status.textContent = `Đã cập nhật code · lần ${revision} · ${new Date().toLocaleTimeString('vi-VN')}`;
  draw();
}
if (import.meta.hot) {
  import.meta.hot.accept('../game/render.js', next => { if (next) { paint = next.render; codeUpdated(); } });
  import.meta.hot.accept('../game/bot-entrance.js', next => { if (next) { entrance = next; codeUpdated(); } });
  import.meta.hot.dispose(() => { cancelAnimationFrame(frameId); listeners.abort(); });
}
frameId = requestAnimationFrame(frame);
