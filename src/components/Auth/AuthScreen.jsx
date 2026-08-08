import { useCallback, useEffect, useRef, useState } from 'react';
import {
  authService,
  passwordIssues,
  passwordStrength,
  validateEmail,
  PASSWORD_MIN_LENGTH
} from '../../services/auth';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserRound,
  ShieldCheck,
  TriangleAlert,
  Sun,
  Moon,
  Layers,
  FlaskConical,
  Waves,
  Database
} from 'lucide-react';

const BRAND_LOGO = `${import.meta.env.BASE_URL}blooom-logo.png`;

const ASIDE_POINTS = [
  { icon: Layers, text: 'Lịch ôn tập ngắt quãng SM-2 cho từng thẻ ghi nhớ' },
  { icon: FlaskConical, text: 'Thí nghiệm N-of-1 ngẫu nhiên hóa với kiểm định Welch' },
  { icon: Waves, text: 'Phân tích cosinor tìm khung giờ tập trung của riêng bạn' },
  { icon: Database, text: 'Dữ liệu đồng bộ qua mọi thiết bị, xuất ra JSON bất cứ lúc nào' }
];

/* ==========================================================================
   AUTH SCREEN
   One component, two modes. Sign-up and sign-in share the layout, the error
   surface and the local-account disclosure, so the two screens can never
   drift apart in what they promise.
   ========================================================================== */
export const AuthScreen = ({
  mode,
  onModeChange,
  onAuthenticated,
  onBack,
  theme,
  onToggleTheme
}) => {
  const isSignup = mode === 'signup';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(password);
  const pwIssues = passwordIssues(password);

  const emailInvalid = touched.email && email.length > 0 && !validateEmail(email);
  const nameInvalid =
    touched.name && isSignup && name.trim().length > 0 && name.trim().length < 2;
  const passwordInvalid =
    touched.password && isSignup && password.length > 0 && pwIssues.length > 0;

  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  /* Switching mode keeps the email (usually the same) but never the password,
     so a mistyped sign-up password can't leak into a sign-in attempt. */
  const switchMode = (next) => {
    setPassword('');
    setFormError('');
    setTouched({});
    onModeChange(next);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    setTouched({ name: true, email: true, password: true });

    setBusy(true);
    try {
      const account = isSignup
        ? await authService.register({ name, email, password })
        : await authService.login({ email, password });

      onAuthenticated(account);
    } catch (error) {
      setFormError(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  /* Chế độ khách tạo một tài khoản ẩn danh thật trong Supabase, nên dữ liệu
     dùng thử vẫn nằm trong cùng cơ sở dữ liệu và chịu cùng chính sách bảo mật
     — và sau này gắn email vào là thành tài khoản đầy đủ, không mất gì. */
  const enterAsGuest = useCallback(async () => {
    setFormError('');
    setBusy(true);
    try {
      onAuthenticated(await authService.loginAsGuest());
    } catch (error) {
      setFormError(error.message || 'Không vào được chế độ dùng thử.');
      setBusy(false);
    }
  }, [onAuthenticated]);

  /* Nút "Dùng thử ngay" ở trang giới thiệu mở màn hình này với mode='guest'
     và đăng nhập luôn, nên người dùng vẫn chỉ mất một cú bấm. Nếu chế độ ẩn
     danh chưa được bật trong Supabase thì họ dừng lại ở đây với thông báo
     nói rõ cần bật gì, thay vì một màn hình trắng. */
  const guestAttempted = useRef(false);

  useEffect(() => {
    if (mode !== 'guest' || guestAttempted.current) return;
    guestAttempted.current = true;
    enterAsGuest();
  }, [mode, enterAsGuest]);

  return (
    <div className="auth">
      <div className="auth-panel">
        <div className="auth-panel-head">
          <button type="button" className="link-btn" onClick={onBack}>
            <ArrowLeft size={15} /> Về trang giới thiệu
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label="Đổi giao diện sáng/tối"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <img className="auth-logo" src={BRAND_LOGO} alt="Blooom" width="459" height="152" />

        <h1 className="auth-title">
          {isSignup ? 'Tạo hồ sơ học tập của bạn' : 'Đăng nhập vào Blooom'}
        </h1>
        <p className="auth-sub">
          {isSignup
            ? 'Hồ sơ học tập của bạn được lưu an toàn trên máy chủ, truy cập được từ mọi thiết bị.'
            : 'Đăng nhập để tiếp tục với dữ liệu học tập đã lưu của bạn.'}
        </p>

        <div className="auth-switch" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={`auth-switch-btn ${!isSignup ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={`auth-switch-btn ${isSignup ? 'is-active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {formError && (
            <div className="auth-error" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {isSignup && (
            <div className="field">
              <label htmlFor="authName">Họ và tên</label>
              <div className="input-wrap">
                <UserRound size={15} aria-hidden="true" />
                <input
                  id="authName"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn An"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched('name')}
                  aria-invalid={nameInvalid || undefined}
                  aria-describedby={nameInvalid ? 'authNameError' : undefined}
                  required
                />
              </div>
              {nameInvalid && (
                <span className="field-error" id="authNameError">
                  Họ tên cần ít nhất 2 ký tự.
                </span>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="authEmail">Email</label>
            <div className="input-wrap">
              <Mail size={15} aria-hidden="true" />
              <input
                id="authEmail"
                type="email"
                autoComplete={isSignup ? 'email' : 'username'}
                placeholder="ten@truong.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')}
                aria-invalid={emailInvalid || undefined}
                aria-describedby={emailInvalid ? 'authEmailError' : undefined}
                required
              />
            </div>
            {emailInvalid && (
              <span className="field-error" id="authEmailError">
                Địa chỉ email chưa đúng định dạng.
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="authPassword">Mật khẩu</label>
            <div className="input-wrap">
              <Lock size={15} aria-hidden="true" />
              <input
                id="authPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự` : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                aria-invalid={passwordInvalid || undefined}
                aria-describedby={isSignup ? 'authPasswordHint' : undefined}
                required
              />
              <button
                type="button"
                className="input-affix"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {isSignup && (
              <div className="pw-meter" id="authPasswordHint">
                <div className="pw-track" aria-hidden="true">
                  <div
                    className={`pw-fill pw-fill-${strength.score}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                <div className="pw-legend">
                  <span className="t-xs t-dim">
                    Cần: {PASSWORD_MIN_LENGTH}+ ký tự, có chữ và số
                  </span>
                  <span className={`t-xs pw-label pw-label-${strength.score}`}>
                    {strength.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {isSignup ? 'Đang tạo hồ sơ…' : 'Đang kiểm tra…'}
              </>
            ) : (
              <>
                {isSignup ? 'Tạo tài khoản' : 'Đăng nhập'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={enterAsGuest}
          disabled={busy}
        >
          Dùng thử không cần tài khoản
        </button>

        <p className="auth-note">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>
            Mật khẩu được gửi qua kết nối mã hóa TLS và băm bằng bcrypt trên máy chủ Supabase —
            ứng dụng không bao giờ đọc được mật khẩu của bạn. Mỗi hàng dữ liệu chỉ chính chủ tài
            khoản truy cập được, cưỡng chế bằng Row Level Security ở tầng cơ sở dữ liệu.{' '}
            <b>Dù vậy, đừng dùng lại mật khẩu của email hay ngân hàng.</b>
          </span>
        </p>
      </div>

      <aside className="auth-aside" aria-hidden="true">
        <div className="auth-aside-inner">
          <span className="tag-line mono">Bên trong phòng thí nghiệm</span>
          <p className="auth-aside-lede">
            Blooom biến từng phiên Pomodoro thành một quan sát có thể phân tích được.
          </p>
          <ul>
            {ASIDE_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.text}>
                  <Icon size={15} />
                  <span>{point.text}</span>
                </li>
              );
            })}
          </ul>
          <code className="auth-aside-eq mono">R(t) = e^(−t/S)</code>
        </div>
      </aside>
    </div>
  );
};
