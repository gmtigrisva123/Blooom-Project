import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { subjectColor } from '../../constants/subjects';
import {
  buildDailyBuckets,
  sessionsInWindow,
  formatMinutes
} from '../../services/gamification';
import { Hero, StatCard, EmptyState, ProgressBar } from '../common/ui';
import {
  LineChart,
  Calendar,
  Target,
  Award,
  Clock,
  Settings,
  TrendingUp,
  CheckCircle2,
  Flame,
  Trophy
} from 'lucide-react';

const GOAL_RADIUS = 62;
const GOAL_CIRCUMFERENCE = 2 * Math.PI * GOAL_RADIUS;

/* Heat level for the weekly strip: 0 = nothing, 4 = a very heavy day. */
const heatLevel = (minutes) => {
  if (minutes === 0) return '';
  if (minutes < 30) return 'lv1';
  if (minutes < 60) return 'lv2';
  if (minutes < 120) return 'lv3';
  return 'lv4';
};

export const PerformanceTracker = () => {
  const { timerSessions, performanceGoals, handleUpdateGoals, gamification } = useApp();

  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [targetHours, setTargetHours] = useState(performanceGoals.targetHoursPerWeek);
  const [targetSessions, setTargetSessions] = useState(performanceGoals.targetSessionsPerWeek);

  /* Seed the form from the saved goals at the moment the dialog opens, rather
     than mirroring them in an effect that runs on every change. */
  const openGoalDialog = () => {
    setTargetHours(performanceGoals.targetHoursPerWeek);
    setTargetSessions(performanceGoals.targetSessionsPerWeek);
    setIsGoalOpen(true);
  };

  const weekSessions = useMemo(() => sessionsInWindow(timerSessions, 7), [timerSessions]);
  const buckets = useMemo(() => buildDailyBuckets(timerSessions, 7), [timerSessions]);

  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const weekSessionCount = weekSessions.length;

  const targetMinutes = Math.max(1, performanceGoals.targetHoursPerWeek * 60);
  const hoursPercent = Math.min(100, Math.round((weekMinutes / targetMinutes) * 100));
  const sessionsPercent = Math.min(
    100,
    Math.round((weekSessionCount / Math.max(1, performanceGoals.targetSessionsPerWeek)) * 100)
  );
  const overallPercent = Math.round((hoursPercent + sessionsPercent) / 2);

  /* Time split by subject over the same 7-day window. */
  const subjectRows = useMemo(() => {
    const totals = {};
    weekSessions.forEach((s) => {
      totals[s.subject] = (totals[s.subject] || 0) + (s.durationMinutes || 0);
    });

    return Object.entries(totals)
      .map(([subject, minutes]) => ({
        subject,
        minutes,
        percent: weekMinutes > 0 ? Math.round((minutes / weekMinutes) * 100) : 0
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [weekSessions, weekMinutes]);

  const submitGoals = async (event) => {
    event.preventDefault();
    await handleUpdateGoals({
      targetHoursPerWeek: Number(targetHours),
      targetSessionsPerWeek: Number(targetSessions)
    });
    setIsGoalOpen(false);
  };

  const { streak, level, badges, unlockedCount } = gamification;

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Theo dõi hiệu suất học tập"
        icon={<LineChart size={12} />}
        title="Bảng Điều Khiển Tiến Độ Tuần"
        description="Phân tích số giờ học thực tế từ bộ đếm Pomodoro và đo lường tỷ lệ hoàn thành mục tiêu của bạn."
        action={
          <button className="btn btn-secondary" onClick={openGoalDialog}>
            <Settings size={16} /> Thiết Lập Mục Tiêu
          </button>
        }
      />

      {/* Trước khi học sinh tự đặt mục tiêu, con số hiển thị là giá trị gợi ý
          chứ không phải lựa chọn của họ — và nó phải được nói rõ như vậy, chứ
          không trình bày như một mục tiêu đã cam kết. */}
      {performanceGoals.isDefault && (
        <div className="panel panel-pad row-between" style={{ gap: 'var(--sp-4)' }}>
          <span className="t-sm t-dim">
            Bạn chưa đặt mục tiêu tuần. Các con số bên dưới đang dùng mức gợi ý mặc định{' '}
            <b>{performanceGoals.targetHoursPerWeek} giờ</b> và{' '}
            <b>{performanceGoals.targetSessionsPerWeek} phiên</b>.
          </span>
          <button className="btn btn-primary btn-sm" onClick={openGoalDialog}>
            Đặt mục tiêu của tôi
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Goal gauge                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel goal-summary">
        <div className="goal-ring">
          <svg viewBox="0 0 140 140">
            <circle className="goal-ring-track" cx="70" cy="70" r={GOAL_RADIUS} />
            <circle
              className="goal-ring-fill"
              cx="70"
              cy="70"
              r={GOAL_RADIUS}
              strokeDasharray={GOAL_CIRCUMFERENCE}
              strokeDashoffset={GOAL_CIRCUMFERENCE * (1 - overallPercent / 100)}
            />
          </svg>
          <div className="goal-ring-face">
            <div className="goal-ring-pct">{overallPercent}%</div>
            <div className="goal-ring-cap">mục tiêu tuần</div>
          </div>
        </div>

        <div className="goal-metrics">
          <div>
            <div className="goal-metric-head">
              <b>Số giờ học</b>
              <span>
                {(weekMinutes / 60).toFixed(1)} / {performanceGoals.targetHoursPerWeek} giờ
              </span>
            </div>
            <ProgressBar percent={hoursPercent} />
          </div>

          <div>
            <div className="goal-metric-head">
              <b>Số phiên Pomodoro</b>
              <span>
                {weekSessionCount} / {performanceGoals.targetSessionsPerWeek} phiên
              </span>
            </div>
            <ProgressBar percent={sessionsPercent} />
          </div>

          <p className="t-sm t-dim" style={{ margin: 0 }}>
            {overallPercent >= 100
              ? '🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu tuần này.'
              : overallPercent >= 60
                ? 'Bạn đang đi đúng hướng — cố thêm vài phiên nữa là đạt mục tiêu!'
                : 'Còn một chặng nữa. Hãy thử một phiên Pomodoro 25 phút ngay bây giờ.'}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Stat tiles                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-4 stagger">
        <StatCard
          icon={<Clock size={22} />}
          label="Tổng thời gian tuần"
          value={(weekMinutes / 60).toFixed(1)}
          unit="giờ"
          note={`${weekMinutes} phút được ghi nhận`}
          color="var(--d-1)"
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          label="Phiên đã hoàn thành"
          value={`${weekSessionCount}/${performanceGoals.targetSessionsPerWeek}`}
          note={`${sessionsPercent}% mục tiêu phiên học`}
          color="var(--d-2)"
        />
        <StatCard
          icon={<Flame size={22} />}
          label="Chuỗi ngày liên tiếp"
          value={streak.current}
          unit="ngày"
          note={`Kỷ lục cá nhân: ${streak.longest} ngày`}
          color="var(--d-3)"
        />
        <StatCard
          icon={<Award size={22} />}
          label={`Cấp ${level.level} — ${level.title}`}
          value={level.xp}
          unit="XP"
          note={`Còn ${level.xpRemaining} XP để lên cấp ${level.level + 1}`}
          color="var(--d-5)"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Week strip + subject split                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="split">
        <section className="panel panel-pad">
          <div className="section-head">
            <span className="section-head-icon">
              <Calendar size={16} />
            </span>
            <div className="grow">
              <h3>Lịch Học 7 Ngày Gần Nhất</h3>
              <span className="t-xs t-dim">Màu càng đậm, ngày đó bạn học càng nhiều</span>
            </div>
          </div>

          <div className="week-grid">
            {buckets.map((day) => (
              <div
                key={day.key}
                className={`week-day ${heatLevel(day.minutes)} ${day.isToday ? 'is-today' : ''}`}
                title={`${day.dayLabel} ${day.dateNumber}: ${formatMinutes(day.minutes)} (${
                  day.sessions
                } phiên)`}
              >
                <span className="week-dow">{day.dayLabel}</span>
                <span className="week-num">{day.dateNumber}</span>
                <span className={`week-mins ${day.minutes === 0 ? 'is-zero' : ''}`}>
                  {day.minutes > 0 ? `${day.minutes}p` : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="week-legend">
            <span>Ít</span>
            {/* Same opacity steps as the intensity rule in styles/performance.css */}
            <span className="week-legend-swatch" style={{ background: 'var(--bg-inset)' }} />
            <span
              className="week-legend-swatch"
              style={{ background: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
            />
            <span
              className="week-legend-swatch"
              style={{ background: 'color-mix(in srgb, var(--accent) 55%, transparent)' }}
            />
            <span className="week-legend-swatch" style={{ background: 'var(--accent)' }} />
            <span>Nhiều</span>
          </div>
        </section>

        <section className="panel panel-pad">
          <div className="section-head">
            <span className="section-head-icon">
              <TrendingUp size={16} />
            </span>
            <div className="grow">
              <h3>Phân Phối Theo Môn Học</h3>
              <span className="t-xs t-dim">Trong 7 ngày qua</span>
            </div>
          </div>

          {subjectRows.length === 0 ? (
            <p className="t-sm t-dim t-center" style={{ padding: '2.5rem 0' }}>
              Chưa có dữ liệu học tập tuần này.
              <br />
              Hãy bắt đầu một phiên đếm giờ Pomodoro!
            </p>
          ) : (
            <div>
              {subjectRows.map((row) => (
                <div
                  className="subj-row"
                  key={row.subject}
                  style={{ '--subject-color': subjectColor(row.subject) }}
                >
                  <div className="subj-head">
                    <span className="subj-name truncate">
                      <span className="subj-dot" />
                      {row.subject}
                    </span>
                    <span className="subj-val">
                      {formatMinutes(row.minutes)} • {row.percent}%
                    </span>
                  </div>
                  <div className="bar">
                    <div
                      className="bar-fill subj-bar-fill"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Achievements                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel panel-pad">
        <div className="section-head">
          <span className="section-head-icon">
            <Trophy size={16} />
          </span>
          <div className="grow">
            <h3>Huy Hiệu Thành Tích</h3>
            <span className="t-xs t-dim">
              Đã mở khóa {unlockedCount}/{badges.length}
            </span>
          </div>
        </div>

        {badges.length === 0 ? (
          <EmptyState icon={<Trophy size={30} />} title="Chưa có huy hiệu nào" />
        ) : (
          <div className="badge-grid">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`achv ${badge.unlocked ? 'is-unlocked' : ''}`}
                style={{ '--achv-color': badge.color }}
                title={badge.requirement}
              >
                <span className="achv-medal" aria-hidden="true">
                  {badge.icon}
                </span>
                <span className="achv-name">{badge.name}</span>
                <span className="achv-req">{badge.requirement}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Goal settings                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={isGoalOpen}
        onClose={() => setIsGoalOpen(false)}
        title="Đặt Mục Tiêu Học Tập Tuần"
        icon={
          <span className="section-head-icon">
            <Target size={16} />
          </span>
        }
      >
        <form onSubmit={submitGoals}>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="goalHours">Mục tiêu số giờ học mỗi tuần</label>
              <input
                id="goalHours"
                type="number"
                min="1"
                max="100"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                required
              />
              <span className="field-hint">
                Gợi ý: 10–15 giờ/tuần là mục tiêu bền vững cho học sinh phổ thông.
              </span>
            </div>

            <div className="field">
              <label htmlFor="goalSessions">Mục tiêu số phiên Pomodoro mỗi tuần</label>
              <input
                id="goalSessions"
                type="number"
                min="1"
                max="200"
                value={targetSessions}
                onChange={(e) => setTargetSessions(e.target.value)}
                required
              />
              <span className="field-hint">
                Khoảng 12–20 phiên tương đương 2–3 phiên mỗi ngày.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsGoalOpen(false)}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Mục Tiêu
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
