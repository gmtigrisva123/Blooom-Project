/* ==========================================================================
   BLOOOM — LOCAL STORAGE & SEED DATA SERVICE
   Persistence, seed data and CRUD for a browser-resident app.

   Every key is resolved through `k()`, which prefixes it with the signed-in
   account's namespace. Two students sharing one laptop therefore keep two
   completely separate sets of groups, sessions, notes and experiments, while
   a browser that has never signed in keeps using the original unprefixed keys
   — so data recorded before accounts existed is not orphaned.
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
  UI_PREFS: 'studyhub_ui_prefs',
  CARDS: 'blooom_flashcards',
  EXPERIMENTS: 'blooom_experiments'
};

/* --------------------------------------------------------------------------
   NAMESPACE
   -------------------------------------------------------------------------- */
let namespace = '';

/* Called once, before the provider reads anything, whenever the signed-in
   account changes. Passing null restores the shared/anonymous namespace. */
export const setStorageNamespace = (accountId) => {
  namespace = accountId ? `blooom:${accountId}:` : '';
};

export const getStorageNamespace = () => namespace;

const k = (key) => `${namespace}${key}`;

/* localStorage can throw (private mode, quota). Never let that break a render. */
const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(k(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(k(key), JSON.stringify(value));
  } catch {
    /* Storage full or unavailable — the in-memory state still works. */
  }
  return value;
};

/* Read a collection, writing the seed on first access so the app always has
   something to show and the seed is only paid for once per namespace. */
const readSeeded = (key, seed) => {
  const existing = readJson(key, null);
  if (existing !== null) return existing;
  return writeJson(key, seed);
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
    createdBy: 'Ban Biên Tập Blooom',
    createdAt: '2026-07-20',
    likesCount: 142
  },
  {
    title: 'Kỹ thuật Active Recall & Spaced Repetition (Ghi nhớ ngắt quãng)',
    id: 'art-2',
    category: 'Kỹ năng ghi nhớ',
    content: `Thay vì đọc đi đọc lại một cuốn sách SGK (Passive Review), hãy tự đặt câu hỏi và tự trả lời mà không nhìn vào tài liệu (Active Recall).

Kết hợp với Spaced Repetition (Ôn tập ngắt quãng theo chu kỳ 1 ngày, 3 ngày, 7 ngày, 14 ngày), thông tin sẽ được chuyển từ bộ nhớ ngắn hạn sang bộ nhớ dài hạn một cách bền vững. Bạn có thể sử dụng ứng dụng ghi chú của Blooom để gắn thẻ và xem lại theo chu kỳ này.`,
    imageUrl:
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
    createdBy: 'Ban Biên Tập Blooom',
    createdAt: '2026-07-22',
    likesCount: 98
  },
  {
    title: 'Xây dựng môi trường học tập lý tưởng giúp x3 hiệu suất',
    id: 'art-3',
    category: 'Năng suất',
    content: `Không gian học tập ảnh hưởng trực tiếp đến trạng thái tâm lý (Mindset) của bạn. Hãy đảm bảo bàn học đủ ánh sáng tự nhiên, dọn dẹp sạch các vật dụng không cần thiết và chuẩn bị sẵn một ly nước ấm.

Đặc biệt, việc có một nhóm học tập cùng chí hướng trên Blooom sẽ tạo động lực đồng lứa (Peer Pressure tích cực) giúp bạn duy trì thói quen học tập đều đặn hàng ngày.`,
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    createdBy: 'Ban Biên Tập Blooom',
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

/* Four starter cards so the Recall Lab has a live schedule to show before the
   student has written any of their own. */
const SEED_CARDS = [
  {
    id: 'card-seed-1',
    front: 'Đạo hàm của hàm số y = ln(x) là gì?',
    back: "y' = 1/x  (với x > 0)",
    subject: 'Toán',
    noteId: 'note-1'
  },
  {
    id: 'card-seed-2',
    front: 'Công thức tính chu kỳ của con lắc đơn?',
    back: 'T = 2π·√(l/g) — chỉ phụ thuộc chiều dài l và gia tốc trọng trường g.',
    subject: 'Vật Lý',
    noteId: null
  },
  {
    id: 'card-seed-3',
    front: '"Paraphrase" trong IELTS Writing Task 2 nghĩa là gì?',
    back: 'Viết lại ý của đề bài bằng từ vựng và cấu trúc của riêng mình, giữ nguyên nghĩa gốc.',
    subject: 'Tiếng Anh',
    noteId: 'note-2'
  },
  {
    id: 'card-seed-4',
    front: 'Liên kết ion được hình thành giữa những nguyên tố nào?',
    back: 'Giữa kim loại điển hình và phi kim điển hình, do lực hút tĩnh điện giữa các ion trái dấu.',
    subject: 'Hóa Học',
    noteId: null
  }
].map((card) => ({
  ...card,
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  lapses: 0,
  reviewCount: 0,
  createdAt: new Date().toISOString(),
  lastReviewedAt: null,
  dueAt: new Date().toISOString()
}));

export const storageService = {
  // User Profile & Role
  getUser: () => {
    const saved = readJson(STORAGE_KEYS.USER, null);
    if (!saved) {
      const defaultUser = {
        id: 'usr-1',
        name: 'Nguyễn Văn An',
        email: 'an.nguyen@hocsinh.edu.vn',
        role: 'student', // 'student' | 'admin'
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      };
      return writeJson(STORAGE_KEYS.USER, defaultUser);
    }
    return saved;
  },

  setUser: (user) => writeJson(STORAGE_KEYS.USER, user),

  // Groups Management
  getGroups: () => readSeeded(STORAGE_KEYS.GROUPS, SEED_GROUPS),

  addGroup: (newGroup) => {
    const groups = storageService.getGroups();
    const user = storageService.getUser();
    const created = {
      ...newGroup,
      id: 'grp-' + Date.now(),
      memberCount: 1,
      members: [user.id],
      createdAt: new Date().toISOString().split('T')[0]
    };
    groups.unshift(created);
    writeJson(STORAGE_KEYS.GROUPS, groups);
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
    return writeJson(STORAGE_KEYS.GROUPS, updated);
  },

  // Timer Sessions
  getTimerSessions: () => readSeeded(STORAGE_KEYS.TIMER_SESSIONS, SEED_TIMER_SESSIONS),

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
    writeJson(STORAGE_KEYS.TIMER_SESSIONS, sessions);
    return newSession;
  },

  // Performance Goals
  getPerformanceGoals: () =>
    readSeeded(STORAGE_KEYS.PERFORMANCE_GOALS, {
      targetHoursPerWeek: 15,
      targetSessionsPerWeek: 12
    }),

  setPerformanceGoals: (goals) => writeJson(STORAGE_KEYS.PERFORMANCE_GOALS, goals),

  // Editor's Picks
  getEditorPicks: () => readSeeded(STORAGE_KEYS.EDITOR_PICKS, SEED_EDITOR_PICKS),

  addEditorPick: (article) => {
    const articles = storageService.getEditorPicks();
    const newArticle = {
      ...article,
      id: 'art-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      likesCount: 0
    };
    articles.unshift(newArticle);
    writeJson(STORAGE_KEYS.EDITOR_PICKS, articles);
    return newArticle;
  },

  deleteEditorPick: (id) =>
    writeJson(
      STORAGE_KEYS.EDITOR_PICKS,
      storageService.getEditorPicks().filter((a) => a.id !== id)
    ),

  getBookmarks: () => readJson(STORAGE_KEYS.BOOKMARKS, []),

  toggleBookmark: (articleId) => {
    const bookmarks = storageService.getBookmarks();
    const exists = bookmarks.includes(articleId);
    return writeJson(
      STORAGE_KEYS.BOOKMARKS,
      exists ? bookmarks.filter((id) => id !== articleId) : [...bookmarks, articleId]
    );
  },

  // Notes Management
  getNotes: () => readSeeded(STORAGE_KEYS.NOTES, SEED_NOTES),

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
    writeJson(STORAGE_KEYS.NOTES, notes);
    return newNote;
  },

  deleteNote: (id) =>
    writeJson(
      STORAGE_KEYS.NOTES,
      storageService.getNotes().filter((n) => n.id !== id)
    ),

  /* ------------------------------------------------------------------------
     FLASHCARDS — the scheduling state itself is persisted (ease factor,
     interval, due date), because unlike badges it cannot be recomputed: it
     depends on grades the student gave at moments that have already passed.
     ------------------------------------------------------------------------ */
  getCards: () => readSeeded(STORAGE_KEYS.CARDS, SEED_CARDS),

  setCards: (cards) => writeJson(STORAGE_KEYS.CARDS, cards),

  addCard: (card) => {
    const cards = storageService.getCards();
    cards.unshift(card);
    writeJson(STORAGE_KEYS.CARDS, cards);
    return card;
  },

  updateCard: (updated) =>
    writeJson(
      STORAGE_KEYS.CARDS,
      storageService.getCards().map((c) => (c.id === updated.id ? updated : c))
    ),

  deleteCard: (id) =>
    writeJson(
      STORAGE_KEYS.CARDS,
      storageService.getCards().filter((c) => c.id !== id)
    ),

  /* ------------------------------------------------------------------------
     N-OF-1 EXPERIMENTS
     ------------------------------------------------------------------------ */
  getExperiments: () => readJson(STORAGE_KEYS.EXPERIMENTS, []),

  setExperiments: (experiments) => writeJson(STORAGE_KEYS.EXPERIMENTS, experiments),

  addExperiment: (experiment) => {
    const experiments = storageService.getExperiments();
    experiments.unshift(experiment);
    writeJson(STORAGE_KEYS.EXPERIMENTS, experiments);
    return experiment;
  },

  updateExperiment: (updated) =>
    writeJson(
      STORAGE_KEYS.EXPERIMENTS,
      storageService.getExperiments().map((e) => (e.id === updated.id ? updated : e))
    ),

  deleteExperiment: (id) =>
    writeJson(
      STORAGE_KEYS.EXPERIMENTS,
      storageService.getExperiments().filter((e) => e.id !== id)
    ),

  /* ------------------------------------------------------------------------
     Achievement badges the user has already been shown. Unlocking itself is
     always recomputed from session data (see services/gamification.js); this
     only remembers which unlocks have been acknowledged, so a freshly earned
     badge can be highlighted as "MỚI" exactly once.
     ------------------------------------------------------------------------ */
  getSeenBadges: () => readJson(STORAGE_KEYS.SEEN_BADGES, []),

  markBadgesSeen: (ids) =>
    writeJson(STORAGE_KEYS.SEEN_BADGES, [
      ...new Set([...storageService.getSeenBadges(), ...ids])
    ]),

  /* Interface preferences (sidebar collapsed, ...). */
  getUiPrefs: () => readJson(STORAGE_KEYS.UI_PREFS, { sidebarCollapsed: false }),

  setUiPrefs: (prefs) =>
    writeJson(STORAGE_KEYS.UI_PREFS, { ...storageService.getUiPrefs(), ...prefs })
};
