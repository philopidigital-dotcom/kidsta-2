/** Buku terbuka (spread) — dipakai daftar chapter dan reader. */
const corner = `<svg class="spread__corner CLS" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="sc-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6"/><stop offset=".5" stop-color="#c99a45"/><stop offset="1" stop-color="#8a6420"/></linearGradient></defs>
  <path d="M4 4 H70 Q56 10 50 22 Q36 16 26 26 Q16 36 22 50 Q10 56 4 70 Z" fill="url(#sc-g)"/><path d="M14 14 H44 M14 14 V44" stroke="#5a3a10" stroke-width="2" opacity=".5"/><circle cx="24" cy="24" r="7" fill="#fff3c0" opacity=".85"/><circle cx="24" cy="24" r="3.5" fill="#8a6420"/></svg>`;

export function spreadMarkup(o: { left?: string; right?: string; canvas?: string; ribbon?: boolean; flat?: boolean }) {
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => corner.replace('CLS', `spread__corner--${c}`)).join('');
  return `<div class="spread-wrap"><div class="spread ${o.flat ? 'spread--flat' : ''}">
    <div class="spread__shadow"></div>
    <div class="spread__leather"></div>
    <div class="spread__stack spread__stack--l"></div><div class="spread__stack spread__stack--r"></div>
    <div class="spread__pages">
      <div class="spread__page spread__page--l">${o.left ?? ''}</div>
      <div class="spread__page spread__page--r">${o.right ?? ''}</div>
    </div>
    ${o.canvas !== undefined ? `<div class="spread__canvas">${o.canvas}</div>` : ''}
    <div class="spread__gutter"></div>
    ${corners}
    ${o.ribbon ? '<div class="spread__ribbon"></div>' : ''}
  </div></div>`;
}
