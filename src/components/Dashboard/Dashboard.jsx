import { useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { subjectColor } from '../../constants/subjects';
import {
  buildDailyBuckets,
  sessionsInWindow,
  relativeTime,
  formatMinutes
} from '../../services/gamification';
import { SkeletonRows } from '../common/ui';
import {
  Play,
  Check,
  BarChart3,
  Activity,
  BookOpen,
  Users,
  FileText,
  Sparkles,
  Trophy,
  Waves,
  Award
} from 'lucide-react';

/* ==========================================================================
   7-DAY BAR CHART — bare on the page, no panel around it
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
      color: 'var(--d-5)',
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
      color: 'var(--d-4)',
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

   Đọc như một trang giấy, không như một bảng đồng hồ: một câu dẫn ở cột
   trái, một ô đo ở cột phải, rồi các khối bằng chứng xếp phẳng bên dưới.
   Khối nào chưa có dữ liệu thì không dựng một biểu đồ rỗng — nó lùi xuống
   danh sách "sẽ hiện ở đây khi có dữ liệu", kèm đúng số quan sát còn thiếu.
   ========================================================================== */
export const Dashboard = () => {
  const {
    user,
    setActiveTab,
    timerSessions,
    timerPrefs,
    timerControlsRef,
    notes,
    groups,
    cards,
    editorPicks,
    performanceGoals,
    gamification,
    newBadgeIds,
    acknowledgeBadges,
    isBooting
  } = useApp();

  const { level, streak, badges, unlockedCount } = gamification;

  /* New badges are flagged for this render, then marked as seen. */
  useEffect(() => {
    if (newBadgeIds.length === 0) return undefined;
    const id = setTimeout(acknowledgeBadges, 4000);
    return () => clearTimeout(id);
  }, [newBadgeIds, acknowledgeBadges]);

  const buckets = useMemo(() => buildDailyBuckets(timerSessions, 7), [timerSessions]);
  const weekSessions = useMemo(() => sessionsInWindow(timerSessions, 7), [timerSessions]);

  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const todayMinutes = buckets[buckets.length - 1]?.minutes || 0;

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

  const hasSessions = timerSessions.length > 0;

  /* ---- Câu dẫn ---------------------------------------------------------
     Ba trạng thái thật, không nội suy: đã học hôm nay, đã từng học nhưng
     hôm nay chưa, và chưa có gì cả. */
  const kicker = hasSessions ? 'Hôm nay' : 'Phiên đầu tiên';
  let headline;
  if (todayMinutes > 0) {
    headline = `Bạn đã học ${formatMinutes(todayMinutes)} hôm nay. Giữ đà nhé.`;
  } else if (hasSessions) {
    headline = 'Hôm nay chưa có phiên nào. Một phiên là đủ để giữ chuỗi.';
  } else {
    headline = 'Blooom chưa biết gì về bạn. Hai mươi lăm phút là đủ để bắt đầu.';
  }
  const lede = hasSessions
    ? 'Mỗi phút học là 1 XP. Biểu đồ tuần, chuỗi ngày và các mô hình khoa học đều đã bắt đầu đọc dữ liệu của bạn.'
    : 'Mọi con số trong ứng dụng đều tính từ dữ liệu thật của bạn — không có dữ liệu mẫu. Bấm bắt đầu, chọn môn, và biểu đồ đầu tiên xuất hiện ngay khi phiên kết thúc.';

  /* Bấm ở đây thì Bộ Đếm Giờ phải tự chạy — nếu không, "Bắt đầu" chỉ là một
     nút điều hướng. Bộ điều khiển chỉ tồn tại sau khi trang kia gắn vào cây,
     nên lệnh chạy đợi một nhịp render. */
  const startSession = () => {
    setActiveTab('timer');
    setTimeout(() => timerControlsRef.current?.toggle(), 80);
  };

  const clockText = `${String(timerPrefs.workMinutes).padStart(2, '0')}:00`;

  /* ---- Ba bước để ứng dụng có ích -------------------------------------- */
  const onboarding = [
    {
      n: '01',
      title: 'Học một phiên',
      body: 'Một phiên Pomodoro là đơn vị quan sát của cả nền tảng. Có nó, XP, chuỗi ngày và biểu đồ tuần đều bắt đầu chạy.',
      cta: 'Mở Bộ Đếm Giờ',
      done: hasSessions,
      go: () => setActiveTab('timer')
    },
    {
      n: '02',
      title: 'Tạo 10 thẻ ghi nhớ',
      body: 'SM-2 cần thẻ để lên lịch. Mười thẻ đủ để đường cong quên Ebbinghaus có hình dạng thật.',
      cta: 'Mở Ôn Ngắt Quãng',
      done: cards.length >= 10,
      go: () => setActiveTab('recall')
    },
    {
      n: '03',
      title: 'Đặt mục tiêu tuần',
      body: 'Mặc định 10 giờ chỉ là mức gợi ý. Đặt số của bạn thì vòng đo Hiệu Suất mới nói được điều gì.',
      cta: 'Mở Hiệu Suất',
      done: !performanceGoals.isDefault,
      go: () => setActiveTab('performance')
    }
  ];
  const onboardDone = onboarding.filter((o) => o.done).length;

  /* ---- Những gì còn đang chờ dữ liệu ------------------------------------
     Mỗi dòng nói rõ còn thiếu bao nhiêu quan sát, để chỗ trống là một con số
     chứ không phải một lời hứa. */
  const waiting = [
    {
      icon: <BarChart3 size={15} />,
      label: 'Biểu đồ giờ học 7 ngày',
      ok: hasSessions,
      meta: 'cần 1 phiên'
    },
    {
      icon: <Activity size={15} />,
      label: 'Dòng hoạt động',
      ok: activity.length > 0,
      meta: 'cần 1 hành động'
    },
    {
      icon: <Waves size={15} />,
      label: 'Giờ đỉnh tập trung (cosinor 24h)',
      ok: timerSessions.length >= 12,
      meta: `${timerSessions.length} / 12 phiên`
    },
    {
      icon: <Trophy size={15} />,
      label: `Huy hiệu — ${badges.length} chiếc, chiếc đầu mở sau phiên đầu tiên`,
      ok: unlockedCount > 0,
      meta: `${unlockedCount} / ${badges.length}`
    }
  ].filter((w) => !w.ok);

  return (
    <div className="dash">
      {/* ---------------------------------------------------------------- */}
      {/* Câu dẫn + ô đo                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="dash-lede-row">
        <div>
          <div className="dash-kicker mono">{kicker}</div>
          <h1 className="dash-headline">{headline}</h1>
          <p className="dash-lede">{lede}</p>

          <div className="dash-actions">
            <button className="btn btn-primary" onClick={startSession}>
              <Play size={15} fill="currentColor" /> Bắt đầu {timerPrefs.workMinutes} phút
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('performance')}>
              Xem tiến độ
            </button>
          </div>
        </div>

        <div className="dash-clock">
          <div className="dash-clock-label mono">Đồng hồ chờ</div>
          <div className="dash-clock-time mono">{clockText}</div>
          <div className="dash-clock-rule" />
          <dl className="dash-clock-rows mono">
            <div>
              <dt>Hôm nay</dt>
              <dd>{formatMinutes(todayMinutes)}</dd>
            </div>
            <div>
              <dt>Tuần này</dt>
              <dd>
                {(weekMinutes / 60).toFixed(1)} / {performanceGoals.targetHoursPerWeek} giờ
              </dd>
            </div>
            <div>
              <dt>Chuỗi</dt>
              <dd>{streak.current} ngày</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Ba bước                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="dash-block-head">
          <h2>Ba bước để ứng dụng có ích</h2>
          <span className="mono">
            {onboardDone} / {onboarding.length} hoàn thành
          </span>
        </div>

        <ol className="onboard-grid">
          {onboarding.map((step) => (
            <li className={`onboard ${step.done ? 'is-done' : ''}`} key={step.n}>
              <div className="onboard-top">
                <span className="onboard-n mono">{step.n}</span>
                <span className="onboard-check" aria-hidden="true">
                  <Check size={11} />
                </span>
              </div>
              <div className="onboard-title">{step.title}</div>
              <p>{step.body}</p>
              <button className="onboard-cta" onClick={step.go}>
                {step.cta}
              </button>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Giờ học 7 ngày                                                    */}
      {/* ---------------------------------------------------------------- */}
      {hasSessions && (
        <section>
          <div className="dash-block-head is-plain">
            <h2>Giờ học 7 ngày gần nhất</h2>
            <span className="mono">
              Tổng {formatMinutes(weekMinutes)} · trung bình {Math.round(weekMinutes / 7)}{' '}
              phút/ngày
            </span>
          </div>
          <WeekChart buckets={buckets} />
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Dòng hoạt động                                                    */}
      {/* ---------------------------------------------------------------- */}
      {(isBooting || activity.length > 0) && (
        <section>
          <div className="dash-block-head is-plain">
            <h2>Hoạt động gần đây</h2>
          </div>

          {isBooting ? (
            <SkeletonRows count={4} />
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
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Huy hiệu — chỉ khi đã mở được ít nhất một chiếc                    */}
      {/* ---------------------------------------------------------------- */}
      {unlockedCount > 0 && (
        <section>
          <div className="dash-block-head">
            <h2>
              <Award size={15} aria-hidden="true" /> Bộ sưu tập huy hiệu
            </h2>
            <span className="mono">
              {unlockedCount}/{badges.length} · {level.title}
            </span>
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
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Chờ dữ liệu                                                       */}
      {/* ---------------------------------------------------------------- */}
      {waiting.length > 0 && (
        <section>
          <div className="dash-block-head is-plain">
            <h2>Sẽ hiện ở đây khi có dữ liệu</h2>
            <span className="mono">{waiting.length} mục đang chờ</span>
          </div>

          <ul className="waiting-list">
            {waiting.map((item) => (
              <li key={item.label}>
                <span className="waiting-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="waiting-label">{item.label}</span>
                <span className="waiting-meta mono">{item.meta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
