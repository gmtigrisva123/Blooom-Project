import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Sparkles, Heart, Trash2, User, Calendar } from 'lucide-react';

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
            <Calendar size={13} /> {article.createdAt}
          </span>
          {article.likesCount != null && (
            <span className="row" style={{ gap: '0.3rem' }}>
              <Heart size={13} /> {article.likesCount} lượt thích
            </span>
          )}
        </div>

        <div className="reader-body">{article.content}</div>
      </div>
    </Modal>
  );
};
