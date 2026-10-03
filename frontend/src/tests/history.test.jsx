import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HistoryModal, StartMenu, FloatingHUD } from '../components/HUD.jsx';
import { setLocale } from '../i18n/index.js';
import { getJson } from '../services/api.js';

vi.mock('../services/api.js', () => ({ getJson: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); setLocale('vi'); });
afterEach(() => { cleanup(); localStorage.clear(); setLocale('en'); });

const run = { run_id: 'run-one', nickname: 'Vinh', height: 4936, elapsed_ms: 54000 };

it('opens own history from the menu without a leaderboard button', () => {
  const openHistory = vi.fn();
  render(<StartMenu onStartGame={vi.fn()} onOpenHistory={openHistory} />);
  expect(screen.queryByRole('button', { name: /xếp hạng/i })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Lịch sử của tôi/ }));
  expect(openHistory).toHaveBeenCalledOnce();
  expect(document.body.textContent).not.toMatch(/[🎮🏆🚀🔥📖]/u);
});

it('keeps only height scores in HUD so the canvas warning is not duplicated', () => {
  render(<FloatingHUD currentHeight={400} maxHeight={800} lavaDistance={30} />);
  expect(screen.getByText('Hiện tại: 400m')).toBeTruthy();
  expect(screen.getByText('Kỷ lục: 800m')).toBeTruthy();
  expect(screen.queryByText(/Dung nham/)).toBeNull();
  expect(document.body.textContent).not.toMatch(/[🏆🚀🔥⚠]/u);
});

it('loads the personal filter and renders recent runs without ranking labels', async () => {
  let resolve;
  getJson.mockImplementation(() => new Promise(done => { resolve = done; }));
  render(<HistoryModal playerId="guest/one" onClose={vi.fn()} />);
  expect(screen.getByRole('status').textContent).toBe('Đang mở sổ…');
  expect(getJson).toHaveBeenCalledWith('/api/runs?player_id=guest%2Fone', { signal: expect.any(AbortSignal) });
  await act(async () => resolve({ items: [run] }));
  expect(screen.getByRole('dialog', { name: 'Lịch sử của tôi' })).toBeTruthy();
  expect(screen.getByText('Vinh')).toBeTruthy();
  expect(screen.getByText('4936m')).toBeTruthy();
  expect(screen.getByText('54.0s')).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Lượt' })).toBeTruthy();
  expect(screen.queryByText('Hạng')).toBeNull();
  expect(document.body.textContent).not.toMatch(/[📖🏆]/u);
});

it('shows errors, resets loading on retry, then displays the empty state', async () => {
  let resolveRetry;
  getJson.mockRejectedValueOnce(new Error('Offline'))
    .mockImplementationOnce(() => new Promise(done => { resolveRetry = done; }));
  render(<HistoryModal playerId="guest" onClose={vi.fn()} />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(screen.getByRole('status')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  await act(async () => resolveRetry({ items: [] }));
  expect(screen.getByText('Chưa có lượt chơi nào.')).toBeTruthy();
});

it('aborts old personal history requests when the player changes', async () => {
  const resolvers = [];
  getJson.mockImplementation(() => new Promise(resolve => resolvers.push(resolve)));
  const { rerender, unmount } = render(<HistoryModal playerId="first" onClose={vi.fn()} />);
  const firstSignal = getJson.mock.calls[0][1].signal;
  rerender(<HistoryModal playerId="second" onClose={vi.fn()} />);
  expect(firstSignal.aborted).toBe(true);
  await act(async () => resolvers[1]({ items: [{ ...run, nickname: 'Second' }] }));
  await act(async () => resolvers[0]({ items: [run] }));
  expect(screen.getByText('Second')).toBeTruthy();
  expect(screen.queryByText('Vinh')).toBeNull();
  const secondSignal = getJson.mock.calls[1][1].signal;
  unmount();
  expect(secondSignal.aborted).toBe(true);
});

it('does not fetch offline or without an identity, and can close by Escape', async () => {
  const onClose = vi.fn();
  const { rerender } = render(<HistoryModal playerId="guest" offline onClose={onClose} />);
  expect(getJson).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toMatch(/ngoại tuyến/);
  expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Đóng sổ' }));
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
  rerender(<HistoryModal onClose={onClose} />);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/thông tin người chơi/));
  expect(getJson).not.toHaveBeenCalled();
});


it.each([
  ['en', 'My History', 'Run', 'Close journal'],
  ['fr', 'Mon historique', 'Partie', 'Fermer le carnet'],
])('renders the paper history in %s without repeating requests', async (locale, title, column, close) => {
  setLocale(locale);
  getJson.mockResolvedValue({ items: [run] });
  render(<HistoryModal playerId="guest" onClose={vi.fn()} />);
  expect(await screen.findByRole('columnheader', { name: column })).toBeTruthy();
  expect(screen.getByRole('dialog', { name: title })).toBeTruthy();
  expect(screen.getByRole('button', { name: close })).toBeTruthy();
  expect(getJson).toHaveBeenCalledTimes(1);
});
