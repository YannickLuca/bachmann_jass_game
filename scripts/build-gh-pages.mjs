/**
 * Build script for GitHub Pages deployment.
 * Copies the static web app into docs/ so GitHub Pages can serve it directly.
 * Also writes .nojekyll so Pages stays in plain static-site mode.
 *
 * Usage: node scripts/build-gh-pages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');

if (fs.existsSync(docsDir)) {
  fs.rmSync(docsDir, { recursive: true });
}
fs.mkdirSync(docsDir);

copyDir(path.join(root, 'public'), docsDir);
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');

console.log('Built to docs/ - push to GitHub and enable Pages from the docs/ folder.');

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
