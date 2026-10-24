// A Million Ducks. She wanted Avatar. In the dark with the screen behind us: the faces lit by it
// (and at "to turn blue", blue), the seeds from the film drifting out over the seats, the
// projector's beam over our heads, the two masks, his and hers. Twenty minutes in, up the aisle
// rail, "I'll be right back", and the exit doors bang open on the beat. The lobby: the popcorn,
// the light he can't get past, ducks with their faces to the glass, a dollar a play, the sign.
// Then the chorus flies us over the prize slot and into the machine: a sea of ducks, the claws
// coming down on every bar, ducks thrown up on every beat; the pirate one, the captain one, the
// dog who knows he's not a duck, the hoodie stuffed full. Out the prize door into the lobby: the
// credits roll on the posters, the auditorium door swings open with blue light in her hair, a
// million ducks come down, the posters forget, the prize wall remembers every duck. Out the front
// doors under the searchlights. Different girl, different year: a leap onto his dresser, the
// bedroom floor a long way down, her pictures, the mirror, the ducks he ever won, their shadows
// dancing on the walls; the gap between the dressers; the claw in his room. Back in the dark at
// the end, facing the screen, and this time he stays, even if it's Avatar.
// The indoor places are halls that follow the course: a floor (tiers of seats, a duck sea, the
// dresser top), walls, a ceiling, and a wall at each end with a door in it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt } from './scenery.js';
import { tintMaterial } from './props.js';
import { prepare, floorAt } from './trail.js';
import { duckGeometry } from './feedback.js';
import { DuckFx } from './dck-fx.js';
import { dckLit, dckHerTexture } from './dck-pieces.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false);

// the floor everything stands on: the shelf under the ribbon indoors, the car park's tarmac out front
export function dckFloor(course, plan, t) {
  const lot = plan && plan.lot;
  if (lot && t > lot[0] && t < lot[1]) return 0;
  return floorAt(course, t);
}

// ---------- posters for the lobby walls: titles from the song ----------
function posterTexture() {
  const W = 1024, H = 1152, cw = 256, ch = 384;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const posters = [
    { bg: ['#06122e', '#1a5ad8'], ink: '#9ff0ff', title: "I'LL BE\nRIGHT BACK", art: 'figure' },
    { bg: ['#2a0610', '#d8203a'], ink: '#ffe08a', title: 'A DOLLAR\nA PLAY', art: 'claw' },
    { bg: ['#101a10', '#3aa860'], ink: '#fff6d0', title: 'UNTIL\nYOU WIN', art: 'duck' },
    { bg: ['#1a0a24', '#8a3ad8'], ink: '#ffd0f4', title: 'THE CREDITS\nROLL', art: 'lines' },
    { bg: ['#020814', '#0a64b8'], ink: '#b8f6ff', title: 'BLUE', art: 'forest' },
    { bg: ['#2a1a04', '#e8a020'], ink: '#2a1204', title: 'EVERY\nDUCK', art: 'duck' },
    { bg: ['#0c0c10', '#4a4a58'], ink: '#ffffff', title: 'SOMEWHERE\nBEHIND\nHER FACE', art: 'figure' },
    { bg: ['#300818', '#ff4f8a'], ink: '#fff0f6', title: "IT WON'T\nLET YOU\nLOSE", art: 'claw' },
    // row 3: what they become: credits rolling (drawn in the shader), then ducks
    { bg: ['#141008', '#3a2a10'], ink: '#ffd23a', title: '', art: 'bigduck' },
    { bg: ['#08141a', '#104a5a'], ink: '#ffd23a', title: '', art: 'bigduck' },
    { bg: ['#1a0810', '#5a1030'], ink: '#ffd23a', title: '', art: 'bigduck' },
    { bg: ['#0a1408', '#2a4a14'], ink: '#ffd23a', title: '', art: 'bigduck' },
  ];
  const duck = (cx, cy, s, body, beak) => {
    g.fillStyle = body; g.beginPath(); g.ellipse(cx, cy, 70 * s, 46 * s, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 32 * s, cy - 58 * s, 34 * s, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - 60 * s, cy - 10 * s); g.lineTo(cx - 92 * s, cy - 40 * s); g.lineTo(cx - 70 * s, cy + 10 * s); g.fill();
    g.fillStyle = beak; g.beginPath(); g.ellipse(cx + 72 * s, cy - 50 * s, 22 * s, 9 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#101010'; g.beginPath(); g.arc(cx + 42 * s, cy - 66 * s, 5 * s, 0, Math.PI * 2); g.fill();
  };
  posters.forEach((p, i) => {
    const x0 = (i % 4) * cw, y0 = Math.floor(i / 4) * ch;
    const gr = g.createLinearGradient(0, y0, 0, y0 + ch);
    gr.addColorStop(0, p.bg[0]); gr.addColorStop(1, p.bg[1]);
    g.fillStyle = gr; g.fillRect(x0, y0, cw, ch);
    g.save(); g.translate(x0, y0);
    g.fillStyle = p.ink; g.strokeStyle = p.ink; g.globalAlpha = 0.85;
    if (p.art === 'duck') duck(128, 236, 1, p.ink, '#ff7a1a');
    if (p.art === 'bigduck') { g.globalAlpha = 1; duck(118, 250, 1.35, '#ffd23a', '#ff7a1a'); g.fillStyle = '#ffffff'; g.globalAlpha = 0.18; g.beginPath(); g.ellipse(100, 216, 30, 14, -0.4, 0, Math.PI * 2); g.fill(); }
    if (p.art === 'claw') { g.lineWidth = 8; g.beginPath(); g.moveTo(128, 60); g.lineTo(128, 190); g.stroke(); g.beginPath(); g.moveTo(128, 190); g.quadraticCurveTo(80, 220, 96, 270); g.moveTo(128, 190); g.quadraticCurveTo(176, 220, 160, 270); g.stroke(); }
    if (p.art === 'figure') { g.beginPath(); g.arc(128, 150, 36, 0, Math.PI * 2); g.fill(); g.beginPath(); g.roundRect(78, 192, 100, 120, 30); g.fill(); }
    if (p.art === 'lines') { g.lineWidth = 3; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(50, 90 + k * 22); g.lineTo(206 - (k % 3) * 30, 90 + k * 22); g.stroke(); } }
    if (p.art === 'forest') { for (let k = 0; k < 40; k++) { g.globalAlpha = 0.3 + 0.7 * ((k * 0.618) % 1); g.beginPath(); g.arc(20 + ((k * 97) % 216), 120 + ((k * 61) % 200), 2 + (k % 4), 0, Math.PI * 2); g.fill(); } }
    g.globalAlpha = 1;
    g.font = '900 34px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = p.ink;
    if (p.title) p.title.split('\n').forEach((l, k, a) => g.fillText(l, 128, 330 - (a.length - 1 - k) * 36));
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- the halls ----------
// ring: the outline of a hall across the course [x, y, rel, part]; rel = height from the floor
// under the ribbon, otherwise from the world's zero. part: 0 floor, 1/2 walls, 3 ceiling,
// 4 dresser front, 5 dresser top, 9 a riser between tiers of seats
function tiers(W, H, x0, step, rise, n) {
  // the seats stand on tiers either side of the aisle, a step up every `step` metres to the walls
  const side = [];
  for (let k = n - 1; k >= 0; k--) {
    const xo = x0 + step * (k + 1), xi = x0 + step * k, y = rise * k;
    side.push([-xo, y, 1, 0], [-xi, y, 1, 0]);
    if (k > 0) side.push([-xi, y, 1, 9], [-xi, y - rise, 1, 9]);
  }
  const top = rise * (n - 1);
  const left = [[-W, H, 1, 1], [-W, top, 1, 1], [-W, top, 1, 0], ...side, [-x0, 0, 1, 0], [-8, 0, 1, 0], [0, 0, 1, 0]];
  const right = left.slice().reverse().map(([x, y, r, p]) => [-x, y, r, p === 1 ? 2 : p]).slice(1);
  return [...left, ...right, [W, H, 1, 3], [W * 0.5, H + 2, 1, 3], [0, H + 3, 1, 3], [-W * 0.5, H + 2, 1, 3], [-W, H, 1, 3]];
}
const RINGS = {
  // the auditorium: tiers of seats rising either side of the aisle to the walls
  auditorium: (W = 38, H = 30) => tiers(W, H, 12, 4.2, 1.35, 6),
  lobby: (W = 26, H = 20) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-14, 0, 1, 0], [-6, 0, 1, 0], [0, 0, 1, 0], [6, 0, 1, 0], [14, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
  // inside the claw machine: the ducks heaped in dunes up to the glass, the gantry overhead
  claw: (W = 32, H = 32) => {
    const dune = [[0, 0], [9, 0], [13, 1.2], [17, 3.2], [21, 6.0], [25, 9.4], [29, 12.6], [W, 13.4]];
    const left = dune.slice().reverse().map(([x, y]) => [-x, y, 1, 0]);
    const right = dune.slice(1).map(([x, y]) => [x, y, 1, 0]);
    return [[-W, H, 1, 1], [-W, 13.4, 1, 1], ...left, ...right, [W, 13.4, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3]];
  },
  // a bedroom at the scale of a duck: the dresser top is the floor you ride; the room's own floor is far below
  room: (W = 340, H = 420, D = 36, F = -150) => [
    [-W, H, 0, 1], [-W, F, 0, 1],
    [-W, F, 0, 0], [-120, F, 0, 0], [-D, F, 0, 0],
    [-D, F, 0, 4], [-D, -0.3, 1, 4],
    [-D, 0, 1, 5], [-12, 0, 1, 5], [0, 0, 1, 5], [12, 0, 1, 5], [D, 0, 1, 5],
    [D, -0.3, 1, 4], [D, F, 0, 4],
    [D, F, 0, 0], [120, F, 0, 0], [W, F, 0, 0],
    [W, F, 0, 2], [W, H, 0, 2],
    [W, H, 0, 3], [0, H, 0, 3], [-W, H, 0, 3],
  ],
};
const STYLE = { auditorium: 0, lobby: 1, room: 2, claw: 3 };
const ROOM_F = -150;

function hallMaterial(posters) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uScreenAt: { value: -1e5 }, uScreenK: { value: 0 }, uScreenCol: { value: new THREE.Color(0x2a8aff) }, uWarm: { value: new THREE.Color(0xffc070) }, uAccent: { value: new THREE.Color(0xff4fb8) },
      uLight: { value: new THREE.Color(1, 1, 1) }, uPosters: { value: posters }, uFlow: { value: 0.4 }, uDim: { value: 1 }, uLift: { value: 0 }, uShadow: { value: 0 }, uSong: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uScreenAt, uScreenK, uFlow, uDim, uLift, uShadow, uSong;
      uniform vec3 uFog, uCam, uScreenCol, uWarm, uAccent, uLight; uniform sampler2D uPosters;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      // a duck seen side on, for shadows and prints: body, head, beak, tail (p in duck units, ~1 long)
      float duckSide(vec2 p){
        float b = length(p * vec2(1.0, 1.55)) - 0.5;
        float hd = length(p - vec2(0.36, 0.42)) - 0.24;
        float bk = box2(p - vec2(0.66, 0.38), vec2(0.13, 0.05));
        float tl = length((p - vec2(-0.5, 0.18)) * vec2(1.6, 1.0)) - 0.16;
        return min(min(b, hd), min(bk, tl));
      }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        vec3 col;
        float scr = uScreenK * exp(-abs(along - uScreenAt) / 170.0);
        // how fine the patterns are here: past a pixel they settle to their average (no shimmer)
        float fw = fwidth(along) + fwidth(x) + fwidth(h);
        float near = 1.0 - smoothstep(0.25, 1.1, fw);
        if (uStyle < 0.5) {
          // the auditorium: dark carpet on the tiers, step lights in the risers, acoustic panels,
          // sconces, stars in the ceiling, the screen's blue on everything
          if (part == 0) {
            col = vec3(0.05, 0.03, 0.055) * (0.8 + 0.4 * mix(0.5, n2(vec2(x, along) * 1.7), near));
            float aisle = smoothstep(0.35, 0.0, abs(abs(x) - 8.6)) * step(0.55, fract(along / 1.4)) * near;
            col += uWarm * aisle * 1.1 * step(abs(x), 10.0);
          } else if (part == 9) {
            // a riser: a strip of little warm lights along its top
            col = vec3(0.03, 0.02, 0.03);
            float k = smoothstep(0.35, 0.0, abs(fract(along / 1.8) - 0.5) - 0.12) * smoothstep(0.2, 0.0, abs(h - (floor(h / 1.35 + 0.999) * 1.35 - 0.25)));
            col += uWarm * mix(0.25, k * 1.8, near) * (0.85 + 0.3 * uBeat * uLift);
          } else if (part == 3) {
            col = vec3(0.016, 0.018, 0.034);
            vec2 sq = vec2(x / 5.0, along / 5.0);
            vec2 g = fract(sq) - 0.5;
            float st = smoothstep(0.07, 0.0, length(g - (vec2(h2(floor(sq)), h2(floor(sq) + 7.0)) - 0.5) * 0.6)) * step(0.45, h2(floor(sq) + 3.0));
            float tw = 0.55 + 0.45 * sin(uTime * 2.3 + h2(floor(sq)) * 40.0);
            col += vec3(0.75, 0.85, 1.0) * mix(0.03, st * 1.6, near) * tw * (1.0 + 1.5 * uBeat * uLift);
          } else if (part == 1 || part == 2) {
            float panel = fract(along / 3.2);
            col = vec3(0.055, 0.05, 0.08) * (0.65 + 0.35 * mix(0.9, smoothstep(0.0, 0.05, panel) * smoothstep(1.0, 0.95, panel), near));
            col = mix(col, vec3(0.09, 0.03, 0.05), step(h, 10.0));
            col += vec3(0.6, 0.45, 0.2) * smoothstep(0.12, 0.0, abs(h - 10.0)) * 0.5;
            vec2 sc = vec2(fract(along / 15.0) - 0.5, h - 15.0);
            col += uWarm * (exp(-sc.x * sc.x * 900.0 - sc.y * sc.y * 0.9) * 1.6 + exp(-sc.x * sc.x * 60.0) * exp(-abs(sc.y) * 0.35) * 0.14);
          } else {
            col = vec3(0.04, 0.035, 0.05);
          }
          col *= uDim;
          col += uScreenCol * scr * (part == 0 || part == 9 ? 0.12 : 0.24) * (0.8 + 0.2 * sin(uTime * 0.7 + along * 0.01)) * (0.7 + 0.3 * uDim);
        } else if (uStyle < 1.5) {
          // the lobby: the carpet you remember, red walls, gold trim, posters lit from inside
          if (part == 0) {
            vec2 q = vec2(x, along) * 0.55;
            vec2 c = floor(q), f = fract(q) - 0.5;
            float r = h2(c);
            vec3 ink = r < 0.33 ? vec3(0.1, 0.75, 0.8) : (r < 0.66 ? vec3(0.95, 0.22, 0.6) : vec3(1.0, 0.75, 0.2));
            vec2 o = f + (vec2(h2(c + 3.0), h2(c + 9.0)) - 0.5) * 0.4;
            float dot1 = smoothstep(0.2, 0.15, length(o));
            float bar = smoothstep(0.07, 0.03, abs(o.x * 0.7 + o.y * (h2(c + 5.0) - 0.5) * 1.6)) * step(length(o), 0.34);
            col = vec3(0.03, 0.02, 0.07) + ink * mix(0.06, mix(dot1, bar, step(0.5, h2(c + 11.0))) * step(0.35, h2(c + 7.0)) * 0.42, near);
          } else if (part == 3) {
            col = vec3(0.025, 0.014, 0.02);
            vec2 g = vec2(fract(x / 7.0) - 0.5, fract(along / 7.0) - 0.5);
            col += uWarm * mix(0.05, smoothstep(0.07, 0.0, length(g)) * 2.2, near);
            col += uAccent * smoothstep(0.6, 0.0, abs(x)) * (1.1 + 0.6 * uBeat);
          } else if (part == 1 || part == 2) {
            col = vec3(0.17, 0.016, 0.03) * (0.75 + 0.25 * n2(vec2(along * 0.2, h * 0.5)));
            col += vec3(0.95, 0.68, 0.26) * (smoothstep(0.1, 0.0, abs(h - 2.6)) + smoothstep(0.1, 0.0, abs(h - 15.0))) * 0.55;
            float pc = floor(along / 26.0);
            vec2 pp = vec2(fract(along / 26.0) * 26.0 - 13.0, h - 8.6);
            if (abs(pp.x) < 3.4 && abs(pp.y) < 5.1) {
              float id = mod(pc + (part == 1 ? 0.0 : 3.0), 8.0);
              float u = part == 1 ? 0.5 - pp.x / 6.8 : 0.5 + pp.x / 6.8;
              float v = 0.5 - pp.y / 10.2;
              // what the posters show at this point of the song (vT: the song time of this stretch of wall)
              float pid = mod(pc * 1.7 + (part == 1 ? 0.0 : 0.5), 1.0);
              float credits = step(79.4, vT) * (1.0 - step(84.0, vT));
              float blank = smoothstep(89.0 + pid * 1.6, 89.6 + pid * 1.6, uSong) * step(84.0, vT);
              float ducks = smoothstep(91.2 + pid * 0.8, 91.6 + pid * 0.8, uSong) * step(84.0, vT);
              float row = ducks > 0.5 ? 2.0 : floor(id / 4.0);
              vec2 uv = vec2((u + mod(id, 4.0)) / 4.0, 1.0 - (v + row) / 3.0);
              vec3 pc3 = texture2D(uPosters, uv).rgb * 1.5;
              if (credits > 0.5) {
                // the credits rolling up: lines of small white type on black
                float ly = v * 16.0 + uSong * 2.2 + pid * 7.0;
                float line = step(0.35, fract(ly)) * step(fract(ly), 0.75);
                float w = 0.18 + 0.3 * h2(vec2(floor(ly), pc));
                float word = step(abs(u - 0.5), w) * step(0.25, fract(u * 9.0 + h2(vec2(floor(ly), 3.0))));
                pc3 = vec3(0.9) * line * word * mix(0.4, 1.0, near) + vec3(0.02);
              }
              pc3 = mix(pc3, vec3(0.86, 0.84, 0.8), blank * (1.0 - ducks));
              col = pc3;
            }
            float frame = step(abs(pp.x), 3.75) * step(abs(pp.y), 5.45) * (1.0 - step(abs(pp.x), 3.4) * step(abs(pp.y), 5.1));
            col = mix(col, vec3(1.0, 0.82, 0.45) * 1.4, frame);
          } else {
            col = vec3(0.17, 0.016, 0.03);
          }
        } else if (uStyle < 2.5) {
          // the room: wallpaper far off, the floor far below, the dresser you ride along
          if (part == 5) {
            float grain = n2(vec2(x * 0.5, along * 0.012)) * 0.55 + n2(vec2(x * 2.4, along * 0.04)) * 0.3 * near + 0.15 * sin(x * 1.3 + n2(vec2(along * 0.01, x)) * 6.0);
            col = vec3(0.34, 0.18, 0.09) * (0.65 + 0.55 * grain);
            col += uWarm * 0.12 * smoothstep(0.55, 0.95, n2(vec2(x * 0.06, along * 0.003)));
          } else if (part == 4) {
            col = vec3(0.24, 0.12, 0.06);
            float dr = fract(h / 46.0);
            col *= 0.7 + 0.3 * smoothstep(0.0, 0.025, dr) * smoothstep(1.0, 0.975, dr);
            vec2 hd = vec2(fract(along / 80.0) - 0.5, fract(h / 46.0) - 0.5);
            col += vec3(0.95, 0.72, 0.35) * smoothstep(0.05, 0.0, length(hd * vec2(4.0, 1.0)) - 0.03) * 0.7;
          } else if (part == 0) {
            vec2 q = vec2(x, along) / 46.0;
            col = vec3(0.1, 0.04, 0.05) + vec3(0.22, 0.12, 0.07) * smoothstep(0.35, 0.5, abs(sin(q.x * 3.0) * sin(q.y * 3.0)));
          } else if (part == 3) {
            col = vec3(0.42, 0.38, 0.32);
          } else if (part == 1 || part == 2) {
            float st = fract(along / 34.0);
            col = mix(vec3(0.56, 0.48, 0.38), vec3(0.47, 0.37, 0.32), smoothstep(0.45, 0.5, st) * smoothstep(1.0, 0.95, st));
            vec2 fl = vec2(fract(along / 11.0) - 0.5, fract(h / 13.0) - 0.5);
            col = mix(col, vec3(0.62, 0.32, 0.34), smoothstep(0.12, 0.06, length(fl)) * 0.6 * near);
            // the lamp throws the ducks' shadows up the walls, and in the choruses they dance
            if (uShadow > 0.001) {
              float cell = floor(along / 150.0);
              vec2 dp = vec2(fract(along / 150.0) - 0.5, (h - 60.0 - 30.0 * h2(vec2(cell, 2.0))) / 150.0);
              float hop = uBeat * 0.09 * step(0.5, mod(cell, 2.0) + 0.5 * step(0.5, h2(vec2(cell, 5.0))));
              dp.y -= hop;
              float sc = 0.55 + 0.25 * h2(vec2(cell, 9.0));
              float d = duckSide(vec2(part == 1 ? -dp.x : dp.x, dp.y) / sc * 1.8);
              col *= 1.0 - 0.62 * uShadow * smoothstep(0.03, -0.03, d);
            }
          } else {
            col = vec3(0.4, 0.36, 0.3);
          }
          col *= uLight;
        } else {
          // inside the claw machine: a sea of ducks seen from above, the glass with the lobby blurred
          // past it, the chrome, the lights racing round the top, the gantry overhead
          if (part == 0) {
            vec2 q = vec2(x, along) / 1.55;
            vec2 c = floor(q), f = fract(q) - 0.5;
            float a = h2(c) * 6.2832;
            vec2 o = f + (vec2(h2(c + 1.3), h2(c + 2.9)) - 0.5) * 0.25;
            vec2 r = vec2(cos(a) * o.x - sin(a) * o.y, sin(a) * o.x + cos(a) * o.y);
            float body = length(r * vec2(1.0, 1.45)) - 0.36;
            float head = length(r - vec2(0.24, 0.0)) - 0.17;
            float beak = length((r - vec2(0.44, 0.0)) * vec2(1.0, 2.2)) - 0.09;
            float k = h2(c + 5.5);
            vec3 dc = k < 0.8 ? vec3(1.0, 0.78, 0.12) : (k < 0.86 ? vec3(1.0, 0.45, 0.65) : (k < 0.92 ? vec3(0.35, 0.6, 1.0) : (k < 0.96 ? vec3(0.95, 0.95, 0.97) : vec3(0.08))));
            vec3 duck = dc * (0.75 + 0.4 * smoothstep(0.0, -0.3, min(body, head)));
            duck = mix(duck, vec3(1.0, 0.45, 0.06), smoothstep(0.02, -0.02, beak) * step(0.0, -beak + 0.04));
            duck = mix(duck, vec3(0.02), smoothstep(0.03, 0.0, length(r - vec2(0.29, 0.07)) - 0.03));
            float in1 = smoothstep(0.03, -0.03, min(min(body, head), beak));
            vec3 avg = vec3(0.62, 0.48, 0.12);
            col = mix(vec3(0.12, 0.08, 0.02), duck, in1);
            col = mix(avg, col, near);
            col *= 0.55 + 0.45 * smoothstep(-1.0, 8.0, h);
          } else if (part == 1 || part == 2) {
            // the glass: the lobby beyond, red and gold, blurred
            float s = part == 1 ? -1.0 : 1.0;
            vec2 lq = vec2(along * 0.07, h * 0.09);
            vec3 lob = vec3(0.22, 0.03, 0.05) * (0.7 + 0.5 * n2(lq));
            lob += vec3(1.0, 0.7, 0.3) * 0.25 * smoothstep(0.75, 0.95, n2(lq * 2.3 + 4.0));
            float post = step(abs(fract(along / 31.0) - 0.5), 0.09) * smoothstep(9.0, 12.0, h) * smoothstep(26.0, 22.0, h);
            lob = mix(lob, vec3(0.3, 0.55, 1.0) * (0.5 + 0.5 * n2(vec2(along * 0.3, h * 0.2))), post * 0.6);
            col = lob * 0.55;
            // reflections sliding across it as you pass
            float sh = fract((along - uCam.x * 0.0) / 23.0 + h / 40.0);
            col += vec3(0.75, 0.85, 1.0) * 0.12 * smoothstep(0.08, 0.0, abs(sh - 0.5)) * near;
            // chrome mullions and rails
            float mul = smoothstep(5.25, 5.65, abs(fract(along / 12.0) - 0.5) * 12.0);
            float rail = smoothstep(0.5, 0.0, abs(h - 13.9)) + smoothstep(0.5, 0.0, abs(h - 31.0)) + smoothstep(0.35, 0.0, abs(h - 22.5)) * 0.6;
            col = mix(col, vec3(0.75, 0.78, 0.85) * (0.5 + 0.5 * n2(vec2(along * 0.5, h))), clamp(mul * mix(0.5, 1.0, near) + rail, 0.0, 1.0));
            // the lights racing round the top, faster in the chorus, a flash on every beat
            float bulbs = smoothstep(0.32, 0.0, length(vec2(fract(along / 1.2) - 0.5, (h - 29.6) * 0.8))) * near;
            float chase = step(0.55, fract(along / 4.8 - uTime * (0.9 + 2.2 * uLift)));
            vec3 bc = mix(vec3(1.0, 0.3, 0.7), vec3(1.0, 0.85, 0.3), step(0.5, fract(along / 9.6)));
            col += bc * (bulbs * (0.35 + 1.5 * chase * (0.6 + 0.6 * uBeat)) + smoothstep(1.4, 0.0, abs(h - 29.6)) * 0.12 * (0.3 + uBeat * uLift));
          } else if (part == 3) {
            col = vec3(0.02, 0.02, 0.03);
            float rails = smoothstep(0.6, 0.0, abs(abs(x) - 7.0) - 0.5);
            float cross = smoothstep(0.5, 0.0, abs(fract(along / 14.0) - 0.5) * 14.0 - 0.6);
            col = mix(col, vec3(0.6, 0.62, 0.7) * (0.45 + 0.4 * n2(vec2(along * 0.4, x))), clamp(rails + cross * 0.8, 0.0, 1.0));
            col += vec3(1.0, 0.85, 0.5) * smoothstep(0.5, 0.0, abs(x)) * (0.8 + 0.8 * uBeat);
          } else {
            col = vec3(0.1, 0.1, 0.12);
          }
        }
        // the end walls and their doors take the hall's light
        if (part == 6) {
          col = uStyle < 0.5 ? vec3(0.05, 0.05, 0.075) * uDim : (uStyle < 1.5 ? vec3(0.16, 0.02, 0.03) : (uStyle < 2.5 ? vec3(0.47, 0.4, 0.33) * uLight : vec3(0.08, 0.1, 0.14)));
          if (uStyle > 2.5) {
            // the machine's front: glass, its chrome bars, the lights round the window
            col = vec3(0.05, 0.03, 0.06) + vec3(0.18, 0.03, 0.08) * (0.5 + 0.5 * n2(vec2(x * 0.05, h * 0.05))) + vec3(0.7, 0.8, 1.0) * 0.14 * smoothstep(0.44, 0.49, abs(fract((x + h) / 19.0) - 0.5)) * near;
            // a row of lights round the top of the machine, chasing on the beat
            col += mix(vec3(1.0, 0.3, 0.7), vec3(1.0, 0.85, 0.3), step(0.5, fract(x / 6.0))) * smoothstep(0.35, 0.0, length(vec2(fract(x / 1.5) - 0.5, (h - 32.5) * 0.7))) * (0.4 + 1.4 * step(0.55, fract(x / 6.0 - uTime * 1.5)) * (0.6 + 0.6 * uBeat)) * near;
            col = mix(col, vec3(0.75, 0.78, 0.85) * 0.7, smoothstep(3.75, 4.2, abs(fract(x / 9.0) - 0.5) * 9.0));
          }
          if (uStyle > 1.5 && uStyle < 2.5) { vec2 fl = vec2(fract(x / 11.0) - 0.5, fract(h / 13.0) - 0.5); col = mix(col, vec3(0.62, 0.32, 0.34) * uLight, smoothstep(0.12, 0.06, length(fl)) * 0.6 * near); }
        } else if (part == 8) {
          col = (uStyle < 1.5 ? uWarm * 1.5 : (uStyle < 2.5 ? vec3(0.95, 0.9, 0.8) * uLight : vec3(1.0, 0.4, 0.8) * (1.2 + 1.2 * uBeat)));
        } else if (part == 10) {
          // a door leaf: padded in the auditorium, wood and brass elsewhere, a push bar across it
          col = uStyle < 0.5 ? vec3(0.08, 0.03, 0.05) * (0.8 + 0.2 * step(0.08, fract(h / 1.4))) : (uStyle > 2.5 ? vec3(0.06, 0.06, 0.08) : vec3(0.22, 0.09, 0.05));
          col = mix(col, vec3(0.95, 0.75, 0.35), step(abs(h - 6.2), 0.25) * step(0.6, x) * step(x, 4.6));
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// a quad for a cap or a door, with what the hall's material needs to paint it
function capQuad(xa, ya, xb, yb, z, part, t) {
  const g = new THREE.PlaneGeometry(Math.max(0.01, xb - xa), Math.max(0.01, yb - ya)); g.translate((xa + xb) / 2, (ya + yb) / 2, z);
  const n = g.attributes.position.count, P = g.attributes.position.array;
  const pa = new Float32Array(n).fill(part), co = new Float32Array(n * 3), tt = new Float32Array(n).fill(t);
  for (let i = 0; i < n; i++) { co[i * 3] = P[i * 3]; co[i * 3 + 1] = P[i * 3 + 1]; co[i * 3 + 2] = 0; }
  g.setAttribute('aPart', new THREE.BufferAttribute(pa, 1)); g.setAttribute('aCoord', new THREE.BufferAttribute(co, 3)); g.setAttribute('aT', new THREE.BufferAttribute(tt, 1));
  return g;
}

export class Hall {
  constructor(scene, course, span, mat, floorFn) {
    this.course = course; this.span = span; this.floor = floorFn;
    this.ring = RINGS[span.style](...(span.dims || []));
    this.style = STYLE[span.style];
    this.W = Math.max(...this.ring.map((r) => Math.abs(r[0])));
    this.H = Math.max(...this.ring.map((r) => r[1]));
    // sharp breaks: the dresser top isn't there before deskFrom, nor over the road's gaps.
    // 'gap' means the gap the hall starts on: the dresser begins where the road comes back.
    this.cuts = (span.cuts || []).slice();
    const gaps = course.gaps || [];
    let desk = span.deskFrom;
    if (desk === 'gap') { const g = gaps.find((g) => Math.abs(g.lip - span.from) < 0.3); desk = g ? g.to : undefined; }
    if (desk !== undefined) this.cuts.push([span.from - 1, desk]);
    if (span.cutGaps) for (const g of gaps) if (g.lip > span.from + 0.5 && g.lip < span.to) this.cuts.push([g.from, g.to]);
    const N = 160, M = this.ring.length;
    this.N = N; this.M = M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.coord = new Float32Array(N * M * 3); this.part = new Float32Array(N * M); this.tt = new Float32Array(N * M);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { if (this.ring[j][3] !== this.ring[j + 1][3]) continue; const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    this.idxPerRow = idx.length / (N - 1);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCoord', new THREE.BufferAttribute(this.coord, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(this.tt, 1).setUsage(THREE.DynamicDrawUsage));
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.part[i * M + j] = this.ring[j][3];
    g.setAttribute('aPart', new THREE.BufferAttribute(this.part, 1));
    this.geo = g;
    this.mat = mat;
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -4;
    this.dim = 1;
    this.mesh.onBeforeRender = () => { mat.uniforms.uStyle.value = this.style; mat.uniforms.uDim.value = this.dim; mat.uniformsNeedUpdate = true; };
    scene.add(this.mesh);
    // the walls at either end, with a door in them
    const want = span.caps || [true, true];
    this.caps = [span.from, span.to].map((t, k) => (want[k] ? this._cap(scene, t, k, want[k] === true ? {} : want[k]) : null)).filter(Boolean);
    this._p = new THREE.Vector3();
    this.rowT = new Float32Array(N);
  }

  _cap(scene, t, k, spec) {
    const sp = this.span, c = this.course, room = sp.style === 'room';
    prepare(c, null);
    const fy = this.floor(t);
    // the opening is always tall and wide enough for her and the camera behind her
    const above = c.sample(t).y - fy;
    const hw = Math.max(spec.hw ?? 11, c.sample(t).width + 3.5), hh = Math.max(spec.hh ?? 13, above + 7.5);
    const W = room ? 340 : this.W + 0.5;
    const y0 = room ? ROOM_F - fy : (spec.kind === 'front' ? -fy - 2 : 0), y1 = room ? 420 - fy : this.H + (spec.kind === 'front' ? 30 : 4);
    const parts = [];
    for (const [xa, ya, xb, yb] of [[-W, y0, -hw, y1], [hw, y0, W, y1], [-hw, hh, hw, y1]]) parts.push(capQuad(xa, ya, xb, yb, 0, 6, t));
    if (y0 < 0) parts.push(capQuad(-hw, y0, hw, 0, 0, 6, t));
    // the frame round the opening, lit
    for (const z of [0.08, -0.08]) for (const [xa, ya, xb, yb] of [[-hw - 0.8, 0, -hw, hh + 0.8], [hw, 0, hw + 0.8, hh + 0.8], [-hw, hh, hw, hh + 0.8]]) parts.push(capQuad(xa, ya, xb, yb, z, 8, t));
    const grp = new THREE.Group();
    const mesh = new THREE.Mesh(merge(parts), this.mat);
    const mat = this.mat, style = this.style;
    mesh.onBeforeRender = () => { mat.uniforms.uStyle.value = style; mat.uniforms.uDim.value = this.dim; mat.uniformsNeedUpdate = true; };
    mesh.frustumCulled = false;
    grp.add(mesh);
    // doors that swing open on their beat (away from her)
    const leaves = [];
    if (spec.open !== undefined) {
      for (const s of [-1, 1]) {
        const piv = new THREE.Group(); piv.position.set(s * hw, 0, 0.1);
        const leaf = new THREE.Mesh(capQuad(0, 0, hw, hh, 0, 10, t), mat);
        if (s > 0) leaf.rotation.y = Math.PI;
        leaf.onBeforeRender = mesh.onBeforeRender; leaf.frustumCulled = false;
        piv.add(leaf); grp.add(piv); leaves.push({ piv, s });
      }
    }
    grp.userData = { t, fy, k, spec, leaves, hh, hw };
    scene.add(grp);
    return grp;
  }

  update(track, rider, songT) {
    const sp = this.span, c = this.course;
    const ta = Math.max(sp.from, rider.t - (rider.stopping ? 20 : 4)), tb = Math.min(sp.to, rider.t + 46);
    const shown = rider.t > (sp.showFrom ?? -1e9);
    const on = tb > ta + 0.05 && shown;
    this.mesh.visible = on;
    for (const cap of this.caps) {
      const u = cap.userData, t = u.t;
      cap.visible = shown && t > rider.t - 3 && t < rider.t + 46;
      if (!cap.visible) continue;
      track.ground(t, 0, this._p);
      cap.position.set(this._p.x, u.fy, this._p.z);
      cap.rotation.set(0, c.sample(t).yaw, 0);
      if (u.leaves.length) { const a = smooth(u.spec.open, u.spec.open + 0.3, songT) * 1.75; for (const L of u.leaves) L.piv.rotation.y = -L.s * a; }
    }
    if (!on) return;
    const N = this.N, M = this.M, ring = this.ring, T = this.rowT;
    // the rows: spread over what's in view, plus a pair at the edges of every cut so it's sharp
    const rows = Math.max(8, Math.min(N - 8, Math.ceil((tb - ta) * 7) + 2));
    let n = 0;
    for (let i = 0; i < rows; i++) T[n++] = ta + (tb - ta) * (i / (rows - 1));
    for (const [a, b] of this.cuts) for (const e of [a, b]) if (e > ta + 0.01 && e < tb - 0.01 && n < N - 1) { T[n++] = e - 0.004; T[n++] = e + 0.004; }
    for (let i = 1; i < n; i++) { const v = T[i]; let j = i - 1; while (j >= 0 && T[j] > v) { T[j + 1] = T[j]; j--; } T[j + 1] = v; }
    this.rows = n;
    const cum = this._cum || (this._cum = new Float32Array(N));
    const smp = this._smp || (this._smp = {});
    let lx = 0, lz = 0;
    for (let i = 0; i < n; i++) {
      const t = T[i];
      const fy = this.floor(t);
      let cut = false;
      for (const [a, b] of this.cuts) if (t > a && t < b) { cut = true; break; }
      // the middle of this row and the way across it: every point of the row is on that line
      track.ground(t, 0, this._p);
      const cx = this._p.x, cz = this._p.z, yaw = c.sample(t, smp).yaw, ax = -Math.cos(yaw), az = Math.sin(yaw);
      for (let j = 0; j < M; j++) {
        const [x, y, rel, part] = ring[j];
        const o = (i * M + j) * 3;
        let yy = rel ? fy + y : y;
        if (cut && (part === 4 || part === 5)) yy = ROOM_F;
        this.pos[o] = cx + ax * x; this.pos[o + 1] = yy; this.pos[o + 2] = cz + az * x;
        this.coord[o] = x; this.coord[o + 1] = rel ? y : y - fy;
        this.tt[i * M + j] = t;
      }
      cum[i] = i ? cum[i - 1] + Math.hypot(cx - lx, cz - lz) : 0;
      lx = cx; lz = cz;
    }
    // distance along, fixed to the world so the patterns don't slide
    let base;
    if (rider.t <= T[0]) {
      let d = 0, px = 0, pz = 0;
      for (let k = 0; k <= 24; k++) { track.ground(rider.t + (T[0] - rider.t) * k / 24, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; }
      base = rider.stats.dist + d;
    } else {
      let i = 0; while (i < n - 2 && T[i + 1] < rider.t) i++;
      const f = clamp((rider.t - T[i]) / Math.max(1e-6, T[i + 1] - T[i]), 0, 1);
      base = rider.stats.dist - (cum[i] + (cum[i + 1] - cum[i]) * f);
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < M; j++) this.coord[(i * M + j) * 3 + 2] = cum[i] + base;
    this.geo.setDrawRange(0, (n - 1) * this.idxPerRow);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aCoord.needsUpdate = true; this.geo.attributes.aT.needsUpdate = true;
    if (sp.screenAt !== undefined) {
      // the screen's distance along, so its light falls off from it
      const ts = sp.screenAt;
      if (ts <= T[0]) this.screenAlong = base - (T[0] - ts) * Math.max(rider.v, 15);
      else if (ts >= T[n - 1]) this.screenAlong = base + cum[n - 1] + (ts - T[n - 1]) * Math.max(rider.v, 15);
      else { let i = 0; while (i < n - 2 && T[i + 1] < ts) i++; const f = (ts - T[i]) / Math.max(1e-6, T[i + 1] - T[i]); this.screenAlong = base + cum[i] + (cum[i + 1] - cum[i]) * f; }
    }
  }
}

// ---------- the claw machine, the concession stand, ducks great and small ----------
const CG = {
  claw() {
    const parts = [];
    const base = new THREE.BoxGeometry(2.4, 1.1, 2.0); base.translate(0, 0.55, 0); parts.push(base);
    const top = new THREE.BoxGeometry(2.5, 0.55, 2.1); top.translate(0, 2.95, 0); parts.push(top);
    for (const x of [-1.17, 1.17]) for (const z of [-0.97, 0.97]) { const p = new THREE.BoxGeometry(0.08, 1.85, 0.08); p.translate(x, 2.0, z); parts.push(p); }
    const chute = new THREE.BoxGeometry(0.6, 0.5, 0.1); chute.translate(0.65, 0.55, 1.02); parts.push(chute);
    return merge(parts);
  },
  clawLight() {
    // the lit panels: the sign on top and the strip under the glass
    const a = new THREE.PlaneGeometry(2.3, 0.4); a.translate(0, 2.95, 1.06);
    const b = new THREE.PlaneGeometry(2.3, 0.14); b.translate(0, 1.12, 1.01);
    const c2 = new THREE.PlaneGeometry(2.3, 0.4); c2.rotateY(Math.PI); c2.translate(0, 2.95, -1.06);
    return merge([a, b, c2]);
  },
  claw2() {
    // the claw itself, hanging
    const parts = [];
    const r = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4); r.translate(0, 2.35, 0); parts.push(r);
    const hub = new THREE.CylinderGeometry(0.12, 0.09, 0.14, 8); hub.translate(0, 1.95, 0); parts.push(hub);
    for (let k = 0; k < 3; k++) { const f = new THREE.BoxGeometry(0.04, 0.32, 0.04); f.translate(0, -0.16, 0.1); f.rotateX(0.35); f.rotateY(k * 2.09); f.translate(0, 1.9, 0); parts.push(f); }
    return merge(parts);
  },
  glass() { const g = new THREE.BoxGeometry(2.3, 1.75, 1.9); g.translate(0, 2.0, 0); return g; },
  counter() {
    const parts = [];
    const c = new THREE.BoxGeometry(16, 1.15, 2.4); c.translate(0, 0.58, 0); parts.push(c);
    const back = new THREE.BoxGeometry(16, 5.5, 0.6); back.translate(0, 2.75, -3.2); parts.push(back);
    return merge(parts);
  },
  popcorn() { const g = new THREE.BoxGeometry(1.6, 1.9, 1.2); g.translate(0, 2.1, 0); return g; },
  menuBoard() { const g = new THREE.PlaneGeometry(12, 2.6); g.translate(0, 4.6, -2.85); return g; },
  pirateHat() {
    const brim = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 3); brim.rotateY(Math.PI / 6); brim.translate(0, 0.83, 0.32);
    const crown = new THREE.CylinderGeometry(0.2, 0.3, 0.3, 12); crown.translate(0, 0.98, 0.32);
    return merge([brim, crown]);
  },
  captainHat() {
    const top = new THREE.CylinderGeometry(0.34, 0.3, 0.16, 16); top.translate(0, 0.92, 0.33);
    const band = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16); band.translate(0, 0.84, 0.33);
    const peak = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI); peak.scale(1, 1, 0.7); peak.translate(0, 0.8, 0.48);
    return merge([top, band, peak]);
  },
  lampBase() {
    const b = new THREE.CylinderGeometry(9, 12, 6, 20); b.translate(0, 3, 0);
    const stem = new THREE.CylinderGeometry(1.4, 1.8, 40, 12); stem.translate(0, 26, 0);
    return merge([b, stem]);
  },
  lampShade() { const s = new THREE.CylinderGeometry(14, 22, 22, 24, 1, true); s.translate(0, 52, 0); return s; },
};

function glowBox(color, k = 1.6) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }); }
function lightPanelMaterial() {
  // per-instance colour, lit from inside, a chase running along it
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 aTint; varying vec3 vC; varying vec2 vUv; void main(){ vC = aTint; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT; varying vec3 vC; varying vec2 vUv; void main(){ float chase = 0.75 + 0.25 * step(0.5, fract(vUv.x * 6.0 - uT * 2.0)); gl_FragColor = vec4(vC * chase, 1.0); }`,
    uniforms: { uT: { value: 0 } }, side: THREE.DoubleSide,
  });
}
function glassMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCam; varying vec3 vN; varying vec3 vW; void main(){ vec3 V = normalize(uCam - vW); float f = pow(max(1.0 - abs(dot(normalize(vN), V)), 0.0), 3.0); gl_FragColor = vec4(vec3(0.6, 0.8, 1.0) * (0.05 + 0.5 * f), 1.0); }`,
    uniforms: { uCam: { value: new THREE.Vector3() } }, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}
function duckMaterial() { return new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0, emissive: new THREE.Color(0x261a00) }); }
// the big ducks: yellow parts take the instance's colour; lit a little by themselves
function tintedDuckMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.28, metalness: 0, emissive: new THREE.Color(0x140e00) });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n if (vColor.r > 0.9 && vColor.g > 0.6) diffuseColor.rgb = vTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.16;');
  };
  m.customProgramCacheKey = () => 'dckGiantDuck';
  return m;
}

const TT = { aTint: 3 };
extend({
  layers: {
    claw: (M) => [CG.claw(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 60, TT],
    clawLight: (M) => [CG.clawLight(), M.panel || (M.panel = lightPanelMaterial()), 60, TT],
    claw2: (M) => [CG.claw2(), M.metal, 60, TT],
    glass: (M) => [CG.glass(), M.glass || (M.glass = glassMaterial()), 60, {}],
    pile: (M) => [(() => { const g = duckGeometry(); g.scale(0.3, 0.3, 0.3); return g; })(), M.duckM || (M.duckM = duckMaterial()), 1500, {}],
    counter: (M) => [CG.counter(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 6, TT],
    popcorn: (M) => [CG.popcorn(), M.popcornM || (M.popcornM = glowBox(0xffd06a, 1.5)), 12, {}],
    menuBoard: (M) => [CG.menuBoard(), M.panel || (M.panel = lightPanelMaterial()), 6, TT],
    giantDuck: (M) => [(() => { const g = duckGeometry(); return g; })(), M.gDuck || (M.gDuck = tintedDuckMaterial()), 440, TT],
    pirateHat: (M) => [CG.pirateHat(), M.hat || (M.hat = tintMaterial(0xffffff, { rough: 0.6 })), 60, TT],
    captainHat: (M) => [CG.captainHat(), M.hat || (M.hat = tintMaterial(0xffffff, { rough: 0.6 })), 60, TT],
    lampBase: (M) => [CG.lampBase(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 4, TT],
    dckLampShade: (M) => [CG.lampShade(), M.shade || (M.shade = glowBox(0xffd8a0, 1.3)), 4, {}],
  },
  parts: {
    claw(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s));
      S.layers.claw.add(m, { aTint: it.tint }); S.layers.clawLight.add(m, { aTint: it.light }); S.layers.glass.add(m);
      // the claw sways over the ducks
      const sw = Math.sin((S.tNow ?? 0) * 1.7 + it.seed * 9) * 0.35;
      const o = S._o.set(sw * it.s, 0, 0).applyQuaternion(q).add(p);
      m.compose(o, q, S._s.set(it.s, it.s, it.s)); S.layers.claw2.add(m, { aTint: [0.8, 0.8, 0.85] });
      // the ducks, faces to the glass
      const R = it.ducks;
      for (let k = 0; k < R.length; k++) {
        const d = R[k];
        const w = S._o.set(d[0] * it.s, (1.25 + d[1]) * it.s, d[2] * it.s).applyQuaternion(q).add(p);
        S._e.set(d[4], it.yaw0 + d[3], 0); const dq = S._q2 ? S._q2.setFromEuler(S._e) : (S._q2 = new THREE.Quaternion().setFromEuler(S._e));
        m.compose(w, dq, S._s.set(it.s, it.s, it.s)); S.layers.pile.add(m);
      }
      // its light on the carpet, and a glow round it: a light he can't get past
      poolAt(S, p.x, p.y + 0.05, p.z, 9 * it.s, it.light, 0.6 * (it.beacon ? 2.2 : 1));
      if (it.beacon) {
        const k = 0.8 + 0.5 * (S.beat || 0);
        glowAt(S, p.x, p.y + 2.2 * it.s, p.z, 9 * it.s, it.light, 0.55 * k);
        glowAt(S, p.x, p.y + 3.1 * it.s, p.z, 3.4 * it.s, [1, 0.95, 0.9], 0.9 * k);
      }
    },
    giantDuck(S, it, p, q, yaw) {
      // in the room's choruses the ducks hop on the beat, a wave running down the dresser
      let hop = 0;
      if (it.hop && S.dckHop > 0) { const b = S.dckBeatF ?? 0; hop = S.dckHop * Math.max(0, Math.sin(Math.PI * clamp(b * 1.6 - (it.seed % 1) * 0.35, 0, 1))) * it.s * 0.45; }
      if (hop > 0) { p.y += hop; S._e.set(-hop / it.s * 0.4, yaw, 0); q = (S._q3 || (S._q3 = new THREE.Quaternion())).setFromEuler(S._e); }
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.giantDuck.add(m, { aTint: it.tint });
      if (it.hat) S.layers[it.hat].add(m, { aTint: it.hat === 'pirateHat' ? [0.08, 0.07, 0.08] : [0.95, 0.95, 0.97] });
    },
    roomLamp(S, it, p, q) {
      const k = it.s ?? 1, on = 0.8 + 0.4 * (S.dckLamp ?? 0);
      const m = S._m; m.compose(p, q, S._s.set(k, k, k)); S.layers.lampBase.add(m, { aTint: [0.55, 0.42, 0.3] }); S.layers.dckLampShade.add(m);
      glowAt(S, p.x, p.y + 50 * k, p.z, 90 * k, [1, 0.82, 0.55], 0.55 * on);
      glowAt(S, p.x, p.y + 52 * k, p.z, 28 * k, [1, 0.92, 0.75], 0.8 * on);
      poolAt(S, p.x, p.y + 0.1, p.z, 120 * k, [1, 0.8, 0.5], 0.5 * on);
    },
  },
  kits: {
    // the claw machines: one where the song says (the light he can't get past), or a row of them
    claws(S, z, R) {
      const c = S.course;
      const fl = S.floorFn || ((t) => floorAt(c, t));
      const lights = [[2.2, 0.6, 1.4], [2.2, 1.6, 0.4], [0.5, 1.8, 2.2], [2.0, 0.5, 0.6], [1.0, 2.2, 0.8]];
      const cab = [[0.9, 0.12, 0.3], [0.15, 0.3, 0.9], [0.95, 0.75, 0.1], [0.1, 0.6, 0.5], [0.85, 0.85, 0.9]];
      const add = (t, x, s, beacon, faces) => {
        const ducks = [];
        for (let k = 0; k < 26; k++) ducks.push([(R() - 0.5) * 1.9, R() * 0.45 + (k > 18 ? 0.3 : 0), (R() - 0.5) * 1.5, (R() - 0.5) * 1.2, (R() - 0.5) * 0.5]);
        // ducks with their faces to the glass: a wall of them pressed to the front
        if (faces) { ducks.length = 0; for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) ducks.push([-0.95 + k * 0.32 + (R() - 0.5) * 0.05, r * 0.36 + (R() - 0.5) * 0.05, 0.72, (R() - 0.5) * 0.25 - (x > 0 ? 0 : 0), (R() - 0.5) * 0.2]); }
        const rot = x > 0 ? Math.PI / 2 : -Math.PI / 2;
        S.items.push({ t, x, h: fl(t, x), rot, yaw0: c.sample(t).yaw + rot, parts: 'claw', s, tint: pick(R, cab), light: beacon ? [2.4, 0.5, 1.4] : pick(R, lights), seed: R(), ducks, ahead: 14, beacon });
      };
      if (z.at !== undefined) add(z.at, z.x ?? 11.5, z.s ?? 2.6, z.beacon, z.faces);
      if (z.row) for (let t = z.from; t < z.to; t += 0.32 + R() * 0.12) for (const side of [-1, 1]) if (R() < 0.85) add(t + R() * 0.05, side * ((z.x ?? 11.5) + R() * 1.5), (z.s ?? 2.0) + R() * 0.4);
    },
    // every duck he ever won, standing along the dresser like statues; they hop in the choruses
    dresser(S, z, R) {
      const c = S.course;
      const fl = S.floorFn || ((t) => floorAt(c, t));
      const Y = [1, 0.78, 0.12];
      const tints = [Y, Y, Y, Y, [1, 0.42, 0.62], [0.3, 0.56, 1.0], [0.07, 0.07, 0.08], [0.95, 0.95, 0.97], [0.32, 0.78, 0.34], [0.58, 0.38, 0.9], [1, 0.55, 0.15]];
      const clear = z.clear || [];
      for (let t = z.from; t < z.to; t += 0.16 + R() * 0.12) {
        for (const side of [-1, 1]) {
          if (R() < 0.25) continue;
          if (clear.some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
          // the big ones stand further out, so none of them comes up through the road
          const s = 3.5 + R() * 5.5, x = side * Math.max(11 + R() * 16, 9.5 + 0.62 * s);
          const r = R();
          S.items.push({ t, x, h: fl(t, x), rot: (side > 0 ? 1 : -1) * (Math.PI / 2 + 0.3) + (R() - 0.5) * 0.6, s, parts: 'giantDuck', tint: pick(R, tints), hat: r < 0.06 ? 'pirateHat' : (r < 0.12 ? 'captainHat' : null), ahead: 24, hop: true, seed: t * 0.37 + R() });
        }
      }
    },
    roomLamp(S, z, R) {
      const c = S.course;
      const fl = S.floorFn || ((t) => floorAt(c, t));
      S.items.push({ t: z.at, x: z.x ?? 28, h: fl(z.at, z.x ?? 28), rot: 0, s: z.s ?? 0.5, parts: 'roomLamp', ahead: 46 });
    },
    // outside: the multiplex behind you, the car park under orange lamps
    carpark(S, z, R) {
      // the lot stands on the shelf under the road, so it's round her and not far below
      const fl = (t) => { prepare(S.course, S.plan); return dckFloor(S.course, S.plan, t); };
      for (let t = z.from; t < z.to; t += 0.36) for (const side of [-1, 1]) S.items.push({ t, x: side * 14, h: fl(t), rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), wake0: 0.6, ahead: 12 });
      // the cars nose in to the bays either side of the aisles (the bays are painted on the lot)
      for (let t = z.from; t < z.to; t += 0.2) for (const side of [-1, 1]) for (const row of [21, 27, 40, 46]) {
        if (R() < 0.4) continue;
        const tt = t + R() * 0.12;
        S.items.push({ t: tt, x: side * (row + (R() - 0.5) * 0.4), h: fl(tt), rot: side * Math.PI / 2 + (row === 27 || row === 46 ? 0 : Math.PI) + (R() - 0.5) * 0.08, parts: 'parked', tint: col(pick(R, [0xd8d0c8, 0x3a4a6a, 0xa83a3a, 0x2a2a2e, 0xe8e4dc, 0x5a7a5a, 0x8a8aa0, 0xffd23a])), ahead: 4.5 });
      }
      if (z.cinema) {
        // the multiplex's other screens along the lot, its signs out by the road
        for (const [dt, x] of [[2.5, -62], [5.5, 64], [9, -64], [13, 62], [17, -62], [21, 64]]) S.items.push({ t: z.from + dt, x, h: fl(z.from + dt), rot: x > 0 ? Math.PI / 2 : -Math.PI / 2, s: 2.2, sy: 0.5, parts: 'block', tint: col(0x5a4a6a), seed: R(), wake0: 0.9, keepLit: true });
        S.items.push({ t: z.from + 2.2, x: -24, s: 1.6, parts: 'sign', idx: S.atlas.index.MARQUEE, seed: R(), wake0: 1, keepLit: true, floor: true });
        S.items.push({ t: z.from + 3.6, x: 24, s: 1.4, parts: 'sign', idx: S.atlas.index.CINEMA, seed: R(), wake0: 1, keepLit: true, floor: true });
        S.items.push({ t: z.from + 12, x: -24, s: 1.4, parts: 'sign', idx: S.atlas.index.CINEMA, seed: R(), wake0: 1, keepLit: true, floor: true });
      }
    },
  },
});

// ---------- the screen ----------
// a blue night forest that glows: the film. Before it starts it's dark; on the final it bursts.
function screenMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 }, uCol: { value: new THREE.Color(0x2a8aff) }, uBurst: { value: 0 }, uBeat: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uT, uK, uBurst, uBeat; uniform vec3 uCol; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 uv = vUv;
        float sky = smoothstep(0.15, 1.0, uv.y);
        vec3 c = mix(uCol * 0.35, uCol * 0.95 + vec3(0.0, 0.16, 0.3), sky);
        // mountains floating in the mist with vines hanging off them, far hills, the canopy, ferns that glow
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 mc = vec2(0.14 + fi * 0.25 + 0.05 * sin(uT * 0.05 + fi), 0.62 + 0.12 * fract(fi * 0.37) + 0.012 * sin(uT * 0.3 + fi * 2.0));
          vec2 d = (uv - mc) * vec2(1.0, 2.2);
          float top = smoothstep(0.0, -0.01, length(d * vec2(1.0, 1.6)) - 0.075 - 0.02 * n2(uv * 30.0 + fi));
          float under = smoothstep(0.0, -0.01, abs(d.x) - 0.06 * (1.0 + (uv.y - mc.y) * 8.0)) * step(uv.y, mc.y) * step(mc.y - 0.11, uv.y);
          float rock = max(top * step(mc.y - 0.02, uv.y), under);
          c = mix(c, vec3(0.03, 0.06, 0.1) + uCol * 0.12 * (uv.y - mc.y + 0.1), rock * 0.92);
          float vine = step(abs(fract((uv.x - mc.x) * 90.0) - 0.5), 0.12) * step(abs(uv.x - mc.x), 0.06) * step(uv.y, mc.y) * step(mc.y - 0.07 - 0.06 * h2(vec2(floor((uv.x - mc.x) * 90.0), fi)), uv.y);
          c = mix(c, vec3(0.2, 0.9, 0.7) * (0.6 + 0.6 * uBurst), vine * 0.7);
        }
        float far = 0.42 + 0.08 * n2(vec2(uv.x * 3.0, 1.0)) + 0.04 * sin(uv.x * 9.0);
        c = mix(c, uCol * 0.45 + vec3(0.05, 0.12, 0.2), smoothstep(far + 0.01, far - 0.01, uv.y) * smoothstep(far - 0.18, far - 0.05, uv.y) * 0.7);
        float trees = n2(vec2(uv.x * 7.0, 0.0) + uT * 0.02) * 0.32 + 0.16;
        c *= 0.5 + 0.5 * smoothstep(trees, trees + 0.04, uv.y);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float fx = fract(uv.x * (3.0 + fi * 2.0) + fi * 0.37) - 0.5;
          float fh = 0.18 + 0.1 * h2(vec2(floor(uv.x * (3.0 + fi * 2.0) + fi * 0.37), fi));
          float frond = smoothstep(0.02, 0.0, abs(fx) - 0.25 * (1.0 - uv.y / fh)) * step(uv.y, fh);
          c = mix(c, vec3(0.1, 0.9, 0.85) * (0.6 + 0.6 * uBurst), frond * (0.35 + 0.45 * uBurst));
        }
        vec2 g = uv * vec2(46.0, 20.0) + vec2(uT * 0.4, -uT * 0.25);
        float sp = smoothstep(0.18, 0.0, length(fract(g) - 0.5)) * step(0.82 - 0.12 * uBurst, h2(floor(g)));
        c += vec3(0.5, 1.0, 1.0) * sp * (0.6 + 0.4 * sin(uT * 3.0 + h2(floor(g)) * 30.0)) * (1.0 + 0.8 * uBeat * uBurst);
        float edge = smoothstep(0.0, 0.012, uv.x) * smoothstep(1.0, 0.988, uv.x) * smoothstep(0.0, 0.025, uv.y) * smoothstep(1.0, 0.975, uv.y);
        gl_FragColor = vec4(c * edge * uK, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// the screen at the end of the last auditorium, and the one you walked out on at the start;
// in front of it in the first row, her, and the seat beside her with a duck on it
export class ScreenFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = 0;
    prepare(course, scenery.plan);
    this.floor = (t) => dckFloor(course, scenery.plan, t);
    this.mat = screenMaterial();
    const geo = new THREE.PlaneGeometry(78, 33);
    this.group = new THREE.Group(); scene.add(this.group);
    this.screen = new THREE.Mesh(geo, this.mat); this.group.add(this.screen);
    // the curtains either side of it, the stage under it
    const red = dckLit(0x8a0c1c, 0.22, 0.8);
    const cg = [];
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const f = new THREE.CylinderGeometry(1.2, 1.4, 46, 10); f.translate(s * (41 + k * 1.7), 6, -0.6 - (k % 2) * 0.5); cg.push(f); }
    const valance = new THREE.BoxGeometry(100, 6, 2); valance.translate(0, 22.5, -0.8); cg.push(valance);
    this.curtains = new THREE.Mesh(merge(cg), red); this.group.add(this.curtains);
    const stage = new THREE.Mesh(new THREE.BoxGeometry(96, 2.4, 10), dckLit(0x1a0a10, 0.1, 0.9)); stage.position.set(0, -16.5, -4); this.group.add(stage);
    // the one you walked out on, behind you at the start
    this.first = new THREE.Mesh(geo, this.mat); scene.add(this.first);
    // her: in the front row with her glasses on, the seat beside her, a duck on it
    this.her = new THREE.Group(); scene.add(this.her);
    const herMat = new THREE.MeshBasicMaterial({ map: dckHerTexture(), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false });
    // (she faces the screen, +z; from behind you see the seat backs, her head and hair over hers, the duck over the other)
    const sil = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), herMat); sil.position.set(0, 2.7, 0.15); sil.rotation.y = Math.PI; this.her.add(sil);
    const seatM = dckLit(0x6a0a14, 0.25, 0.8);
    const seats = [];
    for (const sx of [0, 2.4]) { const b = new THREE.BoxGeometry(2.1, 1.7, 0.35); b.translate(sx, 1.65, -0.55); seats.push(b); const s2 = new THREE.BoxGeometry(2.1, 0.45, 1.5); s2.translate(sx, 0.9, 0.25); seats.push(s2); }
    this.her.add(new THREE.Mesh(merge(seats), seatM));
    const duck = new THREE.Mesh(duckGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0x8a6400 }));
    duck.scale.setScalar(1.5); duck.position.set(2.4, 1.95, 0.2); duck.rotation.y = 0.4; this.her.add(duck);
    this.lit = 0.6; this.fired = false; this.earned = 0; this.burst = 0;
    this._p = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const c = this.course;
    const fy = this.floor(this.t);
    track.ground(this.t, 0, this._p);
    this.group.position.set(this._p.x, fy + 19, this._p.z);
    this.group.rotation.set(0, c.sample(this.t).yaw + Math.PI, 0);
    const t0 = this.cfg.startT ?? -3.6;
    track.ground(t0, 0, this._p);
    this.first.position.set(this._p.x, this.floor(t0) + 17, this._p.z);
    this.first.rotation.set(0, c.sample(t0).yaw, 0);
    this.first.visible = rider.t < 40;
    // her seat: in the front row, beside the aisle, a little before the screen
    const ht = this.cfg.herT ?? this.t - 1.6, hx = this.cfg.herX ?? 9.5;
    track.ground(ht, hx, this._p);
    // on the road itself, just past where she stops (or on the floor beside it)
    this.her.position.set(this._p.x, this.cfg.herOnRoad ? c.sample(ht).y + 0.05 : this.floor(ht), this._p.z);
    this.her.rotation.set(0, c.sample(ht).yaw, 0);
    this.her.scale.setScalar(this.cfg.herS ?? 1);
    this.her.visible = rider.t > 190;
    // dark until the film starts (the lights go down in the silence), then it bursts
    const start = this.cfg.dark ?? 205.0, go = this.cfg.burstAt ?? 211.58;
    const want = rider.t < 190 ? 1 : (rider.t < start ? 0.7 : (rider.t < go - 4.2 ? 0.12 : (rider.t < go ? 0.45 : 1.05 + 0.35 * this.earned)));
    this.lit += (want - this.lit) * Math.min(1, dt * (rider.t > go - 0.1 && rider.t < go + 1 ? 8 : 1.4));
    this.burst += ((rider.t > go - 0.05 ? 1 : 0) - this.burst) * Math.min(1, dt * 3);
    const u = this.mat.uniforms;
    u.uT.value = songT; u.uK.value = this.lit; u.uBurst.value = this.burst; u.uBeat.value = this.S ? this.S.beat || 0 : 0;
    const S = this.S; if (!S) return;
    if (this.t - rider.t < 46) S.glow(this.group.position.x, this.group.position.y, this.group.position.z, 130, [0.2, 0.5, 1.0], 0.22 * this.lit);
  }
}

// ---------- the place, per frame ----------
export class CinemaWorld {
  constructor(scene, S) {
    this.S = S;
    const c = S.course;
    prepare(c, S.plan);
    this.floor = (t) => dckFloor(c, S.plan, t);
    if (S.town) { S.town.floorFn = (t) => this.floor(t); for (const rd of S.town.roadMeshes) rd.floorFn = S.town.floorFn; }
    this.mat = hallMaterial(posterTexture());
    this.halls = (S.plan.halls || []).map((sp) => new Hall(scene, c, sp, this.mat, this.floor));
    this.fx = new DuckFx(scene, S, this);
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, r = S.rider, c = S.course;
    u.uTime.value = time; u.uCam.value.copy(camera.position);
    u.uFog.value.set(S.P.fog); u.uFogDensity.value = S.P.fogDensity;
    u.uWarm.value.set(S.P.lamp ?? 0xffc070); u.uAccent.value.set(S.P.windowAlt ?? 0xff4fb8);
    const bp = c.beatAt(r.t), bf = bp - Math.floor(bp);
    u.uBeat.value = Math.exp(-bf * 5);
    u.uLight.value.set(S.P.skyLight ?? 0xffffff).multiplyScalar((S.P.hemiK ?? 1.5) / 1.6);
    u.uLift.value = S.lift ? S.lift.k : 0;
    u.uSong.value = r.t;
    // the shadows of the ducks dance on the bedroom walls while a chorus is on in there
    const kind = c.sectionAt(r.t).kind, room = r.t > 118 && r.t < 201.4;
    const wantSh = room && (kind === 'chorus' || kind === 'final') ? 1 : (room ? 0.35 : 0);
    u.uShadow.value += (wantSh - u.uShadow.value) * Math.min(1, dt * 2);
    S.town.dckHop = room && (kind === 'chorus' || kind === 'final') ? (S.lift ? 0.4 + 0.6 * S.lift.k : 1) : 0;
    S.town.dckBeatF = bf; S.town.dckLamp = u.uShadow.value;
    // mid-ride the crowds and the heaps behind the camera needn't be drawn (the title and the end look back)
    S.town.dckCull = r.t > 1 && r.t < 222 && !r.stopping;
    let screen = 0, sAt = -1e5;
    for (const h of this.halls) {
      // the house lights go down in the silence before the end
      if (h.span.dimAt) h.dim = 1 - 0.82 * smooth(h.span.dimAt, h.span.dimAt + 1.2, r.t) * (1 - smooth(h.span.upAt ?? 1e9, (h.span.upAt ?? 1e9) + 0.6, r.t));
      h.update(S.track, r, r.t);
      if (h.span.screenAt !== undefined && h.mesh.visible) { screen = (h.span.screenK ?? 1) * (S.finale && h.span.screenAt > 100 ? Math.min(1.6, S.finale.lit) : 1); sAt = h.screenAlong; }
    }
    u.uScreenK.value = screen; u.uScreenAt.value = sAt;
    if (S.town.mats.glass) S.town.mats.glass.uniforms.uCam.value.copy(camera.position);
    if (S.town.mats.panel) S.town.mats.panel.uniforms.uT.value = time;
    // in the room the world's own ground and far city would show below the dresser: hide them
    const rm = (S.plan.halls || []).find((h) => h.style === 'room');
    const inRoom = rm && r.t > rm.from - 0.15 && r.t < rm.to + 0.5;
    S.ground.visible = !inRoom; S.skyline.visible = !inRoom && r.t > 90 && r.t < 120;
    this.fx.update(S, dt, camera, time);
  }
  draw(T, rider, songT) { this.fx.draw(T, rider, songT); }
}
