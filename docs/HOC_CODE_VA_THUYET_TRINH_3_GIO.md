# Hiểu code Doodle Jump từ số 0 và chuẩn bị thuyết trình trong 3 giờ

> Dành cho người chưa biết lập trình. Đọc theo lịch 180 phút, mở code ở những chỗ được chỉ dẫn và tự nói lại sau mỗi phần.
>
> Project: **D:\Web Project\doodle-jump-usth**. Tài liệu đối chiếu với code local đêm **02/10/2026**, hoàn thiện rạng sáng **03/10/2026** cho buổi thuyết trình ngày **03/10/2026**.
>
> Được đối chiếu với nhánh **dev** ngày **03/10/2026**, tại commit `21265f1` (`origin/dev` sau tính năng endless lava và power-up).

## 0. Đọc thế nào để học xong trong 180 phút?

Mục tiêu sau 3 giờ: tự giải thích được từ lúc mở trang đến lúc kết thúc và lưu kết quả; chỉ được file phụ trách từng hành vi; trả lời được câu hỏi về vật lý, bot, React, API và database. Ba giờ không đủ để trở thành lập trình viên hay tự viết lại toàn bộ game từ đầu. Tài liệu cung cấp kiến thức cần thiết để hiểu và bảo vệ cách project được viết.

**Cách học:** đọc một đoạn → mở đúng hàm → chỉ vào dữ liệu thay đổi → đóng tài liệu và giải thích bằng lời của mình. Không học thuộc mọi dòng. Khi gặp từ mới, xem mục 2 hoặc bảng thuật ngữ cuối tài liệu.

| Phút tính từ lúc bắt đầu | Thời lượng | Học phần | Sản phẩm phải tự làm được |
|---|---:|---|---|
| 0–15 | 15 phút | Mục 1: bức tranh toàn project | Vẽ lại browser → React/Canvas → Flask → SQLite |
| 15–35 | 20 phút | Mục 2: đọc code từ số 0 | Giải thích biến, hàm, object, if, vòng lặp, import và callback |
| 35–55 | 20 phút | Mục 3: React và đường đi dữ liệu | Kể luồng main → App → GamePage → GameCanvas → engine |
| 55–80 | 25 phút | Mục 4: vòng lặp, di chuyển, rơi, va chạm | Tính được một frame và giải thích vì sao tự nhảy |
| 80–85 | 5 phút | Nghỉ | Rời màn hình, uống nước |
| 85–110 | 25 phút | Mục 5: camera, thế giới, bot, xếp hạng | Phân biệt y với độ cao; nói được cách bot chọn bệ |
| 110–125 | 15 phút | Mục 6: chuyển cảnh, hình ảnh, âm thanh | Kể đúng các phase và cơ chế vẽ |
| 125–150 | 25 phút | Mục 7: API và SQLite | Kể một lần POST kết quả và một lần GET lịch sử |
| 150–160 | 10 phút | Mục 8–9: backend online, power-up, chạy và kiểm tra | Phân biệt phần đang nối UI với phần mới có backend |
| 160–165 | 5 phút | Nghỉ | Đứng dậy, chuẩn bị demo |
| 165–180 | 15 phút | Mục 10–12: demo, lời nói mẫu, vấn đáp | Demo một lượt và nói liền mạch khoảng 5 phút |

**Nếu bị chậm:** ưu tiên mục 1, 3, 4, 7 và bài nói mẫu. Các chi tiết công thức Bézier, thuật toán chia khoảng cách bệ và thread là phần tra cứu khi bị hỏi sâu. Giữ nguyên 15 phút cuối để tập nói.

### Những điều phải nói đúng về bản code này

1. **Khung logic là 960 × 540, tỷ lệ 16:9.** Một tài liệu quy ước cũ ghi 640 × 520; Canvas hiện tại và code chạy đã dùng 960 × 540.
2. **Ván chơi chính là endless:** GamePage đặt `isEndless: true`, tắt đích và giới hạn thời gian; dung nham dâng đuổi theo người chơi. Ván thường kết thúc khi dung nham chạm nhân vật, trừ lúc tên lửa/khiên cứu được.
3. **Bot trong màn chơi chính dùng vật lý thật trong browser:** chọn bệ, điều khiển ngang, rơi, đáp bệ; bốn bot được thêm lần lượt sau 8, 16, 24 và 32 giây. Một mô phỏng đua hữu hạn riêng vẫn có tiến độ theo thời gian.
4. **Backend online đã có REST, phòng, sự kiện Socket.IO và bài kiểm tra.** GamePage của màn chơi chính chưa nối client Socket.IO; đây chưa phải tính năng nhiều người có thể demo từ UI.
5. **Có năm skin trong cấu hình và renderer; menu hiện chỉ nhận nickname và dùng skinId ban đầu.** Chưa có bộ chọn skin trên StartMenu hiện tại.
6. **HUD ghi “m”, nhưng code lấy trực tiếp độ chênh tọa độ pixel.** Chưa có phép đổi sang mét vật lý. Hiện HUD cũng theo dõi khoảng cách tới dung nham.
7. **UUID người chơi là định danh khách, không phải tài khoản đăng nhập.**
8. **Code thực thi quan trọng hơn comment.** Thông số vật lý rơi trong physics.js có thể khác hằng MAX_VY trong index.js; engine đang dùng physics.js.
9. **Số test/build cũ trong tài liệu được đo trên working tree trước khi dev nhận endless/lava; chưa xác minh lại trên commit dev hiện tại.** Đừng đọc số test cũ như kết quả mới nhất.

## 1. Project là gì? Các phần phối hợp như thế nào?

### 1.1. Một game thực chất liên tục đổi dữ liệu rồi vẽ dữ liệu đó

Máy tính không biết “nhân vật nhảy”. Nó biết một nhân vật có vị trí và vận tốc:

~~~js
{ x: 300, y: 388, vx: 0, vy: -520, width: 34, height: 42 }
~~~

Mỗi thời điểm, chương trình tính vị trí mới rồi vẽ nhân vật ở vị trí đó. Nhiều hình nối nhau tạo cảm giác chuyển động.

Trong project này:

- Người chơi nhấn A/D hoặc ←/→ để điều khiển ngang.
- Trọng lực làm nhân vật rơi.
- Đáp lên bệ thì vận tốc dọc đổi thành số âm, khiến nhân vật bật lên.
- Camera đi lên theo nhân vật; bệ mới được sinh phía trên.
- Các bot tự chọn bệ và dùng cùng các hàm vật lý/va chạm với người chơi.
- React hiển thị menu, độ cao, thứ hạng và kết quả.
- Flask cung cấp cấu hình và nhận kết quả; SQLite lưu lâu dài.

### 1.2. Bốn lớp chính

| Lớp | Hiểu đơn giản | Công việc cụ thể | Chạy ở đâu? |
|---|---|---|---|
| React | Người sắp giao diện | Menu, nhập tên, nút, HUD, modal, trạng thái lưu | Trình duyệt |
| Canvas + JavaScript engine | Sân chơi và người điều khiển sân | Vật lý, bệ, bot, camera, vẽ từng khung hình | Trình duyệt |
| Python Flask | Quầy tiếp nhận dữ liệu | API cấu hình, kiểm tra và lưu kết quả, backend phòng online | Tiến trình Python |
| SQLite | Sổ lưu kết quả | Bảng runs và kết quả phòng đua | File database trên máy backend |

**Frontend** là phần người dùng nhìn và tương tác trong browser. **Backend** là phần tiếp nhận yêu cầu và xử lý dữ liệu phía server. Trong demo local, cả hai cùng chạy trên laptop nhưng vẫn là hai tiến trình khác nhau.

~~~text
Browser tại http://localhost:5173
│
├── React: menu, nút, HUD, lịch sử
│        ↕ callback và gameRef
├── Canvas engine: input → cập nhật dữ liệu → vẽ
│
└── fetch /api/...
         ↓ Vite proxy khi phát triển
    Flask tại http://127.0.0.1:3000
         ↓ kiểm tra + câu SQL
    backend/instance/game.db
~~~

Proxy giống người chuyển thư: browser gửi đến /api/config trên cùng địa chỉ frontend; Vite chuyển yêu cầu sang Flask ở cổng 3000. Vite không tự tính luật hay tự lưu điểm.

### 1.3. Các ngôn ngữ dùng để làm gì?

| Loại file | Tác dụng | Ví dụ |
|---|---|---|
| .html | Khung trang web và điểm gắn React | frontend/index.html |
| .jsx | JavaScript có cú pháp viết giao diện React | GamePage.jsx |
| .js | Logic JavaScript | engine.js, physics.js |
| .css | Kích thước, màu, bố cục, hiệu ứng giao diện | styles.css |
| .py | Backend Python | app.py, routes/runs.py |
| .sql | Định nghĩa bảng, chỉ mục database | schema.sql |
| .json | Dữ liệu/cấu hình dạng văn bản | package.json |
| .mjs | Script JavaScript theo hệ module của Node | scripts/dev.mjs |
| .svg/.png/.ttf | Hình và font | frontend/public |

**React, Flask, Vite là công cụ/thư viện, không phải ba ngôn ngữ.** Ngôn ngữ lập trình chính là JavaScript và Python; SQL dùng để làm việc với dữ liệu.

### 1.4. Bản đồ toàn bộ các nhóm code

Các tên dưới đây đều tính từ thư mục project. Link mở trực tiếp file local được tập hợp ở mục 13.

| File/nhóm | Vai trò | Câu hỏi nên trả lời được |
|---|---|---|
| frontend/index.html | Chứa div root, nạp main.jsx | Browser bắt đầu từ đâu? |
| frontend/src/main.jsx, App.jsx | Gắn React rồi đưa GamePage lên | Màn hình chính do ai tạo? |
| pages/GamePage.jsx | Điều phối UI, engine, thông số và lưu kết quả | Ai gọi API sau khi game kết thúc? |
| components/GameCanvas.jsx | Tạo và hủy engine trên canvas | Engine gắn với React thế nào? |
| components/HUD.jsx | TopBar, FloatingHUD, StartMenu, GameOverModal, LeaderboardModal; còn HUD cũ | Ai hiển thị menu, lịch sử, kết quả? |
| hooks/useBackend.js | Lấy config, fallback offline, retry | Backend mất thì sao? |
| services/api.js | GET/POST JSON, xử lý HTTP lỗi | Dữ liệu sang Python bằng gì? |
| services/storage.js | Tiện ích localStorage/UUID | Dữ liệu nào ở browser? |
| game/engine.js | Vòng lặp, phase, bot vào sân, camera, kết thúc | Ai gọi các phần game theo đúng thứ tự? |
| game/input.js | Theo dõi bàn phím và dọn listener | A/D biến thành dữ liệu thế nào? |
| game/player.js | Tạo người chơi, gia tốc và ma sát ngang | Vì sao nhả phím còn trượt nhẹ? |
| game/physics.js, collision.js | Trọng lực, đáp bệ, tự bật, wrap, kiểm tra hình chữ nhật | Vì sao không bật nhảy từ dưới bệ? |
| game/world.js | Sinh tầng bệ, đường an toàn, bệ di động, dọn bệ | Bản đồ dài lên bằng cách nào? |
| game/bots.js, ranking.js | Chiến thuật bot, điều khiển bot, thứ hạng | Bot là AI kiểu gì? |
| game/render.js, doodle-art.js | Vẽ scene và nét doodle bằng Canvas | Dữ liệu chuyển thành hình thế nào? |
| game/sprites.js | Nạp/cache ảnh và vẽ ảnh | Ảnh chưa tải xong thì sao? |
| game/audio.js | Sinh âm thanh bằng Web Audio | Tiếng động lấy từ đâu? |
| game/intro-camera-motion.js | Đường chuyển động Bézier của camera intro | Vì sao camera tăng/giảm tốc? |
| game/index.js | Hằng số và profile bot dùng chung | Đổi thông số thì tìm ở đâu? |
| game/simulation.js | Các hàm mô phỏng tách khỏi Canvas | Có phải engine UI gọi step không? Không |
| styles.css, assets/, public/ | Giao diện, SVG, ảnh và font | Vì sao game giữ đúng tỷ lệ? |
| backend/app.py | Tạo Flask app, đăng ký route/socket, xử lý lỗi | Server khởi tạo thế nào? |
| backend/routes/config.py, rules.py | API health/config và bộ luật v1/v2 | Cấu hình tới frontend từ đâu? |
| backend/routes/runs.py | Lưu, đọc lượt, bảng top | Kết quả được kiểm tra và truy vấn ra sao? |
| backend/db.py, schema.sql | Kết nối SQLite, tạo bảng, đóng kết nối | Dữ liệu nằm đâu? |
| backend/errors.py | Loại lỗi API thống nhất | Vì sao lỗi trả JSON? |
| backend/routes/rooms.py, rooms.py | REST phòng và phòng trong RAM | Phòng online lưu ở đâu? |
| backend/socket.py, events/ | Socket.IO, join/ready/tick/skill/finish | Realtime khác REST thế nào? |
| scripts/, package.json, requirements.txt, vite.config.js | Setup, dev, build, test, dependency, proxy | Một lệnh chạy được hai phần bằng gì? |
| frontend/src/tests/, backend/tests/ | Kiểm tra hành vi tự động | Test chứng minh những gì? |
| docs/, README.md, FEATURE_MAP.md | Hướng dẫn và thiết kế | Tài liệu có luôn trùng code không? Cần đối chiếu |

**Bài tự kiểm tra 1:** không nhìn bảng, nói “người dùng bấm nút” thuộc React, “nhân vật rơi” thuộc engine, “lưu kết quả” đi qua Flask, “kết quả còn sau khi tắt server” nhờ SQLite.

## 2. Đọc code từ số 0

### 2.1. Biến, giá trị và phép gán

Biến là tên của một ô giữ dữ liệu.

~~~js
let elapsedMs = 0;
const GRAVITY = 1200;
elapsedMs = elapsedMs + 16;
~~~

- let cho phép gán lại biến.
- const không cho gán lại tên biến sang giá trị khác. Nếu giá trị là object, thuộc tính bên trong vẫn có thể đổi.
- Dấu = nghĩa là gán, không phải hỏi “có bằng nhau không”.
- elapsedMs += 16 là cách viết ngắn của elapsedMs = elapsedMs + 16.
- Số như 1200 là number; chữ trong nháy như 'running' là string; true/false là boolean.
- null nghĩa là chủ động để trống; undefined thường là chưa có giá trị.

Ví dụ **const player = {x: 300}** vẫn cho sửa **player.x = 320**; không cho thay cả player bằng object khác.

### 2.2. Object, array và Set

**Object** gom các thuộc tính của một đối tượng:

~~~js
const player = { x: 300, y: 388, vy: 0 };
player.y = 380;
~~~

Dấu chấm truy cập thuộc tính. player.y là y của player.

**Array** là danh sách:

~~~js
const bots = [botSon, botViet, botHiep, botNam];
bots[0];
~~~

Chỉ số bắt đầu từ 0: bots[0] là bot đầu. **Set** là tập hợp giá trị không lặp. input.js dùng Set để nhớ đồng thời A và mũi tên trái; thả A vẫn còn ← thì vẫn đi trái.

### 2.3. Hàm là một công việc có tên

~~~js
function add(a, b) {
  return a + b;
}
const result = add(2, 3);
~~~

a, b là tham số; 2, 3 là dữ liệu truyền vào; return trả kết quả 5. Hàm không chạy chỉ vì được viết ra: phải có nơi gọi nó.

Ví dụ thực tế: **applyPhysics(player, dt)** nhận người chơi và thời gian; nó sửa trực tiếp player.prevY, player.vy và player.y.

Cách viết mũi tên **(a, b) => a + b** cũng là hàm. Khi thấy **() => game.togglePause()**, hiểu là “đưa một công việc để gọi sau”, không phải lập tức pause.

### 2.4. Điều kiện và vòng lặp

~~~js
if (player.vy > 0) {
  // Nhân vật đang rơi.
}
for (const bot of bots) {
  applyPhysics(bot, dt);
}
~~~

- if chỉ chạy khi điều kiện đúng; else là nhánh còn lại.
- >, <, >=, <= là so sánh.
- === hỏi có bằng nhau theo giá trị và kiểu không.
- && nghĩa là tất cả điều kiện phải đúng; || nghĩa là có điều kiện đúng.
- ! đảo đúng/sai.
- for duyệt từng phần tử; while lặp đến khi điều kiện không còn đúng.
- return sớm có thể dừng hàm để không xử lý tiếp dữ liệu sai.

### 2.5. Những ký hiệu hay gặp trong project

| Cú pháp | Cách đọc |
|---|---|
| import { applyPhysics } from './physics.js' | Lấy hàm từ file khác |
| export function createGame(...) | Cho file khác dùng hàm này |
| const { player, world } = state | Lấy hai thuộc tính ra thành hai biến |
| function fn({name} = {}) | Nhận object, mặc định object rỗng nếu không truyền |
| {...run, height: 100} | Sao chép thuộc tính của run và thêm/ghi đè height |
| config?.finish_height | Đọc thuộc tính nếu config tồn tại |
| value ?? 3000 | Nếu value là null/undefined thì dùng 3000 |
| value || fallback | Dùng fallback khi value là giá trị falsy, gồm cả 0 và chuỗi rỗng |
| condition ? a : b | Điều kiện đúng lấy a, sai lấy b |
| Math.min(a, b) / Math.max(a, b) | Chọn số nhỏ hơn / lớn hơn |
| Math.round(x) / Math.floor(x) | Làm tròn gần nhất / làm tròn xuống |
| list.map(fn) | Tạo danh sách mới từ từng phần tử |
| list.filter(fn) | Giữ phần tử thỏa điều kiện |
| list.sort(fn) | Sắp xếp; sort sửa chính array được gọi |
| Number(true), Number(false) | Thành 1 và 0 |
| onGameOver?.(result) | Chỉ gọi callback nếu nó có tồn tại |

**Callback** là hàm đưa cho nơi khác để nơi đó gọi khi có sự kiện. GamePage đưa handleGameOver xuống; engine gọi nó khi lượt kết thúc. Giống để lại số điện thoại: “xong việc thì gọi lại”.

### 2.6. Bất đồng bộ: gửi yêu cầu rồi chờ kết quả

Đọc file ảnh hay gọi server không xong ngay. JavaScript dùng Promise và async/await để biểu diễn kết quả đến sau.

~~~js
async function loadConfig() {
  const response = await fetch('/api/config');
  return response.json();
}
~~~

fetch gửi HTTP; await chờ kết quả của tác vụ đó. Trình duyệt vẫn có thể xử lý tác vụ khác trong lúc chờ, không phải toàn bộ trang bị đứng. try/catch xử lý lỗi.

**JSON** là dạng văn bản trao đổi dữ liệu. Object JavaScript trong RAM khác chuỗi JSON:

~~~js
const data = { height: 100 };
const text = JSON.stringify(data);
const objectAgain = JSON.parse(text);
~~~

Trong JSON chuẩn, tên thuộc tính/chuỗi dùng nháy kép. HTTP mang chuỗi dữ liệu; Python đọc thành dict.

### 2.7. Đọc Python vừa đủ cho backend

~~~python
@config_api.get("/api/config")
def config():
    return jsonify(RULES)
~~~

- def tương ứng khai báo hàm.
- Python dùng thụt đầu dòng để xác định khối lệnh.
- dict tương tự object dữ liệu; list tương tự array.
- True/False/None tương ứng true/false/null.
- @... là decorator: ở đây đăng ký hàm xử lý khi có GET đúng đường dẫn.
- jsonify đóng gói dữ liệu thành response JSON.
- raise APIError(...) phát sinh lỗi để handler của Flask chuyển thành response.
- with quản lý một phạm vi tài nguyên/khóa; ví dụ with room.lock giữ khóa trong khi sửa phòng.
- class định nghĩa một loại đối tượng; dataclass giúp tạo đối tượng lưu nhiều trường như PlayerSession.

### 2.8. HTML/CSS/DOM vừa đủ để đọc giao diện game

Đọc đoạn giao diện tối giản sau; đây là ví dụ học, không phải thay thế component thật:

~~~html
<div class="menu-card">
  <label for="nickname">Tên người chơi</label>
  <input id="nickname" type="text" maxlength="24">
  <button type="button">Bắt đầu</button>
</div>
~~~

div nhóm nội dung; label đặt tên và liên kết input qua for/id; input nhận chữ; button tạo điều khiển. Trong JSX dùng className, htmlFor, maxLength và onClick theo cú pháp React. Browser tạo cây DOM: div là cha của label/input/button. Canvas cũng là một phần tử DOM, nhưng từng nhân vật vẽ bên trong chỉ là pixel.

CSS đọc như một câu “chọn ai → đổi thuộc tính gì”:

~~~css
.menu-card {
  padding: 20px;
  border: 2px solid #315d43;
}
.menu-card button:hover {
  background: #f6df83;
}
~~~

.menu-card chọn theo class; padding là đệm bên trong border; border là viền; :hover áp dụng khi trỏ vào nút. Các khối giao diện có content/padding/border/margin gọi là box model. CSS trong styles.css có thể đổi kích thước/hiệu ứng của thẻ và lớp UI; không trực tiếp đổi player.vy hay vị trí bệ trong state engine.

**Form và event:** người dùng gõ → onChange đổi nickname state; bấm submit → handler kiểm tra tên → callback chạy game. preventDefault chặn hành vi submit điều hướng trang theo mặc định. Đặt giao diện đúng chưa đủ để lưu dữ liệu: cần fetch gửi HTTP tới server ở mục 7.

**Bài tự kiểm tra 2:** đọc được câu “nếu đang rơi và chân frame trước còn trên bệ, còn chân frame này đã qua bệ, thì đặt nhân vật lên mặt bệ và bật lại”. Câu đó sẽ trở thành code trong mục 4.5.

## 3. Từ trang trắng đến game đang chạy: React và dữ liệu

### 3.1. Đường khởi động chính xác

~~~text
frontend/index.html
  └─ <div id="root"> + nạp /src/main.jsx
       └─ createRoot(...).render(<App />)
            └─ App hiển thị <GamePage />
                 ├─ useBackend() gọi GET /api/config
                 └─ khi có config: hiển thị <GameCanvas ... />
                      └─ useEffect gọi createGame(canvas, config, options)
                           └─ requestAnimationFrame(frame)
~~~

Mở lần lượt main.jsx, App.jsx, GamePage.jsx, GameCanvas.jsx rồi tìm createGame trong engine.js. Đây là tuyến code cần thuộc nhất.

### 3.2. Component, props và state

**Component** là một phần giao diện đóng gói thành hàm, như StartMenu hoặc GameOverModal.

**Props** là dữ liệu/lệnh component cha truyền cho component con. Ví dụ:

~~~jsx
<FloatingHUD currentHeight={stats.height} ranking={stats.ranking} />
~~~

GamePage truyền height/ranking; FloatingHUD đọc và hiển thị. Nó không tự tính trọng lực.

**State React** là dữ liệu mà khi thay đổi thì React cập nhật giao diện:

~~~jsx
const [phase, setPhase] = useState('intro_title');
~~~

phase là giá trị hiện tại; setPhase yêu cầu React cập nhật giá trị và render lại. Đừng sửa trực tiếp phase hay object state rồi mong UI tự nhận ra.

GamePage quản lý:

| State/ref | Lưu gì? | Dùng làm gì? |
|---|---|---|
| phase | Giai đoạn hiện tại | Quyết định menu/HUD/modal nào xuất hiện |
| stats, elapsedMs | Độ cao, kỷ lục, thứ hạng, thời gian | Hiển thị thống kê |
| playerProfile | Nickname và skinId | Tên/skin trong game và kết quả |
| save | saving / saved / error và thông báo | Báo kết quả lưu |
| recordMode | null, history hoặc leaderboard | Mở đúng cửa sổ dữ liệu |
| restartKey | Số lần yêu cầu tạo engine lại qua fallback | Dependency của GameCanvas |
| gameRef | Object điều khiển engine | Pause, restart, về menu, đặt tên/skin |
| runRef | Thông tin lượt hiện tại | POST đúng người, đúng run_id |

### 3.3. Vì sao dùng useRef?

useRef giữ một giá trị qua các lần React render mà việc đổi ref không tự render lại.

- **canvasRef.current** trỏ vào thẻ canvas thật.
- **gameRef.current** giữ object trả về từ createGame.
- **runRef.current** giữ metadata lượt chơi.
- **isPausedRef.current** giữ trạng thái pause mới nhất, để hàm trong engine đọc qua callback.

Không đẩy mọi tọa độ mỗi frame vào state React: engine giữ dữ liệu chuyển động trong object riêng; React chỉ nhận thống kê cần hiển thị. publishStats giới hạn báo khoảng mỗi 100 ms, tức tối đa khoảng 10 lần/giây trong điều kiện thường.

### 3.4. useEffect: tạo và dọn tài nguyên

Trong GameCanvas:

~~~jsx
useEffect(() => {
  const game = createGame(canvasRef.current, config, options);
  return () => game.destroy();
}, [config, showLoopDemo, restartKey, enableIntro]);
~~~

Đây là bản rút gọn để đọc: options đại diện object callback trong file thật.

- Sau khi component đã có canvas, effect tạo engine.
- Khi component bị gỡ hoặc dependency thay đổi, cleanup hủy engine cũ.
- Dependency là dữ liệu effect theo dõi; callback props không nằm trong danh sách này.
- destroy hủy frame đang chờ, gỡ listener và xóa canvas.
- main.jsx dùng React.StrictMode; trong development, React có thể chạy chu kỳ effect/cleanup thêm để phát hiện lỗi. Cleanup đúng giúp tránh hai vòng game chạy song song.

useBackend cũng có cleanup: AbortController hủy/đánh dấu yêu cầu config khi effect không còn dùng. Nhờ kiểm tra signal.aborted, response cũ không ghi đè state sau cleanup.

**useCallback** giúp giữ tham chiếu hàm giữa các lần render khi dependency không đổi. Không phải cache giá trị trả về hay biến hàm thành chạy nền.

### 3.5. Luồng người dùng nhập tên rồi bấm bắt đầu

~~~text
StartMenu: nickname state
  → trim và kiểm tra 1–24 ký tự
  → onStartGame({ nickname, skinId })
  → GamePage.handleStartGame
      → tạo run_id mới, lấy player_id, giữ trong runRef
      → gameRef.setPlayerName / setPlayerSkin
      → reset số hiển thị
      → gameRef.beginPlayerEntrance()
  → engine chạy intro_platform → intro_player → intro_reveal
  → intro_wait_input
  → nhấn A/D hoặc ←/→ mới bắt đầu chạy và tính giờ
~~~

Có **hai bước bắt đầu**: nút trên title đưa camera xuống menu; nút BẮT ĐẦU CHƠI trong menu đưa nhân vật vào sân. Sau đó engine vẫn đợi phím điều khiển để xuất phát.

### 3.6. Luồng từ engine trở lại React

~~~text
engine.publishStats()
  → onStats({...})
  → GameCanvas truyền onUpdateStats vào onStats
  → GamePage.handleUpdateStats()
  → setStats + setElapsedMs
  → FloatingHUD và TopBar hiển thị dữ liệu mới
~~~

Khi kết thúc:

~~~text
engine.endRun()
  → setPhase('finished') + onGameOver(result)
  → GamePage.handleGameOver(result)
  → hiện modal
  → POST /api/runs nếu có lượt hợp lệ và không offline
  → thông báo lưu thành công hoặc lỗi
~~~

**Bài tự kiểm tra 3:** giải thích hai chiều bằng một câu: “React gọi engine qua gameRef; engine báo ngược React qua callback”. Sau đó chỉ đúng handleStartGame và handleGameOver trong GamePage.

## 4. Trái tim game: vòng lặp, vận tốc, trọng lực và va chạm

Nguồn chính: engine.js → input.js → player.js → physics.js → collision.js.

### 4.1. Game loop và requestAnimationFrame

Game loop là chu kỳ:

~~~text
đọc điều khiển → cập nhật trạng thái → vẽ trạng thái → xin frame kế tiếp
~~~

requestAnimationFrame yêu cầu browser gọi hàm trước lần vẽ màn tiếp theo. Không đảm bảo cố định 60 FPS; tốc độ tùy màn hình và máy. engine.frame nhận time theo mili-giây để tính thời gian trôi qua.

~~~js
const rawDt = previousTime === null ? 0 : Math.max((time - previousTime) / 1000, 0);
const dt = Math.min(rawDt, 1 / 30);
previousTime = time;
~~~

- Nếu frame trước ở 1000 ms, frame mới ở 1016,67 ms, rawDt ≈ 0,01667 giây.
- dt tối đa 1/30 giây ≈ 0,03333 giây để tránh một bước vật lý quá lớn.
- Frame đầu dt = 0 vì chưa có previousTime.
- Timer khi running tăng theo rawDt; vật lý dùng dt bị giới hạn.
- Vì vậy khi tab bị chậm rất lâu, vật lý không nhảy một bước khổng lồ nhưng timer có thể tăng mạnh. Đây chưa phải mô phỏng fixed timestep với accumulator dù index có hằng FIXED_DT.

### 4.2. Thứ tự một frame ở phase running

Theo engine hiện tại:

1. Tăng elapsedMs theo rawDt; cho bot vào sân nếu đã tới mốc.
2. Tính direction từ input.
3. updateHorizontal người chơi, rồi handleScreenWrap.
4. updatePlatforms: dịch bệ và sinh/dọn bệ.
5. applyPhysics người chơi, rồi handlePlatformCollisions.
6. Với mỗi bot sống: hoạt cảnh vào sân hoặc AI ngang; tiếp tục vật lý và va chạm; đánh dấu chết nếu rơi sâu dưới màn hình.
7. Tính currentHeight, maxHeight và progress cao nhất của bot; publishStats.
8. Cập nhật camera.
9. Kiểm tra đích, hết giờ, rơi.
10. render Canvas; tăng frameCount; xin frame tiếp.

Thứ tự có ý nghĩa: phải lưu prevY trước khi đổi y, phải cập nhật vật lý trước khi kiểm tra chân đã đi qua mặt bệ hay chưa.

### 4.3. Input đổi phím thành hướng -1, 0, 1

input.state có left và right.

~~~js
const direction = Number(input.state.right) - Number(input.state.left);
~~~

| left | right | direction | Hành vi |
|---|---|---:|---|
| false | false | 0 | Hãm vận tốc ngang bằng ma sát |
| true | false | -1 | Gia tốc sang trái |
| false | true | 1 | Gia tốc sang phải |
| true | true | 0 | Không chọn hướng; hãm |

input dùng hai Set để quản lý nhiều phím cùng hướng. Khi browser mất focus, blur xóa cả hai trạng thái để nhân vật không chạy mãi vì đã bỏ lỡ keyup.

Cảm ứng đi qua **GamePage → gameRef.setDirection('left/right', true/false)**. Pointer capture giúp nút tiếp tục nhận sự kiện thả; cancel/lost capture cũng tắt hướng.

### 4.4. Tọa độ và vận tốc

Gốc Canvas ở góc trên trái. x tăng sang phải, y tăng xuống dưới.

- vx > 0: sang phải; vx < 0: sang trái.
- vy > 0: rơi xuống; vy < 0: đi lên.
- Vận tốc đơn vị pixel/giây.
- Gia tốc đơn vị pixel/giây².
- dt dùng giây; elapsedMs dùng mili-giây.

**Di chuyển ngang hiện tại có gia tốc và ma sát**, không phải luôn cố định 240 px/giây như quy ước ban đầu. player.js dùng ACCE = 1800, MASATTRUOT = 2000, MAX_VX = 420 từ index.

Ví dụ bắt đầu vx = 0, giữ phải, dt = 1/60:

~~~text
vx mới = min(420, 0 + 1800 × 1/60) = 30
x tăng = 30 × 1/60 = 0,5 pixel
~~~

Khi nhả phím và vx = 120:

~~~text
vx mới = max(0, 120 − 2000 × 1/60) ≈ 86,67
~~~

Nhân vật giảm tốc thay vì dừng tức thì. Khi đổi hướng đang có vận tốc ngược, code dùng gia tốc cộng ma sát để phanh nhanh hơn.

**Vật lý dọc** trong physics.js:

~~~js
player.prevY = player.y;
player.vy = Math.min(MAX_VY, player.vy + GRAVITY * dt);
player.y += player.vy * dt;
~~~

GRAVITY = 1200, MAX_VY tại file này = 900. Nếu y = 100, vy = 0, dt = 1/60:

~~~text
prevY = 100
vy mới = 0 + 1200 / 60 = 20
y mới = 100 + 20 / 60 = 100,3333
~~~

Nếu vy = -520 lúc bật lên, trọng lực cộng số dương dần làm vy tới 0 ở đỉnh rồi thành dương để rơi. Cách tính dùng vận tốc vừa cập nhật, thường gọi là semi-implicit Euler.

Công thức lý tưởng giúp hiểu sức nhảy:

~~~text
thời gian tới đỉnh ≈ 520 / 1200 = 0,433 giây
độ cao nhảy ≈ 520² / (2 × 1200) = 112,67 pixel
~~~

Đây là ước lượng liên tục; game tính theo từng bước nên có sai số. Không dùng công thức này để khẳng định mọi bố trí bệ chắc chắn chơi được.

### 4.5. Đáp bệ: phải rơi từ trên xuống

Hàm isLandingOnPlatform kiểm tra:

~~~js
return (
  player.vy > 0 &&
  Number.isFinite(player.prevY) &&
  player.x < platform.x + platform.width &&
  player.x + player.width > platform.x &&
  player.prevY + player.height <= platform.y &&
  player.y + player.height >= platform.y
);
~~~

Đọc từng dòng:

1. vy > 0: chỉ nhận khi đang rơi.
2. prevY là số hữu hạn: có vị trí trước để so sánh.
3. Hai khoảng ngang của người và bệ chồng nhau.
4. Chân frame trước còn ở trên hoặc đúng mặt bệ.
5. Chân frame mới đã tới hoặc đi qua mặt bệ.

Ví dụ height = 42, mặt bệ y = 430:

~~~text
y trước = 386 → chân trước = 428
y mới   = 390 → chân mới   = 432
428 <= 430 và 432 >= 430 → đã rơi qua mặt bệ
~~~

Nếu nhân vật ở dưới bệ và vừa đổi từ bay lên sang rơi, chân frame trước đã dưới 430: không nhận đáp bệ. Đây là lý do không tự bật thêm khi chạm bệ từ dưới.

checkAABB kiểm tra hai hình chữ nhật chồng nhau bằng bốn bất đẳng thức. **AABB đơn thuần không đủ để biết đáp lên mặt bệ**; game cần thêm chiều rơi và vị trí frame trước.

### 4.6. Va chạm xong thì tự nhảy

handlePlatformCollisions duyệt bệ không broken và chọn bệ đáp có y nhỏ nhất nếu vượt nhiều mặt bệ trong cùng frame.

~~~js
player.y = landing.y - player.height;
player.vy = JUMP_VELOCITY * bounceMultiplier;
~~~

- Đặt chân chính xác lên mặt bệ để không chìm vào bệ.
- JUMP_VELOCITY = -520 làm nhân vật tự bật lên.
- Bệ bouncy nhân với bounceMultiplier, mặc định 1,45 → vy = -754.
- Bệ fragile hoặc breakable đặt broken = true ngay sau khi đáp.
- Nếu có callback onBounce thì gọi nó; bot dùng để chọn mục tiêu tiếp theo.

Không phải tất cả giá trị trong index đều đang áp dụng: SPRING_JUMP_VELOCITY = -850 và BREAKABLE_DELAY = 200 có khai báo, nhưng đường va chạm hiện tại dùng multiplier và đánh dấu broken ngay.

### 4.7. Qua mép màn hình

handleScreenWrap:

- Nếu toàn nhân vật đã vượt mép phải: x = -width.
- Nếu toàn nhân vật đã vượt mép trái: x = canvas.width.

Nó xuất hiện lại ở đầu bên kia. Logic này sửa x, không tạo thêm người chơi. Bot cũng có wrap, và khi lựa bệ nó có thể tính đường đi ngang qua mép ngắn hơn.

### 4.8. Pause, kết thúc và dọn dẹp

Khi paused, frame cập nhật previousTime rồi xin frame mới và return trước khi chạy vật lý/timer/render. Vì vậy tiếp tục không cộng toàn khoảng pause vào lượt.

endRun chặn gọi lặp bằng isGameOver. Nó xác định:

| reason | Điều kiện | outcome gửi server |
|---|---|---|
| goal | maxHeight đạt finish_height, mặc định 3000 | finished |
| timeout | elapsedMs đạt max_duration_ms, mặc định 180000 | dnf |
| fall | y − cameraY vượt 540 + chiều cao người chơi | dnf |

DNF = Did Not Finish, nghĩa là không hoàn thành. “finished” cũng là tên phase kết thúc, kể cả lượt DNF; phải phân biệt **phase giao diện** và **outcome kết quả**.

destroy dừng engine vĩnh viễn và gỡ listener. Pause chỉ giữ nguyên lượt để tiếp tục; restart reset dữ liệu lượt; ba hành vi khác nhau.

**Bài tự kiểm tra 4:** tự tính ví dụ rơi y = 100 ở mục 4.4; sau đó giải thích vì sao chỉ chạm hình chữ nhật chưa đủ kết luận nhân vật đáp lên bệ.

## 5. Camera, sinh bản đồ, bot và thứ hạng

### 5.1. Tọa độ thế giới khác tọa độ màn hình

Tọa độ thế giới là vị trí thật trong bản đồ. Tọa độ màn hình là nơi vẽ trong khung 540 pixel.

~~~js
const screenY = entity.y - world.cameraY;
~~~

Ví dụ bệ có world y = -200, cameraY = -400 thì screenY = 200: bệ được vẽ cách mép trên 200 pixel. Camera đi lên nghĩa là cameraY giảm. Không cần sửa y của mọi bệ để làm chúng trôi xuống trên màn hình.

Engine theo người chơi:

~~~js
const sightRatio = config?.cameraRatio ?? CAMERA_SIGHT_RATIO ?? 0.60;
const cameraTargetY = state.player.y - canvas.height * sightRatio;
state.world.cameraY = Math.min(state.world.cameraY, cameraTargetY);
~~~

Ở khung cao 540, tỷ lệ 0,60 tương ứng vị trí mục tiêu 324 pixel từ trên xuống. Math.min làm camera chỉ đi lên trong gameplay; khi người chơi rơi, camera không đuổi theo xuống để cứu.

**Điểm phân biệt:** background.png được đặt bằng CSS của game-stage; renderer còn vẽ lưới có offset theo camera. Nền ảnh cố định và các nét lưới Canvas không phải cùng một lớp.

### 5.2. Current height và max height

~~~js
const currentHeight = Math.max(0, Math.round(388 - state.player.y));
~~~

388 là y xuất phát của góc trên nhân vật.

- y = 288 → độ cao 100.
- y = -112 → độ cao 500.
- Nhân vật rơi thì currentHeight giảm.
- maxHeight chỉ tăng, ghi nhớ điểm cao nhất đã đạt.
- Đích kiểm tra maxHeight; xếp hạng trong lượt cũng dùng độ cao cao nhất.
- HUD hiển thị đơn vị “m” theo cách đặt nhãn; phép tính thực tế là chênh lệch pixel.

Không dùng screenY để tính thành tích: camera di chuyển chỉ thay cách nhìn, không thay độ cao thật.

### 5.3. world.js tạo gì?

createWorld trả object có platforms, cameraY, routeX, floorY, finishY, seed, isFinite, densityScale và rng.

Bệ thường là:

~~~js
{ x: 257, y: 430, width: 120, height: 14, type: 'standard', safe: true }
~~~

- x/y: vị trí góc trên trái trong thế giới.
- width/height: kích thước vùng va chạm.
- type: loại bệ.
- safe: bệ đánh dấu thuộc đường đi an toàn.
- Bệ moving thêm vx, minX, maxX.
- Bệ fragile có broken.
- Bệ bouncy có bounceMultiplier.

world.js có hai kiểu bản đồ: hữu hạn với sàn/đích riêng, và sinh tiếp theo camera. Engine chính gọi createWorld không bật isFinite, nên dùng bộ sinh tiếp. Tuy nhiên engine vẫn kết thúc lượt tại config.finish_height.

### 5.4. Seed và sinh ngẫu nhiên có kiểm soát

Random thông thường tạo kết quả khác qua mỗi lần chơi. **Seed** là số khởi đầu cho bộ sinh số giả ngẫu nhiên. seededRandom(seed) tạo một hàm rng; cùng seed và cùng thứ tự gọi sẽ tạo cùng dãy số.

Điều này hữu ích khi kiểm thử tái hiện bản đồ hoặc gửi seed cho nhiều client online. **Cùng seed không đảm bảo toàn bộ trận giống nhau** nếu client gọi rng khác số lần hay dùng Math.random cho các phần khác. Bot và thứ tự reveal hiện có phần dùng Math.random riêng.

### 5.5. Sinh một tầng bệ

createPlatformTier:

1. Chọn số bệ và các khoảng trống ngang.
2. Đặt bệ trong chiều rộng 960.
3. Cho bệ lệch cao độ để không nằm trên một hàng hoàn toàn.
4. Chọn loại bệ bằng pickRandomType.
5. resolveTier sửa chồng lấn và giới hạn bệ moving.
6. ensureRoute cố chọn/đặt bệ chuẩn gần routeX trước để nối đường đi.

Xác suất ban đầu: standard 50%, moving 20%, fragile 15%, bouncy 15%. **Đó không phải tỷ lệ cuối cùng tuyệt đối**, vì ensureRoute có thể đổi bệ thành standard, hoặc thêm bệ safe.

getPlatformCountForHeight giảm số bệ dự kiến từ 4 xuống tối thiểu 2 theo độ cao; ensureRoute có thể thêm bệ nữa. Mục đích: càng leo cao càng khó, nhưng vẫn cố có đường tiếp.

Thông số sinh tầng thường bước 62–70 pixel; các bệ trong tầng còn lệch nhau. Đây là lý do code có cả kiểm tra đường route và bài test reachability.

### 5.6. Bệ mới xuất hiện và bệ cũ được dọn

updatePlatforms làm ba việc:

- Dịch moving platform theo vx × dt; chạm giới hạn thì đổi chiều.
- Nếu world.isFinite thì dừng phần sinh/dọn.
- Nếu world sinh tiếp: tạo bệ lên tới vùng phía trên camera khoảng 250 pixel; bỏ bệ nằm quá thấp, với điều kiện y − cameraY < 550 để giữ lại.

Dọn bệ giúp danh sách không dài vô hạn khi chơi. Bệ broken cũng được renderer và collision bỏ qua; việc không vẽ khác việc xóa khỏi array.

**Khoảng trống intro:** createWorld({forIntro: true}) bỏ một vùng trời để bố cục chuyển cảnh. startSlideDown gọi fillGameplayPlatforms vá vùng này cho gameplay; render lại ẩn bệ trong thời gian slide. Đừng nói game vĩnh viễn không có bệ ở vùng intro.

### 5.7. Bot không dùng machine learning

Bot là **AI theo luật/heuristic**: chương trình tự chọn một mục tiêu dựa trên điều kiện và điểm ưu tiên. Không có mô hình được huấn luyện, mạng neural hay gọi API AI trong đường chạy này.

| Bot | Profile | Hành vi nổi bật |
|---|---|---|
| Thầy Sơn | NOVICE | Ưu tiên bệ gần/rộng, phản ứng chậm, sai số ngắm lớn |
| Thầy Việt | STANDARD | Chọn bệ tương đối gần và an toàn |
| Thầy Hiệp | SPEEDRUNNER | Chấm điểm cao độ và khoảng cách để leo tích cực |
| Thầy Nam | PERFECT | Ưu tiên bệ không bị bot khác nhắm, sai số nhỏ |

Tên PERFECT không có nghĩa là chắc chắn không chết. Các bot có vận tốc, sai số ngắm, thời gian phản ứng và rủi ro.

findTargetPlatform đọc vị trí bot, loại bệ vừa đáp và các bệ còn nguyên:

- Khi rơi: cố chọn bệ có thể đáp ở phía dưới gần mình.
- Khi bật lên: tìm bệ trên trong tầm cao độ; bệ bouncy cho tầm chọn rộng hơn.
- Ưu tiên bệ an toàn, đôi khi cố tình chọn bệ dễ vỡ theo xác suất lỗi.
- Cân nhắc đường ngang trực tiếp và đường wrap.
- Chọn theo strategy của profile.
- Không có ứng viên lý tưởng thì dùng các nhánh fallback.

updateBotAI lái vx tới tâm bệ cộng targetOffsetX; gần tâm thì giảm tốc. **AI này chủ yếu điều khiển ngang**; applyPhysics và handlePlatformCollisions lo chuyển động dọc. onBotBounce ghi bệ vừa đáp, xóa target để lựa mục tiêu mới và đặt reactionTimer.

### 5.8. Bot vào sân lúc nào?

Trong intro bình thường, người chơi xuất phát một mình. Khi running đạt **8, 16, 24, 32 giây**, engine thêm từng bot.

joinNextBot chọn bệ còn nguyên gần mép vào sân, luân phiên trái/phải; không có bệ phù hợp thì đặt bệ chuẩn gần mép. Hoạt cảnh ngang kéo dài khoảng 900 ms; bot vẫn chịu trọng lực/va chạm trong thời gian đó. Kết thúc hoạt cảnh không tự cấp thêm cú nhảy: chỉ đáp bệ thật mới bật lại.

Nếu chạy ?demo=loop, engine không bật intro và tạo sẵn bot từ đầu; đừng dùng flow debug đó để mô tả flow người dùng bình thường.

### 5.9. Ba thứ hay bị nhầm về bot

1. **updateBotAI:** đang dùng trong engine chính.
2. **updateRaceBots:** tính progress theo tốc độ và thời gian; có dùng trong một số test, engine chính không gọi.
3. **simulation.js:** một đường mô phỏng tách khỏi Canvas, có createState, step, snapshot, finish; GameCanvas đang import createGame từ engine, không gọi step.

Nếu thầy chỉ vào simulation.js, có thể nói: “Module này mô phỏng state riêng. Luồng giao diện hiện tại chạy engine.js; hai nơi cùng dùng các module vật lý nhưng chưa dùng chung một hàm điều phối duy nhất.”

### 5.10. Xếp hạng

getRanking tạo array participants mới gồm player và các bot đã vào sân. Sắp progress giảm dần; bằng nhau thì so id bằng localeCompare.

Ví dụ player = 100, botSon = 80, botViet = 120:

~~~text
1. botViet: 120
2. player: 100
3. botSon: 80
~~~

Nếu người chơi và bot cùng 100, thứ tự theo id chứ không theo thời điểm đạt 100. Bot chết vẫn có thể ở danh sách với độ cao đã đạt; code không tự đẩy mọi bot chết xuống cuối. BXH trong lượt khác top 10 từ database: hai nơi dùng tiêu chí khác nhau.

**Bài tự kiểm tra 5:** bệ y = -300, cameraY = -500 thì vẽ tại đâu? Nhân vật y = -112 đạt độ cao nào? Nói một câu phân biệt bot theo luật với mô hình AI học máy.

## 6. Chuyển cảnh, Canvas, ảnh, CSS và âm thanh

### 6.1. Phase là một máy trạng thái

Máy trạng thái nghĩa là chương trình biết đang ở giai đoạn nào và chỉ cho hành vi phù hợp giai đoạn đó. Không phải mỗi frame đều chạy vật lý; intro, ready và running có nhánh riêng.

~~~text
intro_title
   │ click START trên Canvas, hoặc Enter/Space
   ▼
intro_sliding         camera đi xuống khoảng 2400 ms
   ▼
intro_menu_delay      đợi 500 ms
   ▼
ready                React hiện menu nhập tên
   │ bấm BẮT ĐẦU CHƠI
   ▼
intro_platform       hiện bệ đầu khoảng 500 ms
   ▼
intro_player         nhân vật vào sân khoảng 900 ms
   ▼
intro_reveal         bệ xung quanh hiện khoảng 1800 ms
   ▼
intro_wait_input     chờ A/D, ←/→ hoặc nút chạm
   ▼
running ↔ paused
   │ lava (endless main mode) / goal / fall / timeout (finite mode)
   ▼
finished
~~~

Nhánh bổ sung:

~~~text
Chơi lại → wipe_reset (~650 ms, reset giữa wipe) → warmup_hop (~550 ms) → running
Về menu  → returning_title (~2400 ms) → intro_title
~~~

setPhase cập nhật cả phase trong engine lẫn state.phase, rồi gọi onPhaseChange để React đổi UI. reduced-motion rút ngắn nhiều hoạt cảnh.

### 6.2. Vì sao camera intro chuyển động mượt?

intro-camera-motion.js lưu bốn điểm đường cubic Bézier. Thời gian chuẩn hóa t đi từ 0 đến 1; hàm tìm tham số đường cong u bằng chia đôi 48 bước sao cho tọa độ thời gian của curve khớp t; sau đó mới tính giá trị vị trí.

Không thể lấy u = t rồi mặc nhiên cho đó là đúng vận tốc theo thời gian: điểm điều khiển còn tác động lên trục thời gian. Kết quả trả value và velocity:

- value dùng để nội suy camera từ -2400 đến 0.
- velocity dùng để tính nhòe chuyển động.
- Curve giữ một chút vượt đích ở đoạn cuối; engine chốt camera bằng 0 khi kết thúc.

Câu nói vừa đủ: “Em dùng đường Bézier điều khiển vị trí theo thời gian, nên camera tăng và giảm tốc. Hàm phải giải tọa độ thời gian trước rồi mới lấy tọa độ vị trí.”

### 6.3. render không tính luật chơi

render(ctx, state) đọc dữ liệu và vẽ. Nó không quyết định thắng hay ghi database.

Thứ tự chính: xóa canvas → vẽ lưới → vẽ các bệ nhìn thấy → bot sống → người chơi → title/hướng dẫn/wipe khi cần.

- clearRect xóa hình cũ, tránh vệt ảnh tích lũy.
- save/restore giữ và phục hồi trạng thái vẽ như alpha, transform, filter.
- y − cameraY đổi từ tọa độ thế giới sang màn hình.
- globalAlpha điều khiển độ trong suốt lúc reveal.
- Những vật nằm ngoài vùng nhìn được bỏ qua.
- Trong hoạt cảnh intro_player, render tạo displayPlayer với x/y nội suy để vẽ; đó là đường diễn hoạt cảnh, chưa phải một lượt vật lý đang running.

Canvas là một vùng pixel. Nhân vật và từng bệ trên Canvas không tự trở thành thẻ HTML để CSS chọn; menu/HUD phía trên lại là DOM React thật.

### 6.4. Hình ảnh, nét doodle và cache

sprites.js nạp ảnh bằng Image, lưu trong Map và đánh dấu ready/failed. preloading tránh tạo Image mới cho cùng đường dẫn mỗi frame.

drawSprite trả false nếu ảnh chưa sẵn sàng; render có thể vẽ hình doodle/hình đơn giản dự phòng. Vùng ảnh bot có thể lớn hơn hộp va chạm; **ảnh hiển thị và hitbox khác nhau**.

doodle-art.js cung cấp các hàm vẽ nét phác: platform, title, nút start, hướng dẫn, nhân vật dự phòng và wipe. Nó tạo cảm giác stop-motion bằng thay đổi nét vẽ theo thời gian. render còn cache artwork title trên canvas phụ để tái sử dụng khi thích hợp.

Trong HUD.jsx, PencilFrame dùng SVG và animate; StartMenu còn có requestAnimationFrame riêng để animate burst và hover. Cleanup cũng phải hủy frame/listener của menu, không chỉ engine.

### 6.5. CSS giữ tỷ lệ và đặt UI lên Canvas

Canvas có width/height logic 960/540. CSS co khung hiển thị theo viewport nhưng giữ 16:9:

~~~css
.game-stage {
  width: min(100vw, 177.7778dvh);
  height: min(100dvh, 56.25vw);
  aspect-ratio: 16 / 9;
}
~~~

width/height thuộc tính Canvas quyết định không gian vẽ; width/height CSS quyết định kích thước hiện trên màn hình. Nếu click vào Canvas đã scale, engine lấy getBoundingClientRect và nhân tỷ lệ canvas.width / rect.width để đổi tọa độ chuột về tọa độ logic.

position và z-index giúp menu/HUD đè lên sân chơi. Media query cho thiết bị pointer coarse hiển thị nút chạm; màn hẹp điều chỉnh modal/HUD. prefers-reduced-motion giảm hiệu ứng cho người dùng đã bật lựa chọn đó.

### 6.6. Tiếng động được sinh bằng Web Audio

audio.js tạo AudioContext, oscillator/buffer, filter và gain:

- oscillator sinh sóng âm.
- frequency điều khiển cao độ.
- gain điều khiển âm lượng.
- buffer noise và filter tạo tiếng whoosh.
- start/stop cùng các đường ramp tạo đoạn âm thanh ngắn.

Các hàm có playWhoosh, playHop, playLaunch, playWipe, playGameOver. Đây là âm hiệu ứng tổng hợp; bản này chưa có luồng phát nhạc nền dài. Hàm playHop có thể tồn tại nhưng không được gọi tại mọi va chạm người chơi trong engine.

AudioContext được tạo/resume khi có hành động phù hợp; browser có chính sách hạn chế âm tự phát. toggleSound có trong class nhưng không có nghĩa là menu hiện đã nối một nút tắt âm.

**Bài tự kiểm tra 6:** không nhìn sơ đồ, kể từ intro_title đến running. Chỉ ra phần nào là pixel Canvas, phần nào là thẻ HTML React.

## 7. Web backend: HTTP, Flask, JSON và SQLite

Đây là phần cần nhấn mạnh khi trình bày môn Web: game thể hiện tương tác frontend, còn config, lịch sử và bảng kết quả thể hiện giao tiếp client-server và lưu dữ liệu.

### 7.1. HTTP request có những gì?

Một request có method, URL/path, headers và có thể có body. Response có status code, headers và body.

~~~text
GET /api/config
→ đọc cấu hình, response JSON

POST /api/runs
Content-Type: application/json
body: dữ liệu lượt chơi
→ kiểm tra và tạo bản ghi
~~~

GET phục vụ đọc dữ liệu; POST gửi dữ liệu cần xử lý/tạo mới. JSON không phải database; nó là định dạng trao đổi.

fetch không tự throw chỉ vì HTTP 422/500. services/api.js phải kiểm tra response.ok rồi đọc error.message. POST có AbortSignal.timeout(10000), giới hạn chờ 10 giây. GET config có AbortController từ hook nhưng không đặt timeout 10 giây giống POST.

### 7.2. Flask khởi tạo ở đâu?

create_app trong app.py:

1. Tạo Flask instance.
2. Đặt đường DATABASE mặc định backend/instance/game.db.
3. Giới hạn request body 16 KiB.
4. Đăng ký ba Blueprint: config, runs, rooms.
5. Gắn SocketIO và các event đã import.
6. Đăng ký close_db sau khi app context kết thúc.
7. Định nghĩa handler lỗi và lệnh init-db.

**Blueprint** gom route theo nhóm để app.py không chứa tất cả endpoint.

Quan trọng: create_app không tự gọi init_db trong đường thực thi hiện tại. Script setup chạy lệnh Flask init-db riêng. Comment nói “khởi động tự tạo bảng” không đủ để kết luận đúng.

### 7.3. Các API REST thật trong project

| Method và đường dẫn | Input chính | Output/hành vi |
|---|---|---|
| GET /api/health | Không | status, service, version |
| GET /api/config | Không | RULES v1: finish_height, max_duration_ms, skins, bots |
| POST /api/runs | JSON kết quả | 201 tạo mới; 200 gửi lại giống; 409 trùng ID khác nội dung |
| GET /api/runs?player_id=UUID | player_id, tùy chọn rules_version | Tối đa 20 lượt mới nhất của khách |
| GET /api/runs/:run_id | run_id trên path | Một lượt; 404 nếu không có |
| GET /api/leaderboard?rules_version=v1 | Phiên bản luật | Top 10 lượt theo tiêu chí SQL |
| POST /api/rooms | host_player_id, nickname, skin_id | Tạo phòng trong RAM, trả mã phòng |
| GET /api/rooms/:identifier | Mã phòng hoặc room_id | Trạng thái phòng |
| POST /api/rooms/:identifier/join | player_id, nickname, skin_id | Thêm vào phòng chờ còn chỗ |

Dấu : ở bảng nghĩa là một giá trị trên đường dẫn, không phải gõ nguyên :run_id khi gọi API.

### 7.4. Một kết quả đi từ game đến database

Khi bắt đầu, GamePage tạo metadata lượt:

~~~text
run_id: mã UUID mới mỗi lượt
player_id: mã khách lấy từ localStorage hoặc sinh mới
nickname, skin_id, rules_version
~~~

Khi endRun báo kết quả, GamePage ghép metadata và các số:

~~~json
{
  "run_id": "11111111-1111-4111-8111-111111111111",
  "player_id": "22222222-2222-4222-8222-222222222222",
  "nickname": "Vinh",
  "skin_id": "doodle",
  "rules_version": "v1",
  "height": 780,
  "elapsed_ms": 22000,
  "outcome": "dnf",
  "placement": 3
}
~~~

Đây là mẫu để đọc, không phải bản ghi người dùng thật.

Luồng:

~~~text
GamePage.handleGameOver
→ postJson('/api/runs', data)
→ JSON.stringify
→ Vite proxy
→ Flask post_runs
→ request.get_json
→ chuẩn hóa + validation
→ SELECT tìm run_id đã tồn tại
→ INSERT + commit nếu mới
→ JSON response 201
→ React báo “Đã lưu kết quả.”
~~~

runRef được lấy ra rồi đặt null để không lưu cùng lượt nhiều lần từ phía UI. Backend vẫn có cơ chế chống bản ghi trùng độc lập.

### 7.5. Backend kiểm tra gì?

- Body phải là object JSON.
- run_id và player_id phải đọc được như UUID.
- Nickname sau trim dài 1–24 ký tự.
- skin_id có trong bộ skin cho phép.
- rules_version thuộc v1/v2.
- height, elapsed_ms, placement đúng kiểu int và trong giới hạn.
- bool không được coi là int ở validation, dù Python có quan hệ kiểu bool/int.
- outcome chỉ finished hoặc dnf.
- finished phải có height đúng finish_height; dnf chưa đạt đích.
- v2 finished thêm ngưỡng tối thiểu 7500 ms.

Ví dụ: theo luật backend hữu hạn v1, finished nhưng height = 1000 bị 422 vì kết quả không khớp đích. Mode endless ở UI hiện tại không dùng đích này như điều kiện kết thúc.

**Validation frontend giúp người dùng; validation backend bảo vệ dữ liệu.** Người dùng có thể gửi request riêng không đi qua form, nên maxLength của input không thay thế việc kiểm tra server.

### 7.6. Vì sao POST cùng run_id không tạo hai lượt?

Đây là cơ chế **idempotency bằng mã lượt**:

- Chưa có run_id: thêm mới, trả 201.
- Đã có và các trường giống nhau sau phần chuẩn hóa áp dụng: trả bản cũ 200.
- Đã có nhưng nội dung khác: trả 409 conflict.
- Nếu hai request cùng tới gần nhau, PRIMARY KEY và nhánh bắt IntegrityError vẫn xử lý trùng.

Không có nghĩa mọi POST tự động idempotent; project tự xây hành vi này. postJson hiện cũng không có vòng retry tự động.

### 7.7. SQLite và schema

SQLite là database quan hệ được lưu trong một file. Chương trình dùng module sqlite3 của Python, không dùng SQLAlchemy trong code hiện tại.

**Bảng** giống danh sách có hàng/cột; **row** là một lượt; **column** là một trường; **primary key** phân biệt hàng; **index** giúp một số truy vấn nhanh hơn.

| Bảng | Dữ liệu | Khóa chính |
|---|---|---|
| runs | Kết quả lượt: mã lượt/người, nickname, skin, luật, độ cao, thời gian, outcome, placement, created_at | run_id |
| race_rooms | Thông tin phòng online đã chốt | room_id; room_code còn UNIQUE |
| race_room_members | Kết quả mỗi người trong một phòng | (room_id, player_id) |

runs có index theo player_id/created_at và theo rules_version. race_room_members khai báo FOREIGN KEY tới race_rooms. **Khai báo khóa ngoại không tự chứng minh đang enforce:** kết nối hiện chưa bật PRAGMA foreign_keys = ON.

Bản ghi runs không có mọi CHECK/NOT NULL có thể mong muốn cho luật game; nhiều ràng buộc giá trị được kiểm tra ở Flask.

get_db tạo một connection theo app context, lưu ở Flask g, dùng sqlite3.Row để đọc cột theo tên. close_db đóng nó. init_db đọc schema.sql và executescript; CREATE TABLE IF NOT EXISTS giữ dữ liệu cũ, nhưng không tự migrate mọi cấu trúc bảng cũ.

### 7.8. SQL thật và tham số

Mẫu đọc lịch sử:

~~~sql
SELECT run_id, player_id, nickname, skin_id, rules_version,
       height, elapsed_ms, outcome, placement, created_at
FROM runs
WHERE player_id = ?
ORDER BY created_at DESC, run_id ASC
LIMIT 20;
~~~

- SELECT chọn cột.
- FROM chọn bảng.
- WHERE lọc đúng người.
- ORDER BY sắp thứ tự.
- DESC mới nhất trước; ASC tăng dần.
- LIMIT giới hạn số hàng.

Dấu ? nhận dữ liệu từ tuple params trong db.execute. Không ghép nickname/player_id trực tiếp vào chuỗi SQL. Đây là cách tham số hóa để tránh input bị hiểu như lệnh SQL.

commit chốt thay đổi; rollback hủy transaction khi gặp lỗi. SQL insert xong mà chưa commit thì chưa có nghĩa thay đổi đã được lưu bền.

### 7.9. Bảng xếp hạng server khác bảng đua trong game

Top 10 của server:

1. Lọc rules_version.
2. finished đứng trước dnf.
3. dnf: height giảm dần.
4. Tiếp theo elapsed_ms tăng dần.
5. Hòa tiếp thì created_at, run_id tăng dần.

Top 10 là **10 lượt**, không nhất thiết 10 người khác nhau. Một người có thể có nhiều hàng. Các trường trả về không có player_id/run_id, nhưng đây không phải cơ chế xác thực riêng tư cho lịch sử.

### 7.10. localStorage không phải SQLite

GamePage.playerId dùng localStorage giữ mã khách qua các lần tải trang trong cùng origin. localStorage ở browser; SQLite ở máy server.

- Xóa dữ liệu browser có thể sinh player_id mới, làm UI không nhận lại lịch sử ID cũ.
- Sang browser/origin khác có thể có ID khác.
- Không có mật khẩu hay phiên đăng nhập.
- services/storage.js có helper tương tự nhưng GamePage hiện dùng hàm playerId riêng, không import helper đó.
- Cần phân biệt key raw string của GamePage với cách helper dùng JSON.parse/JSON.stringify; không nói hai đường này đã thống nhất hoàn toàn.

### 7.11. Offline và lỗi

Nếu GET config thất bại, useBackend đưa config dự phòng và offline = true. Game vẫn chạy. Lượt offline hiển thị “kết quả chưa được lưu”; không tự lưu vào hàng đợi để sync lại.

| Status | Ý nghĩa trong project |
|---|---|
| 200 | GET thành công hoặc nhận lại lượt cũ giống nhau |
| 201 | Tạo mới thành công |
| 400 | JSON sai cú pháp hoặc request lỗi tương ứng |
| 404 | Không tìm thấy |
| 405 | Method không phù hợp |
| 409 | Xung đột bản ghi hoặc trạng thái phòng |
| 413 | Body vượt giới hạn |
| 422 | JSON đọc được nhưng kiểu/giá trị không hợp lệ |
| 500 | Lỗi server bất ngờ |

APIError giữ code/message/details/status_code; handler tạo cấu trúc JSON thống nhất. Handler 500 có thông báo chung. Khi chạy debug, cần phân biệt ứng xử development với cấu hình production; không khẳng định tuyệt đối mọi môi trường đã giấu mọi chi tiết lỗi.

**Bài tự kiểm tra 7:** nói luồng lưu kết quả trong 30 giây; giải thích vì sao “nickname đúng ở form” vẫn phải kiểm tra lại server; phân biệt localStorage và database.

## 8. Backend online: phần đã viết và giới hạn tích hợp

### 8.1. REST và Socket.IO

REST ở đây là một lần request → response cho config, tạo phòng, đọc lịch sử. Socket.IO tổ chức kết nối/sự kiện hai chiều để server phát room:state hay ghost_sync tới các client.

Socket.IO có thể dùng HTTP long polling hoặc WebSocket tùy kết nối; không đồng nhất tên Socket.IO với giao thức WebSocket thuần. vite.config.js có proxy /socket.io với ws: true.

Trong package.json có socket.io-client, nhưng thư viện được cài **không đồng nghĩa đã được gọi**. Màn chính GamePage/engine hiện không khởi tạo client đó.

### 8.2. Các object Python

rooms.py có:

- PlayerSession: người chơi trong phòng, ready, socket ID, tọa độ/độ cao, checkpoint, skill, kết quả.
- RaceRoom: mã phòng 6 ký tự, seed, tối đa 4 người, trạng thái, danh sách thành viên, thứ tự về đích, hộp đã nhặt.
- RoomManager: tra phòng theo UUID/code, tra socket ID ra người chơi, tạo/xóa phòng.
- RLock: khóa cho phép cùng thread vào lại, giúp bảo vệ một số thao tác phòng khi nhiều thread xử lý.

Phòng đang hoạt động nằm trong RAM. Restart backend sẽ mất trạng thái phòng đó; kết quả đã chốt mới được ghi SQLite. Chưa có bộ lưu trạng thái phòng sống để khôi phục sau server restart.

### 8.3. Vòng đời và các sự kiện

~~~text
WAITING
  → ít nhất 2 người, tất cả ready
COUNTDOWN
  → server phát seed và thời điểm bắt đầu, mặc định 3 giây
RACING
  → nhận tick và phát ghost
ADJUDICATING
  → người đầu về đích; chờ tối đa khoảng 15 giây cho người còn lại
FINISHED
  → chốt standings, phát kết quả, lưu DB, dọn phòng sau thời gian chờ
~~~

| Event | Nhiệm vụ |
|---|---|
| room:join / room:leave | Gắn/rời socket khỏi phòng |
| room:ready / room:state | Ready và phát trạng thái phòng |
| race:start | Seed, đích, countdown, thời điểm xuất phát |
| player:tick / race:ghost_sync | Nhận cập nhật và phát vị trí đối thủ |
| skill:box_pickup / skill:acquired | Kiểm tra gần hộp, chống nhặt cùng ID, cấp chiêu |
| skill:use / skill:effect_applied | Kiểm tra chiêu, cooldown và phát hiệu ứng |
| race:claim_finish / race:player_finished | Kiểm tra khai báo và ghi thứ tự về đích |
| race:finished | Phát kết quả chung |
| player:status_changed | Báo offline/online |

**Không dùng trực tiếp y Canvas cho online:** handler online xem y tăng là độ cao/progress; gameplay Canvas có y giảm khi leo. Khi tích hợp client phải chuyển đổi hệ tọa độ.

### 8.4. Chiêu và kiểm tra kết quả

skills.py có boost 2500 ms, stun_bullet 1500 ms, teleport tối đa thêm 350 độ cao và chặn đích ở 2900; cooldown 8 giây. Các event mô tả hiệu ứng, cần client thực thi phần nhìn/chuyển động phù hợp.

finish.py kiểm tra khai báo elapsed_ms ít nhất 7500, đã có checkpoint 1000 và 2000, final_height từ đích tới đích + 500. Chốt hạng người đã về trước; DNF xếp theo max_y. Có timer cho trận tối đa, adjudication, mất mạng có ân hạn mặc định 10 giây, dọn phòng sau mặc định 300 giây.

Đây là **kiểm tra cơ bản**, chưa phải server tự mô phỏng toàn bộ vật lý hay chống gian lận hoàn chỉnh: tick và thời gian khai báo vẫn có phần do client gửi. Không nói có checkpoint là không thể gian lận.

### 8.5. Câu trình bày chính xác

“Trong bản local này, chúng em đã viết và kiểm tra backend phòng đua bằng REST và Socket.IO. Màn chơi chính hiện vẫn là chơi với bot; luồng online chưa được nối hoàn chỉnh vào UI. Phần đó cần một client gửi tick, nhận ghost và áp dụng sự kiện chiêu.”

Nếu thầy yêu cầu demo online, chỉ hứa demo khi đã có bản tích hợp riêng được xác minh. Test socket là bằng chứng cho hành vi backend, không thay thế demo nhiều browser.

## 9. Chạy project, dependency, test, build và triển khai

### 9.1. Chạy trên máy hiện tại

Mở PowerShell ở đúng thư mục:

~~~powershell
Set-Location -LiteralPath 'D:\Web Project\doodle-jump-usth'
npm.cmd run dev
~~~

Browser vào **http://localhost:5173/**. Giữ terminal mở. Ctrl+C dừng frontend/backend qua script.

Nếu máy chưa có dependency:

~~~powershell
npm.cmd run setup
npm.cmd run dev
~~~

setup.mjs yêu cầu Node major 24, tìm Python từ 3.12 trở lên nếu phải tạo .venv; cài backend qua requirements.txt, cài frontend bằng npm ci và init database. Không chạy setup chỉ để mở lại một môi trường đang hoạt động tốt.

dev.mjs spawn hai tiến trình: Flask ở 3000 và Vite ở 5173. Cổng frontend bật strictPort; đã bị chiếm sẽ lỗi. Không tự tắt tiến trình khác khi chưa biết nó thuộc việc gì.

### 9.2. Node, npm và Vite khác nhau

- Node chạy JavaScript bên ngoài browser, ở đây phục vụ script và tooling.
- npm quản lý package và chạy các script trong package.json.
- Vite phục vụ frontend khi dev và đóng gói khi build.
- React chạy UI trong browser.
- Flask chạy API Python.

Backend API của project **không phải Node/Express**. Node vẫn cần cho frontend tooling. Slide dùng Webpack hoặc require là ví dụ môn học; project này dùng Vite và ES modules import/export.

dependencies là package dùng bởi ứng dụng; devDependencies là tooling phát triển/build/test. package-lock.json khóa dependency giải quyết cụ thể; npm ci cài theo lock thay vì tự cập nhật tùy ý.

.venv là môi trường Python riêng; node_modules là dependency Node đã cài. Không phải hai thư mục source code nhóm tự viết.

### 9.3. Cách chạy test/build (số dưới đây là lần kiểm tra working tree cũ)

~~~powershell
npm.cmd test
npm.cmd run build
~~~

scripts/test.mjs chạy pytest backend trước; nếu đạt mới chạy Vitest frontend. Vite test environment là jsdom để giả môi trường DOM.

Kết quả đã chạy ngày 02/10/2026 trên working tree dùng soạn tài liệu:

| Lệnh | Kết quả |
|---|---|
| npm.cmd test – backend (working tree cũ) | 75 passed |
| npm.cmd test – frontend (working tree cũ) | 13 test files, 128 tests passed |
| npm.cmd run build (working tree cũ) | Thành công, tạo frontend/dist |

Các số liệu trên chưa được chạy lại ở commit dev `21265f1`; xem chúng là kết quả lịch sử, không phải xác nhận trạng thái hiện tại.`r`n`r`nVí dụ bài test có ý nghĩa:

- Input giữ A và ← rồi thả một phím; blur xóa trạng thái.
- Physics cập nhật y/vy; va chạm chỉ rơi qua mặt bệ; bệ bouncy/fragile.
- Engine timing intro, pause, kết thúc, bot vào sân.
- Backend dữ liệu sai, ID trùng, lọc lịch sử, thứ tự leaderboard.
- Socket join/ready/checkpoint/chiêu/kết quả, mất kết nối.

Một số test mock renderer hoặc giả thời gian; chúng kiểm tra logic dưới điều kiện đó. **Tất cả test qua chưa chứng minh mọi trải nghiệm browser, hiệu năng và security đều hoàn hảo.**

### 9.4. Build không tự xuất bản cả hệ thống

build tạo HTML/CSS/JS frontend tối ưu trong dist. Không chạy Flask production, không upload database, không cấu hình domain/HTTPS, và không tự giữ Vite proxy trong bản static.

Để triển khai thật cần host frontend assets, chạy backend phù hợp, chuyển /api và /socket.io qua reverse proxy hoặc cấu hình URL/CORS, HTTPS, database và quản lý tiến trình. Mặc định localhost chỉ có ý nghĩa trên chính máy đang mở browser.

Đây là định hướng triển khai, **chưa phải những việc đã hoàn thành trong checkout này**.

### 9.5. Cải thiện có thể đề xuất nếu bị hỏi

- Nối client online vào menu/engine và kiểm tra nhiều browser thật.
- Hợp nhất thông số trùng trong index/physics, đồng bộ docs cũ.
- Cho simulation và engine dùng chung phần cập nhật để hạn chế logic lệch.
- Bổ sung auth khi cần lịch sử riêng tư và dữ liệu đáng tin hơn.
- Kiểm tra server mạnh hơn thay vì tin kết quả client.
- Phân trang dữ liệu lớn, xử lý deploy/socket và backup database.

Chỉ nói là hướng cải thiện, không mô tả như tính năng hiện đã làm.

## 10. Demo trước buổi trình bày: thao tác và bằng chứng

### 10.1. Kịch bản tự kiểm tra khoảng 5 phút

1. Chạy npm.cmd run dev, mở http://localhost:5173/.
2. Trong tab khác mở http://localhost:5173/api/health và /api/config. Phải thấy JSON. Đóng tab phụ sau khi kiểm tra.
3. Tại title, click START hoặc Enter; quan sát camera xuống rồi menu xuất hiện.
4. Nhập nickname, bấm BẮT ĐẦU CHƠI; đợi nhân vật/bệ hiện; bấm A/D để bắt đầu tính giờ.
5. Giữ và thả trái/phải: quan sát gia tốc, trượt, tự nhảy. Sau 8 giây quan sát bot đầu vào sân.
6. Nhấn Escape: kiểm tra thời gian và vật lý dừng; tiếp tục.
7. Để dung nham bắt kịp (hoặc chủ động rơi xuống nó) để kết thúc; quan sát thông báo lưu. Quan sát rocket/khiên nếu nhặt được.
8. Về menu; mở lịch sử và top 10, tìm lượt vừa chơi.
9. Chơi lại, xác nhận wipe và số liệu reset.
10. Đổi kích thước browser, kiểm tra khung 16:9 và menu không mất nút.

Nếu thiếu thời gian trên sân khấu, demo bước 3–8 khoảng 60–90 giây. Phải chạy thử trước; thông báo “Đã lưu” là kết quả cần nhìn thấy, không suy ra chỉ từ việc modal xuất hiện.

### 10.2. DevTools giúp chứng minh đây là ứng dụng Web

F12 mở DevTools của browser:

- **Network:** lọc /api; config là GET, lưu kết quả là POST, lịch sử là GET. Xem method, status, request payload và response.
- **Elements:** chỉ ra canvas và lớp menu/HUD là các phần khác nhau.
- **Application/Storage:** xem key doodle-player-id trong localStorage.
- **Console:** kiểm tra lỗi JavaScript trước demo.
- Không sửa database thật chỉ để tạo màn demo đẹp.

Nếu backend không lên, game có thể fallback offline. Lúc đó phải nói rõ chỉ demo gameplay, chưa chứng minh lưu database. Kiểm tra terminal Flask, cổng 3000 và database đã init. Lưu ý: engine chính chạy endless, nhưng endpoint lưu kết quả hiện vẫn validate theo finish_height/max_duration_ms của luật hữu hạn; đây là chỗ cần giải thích như một giới hạn tích hợp.

### 10.3. File nên ghim sẵn trong editor

1. GamePage.jsx: handleStartGame và handleGameOver.
2. GameCanvas.jsx: useEffect, createGame và cleanup.
3. engine.js: frame, nhánh running, publishStats, endRun.
4. physics.js + collision.js: rơi và đáp bệ.
5. runs.py: post_runs và leaderboard.
6. schema.sql: bảng runs.
7. vite.config.js: proxy.

Khi bị hỏi, mở đúng hàm và giải thích input → việc làm → output/thuộc tính đổi. Đừng cuộn ngẫu nhiên qua toàn engine.

## 11. Bài nói mẫu tập trung môn Web, khoảng 5 phút

**Nguồn thời lượng:** slide 7, trang PDF 27 ghi tối đa 5 phút mỗi nhóm; slide mang năm 2024. Đây là yêu cầu trong tài liệu đã lưu, chưa xác nhận áp dụng cho buổi ngày 03/10/2026. Bài dưới dùng 5 phút để dễ rút gọn; nếu được thêm thời gian, mở rộng demo hoặc thuật toán.

### 0:00–0:40 — Bài toán và công nghệ

“Project của nhóm em là Doodle Jump chạy trên trình duyệt. Người chơi điều khiển ngang, nhân vật tự bật khi đáp bệ và cạnh tranh độ cao với các bot. Ở mode chính, ván chơi là endless: không có vạch đích hay giới hạn 180 giây. Dung nham dâng đuổi theo người chơi; vật phẩm tên lửa và khiên tạo cơ hội cứu nguy.

Về Web, chúng em dùng React cho giao diện, Canvas và JavaScript cho gameplay, Python Flask cho API và SQLite để lưu kết quả. Node.js và Vite dùng cho công cụ phát triển frontend.”

### 0:40–1:25 — Kiến trúc và luồng khởi động

“Browser nạp index.html và main.jsx, React tạo App rồi GamePage. GamePage gọi API cấu hình. Khi có config, GameCanvas tạo engine trên canvas và bắt đầu vòng lặp.

GamePage quản lý menu, thông số và trạng thái lưu. Engine giữ tọa độ, vận tốc, bệ và bot. React gửi lệnh qua gameRef; engine báo thống kê, phase và kết quả bằng callback. Chúng em giới hạn cập nhật HUD khoảng mỗi 100 mili-giây thay vì đưa mọi frame vào state React.”

### 1:25–2:10 — Tương tác và gameplay

“Keyboard event được đổi thành hai trạng thái trái/phải. Mỗi frame tính thời gian trôi qua, cập nhật vận tốc ngang, trọng lực, va chạm và camera rồi vẽ lại Canvas.

Va chạm chỉ nhận đáp bệ khi nhân vật đang rơi và chân đi qua mặt trên của bệ từ frame trước tới frame hiện tại. Khi đáp, code đặt nhân vật trên bệ và cho vận tốc dọc âm để bật lên.

Bot dùng quy tắc chọn bệ và điều khiển ngang, còn chịu cùng hàm trọng lực và đáp bệ với người chơi. Đó là AI theo luật, không phải mô hình học máy.”

### 2:10–3:20 — API và dữ liệu

“Frontend gọi /api qua Vite proxy tới Flask. GET /api/config trả luật; POST /api/runs nhận kết quả; GET lịch sử và leaderboard đọc dữ liệu đã lưu.

Mỗi lượt có run_id riêng và player_id khách giữ ở localStorage. Khi kết thúc, frontend gửi JSON gồm nickname, skin, luật, độ cao, thời gian, kết quả và thứ hạng. Flask kiểm tra kiểu, giới hạn và tính nhất quán rồi dùng SQL tham số hóa để insert vào SQLite.

Nếu cùng run_id được gửi lại với cùng nội dung, server trả bản cũ, tránh bản ghi trùng. Nếu cùng ID nhưng nội dung khác thì báo conflict. UUID hiện là định danh khách, chưa phải xác thực tài khoản.”

### 3:20–4:20 — Demo một use case hoàn chỉnh

“Em demo từ nhập tên đến chơi một lượt ngắn, pause rồi cố tình rơi. Sau đó thấy trạng thái lưu và mở lịch sử để kiểm tra bản ghi. Trong Network, đây là request POST và response Flask.”

Thao tác đã tập ở mục 10. Nếu không kịp kết thúc, giảm phần giải thích thay vì kéo dài demo.

### 4:20–5:00 — Kiểm tra và giới hạn

“Bộ test của project bao phủ vật lý, input, luồng engine, lưu điểm và các event backend online. Các con số 75/128 cùng kết quả build ghi trong bản tài liệu trước được đo trên code trước khi cập nhật dev; chưa được chạy lại trên commit hiện tại.

Backend phòng online bằng Socket.IO đã viết, nhưng màn chơi chính hiện chưa nối client online; bản demo này chơi với bot. Hướng tiếp theo là hoàn thiện tích hợp, hợp nhất thông số và bổ sung xác thực/kiểm tra kết quả server mạnh hơn.”

### Bản 30 giây nếu thầy yêu cầu giới thiệu nhanh

“Game dùng React cho UI, Canvas/JavaScript cho vật lý và bot, Flask cho API và SQLite lưu lượt. Khi mở trang, React lấy config rồi tạo engine. Engine đọc input, cập nhật tọa độ và vẽ mỗi frame; khi kết thúc, callback gửi kết quả về GamePage để POST lên Flask. Server validation và SQL tham số hóa lưu kết quả, sau đó frontend GET lịch sử và bảng xếp hạng.”

## 12. Ngân hàng 90 câu thầy có thể hỏi, có đáp án

**Đây là dự đoán để luyện vấn đáp, không phải đề đã biết.** Câu hỏi suy ra từ slide thật và code hiện tại. ★ là 20 câu ưu tiên vì trực tiếp nối môn Web với demo; mức ưu tiên là nhận định của người soạn, không phải xác suất đã đo.

**Cách luyện trong 3 giờ:** chọn 5 câu ★ cuối buổi, mỗi câu tự trả lời 30–45 giây, nhìn đáp án sửa lỗi. 70 câu còn lại để tra cứu; không cố học thuộc tất cả trong 180 phút.

**Khuôn trả lời:** định nghĩa 1 câu → ví dụ trong project → file/hàm hoặc giới hạn. Nếu chưa làm, nói rõ chưa làm.

### 12.A. 20 câu ưu tiên

#### Q01 ★ — Mô tả luồng project từ mở trang tới lưu kết quả?

index.html → main → App → GamePage → GET config → GameCanvas tạo createGame → loop cập nhật/vẽ → endRun gọi callback → GamePage POST runs → Flask validation/SQL → SQLite. Có thể mở history để GET lại bản ghi. **Chỉ code:** GamePage, GameCanvas, engine, runs.py.

#### Q02 ★ — HTML, CSS, JavaScript và React khác nhau thế nào?

HTML tạo cấu trúc, CSS tạo trình bày, JavaScript tạo hành vi; React là thư viện JavaScript tổ chức UI bằng component/state. Project có canvas/menu trong cấu trúc, styles.css cho giao diện, engine cho game, React cho menu/HUD. React không thay thế HTTP hay database. **Nguồn:** JavaScript trang 4; CSS trang 3; FE NodeJS trang 19.

#### Q03 ★ — Frontend và backend làm gì?

Frontend chạy trong browser, đọc input, tính game và vẽ UI. Flask chạy phía server, trả config, kiểm tra dữ liệu và lưu/truy vấn database. Demo local vẫn có client-server dù cùng một máy. **Nguồn:** FE NodeJS trang 6; **code:** GamePage và app.py.

#### Q04 ★ — Vì sao có Node.js khi backend là Python?

Node chạy tooling JavaScript: setup/dev scripts, Vite và build/test frontend. API nghiệp vụ là Flask Python, không phải Node/Express. Node có thể làm backend ở project khác nhưng không phải lựa chọn API của bản này. **Nguồn:** NodeJS trang 4, 15; FE NodeJS trang 8–10.

#### Q05 ★ — Vì sao phối hợp React với Canvas?

React tổ chức menu, form, HUD và modal; Canvas vẽ các đối tượng chuyển động trong một vùng. Engine cập nhật Canvas trực tiếp; React nhận thống kê khoảng 10 lần/giây. Không khẳng định Canvas luôn nhanh hơn mọi cách dùng DOM. **Code:** GameCanvas, publishStats, render.

#### Q06 ★ — Props, state, ref, effect là gì? Dọn engine để làm gì?

Props là dữ liệu cha truyền xuống; state thay đổi làm React cập nhật UI; ref giữ canvas/engine/metadata mà không tự render; effect tạo tài nguyên và trả cleanup. Cleanup hủy RAF/listener để engine cũ không chạy trùng. **Code:** GamePage, GameCanvas.useEffect.

#### Q07 ★ — GET và POST khác nhau? Dùng ở đâu?

GET đọc config/history/leaderboard; POST gửi kết quả hoặc tạo/join phòng. POST runs chứa JSON body với Content-Type application/json. Không nói POST tự mã hóa: bảo mật truyền tải cần HTTPS. **Nguồn:** Flask trang 13; **code:** api.js, routes/runs.py.

#### Q08 ★ — JavaScript trao đổi dữ liệu với Python thế nào?

fetch gửi HTTP; JSON.stringify biến object thành body; Flask request.get_json đọc thành dict; jsonify trả JSON; response.json đọc về JavaScript. Hai ngôn ngữ không gọi trực tiếp hàm nhau trong luồng này. **Code:** api.js, post_runs.

#### Q09 ★ — Form đã validation vì sao backend vẫn validation?

Client có thể bị bỏ qua hoặc sửa bằng request riêng. Frontend kiểm tra nickname để báo sớm; backend kiểm tra UUID, skin, luật, số nguyên, giới hạn và outcome trước insert. Validation không đồng nghĩa đã xác thực người chơi. **Nguồn:** JavaScript trang 69; **code:** StartMenu, post_runs.

#### Q10 ★ — Vì sao SQLite? Khác MySQL trong slide?

SQLite nhẹ, một file, phù hợp phạm vi demo và dữ liệu lượt có cấu trúc. MySQL có server database riêng. Slide cũng giới thiệu SQLite; code dùng sqlite3 với SQL trực tiếp, chưa dùng ORM SQLAlchemy. **Nguồn:** Database trang 6, 9; **code:** db.py.

#### Q11 ★ — Tránh SQL injection thế nào?

Dùng ? trong SQL và truyền dữ liệu qua params để input không biến thành cú pháp lệnh. Ví dụ WHERE player_id = ? cùng tuple player_id. Không nối nickname/ID trực tiếp vào SQL. **Code:** get_runs/post_runs.

#### Q12 ★ — Gửi lại kết quả có bị lưu hai lần?

Backend dùng run_id làm primary key: mới trả 201, cùng ID/cùng nội dung trả 200, cùng ID khác nội dung trả 409. Frontend lấy runRef rồi xóa để không xử lý cùng lượt lặp lại. Chưa có hàng đợi/retry tự động toàn diện ở client. **Code:** handleGameOver, post_runs.

#### Q13 ★ — player_id là tài khoản? localStorage lưu gì?

Chưa có tài khoản; player_id là UUID định danh khách giữ trên browser. SQLite lưu lượt trên server. Xóa storage hay đổi origin/browser có thể đổi ID; biết UUID không chứng minh quyền sở hữu. **Code:** GamePage.playerId, get_runs.

#### Q14 ★ — Responsive thế nào? Click vẫn đúng sau scale bằng gì?

CSS giữ 16:9 theo viewport, Canvas logic vẫn 960×540. Engine đổi vị trí pointer từ rect hiển thị về tọa độ logic bằng tỷ lệ width/height. Media query xử lý cảm ứng và màn hẹp. **Nguồn:** Introduction trang 58; **code:** styles.css, handlePointerDown.

#### Q15 ★ — Bắt event và tránh reload form thế nào?

Input đăng ký keydown/keyup/blur; React đặt onClick/onPointer...; StartMenu xử lý onSubmit và preventDefault để không submit/reload mặc định. Hàm được truyền để chạy khi event xảy ra. **Nguồn:** JavaScript trang 54–58, 69; **code:** input, StartMenu.

#### Q16 ★ — 5173 và 3000 khác origin; tại sao gọi API được? CORS là gì?

Origin gồm scheme, hostname, port. CORS dùng HTTP header để server cho phép browser đọc response từ origin khác. Trong dev, fetch dùng /api trên origin frontend, Vite proxy chuyển sang backend, nên browser không gọi cross-origin trực tiếp ở đường này. Deploy khác origin cần cấu hình phù hợp; cors_allowed_origins của socket.py là cấu hình Socket.IO, không tự mở mọi REST route. **Code:** vite.config.js, socket.py; kiến thức mở rộng theo project.

#### Q17 ★ — Trang tĩnh hay web app động? Có dùng Jinja2?

React thay đổi UI và gọi API mà không reload toàn trang cho mỗi hành vi. Đây là ứng dụng tương tác dùng API. Flask có thể render Jinja2 như slide/lab nhưng routes hiện chủ yếu trả JSON, React dựng UI. **Nguồn:** Flask trang 5; Exercise 3 trang 2–3.

#### Q18 ★ — Backend lỗi thì sao? HTTP 500 tự làm fetch throw không?

fetch thường vẫn trả response cho HTTP lỗi; api.js phải kiểm tra response.ok. Config lỗi có fallback offline; kết quả offline không lưu. Lỗi POST hiện qua save.status/message; APIError chuẩn hóa JSON lỗi. Network error khác HTTP error. **Code:** useBackend, api.js, errors.py.

#### Q19 ★ — Build có nghĩa đã deploy chưa?

Chưa. Nó đóng gói frontend vào dist; còn cần host assets, backend, API/socket routing, HTTPS, database và vận hành. Vite dev proxy không tự đi theo static build. **Nguồn:** FE NodeJS trang 15, 22; **code:** package.json, vite.config.js.

#### Q20 ★ — Online đã chạy chưa? Chứng minh bằng gì?

Có backend REST/Socket.IO và test event. GamePage/engine chính chưa khởi tạo client online nên demo này chơi với bot. Cần demo nhiều client thật trên bản tích hợp để kết luận UI online hoàn chỉnh. **Code:** rooms.py, events/, GamePage; socket.io-client có trong dependency nhưng chưa nối.

### 12.B. Internet, URL và HTTP — Q21–Q30

| Câu thầy có thể hỏi | Đáp án mẫu |
|---|---|
| **Q21. HTTP khác HTML thế nào?** | HTTP là giao thức request/response giữa client-server; HTML là ngôn ngữ đánh dấu. JSON cũng đi trong HTTP, không bắt buộc response là HTML. |
| **Q22. Internet khác WWW thế nào?** | Internet là hệ thống mạng kết nối; Web là một dịch vụ dùng tài nguyên/URL và giao thức Web trên đó. Email hay truyền file không đồng nhất với Web. |
| **Q23. Phân tích URL http://localhost:5173/api/runs?player_id=abc?** | http là scheme; localhost là host; 5173 là port; /api/runs là path; player_id=abc là query. abc chỉ là ví dụ, route thật yêu cầu UUID. |
| **Q24. Máy thầy mở localhost có vào laptop em được không?** | localhost/127.0.0.1 trỏ về máy đang mở link. Máy thầy sẽ tìm server trên máy thầy; muốn vào laptop em cần địa chỉ/truy cập mạng và server bind phù hợp. |
| **Q25. Port để làm gì?** | Phân biệt dịch vụ ở cùng host. Dev dùng 5173 frontend, 3000 backend; cùng IP khác port vẫn khác origin. |
| **Q26. DNS làm gì? Demo có domain thật chưa?** | DNS phân giải tên miền thành thông tin địa chỉ để kết nối. Bản demo đang dùng localhost, chưa chứng minh có domain công khai. |
| **Q27. TCP/IP và HTTP liên quan thế nào?** | IP phục vụ định tuyến, TCP cung cấp luồng tin cậy trong các cấu hình Web thông dụng; HTTP ở lớp ứng dụng. Không nói mọi HTTP đều bắt buộc dùng TCP: HTTP/3 dùng QUIC. |
| **Q28. POST an toàn vì dữ liệu không trên URL?** | Body không hiện trên URL không đồng nghĩa được mã hóa. HTTPS bảo vệ truyền tải; vẫn cần auth, validation và kiểm soát dữ liệu. |
| **Q29. HTTP stateless nghĩa là gì?** | Request có thể được xử lý độc lập; trạng thái app quản lý thêm bằng cookie/session/ID/database. Project có player_id khách/database, chưa có login session. |
| **Q30. JSON response có phải object JS?** | Trên đường truyền là dữ liệu văn bản/bytes; response.json parse thành giá trị JS. Flask jsonify serialize dữ liệu Python. |

Nguồn chính: Introduction trang PDF 20–28, 37–48; Flask trang 13. Q28–Q30 có phần giải thích mở rộng.

### 12.C. HTML, form và accessibility — Q31–Q40

| Câu thầy có thể hỏi | Đáp án mẫu |
|---|---|
| **Q31. DOCTYPE, charset, lang và viewport làm gì?** | DOCTYPE HTML5 giúp browser dùng standards mode; UTF-8 hỗ trợ chữ Việt; lang=vi mô tả ngôn ngữ; viewport hỗ trợ bố cục theo thiết bị. Không tự tạo responsive nếu CSS chưa xử lý. |
| **Q32. head/body/title khác nhau?** | head chứa metadata/tài nguyên liên quan; body chứa nội dung; title đặt tên tab/bookmark. main.jsx nạp từ body rồi gắn vào root. |
| **Q33. Tag, element và attribute?** | Tag là dấu mở/đóng; element là phần tử gồm tag/nội dung khi có; attribute bổ sung id, src, aria-label. canvas width=960 là attribute, khác CSS width. |
| **Q34. id và class khác gì?** | id định danh một phần tử duy nhất trong document; class tái dùng cho nhiều phần tử, một phần tử có thể nhiều class. CSS dùng #id/.class; JSX dùng className. |
| **Q35. Block và inline?** | Theo display mặc định, block xuống dòng và chiếm không gian ngang khả dụng; inline nằm trong dòng. CSS có thể đổi display, nên div không bắt buộc luôn block sau override. |
| **Q36. Vì sao preventDefault và type=button?** | preventDefault chặn submit điều hướng/reload mặc định để React xử lý. type=button tránh vô tình submit form khi bấm leaderboard/history. |
| **Q37. Absolute/relative URL? /images/... là gì?** | Absolute có scheme/host; đường tương đối tính từ vị trí/base; /images bắt đầu từ gốc origin. public/images được Vite phục vụ ở /images, không có chữ public trong URL. |
| **Q38. th/tr/td, rowspan/colspan?** | th là ô tiêu đề, tr là hàng, td là ô dữ liệu; rowspan gộp hàng, colspan gộp cột. Bảng DOM khác bảng SQLite. |
| **Q39. alt và aria-label?** | alt mô tả ảnh khi cần; aria-label đặt tên truy cập cho điều khiển. Ảnh trang trí có thể alt rỗng/aria-hidden. Nhãn Canvas chưa tự làm toàn gameplay dễ dùng bằng screen reader. |
| **Q40. dangerouslySetInnerHTML có nguy hiểm?** | Chèn markup trực tiếp; dữ liệu người dùng chưa xử lý có rủi ro XSS. Menu dùng SVG asset local import raw, không chèn nickname qua đó; chỉ dùng nguồn tin cậy. |

Nguồn: HTML trang 6–10, 20–30; JavaScript trang 59–69; Exercise1/Exercise2. Q39–Q40 bổ sung theo code.

### 12.D. CSS và giao diện — Q41–Q50

| Câu thầy có thể hỏi | Đáp án mẫu |
|---|---|
| **Q41. Ba cách đưa CSS vào trang?** | Inline, internal qua style, external qua file. main.jsx import styles.css để Vite xử lý; vài animation menu còn cập nhật style bằng JS. |
| **Q42. CSS rule nào thắng?** | Cascade xét origin/importance, layer nếu có, specificity rồi thứ tự. Cùng mức ưu tiên, selector cụ thể hơn thắng; ngang nhau rule sau thắng. Internal không luôn hơn external chỉ vì nằm trong HTML. |
| **Q43. Type/class/id selector và pseudo-class?** | button theo loại, .menu-card theo class, #player-nickname theo id; :hover theo trạng thái. Class phù hợp thành phần dùng lại. |
| **Q44. Box model gồm gì?** | Content, padding, border, margin. content-box: width chưa gồm padding/border; border-box tính chúng vào width. Margin vẫn bên ngoài. |
| **Q45. Margin khác padding? Bốn giá trị theo thứ tự nào?** | Margin ở ngoài border, padding ở trong; bốn giá trị top, right, bottom, left. Đệm trong nút khác khoảng cách giữa nút. |
| **Q46. position/z-index để menu lên game?** | absolute đặt UI theo containing block; fixed neo theo viewport trong cấu hình phù hợp; z-index phối hợp trong stacking context. Số lớn không bảo đảm vượt mọi context khác. |
| **Q47. Flexbox dùng làm gì?** | Sắp/căn phần tử theo trục chính/phụ bằng gap, justify-content, align-items. Dùng cho nhóm nút/HUD, không thay logic vẽ bệ Canvas. |
| **Q48. Media query và reduced-motion?** | Áp dụng CSS theo màn hình/thiết bị/sở thích. Project hiện nút chạm trên pointer coarse, đổi modal ở màn hẹp, giảm hiệu ứng theo yêu cầu người dùng. |
| **Q49. transition khác animation?** | Transition nội suy khi thuộc tính đổi; animation có keyframes. Project còn SVG animate và JS RAF, không phải mọi hiệu ứng là CSS animation. |
| **Q50. px, em, vw, dvh?** | px là CSS pixel, em theo cỡ font phù hợp ngữ cảnh, vw theo rộng viewport, dvh theo cao viewport động. Canvas còn không gian logic riêng; CSS scale không sửa physics. |

Nguồn: CSS trang 3–19, 24–43; Exercise1. Flexbox, stacking context, reduced-motion mở rộng theo project.

### 12.E. JavaScript, DOM và bất đồng bộ — Q51–Q62

| Câu thầy có thể hỏi | Đáp án mẫu |
|---|---|
| **Q51. "4" + 3 + 1 và 4 + 3 + "1" ra gì?** | "431" và "71": phép + xử lý từ trái sang phải và có thể nối chuỗi. Chuyển input sang number khi cần tính toán. |
| **Q52. const player có sửa player.x được không?** | Có. const cấm gán lại tên player, không khóa thuộc tính. Engine sửa x/y/vx/vy trên object đang giữ. |
| **Q53. var khác let/const?** | var có function scope và hoisting khác; let/const có block scope, không dùng trước khởi tạo. let cho tên gán lại, const cho tên không gán lại. |
| **Q54. Vì sao applyPhysics sửa player không cần return object mới?** | Tham số giữ bản sao tham chiếu tới cùng object, nên sửa thuộc tính ảnh hưởng object chung. Gán lại tham số thành object khác không thay biến bên gọi. |
| **Q55. null, undefined, NaN?** | null chủ động để trống, undefined thường chưa có, NaN là số không hợp lệ. null không phải NaN; chuỗi rỗng không phải undefined. Number.isFinite kiểm tra prevY. |
| **Q56. map/filter/sort?** | map biến đổi thành array mới, filter chọn thành array mới, sort sửa array được gọi. getRanking tạo participants mới rồi sort, không sắp trực tiếp array bots đầu vào. |
| **Q57. DOM là gì? React khác getElementById?** | DOM là cây phần tử browser. JS thuần sửa DOM trực tiếp; React tổ chức cập nhật từ component/state. Project dùng ref cho canvas/SVG nhưng UI chính theo React. |
| **Q58. Đăng ký event bằng cách nào?** | Inline attribute, handler property, addEventListener. Project dùng addEventListener cho input, JSX onClick cho UI. Cleanup cần đúng event/cùng hàm đã đăng ký. |
| **Q59. Vì sao cả keyup và blur?** | keyup tắt hướng khi không còn phím cùng hướng. blur xóa trạng thái nếu mất focus làm keyup không đến, tránh tự chạy. |
| **Q60. Event-driven/callback?** | Event-driven phản ứng với sự kiện; callback là hàm truyền để gọi khi phù hợp, như onGameOver. Không phải mọi callback async hay chạy trên thread khác. |
| **Q61. Blocking/non-blocking?** | Blocking giữ luồng chờ xong; non-blocking cho xử lý kết quả sau. Physics ngắn chạy đồng bộ, mạng dùng fetch/Promise. Async không tự làm tính CPU nặng biến mất. |
| **Q62. await đóng băng cả trang không?** | Không; nó tạm dừng phần tiếp theo của hàm async, browser có thể xử lý việc khác. Config dùng then/catch, lưu runs dùng await. |

Nguồn: JavaScript trang 18–29, 38–58; NodeJS trang 21–29; Exercise2. Promise/async/await bổ sung từ code.

### 12.F. Node, Flask, SQL và kiểm tra — Q63–Q74

| Câu thầy có thể hỏi | Đáp án mẫu |
|---|---|
| **Q63. require/module.exports khác import/export?** | Slide minh họa CommonJS; repo có type=module dùng ES modules. Cả hai tổ chức module nhưng không thay tùy ý từng dòng. |
| **Q64. package.json, lock, node_modules?** | package.json mô tả script/dependency; lock giữ cây package cụ thể; node_modules là thư viện đã cài. npm ci dùng lock; không commit node_modules. |
| **Q65. Flask route/decorator/Blueprint?** | Route ánh xạ URL + method tới hàm; decorator đăng ký handler; Blueprint gom route. runs_api.post("/api/runs") gắn post_runs. |
| **Q66. Jinja2 khác React?** | Jinja2 dựng HTML phía server; React bản này cập nhật UI phía browser sau khi nạp JS. API hiện trả JSON, dù Flask có thể dùng Jinja2. |
| **Q67. Path/query/body?** | /api/runs/UUID là path parameter; ?player_id=UUID là query; POST JSON là body. Flask dùng tham số hàm, request.args, request.get_json. |
| **Q68. ORM là gì? Repo dùng SQLAlchemy?** | ORM ánh xạ object/bảng và hỗ trợ thao tác DB; slide dùng SQLAlchemy. Repo dùng sqlite3/db.execute trực tiếp. Dataclass PlayerSession là object RAM, không tự thành ORM model. |
| **Q69. CRUD? Có đủ bốn không?** | Create, Read, Update, Delete. Runs API hiện tạo/đọc; chưa có route sửa/xóa lượt. Không phải mọi app đều phải công khai mọi CRUD. |
| **Q70. PK/FK/index?** | PK định danh hàng; FK biểu diễn/ràng buộc quan hệ khi enforce; index hỗ trợ truy vấn với chi phí lưu/ghi. run_id là PK; members có PK ghép và FK khai báo; chưa bật foreign_keys pragma. |
| **Q71. LIMIT 20/10, lọc rules_version để làm gì?** | Giới hạn dữ liệu trả và tách thành tích khác luật. Chưa là phân trang đầy đủ; dữ liệu lớn cần cursor/offset phù hợp. |
| **Q72. RAM/localStorage/DB/transaction?** | RAM giữ game/phòng sống, mất khi đóng tiến trình; localStorage ở browser; SQLite lưu server. Transaction nhóm thay đổi, commit chốt, rollback hủy khi lỗi. |
| **Q73. Những status cần nhớ?** | 200 đọc/nhận lại, 201 tạo, 404 không có, 409 conflict, 422 dữ liệu sai, 413 quá lớn, 500 lỗi server. Không báo lưu thành công giả. |
| **Q74. Unit/integration/browser test và mock?** | Unit phần nhỏ; integration nhiều phần phối hợp; browser kiểm tra UI thật. Mock thay phần thật bằng giả có kiểm soát. SocketIO test client chưa tương đương nhiều browser qua mạng. |

Nguồn: NodeJS trang 15, 18–20; FE NodeJS trang 15, 17–22; Flask trang 10–13; Database trang 3–14; Exercise 3 trang 1–6.

### 12.G. Game, code thực tế và đào sâu — Q75–Q90

| Câu thầy có thể hỏi | Đáp án mẫu |
|---|---|
| **Q75. Vì sao dt thay vì cộng cố định mỗi frame?** | FPS khác nhau; vận tốc × thời gian giúp tốc độ tương đối nhất quán. dt vật lý giới hạn 1/30, timer dùng rawDt; chưa có accumulator fixed timestep. |
| **Q76. Collision cần prevY/vy để làm gì?** | Chứng minh đang rơi qua mặt trên bệ, tránh bật từ dưới/bỏ lỡ bệ mỏng giữa hai frame. AABB chỉ biết chồng hình. |
| **Q77. Leo mà y giảm? Camera làm gì?** | Canvas y tăng xuống; height = 388 − y. Renderer lấy y − cameraY để vẽ; camera không sửa độ cao thế giới. |
| **Q78. Bot có học máy không?** | Heuristic chọn bệ theo tầm, an toàn, khoảng cách, strategy và mục tiêu bot khác; điều khiển ngang. Không có training/neural model. |
| **Q79. Cùng seed đã công bằng multiplayer?** | Chỉ đảm bảo PRNG khi cùng thuật toán/thứ tự gọi. Còn đồng bộ sinh bệ, thời gian, state và tọa độ; bot/animation có random riêng; client online chính chưa tích hợp. |
| **Q80. Endless hay có đích?** | Màn chơi chính đặt `isEndless: true` và tắt goal/timeout; dung nham là điều kiện sống còn. API lưu điểm hiện vẫn validate theo luật hữu hạn v1/v2, nên cần đồng bộ backend nếu muốn lưu mọi kết quả endless đúng nghĩa. |
| **Q81. Bằng chứng test mới nhất?** | Tài liệu cũ ghi 75 backend/128 frontend và build trên code trước khi dev đổi sang endless. Chưa chạy lại trên commit hiện tại; không khẳng định đó là kết quả mới nhất. |
| **Q82. Có bộ chọn skin? Ảnh lỗi thì sao?** | Config/renderer có năm skin/setter; StartMenu hiện dùng initialSkin, chưa có bộ chọn. Cache ready/failed và render fallback khi ảnh chưa dùng được. |
| **Q83. Đua top khác leaderboard?** | Trong lượt xếp theo progress cao nhất/id khi hòa; server ưu tiên finished, thời gian/độ cao DNF. Một bảng trong RAM, một bảng đọc các lượt SQLite. |
| **Q84. index MAX_VY=950, sao nói 900?** | Engine gọi physics.applyPhysics; hàm đó dùng MAX_VY tại physics = 900. Hằng trùng chưa hợp nhất; theo import/call thực tế. |
| **Q85. create_app đã tạo bảng?** | Chưa gọi init_db trực tiếp; setup chạy flask init-db. get_db tạo file/kết nối chưa đồng nghĩa table đã có. |
| **Q86. Những use case Web đã có?** | Vào game, nhập tên, chơi/pause/restart/về menu, kết thúc/lưu, lịch sử/top. Phòng/events online chưa thành use case UI hoàn chỉnh ở màn chính. |
| **Q87. Nickname có XSS không?** | React render nickname như text nên không diễn giải HTML ở đường này. Không đưa nickname vào dangerouslySetInnerHTML. Chưa thể kết luận toàn app miễn nhiễm XSS. |
| **Q88. Tối ưu gì? Có số đo hiệu năng chưa?** | Cache ảnh/title, cull bệ, throttle HUD. Collision vẫn duyệt bệ, moving có vòng lặp lồng; chưa có benchmark chứng minh chịu hàng nghìn đối tượng tốt. |
| **Q89. Em làm phần nào? Giải thích hàm của mình?** | Chuẩn bị bằng chứng thật: file, input/output, thay đổi, test, commit của mình. Tài liệu không biết chắc đóng góp thực tế; không nhận phần người khác. |
| **Q90. Ưu tiên cải thiện gì?** | Chọn một việc có tác động: tích hợp online nếu yêu cầu, hợp nhất thông số/docs hoặc auth/server validation. Nêu cách làm và kiểm tra, không hứa “hoàn thiện toàn bộ” thiếu phạm vi. |

### 12.H. Thầy có thể yêu cầu sửa trực tiếp: 5 bài luyện

Để chỉ đúng vị trí và giải thích trước; không bắt buộc sửa source tối nay.

1. **Nickname tối đa 16:** tìm maxLength và kiểm tra StartMenu; validation backend runs/rooms/socket; cập nhật test/docs. Sửa mỗi input chưa đủ.
2. **Đổi đích v1:** RULES.finish_height, fallback useBackend, hằng/test liên quan. Kiểm tra goal/payload cùng luật, phân biệt v1/v2.
3. **Đổi A/D:** ánh xạ input, phím start engine, hướng dẫn/aria-label và test. Điều khiển và xuất phát phải thống nhất.
4. **Top 10 thành top 5:** LIMIT leaderboard và nhãn modal; không sửa getRanking vì đó là bảng khác.
5. **Nhả phím dừng nhanh hơn:** MASATTRUOT/nhánh direction=0 trong player; không sửa gravity.

### 12.I. Những câu trả lời nên tránh

| Dễ nói sai | Nên nói |
|---|---|
| “React là ngôn ngữ, Node là backend game.” | React là thư viện JavaScript; Node là tooling, API là Flask. |
| “POST an toàn nên không cần HTTPS.” | POST có body; HTTPS bảo vệ truyền tải. |
| “Internal CSS luôn thắng external.” | Xét cascade/specificity/thứ tự theo điều kiện. |
| “Gán player mới trong hàm thay cả biến bên gọi.” | Tham chiếu truyền theo giá trị; sửa thuộc tính ảnh hưởng object chung, gán lại tham số không thay biến bên gọi. |
| “Callback luôn async.” | Có thể được gọi sync/async tùy nơi gọi. |
| “Bot machine learning, online đã có vì cài socket.io-client.” | Bot theo luật; backend online có, UI chưa nối. |
| “SQLite là tính năng Flask, bảng tự có khi mở app.” | sqlite3 riêng; setup gọi init-db. |
| “Test/build xanh nghĩa đã deploy, không còn lỗi.” | Đã kiểm tra trong phạm vi test/đóng gói; còn demo browser và cấu hình deploy. |

## 13. Đối chiếu môn Web và nguồn đã dùng

Số trang dưới đây là **trang PDF tính từ 1**, không phải mọi số footer. Một số slide mang năm 2024 và chứa ví dụ/số liệu cũ; dùng chúng để nhận diện kiến thức môn học, không suy ra thời hạn, quy mô nhóm hay luật đánh giá năm 2026.

Thư mục được đọc: **D:\Study\Vinh\Study\semester 3\Web Application Development**. Có 8 bộ bài giảng PDF và 3 PDF bài tập. Không thấy bộ số 5 trong các PDF ở thư mục này; không tự thêm một chương số 5 giả định.

### 13.1. Slide thật → kiến thức → chỗ áp dụng trong game

| Tài liệu nguồn local | Trang ưu tiên | Liên hệ với project/câu hỏi |
|---|---|---|
| [1-Introduction.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/1-Introduction.pdf>) | 20–28, 37–48, 58 | Client-server, protocol, IP/DNS/proxy, HTTP/HTML/URL, mobile Web; Q03, Q14, Q16, Q21–Q29 |
| [2-HTML.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/2-HTML.pdf>) | 6–10, 15–30 | Cấu trúc HTML, tag/attribute, list, block/inline, URL, ảnh/bảng; index.html và menu; Q31–Q38 |
| [3-CSS.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/3-CSS.pdf>) | 3–19, 24–43 | Style, selector, cascade, font, pseudo-class, box model, dimension; styles.css; Q41–Q50 |
| [4-JavaScript.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/4-JavaScript.pdf>) | 3–5, 18–29, 38–58, 59–69 | Loại dữ liệu, object, function, DOM/event/form/validation; input, StartMenu, engine; Q02, Q09, Q15, Q51–Q60 |
| [6-NodeJS.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/6-NodeJS.pdf>) | 4–7, 15–29, 30–33 | Runtime, package, module, event loop, sync/async/callback và HTTP server ví dụ; scripts/; Q04, Q60–Q64 |
| [7-Front-end dev with NodeJS.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/7-Front-end dev with NodeJS.pdf>) | 6, 8–10, 15–22, 26–27 | FE/BE, npm/build, src/dist, React, deploy và yêu cầu trình bày cũ; Q03–Q06, Q19; mục 11 |
| [8-Python Flask.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/8-Python Flask.pdf>) | 3, 5–6, 8–13 | Flask, Jinja2, khởi tạo, route và GET/POST; app.py/routes; Q07, Q17, Q65–Q67 |
| [9-Database.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/9-Database.pdf>) | 3–6, 8–14 | RDBMS/NoSQL, MySQL/SQLite, ORM, SQLAlchemy và form lưu DB; khác cách dùng sqlite3 hiện tại; Q10–Q11, Q68–Q72 |
| [Exercise1.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/Exercise1.pdf>) | 1–4 | HTML list/ảnh/bảng, class/id, inline/internal/external, hover; Q34–Q45 |
| [Exercise2.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/Exercise2.pdf>) | 1–2 | Input/form validation, tính toán, DOM, blur, thời gian giữa click; Q15, Q51, Q57–Q62 |
| [Exercise 3.pdf](<D:/Study/Vinh/Study/semester 3/Web Application Development/Exercise%203.pdf>) | 1–6 | Flask routes, path/query, Jinja2, CRUD database và API; Q17, Q65–Q72 |

Các câu về hooks, Canvas, Socket.IO, CORS, SQL injection, test và accessibility còn dựa trên code/kiến thức liên quan. Không gán chúng thành nội dung nguyên văn của slide khi slide không dạy chi tiết đó.

### 13.2. Khác biệt cần nhớ giữa ví dụ môn và project

| Trong slide/lab | Trong project hiện tại |
|---|---|
| CommonJS require/module.exports | ES modules import/export, type=module |
| Webpack và cấu hình Babel minh họa | Vite cùng plugin React xử lý frontend |
| Flask/Jinja2 render HTML | React dựng UI, Flask chủ yếu trả JSON |
| MySQL/SQLAlchemy trong ví dụ | SQLite/sqlite3, truy vấn SQL trực tiếp |
| Ví dụ HTML/DOM thuần hoặc jQuery | React cho UI, JS trực tiếp cho engine/Canvas |
| GET/POST mô tả cơ bản | API có validation, ID lượt, JSON error/status cụ thể |

Một số slide đơn giản hóa cascade CSS hoặc mô tả POST là bảo mật hơn. Khi trả lời, dùng giải thích chính xác ở Q07/Q28/Q42: vị trí body không tạo mã hóa và internal/external CSS còn phải xét cascade. Không có nghĩa lựa chọn khác slide là sai. Cần giải thích cùng khái niệm được áp dụng bằng công cụ nào và vì sao phù hợp phạm vi bài.

### 13.3. Các file code mở nhanh

| Cần giải thích | Mở file |
|---|---|
| Gắn UI và điều phối | [main.jsx](<../frontend/src/main.jsx>), [App.jsx](<../frontend/src/App.jsx>), [GamePage.jsx](<../frontend/src/pages/GamePage.jsx:56>) |
| Engine gắn với Canvas | [GameCanvas.jsx](<../frontend/src/components/GameCanvas.jsx:35>) |
| Các UI/menu | [HUD.jsx](<../frontend/src/components/HUD.jsx:49>) |
| Config và HTTP | [useBackend.js](<../frontend/src/hooks/useBackend.js:35>), [api.js](<../frontend/src/services/api.js>), [storage.js](<../frontend/src/services/storage.js>) |
| Vòng lặp | [engine.js](<../frontend/src/game/engine.js:515>) |
| Điều khiển và vận tốc | [input.js](<../frontend/src/game/input.js:44>), [player.js](<../frontend/src/game/player.js:51>) |
| Rơi và đáp bệ | [physics.js](<../frontend/src/game/physics.js:52>), [collision.js](<../frontend/src/game/collision.js>) |
| Bản đồ và bot | [world.js](<../frontend/src/game/world.js:373>), [bots.js](<../frontend/src/game/bots.js>), [ranking.js](<../frontend/src/game/ranking.js:21>) |
| Vẽ và assets | [render.js](<../frontend/src/game/render.js:59>), [doodle-art.js](<../frontend/src/game/doodle-art.js>), [sprites.js](<../frontend/src/game/sprites.js:45>) |
| Âm và camera intro | [audio.js](<../frontend/src/game/audio.js:18>), [intro-camera-motion.js](<../frontend/src/game/intro-camera-motion.js:20>) |
| Thông số và simulation | [index.js](<../frontend/src/game/index.js>), [simulation.js](<../frontend/src/game/simulation.js:103>) |
| API và database | [app.py](<../backend/app.py:55>), [runs.py](<../backend/routes/runs.py:109>), [db.py](<../backend/db.py:31>), [schema.sql](<../backend/schema.sql:22>) |
| Luật/lỗi/config | [rules.py](<../backend/rules.py>), [errors.py](<../backend/errors.py:20>), [config.py](<../backend/routes/config.py:27>) |
| Backend online | [rooms.py](<../backend/rooms.py:108>), [rooms route](<../backend/routes/rooms.py:80>), [socket.py](<../backend/socket.py>), [race.py](<../backend/events/race.py:287>), [skills.py](<../backend/events/skills.py:46>), [finish.py](<../backend/events/finish.py:201>) |
| Bố cục/proxy/scripts | [styles.css](<../frontend/src/styles.css>), [vite.config.js](<../frontend/vite.config.js>), [dev.mjs](<../scripts/dev.mjs>), [setup.mjs](<../scripts/setup.mjs>), [test.mjs](<../scripts/test.mjs>) |

## 14. Đáp án bài tự kiểm tra và tờ nhớ trước khi bước lên

### 14.1. Đáp án ngắn cho 7 bài

1. React nhận thao tác/hiển thị; engine tính/vẽ; Flask nhận dữ liệu; SQLite giữ kết quả.
2. Điều kiện đáp bệ cần đang rơi, ngang chồng nhau, chân trước trên mặt bệ, chân mới qua mặt bệ.
3. React gọi engine bằng gameRef; engine gọi callback để React đổi state.
4. Với y=100, vy=0, dt=1/60: prevY=100, vy=20, y≈100,3333. AABB không biết đang đi lên hay rơi và không biết vừa qua mặt trên.
5. Bệ y=-300, camera=-500 vẽ tại 200; người y=-112 đạt 500; bot dùng luật lựa mục tiêu, không được huấn luyện.
6. title → slide → chờ menu → ready → bệ đầu → nhân vật → reveal → chờ input → running. Canvas vẽ sân; React tạo menu/HUD/modal DOM.
7. Kết thúc → callback → POST JSON → server validation → SQL insert/commit → response → báo lưu. localStorage ở browser, database ở server.

### 14.2. Những số và tên cần nhớ

| Nội dung | Giá trị/code hiện tại |
|---|---|
| Khung logic | 960×540, 16:9 |
| Tọa độ xuất phát player | x=300, y=388; hitbox 34×42 |
| Physics dọc | g=1200, jump=-520, max vy trong physics=900 |
| Ngang | acceleration=1800, friction=2000, max vx=420 |
| Bệ chuẩn | width=120, height=14 |
| Camera gameplay | screenY=y−cameraY; tỷ lệ mục tiêu 0,60 |
| Màn chơi chính | Endless; dung nham dâng, không có đích hoặc timeout |
| Bot vào sân bình thường | 8 / 16 / 24 / 32 giây |
| Update HUD | khoảng mỗi 100 ms |
| Dev | frontend 5173, Flask 3000 |
| Kết quả mới/gửi lại/conflict | HTTP 201 / 200 / 409 |
| Backend hiện tại | Flask, sqlite3, SQLite; RULES mặc định v1 |
| Kiểm tra (working tree cũ) | 75 backend, 128 frontend, build qua; chưa xác minh lại trên dev hiện tại |

### 14.3. Phiếu lỗi học trong 3 giờ

Tự ghi ngắn khi trả lời sai, rồi ôn lại đúng câu đó ở phút 165. Không mất thời gian viết lại cả tài liệu.

| Câu/mục | Mình nói sai hoặc chưa hiểu gì? | Câu đúng ngắn | Đã tự nói lại không nhìn? |
|---|---|---|---|
| Ví dụ Q04 | Nhầm Node là API backend | Node tooling, Flask API | ☐ |
|  |  |  | ☐ |
|  |  |  | ☐ |
|  |  |  | ☐ |

### 14.4. Tiêu chí học xong

- [ ] Kể được luồng khởi động và lưu kết quả không nhìn tài liệu.
- [ ] Chỉ đúng ít nhất 7 file quan trọng ở mục 10.3.
- [ ] Tính được một frame trọng lực và đọc điều kiện landing.
- [ ] Phân biệt được React/Canvas/Node/Flask/SQLite.
- [ ] Phân biệt state/ref, current/max height, localStorage/database.
- [ ] Trả lời được 5 câu ★ liên tiếp, mỗi câu dưới 45 giây.
- [ ] Demo thấy POST lưu thành công và GET lịch sử có lượt vừa chơi.
- [ ] Nói rõ online UI, skin picker, auth và deploy hiện còn giới hạn.
- [ ] Tập bài nói khoảng 5 phút bằng timer.
- [ ] Biết chính xác phần mình đóng góp và có một ví dụ code thật để giải thích.\n