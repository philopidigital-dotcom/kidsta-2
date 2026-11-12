/**
 * Panggung 2.5D bergaya tinta di kertas. Tiap set = beberapa lapisan dengan faktor kedalaman f
 * (langit f≈0.08 hampir diam, panggung f=1 tempat tokoh berdiri, latar depan f>1 lewat lebih cepat).
 * Benda interaktif (pisang, daun, kunang-kunang) berada di lapisan panggung dengan data-item.
 */
import { P, pine, roundTree, flower, mushroom, rabbit, duck, deer } from '../../paper/ink';
import type { SetName } from './types';

const INK = '#3b2a1a';
export interface Layer { f: number; svg: string; cls?: string }
export interface SetDef { W: number; layers: Layer[]; spots: Record<string, [number, number]>; actorScale: number }
const H = 900;
const R = (n: number, i: number) => { const x = Math.sin(n * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------------- potongan umum ---------------- */
const sky = (W: number) => `
  <defs>
    <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd8dc"/><stop offset="1" stop-color="#f3ead2"/></linearGradient>
    <linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6fa3"/><stop offset=".55" stop-color="#e8a07a"/><stop offset="1" stop-color="#f6d48f"/></linearGradient>
    <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2a4a"/><stop offset="1" stop-color="#4a5a7a"/></linearGradient>
    <linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c6c4"/><stop offset="1" stop-color="#f8e3b4"/></linearGradient>
    <linearGradient id="skyCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9b3b8"/><stop offset="1" stop-color="#d9d6c8"/></linearGradient>
  </defs>
  <g class="sk sk-day"><rect x="-200" y="-100" width="${W + 400}" height="1100" fill="url(#skyDay)"/><g filter="url(#rough)"><circle cx="${W * .78}" cy="150" r="58" fill="#f6d36a" stroke="${INK}" stroke-width="2"/>${Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return P(`M${W * .78 + Math.cos(a) * 74} ${150 + Math.sin(a) * 74} L${W * .78 + Math.cos(a) * 92} ${150 + Math.sin(a) * 92}`, 'none', 2); }).join('')}</g></g>
  <g class="sk sk-dawn"><rect x="-200" y="-100" width="${W + 400}" height="1100" fill="url(#skyDawn)"/><circle cx="${W * .7}" cy="330" r="80" fill="#f6c27a" opacity=".85"/></g>
  <g class="sk sk-cloudy"><rect x="-200" y="-100" width="${W + 400}" height="1100" fill="url(#skyCloud)"/></g>
  <g class="sk sk-dusk"><rect x="-200" y="-100" width="${W + 400}" height="1100" fill="url(#skyDusk)"/><g filter="url(#rough)"><circle cx="${W * .3}" cy="300" r="74" fill="#f08a4b" stroke="${INK}" stroke-width="2"/></g></g>
  <g class="sk sk-night"><rect x="-200" y="-100" width="${W + 400}" height="1100" fill="url(#skyNight)"/>
    ${Array.from({ length: 70 }, (_, i) => `<circle class="star" cx="${(R(1, i) * (W + 200) - 100).toFixed(0)}" cy="${(R(2, i) * 520).toFixed(0)}" r="${(1 + R(3, i) * 2.2).toFixed(1)}" fill="#fff6d6" style="animation-delay:${(R(4, i) * 3).toFixed(2)}s"/>`).join('')}
    <g filter="url(#rough)"><path d="M${W * .74} 110 a60 60 0 1 0 50 90 a48 48 0 1 1 -50 -90 Z" fill="#fbf1c8" stroke="${INK}" stroke-width="2"/></g></g>
  <g filter="url(#rough)" class="clouds">${[[W * .15, 120, 1.2], [W * .48, 80, .9], [W * .9, 200, 1]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-90 20 Q-100 -10 -66 -14 Q-56 -50 -14 -40 Q10 -66 46 -40 Q90 -46 92 -8 Q112 10 84 22 Z', '#fbf6ea', 2, 'fill-opacity=".9"')}</g>`).join('')}</g>`;

const mountains = (W: number, y = 560) => `<g filter="url(#rough)">
  <path d="M-200 ${y} L${W * .08} ${y - 230} L${W * .18} ${y - 150} L${W * .32} ${y - 280} L${W * .46} ${y - 140} L${W * .6} ${y - 250} L${W * .76} ${y - 120} L${W * .9} ${y - 260} L${W + 200} ${y - 90} V${H + 100} H-200 Z" fill="#a9b8c4" stroke="${INK}" stroke-width="1.8" opacity=".75"/>
  ${[[.08, 230], [.32, 280], [.6, 250], [.9, 260]].map(([fx, h]) => P(`M${W * fx - 30} ${y - h + 38} L${W * fx} ${y - h} L${W * fx + 30} ${y - h + 38} Q${W * fx + 12} ${y - h + 30} ${W * fx} ${y - h + 44} Q${W * fx - 12} ${y - h + 30} ${W * fx - 30} ${y - h + 38} Z`, '#fbf6ea', 1.4)).join('')}</g>
  <rect x="-200" y="${y - 40}" width="${W + 400}" height="80" fill="#f3ecdc" opacity=".45"/>`;

const canopyRow = (W: number, y: number, r: number, cols: string[], seed: number, gap = 1.25) => {
  let out = ''; let x = -120; let i = 0;
  while (x < W + 160) {
    const rr = r * (.75 + R(seed, i) * .5), c = cols[i % cols.length];
    out += P(`M${x - rr} ${y + 20} Q${x - rr * 1.1} ${y - rr * .9} ${x - rr * .2} ${y - rr} Q${x + rr * .5} ${y - rr * 1.3} ${x + rr} ${y - rr * .4} Q${x + rr * 1.2} ${y + 10} ${x + rr} ${y + 30} Z`, c, 1.8);
    out += P(`M${x - rr * .4} ${y - rr * .45} q${rr * .15} ${-rr * .12} ${rr * .3} 0 M${x + rr * .1} ${y - rr * .7} q${rr * .15} ${-rr * .12} ${rr * .3} 0`, 'none', 1.1);
    x += rr * gap; i++;
  }
  return `<g filter="url(#rough)">${out}</g>`;
};
const grass = (x0: number, x1: number, y: number, n: number, seed: number) => Array.from({ length: n }, (_, i) => {
  const x = x0 + (x1 - x0) * (i / n) + R(seed, i) * 30, yy = y + R(seed + 1, i) * 40;
  return P(`M${x} ${yy} l-5 -16 M${x + 7} ${yy} l2 -20 M${x + 14} ${yy} l7 -15`, 'none', 1.4);
}).join('');
const fern = (x: number, y: number, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})">${P('M0 0 Q30 -80 110 -130', 'none', 2.4)}${Array.from({ length: 9 }, (_, i) => { const t = i / 9, px = t * 100, py = -t * 120 - Math.sin(t * 3) * 10; return P(`M${px} ${py} q${-10 - i} ${-18 + i} ${-28 + i * 2} ${-14} M${px} ${py} q${16 - i} ${10 - i} ${30 - i * 2} ${2}`, '#8fa66b', 1.4); }).join('')}</g>`;
const bigLeaf = (x: number, y: number, rot: number, s = 1, c = '#7f9a5e') => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${P('M0 0 Q60 -70 160 -40 Q90 30 0 0 Z', c, 2.2)}${P('M0 0 Q80 -30 150 -38 M40 -14 l14 -22 M80 -24 l14 -20 M110 -30 l10 -16', 'none', 1.2)}</g>`;
const banana = (x: number, y: number, r = 0, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${P('M-20 0 Q-22 -16 -8 -22 Q-14 -10 -6 -4 Q8 4 24 -6 Q20 8 4 10 Q-12 12 -20 0 Z', '#f2c94c', 1.8)}${P('M-8 -22 l-3 -5', 'none', 2.2)}${P('M-14 -4 Q2 4 18 -2', 'none', 1, 'opacity=".5"')}</g>`;
const goldLeaf = (x: number, y: number, r: number, s = 1, c = '#e2b33c') => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${P('M-16 0 Q-4 -14 16 -2 Q4 12 -16 0 Z', c, 1.6)}${P('M-16 0 L14 -1', 'none', 1)}</g>`;
const firefly = (x: number, y: number) => `<g transform="translate(${x} ${y})"><circle r="16" fill="#fff3a0" opacity=".35" class="ff-glow"/><ellipse cx="0" cy="0" rx="5" ry="3.5" fill="#f6e27a" stroke="${INK}" stroke-width="1.2"/><path d="M-2 -3 q-4 -6 -8 -2 M2 -3 q4 -6 8 -2" fill="#fff" fill-opacity=".6" stroke="${INK}" stroke-width=".9"/></g>`;
/** Pembungkus benda yang bisa diketuk: area sentuh lebar + cincin penanda. */
const item = (id: string, x: number, y: number, inner: string, r = 34) => `<g class="pp-item" data-item="${id}" transform="translate(${x} ${y})"><circle class="pp-item__hit" r="${r}" fill="transparent"/><circle class="pp-item__ring" r="${r - 4}" fill="none" stroke="#f6d36a" stroke-width="3"/>${inner}<g class="pp-item__num"></g></g>`;

/* =====================================================================  KAMAR  */
function kamar(): SetDef {
  const W = 1600;
  const planks = Array.from({ length: 26 }, (_, i) => { const x = i * 64; return P(`M${x} -60 V720`, 'none', 1.4, 'opacity=".55"') + (R(5, i) > .6 ? `<ellipse cx="${x + 30}" cy="${120 + R(6, i) * 480}" rx="6" ry="4" fill="none" stroke="${INK}" stroke-width="1" opacity=".5"/>` : ''); }).join('');
  const back = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect x="-100" y="-100" width="${W + 200}" height="1000" fill="#d9b585"/>
    <g filter="url(#rough)">${planks}
      <!-- jendela bulat -->
      <g class="win" transform="translate(1130 330)">
        <clipPath id="winClip"><circle r="132"/></clipPath>
        <g clip-path="url(#winClip)"><g transform="translate(-1130 -330)">${sky(W).replace(/id="sky/g, 'id="wsky').replace(/url\(#sky/g, 'url(#wsky')}</g>
          ${P('M-150 60 Q-60 20 0 50 Q80 80 150 40 V140 H-150 Z', '#8fa66b', 1.6)}</g>
        <circle r="150" fill="none" stroke="#8a5a34" stroke-width="34"/><circle r="168" fill="none" stroke="${INK}" stroke-width="2.2"/><circle r="132" fill="none" stroke="${INK}" stroke-width="2.2"/>
        ${P('M0 -132 V132 M-132 0 H132', 'none', 12, 'stroke="#8a5a34"')}${P('M-6 -132 V132 M6 -132 V132 M-132 -6 H132 M-132 6 H132', 'none', 1.4)}</g>
      <!-- rak buku -->
      <g transform="translate(300 300)">${P('M-40 0 H240 V14 H-40 Z', '#a8774a', 2)}${([[0, 70, "#b5452f"], [24, 84, "#8fb4b6"], [48, 64, "#e6c46a"], [70, 78, "#8fa66b"]] as [number, number, string][]).map(([x, h, c]) => P(`M${x} 0 V${-h} H${x + 20} V0`, c as string, 1.6)).join('')}${P('M110 0 Q100 -40 120 -52 Q150 -56 150 -30 L150 0 Z', '#cfe3e6', 1.6)}${banana(196, -12, -20, 1.1)}${banana(214, -18, 10, 1.1)}</g>
      <!-- foto keluarga -->
      <g transform="translate(760 210)">${P('M-70 -56 H70 V56 H-70 Z', '#f3e6c8', 3, 'stroke="#8a5a34"')}${P('M-70 -56 H70 V56 H-70 Z', 'none', 1.4)}
        ${[[-34, 10, 1, '#8b7360'], [0, 18, .8, '#9b6234'], [34, 10, 1, '#a07a5c']].map(([x, y, s, c]) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cy="-16" r="16" fill="${c}" stroke="${INK}" stroke-width="1.4"/><ellipse cy="-13" rx="10" ry="9" fill="#e8bf90"/><path d="M-14 30 Q-16 4 0 2 Q16 4 14 30 Z" fill="${c}" stroke="${INK}" stroke-width="1.4"/></g>`).join('')}
        ${P('M-60 -70 L0 -96 L60 -70', 'none', 1.4)}</g>
      <!-- lentera gantung -->
      <g transform="translate(560 60)">${P('M0 -80 V0', 'none', 1.6)}${P('M-20 0 H20 L26 50 H-26 Z', '#f6d36a', 2, 'fill-opacity=".8"')}${P('M-26 50 H26 M-14 0 V50 M14 0 V50', 'none', 1.2)}<circle cy="26" r="40" fill="#fff3c2" opacity=".25" class="lamp-glow"/></g>
      <!-- tanaman merambat -->
      ${P('M-20 40 Q120 70 220 30 Q300 0 360 50', 'none', 2.2)}${Array.from({ length: 9 }, (_, i) => bigLeaf(i * 42, 44 + Math.sin(i) * 14, 60 + i * 12, .32, i % 2 ? '#8fa66b' : '#9db872')).join('')}
    </g>
    <!-- berkas cahaya jendela -->
    <polygon class="pp-shaft" points="1010,300 1250,300 900,900 300,900" fill="#fff4cf" opacity=".35"/>
  </svg>`;
  const floorLines = Array.from({ length: 22 }, (_, i) => { const x = -100 + i * 85; return P(`M${x + (x - 800) * .02} 700 L${x + (x - 800) * .45} 900`, 'none', 1.3, 'opacity=".5"'); }).join('');
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="M-100 700 H${W + 100} V1000 H-100 Z" fill="#b98d5c" stroke="${INK}" stroke-width="2"/>${floorLines}${P(`M-100 760 H${W + 100} M-100 830 H${W + 100}`, 'none', 1, 'opacity=".4"')}
      <!-- karpet bundar -->
      <ellipse cx="640" cy="820" rx="300" ry="62" fill="#c8463a" stroke="${INK}" stroke-width="2"/><ellipse cx="640" cy="820" rx="236" ry="46" fill="none" stroke="#f2c94c" stroke-width="10"/><ellipse cx="640" cy="820" rx="160" ry="30" fill="#d9603e" stroke="${INK}" stroke-width="1.4"/>
      <!-- pintu terbuka ke teras -->
      <g transform="translate(1330 790)">${P('M-80 0 V-260 Q0 -330 80 -260 V0 Z', '#fff4cf', 2.4)}${P('M-80 0 V-260 Q0 -330 80 -260 V0', 'none', 10, 'stroke="#8a5a34"')}${P('M-60 -40 Q0 -70 60 -40', 'none', 1.2, 'opacity=".4"')}${P('M80 0 L120 -20 V-250 L80 -260', '#a8774a', 2)}</g>
      <!-- ayunan (hammock) -->
      <g class="hammock">${P('M330 420 L420 590 M890 420 L800 590', 'none', 2.2)}${P('M300 380 v60 M920 380 v60', 'none', 7, 'stroke="#8a5a34"')}
        ${P('M410 588 Q600 680 810 588 Q600 640 410 588 Z', '#e6c46a', 2.2)}${P('M440 596 Q600 660 780 596', 'none', 1.2)}${Array.from({ length: 9 }, (_, i) => P(`M${430 + i * 45} ${598 + Math.sin(i / 8 * Math.PI) * 52} l0 10`, 'none', 1)).join('')}</g>
      <!-- meja kecil -->
      <g transform="translate(180 760)">${P('M-70 -60 H70 V-48 H-70 Z', '#a8774a', 2)}${P('M-56 -48 V40 M56 -48 V40', 'none', 6, 'stroke="#8a5a34"')}${P('M-30 -60 Q-34 -96 0 -98 Q34 -96 30 -60', '#cfe3e6', 1.6)}${P('M0 -98 Q-14 -130 -30 -128 M0 -98 Q14 -132 30 -126', '#8fa66b', 1.4)}</g>
    </g>
    <g class="pp-act"></g>
  </svg>`;
  const fg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">
    ${bigLeaf(-60, 40, 20, 1.6, '#7f9a5e')}${bigLeaf(-40, 120, 40, 1.2)}${bigLeaf(W + 60, 60, 160, 1.5, '#7f9a5e')}
    ${P(`M-40 ${H + 20} Q40 ${H - 80} 120 ${H - 120}`, 'none', 3)}${fern(-30, H + 20, 1.2)}${fern(W + 30, H + 20, 1.2, -1)}</g></svg>`;
  return { W, actorScale: 1.25, layers: [{ f: .88, svg: back }, { f: 1, svg: stage, cls: 'stage' }, { f: 1.22, svg: fg, cls: 'fg' }],
    spots: { hammock: [612, 620], floor: [600, 812], mid: [880, 812], door: [1330, 806], window: [1130, 330] } };
}

/* =====================================================================  TERAS  */
function teras(): SetDef {
  const W = 1800;
  const plank = Array.from({ length: 30 }, (_, i) => { const x = -100 + i * 70; return P(`M${x + (x - 900) * .05} 770 L${x + (x - 900) * .5} 960`, 'none', 1.3, 'opacity=".5"'); }).join('');
  const posts = Array.from({ length: 9 }, (_, i) => { const x = 480 + i * 160; return P(`M${x} 790 V640`, 'none', 9, 'stroke="#8a5a34"') + P(`M${x - 5} 790 V640 M${x + 5} 790 V640`, 'none', 1.2); }).join('');
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <!-- batang pohon & dinding rumah -->
      ${P('M40 980 Q60 600 30 300 Q20 120 70 -60 H260 Q230 140 240 320 Q250 640 280 980 Z', '#a8774a', 2.6)}${P('M90 200 q30 60 0 140 M200 380 q-20 80 10 160 M120 620 q20 50 0 110', 'none', 1.4)}
      <g transform="translate(150 790)">${P('M-120 0 V-330 H150 V0', '#d9b585', 2.4)}${P('M-150 -330 L15 -440 L180 -330 Z', '#a35c3c', 2.4)}${P('M-40 0 V-180 Q15 -230 70 -180 V0 Z', '#fff4cf', 2)}${P('M-40 0 V-180 Q15 -230 70 -180 V0', 'none', 6, 'stroke="#8a5a34"')}
        <circle cx="100" cy="-250" r="30" fill="#cfe3e6" stroke="${INK}" stroke-width="2"/>${P('M100 -280 V-220 M70 -250 H130', 'none', 2)}</g>
      <!-- lantai papan -->
      <path d="M-100 770 H${W + 100} V1000 H-100 Z" fill="#c49a66" stroke="${INK}" stroke-width="2"/>${plank}
      <!-- pagar -->
      ${posts}${P('M470 660 Q800 680 1130 660 Q1450 640 1780 662', 'none', 4, 'stroke="#8a5a34"')}${P('M470 700 Q800 716 1130 700 Q1450 684 1780 702', 'none', 2.4, 'stroke="#8a5a34"')}
      <!-- tangga tali -->
      <g transform="translate(330 790)">${P('M-26 -10 V120 M26 -10 V120', 'none', 3)}${[10, 40, 70, 100].map((y) => P(`M-26 ${y} H26`, 'none', 4, 'stroke="#8a5a34"')).join('')}<ellipse cx="0" cy="-6" rx="56" ry="12" fill="#3b2a1a" opacity=".5"/></g>
      <!-- meja & bangku Kakek -->
      <g transform="translate(910 780)">${P('M-90 -70 H90 V-56 H-90 Z', '#a8774a', 2)}${P('M-74 -56 V10 M74 -56 V10', 'none', 7, 'stroke="#8a5a34"')}
        <ellipse cx="-30" cy="-74" rx="52" ry="10" fill="#f3ecdc" stroke="${INK}" stroke-width="1.8"/>
        <g data-prop="box" transform="translate(52 -88)">${P('M-24 -20 H24 V14 H-24 Z', '#8a5a34', 1.8)}<g class="lid">${P('M-26 -28 H26 V-18 H-26 Z', '#a8774a', 1.8)}</g><g class="scarfIn" opacity="0">${P('M-18 -18 Q0 -34 18 -18', '#c8463a', 1.6)}</g></g></g>
      <g transform="translate(1065 790)">${P('M-46 -50 H46 V-38 H-46 Z', '#a8774a', 2)}${P('M-36 -38 V0 M36 -38 V0', 'none', 6, 'stroke="#8a5a34"')}</g>
      <!-- lentera di tiang -->
      <g transform="translate(1440 620)">${P('M0 0 V-20 H30', 'none', 2)}${P('M18 -20 H42 L46 16 H14 Z', '#f6d36a', 1.8, 'fill-opacity=".85"')}<circle class="lamp-glow" cx="30" cy="0" r="46" fill="#fff3c2" opacity=".2"/></g>
      <g data-prop="map" opacity="0" transform="translate(820 700)">${P('M-40 -26 L-12 -20 L14 -28 L42 -20 V22 L14 14 L-12 22 L-40 14 Z', '#efe0bf', 1.6)}${P('M-30 0 Q-10 -14 10 2 T34 -4', 'none', 1.4, 'stroke="#b5452f" stroke-dasharray="4 3"')}<path d="M30 -8 l6 6 M36 -8 l-6 6" stroke="#b5452f" stroke-width="2"/></g>
    </g>
    <!-- pisang yang bisa diketuk -->
    <g class="pp-bananas" data-prop="bananas">${[[848, 702, -18], [878, 694, -6], [908, 692, 6], [938, 696, 16], [962, 704, 28]].map(([x, y, r], i) => item(`banana${i + 1}`, x, y - 4, banana(0, 0, r, 1.15), 28)).join('')}</g>
    <g class="pp-flies" data-prop="flies" opacity="0">${[[620, 520], [1010, 430], [1250, 560], [760, 380], [1560, 450]].map(([x, y], i) => item(`fly${i + 1}`, x, y, firefly(0, 0), 36)).join('')}</g>
    <g data-prop="glowLeaf" opacity="0" transform="translate(1500 430)"><circle r="60" fill="#fff3a0" opacity=".35" class="ff-glow"/>${goldLeaf(0, 0, 20, 2.4, '#f2c94c')}</g>
    <g class="pp-act"></g>
  </svg>`;
  const fg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">
    ${P(`M${W + 40} 40 Q${W - 160} 70 ${W - 320} 10`, 'none', 5, 'stroke="#8a5a34"')}${Array.from({ length: 8 }, (_, i) => bigLeaf(W - 30 - i * 40, 40 + Math.sin(i) * 18, 120 + i * 9, .55, i % 2 ? '#7f9a5e' : '#8fa66b')).join('')}
    ${bigLeaf(-80, H - 30, -30, 1.4, '#7f9a5e')}${bigLeaf(-40, H + 20, -60, 1.1)}</g></svg>`;
  return { W, actorScale: 1.12, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .2, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mountains(W, 600)}</svg>` },
    { f: .42, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${canopyRow(W, 640, 80, ['#a9c27e', '#9db872', '#b8cc8a'], 3)}${canopyRow(W, 700, 95, ['#8fa66b', '#9db872'], 7)}
      <g class="darkwood" filter="url(#rough)">${Array.from({ length: 6 }, (_, i) => pine(W - 260 + i * 46, 640 + (i % 2) * 12, 1.3, '#4f6150')).join('')}</g><rect x="-100" y="760" width="${W + 200}" height="200" fill="#7f9a5e"/></svg>` },
    { f: .7, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${canopyRow(W, 880, 130, ['#7f9a5e', '#8fa66b'], 11, 1.5)}</svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.3, svg: fg, cls: 'fg' }],
    spots: { ladder: [330, 792], ladderTop: [430, 792], momo: [760, 792], kakek: [1068, 792], table: [910, 690], rail: [1440, 792], railSit: [1440, 690], view: [1500, 500] } };
}

/* =====================================================================  JALAN  */
function jalan(): SetDef {
  const W = 2600;
  const trunks = Array.from({ length: 9 }, (_, i) => { const x = 120 + i * 300 + R(9, i) * 80, w = 40 + R(10, i) * 30; return `${P(`M${x - w / 2} 780 Q${x - w / 2 + 6} 400 ${x - w / 4} 120 H${x + w / 4} Q${x + w / 2 - 6} 400 ${x + w / 2} 780 Z`, '#9b7a55', 2)}${P(`M${x - 8} 600 q10 30 0 60`, 'none', 1.2)}`; }).join('');
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="M-100 740 Q${W * .3} 720 ${W * .6} 745 Q${W * .85} 760 ${W + 100} 735 V1000 H-100 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2"/>
      <path d="M-100 800 Q400 770 900 790 Q1400 812 1900 786 Q2300 770 ${W + 100} 790 L${W + 100} 860 Q2300 840 1900 856 Q1400 880 900 858 Q400 840 -100 870 Z" fill="#e6d3ad" stroke="${INK}" stroke-width="1.8"/>
      ${grass(-60, W + 60, 742, 70, 21)}
      <!-- pohon sarang Cici -->
      <g>${P('M1660 800 Q1676 600 1690 300 Q1696 180 1680 60 H1760 Q1740 200 1748 320 Q1760 600 1790 800 Z', '#a8774a', 2.4)}${P('M1700 500 q20 30 0 70 M1740 640 q-14 40 6 80', 'none', 1.4)}
        ${P('M1748 420 Q1820 380 1880 330', 'none', 9, 'stroke="#8a5a34"')}
        ${P('M1560 120 Q1540 -20 1680 -40 Q1800 -80 1900 0 Q2000 40 1960 140 Q1900 220 1760 190 Q1620 230 1560 120 Z', '#9db872', 2.4)}
        <g transform="translate(1720 452)">${P('M-46 0 Q-50 -26 0 -28 Q50 -26 46 0 Q0 18 -46 0 Z', '#c9a86c', 2)}${P('M-40 -6 l14 -6 M-20 -10 l16 6 M4 -12 l18 4 M26 -8 l14 -4', 'none', 1.2)}</g>
        <g data-prop="pecker" opacity="0" transform="translate(1666 370)">${P('M0 0 Q-16 -6 -14 -26 Q-6 -40 6 -34 Q12 -26 8 -12 Q6 0 0 0 Z', '#4f4a44', 1.6)}${P('M-10 -40 Q-2 -48 6 -36 Z', '#c8463a', 1.4)}${P('M-14 -30 L-28 -28 L-14 -24 Z', '#e8a03a', 1.2)}<circle cx="-8" cy="-30" r="1.8" fill="#fff"/></g></g>
      <g data-prop="banana" opacity="0" transform="translate(1090 800)">${P('M-14 0 Q-18 -150 -6 -300 H8 Q16 -150 14 0 Z', '#9db872', 2.2)}${P('M-6 -120 h14 M-6 -200 h12', 'none', 1.1)}
        ${P('M0 -290 Q-120 -360 -300 -300 Q-380 -270 -360 -220 Q-220 -280 -60 -250 Z', '#8fb860', 2.4)}${P('M0 -288 Q-150 -310 -340 -250', 'none', 1.3)}${P('M-60 -276 l-20 26 M-140 -290 l-18 30 M-220 -290 l-16 28', 'none', 1)}
        ${P('M4 -296 Q100 -380 240 -330 Q290 -300 270 -260 Q150 -300 20 -270 Z', '#9fc870', 2.4)}${P('M6 -294 Q130 -330 260 -280', 'none', 1.3)}${P('M8 -300 Q-10 -400 30 -440 Q46 -380 20 -300 Z', '#a8d07a', 2)}</g>
      <!-- semak -->
      <g data-prop="bush" transform="translate(1350 790)">${P('M-120 0 Q-130 -70 -70 -80 Q-40 -130 10 -110 Q60 -140 100 -90 Q140 -60 120 0 Z', '#7f9a5e', 2.4)}${P('M-60 -50 q10 -10 20 0 M20 -70 q10 -10 20 0 M60 -30 q10 -10 20 0', 'none', 1.2)}
        ${[[-70, -60], [-10, -90], [70, -50], [30, -20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#c8463a" stroke="${INK}" stroke-width="1.2"/>`).join('')}</g>
      <g data-prop="ducks" opacity="0">${[0, 1, 2].map((i) => `<g class="duckling" transform="translate(${1420 + i * 46} ${830 - i * 4})">${duck(0, 0, 1.6)}</g>`).join('')}</g>
      <!-- kolam -->
      <g transform="translate(2120 840)"><ellipse rx="160" ry="34" fill="#a7cfd6" stroke="${INK}" stroke-width="2"/>${P('M-100 -4 q14 -6 28 0 M30 6 q14 -6 28 0', 'none', 1.2)}${P('M-120 -20 V-80 M-126 -78 q6 -20 12 0 Z M140 -16 V-70 M134 -68 q6 -20 12 0 Z', '#a8774a', 1.4)}</g>
      <!-- papan penunjuk -->
      <g transform="translate(2430 800)">${P('M0 0 V-120', 'none', 5, 'stroke="#8a5a34"')}${P('M-60 -120 H70 L90 -102 L70 -84 H-60 Z', '#e6d3ad', 2)}<text x="6" y="-96" text-anchor="middle" font-family="'IM Fell English SC', serif" font-size="17" fill="${INK}">Pohon Induk</text></g>
      ${[[200, 830, '#e3a6d8'], [520, 860, '#f2c94c'], [980, 850, '#e8a07a'], [1180, 870, '#b48ae0'], [2250, 880, '#e3a6d8']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}
      ${mushroom(700, 790, 1.4)}${mushroom(730, 796, .9)}${mushroom(2580, 800, 1.2)}${rabbit(560, 760, 1.2)}
    </g>
    <g class="pp-act"></g>
  </svg>`;
  return { W, actorScale: 1, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .28, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g opacity=".65">${Array.from({ length: 34 }, (_, i) => pine(-80 + i * 82, 640 + (i % 3) * 14, 1.6 + (i % 2) * .3, i % 2 ? '#9fb3a0' : '#b2c4b0')).join('')}</g><rect x="-100" y="650" width="${W + 200}" height="300" fill="#b8cc8a"/></svg>` },
    { f: .6, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${trunks}${canopyRow(W, 170, 150, ['#8fa66b', '#7f9a5e', '#9db872'], 13, 1.4)}</g>
      <g class="rays">${[0, 1, 2, 3, 4].map((i) => `<polygon points="${300 + i * 520},0 ${380 + i * 520},0 ${200 + i * 520},780 ${60 + i * 520},780" fill="#fff6cf" opacity=".22"/>`).join('')}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.35, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-20, H + 30, 1.3)}${fern(820, H + 40, 1.1, -1)}${fern(1500, H + 40, 1.2)}${fern(W + 20, H + 30, 1.3, -1)}${bigLeaf(2050, H + 10, -70, 1.3)}</g></svg>`, cls: 'fg' }],
    spots: { start: [220, 812], bend: [900, 806], shelter: [1030, 808], bush: [1350, 806], nest: [1720, 440], mid: [1850, 812], end: [2450, 812] } };
}

/* =====================================================================  POHON INDUK  */
function pohonInduk(): SetDef {
  const W = 1800;
  const canopy = [[900, 230, 520, 210], [560, 330, 260, 130], [1240, 330, 260, 130], [720, 130, 240, 120], [1090, 130, 240, 120], [900, 360, 360, 110]];
  const leaves = canopy.map(([x, y, rx, ry], i) => `<path class="lv" d="M${x - rx} ${y} Q${x - rx} ${y - ry * 1.1} ${x - rx * .3} ${y - ry} Q${x} ${y - ry * 1.35} ${x + rx * .4} ${y - ry * .95} Q${x + rx * 1.05} ${y - ry * .9} ${x + rx} ${y} Q${x + rx * 1.02} ${y + ry * .8} ${x + rx * .3} ${y + ry * .85} Q${x} ${y + ry * 1.05} ${x - rx * .45} ${y + ry * .8} Q${x - rx * 1.05} ${y + ry * .7} ${x - rx} ${y} Z" fill="var(--lv${i % 3})" stroke="${INK}" stroke-width="2.6"/>`).join('');
  const curls = Array.from({ length: 40 }, (_, i) => { const a = R(30, i) * Math.PI * 2, r = R(31, i); const x = 900 + Math.cos(a) * 560 * r, y = 220 + Math.sin(a) * 200 * r; return P(`M${x} ${y} q8 -8 16 0`, 'none', 1.3); }).join('');
  const crowd = `<g data-prop="crowd" class="pp-crowd" opacity="0">
      <g class="cr cr1">${rabbit(1330, 808, 1.8)}</g><g class="cr cr2">${rabbit(1400, 822, 1.4)}</g><g class="cr cr3">${deer(1530, 812, 2)}</g>
      <g class="cr cr4"><g transform="translate(260 812) scale(1.6)">${P('M-12 0 Q-16 -20 0 -22 Q14 -22 12 0 Z', '#c8714a', 1.6)}${P('M-10 -10 Q-34 -20 -26 -44 Q-14 -50 -12 -34 Q-16 -24 -8 -16', '#b06a3c', 1.6)}<circle cx="4" cy="-14" r="1.6" fill="${INK}"/></g></g>
      <g class="cr cr5">${deer(140, 820, 1.7)}</g>
      <g class="worry">${[[1340, 700], [1540, 690], [250, 720]].map(([x, y]) => `<text x="${x}" y="${y}" font-family="'IM Fell English', serif" font-size="40" fill="${INK}">?</text>`).join('')}</g></g>`;
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="M-100 760 Q900 720 ${W + 100} 760 V1000 H-100 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2"/>${grass(-60, W + 60, 762, 46, 33)}
      <!-- batang & akar Pohon Induk -->
      ${P('M720 840 Q660 860 560 850 Q640 820 700 790 Q760 620 760 420 H1040 Q1040 620 1100 790 Q1160 820 1240 850 Q1140 860 1080 840 Q1000 830 980 860 Q940 820 900 860 Q860 820 820 860 Q800 830 720 840 Z', '#a8774a', 3)}
      ${P('M800 500 q30 60 0 140 M960 460 q-24 70 6 150 M880 640 q16 40 0 80', 'none', 1.6)}${P('M860 560 q20 -16 40 0 q-20 18 -40 0 Z', '#7a5230', 1.6)}
      ${P('M760 430 Q600 380 500 300 M1040 430 Q1200 380 1300 300 M900 420 V220', 'none', 18, 'stroke="#8a5a34"')}
      <g class="pp-leaves" data-prop="leaves">${leaves}${curls}</g>
      <g data-prop="goldLeafPile" opacity="0">${Array.from({ length: 22 }, (_, i) => goldLeaf(300 + R(40, i) * 1200, 800 + R(41, i) * 70, R(42, i) * 180, 1 + R(43, i) * .4)).join('')}</g>
      ${[[180, 860, '#e3a6d8'], [420, 880, '#f2c94c'], [1300, 880, '#e8a07a'], [1620, 870, '#b48ae0']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}
      ${mushroom(1110, 850, 1.3)}
    </g>
    ${crowd}
    <g class="pp-goldleaves">${[[500, 842], [570, 870], [660, 850], [720, 880], [440, 878]].map(([x, y], i) => item(`leaf${i + 1}`, x, y, goldLeaf(0, 0, i * 37, 1.7), 30)).join('')}</g>
    <g class="pp-act"></g>
  </svg>`;
  return { W, actorScale: .95, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .3, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mountains(W, 640)}<rect x="-100" y="660" width="${W + 200}" height="300" fill="#b8cc8a"/></svg>` },
    { f: .62, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${[80, 240, 1560, 1720].map((x, i) => roundTree(x, 760, 2.4 + (i % 2) * .4, i % 2 ? '#8fa66b' : '#9db872')).join('')}${[380, 1440].map((x) => pine(x, 750, 2.2, '#7f9a5e')).join('')}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.32, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-40, H + 30, 1.3)}${fern(W + 40, H + 30, 1.3, -1)}${grass(200, 1600, H - 10, 20, 50)}</g></svg>`, cls: 'fg' }],
    spots: { left: [380, 822], momo: [620, 822], trunk: [740, 830], kuraIn: [1960, 830], kura: [1170, 830], tree: [900, 420] } };
}

/* =====================================================================  HUTAN BISIK-BISIK  */
const starPath = (r: number) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .44 : r; return `${i ? 'L' : 'M'}${(Math.cos(a) * q).toFixed(1)} ${(Math.sin(a) * q).toFixed(1)}`; }).join(' ') + ' Z';
const darkTrunk = (x: number, w: number, c = '#7a5c40') => `${P(`M${x - w / 2} 800 Q${x - w / 2 + 10} 420 ${x - w / 3} -40 H${x + w / 3} Q${x + w / 2 - 10} 420 ${x + w / 2} 800 Q${x + w * .9} 812 ${x + w * 1.2} 836 Q${x + w * .4} 826 ${x} 840 Q${x - w * .5} 826 ${x - w * 1.2} 838 Q${x - w * .9} 812 ${x - w / 2} 800 Z`, c, 2.4)}${P(`M${x - w * .12} 300 q${w * .2} 60 0 130 M${x + w * .14} 520 q-${w * .18} 50 ${w * .04} 110 M${x - w * .2} 650 q${w * .14} 30 0 70`, 'none', 1.4)}${P(`M${x - w * .08} 440 q${w * .1} -12 ${w * .2} 0 q-${w * .1} 14 -${w * .2} 0 Z`, '#5b4130', 1.3)}`;
const whisper = (x: number, y: number, t: string, r: number, d: number) => `<text class="pp-whisper" x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})" style="animation-delay:${d}s" font-family="'IM Fell English', serif" font-style="italic" font-size="34" fill="#f4efe4" stroke="${INK}" stroke-width=".8" paint-order="stroke">${t}</text>`;

function hutanBisik(): SetDef {
  const W = 3200;
  const trunks = [[820, 150], [1080, 110], [1330, 170], [1960, 130], [2420, 180], [2980, 140], [3160, 120]].map(([x, w]) => darkTrunk(x, w)).join('');
  // bayangan "raksasa" dan ranting aslinya memakai bentuk yang sama
  const branch = 'M0 0 Q-10 -150 14 -300 Q20 -380 -4 -470 M10 -260 Q-90 -300 -150 -250 Q-190 -220 -206 -160 M-150 -250 Q-200 -270 -236 -240 M-150 -250 Q-170 -200 -160 -170 M14 -330 Q100 -380 150 -330 Q186 -290 196 -230 M150 -330 Q200 -350 232 -318 M150 -330 Q176 -280 166 -250 M-4 -470 Q-40 -520 -80 -516 M-4 -470 Q30 -530 70 -520';
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="M-200 760 Q400 736 760 756 Q1600 786 2400 760 Q2900 748 ${W + 200} 766 V1000 H-200 Z" fill="#8fa66b" stroke="${INK}" stroke-width="2"/>
      <path d="M-200 806 Q300 786 760 800 Q1400 824 2100 800 Q2700 786 ${W + 200} 806 L${W + 200} 866 Q2700 846 2100 862 Q1400 884 760 860 Q300 846 -200 868 Z" fill="#d9c59c" stroke="${INK}" stroke-width="1.8"/>
      ${grass(-160, 720, 760, 26, 61)}${grass(760, W + 60, 770, 40, 62)}
      ${[[60, 850, '#e3a6d8'], [200, 880, '#f2c94c'], [330, 846, '#e8a07a'], [470, 884, '#b48ae0'], [150, 780, '#f2c94c'], [400, 776, '#e3a6d8']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}${rabbit(250, 770, 1.1)}
      ${trunks}
      <!-- gerbang: dua batang melengkung + papan nama -->
      ${P('M640 836 Q600 500 700 250 Q760 120 900 60 L930 110 Q820 170 772 280 Q700 500 740 836 Z', '#8a6a4a', 2.6)}${P('M690 560 q24 50 2 110 M720 330 q30 30 20 80', 'none', 1.4)}
      <g data-prop="sign" transform="translate(604 600)">${P('M0 0 V236', 'none', 7, 'stroke="#7a5230"')}${P('M-120 -66 H110 L134 -40 L110 -14 H-120 Q-128 -40 -120 -66 Z', '#e6d3ad', 2.2)}${P('M-104 -52 h10 M-104 -28 h8 M96 -52 l8 6', 'none', 1.2)}<text x="-2" y="-31" text-anchor="middle" font-family="'IM Fell English SC', serif" font-size="22" fill="${INK}">Hutan Bisik-Bisik</text></g>
      <!-- akar seperti ular -->
      ${P('M1150 842 Q1230 800 1300 838 Q1370 872 1440 836 Q1500 812 1540 846', 'none', 13, 'stroke="#7a5c40"')}${P('M1150 842 Q1230 800 1300 838 Q1370 872 1440 836 Q1500 812 1540 846', 'none', 1.6)}
      <!-- bayangan menakutkan ↔ ranting -->
      <g transform="translate(1760 800)">
        <g data-prop="ranting" opacity="0" class="pp-ranting">${P(branch, 'none', 16, 'stroke="#8a6a4a"')}${P(branch, 'none', 1.6)}
          ${[[-206, -160], [-236, -240], [-160, -170], [196, -230], [232, -318], [166, -250], [-80, -516], [70, -520], [-100, -280], [90, -360]].map(([x, y], i) => `<g transform="translate(${x} ${y}) rotate(${i * 47})">${P('M0 0 Q14 -16 34 -4 Q16 12 0 0 Z', i % 2 ? '#9db872' : '#8fa66b', 1.4)}</g>`).join('')}</g>
        <g data-prop="shadow" opacity="0" class="pp-shadowmon">${P(branch, 'none', 34, 'stroke="#1c1a22" stroke-linejoin="round"')}
          ${P('M-60 -470 Q-70 -560 0 -572 Q70 -560 58 -470 Q40 -400 0 -396 Q-44 -400 -60 -470 Z', '#1c1a22', 2)}
          ${[[-206, -160], [-236, -240], [-160, -170], [196, -230], [232, -318], [166, -250]].map(([x, y], i) => `<path d="M${x} ${y} l${i < 3 ? -26 : 26} ${i % 2 ? 30 : 44} l${i < 3 ? 14 : -14} -34 Z" fill="#1c1a22"/>`).join('')}
          <path class="eye" d="M-34 -494 q14 -16 28 0 q-14 10 -28 0 Z M8 -494 q14 -16 28 0 q-14 10 -28 0 Z" fill="#f6e27a"/></g>
      </g>
      <!-- jamur bulat, daun segitiga, bunga bintang -->
      <g data-prop="mushGlow" opacity="0" class="pp-mush">
        ${[[2090, 846, 1], [2420, 852, .8], [2500, 842, 1.1]].map(([x, y, sc]) => `<g transform="translate(${x} ${y}) scale(${sc})"><circle r="26" cy="-14" fill="#8fd8ff" opacity=".28" class="ff-glow"/>${P('M-5 0 Q-6 -14 -3 -18 H3 Q6 -14 5 0 Z', '#f3ead2', 1.4)}${P('M-16 -16 Q-14 -32 0 -32 Q14 -32 16 -16 Z', '#8fc8e8', 1.6)}</g>`).join('')}
        <g data-prop="shapeRound" transform="translate(2180 838)"><circle r="46" cy="-34" fill="#8fd8ff" opacity=".3" class="ff-glow"/>${P('M-9 0 Q-10 -12 -6 -16 H6 Q10 -12 9 0 Z', '#f3ead2', 1.6)}<circle cx="0" cy="-42" r="30" fill="#8fc8e8" stroke="${INK}" stroke-width="2.2"/>${[[-10, -52, 5], [10, -36, 4], [6, -58, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e9f7ff" stroke="${INK}" stroke-width=".9"/>`).join('')}</g>
        <g data-prop="shapeTri" transform="translate(2270 842)"><circle r="46" cy="-40" fill="#b8f0a0" opacity=".3" class="ff-glow"/>${P('M0 0 V-18', 'none', 3, 'stroke="#6f8a50"')}${P('M0 -84 L36 -18 H-36 Z', '#a8d878', 2.2)}${P('M0 -78 V-20 M0 -50 l14 -10 M0 -38 l-14 -10', 'none', 1.1)}</g>
        <g data-prop="shapeStar" transform="translate(2360 836)"><circle r="46" cy="-52" fill="#ffe98a" opacity=".3" class="ff-glow"/>${P('M0 0 Q4 -14 0 -30', 'none', 3, 'stroke="#6f8a50"')}<g transform="translate(0 -56)">${P(starPath(32), '#f6d36a', 2.2)}<circle r="6" fill="#e8903a" stroke="${INK}" stroke-width="1.2"/></g></g>
      </g>
      <!-- batang kayu berlubang tempat Pipi bersembunyi -->
      <g transform="translate(2860 836)">${P('M-170 0 Q-180 -70 -150 -112 H120 Q170 -112 172 -56 Q170 0 120 2 Z', '#8a6a4a', 2.6)}${P('M-150 -112 Q-178 -60 -160 0', 'none', 1.6)}
        <ellipse cx="124" cy="-55" rx="46" ry="56" fill="#3a2a20" stroke="${INK}" stroke-width="2.4"/>${P('M96 -55 a28 36 0 1 0 56 0 a28 36 0 1 0 -56 0', 'none', 1.2, 'opacity=".5"')}
        <g data-prop="logGlow" opacity="0"><circle cx="124" cy="-55" r="34" fill="#ffe98a" opacity=".5" class="ff-glow"/><circle cx="124" cy="-55" r="6" fill="#fff7c0"/></g>
        ${P('M-110 -112 q10 -26 34 -22 M-20 -112 q6 -18 -8 -34', 'none', 4, 'stroke="#7a5c40"')}${P('M-120 -40 h60 M-40 -76 h70 M-90 -14 h40', 'none', 1.2, 'opacity=".6"')}
        ${mushroom(-130, -112, 1)}${mushroom(40, -112, .8)}</g>
      ${mushroom(1010, 836, 1.2)}${mushroom(1620, 842, 1)}${mushroom(3060, 838, 1.3)}
    </g>
    <g data-prop="whispers" opacity="0">${whisper(1180, 420, 'sssst…', -8, 0)}${whisper(1420, 560, 'wusss…', 6, .7)}${whisper(1560, 380, 'sssst…', 10, 1.3)}${whisper(2560, 560, 'hiks…', -6, .3)}${whisper(2740, 480, 'sssst…', 8, 1)}${whisper(2900, 600, 'hiks…', -4, 1.6)}</g>
    <g class="pp-act"></g>
  </svg>`;
  const vines = Array.from({ length: 12 }, (_, i) => { const x = 760 + i * 210 + R(70, i) * 90, l = 120 + R(71, i) * 220; return `${P(`M${x} -20 Q${x + 26} ${l * .5} ${x - 8} ${l}`, 'none', 2.2)}${[.3, .55, .8].map((t) => `<g transform="translate(${x + 10 - t * 14} ${l * t}) rotate(${40 + t * 60})">${P('M0 0 Q12 -12 26 -2 Q12 10 0 0 Z', '#5f7550', 1.2)}</g>`).join('')}`; }).join('');
  return { W, actorScale: 1, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .26, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mountains(900, 620)}<rect x="-100" y="640" width="1000" height="300" fill="#b8cc8a"/>
      <g opacity=".9">${Array.from({ length: 40 }, (_, i) => pine(560 + i * 70, 640 + (i % 3) * 16, 2.4 + (i % 2) * .5, i % 2 ? '#4f6150' : '#5f7550')).join('')}</g><rect x="560" y="640" width="${W}" height="320" fill="#5f7550"/></svg>` },
    { f: .58, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${[[940, 90], [1210, 70], [1500, 100], [1740, 80], [2140, 90], [2600, 110], [2820, 70], [3080, 90]].map(([x, w]) => darkTrunk(x, w, '#6b5240')).join('')}
      ${canopyRow(W, 150, 210, ['#4f6150', '#5f7550', '#566b4a'], 81, 1.1).replace('<g', '<g transform="translate(700 0)"')}${canopyRow(W, 20, 230, ['#3f5142', '#4f6150'], 82, 1.05).replace('<g', '<g transform="translate(640 0)"')}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.34, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${vines}${fern(-30, H + 30, 1.2)}${fern(1000, H + 40, 1.3, -1)}${fern(1900, H + 40, 1.2)}${fern(2500, H + 44, 1.1, -1)}${fern(W + 30, H + 30, 1.3, -1)}${bigLeaf(1500, H + 10, -70, 1.3, '#5f7550')}</g></svg>`, cls: 'fg' }],
    spots: { offL: [-140, 824], gate: [470, 824], in1: [1060, 824], shadowSpot: [1420, 824], mush: [2040, 824], log: [2600, 826], logSit: [2660, 826], logHole: [2984, 800], logTop: [2900, 690] } };
}

/* =====================================================================  TANAH LAPANG BERBINTANG  */
function tanahLapang(): SetDef {
  const W = 1800;
  const big = [[520, 250], [760, 130], [960, 290], [1180, 150], [1360, 300]];
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g data-prop="bigStars" class="pp-bigstars">${big.map(([x, y], i) => item(`star${i + 1}`, x, y, `<circle r="30" fill="#fff3a0" opacity=".3" class="ff-glow"/><g filter="url(#rough)">${P(starPath(21), '#fbe58a', 1.8)}</g>`, 40)).join('')}</g>
    <g filter="url(#rough)">
      <path d="M-100 770 Q500 730 900 744 Q1300 730 ${W + 100} 770 V1000 H-100 Z" fill="#8fa66b" stroke="${INK}" stroke-width="2"/>${grass(-60, W + 60, 772, 50, 91)}
      <g transform="translate(1010 838)">${P('M-120 0 Q-130 -60 -80 -92 Q-20 -124 50 -104 Q120 -80 124 0 Z', '#a9a79c', 2.4)}${P('M-70 -60 q30 -14 60 0 M10 -30 q24 -10 50 4', 'none', 1.3)}${P('M-124 0 Q-96 -18 -70 -2 M70 -2 q26 -16 54 2', '#8fa66b', 1.4)}</g>
      ${[[230, 860, '#b48ae0'], [560, 880, '#e3a6d8'], [1300, 870, '#f2c94c'], [1560, 856, '#b48ae0']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}${mushroom(700, 850, 1.1)}${mushroom(1420, 846, .9)}
    </g>
    <g class="pp-act"></g>
  </svg>`;
  return { W, actorScale: 1, layers: [
    { f: .05, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .3, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g opacity=".9">${Array.from({ length: 30 }, (_, i) => pine(-80 + i * 66, 700 + (i % 3) * 14, 1.5 + (i % 2) * .4 + Math.abs(i - 14.5) * .09, i % 2 ? '#4f6150' : '#5f7550')).join('')}</g><rect x="-100" y="700" width="${W + 200}" height="260" fill="#5f7550"/></svg>` },
    { f: .62, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${darkTrunk(60, 150, '#6b5240')}${darkTrunk(1740, 160, '#6b5240')}${darkTrunk(300, 90, '#6b5240')}${darkTrunk(1520, 100, '#6b5240')}
      ${[[-40, 150, 300], [240, 90, 220], [1560, 100, 230], [1840, 140, 300]].map(([x, y, r]) => P(`M${x - r} ${y + 40} Q${x - r * 1.1} ${y - r * .8} ${x - r * .2} ${y - r * .9} Q${x + r * .5} ${y - r * 1.2} ${x + r} ${y - r * .3} Q${x + r * 1.2} ${y + 30} ${x + r * .9} ${y + 90} Q${x} ${y + 150} ${x - r} ${y + 40} Z`, '#4f6150', 2)).join('')}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.32, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-40, H + 30, 1.3)}${fern(W + 40, H + 30, 1.3, -1)}${grass(300, 1500, H - 8, 18, 93)}</g></svg>`, cls: 'fg' }],
    spots: { left: [300, 832], momo: [760, 832], rockTop: [1016, 740], right: [1500, 832] } };
}


/* =====================================================================  SUNGAI YANG MARAH  */
const stoneXY = (i: number): [number, number] => [1000 + i * 95, 806 + (i % 2) * 10];
function sungai(): SetDef {
  const W = 3400;
  const rockPath = (w: number, h: number) => `M${-w} 0 Q${-w - 6} ${-h * .7} ${-w * .5} ${-h} Q0 ${-h - 10} ${w * .55} ${-h * .9} Q${w + 6} ${-h * .5} ${w} 0 Z`;
  const stones = Array.from({ length: 10 }, (_, i) => { const [x, y] = stoneXY(i); return item(`stone${i + 1}`, x, y + 8, `<g filter="url(#rough)">${P(rockPath(34, 26), i % 3 ? '#9a978c' : '#8c897f', 2)}${P('M-16 -14 q10 -6 22 -2', 'none', 1.1)}</g>`, 40); }).join('');
  const wave = (y: number, cls: string, seed: number) => `<g class="pp-wave ${cls}">${P(Array.from({ length: 48 }, (_, i) => { const x = -200 + i * 80; return `M${x} ${y + R(seed, i) * 14} q20 -12 40 0`; }).join(' '), 'none', 2.4, 'stroke="#f6f1e4" opacity=".9"')}</g>`;
  const debris = [[1300, 0], [2100, 1.6], [2700, .7]].map(([x, d]) => `<g class="pp-debris" style="animation-delay:-${d}s" transform="translate(${x} 772)">${P('M-40 0 L40 -6 M10 -4 l14 -14 M-14 -2 l-10 -12', 'none', 4, 'stroke="#7a5c40"')}${P('M30 -18 q12 -10 22 2 q-12 8 -22 -2 Z', '#8fa66b', 1)}</g>`).join('');
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <!-- air sungai: cokelat & deras saat marah, biru & tenang saat reda -->
    <g data-prop="river" class="pp-river">
      <path class="pp-river__far" d="M-200 700 Q600 688 1400 700 Q2300 712 ${W + 200} 696 V724 H-200 Z" fill="#8fa66b" stroke="${INK}" stroke-width="1.8"/>
      <path class="pp-river__water" d="M-200 718 Q600 708 1400 720 Q2300 732 ${W + 200} 714 V1000 H-200 Z" stroke="${INK}" stroke-width="2"/>
      ${wave(738, 'w1', 103)}${wave(770, 'w2', 104)}${wave(812, 'w3', 105)}${wave(860, 'w2', 106)}${wave(918, 'w1', 107)}
      <g class="pp-debrisrow">${debris}</g>
    </g>
    <g filter="url(#rough)">
      <!-- tepi kiri -->
      <path d="M-200 772 Q300 752 700 770 Q860 778 930 800 Q900 880 960 1000 H-200 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2"/>
      ${grass(-160, 900, 772, 34, 101)}
      <!-- tepi kanan -->
      <path d="M2860 1000 Q2920 880 2900 800 Q3000 770 3200 774 Q3400 766 ${W + 200} 776 V1000 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2"/>${grass(2930, W + 120, 776, 20, 102)}
    </g>
    <g filter="url(#rough)">
      <!-- batu besar tempat Dodo -->
      <g transform="translate(1960 830)">${P(rockPath(70, 66), '#8c897f', 2.4)}${P('M-40 -40 q20 -12 46 -4 M20 -22 q16 -4 30 6', 'none', 1.3)}<path class="pp-splash" d="M-80 0 q20 -26 40 -6 q20 -30 46 -4 q24 -24 50 2" fill="none" stroke="#f6f1e4" stroke-width="3"/></g>
      <!-- ranting tempat ransel tersangkut -->
      <g data-prop="snag" transform="translate(950 812)">${P('M-10 0 Q30 -40 90 -54 M40 -34 l20 -30 M70 -50 l26 -6', 'none', 6, 'stroke="#7a5c40"')}</g>
      ${[[180, 800, '#e3a6d8'], [420, 830, '#f2c94c'], [640, 812, '#b48ae0'], [3080, 820, '#e3a6d8'], [3260, 840, '#f2c94c']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}
      ${mushroom(90, 790, 1.2)}${mushroom(3320, 800, 1.1)}
      <!-- batu duduk -->
      <g transform="translate(640 800)">${P(rockPath(60, 40), '#a9a79c', 2.2)}</g>
    </g>
    <g class="pp-stones">${stones}</g>
    <!-- peta Kakek yang jatuh & hanyut -->
    <g data-prop="map" opacity="0"><g transform="translate(1110 820)"><g filter="url(#rough)">${P('M-34 -22 L30 -26 L36 20 L-30 24 Z', '#efe0bc', 2)}${P('M-20 -8 q14 10 26 -2 q8 -8 14 4 M-14 10 l6 -4 6 4', 'none', 1.4, 'stroke="#b07a48"')}<circle cx="18" cy="-12" r="4" fill="#e3667a" stroke="${INK}" stroke-width="1"/></g></g></g>
    <!-- Mama Bebek -->
    <g data-prop="mama" opacity="0" transform="translate(250 800)"><g filter="url(#rough)">
      ${P('M-60 0 Q-70 -50 -10 -54 Q4 -96 40 -92 Q70 -86 64 -58 Q58 -40 46 -36 Q74 -20 56 4 Q40 20 -20 18 Q-60 14 -60 0 Z', '#f6f1e4', 2.2)}
      ${P('M60 -70 Q84 -70 92 -62 Q82 -54 60 -58 Z', '#ee9a3c', 1.6)}<circle cx="46" cy="-74" r="3.4" fill="${INK}"/>${P('M-34 -20 Q-10 -36 16 -14', 'none', 1.6)}
      ${P('M-10 18 v10 h-12 M14 18 v10 h-12', 'none', 2.2, 'stroke="#ee9a3c"')}</g></g>
    <!-- bulu kuning dari Dodo -->
    <g data-prop="feather" opacity="0" transform="translate(470 650)"><g filter="url(#rough)">${P('M0 30 Q-16 0 -6 -30 Q10 -10 14 6 Q8 22 0 30 Z', '#f4d778', 1.8)}${P('M0 30 Q-2 0 -4 -24 M-4 -4 l-6 -6 M-2 10 l-6 -4 M2 0 l6 -6', 'none', 1)}</g></g>
    <g class="pp-act"></g>
  </svg>`;
  const cliff = (x: number, flip: number) => P(`M${x - 170 * flip} 760 Q${x - 120 * flip} 560 ${x - 30 * flip} 470 Q${x + 30 * flip} 450 ${x + 70 * flip} 480 Q${x + 120 * flip} 600 ${x + 150 * flip} 760 Z`, '#8fa66b', 2.2) + P(`M${x - 60 * flip} 600 q20 30 6 60 M${x + 40 * flip} 560 q-10 30 10 50`, 'none', 1.2);
  const bridge = `<g filter="url(#rough)">
      ${cliff(1300, 1)}${cliff(2180, -1)}
      ${P('M1270 480 V370 M1320 480 V370 M2150 480 V370 M2200 480 V370', 'none', 7, 'stroke="#7a5230"')}${P('M1262 384 H1328 M2142 384 H2208', 'none', 5, 'stroke="#7a5230"')}
      ${P('M1320 380 Q1740 520 2150 380', 'none', 2.6, 'stroke="#7a5230"')}${P('M1320 460 Q1740 580 2150 460', 'none', 3, 'stroke="#7a5230"')}
      ${Array.from({ length: 20 }, (_, i) => { const t = (i + .5) / 20, x = 1320 + t * 830, y = 460 + Math.sin(t * Math.PI) * 108; return P(`M${x - 14} ${y - 4} L${x + 14} ${y - 4} L${x + 14} ${y + 6} L${x - 14} ${y + 6} Z`, '#c9a26a', 1.2) + P(`M${x} ${y - 4} L${x} ${380 + Math.sin(t * Math.PI) * 126}`, 'none', 1); }).join('')}</g>`;
  return { W, actorScale: 1, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .3, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mountains(W, 600)}<g opacity=".8">${Array.from({ length: 44 }, (_, i) => pine(-80 + i * 82, 660 + (i % 3) * 14, 1.6 + (i % 2) * .4, i % 2 ? '#8fa38f' : '#a4b6a2')).join('')}</g><rect x="-100" y="668" width="${W + 200}" height="300" fill="#a4b6a2"/></svg>` },
    { f: .6, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${bridge}<g filter="url(#rough)">${canopyRow(1100, 140, 170, ['#8fa66b', '#7f9a5e'], 106, 1.3)}${canopyRow(1300, 160, 170, ['#7f9a5e', '#9db872'], 107, 1.3).replace('<g', '<g transform="translate(2400 0)"')}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.34, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-30, H + 30, 1.3)}${fern(760, H + 40, 1.1, -1)}${bigLeaf(3000, H + 10, -60, 1.2)}${fern(W + 30, H + 30, 1.3, -1)}</g></svg>`, cls: 'fg' }],
    spots: { offL: [-160, 790], mamaSpot: [380, 796], bankL: [520, 792], seat: [640, 760], bankEdge: [860, 792], dodoRock: [1960, 764], offR: [3560, 790],
      ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`s${i + 1}`, [stoneXY(i)[0], stoneXY(i)[1] - 16]])) } };
}

/* =====================================================================  CHAPTER 4: SAHABAT BARU YANG KIKUK  */
const tentSvg = () => `<g filter="url(#rough)">${P('M-150 0 L-6 -170 L150 0 Z', '#9fc870', 2.4)}${P('M-6 -170 L-74 0 M-6 -170 L70 0 M-110 -40 L100 -40 M-70 -96 L60 -96', 'none', 1.3)}${P('M-40 0 L-6 -80 L28 0 Z', '#5e7a44', 1.8)}${P('M-6 -170 L-10 -196 M-6 -170 L4 -194', 'none', 4, 'stroke="#7a5230"')}</g>`;
function kemah(): SetDef {
  const W = 2200;
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="M-100 780 Q600 750 1100 768 Q1700 786 ${W + 100} 762 V1000 H-100 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2"/>${grass(-60, W + 60, 776, 44, 121)}
      ${fern(140, 800, 1.1)}${fern(560, 806, .9, -1)}
      <!-- pohon tempat Kiko menyendiri -->
      ${roundTree(1820, 790, 1.5, '#7f9a5e')}
      ${[[300, 840, '#e3a6d8'], [700, 860, '#f2c94c'], [1500, 850, '#b48ae0'], [2050, 860, '#e3a6d8']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}${mushroom(1600, 812, 1)}
    </g>
    <g data-prop="tent" transform="translate(1000 792)">${tentSvg()}</g>
    <g data-prop="sticks" opacity="0" transform="translate(1000 792)"><g filter="url(#rough)">${P('M-120 -6 L110 -14 M-80 -2 L60 -30 M-40 -10 L130 4', 'none', 5, 'stroke="#7a5230"')}${P('M-150 0 Q-60 -26 30 -10 Q100 -24 150 0 Z', '#9fc870', 2)}</g></g>
    <g data-prop="feather" opacity="0" transform="translate(1690 792)"><g filter="url(#rough)">${P('M0 30 Q-16 0 -6 -30 Q10 -10 14 6 Q8 22 0 30 Z', '#f4d778', 1.8)}${P('M0 30 Q-2 0 -4 -24', 'none', 1)}</g></g>
    <g data-prop="flies" class="pp-flies" opacity="0">${[[300, 520], [620, 600], [1280, 480], [1560, 560], [1980, 520]].map(([x, y]) => firefly(x, y)).join('')}</g>
    <g class="pp-act"></g>
  </svg>`;
  return { W, actorScale: 1, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .3, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mountains(W, 610)}<g opacity=".85">${Array.from({ length: 30 }, (_, i) => pine(-60 + i * 80, 690 + (i % 3) * 12, 1.7, i % 2 ? '#8fa38f' : '#a4b6a2')).join('')}</g><rect x="-100" y="690" width="${W + 200}" height="300" fill="#a4b6a2"/></svg>` },
    { f: .6, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${canopyRow(W, 150, 160, ['#8fa66b', '#7f9a5e'], 122, 1.3)}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.34, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-30, H + 30, 1.3)}${bigLeaf(W + 20, H + 10, -60, 1.2)}</g></svg>`, cls: 'fg' }],
    spots: { offL: [-200, 790], left: [420, 792], tentL: [780, 794], tentR: [1240, 790], kiko: [1420, 786], tree: [1760, 786], offR: [2400, 780] } };
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
function tebing(): SetDef {
  const W = 3000;
  const cliffL = 'M-200 1000 V200 Q200 160 520 240 Q760 300 900 420 Q1000 560 1010 780 V1000 Z';
  const cliffR = 'M1560 1000 V780 Q1580 520 1700 400 Q1900 260 2300 230 Q2700 200 3200 260 V1000 Z';
  const track = (L: string, i: number) => `<g data-prop="track${L}" opacity="0" transform="translate(${1820 + i * 150} ${830 + (i % 2) * 14})"><text text-anchor="middle" y="18" font-family="'IM Fell English', serif" font-size="96" fill="#6b4a2c" fill-opacity=".85" stroke="${INK}" stroke-width="1.6">${L}</text>${P('M-26 40 q4 -6 8 0 M18 42 q4 -6 8 0', 'none', 1.4, 'opacity=".6"')}</g>`;
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="${cliffL}" fill="#b5a68c" stroke="${INK}" stroke-width="2.4"/>${P('M300 300 q60 120 20 260 M640 380 q30 140 -10 300 M860 520 q20 120 -6 220', 'none', 1.4, 'opacity=".6"')}
      <path d="${cliffR}" fill="#b5a68c" stroke="${INK}" stroke-width="2.4"/>${P('M1800 420 q-30 140 0 300 M2200 300 q40 160 0 380 M2700 280 q30 160 -10 400', 'none', 1.4, 'opacity=".6"')}
      <path d="M-100 790 Q700 772 1300 788 Q2000 806 ${W + 100} 784 V1000 H-100 Z" fill="#c7b48f" stroke="${INK}" stroke-width="2"/>
      <!-- tanah lumpur tempat jejak huruf -->
      <path d="M1700 812 Q2100 790 2560 808 Q2620 860 2500 900 Q2100 930 1720 896 Q1640 860 1700 812 Z" fill="#8a6a4a" stroke="${INK}" stroke-width="1.8"/>
      ${grass(-60, 980, 790, 18, 131)}${grass(1500, W + 60, 788, 26, 132)}
      ${[[200, 860, '#f2c94c'], [620, 880, '#e3a6d8'], [2700, 870, '#b48ae0']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}
    </g>
    <g class="pp-tracks">${LETTERS.map(track).join('')}</g>
    <g data-prop="wedge" opacity="0" transform="translate(930 802)"><g filter="url(#rough)">${P('M-20 0 q4 -16 18 -14 q12 2 10 14 Z M10 4 q4 -12 16 -10 q10 2 8 10 Z', '#9a978c', 1.6)}</g></g>
    <g data-prop="crack" opacity="0" transform="translate(1260 780)">${P('M-40 -20 l14 -16 l-6 -14 l16 -18', 'none', 3, 'stroke="#e3667a"')}</g>
    <g data-prop="boulder" transform="translate(1280 800)"><g filter="url(#rough)">${P('M-170 0 Q-190 -150 -60 -200 Q60 -230 150 -150 Q200 -80 170 0 Z', '#9a978c', 2.6)}${P('M-90 -140 q40 -30 90 -10 M20 -60 q40 -20 80 10 M-120 -50 q30 10 50 -6', 'none', 1.6)}</g></g>
    <g class="pp-act"></g>
  </svg>`;
  return { W, actorScale: 1, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .3, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${mountains(W, 560)}</svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.34, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-30, H + 30, 1.2)}${fern(W + 30, H + 30, 1.2, -1)}</g></svg>`, cls: 'fg' }],
    spots: { offL: [-200, 790], start: [360, 786], push: [940, 790], helper: [820, 790], wedge: [1120, 800], pass: [1700, 800],
      ...Object.fromEntries(LETTERS.map((L, i) => [`mud${L}`, [1820 + i * 150, 806]])), mudEnd: [2600, 800], offR: [3200, 790] } };
}

function puncak(): SetDef {
  const W = 2600;
  const fog = (y: number, o: number, seed: number) => `<g class="pp-fog" style="animation-delay:-${seed}s">${P(`M-200 ${y} Q${W * .25} ${y - 40} ${W * .5} ${y} T${W + 200} ${y} V${y + 90} H-200 Z`, '#ffffff', 0, `stroke="none" opacity="${o}"`)}</g>`;
  const stage = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <g filter="url(#rough)">
      <path d="M-100 820 Q400 760 900 740 Q1400 724 1800 760 Q2200 800 ${W + 100} 860 V1000 H-100 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2"/>${grass(-60, W + 60, 760, 40, 141)}
      <!-- pohon tua -->
      <g transform="translate(2150 820)">${P('M-40 0 Q-30 -160 -60 -300 Q-10 -280 0 -200 Q20 -300 70 -320 Q40 -200 44 0 Z', '#7a5c40', 2.4)}${P('M-20 -120 q20 -10 30 10 M10 -60 q10 -14 22 0', 'none', 1.3)}
        ${P('M-220 -300 Q-200 -440 -40 -460 Q120 -480 200 -380 Q260 -300 180 -260 Q40 -230 -100 -250 Q-200 -250 -220 -300 Z', '#5e7a44', 2.2)}</g>
      ${[[300, 850, '#e3a6d8'], [760, 800, '#f2c94c'], [1600, 800, '#b48ae0']].map(([x, y, c]) => flower(x as number, y as number, c as string)).join('')}${mushroom(1900, 812, 1)}
    </g>
    <!-- mata burung hantu -->
    <g data-prop="eyes" opacity="0" transform="translate(2160 450)" class="pp-owleyes"><circle cx="-22" r="16" fill="#ffe46a" stroke="${INK}" stroke-width="2"/><circle cx="22" r="16" fill="#ffe46a" stroke="${INK}" stroke-width="2"/><circle cx="-20" r="6" fill="${INK}"/><circle cx="24" r="6" fill="${INK}"/></g>
    <g class="pp-act"></g>
  </svg>`;
  const kabut = `<g filter="url(#rough)">${P(`M900 700 Q1200 260 1500 220 Q1800 200 2050 420 Q2250 600 2400 700 Z`, '#9db0a8', 2)}${P('M1300 400 q60 -30 120 0 M1600 300 q60 -20 110 10', 'none', 1.2)}</g>${fog(470, .75, 0)}${fog(560, .8, 2)}${fog(640, .7, 4)}`;
  return { W, actorScale: 1, layers: [
    { f: .06, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(W)}</svg>`, cls: 'sky' },
    { f: .22, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${kabut}<rect x="-100" y="700" width="${W + 200}" height="300" fill="#a4b6a2"/></svg>` },
    { f: .55, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g opacity=".9">${Array.from({ length: 34 }, (_, i) => pine(-80 + i * 82, 780 + (i % 3) * 12, 1.4, i % 2 ? '#8fa38f' : '#a4b6a2')).join('')}</g></svg>` },
    { f: 1, svg: stage, cls: 'stage' },
    { f: 1.34, svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g filter="url(#rough)">${fern(-30, H + 30, 1.2)}${bigLeaf(W + 20, H + 10, -60, 1.1)}</g></svg>`, cls: 'fg' }],
    spots: { offL: [-200, 820], start: [340, 800], mid: [900, 740], top: [1300, 730], edge: [1600, 744], tree: [1950, 780] } };
}

export const SETS: Record<SetName, () => SetDef> = { kamar, teras, jalan, pohonInduk, hutanBisik, tanahLapang, sungai, kemah, tebing, puncak };

/* ---------------- kartu ikon untuk pilihan ganda ---------------- */
const ic = (inner: string) => `<svg viewBox="0 0 100 100" aria-hidden="true"><g filter="url(#rough)">${inner}</g></svg>`;
const num = (n: number) => ic(`<text x="50" y="72" text-anchor="middle" font-family="'IM Fell English', serif" font-size="70" fill="#e8a07a" stroke="${INK}" stroke-width="2">${n}</text>`);
const leafIc = (c: string) => ic(`<g transform="translate(50 54) scale(2.6)">${P('M-16 0 Q-4 -14 16 -2 Q4 12 -16 0 Z', c, 1.4)}${P('M-16 0 L14 -1', 'none', .9)}</g>`);
export const ICONS: Record<string, string> = {
  sun: ic(`<circle cx="50" cy="50" r="22" fill="#f6d36a" stroke="${INK}" stroke-width="2"/>${Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return P(`M${50 + Math.cos(a) * 30} ${50 + Math.sin(a) * 30} L${50 + Math.cos(a) * 42} ${50 + Math.sin(a) * 42}`, 'none', 2.4); }).join('')}`),
  moon: ic(`<rect x="10" y="10" width="80" height="80" rx="14" fill="#2b3a66" stroke="${INK}" stroke-width="2"/>${P('M58 26 a26 26 0 1 0 14 40 a21 21 0 1 1 -14 -40 Z', '#fbf1c8', 1.8)}<circle cx="28" cy="30" r="2" fill="#fff6d6"/><circle cx="36" cy="70" r="1.6" fill="#fff6d6"/><circle cx="74" cy="22" r="1.6" fill="#fff6d6"/>`),
  monster: ic(`${P('M26 86 Q18 40 34 22 Q50 8 66 22 Q82 40 74 86 Q62 78 50 86 Q38 78 26 86 Z', '#3a3550', 2)}${P('M26 50 L8 34 M74 50 L92 34 M8 34 l-4 -10 M8 34 l-10 2 M92 34 l4 -10 M92 34 l10 2', 'none', 3, 'stroke="#3a3550"')}<circle cx="40" cy="42" r="6" fill="#f6e27a"/><circle cx="60" cy="42" r="6" fill="#f6e27a"/>${P('M38 62 l6 6 l6 -6 l6 6 l6 -6', 'none', 2, 'stroke="#f4efe4"')}`),
  branch: ic(`${P('M50 92 Q46 60 52 30 M52 56 Q30 46 20 28 M52 44 Q72 36 82 18 M52 30 Q44 16 36 12', 'none', 6, 'stroke="#8a6a4a"')}${[[20, 28, -40], [82, 18, 30], [36, 12, -60], [30, 44, 200], [72, 34, 160]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${P('M0 0 Q8 -10 20 -2 Q8 8 0 0 Z', '#9db872', 1.3)}</g>`).join('')}`),
  snake: ic(`${P('M18 78 Q10 60 30 56 Q54 54 50 40 Q46 28 62 24 Q80 22 82 36', 'none', 11, 'stroke="#8fb872"')}${P('M18 78 Q10 60 30 56 Q54 54 50 40 Q46 28 62 24 Q80 22 82 36', 'none', 1.4)}<circle cx="80" cy="30" r="2.4" fill="${INK}"/>${P('M84 40 l4 8 M84 40 l8 4', 'none', 1.6, 'stroke="#c8463a"')}`),
  shapeRound: ic(`${P('M42 92 Q40 76 44 70 H56 Q60 76 58 92 Z', '#f3ead2', 1.8)}<circle cx="50" cy="44" r="30" fill="#8fc8e8" stroke="${INK}" stroke-width="2.4"/><circle cx="40" cy="34" r="5" fill="#e9f7ff"/><circle cx="60" cy="50" r="4" fill="#e9f7ff"/>`),
  shapeTri: ic(`${P('M50 96 V78', 'none', 3.4, 'stroke="#6f8a50"')}${P('M50 10 L88 78 H12 Z', '#a8d878', 2.4)}${P('M50 18 V76 M50 46 l14 -10 M50 58 l-14 -10', 'none', 1.3)}`),
  shapeStar: ic(`${P('M50 96 Q54 84 50 70', 'none', 3.4, 'stroke="#6f8a50"')}<g transform="translate(50 42)">${P(starPath(36), '#f6d36a', 2.4)}<circle r="7" fill="#e8903a" stroke="${INK}" stroke-width="1.3"/></g>`),
  circle: ic(`<circle cx="50" cy="50" r="34" fill="#8fc8e8" stroke="${INK}" stroke-width="2.6"/>`),
  triangle: ic(`${P('M50 14 L88 82 H12 Z', '#a8d878', 2.6)}`),
  star: ic(`<g transform="translate(50 54)">${P(starPath(40), '#f6d36a', 2.6)}</g>`),
  glowDim: ic(`<rect x="10" y="10" width="80" height="80" rx="14" fill="#2b3a66" stroke="${INK}" stroke-width="2"/><circle cx="50" cy="54" r="12" fill="#ffe98a" opacity=".25"/><ellipse cx="50" cy="54" rx="9" ry="6" fill="#b9a45a" stroke="${INK}" stroke-width="1.6"/>${P('M46 48 q-8 -12 -16 -4 M54 48 q8 -12 16 -4', '#ffffff', 1.3, 'fill-opacity=".5"')}`),
  glowBright: ic(`<rect x="10" y="10" width="80" height="80" rx="14" fill="#2b3a66" stroke="${INK}" stroke-width="2"/><circle cx="50" cy="54" r="34" fill="#ffe98a" opacity=".45"/><circle cx="50" cy="54" r="22" fill="#fff3a0" opacity=".7"/><ellipse cx="50" cy="54" rx="9" ry="6" fill="#fff7c0" stroke="${INK}" stroke-width="1.6"/>${P('M46 48 q-8 -12 -16 -4 M54 48 q8 -12 16 -4', '#ffffff', 1.3, 'fill-opacity=".7"')}${Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return P(`M${50 + Math.cos(a) * 28} ${54 + Math.sin(a) * 28} L${50 + Math.cos(a) * 37} ${54 + Math.sin(a) * 37}`, 'none', 2, 'stroke="#fff3a0"'); }).join('')}`),
  left: ic(`${P('M84 50 H30 M46 28 L22 50 L46 72', 'none', 9, 'stroke="#e8a07a" stroke-linecap="round" stroke-linejoin="round"')}${P('M84 50 H30 M46 28 L22 50 L46 72', 'none', 1.6)}`),
  right: ic(`${P('M16 50 H70 M54 28 L78 50 L54 72', 'none', 9, 'stroke="#8fb872" stroke-linecap="round" stroke-linejoin="round"')}${P('M16 50 H70 M54 28 L78 50 L54 72', 'none', 1.6)}`),
  up: ic(`${P('M22 88 Q20 70 50 68 Q80 70 78 88 Z', '#9a978c', 2)}<g transform="translate(50 50) scale(1.3)">${P('M-12 0 Q-14 -10 0 -10 Q6 -18 12 -14 Q16 -10 12 -6 Q14 0 4 2 Z', '#f4d778', 1.4)}</g>${P('M50 34 V10 M40 20 L50 8 L60 20', 'none', 3, 'stroke="#e8903a"')}`),
  down: ic(`${P('M22 42 Q20 24 50 22 Q80 24 78 42 Z', '#9a978c', 2)}<g transform="translate(50 72) scale(1.3)">${P('M-12 0 Q-14 -10 0 -10 Q6 -18 12 -14 Q16 -10 12 -6 Q14 0 4 2 Z', '#f4d778', 1.4)}</g>${P('M50 84 V96 M42 88 L50 98 L58 88', 'none', 3, 'stroke="#e8903a"')}`),
  help: ic(`${P('M50 84 C14 60 18 28 38 26 C46 26 50 34 50 38 C50 34 54 26 62 26 C82 28 86 60 50 84 Z', '#e3667a', 2.4)}${P('M30 56 Q42 48 50 58 Q58 48 70 56', 'none', 2.2, 'stroke="#fbf6ea"')}`),
  bridge: ic(`${P('M12 40 V84 M88 40 V84', 'none', 5, 'stroke="#7a5230"')}${P('M12 44 Q50 70 88 44', 'none', 2.4, 'stroke="#7a5230"')}${Array.from({ length: 7 }, (_, i) => { const t = (i + .5) / 7, x = 12 + t * 76, y = 56 + Math.sin(t * Math.PI) * 12; return P(`M${x - 4} ${y} h8 v5 h-8 Z`, '#c9a26a', 1); }).join('')}${P('M8 90 Q30 80 50 90 Q70 100 92 90', 'none', 2, 'stroke="#8fb4c8"')}`),
  sad: ic(`<circle cx="50" cy="52" r="34" fill="#e8bf90" stroke="${INK}" stroke-width="2"/>${P('M34 42 L46 38 M66 42 L54 38', 'none', 2.4)}<circle cx="40" cy="52" r="3.6" fill="${INK}"/><circle cx="60" cy="52" r="3.6" fill="${INK}"/>${P('M38 74 Q50 64 62 74', 'none', 2.6)}${P('M62 58 q4 8 0 12 q-4 -4 0 -12 Z', '#8fc8e8', 1.2)}`),
  joy: ic(`<circle cx="50" cy="52" r="34" fill="#e8bf90" stroke="${INK}" stroke-width="2"/>${P('M34 50 q6 -6 12 0 M54 50 q6 -6 12 0', 'none', 2.4)}${P('M34 62 Q50 82 66 62 Z', '#c8463a', 2.2)}<circle cx="30" cy="62" r="5" fill="#e98b7a" opacity=".6"/><circle cx="70" cy="62" r="5" fill="#e98b7a" opacity=".6"/>`),
  rhino: ic(`${P('M12 70 Q10 40 40 36 Q66 32 78 46 Q92 54 88 70 Z', '#a3a7ab', 2)}${P('M80 46 Q86 28 92 22 Q92 38 88 48 Z', '#efe6d2', 1.6)}<circle cx="74" cy="52" r="2.8" fill="${INK}"/>${P('M20 70 v14 h10 v-14 M54 70 v14 h10 v-14', '#8b9095', 1.6)}`),
  bird: ic(`${P('M30 66 Q26 40 52 38 Q62 26 74 32 Q82 38 76 50 Q84 64 66 72 Q44 80 30 66 Z', '#b07a48', 2)}${P('M76 40 L88 44 L76 48 Z', '#e8a03a', 1.4)}<circle cx="68" cy="40" r="2.6" fill="${INK}"/>${P('M38 52 Q50 46 60 58', 'none', 1.6)}`),
  sorry: ic(`${P('M50 82 C18 60 22 30 40 28 C46 28 50 34 50 38 C50 34 54 28 60 28 C78 30 82 60 50 82 Z', '#f2b8c6', 2.2)}${P('M24 64 Q34 52 44 60 M76 64 Q66 52 56 60', 'none', 2.4, 'stroke="#c98a5a"')}<text x="50" y="58" text-anchor="middle" font-family="'IM Fell English', serif" font-size="16" fill="${INK}">maaf</text>`),
  team: ic(`${[[26, '#c98a5a'], [50, '#a3a7ab'], [74, '#b07a48']].map(([x, c]) => `<circle cx="${x}" cy="44" r="14" fill="${c}" stroke="${INK}" stroke-width="2"/>`).join('')}${P('M14 80 Q50 56 86 80', 'none', 4, 'stroke="#e8a07a"')}${P('M40 70 l6 6 l10 -12', 'none', 3, 'stroke="#5e8a44"')}`),
  alone: ic(`<circle cx="50" cy="42" r="15" fill="#c98a5a" stroke="${INK}" stroke-width="2"/>${P('M30 86 Q32 62 50 60 Q68 62 70 86 Z', '#c98a5a', 2)}${[[18, 30], [82, 30], [16, 72], [84, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3"/>`).join('')}`),
  ...Object.fromEntries(['K', 'A', 'C', 'E'].map((L) => [`letter${L}`, ic(`<rect x="14" y="14" width="72" height="72" rx="10" fill="#f6ecd4" stroke="${INK}" stroke-width="2"/><text x="50" y="76" text-anchor="middle" font-family="'IM Fell English', serif" font-size="66" fill="#c8463a" stroke="${INK}" stroke-width="1.2">${L}</text>`)])),
  n2: num(2), n3: num(3), n4: num(4),
  duck: ic(`${P('M18 62 Q16 44 40 46 Q48 30 64 34 Q78 38 74 52 Q86 58 80 70 Q70 84 44 82 Q22 80 18 62 Z', '#f2d27a', 2)}${P('M74 44 L92 46 L76 52 Z', '#e8903a', 1.6)}<circle cx="64" cy="42" r="3" fill="${INK}"/>${P('M30 62 Q44 70 58 62', 'none', 1.6)}${P('M40 84 l-4 8 h10 M56 84 l-2 8 h10', '#e8903a', 1.6)}`),
  cat: ic(`${P('M26 80 Q22 40 50 38 Q78 40 74 80 Z', '#e8bf90', 2)}${P('M30 46 L28 20 L44 38 M70 46 L72 20 L56 38', '#e8bf90', 2)}<circle cx="40" cy="56" r="3.5" fill="${INK}"/><circle cx="60" cy="56" r="3.5" fill="${INK}"/>${P('M46 66 L50 70 L54 66 M30 64 H14 M70 64 H86', 'none', 1.8)}`),
  cow: ic(`${P('M22 46 Q20 22 50 22 Q80 22 78 46 Q80 70 66 76 H34 Q20 70 22 46 Z', '#f6f1e4', 2)}${P('M26 30 Q34 40 30 48 Q22 46 26 30 Z M64 26 Q74 30 72 40 Q62 38 64 26 Z', INK, 1)}${P('M14 30 Q4 28 8 20 Q16 18 22 28 M86 30 Q96 28 92 20 Q84 18 78 28', '#f6f1e4', 1.8)}${P('M30 22 Q28 10 36 12 M70 22 Q72 10 64 12', 'none', 2.4)}<circle cx="38" cy="44" r="3.2" fill="${INK}"/><circle cx="62" cy="44" r="3.2" fill="${INK}"/>${P('M32 58 Q50 52 68 58 Q72 78 50 80 Q28 78 32 58 Z', '#f2c6d4', 1.8)}<circle cx="42" cy="66" r="2.6" fill="${INK}"/><circle cx="58" cy="66" r="2.6" fill="${INK}"/>`),
  fish: ic(`${P('M20 50 Q46 22 76 50 Q46 78 20 50 Z M76 50 L92 36 L92 64 Z', '#8fb4b6', 2)}<circle cx="34" cy="46" r="3" fill="${INK}"/>`),
  woodpecker: ic(`${P('M50 80 Q30 76 32 50 Q40 26 58 30 Q66 40 62 60 Q60 78 50 80 Z', '#4f4a44', 2)}${P('M40 24 Q54 12 62 30 Z', '#c8463a', 1.6)}${P('M34 40 L14 44 L34 48 Z', '#e8a03a', 1.4)}<circle cx="42" cy="38" r="2.6" fill="#fff"/>${P('M70 10 V92', 'none', 8, 'stroke="#a8774a"')}`),
  rabbit: ic(`<g transform="translate(46 76) scale(2.4)">${rabbit(0, 0, 1)}</g>`),
  leafGreen: leafIc('#8fa66b'), leafPurple: leafIc('#b48ae0'), leafBlue: leafIc('#8fb4d6'),
  brave: ic(`<circle cx="50" cy="52" r="34" fill="#e8bf90" stroke="${INK}" stroke-width="2"/>${P('M34 42 L46 46 M66 42 L54 46', 'none', 2.6)}<ellipse cx="40" cy="52" rx="3.6" ry="5" fill="${INK}"/><ellipse cx="60" cy="52" rx="3.6" ry="5" fill="${INK}"/>${P('M38 68 Q50 76 62 66', 'none', 2.6)}${P('M76 30 l6 -10 M82 40 l10 -4', 'none', 2, 'stroke="#b5452f"')}`),
  sleepy: ic(`<circle cx="50" cy="52" r="34" fill="#e8bf90" stroke="${INK}" stroke-width="2"/>${P('M34 52 q6 4 12 0 M54 52 q6 4 12 0 M42 68 h16', 'none', 2.4)}<text x="76" y="30" font-family="serif" font-size="20" fill="${INK}">z</text><text x="84" y="18" font-family="serif" font-size="14" fill="${INK}">z</text>`),
  angry: ic(`<circle cx="50" cy="52" r="34" fill="#e8a07a" stroke="${INK}" stroke-width="2"/>${P('M32 40 L46 48 M68 40 L54 48', 'none', 2.6)}<circle cx="40" cy="54" r="3.6" fill="${INK}"/><circle cx="60" cy="54" r="3.6" fill="${INK}"/>${P('M38 72 Q50 62 62 72', 'none', 2.6)}`),
};
