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
      '/api': {
        target: 'https://puresuit.net',
        changeOrigin: true,
      },
    },
  },
});
