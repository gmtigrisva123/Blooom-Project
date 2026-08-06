import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';
import { SUBJECTS, subjectColor } from '../../constants/subjects';
import { formatMinutes, dayKey } from '../../services/gamification';
import { Hero, EmptyState, SubjectBadge } from '../common/ui';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Timer as TimerIcon,
  CheckCircle2,
  BookOpen,
  History,
  Coffee,
  GraduationCap
} from 'lucide-react';

const PRESETS = [
  { work: 25, rest: 5, name: 'Chuẩn' },
  { work: 50, rest: 10, name: 'Học Sâu' },
  { work: 90, rest: 15, name: 'Luyện Đề' }
];

const RING_RADIUS = 116;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const WorkTimer = () => {
  const { handleSaveTimerSession, timerSessions, timerControlsRef, showToast } = useApp();

  const [mode, setMode] = useState('work');
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [subject, setSubject] = useState('Toán');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const intervalRef = useRef(null);
  /* The tick callback reads the latest completion handler through a ref so the
     countdown interval never has to be torn down and restarted mid-session. */
  const completeRef = useRef(null);

  const totalSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progressPercent = totalSeconds
    ? Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
    : 0;
  const isUrgent = isRunning && secondsLeft <= 60;

  /* ---- Chime generated with the Web Audio API (no audio files needed) ---- */
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.6); // G5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      setTimeout(() => ctx.close(), 1500);
    } catch {
      /* Autoplay blocked or Web Audio unsupported — silent is fine. */
    }
  }, [soundEnabled]);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    playChime();

    if (mode === 'work') {
      try {
        confetti({
          particleCount: 120,
          spread: 78,
          origin: { y: 0.62 },
          colors: ['#8b5cf6', '#ec4899', '#f97316', '#fbbf24', '#06b6d4']
        });
      } catch {
        /* Confetti is decorative — never let it break the session save. */
      }

      handleSaveTimerSession({ subject, durationMinutes: workMinutes });
      setMode('break');
      setSecondsLeft(breakMinutes * 60);
    } else {
      showToast('Hết giờ nghỉ! Quay lại học thôi 💪', 'info');
      setMode('work');
      setSecondsLeft(workMinutes * 60);
    }
  }, [mode, playChime, handleSaveTimerSession, subject, workMinutes, breakMinutes, showToast]);

  /* Keep the ref pointing at the newest handler without touching it during
     render — the countdown interval reads it on every tick. */
  useEffect(() => {
    completeRef.current = handleComplete;
  });

  /* ---- Countdown -------------------------------------------------------- */
  useEffect(() => {
    if (!isRunning) return undefined;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          completeRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  /* Show the countdown in the browser tab while a session runs. */
  useEffect(() => {
    const original = document.title;
    if (isRunning) {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      const clock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      document.title = `${mode === 'work' ? '📚' : '☕'} ${clock} — Blooom`;
    }
    return () => {
      document.title = original;
    };
  }, [isRunning, secondsLeft, mode]);

  const toggleTimer = useCallback(() => setIsRunning((r) => !r), []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60);
  }, [mode, workMinutes, breakMinutes]);

  /* Expose controls so the global Space / R shortcuts can drive the timer. */
  useEffect(() => {
    timerControlsRef.current = { toggle: toggleTimer, reset: resetTimer };
    return () => {
      timerControlsRef.current = null;
    };
  }, [timerControlsRef, toggleTimer, resetTimer]);

  const switchMode = (next) => {
    setMode(next);
    setIsRunning(false);
    setSecondsLeft((next === 'work' ? workMinutes : breakMinutes) * 60);
  };

  const applyPreset = (preset) => {
    setIsRunning(false);
    setWorkMinutes(preset.work);
    setBreakMinutes(preset.rest);
    setMode('work');
    setSecondsLeft(preset.work * 60);
  };

  const formatClock = (total) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

  /* ---- Session log ------------------------------------------------------ */
  const todayTotal = useMemo(() => {
    const today = dayKey(new Date());
    return timerSessions
      .filter((s) => dayKey(s.startedAt) === today)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  }, [timerSessions]);

  const activePreset = PRESETS.find((p) => p.work === workMinutes);

  return (
    <div className="stack-5">
      <Hero
        eyebrow="Pomodoro tập trung"
        icon={<TimerIcon size={12} />}
        title="Học Sâu Từng Phiên, Nghỉ Đúng Lúc"
        description="Chọn môn học, đặt thời lượng và để Blooom ghi lại từng phút tập trung của bạn. Mỗi phút học là 1 điểm XP."
        action={
          <div className="row" style={{ gap: '0.5rem' }}>
            <span className="kbd">Space</span>
            <span className="t-xs t-dim">chạy/dừng</span>
            <span className="kbd">R</span>
            <span className="t-xs t-dim">đặt lại</span>
          </div>
        }
      />

      <div className="split">
        {/* ---------------------------------------------------------------- */}
        {/* Timer                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="panel timer-panel">
          <div className="row-between" style={{ width: '100%' }}>
            <span className="badge badge-accent badge-eyebrow">
              {mode === 'work' ? <GraduationCap size={12} /> : <Coffee size={12} />}
              {mode === 'work' ? 'Phiên học tập' : 'Thời gian nghỉ'}
            </span>

            <button
              className={`icon-btn ${soundEnabled ? 'is-active' : ''}`}
              onClick={() => setSoundEnabled((s) => !s)}
              title={soundEnabled ? 'Đang bật âm báo' : 'Đã tắt âm báo'}
              aria-label="Bật/tắt âm báo khi hết giờ"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          <div className="mode-switch" style={{ marginTop: 'var(--sp-5)' }}>
            <span
              className={`mode-thumb ${mode === 'break' ? 'at-break' : ''}`}
              aria-hidden="true"
            />
            <button
              className={`mode-btn ${mode === 'work' ? 'is-active' : ''}`}
              onClick={() => switchMode('work')}
            >
              Học {workMinutes}′
            </button>
            <button
              className={`mode-btn ${mode === 'break' ? 'is-active' : ''}`}
              onClick={() => switchMode('break')}
            >
              Nghỉ {breakMinutes}′
            </button>
          </div>

          {mode === 'work' && (
            <div className="field" style={{ maxWidth: '17rem', width: '100%' }}>
              <label htmlFor="timerSubject" className="t-xs t-dim">
                Môn học đang rèn luyện
              </label>
              <select
                id="timerSubject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isRunning}
              >
                {SUBJECTS.filter((s) => s.value !== 'Khác').map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ---- Countdown ring ---- */}
          <div
            className={['ring-wrap', isRunning ? 'is-running' : '', isUrgent ? 'is-urgent' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <svg className="ring-svg" viewBox="0 0 256 256">
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent-2)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>
              <circle className="ring-track" cx="128" cy="128" r={RING_RADIUS} />
              <circle
                className="ring-progress"
                cx="128"
                cy="128"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressPercent / 100)}
              />
            </svg>

            <div className="ring-face">
              <span className="ring-time">{formatClock(secondsLeft)}</span>
              <span className="ring-caption">
                {mode === 'work' ? (
                  <>
                    <BookOpen size={13} /> {subject}
                  </>
                ) : (
                  <>
                    <Coffee size={13} /> Thư giãn nào
                  </>
                )}
              </span>
              <span className="ring-pct">{Math.round(progressPercent)}% hoàn thành</span>
            </div>
          </div>

          <div className="timer-controls">
            <button
              className={`btn btn-lg ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleTimer}
            >
              {isRunning ? (
                <>
                  <Pause size={18} /> Tạm Dừng
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  {secondsLeft === totalSeconds ? 'Bắt Đầu Học' : 'Tiếp Tục'}
                </>
              )}
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={resetTimer}
              title="Đặt lại bộ đếm (R)"
              aria-label="Đặt lại bộ đếm"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="preset-row">
            {PRESETS.map((preset) => (
              <button
                key={preset.work}
                className={`preset ${activePreset?.work === preset.work ? 'is-active' : ''}`}
                onClick={() => applyPreset(preset)}
                disabled={isRunning}
              >
                <span className="preset-time">
                  {preset.work}′ / {preset.rest}′
                </span>
                <span className="preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Session log                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="panel log-panel">
          <div className="section-head">
            <span className="section-head-icon">
              <History size={16} />
            </span>
            <div className="grow">
              <h3>Nhật Ký Phiên Học</h3>
              <span className="t-xs t-dim">{timerSessions.length} phiên đã hoàn thành</span>
            </div>
          </div>

          {timerSessions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={30} />}
              title="Chưa có phiên học nào"
              description="Hoàn thành phiên Pomodoro đầu tiên và nó sẽ xuất hiện ngay tại đây, kèm điểm XP."
            />
          ) : (
            <>
              <div className="log-list scroll-y">
                {timerSessions.map((session) => (
                  <div
                    className="list-row"
                    key={session.id}
                    style={{ '--row-color': subjectColor(session.subject) }}
                  >
                    <span className="list-row-icon">
                      <BookOpen size={16} />
                    </span>
                    <div className="list-row-body">
                      <div className="list-row-title">{session.subject}</div>
                      <div className="list-row-meta">
                        {new Date(session.startedAt).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </div>
                    </div>
                    <SubjectBadge subject={session.subject}>
                      +{session.durationMinutes}′
                    </SubjectBadge>
                  </div>
                ))}
              </div>

              <div className="log-total">
                <span className="t-sm t-soft">Tổng thời gian học hôm nay</span>
                <span className="log-total-value">{formatMinutes(todayTotal)}</span>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
