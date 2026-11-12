/**
 * GAYA TERKUNCI "KERTAS PETA" — semua gambar Story Book digambar dengan tinta
 * cokelat di atas kertas perkamen, diberi sapuan cat air tipis.
 * File ini: tekstur kertas, filter tinta (garis goyang tangan), dan gambar tinta
 * yang dipakai ulang di seluruh aplikasi.
 */

export const INK = '#3b2a1a';
export const SEPIA = '#7a5634';
export const ROUTE = '#b5452f';

/** Tekstur kertas dibuat sekali di kanvas → CSS var --paper-tex (tanpa file gambar). */
export function installPaper() {
  if (document.getElementById('ink-defs')) return;
  const mk = (w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); if (!x) return '';
    draw(x); return c.toDataURL('image/png');
  };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // serat & bintik kertas (ubin 256px, tembus pandang → dipakai dengan multiply)
  const grain = mk(256, 256, (x) => {
    const d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = 120 + rnd() * 70; d.data[i] = v; d.data[i + 1] = v * .9; d.data[i + 2] = v * .72; d.data[i + 3] = rnd() < .5 ? 10 + rnd() * 16 : 0; }
    x.putImageData(d, 0, 0);
    x.globalAlpha = .07; x.strokeStyle = '#6b4a2a';
    for (let i = 0; i < 90; i++) { x.lineWidth = rnd() * .8; x.beginPath(); const sx = rnd() * 256, sy = rnd() * 256; x.moveTo(sx, sy); x.quadraticCurveTo(sx + rnd() * 30 - 15, sy + rnd() * 6, sx + rnd() * 50 - 25, sy + rnd() * 10 - 5); x.stroke(); }
  });
  // noda & bercak tua (ubin besar)
  const stains = mk(900, 700, (x) => {
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * 900, cy = rnd() * 700, r = 30 + rnd() * 170;
      const g = x.createRadialGradient(cx, cy, r * .2, cx, cy, r);
      g.addColorStop(0, `rgba(150,105,55,${.02 + rnd() * .05})`); g.addColorStop(.85, `rgba(140,95,45,${.03 + rnd() * .05})`); g.addColorStop(1, 'rgba(140,95,45,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
  });
  const root = document.documentElement.style;
  if (grain) root.setProperty('--paper-grain', `url(${grain})`);
  if (stains) root.setProperty('--paper-stain', `url(${stains})`);

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.id = 'ink-defs'; defs.setAttribute('aria-hidden', 'true');
  defs.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  defs.innerHTML = `<defs>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="1" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
    <filter id="rough-lg" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="1" seed="9"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
    <filter id="wash" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="26" result="d"/><feGaussianBlur in="d" stdDeviation="2.5"/></filter>
    <filter id="deckle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="11"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
  </defs>`;
  document.body.prepend(defs);
}

const s = (d: string, w = 2.2, extra = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

/** Mawar angin (kompas) bergaya peta tua. */
export function compass(size = 160) {
  const pts = (r1: number, r2: number, n: number, rot = 0) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * Math.PI / n; const r = i % 2 ? r2 : r1; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  return `<svg class="ink-compass" viewBox="-100 -100 200 200" width="${size}" height="${size}" aria-hidden="true"><g filter="url(#rough)">
    <circle r="78" fill="none" stroke="${INK}" stroke-width="1.6"/><circle r="70" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="2 4"/>
    <polygon points="${pts(64, 12, 8, -Math.PI / 2 + Math.PI / 8)}" fill="#e7cf9f" stroke="${INK}" stroke-width="1.2"/>
    <polygon points="${pts(90, 15, 4, -Math.PI / 2)}" fill="#c8714a" fill-opacity=".55" stroke="${INK}" stroke-width="1.8"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M0 0 L${i % 2 ? 15 : 0} ${i % 2 ? 0 : -15} L0 ${-90}" transform="rotate(${i * 90})" fill="${INK}" fill-opacity=".75"/>`).join('')}
    <circle r="7" fill="#f3e4c3" stroke="${INK}" stroke-width="1.6"/>
    <text y="-92" text-anchor="middle" class="ink-lbl" font-size="18">U</text><text y="106" text-anchor="middle" class="ink-lbl" font-size="16">S</text>
    <text x="100" y="6" text-anchor="middle" class="ink-lbl" font-size="16">T</text><text x="-100" y="6" text-anchor="middle" class="ink-lbl" font-size="16">B</text></g></svg>`;
}

/** Kapal layar kecil. */
export const ship = (w = 90) => `<svg class="ink-ship" viewBox="0 0 100 80" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  <path d="M10 52 Q50 64 90 52 L82 66 Q50 74 18 66 Z" fill="#a8774a" stroke="${INK}" stroke-width="2"/>
  ${s('M50 54 V10', 2)} ${s('M36 54 V22', 1.6)} ${s('M64 54 V24', 1.6)}
  <path d="M51 12 Q72 22 51 44 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="1.6"/><path d="M37 24 Q24 34 37 46 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="1.4"/>
  <path d="M65 26 Q80 34 65 46 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="1.4"/><path d="M50 10 l10 3 -10 3" fill="${ROUTE}" stroke="${INK}" stroke-width="1"/>
  ${s('M6 70 q8 -5 16 0 t16 0', 1.2)} ${s('M60 72 q8 -5 16 0 t16 0', 1.2)}</g></svg>`;

/** Ular laut ramah (dekorasi peta). */
export const serpent = (w = 120) => `<svg class="ink-serpent" viewBox="0 0 140 70" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  <path d="M8 50 Q18 22 30 46 Q40 64 52 40 Q62 18 74 44 Q84 64 96 40 Q104 26 116 28 Q130 30 128 42 Q120 38 114 42" fill="none" stroke="#5f8a6a" stroke-width="9" stroke-linecap="round"/>
  ${s('M8 50 Q18 22 30 46 Q40 64 52 40 Q62 18 74 44 Q84 64 96 40 Q104 26 116 28 Q130 30 128 42', 1.8)}
  <circle cx="121" cy="32" r="2" fill="${INK}"/>${s('M112 24 l-3 -8 M118 23 l1 -8', 1.4)}
  ${s('M0 56 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0', 1.2)}</g></svg>`;

/** Ombak bergaya ukiran. */
export const waves = (w = 160) => `<svg class="ink-waves" viewBox="0 0 160 40" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  ${s('M4 26 Q16 6 30 22 Q22 20 24 30', 1.8)}${s('M30 22 Q44 6 58 24', 1.6)}${s('M70 28 Q84 8 98 26 Q90 24 92 34', 1.8)}${s('M98 26 Q112 10 126 28', 1.6)}
  ${s('M0 36 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0', 1)}</g></svg>`;

/** Rantai gunung kecil. */
export const mountains = (w = 150) => `<svg class="ink-mtn" viewBox="0 0 150 60" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  ${[[10, 50, 30, 14, 52], [40, 52, 64, 6, 90], [80, 52, 102, 16, 126], [112, 52, 128, 26, 146]].map(([a, b, c, d, e]) => `<path d="M${a} ${b} L${c} ${d} L${e} ${b}" fill="#d9c08f" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>${s(`M${c} ${d} L${c - 4} ${d + 14} M${c + 3} ${d + 6} L${c + 7} ${d + 18}`, 1)}`).join('')}</g></svg>`;

/** Ikon jenjang — gambar tinta sederhana. */
export const levelArt: Record<string, string> = {
  balita: `<svg viewBox="0 0 120 120" aria-hidden="true"><g filter="url(#rough)">
    <ellipse cx="60" cy="104" rx="40" ry="6" fill="#7a5634" opacity=".18"/>
    <path d="M30 78 Q30 54 54 54 Q60 34 78 40 Q92 46 86 60 Q100 64 98 80 Q96 98 64 98 Q34 98 30 78Z" fill="#f2d27a" stroke="${INK}" stroke-width="2.4"/>
    <path d="M86 52 l14 -4 -10 12" fill="#e08a4a" stroke="${INK}" stroke-width="2"/><circle cx="80" cy="48" r="3" fill="${INK}"/>
    ${s('M44 74 Q56 84 70 74', 2)}${s('M20 100 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0', 1.4)}</g></svg>`,
  tk: `<svg viewBox="0 0 120 120" aria-hidden="true"><g filter="url(#rough)">
    <ellipse cx="60" cy="106" rx="44" ry="6" fill="#7a5634" opacity=".18"/>
    <rect x="16" y="62" width="38" height="38" fill="#e8a07a" stroke="${INK}" stroke-width="2.4" transform="rotate(-6 35 81)"/>
    <rect x="58" y="64" width="38" height="38" fill="#8fb3c2" stroke="${INK}" stroke-width="2.4" transform="rotate(5 77 83)"/>
    <rect x="38" y="24" width="38" height="38" fill="#a9c27e" stroke="${INK}" stroke-width="2.4" transform="rotate(-3 57 43)"/>
    <text x="35" y="90" class="ink-lbl" font-size="24" text-anchor="middle" transform="rotate(-6 35 81)">A</text><text x="77" y="92" class="ink-lbl" font-size="24" text-anchor="middle" transform="rotate(5 77 83)">B</text><text x="57" y="52" class="ink-lbl" font-size="24" text-anchor="middle">C</text></g></svg>`,
  sd: `<svg viewBox="0 0 120 120" aria-hidden="true"><g filter="url(#rough)">
    <ellipse cx="60" cy="104" rx="46" ry="6" fill="#7a5634" opacity=".18"/>
    <path d="M14 40 Q38 30 60 42 Q82 30 106 40 V96 Q82 86 60 98 Q38 86 14 96 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="2.4"/>${s('M60 42 V98', 2)}
    ${s('M24 52 Q38 47 52 54 M24 62 Q38 57 52 64 M24 72 Q38 67 52 74 M68 54 Q82 47 96 52 M68 64 Q82 57 96 62', 1.2)}
    <path d="M88 16 l12 6 -30 58 -12 -6 Z" fill="#e6b85a" stroke="${INK}" stroke-width="2"/><path d="M58 74 l12 6 -14 8 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="1.6"/></g></svg>`,
};

/** Ikon pilihan mode cerita. */
export const modeArt = {
  full: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)">
    <path d="M12 26 Q36 16 60 28 Q84 16 108 26 V84 Q84 74 60 86 Q36 74 12 84 Z" fill="#f3e6c8" stroke="${INK}" stroke-width="2.4"/>${s('M60 28 V86', 2)}
    ${s('M22 40 Q36 35 50 42 M22 50 Q36 45 50 52 M22 60 Q36 55 50 62', 1.2)}
    <path d="M70 46 q6 -10 14 0 v18 q-8 8 -14 0 Z" fill="#c8714a" fill-opacity=".6" stroke="${INK}" stroke-width="2"/>${s('M90 44 q8 10 0 22 M96 38 q14 16 0 34', 1.8)}</g></svg>`,
  play: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)">
    <path d="M24 30 h22 a8 8 0 1 1 14 0 h22 v22 a8 8 0 1 0 0 14 v22 h-58 Z" fill="#a9c27e" stroke="${INK}" stroke-width="2.4"/>
    <path d="M88 16 l4 9 10 1 -8 7 3 10 -9 -5 -9 5 3 -10 -8 -7 10 -1 Z" fill="#f2c94c" stroke="${INK}" stroke-width="1.8"/>
    ${s('M104 54 l8 -4 M104 64 l9 2 M98 74 l6 6', 1.8)}</g></svg>`,
};

/** Garis rute putus-putus merah (seperti peta harta). */
export const routeLine = (d: string, w = 3) => `<path class="ink-route" d="${d}" fill="none" stroke="${ROUTE}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="2 ${w * 3.2}"/>`;

/** Hiasan pemisah bergaya ukiran. */
export const flourish = (w = 220) => `<svg class="ink-flourish" viewBox="0 0 220 24" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  ${s('M10 12 Q60 2 100 12 M120 12 Q160 22 210 12', 1.4)}<path d="M110 4 l6 8 -6 8 -6 -8 Z" fill="${ROUTE}" fill-opacity=".7" stroke="${INK}" stroke-width="1.2"/>
  <circle cx="10" cy="12" r="2.4" fill="${INK}"/><circle cx="210" cy="12" r="2.4" fill="${INK}"/></g></svg>`;

/** Peta latar meja: lautan cat air, daratan, rute, kapal, ular laut, kompas. */
export function deskMap() {
  return `<svg class="pj-map" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="sea" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#9cc0c0" stop-opacity=".55"/><stop offset="1" stop-color="#6f9aa6" stop-opacity=".35"/></radialGradient></defs>
    <rect x="-50" y="-50" width="1700" height="1100" fill="url(#sea)" filter="url(#wash)"/>
    <g filter="url(#wash)" opacity=".85">
      <path d="M-40 120 Q120 60 260 150 Q330 230 300 330 Q250 430 330 520 Q380 600 300 700 Q200 820 -40 820Z" fill="#e2b98a"/>
      <path d="M1180 -40 Q1260 90 1360 120 Q1480 150 1520 260 Q1560 380 1480 470 Q1400 560 1460 680 Q1520 780 1660 800 L1660 -40Z" fill="#dcb07c"/>
      <path d="M560 760 Q660 690 780 730 Q900 780 960 870 Q980 960 860 1040 L520 1040 Q480 880 560 760Z" fill="#d7c08a"/>
      <path d="M700 120 Q760 80 830 110 Q880 150 840 200 Q780 230 720 200 Q680 170 700 120Z" fill="#cdb98a"/>
    </g>
    <g filter="url(#rough-lg)" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" opacity=".85">
      <path d="M-40 120 Q120 60 260 150 Q330 230 300 330 Q250 430 330 520 Q380 600 300 700 Q200 820 -40 820"/>
      <path d="M1180 -40 Q1260 90 1360 120 Q1480 150 1520 260 Q1560 380 1480 470 Q1400 560 1460 680 Q1520 780 1660 800"/>
      <path d="M560 760 Q660 690 780 730 Q900 780 960 870 Q980 960 860 1040 M520 1040 Q480 880 560 760"/>
      <path d="M700 120 Q760 80 830 110 Q880 150 840 200 Q780 230 720 200 Q680 170 700 120Z"/>
    </g>
    <g class="pj-map__route">${routeLine('M250 300 Q480 220 640 330 Q760 420 980 360 Q1160 300 1330 380', 3.4)}</g>
    <g font-family="'IM Fell English SC', serif" fill="${INK}" opacity=".8">
      <text x="70" y="420" font-size="34" letter-spacing="6">NEGERI DONGENG</text>
      <text x="1330" y="300" font-size="30" letter-spacing="5">PULAU ANGKA</text>
      <text x="610" y="900" font-size="28" letter-spacing="5">HUTAN HEWAN</text>
      <text x="880" y="560" font-size="40" letter-spacing="10" font-style="italic" opacity=".7">Lautan Cerita</text>
    </g>
  </svg>`;
}

/* ---------- sketsa tinta lepas (bukan peta): awan, matahari, burung, pohon, kupu-kupu ---------- */
export const cloud = (w = 180) => `<svg class="ink-cloud" viewBox="0 0 180 80" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  <path d="M20 62 Q6 60 10 46 Q14 34 30 38 Q32 18 54 20 Q66 4 86 14 Q104 2 118 20 Q140 14 146 34 Q170 34 166 52 Q164 64 146 62 Z" fill="#f7eedb" fill-opacity=".85" stroke="${INK}" stroke-width="2"/>
  ${s('M40 50 Q52 44 64 50 M96 46 Q110 40 124 48', 1.2, 'opacity=".6"')}</g></svg>`;

export const sun = (w = 150) => `<svg class="ink-sun" viewBox="-80 -80 160 160" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  <circle r="30" fill="#f2c94c" fill-opacity=".55" stroke="${INK}" stroke-width="2.2"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M0 -40 Q${i % 2 ? 6 : -6} -52 0 ${i % 2 ? -66 : -58}" transform="rotate(${i * 30})" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`).join('')}
  ${s('M-12 -4 q4 -4 8 0 M4 -4 q4 -4 8 0', 1.8)}${s('M-10 10 Q0 18 10 10', 1.8)}</g></svg>`;

export const birds = (w = 120) => `<svg class="ink-birds" viewBox="0 0 120 50" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  ${s('M10 30 q8 -10 16 0 q8 -10 16 0', 2)}${s('M56 16 q6 -8 12 0 q6 -8 12 0', 1.8)}${s('M86 34 q5 -6 10 0 q5 -6 10 0', 1.6)}</g></svg>`;

export const tree = (w = 120, c = '#a9c27e') => `<svg class="ink-tree" viewBox="0 0 120 160" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  <path d="M54 156 Q58 110 52 96 L66 96 Q62 112 68 156 Z" fill="#a8774a" stroke="${INK}" stroke-width="2"/>
  <path d="M60 10 Q90 12 98 40 Q116 50 108 74 Q112 98 86 104 Q70 116 52 106 Q24 112 18 88 Q2 70 18 52 Q20 22 60 10 Z" fill="${c}" fill-opacity=".8" stroke="${INK}" stroke-width="2.2"/>
  ${s('M40 50 q8 -8 16 0 M66 66 q8 -8 16 0 M34 80 q8 -8 16 0', 1.3, 'opacity=".7"')}</g></svg>`;

export const butterfly = (w = 60) => `<svg class="ink-butterfly" viewBox="0 0 60 50" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  <g class="ink-butterfly__w"><path d="M30 25 Q14 0 6 14 Q2 28 30 25 Q10 44 18 46 Q28 46 30 25" fill="#e8a07a" fill-opacity=".75" stroke="${INK}" stroke-width="1.6"/>
  <path d="M30 25 Q46 0 54 14 Q58 28 30 25 Q50 44 42 46 Q32 46 30 25" fill="#e8a07a" fill-opacity=".75" stroke="${INK}" stroke-width="1.6"/></g>
  ${s('M30 14 V36 M30 14 q-4 -8 -8 -10 M30 14 q4 -8 8 -10', 1.6)}</g></svg>`;

/** Latar meja: kertas sketsa dengan bukit cat air & coretan tinta (tanpa label peta). */
export function deskSketch() {
  return `<svg class="pj-map" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g filter="url(#wash)">
      <ellipse cx="300" cy="180" rx="360" ry="200" fill="#a9c6cc" opacity=".35"/>
      <ellipse cx="1350" cy="200" rx="320" ry="180" fill="#f2c94c" opacity=".22"/>
      <path d="M-60 820 Q200 660 460 760 Q700 860 980 740 Q1260 620 1660 760 L1660 1060 L-60 1060Z" fill="#a9c27e" opacity=".5"/>
      <path d="M-60 900 Q260 800 560 880 Q880 960 1200 860 Q1450 790 1660 880 L1660 1060 L-60 1060Z" fill="#8fa66b" opacity=".45"/>
    </g>
    <g filter="url(#rough-lg)" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity=".8">
      <path d="M-60 820 Q200 660 460 760 Q700 860 980 740 Q1260 620 1660 760"/>
      <path d="M-60 900 Q260 800 560 880 Q880 960 1200 860 Q1450 790 1660 880"/>
      ${Array.from({ length: 26 }, (_, i) => { const x = 40 + i * 62, y = 905 - Math.sin(i * .9) * 28 + (i % 3) * 14; return `<path d="M${x} ${y} l-4 -12 M${x + 6} ${y} l2 -14 M${x + 12} ${y} l6 -10"/>`; }).join('')}
    </g>
  </svg>`;
}

/* =====================================================================
   ADEGAN BESAR — latar meja yang ramai & ilustrasi Momo membaca
   ===================================================================== */
const P = (d: string, fill = 'none', w = 2, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const hatch = (x: number, y: number, n: number, len = 10, gap = 5, ang = -35) => Array.from({ length: n }, (_, i) => `<path d="M${x + i * gap} ${y} l${(Math.cos(ang * Math.PI / 180) * len).toFixed(1)} ${(Math.sin(ang * Math.PI / 180) * len).toFixed(1)}" stroke="${INK}" stroke-width=".9" opacity=".55"/>`).join('');

const house = (x: number, y: number, s = 1, roof = '#c8714a') => `<g transform="translate(${x} ${y}) scale(${s})">
  ${P('M-22 0 V-30 H22 V0 Z', '#f3e2bd')}${P('M-28 -28 L0 -52 L28 -28 Z', roof)}${P('M-6 0 V-14 H6 V0', '#a8774a', 1.6)}${P('M10 -24 h8 v8 h-8 z', '#cfe3e6', 1.4)}${P('M12 -40 v-12 h7 v18', '#e6d3ad', 1.6)}
  ${hatch(-26, -30, 8, 8, 6.5, -50)}</g>`;
const pine = (x: number, y: number, s = 1, c = '#7f9a5e') => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-3 0 V8 H3 V0', '#8a5a34', 1.4)}${P('M0 -62 L18 -30 H8 L22 -6 H-22 L-8 -30 H-18 Z', c)}${P('M-6 -20 l6 -6 6 6 M-8 -40 l8 -6 8 6', 'none', 1)}</g>`;
const roundTree = (x: number, y: number, s = 1, c = '#9db872') => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-5 0 Q-3 -24 -6 -30 H6 Q3 -24 5 0 Z', '#8a5a34', 1.6)}${P('M0 -82 Q26 -80 30 -58 Q44 -46 32 -30 Q24 -16 0 -22 Q-26 -14 -32 -32 Q-44 -48 -28 -62 Q-24 -82 0 -82 Z', c)}${P('M-14 -60 q6 -6 12 0 M6 -44 q6 -6 12 0', 'none', 1.1)}</g>`;
const flower = (x: number, y: number, c = '#e8a07a') => `<g transform="translate(${x} ${y})">${P('M0 0 Q2 -8 0 -16', 'none', 1.2)}${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-21" rx="3" ry="5" transform="rotate(${a} 0 -16)" fill="${c}" stroke="${INK}" stroke-width=".9"/>`).join('')}<circle cy="-16" r="2.2" fill="#f2c94c" stroke="${INK}" stroke-width=".8"/></g>`;
const mushroom = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-5 0 Q-4 -10 -5 -14 H5 Q4 -10 5 0 Z', '#f3e6c8', 1.4)}${P('M-16 -12 Q-14 -30 0 -30 Q14 -30 16 -12 Z', '#c8714a', 1.6)}<circle cx="-6" cy="-21" r="2.5" fill="#f3e6c8"/><circle cx="6" cy="-18" r="2" fill="#f3e6c8"/></g>`;
const rabbit = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-14 0 Q-20 -18 -4 -22 Q8 -24 12 -12 Q16 0 4 0 Z', '#efe3c9')}${P('M4 -20 Q2 -40 8 -42 Q12 -38 9 -20 M10 -20 Q12 -38 18 -38 Q20 -32 13 -18', '#efe3c9', 1.6)}<circle cx="12" cy="-15" r="1.6" fill="${INK}"/>${P('M-16 -6 q-5 -2 -4 -7', 'none', 1.6)}</g>`;
const deer = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-26 -30 Q-28 -46 -4 -44 Q14 -46 18 -36 L26 -54 Q34 -56 34 -48 L28 -34 Q24 -26 14 -26 Q0 -22 -20 -26 Z', '#c99a64')}
  ${P('M-20 -28 L-22 0 M-12 -26 L-10 0 M6 -26 L4 0 M14 -27 L16 0', 'none', 2)}${P('M30 -54 l-4 -10 M30 -54 l6 -9 M27 -60 l-6 -2', 'none', 1.4)}<circle cx="31" cy="-48" r="1.4" fill="${INK}"/></g>`;
const duck = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-12 0 Q-14 -10 0 -10 Q6 -18 12 -14 Q16 -10 12 -6 Q14 0 4 2 Z', '#f2d27a', 1.4)}${P('M14 -12 l6 1 -5 3', '#e08a4a', 1)}<circle cx="9" cy="-13" r="1.1" fill="${INK}"/></g>`;
const kite = (x: number, y: number, ch: string, c: string) => `<g class="ink-kite" transform="translate(${x} ${y})"><g filter="url(#rough)">${P('M0 -34 L22 0 L0 34 L-22 0 Z', c)}${P('M0 -34 V34 M-22 0 H22', 'none', 1)}
  <text y="9" text-anchor="middle" font-family="'IM Fell English', serif" font-size="24" fill="${INK}">${ch}</text>${P('M0 34 Q-10 60 6 84 Q20 110 0 140', 'none', 1.2)}
  ${[60, 90, 118].map((t, i) => `<path d="M${i % 2 ? 4 : -2} ${t} l-6 -4 l0 8 Z M${i % 2 ? 4 : -2} ${t} l6 -4 l0 8 Z" fill="${ROUTE}" stroke="${INK}" stroke-width=".8"/>`).join('')}</g></g>`;

/** Latar meja yang ramai: negeri belajar bergaya tinta & cat air. */
export function deskScene() {
  return `<svg class="pj-map" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g filter="url(#wash)">
      <rect x="-50" y="-50" width="1700" height="560" fill="#b9d2d2" opacity=".32"/>
      <ellipse cx="1340" cy="150" rx="300" ry="170" fill="#f2c94c" opacity=".22"/>
      <path d="M-50 470 L120 330 L230 400 L360 290 L520 420 L640 360 L760 430 L900 330 L1040 420 L1180 300 L1320 400 L1460 320 L1650 440 V560 H-50Z" fill="#9fb3bf" opacity=".45"/>
      <path d="M-50 600 Q240 470 520 560 Q760 630 1000 540 Q1260 450 1650 560 V700 H-50Z" fill="#b8cc8a" opacity=".55"/>
      <path d="M-50 720 Q300 620 640 700 Q960 770 1240 680 Q1460 620 1650 690 V1050 H-50Z" fill="#a9c27e" opacity=".55"/>
      <path d="M-50 840 Q260 780 560 850 Q860 920 1160 840 Q1400 780 1650 830 V1050 H-50Z" fill="#8fa66b" opacity=".5"/>
      <path d="M560 1050 Q620 900 760 860 Q900 820 980 760 Q1060 700 1180 690" fill="none" stroke="#8fb4b6" stroke-width="70" opacity=".55"/>
    </g>
    <g filter="url(#rough-lg)" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" opacity=".75">
      <path d="M-50 470 L120 330 L230 400 L360 290 L520 420 L640 360 L760 430 L900 330 L1040 420 L1180 300 L1320 400 L1460 320 L1650 440"/>
      <path d="M120 330 l-14 30 M360 290 l-18 40 M900 330 l-16 34 M1180 300 l-18 40 M1460 320 l-16 34" stroke-width="1"/>
      <path d="M-50 600 Q240 470 520 560 Q760 630 1000 540 Q1260 450 1650 560"/>
      <path d="M-50 720 Q300 620 640 700 Q960 770 1240 680 Q1460 620 1650 690"/>
      <path d="M-50 840 Q260 780 560 850 Q860 920 1160 840 Q1400 780 1650 830"/>
      <path d="M520 1050 Q590 890 740 845 Q880 805 960 745 Q1040 690 1160 670"/><path d="M600 1050 Q660 920 780 880 Q920 840 1000 778 Q1080 718 1200 708"/>
    </g>
    <g filter="url(#rough)">
      <!-- kastil di bukit jauh -->
      <g transform="translate(250 470)">${P('M-40 0 V-46 H40 V0', '#e6d3ad')}${P('M-52 0 V-70 H-30 V0 M30 0 V-70 H52 V0', '#efe0bf')}${P('M-56 -70 L-41 -96 L-26 -70 Z M26 -70 L41 -96 L56 -70 Z', '#c8714a')}${P('M-14 -46 V-84 H14 V-46', '#efe0bf')}${P('M-18 -84 L0 -112 L18 -84 Z', '#c8714a')}${P('M0 -112 V-128 l14 4 -14 4', '#b5452f', 1.4)}${P('M-8 0 V-18 Q0 -26 8 -18 V0', '#8a5a34', 1.4)}${P('M-36 -46 v-6 h8 v6 M-20 -46 v-6 h8 v6 M12 -46 v-6 h8 v6 M28 -46 v-6 h8 v6', 'none', 1.2)}</g>
      <!-- desa -->
      ${house(470, 590, .9)}${house(530, 600, .75, '#a35c3c')}${house(1080, 560, .85, '#b06a3c')}${house(1150, 548, .7)}${house(1215, 560, .8, '#a35c3c')}
      <!-- kincir angin -->
      <g transform="translate(1340 520)">${P('M-14 0 L-9 -64 H9 L14 0 Z', '#efe0bf')}${P('M-12 -64 Q0 -80 12 -64', '#c8714a')}${P('M-4 0 V-14 H4 V0', '#8a5a34', 1.2)}
        <g transform="translate(0 -64)"><g class="pj-blades">${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a})">${P('M0 0 L4 -54 H-10 L-6 -6 Z', '#f3e6c8', 1.6)}${P('M-8 -14 H2 M-8 -26 H3 M-9 -38 H4', 'none', .8)}</g>`).join('')}<circle r="5" fill="#8a5a34" stroke="${INK}" stroke-width="1.6"/></g></g></g>
      <!-- pagar & jalan -->
      ${Array.from({ length: 9 }, (_, i) => P(`M${120 + i * 26} ${742 - i * 3} v-22`, 'none', 1.6)).join('')}${P('M112 732 Q230 712 340 708 M112 744 Q230 724 340 720', 'none', 1.3)}
      <!-- jembatan kayu di atas sungai -->
      <g transform="translate(860 800)">${P('M-70 6 Q0 -34 70 6', 'none', 3)}${P('M-70 -14 Q0 -54 70 -14', 'none', 1.6)}${Array.from({ length: 7 }, (_, i) => { const t = -60 + i * 20; return P(`M${t} ${(-Math.cos(t / 70 * Math.PI / 2) * 40 + 6).toFixed(0)} v-20`, 'none', 1.4); }).join('')}</g>
      ${P('M700 900 q10 -4 20 0 t20 0 M1000 760 q10 -4 20 0 t20 0 M640 960 q10 -4 20 0 t20 0', 'none', 1.2)}
      ${duck(720, 892, 1.2)}${duck(756, 902, 1)}${duck(1050, 745, .9)}
      <!-- pepohonan -->
      ${pine(70, 640, 1.2)}${pine(120, 655, 1)}${pine(1490, 600, 1.15)}${pine(1545, 615, .95)}${pine(380, 560, .7)}${pine(410, 566, .6)}${pine(1260, 545, .7)}
      ${roundTree(60, 900, 1.9)}${roundTree(220, 880, 1.3, '#8fa66b')}${roundTree(1520, 880, 1.8, '#8fa66b')}${roundTree(1380, 905, 1.2)}${roundTree(650, 690, .8)}${roundTree(980, 660, .7, '#8fa66b')}
      <!-- hewan -->
      ${deer(330, 805, 1.1)}${rabbit(470, 905, 1.2)}${rabbit(1250, 930, 1)}${rabbit(1215, 940, .8)}
      <!-- bunga & jamur -->
      ${[[150, 960], [190, 975], [300, 950], [420, 975], [1100, 960], [1160, 975], [1440, 960], [1300, 985], [560, 985]].map(([x, y], i) => flower(x, y, ['#e8a07a', '#e3a6d8', '#f2c94c', '#b48ae0'][i % 4])).join('')}
      ${mushroom(260, 985, 1.2)}${mushroom(1480, 990, 1)}${mushroom(1505, 985, .7)}
      ${Array.from({ length: 34 }, (_, i) => { const x = 20 + i * 48, y = 1000 - (i % 4) * 8; return P(`M${x} ${y} l-4 -12 M${x + 6} ${y} l2 -14 M${x + 12} ${y} l6 -10`, 'none', 1.2); }).join('')}
    </g>
  </svg>`;
}

export const balloon = (w = 110) => `<svg class="ink-balloon" viewBox="0 0 100 150" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  ${P('M50 6 Q90 6 90 50 Q90 80 60 100 H40 Q10 80 10 50 Q10 6 50 6 Z', '#e8a07a')}${P('M50 6 Q30 50 40 100 M50 6 Q70 50 60 100 M50 6 V100', 'none', 1.2)}
  ${P('M12 46 Q50 56 88 46', 'none', 1.2)}<path d="M12 46 Q50 56 88 46 Q86 62 78 74 Q50 82 22 74 Q14 62 12 46 Z" fill="#f2c94c" opacity=".7"/>
  ${P('M40 100 L38 120 M60 100 L62 120', 'none', 1.2)}${P('M34 120 H66 L62 140 H38 Z', '#a8774a')}</g></svg>`;

export const windmillBlades = (w = 120) => `<svg class="ink-blades" viewBox="-60 -60 120 120" width="${w}" aria-hidden="true"><g filter="url(#rough)">
  ${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a})">${P('M0 0 L4 -54 H-10 L-6 -6 Z', '#f3e6c8', 1.6)}${P('M-8 -14 H2 M-8 -26 H3 M-9 -38 H4', 'none', .8)}</g>`).join('')}<circle r="5" fill="#8a5a34" stroke="${INK}" stroke-width="1.6"/></g></svg>`;

export const kites = () => `<svg class="ink-kites" viewBox="0 0 260 260" width="230" aria-hidden="true">${kite(60, 60, 'A', '#e3a6d8')}${kite(170, 40, '1', '#8fb4b6')}${kite(220, 140, 'B', '#f2c94c')}</svg>`;
export const kites2 = () => `<svg class="ink-kites" viewBox="0 0 220 240" width="200" aria-hidden="true">${kite(60, 50, '2', '#a9c27e')}${kite(160, 90, 'C', '#e8a07a')}</svg>`;

/** Ikon belajar untuk prolog. */
export const learnArt: Record<string, string> = {
  dongeng: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)">${P('M12 30 Q36 20 60 32 Q84 20 108 30 V86 Q84 76 60 88 Q36 76 12 86 Z', '#f3e6c8', 2.2)}${P('M60 32 V88', 'none', 2)}${P('M22 44 Q36 39 50 46 M22 54 Q36 49 50 56 M70 46 Q84 39 98 44', 'none', 1.1)}
    ${P('M84 8 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z', '#f2c94c', 1.4)}${P('M30 6 l2 4 5 1 -4 3 1 5 -4 -2 -4 2 1 -5 -4 -3 5 -1 Z', '#f2c94c', 1.2)}</g></svg>`,
  hewan: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)">${P('M40 40 Q34 10 44 8 Q52 12 50 38 M70 38 Q68 12 76 8 Q86 10 80 40', '#efe3c9', 2)}${P('M30 62 Q30 34 60 34 Q90 34 90 62 Q90 90 60 90 Q30 90 30 62 Z', '#efe3c9', 2.2)}
    <circle cx="50" cy="58" r="3.4" fill="${INK}"/><circle cx="70" cy="58" r="3.4" fill="${INK}"/>${P('M56 68 L60 72 64 68 M60 72 v5 M52 78 Q60 84 68 78', 'none', 1.6)}<ellipse cx="42" cy="70" rx="5" ry="3" fill="#e8a07a" opacity=".6"/><ellipse cx="78" cy="70" rx="5" ry="3" fill="#e8a07a" opacity=".6"/></g></svg>`,
  angka: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)">${[['1', 14, 52, '#8fb4b6', -6], ['2', 44, 40, '#f2c94c', 4], ['3', 76, 54, '#e8a07a', -3]].map(([t, x, y, c, r]) => `<g transform="rotate(${r} ${Number(x) + 15} ${Number(y) + 15})">${P(`M${x} ${y} h30 v30 h-30 Z`, String(c), 2.2)}<text x="${Number(x) + 15}" y="${Number(y) + 24}" text-anchor="middle" font-family="'IM Fell English', serif" font-size="24" fill="${INK}">${t}</text></g>`).join('')}</g></svg>`,
  huruf: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)"><text x="16" y="72" font-family="'IM Fell English', serif" font-size="56" fill="#c8714a" stroke="${INK}" stroke-width="1.4">A</text><text x="56" y="62" font-family="'IM Fell English', serif" font-size="40" fill="#8fa66b" stroke="${INK}" stroke-width="1.2">b</text><text x="84" y="80" font-family="'IM Fell English', serif" font-size="34" fill="#8fb4b6" stroke="${INK}" stroke-width="1.2">c</text>${P('M10 88 Q60 80 110 88', 'none', 1.4)}</g></svg>`,
  lagu: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)">${P('M40 70 V22 L84 12 V60', 'none', 2.4)}${P('M40 30 L84 20', 'none', 2)}<ellipse cx="32" cy="72" rx="11" ry="8" fill="${INK}" transform="rotate(-18 32 72)"/><ellipse cx="76" cy="62" rx="11" ry="8" fill="${INK}" transform="rotate(-18 76 62)"/>${P('M98 30 q8 6 0 14 M102 24 q14 12 0 26', 'none', 1.6)}</g></svg>`,
  mewarnai: `<svg viewBox="0 0 120 100" aria-hidden="true"><g filter="url(#rough)"><path d="M14 80 Q30 60 52 70 Q74 82 96 66" fill="none" stroke="#e3a6d8" stroke-width="12" stroke-linecap="round" opacity=".8"/>${P('M70 12 l14 8 -30 50 -14 -8 Z', '#8fb4b6', 2)}${P('M40 62 l14 8 -16 10 Z', '#f3e6c8', 1.6)}${P('M76 15 l-4 7', 'none', 1)}</g></svg>`,
};

/**
 * Ilustrasi dua halaman: Momo duduk bersandar di pohon, membaca buku di hutan.
 * Digambar tinta + cat air agar menyatu dengan gaya. #read-book = titik zoom (buku di tangan Momo).
 */
/** cover & thumbs = markup <svg> utuh (lihat coverArt/thumbArt dengan rough=false). */
export interface MiniBook { cover: string; thumbs: string[]; title: string; kicker: string; chapters: { title: string; ready: boolean }[] }

/** Miniatur halaman cerita (sampul + Daftar Chapter) — tata letaknya meniru halaman asli agar zoom menyatu. */
function miniSpread(m: MiniBook, bx: number, by: number, W: number, H: number) {
  const pw = W / 2 - 2.4, lp = bx + 2.4, rp = bx + W / 2, top = by + 2.4, ph = H - 4.8;
  const px = lp + pw * .07, py = top + ph * .07, pwid = pw * .86, phgt = ph * .84;
  const rx = rp + pw * .07, rw = pw * .86, rowH = ph * .15, gap = ph * .022;
  return `<g class="mini-spread">
    <rect x="${bx}" y="${by}" width="${W}" height="${H}" rx="3" fill="#6b4226" stroke="${INK}" stroke-width="1.6"/>
    <rect x="${lp}" y="${top}" width="${pw}" height="${ph}" fill="#f1e3c2"/><rect x="${rp}" y="${top}" width="${pw}" height="${ph}" fill="#f1e3c2"/>
    <rect x="${rp - 4}" y="${top}" width="8" height="${ph}" fill="#3b2a1a" opacity=".16"/>
    <clipPath id="mini-plate"><rect x="${px}" y="${py}" width="${pwid}" height="${phgt}"/></clipPath>
    <g clip-path="url(#mini-plate)">${nestedArt(m.cover, px, py, pwid, phgt)}</g>
    <rect x="${px}" y="${py}" width="${pwid}" height="${phgt}" fill="none" stroke="${INK}" stroke-width=".6"/>
    <path d="M${px + pwid * .06} ${py + phgt * .05} H${px + pwid * .94} L${px + pwid * .9} ${py + phgt * .15} L${px + pwid * .94} ${py + phgt * .25} H${px + pwid * .06} L${px + pwid * .1} ${py + phgt * .15} Z" fill="#f3e6c8" stroke="${INK}" stroke-width=".7"/>
    <text x="${px + pwid / 2}" y="${py + phgt * .1}" text-anchor="middle" font-family="'IM Fell English SC', serif" font-size="${ph * .028}" fill="#b5452f" letter-spacing="1">${m.kicker}</text>
    <text x="${px + pwid / 2}" y="${py + phgt * .19}" text-anchor="middle" font-family="'IM Fell English', serif" font-size="${(ph * .062 * Math.min(1, 15 / Math.max(1, m.title.length))).toFixed(2)}" fill="${INK}">${m.title}</text>
    <path d="M${rp + pw * .2} ${top + ph * .06} H${rp + pw * .8} L${rp + pw * .76} ${top + ph * .095} L${rp + pw * .8} ${top + ph * .13} H${rp + pw * .2} L${rp + pw * .24} ${top + ph * .095} Z" fill="#b5452f" stroke="${INK}" stroke-width=".6"/>
    <text x="${rp + pw / 2}" y="${top + ph * .107}" text-anchor="middle" font-family="'IM Fell English', serif" font-size="${ph * .048}" fill="#fbf1da">Daftar Chapter</text>
    ${m.chapters.slice(0, 4).map((c, i) => { const y = top + ph * .17 + i * (rowH + gap);
      return `<rect x="${rx}" y="${y}" width="${rw}" height="${rowH}" rx="2" fill="${c.ready ? '#fbf3e0' : '#f3e6c8'}" stroke="${INK}" stroke-width="${c.ready ? .9 : .6}"/>
        <g ${c.ready ? '' : 'opacity=".55"'}>${nestedArt(m.thumbs[i % m.thumbs.length], rx + rw * .03, y + rowH * .14, rw * .3, rowH * .72)}</g>
        <text x="${rx + rw * .38}" y="${y + rowH * .36}" font-family="'IM Fell English SC', serif" font-size="${ph * .024}" fill="#7a5634">Chapter ${i + 1}</text>
        <text x="${rx + rw * .38}" y="${y + rowH * .66}" font-family="'IM Fell English', serif" font-size="${ph * .036}" fill="${INK}">${c.title.length > 16 ? c.title.slice(0, 15) + '…' : c.title}</text>
        ${c.ready ? `<circle cx="${rx + rw * .88}" cy="${y + rowH / 2}" r="${rowH * .26}" fill="#b5452f" stroke="${INK}" stroke-width=".6"/><path d="M${rx + rw * .87} ${y + rowH * .4} l${rowH * .14} ${rowH * .1} -${rowH * .14} ${rowH * .1} Z" fill="#fbf1da"/>`
          : `<rect x="${rx + rw * .74}" y="${y + rowH * .36}" width="${rw * .22}" height="${rowH * .26}" fill="none" stroke="#b5452f" stroke-width=".5" transform="rotate(-6 ${rx + rw * .85} ${y + rowH / 2})"/>`}`; }).join('')}
  </g>`;
}

export function momoReadingScene(half: 'l' | 'r', mini?: MiniBook) {
  const vb = half === 'l' ? '0 0 600 830' : '600 0 600 830';
  return `<svg class="scene-art" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="readGlow"><stop offset="0" stop-color="#fff3c2" stop-opacity=".95"/><stop offset=".5" stop-color="#ffe08a" stop-opacity=".45"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient></defs>
    <g filter="url(#wash)">
      <rect x="0" y="0" width="1200" height="830" fill="#c9dcc4" opacity=".55"/>
      <ellipse cx="300" cy="120" rx="320" ry="160" fill="#f2e3a4" opacity=".55"/>
      <path d="M0 560 Q300 480 600 540 Q900 600 1200 520 V830 H0Z" fill="#a9c27e" opacity=".7"/>
      <path d="M0 700 Q320 640 640 690 Q940 740 1200 680 V830 H0Z" fill="#8fa66b" opacity=".6"/>
      <ellipse cx="780" cy="200" rx="330" ry="210" fill="#7f9a5e" opacity=".55"/>
    </g>
    <g filter="url(#rough)">
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${180 + i * 40} 0 L${80 + i * 70} 560" stroke="#fff6cf" stroke-width="${30 - i * 4}" opacity=".18"/>`).join('')}
      ${pine(70, 560, 2.2, '#7f9a5e')}${pine(170, 545, 1.6)}${roundTree(300, 560, 2.2, '#9db872')}${pine(470, 540, 1.3, '#8fa66b')}${roundTree(1130, 560, 2.4, '#8fa66b')}${pine(1060, 545, 1.4)}
      ${P('M0 600 Q140 590 260 640 Q360 690 420 830', 'none', 1.6)}${P('M90 830 Q160 700 300 660', 'none', 1.2)}
      ${mushroom(120, 700, 1.6)}${mushroom(150, 712, 1)}${flower(220, 760, '#e3a6d8')}${flower(250, 780, '#f2c94c')}${flower(500, 760, '#e8a07a')}${flower(1040, 760, '#b48ae0')}${flower(1080, 770, '#f2c94c')}${rabbit(380, 720, 1.5)}
      ${birds(0).replace('<svg', '<svg x="380" y="90" width="120" height="50"')}
      <!-- pohon besar tempat Momo bersandar -->
      ${P('M640 700 Q660 520 640 360 Q630 250 700 170 H800 Q860 250 850 360 Q840 520 870 700 Z', '#a8774a', 2.6)}
      ${P('M680 300 q20 40 0 90 M820 280 q-16 50 4 110 M700 520 q14 30 0 60', 'none', 1.4)}${P('M640 700 Q600 700 590 720 M870 700 Q910 700 930 716', 'none', 2)}
      ${P('M560 210 Q540 80 680 60 Q760 -10 880 50 Q1010 40 1020 150 Q1080 230 980 280 Q900 330 760 290 Q640 330 580 280 Q520 260 560 210 Z', '#9db872', 2.6)}
      ${P('M640 160 q12 -12 24 0 M760 120 q12 -12 24 0 M880 170 q12 -12 24 0 M700 240 q12 -12 24 0 M920 230 q12 -12 24 0', 'none', 1.4)}
      <!-- Momo -->
      <g class="momo-read" transform="translate(760 520)">
        ${P('M90 140 Q190 150 170 70 Q160 30 128 52 Q150 60 146 86 Q140 116 90 116', '#8a5530', 2.2)}
        ${P('M-80 150 Q-90 80 -40 60 Q0 46 40 60 Q90 80 80 150 Q40 172 0 170 Q-40 172 -80 150 Z', '#9b6234', 2.4)}
        ${P('M-40 128 Q0 150 40 128 Q34 104 0 100 Q-34 104 -40 128 Z', '#e8bf90', 1.6)}
        ${P('M-118 168 Q-120 140 -70 140 Q-30 142 -24 162 Q-30 180 -72 180 Q-112 182 -118 168 Z', '#9b6234', 2.2)}${P('M118 168 Q120 140 70 140 Q30 142 24 162 Q30 180 72 180 Q112 182 118 168 Z', '#9b6234', 2.2)}
        ${P('M-128 168 Q-132 154 -114 152 Q-104 160 -110 176 Q-124 180 -128 168 Z', '#e8bf90', 1.6)}${P('M128 168 Q132 154 114 152 Q104 160 110 176 Q124 180 128 168 Z', '#e8bf90', 1.6)}
        <!-- kepala -->
        <circle cx="-86" cy="-62" r="30" fill="#9b6234" stroke="${INK}" stroke-width="2.4"/><circle cx="-86" cy="-62" r="17" fill="#e8bf90" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="86" cy="-62" r="30" fill="#9b6234" stroke="${INK}" stroke-width="2.4"/><circle cx="86" cy="-62" r="17" fill="#e8bf90" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="0" cy="-70" r="82" fill="#9b6234" stroke="${INK}" stroke-width="2.6"/>
        ${P('M-14 -150 q4 -16 14 -14 q4 -14 14 -4 M-4 -152 q-2 -10 6 -14', 'none', 2)}
        ${P('M-58 -62 Q-64 -110 -24 -104 Q0 -126 24 -104 Q64 -110 58 -62 Q60 -10 0 -6 Q-60 -10 -58 -62 Z', '#f0cfa2', 2)}
        <g class="momo-eyes-closed">${P('M-36 -66 Q-26 -58 -14 -66 M14 -66 Q26 -58 36 -66', 'none', 3)}</g>
        <g class="momo-eyes-open" opacity="0"><ellipse cx="-25" cy="-66" rx="11" ry="13" fill="#fffaf0" stroke="${INK}" stroke-width="2"/><ellipse cx="25" cy="-66" rx="11" ry="13" fill="#fffaf0" stroke="${INK}" stroke-width="2"/>
          <circle cx="-23" cy="-60" r="6.5" fill="${INK}"/><circle cx="27" cy="-60" r="6.5" fill="${INK}"/><circle cx="-21" cy="-63" r="2" fill="#fff"/><circle cx="29" cy="-63" r="2" fill="#fff"/></g>
        ${P('M-38 -84 q12 -8 24 -2 M14 -86 q12 -6 24 2', 'none', 2)}
        <ellipse cx="0" cy="-46" rx="7" ry="5" fill="#6b3f22"/>${P('M-12 -32 Q0 -22 12 -32', 'none', 2.2)}
        <ellipse cx="-40" cy="-42" rx="10" ry="6" fill="#e07a6a" opacity=".55"/><ellipse cx="40" cy="-42" rx="10" ry="6" fill="#e07a6a" opacity=".55"/>
        <!-- syal merah -->
        ${P('M-50 4 Q0 22 50 4 L46 22 Q0 38 -46 22 Z', '#b5452f', 2)}${P('M30 20 l18 34 -16 4 -10 -30', '#b5452f', 1.8)}
        <!-- buku di tangan: miniatur halaman cerita yang akan dimasuki kamera -->
        <ellipse class="read-glow" cx="0" cy="90" rx="190" ry="130" fill="url(#readGlow)" opacity="0"/>
        <g class="read-sparks"></g>
      </g>
      ${butterfly(0).replace('<svg', '<svg x="960" y="420" width="60" height="50"')}
    </g>
    <!-- buku & tangan di luar filter tinta: tetap tajam saat kamera masuk -->
    <g transform="translate(760 520)">
        <g id="read-book">
          ${mini ? miniSpread(mini, -105, 17, 210, 146) : P('M-92 48 Q-46 30 0 50 Q46 30 92 48 L84 118 Q42 100 0 120 Q-42 100 -84 118 Z', '#8e3a24', 2.4)}
        </g>
        ${P('M-118 150 Q-126 128 -106 120 Q-90 122 -92 144 Q-96 160 -118 150 Z', '#e8bf90', 1.8)}${P('M118 150 Q126 128 106 120 Q90 122 92 144 Q96 160 118 150 Z', '#e8bf90', 1.8)}
    </g>
  </svg>`;
}

/* =====================================================================
   LATAR HALAMAN PERTAMA v3 — negeri belajar yang ramai & berpijak
   ===================================================================== */
const sheep = (x: number, y: number, s = 1, f = 1) => `<g transform="translate(${x} ${y}) scale(${s * f} ${s})">${P('M-16 0 Q-22 -8 -16 -14 Q-14 -22 -4 -20 Q4 -26 12 -18 Q22 -16 18 -6 Q20 2 10 2 Q0 6 -10 2 Q-18 4 -16 0 Z', '#f6f1e4', 1.6)}
  <ellipse cx="20" cy="-12" rx="6" ry="5" fill="#3b2a1a"/>${P('M-8 2 v8 M8 2 v8', 'none', 1.6)}</g>`;
const cow = (x: number, y: number, s = 1, f = 1) => `<g transform="translate(${x} ${y}) scale(${s * f} ${s})">${P('M-26 -30 H18 Q24 -30 24 -22 V-10 H-26 Z', '#f6f1e4', 1.8)}${P('M-16 -30 q6 8 0 14 M4 -24 q-6 6 2 12', '#3b2a1a', 1, 'fill-opacity=".85"')}
  ${P('M24 -30 h12 q6 0 6 8 v6 h-14', '#f6f1e4', 1.6)}<circle cx="34" cy="-24" r="1.4" fill="${INK}"/>${P('M-22 -10 v12 M-12 -10 v12 M8 -10 v12 M16 -10 v12', 'none', 1.8)}${P('M-26 -26 q-8 6 -6 14', 'none', 1.3)}</g>`;
const hay = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-22 0 Q-24 -30 0 -34 Q24 -30 22 0 Z', '#e6c46a', 1.8)}${P('M-14 -6 l4 -14 M-2 -4 l2 -18 M10 -6 l-2 -14 M-18 -18 l10 -6 M6 -24 l10 6', 'none', 1)}</g>`;
const appleTree = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${roundTree(0, 0, 1, '#9db872')}${[[-18, -58], [10, -66], [20, -44], [-8, -40], [-24, -36], [4, -52]].map(([ax, ay]) => `<circle cx="${ax}" cy="${ay}" r="4" fill="#c8463a" stroke="${INK}" stroke-width=".9"/>`).join('')}</g>`;
const church = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-30 0 V-34 H10 V0 Z', '#efe0bf', 1.8)}${P('M-36 -32 L-10 -54 L16 -32 Z', '#a35c3c', 1.8)}${P('M10 0 V-70 H30 V0 Z', '#efe0bf', 1.8)}${P('M6 -68 L20 -100 L34 -68 Z', '#a35c3c', 1.8)}${P('M20 -100 v-12 M15 -107 h10', 'none', 1.4)}<circle cx="20" cy="-52" r="5" fill="#f3e6c8" stroke="${INK}" stroke-width="1.2"/>${P('M-16 0 v-12 q6 -6 12 0 v12', '#8a5a34', 1.2)}</g>`;
const signpost = (x: number, y: number) => `<g transform="translate(${x} ${y})">${P('M0 0 V-70', 'none', 3)}${P('M-4 -66 H62 L74 -58 L62 -50 H-4 Z', '#e6d3ad', 1.6)}${P('M4 -42 H-56 L-68 -34 L-56 -26 H4 Z', '#e6d3ad', 1.6)}
  <text x="32" y="-54" text-anchor="middle" font-family="'IM Fell English SC', serif" font-size="11" fill="${INK}">Hutan</text><text x="-28" y="-30" text-anchor="middle" font-family="'IM Fell English SC', serif" font-size="11" fill="${INK}">Kastil</text></g>`;
const well = (x: number, y: number) => `<g transform="translate(${x} ${y})">${P('M-22 0 V-22 H22 V0 Z', '#b8b09a', 1.8)}${P('M-22 -12 H22 M-10 0 v-22 M10 0 v-22', 'none', 1)}${P('M-18 -22 V-54 M18 -22 V-54', 'none', 2.2)}${P('M-28 -52 L0 -70 L28 -52 Z', '#a35c3c', 1.8)}${P('M0 -52 V-34', 'none', 1)}${P('M-6 -34 h12 v8 h-12 Z', '#8a5a34', 1)}</g>`;
const boat = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-24 0 Q0 10 24 0 L18 -8 H-18 Z', '#a8774a', 1.6)}${P('M0 -8 V-40', 'none', 1.6)}${P('M1 -38 Q18 -26 1 -12 Z', '#f3e6c8', 1.4)}</g>`;
const rows = (x: number, y: number, w: number, n: number, ang = -8) => Array.from({ length: n }, (_, i) => P(`M${x} ${y + i * 9} l${w} ${(Math.tan(ang * Math.PI / 180) * w).toFixed(1)}`, 'none', .9, 'opacity=".55"')).join('');

export function deskScene3() {
  // bukit kiri: puncak sekitar (260, 452) — kastil berdiri DI ATAS bukit ini
  const hillL = 'M-60 600 Q60 470 250 448 Q420 440 560 560';
  const hillR = 'M1040 560 Q1180 450 1380 446 Q1540 450 1660 540';
  return `<svg class="pj-map" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g filter="url(#wash)">
      <rect x="-50" y="-50" width="1700" height="640" fill="#bcd3d4" opacity=".35"/>
      <ellipse cx="1330" cy="140" rx="300" ry="170" fill="#f2c94c" opacity=".2"/>
      <path d="M-60 520 L60 380 L150 430 L260 300 L400 440 L520 380 L640 450 L760 340 L880 440 L1000 360 L1120 450 L1230 320 L1360 430 L1470 350 L1660 470 V620 H-60Z" fill="#a9b8c4" opacity=".5"/>
      <path d="${hillL} L560 1060 H-60Z" fill="#b8cc8a" opacity=".7"/><path d="${hillR} L1660 1060 H1040Z" fill="#b8cc8a" opacity=".7"/>
      <path d="M-60 640 Q300 560 640 620 Q960 680 1240 600 Q1460 560 1660 610 V1060 H-60Z" fill="#a9c27e" opacity=".55"/>
      <path d="M-60 820 Q300 750 620 800 Q940 850 1240 790 Q1460 750 1660 800 V1060 H-60Z" fill="#8fa66b" opacity=".5"/>
      <path d="M760 470 Q700 560 760 640 Q820 720 700 820 Q600 900 660 1060" fill="none" stroke="#8fb4b6" stroke-width="56" opacity=".6"/>
      <path d="M90 560 L230 540 L240 600 L80 620 Z M300 600 L460 590 L470 650 L290 660 Z M1120 590 L1280 580 L1290 640 L1110 650 Z M1330 600 L1480 600 L1490 660 L1320 660 Z" fill="#e6c46a" opacity=".45"/>
    </g>
    <g filter="url(#rough-lg)" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" opacity=".8">
      <path d="M-60 520 L60 380 L150 430 L260 300 L400 440 L520 380 L640 450 L760 340 L880 440 L1000 360 L1120 450 L1230 320 L1360 430 L1470 350 L1660 470"/>
      <path d="M60 380 l-18 40 M260 300 l-24 56 M760 340 l-20 44 M1230 320 l-24 54 M1470 350 l-18 40" stroke-width="1"/>
      <path d="${hillL}"/><path d="${hillR}"/>
      <path d="M-60 640 Q300 560 640 620 Q960 680 1240 600 Q1460 560 1660 610"/>
      <path d="M-60 820 Q300 750 620 800 Q940 850 1240 790 Q1460 750 1660 800"/>
      <path d="M736 470 Q676 560 736 640 Q796 720 676 820 Q576 900 636 1060 M784 470 Q724 560 784 640 Q844 720 724 820 Q624 900 684 1060"/>
    </g>
    <g filter="url(#rough)">
      <!-- salju di puncak -->
      ${[[60, 380], [260, 300], [760, 340], [1230, 320], [1470, 350]].map(([x, y]) => P(`M${x - 22} ${y + 26} L${x} ${y} L${x + 22} ${y + 26} Q${x + 10} ${y + 20} ${x} ${y + 30} Q${x - 10} ${y + 20} ${x - 22} ${y + 26} Z`, '#fbf6ea', 1.4)).join('')}
      <!-- deretan pinus di kaki gunung -->
      ${Array.from({ length: 26 }, (_, i) => { const x = -20 + i * 64 + (i % 3) * 8; return pine(x, 520 + (i % 2) * 8, .5 + (i % 3) * .06, i % 2 ? '#7f9a5e' : '#8fa66b'); }).join('')}
      <!-- ladang berbaris -->
      ${rows(92, 566, 140, 5)}${rows(302, 606, 160, 5, -3)}${rows(1122, 596, 160, 5, -3)}${rows(1332, 606, 150, 5, 0)}
      <!-- kastil berdiri di puncak bukit kiri, dengan fondasi batu -->
      <g transform="translate(260 452)">
        ${P('M-78 12 Q-80 0 -70 -2 H70 Q80 0 78 12 Z', '#b8b09a', 1.8)}${P('M-60 0 l6 -4 M-30 2 l8 -5 M10 0 l8 -4 M40 2 l6 -4', 'none', 1)}
        ${P('M-52 -2 V-60 H52 V-2', '#efe0bf')}${Array.from({ length: 7 }, (_, i) => P(`M${-52 + i * 16} -60 v-10 h9 v10`, 'none', 1.4)).join('')}
        ${P('M-74 -2 V-96 H-42 V-2 M42 -2 V-96 H74 V-2', '#f3e6c8')}${P('M-80 -96 L-58 -132 L-36 -96 Z M36 -96 L58 -132 L80 -96 Z', '#c8714a')}
        ${P('M-20 -60 V-118 H20 V-60', '#f3e6c8')}${P('M-26 -118 L0 -160 L26 -118 Z', '#b5452f')}${P('M0 -160 V-180 l18 5 -18 5', '#b5452f', 1.4)}
        ${P('M-12 -2 V-26 Q0 -38 12 -26 V-2', '#8a5a34', 1.6)}${P('M-66 -60 v-12 h8 v12 Z M58 -60 v-12 h8 v12 Z M-6 -96 v-12 h12 v12 Z', '#cfe3e6', 1.2)}
        ${P('M12 10 Q60 60 20 110 Q-30 160 10 230', 'none', 1.4)}${P('M24 10 Q74 60 34 110 Q-16 160 24 230', 'none', 1.4)}
      </g>
      <!-- desa di bukit kanan + gereja + kincir angin -->
      ${house(1210, 470, .8)}${house(1268, 462, .7, '#a35c3c')}${church(1340, 458, .9)}${house(1430, 470, .75, '#b06a3c')}${house(1480, 480, .65)}
      <g transform="translate(1530 470)">${P('M-14 0 L-9 -64 H9 L14 0 Z', '#efe0bf')}${P('M-12 -64 Q0 -80 12 -64', '#c8714a')}${P('M-4 0 V-14 H4 V0', '#8a5a34', 1.2)}
        <g transform="translate(0 -64)"><g class="pj-blades">${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a})">${P('M0 0 L4 -54 H-10 L-6 -6 Z', '#f3e6c8', 1.6)}${P('M-8 -14 H2 M-8 -26 H3 M-9 -38 H4', 'none', .8)}</g>`).join('')}<circle r="5" fill="#8a5a34" stroke="${INK}" stroke-width="1.6"/></g></g></g>
      <!-- sungai: jembatan, perahu, bebek -->
      <g transform="translate(760 640)">${P('M-80 6 Q0 -30 80 6', 'none', 3)}${P('M-80 -12 Q0 -48 80 -12', 'none', 1.6)}${Array.from({ length: 7 }, (_, i) => { const t = -66 + i * 22; return P(`M${t} ${(-Math.cos(t / 80 * Math.PI / 2) * 34 + 6).toFixed(0)} v-18`, 'none', 1.4); }).join('')}</g>
      ${boat(700, 760, 1.1)}${duck(680, 900, 1.2)}${duck(712, 912, 1)}${P('M640 940 q10 -4 20 0 t20 0 M760 720 q10 -4 20 0 t20 0', 'none', 1.2)}
      <!-- latar depan kiri: pondok berasap, pagar, domba, jerami, pohon besar -->
      <g transform="translate(170 760)">${house(0, 0, 1.5, '#b06a3c')}${P('M28 -78 V-96 H40 V-70', '#e6d3ad', 1.6)}</g>
      <g class="pj-smoke">${[0, 1, 2].map((i) => `<circle cx="${204 + i * 3}" cy="${656 - i * 10}" r="${7 + i * 3}" fill="#f3ecdc" stroke="${INK}" stroke-width="1.2" opacity=".85"/>`).join('')}</g>
      ${Array.from({ length: 10 }, (_, i) => P(`M${250 + i * 24} ${786 - i * 2} v-22`, 'none', 1.6)).join('')}${P('M244 778 Q360 760 480 756 M244 790 Q360 772 480 768', 'none', 1.3)}
      ${sheep(300, 840, 1.3)}${sheep(360, 856, 1.1, -1)}${sheep(420, 836, 1.2)}${sheep(250, 870, 1)}${hay(470, 870, 1.3)}
      ${roundTree(40, 940, 2.1, '#8fa66b')}${roundTree(130, 990, 1.4)}${pine(560, 860, .9)}
      ${signpost(540, 960)}
      <!-- latar depan kanan: kebun apel, sapi, sumur, bunga -->
      ${appleTree(1060, 830, 1.3)}${appleTree(1150, 850, 1.1)}${cow(1240, 880, 1.4)}${cow(1330, 900, 1.2, -1)}${well(1450, 900)}
      ${roundTree(1560, 960, 2, '#8fa66b')}${pine(1500, 800, 1)}${rabbit(980, 960, 1.2)}${deer(880, 640, .9)}
      ${[[90, 990], [200, 980], [330, 995], [600, 990], [900, 985], [1010, 995], [1180, 990], [1300, 985], [1420, 995]].map(([x, y], i) => flower(x, y, ['#e8a07a', '#e3a6d8', '#f2c94c', '#b48ae0'][i % 4])).join('')}
      ${mushroom(260, 985, 1.2)}${mushroom(1520, 990, 1)}
      ${Array.from({ length: 34 }, (_, i) => { const x = 20 + i * 48, y = 1000 - (i % 4) * 8; return P(`M${x} ${y} l-4 -12 M${x + 6} ${y} l2 -14 M${x + 12} ${y} l6 -10`, 'none', 1.2); }).join('')}
    </g>
  </svg>`;
}

/* ---------- ilustrasi untuk lembar yang berkibar (angka, hewan, kerajaan, huruf, laut, lagu) ---------- */
const pageArt: ((t: string) => string)[] = [
  () => `<text x="150" y="140" text-anchor="middle" font-family="'IM Fell English', serif" font-size="130" fill="#e8a07a" stroke="${INK}" stroke-width="2.4">1 2 3</text>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${70 + i * 32}" cy="${215 + (i % 2) * 8}" r="13" fill="#c8463a" stroke="${INK}" stroke-width="2"/>${P(`M${70 + i * 32} ${202 + (i % 2) * 8} q3 -8 8 -8`, 'none', 1.6)}`).join('')}`,
  () => `${P('M90 190 Q80 120 150 110 Q220 120 210 190 Q180 230 150 230 Q120 230 90 190 Z', '#e8bf90', 2.4)}${P('M100 130 L84 70 L130 112 M200 130 L216 70 L170 112', '#e8bf90', 2.4)}
    <circle cx="128" cy="160" r="7" fill="${INK}"/><circle cx="172" cy="160" r="7" fill="${INK}"/>${P('M144 182 L150 188 156 182 M150 188 v8 M130 204 Q150 214 170 204 M80 180 H40 M82 192 H44 M220 180 H260 M218 192 H256', 'none', 2)}`,
  () => `${P('M70 210 H230 V150 L200 170 L150 110 L100 170 L70 150 Z', '#f2c94c', 2.6)}${[70, 150, 230].map((x, i) => `<circle cx="${x}" cy="${i === 1 ? 104 : 144}" r="10" fill="#c8463a" stroke="${INK}" stroke-width="2"/>`).join('')}${P('M70 190 H230', 'none', 2)}${[110, 150, 190].map((x) => `<rect x="${x - 7}" y="194" width="14" height="10" fill="#8fb4b6" stroke="${INK}" stroke-width="1.4"/>`).join('')}`,
  () => `<text x="70" y="190" font-family="'IM Fell English', serif" font-size="120" fill="#a9c27e" stroke="${INK}" stroke-width="2.4">A</text><text x="160" y="160" font-family="'IM Fell English', serif" font-size="80" fill="#8fb4b6" stroke="${INK}" stroke-width="2">b</text><text x="210" y="220" font-family="'IM Fell English', serif" font-size="70" fill="#e3a6d8" stroke="${INK}" stroke-width="2">c</text>`,
  () => `${P('M40 200 q20 -14 40 0 t40 0 t40 0 t40 0 t40 0 t40 0', 'none', 2.2)}${P('M30 220 q20 -14 40 0 t40 0 t40 0 t40 0 t40 0 t40 0', 'none', 1.6)}
    ${P('M90 180 Q150 196 210 180 L196 196 Q150 206 104 196 Z', '#a8774a', 2.2)}${P('M150 182 V90', 'none', 2.2)}${P('M152 94 Q200 130 152 172 Z', '#f3e6c8', 2)}${P('M148 104 Q112 136 148 168 Z', '#f3e6c8', 1.8)}${P('M150 90 l18 6 -18 6', '#b5452f', 1.2)}`,
  () => `${P('M110 190 V90 L210 70 V170', 'none', 3)}${P('M110 104 L210 84', 'none', 2.6)}<ellipse cx="96" cy="192" rx="18" ry="13" fill="${INK}" transform="rotate(-18 96 192)"/><ellipse cx="196" cy="172" rx="18" ry="13" fill="${INK}" transform="rotate(-18 196 172)"/>${P('M236 100 q12 10 0 22 M244 90 q22 20 0 42', 'none', 2)}`,
  () => `${P('M150 70 Q210 70 214 130 Q216 196 150 226 Q84 196 86 130 Q90 70 150 70 Z', '#8fa66b', 2.4)}${P('M150 70 V226 M150 120 L110 96 M150 150 L104 128 M150 120 L190 96 M150 150 L196 128', 'none', 1.6)}${P('M150 226 V250', 'none', 3)}`,
  () => `<g transform="translate(150 150)">${Array.from({ length: 5 }, (_, i) => `<ellipse cx="0" cy="-40" rx="22" ry="40" transform="rotate(${i * 72})" fill="#f2c6d4" stroke="${INK}" stroke-width="2"/>`).join('')}<circle r="18" fill="#f2c94c" stroke="${INK}" stroke-width="2"/></g>${P('M150 190 Q140 240 150 270', 'none', 2.4)}`,
];
const CAPS = ['Ayo berhitung!', 'Meong… siapa aku?', 'Negeri raja & ratu', 'Huruf pertama', 'Berlayar ke pulau', 'Ayo bernyanyi', 'Daun & pepohonan', 'Bunga di taman'];

/** Satu halaman bergambar untuk lembar yang dibalik cepat. */
export function flutterArt(i: number) {
  const k = ((i % pageArt.length) + pageArt.length) % pageArt.length;
  return `<svg class="flutter-art" viewBox="0 0 300 300" aria-hidden="true"><g filter="url(#rough)">${pageArt[k]('')}</g></svg><p class="flutter-cap">${CAPS[k]}</p>`;
}

/* =====================================================================
   ILUSTRASI HALAMAN CERITA — sampul & thumbnail chapter, semuanya tinta di kertas
   Setiap gambar = { wash, ink } agar bisa dipakai tajam (miniatur) atau bertekstur (halaman).
   ===================================================================== */
interface InkPic { vb: string; wash: string; ink: string }

/** Momo berjalan ke kanan, ransel di punggung, tongkat di tangan. Titik (0,0) = telapak kaki. */
export const momoWalker = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  ${P('M-28 -46 Q-84 -44 -80 -96 Q-78 -124 -54 -118 Q-70 -108 -68 -94 Q-68 -62 -26 -60 Z', '#8a5530', 2)}
  ${P('M-14 -50 Q-22 -24 -26 -6 Q-14 2 -8 -6 Q-4 -26 2 -48 Z', '#9b6234', 2)}${P('M6 -50 Q18 -28 28 -10 Q38 -2 40 -12 Q30 -30 22 -52 Z', '#9b6234', 2)}
  ${P('M-34 -4 Q-30 -12 -14 -8 Q-8 -2 -14 2 Q-30 4 -34 -4 Z', '#e8bf90', 1.6)}${P('M26 -12 Q32 -18 46 -12 Q50 -6 44 -2 Q30 0 26 -12 Z', '#e8bf90', 1.6)}
  ${P('M-30 -50 Q-36 -100 -4 -112 Q30 -116 34 -86 Q38 -56 22 -46 Q-4 -40 -30 -50 Z', '#9b6234', 2.2)}
  ${P('M-14 -56 Q-16 -88 4 -94 Q22 -90 20 -62 Q4 -50 -14 -56 Z', '#e8bf90', 1.4)}
  ${P('M-20 -96 Q-38 -80 -42 -62 Q-34 -56 -30 -64 Q-24 -80 -8 -90 Z', '#9b6234', 1.8)}
  <g transform="translate(-16 2)">  ${P('M-56 -58 Q-62 -104 -36 -112 Q-14 -114 -12 -90 L-14 -56 Q-32 -48 -56 -58 Z', '#a8774a', 2.2)}
  ${P('M-54 -96 Q-36 -106 -16 -98 L-18 -82 Q-36 -74 -54 -84 Z', '#8f6a3e', 1.6)}${P('M-36 -82 v8', 'none', 2)}${P('M-48 -70 h18 v10 h-18 Z', '#c9a86c', 1.2)}</g>
  ${P('M-14 -104 Q8 -98 14 -70', 'none', 2.4)}
  <path d="M60 -152 L44 4" stroke="#8a5a34" stroke-width="6" stroke-linecap="round"/>${P('M60 -152 L44 4', 'none', 1.4)}${P('M54 -160 Q62 -168 68 -158 Q66 -148 58 -150 Z', '#8fa66b', 1.4)}
  ${P('M20 -100 Q46 -92 56 -70 Q50 -62 44 -68 Q36 -84 18 -88 Z', '#9b6234', 1.8)}<circle cx="52" cy="-70" r="7" fill="#e8bf90" stroke="${INK}" stroke-width="1.6"/>
  <circle cx="-30" cy="-156" r="14" fill="#9b6234" stroke="${INK}" stroke-width="2"/><circle cx="-30" cy="-156" r="7.5" fill="#e8bf90"/>
  <circle cx="44" cy="-156" r="14" fill="#9b6234" stroke="${INK}" stroke-width="2"/><circle cx="44" cy="-156" r="7.5" fill="#e8bf90"/>
  <circle cx="7" cy="-152" r="37" fill="#9b6234" stroke="${INK}" stroke-width="2.4"/>
  ${P('M-18 -150 Q-20 -178 -1 -172 Q7 -182 15 -172 Q34 -178 32 -150 Q34 -122 7 -118 Q-20 -122 -18 -150 Z', '#e8bf90', 1.8)}
  ${P('M-4 -188 q6 -10 12 -2 q4 -10 10 -2', 'none', 1.8)}
  <ellipse cx="-3" cy="-156" rx="4.6" ry="6.4" fill="${INK}"/><ellipse cx="18" cy="-156" rx="4.6" ry="6.4" fill="${INK}"/><circle cx="-1.5" cy="-158.5" r="1.6" fill="#fff"/><circle cx="19.5" cy="-158.5" r="1.6" fill="#fff"/>
  <circle cx="5" cy="-144" r="1.3" fill="${INK}"/><circle cx="10" cy="-144" r="1.3" fill="${INK}"/>
  ${P('M-4 -136 Q7 -122 19 -136 Q7 -130 -4 -136 Z', '#c8463a', 1.6)}
  <circle cx="-12" cy="-138" r="4.5" fill="#e98b7a" opacity=".55"/><circle cx="27" cy="-138" r="4.5" fill="#e98b7a" opacity=".55"/>
</g>`;

const COVER_PICS: Record<string, InkPic> = {
  momo: { vb: '0 0 300 420',
    wash: `<rect width="300" height="420" fill="#cfe0c8" opacity=".6"/><ellipse cx="220" cy="120" rx="140" ry="90" fill="#f2e3a4" opacity=".6"/>
      <path d="M0 230 Q80 180 160 210 Q240 240 300 200 V420 H0Z" fill="#a9c27e" opacity=".7"/><path d="M0 330 Q100 300 200 330 Q260 345 300 320 V420 H0Z" fill="#8fa66b" opacity=".55"/>
      <path d="M150 215 Q120 260 160 300 Q200 340 120 420 H230 Q250 340 200 300 Q170 270 170 215 Z" fill="#e6d3ad" opacity=".85"/>
      <path d="M248 120 Q244 190 254 240" stroke="#a7cfd6" stroke-width="16" fill="none" opacity=".8"/><ellipse cx="256" cy="248" rx="32" ry="9" fill="#a7cfd6" opacity=".8"/>`,
    ink: `${[0, 1, 2, 3].map((i) => `<path d="M${200 + i * 22} 40 L${140 + i * 40} 300" stroke="#fff6cf" stroke-width="${16 - i * 3}" opacity=".3"/>`).join('')}
      ${P('M0 230 Q80 180 160 210 Q240 240 300 200', 'none', 1.4)}
      ${P('M224 110 Q236 96 260 104 Q272 112 272 130 L264 240 H232 Z', '#b8b09a', 1.8)}${P('M248 120 Q244 190 254 240', 'none', 1.2, 'stroke-dasharray="6 6"')}${P('M226 248 q30 -10 60 0', 'none', 1.2)}
      ${pine(30, 230, 1.5, '#7f9a5e')}${pine(76, 215, 1.1)}${roundTree(118, 214, 1.2, '#9db872')}${pine(200, 216, .9, '#8fa66b')}${roundTree(290, 236, 1.4, '#8fa66b')}
      ${P('M150 215 Q120 260 160 300 Q200 340 120 420 M170 215 Q200 270 200 300 Q250 340 230 420', 'none', 1.4)}
      ${roundTree(-6, 330, 2, '#9db872')}${mushroom(40, 380, 1.4)}${mushroom(62, 388, .9)}${flower(250, 384, '#e3a6d8')}${flower(272, 400, '#f2c94c')}${flower(22, 408, '#e8a07a')}
      ${momoWalker(150, 404, 1.2)}
      ${P('M100 60 q8 -6 16 0 q8 -6 16 0 M70 80 q6 -4 12 0 q6 -4 12 0', 'none', 1.4)}` },
  raja: { vb: '0 0 300 420',
    wash: `<rect width="300" height="420" fill="#e9dcc0" opacity=".7"/><ellipse cx="150" cy="150" rx="150" ry="110" fill="#f2c94c" opacity=".35"/><path d="M0 300 Q150 250 300 300 V420 H0Z" fill="#a9c27e" opacity=".7"/>`,
    ink: `<g transform="translate(150 300)">${P('M-80 0 V-90 H80 V0', '#efe0bf', 2)}${Array.from({ length: 9 }, (_, i) => P(`M${-80 + i * 20} -90 v-12 h12 v12`, 'none', 1.6)).join('')}
      ${P('M-110 0 V-150 H-70 V0 M70 0 V-150 H110 V0', '#f3e6c8', 2)}${P('M-118 -150 L-90 -200 L-62 -150 Z M62 -150 L90 -200 L118 -150 Z', '#c8714a', 2)}
      ${P('M-26 -90 V-170 H26 V-90', '#f3e6c8', 2)}${P('M-34 -170 L0 -230 L34 -170 Z', '#b5452f', 2)}${P('M0 -230 V-256 l22 6 -22 6', '#b5452f', 1.6)}
      ${P('M-18 0 V-40 Q0 -58 18 -40 V0', '#8a5a34', 2)}</g>
      ${P('M100 370 H200 V340 L184 352 L150 318 L116 352 L100 340 Z', '#f2c94c', 2.2)}${[100, 150, 200].map((x, i) => `<circle cx="${x}" cy="${i === 1 ? 314 : 336}" r="6" fill="#c8463a" stroke="${INK}" stroke-width="1.6"/>`).join('')}
      ${roundTree(30, 320, 1.4)}${roundTree(276, 320, 1.4, '#8fa66b')}${flower(60, 400, '#e3a6d8')}${flower(240, 404, '#f2c94c')}` },
  putri: { vb: '0 0 300 420',
    wash: `<rect width="300" height="420" fill="#f1dfe3" opacity=".6"/><path d="M0 300 Q150 270 300 300 V420 H0Z" fill="#a9c27e" opacity=".7"/><ellipse cx="150" cy="220" rx="110" ry="130" fill="#fbf1da" opacity=".7"/>`,
    ink: `${P('M60 330 V200 Q60 90 150 90 Q240 90 240 200 V330', 'none', 3)}${P('M70 330 V200 Q70 100 150 100 Q230 100 230 200 V330', 'none', 1.4)}
      ${Array.from({ length: 12 }, (_, i) => { const a = Math.PI * (i / 11); return flower(150 - Math.cos(a) * 92, 205 - Math.sin(a) * 108, ['#e3a6d8', '#f2c6d4', '#f2c94c'][i % 3]); }).join('')}
      <g transform="translate(150 250)">${P('M-46 30 L-32 -20 L-14 10 L0 -34 L14 10 L32 -20 L46 30 Z', '#f2c94c', 2.2)}<circle cy="-38" r="6" fill="#e3a6d8" stroke="${INK}" stroke-width="1.6"/><circle cx="-32" cy="-24" r="4" fill="#8fb4b6" stroke="${INK}" stroke-width="1.2"/><circle cx="32" cy="-24" r="4" fill="#8fb4b6" stroke="${INK}" stroke-width="1.2"/></g>
      ${[40, 90, 210, 260].map((x, i) => flower(x, 380 + (i % 2) * 14, ['#e8a07a', '#b48ae0'][i % 2])).join('')}${butterflyMini(220, 150)}${butterflyMini(80, 170)}` },
  kodok: { vb: '0 0 300 420',
    wash: `<rect width="300" height="420" fill="#d6e6d6" opacity=".6"/><ellipse cx="150" cy="300" rx="170" ry="80" fill="#8fb4b6" opacity=".55"/>`,
    ink: `${P('M-20 300 Q150 210 320 300', 'none', 1.4)}${[[70, 300, 34], [230, 320, 40], [150, 360, 30]].map(([x, y, r]) => P(`M${x - r} ${y} A${r} ${r * .42} 0 1 0 ${x + r} ${y} L${x} ${y} Z`, '#8fa66b', 1.8)).join('')}
      <g transform="translate(150 300)">${P('M-40 0 Q-46 -40 0 -44 Q46 -40 40 0 Q20 12 0 10 Q-20 12 -40 0 Z', '#9db872', 2.2)}<circle cx="-18" cy="-44" r="11" fill="#9db872" stroke="${INK}" stroke-width="2"/><circle cx="18" cy="-44" r="11" fill="#9db872" stroke="${INK}" stroke-width="2"/>
        <circle cx="-18" cy="-45" r="4.5" fill="${INK}"/><circle cx="18" cy="-45" r="4.5" fill="${INK}"/>${P('M-16 -18 Q0 -8 16 -18', 'none', 2)}${P('M-20 -58 L-14 -76 L-6 -62 L0 -80 L6 -62 L14 -76 L20 -58 Z', '#f2c94c', 1.8)}</g>
      ${[30, 270].map((x) => P(`M${x} 420 V250 M${x - 4} 250 q4 -16 8 0 Z`, '#a8774a', 1.6)).join('')}${flower(110, 352, '#f2c6d4')}${flower(250, 312, '#f2c6d4')}${duck(250, 380, 1.3)}` },
};
function butterflyMini(x: number, y: number) { return `<g transform="translate(${x} ${y})">${P('M0 0 Q-16 -14 -14 2 Q-12 12 0 2 Q12 12 14 2 Q16 -14 0 0 Z', '#e3a6d8', 1.4)}${P('M0 -4 V6', 'none', 1.6)}</g>`; }

const THUMB_PICS: Record<string, InkPic> = {
  leaves: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#e9dcc0"/><path d="M0 74 Q80 66 160 74 V100 H0Z" fill="#a9c27e" opacity=".7"/><ellipse cx="80" cy="30" rx="62" ry="26" fill="#e2b33c" opacity=".85"/>`,
    ink: `${P('M70 100 Q74 70 70 50 H90 Q86 70 90 100 Z', '#a8774a', 1.2)}${P('M20 34 Q16 6 54 8 Q80 -2 108 8 Q146 8 140 34 Q132 54 80 52 Q28 56 20 34 Z', '#e2b33c', 1.4)}${P('M40 22 q6 -6 12 0 M90 18 q6 -6 12 0 M70 36 q6 -6 12 0', 'none', .9)}
      ${[[30, 64, 20], [122, 58, -30], [52, 80, 60], [104, 84, 10], [140, 76, 40]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${P('M-7 0 Q-2 -6 7 -1 Q2 5 -7 0 Z', '#e2b33c', .9)}</g>`).join('')}
      <g transform="translate(44 92) scale(.32)">${P('M-30 -52 Q-36 -100 -4 -114 Q30 -118 34 -88 Q38 -58 22 -48 Q-4 -42 -30 -52 Z', '#9b6234', 3)}<circle cx="7" cy="-152" r="37" fill="#9b6234" stroke="${INK}" stroke-width="3"/><ellipse cx="9" cy="-146" rx="24" ry="22" fill="#e8bf90"/>${P('M-14 0 V-50 M14 0 V-50', 'none', 8, 'stroke="#9b6234"')}</g>` },
  rainbow: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#e6eef0"/><path d="M0 80 Q80 70 160 80 V100 H0Z" fill="#a9c27e" opacity=".7"/>`,
    ink: `${['#e3667a', '#f2a65a', '#f2c94c', '#8fa66b', '#8fb4d6', '#7f7fc8', '#b48ae0'].map((c, i) => `<path d="M${18 + i * 5} 82 A${62 - i * 5} ${56 - i * 5} 0 0 1 ${142 - i * 5} 82" fill="none" stroke="${c}" stroke-width="5"/>`).join('')}${P('M18 82 A62 56 0 0 1 142 82', 'none', 1)}
      ${P('M74 82 Q76 66 72 58 H88 Q84 66 86 82 Z', '#a8774a', 1)}${['#e3667a', '#f2c94c', '#8fb4d6', '#b48ae0', '#8fa66b'].map((c, i) => `<circle cx="${68 + (i % 3) * 12}" cy="${50 + Math.floor(i / 3) * 9}" r="8" fill="${c}" stroke="${INK}" stroke-width=".9"/>`).join('')}` },
  meadow: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#d7e6c8"/><ellipse cx="40" cy="20" rx="50" ry="26" fill="#f2e3a4" opacity=".7"/><path d="M0 60 Q80 46 160 60 V100 H0Z" fill="#a9c27e" opacity=".75"/><path d="M70 60 Q60 80 90 100 H120 Q90 80 86 60Z" fill="#e6d3ad"/><path d="M130 24 V62" stroke="#a7cfd6" stroke-width="9" opacity=".85"/>`,
    ink: `${P('M120 20 Q132 12 142 22 L140 62 H122 Z', '#b8b09a', 1.2)}${P('M131 24 V60', 'none', .8, 'stroke-dasharray="3 3"')}${P('M70 60 Q60 80 90 100 M86 60 Q90 80 120 100', 'none', 1)}${pine(16, 62, .6)}${roundTree(44, 62, .55, '#9db872')}${pine(104, 60, .45, '#8fa66b')}${flower(150, 96, '#e3a6d8')}${flower(14, 96, '#f2c94c')}` },
  darkforest: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#b7c3cc"/><circle cx="118" cy="22" r="12" fill="#fbf1da"/><path d="M0 70 Q80 58 160 70 V100 H0Z" fill="#7f9a5e" opacity=".7"/><rect y="56" width="160" height="12" fill="#eef1f2" opacity=".55"/>`,
    ink: `<circle cx="118" cy="22" r="12" fill="none" stroke="${INK}" stroke-width="1"/>${[10, 34, 60, 92, 140].map((x, i) => pine(x, 74 + (i % 2) * 4, .75 + (i % 3) * .1, i % 2 ? '#6f8a52' : '#7f9a5e')).join('')}
      <g transform="translate(80 40)">${P('M-8 10 Q-10 -6 0 -8 Q10 -6 8 10 Q0 14 -8 10 Z', '#a8774a', 1.2)}<circle cx="-3.5" cy="-1" r="3" fill="#f2c94c" stroke="${INK}" stroke-width=".8"/><circle cx="3.5" cy="-1" r="3" fill="#f2c94c" stroke="${INK}" stroke-width=".8"/>${P('M-6 -8 l-2 -5 M6 -8 l2 -5', 'none', 1)}</g>${P('M76 50 H86', 'none', 1.4)}` },
  river: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#d7e6c8"/><path d="M0 50 Q60 40 160 52 V100 H0Z" fill="#a9c27e" opacity=".7"/><path d="M40 50 Q70 70 50 100 H120 Q130 70 110 50Z" fill="#a7cfd6"/>`,
    ink: `${P('M40 50 Q70 70 50 100 M110 50 Q130 70 120 100', 'none', 1)}${[[66, 64, 8], [86, 74, 9], [78, 88, 10]].map(([x, y, r]) => P(`M${x - r} ${y} Q${x} ${y - r} ${x + r} ${y} Q${x} ${y + 4} ${x - r} ${y} Z`, '#b8b09a', 1)).join('')}
      ${P('M62 58 q6 -3 12 0 M96 82 q6 -3 12 0', 'none', .8)}${[20, 26, 140, 146].map((x) => P(`M${x} 70 V48 M${x - 2} 50 q2 -8 4 0Z`, '#a8774a', .9)).join('')}${roundTree(10, 52, .5)}${pine(148, 50, .55)}` },
  campfire: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#e6dcc4"/><path d="M0 74 Q80 66 160 74 V100 H0Z" fill="#a9c27e" opacity=".7"/><ellipse cx="74" cy="34" rx="44" ry="26" fill="#9db872" opacity=".8"/>`,
    ink: `${P('M68 100 Q72 70 66 40 H84 Q78 70 84 100 Z', '#a8774a', 1.2)}${P('M36 34 Q30 10 60 8 Q76 -2 96 8 Q118 10 112 32 Q104 50 74 46 Q44 52 36 34 Z', '#9db872', 1.4)}
      ${P('M58 30 H92 V48 H58 Z', '#c9a86c', 1.2)}${P('M54 30 L75 16 L96 30 Z', '#a35c3c', 1.2)}${P('M70 48 V38 H78 V48', '#8a5a34', .9)}${P('M86 48 L90 98 M94 48 L98 98 M88 60 H96 M89 72 H97 M90 84 H98', 'none', .9)}
      ${P('M118 92 l14 -4 M120 88 l12 6', 'none', 1.4)}${P('M125 90 Q118 78 126 70 Q128 80 134 74 Q138 86 125 90 Z', '#f2a65a', 1)}` },
  peak: { vb: '0 0 160 100',
    wash: `<rect width="160" height="100" fill="#d6e2e6"/><path d="M0 90 L60 20 L100 60 L120 40 L160 84 V100 H0Z" fill="#a9b8c4" opacity=".8"/>`,
    ink: `${P('M0 90 L60 20 L100 60 L120 40 L160 84', 'none', 1.4)}${P('M48 34 L60 20 L72 34 Q66 30 60 38 Q54 30 48 34 Z', '#fbf6ea', 1)}${P('M60 20 V4 l12 4 -12 4', '#b5452f', 1)}${pine(20, 98, .5)}${pine(140, 98, .5)}` },
};

function inkSvg(p: InkPic, rough: boolean, cls = '') {
  const w = rough ? ' filter="url(#wash)"' : '', r = rough ? ' filter="url(#rough)"' : '';
  return `<svg class="${cls}" viewBox="${p.vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g${w}>${p.wash}</g><g${r}>${p.ink}</g></svg>`;
}
/** Sampul cerita bergaya tinta (key: momo | raja | putri | kodok). */
export const coverArt = (key: string, rough = true) => inkSvg(COVER_PICS[key] ?? COVER_PICS.momo, rough, 'ink-plate');
/** Thumbnail chapter bergaya tinta (key: meadow | darkforest | river | campfire | peak). */
export const thumbArt = (key: string, rough = true) => inkSvg(THUMB_PICS[key] ?? THUMB_PICS.meadow, rough, 'ink-thumb');
/** Potongan untuk miniatur di tangan Momo: gambar disisipkan sebagai <svg> bersarang (tajam, tanpa filter). */
export const nestedArt = (svg: string, x: number, y: number, w: number, h: number) =>
  svg.replace('<svg ', `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" `);
export { P, hatch, house, pine, roundTree, flower, mushroom, rabbit, duck, deer, cloud as cloudArt };
