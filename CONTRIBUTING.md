# Hướng dẫn đóng góp

Cảm ơn bạn đã quan tâm tới Blooom! Tài liệu này mô tả cách gửi thay đổi sao cho được
duyệt nhanh nhất.

## Chuẩn bị môi trường

Cần Node.js 20 trở lên.

```bash
git clone https://github.com/gmtigrisva123/Blooom-Project.git
cd Blooom-Project
npm install
npm run dev
```

## Quy trình làm việc

1. **Mở issue trước** khi bắt tay vào thay đổi lớn, để tránh làm trùng hoặc làm sai hướng.
2. Tạo nhánh từ `main` với tên mô tả rõ việc:
   ```bash
   git switch -c feat/loc-ghi-chu-theo-thang
   ```
3. Viết code, giữ nguyên phong cách của mã xung quanh.
4. Chạy `npm run verify` — lệnh này chạy đúng những gì CI sẽ chạy.
5. Commit theo quy ước bên dưới, đẩy nhánh lên và mở pull request.

## Quy ước commit

Dự án dùng [Conventional Commits](https://www.conventionalcommits.org/):

```
<loại>(<phạm vi>): <mô tả ngắn, thể mệnh lệnh>
```

| Loại       | Dùng khi                            |
| ---------- | ----------------------------------- |
| `feat`     | Thêm tính năng mới                  |
| `fix`      | Sửa lỗi                             |
| `style`    | Thay đổi giao diện, không đổi logic |
| `refactor` | Dọn dẹp mã, không đổi hành vi       |
| `docs`     | Tài liệu                            |
| `chore`    | Cấu hình, phụ thuộc, công cụ        |
| `ci`       | Quy trình tự động                   |
| `perf`     | Cải thiện hiệu năng                 |

Ví dụ:

```
feat(notes): thêm bộ lọc ghi chú theo tháng
fix(timer): vòng đếm không cập nhật khi đổi cấu hình
style(dashboard): giãn khoảng cách thẻ số liệu trên mobile
```

## Tiêu chuẩn mã nguồn

- **Ngôn ngữ giao diện là tiếng Việt.** Mọi chuỗi hiển thị cho người dùng phải là tiếng Việt
  có dấu. Chú thích trong mã viết bằng tiếng Anh.
- **Không dùng inline style cho những gì lặp lại.** Thêm class vào `src/styles/` thay vì
  `style={{ ... }}`. Inline style chỉ chấp nhận cho giá trị động (ví dụ `--subject-color`).
- **Dùng biến của design system.** Không viết mã màu, khoảng cách hay bo góc trực tiếp —
  lấy từ [`src/styles/tokens.css`](src/styles/tokens.css).
- **Đừng gom `--accent` vào biến tổng hợp ở `:root`.** CSS thay thế `var()` tại nơi khai
  báo, nên biến đó sẽ đóng băng màu mặc định. Viết gradient tại chỗ dùng.
- **Ngày giờ phải theo giờ địa phương.** Dùng `dayKey()` trong
  [`src/services/gamification.js`](src/services/gamification.js), không dùng
  `toISOString()` để gom nhóm theo ngày — nó dùng giờ UTC và lệch 7 tiếng ở Việt Nam.
- **Giữ nguyên tính năng đang có.** Nếu buộc phải thay đổi hành vi cũ, nói rõ trong PR.

## Kiểm tra trước khi gửi PR

```bash
npm run verify
```

Ngoài ra hãy tự kiểm tra bằng tay:

- [ ] Thử ở 375px và ở 1280px
- [ ] Thử ở cả giao diện sáng và tối
- [ ] Console trình duyệt không có lỗi mới
- [ ] Đi được bằng phím Tab qua các phần tử mới, viền focus nhìn thấy rõ
- [ ] Các phím tắt (`Ctrl+K`, `1`–`6`, `Space`, `R`) vẫn hoạt động

## Pull request

- Mỗi PR giải quyết một việc. PR nhỏ được duyệt nhanh hơn nhiều.
- **Bắt buộc kèm ảnh chụp màn hình** nếu có thay đổi giao diện, tốt nhất là cả trước và sau.
- Điền đầy đủ mẫu PR.
- CI phải xanh trước khi merge.

## Báo lỗi

Dùng [mẫu báo lỗi](https://github.com/gmtigrisva123/Blooom-Project/issues/new?template=bug_report.yml).
Ghi rõ trình duyệt, kích thước màn hình, giao diện sáng hay tối, và các bước tái hiện — đó
là những thứ quyết định lỗi có sửa được nhanh hay không.

Với vấn đề bảo mật, đừng mở issue công khai — xem [SECURITY.md](SECURITY.md).
