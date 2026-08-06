import { useEffect, useState } from 'react';

/* ==========================================================================
   useNow
   A clock the render can read. Reading `new Date()` directly while rendering
   makes a component impure — two renders of the same state would draw two
   different pictures. Holding the instant in state instead means the marker
   on a forgetting curve only moves when the clock actually ticks, and the
   component stays reproducible between those ticks.

   The default cadence is a minute: retention over a multi-day curve does not
   change visibly faster than that.
   ========================================================================== */
export const useNow = (intervalMs = 60000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};
