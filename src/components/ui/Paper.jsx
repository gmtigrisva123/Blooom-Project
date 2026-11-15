import { tornEdge } from '../../lib/paper';

/* ==========================================================================
   SHEET · a cut piece of paper with one torn edge.

   Two layers share one tear: the face, and a pale "fibre" twin a pixel and a
   half lower, which is the core of the paper showing where it tore. The drop
   shadow sits on the wrapper because a clipped element cannot cast one.
   ========================================================================== */
export const Sheet = ({
  seed = 1,
  edge = 'bottom',
  depth = 8,
  color,
  className = '',
  children
}) => {
  const clipPath = tornEdge(seed, { edge, depth });

  return (
    <div className={`sheet ${className}`} style={{ '--sheet-color': color }}>
      <i className="sheet-fringe" style={{ clipPath }} aria-hidden="true" />
      <i className="sheet-face" style={{ clipPath }} aria-hidden="true" />
      <div className="sheet-body">{children}</div>
    </div>
  );
};

const BLOOMS = ['var(--color-accent-3)', 'var(--color-accent-2)', 'var(--color-accent-deep)'];

/* ==========================================================================
   GARDEN · growth set in type.

   One plot per day. A day with study time grows a stem, and the letter "o"
   from the wordmark sits on top as its flower; a full hour blooms into an
   asterisk. The heights are the real minutes, so this is a chart, not an
   ornament.
   ========================================================================== */
export const Garden = ({ days, height = 56, label }) => {
  const tallest = Math.max(60, ...days.map((day) => day.minutes));

  return (
    <div
      className="garden"
      style={{ '--garden-height': `${height}px` }}
      role="img"
      aria-label={label}
    >
      {days.map((day, index) => {
        const grow = day.minutes > 0 ? Math.max(0.3, day.minutes / tallest) : 0;
        return (
          <span
            key={day.key}
            className={`plot ${day.isToday ? 'is-today' : ''}`}
            aria-hidden="true"
          >
            <span
              className={`plant ${day.minutes > 0 ? '' : 'is-bare'}`}
              style={{ '--grow': grow, '--bloom': BLOOMS[index % BLOOMS.length] }}
            >
              <span className="plant-head">{day.minutes >= 60 ? '*' : 'o'}</span>
              <span className="plant-stem" />
            </span>
            {day.label}
          </span>
        );
      })}
    </div>
  );
};
