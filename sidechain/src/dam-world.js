// Don't Anybody Move. Her house on the night of her party, and the party's clock that stops whenever
// she says it. Her street in June, stopped until the band comes in; in at her front door: the
// kitchen (the set list on the fridge, three songs crossed off), the bedroom (shoes off, the coats
// asleep on her bed), the hall (someone crying happy), two strangers wedged in the kitchen doorway;
// the living room, the hum coming up between the floorboards and the dollar lights dark along the
// walls until the match is struck and they catch like a fuse; the chorus danced in this room right
// now tonight. Hands up for the stick-up, the bowl of everyone's car keys. The kitchen again, the
// guy at her sink with his road map; the back yard; the smoke alarm, the good kind; the couple in
// the hallway; the street. The photo in her hallway: in through its cheap frame into a bad flash
// some June, everyone blurry and laughing, her half out of the picture with both hands full; out
// through the brown card on its back; her hallway full of photographs; the last chorus with the
// walls down. At the end, her porch, everyone on the steps, the camera on its tripod on the timer.
// (Her things are in dam-sets.js, her people in dam-crowd.js.)

import * as THREE from 'three';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, box, seeded } from './summer.js';
import { glowAt, poolAt } from './scenery.js';
import { clockAt, heldAt, stopsOf, selfLit } from './dam-sets.js';
import { DamCrowd, DAM_SHIRTS } from './dam-crowd.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AA_GLSL } from './aa.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const LAMP = [1, 0.78, 0.5];
const BULBS = [[1, 0.25, 0.2], [1, 0.8, 0.25], [0.3, 1, 0.45], [0.3, 0.55, 1], [1, 0.4, 0.8], [1, 0.6, 0.2]];
// what she's wearing, in the photograph and on the porch
const HER = [0.08, 0.36, 0.32];
const SHIRTS = DAM_SHIRTS.map((h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; });

// ---------- her house ----------
const ringFlat = (W = 34, H = 30) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const HOUSE = {
  rings: { flat: ringFlat },
  ringOf: () => 'flat',
  styles: { living: 0, hall: 1, kitchen: 2, bedroom: 3, mine: 4, photo: 5 },
  dims: { living: [36, 30], hall: [28, 28], kitchen: [32, 30], bedroom: [30, 28], mine: [28, 28], photo: [40, 36] },
  lights: (id) => ({ 0: [22, 11], 1: [13, 6], 2: [15, 7], 3: [20, 9], 4: [10, 5] }[id] || null),
};

function houseMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLo: { value: new THREE.Color(0x2a1e3a) }, uSkyHi: { value: new THREE.Color(0x060a1e) },
      uHum: { value: 0 }, uCatchA: { value: 1e9 }, uCatchB: { value: -1e9 }, uCatch: { value: -1e9 }, uFlash: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uHum, uCatchA, uCatchB, uCatch, uFlash;
      uniform vec3 uFog, uCam, uLight, uSkyLo, uSkyHi;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      ${AA_GLSL}
      // seams and each board's own tone settle to their average where the boards (qc: their grid, without a
      // row's offset) get down to a few pixels: along the walls the floor shimmered
      float fwm(vec2 qc){ vec2 fw = fwidth(qc); return max(fw.x, fw.y); }
      float edgeF(vec2 q, vec2 qc, float w){ return mix(edge(fract(q), w), 1.0 - 2.0 * w, smoothstep(w, 4.0 * w, fwm(qc))); }
      float toneF(vec2 q, vec2 qc){ return mix(h2(floor(q)), 0.5, smoothstep(0.3, 0.7, fwm(qc))); }
      vec3 bulbCol(float id){ float k = mod(id, 6.0); return k < 1.0 ? vec3(1.0, 0.25, 0.2) : (k < 2.0 ? vec3(1.0, 0.8, 0.25) : (k < 3.0 ? vec3(0.3, 1.0, 0.45) : (k < 4.0 ? vec3(0.3, 0.55, 1.0) : (k < 5.0 ? vec3(1.0, 0.4, 0.8) : vec3(1.0, 0.6, 0.2))))); }
      // the dollar lights along the top of a wall: a wire sagging between hooks, a bulb every 2.4
      // (in the living room they're dark until the match, and catch along the room like a fuse)
      vec3 dollar(float wa, float h, float top, inout vec3 col){
        float u = fract(wa / 12.0), sag = top - 1.7 * (1.0 - (2.0 * u - 1.0) * (2.0 * u - 1.0));
        col *= 1.0 - 0.75 * smoothstep(0.14, 0.0, abs(h - sag));
        float k = wa / 2.4, id = floor(k), fx = (fract(k) - 0.5) * 2.4, dy = h - sag + 0.45;
        float d2 = fx * fx + dy * dy;
        float lit = (vT < uCatchA || vT > uCatchB) ? 1.0 : step(vT, uCatch);
        // about to catch: now and then one flickers
        lit = max(lit, step(0.965, h2(vec2(id, floor(uTime * 9.0)))) * 0.6 * step(uCatchA, vT) * step(vT, uCatchB));
        float tw = 0.72 + 0.28 * sin(uTime * 3.1 + id * 1.9);
        vec3 c = bulbCol(id);
        col = mix(col, c * 0.35, exp(-d2 * 9.0));
        return c * (exp(-d2 * 3.0) * 2.4 + exp(-d2 * 0.22) * 0.3) * tw * lit;
      }
      vec3 paper(int st, float wa, float h){
        if (st == 1 || st == 4) { vec2 dq = fract(vec2(wa / 3.2, h / 3.2) + vec2(0.0, 0.5 * mod(floor(wa / 3.2), 2.0))); float dam = smoothstep(0.34, 0.2, length(dq - 0.5)); return vec3(0.34, 0.46, 0.38) * (1.0 - 0.14 * dam) * (st == 4 ? 1.08 : 1.0); }
        if (st == 3) { vec2 q = fract(vec2(wa / 2.2, h / 2.2)); return vec3(0.58, 0.66, 0.78) * (1.0 - 0.1 * smoothstep(0.22, 0.1, length(q - 0.5))); }
        if (st == 2) return vec3(0.95, 0.9, 0.7);
        return vec3(0.9, 0.72, 0.68) * (1.0 - 0.07 * aaSq(wa / 2.6));
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float wa = part == 6 ? x : (side > 0.0 ? along + 7.0 : along);
        vec3 glow = vec3(0.0); vec3 col;
        if (st == 5) {
          // inside the photograph: a lawn the flash catches near us, the rest black
          if (part == 0) { vec2 q = vec2(x, along) / 1.3; col = vec3(0.32, 0.52, 0.2) * (0.75 + 0.35 * h2(floor(q))) * (1.2 + 0.6 * uFlash); }
          else col = vec3(0.0);
          float d = length(uCam - vW);
          float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col * uLight, uFog, clamp(fog, 0.0, 1.0)), 1.0);
          return;
        }
        if (part == 7) {
          // her house from outside: clapboards, white trim, every window lit with the party
          float y = h;
          col = vec3(0.62, 0.72, 0.8) * (0.88 + 0.12 * smoothstep(0.0, 0.2, fract(y / 1.7)));
          col *= 1.0 - 0.35 * smoothstep(0.1, 0.0, fract(y / 1.7));
          vec2 wq = vec2((x + 13.0) / 26.0, 0.0); float wi = floor(wq.x); float wx = fract(wq.x) * 26.0;
          float row = y < 30.0 ? 0.0 : 1.0; float wy0 = row < 0.5 ? 6.0 : 34.0;
          float win = box2(vec2(wx, y), vec2(7.0, wy0), vec2(19.0, wy0 + 16.0)) * step(13.5, abs(x));
          float frame = win * (1.0 - edge(vec2((wx - 7.0) / 12.0, (y - wy0) / 16.0), 0.07));
          vec3 inside = vec3(1.0, 0.72, 0.42) * (0.85 + 0.3 * h2(vec2(wi, row)));
          // the people in the windows, moving to it (still while everything's stopped)
          float ppl = 0.0;
          for (int k = 0; k < 3; k++) { float px = 9.0 + float(k) * 4.0 + 1.6 * sin(uTime * (1.3 + float(k) * 0.4) + wi * 3.0 + float(k)); vec2 hd = vec2(wx - px, y - (wy0 + 9.5)); ppl = max(ppl, step(length(hd * vec2(1.0, 0.85)), 1.4)); ppl = max(ppl, box2(vec2(wx, y), vec2(px - 2.0, wy0), vec2(px + 2.0, wy0 + 8.6))); }
          inside = mix(inside, inside * 0.25, ppl);
          col = mix(col, inside, win); glow += inside * win * 0.9;
          col = mix(col, vec3(0.95, 0.94, 0.9), clamp(frame, 0.0, 1.0));
          col = mix(col, vec3(0.95, 0.94, 0.9), step(abs(abs(x) - 13.0), 0.7) * step(y, 30.0));
          // the dollar lights along the porch roof
          glow += dollar(x, y, 30.0, col) * 1.2;
          col = mix(col, vec3(0.35, 0.3, 0.32), step(30.0, y) * step(y, 31.2));
          col *= 0.8;
        }
        else if (part == 8) { col = vec3(0.92, 0.9, 0.86); glow += vec3(0.06); }
        else if (part == 0) {
          if (st == 2) { vec2 q = vec2(x, along) / 3.2; col = mix(vec3(0.92, 0.9, 0.86), vec3(0.14, 0.14, 0.16), aaChk(q)) * (0.92 + 0.08 * edgeF(q, q, 0.05)); }
          else if (st == 3) { col = vec3(0.5, 0.52, 0.6) * (0.9 + 0.1 * toneF(vec2(x, along) * 2.0, vec2(x, along) * 2.0)); float rug = step(abs(x), 14.0); col = mix(col, vec3(0.75, 0.45, 0.35), rug * 0.7); }
          else {
            // floorboards; the hum comes up between them
            vec2 pl = vec2(x / 1.6, along / 10.0 + 0.37 * floor(x / 1.6)), plc = vec2(x / 1.6, along / 10.0); float pid = toneF(pl, plc);
            float seam = 1.0 - edgeF(pl, plc, 0.035);
            col = vec3(0.5, 0.33, 0.2) * (0.78 + 0.35 * pid) * (1.0 - 0.35 * seam);
            glow += vec3(1.0, 0.5, 0.16) * seam * uHum * (1.6 + 0.8 * toneF(pl + 7.0, plc));
            if (st == 0) { float rug = step(abs(x), 13.0) * step(0.15, fract(along / 60.0)); col = mix(col, vec3(0.62, 0.2, 0.3) * (0.9 + 0.12 * aaSq(x / 2.0 + along / 2.0)), rug * 0.85); }
            if (st == 1 || st == 4) { float run = step(abs(x), 6.5); col = mix(col, vec3(0.2, 0.28, 0.45), run * 0.8); }
          }
        }
        else if (part == 3) { col = vec3(0.86, 0.84, 0.8) * (0.92 + 0.08 * edgeF(vec2(x / 7.0, along / 7.0), vec2(x / 7.0, along / 7.0), 0.02)); }
        else {
          // walls: paper over a wainscot; windows onto the June night, pictures, the dollar lights along the top
          float H = st == 0 ? 30.0 : 28.0;
          float notCap = part == 6 ? 0.0 : 1.0;
          col = paper(st, wa, h);
          if (st == 2) {
            vec2 tq = vec2(wa / 1.6 + 0.5 * mod(floor(h / 0.8), 2.0), h / 0.8); col = mix(col, vec3(0.93, 0.95, 0.92) * (0.9 + 0.1 * edgeF(tq, vec2(wa / 1.6, h / 0.8), 0.06)), step(h, 13.0));
            // the cupboards up top
            vec2 cq = vec2(fract(wa / 8.0), (h - 16.0) / 9.0); float cab = step(16.0, h) * step(h, 25.0) * notCap;
            col = mix(col, vec3(0.82, 0.78, 0.68) * (0.85 + 0.15 * edge(cq, 0.08)), cab);
            col = mix(col, vec3(0.7, 0.68, 0.6), cab * step(abs(cq.x - 0.85), 0.03) * step(abs(cq.y - 0.15), 0.08));
          } else {
            float wain = step(h, 8.0);
            vec2 pq = vec2(fract(wa / 6.0), h / 8.0); float panel = edge(vec2(pq.x, clamp(pq.y, 0.0, 1.0)), 0.1);
            col = mix(col, vec3(0.9, 0.88, 0.84) * (0.9 + 0.1 * panel), wain);
            col = mix(col, vec3(0.96, 0.94, 0.9), step(abs(h - 8.2), 0.25));
          }
          col = mix(col, vec3(0.95, 0.93, 0.9), step(h, 0.9));
          if (st == 1 || st == 4) {
            // her photographs, all down the hall: cheap frames, the flash in every one
            float per = st == 4 ? 7.0 : 11.0;
            vec2 fv = vec2(mod(wa, per), h); float fid = floor(wa / per);
            float y0 = 11.0 + 5.0 * h2(vec2(fid, 3.0)) * (st == 4 ? 1.0 : 0.5), fw = 4.0 + 1.6 * h2(vec2(fid, 5.0)), fh = 3.2 + 1.4 * h2(vec2(fid, 7.0));
            float fr = notCap * box2(fv, vec2(1.0, y0), vec2(1.0 + fw, y0 + fh));
            float inn = notCap * box2(fv, vec2(1.35, y0 + 0.35), vec2(0.65 + fw, y0 + fh - 0.35));
            vec2 iq = (fv - vec2(1.35, y0 + 0.35)) / vec2(fw - 0.7, fh - 0.7);
            float face = 0.0; for (int k = 0; k < 3; k++) { vec2 c = vec2(0.22 + 0.28 * float(k), 0.55 + 0.1 * sin(fid + float(k))); face = max(face, smoothstep(0.13, 0.05, length((iq - c) * vec2(1.0, 0.8)))); }
            vec3 pic = mix(vec3(0.05, 0.04, 0.03), vec3(1.0, 0.9, 0.8), face) + vec3(0.35, 0.18, 0.1) * h2(vec2(fid, 9.0)) * (1.0 - face) * 0.3;
            col = mix(col, vec3(0.08, 0.07, 0.07), fr); col = mix(col, pic, inn);
            glow += pic * inn * (st == 4 ? 0.55 : 0.3);
          }
          if (st == 0 || st == 3) {
            // windows: the June night out there, the neighbours' windows lit
            float per = 30.0;
            vec2 wv = vec2(mod(wa + 6.0, per) - 6.0, h); float win = notCap * box2(wv, vec2(0.0, 10.0), vec2(11.0, 23.0));
            float frame = win * (1.0 - edge(vec2(wv.x / 11.0, (wv.y - 10.0) / 13.0), 0.06));
            float mull = win * (step(abs(wv.x - 5.5), 0.25) + step(abs(wv.y - 16.5), 0.25));
            vec3 sky = mix(uSkyLo, uSkyHi, clamp((h - 10.0) / 13.0, 0.0, 1.0));
            vec2 cq = vec2(floor(wv.x * 1.2 + floor(wa / per) * 7.0), floor(wv.y * 1.4)); float far = step(0.84, h2(cq)) * step(wv.y, 15.5);
            vec3 glass = sky + vec3(1.0, 0.75, 0.45) * far * 0.8;
            col = mix(col, glass, win); glow += glass * win * 0.5;
            col = mix(col, vec3(0.94, 0.92, 0.88), clamp(frame + mull, 0.0, 1.0));
          }
          if (st != 2) glow += dollar(wa, h, H - 1.2, col) * notCap;
        }
        col *= uLight * 0.74;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the people ----------
// a pose: [right arm out, left arm out, right forward, left forward], [right elbow, left elbow, turn, lean back]
const POSES = {
  crier: [[0.3, 0.3, 1.15, 1.15], [2.35, 2.35, 0, -0.1]],
  hugger: [[0.2, 1.35, 0.2, 0.3], [0.4, 1.1, 0, -0.05]],
  doorA: [[1.25, 0.15, 0.1, 0.8], [0.4, 1.5, 0, 0.04]],
  doorB: [[0.25, 0.25, 0.6, 0.6], [1.9, 1.9, 0, 0]],
  story: [[0.7, 0.15, 1.25, 0.8], [0.7, 1.55, 0.2, 0.06]],
  sink: [[0.55, 0.55, -0.45, -0.45], [0.15, 0.15, 0, 0.16]],
  stunned: [[0.06, 0.06, 0.08, 0.3], [0.1, 0.55, 0, 0]],
  coupleA: [[1.35, 0.15, 0.3, 0.2], [1.15, 0.3, 0, 0]],
  coupleB: [[0.15, 0.6, 0.2, 0.25], [0.3, 0.9, 0, 0]],
  her: [[0.18, 0.18, 0.72, 0.72], [1.45, 1.45, -0.95, 0]],
  // the photograph: laughing, blurred
  cheers: [[2.4, 2.5, 0.3, 0.3], [0.3, 0.3, 0.2, 0.12]],
  doubled: [[0.25, 0.25, 0.95, 0.95], [0.4, 0.4, 0, -0.32]],
  toast: [[0.3, 0.15, 1.2, 0.3], [1.2, 0.5, 0.15, 0.08]],
  arms: [[1.3, 1.3, 0.3, 0.3], [1.0, 1.0, 0, 0.05]],
  // the porch, for the camera
  pose: [[1.3, 1.3, 0.25, 0.25], [1.05, 1.05, 0, 0]],
  peace: [[0.5, 1.3, 1.0, 0.25], [2.1, 1.05, 0, 0.02]],
};
function fig(R, f) {
  return { seed: R(), variant: R() < 0.5 ? 0 : 1, lag: R() * 0.15, tint: SHIRTS[Math.floor(R() * SHIRTS.length)], ...f };
}
// the crowds and the people she sings about, as rows the crowd lays out along the road
function buildRows(crowd, photo, plan) {
  const R = seeded(29);
  for (const c of plan.crowd || []) {
    for (let t = c.from; t < c.to; t += c.every ?? 0.5) {
      const figs = [];
      for (const side of c.side ? [c.side] : [-1, 1]) for (let k = 0; k < (c.n ?? 1); k++) {
        const x = side * (c.x[0] + R() * (c.x[1] - c.x[0])), s = c.s[0] + R() * (c.s[1] - c.s[0]);
        const mode = c.mode === 'dance' ? 0 : (c.mode === 'stand' ? 1 : (R() < 0.65 ? 0 : 1));
        // dancers turned every way; people standing about turned to each other, or to the road
        const rot = mode === 0 ? R() * 6.28 : (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (R() - 0.5) * 2.2;
        figs.push(fig(R, { x, z: (R() - 0.5) * 6, rot, s, mode }));
      }
      crowd.addRow({ t: t + R() * 0.1, ground: !!c.ground, from: c.showFrom, figs });
    }
  }
  const P = (k, x, s, rot, extra = {}) => ({ x, s, rot, mode: 2, pose: POSES[k][0], pose2: POSES[k][1], ...extra });
  for (const p of plan.people || []) {
    const s = p.s ?? 10, x = p.x, side = x > 0 ? 1 : -1, face = side > 0 ? -Math.PI / 2 : Math.PI / 2, gr = !!p.ground;
    const figs = [];
    if (p.kind === 'crier') { figs.push(fig(R, P('crier', x, s, face + 0.3, { variant: 0 }))); figs.push(fig(R, P('hugger', x + side * 0.55 * s, s, face + 0.6, { z: 0.3 * s }))); }
    else if (p.kind === 'strangers') { figs.push(fig(R, P('doorA', x, s, Math.PI / 2 + 0.25))); figs.push(fig(R, P('doorB', -x, s, -Math.PI / 2 - 0.25))); }
    else if (p.kind === 'story') { figs.push(fig(R, P('story', x, s, face + 0.5, { variant: 0 }))); figs.push(fig(R, P('stunned', x + side * 0.9 * s, s, face - 1.2, { mode: 1 }))); }
    else if (p.kind === 'sink') figs.push(fig(R, P('sink', x, s, face + Math.PI + 0.1, { variant: 1, z: 0 })));
    else if (p.kind === 'stunned') figs.push(fig(R, P('stunned', x, s, face + 0.15, { variant: 1, tint: [0.35, 0.3, 0.28] })));
    else if (p.kind === 'couple') { figs.push(fig(R, P('coupleA', x, s, face + 0.4))); figs.push(fig(R, P('coupleB', x + side * 0.42 * s, s, face + 0.4, { variant: 0 }))); }
    else if (p.kind === 'her') figs.push(fig(R, P('her', x, s, p.turn ?? face, { variant: 0, tint: HER, cut: true })));
    (p.photo ? photo : crowd).addRow({ t: p.t, ground: gr, figs });
  }
  // the photograph's crowd: everyone laughing, held, blurred
  for (const c of plan.photoCrowd || []) {
    for (let t = c.from; t < c.to; t += c.every ?? 0.7) {
      const figs = [];
      for (const side of [-1, 1]) for (let k = 0; k < (c.n ?? 2); k++) {
        const kind = ['cheers', 'doubled', 'toast', 'arms'][Math.floor(R() * 4)];
        const x = side * (c.x[0] + R() * (c.x[1] - c.x[0])), s = c.s[0] + R() * (c.s[1] - c.s[0]);
        const blur = R() < 0.7 ? [[(R() - 0.5) * 2.2, (R() - 0.5) * 1.5, 0, (R() - 0.5) * 0.3], [(R() - 0.5) * 4.0, (R() - 0.5) * 2, 0, (R() - 0.5) * 0.5]] : null;
        figs.push(fig(R, P(kind, x, s, (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (R() - 0.5) * 1.2, { z: (R() - 0.5) * 6, ghost: blur })));
      }
      photo.addRow({ t: t + R() * 0.1, figs });
    }
  }
  // the porch: everyone on the steps for the picture, then off dancing once it's taken
  const fz = plan.finale;
  if (fz && fz.group) {
    const g = fz.group, figs = [];
    for (let k = 0; k < g.n; k++) {
      const row = k % 2, col = Math.floor(k / 2) - (g.n / 4 - 0.5);
      const kind = k === 3 ? 'peace' : 'pose';
      figs.push(fig(R, P(kind, fz.x + (g.dx ?? 24) - row * 7, g.s, Math.PI / 2 + (R() - 0.5) * 0.3, { z: col * 6.2 * (g.s / 9), dy: row * 2.6, until: 'snap' })));
    }
    // her, at the end, half out of the picture, hands full, checking the door
    figs.push(fig(R, P('her', fz.x + (g.dx ?? 24) - 9, g.s, Math.PI / 2 + 0.9, { z: (g.n / 4 + 0.6) * 6.2 * (g.s / 9), dy: 2.6, variant: 0, tint: HER })));
    crowd.addRow({ t: fz.t, ground: true, figs });
  }
  crowd.done(); photo.done();
}

// ---------- the end: her porch, everyone on the steps, the camera on the timer ----------
// (the tripod stands on the lawn in front of the steps, a little up the street, turned to them; it
// takes the picture once she's stopped and the card is up: the timer's light faster and faster, the
// click, the flash, and everyone on the steps lets go of the pose)
const CAMX = -7, CAMZ = 18, CAMYAW = Math.atan2(0 - CAMX, 10 - CAMZ), SNAP = 4.6;
export class DamFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -40;
    this.group = new THREE.Group(); scene.add(this.group);
    const parts = [], WH = rgb(0xf2eee6), SID = rgb(0xa8bccc);
    // the house: two floors, clapboard blue, white trim, the porch across the front, steps down
    parts.push(paint(box(30, 20, 18, 0, 10, -6), SID));
    const roof = new THREE.CylinderGeometry(0.1, 19, 10, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1.15, 1, 0.75); roof.translate(0, 25, -6); parts.push(paint(roof, rgb(0x3a2a2e)));
    parts.push(paint(box(30, 0.8, 7, 0, 3.4, 6.5), rgb(0x8a7a6a)), paint(box(31, 0.6, 7.6, 0, 9.8, 6.6), WH));
    for (const x of [-14.5, -5, 5, 14.5]) parts.push(paint(box(0.7, 6.4, 0.7, x, 6.6, 9.6), WH));
    for (let k = 0; k < 4; k++) parts.push(paint(box(10, 0.85, 1.6, 0, 3.0 - k * 0.85, 10.6 + k * 1.6), rgb(0x9a8a7a)));
    for (const x of [-10, 10]) parts.push(paint(box(9, 0.4, 0.3, x, 6.0, 9.8), WH), paint(box(9, 0.3, 0.3, x, 4.4, 9.8), WH));
    // the door standing open, the hall's light behind it; the windows
    parts.push(paint(box(4.6, 7.4, 0.3, 0, 7.6, 3.05), rgb(0xfff0d0)), paint(box(0.4, 7.8, 0.6, -2.5, 7.7, 3.1), WH), paint(box(0.4, 7.8, 0.6, 2.5, 7.7, 3.1), WH), paint(box(5.4, 0.5, 0.6, 0, 11.6, 3.1), WH));
    parts.push(paint(box(0.3, 7.2, 4.2, -2.4, 7.6, 5.2), rgb(0x8a3a2a)));
    for (const [x, y] of [[-10, 7.4], [10, 7.4], [-9, 16], [0, 16], [9, 16]]) parts.push(paint(box(5, 4.6, 0.3, x, y, 3.06), rgb(0xffd890)), paint(box(5.6, 0.4, 0.4, x, y - 2.5, 3.1), WH));
    // the camera on its tripod at the curb, turned to them
    const cam = [paint(box(1.6, 1.0, 1.0, 0, 5.4, 0), rgb(0xb8bcc4)), paint(box(1.64, 0.3, 1.04, 0, 5.05, 0), rgb(0x2a2a2e)), paint(cyl(0.38, 0.42, 0.9, 16, 0, 5.4, 0.85).rotateX(Math.PI / 2), rgb(0x1a1a1e)), paint(box(0.7, 0.5, 0.5, 0.3, 6.15, 0), rgb(0xf2f0ec))];
    for (const a of [0, 2.1, 4.2]) cam.push(paint(cyl(0.07, 0.07, 5.4, 6, Math.sin(a) * 0.9, 2.5, Math.cos(a) * 0.9).rotateX(Math.cos(a) * 0.18).rotateZ(-Math.sin(a) * 0.18), rgb(0x9a9ea6)));
    const camGeo = merge(cam); camGeo.rotateY(CAMYAW); camGeo.translate(CAMX, 0, CAMZ);
    parts.push(camGeo);
    this.house = new THREE.Mesh(merge(parts), selfLit({ roughness: 0.7 }, 0.12)); this.group.add(this.house);
    this.group.scale.setScalar(cfg.s ?? 3);
    // the dollar lights along the porch roof
    this.bulbs = []; for (let k = 0; k < 34; k++) { const u = k / 33; this.bulbs.push([-15.5 + u * 31, 9.4 - 0.7 * Math.sin(u * Math.PI * 4) ** 2, 10.1, BULBS[k % BULBS.length]]); }
    this.fired = false; this.endClock = 0; this.snapped = false;
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    this._lamp = new THREE.Vector3(0.3, 6.15, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), CAMYAW).add(new THREE.Vector3(CAMX, 0, CAMZ));
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt = 0) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.yawAt(this.t) + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 3, T = rider.t, w = this._w, mw = this.group.matrixWorld;
    for (const [x, y, z, c] of this.bulbs) { w.set(x, y, z).applyMatrix4(mw); S.glow(w.x, w.y, w.z, 0.9 * s, c, 0.95); }
    w.set(0, 7.6, 3.6).applyMatrix4(mw); S.glow(w.x, w.y, w.z, 6 * s, LAMP, 0.5); S.pool(w.x, 0.2, w.z, 12 * s, LAMP, 0.5);
    // the porch light reaching the lawn where the tripod stands
    w.set(CAMX, 0, CAMZ).applyMatrix4(mw); S.pool(w.x, 0.2, w.z, 9 * s, LAMP, 0.4);
    for (const [x, y] of [[-10, 7.4], [10, 7.4], [-9, 16], [0, 16], [9, 16]]) { w.set(x, y, 3.4).applyMatrix4(mw); S.glow(w.x, w.y, w.z, 3.2 * s, LAMP, 0.35); }
    // the self-timer's light on the camera, slow while she comes in, faster and faster once she's stopped
    if (rider.stopping) this.endClock += dt;
    w.copy(this._lamp).applyMatrix4(mw);
    if (!this.snapped) {
      this._blink = (this._blink || 0) + dt * (rider.stopping ? 1.2 + 5 / Math.max(0.35, SNAP - this.endClock) : 1.0);
      if (T > this.t - 14 && this._blink % 1 < 0.3) S.glow(w.x, w.y, w.z, 0.55 * s, [1, 0.1, 0.06], 1.8);
      if (this.endClock >= SNAP) {
        // the picture: the click and the flash
        this.snapped = true; this.snapAt = this.endClock; S.damSnap = true;
        const L = typeof window !== 'undefined' && window.__LC;
        if (L && L.sound && L.sound.shutter) L.sound.shutter(0.6);
        if (L && L.S) L.S.flash = Math.max(L.S.flash || 0, 0.55);
      }
    } else {
      const k = Math.exp(-(this.endClock - this.snapAt) * 2.6);
      if (k > 0.01) { S.glow(w.x, w.y, w.z, 16 * s * k + 2, [1, 0.98, 0.94], 3 * k); w.set(0, 3, 11).applyMatrix4(mw); S.pool(w.x, 0.2, w.z, 34 * s, [1, 0.98, 0.94], 1.3 * k); }
    }
  }
}

// ---------- the place, per frame ----------
export class DamWorld {
  constructor(scene, S) {
    this.S = S;
    const plan = S.plan;
    prepare(S.course, plan);
    this.stops = stopsOf(plan);
    this.mat = houseMaterial();
    this.rooms = (plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HOUSE));
    this.crowd = new DamCrowd(scene, S.course, plan, 700, false);
    this.photo = new DamCrowd(scene, S.course, plan, 160, true);
    buildRows(this.crowd, this.photo, plan);
    this.arms = plan.handsUp || [];
    this.hum = plan.hum || [];
    this.catchAt = plan.catchAt ?? 1e9;
    this.dark = plan.dark || [1e9, -1e9];
    this.photoSpan = plan.photoSpan || [1e9, -1e9];
    this.st = { clock: 0, beat: 0, arms: 0, jump: 0, top: new THREE.Color(), below: new THREE.Color(), amb: new THREE.Color(), rim: new THREE.Color(), flash: 0, ahead: 15 };
    this.stP = { ...this.st, top: new THREE.Color(), below: new THREE.Color(), amb: new THREE.Color(), rim: new THREE.Color(), flash: 1, ahead: 18 };
    this._g = new THREE.Vector3(); this._c = new THREE.Color();
    this.armsK = 0;
  }
  update(S, dt, camera, time) {
    const T = S.rider.t, P = S.P, c = S.course;
    const stops = this.stops;
    const clock = clockAt(stops, T), held = heldAt(stops, T);
    const beat = c.beatAt(held);
    // the room
    const u = this.mat.uniforms;
    u.uTime.value = clock; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyLo.value.set(P.horizon); u.uSkyHi.value.set(P.zenith);
    // the hum under the floorboards: on the kick, louder toward the chorus
    let hum = 0;
    for (const [a, b] of this.hum) if (T > a - 0.5 && T < b + 0.4) hum = Math.max(hum, smooth(a - 0.5, a + 1.5, T) * (1 - smooth(b, b + 0.4, T)) * (0.35 + 0.65 * smooth(a, b, T)));
    const kick = Math.pow(1 - (beat % 1), 2.5);
    u.uHum.value = hum * (0.45 + 0.55 * kick) * (held === T ? 1 : 0.5);
    // the dollar lights: dark in the living room until the match, then they catch along it like a fuse
    u.uCatchA.value = this.dark[0]; u.uCatchB.value = this.dark[1];
    u.uCatch.value = T < this.catchAt ? -1e9 : this.catchAt + (T - this.catchAt) * 7;
    const inPhoto = T > this.photoSpan[0] - 0.4 && T < this.photoSpan[1] + 0.2;
    u.uFlash.value = inPhoto ? 1 : 0;
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    // the people
    let up = 0; for (const [a, b] of this.arms) if (T > a && T < b) up = 1;
    this.armsK += (up - this.armsK) * Math.min(1, dt * (up > this.armsK ? 9 : 4));
    if (held !== T) this.armsK = this.armsK;
    const sec = c.sectionAt(held);
    const jump = S.town.damSnap ? 1 : (sec.kind === 'chorus' || sec.kind === 'final' ? 1 : (sec.kind === 'post' ? 0.6 : 0));
    const st = this.st;
    st.clock = clock; st.beat = beat; st.arms = this.armsK; st.jump = jump;
    const k = (P.hemiK ?? 1.8) / 1.8;
    st.top.set(P.skyLight ?? 0xffffff).multiplyScalar(0.62 * k);
    st.below.set(P.bounce ?? 0x3a2a2a).multiplyScalar(0.55);
    st.amb.set(P.fog).multiplyScalar(0.5).add(this._c.set(P.skyLight ?? 0xffffff).multiplyScalar(0.08));
    st.rim.set(P.glow ?? 0xffa860).multiplyScalar(0.45);
    this.crowd.update(S, camera, st);
    const sp = this.stP;
    sp.clock = clock; sp.beat = beat; sp.arms = 0; sp.jump = 0;
    sp.top.setRGB(0.6, 0.58, 0.56); sp.below.setRGB(0.1, 0.09, 0.08); sp.amb.setRGB(0.02, 0.02, 0.02); sp.rim.setRGB(0.08, 0.07, 0.06);
    this.photo.update(S, camera, sp);
  }
  // the ceiling lights
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible || r.style === 5) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 1.2, g.z, 7, LAMP, 0.85); T.pool(g.x, fy + 0.08, g.z, 30, LAMP, 0.26); }
    }
  }
}
