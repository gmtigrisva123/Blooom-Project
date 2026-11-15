import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/* The typeface ships with the app instead of coming from a font CDN: one
   less third-party request, and the page looks the same offline. It is split
   by script, so a browser only downloads the Vietnamese and Latin ranges it
   actually renders. */
import '@fontsource-variable/quicksand/wght.css';

import App from './App';
import './index.css';

/* Both scripts are served by Vercel's edge network, so on any other host they
   would 404. vercel.json sets this flag at build time; everywhere else the
   components are dropped from the bundle as dead code. */
const onVercel = import.meta.env.VITE_ON_VERCEL === '1';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {onVercel && (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    )}
  </React.StrictMode>
);
