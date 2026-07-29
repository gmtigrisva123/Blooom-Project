<div align="center">

<img src="public/icon-192.png" alt="" width="88" height="88" />

# StudyHub

**Nền tảng nhóm học tập tương tác cho học sinh &amp; sinh viên**

Kết nối nhóm học theo môn · Tập trung với Pomodoro · Theo dõi hiệu suất · Số hóa ghi chú

[![CI](https://github.com/gmtigrisva123/Blooom-Project/actions/workflows/ci.yml/badge.svg)](https://github.com/gmtigrisva123/Blooom-Project/actions/workflows/ci.yml)
[![Deploy](https://github.com/gmtigrisva123/Blooom-Project/actions/workflows/deploy.yml/badge.svg)](https://github.com/gmtigrisva123/Blooom-Project/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vite.dev)

[**🌐 Xem demo trực tiếp**]([https://gmtigrisva123.github.io/Blooom-Project](https://blooom-project.vercel.app/)) · [Báo lỗi](https://github.com/gmtigrisva123/Blooom-Project/issues/new?template=bug_report.yml) · [Đề xuất tính năng](https://github.com/gmtigrisva123/Blooom-Project/issues/new?template=feature_request.yml)

<img src="public/og-image.png" alt="Ảnh xem trước StudyHub" width="720" />

</div>

---

## Giới thiệu

StudyHub gom bốn thứ một học sinh thường phải dùng bốn ứng dụng khác nhau vào một chỗ: tìm
nhóm học cùng môn, đồng hồ Pomodoro để tập trung, bảng theo dõi tiến độ, và kho ghi chú.
Toàn bộ dữ liệu nằm trong `localStorage` của trình duyệt — không cần đăng ký, không cần
máy chủ, mở là dùng được ngay.

Mỗi phút học được ghi lại thành **điểm XP**, đủ XP thì lên cấp, học đều đặn thì giữ được
**chuỗi ngày liên tiếp**, và có **14 huy hiệu** để mở khóa dần.

## Tính năng

| Khu vực              | Nội dung                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 📊 **Tổng Quan**     | Lời chào theo buổi, chuỗi ngày học, thanh XP, biểu đồ 7 ngày, dòng hoạt động gần đây, bộ sưu tập huy hiệu                    |
| 👥 **Nhóm Học Tập**  | Tạo và tham gia nhóm, lọc theo 7 môn, tìm kiếm, nhóm công khai / riêng tư                                                    |
| ⏱️ **Bộ Đếm Giờ**    | Pomodoro với vòng đếm SVG, 3 cấu hình dựng sẵn (25/50/90 phút), âm báo Web Audio, tự chuyển sang giờ nghỉ, nhật ký phiên học |
| ✨ **Editor's Pick** | Bài viết mẹo học tập, lưu bài yêu thích, đăng bài mới ở vai trò Admin                                                        |
| 📈 **Hiệu Suất**     | Vòng đo mục tiêu tuần, lịch nhiệt 7 ngày, phân phối thời gian theo môn, đặt mục tiêu                                         |
| 📁 **Ghi Chú**       | Tải ảnh chụp vở hoặc PDF, phân loại theo môn, gắn vào nhóm học, xem và tải về                                                |

**Xuyên suốt toàn app:** giao diện sáng/tối, màu nhấn đổi theo từng khu vực, command palette
`Ctrl+K` tìm kiếm không dấu, phím tắt đầy đủ, responsive từ 375px, tôn trọng
`prefers-reduced-motion`.

## Phím tắt

| Phím                          | Chức năng                                              |
| ----------------------------- | ------------------------------------------------------ |
| <kbd>Ctrl</kbd>+<kbd>K</kbd>  | Mở command palette (tìm nhóm, ghi chú, bài viết, lệnh) |
| <kbd>1</kbd>…<kbd>6</kbd>     | Nhảy tới từng khu vực                                  |
| <kbd>Space</kbd>              | Chạy / tạm dừng Pomodoro (khi đang ở tab Bộ Đếm Giờ)   |
| <kbd>R</kbd>                  | Đặt lại bộ đếm                                         |
| <kbd>Shift</kbd>+<kbd>D</kbd> | Đổi giao diện sáng / tối                               |
| <kbd>?</kbd>                  | Mở bảng tra cứu phím tắt                               |
| <kbd>Esc</kbd>                | Đóng hộp thoại đang mở                                 |

Phím tắt tự động vô hiệu khi con trỏ đang ở trong ô nhập liệu.

## Bắt đầu

**Yêu cầu:** Node.js 20 trở lên.

```bash
git clone https://github.com/gmtigrisva123/Blooom-Project.git
cd Blooom-Project
npm install
npm run dev
```

Mở http://localhost:3000. Ứng dụng tự tạo dữ liệu mẫu ở lần chạy đầu tiên.

### Các lệnh có sẵn

| Lệnh               | Tác dụng                                                       |
| ------------------ | -------------------------------------------------------------- |
| `npm run dev`      | Chạy máy chủ phát triển kèm hot reload                         |
| `npm run build`    | Build bản production vào `dist/`                               |
| `npm run preview`  | Xem thử bản đã build                                           |
| `npm run lint`     | Kiểm tra mã bằng ESLint                                        |
| `npm run lint:fix` | Tự sửa những lỗi lint sửa được                                 |
| `npm run format`   | Định dạng toàn bộ mã bằng Prettier                             |
| `npm run verify`   | Chạy cả lint + format:check + build (giống hệt CI)             |
| `npm run assets`   | Tạo lại icon và ảnh Open Graph từ `scripts/generate-assets.py` |

## Cấu trúc dự án

```
src/
├── components/
│   ├── CommandPalette/   Ctrl+K palette và bảng phím tắt
│   ├── Dashboard/        Trang tổng quan
│   ├── EditorPick/       Bài viết mẹo học tập
│   ├── Groups/           Nhóm học tập
│   ├── Layout/           Sidebar và topbar
│   ├── Notes/            Kho ghi chú
│   ├── Performance/      Theo dõi hiệu suất
│   ├── Timer/            Pomodoro
│   └── common/           Modal, empty state, thẻ số liệu, skeleton...
├── constants/            Danh sách môn học và cấu hình điều hướng
├── context/              AppContext — toàn bộ trạng thái dùng chung
├── hooks/                Phím tắt toàn cục
├── services/
│   ├── gamification.js   Streak, XP, cấp độ, huy hiệu
│   └── storage.js        Đọc/ghi localStorage và dữ liệu mẫu
└── styles/               Design system CSS thuần, tách theo vai trò
```

## Hệ thống thiết kế

Giao diện dùng **CSS thuần, không framework**. Mọi màu sắc, khoảng cách, bo góc, đổ bóng và
thời lượng chuyển động đều là biến CSS trong [`src/styles/tokens.css`](src/styles/tokens.css).

Điểm đặc trưng là **màu nhấn theo khu vực**: thuộc tính `data-section` trên khung ứng dụng
ghi đè biến `--accent`, nên toàn bộ nút, badge, biểu đồ và hiệu ứng tự đổi màu khi người
dùng chuyển tab.

| Khu vực       | Màu               |
| ------------- | ----------------- |
| Tổng Quan     | `#6366f1` Indigo  |
| Nhóm Học Tập  | `#8b5cf6` Tím     |
| Bộ Đếm Giờ    | `#f97316` Cam     |
| Editor's Pick | `#ec4899` Hồng    |
| Hiệu Suất     | `#10b981` Xanh lá |
| Ghi Chú       | `#06b6d4` Cyan    |

> [!NOTE]
> Đừng gom `--accent` vào một biến tổng hợp ở `:root` (kiểu
> `--accent-grad: linear-gradient(..., var(--accent))`). CSS thay thế `var()` tại nơi biến
> được **khai báo**, nên biến đó sẽ đóng băng màu mặc định và không đổi theo khu vực nữa.
> Hãy viết gradient trực tiếp tại chỗ sử dụng.

## Tự động hóa

| Quy trình                                                          | Khi nào chạy                        | Làm gì                                                        |
| ------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------- |
| [`ci.yml`](.github/workflows/ci.yml)                               | Mỗi push và pull request            | Lint, kiểm tra định dạng, build, báo cáo kích thước bundle    |
| [`deploy.yml`](.github/workflows/deploy.yml)                       | Push vào `main` + ngày 1 hằng tháng | Build và deploy lên GitHub Pages                              |
| [`lighthouse.yml`](.github/workflows/lighthouse.yml)               | Ngày 1 hằng tháng                   | Chấm điểm hiệu năng / tiếp cận / SEO rồi mở issue kèm kết quả |
| [`monthly-ui-review.yml`](.github/workflows/monthly-ui-review.yml) | Ngày 1 hằng tháng                   | Mở issue checklist rà soát giao diện                          |
| [`dependabot.yml`](.github/dependabot.yml)                         | Hằng tháng                          | Mở PR nâng cấp thư viện và GitHub Actions                     |

## Công nghệ

- [React 18](https://react.dev) — thư viện giao diện
- [Vite 6](https://vite.dev) — công cụ build
- [lucide-react](https://lucide.dev) — bộ icon
- [canvas-confetti](https://github.com/catdad/canvas-confetti) — hiệu ứng khi hoàn thành phiên học
- CSS thuần với biến CSS — không dùng framework CSS
- `localStorage` — lưu trữ toàn bộ dữ liệu phía trình duyệt

## Đóng góp

Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết quy ước commit, quy trình pull request và
tiêu chuẩn kiểm tra trước khi gửi thay đổi.

## Giấy phép

Phát hành theo giấy phép [MIT](LICENSE) — © 2026 Viet Anh Ho.
