import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UploadNoteModal } from './UploadNoteModal';
import { Modal } from '../common/Modal';
import { NOTE_SUBJECTS, subjectColor } from '../../constants/subjects';
import { formatDate } from '../../services/gamification';
import {
  Hero,
  EmptyState,
  SearchInput,
  ChipRow,
  SubjectBadge,
  SkeletonCards
} from '../common/ui';
import {
  FileText,
  Plus,
  Eye,
  Download,
  Trash2,
  FolderOpen,
  Link2,
  SearchX,
  Archive
} from 'lucide-react';

const ALL = 'All';

/* Tệp ảnh xem trước được; mọi thứ khác (PDF chẳng hạn) hiện khung thay thế có
   định dạng, thay vì một thẻ <img> hỏng. Kiểu MIME do Storage ghi lại là căn
   cứ chính; phần mở rộng chỉ là phương án dự phòng. */
const isPreviewableImage = (note) =>
  note.fileType?.startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|avif)$/i.test(note.fileUrl || '');

export const NotesManager = () => {
  const { notes, groups, handleDeleteNote, isBooting } = useApp();
  const [filter, setFilter] = useState(ALL);
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);

  const filterOptions = useMemo(
    () => [
      { value: ALL, label: 'Tất Cả Ghi Chú', count: notes.length },
      ...NOTE_SUBJECTS.map((subject) => ({
        value: subject,
        label: subject,
        count: notes.filter((n) => n.subject === subject).length
      }))
    ],
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      const matchFilter = filter === ALL || note.subject === filter;
      const matchSearch =
        !query ||
        note.title.toLowerCase().includes(query) ||
        (note.fileName || '').toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });
  }, [notes, filter, search]);

  const groupName = (groupId) => groups.find((g) => g.id === groupId)?.name || null;

  const confirmDelete = (note) => {
    if (window.confirm(`Xóa ghi chú "${note.title}"? Thao tác này không thể hoàn tác.`)) {
      handleDeleteNote(note.id);
    }
  };

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Kho lưu trữ & số hóa"
        icon={<Archive size={12} />}
        title="Kho Ghi Chú Học Tập Tập Trung"
        description="Lưu ảnh chụp vở ghi và tài liệu PDF, phân loại theo môn học, gắn vào nhóm và truy cập mọi lúc mọi nơi."
        action={
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Plus size={16} /> Upload Ghi Chú
          </button>
        }
      />

      <div className="toolbar">
        <ChipRow options={filterOptions} value={filter} onChange={setFilter} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên ghi chú hoặc tên tệp..."
          label="Tìm kiếm ghi chú"
        />
      </div>

      {isBooting ? (
        <SkeletonCards count={6} />
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={search ? <SearchX size={30} /> : <FolderOpen size={30} />}
          title={search ? 'Không tìm thấy ghi chú nào' : 'Chưa có ghi chú nào'}
          description={
            search
              ? `Không có ghi chú nào khớp với “${search}”. Thử từ khóa khác nhé!`
              : 'Chụp lại trang vở hoặc tải lên tệp PDF để số hóa bài học đầu tiên của bạn.'
          }
          action={
            <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
              <Plus size={16} /> Upload Ghi Chú
            </button>
          }
        />
      ) : (
        <div className="grid grid-3 stagger">
          {filteredNotes.map((note) => {
            const linkedGroup = groupName(note.groupId);
            const showImage = isPreviewableImage(note);

            return (
              <article
                key={note.id}
                className="card card-hover article-card"
                style={{ '--subject-color': subjectColor(note.subject) }}
              >
                <div className="note-media">
                  {showImage ? (
                    <img src={note.fileUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="note-pdf">
                      <FileText size={34} />
                      <span className="t-xs t-dim">Tài liệu PDF</span>
                    </div>
                  )}

                  <span className="card-media-badge">
                    <SubjectBadge subject={note.subject} />
                  </span>
                </div>

                <div className="card-content">
                  <button className="card-title-btn" onClick={() => setPreviewNote(note)}>
                    <h3 className="clamp-2">{note.title}</h3>
                  </button>

                  {linkedGroup && (
                    <span className="note-group-link truncate">
                      <Link2 size={12} /> {linkedGroup}
                    </span>
                  )}

                  <span className="t-xs t-dim">Tải lên: {formatDate(note.uploadedAt)}</span>

                  <div className="card-foot">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setPreviewNote(note)}
                    >
                      <Eye size={13} /> Xem
                    </button>

                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => confirmDelete(note)}
                      title="Xóa ghi chú"
                      aria-label={`Xóa ghi chú ${note.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Preview                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={!!previewNote}
        onClose={() => setPreviewNote(null)}
        size="xl"
        title={previewNote?.title || ''}
        icon={
          <span className="section-head-icon">
            <FileText size={16} />
          </span>
        }
        footer={
          previewNote && (
            <>
              <a
                href={previewNote.fileUrl}
                download={previewNote.fileName}
                className="btn btn-secondary"
                target="_blank"
                rel="noreferrer"
              >
                <Download size={15} /> Tải Về Máy
              </a>
              <button className="btn btn-primary" onClick={() => setPreviewNote(null)}>
                Đóng
              </button>
            </>
          )
        }
      >
        {previewNote && (
          <div className="modal-body">
            <div className="row row-wrap mb-4" style={{ justifyContent: 'center' }}>
              <SubjectBadge subject={previewNote.subject} />
              <span className="t-xs t-dim">
                Tải lên ngày {formatDate(previewNote.uploadedAt)}
              </span>
              {previewNote.fileName && (
                <span className="t-xs t-dim truncate">{previewNote.fileName}</span>
              )}
            </div>

            <div className="preview-frame">
              {isPreviewableImage(previewNote) ? (
                <img src={previewNote.fileUrl} alt={previewNote.title} />
              ) : (
                <div className="preview-pdf">
                  <FileText size={52} color="var(--accent-text)" />
                  <h4>{previewNote.fileName}</h4>
                  <p className="t-sm t-dim">
                    Bấm “Tải Về Máy” để mở tài liệu này bằng trình đọc PDF của bạn.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <UploadNoteModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
};
