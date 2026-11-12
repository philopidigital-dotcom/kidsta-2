/**
 * Panggung 2.5D: lapisan SVG berkedalaman + kamera (geser, zoom, miring, guncang, ikuti tokoh),
 * pemeran, efek kecil (zzz, !, ?, hati, bintang…), properti adegan, warna waktu, dan cuaca.
 */
import { gsap } from 'gsap';
import { SETS, type SetDef } from './sets';
import { makeActor, type AnyActor } from './cast';
import { WeatherFx } from './weather';
import type { At, Cam, CastId, Fx, Grade, Scene, Weather } from './types';

const INK = '#3b2a1a';
const NS = 'http://www.w3.org/2000/svg';
const H = 900;

export class PaperStage {
  readonly root: HTMLElement;
  private world: HTMLElement;
  private layers: { el: HTMLElement; f: number }[] = [];
  private canvas: HTMLCanvasElement;
  private weather: WeatherFx;
  private set: SetDef | null = null;
  private act: SVGGElement | null = null;
  readonly actors = new Map<CastId, AnyActor>();
  readonly cam = { x: 800, y: 450, z: 1, rot: 0, sx: 0, sy: 0 };
  private follow: CastId | null = null;
  private camTween: gsap.core.Tween | null = null;
  private filtersOff = false;
  private sw = 1; private sh = 1;
  private ro: ResizeObserver;
  private tick = () => this.frame();
  /** Lingkaran cahaya (daun emas / Pipi) yang "melubangi" gelap malam. r = jari-jari di dunia. */
  private light = { who: null as CastId | null, r: 0 };
  private lightKey = '';
  setLight(state: string, instant = false) {
    gsap.killTweensOf(this.light);
    if (state === 'off') { gsap.to(this.light, { r: 0, duration: instant ? 0 : 1.4, ease: 'power2.in' }); return; }
    const [who, r] = state.split(':');
    this.light.who = who as CastId;
    gsap.to(this.light, { r: +r || 240, duration: instant ? 0 : 1.6, ease: 'power2.out' });
  }

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'pp-stage g-day';
    this.root.innerHTML = `<div class="pp-world"></div><canvas class="pp-weather"></canvas><div class="pp-grade"></div><div class="pp-light"></div><div class="pp-vignette"></div>`;
    host.appendChild(this.root);
    this.world = this.root.querySelector('.pp-world')!;
    this.canvas = this.root.querySelector('.pp-weather')!;
    this.weather = new WeatherFx(this.canvas);
    this.ro = new ResizeObserver(() => { this.measure(); this.weather.resize(); });
    this.ro.observe(this.root);
    this.measure();
    gsap.ticker.add(this.tick);
  }

  private measure() { const r = this.root.getBoundingClientRect(); this.sw = Math.max(1, r.width); this.sh = Math.max(1, r.height); }

  /** Bangun adegan baru (lapisan, pemeran, properti, waktu, cuaca, kamera awal). */
  load(sc: Scene) {
    this.actors.forEach((a) => a.destroy()); this.actors.clear();
    this.world.innerHTML = ''; this.layers = [];
    this.filtersOff = false; this.root.classList.remove('no-ink-filter');
    this.set = SETS[sc.set]();
    for (const L of this.set.layers) {
      const el = document.createElement('div');
      el.className = `pp-layer ${L.cls ? `pp-layer--${L.cls}` : ''}`;
      el.innerHTML = L.svg;
      this.world.appendChild(el);
      this.layers.push({ el, f: L.f });
    }
    this.act = this.world.querySelector<SVGGElement>('.pp-act');
    this.root.classList.remove('lv-gold', 'has-light');
    this.root.dataset.set = sc.set;
    gsap.killTweensOf(this.light); this.light.r = 0; this.light.who = null; this.lightKey = '';
    for (const pl of sc.cast) {
      const a = makeActor(pl.id);
      const [x, y] = this.at(pl.at);
      a.st.scale *= this.set.actorScale;
      a.place(x, y);
      if (pl.face === 'l') { a.facing = 'l'; a.st.flip = -1; }
      a.expr(pl.expr ?? 'happy');
      a.pose(pl.pose ?? 'idle');
      if (pl.hidden) a.g.style.opacity = '0';
      this.act?.appendChild(a.g);
      this.actors.set(pl.id, a);
    }
    for (const [k, v] of Object.entries(sc.props ?? {})) this.prop(k, v, true);
    this.grade(sc.grade, true);
    this.setWeather(sc.weather ?? 'none');
    this.follow = null;
    Object.assign(this.cam, { x: sc.cam.x ?? this.set.W / 2, y: sc.cam.y ?? 450, z: sc.cam.z ?? 1, rot: sc.cam.rot ?? 0 });
    this.frame();
  }

  get W() { return this.set?.W ?? 1600; }

  /** "spot", [x,y], atau "@momo:dx,dy" / "@spot:dx,dy" (relatif). */
  at(a: At): [number, number] {
    if (Array.isArray(a)) return a;
    const rel = /^@([a-zA-Z0-9]+):(-?[\d.]+),(-?[\d.]+)$/.exec(a);
    if (rel) {
      const base = this.actors.get(rel[1] as CastId);
      const [bx, by] = base ? [base.st.x, base.st.y] : this.set?.spots[rel[1]] ?? [800, 800];
      return [bx + +rel[2], by + +rel[3]];
    }
    return this.set?.spots[a] ?? [800, 800];
  }

  /* ---------------- kamera ---------------- */
  moveCam(c: Cam, instant = false): Promise<void> {
    this.camTween?.kill();
    this.follow = c.follow ?? null;
    const target: Record<string, number> = {};
    if (c.follow) { const a = this.actors.get(c.follow); if (a) { const [x, y] = a.anchor('chest'); target.x = x; target.y = y - 40; } }
    if (c.x !== undefined && !c.follow) target.x = c.x;
    if (c.y !== undefined && !c.follow) target.y = c.y;
    if (c.z !== undefined) target.z = c.z;
    if (c.rot !== undefined) target.rot = c.rot;
    if (c.shake) this.shake(c.shake);
    if (instant) { Object.assign(this.cam, target); return Promise.resolve(); }
    return new Promise((res) => {
      this.camTween = gsap.to(this.cam, { ...target, duration: c.dur ?? 2.5, ease: c.ease ?? 'power2.inOut', onComplete: res });
    });
  }
  shake(power = 6) {
    gsap.fromTo(this.cam, { sx: power, sy: -power * .6 }, { sx: 0, sy: 0, duration: .7, ease: 'elastic.out(1.2, .25)' });
  }

  private frame() {
    // Filter tinta (feTurbulence) mahal bila layer diraster ulang tiap frame.
    // Matikan hanya selama kamera bergerak; aktif lagi saat kamera diam.
    const moving = !!this.follow || !!this.camTween?.isActive() || this.cam.sx !== 0 || this.cam.sy !== 0;
    if (moving !== this.filtersOff) {
      this.filtersOff = moving;
      this.root.classList.toggle('no-ink-filter', moving);
    }
    // ikuti tokoh dengan lembut
    if (this.follow && !this.camTween?.isActive()) {
      const a = this.actors.get(this.follow);
      if (a) { const [x, y] = a.anchor('chest'); this.cam.x += (x - this.cam.x) * .06; this.cam.y += (y - 40 - this.cam.y) * .06; }
    } else if (this.follow && this.camTween?.isActive()) {
      const a = this.actors.get(this.follow);
      if (a) { const [x] = a.anchor('chest'); this.cam.x += (x - this.cam.x) * .04; }
    }
    const { sw, sh } = this, s0 = sh / H, W = this.W;
    for (const L of this.layers) {
      const zf = 1 + (this.cam.z - 1) * L.f, sc = s0 * zf;
      let cx = W / 2 + (this.cam.x - W / 2) * L.f, cy = H / 2 + (this.cam.y - H / 2) * L.f;
      const hw = sw / (2 * sc), hh = sh / (2 * sc), bleed = 70;
      cx = hw * 2 >= W + bleed * 2 ? W / 2 : Math.min(W + bleed - hw, Math.max(hw - bleed, cx));
      cy = Math.min(H + bleed - hh, Math.max(hh - bleed, cy));
      const tx = sw / 2 - cx * sc + this.cam.sx * L.f, ty = sh / 2 - cy * sc + this.cam.sy * L.f;
      L.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    }
    this.world.style.transform = this.cam.rot ? `rotate(${this.cam.rot.toFixed(2)}deg) scale(${(1 + Math.abs(this.cam.rot) * .012).toFixed(3)})` : '';
    this.actors.forEach((a) => a.render());
    const la = this.light.who ? this.actors.get(this.light.who) : undefined;
    if (la && this.light.r > 1) {
      const [ax, ay] = la.anchor(this.light.who === 'pipi' ? 'chest' : 'head');
      const [lx, ly] = this.toScreen(ax, ay - (this.light.who === 'pipi' ? 0 : 60));
      const flick = 1 + Math.sin(performance.now() / 420) * .025;
      const key = `${lx.toFixed(0)},${ly.toFixed(0)},${(this.light.r * s0 * this.cam.z * flick).toFixed(0)}`;
      if (key !== this.lightKey) {
        this.lightKey = key; const [x, y, r] = key.split(',');
        this.root.style.setProperty('--lx', `${x}px`); this.root.style.setProperty('--ly', `${y}px`); this.root.style.setProperty('--lr', `${r}px`);
        this.root.classList.add('has-light');
      }
    } else if (this.lightKey) { this.lightKey = ''; this.root.classList.remove('has-light'); }
  }

  /** Posisi layar (px, relatif panggung) dari koordinat dunia di lapisan panggung (f=1). */
  toScreen(x: number, y: number): [number, number] {
    const { sw, sh } = this, s0 = sh / H, W = this.W, sc = s0 * this.cam.z;
    let cx = this.cam.x, cy = this.cam.y;
    const hw = sw / (2 * sc), hh = sh / (2 * sc), bleed = 70;
    cx = hw * 2 >= W + bleed * 2 ? W / 2 : Math.min(W + bleed - hw, Math.max(hw - bleed, cx));
    cy = Math.min(H + bleed - hh, Math.max(hh - bleed, cy));
    return [sw / 2 + (x - cx) * sc, sh / 2 + (y - cy) * sc];
  }
  get size() { return [this.sw, this.sh] as const; }

  /* ---------------- waktu & cuaca ---------------- */
  grade(g: Grade, instant = false) {
    const el = this.root;
    if (instant) el.classList.add('no-trans');
    el.classList.remove('g-dawn', 'g-day', 'g-cloudy', 'g-dusk', 'g-night');
    el.classList.add(`g-${g}`);
    if (instant) requestAnimationFrame(() => el.classList.remove('no-trans'));
  }
  setWeather(w: Weather) { this.weather.set(w); }
  pause(on: boolean) { this.weather.paused = on; }

  /* ---------------- properti ---------------- */
  propEl(name: string) { return this.world.querySelector<SVGGElement>(`[data-prop="${name}"], [data-item="${name}"]`); }
  prop(name: string, state: string, instant = false) {
    const d = instant ? 0 : 1;
    if (name.includes('.')) {
      const [who, acc] = name.split('.');
      this.actors.get(who as CastId)?.accessory?.(acc as 'scarf' | 'pack' | 'lamp', state === 'on');
      return;
    }
    if (name === 'light') { this.setLight(state, instant); return; }
    const who = this.actors.get(name as CastId);
    if (who) { gsap.to(who.g, { opacity: state === 'hidden' ? 0 : 1, duration: instant ? 0 : .9 }); return; }
    if (name === 'leaves') { this.root.classList.toggle('lv-gold', state === 'gold'); return; }
    const el = this.propEl(name); if (!el) return;
    switch (state) {
      case 'hidden': gsap.to(el, { opacity: 0, duration: .5 * d }); break;
      case 'show': gsap.to(el, { opacity: 1, duration: .8 * d }); el.classList.remove('is-worried', 'is-scared'); break;
      case 'worried': gsap.to(el, { opacity: 1, duration: .5 * d }); el.classList.add('is-worried'); el.classList.remove('is-scared'); break;
      case 'scared': gsap.to(el, { opacity: 1, duration: .5 * d }); el.classList.add('is-worried', 'is-scared'); break;
      case 'glow': el.classList.add('is-glow'); break;
      case 'gone': gsap.to(el, { opacity: 0, y: '-=30', scale: .6, transformOrigin: '50% 50%', duration: .6 * d, ease: 'power2.in' }); el.classList.add('is-gone'); break;
      case 'plate3': ['banana1', 'banana2', 'banana3'].forEach((b) => { const e = this.propEl(b); if (e) { e.style.opacity = '0'; e.classList.add('is-gone'); } }); break;
      case 'open': { const lid = el.querySelector('.lid'), sc = el.querySelector('.scarfIn'); gsap.to(lid, { rotation: -70, transformOrigin: '0% 100%', duration: .8 * d, ease: 'back.out(1.6)' }); gsap.to(sc, { opacity: 1, y: -8, duration: .8 * d, delay: .3 * d }); break; }
      case 'shake': gsap.fromTo(el, { rotation: -2 }, { rotation: 2, transformOrigin: '50% 100%', duration: .08, yoyo: true, repeat: 9, ease: 'none', onComplete: () => { gsap.set(el, { rotation: 0 }); } }); break;
      case 'walk': gsap.to(el, { opacity: 1, duration: .5 }); el.querySelectorAll('.duckling').forEach((dk, i) => {
        gsap.to(dk, { x: '+=420', duration: 5, delay: i * .25, ease: 'none' });
        gsap.fromTo(dk, { rotation: -6 }, { rotation: 6, transformOrigin: '50% 100%', duration: .18, yoyo: true, repeat: 26, ease: 'sine.inOut' });
      }); break;
      case 'float': gsap.fromTo(el, { opacity: 0, y: -160, rotation: -30 }, { opacity: 1, y: 0, rotation: 20, duration: 3, ease: 'sine.out' });
        gsap.to(el, { y: '-=14', duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 3 }); break;
      case 'collapse': gsap.to(el, { scaleY: .16, scaleX: 1.15, rotation: 4, transformOrigin: '50% 100%', duration: .45 * d, ease: 'bounce.out' }); break;
      case 'build': gsap.fromTo(el, { opacity: 1, scaleY: .05, scaleX: 1, rotation: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 3 * d, ease: 'back.out(1.4)' }); break;
      case 'roll': gsap.to(el, { x: '+=300', rotation: 160, transformOrigin: '50% 70%', duration: 2.2 * d, ease: 'power2.in' }); break;
      case 'nudge': gsap.to(el, { x: '+=14', rotation: 3, transformOrigin: '50% 100%', duration: .5 * d, yoyo: true, repeat: 1, ease: 'sine.inOut' }); break;
      case 'pop': gsap.fromTo(el, { opacity: 0, scale: .2, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .7 * d, ease: 'back.out(2)' }); break;
      case 'angry': el.classList.add('is-angry'); el.classList.remove('is-calm'); break;
      case 'calm': el.classList.remove('is-angry'); el.classList.add('is-calm'); break;
      case 'snap': gsap.to(el, { rotation: 16, y: 150, transformOrigin: '0% 0%', duration: 1.4 * d, ease: 'power2.in' }); gsap.to(el, { opacity: 0, duration: .9 * d, delay: 1.1 * d }); break;
      case 'fall': gsap.fromTo(el, { opacity: 0, y: -150, rotation: -40 }, { opacity: 1, y: 0, rotation: 8, duration: 1.1 * d, ease: 'power1.in' }); break;
      case 'drift': gsap.to(el, { x: '+=760', duration: 6 * d, ease: 'power1.in' }); gsap.to(el, { y: '+=10', rotation: -10, duration: .7, yoyo: true, repeat: 7, ease: 'sine.inOut' }); gsap.to(el, { opacity: 0, duration: 1.6 * d, delay: 4.2 * d }); break;
      case 'point': gsap.to(el, { x: '+=260', y: '-=60', rotation: 380, duration: 4.5, ease: 'sine.inOut' }); break;
    }
  }

  /* ---------------- efek kecil di atas tokoh ---------------- */
  fx(kind: Fx, who?: CastId, at?: At) {
    if (!this.act) return;
    let x: number, y: number;
    const a = who ? this.actors.get(who) : undefined;
    if (a) [x, y] = a.anchor('head'); else [x, y] = at ? this.at(at) : [this.W / 2, 400];
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `pp-fx pp-fx--${kind}`);
    const sc = a ? Math.max(.8, a.st.scale) : 1;
    const txt = (t: string, size: number, dx = 0, dy = 0, col = INK) => `<text x="${dx}" y="${dy}" font-family="'IM Fell English', serif" font-size="${size}" fill="${col}" stroke="#fbf6ea" stroke-width="3" paint-order="stroke" text-anchor="middle">${t}</text>`;
    const heart = (dx: number, dy: number, s: number) => `<path transform="translate(${dx} ${dy}) scale(${s})" d="M0 6 C-14 -6 -8 -18 0 -10 C8 -18 14 -6 0 6 Z" fill="#e3667a" stroke="${INK}" stroke-width="1.6"/>`;
    const star = (dx: number, dy: number, s: number, c = '#f6d36a') => `<path transform="translate(${dx} ${dy}) scale(${s})" d="M0 -10 L2.6 -3 L10 -3 L4 1.6 L6.4 9 L0 4.6 L-6.4 9 L-4 1.6 L-10 -3 L-2.6 -3 Z" fill="${c}" stroke="${INK}" stroke-width="1.3"/>`;
    const note = (dx: number, dy: number) => `<g transform="translate(${dx} ${dy})"><ellipse cx="0" cy="8" rx="6" ry="4.4" fill="${INK}" transform="rotate(-20 0 8)"/><path d="M5 7 V-14 l10 4" fill="none" stroke="${INK}" stroke-width="2.2"/></g>`;
    let inner = '';
    switch (kind) {
      case 'zzz': inner = `${txt('z', 30, 30, -10)}${txt('z', 40, 52, -44)}${txt('Z', 52, 78, -86)}`; break;
      case 'exclaim': inner = txt('!', 74, 34, -14, '#b5452f'); break;
      case 'question': inner = txt('?', 64, 34, -14); break;
      case 'sweat': inner = `<path transform="translate(42 -6)" d="M0 -14 Q8 -2 6 6 Q0 12 -6 6 Q-8 -2 0 -14 Z" fill="#a7cfd6" stroke="${INK}" stroke-width="1.6"/>`; break;
      case 'tears': inner = [-14, 18].map((dx) => `<path class="tear" transform="translate(${dx} 40)" d="M0 -8 Q5 0 4 5 Q0 9 -4 5 Q-5 0 0 -8 Z" fill="#a7cfd6" stroke="${INK}" stroke-width="1.2"/>`).join(''); break;
      case 'hearts': inner = `${heart(-30, -20, 1.4)}${heart(12, -50, 1.9)}${heart(44, -18, 1.2)}`; break;
      case 'sparkle': inner = `${star(-40, -10, 1.4)}${star(30, -50, 1.9)}${star(56, 6, 1.1)}${star(-6, -74, 1.2, '#fbf1c8')}`; break;
      case 'notes': inner = `${note(30, -20)}${note(60, -60)}`; break;
      case 'dizzy': inner = `<g class="spin">${[0, 1, 2, 3].map((i) => star(Math.cos(i * 1.57) * 44, Math.sin(i * 1.57) * 14, 1.1)).join('')}</g>`; break;
      case 'puff': inner = [-50, -18, 20, 52].map((dx, i) => `<circle cx="${dx}" cy="${-8 - (i % 2) * 8}" r="${16 + (i % 2) * 6}" fill="#f3ecdc" stroke="${INK}" stroke-width="1.6"/>`).join(''); break;
      case 'glow': case 'shine': inner = `<circle r="70" fill="#fff3a0" opacity=".5"/>${Array.from({ length: 10 }, (_, i) => `<path d="M${Math.cos(i * .628) * 50} ${Math.sin(i * .628) * 50} L${Math.cos(i * .628) * 86} ${Math.sin(i * .628) * 86}" stroke="#f2c94c" stroke-width="3" stroke-linecap="round"/>`).join('')}`; break;
    }
    g.innerHTML = inner;
    const yy = kind === 'puff' ? y : y - 8;
    g.setAttribute('transform', `translate(${x} ${yy}) scale(${sc})`);
    this.act.appendChild(g);
    const kids = [...g.children] as SVGElement[];
    const done = () => g.remove();
    const tl = gsap.timeline({ onComplete: done });
    switch (kind) {
      case 'zzz': tl.fromTo(kids, { opacity: 0, y: 10 }, { opacity: 1, y: -10, stagger: .4, duration: .8 }).to(kids, { opacity: 0, duration: .6 }, '+=.8'); break;
      case 'tears': tl.fromTo(kids, { opacity: 1, y: 0 }, { y: 50, opacity: 0, duration: .9, stagger: .2, repeat: 3, ease: 'power1.in' }); break;
      case 'dizzy': tl.fromTo(g.querySelector('.spin'), { rotation: 0 }, { rotation: 720, svgOrigin: '0 0', duration: 2.4, ease: 'none' }).to(g, { opacity: 0, duration: .3 }); break;
      case 'puff': tl.fromTo(kids, { scale: .3, opacity: 1, transformOrigin: '50% 50%' }, { scale: 1.4, opacity: 0, x: (i) => (i - 1.5) * 20, duration: .9, stagger: .04, ease: 'power2.out' }); break;
      case 'glow': case 'shine': tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: .6 }).to(kids, { rotation: 25, svgOrigin: '0 0', duration: 2 }, 0).to(g, { opacity: 0, duration: .8 }); break;
      default: tl.fromTo(kids, { opacity: 0, scale: .4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: .45, stagger: .12, ease: 'back.out(2.4)' })
        .to(kids, { y: -16, duration: 1.2, ease: 'sine.inOut' }, '<').to(kids, { opacity: 0, duration: .5 }, '+=.4');
    }
  }

  destroy() {
    gsap.ticker.remove(this.tick);
    this.camTween?.kill();
    this.ro.disconnect();
    this.weather.destroy();
    this.actors.forEach((a) => a.destroy());
    this.root.remove();
  }
}
