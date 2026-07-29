import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} from 'react';
import { storageService } from '../services/storage';
import { computeGamification } from '../services/gamification';

const AppContext = createContext();

let toastSeq = 0;

export const AppProvider = ({ children }) => {
  /* ---- Domain data ------------------------------------------------------ */
  const [user, setUser] = useState(storageService.getUser());
  const [groups, setGroups] = useState(storageService.getGroups());
  const [timerSessions, setTimerSessions] = useState(storageService.getTimerSessions());
  const [performanceGoals, setPerformanceGoals] = useState(
    storageService.getPerformanceGoals()
  );
  const [editorPicks, setEditorPicks] = useState(storageService.getEditorPicks());
  const [bookmarks, setBookmarks] = useState(storageService.getBookmarks());
  const [notes, setNotes] = useState(storageService.getNotes());

  /* ---- Interface state -------------------------------------------------- */
  const [activeTab, setActiveTabRaw] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('studyhub_theme') || 'dark');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => storageService.getUiPrefs().sidebarCollapsed
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isBooting, setIsBooting] = useState(true);

  /* Lets the global Space/R shortcuts drive the Pomodoro without the timer
     having to live in context — WorkTimer registers its controls here. */
  const timerControlsRef = useRef(null);

  /* ---- Theme ------------------------------------------------------------ */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('studyhub_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  /* ---- Skeleton on first paint ------------------------------------------ */
  useEffect(() => {
    const id = setTimeout(() => setIsBooting(false), 450);
    return () => clearTimeout(id);
  }, []);

  /* ---- Sidebar ---------------------------------------------------------- */
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      storageService.setUiPrefs({ sidebarCollapsed: !prev });
      return !prev;
    });
  }, []);

  const setActiveTab = useCallback((tab) => {
    setActiveTabRaw(tab);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* ---- Toasts ----------------------------------------------------------- */
  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ---- Role ------------------------------------------------------------- */
  const toggleRole = useCallback(() => {
    setUser((prev) => {
      const role = prev.role === 'student' ? 'admin' : 'student';
      const updated = { ...prev, role };
      storageService.setUser(updated);
      showToast(
        `Đã chuyển sang vai trò: ${role === 'admin' ? 'Biên Tập Viên / Admin' : 'Học Sinh'}`,
        'info'
      );
      return updated;
    });
  }, [showToast]);

  /* ---- Groups ----------------------------------------------------------- */
  const handleAddGroup = useCallback(
    (groupData) => {
      const created = storageService.addGroup(groupData);
      setGroups(storageService.getGroups());
      showToast(`Đã tạo nhóm học "${created.name}" thành công!`);
      return created;
    },
    [showToast]
  );

  const handleToggleJoinGroup = useCallback(
    (groupId) => {
      const updated = storageService.toggleJoinGroup(groupId);
      setGroups(updated);
      const group = updated.find((g) => g.id === groupId);
      const isMember = group?.members.includes(user.id);
      showToast(
        isMember ? `Đã tham gia nhóm "${group?.name}"` : `Đã rời nhóm "${group?.name}"`,
        isMember ? 'success' : 'info'
      );
    },
    [showToast, user.id]
  );

  /* ---- Timer sessions --------------------------------------------------- */
  const handleSaveTimerSession = useCallback(
    (sessionData) => {
      const saved = storageService.saveTimerSession(sessionData);
      setTimerSessions(storageService.getTimerSessions());
      showToast(
        `Hoàn thành ${sessionData.durationMinutes} phút môn ${sessionData.subject}! +${sessionData.durationMinutes} XP 🎉`
      );
      return saved;
    },
    [showToast]
  );

  /* ---- Goals ------------------------------------------------------------ */
  const handleUpdateGoals = useCallback(
    (newGoals) => {
      storageService.setPerformanceGoals(newGoals);
      setPerformanceGoals(newGoals);
      showToast('Đã cập nhật mục tiêu học tập tuần thành công!');
    },
    [showToast]
  );

  /* ---- Editor picks ----------------------------------------------------- */
  const handleAddEditorPick = useCallback(
    (article) => {
      const created = storageService.addEditorPick(article);
      setEditorPicks(storageService.getEditorPicks());
      showToast('Đã đăng bài viết mẹo học tập mới thành công!');
      return created;
    },
    [showToast]
  );

  const handleDeleteEditorPick = useCallback(
    (id) => {
      setEditorPicks(storageService.deleteEditorPick(id));
      showToast('Đã xóa bài viết khỏi danh sách.', 'info');
    },
    [showToast]
  );

  const handleToggleBookmark = useCallback(
    (articleId) => {
      const updated = storageService.toggleBookmark(articleId);
      setBookmarks(updated);
      showToast(
        updated.includes(articleId)
          ? 'Đã lưu bài viết vào danh sách yêu thích!'
          : 'Đã bỏ lưu bài viết.',
        'info'
      );
    },
    [showToast]
  );

  /* ---- Notes ------------------------------------------------------------ */
  const handleAddNote = useCallback(
    (noteData) => {
      const created = storageService.addNote(noteData);
      setNotes(storageService.getNotes());
      showToast(`Đã tải lên ghi chú "${created.title}" thành công!`);
      return created;
    },
    [showToast]
  );

  const handleDeleteNote = useCallback(
    (id) => {
      setNotes(storageService.deleteNote(id));
      showToast('Đã xóa ghi chú thành công.', 'info');
    },
    [showToast]
  );

  /* ---- Gamification (derived, never stored) ----------------------------- */
  const gamification = useMemo(
    () =>
      computeGamification({
        sessions: timerSessions,
        groups,
        notes,
        bookmarks,
        userId: user.id
      }),
    [timerSessions, groups, notes, bookmarks, user.id]
  );

  /* Badges unlocked since the last visit get a "MỚI" flag, then are recorded
     as seen so the flag only ever shows once. */
  const [seenBadges, setSeenBadges] = useState(() => storageService.getSeenBadges());

  const newBadgeIds = useMemo(
    () => gamification.unlockedIds.filter((id) => !seenBadges.includes(id)),
    [gamification.unlockedIds, seenBadges]
  );

  const acknowledgeBadges = useCallback(() => {
    if (newBadgeIds.length === 0) return;
    setSeenBadges(storageService.markBadgesSeen(newBadgeIds));
  }, [newBadgeIds]);

  const value = {
    // data
    user,
    setUser,
    toggleRole,
    groups,
    handleAddGroup,
    handleToggleJoinGroup,
    timerSessions,
    handleSaveTimerSession,
    performanceGoals,
    handleUpdateGoals,
    editorPicks,
    handleAddEditorPick,
    handleDeleteEditorPick,
    bookmarks,
    handleToggleBookmark,
    notes,
    handleAddNote,
    handleDeleteNote,
    // ui
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    drawerOpen,
    setDrawerOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    isBooting,
    timerControlsRef,
    showToast,
    // gamification
    gamification,
    newBadgeIds,
    acknowledgeBadges
  };

  return (
    <AppContext.Provider value={value}>
      {children}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          /* A button, because clicking a toast dismisses it — that makes it
             reachable and operable from the keyboard too. */
          <button
            key={toast.id}
            type="button"
            className={`toast toast-${toast.type}`}
            onClick={() => dismissToast(toast.id)}
            title="Bấm để đóng thông báo"
          >
            <span className="toast-icon" aria-hidden="true">
              {toast.type === 'error' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✅'}
            </span>
            <span>{toast.message}</span>
          </button>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
