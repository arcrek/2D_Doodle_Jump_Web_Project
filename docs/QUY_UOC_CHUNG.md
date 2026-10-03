# Quy ước chung — dùng để làm độc lập

Đây là quy định cho phần sắp viết, chưa phải tính năng đã hoàn thành. Mỗi người dùng đúng dữ liệu và tên hàm dưới đây để trưởng nhóm ghép được.

Trưởng nhóm quản lý file này. Nếu thiếu hoặc mâu thuẫn, gửi một ghi chú cho trưởng nhóm; không tự đổi quy ước hay yêu cầu thành viên khác sửa theo mình.

## 1. Thông số bản đầu

| Nội dung | Giá trị dùng chung |
|---|---|
| Khung game | Rộng 640, cao 520 pixel |
| Nhân vật ban đầu | `{x: 300, y: 388, width: 34, height: 42, vx: 0, vy: 0}` |
| Đi trái/phải | 240 pixel/giây |
| Trọng lực | 1200 pixel/giây² |
| Tốc độ bật nhảy | `vy = -520`, dùng ở PHYS-02 khi chạm bệ |
| `dt` | Số giây giữa hai lần cập nhật; trưởng nhóm giới hạn từ 0 đến `1/30` |

`x, y` là góc trên bên trái nhân vật. `x` tăng sang phải, `y` tăng xuống dưới. FE-01 chỉ sửa `x`; PHYS-01 chỉ sửa `prevY`, `vy`, `y`. Trưởng nhóm truyền cùng một `player` vào hai phần này.

Đi qua mép màn hình và cuộn bản đồ là việc sau; chưa thêm vào FE-01.

## 2. Đọc phím và di chuyển — FE-01

- `createInput()` trả `{state: {left: false, right: false}, destroy()}`. A hoặc mũi tên trái bật `left`; D hoặc mũi tên phải bật `right`.
- Thả hết phím của một hướng thì hướng đó thành `false`. Ví dụ giữ cả A và mũi tên trái, thả A thì vẫn còn đi trái.
- Alt+Tab sang ứng dụng khác phải xóa trạng thái giữ phím. `destroy()` gỡ phần đọc phím và xóa trạng thái.
- `updateHorizontal(player, direction, dt)` cập nhật `player.x += direction * 240 * dt`. Hướng chỉ nhận -1, 0 hoặc 1. Nhấn cả trái lẫn phải thì hướng bằng 0.
- Tự thử: từ `x = 300`, đi phải 30 bước, mỗi bước `dt = 1/60`, phải tới `x = 420`. Đi trái thì tới 180. Chia cùng khoảng thời gian thành bước nhỏ hơn phải ra cùng vị trí.

## 3. Rơi và bệ — PHYS-01, WORLD-01

`applyPhysics(player, dt)` làm lần lượt: lưu `prevY = y`, tăng `vy` thêm `1200 * dt`, rồi tăng `y` thêm `vy * dt`. Dùng tốc độ vừa cập nhật để tính `y`.

Tự thử: `y = 100`, `vy = 0`, `dt = 1/60` phải ra `prevY = 100`, `vy = 20`, `y` khoảng 100,3333. Cho `vy = -520` thì ban đầu đi lên, sau đó rơi. So sánh số thập phân với sai số nhỏ, không yêu cầu bằng tuyệt đối.

`createWorld()` trả `{platforms: [...], cameraY: 0}`. Sáu bệ dùng đúng bảng sau:

| Bệ | x | y | width | height |
|---|---:|---:|---:|---:|
| 1 — dưới chân nhân vật | 230 | 430 | 180 | 16 |
| 2 | 170 | 360 | 180 | 16 |
| 3 | 290 | 290 | 180 | 16 |
| 4 | 170 | 220 | 180 | 16 |
| 5 | 290 | 150 | 180 | 16 |
| 6 | 230 | 80 | 180 | 16 |

Các bệ cách nhau 70 pixel theo chiều cao, có khoảng dự phòng so với sức nhảy đã chốt. Tấn không cần trao đổi với người làm vật lý. Trưởng nhóm thử nhảy lên cả sáu bệ sau khi PHYS-02 làm xong va chạm.

Tự thử WORLD-01: đủ sáu bệ, đúng bảng, nằm trong khung; gọi `createWorld()` hai lần rồi sửa bệ của lần đầu phải không ảnh hưởng lần sau.

## 4. Các thầy đồng hành — BOT-01

Các thầy đồng hành với người chơi, không có điểm hoặc thứ hạng và không chết khi rơi/chạm dung nham. Chỉ người chơi được tính điểm. Contract hiện tại nằm ở [bots.js](../frontend/src/game/bots.js), [mechanics.js](../frontend/src/game/mechanics.js) và [engine.js](../frontend/src/game/engine.js).

`createBots(profiles)` sao chép từng cấu hình nhận vào, không tự thêm `progress`, không sửa dữ liệu nguồn. AI chọn bệ khác nhau khi có lựa chọn trong tầm; nếu chỉ một bệ phù hợp thì vẫn dùng chung.

`updateBotCompanion` xử lý cả nhảy thường và `catchUp`: khi tụt khỏi đáy màn hình, thầy nhảy cao theo quỹ đạo đến bệ gần người chơi; khi lên quá cao, thầy đứng trên bệ chờ camera tới rồi nhảy tiếp. Engine và [simulation.js](../frontend/src/game/simulation.js) dùng cùng cập nhật này; camera theo người chơi.

[ranking.js](../frontend/src/game/ranking.js) là utility của bài tập lịch sử, không được dùng trong gameplay solo hiện tại. Snapshot solo trả `ranking: []`; [GamePage.jsx](../frontend/src/pages/GamePage.jsx) lưu lượt với `placement: 1` để tương thích [API](API.md), không biểu thị thi đua với thầy. API kỷ lục vẫn tương thích; nút và bảng xếp hạng đã bỏ khỏi giao diện.

Tự kiểm tra theo [companions.test.js](../frontend/src/tests/companions.test.js): phân tán mục tiêu phù hợp, dùng chung khi thiếu bệ, bắt kịp tới bệ di động/đổi bệ mất, chờ camera và bất tử. Kiểm tra HUD/kết quả solo ở [completion.test.jsx](../frontend/src/tests/completion.test.jsx).

## 5. Dòng thông tin — UI-01

`HUD({height, elapsedMs, phase})` chỉ đọc dữ liệu nhận vào và hiển thị, không tự tính kết quả game.

- `height`: độ cao, ví dụ 120. Trưởng nhóm sẽ tính từ độ cao lớn nhất đã đạt, lấy mặt bệ đầu là 0; đây không phải tọa độ `y` trên Canvas.
- `elapsedMs`: thời gian đã chơi; 12500 hiển thị thành 12,5 giây (hoặc 12.5 giây).
- `phase`: `ready` → Chưa bắt đầu; `running` → Đang chơi; `paused` → Tạm dừng; `finished` → Kết thúc.

Tự thử số 0, mẫu `{height: 120, elapsedMs: 12500, phase: 'running'}` và đủ bốn trạng thái. Dùng số thử trên trang thì ghi “Dữ liệu thử”. Sau khi ghép, trưởng nhóm truyền số thật qua `GameCanvas` và `GamePage`.

## 6. Lịch sử chơi — BE-01

Làm đúng GET `/api/runs` trong [API.md](API.md). Tự tạo hai mã người chơi hợp lệ và bản ghi mẫu trong cơ sở dữ liệu tạm để thử lọc đúng người, đúng thứ tự, giới hạn 20 lượt, danh sách rỗng và mã sai. Không cần chờ game gửi điểm.

## 7. Tự kiểm tra trước khi gửi

Mỗi người viết bài kiểm tra cho phần mình bằng dữ liệu mẫu bên trên. Thư viện kiểm tra đã có sẵn trong repo.

| Người | File kiểm tra do mình tạo |
|---|---|
| Duc Duong Minh | `frontend/src/tests/input.test.js`, `player.test.js` trong cùng thư mục |
| Hoàng Hải Minh | `frontend/src/tests/physics.test.js` |
| Minh Tấn | `frontend/src/tests/world.test.js` |
| Nguyễn Đình Phú Vinh | `frontend/src/tests/bots.test.js`, `ranking.test.js` trong cùng thư mục |
| Phương VH | `frontend/src/tests/HUD.test.jsx` |
| Nguyễn Đăng Đạt | `backend/tests/test_run_history.py` |
| Nguyễn Tuấn Vinh | `frontend/src/tests/engine.test.js` và thử game sau khi ghép |

Chạy `npm.cmd test` và `npm.cmd run build`, gửi tên file kiểm tra cùng kết quả. Sáu bài kiểm tra sẵn có chỉ kiểm tra bộ khung, chưa đủ để kết luận phần mới làm đúng.

Trưởng nhóm ghép từng phần vào bản dùng để kiểm tra, chạy lại bài kiểm tra và thử hành vi tương ứng. Chỉ đưa vào `dev` khi đạt. Nếu lỗi, trưởng nhóm gửi riêng người phụ trách: dữ liệu đầu vào, kết quả mong đợi và lỗi thực tế. Không giao các thành viên kiểm tra chéo nhau.
