import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} from 'react';
import { getUiPrefs, setUiPrefs } from '../services/storage';
import {
  loadWorkspace,
  groupsRepo,
  sessionsRepo,
  notesRepo,
  cardsRepo,
  experimentsRepo,
  articlesRepo,
  bookmarksRepo,
  goalsRepo,
  badgesRepo,
  exportAllData
} from '../services/db';
import { authService } from '../services/auth';
import { computeGamification } from '../services/gamification';
import { applyReview, createCard } from '../services/srs';
import { createExperiment, nextAllocation } from '../services/experiments';

const AppContext = createContext();

let toastSeq = 0;

/* Mục tiêu tuần hiển thị khi học sinh chưa tự đặt. Cờ `isDefault` đi kèm để
   giao diện nói rõ đây là gợi ý mặc định chứ không phải con số người dùng đã
   chọn — trình bày một giá trị mặc định như thể nó là lựa chọn của người
   dùng chính là một dạng dữ liệu bịa. */
const DEFAULT_GOALS = {
  targetHoursPerWeek: 10,
  targetSessionsPerWeek: 10,
  isDefault: true
};

/* ==========================================================================
   APP PROVIDER

   Toàn bộ dữ liệu đến từ PostgreSQL. Provider nạp một lần khi gắn (App.jsx
   remount nó theo account.id, nên đổi tài khoản là nạp lại từ đầu), rồi giữ
   một bản sao trong state để giao diện không phải chờ mạng cho mỗi lần đọc.

   Mỗi thao tác ghi đi theo cùng một khuôn: gọi repository, chờ máy chủ xác
   nhận, rồi mới cập nhật state từ chính hàng máy chủ trả về. Cố ý KHÔNG cập
   nhật lạc quan trước rồi hoàn tác sau: một học sinh nhìn thấy phiên học của
   mình hiện lên rồi biến mất sẽ không biết rốt cuộc nó đã được lưu hay chưa.
   ========================================================================== */
export const AppProvider = ({ children, account, onSignOut, theme, toggleTheme }) => {
  /* ---- Domain data ------------------------------------------------------ */
  const [groups, setGroups] = useState([]);
  const [timerSessions, setTimerSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [cards, setCards] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [editorPicks, setEditorPicks] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [performanceGoals, setPerformanceGoals] = useState(DEFAULT_GOALS);
  const [seenBadges, setSeenBadges] = useState([]);

  /* Hồ sơ hiển thị. Nguồn sự thật là bảng `profiles`; `account` là ảnh chụp
     lúc đăng nhập, và mọi thay đổi hồ sơ đều ghi ngược lại cơ sở dữ liệu. */
  const [user, setUser] = useState(account);

  /* ---- Loading & error -------------------------------------------------- */
  const [isBooting, setIsBooting] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);

  /* ---- Interface state -------------------------------------------------- */
  const [activeTab, setActiveTabRaw] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getUiPrefs().sidebarCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  /* Lets the global Space/R shortcuts drive the Pomodoro without the timer
     having to live in context — WorkTimer registers its controls here. */
  const timerControlsRef = useRef(null);

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

  /* Khuôn chung cho mọi thao tác ghi: chạy, báo thành công, hoặc hiện lỗi
     thật của máy chủ. Không thao tác ghi nào được phép thất bại trong im
     lặng — nếu dữ liệu không lưu được, học sinh phải biết ngay lúc đó. */
  const run = useCallback(
    async (action, successMessage, successType = 'success') => {
      try {
        const result = await action();
        if (successMessage) showToast(successMessage, successType);
        return result;
      } catch (error) {
        showToast(error.message || 'Thao tác không thành công.', 'error');
        return null;
      }
    },
    [showToast]
  );

  /* ---- Nạp dữ liệu ------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await loadWorkspace();
      if (cancelled) return;

      setGroups(data.groups);
      setTimerSessions(data.sessions);
      setNotes(data.notes);
      setCards(data.cards);
      setExperiments(data.experiments);
      setEditorPicks(data.articles);
      setBookmarks(data.bookmarks);
      setSeenBadges(data.seenBadges);
      setPerformanceGoals(data.goals ? { ...data.goals, isDefault: false } : DEFAULT_GOALS);
      setLoadErrors(data.errors);
      setIsBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Sidebar ---------------------------------------------------------- */
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      setUiPrefs({ sidebarCollapsed: !prev });
      return !prev;
    });
  }, []);

  const setActiveTab = useCallback((tab) => {
    setActiveTabRaw(tab);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* ---- Vai trò ---------------------------------------------------------- */
  const toggleRole = useCallback(async () => {
    const role = user?.role === 'student' ? 'admin' : 'student';
    const updated = await run(
      () => authService.updateProfile({ role }),
      `Đã chuyển sang vai trò: ${role === 'admin' ? 'Biên Tập Viên / Admin' : 'Học Sinh'}`,
      'info'
    );
    if (updated) setUser(updated);
  }, [run, user?.role]);

  const updateProfile = useCallback(
    async (patch) => {
      const updated = await run(() => authService.updateProfile(patch), 'Đã cập nhật hồ sơ.');
      if (updated) setUser(updated);
      return updated;
    },
    [run]
  );

  /* ---- Nhóm học --------------------------------------------------------- */
  const handleAddGroup = useCallback(
    async (groupData) => {
      const created = await run(() => groupsRepo.create(groupData));
      if (!created) return null;

      setGroups((prev) => [created, ...prev]);
      showToast(`Đã tạo nhóm học "${created.name}" thành công!`);
      return created;
    },
    [run, showToast]
  );

  const handleToggleJoinGroup = useCallback(
    async (groupId) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group || !user) return;

      const isMember = group.members.includes(user.id);

      const done = await run(async () => {
        if (isMember) await groupsRepo.leave(groupId);
        else await groupsRepo.join(groupId);
        return true;
      });
      if (!done) return;

      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const members = isMember
            ? g.members.filter((id) => id !== user.id)
            : [...g.members, user.id];
          return { ...g, members, memberCount: members.length };
        })
      );

      showToast(
        isMember ? `Đã rời nhóm "${group.name}"` : `Đã tham gia nhóm "${group.name}"`,
        isMember ? 'info' : 'success'
      );
    },
    [groups, user, run, showToast]
  );

  /* ---- Phiên học -------------------------------------------------------- */
  const handleSaveTimerSession = useCallback(
    async (sessionData) => {
      const saved = await run(() => sessionsRepo.create(sessionData));
      if (!saved) return null;

      setTimerSessions((prev) => [saved, ...prev]);
      showToast(
        `Hoàn thành ${sessionData.durationMinutes} phút môn ${sessionData.subject}! +${sessionData.durationMinutes} XP 🎉`
      );
      return saved;
    },
    [run, showToast]
  );

  /* ---- Mục tiêu --------------------------------------------------------- */
  const handleUpdateGoals = useCallback(
    async (newGoals) => {
      const saved = await run(
        () => goalsRepo.save(newGoals),
        'Đã cập nhật mục tiêu học tập tuần thành công!'
      );
      if (saved) setPerformanceGoals({ ...saved, isDefault: false });
    },
    [run]
  );

  /* ---- Bài viết --------------------------------------------------------- */
  const handleAddEditorPick = useCallback(
    async (article) => {
      const created = await run(
        () => articlesRepo.create(article),
        'Đã đăng bài viết mẹo học tập mới thành công!'
      );
      if (created) setEditorPicks((prev) => [created, ...prev]);
      return created;
    },
    [run]
  );

  const handleDeleteEditorPick = useCallback(
    async (id) => {
      const done = await run(
        () => articlesRepo.remove(id).then(() => true),
        'Đã xóa bài viết khỏi danh sách.',
        'info'
      );
      if (done) setEditorPicks((prev) => prev.filter((a) => a.id !== id));
    },
    [run]
  );

  const handleToggleBookmark = useCallback(
    async (articleId) => {
      const exists = bookmarks.includes(articleId);

      const done = await run(async () => {
        if (exists) await bookmarksRepo.remove(articleId);
        else await bookmarksRepo.add(articleId);
        return true;
      });
      if (!done) return;

      setBookmarks((prev) =>
        exists ? prev.filter((id) => id !== articleId) : [...prev, articleId]
      );

      /* Số lượt lưu hiển thị trên thẻ bài viết là COUNT phía máy chủ; cập
         nhật tại chỗ để con số khớp ngay mà không phải nạp lại cả danh sách. */
      setEditorPicks((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, likesCount: a.likesCount + (exists ? -1 : 1) } : a
        )
      );

      showToast(
        exists ? 'Đã bỏ lưu bài viết.' : 'Đã lưu bài viết vào danh sách yêu thích!',
        'info'
      );
    },
    [bookmarks, run, showToast]
  );

  /* ---- Ghi chú ---------------------------------------------------------- */
  const handleAddNote = useCallback(
    async (noteData) => {
      const created = await run(() => notesRepo.create(noteData));
      if (!created) return null;

      setNotes((prev) => [created, ...prev]);
      showToast(`Đã tải lên ghi chú "${created.title}" thành công!`);
      return created;
    },
    [run, showToast]
  );

  const handleDeleteNote = useCallback(
    async (id) => {
      const done = await run(
        () => notesRepo.remove(id).then(() => true),
        'Đã xóa ghi chú thành công.',
        'info'
      );
      if (done) setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [run]
  );

  /* ---- Thẻ ghi nhớ (SM-2) ----------------------------------------------- */
  const handleAddCard = useCallback(
    async (cardData) => {
      const created = await run(
        () => cardsRepo.create(createCard(cardData)),
        'Đã thêm thẻ ghi nhớ vào bộ ôn tập.'
      );
      if (created) setCards((prev) => [created, ...prev]);
      return created;
    },
    [run]
  );

  /* Chấm điểm là nơi duy nhất lịch ôn thay đổi. Thuật toán SM-2 chạy ở client
     để giao diện lật thẻ được ngay, nhưng cả trạng thái lịch mới lẫn bản ghi
     của chính lần chấm đó đều được ghi xuống cơ sở dữ liệu trước khi hàm này
     trả về — nên khoảng cách hiển thị luôn là khoảng cách đã lưu. */
  const handleReviewCard = useCallback(
    async (card, quality) => {
      const after = applyReview(card, quality);

      const saved = await run(() => cardsRepo.applyReview({ before: card, after, quality }));
      if (!saved) return null;

      setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      return saved;
    },
    [run]
  );

  const handleDeleteCard = useCallback(
    async (id) => {
      const done = await run(
        () => cardsRepo.remove(id).then(() => true),
        'Đã xóa thẻ ghi nhớ.',
        'info'
      );
      if (done) setCards((prev) => prev.filter((c) => c.id !== id));
    },
    [run]
  );

  /* ---- Thí nghiệm N-of-1 ------------------------------------------------ */
  const handleCreateExperiment = useCallback(
    async (design) => {
      const created = await run(
        () => experimentsRepo.create(createExperiment(design)),
        'Đã khởi tạo thí nghiệm. Điều kiện đầu tiên đã được bốc ngẫu nhiên.'
      );
      if (created) setExperiments((prev) => [created, ...prev]);
      return created;
    },
    [run]
  );

  const handleRecordTrial = useCallback(
    async (experiment, entry) => {
      /* Phân bổ cho phiên kế tiếp được bốc TRƯỚC khi phiên đó diễn ra, bằng
         khối hoán vị cỡ 2 (services/experiments.js), rồi lưu xuống cùng lúc
         với phiên vừa ghi. Đó là điều khiến học sinh không thể chọn điều kiện
         sau khi đã biết kết quả. */
      const trialsAfter = [
        ...experiment.trials,
        { condition: experiment.pendingCondition, value: entry.value }
      ];

      const updated = await run(() =>
        experimentsRepo.recordTrial({
          experimentId: experiment.id,
          condition: experiment.pendingCondition,
          value: entry.value,
          note: entry.note,
          nextCondition: nextAllocation(trialsAfter)
        })
      );
      if (!updated) return null;

      setExperiments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast(
        `Đã ghi phiên ${updated.trials.length}. Phiên tới sẽ chạy điều kiện ${updated.pendingCondition}.`
      );
      return updated;
    },
    [run, showToast]
  );

  const handleFinishExperiment = useCallback(
    async (experiment) => {
      const nextStatus = experiment.status === 'completed' ? 'running' : 'completed';

      const updated = await run(
        () => experimentsRepo.setStatus(experiment.id, nextStatus),
        nextStatus === 'completed'
          ? 'Đã chốt thí nghiệm. Kết quả được khóa lại để báo cáo.'
          : 'Đã mở lại thí nghiệm để thu thập thêm dữ liệu.',
        'info'
      );
      if (updated)
        setExperiments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      return updated;
    },
    [run]
  );

  const handleDeleteExperiment = useCallback(
    async (id) => {
      const done = await run(
        () => experimentsRepo.remove(id).then(() => true),
        'Đã xóa thí nghiệm.',
        'info'
      );
      if (done) setExperiments((prev) => prev.filter((e) => e.id !== id));
    },
    [run]
  );

  /* ---- Xuất dữ liệu ----------------------------------------------------- */
  const handleExportData = useCallback(async () => {
    const payload = await run(() => exportAllData(), 'Đã xuất toàn bộ dữ liệu của bạn.');
    if (!payload) return;

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blooom-du-lieu-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [run]);

  /* ---- Gamification (suy ra, không bao giờ lưu) ------------------------- */
  const gamification = useMemo(
    () =>
      computeGamification({
        sessions: timerSessions,
        groups,
        notes,
        bookmarks,
        userId: user?.id
      }),
    [timerSessions, groups, notes, bookmarks, user?.id]
  );

  const newBadgeIds = useMemo(
    () => gamification.unlockedIds.filter((id) => !seenBadges.includes(id)),
    [gamification.unlockedIds, seenBadges]
  );

  const acknowledgeBadges = useCallback(async () => {
    if (newBadgeIds.length === 0) return;

    /* Cập nhật state trước rồi mới ghi: đây là ngoại lệ duy nhất so với quy
       tắc "chờ máy chủ", vì hậu quả xấu nhất khi ghi hỏng là nhãn "MỚI" xuất
       hiện lại ở lần mở sau — không có dữ liệu nào bị mất. */
    setSeenBadges((prev) => [...new Set([...prev, ...newBadgeIds])]);

    try {
      await badgesRepo.markSeen(newBadgeIds);
    } catch {
      /* Im lặng có chủ đích: xem giải thích ngay phía trên. */
    }
  }, [newBadgeIds]);

  const value = {
    // identity
    account,
    user,
    setUser,
    updateProfile,
    onSignOut,
    toggleRole,
    // data
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
    cards,
    handleAddCard,
    handleReviewCard,
    handleDeleteCard,
    experiments,
    handleCreateExperiment,
    handleRecordTrial,
    handleFinishExperiment,
    handleDeleteExperiment,
    handleExportData,
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
    loadErrors,
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
