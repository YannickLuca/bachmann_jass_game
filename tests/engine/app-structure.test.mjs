import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as engine from '../../public/game-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('public/index.html');
const app = read('public/app.js');
const serviceWorker = read('public/service-worker.js');

const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));

test('Jede getElementById-Referenz aus app.js existiert im HTML', () => {
  const missing = [...app.matchAll(/getElementById\('([^']+)'\)/g)]
    .map((match) => match[1])
    .filter((id) => !htmlIds.has(id));

  assert.deepEqual(missing, [], `Fehlende IDs im HTML: ${missing.join(', ')}`);
});

test('Die dynamisch aufgebauten IDs decken alle Positionen und Stapel ab', () => {
  ['left', 'top', 'right', 'bottom'].forEach((position) => {
    ['zone', 'hand', 'pname', 'badge', 'trick-slot'].forEach((prefix) => {
      assert.ok(htmlIds.has(`${prefix}-${position}`), `${prefix}-${position} fehlt im HTML`);
    });
  });

  [0, 1].forEach((pileId) => {
    ['pile', 'pile-label', 'pile-deck', 'pile-count'].forEach((prefix) => {
      assert.ok(htmlIds.has(`${prefix}-${pileId}`), `${prefix}-${pileId} fehlt im HTML`);
    });
  });
});

test('app.js importiert nur Symbole, die die Module wirklich exportieren', async () => {
  const ai = await import('../../public/ai.js');
  const modules = { './game-engine.js': engine, './ai.js': ai };
  let checkedBlocks = 0;

  for (const [specifier, module] of Object.entries(modules)) {
    const marker = `} from '${specifier}';`;
    const end = app.indexOf(marker);
    assert.ok(end > 0, `Import-Block fuer ${specifier} fehlt in app.js`);

    const start = app.lastIndexOf('import {', end);
    assert.ok(start >= 0, `Import-Block fuer ${specifier} ist unvollstaendig`);

    const imported = app.slice(start + 'import {'.length, end)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    assert.ok(imported.length > 0, `Import-Block fuer ${specifier} ist leer`);

    const unknown = imported.filter((name) => !(name in module));
    assert.deepEqual(unknown, [], `Unbekannte Exporte aus ${specifier}: ${unknown.join(', ')}`);
    checkedBlocks += 1;
  }

  assert.equal(checkedBlocks, 2);
});

test('Die Engine kennt keine Strategie und die Strategie keine DOM-Zugriffe', () => {
  const gameEngine = read('public/game-engine.js');
  const ai = read('public/ai.js');

  assert.ok(!gameEngine.includes('aiChooseCard'), 'Strategie gehoert nicht in die Regelengine');
  assert.ok(!ai.includes('document.'), 'Die Strategie darf nicht auf das DOM zugreifen');
  assert.ok(!ai.includes('fetch('), 'Die Strategie darf keine Netzwerkaufrufe machen');
  assert.ok(!ai.includes('XMLHttpRequest'), 'Die Strategie darf keine Netzwerkaufrufe machen');
});

test('Alle Spielarten haben einen Knopf in der Spielartwahl', () => {
  engine.ROUND_MODE_OPTIONS.forEach((mode) => {
    assert.ok(html.includes(`data-mode="${mode}"`), `Knopf fuer ${mode} fehlt`);
  });
  assert.ok(html.includes('id="btn-push"'), 'Schieben-Knopf fehlt');
  assert.ok(html.includes('id="btn-weis-skip"'), 'Knopf fuer den Weis-Verzicht fehlt');
  assert.ok(html.includes('id="setup-target-section"'), 'Auswahl des Punkteziels fehlt');
});

test('Die Gegner-Stapel sitzen im HTML ueber den Namensschildern', () => {
  ['left', 'top', 'right'].forEach((zone) => {
    const section = html.match(new RegExp(`<section id="zone-${zone}"[\\s\\S]*?</section>`));
    assert.ok(section, `Zone ${zone} fehlt im HTML`);

    const anchorIndex = section[0].indexOf(`id="pile-anchor-${zone}"`);
    const labelIndex = section[0].indexOf('class="player-label"');
    assert.ok(anchorIndex >= 0, `Stapel-Anker fuer ${zone} fehlt`);
    assert.ok(labelIndex >= 0, `Namensschild fuer ${zone} fehlt`);
    assert.ok(anchorIndex < labelIndex, `Stapel-Anker fuer ${zone} steht nicht vor dem Namensschild`);
  });
});

test('Der Service Worker cacht nur Dateien, die es wirklich gibt', () => {
  const coreAssets = [...serviceWorker.matchAll(/'\.\/([^']+)'/g)]
    .map((match) => match[1])
    .filter((entry) => entry.includes('.'));

  coreAssets.forEach((asset) => {
    assert.ok(fs.existsSync(path.join(root, 'public', asset)), `${asset} fehlt in public/`);
  });

  engine.createDeck().forEach((card) => {
    const file = path.join(root, 'public', engine.cardImagePath(card));
    assert.ok(fs.existsSync(file), `Kartenbild fehlt: ${engine.cardImagePath(card)}`);
  });
});

test('Der Build setzt eine eigene Cache-Version', () => {
  const buildScript = read('scripts/build-site.mjs');
  assert.ok(buildScript.includes('CACHE_NAME'), 'Der Build muss den Cachenamen setzen');
  assert.ok(buildScript.includes(String.raw`split('\r\n')`), 'Der Hash muss Zeilenenden normalisieren');

  const built = path.join(root, 'dist/service-worker.js');
  if (!fs.existsSync(built)) {
    return;
  }

  const deployed = fs.readFileSync(built, 'utf8').match(/const CACHE_NAME = '([^']+)'/);
  assert.ok(deployed, 'dist/service-worker.js hat keinen Cachenamen');
  assert.notEqual(
    deployed[1],
    serviceWorker.match(/const CACHE_NAME = '([^']+)'/)[1],
    'Der Build muss eine gehashte Cache-Version tragen, nicht die Entwicklungsversion'
  );
});
