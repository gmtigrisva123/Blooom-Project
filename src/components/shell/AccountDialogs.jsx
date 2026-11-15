import { useState } from 'react';
import { MailCheck, TriangleAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ADMIN_CODE_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordIssues,
  validateEmail
} from '../../services/auth';
import { Dialog } from '../ui/Dialog';

/* Each dialog's form lives in its own component, mounted only while the
   dialog is open — so every opening starts clean, with no state to reset. */

/* ==========================================================================
   SAVE ACCOUNT — turns a try-it-out visit into a real account. Everything
   already created stays, because the account underneath is the same one.
   ========================================================================== */
const SaveAccountForm = ({ onClose }) => {
  const { upgradeGuest } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2) return setError('Tên cần ít nhất 2 ký tự.');
    if (!validateEmail(email)) return setError('Email chưa đúng.');
    const issues = passwordIssues(password);
    if (issues.length > 0)
      return setError(`Mật khẩu còn thiếu: ${issues.join(', ').toLowerCase()}.`);

    setBusy(true);
    const result = await upgradeGuest({ name, email, password });
    setBusy(false);

    if (!result.ok) return setError(result.message);

    /* When email confirmation is on, the address only takes effect once its
       link is clicked. Say so, instead of closing as if it were all done. */
    if (result.account?.isAnonymous) return setSentTo(email.trim());
    return onClose();
  };

  if (sentTo) {
    return (
      <>
        <div className="dialog-body">
          <div className="notice notice-ok">
            <MailCheck size={18} aria-hidden="true" />
            <span>
              Blooom đã gửi thư tới <strong>{sentTo}</strong>. Bấm vào đường dẫn trong thư để
              hoàn tất.
            </span>
          </div>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </>
    );
  }

  return (
    <form className="dialog-form" onSubmit={submit} noValidate>
      <div className="dialog-body">
        {error && (
          <div className="notice notice-error" role="alert">
            <TriangleAlert size={17} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="saveName">Tên của bạn</label>
          <input
            id="saveName"
            className="input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            data-autofocus
          />
        </div>
        <div className="field">
          <label htmlFor="saveEmail">Email</label>
          <input
            id="saveEmail"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="savePassword">Mật khẩu</label>
          <input
            id="savePassword"
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="field-hint">
            Ít nhất {PASSWORD_MIN_LENGTH} ký tự, có cả chữ và số.
          </span>
        </div>
      </div>

      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Để sau
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu tài khoản'}
        </button>
      </div>
    </form>
  );
};

export const SaveAccountDialog = ({ open, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title="Lưu tài khoản"
    description="Mọi thứ bạn đã làm sẽ được giữ nguyên."
  >
    <SaveAccountForm onClose={onClose} />
  </Dialog>
);

/* ==========================================================================
   PROFILE — the display name.
   ========================================================================== */
const ProfileForm = ({ onClose }) => {
  const { user, updateProfile } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2 || busy) return;
    setBusy(true);
    const updated = await updateProfile({ name });
    setBusy(false);
    if (updated) onClose();
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="profileName">Tên hiển thị</label>
          <input
            id="profileName"
            className="input"
            type="text"
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            data-autofocus
          />
          <span className="field-hint">Bạn bè trong nhóm học sẽ thấy tên này.</span>
        </div>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || name.trim().length < 2}
        >
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </form>
  );
};

export const ProfileDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} title="Đổi tên">
    <ProfileForm onClose={onClose} />
  </Dialog>
);

/* ==========================================================================
   EDITOR ACCESS — who may publish study tips.

   This dialog decides nothing. It sends what was typed to the server and
   shows the answer; no file in this app knows the right code. The two
   directions are not symmetrical: getting the permission needs the code,
   giving it up only needs a click.
   ========================================================================== */
const EditorForm = ({ onClose }) => {
  const { isEditor, claimEditor, releaseEditor } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const complete = code.length === ADMIN_CODE_LENGTH;

  if (isEditor) {
    const release = async () => {
      setBusy(true);
      const updated = await releaseEditor();
      setBusy(false);
      if (updated) onClose();
    };

    return (
      <>
        <div className="dialog-body">
          <p className="muted">
            Bạn đang có quyền đăng và xóa bài trong mục Mẹo học. Tắt quyền này không xóa bài bạn
            đã đăng.
          </p>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Giữ nguyên
          </button>
          <button type="button" className="btn btn-danger" onClick={release} disabled={busy}>
            {busy ? 'Đang tắt…' : 'Tắt quyền đăng bài'}
          </button>
        </div>
      </>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (!complete || busy) return;

    setBusy(true);
    const result = await claimEditor(code);
    setBusy(false);

    if (result?.ok) return onClose();

    /* Clear after a miss: six characters are quick to retype, and leaving
       the wrong code in place invites sending it again. */
    setCode('');
    return setError(result?.message || 'Mã chưa đúng.');
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        {error && (
          <div className="notice notice-error" role="alert">
            <TriangleAlert size={17} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="editorCode">Mã biên tập viên</label>
          <input
            id="editorCode"
            className="input code-input"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
            maxLength={ADMIN_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            aria-invalid={error ? 'true' : undefined}
            disabled={busy}
            data-autofocus
          />
          <span className="field-hint">
            Gồm {ADMIN_CODE_LENGTH} ký tự, do người quản lý Blooom cấp.
          </span>
        </div>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={!complete || busy}>
          {busy ? 'Đang kiểm tra…' : 'Xác nhận'}
        </button>
      </div>
    </form>
  );
};

export const EditorDialog = ({ open, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title="Biên tập viên"
    description="Biên tập viên được đăng bài trong mục Mẹo học."
  >
    <EditorForm onClose={onClose} />
  </Dialog>
);

/* ==========================================================================
   GUEST SIGN-OUT — a guest who signs out can never get back in, so the app
   says so before it happens and offers the way to keep everything.
   ========================================================================== */
export const GuestSignOutDialog = ({ open, onClose, onSaveAccount }) => {
  const { signOut } = useApp();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Đăng xuất sẽ mất dữ liệu"
      description="Bạn đang dùng thử nên chưa có tài khoản để đăng nhập lại. Lưu tài khoản trước để giữ mọi thứ nhé."
    >
      <div className="dialog-foot">
        <button type="button" className="btn btn-danger" onClick={signOut}>
          Vẫn đăng xuất
        </button>
        <button type="button" className="btn btn-primary" onClick={onSaveAccount}>
          Lưu tài khoản
        </button>
      </div>
    </Dialog>
  );
};
