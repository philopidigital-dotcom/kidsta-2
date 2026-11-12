/**
 * Audio: narator TTS (Web Speech API, Bahasa Indonesia) + efek suara & ambience
 * yang disintesis dengan Web Audio (tanpa file — gratis & bebas lisensi).
 * Semua bisa dimatikan; teks tetap terbaca ketika suara nonaktif.
 */

import { Music } from './music';

type Listener = (on: boolean) => void;

class AudioSystem {
  private on = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: { stop(): void } | null = null;
  private ambienceKind: string | null = null;
  private listeners = new Set<Listener>();
  private voice: SpeechSynthesisVoice | null = null;
  speaking: SpeechSynthesisUtterance | null = null;

  music = new Music(() => this.ctx, () => this.master);

  constructor() {
    if (this.ttsAvailable) {
      const choose = () => { this.voice = this.pickVoice(); };
      choose();
      speechSynthesis.addEventListener?.('voiceschanged', choose);
    }
  }

  get enabled() { return this.on; }
  get ttsAvailable() { return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; }
  get hasIndonesianVoice() { return !!this.voice && /^id|ind/i.test(this.voice.lang); }

  onChange(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  setEnabled(on: boolean) {
    this.on = on; if (this.clip) this.clip.volume = on ? 1 : 0;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? .9 : 0, this.ctx.currentTime, .15);
    if (!on) this.stopSpeech();
    this.listeners.forEach((l) => l(on));
  }

  /** Harus dipanggil dari gestur pengguna (klik) — kebijakan autoplay browser. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      // Buffer lebih besar → musik tidak "pecah" saat main thread sesekali tersendat.
      this.ctx = new AC({ latencyHint: 'playback' });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? .9 : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.music.kick();
  }

  /** Suara browser cadangan. Narator TERKUNCI suara perempuan (Gadis / Google Bahasa Indonesia / Damayanti). */
  private voiceMale: SpeechSynthesisVoice | null = null;
  private pickVoice(): SpeechSynthesisVoice | null {
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return null;
    const id = vs.filter((v) => /^id(-|_|$)/i.test(v.lang) || /indonesia/i.test(v.name));
    const female = /gadis|damayanti|female|wanita|perempuan|google bahasa indonesia/i, male = /ardi|andika|male|pria|laki/i;
    const fem = id.filter((v) => female.test(v.name) && !male.test(v.name));
    const pref = fem.find((v) => /natural|online|neural/i.test(v.name)) || fem[0] || id.find((v) => !male.test(v.name)) || id[0];
    this.voiceMale = id.find((v) => male.test(v.name) && /natural|online|neural/i.test(v.name)) || id.find((v) => male.test(v.name)) || null;
    return pref ?? null;
  }

  /* ---------------- Narator ---------------- */

  /**
   * Bicarakan teks. Resolve saat selesai (atau perkiraan durasi bila TTS gagal),
   * `onWord(charIndex)` dipanggil pada batas kata bila browser mendukung.
   */
  speak(text: string, opts: { onWord?: (charIndex: number) => void; onStart?: () => void; signal?: AbortSignal; pitch?: number; rate?: number; gender?: 'perempuan' | 'laki-laki' } = {}): Promise<'spoken' | 'silent'> {
    const estimate = estimateMs(text);
    return new Promise((resolve) => {
      let done = false;
      let guard: ReturnType<typeof setTimeout> | undefined;
      const finish = (how: 'spoken' | 'silent') => { if (done) return; done = true; clearTimeout(guard); this.music.duck(false); resolve(how); };
      this.music.duck(true);
      opts.signal?.addEventListener('abort', () => { this.stopSpeech(); finish('silent'); }, { once: true });

      if (!this.on || !this.ttsAvailable) {
        opts.onStart?.();
        guard = setTimeout(() => finish('silent'), estimate * 1.15 + 600);
        return;
      }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = opts.gender === 'laki-laki' && this.voiceMale ? this.voiceMale : this.voice;
        u.lang = v?.lang ?? 'id-ID';
        if (v) u.voice = v;
        u.rate = opts.rate ?? .9; u.pitch = opts.pitch ?? 1.12; u.volume = 1;
        u.onstart = () => opts.onStart?.();
        u.onboundary = (e) => { if (e.name === 'word' || e.name === undefined) opts.onWord?.(e.charIndex); };
        u.onend = () => finish('spoken');
        u.onerror = () => finish('silent');
        this.speaking = u;
        speechSynthesis.speak(u);
        // Pengaman: sebagian browser tidak memicu onend.
        guard = setTimeout(() => finish('silent'), estimate * 2 + 2500);
        // Bila TTS tak kunjung mulai, tetap mulai tampilan teks.
        setTimeout(() => { if (!speechSynthesis.speaking && !done) opts.onStart?.(); }, 700);
      } catch {
        opts.onStart?.();
        guard = setTimeout(() => finish('silent'), estimate);
      }
    });
  }

  /** Putar rekaman narasi yang sudah diunduh (mis. hasil Gemini TTS). onStart menerima durasi (ms). */
  private clip: HTMLAudioElement | null = null;
  private clipCut: (() => void) | null = null;
  private clipCache = new Map<string, HTMLAudioElement>();
  private speechPaused = false;
  private static readonly CLIP_CACHE_MAX = 24;
  /**
   * Putar satu rekaman narasi. Hanya SATU suara pada satu waktu: rekaman baru memotong yang lama.
   * 'spoken' = selesai diputar utuh · 'cut' = dipotong (lewati/diganti) · 'silent' = gagal dimuat.
   * onStart dipanggil tepat saat suara benar-benar terdengar → animasi & teks mengikuti suara.
   */
  playClip(url: string, opts: { onStart?: (ms: number) => void; signal?: AbortSignal } = {}): Promise<'spoken' | 'silent' | 'cut'> {
    this.clipCut?.();
    return new Promise((resolve) => {
      let done = false, started = false, tries = 0, waited = 0;
      let a = this.clipCache.get(url) ?? new Audio(url);
      a.preload = 'auto';
      try { a.currentTime = 0; } catch { /* belum dimuat */ }
      let dog: ReturnType<typeof setInterval> | undefined;
      const finish = (how: 'spoken' | 'silent' | 'cut') => {
        if (done) return; done = true; clearInterval(dog);
        this.music.duck(false); a.pause(); a.onended = a.onerror = a.onplaying = null;
        if (this.clip === a) { this.clip = null; this.clipCut = null; }
        resolve(how);
      };
      this.clipCut = () => finish('cut');
      if (opts.signal?.aborted) return finish('cut');
      opts.signal?.addEventListener('abort', () => finish('cut'), { once: true });
      const wire = () => {
        this.clip = a; a.volume = this.on ? 1 : 0;
        a.onended = () => finish('spoken');
        a.onplaying = () => { if (started) return; started = true; this.music.duck(true); opts.onStart?.((Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 3) * 1000); };
        a.onerror = () => {
          // jaringan tersendat → coba muat sekali lagi sebelum menyerah
          if (!started && tries++ < 1) { a.onended = a.onerror = a.onplaying = null; a = new Audio(url); a.preload = 'auto'; this.clipCache.set(url, a); wire(); a.play().catch(() => finish('silent')); }
          else finish('silent');
        };
      };
      wire();
      // pengaman: bila suara tak kunjung mulai (jaringan putus), jangan menggantung selamanya
      dog = setInterval(() => { if (started || this.speechPaused) return; waited += 500; if (waited >= 9000) finish('silent'); }, 500);
      a.play().catch(() => finish('silent'));
    });
  }
  /** Siapkan rekaman di memori agar langsung berbunyi saat dipanggil. */
  preloadClip(url: string) {
    if (this.clipCache.has(url)) return;
    const a = new Audio(); a.preload = 'auto'; a.src = url; a.load();
    this.clipCache.set(url, a);
    this.trimClips();
  }
  /** Batasi cache agar tidak bocor, tetapi klip tetap tersedia saat adegan diulang. */
  private trimClips() {
    if (this.clipCache.size <= AudioSystem.CLIP_CACHE_MAX) return;
    for (const [url, a] of this.clipCache) {
      if (this.clipCache.size <= AudioSystem.CLIP_CACHE_MAX) break;
      if (a === this.clip) continue;
      a.removeAttribute('src'); a.load();
      this.clipCache.delete(url);
    }
  }
  /** Pertahankan klip yang sudah diunduh; cukup buang yang melebihi batas cache. */
  clearClips() { this.trimClips(); }
  /** Selesai saat rekaman siap diputar tanpa tersendat (atau setelah batas waktu). */
  clipReady(url: string, maxMs = 4000): Promise<void> {
    const a = this.clipCache.get(url);
    return new Promise((res) => {
      if (!a || a.readyState >= 3) return res();
      const t = setTimeout(res, maxMs);
      a.addEventListener('canplaythrough', () => { clearTimeout(t); res(); }, { once: true });
      a.addEventListener('error', () => { clearTimeout(t); res(); }, { once: true });
    });
  }

  pauseSpeech() { this.speechPaused = true; this.clip?.pause(); if (this.ttsAvailable && speechSynthesis.speaking) speechSynthesis.pause(); }
  resumeSpeech() { this.speechPaused = false; this.clip?.play().catch(() => {}); if (this.ttsAvailable) speechSynthesis.resume(); }
  stopSpeech() { this.speechPaused = false; this.clipCut?.(); if (this.ttsAvailable) { this.speaking = null; speechSynthesis.cancel(); } }

  /* ---------------- Efek suara ---------------- */

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = .18, delay = 0, slideTo?: number) {
    const c = this.ctx; if (!c || !this.master) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + .05);
  }

  private noise(dur: number, from: number, to: number, gain = .12, delay = 0, q = .8) {
    const c = this.ctx; if (!c || !this.master) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + dur * .3); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f).connect(g).connect(this.master); src.start(t);
  }

  sfx(kind: 'select' | 'hover' | 'whoosh' | 'pageTurn' | 'open' | 'correct' | 'retry' | 'complete' | 'sparkle' | 'thud' | 'boing' | 'rustle' | 'gust' | 'thunder' | 'munch' | 'pop' | 'chime' | 'step' | 'chirp' | 'rooster' | 'gasp' | 'magic' | 'creak' | 'tap') {
    if (!this.on) return;
    this.unlock();
    switch (kind) {
      case 'hover': this.tone(1760, .25, 'sine', .035); break;
      case 'select': [1046, 1318, 1568].forEach((f, i) => this.tone(f, .6, 'sine', .08, i * .06)); break;
      case 'sparkle': [2093, 2637, 3136, 2637].forEach((f, i) => this.tone(f, .35, 'triangle', .045, i * .05)); break;
      case 'whoosh': this.noise(.7, 300, 2400, .16); break;
      case 'pageTurn': this.noise(.45, 2500, 700, .14, 0, 1.2); this.noise(.25, 900, 400, .08, .3); break;
      case 'open': this.noise(1.1, 200, 1600, .14); [523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 1.4, 'sine', .06, .25 + i * .09)); break;
      case 'correct': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .5, 'triangle', .1, i * .08)); break;
      case 'retry': this.tone(330, .3, 'sine', .1, 0, 260); this.tone(262, .35, 'sine', .08, .14, 220); break;
      case 'complete': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 1.1, 'triangle', .09, i * .12)); break;
      case 'thud': this.tone(90, .35, 'sine', .4, 0, 45); this.noise(.25, 400, 120, .2); break;
      case 'boing': this.tone(180, .5, 'sine', .18, 0, 520); break;
      case 'rustle': for (let i = 0; i < 4; i++) this.noise(.18, 3000, 1500, .07, i * .12, 2); break;
      case 'gust': this.noise(1.8, 250, 900, .14, 0, .5); break;
      case 'thunder': this.noise(2.4, 160, 40, .35, 0, .4); this.tone(55, 1.6, 'sine', .2, .05, 35); break;
      case 'munch': for (let i = 0; i < 4; i++) this.noise(.08, 1400, 800, .12, i * .18, 3); break;
      case 'pop': this.tone(700, .12, 'sine', .14, 0, 1100); break;
      case 'chime': [1318, 1760, 2093].forEach((f, i) => this.tone(f, 1.6, 'sine', .07, i * .1)); break;
      case 'step': for (let i = 0; i < 3; i++) this.noise(.12, 500, 200, .1, i * .55, 1.5); break;
      case 'chirp': { const b = 2600; for (let i = 0; i < 3; i++) this.tone(b, .08, 'sine', .05, i * .1, b * 1.35); break; }
      case 'rooster': this.tone(520, .25, 'sawtooth', .07, 0, 700); this.tone(700, .3, 'sawtooth', .07, .25, 760); this.tone(760, .7, 'sawtooth', .06, .55, 520); break;
      case 'gasp': this.noise(.3, 1800, 3200, .08, 0, 1.2); break;
      case 'magic': [1568, 2093, 2637, 3136, 2637, 3520].forEach((f, i) => this.tone(f, .9, 'sine', .045, i * .07)); this.noise(1.2, 3000, 6000, .03, .1, 4); break;
      case 'creak': this.tone(180, .7, 'sawtooth', .04, 0, 120); break;
      case 'tap': this.tone(880, .15, 'triangle', .12, 0, 1320); break;
    }
  }

  /* ---------------- Ambience ---------------- */

  setAmbience(kind: 'forest' | 'hutan' | 'malam' | 'angin' | 'hujan' | 'none') {
    if (kind === 'forest') kind = 'hutan';
    if (kind === this.ambienceKind) return;
    this.ambience?.stop(); this.ambience = null; this.ambienceKind = kind;
    if (kind === 'none') return;
    this.unlock();
    const c = this.ctx; if (!c || !this.master) return;
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0); let last = 0;
    const white = kind === 'hujan';
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = white ? w * .5 : last * 3.2; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = kind === 'hujan' ? 'bandpass' : 'lowpass';
    f.frequency.value = kind === 'angin' ? 500 : kind === 'hujan' ? 2400 : kind === 'malam' ? 500 : 900;
    const g = c.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(kind === 'angin' ? .16 : kind === 'hujan' ? .12 : kind === 'malam' ? .04 : .09, c.currentTime + 2.5);
    src.connect(f).connect(g).connect(this.master); src.start();
    let lfo: OscillatorNode | null = null;
    if (kind === 'angin') { lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = .15; lg.gain.value = 320; lfo.connect(lg).connect(f.frequency); lfo.start(); }
    let alive = true;
    const loop = () => {
      if (!alive) return;
      if (this.on) {
        if (kind === 'hutan') { const base = 2200 + Math.random() * 1600; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this.tone(base, .09, 'sine', .028, i * .11, base * (1.25 + Math.random() * .3)); }
        if (kind === 'malam') { for (let i = 0; i < 6; i++) this.tone(4300 + Math.random() * 200, .035, 'square', .006, i * .07); }
      }
      setTimeout(loop, kind === 'malam' ? 600 + Math.random() * 900 : 2500 + Math.random() * 5000);
    };
    if (kind === 'hutan' || kind === 'malam') setTimeout(loop, 1200);
    this.ambience = { stop: () => { alive = false; g.gain.setTargetAtTime(0, c.currentTime, .5); setTimeout(() => { src.stop(); lfo?.stop(); }, 1800); } };
  }
}

/** Perkiraan durasi baca (ms) — dipakai saat suara mati / TTS tidak tersedia. */
export function estimateMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1800, words * 360 + 900);
}

export const audio = new AudioSystem();
