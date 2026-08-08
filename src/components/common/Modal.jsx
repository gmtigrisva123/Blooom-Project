import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/* --------------------------------------------------------------------------
   Shared modal shell.
   Handles the things every dialog in the app needs and previously repeated by
   hand: Escape to close, click-outside to close, background scroll lock and
   moving focus into the dialog for keyboard users.
   -------------------------------------------------------------------------- */
export const Modal = ({ isOpen, onClose, title, icon, size = '', children, footer }) => {
  const dialogRef = useRef(null);

  /* Khóa cuộn nền và đưa tiêu điểm vào hộp thoại — CHỈ một lần mỗi lần mở.
     Hiệu ứng này cố ý không phụ thuộc vào `onClose`.

     Trước đây nó phụ thuộc, và đó là một lỗi gõ phím nghiêm trọng: phần lớn
     nơi gọi truyền `onClose={() => setOpen(false)}` viết thẳng trong JSX, nên
     mỗi lần component cha render lại thì hàm đó là một đối tượng mới. Biểu
     mẫu thêm thẻ ghi nhớ giữ state ngay ở component cha, nên MỖI KÝ TỰ gõ vào
     đều làm cha render lại → `onClose` đổi danh tính → hiệu ứng chạy lại →
     `focus()` kéo tiêu điểm ra khỏi ô người dùng đang gõ. Kết quả là gõ được
     đúng một ký tự rồi văng ra.

     Tách xử lý phím Escape sang hiệu ứng riêng bên dưới, vì nó thì THỰC SỰ
     cần thấy `onClose` mới nhất. */
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /* Chỉ kéo tiêu điểm vào khung hộp thoại khi nó chưa nằm sẵn bên trong.
       Vài biểu mẫu đặt autoFocus lên ô đầu tiên; ô đó nhận tiêu điểm lúc gắn,
       tức là trước khi hiệu ứng này chạy, nên focus() vô điều kiện sẽ cướp
       mất ngay cái tiêu điểm mà biểu mẫu vừa cố tình đặt. */
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // role="presentation" marks the backdrop as decorative: click-outside is a
    // convenience, and Escape (handled above) is the accessible way out.
    // Comparing target to currentTarget closes only on the backdrop itself, so
    // the dialog needs no event handler of its own.
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal ${size ? `modal-${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div className="modal-title">
            {icon}
            {typeof title === 'string' ? <h3>{title}</h3> : title}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {children}

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
