---
phase: 1
title: "Phase-Gated Lava Rendering & Warning Suppression"
status: completed
priority: P1
effort: "20m"
dependencies: []
---

# Phase 1: Phase-Gated Lava Rendering & Warning Suppression

## Overview
Đảm bảo lớp dung nham (lava gradient) và huy hiệu cảnh báo nguy hiểm chỉ được vẽ lên Canvas trong các giai đoạn thực tế của ván đấu (`running`, `paused`, `finished`, `warmup_hop`, `wipe_reset`), triệt tiêu hoàn toàn khả năng dung nham bị vẽ đè lên các màn hình menu, chọn nhân vật, hoặc hoạt cảnh chuyển động intro.

## Requirements
- Functional:
  - Khi `phase` thuộc nhóm menu/intro (`'ready'`, `'intro_title'`, `'intro_sliding'`, `'intro_menu_delay'`, `'intro_platform'`, `'intro_player'`, `'intro_reveal'`, `'returning_title'`), không bao giờ gọi hàm `renderLava()`.
  - Giữ nguyên hiển thị dung nham khi đang chơi (`'running'`), tạm dừng (`'paused'`), kết thúc ván (`'finished'`), nhún nhảy khởi động (`'warmup_hop'`), và hiệu ứng rèm quét (`'wipe_reset'`).
- Non-functional:
  - Hiệu năng vẽ 60 FPS ổn định, không tạo thêm bộ nhớ rác (garbage collection) mỗi frame.
  - Mã nguồn phẫu thuật tối thiểu (Surgical Change), tuân thủ nguyên tắc KISS & DRY.

## Architecture
Trong [render.js](file:///home/ndpv/2D_Doodle_Jump_Web_Project/frontend/src/game/render.js), tại phân đoạn **4.5. HIỆU ỨNG VẬT PHẨM (POWERUPS) & DUNG NHAM (LAVA)**:
```javascript
if (!isMock) {
  renderPowerups(ctx, world?.platforms, displayPlayer, cameraY, timeSec);
  const showLava = ['running', 'paused', 'finished', 'warmup_hop', 'wipe_reset'].includes(phase);
  if (world?.lava && showLava) {
    renderLava(ctx, world.lava, cameraY, width, height, timeSec, showPlayer ? displayPlayer : null);
  }
}
```
Khối kiểm tra này hoạt động tương tự như khối kiểm tra `showPlayer` ở dòng 177:
`const showPlayer = !['intro_title', 'intro_sliding', 'intro_menu_delay', 'intro_platform', 'ready'].includes(phase);`

## Related Code Files
- Modify: `frontend/src/game/render.js`

## Implementation Steps
1. Mở file [render.js](file:///home/ndpv/2D_Doodle_Jump_Web_Project/frontend/src/game/render.js).
2. Tại dòng 232, thêm hằng số `showLava = ['running', 'paused', 'finished', 'warmup_hop', 'wipe_reset'].includes(phase);`.
3. Cập nhật điều kiện gọi `renderLava`: `if (world?.lava && showLava) { renderLava(...); }`.

## Success Criteria
- [x] Khi chuyển sang phase `ready` (màn hình "Bắt đầu chơi"), canvas không vẽ bất kỳ phần tử nào của dung nham hoặc huy hiệu cảnh báo.
- [x] Khi ở `intro_title` hoặc `returning_title`, không xuất hiện sóng dung nham hoặc dải màu đỏ.
- [x] Khi ở `running`, dung nham và huy hiệu cảnh báo khoảng cách vẫn hiển thị sắc nét và đầy đủ hiệu ứng.

## Risk Assessment
- **Risk:** Nếu thiếu một phase hợp lệ trong danh sách whitelist (ví dụ `wipe_reset`), dung nham có thể biến mất đột ngột trước khi rèm đóng.
  - **Observable Signal:** Dung nham nhấp nháy hoặc biến mất 1 frame trước khi rèm quét qua.
  - **Mitigation:** Đã bao gồm cả `warmup_hop` và `wipe_reset` trong whitelist.
