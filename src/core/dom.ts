/** Helper DOM kecil. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (html) el.innerHTML = html;
  return el;
}

export function banner(title: string, kicker?: string) {
  return `<div class="banner"><svg class="banner__bg" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="bn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e2a8"/><stop offset=".5" stop-color="#c99a45"/><stop offset="1" stop-color="#8a6420"/></linearGradient>
    <linearGradient id="bn-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2160"/><stop offset="1" stop-color="#140f36"/></linearGradient></defs>
    <path d="M30 8 H370 L392 45 L370 82 H30 L8 45Z" fill="url(#bn-f)" stroke="url(#bn-g)" stroke-width="3" vector-effect="non-scaling-stroke"/>
    <path d="M40 16 H360 L376 45 L360 74 H40 L24 45Z" fill="none" stroke="url(#bn-g)" stroke-width="1" opacity=".6" vector-effect="non-scaling-stroke"/>
  </svg><span class="banner__inner">${kicker ? `<small>${kicker}</small>` : ''}${title}</span></div>`;
}
