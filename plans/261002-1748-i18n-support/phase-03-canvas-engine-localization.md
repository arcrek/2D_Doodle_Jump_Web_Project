---
phase: 3
title: "Canvas In-Game Text & Engine Localization"
status: done
priority: P2
effort: 30m
dependencies: ["phase-01-core-i18n-infrastructure.md"]
---

# Phase 3: Canvas In-Game Text & Engine Localization

## Context and Files

- **Modify**:
  - `frontend/src/game/mechanics.js` (Lava warning badge rendering in `renderLava`)
  - `frontend/src/game/doodle-art.js` (Player overhead label in `drawDoodleCharacter`)
  - `frontend/src/game/bots.js` (Display names for opponent bots, preserving IDs)
- **Reference**:
  - `frontend/src/i18n/index.js` (Synchronous `t()` helper)

## Key Insights & Architectural Design

1. **Synchronous Lookups in Canvas Loop:**
   - HTML5 Canvas rendering runs up to 60 times per second in `requestAnimationFrame`. Calling `t(key, params)` must be ultra-fast (O(1) dictionary lookup + simple regex replace), avoiding any memory allocation or asynchronous overhead.
2. **Player Identification Tag:**
   - In `doodle-art.js`, the player bean character renders an overhead tag: `YOU` (EN), `BẠN` (VI), or `VOUS` (FR).
3. **Preserving Bot Identifiers:**
   - Bot IDs (`teacher-son`, `teacher-viet`, etc.) and physics/AI attributes remain completely unchanged. Only display labels rendered on canvas or in live ranking lists reflect localization.

## Requirements

- [x] Localize dynamic in-canvas lava proximity alert badge in `mechanics.js`.
- [x] Localize overhead player identifier in `doodle-art.js` (`YOU` / `BẠN` / `VOUS`).
- [x] Provide optional localized titles for bot racers ("Prof. Son" vs "Thầy Sơn") while maintaining exact bot IDs.
- [x] Ensure 0 performance degradation in the canvas rendering pipeline.

## Implementation Steps

1. **Localize Lava Warning in `mechanics.js` (`frontend/src/game/mechanics.js`):**
   - Import `t` from `../i18n/index.js`.
   - Update `renderLava`:
     ```javascript
     const warningText = isCritical
       ? t('game.lava_warning_critical', { distance: lavaDistance })
       : t('game.lava_warning_notice', { distance: lavaDistance });
     ```
   - English: `⚠️ LAVA: ${lavaDistance}m REMAINING! ⚠️` / `🔥 Lava distance: ${lavaDistance}m`
   - Vietnamese: `⚠️ DUNG NHAM: CÒN ${lavaDistance}m! ⚠️` / `🔥 Dung nham cách: ${lavaDistance}m`
   - French: `⚠️ LAVE : PLUS QUE ${lavaDistance}m ! ⚠️` / `🔥 Distance lave : ${lavaDistance}m`

2. **Localize Player Overhead Tag in `doodle-art.js` (`frontend/src/game/doodle-art.js`):**
   - Import `t` from `../i18n/index.js`.
   - In `drawDoodleCharacter`:
     ```javascript
     const label = isPlayer ? t('game.player_you') : (char.name || 'Bot');
     ```

3. **Verify Canvas Performance:**
   - Ensure `t()` does not parse or re-read JSON on each frame.
   - Dictionaries are loaded once in memory, ensuring immediate sub-millisecond string retrieval.

## Todo

- [x] Import `t` and update lava warning strings in `frontend/src/game/mechanics.js`
- [x] Import `t` and update character overhead label in `frontend/src/game/doodle-art.js`
- [x] Run vitest on physics and mechanics tests to confirm canvas renderers don't throw errors

## Success Criteria

- Canvas lava alert renders in the currently selected language during active gameplay.
- Overhead player label reflects the active language (`YOU`, `BẠN`, `VOUS`).
- Frame rate remains stable at 60 FPS without GC spikes.

## Risk Assessment & Rollback

- **Risk:** Stale translations in canvas if locale changes mid-run.
  - *Mitigation:* Because `renderLava` and `drawDoodleCharacter` call `t()` on every frame, canvas text updates on the very next frame automatically as soon as `setLocale()` is invoked.
- **Rollback:** Revert changes in `mechanics.js` and `doodle-art.js`.
