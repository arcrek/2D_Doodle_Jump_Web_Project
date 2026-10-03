---
phase: 2
title: "Engine Lifecycle Reset & Stats Guarding"
status: completed
priority: P1
effort: "30m"
dependencies: [1]
---

# Phase 2: Engine Lifecycle Reset & Stats Guarding

## Overview
Đưa trạng thái dung nham (`state.world.lava`) về vị trí ban đầu (`LAVA_INITIAL_Y = 520`) tại tất cả các điểm chuyển đổi vòng đời trong game engine (`triggerRestartWipe`, `returnToTitleMenu`, hoàn tất `returning_title`), đồng thời bảo vệ luồng dữ liệu thống kê (`publishStats`, `getSnapshot`) không phát tán khoảng cách dung nham khi đang ở ngoài ván chơi.

## Requirements
- Functional:
  - Khi người chơi bấm "Chơi lại" (`triggerRestartWipe()`), dung nham được reset ngay lập tức về trạng thái xuất phát (`createLavaState()`), đảm bảo rèm đóng mở diễn ra trên nền trạng thái sạch.
  - Khi người chơi bấm "Về Menu" (`returnToTitleMenu()`), dung nham được reset ngay lập tức, ngăn ngừa dữ liệu cũ trôi theo camera.
  - Khi camera hoàn tất bay lên đỉnh trời (`returning_title` với `progress >= 1`), dọn dẹp thêm `state.world.lava = createLavaState()`.
  - Trong `publishStats()` và `getSnapshot()`, trường `lavaDistance` chỉ được tính toán và gửi đi nếu game đang ở các phase chơi hợp lệ (`['running', 'paused', 'finished', 'warmup_hop']`). Ngoài các phase này, `lavaDistance` trả về `null`.
- Non-functional:
  - Giữ vững tính bất biến và toàn vẹn của game state.
  - Không phá vỡ các hợp đồng API đã có với React HUD / FloatingHUD.

## Architecture
1. **Lifecycle Hooks Update in `engine.js`:**
   - Trong `triggerRestartWipe()`:
     ```javascript
     function triggerRestartWipe() {
       if (phase === 'wipe_reset') return;
       setPhase('wipe_reset');
       wipeStartTime = null;
       wipeResetTriggered = false;
       if (state.world) state.world.lava = createLavaState();
       sound.playWipe();
     }
     ```
   - Trong `returnToTitleMenu()`:
     ```javascript
     function returnToTitleMenu() {
       if (phase === 'returning_title' || phase === 'intro_title') return;
       if (state.world) state.world.lava = createLavaState();
       ...
     ```
   - Trong giai đoạn `returning_title` khi `progress >= 1`:
     ```javascript
     if (progress >= 1) {
       ...
       if (state.world) state.world.lava = createLavaState();
       setPhase('intro_title');
     }
     ```
2. **Stats Guarding:**
   - Trong `publishStats(time)`:
     ```javascript
     const isGameplayPhase = ['running', 'paused', 'finished', 'warmup_hop'].includes(phase);
     const lavaDistance = (state.world?.lava && isGameplayPhase)
       ? Math.max(0, Math.round(state.world.lava.y - (state.player.y + state.player.height)))
       : null;
     ```
   - Trong `getSnapshot()`:
     ```javascript
     const isGameplayPhase = ['running', 'paused', 'finished', 'warmup_hop'].includes(phase);
     ...
     lavaDistance: (state.world?.lava && isGameplayPhase)
       ? Math.max(0, Math.round(state.world.lava.y - (state.player.y + state.player.height)))
       : null,
     ```

## Related Code Files
- Modify: `frontend/src/game/engine.js`

## Implementation Steps
1. Mở file [engine.js](file:///home/ndpv/2D_Doodle_Jump_Web_Project/frontend/src/game/engine.js).
2. Thêm reset lava vào `triggerRestartWipe()`.
3. Thêm reset lava vào `returnToTitleMenu()`.
4. Thêm reset lava vào khối xử lý hoàn tất `returning_title` (dòng ~655).
5. Thêm điều kiện `isGameplayPhase` cho `lavaDistance` trong `publishStats()` (dòng ~234).
6. Thêm điều kiện `isGameplayPhase` cho `lavaDistance` trong `getSnapshot()` (dòng ~972).

## Success Criteria
- [x] Bất kể ván chơi trước lava đã dâng cao đến đâu (ví dụ -3000px), ngay khi gọi `triggerRestartWipe()` hoặc `returnToTitleMenu()`, `state.world.lava.y` lập tức trở về 520.
- [x] Không có tình trạng HUD hiển thị thông số dung nham khi đang ở các màn hình chọn nhân vật / menu.

## Risk Assessment
- **Risk:** Gọi `createLavaState()` khi `state.world` chưa được khởi tạo.
  - **Observable Signal:** `TypeError: Cannot set properties of undefined (setting 'lava')`.
  - **Mitigation:** Dùng optional check: `if (state.world) state.world.lava = createLavaState();` hoặc fallback an toàn.
