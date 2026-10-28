// Reverse Psychology Degree: the place. A university at night where every sign means the
// opposite; its things are in rpd-sets.js, its course and looks in rpd-song.js.
// Here: the lecture hall (the tiers rising both sides, desk lamps along them, chalkboards up the
// back walls, the slide screen at its far end that the inkblot fills) and the exam hall (desks to
// the far wall, tall windows on the night, strip lights; it falls flat when the music drops), both
// on the shared Room; the garden of hedges laid out as a brain that she rides along the middle of,
// lamps in its folds and sparks running down them ("your mind's my campus"); the negative the
// whole place turns into on "reverse psychology"; and at the end, the diploma.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, box } from './summer.js';
import { NEG, selfLit, negHook } from './rpd-sets.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const LAMP = [1, 0.8, 0.5], STRIP = [0.92, 0.96, 1];

// ---------- the rooms ----------
// the lecture hall: a floor down the middle, then seven tiers up each side (risers part 4, treads
// part 5), the back walls (1, 2) and the ceiling (3)
function ringLecture(W = 50, H = 40) {
  const F = 15, N = 7, D = (W - F) / N, R = 2.6, pts = [];
  pts.push([-W, H, 1, 1], [-W, N * R, 1, 1]);
  for (let k = N - 1; k >= 0; k--) { const xo = -(F + (k + 1) * D), xi = -(F + k * D), y = (k + 1) * R; pts.push([xo, y, 1, 5], [xi, y, 1, 5], [xi, y, 1, 4], [xi, k * R, 1, 4]); }
  pts.push([-F, 0, 1, 0], [-7, 0, 1, 0], [0, 0, 1, 0], [7, 0, 1, 0], [F, 0, 1, 0]);
  for (let k = 0; k < N; k++) { const xi = F + k * D, xo = F + (k + 1) * D, y = (k + 1) * R; pts.push([xi, k * R, 1, 4], [xi, y, 1, 4], [xi, y, 1, 5], [xo, y, 1, 5]); }
  pts.push([W, N * R, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3]);
  return pts;
}
const ringFlat = (W = 46, H = 42) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const HALLS = {
  rings: { lecture: ringLecture, exam: ringFlat },
  ringOf: (s) => s,
  styles: { lecture: 0, exam: 1 },
  dims: { lecture: [50, 40], exam: [46, 42] },
  lights: (id) => (id === 0 ? [34, 12] : [22, 6]),
};
function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLo: { value: new THREE.Color(0x1a1a34) }, uSkyHi: { value: new THREE.Color(0x05060f) }, uLit: { value: 0.6 }, uNeg: NEG },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLit, uNeg; uniform vec3 uFog, uCam, uLight, uSkyLo, uSkyHi;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 col; vec3 glow = vec3(0.0);
        if (part == 0) {
          if (st == 0) {
            // boards, an aisle runner down the middle
            vec2 pl = vec2(x / 1.2, along / 7.0 + 0.37 * floor(x / 1.2));
            col = vec3(0.42, 0.27, 0.16) * (0.78 + 0.3 * h2(floor(pl))) * (0.88 + 0.12 * edge(fract(pl), 0.03));
            col = mix(col, vec3(0.42, 0.06, 0.1) * (0.9 + 0.1 * step(0.5, fract(along / 3.0))), step(ax, 5.0));
          } else {
            // the exam hall's floor: parquet, the court lines painted on it
            vec2 pq = vec2(x, along) / 1.6; float hb = mod(floor(pq.x) + floor(pq.y), 2.0);
            col = mix(vec3(0.62, 0.44, 0.26), vec3(0.55, 0.38, 0.22), hb) * (0.9 + 0.1 * edge(fract(pq), 0.06));
            col = mix(col, vec3(0.9, 0.86, 0.7), step(abs(fract(along / 60.0) - 0.5), 0.004) + step(abs(ax - 36.0), 0.18));
          }
        }
        else if (part == 3) {
          if (st == 0) { col = vec3(0.16, 0.11, 0.08); col *= 0.75 + 0.25 * edge(fract(vec2(x / 8.0, along / 8.0)), 0.12); }
          else { col = vec3(0.7, 0.72, 0.74) * (0.85 + 0.15 * edge(fract(vec2(x / 6.0, along / 6.0)), 0.04)); float tube = step(abs(fract(x / 18.0) - 0.5), 0.02) * step(0.3, fract(along / 9.0)); col = mix(col, vec3(1.0), tube); glow += vec3(0.9, 0.95, 1.0) * tube * 1.2; }
        }
        else if (part == 4) {
          // the desk fronts, panelled, and the seat backs showing over them
          vec2 pq = vec2(along / 3.0, h / 2.6); float fh = fract(pq.y);
          col = vec3(0.36, 0.22, 0.13) * (0.85 + 0.15 * edge(fract(pq), 0.08));
          float seat = step(0.62, fh) * step(abs(fract(along / 2.2) - 0.5), 0.36);
          col = mix(col, vec3(0.42, 0.07, 0.1) * (0.85 + 0.15 * fh), seat);
        }
        else if (part == 5) { col = vec3(0.3, 0.18, 0.11); }
        else if (part == 7) {
          // a building's front, in from the night: brick, its windows lit, a lamp by the door
          vec2 br = vec2(x / 1.1 + 0.5 * mod(floor(h / 0.45), 2.0), h / 0.45);
          col = mix(vec3(0.46, 0.2, 0.15) * (0.82 + 0.28 * h2(floor(br))), vec3(0.6, 0.55, 0.5), 1.0 - edge(fract(br), 0.07));
          vec2 wq = vec2(x / 6.0, (h - 4.0) / 7.0); vec2 wf = fract(wq); float win = step(0.0, h - 4.0) * box2(wf, vec2(0.3, 0.15), vec2(0.7, 0.85)) * step(13.0, ax);
          float lit = step(0.3, h2(floor(wq) + 3.0));
          col = mix(col, vec3(1.0, 0.78, 0.48) * lit + vec3(0.02, 0.025, 0.04) * (1.0 - lit), win); glow += vec3(1.0, 0.72, 0.4) * win * lit * 0.9;
          col *= 0.7;
        }
        else if (part == 8) { col = vec3(0.86, 0.82, 0.74); glow += vec3(0.06); }
        else {
          float notCap = part == 6 ? 0.0 : 1.0;
          if (st == 0) {
            // wood panelling to the top tier, then the chalkboards, the lines on them half rubbed out
            col = vec3(0.3, 0.19, 0.12) * (0.85 + 0.15 * edge(fract(vec2(along / 4.0, h / 4.0)), 0.06));
            float board = notCap * step(21.0, h) * step(h, 35.0) * step(0.04, fract(along / 26.0)) * step(fract(along / 26.0), 0.96);
            vec3 slate = vec3(0.1, 0.17, 0.13) * (0.9 + 0.1 * h2(floor(vec2(along, h) * 0.5)));
            vec2 cq = vec2(along * 0.9, h * 1.6);
            float chalk = step(0.78, h2(floor(cq))) * step(abs(fract(cq.y) - 0.5), 0.12) * step(0.4, h2(vec2(floor(along / 5.0), floor(h / 2.0))));
            chalk += step(abs(fract(along / 13.0 + h / 9.0) - 0.5), 0.004) * 0.6;
            col = mix(col, slate + vec3(0.75) * clamp(chalk, 0.0, 1.0) * 0.5, board);
            col = mix(col, vec3(0.5, 0.36, 0.2), notCap * step(abs(h - 20.6), 0.5));
          } else {
            // the exam hall's walls: pale plaster, tall windows on the night every so often
            col = vec3(0.72, 0.7, 0.66) * (0.92 + 0.08 * edge(fract(vec2(along / 5.0, h / 5.0)), 0.02));
            vec2 wv = vec2(mod(along + 6.0, 22.0) - 6.0, h);
            float win = notCap * box2(wv, vec2(0.0, 8.0), vec2(9.0, 34.0));
            float arch = step(length(vec2(wv.x - 4.5, max(0.0, wv.y - 29.5)) / vec2(4.5, 4.5)), 1.0);
            win *= arch;
            vec3 sky = mix(uSkyLo, uSkyHi, clamp((h - 8.0) / 26.0, 0.0, 1.0));
            col = mix(col, sky, win); glow += sky * win * 0.5;
            col = mix(col, vec3(0.86, 0.85, 0.82), win * (step(abs(wv.x - 4.5), 0.18) + step(abs(fract(wv.y / 4.0) - 0.5), 0.03)));
            col = mix(col, vec3(0.32, 0.3, 0.3), step(h, 3.0));
          }
        }
        col *= uLight * (0.55 + uLit);
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        col = mix(col, uFog, clamp(fog, 0.0, 1.0));
        gl_FragColor = vec4(mix(col, max(vec3(0.0), vec3(1.0) - col) * 0.72, uNeg), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the brain ----------
// two hemispheres of clipped hedge either side of the road, their folds the paths, lamps down the
// paths and sparks running along them. Rows at fixed song times (like the rooms), so the hedges
// keep to the same places as she rides; the folds are drawn from where they are along the way.
class Brain {
  constructor(scene, course, from, to) {
    this.course = course; this.from = from; this.to = to;
    const N = this.N = 120, M = this.M = 40;   // rows; columns a side
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 2 * 3); this.b = new Float32Array(N * M * 2 * 3);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let sd = 0; sd < 2; sd++) for (let j = 0; j < M - 1; j++) { const a = (i * 2 + sd) * M + j, b2 = a + 1, c = a + 2 * M, d = c + 1; idx.push(a, c, b2, b2, c, d); }
    g.setIndex(idx); this.idxPerRow = idx.length / (N - 1);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aB', new THREE.BufferAttribute(this.b, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = brainMaterial();
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false;
    this.geo = g;
    scene.add(this.mesh);
    this._p = new THREE.Vector3(); this._smp = {};
    this.ts = new Float32Array(N); this.cum = new Float32Array(N);
    this.DT = (to - from) / (N - 3);
  }
  // the outline from above: round at both ends, widest in the middle
  shape(t) { const s = clamp((t - this.from) / (this.to - this.from), 0, 1); const e = Math.sqrt(Math.max(0, 1 - (2 * s - 1) ** 2)); return e; }
  update(track, rider) {
    const ta = Math.max(this.from, rider.t - 5), tb = Math.min(this.to, rider.t + 46);
    this.mesh.visible = tb > ta + 0.05;
    if (!this.mesh.visible) return;
    const N = this.N, M = this.M, c = this.course, ts = this.ts, cum = this.cum, DT = this.DT;
    let rows = 0;
    ts[rows++] = ta;
    for (let k = Math.floor((ta - this.from) / DT) + 1; this.from + k * DT < tb - 1e-4 && rows < N - 1; k++) ts[rows++] = this.from + k * DT;
    ts[rows++] = tb;
    let lx = 0, lz = 0;
    for (let i = 0; i < rows; i++) {
      const t = ts[i], e = this.shape(t);
      track.ground(t, 0, this._p);
      const cx = this._p.x, cz = this._p.z, yaw = c.sample(t, this._smp).yaw, ax = -Math.cos(yaw), az = Math.sin(yaw);
      cum[i] = i ? cum[i - 1] + Math.hypot(cx - lx, cz - lz) : 0; lx = cx; lz = cz;
      const xi = 6.5 + 5 * (1 - e), span = 112 * Math.pow(e, 0.6), Hm = 22 * Math.pow(e, 0.45);
      for (let sd = 0; sd < 2; sd++) for (let j = 0; j < M; j++) {
        const u = j / (M - 1), sg = sd ? 1 : -1;
        const x = sg * (xi + span * u);
        // steep up from the middle, round over the top, a long fall to the grass outside
        const prof = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.55);
        const o = ((i * 2 + sd) * M + j) * 3;
        this.pos[o] = cx + ax * x; this.pos[o + 1] = Hm * prof; this.pos[o + 2] = cz + az * x;
        this.b[o] = x; this.b[o + 1] = 0; this.b[o + 2] = prof * e;
      }
    }
    // distance along, the same at a place however she rides it (her distance at the first row)
    let base;
    if (rider.t <= ta) {
      let d = 0, px = 0, pz = 0;
      for (let k = 0; k <= 24; k++) { track.ground(rider.t + (ta - rider.t) * k / 24, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; }
      base = rider.stats.dist + d;
    } else {
      let iR = 0; while (iR < rows - 2 && ts[iR + 1] <= rider.t) iR++;
      const u = clamp((rider.t - ts[iR]) / Math.max(1e-6, ts[iR + 1] - ts[iR]), 0, 1);
      base = rider.stats.dist - (cum[iR] + (cum[iR + 1] - cum[iR]) * u);
    }
    for (let i = 0; i < rows; i++) for (let k = 0; k < 2 * M; k++) this.b[((i * 2) * M + k) * 3 + 1] = cum[i] + base;
    this.geo.setDrawRange(0, (rows - 1) * this.idxPerRow);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aB.needsUpdate = true;
  }
}
function brainMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0014 }, uCam: { value: new THREE.Vector3() }, uSky: { value: new THREE.Color() }, uBounce: { value: new THREE.Color() }, uHemiK: { value: 1.6 }, uMoon: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uLamp: { value: new THREE.Color(0xffc070) }, uGlow: { value: new THREE.Color(0xffd070) }, uNeg: NEG },
    vertexShader: /* glsl */`
      attribute vec3 aB; varying vec3 vB; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float folds(vec2 q){ vec2 w = q + 18.0 * vec2(n2(q * 0.022 + 3.1), n2(q * 0.022 + 8.7)) + 7.0 * vec2(n2(q * 0.06 + 1.3), n2(q * 0.06 + 6.1)); float v = n2(w * 0.03) * 0.6 + n2(w * 0.075 + 5.0) * 0.4; return abs(fract(v * 8.0) - 0.5) * 2.0; }
      void main(){
        vB = aB;
        vec3 p = position;
        // the hedges stand up between the paths
        float f = folds(vec2(aB.x, aB.y));
        p.y += (smoothstep(0.06, 0.55, f) * 4.6 - 1.2) * aB.z;
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBeat, uFogDensity, uHemiK, uNeg; uniform vec3 uFog, uCam, uSky, uBounce, uMoon, uMoonDir, uLamp, uGlow;
      varying vec3 vB; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float fv(vec2 q){ vec2 w = q + 18.0 * vec2(n2(q * 0.022 + 3.1), n2(q * 0.022 + 8.7)) + 7.0 * vec2(n2(q * 0.06 + 1.3), n2(q * 0.06 + 6.1)); return n2(w * 0.03) * 0.6 + n2(w * 0.075 + 5.0) * 0.4; }
      void main(){
        vec2 q = vec2(vB.x, vB.y);
        float v = fv(q);
        float f = abs(fract(v * 8.0) - 0.5) * 2.0;           // 0 down a fold, 1 on top of a hedge
        vec3 N = normalize(cross(dFdx(vW), dFdy(vW))); if (N.y < 0.0) N = -N;
        // clipped hedge: dark green, lighter where it's cut flat on top, a little texture
        vec3 hedge = vec3(0.09, 0.2, 0.1) * (0.7 + 0.5 * n2(q * 1.7)) * (0.55 + 0.7 * smoothstep(0.2, 1.0, f));
        // the gravel path down each fold, its lamps, the sparks running along it
        float path = 1.0 - smoothstep(0.09, 0.2, f);
        vec3 gravel = vec3(0.55, 0.48, 0.38) * (0.8 + 0.3 * h2(floor(q * 2.0)));
        vec3 alb = mix(hedge, gravel, path);
        vec3 amb = mix(uBounce, uSky, 0.5 + 0.5 * N.y) * uHemiK;
        float ndl = max(dot(N, normalize(uMoonDir)), 0.0);
        vec3 col = alb * (amb * 0.4 + uMoon * ndl * 0.4);
        float lampPool = path * (0.55 + 0.45 * smoothstep(0.75, 1.0, sin(q.y * 0.21 + v * 46.0)));
        col += uLamp * lampPool * 1.1 * vB.z;
        float spark = path * pow(max(0.0, sin(q.y * 0.05 - uTime * 6.0 + v * 68.0)), 10.0);
        col += uGlow * spark * (2.2 + 3.0 * uBeat) * vB.z;
        // the edge of the garden fades into the lawn
        col *= smoothstep(0.0, 0.08, vB.z);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        col = mix(col, uFog, clamp(fog, 0.0, 1.0));
        gl_FragColor = vec4(mix(col, max(vec3(0.0), vec3(1.0) - col) * 0.72, uNeg), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the diploma ----------
function diplomaTexture() {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 1000;
  const g = c.getContext('2d'), W = c.width, H = c.height;
  g.fillStyle = '#f2ead8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,90,50,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  g.strokeStyle = '#6a1428'; g.lineWidth = 10; g.strokeRect(36, 36, W - 72, H - 72); g.lineWidth = 3; g.strokeRect(56, 56, W - 112, H - 112);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#2a2220'; g.font = '700 40px Georgia, "Times New Roman", serif'; g.fillText('THE  UNIVERSITY', W / 2, 150);
  g.font = 'italic 700 92px Georgia, "Times New Roman", serif'; g.fillText('Doctor of Philosophy', W / 2, 290);
  g.font = 'italic 40px Georgia, serif'; g.fillText('in', W / 2, 375);
  g.fillStyle = '#6a1428'; g.font = '700 84px Georgia, "Times New Roman", serif'; g.fillText('REVERSE PSYCHOLOGY', W / 2, 460);
  g.fillStyle = '#2a2220'; g.font = 'italic 38px Georgia, serif'; g.fillText('conferred upon', W / 2, 560); g.fillText('with the highest honours', W / 2, 735);
  // the name, written and then gone over and over until it isn't one
  g.strokeStyle = '#1a1414'; g.lineWidth = 3; g.beginPath(); g.moveTo(420, 680); g.lineTo(980, 680); g.stroke();
  g.lineWidth = 7; g.lineCap = 'round';
  for (let k = 0; k < 26; k++) { g.beginPath(); g.moveTo(440 + Math.random() * 40, 640 + Math.random() * 30); for (let j = 0; j < 9; j++) g.lineTo(450 + j * 60 + Math.random() * 30, 615 + Math.random() * 60); g.stroke(); }
  // the seal, the ribbons, two signatures
  g.fillStyle = '#6a1428'; g.beginPath(); g.moveTo(W / 2 - 40, 900); g.lineTo(W / 2 - 80, 990); g.lineTo(W / 2 - 40, 965); g.lineTo(W / 2, 990); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(W / 2 + 40, 900); g.lineTo(W / 2 + 80, 990); g.lineTo(W / 2 + 40, 965); g.lineTo(W / 2, 990); g.closePath(); g.fill();
  g.fillStyle = '#d8a83a'; g.beginPath(); for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, r = k % 2 ? 78 : 90; g.lineTo(W / 2 + Math.cos(a) * r, 850 + Math.sin(a) * r); } g.closePath(); g.fill();
  g.strokeStyle = '#a07820'; g.lineWidth = 4; g.beginPath(); g.arc(W / 2, 850, 60, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#1a1414'; g.lineWidth = 2;
  for (const x of [270, W - 270]) { g.beginPath(); g.moveTo(x - 170, 900); g.lineTo(x + 170, 900); g.stroke(); g.beginPath(); g.moveTo(x - 140, 880); for (let j = 0; j < 16; j++) g.lineTo(x - 140 + j * 18, 860 + Math.sin(j * 1.7) * 18 + Math.random() * 10); g.stroke(); }
  // a gold star in the corner
  g.fillStyle = '#ffc830'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 26 : 60; g.lineTo(W - 170 + Math.cos(a) * r, 170 + Math.sin(a) * r); } g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export class RpdFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -34;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = selfLit({ roughness: 0.45, metalness: 0.4 }, 0.25);
    const G = rgb(0xd8a840), DK = rgb(0x4a2a18), GOWN = rgb(0x121016);
    const parts = [];
    // the easel
    for (const [x, z, r] of [[-11, 2.5, -0.12], [11, 2.5, 0.12]]) { const l = box(1.4, 40, 1.4, 0, 20, 0); l.rotateZ(r); l.rotateX(-0.12); l.translate(x, 0, z); parts.push(paint(l, DK)); }
    { const l = box(1.4, 38, 1.4, 0, 19, 0); l.rotateX(0.35); l.translate(0, 0, -14); parts.push(paint(l, DK)); }   // the back leg, behind the frame
    parts.push(paint(box(30, 1.6, 4, 0, 9, 3.6), DK));
    // the frame, gilt, a moulding inside it
    for (const [w, h, x, y] of [[36, 3.2, 0, 10.6], [36, 3.2, 0, 36.6], [3.2, 29, -16.4, 23.6], [3.2, 29, 16.4, 23.6]]) parts.push(paint(box(w, h, 2.4, x, y, 3.2), G));
    for (const [w, h, x, y] of [[30, 0.8, 0, 12.6], [30, 0.8, 0, 34.6], [0.8, 22.8, -14.6, 23.6], [0.8, 22.8, 14.6, 23.6]]) parts.push(paint(box(w, h, 2.6, x, y, 3.3), rgb(0x8a6a2a)));
    // the mortarboard hung on the frame's corner, its tassel down
    const cap = box(6, 0.4, 6, 0, 0, 0); cap.rotateY(0.6); cap.rotateZ(-0.35); cap.translate(-15.5, 39.2, 3.6); parts.push(paint(cap, GOWN));
    const sk = new THREE.CylinderGeometry(1.9, 2, 1.6, 16); sk.rotateZ(-0.35); sk.translate(-15.1, 38.2, 3.6); parts.push(paint(sk, GOWN));
    parts.push(paint(box(0.3, 4.4, 0.3, -18.4, 35.6, 4.2), G));
    this.body = new THREE.Mesh(merge(parts), mat); this.group.add(this.body);
    this.faceMat = negHook(new THREE.MeshStandardMaterial({ map: diplomaTexture(), roughness: 0.75, emissive: 0xffffff, emissiveIntensity: 0.55 }));
    this.faceMat.emissiveMap = this.faceMat.map;
    const face = new THREE.PlaneGeometry(29.2, 22.2); face.translate(0, 23.6, 3.0);
    this.face = new THREE.Mesh(face, this.faceMat); this.group.add(this.face);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.fired = false; this.fireK = 0;
  }
  // the song's end reaches it: the seal catches the light
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? Math.PI / 2 + 0.5), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.fireK = this.fired ? Math.min(1, this.fireK + dt * 0.8) : 0;
    this.faceMat.emissiveIntensity = 0.45 + 0.35 * this.fireK;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1;
    const w = this._w;
    w.set(0, 25, 9).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 46 * s, [1, 0.9, 0.7], 0.16 + 0.12 * this.fireK);
    w.set(0, 15.5, 3.6).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 9 * s, [1, 0.82, 0.4], 0.3 + 1.6 * this.fireK * (0.6 + 0.4 * Math.sin(songT * 3)));
    w.set(0, 0, 10).applyMatrix4(this.group.matrixWorld); S.pool(w.x, 0.2, w.z, 50 * s, [1, 0.9, 0.7], 0.55);
  }
}

// ---------- the place, per frame ----------
export class RpdWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HALLS));
    this.brain = new Brain(scene, S.course, 84.2, 95.2);
    this.K = { lamp: 1, lit: 0.45 };
    this._g = new THREE.Vector3();
  }
  // the place's own palette keys, blended between the looks the way look.js blends its own
  _key(look, t, key, def) {
    const K = look.keys; let i = 0;
    while (i + 1 < K.length && t >= K[i + 1].t) i++;
    const a = K[i].P[key] ?? def, n = K[i + 1];
    let f = 0, b = a;
    if (n && t > n.t - n.fade) { f = (t - (n.t - n.fade)) / n.fade; b = n.P[key] ?? def; }
    f = f * f * (3 - 2 * f);
    return a + (b - a) * f;
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t;
    // the negative: in fast on "reverse", back out more slowly
    let neg = 0;
    for (const [a, b, k] of S.entry.flips || []) neg = Math.max(neg, k * smooth(a, a + 0.14, t) * (1 - smooth(b - 0.55, b, t)));
    NEG.value = neg;
    this.K.lamp = this._key(S.look, t, 'rpdLamp', 1); this.K.lit = this._key(S.look, t, 'rpdLit', 0.45);
    S.town.rpdK = this.K;
    const light = (u) => {
      u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity; u.uCam.value.copy(camera.position);
      if (u.uSky) { u.uSky.value.set(P.skyLight ?? 0x8a8aa8); u.uBounce.value.set(P.bounce ?? 0x2a2434); u.uHemiK.value = P.hemiK ?? 1.8; u.uMoon.value.set(P.moon); if (P.moonDir) u.uMoonDir.value.set(...P.moonDir).normalize(); }
    };
    // the rooms
    const u = this.mat.uniforms;
    u.uTime.value = time; light(u);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.8);
    u.uSkyLo.value.set(P.horizon); u.uSkyHi.value.set(P.zenith); u.uLit.value = this.K.lit;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    // the halls outside: their windows out while the band stops
    const M = S.town.mats;
    if (M.rpdHallM) {
      const h = M.rpdHallM.uniforms; light(h);
      h.uWin.value.set(P.window); h.uWinK.value = (P.windowK ?? 1) * 0.8; h.uLit.value = this.K.lit;
      h.uOn.value = 1 - smooth(21.2, 21.32, t) * (1 - smooth(23.3, 23.45, t));
    }
    // the brain
    const bu = this.brain.mat.uniforms;
    bu.uTime.value = time; bu.uBeat.value = S.pulse ?? 0; light(bu); bu.uLamp.value.set(P.lamp); bu.uGlow.value.set(P.glow);
    this.brain.update(S.track, S.rider);
  }
  // the lights: the hall's lamps hung from the ceiling, the desk lamps along the tiers
  draw(T) {
    const g = this._g, c = this.S.course, track = this.S.track, t = this.S.rider.t;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      const lect = r.style === 0;
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t);
        if (lect) { track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 3, g.z, 9, LAMP, 0.8 * this.K.lamp); T.pool(g.x, fy + 0.08, g.z, 30, LAMP, 0.3 * this.K.lamp); }
        else for (const x of [-27, -9, 9, 27]) { track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 1.5, g.z, 7, STRIP, 0.7 * this.K.lit); }
      }
      if (lect) {
        // a lamp on every few desks, tier after tier, both sides
        const sp = r.span, a = Math.max(sp.from, t - 1), b = Math.min(sp.to, t + 9);
        for (let tt = Math.ceil(a / 0.32) * 0.32; tt < b; tt += 0.32) {
          const fy = floorAt(c, tt), ph = Math.round(tt / 0.32);
          for (const k of [1, 3, 5]) for (const sd of [-1, 1]) {
            if ((ph + k) % 2) continue;
            track.ground(tt, sd * (15 + (k + 0.25) * 5), g);
            T.glow(g.x, fy + (k + 1) * 2.6 + 1.2, g.z, 2.2, LAMP, 0.9 * this.K.lamp);
          }
        }
      }
    }
  }
}
