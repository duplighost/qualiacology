// Grocery Store at 2 AM. A 24-hour supermarket at two in the morning, half its lights off for the
// night. In from the lot (sodium lamps, carts left in the stalls, OPEN 24 HOURS) through its sliding
// doors, which open with the chime, past the kiddie rocket rocking for nobody. The ceiling is the thing: a drop ceiling of fluorescent panels
// the height of a church, humming, a few dead, one flickering; every hanging sign is a line, and the
// walls are shelving all the way round under DAIRY, BAKERY, MEAT. The frozen aisle's doors light up
// just ahead of you; a frozen dinner stands on a lectern, its ingredients set like scripture. Aisle
// three: the canned corn stacked in a tower, a cart left beside it with a coat over the handle, a box
// of tissues on top. Then aisle after aisle, and on "we learn to look away" the products on the
// shelves turn their backs on you as you come; two carts stand back to back for "we practice being
// strangers"; and "but I see you" turns them all round at once and brings every light up warm: over
// the chest freezer, the store clock at two (it chimes twice).
// The checkouts: one lane open, lane 7, its light blinking; PAPER and PLASTIC, the plastic lighting
// on "I say plastic"; bags on the carousels breathing, containers for nothing. The seasonal aisle,
// pumpkins and sheet ghosts and a fir already. The deli's NOW SERVING calling numbers nobody holds on
// "if anyone would notice". For "maybe God is just a night manager" the store goes black and white,
// the monitors hung over the road showing you riding, live, from the camera on top of them; only the
// produce piled either side keeps its colour; two carts stand side by side in the same hollow glow,
// and the colour comes back from them. The bass goes and the store goes to its night lights, the
// domes on the ceiling glowing red, a wall of monitors with you on all of them. Then every light, a
// wave down the ceiling on the beat, to the exit, its doors sliding open on "slide open", cold air,
// the lot. A plastic bag goes along beside you and up into the sky on "which isn't much". The
// songwriter's notes are the lot's letterboards: FLUORESCENT LIGHTS ARE HUMMING HYMNS is struck
// through and the board turns round to THE CEILING HUMS ITS HOLLOW HYMNS, and the ceiling comes on
// over the lot without its store, its panels flickering on a tube at a time and hanging there to the
// horizon, humming on the beat, the rest of the notes going by under them; on "like the building
// itself is grieving" they go out one at a time, and the store is left alone in its lot, its windows
// breathing, the new line on its sign.
// The things are in gsa-props.js, the course and looks in gsa-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV, col, faceQ, tintV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import { AA_GLSL } from './aa.js';
import { GS, merge, canvasTex, scriptureTexture, clockTexture, coolerTexture } from './gsa-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const POOL_X = [-9.6, 9.6], HYMN_X = [-19.2, 0, 19.2], END_LAMPS = [[-60, 60], [0, 70], [60, 60], [-30, 110], [40, 110]], DOOR_SIDES = [-1, 1];
const FLUOL = [0.84, 1, 0.9], WARML = [1, 0.84, 0.6], SODIUM = [1, 0.6, 0.24], ICEL = [0.66, 0.86, 1], REDL = [1, 0.1, 0.08], WHITEL = [1, 0.97, 0.92],
  GOLDL = [1, 0.76, 0.36], CORNL = [1, 0.85, 0.3], PUMPL = [1, 0.55, 0.12], GREENL = [0.45, 1, 0.55], MISTL = [0.8, 0.92, 1], LOVEL = [1, 0.74, 0.56], GREYL = [0.8, 0.82, 0.86];
const RIDE_L = [REDL, GOLDL, ICEL], FIR_L = [REDL, GOLDL, GREENL, ICEL];

// ---------- the shared moods the whole store is lit by (gsa-world sets them each frame) ----------
// mono: how black-and-white the store is (the bridge); warm: how warm its light (the choruses);
// night: how many of its lights are off for the night
export const MOOD = { mono: { value: 0 }, warm: { value: 0 }, night: { value: 0.5 } };
// over song time: the half-lit store, the choruses lit warm and full, the bridge black and white,
// the night lights for the bass going, everything for the end
const MV = [0, 0, 0];
export function moodAt(T) {
  let night = 0.8, warm = 0.0, mono = 0;
  if (T > 54.6 && T < 86.5) { night = 0; warm = 1; }
  if (T > 86.5) { night = 0.6; warm = 0.15; }
  if (T > 113.4) { night = 0.5; warm = 0.35; }
  if (T > 128.45 && T < 155.4) { night = 0; warm = 1; }
  if (T > 155.4) { night = 0.25; warm = 0.2; }
  mono = smooth(156.9, 158.6, T) * (1 - smooth(169.0, 175.5, T));
  if (T > 169.0) warm = 0.2 + 0.6 * smooth(169.0, 175.0, T);
  if (T > 185.55 && T < 197.4) { night = 1; warm = 0.5; }
  if (T > 197.4) { night = 0; warm = 0.85; }
  MV[0] = night; MV[1] = warm; MV[2] = mono;
  return MV;
}

// ---------- materials ----------
// vertex-coloured and lit a little by its own colours; greys with the store when it goes black and white
function selfLit(opts, k = 0.5, mono = true) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMono = MOOD.mono;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uMono;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;')
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>\n ${mono ? 'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11))), uMono);' : ''}`);
  };
  return m;
}
const VC = (M, key, k, opts, mono = true) => M[key] || (M[key] = selfLit(opts, k, mono));
const paintM = (M) => VC(M, 'gsaPaintM', 0.22, { roughness: 0.55 });
const glossM = (M) => VC(M, 'gsaGlossM', 0.3, { roughness: 0.25, metalness: 0.1 });
const chromeM = (M) => VC(M, 'gsaChromeM', 0.28, { roughness: 0.25, metalness: 0.7 });
const darkM = (M) => VC(M, 'gsaDarkM', 0.12, { roughness: 0.45, metalness: 0.2 });
const glowyM = (M) => VC(M, 'gsaGlowyM', 1.6, { roughness: 0.6 });
const produceM = (M) => VC(M, 'gsaProduceM', 0.45, { roughness: 0.45 }, false);   // (the produce keeps its colour)
// a picture, lit by itself a little
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = (() => {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, ...opts });
  m.onBeforeCompile = (sh) => { sh.uniforms.uMono = MOOD.mono; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uMono;').replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11))), uMono * 0.999);'); };
  return m;
})());
let TEX = null;
const tex = () => TEX || (TEX = { scripture: scriptureTexture(), clock: clockTexture(), cooler: coolerTexture(), num: numTexture() });

// the numbers: lane lights 1-8 (row 0), NOW SERVING 47-54 (row 1), the aisles' numbers 1-8 (row 2)
function numTexture() {
  return canvasTex(1024, 384, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cw = 128, ch = 128;
    for (let i = 0; i < 8; i++) {
      // a lane light: the white number on its dark box
      let x = i * cw, y = 0;
      g.fillStyle = '#1a1a20'; g.fillRect(x + 4, y + 4, cw - 8, ch - 8);
      g.font = '900 92px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText(String(i + 1), x + cw / 2, y + ch / 2 + 4);
      // NOW SERVING, in red segments
      y = ch;
      g.fillStyle = '#0a0202'; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      g.font = '700 15px "Segoe UI", Arial, sans-serif'; g.fillStyle = '#ffb0a0'; g.fillText('NOW SERVING', x + cw / 2, y + 18);
      g.font = '700 72px "Courier New", monospace'; g.fillStyle = '#ff2a1a'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 12; g.fillText(String(47 + i), x + cw / 2, y + 74); g.shadowBlur = 0;
      // an aisle's number: white on red
      y = ch * 2;
      g.fillStyle = '#c8202a'; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      g.font = '900 96px "Arial Black", Impact, sans-serif'; g.fillStyle = '#ffffff'; g.fillText(String(i + 1), x + cw / 2, y + ch / 2 + 6);
    }
  });
}
// a picture cut from a sheet of cells, one per instance (aCell), lit by aK
function cellMat(map, cols, rows, base = 0.14, gain = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uMono: MOOD.mono },
    vertexShader: /* glsl */`
      attribute float aCell; attribute float aK; varying vec2 vUv; varying float vK;
      void main(){
        float c = mod(aCell, ${cols}.0), r = floor(aCell / ${cols}.0 + 0.01);
        vUv = vec2((uv.x + c) / ${cols}.0, 1.0 - (r + 1.0 - uv.y) / ${rows}.0); vK = aK;
        gl_Position = projectionMatrix * (modelViewMatrix * (instanceMatrix * vec4(position, 1.0)));
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uMono; varying vec2 vUv; varying float vK;
      void main(){ vec3 c = texture2D(map, vUv).rgb * (${base.toFixed(3)} + ${gain.toFixed(3)} * vK); c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), uMono); gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
}
const KV = { aK: 0 }, CK = { aCell: 0, aK: 0 }, SH = { aSeed: 0, aTurn: 0, aLit: 1 }, CH = { aCh: 0 };
const kv = (k) => { KV.aK = k; return KV; };
const ck = (c, k) => { CK.aCell = c; CK.aK = k; return CK; };
const sh = (seed, turn, lit) => { SH.aSeed = seed; SH.aTurn = turn; SH.aLit = lit; return SH; };

// ---------- the shelves' products: drawn, not modelled ----------
// Five shelves a side, packages in runs of the same thing, a price strip on every shelf's lip. aTurn
// (0..1) turns each package round to show its back, a little after its neighbours, edge-on halfway.
// Far off, or rushing past, the packages settle to their average instead of shimmering.
function shelfMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uMove: { value: 0 }, uMono: MOOD.mono, uNight: MOOD.night, uWarm: MOOD.warm },
    vertexShader: /* glsl */`
      attribute float aSeed; attribute float aTurn; attribute float aLit;
      varying vec2 vUv; varying vec3 vW; flat varying float vSeed; varying float vTurn; varying float vLit;
      void main(){ vUv = uv; vSeed = aSeed; vTurn = aTurn; vLit = aLit; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uFog, uCam, uLight; uniform float uFogDensity, uMove, uMono, uNight, uWarm;
      varying vec2 vUv; varying vec3 vW; flat varying float vSeed; varying float vTurn; varying float vLit;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      vec3 pkg(float k){
        if (k < 0.14) return vec3(0.82, 0.1, 0.08);
        if (k < 0.26) return vec3(0.95, 0.76, 0.12);
        if (k < 0.38) return vec3(0.1, 0.28, 0.72);
        if (k < 0.48) return vec3(0.9, 0.88, 0.82);
        if (k < 0.58) return vec3(0.12, 0.52, 0.22);
        if (k < 0.68) return vec3(0.95, 0.42, 0.08);
        if (k < 0.76) return vec3(0.42, 0.22, 0.1);
        if (k < 0.84) return vec3(0.5, 0.18, 0.58);
        if (k < 0.92) return vec3(0.08, 0.08, 0.1);
        return vec3(0.25, 0.72, 0.82);
      }
      void main(){
        float x = vUv.x, y = vUv.y;
        float wx = max(fwidth(x) * 1.2, uMove * 0.22), wy = fwidth(y) * 1.2;
        vec3 back = vec3(0.13, 0.135, 0.15);
        vec3 col = back;
        float sy = y - 0.6, row = floor(sy / 1.6), ry = sy - row * 1.6;
        float far = smoothstep(0.06, 0.22, max(wx, wy * 0.7));
        if (row >= 0.0 && row < 5.0) {
          float cw = 0.72 + 0.4 * h1(row * 3.1 + vSeed * 7.0);
          float cell = floor(x / cw), fx = x / cw - cell - 0.5;
          float run = 2.0 + floor(h1(row + vSeed * 3.0) * 3.0);
          float id = h1(floor(cell / run) * 1.7 + row * 11.0 + vSeed * 31.0);
          float ph = clamp(vTurn * 1.8 - h1(cell * 0.37 + row * 5.0 + vSeed) * 0.8, 0.0, 1.0);
          float ang = ph * 3.14159, sq = abs(cos(ang)), turned = step(1.5708, ang);
          float pH = 0.7 + 0.55 * h1(id * 9.0 + 1.0), lip = 0.16;
          float inX = covP((0.44 * sq - abs(fx)) * cw, wx), inY = covP(min(ry - lip, lip + pH - ry), wy);
          float inP = inX * inY;
          vec3 front = pkg(id);
          float v = clamp((ry - lip) / pH, 0.0, 1.0);
          // the front: a label band, a round logo, a darker top; the back: plain board, a barcode
          vec3 face = front;
          face = mix(face, mix(front, vec3(1.0), 0.55), covP(0.16 - abs(v - 0.52), wy / pH));
          face = mix(face, vec3(1.0, 0.95, 0.85), covP(0.11 * cw - length(vec2(fx * cw, (v - 0.52) * pH)), wx) * 0.9);
          face *= 0.82 + 0.25 * v - 0.18 * smoothstep(0.86, 1.0, v);
          vec3 bk = vec3(0.5, 0.39, 0.27) * (0.9 + 0.1 * v);
          bk = mix(bk, vec3(0.92), covP(0.12 * cw - abs(fx * cw), wx) * covP(0.1 - abs(v - 0.3), wy / pH));
          vec3 pc = mix(face, bk, turned);
          pc *= 0.75 + 0.25 * sq;
          col = mix(col, pc, inP);
          // the shelf's lip and the price tags on it
          float onLip = covP(lip - ry, wy) * covP(ry + 0.02, wy);
          vec3 lc = vec3(0.78, 0.79, 0.8);
          lc = mix(lc, vec3(1.0, 0.86, 0.15), covP(0.16 - abs(mod(x, 1.3) - 0.65), wx) * covP(0.06 - abs(ry - 0.07), wy));
          col = mix(col, lc, onLip);
          // rushing past or far off: each shelf a streak of its runs' colours, blended along it
          float rs = x / (cw * run * 1.5), r0 = floor(rs), rf = smoothstep(0.0, 1.0, fract(rs));
          vec3 sa = pkg(h1(r0 * 1.7 + row * 11.0 + vSeed * 31.0)), sb = pkg(h1((r0 + 1.0) * 1.7 + row * 11.0 + vSeed * 31.0));
          vec3 streak = mix(sa, sb, rf) * 0.78;
          streak = mix(streak, vec3(0.5, 0.39, 0.27), vTurn);
          vec3 avg = mix(back, streak, covP(min(ry - lip, lip + 1.0 - ry), wy) * 0.85 + 0.0);
          avg = mix(avg, lc, onLip);
          col = mix(col, avg, far);
        } else col = vec3(0.7, 0.71, 0.72) * (row < 0.0 ? 0.35 : 0.9);
        // lit from above: brighter up top, darker at the floor; half the lights off at night
        float lightK = (0.55 + 0.45 * smoothstep(0.0, 8.0, y)) * vLit * (1.0 - 0.45 * uNight);
        vec3 L = uLight * mix(vec3(0.92, 1.0, 0.95), vec3(1.08, 0.94, 0.78), uWarm);
        col *= L * lightK * 1.25;
        col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), uMono);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

// ---------- the security monitors: you, live, in black and white ----------
// tCam is the camera on top of the bank looking down the road at her (gsa-world renders it a few
// times a second, as a security camera would). aCh picks a crop of it per screen; uLive 0 is snow.
function crtMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { tCam: { value: null }, uTime: { value: 0 }, uLive: { value: 0 }, uClock: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aCh; varying vec2 vUv; flat varying float vCh;
      void main(){ vUv = uv; vCh = aCh; gl_Position = projectionMatrix * (modelViewMatrix * (instanceMatrix * vec4(position, 1.0))); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tCam; uniform float uTime, uLive, uClock; varying vec2 vUv; flat varying float vCh;
      ${AA_GLSL}
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      // a seven-segment digit, n 0..9, in a cell p (0..1 each way)
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return 1.0 - smoothstep(0.06, 0.1, length(pa - ba * t)); }
      float digit(vec2 p, float n){
        if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;
        float d = 0.0; int k = int(n + 0.5);
        bool A = k != 1 && k != 4, B = k != 5 && k != 6, C = k != 2, D = k != 1 && k != 4 && k != 7, E = k == 0 || k == 2 || k == 6 || k == 8, F = k != 1 && k != 2 && k != 3 && k != 7, G = k != 0 && k != 1 && k != 7;
        if (A) d = max(d, seg(p, vec2(0.2, 0.9), vec2(0.8, 0.9)));
        if (B) d = max(d, seg(p, vec2(0.8, 0.9), vec2(0.8, 0.5)));
        if (C) d = max(d, seg(p, vec2(0.8, 0.5), vec2(0.8, 0.1)));
        if (D) d = max(d, seg(p, vec2(0.2, 0.1), vec2(0.8, 0.1)));
        if (E) d = max(d, seg(p, vec2(0.2, 0.5), vec2(0.2, 0.1)));
        if (F) d = max(d, seg(p, vec2(0.2, 0.9), vec2(0.2, 0.5)));
        if (G) d = max(d, seg(p, vec2(0.2, 0.5), vec2(0.8, 0.5)));
        return d;
      }
      void main(){
        vec2 uv = vUv;
        // each screen a different crop of the one camera: the whole view, closer, closer still
        float ch = vCh;
        float z = ch < 0.5 ? 1.0 : (ch < 1.5 ? 0.62 : (ch < 2.5 ? 0.45 : 0.78));
        vec2 off = ch < 0.5 ? vec2(0.0) : (ch < 1.5 ? vec2(0.19, 0.16) : (ch < 2.5 ? vec2(0.3, 0.2) : vec2(0.05, 0.18)));
        vec2 cu = off + uv * z;
        // a bowed tube
        vec2 cc = uv - 0.5; cu += cc * dot(cc, cc) * 0.06;
        float l = dot(texture2D(tCam, cu).rgb, vec3(0.3, 0.59, 0.11));
        l = smoothstep(0.04, 0.92, l * 1.05);
        float n = h2(floor(uv * vec2(160.0, 120.0)) + floor(uTime * 24.0) * 1.37);
        float live = uLive;
        float v = mix(n * 0.8, l * 0.92 + n * 0.08, live);
        // the slow bar rolling up it, the scanlines
        v *= 0.86 + 0.14 * smoothstep(0.0, 0.08, abs(fract(uv.y * 0.6 - uTime * 0.12) - 0.5) - 0.02);
        v *= 0.78 + 0.22 * aaSq(uv.y * 90.0);
        vec3 col = vec3(v) * vec3(0.9, 1.0, 0.95);
        // the camera's caption: CAM n, and the time, two in the morning
        float s = floor(uClock), hh = 2.0, mm = floor(s / 60.0), ss = mod(s, 60.0);
        vec2 tp = (uv - vec2(0.56, 0.06)) * vec2(14.0, 11.0);
        float tx = 0.0;
        tx = max(tx, digit(tp - vec2(0.0, 0.0), 0.0)); tx = max(tx, digit(tp - vec2(1.0, 0.0), hh));
        tx = max(tx, digit(tp - vec2(2.3, 0.0), floor(mm / 10.0))); tx = max(tx, digit(tp - vec2(3.3, 0.0), mod(mm, 10.0)));
        tx = max(tx, digit(tp - vec2(4.6, 0.0), floor(ss / 10.0))); tx = max(tx, digit(tp - vec2(5.6, 0.0), mod(ss, 10.0)));
        vec2 cp = (uv - vec2(0.06, 0.84)) * vec2(14.0, 11.0);
        tx = max(tx, digit(cp, ch + 1.0));
        col = mix(col, vec3(1.0), tx * 0.9);
        // the red REC dot, blinking
        col += vec3(1.0, 0.1, 0.05) * (1.0 - smoothstep(0.012, 0.02, length((uv - vec2(0.9, 0.88)) * vec2(1.33, 1.0)))) * step(0.5, fract(uTime * 0.8)) * live;
        float vig = smoothstep(0.75, 0.3, length(cc * vec2(1.0, 1.15)));
        gl_FragColor = vec4(col * vig * 1.35, 1.0);
      }`,
  });
}

// ---------- the store's rooms ----------
// Its floor, walls and ceiling are a ring of points along the road (Room, summer.js); the look is all
// in this shader. Styles: 0 the store (vinyl tile, the drop ceiling of panels), 1 the frozen aisle
// (walls of freezer doors that light as you come), 2 the front end (its windows on the dark lot), 3 the
// lot (asphalt, the stall lines), 4 the store toward its exit (the front wall's windows and doors).
// Part 7 is the store's front seen from the lot.
function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uT: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLit: { value: 1 }, uBeat: { value: 0 }, uWave: { value: 0 }, uHum: { value: 0 }, uMove: { value: 0 }, uGround: { value: new THREE.Color() },
      uMono: MOOD.mono, uWarm: MOOD.warm, uNight: MOOD.night, uHymn: { value: new THREE.Vector2(1e5, 1e5) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uT, uFogDensity, uLit, uBeat, uWave, uHum, uMove, uMono, uWarm, uNight;
      uniform vec3 uFog, uCam, uLight, uGround; uniform vec2 uHymn;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      float boxD(vec2 p, vec2 a, vec2 b){ return min(min(p.x - a.x, b.x - p.x), min(p.y - a.y, b.y - p.y)); }
      vec3 pkgc(float k){ return k < 0.15 ? vec3(0.8, 0.12, 0.1) : (k < 0.3 ? vec3(0.95, 0.76, 0.14) : (k < 0.45 ? vec3(0.12, 0.3, 0.72) : (k < 0.58 ? vec3(0.9, 0.88, 0.84) : (k < 0.7 ? vec3(0.14, 0.52, 0.24) : (k < 0.8 ? vec3(0.94, 0.44, 0.1) : (k < 0.9 ? vec3(0.5, 0.2, 0.58) : vec3(0.26, 0.7, 0.8))))))); }
      // the colour of the ceiling's light: cold, a little green; warm in the choruses
      vec3 fluo(){ return mix(vec3(0.82, 0.97, 0.88), vec3(1.0, 0.85, 0.64), uWarm); }
      // one ceiling panel's brightness: dead ones, the flickering one, the rows off for the night, the hum
      float panelOn(vec2 c){
        float id = h2(c + vec2(3.1, 7.7));
        float on = 1.0;
        if (id < 0.035) on = 0.0;
        else if (id < 0.05) on = step(0.35, fract(sin(uTime * 13.0 + id * 90.0) * 0.5 + uTime * 0.9));
        on *= 1.0 - uNight * step(0.5, mod(c.y, 2.0)) * (0.9 + 0.1 * step(0.5, mod(c.x, 2.0)));
        on *= 1.0 - 0.6 * uNight * step(0.5, mod(c.x + c.y, 3.0) - 1.0);
        return on;
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 col = vec3(0.0), glow = vec3(0.0);
        float lit = uLit;
        vec3 FL = fluo();
        float hum = 0.94 + 0.06 * uHum;
        float wpx = max(fwidth(h), fwidth(along)) * 1.2;
        float wx = fwidth(x) * 1.2, wa = max(fwidth(along) * 1.2, uMove * 0.5);
        bool outdoor = st == 3;
        if (st == 5) {
          // ---- the ceiling without its store, over the lot: only its panels, in the dark. Each
          // flickers on the way a tube does (uHymn.x), a little after its neighbours, and goes out
          // for good (uHymn.y), a panel at a time ----
          vec2 c = vec2(floor((x + 4.8) / 9.6), floor((along + 7.2) / 14.4));
          vec2 q = vec2(mod(x + 4.8, 9.6) - 4.8, mod(along + 7.2, 14.4) - 7.2);
          float id = h2(c + vec2(5.3, 1.1));
          float ts = uHymn.x + id * 1.4 + 0.35 * clamp(abs(c.x) / 6.0, 0.0, 1.0);
          float fl = step(0.42, fract(sin(floor(uT * 26.0) * 12.9898 + id * 78.233) * 43758.5453));
          float on = step(ts, uT) * mix(fl, 1.0, step(ts + 0.5, uT));
          on *= 1.0 - step(uHymn.y + h2(c + vec2(9.1, 2.7)) * 3.8, uT);
          if (id < 0.04) on *= step(0.3, fract(uTime * 1.3 + id * 40.0));
          float inP = covP(min(1.25 - abs(q.x), 2.45 - abs(q.y)), max(wx, wa));
          float lou = 0.78 + 0.22 * aaSq(q.y / 0.6);
          // (far off, a panel smaller than a pixel would wink on and off as it moved: there the grid
          // settles to how much of it is lit)
          float farK = smoothstep(0.5, 1.6, max(wx, wa));
          float k = on * (0.92 + 0.08 * uHum) * (1.0 + 0.45 * uBeat);
          vec3 g = FL * mix(inP * lou * 2.6 + exp(-dot(q, q) / 26.0) * 0.16 * (1.0 - inP), 0.27, farK) * k;
          float dd = length(uCam - vW);
          float fk = 1.0 - exp(-pow(dd * uFogDensity * 0.75, 1.5));
          gl_FragColor = vec4(g * (1.0 - fk), 1.0);
          return;
        }
        if (part == 7) {
          // ---- the store from its lot: the base, the glass front lit inside, the red fascia, the block wall ----
          col = vec3(0.5, 0.47, 0.42) * (0.85 + 0.15 * n2(vec2(x, h) * 0.3));
          if (h < 3.0) col = vec3(0.14, 0.14, 0.15);
          else if (h < 20.0) {
            float mw = 9.0, mx = mod(x + 4.5, mw) - mw * 0.5;
            float glass = covP(mw * 0.5 - 0.7 - abs(mx), wx) * covP(min(h - 3.6, 19.4 - h), wpx);
            vec3 inside = FL * (0.55 + 0.25 * smoothstep(4.0, 18.0, h));
            // the shelves inside, dark bands; the panels on its ceiling, bright dashes
            inside *= 1.0 - 0.45 * covP(0.5 - abs(h - 7.5 - 1.5 * h1(floor((x + 4.5) / mw))), wpx) * step(h, 11.0);
            inside += FL * covP(0.35 - abs(h - 17.6), wpx) * aaSq(x / 4.0) * 1.2;
            inside += vec3(1.0, 0.3, 0.2) * covP(0.9 - length(vec2(mx - 2.0, h - 13.0) * vec2(0.6, 1.0)), wpx) * step(0.7, h1(floor((x + 4.5) / mw) + 5.0));
            col = mix(col * 0.6, inside * 0.25, glass);
            glow += inside * glass * 0.85 * lit;
          } else if (h < 24.5) {
            col = vec3(0.7, 0.08, 0.08);
            col = mix(col, vec3(0.95), aaBand(h, 20.6, 0.25));
            glow += vec3(1.0, 0.12, 0.1) * 0.12 * lit;
          } else {
            col = vec3(0.62, 0.58, 0.52) * (0.85 + 0.15 * n2(vec2(x * 0.5, h * 2.0)));
            col *= 0.9 + 0.1 * aaPulse(h / 1.2, 0.04);
            col = mix(col, vec3(0.3, 0.28, 0.26), aaBand(h, 39.0, 0.8));
          }
          // the lot's lamps on it, and the sodium from below
          col *= 0.7 + 0.5 * vec3(1.0, 0.7, 0.45) * smoothstep(30.0, 0.0, h);
        } else if (part == 8) { col = vec3(0.72, 0.74, 0.78); glow += vec3(0.2) * lit; }
        else if (outdoor) {
          // ---- the lot: asphalt, the drive lane, rows of stalls, oil in the stalls ----
          vec3 asph = vec3(0.055, 0.055, 0.06) * (0.8 + 0.4 * n2(vec2(x, along) * 0.35)) * (0.9 + 0.2 * n2(vec2(x, along) * 3.0));
          col = asph;
          float stall = step(12.0, ax) * step(ax, 34.0) + step(50.0, ax) * step(ax, 72.0) + step(88.0, ax) * step(ax, 110.0);
          float sl = aaBand(mod(along, 5.2), 0.0, 0.11) + aaBand(mod(along, 5.2), 5.2, 0.11);
          float lines = stall * sl;
          lines += aaBand(ax, 12.0, 0.12) + aaBand(ax, 50.0, 0.12) + aaBand(ax, 88.0, 0.12);
          float worn = 0.55 + 0.45 * n2(vec2(x, along) * 0.8);
          col = mix(col, vec3(0.85, 0.85, 0.8) * worn, clamp(lines, 0.0, 1.0) * (1.0 - smoothstep(0.08, 0.3, wa)));
          vec2 sc = vec2(floor(along / 5.2), floor(ax / 11.0));
          float oil = stall * covP(1.4 - length(vec2(mod(along, 5.2) - 2.6, mod(ax, 11.0) - 5.5) * vec2(1.4, 0.5)), wpx) * step(0.45, h2(sc));
          col *= 1.0 - 0.45 * oil;
          // the drive lane's arrows, now and then
          float ar = step(ax, 8.0) * covP(1.6 - abs(x) - abs(mod(along, 90.0) - 45.0) * 0.6, wx) * covP(2.6 - abs(mod(along, 90.0) - 45.0), wa);
          col = mix(col, vec3(0.8), ar * 0.6);
          // wet, the sky in it at a grazing angle
          vec3 V = normalize(uCam - vW);
          col += vec3(0.05, 0.06, 0.09) * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0) * 0.6;
          col = mix(col, uGround, smoothstep(118.0, 148.0, ax));
          col *= uLight * 1.2;
        } else {
          // ---- inside ----
          if (part == 0) {
            // the floor: vinyl tile, a darker path down the middle, the panels' light lying in it
            float chk = aaChkM(vec2(x, along) / 1.6, vec2(0.0, uMove * 0.4));
            vec3 t0 = st == 1 ? vec3(0.7, 0.76, 0.8) : vec3(0.74, 0.74, 0.7), t1 = st == 1 ? vec3(0.78, 0.83, 0.86) : vec3(0.81, 0.81, 0.77);
            col = mix(t0, t1, chk);
            col = mix(col, vec3(0.42, 0.44, 0.46), covP(7.2 - ax, wx) * 0.55);
            col = mix(col, vec3(0.62, 0.2, 0.18), aaBand(ax, 7.6, 0.18) * 0.7);
            col *= 0.94 + 0.06 * n2(vec2(x, along) * 0.6);
            // the panels' reflections: soft streaks under the rows of them, brighter at a grazing angle
            vec3 V = normalize(uCam - vW);
            float gr = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.5);
            float cx = mod(x + 4.8, 9.6) - 4.8, ca = mod(along + 7.2, 14.4) - 7.2;
            vec2 cid = vec2(floor((x + 4.8) / 9.6), floor((along + 7.2) / 14.4));
            float refl = exp(-cx * cx / 3.0) * exp(-ca * ca / (6.0 + 70.0 * gr)) * panelOn(cid);
            glow += FL * refl * (0.12 + 0.55 * gr) * lit * hum;
            col *= 0.55 + 0.45 * (1.0 - 0.5 * uNight);
          } else if (part == 3) {
            // the drop ceiling: its tiles' grid, and its panels (louvred, humming, some dead)
            col = vec3(0.78, 0.79, 0.78);
            float grid = clamp(aaPulse(x / 2.4, 0.04) + aaPulse(along / 4.8, 0.03), 0.0, 1.0);
            col *= 1.0 - 0.25 * grid;
            vec2 c = vec2(floor((x + 4.8) / 9.6), floor((along + 7.2) / 14.4));
            vec2 q = vec2(mod(x + 4.8, 9.6) - 4.8, mod(along + 7.2, 14.4) - 7.2);
            float inP = covP(min(1.25 - abs(q.x), 2.45 - abs(q.y)), max(wx, wa));
            float on = panelOn(c);
            float lou = 0.75 + 0.25 * aaSq(q.y / 0.6);
            float wave = uWave * pow(0.5 + 0.5 * sin(along * 0.045 - uTime * 7.0), 6.0);
            float k = on * hum * (1.0 + 0.35 * uBeat * uWarm) + wave * 2.0;
            col = mix(col, vec3(0.9), inP);
            glow += FL * inP * k * lou * 2.4 * lit;
            glow += FL * exp(-dot(q, q) / 30.0) * on * 0.18 * lit;
            col *= 0.35 + 0.65 * (1.0 - 0.6 * uNight);
            // the domes and the sprinklers: tiny dark dots between
            col *= 1.0 - 0.6 * covP(0.18 - length(vec2(mod(x, 4.8) - 2.4, mod(along, 9.6) - 4.8)), max(wx, wa));
          } else {
            // walls: the long one's along, the end walls' across
            float a2 = part == 6 ? x : along;
            if (st == 1 && part != 6) {
              // freezer doors, in pairs, each lit from inside as you come (the sensors), glass fogging at the edges
              // (rushing past the edges of the screen they're blurred by how far she goes in a frame, or they flap)
              wa = max(wa, uMove * 1.5);
              float dw = 3.6, dc = floor(a2 / dw), dx = mod(a2, dw) - dw * 0.5;
              float inD = covP(min(dw * 0.5 - 0.32 - abs(dx), min(h - 1.2, 10.0 - h)), max(wpx, wa));
              float on = smoothstep(vT - 1.3, vT - 0.55, uT) * (0.85 + 0.15 * h1(dc)) * (1.0 - 0.7 * uNight * step(0.5, h1(dc + 9.0)));
              // inside: four shelves of boxes, cold light down the mullions
              float sr = floor((h - 1.0) / 2.3), sh = mod(h - 1.0, 2.3);
              float st2 = floor(sh / 0.95), sv = mod(sh, 0.95);
              float bx = floor((a2 + 0.7 * sr) / 1.4);
              float kb = h1(bx * 1.3 + sr * 7.0 + st2);
              vec3 bc = kb < 0.4 ? vec3(0.12, 0.3, 0.72) : (kb < 0.62 ? vec3(0.92, 0.92, 0.88) : (kb < 0.8 ? vec3(0.78, 0.12, 0.1) : vec3(0.95, 0.72, 0.2)));
              bc = mix(bc, vec3(1.0), covP(0.12 - abs(sv - 0.5), wpx) * 0.5);
              float boxv = covP(min(sv - 0.08, 0.86 - sv), wpx) * step(st2, 1.5) * covP(0.6 - abs(mod(a2 + 0.7 * sr, 1.4) - 0.7), max(wpx, wa)) * step(0.3, sh);
              vec3 inside = mix(vec3(0.05, 0.07, 0.09), bc, boxv) * mix(0.12, 1.0, on);
              float frost = smoothstep(0.6, 1.8, abs(dx)) * 0.35 + smoothstep(1.6, 1.0, h) * 0.3;
              inside = mix(inside, vec3(0.75, 0.86, 0.95) * mix(0.2, 0.9, on), frost);
              // the glass: a sheen across it at an angle, brighter where the door's lit
              float sheen = aaBand(dx * 0.7 + (h - 5.6) * 0.32, 0.4, 0.35) * 0.18 + aaBand(dx * 0.7 + (h - 5.6) * 0.32, -0.6, 0.12) * 0.12;
              inside += vec3(0.85, 0.92, 1.0) * sheen;
              col = mix(vec3(0.16, 0.17, 0.19), inside, inD);
              glow += mix(vec3(0.6, 0.8, 1.0), FL, 0.3) * inD * on * (0.55 + 0.45 * boxv) * 0.9 * lit;
              // the mullions' light strips and the handles
              glow += vec3(0.8, 0.9, 1.0) * covP(0.08 - abs(abs(dx) - dw * 0.5 + 0.12), wa) * step(1.0, h) * step(h, 10.2) * on * 1.2 * lit;
              col = mix(col, vec3(0.8), covP(0.07 - abs(dx - dw * 0.5 + 0.55), wa) * covP(1.6 - abs(h - 5.6), wpx));
              if (h > 10.4) { col = h < 12.6 ? vec3(0.92, 0.94, 0.95) : vec3(0.62, 0.72, 0.78); glow += FL * 0.08 * step(h, 12.6) * lit; }
            } else if ((st == 2 && part == 1) || (st == 4 && part == 6)) {
              // the front's glass: the dark lot outside, its lamps, the mullions
              float mw = 8.0, mx = mod(a2, mw) - mw * 0.5;
              float glass = covP(min(mw * 0.5 - 0.35 - abs(mx), min(h - 2.6, 24.0 - h)), max(wpx, wa));
              vec3 outside = mix(vec3(0.01, 0.012, 0.02), vec3(0.03, 0.035, 0.06), smoothstep(2.0, 20.0, h));
              // the lot's lamps out there: sodium dots and their haze, on the glass a reflection of the panels
              float lampY = 13.0 + 3.0 * h1(floor(a2 / 23.0));
              float lp = exp(-pow(mod(a2, 23.0) - 11.5, 2.0) / 0.4 - pow(h - lampY, 2.0) / 0.4);
              outside += vec3(1.0, 0.6, 0.24) * (lp * 1.6 + exp(-pow(mod(a2, 23.0) - 11.5, 2.0) / 30.0 - pow(h - lampY, 2.0) / 40.0) * 0.06);
              outside += FL * 0.05 * aaSq(a2 / 5.0) * covP(0.3 - abs(h - 20.0), wpx);
              col = mix(vec3(0.62, 0.64, 0.66), outside, glass);
              glow += outside * glass * 0.9;
              if (h < 2.6) col = vec3(0.3, 0.31, 0.32);
            } else {
              // the store's walls: shelving all along them (products as streaks, the shelves' lips),
              // the red stripe, pale green above
              col = vec3(0.8, 0.79, 0.74) * (0.94 + 0.06 * aaPulse(a2 / 6.0, 0.02));
              if (h < 1.2) col = vec3(0.24, 0.25, 0.27);
              else if (h < 10.4 && part != 6) {
                float sr = floor((h - 1.2) / 1.84), sh = mod(h - 1.2, 1.84);
                float blk = floor(a2 / 4.2 + sr * 0.37);
                vec3 pc = pkgc(h1(blk * 3.7 + sr * 11.0)) * (0.75 + 0.25 * smoothstep(0.2, 1.4, sh));
                float prod = covP(min(sh - 0.18, 1.5 - sh), wpx) * (1.0 - 0.6 * covP(0.12 - abs(mod(a2, 4.2) - 2.1), max(wpx, wa)));
                col = mix(vec3(0.1, 0.1, 0.11), pc, prod);
                col = mix(col, vec3(0.8, 0.81, 0.82), covP(0.14 - sh, wpx));
                col = mix(col, vec3(0.86), covP(0.25 - abs(mod(a2, 16.8) - 8.4), max(wpx, wa)));
              }
              col = mix(col, vec3(0.66, 0.1, 0.1), aaBand(h, 11.0, 0.55));
              if (h > 11.6) col = vec3(0.6, 0.72, 0.62) * (0.92 + 0.08 * n2(vec2(a2, h) * 0.15));
              glow += FL * exp(-pow(h - 14.0, 2.0) / 20.0) * 0.05 * lit;
            }
          }
          col *= uLight * (0.35 + 0.65 * lit) * mix(vec3(0.95, 1.0, 0.96), vec3(1.06, 0.95, 0.82), uWarm);
        }
        col += glow;
        col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), uMono);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// the store's rooms: its rings (the shape across), its styles, its sizes, where its lights hang
const RINGS = {
  box: (W = 44, H = 40) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3]],
  lot: (W = 150) => [[-W, 0, 1, 0], [-W * 0.66, 0, 1, 0], [-W * 0.33, 0, 1, 0], [0, 0, 1, 0], [W * 0.33, 0, 1, 0], [W * 0.66, 0, 1, 0], [W, 0, 1, 0]],
  // the ceiling alone, H up: a flat strip across, nothing under it
  hymn: (W = 62, H = 34) => [[-W, H, 1, 3], [-W * 0.5, H, 1, 3], [0, H, 1, 3], [W * 0.5, H, 1, 3], [W, H, 1, 3]],
};
const STORE = {
  rings: RINGS,
  ringOf: (s) => (s === 'lot' || s === 'hymn' ? s : 'box'),
  styles: { store: 0, frozen: 1, front: 2, lot: 3, exit: 4, hymn: 5 },
  dims: { store: [40, 40], frozen: [17, 24], front: [40, 34], lot: [150], exit: [40, 40], hymn: [62, 34] },
  lights: (id) => (id === 3 ? null : id === 5 ? [14.4, 0] : [28.8, 7.2]),
};

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  dinner: ['gsaDinner', 'gsaDinnerFace', 'gsaLectern'], corn: ['gsaPallet', 'gsaCan', 'gsaCart', 'gsaCoat', 'gsaTissues'], rocket: ['gsaRocket'], clock: ['gsaClockBody', 'gsaClockFace', 'gsaHandH', 'gsaHandM', 'gsaHandS'],
  serving: ['gsaServing', 'gsaNum', 'gsaDeli'], bags: ['gsaStand', 'gsaStandFace', 'gsaPaperBag', 'gsaBag'], love: ['gsaCart'], crt: ['gsaCrt', 'gsaCrtFace'], corral: ['gsaCorral', 'gsaCart'],
  swap: ['gsaSwapBox', 'gsaSwapLegs', 'gsaSwapFront', 'gsaSwapBack', 'gsaStrike'], strangers: ['gsaCart'], cart: ['gsaCart'], wallSign: ['gsaWallFace'], storeSign: ['gsaWallFace'],
};

extend({
  layers: {
    gsaShelf: (M) => [GS.shelfFaces(), M.gsaShelfM || (M.gsaShelfM = shelfMaterial()), 260, { aSeed: 1, aTurn: 1, aLit: 1 }],
    gsaShelfFrame: (M) => [GS.shelfFrame(), paintM(M), 260, {}],
    gsaAisleFrame: (M) => [GS.aisleFrame(), paintM(M), 12, {}],
    gsaAisleFace: (M) => [GS.panel(8.4, 2.625, 0.34).translate(0, -0.6, 0), M.sign, 12, { aIdx: 1, aWake: 2 }],
    gsaAisleNum: (M) => [GS.panel(2.3, 2.3, 0.4).translate(0, 4.0, 0), M.gsaNumM || (M.gsaNumM = cellMat(tex().num, 8, 3, 0.25, 1.1)), 12, { aCell: 1, aK: 1 }],
    gsaHangFrame: (M) => [GS.slab(24, 7.8, 0.5), darkM(M), 40, {}],
    gsaHangFace: (M) => [GS.panel(22.4, 7, 0.34), M.sign, 40, { aIdx: 1, aWake: 2 }],
    gsaHangWire: (M) => [merge([GS.panel(0.12, 30).translate(-9, 18.9, 0), GS.panel(0.12, 30).translate(9, 18.9, 0)]), chromeM(M), 40, {}],
    gsaLetterFrame: (M) => [GS.letterboard(22.4, 7), darkM(M), 30, {}],
    gsaLetterFace: (M) => [(() => { const g = new THREE.PlaneGeometry(22.4, 7); g.translate(0, 0, 1.0); return g; })(), M.sign, 34, { aIdx: 1, aWake: 2 }],
    gsaSwapBox: (M) => [GS.letterBox(), darkM(M), 2, {}],
    gsaSwapLegs: (M) => [GS.letterLegs(), darkM(M), 2, {}],
    gsaSwapFront: (M) => [(() => { const g = new THREE.PlaneGeometry(22.4, 7); g.translate(0, 0, 1.0); return g; })(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    gsaSwapBack: (M) => [(() => { const g = new THREE.PlaneGeometry(22.4, 7); g.rotateY(Math.PI); g.translate(0, 0, -1.0); return g; })(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    gsaStrike: (M) => [(() => { const g = new THREE.BoxGeometry(1, 0.55, 0.2); g.translate(0.5, 0, 0.75); return g; })(), M.gsaStrikeM || (M.gsaStrikeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.12, 0.1) })), 4, {}],
    gsaWallFace: (M) => [GS.panel(28, 8.75), M.sign, 30, { aIdx: 1, aWake: 2 }],
    gsaCoolerBody: (M) => [GS.coolerBody(), glossM(M), 40, {}],
    gsaCoolerTop: (M) => [GS.coolerTop(), pic(M, 'gsaCoolerM', tex().cooler, 1.1), 40, {}],
    gsaCart: (M) => [GS.cart(), chromeM(M), 90, {}],
    gsaCoat: (M) => [GS.coat(), paintM(M), 2, {}],
    gsaCan: (M) => [GS.can(), glossM(M), 120, {}],
    gsaPallet: (M) => [GS.pallet(), paintM(M), 2, {}],
    gsaTissues: (M) => [GS.tissues(), paintM(M), 2, {}],
    gsaDinner: (M) => [GS.dinnerBox(), paintM(M), 2, {}],
    gsaDinnerFace: (M) => [GS.dinnerFace(), pic(M, 'gsaScriptureM', tex().scripture, 0.7), 2, {}],
    gsaLectern: (M) => [GS.lectern(), paintM(M), 2, {}],
    gsaRocket: (M) => [GS.rocket(), glossM(M), 2, {}],
    gsaPumpkin: (M) => [GS.pumpkin(), paintM(M), 90, {}],
    gsaPumpkinFace: (M) => [GS.pumpkinFace(), glowyM(M), 90, {}],
    gsaGhost: (M) => [GS.ghost(), paintM(M), 40, {}],
    gsaFir: (M) => [GS.fir(), paintM(M), 40, {}],
    gsaCheckout: (M) => [GS.checkout(), paintM(M), 40, {}],
    gsaLaneNum: (M) => [GS.panel(2.1, 2.1, 0.48).translate(1.5, 11.6, -5.2), M.gsaNumM || (M.gsaNumM = cellMat(tex().num, 8, 3, 0.25, 1.1)), 40, { aCell: 1, aK: 1 }],
    gsaBag: (M) => [GS.bag(), VC(M, 'gsaBagM', 0.55, { roughness: 0.4, side: THREE.DoubleSide }), 140, {}],
    gsaPaperBag: (M) => [GS.paperBag(), paintM(M), 4, {}],
    gsaStand: (M) => [GS.standSign(), darkM(M), 4, {}],
    gsaStandFace: (M) => [GS.panel(8.8, 2.75).translate(0, 8.6, 0.1), M.sign, 4, { aIdx: 1, aWake: 2 }],
    gsaServing: (M) => [GS.serving(), darkM(M), 2, {}],
    gsaNum: (M) => [GS.panel(6.0, 3.0, 0.58).translate(0, 10.4, 0), M.gsaNumM || (M.gsaNumM = cellMat(tex().num, 8, 3, 0.25, 1.1)), 4, { aCell: 1, aK: 1 }],
    gsaDeli: (M) => [GS.deli(), paintM(M), 2, {}],
    gsaClockBody: (M) => [GS.clockBody(), darkM(M), 2, {}],
    gsaClockFace: (M) => [GS.clockFace(), pic(M, 'gsaClockM', tex().clock, 0.9), 2, {}],
    gsaHandH: (M) => [GS.hand(2.6, 0.32), darkM(M), 2, {}],
    gsaHandM: (M) => [GS.hand(3.6, 0.22), darkM(M), 2, {}],
    gsaHandS: (M) => [GS.hand(3.8, 0.08).translate(0, 0, 0.05), M.gsaRedM || (M.gsaRedM = new THREE.MeshBasicMaterial({ color: 0xd82a2a })), 2, {}],
    gsaProduce: (M) => [GS.produceTable(), produceM(M), 40, {}],
    gsaFruit: (M) => [GS.fruit(), M.gsaFruitM || (M.gsaFruitM = (() => { const m = new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.32 }); m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vTint = aTint;'); s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vTint * vTint;'); }; return m; })()), 1400, { aTint: 3 }],
    gsaMister: (M) => [GS.mister(), chromeM(M), 40, {}],
    gsaDome: (M) => [GS.dome(), glossM(M), 60, {}],
    gsaCrt: (M) => [GS.crt(), darkM(M), 16, {}],
    gsaCrtFace: (M) => [GS.crtFace(), M.gsaCrtM || (M.gsaCrtM = crtMaterial()), 16, { aCh: 1 }],
    gsaPole: (M) => [GS.pole(), darkM(M), 90, {}],
    gsaCorral: (M) => [GS.corral(), chromeM(M), 8, {}],
    gsaDoorLeaf: (M) => [GS.doorLeaf(), chromeM(M), 4, {}],
    gsaDoorGlass: (M) => [GS.doorGlass(), M.gsaGlassM || (M.gsaGlassM = new THREE.MeshBasicMaterial({ color: 0x3a5060, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, forceSinglePass: true })), 4, {}],
  },
  parts: {
    // ---- a shelf unit: its products turn their backs on "we learn to look away" ----
    gsaShelf(S, it, p, q) {
      const L = S.layers; void L.gsaShelf; void L.gsaShelfFrame;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      let turn = 0;
      if (it.away) { const [a, b] = it.away; turn = smooth(Math.max(a, it.t - 2.2), Math.max(a, it.t - 2.2) + 0.9, T) * (1 - smooth(b - 0.02, b + 0.22, T)); }
      m.compose(p, q, S._s.set(1, it.sy ?? 1, 1));
      L.gsaShelf.add(m, sh(it.seed, turn, it.lit ?? 1)); L.gsaShelfFrame.add(m);
    },
    // ---- the set-pieces, each where it's sung ----
    gsaProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course, sgn = S.atlas.index;
      const at = S._gsv || (S._gsv = new THREE.Vector3()); at.set(p.x, it.above !== undefined ? S.course.sample(it.t, S._gsSp || (S._gsSp = {})).y + it.above : (it.h ?? 0) + (it.y ?? 0), p.z);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz, 'YXZ'); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2, mode = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2, mode); };
      const spot = (k2, cl = WHITEL, r = 26, x = 0, z = 0) => { const w = local(at, yaw, x * s, 0, z * s, S._o); poolAt(S, w.x, (it.h ?? 0) + 0.2, w.z, r * s, cl, k2); };
      const night = MOOD.night.value;
      if (k === 'dinner') {
        // the frozen dinner on a lectern, its back to the road: the ingredients like a page of scripture
        put('gsaLectern'); put('gsaDinner', 0, 1.2, 0); put('gsaDinnerFace', 0, 1.2, 0);
        const rd = it.read ?? 1e9, rk = T > rd ? Math.exp(-(T - rd) * 0.9) : 0;
        light(0, 11.5, 1.6, 22, WHITEL, 0.28 + 0.6 * rk); light(0, 13.6, 0.8, 7, GOLDL, 0.5 + 0.9 * rk);
        spot(0.45 + 0.4 * rk, ICEL, 18);
      } else if (k === 'corn') {
        // aisle three: the corn on its pallet, and beside it a cart left with a coat over its handle,
        // a box of tissues on the shelf edge, one pulled
        // (the cans twice the size of the rest of the store's things, so the tower reads from the road)
        put('gsaPallet', 0, 0, 0, q, s * 1.6);
        let n = 0;
        for (let r = 0; r < 6; r++) for (let j = 0; j <= 6 - r; j++) for (let d = 0; d < 3 - Math.floor(r / 2); d++) {
          if (n++ > 110) break;
          put('gsaCan', (-3.6 + r * 0.6 + j * 1.2) * 1.6, 1.8 + r * 1.6, (-1.6 + d * 1.25 + r * 0.3) * 1.3, q, s * 1.6);
        }
        put('gsaCart', 8.5, 0, 5.0, quat('_gsct', 2.6), 1.5); put('gsaCoat', 8.5, 0, 5.0, quat('_gsct', 2.6), 1.5);
        put('gsaTissues', 2.0, 11.6, 0.0, quat('_gstq', 0.3), 1.6);
        light(0, 12, 0, 24, GOLDL, 0.3 * (1 - 0.5 * night)); light(0, 6, 4, 14, CORNL, 0.25); spot(0.45, GOLDL, 26);
      } else if (k === 'rocket') {
        // the kiddie ride, rocking for nobody, its lights chasing round
        const rock = Math.sin(T * 2.6) * 0.12 * (it.on !== undefined && T > it.on ? 1 : 0.4);
        put('gsaRocket', 0, 0, 0, quat('_gsrk', 0, rock, rock * 0.5));
        for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2; light(Math.cos(a) * 1.9, 0.7, Math.sin(a) * 1.9, 0.8, RIDE_L[j % 3], (Math.floor(T * 6) + j) % 4 === 0 ? 1.6 : 0.3); }
        spot(0.4, GOLDL, 14);
      } else if (k === 'clock') {
        // two in the morning, the second hand going round
        const sec = 2 * 3600 + 34 + T, a = -(sec % 60) / 60 * Math.PI * 2, mn = -((sec / 60) % 60) / 60 * Math.PI * 2, hr = -((sec / 3600) % 12) / 12 * Math.PI * 2;
        put('gsaClockBody'); put('gsaClockFace');
        put('gsaHandH', 0, 0, 0, quat('_gsh1', 0, 0, hr)); put('gsaHandM', 0, 0, 0, quat('_gsh2', 0, 0, mn)); put('gsaHandS', 0, 0, 0, quat('_gsh3', 0, 0, a));
        light(0, 0, 2, 16, WHITEL, 0.18);
      } else if (k === 'serving') {
        // NOW SERVING: the deli shut for the night, its number going up on the beat, nobody coming
        put('gsaDeli', 0, 0, -10);
        const b0 = it.from ?? 1e9, n = T < b0 ? 0 : Math.min(7, Math.floor((c.beatAt(T) - c.beatAt(b0)) / 2) + 1);
        put('gsaServing'); put('gsaNum', 0, 0, 0, q, s, ck(8 + n, 0.9));
        const bf = ((c.beatAt(T) % 2) + 2) % 2, blink = T > b0 ? Math.exp(-bf * 5) : 0;
        light(0, 10.4, 1.2, 9, REDL, 0.35 + 1.2 * blink);
        spot(0.2, REDL, 12);
      } else if (k === 'bags') {
        // PAPER or PLASTIC: the plastic lights on "I say plastic"; paper "wouldn't change a thing"
        const pl = it.plastic ?? 1e9, pp = it.paper ?? 1e9;
        const plk = T > pl ? 0.6 + 0.6 * Math.exp(-(T - pl) * 1.2) : 0.35, ppk = T > pp ? 0.12 : 0.45;
        // (the road goes between them: PAPER on the left, PLASTIC on the right as she comes)
        put('gsaStand', -13, 0, 0); put('gsaStandFace', -13, 0, 0, q, s, signV(sgn.gsaPAPER, ppk));
        put('gsaStand', 13, 0, 0); put('gsaStandFace', 13, 0, 0, q, s, signV(sgn.gsaPLASTIC, plk));
        put('gsaPaperBag', -13, 0, 3, quat('_gspb', 0.4));
        put('gsaBag', 13, 0, 3, quat('_gsbb', -0.3), s * (1 + 0.2 * (T > pl ? Math.exp(-(T - pl) * 2) : 0)));
        light(13, 8.6, 1.4, 16, WHITEL, 0.25 * plk); light(-13, 8.6, 1.4, 16, GOLDL, 0.25 * ppk);
        if (T > pl && T < pl + 0.8) light(13, 3, 3, 14, WHITEL, 1.6 * (1 - (T - pl) / 0.8));
      } else if (k === 'love') {
        // two carts left side by side under one light, nose to nose: the same hollow glow
        put('gsaCart', -1.7, 0, 0, quat('_gslv1', 0.06)); put('gsaCart', 1.7, 0, 0, quat('_gslv2', -0.06));
        const lk = smooth(it.glow - 1.0, it.glow + 0.8, T);
        light(0, 20, 0, 30, LOVEL, 0.25 + 0.7 * lk); light(0, 6, 0, 14, LOVEL, 0.2 + 0.5 * lk);
        spot(0.4 + 0.9 * lk, LOVEL, 30);
      } else if (k === 'strangers') {
        // "we practice being strangers": two carts left back to back, pointing away from each other
        put('gsaCart', 0, 0, -2.6, quat('_gsso1', Math.PI + 0.1)); put('gsaCart', 0, 0, 2.6, quat('_gsso2', -0.08));
        spot(0.3, FLUOL, 18);
      } else if (k === 'crt') {
        // the monitors hung from the ceiling, you on every one of them (the world renders the camera)
        const cols = it.cols ?? 2, rows = it.rows ?? 1;
        for (let r = 0; r < rows; r++) for (let j = 0; j < cols; j++) {
          const x = (j - (cols - 1) / 2) * 7.0, y = r * 5.6;
          put('gsaCrt', x, y, 0); put('gsaCrtFace', x, y, 0, q, s, ((CH.aCh = (r * cols + j) % 4), CH));
        }
        light(0, rows * 2.8, 2.2, 10 + 6 * cols, GREYL, 0.22);
      } else if (k === 'corral') {
        // the cart corral: its pipe rails, the carts nested in it
        put('gsaCorral');
        for (let j = 0; j < (it.n ?? 4); j++) put('gsaCart', 0, 0, 6 - j * 1.6, quat('_gscr', Math.PI));
        light(0, 6.2, 10.3, 5, ICEL, 0.35);
      } else if (k === 'swap') {
        // the songwriter's edit, on a letterboard: the old line struck through, and the board turned
        // over to the new one
        const sw = it.swap ?? 1e9, st = it.strike ?? 1e9;
        // (it turns round on its post, the way a revolving sign does, a little past and back)
        const u = smooth(sw, sw + 0.55, T), turn = u * Math.PI + Math.sin(u * Math.PI) * 0.25, tq = quat('_gssw', turn);
        put('gsaSwapLegs');
        put('gsaSwapBox', 0, 0, 0, tq); put('gsaSwapFront', 0, 0, 0, tq, s, signV(sgn.gsaOLD, 1)); put('gsaSwapBack', 0, 0, 0, tq, s, signV(sgn.gsaNEW, 1));
        const sk = smooth(st, st + 0.7, T) * (1 - smooth(sw + 0.02, sw + 0.12, T));
        if (sk > 0.01) { const w = local(at, yaw, -10.8 * s, 1.0 * s, 0.3 * s, S._o); m.compose(w, quat('_gsst', 0, 0, 0.03), S._s.set(21.6 * sk * s, s, s)); L.gsaStrike.add(m); }
        light(0, 0, 3, 34, WHITEL, 0.3); if (T > sw && T < sw + 0.9) light(0, 0, 4, 30, WHITEL, 0.45 * (1 - (T - sw) / 0.9));
      } else if (k === 'wallSign' || k === 'storeSign') {
        put('gsaWallFace', 0, 0, 0, q, s, signV(sgn[it.sign], 0.6 + 0.4 * (k === 'storeSign' ? 1 : (1 - 0.4 * night))));
        if (it.cl) light(0, 0, 2, 30, it.cl, 0.25);
      }
    },
    // a hanging aisle marker: its number up top, what's in it
    gsaAisle(S, it, p) {
      const L = S.layers; void L.gsaAisleFrame; void L.gsaAisleFace; void L.gsaAisleNum;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._gsSa || (S._gsSa = {})), yaw = sm.yaw + Math.PI;
      const fq = (S._gsaq || (S._gsaq = new THREE.Quaternion())).setFromAxisAngle(S._gsY || (S._gsY = new THREE.Vector3(0, 1, 0)), yaw + Math.sin(T * 0.7 + it.t) * 0.04);
      p.y = sm.y + (it.h ?? 13);
      const m = S._m, s = it.s ?? 1.2, night = MOOD.night.value;
      m.compose(p, fq, S._s.set(s, s, s)); L.gsaAisleFrame.add(m); L.gsaAisleFace.add(m, signV(S.atlas.index[it.sign], 0.75 - 0.25 * night)); L.gsaAisleNum.add(m, ck(16 + it.n - 1, 0.9 - 0.3 * night));
      glowAt(S, p.x, p.y, p.z, 14 * s, FLUOL, 0.08);
    },
    // a lyric, hung from the ceiling over the road like a department sign
    gsaHang(S, it, p) {
      const L = S.layers; void L.gsaHangFrame; void L.gsaHangFace; void L.gsaHangWire;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._gsSl || (S._gsSl = {})), yaw = sm.yaw + Math.PI;
      S._e.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.015, 'YXZ'); const fq = (S._gshq || (S._gshq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 11);
      const m = S._m, s = it.s ?? 1;
      m.compose(p, fq, S._s.set(s, s, s)); L.gsaHangFrame.add(m); L.gsaHangFace.add(m, signV(it.idx, 1)); L.gsaHangWire.add(m);
      glowAt(S, p.x, p.y, p.z, 26 * s, FLUOL, 0.07);
    },
    // a lyric on the lot's letterboard, on its two legs at the side of the drive
    gsaLetter(S, it, p) {
      const L = S.layers; void L.gsaLetterFrame; void L.gsaLetterFace;
      if (!S.track) return;
      prepare(S.course, S.plan);
      const fq = faceQ(S, it), m = S._m, s = it.s ?? 1;
      p.y = floorAt(S.course, it.t) + 25.5 * s;
      m.compose(p, fq, S._s.set(s, s, s)); L.gsaLetterFrame.add(m); L.gsaLetterFace.add(m, signV(it.idx, 1));
      glowAt(S, p.x, p.y, p.z, 30 * s, WHITEL, 0.12);
      poolAt(S, p.x, p.y - 25 * s, p.z, 26 * s, WHITEL, 0.18);
    },
    // a lot lamp: the sodium, its pool
    gsaPole(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.gsaPole; return; }
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.gsaPole.add(m);
      const w = local(p, yaw, 0, 33.0, 6.8, S._o);
      const f = it.flick ? ((Math.floor((S.tNow ?? 0) * 8 + it.seed * 20) % 9) ? 1 : 0.2) : 1;
      glowAt(S, w.x, w.y, w.z, 7, SODIUM, 1.2 * f); glowAt(S, w.x, w.y - 2, w.z, 26, SODIUM, 0.12 * f);
      poolAt(S, w.x, p.y + 0.12, w.z, 44, SODIUM, 0.55 * f);
    },
    // a car in a stall, about the size the carts make it
    gsaCar(S, it, p, q) { if (!S.track) { void S.layers.car; return; } const m = S._m; m.compose(p, q, S._s.set(it.s ?? 3, it.s ?? 3, it.s ?? 3)); S.layers.car.add(m, tintV(it.tint)); },
    // a cart left in the lot or the store
    gsaCart(S, it, p, q) { if (!S.track) { void S.layers.gsaCart; return; } const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.gsaCart.add(m); },
    // the chest freezer, a length of it, under the jump
    gsaCooler(S, it, p, q) {
      const L = S.layers; void L.gsaCoolerBody; void L.gsaCoolerTop;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.gsaCoolerBody.add(m); L.gsaCoolerTop.add(m);
      glowAt(S, p.x, p.y + 4, p.z, 16, ICEL, 0.3); poolAt(S, p.x, p.y + 0.15, p.z, 22, ICEL, 0.25);
    },
    // the seasonal aisle: pumpkins, ghosts, a fir
    gsaSeason(S, it, p, q) {
      const L = S.layers; void L.gsaPumpkin; void L.gsaPumpkinFace; void L.gsaGhost; void L.gsaFir;
      if (!S.track) return;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s));
      if (it.v === 0) { L.gsaPumpkin.add(m); L.gsaPumpkinFace.add(m); glowAt(S, p.x, p.y + 1.4 * s, p.z, 6 * s, PUMPL, 0.6 + 0.3 * Math.sin((S.tNow ?? 0) * 7 + it.seed * 9)); }
      else if (it.v === 1) { L.gsaGhost.add(m); glowAt(S, p.x, p.y + 4.4 * s, p.z, 8 * s, WHITEL, 0.15); }
      else { L.gsaFir.add(m); for (let j = 0; j < 6; j++) glowAt(S, p.x + Math.cos(j * 2.1) * 1.4 * s, p.y + (2 + j * 0.7) * s, p.z + Math.sin(j * 2.1) * 1.4 * s, 0.9 * s, FIR_L[j % 4], 1.2, 1); }
    },
    // a checkout lane; lane 7 is the one open, its light blinking
    gsaLane(S, it, p, q, yaw) {
      const L = S.layers; void L.gsaCheckout; void L.gsaLaneNum; void L.gsaBag;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, c = S.course;
      m.compose(p, q, S._s.set(1, 1, 1)); L.gsaCheckout.add(m);
      const open = it.n === 7, bf = ((c.beatAt(T) % 2) + 2) % 2, blink = open ? (bf < 1 ? 1 : 0.25) : 0;
      L.gsaLaneNum.add(m, ck(it.n - 1, open ? 0.6 + 0.9 * blink : 0.38));
      if (open) { const w = local(p, yaw, -1.5, 11.6, -5.2, S._o); glowAt(S, w.x, w.y, w.z, 8, WHITEL, 0.9 * blink); glowAt(S, w.x, w.y, w.z, 3, WHITEL, 1.5 * blink); poolAt(S, p.x, p.y + 0.15, p.z, 18, WHITEL, 0.35); }
      // the register's screen, on; the scanner's red under the glass on the open one
      const sc = local(p, yaw, 1.2, 7.6, 2.4, S._o); glowAt(S, sc.x, sc.y, sc.z, 2.6, ICEL, open ? 0.9 : 0.35);
      if (open) { const sn = local(p, yaw, -0.2, 3.9, 3.4, S._o); glowAt(S, sn.x, sn.y, sn.z, 2.0, REDL, 1.1); }
      // the bags on the carousel, open, breathing on the beat: containers for the nothing
      const br = it.breathe !== undefined && T > it.breathe ? Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * 3) : 0;
      for (let j = 0; j < 3; j++) {
        const a = j / 3 * Math.PI * 2 + 0.3, w = local(p, yaw, Math.cos(a) * 1.6, 1.8, 6.8 + Math.sin(a) * 1.6, S._o);
        m.compose(w, q, S._s.set(1 + 0.25 * br, 1 + 0.08 * br, 1 + 0.25 * br)); L.gsaBag.add(m);
      }
    },
    // produce, on its table, in colour whatever else is going on
    gsaProduce(S, it, p, q, yaw) {
      const L = S.layers; void L.gsaProduce; void L.gsaFruit; void L.gsaMister;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, s, s)); L.gsaProduce.add(m);
      const tint = it.tint, FT = S._gsFT || (S._gsFT = { aTint: null });
      FT.aTint = tint;
      for (let j = 0; j < 7; j++) for (let r = 0; r < 4; r++) {
        const w = local(p, yaw, (-4.2 + j * 1.4 + (r % 2) * 0.7) * s, (3.4 + r * 0.55 + 0.04 * ((j + r) % 3)) * s, (2.3 - r * 0.85) * s, S._o);
        m.compose(w, q, S._s.set(1.25 * s * (it.fs ?? 1), 1.15 * s * (it.fs ?? 1), 1.25 * s * (it.fs ?? 1))); L.gsaFruit.add(m, FT);
      }
      if (it.mist) {
        m.compose(p, q, S._s.set(s, s, s)); L.gsaMister.add(m);
        const on = it.mist !== true ? smooth(it.mist - 0.2, it.mist + 0.3, T) * (1 - smooth(it.mist + 3.0, it.mist + 4.0, T)) : 0;
        if (on > 0.01) for (let j = 0; j < 10; j++) { const f = ((T * 0.9 + j * 0.1) % 1), w = local(p, yaw, (-5 + j * 1.1) * s, (6.0 - f * 3.0) * s, (-1.4 + f * 2.0) * s, S._o); glowAt(S, w.x, w.y, w.z, (1.4 + f * 2.5) * s, MISTL, 0.5 * on * (1 - f)); }
      }
      glowAt(S, p.x, p.y + 7 * s, p.z, 14 * s, it.glow || WARML, 0.18);
    },
    // a security dome in the ceiling (its red light on when the store goes to its night lights)
    gsaDome(S, it, p) {
      if (!S.track) { void S.layers.gsaDome; return; }
      const T = S.tNow ?? 0, m = S._m;
      prepare(S.course, S.plan);
      p.y = floorAt(S.course, it.t) + (it.H ?? 40) - 0.2;
      m.compose(p, S._gsq0 || (S._gsq0 = new THREE.Quaternion()), S._s.set(1.4, 1.4, 1.4)); S.layers.gsaDome.add(m);
      const night = MOOD.night.value, on = night > 0.9 ? 1 : (it.red ? 0.6 : 0.15);
      glowAt(S, p.x, p.y - 1.4, p.z, 1.4, REDL, on * (0.6 + 0.6 * Math.sin(T * 5 + it.seed * 9)), 0);
    },
  },
  kits: {
    // the set-pieces; those indoors stand on the floor
    gsaProps(S, z) {
      for (const a of z.at) {
        const it = { ...a, parts: 'gsaProp', rot: a.rot ?? (a.x === 0 ? Math.PI : FACE(a.x)), s: a.s ?? 1 };
        onFloor(S, it);
        S.items.push(it);
      }
    },
    // the shelves both sides of the road, in runs with gaps for the cross aisles; the products turn
    // away inside [away]
    gsaShelves(S, z, R) {
      const len = z.len ?? 0.55, gap = z.gap ?? 0.35;
      for (const side of [-1, 1]) for (let row = 0; row < (z.rows ?? 2); row++) {
        let t = z.from + (side > 0 ? 0.1 : 0) + row * 0.17;
        while (t < z.to) {
          const n = 2 + Math.floor(R() * 3);
          for (let k = 0; k < n && t < z.to; k++, t += len) {
            if ((z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
            S.items.push(onFloor(S, { t, x: side * ((z.x ?? 13.5) + row * 13), rot: 0, seed: R(), away: z.away, lit: row ? 0.8 : 1, sy: z.sy, parts: 'gsaShelf' }));
          }
          t += gap;
        }
      }
    },
    // the aisles' hanging markers, where the road goes into each
    gsaAisles(S, z) { for (const a of z.at) S.items.push({ ...a, x: 0, parts: 'gsaAisle' }); },
    // the chest freezer island under a jump, laid along the hole
    gsaCoolers(S, z) {
      const c = S.course;
      for (const g of c.gaps) {
        if (g.lip < z.from || g.lip > z.to) continue;
        for (let t = g.from - 0.25; t < g.to + 0.25; t += 0.11) S.items.push(onFloor(S, { t, x: 0, rot: 0, parts: 'gsaCooler' }));
      }
    },
    // carts left about, at angles
    gsaCarts(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.2) { if (R() < 0.35) continue; const side = R() < 0.5 ? -1 : 1; S.items.push(onFloor(S, { t: t + R() * 0.4, x: side * ((z.x ?? 18) + R() * (z.spread ?? 30)), rot: R() * 6.28, s: 1, parts: 'gsaCart' })); } },
    // the lot: lamps on their islands, cars in the stalls
    gsaLot(S, z, R) {
      const cars = [0x8a2a2a, 0x2a3a5a, 0xc8c8c4, 0x1a1a1e, 0x5a6a7a, 0x8a7a5a, 0xa8a8b0, 0x2a4a3a];
      for (let t = z.from; t < z.to; t += z.lamp ?? 1.4) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? 0.6 : 0), x: side * (z.lampX ?? 42), rot: SIDE(side), seed: R(), flick: R() < 0.08, parts: 'gsaPole' }));
      for (let t = z.from; t < z.to; t += 0.13) for (const side of [-1, 1]) for (const row of [23, 61, 99]) {
        if (R() > (z.cars ?? 0.22) * (row > 60 ? 0.6 : 1)) continue;
        S.items.push(onFloor(S, { t, x: side * (row + (R() - 0.5) * 3), rot: (R() < 0.5 ? 0 : Math.PI) + Math.PI / 2 + (R() - 0.5) * 0.12, s: 3.0, parts: 'gsaCar', tint: col(cars[Math.floor(R() * cars.length)]) }));
      }
    },
    // the seasonal aisle's things on both sides
    gsaSeasons(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.22) for (const side of [-1, 1]) {
        const r = R(), v = r < 0.62 ? 0 : (r < 0.85 ? 1 : 2);
        S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * ((z.x ?? 12) + R() * 6), rot: SIDE(side) + (R() - 0.5) * 0.5, s: v === 0 ? 1.0 + R() * 0.7 : 1.2 + R() * 0.4, v, seed: R(), parts: 'gsaSeason' }));
      }
    },
    // the checkout lanes down both sides
    gsaLanes(S, z) { let n = z.first ?? 3; for (let t = z.from; t < z.to; t += z.every ?? 0.75) for (const side of [-1, 1]) { S.items.push(onFloor(S, { t: t + (side > 0 ? 0.3 : 0), x: side * (z.x ?? 15), rot: 0, n: ((n++ - 1) % 8) + 1, breathe: z.breathe, parts: 'gsaLane' })); } },
    // produce tables down both sides
    gsaProduces(S, z, R) {
      const T = [[1, 0.5, 0.1], [0.95, 0.1, 0.08], [0.98, 0.9, 0.2], [0.5, 0.85, 0.2], [0.55, 0.15, 0.45], [0.95, 0.65, 0.3], [0.3, 0.6, 0.15]];
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * ((z.x ?? 16) + R() * 8), rot: FACE(side), s: z.s ?? 1.3, tint: T[Math.floor(R() * T.length)], mist: z.mist, parts: 'gsaProduce' }));
    },
    // the domes in the ceiling
    gsaDomes(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) S.items.push({ t: t + R() * 0.2, x: (R() - 0.5) * 50, H: z.H ?? 40, seed: R(), red: z.red, parts: 'gsaDome' }); },
  },
});

// ---------- the place, per frame ----------
export class GsaWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    // (the ceiling over the lot is added on to the night: the same shader and its very uniforms)
    const m = this.mat;
    this.addMat = new THREE.ShaderMaterial({ uniforms: m.uniforms, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, forceSinglePass: true });
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, sp.style === 'hymn' ? this.addMat : this.mat, STORE));
    const hy = S.plan.hymn; if (hy) this.mat.uniforms.uHymn.value.set(hy.on, hy.off);
    this._g = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
    this._sm = {};
    // the doors: the way in from the lot, the way out
    this.doors = (S.plan.doors || []).map((d) => ({ ...d, fy: floorAt(S.course, d.t) }));
    // the monitor banks, for the camera on top of each
    const props = (S.plan.zones || []).filter((z) => z.kits.includes('gsaProps')).flatMap((z) => z.at);
    this.banks = props.filter((a) => a.kind === 'crt').map((a) => ({ ...a, fy: floorAt(S.course, a.t) }));
    this.rt = new THREE.WebGLRenderTarget(256, 192, { depthBuffer: true });
    this.cam = new THREE.PerspectiveCamera(46, 4 / 3, 0.5, 2400); this.cam.layers.set(1);
    this.camNext = 0; this.camOn = false;
    void S.town.layers.gsaDoorLeaf; void S.town.layers.gsaDoorGlass; void S.town.layers.gsaBag; void S.town.layers.gsaShelf;
  }
  // what the security camera sees is drawn: her, the road, the store's rooms and shelves, its lights
  _layers(S) {
    if (this._layered) return;
    this._layered = true;
    const on = (o) => o && o.layers.enable(1);
    S.view.root.traverse(on);
    on(S.track.mesh);
    S.scene.traverse((o) => { if (o.isLight) o.layers.enable(1); });
    for (const r of this.rooms) { on(r.mesh); for (const c of r.caps) c.traverse(on); }
    const Ls = S.town._layers;
    for (const k of ['gsaShelf', 'gsaShelfFrame', 'glow', 'pool', 'gsaHangFrame', 'gsaHangFace', 'gsaCart', 'gsaProduce', 'gsaFruit']) if (Ls[k]) on(Ls[k].mesh);
    if (S.notes && S.notes.mesh) on(S.notes.mesh);
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, T = S.rider.t, c = S.course;
    const mv = moodAt(T);
    MOOD.night.value = mv[0]; MOOD.warm.value = mv[1]; MOOD.mono.value = mv[2];
    u.uTime.value = time; u.uT.value = T; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 1.9);
    u.uGround.value.set(P.ground ?? 0x101014);
    u.uLit.value = 1;
    u.uBeat.value = Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * 4);
    u.uHum.value = Math.sin(time * 2 * Math.PI * 0.5);
    u.uWave.value = smooth(205.6, 206.4, T) * (1 - smooth(218.6, 219.6, T)) + 0.5 * smooth(266.0, 266.6, T);
    // (how far she goes in a frame: the patterns rushing past are blurred by that much, or they strobe)
    u.uMove.value = clamp((S.rider.v || 0) / 60, 0, 2);
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    const M = S.town.mats;
    if (M.gsaShelfM) { const su = M.gsaShelfM.uniforms; su.uFog.value.set(P.fog); su.uFogDensity.value = P.fogDensity; su.uCam.value.copy(camera.position); su.uLight.value.copy(u.uLight.value); su.uMove.value = u.uMove.value; }
    this._cctv(S, time);
  }
  // the monitors: render the camera on top of the bank she's coming up to, a few times a second
  _cctv(S, time) {
    const M = S.town.mats, cm = M.gsaCrtM;
    if (!cm) return;
    const T = S.rider.t;
    let bank = null; for (const b of this.banks) if (b.t > T - 0.3 && b.t < T + 7) { bank = b; break; }
    cm.uniforms.uTime.value = time; cm.uniforms.uClock.value = 34 + T;   // (the store clock's time: 2:00:34 when the song starts)
    cm.uniforms.tCam.value = this.rt.texture;
    cm.uniforms.uLive.value = bank && this.camOn ? 1 : 0;
    if (!bank) { this.camOn = false; return; }
    if (time < this.camNext) return;
    this.camNext = time + 1 / 9;
    const renderer = window.__LC && window.__LC.renderer;
    if (!renderer) return;
    this._layers(S);
    const g = S.track.ground(bank.t, bank.x ?? 0, this._v);
    const by = (bank.y0 !== undefined ? floorAt(S.course, bank.t) + bank.y0 : S.course.sample(bank.t, this._sm).y + (bank.above ?? 8));
    g.y = by + 3.6;
    this.cam.position.copy(g);
    S.track.at(T + 0.1, S.rider.x || 0, 1.1, this._w);
    this.cam.lookAt(this._w);
    // (a zoom lens: she fills the same part of the screen however far off she is)
    const d = this.cam.position.distanceTo(this._w);
    this.cam.fov = clamp(2 * Math.atan(3.2 / Math.max(1, d)) * 180 / Math.PI, 6, 50);
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld();
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(S.scene, this.cam);
    renderer.setRenderTarget(prev);
    this.camOn = true;
  }
  // the panels' light on the floor near her, the doors, the bag outside, the cold air at the exit
  draw(Tn) {
    const S = this.S, c = S.course, track = S.track, T = S.rider.t, m = this._m, night = MOOD.night.value, warm = MOOD.warm.value;
    const FLc = warm > 0.5 ? WARML : FLUOL;
    for (const r of this.rooms) {
      if (!r.mesh.visible || r.style === 3) continue;
      if (r.style === 5) {
        // the floating panels' light on the lot, while they're on
        const hy = S.plan.hymn, hk = smooth(hy.on, hy.on + 1.6, T) * (1 - smooth(hy.off, hy.off + 3.8, T));
        if (hk < 0.01) continue;
        for (const f of r.fixtures) {
          if (f.t > T + 8 || f.t < T - 1) continue;
          const fy = floorAt(c, f.t);
          for (const x of HYMN_X) { const w = track.ground(f.t, x, this._g); Tn.pool(w.x, fy + 0.12, w.z, 24, FLUOL, 0.3 * hk); }
        }
        continue;
      }
      for (const f of r.fixtures) {
        if (f.t > T + 9 || f.t < T - 1) continue;
        const fy = floorAt(c, f.t);
        const row = Math.floor((f.along + 7.2) / 14.4), off = night > 0.5 && row % 2 ? 0.2 : 1;
        for (const x of POOL_X) { const w = track.ground(f.t, x, this._g); Tn.pool(w.x, fy + 0.12, w.z, 20, FLc, 0.22 * off * (1 - 0.4 * night)); }
      }
    }
    // the sliding doors: open as she comes, the chime
    const L = Tn.layers;
    for (const d of this.doors) {
      if (d.t < T - 3 || d.t > T + 40) continue;
      const open = smooth(d.t - 1.0, d.t - 0.45, T) * (1 - smooth(d.t + 1.4, d.t + 2.6, T)) ;
      const yaw = c.sample(d.t, this._sm).yaw;
      this._q.set(0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5));
      for (const sd of DOOR_SIDES) {
        const w = track.ground(d.t, sd * (6.5 + 12.6 * open), this._g); w.y = d.fy;
        m.compose(w, this._q, this._s.set(1, 1, 1)); L.gsaDoorLeaf.add(m); L.gsaDoorGlass.add(m);
      }
      const w = track.ground(d.t, 0, this._g);
      Tn.glow(w.x, d.fy + 23.5, w.z, 6, d.out ? REDL : GREENL, 0.9);
      Tn.pool(w.x, d.fy + 0.15, w.z, 30, d.out ? ICEL : FLUOL, 0.3 + 0.3 * open);
      // the cold air coming in as they open (on the way out)
      if (d.out && T > d.t - 0.6 && T < d.t + 3.5) {
        const k = 1 - smooth(d.t + 1.0, d.t + 3.5, T);
        for (let j = 0; j < 18; j++) {
          const f = ((T - d.t + 0.6) * 0.6 + j / 18) % 1, a = j * 2.39;
          const g = track.ground(d.t + 0.2 + f * 1.6, Math.cos(a) * (4 + f * 14), this._g);
          Tn.glow(g.x, d.fy + 2 + f * 10 + Math.sin(a) * 4, g.z, 4 + f * 9, MISTL, 0.28 * k * (1 - f));
        }
      }
    }
    // the plastic bag: out the door with her, along beside her, and up into the sky on "which isn't much"
    const b = S.plan.bag;
    if (b && T > b.from - 1 && T < b.to) {
      const u = T - b.rise, up = u > 0 ? u * u * 0.9 + u * 2.2 : 0;
      const tb = T + 0.85 + Math.max(0, u) * 0.25;
      const x = 6.5 + Math.sin(T * 1.3) * 2.2 + Math.max(0, u) * 0.6, y = c.sample(tb, this._sm).y + 2.6 + Math.sin(T * 2.1) * 0.8 + up;
      const w = track.ground(tb, x, this._g); w.y = y;
      const e = this._e || (this._e = new THREE.Euler());
      e.set(Math.sin(T * 1.7) * 0.5, T * 0.9, Math.sin(T * 1.1) * 0.6);
      this._q.setFromEuler(e);
      m.compose(w, this._q, this._s.set(1.6, 1.6, 1.6)); L.gsaBag.add(m);
      Tn.glow(w.x, w.y + 2, w.z, 7, WHITEL, 0.24);
    }
  }
}

// ---------- the end: the store in its lot, alone, its windows breathing ----------
function frontTexture() {
  return canvasTex(1536, 256, (g, W, H) => {
    // the block wall above, the red fascia, the glass front lit from inside, the base
    g.fillStyle = '#7a7268'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < 90; y += 9) { g.fillStyle = y % 18 ? '#827a70' : '#76706a'; g.fillRect(0, y, W, 9); }
    g.fillStyle = '#a81418'; g.fillRect(0, 96, W, 30); g.fillStyle = '#f2f2ee'; g.fillRect(0, 100, W, 4);
    const glassTop = 130, glassBot = 236;
    for (let x = 0; x < W; x += 64) {
      const gr = g.createLinearGradient(0, glassTop, 0, glassBot); gr.addColorStop(0, '#e8fff2'); gr.addColorStop(0.35, '#c8f0d8'); gr.addColorStop(1, '#88c0a0');
      g.fillStyle = gr; g.fillRect(x + 4, glassTop, 56, glassBot - glassTop);
      // the shelves inside, the panels on its ceiling
      g.fillStyle = 'rgba(40,60,50,0.55)'; g.fillRect(x + 4, glassTop + 52 + (x % 3) * 4, 56, 14);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x + 10, glassTop + 8, 20, 3); g.fillRect(x + 38, glassTop + 8, 18, 3);
      if ((x / 64) % 5 === 2) { g.fillStyle = '#ff3a2a'; g.font = '900 15px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.fillText('SALE', x + 32, glassTop + 34); }
    }
    // the doors in the middle, open onto the light
    g.fillStyle = '#f6fff8'; g.fillRect(W / 2 - 70, glassTop, 140, glassBot - glassTop);
    g.strokeStyle = '#b8bcc4'; g.lineWidth = 5; g.strokeRect(W / 2 - 70, glassTop, 140, glassBot - glassTop); g.beginPath(); g.moveTo(W / 2, glassTop); g.lineTo(W / 2, glassBot); g.stroke();
    // OPEN 24 HOURS, in the window beside them
    g.font = '900 26px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.shadowColor = '#4aff7a'; g.shadowBlur = 14; g.fillStyle = '#7aff9a'; g.fillText('OPEN 24 HOURS', W / 2 + 230, glassTop + 40); g.shadowBlur = 0;
    g.fillStyle = '#26262a'; g.fillRect(0, glassBot, W, H - glassBot);
    // GROCERY on the wall over the doors
    g.font = '900 64px "Arial Black", Impact, sans-serif'; g.shadowColor = '#ff2a2a'; g.shadowBlur = 18; g.fillStyle = '#ff4a3a'; g.fillText('GROCERY', W / 2, 70); g.shadowBlur = 0; g.fillStyle = '#ffe8e0'; g.fillText('GROCERY', W / 2, 70);
  });
}
function signTexture() {
  return canvasTex(768, 512, (g, W, H) => {
    g.fillStyle = '#1a1a20'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c81418'; g.fillRect(16, 16, W - 32, 220);
    g.font = '900 120px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('GROCERY', W / 2, 128, W - 60);
    g.fillStyle = '#e8e8e2'; g.fillRect(16, 256, W - 32, 240);
    g.font = '900 54px "Arial Black", Impact, sans-serif'; g.fillStyle = '#141414';
    g.fillText('THE CEILING HUMS', W / 2, 330, W - 70); g.fillText('ITS HOLLOW HYMNS', W / 2, 420, W - 70);
  });
}
export class GsaFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t; this.x = cfg.x ?? -70;
    this.group = new THREE.Group(); scene.add(this.group);
    const body = selfLit({ roughness: 0.8 }, 0.08, false), glossy = selfLit({ roughness: 0.3, metalness: 0.6 }, 0.25, false);
    const add = (geo, mat, x = 0, y = 0, z = 0, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    add(GS.storeBody(), body);
    this.front = new THREE.MeshBasicMaterial({ map: frontTexture(), color: new THREE.Color(1.2, 1.2, 1.2) });
    add(GS.storeFront(), this.front);
    // the pole sign out at the road, its letterboard with the new line on it
    add(GS.bigSign(), body, 70, 0, 52, -0.3);
    const sg = new THREE.PlaneGeometry(30, 20); sg.translate(0, 44, 1.25);
    this.signMat = new THREE.MeshBasicMaterial({ map: signTexture(), color: new THREE.Color(1.5, 1.5, 1.5) });
    add(sg, this.signMat, 70, -6, 52, -0.3);
    // carts by the doors, and one out in the lot
    for (let j = 0; j < 5; j++) add(GS.cart(), glossy, -30 + j * 1.6, 0, 16, Math.PI);
    add(GS.cart(), glossy, 34, 0, 40, 2.2);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    prepare(course, null);
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t, this._sm || (this._sm = {})).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1, w = this._w, T = rider.t;
    this.fireK = this.fired ? Math.min(1, (this.fireK || 0) + dt * 0.6) : 0;
    // the windows breathing, slowly, like the building itself
    const br = 0.86 + 0.14 * Math.sin(songT * 1.1) * this.fireK;
    this.front.color.setScalar(1.25 * br);
    for (let j = 0; j < 12; j++) { w.set(-82 + j * 15, 12, 6).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 22 * s, FLUOL, 0.22 * br); }
    w.set(0, 26, 4).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 40 * s, REDL, 0.18);
    w.set(0, 0, 20).applyMatrix4(this.group.matrixWorld); S.pool(w.x, this._p.y + 0.15, w.z, 120 * s, FLUOL, 0.5 * br);
    // the sign's own light, the lamps in the lot
    w.set(70, 44, 54).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 40 * s, WHITEL, 0.25);
    for (const [x, z] of END_LAMPS) { w.set(x, 33, z).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 7 * s, SODIUM, 1.1); w.set(x, 0, z).applyMatrix4(this.group.matrixWorld); S.pool(w.x, this._p.y + 0.12, w.z, 44 * s, SODIUM, 0.5); }
  }
}
