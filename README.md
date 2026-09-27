# Doodle Jump USTH

Game đua cao Doodle Jump chạy bằng **ReactJS + Canvas + Python Flask**.

Repo chung: [2D_Doodle_Jump_Web_Project](https://github.com/haohan233-tvinh/2D_Doodle_Jump_Web_Project).

## Bắt đầu ở đâu?

1. Đọc [Hướng dẫn bắt đầu](docs/START_HERE.md).
2. Bấm “Bắt đầu chơi” ở màn tiêu đề; camera trượt xuống sân chơi. Chọn nickname và một trong năm skin rồi đua với bốn bot.
3. Dùng phím mũi tên hoặc A/D để điều khiển; trên màn hình cảm ứng dùng hai nút ở cạnh dưới.

## Chạy trên Windows

Cần **Node.js 24 LTS**, **Python 3.12** (có lệnh `py`), **Git** và **VS Code**.
Mở PowerShell tại thư mục này, chạy:

```powershell
npm.cmd run setup
npm.cmd run dev
```

Mở **http://localhost:5173**. Giữ terminal đang chạy. Nhấn **Ctrl+C** để dừng hai dịch vụ.

Lần sau chỉ cần `npm.cmd run dev`. Sau khi đồng đội đổi thư viện, chạy lại setup.
Frontend tự cập nhật khi lưu file; sau khi sửa Python, dừng dev rồi chạy lại.

## Tính năng hiện có

| Phần | Trạng thái |
|---|---|
| Di chuyển, tự nhảy, va chạm bệ và camera cuộn | Hoạt động |
| Bốn bot dùng ảnh nhân vật và bảng xếp hạng trực tiếp | Hoạt động |
| Chọn nickname, skin, tạm dừng và chơi lại | Hoạt động |
| Chuyển cảnh tiêu đề, nhịp bật xuất phát, màn che khi chơi lại và về menu | Hoạt động |
| Khung 16:9 tràn viền trên màn 16:9, giữ trọn khung trên màn khác tỷ lệ | Hoạt động |
| Lưu kết quả, lịch sử cá nhân và bảng xếp hạng SQLite | Hoạt động |
| API cấu hình luật, skin và bot | Hoạt động |

Luật, skin và bot lấy từ `GET /api/config`. Sau mỗi lượt, frontend gửi kết quả tới `POST /api/runs`; menu có thể mở lịch sử cá nhân và bảng xếp hạng. Khi API chưa sẵn sàng, game vẫn chơi được nhưng không lưu lượt.

## Các thư mục

- `frontend/src/pages/`: màn hình React.
- `frontend/src/components/`: thành phần giao diện.
- `frontend/src/game/`: code game chạy trong trình duyệt.
- `backend/routes/`: route Flask.
- `backend/schema.sql`: cấu trúc dữ liệu dự kiến.
- `docs/`: hướng dẫn, công việc đầu tiên và quy ước API.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run build
```

`build` kiểm tra frontend đóng gói được; chưa phải triển khai website hoàn chỉnh.
Quy trình nhóm: **branch từ dev → làm một việc → tự kiểm tra → gửi trưởng nhóm → ghép và kiểm tra bản chung → merge vào dev**.
Mỗi người dùng [quy ước chung](docs/QUY_UOC_CHUNG.md), không cần kiểm tra chéo hay trao đổi thường xuyên với thành viên khác.
Không đưa thư viện, `.venv`, cơ sở dữ liệu hay slide giảng viên vào Git.

Danh sách nhóm hiện có 7 người; cần xác nhận với giảng viên vì slide ghi tối đa 6.
Sau lần tải mã nguồn đầu tiên lên `main`, trưởng nhóm tạo nhánh `dev` từ `main` nếu chưa có và mời các thành viên vào repo.
