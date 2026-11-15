/* ==========================================================================
   DOODLES — the hand-drawn marks that tie the interface to the Blooom
   wordmark (a crayon scribble with an arrow under it). Used sparingly: a
   stroke under one word, an arrow pointing at one thing.

   Each is decorative and hidden from screen readers.
   ========================================================================== */

/* One hidden <svg> that defines the crayon wobble every doodle shares. */
export const DoodleDefs = () => (
  <svg
    width="0"
    height="0"
    style={{ position: 'absolute' }}
    aria-hidden="true"
    focusable="false"
  >
    <filter id="crayon" x="-5%" y="-30%" width="110%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
      <feDisplacementMap in="SourceGraphic" scale="2.4" />
    </filter>
  </svg>
);

const base = {
  className: 'doodle',
  'aria-hidden': true,
  focusable: false,
  filter: 'url(#crayon)'
};

export const Squiggle = ({ className = '', ...rest }) => (
  <svg
    {...base}
    className={`doodle ${className}`}
    viewBox="0 0 200 16"
    preserveAspectRatio="none"
    {...rest}
  >
    <path d="M3 10 C 28 3, 46 14, 72 8 S 118 3, 142 9 S 180 13, 197 6" />
  </svg>
);

export const Arrow = ({ className = '', ...rest }) => (
  <svg {...base} className={`doodle ${className}`} viewBox="0 0 120 70" {...rest}>
    <path d="M6 10 C 44 2, 86 16, 104 54" />
    <path d="M104 54 L 87 47" />
    <path d="M104 54 L 109 36" />
  </svg>
);

export const Spark = ({ className = '', ...rest }) => (
  <svg {...base} className={`doodle ${className}`} viewBox="0 0 60 60" {...rest}>
    <path d="M30 6 L 30 20" />
    <path d="M50 14 L 41 25" />
    <path d="M56 36 L 43 35" />
  </svg>
);

/* The looping "ooo" of the wordmark. */
export const Loops = ({ className = '', ...rest }) => (
  <svg {...base} className={`doodle ${className}`} viewBox="0 0 170 50" {...rest}>
    <path d="M10 26 C 10 6, 44 6, 58 26 S 106 46, 112 26 S 78 6, 62 26 S 30 46, 10 26 Z" />
    <path d="M112 26 C 118 6, 160 8, 160 26 S 124 46, 112 26" />
  </svg>
);
