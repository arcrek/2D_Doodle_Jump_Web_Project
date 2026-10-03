import { afterEach, expect, it, vi } from 'vitest';
import { render } from '../game/render.js';
import { renderPowerups, renderLava, renderLavaDanger } from '../game/mechanics.js';

vi.mock('../game/mechanics.js', async original => ({
  ...await original(), renderPowerups: vi.fn(), renderLava: vi.fn(), renderLavaDanger: vi.fn(),
}));

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

function context() {
  return new Proxy({ canvas: { width: 960, height: 540 }, globalAlpha: 1 }, {
    get(object, key) { return key in object ? object[key] : (object[key] = vi.fn()); },
  });
}

function scene(phase) {
  return { phase, player: { x: 300, y: 350, width: 34, height: 42, powerup: { rocketTimer: 2 } }, bots: [],
    world: { cameraY: 0, lava: { y: 470 }, platforms: [
      { x: 100, y: 420, width: 100, height: 14, type: 'standard', powerup: 'rocket' },
      { x: 350, y: 280, width: 100, height: 14, type: 'standard', powerup: 'shield' },
    ] }, ui: { titleWorldY: -2400, platformReveal: 0, revealProgress: 0, revealRanks: [0, 1] } };
}

it.each(['intro_title', 'intro_sliding', 'intro_menu_delay', 'ready', 'intro_platform'])(
  'does not draw floating items, player effects or lava in %s', phase => {
    render(context(), scene(phase));
    expect(renderPowerups).not.toHaveBeenCalled();
    expect(renderLava).not.toHaveBeenCalled();
    expect(renderLavaDanger).not.toHaveBeenCalled();
  });

it('reveals powerups only on their visible host platforms', () => {
  const state = scene('intro_reveal');
  state.ui.platformReveal = 1;
  state.ui.revealProgress = .2;
  render(context(), state);
  const hosts = renderPowerups.mock.calls.flatMap(call => call[1] || []);
  expect(hosts).toEqual([state.world.platforms[0]]);
});

it('keeps the danger strip behind platforms/player and lava foreground', () => {
  render(context(), scene('running'));
  expect(renderLavaDanger).toHaveBeenCalledOnce();
  expect(renderLava).toHaveBeenCalledOnce();
  expect(renderLavaDanger.mock.invocationCallOrder[0]).toBeLessThan(renderPowerups.mock.invocationCallOrder[0]);
  expect(renderLavaDanger.mock.invocationCallOrder[0]).toBeLessThan(renderLava.mock.invocationCallOrder[0]);
});
