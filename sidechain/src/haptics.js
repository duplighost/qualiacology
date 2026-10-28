// The board in your hand. On a phone the vibration motor says what the road is doing, the way the
// sound does: short clean pulses, never a drone. (Android: iPhone browsers give a page no
// vibration, so there it does nothing. ?nobuzz turns it off.)
//
// A hold zone is a long note you feel: a tap on the crest where it starts (press), a soft purr
// under your thumb while you hold it, ending on a firm tick at its gate (let go); let go early and
// the purr stops dead. A perfect release is a crisp double tap, a good one a single tap, a run broken
// a dull buzz, a new multiplier as many pulses as it is. Landings, rails, gaps, tricks and a crash
// each have their own.

const can = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const LAG = 12;            // ms: about how long a motor takes to start, taken off a timed tick
let busyUntil = 0, busyPrio = 0, live = false;

export const haptics = {
  off: false,
  get enabled() { return can && !this.off && document.body.classList.contains('touch'); },
  // a pattern now (ms on, off, on...), unless something more important is still playing
  buzz(pattern, prio = 1) {
    if (!live || !this.enabled) return;
    const now = performance.now();
    if (now < busyUntil && prio < busyPrio) return;
    try { navigator.vibrate(pattern); } catch (e) { return; }
    busyUntil = now + pattern.reduce((a, b) => a + b, 0); busyPrio = prio;
  },
  // a pattern on a moment `ahead` seconds from now (a beat), if `still()` says so when it comes
  at(ahead, pattern, prio, still) {
    if (!live || !this.enabled) return;
    setTimeout(() => { if (!still || still()) this.buzz(pattern, prio); }, Math.max(0, ahead * 1000 - LAG));
  },
  // only during a ride: off on pause, the menu and the end card, and whatever was playing stops
  live(on) {
    if (on === live) return;
    live = on;
    if (!on && can) { try { navigator.vibrate(0); } catch (e) { /* fine */ } busyUntil = 0; }
  },
  // a hold zone under your thumb, like a long note: a soft purr from now for `ms`, ending on a firm
  // tick where the zone ends (its gate: let go). Stopped at once if you let go early
  purr(ms) {
    // (opens on a full tap: the crest's tap is cut short when the purr takes over right after it)
    const p = [14, 18]; let t = 32;
    while (t + 24 < ms - 20) { p.push(6, 18); t += 24; }
    if (p.length) p[p.length - 1] += Math.max(0, ms - t); else p.push(0, Math.max(0, ms));
    p.push(16);
    this.buzz(p, 2);
  },
  stop() { if (live && this.enabled) { try { navigator.vibrate(0); } catch (e) { /* fine */ } busyUntil = 0; } },
  // one off the ride (the grade landing on the end card)
  once(pattern) { if (this.enabled) { try { navigator.vibrate(pattern); } catch (e) { /* fine */ } } },
  // a new multiplier: as many pulses as it is
  mult(m) { const p = []; for (let i = 0; i < m; i++) p.push(18, 55); p.pop(); return p; },
};
