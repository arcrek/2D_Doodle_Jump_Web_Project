// Development-only visual regression surface using the real renderer and engine.
import { render } from '../game/render.js';
import { createGame } from '../game/engine.js';
import { createPlayer } from '../game/player.js';
import { preloadSprites } from '../game/sprites.js';
import { soundManager } from '../game/audio.js';

const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
const report = document.querySelector('#report');
let scene = 'lava';
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionQuery.matches;
motionQuery.addEventListener('change', event => { reduced = event.matches; });
let game;
let checks = {};
let startedAt;
let samples = [];
let finalRecorded = false;
soundManager.isMuted = true;
preloadSprites();

function staticState() {
  return { phase: scene === 'slide' ? 'intro_sliding' : scene === 'reveal' ? 'intro_reveal' : scene === 'wipe' ? 'wipe_reset' : 'running',
    player: { ...createPlayer(), x: 430, y: 235, powerup: { rocketTimer: 3, shieldTimer: 5 } }, bots: [], ui: { reduceMotion: reduced, titleWorldY: -2000, platformReveal: 1, revealProgress: .18, revealRanks: [0, 2, 1], wipeProgress: scene === 'wipe' ? .5 : 0 },
    world: { cameraY: 0, lava: { y: 400 }, platforms: [
      { x: 380, y: 300, width: 160, height: 14, type: 'standard', powerup: 'rocket' },
      { x: 120, y: 190, width: 160, height: 14, type: 'standard', powerup: 'shield' },
      { x: 710, y: 225, width: 140, height: 14, type: 'moving', powerup: 'rocket' },
    ] } };
}

function runEngine(kind) {
  game?.destroy();
  game = createGame(canvas, { isEndless: true, finish_height: null, max_duration_ms: null }, { enableIntro: true, initialPhase: 'finished' });
  const state = game.getState();
  state.world.cameraY = -7000;
  state.world.lava.y = -6700;
  state.player.y = -6800;
  state.ui.reduceMotion = reduced;
  samples = []; finalRecorded = false; startedAt = performance.now(); scene = kind;
  if (kind === 'return') game.returnToTitleMenu(); else game.triggerRestartWipe();
}

for (const button of document.querySelectorAll('[data-scene]')) button.onclick = () => {
  game?.destroy(); game = null; scene = button.dataset.scene;
};
document.querySelector('#return').onclick = () => runEngine('return');
document.querySelector('#restart').onclick = () => runEngine('restart');

function frame(now) {
  if (!game) {
    render(ctx, staticState());
    report.textContent = JSON.stringify({ scene, reduced }, null, 2);
  } else {
    const state = game.getState();
    const phase = game.getPhase();
    if (scene === 'return') {
      if (state.world.lava && samples.length < 100) samples.push(state.world.lava.y - state.world.cameraY);
      if (phase === 'intro_title' && !finalRecorded) {
        checks.return = { lavaDeleted: !state.world.lava, cameraY: state.world.cameraY, elapsed: Math.round(now - startedAt), monotonicDrop: samples.every((y, i) => !i || y >= samples[i - 1] - .01), startSurface: samples[0], lastSurface: samples.at(-1) };
        finalRecorded = true;
      }
    } else if (!finalRecorded && phase === 'running') {
      checks.restart = { cleanLava: state.world.lava.elapsed < 1, elapsed: Math.round(now - startedAt), wipeProgress: state.ui.wipeProgress, phase };
      finalRecorded = true;
      game.togglePause();
    }
    report.textContent = JSON.stringify({ scene, phase, lavaPresent: Boolean(state.world.lava), screenLavaY: state.world.lava ? Math.round(state.world.lava.y - state.world.cameraY) : null, checks }, null, 2);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
