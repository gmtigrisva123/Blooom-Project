import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { authService } from '../../services/auth';
import { setPrefs } from '../../services/storage';
import { hrefFor, onLinkClick } from '../../lib/router';
import { setIntent } from '../../lib/intent';
import { SUBJECTS } from '../../lib/subjects';
import { useToast } from '../../context/ToastContext';
import { Logo, ThemeToggle } from '../ui/bits';
import { Sheet } from '../ui/Paper';
import { HeroDemo } from './HeroDemo';
import { MemoryChart } from './MemoryChart';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const SHOTS = `${import.meta.env.BASE_URL}shots/`;
const YEAR = new Date().getFullYear();

const SCREENS = [
  {
    id: 'tap-trung',
    tab: 'Tập trung',
    text: 'Chọn môn, bấm bắt đầu, cất điện thoại. Hết giờ, Blooom nhắc bạn nghỉ.',
    alt: 'Màn hình Tập trung của Blooom với đồng hồ đang đếm 25 phút môn Toán'
  },
  {
    id: 'the-nho',
    tab: 'Thẻ nhớ',
    text: 'Mỗi thẻ quay lại đúng lúc bạn sắp quên. Thẻ khó về sớm, thẻ dễ về muộn.',
    alt: 'Màn hình Thẻ nhớ của Blooom với danh sách thẻ và lịch ôn hai tuần tới'
  },
  {
    id: 'tien-do',
    tab: 'Tiến độ',
    text: 'Mục tiêu tuần, chuỗi ngày học và khung giờ bạn học tốt nhất.',
    alt: 'Màn hình Tiến độ của Blooom với mục tiêu tuần và biểu đồ thời gian học'
  },
  {
    id: 'nhom-hoc',
    tab: 'Nhóm học',
    text: 'Tìm nhóm theo môn, hoặc lập nhóm riêng với bạn bè.',
    alt: 'Màn hình Nhóm học của Blooom với các nhóm xếp theo môn'
  }
];

const NEEDS = [
  {
    title: 'Điện thoại, máy tính bảng, máy tính',
    text: 'Đăng nhập cùng tài khoản là dữ liệu có ở mọi máy.'
  },
  { title: 'Không cần cài đặt', text: 'Blooom chạy ngay trong trình duyệt bạn đang dùng.' },
  {
    title: 'Dữ liệu là của bạn',
    text: 'Chỉ mình bạn xem được, và tải về máy được bất cứ lúc nào.'
  }
];

/* ==========================================================================
   LANDING · one screen to understand Blooom, one press to be inside it.
   ========================================================================== */
export const Landing = ({ onAuthenticated, theme, onToggleTheme }) => {
  const showToast = useToast();
  const root = useRef(null);

  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState(SCREENS[0].id);
  const [subject, setSubject] = useState(SUBJECTS[0].value);
  const [navHidden, setNavHidden] = useState(false);

  /* The bar steps out of the way on the way down and returns on the way up. */
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const now = window.scrollY;
      setNavHidden(now > last && now > 160);
      last = now;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Two authored moments and no others: the hero arrives once, and the chart
     draws itself when it is reached. Everything is visible without them, and
     both are skipped when the visitor asks for less motion. */
  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'expo.out', duration: 0.9 } })
          .from('[data-enter="text"] > *', { y: 28, autoAlpha: 0, stagger: 0.08 })
          .from('[data-enter="sheet"]', { y: 48, rotation: -3, autoAlpha: 0 }, 0.15)
          .from('.hero-mat', { rotation: 6, autoAlpha: 0 }, 0.1)
          .from(
            '[data-enter="sticker"]',
            { scale: 0.7, rotation: 30, autoAlpha: 0, ease: 'back.out(2)', duration: 0.6 },
            0.7
          );

        gsap.from('.mc-reveal', {
          attr: { width: 0 },
          duration: 1.8,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: '.memory-chart', start: 'top 70%', once: true }
        });
      });

      return () => media.revert();
    },
    { scope: root }
  );

  const enter = async (afterwards) => {
    if (busy) return;
    setBusy(true);
    try {
      const account = await authService.loginAsGuest();
      afterwards?.();
      onAuthenticated(account);
    } catch (error) {
      showToast(error.message || 'Chưa vào được chế độ dùng thử.', 'error');
      setBusy(false);
    }
  };

  /* The closing control is the real thing: the subject picked here is the
     subject the first session starts with. */
  const startFirstSession = () =>
    enter(() => {
      setPrefs({ subject });
      setIntent('start-focus');
    });

  const active = SCREENS.find((item) => item.id === screen);

  return (
    <div className="landing" ref={root}>
      <header className={`lp-nav ${navHidden ? 'is-away' : ''}`}>
        <div className="container lp-nav-row">
          <a href={hrefFor('')} onClick={onLinkClick('')} aria-label="Blooom, về đầu trang">
            <Logo height={40} />
          </a>
          <nav className="lp-nav-links" aria-label="Mục lục trang">
            <a href="#vi-sao">Vì sao nhớ lâu</a>
            <a href="#ben-trong">Bên trong Blooom</a>
          </nav>
          <div className="lp-nav-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <a
              className="btn btn-sm btn-ghost"
              href={hrefFor('dang-nhap')}
              onClick={onLinkClick('dang-nhap')}
            >
              Đăng nhập
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ---- Hero · Stage: the words on five columns, the product on seven */}
        <section className="lp-hero">
          <div className="container lp-hero-grid">
            <div className="lp-hero-text" data-enter="text">
              <h1>
                Học tập trung hơn,
                <br />
                nhớ lâu hơn.
              </h1>
              <p className="lead">Đồng hồ tập trung và thẻ nhớ cho học sinh, sinh viên.</p>
              <div className="lp-actions">
                <button
                  type="button"
                  className="btn btn-lg btn-primary"
                  onClick={() => enter()}
                  disabled={busy}
                >
                  {busy ? 'Đang mở' : 'Dùng thử ngay'}
                </button>
                <a
                  className="btn btn-lg"
                  href={hrefFor('dang-ky')}
                  onClick={onLinkClick('dang-ky')}
                >
                  Tạo tài khoản
                </a>
              </div>
              <p className="small muted">Không cần tài khoản để thử.</p>
            </div>

            <HeroDemo />
          </div>
        </section>

        {/* ---- Before and after ------------------------------------------- */}
        <section className="lp-section" id="vi-sao">
          <div className="container lp-why">
            <div className="lp-head">
              <h2>Nhồi một lần thì mau quên. Ôn đúng lúc thì nhớ lâu.</h2>
              <p className="lead">
                Mỗi lần ôn lại đúng lúc sắp quên, bạn nhớ được lâu hơn lần trước. Blooom tính
                sẵn thời điểm đó cho từng thẻ.
              </p>
            </div>
            <MemoryChart />
          </div>
        </section>

        {/* ---- The product, one named screen at a time -------------------- */}
        <section className="lp-section" id="ben-trong">
          <div className="container lp-screens">
            <div className="lp-head">
              <h2>Bốn màn hình cho một buổi học.</h2>
              <div className="segmented" role="tablist" aria-label="Chọn màn hình">
                {SCREENS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={item.id === screen}
                    aria-controls="screen-panel"
                    className={item.id === screen ? 'is-active' : ''}
                    onClick={() => setScreen(item.id)}
                  >
                    {item.tab}
                  </button>
                ))}
              </div>
              <p className="lead">{active.text}</p>
            </div>

            <figure
              className="lp-shot"
              id="screen-panel"
              role="tabpanel"
              aria-labelledby={`tab-${active.id}`}
              data-slot="product-screen"
            >
              <img
                key={`${active.id}-${theme}`}
                src={`${SHOTS}${active.id}-${theme}.webp`}
                alt={active.alt}
                width="1920"
                height="1200"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        {/* ---- What it needs: one pear field ------------------------------ */}
        <section className="lp-section lp-field">
          <div className="container lp-needs">
            <h2>Mở trình duyệt là học được.</h2>
            <ul>
              {NEEDS.map((item) => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- Close on the job itself: start a session ------------------- */}
        <section className="lp-close">
          <Sheet
            seed={23}
            edge="top"
            depth={14}
            color="var(--color-night)"
            className="lp-close-sheet"
          >
            <div className="container lp-close-grid">
              <div className="lp-close-text">
                <h2>Bắt đầu phiên đầu tiên.</h2>
                <p id="pickSubject">Hôm nay bạn học môn gì?</p>
                <div className="chips" role="group" aria-labelledby="pickSubject">
                  {SUBJECTS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`chip ${item.value === subject ? 'is-active' : ''}`}
                      aria-pressed={item.value === subject}
                      onClick={() => setSubject(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="lp-actions">
                  <button
                    type="button"
                    className="btn btn-lg btn-primary"
                    onClick={startFirstSession}
                    disabled={busy}
                  >
                    {busy ? 'Đang mở' : 'Bắt đầu học'}
                  </button>
                </div>
              </div>

              <div className="card lp-ready">
                <span className="tag">
                  <span
                    className="tag-dot"
                    style={{ '--dot': SUBJECTS.find((s) => s.value === subject).color }}
                  />
                  {SUBJECTS.find((s) => s.value === subject).label}
                </span>
                <p className="lp-ready-time num">25:00</p>
                <p className="muted">Học 25 phút, rồi nghỉ 5 phút.</p>
              </div>
            </div>
          </Sheet>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="container lp-footer-grid">
          <Logo height={88} />
          <p className="lp-footer-line">Học đều mỗi ngày, rồi sẽ đến lúc nở hoa.</p>
          <nav aria-label="Liên kết cuối trang">
            <a href={hrefFor('dang-nhap')} onClick={onLinkClick('dang-nhap')}>
              Đăng nhập
            </a>
            <a href={hrefFor('dang-ky')} onClick={onLinkClick('dang-ky')}>
              Tạo tài khoản
            </a>
            <span className="muted">© {YEAR} Blooom</span>
          </nav>
        </div>
      </footer>
    </div>
  );
};
