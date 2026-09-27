import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createRaceBots, updateRaceBots } from '../game/bots.js';
import { finish, createState, snapshot } from '../game/simulation.js';
import { StartMenu } from '../components/HUD.jsx';

afterEach(cleanup);

const config = {
  finish_height: 3000,
  max_duration_ms: 180000,
  rules_version: 'v1',
  skins: [
    { id: 'doodle', name: 'Vàng cổ điển', sprite: '/images/skins/doodle.svg' },
    { id: 'purple', name: 'Tím mộng mơ', sprite: '/images/skins/purple.svg' },
  ],
  bots: [
    { id: 'son', name: 'Thầy Sơn', base_speed: 41, sprite_id: 'son' },
    { id: 'viet', name: 'Thầy Việt', base_speed: 46, sprite_id: 'viet' },
  ],
};

it('moves real race bots and exposes them in the live ranking', () => {
  const bots = createRaceBots(config.bots);
  updateRaceBots(bots, 10000, config.finish_height);
  expect(bots.every((bot) => bot.progress > 0)).toBe(true);
  expect(bots.map((bot) => bot.sprite_id)).toEqual(['son', 'viet']);

  const state = createState(config);
  state.bots = bots;
  const view = snapshot(state);
  expect(view.ranking).toHaveLength(3);
  expect(view.ranking.some((racer) => racer.name === 'Thầy Sơn')).toBe(true);
});

it('creates a persistent result with placement when a run ends', () => {
  const state = createState(config);
  state.elapsedMs = 12500;
  state.player.progress = 420;
  updateRaceBots(state.bots, state.elapsedMs, config.finish_height);
  finish(state, 'fall');
  expect(state.result).toMatchObject({ height: 420, elapsed_ms: 12500, outcome: 'dnf' });
  expect(state.result.placement).toBeGreaterThanOrEqual(1);
  expect(state.result.placement).toBeLessThanOrEqual(3);
});

it('uses the selected doodle skin when starting from the menu', () => {
  const onStartGame = vi.fn();
  render(<StartMenu config={config} onStartGame={onStartGame}
    onOpenLeaderboard={() => {}} onOpenHistory={() => {}} />);
  fireEvent.change(screen.getByLabelText(/Tên người chơi/), { target: { value: 'Vinh' } });
  fireEvent.change(screen.getByLabelText(/Trang phục/), { target: { value: 'purple' } });
  fireEvent.click(screen.getByRole('button', { name: /BẮT ĐẦU CHƠI/ }));
  expect(onStartGame).toHaveBeenCalledWith({ nickname: 'Vinh', skinId: 'purple' });
});
