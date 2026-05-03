// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'renderer-dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
