import { useCallback, useEffect, useState } from 'react';

/* ==========================================================================
   THEME — light or dark. First visit follows the device; after that, the
   choice is remembered on this device. index.html replays the same decision
   before first paint so the page never flashes the wrong background.
   ========================================================================== */

const KEY = 'blooom_theme';

const initial = () => {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* Private mode: fall through to the device preference. */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useTheme = () => {
  const [theme, setTheme] = useState(initial);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* The choice still applies for this visit. */
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
};
