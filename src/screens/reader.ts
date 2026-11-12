/** Layar membaca cerita 2.5D — panggung paper ink di dalam buku terbuka. */
import { gsap } from 'gsap';
import type { App, Screen } from '../core/app';
import { h } from '../core/dom';
import { spreadMarkup } from '../components/spread';
import type { PaperPlayer } from '../reader/paper/player';
import { bookById, preloadChapter } from '../content';
import { loadStory } from '../content/loadStory';
import { audio } from '../core/audio';
import { motion } from '../core/motion';
import { toast } from '../core/toast';

export function readerScreen(app: App, p: Record<string, string>): Screen {
  const book = bookById(p.book)!;
  const ch = book.chapters.find((c) => c.id === p.chapter)!;
  const el = h('section', { class: 'screen reader-screen reader-screen--paper' });
  el.innerHTML = `${spreadMarkup({ canvas: '' })}
    <div class="pause-seal"><div>Dijeda — tekan Spasi</div></div>
    <p class="reader-hint"><kbd>Spasi</kbd> jeda &nbsp;·&nbsp; <kbd>←</kbd><kbd>→</kbd> adegan &nbsp;·&nbsp; <kbd>Esc</kbd> kembali</p>`;
  const wrap = el.querySelector<HTMLElement>('.spread-wrap')!;
  const canvas = el.querySelector<HTMLElement>('.spread__canvas')!;
  const spread = el.querySelector<HTMLElement>('.spread')!;
  spread.insertAdjacentHTML('beforeend', `<button class="page-corner page-corner--prev" aria-label="Ulang adegan"><span></span><em>Sebelumnya</em></button>
    <button class="page-corner page-corner--next" aria-label="Lanjut"><span></span><em>Selanjutnya</em></button>`);
  const seal = el.querySelector<HTMLElement>('.pause-seal')!;

  let player: PaperPlayer | null = null;
  let gone = false;
  const idx = book.chapters.findIndex((c) => c.id === ch.id);

  const start = async () => {
    try {
      const [{ PaperPlayer }, story] = await Promise.all([
        import('../reader/paper/player'),
        loadStory(ch.story),
      ]);
      if (gone) return;
      if (!story) throw new Error('Chapter tidak ditemukan.');
      player = new PaperPlayer(canvas, story, {
        onComplete: () => app.go('complete', { book: book.id, chapter: ch.id, mode: p.mode ?? 'play' }, { replace: true }),
        onPauseChange: (paused) => gsap.to(seal, { opacity: paused ? 1 : 0, duration: .3 }),
      }, { auto: p.mode === 'full' });
      if (import.meta.env.DEV) (window as unknown as { __player: PaperPlayer }).__player = player;
      player.start();
      preloadChapter(book.chapters[idx + 1]?.story);
    } catch {
      toast('Cerita gagal dimuat. Periksa koneksi lalu coba lagi.', 'err');
    }
  };

  el.querySelector<HTMLButtonElement>('.page-corner--next')!.onclick = () => player?.next();
  el.querySelector<HTMLButtonElement>('.page-corner--prev')!.onclick = () => player?.prev();

  return {
    el, label: `Membaca ${book.title} — ${ch.title}`,
    hud: { back: true, sound: true },
    async enter() {
      app.saveSel({ bookId: book.id, chapterId: ch.id });
      app.world.setBackdrop('desk');
      app.world.dim(.35, 1.2);
      await Promise.all([
        app.fx.portalIn({ dur: 1.3 }),
        gsap.fromTo(wrap, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: motion.d(1.3), ease: 'power3.out' }),
      ]);
      start();
      if (audio.enabled && audio.ttsAvailable === false) toast('Browser ini tidak mendukung narator suara — teks tetap muncul.', 'info', 4200);
    },
    async leave() {
      gone = true;
      player?.destroy(); player = null;
      app.world.dim(0, .8);
      gsap.to(wrap, { scale: 1.12, duration: motion.d(1), ease: 'power2.in' });
      await app.fx.portalOut(wrap, { dur: .9 });
      gsap.set(wrap, { opacity: 0 });
    },
    onKey(e) {
      if (e.key === ' ') { e.preventDefault(); player?.togglePause(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); player?.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); player?.prev(); }
    },
    destroy() { gone = true; player?.destroy(); },
  };
}
