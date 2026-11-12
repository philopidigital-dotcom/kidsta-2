/**
 * Dunia persisten (perpustakaan sihir) yang tetap ada dari landing hingga
 * chapter selesai — menjaga satu dunia visual yang konsisten.
 */
import { gsap } from 'gsap';
import { BACKDROPS, type BackdropName } from './backdrops';
import { motion } from '../core/motion';
import { perf } from '../core/perf';

export interface World {
  root: HTMLElement;
  layer: HTMLElement;
  flash: HTMLElement;
  dim(amount: number, dur?: number): gsap.core.Tween;
  push(scale: number, dur?: number): gsap.core.Tween;
  /** Ganti latar lukisan dengan crossfade + gerak kamera pelan. */
  setBackdrop(name: BackdropName, dur?: number): Promise<void>;
}

export function createWorld(host: HTMLElement): World {
  const root = document.createElement('div');
  root.className = 'world';
  root.innerHTML = `<div class="world__layer"><div class="bd-stack"></div></div>
    <canvas class="world__motes" aria-hidden="true"></canvas>
    <div class="world__vignette"></div><div class="world__dim"></div>`;
  host.appendChild(root);
  const flash = document.createElement('div');
  flash.className = 'world__flash';
  host.appendChild(flash);

  const layer = root.querySelector<HTMLElement>('.world__layer')!;
  const dimEl = root.querySelector<HTMLElement>('.world__dim')!;

  // Paralaks halus mengikuti kursor
  if (!motion.reduced) {
    const qx = gsap.quickTo(layer, 'x', { duration: 1.6, ease: 'power3.out' });
    const qy = gsap.quickTo(layer, 'y', { duration: 1.6, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      qx((e.clientX / innerWidth - .5) * -22);
      qy((e.clientY / innerHeight - .5) * -14);
    }, { passive: true });
  }

  startMotes(root.querySelector('canvas')!);

  const stack = root.querySelector<HTMLElement>('.bd-stack')!;
  let current: { name: BackdropName; el: HTMLElement; kb?: gsap.core.Tween } | null = null;
  const cache = new Map<string, Promise<void>>();
  const preload = (src: string) => {
    if (!cache.has(src)) cache.set(src, new Promise<void>((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = src; }));
    return cache.get(src)!;
  };
  Object.values(BACKDROPS).forEach((b) => preload(b.src));

  const setBackdrop = async (name: BackdropName, dur = 1.1) => {
    if (current?.name === name) return;
    const b = BACKDROPS[name];
    await preload(b.src);
    const el = document.createElement('div');
    el.className = 'bd';
    el.innerHTML = `<div class="bd__img" style="background-image:url('${b.src}');background-position:${(b.focus ?? [50, 50]).map((v) => v + '%').join(' ')};${b.blur ? `filter:blur(${b.blur}px);` : ''}"></div>
      <div class="bd__glows">${b.glows.map((g, i) => `<span class="glow glow--${g.kind ?? 'lamp'}" style="left:${g.x}%;top:${g.y}%;--r:${g.r}vw;animation-delay:${(-i * .7).toFixed(1)}s"></span>`).join('')}</div>
      ${b.dim ? `<div class="bd__dim" style="opacity:${b.dim}"></div>` : ''}`;
    stack.appendChild(el);
    const prev = current;
    const kb = motion.reduced ? undefined : gsap.fromTo(el, { scale: 1.08 }, { scale: 1.02, duration: 28, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    current = { name, el, kb };
    await gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: motion.d(dur), ease: 'sine.inOut' });
    if (prev) { prev.kb?.kill(); prev.el.remove(); }
  };

  return {
    root, layer, flash, setBackdrop,
    dim: (amount, dur = .8) => gsap.to(dimEl, { opacity: amount, duration: motion.d(dur), ease: 'sine.inOut' }),
    push: (scale, dur = 1.6) => gsap.to(root, { scale, duration: motion.d(dur), ease: 'power2.inOut' }),
  };
}

/** Partikel debu emas — minimal & lembut (sesuai brief: partikel minimal). */
function startMotes(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx || motion.reduced) return;
  let w = 0, h = 0;
  const dpr = Math.min(devicePixelRatio || 1, perf.lite ? 1.5 : 2);
  const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener('resize', resize);
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
  const sg = sprite.getContext('2d')!;
  const grad = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,225,150,1)'); grad.addColorStop(1, 'rgba(255,200,110,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 32, 32);
  const motes = Array.from({ length: perf.lite ? 24 : 36 }, () => ({
    x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8,
    vx: (Math.random() - .5) * .00012, vy: -.00006 - Math.random() * .00016, p: Math.random() * Math.PI * 2,
  }));
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(64, now - last); last = now;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.p += dt * .0012;
      if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
      if (m.x < -.02) m.x = 1.02; if (m.x > 1.02) m.x = -.02;
      const a = .25 + Math.sin(m.p) * .25 + .2;
      const r = m.r * 4;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, m.x * w - r, m.y * h - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    if (!document.hidden) requestAnimationFrame(tick); else setTimeout(() => requestAnimationFrame(tick), 500);
  };
  requestAnimationFrame(tick);
}
