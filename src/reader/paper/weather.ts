/** Cuaca & partikel di satu kanvas 2D — debu cahaya, daun, angin, kunang-kunang, hujan. Ringan: ≤ 70 partikel. */
import type { Weather } from './types';
import { perf } from '../../core/perf';

interface Pt { x: number; y: number; vx: number; vy: number; r: number; a: number; s: number; c: string; life: number; k: Weather }

export class WeatherFx {
  private ctx: CanvasRenderingContext2D;
  private pts: Pt[] = [];
  private kind: Weather = 'none';
  private raf = 0;
  private last = 0;
  private w = 0; private h = 0; private dpr = 1;
  private wind = 0;
  private glow: HTMLCanvasElement | null = null;
  paused = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    const tick = (t: number) => { this.raf = requestAnimationFrame(tick); if (!this.paused) this.step(Math.min(.05, (t - (this.last || t)) / 1000)); this.last = t; };
    this.raf = requestAnimationFrame(tick);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(perf.lite ? 1.25 : 1.5, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  set(kind: Weather) {
    if (kind === this.kind) return;
    this.kind = kind;
    const n = { none: 0, motes: perf.lite ? 24 : 40, leaves: perf.lite ? 10 : 14, goldLeaves: perf.lite ? 22 : 34, wind: perf.lite ? 18 : 26, fireflies: perf.lite ? 18 : 26, rain: perf.lite ? 45 : 70 }[kind];
    // pertahankan sebagian partikel lama agar peralihan lembut
    this.pts = this.pts.slice(0, Math.min(this.pts.length, n / 2)).map((p) => ({ ...p, life: Math.min(p.life, 1.5) }));
    while (this.pts.length < n) this.pts.push(this.spawn(true));
    this.wind = kind === 'wind' ? 1 : kind === 'goldLeaves' ? .35 : 0;
  }

  private spawn(anywhere = false): Pt {
    const k = this.kind, W = this.w, H = this.h;
    const rnd = Math.random;
    const base: Pt = { x: rnd() * W, y: anywhere ? rnd() * H : -20, vx: 0, vy: 0, r: 2, a: rnd() * Math.PI * 2, s: rnd() * 2 - 1, c: '#fff', life: 9e9, k };
    switch (k) {
      case 'motes': return { ...base, y: rnd() * H, vx: (rnd() - .5) * 6, vy: -3 - rnd() * 5, r: .8 + rnd() * 2, c: '255,244,200' };
      case 'leaves': return { ...base, vx: 8 + rnd() * 16, vy: 26 + rnd() * 22, r: 6 + rnd() * 5, c: rnd() > .5 ? '#9db872' : '#8fa66b' };
      case 'goldLeaves': return { ...base, vx: 12 + rnd() * 24, vy: 34 + rnd() * 30, r: 7 + rnd() * 6, c: rnd() > .3 ? '#e2b33c' : '#d9893a' };
      case 'wind': return { ...base, x: anywhere ? rnd() * W : -40, y: rnd() * H * .9, vx: 260 + rnd() * 200, vy: (rnd() - .5) * 30, r: rnd() > .6 ? 6 : 0, c: rnd() > .5 ? '#9db872' : '#e2b33c' };
      case 'fireflies': return { ...base, y: H * .25 + rnd() * H * .7, vx: (rnd() - .5) * 14, vy: (rnd() - .5) * 10, r: 1.6 + rnd() * 1.6, c: '255,236,140' };
      case 'rain': return { ...base, vx: -60, vy: 700 + rnd() * 300, r: 10 + rnd() * 10, c: '#7f93a8' };
      default: return base;
    }
  }

  private step(dt: number) {
    const c = this.ctx, W = this.w, H = this.h;
    c.clearRect(0, 0, W, H);
    if (!this.pts.length) return;
    const t = performance.now() / 1000;
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i];
      const k = p.k;
      p.life -= dt;
      p.a += dt * (1 + p.s);
      if (k === 'leaves' || k === 'goldLeaves') { p.x += (p.vx + Math.sin(p.a) * 30 + this.wind * 120) * dt; p.y += p.vy * dt; }
      else if (k === 'fireflies') { p.vx += (Math.random() - .5) * 20 * dt; p.vy += (Math.random() - .5) * 20 * dt; p.vx *= .99; p.vy *= .99; p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; }
      const out = p.y > H + 30 || p.x > W + 60 || p.x < -60 || p.y < -60 || p.life < 0;
      if (out) { this.pts[i] = this.spawn(this.kind === 'motes' || this.kind === 'fireflies'); continue; }
      switch (k) {
        case 'motes': { const al = .25 + .25 * Math.sin(t * 2 + p.a); c.fillStyle = `rgba(${p.c},${al})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); break; }
        case 'fireflies': {
          const al = .35 + .65 * Math.max(0, Math.sin(t * 2.4 + p.a * 3));
          const sp = this.glowSprite(), r = p.r * 7;
          c.globalAlpha = al;
          c.drawImage(sp, p.x - r, p.y - r, r * 2, r * 2);
          c.globalAlpha = 1;
          c.fillStyle = `rgba(255,250,210,${al})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); break;
        }
        case 'rain': c.strokeStyle = 'rgba(70,90,110,.45)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 3, p.y - p.r); c.stroke(); break;
        case 'wind':
          if (p.r) { this.leaf(p.x, p.y, p.r, p.a * 3, p.c); }
          else { c.strokeStyle = 'rgba(59,42,26,.28)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x - 40, p.y - 6, p.x - 90, p.y + 2); c.stroke(); }
          break;
        default: this.leaf(p.x, p.y, p.r, p.a, p.c);
      }
    }
  }

  /** Sprite glow dibuat sekali, bukan gradien baru tiap partikel tiap frame. */
  private glowSprite(): HTMLCanvasElement {
    if (this.glow) return this.glow;
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const g = s.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,236,140,1)'); grd.addColorStop(1, 'rgba(255,236,140,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    this.glow = s;
    return s;
  }

  /** Daun kecil bergaris tinta. */
  private leaf(x: number, y: number, r: number, rot: number, col: string) {
    const c = this.ctx;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, .55 + .45 * Math.abs(Math.sin(rot * 1.3)));
    c.fillStyle = col; c.strokeStyle = '#3b2a1a'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(-r * .2, -r * .9, r, 0); c.quadraticCurveTo(-r * .2, r * .9, -r, 0); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r * .8, 0); c.stroke();
    c.restore();
  }

  destroy() { cancelAnimationFrame(this.raf); this.pts = []; }
}
