/** Konten lengkap untuk validasi saat pengembangan dan pengujian. */
import momoCh1 from './stories/momo-ch1.json';
import momoCh2 from './stories/momo-ch2.json';
import momoCh3 from './stories/momo-ch3.json';
import momoCh4 from './stories/momo-ch4.json';
import type { PaperStory } from '../reader/paper/types';

export const stories: Record<string, PaperStory> = {
  'momo-ch1': momoCh1 as unknown as PaperStory,
  'momo-ch2': momoCh2 as unknown as PaperStory,
  'momo-ch3': momoCh3 as unknown as PaperStory,
  'momo-ch4': momoCh4 as unknown as PaperStory,
};
