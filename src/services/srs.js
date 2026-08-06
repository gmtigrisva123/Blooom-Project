/* ==========================================================================
   BLOOOM — SPACED REPETITION ENGINE (SM-2)

   Implements the SuperMemo-2 scheduling algorithm (Wozniak & Gorzelanczyk,
   1994) on top of the exponential forgetting model Ebbinghaus described in
   1885. Two ideas, kept deliberately separate:

     · SM-2 decides WHEN a card comes back. It adapts one number per card —
       the ease factor — from how hard the student found the last recall.
     · The forgetting curve estimates HOW LIKELY the student is to still know
       a card right now. It is a prediction, never stored, always recomputed.

   The two meet at one assumption: a card is scheduled so that it falls due at
   roughly TARGET_RETENTION. That fixes the memory-stability constant, which
   is what makes the curve on screen an actual model rather than decoration.
   ========================================================================== */

/* The retention SM-2 implicitly aims for at the moment a card falls due. */
export const TARGET_RETENTION = 0.9;

/* SM-2 floors the ease factor here; below it, intervals stop growing. */
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/* A card that has never been reviewed is treated as having about half a day
   of stability — enough that "learned an hour ago" doesn't read as forgotten. */
const NEW_CARD_STABILITY_DAYS = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

/* --------------------------------------------------------------------------
   GRADES — SM-2 takes a 0–5 quality score. Six buttons is too many decisions
   for a student mid-review, so the interface exposes four and maps them onto
   the scale the algorithm expects.
   -------------------------------------------------------------------------- */
export const REVIEW_GRADES = [
  {
    id: 'again',
    quality: 1,
    label: 'Quên rồi',
    hint: 'Không nhớ được — học lại từ đầu',
    color: '#fb7185'
  },
  {
    id: 'hard',
    quality: 3,
    label: 'Khó',
    hint: 'Nhớ ra nhưng phải nghĩ lâu',
    color: '#f0a85c'
  },
  {
    id: 'good',
    quality: 4,
    label: 'Nhớ được',
    hint: 'Nhớ ra sau một chút do dự',
    color: '#2dd4bf'
  },
  {
    id: 'easy',
    quality: 5,
    label: 'Quá dễ',
    hint: 'Bật ra ngay lập tức',
    color: '#818cf8'
  }
];

/* --------------------------------------------------------------------------
   CARD CREATION
   -------------------------------------------------------------------------- */
export const createCard = ({ front, back, subject = 'Khác', noteId = null }) => ({
  id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  front,
  back,
  subject,
  noteId,
  easeFactor: DEFAULT_EASE_FACTOR,
  interval: 0,
  repetitions: 0,
  lapses: 0,
  reviewCount: 0,
  createdAt: new Date().toISOString(),
  lastReviewedAt: null,
  /* Brand-new cards are due immediately — the first review is what starts
     the schedule, so there is nothing to wait for. */
  dueAt: new Date().toISOString()
});

/* --------------------------------------------------------------------------
   THE SM-2 STEP
   Returns a NEW card object; the caller decides whether to persist it.
   -------------------------------------------------------------------------- */
export const applyReview = (card, quality, now = new Date()) => {
  const q = Math.max(0, Math.min(5, quality));

  /* Ease factor update, verbatim from SM-2. A grade of 5 nudges it up by
     0.1; a grade of 3 pulls it down by 0.14; anything lower, further still. */
  const nextEase = Math.max(
    MIN_EASE_FACTOR,
    card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  let repetitions;
  let interval;

  if (q < 3) {
    /* A failed recall resets the repetition chain. The ease factor is kept —
       SM-2 deliberately does not punish the card twice for one lapse. */
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(card.interval * nextEase);
  }

  interval = Math.max(1, interval);

  return {
    ...card,
    easeFactor: nextEase,
    interval,
    repetitions,
    lapses: q < 3 ? card.lapses + 1 : card.lapses,
    reviewCount: card.reviewCount + 1,
    lastReviewedAt: now.toISOString(),
    dueAt: new Date(now.getTime() + interval * DAY_MS).toISOString()
  };
};

/* --------------------------------------------------------------------------
   THE FORGETTING CURVE
   R(t) = e^(−t / S), with S pinned by the scheduling assumption:
   at t = interval the model must read TARGET_RETENTION, so

       S = interval / −ln(TARGET_RETENTION)

   which for a 10-day interval gives S ≈ 94.9 days.
   -------------------------------------------------------------------------- */
export const stabilityOf = (card) =>
  card.interval > 0 ? card.interval / -Math.log(TARGET_RETENTION) : NEW_CARD_STABILITY_DAYS;

export const daysSinceReview = (card, now = new Date()) => {
  const anchor = card.lastReviewedAt || card.createdAt;
  if (!anchor) return 0;
  return Math.max(0, (now.getTime() - new Date(anchor).getTime()) / DAY_MS);
};

/* Predicted probability the student can still recall this card right now. */
export const retentionOf = (card, now = new Date()) => {
  if (!card.lastReviewedAt) return 0;
  return Math.exp(-daysSinceReview(card, now) / stabilityOf(card));
};

/* The curve for one card, sampled for plotting. */
export const retentionCurve = (card, days = 30, samples = 60) =>
  Array.from({ length: samples + 1 }, (_, i) => {
    const t = (i / samples) * days;
    return { day: t, retention: Math.exp(-t / stabilityOf(card)) };
  });

/* Mean predicted retention across the whole deck — the single number the
   Recall page leads with. Cards never reviewed are excluded rather than
   counted as 0, which would make an untouched deck look catastrophic. */
export const deckRetention = (cards, now = new Date()) => {
  const reviewed = cards.filter((c) => c.lastReviewedAt);
  if (reviewed.length === 0) return null;
  return reviewed.reduce((sum, c) => sum + retentionOf(c, now), 0) / reviewed.length;
};

/* --------------------------------------------------------------------------
   QUEUES & FORECAST
   -------------------------------------------------------------------------- */
export const isDue = (card, now = new Date()) => new Date(card.dueAt) <= now;

/* Due cards, weakest memory first — reviewing the most-forgotten card first
   is what spaced repetition is for. */
export const dueQueue = (cards, now = new Date()) =>
  cards.filter((c) => isDue(c, now)).sort((a, b) => retentionOf(a, now) - retentionOf(b, now));

/* How many cards fall due on each of the next `days` days. */
export const dueForecast = (cards, days = 14, now = new Date()) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, i) => {
    const dayStart = new Date(startOfToday.getTime() + i * DAY_MS);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const count = cards.filter((card) => {
      const due = new Date(card.dueAt);
      // Everything already overdue is collapsed into today's column.
      return i === 0 ? due < dayEnd : due >= dayStart && due < dayEnd;
    }).length;

    return { date: dayStart, count, isToday: i === 0 };
  });
};

/* Deck-level summary for the stat row. */
export const deckStats = (cards, now = new Date()) => {
  const reviewed = cards.filter((c) => c.lastReviewedAt);
  const mature = cards.filter((c) => c.interval >= 21);

  return {
    total: cards.length,
    due: cards.filter((c) => isDue(c, now)).length,
    new: cards.filter((c) => c.reviewCount === 0).length,
    mature: mature.length,
    reviewed: reviewed.length,
    lapses: cards.reduce((sum, c) => sum + c.lapses, 0),
    averageEase:
      cards.length === 0
        ? DEFAULT_EASE_FACTOR
        : cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length,
    averageInterval:
      reviewed.length === 0
        ? 0
        : reviewed.reduce((sum, c) => sum + c.interval, 0) / reviewed.length,
    retention: deckRetention(cards, now)
  };
};
