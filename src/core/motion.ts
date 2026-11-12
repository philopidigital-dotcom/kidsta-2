/** Preferensi gerak: menghormati prefers-reduced-motion (fallback reduced motion). */
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const motion = {
  get reduced(): boolean { return !!mq?.matches; },
  /** Durasi animasi: dipangkas drastis bila reduced motion aktif. */
  d(seconds: number): number { return this.reduced ? Math.min(seconds, .01) : seconds; },
};

export const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('aborted', 'AbortError')); }, { once: true });
});
