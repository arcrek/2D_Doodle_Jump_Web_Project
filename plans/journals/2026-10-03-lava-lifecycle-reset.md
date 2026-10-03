# Journal: Lava Lifecycle Reset & Phase-Gated Rendering

- **Date:** 2026-10-03
- **Status:** Completed
- **Branch:** `feature/endless-lava-powerups`
- **Plan Reference:** [`plans/2026-10-03-lava-lifecycle-reset-plan/plan.md`](file:///home/ndpv/2D_Doodle_Jump_Web_Project/plans/2026-10-03-lava-lifecycle-reset-plan/plan.md)

## Summary
Triệt tiêu hoàn toàn lỗi màn hình đỏ và dải dung nham phủ kín Canvas khi người chơi bấm "Chơi lại" hoặc "Về menu". Đồng bộ trạng thái dung nham chính xác tại tất cả các điểm chuyển đổi vòng đời engine, ngăn chặn rò rỉ khoảng cách dung nham ra HUD ngoài gameplay, và bổ sung bộ kiểm thử hồi quy tự động.

## Key Events & Changes
1. **Phase 1 - Phase-Gated Lava Rendering (`render.js`):**
   - Đưa việc gọi hàm `renderLava()` vào danh sách whitelist giai đoạn hợp lệ: `['running', 'paused', 'finished', 'warmup_hop', 'wipe_reset']`.
   - Triệt tiêu hoàn toàn việc vẽ gradient dung nham đỏ và huy hiệu cảnh báo nguy hiểm trong các màn hình `ready`, `intro_*`, và `returning_title`.
2. **Phase 2 - Engine Lifecycle Reset & Stats Guarding (`engine.js`):**
   - Reset `state.world.lava = createLavaState()` ngay khi người chơi bấm "Chơi lại" (`triggerRestartWipe()`).
   - Reset `state.world.lava = createLavaState()` ngay khi người chơi bấm "Về Menu" (`returnToTitleMenu()`).
   - Dọn dẹp `state.world.lava = createLavaState()` khi camera bay lên đỉnh trời (`returning_title` với `progress >= 1`).
   - Che chắn trường `lavaDistance` trong `publishStats()` và `getSnapshot()`, trả về `null` ngoài các phase gameplay đang hoạt động.
3. **Phase 3 - Unit Tests & Regression Verification (`engine.test.js`, `intro-render.test.js`):**
   - Bổ sung các test case kiểm chứng reset tọa độ dung nham về `LAVA_INITIAL_Y` (520) qua các hàm lifecycle.
   - Bổ sung test case kiểm chứng `lavaDistance` bị nullify ở menu/ready và xuất hiện ở phase running.
   - Bổ sung test case kiểm chứng triệt tiêu render dung nham và huy hiệu cảnh báo ở phase `ready` và `intro_title`.

## Decisions & Rationale
- **Multi-point Lifecycle Reset:** Đặt reset ngay tại điểm trigger thay vì chỉ chờ giữa nhịp wipe (`progress >= 0.5`) đảm bảo không có bất kỳ frame nào dung nham cũ bị rò rỉ qua các hiệu ứng chuyển cảnh.
- **Whitelist Phase Rendering:** Bảo vệ kép cả ở tầng logic (Engine) lẫn tầng hiển thị (Render) đảm bảo 0% rủi ro dung nham vẽ đè lên giao diện người dùng.

## Validation Evidence
- **Automated Tests:** 222/222 passed (75 backend pytest + 147 frontend vitest) — 100% pass rate.
- **Frontend Production Build:** `npm run build --prefix frontend` thành công (0 lint/build error).
- **Code Review:** Độc lập bởi `code-reviewer` subagent đạt 10/10 điểm, 0 critical, 0 warning, 0 side effects.

## Follow-ups
- Sẵn sàng tích hợp/commit vào branch `feature/endless-lava-powerups` và chuẩn bị ship lên PR #45.
