/**
 * Build script for GitHub Pages deployment.
 * Copies the static web app into docs/ so GitHub Pages can serve it directly.
 * Also writes .nojekyll so Pages stays in plain static-site mode.
 *
 * Der Service-Worker-Cachename wird dabei aus dem Inhalt der App-Dateien abgeleitet.
 * Ohne diesen Bump serviert eine installierte PWA nach einem Deploy weiterhin die
 * alte Version aus ihrem Cache.
 *
 * Usage: node scripts/build-gh-pages.mjs [--check]
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const docsDir = path.join(root, 'docs');
const checkOnly = process.argv.includes('--check');

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
    // Zeilenenden normalisieren: sonst faellt die Version unter Windows und
    // Linux unterschiedlich aus und die CI meldet docs/ faelschlich als veraltet.
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

function build(targetDir) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  copyDir(publicDir, targetDir);
  fs.writeFileSync(path.join(targetDir, '.nojekyll'), '');

  const version = buildVersion();
  const swPath = path.join(targetDir, 'service-worker.js');
  const sw = fs.readFileSync(swPath, 'utf8');
  const bumped = sw.replace(
    /const CACHE_NAME = '[^']*';/,
    `const CACHE_NAME = 'bachmann-jass-${version}';`
  );

  if (bumped === sw) {
    throw new Error('CACHE_NAME konnte im Service Worker nicht gesetzt werden.');
  }
  fs.writeFileSync(swPath, bumped);

  return version;
}

function collectFiles(dir, base = dir, files = new Map()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, base, files);
    } else {
      files.set(path.relative(base, full).split(path.sep).join('/'), fs.readFileSync(full));
    }
  }
  return files;
}

if (checkOnly) {
  // Guard fuer die CI: docs/ muss dem aktuellen Stand von public/ entsprechen.
  const tempDir = fs.mkdtempSync(path.join(root, '.docs-check-'));
  try {
    build(tempDir);
    const expected = collectFiles(tempDir);
    const actual = fs.existsSync(docsDir) ? collectFiles(docsDir) : new Map();
    const problems = [];

    for (const [file, content] of expected) {
      if (!actual.has(file)) {
        problems.push(`fehlt in docs/: ${file}`);
      } else if (!content.equals(actual.get(file))) {
        problems.push(`veraltet in docs/: ${file}`);
      }
    }
    for (const file of actual.keys()) {
      if (!expected.has(file)) {
        problems.push(`ueberzaehlig in docs/: ${file}`);
      }
    }

    if (problems.length > 0) {
      console.error('docs/ ist nicht aktuell:');
      problems.slice(0, 20).forEach((problem) => console.error(`  - ${problem}`));
      if (problems.length > 20) {
        console.error(`  ... und ${problems.length - 20} weitere`);
      }
      console.error('\nBitte "npm run deploy" ausfuehren und das Ergebnis committen.');
      process.exit(1);
    }
    console.log('docs/ ist aktuell.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
} else {
  const version = build(docsDir);
  console.log(`Built to docs/ (Cache-Version bachmann-jass-${version}).`);
  console.log('Push to GitHub - Pages liefert den Ordner /docs aus.');
}
