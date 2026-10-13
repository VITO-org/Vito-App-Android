import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: se sirve desde subruta de GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: './',
});
