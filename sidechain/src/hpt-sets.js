// Heart of the Party: the things along the night out, registered with the scenery.
// The crowd (people in blocks of thirty who dance on the beat, throw their hands up as she
// comes past and hold their phones up), the ribs over the street, the marquees that carry
// his lines, and the set-pieces on their lines. Every name here starts with hpt.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local, faceQ } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
export const merge = (gs) => mergeGeometries(gs.map(ni), false);
export const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
export const sph = (r, sx, sy, sz, x, y, z, w = 12, hh = 8) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const pick = (R, a) => a[Math.floor(R() * a.length)];
export const TAU = Math.PI * 2;
// turned to face the road from x (a crowd, a building front)
export const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
export { paint, rgb, seeded, box };

// ---------- our own fog (the scene has none: every material does its own) ----------
export const HFOG = { uHptFog: { value: new THREE.Color(0x2c0c24) }, uHptFogD: { value: 0.0019 } };
export function fogged(m, key, extra = null, lit = 0) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHptFog = HFOG.uHptFog; sh.uniforms.uHptFogD = HFOG.uHptFogD;
    if (extra) extra(sh);
    if (lit > 0) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + lit.toFixed(3) + ';');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHptFog; uniform float uHptFogD;')
      .replace('#include <fog_fragment>', `float hptD = length(vViewPosition); float hptF = 1.0 - exp(-pow(hptD * uHptFogD, 1.5));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uHptFog, clamp(hptF, 0.0, 1.0));`);
  };
  m.customProgramCacheKey = () => 'hpt' + key;
  return m;
}
// vertex-coloured, lit a little by itself so it reads at night
export const VC = (M, key, opts) => { if (M[key]) return M[key]; const { lit = 0, ...o } = opts; return (M[key] = fogged(new THREE.MeshStandardMaterial({ vertexColors: true, ...o }), key, null, lit)); };

// ---------- the crowd ----------
// Thirty people standing in a block 16 m along the street and 7 deep, facing +z (the road, once
// the block is turned). Per vertex aP = (part, seed, shoulder y, shoulder x): part 0 the body,
// 1 the arm on +x, 2 the arm on -x, 3 that arm when its hand holds a phone, 4 the phone.
// Per block aC = (song time, how hard they dance, whether they throw their hands up).
export const CROWD = { uNow: { value: 0 }, uBeatPos: { value: 0 }, uHands: { value: 0 }, uJump: { value: 0.6 }, uTime: { value: 0 }, uPhones: { value: 0 }, uLead: { value: 2.4 },
  // the newest heartbeat ring: where it went out from, how far it's got, how strong, its colour
  uRingC: { value: new THREE.Vector3(0, -1e4, 0) }, uRingR: { value: 0 }, uRingK: { value: 0 }, uRingCol: { value: new THREE.Color(0xff2a50) } };
function tag(g, part, seed, py, px) {
  const n = g.attributes.position.count, a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) a.set([part, seed, py, px], i * 4);
  g.setAttribute('aP', new THREE.BufferAttribute(a, 4));
  return g;
}
const SHIRTS = [0xff2a50, 0xffd27a, 0xf4f0f8, 0x1a1a22, 0xff6fb0, 0x5ff2ff, 0xb48cff, 0xff8a3d, 0x2a2a3a, 0xe8203a, 0x8affc8, 0xfff2c8];
const PANTS = [0x14121a, 0x1e2440, 0x2a2230, 0x3a2a24, 0x101014, 0x5a4a6a];
const SKIN = [0xf0c8a8, 0xd8a07a, 0xa86a48, 0x6a4028, 0xf4d4bc, 0x8a5838];
const HAIR = [0x1a120a, 0x3a2414, 0x0a0806, 0xd8b070, 0x8a3a1a, 0xffb3d6, 0x2a1a30];
function person(R, px, pz, s) {
  const parts = [], seed = R();
  const shirt = rgb(pick(R, SHIRTS)), pants = rgb(pick(R, PANTS)), skin = rgb(pick(R, SKIN)), hair = rgb(pick(R, HAIR));
  const add = (g, c, part = 0, py = 0, px0 = 0) => { if (c) paint(g, c); tag(g, part, seed, py, px0); parts.push(g); };
  const lean = (R() - 0.5) * 0.1;
  // legs (a dress now and then), a body wider at the shoulders, a head with its hair on top
  if (R() < 0.3) { const sk = new THREE.CylinderGeometry(0.16 * s, 0.27 * s, 0.9 * s, 5); sk.translate(px, 0.62 * s, pz); add(sk, shirt); }
  else add(box(0.32 * s, 0.86 * s, 0.2 * s, px, 0.43 * s, pz), pants);
  const torso = new THREE.CylinderGeometry(0.23 * s, 0.17 * s, 0.6 * s, 4); torso.rotateY(Math.PI / 4); torso.scale(1, 1, 0.6); torso.rotateZ(lean); torso.translate(px, 1.14 * s, pz); add(torso, shirt);
  const head = sph(0.12 * s, 1, 1.12, 1, px + lean * 0.4, 1.6 * s, pz, 5, 3);
  { const p = head.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.set(p.getY(i) > 1.62 * s || p.getZ(i) < pz - 0.06 * s ? hair : skin, i * 3); head.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  add(head, null);
  const shY = 1.4 * s, sx = 0.27 * s, phone = R() < 0.42;
  add(box(0.09 * s, 0.6 * s, 0.09 * s, px + sx, shY - 0.3 * s, pz), R() < 0.5 ? shirt : skin, 1, shY, px + sx);
  add(box(0.09 * s, 0.6 * s, 0.09 * s, px - sx, shY - 0.3 * s, pz), R() < 0.5 ? shirt : skin, phone ? 3 : 2, shY, px - sx);
  if (phone) add(box(0.08 * s, 0.15 * s, 0.025 * s, px - sx, shY - 0.66 * s, pz + 0.06 * s), [0.8, 0.86, 1], 4, shY, px - sx);
  return parts;
}
function crowdBlock(seed, n = 30, len = 16, depth = 7) {
  const R = seeded(seed), parts = [];
  const rows = 4, per = Math.ceil(n / rows);
  for (let r = 0; r < rows; r++) for (let k = 0; k < per; k++) {
    const x = -len / 2 + (k + 0.5) * (len / per) + (R() - 0.5) * 1.1 + (r % 2) * 0.5;
    const z = -0.6 - r * (depth / rows) + (R() - 0.5) * 0.8;
    parts.push(...person(R, x, z, 0.92 + R() * 0.2));
  }
  const g = merge(parts); g.computeVertexNormals(); return g;
}
function crowdMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  return fogged(m, 'Crowd', (sh) => {
    Object.assign(sh.uniforms, CROWD);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aP; attribute vec3 aC; varying float vPart;
        uniform float uNow, uBeatPos, uHands, uJump, uTime, uPhones, uLead;
        vec2 hptRot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
        float hptArm(){
          float part = floor(aP.x + 0.5);
          if (part < 0.5) return 0.0;
          float sgn = part > 1.5 ? -1.0 : 1.0, seed = aP.y;
          float bp = uBeatPos + seed * 0.15;
          // dancing: arms swinging on the beat; standing about: hanging, a little sway
          float idle = 0.1 + 0.07 * sin(uTime * 1.6 + seed * 20.0);
          float dance = 0.32 + 0.38 * (0.5 + 0.5 * sin(bp * 6.2832 + seed * 6.0 + sgn));
          float a = mix(idle, dance, clamp(aC.y, 0.0, 1.0));
          // a phone held up in the other hand
          if (part > 2.5) a = mix(a, 2.2 + 0.08 * sin(uTime * 2.0 + seed * 9.0), uPhones);
          // hands up as she comes past, pumping on the beat
          float near = smoothstep(uLead + seed * 1.2, 0.2, aC.x - uNow);
          float up = uHands * near * aC.z;
          a = mix(a, 2.6 + 0.2 * sin(bp * 6.2832) + 0.12 * fract(seed * 13.7), up);
          return sgn * a;
        }
        float hptHop(){ float seed = aP.y; float ph = fract(uBeatPos + seed * 0.08); return clamp(aC.y, 0.0, 1.5) * uJump * (0.1 + 0.16 * fract(seed * 7.31)) * sin(ph * 3.14159); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float hptA = hptArm();
        objectNormal.xy = hptRot(objectNormal.xy, hptA);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (hptA != 0.0) { vec2 pv = vec2(aP.w, aP.z); transformed.xy = pv + hptRot(transformed.xy - pv, hptA); }
        transformed.y += hptHop();
        vPart = aP.x;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 hptWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          hptWP = instanceMatrix * hptWP;
        #endif
        vHptW = (modelMatrix * hptWP).xyz;`)
      .replace('varying float vPart;', 'varying float vPart; varying vec3 vHptW;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPart; varying vec3 vHptW; uniform float uPhones, uRingR, uRingK; uniform vec3 uRingC, uRingCol;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * 0.34;
        if (vPart > 3.5) totalEmissiveRadiance += vec3(0.75, 0.85, 1.0) * (0.4 + 2.6 * uPhones);
        // the heartbeat going out through them: a flush of red as it passes
        float hptRd = length(vHptW.xz - uRingC.xz) - uRingR;
        totalEmissiveRadiance += uRingCol * uRingK * exp(-hptRd * hptRd / 40.0) * (0.5 + diffuseColor.rgb);`);
  });
}

// ---------- the ribs: arches of light over the street ----------
// a flat band like a rib, from x -W to W and up to H at the middle, thinner toward its ends.
// aU runs 0..1 along it (the shader fades its feet into the dark).
function ribGeometry(W = 26, H = 30) {
  const N = 56, M = 10, pos = [], nor = [], au = [], idx = [];
  const P = (x) => new THREE.Vector2(W * x, H * Math.pow(Math.max(0, 1 - x * x), 0.62));
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = -1 + 2 * u;
    const c = P(x), d = P(Math.min(1, x + 0.01)).sub(P(Math.max(-1, x - 0.01))).normalize();
    const n = new THREE.Vector2(-d.y, d.x);              // in the arch's plane, out from its middle
    const taper = 0.55 + 0.45 * Math.sin(Math.PI * u), a = 0.42 * taper, b = 1.25 * taper;
    for (let j = 0; j < M; j++) {
      const th = (j / M) * TAU, cn = Math.cos(th), sz = Math.sin(th);
      pos.push(c.x + n.x * a * cn, c.y + n.y * a * cn, b * sz);
      const nn = new THREE.Vector3(n.x * cn / a, n.y * cn / a, sz / b).normalize();
      nor.push(nn.x, nn.y, nn.z); au.push(u);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, d = b + M; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1));
  g.setIndex(idx);
  return g;
}
export const RIB = { uBone: { value: new THREE.Color(0xfff0f4) }, uRed: { value: new THREE.Color(0xff2a50) }, uCam: { value: new THREE.Vector3() } };
function ribMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...RIB, ...HFOG },
    vertexShader: /* glsl */`
      attribute float aU; attribute vec2 aK; varying float vU; varying vec2 vK; varying vec3 vW; varying vec3 vN;
      void main(){ vU = aU; vK = aK; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uBone, uRed, uCam, uHptFog; uniform float uHptFogD; varying float vU; varying vec2 vK; varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 V = normalize(uCam - vW); float face = abs(dot(normalize(vN), V));
        // bone white where it faces you, the heart's red round its edges; vK.x how lit, vK.y the hit on the beat
        vec3 c = mix(uRed * 1.3, uBone * 1.25, pow(face, 1.4)) * (0.16 + 0.95 * vK.x) + uRed * vK.y * (0.9 + 1.4 * (1.0 - face));
        c *= smoothstep(0.0, 0.07, vU) * smoothstep(1.0, 0.93, vU) * 0.9 + 0.1;
        float d = length(uCam - vW); float f = 1.0 - exp(-pow(d * uHptFogD, 1.5));
        gl_FragColor = vec4(mix(c, uHptFog, clamp(f, 0.0, 1.0)), 1.0);
      }`,
  });
}

// ---------- the marquees: his lines in lights ----------
// a cabinet on two legs, its face the sign atlas, bulbs chasing round it on the beat (face +z)
function marqueeCabinet() {
  const parts = [], lacquer = rgb(0x3a0816), gold = rgb(0xd8a848), dark = rgb(0x120a10);
  parts.push(paint(box(17.6, 7.4, 1.3, 0, 13, -0.75), lacquer));
  for (const [w, h, x, y] of [[17.9, 0.45, 0, 16.75], [17.9, 0.45, 0, 9.25], [0.45, 7.6, -8.85, 13], [0.45, 7.6, 8.85, 13]]) parts.push(paint(box(w, h, 0.5, x, y, -0.05), gold));
  // a crest on top: a gold heart in a scalloped crown
  const s = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const t = (i / 40) * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); if (i) s.lineTo(x / 9, y / 9); else s.moveTo(x / 9, y / 9); }
  const h = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2, curveSegments: 12 }); h.translate(0, 18.7, -0.6); parts.push(paint(h, rgb(0xe8203a)));
  parts.push(paint(cyl(2.6, 2.6, 0.5, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 17.2, -0.75), lacquer));
  for (const x of [-6.5, 6.5]) { parts.push(paint(box(0.7, 9.4, 0.7, x, 4.7, -0.8), dark)); parts.push(paint(box(2.2, 0.4, 2.2, x, 0.2, -0.8), dark)); }
  return merge(parts);
}
function marqueeFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(2.05, 2.05, 1); g.translate(0, 13, 0.02); return g; }

// ---------- registered ----------
const BLANK = {};
// a stretch of street kept clear, on one side or both: clear: [[t0, t1, side]], and round every
// board and every set-piece at the side of the road (worked out once from the plan)
// (each: from, to, side, and how far before it the street is kept low so it can be seen coming)
function autoClear(S) {
  if (S._hptClear) return S._hptClear;
  const out = [], plan = S.plan || {};
  (plan.lyrics || []).forEach((l, i) => { if (l.part === 'hptBanner') return; const t = l.t + (l.lead ?? 1.4); out.push([t - 0.45, t + 0.3, l.side ?? (i % 2 ? -1 : 1), 1.1]); });
  for (const z of plan.zones || []) if (z.part && z.x && !z.over) out.push([z.at - (z.clearB ?? 0.5), z.at + (z.clearA ?? 0.4), Math.sign(z.x), z.lowB ?? 1.6]);
  return (S._hptClear = out);
}
export const cleared = (z, t, side, S) => (z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side)) || (S && z.auto !== false && autoClear(S).some(([a, b, sd]) => t > a && t < b && sd === side));
// the stretch just before a board or a set-piece: only low shopfronts, so it shows from far off
export const lowered = (z, t, side, S) => !!S && z.auto !== false && autoClear(S).some(([a, b, sd, lb]) => t > a - lb && t < b && sd === side);
extend({
  layers: {
    hptCrowd0: (M) => [crowdBlock(11), M.hptCrowdM || (M.hptCrowdM = crowdMaterial()), 220, { aC: 3 }],
    hptCrowd1: (M) => [crowdBlock(23), M.hptCrowdM || (M.hptCrowdM = crowdMaterial()), 220, { aC: 3 }],
    hptQueue: (M) => [crowdBlock(37, 16, 16, 2.6), M.hptCrowdM || (M.hptCrowdM = crowdMaterial()), 160, { aC: 3 }],
    hptRib: (M) => [ribGeometry(), M.hptRibM || (M.hptRibM = ribMaterial()), 60, { aK: 2 }],
    hptMarq: (M) => [marqueeCabinet(), VC(M, 'hptLacq', { roughness: 0.35, metalness: 0.4, lit: 0.28 }), 30, BLANK],
    hptMarqFace: (M) => [marqueeFace(), M.sign, 30, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a block of people on the street (it.v which of two, it.k how hard they dance, it.hands)
    hptCrowd(S, it, p, q) {
      const L0 = S.layers.hptCrowd0, L1 = S.layers.hptCrowd1, L2 = S.layers.hptQueue, L = it.v === 2 ? L2 : it.v ? L1 : L0;
      const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1));
      L.add(m, { aC: [it.t, it.k ?? 1, it.hands ?? 1] });
    },
    // a rib over the street: lit as she comes, hit on the beat when it's the one she's passing under
    hptRib(S, it, p, q) {
      const L = S.layers.hptRib, T = S.tNow;
      if (T === undefined) return;
      const ahead = it.t - T;
      const lit = clamp(1 - ahead / 9, 0.08, 1) * (it.on ?? 1);
      const bp = S.course.beatAt(T), b = Math.floor(bp), f = bp - b;
      // the drumroll: on every beat the rib a beat ahead of her takes the hit
      const tb = S.course.timeOfBeat(b + 2);
      const hit = Math.abs(it.t - tb) < 0.26 ? Math.exp(-f * 3.5) : 0;
      const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.sy ?? 1, 1));
      L.add(m, { aK: [lit * (0.75 + 0.5 * (S.beat || 0)), hit * (it.on ?? 1)] });
    },
    // his line on a marquee, bulbs chasing round it
    hptMarquee(S, it, p, q) {
      void S.layers.hptMarq; void S.layers.hptMarqFace;
      const fq = faceQ(S, it), s = it.s ?? 1.2;
      const m = S._m; m.compose(p, fq, S._s.set(s, s, s));
      S.layers.hptMarq.add(m); S.layers.hptMarqFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      if (S.tNow === undefined) return;
      const by = new THREE.Euler().setFromQuaternion(fq, 'YXZ').y;
      const chase = Math.floor(S.course.beatAt(S.tNow) * 4), w = S._mq || (S._mq = new THREE.Vector3());
      const warm = [1, 0.82, 0.5], k0 = 0.55 + 0.6 * (it.wakeNow ?? 1);
      let k = 0;
      const bulb = (x, y) => { const on = (k++ + chase) % 4 === 0; local(p, by, x * s, y * s, 0.35 * s, w); glowAt(S, w.x, w.y, w.z, (on ? 1.15 : 0.8) * s, warm, (on ? 2.2 : 0.55) * k0); };
      for (let x = -8.4; x <= 8.41; x += 0.84) bulb(x, 16.75);
      for (let y = 16.0; y >= 9.9; y -= 0.85) bulb(8.85, y);
      for (let x = 8.4; x >= -8.41; x -= 0.84) bulb(x, 9.25);
      for (let y = 9.9; y <= 16.01; y += 0.85) bulb(-8.85, y);
      local(p, by, 0, 13 * s, 3 * s, w); glowAt(S, w.x, w.y, w.z, 20 * s, [1, 0.5, 0.45], 0.2);
      poolAt(S, p.x, p.y + 0.1, p.z, 24 * s, [1, 0.6, 0.45], 0.35);
    },
  },
  kits: {
    // the crowd along both sides (z.x how far out, more bands at z.xs, z.every along, z.k how
    // hard they dance, z.hands whether they put them up, z.sides; z.queue: one thin line)
    hptCrowd(S, z, R) {
      let k = 0;
      const bands = z.xs || [z.x ?? 21, ...(z.x2 ? [z.x2] : [])];
      for (let t = z.from; t < z.to; t += z.every ?? 0.42) {
        for (const side of z.sides || [-1, 1]) {
          for (const x0 of bands) {
            if (cleared(z, t, side, S)) continue;
            S.items.push({ t: t + R() * 0.06, x: side * (x0 + R() * 1.5), rot: SIDE(side) + (R() - 0.5) * 0.12, parts: 'hptCrowd', v: z.queue ? 2 : k++ % 2, s: 0.96 + R() * 0.1, k: z.k ?? 1, hands: z.hands ?? 1, ahead: z.ahead ?? 9 });
          }
        }
      }
    },
    // the street: blocks with their fronts at z.front (shops and awnings at the bottom, lit windows
    // above), a second row and towers behind, lamps on the kerb, neon on the walls.
    // z.clear: [[t0, t1, side]] keeps a stretch open for a set-piece
    hptStreet(S, z, R) {
      const greys = z.tints || [0x9a8aa8, 0xb3a0b8, 0x8f8aa6, 0xa890a4, 0xc0aabc, 0x8a7a9a, 0xb89a9a];
      const signs = z.signs || ['BAR', 'OPEN', 'KISS', 'DANCING', 'LIVETONIGHT', 'ENCORE', 'HOTEL', 'DINER'];
      const front = z.front ?? 19;
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.15; t < z.to;) {
          const s = 0.85 + R() * 0.3, step = (14 * s + 0.6 + R() * 2.4) / 42;
          if (!cleared(z, t, side, S)) {
            const low = lowered(z, t, side, S);
            S.items.push({ t, x: side * (front + 7 * s), rot: SIDE(side) + (R() - 0.5) * 0.04, s, sy: low ? 0.2 + R() * 0.08 : (z.lo ?? 0.35) + R() * (z.hi ?? 0.6), parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.45 });
            if (!low && z.neon !== false && R() < (z.neon ?? 0.32)) S.items.push({ t: t + step * 0.4, x: side * (front - 1.2), s: 0.9 + R() * 0.3, parts: 'sign', idx: S.atlas.index[pick(R, signs)], seed: R(), wake0: 0.6 });
          }
          if (R() < 0.6) S.items.push({ t: t + R() * step, x: side * (front + 32 + R() * 50), rot: R() * 0.4, s: 0.8 + R() * 0.5, sy: 0.5 + R() * 0.9, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.4 });
          if (R() < (z.tall ?? 0.3) * 0.7) S.items.push({ t: t + R() * step, x: side * (120 + R() * 150), rot: R() * 0.4, s: 0.9 + R() * 0.4, sy: 0.6 + R() * 1.6, parts: 'tower', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.4 });
          t += step;
        }
      }
      if (z.lamps !== false) for (let t = z.from; t < z.to; t += z.lampEvery ?? 0.62) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.lampX ?? Math.min(front - 2.5, 16)), rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), dim: z.dim ?? 1 });
    },
    // ribs over the street every other beat from z.from to z.to
    hptRibs(S, z) {
      const c = S.course;
      for (let b = 0; b < c.beats.length; b++) {
        const t = c.beats[b];
        if (t < z.from || t > z.to || ((b - c.barPhase) % 2 + 2) % 2) continue;
        S.items.push({ t, x: 0, rot: 0, parts: 'hptRib', on: 1, ribs: true, ahead: z.ahead ?? 30 });
      }
    },
  },
});
