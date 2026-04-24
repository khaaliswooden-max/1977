import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE ?? '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // AR2: Vite multi-page entry — game at /, companion at
      // /behind-the-scenes/.
      input: {
        game: resolve(root, 'index.html'),
        companion: resolve(root, 'behind-the-scenes/index.html'),
      },
    },
  },
  server: {
    headers: {
      // CC7 + D4: enable SharedArrayBuffer for AudioWorklet hot-tuning
      // in story 3.6. Set in dev so the development environment
      // matches production.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
