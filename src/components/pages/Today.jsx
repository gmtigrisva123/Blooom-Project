import { Check, Layers, Play, Target, Timer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTimer } from '../../context/TimerContext';
import { navigate } from '../../lib/router';
import { setIntent } from '../../lib/intent';
import { SUBJECTS, subjectColor, subjectLabel } from '../../lib/subjects';
import { clock, greetingFor, hoursLabel, longDate, useNow } from '../../lib/time';
import { dailyTotals, minutesOf, minutesOn, sessionsBetween, weekStart } from '../../lib/stats';
import { dueQueue } from '../../services/srs';
import { addDays, formatMinutes, relativeTime } from '../../services/gamification';
import { Bar, Empty } from '../ui/bits';
import { WeekGarden } from '../shell/Sidebar';

const LENGTHS = [
  { work: 25, rest: 5 },
  { work: 50, rest: 10 },
  { work: 90, rest: 15 }
];

/* ==========================================================================
   START · the one thing this page is for: begin studying in one press.
   While a session is under way it shows that session instead.
   ========================================================================== */
const StartCard = () => {
  const timer = useTimer();

  if (!timer.isIdle) {
    const working = timer.mode === 'work';
    return (
      <section className={`card start-card is-live ${working ? '' : 'is-break'}`}>
        <p className="muted">
          {working ? `Đang học ${subjectLabel(timer.subject)}` : 'Đang nghỉ giải lao'}
        </p>
        <p className="start-live-time num" role="timer">
          {clock(timer.remainingSeconds)}
        </p>
        <Bar
          value={1 - timer.progress}
          color={working ? 'var(--color-sand)' : 'var(--color-mint)'}
          label="Thời gian còn lại"
        />
        <div className="row wrap">
          <button type="button" className="btn btn-primary" onClick={timer.toggle}>
            {timer.isRunning ? 'Tạm dừng' : 'Học tiếp'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('tap-trung')}>
            Mở đồng hồ
          </button>
        </div>
      </section>
    );
  }

  const isPreset = LENGTHS.some((item) => item.work === timer.workMinutes);

  const begin = () => {
    timer.start();
    navigate('tap-trung');
  };

  return (
    <section className="card start-card">
      <h2>Học gì bây giờ?</h2>

      <div className="chips" role="group" aria-label="Chọn môn">
        {SUBJECTS.map((subject) => (
          <button
            key={subject.value}
            type="button"
            className={`chip ${timer.subject === subject.value ? 'is-active' : ''}`}
            aria-pressed={timer.subject === subject.value}
            onClick={() => timer.setSubject(subject.value)}
          >
            <span className="tag-dot" style={{ '--dot': subject.color }} />
            {subject.label}
          </button>
        ))}
      </div>

      <div className="start-bottom">
        <div className="segmented" role="group" aria-label="Chọn thời lượng">
          {LENGTHS.map((item) => (
            <button
              key={item.work}
              type="button"
              className={timer.workMinutes === item.work ? 'is-active' : ''}
              aria-pressed={timer.workMinutes === item.work}
              onClick={() => timer.setLengths(item.work, item.rest)}
            >
              {item.work} phút
            </button>
          ))}
          {!isPreset && (
            <button type="button" className="is-active" aria-pressed="true">
              {timer.workMinutes} phút
            </button>
          )}
        </div>

        <button type="button" className="btn btn-lg btn-primary" onClick={begin}>
          <Play size={18} fill="currentColor" aria-hidden="true" />
          Bắt đầu học
        </button>
      </div>
    </section>
  );
};

/* One line of today's list. */
const Task = ({ icon: Icon, done, title, detail, action, children }) => (
  <li className={`task ${done ? 'is-done' : ''}`}>
    <span className="task-icon" aria-hidden="true">
      {done ? <Check size={20} /> : <Icon size={20} />}
    </span>
    <div className="grow">
      <strong>{title}</strong>
      {detail && <span className="small muted">{detail}</span>}
      {children}
    </div>
    {action}
  </li>
);

/* ==========================================================================
   TODAY
   ========================================================================== */
export const Today = () => {
  const { user, isGuest, sessions, cards, goals } = useApp();
  const timer = useTimer();
  const now = useNow();

  const firstName = isGuest ? '' : (user?.name || '').trim().split(/\s+/).pop();

  const todayMinutes = minutesOn(sessions, now);
  const monday = weekStart(now);
  const weekMinutes = minutesOf(sessionsBetween(sessions, monday, addDays(monday, 7)));
  const goalMinutes = goals.targetHoursPerWeek * 60;

  const due = dueQueue(cards, now).length;
  const days = dailyTotals(sessions, 7, now);
  const peak = Math.max(...days.map((day) => day.minutes), 1);
  const recent = sessions.slice(0, 5);

  const review = () => {
    setIntent('review');
    navigate('the-nho');
  };

  const addCard = () => {
    setIntent('add-card');
    navigate('the-nho');
  };

  return (
    <div className="stack-lg">
      <header className="hello">
        <p className="muted">{longDate(now)}</p>
        <h1>
          {greetingFor(now)}
          {firstName ? `, ${firstName}` : ''}!
        </h1>
      </header>

      <div className="today-top">
        <StartCard />

        <section className="card" aria-labelledby="todayList">
          <h2 className="card-title" id="todayList">
            Việc hôm nay
          </h2>
          <ul className="tasks">
            <Task
              icon={Timer}
              done={todayMinutes > 0}
              title={
                todayMinutes > 0
                  ? `Đã học ${formatMinutes(todayMinutes)}`
                  : 'Học một phiên tập trung'
              }
              detail={
                todayMinutes > 0 ? 'Hôm nay' : `${timer.workMinutes} phút là đủ để bắt đầu`
              }
            />

            {cards.length === 0 ? (
              <Task
                icon={Layers}
                title="Tạo thẻ nhớ đầu tiên"
                detail="Ghi lại điều vừa học để khỏi quên"
                action={
                  <button type="button" className="btn btn-sm" onClick={addCard}>
                    Tạo thẻ
                  </button>
                }
              />
            ) : (
              <Task
                icon={Layers}
                done={due === 0}
                title={due > 0 ? `Ôn ${due} thẻ nhớ` : 'Đã ôn hết thẻ hôm nay'}
                detail={due > 0 ? 'Đến lúc ôn lại rồi' : 'Không còn thẻ nào đến hạn'}
                action={
                  due > 0 && (
                    <button type="button" className="btn btn-sm" onClick={review}>
                      Ôn ngay
                    </button>
                  )
                }
              />
            )}

            <Task
              icon={Target}
              done={weekMinutes >= goalMinutes}
              title={`Tuần này: ${hoursLabel(weekMinutes)} trên ${goals.targetHoursPerWeek} giờ`}
            >
              <Bar
                value={weekMinutes / goalMinutes}
                color="var(--color-mint)"
                label="Tiến độ mục tiêu tuần"
              />
            </Task>
          </ul>
        </section>
      </div>

      {/* On a laptop the garden lives in the sidebar; a phone has no sidebar. */}
      <section className="card garden-card" aria-label="Vườn tuần này">
        <WeekGarden height={72} />
      </section>

      <div className="today-bottom">
        <section className="card" aria-labelledby="weekChart">
          <div className="card-head">
            <h2 className="card-title" id="weekChart">
              7 ngày qua
            </h2>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => navigate('tien-do')}
            >
              Xem tiến độ
            </button>
          </div>
          <div className="bars" role="img" aria-label="Số phút học mỗi ngày trong 7 ngày qua">
            {days.map((day) => (
              <div key={day.key} className={`bar-col ${day.isToday ? 'is-today' : ''}`}>
                <span className="bar-value num">{day.minutes > 0 ? day.minutes : ''}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ transform: `scaleY(${day.minutes / peak})` }}
                  />
                </span>
                <span className="bar-label">{day.isToday ? 'Nay' : day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="recent">
          <h2 className="card-title" id="recent">
            Vừa học
          </h2>
          {recent.length === 0 ? (
            <Empty title="Chưa có phiên nào">Phiên đầu tiên của bạn sẽ hiện ở đây.</Empty>
          ) : (
            <ul className="rows">
              {recent.map((session) => (
                <li key={session.id} className="row-item">
                  <span
                    className="subject-dot"
                    style={{ '--dot': subjectColor(session.subject) }}
                    aria-hidden="true"
                  />
                  <span className="grow truncate">{subjectLabel(session.subject)}</span>
                  <span className="small muted">{relativeTime(session.startedAt)}</span>
                  <strong className="num">{session.durationMinutes}′</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
