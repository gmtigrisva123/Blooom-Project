import { useApp } from '../../context/AppContext';

/* A guest's work lives only in this browser's sign-in. One calm line says so,
   with the fix beside it — shown once there is something worth keeping. */
export const GuestBanner = ({ onSave }) => {
  const { isGuest, sessions, cards, notes, groups, user } = useApp();

  if (!isGuest) return null;

  const hasWork =
    sessions.length > 0 ||
    cards.length > 0 ||
    notes.length > 0 ||
    groups.some((group) => group.ownerId === user.id);

  if (!hasWork) return null;

  return (
    <div className="guest-banner">
      <span>
        <strong>Bạn đang dùng thử.</strong> Tạo tài khoản để không mất những gì đã làm.
      </span>
      <button type="button" className="btn btn-ink btn-sm" onClick={onSave}>
        Lưu tài khoản
      </button>
    </div>
  );
};
