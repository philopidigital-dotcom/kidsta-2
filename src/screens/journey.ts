/**
 * PERJALANAN BUKU — satu adegan utuh di atas meja peta (gaya "Kertas Peta").
 *
 *  sampul tertutup + tombol Masuk
 *   → pop-up masuk (tertutup otomatis)
 *   → sampul terbuka → PROLOG (±5 detik, garis tinta menghitung waktu)
 *   → halaman berbalik → PILIH JENJANG (Balita · TK · SD)
 *   → beberapa lembar berkibar → DAFTAR ISI, kamera mendekat (bisa digulir)
 *        BAB → Kategori → Cerita
 *   → halaman CERITA (sampul + daftar chapter) → Play → pop-up mode → membaca.
 *
 * Semua halaman dibalik sebagai lembar 3D sungguhan: muka = halaman lama, punggung = halaman baru.
 */
import { gsap } from 'gsap';
import type { App, Screen } from '../core/app';
import { h } from '../core/dom';
import { audio } from '../core/audio';
import { motion } from '../core/motion';
import { openAuthModal } from './authModal';
import { bookById } from '../content';
import type { Book } from '../content/schema';
import { tocFor, LEVELS, isPlayable } from '../content/toc';
import { compass, ship, waves, mountains, levelArt, modeArt, flourish, deskScene3, flutterArt, routeLine, cloud, sun, birds, butterfly, balloon, learnArt, momoReadingScene, coverArt, thumbArt, INK } from '../paper/ink';
import { esc } from '../core/text';
import { storyBackdrop } from '../paper/backdrops';

type Stage = 'landing' | 'prolog' | 'level' | 'toc' | 'story';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------------- isi halaman ---------------- */

const pageNo = (n: number, side: 'l' | 'r') => `<span class="pg-no pg-no--${side}">— ${n} —</span>`;

const coverFront = () => `<div class="cover-art">
  <div class="cover-art__frame"></div>
  <div class="cover-art__label">
    <small>buku cerita ajaib</small>
    <h1>Story Book</h1>
    ${flourish(200)}
    <span class="cover-art__compass">${compass(120)}</span>
    <em>milik para penjelajah cilik</em>
  </div>
  <div class="cover-art__strap"></div></div>`;

const prologL = (name: string) => `<div class="pg pg--prolog">
  <p class="pg-kicker">Prolog</p>
  <h2 class="pg-title">Selamat datang${name ? `, <span class="ink-red">${esc(name)}</span>` : ''}!</h2>
  ${flourish(220)}
  <p class="pg-text dropcap">Story Book adalah buku ajaib tempat kamu <b>bercerita sambil belajar</b>. Setiap babnya membawamu ke dunia baru: mendengar dongeng, mengenal hewan, berhitung, dan membaca huruf.</p>
  <p class="pg-text">Narator akan membacakan, kamu ikut menjawab teka-teki, menghitung, dan menebak. Belajar jadi seperti bermain!</p>
  <div class="prolog-timer" aria-hidden="true"><svg viewBox="0 0 300 20" preserveAspectRatio="none"><path class="prolog-timer__ink" d="M4 10 Q80 4 150 10 T296 10" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg></div>
  ${pageNo(1, 'l')}</div>`;

const LEARN: [string, string, string][] = [['dongeng', 'Dongeng', 'cerita seru & pesan baik'], ['hewan', 'Mengenal Hewan', 'nama, suara & rumahnya'], ['angka', 'Mengenal Angka', 'berhitung sambil bermain'], ['huruf', 'Mengenal Huruf', 'A sampai Z'], ['lagu', 'Bernyanyi', 'lagu anak ceria'], ['mewarnai', 'Mewarnai', 'berkreasi warna-warni']];
const prologR = () => `<div class="pg pg--prolog-r">
  <p class="pg-kicker pg-kicker--c">Di dalam buku ini</p>
  <div class="learn-grid">${LEARN.map(([k, t, d]) => `<div class="learn">${learnArt[k]}<b>${t}</b><small>${d}</small></div>`).join('')}</div>
  ${pageNo(2, 'r')}</div>`;

const levelL = () => `<div class="pg pg--level-l">
  <p class="pg-kicker">Halaman Penjelajah</p>
  <h2 class="pg-title">Siapa yang akan membaca hari ini?</h2>
  ${flourish(200)}
  <p class="pg-text">Pilih jenjangmu. Isi buku akan menyesuaikan — ceritanya, tantangannya, dan cara bermainnya.</p>
  <div class="level-map">${mountains(170)}<span class="level-map__ship">${ship(80)}</span>${waves(180)}</div>
  ${pageNo(3, 'l')}</div>`;

const levelR = () => `<div class="pg pg--level-r">
  <p class="pg-kicker pg-kicker--c">Pilih Jenjang</p>
  <div class="levels">${LEVELS.map((l, i) => `<button class="level-card" data-level="${l.id}" ${i === 0 ? 'data-autofocus' : ''}>
    <span class="level-card__art">${levelArt[l.id]}</span>
    <span class="level-card__txt"><b>${l.label}</b><small>${l.range}</small><em>${l.note}</em></span>
    <span class="level-card__go" aria-hidden="true">➜</span></button>`).join('')}</div>
  ${pageNo(4, 'r')}</div>`;

/** Halaman bergambar untuk lembar yang dibalik cepat — tiap lembar terasa hidup. */
let artSeed = Math.floor(Math.random() * 8);
const artPage = (n: number, side: 'l' | 'r') => `<div class="pg pg--art">${flutterArt(artSeed++)}${pageNo(n, side)}</div>`;

const tocL = (level: string) => {
  const lv = LEVELS.find((l) => l.id === level);
  return `<div class="pg pg--toc-l">
  <p class="pg-kicker">Peta Isi Buku</p>
  <h2 class="pg-title pg-title--xl">Daftar Isi</h2>
  ${flourish(220)}
  <div class="toc-map">
    <svg viewBox="0 0 300 220" class="toc-map__route" aria-hidden="true">${routeLine('M30 190 Q90 120 150 150 Q230 190 270 40', 3)}<circle cx="270" cy="40" r="7" fill="none" stroke="${INK}" stroke-width="2"/><path d="M262 32 l16 16 M278 32 l-16 16" stroke="#b5452f" stroke-width="3"/></svg>
    <span class="toc-map__compass">${compass(110)}</span>
  </div>
  <p class="toc-level">Jenjang: <b>${lv?.label ?? ''}</b> <button class="lnk-ink" data-act="change-level">ganti</button></p>
  ${pageNo(5, 'l')}</div>`;
};

const tocR = (level: string) => {
  let page = 7;
  return `<div class="pg pg--toc-r"><div class="toc-scroll" tabindex="0" aria-label="Daftar isi, bisa digulir">
  <p class="toc-hint"><svg viewBox="0 0 60 60" aria-hidden="true"><g filter="url(#rough)"><path d="M24 50 V22 a5 5 0 0 1 10 0 V34 l12 4 q6 3 4 10 l-3 6 H26 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M29 12 V4 M18 16 l-5 -5 M40 16 l5 -5" stroke="#b5452f" stroke-width="2.4" stroke-linecap="round"/></g></svg>
    <span><b>Ketuk</b> judul cerita untuk membukanya. <b>Gulir</b> ke bawah untuk melihat bab lainnya.</span></p>
  ${tocFor(level).map((b) => `<section class="toc-bab">
    <h3 class="toc-bab__h"><span>Bab ${b.no}</span>${esc(b.title)}</h3><p class="toc-bab__blurb">${esc(b.blurb)}</p>
    ${b.categories.map((c) => `<div class="toc-cat"><h4 class="toc-cat__h">${esc(c.label)}</h4>
      ${c.stories.map((st) => { const bk = st.book ? bookById(st.book) : undefined; const n = (page += 4);
        const play = isPlayable(bk);
        return bk ? `<button class="toc-item ${play ? 'is-ready' : 'is-soon'}" data-book="${bk.id}"><span class="toc-item__t">${esc(st.title)}${play ? ' <i class="toc-new">baru!</i>' : ''}</span><span class="toc-item__dots"></span><span class="toc-item__pg">${n}</span></button>`
          : `<div class="toc-item is-soon is-locked"><span class="toc-item__t">${esc(st.title)}</span><span class="toc-item__dots"></span><span class="stamp">segera hadir</span></div>`; }).join('')}
    </div>`).join('')}
  </section>`).join('')}
  <p class="toc-end">${flourish(160)}</p></div>
  <span class="toc-cue" aria-hidden="true">gulir<svg viewBox="0 0 30 30"><path d="M6 10 l9 9 9 -9" fill="none" stroke="#b5452f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${pageNo(6, 'r')}</div>`;
};

const coverKey = (book: Book) => (book.id === 'petualangan-si-monyet' ? 'momo' : book.cover ?? 'momo');
function storyCover(book: Book) {
  const kicker = book.id === 'petualangan-si-monyet' ? 'Kisah Momo' : esc(book.subtitle ?? '');
  return `<figure class="plate plate--cover plate--ink">${coverArt(coverKey(book))}<figcaption class="plate-banner"><small>${kicker}</small><b>${esc(book.title)}</b></figcaption></figure>`;
}

const miniOf = (bk: Book) => ({ cover: coverArt(coverKey(bk), false), title: esc(bk.title), kicker: bk.id === 'petualangan-si-monyet' ? 'Kisah Momo' : esc(bk.subtitle ?? ''),
  thumbs: bk.chapters.map((c) => thumbArt(c.thumb ?? 'meadow', false)), chapters: bk.chapters.map((c) => ({ title: c.title, ready: !!c.story })) });
const sceneL = (bk: Book) => `<div class="pg pg--scene">${momoReadingScene('l', miniOf(bk))}</div>`;
const sceneR = (bk: Book) => `<div class="pg pg--scene">${momoReadingScene('r', miniOf(bk))}</div>`;

const storyL = (book: Book) => `<div class="pg pg--story-l">${storyCover(book)}${pageNo(12, 'l')}</div>`;

const storyR = (app: App, book: Book) => `<div class="pg pg--story-r">
  <h2 class="ribbon-h"><span>Daftar Chapter</span></h2>
  <div class="chx-list">${book.chapters.map((c, i) => {
    const done = !!app.progress.completed[c.id];
    return `<div class="chx-row ${c.story ? 'is-ready' : 'is-soon'}">
      <span class="chx-row__thumb">${thumbArt(c.thumb ?? 'meadow')}</span>
      <span class="chx-row__txt"><small>Chapter ${i + 1}${done ? ' · <i class="chx-done">✓ selesai</i>' : ''}</small><b>${esc(c.title)}</b></span>
      ${c.story ? `<button class="seal-btn" data-chapter="${c.id}" aria-label="Mainkan chapter ${i + 1}: ${esc(c.title)}" ${i === 0 ? 'data-autofocus' : ''}><svg viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19 Z"/></svg></button>` : '<span class="stamp">segera hadir</span>'}
    </div>`; }).join('')}</div>
  ${pageNo(13, 'r')}</div>`;

/* ---------------- pop-up mode cerita ---------------- */

function chooseMode(host: HTMLElement, chTitle: string): Promise<'full' | 'play' | null> {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back paper-pop';
    back.innerHTML = `<div class="modal mode-pop" role="dialog" aria-modal="true" aria-labelledby="mode-t">
      <button class="modal__close" aria-label="Tutup">✕</button>
      <p class="pg-kicker pg-kicker--c">${esc(chTitle)}</p>
      <h2 class="modal__title" id="mode-t">Mau membaca dengan cara apa?</h2>
      <div class="mode-opts">
        <button class="mode-opt" data-mode="full" data-autofocus><span class="mode-opt__art">${modeArt.full}</span><b>Cerita Penuh</b><small>Duduk manis & dengarkan cerita dari awal sampai akhir.</small></button>
        <button class="mode-opt" data-mode="play"><span class="mode-opt__art">${modeArt.play}</span><b>Cerita Sambil Bermain</b><small>Ikut membantu Momo: tekan, tebak, dan hitung!</small></button>
      </div></div>`;
    host.appendChild(back);
    const modal = back.querySelector<HTMLElement>('.modal')!;
    const done = async (m: 'full' | 'play' | null) => {
      document.removeEventListener('keydown', onKey, true);
      await gsap.to(modal, { y: 24, opacity: 0, rotation: -1.5, duration: motion.d(.35), ease: 'power2.in' });
      await gsap.to(back, { opacity: 0, duration: .2 });
      back.remove(); resolve(m);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) done(null); });
    back.querySelector<HTMLButtonElement>('.modal__close')!.onclick = () => done(null);
    back.querySelectorAll<HTMLButtonElement>('.mode-opt').forEach((b) => b.onclick = () => { audio.sfx('select'); done(b.dataset.mode as 'full' | 'play'); });
    gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: .3 });
    gsap.fromTo(modal, { y: 40, opacity: 0, rotation: 2, scale: .94 }, { y: 0, opacity: 1, rotation: 0, scale: 1, duration: motion.d(.65), ease: 'back.out(1.5)' });
    gsap.fromTo(back.querySelectorAll('.mode-opt'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, delay: .2, duration: .5, ease: 'power2.out' });
    back.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  });
}

/* ---------------- layar ---------------- */

export function journeyScreen(app: App, p: Record<string, string>): Screen {
  const el = h('section', { class: 'screen journey' });
  el.innerHTML = `
    <div class="pj-desk">${deskScene3()}
      <span class="pj-deco pj-deco--sun">${sun(150)}</span>
      <span class="pj-deco pj-deco--cloud1">${cloud(220)}</span>
      <span class="pj-deco pj-deco--cloud2">${cloud(160)}</span>
      <span class="pj-deco pj-deco--balloon">${balloon(96)}</span>
      <span class="pj-deco pj-deco--birds">${birds(130)}</span>
      <span class="pj-deco pj-deco--fly">${butterfly(52)}</span>
    </div>
    <div class="pj-desk-story" aria-hidden="true"></div>
    <div class="pj-vignette" aria-hidden="true"></div>
    <div class="pj-flash"></div>
    <div class="pj-cam">
      <div class="pj-book is-closed">
        <div class="pj-shadow"></div>
        <div class="pj-board pj-board--l"></div><div class="pj-board pj-board--r"></div>
        <div class="pj-block pj-block--l"></div><div class="pj-block pj-block--r"></div>
        <div class="pj-page pj-page--l"><div class="pj-content"></div></div>
        <div class="pj-page pj-page--r"><div class="pj-content"></div></div>
        <div class="pj-gutter"></div>
        <div class="pj-cover"><div class="pj-cover__front">${coverFront()}</div><div class="pj-cover__back"></div></div>
        <div class="pj-ribbon"></div>
      </div>
    </div>
    <div class="pj-ui"><button class="ink-btn pj-enter" data-autofocus><span>Masuk</span></button></div>`;

  const cam = el.querySelector<HTMLElement>('.pj-cam')!;
  const book = el.querySelector<HTMLElement>('.pj-book')!;
  const cover = el.querySelector<HTMLElement>('.pj-cover')!;
  const pageL = el.querySelector<HTMLElement>('.pj-page--l .pj-content')!;
  const pageR = el.querySelector<HTMLElement>('.pj-page--r .pj-content')!;
  const enterBtn = el.querySelector<HTMLButtonElement>('.pj-enter')!;

  let stage: Stage = 'landing';
  let level = p.level || app.sel.ageId || '';
  let curBook: Book | undefined = p.book ? bookById(p.book) : undefined;
  let busy = false;
  let zoomed = false;
  let prologTimer: gsap.core.Tween | null = null;

  const hudFor = () => ({ back: stage === 'toc' || stage === 'story', home: stage === 'story', sound: true, account: stage !== 'landing' });
  const setPages = (l: string, r: string) => { pageL.innerHTML = l; pageR.innerHTML = r; wire(); };

  /** Balik satu lembar dengan kertas yang MELENGKUNG: lembar dipotong jadi beberapa pita
   *  bersambung (rantai 3D); tiap pita menekuk sedikit sehingga ujung kertas melengkung. */
  const turn = async (l: string, r: string, dir: 'fwd' | 'back' = 'fwd', dur = 1.35) => {
    const N = 5;
    const front = dir === 'fwd' ? pageR.innerHTML : pageL.innerHTML;
    const backHtml = dir === 'fwd' ? l : r;
    const leaf = document.createElement('div');
    leaf.className = `pj-leaf pj-leaf--${dir}`;
    // offset isi (dalam satuan lebar pita) agar tiap pita menampilkan potongan halaman yang benar
    // salinan isi di lembar tanpa filter SVG berat (displacement) → animasi tetap mulus 60fps
    const lite = (html: string) => html.replace(/\sfilter="url\(#(?:rough|rough-lg|wash|deckle)\)"/g, '');
    const face = (cls: string, html: string, k: number) =>
      `<div class="${cls}"><div class="pj-leaf__pg" style="width:${N * 100}%;left:${-k * 100}%"><div class="pj-content">${lite(html)}</div></div><i class="pj-shade"></i></div>`;
    let inner = '';
    for (let i = N - 1; i >= 0; i--) {
      const fk = dir === 'fwd' ? i : N - 1 - i;     // potongan halaman depan
      const bk = dir === 'fwd' ? N - 1 - i : i;     // potongan halaman belakang (cermin)
      inner = `<div class="pj-seg" style="width:${i === 0 ? 100 / N : 100}%">${face('pj-leaf__f', front, fk)}${face('pj-leaf__b', backHtml, bk)}${inner}</div>`;
    }
    leaf.innerHTML = `<i class="pj-leaf-shadow"></i>${inner}`;
    book.appendChild(leaf);
    if (dir === 'fwd') { pageR.innerHTML = r; } else { pageL.innerHTML = l; }
    audio.sfx('pageTurn');
    if (motion.reduced) { leaf.remove(); setPages(l, r); return; }
    const segs = [...leaf.querySelectorAll<HTMLElement>('.pj-seg')];
    // bayangan & gelap-terang lewat opacity saja (diproses GPU, tanpa melukis ulang isi halaman)
    const shF = [...leaf.querySelectorAll<HTMLElement>('.pj-leaf__f > .pj-shade')];
    const shB = [...leaf.querySelectorAll<HTMLElement>('.pj-leaf__b > .pj-shade')];
    const drop = leaf.querySelector<HTMLElement>('.pj-leaf-shadow')!;
    const sign = dir === 'fwd' ? -1 : 1;
    const B = dur < 1 ? 58 : 50;                  // seberapa melengkung
    const st = { p: 0 };
    const apply = () => {
      const p = st.p, bend = Math.sin(Math.PI * p);
      // ujung bebas memimpin di awal (kertas terangkat), lalu menyusul & rata di akhir
      const lead = bend * (p < .5 ? 1 : .55);
      segs.forEach((sg, i) => {
        const a = i === 0 ? 180 * p - B * lead * .35 : (B * lead) / (N - 1) * (1 + i / N * .6);
        sg.style.transform = `rotateY(${(a * sign).toFixed(2)}deg)`;
      });
      const f = (Math.min(1, p * 2)).toFixed(3), b = (Math.max(0, 1 - p * 2)).toFixed(3);
      shF.forEach((e) => { e.style.opacity = f; }); shB.forEach((e) => { e.style.opacity = b; });
      drop.style.opacity = bend.toFixed(3);
    };
    apply();
    // biarkan browser melukis lembar sekali dalam posisi datar (identik dgn halaman) sebelum bergerak → tanpa sentakan
    await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));
    await new Promise<void>((res) => {
      gsap.to(st, { p: 1, duration: motion.d(dur), ease: 'sine.inOut', onUpdate: apply, onComplete: res });
    });
    leaf.remove();
    setPages(l, r);
  };

  /** Beberapa lembar kosong berkibar cepat sebelum sampai ke halaman tujuan. */
  const flutter = async (n: number, l: string, r: string) => {
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      await turn(last ? l : artPage(6 + i * 2, 'l'), last ? r : artPage(7 + i * 2, 'r'), 'fwd', last ? 1.25 : .8);
    }
  };

  const zoom = async (on: boolean) => {
    zoomed = on;
    book.classList.toggle('is-zoomed', on);
    const pw = pageR.parentElement!.getBoundingClientRect().width / (gsap.getProperty(cam, 'scale') as number || 1);
    const ph = pageR.parentElement!.getBoundingClientRect().height / (gsap.getProperty(cam, 'scale') as number || 1);
    const s = on ? Math.min(innerHeight * .96 / ph, innerWidth * .94 / pw) : 1;
    await gsap.to(cam, { scale: s, x: on ? -pw / 2 * s : 0, y: 0, duration: motion.d(1.25), ease: 'power3.inOut' });
  };

  const setStage = (s: Stage) => {
    stage = s;
    el.dataset.stage = s;
    app.setParams({ stage: s === 'prolog' ? 'level' : s, level, book: curBook?.id ?? '' });
    app.setHud(hudFor());
  };

  /* ---------- alur ---------- */

  const openBook = async (l: string, r: string) => {
    setPages(l, r);
    // isi halaman kiri ditempel di balik sampul → teks sudah ada sejak sampul mulai berbalik
    const coverBack = cover.querySelector<HTMLElement>('.pj-cover__back')!;
    coverBack.innerHTML = `<div class="pj-page pj-page--l pj-cover__page"><div class="pj-content">${l}</div></div>`;
    book.classList.add('is-opening');
    audio.sfx('pageTurn');
    const tl = gsap.timeline();
    tl.to(book, { xPercent: 0, y: 0, rotation: 0, duration: motion.d(1.6), ease: 'power3.inOut' }, 0)
      .to(cover, { rotationY: -180, duration: motion.d(1.8), ease: 'sine.inOut' }, 0)
      .to(el.querySelector('.pj-cam'), { y: 0, scale: 1, duration: motion.d(1.6), ease: 'power2.inOut' }, 0)
      .fromTo([el.querySelector('.pj-block--l'), el.querySelector('.pj-board--l')], { opacity: 0 }, { opacity: 1, duration: .3 }, motion.d(.9));
    await tl;
    book.classList.remove('is-closed', 'is-opening');
    cover.style.visibility = 'hidden';
    coverBack.innerHTML = '';
  };

  const toProlog = async () => {
    setStage('prolog');
    await openBook(prologL(app.user?.guest ? '' : app.user?.name ?? ''), prologR());
    const ink = pageL.querySelector<SVGPathElement>('.prolog-timer__ink');
    if (ink) {
      const len = 300;
      gsap.set(ink, { strokeDasharray: len, strokeDashoffset: len });
      prologTimer = gsap.to(ink, { strokeDashoffset: 0, duration: 5, ease: 'none' });
    }
    await new Promise<void>((res) => { const t = setTimeout(res, 5000); el.addEventListener('pointerdown', () => { clearTimeout(t); res(); }, { once: true }); });
    prologTimer?.kill();
    await toLevel();
  };

  const toLevel = async (dir: 'fwd' | 'back' = 'fwd') => {
    setStage('level');
    await turn(levelL(), levelR(), dir);
    gsap.fromTo(pageR.querySelectorAll('.level-card'), { opacity: 0, x: 20 }, { opacity: 1, x: 0, stagger: .1, duration: .5, ease: 'power2.out' });
    pageR.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  };

  const toToc = async (via: 'level' | 'story' | 'start') => {
    setStage('toc');
    if (via === 'level') await flutter(4, tocL(level), tocR(level));
    else if (via === 'story') { if (zoomed) await zoom(false); showStoryBg(undefined, false); await turn(tocL(level), tocR(level), 'back'); }
    else setPages(tocL(level), tocR(level));
    await zoom(true);
    gsap.fromTo(pageR.querySelectorAll('.toc-bab'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: .12, duration: .55, ease: 'power2.out' });
    pageR.querySelector<HTMLElement>('.toc-scroll')?.focus({ preventScroll: true });
  };

  /** Pusatkan kamera pada sebuah elemen di halaman (koordinat layar → koordinat kamera). */
  const focusOn = (target: Element, scale: number, dur: number, ease = 'power2.inOut') => {
    const r = target.getBoundingClientRect();
    const s0 = (gsap.getProperty(cam, 'scale') as number) || 1;
    const cx0 = gsap.getProperty(cam, 'x') as number, cy0 = gsap.getProperty(cam, 'y') as number;
    // titik target dalam koordinat lokal kamera
    const lx = (r.left + r.width / 2 - innerWidth / 2 - cx0) / s0, ly = (r.top + r.height / 2 - innerHeight / 2 - cy0) / s0;
    return gsap.to(cam, { scale, x: -lx * scale, y: -ly * scale, duration: motion.d(dur), ease });
  };

  /** Latar khusus cerita: "tergambar" melebar dari tengah (atau menghilang kembali). */
  const storyBg = el.querySelector<HTMLElement>('.pj-desk-story')!;
  const showStoryBg = (bk: Book | undefined, on: boolean, dur = 1.6) => {
    if (on && bk) {
      if (storyBg.dataset.book !== bk.id) { storyBg.innerHTML = storyBackdrop(bk.id); storyBg.dataset.book = bk.id; }
      el.classList.add('has-story-bg');
      return gsap.fromTo(storyBg, { clipPath: 'circle(0% at 50% 50%)', opacity: 1 }, { clipPath: 'circle(80% at 50% 50%)', duration: motion.d(dur), ease: 'power2.inOut' });
    }
    el.classList.remove('has-story-bg');
    return gsap.to(storyBg, { clipPath: 'circle(0% at 50% 50%)', duration: motion.d(dur * .7), ease: 'power2.inOut' });
  };

  /** Percikan tinta & cahaya yang naik dari buku Momo. */
  const sparks = () => {
    const g = pageR.querySelector('.read-sparks'); if (!g) return;
    for (let i = 0; i < 26; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const x = -90 + Math.random() * 180, y = 40 + Math.random() * 90;
      c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); c.setAttribute('r', String(1.5 + Math.random() * 3.5));
      c.setAttribute('fill', i % 3 ? '#ffe08a' : '#b5452f'); g.appendChild(c);
      gsap.fromTo(c, { opacity: 0, attr: { cy: y } }, { opacity: 1, attr: { cy: y - 80 - Math.random() * 120, cx: x + (Math.random() - .5) * 80 }, duration: 1.4 + Math.random(), delay: Math.random() * 1.2, ease: 'sine.out', yoyo: true, repeat: 1 });
    }
  };

  const toStory = async (bk: Book) => {
    curBook = bk;
    setStage('story');
    await zoom(false);
    const vig = el.querySelector<HTMLElement>('.pj-vignette')!;
    if (bk.id === 'petualangan-si-monyet' && !motion.reduced) {
      // 1) lembar-lembar berputar cepat menuju ilustrasi Momo membaca
      await flutter(4, sceneL(bk), sceneR(bk));
      // 2) Momo membuka mata, bukunya bersinar & memercikkan cahaya
      const eyesC = pageR.querySelector('.momo-eyes-closed'), eyesO = pageR.querySelector('.momo-eyes-open');
      const glow = pageR.querySelector('.read-glow');
      await wait(350);
      gsap.to(eyesC, { opacity: 0, duration: .15 }); gsap.to(eyesO, { opacity: 1, duration: .15 });
      gsap.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: .9, ease: 'sine.out' });
      gsap.to(glow, { attr: { rx: 220, ry: 150 }, duration: 1.2, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      sparks(); audio.sfx('sparkle');
      await wait(900);
      // 3) kamera mendorong pelan ke ilustrasi, tepi meredup
      cam.style.willChange = 'transform';
      gsap.to(vig, { opacity: 1, duration: 1.6, ease: 'sine.inOut' });
      await focusOn(pageR.querySelector('.momo-read') ?? book, 1.45, 1.3);
      // 4) menyelam ke buku di tangan Momo sampai seukuran buku besar
      const small = pageR.querySelector('#read-book')!;
      const sNow = (gsap.getProperty(cam, 'scale') as number) || 1;
      const bigW = book.getBoundingClientRect().width / sNow;
      const smallW = small.getBoundingClientRect().width / sNow;
      const final = bigW * 1.02 / smallW;
      // salinan buku besar berisi halaman cerita, menunggu di posisi akhir
      const ghost = cam.cloneNode(true) as HTMLElement;
      ghost.classList.add('pj-cam--ghost');
      ghost.querySelector('.pj-page--l .pj-content')!.innerHTML = storyL(bk);
      ghost.querySelector('.pj-page--r .pj-content')!.innerHTML = storyR(app, bk);
      ghost.querySelectorAll('.pj-leaf').forEach((n) => n.remove());
      gsap.set(ghost, { scale: 1, x: 0, y: 0, opacity: 0 });
      cam.after(ghost);
      const dive = focusOn(small, final, 2.1, 'power3.inOut');
      dive.eventCallback('onUpdate', () => {
        const p = dive.progress();
        if (p > .72) gsap.set(ghost, { opacity: Math.min(1, (p - .72) / .26) });
        gsap.set(glow, { opacity: Math.max(0, 1 - p * 1.6) });
      });
      showStoryBg(bk, true, 1.9).delay(1.1);
      gsap.to(vig, { opacity: 0, duration: 1.2, delay: 1.2 });
      await dive;
      // 5) buku kecil kini menjadi buku besar — tukar tanpa terlihat
      setPages(storyL(bk), storyR(app, bk));
      gsap.set(cam, { scale: 1, x: 0, y: 0 });
      cam.style.willChange = '';
      ghost.remove();
      gsap.fromTo(book, { rotationX: 4 }, { rotationX: 0, duration: .8, ease: 'power2.out' });
    } else {
      await flutter(3, storyL(bk), storyR(app, bk));
      showStoryBg(bk, true);
    }
    gsap.fromTo(pageR.querySelectorAll('.chx-row'), { opacity: 0, x: 16 }, { opacity: 1, x: 0, stagger: .08, duration: .45, ease: 'power2.out' });
    gsap.fromTo(pageL.querySelector('.plate-banner'), { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'back.out(1.6)' });
    pageR.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  };

  const guard = (fn: () => Promise<void>) => async () => { if (busy) return; busy = true; try { await fn(); } finally { busy = false; } };

  /* ---------- interaksi halaman ---------- */

  function wire() {
    pageR.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((b) => b.onclick = guard(async () => {
      audio.sfx('select');
      level = b.dataset.level!; app.saveSel({ ageId: level });
      b.classList.add('is-picked');
      await wait(250);
      await toToc('level');
    }));
    const sc = pageR.querySelector<HTMLElement>('.toc-scroll');
    if (sc) sc.addEventListener('scroll', () => pageR.querySelector('.toc-cue')?.classList.toggle('is-hidden', sc.scrollTop > 40), { passive: true });
    pageL.querySelectorAll<HTMLButtonElement>('[data-act="change-level"]').forEach((b) => b.onclick = guard(async () => { await zoom(false); await toLevel('back'); }));
    pageR.querySelectorAll<HTMLButtonElement>('.toc-item[data-book]').forEach((b) => b.onclick = guard(async () => {
      const bk = bookById(b.dataset.book!); if (!bk) return;
      audio.sfx('select'); b.classList.add('is-picked');
      await toStory(bk);
    }));
    pageR.querySelectorAll<HTMLButtonElement>('.seal-btn[data-chapter]').forEach((b) => b.onclick = guard(async () => {
      if (!curBook) return;
      const ch = curBook.chapters.find((c) => c.id === b.dataset.chapter); if (!ch) return;
      audio.sfx('select');
      const mode = await chooseMode(app.root, ch.title);
      if (!mode) return;
      app.saveSel({ bookId: curBook.id, chapterId: ch.id });
      await app.go('reader', { book: curBook.id, chapter: ch.id, mode });
    }));
  }

  enterBtn.onclick = guard(async () => {
    audio.sfx('select');
    const u = await openAuthModal(app.root);
    if (!u) return;
    app.setUser(u);
    await gsap.to(enterBtn, { opacity: 0, y: 14, scale: .9, duration: .35, ease: 'power2.in' });
    enterBtn.parentElement!.style.display = 'none';
    gsap.killTweensOf(book);
    await toProlog();
  });

  const startAt = async (s: Stage) => {
    // langsung membuka buku di halaman tertentu (kembali dari cerita, tombol Daftar Isi, dll.)
    enterBtn.parentElement!.style.display = 'none';
    book.classList.remove('is-closed');
    gsap.set(cover, { rotationY: -180 }); cover.style.visibility = 'hidden';
    gsap.set(book, { xPercent: 0 });
    if (s === 'story' && curBook) { setStage('story'); setPages(storyL(curBook), storyR(app, curBook)); showStoryBg(curBook, true, 1.2); }
    else if (s === 'toc' && level) { setStage('toc'); setPages(tocL(level), tocR(level)); }
    else { setStage('level'); setPages(levelL(), levelR()); }
    await gsap.fromTo(cam, { opacity: 0, scale: .92, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: motion.d(1), ease: 'power3.out' });
    if (stage === 'toc') await zoom(true);
  };

  return {
    el, label: 'Story Book — buku cerita ajaib',
    get hud() { return hudFor(); },
    async enter() {
      document.body.classList.add('paper');
      const want = (p.stage as Stage) || '';
      const resume = app.user && (want === 'story' || want === 'toc' || want === 'level');
      gsap.fromTo(el.querySelector('.pj-desk'), { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: motion.d(1.4), ease: 'power2.out' });
      if (resume) { await startAt(want); return; }
      setStage('landing');
      gsap.set(cam, { y: -innerHeight * .04, scale: .9 }); gsap.set(book, { xPercent: -25 });
      await gsap.fromTo(book, { y: -60, rotation: -4, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: motion.d(1.2), ease: 'power3.out' });
      gsap.to(book, { y: -6, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      await gsap.fromTo(enterBtn, { opacity: 0, y: 16, scale: .9 }, { opacity: 1, y: 0, scale: 1, duration: motion.d(.6), ease: 'back.out(1.8)' });
    },
    async leave() {
      gsap.killTweensOf(book);
      await gsap.to(el, { opacity: 0, scale: 1.04, duration: motion.d(.7), ease: 'power2.in' });
    },
    onBack() {
      if (busy) return true;
      if (stage === 'story') { guard(() => toToc('story'))(); return true; }
      if (stage === 'toc') { guard(async () => { await zoom(false); await toLevel('back'); })(); return true; }
      return false;
    },
    destroy() { prologTimer?.kill(); gsap.killTweensOf(book); },
  };
}
