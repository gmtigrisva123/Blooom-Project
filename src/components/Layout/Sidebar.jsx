import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../constants/nav';
import { PanelLeftClose, PanelLeftOpen, X, Flame, Trophy } from 'lucide-react';

// Served straight from public/ so the splash in index.html and the sidebar
// share one cached file. BASE_URL keeps the GitHub Pages sub-path working.
const BRAND_LOGO = `${import.meta.env.BASE_URL}blooom-logo.png`;
const BRAND_MARK = `${import.meta.env.BASE_URL}blooom-mark.png`;

/* Compact radial gauge showing progress toward the next level. */
const LevelRing = ({ percent, level }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="level-ring">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="var(--bg-active)"
          strokeWidth="4"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="url(#levelGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <defs>
          <linearGradient id="levelGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <span className="level-ring-num">{level}</span>
    </div>
  );
};

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    drawerOpen,
    setDrawerOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    gamification,
    newBadgeIds
  } = useApp();

  const { level, streak, unlockedCount, badges } = gamification;

  return (
    <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Điều hướng chính">
      <div className="row-between">
        <button
          className="sidebar-brand"
          onClick={() => setActiveTab('dashboard')}
          title="Blooom — về trang Tổng Quan"
        >
          {/* The "B" stands in for the wordmark once the rail collapses. */}
          <img className="brand-mark" src={BRAND_MARK} alt="" aria-hidden="true" />
          <span className="brand-text">
            <img className="brand-logo" src={BRAND_LOGO} alt="Blooom" />
            <span className="brand-sub">Học nhóm • Tập trung • Tiến bộ</span>
          </span>
        </button>

        <button
          className="icon-btn sidebar-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Đóng menu"
        >
          <X size={18} />
        </button>
      </div>

      <div>
        <div className="sidebar-label mb-2">Khu vực</div>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`nav-link ${isActive ? 'is-active' : ''}`}
                  style={{ '--item-color': item.color }}
                  onClick={() => setActiveTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-link-icon">
                    <Icon size={16} />
                  </span>
                  <span className="nav-link-text">{item.label}</span>
                  <span className="nav-link-key kbd">{item.key}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-spacer" />

      <div className="sidebar-foot">
        <button
          className="level-card"
          onClick={() => setActiveTab('performance')}
          title={`Cấp ${level.level} — ${level.title}. Còn ${level.xpRemaining} XP để lên cấp.`}
        >
          <div className="level-card-top">
            <LevelRing percent={level.percent} level={level.level} />
            <div className="level-card-detail">
              <div className="level-title">{level.title}</div>
              <div className="level-xp">
                {level.xpIntoLevel}/{level.xpForNextLevel} XP → Cấp {level.level + 1}
              </div>
            </div>
          </div>

          <div className="level-card-detail">
            <div className="bar bar-sm">
              <div className="bar-fill xp-bar-fill" style={{ width: `${level.percent}%` }} />
            </div>

            <div className="row-between" style={{ marginTop: '0.45rem' }}>
              <span className="streak-line">
                <Flame size={13} />
                {streak.current} ngày liên tiếp
              </span>
              <span className="t-xs t-dim row" style={{ gap: '0.2rem' }}>
                <Trophy size={12} />
                {unlockedCount}/{badges.length}
                {newBadgeIds.length > 0 && (
                  <span className="badge badge-danger" style={{ padding: '0 0.3rem' }}>
                    +{newBadgeIds.length}
                  </span>
                )}
              </span>
            </div>
          </div>
        </button>

        <button
          className="btn btn-ghost btn-sm btn-block sidebar-collapse-btn"
          onClick={toggleSidebarCollapsed}
          title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          <span className="nav-link-text">{sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>
        </button>
      </div>
    </aside>
  );
};
