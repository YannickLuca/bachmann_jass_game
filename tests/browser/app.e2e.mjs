/**
 * End-to-End-Test im echten Browser.
 *
 * Startet den lokalen Server, faehrt Edge (oder Chrome) headless ueber das
 * DevTools-Protokoll und spielt eine Runde durch. Geprueft werden Bedienung,
 * Speicherstand und das Layout in mehreren Fenstergroessen.
 *
 * Usage: npm run test:e2e
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findBrowser, launchBrowser } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.PORT) || 3123;
const BASE = `http://127.0.0.1:${PORT}/`;

const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' -> ' + detail : ''}`);
}

async function startServer() {
  const child = spawn(process.execPath, [path.join(root, 'src/server.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}api/health`);
      if (response.ok) {
        return child;
      }
    } catch (error) {
      // Server startet noch
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  child.kill();
  throw new Error('Der lokale Server ist nicht gestartet.');
}

async function reachHumanTurn(page) {
  for (let i = 0; i < 300; i += 1) {
    if (await page.visible('#trump-controls')) {
      await page.click('.trump-btn[data-mode="rosen"]');
      continue;
    }
    if (await page.visible('#weis-controls')) {
      await page.click('#btn-weis');
      continue;
    }
    if (await page.visible('#round-end-controls')) {
      return false;
    }
    if (await page.evaluate('return document.querySelectorAll("#hand-bottom .card-face.playable").length > 0;')) {
      return true;
    }
    await page.evaluate('document.getElementById("table-area").click(); return true;');
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('Der Mensch kam nicht an die Reihe.');
}

async function startGame(page, { variant = 'schieber', speed = 'schnell', difficulty = 'schwer' } = {}) {
  await page.goto(BASE);
  await page.evaluate('localStorage.clear(); return true;');
  await page.goto(BASE);
  await page.click(`.variant-card[data-variant="${variant}"]`);
  await page.click(`[data-speed="${speed}"]`);
  await page.click(`[data-difficulty="${difficulty}"]`);
  await page.click('#btn-start');
  await page.waitFor('!document.getElementById("screen-game").classList.contains("hidden")');
}

const VIEWPORTS = [
  { name: 'Desktop 1280x900', w: 1280, h: 900, mobile: false },
  { name: 'Laptop 1440x780', w: 1440, h: 780, mobile: false },
  { name: 'iPad 834x1112', w: 834, h: 1112, mobile: true },
  { name: 'iPhone 390x844', w: 390, h: 844, mobile: true },
  { name: 'iPhone SE 375x667', w: 375, h: 667, mobile: true },
];

if (!findBrowser()) {
  console.log('Kein Chromium-Browser gefunden - E2E-Test wird uebersprungen.');
  process.exit(0);
}

const server = await startServer();
const page = await launchBrowser('about:blank');

try {
  await page.setViewport(1280, 900, false);
  await page.goto(BASE);
  check('Startseite laedt ohne JS-Fehler', page.consoleErrors.length === 0, page.consoleErrors.join(' | '));

  // --- Regel-Screen (M4.4) ---
  await page.click('#btn-rules-setup');
  check('Regeln sind vom Homescreen erreichbar', await page.visible('#rules-sheet'));
  const trumpValues = await page.evaluate(`
    const table = document.querySelector('#rules-sheet-body table');
    const row = [...table.querySelectorAll('tbody tr')].find((r) => r.cells[0].textContent === 'Trumpf');
    return [...row.cells].slice(1).map((c) => Number(c.textContent));
  `);
  check(
    'Kartenwerte stammen aus der Engine',
    trumpValues.includes(20) && trumpValues.includes(14) && trumpValues.reduce((a, b) => a + b, 0) === 62,
    `Trumpfreihe summiert ${trumpValues.reduce((a, b) => a + b, 0)}`
  );
  await page.click('#btn-close-rules');
  check('Regel-Dialog schliesst', !(await page.visible('#rules-sheet')));

  // --- Partie und Bedienung ---
  await startGame(page);
  check('Tempo-Knopf spiegelt die Wahl (M4.2)', (await page.text('#btn-speed')) === 'Tempo: Schnell');

  const badges = await page.evaluate(
    'return ["left","top","right","bottom"].map(p => document.getElementById("badge-" + p).textContent.trim()).filter(Boolean);'
  );
  check('Geber- und Partner-Abzeichen (M4.6)', badges.includes('Geber') && badges.includes('Partner'), JSON.stringify(badges));

  const cardInfo = await page.evaluate(`
    const cards = [...document.querySelectorAll('#hand-bottom .card-face')];
    return {
      tags: [...new Set(cards.map((c) => c.tagName))],
      labelled: cards.every((c) => c.getAttribute('aria-label')),
      count: cards.length,
    };
  `);
  check('Handkarten sind bedienbare Buttons (M4.5)', cardInfo.tags.length === 1 && cardInfo.tags[0] === 'BUTTON');
  check('Jede Handkarte hat ein aria-label (M4.5)', cardInfo.labelled && cardInfo.count === 9);

  await reachHumanTurn(page);
  const focusable = await page.evaluate(`
    const card = document.querySelector('#hand-bottom .card-face.playable');
    card.focus();
    return document.activeElement === card;
  `);
  check('Spielbare Karten sind per Tastatur fokussierbar (M4.5)', focusable);

  // --- Runde zu Ende spielen ---
  for (let i = 0; i < 400; i += 1) {
    if (await page.visible('#round-end-controls')) {
      break;
    }
    if (await page.evaluate('return document.querySelectorAll("#hand-bottom .card-face.playable").length > 0;')) {
      await page.click('#hand-bottom .card-face.playable');
    } else {
      await page.evaluate('document.getElementById("table-area").click(); return true;');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  check('Runde laesst sich zu Ende spielen', await page.visible('#round-end-controls'));

  // --- Jasstafel (M4.3) ---
  await page.click('#btn-scoreboard');
  const board = await page.evaluate(`
    const rows = document.querySelectorAll('#scoreboard-body tbody tr');
    return { rows: rows.length, text: document.getElementById('scoreboard-body').textContent };
  `);
  check('Jasstafel listet die gespielte Runde (M4.3)', board.rows === 1, `Zeilen: ${board.rows}`);
  check('Jasstafel nennt die Spielart', board.text.includes('Rosen'));
  await page.click('#btn-close-scoreboard');

  // --- Speicherstand (M4.1) ---
  const saved = await page.evaluate('return JSON.parse(localStorage.getItem("bachmann-jass:game:v1") || "null");');
  check('Spielstand liegt im localStorage', Boolean(saved?.game));
  await page.goto(BASE);
  check('Partie fortsetzen wird angeboten', await page.visible('#btn-resume'));
  await page.click('#btn-resume');
  await page.waitFor('!document.getElementById("screen-game").classList.contains("hidden")');
  check('Fortgesetzte Partie rendert', (await page.evaluate('return document.querySelectorAll("#log-messages .log-line").length;')) > 0);

  // --- Layout ueber alle Fenstergroessen ---
  for (const viewport of VIEWPORTS) {
    await page.setViewport(viewport.w, viewport.h, viewport.mobile);
    await startGame(page);
    await reachHumanTurn(page);

    const problems = await page.evaluate(`
      const rect = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const bar = rect('.top-bar');
      const hand = rect('#hand-bottom');
      const zoneTop = rect('#zone-top');
      const log = rect('.log-panel');
      const problems = [];
      if (hand.bottom > vh + 2) { problems.push('Hand ragt ' + Math.round(hand.bottom - vh) + 'px unter den Rand'); }
      if (zoneTop && zoneTop.top < bar.bottom - 2) { problems.push('Gegnerzone ueberlappt die Topbar'); }
      if (log && log.height > vh * 0.25) { problems.push('Verlauf frisst ' + Math.round(log.height) + 'px'); }
      if (document.documentElement.scrollWidth > vw + 2) { problems.push('horizontaler Overflow'); }
      return problems;
    `);
    check(`Layout ohne Overflow: ${viewport.name}`, problems.length === 0, problems.join('; '));
  }

  check('Keine JS-Fehler im ganzen Durchlauf', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 3).join(' | '));
} finally {
  await page.close();
  server.kill();
}

const failed = results.filter((entry) => !entry.ok);
console.log(`\n${results.length - failed.length}/${results.length} Pruefungen bestanden`);
process.exit(failed.length === 0 ? 0 : 1);
