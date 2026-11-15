import { applyReview, createCard, stabilityOf } from '../../services/srs';

/* ==========================================================================
   MEMORY CHART · two lines over one month: a lesson never revisited, and the
   same lesson reviewed whenever Blooom would schedule it.

   Both lines are produced by the scheduling code the app itself runs, so the
   picture shows what the product does rather than what a designer drew.
   ========================================================================== */

const DAYS = 30;
const W = 640;
const H = 380;
const PAD = { top: 28, right: 24, bottom: 46, left: 52 };

const x = (day) => PAD.left + (day / DAYS) * (W - PAD.left - PAD.right);
const y = (level) => PAD.top + (1 - level) * (H - PAD.top - PAD.bottom);

const build = () => {
  /* Learned today, graded "remembered" every time it comes back. */
  let card = applyReview(createCard({ front: '-', back: '-' }), 4, new Date(0));
  const forgottenStability = stabilityOf(card);

  const forgotten = [];
  for (let day = 0; day <= DAYS; day += 0.5) {
    forgotten.push([day, Math.exp(-day / forgottenStability)]);
  }

  const reviewed = [];
  const reviews = [];
  let from = 0;

  while (from < DAYS) {
    const stability = stabilityOf(card);
    const until = Math.min(DAYS, from + card.interval);

    for (let day = from; day <= until; day += 0.25) {
      reviewed.push([day, Math.exp(-(day - from) / stability)]);
    }

    if (until < DAYS) {
      reviews.push(until);
      /* The review itself: memory is back to full, and lasts longer. */
      reviewed.push([until, 1]);
      card = applyReview(card, 4, new Date(until * 86400000));
    }
    from = until;
  }

  return { forgotten, reviewed, reviews };
};

const toPath = (points) =>
  points
    .map(
      ([day, level], i) => `${i === 0 ? 'M' : 'L'}${x(day).toFixed(1)} ${y(level).toFixed(1)}`
    )
    .join(' ');

const { forgotten, reviewed, reviews } = build();
const forgottenPath = toPath(forgotten);
const reviewedPath = toPath(reviewed);
const forgottenEnd = Math.round(forgotten[forgotten.length - 1][1] * 100);

const TICKS = [
  [0, 'Hôm nay'],
  [7, '1 tuần'],
  [14, '2 tuần'],
  [21, '3 tuần'],
  [30, '1 tháng']
];

export const MemoryChart = () => (
  <figure className="chart memory-chart">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Biểu đồ mức nhớ trong một tháng. Không ôn lại: chỉ còn khoảng ${forgottenEnd}% sau một tháng. Ôn cùng Blooom ${reviews.length} lần: luôn giữ trên 90%.`}
    >
      <defs>
        <clipPath id="memoryReveal">
          <rect className="mc-reveal" x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>

      {[0, 0.5, 1].map((level) => (
        <g key={level}>
          <line
            className="mc-grid"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(level)}
            y2={y(level)}
          />
          <text className="mc-axis" x={PAD.left - 12} y={y(level) + 5} textAnchor="end">
            {level * 100}%
          </text>
        </g>
      ))}

      {TICKS.map(([day, label]) => (
        <text
          key={day}
          className="mc-axis"
          x={x(day)}
          y={H - 14}
          textAnchor={day === 0 ? 'start' : day === DAYS ? 'end' : 'middle'}
        >
          {label}
        </text>
      ))}

      <g clipPath="url(#memoryReveal)">
        <path className="mc-line mc-forgotten" d={forgottenPath} />
        <path className="mc-line mc-reviewed" d={reviewedPath} />
        {reviews.map((day) => (
          <circle key={day} className="mc-dot" cx={x(day)} cy={y(1)} r="7" />
        ))}
      </g>

      <text className="mc-label mc-label-reviewed" x={x(30)} y={y(1) - 14} textAnchor="end">
        Ôn cùng Blooom
      </text>
      <text className="mc-label" x={x(30)} y={y(forgottenEnd / 100) - 14} textAnchor="end">
        Không ôn lại
      </text>
    </svg>
  </figure>
);
