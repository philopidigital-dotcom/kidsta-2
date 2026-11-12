/**
 * Progres per akun: buku & chapter terakhir, chapter selesai, preferensi suara,
 * dan pilihan usia/aktivitas/kategori terakhir.
 */
import { storage } from './storage';

export interface Progress {
  lastBookId?: string;
  lastChapterId?: string;
  completed: Record<string, number>; // chapterId -> timestamp selesai
  sound: boolean;
  ageId?: string;
  activityId?: string;
  categoryId?: string;
}

const KEY = 'storybook.progress.v1';
const fresh = (): Progress => ({ completed: {}, sound: true });

type All = Record<string, Progress>;

export const progress = {
  get(email: string): Progress {
    const all = storage.get<All>(KEY, {});
    return { ...fresh(), ...all[email], completed: { ...(all[email]?.completed ?? {}) } };
  },
  update(email: string, patch: Partial<Progress>): Progress {
    const all = storage.get<All>(KEY, {});
    const next = { ...progress.get(email), ...patch };
    all[email] = next;
    storage.set(KEY, all);
    return next;
  },
  complete(email: string, bookId: string, chapterId: string): Progress {
    const p = progress.get(email);
    p.completed[chapterId] = Date.now();
    return progress.update(email, { completed: p.completed, lastBookId: bookId, lastChapterId: chapterId });
  },
};
