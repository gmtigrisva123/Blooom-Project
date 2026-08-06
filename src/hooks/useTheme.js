import { useCallback, useEffect, useState } from 'react';

/* ==========================================================================
   THEME
   Owned above the app shell, because the landing page and the sign-in screens
   render outside AppProvider and must share the same switch. The storage key
   is the one index.html replays before first paint, so the choice survives a
   reload without a flash of the wrong background.
   ========================================================================== */

const THEME_KEY = 'studyhub_theme';

const readStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

export const useTheme = () => {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* Private mode blocks writes; the in-memory choice still applies. */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
};
