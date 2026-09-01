// fetch-boot-check.mjs -- the acceptance bar written after the 0.6.x
// black-screen night: boot FETCH the way a player does (real click, no
// ?test=1) and prove the world is on screen AND the skull is visible in the
// player's own hands while play is running. 0.6.1 passed 74 counter-based
// checks and shipped a game you could hear but not see, because every suite
// booted ?test=1 -- which skips the shader warmup -- and none of them ever
// looked at a pixel.
//
// 2026-08-14, THE NEW OPENING: the game now boots EMPTY-HANDED by authored
// design (you wake without the skull; it arrives when the bedroom bell is
// rung), and the opening fade lengthened 2.4s -> ~4s. Two consequences for
// this instrument, neither a weakening:
//   1. The old fixed 400-sample cap exhausted INSIDE the longer fade, so the
//      tail measured authored darkness and cried black on a lit room. The
//      sampler now runs until readout and the play phase waits out the fade.
//   2. "Skull visible in hand" is now asserted in a second phase: after the
//      real-click boot proves the LIT, skull-less room (the new truth), the
//      arrival is completed through the game's own canonical contract
//      (__FETCH.teleport auto-completes it -- the documented post-arrival
//      state for every instrument), and the held-pass pixels are asserted
//      with the ORIGINAL thresholds. The 0.6.1 disease stays caught.
//
// The trap that produced a fake fifth bug last time: with preserveDrawingBuffer
// false (the real, non-test renderer), reading the canvas OUTSIDE the frame
// task is black by construction. So this wraps game.render and grabs the pixels
// inside the same task, immediately after the draw.
//
//   node build/qa/fetch-boot-check.mjs <url>
import { createRequire } from 'node:module';
// playwright lives in build/node_modules, which ESM will not resolve from the
// repo root; NODE_PATH does not apply to ESM either.
const require = createRequire(import.meta.url);
const { chromium } = require('../node_modules/playwright');

const url = process.argv[2] || 'http://localhost:4173/fetch/';
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=d3d11',
    '--enable-gpu-rasterization', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e?.message || e)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__FETCH?.ready === true, null, { timeout: 90000 });
// The polished cold boot intentionally keeps Wake up disabled until the Game
// constructor has returned and its real click listener exists. __FETCH is
// exposed at the tail of that constructor, so waiting on the API alone leaves
// a tiny race in which a synthetic click can land on the still-disabled
// control. A player cannot click a disabled button; test the same contract.
await page.waitForFunction(() => {
  const start = document.querySelector('#title [data-action="start"]');
  return start && start.disabled === false;
}, null, { timeout: 90000 });

// Install the in-frame sampler BEFORE starting, then start through the real
// title click rather than the debug API.
await page.evaluate(() => {
  const g = window.__game;
  window.__boot = { samples: [], t0: performance.now(), titleFrames: 0, presentation: null };
  // Count live title frames until entry. This distinguishes the new intentional
  // shader-link gate (painted HTML stays responsive) from the old multi-second
  // main-thread freeze, even though both delay the first WebGL frame.
  const titleBeat = () => {
    if (!g.started) {
      window.__boot.titleFrames++;
      requestAnimationFrame(titleBeat);
    }
  };
  requestAnimationFrame(titleBeat);
  const realRender = g.render.bind(g);
  g.render = function patched(...args) {
    const out = realRender(...args);
    const b = window.__boot;
    if (b.samples.length < 2400) {
      const c = g.renderer.domElement;
      const cv = document.createElement('canvas');
      cv.width = 160; cv.height = 100;
      const ctx = cv.getContext('2d');
      ctx.drawImage(c, 0, 0, cv.width, cv.height);   // same task as the draw
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let lit = 0, sum = 0;
      // hands region: bottom-centre sixth of the frame, where the held skull is
      let handLit = 0, handMax = 0, handN = 0;
      for (let y = 0; y < cv.height; y++) {
        for (let x = 0; x < cv.width; x++) {
          const i = (y * cv.width + x) * 4;
          const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
          sum += v;
          if (v > 24) lit++;
          if (y > cv.height * 0.62 && x > cv.width * 0.42 && x < cv.width * 0.88) {
            handN++; if (v > 60) handLit++; if (v > handMax) handMax = v;
          }
        }
      }
      b.samples.push({
        ms: +(performance.now() - b.t0).toFixed(0),
        meanV: +(sum / (cv.width * cv.height)).toFixed(2),
        litFrac: +(lit / (cv.width * cv.height)).toFixed(4),
        handLitFrac: +(handLit / Math.max(1, handN)).toFixed(4),
        handMax,
      });
    }
    return out;
  };
});

// real start: click the title's start control
await page.evaluate(() => {
  const el = document.querySelector('#title [data-action="start"]') || document.querySelector('#title');
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const title = document.querySelector('#title');
  const mark = title?.querySelector('.return-mark');
  const markStyle = mark ? getComputedStyle(mark) : null;
  window.__boot.presentation = {
    waking: !!title?.classList.contains('waking'),
    buttonDisabled: !!document.querySelector('#title [data-action="start"]')?.disabled,
    titleVisible: !title?.classList.contains('hidden'),
    markAnimation: markStyle?.animationName || 'none',
    markPlayState: markStyle?.animationPlayState || 'paused',
  };
});

// PHASE 1 -- the real-click boot: the cold driver's asynchronous link queue is
// deliberately allowed to vary, but it must hand over inside the acceptance
// ceiling. Start the authored ~4s fade clock at that real hand-over, not at the
// click; a fixed post-click sleep made this check fail early precisely when the
// title remained responsive enough for its JavaScript timer to fire on time.
await page.waitForFunction(() => window.__game?.started === true, null, {
  timeout: 18000,
  polling: 50,
});
await page.waitForTimeout(5200);
for (let i = 0; i < 8; i++) {
  await page.keyboard.down('KeyW'); await page.waitForTimeout(260); await page.keyboard.up('KeyW');
  await page.mouse.move(640 + i * 12, 400);
  await page.waitForTimeout(180);
}
await page.waitForTimeout(1000);

const r = await page.evaluate(() => {
  const s = window.__boot.samples;
  const g = window.__game;
  // when did the world first appear at all?
  const firstLit = s.find((x) => x.litFrac > 0.10);
  // The walker has no carried light in the new opening, so wherever it ends
  // up nose-first can be honestly dark. The claim that matters is SUSTAINED:
  // after the ~4s authored fade, the frame held a lit world for a real
  // stretch of play. Longest contiguous lit span, post-fade:
  let span = 0, best = 0;
  for (const x of s) {
    if (x.ms < 4500) continue;
    if (x.litFrac > 0.10) { span++; if (span > best) best = span; } else span = 0;
  }
  return {
    frames: s.length,
    started: g.started,
    act: g.act,
    skullMode: g.skull.mode,
    arrivalState: g.bedroomArrival ? g.bedroomArrival.state : null,
    msToWorld: firstLit ? firstLit.ms : null,
    litSpanFrames: best,
    titleFrames: window.__boot.titleFrames,
    presentation: window.__boot.presentation,
    entryLatencyMs: window.__FETCH.warm().entryLatencyMs,
  };
});

// PHASE 2 -- the held pass (the 0.6.1 regression this tool was born for):
// complete the arrival through the game's canonical contract, then assert the
// skull draws in the hands with the ORIGINAL thresholds.
await page.evaluate(() => { window.__boot.mark = window.__boot.samples.length; window.__FETCH.teleport('bedroom'); });
await page.waitForTimeout(900);
for (let i = 0; i < 4; i++) {
  await page.keyboard.down('KeyW'); await page.waitForTimeout(220); await page.keyboard.up('KeyW');
  await page.mouse.move(640 - i * 10, 402);
  await page.waitForTimeout(160);
}
await page.waitForTimeout(800);

const h = await page.evaluate(() => {
  const b = window.__boot;
  const g = window.__game;
  const tail = b.samples.slice(b.mark).slice(-45);
  const avg = (k) => +(tail.reduce((n, x) => n + x[k], 0) / Math.max(1, tail.length)).toFixed(4);
  return {
    heldFrames: b.samples.length - b.mark,
    skullMode: g.skull.mode,
    tailHandLitFrac: avg('handLitFrac'),
    tailHandMax: Math.max(0, ...tail.map((x) => x.handMax)),
  };
});

await browser.close();

const fail = [];
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fail.push(msg); };
console.log(JSON.stringify(r, null, 2));
ok(r.frames > 60, `render ran (${r.frames} sampled frames)`);
ok(r.started === true, 'the real title click started the game');
ok(r.presentation?.waking && r.presentation?.buttonDisabled && r.presentation?.titleVisible,
  'the title visibly acknowledges the press while the world warms');
ok(r.presentation?.markAnimation === 'waking-turn' && r.presentation?.markPlayState === 'running',
  `the loading mark stays animated (${r.presentation?.markAnimation}, ${r.presentation?.markPlayState})`);
ok(r.msToWorld < 2000 || r.titleFrames > 12,
  `the title remains responsive during a gated start (${r.titleFrames} frames)`);
// Full KHR shader-link settlement is now deliberately paid behind that live
// HTML title so the first WebGL draw cannot recreate the old 7-9 second tab
// freeze. Keep a real ceiling, with headroom above the measured cold-driver
// queue, while separately proving the wait itself is visibly alive above.
ok(r.msToWorld !== null && r.msToWorld < 18000, `world on screen (${r.msToWorld}ms)`);
ok(r.litSpanFrames > 90, `a lit world holds on screen while playing (${r.litSpanFrames} contiguous frames post-fade)`);
ok(r.act !== 'bedroom' || r.skullMode === 'gone', `the new opening boots empty-handed (mode ${r.skullMode}, arrival ${r.arrivalState})`);
console.log(JSON.stringify(h, null, 2));
ok(h.heldFrames > 30, `held-pass phase rendered (${h.heldFrames} frames)`);
ok(h.skullMode === 'held', `arrival contract grants the skull (mode ${h.skullMode})`);
ok(h.tailHandMax > 90, `something bright in the hands region (max ${h.tailHandMax})`);
ok(h.tailHandLitFrac > 0.02, `the skull is visible in hand while playing (handLitFrac ${h.tailHandLitFrac})`);
ok(errors.length === 0, `zero page/console errors${errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''}`);
console.log(fail.length ? `\nBOOT CHECK FAILED (${fail.length})` : '\nBOOT CHECK PASSED');
process.exit(fail.length ? 1 : 0);
