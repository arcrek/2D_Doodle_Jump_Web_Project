---
phase: 4
title: "Test Suite Updates & End-to-End Verification"
status: done
priority: P1
effort: 45m
dependencies: ["phase-01-core-i18n-infrastructure.md", "phase-02-ui-localization-and-switcher.md", "phase-03-canvas-engine-localization.md"]
---

# Phase 4: Test Suite Updates & End-to-End Verification

## Context and Files

- **Create**:
  - `frontend/src/tests/i18n-integration.test.jsx` (End-to-end integration test of language switcher and localized UI)
- **Modify**:
  - `frontend/src/tests/hud-tools.test.jsx` (Align with English default text and add multi-language assertions)
  - `frontend/src/tests/completion.test.jsx` (Align StartMenu queries with English default labels)
  - `frontend/src/tests/mechanics.test.js` (Verify lava warning text assertion in canvas)
- **Reference**:
  - `scripts/test.mjs`
  - `FEATURE_MAP.md`

## Key Insights & Architectural Design

1. **Seamless Test Suite Evolution:**
   - Because English is now the primary and default language, unit tests rendering default components will see English text (`"Game Over"`, `"Swallowed by lava!"`, `"PLAY NOW"`, `"Controls:"`).
   - Updating existing tests ensures the default contract is strictly tested, while new tests ensure switching to Vietnamese and French works flawlessly.
2. **Deterministic Test Isolation:**
   - In Vitest beforeEach/afterEach hooks, ensure `localStorage.clear()` is called and `setLocale('en')` resets state so tests never bleed language state between one another.

## Requirements

- [x] Update `hud-tools.test.jsx` to test default English UI and verify Vietnamese/French behavior.
- [x] Update `completion.test.jsx` StartMenu assertions to match default English labels.
- [x] Create `i18n-integration.test.jsx` testing interactive language toggle across EN, VI, and FR.
- [x] Run full test suite: 100% passing across frontend (Vitest) and backend (Pytest).

## Implementation Steps

1. **Update `hud-tools.test.jsx` (`frontend/src/tests/hud-tools.test.jsx`):**
   - Update `TopBar` assertions to match English strings:
     - `screen.getByRole('button', { name: 'Open game controls' })`
     - `screen.getByRole('button', { name: 'Return to main menu' })`
     - `screen.getByRole('button', { name: 'Pause or resume game' })`
   - Update `GameOverModal` assertions to match English strings:
     - `screen.getByText('Game Over')`
     - `screen.getByText('Swallowed by lava!')`
     - `screen.getByText('Result saved.')`
   - Add a test case verifying rendering when locale is set to `'vi'` and `'fr'`.

2. **Update `completion.test.jsx` (`frontend/src/tests/completion.test.jsx`):**
   - In the StartMenu test:
     - `screen.getByLabelText(/Player Name/i)`
     - `screen.getByText(/Controls:/i)`
     - `screen.getByRole('button', { name: /PLAY NOW/i })`

3. **Implement Integration Test `i18n-integration.test.jsx`:**
   - Render `StartMenu` wrapped in `I18nProvider`.
   - Verify initial display is English.
   - Click language switcher button `VI` -> assert title changes to `"BẮT ĐẦU CHƠI"` and `"Tên người chơi"`.
   - Click language switcher button `FR` -> assert title changes to `"JOUER"` and `"Nom du joueur"`.
   - Click language switcher button `EN` -> assert title restores to `"PLAY NOW"` and `"Player Name"`.
   - Test fallback behavior when unknown key or invalid locale is provided.

4. **Run Full Verification:**
   - Execute `npm --prefix frontend run test`
   - Execute `PYTHONPATH=. .venv/bin/pytest`
   - Execute root `npm test`
   - Verify all tests pass with 0 regressions.

## Todo

- [x] Update `frontend/src/tests/hud-tools.test.jsx`
- [x] Update `frontend/src/tests/completion.test.jsx`
- [x] Create `frontend/src/tests/i18n-integration.test.jsx`
- [x] Run `npm test` and ensure all test suites pass

## Success Criteria

- All Vitest test suites pass (`npm --prefix frontend run test`).
- Backend test suite passes (`PYTHONPATH=. .venv/bin/pytest`).
- Root test runner (`npm test`) exits with code 0.
- 0 lint or console warnings related to missing translation keys.

## Risk Assessment & Rollback

- **Risk:** Test flakiness due to leftover `localStorage` values.
  - *Mitigation:* Explicitly reset locale in `beforeEach` and `afterEach` via `setLocale('en')` and `localStorage.clear()`.
- **Rollback:** Revert test file changes.
