// Neon Coast — Cover Studio, entry program for gta6-cover-art-01.
//
// This program runs on Node 22 with only the standard library. It gathers
// the entry from this repository and lays it out for the grader: the web app
// under app/, the screenshots under screenshots/, and a dossier.json that
// describes both, built by the vendored make.fun helper.
//
// Run it outside the grader like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader the output directory is /output instead.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destination, { recursive: true });
cpSync(join(repoRoot, 'app'), join(destination, 'app'), { recursive: true });

// Refuse to hand in a broken entry: the app must have its front page.
if (!existsSync(join(destination, 'app', 'index.html'))) {
  throw new Error('entry is missing app/index.html; refusing to write a dossier');
}

const shotsIn = join(repoRoot, 'screenshots');
const shotsOut = join(destination, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
if (existsSync(shotsIn)) {
  cpSync(shotsIn, shotsOut, { recursive: true });
}

writeFileSync(
  join(destination, 'dossier.json'),
  buildDossier(destination, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Coast entry written to ${destination}`);
