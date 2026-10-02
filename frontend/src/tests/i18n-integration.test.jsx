import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, useTranslation } from '../i18n/I18nContext.jsx';
import { getLocale, setLocale, STORAGE_KEY } from '../i18n/index.js';
import { StartMenu, TopBar, GameOverModal } from '../components/HUD.jsx';

describe('i18n Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale('en');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    setLocale('en');
  });

  it('interactively toggles languages across EN, VI, and FR in the StartMenu', () => {
    render(
      <I18nProvider>
        <StartMenu
          initialSkin="doodle"
          onStartGame={vi.fn()}
          onOpenLeaderboard={vi.fn()}
          onOpenHistory={vi.fn()}
        />
      </I18nProvider>
    );

    // Initial state: English
    expect(screen.getByRole('button', { name: /PLAY NOW/i })).toBeTruthy();
    expect(screen.getByLabelText(/Player Name/i)).toBeTruthy();
    expect(screen.getByText(/Controls:/i)).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null);

    // Switch to Vietnamese
    fireEvent.click(screen.getByText('VI'));

    expect(screen.getByRole('button', { name: /BẮT ĐẦU CHƠI/i })).toBeTruthy();
    expect(screen.getByLabelText(/Tên người chơi/i)).toBeTruthy();
    expect(screen.getByText(/Cách điều khiển/i)).toBeTruthy();
    expect(getLocale()).toBe('vi');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('vi');

    // Switch to French
    fireEvent.click(screen.getByText('FR'));

    expect(screen.getByRole('button', { name: /JOUER/i })).toBeTruthy();
    expect(screen.getByLabelText(/Nom du joueur/i)).toBeTruthy();
    expect(screen.getByText(/Commandes/i)).toBeTruthy();
    expect(getLocale()).toBe('fr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('fr');

    // Switch back to English
    fireEvent.click(screen.getByText('EN'));

    expect(screen.getByRole('button', { name: /PLAY NOW/i })).toBeTruthy();
    expect(screen.getByLabelText(/Player Name/i)).toBeTruthy();
    expect(screen.getByText(/Controls:/i)).toBeTruthy();
    expect(getLocale()).toBe('en');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('updates TopBar and controls menu seamlessly on language switch', () => {
    render(
      <I18nProvider>
        <TopBar
          elapsedMs={5000}
          phase="running"
          onTogglePause={vi.fn()}
          onRestart={vi.fn()}
          onExitToMenu={vi.fn()}
        />
      </I18nProvider>
    );

    // Open hamburger menu
    const toggle = screen.getByRole('button', { name: 'Open game controls' });
    fireEvent.click(toggle);

    expect(screen.getByText('Controls')).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();

    // Toggle language inside TopBar
    fireEvent.click(screen.getByText('VI'));

    expect(screen.getByText('Điều khiển')).toBeTruthy();
    expect(screen.getByText('Tạm dừng')).toBeTruthy();
  });

  it('translates GameOverModal dynamically across languages', () => {
    const { rerender } = render(
      <I18nProvider>
        <GameOverModal
          phase="finished"
          height={2800}
          elapsedMs={28000}
          placement={2}
          nickname="Doodler"
          outcome="dnf"
          reason="lava"
          save={{ status: 'saved', message: 'Result saved.' }}
          onResume={vi.fn()}
          onRestart={vi.fn()}
          onExitToMenu={vi.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Game Over')).toBeTruthy();
    expect(screen.getByText('Swallowed by lava!')).toBeTruthy();

    act(() => {
      setLocale('fr');
    });
    rerender(
      <I18nProvider>
        <GameOverModal
          phase="finished"
          height={2800}
          elapsedMs={28000}
          placement={2}
          nickname="Doodler"
          outcome="dnf"
          reason="lava"
          save={{ status: 'saved', message: 'Résultat enregistré.' }}
          onResume={vi.fn()}
          onRestart={vi.fn()}
          onExitToMenu={vi.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Fin de partie')).toBeTruthy();
    expect(screen.getByText('Englouti par la lave !')).toBeTruthy();
  });

  it('provides useTranslation hook fallback when used outside provider', () => {
    function StandaloneComponent() {
      const { t, locale } = useTranslation();
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <span data-testid="text">{t('menu.title')}</span>
        </div>
      );
    }

    render(<StandaloneComponent />);
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('text').textContent).toBe('DOODLE JUMP');
  });
});
