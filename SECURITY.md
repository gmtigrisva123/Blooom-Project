# Chính sách bảo mật

## Phạm vi

StudyHub chạy hoàn toàn trong trình duyệt. Không có máy chủ, không có tài khoản, không có
API. Toàn bộ dữ liệu người dùng nằm trong `localStorage` của chính trình duyệt đó và không
bao giờ rời khỏi máy.

Điều đó có nghĩa là bề mặt tấn công rất nhỏ, nhưng vẫn còn những vấn đề đáng quan tâm:

- Cross-site scripting (XSS) qua nội dung do người dùng nhập (tên nhóm, ghi chú, bài viết)
- Lỗ hổng trong các thư viện phụ thuộc
- Rò rỉ dữ liệu qua các tệp tải lên được lưu dưới dạng data URL

## Phiên bản được hỗ trợ

| Phiên bản | Được hỗ trợ |
| --------- | ----------- |
| 2.x       | ✅          |
| 1.x       | ❌          |

## Báo cáo lỗ hổng

**Vui lòng không mở issue công khai cho vấn đề bảo mật.**

Hãy báo cáo riêng tư qua
[GitHub Security Advisories](https://github.com/gmtigrisva123/Blooom-Project/security/advisories/new).

Trong báo cáo, cố gắng nêu:

- Loại lỗ hổng và vị trí trong mã nguồn
- Các bước tái hiện
- Ảnh hưởng có thể xảy ra
- Đề xuất cách khắc phục nếu bạn có

## Thời gian phản hồi

Đây là một đồ án học tập do một người duy trì, nên không có cam kết SLA. Dù vậy, mục tiêu là:

- Xác nhận đã nhận báo cáo trong vòng **7 ngày**
- Đánh giá và phản hồi hướng xử lý trong vòng **30 ngày**

Nếu lỗ hổng được xác nhận, bạn sẽ được ghi nhận trong phần công bố bản vá — trừ khi bạn muốn
ẩn danh.

## Lưu ý cho người dùng

- Dữ liệu StudyHub **không được mã hóa** và **không được sao lưu**. Xóa dữ liệu duyệt web là
  mất hết.
- Đừng lưu thông tin nhạy cảm (mật khẩu, giấy tờ tùy thân) vào phần Ghi Chú.
- Tệp tải lên được lưu dưới dạng data URL trong `localStorage`, giới hạn khoảng 3 MB mỗi tệp.
