import { Moon, Search, Sun, X } from 'lucide-react';
import { SUBJECTS, subjectColor, subjectLabel } from '../../lib/subjects';

/* ==========================================================================
   SMALL SHARED PARTS · the pieces every screen reaches for.
   ========================================================================== */

const LOGO_SRC = `${import.meta.env.BASE_URL}blooom-logo.png`;

export const Logo = ({ height = 34, className = '' }) => (
  <img
    className={className}
    src={LOGO_SRC}
    alt="Blooom"
    width={Math.round((height * 459) / 152)}
    height={height}
    style={{ height, width: 'auto' }}
    decoding="async"
  />
);

/* Progress as a strip of kraft paper. `value` runs 0 to 1. The fill is
   scaled, never resized, so it animates without moving the layout. */
export const Bar = ({ value = 0, color, label }) => {
  const amount = Math.min(1, Math.max(0, value));

  return (
    <div
      className="bar"
      style={{ '--bar-color': color }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(amount * 100)}
    >
      <span style={{ transform: `scaleX(${amount})` }} />
    </div>
  );
};

export const Empty = ({ icon, title, children, action }) => (
  <div className="empty">
    {icon && (
      <span className="empty-art" aria-hidden="true">
        {icon}
      </span>
    )}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

export const SubjectTag = ({ subject }) => (
  <span className="tag" style={{ '--dot': subjectColor(subject) }}>
    <span className="tag-dot" />
    {subjectLabel(subject)}
  </span>
);

/* Filter chips for a subject, with an "all" option in front. */
export const SubjectChips = ({ value, onChange, allLabel = 'Tất cả', counts = null }) => (
  <div className="chips" role="group" aria-label="Lọc theo môn">
    <button
      type="button"
      className={`chip ${value === null ? 'is-active' : ''}`}
      aria-pressed={value === null}
      onClick={() => onChange(null)}
    >
      {allLabel}
    </button>
    {SUBJECTS.filter((s) => !counts || counts[s.value] > 0).map((s) => (
      <button
        key={s.value}
        type="button"
        className={`chip ${value === s.value ? 'is-active' : ''}`}
        aria-pressed={value === s.value}
        onClick={() => onChange(s.value)}
      >
        <span className="tag-dot" style={{ '--dot': s.color }} />
        {s.label}
        {counts && <span className="chip-count">{counts[s.value]}</span>}
      </button>
    ))}
  </div>
);

export const SubjectSelect = ({ id, value, onChange, disabled = false }) => (
  <select
    id={id}
    className="select"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disabled={disabled}
  >
    {SUBJECTS.map((s) => (
      <option key={s.value} value={s.value}>
        {s.label}
      </option>
    ))}
  </select>
);

export const SearchField = ({ value, onChange, placeholder, label }) => (
  <div className="input-icon search-field">
    <Search size={18} aria-hidden="true" />
    <input
      className="input"
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label || placeholder}
    />
    {value && (
      <button
        type="button"
        className="icon-btn"
        onClick={() => onChange('')}
        aria-label="Xóa nội dung tìm kiếm"
      >
        <X size={16} />
      </button>
    )}
  </div>
);

export const ThemeToggle = ({ theme, onToggle }) => (
  <button
    type="button"
    className="icon-btn"
    onClick={onToggle}
    aria-label={theme === 'dark' ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
  >
    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
  </button>
);

/* The first letter of a name, for the round avatar. */
export const Avatar = ({ name, size = 40 }) => (
  <span className="avatar" style={{ width: size, height: size }} aria-hidden="true">
    {(name || 'B').trim().charAt(0) || 'B'}
  </span>
);

/* Page heading used at the top of every screen inside the app. */
export const PageHead = ({ title, description, action }) => (
  <header className="page-head">
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action && <div className="page-head-action">{action}</div>}
  </header>
);
