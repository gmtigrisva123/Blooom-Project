import { useApp } from '../../context/AppContext';
import { NAV_GROUPS, navItemsInGroup } from '../../constants/nav';
import {
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Flame,
  Trophy,
  LogOut,
  Download
} from 'lucide-react';

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
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span className="level-ring-num mono">{level}</span>
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
    newBadgeIds,
    /* `user` là hồ sơ đọc từ bảng profiles và tự cập nhật khi người dùng sửa
       tên hay vai trò; `account` chỉ là ảnh chụp lúc đăng nhập, nên hiển thị
       nó ở đây sẽ khiến tên cũ đứng yên sau khi đổi. */
    user,
    onSignOut,
    handleExportData
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
            <span className="brand-sub mono">học · đo · kiểm chứng</span>
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

      <div className="sidebar-groups">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="sidebar-label mono mb-2">{group.label}</div>
            <ul className="sidebar-nav">
              {navItemsInGroup(group.id).map((item) => {
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
                        <Icon size={15} />
                      </span>
                      <span className="nav-link-text">{item.label}</span>
                      <span className="nav-link-key kbd">{item.key}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
              <div className="level-xp mono">
                {level.xpIntoLevel}/{level.xpForNextLevel} XP → Cấp {level.level + 1}
              </div>
            </div>
          </div>

          <div className="level-card-detail">
            <div className="bar bar-sm">
              <div className="bar-fill xp-bar-fill" style={{ width: `${level.percent}%` }} />
            </div>

            <div className="row-between" style={{ marginTop: '0.45rem' }}>
              <span className="streak-line mono">
                <Flame size={13} />
                {streak.current} ngày
              </span>
              <span className="t-xs t-dim row mono" style={{ gap: '0.2rem' }}>
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

        <div className="account-row">
          <span className="account-avatar" aria-hidden="true">
            {(user?.name || '?').trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div className="account-detail">
            <span className="account-name truncate">{user?.name || 'Khách'}</span>
            <span className="account-mail truncate mono">
              {user?.email || 'Tài khoản dùng thử'}
            </span>
          </div>

          {/* Học sinh sở hữu dữ liệu của mình và phải lấy ra được ở dạng máy
              đọc được — cả vì lý do đạo đức, và vì một kết quả phân tích chỉ
              đáng tin khi người khác chạy lại được trên dữ liệu thô. */}
          <button
            className="icon-btn"
            onClick={handleExportData}
            title="Tải toàn bộ dữ liệu của bạn về dạng JSON"
            aria-label="Tải toàn bộ dữ liệu của bạn về dạng JSON"
          >
            <Download size={16} />
          </button>

          <button
            className="icon-btn account-out"
            onClick={onSignOut}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>

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
