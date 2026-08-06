/* ==========================================================================
   STUDYHUB — GAMIFICATION ENGINE
   Streaks, XP, levels and achievement badges are all derived from data the
   app already records (Pomodoro sessions, groups, notes, bookmarks). Nothing
   here invents new tracking — it only reads what the user has done.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Date helpers — always work in the user's LOCAL day. Using toISOString()
   would bucket sessions by UTC day, which shifts the boundary by 7h in
   Vietnam and would silently break streaks late at night.
   -------------------------------------------------------------------------- */
export const dayKey = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* --------------------------------------------------------------------------
   XP & LEVELS
   1 minute studied = 1 XP. Each level costs 50 XP more than the previous one
   (100, 150, 200, ...), so total XP required to reach level L is
   25 * (L - 1) * (L + 2).
   -------------------------------------------------------------------------- */
export const xpForLevel = (level) => 25 * (level - 1) * (level + 2);

export const levelFromXp = (xp) =>
  Math.max(1, Math.floor((-1 + Math.sqrt(9 + (4 * Math.max(0, xp)) / 25)) / 2));

const LEVEL_TITLES = [
  { min: 1, title: 'Tân Binh Chăm Chỉ' },
  { min: 3, title: 'Học Sinh Kiên Trì' },
  { min: 5, title: 'Chiến Binh Pomodoro' },
  { min: 7, title: 'Cao Thủ Tập Trung' },
  { min: 10, title: 'Bậc Thầy Kỷ Luật' },
  { min: 14, title: 'Huyền Thoại Blooom' }
];

export const levelTitle = (level) =>
  [...LEVEL_TITLES].reverse().find((t) => level >= t.min)?.title || LEVEL_TITLES[0].title;

export const computeLevel = (xp) => {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = ceiling - floor;
  return {
    level,
    title: levelTitle(level),
    xp,
    xpIntoLevel: xp - floor,
    xpForNextLevel: span,
    xpRemaining: Math.max(0, ceiling - xp),
    percent: span > 0 ? Math.min(100, Math.round(((xp - floor) / span) * 100)) : 0
  };
};

/* --------------------------------------------------------------------------
   STREAKS
   A day counts when at least one Pomodoro session was completed on it.
   Today not being studied yet does not break the streak — the run is measured
   from today if studied, otherwise from yesterday (a normal "grace" rule).
   -------------------------------------------------------------------------- */
export const computeStreak = (sessions) => {
  const studied = new Set(sessions.map((s) => dayKey(s.startedAt)));
  if (studied.size === 0) {
    return { current: 0, longest: 0, studiedToday: false, days: studied };
  }

  const today = startOfDay(new Date());
  const studiedToday = studied.has(dayKey(today));

  let current = 0;
  let cursor = studiedToday ? today : addDays(today, -1);
  while (studied.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest run across the whole history.
  const sorted = [...studied].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    const isNext = prev !== null && dayKey(addDays(new Date(`${prev}T00:00:00`), 1)) === key;
    run = isNext ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  }

  return { current, longest, studiedToday, days: studied };
};

/* --------------------------------------------------------------------------
   ACHIEVEMENT BADGES
   Each badge is a pure predicate over the derived stats, so unlocking is
   always recomputed from the source data and can never drift out of sync.
   -------------------------------------------------------------------------- */
export const BADGES = [
  {
    id: 'first-step',
    icon: '🌱',
    color: '#10b981',
    name: 'Bước Đầu Tiên',
    requirement: 'Hoàn thành 1 phiên học',
    test: (s) => s.totalSessions >= 1
  },
  {
    id: 'streak-3',
    icon: '🔥',
    color: '#f97316',
    name: 'Chuỗi 3 Ngày',
    requirement: 'Học 3 ngày liên tiếp',
    test: (s) => s.longestStreak >= 3
  },
  {
    id: 'streak-7',
    icon: '⚡',
    color: '#f59e0b',
    name: 'Tuần Hoàn Hảo',
    requirement: 'Học 7 ngày liên tiếp',
    test: (s) => s.longestStreak >= 7
  },
  {
    id: 'streak-30',
    icon: '👑',
    color: '#eab308',
    name: 'Kỷ Luật Thép',
    requirement: 'Học 30 ngày liên tiếp',
    test: (s) => s.longestStreak >= 30
  },
  {
    id: 'sessions-25',
    icon: '🎯',
    color: '#8b5cf6',
    name: 'Thợ Săn Pomodoro',
    requirement: 'Hoàn thành 25 phiên',
    test: (s) => s.totalSessions >= 25
  },
  {
    id: 'hours-10',
    icon: '⏳',
    color: '#06b6d4',
    name: '10 Giờ Miệt Mài',
    requirement: 'Tích lũy 10 giờ học',
    test: (s) => s.totalMinutes >= 600
  },
  {
    id: 'hours-50',
    icon: '🏆',
    color: '#ec4899',
    name: '50 Giờ Bền Bỉ',
    requirement: 'Tích lũy 50 giờ học',
    test: (s) => s.totalMinutes >= 3000
  },
  {
    id: 'marathon',
    icon: '🚀',
    color: '#ef4444',
    name: 'Siêu Tập Trung',
    requirement: 'Một phiên dài từ 90 phút',
    test: (s) => s.longestSession >= 90
  },
  {
    id: 'polymath',
    icon: '🧠',
    color: '#a855f7',
    name: 'Toàn Diện',
    requirement: 'Học đủ 5 môn khác nhau',
    test: (s) => s.subjectCount >= 5
  },
  {
    id: 'early-bird',
    icon: '🐦',
    color: '#22d3ee',
    name: 'Chim Sớm',
    requirement: 'Học trước 6 giờ sáng',
    test: (s) => s.hasEarlyBird
  },
  {
    id: 'night-owl',
    icon: '🦉',
    color: '#6366f1',
    name: 'Cú Đêm',
    requirement: 'Học sau 22 giờ đêm',
    test: (s) => s.hasNightOwl
  },
  {
    id: 'team-player',
    icon: '🤝',
    color: '#3b82f6',
    name: 'Đồng Đội',
    requirement: 'Tham gia 3 nhóm học',
    test: (s) => s.joinedGroups >= 3
  },
  {
    id: 'archivist',
    icon: '📚',
    color: '#14b8a6',
    name: 'Nhà Lưu Trữ',
    requirement: 'Tải lên 5 ghi chú',
    test: (s) => s.noteCount >= 5
  },
  {
    id: 'curator',
    icon: '🔖',
    color: '#f472b6',
    name: 'Người Sưu Tầm',
    requirement: 'Lưu 3 bài viết yêu thích',
    test: (s) => s.bookmarkCount >= 3
  }
];

/* --------------------------------------------------------------------------
   MAIN ENTRY — derive everything in one pass.
   -------------------------------------------------------------------------- */
export const computeGamification = ({
  sessions = [],
  groups = [],
  notes = [],
  bookmarks = [],
  userId = null
} = {}) => {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const streak = computeStreak(sessions);

  const stats = {
    totalMinutes,
    totalSessions: sessions.length,
    longestSession: sessions.reduce((max, s) => Math.max(max, s.durationMinutes || 0), 0),
    subjectCount: new Set(sessions.map((s) => s.subject)).size,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    studiedToday: streak.studiedToday,
    hasEarlyBird: sessions.some((s) => new Date(s.startedAt).getHours() < 6),
    hasNightOwl: sessions.some((s) => new Date(s.startedAt).getHours() >= 22),
    joinedGroups: userId ? groups.filter((g) => g.members?.includes(userId)).length : 0,
    noteCount: notes.length,
    bookmarkCount: bookmarks.length
  };

  const badges = BADGES.map((badge) => ({ ...badge, unlocked: badge.test(stats) }));

  return {
    stats,
    streak,
    level: computeLevel(totalMinutes),
    badges,
    unlockedIds: badges.filter((b) => b.unlocked).map((b) => b.id),
    unlockedCount: badges.filter((b) => b.unlocked).length
  };
};

/* --------------------------------------------------------------------------
   Daily buckets for the dashboard chart / weekly heatmap.
   -------------------------------------------------------------------------- */
const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const buildDailyBuckets = (sessions, dayCount = 7) => {
  const today = startOfDay(new Date());
  const todayKey = dayKey(today);

  const byDay = sessions.reduce((acc, s) => {
    const key = dayKey(s.startedAt);
    if (!acc[key]) acc[key] = { minutes: 0, count: 0 };
    acc[key].minutes += s.durationMinutes || 0;
    acc[key].count += 1;
    return acc;
  }, {});

  return Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(today, -(dayCount - 1 - i));
    const key = dayKey(date);
    const bucket = byDay[key] || { minutes: 0, count: 0 };
    return {
      key,
      date,
      dayLabel: DOW_LABELS[date.getDay()],
      dateNumber: date.getDate(),
      minutes: bucket.minutes,
      sessions: bucket.count,
      isToday: key === todayKey
    };
  });
};

/* Sessions inside the trailing `days`-day window (inclusive of today). */
export const sessionsInWindow = (sessions, days = 7) => {
  const from = startOfDay(addDays(new Date(), -(days - 1)));
  return sessions.filter((s) => new Date(s.startedAt) >= from);
};

/* "2 giờ trước", "Hôm qua", ... for the activity feed. */
export const relativeTime = (value) => {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const diffMs = Date.now() - then.getTime();
  const mins = Math.round(diffMs / 60000);

  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86400000);
  if (dayDiff === 1) return 'Hôm qua';
  if (dayDiff < 7) return `${dayDiff} ngày trước`;

  return then.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const formatMinutes = (mins) => {
  if (!mins) return '0 phút';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
};
