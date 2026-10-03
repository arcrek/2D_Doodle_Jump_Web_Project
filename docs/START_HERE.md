# Buổi đầu tiên — mục tiêu là chạy được và sửa được một file

Chưa cần hiểu toàn bộ React hay Flask. Làm lần lượt từng bước, chưa nhảy sang viết game.

## 1. Cài công cụ một lần

- Node.js **24 LTS**: https://nodejs.org/
- Python **3.12**: https://www.python.org/downloads/windows/ — cài Python Launcher (`py`).
- Git: https://git-scm.com/downloads
- VS Code: https://code.visualstudio.com/

Sau khi cài, mở terminal mới và kiểm tra:

```powershell
node --version
npm.cmd --version
py -3.12 --version
git --version
```

Mong đợi: Node `v24...`, Python `3.12...`, các lệnh khác in số phiên bản.

## 2. Mở đúng thư mục

**Bản xem trước của trưởng nhóm:** VS Code → File → Open Folder → chọn `D:\Web Project\doodle-jump-usth`.

**Thành viên:** nhận lời mời truy cập; VS Code → Source Control → Clone Repository → dán `https://github.com/haohan233-tvinh/2D_Doodle_Jump_Web_Project.git` → Open. Chờ trưởng nhóm tải mã nguồn lên và tạo nhánh `dev` trước khi lấy việc.

Trong VS Code chọn **Terminal → New Terminal**. Gõ `dir`: phải thấy `package.json`, `frontend`, `backend`, `docs`.
Không mở riêng `frontend` ở buổi đầu; các lệnh dưới chạy từ thư mục gốc.

## 3. Cài thư viện và chạy

Chạy từng lệnh, đợi lệnh đầu hoàn thành:

```powershell
npm.cmd run setup
npm.cmd run dev
```

Mở **http://localhost:5173**. Đạt khi:

- Mở thẳng màn hình “Doodle Jump”, thấy nhân vật màu vàng trên bệ.
- Canvas xuất hiện nghĩa là đã tải được cấu hình từ Flask.

Chọn nickname và skin rồi bấm bắt đầu. Điều khiển bằng A/D hoặc phím mũi tên; trên thiết bị cảm ứng dùng hai nút ở cạnh dưới. Không đóng terminal khi đang xem.

## 4. Thử sửa một dòng để hiểu luồng

Mở `frontend/src/pages/GamePage.jsx`, đổi tiêu đề “Doodle Jump” thành “Doodle Jump của [tên mình]”.
Nhấn **Ctrl+S**, nhìn trình duyệt cập nhật. Sau khi thấy đúng, hoàn tác bằng **Ctrl+Z** rồi lưu lại.

Thử này chỉ để biết mình đã mở đúng file và server. Không gửi thay đổi thử đó vào code chung.

## 5. Lấy đúng việc của mình

Đọc `docs/FIRST_TASKS.md`, tìm tên và làm **một** nhiệm vụ. Mỗi việc ghi file cần sửa, đầu ra và cách kiểm tra.
Lấy thông số, tên hàm và dữ liệu thử từ `docs/QUY_UOC_CHUNG.md`. Tự làm và tự kiểm tra phần mình, không cần chờ hay kiểm tra bài của thành viên khác. Nếu quy ước thiếu hoặc mâu thuẫn, gửi một ghi chú cho trưởng nhóm.

## 6. Tạo branch trước khi code

Sau khi repo chung đã có branch `dev`, ví dụ cho người làm input:

```powershell
git switch dev
git pull --ff-only origin dev
git switch -c feature/player-input
```

Mỗi người dùng tên branch trong bảng nhiệm vụ. Ở bản local chưa có remote, bỏ lệnh `git pull` và chưa push.

Sau khi làm xong:

```powershell
npm.cmd test
npm.cmd run build
git status
```

Trong Source Control của VS Code, xem từng thay đổi, stage đúng file của mình và commit với một câu mô tả.
Khi đã có remote, Push branch, mở Pull Request với **base = dev**. Ghi tên hàm, file kiểm tra mới và kết quả chạy.
Trưởng nhóm ghép vào bản dùng để kiểm tra, chạy lại test và thử hành vi trong game; đạt rồi mới merge vào `dev`. Không yêu cầu thành viên khác kiểm tra chéo. Thành viên không tự đẩy việc vào `main`.

Nếu Git chưa có tên/email, dùng danh tính của chính mình trong Settings hoặc `git config user.name` / `git config user.email` trước khi commit.

## Nếu bị lỗi

| Thấy gì? | Làm gì? |
|---|---|
| Không tìm thấy package.json | Mở terminal ở thư mục có cả frontend và backend. |
| npm.ps1 bị chặn | Dùng `npm.cmd` như hướng dẫn. |
| Không tìm thấy py -3.12 | Cài Python 3.12 cùng Launcher, mở terminal mới. |
| Port 3000 hoặc 5173 đang dùng | Dừng phiên dev cũ bằng Ctrl+C; không tự dừng tiến trình không rõ nguồn. |
| Hiện “Chưa tải được game” | Đọc lỗi Python trong terminal; dừng rồi chạy lại dev, nhấn Thử lại. |
| Sửa Python mà giao diện chưa đổi | Dev starter không tự reload Python: Ctrl+C rồi chạy lại. |

Không giải quyết bằng cách xóa file hoặc cài thư viện ngẫu nhiên. Nếu chưa tự sửa được, gửi trưởng nhóm: **lệnh vừa chạy + lỗi đầu tiên + file đang sửa**.

## Kết thúc buổi đầu

Mỗi người báo ba dòng: “Đã chạy React/Flask”, “Đang làm mã việc …”, “Link PR hoặc lỗi đang gặp”.
Không cần hoàn thành cả game trong buổi đầu.
