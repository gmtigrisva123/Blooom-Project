import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ArticleModal } from './ArticleModal';
import { Modal } from '../common/Modal';
import { Hero, EmptyState, ChipRow, SearchInput, SkeletonCards } from '../common/ui';
import {
  Sparkles,
  Heart,
  Plus,
  BookMarked,
  ShieldCheck,
  Flame,
  ImageOff,
  SearchX
} from 'lucide-react';

const ALL = 'All';
const SAVED = 'Saved';
const CATEGORIES = ['Mẹo học tập', 'Kỹ năng ghi nhớ', 'Năng suất'];
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80';

const EMPTY_FORM = {
  title: '',
  category: CATEGORIES[0],
  content: '',
  imageUrl: ''
};

export const EditorPicks = () => {
  const { editorPicks, user, bookmarks, handleToggleBookmark, handleAddEditorPick, isBooting } =
    useApp();

  const [filter, setFilter] = useState(ALL);
  const [search, setSearch] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const isAdmin = user.role === 'admin';

  const filterOptions = useMemo(
    () => [
      { value: ALL, label: 'Tất Cả Bài Viết', count: editorPicks.length },
      { value: SAVED, label: '❤️ Đã Lưu', count: bookmarks.length },
      ...CATEGORIES.map((category) => ({
        value: category,
        label: category,
        count: editorPicks.filter((a) => a.category === category).length
      }))
    ],
    [editorPicks, bookmarks.length]
  );

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return editorPicks.filter((article) => {
      const matchFilter =
        filter === ALL ||
        (filter === SAVED ? bookmarks.includes(article.id) : article.category === filter);

      const matchSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        (article.content || '').toLowerCase().includes(query);

      return matchFilter && matchSearch;
    });
  }, [editorPicks, filter, search, bookmarks]);

  const featured = editorPicks[0];
  const showFeatured = filter === ALL && !search && featured;
  /* The featured article already has its own big card above the grid. */
  const gridArticles = showFeatured
    ? filteredArticles.filter((a) => a.id !== featured.id)
    : filteredArticles;

  const updateForm = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handlePublish = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    handleAddEditorPick({
      ...form,
      imageUrl: form.imageUrl.trim() || FALLBACK_IMAGE,
      createdBy: user.name || 'Biên Tập Viên Admin'
    });

    setForm(EMPTY_FORM);
    setIsPublishOpen(false);
  };

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Chuyên mục biên tập viên"
        icon={<Sparkles size={12} />}
        title="Mẹo Năng Suất & Kỹ Năng Học Tập"
        description="Những bài viết ngắn chọn lọc giúp bạn đột phá tư duy, ghi nhớ nhanh và xây dựng kỷ luật học tập khoa học."
        action={
          isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsPublishOpen(true)}>
              <Plus size={16} /> Đăng Bài Mới
            </button>
          )
        }
      />

      <div className="toolbar">
        <ChipRow options={filterOptions} value={filter} onChange={setFilter} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm bài viết theo tiêu đề hoặc nội dung..."
          label="Tìm kiếm bài viết"
        />
      </div>

      {isBooting ? (
        <SkeletonCards count={6} />
      ) : (
        <>
          {/* A div rather than <article>: giving a non-interactive landmark an
              interactive role confuses screen readers. */}
          {showFeatured && (
            <div
              className="feature-article"
              role="button"
              tabIndex={0}
              onClick={() => setActiveArticle(featured)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveArticle(featured);
                }
              }}
            >
              <div className="feature-article-body">
                <span className="badge badge-accent badge-eyebrow">
                  <Flame size={12} /> Bài nổi bật mới nhất
                </span>
                <h2>{featured.title}</h2>
                <p className="t-sm clamp-3">{featured.content}</p>
                <div className="row-between" style={{ marginTop: 'var(--sp-5)' }}>
                  <span className="btn btn-primary btn-sm">Đọc Chi Tiết →</span>
                  <span className="t-xs t-dim">{featured.createdAt}</span>
                </div>
              </div>

              <div className="feature-article-media">
                {featured.imageUrl ? (
                  <img src={featured.imageUrl} alt="" loading="lazy" />
                ) : (
                  <div className="card-media-fallback">
                    <ImageOff size={26} />
                  </div>
                )}
              </div>
            </div>
          )}

          {gridArticles.length === 0 ? (
            <EmptyState
              icon={search ? <SearchX size={30} /> : <BookMarked size={30} />}
              title={
                filter === SAVED
                  ? 'Bạn chưa lưu bài viết nào'
                  : search
                    ? 'Không tìm thấy bài viết phù hợp'
                    : 'Chưa có bài viết nào'
              }
              description={
                filter === SAVED
                  ? 'Bấm biểu tượng trái tim trên bất kỳ bài viết nào để lưu lại đọc sau.'
                  : search
                    ? `Không có bài viết nào khớp với “${search}”. Thử từ khóa khác nhé!`
                    : 'Hãy quay lại sau để đón đọc thêm bài viết mới từ ban biên tập!'
              }
              action={
                isAdmin && filter !== SAVED ? (
                  <button className="btn btn-primary" onClick={() => setIsPublishOpen(true)}>
                    <Plus size={16} /> Đăng Bài Mới
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-3 stagger">
              {gridArticles.map((article) => {
                const isBookmarked = bookmarks.includes(article.id);
                return (
                  <article key={article.id} className="card card-hover article-card">
                    <div className="card-media">
                      {article.imageUrl ? (
                        <img src={article.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <div className="card-media-fallback">
                          <Sparkles size={26} />
                        </div>
                      )}

                      <span className="card-media-badge badge badge-accent">
                        {article.category}
                      </span>

                      <div className="card-media-float">
                        <button
                          className={`float-btn ${isBookmarked ? 'is-on' : ''}`}
                          onClick={() => handleToggleBookmark(article.id)}
                          title={isBookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                          aria-label={isBookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                        >
                          <Heart size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>

                    <div className="card-content">
                      <button
                        className="card-title-btn"
                        onClick={() => setActiveArticle(article)}
                      >
                        <h3 className="clamp-2">{article.title}</h3>
                      </button>

                      <p className="t-sm t-dim clamp-2">{article.content}</p>

                      <div className="card-foot">
                        <span className="t-xs t-dim truncate">{article.createdBy}</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActiveArticle(article)}
                        >
                          Đọc Bài
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <ArticleModal
        article={activeArticle}
        isOpen={!!activeArticle}
        onClose={() => setActiveArticle(null)}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Admin: publish a new article                                        */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        title="Đăng Bài Viết Mẹo Học Tập"
        size="lg"
        icon={
          <span className="section-head-icon">
            <ShieldCheck size={16} />
          </span>
        }
      >
        <form onSubmit={handlePublish}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="articleTitle">Tiêu đề bài viết *</label>
              <input
                id="articleTitle"
                type="text"
                placeholder="Ví dụ: Bí quyết chinh phục Toán Vận Dụng Cao..."
                value={form.title}
                onChange={updateForm('title')}
                required
                /* eslint-disable-next-line jsx-a11y/no-autofocus */
                autoFocus
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="articleCategory">Chuyên mục *</label>
                <select
                  id="articleCategory"
                  value={form.category}
                  onChange={updateForm('category')}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="articleImage">URL ảnh minh họa</label>
                <input
                  id="articleImage"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={form.imageUrl}
                  onChange={updateForm('imageUrl')}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="articleContent">Nội dung bài viết *</label>
              <textarea
                id="articleContent"
                rows="8"
                placeholder="Viết nội dung chia sẻ kiến thức, mẹo thi cử..."
                value={form.content}
                onChange={updateForm('content')}
                required
              />
              <span className="field-hint">
                Để trống ô ảnh và hệ thống sẽ tự dùng ảnh minh họa mặc định.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPublishOpen(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.title.trim() || !form.content.trim()}
            >
              Xuất Bản Bài Viết
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
