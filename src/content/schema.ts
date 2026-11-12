/**
 * Skema konten Story Book.
 * User → Progress;  Category → Book → Chapter → Scene → Beat.
 *
 * Pemetaan ke saran brief:
 *  - narrationSegments  = beats[].narration  {text, position, revealStyle, audioCue, minMs (≈ endMs-startMs)}
 *  - cameraKeyframes    = beats[].camera     {x, y, zoom, dur, ease}
 *  - characters         = scene.characters
 *  - backgroundLayers   = scene.art (+ variant) → lapisan SVG berkedalaman di src/art/scenes
 *  - interactions       = beats[].interaction
 *  - transition         = scene.transition
 * Timeline dijalankan per "beat": kamera, aksi karakter, dan narasi satu beat berjalan
 * bersamaan; beat berikutnya mulai setelah suara narator & durasi minimum selesai.
 * Dengan begitu teks, suara, dan gerak tetap sinkron walau kecepatan TTS berbeda-beda.
 */

export type Id = string;

export interface Age { id: Id; label: string; range: string; emblem: string; tint: string; cover?: string }
export interface Activity { id: Id; label: string; emblem: string; tint: string; cover?: string }
export interface Category { id: Id; label: string; emblem: string; /** 'scene:<nama>' atau 'cover:<nama>' */ art?: string }
export interface ChapterMeta { id: Id; title: string; thumb: string; story?: Id /* kosong = segera hadir */ }
export interface Book {
  id: Id; title: string; subtitle?: string; emblem: string; tint: string;
  /** Sampul lukisan (src/assets/covers/<cover>.jpg). */
  cover?: string;
  categories: Id[]; ages: Id[]; activities: Id[];
  chapters: ChapterMeta[];
}
export interface Catalog { ages: Age[]; activities: Activity[]; categories: Category[]; books: Book[] }

export function validateCatalog(c: Catalog, stories: Record<string, unknown>): string[] {
  const err: string[] = [];
  const cat = new Set(c.categories.map((x) => x.id));
  const ages = new Set(c.ages.map((x) => x.id));
  const acts = new Set(c.activities.map((x) => x.id));
  for (const b of c.books) {
    b.categories.forEach((x) => !cat.has(x) && err.push(`${b.id}: kategori "${x}" tidak ada`));
    b.ages.forEach((x) => !ages.has(x) && err.push(`${b.id}: usia "${x}" tidak ada`));
    b.activities.forEach((x) => !acts.has(x) && err.push(`${b.id}: aktivitas "${x}" tidak ada`));
    for (const ch of b.chapters) if (ch.story && !stories[ch.story]) err.push(`${b.id}/${ch.id}: cerita "${ch.story}" tidak ditemukan`);
  }
  for (const k of cat) if (!c.books.some((b) => b.categories.includes(k))) err.push(`kategori "${k}" belum punya buku`);
  return err;
}
