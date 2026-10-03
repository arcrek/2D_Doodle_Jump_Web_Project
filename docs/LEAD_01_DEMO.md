# Phần của trưởng nhóm — bản thử vòng lặp

**Xem thử:** chạy `npm.cmd run dev`, mở **http://localhost:5173/?demo=loop**.

Số “Đã vẽ lại” tăng vì game thực sự vẽ lại mỗi khung. Nhân vật vẫn đứng im. Mở đường dẫn `/` bình thường thì không hiện bộ đếm thử.

## Bạn đã làm gì?

Trong `frontend/src/game/engine.js`:

- **A. Tính thời gian:** `dt` là số giây từ khung trước, tối đa `1/30` giây khi máy khựng.
- **B. Chỗ ghép:** sau này gọi hàm di chuyển, vật lý của các bạn tại đây. Hiện chỗ này để trống.
- **C. Vẽ và lặp:** `render` vẽ lại; `requestAnimationFrame` hẹn trình duyệt chạy tiếp.
- **Dừng:** `destroy()` hủy khung đang chờ. Khung cũ không được vẽ hoặc báo số sau khi game đã đóng.

`GameCanvas.jsx` nhận số khung từ engine và hiển thị bộ đếm thử. Đây không phải điểm, đồng hồ chơi hay HUD của Phương.

## Tự kiểm tra

```powershell
npm.cmd test
npm.cmd run build
```

`frontend/src/tests/engine.test.js` kiểm tra tốc độ 30/60/144 khung mỗi giây, giới hạn thời gian khi máy khựng, nhân vật giữ nguyên vị trí, dừng/tạo lại 10 lần và React StrictMode không tạo vòng lặp trùng.

Trên trình duyệt: mở link demo, thấy bộ đếm tăng nhưng nhân vật đứng im. Đây là phần LEAD-01; phần đọc phím và di chuyển vẫn do người được giao FE-01 làm.

## Kết quả bản thử

- 14 bài kiểm tra đạt (8 bài mới cho vòng lặp); build đạt.
- Trên trình duyệt, bộ đếm tăng từ 10 lên 40; hình trên Canvas giữ nguyên kể cả khi giữ phím phải.
- Đóng engine thử ở khung 2 thì số vẫn là 2 ở các lượt vẽ tiếp theo của trình duyệt.
- Màn hình 390 pixel không tràn ngang; trang game bình thường không hiện bộ đếm demo.
