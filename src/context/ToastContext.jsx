import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';

/* ==========================================================================
   TOASTS — short confirmations that an action worked (or did not).
   Lives above everything else so the sign-in screens can use it too.
   ========================================================================== */

const ToastContext = createContext(() => {});

const ICONS = { success: CircleCheck, error: TriangleAlert, info: Info };

let sequence = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      sequence += 1;
      const id = sequence;
      /* Never more than three on screen: a stack of old confirmations hides
         the one that matters. */
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      /* Errors stay longer — they usually need reading twice. */
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3600);
    },
    [dismiss]
  );

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || CircleCheck;
          return (
            <button
              key={toast.id}
              type="button"
              className={`toast toast-${toast.type}`}
              onClick={() => dismiss(toast.id)}
              title="Bấm để đóng"
            >
              <Icon size={18} aria-hidden="true" />
              <span>{toast.message}</span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

/* Returns showToast(message, type) — type is 'success' | 'error' | 'info'. */
export const useToast = () => useContext(ToastContext);
