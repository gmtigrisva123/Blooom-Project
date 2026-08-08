import { useCallback, useEffect, useState } from 'react';
import { authService } from '../../services/auth';
import {
  MailCheck,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Inbox,
  TriangleAlert
} from 'lucide-react';

/* ==========================================================================
   MÀN HÌNH "ĐÃ GỬI THƯ XÁC NHẬN"

   Hiện ra khi dự án Supabase bật xác nhận email: tài khoản đã tạo xong, chỉ
   là chưa dùng được cho tới khi người dùng bấm liên kết trong thư.

   Đây là một THÀNH CÔNG và phải trông như vậy. Bản trước hiển thị nó bằng
   chính khung đỏ kèm biểu tượng cảnh báo mà mọi lỗi khác dùng, nên người vừa
   đăng ký xong không phân biệt được mình vừa thành công hay vừa hỏng việc.

   Màn hình này trả lời ba câu hỏi mà một ngõ cụt kiểu đó bỏ lửng: thư đã gửi
   đi đâu, phải làm gì tiếp, và làm sao thoát ra nếu thư không tới.
   ========================================================================== */

/* Liên kết mở thẳng hộp thư của vài nhà cung cấp phổ biến ở Việt Nam. Chỉ mở
   trang chủ hộp thư — không mang theo địa chỉ hay bất cứ tham số nào, vì dữ
   liệu cá nhân không được phép nằm trong URL. */
const WEBMAIL_BY_DOMAIN = {
  'gmail.com': { label: 'Gmail', url: 'https://mail.google.com' },
  'googlemail.com': { label: 'Gmail', url: 'https://mail.google.com' },
  'outlook.com': { label: 'Outlook', url: 'https://outlook.live.com' },
  'hotmail.com': { label: 'Outlook', url: 'https://outlook.live.com' },
  'live.com': { label: 'Outlook', url: 'https://outlook.live.com' },
  'yahoo.com': { label: 'Yahoo Mail', url: 'https://mail.yahoo.com' },
  'icloud.com': { label: 'iCloud Mail', url: 'https://www.icloud.com/mail' }
};

const webmailFor = (email) => {
  const domain = String(email || '')
    .split('@')[1]
    ?.toLowerCase();
  return domain ? WEBMAIL_BY_DOMAIN[domain] || null : null;
};

/* Supabase chặn gửi lại quá dày. Đếm ngược ở giao diện để người dùng thấy
   phải đợi bao lâu, thay vì bấm liên tục rồi ăn một thông báo lỗi khó hiểu. */
const RESEND_COOLDOWN_SECONDS = 60;

export const EmailSentNotice = ({ email, onBackToSignIn, onChangeEmail }) => {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = useCallback(async () => {
    if (cooldown > 0 || busy) return;

    setBusy(true);
    setNotice(null);
    try {
      await authService.resendConfirmation(email);
      setNotice({ tone: 'ok', text: `Đã gửi lại thư tới ${email}.` });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setNotice({ tone: 'error', text: error.message || 'Không gửi lại được thư.' });
    } finally {
      setBusy(false);
    }
  }, [cooldown, busy, email]);

  const webmail = webmailFor(email);

  return (
    <div className="mail-notice">
      <span className="mail-notice-art" aria-hidden="true">
        <MailCheck size={30} />
      </span>

      <h1 className="auth-title">Kiểm tra hộp thư của bạn</h1>

      <p className="auth-sub">
        Tài khoản đã được tạo. Chúng tôi vừa gửi một liên kết xác nhận tới địa chỉ bên dưới —
        bấm vào liên kết đó là bạn đăng nhập được ngay.
      </p>

      <p className="mail-notice-address mono">{email}</p>

      {notice && (
        <div
          className={notice.tone === 'error' ? 'auth-error' : 'auth-success'}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.tone === 'error' ? (
            <TriangleAlert size={16} aria-hidden="true" />
          ) : (
            <MailCheck size={16} aria-hidden="true" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="mail-notice-actions">
        {webmail && (
          <a
            className="btn btn-primary btn-block"
            href={webmail.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Mở {webmail.label} <ExternalLink size={15} />
          </a>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={resend}
          disabled={cooldown > 0 || busy}
        >
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Đang gửi lại…
            </>
          ) : cooldown > 0 ? (
            `Gửi lại thư sau ${cooldown}s`
          ) : (
            <>
              <RefreshCw size={15} /> Gửi lại thư xác nhận
            </>
          )}
        </button>
      </div>

      <ul className="mail-notice-tips">
        <li>
          <Inbox size={14} aria-hidden="true" />
          <span>
            Thư không thấy đâu? Hãy xem mục <b>Spam</b> hoặc <b>Quảng cáo</b> — thư tự động hay
            bị lọc vào đó.
          </span>
        </li>
        <li>
          <TriangleAlert size={14} aria-hidden="true" />
          <span>
            Gõ nhầm địa chỉ email?{' '}
            <button type="button" className="link-btn is-inline" onClick={onChangeEmail}>
              Đăng ký lại bằng địa chỉ khác
            </button>
            .
          </span>
        </li>
      </ul>

      <button type="button" className="link-btn mail-notice-back" onClick={onBackToSignIn}>
        <ArrowLeft size={15} /> Tôi đã xác nhận — về trang đăng nhập
      </button>
    </div>
  );
};
