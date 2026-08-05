// GOODFIRE harness.js — window.__game, the deterministic test surface (locked rails).
// Everything counts in SIM TICKS; step(n) reproduces play headlessly, hash() proves it.

import { GRID } from './canon.js';

export function installHarness(app) {
  // app: { getSim, getGame, getScene, setScene, step(n), seed, streams,
  //        warden?, camera?, audio?, save }
  const g = {
    get seed() { return app.seed; },
    get scene() { return app.getScene(); },
    get tick() { return app.getSim() ? app.getSim().tick : -1; },

    step(n = 1) { app.step(n); return g.hash(); },
    hash() { const s = app.getSim(); return s ? s.hash() : 0; },

    igniteAt(x, y) { app.getSim().igniteAt(x, y); },
    windSet(deg, mph) { app.getSim().windSet(deg, mph); },
    setEmbers(on) { app.getSim().setEmbers(on); },
    setWeatherEnd(on) { app.getSim().setWeatherEnd(on); },

    cutLine(x0, y0, x1, y1) { // straight rasterized line, sim-side truth only
      const sim = app.getSim();
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      let px = null, py = null;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
        if (x === px && y === py) continue;
        // 4-connect diagonals like the verb does
        if (px != null && x !== px && y !== py) sim.cutLineCell(x, py);
        sim.cutLineCell(x, y);
        px = x; py = y;
      }
    },
    torchLine(x0, y0, x1, y1) {
      const sim = app.getSim();
      const id = sim.newBackburnId();
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      let px = null, py = null;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
        if (x === px && y === py) continue;
        sim.dripCell(x, y, id);
        px = x; py = y;
      }
      return id;
    },
    grandmother(x0, y0, x1, y1) { return app.getSim().dropRetardant(x0, y0, x1, y1).length; },
    stomp(x, y) { return app.getSim().stompAt(x, y); },

    // 'title'|'lookout'|'prologue'|'fire1'..'fire6'|'epilogue'|'interlude'|'interlude:<k>'|'rx:<unit id|name>'
    // bare 'interlude' = the morning this save owes (pendingInterlude, else after the last
    // fire fought); 'rx:' picks the unit's own authored window.
    jump(target) { return app.jump(target); },
    input(patch) { return app.injectInput(patch); },     // {keys:['w'], lmb:true, mouseWorld:{x,y}, ...} latched next tick
    wardenPos() { const w = app.getWarden(); return w ? w.pos() : null; },
    wardenVel() { const w = app.getWarden(); return w ? w.vel() : null; },
    wardenVerb() { const w = app.getWarden(); return w ? w.verb() : null; },
    lastInput() { return app._lastInput || null; },
    camera() { const c = app.getCamera(); return c ? { tier: c.tier(), px: c.pxPerTile() } : null; },

    zoneStats(z) { return app.getSim().zoneStats(z); },
    spotSummary() { return app.getSim().spotSummary(); },
    structures() { return app.getSim().structures.map(s => ({ key: s.key, state: s.state })); },
    snapshot() { // shallow typed copies for asserts
      const s = app.getSim();
      return { state: s.state.slice(), fuel: s.fuel.slice(), flags: s.flags.slice(),
               load: s.load.slice(), regrow: s.regrow.slice() };
    },
    events(on = true) { app.getSim().setRecordEvents(on); return app.getSim().eventLog; },
    audioLog() { return app.audio ? app.audio.eventLog() : []; },
    radioState() { return app.getRadioState ? app.getRadioState() : null; },
    save() { return app.save; },
    timescale(x) { app.timescale = x; },                 // render-only QA speedup
    shot(name) { return app.shot ? app.shot(name) : null; }, // dev-server frame capture
  };
  if (typeof window !== 'undefined') window.__game = g;
  return g;
}
