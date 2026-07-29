import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './index.css';

// Both scripts are served by Vercel's edge network, so on any other host
// (GitHub Pages, `vite preview`) they 404 and log an error in the console.
// vercel.json sets this flag at build time; everywhere else it stays undefined
// and the components are dropped from the bundle as dead code.
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
