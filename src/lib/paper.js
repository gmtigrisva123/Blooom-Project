/* ==========================================================================
   PAPER · torn edges.

   A sheet of cut paper ends in an edge torn by hand, never a clean vector
   line. The edge is a clip-path polygon drawn from seeded noise, so the same
   seed always tears the same way (no layout shift, no hydration surprise)
   and two sheets with different seeds never match.
   ========================================================================== */

const seeded = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

/* Returns a CSS polygon() whose `edge` side is torn up to `depth` px deep. */
export const tornEdge = (seed, { edge = 'bottom', steps = 40, depth = 8 } = {}) => {
  const random = seeded(seed);
  let level = random();

  /* Each point leans on the one before it, so the tear wanders instead of
     jittering like a saw. */
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    level = level * 0.5 + random() * 0.5;
    return [((i / steps) * 100).toFixed(2), (level * depth).toFixed(1)];
  });

  if (edge === 'top') {
    const torn = points.map(([x, d]) => `${x}% ${d}px`).join(', ');
    return `polygon(${torn}, 100% 100%, 0 100%)`;
  }

  const torn = points
    .reverse()
    .map(([x, d]) => `${x}% calc(100% - ${d}px)`)
    .join(', ');
  return `polygon(0 0, 100% 0, ${torn})`;
};

/* Reads a colour token as #rrggbb, for the one place a canvas needs it. */
export const tokenHex = (name) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};
