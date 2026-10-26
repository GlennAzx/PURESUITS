import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    // The write API lives in worker/index.js and only runs on Cloudflare.
    // Without this proxy, /api/* on localhost returns index.html and the admin
    // page looks broken during development. Point it at the deployed Worker.
    proxy: {
      // /media is the Worker's read-only bucket route, used in development
      // because a local run has no media.puresuit.net custom domain.
      '/api': {
        // Override to run against a local Worker during testing:
        //   HERMES_API_TARGET=http://localhost:8787 npm run dev
        target: process.env.HERMES_API_TARGET || 'https://puresuit.net',
        changeOrigin: true,
      },
      '/media': {
        target: process.env.HERMES_API_TARGET || 'https://puresuit.net',
        changeOrigin: true,
      },
    },
  },
});
