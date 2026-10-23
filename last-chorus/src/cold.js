// Technically Thirty-Two. A clear morning, technically freezing. No coat. Running the
// sunlit stretches and catching breath in the shade; an elevated line beside the street
// and every train on it pulling away; the free bus; her platform; and at the end home,
// the door left unlocked, the cat on the step, coming in out of the sun.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt } from './scenery.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const DECK = 9.2;       // the elevated line's deck height

const KG = {
  // a street tree in winter: trunk, a few limbs, twigs
  bare() {
    const parts = [];
    let seed = 3; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const trunk = new THREE.CylinderGeometry(0.16, 0.3, 4.2, 6); trunk.translate(0, 2.1, 0); parts.push(trunk);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + R(), len = 2.4 + R() * 1.8, tilt = 0.5 + R() * 0.4;
      const b = new THREE.CylinderGeometry(0.05, 0.12, len, 5); b.translate(0, len / 2, 0); b.rotateZ(tilt); b.rotateY(a); b.translate(0, 3.4 + R() * 0.8, 0); parts.push(b);
      for (let j = 0; j < 3; j++) {
        const tl = 0.9 + R() * 0.9;
        const tw = new THREE.CylinderGeometry(0.02, 0.04, tl, 4); tw.translate(0, tl / 2, 0); tw.rotateZ(tilt * 0.5 + (R() - 0.5)); tw.rotateY(a + (R() - 0.5) * 1.4);
        const f = 0.45 + j * 0.2; tw.translate(Math.sin(tilt) * len * f * Math.cos(a), 3.4 + Math.cos(tilt) * len * f + 0.6, -Math.sin(tilt) * len * f * Math.sin(a)); parts.push(tw);
      }
    }
    return merge(parts);
  },
  // the elevated line: two steel columns and a girder deck, one span
  span() {
    const parts = [];
    for (const x of [-3.4, 3.4]) { const c = new THREE.BoxGeometry(0.5, DECK, 0.5); c.translate(x, DECK / 2, 0); parts.push(c); }
    const cap = new THREE.BoxGeometry(8, 0.7, 0.8); cap.translate(0, DECK - 0.35, 0); parts.push(cap);
    const deck = new THREE.BoxGeometry(7.6, 0.5, 13); deck.translate(0, DECK + 0.25, 0); parts.push(deck);
    for (const x of [-3.7, 3.7]) { const g = new THREE.BoxGeometry(0.25, 1.3, 13); g.translate(x, DECK - 0.4, 0); parts.push(g); }
    for (const x of [-2.1, -0.9, 0.9, 2.1]) { const r = new THREE.BoxGeometry(0.1, 0.14, 13); r.translate(x, DECK + 0.57, 0); parts.push(r); }
    return merge(parts);
  },
  // a train car on the elevated line
  car() {
    const body = new THREE.BoxGeometry(3.0, 3.3, 15); body.translate(0, 2.0, 0);
    const roof = new THREE.BoxGeometry(2.7, 0.3, 14.6); roof.translate(0, 3.8, 0);
    return merge([body, roof]);
  },
  // a station platform on the line: deck, canopy on posts
  platform() {
    const parts = [];
    const d = new THREE.BoxGeometry(5, 0.4, 44); d.translate(-6.2, DECK + 0.5, 0); parts.push(d);
    for (let z = -18; z <= 18; z += 9) { const p = new THREE.BoxGeometry(0.2, 3.6, 0.2); p.translate(-7.8, DECK + 2.5, z); parts.push(p); }
    const roof = new THREE.BoxGeometry(5.6, 0.25, 42); roof.translate(-6.4, DECK + 4.3, 0); roof.rotateZ(0.0); parts.push(roof);
    const stairs = new THREE.BoxGeometry(2.2, DECK, 1.2); stairs.translate(-8.6, DECK / 2, 18); parts.push(stairs);
    return merge(parts);
  },
  person() {
    const body = new THREE.CylinderGeometry(0.26, 0.34, 1.35, 10); body.translate(0, 1.0, 0);
    const head = new THREE.SphereGeometry(0.17, 10, 8); head.translate(0, 1.88, 0);
    const legs = new THREE.CylinderGeometry(0.2, 0.16, 0.5, 8); legs.translate(0, 0.25, 0);
    return merge([body, head, legs]);
  },
  stoop() {
    const parts = [];
    for (let k = 0; k < 5; k++) { const s = new THREE.BoxGeometry(2.6, 0.22, 0.42); s.translate(0, 0.11 + k * 0.22, 5.2 + 2.1 - k * 0.42); parts.push(s); }
    const top = new THREE.BoxGeometry(2.6, 0.22, 1.2); top.translate(0, 1.1, 5.6); parts.push(top);
    return merge(parts);
  },
  tempSign() {
    const pole = new THREE.BoxGeometry(0.3, 8, 0.3); pole.translate(0, 4, 0);
    const box = new THREE.BoxGeometry(5.6, 2.4, 0.5); box.translate(0, 9.2, 0);
    return merge([pole, box]);
  },
};

// the train: windows lit a little, cold steel
function carMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint; vOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float side = step(0.5, abs(vON.x));
        float win = step(1.5, vOP.y) * step(vOP.y, 2.9) * step(0.2, fract(vOP.z / 1.9)) * side;
        float door = step(0.6, vOP.y) * step(vOP.y, 3.1) * step(abs(fract(vOP.z / 7.5) - 0.5), 0.06) * side;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.07, 0.09), win * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.12, 0.14), door * 0.6);
        totalEmissiveRadiance += vec3(1.0, 0.92, 0.78) * win * 0.35;
        // the stripe down the side
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.35, 0.1), step(abs(vOP.y - 1.15), 0.12) * side);`);
  };
  return m;
}

function tempTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 220;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0806'; g.fillRect(0, 0, 512, 220);
  g.font = '900 130px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff9a3a'; g.shadowBlur = 24; g.fillStyle = '#ffb05a';
  g.fillText('32°F', 256, 116);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TT = { aTint: 3 };
extend({
  layers: {
    bare: (M) => [KG.bare(), M.bark || (M.bark = (() => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;'); }; return m; })()), 600, TT],
    span: (M) => [KG.span(), M.steel || (M.steel = (() => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.5 }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;'); }; return m; })()), 400, TT],
    elCar: (M) => [KG.car(), M.elCarM || (M.elCarM = carMaterial()), 40, TT],
    platform: (M) => [KG.platform(), M.concrete, 6, TT],
    person: (M) => [KG.person(), M.cloth, 30, TT],
    stoop: (M) => [KG.stoop(), M.concrete, 120, TT],
    tempSign: (M) => [KG.tempSign(), M.metal, 6, TT],
    tempFace: (M) => [(() => { const g = new THREE.PlaneGeometry(5.2, 2.1); g.translate(0, 9.2, 0.26); return g; })(), M.tempM || (M.tempM = new THREE.MeshBasicMaterial({ map: tempTexture(), color: new THREE.Color(1.6, 1.6, 1.6) })), 6, {}],
  },
  parts: {
    bare(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.bare.add(m, { aTint: it.tint }); },
    span(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.span.add(m, { aTint: [0.28, 0.36, 0.42] }); },
    platform(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.platform.add(m, { aTint: [0.78, 0.8, 0.84] });
      // who's waiting on it
      if (it.who) { const o = S._o.set(-6.4, DECK + 0.7, it.whoZ ?? 4).applyQuaternion(q).add(p); m.compose(o, q, S._s.set(1.15, 1.15, 1.15)); S.layers.person.add(m, { aTint: it.who }); }
    },
    stoop(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.stoop.add(m, { aTint: [0.62, 0.58, 0.55] }); },
    tempSign(S, it, p, q) {
      const m = S._m; S._e.set(0, S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.45 : 0.45), 0); const fq = S._q2 ? S._q2.setFromEuler(S._e) : (S._q2 = new THREE.Quaternion().setFromEuler(S._e));
      m.compose(p, fq, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.tempSign.add(m, { aTint: [0.2, 0.2, 0.22] }); S.layers.tempFace.add(m);
    },
    // somebody's fire alarm: a strobe on a wall, and no one coming out
    alarm(S, it, p) { const on = Math.sin((S.tNow ?? 0) * Math.PI * 2 * 1.6) > 0.3 ? 1 : 0.08; glowAt(S, p.x, p.y + 7.5, p.z, 3.2, [1, 0.08, 0.06], 2.6 * on); },
  },
  kits: {
    // a city street on a cold morning: blocks with their shops, bare trees, frost; the el on one side
    coldstreet(S, z, R) {
      const bricks = [0x9a6a5a, 0xa87a62, 0x8a8a92, 0xb8a890, 0x7a8a9a, 0xc8b8a8];
      const elX = z.el ?? -17;
      for (const side of [-1, 1]) {
        const near = side === Math.sign(elX) ? 27 : 22;
        for (let t = z.from; t < z.to; t += 0.28 + R() * 0.2) {
          // leave the gap where home is
          if (z.gapAt !== undefined && side === Math.sign(z.gapX) && Math.abs(t - z.gapAt) < 1.1) continue;
          S.items.push({ t, x: side * (near + R() * 5), rot: SIDE(side) + (R() - 0.5) * 0.04, s: 0.85 + R() * 0.3, sy: (z.low ? 0.3 : 0.45) + R() * (z.low ? 0.25 : 0.7), parts: 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 0.12, noShop: z.homes });
          if (z.homes && R() < 0.85) S.items.push({ t: t + 0.04, x: side * (near - 4.8), rot: SIDE(side), parts: 'stoop' });
          if (R() < 0.5) S.items.push({ t: t + R() * 0.2, x: side * (58 + R() * 80), rot: R() * 0.4, s: 0.9 + R() * 0.5, sy: 0.6 + R() * 1.6, parts: R() < 0.4 ? 'tower' : 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 0.08 });
        }
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.34 + R() * 0.12) {
          if (side === Math.sign(elX) && !z.homes) continue;
          if (z.gapAt !== undefined && side === Math.sign(z.gapX) && Math.abs(t - z.gapAt) < 1.6) continue;
          S.items.push({ t, x: side * (14.5 + R() * 1.2), rot: R() * 6.28, s: 0.9 + R() * 0.3, parts: 'bare', tint: [0.3, 0.27, 0.25] });
        }
      }
      for (let t = z.from; t < z.to; t += 0.42) for (const side of [-1, 1]) S.items.push({ t, x: side * 16, rot: SIDE(side), parts: 'lamp', seed: R(), dim: 0.1 });
    },
    // the elevated line
    el(S, z, R) {
      const c = S.course;
      for (let t = z.from; t < z.to; t += 0.25) S.items.push({ t, x: z.x ?? -17, rot: 0, parts: 'span', ahead: 30 });
    },
    // a station on it, and whoever's waiting
    station(S, z, R) { S.items.push({ t: z.at, x: z.x ?? -17, rot: 0, parts: 'platform', who: z.who ? col(z.who) : null, whoZ: z.whoZ, ahead: 30 }); },
    tempsign(S, z, R) { S.items.push({ t: z.at, x: z.x ?? 17, s: 1, parts: 'tempSign', ahead: 20 }); },
    alarm(S, z, R) { S.items.push({ t: z.at, x: z.x ?? 24, parts: 'alarm', ahead: 12 }); },
  },
});

// trains on the el, each pass meeting you at `at` and moving at `rate` times the song
export class ElTrains {
  constructor(course, x, passes) { this.course = course; this.x = x; this.passes = passes; }
  draw(S, rider, songT) {
    for (const ps of this.passes) {
      if (songT < ps.from || songT > ps.to) continue;
      const front = ps.at + ps.rate * (songT - ps.at);
      for (let k = 0; k < ps.cars; k++) {
        const tau = front - k * 0.32;
        if (tau < rider.t - 3 || tau > rider.t + 30) continue;
        const p = S.track.ground(tau, this.x, S._p);
        const yaw = this.course.sample(tau).yaw;
        S._e.set(0, yaw, 0); S._q.setFromEuler(S._e);
        S._m.compose(p.setY(DECK + 0.5), S._q, S._s.set(1, 1, 1));
        S.layers.elCar.add(S._m, { aTint: [0.78, 0.82, 0.86] });
        if (k === 0) { const fx = Math.sin(yaw), fz = Math.cos(yaw); glowAt(S, p.x + fx * 7.6, DECK + 2.0, p.z + fz * 7.6, 2.6, [1, 0.96, 0.85], 1.6); }
      }
    }
  }
}

// ---------- home: the door left unlocked, the cat on the step ----------
export class DoorFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 16;
    this.group = new THREE.Group(); scene.add(this.group);
    const brick = new THREE.MeshStandardMaterial({ color: 0xa06a58, roughness: 0.9 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.7 });
    const front = new THREE.Mesh(new THREE.BoxGeometry(9, 12, 10), brick); front.position.set(0, 6, -5); this.group.add(front);
    // the doorway: dark frame, warm inside, the door swung in
    this.inside = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc890).multiplyScalar(0.6) });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.6), this.inside); glow.position.set(0, 2.6, 0.02); this.group.add(glow);
    for (const [w, h, x, y] of [[0.25, 3.0, -0.88, 2.6], [0.25, 3.0, 0.88, 2.6], [2.0, 0.3, 0, 4.0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), trim); b.position.set(x, y, 0.05); this.group.add(b); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a3a4a, roughness: 0.5 }));
    door.position.set(-0.55, 2.55, 0.5); door.rotation.y = 1.15; this.group.add(door);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.24, 0.45), trim); s.position.set(0, 0.12 + k * 0.24, 2.4 - k * 0.45); this.group.add(s); }
    // the cat, sitting on the top step, looking out
    const catM = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.8 });
    const cat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), catM); body.scale.set(0.8, 1.15, 1.0); body.position.y = 0.24; cat.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), catM); head.position.set(0, 0.55, 0.08); cat.add(head);
    for (const x of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), catM); e.position.set(x, 0.68, 0.06); cat.add(e); }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 12, Math.PI), catM); tail.position.set(0.12, 0.08, -0.05); tail.rotation.set(Math.PI / 2, 0, 0.6); cat.add(tail);
    cat.position.set(0.6, 1.2, 0.5); this.cat = cat; this.group.add(cat);
    this.lit = 0; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const p = track.ground(this.t, this.x, this._p);
    const yaw = this.course.sample(this.t).yaw;
    this.group.position.copy(p);
    this.group.rotation.y = yaw + (this.x > 0 ? Math.PI / 2 : -Math.PI / 2);
    this.lit += ((this.fired ? 1 : 0.3) - this.lit) * Math.min(1, dt);
    this.inside.color.setRGB(1, 0.76, 0.52).multiplyScalar(0.3 + 0.75 * this.lit);
    this.cat.rotation.y = Math.sin(songT * 0.4) * 0.5;
    const S = this.S; if (!S || this.t - rider.t > 40) return;
    this.group.updateMatrixWorld(true);
    const w = new THREE.Vector3(0, 1.2, 2.2).applyMatrix4(this.group.matrixWorld);
    S.pool(w.x, 0.08, w.z, 9, [1, 0.8, 0.55], 0.25 + 0.8 * this.lit);
  }
}

// ---------- the place, per frame: trains, the bus, breath in the air ----------
export class ColdWorld {
  constructor(scene, S) {
    this.S = S;
    const el = S.plan.el;
    this.trains = el ? new ElTrains(S.course, el.x, el.passes) : null;
    this.lastBreath = -1;
  }
  update(S, dt, camera, time) {
    // breath: a small white cloud on each beat, drifting back
    const r = S.rider;
    if (S.view && r && (S.P.breath ?? 0) > 0.01) {
      const b = Math.floor(S.course.beatAt(r.t) / 2);
      if (b !== this.lastBreath) {
        this.lastBreath = b;
        const p = S._bp || (S._bp = new THREE.Vector3());
        S.view.root.getWorldPosition(p); p.y += 1.75;
        const f = S.track.dirAt(r.t, S._bv || (S._bv = new THREE.Vector3()));
        p.addScaledVector(f, 0.35);
        S.sparks.emit(p, f.clone().multiplyScalar(r.v * 0.985).add(new THREE.Vector3(0, 0.25, 0)), new THREE.Color(0.32, 0.35, 0.4).multiplyScalar(S.P.breath), 5, { spread: 0.35, life: 0.4, size: 0.16, grav: -0.2, drag: 0, jitter: 0.12 });
      }
    }
  }
  draw(T, rider, songT) { if (this.trains) this.trains.draw(T, rider, songT); }
}
