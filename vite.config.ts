import { defineConfig } from 'vite';

// SINTESI is a single-canvas generative engine: no framework, no plugins.
// `archive/` is exposed read-only to the engine through import.meta.glob.
export default defineConfig({
  base: './',
  server: { port: 5173, host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  assetsInclude: ['**/*.glsl'],
});
