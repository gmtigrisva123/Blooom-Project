import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { useToast } from './ToastContext';

const AppContext = createContext(null);

/* Shown until a student sets their own weekly goal. `isDefault` travels with
   it so the interface can say "suggested" instead of presenting a number the
   student never chose as if they had. */
const DEFAULT_GOALS = { targetHoursPerWeek: 10, targetSessionsPerWeek: 10, isDefault: true };

/* ==========================================================================
   APP PROVIDER — everything the signed-in student owns.

   Data is loaded once when the provider mounts (App.jsx remounts it per
   account) and kept in state so screens never wait on the network to read.

   Every write follows one shape: call the server, wait for it to confirm,
   and only then update the screen from the row the server returned. Nothing
   is shown optimistically — a session that appears and then vanishes would
   leave a student unsure whether it was saved at all.
   ========================================================================== */
export const AppProvider = ({ children, account, onSignOut }) => {
  const showToast = useToast();

  const [user, setUser] = useState(account);
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [cards, setCards] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [articles, setArticles] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [seenBadges, setSeenBadges] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);

  /* One write, one outcome: the result, or null plus a toast with the real
     reason. No write is ever allowed to fail silently. */
  const run = useCallback(
    async (action, successMessage, successType = 'success') => {
      try {
        const result = await action();
        if (successMessage) showToast(successMessage, successType);
        return result;
      } catch (error) {
        showToast(error.message || 'Chưa làm được. Bạn thử lại nhé.', 'error');
        return null;
      }
    },
    [showToast]
  );

  /* ---- Load ------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    loadWorkspace().then((data) => {
      if (cancelled) return;
      setGroups(data.groups);
      setSessions(data.sessions);
      setNotes(data.notes);
      setCards(data.cards);
      setExperiments(data.experiments);
      setArticles(data.articles);
      setBookmarks(data.bookmarks);
      setSeenBadges(data.seenBadges);
      setGoals(data.goals ? { ...data.goals, isDefault: false } : DEFAULT_GOALS);
      setLoadErrors(data.errors);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Account ---------------------------------------------------------- */
  const updateProfile = useCallback(
    async (patch) => {
      const updated = await run(() => authService.updateProfile(patch), 'Đã lưu.');
      if (updated) setUser(updated);
      return updated;
    },
    [run]
  );

  /* Turns a try-it-out visit into a real account without losing anything:
     the user id stays the same, so every row already saved still belongs to
     them. Errors are returned (not toasted) so the form can show them next
     to the field the student is looking at. */
  const upgradeGuest = useCallback(
    async (details) => {
      try {
        const updated = await authService.upgradeGuest(details);
        setUser(updated);
        showToast('Đã lưu tài khoản. Dữ liệu của bạn vẫn còn nguyên.');
        return { ok: true, account: updated };
      } catch (error) {
        return { ok: false, message: error.message || 'Chưa tạo được tài khoản.' };
      }
    },
    [showToast]
  );

  /* Who may publish study tips is decided by the server, never by this
     screen: the code is checked there and the role column is locked against
     every other write. These two only relay the answer. */
  const claimEditor = useCallback(
    async (code) => {
      try {
        const result = await authService.claimAdminRole(code);
        if (result.ok && result.account) {
          setUser(result.account);
          showToast('Bạn đã có quyền đăng bài.');
        }
        return result;
      } catch (error) {
        return { ok: false, message: error.message || 'Chưa kiểm tra được mã.' };
      }
    },
    [showToast]
  );

  const releaseEditor = useCallback(async () => {
    const updated = await run(
      () => authService.releaseAdminRole(),
      'Đã tắt quyền đăng bài.',
      'info'
    );
    if (updated) setUser(updated);
    return updated;
  }, [run]);

  /* ---- Groups ----------------------------------------------------------- */
  const addGroup = useCallback(
    async (data) => {
      const created = await run(() => groupsRepo.create(data));
      if (!created) return null;
      setGroups((prev) => [created, ...prev]);
      showToast(`Đã tạo nhóm “${created.name}”.`);
      return created;
    },
    [run, showToast]
  );

  const toggleJoinGroup = useCallback(
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
        isMember ? `Đã rời nhóm “${group.name}”.` : `Đã vào nhóm “${group.name}”.`,
        isMember ? 'info' : 'success'
      );
    },
    [groups, user, run, showToast]
  );

  const deleteGroup = useCallback(
    async (groupId) => {
      const done = await run(
        () => groupsRepo.remove(groupId).then(() => true),
        'Đã xóa nhóm.',
        'info'
      );
      if (done) setGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    [run]
  );

  /* ---- Focus sessions --------------------------------------------------- */
  const saveSession = useCallback(
    async (data) => {
      const saved = await run(() => sessionsRepo.create(data));
      if (!saved) return null;
      setSessions((prev) => [saved, ...prev]);
      showToast(
        `Xong ${data.durationMinutes} phút ${data.subject}. +${data.durationMinutes} điểm!`
      );
      return saved;
    },
    [run, showToast]
  );

  /* ---- Weekly goal ------------------------------------------------------ */
  const updateGoals = useCallback(
    async (next) => {
      const saved = await run(() => goalsRepo.save(next), 'Đã lưu mục tiêu tuần.');
      if (saved) setGoals({ ...saved, isDefault: false });
      return saved;
    },
    [run]
  );

  /* ---- Files ------------------------------------------------------------ */
  const addNote = useCallback(
    async (data) => {
      const created = await run(() => notesRepo.create(data));
      if (!created) return null;
      setNotes((prev) => [created, ...prev]);
      showToast(`Đã lưu “${created.title}”.`);
      return created;
    },
    [run, showToast]
  );

  const deleteNote = useCallback(
    async (id) => {
      const done = await run(
        () => notesRepo.remove(id).then(() => true),
        'Đã xóa tài liệu.',
        'info'
      );
      if (done) setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [run]
  );

  /* ---- Flashcards ------------------------------------------------------- */
  const addCard = useCallback(
    async (data) => {
      const created = await run(() => cardsRepo.create(createCard(data)), 'Đã thêm thẻ.');
      if (created) setCards((prev) => [created, ...prev]);
      return created;
    },
    [run]
  );

  /* Grading is the only place a card's schedule changes. The next review
     date is worked out here so the card can flip at once, but both the new
     schedule and the grade itself are saved before this returns — so the date
     on screen is always the date that was stored. */
  const reviewCard = useCallback(
    async (card, quality) => {
      const after = applyReview(card, quality);
      const saved = await run(() => cardsRepo.applyReview({ before: card, after, quality }));
      if (!saved) return null;
      setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      return saved;
    },
    [run]
  );

  const deleteCard = useCallback(
    async (id) => {
      const done = await run(
        () => cardsRepo.remove(id).then(() => true),
        'Đã xóa thẻ.',
        'info'
      );
      if (done) setCards((prev) => prev.filter((c) => c.id !== id));
    },
    [run]
  );

  /* ---- Experiments ------------------------------------------------------ */
  const addExperiment = useCallback(
    async (design) => {
      const created = await run(
        () => experimentsRepo.create(createExperiment(design)),
        'Đã tạo thử nghiệm.'
      );
      if (created) setExperiments((prev) => [created, ...prev]);
      return created;
    },
    [run]
  );

  const recordTrial = useCallback(
    async (experiment, entry) => {
      /* Which way to study next is drawn BEFORE that session happens, and
         saved together with the result just entered. That is what stops
         anyone from picking the option that suits today's mood. */
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
      showToast(`Đã ghi buổi ${updated.trials.length}.`);
      return updated;
    },
    [run, showToast]
  );

  const toggleExperimentDone = useCallback(
    async (experiment) => {
      const nextStatus = experiment.status === 'completed' ? 'running' : 'completed';
      const updated = await run(
        () => experimentsRepo.setStatus(experiment.id, nextStatus),
        nextStatus === 'completed' ? 'Đã kết thúc thử nghiệm.' : 'Đã mở lại thử nghiệm.',
        'info'
      );
      if (updated)
        setExperiments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      return updated;
    },
    [run]
  );

  const deleteExperiment = useCallback(
    async (id) => {
      const done = await run(
        () => experimentsRepo.remove(id).then(() => true),
        'Đã xóa thử nghiệm.',
        'info'
      );
      if (done) setExperiments((prev) => prev.filter((e) => e.id !== id));
    },
    [run]
  );

  /* ---- Study tips ------------------------------------------------------- */
  const addArticle = useCallback(
    async (article) => {
      const created = await run(() => articlesRepo.create(article), 'Đã đăng bài.');
      if (created) setArticles((prev) => [created, ...prev]);
      return created;
    },
    [run]
  );

  const deleteArticle = useCallback(
    async (id) => {
      const done = await run(
        () => articlesRepo.remove(id).then(() => true),
        'Đã xóa bài viết.',
        'info'
      );
      if (done) setArticles((prev) => prev.filter((a) => a.id !== id));
    },
    [run]
  );

  const toggleBookmark = useCallback(
    async (articleId) => {
      const saved = bookmarks.includes(articleId);

      const done = await run(async () => {
        if (saved) await bookmarksRepo.remove(articleId);
        else await bookmarksRepo.add(articleId);
        return true;
      });
      if (!done) return;

      setBookmarks((prev) =>
        saved ? prev.filter((id) => id !== articleId) : [...prev, articleId]
      );
      /* The save count on each article is counted by the server; nudging it
         here keeps the number right without reloading the whole list. */
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, likesCount: a.likesCount + (saved ? -1 : 1) } : a
        )
      );
      showToast(saved ? 'Đã bỏ lưu.' : 'Đã lưu bài viết.', 'info');
    },
    [bookmarks, run, showToast]
  );

  /* ---- Export ----------------------------------------------------------- */
  const exportData = useCallback(async () => {
    const payload = await run(() => exportAllData(), 'Đã tải dữ liệu của bạn về máy.');
    if (!payload) return;

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blooom-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [run]);

  /* ---- Streak, points, level, badges (derived, never stored) ------------ */
  const game = useMemo(
    () => computeGamification({ sessions, groups, notes, bookmarks, userId: user?.id }),
    [sessions, groups, notes, bookmarks, user?.id]
  );

  const newBadgeIds = useMemo(
    () => game.unlockedIds.filter((id) => !seenBadges.includes(id)),
    [game.unlockedIds, seenBadges]
  );

  const acknowledgeBadges = useCallback(async () => {
    if (newBadgeIds.length === 0) return;

    /* The one write that updates the screen first: if saving fails, the
       worst outcome is a "new" label showing once more. No data is lost. */
    setSeenBadges((prev) => [...new Set([...prev, ...newBadgeIds])]);
    try {
      await badgesRepo.markSeen(newBadgeIds);
    } catch {
      /* Deliberately silent — see above. */
    }
  }, [newBadgeIds]);

  const value = {
    user,
    isGuest: Boolean(user?.isAnonymous),
    isEditor: user?.role === 'admin',
    updateProfile,
    upgradeGuest,
    claimEditor,
    releaseEditor,
    signOut: onSignOut,

    loading,
    loadErrors,

    groups,
    addGroup,
    toggleJoinGroup,
    deleteGroup,

    sessions,
    saveSession,

    goals,
    updateGoals,

    notes,
    addNote,
    deleteNote,

    cards,
    addCard,
    reviewCard,
    deleteCard,

    experiments,
    addExperiment,
    recordTrial,
    toggleExperimentDone,
    deleteExperiment,

    articles,
    addArticle,
    deleteArticle,
    bookmarks,
    toggleBookmark,

    exportData,

    game,
    newBadgeIds,
    acknowledgeBadges
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
