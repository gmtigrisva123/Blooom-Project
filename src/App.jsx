import { AppProvider, useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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

const PAGES = {
  dashboard: Dashboard,
  groups: StudyGroups,
  timer: WorkTimer,
  editor: EditorPicks,
  performance: PerformanceTracker,
  notes: NotesManager
};

const AppContent = () => {
  const { activeTab, sidebarCollapsed, drawerOpen, setDrawerOpen } = useApp();

  useKeyboardShortcuts();

  const Page = PAGES[activeTab] || Dashboard;

  return (
    /* data-section drives the whole accent palette — see styles/tokens.css */
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
          <strong>
            StudyHub v2.0 — Nền Tảng Nhóm Học Tập Tương Tác Cho Học Sinh &amp; Sinh Viên
          </strong>
          <span>
            Đồ án học tập • React + Vite • Design system CSS thuần • LocalStorage &amp; phân
            quyền Học Sinh / Admin
          </span>
        </footer>
      </div>

      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
