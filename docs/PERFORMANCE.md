# Tài nguyên đồ họa và vòng đời game

Game vẫn dùng Canvas 960×540 và cách vẽ/mô phỏng hiện tại. Tối ưu ngày 2026-10-03 tập trung vào ảnh bot theo vùng sử dụng, tái dùng bề mặt tiêu đề và dừng xử lý khi tab bị ẩn. Test/build không thay thế phép đo điện thoại thật.

## Khi đổi ảnh bot hoặc crop

Master giữ tại `frontend/public/images/bots/`. `BOT_PATHS` và `BOT_ENTRANCE_PROFILES` là ánh xạ/crop nguồn. Game thường tải các PNG dưới `images/bots/optimized/`: một ảnh gameplay nhỏ và một crop mắt nguyên độ phân giải cho mỗi bot. Crop mắt có thêm viền 2px để Canvas lọc biên giống nguồn; renderer giữ nguyên destination geometry.

Sau khi thay master/crop, sinh lại manifest và ảnh bằng:

```powershell
# Nếu sharp đã có trong project thì không cần biến môi trường.
# Codex có thể dùng đường dẫn node packages do load_workspace_dependencies trả về:
$env:GAME_ASSET_NODE_MODULES = '<folder-containing-sharp>'
node scripts/prepare-game-assets.mjs
npm.cmd run build
```

Không cần sharp ở runtime game hoặc lúc build thông thường: ảnh và manifest đã được sinh sẵn. `prebuild` kiểm tra hash master, crop, kích thước và hash file derivative để tránh hiển thị ảnh cũ khi đổi asset. Các URL có hash nội dung. Khi derivative không tải được, renderer thử master theo cùng crop và giữ fallback cũ trong lúc tải.

Khi chọn file để commit, cần đủ manifest, tám derivative đang được manifest tham chiếu, script và source thay đổi thuộc task. Không tự thêm toàn bộ working tree.

## Tab nền và phép đo

Engine hủy RAF/reset input khi document hidden, loại thời gian ẩn khỏi các mốc gameplay/intro và tiếp tục một RAF khi visible. Pause thủ công vẫn giữ. Visibility listener được gỡ khi destroy. Audio scheduler nghỉ khi tab ẩn và chỉ khôi phục track đã được yêu cầu; stop/mute không bị override bởi visibility.

Đo trên production build; phân biệt file tải, RGBA/backing estimate, retained JS heap và RAM renderer/process. Không cộng RAM toàn browser vào game. Bằng chứng riêng của đợt này nằm tại `plans/20261003-0928-browser-performance/reports/` và `evidence/`. Browser headless/giả lập viewport chỉ kiểm tra kỹ thuật, không chứng minh FPS, nhiệt máy hoặc RAM trên điện thoại thật.
