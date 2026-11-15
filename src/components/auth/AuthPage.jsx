import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, TriangleAlert, UserRound } from 'lucide-react';
import {
  authService,
  passwordIssues,
  passwordStrength,
  validateEmail,
  PASSWORD_MIN_LENGTH
} from '../../services/auth';
import { hrefFor, navigate, onLinkClick } from '../../lib/router';
import { Logo, ThemeToggle } from '../ui/bits';
import { Sheet } from '../ui/Paper';
import { EmailSent } from './EmailSent';

const SIDE_POINTS = [
  'Đồng hồ tập trung chạy xuyên suốt, không lo mất giờ',
  'Thẻ nhớ tự nhắc bạn ôn đúng lúc',
  'Dữ liệu theo bạn trên mọi thiết bị'
];

/* ==========================================================================
   AUTH — sign in and sign up share one screen, so they can never drift apart
   in what they ask for or what they promise.
   ========================================================================== */
export const AuthPage = ({ mode, onAuthenticated, theme, onToggleTheme }) => {
  const isSignup = mode === 'signup';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* The address a confirmation email went to, or null. Once set, the form
     gives way to "check your inbox" — there is nothing left to do on it. */
  const [pendingEmail, setPendingEmail] = useState(null);

  const strength = passwordStrength(password);
  const issues = passwordIssues(password);

  const nameBad = isSignup && touched.name && name.trim().length < 2;
  const emailBad = touched.email && !validateEmail(email);
  const passwordBad = isSignup && touched.password && issues.length > 0;

  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  /* Changing mode keeps the email (usually the same) but never the password,
     so a mistyped sign-up password cannot leak into a sign-in attempt. */
  const switchMode = (next) => {
    setPassword('');
    setError('');
    setTouched({});
    navigate(next === 'signup' ? 'dang-ky' : 'dang-nhap', { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setTouched({ name: true, email: true, password: true });

    if (!validateEmail(email)) return;
    if (isSignup && (name.trim().length < 2 || issues.length > 0)) return;
    if (!password) return;

    setBusy(true);
    try {
      if (!isSignup) {
        onAuthenticated(await authService.login({ email, password }));
        return;
      }

      const result = await authService.register({ name, email, password });

      /* The account exists but needs its email confirmed first. That is a
         success, so it gets its own screen rather than the red error box. */
      if (result.status === 'confirmation_required') {
        setPassword('');
        setPendingEmail(result.email);
        setBusy(false);
        return;
      }

      onAuthenticated(result.account);
    } catch (problem) {
      setError(problem.message || 'Có lỗi xảy ra. Bạn thử lại nhé.');
      setBusy(false);
    }
  };

  const tryAsGuest = async () => {
    setError('');
    setBusy(true);
    try {
      onAuthenticated(await authService.loginAsGuest());
    } catch (problem) {
      setError(problem.message || 'Chưa vào được chế độ dùng thử.');
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <main className="auth-main">
        <div className="auth-top">
          <a className="btn btn-ghost btn-sm" href={hrefFor('')} onClick={onLinkClick('')}>
            Về trang chủ
          </a>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        <div className="auth-box">
          <Logo height={46} />

          {pendingEmail ? (
            <EmailSent
              email={pendingEmail}
              onBackToSignIn={() => {
                setPendingEmail(null);
                switchMode('login');
              }}
              onChangeEmail={() => {
                setPendingEmail(null);
                setEmail('');
                switchMode('signup');
              }}
            />
          ) : (
            <>
              <div>
                <h1>{isSignup ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h1>
                <p className="muted">
                  {isSignup
                    ? 'Miễn phí. Chỉ mất nửa phút.'
                    : 'Đăng nhập để học tiếp phần đang dở.'}
                </p>
              </div>

              <div
                className="segmented auth-switch"
                role="tablist"
                aria-label="Chọn việc cần làm"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isSignup}
                  className={!isSignup ? 'is-active' : ''}
                  onClick={() => switchMode('login')}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSignup}
                  className={isSignup ? 'is-active' : ''}
                  onClick={() => switchMode('signup')}
                >
                  Tạo tài khoản
                </button>
              </div>

              <form className="stack" onSubmit={submit} noValidate>
                {error && (
                  <div className="notice notice-error" role="alert">
                    <TriangleAlert size={17} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                {isSignup && (
                  <div className="field">
                    <label htmlFor="authName">Tên của bạn</label>
                    <div className="input-icon">
                      <UserRound size={18} aria-hidden="true" />
                      <input
                        id="authName"
                        className="input"
                        type="text"
                        autoComplete="name"
                        placeholder="Nguyễn Minh An"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={() => touch('name')}
                        aria-invalid={nameBad || undefined}
                      />
                    </div>
                    {nameBad && <span className="field-error">Tên cần ít nhất 2 ký tự.</span>}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="authEmail">Email</label>
                  <div className="input-icon">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="authEmail"
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete={isSignup ? 'email' : 'username'}
                      placeholder="ban@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => touch('email')}
                      aria-invalid={emailBad || undefined}
                    />
                  </div>
                  {emailBad && <span className="field-error">Email chưa đúng.</span>}
                </div>

                <div className="field">
                  <label htmlFor="authPassword">Mật khẩu</label>
                  <div className="input-icon">
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="authPassword"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      placeholder={isSignup ? `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự` : ''}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onBlur={() => touch('password')}
                      aria-invalid={passwordBad || undefined}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {isSignup && (
                    <div className="pw-meter">
                      <div className={`pw-bars pw-${strength.score}`} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <span className={passwordBad ? 'field-error' : 'field-hint'}>
                        {password
                          ? issues.length > 0
                            ? `Còn thiếu: ${issues.join(', ').toLowerCase()}`
                            : `Mật khẩu ${strength.label.toLowerCase()}`
                          : `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, có cả chữ và số`}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Chờ một chút…
                    </>
                  ) : (
                    <>{isSignup ? 'Tạo tài khoản' : 'Đăng nhập'}</>
                  )}
                </button>
              </form>

              <div className="auth-or">
                <span>hoặc</span>
              </div>

              <button
                type="button"
                className="btn btn-block"
                onClick={tryAsGuest}
                disabled={busy}
              >
                Dùng thử không cần tài khoản
              </button>

              <p className="auth-note">
                Mật khẩu được mã hóa. Chỉ mình bạn xem được dữ liệu học của mình.
              </p>
            </>
          )}
        </div>
      </main>

      <Sheet seed={57} depth={12} color="var(--color-accent)" className="auth-side">
        <p className="auth-side-quote">Học đều mỗi ngày, rồi sẽ đến lúc nở hoa.</p>
        <ul>
          {SIDE_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
};
