// The course: the song turned into ground. Everything here is a function of
// SONG TIME, not distance. The height you ride at time t is fixed by the music
// (a hill per bar, a drop on the chorus), so the hills always arrive on the
// beat. How FAST you go is yours: it only decides how far apart those hills
// are laid out in space (track.js) and how the world rushes past.

export const G = 22;          // game gravity (m/s^2): snappy, nothing floaty
export const RATE = 120;      // profile samples per second
export const T_PRE = 4;       // seconds of course before the song starts
export const T_POST = 9;      // seconds after it ends

// section kinds -> how the ground behaves
// rb: beats per roller, c: crest curvature as a fraction of G (c > 1 lets you hop
// off the crest if you aren't pressing), trend: overall climb/fall in m/s
const KINDS = {
  intro:  { rb: 8, c: 0.75, curve: 0.35, width: 8.0 },
  verse:  { rb: 4, c: 0.92, curve: 0.55, width: 7.0 },
  pre:    { rb: 4, c: 0.85, curve: 0.40, width: 6.5 },
  chorus: { rb: 4, c: 1.30, curve: 0.85, width: 7.5 },
  post:   { rb: 4, c: 1.05, curve: 0.65, width: 7.0 },
  bridge: { rb: 8, c: 0.62, curve: 0.30, width: 9.0 },
  break:  { rb: 4, c: 0.80, curve: 0.20, width: 7.0 },
  final:  { rb: 4, c: 1.28, curve: 0.95, width: 8.0 },
  outro:  { rb: 8, c: 0.65, curve: 0.30, width: 9.0 },
  pulse:  { rb: 2, c: 0.72, curve: 0.18, width: 7.0 },   // a heartbeat: small even dips on the kick
};
export const KIND_ID = { intro: 0, verse: 1, pre: 2, chorus: 3, post: 4, bridge: 5, break: 6, final: 7, outro: 8, pulse: 9 };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// amplitude of a raised-cosine roller of period T whose crest curvature is c*G
const rollerAmp = (c, T) => 2 * c * G * (T / (2 * Math.PI)) ** 2;

function hermite(y0, s0, y1, s1, L, u) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * L * s0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * L * s1;
}

export class Course {
  constructor(chart) {
    this.chart = chart;
    this.duration = chart.duration;
    this.t0 = -T_PRE;
    this.t1 = chart.duration + T_POST;
    this.n = Math.ceil((this.t1 - this.t0) * RATE) + 1;
    const n = this.n;
    this.y = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.ay = new Float32Array(n);
    this.yawRate = new Float32Array(n);
    this.yaw = new Float32Array(n);
    this.width = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.energy = new Float32Array(n);
    this.press = new Int8Array(n);      // +1 where pressing gains (descent), -1 where it costs (ascent)
    this.body = new Uint8Array(n);      // 1 inside a section's rollers (not a launch, kicker or catch)
    this.hold = new Float32Array(n);    // inside a hold zone (crest to valley): 0..1 how far down; -1 outside
    this.turn = new Float32Array(n).fill(1);   // how much the road may turn here (a section's turn, default 1)
    this.rand = mulberry32(hashStr(chart.id || chart.title || 'x'));
    this.gaps = []; this.rails = []; this.gapMask = null;
    this._beats();
    this._sections();
    this._profile();
    this._heading();
    this._gapsBuild();
    this._railsBuild();
    this._features();
  }

  // ---------- gaps: where a launch's road breaks ----------
  // Everyone leaves the lip at the same song time with the same upward speed (the kicker's),
  // and nobody can dive over the hole, so where the flight comes down is known here. The hole
  // runs from just past the lip to a little before that; the road is back in time to land on.
  _gapsBuild() {
    const s = {};
    for (const g of this._gapLips || []) {
      // fly it the way the rider does: off the lip at the surface's speed, skimming the
      // rounded lip for a moment, then the first time the ground comes back up to meet her
      let y = this.sample(g.lip, s).y, vy = s.vy, land = g.end;
      const dt = 1 / 240;
      for (let tt = dt; tt < 4; tt += dt) {
        y += vy * dt - 0.5 * G * dt * dt; vy -= G * dt;
        const ys = this.sample(g.lip + tt, s).y;
        if (y <= ys) { if (tt < 0.35) { y = ys; vy = Math.max(vy, s.vy); continue; } land = g.lip + tt; break; }
      }
      const from = g.lip + 0.05, to = land - (g.sec.gapLand ?? 0.3);
      if (to - from > 0.3) this.gaps.push({ lip: g.lip, from, to, land, kind: g.sec.gap === true ? 'gap' : g.sec.gap });
    }
    this.gapMask = new Uint8Array(this.n);
    for (const g of this.gaps) {
      const i0 = Math.max(0, Math.ceil((g.from - this.t0) * RATE)), i1 = Math.min(this.n - 1, Math.floor((g.to - this.t0) * RATE));
      for (let i = i0; i <= i1; i++) this.gapMask[i] = 1;
    }
  }
  // the gap whose hole is under song time t, if any
  gapAt(t) {
    if (!this.gaps.length) return null;
    const i = Math.round((t - this.t0) * RATE);
    if (i < 0 || i >= this.n || !this.gapMask[i]) return null;
    for (const g of this.gaps) if (t >= g.from - 0.01 && t <= g.to + 0.01) return g;
    return null;
  }
  // a gap's lip crossed between song times a and b
  lipBetween(a, b) { for (const g of this.gaps) if (g.lip > a && g.lip <= b) return g; return null; }

  // ---------- rails along the ribbon ----------
  // set per song: { t (song seconds, snapped to the beat), bars or beats, x across, h above }
  _railsBuild() {
    for (const r of this.chart.rails || []) {
      const b0 = this.nearestBeatIndex(r.t), b1 = Math.min(this.beats.length - 1, b0 + (r.beats ?? 4 * (r.bars ?? 2)));
      this.rails.push({ t0: this.beats[b0], t1: this.beats[b1], b0, b1, x: r.x ?? 0, h: r.h ?? 0.55 });
    }
    this.rails.sort((a, b) => a.t0 - b.t0);
  }
  railAt(t) { for (const r of this.rails) if (t >= r.t0 && t <= r.t1) return r; return null; }

  // beat grid extended before 0 and past the end so every second has beats
  _beats() {
    const b = this.chart.beats.slice();
    const spb0 = b[1] - b[0], spb1 = b[b.length - 1] - b[b.length - 2];
    while (b[0] > this.t0 - 2) b.unshift(b[0] - spb0);
    while (b[b.length - 1] < this.t1 + 2) b.push(b[b.length - 1] + spb1);
    this.beats = b;
    this.beatOffset = this.chart.beats.length ? b.indexOf(this.chart.beats[0]) : 0;
    // per-beat energy aligned to the extended grid
    const e = this.chart.energy || [];
    this.beatEnergy = b.map((_, i) => { const k = i - this.beatOffset; return k >= 0 && k < e.length ? e[k] : (k < 0 ? (e[0] ?? 0.3) : 0.2); });
    // downbeats: index in extended grid of every bar line
    const d0 = this.beatOffset + (this.chart.downbeat || 0);
    this.barPhase = ((d0 % 4) + 4) % 4;
  }

  beatAt(t) {
    const b = this.beats;
    let lo = 0, hi = b.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
    return lo + clamp((t - b[lo]) / (b[hi] - b[lo]), 0, 1);
  }
  timeOfBeat(x) {
    const b = this.beats, i = clamp(Math.floor(x), 0, b.length - 2), f = x - i;
    return b[i] + (b[i + 1] - b[i]) * f;
  }
  nearestBeatIndex(t) { return Math.round(this.beatAt(t)); }
  isBar(i) { return ((i - this.barPhase) % 4 + 4) % 4 === 0; }

  _sections() {
    const raw = (this.chart.sections && this.chart.sections.length) ? this.chart.sections : [{ t: 0, kind: 'verse' }];
    // slow songs pump on the half bar so the rhythm under your hands stays around a second and a bit
    const slow = (this.chart.bpm || 120) < 140;
    const secs = raw.map((s) => { const k = { ...KINDS[s.kind] || KINDS.verse }; if (slow && !s.rb) k.rb = Math.max(2, k.rb / 2); return { ...k, ...s, b: this.nearestBeatIndex(Math.max(s.t, 0)) }; });
    secs[0].b = this.nearestBeatIndex(this.t0 + 0.5);
    for (let i = 0; i < secs.length; i++) {
      secs[i].e = i + 1 < secs.length ? secs[i + 1].b : this.nearestBeatIndex(this.t1 - 0.5);
      secs[i].ta = this.beats[secs[i].b];
      secs[i].tb = this.beats[secs[i].e];
    }
    this.sections = secs;
  }

  // ---------- vertical profile ----------
  _profile() {
    const pieces = [];
    this._gapLips = [];
    let y = this.chart.startY ?? 15, s = -1.0;   // start above the rooftops, already rolling downhill
    const H_MIN = 3.5, H_MAX = 58;
    const secs = this.sections;
    for (let si = 0; si < secs.length; si++) {
      const sec = secs[si];
      const next = secs[si + 1];
      let b = sec.b;
      const eAvg = this._energyBetween(sec.b, sec.e);

      // ---- openers ----
      if (sec.start === 'launch' || sec.start === 'drop') {
        // the lip is the section's first beat; the beats before it (end of the
        // previous section) were already shaped into a kicker by that section.
        // flights last about 1.35 s whatever the tempo: a slow song launches for fewer beats
        const spb = 60 / (this.chart.bpm || 120);
        const lb = sec.launchBeats || (sec.launchBars ? 4 * sec.launchBars : Math.max(2, Math.min(4, Math.round(1.35 / spb))));
        const bL = Math.min(b + lb, sec.e);
        const ta = this.beats[b], tb = this.beats[bL];
        const L = tb - ta;
        const u = s;                       // leave the lip with the kicker's slope
        const k = 1 + (sec.lift ?? 0.012); // surface falls a hair faster than you: a float, not a gap
        const y0 = y;
        if (sec.gap) this._gapLips.push({ lip: ta, end: tb, sec });
        pieces.push({ ta, tb, kind: sec.kind, turn: sec.turn, f: (t) => { const tt = t - ta; return y0 + u * tt - 0.5 * G * k * tt * tt; } });
        y = y0 + u * L - 0.5 * G * k * L * L;
        s = u - G * k * L;
        // catch: bend the steep fall back to riding, and come out on the bar so
        // the rollers after it dip on the downbeats again
        let bC = bL + 3;
        const al = Math.min(sec.rb, 4);
        while (((bC - this.barPhase) % al + al) % al !== 0) bC++;
        bC = Math.min(bC, sec.e);
        if (bC > bL) {
          const tc0 = this.beats[bL], tc1 = this.beats[bC], Lc = tc1 - tc0;
          const yc0 = y, sc0 = s, s1 = -1.5;
          const y1 = clamp(y + 0.5 * (s + s1) * Lc * 0.62, H_MIN + 2, H_MAX);
          pieces.push({ ta: tc0, tb: tc1, kind: sec.kind, turn: sec.turn, f: (t) => hermite(yc0, sc0, y1, s1, Lc, (t - tc0) / Lc) });
          y = y1; s = s1;
          b = bC;
        } else b = bL;
      }

      // ---- body: rollers with a trend toward this section's target height ----
      const endKicker = next && (next.start === 'launch' || next.start === 'drop');
      const kickBeats = endKicker ? Math.min(4, Math.max(0, sec.e - b - 4)) : 0;
      const bodyEnd = sec.e - kickBeats;
      if (bodyEnd > b) {
        const ta = this.beats[b], tb = this.beats[bodyEnd];
        let target = sec.endY ?? this._defaultTarget(sec, y, next);
        target = clamp(target, H_MIN + 3, H_MAX - 4);
        const trend = (target - y) / Math.max(0.5, tb - ta);
        // ease the slope we arrived with into the trend over the first beat
        const valleys = [];
        for (let i = b; i < bodyEnd; i += sec.rb) valleys.push(i);
        valleys.push(bodyEnd);
        // merge a tiny last roller into the previous one
        if (valleys.length > 2 && valleys[valleys.length - 1] - valleys[valleys.length - 2] < sec.rb / 2) valleys.splice(valleys.length - 2, 1);
        const y0 = y, s0 = s;
        const ease = Math.min(this.beats[b + 1] - ta, (tb - ta) * 0.5);
        const amps = [];
        for (let j = 0; j + 1 < valleys.length; j++) {
          const v0 = this.beats[valleys[j]], v1 = this.beats[valleys[j + 1]];
          const e = this._energyBetween(valleys[j], valleys[j + 1]);
          // hops stay small enough that floating over them still lands on the far side's downslope
          const c = Math.min((sec.c) * (0.78 + 0.42 * e) * (sec.amp ?? 1), sec.c > 1 ? 1.42 : 1.0);
          amps.push({ v0, v1, A: rollerAmp(c, v1 - v0) });
        }
        pieces.push({
          ta, tb, kind: sec.kind, amps, turn: sec.turn,
          f: (t) => {
            const tt = t - ta;
            // slope easing: blend from incoming slope s0 to trend over `ease` seconds
            const eb = Math.min(1, tt / ease);
            const base = y0 + (eb < 1 ? (s0 * tt + (trend - s0) * (tt * tt) / (2 * ease)) : (s0 * ease + (trend - s0) * ease / 2 + trend * (tt - ease)));
            let bump = 0;
            for (let j = 0; j < amps.length; j++) {
              const a = amps[j];
              if (t >= a.v0 && t < a.v1) { bump = a.A * 0.5 * (1 - Math.cos(2 * Math.PI * (t - a.v0) / (a.v1 - a.v0))); break; }
            }
            return base + bump;
          },
        });
        const L = tb - ta;
        y = y0 + s0 * ease + (trend - s0) * ease / 2 + trend * (L - ease);
        s = trend;
      }

      // ---- kicker into the next section's launch ----
      if (kickBeats > 0) {
        const ta = this.beats[bodyEnd], tb = this.beats[sec.e];
        const L = tb - ta;
        const u = next.kick ?? 11;                   // m/s upward off the lip
        const rise = clamp(next.kickRise ?? (u * L * 0.42), 2, 14);
        const y0 = y, s0 = s, y1 = Math.min(y + rise, H_MAX);
        pieces.push({ ta, tb, kind: sec.kind, turn: sec.turn, f: (t) => hermite(y0, s0, y1, u, L, (t - ta) / L) });
        y = y1; s = u;
      }
    }
    this.pieces = pieces;

    // sample
    const n = this.n, Y = this.y;
    let pi = 0;
    for (let i = 0; i < n; i++) {
      const t = this.t0 + i / RATE;
      while (pi < pieces.length - 1 && t >= pieces[pi].tb) pi++;
      const p = pieces[Math.min(pi, pieces.length - 1)];
      Y[i] = p.f(Math.min(t, p.tb));
      this.kind[i] = KIND_ID[p.kind] ?? 1;
      this.body[i] = p.amps ? 1 : 0;
      this.turn[i] = p.turn ?? 1;
    }
    // never below the street: soft floor at 3 m
    for (let i = 0; i < n; i++) { const d = Y[i] - 3; Y[i] = 3 + (d > 0 ? d + Math.log1p(Math.exp(-d * 2)) / 2 : Math.log1p(Math.exp(d * 2)) / 2); }
    // smooth away joins (sigma 2.5 samples ~ 20 ms)
    const sm = gaussSmooth(Y, 2.5);
    Y.set(sm);
    for (let i = 0; i < n; i++) {
      const a = Y[Math.max(0, i - 1)], c = Y[Math.min(n - 1, i + 1)];
      this.vy[i] = (c - a) * RATE / 2;
    }
    const VY = gaussSmooth(this.vy, 1.5);
    for (let i = 0; i < n; i++) {
      const a = VY[Math.max(0, i - 1)], c = VY[Math.min(n - 1, i + 1)];
      this.ay[i] = (c - a) * RATE / 2;
    }
    for (let i = 0; i < n; i++) {
      const t = this.t0 + i / RATE;
      this.energy[i] = this._energyAt(t);
      this.press[i] = this.vy[i] < -0.4 ? 1 : (this.vy[i] > 0.4 ? -1 : 0);
    }
    // the bottoms of the dips: where you let go, on the beat
    this.valleys = [];
    for (let i = 1; i < n; i++) if (this.vy[i - 1] < -0.3 && this.vy[i] >= -0.3) this.valleys.push(this.t0 + i / RATE);
    // hold zones: each run downhill inside the rollers, from the crest to the valley.
    // That is where you hold; the valley at its end is where you let go, on the beat.
    this.hold.fill(-1);
    this.crests = [];
    let run = -1;
    for (let i = 0; i <= n; i++) {
      const down = i < n && this.vy[i] < -0.3 && this.body[i];
      if (down && run < 0) run = i;
      if (!down && run >= 0) {
        const len = i - run;
        if (len > RATE * 0.12) {
          for (let k = run; k < i; k++) this.hold[k] = (k - run) / len;
          this.crests.push(this.t0 + run / RATE);
        }
        run = -1;
      }
    }
  }

  _defaultTarget(sec, y, next) {
    switch (sec.kind) {
      case 'intro': return y - 4;
      case 'verse': return 8;
      case 'pre': return Math.max(y, 9) + 13;
      case 'chorus': return 8;
      case 'post': return 10;
      case 'bridge': return 30;
      case 'break': return y - 1;
      case 'final': return 6;
      case 'outro': return 5;
      case 'pulse': return y - 6;
      default: return y;
    }
  }

  _energyBetween(b0, b1) {
    let s = 0, n = 0;
    for (let i = b0; i < b1 && i < this.beatEnergy.length; i++) { s += this.beatEnergy[i]; n++; }
    return n ? s / n : 0.5;
  }
  _energyAt(t) {
    const x = this.beatAt(t), i = Math.floor(x), f = x - i;
    const a = this.beatEnergy[i] ?? 0.3, b = this.beatEnergy[i + 1] ?? a;
    return a + (b - a) * f;
  }

  // ---------- heading: long sweeping curves, wilder in choruses ----------
  _heading() {
    const n = this.n, R = this.rand;
    const ph = [R() * 6.28, R() * 6.28, R() * 6.28];
    const bar = 4 * (60 / this.chart.bpm);
    const P = [bar * 16, bar * 8, bar * 4];
    const W = new Float32Array(n);
    for (let i = 0; i < n; i++) W[i] = KINDS[Object.keys(KIND_ID)[this.kind[i]]]?.curve ?? 0.5;
    const Ws = gaussSmooth(W, RATE * 1.2);
    const Ts = gaussSmooth(this.turn, RATE * 1.5);
    let yaw = 0;
    for (let i = 0; i < n; i++) {
      const t = this.t0 + i / RATE;
      const w = Ws[i];
      const r = 0.055 * Math.sin(2 * Math.PI * t / P[0] + ph[0]) + 0.05 * Math.sin(2 * Math.PI * t / P[1] + ph[1]) * w + 0.03 * Math.sin(2 * Math.PI * t / P[2] + ph[2]) * w * w;
      this.yawRate[i] = r * (0.6 + 0.8 * w) * Ts[i];
      yaw += this.yawRate[i] / RATE;
      this.yaw[i] = yaw;
      this.width[i] = 0;
    }
    const Wd = new Float32Array(n);
    const ws = this.chart.ribbonWidth ?? 1;
    for (let i = 0; i < n; i++) Wd[i] = (KINDS[Object.keys(KIND_ID)[this.kind[i]]]?.width ?? 7) * ws;
    this.width.set(gaussSmooth(Wd, RATE * 0.8));
  }

  // ---------- notes to pick up: a line of light that weaves on the beat ----------
  _features() {
    const notes = [];
    const R = this.rand;
    for (const sec of this.sections) {
      if (!(sec.kind === 'verse' || sec.kind === 'chorus' || sec.kind === 'post' || sec.kind === 'final' || sec.kind === 'bridge')) continue;
      const every = sec.kind === 'bridge' ? 2 : 1;
      const phase = R() * 6.28, span = 2 + R() * 2;
      let deg = Math.floor(R() * 5);
      for (let i = sec.b + 2; i < sec.e - 1; i += every) {
        const t = this.beats[i];
        if (t < 1 || t > this.duration - 1) continue;
        // nothing to pick up over a hole
        if (this.gapAt(t) || this.gapAt(t - 0.15)) continue;
        // along a rail they run down the rail, every beat
        const rail = this.railAt(t);
        if (rail) { notes.push({ t, x: rail.x, beat: i, degree: deg, bar: this.isBar(i), got: false, rail: true }); continue; }
        // strings of 7 beats, rests between, weaving across the ribbon
        const k = i - sec.b;
        if ((k % 12) >= 8) continue;
        const w = this.sample(t).width;
        const x = Math.sin(phase + k * Math.PI / (span * 2)) * (w - 1.8) * 0.85;
        deg += (R() < 0.5 ? 1 : -1) * (R() < 0.3 ? 2 : 1);
        notes.push({ t, x, beat: i, degree: deg, bar: this.isBar(i), got: false });
      }
    }
    // every rail carries a line of them, one a beat, whatever part of the song it's in
    for (const r of this.rails) {
      for (let i = r.b0 + 1; i < r.b1; i++) {
        if (notes.some((n) => n.beat === i)) continue;
        const t = this.beats[i];
        if (t < 1 || t > this.duration - 1) continue;
        notes.push({ t, x: r.x, beat: i, degree: i % 7, bar: this.isBar(i), got: false, rail: true });
      }
    }
    notes.sort((a, b) => a.t - b.t);
    this.notes = notes;
  }

  // interpolated sample of everything at song time t
  sample(t, out = {}) {
    const f = (t - this.t0) * RATE;
    const i = clamp(Math.floor(f), 0, this.n - 2), a = clamp(f - i, 0, 1);
    const L = (arr) => arr[i] + (arr[i + 1] - arr[i]) * a;
    out.y = L(this.y); out.vy = L(this.vy); out.ay = L(this.ay);
    out.yaw = L(this.yaw); out.yawRate = L(this.yawRate);
    out.width = L(this.width); out.energy = L(this.energy);
    out.kind = this.kind[i]; out.press = this.press[i];
    out.gap = this.gapMask ? this.gapMask[i] : 0;
    const h0 = this.hold[i], h1 = this.hold[i + 1];
    out.hold = h0 >= 0 && h1 >= 0 ? h0 + (h1 - h0) * a : (a < 0.5 ? h0 : h1);
    return out;
  }

  // signed seconds to the nearest dip bottom
  valleyDist(t) { return nearestDist(this.valleys, t); }
  // ... and to the nearest start of a hold zone (the crest where pressing begins to pay)
  crestDist(t) { return nearestDist(this.crests, t); }

  sectionAt(t) {
    const s = this.sections;
    for (let i = s.length - 1; i >= 0; i--) if (t >= s[i].ta) return s[i];
    return s[0];
  }
}

function nearestDist(v, t) {
  let lo = 0, hi = v.length - 1;
  if (!v.length) return 99;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (v[m] <= t) lo = m; else hi = m; }
  const a = t - v[lo], b = t - v[hi];
  return Math.abs(a) < Math.abs(b) ? a : b;
}

export function gaussSmooth(src, sigma) {
  const n = src.length, r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i / sigma) ** 2); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = -r; j <= r; j++) acc += src[clamp(i + j, 0, n - 1)] * k[j + r];
    out[i] = acc;
  }
  return out;
}
