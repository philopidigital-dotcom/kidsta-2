/**
 * Pemeran 2.5D bergaya tinta: rig SVG berengsel (bahu, pinggul, leher, ekor) yang digerakkan
 * oleh "state" angka biasa → satu fungsi render menulis atribut transform tiap frame.
 * Tanpa WebGL, tanpa gambar raster — ringan, tajam di segala ukuran.
 */
import { gsap } from 'gsap';
import type { CastId, Expr, Look, Pose } from './types';

const INK = '#3b2a1a';
const P = (d: string, fill = 'none', w = 2, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const NS = 'http://www.w3.org/2000/svg';

interface PartState { r: number; x: number; y: number; sx: number; sy: number }
interface Part { el: SVGGElement; px: number; py: number; s: PartState }
interface RootState { x: number; y: number; scale: number; flip: number; rot: number; lift: number; squash: number }

/* ===================================================================== wajah */

type EyeKind = 'open' | 'closed' | 'happy' | 'wide' | 'sad' | 'dizzy' | 'wink' | 'brave';
type MouthKind = 'smile' | 'joy' | 'o' | 'sad' | 'cry' | 'flat' | 'grin' | 'yawn';
type BrowKind = 'none' | 'up' | 'worried' | 'brave' | 'sad';
const EXPR: Record<Expr, { eyes: EyeKind; mouth: MouthKind; brows: BrowKind; blush?: boolean }> = {
  happy: { eyes: 'open', mouth: 'smile', brows: 'none', blush: true },
  joy: { eyes: 'happy', mouth: 'joy', brows: 'up', blush: true },
  calm: { eyes: 'open', mouth: 'flat', brows: 'none' },
  sleepy: { eyes: 'closed', mouth: 'flat', brows: 'none' },
  surprised: { eyes: 'wide', mouth: 'o', brows: 'up' },
  scared: { eyes: 'wide', mouth: 'cry', brows: 'worried' },
  sad: { eyes: 'sad', mouth: 'sad', brows: 'sad' },
  cry: { eyes: 'happy', mouth: 'cry', brows: 'sad', blush: true },
  worried: { eyes: 'open', mouth: 'sad', brows: 'worried' },
  brave: { eyes: 'brave', mouth: 'grin', brows: 'brave' },
  curious: { eyes: 'open', mouth: 'o', brows: 'up' },
  dizzy: { eyes: 'dizzy', mouth: 'flat', brows: 'none' },
  wink: { eyes: 'wink', mouth: 'grin', brows: 'up', blush: true },
  dream: { eyes: 'closed', mouth: 'smile', brows: 'none', blush: true },
};

/** Mata monyet: dua titik pusat. */
function monkeyEyes(k: EyeKind, lx: number, rx: number, y: number) {
  const one = (x: number, kind: EyeKind) => {
    switch (kind) {
      case 'closed': return P(`M${x - 5} ${y} q5 4 10 0`, 'none', 2.2);
      case 'happy': return P(`M${x - 5} ${y + 2} q5 -7 10 0`, 'none', 2.4);
      case 'wide': return `<circle cx="${x}" cy="${y}" r="7" fill="#fff" stroke="${INK}" stroke-width="1.8"/><circle cx="${x + 1}" cy="${y + 1}" r="3" fill="${INK}"/>`;
      case 'sad': return `<ellipse cx="${x}" cy="${y + 1}" rx="4.2" ry="5.4" fill="${INK}"/><circle cx="${x + 1.4}" cy="${y - 1}" r="1.5" fill="#fff"/>${P(`M${x - 6} ${y - 4} L${x + 6} ${y - 2}`, 'none', 1.6)}`;
      case 'dizzy': return P(`M${x} ${y} m-5 0 a5 5 0 1 1 5 5 a3 3 0 1 1 -3 -3`, 'none', 1.8);
      case 'brave': return `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="6" fill="${INK}"/><circle cx="${x + 1.5}" cy="${y - 2}" r="1.7" fill="#fff"/>${P(`M${x - 6} ${y - 5} L${x + 6} ${y - 3}`, 'none', 2.2)}`;
      default: return `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="6.4" fill="${INK}"/><circle cx="${x + 1.5}" cy="${y - 2.5}" r="1.7" fill="#fff"/>`;
    }
  };
  if (k === 'wink') return one(lx, 'open') + one(rx, 'happy');
  return one(lx, k) + one(rx, k);
}
function monkeyMouth(k: MouthKind, x: number, y: number) {
  switch (k) {
    case 'joy': return P(`M${x - 10} ${y - 2} Q${x} ${y + 14} ${x + 11} ${y - 2} Q${x} ${y + 3} ${x - 10} ${y - 2} Z`, '#c8463a', 1.7);
    case 'o': return `<ellipse cx="${x}" cy="${y + 2}" rx="4" ry="5" fill="#7a2a1e" stroke="${INK}" stroke-width="1.4"/>`;
    case 'sad': return P(`M${x - 8} ${y + 4} Q${x} ${y - 4} ${x + 8} ${y + 4}`, 'none', 2);
    case 'cry': return P(`M${x - 9} ${y + 6} Q${x - 4} ${y - 4} ${x} ${y} Q${x + 4} ${y - 4} ${x + 9} ${y + 6} Q${x} ${y + 2} ${x - 9} ${y + 6} Z`, '#7a2a1e', 1.6);
    case 'flat': return P(`M${x - 6} ${y + 1} L${x + 6} ${y + 1}`, 'none', 2);
    case 'grin': return P(`M${x - 9} ${y - 1} Q${x + 1} ${y + 9} ${x + 10} ${y - 3}`, 'none', 2.2);
    case 'yawn': return `<ellipse cx="${x}" cy="${y + 3}" rx="7" ry="10" fill="#7a2a1e" stroke="${INK}" stroke-width="1.6"/>`;
    default: return P(`M${x - 9} ${y - 1} Q${x} ${y + 9} ${x + 9} ${y - 1}`, 'none', 2.2);
  }
}
function monkeyBrows(k: BrowKind, lx: number, rx: number, y: number, col = INK, w = 2) {
  const L = (d: string) => P(d, 'none', w, `stroke="${col}"`).replace(`stroke="${INK}" `, '');
  switch (k) {
    case 'up': return L(`M${lx - 6} ${y - 2} q6 -5 12 0`) + L(`M${rx - 6} ${y - 2} q6 -5 12 0`);
    case 'worried': case 'sad': return L(`M${lx - 6} ${y + 1} L${lx + 5} ${y - 4}`) + L(`M${rx - 5} ${y - 4} L${rx + 6} ${y + 1}`);
    case 'brave': return L(`M${lx - 6} ${y - 4} L${lx + 6} ${y}`) + L(`M${rx - 6} ${y} L${rx + 6} ${y - 4}`);
    default: return col === INK ? '' : L(`M${lx - 6} ${y - 1} q6 -3 12 0`) + L(`M${rx - 6} ${y - 1} q6 -3 12 0`);
  }
}

/* ===================================================================== rig dasar */

export interface ActorDef { id: CastId; name: string; height: number; markup: string; pivots: Record<string, [number, number]>; scale: number }

export class Actor {
  readonly g: SVGGElement;
  private inner: SVGGElement;
  private shadow: SVGEllipseElement;
  readonly st: RootState;
  readonly parts: Record<string, Part> = {};
  private loop: gsap.core.Timeline | null = null;
  private blinkT: gsap.core.Tween | null = null;
  private talkT: gsap.core.Timeline | null = null;
  private exprNow: Expr = 'happy';
  lookNow: Look = 'r';
  poseNow: Pose = 'idle';
  facing: 'l' | 'r' = 'r';

  constructor(readonly def: ActorDef) {
    this.g = document.createElementNS(NS, 'g');
    this.g.setAttribute('class', `pp-actor pp-actor--${def.id}`);
    this.g.innerHTML = `<ellipse class="pp-shadow" cx="0" cy="0" rx="${def.height * .26}" ry="${def.height * .045}" fill="#3b2a1a" opacity=".22"/><g class="pp-inner">${def.markup}</g>`;
    this.inner = this.g.querySelector('.pp-inner')!;
    this.shadow = this.g.querySelector('.pp-shadow')!;
    this.st = { x: 0, y: 0, scale: def.scale, flip: 1, rot: 0, lift: 0, squash: 1 };
    for (const [name, [px, py]] of Object.entries(def.pivots)) {
      const el = this.g.querySelector<SVGGElement>(`[data-part="${name}"]`);
      if (el) this.parts[name] = { el, px, py, s: { r: 0, x: 0, y: 0, sx: 1, sy: 1 } };
    }
    this.blink();
  }

  /** Tulis semua transform (dipanggil tiap frame oleh panggung). */
  render() {
    const s = this.st;
    this.g.setAttribute('transform', `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) scale(${s.scale.toFixed(3)})`);
    const sh = Math.max(.35, 1 - s.lift / 260);
    this.shadow.setAttribute('transform', `scale(${sh.toFixed(3)})`);
    this.inner.setAttribute('transform', `translate(0 ${(-s.lift).toFixed(1)}) rotate(${s.rot.toFixed(2)}) scale(${s.flip.toFixed(3)} ${s.squash.toFixed(3)})`);
    for (const p of Object.values(this.parts)) {
      const q = p.s;
      p.el.setAttribute('transform', `translate(${(p.px + q.x).toFixed(1)} ${(p.py + q.y).toFixed(1)}) rotate(${q.r.toFixed(1)})${q.sx !== 1 || q.sy !== 1 ? ` scale(${q.sx.toFixed(3)} ${q.sy.toFixed(3)})` : ''}`);
    }
  }

  place(x: number, y: number) { this.st.x = x; this.st.y = y; }
  face(dir: 'l' | 'r', dur = .35) {
    if (dir === this.facing) return;
    this.facing = dir;
    gsap.to(this.st, { flip: dir === 'r' ? 1 : -1, duration: dur, ease: 'power2.inOut' });
  }

  /** Titik jangkar di dunia (untuk efek & kamera). */
  anchor(which: 'head' | 'feet' | 'chest' = 'head'): [number, number] {
    const h = this.def.height * this.st.scale;
    const dy = which === 'head' ? -h * .86 : which === 'chest' ? -h * .5 : 0;
    return [this.st.x + (which === 'head' ? 8 * this.st.flip * this.st.scale : 0), this.st.y + dy - this.st.lift * this.st.scale];
  }

  /* -------- ekspresi -------- */
  expr(e: Expr) { this.exprNow = e; this.drawFace(); }
  look(l: Look) {
    this.lookNow = l;
    const f = this.parts.face; if (!f) return;
    const k = this.def.id === 'momo' || this.def.id === 'kakek' ? 1 : .3;
    const fx = (l === 'cam' ? -5 : l === 'l' ? -9 : 4) * k, fy = (l === 'up' ? -4 : l === 'down' ? 4 : 0) * k;
    gsap.to(f.s, { x: fx, y: fy, duration: .35, ease: 'power2.out' });
    const head = this.parts.head;
    if (head) gsap.to(head.s, { r: l === 'up' ? -10 : l === 'down' ? 10 : 0, duration: .45, ease: 'power2.out' });
    if (l === 'l' && this.facing === 'r') this.face('l');
    else if (l === 'r' && this.facing === 'l') this.face('r');
  }
  protected drawFace() {
    const host = this.g.querySelector<SVGGElement>('[data-face]'); if (!host) return;
    host.innerHTML = this.faceMarkup(this.exprNow);
  }
  protected faceMarkup(e: Expr): string { void e; return ''; }

  private blink() {
    const go = () => {
      this.blinkT = gsap.delayedCall(2.4 + Math.random() * 3.2, () => {
        const eyes = this.g.querySelector<SVGGElement>('[data-face] .eyes');
        const ex = EXPR[this.exprNow];
        if (eyes && (ex.eyes === 'open' || ex.eyes === 'brave' || ex.eyes === 'sad')) {
          const box = eyes.getBBox?.(); const cy = box ? box.y + box.height / 2 : 0;
          gsap.fromTo(eyes, { attr: { transform: `translate(0 ${cy}) scale(1 1) translate(0 ${-cy})` } }, { attr: { transform: `translate(0 ${cy}) scale(1 .1) translate(0 ${-cy})` }, duration: .07, yoyo: true, repeat: 1 });
        }
        go();
      });
    };
    go();
  }

  /** Mulut bergerak saat tokoh berbicara. */
  talk(on: boolean) {
    this.talkT?.kill(); this.talkT = null;
    const m = this.g.querySelector<SVGGElement>('[data-face] .mouth');
    if (!m) return;
    if (!on) { gsap.set(m, { attr: { transform: '' } }); return; }
    const b = m.getBBox?.(); const cx = b ? b.x + b.width / 2 : 0, cy = b ? b.y : 0;
    this.talkT = gsap.timeline({ repeat: -1 })
      .to(m, { attr: { transform: `translate(${cx} ${cy}) scale(1.1 1.9) translate(${-cx} ${-cy})` }, duration: .11, ease: 'none' })
      .to(m, { attr: { transform: `translate(${cx} ${cy}) scale(1 .7) translate(${-cx} ${-cy})` }, duration: .12, ease: 'none' })
      .to(m, { attr: { transform: `translate(${cx} ${cy}) scale(1.05 1.5) translate(${-cx} ${-cy})` }, duration: .1, ease: 'none' })
      .to(m, { attr: { transform: '' }, duration: .13, ease: 'none' });
    const head = this.parts.head;
    if (head) this.talkT.to(head.s, { r: '+=3', duration: .23, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
  }

  /* -------- pose -------- */
  protected reset(dur = .3, except: string[] = []) {
    for (const [k, p] of Object.entries(this.parts)) {
      if (k === 'face' || except.includes(k)) continue;
      gsap.killTweensOf(p.s);
      gsap.to(p.s, { r: 0, x: 0, y: 0, sx: 1, sy: 1, duration: dur, ease: 'power2.out' });
    }
    gsap.killTweensOf(this.st, 'lift,rot,squash');
    gsap.to(this.st, { lift: 0, rot: this.baseRot(), squash: 1, duration: dur, ease: 'power2.out' });
  }
  protected baseRot() { return 0; }
  protected p(name: string) { return this.parts[name]?.s ?? { r: 0, x: 0, y: 0, sx: 1, sy: 1 }; }

  /** Tokoh yang sedang duduk tetap duduk saat bergestur (bertepuk, mengangguk, bicara…). */
  seated = false;
  pose(name: Pose) {
    this.loop?.kill(); this.loop = null;
    this.poseNow = name;
    if (['sit', 'sleep', 'sad'].includes(name)) this.seated = true;
    else if (['walk', 'run', 'jump', 'fall', 'climb', 'stretch', 'cheer', 'fly', 'hop', 'scared', 'hide'].includes(name)) this.seated = false;
    this.reset(name === 'walk' || name === 'run' ? .15 : .3);
    this.loop = this.buildPose(name);
  }
  protected buildPose(name: Pose): gsap.core.Timeline | null { void name; return null; }

  /** Berjalan/berlari ke titik lalu ganti pose. */
  async moveTo(x: number, y: number, dur: number, pose: Pose = 'walk', then: Pose = 'idle') {
    if (Math.abs(x - this.st.x) > 4) this.face(x < this.st.x ? 'l' : 'r', .25);
    const special = pose === 'fall' || pose === 'fly' || pose === 'climb';
    if (!special) this.pose(pose);
    else this.pose(pose);
    await gsap.to(this.st, { x, y, duration: dur, ease: pose === 'fly' || this.def.id === 'pipi' ? 'sine.inOut' : pose === 'fall' ? 'power2.in' : 'none' });
    this.pose(then);
  }

  destroy() { this.loop?.kill(); this.blinkT?.kill(); this.talkT?.kill(); gsap.killTweensOf(this.st); Object.values(this.parts).forEach((p) => gsap.killTweensOf(p.s)); this.g.remove(); }
}

/* ===================================================================== monyet */

interface MonkeyLook { fur: string; furDark: string; skin: string; elder?: boolean; pack?: boolean }

function monkeyMarkup(c: MonkeyLook) {
  const leg = `${P('M-7 0 Q-8 26 -6 44 Q0 50 7 44 Q8 26 7 0 Z', c.fur, 2)}<ellipse cx="6" cy="47" rx="11" ry="6" fill="${c.skin}" stroke="${INK}" stroke-width="1.8"/>`;
  const arm = (cane = false) => `${P('M-6 0 Q-7 20 -5 36 Q0 41 5 36 Q7 20 6 0 Z', c.fur, 1.9)}${cane ? `<path d="M2 38 L10 104" stroke="#7a5230" stroke-width="5" stroke-linecap="round"/>${P('M2 38 L10 104', 'none', 1.2)}${P('M2 38 q-2 -10 -12 -8', 'none', 4, 'stroke="#7a5230"')}` : ''}<circle cx="0" cy="39" r="7.5" fill="${c.skin}" stroke="${INK}" stroke-width="1.8"/>`;
  const elderFace = c.elder ? `<g class="glasses"><circle cx="-9" cy="-44" r="10" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="1.8"/><circle cx="13" cy="-44" r="10" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="1.8"/>${P('M1 -45 q1 -3 2 0', 'none', 1.6)}</g>${P('M-7 -6 Q2 8 11 -6 Q2 0 -7 -6 Z', '#f4efe4', 1.4)}` : '';
  return `
    <g data-part="tail">${P('M0 0 Q-52 2 -50 -40 Q-48 -66 -26 -60 Q-40 -52 -38 -40 Q-38 -14 2 -12 Z', c.furDark, 2)}</g>
    <g data-part="armB">${arm()}</g>
    <g data-part="legB">${leg}</g>
    ${c.pack !== false ? `<g data-part="pack" opacity="0">${P('M-56 -58 Q-62 -104 -36 -112 Q-14 -114 -12 -90 L-14 -56 Q-32 -48 -56 -58 Z', '#a8774a', 2.2)}${P('M-54 -96 Q-36 -106 -16 -98 L-18 -82 Q-36 -74 -54 -84 Z', '#8f6a3e', 1.6)}${P('M-48 -70 h18 v10 h-18 Z', '#c9a86c', 1.2)}</g>` : ''}
    <g data-part="torso">${P('M-30 -52 Q-36 -100 -4 -114 Q30 -118 34 -88 Q38 -58 22 -48 Q-4 -42 -30 -52 Z', c.fur, 2.2)}${P('M-14 -56 Q-16 -88 4 -94 Q22 -90 20 -62 Q4 -50 -14 -56 Z', c.skin, 1.4)}
      ${c.pack !== false ? `<g class="strap" opacity="0">${P('M-14 -106 Q6 -98 12 -70', 'none', 2.6)}</g>` : ''}</g>
    <g data-part="legF">${leg}</g>
    <g data-part="head">
      <circle cx="-36" cy="-44" r="14" fill="${c.fur}" stroke="${INK}" stroke-width="2"/><circle cx="-36" cy="-44" r="7.5" fill="${c.skin}"/>
      <circle cx="38" cy="-44" r="14" fill="${c.fur}" stroke="${INK}" stroke-width="2"/><circle cx="38" cy="-44" r="7.5" fill="${c.skin}"/>
      <circle cx="1" cy="-40" r="37" fill="${c.fur}" stroke="${INK}" stroke-width="2.4"/>
      ${c.elder ? P('M-14 -74 q8 -6 14 0 q8 -6 14 0', 'none', 2.4, 'stroke="#f4efe4"') : P('M-10 -76 q6 -12 12 -2 q4 -12 10 -2', 'none', 2)}
      <g data-part="face"><g data-face></g>${elderFace}</g>
    </g>
    <g data-part="scarf" opacity="0">${P('M-26 -112 Q4 -100 32 -114 L34 -104 Q4 -88 -26 -100 Z', '#c8463a', 1.8)}<g data-part="scarfTail">${P('M0 0 Q-10 22 -26 34 L-16 40 Q2 26 8 4 Z', '#c8463a', 1.6)}${P('M-24 36 l-3 6 M-19 38 l-1 7', 'none', 1.2)}</g></g>
    <g data-part="armF">${arm(c.elder)}<g class="lamp" opacity="0" transform="translate(0 50)"><circle r="30" fill="#ffe98a" opacity=".45" class="ff-glow"/><g transform="rotate(-60) scale(1.5)">${P('M-16 0 Q-4 -14 16 -2 Q4 12 -16 0 Z', '#f2c94c', 1.4)}${P('M-16 0 L14 -1', 'none', .9)}</g></g></g>`;
}

class Monkey extends Actor {
  constructor(id: CastId, name: string, private c: MonkeyLook, scale: number) {
    super({ id, name, height: 196, scale, markup: monkeyMarkup(c),
      pivots: { tail: [-28, -60], armB: [-16, -100], legB: [-8, -52], torso: [0, 0], legF: [10, -52], head: [6, -112], face: [0, 0], armF: [22, -100], scarf: [0, 0], scarfTail: [-18, -100], pack: [0, 0] } });
    this.drawFace();
    this.render();
  }
  protected faceMarkup(e: Expr) {
    const ex = EXPR[e];
    const muzzle = P('M-24 -38 Q-26 -66 -7 -60 Q1 -70 9 -60 Q28 -66 26 -38 Q28 -10 1 -6 Q-26 -10 -24 -38 Z', this.c.skin, 1.8);
    const browCol = this.c.elder ? '#f4efe4' : INK;
    return `${muzzle}<g class="eyes">${monkeyEyes(ex.eyes, -9, 13, -44)}</g><g class="brows">${monkeyBrows(this.c.elder && ex.brows === 'none' ? 'up' : ex.brows, -9, 13, -55, browCol, this.c.elder ? 3.2 : 2)}</g>
      <circle cx="-1" cy="-31" r="1.4" fill="${INK}"/><circle cx="4" cy="-31" r="1.4" fill="${INK}"/>
      <g class="mouth">${monkeyMouth(ex.mouth, 1.5, -21)}</g>
      ${ex.blush ? `<circle cx="-17" cy="-28" r="5" fill="#e98b7a" opacity=".55"/><circle cx="21" cy="-28" r="5" fill="#e98b7a" opacity=".55"/>` : ''}`;
  }
  protected baseRot() { return this.c.elder ? 3 : 0; }

  accessory(name: 'scarf' | 'pack' | 'lamp', on: boolean) {
    if (name === 'lamp') { const l = this.g.querySelector('.lamp'); if (l) gsap.to(l, { opacity: on ? 1 : 0, duration: .7 }); return; }
    const el = this.parts[name]?.el; if (!el) return;
    gsap.to(el, { opacity: on ? 1 : 0, duration: .5 });
    if (name === 'pack') { const s = this.g.querySelector('.strap'); if (s) gsap.to(s, { opacity: on ? 1 : 0, duration: .5 }); }
  }

  protected buildPose(name: Pose) {
    const tl = gsap.timeline({ repeat: -1 });
    const t = this.p.bind(this);
    if (this.seated && !['sit', 'sleep', 'sad'].includes(name)) {
      gsap.to(this.st, { lift: -34, duration: .3 }); gsap.to(t('legF'), { r: -82, duration: .3 }); gsap.to(t('legB'), { r: -70, duration: .3 });
    }
    const tailSway = (d = 1.6, a = 8) => gsap.fromTo(t('tail'), { r: -a }, { r: a, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    const scarf = (d = 1.2, a = 10) => gsap.fromTo(t('scarfTail'), { r: -a }, { r: a, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    const breathe = () => gsap.fromTo(t('torso'), { sy: 1 }, { sy: 1.025, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    const add = (...tw: gsap.core.Tween[]) => tw.forEach((w) => tl.add(w, 0));
    switch (name) {
      case 'idle': case 'talk': case 'peek':
        add(breathe(), tailSway(), scarf(1.6, 6));
        add(gsap.to(t('armF'), { r: -6, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        if (name === 'talk') add(gsap.to(t('armF'), { r: -55, duration: .5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: .2 }));
        if (name === 'peek') { gsap.to(this.st, { rot: 9, duration: .5 }); add(gsap.to(t('head'), { r: -8, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' })); }
        break;
      case 'walk': case 'run': {
        const k = name === 'run' ? 1.6 : 1, d = name === 'run' ? .19 : .3;
        gsap.to(this.st, { rot: name === 'run' ? 7 : 2, duration: .2 });
        add(gsap.fromTo(t('legF'), { r: 26 * k }, { r: -26 * k, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(t('legB'), { r: -26 * k }, { r: 26 * k, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(t('armF'), { r: -24 * k }, { r: 22 * k, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(t('armB'), { r: 22 * k }, { r: -24 * k, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(this.st, { lift: 0 }, { lift: 5 * k, duration: d / 2, yoyo: true, repeat: -1, ease: 'sine.out' }),
          tailSway(d * 2, 14), scarf(d * 2, 18));
        break;
      }
      case 'jump': case 'cheer': {
        const arms = name === 'cheer' ? -165 : -120;
        gsap.to(t('armF'), { r: arms, duration: .25 }); gsap.to(t('armB'), { r: arms + 15, duration: .25 });
        tl.to(this.st, { squash: .86, duration: .14, ease: 'power2.out' })
          .to(this.st, { squash: 1.08, lift: name === 'cheer' ? 34 : 60, duration: .28, ease: 'power2.out' })
          .to(t('legF'), { r: -30, duration: .2 }, '<').to(t('legB'), { r: 20, duration: .2 }, '<')
          .to(this.st, { lift: 0, squash: 1, duration: .3, ease: 'power2.in' })
          .to(t('legF'), { r: 0, duration: .2 }, '<').to(t('legB'), { r: 0, duration: .2 }, '<')
          .to(this.st, { squash: .92, duration: .08, yoyo: true, repeat: 1 })
          .to({}, { duration: name === 'cheer' ? .25 : .8 });
        add(tailSway(.5, 18), scarf(.5, 16));
        break;
      }
      case 'sit': case 'sleep': {
        gsap.to(this.st, { lift: -34, duration: .35 });
        gsap.to(t('legF'), { r: -82, duration: .35 }); gsap.to(t('legB'), { r: -70, duration: .35 });
        gsap.to(t('armF'), { r: -24, duration: .35 }); gsap.to(t('armB'), { r: -10, duration: .35 });
        add(breathe(), tailSway(2.2, 5), scarf(2, 5));
        if (name === 'sleep') { gsap.to(t('head'), { r: 16, duration: .8 }); add(gsap.fromTo(t('head'), { r: 14 }, { r: 19, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })); }
        break;
      }
      case 'wave':
        gsap.to(t('armF'), { r: -150, duration: .3 });
        add(gsap.fromTo(t('armF'), { r: -135 }, { r: -170, duration: .22, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: .3 }), tailSway(.8, 10), breathe());
        break;
      case 'stretch':
        tl.to(t('armF'), { r: -172, duration: .7, ease: 'power2.out' }, 0).to(t('armB'), { r: -160, duration: .7, ease: 'power2.out' }, 0)
          .to(t('torso'), { sy: 1.08, duration: .7 }, 0).to(this.st, { lift: 6, duration: .7 }, 0)
          .to({}, { duration: 1.4 }).to(t('torso'), { sy: 1, duration: .5 }).to(this.st, { lift: 0, duration: .5 }, '<');
        tl.repeat(0);
        break;
      case 'think':
        gsap.to(t('armF'), { r: -145, duration: .4 }); gsap.to(t('head'), { r: -8, duration: .5 });
        add(tailSway(2, 6), breathe());
        break;
      case 'point':
        gsap.to(t('armF'), { r: -100, duration: .3, ease: 'back.out(2)' });
        add(gsap.to(t('armF'), { r: -94, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: .3 }), tailSway(), breathe());
        break;
      case 'sad':
        gsap.to(t('head'), { r: 14, duration: .8 }); gsap.to(this.st, { lift: -34, duration: .5 });
        gsap.to(t('legF'), { r: -82, duration: .5 }); gsap.to(t('legB'), { r: -70, duration: .5 });
        gsap.to(t('armF'), { r: -60, duration: .5 }); gsap.to(t('armB'), { r: -50, duration: .5 });
        add(gsap.fromTo(t('torso'), { sy: 1 }, { sy: .97, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        break;
      case 'cry':
        gsap.to(t('armF'), { r: -150, duration: .4 }); gsap.to(t('head'), { r: 10, duration: .4 });
        add(gsap.fromTo(t('torso'), { sy: 1 }, { sy: .96, duration: .25, yoyo: true, repeat: -1 }));
        break;
      case 'scared': case 'hide':
        gsap.to(t('armF'), { r: -150, duration: .25 }); gsap.to(t('armB'), { r: -140, duration: .25 });
        gsap.to(this.st, { squash: .94, duration: .25 }); gsap.to(t('head'), { r: 8, duration: .3 });
        add(gsap.fromTo(this.st, { rot: -1.6 }, { rot: 1.6, duration: .06, yoyo: true, repeat: -1 }), gsap.to(t('tail'), { r: 30, duration: .3 }));
        break;
      case 'hug':
        gsap.to(t('armF'), { r: -82, duration: .4 }); gsap.to(t('armB'), { r: -76, duration: .4 }); gsap.to(t('head'), { r: 6, duration: .4 });
        add(gsap.fromTo(this.st, { rot: 1 }, { rot: -1, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }), tailSway(2, 6));
        break;
      case 'eat':
        add(gsap.fromTo(t('armF'), { r: -120 }, { r: -150, duration: .3, yoyo: true, repeat: -1, ease: 'sine.inOut' }), tailSway(.9, 10),
          gsap.fromTo(t('head'), { r: -2 }, { r: 3, duration: .15, yoyo: true, repeat: -1 }));
        break;
      case 'fall':
        tl.to(this.st, { rot: -200, duration: .55, ease: 'power1.in' }).to(this.st, { rot: -360, duration: .3 })
          .set(this.st, { rot: 0 }).to(this.st, { squash: .8, duration: .08, yoyo: true, repeat: 1 });
        tl.repeat(0);
        break;
      case 'climb':
        add(gsap.fromTo(t('armF'), { r: -170 }, { r: -130, duration: .35, yoyo: true, repeat: -1 }),
          gsap.fromTo(t('armB'), { r: -130 }, { r: -170, duration: .35, yoyo: true, repeat: -1 }),
          gsap.fromTo(t('legF'), { r: -40 }, { r: 0, duration: .35, yoyo: true, repeat: -1 }));
        break;
      case 'nod':
        tl.to(t('head'), { r: 12, duration: .18, yoyo: true, repeat: 3, ease: 'sine.inOut' }).to({}, { duration: 1.2 });
        add(breathe());
        break;
      case 'shake':
        tl.to(t('face'), { x: -10, duration: .14 }).to(t('face'), { x: 8, duration: .16, yoyo: true, repeat: 3 }).to(t('face'), { x: 0, duration: .14 }).to({}, { duration: 1.4 });
        break;
      case 'clap':
        add(gsap.fromTo(t('armF'), { r: -70 }, { r: -100, duration: .14, yoyo: true, repeat: -1 }),
          gsap.fromTo(t('armB'), { r: -100 }, { r: -70, duration: .14, yoyo: true, repeat: -1 }),
          gsap.fromTo(this.st, { lift: 0 }, { lift: 6, duration: .28, yoyo: true, repeat: -1 }));
        break;
      default:
        add(breathe(), tailSway());
    }
    return tl;
  }
}

/* ===================================================================== burung pipit */

interface BirdLook { id: CastId; name: string; scale: number; body: string; wing: string; dark: string; belly: string; beak: string; duck?: boolean }
const CICI: BirdLook = { id: 'cici', name: 'Cici', scale: 1.4, body: '#b07a48', wing: '#8a5a34', dark: '#7a4c2c', belly: '#f3e1c2', beak: '#e8a03a' };
const DODO: BirdLook = { id: 'dodo', name: 'Dodo', scale: 1.75, body: '#f4d778', wing: '#e8c25a', dark: '#d2a640', belly: '#fdf2c4', beak: '#ee9a3c', duck: true };
class Bird extends Actor {
  constructor(private skin: BirdLook = CICI) {
    super({ id: skin.id, name: skin.name, height: 52, scale: skin.scale, pivots: { body: [0, 0], head: [6, -30], face: [0, 0], wingB: [-2, -26], wingF: [0, -24], tail: [-14, -18], legs: [0, -8] },
      markup: `
        <g data-part="legs">${P('M-3 0 L-4 8 M3 0 L4 8 M-7 8 h6 M1 8 h6', 'none', 1.6)}</g>
        <g data-part="tail">${P('M0 0 L-18 -4 L-16 4 L-20 10 Z', skin.wing, 1.6)}</g>
        <g data-part="wingB">${P('M0 0 Q-16 -6 -20 6 Q-8 8 0 4 Z', skin.dark, 1.4)}</g>
        <g data-part="body">${P('M-16 -18 Q-18 -38 2 -40 Q20 -40 20 -22 Q20 -6 2 -6 Q-14 -6 -16 -18 Z', skin.body, 2)}${P('M-2 -10 Q14 -8 16 -24 Q10 -14 -2 -14 Z', skin.belly, 1.2)}</g>
        <g data-part="head">${P('M-10 0 Q-12 -22 6 -22 Q20 -20 18 -4 Q16 8 2 8 Q-10 8 -10 0 Z', skin.body, 2)}${P('M-6 -18 Q2 -26 12 -18', 'none', 1.2, 'stroke="${skin.dark}"')}
          <g data-part="face"><g data-face></g></g></g>
        <g data-part="wingF">${P('M0 0 Q-20 -8 -24 8 Q-10 12 2 6 Z', skin.wing, 1.6)}${P('M-18 4 l6 -2 M-12 6 l6 -2', 'none', 1)}</g>` });
    this.drawFace(); this.render();
  }
  protected faceMarkup(e: Expr) {
    const ex = EXPR[e];
    const eye = ex.eyes === 'closed' || ex.eyes === 'happy' ? P(`M5 -7 q3 ${ex.eyes === 'happy' ? -4 : 3} 6 0`, 'none', 1.8)
      : ex.eyes === 'wide' ? `<circle cx="8" cy="-7" r="4.4" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cx="9" cy="-6.5" r="2" fill="${INK}"/>`
        : `<circle cx="8" cy="-7" r="3" fill="${INK}"/><circle cx="9" cy="-8" r="1" fill="#fff"/>`;
    const brow = ex.brows === 'worried' || ex.brows === 'sad' ? P('M3 -13 L12 -11', 'none', 1.4) : ex.brows === 'brave' ? P('M3 -11 L12 -13', 'none', 1.6) : '';
    const open = ex.mouth === 'joy' || ex.mouth === 'o' || ex.mouth === 'cry';
    return `<g class="eyes">${eye}</g>${brow}<g class="mouth">${this.skin.duck
      ? P(open ? 'M15 -7 Q26 -9 31 -4 Q26 -1 15 -1 Z M15 0 Q25 0 29 3 Q24 6 15 4 Z' : 'M15 -6 Q27 -8 32 -2 Q27 3 15 2 Z', this.skin.beak, 1.3)
      : P(open ? 'M16 -6 L26 -3 L16 0 Z M16 0 L23 3 L16 3 Z' : 'M16 -5 L26 -2 L16 1 Z', this.skin.beak, 1.3)}</g>${ex.blush ? '<circle cx="4" cy="0" r="3" fill="#e98b7a" opacity=".6"/>' : ''}`;
  }
  protected buildPose(name: Pose) {
    const tl = gsap.timeline({ repeat: -1 });
    const t = this.p.bind(this);
    const add = (...tw: gsap.core.Tween[]) => tw.forEach((w) => tl.add(w, 0));
    switch (name) {
      case 'fly':
        gsap.to(this.st, { lift: 18, duration: .3 });
        add(gsap.fromTo(t('wingF'), { r: -60 }, { r: 30, duration: .08, yoyo: true, repeat: -1 }), gsap.fromTo(t('wingB'), { r: -50 }, { r: 30, duration: .08, yoyo: true, repeat: -1 }),
          gsap.to(t('legs'), { r: -30, duration: .2 }), gsap.fromTo(this.st, { rot: -4 }, { rot: 4, duration: .4, yoyo: true, repeat: -1 }));
        break;
      case 'hop': case 'cheer': case 'jump':
        tl.to(this.st, { lift: 14, duration: .16, ease: 'power2.out' }).to(this.st, { lift: 0, duration: .16, ease: 'power2.in' })
          .to(t('wingF'), { r: -40, duration: .1, yoyo: true, repeat: 1 }, 0).to({}, { duration: .4 });
        break;
      case 'talk':
        add(gsap.fromTo(t('head'), { r: -8 }, { r: 6, duration: .25, yoyo: true, repeat: -1 }), gsap.fromTo(t('tail'), { r: -10 }, { r: 10, duration: .3, yoyo: true, repeat: -1 }));
        break;
      case 'hide': case 'scared':
        gsap.to(t('wingF'), { r: -100, x: 10, y: -10, duration: .3 }); gsap.to(this.st, { squash: .88, duration: .3 });
        add(gsap.fromTo(this.st, { rot: -3 }, { rot: 3, duration: .05, yoyo: true, repeat: -1 }));
        break;
      default:
        tl.to(t('head'), { r: -14, duration: .15 }).to({}, { duration: .9 }).to(t('head'), { r: 8, duration: .15 }).to({}, { duration: .8 })
          .to(t('head'), { r: 0, duration: .15 }).to(t('tail'), { r: 14, duration: .1, yoyo: true, repeat: 3 }).to({}, { duration: .9 });
        add(gsap.fromTo(t('body'), { sy: 1 }, { sy: 1.04, duration: .9, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    }
    return tl;
  }
}

/* ===================================================================== kura-kura */

class Turtle extends Actor {
  constructor() {
    super({ id: 'kura', name: 'Nenek Kura', height: 110, scale: 1.25, pivots: { legBB: [-34, -14], legBF: [24, -14], shell: [0, 0], legFB: [-22, -10], legFF: [36, -10], neck: [44, -38], head: [22, -24], face: [0, 0], tail: [-50, -16] },
      markup: `
        <g data-part="legBB">${P('M-7 0 Q-8 14 -6 18 H8 Q8 12 6 0 Z', '#9db872', 1.8)}</g>
        <g data-part="legBF">${P('M-7 0 Q-8 14 -6 18 H8 Q8 12 6 0 Z', '#9db872', 1.8)}</g>
        <g data-part="tail">${P('M0 0 L-14 4 L0 8 Z', '#9db872', 1.6)}</g>
        <g data-part="neck">${P('M-10 4 Q4 -6 14 -18 L26 -10 Q14 6 2 14 Z', '#9db872', 1.8)}
          <g data-part="head">${P('M-14 0 Q-16 -24 6 -26 Q28 -24 28 -6 Q28 8 8 10 Q-12 10 -14 0 Z', '#a9c27e', 2)}
            <g data-part="face"><g data-face></g></g>
            <g class="glasses"><circle cx="6" cy="-12" r="7" fill="#fff" fill-opacity=".3" stroke="${INK}" stroke-width="1.5"/><circle cx="20" cy="-12" r="7" fill="#fff" fill-opacity=".3" stroke="${INK}" stroke-width="1.5"/>${P('M12 -12 h2', 'none', 1.4)}</g></g></g>
        <g data-part="shell">${P('M-58 -14 Q-56 -86 0 -88 Q56 -86 58 -14 Z', '#a8774a', 2.4)}
          ${P('M-30 -16 L-36 -48 L-12 -68 L14 -68 L36 -48 L30 -16 M-36 -48 L-56 -40 M36 -48 L56 -40 M-12 -68 L-14 -86 M14 -68 L14 -86 M-12 -38 h26 M-12 -38 L-24 -16 M14 -38 L26 -16', 'none', 1.5)}
          ${P('M-62 -14 H62 Q60 -4 50 -4 H-50 Q-60 -4 -62 -14 Z', '#c9a86c', 1.8)}
          <g transform="translate(-6 -92)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6" rx="3.4" ry="6" transform="rotate(${a})" fill="#f2c6d4" stroke="${INK}" stroke-width="1"/>`).join('')}<circle r="3" fill="#f2c94c" stroke="${INK}" stroke-width="1"/></g></g>
        <g data-part="legFB">${P('M-7 0 Q-8 14 -6 18 H8 Q8 12 6 0 Z', '#a9c27e', 1.8)}</g>
        <g data-part="legFF">${P('M-7 0 Q-8 14 -6 18 H8 Q8 12 6 0 Z', '#a9c27e', 1.8)}</g>` });
    this.drawFace(); this.render();
  }
  protected faceMarkup(e: Expr) {
    const ex = EXPR[e];
    const eye = (x: number) => ex.eyes === 'closed' ? P(`M${x - 3} -12 q3 3 6 0`, 'none', 1.6) : ex.eyes === 'happy' ? P(`M${x - 3} -11 q3 -4 6 0`, 'none', 1.8) : `<circle cx="${x}" cy="-12" r="2.6" fill="${INK}"/>`;
    const mouth = ex.mouth === 'sad' || ex.mouth === 'cry' ? P('M8 2 Q16 -2 24 2', 'none', 1.6) : ex.mouth === 'o' ? '<ellipse cx="18" cy="1" rx="3" ry="3.4" fill="#7a2a1e"/>' : P('M8 0 Q16 6 24 0', 'none', 1.8);
    return `<g class="eyes">${eye(6)}${eye(20)}</g>${P('M0 -22 q6 -3 12 0 M14 -22 q6 -3 12 0', 'none', 1.6, 'stroke="#f4efe4"')}<g class="mouth">${mouth}</g>${ex.blush ? '<circle cx="-2" cy="-2" r="3.5" fill="#e98b7a" opacity=".5"/>' : ''}`;
  }
  protected buildPose(name: Pose) {
    const tl = gsap.timeline({ repeat: -1 });
    const t = this.p.bind(this);
    const add = (...tw: gsap.core.Tween[]) => tw.forEach((w) => tl.add(w, 0));
    switch (name) {
      case 'walk': case 'run':
        add(gsap.fromTo(t('legFF'), { r: -18 }, { r: 18, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('legBB'), { r: -18 }, { r: 18, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(t('legFB'), { r: 18 }, { r: -18, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('legBF'), { r: 18 }, { r: -18, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(this.st, { lift: 0 }, { lift: 3, duration: .3, yoyo: true, repeat: -1 }), gsap.fromTo(t('neck'), { r: -4 }, { r: 4, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        break;
      case 'nod':
        tl.to(t('neck'), { r: 10, duration: .3, yoyo: true, repeat: 3, ease: 'sine.inOut' }).to({}, { duration: 1.5 });
        break;
      case 'talk':
        add(gsap.fromTo(t('neck'), { r: -3 }, { r: 5, duration: .5, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        break;
      case 'hide': case 'scared':
        gsap.to(t('neck'), { x: -40, y: 10, duration: .4 });
        break;
      default:
        add(gsap.fromTo(t('neck'), { r: -2, x: 0 }, { r: 3, x: 3, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('shell'), { sy: 1 }, { sy: 1.015, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    }
    return tl;
  }
}


/* ===================================================================== anak badak */

const RH = '#a3a7ab', RH_D = '#8b9095', RH_L = '#c4c7ca';
class Rhino extends Actor {
  constructor() {
    super({ id: 'kiko', name: 'Kiko', height: 150, scale: 1.25, pivots: { legBB: [-52, -30], legBF: [-30, -30], tail: [-74, -66], body: [0, -30], legFB: [34, -30], legFF: [56, -30], head: [70, -74], face: [0, 0], ear: [0, 0] },
      markup: `
        <g data-part="legBB">${P('M-13 -22 Q-16 10 -14 28 Q0 34 14 28 Q16 10 12 -22 Z', RH_D, 2)}${P('M-8 28 v-4 M0 30 v-5 M8 28 v-4', 'none', 1.1)}</g>
        <g data-part="legFB">${P('M-13 -22 Q-16 10 -14 28 Q0 34 14 28 Q16 10 12 -22 Z', RH_D, 2)}${P('M-8 28 v-4 M0 30 v-5 M8 28 v-4', 'none', 1.1)}</g>
        <g data-part="tail">${P('M0 0 Q-14 6 -14 20', 'none', 3, `stroke="${RH_D}"`)}${P('M-17 18 l3 8 l4 -7 Z', INK, 1)}</g>
        <g data-part="body">${P('M-84 -2 Q-92 -70 -30 -80 Q30 -88 70 -60 Q92 -40 84 -6 Q78 16 30 18 L-50 18 Q-82 14 -84 -2 Z', RH, 2.4)}
          ${P('M-40 -66 Q-10 -76 22 -70 M-60 -20 q10 8 22 6 M40 -12 q10 6 22 2', 'none', 1.3, 'opacity=".55"')}
          ${P('M-50 12 Q0 22 50 12', 'none', 1.2, `stroke="${RH_D}"`)}</g>
        <g data-part="legBF">${P('M-14 -24 Q-17 10 -15 28 Q0 35 15 28 Q17 10 13 -24 Z', RH, 2)}${P('M-9 28 v-4 M0 30 v-5 M9 28 v-4', 'none', 1.1)}</g>
        <g data-part="legFF">${P('M-14 -24 Q-17 10 -15 28 Q0 35 15 28 Q17 10 13 -24 Z', RH, 2)}${P('M-9 28 v-4 M0 30 v-5 M9 28 v-4', 'none', 1.1)}</g>
        <g data-part="head">
          <g data-part="ear">${P('M-14 -30 Q-24 -60 -4 -56 Q2 -42 -4 -30 Z', RH_L, 1.8)}${P('M-10 -36 Q-14 -50 -8 -50', 'none', 1)}</g>
          ${P('M-26 -10 Q-30 -42 4 -44 Q40 -46 58 -24 Q66 -10 60 4 Q50 18 22 18 Q-18 20 -26 -10 Z', RH_L, 2.2)}
          ${P('M44 -24 Q50 -54 62 -66 Q64 -40 58 -20 Z', '#efe6d2', 2)}${P('M24 -34 Q28 -46 34 -50 Q36 -40 32 -32 Z', '#efe6d2', 1.6)}
          ${P('M52 4 q4 -3 8 0', 'none', 1.4)}
          <g data-part="face"><g data-face></g></g></g>` });
    this.drawFace(); this.render();
  }
  protected faceMarkup(e: Expr) {
    const ex = EXPR[e];
    const eye = (x: number) => ex.eyes === 'closed' ? P(`M${x - 4} -18 q4 4 8 0`, 'none', 1.8) : ex.eyes === 'happy' ? P(`M${x - 4} -17 q4 -5 8 0`, 'none', 2)
      : ex.eyes === 'wide' ? `<circle cx="${x}" cy="-18" r="5.6" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cx="${x + 1}" cy="-17.4" r="2.6" fill="${INK}"/>`
        : `<circle cx="${x}" cy="-18" r="3.8" fill="${INK}"/><circle cx="${x + 1.2}" cy="-19.4" r="1.2" fill="#fff"/>`;
    const brow = ex.brows === 'worried' || ex.brows === 'sad' ? P('M4 -28 L14 -25', 'none', 1.6) : ex.brows === 'brave' ? P('M4 -25 L14 -29', 'none', 1.8) : '';
    const mouth = ex.mouth === 'joy' || ex.mouth === 'grin' ? P('M22 2 Q34 14 46 4 Z', '#7a2a1e', 1.4) : ex.mouth === 'o' ? '<ellipse cx="34" cy="6" rx="4" ry="5" fill="#7a2a1e"/>'
      : ex.mouth === 'sad' || ex.mouth === 'cry' ? P('M24 10 Q34 2 44 10', 'none', 1.8) : P('M24 4 Q34 12 44 4', 'none', 1.8);
    const tear = e === 'cry' || e === 'sad' ? `<path d="M8 -12 q-4 8 0 11 q4 -3 0 -11 Z" fill="#9fd3e6" stroke="${INK}" stroke-width=".9"/>` : '';
    return `<g class="eyes">${eye(10)}</g>${brow}<g class="mouth">${mouth}</g>${tear}${ex.blush ? '<circle cx="16" cy="-4" r="5" fill="#e98b7a" opacity=".5"/>' : ''}`;
  }
  protected buildPose(name: Pose) {
    const tl = gsap.timeline({ repeat: -1 });
    const t = this.p.bind(this);
    const add = (...tw: gsap.core.Tween[]) => tw.forEach((w) => tl.add(w, 0));
    const legs = (d: number, a: number) => add(gsap.fromTo(t('legFF'), { r: -a }, { r: a, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('legBB'), { r: -a }, { r: a, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
      gsap.fromTo(t('legFB'), { r: a }, { r: -a, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('legBF'), { r: a }, { r: -a, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    switch (name) {
      case 'walk': legs(.45, 16); add(gsap.fromTo(this.st, { lift: 0 }, { lift: 4, duration: .225, yoyo: true, repeat: -1 }), gsap.fromTo(t('head'), { r: -3 }, { r: 3, duration: .45, yoyo: true, repeat: -1, ease: 'sine.inOut' })); break;
      case 'run': legs(.22, 26); add(gsap.fromTo(this.st, { lift: 0 }, { lift: 10, duration: .11, yoyo: true, repeat: -1 })); break;
      case 'jump': case 'cheer': case 'hop':
        tl.to(this.st, { lift: 34, squash: .94, duration: .28, ease: 'power2.out' }).to(this.st, { lift: 0, squash: 1.06, duration: .22, ease: 'power2.in' }).to(this.st, { squash: 1, duration: .14 });
        add(gsap.to(t('tail'), { r: 30, duration: .2, yoyo: true, repeat: 3 }));
        break;
      case 'fall':
        gsap.to(this.st, { rot: 18, duration: .25, ease: 'power2.in' }); gsap.to(t('head'), { r: 24, y: 12, duration: .25 }); gsap.to(t('legFF'), { r: -50, duration: .25 }); gsap.to(t('legFB'), { r: -40, duration: .25 });
        break;
      case 'push':
        gsap.to(t('head'), { r: 10, x: 6, duration: .4 }); gsap.to(this.st, { rot: 6, duration: .4 });
        legs(.5, 8); add(gsap.fromTo(t('body'), { x: 0 }, { x: 3, duration: .12, yoyo: true, repeat: -1 }));
        break;
      case 'sad': case 'cry': case 'sit': case 'sleep':
        gsap.to(t('head'), { r: 16, y: 10, duration: .6 }); gsap.to(t('ear'), { r: 26, duration: .6 });
        add(gsap.fromTo(t('body'), { sy: 1 }, { sy: 1.02, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        break;
      case 'scared': case 'hide':
        gsap.to(t('head'), { r: -10, x: -8, duration: .3 }); add(gsap.fromTo(this.st, { squash: 1 }, { squash: .97, duration: .08, yoyo: true, repeat: -1 }));
        break;
      case 'talk': case 'nod':
        add(gsap.fromTo(t('head'), { r: -4 }, { r: 6, duration: .45, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('ear'), { r: 0 }, { r: -12, duration: .3, yoyo: true, repeat: -1 }));
        break;
      default:
        add(gsap.fromTo(t('head'), { r: -2 }, { r: 3, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('body'), { sy: 1 }, { sy: 1.015, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(t('ear'), { r: 0 }, { r: -18, duration: .18, yoyo: true, repeat: 1, repeatDelay: 3.2 }), gsap.fromTo(t('tail'), { r: -8 }, { r: 10, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    }
    return tl;
  }
}

/* ===================================================================== kunang-kunang */

/** Seberapa terang cahaya Pipi untuk tiap perasaan: takut = redup, berani = terang. */
const GLOW: Partial<Record<Expr, number>> = { cry: .12, sad: .16, scared: .14, worried: .3, sleepy: .3, calm: .5, curious: .55, surprised: .6, dizzy: .4, happy: .8, wink: .85, dream: .7, joy: 1, brave: 1 };

class Firefly extends Actor {
  constructor() {
    super({ id: 'pipi', name: 'Pipi', height: 46, scale: 1.55, pivots: { glow: [-16, -14], wingB: [-2, -30], tail: [-8, -20], body: [0, 0], head: [12, -28], face: [0, 0], wingF: [0, -30], legs: [2, -6] },
      markup: `
        <defs><radialGradient id="pipiGlow"><stop offset="0" stop-color="#fffbd0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffe46a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>
        <g data-part="glow"><g class="pipi-glow" opacity=".8"><circle class="ff-glow" r="64" fill="url(#pipiGlow)"/></g></g>
        <g data-part="legs">${P('M-4 0 l-3 7 M2 0 l0 8 M7 0 l3 7', 'none', 1.4)}</g>
        <g data-part="wingB">${P('M0 0 Q-8 -30 -30 -28 Q-24 -6 0 0 Z', '#ffffff', 1.2, 'fill-opacity=".5"')}</g>
        <g data-part="tail">${P('M2 -8 Q-22 -12 -26 4 Q-18 20 2 12 Z', '#ffe46a', 1.8)}${P('M-8 -8 q-3 10 0 20 M-17 -4 q-2 8 0 14', 'none', 1, 'opacity=".5"')}</g>
        <g data-part="body">${P('M-12 -12 Q-10 -30 6 -30 Q18 -28 16 -14 Q14 -4 2 -4 Q-10 -4 -12 -12 Z', '#6b4f3a', 2)}${P('M-4 -8 Q8 -6 12 -18', 'none', 1, 'opacity=".4"')}</g>
        <g data-part="head">${P('M2 -18 Q0 -32 -8 -35 M10 -18 Q14 -31 23 -31', 'none', 1.5)}<circle cx="-8" cy="-35" r="2.2" fill="#ffe46a" stroke="${INK}" stroke-width="1"/><circle cx="23" cy="-31" r="2.2" fill="#ffe46a" stroke="${INK}" stroke-width="1"/>
          ${P('M-11 0 Q-13 -21 6 -21 Q21 -19 19 -3 Q17 10 2 10 Q-11 10 -11 0 Z', '#8a6a4c', 2)}
          <g data-part="face"><g data-face></g></g></g>
        <g data-part="wingF">${P('M0 0 Q-14 -36 -38 -30 Q-28 -4 0 0 Z', '#ffffff', 1.4, 'fill-opacity=".72"')}${P('M-6 -6 Q-16 -22 -30 -24', 'none', .9, 'opacity=".5"')}</g>` });
    this.drawFace(); this.render();
  }
  expr(e: Expr) {
    super.expr(e);
    const lvl = GLOW[e] ?? .6;
    const g = this.g.querySelector('.pipi-glow');
    if (g) gsap.to(g, { opacity: lvl, duration: 1.1, ease: 'power2.out' });
    gsap.to(this.p('glow'), { sx: .45 + lvl * .9, sy: .45 + lvl * .9, duration: 1.1, ease: 'power2.out' });
  }
  protected faceMarkup(e: Expr) {
    const ex = EXPR[e];
    const eye = (x: number) => ex.eyes === 'closed' ? P(`M${x - 3} -6 q3 3 6 0`, 'none', 1.6) : ex.eyes === 'happy' ? P(`M${x - 3} -5 q3 -5 6 0`, 'none', 1.8)
      : ex.eyes === 'wide' ? `<circle cx="${x}" cy="-6" r="4.6" fill="#fff" stroke="${INK}" stroke-width="1.3"/><circle cx="${x + .6}" cy="-5.6" r="2.2" fill="${INK}"/>`
        : `<circle cx="${x}" cy="-6" r="3.4" fill="${INK}"/><circle cx="${x + 1}" cy="-7.2" r="1.1" fill="#fff"/>`;
    const brow = ex.brows === 'worried' || ex.brows === 'sad' ? P('M-3 -14 L4 -11 M17 -13 L10 -11', 'none', 1.3) : ex.brows === 'brave' ? P('M-3 -11 L4 -13 M17 -12 L10 -13', 'none', 1.5) : '';
    const mouth = ex.mouth === 'joy' || ex.mouth === 'grin' ? P('M3 2 Q8 9 13 2 Z', '#7a2a1e', 1.2) : ex.mouth === 'o' ? '<ellipse cx="8" cy="4" rx="2.4" ry="3" fill="#7a2a1e"/>'
      : ex.mouth === 'sad' || ex.mouth === 'cry' ? P('M4 6 Q8 2 12 6', 'none', 1.5) : P('M4 3 Q8 7 12 3', 'none', 1.5);
    const tear = e === 'cry' || e === 'sad' ? `<path d="M-1 -1 q-3 6 0 8 q3 -2 0 -8 Z" fill="#9fd3e6" stroke="${INK}" stroke-width=".8"/>${e === 'cry' ? `<path d="M15 0 q-3 6 0 8 q3 -2 0 -8 Z" fill="#9fd3e6" stroke="${INK}" stroke-width=".8"/>` : ''}` : '';
    return `<g class="eyes">${eye(1)}${eye(13)}</g>${brow}<g class="mouth">${mouth}</g>${tear}${ex.blush ? '<circle cx="-5" cy="1" r="2.8" fill="#e98b7a" opacity=".6"/><circle cx="18" cy="1" r="2.8" fill="#e98b7a" opacity=".6"/>' : ''}`;
  }
  protected buildPose(name: Pose) {
    const tl = gsap.timeline({ repeat: -1 });
    const t = this.p.bind(this);
    const add = (...tw: gsap.core.Tween[]) => tw.forEach((w) => tl.add(w, 0));
    const flap = (d: number) => [gsap.fromTo(t('wingF'), { r: -34 }, { r: 26, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(t('wingB'), { r: -26 }, { r: 30, duration: d, yoyo: true, repeat: -1, ease: 'sine.inOut' })];
    switch (name) {
      case 'sad': case 'cry': case 'hide': case 'scared': case 'sit': case 'sleep':
        gsap.to(this.st, { squash: .9, duration: .4 }); gsap.to(t('head'), { r: 14, y: 3, duration: .4 });
        add(...flap(.5), gsap.fromTo(this.st, { lift: 0 }, { lift: 3, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        if (name !== 'sit' && name !== 'sleep') add(gsap.fromTo(this.st, { rot: -2.5 }, { rot: 2.5, duration: .07, yoyo: true, repeat: -1 }));
        break;
      case 'cheer': case 'jump': case 'hop': case 'clap':
        add(...flap(.05));
        tl.to(this.st, { lift: 34, duration: .28, ease: 'power2.out' }, 0).to(this.st, { rot: 360, duration: .5, ease: 'power1.inOut' }, .1).set(this.st, { rot: 0 }).to(this.st, { lift: 6, duration: .3, ease: 'power2.in' }, .5).to({}, { duration: .35 });
        break;
      case 'stretch':
        add(...flap(.2));
        tl.to(this.st, { squash: 1.14, lift: 12, duration: 1.3, ease: 'sine.inOut' }).to({}, { duration: .5 }).to(this.st, { squash: .94, lift: 4, duration: 1.2, ease: 'sine.inOut' }).to({}, { duration: .4 });
        break;
      default:
        add(...flap(.06), gsap.fromTo(this.st, { lift: 4 }, { lift: 16, duration: .9, yoyo: true, repeat: -1, ease: 'sine.inOut' }), gsap.fromTo(this.st, { rot: -4 }, { rot: 4, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
          gsap.fromTo(t('tail'), { r: -6 }, { r: 8, duration: .7, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    }
    return tl;
  }
}

/* ===================================================================== pabrik */

export type AnyActor = Actor & { accessory?: (n: 'scarf' | 'pack' | 'lamp', on: boolean) => void };
export function makeActor(id: CastId): AnyActor {
  switch (id) {
    case 'momo': return new Monkey('momo', 'Momo', { fur: '#9b6234', furDark: '#8a5530', skin: '#e8bf90' }, 1);
    case 'kakek': return new Monkey('kakek', 'Kakek Bobo', { fur: '#8b7360', furDark: '#77614f', skin: '#e3c9a3', elder: true, pack: false }, 1.16);
    case 'cici': return new Bird();
    case 'kura': return new Turtle();
    case 'pipi': return new Firefly();
    case 'dodo': return new Bird(DODO);
    case 'kiko': return new Rhino();
  }
}
import voices from '../../content/voices.json';
export const CAST_NAME = Object.fromEntries(Object.entries(voices.tokoh).map(([k, t]) => [k, t.nama])) as Record<CastId, string>;
