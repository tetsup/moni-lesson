import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://tetsup.github.io/moni-lesson/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/moni-lesson/',
  plugins: [react()],
});