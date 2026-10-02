# FEATURE_MAP.md — Bản Đồ Tính Năng Doodle Jump USTH (Repository Root)
*(Dựa trên triết lý Harness Engineering của Lauren Tan - Cursor / SpaceX / Meta)*

> **Mục tiêu:** Cung cấp bản đồ định hướng (GPS) giúp AI Agent xác định đúng điểm chạm, mở đúng file cần sửa trong chưa đầy 3 giây, tiết kiệm 80% context window và không bao giờ đoán mò.

---

## ⚡ 1. Tổng Quan Kỹ Thuật (Tech Stack & Health Check)

| Hạng mục | Chi tiết | Lệnh thực thi / Ghi chú |
| :--- | :--- | :--- |
| **Framework / Core** | React 19.3 + HTML5 Canvas 2D / Flask 3.1.3 | Kiến trúc Decoupled Core hoàn toàn tách biệt UI |
| **Language** | JavaScript (ESM) / Python 3.12 | Node.js >= 24, Strict Types Logic |
| **Package Manager** | npm / pip (venv) | Setup: `npm run setup` |
| **Dev Server (All-in-one)** | `npm run dev` | Frontend: `http://localhost:5173` \| Flask: `http://127.0.0.1:3000` |
| **Test Runner (Toàn diện)** | `npm test` | **Bắt buộc pass 100% (35 Pytest + 51 Vitest = 86 tests)** |
| **Frontend Test** | `npm --prefix frontend run test` | `vitest run --root frontend` (51 tests) |
| **Backend Test** | `.venv\Scripts\python -m pytest backend/tests -q` | `pytest backend/tests` (35 tests) |
| **Active Branch** | `dev` | Remote: `origin/dev` |

---

## 🗺️ 2. Bản Đồ Tính Năng Nghiệp Vụ (Feature Map Matrix)

### Module 1: Core Game Engine & Game Loop (Vòng lặp & Điều phối Game)
- **Mô tả ngắn:** Điều phối game loop bằng `requestAnimationFrame`, tính toán delta-time (dt), tích lũy thời gian vật lý với `FIXED_DT`, camera bám đuổi và điều phối vòng đời ván chơi (running, paused, finished).
- **Điểm chạm (Touchpoints):**
  - 🖥️ **UI Entrypoint:** [`frontend/src/components/GameCanvas.jsx`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/components/GameCanvas.jsx)
  - 🧠 **Logic & Engine:** [`frontend/src/game/engine.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/engine.js), [`frontend/src/game/index.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/index.js)
  - 🧪 **Test File:** [`frontend/src/tests/engine.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/engine.test.js)

---

### Module 2: Headless Game Simulation & State Machine (Mô phỏng State thuần túy)
- **Mô tả ngắn:** Máy trạng thái thuần JS (pure state machine): khởi tạo state (`createState`), cập nhật bước nhảy (`step`), chụp snapshot (`snapshot`) và kết thúc game (`finish`) với các lý do: chạm đích (`goal`), rơi vực (`fall`), hết giờ (`timeout`).
- **Điểm chạm (Touchpoints):**
  - 🧠 **Logic & Simulation:** [`frontend/src/game/simulation.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/simulation.js)
  - 🧪 **Test File:** [`frontend/src/tests/completion.test.jsx`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/completion.test.jsx), [`frontend/src/tests/engine.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/engine.test.js)

---

### Module 3: Player Movement & Input Handling (Điều khiển & Di chuyển nhân vật)
- **Mô tả ngắn:** Bắt sự kiện phím (A/D, Mũi tên trái/phải), di chuyển ngang mượt mà với gia tốc/ma sát, xử lý xuyên viền màn hình (wrap-around) và chống dính phím khi mất focus/blur.
- **Điểm chạm (Touchpoints):**
  - 🧠 **Logic & Input:** [`frontend/src/game/input.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/input.js), [`frontend/src/game/player.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/player.js)
  - 🧪 **Test File:** [`frontend/src/tests/input.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/input.test.js), [`frontend/src/tests/player.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/player.test.js)

---

### Module 4: Physics & Collision Detection (Cơ chế vật lý & Va chạm bệ)
- **Mô tả ngắn:** Mô phỏng gia tốc trọng lực, vận tốc rơi giới hạn (terminal velocity), nảy bệ với vận tốc ban đầu và thuật toán va chạm AABB một chiều (chỉ nảy khi chân chạm mặt bệ rơi xuống).
- **Điểm chạm (Touchpoints):**
  - 🧠 **Logic & Physics:** [`frontend/src/game/physics.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/physics.js), [`frontend/src/game/collision.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/collision.js)
  - 🧪 **Test File:** [`frontend/src/tests/physics.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/physics.test.js)

---

### Module 5: World Generation & Platforms (Sinh bệ đỡ & Camera cuộn)
- **Mô tả ngắn:** Khởi tạo danh sách các loại bệ đỡ (static, moving, fragile/one-time, bouncy), thuật toán di chuyển bệ ngang, cuộn camera Y theo độ cao leo được và dọn dẹp bệ rơi khỏi màn hình.
- **Điểm chạm (Touchpoints):**
  - 🧠 **Logic & Generator:** [`frontend/src/game/world.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/world.js)
  - 🧪 **Test File:** [`frontend/src/tests/world.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/world.test.js)

---

### Module 6: Full Physics & AI Bots Simulation & Real-time Ranking (Mô phỏng 4 Bot Vật lý & Xếp hạng)
- **Mô tả ngắn:** 4 đối thủ máy vận hành bằng Full Physics & AI (Hướng B): tự tìm bệ thông minh (`findTargetPlatform`), điều hướng ngang (`updateBotAI`), rơi tự do theo trọng lực Canvas (`applyPhysics`), va chạm nảy bệ (`handlePlatformCollisions` / `onBotBounce`), và tính toán thứ hạng đua top thời gian thực giữa Người chơi và 4 Bot.
- **Điểm chạm (Touchpoints):**
  - 🧠 **Logic & AI:** [`frontend/src/game/bots.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/bots.js), [`frontend/src/game/ranking.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/ranking.js), [`frontend/src/game/simulation.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/simulation.js)
  - 🧪 **Test File:** [`frontend/src/tests/bots.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/bots.test.js), [`frontend/src/tests/ranking.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/ranking.test.js), [`frontend/src/tests/completion.test.jsx`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/completion.test.jsx)

---

### Module 7: Canvas 2D Rendering & Sprites System (Xuất hình ảnh & Đồ họa)
- **Mô tả ngắn:** Vẽ nền trời lưới toạ độ cao, vạch mốc cao 250m, vạch đích 3000m, xuất hình nhân vật và các loại bệ đỡ với sprite động (cắt viền trắng tự động flood-fill và cache canvas).
- **Điểm chạm (Touchpoints):**
  - 🎨 **Render & Cache:** [`frontend/src/game/render.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/render.js), [`frontend/src/game/sprites.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/game/sprites.js)
  - 🖼️ **Sprites Assets:** `frontend/public/images/sprites/*.png`

---

### Module 8: Game HUD, UI Overlays & Guest Storage (Giao diện người dùng & Lưu cục bộ)
- **Mô tả ngắn:** Quản lý giao diện GamePage: TopBar (thời gian, nút tạm dừng ESC, nút chơi lại), FloatingHUD (độ cao kỷ lục, BXH đua top lơ lửng), StartMenu (chọn skin nhân vật giáo viên, nhập nickname), GameOverModal, LeaderboardModal và dịch vụ lưu thông tin khách chơi `localStorage`.
- **Điểm chạm (Touchpoints):**
  - 🖥️ **UI Components:** [`frontend/src/pages/GamePage.jsx`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/pages/GamePage.jsx), [`frontend/src/components/HUD.jsx`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/components/HUD.jsx), [`frontend/src/styles.css`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/styles.css)
  - 🧠 **Hooks & Storage:** [`frontend/src/hooks/useBackend.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/hooks/useBackend.js), [`frontend/src/services/storage.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/services/storage.js)
  - 🧪 **Test File:** [`frontend/src/tests/completion.test.jsx`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/completion.test.jsx)

---

### Module 9: Backend Config, Game Rules & Health API (Cấu hình game & Kiểm tra máy chủ)
- **Mô tả ngắn:** Cung cấp API Flask cấu hình tham số trò chơi (`/api/config`), rules_version, thông số 4 Bots, danh sách Skins giáo viên và kiểm tra trạng thái hoạt động (`/api/health`).
- **Điểm chạm (Touchpoints):**
  - 🌐 **API Route & Rules:** [`backend/routes/config.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/routes/config.py), [`backend/rules.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/rules.py)
  - 🖥️ **Frontend Service:** [`frontend/src/services/api.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/services/api.js)
  - 🧪 **Test File:** [`backend/tests/test_app.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/tests/test_app.py), [`frontend/src/tests/api.test.js`](file:///D:/Web%20Project/doodle-jump-usth/frontend/src/tests/api.test.js)

---

### Module 10: Run History, Persistence & Leaderboard (Lưu lượt chơi & Bảng xếp hạng)
- **Mô tả ngắn:** Quản lý lưu kết quả lượt chơi (`POST /api/runs`), kiểm tra tính hợp lệ dữ liệu (validation, idempotency, conflict check), truy vấn lịch sử (`GET /api/runs?player_id=...`), chi tiết ván đấu và bảng xếp hạng (`/api/leaderboard`) lưu trữ SQLite.
- **Điểm chạm (Touchpoints):**
  - 🌐 **API Route:** [`backend/routes/runs.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/routes/runs.py)
  - 💾 **Schema & SQLite DB:** [`backend/schema.sql`](file:///D:/Web%20Project/doodle-jump-usth/backend/schema.sql), [`backend/db.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/db.py), `backend/instance/game.db`
  - 🧪 **Test File:** [`backend/tests/test_run_history.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/tests/test_run_history.py), [`backend/tests/test_run_save.py`](file:///D:/Web%20Project/doodle-jump-usth/backend/tests/test_run_save.py)

---

### Module 11: Internationalization & Localization (i18n Multi-Language)
- **Mô tả ngắn:** Quản lý đa ngôn ngữ zero-dependency (English, Vietnamese, French). Hỗ trợ React Context hook (`useTranslation()`), synchronous Canvas lookup (`t()`), từ điển JSON (`en.json`, `vi.json`, `fr.json`), LanguageSwitcher trong StartMenu & TopBar, và lưu tùy chọn vào `localStorage`.
- **Điểm chạm (Touchpoints):**
  - 🌐 **i18n Core Store:** `frontend/src/i18n/index.js`, `frontend/src/i18n/I18nContext.jsx`
  - 📖 **Locale Dictionaries:** `frontend/src/locales/en.json`, `frontend/src/locales/vi.json`, `frontend/src/locales/fr.json`
  - 🖥️ **UI Switcher:** `frontend/src/components/LanguageSwitcher.jsx`
  - 🧪 **Test File:** `frontend/src/tests/i18n.test.js`, `frontend/src/tests/i18n-integration.test.jsx`

---

## 🚫 3. Rào Chắn Cứng & Điều Cấm Kỵ (Hard Negative Constraints)

> *Những quy tắc tuyệt đối AI Agent không được vi phạm khi sửa codebase này:*

1. **Không đoán mò vị trí file:** Trước khi đọc hoặc sửa code, phải tra cứu Feature Map Matrix ở trên. Cấm tự tạo các file trùng lặp chức năng.
2. **Quy tắc Tách biệt Trách nhiệm (Decoupled Core):**
   - Thư mục `frontend/src/game/` là Pure JavaScript Core Engine độc lập, **tuyệt đối không import thư viện React hoặc React hooks vào đây**.
   - React chỉ đóng vai trò View layer nạp qua `GameCanvas.jsx` và `GamePage.jsx`.
3. **Quy tắc Kiểm thử Bắt buộc (Autonomous Verification):**
   - Mọi thay đổi logic tính toán (Vật lý, Va chạm, Điểm số, Bot, API) đều phải kèm theo test case tương ứng.
   - **Luôn chạy `npm test` trước khi kết luận hoàn thành.** Phải đảm bảo toàn bộ 86 tests (Backend 35/35 + Frontend 51/51) đều PASS màu xanh.
4. **Không code rác (No Slop):**
   - ❌ Không thêm comment hiển nhiên kiểu `// hàm cập nhật độ cao`.
   - ❌ Không sửa đổi cấu hình proxy `/api` trong `vite.config.js` trừ khi có chỉ thị rõ ràng.
   - ❌ Không sửa đổi schema SQLite làm gãy tương thích dữ liệu `runs`.
