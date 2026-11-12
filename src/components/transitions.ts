/**
 * Sutradara transisi sinematik.
 *  - portalOut(): debu emas berpusar masuk ke titik pilihan, kamera menyelam ke
 *    titik itu (zoom + blur + cahaya), layar tertutup cahaya hangat.
 *  - portalIn(): ruangan baru muncul dari balik cahaya; kamera mundur pelan,
 *    debu emas memancar keluar lalu memudar.
 * Partikel digambar di <canvas> (GPU-friendly), tanpa aset tambahan.
 */
import { gsap } from 'gsap';
import { motion } from '../core/motion';
import { perf } from '../core/perf';
import type { World } from './world';

interface P { x: number; y: number; a: number; r: number; v: number; s: number; hue: number; life: number }

export class Transitions {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private bloom: HTMLElement;
  private parts: P[] = [];
  private ox = 0; private oy = 0;
  private raf = 0;
  private t0 = 0;
  private sprite: HTMLCanvasElement | null = null;

  constructor(host: HTMLElement, private world: World, private stage: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.bloom = document.createElement('div');
    this.bloom.className = 'fx-bloom';
    host.append(this.canvas, this.bloom);
    const resize = () => { const d = Math.min(devicePixelRatio || 1, perf.lite ? 1.25 : 2); this.canvas.width = innerWidth * d; this.canvas.height = innerHeight * d; this.ctx?.setTransform(d, 0, 0, d, 0, 0); };
    resize(); addEventListener('resize', resize);
  }

  private origin(el?: Element | null, fallback: [number, number] = [innerWidth / 2, innerHeight / 2]): [number, number] {
    if (!el) return fallback;
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  /**
   * Dolly-in dengan kedalaman: panggung (objek di depan) maju lebih cepat
   * daripada latar (jauh) sehingga terasa ada ruang; objek pilihan membesar
   * memenuhi layar lalu larut ke cahaya hangat.
   */
  async portalOut(target?: Element | null, opts: { color?: string; dur?: number } = {}) {
    const [x, y] = this.origin(target);
    this.ox = x; this.oy = y;
    if (motion.reduced) { gsap.set(this.bloom, { opacity: 1, '--bx': `${x}px`, '--by': `${y}px` }); return; }
    const dur = opts.dur ?? 1.1;
    const ox = `${(x / innerWidth) * 100}%`, oy = `${(y / innerHeight) * 100}%`;
    gsap.set(this.bloom, { '--bx': `${x}px`, '--by': `${y}px`, '--bc': opts.color ?? '255, 205, 130' });
    gsap.set([this.world.root, this.stage], { transformOrigin: `${ox} ${oy}` });
    this.spawn(26, 'fly');
    await gsap.timeline()
      .to(this.stage, { scale: 3.2, duration: dur, ease: 'power3.in' }, 0)
      .to(this.world.root, { scale: 1.5, duration: dur, ease: 'power3.in' }, 0)
      .to(this.stage, { opacity: 0, duration: dur * .35, ease: 'power1.in' }, dur * .65)
      .fromTo(this.bloom, { opacity: 0, '--br': '8vmax' }, { opacity: .92, '--br': '120vmax', duration: dur * .7, ease: 'power2.in' }, dur * .3);
  }

  /** Tiba: kamera mundur lembut dari kedekatan, cahaya larut, ruangan baru terang. */
  async portalIn(opts: { dur?: number } = {}) {
    const wl = this.world.root;
    gsap.set(this.stage, { clearProps: 'transform,opacity' });
    if (motion.reduced) { gsap.set(wl, { scale: 1 }); gsap.set(this.bloom, { opacity: 0 }); return; }
    const dur = opts.dur ?? 1.4;
    this.ox = innerWidth / 2; this.oy = innerHeight / 2;
    gsap.set(wl, { transformOrigin: '50% 50%' });
    this.spawn(18, 'drift');
    await gsap.timeline()
      .fromTo(wl, { scale: 1.16 }, { scale: 1, duration: dur, ease: 'power3.out' }, 0)
      .fromTo(this.stage, { scale: 1.06 }, { scale: 1, duration: dur, ease: 'power3.out', clearProps: 'transform' }, 0)
      .to(this.bloom, { opacity: 0, '--br': '170vmax', duration: dur * .75, ease: 'power2.out' }, 0);
  }

  /** Kilau mekar (tanpa zoom) — untuk buku terbuka / selesai. */
  async flash(target?: Element | null, peak = 1, dur = .7, color = '255, 226, 160') {
    const [x, y] = this.origin(target);
    gsap.set(this.bloom, { '--bx': `${x}px`, '--by': `${y}px`, '--bc': color });
    this.ox = x; this.oy = y; this.spawn(20, 'drift');
    await gsap.timeline()
      .fromTo(this.bloom, { opacity: 0, '--br': '10vmax' }, { opacity: peak, '--br': '90vmax', duration: motion.d(dur * .45), ease: 'power2.out' })
      .to(this.bloom, { opacity: 0, duration: motion.d(dur * .8), ease: 'power2.inOut' });
  }

  burst(target?: Element | null, n = 24) {
    const [x, y] = this.origin(target);
    this.ox = x; this.oy = y; this.spawn(n, 'drift');
  }

  /* ---------------- partikel: bokeh debu cahaya ---------------- */
  private kind: 'fly' | 'drift' = 'drift';

  private spawn(n: number, kind: 'fly' | 'drift') {
    if (!this.ctx || motion.reduced) return;
    this.kind = kind;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.parts.push({
        x: Math.cos(a) * (20 + Math.random() * 160), y: Math.sin(a) * (20 + Math.random() * 120),
        a, r: 0, v: kind === 'fly' ? .6 + Math.random() * .9 : .1 + Math.random() * .25,
        s: kind === 'fly' ? 2 + Math.random() * 5 : 1.5 + Math.random() * 3.5, hue: Math.random(), life: kind === 'fly' ? 1 : .9,
      });
    }
    this.t0 = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private glowSprite(): HTMLCanvasElement {
    if (this.sprite) return this.sprite;
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const g = s.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,226,170,1)');
    grd.addColorStop(.45, 'rgba(255,200,120,.35)');
    grd.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    this.sprite = s;
    return s;
  }

  private tick = (now: number) => {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const dt = Math.min(40, now - (this.t0 || now)); this.t0 = now;
    ctx.globalCompositeOperation = 'lighter';
    const sprite = this.glowSprite();
    for (const p of this.parts) {
      if (this.kind === 'fly') {
        // terbang melewati kamera: menjauh dari pusat, membesar, lalu hilang
        const k = 1 + .0026 * dt * p.v * (1 + p.r);
        p.x *= k; p.y *= k; p.r += .0012 * dt; p.s *= 1 + .0016 * dt; p.life -= .0009 * dt;
      } else {
        p.x += Math.cos(p.a) * p.v * dt * .06; p.y += (Math.sin(p.a) * p.v - .35) * dt * .06; p.life -= .00045 * dt;
      }
      const x = this.ox + p.x, y = this.oy + p.y, al = Math.max(0, Math.min(1, p.life)) * .55, rad = p.s * 4;
      ctx.globalAlpha = al;
      ctx.drawImage(sprite, x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.parts = this.parts.filter((p) => p.life > .02 && Math.abs(p.x) < innerWidth * 1.2 && Math.abs(p.y) < innerHeight * 1.2);
    this.raf = this.parts.length ? requestAnimationFrame(this.tick) : 0;
    if (!this.raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
}
