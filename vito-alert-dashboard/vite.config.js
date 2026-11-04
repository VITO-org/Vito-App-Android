import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Se sirve desde la raíz del sitio de Firebase Hosting.
export default defineConfig({
  plugins: [react()],
  base: '/',
});
