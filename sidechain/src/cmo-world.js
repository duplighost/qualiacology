// CUT ME OFF. The Corner Bar on its last night before it changes hands. The street in the rain, the
// neon, LIVE MUSIC dying in the window, the jukebox that's replacing her crated at the curb; in at
// the door on last call: the bell, the back bar lit bottle by bottle, the regulars' drinks along the
// bar, UNDER NEW MANAGEMENT across the room, her corner with the mic stand and the jukebox lit on
// the stage where she sang, the register, the pool table while the meter eats the quiet parts
// (the lights go out between the beats). Every chorus bursts through the gold tinsel at the back
// into the stage as big as she sings it: the cut in the floor, the tab stamped CLOSED, the faders
// pushed up, the blinders, her kiss on the mic, ENCORE switched off. The second verse is out in the
// rain with her mic stand on the curb; back in to the house bands on the wall and the pour; after
// the second chorus the house lights come up: chairs on the tables, cables coiled, the stairs, the
// tabs left open, every band carried out the back door singing; her last quarter on the bar. The
// last chorus is cut off mid-word, then it all goes down blinding in a rain of quarters, and at the
// very end the lights cut out on the beat and only the jukebox is left, lit, where she stood.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, col, signV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import { AA_GLSL } from './aa.js';
import { PROP, STAGE, AFTER, GHOST, merge, stripsTexture, tabTexture, bandsTexture, crateTexture, tipTexture, setlistTexture, WALNUT } from './cmo-props.js';
import { paint, rgb, seeded, box } from './summer.js';
import { ALBUM } from './album.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const AMBER = [1, 0.7, 0.36], WARM = [1, 0.84, 0.6], GOLD = [1, 0.78, 0.3], WHITE = [1, 0.97, 0.9], RED = [1, 0.16, 0.12], PINK = [1, 0.3, 0.55], TEAL = [0.3, 0.9, 1], TUBE = [0.82, 1, 0.86], GHOSTC = [0.55, 0.75, 1], CANDLE = [1, 0.32, 0.2];

// ---------- when the bar's own lights are on ----------
// Last call blinks them twice; while the meter eats the quiet parts they only come on with the
// beat; they go out for the stop when you call it, for the cut, and for good on the last beat.
export function barLamp(course, T) {
  let k = 1;
  if (T > 13.2 && T < 13.86 && (T < 13.36 || (T > 13.55 && T < 13.7))) k = 0.06;
  if (T > 34.85 && T < 37.6) { const f = course.beatAt(T) % 1; k *= 0.28 + 0.72 * Math.exp(-f * 4); }
  if (T > 79.3 && T < 80.55) k *= 0.05;
  if (T > 148.95 && T < 150.37) k *= 0.25;
  if (T > 168.9 && T < 170.27) k *= 0.04;
  if (T > 191.85) k = 0;
  return k;
}
// the house lights after close: they flicker before they come all the way up
function houseLamp(T) {
  let k = smooth(118.9, 121.6, T);
  if (T > 140.4 && T < 142.4) k *= (Math.sin(T * 47) > 0.2 || Math.sin(T * 13.7) > 0.6) ? 1 : 0.15;
  if (T > 142.4) k *= 1.25;
  return k;
}

// ---------- the room: the bar, its stage, and the bar after close ----------
// The bar's outline has the counter in it: up its back, across its top, down its front.
const RINGS = {
  bar: (W = 36, H = 34) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-25, 0, 1, 0],
    [-25, 0, 1, 4], [-25, 9.6, 1, 4],
    [-25, 9.6, 1, 5], [-21.3, 9.9, 1, 5], [-17.6, 9.6, 1, 5],
    [-17.6, 9.6, 1, 10], [-17.6, 0, 1, 10],
    [-17.6, 0, 1, 0], [-8, 0, 1, 0], [0, 0, 1, 0], [8, 0, 1, 0], [20, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
  stage: (W = 40, H = 50) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-26, 0, 1, 0], [-13, 0, 1, 0], [0, 0, 1, 0], [13, 0, 1, 0], [26, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
  ],
};
const BAR = {
  rings: RINGS,
  ringOf: (s) => (s === 'stage' ? 'stage' : 'bar'),
  styles: { bar: 0, stage: 1, after: 2 },
  dims: { bar: [36, 34], stage: [40, 50], after: [36, 34] },
  lights: (id) => (id === 1 ? null : [22, 8]),
};

function barMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLamp: { value: 1 }, uHouse: { value: 0 }, uBeat: { value: 0 }, uGoldK: { value: 1 }, uDark: { value: 0 },
      uGaps: { value: new THREE.Vector4(-1e5, -1e5, -1e5, -1e5) }, tBands: { value: null }, uRain: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLamp, uHouse, uBeat, uGoldK, uDark, uRain; uniform vec3 uFog, uCam, uLight; uniform vec4 uGaps; uniform sampler2D tBands;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      // inside (d > 0) or out, blended over the pixel (w: a pixel's size in d's units)
      float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
      const vec3 GOLD = vec3(1.0, 0.72, 0.26);
      // gold tinsel: a curtain of thin strands, swaying, each catching the light its own way
      vec3 tinsel(float along, float h, float H){
        float sway = (sin(h * 0.11 + uTime * 1.4 + along * 0.045) * 0.7 + sin(uTime * 0.8 + along * 0.13) * 0.4) * (h / H);
        float u = (along + sway * 3.0) / 0.42;
        float id = floor(u);
        float w = clamp(fwidth(u) * 0.9, 0.0, 1.0);
        float glint = pow(max(0.0, sin(uTime * 2.3 + id * 1.93 + h * 0.31)), 10.0);
        float strand = mix(0.35 + 0.65 * h1(id) + glint * 2.4, 0.78, w) * (0.85 + 0.15 * sin(fract(u) * 6.28));
        float sweep = exp(-pow(mod(along - uTime * 38.0, 150.0) - 75.0, 2.0) / 140.0);
        float hang = smoothstep(H, H * 0.45, h);
        vec3 c = GOLD * strand * (0.28 + 0.62 * hang) * (0.7 + 0.6 * uBeat) + vec3(1.0, 0.85, 0.5) * sweep * 1.3 * hang;
        c += GOLD * exp(-h / 2.6) * 1.1;
        return c * uGoldK;
      }
      // red brick with dark mortar
      vec3 brick(vec2 q){
        vec2 b = vec2(q.x / 2.4 + 0.5 * mod(floor(q.y / 0.9), 2.0), q.y / 0.9);
        float m = 1.0 - edge(fract(b), 0.07);
        return mix(vec3(0.34, 0.13, 0.09) * (0.75 + 0.4 * h2(floor(b))), vec3(0.16, 0.13, 0.12), m);
      }
      // a neon martini glass and a neon note, painted on the brick between the photographs
      float neon(vec2 p, float which){
        float d;
        if (which < 0.5) { d = min(min(seg(p, vec2(-3.0, 3.0), vec2(3.0, 3.0)), min(seg(p, vec2(-3.0, 3.0), vec2(0.0, 0.0)), seg(p, vec2(3.0, 3.0), vec2(0.0, 0.0)))), min(seg(p, vec2(0.0, 0.0), vec2(0.0, -3.0)), seg(p, vec2(-1.8, -3.0), vec2(1.8, -3.0)))); d = min(d, abs(length(p - vec2(0.9, 2.0)) - 0.55)); }
        else { d = min(abs(length((p - vec2(-1.2, -2.2)) * vec2(1.0, 1.35)) - 1.0), seg(p, vec2(-0.2, -2.2), vec2(-0.2, 3.0))); d = min(d, seg(p, vec2(-0.2, 3.0), vec2(1.8, 1.6))); d = min(d, seg(p, vec2(1.8, 1.6), vec2(1.6, 0.4))); }
        return exp(-d * d / 0.03) + 0.35 * exp(-d * d / 0.8);
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        vec3 col = vec3(0.0), glow = vec3(0.0);
        float lit = 0.22 + 0.78 * uLamp;
        if (st == 1) {
          // ---- the stage: black boards, tape marks, the footlights; gold tinsel all round ----
          if (part == 0) {
            vec2 q = vec2(x / 1.4, along / 12.0);
            col = vec3(0.025, 0.022, 0.02) * (0.85 + 0.3 * h2(floor(q)));
            vec2 c = vec2(x, along) / 9.0; vec2 cf = fract(c) - 0.5; float mark = step(0.86, h2(floor(c)));
            float tape = mark * (step(abs(cf.x), 0.02) * step(abs(cf.y), 0.11) + step(abs(cf.y), 0.02) * step(abs(cf.x), 0.11));
            col = mix(col, mix(vec3(0.9, 0.85, 0.2), vec3(0.85), step(0.93, h2(floor(c) + 7.0))), clamp(tape, 0.0, 1.0));
            float wall = smoothstep(26.0, 39.0, abs(x));
            glow += GOLD * wall * 0.22 * uGoldK * (0.7 + 0.5 * uBeat);
            float bulb = smoothstep(0.55, 0.2, length(vec2(abs(x) - 38.2, mod(along, 3.2) - 1.6)));
            glow += vec3(1.0, 0.8, 0.45) * bulb * 2.2 * uGoldK;
            // the floor opens under the cut: a pit, its rim lit
            float inGap = max(step(uGaps.x, vT) * step(vT, uGaps.y), step(uGaps.z, vT) * step(vT, uGaps.w));
            float rim = max(exp(-pow((vT - uGaps.x) * 9.0, 2.0)) + exp(-pow((vT - uGaps.y) * 9.0, 2.0)), exp(-pow((vT - uGaps.z) * 9.0, 2.0)) + exp(-pow((vT - uGaps.w) * 9.0, 2.0)));
            col *= 1.0 - inGap; glow *= 1.0 - inGap * 0.9;
            glow += GOLD * rim * 1.6 * uGoldK;
          } else {
            float H = 50.0;
            float a = part == 6 ? x * 1.3 + along : (x < 0.0 ? along : along + 0.21);
            glow += tinsel(a, h, H);
            col = vec3(0.05, 0.035, 0.02);
          }
          glow *= 0.08 + 0.92 * uLamp;
        } else {
          // ---- the bar (and the bar after close, under the house lights) ----
          if (part == 0) {
            vec2 pl = vec2(x / 1.8, along / 11.0 + 0.37 * floor(x / 1.8));
            col = vec3(0.2, 0.11, 0.06) * (0.7 + 0.4 * h2(floor(pl))) * (0.86 + 0.14 * edge(fract(pl), 0.03));
            float sheen = exp(-pow(mod(along - 8.0 + 11.0, 22.0) - 11.0, 2.0) / 14.0) * exp(-x * x / 260.0);
            glow += vec3(1.0, 0.62, 0.3) * sheen * 0.22 * uLamp * (1.0 - uHouse);
            glow += vec3(0.85, 0.95, 0.9) * sheen * 0.12 * uHouse;
          }
          else if (part == 3) {
            vec2 q = vec2(x, along) / 3.2; vec2 f = fract(q);
            float rim = 1.0 - edge(f, 0.1); float med = smoothstep(0.26, 0.2, length(f - 0.5)) - smoothstep(0.16, 0.1, length(f - 0.5)) * 0.6;
            col = vec3(0.22, 0.17, 0.12) * (0.75 + 0.45 * rim + 0.35 * med);
          }
          else if (part == 4) col = vec3(0.1, 0.06, 0.04);
          else if (part == 5) {
            col = vec3(0.17, 0.08, 0.04) * (0.9 + 0.1 * sin(along * 0.9 + x));
            glow += vec3(1.0, 0.7, 0.4) * exp(-pow(mod(along, 22.0) - 11.0, 2.0) / 8.0) * 0.18 * uLamp;
            glow += vec3(0.9, 0.62, 0.25) * smoothstep(-18.3, -17.7, x) * 0.5 * lit;
          }
          else if (part == 10) {
            float pan = edge(vec2(fract(along / 4.4), clamp((h - 2.4) / 6.0, 0.0, 1.0)), 0.12) * step(2.4, h);
            col = vec3(0.13, 0.065, 0.035) * (0.8 + 0.35 * pan);
            float rail = exp(-pow((h - 1.7) * 4.0, 2.0));
            col = mix(col, vec3(0.75, 0.55, 0.22), clamp(rail * 1.4, 0.0, 1.0)); glow += vec3(1.0, 0.7, 0.3) * rail * 0.35 * lit;
          }
          else if (part == 1) {
            // the back bar: brick above, the mirror and the shelves of lit bottles
            col = brick(vec2(along, h)) * 0.8;
            if (h > 10.0 && h < 27.5) {
              col = vec3(0.03, 0.03, 0.035) + vec3(0.12, 0.08, 0.06) * smoothstep(27.5, 10.0, h);
              for (int s = 0; s < 3; s++) {
                float base = 11.2 + float(s) * 5.2;
                float shelf = aaBand(h, base - 0.175, 0.175);
                col = mix(col, vec3(0.18, 0.1, 0.05), shelf); glow += vec3(1.0, 0.75, 0.45) * exp(-pow((h - base - 0.15) * 5.0, 2.0)) * 0.5 * lit;
                float cw = 1.7, cell = floor(along / cw), fx = fract(along / cw);
                float hh = 2.4 + 1.9 * h1(cell * 3.1 + float(s) * 17.0);
                float hb = h - base;
                // (each bottle's edges blended over the pixel, and the row settling to its average glow
                // where the bottles get down to a few pixels: drawn hard they sparkled along the wall)
                float ax = fwidth(along / cw), ah = fwidth(h);
                float body = covP(0.3 - abs(fx - 0.5), ax) * covP(hb, ah) * covP(hh * 0.68 - hb, ah);
                float shoulder = covP(hb - hh * 0.68, ah) * covP(hh * 0.8 - hb, ah) * covP(0.3 - (hb - hh * 0.68) / (hh * 0.12) * 0.18 - abs(fx - 0.5), ax);
                float neck = covP(0.09 - abs(fx - 0.5), ax) * covP(hb - hh * 0.8, ah) * covP(hh - hb, ah);
                float b = clamp(body + shoulder + neck, 0.0, 1.0) * step(0.18, h1(cell + float(s) * 5.0));
                float far = smoothstep(0.12, 0.35, ax);
                b = mix(b, 0.42 * covP(hb, ah) * covP(3.2 - hb, ah), far);
                float k = h1(cell * 7.3 + float(s));
                vec3 bc = k < 0.35 ? vec3(0.95, 0.55, 0.15) : (k < 0.55 ? vec3(0.25, 0.75, 0.3) : (k < 0.75 ? vec3(0.85, 0.9, 1.0) : (k < 0.88 ? vec3(0.3, 0.45, 1.0) : vec3(0.9, 0.2, 0.25))));
                bc = mix(bc, vec3(0.7, 0.6, 0.47), far);
                col = mix(col, bc * 0.3, b); glow += bc * b * (0.55 + 0.45 * smoothstep(hh * 0.68, 0.0, hb)) * 0.9 * lit;
              }
            }
            if (h < 10.0) col = vec3(0.12, 0.06, 0.035);
          }
          else if (part == 2) {
            // paneling to the rail, brick above, the house bands in their frames, the neon between
            col = brick(vec2(along, h));
            if (h < 9.0) { float pan = edge(vec2(fract(along / 5.0), clamp((h - 1.0) / 7.0, 0.0, 1.0)), 0.1); col = vec3(0.14, 0.07, 0.04) * (0.8 + 0.3 * pan); }
            col = mix(col, vec3(0.3, 0.16, 0.08), exp(-pow((h - 9.2) * 2.5, 2.0)));
            float per = 44.0, pa = mod(along, per);
            vec2 fr = vec2(pa - 4.0, h - 13.0);
            float frame = box2(fr, vec2(0.0, 0.0), vec2(36.0, 10.0));
            float pic = box2(fr, vec2(0.6, 0.6), vec2(35.4, 9.4));
            col = mix(col, vec3(0.05, 0.03, 0.02), frame);
            vec3 bands = texture2D(tBands, vec2((fr.x - 0.6) / 34.8, (fr.y - 0.6) / 8.8)).rgb;
            col = mix(col, bands * 0.75, pic); glow += bands * pic * 0.18 * lit;
            float which = step(0.5, h1(floor((along + per * 0.5) / per)));
            vec2 np = vec2(mod(along + per * 0.5, per) - per * 0.5, h - 18.0) * vec2(1.0, 1.0) / 1.6;
            vec3 nc = which < 0.5 ? vec3(1.0, 0.25, 0.55) : vec3(0.3, 0.9, 1.0);
            float n = neon(np, which) * step(abs(np.x), 5.0) * step(abs(np.y), 5.0);
            col = mix(col, nc * 0.3, clamp(n, 0.0, 1.0) * 0.5); glow += nc * n * 1.2 * (0.15 + 0.85 * uLamp);
          }
          else if (part == 6) {
            // the end wall is the stage's: gold tinsel round the opening
            glow += tinsel(x * 1.3, h, 34.0) * (0.25 + 0.75 * uLamp); col = vec3(0.05, 0.035, 0.02);
          }
          else if (part == 7) {
            // the front of the bar from the street: brick, the big windows lit, neon round them
            col = brick(vec2(x, h)) * 0.75;
            float ax = abs(x);
            vec2 wq = vec2(ax - 17.0, h - 6.0);
            float win = box2(wq, vec2(0.0, 0.0), vec2(34.0, 22.0));
            float mull = win * (step(abs(mod(wq.x, 11.33) - 5.66), 0.3) + step(abs(wq.y - 15.0), 0.3));
            vec3 inside = vec3(1.0, 0.6, 0.3) * (0.5 + 0.5 * smoothstep(0.0, 22.0, wq.y)) * (0.7 + 0.3 * h2(floor(vec2(wq.x / 2.0, 3.0))));
            float bott = step(abs(fract(wq.x / 1.7) - 0.5), 0.2) * step(wq.y, 4.0 + 3.0 * h1(floor(wq.x / 1.7))) * step(0.5, wq.y);
            inside = mix(inside, vec3(0.08, 0.04, 0.02), bott);
            col = mix(col, inside * 0.4, win); glow += inside * win * 0.9 * (1.0 - clamp(mull, 0.0, 1.0));
            float nb = exp(-pow(min(min(abs(wq.x), abs(wq.x - 34.0)), 99.0) * 2.2, 2.0)) * step(-0.5, wq.y) * step(wq.y, 22.5) + exp(-pow(min(abs(wq.y), abs(wq.y - 22.0)) * 2.2, 2.0)) * step(-0.5, wq.x) * step(wq.x, 34.5);
            glow += vec3(1.0, 0.25, 0.5) * nb * 1.4;
            col = mix(col, vec3(0.04, 0.02, 0.02), box2(vec2(ax, h), vec2(0.0, 30.0), vec2(30.0, 40.0)));
          }
          else if (part == 8) { col = vec3(0.1, 0.06, 0.035); float bulb = smoothstep(0.42, 0.18, length(fract(vec2(x, h) / 2.2) - 0.5)); glow += vec3(1.0, 0.78, 0.45) * bulb * (0.5 + 0.5 * step(0.5, fract(floor((x + h) / 2.2) / 3.0 + uTime * 2.0))) * 1.6 * (0.2 + 0.8 * uLamp); }
          // after close the house lights: flat, cold, every scuff showing
          vec3 house = vec3(0.86, 0.96, 0.88);
          col *= mix(vec3(1.0), house * 1.25, uHouse);
          col *= uLight * lit;
          glow *= mix(1.0, 0.55, uHouse);
        }
        col += glow;
        col *= 1.0 - 0.97 * uDark;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the lit things' materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
// the jukebox's lights: the arch's colours running round it, bubbles going up the tubes
export function jukeLight(kind, instanced = true) {
  return new THREE.ShaderMaterial({
    defines: instanced ? { INST: 1 } : {},
    uniforms: { uTime: { value: 0 }, uK: { value: 1 } },
    vertexColors: true,
    vertexShader: /* glsl */`
      varying vec3 vCol; varying vec3 vP; varying float vK;
      #ifdef INST
      attribute float aK;
      #endif
      void main(){
        vCol = color; vP = position;
        vec4 lp = vec4(position, 1.0);
        #ifdef INST
        vK = aK; lp = instanceMatrix * lp;
        #else
        vK = 1.0;
        #endif
        gl_Position = projectionMatrix * (modelViewMatrix * lp);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uK; varying vec3 vCol; varying vec3 vP; varying float vK;
      vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        float k = vK * uK;
        vec3 c;
        ${kind === 0 ? `float a = atan(vP.y - 13.0, vP.x) / 3.14159;
        c = mix(vCol, hue(a * 0.6 - uTime * 0.18) * 0.8 + 0.25, 0.6);` : `float b = fract(vP.y * 0.42 - uTime * 0.7 + (vP.x > 0.0 ? 0.37 : 0.0));
        float bub = smoothstep(0.07, 0.0, abs(b - 0.06)) + 0.6 * smoothstep(0.05, 0.0, abs(b - 0.42));
        c = vCol * (0.75 + 0.25 * sin(vP.y * 0.9 - uTime * 2.0)) + vec3(1.0, 0.95, 0.8) * bub;`}
        gl_FragColor = vec4(c * (0.08 + 2.1 * k), 1.0);
      }`,
  });
}
// the ghosts' gear: light at the edges, nothing in the middle, going through everything
function ghostMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`attribute float aK; varying vec3 vN; varying vec3 vV; varying float vK; varying float vY;
      void main(){ vK = aK; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vY = position.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vK; varying float vY;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float near = smoothstep(22.0, 70.0, length(vV)); float a = (0.05 + pow(f, 2.2) * 0.8) * vK * near * (0.8 + 0.2 * sin(vY * 1.6 - uTime * 4.0)); a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; gl_FragColor = vec4(vec3(0.55, 0.75, 1.0) * a, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
// lamp faces that flash (the blinders): how bright is per lamp
function flashMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */`attribute float aK; varying float vK; void main(){ vK = aK; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`,
    fragmentShader: /* glsl */`varying float vK; void main(){ gl_FragColor = vec4(vec3(1.0, 0.94, 0.8) * (0.06 + 3.2 * vK), 1.0); }`,
    side: THREE.DoubleSide,
  });
}

let TEX = null;
const tex = () => TEX || (TEX = { strips: stripsTexture(ALBUM.map((e) => e.title)), tab: tabTexture(), bands: bandsTexture(), crate: crateTexture(), tip: tipTexture(), setlist: setlistTexture() });
const KV = { aK: 0 };
const kv = (k) => { KV.aK = k; return KV; };

// ---------- the pieces, registered ----------
const lightbox = () => merge([paint(box(18.6, 6.6, 2.0, 0, 0, -1.1), rgb(0x0e0c10)), paint(box(0.6, 0.6, 9, -6, 0, -6), rgb(0x3a3c44)), paint(box(0.6, 0.6, 9, 6, 0, -6), rgb(0x3a3c44))]);
extend({
  layers: {
    cmoStool: (M) => [PROP.stool(), VCm(M, 'cmoStoolM', 0.12, { roughness: 0.35, metalness: 0.4 }), 220, {}],
    cmoBooth: (M) => [PROP.booth(), VCm(M, 'cmoBoothM', 0.12, { roughness: 0.6 }), 70, {}],
    cmoCandle: (M) => [PROP.boothCandle(), VCm(M, 'cmoCandleM', 1.6, { roughness: 0.3 }), 70, {}],
    cmoBellBracket: (M) => [PROP.bellBracket(), VCm(M, 'cmoBrassM', 0.25, { roughness: 0.3, metalness: 0.7 }), 2, {}],
    cmoBell: (M) => [PROP.bell(), VCm(M, 'cmoBrassM', 0.25, { roughness: 0.3, metalness: 0.7 }), 2, {}],
    cmoDrinks: (M) => [merge([...[0, 1, 2, 3, 4, 5, 6].map((k) => PROP.glass(k).translate(0, 0.08, -15 + k * 5)), ...[0, 1, 2, 3, 4, 5, 6].map((k) => PROP.coaster().translate(0, 0, -15 + k * 5))]), VCm(M, 'cmoDrinksM', 0.5, { roughness: 0.15, side: THREE.DoubleSide }), 3, {}],
    cmoRocks: (M) => [PROP.glass(0), VCm(M, 'cmoDrinksM', 0.5, { roughness: 0.15, side: THREE.DoubleSide }), 3, {}],
    cmoBottle: (M) => [PROP.bottle(), VCm(M, 'cmoBottleM', 0.5, { roughness: 0.1 }), 3, {}],
    cmoStream: (M) => [PROP.stream(), VCm(M, 'cmoStreamM', 1.4, { roughness: 0.2 }), 3, {}],
    cmoRegister: (M) => [PROP.register(), VCm(M, 'cmoBrassM', 0.25, { roughness: 0.3, metalness: 0.7 }), 3, {}],
    cmoDrawer: (M) => [PROP.drawer(), VCm(M, 'cmoBrassM', 0.25, { roughness: 0.3, metalness: 0.7 }), 3, {}],
    cmoFlag: (M) => [PROP.flag(), VCm(M, 'cmoFlagM', 0.6, { roughness: 0.6 }), 12, {}],
    cmoPool: (M) => [PROP.pool(), VCm(M, 'cmoPoolM', 0.15, { roughness: 0.7 }), 3, {}],
    cmoPoolShade: (M) => [PROP.poolShade(), VCm(M, 'cmoPoolShadeM', 0.5, { roughness: 0.5, side: THREE.DoubleSide }), 3, {}],
    cmoRiser: (M) => [PROP.riser(), VCm(M, 'cmoRiserM', 0.12, { roughness: 0.9 }), 4, {}],
    cmoMicStand: (M) => [PROP.micStand(), VCm(M, 'cmoMicM', 0.2, { roughness: 0.25, metalness: 0.6 }), 6, {}],
    cmoJukebox: (M) => [PROP.jukebox(), VCm(M, 'cmoJukeM', 0.16, { roughness: 0.3, metalness: 0.35 }), 4, {}],
    cmoJukeArch: (M) => [PROP.jukeArch(), M.cmoArchM || (M.cmoArchM = jukeLight(0)), 4, { aK: 1 }],
    cmoJukeTubes: (M) => [PROP.jukeTubes(), M.cmoTubesM || (M.cmoTubesM = jukeLight(1)), 4, { aK: 1 }],
    cmoJukeWindow: (M) => [PROP.jukeWindow(), VCm(M, 'cmoJukeWinM', 0.5, { roughness: 0.2 }), 4, {}],
    cmoRecord: (M) => [PROP.record(), VCm(M, 'cmoRecordM', 0.3, { roughness: 0.2, metalness: 0.3 }), 4, {}],
    cmoJukeStrips: (M) => [PROP.jukeStrips(), pic(M, 'cmoStripsM', tex().strips, 0.9), 4, {}],
    cmoCrate: (M) => [new THREE.BoxGeometry(14, 22, 10).translate(0, 11.6, 0), pic(M, 'cmoCrateM', tex().crate, 0.25, { side: THREE.FrontSide }), 2, {}],
    cmoTruck: (M) => [PROP.crate(), VCm(M, 'cmoTruckM', 0.1, { roughness: 0.5, metalness: 0.4 }), 2, {}],
    cmoBanner: (M) => [PROP.banner(), VCm(M, 'cmoBannerM', 0.3, { roughness: 0.9 }), 4, {}],
    cmoBannerFace: (M) => [PROP.signFace(24.4, 7.6).translate(0, 0, 0.0), M.sign, 4, { aIdx: 1, aWake: 2 }],
    cmoBoard: (M) => [PROP.letterBoard(), VCm(M, 'cmoBoardM', 0.25, { roughness: 0.5, metalness: 0.3 }), 26, {}],
    cmoBoardFace: (M) => [PROP.signFace(24.6, 8.4), M.sign, 26, { aIdx: 1, aWake: 2 }],
    cmoLightbox: (M) => [lightbox(), VCm(M, 'cmoBoxM', 0.1, { roughness: 0.5 }), 12, {}],
    cmoLightFace: (M) => [PROP.signFace(17.6, 5.6).translate(0, 0, 0.0), M.sign, 12, { aIdx: 1, aWake: 2 }],
    cmoTipJar: (M) => [PROP.tipJar(), VCm(M, 'cmoTipM', 0.35, { roughness: 0.35, metalness: 0.6 }), 3, {}],
    cmoTipGlass: (M) => [PROP.tipGlass(), M.cmoTipGlassM || (M.cmoTipGlassM = new THREE.MeshStandardMaterial({ color: 0xc8e0ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, emissive: 0x18202a })), 3, {}],
    cmoTipLabel: (M) => [PROP.tipLabel(), pic(M, 'cmoTipLabelM', tex().tip, 0.5, { transparent: true, alphaTest: 0.5 }), 3, {}],
    cmoCoin: (M) => [PROP.coin(), VCm(M, 'cmoCoinM', 0.85, { roughness: 0.3, metalness: 0.45 }), 1500, {}],
    cmoAmp: (M) => [STAGE.amp(), VCm(M, 'cmoAmpM', 0.12, { roughness: 0.6 }), 60, {}],
    cmoWedge: (M) => [STAGE.wedge(), VCm(M, 'cmoAmpM', 0.12, { roughness: 0.6 }), 60, {}],
    cmoKit: (M) => [STAGE.kit(), VCm(M, 'cmoKitM', 0.18, { roughness: 0.3, metalness: 0.4 }), 3, {}],
    cmoKickFace: (M) => [STAGE.kickFace(), M.sign, 3, { aIdx: 1, aWake: 2 }],
    cmoBlinder: (M) => [STAGE.blinderStand(), VCm(M, 'cmoAmpM', 0.12, { roughness: 0.6 }), 16, {}],
    cmoBlinderLamps: (M) => [STAGE.blinderLamps(), M.cmoFlashM || (M.cmoFlashM = flashMaterial()), 16, { aK: 1 }],
    cmoDesk: (M) => [STAGE.desk(), VCm(M, 'cmoDeskM', 0.15, { roughness: 0.5 }), 3, {}],
    cmoFader: (M) => [STAGE.fader(), VCm(M, 'cmoFaderM', 0.5, { roughness: 0.4 }), 40, {}],
    cmoBigMic: (M) => [STAGE.bigMic(), VCm(M, 'cmoMicM', 0.2, { roughness: 0.25, metalness: 0.6 }), 3, {}],
    cmoKiss: (M) => [STAGE.kiss(), VCm(M, 'cmoKissM', 0.9, { roughness: 0.3, side: THREE.DoubleSide }), 3, {}],
    cmoTab: (M) => [STAGE.tab(), pic(M, 'cmoTabM', tex().tab, 0.55), 3, {}],
    cmoTabClip: (M) => [STAGE.tabClip(), VCm(M, 'cmoBrassM', 0.25, { roughness: 0.3, metalness: 0.7 }), 3, {}],
    cmoChairsUp: (M) => [AFTER.chairsUp(), VCm(M, 'cmoChairM', 0.1, { roughness: 0.75 }), 90, {}],
    cmoChairStack: (M) => [AFTER.chairStack(), VCm(M, 'cmoChairM', 0.1, { roughness: 0.75 }), 6, {}],
    cmoCoil: (M) => [AFTER.coil(), VCm(M, 'cmoCoilM', 0.2, { roughness: 0.6 }), 12, {}],
    cmoStairs: (M) => [AFTER.stairs(), VCm(M, 'cmoChairM', 0.1, { roughness: 0.75 }), 2, {}],
    cmoSetlist: (M) => [AFTER.setlist(), pic(M, 'cmoSetM', tex().setlist, 0.5), 2, {}],
    cmoBackDoor: (M) => [AFTER.backDoor(), VCm(M, 'cmoDoorM', 0.15, { roughness: 0.6 }), 2, {}],
    cmoBackLight: (M) => [AFTER.backLight(), M.cmoBackLightM || (M.cmoBackLightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), side: THREE.DoubleSide })), 2, {}],
    cmoExitFace: (M) => [AFTER.exitFace(), M.cmoExitM || (M.cmoExitM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.6, 0.4), side: THREE.DoubleSide })), 2, {}],
    cmoTabsBoard: (M) => [AFTER.tabsBoard(), VCm(M, 'cmoTabsM', 0.35, { roughness: 0.8 }), 2, {}],
    cmoGhostAmp: (M) => [GHOST.amp(), M.cmoGhostM || (M.cmoGhostM = ghostMaterial()), 24, { aK: 1 }],
    cmoGhostCase: (M) => [GHOST.case(), M.cmoGhostM || (M.cmoGhostM = ghostMaterial()), 24, { aK: 1 }],
    cmoGhostDrum: (M) => [GHOST.drum(), M.cmoGhostM || (M.cmoGhostM = ghostMaterial()), 24, { aK: 1 }],
    cmoGhostStand: (M) => [GHOST.stand(), M.cmoGhostM || (M.cmoGhostM = ghostMaterial()), 24, { aK: 1 }],
  },
  parts: {
    // the set-pieces, each where she sings it
    cmoProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course;
      const lamp = barLamp(c, T);
      const at = S._cmv || (S._cmv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2 = 0.5, cl = WARM, r = 36) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, cl, k2);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      if (k === 'bell') {
        // last call: it swings, and keeps swinging a while
        put('cmoBellBracket');
        const r = it.ring ?? 1e9, sw = T > r ? Math.sin((T - r) * 9) * 0.55 * Math.exp(-(T - r) * 0.9) : 0;
        const w = local(at, yaw, 0, -3.4 * s, 6.6 * s, S._o); m.compose(w, quat('_cmbq', 0, sw, 0), S._s.set(s, s, s)); L.cmoBell.add(m);
        light(0, -4.5, 6.6, 9, AMBER, 0.35 * lamp + (T > r && T < r + 1.2 ? 0.8 * (1 - (T - r) / 1.2) : 0));
      }
      else if (k === 'drinks') {
        put('cmoDrinks');
        for (let j = 0; j < 7; j++) light(0, 3, -15 + j * 5, 5, [AMBER, WHITE, GOLD, RED, [0.7, 1, 0.5], PINK, GOLD][j], 0.45 * lamp);
      }
      else if (k === 'register') {
        put('cmoRegister');
        const o = it.ding ?? 1e9, op = smooth(o - 0.08, o + 0.05, T) * (1 - smooth(o + 2.5, o + 3.2, T));
        put('cmoDrawer', 0, 0, 3.2 + 3.2 * op);
        for (let j = 0; j < 3; j++) put('cmoFlag', -2.2 + j * 2.2, 8.4 + 1.6 * smooth(o + j * 0.05, o + 0.12 + j * 0.05, T), -1.2);
        light(0, 8, 2, 12, GOLD, 0.25 * lamp + (T > o && T < o + 0.8 ? 1.2 * (1 - (T - o) / 0.8) : 0));
      }
      else if (k === 'pool') {
        put('cmoPool'); put('cmoPoolShade');
        light(0, 21, 0, 26, [0.85, 1, 0.75], 0.55 * lamp); spot(0.6 * lamp, [0.85, 1, 0.75], 30);
      }
      else if (k === 'corner') {
        // her corner: the riser, her mic stand alone in its spot
        put('cmoRiser', 0, 0, 0, q, 1); put('cmoMicStand', 0, 2.7 / s, 0);
        light(0, 30, 2, 22, WARM, 0.35 * lamp); poolAt(S, at.x, (it.h ?? 0) + 2.8, at.z, 16, WARM, 0.8 * lamp);
      }
      else if (k === 'jukebox') {
        // the jukebox on the stage where she sang; it lights up on "coin"
        const on = it.on !== undefined ? smooth(it.on, it.on + 0.25, T) : 1, dark = 1 - smooth(191.85, 191.9, T);
        if (it.riser) put('cmoRiser', 0, 0, 0, q, 1);
        const y0 = it.riser ? 2.7 / s : 0;
        put('cmoJukebox', 0, y0); put('cmoJukeArch', 0, y0, 0, q, s, kv(on * dark)); put('cmoJukeTubes', 0, y0, 0, q, s, kv(on * dark)); put('cmoJukeWindow', 0, y0); put('cmoJukeStrips', 0, y0);
        { const w = local(at, yaw, 0, (y0 + 14.9) * s, 3.93 * s, S._o); m.compose(w, quat('_cmrq', 0, 0, T * 3.5 * on), S._s.set(s, s, s)); L.cmoRecord.add(m); }
        if (it.micStand) put('cmoMicStand', -9, y0, -1, q, 1.1);
        light(0, y0 + 13, 4.5, 30, [1, 0.6, 0.3], (0.15 + 0.7 * on) * dark); light(-5.35, y0 + 7, 4.4, 9, [1, 0.4, 0.2], 0.6 * on * dark); light(5.35, y0 + 7, 4.4, 9, [1, 0.4, 0.2], 0.6 * on * dark);
        spot((0.25 + 0.55 * on) * dark, [1, 0.6, 0.35], 34);
      }
      else if (k === 'crate') {
        put('cmoTruck'); put('cmoCrate');
        light(0, 26, 4, 14, WARM, 0.15);
      }
      else if (k === 'banner') {
        const w = local(at, yaw, 0, 0, 0, S._o); w.y = c.sample(it.t).y + (it.above ?? 15);
        S._e.set(0, c.sample(it.t).yaw + Math.PI, Math.sin(T * 1.3 + it.t) * 0.03); const bq = (S._cmbn || (S._cmbn = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, bq, S._s.set(s, s, s)); L.cmoBanner.add(m); L.cmoBannerFace.add(m, signV(it.idx, 0.6 + 0.4 * lamp));
      }
      else if (k === 'lightbox') {
        // a sign in a lightbox: LIVE MUSIC dying in the window, ENCORE switched off
        const w = local(at, yaw, 0, 0, 0, S._o); w.y = (it.h ?? 0) + (it.y ?? 0);
        S._e.set(0, c.sample(it.t).yaw + Math.PI + (it.turn ?? 0), 0); const bq = (S._cmlb || (S._cmlb = new THREE.Quaternion())).setFromEuler(S._e);
        let lv = it.lit ?? 1;
        if (it.die !== undefined) { const d = it.die; lv *= T < d - 1.6 ? 1 : (T < d ? (Math.sin(T * 41 + it.t) > -0.2 ? 1 : 0.1) * (0.5 + 0.5 * Math.sin(T * 7)) : 0.04); }
        if (it.kill !== undefined && T > it.kill) lv = T < it.kill + 0.12 ? 1.6 : 0.04;
        m.compose(w, bq, S._s.set(s, s, s)); L.cmoLightbox.add(m); L.cmoLightFace.add(m, signV(it.idx, lv));
        if (lv > 0.2) glowAt(S, w.x, w.y, w.z, 22 * s, it.cl || PINK, 0.25 * lv);
      }
      else if (k === 'tip') {
        put('cmoTipJar'); put('cmoTipGlass'); put('cmoTipLabel');
        light(0, 12, 0, 40, GOLD, 0.6 * lamp); spot(0.6 * lamp, GOLD, 40);
      }
      else if (k === 'quarter') {
        // her last quarter, dropped from up there, spinning, onto the bar
        const t0 = it.drop ?? 0, t1 = it.land ?? t0 + 2.4, u = clamp((T - t0) / (t1 - t0), 0, 1);
        if (T < t0 - 0.5) return;
        const fall = 1 - u * u, spin = T < t1 ? T * 9 : t1 * 9;
        const tilt = T < t1 ? 0.35 : Math.PI / 2 * smooth(t1, t1 + 0.6, T) + 0.35 * (1 - smooth(t1, t1 + 0.6, T));
        const w = local(at, yaw, 0, 1.2 * s + fall * (it.from ?? 20), 0, S._o);
        m.compose(w, quat('_cmqq', spin, tilt, 0), S._s.set(s * 2.4, s * 2.4, s * 2.4)); L.cmoCoin.add(m);
        // a light follows it down, and it flashes where it lands
        glowAt(S, w.x, w.y, w.z, 5 * s, WHITE, 0.5 + 0.9 * Math.max(0, Math.sin(spin * 2)));
        glowAt(S, w.x, w.y, w.z, 16 * s, WARM, 0.35);
        poolAt(S, at.x, (it.h ?? 0) + (it.y ?? 0) + 0.12, at.z, 14 * s, WARM, 0.5 + 0.5 * u);
        if (T > t1 && T < t1 + 0.5) glowAt(S, w.x, w.y, w.z, 22 * s, GOLD, 1.4 * (1 - (T - t1) / 0.5));
      }
      else if (k === 'coins') {
        // quarters left on the bar
        const R = seeded(Math.floor(it.t * 100));
        for (let j = 0; j < 9; j++) put('cmoCoin', (R() - 0.5) * 8, 0.1 + j * 0.2, (R() - 0.5) * 2, q, s * 1.6);
        for (let j = 0; j < 7; j++) put('cmoCoin', (R() - 0.5) * 14, 0.1, (R() - 0.5) * 10, q, s * 1.6);
        light(0, 1, 0, 12, WHITE, 0.3 * lamp);
      }
      else if (k === 'micRain') {
        // her mic stand out on the curb in the rain, a light on it from the bar's window
        put('cmoMicStand');
        light(0, 18.6, 5.6, 6, WHITE, 0.6); spot(0.45, [0.7, 0.85, 1], 30);
      }
      else if (k === 'ampRain') {
        put('cmoAmp', 0, 0, 0, q, s * 0.6); spot(0.3, [0.7, 0.85, 1], 24);
      }
      else if (k === 'kit') {
        // the house band's kit on its riser, the bar's name on the kick
        put('cmoRiser', 0, 0, 0, q, 1);
        { const w = local(at, yaw, 0, 2.7, 0, S._o); m.compose(w, q, S._s.set(s, s, s)); L.cmoKit.add(m); L.cmoKickFace.add(m, signV(it.idx, 0.4 + 0.6 * lamp)); }
        light(0, 18, 0, 34, GOLD, 0.4 * lamp); spot(0.5 * lamp, GOLD, 40);
      }
      else if (k === 'tab') {
        // the tab, stamped CLOSED, hung up like a banner
        const sw = Math.sin(T * 1.6 + it.t) * 0.08;
        const top = local(at, yaw, 0, 48, 0, S._o);
        m.compose(top, quat('_cmtq', 0, 0, sw), S._s.set(s, s, s)); L.cmoTab.add(m); L.cmoTabClip.add(m);
        light(0, 32, 4, 30, WHITE, 0.3 * lamp);
      }
      else if (k === 'faders') {
        // don't you dare let me fade out slow: every fader goes up
        put('cmoDesk');
        const d = it.up ?? 1e9, up = smooth(d, d + 0.5, T), bt = Math.exp(-(c.beatAt(T) % 1) * 3);
        for (let j = 0; j < 12; j++) { const u = smooth(d + j * 0.035, d + 0.45 + j * 0.035, T); put('cmoFader', -13.2 + j * 2.4, 12.6 + 0.9 * u, 3.6 - 7.2 * u); }
        // the meters over each channel: green, then amber, then red at the top once they're all up
        for (let j = 0; j < 12; j++) { const lv = (0.35 + 0.65 * up) * (0.55 + 0.45 * bt) * (0.8 + 0.2 * Math.sin(T * 9 + j * 1.7)); for (let r = 0; r < 5; r++) if (r / 5 < lv) light(-13.2 + j * 2.4, 13.6 + r * 1.3, -6.2, 1.5, r < 3 ? [0.35, 1, 0.45] : (r < 4 ? AMBER : RED), 1.0); }
        spot(0.4 * lamp, GOLD, 34);
      }
      else if (k === 'blinders') {
        // the blinders: they chase on the beat, then all of it at once on "blinding"
        put('cmoBlinder');
        const b = it.blind ?? 1e9, f = c.beatAt(T) % 1, chase = Math.exp(-f * 6) * smooth(b - 3.4, b - 2.8, T);
        const hit = T > b ? Math.exp(-(T - b) * 1.8) : 0;
        const k2 = Math.min(1.2, hit * 1.2 + chase * 0.5);
        put('cmoBlinderLamps', 0, 0, 0, q, s, kv(k2));
        if (k2 > 0.05) { light(0, 26, 3, 44, WHITE, 0.9 * k2); for (const [x, y] of [[-3.1, 27.6], [3.1, 27.6], [-3.1, 24.4], [3.1, 24.4]]) light(x, y, 2, 6, WHITE, 1.2 * k2); }
      }
      else if (k === 'kissMic') {
        put('cmoBigMic'); put('cmoKiss');
        light(0, 46, 6, 26, [1, 0.3, 0.35], 0.5 * lamp); spot(0.5 * lamp, GOLD, 34);
      }
      else if (k === 'coils') { put('cmoCoil'); put('cmoCoil', 7.4, 0, 2.2, q, s * 0.85); spot(0.3, TUBE, 22); }
      else if (k === 'chairStack') { put('cmoChairStack'); put('cmoChairStack', 6, 0, 1.5); }
      else if (k === 'stairs') { put('cmoStairs'); put('cmoSetlist'); light(0, 9, -5, 8, WHITE, 0.4); }
      else if (k === 'tabsBoard') {
        // the tabs left open for the ghosts of every house band: they glow a little
        put('cmoTabsBoard');
        for (let j = 0; j < 6; j++) light(-8 + j * 3.2, Math.sin(j * 2.1) * 4, 1, 4, GHOSTC, 0.35 + 0.25 * Math.sin(T * 2 + j));
      }
      else if (k === 'backDoor') {
        put('cmoBackDoor'); put('cmoBackLight'); put('cmoExitFace');
        light(0, 12, 2, 40, [1, 0.95, 0.85], 0.7); light(0, 28.2, 1.4, 6, [0.3, 1, 0.45], 0.9);
        const w = local(at, yaw, 0, 0, 12 * s, S._o); poolAt(S, w.x, (it.h ?? 0) + 0.15, w.z, 40 * s, [1, 0.95, 0.85], 0.6);
      }
      else if (k === 'pour') {
        // a bottle over a glass, the pour going in
        put('cmoRocks'); put('cmoBottle', 0, 9.2, -2.2, quat('_cmpq', 0, 2.25, 0)); put('cmoStream', 0.0, 2.0, 0.0);
        light(0, 3, 0, 9, AMBER, 0.6 * lamp); light(0, 7, 0, 5, AMBER, 0.5 * lamp);
      }
    },
    // stools along the front of the bar
    cmoStool(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.cmoStool.add(m); },
    // a booth by the wall, the candle on its table
    cmoBooth(S, it, p, q, yaw) {
      const L = S.layers, m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); L.cmoBooth.add(m); L.cmoCandle.add(m);
      if (!S.track) return;
      const lamp = barLamp(S.course, S.tNow ?? 0), w = local(p, yaw, 0, 8.2 * it.s, 0, S._o);
      glowAt(S, w.x, w.y, w.z, 3.2 * it.s, CANDLE, (0.8 + 0.2 * Math.sin((S.tNow ?? 0) * 9 + it.seed * 20)) * (0.3 + 0.7 * lamp));
      poolAt(S, p.x, p.y + 0.12, p.z, 18 * it.s, CANDLE, 0.25 * (0.3 + 0.7 * lamp));
    },
    // the stage's gear along the sides: amp stacks, wedges
    cmoGear(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers[it.amp ? 'cmoAmp' : 'cmoWedge'].add(m); if (it.amp && S.track) { const lamp = barLamp(S.course, S.tNow ?? 0); glowAt(S, p.x, p.y + 20.3 * it.s, p.z, 2.4, RED, 0.8 * lamp); } },
    // a table with its chairs up, after close
    cmoChairs(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.cmoChairsUp.add(m); },
    // the lit letter board her lines go up on, hung over the road, the bulbs round it chasing
    cmoBoard(S, it, p) {
      const L = S.layers; void L.cmoBoard; void L.cmoBoardFace;
      if (!S.track) return;
      if (it.cut === undefined) { const l = (S.plan.lyrics || []).find((e) => Math.abs(e.t + (e.lead ?? 1.4) - it.t) < 1e-6) || {}; it.cut = l.cut ?? null; it.keep = !!l.keep; }
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t), yaw = sm.yaw + Math.PI;
      // the line that gets cut off: the board goes dark and drops on its chains
      const cut = it.cut !== null ? smooth(it.cut, it.cut + 0.35, T) : 0;
      S._e.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.02 + cut * 0.55); const fq = (S._cmbd || (S._cmbd = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 14) - cut * 3;
      const m = S._m, s = it.s ?? 1;
      const lit = (1 - cut * 0.97) * (0.25 + 0.75 * (it.keep ? 1 : barLamp(c, T)));
      m.compose(p, fq, S._s.set(s, s, s)); L.cmoBoard.add(m); L.cmoBoardFace.add(m, signV(it.idx, lit));
      // the bulbs: 10 along the top and bottom, 3 up each side, every third one lit, running
      const w = S._o, run = Math.floor(T * 7);
      for (let j = 0; j < 26; j++) {
        let bx, by;
        if (j < 10) { bx = -11.7 + j * 2.6; by = 5.0; } else if (j < 20) { bx = 11.7 - (j - 10) * 2.6; by = -5.0; } else if (j < 23) { bx = 12.9; by = -2.5 + (j - 20) * 2.5; } else { bx = -12.9; by = 2.5 - (j - 23) * 2.5; }
        const on = ((j + run) % 3 === 0 ? 1 : 0.25) * lit;
        local(p, yaw, bx * s, by * s, 0.6 * s, w); glowAt(S, w.x, w.y, w.z, 1.6 * s, WARM, 1.1 * on);
      }
      glowAt(S, p.x, p.y, p.z, 30 * s, WARM, 0.1 * lit);
    },
    // quarters coming down out of the dark, spinning, catching the light, the rest of the song
    cmoCoins(S, it, p) {
      void S.layers.cmoCoin;
      if (!S.track) return;
      const T = S.tNow ?? 0;
      if (T < it.from - 0.2 || T > it.to) return;
      const R = it.R || (it.R = (() => { const r = seeded(Math.floor(it.t * 1000) + 7); return Array.from({ length: 30 }, () => r()); })());
      const m = S._m, w = S._o, k = smooth(it.from - 0.2, it.from + 0.6, T);
      for (let j = 0; j < 3; j++) {
        const x = (R[j * 6] < 0.5 ? -1 : 1) * (13 + R[j * 6 + 5] * 24), z = (R[j * 6 + 1] - 0.5) * 18, sp = 18 + R[j * 6 + 2] * 12, ph = R[j * 6 + 3];
        const top = 64, y = top - ((T * sp + ph * top) % top);
        local(p, 0, x, 0, z, w); w.y = (it.h ?? 0) + y;
        S._e.set(T * (3 + R[j * 6 + 4] * 4) + j, T * 2 + j, 0.4); const cq = (S._cmcq || (S._cmcq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, cq, S._s.set(1.6 * k, 1.6 * k, 1.6 * k)); S.layers.cmoCoin.add(m);
        const glint = Math.max(0, Math.sin(T * 9 + j * 3.1 + ph * 20));
        if (glint > 0.82) glowAt(S, w.x, w.y, w.z, 5, WHITE, 1.4 * (glint - 0.82) * 5 * k);
      }
    },
    // the ghosts of every house band: their gear, carried across and out the back door, singing
    cmoGhost(S, it, p, q) {
      const L = S.layers; void L.cmoGhostAmp; void L.cmoGhostCase; void L.cmoGhostDrum; void L.cmoGhostStand;
      if (!S.track) return;
      const T = S.tNow ?? 0, u = clamp((T - it.go) / it.dur, 0, 1);
      if (T < it.go - 3 || u >= 1) return;
      const k = smooth(it.go - 3, it.go - 1, T) * (1 - smooth(0.82, 1, u));
      const x = it.x + (it.toX - it.x) * u, tt = it.t + (it.toT - it.t) * u;
      const yaw = S.track.groundYaw(tt, x, S._o) + (it.rot ?? 0);
      const bob = Math.sin(T * 2.6 + it.seed * 9) * 1.2;
      S._o.y = (it.h ?? 0) + 6 + bob;
      S._e.set(Math.sin(T * 1.7 + it.seed) * 0.08, yaw + Math.sin(T + it.seed) * 0.2, 0); const gq = (S._cmgq || (S._cmgq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m; m.compose(S._o, gq, S._s.set(it.s, it.s, it.s));
      L[['cmoGhostAmp', 'cmoGhostCase', 'cmoGhostDrum', 'cmoGhostStand'][it.v]].add(m, kv(k));
      glowAt(S, S._o.x, S._o.y + 6, S._o.z, 14, GHOSTC, 0.12 * k);
      // singing: a few motes rising off it
      for (let j = 0; j < 3; j++) { const f = ((T * 0.6 + j / 3 + it.seed) % 1); glowAt(S, S._o.x + Math.sin(j * 2 + T) * 2, S._o.y + 10 + f * 12, S._o.z, 1.2, GHOSTC, 0.9 * (1 - f) * k); }
    },
    // a puddle in the street with the neon in it
    cmoPuddle(S, it, p) { if (!S.track) return; poolAt(S, p.x, 0.06, p.z, it.r, it.cl, it.k * (0.85 + 0.15 * Math.sin((S.tNow ?? 0) * 3 + it.seed * 9))); },
  },
  kits: {
    cmoProps(S, z) {
      for (const c of z.at) {
        const it = { ...c, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, h: c.h ?? 0, parts: 'cmoProp', ahead: c.ahead ?? 40 };
        if (c.kind === 'banner' || c.kind === 'lightbox' || c.kind === 'kit') it.idx = S.atlas.index[c.sign];
        S.items.push(c.floor ? onFloor(S, it) : it);
        if (c.floor && c.y0) it.y = c.y0;
      }
    },
    // the stools along the bar and the booths along the wall
    cmoBar(S, z, R) {
      for (let t = z.from; t < z.to; t += 0.26 + R() * 0.04) S.items.push(onFloor(S, { t, x: z.side * (z.x ?? 14.6), rot: 0, s: 1, parts: 'cmoStool' }));
      for (let t = z.from + 0.4; t < z.to - 0.3; t += 0.85 + R() * 0.2) { const x = -z.side * (27 + R() * 2), sd = R(); if (!(z.clear || []).some(([a, b]) => t > a && t < b)) S.items.push(onFloor(S, { t, x, rot: -z.side * Math.PI / 2, s: 1, seed: sd, parts: 'cmoBooth' })); }
    },
    // amp stacks and wedges along the sides of the stage
    cmoStage(S, z, R) {
      for (let t = z.from; t < z.to; t += 0.6 + R() * 0.3) for (const side of [-1, 1]) { const keep = R() < 0.6, x = side * (29 + R() * 5), s = 0.85 + R() * 0.25, amp = R() < 0.55, dt = R() * 0.2; if (keep && !(z.clear || []).some(([a, b]) => t > a && t < b)) S.items.push(onFloor(S, { t: t + dt, x, rot: FACE(side) - side * 0.3, s, amp, parts: 'cmoGear' })); }
    },
    // tables with their chairs up, after close
    cmoAfter(S, z, R) { for (let t = z.from; t < z.to; t += 0.6 + R() * 0.25) for (const side of [-1, 1]) if (R() < 0.7 && !(side < 0 && R() < 0.5)) S.items.push(onFloor(S, { t: t + R() * 0.2, x: side * (side < 0 ? 15.5 : 24 + R() * 7), rot: R() * 6.28, s: 0.95 + R() * 0.1, parts: 'cmoChairs' })); },
    // the street: brick fronts, the lamps, the neon in the puddles
    cmoStreet(S, z, R) {
      const bricks = [0x6a3a2e, 0x7a4636, 0x5a3a36, 0x8a5a44, 0x4a3a40];
      for (const side of [-1, 1]) for (let t = z.from + R() * 0.2; t < z.to; t += 0.34 + R() * 0.1) {
        S.items.push({ t, x: side * ((z.x ?? 36) + R() * 4), rot: SIDE(side), s: 0.95 + R() * 0.15, sy: 0.55 + R() * 0.5, parts: 'block', tint: col(bricks[Math.floor(R() * bricks.length)]), seed: R(), wake0: 0.7, noShop: R() < 0.4 });
        if (R() < 0.5) { const it = { t: t + R() * 0.2, x: side * (64 + R() * 70), rot: R() * 0.4, s: 0.9 + R() * 0.3, sy: 0.8 + R() * 1.4, parts: R() < 0.4 ? 'tower' : 'block', tint: col(bricks[Math.floor(R() * bricks.length)]), seed: R(), wake0: 0.6, noShop: true }; if (z.low) { it.parts = 'block'; it.sy = Math.min(it.sy, 0.9); } S.items.push(it); }
      }
      for (let t = z.from; t < z.to; t += 0.32) for (const side of [-1, 1]) S.items.push({ t, x: side * 17.5, rot: SIDE(side), parts: 'lamp', seed: R() });
      for (let t = z.from; t < z.to; t += 0.22) S.items.push({ t: t + R() * 0.2, x: (R() - 0.5) * 60, r: 6 + R() * 10, cl: [PINK, TEAL, AMBER, RED][Math.floor(R() * 4)], k: 0.35 + R() * 0.3, seed: R(), parts: 'cmoPuddle' });
    },
    // quarters raining down over the outro
    cmoCoinRain(S, z, R) { for (let t = z.from - 2; t < z.to + 1.5; t += 0.28) S.items.push(onFloor(S, { t: t + R() * 0.1, x: 0, rot: 0, from: z.from, to: z.to, parts: 'cmoCoins', ahead: 6 })); },
    // the gear of every house band, crossing to the back door
    cmoGhosts(S, z, R) {
      for (let j = 0; j < z.n; j++) {
        const go = z.go + j * z.gap;
        S.items.push(onFloor(S, { t: z.door - 0.25 + (R() - 0.5) * 0.25, x: -32 + R() * 6, toX: z.doorX - 2, toT: z.door + (R() - 0.5) * 0.06, go, dur: z.dur, v: j % 4, s: 1.1 + R() * 0.3, seed: R(), rot: Math.PI / 2, parts: 'cmoGhost', ahead: 30 }));
      }
    },
  },
});
// which layers each set-piece uses (made up front so nothing compiles mid-ride)
const PROP_LAYERS = {
  bell: ['cmoBellBracket', 'cmoBell'], drinks: ['cmoDrinks'], register: ['cmoRegister', 'cmoDrawer', 'cmoFlag'], pool: ['cmoPool', 'cmoPoolShade'], corner: ['cmoRiser', 'cmoMicStand'],
  jukebox: ['cmoRiser', 'cmoJukebox', 'cmoJukeArch', 'cmoJukeTubes', 'cmoJukeWindow', 'cmoJukeStrips', 'cmoRecord', 'cmoMicStand'], crate: ['cmoTruck', 'cmoCrate'], banner: ['cmoBanner', 'cmoBannerFace'],
  lightbox: ['cmoLightbox', 'cmoLightFace'], tip: ['cmoTipJar', 'cmoTipGlass', 'cmoTipLabel'], quarter: ['cmoCoin'], coins: ['cmoCoin'], micRain: ['cmoMicStand'], ampRain: ['cmoAmp'],
  kit: ['cmoRiser', 'cmoKit', 'cmoKickFace'], tab: ['cmoTab', 'cmoTabClip'], faders: ['cmoDesk', 'cmoFader'], blinders: ['cmoBlinder', 'cmoBlinderLamps'], kissMic: ['cmoBigMic', 'cmoKiss'],
  coils: ['cmoCoil'], chairStack: ['cmoChairStack'], stairs: ['cmoStairs', 'cmoSetlist'], tabsBoard: ['cmoTabsBoard'], backDoor: ['cmoBackDoor', 'cmoBackLight', 'cmoExitFace'], pour: ['cmoRocks', 'cmoBottle', 'cmoStream'],
};

// ---------- the place, per frame ----------
export class CmoWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = barMaterial();
    this.mat.uniforms.tBands.value = tex().bands;
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, BAR));
    const g = S.course.gaps;
    this.mat.uniforms.uGaps.value.set(g[0] ? g[0].from - 0.05 : -1e5, g[0] ? g[0].to + 0.05 : -1e5, g[1] ? g[1].from - 0.05 : -1e5, g[1] ? g[1].to + 0.05 : -1e5);
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, T = S.rider.t, c = S.course;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.7);
    this.lamp = barLamp(c, T);
    u.uLamp.value = this.lamp;
    u.uHouse.value = houseLamp(T) > 0 ? 1 : 0;
    u.uBeat.value = Math.exp(-(c.beatAt(T) % 1) * 4);
    // the tinsel burns brightest in the choruses, brightest of all at the end
    const sec = c.sectionAt(T), big = sec && (sec.kind === 'chorus' || sec.kind === 'final') ? 1 : 0;
    this.goldK = (this.goldK ?? 0.8) + ((0.75 + 0.45 * big + 0.35 * smooth(150.37, 151.9, T)) - (this.goldK ?? 0.8)) * Math.min(1, dt * 3);
    u.uGoldK.value = this.goldK;
    u.uDark.value = smooth(191.85, 191.95, T);
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    const M = S.town.mats;
    for (const k of ['cmoArchM', 'cmoTubesM', 'cmoGhostM']) if (M[k]) M[k].uniforms.uTime.value = time;
  }
  // the lights hanging over the bar; after close, the long tubes
  draw(T) {
    const g = this._g, lamp = this.lamp ?? 1;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      const after = r.style === 2, hk = after ? houseLamp(this.S.rider.t) : 0;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g);
        if (after) { T.glow(g.x, fy + r.H - 1.2, g.z, 14, TUBE, 0.6 * hk); T.pool(g.x, fy + 0.08, g.z, 40, TUBE, 0.35 * hk); }
        else { T.glow(g.x, fy + r.H - 7.5, g.z, 6, AMBER, 0.95 * lamp); T.glow(g.x, fy + r.H - 7.5, g.z, 20, AMBER, 0.12 * lamp); T.pool(g.x, fy + 0.08, g.z, 30, AMBER, 0.3 * lamp); }
      }
    }
  }
}

// ---------- the end: the jukebox alone on the dark stage, lit, where she stood ----------
export class CmoFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t; this.x = cfg.x ?? -30;
    this.group = new THREE.Group(); scene.add(this.group);
    const body = selfLit({ roughness: 0.3, metalness: 0.35 }, 0.12);
    this.arch = jukeLight(0, false); this.tubes = jukeLight(1, false);
    this.strips = new THREE.MeshStandardMaterial({ map: tex().strips, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex().strips, emissiveIntensity: 0.9 });
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); this.group.add(o); return o; };
    add(PROP.riser(), selfLit({ roughness: 0.9 }, 0.08), 0, 0, 0);
    add(PROP.jukebox(), body, 0, 2.7, 0); add(PROP.jukeArch(), this.arch, 0, 2.7, 0); add(PROP.jukeTubes(), this.tubes, 0, 2.7, 0);
    add(PROP.jukeWindow(), selfLit({ roughness: 0.2 }, 0.5), 0, 2.7, 0); add(PROP.jukeStrips(), this.strips, 0, 2.7, 0);
    this.record = add(PROP.record(), selfLit({ roughness: 0.2, metalness: 0.3 }, 0.3), 0, 2.7 + 14.9, 3.93);
    add(PROP.micStand(), selfLit({ roughness: 0.25, metalness: 0.6 }, 0.1), -11, 2.7, -2);
    add(PROP.coin(), selfLit({ roughness: 0.3, metalness: 0.45 }, 0.6), 3, 2.9, 8);
    // the tables either side with their chairs up: closed
    const wood = selfLit({ roughness: 0.75 }, 0.05);
    const t1 = add(AFTER.chairsUp(), wood, 25, 0, -4); t1.rotation.y = 0.4;
    const t2 = add(AFTER.chairsUp(), wood, -26, 0, 6); t2.rotation.y = 1.1;
    this.group.scale.setScalar(cfg.s ?? 1.6);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    prepare(course, null);
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    // dark through the stage's last blaze; it comes on when the lights go out
    const on = smooth(191.95, 192.4, rider.t);
    this.arch.uniforms.uTime.value = songT; this.tubes.uniforms.uTime.value = songT;
    this.arch.uniforms.uK.value = 0.05 + 0.95 * on; this.tubes.uniforms.uK.value = 0.05 + 0.95 * on;
    this.strips.emissiveIntensity = 0.1 + 0.8 * on;
    // the record runs down to a stop (the song's over); the lights stay on, waiting for a coin
    this.spin = (this.spin || 0) + dt * 3.5 * on * (1 - smooth(193.5, 199.5, rider.t));
    this.record.rotation.z = this.spin;
    const S = this.S; if (!S || this.t - rider.t > 46 || on <= 0) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.6, w = this._w;
    w.set(0, 2.7 + 13, 4.5).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 34 * s, [1, 0.55, 0.3], 0.55 * on); S.glow(w.x, w.y, w.z, 90 * s, [1, 0.45, 0.6], 0.12 * on);
    for (const sx of [-5.35, 5.35]) { w.set(sx, 2.7 + 7.4, 4.4).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 8 * s, [1, 0.4, 0.2], 0.6 * on); }
    w.set(0, 0, 10).applyMatrix4(this.group.matrixWorld); S.pool(w.x, this._p.y + 0.12, w.z, 44 * s, [1, 0.5, 0.35], 0.5 * on);
  }
}
