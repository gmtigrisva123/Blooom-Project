import { Database, TriangleAlert, ExternalLink } from 'lucide-react';

const BRAND_LOGO = `${import.meta.env.BASE_URL}blooom-logo.png`;

/* Bước cuối của hướng dẫn khác nhau hoàn toàn giữa hai ngữ cảnh, nên màn hình
   phải biết mình đang được xem ở đâu.

   Trên một trang đã deploy, câu "tạo tệp .env ở thư mục gốc dự án" là lời
   khuyên vô nghĩa: không có thư mục dự án nào để tạo tệp cả. Biến VITE_* lại
   được Vite thay thế thành hằng số NGAY LÚC BUILD, nên chúng phải nằm trong
   cấu hình của nền tảng lưu trữ và phải build lại thì mới có tác dụng — đó
   mới là việc người xem cần làm. */
const isLocalDev = () => {
  const host = globalThis.location?.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

/* ==========================================================================
   MÀN HÌNH CHƯA CẤU HÌNH CƠ SỞ DỮ LIỆU

   Hiện ra khi VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY chưa được đặt.

   Lựa chọn thiết kế đáng nói ở đây là điều ứng dụng KHÔNG làm: nó không âm
   thầm quay về lưu dữ liệu trong trình duyệt. Một bản dựng thiếu cấu hình mà
   vẫn chạy mượt là cái bẫy tệ nhất có thể có khi trình bày trước hội đồng —
   mọi thứ trông như đang hoạt động, nhưng không có gì được lưu thật, và
   người trình bày sẽ chỉ phát hiện ra khi tải lại trang trước mặt giám khảo.
   ========================================================================== */
export const SetupScreen = () => {
  const local = isLocalDev();

  return (
    <div className="auth auth-solo">
      <div className="auth-panel">
        <img className="auth-logo" src={BRAND_LOGO} alt="Blooom" width="459" height="152" />

        <div className="auth-error" role="alert">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>Chưa kết nối được cơ sở dữ liệu.</span>
        </div>

        <h1 className="auth-title">Cần cấu hình Supabase trước khi chạy</h1>
        <p className="auth-sub">
          Blooom lưu toàn bộ dữ liệu trong một cơ sở dữ liệu PostgreSQL. Ứng dụng cố ý không
          chạy ở chế độ lưu tạm trong trình duyệt, để không bao giờ có chuyện giao diện hoạt
          động bình thường trong khi dữ liệu thật ra không được lưu.
        </p>

        <ol className="setup-steps">
          <li>
            <strong>Tạo dự án Supabase</strong>
            <p>
              Vào{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer noopener"
              >
                supabase.com/dashboard <ExternalLink size={12} aria-hidden="true" />
              </a>{' '}
              và tạo một project mới (gói miễn phí là đủ).
            </p>
          </li>

          <li>
            <strong>Tạo bảng</strong>
            <p>
              Mở <em>SQL Editor</em>, dán toàn bộ nội dung tệp{' '}
              <code className="mono">supabase/migrations/0001_init.sql</code> trong mã nguồn rồi
              bấm <em>Run</em>. Làm tiếp đúng như vậy với{' '}
              <code className="mono">supabase/migrations/0002_admin_access_code.sql</code> — tệp
              này khóa cột vai trò và dựng cổng mã truy cập cho tài khoản Admin.
            </p>
          </li>

          <li>
            <strong>Bật chế độ dùng thử (tùy chọn)</strong>
            <p>
              <em>Authentication › Sign In / Providers</em> › bật{' '}
              <em>Allow anonymous sign-ins</em>, nếu bạn muốn giữ nút &ldquo;Dùng thử không cần
              tài khoản&rdquo;.
            </p>
          </li>

          <li>
            <strong>Khai báo khóa</strong>
            {local ? (
              <>
                <p>
                  Tạo tệp <code className="mono">.env</code> ở thư mục gốc dự án (xem{' '}
                  <code className="mono">.env.example</code>):
                </p>
                <pre className="setup-code mono">
                  {
                    'VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-public-key>'
                  }
                </pre>
              </>
            ) : (
              <>
                <p>
                  Trang này đang chạy trên máy chủ, nên không có tệp{' '}
                  <code className="mono">.env</code> nào để sửa. Hai biến dưới đây phải khai báo
                  trong phần biến môi trường của nền tảng bạn dùng để deploy:
                </p>
                <pre className="setup-code mono">
                  {'VITE_SUPABASE_URL\nVITE_SUPABASE_ANON_KEY'}
                </pre>
                <p className="t-xs t-dim">
                  Vercel: <em>Project Settings › Environment Variables</em>. GitHub Pages:{' '}
                  <em>Settings › Secrets and variables › Actions</em>.
                </p>
              </>
            )}
            <p className="t-xs t-dim">
              Hai giá trị này lấy ở <em>Project Settings › API</em> trong Supabase. Khóa{' '}
              <code className="mono">anon</code> là khóa công khai theo thiết kế — quyền truy
              cập từng hàng do Row Level Security quyết định. Tuyệt đối không dùng khóa{' '}
              <code className="mono">service_role</code>: nó bỏ qua toàn bộ Row Level Security
              và sẽ bị nhúng thẳng vào JavaScript gửi tới trình duyệt.
            </p>
          </li>

          <li>
            <strong>{local ? 'Khởi động lại máy chủ phát triển' : 'Deploy lại'}</strong>
            <p>
              {local ? (
                <>
                  Vite chỉ đọc <code className="mono">.env</code> lúc khởi động, nên cần dừng và
                  chạy lại <code className="mono">npm run dev</code>.
                </>
              ) : (
                <>
                  Vite thay thế mọi biến <code className="mono">VITE_*</code> thành hằng số ngay
                  lúc build, nên bản dựng hiện tại đã cố định là &ldquo;chưa cấu hình&rdquo;.
                  Thêm biến thôi chưa đủ — phải chạy lại một lần deploy mới.
                </>
              )}
            </p>
          </li>
        </ol>

        <p className="auth-note">
          <Database size={14} aria-hidden="true" />
          <span>
            Lược đồ đầy đủ, bao gồm toàn bộ chính sách Row Level Security, nằm trong{' '}
            <code className="mono">supabase/migrations/0001_init.sql</code>. Tệp đó không chứa
            một dòng dữ liệu mẫu nào.
          </span>
        </p>
      </div>
    </div>
  );
};
