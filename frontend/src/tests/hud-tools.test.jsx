import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TopBar, GameOverModal } from '../components/HUD.jsx';
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

it('reveals game actions through the hamburger and closes after an action (English default)', () => {
  const pause = vi.fn();
  render(<TopBar elapsedMs={12500} onTogglePause={pause} onRestart={vi.fn()} onExitToMenu={vi.fn()} />);
  const toggle = screen.getByRole('button', { name: 'Open game controls' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('button', { name: 'Start a new run' })).toBeNull();
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByText(/12.5s/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Return to main menu' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pause or resume game' }));
  expect(pause).toHaveBeenCalledTimes(1);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

it('renders GameOverModal with death context and achieved height in endless mode (English default)', () => {
  render(
    <GameOverModal
      phase="finished"
      height={3500}
      elapsedMs={35000}
      placement={1}
      nickname="Player"
      outcome="dnf"
      reason="lava"
      save={{ status: 'saved', message: 'Result saved.' }}
      onResume={vi.fn()}
      onRestart={vi.fn()}
      onExitToMenu={vi.fn()}
    />
  );
  expect(screen.getByText('Game Over')).toBeTruthy();
  expect(screen.getByText('Swallowed by lava!')).toBeTruthy();
  expect(screen.getByText('3500m')).toBeTruthy();
  expect(screen.getByText('Result saved.')).toBeTruthy();
});

it('renders TopBar and GameOverModal in Vietnamese when locale is set to vi', () => {
  setLocale('vi');
  render(<TopBar elapsedMs={12500} onTogglePause={vi.fn()} onRestart={vi.fn()} onExitToMenu={vi.fn()} />);
  const toggle = screen.getByRole('button', { name: 'Mở điều khiển trò chơi' });
  expect(toggle).toBeTruthy();
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Quay về màn hình chính' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Chơi lại ván mới' })).toBeTruthy();

  cleanup();

  render(
    <GameOverModal
      phase="finished"
      height={3500}
      elapsedMs={35000}
      placement={1}
      nickname="Bạn"
      outcome="dnf"
      reason="lava"
      save={{ status: 'saved', message: 'Đã lưu kết quả.' }}
      onResume={vi.fn()}
      onRestart={vi.fn()}
      onExitToMenu={vi.fn()}
    />
  );
  expect(screen.getByText('Kết thúc lượt chơi')).toBeTruthy();
  expect(screen.getByText('Bạn đã bị dung nham nuốt chửng!')).toBeTruthy();
  expect(screen.getByText('Đã lưu kết quả.')).toBeTruthy();
});

it('renders TopBar and GameOverModal in French when locale is set to fr', () => {
  setLocale('fr');
  render(<TopBar elapsedMs={12500} onTogglePause={vi.fn()} onRestart={vi.fn()} onExitToMenu={vi.fn()} />);
  const toggle = screen.getByRole('button', { name: 'Ouvrir les commandes du jeu' });
  expect(toggle).toBeTruthy();
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Retourner au menu principal' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Commencer une nouvelle partie' })).toBeTruthy();

  cleanup();

  render(
    <GameOverModal
      phase="finished"
      height={3500}
      elapsedMs={35000}
      placement={1}
      nickname="Joueur"
      outcome="dnf"
      reason="lava"
      save={{ status: 'saved', message: 'Résultat enregistré.' }}
      onResume={vi.fn()}
      onRestart={vi.fn()}
      onExitToMenu={vi.fn()}
    />
  );
  expect(screen.getByText('Fin de partie')).toBeTruthy();
  expect(screen.getByText('Englouti par la lave !')).toBeTruthy();
  expect(screen.getByText('Résultat enregistré.')).toBeTruthy();
});
