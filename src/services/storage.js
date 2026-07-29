/* ==========================================================================
   STUDYHUB LOCAL STORAGE & SEED DATA SERVICE
   Manages state persistence, seed data, CRUD operations for local execution.
   ========================================================================== */

const STORAGE_KEYS = {
  USER: 'studyhub_user_profile',
  GROUPS: 'studyhub_study_groups',
  TIMER_SESSIONS: 'studyhub_timer_sessions',
  PERFORMANCE_GOALS: 'studyhub_performance_goals',
  NOTES: 'studyhub_notes',
  EDITOR_PICKS: 'studyhub_editor_picks',
  BOOKMARKS: 'studyhub_bookmarks',
  THEME: 'studyhub_theme',
  SEEN_BADGES: 'studyhub_seen_badges',
  UI_PREFS: 'studyhub_ui_prefs'
};

/* localStorage can throw (private mode, quota). Never let that break a render. */
const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or unavailable — the in-memory state still works. */
  }
};

// Seed Data Initialization
const SEED_GROUPS = [
  {
    id: 'grp-1',
    name: 'Ôn thi THPT Quốc Gia - Toán 12 High Scores',
    subject: 'Toán',
    description:
      'Nhóm cùng giải đề Toán vận dụng cao, thảo luận phương pháp giải nhanh Hàm số và Hình học không gian.',
    isPrivate: false,
    memberCount: 28,
    members: ['usr-1', 'usr-2', 'usr-3'],
    createdBy: 'Thầy Hùng Toán',
    createdAt: '2026-07-01'
  },
  {
    id: 'grp-2',
    name: 'IELTS 7.5+ Writing & Speaking Club',
    subject: 'Tiếng Anh',
    description:
      'Luyện tập Speaking 1-1 hàng ngày, sửa bài Writing Task 2 chất lượng cao từ các cựu chiến binh IELTS.',
    isPrivate: false,
    memberCount: 42,
    members: ['usr-1', 'usr-4', 'usr-5'],
    createdBy: 'Minh Anh',
    createdAt: '2026-07-05'
  },
  {
    id: 'grp-3',
    name: 'Đội tuyển HSG Vật Lý 11 - 12',
    subject: 'Vật Lý',
    description:
      'Chuyên đề Điện xoay chiều và Dao động cơ. Nhóm học tập tập trung cho kì thi HSG cấp Tỉnh.',
    isPrivate: true,
    memberCount: 15,
    members: ['usr-6', 'usr-7'],
    createdBy: 'Hoàng Nam',
    createdAt: '2026-07-10'
  },
  {
    id: 'grp-4',
    name: 'Chinh Phục Hóa Học 10-11-12',
    subject: 'Hóa Học',
    description:
      'Cùng nhau giải các bài tập Hóa hữu cơ, este, peptit và phản ứng chuỗi phức tạp.',
    isPrivate: false,
    memberCount: 31,
    members: ['usr-1'],
    createdBy: 'Trần Bảo',
    createdAt: '2026-07-12'
  },
  {
    id: 'grp-5',
    name: 'Luyện Đề Sinh Học 12 (Y Dược Goal)',
    subject: 'Sinh Học',
    description:
      'Dành cho các bạn nuôi ước mơ thi Khối B vào các trường Đại học Y Dược toàn quốc.',
    isPrivate: false,
    memberCount: 22,
    members: ['usr-8'],
    createdBy: 'Ngọc Mai',
    createdAt: '2026-07-15'
  }
];

const SEED_EDITOR_PICKS = [
  {
    id: 'art-1',
    title: 'Phương pháp Pomodoro 50/10: Bí quyết giữ tập trung đỉnh cao cho học sinh 12',
    category: 'Mẹo học tập',
    content: `Khi đối mặt với lượng kiến thức khổng lồ của kì thi THPTQG, việc ngồi học liên tục 3-4 tiếng thường dẫn đến hiện tượng 'quá tải não'. 

Phương pháp Pomodoro 50/10 (50 phút học sâu, 10 phút nghỉ ngơi hoàn toàn) giúp duy trì sự tỉnh táo và khả năng ghi nhớ dài hạn. Trong 50 phút này, hãy tắt toàn bộ thông báo điện thoại, đặt chế độ DND (Do Not Disturb) và chỉ tập trung vào một nhiệm vụ duy nhất. 

10 phút nghỉ ngơi nên được dùng để đứng dậy đi dạo, uống nước hoặc duỗi cơ thể chứ không nên tiếp tục lướt mảng xã hội!`,
    imageUrl:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    createdBy: 'Ban Biên Tập StudyHub',
    createdAt: '2026-07-20',
    likesCount: 142
  },
  {
    title: 'Kỹ thuật Active Recall & Spaced Repetition (Ghi nhớ ngắt quãng)',
    id: 'art-2',
    category: 'Kỹ năng ghi nhớ',
    content: `Thay vì đọc đi đọc lại một cuốn sách SGK (Passive Review), hãy tự đặt câu hỏi và tự trả lời mà không nhìn vào tài liệu (Active Recall).

Kết hợp với Spaced Repetition (Ôn tập ngắt quãng theo chu kỳ 1 ngày, 3 ngày, 7 ngày, 14 ngày), thông tin sẽ được chuyển từ bộ nhớ ngắn hạn sang bộ nhớ dài hạn một cách bền vững. Bạn có thể sử dụng ứng dụng ghi chú của StudyHub để gắn thẻ và xem lại theo chu kỳ này.`,
    imageUrl:
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
    createdBy: 'Ban Biên Tập StudyHub',
    createdAt: '2026-07-22',
    likesCount: 98
  },
  {
    title: 'Xây dựng môi trường học tập lý tưởng giúp x3 hiệu suất',
    id: 'art-3',
    category: 'Năng suất',
    content: `Không gian học tập ảnh hưởng trực tiếp đến trạng thái tâm lý (Mindset) của bạn. Hãy đảm bảo bàn học đủ ánh sáng tự nhiên, dọn dẹp sạch các vật dụng không cần thiết và chuẩn bị sẵn một ly nước ấm.

Đặc biệt, việc có một nhóm học tập cùng chí hướng trên StudyHub sẽ tạo động lực đồng lứa (Peer Pressure tích cực) giúp bạn duy trì thói quen học tập đều đặn hàng ngày.`,
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    createdBy: 'Ban Biên Tập StudyHub',
    createdAt: '2026-07-25',
    likesCount: 210
  }
];

const SEED_TIMER_SESSIONS = [
  {
    id: 'ts-1',
    userId: 'usr-1',
    subject: 'Toán',
    durationMinutes: 50,
    startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    completed: true
  },
  {
    id: 'ts-2',
    userId: 'usr-1',
    subject: 'Tiếng Anh',
    durationMinutes: 25,
    startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completed: true
  },
  {
    id: 'ts-3',
    userId: 'usr-1',
    subject: 'Vật Lý',
    durationMinutes: 50,
    startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completed: true
  },
  {
    id: 'ts-4',
    userId: 'usr-1',
    subject: 'Toán',
    durationMinutes: 90,
    startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completed: true
  }
];

const SEED_NOTES = [
  {
    id: 'note-1',
    userId: 'usr-1',
    title: 'Tổng hợp công thức Đạo hàm & Tiệm cận Hàm số',
    subject: 'Toán',
    groupId: 'grp-1',
    fileUrl:
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    fileType: 'image/jpeg',
    fileName: 'cong-thuc-dao-ham-12.jpg',
    uploadedAt: '2026-07-20'
  },
  {
    id: 'note-2',
    userId: 'usr-1',
    title: 'Dạng bài Writing Task 2 - Paraphrasing Vocabulary',
    subject: 'Tiếng Anh',
    groupId: 'grp-2',
    fileUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    fileType: 'image/jpeg',
    fileName: 'ielts-vocab-notes.jpg',
    uploadedAt: '2026-07-22'
  }
];

export const storageService = {
  // User Profile & Role
  getUser: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (!saved) {
      const defaultUser = {
        id: 'usr-1',
        name: 'Nguyễn Văn An',
        email: 'an.nguyen@hocsinh.edu.vn',
        role: 'student', // 'student' | 'admin'
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(saved);
  },

  setUser: (user) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  // Groups Management
  getGroups: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(SEED_GROUPS));
      return SEED_GROUPS;
    }
    return JSON.parse(saved);
  },

  addGroup: (newGroup) => {
    const groups = storageService.getGroups();
    const created = {
      ...newGroup,
      id: 'grp-' + Date.now(),
      memberCount: 1,
      members: ['usr-1'],
      createdAt: new Date().toISOString().split('T')[0]
    };
    groups.unshift(created);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    return created;
  },

  toggleJoinGroup: (groupId) => {
    const groups = storageService.getGroups();
    const user = storageService.getUser();
    const updated = groups.map((g) => {
      if (g.id === groupId) {
        const isMember = g.members.includes(user.id);
        const newMembers = isMember
          ? g.members.filter((id) => id !== user.id)
          : [...g.members, user.id];
        return {
          ...g,
          members: newMembers,
          memberCount: newMembers.length
        };
      }
      return g;
    });
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(updated));
    return updated;
  },

  // Timer Sessions
  getTimerSessions: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMER_SESSIONS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.TIMER_SESSIONS, JSON.stringify(SEED_TIMER_SESSIONS));
      return SEED_TIMER_SESSIONS;
    }
    return JSON.parse(saved);
  },

  saveTimerSession: (sessionData) => {
    const sessions = storageService.getTimerSessions();
    const user = storageService.getUser();
    const newSession = {
      id: 'ts-' + Date.now(),
      userId: user.id,
      ...sessionData,
      startedAt: new Date().toISOString(),
      completed: true
    };
    sessions.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.TIMER_SESSIONS, JSON.stringify(sessions));
    return newSession;
  },

  // Performance Goals
  getPerformanceGoals: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERFORMANCE_GOALS);
    if (!saved) {
      const defaultGoal = { targetHoursPerWeek: 15, targetSessionsPerWeek: 12 };
      localStorage.setItem(STORAGE_KEYS.PERFORMANCE_GOALS, JSON.stringify(defaultGoal));
      return defaultGoal;
    }
    return JSON.parse(saved);
  },

  setPerformanceGoals: (goals) => {
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE_GOALS, JSON.stringify(goals));
  },

  // Editor's Picks
  getEditorPicks: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.EDITOR_PICKS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.EDITOR_PICKS, JSON.stringify(SEED_EDITOR_PICKS));
      return SEED_EDITOR_PICKS;
    }
    return JSON.parse(saved);
  },

  addEditorPick: (article) => {
    const articles = storageService.getEditorPicks();
    const newArticle = {
      ...article,
      id: 'art-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      likesCount: 0
    };
    articles.unshift(newArticle);
    localStorage.setItem(STORAGE_KEYS.EDITOR_PICKS, JSON.stringify(articles));
    return newArticle;
  },

  deleteEditorPick: (id) => {
    const articles = storageService.getEditorPicks().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.EDITOR_PICKS, JSON.stringify(articles));
    return articles;
  },

  getBookmarks: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return saved ? JSON.parse(saved) : [];
  },

  toggleBookmark: (articleId) => {
    const bookmarks = storageService.getBookmarks();
    const exists = bookmarks.includes(articleId);
    const updated = exists
      ? bookmarks.filter((id) => id !== articleId)
      : [...bookmarks, articleId];
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updated));
    return updated;
  },

  // Notes Management
  getNotes: () => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(SEED_NOTES));
      return SEED_NOTES;
    }
    return JSON.parse(saved);
  },

  addNote: (note) => {
    const notes = storageService.getNotes();
    const user = storageService.getUser();
    const newNote = {
      ...note,
      id: 'note-' + Date.now(),
      userId: user.id,
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    notes.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return newNote;
  },

  deleteNote: (id) => {
    const notes = storageService.getNotes().filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return notes;
  },

  /* ------------------------------------------------------------------------
     Achievement badges the user has already been shown. Unlocking itself is
     always recomputed from session data (see services/gamification.js); this
     only remembers which unlocks have been acknowledged, so a freshly earned
     badge can be highlighted as "MỚI" exactly once.
     ------------------------------------------------------------------------ */
  getSeenBadges: () => readJson(STORAGE_KEYS.SEEN_BADGES, []),

  markBadgesSeen: (ids) => {
    const merged = [...new Set([...storageService.getSeenBadges(), ...ids])];
    writeJson(STORAGE_KEYS.SEEN_BADGES, merged);
    return merged;
  },

  /* Interface preferences (sidebar collapsed, ...). */
  getUiPrefs: () => readJson(STORAGE_KEYS.UI_PREFS, { sidebarCollapsed: false }),

  setUiPrefs: (prefs) => {
    const merged = { ...storageService.getUiPrefs(), ...prefs };
    writeJson(STORAGE_KEYS.UI_PREFS, merged);
    return merged;
  }
};
