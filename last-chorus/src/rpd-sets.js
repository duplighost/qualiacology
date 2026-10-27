// Reverse Psychology Degree: the university's things. The brick halls with their windows lit; the
// lamps on the paths; the gates under the crest; the department's front with its name cut the wrong
// way round; the clock tower whose hands run backwards; the graduates in their gowns, all alike,
// no faces, who all bow at once to her boast; the slide screens the lines are on; the inkblot screen
// she goes through; the table of free apples; the couch; commencement's chairs, stage and ribbons;
// the gold star; the call boxes; the dissertations; the caps thrown up; the cloister; the
// balloons; the exam hall's desks and clock; the papers going up. Names here start with rpd.
// Everything here turns to its negative with the place (NEG, set by rpd-world.js).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col, signV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.4 : -Math.PI / 2 - 0.4);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }

// ---------- the negative ----------
// one number for the whole place: 0 as it is, 1 every colour turned over (rpd-world.js sets it)
export const NEG = { value: 0 };
const NEG_GLSL = 'gl_FragColor.rgb = mix(gl_FragColor.rgb, max(vec3(0.0), vec3(1.0) - gl_FragColor.rgb) * 0.72, uNeg);';
export function negHook(m, extra) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNeg = NEG;
    if (extra) extra(sh);
    sh.fragmentShader = 'uniform float uNeg;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + NEG_GLSL);
  };
  return m;
}
// lit by its own vertex colours as much as by the lights (the place is at night)
export function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  return negHook(m, (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); });
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = negHook(new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts })));

const BRICK = rgb(0x7a3a2c), STONE = rgb(0xc8bca8), SLATE = rgb(0x2a2c34), IRON = rgb(0x18181c), GOLD = rgb(0xd8a840), MAROON = rgb(0x6a1428), CREAM = rgb(0xf0e8d6), WOOD = rgb(0x5a3a24), GOWN = rgb(0x363042), SKIN = rgb(0xd8ccc0), WHITE = rgb(0xf2f0ea);
const LAMP = [1, 0.8, 0.5], BLUE = [0.3, 0.55, 1], WARM = [1, 0.85, 0.6];

// ---------- pictures ----------
// the department's name, cut into the frieze the wrong way round
function friezeTexture() {
  return canvasTex(1024, 128, (g, W, H) => {
    g.fillStyle = '#cfc3ad'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(80,60,40,0.18)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1);
    g.save(); g.translate(W, 0); g.scale(-1, 1);
    g.font = '700 84px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // cut letters: a dark lower edge, a light upper one
    g.fillStyle = 'rgba(255,250,235,0.6)'; g.fillText('PSYCHOLOGY', W / 2 - 2, H / 2 + 2);
    g.fillStyle = '#4a3a2a'; g.fillText('PSYCHOLOGY', W / 2, H / 2 + 5);
    g.fillStyle = '#7a6650'; g.fillText('PSYCHOLOGY', W / 2, H / 2 + 4);
    g.restore();
  });
}
// a clock face, roman numerals
function clockTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#1a1414'; g.fillRect(0, 0, W, H);
    const c = W / 2;
    g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(c, c, 240, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2020'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, 232, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#2a2020'; g.font = '700 52px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const N = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.save(); g.translate(c + Math.sin(a) * 182, c - Math.cos(a) * 182); g.rotate(a); g.fillText(N[k], 0, 0); g.restore(); }
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2; g.save(); g.translate(c + Math.sin(a) * 222, c - Math.cos(a) * 222); g.rotate(a); g.fillRect(-2, -8, 4, k % 5 ? 10 : 18); g.restore(); }
    g.beginPath(); g.arc(c, c, 14, 0, Math.PI * 2); g.fill();
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { frieze: friezeTexture(), clock: clockTexture() });

// ---------- the inkblot ----------
// a slide of an inkblot, mirrored down the middle; uGrow how far it has spread over the screen.
// Torn, each piece of the screen draws its own part of it (aRect: where on the slide it was).
export function inkMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uGrow: { value: 0.2 }, uTime: { value: 0 }, uLight: { value: 1 }, uNeg: NEG },
    vertexShader: /* glsl */`
      attribute vec4 aRect; varying vec2 vUv;
      void main(){ vUv = aRect.xy + uv * aRect.zw; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uGrow, uTime, uLight, uNeg; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ return 0.55 * n2(p) + 0.3 * n2(p * 2.1 + 7.0) + 0.15 * n2(p * 4.3 + 3.0); }
      void main(){
        vec2 p = vec2(abs(vUv.x - 0.5), vUv.y - 0.5);
        // the blot: a body down the middle, wings out to the sides, all edges ragged
        // a body down the fold, two wings, a head; holes through it where the ink thinned; all of it
        // mirrored (the slide was folded wet)
        float body = 1.0 - length(p * vec2(3.2, 1.25));
        float wing = 1.0 - length((p - vec2(0.25, 0.08)) * vec2(2.5, 2.9));
        float low = 1.0 - length((p - vec2(0.15, -0.26)) * vec2(3.4, 3.6));
        float head = 1.0 - length((p - vec2(0.0, 0.33)) * vec2(5.0, 5.5));
        float shape = max(max(body, wing), max(low * 0.9, head * 0.95)) + (fbm(p * 6.0 + vec2(0.0, uTime * 0.04)) - 0.5) * 0.7;
        float ink = smoothstep(1.0 - uGrow - 0.02, 1.0 - uGrow + 0.02, shape + 0.35);
        ink *= 1.0 - smoothstep(0.62, 0.66, fbm(p * 11.0 + 4.0)) * step(uGrow, 0.9);
        // drips and spatter at the edge
        ink = max(ink, step(0.985, h2(floor(p * 90.0))) * step(1.0 - uGrow - 0.18, shape + 0.35));
        vec3 paper = vec3(0.95, 0.93, 0.88) * (1.0 - 0.35 * length(vUv - 0.5));
        vec3 c = mix(paper, vec3(0.03, 0.02, 0.025), ink);
        c = mix(c, vec3(0.25, 0.02, 0.06), ink * smoothstep(0.08, 0.0, abs(shape + 0.35 - (1.0 - uGrow))) * 0.8);
        c *= uLight;
        gl_FragColor = vec4(mix(c, max(vec3(0.0), vec3(1.0) - c) * 0.72, uNeg), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the halls ----------
// brick, three floors of tall windows lit warm (some dark), slate roofs, white trim. Drawn by its
// own shader so the windows sit on the walls whatever the hall's size.
export function hallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0016 }, uCam: { value: new THREE.Vector3() },
      uSky: { value: new THREE.Color() }, uBounce: { value: new THREE.Color() }, uHemiK: { value: 1.8 }, uMoon: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uWin: { value: new THREE.Color(0xffc878) }, uWinK: { value: 1 }, uOn: { value: 1 }, uLit: { value: 0.45 }, uNeg: NEG,
    },
    vertexShader: /* glsl */`
      attribute vec3 aTint; attribute float aSeed; attribute float aPart;
      varying vec3 vL; varying vec3 vN; varying vec3 vNL; varying vec3 vW; varying vec3 vTint; varying float vSeed; varying float vPart;
      void main(){
        vL = position; vNL = normal; vN = normalize(mat3(instanceMatrix) * normal); vTint = aTint; vSeed = aSeed; vPart = aPart;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uFog, uCam, uSky, uBounce, uMoon, uMoonDir, uWin; uniform float uFogDensity, uHemiK, uWinK, uOn, uLit, uNeg;
      varying vec3 vL; varying vec3 vN; varying vec3 vNL; varying vec3 vW; varying vec3 vTint; varying float vSeed; varying float vPart;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      void main(){
        int part = int(vPart + 0.5);
        vec3 N = normalize(vN);
        vec3 alb; vec3 glow = vec3(0.0);
        if (part == 0) {
          // brick, coursed; the windows: tall, round-headed, three floors, every 4.4 m
          // (which way the wall faces in the hall's own terms: the windows run along it)
          vec2 a = abs(vNL.z) > 0.5 ? vec2(vL.x, vL.y) : vec2(vL.z, vL.y);
          vec2 br = vec2(a.x / 1.1 + 0.5 * mod(floor(a.y / 0.45), 2.0), a.y / 0.45);
          alb = vTint * (0.82 + 0.28 * h2(floor(br) + vSeed * 31.0)) * mix(0.75, 1.0, edge(fract(br), 0.08));
          vec2 wq = vec2((a.x + 2.2) / 4.4, (a.y - 2.2) / 6.0); vec2 wf = fract(wq);
          float floorOk = step(0.0, a.y - 2.2) * step(a.y, 19.6);
          vec2 wp = (wf - vec2(0.5, 0.0)) * vec2(4.4, 6.0);
          float arch = step(length(vec2(wp.x, max(0.0, wp.y - 3.6)) / vec2(1.05, 1.05)), 1.0);
          float win = floorOk * step(abs(wp.x), 1.05) * step(0.6, wp.y) * step(wp.y, 4.65) * arch;
          float frame = floorOk * step(abs(wp.x), 1.35) * step(0.35, wp.y) * step(wp.y, 4.95) * (1.0 - win);
          float id = h2(floor(wq) + vSeed * 17.0);
          float lit = step(0.28, id) * uOn;
          vec3 glass = mix(vec3(0.02, 0.025, 0.04), uWin * (0.75 + 0.35 * id), lit);
          // a mullion and a transom
          float mull = win * (step(abs(wp.x), 0.07) + step(abs(wp.y - 3.0), 0.07));
          alb = mix(alb, vec3(0.86, 0.84, 0.78), frame);
          alb = mix(alb, glass, win * (1.0 - mull));
          alb = mix(alb, vec3(0.8, 0.78, 0.72), mull);
          glow += glass * win * (1.0 - mull) * lit * uWinK * 0.9;
          // a stone string course between the floors
          alb = mix(alb, vec3(0.78, 0.72, 0.62), step(abs(fract(a.y / 6.0 + 0.66) - 0.5), 0.025) * step(2.0, a.y));
        } else if (part == 1) {
          // slate in courses
          vec2 sq = vec2(vL.x / 0.9 + 0.5 * mod(floor(vL.y / 0.5), 2.0), vL.y / 0.5 + vL.z * 0.6);
          alb = vec3(0.16, 0.17, 0.2) * (0.8 + 0.3 * h2(floor(sq))) * mix(0.7, 1.0, edge(fract(sq), 0.1));
        } else if (part == 2) {
          alb = vec3(0.8, 0.75, 0.66);
        } else {
          alb = vec3(0.9, 0.88, 0.84);
        }
        vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK;
        float ndl = max(dot(N, normalize(uMoonDir)), 0.0);
        vec3 col = alb * (amb * 0.42 + uMoon * ndl * 0.35) * (0.5 + uLit) + glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        col = mix(col, uFog, clamp(fog, 0.0, 1.0));
        gl_FragColor = vec4(mix(col, max(vec3(0.0), vec3(1.0) - col) * 0.72, uNeg), 1.0);
      }`,
  });
}
// a hall: brick body 40 long, 20 tall, 16 deep; a slate roof; an entrance bay with a gable, on +z
function hallGeometry() {
  const parts = [];
  const tag = (g, part) => { g = ni(g); const n = g.attributes.position.count; g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
  parts.push(tag(box(40, 20, 16, 0, 10, 0), 0));
  // the roof: a prism along the hall
  const roof = new THREE.BufferGeometry();
  const L = 21, D = 9, y0 = 20, y1 = 28;
  const v = [[-L, y0, -D], [L, y0, -D], [L, y1, 0], [-L, y1, 0], [-L, y0, D], [L, y0, D]];
  const tri = (a, b, c) => [...v[a], ...v[b], ...v[c]];
  const pos = [...tri(0, 2, 1), ...tri(0, 3, 2), ...tri(4, 5, 2), ...tri(4, 2, 3)];
  roof.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); roof.computeVertexNormals();
  parts.push(tag(roof, 1));
  // the gable ends, brick
  const gab = new THREE.BufferGeometry();
  const gp = [-20, 20, -8, -20, 20, 8, -20, 27.6, 0, 20, 20, 8, 20, 20, -8, 20, 27.6, 0];
  gab.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gp), 3)); gab.computeVertexNormals();
  parts.push(tag(gab, 0));
  // chimneys, a cornice
  for (const x of [-14, 14]) parts.push(tag(box(2.4, 6, 2.4, x, 26, -2), 0));
  parts.push(tag(box(41, 0.8, 17, 0, 20.2, 0), 2));
  // the entrance: a bay out front with its own gable, steps, a door
  parts.push(tag(box(10, 23, 3, 0, 11.5, 9.4), 0));
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-5.6, 23, 10.95, 5.6, 23, 10.95, 0, 27.5, 10.95, 5.6, 23, 7.9, -5.6, 23, 7.9, 0, 27.5, 7.9]), 3)); pg.computeVertexNormals();
  parts.push(tag(pg, 2));
  parts.push(tag(box(11.2, 0.6, 3.2, 0, 23, 9.4), 2));
  parts.push(tag(box(4, 6.5, 0.4, 0, 3.2, 11.0), 3));
  parts.push(tag(box(12, 1, 4, 0, 0.5, 12), 2));
  return mergeGeometries(parts, false);
}

// ---------- the things, at the scale they take up beside an elevated road ----------
const RPD = {
  // a campus lamp: iron post, a ring of arms, a globe
  lampPost() { return merge([paint(cyl(0.9, 1.2, 1.6, 10, 0, 0.8, 0), IRON), paint(cyl(0.32, 0.42, 13, 8, 0, 7.5, 0), IRON), paint(cyl(0.7, 0.5, 0.6, 10, 0, 14.2, 0), IRON), paint(cyl(0.12, 0.6, 0.6, 10, 0, 16.6, 0), IRON)]); },
  globe() { return paint(sph(1.15, 1, 1.05, 1, 0, 15.4, 0, 14, 10), rgb(0xfff0d0)); },
  // a graduate's gown from the waist down
  gradLow() {
    const g = lathe([[3.3, 0], [3.1, 1.2], [2.7, 4.0], [2.1, 7.2], [0, 7.2]], 20);
    const parts = [paint(g, GOWN)];
    // the hem's two velvet bands down the front
    for (const s of [-1, 1]) { const b = box(0.55, 7.2, 0.3, s * 0.9, 3.6, 0); b.rotateX(-0.1); b.translate(0, 0, 2.55); parts.push(paint(b, MAROON)); }
    return merge(parts);
  },
  // the rest of them, the waist at 0 (they bow about it): shoulders, bell sleeves, hands folded,
  // the hood down the back, the honours cord, a head with no face, the mortarboard and its tassel
  gradUp() {
    const parts = [paint(lathe([[2.15, 0], [2.3, 2.5], [2.5, 4.4], [1.6, 5.2], [0.8, 5.5], [0, 5.5]], 20), GOWN)];
    for (const s of [-1, 1]) {
      const sl = lathe([[0.7, 4.8], [1.0, 3.2], [1.5, 1.0], [1.7, 0.2], [0, 0.2]], 12); sl.rotateZ(s * -0.12); sl.translate(s * 2.55, 0, 0.2); parts.push(paint(sl, GOWN));
      parts.push(paint(sph(0.62, 1, 0.8, 1, s * 0.9, 1.1, 2.2, 10, 8), SKIN));
      parts.push(paint(cyl(0.16, 0.16, 5.4, 6, s * 0.8, 2.8, 2.15).rotateX(0.0), GOLD));
    }
    parts.push(paint(box(3.4, 4.2, 0.6, 0, 2.6, -2.2), MAROON));
    parts.push(paint(box(2.2, 0.5, 0.65, 0, 0.6, -2.25), GOLD));
    parts.push(paint(sph(1.35, 1, 1.12, 1, 0, 6.9, 0, 18, 14), SKIN));
    parts.push(paint(cyl(1.25, 1.3, 0.8, 18, 0, 7.9, 0), GOWN));
    const board = box(3.9, 0.25, 3.9, 0, 8.4, 0); board.rotateY(Math.PI / 4); parts.push(paint(board, GOWN));
    parts.push(paint(cyl(0.22, 0.22, 0.2, 8, 0, 8.6, 0), GOLD));
    parts.push(paint(box(0.12, 0.12, 1.9, 0, 8.58, 0.95), GOLD));
    parts.push(paint(box(0.26, 1.7, 0.26, 0, 7.75, 1.9), GOLD));
    return merge(parts);
  },
  // the gates: two brick piers with lanterns, the iron arch, the crest
  gate() {
    const parts = [];
    for (const s of [-1, 1]) {
      parts.push(paint(box(6, 26, 6, s * 17, 13, 0), BRICK), paint(box(7, 1.2, 7, s * 17, 26.6, 0), STONE), paint(box(7.4, 1.4, 7.4, s * 17, 0.7, 0), STONE));
      parts.push(paint(box(5.4, 0.4, 0.3, s * 17, 9, 3.1), STONE), paint(cyl(0.4, 0.6, 2.6, 8, s * 17, 28.5, 0), IRON), paint(box(1.9, 2.6, 1.9, s * 17, 31.2, 0), rgb(0xffe0a0)), paint(box(2.5, 0.4, 2.5, s * 17, 32.7, 0), IRON), paint(cyl(0.01, 1.1, 1.2, 4, s * 17, 33.5, 0), IRON));
      // the fence going off either side
      for (let k = 0; k < 9; k++) { const x0 = s * (21 + k * 6); parts.push(paint(box(6, 0.4, 0.4, x0 + s * 3, 12, 0), IRON), paint(box(6, 0.4, 0.4, x0 + s * 3, 2, 0), IRON)); for (let j = 0; j < 6; j++) { parts.push(paint(box(0.25, 12.5, 0.25, x0 + s * j, 6.6, 0), IRON), paint(cyl(0.01, 0.35, 0.9, 4, x0 + s * j, 13.2, 0), GOLD)); } parts.push(paint(box(1.4, 14, 1.4, x0 + s * 6, 7, 0), BRICK)); }
    }
    // the arch: iron bars on a curve, scrolls, the crest at the top
    for (let k = 0; k <= 28; k++) {
      const a = k / 28 * Math.PI, r = 17, x = -Math.cos(a) * r, y = 28 + Math.sin(a) * 9;
      const b = box(1.9, 0.5, 0.5, x, y, 0); b.rotateZ(0); parts.push(paint(b, IRON));
      if (k % 2 === 0) parts.push(paint(box(0.25, 28 + Math.sin(a) * 9 - 26.5, 0.25, x, (28 + Math.sin(a) * 9 + 26.5) / 2, 0), IRON));
    }
    const ring = new THREE.TorusGeometry(4.6, 0.45, 8, 32); ring.translate(0, 41.5, 0); parts.push(paint(ring, GOLD));
    parts.push(paint(cyl(4.3, 4.3, 0.5, 32, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 41.5, 0), MAROON));
    const sh = new THREE.Shape(); sh.moveTo(-2.4, 2.6); sh.lineTo(2.4, 2.6); sh.lineTo(2.4, 0); sh.quadraticCurveTo(2.2, -2.4, 0, -3.4); sh.quadraticCurveTo(-2.2, -2.4, -2.4, 0); sh.closePath();
    const shield = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }); shield.translate(0, 41.8, 0.2); parts.push(paint(shield, GOLD));
    // an open book on the shield
    parts.push(paint(box(2.6, 1.4, 0.3, 0, 42.6, 0.8), CREAM));
    return merge(parts);
  },
  // the department's front: steps, six columns, the entablature, the pediment; brick behind
  front() {
    const parts = [paint(box(60, 30, 22, 0, 15, -14), BRICK)];
    for (let k = 0; k < 4; k++) parts.push(paint(box(46 - k * 2, 1, 12 - k * 1.5, 0, 0.5 + k, 8 - k * 0.75), STONE));
    for (let k = 0; k < 6; k++) { const x = -17.5 + k * 7; parts.push(paint(cyl(1.35, 1.6, 22, 16, x, 15, 2.5), STONE), paint(box(3.6, 1, 3.6, x, 26.4, 2.5), STONE), paint(box(3.6, 1, 3.6, x, 4.5, 2.5), STONE)); }
    parts.push(paint(box(46, 4.2, 7, 0, 29, 2.0), STONE));
    const pd = new THREE.BufferGeometry();
    pd.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-23.5, 31.1, 5.5, 23.5, 31.1, 5.5, 0, 39, 5.5, 23.5, 31.1, -1.5, -23.5, 31.1, -1.5, 0, 39, -1.5, -23.5, 31.1, 5.5, 0, 39, 5.5, 0, 39, -1.5, -23.5, 31.1, 5.5, 0, 39, -1.5, -23.5, 31.1, -1.5, 23.5, 31.1, 5.5, 23.5, 31.1, -1.5, 0, 39, -1.5, 23.5, 31.1, 5.5, 0, 39, -1.5, 0, 39, 5.5]), 3)); pd.computeVertexNormals();
    parts.push(paint(pd, STONE));
    // the doors behind the columns, lit
    for (const x of [-7, 0, 7]) parts.push(paint(box(3.6, 9, 0.4, x, 8.5, -2.8), rgb(0xffd8a0)));
    return merge(parts);
  },
  frieze() { const g = new THREE.PlaneGeometry(40, 3.4); g.translate(0, 29, 5.55); return g; },
  // the clock tower: a brick shaft, the belfry, the spire; the faces are their own
  tower() {
    const parts = [paint(box(13, 56, 13, 0, 28, 0), BRICK), paint(box(15, 1.6, 15, 0, 0.8, 0), STONE), paint(box(14, 1, 14, 0, 40, 0), STONE)];
    parts.push(paint(box(14.4, 13, 14.4, 0, 62.5, 0), STONE));
    for (const [x, z] of [[-6.6, -6.6], [6.6, -6.6], [-6.6, 6.6], [6.6, 6.6]]) parts.push(paint(box(1.6, 15, 1.6, x, 62.5, z), STONE), paint(cyl(0.01, 1.1, 6, 4, x, 72.5, z), SLATE));
    for (const [x, z, ry] of [[0, 7.25, 0], [0, -7.25, 0], [7.25, 0, Math.PI / 2], [-7.25, 0, Math.PI / 2]]) { const o = box(5, 8.5, 0.3, 0, 0, 0); o.rotateY(ry); o.translate(x, 63, z); parts.push(paint(o, rgb(0x0e0a0a))); }
    parts.push(paint(cyl(0.01, 10.5, 26, 4, 0, 82, 0).rotateY(Math.PI / 4), SLATE));
    parts.push(paint(cyl(0.12, 0.12, 6, 4, 0, 97.5, 0), GOLD));
    return merge(parts);
  },
  face() { const g = new THREE.CircleGeometry(5, 40); return g; },
  hand(len, w) { const g = new THREE.BoxGeometry(w, len, 0.25); g.translate(0, len / 2 - 0.6, 0.2); return paint(g, IRON); },
  // a folding table, the free apples piled on it, the sign taped to its front
  apples() {
    const parts = [paint(box(26, 1, 12, 0, 9, 0), WHITE), paint(box(26.4, 4, 0.2, 0, 7.2, 6.1), WHITE)];
    for (const [x, z] of [[-12, -5], [12, -5], [-12, 5], [12, 5]]) parts.push(paint(box(0.6, 8.5, 0.6, x, 4.25, z), rgb(0x8a8a90)));
    let k = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) for (let j = 0; j < 4 - row; j++) {
      const x = (i - (3 - row) / 2) * 4.4 + (k % 3 - 1) * 4.6, z = (j - (3 - row) / 2) * 4.4, y = 11.6 + row * 3.4;
      parts.push(paint(sph(2.3, 1, 0.92, 1, x, y, z, 14, 10), rgb([0xc81818, 0xa81010, 0xd82a1a][k % 3])), paint(box(0.25, 1.2, 0.25, x + 0.2, y + 2.4, z), rgb(0x4a3018)));
      k++;
    }
    return merge(parts);
  },
  freeFace() { return signFace(13, 3.6, 0, 7.4, 6.25); },
  // the couch: a chaise with a rug over it, the empty chair at its head, the tissues, a lamp
  couch() {
    const parts = [paint(box(30, 3, 9, 0, 4, 0), rgb(0x6a2a1e)), paint(box(30, 1.6, 9.4, 0, 6.2, 0), rgb(0x9a3a26))];
    const head = box(8, 5, 9.4, 0, 0, 0); head.rotateZ(0.5); head.translate(-12.5, 8.4, 0); parts.push(paint(head, rgb(0x8a3422)));
    for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) parts.push(paint(box(3.6, 0.3, 2.6, -6 + i * 3.8, 7.15, -2.8 + j * 2.8), rgb([0xc82a2a, 0x2a4a9a, 0xe8b040, 0x3a7a4a][(i + j) % 4])));
    for (const [x, z] of [[-14, -4], [14, -4], [-14, 4], [14, 4]]) parts.push(paint(cyl(0.5, 0.3, 2.6, 8, x, 1.3, z), WOOD));
    parts.push(paint(box(9, 1.6, 9, -24, 4.8, 9), rgb(0x2a1810)), paint(box(9, 9, 2, -24, 9, 4.6), rgb(0x2a1810)), paint(box(2, 5, 9, -28.6, 6.5, 9), rgb(0x2a1810)), paint(box(2, 5, 9, -19.4, 6.5, 9), rgb(0x2a1810)));
    parts.push(paint(box(3, 0.4, 4, -24, 5.8, 9.5), CREAM));
    parts.push(paint(cyl(2.4, 2.4, 0.6, 16, 18, 7, 9), WOOD), paint(cyl(0.4, 0.4, 7, 8, 18, 3.5, 9), WOOD), paint(box(2.6, 1.6, 2, 18, 8.1, 9), rgb(0xe8e4f0)), paint(box(1.2, 0.8, 0.2, 18, 9, 9), WHITE));
    parts.push(paint(cyl(1.6, 2, 0.6, 14, 24, 0.3, -2), IRON), paint(cyl(0.25, 0.25, 15, 6, 24, 7.8, -2), GOLD));
    return merge(parts);
  },
  couchShade() { const g = new THREE.CylinderGeometry(1.8, 3.2, 3.4, 20, 1, true); g.translate(24, 16.4, -2); return paint(g, rgb(0xf0d8a8)); },
  // a gold stanchion, and half a ribbon (the other half is the same, turned round)
  ribbonPost() { return merge([paint(cyl(1.6, 2, 0.8, 14, 0, 0.4, 0), GOLD), paint(cyl(0.35, 0.35, 1, 8, 0, 0.5, 0), GOLD), paint(sph(0.7, 1, 1, 1, 0, 1, 0, 10, 8), GOLD)]); },
  ribbon() { return merge([paint(box(9.2, 0.8, 0.12, 4.6, 0, 0), rgb(0xb01c38)), paint(box(9.2, 0.1, 0.16, 4.6, 0.42, 0), GOLD), paint(box(9.2, 0.1, 0.16, 4.6, -0.42, 0), GOLD)]); },
  // the stage: the platform, its steps, the lectern with the crest, the backdrop, two flags
  stage() {
    const parts = [paint(box(46, 4, 18, 0, 2, 0), rgb(0x3a2418)), paint(box(46.4, 3.4, 0.3, 0, 1.8, 9.05), MAROON)];
    for (let k = 0; k < 4; k++) parts.push(paint(box(10, 1, 3, 0, 0.5 + k, 11 + (3 - k) * 0), WOOD));
    parts.push(paint(box(5, 7, 4, 0, 7.5, 3), WOOD), paint(box(5.6, 0.5, 4.6, 0, 11.1, 3), WOOD), paint(cyl(1.4, 1.4, 0.2, 20, 0, 8.5, 5.05).rotateX(Math.PI / 2).translate(0, 0, 0), GOLD));
    parts.push(paint(box(46, 24, 0.8, 0, 16, -8.6), MAROON), paint(box(47, 1, 1, 0, 28.4, -8.4), GOLD), paint(box(47, 1, 1, 0, 4.2, -8.4), GOLD), paint(box(1, 24, 1, -23, 16, -8.4), GOLD), paint(box(1, 24, 1, 23, 16, -8.4), GOLD));
    const ring = new THREE.TorusGeometry(6, 0.5, 8, 40); ring.translate(-9, 16.5, -8.0); parts.push(paint(ring, GOLD));
    for (const s of [-1, 1]) { parts.push(paint(cyl(0.3, 0.3, 30, 6, s * 26, 15, -6), GOLD)); const f = box(7, 4.6, 0.2, s * 22.4, 26.8, -6); parts.push(paint(f, s > 0 ? GOLD : MAROON)); }
    return merge(parts);
  },
  // the gold star, a sticker the size of a car
  star() { const sh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 3.2 : 7.4; const x = Math.cos(a) * r, y = -Math.sin(a) * r; if (k) sh.lineTo(x, y); else sh.moveTo(x, y); } sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.3, bevelSegments: 1 }); return paint(g, rgb(0xffc830)); },
  // a mortarboard
  cap() { const g = box(4.2, 0.3, 4.2, 0, 0, 0); return merge([paint(g, GOWN), paint(cyl(1.4, 1.5, 1.2, 14, 0, -0.75, 0), GOWN), paint(cyl(0.25, 0.25, 0.2, 8, 0, 0.25, 0), GOLD), paint(box(0.15, 1.6, 0.15, 1.9, -0.7, 1.9), GOLD)]); },
  // a balloon and its string
  balloon() { return merge([paint(sph(2.2, 1, 1.18, 1, 0, 0, 0, 16, 12), WHITE), paint(cyl(0.01, 0.4, 0.6, 6, 0, -2.75, 0), WHITE)]); },
  string() { return paint(box(0.06, 1, 0.06, 0, -0.5, 0), rgb(0xd8d8d8)); },
  // a blue light call box: the pillar, the speaker panel, the red band (the dome is its own)
  phone() { return merge([paint(box(2.2, 14, 2.2, 0, 7, 0), rgb(0xd8dce0)), paint(box(2.3, 1.2, 2.3, 0, 11.6, 0), rgb(0xc81a20)), paint(box(1.6, 3, 0.2, 0, 7.5, 1.15), rgb(0x2a2c30)), paint(sph(0.3, 1, 1, 1, 0, 6.6, 1.3, 8, 6), rgb(0xd82020)), paint(box(2.5, 0.6, 2.5, 0, 14.2, 0), rgb(0x2a2c30))]); },
  phoneDome() { return paint(sph(1.1, 1, 1.15, 1, 0, 15.4, 0, 14, 10), rgb(0x6aa0ff)); },
  // a dissertation the height of a house, standing: cloth boards, the spine with its gold, the pages
  thesis(cl) { const C = rgb(cl); const parts = [paint(box(4.4, 32, 22, 0, 16, 0), C), paint(box(3.4, 31, 21, 0.2, 16, 0.2), CREAM)]; for (const y of [4, 5, 26, 27, 28.2]) parts.push(paint(box(4.6, 0.35, 0.2, 0, y, 11.05), GOLD)); for (let k = 0; k < 5; k++) parts.push(paint(box(3.4, 0.6, 0.2, 0, 21 - k * 1.4, 11.05), rgb(0xf0c860))); return merge(parts); },
  // a bay of the cloister: two piers, the round arch, the roof over the walk, the back wall
  arch() {
    const parts = [];
    for (const z of [-7, 7]) parts.push(paint(box(2.6, 16, 2.6, 0, 8, z), STONE), paint(box(3.2, 1, 3.2, 0, 16.2, z), STONE));
    for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI, x = 0, y = 16.5 + Math.sin(a) * 5.6, z = -Math.cos(a) * 5.6; const b = box(2.4, 1.6, 1.6, x, y, z); parts.push(paint(b, STONE)); }
    parts.push(paint(box(3, 3.4, 16.4, 0, 23.6, 0), STONE), paint(box(14, 0.8, 17, -6.5, 25.6, 0).rotateZ(0.2), SLATE));
    parts.push(paint(box(1.2, 26, 16.4, -13, 13, 0), rgb(0x2e2a2a)));
    return merge(parts);
  },
  // a desk and its chair, the paper, the pencil
  desk() {
    const parts = [paint(box(7, 0.5, 5, 0, 7.5, 0), WOOD)];
    for (const [x, z] of [[-3.2, -2.2], [3.2, -2.2], [-3.2, 2.2], [3.2, 2.2]]) parts.push(paint(box(0.35, 7.3, 0.35, x, 3.65, z), rgb(0x6a6a70)));
    parts.push(paint(box(4, 0.4, 4, 0, 4.4, 4.4), WOOD), paint(box(4, 4.2, 0.35, 0, 6.6, 6.3), WOOD));
    for (const [x, z] of [[-1.8, 2.7], [1.8, 2.7], [-1.8, 6.1], [1.8, 6.1]]) parts.push(paint(box(0.3, 4.3, 0.3, x, 2.15, z), rgb(0x6a6a70)));
    parts.push(paint(box(3.2, 0.06, 4.2, -0.6, 7.78, 0.2), WHITE), paint(box(0.25, 0.25, 3.2, 1.7, 7.9, 0.2), rgb(0xf0c030)));
    return merge(parts);
  },
  // the exam hall's clock, hung on two rods, a face each way (the faces and hands are their own)
  bigClock() { const parts = [paint(new THREE.TorusGeometry(6.2, 0.6, 10, 40), rgb(0x2a2420)), paint(cyl(6, 6, 1, 40, 0, 0, 0).rotateX(Math.PI / 2), rgb(0x1a1414))]; for (const s of [-1, 1]) parts.push(paint(box(0.3, 30, 0.3, s * 3.4, 20.6, 0), IRON)); return merge(parts); },
  // a white folding chair, a mortarboard left on its seat
  chair() {
    const parts = [paint(box(4.2, 0.4, 4.2, 0, 4.6, 0), WHITE), paint(box(4.2, 3.6, 0.35, 0, 7.6, -2.0), WHITE), paint(box(4.2, 0.5, 0.4, 0, 9.3, -2.0), WHITE)];
    for (const sx of [-1.9, 1.9]) { const a = box(0.3, 6.6, 0.3, sx, 3.2, 0); a.rotateX(0.38); parts.push(paint(a, rgb(0xc8c8cc))); const b = box(0.3, 9.4, 0.3, sx, 4.6, -1.2); b.rotateX(-0.22); parts.push(paint(b, rgb(0xc8c8cc))); }
    const cap = box(3.2, 0.25, 3.2, 0, 5.2, 0.2); cap.rotateY(0.6); parts.push(paint(cap, GOWN), paint(cyl(1.0, 1.1, 0.6, 12, 0, 4.95, 0.2), GOWN), paint(box(0.12, 0.12, 1.6, 0.6, 5.36, 0.6), GOLD));
    return merge(parts);
  },
  // a gold pole, one long, hung down from where it's put (stretched to fit)
  pole() { const g = new THREE.CylinderGeometry(0.32, 0.32, 1, 8); g.translate(0, -0.5, 0); return paint(g, GOLD); },
  // a sheet of paper (an exam, a page of the dissertation)
  paper() { const g = new THREE.PlaneGeometry(2.2, 3); return paint(g, rgb(0xf4f2ec)); },
  // a slide screen hung over the road: the case, the screen's edge, the pull, the two cables
  slideCase() { return merge([paint(box(25.4, 1.4, 1.4, 0, 5.3, -0.1), IRON), paint(box(24.2, 9.4, 0.15, 0, 0.4, -0.2), rgb(0xe8e6e0)), paint(box(1.6, 0.5, 0.3, 0, -4.6, -0.1), IRON), ...[-11, 11].map((x) => paint(box(0.1, 40, 0.1, x, 25.8, -0.1), IRON))]); },
};

// the lines on the slides: what's sung, as a lecture would put it
extend({
  layers: {
    rpdHall: (M) => [hallGeometry(), M.rpdHallM || (M.rpdHallM = hallMaterial()), 140, { aTint: 3, aSeed: 1 }],
    rpdLampPost: (M) => [RPD.lampPost(), VCm(M, 'rpdLampPostM', 0.08, { roughness: 0.4, metalness: 0.6 }), 320, {}],
    rpdGlobe: (M) => [RPD.globe(), VCm(M, 'rpdGlobeM', 1.6, { roughness: 0.3 }), 320, {}],
    rpdGradLow: (M) => [RPD.gradLow(), VCm(M, 'rpdGradM', 0.22, { roughness: 0.6 }), 420, {}],
    rpdGradUp: (M) => [RPD.gradUp(), VCm(M, 'rpdGradM', 0.22, { roughness: 0.6 }), 420, {}],
    rpdGate: (M) => [RPD.gate(), VCm(M, 'rpdGateM', 0.3, { roughness: 0.6, metalness: 0.2 }), 2, {}],
    rpdFront: (M) => [RPD.front(), VCm(M, 'rpdFrontM', 0.2, { roughness: 0.8 }), 2, {}],
    rpdFrieze: (M) => [RPD.frieze(), pic(M, 'rpdFriezeM', tex().frieze, 0.5), 2, {}],
    rpdTower: (M) => [RPD.tower(), VCm(M, 'rpdTowerM', 0.15, { roughness: 0.8 }), 2, {}],
    rpdFace: (M) => [RPD.face(), pic(M, 'rpdFaceM', tex().clock, 1.1), 12, {}],
    rpdHandH: (M) => [RPD.hand(3.2, 0.7), VCm(M, 'rpdHandM', 0.1, { roughness: 0.5 }), 12, {}],
    rpdHandM: (M) => [RPD.hand(4.4, 0.45), VCm(M, 'rpdHandM', 0.1, { roughness: 0.5 }), 12, {}],
    rpdApples: (M) => [RPD.apples(), VCm(M, 'rpdApplesM', 0.3, { roughness: 0.3 }), 2, {}],
    rpdFreeFace: (M) => [RPD.freeFace(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    rpdCouch: (M) => [RPD.couch(), VCm(M, 'rpdCouchM', 0.45, { roughness: 0.6 }), 2, {}],
    rpdCouchShade: (M) => [RPD.couchShade(), M.rpdCouchShadeM || (M.rpdCouchShadeM = selfLit({ roughness: 0.8, side: THREE.DoubleSide }, 1.4)), 2, {}],
    rpdRibbonPost: (M) => [RPD.ribbonPost(), VCm(M, 'rpdGoldM', 0.35, { roughness: 0.25, metalness: 0.8 }), 20, {}],
    rpdRibbon: (M) => [RPD.ribbon(), VCm(M, 'rpdRibbonM', 0.7, { roughness: 0.3, side: THREE.DoubleSide }), 20, {}],
    rpdStage: (M) => [RPD.stage(), VCm(M, 'rpdStageM', 0.25, { roughness: 0.6 }), 2, {}],
    rpdStar: (M) => [RPD.star(), VCm(M, 'rpdStarM', 0.9, { roughness: 0.2, metalness: 0.75 }), 2, {}],
    rpdCap: (M) => [RPD.cap(), VCm(M, 'rpdCapM', 0.12, { roughness: 0.6 }), 90, {}],
    rpdBalloon: (M) => [RPD.balloon(), M.rpdBalloonM || (M.rpdBalloonM = negHook(new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.55, emissive: 0xffffff, emissiveIntensity: 0.25, vertexColors: false }), (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vTint * vTint;'); })), 40, { aTint: 3 }],
    rpdString: (M) => [RPD.string(), VCm(M, 'rpdStringM', 0.2, { roughness: 0.9 }), 40, {}],
    rpdPhone: (M) => [RPD.phone(), VCm(M, 'rpdPhoneM', 0.2, { roughness: 0.5 }), 60, {}],
    rpdPhoneDome: (M) => [RPD.phoneDome(), VCm(M, 'rpdPhoneDomeM', 1.6, { roughness: 0.2 }), 60, {}],
    rpdThesisA: (M) => [RPD.thesis(0x9a1e3a), VCm(M, 'rpdThesisM', 0.5, { roughness: 0.85 }), 30, {}],
    rpdThesisB: (M) => [RPD.thesis(0x2a4a8a), VCm(M, 'rpdThesisM', 0.5, { roughness: 0.85 }), 30, {}],
    rpdThesisC: (M) => [RPD.thesis(0x2e6a44), VCm(M, 'rpdThesisM', 0.5, { roughness: 0.85 }), 30, {}],
    rpdArch: (M) => [RPD.arch(), VCm(M, 'rpdArchM', 0.14, { roughness: 0.85 }), 140, {}],
    rpdDesk: (M) => [RPD.desk(), VCm(M, 'rpdDeskM', 0.38, { roughness: 0.6 }), 700, {}],
    rpdChair: (M) => [RPD.chair(), VCm(M, 'rpdChairM', 0.3, { roughness: 0.5 }), 700, {}],
    rpdPole: (M) => [RPD.pole(), VCm(M, 'rpdGoldM', 0.35, { roughness: 0.25, metalness: 0.8 }), 30, {}],
    rpdBigClock: (M) => [RPD.bigClock(), VCm(M, 'rpdBigClockM', 0.15, { roughness: 0.5 }), 2, {}],
    rpdPaper: (M) => [RPD.paper(), VCm(M, 'rpdPaperM', 0.45, { roughness: 0.8, side: THREE.DoubleSide }), 320, {}],
    rpdSlideCase: (M) => [RPD.slideCase(), VCm(M, 'rpdSlideCaseM', 0.3, { roughness: 0.6 }), 24, {}],
    rpdSlideFace: (M) => [signFace(23.4, 7.8, 0, 0.4, 0.0), M.sign, 24, { aIdx: 1, aWake: 2 }],
    rpdInk: (M) => [new THREE.PlaneGeometry(1, 1), M.rpdInkM || (M.rpdInkM = inkMaterial()), 64, { aRect: 4 }],
  },
  parts: {
    // a hall, lit
    rpdHall(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s));
      const v = S._rpdHv || (S._rpdHv = { aTint: null, aSeed: 0 }); v.aTint = it.tint; v.aSeed = it.seed;
      S.layers.rpdHall.add(m, v);
    },
    // a lamp on a path
    rpdLamp(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.rpdLampPost.add(m); S.layers.rpdGlobe.add(m);
      const k = S.rpdK ? S.rpdK.lamp : 1;
      glowAt(S, p.x, p.y + 15.4 * it.s, p.z, 7 * it.s, LAMP, 0.9 * k);
      poolAt(S, p.x, p.y + 0.1, p.z, 26 * it.s, LAMP, 0.35 * k);
    },
    // a graduate: the gown, and the rest bowing about the waist, all together, when she boasts
    rpdGrad(S, it, p, q, yaw) {
      const L = S.layers; void L.rpdGradLow; void L.rpdGradUp;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s;
      m.compose(p, q, S._s.set(s, s, s)); L.rpdGradLow.add(m);
      let bow = 0;
      if (it.bow) bow = 0.95 * smooth(it.bow - 0.32 - it.lag, it.bow - it.lag, T) * (1 - smooth(it.bow + 1.15, it.bow + 1.7, T));
      // a little sway as if breathing, never in step with each other
      const sway = Math.sin(T * 0.9 + it.seed * 20) * 0.02;
      const e = S._rpdE || (S._rpdE = new THREE.Euler(0, 0, 0, 'YXZ'));
      e.set(bow + sway, yaw, 0);
      const qq = (S._rpdGq || (S._rpdGq = new THREE.Quaternion())).setFromEuler(e);
      const w = S._rpdGw || (S._rpdGw = new THREE.Vector3()); w.set(p.x, p.y + 7.2 * s, p.z);
      m.compose(w, qq, S._s.set(s, s, s)); L.rpdGradUp.add(m);
      // the lamplight on the head, going down with it when they bow
      const hd = S._rpdGh || (S._rpdGh = new THREE.Vector3()); hd.set(0, 7.4 * s, 0).applyQuaternion(qq).add(w);
      glowAt(S, hd.x, hd.y, hd.z, 6.5 * s, LAMP, 0.32);
    },
    // the slide a line is on, hung over the road
    rpdSlide(S, it, p) {
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), h = sm.yaw;
      const e = S._e; e.set(0, h + Math.PI, Math.sin(T * 0.8 + it.t) * 0.015);
      const fq = (S._rpdSq || (S._rpdSq = new THREE.Quaternion())).setFromEuler(e);
      p.y = sm.y + (it.h || 13);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s));
      S.layers.rpdSlideCase.add(m); S.layers.rpdSlideFace.add(m, signV(it.idx, 1, 0));
      glowAt(S, p.x, p.y, p.z, 30 * s, WARM, 0.1);
    },
    // the set-pieces, each where it's sung
    rpdProp(S, it, p, q, yaw) {
      const L = S.layers;
      for (const k of ['rpdGate', 'rpdFront', 'rpdFrieze', 'rpdTower', 'rpdFace', 'rpdHandH', 'rpdHandM', 'rpdApples', 'rpdFreeFace', 'rpdCouch', 'rpdCouchShade', 'rpdRibbonPost', 'rpdRibbon', 'rpdStage', 'rpdStar', 'rpdCap', 'rpdBalloon', 'rpdString', 'rpdBigClock', 'rpdPaper', 'rpdPole']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._rpdv || (S._rpdv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, c, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.5, c = LAMP, r = 40, x = 0, z = 0) => { const w = local(at, yaw, x * s, 0, z * s, S._o); poolAt(S, w.x, (it.h ?? 0) + 0.15, w.z, r * s, c, k2); };
      // (quaternions kept in numbered slots, so none is made a frame)
      const quat = (slot, ry = 0, rx = 0, rz = 0) => { const e = S._rpdE2 || (S._rpdE2 = new THREE.Euler(0, 0, 0, 'YXZ')); e.set(rx, yaw + ry, rz); const Q = S._rpdQs || (S._rpdQs = []); return (Q[slot] || (Q[slot] = new THREE.Quaternion())).setFromEuler(e); };
      const lampK = S.rpdK ? S.rpdK.lamp : 1;
      if (k === 'gate') {
        put('rpdGate');
        for (const sd of [-1, 1]) { light(sd * 17, 31.2, -2.2, 9, LAMP, 1.1 * lampK); light(sd * 17, 31.2, 2.2, 9, LAMP, 1.1 * lampK); spot(0.4 * lampK, LAMP, 30, sd * 17, 4); }
        light(0, 41.5, 0.8, 14, [1, 0.8, 0.4], 0.35);
      } else if (k === 'front') {
        put('rpdFront'); put('rpdFrieze');
        for (let j = 0; j < 6; j++) { light(-17.5 + j * 7, 3, 6, 9, WARM, 0.35); }
        spot(0.5, WARM, 60, 0, 10);
      } else if (k === 'tower') {
        put('rpdTower');
        // four faces, the hands going round the wrong way
        const hh = -T * 0.55, mm = -T * 3.3;
        for (let f = 0; f < 4; f++) {
          const ry = f * Math.PI / 2, c = Math.cos(ry), sn = Math.sin(ry), ox = sn * 6.62, oz = c * 6.62;
          put('rpdFace', ox, 48, oz, quat(10 + f, ry));
          put('rpdHandH', ox * 1.012, 48, oz * 1.012, quat(20 + f, ry, 0, hh));
          put('rpdHandM', ox * 1.02, 48, oz * 1.02, quat(30 + f, ry, 0, mm));
          light(ox * 1.1, 48, oz * 1.1, 13, [1, 0.92, 0.75], 0.3);
        }
        // the bell
        const bk = it.bell !== undefined ? Math.exp(-Math.max(0, T - it.bell) * 1.6) * (T > it.bell - 0.05 ? 1 : 0) : 0;
        light(0, 63, 0, 26, [1, 0.85, 0.55], 0.25 + 1.2 * bk);
      } else if (k === 'apples') {
        put('rpdApples'); put('rpdFreeFace', 0, 0, 0, q, s, signV(S.atlas.index.RPDFREE, 1, 0));
        light(0, 22, 4, 26, WARM, 0.3); spot(0.55, WARM, 40);
      } else if (k === 'couch') {
        put('rpdCouch'); put('rpdCouchShade');
        light(24, 16, -2, 10, LAMP, 1.2); spot(0.7, LAMP, 44, 6, 2);
      } else if (k === 'ribbon') {
        // a ribbon across the road at her height; it parts the moment she reaches it and the halves
        // drop to hang from their posts (out of the way of the camera coming through behind her)
        const ty = S.course.sample(it.t).y + 2.4;
        const cut = smooth(it.t - 0.12, it.t + 0.06, T), flut = cut * Math.sin((T - it.t) * 9) * 0.2 * Math.exp(-Math.max(0, T - it.t) * 0.8);
        for (const sd of [-1, 1]) {
          const w = local(at, yaw, sd * 9.4, 0, 0, S._o); w.y = ty - 2.5;
          // the stanchion: a pole from the ground to the ribbon
          const pole = S._rpdPole || (S._rpdPole = new THREE.Vector3()); pole.copy(w); pole.y = 0;
          m.compose(pole, q, S._s.set(1, 1, 1)); L.rpdRibbonPost.add(m);
          const top = S._rpdTop || (S._rpdTop = new THREE.Vector3()); top.copy(w); top.y = ty;
          m.compose(top, q, S._s.set(0.6, 0.6, 0.6)); L.rpdRibbonPost.add(m);
          // the half: from the post to the middle, then hanging down from the post
          const e = S._rpdE3 || (S._rpdE3 = new THREE.Euler(0, 0, 0, 'YXZ'));
          e.set(0, yaw + (sd > 0 ? Math.PI : 0), -(cut * 1.45 + flut) * 1);
          const rq = (S._rpdRq || (S._rpdRq = new THREE.Quaternion())).setFromEuler(e);
          m.compose(top, rq, S._s.set(1, 1, 1)); L.rpdRibbon.add(m);
          glowAt(S, top.x, top.y + 0.8, top.z, 3, [1, 0.85, 0.5], 0.6);
        }
        // a pole the height of the road: the stanchion stretched up to it
        for (const sd of [-1, 1]) { const w = local(at, yaw, sd * 9.4, 0, 0, S._o); const top = S._rpdMid || (S._rpdMid = new THREE.Vector3()); top.set(w.x, ty, w.z); m.compose(top, q, S._s.set(1, ty, 1)); L.rpdPole.add(m); }
      } else if (k === 'stage') {
        put('rpdStage');
        light(-14, 20, 2, 20, WARM, 0.35); light(14, 20, 2, 20, WARM, 0.35); spot(0.6, WARM, 50, 0, 6);
        // the gold star: slapped on the backdrop on breakdown day
        if (it.star !== undefined && T > it.star - 0.12) {
          const u = clamp((T - it.star + 0.12) / 0.2, 0, 1);
          const sc = s * (u < 1 ? 2.4 - 1.4 * u * u : 1 + 0.08 * Math.exp(-(T - it.star) * 6) * Math.sin((T - it.star) * 30));
          const w = local(at, yaw, 11 * s, 18 * s, -7.9 * s, S._o);
          m.compose(w, quat(1, 0, 0, 0.18), S._s.set(sc, sc, sc)); L.rpdStar.add(m);
          glowAt(S, w.x, w.y, w.z, 22 * s, [1, 0.8, 0.3], 0.55 + 1.5 * Math.exp(-Math.max(0, T - it.star) * 3));
        }
      } else if (k === 'caps') {
        // thrown up from both sides at "celebrate", tumbling, coming down onto the grass
        const R = seeded(77), t0 = it.toss;
        if (T < t0 - 0.05) return;
        for (let j = 0; j < 64; j++) {
          const side = j % 2 ? 1 : -1, dt = (R() - 0.3) * 3.2, x = side * (18 + R() * 46), v = 26 + R() * 16, wait = R() * 0.5, spin = 3 + R() * 6, a0 = R() * 6.3;
          const tau = Math.max(0, T - t0 - wait);
          const y = Math.max(0, v * tau - 11 * tau * tau);
          const landed = tau > v / 11;
          const w = S._rpdCw || (S._rpdCw = new THREE.Vector3());
          S.track.ground(it.t + dt, x, w); w.y = y + 0.3;
          const e = S._rpdE4 || (S._rpdE4 = new THREE.Euler(0, 0, 0, 'YXZ'));
          if (landed) e.set(0, a0, 0); else e.set(tau * spin, a0 + tau * 2, tau * spin * 0.6);
          const cq = (S._rpdCq || (S._rpdCq = new THREE.Quaternion())).setFromEuler(e);
          m.compose(w, cq, S._s.set(s, s, s)); L.rpdCap.add(m);
        }
      } else if (k === 'balloons') {
        // tied in a bunch to a post at her height until "let go", then up and away
        const top = S.course.sample(it.t).y + 4, R = seeded(19);
        const anchor = S._rpdBa || (S._rpdBa = new THREE.Vector3()); anchor.set(at.x, top, at.z);
        m.compose(anchor, q, S._s.set(1, top, 1)); L.rpdPole.add(m);
        const cols = [[0.55, 0.06, 0.12], [0.95, 0.72, 0.25], [0.95, 0.93, 0.88], [0.75, 0.76, 0.8]];
        const vals = S._rpdBv || (S._rpdBv = { aTint: null });
        for (let j = 0; j < 26; j++) {
          const ax = (R() - 0.5) * 7, az = (R() - 0.5) * 7, ay = 6 + R() * 6, rise = 5 + R() * 4, drift = (R() - 0.5) * 3;
          const go = Math.max(0, T - it.go - R() * 0.25);
          const b = S._rpdBb || (S._rpdBb = new THREE.Vector3());
          b.set(anchor.x + ax * (1 + go * 0.35) + Math.sin(T * 1.3 + j) * 0.5 + drift * go, anchor.y + ay + go * rise + 0.5 * go * go, anchor.z + az * (1 + go * 0.35) + Math.cos(T * 1.1 + j) * 0.5);
          vals.aTint = cols[j % 4];
          m.compose(b, q, S._s.set(s, s, s)); L.rpdBalloon.add(m, vals);
          // the string down to the knot at the post (until it's let go)
          const len = go > 0 ? 6 : b.distanceTo(anchor);
          const dir = S._rpdBd || (S._rpdBd = new THREE.Vector3()); dir.copy(anchor).sub(b);
          if (go > 0) dir.set(0, -1, 0); else dir.normalize();
          const sq = (S._rpdBq || (S._rpdBq = new THREE.Quaternion())).setFromUnitVectors(S._rpdDown || (S._rpdDown = new THREE.Vector3(0, -1, 0)), dir);
          const st = S._rpdBs || (S._rpdBs = new THREE.Vector3()); st.copy(b); st.y -= 2.7;
          m.compose(st, sq, S._s.set(1, len, 1)); L.rpdString.add(m);
        }
        light(0, top - at.y, 0, 6, [1, 0.85, 0.6], 0.6);
      } else if (k === 'clock') {
        // the exam hall's clock, over the road; running backwards; down when the hall goes
        const fy = floorAt(S.course, it.t);
        const fall = it.fall !== undefined ? clamp((T - it.fall) / 0.9, 0, 1) : 0;
        const w = local(at, yaw, 0, 0, 0, S._o); w.y = fy + 28 - fall * fall * 26;
        const cq = quat(2, 0, fall * 1.35, fall * 0.3);
        m.compose(w, cq, S._s.set(s, s, s)); L.rpdBigClock.add(m);
        const hh = -T * 0.8, mm = -T * 4.4;
        for (const sd of [1, -1]) {
          const f = S._rpdKf || (S._rpdKf = new THREE.Vector3()); f.set(0, 0, sd * 0.55).applyQuaternion(cq).add(w);
          const fq = quat(sd > 0 ? 40 : 41, sd > 0 ? 0 : Math.PI, fall * 1.35 * sd, fall * 0.3);
          m.compose(f, fq, S._s.set(1.15, 1.15, 1)); L.rpdFace.add(m);
          const f2 = S._rpdKf2 || (S._rpdKf2 = new THREE.Vector3()); f2.set(0, 0, sd * 0.7).applyQuaternion(cq).add(w);
          m.compose(f2, quat(sd > 0 ? 42 : 43, sd > 0 ? 0 : Math.PI, fall * 1.35 * sd, hh * sd), S._s.set(1.3, 1.3, 1)); L.rpdHandH.add(m);
          m.compose(f2, quat(sd > 0 ? 44 : 45, sd > 0 ? 0 : Math.PI, fall * 1.35 * sd, mm * sd), S._s.set(1.3, 1.3, 1)); L.rpdHandM.add(m);
        }
        glowAt(S, w.x, w.y, w.z, 16, [0.95, 0.97, 1], 0.25 * (1 - fall));
      } else if (k === 'papers') {
        // the papers lift off the desks (or out of the books) and go up turning over and over
        const R = seeded(it.seed0 ?? 5), fy = it.room ? floorAt(S.course, it.t) : 0;
        if (T < it.lift - 0.2) return;
        for (let j = 0; j < (it.n ?? 110); j++) {
          const side = j % 2 ? 1 : -1, dt = (R() - 0.5) * (it.span ?? 4), x = side * ((it.x0 ?? 14) + R() * (it.x1 ?? 30)), wait = R() * 0.8, up = 4 + R() * 7;
          const tau = Math.max(0, T - it.lift - wait);
          const w = S._rpdPw || (S._rpdPw = new THREE.Vector3());
          S.track.ground(it.t + dt, x, w);
          w.x += Math.sin(tau * 1.3 + j) * tau * 1.4; w.z += Math.cos(tau * 1.1 + j * 2) * tau * 1.4;
          w.y = fy + (it.y0 ?? 8) + up * tau - 0.18 * tau * tau * up;
          const e = S._rpdE5 || (S._rpdE5 = new THREE.Euler(0, 0, 0, 'YXZ'));
          e.set(-Math.PI / 2 + tau * (2 + R() * 3), R() * 6.3 + tau, tau * (1 + R() * 2));
          const pq = (S._rpdPq || (S._rpdPq = new THREE.Quaternion())).setFromEuler(e);
          m.compose(w, pq, S._s.set(s * 1.3, s * 1.3, s * 1.3)); L.rpdPaper.add(m);
        }
      }
    },
    // the inkblot screen at the end of the lecture hall: the blot spreads over it until it fills
    // it; she goes through it on the downbeat and it tears into pieces that fly
    rpdScreen(S, it, p, q, yaw) {
      const L = S.layers; void L.rpdInk;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, M = S.mats;
      const u = M.rpdInkM.uniforms;
      u.uTime.value = T;
      // a small blot through the verse; it spreads with the lights going down, and fills the screen by "by design"
      u.uGrow.value = 0.2 + 0.12 * smooth(40.4, 44.0, T) + 0.1 * smooth(44.0, 46.4, T) + 0.4 * smooth(46.45, 47.4, T);
      u.uLight.value = 0.75 + 0.55 * smooth(41.5, 43.5, T);
      const fy = it.h ?? 0, W = it.hw * 2, H = it.hh, rect = S._rpdRect || (S._rpdRect = { aRect: [0, 0, 1, 1] });
      const tear = T - it.at;
      const e = S._rpdE6 || (S._rpdE6 = new THREE.Euler(0, 0, 0, 'YXZ'));
      const sq = S._rpdSq2 || (S._rpdSq2 = new THREE.Quaternion());
      if (tear < 0) {
        const w = local(p, yaw, 0, 0, -0.4, S._o); w.y = fy + H / 2;
        e.set(0, yaw, 0); sq.setFromEuler(e);
        m.compose(w, sq, S._s.set(W, H, 1)); rect.aRect[0] = 0; rect.aRect[1] = 0; rect.aRect[2] = 1; rect.aRect[3] = 1; L.rpdInk.add(m, rect);
        const g = local(p, yaw, 0, H / 2, 8, S._o); glowAt(S, g.x, fy + H / 2, g.z, 40, [0.9, 0.92, 1], 0.12 + 0.2 * smooth(42, 47, T));
        return;
      }
      if (tear > 6) return;
      // the pieces: six by five, burst out from where she went through, turning, falling; they stay
      // where the screen was, so she's through them in a moment
      const R = seeded(23), NX = 6, NY = 5;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
        const cx = (i + 0.5) / NX - 0.5, cy = (j + 0.5) / NY - 0.5;
        const vx = Math.sign(cx || 0.01) * (24 + R() * 22) + cx * 60, vy = 10 + cy * 34 + R() * 8, vz = -6 + R() * 14, spin = (R() - 0.5) * 12;
        const ox = cx * W + vx * tear, oy = H / 2 + cy * H + vy * tear - 11 * tear * tear, oz = -0.4 + vz * tear;
        const w = local(p, yaw, ox, 0, oz, S._o); w.y = fy + Math.max(0.5, oy);
        e.set(spin * tear * 0.6, yaw + spin * tear * 0.4, spin * tear); sq.setFromEuler(e);
        m.compose(w, sq, S._s.set(W / NX * 1.04, H / NY * 1.04, 1));
        rect.aRect[0] = i / NX; rect.aRect[1] = j / NY; rect.aRect[2] = 1 / NX; rect.aRect[3] = 1 / NY; L.rpdInk.add(m, rect);
      }
    },
    // a call box, its blue light strobing with the stabs and when it rings
    rpdPhone(S, it, p, q) {
      const L = S.layers, m = S._m, s = it.s, T = S.tNow ?? 0;
      m.compose(p, q, S._s.set(s, s, s)); L.rpdPhone.add(m); L.rpdPhoneDome.add(m);
      let ring = 0;
      for (const r of it.rings) if (T > r - 0.05) ring = Math.max(ring, Math.exp(-(T - r) * 1.2) * (0.5 + 0.5 * Math.sign(Math.sin((T - r) * 40))));
      const k = 0.5 + 0.6 * (S.beat || 0) + 1.6 * ring;
      glowAt(S, p.x, p.y + 15.4 * s, p.z, 9 * s, BLUE, k);
      poolAt(S, p.x, p.y + 0.1, p.z, 20 * s, BLUE, 0.3 * k);
    },
    // a dissertation, standing
    rpdThesis(S, it, p, q, yaw) {
      const e = S._rpdE7 || (S._rpdE7 = new THREE.Euler(0, 0, 0, 'YXZ')); e.set(0, yaw, it.lean);
      const tq = (S._rpdTq7 || (S._rpdTq7 = new THREE.Quaternion())).setFromEuler(e);
      const m = S._m; m.compose(p, tq, S._s.set(it.s, it.s, it.s)); S.layers[it.layer].add(m);
      glowAt(S, p.x, p.y + 2, p.z, 24 * it.s, WARM, 0.18);
    },
    rpdArch(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.rpdArch.add(m); const k = S.rpdK ? S.rpdK.lamp : 1; glowAt(S, p.x, p.y + 14.5, p.z, 9, LAMP, 0.9 * k); poolAt(S, p.x, p.y + 0.12, p.z, 20, LAMP, 0.35 * k); },
    rpdChair(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.rpdChair.add(m); },
    rpdDeskP(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.rpdDesk.add(m); },
  },
  kits: {
    // the quad: halls both sides facing the paths, trees between them
    rpdQuad(S, z, R) {
      const tints = [col(0x8a3e2e), col(0x7a3428), col(0x9a4a34), col(0x6a3026), col(0x8a4a3a)];
      const x0 = z.x ?? 46;
      for (const side of [-1, 1]) for (let t = z.from + R() * 0.3; t < z.to; t += (z.sparse ? 1.6 : 0.95) + R() * 0.35) {
        S.items.push({ t, x: side * (x0 + R() * 10), rot: SIDE(side), s: 0.9 + R() * 0.2, parts: 'rpdHall', tint: pick(R, tints), seed: R() });
        if (R() < 0.55) S.items.push({ t: t + R() * 0.4, x: side * (x0 + 50 + R() * 50), rot: (R() - 0.5) * 0.3 + SIDE(side), s: 0.8 + R() * 0.4, parts: 'rpdHall', tint: pick(R, tints), seed: R() });
        if (R() < 0.6) S.items.push({ t: t + 0.45 + R() * 0.2, x: side * (31 + R() * 6), s: 0.75 + R() * 0.35, parts: 'tree', tint: col(pick(R, [0x3a6a3e, 0x44724a, 0x4a7a4e])), seed: R() });
      }
    },
    rpdLamps(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.05, x: side * ((z.x ?? 20) + R() * 2), rot: 0, s: 1, parts: 'rpdLamp' }); },
    rpdGrads(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.4) for (const side of [-1, 1]) for (let r = 0; r < (z.rows ?? 2); r++) {
        // facing the road, turned a little toward her coming; the bow passes down the line a hair late
        S.items.push({ t: t + r * (z.every ?? 0.4) * 0.5 + R() * 0.04, x: side * ((z.x ?? 27) + r * 9 + R() * 1.5), rot: side > 0 ? Math.PI / 2 + 0.35 : -Math.PI / 2 - 0.35, s: 1 + R() * 0.06, parts: 'rpdGrad', seed: R(), bow: z.bow, lag: r * 0.05 + R() * 0.04 });
      }
    },
    rpdScreenAt(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, parts: 'rpdScreen', at: z.at, hw: 13, hh: 26, ahead: 46 })); },
    rpdChairs(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.34) for (const side of [-1, 1]) for (let r = 0; r < (z.rows ?? 4); r++) S.items.push({ t: t + R() * 0.02, x: side * ((z.x ?? 28) + r * 8), rot: Math.PI, s: 1.25, parts: 'rpdChair' }); },
    rpdPhones(S, z, R) {
      const rings = [116.7, 121.9];
      for (let t = z.from; t < z.to; t += z.every ?? 0.8) for (const side of [-1, 1]) S.items.push({ t: t + (side > 0 ? 0.4 : 0) * (z.every ?? 0.8), x: side * ((z.x ?? 19) + R()), rot: SIDE(side), s: 1, parts: 'rpdPhone', rings: rings.filter((r) => Math.abs(r - t) < 1.2) });
    },
    rpdTheses(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) { const n = 1 + Math.floor(R() * 3); for (let k = 0; k < n; k++) S.items.push({ t: t + k * 0.08, x: side * ((z.x ?? 34) + k * 5 + R() * 2), rot: SIDE(side), s: 0.85 + R() * 0.35, lean: k === n - 1 ? side * (0.15 + R() * 0.2) : 0, layer: pick(R, ['rpdThesisA', 'rpdThesisA', 'rpdThesisB', 'rpdThesisC']), parts: 'rpdThesis' }); } },
    rpdArches(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.36) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 22), rot: side > 0 ? 0 : Math.PI, s: 1, parts: 'rpdArch' }); },
    rpdDesks(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.3) for (const side of [-1, 1]) for (let r = 0; r < (z.rows ?? 4); r++) { const it = { t: t + R() * 0.02, x: side * ((z.x ?? 16) + r * 8), rot: Math.PI, s: 1, parts: 'rpdDeskP' }; S.items.push(z.floor ? onFloor(S, it) : it); } },
    rpdProps(S, z) {
      for (const c of z.at) {
        const it = { t: c.t, x: c.x, rot: c.rot ?? (c.x === 0 ? 0 : (c.face === false ? SIDE(c.x) : FACE(c.x))), s: c.s ?? 1, kind: c.kind, h: 0, parts: 'rpdProp', ahead: c.ahead ?? 46 };
        for (const k of ['star', 'toss', 'go', 'fall', 'lift', 'bell', 'n', 'span', 'x0', 'x1', 'y0', 'room', 'seed0']) if (c[k] !== undefined) it[k] = c[k];
        S.items.push(c.floor ? onFloor(S, it) : it);
      }
    },
  },
});
