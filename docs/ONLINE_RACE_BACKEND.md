# Thiết Kế Đồng Bộ Và Xác Thực Cuộc Đua Online (Race V2 Backend)

Tài liệu đặc tả kiến trúc backend, giao thức mạng thời gian thực, mô hình xác thực chống gian lận và quy ước dữ liệu cho chế độ đua nhiều người chơi (**Race V2**).
- **Mã nhiệm vụ:** `BE-01`
- **Người phụ trách:** Nguyễn Đăng Đạt
- **Issue liên quan:** #28 (BE-01), #22 (LEAD - Race V2 Spec), #23 (PR nền Cinematic Intro V2), #30 (LEAD - Ghép Race V2)
- **Nhánh thực hiện:** `feature/online-race-backend-spec` (tách từ `feature/cinematic-intro-v2`)

---

## 1. Tổng Quan Kiến Trúc & Công Nghệ

### 1.1. Hiện trạng v1 vs Mục tiêu Race V2
- **Hiện trạng v1:** Kiến trúc REST đồng bộ đơn giản (Flask 3.1.3 + SQLite). Client chơi độc lập với bot mô phỏng cục bộ (`bots.js`), tự tính toán kết quả và gửi `POST /api/runs` sau khi kết thúc ván. Server hoàn toàn bị động, không kiểm soát được gian lận (speedhack, giả mạo đích, can thiệp độ cao).
- **Mục tiêu Race V2:** Cuộc đua thời gian thực từ 2 đến 4 người chơi trên cùng một bản đồ hữu hạn (`finish_height = 3000`). Bổ sung cơ chế phòng đua (lobby), đếm ngược đồng bộ (3-2-1-GO), hiển thị bóng (ghost) của đối thủ, nhặt và kích hoạt siêu năng lực (bay, bắn choáng, teleport), và server là trọng tài tối cao xác thực thứ hạng về đích.

### 1.2. Lựa chọn Công nghệ: `Flask-SocketIO` + `simple-websocket` (Threading Mode)

Hệ thống chọn **Approach 2 (Flask-SocketIO)** với cấu hình tối ưu để giải quyết triệt để vấn đề tương thích môi trường phát triển:

```
[Browser Client] <--- WebSocket (/socket.io) ---> [Vite Proxy (:5173)]
                                                          | (ws: true)
                                                          v
                                              [Flask Backend (:3000)]
                                              - Flask-SocketIO (async_mode="threading")
                                              - simple-websocket (Pure Python)
                                              - Thread-safe Memory Room Manager
                                              - SQLite Persistence (rules_version="v2")
```

#### Lý do lựa chọn & Giải pháp cài đặt không lỗi:
1. **Khắc phục lỗi Python 3.12:** Không sử dụng `eventlet` (bị lỗi PEP 669 frame/threading trên Python 3.12).
2. **Khắc phục lỗi biên dịch C++ trên Windows:** Không sử dụng `gevent`/`greenlet` (yêu cầu Microsoft C++ Build Tools). Thay vào đó, dùng `simple-websocket` viết 100% bằng Pure Python, cài đặt tức thì trên mọi hệ điều hành (Windows, macOS, Linux/WSL2).
3. **Giữ nguyên toolchain dự án:** Tương thích hoàn toàn với `scripts/dev.mjs`:
   ```javascript
   // scripts/dev.mjs giữ nguyên lệnh khởi chạy chuẩn:
   run(python, ['-m', 'flask', '--app', 'backend.app', 'run', '--port', '3000', '--debug', '--no-reload'], root);
   ```
   Werkzeug phát hiện header `Upgrade: websocket` và tự động chuyển giao socket cho `simple-websocket` xử lý mà không bị hạ cấp (degrade) về HTTP long-polling.

#### Khai báo phụ thuộc:
- **Backend (`backend/requirements.txt`):**
  ```text
  Flask==3.1.3
  flask-socketio==5.4.1
  simple-websocket==1.1.0
  pytest==8.4.2
  ```
- **Frontend (`frontend/package.json`):**
  ```json
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "socket.io-client": "^4.8.1"
  }
  ```
- **Cấu hình Proxy Vite (`frontend/vite.config.js`):**
  ```javascript
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
      },
    },
  },
  ```

---

## 2. Vòng Đời Phòng Đua (Room Lifecycle)

Mỗi phòng đua là một máy trạng thái hữu hạn (FSM) được quản lý trong bộ nhớ server (`threading.Lock` bảo vệ):

```
       [WAITING] (Người chơi tạo/vào phòng qua mã 6 ký tự)
           |
           v (Tất cả người chơi gửi sẵn sàng - READY)
      [COUNTDOWN] (Server phát seed bản đồ + timestamp bắt đầu T0)
           |
           v (Sau 3 giây đếm ngược)
       [RACING] (Đồng bộ vị trí 10-15Hz, nhặt/dùng kỹ năng)
           |
           v (Người đầu tiên về đích hợp lệ)
     [ADJUDICATING] (Khóa hạng 1, mở bộ đếm 15s cho người còn lại)
           |
           v (Hết 15s hoặc tất cả về đích/rơi rớt)
      [FINISHED] (Lưu DB SQLite rules_version="v2", trả kết quả)
```

### 2.1. Các trạng thái phòng:
1. `WAITING`: Chờ người chơi tham gia (tối thiểu 2, tối đa 4). Người chơi chọn skin, nickname.
2. `COUNTDOWN`: Khi chủ phòng bấm Start (hoặc 100% người chơi bấm Ready), server phát sinh `seed` ngẫu nhiên và chốt thời điểm xuất phát `start_time = now + 3000ms`.
3. `RACING`: Cuộc đua diễn ra. Client gửi tọa độ `player:tick` định kỳ (10–15 Hz), server lọc kiểm tra và broadcast sang các client khác làm vị trí bóng (ghost).
4. `ADJUDICATING`: Khi có người chạm đích hợp lệ đầu tiên, server ghi nhận Quán quân và kích hoạt đếm ngược 15 giây kết thúc chặng.
5. `FINISHED`: Tổng kết bảng xếp hạng ván đấu, lưu kết quả từng người vào SQLite và giải phóng phòng khỏi bộ nhớ.

---

## 3. Đặc Tả Giao Thức Mạng & Message Schema (Socket.IO)

Tất cả các gói tin trao đổi qua Socket.IO sử dụng sự kiện đặt tên theo quy ước `<namespace>:<action>`.

### 3.1. REST Endpoint Hỗ Trợ Tạo / Tra Cứu Phòng (Phối Hợp UI)

#### `POST /api/rooms` — Tạo phòng mới
- **Request:**
  ```json
  {
    "host_player_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "nickname": "DoodlePro",
    "skin_id": "doodle"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "room_id": "a3b2c1d0-1234-5678-9abc-def012345678",
    "room_code": "RACE88",
    "max_players": 4,
    "rules_version": "v2"
  }
  ```

#### `GET /api/rooms/:room_code` — Tra cứu phòng trước khi kết nối socket
- **Response (200 OK):**
  ```json
  {
    "room_id": "a3b2c1d0-1234-5678-9abc-def012345678",
    "status": "WAITING",
    "player_count": 2,
    "max_players": 4
  }
  ```

---

### 3.2. Sự Kiện Socket.IO Chi Tiết

#### 1. `room:join` (Client $\to$ Server)
Gửi ngay sau khi socket bắt tay thành công.
```json
{
  "room_id": "a3b2c1d0-1234-5678-9abc-def012345678",
  "player_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "nickname": "DoodlePro",
  "skin_id": "doodle"
}
```

#### 2. `room:state` (Server $\to$ Client)
Phát cho toàn bộ phòng khi có người vào/ra/đổi trạng thái.
```json
{
  "room_id": "a3b2c1d0-1234-5678-9abc-def012345678",
  "status": "WAITING",
  "players": [
    {
      "player_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "nickname": "DoodlePro",
      "skin_id": "doodle",
      "is_ready": true,
      "is_host": true
    },
    {
      "player_id": "e4f5a6b7-8901-2345-6789-abcdef012345",
      "nickname": "Speedy",
      "skin_id": "red",
      "is_ready": false,
      "is_host": false
    }
  ]
}
```

#### 3. `room:ready` (Client $\to$ Server)
```json
{
  "is_ready": true
}
```

#### 4. `race:start` (Server $\to$ Client)
Server phát khi đủ điều kiện xuất phát. Chứa seed bản đồ để mọi client sinh bệ giống hệt nhau.
```json
{
  "seed": 987654321,
  "finish_height": 3000,
  "start_timestamp_ms": 1727415603000,
  "countdown_ms": 3000,
  "rules_version": "v2"
}
```
*Ghi chú:* Khi nhận được `race:start`, client khóa điều khiển nhân vật, chạy hoạt cảnh 3-2-1 trên HUD và đúng thời điểm `start_timestamp_ms` sẽ mở khóa di chuyển.

#### 5. `player:tick` (Client $\to$ Server, tần số 10–15 Hz)
Client gửi thông tin vị trí phục vụ vẽ bóng (ghost) cho người chơi khác:
```json
{
  "seq": 142,
  "y": 1250.5,
  "vy": 410.2,
  "x": 230.0,
  "facing": "right",
  "state": "jumping",
  "client_ts": 1727415610500
}
```

#### 6. `race:ghost_sync` (Server $\to$ Client, tần số 10–15 Hz)
Server gom và phát lại tọa độ của các đối thủ trong phòng:
```json
{
  "ghosts": [
    {
      "player_id": "e4f5a6b7-8901-2345-6789-abcdef012345",
      "y": 1310.0,
      "vy": -120.0,
      "x": 190.5,
      "facing": "left",
      "state": "falling"
    }
  ]
}
```

#### 7. `skill:box_pickup` (Client $\to$ Server)
Gửi khi nhân vật chạm vào hộp quà bí ẩn trên bệ:
```json
{
  "box_id": "box_tier_12",
  "y": 1400
}
```
- Server kiểm tra tọa độ hộp quà theo seed. Nếu hợp lệ, server quay ngẫu nhiên và gửi riêng cho client sự kiện `skill:acquired`:
  ```json
  {
    "skill_type": "stun_bullet",
    "cooldown_ms": 8000
  }
  ```

#### 8. `skill:use` (Client $\to$ Server)
Khi người chơi kích hoạt kỹ năng:
```json
{
  "skill_type": "stun_bullet",
  "origin_x": 230.0,
  "origin_y": 1250.0,
  "direction": "up"
}
```

#### 9. `skill:effect_applied` (Server $\to$ Client)
Server thông báo cho toàn phòng hiệu ứng vừa kích hoạt hoặc nạn nhân bị trúng đòn:
```json
{
  "activator_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "skill_type": "stun_bullet",
  "target_id": "e4f5a6b7-8901-2345-6789-abcdef012345",
  "effect": "stunned",
  "duration_ms": 1500
}
```

#### 10. `race:claim_finish` (Client $\to$ Server)
Gửi khi client chạm đích $y \ge 3000$:
```json
{
  "elapsed_ms": 28450,
  "final_height": 3000
}
```

#### 11. `race:finished` (Server $\to$ Client)
Server công bố kết quả chung cuộc của ván đấu:
```json
{
  "room_id": "a3b2c1d0-1234-5678-9abc-def012345678",
  "rules_version": "v2",
  "standings": [
    {
      "placement": 1,
      "player_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "nickname": "DoodlePro",
      "skin_id": "doodle",
      "elapsed_ms": 28450,
      "outcome": "finished"
    },
    {
      "placement": 2,
      "player_id": "e4f5a6b7-8901-2345-6789-abcdef012345",
      "nickname": "Speedy",
      "skin_id": "red",
      "elapsed_ms": 31200,
      "outcome": "finished"
    }
  ]
}
```

#### 12. `player:disconnect` / `player:reconnect`
- Khi socket ngắt kết nối đột ngột trong trận đua (`RACING` / `ADJUDICATING`), server phát `player:status_changed` (`status: "offline"`) và kích hoạt bộ đếm **10 giây ân hạn (grace period)**.
- Nếu người chơi kết nối lại trong 10s qua `room:join`, server hủy timer ân hạn và phát `player:status_changed` (`status: "online"`).
- Nếu quá 10s không tái kết nối, server đánh dấu `outcome = "dnf"` với độ cao đỉnh ghi nhận được (`max_y`) và tự động hoàn tất ván đấu (`finalize_race`) nếu tất cả người chơi đều đã kết thúc lượt đua.

#### 13. `room:leave` (Client $\to$ Server)
- Người chơi gửi sự kiện `room:leave` để tự nguyện thoát khỏi phòng chờ (`WAITING`).
- Server gỡ bỏ người chơi khỏi phòng, giải phóng SID mapping, chuyển giao quyền Host cho người kế tiếp nếu Host rời phòng, phát `room:state` cập nhật cho phòng và phát xác nhận `room:left` (`{"success": true}`) cho người gửi.
- Nếu người chơi mất kết nối mạng khi ở trạng thái `WAITING`, server cũng tự động loại bỏ người chơi khỏi phòng và chuyển giao quyền Host tương tự mà không giữ chỗ hay kích hoạt 10s ân hạn.
---

## 4. Mô Hình Xác Thực Server (Anti-Cheat & Arbitration)

Để đảm bảo tính công bằng tối đa mà không gây nghẽn hiệu năng, hệ thống áp dụng mô hình **Hybrid Authority (Client-simulated, Server-arbitrated)**:

| Trạng thái | Nguồn quyết định | Cơ chế kiểm tra của Server |
| :--- | :--- | :--- |
| **Vật lý nhảy & va chạm bệ** | Client Authority | Client tự mô phỏng va chạm mượt mà ở 60 FPS; gửi vị trí về server. |
| **Bản đồ & Sinh bệ** | Server Authority (Deterministic) | Server sinh `seed` duy nhất. Thuật toán PRNG tạo cùng bệ, sàn, đích và hộp quà trên mọi máy. |
| **Kiểm tra tốc độ di chuyển** | Server Validation | Kiểm tra biến thiên độ cao: $\Delta y \le V_{max} \cdot \Delta t$. Nếu vượt quá ngưỡng vật lý $\to$ coi là speedhack/teleport lậu. |
| **Cấp phát siêu năng lực** | Server Authority | Client không được tự chọn kỹ năng. Chỉ server phát sinh loại kỹ năng khi client chạm bệ quà hợp lệ. |
| **Thời gian hồi chiêu (Cooldown)** | Server Authority | Server duy trì `last_skill_used_ts`. Nếu khoảng cách giữa 2 lần dùng $< 8000\text{ms} \to$ từ chối. |
| **Giới hạn Teleport** | Server Authority | Teleport chỉ được dịch chuyển tối đa $+350\text{px}$ ($\Delta y \ge 0$). Nếu tọa độ đích vượt quá $2900\text{px}$, server tự động cắt (clamp) về đúng $2900\text{px}$. |
| **Trọng tài Hộp quà** | Server Authority | Server duy trì tập hợp `claimed_boxes` đã nhặt. Hộp quà chỉ được cấp phát 1 lần duy nhất; yêu cầu nhặt trùng bị từ chối với mã lỗi `box_already_claimed`. |
| **Hiệu ứng Choáng (Stun)** | Server Authority | Server duy trì `stunned_until` trên `PlayerSession`. Trong 1.5s bị choáng, server khống chế triệt để mọi gói `player:tick` có hướng dịch chuyển đi lên ($\Delta y \le 0$). |
| **Xếp hạng DNF & Lưu trữ** | Server Authority | Server ghi nhận độ cao đỉnh (`max_y`) theo thời gian thực. Người chơi không hoàn thành cuộc đua (DNF) được sắp xếp thứ hạng dựa trên `max_y` giảm dần, và lưu `max_y` vào cột `height` bảng `runs`. |
| **Xác nhận về đích & Thứ hạng** | Server Authority | Server xác nhận thứ hạng theo thứ tự thời gian nhận `race:claim_finish` hợp lệ. |

### 4.1. Công thức Toán học Chống Gian Lận Đích ($T_{min}$)
Giả sử độ cao đích là $H_{finish} = 3000\text{px}$, vận tốc nhảy cực đại khi nảy bệ là $V_{jump} \approx 650\text{px/s}$, trọng lực $g \approx 1200\text{px/s}^2$, và có sự hỗ trợ của kỹ năng bay nhanh:
Vận tốc trung bình lớn nhất trên lý thuyết mà một người chơi có thể đạt được:
$$V_{max\_avg} = 380\text{ px/s}$$
Thời gian tối thiểu để hoàn thành chặng đua hợp lệ:
$$T_{min} = \frac{H_{finish}}{V_{max\_avg}} \approx \frac{3000}{380} \approx 7.89\text{ giây} \implies T_{min\_threshold} = 7500\text{ ms}$$

- Nếu client gửi `race:claim_finish` với `elapsed_ms < 7500ms`, server **từ chối ngay lập tức** và ghi nhận vi phạm gian lận.

### 4.2. Cơ chế Checkpoint Ảo
Trong quá trình đua, server chia đường đua thành 3 chặng mốc ẩn:
- Checkpoint 1: $y = 1000$
- Checkpoint 2: $y = 2000$
- Checkpoint 3: $y = 3000$ (Đích)

Server kiểm tra gói tin `player:tick` phải lần lượt vượt qua Checkpoint 1 rồi mới đến Checkpoint 2. Client nhảy cóc trực tiếp từ $y = 500$ lên $y = 3000$ sẽ không được công nhận về đích.

---

## 5. Quy Ước Dữ Liệu & Tương Thích Ngược (`rules_version: "v2"`)

### 5.1. Bảng Dữ Liệu SQLite Hiện Tại (`runs`)
Bảng `runs` trong `backend/schema.sql` đã được thiết kế sẵn với cột `rules_version TEXT NOT NULL`:

```sql
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    skin_id TEXT NOT NULL,
    rules_version TEXT NOT NULL,
    height INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    placement INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_player ON runs(player_id, created_at);
CREATE INDEX IF NOT EXISTS runs_rules ON runs(rules_version);
```

#### Quy tắc lưu trữ Race V2:
- Lượt chơi online Race V2 được lưu vào chính bảng `runs` với:
  - `rules_version = "v2"`
  - `height = 3000` (nếu hoàn thành) hoặc độ cao lớn nhất đạt được khi rơi/hết giờ
  - `outcome = "finished"` hoặc `"dnf"`
  - `placement` = thứ hạng thực tế trong phòng đua ($1, 2, 3, 4$)

### 5.2. Bảng Phụ Trợ Phòng Đua Mới (`race_rooms` & `race_room_members`)
Để lưu vết lịch sử phòng đấu nhiều người mà không làm ảnh hưởng bảng `runs` của v1:

```sql
CREATE TABLE IF NOT EXISTS race_rooms (
    room_id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL UNIQUE,
    rules_version TEXT NOT NULL DEFAULT 'v2',
    seed INTEGER NOT NULL,
    player_count INTEGER NOT NULL,
    winner_player_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS race_room_members (
    room_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    placement INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    PRIMARY KEY (room_id, player_id),
    FOREIGN KEY (room_id) REFERENCES race_rooms(room_id)
);
```

### 5.3. Đảm Bảo Tương Thích Tuyệt Đối với v1
- **API v1 không đổi:**
  - `GET /api/leaderboard?rules_version=v1`: Chỉ truy vấn `WHERE rules_version = 'v1'`. Toàn bộ dữ liệu điểm của v1 và các bài test `test_run_history.py`, `test_run_save.py` hoạt động nguyên vẹn 100%.
  - `GET /api/leaderboard?rules_version=v2`: Trả về bảng xếp hạng độc lập của Race V2 (sắp xếp theo `elapsed_ms ASC` cho những lượt `outcome = 'finished'`).

---

## 6. Kịch Bản Kiểm Thử & Ma Trận Xử Lý Lỗi (Test Cases)

| Mã test | Kịch bản kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi (Server) |
| :--- | :--- | :--- | :--- |
| **TC-NET-01** | Tạo phòng với mã hợp lệ | `POST /api/rooms` với payload đúng chuẩn | Trả về `201 Created`, mã phòng 6 ký tự viết hoa |
| **TC-NET-02** | Vào phòng đã đầy (Full room) | Người thứ 5 gửi `room:join` vào phòng đã có 4 người | Bắn sự kiện lỗi `error: { code: "room_full" }`, từ chối kết nối |
| **TC-NET-03** | Khởi động đồng bộ (Start sync) | 100% người chơi gửi `is_ready: true` | Phát `race:start` cùng một `seed` ngẫu nhiên và `start_timestamp_ms` sau đúng 3000ms |
| **TC-SEC-01** | Báo về đích lặp lại (Replay Claim) | Client gửi `race:claim_finish` 2 lần liên tiếp | Lần 1: Chấp nhận và tính thứ hạng. Lần 2: Bỏ qua (idempotent), không cộng thêm lượt |
| **TC-SEC-02** | Hack tốc độ về đích ($< T_{min}$) | `elapsed_ms: 3200` với `height: 3000` ($< 7500\text{ms}$) | Từ chối yêu cầu, ghi nhận cờ cảnh báo gian lận `speed_anomaly` |
| **TC-SEC-03** | Nhảy cóc checkpoint (Checkpoint skip) | Gửi `claim_finish` khi chưa có tick nào qua Checkpoint 1 & 2 | Từ chối yêu cầu `invalid_trajectory` |
| **TC-SEC-04** | Spam kích hoạt kỹ năng | Gửi 2 gói `skill:use` cách nhau 2.5 giây | Gói 1: Thực thi. Gói 2: Bị hủy với lỗi `skill_cooldown_active` (còn 5.5s) |
| **TC-SEC-05** | Teleport vượt vạch đích | Gửi `skill:use` (teleport) với tọa độ dự kiến $y = 3050$ | Server tự động cắt (clamp) tọa độ tối đa tại $y = 2900$, bắt buộc phải tự nhảy nốt quãng cuối |
| **TC-RES-01** | Mất kết nối đột ngột & Hết giờ ân hạn | Ngắt socket trong 12 giây khi đang đua | Server phát sự kiện người chơi offline; sau 10s ghi nhận `outcome: dnf` và thứ hạng chót |
| **TC-RES-02** | Hai người chạm đích sát nút | Client A gửi claim lúc $T_0$, Client B gửi claim lúc $T_0 + 40\text{ms}$ | Server xác định Client A hạng 1, Client B hạng 2 theo chuẩn FIFO timestamp |

---

## 7. Kế Hoạch Bàn Giao & Ghép Nối (Handoff)

1. **Với Trưởng nhóm (LEAD - #22, #30):**
   - Đảm bảo các hằng số $H_{finish} = 3000$, thời gian hồi chiêu $8000\text{ms}$, và danh sách 3 siêu năng lực (bay, choáng, teleport) ăn khớp hoàn toàn với `docs/RACE_V2_SPEC.md`.
2. **Với Frontend / UI (FE-01 - #24, UI-01 - #29):**
   - Cung cấp module service mẫu `frontend/src/services/network.js` bọc `socket.io-client` để UI chỉ cần lắng nghe sự kiện qua callback.
3. **Với World / Sinh bệ (WORLD-01 - #26):**
   - Chốt tham số `seed` trong hàm sinh bản đồ `createWorld(seed)` để khi nhận `race:start` từ server, client tự sinh ra đường đua đồng bộ 100%.
