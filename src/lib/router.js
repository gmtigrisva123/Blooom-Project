import { useSyncExternalStore } from 'react';

/* ==========================================================================
   ROUTER — a few dozen lines instead of a dependency.

   Every screen has a real address, so the back button works, a refresh keeps
   you where you were, and a page can be bookmarked or shared. Paths are a
   single segment under the deploy base ("/" on Vercel, "/Blooom-Project/" on
   GitHub Pages); both hosts fall back to index.html for unknown paths.
   ========================================================================== */

const BASE = import.meta.env.BASE_URL;

const toRoute = (pathname) => {
  let path = pathname;
  if (path.startsWith(BASE)) path = path.slice(BASE.length);
  else if (`${path}/` === BASE) path = '';
  return path.replace(/^\/+|\/+$/g, '');
};

const subscribe = (notify) => {
  window.addEventListener('popstate', notify);
  return () => window.removeEventListener('popstate', notify);
};

const snapshot = () => toRoute(window.location.pathname);

/* The current route, e.g. "" for the home page or "tap-trung". */
export const useRoute = () => useSyncExternalStore(subscribe, snapshot);

export const navigate = (route, { replace = false } = {}) => {
  const clean = String(route || '').replace(/^\/+/, '');
  if (snapshot() !== clean) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', BASE + clean);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  window.scrollTo({ top: 0 });
};

export const hrefFor = (route) => BASE + String(route || '').replace(/^\/+/, '');

/* A link that navigates in place but still behaves like a link: middle-click
   and Ctrl/⌘-click open a new tab, exactly as people expect. */
export const onLinkClick = (route) => (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(route);
};
