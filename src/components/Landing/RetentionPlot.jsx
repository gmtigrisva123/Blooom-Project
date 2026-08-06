import { useMemo } from 'react';
import { applyReview, createCard, stabilityOf, TARGET_RETENTION } from '../../services/srs';

/* ==========================================================================
   RETENTION PLOT
   The landing page's one piece of imagery, and it is not decoration: both
   curves are produced by running the app's real SM-2 implementation and the
   real forgetting model over a simulated 30 days.

   · The flat-falling curve is one study session and no review afterwards.
   · The sawtooth is the same card put through SM-2, graded "nhớ được" each
     time it falls due. Every rise is an actual scheduled review.

   It is a simulation of the model, not a measurement of students, and the
   caption on the page says exactly that.
   ========================================================================== */

const DAYS = 30;
const STEP = 0.2;
const GRADE_GOOD = 4;

const W = 620;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 30, left: 38 };

const plotX = (day) => PAD.left + (day / DAYS) * (W - PAD.left - PAD.right);
const plotY = (retention) => PAD.top + (1 - retention) * (H - PAD.top - PAD.bottom);

const decay = (elapsedDays, stability) => Math.exp(-elapsedDays / stability);

/* Walk the clock forward, reviewing the card whenever it comes due. */
const simulateScheduled = () => {
  const points = [];
  const reviews = [];

  let card = applyReview(createCard({ front: '', back: '' }), GRADE_GOOD, new Date(0));
  let lastReviewDay = 0;
  let nextDueDay = card.interval;
  reviews.push(0);

  for (let day = 0; day <= DAYS + 1e-9; day += STEP) {
    if (day >= nextDueDay) {
      // The card fell due: grade it, which extends the interval.
      card = applyReview(card, GRADE_GOOD, new Date(0));
      lastReviewDay = nextDueDay;
      nextDueDay = lastReviewDay + card.interval;
      reviews.push(lastReviewDay);
      points.push({ day: lastReviewDay, retention: TARGET_RETENTION });
      points.push({ day: lastReviewDay, retention: 1 });
    }
    points.push({ day, retention: decay(day - lastReviewDay, stabilityOf(card)) });
  }

  return { points, reviews };
};

/* One study session, never revisited. */
const simulateSingleExposure = () => {
  const card = applyReview(createCard({ front: '', back: '' }), GRADE_GOOD, new Date(0));
  const stability = stabilityOf(card);

  return Array.from({ length: Math.round(DAYS / STEP) + 1 }, (_, i) => {
    const day = i * STEP;
    return { day, retention: decay(day, stability) };
  });
};

const toPath = (points) =>
  points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${plotX(p.day).toFixed(1)} ${plotY(p.retention).toFixed(1)}`
    )
    .join(' ');

export const RetentionPlot = () => {
  const { scheduledPath, singlePath, reviews, finalScheduled, finalSingle } = useMemo(() => {
    const scheduled = simulateScheduled();
    const single = simulateSingleExposure();

    return {
      scheduledPath: toPath(scheduled.points),
      singlePath: toPath(single),
      reviews: scheduled.reviews,
      finalScheduled: scheduled.points[scheduled.points.length - 1].retention,
      finalSingle: single[single.length - 1].retention
    };
  }, []);

  const gridlines = [0, 0.25, 0.5, 0.75, 1];
  const dayTicks = [0, 10, 20, 30];

  return (
    <figure className="plot-figure">
      <div className="plot-frame">
        <div className="plot-head">
          <span className="plot-title">Xác suất nhớ lại theo thời gian</span>
          <span className="plot-eq mono">R(t) = e^(−t/S)</span>
        </div>

        <svg
          className="plot-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Mô phỏng đường cong quên trong ${DAYS} ngày. Nếu chỉ học một lần, xác suất nhớ lại còn khoảng ${Math.round(
            finalSingle * 100
          )} phần trăm. Nếu ôn theo lịch SM-2 với ${reviews.length} lần ôn, xác suất nhớ lại giữ ở khoảng ${Math.round(
            finalScheduled * 100
          )} phần trăm.`}
        >
          {gridlines.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={plotY(value)}
                y2={plotY(value)}
                className="plot-grid"
              />
              <text
                x={PAD.left - 8}
                y={plotY(value) + 3.5}
                className="plot-axis-label"
                textAnchor="end"
              >
                {Math.round(value * 100)}
              </text>
            </g>
          ))}

          {dayTicks.map((day) => (
            <text
              key={day}
              x={plotX(day)}
              y={H - PAD.bottom + 18}
              className="plot-axis-label"
              textAnchor="middle"
            >
              {day === 0 ? 'ngày 0' : `${day}`}
            </text>
          ))}

          {/* The retention SM-2 schedules against — every review lands here. */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={plotY(TARGET_RETENTION)}
            y2={plotY(TARGET_RETENTION)}
            className="plot-target"
          />

          <path d={singlePath} className="plot-line plot-line-control" />
          <path d={scheduledPath} className="plot-line plot-line-scheduled" />

          {reviews.map((day) => (
            <circle key={day} cx={plotX(day)} cy={plotY(1)} r="3" className="plot-review-dot" />
          ))}
        </svg>

        <div className="plot-legend">
          <span className="plot-key">
            <i className="plot-swatch plot-swatch-scheduled" aria-hidden="true" />
            Ôn theo lịch SM-2 — {reviews.length} lần ôn, còn nhớ ~
            <b className="mono">{Math.round(finalScheduled * 100)}%</b>
          </span>
          <span className="plot-key">
            <i className="plot-swatch plot-swatch-control" aria-hidden="true" />
            Chỉ học một lần — còn nhớ ~<b className="mono">{Math.round(finalSingle * 100)}%</b>
          </span>
        </div>
      </div>

      <figcaption className="plot-caption">
        Đồ thị được vẽ bằng chính thuật toán SM-2 và mô hình quên đang chạy trong Blooom, mô
        phỏng trên một thẻ trong {DAYS} ngày. Đây là mô phỏng của mô hình, không phải số liệu đo
        trên người học.
      </figcaption>
    </figure>
  );
};
