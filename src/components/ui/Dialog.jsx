import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ==========================================================================
   DIALOG — a centred card on a laptop, a bottom sheet on a phone.

   Handles the things a dialog owes its user: focus moves in and stays in,
   Escape and a click outside close it, the page behind does not scroll, and
   focus returns to whatever opened it.

   Children supply their own `.dialog-body` / `.dialog-foot`, so a dialog can
   wrap both in one <form> and submit on Enter.
   ========================================================================== */
export const Dialog = ({ open, onClose, title, description, wide = false, children }) => {
  const titleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  /* Read through a ref so a parent re-render (a new onClose arrow every
     time) does not re-run the focus logic and steal the cursor mid-typing. */
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    const opener = document.activeElement;

    const first = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
    (first || panel).focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`dialog ${wide ? 'dialog-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
