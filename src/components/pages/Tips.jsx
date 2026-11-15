import { useMemo, useState } from 'react';
import { Bookmark, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../services/gamification';
import { Empty, PageHead, SearchField } from '../ui/bits';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/* The category strings are what the database stores; never rename them. */
const CATEGORIES = ['Mẹo học tập', 'Kỹ năng ghi nhớ', 'Năng suất'];
const ALL = 'all';
const SAVED = 'saved';

const BLANK = {
  title: '',
  category: CATEGORIES[0],
  content: '',
  imageUrl: '',
  sourceUrl: '',
  sourceLabel: ''
};

const paragraphs = (text) =>
  String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const SaveButton = ({ article, saved, onToggle, withCount = true }) => (
  <button
    type="button"
    className={`save-btn ${saved ? 'is-saved' : ''}`}
    onClick={(event) => {
      event.stopPropagation();
      onToggle(article.id);
    }}
    aria-pressed={saved}
    aria-label={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
  >
    <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
    {withCount && article.likesCount > 0 && <span className="num">{article.likesCount}</span>}
  </button>
);

const PublishForm = ({ onClose }) => {
  const { addArticle } = useApp();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const set = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  const ready = form.title.trim() && form.content.trim();

  const submit = async (event) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    /* The author is whoever is signed in, set by the server — not a name the
       form sends — so nobody can publish as someone else. */
    const created = await addArticle({
      title: form.title,
      category: form.category,
      content: form.content,
      imageUrl: form.imageUrl.trim() || null,
      sourceUrl: form.sourceUrl.trim() || null,
      sourceLabel: form.sourceLabel.trim() || null
    });
    setBusy(false);
    if (created) onClose();
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        <div className="field">
          <label htmlFor="tipTitle">Tiêu đề</label>
          <input
            id="tipTitle"
            className="input"
            type="text"
            maxLength={240}
            value={form.title}
            onChange={set('title')}
            data-autofocus
          />
        </div>
        <div className="field">
          <label htmlFor="tipCategory">Chủ đề</label>
          <select
            id="tipCategory"
            className="select"
            value={form.category}
            onChange={set('category')}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tipContent">Nội dung</label>
          <textarea
            id="tipContent"
            className="textarea"
            rows={7}
            value={form.content}
            onChange={set('content')}
          />
          <span className="field-hint">Xuống dòng để tách đoạn.</span>
        </div>
        <div className="field">
          <label htmlFor="tipImage">Đường dẫn ảnh bìa (không bắt buộc)</label>
          <input
            id="tipImage"
            className="input"
            type="url"
            placeholder="https://…"
            value={form.imageUrl}
            onChange={set('imageUrl')}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tipSourceLabel">Tên nguồn (không bắt buộc)</label>
            <input
              id="tipSourceLabel"
              className="input"
              type="text"
              value={form.sourceLabel}
              onChange={set('sourceLabel')}
            />
          </div>
          <div className="field">
            <label htmlFor="tipSource">Đường dẫn nguồn</label>
            <input
              id="tipSource"
              className="input"
              type="url"
              placeholder="https://…"
              value={form.sourceUrl}
              onChange={set('sourceUrl')}
            />
          </div>
        </div>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>
          {busy ? 'Đang đăng…' : 'Đăng bài'}
        </button>
      </div>
    </form>
  );
};

/* ==========================================================================
   TIPS — short articles on how to study, picked by Blooom's editors.
   ========================================================================== */
export const Tips = () => {
  const { articles, bookmarks, toggleBookmark, deleteArticle, isEditor } = useApp();

  const [filter, setFilter] = useState(ALL);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [doomed, setDoomed] = useState(null);

  const filters = [
    { value: ALL, label: 'Tất cả' },
    { value: SAVED, label: 'Đã lưu', count: bookmarks.length },
    ...CATEGORIES.filter((category) => articles.some((a) => a.category === category)).map(
      (category) => ({ value: category, label: category })
    )
  ];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles
      .filter((article) => {
        if (filter === ALL) return true;
        if (filter === SAVED) return bookmarks.includes(article.id);
        return article.category === filter;
      })
      .filter(
        (article) =>
          !needle ||
          article.title.toLowerCase().includes(needle) ||
          article.content.toLowerCase().includes(needle)
      );
  }, [articles, bookmarks, filter, query]);

  const reading = articles.find((article) => article.id === openId) || null;

  const publishButton = isEditor && (
    <button type="button" className="btn btn-primary" onClick={() => setPublishing(true)}>
      <Plus size={18} aria-hidden="true" /> Đăng bài
    </button>
  );

  return (
    <div className="stack-lg">
      <PageHead
        title="Mẹo học"
        description="Bài viết ngắn về cách học cho hiệu quả."
        action={publishButton}
      />

      {articles.length === 0 ? (
        <div className="card">
          <Empty title="Chưa có bài viết nào" action={publishButton}>
            Các bài mẹo học sẽ xuất hiện ở đây khi được đăng.
          </Empty>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="chips" role="group" aria-label="Lọc bài viết">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`chip ${filter === item.value ? 'is-active' : ''}`}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  {item.count > 0 && <span className="chip-count">{item.count}</span>}
                </button>
              ))}
            </div>
            <SearchField value={query} onChange={setQuery} placeholder="Tìm bài viết…" />
          </div>

          {visible.length === 0 ? (
            <div className="card">
              <Empty
                title={filter === SAVED ? 'Bạn chưa lưu bài nào' : 'Không tìm thấy bài nào'}
              >
                {filter === SAVED
                  ? 'Bấm biểu tượng đánh dấu trên một bài để đọc lại sau.'
                  : 'Thử từ khóa khác hoặc chọn chủ đề khác.'}
              </Empty>
            </div>
          ) : (
            <ul className="tips">
              {visible.map((article) => (
                <li key={article.id} className="card tip">
                  {article.imageUrl && (
                    <img className="tip-cover" src={article.imageUrl} alt="" loading="lazy" />
                  )}
                  <div className="tip-body">
                    <span className="tag">{article.category}</span>
                    <h3>
                      <button
                        type="button"
                        className="tip-open"
                        onClick={() => setOpenId(article.id)}
                      >
                        {article.title}
                      </button>
                    </h3>
                    <p className="small muted clamp-3">{article.content}</p>
                    <div className="row-between tip-foot">
                      <span className="tiny muted truncate">
                        {article.createdBy ? `${article.createdBy}, ` : ''}
                        {formatDate(article.createdAt)}
                      </span>
                      <SaveButton
                        article={article}
                        saved={bookmarks.includes(article.id)}
                        onToggle={toggleBookmark}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog
        open={Boolean(reading)}
        onClose={() => setOpenId(null)}
        title={reading?.title || ''}
        description={
          reading
            ? `${reading.category}, ${reading.createdBy ? `${reading.createdBy}, ` : ''}${formatDate(reading.createdAt)}`
            : ''
        }
        wide
      >
        {reading && (
          <>
            <div className="dialog-body article">
              {reading.imageUrl && <img src={reading.imageUrl} alt="" />}
              {paragraphs(reading.content).map((text, index) => (
                <p key={index}>{text}</p>
              ))}
              {reading.sourceUrl && (
                <a
                  className="link small"
                  href={reading.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Nguồn: {reading.sourceLabel || reading.sourceUrl}{' '}
                  <ExternalLink size={14} aria-hidden="true" style={{ display: 'inline' }} />
                </a>
              )}
            </div>
            <div className="dialog-foot">
              {isEditor && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setOpenId(null);
                    setDoomed(reading);
                  }}
                >
                  <Trash2 size={17} aria-hidden="true" /> Xóa bài
                </button>
              )}
              <button
                type="button"
                className={`btn ${bookmarks.includes(reading.id) ? '' : 'btn-primary'}`}
                onClick={() => toggleBookmark(reading.id)}
              >
                <Bookmark
                  size={17}
                  fill={bookmarks.includes(reading.id) ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                {bookmarks.includes(reading.id) ? 'Đã lưu' : 'Lưu để đọc lại'}
              </button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={publishing} onClose={() => setPublishing(false)} title="Đăng bài mới" wide>
        <PublishForm onClose={() => setPublishing(false)} />
      </Dialog>

      <ConfirmDialog
        open={Boolean(doomed)}
        onClose={() => setDoomed(null)}
        onConfirm={() => deleteArticle(doomed.id)}
        title="Xóa bài viết này?"
        description={doomed ? `“${doomed.title}” sẽ biến mất với mọi người.` : ''}
      />
    </div>
  );
};
