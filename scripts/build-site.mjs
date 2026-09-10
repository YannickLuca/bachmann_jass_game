/**
 * Baut die statische Web-App aus public/ in einen Ausgabeordner (Standard: dist/).
 *
 * Dabei wird der Cachename des Service Workers aus einem Hash der App-Dateien
 * gesetzt. Ohne diesen Bump serviert eine bereits installierte PWA nach einem
 * Deploy weiterhin die alte Version aus ihrem Cache.
 *
 * Usage: node scripts/build-site.mjs [ausgabeordner]
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.resolve(root, process.argv[2] || 'dist');

const HASHED_FILES = [
  'index.html',
  'style.css',
  'app.js',
  'ai.js',
  'game-engine.js',
  'manifest.webmanifest',
];

function buildVersion() {
  const hash = crypto.createHash('sha256');
  for (const file of HASHED_FILES) {
    // Zeilenenden normalisieren, damit die Version unter Windows und Linux
    // identisch ausfaellt.
    const content = fs.readFileSync(path.join(publicDir, file), 'utf8').split('\r\n').join('\n');
    hash.update(content, 'utf8');
  }
  return hash.digest('hex').slice(0, 10);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

copyDir(publicDir, outDir);

// Verhindert, dass GitHub Pages die Ausgabe als Jekyll-Seite behandelt.
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

const version = buildVersion();
const swPath = path.join(outDir, 'service-worker.js');
const serviceWorker = fs.readFileSync(swPath, 'utf8');
const bumped = serviceWorker.replace(
  /const CACHE_NAME = '[^']*';/,
  `const CACHE_NAME = 'bachmann-jass-${version}';`
);

if (bumped === serviceWorker) {
  throw new Error('CACHE_NAME konnte im Service Worker nicht gesetzt werden.');
}
fs.writeFileSync(swPath, bumped);

console.log(`Gebaut nach ${path.relative(root, outDir)}/ (Cache-Version bachmann-jass-${version}).`);
