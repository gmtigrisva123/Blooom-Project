import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatDate } from '../../services/gamification';
import { Sparkles, Heart, Trash2, User, Calendar, Link2 } from 'lucide-react';

export const ArticleModal = ({ article, isOpen, onClose }) => {
  const { user, bookmarks, handleToggleBookmark, handleDeleteEditorPick } = useApp();

  if (!isOpen || !article) return null;

  const isBookmarked = bookmarks.includes(article.id);
  const isAdmin = user.role === 'admin';

  const onDelete = () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${article.title}"?`)) {
      handleDeleteEditorPick(article.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={<span className="badge badge-accent">{article.category}</span>}
      icon={
        <span className="section-head-icon">
          <Sparkles size={16} />
        </span>
      }
      footer={
        <>
          {isAdmin && (
            <button className="btn btn-danger" onClick={onDelete}>
              <Trash2 size={15} /> Xóa Bài Viết
            </button>
          )}

          <span className="grow" />

          <button
            className={`btn ${isBookmarked ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => handleToggleBookmark(article.id)}
          >
            <Heart size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
            {isBookmarked ? 'Đã Lưu' : 'Lưu Bài Viết'}
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <div className="modal-body">
        {article.imageUrl && (
          <img className="reader-cover" src={article.imageUrl} alt="" loading="lazy" />
        )}

        <h2 className="reader-title">{article.title}</h2>

        <div className="reader-meta">
          <span className="row" style={{ gap: '0.3rem' }}>
            <User size={13} /> {article.createdBy}
          </span>
          <span className="row" style={{ gap: '0.3rem' }}>
            <Calendar size={13} /> {formatDate(article.createdAt)}
          </span>
          {article.likesCount > 0 && (
            <span className="row" style={{ gap: '0.3rem' }}>
              <Heart size={13} /> {article.likesCount} lượt lưu
            </span>
          )}
        </div>

        <div className="reader-body">{article.content}</div>

        {/* Nguồn hiện ngay dưới bài, không giấu trong chú thích: một khẳng
            định về phương pháp học chỉ đáng tin khi truy nguyên được. */}
        {(article.sourceLabel || article.sourceUrl) && (
          <p className="reader-source t-xs t-dim row" style={{ gap: '0.35rem' }}>
            <Link2 size={13} aria-hidden="true" />
            <span>
              Nguồn:{' '}
              {article.sourceUrl ? (
                <a href={article.sourceUrl} target="_blank" rel="noreferrer noopener">
                  {article.sourceLabel || article.sourceUrl}
                </a>
              ) : (
                article.sourceLabel
              )}
            </span>
          </p>
        )}
      </div>
    </Modal>
  );
};
