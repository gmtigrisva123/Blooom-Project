import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import confetti from 'canvas-confetti';
import { useApp } from './AppContext';
import { useToast } from './ToastContext';
import { getPrefs, setPrefs, readTimerSnapshot, writeTimerSnapshot } from '../services/storage';
import { clock } from '../lib/time';
import { tokenHex } from '../lib/paper';

const TimerContext = createContext(null);

/* The database accepts sessions of 1–600 minutes; the timer stays inside a
   range that still makes sense as one sitting. */
export const WORK_RANGE = { min: 1, max: 180 };
export const BREAK_RANGE = { min: 1, max: 60 };

const MINUTE = 60000;

const within = (value, { min, max }) => Math.min(max, Math.max(min, Math.round(value) || min));

const freshState = () => {
  const prefs = getPrefs();
  const workMinutes = within(prefs.workMinutes, WORK_RANGE);
  const breakMinutes = within(prefs.breakMinutes, BREAK_RANGE);

  const base = {
    mode: 'work',
    status: 'idle',
    workMinutes,
    breakMinutes,
    subject: prefs.subject,
    remainingMs: workMinutes * MINUTE,
    endsAt: null,
    startedAt: null
  };

  /* A refresh in the middle of a session picks up where it left off. */
  const snapshot = readTimerSnapshot();
  return snapshot ? { ...base, ...snapshot } : base;
};

/* A three-note chime made with Web Audio — no audio file to download. */
const playChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* Sound blocked or unsupported: staying silent is fine. */
  }
};

const celebrate = () => {
  try {
    confetti({
      particleCount: 110,
      spread: 76,
      origin: { y: 0.6 },
      /* Paper scraps in the four accents, read from the tokens. */
      shapes: ['square'],
      colors: ['--color-accent', '--color-accent-3', '--color-mint', '--color-accent-2'].map(
        tokenHex
      )
    });
  } catch {
    /* Decoration only — must never get in the way of saving the session. */
  }
};

/* ==========================================================================
   TIMER PROVIDER

   The timer lives above the pages, so it keeps counting while a student
   checks their flashcards or a group, and every page can show it.

   Time is measured against the clock (`endsAt`), not by subtracting one each
   second: browsers slow timers down in background tabs, and a 25-minute
   session that takes 31 minutes is a broken promise.
   ========================================================================== */
export const TimerProvider = ({ children }) => {
  const { saveSession } = useApp();
  const showToast = useToast();

  const [state, setState] = useState(freshState);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [sound, setSound] = useState(() => getPrefs().sound);

  const { mode, status, workMinutes, breakMinutes, subject, endsAt } = state;
  const isRunning = status === 'running';

  const totalMs = (mode === 'work' ? workMinutes : breakMinutes) * MINUTE;
  const remainingMs = isRunning ? Math.max(0, endsAt - nowMs) : state.remainingMs;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  /* The tick reads the latest state and handlers through refs, so the
     interval is not torn down and rebuilt on every render. */
  const latest = useRef({ state, sound });
  const finishedFor = useRef(null);

  useEffect(() => {
    latest.current = { state, sound };
  });

  const finish = useCallback(() => {
    const { state: current, sound: soundOn } = latest.current;

    /* Two ticks can land before React re-renders; the same deadline must
       never be completed twice. */
    if (finishedFor.current === current.endsAt) return;
    finishedFor.current = current.endsAt;

    if (soundOn) playChime();
    const now = Date.now();

    if (current.mode === 'work') {
      celebrate();
      saveSession({
        subject: current.subject,
        durationMinutes: current.workMinutes,
        startedAt: current.startedAt
      });

      /* The break starts by itself: the student has just stood up. */
      const breakMs = current.breakMinutes * MINUTE;
      setState({
        ...current,
        mode: 'break',
        status: 'running',
        remainingMs: breakMs,
        endsAt: now + breakMs,
        startedAt: null
      });
      setNowMs(now);
      return;
    }

    showToast('Hết giờ nghỉ. Sẵn sàng học tiếp chưa?', 'info');
    setState({
      ...current,
      mode: 'work',
      status: 'idle',
      remainingMs: current.workMinutes * MINUTE,
      endsAt: null,
      startedAt: null
    });
  }, [saveSession, showToast]);

  /* ---- Ticking ---------------------------------------------------------- */
  useEffect(() => {
    if (!isRunning) return undefined;

    const tick = () => {
      const now = Date.now();
      if (now >= endsAt) finish();
      else setNowMs(now);
    };

    const id = setInterval(tick, 250);
    /* Coming back to a tab that was asleep should show the right time at
       once, not a second later. */
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [isRunning, endsAt, finish]);

  /* ---- Survive a refresh ------------------------------------------------ */
  useEffect(() => {
    writeTimerSnapshot(state);
  }, [state]);

  /* ---- Countdown in the browser tab ------------------------------------- */
  useEffect(() => {
    if (!isRunning) return undefined;

    const original = document.title;
    document.title = `${clock(remainingSeconds)} · ${mode === 'work' ? 'Tập trung' : 'Nghỉ'} — Blooom`;
    return () => {
      document.title = original;
    };
  }, [isRunning, remainingSeconds, mode]);

  /* ---- Controls --------------------------------------------------------- */
  const start = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setState((prev) => {
      if (prev.status === 'running') return prev;
      return {
        ...prev,
        status: 'running',
        endsAt: now + prev.remainingMs,
        /* Stamped on the first start only. Working it out later from the end
           time would be wrong whenever the session was paused. */
        startedAt:
          prev.mode === 'work' && !prev.startedAt ? new Date(now).toISOString() : prev.startedAt
      };
    });
  }, []);

  const pause = useCallback(() => {
    const now = Date.now();
    setState((prev) => {
      if (prev.status !== 'running') return prev;
      return {
        ...prev,
        status: 'paused',
        remainingMs: Math.max(0, prev.endsAt - now),
        endsAt: null
      };
    });
  }, []);

  const toggle = useCallback(() => {
    if (latest.current.state.status === 'running') pause();
    else start();
  }, [pause, start]);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'work',
      status: 'idle',
      remainingMs: prev.workMinutes * MINUTE,
      endsAt: null,
      startedAt: null
    }));
  }, []);

  const setLengths = useCallback((work, rest) => {
    const nextWork = within(work, WORK_RANGE);
    const nextBreak = within(rest, BREAK_RANGE);
    setPrefs({ workMinutes: nextWork, breakMinutes: nextBreak });
    setState((prev) => ({
      ...prev,
      mode: 'work',
      status: 'idle',
      workMinutes: nextWork,
      breakMinutes: nextBreak,
      remainingMs: nextWork * MINUTE,
      endsAt: null,
      startedAt: null
    }));
  }, []);

  const setSubject = useCallback((next) => {
    setPrefs({ subject: next });
    setState((prev) => ({ ...prev, subject: next }));
  }, []);

  const toggleSound = useCallback(() => {
    setSound((prev) => {
      setPrefs({ sound: !prev });
      return !prev;
    });
  }, []);

  /* Stopping early still counts — for the minutes actually studied. Losing
     an 18-minute effort because the plan said 25 teaches the wrong lesson. */
  const finishEarly = useCallback(() => {
    const current = latest.current.state;
    if (current.mode !== 'work') return;

    const left =
      current.status === 'running'
        ? Math.max(0, current.endsAt - Date.now())
        : current.remainingMs;
    const minutes = Math.floor((current.workMinutes * MINUTE - left) / MINUTE);

    if (minutes < 1) {
      showToast('Học ít nhất 1 phút thì mới lưu được nhé.', 'info');
      return;
    }

    saveSession({
      subject: current.subject,
      durationMinutes: minutes,
      startedAt: current.startedAt
    });
    reset();
  }, [saveSession, showToast, reset]);

  const skipBreak = useCallback(() => {
    reset();
  }, [reset]);

  const value = useMemo(
    () => ({
      mode,
      status,
      isRunning,
      isIdle: status === 'idle',
      workMinutes,
      breakMinutes,
      subject,
      remainingSeconds,
      totalSeconds: totalMs / 1000,
      progress: totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0,
      elapsedMinutes: Math.floor((totalMs - remainingMs) / MINUTE),
      sound,
      start,
      pause,
      toggle,
      reset,
      setLengths,
      setSubject,
      toggleSound,
      finishEarly,
      skipBreak
    }),
    [
      mode,
      status,
      isRunning,
      workMinutes,
      breakMinutes,
      subject,
      remainingSeconds,
      totalMs,
      remainingMs,
      sound,
      start,
      pause,
      toggle,
      reset,
      setLengths,
      setSubject,
      toggleSound,
      finishEarly,
      skipBreak
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimer = () => useContext(TimerContext);
