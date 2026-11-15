/* ==========================================================================
   BLOOOM — THIS DEVICE'S PREFERENCES

   Everything a student creates lives in the database. What stays here is only
   what belongs to the device rather than to the person: whether the chime is
   on, and the timer lengths last used on this screen.
   ========================================================================== */

const PREFS_KEY = 'blooom_prefs';

const DEFAULT_PREFS = {
  sound: true,
  workMinutes: 25,
  breakMinutes: 5,
  subject: 'Toán'
};

/* localStorage throws in private mode and when it is full. A failed read must
   fall back to the defaults, never break a render. */
export const getPrefs = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

export const setPrefs = (patch) => {
  const next = { ...getPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* Not saved: the setting simply lasts for this visit. */
  }
  return next;
};

/* --------------------------------------------------------------------------
   A running timer survives a refresh but not a closed tab — which is exactly
   what sessionStorage is. Closing the tab is the student walking away.
   -------------------------------------------------------------------------- */
const TIMER_KEY = 'blooom_timer';

export const readTimerSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeTimerSnapshot = (snapshot) => {
  try {
    if (snapshot) sessionStorage.setItem(TIMER_KEY, JSON.stringify(snapshot));
    else sessionStorage.removeItem(TIMER_KEY);
  } catch {
    /* Losing the snapshot only costs the refresh-resume convenience. */
  }
};

/* --------------------------------------------------------------------------
   Earlier versions of Blooom kept all study data — including a generated set
   of sample groups, articles and sessions — in localStorage. That data would
   otherwise sit in the browser of anyone who opened an old build, so it is
   cleared once at start-up.
   -------------------------------------------------------------------------- */
const LEGACY_KEYS = [
  'studyhub_user_profile',
  'studyhub_study_groups',
  'studyhub_timer_sessions',
  'studyhub_performance_goals',
  'studyhub_notes',
  'studyhub_editor_picks',
  'studyhub_bookmarks',
  'studyhub_seen_badges',
  'studyhub_ui_prefs',
  'studyhub_theme',
  'blooom_ui_prefs',
  'blooom_flashcards',
  'blooom_experiments',
  'blooom_accounts',
  'blooom_session'
];

export const purgeLegacyLocalData = () => {
  try {
    const doomed = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      /* Old builds also namespaced keys as "blooom:<accountId>:<key>". */
      const namespaced =
        key.startsWith('blooom:') && LEGACY_KEYS.some((legacy) => key.endsWith(legacy));

      if (LEGACY_KEYS.includes(key) || namespaced) doomed.push(key);
    }

    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* No access to localStorage means there is nothing to clear either. */
  }
};
