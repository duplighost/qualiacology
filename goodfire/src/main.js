// GOODFIRE main.js — boot, input latch, fixed-step loop, season flow.
// title → lookout → fire → ledger → interlude → lookout … → the Crown → winter → epilogue.

import { DT, GRID } from './canon.js';
import { buildMap, ZONE_NAMES } from './map.js';
import { createFireSession } from './game.js';
import { createScreens, RX_WINDOW } from './screens.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { FIRES, RX_UNITS } from './season.js';
import { LEDGER_INTROS } from './radio.js';
import { buildSeasonClose, RX_MEDAL } from './ledger.js';
import { freshSave, loadGame, saveGame, takeSnapshot, restoreSnapshot, countCompleted } from './save.js';
import { installHarness } from './harness.js';

const container = document.getElementById('game');
const bootEl = document.getElementById('boot');
const viewport = { w: window.innerWidth, h: window.innerHeight };

const mapData = buildMap();
const audio = createAudio();
// renderer binds one sim at construction — rebuild it per session inside a host div
const renderHost = document.createElement('div');
renderHost.style.cssText = 'position:absolute;inset:0;';
container.appendChild(renderHost);
let renderer = null;
function attachRenderer(sim) {
  renderHost.innerHTML = '';
  renderer = createRenderer(renderHost, sim, mapData);
}
const screens = createScreens(container, viewport);

// ---- input latch ----
const input = {
  keys: new Set(), pressed: new Set(), lmb: false, rmb: false,
  lmbPressed: false, rmbPressed: false, wheel: 0,
  mouseScreen: { x: viewport.w / 2, y: viewport.h / 2 }, mouseWorld: { x: 160, y: 160 },
};
// warden consumes e.code verbatim ('KeyW','Space','KeyG','Escape'...) — latch codes
window.addEventListener('keydown', (e) => {
  if (!e.repeat) { input.keys.add(e.code); input.pressed.add(e.code); }
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  app.screenInput({ type: 'key', key: e.key });
});
window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });
window.addEventListener('mousemove', (e) => { input.mouseScreen.x = e.clientX; input.mouseScreen.y = e.clientY; });
window.addEventListener('mousedown', (e) => {
  if (e.button === 0) { input.lmb = true; input.lmbPressed = true; }
  if (e.button === 2) { input.rmb = true; input.rmbPressed = true; }
  app.screenInput({ type: 'mouse', button: e.button });
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) input.lmb = false;
  if (e.button === 2) input.rmb = false;
});
window.addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); }, { passive: true });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('resize', () => {
  viewport.w = window.innerWidth; viewport.h = window.innerHeight;
  if (renderer && renderer.resize) renderer.resize();
  screens.resize(viewport.w, viewport.h);
  if (app.session) app.session.camera.resize(viewport.w, viewport.h);
});

// ---- the app ----
const app = {
  save: loadGame(),
  session: null, screen: null, sceneName: 'boot',
  audio, paused: false, timescale: 1,

  screenInput(ev) { if (this.screen && this.screen.input) this.screen.input(ev); },

  setScreen(s) {
    if (this.screen && this.screen.exit) this.screen.exit();
    this.screen = s;
    this.sceneName = s ? s.name : 'session';
    clearEdges(); // the key that dismissed a ceremony must not also fire in the scene behind it
  },

  // ---- flow ----
  toTitle() {
    this.endSession();
    this.startAmbient();
    this.setScreen(screens.titleScreen(this));
  },
  newSeason() {
    this.save = freshSave();
    saveGame(this.save);
    this.startFire(0);
  },
  continueSeason() {
    // the owed morning outranks the hub: a season quit at a ledger still gets its interlude
    if (typeof this.save.pendingInterlude === 'number') return this.startInterlude(this.save.pendingInterlude);
    this.openLookout();
  },
  openLookout(tab) {
    this.endSession();
    if (!this.save) this.save = freshSave();
    // an old save orphaned before pendingInterlude existed can still close the season:
    // seven pages written and no interlude owed = the mountain is done talking. (Checked
    // AFTER the pending route above, or an owed I6 would lose its first snow.)
    if (!this.save.seasonClosed && typeof this.save.pendingInterlude !== 'number' &&
        countCompleted(this.save) === FIRES.length) {
      this.save.seasonClosed = true;
      saveGame(this.save);
    }
    this.startAmbient();
    this.setScreen(screens.lookoutScreen(this, tab));
  },
  toLookout() {
    if (this.save.seasonClosed && !this.save.epilogueSeen) this.openLookout();
    else this.openLookout();
  },

  startAmbient() {
    this.endSession();
    this.session = createFireSession({
      mapData, save: this.save || freshSave(), mode: 'ambient', audio,
      viewport, onClose: () => {},
    });
    attachRenderer(this.session.sim);
    audio.attach && audio.attach(this.session.sim);
  },

  startFire(k, opts = {}) {
    this.endSession();
    const fire = FIRES[k];
    const retelling = !!opts.retelling;
    // a winter retelling plays on a THROWAWAY save wound back to that morning: harvestFire
    // and the planting bitset scribble on the copy, and the canonical scars never hear
    // about it (season §17 — post-season it's just you and the book).
    const save = retelling ? retellingSave(this.save, k) : this.save;
    if (!retelling) this.save.fires[k].snapshot = takeSnapshot(this.save); // the morning of — rewind point
    this.setScreen(null);
    this.session = createFireSession({
      mapData, save, mode: 'fire', fire, audio, viewport,
      onClose: (result) => this.fireClosed(k, result, retelling),
    });
    attachRenderer(this.session.sim);
    audio.attach && audio.attach(this.session.sim);
    audio.setScene && audio.setScene(fire.night ? 'night' : 'fire');
  },
  fireClosed(k, result, retelling) {
    const rec = this.save.fires[k];
    const rank = result.ledger.medalRank ?? 0; // 0 overrun / 1 mid / 2 best (+1 = F4's edges)
    if (!rec.bestMedal || rank > (rec.bestMedalRank ?? -1)) {
      rec.bestMedal = result.ledger.medal; rec.bestMedalRank = rank; // the shelf only ratchets up
    }
    if (retelling) rec.retold = true; // the page remembers being told twice; the map doesn't
    else {
      rec.status = 'done';
      // the whole page is kept: the logbook re-reads it, and the rewind confirm hangs off it
      rec.lastLedger = { lines: result.ledger.lines, chorus: result.ledger.chorus,
                         medal: result.ledger.medal, medalRank: rank };
      this.save.nextFire = Math.max(this.save.nextFire, k + 1);
      // the ledger is not the end of the day — persist the debt BEFORE the ceremony so a
      // quit here still owes an interlude when the player comes back
      this.save.pendingInterlude = k;
    }
    saveGame(this.save);
    this.endSession(true);
    this.setScreen(screens.ledgerScreen(this, result, {
      retro: retelling,
      intro: LEDGER_INTROS[k % LEDGER_INTROS.length], // she has four openings; rotate by ordinal
    }));
  },
  afterLedger(result, retro) {
    if (retro) return this.openLookout(); // a retelling changes the book, not the day
    // interlude follows every fire (I0..I6); the Crown's interlude carries first snow
    const k = (result.ordinal || 1) - 1;
    this.startInterlude(k);
  },
  startInterlude(k) {
    this.endSession();
    this.setScreen(null);
    // spawn on the newest scar: use the fire's spawn as a stand-in anchor near the burn
    this.session = createFireSession({
      mapData, save: this.save, mode: 'interlude', interludeIdx: k, audio, viewport,
      spawn: FIRES[k].spawn,
      onClose: () => this.interludeClosed(k),
    });
    attachRenderer(this.session.sim);
    audio.attach && audio.attach(this.session.sim);
    audio.setScene && audio.setScene(k === 6 ? 'snow' : 'dawn');
    if (k === 4) this.session.radio.say('D-15'); // the forester's letter — rx unlocks
    // D-47 (snow) is scheduled inside game.js at interlude t=55s
  },
  interludeClosed(k) {
    this.save.pendingInterlude = false; // the debt is paid
    if (k === 6) this.save.seasonClosed = true;
    saveGame(this.save);
    if (k === 6) {
      // D-48 while the radio still has a session to squelch through; the card prints it
      if (this.session && this.session.radio) this.session.radio.say('D-48');
      this.endSession(true);
      this.setScreen(screens.winterScreen(this, { radioId: 'D-48' }));
    } else {
      this.endSession(true);
      this.openLookout();
    }
  },
  startRx(unit, gap) {
    this.endSession();
    this.setScreen(null);
    this.save.rxUsed[gap]++;
    this.session = createFireSession({
      mapData, save: this.save, mode: 'rx', rxUnit: unit, audio, viewport,
      onClose: (result) => {
        if (result.stamped) this.save.rxDone.push(unit.id);
        saveGame(this.save);
        const stamp = result.stamp || { lines: [], radioId: null };
        this.endSession(true);
        // the zen session used to end in silence — the stamp IS the reward. No chorus:
        // one morning of black doesn't rebuild the birds, and pretending it does is a lie.
        this.setScreen(screens.ledgerScreen(this,
          { mode: 'rx', ledger: { lines: stamp.lines, chorus: null, medal: result.stamped ? RX_MEDAL : null } },
          { chorusless: true, radioId: stamp.radioId, onDone: () => this.openLookout() }));
      },
    });
    attachRenderer(this.session.sim);
    audio.attach && audio.attach(this.session.sim);
  },
  startEpilogue() {
    this.endSession();
    this.setScreen(null);
    this.session = createFireSession({
      mapData, save: this.save, mode: 'epilogue', audio, viewport,
      onClose: () => {
        this.save.epilogueSeen = true;
        saveGame(this.save);
        // the season's totals are read off the walked-in spring sim, before it is dropped
        const close = buildSeasonClose(this.session.sim);
        this.endSession(true);
        this.setScreen(screens.ledgerScreen(this, { mode: 'seasonClose', ledger: close },
          { onDone: () => this.toTitle() }));
      },
    });
    attachRenderer(this.session.sim);
    audio.attach && audio.attach(this.session.sim);
    audio.setScene && audio.setScene('spring');
  },
  // logbook re-read: the stored page, and the door back into that morning
  showLedgerPage(k) {
    const rec = this.save && this.save.fires[k];
    if (!rec || rec.status !== 'done') return;
    this.setScreen(screens.logbookScreen(this, k, rec)); // ambient mountain keeps running behind
  },
  // rewind-replay (canon-final §11): restore the morning of fire k, tear out every later
  // page, keep the medal shelf. Post-season the same row is a retelling: book only.
  refightFire(k) {
    if (this.save.seasonClosed) return this.startFire(k, { retelling: true });
    const rec = this.save.fires[k];
    if (rec.snapshot) restoreSnapshot(this.save, rec.snapshot);
    for (let j = k; j < FIRES.length; j++) {
      const f = this.save.fires[j];
      f.status = 'todo'; f.lastLedger = null; f.snapshot = null;
      // bestMedal/bestMedalRank survive on purpose — the shelf is memory, the map is truth
    }
    this.save.nextFire = k;
    this.save.pendingInterlude = false; // the torn pages take their owed morning with them
    saveGame(this.save);
    this.startFire(k);
  },

  endSession(keepScreen) {
    this.session = null;
    this.paused = false;  // pause is a property of a session, never of the season
    clearEdges();         // nothing buffered survives a scene change
  },

  // ---- harness surface ----
  getSim() { return this.session ? this.session.sim : null; },
  getWarden() { return this.session ? this.session.warden : null; },
  getCamera() { return this.session ? this.session.camera : null; },
  getScene() { return this.screen ? this.screen.name : (this.session ? this.session.mode : 'boot'); },
  getRadioState() { return this.session ? this.session.radio.state() : null; },
  step(n) { for (let i = 0; i < n; i++) if (this.session) this.session.tick(frameInput()); },
  injectInput(patch) { Object.assign(injected, patch); },
  jump(target) {
    if (!this.save) this.save = freshSave();
    if (target === 'title') return this.toTitle();
    if (target === 'lookout') return this.openLookout();
    if (target === 'epilogue') return this.startEpilogue();
    if (target === 'interlude' || target.startsWith('interlude:')) {
      // bare 'interlude' = the one this save owes (else the morning after the last fire fought)
      const owed = typeof this.save.pendingInterlude === 'number' ? this.save.pendingInterlude
                 : this.save.nextFire - 1;
      const k = target.length > 9 ? parseInt(target.slice(10), 10) : owed;
      return this.startInterlude(Math.max(0, Math.min(FIRES.length - 1, k | 0)));
    }
    if (target.startsWith('rx:')) {
      const key = target.slice(3);
      const u = RX_UNITS.find(x => x.id === key) || RX_UNITS.find(x => x.name === key);
      if (!u) return;
      // the gap is whichever window the unit actually opens in (season data, not the caller's guess)
      return this.startRx(u, u.windows.includes(RX_WINDOW.five) ? 'five' : 'six');
    }
    const idx = ['prologue', 'fire1', 'fire2', 'fire3', 'fire4', 'fire5', 'fire6'].indexOf(target);
    if (idx >= 0) return this.startFire(idx);
  },
  seed: 91321,
};

// a retelling's save: a throwaway copy wound back to the morning of fire k. countCompleted
// drives accrual + regrow stages, so the later pages must read 'todo' or the mountain shows
// up with october's fuel debt in a july retelling.
function retellingSave(sv, k) {
  const copy = { ...sv,
    burnFire: sv.burnFire.slice(), burnSeverity: sv.burnSeverity.slice(),
    planted: sv.planted.slice(), lineCells: sv.lineCells.slice(),
    structuresLost: [...sv.structuresLost], rxDone: [...sv.rxDone], rxUsed: { ...sv.rxUsed },
    fires: sv.fires.map(f => ({ ...f })),
    seasonClosed: false, // that morning, it wasn't
  };
  if (sv.fires[k].snapshot) restoreSnapshot(copy, sv.fires[k].snapshot);
  for (let j = k; j < copy.fires.length; j++) copy.fires[j].status = 'todo';
  return copy;
}

// injected input for headless tests (merged into the latched frame input)
const injected = {};

// Edges are drained at FRAME rate (60 Hz) but spent at SIM rate (30 Hz), so a frame that
// owes no fixed step must park its presses here instead of eating them — otherwise half
// the player's keys vanish. Held until a tick takes them; emptied on every scene change.
const held = { pressed: new Set(), lmbPressed: false, rmbPressed: false, wheel: 0 };
function holdEdges(fi) {
  for (const k of fi.pressed) held.pressed.add(k);
  held.lmbPressed = held.lmbPressed || fi.lmbPressed;
  held.rmbPressed = held.rmbPressed || fi.rmbPressed;
  held.wheel += fi.wheel;
}
const withHeldEdges = (fi) => ({ ...fi, pressed: new Set(held.pressed),
  lmbPressed: held.lmbPressed, rmbPressed: held.rmbPressed, wheel: held.wheel });
// every edge in flight, dropped on the floor. Called on every scene change: a key buffered
// while a ceremony owned the screen belongs to that ceremony, not to the next session's
// first tick. (Injected edges are the harness's business — left alone.)
function clearEdges() {
  input.pressed.clear();
  input.lmbPressed = false; input.rmbPressed = false; input.wheel = 0;
  held.pressed.clear();
  held.lmbPressed = false; held.rmbPressed = false; held.wheel = 0;
}
function frameInput() {
  const cam = app.session ? app.session.camera : null;
  const mw = cam ? cam.screenToWorld(input.mouseScreen) : { x: 160, y: 160 };
  const fi = {
    keys: new Set(input.keys), pressed: new Set(input.pressed),
    lmb: input.lmb, rmb: input.rmb, lmbPressed: input.lmbPressed, rmbPressed: input.rmbPressed,
    wheel: input.wheel, mouseScreen: { ...input.mouseScreen }, mouseWorld: mw,
  };
  if (injected.keys) { for (const k of injected.keys) fi.keys.add(k); }
  for (const k of ['lmb', 'rmb', 'lmbPressed', 'rmbPressed']) if (k in injected) fi[k] = injected[k];
  if (injected.mouseWorld) fi.mouseWorld = injected.mouseWorld;
  if (injected.pressed) for (const k of injected.pressed) fi.pressed.add(k);
  input.pressed.clear(); input.lmbPressed = false; input.rmbPressed = false; input.wheel = 0;
  // injected EDGE events are one-tick: auto-clear so a test's lmbPressed doesn't machine-gun
  delete injected.lmbPressed; delete injected.rmbPressed; delete injected.pressed;
  app._lastInput = { keys: [...fi.keys], pressed: [...fi.pressed], lmb: fi.lmb, rmb: fi.rmb,
                     mouseWorld: fi.mouseWorld };
  return fi;
}

// ---- global (non-sim) keys — run once per rAF frame, OUTSIDE the fixed step ----
// WHY out here: the step loop stops running the moment we pause (acc stops growing), so a
// pause toggle living inside it can be switched on and never off. Camera and lens are
// reading tools — they stay live while paused; the verb-pull does not, because a press the
// warden can't be handed is a press we must not honor.
function globalKeys(fi) {
  const s = app.session;
  if (fi.pressed.has('F2') && renderer) { renderer._flat = !renderer._flat; renderer.setFlatMode && renderer.setFlatMode(renderer._flat); }
  if (!s) return;
  // Esc belongs to the warden first (silent aim/cede cancel), pause second
  const vmode = s.warden ? s.warden.verb().mode : 'idle';
  if ((fi.pressed.has('Escape') && vmode !== 'aim' && vmode !== 'cede') || fi.pressed.has('KeyP')) {
    if (s.mode !== 'ambient' && !app.screen) app.paused = !app.paused;
  }
  if (fi.pressed.has('Tab')) s.ui.fuelLens = !s.ui.fuelLens;
  if (fi.pressed.has('KeyM') && !app.screen) s.camera.toggleTower(s.warden.pos());
  // wheel: deltaY>0 is scroll-DOWN, which everyone alive expects to zoom OUT — but
  // zoomStep(dir>0) means "in". Flip it here, at the one place that knows about mice.
  if (fi.wheel && !app.screen) s.camera.zoomStep(-fi.wheel, fi.mouseWorld);
  // verb-pull zoom: labor press at TOWER zooms to GROUND and still delivers the press.
  // Never during GRANDMOTHER aim — that press is drawing the corridor, not asking for dirt.
  if ((fi.lmbPressed || fi.rmbPressed) && !app.paused && !app.screen &&
      s.camera.tier() === 'TOWER' && vmode !== 'aim')
    s.camera.setTier('GROUND');
}

// ---- fixed-step loop ----
// catch-up steps share the frame's held keys but never its edges: one press is one press,
// not one per tick the frame owed.
const stripEdges = (fi) => ({ ...fi, pressed: new Set(), lmbPressed: false, rmbPressed: false, wheel: 0 });
let acc = 0, last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dtMs = Math.min(120, now - last);
  last = now;

  // drain the latch ONCE per frame — paused or not, session or not
  const fi = frameInput();
  globalKeys(fi);   // pause and camera answer at frame rate, on this frame's new edges
  // the warden's copy waits for a tick that actually runs — but a paused warden isn't
  // listening, so keys mashed at the pause screen die there instead of firing on resume
  if (!app.paused) holdEdges(fi);

  if (!app.paused) acc += dtMs * app.timescale;
  let steps = 0;
  while (acc >= 1000 * DT && steps < 4) {
    if (app.session && !app.paused) {
      app.session.tick(steps === 0 ? withHeldEdges(fi) : stripEdges(fi));
      if (steps === 0) { held.pressed.clear(); held.lmbPressed = false; held.rmbPressed = false; held.wheel = 0; }
    }
    acc -= 1000 * DT;
    steps++;
  }
  if (steps === 4) acc = 0; // spiral-of-death guard

  // camera follows at render rate for smoothness
  if (app.session) app.session.camera.tick(app.session.warden.pos(), input.mouseScreen, dtMs / 1000);

  // render
  if (app.session && renderer && renderer.frame) {
    const v = app.session.view({
      screen: input.mouseScreen,
      world: app.session.camera.screenToWorld(input.mouseScreen),
      zoneName: zoneUnderCursor(),
      mode: app.session.warden.verb().mode,
    });
    renderer.frame(v);
  }
  // screens count 30 Hz ticks like everything else, but they run at rAF rate — hand them the
  // frame's real length so a 144 Hz panel can't fast-forward a ceremony
  if (app.screen) { app.screen.tick(dtMs / (1000 * DT)); app.screen.render(); }
  else screens.pauseHint(app.paused); // the screens canvas is free when no screen owns it
  if (audio.frame && app.session && !app.paused) {
    audio.frame({
      sim: app.session.sim, camera: app.session.camera, scene: app.session.mode,
      wardenPos: app.session.warden.pos(), dryness: app.session.sim.D,
    });
  }
}
function zoneUnderCursor() {
  if (!app.session) return '';
  const w = app.session.camera.screenToWorld(input.mouseScreen);
  const x = w.x | 0, y = w.y | 0;
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return '';
  return ZONE_NAMES[app.session.sim.zoneId[y * GRID + x]] || '';
}
// ---- boot gate (autoplay unlock) ----
function boot() {
  bootEl.addEventListener('click', () => {
    audio.unlock && audio.unlock();
    bootEl.remove();
    app.toTitle();
  }, { once: true });
  window.addEventListener('keydown', function onk() {
    if (!document.body.contains(bootEl)) return;
    audio.unlock && audio.unlock();
    bootEl.remove();
    app.toTitle();
    window.removeEventListener('keydown', onk);
  });
}
installHarness(app);
boot();
requestAnimationFrame(loop);
