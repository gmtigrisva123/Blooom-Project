import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../constants/nav';
import { subjectColor } from '../../constants/subjects';
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Sun,
  Moon,
  Users,
  FileText,
  Sparkles,
  Keyboard
} from 'lucide-react';

/* Accent-insensitive matching so "toan" finds "Toán". */
const normalize = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

/* Mounted only while the palette is open, so its query and cursor start fresh
   every time instead of being reset by an effect. */
const CommandPaletteDialog = () => {
  const {
    setPaletteOpen,
    setActiveTab,
    groups,
    notes,
    editorPicks,
    theme,
    toggleTheme,
    setShortcutsOpen
  } = useApp();

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  /* Everything the palette can jump to, flattened into one searchable list. */
  const commands = useMemo(() => {
    const items = [];

    NAV_ITEMS.forEach((item) => {
      const Icon = item.icon;
      items.push({
        id: `nav-${item.id}`,
        group: 'Điều hướng',
        title: item.label,
        subtitle: item.subtitle,
        color: item.color,
        hint: item.key,
        icon: <Icon size={15} />,
        run: () => setActiveTab(item.id)
      });
    });

    items.push({
      id: 'action-theme',
      group: 'Hành động',
      title: theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối',
      subtitle: 'Đổi chế độ hiển thị',
      color: '#f59e0b',
      icon: theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />,
      run: toggleTheme
    });

    items.push({
      id: 'action-shortcuts',
      group: 'Hành động',
      title: 'Xem tất cả phím tắt',
      subtitle: 'Bảng tra cứu phím tắt',
      color: '#6366f1',
      icon: <Keyboard size={15} />,
      run: () => setShortcutsOpen(true)
    });

    groups.forEach((group) => {
      items.push({
        id: `group-${group.id}`,
        group: 'Nhóm học tập',
        title: group.name,
        subtitle: `${group.subject} • ${group.memberCount} thành viên`,
        color: subjectColor(group.subject),
        icon: <Users size={15} />,
        keywords: group.description,
        run: () => setActiveTab('groups')
      });
    });

    notes.forEach((note) => {
      items.push({
        id: `note-${note.id}`,
        group: 'Ghi chú',
        title: note.title,
        subtitle: `${note.subject} • ${note.uploadedAt}`,
        color: subjectColor(note.subject),
        icon: <FileText size={15} />,
        run: () => setActiveTab('notes')
      });
    });

    editorPicks.forEach((article) => {
      items.push({
        id: `article-${article.id}`,
        group: 'Bài viết',
        title: article.title,
        subtitle: `${article.category} • ${article.createdBy}`,
        color: '#ec4899',
        icon: <Sparkles size={15} />,
        keywords: article.content,
        run: () => setActiveTab('editor')
      });
    });

    return items;
  }, [groups, notes, editorPicks, theme, toggleTheme, setActiveTab, setShortcutsOpen]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return commands.slice(0, 12);

    return commands
      .filter((item) =>
        normalize(`${item.title} ${item.subtitle || ''} ${item.keywords || ''}`).includes(q)
      )
      .slice(0, 30);
  }, [commands, query]);

  /* Group the visible results so the list stays scannable. */
  const grouped = useMemo(() => {
    const map = new Map();
    results.forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group).push(item);
    });
    return [...map.entries()];
  }, [results]);

  /* Focus after the open animation has started so it doesn't get lost. */
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  /* Keep the highlighted row inside the scroll viewport. */
  useEffect(() => {
    listRef.current
      ?.querySelector('.cmdk-item.is-active')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const onQueryChange = (value) => {
    setQuery(value);
    setCursor(0);
  };

  const runCommand = (item) => {
    setPaletteOpen(false);
    item.run();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPaletteOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter' && results[cursor]) {
      event.preventDefault();
      runCommand(results[cursor]);
    }
  };

  let flatIndex = -1;

  return (
    // role="presentation" marks the backdrop as decorative: closing by clicking
    // outside is a convenience, and Escape is the accessible way out.
    <div
      className="cmdk-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setPaletteOpen(false);
      }}
    >
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Tìm kiếm nhanh">
        <div className="cmdk-input-row">
          <Search size={18} />
          {/* Arrow/Enter/Escape live on the input, which is where focus is and
              which is natively interactive. */}
          <input
            ref={inputRef}
            className="cmdk-input"
            value={query}
            onKeyDown={onKeyDown}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Tìm nhóm học, ghi chú, bài viết hoặc lệnh..."
            aria-label="Ô tìm kiếm nhanh"
          />
          <span className="kbd">Esc</span>
        </div>

        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="cmdk-empty">
              Không tìm thấy kết quả cho “{query}”.
              <br />
              Thử từ khóa khác nhé!
            </div>
          ) : (
            grouped.map(([groupName, items]) => (
              <div key={groupName}>
                <div className="cmdk-group-label">{groupName}</div>
                {items.map((item) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  return (
                    <button
                      key={item.id}
                      className={`cmdk-item ${index === cursor ? 'is-active' : ''}`}
                      style={{ '--item-color': item.color }}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => runCommand(item)}
                    >
                      <span className="cmdk-item-icon">{item.icon}</span>
                      <span className="cmdk-item-body">
                        <span className="cmdk-item-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="cmdk-item-sub">{item.subtitle}</span>
                        )}
                      </span>
                      {item.hint && <span className="kbd">{item.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmdk-foot">
          <span className="cmdk-foot-hint">
            <ArrowUp size={11} />
            <ArrowDown size={11} /> di chuyển
          </span>
          <span className="cmdk-foot-hint">
            <CornerDownLeft size={11} /> chọn
          </span>
          <span className="cmdk-foot-hint">
            <span className="kbd">Esc</span> đóng
          </span>
        </div>
      </div>
    </div>
  );
};

export const CommandPalette = () => {
  const { paletteOpen } = useApp();
  return paletteOpen ? <CommandPaletteDialog /> : null;
};
