import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { SUBJECTS } from '../../constants/subjects';
import { Users, Lock, Globe } from 'lucide-react';

const EMPTY = { name: '', subject: 'Toán', description: '', isPrivate: false };

export const CreateGroupModal = ({ isOpen, onClose }) => {
  const { handleAddGroup } = useApp();
  const [form, setForm] = useState(EMPTY);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    handleAddGroup(form);
    setForm(EMPTY);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Nhóm Học Tập Mới"
      icon={
        <span className="section-head-icon">
          <Users size={16} />
        </span>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="groupName">Tên nhóm học *</label>
            <input
              id="groupName"
              type="text"
              placeholder="Ví dụ: Ôn thi Đội tuyển HSG Tiếng Anh 12..."
              value={form.name}
              onChange={update('name')}
              required
              /* eslint-disable-next-line jsx-a11y/no-autofocus */
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="groupSubject">Môn học *</label>
            <select id="groupSubject" value={form.subject} onChange={update('subject')}>
              {SUBJECTS.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="groupDesc">Mô tả nhóm</label>
            <textarea
              id="groupDesc"
              rows="3"
              placeholder="Giới thiệu mục tiêu nhóm học, lịch sinh hoạt..."
              value={form.description}
              onChange={update('description')}
            />
            <span className="field-hint">
              Mô tả rõ ràng giúp bạn học dễ tìm thấy và tham gia nhóm của bạn hơn.
            </span>
          </div>

          <div className="field-check">
            <input
              type="checkbox"
              id="groupPrivate"
              checked={form.isPrivate}
              onChange={update('isPrivate')}
            />
            <label htmlFor="groupPrivate">
              <span className="row" style={{ gap: '0.35rem' }}>
                {form.isPrivate ? (
                  <Lock size={14} color="var(--c-amber-2)" />
                ) : (
                  <Globe size={14} color="var(--c-emerald-2)" />
                )}
                <strong className="t-main">Đặt làm nhóm riêng tư</strong>
              </span>
              <span className="field-hint" style={{ display: 'block' }}>
                Người mới cần được quản trị viên nhóm duyệt trước khi tham gia.
              </span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={!form.name.trim()}>
            Tạo Nhóm Mới
          </button>
        </div>
      </form>
    </Modal>
  );
};
