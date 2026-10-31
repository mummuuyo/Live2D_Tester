import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(root, 'tracking-app'),
  base: './',
  resolve: {
    alias: { '@framework': path.join(root, 'tracking-app/Framework/src') }
  },
  build: {
    outDir: path.join(root, 'public/tracking'),
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false
  }
});
