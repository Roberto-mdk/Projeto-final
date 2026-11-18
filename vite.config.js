import { defineConfig } from 'vite';

export default defineConfig({
  // Permite publicar o projeto em um subdiretório do GitHub Pages.
  base: './',

  publicDir: 'public',

  server: {
    host: '0.0.0.0',
    port: 5173
  },

  preview: {
    host: '0.0.0.0',
    port: 4173
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});