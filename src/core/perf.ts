/**
 * Deteksi perangkat kelas rendah untuk mode hemat render.
 * Paksa lewat URL bila perlu: ?perf=lite atau ?perf=full.
 */
type NavigatorWithMemory = Navigator & { deviceMemory?: number };

function detect(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('perf');
  if (forced === 'lite') return true;
  if (forced === 'full') return false;
  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const small = Math.min(window.screen?.width ?? 1920, window.screen?.height ?? 1080) < 820;
  return coarse || small || cores <= 4 || memory <= 4;
}

export const perf = { lite: detect() };

function applyLite() {
  if (typeof document !== 'undefined') document.documentElement.dataset.perf = 'lite';
}

if (perf.lite) applyLite();

/**
 * Jaring pengaman: bila perangkat ternyata tetap di bawah ~30 fps,
 * aktifkan mode hemat otomatis (filter tinta & blend dimatikan via CSS).
 */
export function watchFrameRate(maxMs = 20000) {
  if (perf.lite || typeof requestAnimationFrame === 'undefined' || typeof document === 'undefined') return;
  const started = performance.now();
  let frames = 0, mark = started, slow = 0;
  const sample = (now: number) => {
    if (document.hidden) { mark = now; frames = 0; requestAnimationFrame(sample); return; }
    frames++;
    if (now - mark >= 2000) {
      const fps = frames / ((now - mark) / 1000);
      slow = fps < 30 ? slow + 1 : 0;
      frames = 0; mark = now;
      if (slow >= 2) { perf.lite = true; applyLite(); return; }
    }
    if (now - started < maxMs) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}
