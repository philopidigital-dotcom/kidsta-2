/**
 * Penyimpanan aman: localStorage bila tersedia, fallback ke memori
 * (beberapa konteks — mode privat, iframe — melempar error saat diakses).
 */
const mem = new Map<string, string>();

function ls(): Storage | null {
  try {
    const s = window.localStorage;
    const k = '__sb_probe__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch { return null; }
}

export const storage = {
  persistent: ls() !== null,
  get<T>(key: string, fallback: T): T {
    try {
      const store = ls();
      // Bila localStorage tersedia, ia sumber kebenaran; memori hanya cadangan saat tidak tersedia.
      const raw = store ? store.getItem(key) : (mem.get(key) ?? null);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    const raw = JSON.stringify(value);
    mem.set(key, raw);
    try { ls()?.setItem(key, raw); } catch { /* kuota/privat: tetap di memori */ }
  },
  remove(key: string) {
    mem.delete(key);
    try { ls()?.removeItem(key); } catch { /* abaikan */ }
  },
};
