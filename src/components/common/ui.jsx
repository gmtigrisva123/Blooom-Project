import { Search, X } from 'lucide-react';
import { subjectColor } from '../../constants/subjects';

/* ==========================================================================
   HERO — the intro block at the top of every section page
   ========================================================================== */
export const Hero = ({ eyebrow, icon, title, description, action }) => (
  <section className="hero">
    <div className="hero-inner">
      <div className="hero-copy">
        {eyebrow && (
          <span className="badge badge-accent badge-eyebrow">
            {icon}
            {eyebrow}
          </span>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  </section>
);

/* ==========================================================================
   EMPTY STATE
   ========================================================================== */
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="panel empty">
    <div className="empty-art" aria-hidden="true">
      {icon}
    </div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

/* ==========================================================================
   STAT TILE
   ========================================================================== */
export const StatCard = ({ icon, label, value, unit, note, color }) => (
  <div className="card stat" style={color ? { '--tile-color': color } : undefined}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <span className="stat-label">{label}</span>
      <div className="stat-value">
        {value}
        {unit && <small> {unit}</small>}
      </div>
      {note && <span className="stat-note">{note}</span>}
    </div>
  </div>
);

/* ==========================================================================
   SUBJECT BADGE — colour comes from the shared subject table
   ========================================================================== */
export const SubjectBadge = ({ subject, className = '', children }) => (
  <span
    className={`badge badge-subject ${className}`}
    style={{ '--subject-color': subjectColor(subject) }}
  >
    {children || subject}
  </span>
);

/* ==========================================================================
   SEARCH INPUT
   ========================================================================== */
export const SearchInput = ({ value, onChange, placeholder, label }) => (
  <div className="search">
    <Search size={16} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label || placeholder}
    />
    {value && (
      <button className="search-clear" onClick={() => onChange('')} aria-label="Xóa tìm kiếm">
        <X size={14} />
      </button>
    )}
  </div>
);

/* ==========================================================================
   FILTER CHIP ROW
   ========================================================================== */
export const ChipRow = ({ options, value, onChange }) => (
  <div className="chip-row" role="tablist">
    {options.map((option) => {
      const key = option.value ?? option;
      const label = option.label ?? option;
      return (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          className={`chip ${value === key ? 'is-active' : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
          {option.count != null && <span className="chip-count">{option.count}</span>}
        </button>
      );
    })}
  </div>
);

/* ==========================================================================
   PROGRESS BAR
   ========================================================================== */
export const ProgressBar = ({ percent, color, size = '' }) => (
  <div className={`bar ${size ? `bar-${size}` : ''}`}>
    <div
      className="bar-fill"
      style={{
        width: `${Math.min(100, Math.max(0, percent))}%`,
        ...(color ? { background: color } : null)
      }}
    />
  </div>
);

/* ==========================================================================
   SKELETONS — shown while the app hydrates from localStorage
   ========================================================================== */
export const SkeletonCards = ({ count = 6, media = true }) => (
  <div className="grid grid-3">
    {Array.from({ length: count }, (_, i) => (
      <div className="card" key={i}>
        {media && <div className="skeleton skeleton-thumb" />}
        <div className="card-pad">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          <div className="skeleton skeleton-text" style={{ width: '45%', marginTop: '1rem' }} />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonPanel = ({ height = '18rem' }) => (
  <div className="panel panel-pad">
    <div className="skeleton skeleton-title" />
    <div className="skeleton" style={{ height, borderRadius: 'var(--r-md)' }} />
  </div>
);

export const SkeletonRows = ({ count = 4 }) => (
  <div className="stack-3">
    {Array.from({ length: count }, (_, i) => (
      <div className="list-row" key={i}>
        <div
          className="skeleton skeleton-circle"
          style={{ width: '2.4rem', height: '2.4rem' }}
        />
        <div className="grow">
          <div className="skeleton skeleton-text" style={{ width: '55%' }} />
          <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
        </div>
      </div>
    ))}
  </div>
);
