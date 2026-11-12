/**
 * Musik latar orisinal yang digubah secara prosedural dengan Web Audio
 * (tanpa file — bebas hak cipta, gratis). Penjadwal lookahead menjaga ketukan stabil.
 *
 *  - library   : celesta/kotak musik melamun + pad hangat (D mayor, ±68 bpm)
 *  - forest    : marimba ceria + seruling + bas lembut (G mayor, ±96 bpm)
 *  - celebrate : arpeggio kotak musik cerah + lonceng (C mayor, ±112 bpm)
 * Volume otomatis turun (ducking) saat narator berbicara.
 */

import { perf } from './perf';

export type Theme = 'library' | 'forest' | 'celebrate' | 'none'
  | 'tenang' | 'ceria' | 'lucu' | 'penasaran' | 'cemas' | 'sedih' | 'haru' | 'berani' | 'misteri' | 'tegang' | 'malam' | 'gembira';
type Voice = 'celesta' | 'marimba' | 'musicbox' | 'flute' | 'bell' | 'pluck' | 'piano';

const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n: string) => { const m = /^([A-G][#b]?)(\d)$/.exec(n); if (!m) return 440; return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };

interface ThemeDef {
  bpm: number;
  chords: string[][];            // per birama (4 ketuk)
  bass: string[];                 // nada bas per birama
  arp: (bar: number, step: number, chord: string[]) => string | null;   // per 1/8
  lead?: (bar: number, step: number) => string | null;                 // per 1/8
  arpVoice: Voice;
  leadVoice?: Voice;
  pad: boolean;
  /** langkah 1/8 tempat bas dibunyikan & panjangnya (ketuk) */
  bassSteps?: number[]; bassLen?: number;
  perc?: { kind: 'shaker' | 'drum' | 'tick' | 'heart'; steps: number[] };
  swing?: number; vol?: number; arpVol?: number; leadVol?: number; padDark?: boolean;
}

const LIB: ThemeDef = {
  bpm: 68, arpVoice: 'celesta', pad: true, bassSteps: [0], bassLen: 3.5, arpVol: .32,
  chords: [['D4', 'F#4', 'A4'], ['B3', 'D4', 'F#4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4']],
  bass: ['D2', 'B1', 'G1', 'A1'],
  arp: (bar, s, ch) => { const up = [ch[0], ch[1], ch[2], ch[1].replace(/\d/, (d) => String(+d + 1)), ch[2], ch[1], ch[0], ch[2].replace(/\d/, (d) => String(+d + 1))]; return bar % 2 && s === 7 ? null : up[s]; },
  lead: (bar, s) => { const mel = [['A5', null, 'F#5', null, 'E5', null, 'D5', null], ['F#5', null, null, 'E5', 'D5', null, 'B4', null], ['D5', null, 'E5', null, 'G5', null, 'F#5', null], ['E5', null, null, null, 'C#5', null, null, null]]; return bar % 8 < 4 ? null : mel[bar % 4][s]; },
  leadVoice: 'bell',
};

const FOREST: ThemeDef = {
  bpm: 96, arpVoice: 'marimba', pad: true, bassSteps: [0, 4], bassLen: 1, perc: { kind: 'shaker', steps: [2, 6] }, swing: .02,
  chords: [['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4']],
  bass: ['G2', 'E2', 'C2', 'D2'],
  arp: (_b, s, ch) => [ch[0], ch[2], ch[1], ch[2], ch[0], ch[2], ch[1], ch[2]][s],
  lead: (bar, s) => {
    const mel = [['D5', null, 'B4', 'D5', 'E5', null, 'D5', null], ['B4', null, 'G4', null, 'A4', 'B4', null, null], ['C5', null, 'E5', null, 'G5', null, 'E5', 'D5'], ['C5', null, 'B4', null, 'A4', null, null, null]];
    return bar % 8 >= 4 || bar % 2 === 0 ? mel[bar % 4][s] : null;
  },
  leadVoice: 'flute',
};

const CELEB: ThemeDef = {
  bpm: 112, arpVoice: 'musicbox', pad: true, bassSteps: [0], bassLen: 3.5,
  chords: [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['A3', 'C4', 'E4'], ['G3', 'B3', 'D4']],
  bass: ['C2', 'F2', 'A1', 'G1'],
  arp: (_b, s, ch) => [ch[0], ch[1], ch[2], 'C6', ch[2], ch[1], ch[2], 'G5'][s],
  lead: (bar, s) => [['E5', 'G5', 'C6', null, 'G5', null, 'E5', null], ['F5', 'A5', 'C6', null, 'A5', null, 'F5', null], ['E5', null, 'C5', null, 'E5', 'G5', 'A5', null], ['G5', null, 'B5', null, 'D6', null, null, null]][bar % 4][s],
  leadVoice: 'bell',
};


const M = (pattern: (string | null)[][]) => (bar: number, s: number) => pattern[bar % pattern.length][s];
const LUCU: ThemeDef = {
  bpm: 122, arpVoice: 'pluck', pad: false, bassSteps: [0, 2, 4, 6], bassLen: .22, perc: { kind: 'tick', steps: [3, 7] }, arpVol: .3,
  chords: [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4']], bass: ['C2', 'F2', 'G1', 'C2'],
  arp: (_b, s, ch) => [ch[0], null, ch[2], ch[1], null, ch[2], ch[0], null][s],
  lead: M([['G5', null, 'E5', null, 'G5', 'A5', 'G5', null], ['A5', null, 'F5', null, 'C6', null, null, null], ['B5', 'A5', 'G5', null, 'D5', null, 'G5', null], ['C6', null, 'G5', null, 'C5', null, null, null]]), leadVoice: 'pluck', leadVol: .22,
};
const PENASARAN: ThemeDef = {
  bpm: 76, arpVoice: 'celesta', pad: true, bassSteps: [0], bassLen: 3.8, arpVol: .24,
  chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['D4', 'F4', 'A4'], ['E4', 'G#4', 'B4']], bass: ['A1', 'F1', 'D2', 'E2'],
  arp: (bar, s, ch) => (s % 2 ? null : [ch[0], ch[1], ch[2], ch[1].replace(/\d/, (d) => String(+d + 1))][(s / 2 + bar) % 4]),
  lead: M([[null, null, null, null, 'E5', null, null, null], [null, null, 'C5', null, null, null, null, null], [null, null, null, null, 'F5', null, 'E5', null], ['G#5', null, null, null, null, null, null, null]]), leadVoice: 'bell', leadVol: .16,
};
const CEMAS: ThemeDef = {
  bpm: 84, arpVoice: 'celesta', pad: true, padDark: true, bassSteps: [0, 2, 4, 6], bassLen: .3, perc: { kind: 'heart', steps: [0] }, arpVol: .16, vol: .9,
  chords: [['D4', 'F4', 'A4'], ['Bb3', 'D4', 'F4'], ['G3', 'Bb3', 'D4'], ['A3', 'C#4', 'E4']], bass: ['D2', 'Bb1', 'G1', 'A1'],
  arp: (bar, s, ch) => (s === 3 || s === 7 ? (bar % 2 ? ch[2] : ch[1]) : null),
};
const SEDIH: ThemeDef = {
  bpm: 60, arpVoice: 'piano', pad: true, bassSteps: [0], bassLen: 3.8, arpVol: .22,
  chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['E3', 'G#3', 'B3']], bass: ['A1', 'F1', 'C2', 'E1'],
  arp: (_b, s, ch) => (s % 2 ? null : [ch[0], ch[1], ch[2], ch[1]][s / 2]),
  lead: M([['E5', null, null, null, 'D5', null, 'C5', null], ['C5', null, null, null, 'B4', null, 'A4', null], ['G4', null, null, 'A4', 'B4', null, 'C5', null], ['B4', null, null, null, null, null, null, null]]), leadVoice: 'piano', leadVol: .2,
};
const HARU: ThemeDef = {
  bpm: 64, arpVoice: 'piano', pad: true, bassSteps: [0], bassLen: 3.8, arpVol: .2,
  chords: [['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['D4', 'F4', 'A4'], ['Bb3', 'D4', 'F4']], bass: ['F1', 'E2', 'D2', 'Bb1'],
  arp: (_b, s, ch) => [ch[0], null, ch[1], null, ch[2], null, ch[1], null][s],
  lead: M([['C5', null, null, null, 'A4', null, 'C5', null], ['G5', null, null, null, null, null, 'E5', null], ['F5', null, 'E5', null, 'D5', null, null, null], ['F5', null, null, null, null, null, null, null]]), leadVoice: 'flute', leadVol: .2,
};
const BERANI: ThemeDef = {
  bpm: 104, arpVoice: 'marimba', pad: true, bassSteps: [0, 3, 4], bassLen: .5, perc: { kind: 'drum', steps: [0, 3, 4, 6] }, arpVol: .22,
  chords: [['D4', 'F#4', 'A4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4'], ['D4', 'F#4', 'A4']], bass: ['D2', 'G1', 'A1', 'D2'],
  arp: (_b, s, ch) => [ch[0], ch[1], ch[2], ch[1], ch[0], ch[1], ch[2], ch[1]][s],
  lead: M([['A4', null, 'D5', null, 'F#5', null, 'E5', 'D5'], ['B4', null, 'D5', null, 'G5', null, null, null], ['A5', null, 'G5', 'F#5', 'E5', null, 'C#5', null], ['D5', null, 'A4', null, 'D5', null, null, null]]), leadVoice: 'flute', leadVol: .24,
};
const MISTERI: ThemeDef = {
  bpm: 58, arpVoice: 'musicbox', pad: true, padDark: true, bassSteps: [0], bassLen: 3.9, arpVol: .18, vol: .9,
  chords: [['E4', 'G4', 'B4'], ['C4', 'E4', 'B4'], ['A3', 'C4', 'E4'], ['B3', 'D#4', 'F#4']], bass: ['E1', 'C2', 'A1', 'B1'],
  arp: (bar, s, ch) => ([[0, 5], [3], [1, 6], [4]][bar % 4].includes(s) ? ch[(s + bar) % 3].replace(/\d/, (d) => String(+d + 1)) : null),
};
const TEGANG: ThemeDef = {
  bpm: 132, arpVoice: 'pluck', pad: true, padDark: true, bassSteps: [0, 2, 4, 6], bassLen: .2, perc: { kind: 'tick', steps: [1, 3, 5, 7] }, arpVol: .22,
  chords: [['C4', 'Eb4', 'G4'], ['Ab3', 'C4', 'Eb4'], ['Bb3', 'D4', 'F4'], ['G3', 'B3', 'D4']], bass: ['C2', 'Ab1', 'Bb1', 'G1'],
  arp: (_b, s, ch) => [ch[0], ch[0], ch[1], ch[0], ch[2], ch[0], ch[1], ch[0]][s],
};
const MALAM: ThemeDef = {
  bpm: 56, arpVoice: 'musicbox', pad: true, arpVol: .15, vol: .8,
  chords: [['G4', 'B4', 'D5'], ['E4', 'G4', 'B4'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4']], bass: ['G1', 'E1', 'C2', 'D2'],
  arp: (bar, s, ch) => ([0, 3, 5].includes(s) ? ch[(s + bar) % 3] : null),
};

const THEMES: Record<Exclude<Theme, 'none'>, ThemeDef> = { library: LIB, forest: FOREST, celebrate: CELEB,
  tenang: LIB, ceria: FOREST, gembira: CELEB, lucu: LUCU, penasaran: PENASARAN, cemas: CEMAS, sedih: SEDIH, haru: HARU, berani: BERANI, misteri: MISTERI, tegang: TEGANG, malam: MALAM };

export class Music {
  private bus: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private current: Theme = 'none';
  private themeGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickFn: (() => void) | null = null;
  private nextTime = 0;
  private step = 0;
  private padNodes: { stop(t: number): void }[] = [];
  private shakerBuf: AudioBuffer | null = null;
  /** Lookahead panjang: tahan jeda main thread tanpa nada hilang. */
  private static readonly LOOKAHEAD = 1;
  private static readonly TICK_MS = 100;
  private static readonly MAX_STEPS = 64;

  constructor(private getCtx: () => AudioContext | null, private getDest: () => AudioNode | null) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopTimer();
        else this.resumeTimer();
      });
    }
  }

  private stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private resumeTimer() {
    const c = this.getCtx();
    if (!c || !this.tickFn || this.timer || this.current === 'none') return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    this.nextTime = c.currentTime + .1;
    this.tickFn();
    this.timer = setInterval(this.tickFn, Music.TICK_MS);
  }

  private ensure() {
    const c = this.getCtx(); const dest = this.getDest();
    if (!c || !dest) return null;
    if (!this.bus) {
      this.bus = c.createGain(); this.bus.gain.value = .55;
      this.duckGain = c.createGain(); this.duckGain.gain.value = 1;
      this.reverb = c.createConvolver(); this.reverb.buffer = this.impulse(c, perf.lite ? 1.2 : 2.4);
      this.wet = c.createGain(); this.wet.gain.value = perf.lite ? .16 : .3;
      this.bus.connect(this.duckGain).connect(dest);
      this.bus.connect(this.reverb); this.reverb.connect(this.wet).connect(this.duckGain);
    }
    return c;
  }

  private impulse(c: AudioContext, sec: number) {
    const len = c.sampleRate * sec, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    return b;
  }

  /** Turunkan volume saat narator bicara. */
  duck(on: boolean) {
    const c = this.getCtx(); if (!c || !this.duckGain) return;
    this.duckGain.gain.setTargetAtTime(on ? .38 : 1, c.currentTime, on ? .12 : .6);
  }

  private wanted: Theme = 'none';
  /** Mulai tema yang diminta setelah AudioContext dibuka oleh gestur pengguna. */
  kick() { const w = this.wanted; this.wanted = 'none'; if (w !== 'none') { this.current = 'none'; this.play(w); } }

  play(theme: Theme) {
    if (theme === this.current) return;
    const c = this.ensure();
    if (!c) { this.wanted = theme; return; }
    this.current = theme;
    const old = this.themeGain, oldPads = this.padNodes;
    this.stopTimer();
    if (c && old) { old.gain.setTargetAtTime(0, c.currentTime, .6); oldPads.forEach((p) => p.stop(c.currentTime + 3)); setTimeout(() => old.disconnect(), 4000); }
    this.padNodes = [];
    if (!c || theme === 'none') { this.themeGain = null; this.tickFn = null; return; }
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(THEMES[theme].vol ?? 1, c.currentTime + .2, 1.2);
    g.connect(this.bus!);
    this.themeGain = g;
    this.nextTime = c.currentTime + .15; this.step = 0;
    const def = THEMES[theme];
    const tick = () => {
      const ctx = this.getCtx(); if (!ctx || this.themeGain !== g) return;
      // Bila main thread sempat tersendat, lompat ke depan alih-alih
      // menjadwalkan ratusan nada tertinggal sekaligus (penyebab suara "pecah").
      if (this.nextTime < ctx.currentTime - .05) this.nextTime = ctx.currentTime + .05;
      const eighth = 60 / def.bpm / 2;
      let guard = 0;
      while (this.nextTime < ctx.currentTime + Music.LOOKAHEAD && guard++ < Music.MAX_STEPS) {
        this.schedule(def, this.step, this.nextTime, g);
        this.nextTime += eighth;
        this.step++;
      }
    };
    this.tickFn = tick;
    if (typeof document === 'undefined' || !document.hidden) {
      tick();
      this.timer = setInterval(tick, Music.TICK_MS);
    }
  }

  private schedule(def: ThemeDef, step: number, t: number, out: GainNode) {
    const bar = Math.floor(step / 8), s = step % 8;
    const ci = bar % def.chords.length, chord = def.chords[ci];
    const swing = def.swing && s % 2 ? def.swing : 0;
    const beat = 60 / def.bpm;
    if (s === 0 && def.pad) this.pad(chord, t, beat * 4, out, def.padDark);
    if ((def.bassSteps ?? [0]).includes(s)) this.bass(def.bass[ci], t, beat * (def.bassLen ?? 3.5), out);
    const a = def.arp(bar, s, chord);
    if (a) this.voice(def.arpVoice, hz(a), t + swing, def.arpVol ?? .26, out);
    const l = def.lead?.(bar, s);
    if (l && def.leadVoice) this.voice(def.leadVoice, hz(l), t + swing, def.leadVol ?? (def.leadVoice === 'flute' ? .2 : .22), out, def.leadVoice === 'flute' ? beat * .9 : 1.8);
    if (def.perc?.steps.includes(s)) this.perc(def.perc.kind, t, out);
  }

  private perc(kind: 'shaker' | 'drum' | 'tick' | 'heart', t: number, out: AudioNode) {
    const c = this.getCtx()!;
    if (kind === 'shaker') return this.shaker(t, out);
    const thump = (at: number, f0: number, f1: number, vol: number, dec: number) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dec);
      g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(.0001, at + dec);
      o.connect(g).connect(out); o.start(at); o.stop(at + dec + .05);
    };
    if (kind === 'drum') { thump(t, 140, 60, .32, .22); this.shaker(t, out); }
    else if (kind === 'heart') { thump(t, 70, 40, .38, .2); thump(t + .22, 66, 40, .26, .2); }
    else { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 1800; g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .04); o.connect(g).connect(out); o.start(t); o.stop(t + .05); }
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
  }

  private voice(kind: Voice, f: number, t: number, vol: number, out: AudioNode, len = 1.4) {
    const c = this.getCtx()!;
    const g = c.createGain(); g.connect(out);
    const mk = (type: OscillatorType, freq: number, gain: number, dec: number, detune = 0) => {
      const o = c.createOscillator(); const og = c.createGain();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      og.gain.value = gain; o.connect(og).connect(g); o.start(t); o.stop(t + dec + .1);
      return o;
    };
    switch (kind) {
      case 'celesta': mk('sine', f, 1, 1.8); mk('sine', f * 2, .35, .9, 3); mk('triangle', f * 4.01, .08, .3); this.env(g, t, vol, .006, 1.8); break;
      case 'musicbox': mk('sine', f, 1, 1.2); mk('sine', f * 3, .25, .5); mk('sine', f * 5.98, .1, .2); this.env(g, t, vol, .003, 1.2); break;
      case 'bell': mk('sine', f, 1, len); mk('sine', f * 2.76, .3, len * .6); mk('sine', f * 5.4, .1, len * .3); this.env(g, t, vol * .7, .004, len); break;
      case 'marimba': mk('sine', f, 1, .5); mk('sine', f * 4, .22, .12); mk('triangle', f * 10, .05, .04); this.env(g, t, vol, .004, .5); break;
      case 'pluck': mk('triangle', f, 1, .28); mk('sine', f * 2, .3, .12); this.env(g, t, vol, .003, .28); break;
      case 'piano': mk('sine', f, 1, 2.2); mk('triangle', f * 2, .22, 1.1, 2); mk('sine', f * 3, .08, .5); this.env(g, t, vol, .004, 2.2); break;
      case 'flute': {
        const o = mk('triangle', f, .8, len + .2); mk('sine', f * 2, .2, len + .2);
        const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 5.2; lg.gain.value = f * .006;
        lfo.connect(lg).connect(o.frequency); lfo.start(t + .15); lfo.stop(t + len + .3);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
        g.disconnect(); g.connect(lp).connect(out);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .08); g.gain.setValueAtTime(vol * .85, t + len * .7); g.gain.exponentialRampToValueAtTime(.0001, t + len + .2);
        break;
      }
    }
  }

  private pad(chord: string[], t: number, dur: number, out: AudioNode, dark = false) {
    const c = this.getCtx()!;
    const g = c.createGain(); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = dark ? 520 : 900; lp.Q.value = .3;
    g.connect(lp).connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + dur * .35); g.gain.linearRampToValueAtTime(.035, t + dur * .8); g.gain.linearRampToValueAtTime(0, t + dur + .8);
    const oscs: OscillatorNode[] = [];
    const detunes = perf.lite ? [0] : [-7, 7];
    for (const n of chord) for (const d of detunes) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n) / 2; o.detune.value = d; o.connect(g); o.start(t); o.stop(t + dur + 1); oscs.push(o); }
    this.padNodes.push({ stop: (when) => oscs.forEach((o) => { try { o.stop(when); } catch { /* sudah berhenti */ } }) });
    if (this.padNodes.length > 6) this.padNodes.splice(0, this.padNodes.length - 6);
  }

  private bass(n: string, t: number, dur: number, out: AudioNode) {
    const c = this.getCtx()!;
    const o = c.createOscillator(); const g = c.createGain(); const lp = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = hz(n); lp.type = 'lowpass'; lp.frequency.value = 420;
    o.connect(lp).connect(g).connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.start(t); o.stop(t + dur + .05);
  }

  private shaker(t: number, out: AudioNode) {
    const c = this.getCtx()!;
    if (!this.shakerBuf) {
      const len = Math.floor(c.sampleRate * .06), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      this.shakerBuf = b;
    }
    const s = c.createBufferSource(); s.buffer = this.shakerBuf; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
    const g = c.createGain(); g.gain.value = .05; s.connect(hp).connect(g).connect(out); s.start(t);
  }
}
