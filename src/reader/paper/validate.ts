/** Validasi cerita 2.5D (dipakai saat pengembangan & tes). */
import type { PaperStory } from './types';
import { SETS } from './sets';

/* ---------------- Validasi ---------------- */

/** Periksa cerita 2.5D: id adegan unik, kalimat pendek, tempat (spot) & tokoh dikenal, jawaban ada di pilihan. */
export function validateStory(s: PaperStory): string[] {
  const err: string[] = [];
  if (s.format !== 'paper') err.push(`${s.id}: format bukan "paper"`);
  if (!s.scenes?.length) err.push(`${s.id}: tidak ada adegan`);
  const ids = new Set<string>();
  for (const sc of s.scenes ?? []) {
    if (ids.has(sc.id)) err.push(`${sc.id}: id adegan ganda`);
    ids.add(sc.id);
    const set = SETS[sc.set]?.();
    if (!set) { err.push(`${sc.id}: set "${sc.set}" tidak ada`); continue; }
    const cast = new Set<string>(sc.cast.map((c) => c.id));
    const spotOk = (at: unknown, where: string) => {
      if (typeof at !== 'string') return;
      const rel = /^@([a-zA-Z0-9]+):/.exec(at);
      const key = rel ? rel[1] : at;
      if (!set.spots[key] && !cast.has(key)) err.push(`${where}: tempat "${at}" tidak dikenal`);
    };
    sc.cast.forEach((c) => spotOk(c.at, `${sc.id} pemeran ${c.id}`));
    sc.beats.forEach((b, i) => {
      const where = `${sc.id}#${i}`;
      if (b.say && b.say.trim().split(/\s+/).length > 26) err.push(`${where}: kalimat terlalu panjang (maks 26 kata)`);
      if (b.who && !cast.has(b.who) && !(b.who === 'kakek' && sc.id === 's1')) err.push(`${where}: pembicara "${b.who}" tidak ada di adegan`);
      for (const a of b.do ?? []) {
        if ('who' in a && a.who && !('fx' in a) && !cast.has(a.who)) err.push(`${where}: tokoh "${a.who}" tidak ada di adegan`);
        if ('to' in a && a.to) spotOk(a.to, where);
      }
      const q = b.ask;
      if (q?.type === 'choice' && !q.options.some((o) => o.id === q.answer)) err.push(`${where}: jawaban tidak ada di pilihan`);
      if (b.ask?.type === 'tap' && (b.ask.items.length < 1 || b.ask.items.length > 10)) err.push(`${where}: jumlah ketukan 1–10`);
    });
  }
  return err;
}

