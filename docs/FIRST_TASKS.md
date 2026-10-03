# Việc đầu tiên của từng người

Chạy được dự án theo [START_HERE.md](START_HERE.md), rồi tìm tên mình bên dưới. Mỗi người làm một phần nhỏ để trưởng nhóm ghép lại.

**A = Làm gì. B = Viết ở đâu. C = Tự kiểm tra.** Đây là việc cần làm, chưa phải tính năng đã có.

## Quy ước để ghép được

- File ghép chính của game là **`frontend/src/game/engine.js`**. Chỉ trưởng nhóm sửa file này. `frontend/src/main.jsx` chỉ dùng để mở ứng dụng React.
- Mỗi người viết vào file được giao, đặt tên hàm đúng như mục B và thêm `export` trước hàm. Không tạo Canvas hay vòng lặp game riêng.
- `player` là nhân vật; `dt` là số giây từ lần cập nhật trước. `x` tăng là sang phải, `y` tăng là đi xuống. Các phần dùng chung dữ liệu nhân vật mà trưởng nhóm truyền vào.
- Bên dưới, `game/...`, `pages/...`, `components/...` đều nằm trong `frontend/src/`.
- Dùng thông số và dữ liệu mẫu trong [QUY_UOC_CHUNG.md](QUY_UOC_CHUNG.md). Mỗi người tự làm, tự kiểm tra phần mình; trưởng nhóm phụ trách ghép và kiểm tra bản chung.
- Không cần kiểm tra bài của nhau hoặc hỏi nhau để chốt thông số. Chỉ báo trưởng nhóm khi quy ước còn thiếu hoặc có lỗi không tự giải quyết được.

## Duc Duong Minh — FE-01

**A. Làm gì:** Làm nhân vật đi được trái/phải bằng A/D hoặc hai phím mũi tên. Thả phím thì dừng; Alt+Tab sang ứng dụng khác thì xóa phím đang giữ.

**B. Viết ở đâu:** `game/input.js` viết `createInput()` để đọc phím. Trả về `state.left`, `state.right` là đúng/sai và `destroy()` để ngừng đọc phím. `game/player.js` viết `updateHorizontal(player, direction, dt)` để đổi vị trí ngang; hướng `-1` là trái, `0` là đứng yên, `1` là phải.

**C. Tự kiểm tra:** Dùng nhân vật mẫu, thử đi trái/phải ở tốc độ đã chốt 240 pixel/giây. Thử nhấn, thả phím và Alt+Tab; nhấn cả trái lẫn phải thì đứng yên. Làm bài kiểm tra riêng, không cần chờ game cập nhật liên tục.

## Hoàng Hải Minh — PHYS-01

**A. Làm gì:** Làm nhân vật rơi xuống. Khi được đẩy lên thì bay lên, chậm dần rồi rơi. Phần chạm bệ để bật nhảy làm ở bước tiếp theo (PHYS-02).

**B. Viết ở đâu:** `game/physics.js`, hàm `applyPhysics(player, dt)`. Lưu vị trí cũ vào `prevY`, rồi cập nhật tốc độ dọc `vy` và vị trí `y`.

**C. Tự kiểm tra:** Dùng nhân vật mẫu và trọng lực 1200 trong quy ước chung. Đứng trên không thì rơi; bắt đầu với `vy = -520` thì lên rồi rơi. Đối chiếu kết quả mẫu, không cần đợi bệ hoặc phần trái/phải.

## Minh Tấn — WORLD-01

**A. Làm gì:** Thêm năm bệ, để màn hình có tổng cộng sáu bệ cho nhân vật nhảy lên.

**B. Viết ở đâu:** `game/world.js`, sửa `createWorld()`. Dùng đúng sáu bệ trong bảng ở mục 3 của quy ước chung; giữ `cameraY = 0`.

**C. Tự kiểm tra:** Mở game phải thấy đủ sáu bệ trong khung 640 × 520, mỗi tầng cách nhau 70 pixel. Gọi hàm hai lần phải tạo hai bộ dữ liệu riêng. Thông số nhảy đã chốt sẵn, không cần hỏi người làm vật lý.

## Nguyễn Đình Phú Vinh — BOT-01

> Bài tập dữ liệu và ranking dưới đây được giữ làm lịch sử. Gameplay solo hiện tại dùng các thầy đồng hành, không tính điểm hoặc xếp hạng thầy; xem [contract hiện tại](QUY_UOC_CHUNG.md#4-các-thầy-đồng-hành--bot-01).

**A. Làm gì:** Tạo dữ liệu cho bốn đối thủ máy và xếp hạng cùng người chơi. Ai lên cao hơn thì đứng trước. Chưa cần làm bot chuyển động ở bước này.

**B. Viết ở đâu:** `game/bots.js` viết `createBots(profiles)`: sao chép bốn cấu hình nhận vào, thêm `progress = 0`. `game/ranking.js` viết `getRanking(player, bots)`: trả danh sách mới theo `progress` giảm dần; bằng nhau thì theo `id` tăng dần.

**C. Tự kiểm tra:** Dùng bốn cấu hình bot và độ cao mẫu ở mục 4 của quy ước chung. Kết quả phải đủ năm người, đúng thứ tự kể cả khi bằng điểm và không sửa dữ liệu đầu vào. Không cần đợi bot chuyển động thật.

## Phương VH — UI-01

**A. Làm gì:** Hiện một dòng gọn trên game: độ cao, thời gian và trạng thái. Chỉ làm trong màn hình game.

**B. Viết ở đâu:** Tạo `components/HUD.jsx`, dùng `export default function HUD({height, elapsedMs, phase})`. Đặt nó trên Canvas trong `pages/GamePage.jsx`. Thời gian nhận vào là mili giây, chia 1000 để hiện giây.

**C. Tự kiểm tra:** Dùng số và bốn trạng thái mẫu ở mục 5 của quy ước chung, ghi “Dữ liệu thử”. Thử số 0, đổi mili giây sang giây và màn hình rộng 390 pixel không tràn chữ. Trưởng nhóm nối số thật sau.

## Nguyễn Đăng Đạt — BE-01

**A. Làm gì:** Lấy lịch sử chơi của đúng người, tối đa 20 lượt mới nhất. Chưa có lượt nào thì trả danh sách rỗng.

**B. Viết ở đâu:** `backend/routes/runs.py`, làm phần GET `/api/runs?player_id=...`, đọc SQLite và trả `{items: [...]}`. Quy định mã người chơi, thứ tự và báo lỗi xem [API.md](API.md). Các phần lưu điểm, chi tiết và bảng xếp hạng làm sau.

**C. Tự kiểm tra:** Tự tạo dữ liệu trong cơ sở dữ liệu tạm: đúng người, lượt mới trước, tối đa 20 lượt, chưa chơi thì rỗng, mã sai thì báo lỗi. Không cần đợi game gửi điểm. Phần này chạy ở Flask; trưởng nhóm nối qua API sau.

## Nguyễn Tuấn Vinh — LEAD-01

**A. Làm gì:** Làm game cập nhật liên tục, rồi ghép phần của mọi người vào để chạy chung.

**B. Viết ở đâu:** `game/engine.js`, trong `createGame(canvas, config)`. Dùng một vòng lặp `requestAnimationFrame`, tính `dt` theo giây, giới hạn bước thời gian khi máy khựng. Trong `destroy()`, dừng vòng lặp và ngừng đọc phím.

**C. Tự kiểm tra:** Ghép từng phần đã đạt kiểm tra riêng, rồi chạy lại kiểm tra và thử trong game trước khi đưa vào `dev`. Thứ tự: trái/phải → rơi → chạm bệ → bản đồ cuộn → bot và xếp hạng. Nối HUD qua `GameCanvas` và `GamePage`; kiểm tra dừng game dọn sạch vòng lặp và phím. Việc nào lỗi thì gửi lại đúng người phụ trách.

## Ví dụ ghép phần trái/phải vào file chính

Đoạn dưới minh họa cách dùng sau khi FE-01 viết xong các hàm; không thay toàn bộ `engine.js` bằng đoạn này.

```js
import { createInput } from './input.js';
import { updateHorizontal } from './player.js';

// Trong createGame: tạo một lần trước vòng lặp.
const input = createInput();

// Trong vòng lặp: dùng state.player và dt của engine.
const direction = Number(input.state.right) - Number(input.state.left);
updateHorizontal(state.player, direction, dt);

// Trong destroy: ngừng đọc phím.
input.destroy();
```

## Gửi phần đã làm

| Người | Branch dùng cho việc đầu |
|---|---|
| Duc Duong Minh | `feature/player-input` |
| Hoàng Hải Minh | `feature/gravity` |
| Minh Tấn | `feature/initial-platforms` |
| Nguyễn Đình Phú Vinh | `feature/ranking-data` |
| Phương VH | `feature/game-hud` |
| Nguyễn Đăng Đạt | `feature/run-history-api` |
| Nguyễn Tuấn Vinh | `feature/game-loop` |

Tạo branch từ `dev` theo START_HERE. Viết bài kiểm tra cho phần mình theo mục 7 của quy ước chung; chạy `npm.cmd test` và `npm.cmd run build` trước khi gửi. Không phải chờ cả game xong.

Gửi trưởng nhóm một lần: **“Đã làm … / Sửa file … / Gọi hàm … / File kiểm tra và kết quả … / Còn thiếu …”**. Trưởng nhóm ghép và kiểm tra bản chung trước khi đưa vào `dev`; thành viên không kiểm tra chéo nhau.
