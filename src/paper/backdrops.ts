/**
 * Latar meja khusus untuk tiap cerita (gaya kertas & tinta).
 * Muncul saat halaman cerita terbuka — "tergambar" melebar dari tengah.
 */
import { INK } from './ink';

const P = (d: string, fill = 'none', w = 2, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const jungleTree = (x: number, y: number, s = 1, c = '#7f9a5e') => `<g transform="translate(${x} ${y}) scale(${s})">
  ${P('M-14 0 Q-8 -60 -12 -120 Q-10 -160 0 -180 Q10 -160 12 -120 Q8 -60 14 0 Z', '#8a5a34', 2.2)}${P('M-4 -40 q6 10 0 24 M4 -90 q-6 12 0 26', 'none', 1.2)}
  ${P('M0 -260 Q60 -270 80 -220 Q120 -200 100 -160 Q90 -120 40 -140 Q0 -110 -40 -140 Q-90 -120 -100 -160 Q-120 -200 -80 -220 Q-60 -270 0 -260 Z', c, 2.4)}
  ${P('M-50 -210 q10 -10 20 0 M20 -220 q10 -10 20 0 M-10 -170 q10 -10 20 0 M50 -175 q10 -10 20 0', 'none', 1.3)}
  ${P('M-70 -150 Q-74 -110 -66 -80 M-40 -140 Q-46 -96 -40 -70 M60 -145 Q66 -100 58 -76', 'none', 1.6)}${[[-66, -80], [-40, -70], [58, -76]].map(([vx, vy]) => `<ellipse cx="${vx}" cy="${vy}" rx="5" ry="3" fill="#8fa66b" stroke="${INK}" stroke-width="1"/>`).join('')}</g>`;
const palm = (x: number, y: number, s = 1, bananas = false) => `<g transform="translate(${x} ${y}) scale(${s})">
  ${P('M-6 0 Q-2 -70 10 -140 L18 -140 Q6 -70 6 0 Z', '#a8774a', 2)}${[20, 50, 80, 110, 128].map((t) => P(`M${-4 + t * .08} ${-t} l12 -3`, 'none', 1)).join('')}
  ${[[-80, 20], [-40, -30], [10, -40], [60, -20], [90, 30]].map(([dx, dy]) => P(`M14 -140 Q${14 + dx * .5} ${-170 + dy * .4} ${14 + dx} ${-140 + dy} Q${14 + dx * .5} ${-150 + dy * .3} 14 -140`, '#9db872', 2)).join('')}
  ${bananas ? `<g transform="translate(20 -128)">${[0, 1, 2, 3, 4].map((i) => P(`M${-8 + i * 4} 0 q-2 12 ${4 + i} 18`, 'none', 4.5, 'stroke="#e8c14a"')).join('')}</g>` : ''}</g>`;
const fern = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${[-60, -30, 0, 30, 60].map((a) => `<g transform="rotate(${a})">${P('M0 0 Q4 -30 0 -60', 'none', 1.6)}${[12, 24, 36, 48].map((t) => P(`M0 ${-t} l-9 -6 M0 ${-t} l9 -6`, 'none', 1.2)).join('')}</g>`).join('')}</g>`;
const flowerS = (x: number, y: number, c: string) => `<g transform="translate(${x} ${y})">${P('M0 0 Q2 -8 0 -16', 'none', 1.2)}${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-21" rx="3.4" ry="5.4" transform="rotate(${a} 0 -16)" fill="${c}" stroke="${INK}" stroke-width=".9"/>`).join('')}<circle cy="-16" r="2.4" fill="#f2c94c" stroke="${INK}" stroke-width=".8"/></g>`;
const vine = (x: number, len: number, flip = 1) => `<g transform="translate(${x} -10)">${P(`M0 0 Q${18 * flip} ${len * .3} 0 ${len * .55} Q${-16 * flip} ${len * .8} ${6 * flip} ${len}`, 'none', 2.2, 'stroke="#5f7d42"')}
  ${Array.from({ length: Math.floor(len / 34) }, (_, i) => { const y = 20 + i * 34, dx = Math.sin(i * 1.3) * 10 * flip; return `<ellipse cx="${(dx + (i % 2 ? 9 : -9)).toFixed(1)}" cy="${y}" rx="9" ry="5" transform="rotate(${i % 2 ? 30 : -30} ${(dx + (i % 2 ? 9 : -9)).toFixed(1)} ${y})" fill="#8fa66b" stroke="${INK}" stroke-width="1.2"/>`; }).join('')}</g>`;
const parrot = (x: number, y: number, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})">${P('M0 0 Q-14 -10 -10 -30 Q-4 -44 10 -40 Q20 -34 16 -18 Q14 -4 0 0 Z', '#c8463a', 2)}${P('M12 -36 l10 4 -8 6', '#f2c94c', 1.4)}<circle cx="8" cy="-32" r="2" fill="${INK}"/>${P('M-6 -2 Q-14 20 -8 40 Q-2 22 4 0', '#3f7fa6', 1.6)}${P('M-10 -26 Q-22 -14 -12 -4', '#f2c94c', 1.4)}</g>`;
const rock = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-40 0 Q-44 -26 -16 -34 Q10 -44 32 -28 Q48 -14 40 0 Z', '#b8b09a', 2)}${P('M-30 -26 Q-10 -36 14 -32', 'none', 3, 'stroke="#8fa66b"')}${P('M-12 -12 l8 -4 M10 -16 l6 4', 'none', 1)}</g>`;
const grass = (n: number, y0: number) => Array.from({ length: n }, (_, i) => { const x = 10 + i * (1600 / n), y = y0 - (i % 4) * 7; return P(`M${x} ${y} l-4 -12 M${x + 6} ${y} l2 -14 M${x + 12} ${y} l6 -10`, 'none', 1.2); }).join('');

function forest() {
  return `<g filter="url(#wash)">
      <rect x="-50" y="-50" width="1700" height="1100" fill="#cfe0c2" opacity=".55"/>
      <ellipse cx="800" cy="160" rx="520" ry="220" fill="#f2e3a4" opacity=".55"/>
      <path d="M-50 640 Q300 560 640 620 Q1000 690 1300 600 Q1460 560 1650 600 V1050 H-50Z" fill="#a9c27e" opacity=".7"/>
      <path d="M-50 830 Q300 760 700 820 Q1100 880 1650 800 V1050 H-50Z" fill="#8fa66b" opacity=".6"/>
      <path d="M690 380 Q720 520 760 640" stroke="#bfe3ea" stroke-width="70" fill="none" opacity=".8"/>
      <path d="M760 640 Q820 760 980 820 Q1180 880 1260 1060" stroke="#9cc8cc" stroke-width="90" fill="none" opacity=".7"/>
    </g>
    <g filter="url(#rough)">
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${520 + i * 70} -20 L${380 + i * 110} 700" stroke="#fff6cf" stroke-width="${44 - i * 5}" opacity=".16"/>`).join('')}
      <!-- tebing & air terjun -->
      ${P('M600 640 Q590 470 640 360 Q700 300 760 320 Q800 420 790 640 Z', '#a8a08a', 2.2)}${P('M676 360 Q690 500 720 640', 'none', 1.2, 'stroke="#ffffff" stroke-width="3" opacity=".8"')}${P('M700 350 Q712 500 744 640', 'none', 1.2)}${P('M660 420 l-14 10 M770 470 l12 8 M640 540 l-12 6', 'none', 1.2)}
      ${P('M640 650 q20 -10 40 0 t40 0 t40 0', 'none', 1.4)}
      <!-- jembatan tali di kejauhan -->
      ${P('M880 420 Q960 470 1040 420', 'none', 2)}${P('M880 400 Q960 450 1040 400', 'none', 1.2)}${Array.from({ length: 7 }, (_, i) => { const x = 892 + i * 22; const y = 420 + Math.sin((i + 1) / 8 * Math.PI) * 26; return P(`M${x} ${y.toFixed(0)} v-18`, 'none', 1.1); }).join('')}
      <!-- rumah pohon -->
      <g transform="translate(1380 640)">${jungleTree(0, 0, 1.25, '#8fa66b')}<g transform="translate(0 -200)">${P('M-70 0 H70 V-70 H-70 Z', '#d9b07c', 2.4)}${P('M-86 -66 L0 -130 L86 -66 Z', '#c8714a', 2.4)}<circle cx="0" cy="-36" r="18" fill="#f3e6c8" stroke="${INK}" stroke-width="2"/>${P('M0 -54 V-18 M-18 -36 H18', 'none', 1.4)}${P('M-60 0 V60 M-48 0 V60 M-60 20 H-48 M-60 40 H-48', 'none', 1.6)}${P('M-90 4 H90', 'none', 3)}</g></g>
      ${jungleTree(160, 700, 1.4)}${jungleTree(400, 660, .9, '#9db872')}${jungleTree(1120, 650, .85, '#9db872')}
      ${palm(40, 1000, 1.6, true)}${palm(1560, 980, 1.5, true)}${palm(520, 700, .8)}${palm(1240, 690, .75, true)}
      ${fern(260, 1000, 1.3)}${fern(1320, 1010, 1.2)}${fern(600, 990, .9)}${fern(1050, 1000, 1)}
      ${[[200, 960, '#e3a6d8'], [330, 990, '#f2c94c'], [460, 975, '#e8a07a'], [1100, 980, '#b48ae0'], [1200, 960, '#e8a07a'], [1460, 990, '#f2c94c']].map(([x, y, c]) => flowerS(x as number, y as number, c as string)).join('')}
      ${rock(330, 900, 1.3)}${rock(1260, 905, 1.1)}
      ${parrot(170, 470, 1.3)}${parrot(1400, 360, 1.1, -1)}${parrot(430, 420, .8, -1)}
      ${vine(40, 260)}${vine(110, 180, -1)}${vine(190, 320)}${vine(300, 150, -1)}${vine(1300, 170)}${vine(1400, 300, -1)}${vine(1480, 220)}${vine(1560, 340, -1)}
      ${P('M-20 20 Q200 60 360 10 M1240 10 Q1420 70 1640 24', 'none', 3, 'stroke="#5f7d42"')}
      <g class="pj-bflies">${[[260, 600, '#e8a07a'], [1330, 560, '#b48ae0'], [520, 360, '#f2c94c'], [1180, 420, '#e3a6d8']].map(([x, y, c], i) => `<g class="bfly" style="animation-delay:${-i * 1.7}s" transform="translate(${x} ${y})"><path d="M0 0 Q-16 -22 -24 -10 Q-26 4 0 0 Q-18 16 -10 20 Q-2 20 0 0 Q16 -22 24 -10 Q26 4 0 0 Q18 16 10 20 Q2 20 0 0" fill="${c}" fill-opacity=".8" stroke="${INK}" stroke-width="1.4"/></g>`).join('')}</g>
      ${grass(40, 1000)}
    </g>`;
}

function kingdom() {
  return `<g filter="url(#wash)"><rect x="-50" y="-50" width="1700" height="1100" fill="#d9dcc8" opacity=".55"/><ellipse cx="800" cy="200" rx="600" ry="240" fill="#f4dcae" opacity=".55"/>
      <path d="M-50 660 Q400 560 800 620 Q1200 680 1650 600 V1050 H-50Z" fill="#a9c27e" opacity=".65"/><path d="M-50 860 Q500 790 900 850 Q1300 900 1650 820 V1050 H-50Z" fill="#8fa66b" opacity=".55"/></g>
    <g filter="url(#rough)">
      <g transform="translate(800 640)">${P('M-260 0 V-120 H260 V0', '#efe0bf', 2.4)}${Array.from({ length: 14 }, (_, i) => P(`M${-260 + i * 40} -120 v-14 h20 v14`, 'none', 1.6)).join('')}
        ${[-300, 300].map((x) => `${P(`M${x - 50} 0 V-220 H${x + 50} V0`, '#f3e6c8', 2.4)}${P(`M${x - 62} -220 L${x} -310 L${x + 62} -220 Z`, '#b5452f', 2.4)}${P(`M${x} -310 V-350 l26 8 -26 8`, '#c8714a', 1.6)}`).join('')}
        ${P('M-90 -120 V-330 H90 V-120', '#f3e6c8', 2.4)}${P('M-110 -330 L0 -460 L110 -330 Z', '#b5452f', 2.6)}${P('M0 -460 V-510 l34 10 -34 10', '#e8c14a', 1.8)}
        ${P('M-40 0 V-70 Q0 -110 40 -70 V0', '#8a5a34', 2.2)}${P('M-60 -200 v-30 h24 v30 Z M36 -200 v-30 h24 v30 Z', '#cfe3e6', 1.6)}${P('M-200 -60 v-24 h20 v24 Z M180 -60 v-24 h20 v24 Z', '#cfe3e6', 1.4)}</g>
      ${P('M720 1060 Q760 860 780 650 M880 1060 Q840 860 820 650', 'none', 1.6)}
      ${[[120, 720], [240, 700], [1360, 700], [1480, 720]].map(([x, y]) => `<g transform="translate(${x} ${y})">${P('M-16 0 V-30 H16 V0 Z', '#f3e2bd', 1.8)}${P('M-22 -28 L0 -50 L22 -28 Z', '#c8714a', 1.8)}</g>`).join('')}
      ${[[300, 900], [380, 930], [1220, 920], [1300, 900]].map(([x, y]) => `<g transform="translate(${x} ${y})">${P('M-18 0 Q-22 -16 0 -18 Q22 -16 18 0 Z', '#f6f1e4', 1.8)}<circle cx="20" cy="-12" r="6" fill="#3b2a1a"/>${P('M-10 0 v8 M8 0 v8', 'none', 1.6)}</g>`).join('')}
      ${grass(40, 1000)}</g>`;
}

function sakura() {
  const tree = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-10 0 Q-6 -60 -30 -110 M-4 -50 Q20 -90 40 -120 M-10 0 H10 Q6 -60 -4 -50', '#8a5a34', 3)}
    ${[[-60, -140, 60], [0, -170, 70], [60, -140, 60], [-20, -110, 50], [40, -100, 46]].map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f2c6d4" stroke="${INK}" stroke-width="2.2"/>`).join('')}
    ${Array.from({ length: 16 }, (_, i) => `<circle cx="${-90 + (i * 37) % 180}" cy="${-200 + (i * 53) % 140}" r="4" fill="#e79ab2"/>`).join('')}</g>`;
  return `<g filter="url(#wash)"><rect x="-50" y="-50" width="1700" height="1100" fill="#f1dfe4" opacity=".55"/><path d="M-50 700 Q800 600 1650 700 V1050 H-50Z" fill="#c9d8a4" opacity=".65"/></g>
    <g filter="url(#rough)">
      <g transform="translate(800 700)">${P('M-160 0 V-90 H160 V0', '#f3e6c8', 2.2)}${P('M-200 -90 Q0 -190 200 -90 Z', '#b5452f', 2.4)}${P('M-120 -150 Q0 -230 120 -150', 'none', 2)}${P('M-60 0 V-60 H60 V0', '#e8bf90', 1.8)}</g>
      ${tree(180, 760, 1.6)}${tree(1420, 760, 1.6)}${tree(480, 700, 1)}${tree(1120, 700, 1)}
      ${[[360, 300], [600, 240], [1000, 260], [1240, 310]].map(([x, y]) => `<g transform="translate(${x} ${y})">${P('M0 -40 V0', 'none', 1.2)}<ellipse cx="0" cy="18" rx="16" ry="20" fill="#e8a07a" stroke="${INK}" stroke-width="2"/>${P('M-12 4 H12 M-12 32 H12', 'none', 1.4)}</g>`).join('')}
      <g class="pj-petals">${Array.from({ length: 30 }, (_, i) => `<ellipse cx="${(i * 97) % 1600}" cy="${(i * 61) % 900}" rx="5" ry="3" fill="#e79ab2" transform="rotate(${i * 23} ${(i * 97) % 1600} ${(i * 61) % 900})"/>`).join('')}</g>
      ${grass(40, 1000)}</g>`;
}

function pond() {
  return `<g filter="url(#wash)"><rect x="-50" y="-50" width="1700" height="1100" fill="#d3e3d3" opacity=".55"/><path d="M-50 640 Q800 560 1650 640 V1050 H-50Z" fill="#a9c27e" opacity=".6"/>
      <ellipse cx="800" cy="860" rx="720" ry="200" fill="#8fb4b6" opacity=".7"/></g>
    <g filter="url(#rough)">
      ${P('M80 860 Q800 600 1520 860 Q800 1110 80 860 Z', 'none', 2)}
      ${[[300, 860], [520, 930], [760, 820], [1000, 900], [1260, 850], [640, 990], [1120, 1000]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><path d="M0 0 m-40 0 a40 16 0 1 0 80 0 a40 16 0 1 0 -80 0 Z M0 0 L40 -4" fill="#8fa66b" stroke="${INK}" stroke-width="2"/>${i % 2 ? `<g transform="translate(0 -6)">${[-30, -10, 10, 30].map((a) => `<ellipse cx="0" cy="-14" rx="6" ry="14" transform="rotate(${a})" fill="#f2c6d4" stroke="${INK}" stroke-width="1.4"/>`).join('')}</g>` : ''}</g>`).join('')}
      <g transform="translate(760 812)">${P('M-26 0 Q-30 -26 0 -28 Q30 -26 26 0 Z', '#8fa66b', 2.2)}<circle cx="-12" cy="-26" r="8" fill="#f3e6c8" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="-26" r="8" fill="#f3e6c8" stroke="${INK}" stroke-width="2"/><circle cx="-12" cy="-26" r="3" fill="${INK}"/><circle cx="12" cy="-26" r="3" fill="${INK}"/>${P('M-10 -10 Q0 -4 10 -10', 'none', 1.6)}${P('M-10 -40 l4 -10 6 6 6 -6 4 10', '#e8c14a', 1.6)}</g>
      ${Array.from({ length: 22 }, (_, i) => { const x = 60 + i * 72 + (i % 3) * 10, y = 700 + (i % 2) * 20; return P(`M${x} ${y} Q${x - 4} ${y - 60} ${x + 2} ${y - 100}`, 'none', 2) + `<ellipse cx="${x + 2}" cy="${y - 92}" rx="4" ry="14" fill="#8a5a34" stroke="${INK}" stroke-width="1.2"/>`; }).join('')}
      <g transform="translate(1380 420)">${P('M0 280 Q-10 140 10 0', '#8a5a34', 3)}${Array.from({ length: 9 }, (_, i) => P(`M${10 + (i - 4) * 18} ${10 + Math.abs(i - 4) * 6} Q${10 + (i - 4) * 30} 120 ${10 + (i - 4) * 34} 240`, 'none', 1.6, 'stroke="#6f8f4e"')).join('')}</g>
      ${[[400, 520], [1100, 560]].map(([x, y]) => `<g transform="translate(${x} ${y})">${P('M-30 0 H30', 'none', 2.2)}<ellipse cx="-10" cy="-6" rx="12" ry="5" fill="#cfe3e6" stroke="${INK}" stroke-width="1.2"/><ellipse cx="10" cy="-6" rx="12" ry="5" fill="#cfe3e6" stroke="${INK}" stroke-width="1.2"/></g>`).join('')}
      ${grass(40, 700)}</g>`;
}

const SCENES: Record<string, () => string> = { 'petualangan-si-monyet': forest, 'kisah-sang-raja-hebat': kingdom, 'si-putri-cantik': sakura, 'kodok-pangeran': pond };

export function storyBackdrop(bookId: string) {
  const f = SCENES[bookId] ?? forest;
  return `<svg class="pj-map" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${f()}</svg>`;
}
