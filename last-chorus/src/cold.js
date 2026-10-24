// Technically Thirty-Two. Boston on a clear morning, technically freezing, and no coat.
// Out of the triple-deckers at sunrise with the el beside the street and every train on it
// pulling away; the South End's bow fronts and the last mile of a race; up over the Back Bay
// roofs as the glass tower takes the sun; downtown for a coffee and the free bus; the platform
// where she'd be waiting; the Common in the snow; up Beacon Hill to the gold dome; down to the
// Charles and over it, and home: the door left unlocked, the cat on the step.
// Every chorus the city catches the sun: pigeons go up off the roofs, the lights in the bare
// trees come on and pulse, the frost in the air glitters, the gold dome flashes, the bells go.

import * as THREE from 'three';
import { extend, col, glowAt, poolAt, faceQ } from './scenery.js';
import { BOS, B, C, merge, seeded, muv, tr, brickTexture, brownstoneTexture, clapboardTexture, slateTexture, graniteTexture, farTexture, bosMaterial, glassMaterial, goldMaterial, curtainMaterial, bowHouse, bayHouse, fedHouse, tripleDecker, cityBlock, loftBlock, officeBlock, farBlock } from './bos-kit.js';
import { stateHouse, customHouse, CUSTOM_CLOCK_Y, clockTexture, glassTower, pruTower, oldNorth, OLDNORTH_BELL_Y, bell, beaconTower, BEACON_TOP, zakimTower, ZAKIM, saltPepper, fireTruck, raceGantry, steamStack, elStation, pike, diner, CUP_TOP, rink } from './bos-marks.js';
import { coffeeGeometry } from './pickups.js';
import { RATE } from './course.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- the hill: the Common and Beacon Hill rise under the ride ----------
// Between plan.hill's from and to the ground comes up to a few metres (drop) under the lowest the
// ribbon goes nearby, so the city stands round her instead of far below; level across out to
// `shelf` metres, falling away to the street's height by 300. Everywhere else it's the street at 0.
function bosGround(course, plan) {
  if (course._bosG) return course._bosG;
  const H = plan && plan.hill;
  if (!H) return (course._bosG = { none: true });
  const n = course.n, Y = course.y, w = Math.round(1.4 * RATE), lo = new Float32Array(n);
  // the lowest the ribbon goes within 1.4 s either way, then smoothed (about 0.6 s)
  const dq = new Int32Array(n + 1); let head = 0, tail = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const hi = Math.min(n - 1, i + w);
    while (k <= hi) { while (tail > head && Y[dq[tail - 1]] >= Y[k]) tail--; dq[tail++] = k; k++; }
    while (dq[head] < i - w) head++;
    lo[i] = Y[dq[head]];
  }
  let a = lo; const r = Math.round(0.35 * RATE);
  for (let pass = 0; pass < 3; pass++) {
    const b = new Float32Array(n); let s = 0;
    for (let i = -r; i <= r; i++) s += a[clamp(i, 0, n - 1)];
    for (let i = 0; i < n; i++) { b[i] = s / (2 * r + 1); s += a[clamp(i + r + 1, 0, n - 1)] - a[clamp(i - r, 0, n - 1)]; }
    a = b;
  }
  // level places (the pond): flat, `drop` under the lowest the ribbon goes there (a second either
  // side included), easing in and out over a second
  const at = (t) => clamp(Math.round((t - course.t0) * RATE), 0, n - 1);
  const levels = (H.levels || []).map(([t0, t1, d]) => { let m = Infinity; for (let i = at(t0 - 1.4); i <= at(t1 + 1.4); i++) m = Math.min(m, Y[i]); return [t0, t1, m - (d ?? H.drop ?? 6)]; });
  return (course._bosG = { base: a, levels, from: H.from, to: H.to, ease: H.ease ?? 4, drop: H.drop ?? 6, shelf: H.shelf ?? 130 });
}
// the ground's height at song time t, x across
function gy(c, t, x) {
  const G = c._bosG;
  if (!G || G.none || t <= G.from || t >= G.to) return 0;
  const f = (t - c.t0) * RATE, i = clamp(Math.floor(f), 0, c.n - 2), a = clamp(f - i, 0, 1);
  let y = (G.base[i] + (G.base[i + 1] - G.base[i]) * a - G.drop) * smooth(G.from, G.from + G.ease, t) * (1 - smooth(G.to - G.ease, G.to, t));
  for (const [t0, t1, ly] of G.levels) { const k = smooth(t0 - 1, t0, t) * (1 - smooth(t1, t1 + 1, t)); if (k > 0) y += (ly - y) * k; }
  return Math.max(0, y) * gy.fall(c, x);
}
// how much of the hill's height there is x across: all of it out to the shelf, none by 300
gy.fall = (c, x) => 1 - smooth(c._bosG.shelf ?? 130, 300, Math.abs(x));
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const DECK = 9.2;       // the el's deck height
const LIFTS = (k) => k === 'chorus' || k === 'final';

// ---------- materials and houses, made once per ride ----------
const mats = (M) => M.bosMats || (M.bosMats = (() => {
  const iron = bosMaterial({ rough: 0.45, metal: 0.4, snowK: 0.7, key: 'iron' }); iron.color.set(0x121214);
  const copper = bosMaterial({ rough: 0.6, key: 'copper' }); copper.color.set(0x5e9a86);
  const slateP = bosMaterial({ rough: 0.6, key: 'slateP' }); slateP.color.set(0x3c3e46);
  return {
    brick: bosMaterial({ map: brickTexture(3), tint: true, key: 'brick' }),
    brick2: bosMaterial({ map: brickTexture(8, [13, 0.4, 0.31]), tint: true, key: 'brick2' }),
    brown: bosMaterial({ map: brownstoneTexture(5), tint: true, key: 'brown' }),
    clap: bosMaterial({ map: clapboardTexture(7), tint: true, rough: 0.8, key: 'clap' }),
    granite: bosMaterial({ map: graniteTexture(13), tint: true, key: 'granite' }),
    lime: bosMaterial({ map: graniteTexture(17, [38, 0.14, 0.74]), tint: true, key: 'lime' }),
    slate: bosMaterial({ map: slateTexture(11), tint: true, rough: 0.66, key: 'slate' }),
    tar: bosMaterial({ tint: true, rough: 0.95, key: 'tar' }),
    trim: bosMaterial({ vcol: true, kt: true, rough: 0.66, key: 'trim' }),
    paint: bosMaterial({ vcol: true, rough: 0.6, key: 'paint' }),
    bark: bosMaterial({ tint: true, rough: 0.95, snowK: 1.3, key: 'bark' }),
    iron, copper, slateP,
    glass: glassMaterial(), gold: goldMaterial(),
    ice: bosMaterial({ vcol: true, rough: 0.3, metal: 0.05, snowK: 0, key: 'ice' }),
    curtain: curtainMaterial([0.04, 0.08, 0.11], [1.5, 3.9]), curtainPru: curtainMaterial([0.07, 0.09, 0.11], [2.4, 3.9]),
    farBrick: bosMaterial({ map: farTexture('brick', 17), tint: true, key: 'farb' }),
    farBrown: bosMaterial({ map: farTexture('brown', 19), tint: true, key: 'farn' }),
    farGranite: bosMaterial({ map: farTexture('granite', 23), tint: true, key: 'farg' }),
  };
})());
const houses = (M) => M.bosHouses || (M.bosHouses = { bow: bowHouse(1), bay: bayHouse(2), fed: fedHouse(3), triple: tripleDecker(4), city: cityBlock(5), loft: loftBlock(6), office: officeBlock(7), far: farBlock('mansard'), farFlat: farBlock('flat'), tall: farBlock('tall') });

// the kinds of house a street can be built of: which shape, which wall, which roof, how wide
const TYPES = {
  bow: { geo: 'bow', wall: 'brick', roof: 'slate', w: 6.8, tints: 'brick' },
  bowB: { geo: 'bow', wall: 'brown', roof: 'slate', w: 6.8, tints: 'brown' },
  bay: { geo: 'bay', wall: 'brown', roof: 'tar', w: 6.6, tints: 'brown' },
  bayR: { geo: 'bay', wall: 'brick2', roof: 'tar', w: 6.6, tints: 'brick' },
  fed: { geo: 'fed', wall: 'brick2', roof: 'slate', w: 7.6, tints: 'brick' },
  fedR: { geo: 'fed', wall: 'brick', roof: 'slate', w: 7.6, tints: 'brick' },
  triple: { geo: 'triple', wall: 'clap', roof: 'tar', w: 7.6, gap: 3.6, tints: 'paint' },
  city: { geo: 'city', wall: 'granite', roof: 'tar', w: 14, tints: 'granite' },
  cityL: { geo: 'city', wall: 'lime', roof: 'tar', w: 14, tints: 'granite' },
  cityR: { geo: 'city', wall: 'brick', roof: 'tar', w: 14, tints: 'brick' },
  loft: { geo: 'loft', wall: 'brick2', roof: 'tar', w: 16, tints: 'brick' },
  office: { geo: 'office', wall: 'curtain', roof: 'tar', w: 18, tints: 'granite' },
  far: { geo: 'far', wall: 'farBrick', roof: 'slate', w: 8, tints: 'brick' },
  farB: { geo: 'far', wall: 'farBrown', roof: 'slate', w: 8, tints: 'brown' },
  farG: { geo: 'farFlat', wall: 'farGranite', roof: 'tar', w: 8, tints: 'granite' },
  tall: { geo: 'tall', wall: 'farGranite', roof: 'tar', w: 8, tints: 'granite' },
};
const TINTS = {
  brick: [[1, 1, 1], [1.07, 0.96, 0.92], [0.9, 0.86, 0.88], [1.12, 1.02, 0.94], [0.82, 0.78, 0.8], [1.02, 0.92, 0.98], [0.96, 0.98, 1.0]],
  brown: [[1, 1, 1], [1.12, 1.06, 1.0], [0.88, 0.86, 0.85], [1.05, 0.96, 0.92]],
  granite: [[1, 1, 1], [1.06, 1.03, 0.98], [0.9, 0.9, 0.94], [1.1, 1.06, 1.0]],
  paint: [0xf2e4bc, 0xc6d6e6, 0xefeee8, 0xbfc4c6, 0xc6d2b4, 0xe8cfc2, 0xd8c8a4, 0x8faa96, 0xa8bcd2, 0xf2d898, 0x9aaab8, 0xe0e4e8].map((h) => col(h)),
};
const DOORS = [0x101113, 0x1c3326, 0x7a1414, 0x1a2640, 0x4a1a22, 0x5a3a20, 0x24485a, 0x101113].map((h) => col(h));
const TRIMS = { brick: [0xe8e2d4, 0x3a2a20, 0x1c1c1e, 0xd8ccb0, 0x2a3a2e, 0xe8e2d4], brown: [0x2a2420, 0x3a2a20, 0x1c1c1e], granite: [0xb8b0a0], paint: [0xf2f0ea, 0xf2f0ea, 0xf2f0ea, 0x3a4652, 0x5a2a24] };
for (const k in TRIMS) TRIMS[k] = TRIMS[k].map((h) => col(h));
const PARTS5 = ['W', 'T', 'G', 'R', 'I'];
const LN = {};
for (const k in TYPES) LN[k] = PARTS5.map((p) => 'bosH' + k + p);

// one layer per kind of house and part of it, every one with its own copy of the shape
const tiny = () => new THREE.BoxGeometry(0.01, 0.01, 0.01);
const houseLayers = {};
for (const k in TYPES) {
  const ty = TYPES[k], n = ty.w > 10 ? 160 : 700, h = (M) => houses(M)[ty.geo];
  houseLayers['bosH' + k + 'W'] = (M) => [h(M).wall.clone(), mats(M)[ty.wall], n, { aTint: 3 }];
  houseLayers['bosH' + k + 'T'] = (M) => [h(M).trim ? h(M).trim.clone() : tiny(), mats(M).trim, n, { aDoor: 3, aTrim: 3 }];
  houseLayers['bosH' + k + 'G'] = (M) => [h(M).glass ? h(M).glass.clone() : tiny(), mats(M).glass, n, { aWake: 3 }];
  houseLayers['bosH' + k + 'R'] = (M) => [h(M).roof ? h(M).roof.clone() : tiny(), mats(M)[ty.roof], n, { aTint: 3 }];
  houseLayers['bosH' + k + 'I'] = (M) => [h(M).iron ? h(M).iron.clone() : tiny(), mats(M).iron, n, {}];
}

// the landmarks: which builder, which surface goes in which material
const MARKS = {
  bosState: { build: stateHouse, surf: { brick: 'brick', paint: 'paint', gold: 'gold', glass: 'glass', stone: 'granite' }, max: 2 },
  bosCustom: { build: customHouse, surf: { stone: 'lime', paint: 'paint', glass: 'glass', gold: 'gold', mirror: 'copper' }, max: 2 },
  bosHancock: { build: glassTower, surf: { mirror: 'curtain', paint: 'paint' }, max: 2 },
  bosPru: { build: pruTower, surf: { stone: 'lime', mirror: 'curtainPru', paint: 'paint' }, max: 2 },
  bosOldNorth: { build: oldNorth, surf: { brick: 'brick', paint: 'paint', glass: 'glass', gold: 'gold', mirror: 'slateP' }, max: 2 },
  bosBeacon: { build: beaconTower, surf: { stone: 'lime', paint: 'paint', glass: 'glass' }, max: 3 },
  bosZakim: { build: zakimTower, surf: { paint: 'paint' }, max: 3 },
  bosSalt: { build: saltPepper, surf: { stone: 'granite', mirror: 'slateP', paint: 'paint', glass: 'glass' }, max: 8 },
  bosTruck: { build: fireTruck, surf: { paint: 'paint', glass: 'glass' }, max: 2 },
  bosGantry: { build: raceGantry, surf: { paint: 'paint' }, max: 2 },
  bosStack: { build: steamStack, surf: { paint: 'paint' }, max: 12 },
  bosStation: { build: elStation, surf: { stone: 'granite', paint: 'paint', brick: 'brick', glass: 'glass', mirror: 'copper' }, max: 3 },
  bosPike: { build: pike, surf: { paint: 'paint' }, max: 2 },
  bosDiner: { build: () => diner(coffeeGeometry()), surf: { paint: 'paint', glass: 'glass' }, max: 2 },
  bosRink: { build: rink, surf: { paint: 'paint', mirror: 'ice' }, max: 2 },
};
const TINTED = { brick: 1, brick2: 1, brown: 1, granite: 1, lime: 1, clap: 1, slate: 1, tar: 1, bark: 1 };
const markLayers = {};
for (const k in MARKS) {
  const mk = MARKS[k];
  for (const s in mk.surf) {
    const m = mk.surf[s];
    markLayers[k + s] = (M) => { const g = (M.bosMarkGeo || (M.bosMarkGeo = {}))[k] || (M.bosMarkGeo[k] = mk.build()); return [g[s] ? g[s].clone() : tiny(), mats(M)[m], mk.max, m === 'glass' ? { aWake: 3 } : (TINTED[m] ? { aTint: 3 } : {})]; };
  }
}

// ---------- small things ----------
// a street tree in winter: a trunk that forks into limbs, limbs into branches, branches into
// twigs, each thinner and bending up; and where the lights strung through it hang
function bareTree() {
  const parts = [], lights = [];
  const R = seeded(3), up = new THREE.Vector3(0, 1, 0);
  const seg = (a, b, r0, r1, n) => {
    const d = b.clone().sub(a), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, n, 1, true); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize())); g.translate(a.x, a.y, a.z); parts.push(g);
  };
  const grow = (p, dir, len, r, depth) => {
    const end = p.clone().addScaledVector(dir, len);
    seg(p, end, r, r * 0.62, depth > 1 ? 5 : 3);
    if (depth >= 2) lights.push([end.x, end.y, end.z]);
    if (depth === 1) { for (const f of [0.35, 0.7]) { const q = p.clone().lerp(end, f); lights.push([q.x, q.y, q.z]); } }
    if (depth === 0) return;
    const n = depth === 3 ? 4 : 3;
    for (let k = 0; k < n; k++) {
      const az = k / n * Math.PI * 2 + R() * 1.2, spread = depth === 3 ? 0.75 + R() * 0.25 : 0.5 + R() * 0.35;
      const side = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const nd = dir.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread)); nd.y += 0.25; nd.normalize();
      grow(end.clone().addScaledVector(dir, -len * 0.08 * R()), nd, len * (0.62 + R() * 0.16), r * 0.6, depth - 1);
    }
  };
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 3.4, 0.28, 3);
  return { tree: merge(parts), lights };
}
// the lights in it: a little square of light at each point, turned to the camera in the shader
function lightsGeometry(points) {
  const n = points.length, pos = new Float32Array(n * 12), cor = new Float32Array(n * 8), sd = new Float32Array(n * 4), idx = [];
  const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  points.forEach((p, i) => { const s = hash(i * 3.3 + 1); for (let k = 0; k < 4; k++) { pos.set(p, (i * 4 + k) * 3); cor.set(C4[k], (i * 4 + k) * 2); sd[i * 4 + k] = s; } idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCorner', new THREE.BufferAttribute(cor, 2)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1)); g.setIndex(idx);
  return g;
}
function treeLightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOn: BOS.lights, uBeat: BOS.beat, uTime: BOS.time },
    vertexShader: /* glsl */`
      attribute vec2 aCorner; attribute float aSeed; uniform float uOn, uBeat, uTime; varying vec2 vC; varying float vA;
      void main(){
        vec4 c = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        c.xy += aCorner * 0.24; vC = aCorner;
        vA = uOn * (0.6 + 0.4 * sin(uTime * 3.0 + aSeed * 40.0)) * (0.7 + 0.9 * uBeat);
        gl_Position = projectionMatrix * c;
      }`,
    fragmentShader: `varying vec2 vC; varying float vA; void main(){ float d = dot(vC, vC); gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * (exp(-d * 5.0) + 0.8 * exp(-d * 30.0)) * vA * 1.6, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

// a string of lights hung across the street, sagging in the middle (x from -1 to 1, scaled to the
// street's width per instance; y down by the sag), with the wire
function garlandPoints(n = 34, sag = 0.16) { const p = []; for (let k = 0; k <= n; k++) { const u = k / n * 2 - 1; p.push([u, -sag * (1 - u * u), 0]); } return p; }
function garlandMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOn: BOS.lights, uBeat: BOS.beat, uTime: BOS.time, uBeatN: { value: 0 } },
    vertexShader: /* glsl */`
      attribute vec2 aCorner; attribute float aSeed; attribute float aPhase; uniform float uOn, uBeat, uTime, uBeatN; varying vec2 vC; varying float vA; varying float vH;
      void main(){
        vec4 c = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        c.xy += aCorner * 0.46; vC = aCorner; vH = aSeed;
        // the chase: one string in four takes the beat, the next one the next beat
        float mine = 1.0 - step(0.5, abs(mod(floor(uBeatN) - aPhase, 4.0)));
        vA = uOn * (0.7 + 0.25 * sin(uTime * 4.0 + aSeed * 50.0) + 1.5 * mine * uBeat);
        gl_Position = projectionMatrix * c;
      }`,
    // holiday bulbs: red, green, gold, blue, white
    fragmentShader: `varying vec2 vC; varying float vA; varying float vH; void main(){ float d = dot(vC, vC);
      vec3 c = vH < 0.2 ? vec3(1.0, 0.12, 0.1) : (vH < 0.4 ? vec3(0.15, 1.0, 0.3) : (vH < 0.6 ? vec3(1.0, 0.72, 0.18) : (vH < 0.8 ? vec3(0.2, 0.45, 1.0) : vec3(1.0, 0.95, 0.85))));
      gl_FragColor = vec4((c * exp(-d * 4.0) + vec3(1.0) * 0.9 * exp(-d * 30.0)) * vA * 2.4, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

const KG = {
  // the el: five metres of it, the riveted girders either side with their lattice, the ties
  // and the rails of two tracks on the deck
  elDeck() {
    const p = [], G = 0x40524a, Gd = 0x2c3a34, TIE = 0x2a2420, RAIL = 0x9a9a98;
    for (const x of [-3.75, 3.75]) {
      p.push(tr(B(0.22, 1.5, 5, x, DECK - 0.35, 0), G)); p.push(tr(B(0.55, 0.1, 5, x, DECK - 1.1, 0), Gd)); p.push(tr(B(0.55, 0.1, 5, x, DECK + 0.4, 0), Gd));
      for (let k = 0; k < 4; k++) { const g = B(0.08, 1.75, 0.12, 0, 0, 0); g.rotateX((k % 2 ? 1 : -1) * 0.62); g.translate(x + Math.sign(x) * 0.13, DECK - 0.35, -1.9 + k * 1.25); p.push(tr(g, Gd)); }
    }
    for (let k = 0; k < 8; k++) p.push(tr(B(7.1, 0.16, 0.24, 0, DECK + 0.3, -2.2 + k * 0.62), TIE));
    p.push(tr(B(7.3, 0.12, 5, 0, DECK - 0.0, 0), 0x1c1a18));
    for (const x of [-2.15, -0.85, 0.85, 2.15]) p.push(tr(B(0.09, 0.15, 5, x, DECK + 0.45, 0), RAIL));
    for (const x of [-3.55, 3.55]) p.push(tr(B(0.06, 0.06, 5, x, DECK + 1.25, 0), Gd));
    return merge(p);
  },
  // ... and the bent that holds it up: two riveted columns with flared feet, a cross girder, bracing
  elBent() {
    const p = [], G = 0x40524a, Gd = 0x2c3a34;
    for (const x of [-3.4, 3.4]) { p.push(tr(B(0.55, DECK - 1.0, 0.55, x, (DECK - 1.0) / 2, 0), G)); p.push(tr(B(0.95, 0.7, 0.95, x, 0.35, 0), Gd)); p.push(tr(B(0.8, 0.35, 0.8, x, DECK - 1.15, 0), Gd)); for (let k = 1; k < 5; k++) p.push(tr(B(0.64, 0.08, 0.64, x, k * 1.7, 0), Gd)); }
    p.push(tr(B(8.2, 0.9, 0.7, 0, DECK - 0.8, 0), G));
    for (const s of [-1, 1]) { const g = B(0.16, 6.2, 0.16, 0, 0, 0); g.rotateZ(s * 0.95); g.translate(0, DECK - 3.6, 0); p.push(tr(g, Gd)); }
    for (const x of [-3.9, 3.9]) for (const y of [DECK - 1.15, DECK + 0.5]) p.push(tr(C(0.07, 0.07, 0.1, 6, x, y, 0), Gd));
    return merge(p);
  },
  // a city block far off the street: its snowy roof, the party walls, chimneys, hatches
  fillRoof() {
    const p = [];
    p.push(tr(B(26.4, 0.5, 24.4, 0, 0.25, 0), 0x3a3634));
    const R = seeded(29);
    for (let k = 0; k < 4; k++) p.push(tr(B(0.8, 0.5, 23.6, -9.75 + k * 6.5, 0.6, 0), 0x6a4a3c));
    for (let k = 0; k < 9; k++) p.push(tr(B(0.8, 1.6 + R() * 1.2, 1.4, -12 + R() * 24, 1.2, -11 + R() * 22), 0x7a4a38));
    for (let k = 0; k < 5; k++) p.push(tr(B(1.6, 1.0, 1.6, -11 + R() * 22, 0.9, -10 + R() * 20), 0x5a5a5c));
    return merge(p);
  },
  // an Orange Line car: steel body, rounded roof, the orange band, end windows
  car() {
    const p = [];
    p.push(B(3.0, 2.9, 15, 0, 1.75, 0));
    const roof = new THREE.CylinderGeometry(1.5, 1.5, 15, 12, 1, false, -Math.PI / 2, Math.PI); roof.rotateX(Math.PI / 2); roof.scale(1, 0.28, 1); roof.translate(0, 3.2, 0); p.push(roof);
    p.push(B(2.6, 0.5, 14.6, 0, 0.1, 0));
    for (const z of [-5.2, 5.2]) p.push(B(2.4, 0.6, 2.2, 0, -0.35, z));
    return merge(p);
  },
  // someone in a winter coat: legs, the long coat, a scarf, the head, a hat (k 1: the coat
  // takes the instance's colour)
  person(coat = 0x2a2a34, scarf = 0xb0202a, k = 0) {
    const p = [];
    for (const s of [-1, 1]) p.push(tr(C(0.08, 0.09, 0.8, 6, s * 0.11, 0.4, 0), 0x1a1a1e));
    p.push(tr(new THREE.CylinderGeometry(0.2, 0.34, 1.05, 10).translate(0, 1.25, 0), coat, k));
    p.push(tr(C(0.17, 0.2, 0.18, 10, 0, 1.82, 0), scarf));
    p.push(tr(new THREE.SphereGeometry(0.13, 10, 8).translate(0, 2.0, 0), 0xd8a888));
    p.push(tr(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.06, 0), 0x2a1a14));
    for (const s of [-1, 1]) p.push(tr(C(0.06, 0.07, 0.75, 6, s * 0.26, 1.4, 0.04).rotateZ(s * 0.12), coat, k));
    return merge(p);
  },
  // a granite memorial in the Common: steps, a tall slab, its cap (the words are a sign face)
  stone() { return merge([muv(B(18, 1.2, 7, 0, 0.6, -1)), muv(B(16.5, 1.2, 5.5, 0, 1.8, -1)), muv(B(15, 20, 2.2, 0, 12.4, -1.1)), muv(B(16, 1.2, 3, 0, 23, -1.1))]); },
  // a street lamp: the black post, the arm, the acorn
  lamp() {
    const p = [];
    p.push(tr(C(0.09, 0.14, 4.6, 8, 0, 2.3, 0), 0x141416));
    p.push(tr(C(0.2, 0.24, 0.6, 8, 0, 0.3, 0), 0x141416));
    p.push(tr(C(0.16, 0.12, 0.3, 8, 0, 4.7, 0), 0x141416));
    p.push(tr(new THREE.SphereGeometry(0.32, 10, 8).scale(1, 1.25, 1).translate(0, 5.15, 0), 0xfff4dc));
    p.push(tr(new THREE.ConeGeometry(0.3, 0.4, 8).translate(0, 5.65, 0), 0x141416));
    return merge(p);
  },
  // a gas lamp up the hill: the post, the ladder bar, the four-sided lantern with its cap
  gasLamp() {
    const p = [];
    p.push(tr(C(0.07, 0.11, 3.2, 8, 0, 1.6, 0), 0x121214));
    p.push(tr(C(0.18, 0.2, 0.5, 8, 0, 0.25, 0), 0x121214));
    p.push(tr(B(0.7, 0.05, 0.05, 0, 2.6, 0), 0x121214));
    p.push(tr(new THREE.CylinderGeometry(0.3, 0.18, 0.75, 4).rotateY(Math.PI / 4).translate(0, 3.6, 0), 0xffe6b0));
    p.push(tr(new THREE.ConeGeometry(0.36, 0.42, 4).rotateY(Math.PI / 4).translate(0, 4.18, 0), 0x121214));
    p.push(tr(C(0.03, 0.03, 0.18, 4, 0, 4.45, 0), 0x121214));
    return merge(p);
  },
  // a lyric painted on the brick end wall of a building: the wall and its cornice
  wallSign() {
    const p = [];
    p.push(muv(B(15.5, 23, 1.6, 0, 11.5, -0.8)));
    return merge(p);
  },
  wallTrim() { return merge([tr(B(16.2, 0.7, 2.2, 0, 23.2, -0.6), 0xd8d0c0), tr(B(15.5, 0.25, 0.12, 0, 12.6, 0.06), 0xd8d0c0), tr(B(15.5, 0.25, 0.12, 0, 18.6, 0.06), 0xd8d0c0)]); },
  // the time and temperature, the bank's sign up on its tall post at the kerb
  tempSign() { return merge([tr(C(0.32, 0.4, 16, 10, 0, 8, 0), 0x2a2a30), tr(B(1.4, 0.8, 1.4, 0, 0.4, 0), 0x2a2a30), tr(B(6.4, 3.0, 0.6, 0, 17.4, 0), 0x1a1a20), tr(B(6.8, 0.2, 0.8, 0, 19.0, 0), 0x3a3a40)]); },
  zDeck() { return merge([tr(B(1.4, 1.6, 5, 0, -0.8, 0), 0xdadcde), tr(B(0.12, 1.1, 5, 0.6, 0.55, 0), 0x9aa0a6)]); },
  cable() { return merge([tr(B(0.14, 0.14, 1, 0, 0, 0.5), 0xf2f4f6)]); },
  clockHand(len, w) { return merge([tr(B(w, len, 0.16, 0, len / 2 - 0.4, 0), 0x101012)]); },
};

function carMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.6 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint; vOP = position; vON = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float side = step(0.5, abs(vON.x)) * step(0.3, vOP.y);
        float endF = step(0.5, abs(vON.z)) * step(7.4, abs(vOP.z));
        float win = step(1.75, vOP.y) * step(vOP.y, 2.75) * step(0.18, fract(vOP.z / 1.9 + 0.05)) * side;
        float ewin = step(1.6, vOP.y) * step(vOP.y, 2.7) * step(abs(vOP.x), 1.25) * endF;
        float door = step(0.45, vOP.y) * step(vOP.y, 2.95) * step(abs(fract(vOP.z / 7.5) - 0.5), 0.07) * side;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.05, 0.07), max(win, ewin) * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.64, 0.66), door * 0.6);
        totalEmissiveRadiance += vec3(1.0, 0.92, 0.78) * (win * 0.45 + ewin * 0.8);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.38, 0.06), step(abs(vOP.y - 1.2), 0.16) * (side + endF));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.1, 0.11), step(vOP.y, 0.35));`);
  };
  return m;
}

function tempTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 230;
  const g = c.getContext('2d');
  g.fillStyle = '#080706'; g.fillRect(0, 0, 512, 230);
  // the bulbs: a dot matrix of amber, lit where the letters are
  const t = document.createElement('canvas'); t.width = 64; t.height = 28; const tg = t.getContext('2d');
  tg.fillStyle = '#000'; tg.fillRect(0, 0, 64, 28); tg.fillStyle = '#fff'; tg.font = '700 24px "Courier New", monospace'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText('32°F', 32, 15);
  const d = tg.getImageData(0, 0, 64, 28).data;
  for (let y = 0; y < 28; y++) for (let x = 0; x < 64; x++) {
    const on = d[(y * 64 + x) * 4] > 100;
    g.fillStyle = on ? '#ffc060' : '#2a1a0a'; g.shadowColor = '#ff9a3a'; g.shadowBlur = on ? 10 : 0;
    g.beginPath(); g.arc(8 + x * 7.9, 9 + y * 7.9, on ? 3.3 : 2.2, 0, 6.283); g.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

const TT = { aTint: 3 };
const _ep = new THREE.Euler(0, 0, 0, 'YXZ');
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _z = new THREE.Vector3(0, 0, 1);

// a row of houses filling the street from song time t to t + span, whatever her speed: as many
// houses as fit, each a hair wider or narrower, turned to face the road
function drawRow(S, it) {
  const ty = TYPES[it.kind], Ls = S.layers, names = LN[it.kind];
  if (!S.track) { for (const k of names) void Ls[k]; return; }
  const a = S.track.ground(it.t, it.x, _a), b = S.track.ground(it.t + it.span, it.x, _b);
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  if (L < 2) return;
  const pitch = ty.w + (ty.gap ?? 0);
  const n = Math.max(1, Math.round(L / pitch));
  const sx = ty.gap ? 1 : L / n / ty.w;
  _e.set(0, Math.atan2(dx, dz) + SIDE(it.x), 0); _q.setFromEuler(_e);
  const tints = TINTS[ty.tints], trims = TRIMS[ty.tints] || TRIMS.brick;
  const iron = !it.noIron && it.t - (S.tNow ?? 0) < 14;
  // each house's colours worked out once and kept on the item (nothing made per frame)
  const H = it._h || (it._h = []);
  for (let k = 0; k < n; k++) {
    let c = H[k];
    if (!c) {
      const h = hash(it.seed * 977 + k * 13.17), h2 = hash(it.seed * 311 + k * 7.31), h3 = hash(it.seed * 53 + k * 3.7);
      c = H[k] = { sy: it.sy ?? (0.97 + 0.08 * h3), w: { aTint: tints[Math.floor(h * tints.length)] }, t: { aDoor: DOORS[Math.floor(h2 * DOORS.length)], aTrim: trims[Math.floor(h3 * trims.length)] }, g: { aWake: [0, h, 0] }, r: { aTint: [0.9 + 0.2 * h2, 0.9 + 0.2 * h2, 0.92 + 0.2 * h2] } };
    }
    const u = (k + 0.5) / n;
    _c.set(a.x + dx * u, (it.h || 0) + gy(S.course, it.t + it.span * u, it.x), a.z + dz * u);
    _m.compose(_c, _q, _s.set(sx, c.sy, 1));
    c.g.aWake[0] = it.wakeNow ?? 0;
    Ls[names[0]].add(_m, c.w); Ls[names[1]].add(_m, c.t); Ls[names[2]].add(_m, c.g); Ls[names[3]].add(_m, c.r);
    if (iron) Ls[names[4]].add(_m);
  }
}

// a length of something along the street from t to t + span in pieces of `piece` metres
// (leaves the start point in _a and returns the heading, for whatever stands at its start)
function chord(S, t0, t1, x, y, layer, piece, attrs) {
  const a = S.track.ground(t0, x, _a), b = S.track.ground(t1, x, _b);
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  if (L < 0.5) return null;
  const yaw = Math.atan2(dx, dz), n = Math.max(1, Math.round(L / piece)), sz = L / n / piece;
  for (let k = 0; k < n; k++) {
    // up the hill each piece tilts to the slope, so the el climbs it instead of stepping
    const ya = gy(S.course, t0 + (t1 - t0) * k / n, x), yb = gy(S.course, t0 + (t1 - t0) * (k + 1) / n, x);
    _ep.set(-Math.atan2(yb - ya, L / n), yaw, 0); _q.setFromEuler(_ep);
    const u = (k + 0.5) / n; _c.set(a.x + dx * u, y + (ya + yb) / 2, a.z + dz * u); _m.compose(_c, _q, _s.set(1, 1, sz)); S.layers[layer].add(_m, attrs);
  }
  return yaw;
}
// the el: a length of it in five-metre pieces, a bent at its start
function drawEl(S, it) {
  const Ls = S.layers;
  if (!S.track) { void Ls.bosElDeck; void Ls.bosElBent; return; }
  const yaw = chord(S, it.t, it.t + it.span, it.x, 0, 'bosElDeck', 5);
  if (yaw === null) return;
  _e.set(0, yaw, 0); _q.setFromEuler(_e);
  _a.y = gy(S.course, it.t, it.x);
  _m.compose(_a, _q, _s.set(1, 1, 1)); Ls.bosElBent.add(_m);
}

// the city out past the street, block after block: walls of painted fronts and a snowy roof
const FILLS = { low: ['farBrick', 13], lowB: ['farBrown', 13], mid: ['farBrick', 22], midG: ['farGranite', 24], tall: ['farGranite', 46], glassM: ['curtain', 34], glassT: ['curtainPru', 70] };
const fillLayers = {};
for (const k in FILLS) fillLayers['bosFill' + k] = (M) => [muv(B(26, FILLS[k][1], 24, 0, FILLS[k][1] / 2, 0)), mats(M)[FILLS[k][0]], 900, { aTint: 3 }];

// the skyline far off all round: low roofs, steeples, a few mid-rises, two clusters of towers
function skylineMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uSil: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uK: { value: 0.3 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSil, uFog, uSun; uniform float uK; varying vec3 vP;
      float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
      void main(){
        float ang = atan(vP.z, vP.x), y = vP.y;
        float c = floor(ang * 700.0);
        float low = 16.0 + 18.0 * h1(c) + 14.0 * n1(ang * 9.0) + 30.0 * pow(n1(ang * 2.3 + 4.0), 3.0);
        float c2 = floor(ang * 150.0);
        float mid = (34.0 + 70.0 * h1(c2 + 3.0)) * step(0.7, h1(c2 + 9.0)) * smoothstep(0.3, 0.65, n1(ang * 3.0 + 1.0));
        float c3 = floor(ang * 70.0);
        float cl = max(exp(-pow((ang - 1.32) / 0.07, 2.0)), exp(-pow((ang - 2.08) / 0.1, 2.0)));
        float tall = (70.0 + 130.0 * h1(c3 + 5.0)) * step(0.5, h1(c3 + 11.0)) * cl;
        float sc = floor(ang * 1800.0), su = fract(ang * 1800.0);
        float spire = step(0.995, h1(sc + 2.0)) * (34.0 + 22.0 * h1(sc)) * (1.0 - abs(su - 0.5) * 2.0);
        float h = max(max(low, mid), max(tall, spire));
        if (y > h) discard;
        vec3 col = mix(uFog, uSil, 0.42 + 0.22 * smoothstep(0.0, 140.0, y));
        float glint = step(low + 1.0, y) * step(mid + 1.0, y) * cl * step(0.6, fract(y / 4.0)) * step(0.3, h1(c3 + floor(y / 4.0)));
        col += uSun * glint * 0.12 * uK;
        col = mix(col, uFog, 0.3 * (1.0 - smoothstep(0.0, 50.0, y)));
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
}

// the Charles in January: dark water with the sky in it at a slant, the sun's glitter, sheets
// of ice drifting; a strip laid along the road every frame, the way the street is
class River {
  constructor(scene, cfg) {
    this.cfg = cfg; this.N = 140;
    const N = this.N, g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 4 * 3);
    const idx = []; for (let i = 0; i < N - 1; i++) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = a + 1, c = a + 4, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uSkyTop: BOS.skyTop, uSkyLow: BOS.skyLow, uSun: BOS.sun, uSunDir: BOS.sunDir, uFog: BOS.fog, uFogD: BOS.fogD, uCam: BOS.cam, uTime: BOS.time },
      vertexShader: `varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSkyTop, uSkyLow, uSun, uSunDir, uFog, uCam; uniform float uFogD, uTime; varying vec3 vWP;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec3 V = normalize(uCam - vWP); vec2 p = vWP.xz;
          float n = n2(p * 0.018) * 0.55 + n2(p * 0.06 + 3.0) * 0.3 + n2(p * 0.22 + 7.0) * 0.15;
          float ice = smoothstep(0.56, 0.6, n);
          vec3 N = normalize(vec3((n2(p * 0.5 + uTime * 0.4) - 0.5) * 0.14, 1.0, (n2(p * 0.5 + 17.0 - uTime * 0.35) - 0.5) * 0.14));
          vec3 R = reflect(-V, N);
          vec3 sky = mix(uSkyLow, uSkyTop, smoothstep(0.0, 0.45, R.y));
          float F = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 col = mix(vec3(0.03, 0.055, 0.08), sky * 0.92, F);
          col += uSun * pow(max(dot(R, normalize(uSunDir)), 0.0), 160.0) * 7.0 * (0.5 + n2(p * 2.0 + uTime * 3.0));
          vec3 iceC = vec3(0.86, 0.9, 0.95) * (0.82 + 0.18 * n2(p * 0.7)) * (uSkyLow * 0.55 + uSun * 0.45);
          col = mix(col, iceC, ice);
          col = mix(col, iceC * 0.8, smoothstep(0.54, 0.56, n) * (1.0 - ice) * 0.5);
          float d = length(uCam - vWP), fog = 1.0 - exp(-pow(d * uFogD, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -1; scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(track, rider) {
    const { from, to, home } = this.cfg, N = this.N, t0 = rider.t - 3, t1 = rider.t + 44;
    const show = t1 > from && t0 < to; this.mesh.visible = show; if (!show) return;
    const p = this._p, q = this._q || (this._q = new THREE.Vector3()), xs = this._xs || (this._xs = [-360, -11, 11, 360]);
    for (let i = 0; i < N; i++) {
      const t = clamp(t0 + (t1 - t0) * i / (N - 1), from, to);
      xs[3] = home !== undefined && t > home ? 11 : 360;
      // the middle and which way is across, once a row
      track.ground(t, 0, p); track.ground(t, 1, q); const rx = q.x - p.x, rz = q.z - p.z;
      for (let j = 0; j < 4; j++) { const o = (i * 4 + j) * 3; this.pos[o] = p.x + rx * xs[j]; this.pos[o + 1] = 0.1; this.pos[o + 2] = p.z + rz * xs[j]; }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// the Common and Beacon Hill under the snow: a strip of ground laid along the road every frame at
// the hill's height, the same snow, blocks and cross streets as the city's ground (which stays
// flat underneath and takes over where the hill comes down); the slopes catch the sun a little
const HX = [-300, -230, -175, -135, -105, -80, -60, -45, -33, -24, -18, -15.4, -9, 0, 9, 15.4, 18, 24, 33, 45, 60, 80, 105, 135, 175, 230, 300];
class Hill {
  constructor(scene, course, from, to, roads) {
    this.c = course; this.from = from; this.to = to; this.N = 110;
    // how wide the road (or the path) is at t, the ground lying a little lower under it
    this.roads = (roads || []).filter((r) => r.follow).map((r) => [r.from ?? -1e9, r.to ?? 1e9, (r.width ?? 22) / 2 + (r.walk ?? 0) + 0.5]);
    const N = this.N, M = HX.length, g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3);
    const idx = []; for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCam: BOS.cam, uFog: BOS.fog, uFogD: BOS.fogD, uSunDir: BOS.sunDir, uGround: { value: new THREE.Color() }, uStreet: { value: new THREE.Color() }, uSnow: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uCam, uFog, uSunDir, uGround, uStreet; uniform float uFogD, uSnow; varying vec3 vW;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec2 p = vW.xz;
          vec3 col = uGround * (0.75 + 0.25 * h2(floor(p / 37.0)));
          vec2 q = mat2(0.96, -0.28, 0.28, 0.96) * p;
          vec2 f = abs(fract(q / 92.0) - 0.5);
          float street = smoothstep(0.035, 0.0, min(0.5 - f.x, 0.5 - f.y));
          float lamps = smoothstep(0.08, 0.0, length(fract(q / 23.0) - 0.5)) * street;
          col = mix(col, uStreet * 0.35, street * 0.8);
          col += uStreet * lamps * 3.5;
          col = mix(col, vec3(0.72, 0.77, 0.86) * (0.85 + 0.2 * h2(floor(p / 5.0))), uSnow * 0.7 * (1.0 - street * 0.6));
          vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); N *= sign(N.y + 1e-4);
          vec3 L = normalize(uSunDir);
          col *= clamp(1.0 + 1.2 * (dot(N, L) - L.y), 0.55, 1.45);
          float d = length(uCam - vW), fog = 1.0 - exp(-pow(d * uFogD, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(track, rider, P) {
    const t0 = Math.max(this.from, rider.t - 4), t1 = Math.min(this.to, rider.t + 46);
    const show = t1 > t0 + 0.05; this.mesh.visible = show; if (!show) return;
    const u = this.mat.uniforms; u.uGround.value.set(P.ground); u.uStreet.value.set(P.street); u.uSnow.value = P.snowGround ?? 0;
    const N = this.N, M = HX.length, pos = this.pos, p = this._p, q = this._q || (this._q = new THREE.Vector3());
    const fall = this._fall || (this._fall = HX.map((x) => gy.fall(this.c, x)));
    for (let i = 0; i < N; i++) {
      const t = t0 + (t1 - t0) * i / (N - 1);
      let hw = 0; for (const [a, b, w] of this.roads) if (t >= a - 0.3 && t <= b + 0.3) hw = Math.max(hw, w);
      // the street's middle and which way is across, once a row (a ground lookup is not cheap)
      track.ground(t, 0, p); track.ground(t, 1, q); const rx = q.x - p.x, rz = q.z - p.z, y0 = gy(this.c, t, 0);
      for (let j = 0; j < M; j++) {
        const x = HX[j];
        // under the road it lies a little lower, so the road (which follows it) is always on top
        const o = (i * M + j) * 3; pos[o] = p.x + rx * x; pos[o + 1] = y0 * fall[j] + (Math.abs(x) < hw ? -0.3 : 0.06); pos[o + 2] = p.z + rz * x;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// colours made once, not every frame
const PIKE_LANES = [[-11, 1, 9], [-6.7, 1, 7], [6.7, -1, 8], [11, -1, 10]];
const CAR_COLS = [0xb0141a, 0xe8e8e8, 0x1a1a1e, 0x2a4a7a, 0x8a8a90, 0xd8c070].map((h) => col(h));
const SKATE_COLS = [0xb0202a, 0x2a4a8a, 0xe8c040, 0x2a6a3a, 0x6a2a6a, 0xe8e8e8].map((h) => ({ aDoor: col(h), aTrim: [1, 1, 1] }));
const HEAD = [1, 0.94, 0.8], TAIL = [1, 0.1, 0.1];
const CAR_TINT = { aTint: [0.82, 0.85, 0.88] }, CAR_HEAD = [1, 0.96, 0.85], CAR_SIGN = [1, 0.6, 0.2];
const WARM = [1, 0.78, 0.45], WARM_POOL = [1, 0.75, 0.45], GOLD_GLOW = [1, 0.8, 0.4], RED = [1, 0.06, 0.05], WHITE3 = [1, 1, 1], RINK_LAMP = [1, 0.9, 0.7], PLATFORM = [1, 0.86, 0.62], HER_LIGHT = [1, 0.82, 0.6], STROBE = [1, 0.08, 0.06], BEACON_RED = [1, 0.1, 0.08], BEACON_BLUE = [0.25, 0.5, 1], HALL = [1, 0.8, 0.55], HALL_POOL = [1, 0.78, 0.5], STONE_TINT = { aTint: [1, 1, 1.03] };
const TRUCK_LIGHTS = [[-0.6, 3.5, 6.0, 2], [0.6, 3.5, 6.0, 3], [-1.3, 2.2, -4.7, 3], [1.3, 2.2, -4.7, 2]], RINK_POSTS = [[-40, -20], [40, -20], [-40, 20], [40, 20]];

// the things a landmark does by itself, every frame
const MARK_LIFE = {
  bosState(S, it, p, q, M) {
    _c.set(0, 42.5, -12).applyMatrix4(M);
    glowAt(S, _c.x, _c.y, _c.z, 14 * (it.s ?? 1), GOLD_GLOW, 0.25 + 0.5 * BOS.flash.value);
  },
  bosCustom(S, it, p, q, M) {
    // the four clocks, the hands going round with the song: 7:40 at the start, 8:00 at the end
    const t = S.tNow ?? 0, min = 40 + 20 * clamp(t / 220, 0, 1), am = min / 60 * Math.PI * 2, ah = (7 + min / 60) / 12 * Math.PI * 2;
    for (let s = 0; s < 4; s++) {
      _e.set(0, s * Math.PI / 2, 0); _q2.setFromEuler(_e);
      _c.set(0, CUSTOM_CLOCK_Y, 11.2).applyQuaternion(_q2); _m2.compose(_c, _q2, _s.set(1, 1, 1)); _m2.premultiply(M);
      S.layers.bosClockFace.add(_m2);
      for (const [layer, a] of [['bosClockMin', am], ['bosClockHour', ah]]) {
        _e.set(0, s * Math.PI / 2, 0, 'YXZ'); _q2.setFromEuler(_e); _q.setFromAxisAngle(_z, -a); _q2.multiply(_q);
        _c.set(0, CUSTOM_CLOCK_Y, 11.5).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s * Math.PI / 2);
        _m2.compose(_c, _q2, _s.set(1, 1, 1)); _m2.premultiply(M); S.layers[layer].add(_m2);
      }
    }
  },
  bosOldNorth(S, it, p, q, M) {
    // the bell: swings on the beat, wide in a chorus
    const c = S.course, b = c.beatAt(S.tNow ?? 0), amp = S.beatLamps ? 0.75 : 0.18;
    _e.set(Math.sin(b * Math.PI) * amp, 0, 0); _q2.setFromEuler(_e);
    _m2.compose(_c.set(0, OLDNORTH_BELL_Y + 2.4, 0), _q2, _s.set(1.3, 1.3, 1.3)); _m2.premultiply(M); S.layers.bosBell.add(_m2);
  },
  bosBeacon(S, it, p, q, M) {
    // steady blue, clear view; flashing red, snow instead
    const snow = (S.P.snow ?? 0) > 0.2, on = snow ? (Math.sin((S.tNow ?? 0) * Math.PI * 2 * 0.9) > 0 ? 1 : 0.05) : 1;
    const c = snow ? BEACON_RED : BEACON_BLUE;
    for (let k = 0; k < 6; k++) { _c.set(0, BEACON_TOP + 3 + k * 4.6, 0).applyMatrix4(M); glowAt(S, _c.x, _c.y, _c.z, 4.6 * (it.s ?? 1), c, 1.6 * on); }
  },
  bosZakim(S, it, p, q, M) {
    // the cables: fans from the top of the tower down to the edges of the deck, both ways
    const sc = it.s ?? 1, c = S.course;
    const top = (S._bosTop || (S._bosTop = new THREE.Vector3())).set(0, ZAKIM.top, 0).applyMatrix4(M);
    for (const dir of [-1, 1]) for (const side of [-1, 1]) for (let k = 1; k <= 13; k++) {
      const tk = it.t + dir * k * (it.fan ?? 0.12);
      const A = S.track.ground(tk, side * 15.5 * sc, _a); A.y = c.sample(tk).y - 1.3;
      const d = _b.copy(top).sub(A), L = d.length();
      _q2.setFromUnitVectors(_z, d.multiplyScalar(1 / L));
      _m2.compose(A, _q2, _s.set(1, 1, L)); S.layers.bosCable.add(_m2);
    }
    // the deck's edges under the anchors
    for (const side of [-1, 1]) chordFollow(S, it.t - 13 * (it.fan ?? 0.12) - 0.1, it.t + 13 * (it.fan ?? 0.12) + 0.1, side * 15.5 * sc, 'bosZDeck', 5);
  },
  bosTruck(S, it, p, q, M) {
    const t = S.tNow ?? 0;
    for (const [x, y, z, m] of TRUCK_LIGHTS) { _c.set(x, y, z).applyMatrix4(M); glowAt(S, _c.x, _c.y, _c.z, 2.4, m === 2 ? RED : WHITE3, 2.4, m); }
    void t;
  },
  bosStack(S, it, p, q, M) { _c.set(0, 3.3, 0).applyMatrix4(M); (S.bosEmit || (S.bosEmit = [])).push([_c.x, _c.y, _c.z, it.rate ?? 1, it.big ?? 1]); },
  // the Pike: two lanes each way, the traffic going by under the road
  bosPike(S, it, p, q, M) {
    const t = S.tNow ?? 0, yaw = S.course.sample(it.t).yaw;
    for (const [z, dir, n] of PIKE_LANES) for (let k = 0; k < n; k++) {
      const x = ((k / n * 360 + t * (24 + 4 * Math.abs(z) / 11) * dir + hash(k + z) * 30) % 360 + 360) % 360 - 180;
      _c.set(x, 0.12, z).applyMatrix4(M);
      S.parkedCar(_c.x, _c.y, _c.z, yaw + (dir > 0 ? Math.PI / 2 : -Math.PI / 2), CAR_COLS[k % 6]);
      const fx = dir > 0 ? 1 : -1; _d.set(x + fx * 2.3, 0.7, z).applyMatrix4(M); glowAt(S, _d.x, _d.y, _d.z, 1.4, HEAD, 1.1);
      _d.set(x - fx * 2.3, 0.7, z).applyMatrix4(M); glowAt(S, _d.x, _d.y, _d.z, 1.2, TAIL, 0.9);
    }
  },
  // the diner: steam off the cup on its roof, the sign on its post
  bosDiner(S, it, p, q, M) {
    _c.set(0, CUP_TOP + 0.6, 0).applyMatrix4(M); (S.bosEmit || (S.bosEmit = [])).push([_c.x, _c.y, _c.z, 0.9, 1.3]);
    _c.set(-11.5, 0, 4).applyMatrix4(M); _m2.compose(_c, faceQ(S, it), _s.set(1, 1, 1)); S.layers.sign.add(_m2, { aIdx: S.atlas.index.DINER, aWake: [1, 0] });
  },
  // the Frog Pond: families going round, the little ones between their parents
  bosRink(S, it, p, q, M) {
    const t = S.tNow ?? 0;
    for (let k = 0; k < 26; k++) {
      const kid = k % 3 === 1, lane = 0.55 + 0.35 * hash(k * 1.7), w = 0.1 + 0.06 * hash(k * 2.3), a = t * w + k / 26 * Math.PI * 2;
      _c.set(Math.cos(a) * 34 * lane, 0.12, Math.sin(a) * 16 * lane);
      _e.set(0, -a + Math.PI, Math.sin(t * 2.4 + k) * 0.08); _q2.setFromEuler(_e);
      _m2.compose(_c, _q2, _s.setScalar(kid ? 0.75 : 1.2)); _m2.premultiply(M);
      S.layers.bosSkater.add(_m2, SKATE_COLS[k % 6]);
    }
    for (const [x, z] of RINK_POSTS) { _c.set(x, 6.5, z).applyMatrix4(M); glowAt(S, _c.x, _c.y, _c.z, 3, RINK_LAMP, 0.9); }
  },
  bosStation(S, it, p, q, M) {
    for (let k = 0; k < 5; k++) { _c.set(-6.6, DECK + 4.3, -20 + k * 10).applyMatrix4(M); glowAt(S, _c.x, _c.y, _c.z, 2.2, PLATFORM, 0.9 + 0.6 * it.wakeNow); }
    if (it.who) {
      // her, at the edge of the platform, turned to the tracks
      _e.set(0, Math.PI / 2, 0); _q2.setFromEuler(_e);
      _m2.compose(_c.set(-4.8, DECK + 0.5, it.whoZ ?? 4), _q2, _s.set(1.5, 1.5, 1.5)); _m2.premultiply(M); S.layers.bosHer.add(_m2);
      _c.set(-5.2, DECK + 4.2, it.whoZ ?? 4).applyMatrix4(M); glowAt(S, _c.x, _c.y, _c.z, 3.2, HER_LIGHT, 1.3);
    }
    for (let k = 0; k < (it.crowd ?? 0); k++) { _e.set(0, Math.PI / 2 + (hash(k) - 0.5), 0); _q2.setFromEuler(_e); _m2.compose(_c.set(-6.2 - hash(k * 3) * 1.5, DECK + 0.5, -14 + k * 4.1 + hash(k * 7)), _q2, _s.set(1.15, 1.15, 1.15)); _m2.premultiply(M); S.layers.bosCrowd.add(_m2); }
  },
};
// a length of the Zakim's deck edge, following the ribbon's height
function chordFollow(S, t0, t1, x, layer, piece) {
  const c = S.course, n = Math.max(1, Math.ceil((t1 - t0) / 0.08));
  for (let k = 0; k < n; k++) {
    const ta = t0 + (t1 - t0) * k / n, tb = t0 + (t1 - t0) * (k + 1) / n;
    const a = S.track.ground(ta, x, _a), b = S.track.ground(tb, x, _b);
    a.y = c.sample(ta).y - 1.2; b.y = c.sample(tb).y - 1.2;
    const d = _d.copy(b).sub(a), L = d.length(); if (L < 0.2) continue;
    _q2.setFromUnitVectors(_z, d.multiplyScalar(1 / L));
    _c.copy(a).add(b).multiplyScalar(0.5);
    _m2.compose(_c, _q2, _s.set(1, 1, L / piece)); S.layers[layer].add(_m2);
  }
}

extend({
  layers: {
    ...houseLayers,
    ...fillLayers,
    ...markLayers,
    bosFillRoof: (M) => [KG.fillRoof(), mats(M).paint, 2200, {}],
    bosBare: (M) => [(M.bosTreeG || (M.bosTreeG = bareTree())).tree.clone(), mats(M).bark, 700, TT],
    bosTreeLights: (M) => [lightsGeometry((M.bosTreeG || (M.bosTreeG = bareTree())).lights), M.bosTreeLM || (M.bosTreeLM = treeLightMaterial()), 700, {}],
    bosElDeck: (M) => [KG.elDeck(), mats(M).paint, 900, {}],
    bosElBent: (M) => [KG.elBent(), mats(M).paint, 300, {}],
    bosElCar: (M) => [KG.car(), M.bosCarM || (M.bosCarM = carMaterial()), 60, TT],
    bosHer: (M) => [KG.person(0x8a1a2a, 0xe8e2d4), mats(M).paint, 4, {}],
    bosCrowd: (M) => [KG.person(), mats(M).paint, 40, {}],
    bosLamp: (M) => [KG.lamp(), mats(M).paint, 500, {}],
    bosGasLamp: (M) => [KG.gasLamp(), mats(M).paint, 400, {}],
    bosWallSign: (M) => [KG.wallSign(), mats(M).brick, 24, TT],
    bosWallTrim: (M) => [KG.wallTrim(), mats(M).paint, 24, {}],
    bosWallFace: (M) => [(() => { const g = new THREE.PlaneGeometry(14, 4.375); g.translate(0, 15.6, 0.06); return g; })(), M.sign, 24, { aIdx: 1, aWake: 2 }],
    bosBannerFace: (M) => [(() => { const g = new THREE.PlaneGeometry(22, 6.875); g.translate(0, 17.5, 0.3); const g2 = g.clone(); g2.rotateY(Math.PI); return merge([g, g2]); })(), M.sign, 4, { aIdx: 1, aWake: 2 }],
    bosTempSign: (M) => [KG.tempSign(), mats(M).paint, 4, {}],
    bosTempFace: (M) => [(() => { const g = new THREE.PlaneGeometry(6.0, 2.7); g.translate(0, 17.4, 0.31); return g; })(), M.bosTempM || (M.bosTempM = new THREE.MeshBasicMaterial({ map: tempTexture(), color: new THREE.Color(1.8, 1.8, 1.8) })), 4, {}],
    bosClockFace: (M) => [new THREE.CircleGeometry(5.4, 40), M.bosClockM || (M.bosClockM = new THREE.MeshStandardMaterial({ map: clockTexture(), roughness: 0.6, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.12 })), 8, {}],
    bosClockMin: (M) => [KG.clockHand(4.6, 0.32), mats(M).paint, 8, {}],
    bosClockHour: (M) => [KG.clockHand(3.0, 0.48), mats(M).paint, 8, {}],
    bosBell: (M) => [merge([bell()]), mats(M).paint, 4, {}],
    bosCable: (M) => [KG.cable(), mats(M).paint, 240, {}],
    bosZDeck: (M) => [KG.zDeck(), mats(M).paint, 300, {}],
    bosSkater: (M) => [KG.person(0xffffff, 0xe8e2d4, 1), mats(M).trim, 40, { aDoor: 3, aTrim: 3 }],
    bosGarland: (M) => [lightsGeometry(garlandPoints(44)), M.bosGarlandM || (M.bosGarlandM = garlandMaterial()), 140, { aPhase: 1 }],
    bosStone: (M) => [KG.stone(), mats(M).granite, 4, TT],
    bosStoneFace: (M) => [(() => { const g = new THREE.PlaneGeometry(14, 4.375); g.translate(0, 16.2, 0.02); return g; })(), M.sign, 4, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    bosRow(S, it) { drawRow(S, it); },
    bosEl(S, it) { drawEl(S, it); },
    bosFill(S, it, p, q) {
      const Ls = S.layers, wl = 'bosFill' + it.kind;
      if (!S.track) { void Ls[wl]; void Ls.bosFillRoof; return; }
      const sy = it.sy ?? 1;
      // on the hillside a block is let into the slope a little so no corner hangs in the air
      if (p.y > 0.5) p.y -= 3;
      S._m.compose(p, q, S._s.set(it.w / 26, sy, it.d / 24)); Ls[wl].add(S._m, it._at || (it._at = { aTint: it.tint }));
      S._o.copy(p); S._o.y = p.y + FILLS[it.kind][1] * sy; S._m.compose(S._o, q, S._s.set(it.w / 26, 1, it.d / 24)); Ls.bosFillRoof.add(S._m);
    },
    bosMark(S, it, p, q, yaw) {
      const mk = MARKS[it.mark], Ls = S.layers;
      if (!S.track) {
        for (const s in mk.surf) void Ls[it.mark + s];
        for (const k of ['bosClockFace', 'bosClockMin', 'bosClockHour', 'bosBell', 'bosCable', 'bosZDeck', 'bosHer', 'bosCrowd', 'bosSkater', 'sign', 'car']) void Ls[k];
        return;
      }
      const sc = it.s ?? 1;
      let qq = q;
      if (it.face) qq = faceQ(S, it);
      S._m.compose(p, qq, S._s.set(sc, sc, sc));
      const M = _m.copy(S._m);
      for (const s in mk.surf) {
        const m = mk.surf[s];
        if (m === 'glass') { const gw = it._gw || (it._gw = { aWake: [0, it.seed ?? 0.5, 0] }); gw.aWake[0] = Math.max(it.wakeNow ?? 0, it.lit ?? 0); Ls[it.mark + s].add(M, gw); }
        else Ls[it.mark + s].add(M, TINTED[m] ? (it._ta || (it._ta = { aTint: it.tint || [1, 1, 1] })) : undefined);
      }
      if (MARK_LIFE[it.mark]) MARK_LIFE[it.mark](S, it, p, qq, M);
    },
    bosBare(S, it, p, q) {
      if (!S.track) void S.layers.bosTreeLights;
      S._m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.bosBare.add(S._m, it._at || (it._at = { aTint: it.tint }));
      if (it.lights) S.layers.bosTreeLights.add(S._m);
    },
    bosLamp(S, it, p, q) {
      S._m.compose(p, q, S._s.set(1, 1, 1)); S.layers.bosLamp.add(S._m);
      if (S._bosLampK !== S.P.lamp) { S._bosLampK = S.P.lamp; S._bosLampC = col(S.P.lamp); }
      glowAt(S, p.x, p.y + 5.15, p.z, 2.6, S._bosLampC, 0.35 + 0.9 * it.wakeNow, S.beatLamps ? 4 : 0);
    },
    bosGasLamp(S, it, p, q) {
      S._m.compose(p, q, S._s.set(1, 1, 1)); S.layers.bosGasLamp.add(S._m);
      const fl = 0.85 + 0.15 * Math.sin((S.tNow ?? 0) * 9 + (it.seed ?? 0) * 40) * Math.sin((S.tNow ?? 0) * 13.7 + (it.seed ?? 0) * 7);
      glowAt(S, p.x, p.y + 3.6, p.z, 1.9, WARM, (0.9 + 0.8 * it.wakeNow) * fl, S.beatLamps ? 4 : 0);
      poolAt(S, p.x, p.y + 0.06, p.z, 6, WARM_POOL, 0.3 + 0.4 * it.wakeNow);
    },
    // a lyric painted on the end wall of a building, turned to you coming up the street
    bosWallSign(S, it, p) {
      const fq = faceQ(S, it);
      S._m.compose(p, fq, S._s.set(it.s, it.s, it.s));
      S.layers.bosWallSign.add(S._m, it._at || (it._at = { aTint: it.tint || [0.95, 0.9, 0.9] })); S.layers.bosWallTrim.add(S._m);
      S.layers.bosWallFace.add(S._m, it._af || (it._af = { aIdx: it.idx, aWake: [1, 0] }));
    },
    // a banner over the road on the race's masts
    bosBanner(S, it, p, q) {
      S._m.compose(p, q, S._s.set(1, 1, 1));
      S.layers.bosGantrypaint.add(S._m); S.layers.bosBannerFace.add(S._m, it._af || (it._af = { aIdx: it.idx, aWake: [1, 0] }));
    },
    // a string of lights across the street, over the ribbon
    bosGarland(S, it, p) {
      if (!S.track) { void S.layers.bosGarland; return; }
      S._e.set(0, S.course.sample(it.t).yaw, 0); S._q.setFromEuler(S._e);
      S._o.copy(p); S._o.y = it.h;
      S._m.compose(S._o, S._q, S._s.set(it.w, it.w, 1));
      S.layers.bosGarland.add(S._m, it._ap || (it._ap = { aPhase: it.phase }));
    },
    // a lyric cut into a granite memorial
    bosStone(S, it, p) {
      const fq = faceQ(S, it);
      S._m.compose(p, fq, S._s.set(it.s, it.s, it.s)); S.layers.bosStone.add(S._m, STONE_TINT); S.layers.bosStoneFace.add(S._m, it._af || (it._af = { aIdx: it.idx, aWake: [0.9, 0] }));
    },
    bosTempSign(S, it, p) {
      const fq = faceQ(S, it);
      S._m.compose(p, fq, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.bosTempSign.add(S._m); S.layers.bosTempFace.add(S._m);
    },
    // somebody's fire alarm: a strobe high on a wall, and no one coming out
    bosAlarm(S, it, p) { const on = Math.sin((S.tNow ?? 0) * Math.PI * 2 * 1.6) > 0.3 ? 1 : 0.08; glowAt(S, p.x, p.y + (it.y ?? 9), p.z, 3.2, STROBE, 2.6 * on); },
  },
  kits: {
    // a street of houses on both sides; x is where their fronts stand; a row of something
    // further back; street trees and lamps along the kerb. left / right / kinds pick the houses
    bosstreet(S, z, R) {
      const span = z.span ?? 0.5;
      // a painted wall stands where a row ends: keep the stretch in front of it open
      const plan = S.plan, signs = (plan.lyrics || []).filter((l) => (l.part || plan.lyricPart) === 'bosWallSign').map((l) => [l.t + (l.lead ?? 1.4) - 0.8, l.t + (l.lead ?? 1.4) + 0.05, l.side ?? 1]);
      const clears = [...(z.clear || []), ...signs];
      const clear = (t, side) => clears.some(([a, b, sd]) => t + span > a && t < b && (!sd || sd === side));
      // every house this street can use, made now so it's compiled before the ride
      for (const k of [...(z.kinds || []), ...(z.left || []), ...(z.right || []), ...(z.back || []), ...(z.backL || []), ...(z.backR || [])]) for (const n of LN[k]) void S.layers[n];
      for (const n of ['bosBare', 'bosTreeLights', 'bosLamp', 'bosGasLamp', 'bosWallSign', 'bosWallTrim', 'bosWallFace', 'bosStone', 'bosStoneFace', 'bosBannerFace', 'bosGantrypaint']) void S.layers[n];
      for (const side of [-1, 1]) {
        const kinds = (side < 0 ? z.left : z.right) || z.kinds;
        if (!kinds || !kinds.length) continue;
        const X = side < 0 ? (z.xl ?? z.x ?? 17) : (z.xr ?? z.x ?? 17);
        let k = 0;
        for (let t = z.from; t < z.to - 0.05; t += span, k++) {
          if (clear(t, side)) continue;
          S.items.push({ t, span: Math.min(span, z.to - t), x: side * (X + (k % 2) * 0.14), parts: 'bosRow', kind: pick(R, kinds), seed: R(), wake0: 0.12, ahead: z.ahead ?? 36 });
          const back = (side < 0 ? z.backL : z.backR) ?? z.back;
          if (back) S.items.push({ t, span: Math.min(span, z.to - t), x: side * (X + (z.backAt ?? 16) + (k % 2) * 0.3), parts: 'bosRow', kind: pick(R, back), seed: R(), wake0: 0.1, ahead: 40, noIron: true, sy: 0.9 + R() * 0.5 });
        }
        if (z.trees !== false) for (let t = z.from + R() * 0.2; t < z.to; t += 0.32 + R() * 0.12) {
          if (clear(t, side)) continue;
          S.items.push({ t, x: side * (X - 2.6 - R() * 0.6), rot: R() * 6.28, s: 0.9 + R() * 0.3, parts: 'bosBare', tint: [0.3, 0.27, 0.25], lights: z.lights });
        }
        if (z.lamps !== false) for (let t = z.from + 0.1; t < z.to; t += z.lampEvery ?? 0.42) {
          if (clear(t, side)) continue;
          S.items.push({ t, x: side * (X - 1.6), rot: SIDE(side), parts: z.gas ? 'bosGasLamp' : 'bosLamp', seed: R(), wake0: 0.2 });
        }
      }
    },
    // block after block of city out past the street: rows at the distances in xs
    bosfill(S, z, R) {
      const xs = z.xs || [56, 86, 120, 160, 210];
      for (const k of z.kinds || ['low', 'lowB', 'mid']) void S.layers['bosFill' + k];
      void S.layers.bosFillRoof;
      const clear = (t, side) => (z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
      for (const side of z.sides || [-1, 1]) for (const x0 of xs) {
        // far out, fewer and longer blocks: nobody counts them, and every one costs a frame
        const f = x0 >= 110 ? 1.6 : 1;
        for (let t = z.from + R() * 0.4; t < z.to; t += (z.every ?? 0.7) * f * (0.85 + R() * 0.4)) {
          if (clear(t, side) || R() < 0.08) continue;
          const kind = pick(R, z.kinds || ['low', 'lowB', 'mid']);
          const tint = TINTS[kind === 'midG' || kind === 'tall' ? 'granite' : (kind === 'lowB' ? 'brown' : 'brick')];
          S.items.push({ t, x: side * (x0 + (R() - 0.5) * 10), rot: SIDE(side) + (R() - 0.5) * 0.1, parts: 'bosFill', kind, w: (22 + R() * 10) * f, d: 20 + R() * 8, sy: 0.8 + R() * 0.5, tint: pick(R, tint), ahead: 46 });
        }
      }
    },
    // a landmark: at, x, mark, s (scale), rot (or face: turned to you coming), lift (up a hill)
    bosmark(S, z, R) {
      // made now, so every one is compiled before the ride rather than the first time it shows
      for (const s in MARKS[z.mark].surf) void S.layers[z.mark + s];
      for (const k of ['bosClockFace', 'bosClockMin', 'bosClockHour', 'bosBell', 'bosCable', 'bosZDeck', 'bosHer', 'bosCrowd', 'bosSkater', 'sign']) void S.layers[k];
      for (const at of [].concat(z.at)) S.items.push({ t: at, x: z.x, mark: z.mark, s: z.s ?? 1, rot: z.rot ?? (z.face ? 0 : SIDE(z.x)), face: z.face, h: z.lift ?? 0, parts: 'bosMark', seed: R(), tint: z.tint, lit: z.lit, fan: z.fan, who: z.who, whoZ: z.whoZ, crowd: z.crowd, rate: z.rate, big: z.big, ahead: z.ahead ?? 46, wake0: z.wake0 ?? 0.2 });
    },
    // strings of lights across the street for every chorus and final between from and to, high
    // enough to go under; they light on the chorus and chase down the street on the beat
    bosgarlands(S, z, R) {
      void S.layers.bosGarland;
      const c = S.course, skip = (t) => (z.clear || []).some(([a, b]) => t > a && t < b);
      let k = 0;
      for (const sec of c.sections) {
        if (!LIFTS(sec.kind) || sec.tb < z.from || sec.ta > z.to) continue;
        for (let t = Math.max(sec.ta + 0.6, z.from); t < Math.min(sec.tb, z.to); t += z.every ?? 0.45) {
          if (skip(t)) continue;
          S.items.push({ t, x: z.x ?? -3.5, parts: 'bosGarland', w: z.w ?? 24, h: c.sample(t).y + (z.lift ?? 9), phase: k++ % 4, ahead: 30 });
        }
      }
    },
    // the Common: big elms in rows either side of the path, its lamps
    bostrees(S, z, R) {
      // clear: [[t0, t1, x0, x1], ...] keeps the trees off something (the pond)
      const clear = (t, x) => (z.clear || []).some(([a, b, x0, x1]) => t > a && t < b && x > x0 && x < x1);
      for (const side of [-1, 1]) for (const x0 of z.rows || [16, 34, 52]) for (let t = z.from + R() * 0.3; t < z.to; t += 0.24 + R() * 0.2) {
        const x = side * (x0 + (R() - 0.5) * 6);
        if (clear(t, x)) continue;
        S.items.push({ t, x, rot: R() * 6.28, s: 1.5 + R() * 0.8, parts: 'bosBare', tint: [0.26, 0.24, 0.22], lights: z.lights, ahead: 40 });
      }
      for (const side of [-1, 1]) for (let t = z.from; t < z.to; t += 0.5) S.items.push({ t, x: side * (z.lampX ?? 25), rot: SIDE(side), parts: 'bosLamp', seed: R(), wake0: 0.3 });
    },
    // steam stacks in the street at [t, x] pairs, puffing harder when big
    bosstacks(S, z) { for (const s in MARKS.bosStack.surf) void S.layers['bosStack' + s]; for (const [t, x] of z.at) S.items.push({ t, x, mark: 'bosStack', parts: 'bosMark', s: 1.4, rot: 0, rate: z.rate ?? 1, big: z.big ?? 1, ahead: 30 }); },
    // the el along one side, a length every span seconds
    bosel(S, z) { void S.layers.bosElDeck; void S.layers.bosElBent; for (let t = z.from; t < z.to - 0.01; t += z.span ?? 0.45) S.items.push({ t, span: Math.min(z.span ?? 0.45, z.to - t), x: z.x ?? -17, parts: 'bosEl', ahead: 30 }); },
    bostemp(S, z) { void S.layers.bosTempSign; void S.layers.bosTempFace; S.items.push({ t: z.at, x: z.x ?? 30, s: z.s ?? 1.6, h: z.lift ?? 14, parts: 'bosTempSign', ahead: 26 }); },
    bosalarm(S, z) { S.items.push({ t: z.at, x: z.x ?? 24, y: z.y, parts: 'bosAlarm', ahead: 12 }); },
  },
});

// trains on the el, each pass meeting you at `at` and moving at `rate` times the song; the cars
// coupled a car's length apart however fast the street is laid out
export class ElTrains {
  constructor(course, x, passes) { this.course = course; this.x = x; this.passes = passes; this._p = new THREE.Vector3(); }
  draw(S, rider, songT) {
    for (const ps of this.passes) {
      if (songT < ps.from || songT > ps.to) continue;
      let tau = ps.at + ps.rate * (songT - ps.at);
      for (let k = 0; k < ps.cars; k++) {
        if (k) tau -= 15.6 / S.track.speedAt(tau);
        if (tau < rider.t - 3 || tau > rider.t + 30) continue;
        const p = S.track.ground(tau, ps.x ?? this.x, this._p);
        const yaw = this.course.sample(tau).yaw, y = (ps.y ?? DECK) + gy(this.course, tau, ps.x ?? this.x);
        S._e.set(0, yaw, 0); S._q.setFromEuler(S._e);
        S._m.compose(p.setY(y + 0.95), S._q, S._s.set(1, 1, 1));
        S.layers.bosElCar.add(S._m, CAR_TINT);
        if (k === 0) { const fx = Math.sin(yaw), fz = Math.cos(yaw); glowAt(S, p.x + fx * 7.6, y + 1.6, p.z + fz * 7.6, 2.4, CAR_HEAD, 1.6); glowAt(S, p.x + fx * 7.6, y + 3.4, p.z + fz * 7.6, 1.4, CAR_SIGN, 1.2); }
      }
    }
  }
}

// ---------- pigeons: flocks go up off the roofs as a chorus hits ----------
function birdGeometry() {
  const p = [];
  const body = new THREE.SphereGeometry(0.1, 6, 4); body.scale(1, 0.75, 2.6); p.push(body);
  const head = new THREE.SphereGeometry(0.065, 6, 4); head.translate(0, 0.04, 0.3); p.push(head);
  const tail = new THREE.ConeGeometry(0.09, 0.22, 4); tail.rotateX(Math.PI / 2); tail.scale(1, 0.3, 1); tail.translate(0, 0, -0.32); p.push(tail);
  for (const s of [-1, 1]) { const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.14, s * 0.78, 0.02, -0.08, 0, 0, -0.16, s * 0.78, 0.02, -0.08, s * 0.4, 0.01, 0.08, 0, 0, 0.14]), 3)); w.computeVertexNormals(); w.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2)); p.push(w); }
  const g = merge(p.map((x) => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); if (!x.attributes.normal) x.computeVertexNormals(); return x; }));
  // how far out along the wing each vertex is (for the flap)
  const pos = g.attributes.position, w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) w[i] = Math.abs(pos.getX(i)) > 0.2 ? Math.sign(pos.getX(i)) : 0;
  g.setAttribute('aWing', new THREE.BufferAttribute(w, 1));
  return g;
}
class Flock {
  constructor(scene, n = 160) {
    this.n = n; this.live = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.age = new Float32Array(n).fill(99); this.life = new Float32Array(n); this.turn = new Float32Array(n);
    const g = birdGeometry();
    this.aPh = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    g.setAttribute('aPh', this.aPh); g.setAttribute('aCol', this.aCol);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: BOS.time, uSun: BOS.sun, uSunDir: BOS.sunDir, uSky: BOS.skyLow, uFog: BOS.fog, uFogD: BOS.fogD, uCam: BOS.cam },
      vertexShader: /* glsl */`
        attribute float aWing; attribute float aPh; attribute vec3 aCol; uniform float uTime; varying vec3 vC; varying vec3 vN; varying vec3 vWP;
        void main(){
          vec3 p = position;
          float f = sin(uTime * 15.0 + aPh * 6.283) * 0.95;
          if (aWing != 0.0) p = vec3(p.x * cos(f), p.y + abs(p.x) * sin(f), p.z);
          vC = aCol; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0); vWP = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSun, uSunDir, uSky, uFog, uCam; uniform float uFogD; varying vec3 vC; varying vec3 vN; varying vec3 vWP;
        void main(){ float l = 0.4 + 0.6 * abs(dot(normalize(vN), normalize(uSunDir))); vec3 c = vC * (uSky * 0.22 + uSun * 0.42 * l);
          float d = length(uCam - vWP), fog = 1.0 - exp(-pow(d * uFogD, 1.5)); gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), 1.0); }`,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, n); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._p = new THREE.Vector3(); this._d = new THREE.Vector3();
    this.next = 0;
  }
  // a flock off a roof at p (world), pushing up and away from the road (out: unit vector)
  burst(p, out, n = 30) {
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.n;
      this.p[i * 3] = p.x + (Math.random() - 0.5) * 16; this.p[i * 3 + 1] = p.y + Math.random() * 3; this.p[i * 3 + 2] = p.z + (Math.random() - 0.5) * 16;
      const up = 7 + Math.random() * 7, o = -3 + Math.random() * 10;
      this.v[i * 3] = out.x * o + (Math.random() - 0.5) * 6; this.v[i * 3 + 1] = up; this.v[i * 3 + 2] = out.z * o + (Math.random() - 0.5) * 6;
      this.age[i] = -Math.random() * 0.4; this.life[i] = 5 + Math.random() * 3; this.turn[i] = (Math.random() - 0.5) * 1.6;
      this.aPh.array[i] = Math.random();
      const gull = Math.random() < 0.12, g = 0.42 + Math.random() * 0.22;
      this.aCol.array.set(gull ? [0.92, 0.92, 0.9] : [g * 0.8, g * 0.82, g * 0.9], i * 3);
    }
    this.aPh.needsUpdate = true; this.aCol.needsUpdate = true;
  }
  update(dt) {
    let c = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      if (this.age[i] < 0) continue;
      const vx = this.v[i * 3], vz = this.v[i * 3 + 2], tr0 = this.turn[i] * dt;
      // climbing hard at first, then levelling and wheeling
      this.v[i * 3] = vx * Math.cos(tr0) - vz * Math.sin(tr0); this.v[i * 3 + 2] = vx * Math.sin(tr0) + vz * Math.cos(tr0);
      this.v[i * 3 + 1] += (1.5 - this.v[i * 3 + 1]) * Math.min(1, dt * 0.9);
      for (let k = 0; k < 3; k++) this.p[i * 3 + k] += this.v[i * 3 + k] * dt;
      const sp = Math.hypot(this.v[i * 3], this.v[i * 3 + 1], this.v[i * 3 + 2]) || 1;
      this._d.set(this.v[i * 3] / sp, this.v[i * 3 + 1] / sp, this.v[i * 3 + 2] / sp);
      this._q.setFromUnitVectors(_z, this._d);
      const a = Math.min(1, this.age[i] * 3, (this.life[i] - this.age[i]) * 2);
      this._m.compose(this._p.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]), this._q, this._s.setScalar(1.5 * Math.max(0.05, a)));
      this.mesh.setMatrixAt(c, this._m);
      if (c !== i) { this.aPh.array[c] = this.aPh.array[i]; this.aCol.array[c * 3] = this.aCol.array[i * 3]; this.aCol.array[c * 3 + 1] = this.aCol.array[i * 3 + 1]; this.aCol.array[c * 3 + 2] = this.aCol.array[i * 3 + 2]; }
      c++;
    }
    this.mesh.count = c; this.mesh.instanceMatrix.needsUpdate = true;
    if (c) { this.aPh.needsUpdate = true; this.aCol.needsUpdate = true; }
  }
}

// ---------- the frost in the air: diamond dust glittering where the sun catches it ----------
class Dust {
  constructor(scene, n = 700) {
    this.n = n; this.p = new Float32Array(n * 3); this.s = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.p[i * 3] = (Math.random() - 0.5) * 70; this.p[i * 3 + 1] = Math.random() * 40 - 12; this.p[i * 3 + 2] = (Math.random() - 0.5) * 70; this.s[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.attr); g.setAttribute('aS', new THREE.BufferAttribute(this.s, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0 }, uTime: BOS.time, uSunDir: BOS.sunDir, uCam: BOS.cam, uSun: BOS.sun },
      vertexShader: /* glsl */`
        attribute float aS; uniform float uK, uTime; uniform vec3 uSunDir, uCam; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 d = normalize(position - uCam);
          float glint = pow(max(dot(d, normalize(uSunDir)), 0.0), 3.0) * 1.6 + 0.25;
          float tw = pow(0.5 + 0.5 * sin(uTime * (4.0 + aS * 9.0) + aS * 60.0), 6.0);
          vA = uK * glint * tw * smoothstep(55.0, 6.0, -mv.z);
          gl_PointSize = clamp(70.0 / -mv.z, 1.0, 6.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uSun; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.25, 0.0, dot(d, d)); gl_FragColor = vec4(mix(vec3(0.85, 0.92, 1.0), uSun, 0.4) * a * vA * 2.0, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  update(cam, dt, k) {
    this.mat.uniforms.uK.value = k; this.pts.visible = k > 0.01;
    if (!this.pts.visible) return;
    const p = this.p, a = this.attr.array, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    for (let i = 0; i < this.n; i++) {
      p[i * 3 + 1] -= dt * (0.25 + this.s[i] * 0.3);
      let x = p[i * 3] - cx, y = p[i * 3 + 1] - cy, z = p[i * 3 + 2] - cz;
      if (x < -35) p[i * 3] += 70; else if (x > 35) p[i * 3] -= 70;
      if (z < -35) p[i * 3 + 2] += 70; else if (z > 35) p[i * 3 + 2] -= 70;
      if (y < -12) p[i * 3 + 1] += 40; else if (y > 28) p[i * 3 + 1] -= 40;
      a[i * 3] = p[i * 3]; a[i * 3 + 1] = p[i * 3 + 1]; a[i * 3 + 2] = p[i * 3 + 2];
    }
    this.attr.needsUpdate = true;
  }
}

// ---------- steam: plumes out of the stacks in the street (and the chimneys at home) ----------
class Steam {
  constructor(scene, n = 420) {
    this.n = n; this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.age = new Float32Array(n).fill(99); this.life = new Float32Array(n); this.sz = new Float32Array(n);
    const g = new THREE.PlaneGeometry(1, 1);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aP', this.aP);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uSun: BOS.sun, uSunDir: BOS.sunDir, uSky: BOS.skyLow, uFog: BOS.fog },
      vertexShader: /* glsl */`
        attribute vec4 aP; varying vec2 vUv; varying float vA; varying vec3 vD;
        void main(){ vUv = uv; vA = fract(aP.w) * 2.0; float s = floor(aP.w) * 0.05;
          vec4 c = viewMatrix * vec4(aP.xyz, 1.0); c.xy += position.xy * s; vD = normalize(mat3(viewMatrix) * vec3(0.0, 1.0, 0.0));
          gl_Position = projectionMatrix * c; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSun, uSunDir, uSky, uFog; varying vec2 vUv; varying float vA; varying vec3 vD;
        void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0;
          float a = smoothstep(1.0, 0.25, r) * (0.75 + 0.25 * sin(d.x * 9.0 + d.y * 7.0));
          vec3 c = mix(uSky * 0.95, mix(vec3(1.0), uSun, 0.35), 0.55 + 0.45 * smoothstep(0.4, -0.4, d.y + d.x * 0.3));
          gl_FragColor = vec4(c, a * vA * 0.55); }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, n); this.mesh.frustumCulled = false; this.mesh.count = 0; scene.add(this.mesh);
    this.next = 0; this.acc = 0;
  }
  emit(x, y, z, big = 1) {
    const i = this.next; this.next = (this.next + 1) % this.n;
    this.p[i * 3] = x + (Math.random() - 0.5) * 0.4; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
    this.v[i * 3] = (Math.random() - 0.5) * 1.2; this.v[i * 3 + 1] = (3.5 + Math.random() * 3) * big; this.v[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    this.age[i] = 0; this.life[i] = (3 + Math.random() * 2) * Math.sqrt(big); this.sz[i] = (1.2 + Math.random() * 0.6) * big;
  }
  update(dt) {
    let c = 0; const A = this.aP.array;
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const f = this.age[i] / this.life[i];
      this.v[i * 3 + 1] *= Math.exp(-dt * 0.35); this.v[i * 3] += dt * 0.6;
      for (let k = 0; k < 3; k++) this.p[i * 3 + k] += this.v[i * 3 + k] * dt;
      const size = this.sz[i] * (1 + f * 5), alpha = Math.min(1, f * 6) * (1 - f) * 0.49;
      A[c * 4] = this.p[i * 3]; A[c * 4 + 1] = this.p[i * 3 + 1]; A[c * 4 + 2] = this.p[i * 3 + 2]; A[c * 4 + 3] = Math.floor(size * 20) + alpha;
      c++;
    }
    this.mesh.count = c; this.aP.needsUpdate = true;
  }
}

// ---------- home: the door left unlocked, the cat on the step ----------
// the cat: sitting, tail round its feet, ears up; its head is its own piece so it can watch her
function catBody() {
  const p = [], K = 0x1c1816, W = 0xe8e4dc;
  p.push(tr(new THREE.SphereGeometry(0.26, 12, 10).scale(0.85, 1.15, 1.05).translate(0, 0.3, 0), K));
  p.push(tr(new THREE.SphereGeometry(0.17, 10, 8).scale(1, 0.7, 1.1).translate(0, 0.1, 0.12), K));
  p.push(tr(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 1.3, 0.8).translate(0, 0.36, 0.2), W));
  for (const s of [-1, 1]) p.push(tr(C(0.045, 0.05, 0.34, 6, s * 0.09, 0.17, 0.2), K));
  const tail = new THREE.TorusGeometry(0.24, 0.045, 6, 14, Math.PI * 1.15); tail.rotateX(Math.PI / 2); tail.translate(0.02, 0.05, 0.02); p.push(tr(tail, K));
  return merge(p);
}
function catHead() {
  const p = [], K = 0x1c1816;
  p.push(tr(new THREE.SphereGeometry(0.15, 12, 10).scale(1.05, 0.95, 1).translate(0, 0, 0), K));
  for (const s of [-1, 1]) p.push(tr(new THREE.ConeGeometry(0.055, 0.12, 4).translate(s * 0.08, 0.15, -0.01), K));
  p.push(tr(new THREE.SphereGeometry(0.05, 8, 6).scale(1.2, 0.8, 0.9).translate(0, -0.04, 0.12), 0x2a2420));
  for (const s of [-1, 1]) p.push(tr(new THREE.SphereGeometry(0.026, 6, 5).translate(s * 0.06, 0.03, 0.13), 0xd8c040));
  return merge(p);
}
// a lawn chair keeping somebody's shoveled-out space, in the snowbank at the kerb
function spaceSaver() {
  const p = [], AL = 0xc8ccd0;
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3]]) p.push(tr(C(0.025, 0.025, 1.0, 6, x, 0.5, z), AL));
  for (const [x, z] of [[-0.3, 0.3], [0.3, 0.3]]) p.push(tr(C(0.025, 0.025, 0.45, 6, x, 0.22, z), AL));
  p.push(tr(B(0.62, 0.04, 0.62, 0, 0.45, 0), 0x2a8a4a)); for (let k = 0; k < 5; k++) p.push(tr(B(0.62, 0.02, 0.06, 0, 0.47, -0.24 + k * 0.12), 0xf2f2ea));
  const back = B(0.62, 0.55, 0.04, 0, 0.75, -0.32); back.rotateX(-0.2); p.push(tr(back, 0x2a8a4a));
  const bank = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); bank.scale(3.2, 0.9, 1.1); bank.translate(-3.6, 0, 0.2); p.push(tr(bank, 0xe8eef4));
  const bank2 = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); bank2.scale(2.4, 0.7, 1.0); bank2.translate(3.4, 0, 0.1); p.push(tr(bank2, 0xe8eef4));
  return merge(p);
}
function wreath() {
  const p = []; const R = seeded(5);
  for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; p.push(tr(new THREE.SphereGeometry(0.1, 6, 4).translate(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0), R() < 0.5 ? 0x1e3a22 : 0x2a4a28)); }
  for (let k = 0; k < 6; k++) { const a = R() * 6.28; p.push(tr(new THREE.SphereGeometry(0.04, 5, 4).translate(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.08), 0xc0182a)); }
  p.push(tr(B(0.22, 0.14, 0.06, 0, -0.32, 0.06), 0xb0101e));
  return merge(p);
}
export class DoorFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 20;
    this.group = new THREE.Group(); scene.add(this.group);
    const M = mats(scenery.mats), H = houses(scenery.mats);
    // the row: two houses either side of home, all five drawn here (the street's rows stand
    // clear of it); home is the middle one, its door open
    const kinds = [['bow', 'brick'], ['fed', 'brick2'], ['bow', 'brick'], ['bow', 'brown'], ['fed', 'brick']];
    const widths = kinds.map(([k]) => TYPES[k === 'fed' ? 'fed' : 'bow'].w);
    // the row slides along the street so home stands a little past the middle of the end shot
    let x0 = -widths.reduce((a, b) => a + b, 0) / 2 + (cfg.shift ?? 0);
    this.doorAt = new THREE.Vector3();
    kinds.forEach(([k, wallM], i) => {
      const g = H[k], w = widths[i], cx = x0 + w / 2; x0 += w;
      const home = i === 2;
      // the street turned this way: the house's +z faces the road, its x runs along it
      const add = (geo, mat, attrs) => {
        if (!geo) return;
        const gg = geo.clone();
        for (const [n, v] of Object.entries(attrs || {})) { const a = new Float32Array(v.length); a.set(v); gg.setAttribute(n, new THREE.InstancedBufferAttribute(a, v.length)); }
        const m = new THREE.InstancedMesh(gg, mat, 1); m.setMatrixAt(0, new THREE.Matrix4().makeTranslation(cx, 0, 0)); m.frustumCulled = false; this.group.add(m);
      };
      const tint = home ? [1.06, 0.95, 0.9] : TINTS.brick[(i * 3) % TINTS.brick.length];
      add(g.wall, M[wallM], { aTint: tint });
      add(g.trim, M.trim, { aDoor: home ? col(0x14281c) : DOORS[(i * 5 + 1) % DOORS.length], aTrim: home ? col(0xe8e2d4) : TRIMS.brick[i % TRIMS.brick.length] });
      add(g.glass, M.glass, { aWake: [home ? 1 : 0.35 + 0.2 * i, 0.13 + i * 0.21, 0] });
      add(g.roof, M.slate, { aTint: [1, 1, 1.02] });
      add(g.iron, M.iron, {});
      if (home) {
        // where home's door is: the bow house's door sits right of the bow, at the top of the stoop
        const r = 2.25, th = 1.2, bcx = -w / 2 + 0.3 + r * Math.sin(th), xd = (bcx + r * Math.sin(th) + w / 2) / 2;
        this.doorAt.set(cx + xd, 1.55, 0);
      }
    });
    // home's door, open: the hall lit warm behind it, the door swung in, the wreath, the lanterns
    const d = this.doorAt;
    this.hall = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc890) });
    const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.42), this.hall); hall.position.set(d.x, d.y + 1.22, 0.1); this.group.add(hall);
    const stairs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x6a3a1a })); stairs.position.set(d.x + 0.2, d.y + 0.7, 0.11); stairs.rotation.z = 0.6; this.group.add(stairs);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x14281c, roughness: 0.4 }));
    door.geometry.translate(0.55, 0, 0); door.position.set(d.x - 0.56, d.y + 1.22, 0.06); door.rotation.y = 1.25; this.group.add(door);
    const wr = new THREE.InstancedMesh(wreath(), M.paint, 1); wr.setMatrixAt(0, new THREE.Matrix4().makeRotationY(1.25).setPosition(d.x - 0.56 + Math.cos(1.25) * 0.55, d.y + 1.65, 0.06 - Math.sin(1.25) * 0.55 + 0.05)); wr.frustumCulled = false; this.group.add(wr);
    this.lamps = [new THREE.Vector3(d.x - 0.95, d.y + 2.3, 0.35), new THREE.Vector3(d.x + 0.95, d.y + 2.3, 0.35)];
    for (const l of this.lamps) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.42, 6), new THREE.MeshBasicMaterial({ color: 0xffd090 })); m.position.copy(l); this.group.add(m); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x141414 })); cap.position.set(l.x, l.y + 0.3, l.z); this.group.add(cap); }
    // the cat on the top step, by the door, watching the street
    const cb = new THREE.InstancedMesh(catBody(), M.paint, 1); cb.frustumCulled = false; this.group.add(cb);
    // (in the doorway's light, so you see her against it)
    this.catBody = cb; this.catPos = new THREE.Vector3(d.x + 0.12, d.y + 0.02, 0.62); this.catS = 1.45;
    cb.setMatrixAt(0, new THREE.Matrix4().makeRotationY(0.3).scale(new THREE.Vector3(1.45, 1.45, 1.45)).setPosition(this.catPos));
    this.catHead = new THREE.InstancedMesh(catHead(), M.paint, 1); this.catHead.frustumCulled = false; this.group.add(this.catHead);
    // out front: the gas lamp, the tree with its lights, the snowbank and somebody's chair
    const gl = new THREE.InstancedMesh(KG.gasLamp(), M.paint, 2); gl.frustumCulled = false;
    gl.setMatrixAt(0, new THREE.Matrix4().makeTranslation(d.x + 3.4, 0, 4.6)); gl.setMatrixAt(1, new THREE.Matrix4().makeTranslation(d.x - 11, 0, 4.6)); this.group.add(gl);
    this.gas = [new THREE.Vector3(d.x + 3.4, 3.6, 4.6), new THREE.Vector3(d.x - 11, 3.6, 4.6)];
    const tg = scenery.mats.bosTreeG || (scenery.mats.bosTreeG = bareTree());
    const tree = new THREE.InstancedMesh(tg.tree.clone(), M.bark, 1); tree.geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array([0.3, 0.27, 0.25]), 3));
    tree.setMatrixAt(0, new THREE.Matrix4().makeScale(1.15, 1.15, 1.15).setPosition(d.x - 5.2, 0, 4.9)); tree.frustumCulled = false; this.group.add(tree);
    const tl = new THREE.InstancedMesh(lightsGeometry(tg.lights), scenery.mats.bosTreeLM || (scenery.mats.bosTreeLM = treeLightMaterial()), 1);
    tl.setMatrixAt(0, new THREE.Matrix4().makeScale(1.15, 1.15, 1.15).setPosition(d.x - 5.2, 0, 4.9)); tl.frustumCulled = false; this.group.add(tl);
    const ss = new THREE.InstancedMesh(spaceSaver(), M.paint, 1); ss.setMatrixAt(0, new THREE.Matrix4().makeRotationY(0.25).setPosition(d.x + 7.5, 0, 6.6)); ss.frustumCulled = false; this.group.add(ss);
    this.chimneys = [-13.6, -6.5, 0.6, 7.4, 14.4].map((x) => new THREE.Vector3(x + (cfg.shift ?? 0), 16.6, -4.5));
    // the row stands up on the hill: a granite terrace along the street, its iron fence, steps
    // up to home's walk (everything above sits on it, `lift` metres up)
    const L = this.lift = cfg.lift ?? 0;
    if (L > 0) {
      const tp = [];
      tp.push(muv(B(40, L, 7.5, 0, L / 2, 3.2)));
      tp.push(muv(B(40.4, 0.25, 7.9, 0, L + 0.12, 3.2)));
      const terr = new THREE.InstancedMesh(merge(tp), M.granite, 1); terr.geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array([1.05, 1.03, 1.0]), 3)); terr.setMatrixAt(0, new THREE.Matrix4()); terr.frustumCulled = false; this.group.add(terr);
      const fp = [];
      for (let k = 0; k < 160; k++) fp.push(B(0.035, 1.0, 0.035, -20 + k * 0.25, L + 0.6, 6.9));
      fp.push(B(40, 0.06, 0.06, 0, L + 1.1, 6.9)); fp.push(B(40, 0.06, 0.06, 0, L + 0.25, 6.9));
      const fence = new THREE.InstancedMesh(merge(fp), M.iron, 1); fence.setMatrixAt(0, new THREE.Matrix4()); fence.frustumCulled = false; this.group.add(fence);
      const sp = []; const n = Math.round(L / 0.2);
      for (let k = 0; k < n; k++) sp.push(tr(B(2.2, L * (k + 1) / n, 0.32, d.x, L * (k + 1) / n / 2, 7.0 + (n - k) * 0.32 - 0.16), 0x9a9894));
      const steps = new THREE.InstancedMesh(merge(sp), M.paint, 1); steps.setMatrixAt(0, new THREE.Matrix4()); steps.frustumCulled = false; this.group.add(steps);
      for (const c of this.group.children) if (c !== terr && c !== fence && c !== steps) c.position.y += L;
      this.lamps.forEach((l) => { l.y += L; }); this.gas.forEach((l) => { l.y += L; }); this.chimneys.forEach((l) => { l.y += L; });
      this.doorAt.y += L; this.catPos.y += L;
    }
    this.lit = 0; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const p = track.ground(this.t, this.x, this._p);
    const yaw = this.course.sample(this.t).yaw;
    this.group.position.copy(p);
    this.group.rotation.y = yaw + SIDE(this.x);
    this.lit += ((this.fired ? 1 : 0.35) - this.lit) * Math.min(1, dt);
    this.hall.color.setRGB(1, 0.78, 0.52).multiplyScalar(0.55 + 1.1 * this.lit);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    // the cat turns its head to watch her coming
    const W = this.group.matrixWorld;
    const hp = this._hp || (this._hp = this.catPos.clone().add(new THREE.Vector3(0.02, 0.62, 0.08).multiplyScalar(this.catS)));
    const her = track.at(rider.t, rider.x, 1.2, this._her || (this._her = new THREE.Vector3()));
    const look = this._w.copy(hp).applyMatrix4(W).sub(her).transformDirection(this._m.copy(W).invert());
    const ang = clamp(Math.atan2(-look.x, -look.z), -1.1, 1.1);
    this._e.set(-0.15 + 0.05 * Math.sin(songT * 1.7), ang, 0.12 * Math.sin(songT * 0.9)); this._q.setFromEuler(this._e);
    this.catHead.setMatrixAt(0, this._m.compose(hp, this._q, this._one || (this._one = new THREE.Vector3(this.catS, this.catS, this.catS)))); this.catHead.instanceMatrix.needsUpdate = true;
    // the lanterns by the door and the gas lamps flicker; the hall throws its light down the steps
    const fl = 0.85 + 0.15 * Math.sin(songT * 11) * Math.sin(songT * 7.3);
    for (const l of this.lamps) { this._w.copy(l).applyMatrix4(W); S.glow(this._w.x, this._w.y, this._w.z, 1.5, WARM, (1.0 + 0.8 * this.lit) * fl); }
    for (const l of this.gas) { this._w.copy(l).applyMatrix4(W); S.glow(this._w.x, this._w.y, this._w.z, 2.2, WARM, (1.1 + 0.6 * this.lit) * fl); S.pool(this._w.x, 0.08, this._w.z, 7, WARM_POOL, 0.5); }
    this._w.copy(this.doorAt); this._w.y += 1.2; this._w.z += 1.2; this._w.applyMatrix4(W);
    S.glow(this._w.x, this._w.y, this._w.z, 4.5, HALL, 0.35 + 0.6 * this.lit);
    S.pool(this._w.x, 0.08, this._w.z + 0, 8, HALL_POOL, 0.3 + 0.6 * this.lit);
    // smoke from the chimneys, up into the cold
    for (const c of this.chimneys) { this._w.copy(c).applyMatrix4(W); (S.bosEmit || (S.bosEmit = [])).push([this._w.x, this._w.y, this._w.z, 0.25, 0.8]); }
  }
}

// ---------- the city, every frame: the light, the haze, the trains, breath in the air ----------
export class ColdWorld {
  constructor(scene, S) {
    this.S = S;
    const el = S.plan.el;
    this.trains = el ? new ElTrains(S.course, el.x, el.passes) : null;
    this.lastBreath = -1;
    // Boston on the horizon in place of the usual towers
    const sg = new THREE.CylinderGeometry(2400, 2400, 460, 240, 1, true); sg.translate(0, 200, 0);
    this.skyMat = skylineMaterial();
    this.sky = new THREE.Mesh(sg, this.skyMat); this.sky.frustumCulled = false; this.sky.renderOrder = -9; scene.add(this.sky);
    this.flock = new Flock(scene); this.dust = new Dust(scene); this.steam = new Steam(scene);
    this.river = S.plan.river ? new River(scene, S.plan.river) : null;
    // the hill: everything the street placed stands on it (heights become heights above it); the
    // road and its traffic follow it; the lyric walls sink into it so their words are at her height
    const c = S.course, G = bosGround(c, S.plan);
    if (!G.none) {
      S.town.floorFn = (t, x) => gy(c, t, x);
      for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn;
      for (const it of S.town.items) {
        if (it.parts === 'bosRow' || it.parts === 'bosEl' || it.parts === 'bosGarland' || it.abs) continue;
        const g = gy(c, it.t, it.x); if (g <= 0) continue;
        const y = c.sample(it.t).y;
        if (it.parts === 'bosWallSign') it.h = clamp(y + 5.5 - 15.6 * it.s, g - 10, g);
        else if (it.parts === 'bosStone') { it.s = clamp((y + 5.5 - g) / 16.2, 0.9, 1.6); it.h = g; }
        else it.h = (it.h || 0) + g;
      }
      this.hill = new Hill(scene, c, G.from, Math.min(G.to, S.plan.river ? S.plan.river.from : 1e9), S.plan.roads);
    }
    // what the world draws itself, made now so it's compiled before the ride
    for (const k of ['bosElCar', 'bosTreeLights']) void S.town.layers[k];
    this.flockAt = new Set(); this.lightsK = 0; this.flash = 0;
    this._p = new THREE.Vector3(); this._o = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const P = S.P, r = S.rider, c = S.course;
    if (S.skyline && S.skyline.visible) S.skyline.visible = false;
    this.sky.position.set(camera.position.x, 0, camera.position.z);
    const su = this.skyMat.uniforms; su.uSil.value.set(P.skyline ?? 0x8a9ab8); su.uFog.value.set(P.fog); su.uSun.value.set(P.moon); su.uK.value = P.sunK ?? 1;
    // the shared light for every Boston surface
    BOS.fog.value.set(P.fog); BOS.fogD.value = S.track.mat.uniforms.uFogDensity.value; BOS.cam.value.copy(camera.position);
    BOS.snow.value = clamp(0.3 + (P.snowGround ?? 0.4) * 1.1, 0, 1);
    BOS.skyTop.value.set(P.zenith); BOS.skyLow.value.set(P.horizon); BOS.sun.value.set(P.moon); BOS.sunK.value = P.sunK ?? 1;
    if (P.moonDir) BOS.sunDir.value.set(P.moonDir[0], P.moonDir[1], P.moonDir[2]).normalize();
    BOS.warm.value.set(P.window); BOS.winK.value = Math.max(0.35, (P.windowK ?? 0.12) * 2.5) * (1 + 1.2 * (S.town.wakeAll || 0)); BOS.time.value = time;
    const bpos = c.beatAt(r.t), bf = bpos - Math.floor(bpos), beat = Math.exp(-bf * 6);
    const sec = c.sectionAt(r.t), lifting = LIFTS(sec.kind);
    BOS.beat.value = beat;
    // the chorus: the lights in the trees, the gold flashing on the beat, the frost glittering
    const want = lifting ? 1 : (S.town.wakeAll || 0);
    this.lightsK += (want - this.lightsK) * Math.min(1, dt * (want > this.lightsK ? 3 : 0.8));
    BOS.lights.value = this.lightsK;
    const tl = S.town._layers.bosTreeLights; if (tl) tl.mesh.visible = this.lightsK > 0.01;
    const gl = S.town._layers.bosGarland; if (gl) { gl.mesh.visible = this.lightsK > 0.01; gl.mesh.material.uniforms.uBeatN.value = bpos; }
    BOS.flash.value = (S.lift ? S.lift.k : 0) * beat * 0.55 + 0.3 * (S.town.wakeAll || 0);
    // the cats in the windows while he sings about the cat (and at home)
    const cp = S.plan.cats || [200.4, 206.5];
    BOS.cats.value = smooth(cp[0], cp[0] + 0.6, r.t) * (1 - smooth(cp[1], cp[1] + 0.8, r.t)) + 0.22 * smooth(216, 220, r.t);
    this.dust.update(camera, dt, ((P.snow ?? 0) > 0.2 ? 0 : 0.35 + 0.65 * (S.lift ? S.lift.k : 0)) * (P.sunK ?? 1) / 3);
    // a flock up off the roofs every bar of a chorus, a little ahead, from one side then the other
    if (lifting && S.track) {
      const bar = Math.floor((bpos - c.barPhase) / 4);
      if (!this.flockAt.has(bar)) {
        this.flockAt.add(bar);
        const side = bar % 2 ? 1 : -1, t0 = r.t + 1.4 + Math.random() * 0.6;
        const p = S.track.ground(t0, side * (24 + Math.random() * 10), this._p); p.y = 15 + Math.random() * 6;
        const o = S.track.ground(t0, side * 40, this._o).sub(p).setY(0).normalize();
        this.flock.burst(p, o, t0 - sec.ta < 2 ? 46 : 26);
      }
    }
    this.flock.update(dt);
    // steam: what the stacks asked for this frame
    const em = S.town.bosEmit; if (em) { for (const [x, y, z, rate, big] of em) { this.steam.acc += dt * 8 * rate; while (this.steam.acc > 1) { this.steam.acc -= 1; this.steam.emit(x, y, z, big); } } em.length = 0; }
    this.steam.update(dt);
    if (this.river) this.river.update(S.track, r);
    if (this.hill) this.hill.update(S.track, r, P);
    // the first frames (the title): everything the song will draw is drawn once, tiny, just in
    // front of the camera. On Windows a thing's first draw can stall the frame for half a second;
    // better here than when the free bus pulls in or the Common opens up
    this.warm = (this.warm || 0) + 1;
    if (this.warm <= 5) this.warmUp(S, camera, this.warm === 5);
    // breath: a small white cloud every other beat, drifting back
    if (S.view && r && (P.breath ?? 0) > 0.01) {
      const b = Math.floor(bpos / 2);
      if (b !== this.lastBreath) {
        this.lastBreath = b;
        const p = S._bp || (S._bp = new THREE.Vector3());
        S.view.root.getWorldPosition(p); p.y += 1.75;
        const f = S.track.dirAt(r.t, S._bv || (S._bv = new THREE.Vector3()));
        p.addScaledVector(f, 0.35);
        S.sparks.emit(p, f.clone().multiplyScalar(r.v * 0.985).add(new THREE.Vector3(0, 0.25, 0)), new THREE.Color(0.32, 0.35, 0.4).multiplyScalar(P.breath), 5, { spread: 0.35, life: 0.4, size: 0.16, grav: -0.2, drag: 0, jitter: 0.12 });
      }
    }
  }
  draw(T, rider, songT) { if (this.trains) this.trains.draw(T, rider, songT); }
  warmUp(S, camera, done) {
    const m = this._wm || (this._wm = new THREE.Matrix4()), p = camera.getWorldDirection(this._o).multiplyScalar(3).add(camera.position);
    m.makeScale(0.0005, 0.0005, 0.0005).setPosition(p);
    for (const v of (S.vehicles && S.vehicles.list) || []) {
      if (v._bosScale === undefined) v._bosScale = v.obj.scale.clone();
      if (done) v.obj.scale.copy(v._bosScale); else { v.obj.visible = true; v.obj.position.copy(p); v.obj.scale.setScalar(0.0005); }
      v.obj.updateMatrixWorld(true);
    }
    if (done) return;
    const one = (mesh) => { if (mesh.count === 0) { mesh.setMatrixAt(0, m); mesh.count = 1; mesh.instanceMatrix.needsUpdate = true; } mesh.visible = true; };
    for (const k in S.town._layers) one(S.town._layers[k].mesh);
    one(this.flock.mesh); one(this.steam.mesh);
    this.dust.pts.visible = true;
    if (this.hill) this.hill.mesh.visible = true;
    if (this.river) this.river.mesh.visible = true;
  }
}
