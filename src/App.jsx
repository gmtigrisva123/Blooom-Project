import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import { authService } from './services/auth';
import { isSupabaseConfigured } from './services/supabase';
import { purgeLegacyLocalData } from './services/storage';

import { LandingPage } from './components/Landing/LandingPage';
import { AuthScreen } from './components/Auth/AuthScreen';
import { SetupScreen } from './components/Setup/SetupScreen';

import { Sidebar } from './components/Layout/Sidebar';
import { Topbar } from './components/Layout/Topbar';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { ShortcutsModal } from './components/CommandPalette/ShortcutsModal';

import { Dashboard } from './components/Dashboard/Dashboard';
import { StudyGroups } from './components/Groups/StudyGroups';
import { WorkTimer } from './components/Timer/WorkTimer';
import { EditorPicks } from './components/EditorPick/EditorPicks';
import { PerformanceTracker } from './components/Performance/PerformanceTracker';
import { NotesManager } from './components/Notes/NotesManager';
import { RecallLab } from './components/Recall/RecallLab';
import { ExperimentLab } from './components/Lab/ExperimentLab';
import { Insights } from './components/Insights/Insights';

const PAGES = {
  dashboard: Dashboard,
  groups: StudyGroups,
  timer: WorkTimer,
  editor: EditorPicks,
  performance: PerformanceTracker,
  notes: NotesManager,
  recall: RecallLab,
  lab: ExperimentLab,
  insights: Insights
};

const AppContent = () => {
  const { activeTab, sidebarCollapsed, drawerOpen, setDrawerOpen, loadErrors } = useApp();

  useKeyboardShortcuts();

  const Page = PAGES[activeTab] || Dashboard;

  return (
    /* data-section carries the section's marker colour — see styles/tokens.css */
    <div className={`shell ${sidebarCollapsed ? 'is-collapsed' : ''}`} data-section={activeTab}>
      <Sidebar />

      {drawerOpen && (
        <button
          className="drawer-scrim"
          onClick={() => setDrawerOpen(false)}
          aria-label="Đóng menu điều hướng"
        />
      )}

      <div className="content-col">
        <Topbar />

        <main className="page" key={activeTab}>
          {/* Một bảng không tải được không được phép làm trắng cả ứng dụng, nhưng
              cũng không được phép trông giống như "bạn chưa có dữ liệu". */}
          {loadErrors.length > 0 && (
            <div className="auth-error" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              <span>
                Một phần dữ liệu chưa tải được: {loadErrors.join(' ')} Những mục liên quan đang
                hiển thị trống — đây là lỗi kết nối, không phải bạn chưa có dữ liệu.
              </span>
            </div>
          )}

          <Page />
        </main>

        <footer className="app-footer">
          <strong>Blooom v3.0 — Nền tảng học tập dựa trên bằng chứng</strong>
          <span>React + Vite • Design system CSS thuần • Dữ liệu lưu trên PostgreSQL</span>
        </footer>
      </div>

      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
};

/* ==========================================================================
   ROOT — bốn khung hình, không dùng router.

   Ứng dụng vốn là một trang duy nhất; thêm react-router cho vài màn hình phụ
   sẽ tốn một phụ thuộc và một lần đổi cấu hình build mà không đổi lại được
   gì. Khung hình là state, và bề mặt liên kết sâu vẫn như cũ.
   ========================================================================== */
export function App() {
  const { theme, toggleTheme } = useTheme();

  const [account, setAccount] = useState(null);
  /* Thiếu cấu hình là điều biết được ngay lúc dựng bundle, nên nó là giá trị
     khởi tạo chứ không phải một hiệu ứng — như vậy màn hình hướng dẫn hiện ra
     ở lần render đầu tiên, không nháy qua "đang kết nối" rồi mới đổi. */
  const [view, setView] = useState(() => (isSupabaseConfigured ? 'booting' : 'setup'));
  const [authMode, setAuthMode] = useState('login');

  /* Dữ liệu của các phiên bản cũ — trong đó có cả bộ dữ liệu mẫu được sinh
     sẵn — vẫn nằm trong localStorage của bất kỳ ai từng mở bản trước. Dọn
     một lần lúc khởi động, trước khi bất cứ thứ gì có cơ hội đọc phải nó. */
  useEffect(() => {
    purgeLegacyLocalData();
  }, []);

  /* Khôi phục phiên đăng nhập đã lưu. Bất đồng bộ vì Supabase có thể phải gia
     hạn token trước khi trả lời, nên có một khung hình "đang khởi động" thay
     vì nháy qua trang giới thiệu rồi mới nhảy vào ứng dụng. */
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let cancelled = false;

    authService
      .currentAccount()
      .then((restored) => {
        if (cancelled) return;
        setAccount(restored);
        setView(restored ? 'app' : 'landing');
      })
      .catch(() => {
        if (!cancelled) setView('landing');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Token hết hạn, hoặc đăng xuất ở một tab khác, phải được phản ánh ở đây —
     nếu không, tab này sẽ hiển thị giao diện của một phiên đã chết và mọi
     thao tác ghi đều thất bại một cách khó hiểu. */
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    return authService.onAuthStateChange((next) => {
      setAccount(next);
      /* Chỉ đá người dùng ra khi phiên mất TRONG LÚC họ đang ở trong ứng dụng.
         Sự kiện đăng nhập thì để luồng gọi nó tự chuyển khung hình, nếu không
         một lần gia hạn token cũng sẽ kéo người đang đọc trang giới thiệu vào
         thẳng ứng dụng. */
      if (!next) setView((current) => (current === 'app' ? 'landing' : current));
    });
  }, []);

  const openAuth = useCallback((mode) => {
    setAuthMode(mode);
    setView('auth');
  }, []);

  const handleAuthenticated = useCallback((next) => {
    setAccount(next);
    setView('app');
  }, []);

  const handleSignOut = useCallback(async () => {
    await authService.logout();
    setAccount(null);
    setView('landing');
  }, []);

  if (view === 'setup') return <SetupScreen />;

  if (view === 'booting') {
    return (
      <div className="boot-screen">
        <span className="spinner" aria-hidden="true" />
        <p>Đang kết nối cơ sở dữ liệu…</p>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignIn={() => openAuth('login')}
        onSignUp={() => openAuth('signup')}
        onGuest={() => openAuth('guest')}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthenticated={handleAuthenticated}
        onBack={() => setView('landing')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    /* Keyed on the account so switching profiles remounts the provider and it
       re-reads every collection for the new user. */
    <AppProvider
      key={account?.id || 'none'}
      account={account}
      onSignOut={handleSignOut}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      <AppContent />
    </AppProvider>
  );
}

export default App;
