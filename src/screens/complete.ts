/** Chapter selesai: adegan penutup + opsi ulang / lanjut / kembali. Status disimpan per akun. */
import { gsap } from 'gsap';
import type { App, Screen } from '../core/app';
import { h } from '../core/dom';
import { bookById } from '../content';
import { progress } from '../core/progress';
import { audio } from '../core/audio';
import { motion } from '../core/motion';
import { esc } from '../core/text';
import { icons } from '../core/icons';

export function completeScreen(app: App, p: Record<string, string>): Screen {
  const book = bookById(p.book)!;
  const i = book.chapters.findIndex((c) => c.id === p.chapter);
  const ch = book.chapters[i];
  const next = book.chapters[i + 1];
  if (app.user) app.progress = progress.complete(app.user.email, book.id, ch.id);

  const el = h('section', { class: 'screen done-screen' });
  el.innerHTML = `<div class="done">
    <svg class="done__stamp" viewBox="0 0 160 160" aria-hidden="true"><g filter="url(#rough)">
      <circle cx="80" cy="80" r="62" fill="none" stroke="#b5452f" stroke-width="5"/><circle cx="80" cy="80" r="52" fill="none" stroke="#b5452f" stroke-width="1.6" stroke-dasharray="3 5"/>
      <path class="done__check" d="M50 82 L72 104 L112 58" fill="none" stroke="#b5452f" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></g></svg>
    <h1 class="done__title"><small>Chapter ${i + 1}</small>Cerita Selesai!</h1>
    <p class="done__sub">${esc(ch.title)} · ${esc(book.title)}</p>
    <div class="done__btns">
      <button class="btn-magic btn-magic--ghost" data-act="back">${icons.back} Kembali</button>
      <button class="btn-magic" data-act="replay" data-autofocus>${icons.replay} Ulang Cerita</button>
    </div>
    ${next && !next.story ? `<p class="done__soon">Chapter ${i + 2} “${esc(next.title)}” segera hadir ✨</p>` : ''}
  </div><canvas class="done__confetti" aria-hidden="true"></canvas>`;

  el.querySelector('[data-act="replay"]')?.addEventListener('click', () => app.go('reader', { book: book.id, chapter: ch.id, mode: p.mode ?? 'play' }, { replace: true }));
  el.querySelector('[data-act="back"]')?.addEventListener('click', () => app.backTo('journey', { stage: 'story', book: book.id }));

  let stopConfetti = () => {};
  return {
    el, label: `Chapter ${i + 1} selesai`,
    hud: { back: false, home: true, sound: true, account: true },
    async enter() {
      audio.sfx('complete');
      audio.speak(`Hore! Chapter ${i + 1}, ${ch.title}, selesai!`);
      app.world.setBackdrop('celebrate');
      app.world.dim(.1, 1);
      stopConfetti = confetti(el.querySelector('canvas')!);
      app.fx.portalIn({ dur: 1.3 });
      await gsap.timeline()
        .fromTo(el.querySelector('.done__stamp'), { scale: .4, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: motion.d(1.1), ease: 'back.out(1.7)' })
        .fromTo(el.querySelector('.done__title'), { y: 30, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: motion.d(.8), ease: 'power3.out' }, '-=.5')
        .fromTo(el.querySelectorAll('.done__sub, .done__btns > *, .done__soon'), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, duration: motion.d(.5) }, '-=.3');
    },
    async leave() {
      stopConfetti();
      app.world.dim(0, .6);
      gsap.to(el.querySelector('.done'), { opacity: 0, scale: 1.1, filter: 'blur(6px)', duration: motion.d(.6) });
      await app.fx.portalOut(null, { dur: .8 });
    },
    destroy() { stopConfetti(); },
  };
}

function confetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx || motion.reduced) return () => {};
  const w = (canvas.width = innerWidth), hgt = (canvas.height = innerHeight);
  const cols = ['#f6e2a8', '#d9b15f', '#ffd24a', '#fff3c8', '#8a6be0'];
  const ps = Array.from({ length: 120 }, () => ({ x: w / 2 + (Math.random() - .5) * 200, y: hgt * .4, vx: (Math.random() - .5) * 11, vy: -Math.random() * 13 - 4, r: 2 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, life: 1 }));
  let raf = 0;
  const tick = () => {
    ctx.clearRect(0, 0, w, hgt);
    let alive = 0;
    for (const p of ps) {
      p.vy += .22; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += .1; p.life -= .006;
      if (p.life <= 0) continue; alive++;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
