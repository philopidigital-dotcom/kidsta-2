/**
 * Latar lukisan per layar (dibuat di Canva). Setiap latar punya titik cahaya
 * (lentera/lilin/lingkaran sihir) yang dianimasikan di atas lukisan agar hidup.
 * Koordinat dalam persen gambar 16:9.
 */

export type BackdropName = 'landing' | 'age' | 'activity' | 'category' | 'books' | 'desk' | 'celebrate';

interface Glow { x: number; y: number; r: number; kind?: 'lamp' | 'candle' | 'magic' | 'moon' }
export interface Backdrop { src: string; glows: Glow[]; dim?: number; blur?: number; focus?: [number, number] }

/** Gaya Kertas Peta: dunia lukisan lama tidak lagi ditampilkan — tanpa gambar agar ukuran unduhan kecil. */
const landing = '', age = '', activity = '', category = '', books = '', desk = '', celebrate = '';

const L = (x: number, y: number, r = 7): Glow => ({ x, y, r, kind: 'lamp' });
const C = (x: number, y: number, r = 3.2): Glow => ({ x, y, r, kind: 'candle' });

export const BACKDROPS: Record<BackdropName, Backdrop> = {
  landing: { src: landing, focus: [50, 60], glows: [L(7.6, 8, 8), L(35.6, 24.5, 5), L(72.9, 9, 6), L(94, 9, 8), L(12.6, 88, 6), L(94.4, 87, 7), L(27.4, 42, 4), L(76.5, 42, 4), { x: 50, y: 88, r: 26, kind: 'magic' }, { x: 55.2, y: 13.5, r: 6, kind: 'moon' }] },
  age: { src: age, focus: [50, 55], glows: [L(15, 14, 8), L(32.7, 25, 6), L(79.5, 21, 6), L(91, 17, 7), L(40.4, 50, 3.5), L(70.6, 51, 3.5), L(83.4, 41, 4), { x: 61.5, y: 19.5, r: 5, kind: 'moon' }] },
  activity: { src: activity, focus: [50, 50], glows: [L(26.4, 14.5, 8), L(36.4, 33, 5.5), L(40.9, 43.5, 4), L(74.4, 14.5, 8), L(63.4, 33, 5.5), L(57, 45, 4), { x: 50, y: 40, r: 10, kind: 'moon' }] },
  category: { src: category, focus: [50, 45], glows: [C(8, 60), C(28, 51), C(35.6, 55), C(64.5, 55), C(66.2, 55), C(7.4, 60), L(25.6, 27, 4), L(75.2, 27, 4), L(23.8, 76, 3), L(72, 74, 3), { x: 93.5, y: 10, r: 7, kind: 'moon' }] },
  books: { src: books, focus: [50, 62], glows: [L(10, 20, 6), L(25, 30, 4), L(85, 20, 5), { x: 50, y: 74, r: 22, kind: 'magic' }, { x: 87, y: 10, r: 5, kind: 'moon' }] },
  desk: { src: desk, focus: [50, 60], glows: [C(11, 40, 4), L(21.5, 52, 6), { x: 82, y: 50, r: 9, kind: 'magic' }, { x: 46, y: 9, r: 6, kind: 'moon' }] },
  celebrate: { src: celebrate, focus: [50, 50], glows: [{ x: 50, y: 45, r: 24, kind: 'magic' }, L(20, 30, 6), L(80, 30, 6)] },
};
