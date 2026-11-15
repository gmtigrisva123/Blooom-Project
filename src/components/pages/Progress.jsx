import { useEffect, useState } from 'react';
import {
  Bookmark,
  Brain,
  Clock,
  Crown,
  Flame,
  Handshake,
  Hourglass,
  Library,
  Lock,
  Moon,
  Rocket,
  Sprout,
  Sunrise,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { subjectColor, subjectLabel } from '../../lib/subjects';
import { hoursLabel, useNow } from '../../lib/time';
import { bySubject, dailyTotals, minutesOf, sessionsBetween, weekStart } from '../../lib/stats';
import {
  MIN_SESSIONS_FOR_FIT,
  chronotypeOf,
  cosinorFit,
  peakWindow
} from '../../services/chronobiology';
import { addDays, formatMinutes } from '../../services/gamification';
import { Bar, PageHead, Ring } from '../ui/bits';
import { Dialog } from '../ui/Dialog';

const BADGE_ICONS = {
  'first-step': Sprout,
  'streak-3': Flame,
  'streak-7': Zap,
  'streak-30': Crown,
  'sessions-25': Target,
  'hours-10': Hourglass,
  'hours-50': Trophy,
  marathon: Rocket,
  polymath: Brain,
  'early-bird': Sunrise,
  'night-owl': Moon,
  'team-player': Handshake,
  archivist: Library,
  curator: Bookmark
};

const hour = (value) => `${String(value).padStart(2, '0')}:00`;

/* ==========================================================================
   WEEKLY GOAL
   ========================================================================== */
const GoalForm = ({ onClose }) => {
  const { goals, updateGoals } = useApp();
  const [hours, setHours] = useState(goals.targetHoursPerWeek);
  const [count, setCount] = useState(goals.targetSessionsPerWeek);
  const [busy, setBusy] = useState(false);

  const valid = hours >= 1 && hours <= 168 && count >= 1 && count <= 200;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const saved = await updateGoals({
      targetHoursPerWeek: Math.round(hours),
      targetSessionsPerWeek: Math.round(count)
    });
    setBusy(false);
    if (saved) onClose();
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-body">
        <div className="field-row">
          <div className="field">
            <label htmlFor="goalHours">Số giờ mỗi tuần</label>
            <input
              id="goalHours"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={168}
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              data-autofocus
            />
          </div>
          <div className="field">
            <label htmlFor="goalSessions">Số phiên mỗi tuần</label>
            <input
              id="goalSessions"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>
        </div>
        <p className="field-hint">Đặt mức bạn làm được đều đặn. Tăng dần sau cũng chưa muộn.</p>
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
          {busy ? 'Đang lưu…' : 'Lưu mục tiêu'}
        </button>
      </div>
    </form>
  );
};

/* ==========================================================================
   BEST HOURS — when in the day this student actually studies best.
   Shown only once there is enough history for the answer to mean something.
   ========================================================================== */
const BestHours = ({ sessions }) => {
  const fit = cosinorFit(sessions);

  if (!fit.valid) {
    const have = Math.min(sessions.length, MIN_SESSIONS_FOR_FIT);
    const left = MIN_SESSIONS_FOR_FIT - have;
    return (
      <section className="card" aria-labelledby="bestHours">
        <h2 className="card-title" id="bestHours">
          Giờ vàng của bạn
        </h2>
        <p className="muted hours-wait">
          {left > 0
            ? `Học thêm ${left} phiên nữa, Blooom sẽ tìm ra khung giờ bạn học tốt nhất.`
            : 'Thử học vào vài khung giờ khác nhau để Blooom so sánh được.'}
        </p>
        <Bar value={have / MIN_SESSIONS_FOR_FIT} color="var(--orange)" label="Số phiên đã có" />
        <span className="tiny faint">
          {have}/{MIN_SESSIONS_FOR_FIT} phiên
        </span>
      </section>
    );
  }

  const peak = peakWindow(fit.profile);
  const type = chronotypeOf(fit.acrophase);
  const tallest = Math.max(...fit.profile.map((bucket) => bucket.minutes), 1);
  const inPeak = (h) => (h - peak.start + 24) % 24 < peak.width;

  return (
    <section className="card" aria-labelledby="bestHours">
      <h2 className="card-title" id="bestHours">
        Giờ vàng của bạn
      </h2>
      <p className="hours-headline">
        <Clock size={22} aria-hidden="true" />
        <span className="num">
          {hour(peak.start)} – {hour(peak.end)}
        </span>
      </p>
      <p className="muted">
        <strong>{type.label}.</strong> {type.description}
      </p>

      <div
        className="hours"
        role="img"
        aria-label={`Số phút học theo từng giờ trong ngày. Nhiều nhất từ ${hour(peak.start)} đến ${hour(peak.end)}.`}
      >
        {fit.profile.map((bucket) => (
          <span
            key={bucket.hour}
            className={`hours-col ${inPeak(bucket.hour) ? 'is-peak' : ''}`}
            title={`${hour(bucket.hour)} — ${bucket.minutes} phút`}
          >
            <i
              style={{
                height: `${Math.max(bucket.minutes > 0 ? 6 : 0, (bucket.minutes / tallest) * 100)}%`
              }}
            />
          </span>
        ))}
      </div>
      <div className="hours-axis tiny faint" aria-hidden="true">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
    </section>
  );
};

/* ==========================================================================
   PROGRESS
   ========================================================================== */
export const Progress = () => {
  const { sessions, goals, game, newBadgeIds, acknowledgeBadges } = useApp();
  const now = useNow();

  const [range, setRange] = useState(7);
  const [editingGoal, setEditingGoal] = useState(false);

  /* Badges earned since the last visit keep their "new" label for this
     visit, and are marked as seen so it shows only once. */
  const [freshBadges] = useState(newBadgeIds);
  useEffect(() => {
    acknowledgeBadges();
  }, [acknowledgeBadges]);

  const monday = weekStart(now);
  const thisWeek = sessionsBetween(sessions, monday, addDays(monday, 7));
  const lastWeek = sessionsBetween(sessions, addDays(monday, -7), monday);
  const weekMinutes = minutesOf(thisWeek);
  const lastMinutes = minutesOf(lastWeek);
  const goalMinutes = goals.targetHoursPerWeek * 60;
  const delta = weekMinutes - lastMinutes;

  const days = dailyTotals(sessions, range, now);
  const tallest = Math.max(...days.map((day) => day.minutes), 1);
  const rangeSessions = sessionsBetween(
    sessions,
    days[0].date,
    addDays(days[days.length - 1].date, 1)
  );
  const subjects = bySubject(rangeSessions);
  const rangeMinutes = minutesOf(rangeSessions);

  const { level, streak, badges, unlockedCount } = game;

  return (
    <div className="stack-lg">
      <PageHead title="Tiến độ" description="Bạn đang học đều đến đâu." />

      <div className="progress-top">
        <section className="card goal" aria-labelledby="weekGoal">
          <Ring
            value={weekMinutes / goalMinutes}
            size={148}
            stroke={13}
            color="var(--green)"
            label={`Đã đạt ${Math.round((weekMinutes / goalMinutes) * 100)}% mục tiêu tuần`}
          >
            <span>
              <strong className="num goal-value">{hoursLabel(weekMinutes)}</strong>
              <span className="tiny faint goal-of">/ {goals.targetHoursPerWeek} giờ</span>
            </span>
          </Ring>

          <div className="grow stack-sm">
            <h2 className="card-title" id="weekGoal">
              Mục tiêu tuần này
            </h2>
            <div className="goal-line">
              <span className="small muted">
                {thisWeek.length} / {goals.targetSessionsPerWeek} phiên
              </span>
              <Bar
                value={thisWeek.length / goals.targetSessionsPerWeek}
                color="var(--green)"
                label="Số phiên trong tuần"
              />
            </div>
            {goals.isDefault && (
              <p className="tiny faint">Đây là mức gợi ý. Bạn đổi cho hợp với mình nhé.</p>
            )}
            <div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setEditingGoal(true)}
              >
                Đổi mục tiêu
              </button>
            </div>
          </div>
        </section>

        <section className="card trend" aria-labelledby="trend">
          <h2 className="card-title" id="trend">
            So với tuần trước
          </h2>
          {lastMinutes === 0 && weekMinutes === 0 ? (
            <p className="muted">Chưa có dữ liệu để so sánh. Học một phiên để bắt đầu nhé.</p>
          ) : (
            <>
              <p className={`trend-value ${delta >= 0 ? 'is-up' : 'is-down'}`}>
                {delta >= 0 ? (
                  <TrendingUp size={26} aria-hidden="true" />
                ) : (
                  <TrendingDown size={26} aria-hidden="true" />
                )}
                <span className="num">
                  {delta >= 0 ? '+' : '−'}
                  {formatMinutes(Math.abs(delta))}
                </span>
              </p>
              <p className="muted">
                {delta > 0 && 'Bạn đang học nhiều hơn tuần trước. Giữ nhịp này nhé!'}
                {delta === 0 && 'Bằng đúng tuần trước.'}
                {delta < 0 && 'Ít hơn tuần trước một chút. Vẫn còn thời gian để bù.'}
              </p>
            </>
          )}
          <div className="trend-streak">
            <span className={`streak-flame ${streak.current > 0 ? 'is-lit' : ''}`}>
              <Flame size={20} aria-hidden="true" />
            </span>
            <span>
              <strong className="num">{streak.current} ngày liên tiếp</strong>
              <span className="tiny faint" style={{ display: 'block' }}>
                Dài nhất: {streak.longest} ngày
              </span>
            </span>
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="activity">
        <div className="card-head">
          <div>
            <h2 className="card-title" id="activity">
              Thời gian học
            </h2>
            <p className="small muted">
              {formatMinutes(rangeMinutes)} trong {range} ngày qua
            </p>
          </div>
          <div className="segmented" role="group" aria-label="Khoảng thời gian">
            {[7, 30].map((value) => (
              <button
                key={value}
                type="button"
                className={range === value ? 'is-active' : ''}
                aria-pressed={range === value}
                onClick={() => setRange(value)}
              >
                {value} ngày
              </button>
            ))}
          </div>
        </div>

        <div
          className={`bars ${range > 7 ? 'is-dense' : ''}`}
          role="img"
          aria-label={`Số phút học mỗi ngày trong ${range} ngày qua`}
        >
          {days.map((day) => (
            <div key={day.key} className={`bar-col ${day.isToday ? 'is-today' : ''}`}>
              {range <= 7 && (
                <span className="bar-value num">{day.minutes > 0 ? day.minutes : ''}</span>
              )}
              <span className="bar-track">
                <span
                  className="bar-fill"
                  style={{
                    height: `${Math.max(day.minutes > 0 ? 5 : 0, (day.minutes / tallest) * 100)}%`
                  }}
                  title={`${day.date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}: ${day.minutes} phút`}
                />
              </span>
              <span className="bar-label">
                {range <= 7 ? (day.isToday ? 'Nay' : day.label) : day.dayOfMonth}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="progress-mid">
        <section className="card" aria-labelledby="subjects">
          <h2 className="card-title" id="subjects">
            Theo môn
          </h2>
          {subjects.length === 0 ? (
            <p className="muted subjects-empty">Chưa có phiên nào trong {range} ngày qua.</p>
          ) : (
            <ul className="subjects">
              {subjects.map((item) => (
                <li key={item.subject}>
                  <div className="row-between">
                    <span className="row" style={{ gap: 8 }}>
                      <span
                        className="subject-dot"
                        style={{ '--dot': subjectColor(item.subject) }}
                        aria-hidden="true"
                      />
                      {subjectLabel(item.subject)}
                    </span>
                    <span className="small muted num">{formatMinutes(item.minutes)}</span>
                  </div>
                  <Bar
                    value={item.minutes / subjects[0].minutes}
                    color={subjectColor(item.subject)}
                    label={`${subjectLabel(item.subject)}: ${item.minutes} phút`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <BestHours sessions={sessions} />
      </div>

      <section className="card" aria-labelledby="badges">
        <div className="card-head">
          <div>
            <h2 className="card-title" id="badges">
              Huy hiệu
            </h2>
            <p className="small muted">
              Đã mở {unlockedCount}/{badges.length}
            </p>
          </div>
          <div className="level">
            <span className="small">
              <strong>Cấp {level.level}</strong> · {level.title}
            </span>
            <Bar value={level.percent / 100} color="var(--pink)" label="Tiến độ lên cấp" />
            <span className="tiny faint">Còn {level.xpRemaining} điểm nữa lên cấp</span>
          </div>
        </div>

        <ul className="badges">
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.id] || Trophy;
            return (
              <li
                key={badge.id}
                className={`badge ${badge.unlocked ? 'is-open' : ''}`}
                style={{ '--badge': badge.color }}
              >
                <span className="badge-icon" aria-hidden="true">
                  {badge.unlocked ? <Icon size={24} /> : <Lock size={20} />}
                </span>
                <strong>{badge.name}</strong>
                <span className="tiny faint">{badge.requirement}</span>
                {freshBadges.includes(badge.id) && (
                  <span className="tag tag-pink badge-new">Mới</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Dialog
        open={editingGoal}
        onClose={() => setEditingGoal(false)}
        title="Mục tiêu tuần"
        description="Mỗi tuần bạn muốn học bao nhiêu?"
      >
        <GoalForm onClose={() => setEditingGoal(false)} />
      </Dialog>
    </div>
  );
};
