import { useCallback, useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { TimerProvider } from './context/TimerContext';
import { ToastProvider } from './context/ToastContext';
import { authService } from './services/auth';
import { isSupabaseConfigured } from './services/supabase';
import { purgeLegacyLocalData, writeTimerSnapshot } from './services/storage';
import { useTheme } from './lib/theme';
import { navigate, useRoute } from './lib/router';
import { peekIntent } from './lib/intent';
import { HOME_ROUTE, pageByRoute } from './lib/nav';

import { Landing } from './components/landing/Landing';
import { AuthPage } from './components/auth/AuthPage';
import { SetupScreen } from './components/setup/SetupScreen';
import { AppShell } from './components/shell/AppShell';

const AUTH_ROUTES = { 'dang-nhap': 'login', 'dang-ky': 'signup' };

/* ==========================================================================
   ROOT — decides which of four things to show: the setup notice, the landing
   page, the sign-in page, or the app itself.
   ========================================================================== */
export function App() {
  const { theme, toggleTheme } = useTheme();
  const route = useRoute();

  const [account, setAccount] = useState(null);
  /* Until the saved session has been checked, nothing is rendered at all, so
     the splash in index.html stays up instead of flashing the landing page at
     someone who is already signed in. */
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    purgeLegacyLocalData();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;

    authService
      .currentAccount()
      .then((restored) => {
        if (!cancelled) setAccount(restored);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* A sign-out in another tab, an expired session, or a confirmation link
     that just signed the visitor in must all show up here. */
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    return authService.onAuthStateChange(setAccount);
  }, []);

  const isAppRoute = Boolean(pageByRoute(route));
  const authMode = AUTH_ROUTES[route] || null;

  /* Keep the address honest: signed-in people belong in the app, signed-out
     people cannot be on an app page, and an unknown address goes home. */
  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return;

    if (account && !isAppRoute) {
      /* "Bắt đầu học" on the landing page lands on the timer, not the home page. */
      navigate(peekIntent('start-focus') ? 'tap-trung' : HOME_ROUTE, { replace: true });
    } else if (!account && isAppRoute) navigate('dang-nhap', { replace: true });
    else if (!account && route !== '' && !authMode) navigate('', { replace: true });
  }, [ready, account, route, isAppRoute, authMode]);

  const handleSignOut = useCallback(async () => {
    await authService.logout();
    /* A running timer belongs to the person who started it. */
    writeTimerSnapshot(null);
    setAccount(null);
    navigate('');
  }, []);

  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  if (!ready) return null;

  let screen = null;

  if (account && isAppRoute) {
    screen = (
      /* Keyed on the account so switching accounts reloads everything. */
      <AppProvider key={account.id} account={account} onSignOut={handleSignOut}>
        <TimerProvider>
          <AppShell route={route} theme={theme} onToggleTheme={toggleTheme} />
        </TimerProvider>
      </AppProvider>
    );
  } else if (!account && authMode) {
    screen = (
      <AuthPage
        mode={authMode}
        onAuthenticated={setAccount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  } else if (!account && route === '') {
    screen = <Landing onAuthenticated={setAccount} theme={theme} onToggleTheme={toggleTheme} />;
  }

  /* `screen` is null only for the instant before a redirect lands. */
  if (!screen) return null;

  return <ToastProvider>{screen}</ToastProvider>;
}

export default App;
