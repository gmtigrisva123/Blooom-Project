import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, FileText, Layers, Lightbulb, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PAGES } from '../../lib/nav';
import { navigate } from '../../lib/router';
import { subjectLabel } from '../../lib/subjects';

/* "toán" should find "Toán", and "hoa" should find "Hóa": people search the
   way they type on a phone, without tone marks. */
const fold = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const LIMIT = 4;

/* ==========================================================================
   QUICK SEARCH — one box that reaches every page and everything the student
   has made. Ctrl/⌘ + K opens it; arrows and Enter drive it.
   ========================================================================== */
const SearchPanel = ({ onClose }) => {
  const { cards, groups, notes, articles } = useApp();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const needle = fold(query.trim());
    const match = (...fields) => fields.some((field) => fold(field).includes(needle));

    const pages = PAGES.filter((page) => !needle || match(page.label, page.hint)).map(
      (page) => ({
        key: `page-${page.id}`,
        icon: page.icon,
        title: page.label,
        meta: page.hint,
        route: page.route
      })
    );

    if (!needle) return [{ label: 'Đi tới', items: pages }];

    const sections = [
      { label: 'Trang', items: pages },
      {
        label: 'Thẻ nhớ',
        items: cards
          .filter((card) => match(card.front, card.back))
          .slice(0, LIMIT)
          .map((card) => ({
            key: `card-${card.id}`,
            icon: Layers,
            title: card.front,
            meta: subjectLabel(card.subject),
            route: 'the-nho'
          }))
      },
      {
        label: 'Nhóm học',
        items: groups
          .filter((group) => match(group.name, group.description))
          .slice(0, LIMIT)
          .map((group) => ({
            key: `group-${group.id}`,
            icon: Users,
            title: group.name,
            meta: subjectLabel(group.subject),
            route: 'nhom-hoc'
          }))
      },
      {
        label: 'Tài liệu',
        items: notes
          .filter((note) => match(note.title))
          .slice(0, LIMIT)
          .map((note) => ({
            key: `note-${note.id}`,
            icon: FileText,
            title: note.title,
            meta: subjectLabel(note.subject),
            route: 'tai-lieu'
          }))
      },
      {
        label: 'Mẹo học',
        items: articles
          .filter((article) => match(article.title))
          .slice(0, LIMIT)
          .map((article) => ({
            key: `article-${article.id}`,
            icon: Lightbulb,
            title: article.title,
            meta: article.category,
            route: 'meo-hoc'
          }))
      }
    ];

    return sections.filter((section) => section.items.length > 0);
  }, [query, cards, groups, notes, articles]);

  const flat = results.flatMap((section) => section.items);
  const active = Math.min(cursor, Math.max(0, flat.length - 1));

  const go = (item) => {
    onClose();
    navigate(item.route);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor(flat.length === 0 ? 0 : (active + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(flat.length === 0 ? 0 : (active - 1 + flat.length) % flat.length);
    } else if (event.key === 'Enter' && flat[active]) {
      event.preventDefault();
      go(flat[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let position = -1;

  return (
    <div
      className="dialog-scrim search-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="Tìm nhanh">
        <div className="search-box">
          <Search size={20} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Tìm thẻ, nhóm, tài liệu, trang…"
            aria-label="Tìm kiếm"
            /* The panel exists only to be typed into. */
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus
          />
          <kbd>Esc</kbd>
        </div>

        <div className="search-results">
          {flat.length === 0 ? (
            <p className="search-empty">Không tìm thấy gì cho “{query}”.</p>
          ) : (
            results.map((section) => (
              <div key={section.label}>
                <span className="search-label">{section.label}</span>
                {section.items.map((item) => {
                  position += 1;
                  const index = position;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`search-item ${index === active ? 'is-active' : ''}`}
                      onClick={() => go(item)}
                      onMouseEnter={() => setCursor(index)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="grow truncate">{item.title}</span>
                      <span className="tiny faint truncate">{item.meta}</span>
                      {index === active && <CornerDownLeft size={15} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const QuickSearch = ({ open, onClose }) =>
  open ? createPortal(<SearchPanel onClose={onClose} />, document.body) : null;
