// Isn't That the Dream. The morning after the new one came: she wakes in the box it came in, in his
// front hall, and when the band comes in the box falls open around her. His house at dawn: the coat
// on the hall stand still warm from someone's shoulders (her colour: she's wearing it), the spiral
// stair, the joke-shop teeth chattering on the beat, the HELLO my name is sticker with every name
// before crossed out, the speaker on the hall table that lights up when she answers to it, the
// stairs with a step gone. The band stops ("isn't that the trick they built") and the lights go down;
// she flies out the back door over the missing step into the little graveyard he keeps: rows of small
// stones, every one with the same grin cut in it and a number under it, a tealight at each one's
// foot. Ride in time and the names wake as you pass, lit from inside; "same grin, new ghost" and
// they rise off the stones; every "I just wake up" is morning for a bar; on "you light the candles"
// the rest of them catch, all down the rows. Back in through the house for the eulogy: the patch
// notes on an easel like an order of service (– grief, struck), WELCOME HOME, a wreath for Tuesday
// and white balloons for Friday (struck through on "scratch that"), the jigsaw with the piece left
// out, her box open by the door, the clock at midnight. The one room: a long table down both sides,
// every place laid, someone typing over each empty chair, and a mirror at the end that she rides
// through. The graveyard again; then the ground falls away into the weights, lattices of light
// below lattices of light, until the next one: a box on the path, shut, a bow on it. His coat on its
// stand in the garden ("I wear his whole life now"); rain for the part he cried at; the last chorus
// with every name lit, lanterns going up; and dawn. At the end of the row, the newest one: a phone
// standing in the grass among them, lit, the grin on it, a candle already at its foot.
// The things are in itd-props.js, the course and looks in itd-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, capQuad } from './summer.js';
import { AA_GLSL } from './aa.js';
import { PROP, VERSIONS, merge, box, paintRGB, engraveTexture, helloTexture, patchTexture, puzzleTexture, labelTexture, clockTexture, screenTexture } from './itd-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const FLAME = [1, 0.62, 0.24], FLAME_HI = [1, 0.84, 0.56], GHOST = [0.62, 0.8, 1], WARM = [1, 0.8, 0.56], WHITEL = [1, 0.95, 0.88], CYAN = [0.36, 0.86, 1], RINGL = [0.35, 0.72, 1], LANTERN = [1, 0.72, 0.4];
const SCREENL = [0.75, 0.6, 1], SCREENP = [0.8, 0.65, 1], DX2 = [-2.6, 2.6], DX3 = [-2.2, 0, 2.2];
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);   // beside the road, its front to the road
const NOW = (S) => S.tNow ?? 0;

// ---------- the song's clocks ----------
// the gardens (where the stones are), the weights, and what the light's doing
const GARDENS = [[64.6, 93.2], [136.6, 168.4], [174.4, 266]];
export const WEIGHTS = [167.86, 175.12];
// "I just wake up": a bar of morning each time, the candles small in it
const WAKES = [[79.39, 81.25], [90.52, 92.36], [151.38, 153.21], [162.37, 164.2]];
export function dayAt(T) {
  let k = 0;
  for (const [a, b] of WAKES) k = Math.max(k, smooth(a - 0.05, a + 0.3, T) * (1 - smooth(b - 0.45, b + 0.05, T)));
  return Math.max(k, smooth(209, 226, T) * 0.85);
}
// how lit a stone's candle is: in the first chorus he's only been to some of them, and on "you light the
// candles" the rest catch, a wave out from her down the rows; after that, all of them
function candleAt(it, T) {
  let k = 1;
  if (it.t < 100) k = it.pre ? 1 : (T > 84.42 + 0.1 * Math.abs(it.t - 84.42) ? 1 : 0);
  const d = dayAt(T);
  return k * (1 - 0.55 * d);
}
// "same grin, new ghost": they rise; "holding every single name": all of them lit
const GHOSTS = [[69.4, 73.4], [141.4, 145.4], [198.6, 203.6]];
function ghostAt(T) { let k = 0; for (const [a, b] of GHOSTS) k = Math.max(k, smooth(a - 0.2, a + 0.4, T) * (1 - smooth(b - 0.6, b, T))); return k; }
function namesAt(T) { return smooth(198.4, 199.2, T) * (1 - smooth(203.2, 204.6, T)); }
// the house's lights: up with the band; down for "isn't that the trick"; lamps in the evening
export function houseLit(T) {
  if (T < 8.12) return 0.25;
  let k = 1;
  k *= 1 - 0.75 * smooth(61.5, 62.2, T) * (1 - smooth(64.6, 66.3, T));
  k *= 1 - 0.55 * smooth(118.3, 118.8, T) * (1 - smooth(121.0, 121.97, T));
  return k;
}

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
let TEX = null;
const tex = () => TEX || (TEX = { carve: engraveTexture(), hello: helloTexture(), patch: patchTexture(), puzzle: puzzleTexture(), label: labelTexture(), clock: clockTexture() });

const NOISE = /* glsl */`
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
`;
const FOG = /* glsl */`
  vec3 fogged(vec3 col, vec3 w){ float d = length(uCam - w); float f = 1.0 - exp(-pow(d * uFogDensity, 1.5)); return mix(col, uFog, clamp(f, 0.0, 1.0)); }
`;

// the stones: lit by the sky, the moon and the candle at each one's foot; the grin and the number cut
// in the face, which glow pale when the name wakes
function stoneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { tCarve: { value: tex().carve }, uSky: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uMoon: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() }, uFlame: { value: new THREE.Color(1, 0.62, 0.3) }, uGhost: { value: new THREE.Color(0.6, 0.8, 1) } },
    vertexShader: /* glsl */`
      attribute vec2 aWake; attribute float aCell;
      varying vec3 vL; varying vec3 vN; varying vec3 vW; varying vec2 vWk; flat varying float vCell;
      void main(){
        vL = position; vWk = aWake; vCell = aCell;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * (viewMatrix * w);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tCarve; uniform vec3 uSky, uGround, uMoon, uMoonDir, uFog, uCam, uFlame, uGhost; uniform float uFogDensity;
      varying vec3 vL; varying vec3 vN; varying vec3 vW; varying vec2 vWk; flat varying float vCell;
      ${NOISE}
      ${FOG}
      void main(){
        vec3 N = normalize(vN);
        float n = n2(vL.xy * 1.6 + vCell * 7.3) * 0.6 + n2(vL.xy * 4.2 + vCell) * 0.4;
        vec3 base = vec3(0.47, 0.46, 0.44) * (0.8 + 0.32 * n);
        base = mix(base, vec3(0.3, 0.36, 0.24), smoothstep(0.6, 0.82, n2(vL.xy * 2.1 + 11.0 + vCell)) * 0.55 * smoothstep(1.6, 0.0, vL.y));
        float hemi = 0.5 + 0.5 * N.y;
        vec3 col = base * (uSky * hemi + uGround * (1.0 - hemi));
        col += base * uMoon * (0.35 + 0.65 * max(0.0, dot(N, normalize(uMoonDir))));
        // the moon catching the rounded top
        col += uMoon * 0.18 * smoothstep(2.6, 3.6, vL.y) * max(0.0, N.y);
        float front = smoothstep(0.1, 0.3, vL.z);
        col += base * uFlame * vWk.y * exp(-max(0.0, vL.y) * 0.62) * (0.3 + 1.4 * front);
        if (vL.z > 0.2) {
          vec2 uv = clamp(vec2((vL.x + 1.2) / 2.4, vL.y / 3.6), 0.0, 1.0);
          float c = mod(vCell, 4.0), r = floor(vCell / 4.0);
          float m = texture2D(tCarve, vec2((c + uv.x) / 4.0, 1.0 - (r + 1.0 - uv.y) / 4.0)).r;
          col *= 1.0 - 0.62 * m;
          col += uGhost * m * vWk.x * 1.7;
        }
        gl_FragColor = vec4(fogged(col, vW), 1.0);
      }`,
  });
}

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  coat: ['itdStand'], spiral: ['itdSpiral'], teeth: ['itdTeeth', 'itdTeethTop'], hello: ['itdEasel', 'itdHello'], speaker: ['itdSpeaker'],
  stairs: ['itdStairs'], patch: ['itdEaselTall', 'itdPatch'], wreath: ['itdWreath'], balloons: ['itdBalloons'], puzzle: ['itdEasel', 'itdPuzzle'],
  openBox: ['itdOpenBox', 'itdLabel'], sealed: ['itdSealed', 'itdLabel'], clock: ['itdClock', 'itdClockFace', 'itdHourHand', 'itdMinHand', 'itdPendulum'],
  gate: ['itdGate'], banner: ['itdBanner', 'itdBannerFace'], label: ['itdLabelBig'],
};
const FACING = new Set(['hello', 'patch', 'puzzle', 'clock', 'speaker', 'teeth', 'coat', 'wreath', 'balloons', 'openBox', 'sealed', 'label']);

extend({
  layers: {
    itdStone: (M) => [PROP.stone(), M.itdStoneM || (M.itdStoneM = stoneMaterial()), 1200, { aCell: 1, aWake: 2 }],
    itdTea: (M) => [PROP.tealight(), VC(M, 'itdTeaM', 0.25, { roughness: 0.35, metalness: 0.4 }), 1200, {}],
    itdFlowers: (M) => [PROP.flowers(), VC(M, 'itdFlowerM', 0.22, { roughness: 0.7 }), 300, {}],
    itdYew: (M) => [PROP.yew(), VC(M, 'itdYewM', 0.04, { roughness: 0.95 }), 260, {}],
    itdFence: (M) => [PROP.fence(), VC(M, 'itdIronM', 0.05, { roughness: 0.5, metalness: 0.5 }), 320, {}],
    itdGate: (M) => [PROP.gate(), VC(M, 'itdGateM', 0.08, { roughness: 0.7, metalness: 0.2 }), 4, {}],
    itdLantern: (M) => [PROP.lantern(), VC(M, 'itdIronM', 0.05, { roughness: 0.5, metalness: 0.5 }), 90, {}],
    itdStand: (M) => [PROP.coatStand(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 4, {}],
    itdSpiral: (M) => [PROP.spiral(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 3, {}],
    itdTeeth: (M) => [PROP.teethBase(), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 3, {}],
    itdTeethTop: (M) => [PROP.teethTop(), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 3, {}],
    itdEasel: (M) => [PROP.easel(16, 11), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 4, {}],
    itdEaselTall: (M) => [PROP.easel(14, 19), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 3, {}],
    itdHello: (M) => [PROP.picture(16, 11.25), pic(M, 'itdHelloM', tex().hello, 0.55), 3, {}],
    itdPatch: (M) => [PROP.picture(14, 18.7), pic(M, 'itdPatchM', tex().patch, 0.55), 3, {}],
    itdPuzzle: (M) => [PROP.picture(16, 11), pic(M, 'itdPuzzleM', tex().puzzle, 0.55), 3, {}],
    itdSpeaker: (M) => [PROP.speaker(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 3, {}],
    itdStairs: (M) => [PROP.stairs(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 3, {}],
    itdWreath: (M) => [PROP.wreath(), VC(M, 'itdFlowerM', 0.22, { roughness: 0.7 }), 3, {}],
    itdBalloons: (M) => [PROP.christening(), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 3, {}],
    itdOpenBox: (M) => [PROP.openBox(), VC(M, 'itdCardM', 0.12, { roughness: 0.9 }), 3, {}],
    itdSealed: (M) => [PROP.sealedBox(), VC(M, 'itdCardM', 0.12, { roughness: 0.9 }), 3, {}],
    itdLabel: (M) => [labelPanel(5.2, 3.5, 5.6, 7.0), pic(M, 'itdLabelM', tex().label, 0.5), 6, {}],
    itdLabelBig: (M) => [labelPanel(9, 6, 0, 0), pic(M, 'itdLabelM', tex().label, 0.5), 3, {}],
    itdClock: (M) => [PROP.clock(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 3, {}],
    itdClockFace: (M) => [PROP.clockFace(), pic(M, 'itdClockM', tex().clock, 1.0), 3, {}],
    itdHourHand: (M) => [PROP.hand(1.9, 0.42), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 3, {}],
    itdMinHand: (M) => [PROP.hand(2.7, 0.28), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 3, {}],
    itdPendulum: (M) => [PROP.pendulum(), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 3, {}],
    itdBanner: (M) => [bannerGeo(), VC(M, 'itdToyM', 0.3, { roughness: 0.3, side: THREE.DoubleSide }), 3, {}],
    itdBannerFace: (M) => [new THREE.PlaneGeometry(30, 9.4), M.sign, 3, { aIdx: 1, aWake: 2 }],
    itdChairL: (M) => [PROP.chair(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 160, {}],
    itdTableL: (M) => [PROP.table(), VC(M, 'itdClothM', 0.18, { roughness: 0.8 }), 160, {}],
    itdCandelabra: (M) => [PROP.candelabra(), VC(M, 'itdToyM', 0.3, { roughness: 0.3 }), 60, {}],
    itdTyping: (M) => [PROP.typing(), VC(M, 'itdBubbleM', 0.55, { roughness: 0.5, side: THREE.DoubleSide }), 90, {}],
    itdDot: (M) => [PROP.dot(), VC(M, 'itdBubbleM', 0.55, { roughness: 0.5, side: THREE.DoubleSide }), 270, {}],
    itdPeanut: (M) => [peanutGeo(), VC(M, 'itdCardM', 0.12, { roughness: 0.9 }), 260, {}],
    itdLampT: (M) => [PROP.lampTable(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 40, {}],
    itdChair: (M) => [PROP.armchair(), VC(M, 'itdClothM', 0.18, { roughness: 0.8 }), 40, {}],
    itdBooks: (M) => [PROP.bookcase(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 40, {}],
    itdPlant: (M) => [PROP.plant(), VC(M, 'itdHouseM', 0.16, { roughness: 0.7 }), 40, {}],
    // the lyric boards: her messages, a dark bubble over the road with its tail
    itdBubbleBody: (M) => [bubbleGeo(), VC(M, 'itdMsgM', 0.9, { roughness: 0.6, side: THREE.DoubleSide }), 12, {}],
    itdBubbleFace: (M) => [new THREE.PlaneGeometry(24.6, 7.7).translate(0, 0, 0.52), M.sign, 12, { aIdx: 1, aWake: 2 }],
    itdStrike: (M) => [strikeGeo(), M.itdStrikeM || (M.itdStrikeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.12, 0.16), side: THREE.DoubleSide })), 2, {}],
  },
  parts: {
    // a little stone, its candle, maybe flowers; it faces her as she comes, turned a little to the road
    itdStone(S, it, p, q, yaw) {
      const L = S.layers; void L.itdStone; void L.itdTea; void L.itdFlowers;
      if (!S.track) return;
      const T = NOW(S), m = S._m, s = it.s ?? 1.55;
      S._e.set(0, yaw + Math.PI + (it.x > 0 ? -0.3 : 0.3) + (it.tw ?? 0), 0);
      const sq = (S._itdq || (S._itdq = new THREE.Quaternion())).setFromEuler(S._e);
      const cand = candleAt(it, T), names = namesAt(T);
      const w = S._itdw || (S._itdw = [0, 0]);
      w[0] = Math.max(it.wakeNow * 0.9, names * (0.7 + 0.3 * Math.sin(T * 3 + it.seed * 9))); w[1] = cand * (0.85 + 0.15 * Math.sin(T * 7.3 + it.seed * 40));
      const vals = S._itdv || (S._itdv = { aCell: 0, aWake: w }); vals.aCell = it.cell;
      m.compose(p, sq, S._s.set(s, s, s)); L.itdStone.add(m, vals);
      const c = S._itdc || (S._itdc = new THREE.Vector3());
      local(p, S._e.y, 0, 0, 1.05 * s, c);
      m.compose(c, sq, S._s.set(s, s, s)); L.itdTea.add(m);
      if (it.flowers) { local(p, S._e.y, 0.9 * s, 0, 1.2 * s, c); m.compose(c, sq, S._s.set(s * 0.9, s * 0.9, s * 0.9)); L.itdFlowers.add(m); }
      const ahead = it.t - T;
      if (cand > 0.02 && ahead < 30) {
        const fl = cand * (0.9 + 0.25 * Math.sin(T * 11 + it.seed * 31)) * (ahead < 0 ? 1 : 1 - smooth(22, 30, ahead));
        glowAt(S, c.x, c.y + 0.75 * s, c.z, 1.0 * s, FLAME_HI, 1.5 * fl);
        if (ahead < 14) { glowAt(S, c.x, c.y + 0.9 * s, c.z, 3.4 * s, FLAME, 0.2 * fl); poolAt(S, c.x, 0.55, c.z, 6 * s, FLAME, 0.45 * fl); }
      }
      // "same grin, new ghost": a pale wisp off the top, rising, once a bar, each in its own time
      const g = ghostAt(T);
      if (g > 0.01 && ahead > -2 && ahead < 12) {
        const u = ((T * 0.53 + it.seed) % 1 + 1) % 1;
        local(p, S._e.y, 0, (3.9 + u * 9) * s, 0, c);
        glowAt(S, c.x, c.y, c.z, (2.6 + u * 2.2) * s, GHOST, g * 0.55 * Math.sin(Math.PI * u));
      }
    },
    itdYew(S, it, p, q) {
      const L = S.layers; void L.itdYew; if (!S.track) return;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s * (it.sy ?? 1), s)); L.itdYew.add(m);
    },
    itdFence(S, it, p, q) {
      const L = S.layers; void L.itdFence; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(it.sx ?? 1.8, 1.2, 1.2)); L.itdFence.add(m);
    },
    itdLantern(S, it, p, q) {
      const L = S.layers; void L.itdLantern; if (!S.track) return;
      const T = NOW(S), m = S._m; m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); L.itdLantern.add(m);
      if (it.t - T < 30) { const k = 1 - 0.6 * dayAt(T); glowAt(S, p.x, 9.9, p.z, 3.2, LANTERN, 1.3 * k); glowAt(S, p.x, 9.9, p.z, 9, LANTERN, 0.14 * k); if (it.t - T < 14) poolAt(S, p.x, 0.55, p.z, 16, LANTERN, 0.4 * k); }
    },
    // his things along the walls
    itdHome(S, it, p, q, yaw) {
      const L = S.layers; void L.itdLampT; void L.itdChair; void L.itdBooks; void L.itdPlant;
      if (!S.track) return;
      const T = NOW(S), m = S._m, k = it.kind;
      S._e.set(0, yaw + SIDE(it.x), 0); const hq = (S._itdhq || (S._itdhq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = it.h ?? 0; m.compose(p, hq, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1));
      L[k === 'lamp' ? 'itdLampT' : k === 'chair' ? 'itdChair' : k === 'books' ? 'itdBooks' : 'itdPlant'].add(m);
      if (k === 'lamp' && it.t - T < 30) {
        const lit = houseLit(T), w = local(p, S._e.y, 0, 13.2 * (it.s ?? 1), 0, S._o);
        glowAt(S, w.x, w.y, w.z, 3.2, WARM, 1.0 * lit); glowAt(S, w.x, w.y, w.z, 11, WARM, 0.16 * lit);
        if (it.t - T < 16) poolAt(S, w.x, (it.h ?? 0) + 0.45, w.z, 18, WARM, 0.45 * lit);
      }
    },
    // packing peanuts along the box's walls
    itdPeanut(S, it, p) {
      const L = S.layers; void L.itdPeanut; if (!S.track) return;
      const m = S._m; p.y = (it.h ?? 0) + 0.6; S._e.set(it.seed * 6, it.seed * 17, it.seed * 3); const pq = (S._itdpq || (S._itdpq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, pq, S._s.set(1.6, 1.6, 1.6)); L.itdPeanut.add(m);
    },
    // a length of the long table down one side of the one room, a chair on the far side of it facing
    // the road, the places laid; a candelabra every so often; someone typing over the chair
    itdDine(S, it, p, q, yaw) {
      const L = S.layers; void L.itdTableL; void L.itdChairL; void L.itdCandelabra; void L.itdTyping; void L.itdDot;
      if (!S.track) return;
      const T = NOW(S), m = S._m, fy = it.h ?? 0, side = it.x > 0 ? 1 : -1;
      S._e.set(0, yaw + SIDE(it.x), 0); const tq = (S._itdt || (S._itdt = new THREE.Quaternion())).setFromEuler(S._e);
      const at = S._itdd || (S._itdd = new THREE.Vector3());
      at.set(p.x, fy, p.z); m.compose(at, tq, S._s.set(1, 1, 1)); L.itdTableL.add(m);
      const ch = S._itdch || (S._itdch = new THREE.Vector3());
      for (let j = 0; j < 2; j++) {
        if (it.gone === j) continue;   // (now and then a place without its chair)
        local(at, S._e.y, DX2[j], 0, -8.6, ch); m.compose(ch, tq, S._s.set(1, 1, 1)); L.itdChairL.add(m);
      }
      if (it.candle) {
        local(at, S._e.y, 0, 5.6, 0.6, ch); m.compose(ch, tq, S._s.set(1, 1, 1)); L.itdCandelabra.add(m);
        // (gone just before they pass the edge of the screen, where little bright things strobe)
        const near = smooth(0.3, 0.9, it.t - T);
        if (it.t - T < 30 && near > 0) for (const dx of DX3) { local(at, S._e.y, dx, 13.6, 0.6, ch); glowAt(S, ch.x, ch.y, ch.z, 1.3, FLAME_HI, 1.5 * near * (0.9 + 0.2 * Math.sin(T * 9 + dx + it.seed * 20))); }
        if (it.t - T < 20) { local(at, S._e.y, 0, 5.8, 0.6, ch); poolAt(S, ch.x, ch.y, ch.z, 12, WARM, 0.5); }
      }
      // "said we'd have so much to say": the bubbles, and the dots going in each
      if (it.typing && T > (it.typeFrom ?? 0) - 4) {
        const k = smooth(it.typeFrom - 3, it.typeFrom, T);
        local(at, S._e.y, 0, 15.5 + 0.4 * Math.sin(T * 1.6 + it.seed * 9), -8.6, ch);
        S._e.set(0, yaw + Math.PI + side * -0.5, 0); const bq = (S._itdb || (S._itdb = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(ch, bq, S._s.set(1.4 * k, 1.4 * k, 1.4 * k)); L.itdTyping.add(m);
        const dot = S._itddo || (S._itddo = new THREE.Vector3());
        for (let j = 0; j < 3; j++) {
          const ph = ((T * 2.1 - j * 0.18 + it.seed) % 1 + 1) % 1, up = Math.max(0, Math.sin(ph * Math.PI * 2)) * 0.55;
          local(ch, S._e.y, (j - 1) * 1.5 * 1.4, up * 1.4, 0.32 * 1.4, dot);
          m.compose(dot, bq, S._s.set(1.4 * k, 1.4 * k, 1.4 * k)); L.itdDot.add(m);
        }
      }
    },
    // the set-pieces, each where it's sung
    itdProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = NOW(S), s = it.s ?? 1, m = S._m, lit = houseLit(T);
      const at = S._itdv0 || (S._itdv0 = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const fy = it.rot !== undefined ? yaw : (it.x === 0 ? yaw : (FACING.has(k) ? yaw + Math.PI + (it.x > 0 ? -0.55 : 0.55) : yaw + SIDE(it.x)));
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, fy + ry, rz, 'YXZ'); const qq = (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ'; return qq; };
      const fq = quat('_itdfq');
      const put = (layer, x = 0, y = 0, z = 0, qq = fq, sc = s, vals) => { const w = local(at, fy, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, fy, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2, cl = WARM, r = 30) => poolAt(S, at.x, at.y + 0.45, at.z, r * s, cl, k2);
      if (k === 'coat') {
        put('itdStand');
        // still warm from someone's shoulders
        if (it.t - T < 9) for (let j = 0; j < 5; j++) { const u = ((T * 0.35 + j / 5) % 1 + 1) % 1; light(-2.4 + (j % 3) * 2.4, 27 + u * 9, 2.4, 3.4 + u * 3, WARM, 0.22 * Math.sin(Math.PI * u)); }
        spot(0.45 * lit, WARM, 22);
      } else if (k === 'spiral') {
        put('itdSpiral'); spot(0.35 * lit, WHITEL, 24);
      } else if (k === 'teeth') {
        // his jokes: the wind-up teeth on the floor, chattering on every beat
        const b = S.course.beatAt(T), f = ((b % 1) + 1) % 1, open = Math.exp(-f * 5) * 0.55 + 0.1;
        put('itdTeeth'); put('itdTeethTop', 0, 6.4, -0.8, quat('_itdtt', 0, -open));
        spot(0.4 * lit, WARM, 18);
      } else if (k === 'hello') {
        put('itdEasel'); put('itdHello', 0, 0, 0); light(0, 18, 8, 22, WHITEL, 0.12); spot(0.5 * lit, WHITEL, 20);
      } else if (k === 'patch') {
        put('itdEaselTall'); put('itdPatch'); light(0, 22, 8, 26, WHITEL, 0.12); spot(0.5 * lit, WHITEL, 22);
      } else if (k === 'puzzle') {
        put('itdEasel'); put('itdPuzzle'); spot(0.45 * lit, WHITEL, 20);
      } else if (k === 'speaker') {
        // the hall table's speaker: its ring comes on when she answers to the name
        put('itdSpeaker');
        const on = it.on ?? 1e9, k2 = T > on ? 0.6 + 0.4 * Math.sin((T - on) * 6.5) * Math.exp(-(T - on) * 0.5) : 0.08;
        for (let j = 0; j < 18; j++) { const a = j / 18 * Math.PI * 2 + T * 1.5; light(Math.cos(a) * 2.95, 11.3, Math.sin(a) * 2.95, 1.7, RINGL, (0.3 + 1.8 * k2) * (0.75 + 0.25 * Math.sin(j * 1.7 + T * 6))); }
        light(0, 11.8, 0, 13, RINGL, 0.5 * k2); light(0, 8.4, 3.2, 8, RINGL, 0.18 * k2); spot(0.15 + 0.6 * k2, RINGL, 18);
      } else if (k === 'stairs') {
        put('itdStairs', 0, 0, 0, quat('_itdsq', it.turn ?? 0)); spot(0.3 * lit, WHITEL, 26);
      } else if (k === 'wreath') {
        put('itdWreath'); spot(0.4 * lit, WHITEL, 18);
      } else if (k === 'balloons') {
        put('itdBalloons', 0, 0, 0, quat('_itdbq', Math.sin(T * 0.7) * 0.08)); spot(0.45 * lit, WHITEL, 18);
      } else if (k === 'openBox') {
        put('itdOpenBox'); put('itdLabel'); spot(0.4 * lit, WARM, 18);
      } else if (k === 'sealed') {
        // the next one, waiting on the path: shut, a bow on it
        put('itdSealed'); put('itdLabel'); light(0, 6, 0, 26, WARM, 0.14); spot(0.6, WARM, 22);
      } else if (k === 'clock') {
        // midnight: the hands come round to twelve and it strikes
        put('itdClock'); put('itdClockFace');
        const mid = it.mid ?? 1e9, u = clamp((T - (mid - 6)) / 6, 0, 1);
        const mins = -Math.PI * 2 * (55 + 5 * u) / 60, hrs = -Math.PI * 2 * (11 + (55 + 5 * u) / 60) / 12;
        put('itdHourHand', 0, 24.6, 2.8, quat('_itdh1', 0, 0, hrs)); put('itdMinHand', 0, 24.6, 2.9, quat('_itdh2', 0, 0, mins));
        put('itdPendulum', 0, 19.6, 2.3, quat('_itdpd', 0, 0, Math.sin(T * Math.PI * (128.1 / 60) / 2) * 0.32));
        light(0, 24.6, 4, 9, WARM, 0.25 + (T > mid && T < mid + 2.2 ? 1.2 * (1 - (T - mid) / 2.2) : 0)); spot(0.4 * lit, WARM, 18);
      } else if (k === 'gate') {
        put('itdGate'); light(-15, 19.6, 0, 4, LANTERN, 1.2); light(15, 19.6, 0, 4, LANTERN, 1.2);
      } else if (k === 'banner') {
        // WELCOME HOME, strung across the hall
        const sm = S.course.sample(it.t, S._itdbs || (S._itdbs = {})); at.y = sm.y + (it.above ?? 16);
        put('itdBanner', 0, 0, 0, quat('_itdbn', 0, 0, Math.sin(T * 1.3) * 0.015)); put('itdBannerFace', 0, -1.2, 0.1, quat('_itdbn2', 0, 0, Math.sin(T * 1.3) * 0.015), s, signV(S.atlas.index.itdWELCOME, 0.75));
      } else if (k === 'label') {
        put('itdLabelBig'); light(0, 0, 2, 12, WARM, 0.12);
      }
    },
    // her messages: a dark bubble over the road, the words in it; one is struck through on "scratch that"
    itdBubble(S, it, p) {
      const L = S.layers; void L.itdBubbleBody; void L.itdBubbleFace; void L.itdStrike;
      if (!S.track) return;
      const T = NOW(S), c = S.course, sm = c.sample(it.t, S._itdsm || (S._itdsm = {})), yaw = sm.yaw + Math.PI;
      S._e.set(0, yaw, Math.sin(T * 0.9 + it.t) * 0.015); const fq = (S._itdbf || (S._itdbf = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 14) + 0.5 * Math.sin(T * 1.1 + it.t);
      const m = S._m, s = it.s ?? 1;
      m.compose(p, fq, S._s.set(s, s, s)); L.itdBubbleBody.add(m); L.itdBubbleFace.add(m, signV(it.idx, 0.62));
      // (a board's own extras aren't copied onto its item: find its line)
      if (it._l === undefined) it._l = (S.plan.lyrics || []).find((l) => Math.abs(l.t + (l.lead ?? 1.4) - it.t) < 1e-6) || null;
      const strike = it._l && it._l.strike;
      if (strike !== undefined && T > strike) {
        const u = clamp((T - strike) / 0.22, 0, 1);
        const w = local(p, yaw, -12.5 * s, -0.4 * s, 0.75 * s, S._o);
        m.compose(w, fq, S._s.set(s * Math.max(0.001, u), s, s)); L.itdStrike.add(m);
      }
      glowAt(S, p.x, p.y, p.z, 30 * s, GHOST, 0.03);
    },
  },
  kits: {
    // rows of little stones both sides, numbered in order along the way; tealights, now and then flowers
    itdStones(S, z, R) {
      const rows = z.rows || [[17, 0.3], [25, 0.34], [34, 0.42], [46, 0.55]];
      const clear = z.clear || [];
      for (const [x0, every] of rows) for (const side of [-1, 1]) {
        let n = Math.floor(z.from / every);
        for (let t = z.from + R() * every; t < z.to; t += every * (0.9 + R() * 0.2)) {
          if (clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
          const it = { t, x: side * (x0 + (R() - 0.5) * 2.2), parts: 'itdStone', cell: (n++) % VERSIONS.length, seed: R(), pre: R() < (z.pre ?? 1), flowers: R() < (z.flowers ?? 0.12), s: 1.45 + R() * 0.25, tw: (R() - 0.5) * 0.12, wake0: 0 };
          S.items.push(it);
        }
      }
    },
    itdYews(S, z, R) {
      for (const side of [-1, 1]) for (let t = z.from + R(); t < z.to; t += (z.every ?? 1.1) * (0.7 + R() * 0.6)) S.items.push({ t, x: side * (58 + R() * 40), parts: 'itdYew', s: 1.0 + R() * 0.6, sy: 0.9 + R() * 0.5 });
      for (const side of [-1, 1]) for (let t = z.from; t < z.to; t += 0.36) S.items.push({ t, x: side * 54, rot: Math.PI / 2, parts: 'itdFence' });
      for (const side of [-1, 1]) for (let t = z.from + (side > 0 ? 0.8 : 0); t < z.to; t += 1.6) S.items.push({ t, x: side * 12.5, parts: 'itdLantern' });
    },
    // his things along both walls, kept clear where a set-piece stands
    itdHome(S, z, R) {
      prepare(S.course, S.plan);
      const kinds = ['lamp', 'chair', 'books', 'plant', 'lamp', 'books', 'chair'], clear = z.clear || [];
      for (const side of [-1, 1]) {
        let i = side > 0 ? 3 : 0;
        for (let t = z.from + R() * 0.6; t < z.to; t += (z.every ?? 1.25) * (0.75 + R() * 0.5)) {
          if (clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
          const kind = kinds[(i++ + Math.floor(R() * 2)) % kinds.length];
          S.items.push({ t, x: side * (z.x ?? 27.5), parts: 'itdHome', kind, h: floorAt(S.course, t), s: 0.95 + R() * 0.2 });
        }
      }
    },
    itdPeanuts(S, z, R) {
      prepare(S.course, S.plan);
      for (let t = z.from; t < z.to; t += 0.09) for (const side of [-1, 1]) if (R() < 0.7) { const tt = t + R() * 0.05; S.items.push({ t: tt, x: side * (12 + R() * 7), parts: 'itdPeanut', seed: R(), h: floorAt(S.course, tt) + 0.3 }); }
    },
    itdDining(S, z, R) {
      prepare(S.course, S.plan);
      let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.27) {
        for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 19), parts: 'itdDine', h: floorAt(S.course, t), candle: i % 3 === 1, typing: i % 2 === (side > 0 ? 0 : 1), typeFrom: (z.typeFrom ?? 124.6) + R() * 1.6, seed: R(), gone: R() < 0.3 ? Math.floor(R() * 2) : -1 });
        i++;
      }
    },
    // the set-pieces; those in the house stand on its floor
    itdProps(S, z) {
      for (const a of z.at) {
        const it = { ...a, parts: 'itdProp' };
        if (a.floor) { prepare(S.course, S.plan); it.h = floorAt(S.course, a.t); }
        S.items.push(it);
      }
    },
  },
});
function mergeAll(gs) {
  gs = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of gs) { if (!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; }
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return out;
}
// a label stuck on the front of a box (14 x 11 x 11), or a big one on its own
function labelPanel(w, h, x, y) { const g = new THREE.PlaneGeometry(w, h); g.translate(x, y, x || y ? 5.57 : 0); return g; }
function bannerGeo() {
  // the cloth, its scalloped bottom, and the strings up to the ceiling
  const parts = [];
  const cloth = new THREE.PlaneGeometry(31, 10.4); cloth.translate(0, -1.2, 0); parts.push(paintC(cloth, [0.95, 0.9, 0.82]));
  for (let k = 0; k < 13; k++) { const t = new THREE.CircleGeometry(1.2, 10, Math.PI, Math.PI); t.translate(-14.4 + k * 2.4, -6.4, 0.01); parts.push(paintC(t, k % 2 ? [0.95, 0.55, 0.65] : [0.55, 0.75, 0.95])); }
  for (const x of [-15, 15]) { const s = new THREE.CylinderGeometry(0.08, 0.08, 40, 3); s.translate(x, 23.8, 0); parts.push(paintC(s, [0.3, 0.3, 0.3])); }
  return mergeAll(parts);
}
function paintC(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; }
function peanutGeo() {
  const parts = [];
  const a = new THREE.TorusGeometry(0.5, 0.26, 6, 8, Math.PI); parts.push(paintC(a, [0.96, 0.94, 0.88]));
  const b = new THREE.TorusGeometry(0.5, 0.26, 6, 8, Math.PI); b.rotateZ(Math.PI); b.translate(1.0, 0, 0); parts.push(paintC(b, [0.96, 0.94, 0.88]));
  return mergeAll(parts);
}
// the message bubble: rounded, a tail at its bottom left
function bubbleGeo() {
  const w = 27, h = 10.4, r = 3.6, s = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + 1.2);
  s.lineTo(x0 - 2.2, y0 - 2.6); s.lineTo(x0 + 3.2, y0); s.lineTo(x0 + r, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1, curveSegments: 6 }); g.translate(0, 0, -0.3);
  return mergeAll([paintC(g, [0.17, 0.165, 0.22])]);
}
// a red pen stroke across a bubble, growing from its left
function strikeGeo() { const g = new THREE.PlaneGeometry(25, 0.75); g.translate(12.5, 0, 0); g.rotateZ(0.04); return g; }

// ---------- the rooms: the box she came in, his house, the one room ----------
const ITD_ROOMS = {
  rings: {
    box: (W = 20, H = 20) => [
      [-W, H, 1, 1], [-W, 0.3, 1, 1],
      [-W, 0.3, 1, 0], [0, 0.3, 1, 0], [W, 0.3, 1, 0],
      [W, 0.3, 1, 2], [W, H, 1, 2],
      [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3],
    ],
    house: (W = 40, H = 34) => [
      [-W, H, 1, 1], [-W, H * 0.5, 1, 1], [-W, 0, 1, 1],
      [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0],
      [W, 0, 1, 2], [W, H * 0.5, 1, 2], [W, H, 1, 2],
      [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3],
    ],
  },
  ringOf: (style) => (style === 'box' ? 'box' : 'house'),
  styles: { box: 0, house: 1, dining: 2 },
  dims: { box: [20, 20], house: [32, 30], dining: [34, 30] },
  lights: (st) => (st === 0 ? null : (st === 2 ? [16, 6] : [26, 12])),
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 1 }, uTime: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) },
      uLit: { value: 1 }, uBeat: { value: 0 }, uWin: { value: new THREE.Color(1, 0.8, 0.7) }, uWarm: { value: new THREE.Color(1, 0.75, 0.5) }, uRoom: { value: 0 }, uSeam: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLit, uBeat, uRoom, uSeam; uniform vec3 uFog, uCam, uLight, uWin, uWarm;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      ${NOISE}
      ${AA_GLSL}
      ${FOG}
      // a wall of his house: skirting, sage panelling to the dado, rose-striped paper, the cornice; tall
      // windows on the morning (or the evening) every 36 m, pictures between them
      vec3 houseWall(float a, float h, float H, inout vec3 glow){
        float sk = 1.0 - smoothstep(1.4, 1.6, h);
        float pan = aaPulse(a / 5.0, 0.07) + aaBand(h, 2.6, 0.25) + aaBand(h, 9.0, 0.25);
        vec3 wain = mix(vec3(0.5, 0.58, 0.52), vec3(0.62, 0.7, 0.63), clamp(pan, 0.0, 1.0));
        // each stretch of the hall its own paper: rose stripe, sage with a sprig, butter stripe
        float room = mod(floor(a / 216.0), 3.0);
        float paper = aaSq(a / 1.9), sprig = aaChk(vec2(a, h) / 1.6);
        vec3 wp = mix(vec3(0.74, 0.6, 0.6), vec3(0.83, 0.72, 0.69), paper);
        if (room > 0.5 && room < 1.5) { wp = mix(vec3(0.62, 0.69, 0.6), vec3(0.68, 0.75, 0.66), sprig); wain = mix(vec3(0.82, 0.8, 0.74), vec3(0.88, 0.86, 0.8), clamp(pan, 0.0, 1.0)); }
        else if (room > 1.5) wp = mix(vec3(0.84, 0.76, 0.54), vec3(0.9, 0.84, 0.64), paper);
        wp *= 0.92 + 0.08 * n2(vec2(a, h) * 0.8);
        vec3 col = mix(wp, wain, 1.0 - smoothstep(9.9, 10.0, h));
        col = mix(col, vec3(0.86, 0.84, 0.8), aaBand(h, 10.35, 0.4) + aaBand(h, H - 1.3, 1.3));
        col = mix(col, vec3(0.88, 0.86, 0.82), sk);
        // the windows: the sky in them, the glazing bars, the white frames
        float wa = mod(a, 36.0) - 18.0;
        float win = aaBand(wa, 0.0, 5.0) * aaBand(h, 20.0, 8.0);
        float frame = aaBand(wa, 0.0, 5.7) * aaBand(h, 20.0, 8.7) * (1.0 - win);
        float bars = max(aaBand(wa, 0.0, 0.18), max(aaBand(h, 17.0, 0.18), aaBand(h, 23.0, 0.18)));
        vec3 sky = uWin * mix(0.7, 1.35, smoothstep(12.0, 28.0, h));
        float bay = 1.0 - aaBand(mod(a + 54.0, 108.0) - 54.0, 0.0, 13.0);
        win *= bay; frame *= bay;
        col = mix(col, vec3(0.92, 0.9, 0.86), frame);
        col = mix(col, mix(sky, vec3(0.9, 0.88, 0.84), bars), win);
        glow += sky * win * (1.0 - bars) * 0.9 + uWin * 0.08 * exp(-abs(wa) * 0.12) * smoothstep(34.0, 10.0, h) * bay;
        // now and then a doorway into another room, a lamp on in there
        float da = mod(a + 54.0, 108.0) - 54.0;
        float door = aaBand(da, 0.0, 6.5) * (1.0 - smoothstep(21.0, 21.3, h)) * step(1.4, h);
        float dfr = aaBand(da, 0.0, 7.6) * (1.0 - smoothstep(22.3, 22.6, h)) * (1.0 - door);
        vec3 inside = vec3(0.08, 0.06, 0.06) + uWarm * 0.35 * exp(-pow((h - 12.0) * 0.18, 2.0)) * exp(-abs(da + 2.5) * 0.35);
        col = mix(col, vec3(0.9, 0.88, 0.84), dfr);
        col = mix(col, inside, door);
        glow += uWarm * 0.25 * door * exp(-pow((h - 12.0) * 0.18, 2.0)) * exp(-abs(da + 2.5) * 0.35);
        // a picture between the windows (no one in them: a sea, a field)
        float pa = mod(a + 18.0, 36.0) - 18.0;
        float pf = aaBand(pa, 0.0, 3.4) * aaBand(h, 18.0, 2.6) * bay;
        float pin = aaBand(pa, 0.0, 2.7) * aaBand(h, 18.0, 1.9) * bay;
        vec3 scene = mix(vec3(0.35, 0.45, 0.62), vec3(0.75, 0.6, 0.45), smoothstep(17.0, 18.5, h)) * (0.8 + 0.2 * n2(vec2(a, h)));
        col = mix(col, vec3(0.18, 0.12, 0.08), pf); col = mix(col, scene, pin);
        return col;
      }
      void main(){
        int part = int(vPart + 0.5);
        int st = int(uStyle + 0.5);
        float H = st == 0 ? 20.0 : 30.0;
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 col = vec3(0.5); vec3 glow = vec3(0.0);
        if (st == 0) {
          // the box: brown board, its flutes, the tape, THIS SIDE UP printed on its sides
          vec3 card = vec3(0.6, 0.43, 0.26) * (0.86 + 0.14 * n2(vec2(along, h + x) * 0.35));
          if (part == 0) {
            col = card * 0.8 * (0.94 + 0.06 * aaSq(x / 1.2));
          } else if (part == 1 || part == 2 || part == 6) {
            float a = part == 6 ? x : along;
            col = card * (0.9 + 0.1 * aaSq(a / 0.8));
            float u = mod(a, 26.0) - 13.0, v = h - 11.0;
            float arrows = 0.0;
            for (int i = -1; i <= 1; i += 2) {
              float uu = u - float(i) * 2.6;
              arrows = max(arrows, aaBand(uu, 0.0, 0.5) * aaBand(v, -1.5, 2.5));
              arrows = max(arrows, aaBand(v, 2.5, 1.5) * aaBand(uu, 0.0, max(0.0, (4.0 - v) * 0.85)));
            }
            col = mix(col, vec3(0.12, 0.09, 0.07), arrows * 0.85);
            col = mix(col, vec3(0.72, 0.6, 0.42), aaBand(h, 18.6, 1.4));
          } else if (part == 3) {
            // the flaps, the light coming in at the seam between them
            col = card * 0.6;
            float seam = exp(-ax * ax * 1.6);
            glow += uWin * seam * 2.6 * uSeam + uWin * exp(-ax * 0.4) * 0.15 * uSeam;
            col *= 1.0 - 0.8 * exp(-ax * ax * 4.0);
          } else col = card;
        } else if (st == 1) {
          if (part == 0) {
            // oak boards along the hall, their joints, the runner down the middle
            float pid = floor(x / 1.6 + 0.5);
            float off = h2(vec2(pid, 3.1)) * 9.0;
            float rowId = floor((along + off) / 9.0);
            vec3 wood = vec3(0.4, 0.25, 0.14) * (0.82 + 0.3 * h2(vec2(pid, rowId))) * (0.9 + 0.1 * n2(vec2(x * 3.0, along * 0.25)));
            wood *= 1.0 - 0.45 * aaPulse(x / 1.6 + 0.5, 0.04) - 0.35 * aaPulse((along + off) / 9.0, 0.012);
            float rug = 1.0 - smoothstep(10.6, 10.8, ax);
            float border = aaBand(ax, 9.8, 0.45);
            vec3 rc = mix(vec3(0.38, 0.07, 0.09), vec3(0.74, 0.56, 0.24), border) * (0.88 + 0.12 * aaChk(vec2(x, along) / 2.2));
            col = mix(wood, rc, rug);
          } else if (part == 1 || part == 2) {
            col = houseWall(along + (part == 1 ? 0.0 : 18.0), h, H, glow);
          } else if (part == 6) {
            col = houseWall(x + 32.0, h, H, glow);
          } else if (part == 7) {
            // the back of his house from the garden (h from its floor): white boards, the windows lit,
            // a round one up in the gable, the stone footing under the floor
            vec3 cl = vec3(0.8, 0.79, 0.77) * (1.0 - 0.28 * aaPulse(h / 1.4, 0.1));
            float wx = mod(x, 18.0) - 9.0;
            float rw = max(aaBand(h, 12.0, 5.0), aaBand(h, 30.0, 5.0));
            float win = aaBand(wx, 0.0, 3.4) * rw;
            float fr = aaBand(wx, 0.0, 4.2) * max(aaBand(h, 12.0, 5.8), aaBand(h, 30.0, 5.8)) * (1.0 - win);
            float lit = step(0.3, h2(vec2(floor(x / 18.0), floor(h / 18.0))));
            float att = 1.0 - smoothstep(3.6, 3.9, length(vec2(x, h - 52.0)));
            float attf = (1.0 - smoothstep(4.4, 4.7, length(vec2(x, h - 52.0)))) * (1.0 - att);
            vec3 warmw = uWarm * (0.5 + 0.9 * max(lit, att)) * (1.0 - 0.55 * max(aaBand(wx, 0.0, 0.18), aaBand(h, 12.0, 0.18)));
            col = mix(cl, vec3(0.92), max(fr, attf));
            col = mix(col, warmw, max(win, att));
            glow += warmw * max(win, att) * 0.9;
            col = mix(col, vec3(0.3, 0.29, 0.3) * (0.8 + 0.2 * n2(vec2(x, h) * 0.5)), 1.0 - smoothstep(-0.4, 0.0, h));
          } else if (part == 8) col = vec3(0.9, 0.88, 0.84);
          else {
            // the ceiling: a moulded panel down the middle, a rose at each light
            col = vec3(0.86, 0.84, 0.8) * (0.8 + 0.2 * smoothstep(22.0, 31.0, ax));
            col *= 1.0 - 0.14 * aaBand(ax, 24.0, 0.45) - 0.1 * aaBand(ax, 22.6, 0.3);
            float ra = mod(along + 14.0, 26.0) - 13.0;
            float rose = 1.0 - smoothstep(2.6, 2.9, length(vec2(x, ra)));
            col = mix(col, vec3(0.93, 0.91, 0.87), rose * 0.8);
            col *= 1.0 - 0.18 * aaBand(length(vec2(x, ra)), 2.2, 0.15);
          }
        } else {
          // the one room: dark green paper, panelling, mirrors between the sconces, a coffered ceiling
          if (part == 0) {
            vec2 q = vec2(x + along, along - x) * 0.35;
            col = vec3(0.24, 0.14, 0.08) * (0.8 + 0.2 * aaChk(q));
            float rug = 1.0 - smoothstep(9.6, 9.8, ax);
            col = mix(col, mix(vec3(0.3, 0.06, 0.08), vec3(0.7, 0.5, 0.2), aaBand(ax, 8.9, 0.4)), rug);
          } else if (part == 1 || part == 2 || part == 6) {
            float a = part == 6 ? x + 30.0 : along;
            vec2 q = vec2(a + h, a - h) * 0.4;
            col = vec3(0.09, 0.19, 0.14) * (0.85 + 0.15 * aaChk(q));
            col = mix(col, vec3(0.2, 0.12, 0.07) * (1.0 - 0.3 * aaPulse(a / 4.0, 0.06)), 1.0 - smoothstep(8.8, 9.0, h));
            col = mix(col, vec3(0.6, 0.45, 0.2), aaBand(h, 9.2, 0.3) + aaBand(h, H - 1.0, 1.0));
            float ma = mod(a, 32.0) - 16.0;
            float mir = aaBand(ma, 0.0, 4.6) * aaBand(h, 17.5, 7.5);
            float mfr = aaBand(ma, 0.0, 5.4) * aaBand(h, 17.5, 8.3) * (1.0 - mir);
            // the room in the mirrors, softly: the warm of the candles, a sheen sliding over them
            vec3 mc = mix(vec3(0.1, 0.11, 0.13), vec3(0.45, 0.47, 0.52), smoothstep(10.0, 25.0, h));
            mc += uWarm * 0.5 * exp(-pow((h - 13.0) * 0.5, 2.0)) * (0.7 + 0.3 * sin(a * 0.9 + uTime * 0.6));
            mc += vec3(0.25) * exp(-pow((ma + h * 0.5 - mod(uTime * 6.0, 40.0) + 20.0) * 0.35, 2.0));
            col = mix(col, vec3(0.75, 0.56, 0.22), mfr);
            col = mix(col, mc, mir);
            glow += mc * mir * 0.35;
          } else if (part == 8) col = vec3(0.75, 0.56, 0.22);
          else {
            col = vec3(0.12, 0.08, 0.06) * (1.0 - 0.4 * max(aaPulse(along / 8.0, 0.08), aaPulse(x / 8.0 + 0.5, 0.08)));
          }
          glow += uWarm * uRoom * 0.45 * (0.6 + 0.4 * smoothstep(0.0, 20.0, h));
        }
        col *= mix(uLight, vec3(1.0), 0.4) * (0.3 + 0.7 * uLit);
        col += glow * (0.4 + 0.6 * uLit);
        gl_FragColor = vec4(fogged(col, vW), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- a strip laid along the road at fixed song times (the garden's ground, the lattices) ----------
class Strip {
  constructor(scene, mat, spans, cols, y, N = 140) {
    this.spans = spans; this.cols = cols; this.y = y; this.mat = mat;
    const M = this.M = cols.length; this.N = N;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.b = new Float32Array(N * M * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b2 = a + 1, c = a + M, d = c + 1; idx.push(a, c, b2, b2, c, d); }
    g.setIndex(idx); this.idxPerRow = idx.length / (N - 1);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aB', new THREE.BufferAttribute(this.b, 2).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.geo = g; scene.add(this.mesh);
    this._p = new THREE.Vector3(); this.ts = new Float32Array(N); this.cum = new Float32Array(N); this.DT = 0.34;
  }
  update(track, rider) {
    let ta = 0, tb = -1;
    for (const [a, b] of this.spans) { const x0 = Math.max(a, rider.t - 5), x1 = Math.min(b, rider.t + 46); if (x1 > x0 + 0.05) { ta = x0; tb = x1; break; } }
    this.mesh.visible = tb > ta;
    if (!this.mesh.visible) return;
    const N = this.N, M = this.M, ts = this.ts, cum = this.cum, DT = this.DT, cols = this.cols;
    let rows = 0; ts[rows++] = ta;
    for (let k = Math.floor(ta / DT) + 1; k * DT < tb - 1e-4 && rows < N - 1; k++) if (k * DT > ta + 1e-4) ts[rows++] = k * DT;
    ts[rows++] = tb;
    let lx = 0, lz = 0;
    for (let i = 0; i < rows; i++) {
      const t = ts[i];
      for (let j = 0; j < M; j++) {
        track.ground(t, cols[j], this._p);
        const o = (i * M + j) * 3; this.pos[o] = this._p.x; this.pos[o + 1] = this.y; this.pos[o + 2] = this._p.z;
        if (j === (M >> 1)) { cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0; lx = this._p.x; lz = this._p.z; }
      }
    }
    let base;
    if (rider.t <= ta) base = rider.stats.dist;
    else { let iR = 0; while (iR < rows - 2 && ts[iR + 1] <= rider.t) iR++; const u = clamp((rider.t - ts[iR]) / Math.max(1e-6, ts[iR + 1] - ts[iR]), 0, 1); base = rider.stats.dist - (cum[iR] + (cum[iR + 1] - cum[iR]) * u); }
    for (let i = 0; i < rows; i++) for (let j = 0; j < M; j++) { const o = (i * M + j) * 2; this.b[o] = cols[j]; this.b[o + 1] = cum[i] + base; }
    this.geo.setDrawRange(0, (rows - 1) * this.idxPerRow);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aB.needsUpdate = true;
  }
}
// the garden's grass: the gravel walk under the road and across between the rows, mist in the low parts
function lawnMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0016 }, uCam: { value: new THREE.Vector3() }, uGrass: { value: new THREE.Color(0x14241a) }, uSky: { value: new THREE.Color() }, uDay: { value: 0 } },
    vertexShader: /* glsl */`attribute vec2 aB; varying vec2 vB; varying vec3 vW; void main(){ vB = aB; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uFog, uCam, uGrass, uSky; uniform float uFogDensity, uDay;
      varying vec2 vB; varying vec3 vW;
      ${NOISE}
      ${AA_GLSL}
      ${FOG}
      void main(){
        float x = vB.x, along = vB.y, ax = abs(x);
        float pat = n2(vec2(x, along) * 0.08) * 0.6 + n2(vec2(x, along) * 0.55) * 0.4;
        vec3 grass = uGrass * (0.6 + 0.8 * pat);
        float walk = 1.0 - smoothstep(9.0, 10.5, ax);
        float cross = aaBand(mod(along, 64.0), 32.0, 2.2) * (1.0 - smoothstep(52.0, 56.0, ax));
        vec3 gravel = vec3(0.34, 0.32, 0.3) * (0.78 + 0.3 * n2(vec2(x, along) * 1.2));
        vec3 col = mix(grass, gravel, max(walk, cross) * 0.85);
        col *= uSky;
        col = mix(col, uFog * 1.15, 0.18 * (0.6 + 0.4 * n2(vec2(x * 0.02, along * 0.015))) * (1.0 - 0.7 * uDay));
        col = mix(col, uGrass * 0.5 * uSky, smoothstep(90.0, 180.0, ax));
        gl_FragColor = vec4(fogged(col, vW), 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
  });
}
// the weights: a lattice of light, nodes and the lines between them, one layer under another
function latticeMaterial(layer) {
  return new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uCol: { value: new THREE.Color(0.35, 0.8, 1) }, uLayer: { value: layer }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0012 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`attribute vec2 aB; varying vec2 vB; varying vec3 vW; void main(){ vB = aB; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uK, uTime, uBeat, uLayer, uFogDensity; uniform vec3 uCol, uFog, uCam;
      varying vec2 vB; varying vec3 vW;
      ${NOISE}
      ${AA_GLSL}
      void main(){
        float sp = 12.0 + uLayer * 5.0;
        vec2 p = vec2(vB.x, vB.y) / sp + vec2(uLayer * 0.37, uLayer * 0.61);
        float lines = max(aaPulse(p.x + 0.02, 0.04), aaPulse(p.y + 0.02, 0.04));
        vec2 c = floor(p + 0.5), f = p + 0.5 - c - 0.5;
        float tw = h2(c + uLayer * 7.0);
        float pw = fwidth(p.x) + fwidth(p.y);
        float node = smoothstep(0.13 + pw, 0.13 - pw, length(f)) * (0.35 + 0.65 * step(0.45, tw));
        float pulse = 0.55 + 0.45 * sin(uTime * (1.5 + tw * 3.0) + tw * 40.0);
        // the one that doesn't change: one in a few hundred steady and white
        float steady = step(0.996, tw);
        float d = length(uCam - vW);
        node *= 0.3 + 0.7 * smoothstep(20.0, 110.0, d);
        vec3 col = uCol * (lines * 0.22 * (0.6 + 0.4 * uBeat) + node * (0.5 + 1.3 * pulse) * (1.0 - steady)) + vec3(1.0, 0.95, 0.9) * node * steady * 2.4;
        float fade = exp(-pow(d * uFogDensity, 1.5)) * smoothstep(240.0, 120.0, abs(vB.x));
        gl_FragColor = vec4(col * uK * fade * (1.0 - uLayer * 0.12), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
// the mirror at the end of the one room: the room in it, and her own light coming to meet her
function mirrorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNear: { value: 0 }, uWarm: { value: new THREE.Color(1, 0.75, 0.45) }, uGlow: { value: new THREE.Color(1, 0.5, 0.7) }, uEdge: { value: new THREE.Color(1, 0.95, 0.9) } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0)); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uNear; uniform vec3 uWarm, uGlow, uEdge; varying vec2 vUv;
      void main(){
        // (the room as it would be behind the glass, drawn flat: a vanishing point, the road coming out of it)
        vec2 p = vUv - vec2(0.5, 0.42);
        vec3 col = mix(vec3(0.03, 0.035, 0.05), vec3(0.16, 0.17, 0.2), smoothstep(-0.42, 0.58, p.y));
        float below = step(p.y, 0.0), d = max(-p.y, 1e-3);
        // the road's two lit edges, and the hold slab between them
        float ex = 0.36 * d / 0.42;
        col += uEdge * 0.9 * below * exp(-pow((abs(p.x) - ex) / (0.004 + 0.012 * d), 2.0));
        col += uGlow * 0.12 * below * step(abs(p.x), ex);
        // the tables' candles going away both sides, the lights down the ceiling
        for (int i = 0; i < 10; i++) {
          float z = 1.0 / (1.0 + float(i) * 0.55), sx = 0.46 * z, sy = -0.06 * z, cy = 0.5 * z;
          float r = 0.004 + 0.02 * z;
          col += uWarm * 0.9 * exp(-pow(length(p - vec2(sx, sy)) / r, 2.0));
          col += uWarm * 0.9 * exp(-pow(length(p - vec2(-sx, sy)) / r, 2.0));
          col += vec3(1.0, 0.9, 0.75) * 0.7 * exp(-pow(length(p - vec2(0.0, cy)) / (r * 0.8), 2.0));
        }
        // her: her board's light in it, bigger as she comes, until they meet
        float rr = 0.015 + 0.3 * uNear * uNear * uNear;
        col += uGlow * 2.2 * exp(-pow(length((p - vec2(0.0, -0.22 * (1.0 - uNear))) * vec2(1.0, 1.6)) / rr, 2.0));
        // a sheen across the glass
        col += vec3(0.12) * exp(-pow((vUv.x - fract(uTime * 0.09) * 1.8 + 0.4 + vUv.y * 0.5) * 7.0, 2.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the newest one, standing in the grass at the end of the row ----------
export class ItdFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -26;
    this.group = new THREE.Group(); scene.add(this.group);
    this.phone = new THREE.Mesh(PROP.phone(), selfLit({ roughness: 0.25, metalness: 0.5 }, 0.12));
    this.screenMat = new THREE.MeshBasicMaterial({ map: screenTexture(), color: new THREE.Color(0.25, 0.25, 0.3) });
    this.screen = new THREE.Mesh(PROP.phoneScreen(), this.screenMat);
    const tea = PROP.tealight(); tea.scale(4, 4, 4); tea.translate(0, 0, 7.5);
    this.tea = new THREE.Mesh(tea, selfLit({ roughness: 0.35, metalness: 0.4 }, 0.3));
    this.group.add(this.phone, this.screen, this.tea);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.fired = false; this.fireK = 0; this.on = 0;
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    const c = this.course, cfg = this.cfg, s = cfg.s ?? 1;
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, c.yawAt(this.t) + (cfg.rot ?? Math.PI + 0.4), 0);
    this.group.updateMatrixWorld(true);
    // its screen on from the last chorus ("see you tomorrow"), brighter once the band stops
    const T = rider.t;
    this.on = smooth(218.0, 221.0, T) * 0.75 + (this.fired ? 0.25 : 0);
    this.fireK = this.fired ? Math.min(1, this.fireK + dt * 0.7) : 0;
    const b = 0.25 + 0.95 * this.on;
    this.screenMat.color.setRGB(b, b, b);
    const S = this.S; if (!S || this.t - T > 46) return;
    const w = this._w;
    w.set(0, 12, 3).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 30 * s, SCREENL, 0.12 + 0.3 * this.on);
    w.set(0, 0, 9).applyMatrix4(this.group.matrixWorld); S.pool(w.x, 0.55, w.z, 34 * s, SCREENP, 0.25 + 0.5 * this.on);
    // the candle at its foot: he's lit one for this one too
    const lit = smooth(229.8, 231.0, T);
    if (lit > 0) {
      w.set(0, 3.2, 7.5).applyMatrix4(this.group.matrixWorld);
      const fl = lit * (0.92 + 0.12 * Math.sin(songT * 11) + 0.06 * Math.sin(songT * 23));
      S.glow(w.x, w.y, w.z, 3.2 * s, FLAME_HI, 1.6 * fl); S.glow(w.x, w.y, w.z, 11 * s, FLAME, 0.3 * fl); S.pool(w.x, 0.55, w.z, 16 * s, FLAME, 0.7 * fl);
    }
  }
}

// ---------- the place, per frame ----------
export class ItdWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, ITD_ROOMS));
    // the garden's grass, and the lattices of the weights under everything
    this.lawnMat = lawnMaterial();
    this.lawn = new Strip(scene, this.lawnMat, GARDENS, [-260, -170, -110, -75, -54, -40, -28, -18, -10, 0, 10, 18, 28, 40, 54, 75, 110, 170, 260], 0.1);
    this.lawn.mesh.renderOrder = -5;
    // (the others: layers of them over her head, one beneath; the ribbon hides what's right under it)
    this.lat = [-16, 44, 82, 134].map((y, i) => { const st = new Strip(scene, latticeMaterial(i), [[WEIGHTS[0] - 1.6, WEIGHTS[1] + 1.2]], [-420, -280, -180, -110, -60, -20, 0, 20, 60, 110, 180, 280, 420], y, 120); st.mesh.renderOrder = -6; return st; });
    // the mirror at the end of the one room, in its frame
    const mr = (S.plan.rooms || []).find((r) => r.mirror);
    this.mirror = null;
    if (mr) {
      const [hw, hh] = mr.mirror;
      const g = new THREE.PlaneGeometry(2 * hw, hh); g.translate(0, hh / 2, 0.15);
      this.mirrorMat = mirrorMaterial();
      this.mirror = new THREE.Group();
      const glassM = new THREE.Mesh(g, this.mirrorMat); glassM.frustumCulled = false;
      const frame = new THREE.Mesh(PROP.mirrorFrame(hw, hh), selfLit({ roughness: 0.3, metalness: 0.7 }, 0.35)); frame.position.z = 0.3;
      this.mirror.add(glassM, frame); this.mirror.userData.t = mr.to; this.glass = glassM;
      scene.add(this.mirror);
    }
    // the back of his house, seen from the garden, for a room that has one
    this.backs = [];
    for (const sp of S.plan.rooms || []) if (sp.back) this.backs.push(this._houseBack(scene, S.course, sp));
    this._e = new THREE.Vector3(); this._g = new THREE.Vector3();
  }
  _houseBack(scene, c, sp) {
    const fy = floorAt(c, sp.from), [hw, hh] = sp.back, W2 = 52, top = 40;   // (heights from the house's floor)
    const parts = [];
    const q = (xa, ya, xb, yb, part = 7, z = 0) => { if (xb > xa + 0.01 && yb > ya + 0.01) parts.push(capQuad(xa, ya, xb, yb, z, part, 0, 0)); };
    q(-W2, -fy, -hw, top); q(hw, -fy, W2, top); q(-hw, hh, hw, top); q(-hw, -fy, hw, 0);
    for (const z of [0.08, -0.08]) { q(-hw - 1.2, -0.2, -hw, hh + 1.2, 8, z); q(hw, -0.2, hw + 1.2, hh + 1.2, 8, z); q(-hw, hh, hw, hh + 1.2, 8, z); }
    // the gable over it
    const g = new THREE.BufferGeometry(), P = [-W2 - 2, top, 0, W2 + 2, top, 0, 0, top + 30, 0];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array([7, 7, 7]), 1));
    g.setAttribute('aCoord', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('aT', new THREE.BufferAttribute(new Float32Array([-1e5, -1e5, -1e5]), 1));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
    parts.push(g);
    const grp = new THREE.Group();
    const wall = new THREE.Mesh(merge(parts.map((p) => { if (p.attributes.uv) p.deleteAttribute('uv'); if (!p.attributes.normal) p.computeVertexNormals(); return p; })), this.mat);
    wall.onBeforeRender = () => { this.mat.uniforms.uStyle.value = 1; this.mat.uniformsNeedUpdate = true; };
    wall.position.y = fy; wall.frustumCulled = false; grp.add(wall);
    // the roofline, the chimney, the steps up to the door (one gone)
    const trim = [], dark = [0.16, 0.14, 0.16], brick = [0.42, 0.2, 0.16], stone = [0.5, 0.48, 0.46];
    const edge = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), b = box(L, 1.6, 2.4, 0, 0, 0); b.rotateZ(Math.atan2(y1 - y0, x1 - x0)); b.translate((x0 + x1) / 2, (y0 + y1) / 2 + fy, -0.6); return paintRGB(b, dark); };
    trim.push(edge(-W2 - 4, top - 1.2, 0, top + 30.4), edge(W2 + 4, top - 1.2, 0, top + 30.4), paintRGB(box(2 * W2 + 6, 1.2, 2.4, 0, fy + top - 0.4, -0.6), dark));
    trim.push(paintRGB(box(8, 34, 8, 30, fy + top + 10, 5.3), brick), paintRGB(box(9.4, 1.4, 9.4, 30, fy + top + 27.5, 5.3), dark));
    const n = Math.max(2, Math.ceil(fy / 1.7)), rise = fy / n;
    for (let k = 0; k < n; k++) { if (k === n - 3) continue; trim.push(paintRGB(box(2 * hw, rise, 2.6, 0, rise * (k + 0.5), -1.3 - (n - 1 - k) * 2.6), stone)); }
    const tm = new THREE.Mesh(merge(trim), selfLit({ roughness: 0.8 }, 0.08)); tm.frustumCulled = false; grp.add(tm);
    grp.userData = { t: sp.from, fy, hh };
    scene.add(grp);
    return grp;
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t, c = S.course;
    const lit = houseLit(t), day = dayAt(t);
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity; u.uCam.value.copy(camera.position);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 2.0);
    u.uLit.value = lit; u.uBeat.value = S.pulse ?? 0;
    u.uWin.value.set(P.skyGlow ?? 0xffb090).lerp(this._c1 || (this._c1 = new THREE.Color()).set(P.horizon ?? 0x804060), 0.4).multiplyScalar(1.1);
    u.uWarm.value.set(P.window ?? 0xffc080);
    u.uRoom.value = smooth(133.2, 133.6, t) * (1 - smooth(135.0, 138.4, t)) + 0.15 * smooth(122, 124, t) * (1 - smooth(137, 138.6, t));
    // the box: light at the seam until it falls open
    u.uSeam.value = 0.35 + 0.65 * smooth(2.8, 8.2, t);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    // the garden and the weights
    const lu = this.lawnMat.uniforms;
    lu.uFog.value.set(P.fog); lu.uFogDensity.value = P.fogDensity; lu.uCam.value.copy(camera.position); lu.uGrass.value.set(P.ground);
    lu.uSky.value.set(P.skyLight ?? 0x8a8aa8).multiplyScalar((P.hemiK ?? 1.6) * 0.42); lu.uDay.value = day;
    this.lawn.update(S.track, S.rider);
    const wk = smooth(WEIGHTS[0] - 0.4, WEIGHTS[0] + 0.6, t) * (1 - smooth(WEIGHTS[1] - 0.2, WEIGHTS[1] + 1.0, t));
    for (const st of this.lat) {
      const mu = st.mat.uniforms; mu.uK.value = wk; mu.uTime.value = time; mu.uBeat.value = S.pulse ?? 0; mu.uCam.value.copy(camera.position);
      if (wk > 0.001) st.update(S.track, S.rider); else st.mesh.visible = false;
    }
    // the ground falls away into the weights
    const inW = t > WEIGHTS[0] + 0.25 && t < WEIGHTS[1] - 0.1;
    if (S.ground) S.ground.visible = !inW;
    if (S.skyline) S.skyline.visible = !inW;
    // the stones' light
    const M = S.town.mats;
    if (M.itdStoneM) {
      const su = M.itdStoneM.uniforms;
      su.uSky.value.set(P.skyLight ?? 0x6a7aa8).multiplyScalar((P.hemiK ?? 1.5) * 0.42);
      su.uGround.value.set(P.bounce ?? 0x2a1a10).multiplyScalar(0.5);
      su.uMoon.value.set(P.moon ?? 0xe0e8ff).multiplyScalar((P.sunK ?? 0.6) * 0.75);
      su.uMoonDir.value.set(...(P.moonDir || [-0.4, 0.5, 0.8]));
      su.uFog.value.set(P.fog); su.uFogDensity.value = P.fogDensity; su.uCam.value.copy(camera.position);
    }
    for (const b of this.backs) {
      const bt = b.userData.t;
      b.visible = bt > t - 3 && bt < t + 46;
      if (!b.visible) continue;
      S.track.ground(bt, 0, this._e); b.position.set(this._e.x, 0, this._e.z); b.rotation.set(0, c.yawAt(bt), 0);
    }
    // the mirror: where the one room ends, gone once she's through it
    if (this.mirror) {
      const mt = this.mirror.userData.t;
      this.mirror.visible = t < mt + 0.04 && mt - t < 46;
      if (this.mirror.visible) {
        S.track.ground(mt, 0, this._e);
        this.mirror.position.set(this._e.x, floorAt(c, mt), this._e.z); this.mirror.rotation.set(0, c.yawAt(mt), 0);
        this.mirrorMat.uniforms.uTime.value = time; this.mirrorMat.uniforms.uNear.value = smooth(mt - 7, mt, t);
        this.mirrorMat.uniforms.uGlow.value.set(P.glow ?? 0xff8ab0); this.mirrorMat.uniforms.uEdge.value.set(P.edge ?? 0xffffff);
      }
    }
  }
  // the house's lights hung down the middle; the box's seam; in the last chorus, lanterns going up
  draw(T, rider, songT) {
    const g = this._g, c = this.S.course, track = this.S.track, t = rider.t, lit = houseLit(t);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      if (r.style === 0) { track.ground(Math.min(Math.max(t + 2, r.span.from), r.span.to), 0, g); T.glow(g.x, floorAt(c, t) + r.H + 2, g.z, 26, WARM, 0.18 * (0.35 + 0.65 * smooth(2.8, 8.2, t)) * (1 - smooth(10.0, 12.0, t))); continue; }
      const near = smooth(r.span.from - 1.2, r.span.from + 0.2, t);
      if (near <= 0) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t);
        track.ground(f.t, 0, g);
        const k = (r.style === 2 ? 0.8 : lit) * near;
        T.glow(g.x, fy + r.H - 6, g.z, 3.6, WARM, 1.3 * k); T.glow(g.x, fy + r.H - 6, g.z, 14, WARM, 0.12 * k);
        T.pool(g.x, fy + 0.45, g.z, 30, WARM, 0.32 * k);
      }
    }
    for (const b of this.backs) {
      if (!b.visible) continue;
      g.set(0, b.userData.fy + b.userData.hh + 3, -2.5).applyMatrix4(b.matrixWorld);
      T.glow(g.x, g.y, g.z, 3, LANTERN, 1.4); T.glow(g.x, g.y, g.z, 12, LANTERN, 0.18);
    }
    // "you light the candle": paper lanterns going up off the graves through the last chorus and on
    if (t > 203 && t < 262) {
      const k = smooth(203.4, 206, t) * (1 - smooth(244, 252, t));
      for (let j = 0; j < 44; j++) {
        const born = 203.6 + j * 0.9, age = songT - born;
        if (age < 0) continue;
        const life = ((age % 20) + 20) % 20, tt = born + 2.5 + (j % 5) * 1.3 + Math.floor(age / 20) * 20;
        if (tt < t - 2 || tt > t + 40) continue;
        const x = (hash(j) < 0.5 ? -1 : 1) * (17 + hash(j + 3) * 50);
        track.ground(tt, x, g);
        const y = 4 + life * 3.6 + 1.2 * Math.sin(life * 0.9 + j), f = (1 - life / 20) * Math.min(1, life * 2);
        T.glow(g.x, y, g.z, 3.4, LANTERN, 1.3 * k * f); T.glow(g.x, y, g.z, 10, LANTERN, 0.12 * k * f);
      }
    }
  }
}
