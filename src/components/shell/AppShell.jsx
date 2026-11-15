import { useCallback, useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pageByRoute } from '../../lib/nav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { QuickSearch } from './QuickSearch';
import { GuestBanner } from './GuestBanner';
import { SaveAccountDialog } from './AccountDialogs';

import { Today } from '../pages/Today';
import { Focus } from '../pages/Focus';
import { Cards } from '../pages/Cards';
import { Library } from '../pages/Library';
import { Groups } from '../pages/Groups';
import { Progress } from '../pages/Progress';
import { Experiments } from '../pages/Experiments';
import { Tips } from '../pages/Tips';

const SCREENS = {
  today: Today,
  focus: Focus,
  cards: Cards,
  library: Library,
  groups: Groups,
  progress: Progress,
  experiments: Experiments,
  tips: Tips
};

const PageSkeleton = () => (
  <div className="page-skeleton" aria-busy="true" aria-label="Đang tải">
    <div className="skeleton" style={{ height: 40, width: '42%' }} />
    <div className="skeleton" style={{ height: 180 }} />
    <div className="page-skeleton-row">
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  </div>
);

/* ==========================================================================
   APP SHELL — the frame around every page once a student is inside:
   a sidebar on a laptop, a tab bar on a phone, one top bar on both.
   ========================================================================== */
export const AppShell = ({ route, theme, onToggleTheme }) => {
  const { loading, loadErrors } = useApp();

  const [searchOpen, setSearchOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const page = pageByRoute(route);
  const Screen = SCREENS[page.id];

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openSave = useCallback(() => setSaveOpen(true), []);

  /* Ctrl/⌘ + K opens search from anywhere. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="shell">
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới nội dung chính
      </a>

      <Sidebar activeId={page.id} />

      <div className="shell-main">
        <TopBar
          page={page}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenSearch={openSearch}
          onSaveAccount={openSave}
        />

        <main className="page" id="noi-dung" key={page.id}>
          <GuestBanner onSave={openSave} />

          {loadErrors.length > 0 && (
            <div className="notice notice-error page-notice" role="alert">
              <TriangleAlert size={17} aria-hidden="true" />
              <span>
                Một phần dữ liệu chưa tải được nên vài mục đang trống. Bạn kiểm tra mạng rồi tải
                lại trang nhé.
              </span>
            </div>
          )}

          {loading ? <PageSkeleton /> : <Screen />}
        </main>
      </div>

      <TabBar activeId={page.id} />

      <QuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SaveAccountDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
};
