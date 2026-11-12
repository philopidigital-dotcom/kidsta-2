/**
 * Story Book — titik masuk aplikasi.
 * Alur: landing → login → transisi masuk dunia → usia → aktivitas → kategori → buku → chapter → reader → selesai.
 */
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/fraunces/latin-800.css';
import '@fontsource/fraunces/latin-600-italic.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/lora/latin-500.css';
import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/im-fell-english/latin-400-italic.css';
import '@fontsource/im-fell-english-sc/latin-400.css';
import '@fontsource/kalam/latin-400.css';
import '@fontsource/kalam/latin-700.css';
import '@fontsource/caveat/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/world.css';
import './styles/book.css';
import './styles/spread.css';
import './styles/screens.css';
import './styles/reader.css';
import './styles/paper.css';
import './styles/story.css';

import { gsap } from 'gsap';
import { App } from './core/app';
import { journeyScreen } from './screens/journey';
import { installPaper } from './paper/ink';
import { readerScreen } from './screens/reader';
import { completeScreen } from './screens/complete';
import { toast } from './core/toast';
import { watchFrameRate } from './core/perf';
import { catalog } from './content';
import { validateCatalog } from './content/schema';

gsap.config({ force3D: true, nullTargetWarn: false });

async function boot() {
  const root = document.getElementById('app')!;
  const pre = document.getElementById('preloader');

  if (import.meta.env.DEV) {
    const { stories } = await import('./content/allStories');
    const { validateStory } = await import('./reader/paper/validate');
    const errs = [...validateCatalog(catalog, stories), ...Object.values(stories).flatMap(validateStory)];
    if (errs.length) console.warn('[konten]', errs);
  }

  const app = new App(root);
  if (import.meta.env.DEV) (window as unknown as { __app: App }).__app = app;
  installPaper();
  document.body.classList.add('paper');
  app.register('journey', journeyScreen);
  app.register('reader', readerScreen);
  app.register('complete', completeScreen);

  window.addEventListener('error', (e) => { console.error(e.error ?? e.message); toast('Ups, ada yang tersandung. Coba lagi ya.', 'err'); });
  window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });

  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]); } catch { /* lanjut */ }
  pre?.classList.add('is-done');
  setTimeout(() => pre?.remove(), 900);
  await app.go('journey');
  watchFrameRate();
  (window as unknown as { __sb: App }).__sb = app; // bantu pengujian
}

boot();
