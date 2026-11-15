import { useState } from 'react';
import { Dialog } from './Dialog';

/* A question before something that cannot be undone. `onConfirm` may be
   async; the dialog waits for it and then closes. */
export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Xóa'
}) => {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose} data-autofocus>
          Hủy
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
          {busy ? 'Đang xóa…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
};
