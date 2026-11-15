import { useMemo, useState } from 'react';
import { ExternalLink, FileText, FolderOpen, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../services/gamification';
import {
  Empty,
  PageHead,
  SearchField,
  SubjectChips,
  SubjectSelect,
  SubjectTag
} from '../ui/bits';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/* The storage limit set on the server. Checked here only to say so early and
   kindly; the real limit is enforced there. */
const MAX_BYTES = 10 * 1024 * 1024;

const isImage = (note) => (note.fileType || '').startsWith('image/');

const titleFrom = (fileName) =>
  fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

/* ==========================================================================
   UPLOAD — pick or drop a file; the title fills itself in from its name.
   ========================================================================== */
const UploadForm = ({ onClose }) => {
  const { addNote, groups, user } = useApp();
  const showToast = useToast();

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán');
  const [groupId, setGroupId] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const myGroups = groups.filter((group) => group.members.includes(user.id));

  const accept = (picked) => {
    if (!picked) return;
    const okType = picked.type.startsWith('image/') || picked.type === 'application/pdf';
    if (!okType) {
      showToast('Chỉ nhận ảnh hoặc tệp PDF.', 'error');
      return;
    }
    if (picked.size > MAX_BYTES) {
      showToast('Tệp lớn hơn 10 MB. Bạn chọn tệp nhẹ hơn nhé.', 'error');
      return;
    }
    setFile(picked);
    if (!title.trim()) setTitle(titleFrom(picked.name));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file || !title.trim() || busy) return;

    setBusy(true);
    const created = await addNote({ title, subject, groupId: groupId || null, file });
    setBusy(false);
    /* Close only once the server has confirmed — otherwise a failed upload
       would look exactly like a successful one. */
    if (created) onClose();
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        <input
          id="noteFile"
          className="sr-only"
          type="file"
          accept="image/*,application/pdf"
          onChange={(event) => accept(event.target.files?.[0])}
        />
        <label
          htmlFor="noteFile"
          className={`dropzone ${dragging ? 'is-over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files?.[0]);
          }}
        >
          {file ? (
            <>
              <FileText size={28} aria-hidden="true" />
              <strong className="truncate">{file.name}</strong>
              <span className="tiny faint">
                {(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB · bấm để đổi tệp
              </span>
            </>
          ) : (
            <>
              <Upload size={28} aria-hidden="true" />
              <strong>Chọn tệp hoặc kéo thả vào đây</strong>
              <span className="tiny faint">Ảnh hoặc PDF, tối đa 10 MB</span>
            </>
          )}
        </label>

        <div className="field">
          <label htmlFor="noteTitle">Tên tài liệu</label>
          <input
            id="noteTitle"
            className="input"
            type="text"
            maxLength={200}
            placeholder="Ví dụ: Sơ đồ tư duy Hóa hữu cơ"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className={myGroups.length > 0 ? 'field-row' : ''}>
          <div className="field">
            <label htmlFor="noteSubject">Môn</label>
            <SubjectSelect id="noteSubject" value={subject} onChange={setSubject} />
          </div>
          {myGroups.length > 0 && (
            <div className="field">
              <label htmlFor="noteGroup">Nhóm (không bắt buộc)</label>
              <select
                id="noteGroup"
                className="select"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
              >
                <option value="">Không gắn nhóm</option>
                {myGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!file || !title.trim() || busy}
        >
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Đang tải lên…
            </>
          ) : (
            'Lưu tài liệu'
          )}
        </button>
      </div>
    </form>
  );
};

/* ==========================================================================
   LIBRARY — photos of notebook pages and PDFs, filed by subject.
   ========================================================================== */
export const Library = () => {
  const { notes, groups, deleteNote } = useApp();

  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState(null);
  const [query, setQuery] = useState('');
  const [doomed, setDoomed] = useState(null);

  const counts = useMemo(() => {
    const result = {};
    notes.forEach((note) => {
      result[note.subject] = (result[note.subject] || 0) + 1;
    });
    return result;
  }, [notes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes
      .filter((note) => !subject || note.subject === subject)
      .filter((note) => !needle || note.title.toLowerCase().includes(needle));
  }, [notes, subject, query]);

  const groupName = (id) => groups.find((group) => group.id === id)?.name || null;

  const uploadButton = (
    <button type="button" className="btn btn-primary" onClick={() => setUploading(true)}>
      <Upload size={18} aria-hidden="true" /> Tải lên
    </button>
  );

  return (
    <div className="stack-lg">
      <PageHead
        title="Tài liệu"
        description="Ảnh chụp vở và tệp PDF, cất gọn theo môn."
        action={notes.length > 0 && uploadButton}
      />

      {notes.length === 0 ? (
        <div className="card">
          <Empty
            icon={<FolderOpen size={32} />}
            title="Chưa có tài liệu nào"
            action={uploadButton}
          >
            Chụp trang vở hay tải tệp PDF lên, để lúc cần là có ngay.
          </Empty>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <SubjectChips value={subject} onChange={setSubject} counts={counts} />
            <SearchField value={query} onChange={setQuery} placeholder="Tìm tài liệu…" />
          </div>

          {visible.length === 0 ? (
            <div className="card">
              <Empty title="Không tìm thấy tài liệu nào">
                Thử từ khóa khác hoặc bỏ bộ lọc môn.
              </Empty>
            </div>
          ) : (
            <ul className="files">
              {visible.map((note) => (
                <li key={note.id} className="file">
                  <a
                    className="file-thumb"
                    href={note.fileUrl || undefined}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Mở ${note.title}`}
                  >
                    {isImage(note) && note.fileUrl ? (
                      <img src={note.fileUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="file-pdf">
                        <FileText size={30} aria-hidden="true" />
                        PDF
                      </span>
                    )}
                  </a>
                  <div className="file-body">
                    <strong className="clamp-2">{note.title}</strong>
                    <div className="row wrap file-tags">
                      <SubjectTag subject={note.subject} />
                      {groupName(note.groupId) && (
                        <span className="tag truncate">{groupName(note.groupId)}</span>
                      )}
                    </div>
                    <div className="row-between">
                      <span className="tiny faint">{formatDate(note.uploadedAt)}</span>
                      <div className="row file-actions">
                        {note.fileUrl && (
                          <a
                            className="icon-btn"
                            href={note.fileUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={`Mở ${note.title} trong thẻ mới`}
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="icon-btn is-danger"
                          onClick={() => setDoomed(note)}
                          aria-label={`Xóa ${note.title}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={uploading} onClose={() => setUploading(false)} title="Tải tài liệu lên">
        <UploadForm onClose={() => setUploading(false)} />
      </Dialog>

      <ConfirmDialog
        open={Boolean(doomed)}
        onClose={() => setDoomed(null)}
        onConfirm={() => deleteNote(doomed.id)}
        title="Xóa tài liệu này?"
        description={doomed ? `“${doomed.title}” sẽ bị xóa hẳn.` : ''}
      />
    </div>
  );
};
