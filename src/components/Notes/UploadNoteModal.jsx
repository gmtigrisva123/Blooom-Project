import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NOTE_SUBJECTS, subjectLabel } from '../../constants/subjects';
import { Upload, CheckCircle2, FileText } from 'lucide-react';

/* Giới hạn của bucket `notes` trong Supabase Storage (xem migration). Kiểm ở
   client chỉ để báo lỗi sớm và tử tế; ràng buộc thật nằm ở phía máy chủ. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EMPTY = { title: '', subject: 'Toán', groupId: '', file: null };

export const UploadNoteModal = ({ isOpen, onClose }) => {
  const { handleAddNote, groups, showToast } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  /* Tệp được giữ nguyên dạng File và tải thẳng lên Storage. Bản trước đọc nó
     thành data-URL để nhét vào localStorage — cách đó chạm trần dung lượng ở
     khoảng 5 MB và làm phình mỗi hàng lên gấp rưỡi vì mã hóa base64. */
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      showToast('Tệp quá lớn (tối đa 10 MB). Hãy chọn tệp nhẹ hơn nhé!', 'error');
      event.target.value = '';
      return;
    }

    setForm((prev) => ({ ...prev, file }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.file || busy) return;

    setBusy(true);
    const created = await handleAddNote({
      title: form.title,
      subject: form.subject,
      groupId: form.groupId || null,
      file: form.file
    });
    setBusy(false);

    /* Chỉ đóng khi máy chủ đã xác nhận. Đóng ngay sẽ khiến một lần tải lên
       thất bại trông y hệt một lần thành công. */
    if (!created) return;

    setForm(EMPTY);
    onClose();
  };

  const isPdf = (form.file?.name || '').toLowerCase().endsWith('.pdf');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tải Lên & Số Hóa Ghi Chú"
      icon={
        <span className="section-head-icon">
          <Upload size={16} />
        </span>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="noteTitle">Tên ghi chú / bài học *</label>
            <input
              id="noteTitle"
              type="text"
              placeholder="Ví dụ: Sơ đồ tư duy Hóa Hữu Cơ..."
              value={form.title}
              onChange={update('title')}
              required
              /* eslint-disable-next-line jsx-a11y/no-autofocus */
              autoFocus
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="noteSubject">Môn học *</label>
              <select id="noteSubject" value={form.subject} onChange={update('subject')}>
                {NOTE_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subjectLabel(subject)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="noteGroup">Gắn vào nhóm học</label>
              <select id="noteGroup" value={form.groupId} onChange={update('groupId')}>
                <option value="">Không chọn nhóm</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="noteFileInput">Tệp ghi chú (ảnh hoặc PDF) *</label>

            <input
              type="file"
              id="noteFileInput"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="sr-only"
            />

            <label
              htmlFor="noteFileInput"
              className={`dropzone ${form.file ? 'is-filled' : ''}`}
            >
              {form.file ? (
                <>
                  {isPdf ? (
                    <FileText size={30} className="dropzone-icon" />
                  ) : (
                    <CheckCircle2 size={30} className="dropzone-icon" color="var(--success)" />
                  )}
                  <strong className="t-main">{form.file.name}</strong>
                  <span className="field-hint" style={{ display: 'block' }}>
                    {(form.file.size / 1024 / 1024).toFixed(1)} MB — bấm để chọn tệp khác
                  </span>
                </>
              ) : (
                <>
                  <Upload size={30} className="dropzone-icon" />
                  <strong className="t-main">Bấm để chọn tệp từ máy tính</strong>
                  <span className="field-hint" style={{ display: 'block' }}>
                    Hỗ trợ JPG, PNG, WebP, PDF — tối đa 10 MB
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!form.file || !form.title.trim() || busy}
          >
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" /> Đang tải lên…
              </>
            ) : (
              'Tải Lên Ghi Chú'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
