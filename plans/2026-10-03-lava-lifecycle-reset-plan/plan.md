# Plan: Lava Lifecycle Reset & Phase-Gated Rendering (Phương Án 1)

## Executive Summary
Khi dung nham (lava) dâng lên và người chơi chọn **Chơi lại** hoặc **Quay về Menu**, thực thể `lava` không được đưa về vị trí ban đầu (`LAVA_INITIAL_Y = 520`) ở toàn bộ các điểm chuyển trạng thái (lifecycle hooks). Đồng thời, module `render.js` gọi hàm `renderLava` vô điều kiện ở mọi giai đoạn (kể cả khi `phase === 'ready'` lúc đang hiển thị modal "Bắt đầu chơi"), khiến gradient dung nham đỏ và huy hiệu cảnh báo nguy hiểm phủ kín toàn bộ màn hình. 

Kế hoạch này triển khai **Phương án 1 (Multi-point lifecycle reset & Phase-gated rendering)** nhằm triệt tiêu hoàn toàn lỗi màn hình đỏ, đồng bộ trạng thái dung nham chuẩn xác và bổ sung bộ kiểm thử tự động ngăn chặn tái diễn.

---

## Metadata
- **Status:** completed
- **Mode:** auto (fast/focused)
- **Branch:** `feature/endless-lava-powerups`
- **Target PR:** PR #45 (merged to `dev`)
- **Estimated Effort:** 1.5 hours
- **Affected Subsystems:** `frontend/src/game/engine.js`, `frontend/src/game/render.js`, `frontend/src/tests/`

---

## Root Cause Analysis
1. **Engine Lifecycle Leak:**
   - Trong `frontend/src/game/engine.js`, hàm `returnToTitleMenu()` và giai đoạn `returning_title` (khi camera bay ngược lên đỉnh `Y_INTRO`) dọn dẹp `platforms`, `bots`, nhưng bỏ sót `state.world.lava = createLavaState()`. Tọa độ `lava.y` từ ván cũ vẫn lưu trong bộ nhớ.
   - Khi gọi `triggerRestartWipe()`, `state.world.lava` chỉ được reset tại mốc rèm đóng `progress >= 0.5`. Nếu có ngắt nhịp hoặc chuyển phase, dung nham cũ vẫn tồn tại.
2. **Unconditional Render Pipeline:**
   - Trong `frontend/src/game/render.js` (dòng 232-235), `renderLava` được gọi bất kể `phase` hiện tại là gì.
   - Khi người chơi ở màn hình `ready` (chọn skin, tên), `cameraY = 0`. Nếu `lava.y <= 0` hoặc gần mặt đất, `screenLavaY = lava.y - cameraY` khiến dung nham vẽ trùm kín từ đáy lên đỉnh màn hình và hiển thị huy hiệu `⚠️ DUNG NHAM: CÒN 90m! ⚠️`.
3. **HUD Stats Leak:**
   - `publishStats()` và `getSnapshot()` tính toán `lavaDistance` ngay cả khi game chưa thực sự bắt đầu, có thể gửi dữ liệu cảnh báo sai lệch ra FloatingHUD.

---

## Phase Breakdown

| Phase | Title | Priority | Status | Files | Effort |
|-------|-------|----------|--------|-------|--------|
| [Phase 1](file:///home/ndpv/2D_Doodle_Jump_Web_Project/plans/2026-10-03-lava-lifecycle-reset-plan/phase-01-render-guard.md) | Phase-Gated Lava Rendering & Warning Suppression | P1 | completed | `frontend/src/game/render.js` | 20m |
| [Phase 2](file:///home/ndpv/2D_Doodle_Jump_Web_Project/plans/2026-10-03-lava-lifecycle-reset-plan/phase-02-engine-lifecycle-reset.md) | Engine Lifecycle Reset & Stats Guarding | P1 | completed | `frontend/src/game/engine.js` | 30m |
| [Phase 3](file:///home/ndpv/2D_Doodle_Jump_Web_Project/plans/2026-10-03-lava-lifecycle-reset-plan/phase-03-test-verification.md) | Unit Tests & Regression Verification | P2 | completed | `frontend/src/tests/intro-render.test.js`, `frontend/src/tests/engine.test.js` | 30m |

---

## Architecture & Data Flow

```
[User Action: 'Chơi Lại' / 'Về Menu' / 'Bắt đầu chơi']
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Engine Lifecycle Hook Triggered                           │
│    - triggerRestartWipe(): Reset lava to initial Y (520)    │
│    - returnToTitleMenu(): Reset lava to initial Y (520)     │
│    - returning_title (progress >= 1): Reset lava state      │
│    - startSlideDown(): Reset lava & spawn powerups          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Phase-Gated Rendering Guard                              │
│    - Allowed phases: running, paused, finished,             │
│      warmup_hop, wipe_reset                                 │
│    - Suppressed phases: ready, intro_title, intro_sliding,  │
│      intro_platform, intro_player, returning_title, etc.    │
│    => 0% rủi ro dung nham vẽ đè lên StartMenu / Title      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Stats Guarding                                           │
│    - publishStats / getSnapshot: lavaDistance = null outside│
│      active gameplay phases                                 │
│    => HUD không hiển thị huy hiệu báo động giả              │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Criteria
1. Chơi game để lava dâng cao (ví dụ lên độ cao 500m - 1000m), sau đó chết và bấm **Chơi lại**:
   - Màn hình chuyển cảnh wipe mượt mà, không lóe màu đỏ, không dính nền đỏ.
   - Dung nham bắt đầu từ vị trí xuất phát `LAVA_INITIAL_Y = 520` (sau chân người chơi).
2. Chết và bấm **Về Menu**:
   - Camera trượt lên bầu trời mượt mà, không thấy dung nham bay theo.
   - Bấm nút **START** trượt xuống đất vào màn hình "Bắt đầu chơi" (phase `ready`): Nền giấy tập kẻ ô sáng sủa, không dính màu đỏ, không có huy hiệu cảnh báo dung nham.
3. Test suite:
   - `node scripts/test.mjs` chạy qua 100% tests (tối thiểu 218 tests).
   - `npm run build --prefix frontend` biên dịch thành công không có lỗi lint/bundle.
