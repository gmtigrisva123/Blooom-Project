import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves the site from https://<user>.github.io/<repo>/, so the
 * production build needs that sub-path as its base. Dev stays on "/".
 * Override with BASE_PATH when deploying elsewhere (Netlify, Vercel, ...).
 */
const BASE_PATH = process.env.BASE_PATH ?? '/Blooom-Project/';

export default defineConfig(({ command, isPreview }) => ({
  // `vite preview` runs as a "serve" command but hands back the built output,
  // whose asset URLs already carry BASE_PATH — serving it from "/" would 404
  // every chunk, so preview has to mirror the build.
  base: command === 'build' || isPreview ? BASE_PATH : '/',
  plugins: [react()],
  server: {
    // Honour PORT when provided, otherwise fall back to the usual 3000.
    port: Number(process.env.PORT) || 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep vendor libraries in their own chunks so editing app code doesn't
        // invalidate the browser cache for all of React on every deploy.
        // Rolldown (the bundler behind Vite 8) only accepts the function form,
        // so the grouping is expressed as module-id matching rather than a map.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Must come before the React test — the name contains "react".
          if (id.includes('lucide-react')) return 'icons';
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
        }
      }
    }
  }
}));
