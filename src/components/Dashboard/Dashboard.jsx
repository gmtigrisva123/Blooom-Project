import { useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../constants/nav';
import { subjectColor } from '../../constants/subjects';
import {
  buildDailyBuckets,
  sessionsInWindow,
  relativeTime,
  formatMinutes
} from '../../services/gamification';
import { StatCard, SkeletonPanel, SkeletonRows } from '../common/ui';
import {
  Flame,
  Play,
  Trophy,
  Clock,
  Target,
  BarChart3,
  Activity,
  BookOpen,
  Users,
  FileText,
  Sparkles,
  ChevronRight,
  Award
} from 'lucide-react';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

/* ==========================================================================
   7-DAY BAR CHART
   ========================================================================== */
const WeekChart = ({ buckets }) => {
  const peak = Math.max(...buckets.map((b) => b.minutes), 1);

  return (
    <div className="chart">
      {buckets.map((bucket, index) => {
        const heightPct = bucket.minutes > 0 ? Math.max(8, (bucket.minutes / peak) * 100) : 0;
        return (
          <div
            className={`chart-col ${bucket.isToday ? 'is-today' : ''}`}
            key={bucket.key}
            title={`${bucket.dayLabel} ${bucket.dateNumber}: ${formatMinutes(bucket.minutes)}`}
          >
            <span className="chart-val">{bucket.minutes > 0 ? `${bucket.minutes}p` : ''}</span>
            <div className="chart-bar-wrap">
              <div
                className={[
                  'chart-bar',
                  bucket.minutes === 0 ? 'is-empty' : '',
                  bucket.isToday ? 'is-today' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  height: bucket.minutes > 0 ? `${heightPct}%` : '10%',
                  animationDelay: `${index * 0.05}s`
                }}
              />
            </div>
            <span className="chart-day">
              {bucket.dayLabel} {bucket.dateNumber}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ==========================================================================
   ACTIVITY FEED — one merged timeline across every feature
   ========================================================================== */
const buildActivity = ({ sessions, notes, groups, articles, userId }) => {
  const events = [];

  sessions.slice(0, 12).forEach((s) => {
    events.push({
      id: `s-${s.id}`,
      at: new Date(s.startedAt),
      color: subjectColor(s.subject),
      icon: <BookOpen size={14} />,
      text: (
        <>
          Hoàn thành phiên học <strong>{s.subject}</strong> — {s.durationMinutes} phút
        </>
      )
    });
  });

  notes.slice(0, 8).forEach((n) => {
    events.push({
      id: `n-${n.id}`,
      at: new Date(n.uploadedAt),
      color: '#06b6d4',
      icon: <FileText size={14} />,
      text: (
        <>
          Tải lên ghi chú <strong>{n.title}</strong>
        </>
      )
    });
  });

  groups
    .filter((g) => g.members?.includes(userId))
    .slice(0, 8)
    .forEach((g) => {
      events.push({
        id: `g-${g.id}`,
        at: new Date(g.createdAt),
        color: subjectColor(g.subject),
        icon: <Users size={14} />,
        text: (
          <>
            Đang tham gia nhóm <strong>{g.name}</strong>
          </>
        )
      });
    });

  articles.slice(0, 6).forEach((a) => {
    events.push({
      id: `a-${a.id}`,
      at: new Date(a.createdAt),
      color: '#ec4899',
      icon: <Sparkles size={14} />,
      text: (
        <>
          Bài viết mới <strong>{a.title}</strong>
        </>
      )
    });
  });

  return events
    .filter((e) => !Number.isNaN(e.at.getTime()))
    .sort((a, b) => b.at - a.at)
    .slice(0, 9);
};

/* ==========================================================================
   DASHBOARD
   ========================================================================== */
export const Dashboard = () => {
  const {
    user,
    setActiveTab,
    timerSessions,
    notes,
    groups,
    editorPicks,
    performanceGoals,
    gamification,
    newBadgeIds,
    acknowledgeBadges,
    isBooting
  } = useApp();

  const { level, streak, stats, badges } = gamification;

  /* New badges are flagged for this render, then marked as seen. */
  useEffect(() => {
    if (newBadgeIds.length === 0) return undefined;
    const id = setTimeout(acknowledgeBadges, 4000);
    return () => clearTimeout(id);
  }, [newBadgeIds, acknowledgeBadges]);

  const buckets = useMemo(() => buildDailyBuckets(timerSessions, 7), [timerSessions]);

  const weekSessions = useMemo(() => sessionsInWindow(timerSessions, 7), [timerSessions]);

  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const goalMinutes = Math.max(1, performanceGoals.targetHoursPerWeek * 60);
  const goalPercent = Math.min(100, Math.round((weekMinutes / goalMinutes) * 100));

  const todayMinutes = buckets[buckets.length - 1]?.minutes || 0;

  const topSubject = useMemo(() => {
    const totals = {};
    weekSessions.forEach((s) => {
      totals[s.subject] = (totals[s.subject] || 0) + s.durationMinutes;
    });
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return entries[0] ? { subject: entries[0][0], minutes: entries[0][1] } : null;
  }, [weekSessions]);

  const activity = useMemo(
    () =>
      buildActivity({
        sessions: timerSessions,
        notes,
        groups,
        articles: editorPicks,
        userId: user.id
      }),
    [timerSessions, notes, groups, editorPicks, user.id]
  );

  const quickTiles = NAV_ITEMS.filter((item) => item.id !== 'dashboard');
  const firstName = user.name?.split(' ').slice(-1)[0] || 'bạn';

  return (
    <div className="stack-5">
      {/* ---------------------------------------------------------------- */}
      {/* Greeting + streak + XP                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="dash-hero">
        <div>
          <span className="dash-hello">
            {greeting()}, {firstName} 👋
          </span>
          <h1>
            {streak.studiedToday
              ? 'Hôm nay bạn đã học rồi — giữ đà nhé!'
              : 'Sẵn sàng cho phiên học đầu tiên hôm nay?'}
          </h1>
          <p>
            {todayMinutes > 0
              ? `Bạn đã học ${formatMinutes(todayMinutes)} hôm nay và ${formatMinutes(
                  weekMinutes
                )} trong 7 ngày qua.`
              : 'Bắt đầu một phiên Pomodoro 25 phút để khởi động ngày học của bạn.'}
          </p>

          <div className="dash-hero-cta">
            <button className="btn btn-primary" onClick={() => setActiveTab('timer')}>
              <Play size={16} fill="currentColor" /> Bắt Đầu Học Ngay
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('performance')}>
              <BarChart3 size={16} /> Xem Tiến Độ
            </button>
          </div>
        </div>

        <div className="gamify-block">
          <div className={`streak-badge ${streak.current === 0 ? 'is-cold' : ''}`}>
            <div className="streak-flame">
              <Flame size={22} fill="currentColor" />
            </div>
            <span className="streak-num">{streak.current}</span>
            <span className="streak-cap">
              ngày liên tiếp
              {streak.longest > streak.current && (
                <>
                  <br />
                  Kỷ lục: {streak.longest}
                </>
              )}
            </span>
          </div>

          <div className="xp-block">
            <div className="xp-head">
              <span className="xp-level">Cấp {level.level}</span>
              <span className="xp-title">{level.title}</span>
            </div>
            <div className="bar">
              <div className="bar-fill xp-bar-fill" style={{ width: `${level.percent}%` }} />
            </div>
            <div className="xp-foot">
              <span>{level.xp} XP tích lũy</span>
              <span>
                Còn {level.xpRemaining} XP → Cấp {level.level + 1}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Quick numbers                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-4 stagger">
        <StatCard
          icon={<Clock size={22} />}
          label="Học hôm nay"
          value={todayMinutes}
          unit="phút"
          note={`${buckets[buckets.length - 1]?.sessions || 0} phiên đã hoàn thành`}
          color="#6366f1"
        />
        <StatCard
          icon={<Target size={22} />}
          label="Mục tiêu tuần"
          value={`${goalPercent}%`}
          note={`${(weekMinutes / 60).toFixed(1)}/${performanceGoals.targetHoursPerWeek} giờ`}
          color="#10b981"
        />
        <StatCard
          icon={<BookOpen size={22} />}
          label="Môn học nhiều nhất"
          value={topSubject ? topSubject.subject : '—'}
          note={topSubject ? formatMinutes(topSubject.minutes) : 'Chưa có dữ liệu tuần này'}
          color={topSubject ? subjectColor(topSubject.subject) : '#94a3b8'}
        />
        <StatCard
          icon={<Trophy size={22} />}
          label="Huy hiệu đã mở"
          value={`${gamification.unlockedCount}/${badges.length}`}
          note={
            newBadgeIds.length > 0
              ? `🎉 ${newBadgeIds.length} huy hiệu mới!`
              : `Tổng ${stats.totalSessions} phiên học`
          }
          color="#f59e0b"
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Chart + activity                                                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="split">
        {isBooting ? (
          <SkeletonPanel height="11rem" />
        ) : (
          <section className="panel panel-pad">
            <div className="section-head">
              <span className="section-head-icon">
                <BarChart3 size={16} />
              </span>
              <div className="grow">
                <h3>Giờ Học 7 Ngày Gần Nhất</h3>
                <span className="t-xs t-dim">
                  Tổng {formatMinutes(weekMinutes)} • trung bình {Math.round(weekMinutes / 7)}{' '}
                  phút/ngày
                </span>
              </div>
            </div>

            {weekMinutes === 0 ? (
              <div className="t-center t-dim t-sm" style={{ padding: '3rem 1rem' }}>
                Chưa có phiên học nào trong 7 ngày qua.
                <br />
                Hoàn thành một phiên Pomodoro để biểu đồ bắt đầu có dữ liệu!
              </div>
            ) : (
              <WeekChart buckets={buckets} />
            )}
          </section>
        )}

        <section className="panel panel-pad">
          <div className="section-head">
            <span className="section-head-icon">
              <Activity size={16} />
            </span>
            <h3 className="grow">Hoạt Động Gần Đây</h3>
          </div>

          {isBooting ? (
            <SkeletonRows count={4} />
          ) : activity.length === 0 ? (
            <p className="t-sm t-dim t-center" style={{ padding: '2rem 0' }}>
              Chưa có hoạt động nào được ghi nhận.
            </p>
          ) : (
            <div className="feed">
              {activity.map((event) => (
                <div
                  className="feed-item"
                  key={event.id}
                  style={{ '--feed-color': event.color }}
                >
                  <span className="feed-dot">{event.icon}</span>
                  <div className="feed-body">
                    <div className="feed-text">{event.text}</div>
                    <span className="feed-time">{relativeTime(event.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Quick access tiles                                                */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="section-head">
          <span className="section-head-icon">
            <ChevronRight size={16} />
          </span>
          <h3>Truy Cập Nhanh</h3>
        </div>

        <div className="grid grid-3 stagger">
          {quickTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                className="quick-tile"
                style={{ '--tile-color': tile.color }}
                onClick={() => setActiveTab(tile.id)}
              >
                <span className="quick-tile-icon">
                  <Icon size={18} />
                </span>
                <span className="quick-tile-name">{tile.label}</span>
                <span className="quick-tile-desc">{tile.subtitle}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Achievements                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="panel panel-pad">
        <div className="section-head">
          <span className="section-head-icon">
            <Award size={16} />
          </span>
          <div className="grow">
            <h3>Bộ Sưu Tập Huy Hiệu</h3>
            <span className="t-xs t-dim">
              Đã mở khóa {gamification.unlockedCount}/{badges.length} huy hiệu
            </span>
          </div>
          <span className="badge badge-accent">{level.title}</span>
        </div>

        <div className="badge-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={[
                'achv',
                badge.unlocked ? 'is-unlocked' : '',
                newBadgeIds.includes(badge.id) ? 'is-new' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ '--achv-color': badge.color }}
              title={`${badge.name} — ${badge.requirement}`}
            >
              <span className="achv-medal" aria-hidden="true">
                {badge.icon}
              </span>
              <span className="achv-name">{badge.name}</span>
              <span className="achv-req">{badge.requirement}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
