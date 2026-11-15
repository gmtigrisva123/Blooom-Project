import { useState } from 'react';
import {
  ArrowRight,
  Check,
  FlaskConical,
  FolderOpen,
  Layers,
  Timer,
  TrendingUp,
  Users
} from 'lucide-react';
import { authService } from '../../services/auth';
import { hrefFor, onLinkClick } from '../../lib/router';
import { useToast } from '../../context/ToastContext';
import { Logo, ThemeToggle } from '../ui/bits';
import { Arrow, Loops, Squiggle } from '../ui/Doodles';
import { DemoDesk } from './DemoDesk';
import { MemoryChart } from './MemoryChart';

const FEATURES = [
  {
    icon: Timer,
    tone: 'orange',
    title: 'Tập trung',
    text: 'Chọn môn, bấm bắt đầu, cất điện thoại. Hết giờ Blooom nhắc bạn nghỉ.',
    wide: true,
    steps: ['25 phút', '50 phút', '90 phút', 'Tự chọn']
  },
  {
    icon: Layers,
    tone: 'violet',
    title: 'Thẻ nhớ',
    text: 'Blooom nhắc bạn ôn ngay trước lúc quên, nên ôn ít lần mà nhớ rất lâu.',
    wide: true,
    steps: ['Ngày mai', '6 ngày', '2 tuần', '1 tháng'],
    chained: true
  },
  {
    icon: Users,
    tone: 'pink',
    title: 'Nhóm học',
    text: 'Tìm nhóm theo môn, hoặc lập nhóm riêng với bạn bè.'
  },
  {
    icon: FolderOpen,
    tone: 'green',
    title: 'Tài liệu',
    text: 'Ảnh chụp vở và tệp PDF, cất gọn theo từng môn.'
  },
  {
    icon: TrendingUp,
    tone: 'orange',
    title: 'Tiến độ',
    text: 'Chuỗi ngày học, mục tiêu tuần và khung giờ bạn học tốt nhất.'
  },
  {
    icon: FlaskConical,
    tone: 'violet',
    title: 'Thử nghiệm',
    text: 'Nghe nhạc hay im lặng? Thử cả hai để biết cách nào hợp với bạn.'
  }
];

const FAQ = [
  {
    q: 'Blooom có mất phí không?',
    a: 'Không. Mọi tính năng đều miễn phí và không có quảng cáo.'
  },
  {
    q: 'Dùng thử có cần tài khoản không?',
    a: 'Không. Bấm “Dùng thử ngay” là vào học được. Khi muốn giữ dữ liệu lâu dài, bạn tạo tài khoản và mọi thứ đã làm vẫn còn nguyên.'
  },
  {
    q: 'Dữ liệu của tôi có an toàn không?',
    a: 'Chỉ mình bạn xem được dữ liệu học của mình. Bạn có thể tải toàn bộ về máy bất cứ lúc nào.'
  },
  {
    q: 'Dùng trên điện thoại được không?',
    a: 'Được. Blooom chạy ngay trên trình duyệt của điện thoại, máy tính bảng và máy tính. Đăng nhập cùng một tài khoản là dữ liệu có ở mọi máy.'
  },
  {
    q: 'Thẻ nhớ khác gì tự ôn bình thường?',
    a: 'Sau mỗi thẻ, bạn cho Blooom biết mình nhớ dễ hay khó. Thẻ khó quay lại sớm, thẻ dễ quay lại muộn — bạn không phải ôn lại cả chồng mỗi ngày.'
  }
];

const YEAR = new Date().getFullYear();

const TryButton = ({ className = '', busy, onClick }) => (
  <button type="button" className={`btn ${className}`} onClick={onClick} disabled={busy}>
    {busy ? (
      <>
        <span className="spinner" aria-hidden="true" /> Đang mở…
      </>
    ) : (
      <>
        Dùng thử ngay <ArrowRight size={18} aria-hidden="true" />
      </>
    )}
  </button>
);

/* ==========================================================================
   LANDING — one screen to understand Blooom, one click to be inside it.
   ========================================================================== */
export const Landing = ({ onAuthenticated, theme, onToggleTheme }) => {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);

  /* "Try it" signs the visitor in as a guest and drops them straight into
     the app — no form in between. If guest mode is switched off on the
     server, they are told so in plain words and offered sign-up instead. */
  const tryNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      onAuthenticated(await authService.loginAsGuest());
    } catch (error) {
      showToast(error.message || 'Chưa vào được chế độ dùng thử.', 'error');
      setBusy(false);
    }
  };

  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <a href={hrefFor('')} onClick={onLinkClick('')} aria-label="Blooom — trang chủ">
            <Logo height={40} />
          </a>

          <nav className="lp-nav-links" aria-label="Mục lục trang">
            <a href="#tinh-nang">Tính năng</a>
            <a href="#vi-sao">Vì sao hiệu quả</a>
            <a href="#hoi-dap">Hỏi đáp</a>
          </nav>

          <div className="lp-nav-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <a
              className="btn btn-ghost btn-sm"
              href={hrefFor('dang-nhap')}
              onClick={onLinkClick('dang-nhap')}
            >
              Đăng nhập
            </a>
            <TryButton className="btn-ink btn-sm lp-nav-cta" busy={busy} onClick={tryNow} />
          </div>
        </div>
      </header>

      <main>
        {/* ---- Hero ------------------------------------------------------ */}
        <section className="lp-wrap lp-hero">
          <div className="lp-hero-copy">
            <h1>
              Học tập trung hơn,
              <br />
              nhớ{' '}
              <span className="underlined">
                lâu hơn
                <Squiggle className="doodle-draw" style={{ '--len': 420 }} />
              </span>
              .
            </h1>
            <p className="lp-lede">
              Đồng hồ tập trung, thẻ nhớ tự nhắc ôn và nhóm học cùng bạn bè — gọn trong một nơi.
            </p>

            <div className="lp-cta">
              <TryButton className="btn-primary btn-lg" busy={busy} onClick={tryNow} />
              <a
                className="btn btn-outline btn-lg"
                href={hrefFor('dang-ky')}
                onClick={onLinkClick('dang-ky')}
              >
                Tạo tài khoản
              </a>
            </div>

            <ul className="lp-proof">
              <li>
                <Check size={16} aria-hidden="true" /> Miễn phí
              </li>
              <li>
                <Check size={16} aria-hidden="true" /> Không cần đăng ký để thử
              </li>
              <li>
                <Check size={16} aria-hidden="true" /> Không quảng cáo
              </li>
            </ul>
          </div>

          <div className="lp-hero-demo">
            <div className="lp-demo-note" aria-hidden="true">
              <span>Bấm thử xem!</span>
              <Arrow />
            </div>
            <DemoDesk />
          </div>
        </section>

        {/* ---- Features --------------------------------------------------- */}
        <section className="lp-wrap lp-section" id="tinh-nang">
          <div className="lp-section-head">
            <h2>Mọi thứ để học, gọn trong một nơi</h2>
            <p>Không cần mở năm ứng dụng cho một buổi học.</p>
          </div>

          <ul className="lp-features">
            {FEATURES.map(({ icon: Icon, tone, title, text, wide, steps, chained }) => (
              <li key={title} className={`lp-feature ${wide ? 'is-wide' : ''}`}>
                <span className={`lp-feature-icon tone-${tone}`} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                {steps && (
                  <div className={`lp-steps ${chained ? 'is-chained' : ''}`} aria-hidden="true">
                    {steps.map((step) => (
                      <span key={step}>{step}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Why it works ----------------------------------------------- */}
        <section className="lp-wrap lp-section lp-why" id="vi-sao">
          <div className="lp-why-copy">
            <h2>Nhồi một lần thì mau quên. Ôn đúng lúc thì nhớ lâu.</h2>
            <p>
              Trí nhớ phai dần theo thời gian. Mỗi lần ôn lại đúng lúc sắp quên, bạn nhớ được
              lâu hơn lần trước.
            </p>
            <p>Blooom tính sẵn thời điểm đó cho từng thẻ — bạn chỉ việc mở ra và ôn.</p>
          </div>
          <MemoryChart />
        </section>

        {/* ---- FAQ -------------------------------------------------------- */}
        <section className="lp-wrap lp-section lp-faq" id="hoi-dap">
          <div className="lp-section-head">
            <h2>Hỏi nhanh, đáp gọn</h2>
            <p>Những điều mọi người hay hỏi trước khi bắt đầu.</p>
          </div>

          <div className="lp-faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="lp-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---- Closing call ------------------------------------------------ */}
        <section className="lp-wrap lp-section">
          <div className="lp-final">
            <Loops className="lp-final-doodle" />
            <h2>Buổi học tới của bạn bắt đầu từ đây.</h2>
            <p>Vào học ngay bây giờ. Tạo tài khoản sau cũng được.</p>
            <div className="lp-cta">
              <TryButton className="btn-ink btn-lg" busy={busy} onClick={tryNow} />
              <a
                className="btn btn-outline btn-lg"
                href={hrefFor('dang-ky')}
                onClick={onLinkClick('dang-ky')}
              >
                Tạo tài khoản
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-wrap lp-footer">
        <Logo height={28} />
        <nav aria-label="Liên kết cuối trang">
          <a href="#tinh-nang">Tính năng</a>
          <a href="#vi-sao">Vì sao hiệu quả</a>
          <a href="#hoi-dap">Hỏi đáp</a>
          <a href={hrefFor('dang-nhap')} onClick={onLinkClick('dang-nhap')}>
            Đăng nhập
          </a>
        </nav>
        <span className="faint">© {YEAR} Blooom</span>
      </footer>
    </div>
  );
};
