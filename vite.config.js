import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves the site from https://<user>.github.io/<repo>/, so the
 * production build needs that sub-path as its base. Dev stays on "/".
 * Override with BASE_PATH when deploying elsewhere (Netlify, Vercel, ...).
 */
const BASE_PATH = process.env.BASE_PATH ?? '/Blooom-Project/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE_PATH : '/',
  plugins: [react()],
  server: {
    // Honour PORT when provided, otherwise fall back to the usual 3000.
    port: Number(process.env.PORT) || 3000,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Keep vendor libraries in their own chunks so editing app code doesn't
    // invalidate the browser cache for all of React on every deploy.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  }
}));
