/**
 * Pintu masuk konten. Katalog & cerita adalah data JSON — menambah buku atau
 * chapter cukup dengan mengedit/menambah file di folder ini (tanpa menyentuh layar).
 */
import catalogJson from './catalog.json';
import type { Catalog, Book } from './schema';
import { loadStory } from './loadStory';

export const catalog = catalogJson as Catalog;

export const bookById = (id: string): Book | undefined => catalog.books.find((b) => b.id === id);
export const booksInCategory = (cat: string) => catalog.books.filter((b) => b.categories.includes(cat));

/** Pramuat chapter berikutnya: mesin cerita & daftar suara browser. */
export function preloadChapter(storyId?: string) {
  if (!storyId) return;
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  void loadStory(storyId).catch(() => {});
  void import('../reader/paper/player');
}
