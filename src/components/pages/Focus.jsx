import { useEffect, useState } from 'react';
import { Coffee, Pause, Play, RotateCcw, Timer, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BREAK_RANGE, WORK_RANGE, useTimer } from '../../context/TimerContext';
import { SUBJECTS, subjectColor, subjectLabel } from '../../lib/subjects';
import { clock, useNow } from '../../lib/time';
import { minutesOf } from '../../lib/stats';
import { dayKey, formatMinutes } from '../../services/gamification';
import { Empty } from '../ui/bits';

const PRESETS = [
  { work: 25, rest: 5 },
  { work: 50, rest: 10 },
  { work: 90, rest: 15 }
];

const RADIUS = 136;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const NumberStep = ({ id, label, value, range, onChange }) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(value - 5)}
        disabled={value <= range.min}
        aria-label={`Giảm ${label.toLowerCase()}`}
      >
        −
      </button>
      <input
        id={id}
        className="num"
        type="number"
        inputMode="numeric"
        min={range.min}
        max={range.max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <button
        type="button"
        onClick={() => onChange(value + 5)}
        disabled={value >= range.max}
        aria-label={`Tăng ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  </div>
);

/* ==========================================================================
   FOCUS — the timer. One big number, one big button; everything else steps
   back while a session is running.
   ========================================================================== */
export const Focus = () => {
  const { sessions } = useApp();
  const timer = useTimer();
  const now = useNow();

  const [showAll, setShowAll] = useState(false);
  const [custom, setCustom] = useState(
    () => !PRESETS.some((preset) => preset.work === timer.workMinutes)
  );

  const working = timer.mode === 'work';
  const settingUp = timer.isIdle && working;

  /* Space starts and pauses — but only when the key is not already doing
     something else, like typing or pressing the focused button. */
  const { toggle } = timer;
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'Space' || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const todayKey = dayKey(now);
  const todaySessions = sessions.filter((session) => dayKey(session.startedAt) === todayKey);
  const listed = showAll ? sessions.slice(0, 40) : todaySessions;

  const mainLabel = timer.isRunning ? 'Tạm dừng' : timer.isIdle ? 'Bắt đầu' : 'Tiếp tục';

  return (
    <div className="focus">
      <section className={`card focus-card ${working ? '' : 'is-break'} is-${timer.status}`}>
        <div className="focus-top">
          <span className={`tag ${working ? 'tag-orange' : 'tag-green'}`}>
            {working ? (
              <Timer size={14} aria-hidden="true" />
            ) : (
              <Coffee size={14} aria-hidden="true" />
            )}
            {working ? 'Tập trung' : 'Giờ nghỉ'}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={timer.toggleSound}
            aria-label={timer.sound ? 'Tắt chuông báo' : 'Bật chuông báo'}
            title={timer.sound ? 'Chuông báo: bật' : 'Chuông báo: tắt'}
          >
            {timer.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="dial">
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <circle className="dial-track" cx="150" cy="150" r={RADIUS} />
            <circle
              className="dial-value"
              cx="150"
              cy="150"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * timer.progress}
            />
          </svg>
          <div className="dial-face">
            <span
              className="dial-time num"
              role="timer"
              aria-label={`Còn ${Math.ceil(timer.remainingSeconds / 60)} phút`}
            >
              {clock(timer.remainingSeconds)}
            </span>
            <span className="dial-caption">
              {working ? (
                <>
                  <span
                    className="subject-dot"
                    style={{ '--dot': subjectColor(timer.subject) }}
                    aria-hidden="true"
                  />
                  {subjectLabel(timer.subject)}
                </>
              ) : (
                'Đứng dậy, uống nước, nhìn ra xa'
              )}
            </span>
          </div>
        </div>

        <div className="focus-controls">
          <button
            type="button"
            className={`btn btn-lg focus-main ${timer.isRunning ? 'btn-outline' : 'btn-primary'}`}
            onClick={timer.toggle}
          >
            {timer.isRunning ? (
              <Pause size={20} aria-hidden="true" />
            ) : (
              <Play size={20} fill="currentColor" aria-hidden="true" />
            )}
            {mainLabel}
          </button>

          {!timer.isIdle && working && (
            <button type="button" className="btn btn-ghost" onClick={timer.finishEarly}>
              Xong sớm, lưu lại
            </button>
          )}
          {!working && (
            <button type="button" className="btn btn-ghost" onClick={timer.skipBreak}>
              Bỏ qua giờ nghỉ
            </button>
          )}
          {!timer.isIdle && working && (
            <button
              type="button"
              className="icon-btn"
              onClick={timer.reset}
              aria-label="Hủy phiên này"
              title="Hủy phiên này"
            >
              <RotateCcw size={20} />
            </button>
          )}
        </div>

        {settingUp && (
          <div className="focus-setup">
            <div className="field">
              <span className="field-label" id="focusSubject">
                Môn học
              </span>
              <div className="chips focus-chips" role="group" aria-labelledby="focusSubject">
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
            </div>

            <div className="field">
              <span className="field-label" id="focusLength">
                Thời lượng
              </span>
              <div className="segmented" role="group" aria-labelledby="focusLength">
                {PRESETS.map((preset) => {
                  const active = !custom && timer.workMinutes === preset.work;
                  return (
                    <button
                      key={preset.work}
                      type="button"
                      className={active ? 'is-active' : ''}
                      aria-pressed={active}
                      onClick={() => {
                        setCustom(false);
                        timer.setLengths(preset.work, preset.rest);
                      }}
                    >
                      {preset.work} phút
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={custom ? 'is-active' : ''}
                  aria-pressed={custom}
                  onClick={() => setCustom(true)}
                >
                  Tự chọn
                </button>
              </div>
            </div>

            {custom && (
              <div className="field-row">
                <NumberStep
                  id="customWork"
                  label="Học (phút)"
                  value={timer.workMinutes}
                  range={WORK_RANGE}
                  onChange={(value) => timer.setLengths(value, timer.breakMinutes)}
                />
                <NumberStep
                  id="customBreak"
                  label="Nghỉ (phút)"
                  value={timer.breakMinutes}
                  range={BREAK_RANGE}
                  onChange={(value) => timer.setLengths(timer.workMinutes, value)}
                />
              </div>
            )}

            {!custom && (
              <p className="tiny faint focus-hint">
                Học {timer.workMinutes} phút, rồi nghỉ {timer.breakMinutes} phút.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card focus-log" aria-labelledby="focusLog">
        <div className="card-head">
          <div>
            <h2 className="card-title" id="focusLog">
              {showAll ? 'Các phiên gần đây' : 'Hôm nay'}
            </h2>
            {!showAll && (
              <p className="small muted">
                {todaySessions.length > 0
                  ? `${formatMinutes(minutesOf(todaySessions))} · ${todaySessions.length} phiên`
                  : 'Chưa học phiên nào'}
              </p>
            )}
          </div>
          {sessions.length > todaySessions.length && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Chỉ hôm nay' : 'Xem tất cả'}
            </button>
          )}
        </div>

        {listed.length === 0 ? (
          <Empty icon={<Timer size={30} />} title="Sẵn sàng chưa?">
            Phiên học xong sẽ được ghi lại ở đây.
          </Empty>
        ) : (
          <ul className="rows">
            {listed.map((session) => (
              <li key={session.id} className="row-item">
                <span
                  className="subject-dot"
                  style={{ '--dot': subjectColor(session.subject) }}
                  aria-hidden="true"
                />
                <span className="grow truncate">{subjectLabel(session.subject)}</span>
                <span className="small faint">
                  {new Date(session.startedAt).toLocaleString(
                    'vi-VN',
                    showAll
                      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
                      : { hour: '2-digit', minute: '2-digit' }
                  )}
                </span>
                <strong className="num">{session.durationMinutes}′</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
