import { addDays, dayKey, startOfDay } from '../services/gamification';

/* ==========================================================================
   STATS — the small sums the pages share. Everything takes `now` as an
   argument instead of reading the clock, so a render stays reproducible.
   ========================================================================== */

/* Monday 00:00 of the week `date` falls in — the week a student means when
   they say "this week". */
export const weekStart = (date) => {
  const day = startOfDay(date);
  return addDays(day, -((day.getDay() + 6) % 7));
};

export const sessionsBetween = (sessions, from, to) =>
  sessions.filter((session) => {
    const at = new Date(session.startedAt);
    return at >= from && at < to;
  });

export const minutesOf = (sessions) =>
  sessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0);

export const minutesOn = (sessions, date) => {
  const key = dayKey(date);
  return minutesOf(sessions.filter((session) => dayKey(session.startedAt) === key));
};

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* One bucket per day for the last `count` days, oldest first. */
export const dailyTotals = (sessions, count, now) => {
  const today = startOfDay(now);
  const todayKey = dayKey(today);

  const byDay = new Map();
  sessions.forEach((session) => {
    const key = dayKey(session.startedAt);
    byDay.set(key, (byDay.get(key) || 0) + (session.durationMinutes || 0));
  });

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - (count - 1));
    const key = dayKey(date);
    return {
      key,
      date,
      label: DOW[date.getDay()],
      dayOfMonth: date.getDate(),
      minutes: byDay.get(key) || 0,
      isToday: key === todayKey
    };
  });
};

/* Minutes per subject, biggest first. */
export const bySubject = (sessions) => {
  const totals = new Map();
  sessions.forEach((session) => {
    totals.set(session.subject, (totals.get(session.subject) || 0) + session.durationMinutes);
  });
  return [...totals.entries()]
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
};
