
import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos também funcionam quando o site é publicado
  // em um subcaminho do GitHub Pages.
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  }
});