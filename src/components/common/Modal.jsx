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

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
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
