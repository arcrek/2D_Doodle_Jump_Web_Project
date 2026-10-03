---
title: Doodle art, powerups and lava UI delivery
status: in-progress
branch: codex/doodle-assets-polish
base: f63b561
---

Outcome: deliver requested title logo, lava/menu cleanup, host-bound pickup reveal, fire and DANGER strip, leaderboard removal, personal history paper styling, restart paper transition, and four supplied powerup assets on current dev; open dev-to-main PR.
Constraints: preserve VI/EN/FR translations and current remote gameplay fixes; exclude unrelated local bot companion, bot entrance, audio and performance work. Do not merge main PR.

- [x] Inspect original assets and produce transparent PNG cutouts.
- [x] Replace rocket/shield sprites; make hollow aura and downward exhaust use held doodle poses.
- [ ] Port scoped changes onto current origin/dev without overwriting translations.
- [ ] Run full tests/build and visual checks against delivery checkout.
- [ ] Review scoped diff, commit/push dev and open main PR.

Image processing: built-in imagegen edit mode, one request per supplied image. Original source files remain unchanged. Project runtime PNGs: frontend/public/images/powerups/{rocket,shield,shield-aura,jet-flame}.png.
Prompts: remove exterior white background while preserving red/white rocket or cyan shield and opaque white interior details; extract only narrow outer cyan aura contours/stars with transparent center and no character; remove white from downward orange/yellow exhaust and retain crayon grain. No added text/shadows/objects. Runtime crop rectangles avoid unused canvas margins.

Prior local verification: 226 frontend tests/build passed for initial logo/lava/history/restart work. Current powerup targeted suite: 33 existing mechanics/scene tests plus 3 new held-frame/expiry/hollow-fallback tests passed. Delivery checkout requires separate verification.
