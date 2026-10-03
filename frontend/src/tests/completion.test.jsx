import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRaceBots } from '../game/bots.js';
import { finish, createState, snapshot } from '../game/simulation.js';
import { StartMenu, FloatingHUD, GameOverModal } from '../components/HUD.jsx';
import { setLocale } from '../i18n/index.js';

beforeEach(() => {
  localStorage.clear();
  setLocale('en');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  setLocale('en');
});

it('shows only player scores, without teacher ranking or result placement', () => {
  render(<FloatingHUD currentHeight={240} maxHeight={500} ranking={[{ id: 'son', name: 'Thầy Sơn', progress: 900 }]} />);
  expect(screen.getByText('Current: 240m')).toBeTruthy();
  expect(screen.getByText('Best: 500m')).toBeTruthy();
  expect(screen.queryByLabelText('Leaderboard ranking')).toBeNull();
  expect(screen.queryByText('Thầy Sơn')).toBeNull();
  render(<GameOverModal phase="finished" height={500} elapsedMs={10000} placement={4} />);
  expect(screen.queryByText('Rank')).toBeNull();
  expect(screen.getByText('500m')).toBeTruthy();
});

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

it('keeps teachers as companions without scores or live ranking', () => {
  const bots = createRaceBots(config.bots);
  expect(bots.every((bot) => bot.progress === undefined && bot.finishedAt === undefined)).toBe(true);
  expect(bots.map((bot) => bot.sprite_id)).toEqual(['son', 'viet']);

  const state = createState(config);
  state.bots = bots;
  const view = snapshot(state);
  expect(view.ranking).toEqual([]);
});

it('creates a persistent result with placement when a run ends', () => {
  const state = createState(config);
  state.elapsedMs = 12500;
  state.player.progress = 420;
  finish(state, 'fall');
  expect(state.result).toMatchObject({ height: 420, elapsed_ms: 12500, outcome: 'dnf' });
  expect(state.result.placement).toBe(1);
});

it('computes result with outcome dnf and achieved height in endless mode', () => {
  const state = createState({ ...config, finish_height: null, isEndless: true });
  state.elapsedMs = 45000;
  state.player.progress = 3500;
  state.maxHeight = 3500;
  finish(state, 'lava');
  expect(state.result).toMatchObject({ height: 3500, elapsed_ms: 45000, outcome: 'dnf' });
});

it('keeps the profile skin without showing a skin selector in the menu', () => {
  const onStartGame = vi.fn();
  render(<StartMenu initialSkin="purple" onStartGame={onStartGame}
    onOpenHistory={() => {}} />);
  fireEvent.change(screen.getByLabelText(/Player Name/i), { target: { value: 'Vinh' } });
  expect(screen.queryByLabelText(/Skin/i)).toBeNull();
  expect(screen.getByText(/Controls:/i)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /PLAY NOW/i }));
  expect(onStartGame).toHaveBeenCalledWith({ nickname: 'Vinh', skinId: 'purple' });
});
