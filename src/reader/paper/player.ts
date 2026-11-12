/**
 * Pemutar cerita 2.5D. Menjalankan adegan → beat: kamera, aksi tokoh, cuaca, musik emosi,
 * efek suara, narasi (rekaman Gemini bila ada, kalau tidak suara browser), dan interaksi.
 */
import { gsap } from 'gsap';
import { PaperStage } from './stage';
import { CAST_NAME } from './cast';
import { choicePopup, tapHint } from './popups';
import type { Act, Ask, Beat, CastId, PaperStory, Scene } from './types';
import { audio, estimateMs } from '../../core/audio';
import { motion } from '../../core/motion';

export interface PlayerHooks { onComplete(): void; onPauseChange?(paused: boolean): void }

import voices from '../../content/voices.json';

/** Suara cadangan (Web Speech) bila rekaman Gemini belum ada — diambil dari daftar suara terkunci. */
type BV = { pitch: number; rate: number; kelamin: 'perempuan' | 'laki-laki' };
const VOICE = { narrator: voices.narator.browser as BV, ...Object.fromEntries(Object.entries(voices.tokoh).map(([k, t]) => [k, t.browser as BV])) } as Record<CastId | 'narrator', BV>;
const ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export class PaperPlayer {
  private stage: PaperStage;
  /** naik setiap adegan dimuat → aksi tertunda dari adegan lama tidak menyentuh pemeran adegan baru */
  private sceneNo = 0;
  private textLayer: HTMLElement;
  private ui: HTMLElement;
  private trans: HTMLElement;
  private si = 0; private bi = 0;
  private abort = new AbortController();
  private dead = false;
  private paused = false;
  private clips = new Set<string>();
  private clipBase: string;
  private jump: 'next' | 'prev' | null = null;

  constructor(private host: HTMLElement, private story: PaperStory, private hooks: PlayerHooks, private opts: { auto: boolean }) {
    host.classList.add('pp-host');
    this.stage = new PaperStage(host);
    this.textLayer = Object.assign(document.createElement('div'), { className: 'pp-text' });
    this.ui = Object.assign(document.createElement('div'), { className: 'pp-ui' });
    this.trans = Object.assign(document.createElement('div'), { className: 'pp-trans' });
    host.append(this.textLayer, this.ui, this.trans);
    this.clipBase = `${import.meta.env.BASE_URL}assets/sound/narasi/${story.id}/`;
  }

  async start() {
    try { const r = await fetch(`${this.clipBase}index.json`); if (r.ok) (await r.json() as string[]).forEach((id) => this.clips.add(id)); } catch { /* belum ada rekaman → suara browser */ }
    await this.titleCard();
    while (!this.dead && this.si < this.story.scenes.length) {
      await this.playScene(this.story.scenes[this.si]);
      if (this.dead) return;
      if (this.target !== null) { this.si = this.target; this.target = null; continue; }
      if (this.jump === 'prev') { this.jump = null; this.si = Math.max(0, this.bi === 0 ? this.si - 1 : this.si); continue; }
      this.si++;
    }
    if (this.dead) return;
    await this.irisClose();
    this.hooks.onComplete();
  }

  /* ---------------- kontrol ---------------- */
  next() { this.jump = 'next'; this.abort.abort(); }
  private target: number | null = null;
  /** Lompat ke adegan tertentu (dipakai pengujian & daftar adegan). */
  goScene(i: number) { this.target = Math.max(0, Math.min(this.story.scenes.length - 1, i)); this.jump = 'prev'; this.abort.abort(); }
  prev() { this.jump = 'prev'; this.abort.abort(); }
  togglePause() {
    this.paused = !this.paused;
    if (this.paused) { gsap.globalTimeline.pause(); audio.pauseSpeech(); } else { gsap.globalTimeline.resume(); audio.resumeSpeech(); }
    this.stage.pause(this.paused);
    this.hooks.onPauseChange?.(this.paused);
  }
  destroy() {
    this.dead = true; this.abort.abort();
    if (this.paused) gsap.globalTimeline.resume();
    audio.stopSpeech(); audio.setAmbience('none');
    this.stage.destroy();
    this.textLayer.remove(); this.ui.remove(); this.trans.remove();
  }

  /* ---------------- adegan ---------------- */
  private async playScene(sc: Scene) {
    await this.irisClose();
    if (this.dead) return;
    this.sceneNo++;
    this.stage.load(sc);
    audio.music.play(sc.music === 'none' ? 'none' : sc.music);
    audio.setAmbience(sc.ambience ?? 'none');
    // rekaman adegan ini disiapkan dulu → suara & gerak mulai bersamaan, tidak tersendat
    this.preload(sc);
    this.warmNext(this.story.scenes[this.si + 1]);
    const first = sc.beats.findIndex((b) => b.say);
    if (first >= 0 && this.clips.has(`${sc.id}-${first}`)) await audio.clipReady(`${this.clipBase}${sc.id}-${first}.mp3`, 4000);
    await this.irisOpen(sc.name);
    for (this.bi = 0; this.bi < sc.beats.length && !this.dead; this.bi++) {
      this.abort = new AbortController();
      this.jump = null;
      if (this.bi > 0) this.preload(sc, this.bi);
      await this.playBeat(sc, sc.beats[this.bi], this.bi);
      if (this.jump || this.target !== null) return;
    }
  }

  /** Siapkan kalimat aktif dan beberapa berikutnya agar permintaan suara tetap bertahap. */
  private preload(sc: Scene, from = 0) {
    if (from === 0) audio.clearClips();
    const add = (id: string) => { if (this.clips.has(id)) audio.preloadClip(`${this.clipBase}${id}.mp3`); };
    sc.beats.slice(from, from + 3).forEach((b, offset) => {
      const i = from + offset;
      const id = `${sc.id}-${i}`;
      if (b.say) add(id);
      if (b.ask) { add(`${id}-q`); add(`${id}-praise`); add(`${id}-retry`); if (b.ask.type !== 'choice') b.ask.items.forEach((_, n) => add(`num-${n + 1}`)); }
    });
  }

  /** Hangatkan dua kalimat pertama adegan berikutnya agar transisi tidak menunggu unduhan. */
  private warmNext(sc?: Scene) {
    if (!sc) return;
    const add = (id: string) => { if (this.clips.has(id)) audio.preloadClip(`${this.clipBase}${id}.mp3`); };
    sc.beats.slice(0, 2).forEach((b, i) => { if (b.say) add(`${sc.id}-${i}`); });
  }

  private async playBeat(sc: Scene, b: Beat, bi: number) {
    const sig = this.abort.signal;
    const st = this.stage;
    if (b.music) audio.music.play(b.music === 'none' ? 'none' : b.music);
    if (b.ambience) audio.setAmbience(b.ambience);
    if (b.grade) st.grade(b.grade);
    if (b.weather) st.setWeather(b.weather);
    // ATURAN WAKTU: gerak, kamera & efek suara baru mulai saat narasi benar-benar terdengar,
    // dan cerita TIDAK lanjut sebelum narasi selesai diucapkan.
    let go!: (ms?: number) => void;
    const started = new Promise<number | undefined>((r) => { go = r; });
    let speech: Promise<unknown> = Promise.resolve();
    if (b.say) speech = this.say(`${sc.id}-${bi}`, b.say, b.who, sig, b.side, go); else go();
    const voiceMs = await started;
    // GERAK MENGIKUTI SUARA: lama rekaman yang sebenarnya menentukan tempo adegan.
    //  · jeda tiap aksi direntang/dirapatkan sebanding (k) → gerak jatuh di kata yang sama walau suara lebih lambat/cepat
    //  · gerak kamera yang lambat (≥3 dtk) dibentang sepanjang kalimat, selesai tepat sebelum kalimat habis
    let k = 1; let cam = b.cam;
    if (voiceMs && b.say) {
      k = Math.min(2.4, Math.max(.6, voiceMs / estimateMs(b.say)));
      if (cam && (cam.dur ?? 0) >= 3) cam = { ...cam, dur: Math.min(14, Math.max(3, voiceMs / 1000 * .94)) };
    }
    b.sfx?.forEach((s, i) => gsap.delayedCall(i * .3 * k, () => { if (!sig.aborted) audio.sfx(s); }));
    const camP = cam ? st.moveCam(cam) : Promise.resolve();
    const acts = (b.do ?? []).map((a) => this.act(a, sig, k));
    await Promise.all([speech, this.wait(b.wait ?? 0, sig)]);
    if (sig.aborted && this.jump) { this.clearText(); return; }
    // gerak yang masih berjalan (mis. berjalan jauh) dituntaskan dulu sebelum kalimat berikutnya
    await Promise.race([Promise.all([camP, ...acts]), this.wait(6000, sig)]);
    if (b.ask && !sig.aborted) await this.ask(`${sc.id}-${bi}`, b.ask, sig);
    await this.wait(b.hold ?? 450, sig);
    this.clearText();
  }

  private act(a: Act, sig: AbortSignal, k = 1): Promise<void> {
    const st = this.stage;
    const delay = (a.delay ?? 0) * k;
    const no = this.sceneNo;
    return new Promise((res) => {
      gsap.delayedCall(delay, async () => {
        if (no !== this.sceneNo || (sig.aborted && this.jump)) return res();
        if ('fx' in a) { st.fx(a.fx, a.who, a.at); return res(); }
        if ('prop' in a) { st.prop(a.prop, a.state); return res(); }
        const actor = st.actors.get(a.who); if (!actor) return res();
        if (a.expr) actor.expr(a.expr);
        if (a.face) actor.face(a.face);
        if (a.look) actor.look(a.look);
        if (a.to) {
          const [x, y] = st.at(a.to);
          const pose = a.pose ?? (Math.hypot(x - actor.st.x, y - actor.st.y) > 260 ? 'walk' : 'walk');
          await actor.moveTo(x, y, a.dur ?? Math.max(.8, Math.hypot(x - actor.st.x, y - actor.st.y) / 260), pose, a.then ?? 'idle');
          if (a.face) actor.face(a.face);
          if (a.look) actor.look(a.look);
        } else if (a.pose) {
          actor.pose(a.pose);
          if (a.then) gsap.delayedCall(1.6, () => actor.pose(a.then!));
        }
        res();
      });
    });
  }

  private wait(ms: number, sig: AbortSignal) {
    return new Promise<void>((res) => {
      if (ms <= 0 || sig.aborted) return res();
      const d = gsap.delayedCall(ms / 1000, res);
      sig.addEventListener('abort', () => { d.kill(); res(); }, { once: true });
    });
  }

  /* ---------------- narasi ---------------- */
  private clearText() {
    this.textLayer.querySelectorAll('.pp-card').forEach((c) => gsap.to(c, { opacity: 0, y: 8, duration: .35, onComplete: () => c.remove() }));
  }

  private sideFor(who?: CastId): 'L' | 'R' {
    const a = this.stage.actors.get(who ?? 'momo') ?? [...this.stage.actors.values()][0];
    if (!a) return 'L';
    const [x] = this.stage.toScreen(a.st.x, a.st.y);
    return x > this.stage.size[0] / 2 ? 'L' : 'R';
  }

  private async say(id: string, text: string, who: CastId | undefined, sig: AbortSignal, side?: 'L' | 'R', onStart?: (ms?: number) => void) {
    this.clearText();
    const card = document.createElement('div');
    const sd = side ?? this.sideFor(who);
    card.className = `pp-card pp-card--${sd} ${who ? `pp-card--talk pp-card--${who}` : ''}`;
    const words = text.split(/\s+/);
    card.innerHTML = `${who ? `<span class="pp-card__who">${esc(CAST_NAME[who])}</span>` : ''}<p>${words.map((w) => `<span class="w">${esc(w)}</span>`).join(' ')}</p>`;
    this.textLayer.appendChild(card);
    gsap.fromTo(card, { opacity: 0, y: 14, rotation: sd === 'L' ? -1.2 : 1.2 }, { opacity: 1, y: 0, rotation: 0, duration: .5, ease: 'back.out(1.6)' });
    const spans = [...card.querySelectorAll<HTMLElement>('.w')];
    const actor = who ? this.stage.actors.get(who) : undefined;
    const reveal = (ms: number) => {
      const total = text.length || 1; let acc = 0;
      spans.forEach((s, i) => { const at = (acc / total) * ms * .92; acc += words[i].length + 1; gsap.delayedCall(at / 1000, () => s.classList.add('on')); });
    };
    // mulut, sorot kata & gerak adegan dimulai tepat saat suara terdengar
    let begun = false;
    const begin = (ms: number) => { if (begun) return; begun = true; actor?.talk(true); reveal(ms); onStart?.(ms); };
    const quiet = async () => { const est = estimateMs(text) * 1.1 + 500; begin(est); await this.wait(est, sig); };
    if (this.clips.has(id)) {
      const how = await audio.playClip(`${this.clipBase}${id}.mp3`, { onStart: begin, signal: sig });
      // rekaman gagal dimuat → teks tetap tampil selama waktu baca; suara tokoh tidak diganti suara lain
      if (how === 'silent' && !sig.aborted) await quiet();
    } else if (this.clips.size && !sig.aborted) await quiet();
    else if (!sig.aborted) await this.tts(text, who, sig, begin);
    if (!begun) { begun = true; onStart?.(); }
    actor?.talk(false);
    spans.forEach((s) => s.classList.add('on'));
  }

  private tts(text: string, who: CastId | undefined, sig: AbortSignal, reveal: (ms: number) => void) {
    const v = VOICE[who ?? 'narrator'];
    const est = Math.max(1800, text.split(/\s+/).length * 360 + 900) / v.rate;
    let started = false;
    return audio.speak(text, { pitch: v.pitch, rate: v.rate, gender: v.kelamin, signal: sig, onStart: () => { if (!started) { started = true; reveal(est); } } });
  }

  /** Suara pendek tanpa kartu (pertanyaan, angka, pujian). Selalu satu suara pada satu waktu. */
  private lastVoice: Promise<unknown> = Promise.resolve();
  private quick(id: string, text: string, sig: AbortSignal): Promise<unknown> {
    const p = (async () => {
      if (sig.aborted) return;
      if (this.clips.has(id)) { await audio.playClip(`${this.clipBase}${id}.mp3`, { signal: sig }); return; }
      if (this.clips.size) return; // cerita ini memakai rekaman → jangan diganti suara browser
      await audio.speak(text, { pitch: VOICE.narrator.pitch, rate: 1, gender: 'perempuan', signal: sig });
    })();
    this.lastVoice = p;
    return p;
  }
  /** Selesai setelah suara yang sedang diputar habis (+ jeda napas). */
  private async afterVoice(sig: AbortSignal, gapMs = 350, capMs = 15000) {
    await Promise.race([this.lastVoice, this.wait(capMs, sig)]);
    await this.wait(gapMs, sig);
  }

  /* ---------------- interaksi ---------------- */
  private async ask(id: string, a: Ask, sig: AbortSignal) {
    if (a.type === 'choice') {
      const asked = this.quick(`${id}-q`, a.q, sig);
      await choicePopup(this.ui, {
        q: a.q, options: a.options, answer: a.answer, auto: this.opts.auto, signal: sig, ready: asked,
        onWrong: async () => { await this.quick(`${id}-retry`, a.retry, sig); },
      });
      if (!sig.aborted) { audio.sfx('complete'); await this.quick(`${id}-praise`, a.praise, sig); }
      return;
    }
    // ketuk benda di adegan
    const hint = tapHint(this.ui, a.q, a.items.length);
    this.quick(`${id}-q`, a.q, sig);
    let n = 0;
    await new Promise<void>((resolve) => {
      const targets = a.items.map((it) => this.tapTarget(it));
      const cleanup: (() => void)[] = [];
      const step = (idx: number) => {
        const t = targets[idx]; if (!t) return;
        t.el.classList.add('is-tappable');
        const handler = (e: Event) => {
          e.stopPropagation();
          t.el.classList.remove('is-tappable');
          t.el.removeEventListener('pointerdown', handler);
          n++;
          audio.unlock(); audio.sfx('tap');
          hint.tick(n);
          t.hit(n);
          if (a.count === 'number') this.quick(`num-${n}`, ANGKA[n] ?? String(n), sig);
          if (n >= a.items.length) { cleanup.forEach((c) => c()); this.afterVoice(sig, 250, 2500).then(() => resolve()); }
          else step(idx + 1);
        };
        t.el.addEventListener('pointerdown', handler);
        cleanup.push(() => { t.el.removeEventListener('pointerdown', handler); t.el.classList.remove('is-tappable'); });
        // mode Cerita Penuh: ketukan berikutnya menunggu suara (pertanyaan / angka) selesai
        if (this.opts.auto) this.afterVoice(sig, 450).then(() => { if (!sig.aborted && t.el.classList.contains('is-tappable')) handler(new Event('pointerdown')); });
      };
      // benda yang sama (mis. Momo ×3) memakai satu target berulang
      const uniq = new Set(a.items);
      if (uniq.size === 1) {
        const t = targets[0];
        t.el.classList.add('is-tappable');
        const handler = (e: Event) => {
          e.stopPropagation(); n++; audio.unlock(); audio.sfx('tap'); hint.tick(n); t.hit(n);
          if (a.count === 'number') this.quick(`num-${n}`, ANGKA[n] ?? String(n), sig);
          if (n >= a.items.length) { t.el.classList.remove('is-tappable'); t.el.removeEventListener('pointerdown', handler); this.afterVoice(sig, 250, 2500).then(() => resolve()); }
        };
        t.el.addEventListener('pointerdown', handler);
        cleanup.push(() => { t.el.removeEventListener('pointerdown', handler); t.el.classList.remove('is-tappable'); });
        if (this.opts.auto) (async () => { for (let i = 0; i < a.items.length; i++) { await this.afterVoice(sig, 450); if (sig.aborted || n >= a.items.length) return; handler(new Event('pointerdown')); } })();
      } else step(0);
      sig.addEventListener('abort', () => { cleanup.forEach((c) => c()); hint.remove(); resolve(); }, { once: true });
    });
    if (sig.aborted) return;
    audio.sfx('correct');
    await Promise.all([hint.done(a.praise), this.quick(`${id}-praise`, a.praise, sig)]);
    a.items.forEach((it) => { const el = this.stage.propEl(it)?.querySelector('.pp-item__num'); if (el) gsap.to(el, { opacity: 0, duration: .8, delay: 1 }); });
  }

  /** Elemen yang bisa diketuk: benda di set (data-item) atau tokoh. */
  private tapTarget(id: string): { el: Element; hit: (n: number) => void } {
    const actor = this.stage.actors.get(id as CastId);
    if (actor) {
      actor.g.classList.add('pp-actor--tap');
      return { el: actor.g, hit: () => {
        gsap.fromTo(actor.st, { squash: .86 }, { squash: 1, duration: .45, ease: 'elastic.out(1.4, .35)' });
        this.stage.fx('sparkle', actor.def.id);
      } };
    }
    const el = this.stage.propEl(id)!;
    return { el, hit: (n) => {
      const num = el.querySelector('.pp-item__num');
      if (num) num.innerHTML = `<circle cx="22" cy="-26" r="15" fill="#fbf1da" stroke="#b5452f" stroke-width="2.4"/><text x="22" y="-19" text-anchor="middle" font-family="'IM Fell English', serif" font-size="20" fill="#b5452f">${n}</text>`;
      el.classList.add('is-counted');
      gsap.fromTo(el.querySelector('.pp-item__num'), { scale: 0, transformOrigin: '22px -26px' }, { scale: 1, duration: .4, ease: 'back.out(3)' });
      gsap.to(el, { y: '-=12', duration: .18, yoyo: true, repeat: 1, ease: 'power2.out' });
    } };
  }

  /* ---------------- judul & transisi ---------------- */
  private async titleCard() {
    const t = document.createElement('div');
    t.className = 'pp-title';
    t.innerHTML = `<div class="pp-title__in"><p class="pp-title__kick">${esc(this.story.chapterLabel)}</p><h2>${esc(this.story.title)}</h2>
      <svg viewBox="0 0 400 30" aria-hidden="true"><path class="pp-title__line" d="M10 18 Q100 4 200 16 T390 12" fill="none" stroke="#b5452f" stroke-width="3" stroke-linecap="round"/></svg></div>`;
    this.host.appendChild(t);
    const line = t.querySelector<SVGPathElement>('.pp-title__line')!;
    gsap.set(line, { strokeDasharray: 420, strokeDashoffset: 420 });
    audio.music.play(this.story.scenes[0]?.music ?? 'tenang');
    const tl = gsap.timeline();
    tl.fromTo(t.querySelector('.pp-title__kick'), { opacity: 0, letterSpacing: '.8em' }, { opacity: 1, letterSpacing: '.35em', duration: 1 })
      .fromTo(t.querySelector('h2'), { opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1.6, ease: 'power2.inOut' }, .3)
      .to(line, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' }, 1.4);
    const sig = this.abort.signal;
    await Promise.all([tl, this.quick('title', `${this.story.chapterLabel.replace('Chapter', 'Chapter')}. ${this.story.title}.`, sig), this.wait(motion.reduced ? 800 : 3600, sig)]);
    this.titleEl = t;
  }
  private titleEl: HTMLElement | null = null;

  private async irisClose() {
    this.clearText();
    if (this.titleEl) return; // judul masih menutupi panggung
    this.trans.classList.add('on');
    await gsap.fromTo(this.trans, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: motion.d(.9), ease: 'power2.in' });
  }
  private async irisOpen(name: string) {
    this.trans.innerHTML = `<p class="pp-trans__name">${esc(name)}</p>`;
    if (this.titleEl) {
      const t = this.titleEl; this.titleEl = null;
      await gsap.to(t, { clipPath: 'circle(0% at 50% 50%)', duration: motion.d(1.1), ease: 'power2.inOut', onComplete: () => t.remove() });
      return;
    }
    await gsap.fromTo(this.trans.querySelector('.pp-trans__name'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4 });
    await this.wait(500, this.abort.signal);
    await gsap.to(this.trans, { clipPath: 'circle(0% at 50% 50%)', duration: motion.d(1), ease: 'power2.inOut' });
    this.trans.classList.remove('on');
  }
}
