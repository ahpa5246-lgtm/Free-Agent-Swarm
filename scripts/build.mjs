import { cp, mkdir, rm, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await copyFile(resolve(root, 'index.html'), resolve(dist, 'index.html'));
await cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true });
// The live provider runner is server-only and must never ship in the static PWA.
await rm(resolve(dist, 'src/real'), { recursive: true, force: true });
await cp(resolve(root, 'public'), dist, { recursive: true });
console.log('Static PWA built in dist/ — no external dependencies.');
