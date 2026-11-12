import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(process.argv[2] ?? join(project, 'dist'));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  statSync(join(dir, entry.name)).isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const files = walk(root);
const errors = [];
let integrityChecked = 0;
const integrityPath = join(root, 'release-manifest.json');
if (existsSync(integrityPath)) {
  const manifest = JSON.parse(readFileSync(integrityPath, 'utf8'));
  const seen = new Set();
  for (const item of manifest.files ?? []) {
    const file = resolve(root, item.path);
    const rel = relative(root, file);
    if (rel.startsWith('..') || resolve(file) === root || seen.has(item.path)) {
      errors.push(`Manifest tidak valid: ${item.path}`);
      continue;
    }
    seen.add(item.path);
    if (!existsSync(file)) { errors.push(`Manifest: ${item.path} hilang`); continue; }
    const bytes = readFileSync(file);
    if (bytes.length !== item.bytes || createHash('sha256').update(bytes).digest('hex') !== item.sha256) {
      errors.push(`Integritas gagal: ${item.path}`);
    }
    integrityChecked++;
  }
}
const assertFile = (path, context) => {
  if (!existsSync(path)) errors.push(`${context}: ${relative(root, path)} tidak ditemukan`);
};

for (const file of files) {
  const name = relative(root, file).replaceAll('\\', '/');
  if (/\.(wav|zip|log|ts|mjs|py)$/i.test(name) || /(^|\/)(node_modules|src|mentah|kunci[^/]*|\.env[^/]*)(\/|$)/i.test(name)) {
    errors.push(`Berkas kerja atau rahasia berada di paket web: ${name}`);
  }
  if (!/\.(html|css|js|json|txt)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (/(?:AIza[\w-]{30,}|AQ\.[\w.-]{30,})/.test(text)) errors.push(`Pola API key ditemukan: ${name}`);
  for (const match of text.matchAll(/(?:["'`(])((?:\/assets\/|\.\/)[^"'\s`)<>]+\.(?:js|css|woff2?|png|jpe?g|webp|svg))(?:["'`)])/g)) {
    const asset = match[1].startsWith('/') ? join(root, match[1]) : resolve(dirname(file), match[1]);
    assertFile(asset, name);
  }
}

const chapters = [];
const audioRoot = join(root, 'assets/sound/narasi');
assertFile(audioRoot, 'Folder suara');
if (existsSync(audioRoot)) for (const id of readdirSync(audioRoot)) {
  const dir = join(audioRoot, id);
  const manifest = join(dir, 'index.json');
  assertFile(manifest, id);
  if (!existsSync(manifest)) continue;
  const clips = JSON.parse(readFileSync(manifest, 'utf8'));
  if (new Set(clips).size !== clips.length) errors.push(`${id}: manifest berisi ID duplikat`);
  for (const clip of clips) assertFile(join(dir, clip + '.mp3'), id);
  const storyFile = join(project, 'src/content/stories', id + '.json');
  if (existsSync(storyFile)) {
    const story = JSON.parse(readFileSync(storyFile, 'utf8'));
    const required = new Set(['title']);
    for (const scene of story.scenes) scene.beats.forEach((beat, index) => {
      const prefix = `${scene.id}-${index}`;
      if (beat.say) required.add(prefix);
      if (beat.ask) {
        required.add(prefix + '-q');
        required.add(prefix + '-praise');
        if (beat.ask.type === 'choice') required.add(prefix + '-retry');
        else if (beat.ask.count === 'number') beat.ask.items.forEach((_, n) => required.add('num-' + (n + 1)));
      }
    });
    for (const clip of required) if (!clips.includes(clip)) errors.push(`${id}: rekaman ${clip} belum ada di manifest`);
  }
  chapters.push({ id, clips: clips.length });
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
  .map((match) => join(root, match[1])).filter((file) => extname(file) === '.js');
const jsBytes = initial.reduce((sum, file) => sum + statSync(file).size, 0);
const jsGzipBytes = initial.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
if (initial.some((file) => /story-engine|momo-ch\d/.test(file))) {
  errors.push('Mesin cerita atau data chapter dimuat di halaman awal');
}
if (jsBytes > 300_000) errors.push('JavaScript awal melampaui anggaran 300.000 byte');
const result = {
  integrityChecked,
  files: files.length,
  bytes: files.reduce((sum, file) => sum + statSync(file).size, 0),
  initialJsBytes: jsBytes,
  initialJsGzipBytes: jsGzipBytes,
  chapters,
  errors,
};
console.log(JSON.stringify(result, null, 2));
assert.equal(errors.length, 0, 'Audit paket web gagal');
