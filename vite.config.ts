/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`        → struktur folder profesional (siap hosting / Vercel):
//    index.html
//    assets/css/      gaya tampilan
//    assets/js/       app.js · story-engine.js (panggung cerita 2.5D) · animation.js (gsap) · sound.js (narator, musik, efek)
//    assets/sound/    rekaman narator per cerita (assets/sound/narasi/<cerita>/*.mp3, dari public/)
//    assets/images/   gambar
//    assets/fonts/    huruf
// `npm run build:single` → satu file HTML mandiri (khusus pratinjau artefak)
const ASSET_DIR: Record<string, string> = {
  css: 'css', woff: 'fonts', woff2: 'fonts', ttf: 'fonts',
  jpg: 'images', jpeg: 'images', png: 'images', webp: 'images', svg: 'images', gif: 'images',
  mp3: 'sound', ogg: 'sound', wav: 'sound', m4a: 'sound',
};

export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: mode === 'single'
    ? { outDir: 'dist-single', target: 'es2020' }
    : {
        outDir: 'dist', target: 'es2020', assetsInlineLimit: 0, emptyOutDir: true,
        rollupOptions: {
          output: {
            entryFileNames: 'assets/js/app-[hash].js',
            chunkFileNames: (chunk) => chunk.name === 'player'
              ? 'assets/js/story-engine-[hash].js'
              : 'assets/js/[name]-[hash].js',
            assetFileNames: (info) => {
              const ext = (info.names?.[0] ?? info.name ?? '').split('.').pop()?.toLowerCase() ?? '';
              if (ext === 'css') return 'assets/css/style-[hash].css';
              return `assets/${ASSET_DIR[ext] ?? 'misc'}/[name]-[hash][extname]`;
            },
            manualChunks(id) {
              if (id.includes('node_modules/gsap')) return 'animation';
              if (/src[\\/]core[\\/](audio|music)\.ts/.test(id)) return 'sound';
            },
          },
        },
      },
  test: { environment: 'jsdom' },
}));
