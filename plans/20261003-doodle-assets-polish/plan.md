---
title: Consolidated doodle game, teacher intros and personal history
status: validated
branch: codex/doodle-assets-polish
base: f63b561
previous_pr: https://github.com/haohan233-tvinh/2D_Doodle_Jump_Web_Project/pull/51 (merged by user)
---

Outcome: deliver requested title logo, lava/menu cleanup, host-bound pickup reveal, fire and DANGER strip, leaderboard removal, personal history paper styling, restart paper transition, and four supplied powerup assets on current dev; open dev-to-main PR.
Constraints: preserve VI/EN/FR translations and current remote gameplay fixes; include the requested consolidated teacher names/portraits, companion behavior, entrance intros, audio lifecycle and asset performance work. Preserve the original local checkout. Do not merge main PR.

- [x] Inspect original assets and produce transparent PNG cutouts.
- [x] Replace rocket/shield sprites; make hollow aura and downward exhaust use held doodle poses.
- [x] Port scoped changes onto current origin/dev without overwriting translations.
- [x] Run full tests/build and visual checks against delivery checkout.
- [ ] Commit the consolidated changes, sync the user-merged main, push dev and open a new dev-to-main PR.

Image processing: built-in imagegen edit mode, one request per supplied image. Original source files remain unchanged. Project runtime PNGs: frontend/public/images/powerups/{rocket,shield,shield-aura,jet-flame}.png.
Prompts: remove exterior white background while preserving red/white rocket or cyan shield and opaque white interior details; extract only narrow outer cyan aura contours/stars with transparent center and no character; remove white from downward orange/yellow exhaust and retain crayon grain. No added text/shadows/objects. Runtime crop rectangles avoid unused canvas margins.

Prior local verification: 226 frontend tests/build passed for initial logo/lava/history/restart work. Current powerup targeted suite: 33 existing mechanics/scene tests plus 3 new held-frame/expiry/hollow-fallback tests passed. Delivery checkout requires separate verification.

Consolidated verification: 254 frontend tests across 24 files passed; 77 backend tests passed; production build and integrity check for all 8 portrait derivatives passed. No conflict markers or whitespace errors. Current browser QA could not be repeated because the in-app tab remains an internal error page and browser policy blocks controlling that state; no alternate surface used to bypass it. Prior asset visual checks are retained, but they do not verify this final consolidated checkout.
