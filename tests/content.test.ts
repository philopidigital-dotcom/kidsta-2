import { describe, it, expect } from 'vitest';
import { catalog } from '../src/content';
import { stories } from '../src/content/allStories';
import { loadStory } from '../src/content/loadStory';
import { validateCatalog } from '../src/content/schema';
import { validateStory } from '../src/reader/paper/validate';
import { progress } from '../src/core/progress';
import voices from '../src/content/voices.json';

describe('Konten 2.5D', () => {
  it('pemuatan chapter terpisah mengembalikan konten yang sama', async () => {
    for (const [id, story] of Object.entries(stories)) {
      expect(await loadStory(id)).toEqual(story);
    }
    expect(await loadStory('tidak-ada')).toBeUndefined();
    expect(await loadStory()).toBeUndefined();
  });
  it('katalog valid', () => expect(validateCatalog(catalog, stories)).toEqual([]));
  it('semua cerita valid', () => Object.values(stories).forEach((s) => expect(validateStory(s)).toEqual([])));
  it('chapter 1 cukup panjang (±10 menit) & penuh interaksi', () => {
    const beats = stories['momo-ch1'].scenes.flatMap((s) => s.beats);
    const words = beats.reduce((n, b) => n + (b.say?.split(/\s+/).length ?? 0), 0);
    expect(words).toBeGreaterThan(700);
    expect(beats.filter((b) => b.ask).length).toBeGreaterThanOrEqual(6);
  });
  it('setiap adegan punya musik emosi & setiap kalimat punya arahan nada', () => {
    for (const sc of stories['momo-ch1'].scenes) {
      expect(sc.music).toBeTruthy();
      for (const b of sc.beats) if (b.say) expect(b.tone, `${sc.id}: ${b.say}`).toBeTruthy();
    }
  });
  it('validator menangkap kesalahan', () => {
    const bad = structuredClone(stories['momo-ch1']);
    bad.scenes[0].beats[0].do = [{ who: 'kura', pose: 'walk' }];
    bad.scenes[1].cast[0].at = 'entah-di-mana';
    expect(validateStory(bad).length).toBeGreaterThanOrEqual(2);
  });
});

describe('Progres', () => {
  it('menyimpan chapter selesai per akun', () => {
    localStorage.clear();
    progress.complete('a@x.id', 'buku', 'ch1');
    expect(progress.get('a@x.id').completed.ch1).toBeTypeOf('number');
    expect(progress.get('b@x.id').completed.ch1).toBeUndefined();
    progress.update('a@x.id', { sound: false });
    expect(progress.get('a@x.id').sound).toBe(false);
  });
});


describe('Kunci suara', () => {
  it('narator terkunci permanen: suara perempuan Sulafat', () => {
    expect(voices.narator.suara).toBe('Sulafat');
    expect(voices.narator.kelamin).toBe('perempuan');
    expect(voices.narator.terkunci).toBe(true);
    expect(voices.narator.browser.kelamin).toBe('perempuan');
  });
  it('setiap suara hanya dipakai satu tokoh (termasuk tokoh yang dipesan)', () => {
    const all = [voices.narator.suara, ...Object.values(voices.tokoh).map((t) => t.suara), ...Object.entries(voices.dipesan).filter(([k]) => k !== '_catatan').map(([, t]) => (t as { suara: string }).suara)];
    expect(new Set(all).size).toBe(all.length);
  });
  it('semua tokoh & pembicara di cerita punya suara terkunci', () => {
    for (const st of Object.values(stories)) for (const sc of st.scenes) {
      for (const c of sc.cast) expect(voices.tokoh, c.id).toHaveProperty(c.id);
      for (const b of sc.beats) if (b.who) expect(voices.tokoh, b.who).toHaveProperty(b.who);
    }
  });
});
