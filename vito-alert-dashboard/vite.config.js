import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: el panel se sirve desde subruta de GitHub Pages
// (vito-org.github.io/Vito-App-Android/).
export default defineConfig({
  plugins: [react()],
  base: './',
});
