/* ==========================================================================
   BLOOOM — CIRCADIAN ANALYSIS (COSINOR)

   Human alertness follows a roughly 24-hour rhythm, and the standard tool for
   fitting one to sparse, unevenly sampled data is cosinor analysis (Halberg,
   1969): least-squares fit of a single cosine of known period,

       y(h) = M + A · cos( 2π (h − φ) / 24 )

   where M is the MESOR (rhythm-adjusted mean), A the amplitude, and φ the
   acrophase — the clock hour at which the fitted curve peaks.

   Because the 24 hourly buckets are evenly spaced, the design matrix is
   orthogonal and the normal equations collapse to two sums. No matrix
   inversion is needed, which keeps the whole fit exact and cheap.

   What this can and cannot claim is stated honestly in the interface: it
   models WHEN a student chooses to study and how long they sustain it. It
   does not measure alertness directly.
   ========================================================================== */

const HOURS = 24;
const OMEGA = (2 * Math.PI) / HOURS;

const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* Minimum evidence before a rhythm is reported at all. Fitting a 3-parameter
   model to 4 sessions produces a confident-looking curve that means nothing. */
export const MIN_SESSIONS_FOR_FIT = 8;
export const MIN_DISTINCT_HOURS = 3;

/* --------------------------------------------------------------------------
   HOURLY PROFILE — 24 buckets, always all 24 present.
   An hour with no sessions is a real zero, not missing data: the student was
   awake and chose not to study then.
   -------------------------------------------------------------------------- */
export const hourlyProfile = (sessions) => {
  const buckets = Array.from({ length: HOURS }, (_, hour) => ({
    hour,
    minutes: 0,
    sessions: 0,
    meanDuration: 0
  }));

  sessions.forEach((session) => {
    const started = new Date(session.startedAt);
    if (Number.isNaN(started.getTime())) return;
    const bucket = buckets[started.getHours()];
    bucket.minutes += session.durationMinutes || 0;
    bucket.sessions += 1;
  });

  buckets.forEach((bucket) => {
    bucket.meanDuration = bucket.sessions === 0 ? 0 : bucket.minutes / bucket.sessions;
  });

  return buckets;
};

/* --------------------------------------------------------------------------
   WEEK × HOUR MATRIX — the heatmap behind the fitted curve.
   -------------------------------------------------------------------------- */
export const weeklyMatrix = (sessions) => {
  const grid = Array.from({ length: 7 }, (_, day) => ({
    day,
    label: DOW_LABELS[day],
    hours: Array.from({ length: HOURS }, (_, hour) => ({ hour, minutes: 0, sessions: 0 }))
  }));

  sessions.forEach((session) => {
    const started = new Date(session.startedAt);
    if (Number.isNaN(started.getTime())) return;
    const cell = grid[started.getDay()].hours[started.getHours()];
    cell.minutes += session.durationMinutes || 0;
    cell.sessions += 1;
  });

  const peak = Math.max(1, ...grid.flatMap((row) => row.hours.map((cell) => cell.minutes)));

  return { grid, peak };
};

/* --------------------------------------------------------------------------
   THE COSINOR FIT
   `metric` selects what is being rhythm-analysed: total minutes in the hour
   ('minutes') or mean sustained session length ('meanDuration').
   -------------------------------------------------------------------------- */
export const cosinorFit = (sessions, metric = 'minutes') => {
  const profile = hourlyProfile(sessions);
  const distinctHours = profile.filter((b) => b.sessions > 0).length;

  if (sessions.length < MIN_SESSIONS_FOR_FIT || distinctHours < MIN_DISTINCT_HOURS) {
    return {
      valid: false,
      profile,
      sessionCount: sessions.length,
      distinctHours,
      reason:
        `Cần ít nhất ${MIN_SESSIONS_FOR_FIT} phiên học trải trên ` +
        `${MIN_DISTINCT_HOURS} khung giờ khác nhau để ước lượng nhịp ngày đêm.`
    };
  }

  const y = profile.map((bucket) => bucket[metric]);
  const mesor = y.reduce((sum, v) => sum + v, 0) / HOURS;

  /* Orthogonal design ⇒ the regression coefficients are just scaled sums. */
  let beta = 0;
  let gamma = 0;
  for (let h = 0; h < HOURS; h += 1) {
    beta += y[h] * Math.cos(OMEGA * h);
    gamma += y[h] * Math.sin(OMEGA * h);
  }
  beta = (2 / HOURS) * beta;
  gamma = (2 / HOURS) * gamma;

  const amplitude = Math.hypot(beta, gamma);

  /* atan2(γ, β) gives the phase in radians; convert to a clock hour in [0,24). */
  const acrophase = (((Math.atan2(gamma, beta) / OMEGA) % HOURS) + HOURS) % HOURS;

  const fitted = profile.map((_, h) => mesor + amplitude * Math.cos(OMEGA * (h - acrophase)));

  const totalSumSquares = y.reduce((sum, v) => sum + (v - mesor) ** 2, 0);
  const residualSumSquares = y.reduce((sum, v, h) => sum + (v - fitted[h]) ** 2, 0);
  const rSquared = totalSumSquares === 0 ? 0 : 1 - residualSumSquares / totalSumSquares;

  return {
    valid: true,
    metric,
    profile,
    fitted,
    mesor,
    amplitude,
    acrophase,
    /* Amplitude relative to the mean — how pronounced the rhythm is, free of
       units, so a light week and a heavy week are comparable. */
    relativeAmplitude: mesor === 0 ? 0 : amplitude / mesor,
    rSquared,
    sessionCount: sessions.length,
    distinctHours
  };
};

/* --------------------------------------------------------------------------
   PEAK WINDOW — the contiguous block of hours holding the most study time.
   Reported alongside the acrophase because a fitted peak of 14.7 is harder to
   act on than "13:00–16:00".
   -------------------------------------------------------------------------- */
export const peakWindow = (profile, width = 3) => {
  let bestStart = 0;
  let bestTotal = -1;

  for (let start = 0; start < HOURS; start += 1) {
    let total = 0;
    for (let k = 0; k < width; k += 1) total += profile[(start + k) % HOURS].minutes;
    if (total > bestTotal) {
      bestTotal = total;
      bestStart = start;
    }
  }

  return {
    start: bestStart,
    end: (bestStart + width) % HOURS,
    minutes: bestTotal,
    width
  };
};

/* --------------------------------------------------------------------------
   CHRONOTYPE — the acrophase mapped onto the ordinary vocabulary.
   Bands follow the usual morning/intermediate/evening split used in
   chronotype questionnaires; they are descriptive, not diagnostic.
   -------------------------------------------------------------------------- */
export const CHRONOTYPES = [
  {
    id: 'morning',
    label: 'Kiểu buổi sáng',
    description: 'Đỉnh tập trung rơi vào trước trưa — ưu tiên môn khó vào buổi sáng.',
    icon: '🌅'
  },
  {
    id: 'intermediate',
    label: 'Kiểu trung gian',
    description: 'Đỉnh tập trung rơi vào đầu giờ chiều — khá cân bằng trong ngày.',
    icon: '🌤️'
  },
  {
    id: 'evening',
    label: 'Kiểu buổi tối',
    description: 'Đỉnh tập trung rơi vào tối — giữ buổi sáng cho việc ôn tập nhẹ.',
    icon: '🌙'
  }
];

export const chronotypeOf = (acrophase) => {
  if (acrophase >= 4 && acrophase < 12) return CHRONOTYPES[0];
  if (acrophase >= 12 && acrophase < 18) return CHRONOTYPES[1];
  return CHRONOTYPES[2];
};

/* Format a fractional clock hour as HH:MM. */
export const formatHour = (hour) => {
  const normalised = ((hour % HOURS) + HOURS) % HOURS;
  const h = Math.floor(normalised);
  const m = Math.round((normalised - h) * 60);
  // Rounding 13.999 must not produce "13:60".
  const carry = m === 60;
  return `${String((h + (carry ? 1 : 0)) % HOURS).padStart(2, '0')}:${String(
    carry ? 0 : m
  ).padStart(2, '0')}`;
};
