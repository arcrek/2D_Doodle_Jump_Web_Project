---
phase: 3
title: "Unit Tests & Regression Verification"
status: completed
priority: P2
effort: "30m"
dependencies: [1, 2]
---

# Phase 3: Unit Tests & Regression Verification

## Overview
Viết các bài kiểm thử đơn vị tự động (Unit Tests) để xác nhận hành vi reset dung nham và triệt tiêu render ở các phase ngoài trận đấu, đồng thời chạy toàn bộ bộ kiểm thử của dự án (`node scripts/test.mjs`) và kiểm tra build frontend.

## Requirements
- Functional:
  - Bổ sung test case trong `frontend/src/tests/engine.test.js`:
    - Kiểm tra `lava.y` được reset về `LAVA_INITIAL_Y` (520) khi gọi `triggerRestartWipe()`.
    - Kiểm tra `lava.y` được reset khi gọi `returnToTitleMenu()`.
    - Kiểm tra `getSnapshot().lavaDistance` trả về `null` khi ở phase `ready`, `intro_title`.
  - Bổ sung test case trong `frontend/src/tests/mechanics.test.js` (hoặc `render.test.js` nếu có):
    - Kiểm tra hàm render và các điều kiện hiển thị theo phase.
- Non-functional:
  - Toàn bộ test suite của dự án (75 backend tests + 143+ frontend tests) đạt 100% PASS.
  - Quá trình build `npm run build --prefix frontend` hoàn thành thành công mà không có cảnh báo/lỗi mới.

## Architecture
Tận dụng môi trường kiểm thử không cần DOM hoặc có mock Canvas trong `frontend/src/tests/engine.test.js`:
```javascript
test('engine resets lava state on triggerRestartWipe and returnToTitleMenu', () => {
  const engine = createGameEngine({ canvas: mockCanvas, config: { isEndless: true } });
  // Giả lập lava dâng cao
  engine.getState().world.lava.y = -1000;
  assert.strictEqual(engine.getState().world.lava.y, -1000);

  // Kích hoạt chơi lại
  engine.triggerRestartWipe();
  assert.strictEqual(engine.getState().world.lava.y, LAVA_INITIAL_Y);
});
```

## Related Code Files
- Modify: `frontend/src/tests/engine.test.js`
- Modify: `frontend/src/tests/mechanics.test.js`

## Implementation Steps
1. Mở file [engine.test.js](file:///home/ndpv/2D_Doodle_Jump_Web_Project/frontend/src/tests/engine.test.js).
2. Thêm các bài test kiểm tra việc reset dung nham qua các hàm lifecycle (`triggerRestartWipe`, `returnToTitleMenu`).
3. Thêm bài test kiểm tra `lavaDistance` bị ẩn (`null`) khi phase không phải gameplay.
4. Chạy `node scripts/test.mjs` để xác nhận toàn bộ test suite vượt qua.
5. Chạy `npm run build --prefix frontend` để kiểm tra đóng gói bundle.

## Success Criteria
- [x] Các bài kiểm thử mới thêm chạy pass 100%.
- [x] Toàn bộ 218+ tests của dự án đều xanh (0 failure) (222/222 passed).
- [x] Bundle frontend build thành công.

## Risk Assessment
- **Risk:** Mock engine trong test có thể thiếu một số trường state phụ thuộc.
  - **Observable Signal:** Lỗi `Cannot read properties of null` trong lúc chạy test.
  - **Mitigation:** Dùng helper khởi tạo `createGameEngine` chuẩn đã có sẵn trong `engine.test.js`.
