import { useEffect, useRef, useState } from 'react';
import { Download, KeyRound, LogOut, Moon, Pencil, Sun, UserRoundPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../ui/bits';
import { EditorDialog, GuestSignOutDialog, ProfileDialog } from './AccountDialogs';

/* ==========================================================================
   ACCOUNT MENU — everything about "me" behind the avatar: name, theme, a
   copy of my data, and the way out.
   ========================================================================== */
export const AccountMenu = ({ theme, onToggleTheme, onSaveAccount }) => {
  const { user, isGuest, isEditor, exportData, signOut } = useApp();

  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const rootRef = useRef(null);

  /* Close on a click outside or on Escape. */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (action) => () => {
    setOpen(false);
    action();
  };

  const displayName = isGuest ? 'Khách' : user?.name || 'Bạn';

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tài khoản"
      >
        <Avatar name={displayName} />
      </button>

      {open && (
        <div className="menu account-menu" role="menu">
          <div className="account-id">
            <Avatar name={displayName} size={42} />
            <div className="grow">
              <strong className="truncate">{displayName}</strong>
              <span className="small muted truncate">
                {isGuest ? 'Đang dùng thử' : user?.email}
              </span>
            </div>
          </div>

          {isGuest && (
            <button
              type="button"
              role="menuitem"
              className="btn btn-primary btn-block account-save"
              onClick={pick(onSaveAccount)}
            >
              <UserRoundPlus size={18} aria-hidden="true" /> Lưu tài khoản
            </button>
          )}

          <div className="menu-sep" />

          {!isGuest && (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={pick(() => setDialog('profile'))}
            >
              <Pencil size={18} aria-hidden="true" /> Đổi tên
            </button>
          )}
          <button type="button" role="menuitem" className="menu-item" onClick={onToggleTheme}>
            {theme === 'dark' ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
            {theme === 'dark' ? 'Dùng nền sáng' : 'Dùng nền tối'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={pick(exportData)}
          >
            <Download size={18} aria-hidden="true" /> Tải dữ liệu của tôi
          </button>
          {!isGuest && (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={pick(() => setDialog('editor'))}
            >
              <KeyRound size={18} aria-hidden="true" />
              {isEditor ? 'Quyền đăng bài: đang bật' : 'Tôi là biên tập viên'}
            </button>
          )}

          <div className="menu-sep" />

          <button
            type="button"
            role="menuitem"
            className="menu-item is-danger"
            onClick={pick(() => (isGuest ? setDialog('guest-out') : signOut()))}
          >
            <LogOut size={18} aria-hidden="true" /> Đăng xuất
          </button>
        </div>
      )}

      <ProfileDialog open={dialog === 'profile'} onClose={() => setDialog(null)} />
      <EditorDialog open={dialog === 'editor'} onClose={() => setDialog(null)} />
      <GuestSignOutDialog
        open={dialog === 'guest-out'}
        onClose={() => setDialog(null)}
        onSaveAccount={() => {
          setDialog(null);
          onSaveAccount();
        }}
      />
    </div>
  );
};
