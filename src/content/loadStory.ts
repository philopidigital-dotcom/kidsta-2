import type { PaperStory } from '../reader/paper/types';

const loaders: Record<string, () => Promise<{ default: unknown }>> = {
  'momo-ch1': () => import('./stories/momo-ch1.json'),
  'momo-ch2': () => import('./stories/momo-ch2.json'),
  'momo-ch3': () => import('./stories/momo-ch3.json'),
  'momo-ch4': () => import('./stories/momo-ch4.json'),
};

export async function loadStory(id?: string): Promise<PaperStory | undefined> {
  if (!id || !loaders[id]) return undefined;
  return (await loaders[id]()).default as PaperStory;
}
