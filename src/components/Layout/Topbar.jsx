import { useApp } from '../../context/AppContext';
import { navItem } from '../../constants/nav';
import { Menu, Search, Sun, Moon, ShieldCheck, User, Keyboard } from 'lucide-react';

export const Topbar = () => {
  const {
    activeTab,
    user,
    toggleRole,
    theme,
    toggleTheme,
    setDrawerOpen,
    setPaletteOpen,
    setShortcutsOpen
  } = useApp();

  const current = navItem(activeTab);
  const isAdmin = user.role === 'admin';

  return (
    <header className="topbar">
      <button
        className="icon-btn topbar-menu-btn"
        onClick={() => setDrawerOpen(true)}
        aria-label="Mở menu điều hướng"
      >
        <Menu size={20} />
      </button>

      {/* The only place a section's own colour appears in the chrome. */}
      <span className="topbar-tick" aria-hidden="true" />

      <div className="topbar-title">
        <strong>{current.label}</strong>
        <span>{current.subtitle}</span>
      </div>

      <div className="topbar-actions">
        <button
          className="cmdk-trigger"
          onClick={() => setPaletteOpen(true)}
          title="Tìm kiếm nhanh (Ctrl + K)"
        >
          <Search size={15} />
          <span className="cmdk-trigger-text">Tìm kiếm nhanh...</span>
          <span className="kbd">⌘K</span>
        </button>

        <button
          className="icon-btn"
          onClick={() => setShortcutsOpen(true)}
          title="Danh sách phím tắt (?)"
        >
          <Keyboard size={18} />
        </button>

        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          aria-label="Đổi giao diện sáng/tối"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="role-switch"
          onClick={toggleRole}
          title="Nhấn để đổi vai trò thử nghiệm (Học Sinh ↔ Admin)"
        >
          {user.avatar ? (
            <img className="role-avatar" src={user.avatar} alt="" />
          ) : (
            <span className="role-avatar center">
              <User size={13} />
            </span>
          )}
          <span className={`role-tag ${isAdmin ? 'role-tag-admin' : 'role-tag-student'}`}>
            {isAdmin ? 'Admin' : 'Học sinh'}
          </span>
          {isAdmin ? (
            <ShieldCheck size={14} color="var(--c-amber-2)" />
          ) : (
            <User size={14} color="var(--c-emerald-2)" />
          )}
        </button>
      </div>
    </header>
  );
};
