---
phase: 1
title: "Core i18n Infrastructure & Dictionaries"
status: done
priority: P1
effort: 45m
dependencies: []
---

# Phase 1: Core i18n Infrastructure & Dictionaries

## Context and Files

- **Create**:
  - `frontend/src/locales/en.json` (English primary dictionary - source of truth)
  - `frontend/src/locales/vi.json` (Vietnamese dictionary)
  - `frontend/src/locales/fr.json` (French dictionary)
  - `frontend/src/i18n/index.js` (Zero-dependency reactive core i18n store)
  - `frontend/src/i18n/I18nContext.jsx` (React 19 Context provider and `useTranslation` hook)
  - `frontend/src/tests/i18n.test.js` (Unit tests for i18n logic)
- **Reference**:
  - `frontend/src/pages/GamePage.jsx`
  - `frontend/src/components/HUD.jsx`
  - `frontend/src/game/mechanics.js`

## Key Insights & Architectural Design

1. **Zero External Dependencies:** Built with pure ESM and native React 19 primitives (`useSyncExternalStore` or React Context). This prevents npm peer-dependency churn and keeps the bundle lightweight.
2. **Dual-Environment Access:** The core module exports `t(key, params)` synchronously so it can be called directly both inside React render trees and inside the vanilla HTML5 Canvas animation loop (`requestAnimationFrame` in `engine.js` / `mechanics.js`).
3. **Robust Fallback Strategy:** If a translation key is missing in the active locale (e.g. `fr`), it falls back to `en`. If still missing, it returns the key path rather than crashing.
4. **Persistent Locale Preference:** User selection is saved to `localStorage` under `doodle_jump_locale`, defaulting to `'en'` if not set.

## Requirements

- [x] Create `frontend/src/locales/en.json` covering all UI, HUD, canvas alerts, modal states, and accessibility labels.
- [x] Create `frontend/src/locales/vi.json` mirroring `en.json` with accurate Vietnamese terminology.
- [x] Create `frontend/src/locales/fr.json` mirroring `en.json` with accurate French terminology.
- [x] Implement `frontend/src/i18n/index.js` with `t()`, `setLocale()`, `getLocale()`, `subscribe()`, and `{param}` interpolation.
- [x] Implement `frontend/src/i18n/I18nContext.jsx` with `I18nProvider` and `useTranslation()`.
- [x] Add comprehensive unit tests in `frontend/src/tests/i18n.test.js` verifying store behavior, fallback, interpolation, and subscribers.

## Implementation Steps

1. **Draft Dictionary Schemas (`en.json`, `vi.json`, `fr.json`):**
   - Structure keys by domain:
     - `common`: `loading`, `error`, `retry`, `close`, `back_to_menu`, `restart`, `play_again`
     - `menu`: `title`, `edition`, `player_name_label`, `player_name_placeholder`, `name_required`, `name_max_length`, `controls_title`, `controls_hint`, `start_button`, `leaderboard_button`, `history_button`
     - `topbar`: `aria_controls`, `aria_toggle`, `title`, `time_label`, `resume`, `pause`, `restart`, `menu`, `move_hint`
     - `hud`: `score_title`, `best_label`, `current_label`, `lava_label`, `leaderboard_title`, `height_label`, `time_label`, `phase_ready`, `phase_running`, `phase_paused`, `phase_finished`
     - `game_over`: `pause_title`, `holding_position`, `finish_win_title`, `finish_over_title`, `congrats`, `lava_death`, `timeout_death`, `fall_death`, `default_death`, `stat_height`, `stat_time`, `stat_rank`
     - `leaderboard`: `history_title`, `ranking_title`, `col_rank`, `col_player`, `col_height`, `col_time`, `empty_runs`, `offline_notice`, `fetch_error`
     - `game`: `lava_warning_critical`, `lava_warning_notice`, `player_you`, `default_player_name`
     - `save`: `saving`, `saved`, `offline_error`, `save_error`
     - `aria`: `touch_controls`, `move_left`, `move_right`, `close_button`

2. **Implement Core Store (`frontend/src/i18n/index.js`):**
   - Load dictionaries statically.
   - Maintain `currentLocale` state initialized from `localStorage.getItem('doodle_jump_locale') || 'en'`.
   - Implement `t(key, params)`: split dotted paths (`menu.title`), retrieve value, fall back to `en`, substitute `{var}` placeholders.
   - Implement `setLocale(locale)`: validate against `SUPPORTED_LOCALES = ['en', 'vi', 'fr']`, update state, store in `localStorage`, notify subscribers.
   - Implement `subscribe(fn)`: return unsubscribe function.

3. **Implement React Integration (`frontend/src/i18n/I18nContext.jsx`):**
   - Provide `I18nContext`.
   - Wrap tree with `I18nProvider`.
   - Provide hook `useTranslation()` returning `{ t, locale, setLocale, locales: ['en', 'vi', 'fr'] }`.

4. **Write Unit Tests (`frontend/src/tests/i18n.test.js`):**
   - Test default locale is `'en'`.
   - Test basic key translation in `en`, `vi`, `fr`.
   - Test `{param}` interpolation (e.g. `{distance}m`).
   - Test fallback when key is absent in `fr` or `vi`.
   - Test `setLocale()` updates current locale and notifies listeners.
   - Test `localStorage` reading and writing.

## Todo

- [x] Write `frontend/src/locales/en.json`
- [x] Write `frontend/src/locales/vi.json`
- [x] Write `frontend/src/locales/fr.json`
- [x] Write `frontend/src/i18n/index.js`
- [x] Write `frontend/src/i18n/I18nContext.jsx`
- [x] Write `frontend/src/tests/i18n.test.js`
- [x] Run vitest on `i18n.test.js` to ensure green status

## Success Criteria

- `npm --prefix frontend run test -- src/tests/i18n.test.js` passes with 100% of tests green.
- All three locale dictionaries are valid JSON without syntax or missing interpolation markers.
- Switching locale via `setLocale` triggers subscriber notifications synchronously.

## Risk Assessment & Rollback

- **Risk:** Missing locale keys causing UI blank text.
  - *Mitigation:* Strict fallback chain: `activeLocale -> en -> keyPath`.
- **Rollback:** Delete `frontend/src/locales/` and `frontend/src/i18n/`.
