import { useCallback, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import { authService } from './services/auth';

import { LandingPage } from './components/Landing/LandingPage';
import { AuthScreen } from './components/Auth/AuthScreen';

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
  const { activeTab, sidebarCollapsed, drawerOpen, setDrawerOpen } = useApp();

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
          <Page />
        </main>

        <footer className="app-footer">
          <strong>Blooom v3.0 — Nền tảng học tập dựa trên bằng chứng</strong>
          <span>
            React + Vite • Design system CSS thuần • Dữ liệu lưu cục bộ trong trình duyệt
          </span>
        </footer>
      </div>

      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
};

/* ==========================================================================
   ROOT — three views, no router.
   The app has always been a single page; adding react-router for two extra
   screens would cost a dependency and a build-config change for nothing. The
   view is state, and the deep-linkable surface is unchanged.
   ========================================================================== */
export function App() {
  const { theme, toggleTheme } = useTheme();

  /* A stored session skips straight past the landing page on reload. */
  const [account, setAccount] = useState(() => authService.currentAccount());
  const [view, setView] = useState(() => (authService.currentAccount() ? 'app' : 'landing'));
  const [authMode, setAuthMode] = useState('login');

  const openAuth = useCallback((mode) => {
    setAuthMode(mode);
    setView('auth');
  }, []);

  const handleAuthenticated = useCallback((next) => {
    setAccount(next);
    setView('app');
  }, []);

  /* Guest mode uses the shared, unnamespaced store — the same one the app used
     before accounts existed, so nothing recorded back then is stranded. */
  const enterAsGuest = useCallback(() => {
    setAccount(null);
    setView('app');
  }, []);

  const handleSignOut = useCallback(() => {
    authService.logout();
    setAccount(null);
    setView('landing');
  }, []);

  if (view === 'landing') {
    return (
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignIn={() => openAuth('login')}
        onSignUp={() => openAuth('signup')}
        onGuest={enterAsGuest}
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
        onGuest={enterAsGuest}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    /* Keyed on the account so switching profiles remounts the provider and it
       re-reads every collection from the new storage namespace. */
    <AppProvider
      key={account?.id || 'guest'}
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
