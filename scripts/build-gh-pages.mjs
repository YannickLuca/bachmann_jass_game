/**
 * Build script for GitHub Pages deployment.
 * Copies public/ and assets/ into docs/ so GitHub Pages can serve the game.
 *
 * Usage:  node scripts/build-gh-pages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root    = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');

// Clear docs/
if (fs.existsSync(docsDir)) fs.rmSync(docsDir, { recursive: true });
fs.mkdirSync(docsDir);

// Copy public/ → docs/
copyDir(path.join(root, 'public'), docsDir);

// Copy assets/ → docs/assets/
copyDir(path.join(root, 'assets'), path.join(docsDir, 'assets'));

console.log('✓ Built to docs/  –  push to GitHub and enable Pages from the docs/ folder.');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
