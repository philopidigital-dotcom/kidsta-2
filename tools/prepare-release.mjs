import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(project, 'dist');
const config = JSON.parse(readFileSync(join(project, 'vercel.json'), 'utf8'));
delete config.buildCommand;
delete config.outputDirectory;
writeFileSync(join(dist, 'vercel.json'), JSON.stringify(config, null, 2) + '\n');
copyFileSync(join(project, 'deploy.vercelignore'), join(dist, '.vercelignore'));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  statSync(join(dir, entry.name)).isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const files = walk(dist).filter((file) => relative(dist, file) !== 'release-manifest.json').sort().map((file) => ({
  path: relative(dist, file).replaceAll('\\', '/'),
  bytes: statSync(file).size,
  sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
}));
writeFileSync(join(dist, 'release-manifest.json'), JSON.stringify({ version: 1, files }, null, 2) + '\n');
console.log(`Paket rilis siap di dist, ${files.length} berkas tercatat dalam manifest SHA-256.`);
