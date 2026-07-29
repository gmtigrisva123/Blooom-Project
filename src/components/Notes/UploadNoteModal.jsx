import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { NOTE_SUBJECTS, subjectLabel } from '../../constants/subjects';
import { Upload, Image as ImageIcon, CheckCircle2, FileText } from 'lucide-react';

const SAMPLE = {
  fileName: 'ghi-chu-mau-chat-luong-cao.jpg',
  fileUrl:
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
};

/* Data URLs are stored in localStorage, which caps out around 5 MB. */
const MAX_FILE_BYTES = 3 * 1024 * 1024;

const EMPTY = { title: '', subject: 'Toán', groupId: '', fileUrl: '', fileName: '' };

export const UploadNoteModal = ({ isOpen, onClose }) => {
  const { handleAddNote, groups, showToast } = useApp();
  const [form, setForm] = useState(EMPTY);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      showToast('Tệp quá lớn (tối đa 3 MB). Hãy chọn ảnh nhẹ hơn nhé!', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () =>
      setForm((prev) => ({ ...prev, fileUrl: reader.result, fileName: file.name }));
    reader.onerror = () => showToast('Không đọc được tệp này. Thử tệp khác nhé!', 'error');
    reader.readAsDataURL(file);
  };

  const useSample = () => setForm((prev) => ({ ...prev, ...SAMPLE }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.fileUrl) return;

    handleAddNote({
      title: form.title,
      subject: form.subject,
      groupId: form.groupId || null,
      fileUrl: form.fileUrl,
      fileName: form.fileName || 'tai-lieu-ghi-chu.jpg',
      fileType: form.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
    });

    setForm(EMPTY);
    onClose();
  };

  const isPdf = form.fileName.toLowerCase().endsWith('.pdf');

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
              className={`dropzone ${form.fileUrl ? 'is-filled' : ''}`}
            >
              {form.fileUrl ? (
                <>
                  {isPdf ? (
                    <FileText size={30} className="dropzone-icon" />
                  ) : (
                    <CheckCircle2 size={30} className="dropzone-icon" color="var(--success)" />
                  )}
                  <strong className="t-main">{form.fileName}</strong>
                  <span className="field-hint" style={{ display: 'block' }}>
                    Đã sẵn sàng tải lên — bấm để chọn tệp khác
                  </span>
                </>
              ) : (
                <>
                  <Upload size={30} className="dropzone-icon" />
                  <strong className="t-main">Bấm để chọn tệp từ máy tính</strong>
                  <span className="field-hint" style={{ display: 'block' }}>
                    Hỗ trợ JPG, PNG, PDF — tối đa 3 MB
                  </span>
                </>
              )}
            </label>

            {!form.fileUrl && (
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block"
                style={{ marginTop: 'var(--sp-3)' }}
                onClick={useSample}
              >
                <ImageIcon size={14} /> Dùng ảnh mẫu để thử nhanh
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!form.fileUrl || !form.title.trim()}
          >
            Tải Lên Ghi Chú
          </button>
        </div>
      </form>
    </Modal>
  );
};
