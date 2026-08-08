import { RetentionPlot } from './RetentionPlot';
import {
  ArrowRight,
  Sun,
  Moon,
  Layers,
  FlaskConical,
  Waves,
  TrendingUp,
  Timer,
  Users,
  FileText,
  Sparkles,
  LineChart,
  Trophy,
  Database,
  ShieldCheck,
  Sigma
} from 'lucide-react';

const BRAND_LOGO = `${import.meta.env.BASE_URL}blooom-logo.png`;

/* ==========================================================================
   THE FOUR INSTRUMENTS
   Each card names the method, the formula the app actually evaluates, and the
   source the method comes from. Nothing here is a performance claim — a
   claim about how well students do would need data we have not collected.
   ========================================================================== */
const INSTRUMENTS = [
  {
    id: 'srs',
    icon: Layers,
    tag: 'Trí nhớ',
    title: 'Ôn tập ngắt quãng SM-2',
    formula: 'EF′ = EF + 0,1 − (5−q)(0,08 + 0,02(5−q))',
    body: 'Mỗi thẻ giữ một hệ số dễ riêng. Sau mỗi lần bạn tự chấm, thuật toán điều chỉnh hệ số đó rồi tính ra ngày ôn kế tiếp — thẻ khó quay lại sớm, thẻ dễ giãn ra dần.',
    source: 'Wozniak & Gorzelanczyk, 1994'
  },
  {
    id: 'forgetting',
    icon: TrendingUp,
    tag: 'Trí nhớ',
    title: 'Đường cong quên Ebbinghaus',
    formula: 'R(t) = e^(−t/S),  S = interval / −ln 0,9',
    body: 'Xác suất bạn còn nhớ một thẻ được ước lượng liên tục theo thời gian kể từ lần ôn cuối, thay vì chỉ hiện “đến hạn / chưa đến hạn”.',
    source: 'Ebbinghaus, 1885'
  },
  {
    id: 'nof1',
    icon: FlaskConical,
    tag: 'Thực nghiệm',
    title: 'Thí nghiệm N-of-1 có đối chứng',
    formula: 't = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)',
    body: 'Bạn khai báo giả thuyết trước, ứng dụng bốc ngẫu nhiên điều kiện cho từng phiên theo khối, rồi kiểm định Welch kèm Cohen’s d và khoảng tin cậy 95%.',
    source: 'Welch, 1947 · thiết kế N-of-1'
  },
  {
    id: 'cosinor',
    icon: Waves,
    tag: 'Nhịp sinh học',
    title: 'Phân tích cosinor 24 giờ',
    formula: 'y(h) = M + A·cos(2π(h − φ)/24)',
    body: 'Khớp một sóng cosin chu kỳ 24 giờ vào lịch sử phiên học để ước lượng mesor, biên độ và acrophase — giờ đỉnh tập trung của riêng bạn.',
    source: 'Halberg, 1969'
  }
];

/* The product's existing surface, listed so it is obvious that the science
   sits on top of a working study app rather than replacing it. */
const WORKSPACE = [
  { icon: Timer, label: 'Pomodoro & nhật ký phiên', note: '25′ / 50′ / 90′, âm báo, ghi XP' },
  { icon: Users, label: 'Nhóm học theo môn', note: 'Tạo nhóm, tham gia, lọc theo môn' },
  { icon: FileText, label: 'Kho ghi chú số hóa', note: 'Tải lên, gắn môn và gắn nhóm' },
  { icon: Sparkles, label: "Editor's Pick", note: 'Bài viết mẹo học, lưu yêu thích' },
  { icon: LineChart, label: 'Hiệu suất tuần', note: 'Mục tiêu giờ và số phiên' },
  { icon: Trophy, label: 'Huy hiệu & chuỗi ngày', note: '14 huy hiệu suy ra từ dữ liệu thật' }
];

const STEPS = [
  {
    n: '01',
    title: 'Ghi lại phiên học thật',
    body: 'Bấm Pomodoro như bình thường. Mỗi phiên là một quan sát có thời điểm, thời lượng và môn học.'
  },
  {
    n: '02',
    title: 'Để mô hình đọc dữ liệu đó',
    body: 'Lịch ôn tập, đường cong quên, nhịp ngày đêm và dự báo tuần đều tính lại từ chính các phiên bạn vừa ghi.'
  },
  {
    n: '03',
    title: 'Tự chạy thí nghiệm để kiểm chứng',
    body: 'Không tin một mẹo học nào đó? Khai báo giả thuyết và để Blooom bốc ngẫu nhiên, đo và kiểm định giúp bạn.'
  }
];

export const LandingPage = ({ theme, onToggleTheme, onSignIn, onSignUp, onGuest }) => (
  <div className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href="#top">
        <img src={BRAND_LOGO} alt="Blooom" width="459" height="152" />
      </a>

      <nav className="landing-nav-links" aria-label="Điều hướng trang giới thiệu">
        <a href="#phuong-phap">Phương pháp</a>
        <a href="#khong-gian">Không gian học</a>
        <a href="#du-lieu">Dữ liệu</a>
      </nav>

      <div className="landing-nav-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label="Đổi giao diện sáng/tối"
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSignIn}>
          Đăng nhập
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onSignUp}>
          Tạo tài khoản
        </button>
      </div>
    </header>

    <main id="top">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="tag-line mono">
            <Sigma size={13} aria-hidden="true" />
            Nền tảng học tập dựa trên bằng chứng
          </span>

          <h1>Học có phương pháp. Đo được.</h1>

          <p className="landing-lede">
            Blooom giữ nguyên mọi thứ một ứng dụng học tập cần — Pomodoro, nhóm học, ghi chú,
            theo dõi tiến độ — rồi bổ sung bốn công cụ khoa học chạy trực tiếp trên dữ liệu học
            của bạn: lịch ôn ngắt quãng, đường cong quên, thí nghiệm có đối chứng và phân tích
            nhịp ngày đêm.
          </p>

          <div className="landing-cta">
            <button type="button" className="btn btn-primary btn-lg" onClick={onSignUp}>
              Tạo tài khoản miễn phí <ArrowRight size={17} />
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={onGuest}>
              Dùng thử ngay, không cần tài khoản
            </button>
          </div>

          <p className="landing-fineprint">
            Không theo dõi, không quảng cáo, không bán dữ liệu. Dữ liệu học của bạn thuộc về bạn
            và xuất ra JSON được bất cứ lúc nào.
          </p>
        </div>

        <div className="landing-hero-figure">
          <RetentionPlot />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Method                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-section" id="phuong-phap">
        <div className="landing-section-head">
          <h2>Bốn công cụ, bốn mô hình có nguồn</h2>
          <p>
            Mỗi tính năng khoa học trong Blooom đều gắn với một mô hình cụ thể và một công thức
            được đánh giá thật trong mã nguồn — không phải một thanh tiến độ tô màu.
          </p>
        </div>

        <div className="instrument-grid">
          {INSTRUMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <article className="instrument" key={item.id}>
                <div className="instrument-top">
                  <span className="instrument-icon">
                    <Icon size={17} />
                  </span>
                  <span className="tag mono">{item.tag}</span>
                </div>
                <h3>{item.title}</h3>
                <code className="instrument-formula mono">{item.formula}</code>
                <p>{item.body}</p>
                <span className="instrument-source mono">{item.source}</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Existing workspace                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-section" id="khong-gian">
        <div className="landing-section-head">
          <h2>Vẫn là không gian học bạn cần mỗi ngày</h2>
          <p>
            Phần khoa học không thay thế phần học. Mọi tính năng sẵn có vẫn nguyên vẹn và chính
            chúng tạo ra dữ liệu cho các mô hình phía trên.
          </p>
        </div>

        <ul className="workspace-list">
          {WORKSPACE.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Icon size={16} aria-hidden="true" />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.note}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Ba bước, một vòng lặp</h2>
        </div>

        <ol className="step-list">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className="step-n mono">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Data & honesty                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-section landing-data" id="du-lieu">
        <div className="landing-section-head">
          <h2>Dữ liệu của bạn ở đâu, và mô hình không hứa điều gì</h2>
        </div>

        <div className="disclosure-grid">
          <article className="disclosure">
            <span className="disclosure-icon">
              <Database size={16} />
            </span>
            <h3>PostgreSQL, và chỉ bạn đọc được</h3>
            <p>
              Phiên học, ghi chú, thẻ ghi nhớ và thí nghiệm nằm trong một cơ sở dữ liệu quan hệ
              có ràng buộc toàn vẹn. Mỗi hàng gắn với đúng một tài khoản, cưỡng chế bằng Row
              Level Security ở tầng cơ sở dữ liệu chứ không phải ở giao diện.
            </p>
          </article>

          <article className="disclosure">
            <span className="disclosure-icon">
              <ShieldCheck size={16} />
            </span>
            <h3>Dữ liệu là của bạn, mang đi được</h3>
            <p>
              Mật khẩu băm bằng bcrypt phía máy chủ, ứng dụng không bao giờ đọc được. Toàn bộ dữ
              liệu thô — kể cả từng lần chấm thẻ và từng phiên thí nghiệm — xuất ra JSON bằng
              một cú bấm, để bất kỳ ai cũng kiểm chứng lại được kết quả phân tích.
            </p>
          </article>

          <article className="disclosure">
            <span className="disclosure-icon">
              <FlaskConical size={16} />
            </span>
            <h3>Giới hạn được nói rõ</h3>
            <p>
              Thí nghiệm N-of-1 không làm mù đôi và không có giai đoạn rửa trôi, nên không loại
              trừ được hiệu ứng thứ tự hay kỳ vọng. Mỗi kết luận trong ứng dụng đều kèm cảnh báo
              này.
            </p>
          </article>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-close">
        <h2>Bắt đầu bằng một phiên học 25 phút</h2>
        <p>
          Không cần thiết lập gì. Dữ liệu đầu tiên xuất hiện ngay khi bạn bấm nút chạy lần đầu.
        </p>
        <div className="landing-cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={onSignUp}>
            Tạo tài khoản <ArrowRight size={17} />
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onGuest}>
            Vào thẳng ứng dụng
          </button>
        </div>
      </section>
    </main>

    <footer className="landing-footer">
      <div>
        <img className="landing-footer-logo" src={BRAND_LOGO} alt="Blooom" />
        <p>Nền tảng nhóm học tập tương tác cho học sinh &amp; sinh viên.</p>
      </div>
      <div className="landing-footer-meta mono">
        <span>React + Vite · CSS thuần · PostgreSQL</span>
        <span>Đồ án học tập · giấy phép MIT</span>
      </div>
    </footer>
  </div>
);
