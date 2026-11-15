import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, Vite serves the UI on :5173 and forwards /api/* to the Express
// server on :8787, so the browser only ever talks to one origin and the
// API key never leaves the server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
