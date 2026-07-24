// world.js — the one-way forest maze.
// The world is a graph of curved corridor segments. Forks offer branches; walking
// ~COMMIT_S metres into a branch permanently seals the parent and every sibling.
// A seal frontier trails the player, raising trees out of the dirt behind them.
// There is no going back. Ever.
import * as THREE from 'three';
import { RNG, hash2, clamp, lerp, TAU } from './util.js';

export const SEAL_TRAIL = 12;   // how far behind the player the forest knits shut
export const COMMIT_S = 6;      // metres into a branch before the choice is permanent
const LOOKAHEAD = 48;           // spawn children when this close to a segment's end
const DISPOSE_BEHIND = 70;      // drop sealed segments this far behind the player

export const KINDS = {
  corridor: { lenMin: 42, lenMax: 70, halfW: [1.7, 2.3], step: 9,  kink: 0.34 },
  cave:     { lenMin: 26, lenMax: 44, halfW: [1.15, 1.5], step: 7,  kink: 0.45 },
  cemetery: { lenMin: 48, lenMax: 64, halfW: [1.8, 2.1], step: 10, kink: 0.22, clearing: [10, 15] },
  sunclear: { lenMin: 40, lenMax: 56, halfW: [1.7, 2.1], step: 9,  kink: 0.26, clearing: [6.5, 9.5] },
  carspot:  { lenMin: 44, lenMax: 62, halfW: [2.3, 2.8], step: 10, kink: 0.2 },
};

let NEXT_ID = 1;

function buildSamples(ctrl) {
  // Catmull-Rom through control points, resampled to ~1 m arc steps.
  const fine = [];
  const P = (i) => ctrl[clamp(i, 0, ctrl.length - 1)];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const SUB = 6;
    for (let j = 0; j < SUB; j++) {
      const t = j / SUB, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
      fine.push(new THREE.Vector3(x, 0, z));
    }
  }
  fine.push(ctrl[ctrl.length - 1].clone());
  // resample at 1 m
  const pos = [fine[0].clone()];
  let acc = 0, prev = fine[0];
  for (let i = 1; i < fine.length; i++) {
    let d = fine[i].distanceTo(prev);
    while (acc + d >= 1) {
      const t = (1 - acc) / d;
      const p = prev.clone().lerp(fine[i], t);
      pos.push(p);
      d -= (1 - acc); acc = 0; prev = p;
    }
    acc += d; prev = fine[i];
  }
  const tan = pos.map((p, i) => {
    const a = pos[Math.max(0, i - 1)], b = pos[Math.min(pos.length - 1, i + 1)];
    return new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
  });
  return { pos, tan, length: pos.length - 1 };
}

export class World {
  constructor(scene, seed, flora) {
    this.scene = scene;
    this.rng = new RNG(seed);
    this.flora = flora;           // builds/animates all per-segment visuals
    this.segs = new Map();
    this.current = null;
    this.sCur = 0; this.latCur = 0;
    this.sealPoint = null;        // { seg, s } — nothing exists before this
    this.lastSealSpawnS = 0;
    this.idleTime = 0;
    this.depth = 0;               // total metres travelled forward (arc)
    this.since = { cemetery: 0, sunclear: 0, cave: 0, carspot: 0 };
    // callbacks (wired by main/events)
    this.onSegEnter = null; this.onCommit = null; this.onSealSpawn = null;
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3();
  }

  tier() { return this.depth < 400 ? 0 : this.depth < 1200 ? 1 : this.depth < 2500 ? 2 : 3; }

  begin() {
    const root = this._spawnSegment(null, this.rng.range(0, TAU), 'corridor');
    root.committed = true;
    this.current = root; this.sCur = 2; this.latCur = 0;
    this.sealPoint = { seg: root, s: 0 };
    // the tape starts with the way back already gone
    this.flora.spawnSealAt(root, 0, 3.2, true);
    this.flora.spawnSealAt(root, 1.2, 3.2, true);
    this._ensureChildren(root);
    return root;
  }

  // ---------- generation ----------

  _chooseKind(parentKind) {
    const t = this.tier(), s = this.since, r = this.rng;
    // hard variety guarantees
    if (s.cemetery >= r.int(5, 8)) { return 'cemetery'; }
    if (s.sunclear >= r.int(4, 7)) { return 'sunclear'; }
    let w = {
      corridor: 10,
      cave: 2.5 + t * 1.6 + (parentKind === 'cave' ? 2 : 0),
      cemetery: s.cemetery >= 3 ? 2 : 0,
      sunclear: s.sunclear >= 2 ? 1.8 : 0,
      carspot: s.carspot >= 2 ? 2.2 : 0,
    };
    if (parentKind === 'cemetery') w.cemetery = 0;
    if (parentKind === 'sunclear') w.sunclear = 0;
    let sum = 0; for (const k in w) sum += w[k];
    let x = r.float() * sum;
    for (const k in w) { x -= w[k]; if (x <= 0) return k; }
    return 'corridor';
  }

  _spawnSegment(parent, heading, kindForce) {
    const id = NEXT_ID++;
    const rng = new RNG(hash2(this.rng.seed, id * 7919));
    const kind = kindForce || this._chooseKind(parent ? parent.kind : 'corridor');
    const K = KINDS[kind];
    for (const k in this.since) this.since[k] = (k === kind) ? 0 : this.since[k] + 1;

    const len = rng.range(K.lenMin, K.lenMax);
    const start = parent ? parent.samples.pos[parent.samples.length].clone() : new THREE.Vector3(0, 0, 0);
    const ctrl = [start.clone()];
    let h = heading, p = start.clone();
    const steps = Math.ceil(len / K.step);
    for (let i = 0; i < steps; i++) {
      h += rng.gauss() * K.kink;
      p = p.clone().add(new THREE.Vector3(Math.sin(h), 0, Math.cos(h)).multiplyScalar(K.step));
      ctrl.push(p);
    }
    const samples = buildSamples(ctrl);
    const seg = {
      id, kind, rng, samples,
      length: samples.length,
      baseHalfW: rng.range(K.halfW[0], K.halfW[1]),
      widthPhase: rng.range(0, TAU),
      clearing: K.clearing ? { s: samples.length * rng.range(0.45, 0.62), r: rng.range(K.clearing[0], K.clearing[1]) } : null,
      parent, children: [], committed: false, sealed: false,
      depth0: parent ? parent.depth0 + parent.length : 0,
      endHeading: Math.atan2(
        samples.tan[samples.length].x, samples.tan[samples.length].z),
      group: null, colliders: [], actuators: [], eyeSpots: [], sunData: null, carData: null,
      sealSpawnedTo: -1,
    };
    this.segs.set(id, seg);
    if (parent) parent.children.push(seg);
    this.flora.buildSegment(seg, this);
    return seg;
  }

  _ensureChildren(seg) {
    if (seg.children.length || seg.sealed) return;
    const r = seg.rng;
    const n = r.float() < 0.42 ? 2 : (r.float() < 0.06 ? 3 : 1);
    const base = seg.endHeading;
    let headings;
    if (n === 1) headings = [base + r.gauss() * 0.45];
    else if (n === 2) headings = [base - r.range(0.5, 0.95), base + r.range(0.5, 0.95)];
    else headings = [base - r.range(0.8, 1.1), base + r.gauss() * 0.2, base + r.range(0.8, 1.1)];
    for (const h of headings) this._spawnSegment(seg, h);
    if (n > 1) this.flora.buildSignpost(seg, headings);
  }

  // ---------- projection / movement ----------

  _project(seg, x, z) {
    // closest sample then refine against neighbouring polyline edges
    const P = seg.samples.pos;
    let best = 0, bd = Infinity;
    for (let i = 0; i <= seg.samples.length; i++) {
      const dx = P[i].x - x, dz = P[i].z - z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    let s = best, lat = Math.sqrt(bd);
    for (const i of [best - 1, best]) {
      if (i < 0 || i + 1 > seg.samples.length) continue;
      const a = P[i], b = P[i + 1];
      const abx = b.x - a.x, abz = b.z - a.z;
      const L2 = abx * abx + abz * abz; if (L2 < 1e-8) continue;
      let t = ((x - a.x) * abx + (z - a.z) * abz) / L2;
      t = clamp(t, 0, 1);
      const px = a.x + abx * t, pz = a.z + abz * t;
      const dx = x - px, dz = z - pz, d = Math.sqrt(dx * dx + dz * dz);
      if (d <= lat + 1e-6) { lat = d; s = i + t; }
    }
    // signed lateral: positive = right of tangent
    const i0 = clamp(Math.floor(s), 0, seg.samples.length);
    const tn = seg.samples.tan[i0];
    const sp = this.pointAt(seg, s);
    const side = (x - sp.x) * tn.z - (z - sp.z) * tn.x; // cross(t, d).y sign
    return { s, lat: lat * Math.sign(side || 1), absLat: lat };
  }

  pointAt(seg, s, latOffset = 0, out) {
    s = clamp(s, 0, seg.samples.length);
    const i = clamp(Math.floor(s), 0, seg.samples.length - 1);
    const t = s - i;
    const a = seg.samples.pos[i], b = seg.samples.pos[Math.min(i + 1, seg.samples.length)];
    const v = out || new THREE.Vector3();
    v.set(lerp(a.x, b.x, t), 0, lerp(a.z, b.z, t));
    if (latOffset) {
      const tn = seg.samples.tan[i];
      v.x += tn.z * latOffset; v.z += -tn.x * latOffset;
    }
    return v;
  }

  tangentAt(seg, s) {
    return seg.samples.tan[clamp(Math.round(s), 0, seg.samples.length)];
  }

  halfWidthAt(seg, s) {
    let w = seg.baseHalfW * (0.9 + 0.22 * Math.sin(s * 0.29 + seg.widthPhase));
    if (s < 5) w *= 0.58 + 0.084 * s;                        // pinched mouths — doorways
    const end = seg.samples.length;
    if (s > end - 4) w *= 0.66 + 0.085 * (end - s);          // pinch into the fork throat
    if (seg.clearing) {
      const d = (s - seg.clearing.s) / (seg.clearing.r * 0.8);
      w += seg.clearing.r * Math.exp(-d * d);
    }
    return w;
  }

  // Move the player: clamp into the walkable corridor, handle transitions/commits.
  updatePlayer(pos, dt, moving) {
    const cur = this.current;
    const candidates = [cur];
    if (!cur.committed && cur.parent && !cur.parent.sealed) candidates.push(cur.parent);
    for (const c of cur.children) if (!c.sealed) candidates.push(c);

    const atEnd = this.sCur > cur.samples.length - 1.5;
    let bestSeg = cur, bestProj = null, bestAbs = Infinity;
    for (const seg of candidates) {
      const pr = this._project(seg, pos.x, pos.z);
      // penalise mouth-of-branch matches, EXCEPT when we're pressed against the
      // current segment's end — otherwise the fork throat deadlocks at walk speed
      let score = pr.absLat;
      if (seg !== cur && pr.s < 0.05 && !atEnd) score += 0.8;
      if (score < bestAbs) { bestAbs = score; bestSeg = seg; bestProj = pr; }
    }

    if (bestSeg !== cur) {
      if (bestSeg.parent === cur) {           // stepped into a child branch
        this.current = bestSeg;
        this._ensureChildren(bestSeg);        // see the next fork from the mouth
        if (this.onSegEnter) this.onSegEnter(bestSeg);
      } else {                                 // stepped back to uncommitted parent
        this.current = bestSeg;
        if (this.onSegEnter) this.onSegEnter(bestSeg); // re-key biome audio
      }
    }
    const seg = this.current;
    const pr = bestProj;
    let s = pr.s, lat = pr.lat;

    // commit: the moment the choice becomes permanent
    if (!seg.committed && seg.parent && s > COMMIT_S) this._commit(seg);

    // seal frontier clamp — the forest is a wall behind you
    if (this.sealPoint.seg === seg) s = Math.max(s, this.sealPoint.s + 2.2);

    const halfW = this.halfWidthAt(seg, s);
    const margin = 0.38;
    lat = clamp(lat, -(halfW - margin), halfW - margin);
    this.pointAt(seg, s, lat, this._v);
    pos.x = this._v.x; pos.z = this._v.z;

    // prop colliders (stones, cars, trunks in clearings)
    for (const seg2 of [seg, seg.parent, ...seg.children]) {
      if (!seg2 || seg2.sealed || !seg2.colliders.length) continue;
      for (const c of seg2.colliders) {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const d2 = dx * dx + dz * dz, r = c.r + 0.34;
        if (d2 < r * r && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          pos.x = c.x + (dx / d) * r; pos.z = c.z + (dz / d) * r;
        }
      }
    }

    this.sCur = s; this.latCur = lat;
    this.depth = seg.depth0 + s;
    this.idleTime = moving ? 0 : this.idleTime + dt;

    if (s > seg.samples.length - LOOKAHEAD) this._ensureChildren(seg);
    return { seg, s, lat, halfW, depth: this.depth };
  }

  _commit(seg) {
    seg.committed = true;
    const parent = seg.parent;
    const sealedMouths = [];
    for (const sib of parent.children) {
      if (sib === seg || sib.sealed) continue;
      this._sealSegment(sib);
      // dense wall across the rejected mouth
      for (let s = 0; s < 6; s += 1.1) this.flora.spawnSealAt(sib, s, 3.4, false);
      sealedMouths.push(this.pointAt(sib, 1.5));
    }
    // parent tail closes in a rush back to the fork
    if (!parent.sealed) {
      this._sealSegment(parent);
      const from = (this.sealPoint.seg === parent) ? this.sealPoint.s : Math.max(0, parent.samples.length - 14);
      for (let s = from; s <= parent.samples.length; s += 1.3) {
        this.flora.spawnSealAt(parent, s, 2.4 + (s - from) * 0.12, false);
      }
    }
    this.sealPoint = { seg, s: Math.max(0, this.sCur - SEAL_TRAIL) };
    this.lastSealSpawnS = this.sealPoint.s;
    if (this.onCommit) this.onCommit(seg, parent, sealedMouths);
  }

  _sealSegment(seg) {
    seg.sealed = true;
    seg.sealedAtDepth = this.depth;
    // sealed branches die with everything in them
    for (const ch of seg.children) if (!ch.sealed && ch !== this.current) this._sealSegment(ch);
  }

  update(dt) {
    // trailing frontier: advances as the player advances; creeps when they linger
    const sp = this.sealPoint;
    if (sp.seg === this.current) {
      let target = this.sCur - SEAL_TRAIL;
      // the forest is patient: linger too long and it closes in anyway, to 7 m
      if (this.idleTime > 40 && sp.s < this.sCur - 7) target = Math.max(target, sp.s + 0.22 * dt);
      if (target > sp.s) {
        sp.s = Math.min(target, sp.s + Math.max(1.5, (target - sp.s) * 2.4) * dt);
        while (this.lastSealSpawnS + 1.2 < sp.s) {
          this.lastSealSpawnS += 1.2;
          this.flora.spawnSealAt(this.current, this.lastSealSpawnS, 2.6, false);
          if (this.onSealSpawn) this.onSealSpawn(this.pointAt(this.current, this.lastSealSpawnS));
        }
      }
    } else { this.lastSealSpawnS = sp.s; }

    // dispose long-gone segments. Walked segments measure from their far end;
    // rejected branches (never committed) measure from their mouth at the fork.
    for (const [id, seg] of this.segs) {
      if (!seg.sealed || seg === this.current) continue;
      const behind = this.depth - (seg.depth0 + (seg.committed ? seg.length : 0));
      if (behind > (seg.committed ? DISPOSE_BEHIND : 45)) {
        this.flora.disposeSegment(seg);
        this.segs.delete(id);
        // sever graph links so the whole history isn't strongly reachable forever
        if (seg.parent) {
          const i = seg.parent.children.indexOf(seg);
          if (i >= 0) seg.parent.children.splice(i, 1);
          seg.parent = null;
        }
        for (const ch of seg.children) if (ch.parent === seg) ch.parent = null;
        seg.children = [];
      }
    }
  }
}
