import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TopBar } from '../components/HUD.jsx';

afterEach(cleanup);

it('reveals game actions through the hamburger and closes after an action', () => {
  const pause = vi.fn();
  render(<TopBar elapsedMs={12500} onTogglePause={pause} onRestart={vi.fn()} onExitToMenu={vi.fn()} />);
  const toggle = screen.getByRole('button', { name: 'Mở điều khiển trò chơi' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('button', { name: 'Chơi lại ván mới' })).toBeNull();
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByText(/12.5s/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Quay về màn hình chính' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng hoặc tiếp tục ván chơi' }));
  expect(pause).toHaveBeenCalledTimes(1);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});
