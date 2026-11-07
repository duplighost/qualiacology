// The timeline a track's script builds: events on bars and beats, sections (the rewind checkpoints), and a
// runtime queue for things scheduled on the fly (an impact a few beats after its wind-up). Rewinding clears
// the runtime queue and puts the cursor back at the section's start.

export class Timeline {
  constructor(beats) {
    this.beats = beats;
    this.events = [];
    this.sections = [];
    this.cursor = 0;
    this.dyn = [];      // {t, fn}
    this.compiled = false;
  }
  // a position is 'bar:beat' (e.g. '17:3', '17:2.5'), a bar number (17 = bar 17 beat 1), or {s: seconds}
  time(pos) {
    if (pos && typeof pos === 'object' && 's' in pos) return pos.s;
    if (typeof pos === 'number') return this.beats.timeOfBar(pos, 1);
    return this.beats.t(pos);
  }

  at(pos, fn, label = '') { this.events.push({ t: this.time(pos), fn, label }); return this; }
  // every `step` beats from `from` (inclusive) to `to` (exclusive): fn(f, i, t)
  every(from, to, step, fn, label = '') {
    const a = this.beats.beatAt(this.time(from)), b = this.beats.beatAt(this.time(to));
    let i = 0;
    for (let k = a; k < b - 1e-6; k += step, i++) { const ii = i, tt = this.beats.timeOf(k); this.events.push({ t: tt, fn: (f) => fn(f, ii, tt), label }); }
    return this;
  }
  section(name, from, to, opts = {}) { this.sections.push({ name, t0: this.time(from), t1: this.time(to), ...opts }); return this; }

  compile() {
    this.events.sort((a, b) => a.t - b.t);
    this.sections.sort((a, b) => a.t0 - b.t0);
    this.compiled = true;
  }
  sectionAt(t) { let s = this.sections[0]; for (const x of this.sections) if (x.t0 <= t + 1e-4) s = x; return s; }

  after(t, fn) { this.dyn.push({ t, fn }); this.dyn.sort((a, b) => a.t - b.t); }
  clearDynamic() { this.dyn.length = 0; }
  seek(t) { this.cursor = 0; while (this.cursor < this.events.length && this.events[this.cursor].t < t - 1e-4) this.cursor++; this.clearDynamic(); }

  // fire everything due by time t
  advance(t, f) {
    while (this.cursor < this.events.length && this.events[this.cursor].t <= t) {
      const e = this.events[this.cursor++];
      try { e.fn(f, e.t); } catch (err) { console.error('event', e.label, err); }
    }
    while (this.dyn.length && this.dyn[0].t <= t) {
      const e = this.dyn.shift();
      try { e.fn(f, e.t); } catch (err) { console.error('dyn', err); }
    }
  }
}

// ---------- shape tests on the floor plane (a circle of radius r at px,pz against a telegraph shape) ----------
export function inShape(sh, px, pz, r = 0.4) {
  const ca = Math.cos(-sh.angle || 0), sa = Math.sin(-sh.angle || 0);
  const dx = px - sh.x, dz = pz - sh.z;
  // into shape space: +y forward (angle 0 = +z)
  const lx = dx * ca + dz * sa, ly = -dx * sa + dz * ca;
  switch (sh.shape) {
    case 'circle': return Math.hypot(lx, ly) <= sh.w + r;
    case 'ring': { const d = Math.hypot(lx, ly); return d <= sh.w + r && d >= sh.w - sh.param - r; }
    case 'rect': return Math.abs(lx) <= sh.w + r && ly >= -r && ly <= sh.h + r;
    case 'cone': { const d = Math.hypot(lx, ly); if (d > sh.w + r) return false; if (d < r + 0.3) return true; return Math.abs(Math.atan2(lx, ly)) <= sh.param + r / Math.max(0.5, d); }
    case 'arc': { const d = Math.hypot(lx, ly); if (d > sh.w + r || d < sh.w - sh.h - r) return false; return Math.abs(Math.atan2(lx, ly)) <= sh.param + r / Math.max(0.5, d); }
    default: return false;
  }
}
