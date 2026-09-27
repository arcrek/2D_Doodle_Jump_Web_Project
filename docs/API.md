# Quy ước API

Frontend gọi đường dẫn tương đối `/api/...`; Vite chuyển tới Flask :3000 khi phát triển.

## Route đang hoạt động

- `GET /api/health` → 200, `{status, service, version}`.
- `GET /api/config` → 200, `{rules_version, finish_height, max_duration_ms, skins, bots}`.
- `flask --app backend.app init-db` tạo bảng còn thiếu, không xóa bản ghi cũ.

| Route | Kết quả |
|---|---|
| POST /api/runs | 201 khi tạo; 200 khi cùng ID/cùng nội dung; 409 nếu ID cũ nhưng dữ liệu khác |
| GET /api/runs?player_id=UUID | 200 `{items: [...]}`, 20 lượt mới nhất của khách; tham số thiếu/sai trả 422 |
| GET /api/runs/:run_id | 200 bản ghi, 404 nếu không có |
| GET /api/leaderboard?rules_version=v1|v2 | 200 `{items: [...]}`, top 10 lượt của người thật theo phiên bản luật (mặc định v1) |
| POST /api/rooms | 201 `{room_id, room_code, max_players, rules_version}`, tạo phòng đua mới |
| GET /api/rooms/:room_code | 200 `{room_id, room_code, status, player_count, max_players, rules_version, players}`, tra cứu phòng |
| POST /api/rooms/:room_code/join | 200 `{room_id, room_code, rules_version}`, tham gia phòng chờ; 409 nếu đầy hoặc đã đua |

GET `/api/runs` lọc đúng `player_id`, sắp `created_at` giảm dần; nếu bằng nhau thì `run_id` tăng dần, rồi lấy tối đa 20 lượt. Không có dữ liệu trả `{items: []}`. Mã người chơi thiếu hoặc không phải UUID hợp lệ trả 422. Dùng truy vấn SQL có tham số và cơ sở dữ liệu tạm khi kiểm tra.

POST nhận `run_id`, `player_id` (UUID), `nickname` (trim, 1–24 ký tự), `skin_id`, `rules_version` (`v1` hoặc `v2`), `height`, `elapsed_ms`, `outcome` (`finished` hoặc `dnf`), `placement` (1–5 đối với `v1`, 1–4 đối với `v2`). Server tạo `created_at` UTC.

Độ cao 0 đến finish_height; finished phải đạt đích, dnf chưa đạt đích. elapsed_ms nguyên >0 và <= max_duration_ms. Với `v2`, lượt `finished` yêu cầu elapsed_ms >= 7500ms (chống speedhack). Không nhận boolean thay số nguyên. Kiểm tra skin/luật trong danh sách cho phép.

JSON sai cú pháp: 400. JSON đọc được nhưng sai kiểu/giá trị: 422. Sai phương thức: 405. Lỗi bất ngờ: 500 không trả traceback. Mọi lỗi có dạng:

```json
{"error": {"code": "invalid_run", "message": "Dữ liệu chưa hợp lệ.", "details": {"height": "ngoài phạm vi"}}}
```

## Socket.IO Realtime Events (Race V2)

Giao thức thời gian thực qua `/socket.io` sử dụng Flask-SocketIO (threading mode) và Vite proxy (`ws: true`).

| Sự kiện | Hướng | Mô tả & Schema |
|---|---|---|
| `room:join` | Client → Server | Tham gia phòng socket: `{room_id, player_id, nickname, skin_id}` |
| `room:leave` | Client → Server | Tự nguyện rời phòng chờ: `{}` |
| `room:left` | Server → Client | Xác nhận rời phòng: `{success: boolean, message?: string}` |
| `room:state` | Server → Client | Cập nhật danh sách người chơi & trạng thái phòng: `{room_id, room_code, status, players: [...]}` |
| `room:ready` | Client → Server | Chuyển đổi trạng thái sẵn sàng: `{is_ready: boolean}`. Khi mọi người sẵn sàng (>= 2 người) kích hoạt đếm ngược |
| `race:start` | Server → Client | Xuất phát cuộc đua: `{seed, finish_height: 3000, start_timestamp_ms, countdown_ms: 3000, rules_version: "v2"}` |
| `player:tick` | Client → Server | Đồng bộ vị trí (10-15 Hz): `{seq, y, vy, x, facing, state, client_ts}` |
| `race:ghost_sync` | Server → Client | Phát sóng bóng (ghost) cho các đối thủ: `{player_id, seq, y, vy, x, facing, state, client_ts}` |
| `skill:box_pickup` | Client → Server | Nhặt hộp kỹ năng khi tiếp xúc gần: `{box_id, y}` |
| `skill:acquired` | Server → Client | Cấp kỹ năng ngẫu nhiên (`boost`, `stun_bullet`, `teleport`): `{box_id, skill_type}` |
| `skill:use` | Client → Server | Kích hoạt kỹ năng (kiểm tra hồi chiêu 8000ms): `{skill_type, target_y?}` |
| `skill:effect_applied` | Server → Client | Áp dụng hiệu ứng chiêu: `{activator_id, skill_type, target_id, effect, duration_ms, new_y}` |
| `race:claim_finish` | Client → Server | Yêu cầu xác nhận cán đích: `{elapsed_ms, final_height}` (server kiểm tra $T_{min} \ge 7500$ms, trạm CP1 & CP2, độ cao $\ge 3000$) |
| `race:player_finished` | Server → Client | Thông báo có người về đích: `{player_id, placement, elapsed_ms}` |
| `race:finished` | Server → Client | Kết thúc trận đấu toàn diện: `{room_id, rules_version, standings: [...]}` |
| `player:status_changed` | Server → Client | Thông báo trạng thái kết nối: `{player_id, status: "offline" \| "online"}` |
| `error` | Server → Client | Báo lỗi socket: `{code, message, details?}` |

### Mã lỗi Socket.IO chuẩn

| Mã lỗi (`code`) | Mô tả nguyên nhân |
|---|---|
| `invalid_payload` | Dữ liệu gửi lên sai định dạng, `player_id` không phải UUID hoặc `skin_id` không tồn tại |
| `room_not_found` | Không tìm thấy phòng với ID hoặc mã code cung cấp |
| `room_already_started` | Phòng đã bắt đầu đếm ngược, đang đua hoặc đã kết thúc |
| `room_full` | Phòng đã đủ 4 người chơi |
| `not_in_room` | Thao tác socket yêu cầu người chơi phải tham gia phòng trước |
| `box_already_claimed` | Hộp quà này đã được người chơi khác nhặt trong ván đua |
| `teleport_bounds_exceeded` | Cự ly dịch chuyển âm hoặc vượt quá giới hạn tối đa $+350\text{px}$ |
| `no_active_skill` | Người chơi chưa nhặt hoặc đã dùng hết kỹ năng |
| `skill_cooldown_active` | Kỹ năng đang trong thời gian hồi chiêu 8 giây |
| `speed_anomaly` | Thời gian về đích bất thường ($< 7500\text{ms}$) |
| `invalid_trajectory` | Bỏ qua trạm kiểm soát hoặc nhảy cóc không qua trạm tuần tự |
| `anticheat_height_violation` | Báo cán đích khi độ cao chưa đạt mốc đích ($3000\text{px}$) |
| `invalid_race_state` | Gửi báo cáo cán đích khi phòng chưa ở trạng thái `RACING` / `ADJUDICATING` |
Bảng chung: finished đứng trước dnf; finished theo elapsed_ms tăng dần; dnf theo height giảm dần rồi elapsed_ms tăng dần; hòa theo created_at rồi run_id. Cho phép nhiều lượt của một người. Không lưu bot thành bản ghi người chơi.

player_id lưu ở trình duyệt chỉ là định danh khách, không phải tài khoản xác thực. Kết quả client báo chưa chống gian lận. SQLite hiện là lựa chọn dự án, không phải tính năng được Flask tự cung cấp.
