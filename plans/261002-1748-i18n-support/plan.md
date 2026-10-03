---
title: "Implement i18n with English, Vietnamese, and French"
description: "Zero-dependency reactive i18n store, React context hook, locale dictionaries, HUD/StartMenu localization, in-canvas text sync, and language switcher."
status: completed
priority: P1
effort: 3h
branch: feat/i18n-support
tags: [frontend, i18n, ui]
blockedBy: []
blocks: []
created: 2026-10-02
---

# Implement i18n with English, Vietnamese, and French

## Overview

Implement a complete, zero-dependency internationalization (i18n) solution for Doodle Jump USTH.
English (`en`) is the primary default language, with Vietnamese (`vi`) and French (`fr`) as fully supported additional languages.
The system features a dual-access architecture: React components access translations via the `useTranslation()` hook, while the HTML5 2D Canvas rendering loop accesses translations synchronously via `t(key, params)` with zero frame drops. Players can switch languages at any time from the Start Menu or the TopBar controls menu, with choices persisted in `localStorage`.

## Architecture & Key Decisions

- **Approach 1 Selection:** Pure ESM core module (`frontend/src/i18n/index.js`) + React 19 Context (`I18nContext.jsx`) + JSON dictionaries (`en.json`, `vi.json`, `fr.json`). No external npm dependencies, keeping the application fast and lightweight.
- **Dual-Environment Access:** Synchronous `t(key, params)` export allows in-canvas dynamic rendering (e.g. lava proximity alerts in `mechanics.js` and player tags in `doodle-art.js`) to stay synchronized with the UI without asynchronous latency.
- **English Default & Fallback Chain:** Fresh sessions default to English. Missing keys in `vi` or `fr` fall back automatically to `en`. If a key is completely absent, it returns the key path without throwing runtime errors.
- **Persistent Preferences:** User language choice is stored in `localStorage` under `doodle_jump_locale`.
- **Test Integrity:** Existing tests asserting Vietnamese strings are updated to assert the new default English interface, accompanied by dedicated integration tests verifying language switching to Vietnamese and French.

## Phases

| Phase | Name | Status | Acceptance |
|---|---|---|---|
| 1 | [Core i18n Infrastructure & Dictionaries](./phase-01-core-i18n-infrastructure.md) | Completed | `i18n.test.js` passes with 100% coverage of lookup, interpolation, and fallback. |
| 2 | [UI Components Localization & Language Switcher](./phase-02-ui-localization-and-switcher.md) | Completed | StartMenu, TopBar, HUD, modals, and touch controls localized; language switcher interactive. |
| 3 | [Canvas In-Game Text & Engine Localization](./phase-03-canvas-engine-localization.md) | Completed | Canvas lava alerts and overhead player tags localized; 60 FPS performance maintained. |
| 4 | [Test Suite Updates & End-to-End Verification](./phase-04-test-suite-and-verification.md) | Completed | `npm test` passes 100% (Vitest + Pytest) with new multi-language integration tests. |

## Completion Criteria

- [x] `frontend/src/locales/en.json`, `vi.json`, and `fr.json` provide complete translation coverage.
- [x] `frontend/src/i18n/index.js` provides reactive store with fallback, interpolation, and `localStorage` persistence.
- [x] `frontend/src/i18n/I18nContext.jsx` provides `I18nProvider` and `useTranslation()`.
- [x] `frontend/src/components/LanguageSwitcher.jsx` is integrated into Start Menu and TopBar controls.
- [x] `HUD.jsx` and `GamePage.jsx` components are completely localized across EN, VI, and FR.
- [x] Dynamic in-canvas lava warnings (`mechanics.js`) and player overhead tags (`doodle-art.js`) are localized.
- [x] Unit and integration tests verify language switching, fallback, and storage persistence.
- [x] Root test runner (`npm test`) passes 100% with zero regressions.

Implementation handoff: `/ak:cook plans/261002-1748-i18n-support/plan.md`.