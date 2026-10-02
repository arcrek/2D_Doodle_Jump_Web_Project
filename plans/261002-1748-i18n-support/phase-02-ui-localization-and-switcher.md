---
phase: 2
title: "UI Components Localization & Language Switcher"
status: done
priority: P1
effort: 1h
dependencies: ["phase-01-core-i18n-infrastructure.md"]
---

# Phase 2: UI Components Localization & Language Switcher

## Context and Files

- **Create**:
  - `frontend/src/components/LanguageSwitcher.jsx` (Doodle pencil-sketch styled language selector pill/dropdown)
- **Modify**:
  - `frontend/src/App.jsx` (Wrap root with `<I18nProvider>`)
  - `frontend/src/pages/GamePage.jsx` (Use `useTranslation()`, replace loading/save alerts, touch controls)
  - `frontend/src/components/HUD.jsx` (Localize `TopBar`, `FloatingHUD`, `HUD`, `StartMenu`, `GameOverModal`, `LeaderboardModal`, and embed `LanguageSwitcher`)
  - `frontend/src/styles.css` (Add styling for `.language-switcher` to fit hand-drawn doodle aesthetic)

## Key Insights & Architectural Design

1. **Intuitive Language Switcher Placement:**
   - On the `StartMenu`: A prominent, clean language selector badge (`[EN] [VI] [FR]`) in the top corner of the comic card allows users to choose their language before starting a run.
   - In the `TopBar`: Inside the hamburger game tools panel (`doodle-tools`), a language selector section allows changing language mid-run or while paused without losing run state.
2. **Accessible Form Controls:**
   - The switcher uses semantic `<button>` elements with `aria-pressed` or standard `<select>` with keyboard navigation, aria labels, and active indicator frames (`PencilFrame`).
3. **No UI Flickering or Text Overflow:**
   - French strings can be longer than English/Vietnamese (e.g. "Commandes" vs "Controls"). Button widths and modal cards are flex-based with word wrapping to avoid clipping.

## Requirements

- [x] Wrap `<App />` with `<I18nProvider>` so all components can access translations.
- [x] Create `frontend/src/components/LanguageSwitcher.jsx` supporting EN, VI, and FR.
- [x] Embed language selector into `StartMenu` and `TopBar` tools menu.
- [x] Replace all hardcoded Vietnamese and English strings in `HUD.jsx` with `t(...)`.
- [x] Replace all hardcoded strings in `GamePage.jsx` with `t(...)`.
- [x] Style the language switcher in `styles.css` using hand-drawn comic borders.

## Implementation Steps

1. **Wrap App with Provider (`frontend/src/App.jsx`):**
   ```jsx
   import { I18nProvider } from './i18n/I18nContext.jsx';
   import GamePage from './pages/GamePage.jsx';

   export default function App() {
     return (
       <I18nProvider>
         <main><GamePage /></main>
       </I18nProvider>
     );
   }
   ```

2. **Implement `LanguageSwitcher.jsx` (`frontend/src/components/LanguageSwitcher.jsx`):**
   - Render three interactive buttons/tabs: `EN` (English), `VI` (Tiếng Việt), `FR` (Français).
   - Display active pill state with `is-active` class and pencil-frame background highlight.
   - Call `setLocale(newLocale)` on click or keypress.

3. **Localize `HUD.jsx` (`frontend/src/components/HUD.jsx`):**
   - Import `useTranslation()` from `../i18n/I18nContext.jsx`.
   - In `TopBar`:
     - aria-labels: `t('topbar.aria_controls')`, `t('topbar.aria_toggle')`, etc.
     - Heading: `t('topbar.title')`, `t('topbar.time_label')`.
     - Buttons: `t('topbar.resume')`, `t('topbar.pause')`, `t('topbar.restart')`, `t('topbar.menu')`.
     - Controls hint: `t('topbar.move_hint')`.
     - Add `<LanguageSwitcher />` in `doodle-tools`.
   - In `FloatingHUD`:
     - `t('hud.best_label', { val: displayMax })` ("Best: {val}m" / "Kỷ lục: {val}m" / "Record: {val}m").
     - `t('hud.current_label', { val: displayCurrent })`.
     - `t('hud.lava_label', { val: lavaDistance })`.
     - `t('hud.leaderboard_title')` ("LEADERBOARD" / "ĐUA TOP" / "CLASSEMENT").
   - In `HUD` (classic panel):
     - Title `t('hud.stats_title')`, phase badges via `t(`hud.phase_${phase}`)`.
     - Labels `t('hud.height_label')`, `t('hud.best_label_short')`, buttons.
   - In `StartMenu`:
     - Title badge `t('menu.edition')`, input label `t('menu.player_name_label')`, placeholder `t('menu.player_name_placeholder')`.
     - Errors: `t('menu.name_required')`, `t('menu.name_max_length')`.
     - Controls: `t('menu.controls_title')`, `t('menu.controls_hint')`.
     - Buttons: `t('menu.start_button')`, `t('menu.leaderboard_button')`, `t('menu.history_button')`.
     - Add `<LanguageSwitcher />` at the top right of `.menu-card`.
   - In `GameOverModal`:
     - Paused: `t('game_over.pause_title')`, `t('game_over.holding_position', { name: nickname })`.
     - Buttons: `t('game_over.resume')`, `t('game_over.restart')`, `t('game_over.menu')`.
     - Finished: title `t('game_over.finish_win_title')` vs `t('game_over.finish_over_title')`.
     - Subtitle by reason: `t('game_over.congrats')`, `t('game_over.lava_death')`, `t('game_over.timeout_death')`, `t('game_over.fall_death')`, `t('game_over.default_death')`.
     - Stat labels: `t('game_over.stat_height')`, `t('game_over.stat_time')`, `t('game_over.stat_rank')`.
     - Save message mapping: if backend returns standard statuses, format via `t('save.saving')`, `t('save.saved')`, `t('save.offline_error')`, `t('save.save_error', { error: err.message })`.
   - In `LeaderboardModal`:
     - Titles: `t('leaderboard.history_title')` vs `t('leaderboard.ranking_title')`.
     - Table columns: `t('leaderboard.col_rank')`, `t('leaderboard.col_player')`, `t('leaderboard.col_height')`, `t('leaderboard.col_time')`.
     - Status: `t('common.loading')`, `t('leaderboard.empty_runs')`, `t('leaderboard.offline_notice')`, `t('leaderboard.fetch_error')`.
     - Close button: `t('common.close')`.

4. **Localize `GamePage.jsx` (`frontend/src/pages/GamePage.jsx`):**
   - Replace loading `<p role="status">` with `t('common.loading')`.
   - Replace backend error alert with `t('common.config_error')` and `t('common.retry')`.
   - Localize touch control `aria-label`s (`t('aria.touch_controls')`, `t('aria.move_left')`, `t('aria.move_right')`).
   - Default player name in profile state: `t('game.default_player_name')` ("Player" / "Bạn" / "Joueur").

5. **Style Language Switcher (`frontend/src/styles.css`):**
   - Add `.language-switcher-group` styling: pencil sketch borders, active button highlight (`#f6df83`), clean typography matching Patrick Hand / Comic Sans / sans-serif.

## Todo

- [x] Create `frontend/src/components/LanguageSwitcher.jsx`
- [x] Update `frontend/src/App.jsx` with `<I18nProvider>`
- [x] Refactor `frontend/src/components/HUD.jsx` to use `useTranslation()`
- [x] Refactor `frontend/src/pages/GamePage.jsx` to use `useTranslation()`
- [x] Add CSS rules for language switcher in `frontend/src/styles.css`
- [x] Verify UI layouts render properly in all 3 languages without text overflow

## Success Criteria

- LanguageSwitcher allows toggling between EN, VI, and FR.
- Every text element in `StartMenu`, `TopBar`, `FloatingHUD`, `GameOverModal`, and `LeaderboardModal` updates instantly when language changes.
- Layout remains visually consistent and aesthetic in all 3 languages.

## Risk Assessment & Rollback

- **Risk:** French strings causing layout breaks due to longer text length.
  - *Mitigation:* Ensure button labels and modal stat boxes use flexible layout rules with text wrapping.
- **Rollback:** Revert modifications in `App.jsx`, `GamePage.jsx`, `HUD.jsx`, and delete `LanguageSwitcher.jsx`.
