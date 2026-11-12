# Story Book

Buku cerita interaktif berbahasa Indonesia untuk Balita, TK, dan SD, dengan gaya paper ink.

Website: https://story-book-momo.vercel.app

Repositori ini berisi kode sumber rilis web aktif dan 421 MP3 final Chapter 1-4. Arsip, pratinjau lama, alat produksi suara, WAV mentah, API key, dan hasil build tidak disertakan.

## Pengembangan

Gunakan Node.js yang sesuai dengan lockfile.

```sh
npm ci
npm run dev
npm run release
```

Perintah release menjalankan tes, pemeriksaan TypeScript, build, manifest SHA-256, dan audit paket. Hasil siap hosting berada di dist. Vercel membangun dengan npm run build dan outputDirectory dist.

## Struktur

- src: alur buku, pembaca paper ink, ilustrasi, konten, akun/progres lokal, audio, dan CSS.
- public/assets/sound/narasi: MP3 dan index.json per chapter.
- tests: pengujian akun dan validasi konten/loader.
- tools: audit paket dan persiapan manifest rilis.

Akun dan progres saat ini tersimpan lokal di browser. Produksi suara dilakukan di luar repositori ini. Biaya proyek wajib Rp0; penggunaan layanan harus mengikuti paket gratis dan kuotanya.
