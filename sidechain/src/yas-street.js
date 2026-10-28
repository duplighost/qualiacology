// Your Apartment Smells Like Summer: her block on a hot night. The walk-ups with their fire
// escapes (summer.js's tenement), and what this song puts on them: a curtain in the open
// windows, breathing in the hot air, thrown out of every window when the chorus hits; pots and
// tomato plants and a chair on the landings, mini lights on the rails; washing on lines across
// the street; strings of bulbs across it, chasing on the beat in the chorus. Each moves in its
// own shader, so a whole building's curtains or a whole line of washing is one instance.

import * as THREE from 'three';
import { extend, col, glowAt, poolAt, local, PARTS } from './scenery.js';
import { clamp, pick, TAU, merge, box, cyl, sph, seeded, rgb, paint, tag, mergeTagged, VCM, SIDE, U } from './yas-kit.js';

// ---------- curtains in the windows of a walk-up (summer.js's block: 14 wide, front at z 7) ----------
// The same windows summer.js's window kit fills with air conditioners and fans: work out which
// ones it took (same seeded order) and hang a curtain in some of the others.
const BAYS = [-6.5, -3.9, 3.9, 6.5];
function kitTaken(v) {
  const R = seeded(31 + v * 17), taken = new Set();
  for (let j = 1; j < 7; j++) for (const x of BAYS) { if (R() > 0.34) continue; taken.add(j + ':' + x); R(); }
  return taken;
}
const SHEERS = [0xff6a5a, 0x3ac8c8, 0xffd84a, 0xff5aa0, 0x5aa8ff, 0xfff4e8, 0x6ae8a0, 0xff9a4a, 0xc87aff, 0xffffff];
function curtains(v) {
  const taken = kitTaken(v), R = seeded(201 + v * 37), parts = [];
  for (let j = 1; j < 7; j++) for (const x of BAYS) {
    if (taken.has(j + ':' + x) || R() > 0.5) continue;
    const top = 1.2 + 3.1 * (j + 0.74) + 0.05, L = 3.3 + R() * 1.1, W = 1.2 + R() * 0.3;
    const x0 = x - W / 2 + (R() - 0.5) * 0.3, ph = R(), c = rgb(pick(R, SHEERS));
    const g = new THREE.PlaneGeometry(W, L, 2, 8); g.translate(x0 + W / 2, top - L / 2, 6.9);
    const P = g.attributes.position.array;
    tag(g, 'aCl', (i, k) => (k === 0 ? (top - P[i * 3 + 1]) / L : k === 1 ? (P[i * 3] - x0) / W : k === 2 ? ph : L), 4);
    parts.push(paint(g, c));
  }
  return mergeTagged(parts, [['aCl', 4, [0, 0, 0, 1]]]);
}
// the cloth swings out about its top edge; still air breathes it, the chorus throws it out of the
// window and keeps it snapping on the beat, the storm whips it
const CURTAIN_VS = {
  vertDecl: 'attribute vec4 aCl;',
  vert: `
    float cv = aCl.x, cu = aCl.y, cph = aCl.z * 6.2832, cL = aCl.w;
    float cw = clamp(uWind + uStorm * 0.8, 0.0, 1.7);
    float ckick = uBeat * (0.55 + 0.45 * sin(cph * 3.0));
    float cout = smoothstep(0.18, 0.6, cw);
    float cang = cout * (0.95 + 0.3 * sin(uTime * 2.1 + cph) + 0.45 * ckick)
              + uStorm * 0.35 * sin(uTime * 6.3 + cph * 2.0);
    float cd = cv * cL, cbend = cang * (0.5 + 1.0 * cv);
    transformed.z += sin(cbend) * cd + sin(uTime * 12.0 + cv * 6.0 + cu * 3.0 + cph) * 0.22 * cv * cout + 0.25 * cout;
    transformed.y += cd - cos(cbend) * cd;
    // streaming along the street with the wind as they come out (so they face up the road)
    transformed.x += sin(uTime * 8.0 + cv * 4.0 + cph) * 0.18 * cv * cout - cv * cv * cL * 0.55 * cout * (0.8 + 0.2 * sin(uTime * 3.0 + cph));`,
  // lit from inside the room; in the chorus they glow a little more on the beat
  frag: 'totalEmissiveRadiance += diffuseColor.rgb * (0.12 * uWind + 0.22 * uBeat * uWind + 0.1 * uParty);',
};

// ---------- the landings: pots, tomato plants, a chair, mini lights on the rail ----------
function escapeLife(v) {
  const R = seeded(77 + v * 13), parts = [];
  const pot = (x, y, z, r) => { parts.push(paint(cyl(r, r * 0.78, r * 1.3, 8, x, y + r * 0.65, z), rgb(pick(R, [0xb8643c, 0xa85a38, 0xc87a50, 0x8a8a90])))); return y + r * 1.3; };
  for (let k = 1; k <= 6; k++) {
    const y = 1.2 + k * 3.1 - 0.07, z = 8.1;
    // two to four pots along the rail, green or flowering
    for (let n = 0; n < 2 + Math.floor(R() * 3); n++) {
      const x = -2.4 + R() * 4.8, r = 0.16 + R() * 0.12;
      const top = pot(x, y, z, r);
      const fl = R();
      parts.push(paint(sph(r * 1.35, 1, 0.85, 1, x, top + r * 0.9, z, 8, 6), rgb(pick(R, [0x3a7a32, 0x2e6a2a, 0x4a8a3a]))));
      if (fl < 0.45) for (let q = 0; q < 4; q++) parts.push(paint(sph(0.09, 1, 1, 1, x + (R() - 0.5) * 0.5, top + r * 1.4 + R() * 0.3, z + (R() - 0.5) * 0.4, 5, 4), rgb(pick(R, [0xff3a4a, 0xff8ac8, 0xffd23a, 0xffffff]))));
    }
    // a tomato plant up a stake now and then
    if (R() < 0.35) { const x = (R() - 0.5) * 4; pot(x, y, 7.6, 0.3); parts.push(paint(box(0.04, 1.4, 0.04, x, y + 1.1, 7.6), rgb(0x8a6a3a))); for (let q = 0; q < 5; q++) parts.push(paint(sph(0.22, 1, 1.2, 1, x + (R() - 0.5) * 0.4, y + 0.6 + q * 0.22, 7.6 + (R() - 0.5) * 0.3, 6, 5), rgb(0x2e6a2a))); for (let q = 0; q < 3; q++) parts.push(paint(sph(0.08, 1, 1, 1, x + (R() - 0.5) * 0.5, y + 0.7 + R() * 0.8, 7.75, 6, 4), rgb(0xe8301e))); }
    // a folding chair
    if (R() < 0.3) { const x = (R() - 0.5) * 3, c = rgb(pick(R, [0x3a8ad8, 0xe84a5a, 0x2ab88a, 0xf0c040])); parts.push(paint(box(0.5, 0.05, 0.45, x, y + 0.45, 7.5), c), paint(box(0.5, 0.5, 0.05, x, y + 0.72, 7.28), c)); for (const dx of [-0.22, 0.22]) parts.push(paint(box(0.04, 0.45, 0.04, x + dx, y + 0.22, 7.5), rgb(0xc8ccd4))); }
    // a towel over the rail
    if (R() < 0.3) { const x = (R() - 0.5) * 3.6; parts.push(paint(box(0.7, 0.55, 0.04, x, y + 0.78, 8.46), rgb(pick(R, [0xff8a4f, 0x4ab8e8, 0xf4e04a, 0xe86aa8, 0xffffff])))); }
    // mini lights along the top rail, on some landings (painted hot: they glow)
    if (R() < 0.45) { const c = pick(R, [[3.2, 2.2, 1.2], [3.0, 1.4, 2.2], [1.6, 2.6, 3.0], [3.2, 2.6, 1.0]]); for (let x = -2.8; x <= 2.8; x += 0.4) parts.push(paint(sph(0.055, 1, 1, 1, x, y + 0.92 - 0.06 * Math.sin((x + 2.8) / 5.6 * Math.PI), 8.44, 5, 4), c)); }
  }
  return merge(parts);
}

// ---------- washing on a line across the street (x -17 .. 17 at the facades), hung at y 0 ----------
const WASH = [0xffffff, 0xf4f0e8, 0xff8a4f, 0x4a8ad8, 0xf4d03a, 0xe85a7a, 0x6ac8a8, 0xb07ad8, 0xff6a5a, 0x3a5a9a, 0xfff0d0, 0xffb8d0];
function tee(R) { const s = new THREE.Shape(); s.moveTo(-0.32, 0); s.lineTo(-0.62, -0.08); s.lineTo(-0.72, -0.34); s.lineTo(-0.45, -0.42); s.lineTo(-0.4, -0.3); s.lineTo(-0.4, -1.0); s.lineTo(0.4, -1.0); s.lineTo(0.4, -0.3); s.lineTo(0.45, -0.42); s.lineTo(0.72, -0.34); s.lineTo(0.62, -0.08); s.lineTo(0.32, 0); s.quadraticCurveTo(0, -0.14, -0.32, 0); return s; }
function dress(R) { const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(-0.3, -0.5); s.lineTo(-0.62, -1.55); s.quadraticCurveTo(0, -1.66, 0.62, -1.55); s.lineTo(0.3, -0.5); s.lineTo(0.22, 0); s.quadraticCurveTo(0, -0.2, -0.22, 0); return s; }
function jeans(R) { const s = new THREE.Shape(); s.moveTo(-0.4, 0); s.lineTo(-0.44, -1.4); s.lineTo(-0.1, -1.4); s.lineTo(0, -0.5); s.lineTo(0.1, -1.4); s.lineTo(0.44, -1.4); s.lineTo(0.4, 0); s.lineTo(-0.4, 0); return s; }
function rect(w, h) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, -h); s.lineTo(w / 2, -h); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0); return s; }
function washLine(v) {
  const R = seeded(401 + v * 53), parts = [], span = 17, sag = 1.35;
  const yAt = (x) => -sag * (1 - (x / span) ** 2);
  // the line itself
  for (let k = 0; k < 16; k++) {
    const xa = -span + (2 * span * k) / 16, xb = -span + (2 * span * (k + 1)) / 16, ya = yAt(xa), yb = yAt(xb);
    const g = box(Math.hypot(xb - xa, yb - ya) + 0.02, 0.05, 0.05); g.rotateZ(Math.atan2(yb - ya, xb - xa)); g.translate((xa + xb) / 2, (ya + yb) / 2, 0);
    parts.push(tag(paint(g, rgb(0xd8d4cc)), 'aFl', [0, 0], 2));
  }
  let x = -span + 2.0 + R() * 1.2;
  while (x < span - 2.0) {
    const kind = R(), ph = R(), c = pick(R, WASH);
    let shape, w, h, flat = 1;
    if (kind < 0.3) { shape = tee(R); w = 1.44; h = 1.0; }
    else if (kind < 0.48) { shape = rect(0.9, 1.5); w = 0.9; h = 1.5; }
    else if (kind < 0.62) { shape = dress(R); w = 1.24; h = 1.62; }
    else if (kind < 0.76) { shape = jeans(R); w = 0.9; h = 1.4; }
    else if (kind < 0.88) { shape = rect(2.3, 2.1); w = 2.3; h = 2.1; }
    else { shape = rect(0.26, 0.5); w = 0.6; h = 0.5; flat = 2; }
    const sc = 1.25;
    const y0 = yAt(x);
    for (let f = 0; f < flat; f++) {
      const g = new THREE.ShapeGeometry(shape, 6); g.scale(sc, sc, 1);
      const dx = flat === 2 ? (f ? 0.2 : -0.2) : 0;
      g.translate(x + dx, y0 - 0.02, 0);
      // a towel gets stripes, jeans are denim, a sheet is pale
      const cc0 = kind < 0.48 && kind >= 0.3 ? null : rgb(kind >= 0.62 && kind < 0.76 ? pick(R, [0x3a5a8a, 0x4a6aa0, 0x2a3a5a]) : kind >= 0.76 && kind < 0.88 ? pick(R, [0xffffff, 0xf4f0ff, 0xfff4e0, 0xe0f0ff]) : c);
      const P = g.attributes.position.array;
      if (cc0) paint(g, cc0);
      else { const a = rgb(c), b = rgb(pick(R, WASH)); const n = P.length / 3, cc = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const band = Math.floor(((y0 - P[i * 3 + 1]) / 0.25)) % 3 === 1; const q = band ? b : a; cc.set(q, i * 3); } g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); }
      tag(g, 'aFl', (i, k) => (k === 0 ? Math.max(0, y0 - P[i * 3 + 1]) : ph), 2);
      parts.push(g);
    }
    // the pegs
    for (const s of [-1, 1]) parts.push(tag(paint(box(0.06, 0.18, 0.08, x + s * w * 0.42, y0 + 0.02, 0), rgb(0xc8a070)), 'aFl', [0, 0], 2));
    x += w * sc * 0.5 + 0.5 + R() * 0.9 + (R() < 0.15 ? 2.2 : 0);
    x += 0.3;
  }
  return mergeTagged(parts, [['aFl', 2, [0, 0]]]);
}
const WASH_VS = {
  vertDecl: 'attribute vec2 aFl;',
  vert: `
    float wd = aFl.x, wph = aFl.y * 6.2832;
    float ww = 0.12 + uWind * 0.9 + uStorm * 0.9;
    float wa = (sin(uTime * 1.5 + wph) * 0.18 * (1.0 - uWind) + ww * (0.75 + 0.28 * sin(uTime * 3.6 + wph) + 0.45 * uBeat)) * (0.35 + 0.4 * wd);
    transformed.z += sin(wa) * wd;
    transformed.y += (1.0 - cos(wa)) * wd;
    transformed.x += sin(uTime * 6.5 + wph + wd * 3.0) * 0.07 * wd * ww;`,
};

// ---------- a string of bulbs across the street ----------
const BULB_COLS = [[1, 0.72, 0.38], [1, 0.42, 0.62], [0.45, 0.85, 1], [1, 0.86, 0.3], [0.5, 1, 0.6], [1, 0.5, 0.3]];
function bulbString(v) {
  const span = 17, sag = 1.1 + v * 0.35, parts = [];
  const yAt = (x) => -sag * (1 - (x / span) ** 2);
  for (let k = 0; k < 14; k++) {
    const xa = -span + (2 * span * k) / 14, xb = -span + (2 * span * (k + 1)) / 14, ya = yAt(xa), yb = yAt(xb);
    const g = box(Math.hypot(xb - xa, yb - ya) + 0.02, 0.04, 0.04); g.rotateZ(Math.atan2(yb - ya, xb - xa)); g.translate((xa + xb) / 2, (ya + yb) / 2, 0);
    parts.push(tag(paint(g, rgb(0x2a2420)), 'aBu', -1));
  }
  const n = 17;
  for (let i = 0; i < n; i++) {
    const x = -span + 1 + (i * (2 * span - 2)) / (n - 1), y = yAt(x);
    parts.push(tag(paint(cyl(0.05, 0.05, 0.14, 6, x, y - 0.1, 0), rgb(0x1a1a1a)), 'aBu', -1));
    parts.push(tag(paint(sph(0.17, 1, 1.25, 1, x, y - 0.32, 0, 8, 6), BULB_COLS[(i + v * 2) % BULB_COLS.length]), 'aBu', i + v * 0.5));
  }
  return mergeTagged(parts, [['aBu', 1, -1]]);
}
// warm white bistro bulbs; in the chorus they go to party colours and chase on the beat
const BULB_VS = { vertDecl: 'attribute float aBu; varying float vBu;', vert: 'vBu = aBu;' };
const BULB_FS = {
  fragDecl: 'varying float vBu;',
  frag: `
    if (vBu > -0.5) {
      float bchase = pow(0.5 + 0.5 * cos(6.2832 * (vBu / 6.0 - uBeatPos * 0.5)), 6.0);
      vec3 bc = mix(vec3(1.0, 0.7, 0.4), vColor.rgb, 0.2 + 0.8 * uParty);
      float bk = 1.5 + 0.35 * uBeat + uParty * (0.6 + 2.6 * bchase) + 0.5 * uLift;
      totalEmissiveRadiance = bc * bk;
      diffuseColor.rgb = bc;
    }`,
};

// ---------- up on the roofs: tar beach ----------
// what's on a party roof (front at z 7, roof x -7..7): the stair hut, lawn chairs, a grill or a
// kiddie pool, a cooler, two poles for the bulbs
function roofParty(v) {
  const R = seeded(501 + v * 19), parts = [];
  for (const [x, z, ry] of [[-5.4, 0.8 + R(), 0.3], [5.7, -0.8 + R(), -0.4]]) {
    const ch = [], c1 = rgb(pick(R, [0x2ab0a0, 0xff6a5a, 0x3a8ad8, 0xf4c83a]));
    for (let k = 0; k < 4; k++) ch.push(paint(box(0.62, 0.05, 0.22, 0, 0.42, -0.4 + k * 0.24), k % 2 ? c1 : rgb(0xffffff)));
    for (let k = 0; k < 4; k++) ch.push(paint(box(0.62, 0.22, 0.05, 0, 0.55 + k * 0.22, 0.42 + k * 0.08), k % 2 ? rgb(0xffffff) : c1));
    for (const sx of [-1, 1]) ch.push(paint(box(0.04, 0.42, 0.04, sx * 0.3, 0.21, -0.35), rgb(0xd8dce4)), paint(box(0.04, 1.1, 0.04, sx * 0.3, 0.75, 0.5).rotateX(0.3), rgb(0xd8dce4)));
    const g = merge(ch); g.scale(1.6, 1.6, 1.6); g.rotateY(ry + Math.PI); g.translate(x, 0, z); parts.push(g);
  }
  if (v % 2) { for (let k = 0; k < 2; k++) parts.push(paint(new THREE.TorusGeometry(1.5, 0.22, 6, 20).rotateX(Math.PI / 2).translate(0, 0.22 + k * 0.42, -2.4), rgb(k ? 0xffffff : 0x3a9ad8))); parts.push(paint(cyl(1.45, 1.45, 0.08, 20, 0, 0.5, -2.4), rgb(0.3, 0.9, 1.4))); }
  else { parts.push(paint(sph(0.55, 1, 0.7, 1, 0, 1.15, -2.4, 12, 6), rgb(0x1a1a1a)), paint(cyl(0.04, 0.04, 1.0, 5, 0, 0.5, -2.4), rgb(0x8a8a90)), paint(sph(0.3, 1, 0.4, 1, 0, 1.4, -2.4, 8, 4), rgb(2.6, 0.9, 0.3))); }
  parts.push(paint(box(0.9, 0.6, 0.55, 5.4, 0.3, 5.6), rgb(pick(R, [0x3a6ad8, 0xe84a3a, 0xf4f4f4]))), paint(box(0.92, 0.12, 0.57, 5.4, 0.66, 5.6), rgb(0xffffff)));
  for (const x of [-6.2, 6.2]) parts.push(paint(cyl(0.06, 0.08, 4.2, 6, x, 2.1, 5.6), rgb(0x5a4a3a)));
  return merge(parts);
}
// the bulbs between its two poles
function roofBulbs(v) {
  const parts = [], n = 12;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -6.2 + 12.4 * u, y = 4.1 - 1.1 * 4 * u * (1 - u);
    if (i < n) { const u2 = (i + 1) / n, x2 = -6.2 + 12.4 * u2, y2 = 4.1 - 1.1 * 4 * u2 * (1 - u2); const g = box(Math.hypot(x2 - x, y2 - y) + 0.02, 0.03, 0.03); g.rotateZ(Math.atan2(y2 - y, x2 - x)); g.translate((x + x2) / 2, (y + y2) / 2, 5.6); parts.push(tag(paint(g, rgb(0x1a1a1a)), 'aBu', -1)); }
    if (i > 0 && i < n) parts.push(tag(paint(sph(0.11, 1, 1.3, 1, x, y - 0.18, 5.6, 6, 5), BULB_COLS[(i + v) % BULB_COLS.length]), 'aBu', i + v * 3));
  }
  return mergeTagged(parts, [['aBu', 1, -1]]);
}
// somebody on the roof (half again our size, so they read from the street): arms down in the
// verses, up and pumping on the beat in the chorus
const SKIN = [0xf0c8a8, 0xc89070, 0x8a5a3a, 0x5a3a24, 0xe8b898];
function dancer(v) {
  const R = seeded(601 + v * 23), parts = [], k = 2.0;
  const shirt = rgb(pick(R, [0xff5a7a, 0xffffff, 0x4ac8e8, 0xf4d03a, 0x7ad87a, 0xff8a4f, 0xb07ad8])), pants = rgb(pick(R, [0x2a3a5a, 0x1a1a1e, 0xd8d0c0, 0x4a6a9a])), skin = rgb(pick(R, SKIN)), hair = rgb(pick(R, [0x1a1210, 0x3a2414, 0xd8b060, 0x8a3a1a]));
  const body = (g, c) => tag(paint(g, c), 'aArm', 0);
  for (const sx of [-1, 1]) parts.push(body(cyl(0.085, 0.07, 0.86, 6, sx * 0.1, 0.43, 0), pants));
  parts.push(body(cyl(0.17, 0.15, 0.3, 8, 0, 0.98, 0), pants));
  parts.push(body(cyl(0.2, 0.17, 0.55, 8, 0, 1.38, 0), shirt));
  parts.push(body(sph(0.12, 1, 1.1, 1, 0, 1.82, 0, 8, 6), skin));
  parts.push(body(sph(0.125, 1, 0.75, 1, 0, 1.88, -0.02, 8, 5), hair));
  for (const sx of [-1, 1]) { const a = cyl(0.05, 0.045, 0.62, 5, sx * 0.25, 1.33, 0); parts.push(tag(paint(a, skin), 'aArm', sx < 0 ? 1 : 2)); }
  const g = mergeTagged(parts, [['aArm', 1, 0]]); g.scale(k, k, k); return g;
}
const DANCE_VS = {
  vertDecl: 'attribute float aArm;',
  vert: `
    float dph = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
    float dside = aArm < 0.5 ? 0.0 : (aArm < 1.5 ? -1.0 : 1.0);
    float dbeat = uBeat * (0.7 + 0.3 * sin(dph * 3.0));
    if (dside != 0.0) {
      vec2 piv = vec2(dside * 0.5, 3.2);
      float raise = uParty * (2.1 + 0.55 * dbeat + 0.25 * sin(uTime * 2.6 + dph)) + (1.0 - uParty) * (0.12 + 0.08 * sin(uTime + dph));
      float da = dside * raise;
      vec2 dd = transformed.xy - piv;
      transformed.xy = piv + vec2(dd.x * cos(da) - dd.y * sin(da), dd.x * sin(da) + dd.y * cos(da));
    }
    transformed.y += uParty * dbeat * 0.3 * step(0.6, transformed.y);
    float dsw = sin(uTime * (1.4 + uParty * 1.7) + dph) * (0.06 + 0.12 * uParty);
    transformed.x += dsw * transformed.y * 0.3;`,
};

const TT = { aTint: 3 };
extend({
  layers: {
    yasCurtA: (M) => [curtains(0), VCM(M, 'yasCurtM', { k: 0.34, side: THREE.DoubleSide, roughness: 0.95, ...CURTAIN_VS }), 400, {}],
    yasCurtB: (M) => [curtains(1), VCM(M, 'yasCurtM', { k: 0.34, side: THREE.DoubleSide, roughness: 0.95, ...CURTAIN_VS }), 400, {}],
    yasEscA: (M) => [escapeLife(0), VCM(M, 'yasLifeM', { k: 0.4 }), 400, {}],
    yasEscB: (M) => [escapeLife(1), VCM(M, 'yasLifeM', { k: 0.4 }), 400, {}],
    yasWash0: (M) => [washLine(0), VCM(M, 'yasWashM', { k: 0.4, side: THREE.DoubleSide, roughness: 0.9, ...WASH_VS }), 80, {}],
    yasWash1: (M) => [washLine(1), VCM(M, 'yasWashM', { k: 0.4, side: THREE.DoubleSide, roughness: 0.9, ...WASH_VS }), 80, {}],
    yasWash2: (M) => [washLine(2), VCM(M, 'yasWashM', { k: 0.4, side: THREE.DoubleSide, roughness: 0.9, ...WASH_VS }), 80, {}],
    yasBulbs0: (M) => [bulbString(0), VCM(M, 'yasBulbM', { k: 0.2, ...BULB_VS, ...BULB_FS }), 100, {}],
    yasBulbs1: (M) => [bulbString(1), VCM(M, 'yasBulbM', { k: 0.2, ...BULB_VS, ...BULB_FS }), 100, {}],
    yasRoofA: (M) => [roofParty(0), VCM(M, 'yasLifeM', { k: 0.4 }), 160, {}],
    yasRoofB: (M) => [roofParty(1), VCM(M, 'yasLifeM', { k: 0.4 }), 160, {}],
    yasRoofBulbsA: (M) => [roofBulbs(0), VCM(M, 'yasBulbM', { k: 0.2, ...BULB_VS, ...BULB_FS }), 160, {}],
    yasRoofBulbsB: (M) => [roofBulbs(1), VCM(M, 'yasBulbM', { k: 0.2, ...BULB_VS, ...BULB_FS }), 160, {}],
    yasDancer0: (M) => [dancer(0), VCM(M, 'yasDanceM', { k: 0.55, roughness: 0.8, ...DANCE_VS }), 300, {}],
    yasDancer1: (M) => [dancer(1), VCM(M, 'yasDanceM', { k: 0.55, roughness: 0.8, ...DANCE_VS }), 300, {}],
    yasDancer2: (M) => [dancer(2), VCM(M, 'yasDanceM', { k: 0.55, roughness: 0.8, ...DANCE_VS }), 300, {}],
    yasDancer3: (M) => [dancer(3), VCM(M, 'yasDanceM', { k: 0.55, roughness: 0.8, ...DANCE_VS }), 300, {}],
  },
  parts: {
    // a walk-up (summer.js's tenement) with a curtain in some of its open windows and the
    // landings of its fire escape lived on
    yasWalkup(S, it, p, q, yaw) {
      PARTS.tenement(S, it, p, q, yaw);
      const m = S._m, sy = it.sy ?? it.s;
      m.compose(p, q, S._s.set(it.s, sy, it.s));
      S.layers[it.seed > 0.5 ? 'yasCurtA' : 'yasCurtB'].add(m);
      if (it.escape) S.layers[it.seed * 7.3 % 1 > 0.5 ? 'yasEscA' : 'yasEscB'].add(m);
      // a party on the roof: the hut, chairs, bulbs on poles, people
      void S.layers.yasRoofA; void S.layers.yasRoofB; void S.layers.yasRoofBulbsA; void S.layers.yasRoofBulbsB; for (let k = 0; k < 4; k++) void S.layers['yasDancer' + k];
      if (it.party) {
        const top = S._yt || (S._yt = new THREE.Vector3()); top.copy(p); top.y = p.y + 24 * sy;
        m.compose(top, q, S._s.set(it.s, 1, it.s));
        const v = it.seed * 13.1 % 1 > 0.5;
        S.layers[v ? 'yasRoofA' : 'yasRoofB'].add(m); S.layers[v ? 'yasRoofBulbsA' : 'yasRoofBulbsB'].add(m);
        for (let k = 0; k < it.party; k++) {
          const f = (it.seed * 97.7 + k * 0.618) % 1, dx = -5 + 10 * f, dz = 5.0 + 1.2 * ((it.seed * 31.3 + k * 0.37) % 1);
          const w = local(top, yaw, dx * it.s, 0, dz * it.s, S._o);
          m.compose(w, q, S._s.set(1, 1, 1)); S.layers['yasDancer' + ((k + Math.floor(it.seed * 10)) % 4)].add(m);
        }
        const g = local(top, yaw, 0, 3.6, 5.6 * it.s, S._o); glowAt(S, g.x, g.y, g.z, 9, [1, 0.72, 0.45], 0.18 + 0.3 * U.uParty.value);
      }
      // the street light on the facade a few floors up (they're lit from below)
      if (it.facadeGlow) { const w = local(p, yaw, 0, 9 * sy, 8.5 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 9, col(S.P.window), 0.12 + 0.18 * it.wakeNow); }
    },
    // washing on a line across the street, hung from the fire escapes
    yasWash(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, 1, 1)); S.layers['yasWash' + it.v].add(m); },
    // a string of bulbs across the street
    yasLights(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, 1, 1)); S.layers['yasBulbs' + it.v].add(m);
      // the light it throws: a warm haze under the middle of it
      glowAt(S, p.x, p.y - 1.6, p.z, 11, [1, 0.72, 0.45], 0.12 + 0.25 * U.uParty.value + 0.1 * (S.beat || 0));
    },
  },
  kits: {
    // a set-piece on a roof: the walk-up nearest the spot has its roof brought to the height
    // wanted (over the ribbon by z.over, or z.roof), and the piece stands near its front edge
    yasStage(S, z) {
      const c = S.course, side = Math.sign(z.x || 1), want = z.roof ?? (c.sample(z.at).y + (z.over ?? -2.5));
      let best = null;
      for (const it of S.items) if (it.parts === 'yasWalkup' && Math.sign(it.x) === side && Math.abs(it.t - z.at) < 0.35 && (!best || Math.abs(it.t - z.at) < Math.abs(best.t - z.at))) best = it;
      let roof = want, t = z.at, x = z.x;
      if (best) { best.sy = Math.max(0.3, want / 24); best.party = 0; roof = 24 * best.sy + (best.h || 0); t = best.t; x = best.x - side * (z.inset ?? 4.5) * best.s; }
      S.items.push({ ...z.with, t: t + (z.dt ?? 0), x, h: roof, rot: Math.PI + (side > 0 ? -0.5 : 0.5) + (z.turn ?? 0), s: z.s ?? 1, parts: z.part, ahead: z.ahead ?? 30 });
    },
    // her block: walk-ups both sides at the street (the ribbon rides past their third to sixth
    // floors), a second row behind, towers far off, washing and bulbs across the street
    yasBlock(S, z, R) {
      const bricks = z.bricks || [0xb86a54, 0xc47a5c, 0xa85a48, 0xd08a6a, 0x9a5a4a, 0xc89a7a, 0xb07060, 0x9a7a72, 0xc8907a, 0x8a5a52];
      const lo = z.low ? 0.42 : 0.95, span = z.low ? 0.2 : 0.22;
      const clear = (t, side) => (z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
      const boards = (S.plan.lyrics || []).map((l, i) => [l.t + (l.lead ?? 1.4), l.side ?? (i % 2 ? -1 : 1), l.part]);
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.33 + R() * 0.08) {
          if (clear(t, side) || boards.some(([bt, bs, bp]) => bs === side && !bp && Math.abs(t - bt) < 0.3)) continue;
          S.items.push({ t, x: side * ((z.x ?? 23.5) + R() * 1.5), rot: SIDE(side), s: 0.95 + R() * 0.1, sy: (z.sy ?? lo) + R() * (z.span ?? span), parts: 'yasWalkup', tint: col(pick(R, bricks)), seed: R(), escape: R() < 0.8, wake0: z.wake0 ?? 0.65, facadeGlow: R() < 0.3, party: z.party && R() < z.party ? 1 + Math.floor(R() * 3) : 0 });
          if (R() < 0.6) S.items.push({ t: t + R() * 0.2, x: side * ((z.x ?? 23.5) + 20.5 + R() * 30), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: (z.sy ?? lo) + 0.15 + R() * 0.6, parts: 'block', tint: col(pick(R, bricks)), seed: R(), wake0: 0.45, noShop: true });
          if (R() < 0.35) S.items.push({ t, x: side * ((z.x ?? 23.5) + 66 + R() * 120), rot: R() * 0.4, s: 0.9, sy: 0.9 + R() * 1.2, parts: R() < 0.5 ? 'tower' : 'block', tint: col(pick(R, [0x5a4a5a, 0x6a5a6a, 0x4a4a5a])), seed: R(), wake0: 0.45 });
        }
      }
      if (z.lamps !== false) for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: SIDE(side), parts: 'lamp', seed: R(), dim: 0.85 });
      // across the street over her: washing and bulbs, never lower than over her head
      const c = S.course, roofMin = 24 * (z.sy ?? lo) - 0.4;
      let k = 0;
      if (z.lines) for (let t = z.from + 0.4; t < z.to; t += z.lines * (0.8 + R() * 0.4)) {
        const y = Math.max(c.sample(t).y, c.sample(t - 0.25).y, c.sample(t + 0.25).y), h = Math.max(y + (z.hang ?? 6.6), 9);
        const kind = (z.bulbs && k++ % 2) ? 'yasLights' : 'yasWash';
        if (h > roofMin + 3 && !z.over) continue;
        S.items.push({ t, x: 0, rot: (R() - 0.5) * 0.25, parts: kind, v: kind === 'yasWash' ? Math.floor(R() * 3) : Math.floor(R() * 2), h, ahead: 32 });
      }
    },
  },
});
