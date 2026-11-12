/**
 * Daftar Isi buku: BAB (aktivitas) → Kategori → Cerita.
 * Cerita yang punya `book` bisa dibuka; tanpa `book` tampil "segera hadir".
 */
import { bookById } from './index';
import type { Book } from './schema';

export interface TocStory { title: string; book?: string; note?: string }
export interface TocCategory { id: string; label: string; stories: TocStory[] }
export interface TocBab { no: string; title: string; blurb: string; categories: TocCategory[] }

export const LEVELS = [
  { id: 'balita', label: 'Balita', range: '2 – 4 tahun', note: 'Cerita pendek, gambar besar, suara narator lembut.' },
  { id: 'tk', label: 'TK', range: '4 – 6 tahun', note: 'Cerita bergambar dengan tebak-tebakan seru.' },
  { id: 'sd', label: 'SD', range: '6 – 12 tahun', note: 'Petualangan lebih panjang & tantangan berpikir.' },
] as const;

const TOC: TocBab[] = [
  { no: 'I', title: 'Waktu Bercerita', blurb: 'Dengarkan & ikuti petualangan seru.', categories: [
    { id: 'dongeng', label: 'Dongeng', stories: [
      { title: 'Momo dan Benih Pelangi', book: 'petualangan-si-monyet', note: 'Kisah Momo' },
      { title: 'Kisah Sang Raja Hebat', book: 'kisah-sang-raja-hebat' },
      { title: 'Si Putri Cantik', book: 'si-putri-cantik' },
      { title: 'Kodok yang Berubah Jadi Pangeran', book: 'kodok-pangeran' },
    ] },
    { id: 'dongeng-tidur', label: 'Dongeng Sebelum Tidur', stories: [
      { title: 'Bintang yang Mengantuk' }, { title: 'Bulan dan Si Burung Hantu' },
    ] },
  ] },
  { no: 'II', title: 'Ayo Mengenal', blurb: 'Belajar tentang dunia di sekitar kita.', categories: [
    { id: 'mengenal-hewan', label: 'Mengenal Hewan', stories: [{ title: 'Teman-Teman di Hutan' }, { title: 'Penghuni Kolam' }] },
    { id: 'mengenal-angka', label: 'Mengenal Angka', stories: [{ title: 'Berhitung 1 sampai 10' }, { title: 'Bentuk & Warna' }] },
    { id: 'mengenal-huruf', label: 'Mengenal Huruf', stories: [{ title: 'Petualangan A sampai Z' }] },
  ] },
  { no: 'III', title: 'Bermain & Berkreasi', blurb: 'Bernyanyi, mewarnai, dan berkarya.', categories: [
    { id: 'lagu', label: 'Lagu Anak', stories: [{ title: 'Bernyanyi Bersama Momo' }] },
    { id: 'mewarnai', label: 'Mewarnai', stories: [{ title: 'Buku Mewarnai Ajaib' }] },
  ] },
];

/** Daftar isi untuk satu jenjang: cerita yang tidak cocok jenjangnya disembunyikan. */
export function tocFor(level: string): TocBab[] {
  return TOC.map((b) => ({ ...b, categories: b.categories.map((c) => ({ ...c, stories: c.stories.filter((s) => {
    const bk = s.book ? bookById(s.book) : undefined;
    return !bk || bk.ages.includes(level);
  }) })).filter((c) => c.stories.length) }));
}

export const isPlayable = (b?: Book) => !!b?.chapters.some((c) => c.story);
