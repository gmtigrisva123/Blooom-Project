import { useEffect, useState } from 'react';
import { ExternalLink, MailCheck, RefreshCw } from 'lucide-react';
import { authService } from '../../services/auth';

/* Opens the inbox of a few common providers. Only the inbox home page — the
   address is never put in a URL. */
const WEBMAIL = {
  'gmail.com': { label: 'Gmail', url: 'https://mail.google.com' },
  'googlemail.com': { label: 'Gmail', url: 'https://mail.google.com' },
  'outlook.com': { label: 'Outlook', url: 'https://outlook.live.com' },
  'hotmail.com': { label: 'Outlook', url: 'https://outlook.live.com' },
  'live.com': { label: 'Outlook', url: 'https://outlook.live.com' },
  'yahoo.com': { label: 'Yahoo Mail', url: 'https://mail.yahoo.com' },
  'icloud.com': { label: 'iCloud Mail', url: 'https://www.icloud.com/mail' }
};

/* The mail server refuses to resend too often; counting down on screen beats
   letting someone tap repeatedly into an error. */
const COOLDOWN = 60;

/* ==========================================================================
   EMAIL SENT — the account exists; it just needs its link clicked. This is a
   success, and it answers the three things a dead end leaves open: where the
   email went, what to do next, and how to get out if it never arrives.
   ========================================================================== */
export const EmailSent = ({ email, onBackToSignIn, onChangeEmail }) => {
  const [cooldown, setCooldown] = useState(COOLDOWN);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await authService.resendConfirmation(email);
      setNotice({ ok: true, text: 'Đã gửi lại thư.' });
      setCooldown(COOLDOWN);
    } catch (problem) {
      setNotice({ ok: false, text: problem.message || 'Chưa gửi lại được thư.' });
    } finally {
      setBusy(false);
    }
  };

  const webmail = WEBMAIL[String(email).split('@')[1]?.toLowerCase()] || null;

  return (
    <div className="stack">
      <span className="empty-art" aria-hidden="true" style={{ margin: 0 }}>
        <MailCheck size={30} />
      </span>

      <div>
        <h1>Kiểm tra hộp thư</h1>
        <p className="muted">
          Blooom vừa gửi một đường dẫn tới <strong>{email}</strong>. Bấm vào đó là xong.
        </p>
      </div>

      {notice && (
        <div className={`notice ${notice.ok ? 'notice-ok' : 'notice-error'}`} role="status">
          <span>{notice.text}</span>
        </div>
      )}

      <div className="stack-sm">
        {webmail && (
          <a
            className="btn btn-primary btn-block"
            href={webmail.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Mở {webmail.label} <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}
        <button
          type="button"
          className="btn btn-block"
          onClick={resend}
          disabled={cooldown > 0 || busy}
        >
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Đang gửi…
            </>
          ) : cooldown > 0 ? (
            `Gửi lại sau ${cooldown} giây`
          ) : (
            <>
              <RefreshCw size={16} aria-hidden="true" /> Gửi lại thư
            </>
          )}
        </button>
      </div>

      <p className="small muted">
        Không thấy thư? Xem thử mục <strong>Thư rác</strong>. Gõ nhầm email?{' '}
        <button type="button" className="link" onClick={onChangeEmail}>
          Đăng ký lại
        </button>
        .
      </p>

      <button type="button" className="btn btn-ghost btn-sm" onClick={onBackToSignIn}>
        Tôi đã xác nhận, về trang đăng nhập
      </button>
    </div>
  );
};
