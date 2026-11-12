/**
 * Format cerita 2.5D "paper ink".
 *   Story → Scene (panggung, waktu, cuaca, musik, pemeran, kamera awal) → Beat.
 * Satu beat = satu kalimat narasi/dialog + kamera + aksi + interaksi yang berjalan bersamaan.
 */
export type SetName = 'kamar' | 'teras' | 'jalan' | 'pohonInduk' | 'hutanBisik' | 'tanahLapang' | 'sungai' | 'kemah' | 'tebing' | 'puncak';
export type Grade = 'dawn' | 'day' | 'cloudy' | 'dusk' | 'night';
export type Weather = 'none' | 'motes' | 'leaves' | 'goldLeaves' | 'wind' | 'fireflies' | 'rain';
export type Mood = 'tenang' | 'ceria' | 'lucu' | 'penasaran' | 'cemas' | 'sedih' | 'haru' | 'berani' | 'misteri' | 'tegang' | 'malam' | 'gembira' | 'none';
export type Ambience = 'hutan' | 'malam' | 'angin' | 'hujan' | 'none';
export type CastId = 'momo' | 'kakek' | 'cici' | 'kura' | 'pipi' | 'dodo' | 'kiko';
export type Pose = 'idle' | 'walk' | 'run' | 'jump' | 'sit' | 'sleep' | 'wave' | 'stretch' | 'think' | 'point' | 'cheer' | 'sad' | 'cry'
  | 'scared' | 'hug' | 'eat' | 'fall' | 'climb' | 'nod' | 'shake' | 'clap' | 'peek' | 'talk' | 'fly' | 'hop' | 'hide' | 'push';
export type Expr = 'happy' | 'joy' | 'calm' | 'sleepy' | 'surprised' | 'scared' | 'sad' | 'cry' | 'worried' | 'brave' | 'curious' | 'dizzy' | 'wink' | 'dream';
export type Look = 'l' | 'r' | 'cam' | 'up' | 'down';
export type Fx = 'zzz' | 'exclaim' | 'question' | 'sweat' | 'tears' | 'hearts' | 'sparkle' | 'notes' | 'dizzy' | 'puff' | 'glow' | 'shine';
export type Sfx = 'thud' | 'boing' | 'rustle' | 'gust' | 'thunder' | 'munch' | 'pop' | 'chime' | 'step' | 'chirp' | 'rooster' | 'gasp' | 'magic' | 'creak' | 'whoosh';

/** Kamera: x,y = titik tengah di dunia (lebar set × 900), z = zoom (1 = seluruh tinggi set), rot = kemiringan°. */
export interface Cam { x?: number; y?: number; z?: number; rot?: number; dur?: number; ease?: string; follow?: CastId; shake?: number }

/** Posisi bisa berupa titik bernama di set ("spot") atau [x, y]. */
export type At = string | [number, number];

export type Act =
  | { who: CastId; pose?: Pose; expr?: Expr; face?: 'l' | 'r'; look?: Look; to?: At; dur?: number; delay?: number; then?: Pose }
  | { fx: Fx; who?: CastId; at?: At; delay?: number }
  | { prop: string; state: string; delay?: number };

export interface ChoiceOpt { id: string; label: string; art: string }
export type Ask =
  | { type: 'choice'; q: string; options: ChoiceOpt[]; answer: string; praise: string; retry: string }
  | { type: 'tap'; q: string; items: string[]; count?: 'number' | 'none'; praise: string };

export interface Beat {
  /** Teks narasi / dialog (≤ 26 kata). */
  say?: string;
  /** Pembicara (dialog). Kosong = narator. */
  who?: CastId;
  /** Arahan emosi untuk pengisi suara (Gemini TTS), mis. "berbisik penuh rasa ingin tahu". */
  tone?: string;
  /** Versi teks untuk suara bila beda dari tampilan, boleh berisi tag suara: <laugh> <gasp> <yawn> <sigh> <long pause>. */
  tts?: string;
  /** Halaman tempat kartu teks: L / R (otomatis bila kosong). */
  side?: 'L' | 'R';
  cam?: Cam;
  do?: Act[];
  grade?: Grade;
  weather?: Weather;
  music?: Mood;
  ambience?: Ambience;
  sfx?: Sfx[];
  ask?: Ask;
  /** Jeda setelah beat (ms). */
  hold?: number;
  /** Lama minimum beat (ms) — untuk beat tanpa kata. */
  wait?: number;
}

export interface Placement { id: CastId; at: At; face?: 'l' | 'r'; pose?: Pose; expr?: Expr; hidden?: boolean }

export interface Scene {
  id: string;
  /** Judul adegan untuk bank cerita. */
  name: string;
  set: SetName;
  grade: Grade;
  weather?: Weather;
  music: Mood;
  ambience?: Ambience;
  cast: Placement[];
  cam: Cam;
  props?: Record<string, string>;
  beats: Beat[];
}

export interface PaperStory {
  format: 'paper';
  id: string; bookId: string; chapterId: string;
  chapterLabel: string; title: string;
  scenes: Scene[];
}
