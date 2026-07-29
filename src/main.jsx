import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';

// The analytics script is served by Vercel's edge network, so on any other host
// (GitHub Pages, `vite preview`) it 404s and logs an error in the console.
// vercel.json sets this flag at build time; everywhere else it stays undefined
// and the component is dropped from the bundle as dead code.
const onVercel = import.meta.env.VITE_VERCEL_ANALYTICS === '1';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {onVercel && <Analytics />}
  </React.StrictMode>
);
