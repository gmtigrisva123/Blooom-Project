import { Logo } from '../ui/bits';

const isLocalDev = () => {
  const host = globalThis.location?.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

/* ==========================================================================
   SETUP — shown only when this build was made without a database to talk to.

   A visitor gets one plain sentence. The technical steps are folded away
   underneath for whoever runs the site, because they are the only reader who
   can act on them.

   The app deliberately does NOT fall back to saving in the browser: a build
   that looks like it works while nothing is really saved is the worst
   possible failure for a study tool.
   ========================================================================== */
export const SetupScreen = () => {
  const local = isLocalDev();

  return (
    <main className="setup">
      <div className="setup-card">
        <Logo height={44} />
        <h1>Blooom chưa sẵn sàng</h1>
        <p className="muted">Trang đang được cài đặt. Bạn quay lại sau ít phút nhé.</p>

        <details className="setup-details">
          <summary>Dành cho người quản trị</summary>
          <ol>
            <li>
              Tạo một dự án tại{' '}
              <a
                className="link"
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer noopener"
              >
                supabase.com
              </a>{' '}
              (gói miễn phí là đủ).
            </li>
            <li>
              Mở <b>SQL Editor</b>, lần lượt chạy hai tệp trong thư mục{' '}
              <code>supabase/migrations</code>.
            </li>
            <li>
              Muốn có nút “Dùng thử”: <b>Authentication › Sign In / Providers</b> › bật{' '}
              <b>Allow anonymous sign-ins</b>.
            </li>
            <li>
              {local ? (
                <>
                  Tạo tệp <code>.env</code> ở thư mục gốc (xem <code>.env.example</code>) với
                  hai dòng dưới đây, rồi chạy lại <code>npm run dev</code>.
                </>
              ) : (
                <>Khai báo hai biến môi trường dưới đây trên nơi bạn deploy, rồi deploy lại.</>
              )}
              <pre>{'VITE_SUPABASE_URL\nVITE_SUPABASE_ANON_KEY'}</pre>
            </li>
          </ol>
          <p className="tiny muted">
            Lấy hai giá trị ở <b>Project Settings › API</b>. Chỉ dùng khóa <code>anon</code>,
            tuyệt đối không dùng khóa <code>service_role</code>.
          </p>
        </details>
      </div>
    </main>
  );
};
