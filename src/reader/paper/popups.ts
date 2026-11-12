/** Pop-up interaksi bergaya tinta di kertas: pilihan ganda & kartu petunjuk ketuk. */
import { gsap } from 'gsap';
import { ICONS } from './sets';
import type { ChoiceOpt } from './types';
import { audio } from '../../core/audio';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const FLOURISH = `<svg viewBox="0 0 240 24" class="pp-flourish" aria-hidden="true"><path d="M4 12 Q60 2 116 12 M124 12 Q180 22 236 12" fill="none" stroke="#3b2a1a" stroke-width="1.8" stroke-linecap="round"/><path d="M120 4 l7 8 -7 8 -7 -8 Z" fill="#b5452f" stroke="#3b2a1a" stroke-width="1.2"/></svg>`;

export interface ChoiceOpts { q: string; options: ChoiceOpt[]; answer: string; auto: boolean; onWrong: () => Promise<void>; signal: AbortSignal; /** selesai saat suara pertanyaan habis dibacakan */ ready?: Promise<unknown> }

/** Tampilkan pilihan ganda; resolve setelah jawaban benar dipilih. */
export function choicePopup(host: HTMLElement, o: ChoiceOpts): Promise<void> {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'pp-pop-back';
    back.innerHTML = `<div class="pp-pop" role="dialog" aria-modal="true" aria-label="${esc(o.q)}">
      <p class="pp-pop__kick">Ayo jawab!</p>
      <h3 class="pp-pop__q">${esc(o.q)}</h3>${FLOURISH}
      <div class="pp-opts">${o.options.map((op, i) => `<button class="pp-opt" data-id="${esc(op.id)}" style="--tilt:${(i - 1) * 1.6}deg"><span class="pp-opt__art">${ICONS[op.art] ?? ''}</span><b>${esc(op.label)}</b><i class="pp-opt__stamp" aria-hidden="true"></i></button>`).join('')}</div>
    </div>`;
    host.appendChild(back);
    const pop = back.querySelector<HTMLElement>('.pp-pop')!;
    const btns = [...back.querySelectorAll<HTMLButtonElement>('.pp-opt')];
    let busy = false, finished = false;
    const close = async () => {
      if (finished) return; finished = true;
      await gsap.to(pop, { y: 30, rotation: -2, opacity: 0, duration: .45, ease: 'power2.in' });
      back.remove(); resolve();
    };
    o.signal.addEventListener('abort', () => { back.remove(); if (!finished) { finished = true; resolve(); } }, { once: true });
    const pick = async (b: HTMLButtonElement) => {
      if (busy || finished) return; busy = true;
      audio.stopSpeech(); // anak sudah menjawab → suara pertanyaan berhenti, tidak bertumpuk dengan pujian
      const ok = b.dataset.id === o.answer;
      const stamp = b.querySelector<HTMLElement>('.pp-opt__stamp')!;
      if (ok) {
        audio.sfx('correct');
        b.classList.add('is-right'); stamp.textContent = '✓';
        gsap.fromTo(stamp, { scale: 2.4, opacity: 0, rotation: -25 }, { scale: 1, opacity: 1, rotation: -12, duration: .35, ease: 'back.out(2.5)' });
        burst(b);
        await new Promise((r) => setTimeout(r, 1100));
        await close();
      } else {
        audio.sfx('retry');
        b.classList.add('is-wrong'); stamp.textContent = '✗';
        gsap.fromTo(b, { x: -10 }, { x: 0, duration: .5, ease: 'elastic.out(1.4, .3)' });
        gsap.fromTo(stamp, { scale: 2, opacity: 0 }, { scale: 1, opacity: 1, duration: .3 });
        await o.onWrong();
        b.classList.remove('is-wrong'); b.disabled = true; stamp.textContent = '';
        busy = false;
      }
    };
    btns.forEach((b) => { b.onclick = () => { audio.unlock(); pick(b); }; });
    gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: .3 });
    gsap.fromTo(pop, { y: 40, opacity: 0, rotation: 2.5, scale: .94 }, { y: 0, opacity: 1, rotation: 0, scale: 1, duration: .6, ease: 'back.out(1.6)' });
    gsap.fromTo(btns, { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, delay: .25, duration: .5, ease: 'power2.out' });
    btns[0]?.focus({ preventScroll: true });
    if (o.auto) {
      const right = btns.find((b) => b.dataset.id === o.answer)!;
      // mode Cerita Penuh: tunggu pertanyaan selesai dibacakan dulu, baru jawaban ditunjukkan
      (o.ready ?? Promise.resolve()).then(() => {
        if (finished || o.signal.aborted) return;
        gsap.delayedCall(.7, () => { right.classList.add('is-hint'); });
        gsap.delayedCall(1.9, () => pick(right));
      });
    }
  });
}

/** Bintang-bintang kecil memancar dari tombol. */
export function burst(el: Element, n = 10) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'pp-star';
    s.style.left = `${r.left + r.width / 2}px`; s.style.top = `${r.top + r.height / 2}px`;
    document.body.appendChild(s);
    const a = (i / n) * Math.PI * 2, d = 60 + Math.random() * 60;
    gsap.fromTo(s, { x: 0, y: 0, scale: .4, rotation: 0, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1, rotation: 160, opacity: 0, duration: .9, ease: 'power2.out', onComplete: () => s.remove() });
  }
}

/** Kartu petunjuk ketuk (di atas halaman) dengan titik-titik hitungan. */
export function tapHint(host: HTMLElement, q: string, total: number) {
  const el = document.createElement('div');
  el.className = 'pp-taphint';
  el.innerHTML = `<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M24 50 V22 a5 5 0 0 1 10 0 V34 l12 4 q6 3 4 10 l-3 6 H26 Z" fill="#f3e6c8" stroke="#3b2a1a" stroke-width="2.2" stroke-linejoin="round"/><path d="M29 12 V4 M18 16 l-5 -5 M40 16 l5 -5" stroke="#b5452f" stroke-width="2.4" stroke-linecap="round"/></svg>
    <div><p>${esc(q)}</p><span class="pp-dots">${Array.from({ length: total }, () => '<i></i>').join('')}</span></div>`;
  host.appendChild(el);
  gsap.fromTo(el, { y: -30, opacity: 0, rotation: -2 }, { y: 0, opacity: 1, rotation: 0, duration: .55, ease: 'back.out(1.8)' });
  return {
    tick(n: number) { const d = el.querySelectorAll('.pp-dots i')[n - 1]; if (d) { d.classList.add('on'); d.textContent = String(n); gsap.fromTo(d, { scale: 1.8 }, { scale: 1, duration: .35, ease: 'back.out(3)' }); } },
    async done(praise: string) {
      el.classList.add('is-done');
      el.querySelector('p')!.textContent = praise;
      gsap.fromTo(el, { scale: 1.06 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
      burst(el, 12);
      await new Promise((r) => setTimeout(r, 1300));
      await gsap.to(el, { y: -24, opacity: 0, duration: .4 });
      el.remove();
    },
    remove() { el.remove(); },
  };
}
