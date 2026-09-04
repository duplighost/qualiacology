/**
 * Serve the game and drive Chrome through the browser regression page.
 * Run: node tests/run-browser.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 8765;
const CDP = 9333;
const CHROME = [
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(p => fs.existsSync(p));

if (!CHROME) {
  console.error('No Chrome/Edge found');
  process.exit(2);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end(); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hellspindle-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-extensions',
  '--disable-popup-blocking',
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`,
  `http://127.0.0.1:${PORT}/tests/browser-regression.html`
], { stdio: 'pipe' });

let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += d.toString(); });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function jsonList() {
  const res = await fetch(`http://127.0.0.1:${CDP}/json/list`);
  return res.json();
}

async function waitTarget(timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const list = await jsonList();
      const page = list.find(t => t.type === 'page' && /browser-regression/.test(t.url || '')) || list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (_) {}
    await sleep(200);
  }
  throw new Error('no CDP page target\n' + chromeErr.slice(-800));
}

function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('open', () => resolve({
      send(method, params = {}) {
        const n = ++id;
        return new Promise((res, rej) => {
          pending.set(n, { res, rej });
          ws.send(JSON.stringify({ id: n, method, params }));
        });
      },
      close() { ws.close(); }
    }));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
  });
}

let exitCode = 1;
try {
  const target = await waitTarget();
  const client = await cdp(target.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  const deadline = Date.now() + 25000;
  let payload = null;
  while (Date.now() < deadline) {
    const ev = await client.send('Runtime.evaluate', {
      expression: 'window.__RESULTS__ ? JSON.stringify(window.__RESULTS__) : null',
      returnByValue: true
    });
    const value = ev.result && ev.result.value;
    if (value) {
      payload = JSON.parse(value);
      break;
    }
    await sleep(250);
  }

  const shotDir = path.join(ROOT, 'tests', 'shots');
  fs.mkdirSync(shotDir, { recursive: true });
  const shot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(shotDir, 'browser-regression.png'), Buffer.from(shot.data, 'base64'));

  if (!payload) throw new Error('browser tests did not finish');
  console.log(payload.results.map(r => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' — ' + r.detail : '')).join('\n'));
  console.log(`\n${payload.passed} passed, ${payload.failed} failed`);
  if (payload.errors && payload.errors.length) console.log('page errors:', payload.errors);
  exitCode = payload.failed ? 1 : 0;
  client.close();
} catch (err) {
  console.error(err);
  exitCode = 1;
} finally {
  chrome.kill();
  server.close();
  await sleep(400);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
  process.exit(exitCode);
}
