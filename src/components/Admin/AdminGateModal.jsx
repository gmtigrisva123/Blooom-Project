import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ADMIN_CODE_LENGTH } from '../../services/auth';
import { KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';

/* ==========================================================================
   CỔNG MÃ TRUY CẬP ADMIN

   Hộp thoại này KHÔNG quyết định điều gì. Nó gửi chuỗi người dùng gõ tới hàm
   claim_admin_role trên máy chủ và hiển thị câu trả lời. Mã đúng là gì thì cả
   tệp này lẫn phần còn lại của thư mục src/ đều không biết — nếu biết, mã đó
   đã nằm trong tệp JavaScript mà bất kỳ ai mở trang cũng tải về được.

   Hộp thoại có hai trạng thái, vì hai chiều đổi vai trò không đối xứng:

     · Học Sinh → Admin: phải nhập mã. Đây là chiều CẤP THÊM quyền — quyền
       đăng bài lên trang Mẹo Học Tập mà mọi học sinh đều đọc.
     · Admin → Học Sinh: chỉ cần xác nhận. Tự bỏ bớt quyền của mình không phải
       việc cần canh gác, và bắt gõ mã ở chiều này chỉ làm người bấm nhầm bị
       kẹt lại ở vai trò họ không muốn giữ.

   Topbar chỉ GẮN component này khi hộp thoại mở, nên mỗi lần mở là một lần
   bắt đầu lại: mã đã gõ và thông báo lỗi của lần trước biến mất cùng lần tháo
   trước đó. Cả hai đều nói về một lần thử đã kết thúc.
   ========================================================================== */
export const AdminGateModal = ({ onClose }) => {
  const { user, claimAdminRole, releaseAdminRole } = useApp();

  const isAdmin = user?.role === 'admin';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = code.trim();
  const isComplete = trimmed.length === ADMIN_CODE_LENGTH;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || !isComplete) return;

    setBusy(true);
    const result = await claimAdminRole(trimmed);
    setBusy(false);

    if (result?.ok) {
      onClose();
      return;
    }

    /* Xóa ô nhập sau khi sai: mã chỉ có 6 ký tự nên gõ lại không mất công,
       trong khi để nguyên chuỗi sai đó dễ khiến người dùng bấm gửi thêm lần
       nữa y hệt — và mỗi lần bấm đều tiêu một lượt trong giới hạn 5 lần. */
    setCode('');
    setError(result?.message || 'Mã truy cập không đúng.');
  };

  const handleRelease = async () => {
    setBusy(true);
    const updated = await releaseAdminRole();
    setBusy(false);
    if (updated) onClose();
  };

  /* ---- Đang là Admin: chỉ hỏi xác nhận ---------------------------------- */
  if (isAdmin) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Bạn đang ở vai trò Biên Tập Viên"
        icon={
          <span className="section-head-icon">
            <ShieldCheck size={16} />
          </span>
        }
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Giữ vai trò Admin
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRelease}
              disabled={busy}
            >
              {busy ? 'Đang chuyển…' : 'Quay lại Học Sinh'}
            </button>
          </>
        }
      >
        <div className="modal-body">
          <p className="t-soft">
            Vai trò Biên Tập Viên cho phép bạn đăng và gỡ bài trong mục{' '}
            <strong className="t-main">Mẹo Học Tập</strong> — nội dung mà mọi tài khoản trong hệ
            thống đều đọc được.
          </p>
          <p className="field-hint" style={{ marginTop: 'var(--sp-4)' }}>
            Quay lại vai trò Học Sinh không xóa bài bạn đã đăng. Muốn dùng lại quyền Biên Tập
            Viên, bạn sẽ cần nhập mã truy cập một lần nữa.
          </p>
        </div>
      </Modal>
    );
  }

  /* ---- Đang là Học Sinh: hỏi mã ----------------------------------------- */
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Chuyển sang tài khoản Admin"
      icon={
        <span className="section-head-icon">
          <KeyRound size={16} />
        </span>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <p className="t-soft">
            Vai trò <strong className="t-main">Biên Tập Viên / Admin</strong> cho phép đăng bài
            trong mục Mẹo Học Tập, nên nó không mở tự do. Hãy nhập mã truy cập do người quản lý
            Blooom cấp.
          </p>

          {error && (
            <div className="auth-error" role="alert" style={{ marginTop: 'var(--sp-5)' }}>
              <TriangleAlert size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="field" style={{ marginTop: error ? 0 : 'var(--sp-5)' }}>
            <label htmlFor="adminCode">Mã truy cập</label>
            <input
              id="adminCode"
              className="code-input"
              type="text"
              inputMode="text"
              placeholder={`Nhập mã ${ADMIN_CODE_LENGTH} ký tự`}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
              maxLength={ADMIN_CODE_LENGTH}
              /* Mã không phải mật khẩu của ai cả: không cho trình duyệt lưu,
                 không cho bàn phím tự viết hoa hay tự sửa chính tả. */
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby="adminCodeHint"
              disabled={busy}
              /* eslint-disable-next-line jsx-a11y/no-autofocus */
              autoFocus
            />
            <div className="code-meta">
              <span className="field-hint" id="adminCodeHint">
                Mã gồm đúng {ADMIN_CODE_LENGTH} ký tự, không phân biệt chữ hoa chữ thường.
              </span>
              <span className={`code-count ${isComplete ? 'is-complete' : ''}`}>
                {trimmed.length}/{ADMIN_CODE_LENGTH}
              </span>
            </div>
          </div>

          <p className="field-hint">
            Mã được kiểm tra ở phía máy chủ. Nhập sai 5 lần trong 15 phút thì tài khoản của bạn
            phải đợi hết 15 phút mới thử lại được.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isComplete || busy}>
            {busy ? (
              'Đang kiểm tra…'
            ) : (
              <>
                <ShieldCheck size={15} />
                Mở quyền Admin
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
