let root: HTMLElement | null = null;
export function toast(msg: string, kind: 'info' | 'err' = 'info', ms = 3400) {
  if (!root) { root = document.createElement('div'); root.className = 'toast-root'; root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite'); document.getElementById('app')!.appendChild(root); }
  const t = document.createElement('div');
  t.className = `toast toast--${kind}`; t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, ms);
}
