import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  t,
  getLocale,
  setLocale,
  subscribe,
  SUPPORTED_LOCALES,
  STORAGE_KEY,
} from '../i18n/index.js';

describe('i18n core store', () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale('en');
  });

  afterEach(() => {
    localStorage.clear();
    setLocale('en');
  });

  it('defaults to "en" when localStorage is empty', () => {
    expect(getLocale()).toBe('en');
  });

  it('translates basic keys in English', () => {
    setLocale('en');
    expect(t('menu.start_button')).toBe('▶ PLAY NOW');
    expect(t('common.loading')).toBe('Loading…');
    expect(t('game.player_you')).toBe('YOU');
  });

  it('translates keys in Vietnamese when locale is "vi"', () => {
    setLocale('vi');
    expect(t('menu.start_button')).toBe('▶ BẮT ĐẦU CHƠI');
    expect(t('common.loading')).toBe('Đang tải…');
    expect(t('game.player_you')).toBe('BẠN');
  });

  it('translates keys in French when locale is "fr"', () => {
    setLocale('fr');
    expect(t('menu.start_button')).toBe('▶ JOUER');
    expect(t('common.loading')).toBe('Chargement…');
    expect(t('game.player_you')).toBe('VOUS');
  });

  it('interpolates parameters correctly with {param} placeholders', () => {
    setLocale('en');
    expect(t('hud.best_label', { val: 420 })).toBe('Best: 420m');
    expect(t('game.lava_warning_critical', { distance: 50 })).toBe('⚠️ LAVA: 50m REMAINING! ⚠️');

    setLocale('vi');
    expect(t('hud.best_label', { val: 420 })).toBe('Kỷ lục: 420m');
    expect(t('game.lava_warning_critical', { distance: 50 })).toBe('⚠️ DUNG NHAM: CÒN 50m! ⚠️');

    setLocale('fr');
    expect(t('hud.best_label', { val: 420 })).toBe('Record : 420m');
    expect(t('game.lava_warning_critical', { distance: 50 })).toBe('⚠️ LAVE : PLUS QUE 50m ! ⚠️');
  });

  it('falls back to English when a key is missing in another language', () => {
    setLocale('fr');
    // If a key were only in EN, it should fall back to EN
    expect(t('menu.title')).toBe('DOODLE JUMP');
  });

  it('returns key string path when key does not exist anywhere', () => {
    expect(t('nonexistent.nested.key')).toBe('nonexistent.nested.key');
    expect(t('')).toBe('');
    expect(t(null)).toBe('');
  });

  it('notifies subscribers on locale change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setLocale('vi');
    expect(listener).toHaveBeenCalledWith('vi');

    setLocale('fr');
    expect(listener).toHaveBeenCalledWith('fr');

    unsubscribe();
    setLocale('en');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('persists locale choice to localStorage', () => {
    setLocale('fr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('fr');

    setLocale('vi');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('vi');
  });

  it('ignores unsupported locales', () => {
    expect(setLocale('es')).toBe(false);
    expect(getLocale()).toBe('en');
  });

  it('supports all defined SUPPORTED_LOCALES', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'vi', 'fr']);
  });
});
