// A Million Ducks. She wanted Avatar. Twenty minutes in he gets up, "I'll be right back",
// and out in the lobby there's a claw machine full of ducks that won't let you lose. He
// never goes back in. Out into the car park; then, a different year, the dresser where
// every duck he ever won still stands; and at the end back in the dark, facing the screen.
// The indoor places are halls that follow the course: a floor under the ribbon, walls,
// a ceiling, and a wall with a door where one place opens into the next.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt } from './scenery.js';
import { tintMaterial } from './props.js';
import { prepare, floorAt } from './trail.js';
import { duckGeometry } from './feedback.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false);

// ---------- posters for the lobby walls: titles from the song ----------
function posterTexture() {
  const W = 1024, H = 768, cw = 256, ch = 384;
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
  ];
  posters.forEach((p, i) => {
    const x0 = (i % 4) * cw, y0 = Math.floor(i / 4) * ch;
    const gr = g.createLinearGradient(0, y0, 0, y0 + ch);
    gr.addColorStop(0, p.bg[0]); gr.addColorStop(1, p.bg[1]);
    g.fillStyle = gr; g.fillRect(x0, y0, cw, ch);
    g.save(); g.translate(x0, y0);
    g.fillStyle = p.ink; g.strokeStyle = p.ink; g.globalAlpha = 0.85;
    if (p.art === 'duck') { g.beginPath(); g.ellipse(128, 236, 70, 46, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(160, 178, 34, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(200, 186, 22, 9, 0, 0, Math.PI * 2); g.fill(); }
    if (p.art === 'claw') { g.lineWidth = 8; g.beginPath(); g.moveTo(128, 60); g.lineTo(128, 190); g.stroke(); g.beginPath(); g.moveTo(128, 190); g.quadraticCurveTo(80, 220, 96, 270); g.moveTo(128, 190); g.quadraticCurveTo(176, 220, 160, 270); g.stroke(); }
    if (p.art === 'figure') { g.beginPath(); g.arc(128, 150, 36, 0, Math.PI * 2); g.fill(); g.beginPath(); g.roundRect(78, 192, 100, 120, 30); g.fill(); }
    if (p.art === 'lines') { g.lineWidth = 3; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(50, 90 + k * 22); g.lineTo(206 - (k % 3) * 30, 90 + k * 22); g.stroke(); } }
    if (p.art === 'forest') { for (let k = 0; k < 40; k++) { g.globalAlpha = 0.3 + 0.7 * Math.random(); g.beginPath(); g.arc(20 + Math.random() * 216, 120 + Math.random() * 200, 2 + Math.random() * 4, 0, Math.PI * 2); g.fill(); } }
    g.globalAlpha = 1;
    g.font = '900 34px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = p.ink;
    p.title.split('\n').forEach((l, k, a) => g.fillText(l, 128, 330 - (a.length - 1 - k) * 36));
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- the halls ----------
// ring: the outline of a hall across the course; rel = height from the floor under the
// ribbon, otherwise from the world's zero. part: 0 floor, 1/2 walls, 3 ceiling, 4 dresser front, 5 dresser top
const RINGS = {
  auditorium: (W = 30, H = 24) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-16, 0, 1, 0], [-8, 0, 1, 0], [0, 0, 1, 0], [8, 0, 1, 0], [16, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
  lobby: (W = 25, H = 19) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-14, 0, 1, 0], [-6, 0, 1, 0], [0, 0, 1, 0], [6, 0, 1, 0], [14, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
  ],
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
const STYLE = { auditorium: 0, lobby: 1, room: 2 };

function hallMaterial(posters) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uScreenAt: { value: -1e5 }, uScreenK: { value: 0 }, uScreenCol: { value: new THREE.Color(0x2a8aff) }, uWarm: { value: new THREE.Color(0xffc070) }, uAccent: { value: new THREE.Color(0xff4fb8) },
      uLight: { value: new THREE.Color(1, 1, 1) }, uPosters: { value: posters }, uFlow: { value: 0.4 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uScreenAt, uScreenK, uFlow;
      uniform vec3 uFog, uCam, uScreenCol, uWarm, uAccent, uLight; uniform sampler2D uPosters;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        vec3 col;
        float scr = uScreenK * exp(-abs(along - uScreenAt) / 160.0);
        if (uStyle < 0.5) {
          // the auditorium: dark carpet with step lights, acoustic panels, sconces, the screen's blue on everything
          if (part == 0) {
            col = vec3(0.04, 0.032, 0.05) * (0.8 + 0.4 * n2(vec2(x, along) * 1.7));
            float aisle = smoothstep(0.35, 0.0, abs(abs(x) - 8.6)) * step(0.55, fract(along / 1.4));
            col += uWarm * aisle * 1.2;
          } else if (part == 3) {
            col = vec3(0.018, 0.018, 0.028);
            vec2 g = fract(vec2(x / 6.0, along / 6.0)) - 0.5;
            col += uWarm * smoothstep(0.05, 0.0, length(g)) * 0.7 * step(0.55, h2(floor(vec2(x / 6.0, along / 6.0))));
          } else {
            float panel = fract(along / 3.2);
            col = vec3(0.05, 0.056, 0.085) * (0.65 + 0.35 * smoothstep(0.0, 0.05, panel) * smoothstep(1.0, 0.95, panel));
            vec2 sc = vec2(fract(along / 15.0) - 0.5, h - 7.5);
            col += uWarm * (exp(-sc.x * sc.x * 900.0 - sc.y * sc.y * 0.9) * 1.6 + exp(-sc.x * sc.x * 60.0) * exp(-abs(sc.y) * 0.35) * 0.12);
          }
          col += uScreenCol * scr * (part == 0 ? 0.1 : 0.22) * (0.85 + 0.15 * sin(uTime * 0.7 + along * 0.01));
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
            col = vec3(0.03, 0.02, 0.07) + ink * mix(dot1, bar, step(0.5, h2(c + 11.0))) * step(0.35, h2(c + 7.0)) * 0.42;
          } else if (part == 3) {
            col = vec3(0.025, 0.014, 0.02);
            vec2 g = vec2(fract(x / 7.0) - 0.5, fract(along / 7.0) - 0.5);
            col += uWarm * smoothstep(0.07, 0.0, length(g)) * 2.2;
            col += uAccent * smoothstep(0.6, 0.0, abs(x)) * (1.1 + 0.6 * uBeat);
          } else {
            col = vec3(0.17, 0.016, 0.03) * (0.75 + 0.25 * n2(vec2(along * 0.2, h * 0.5)));
            col += vec3(0.95, 0.68, 0.26) * (smoothstep(0.1, 0.0, abs(h - 2.6)) + smoothstep(0.1, 0.0, abs(h - 15.0))) * 0.55;
            float pc = floor(along / 26.0);
            vec2 pp = vec2(fract(along / 26.0) * 26.0 - 13.0, h - 8.6);
            if (abs(pp.x) < 3.4 && abs(pp.y) < 5.1) {
              float id = mod(pc + (part == 1 ? 0.0 : 3.0), 8.0);
              float u = part == 1 ? 0.5 - pp.x / 6.8 : 0.5 + pp.x / 6.8;
              vec2 uv = vec2((u + mod(id, 4.0)) / 4.0, 1.0 - (0.5 - pp.y / 10.2 + floor(id / 4.0)) / 2.0);
              col = texture2D(uPosters, uv).rgb * 1.5;
            }
            float frame = step(abs(pp.x), 3.75) * step(abs(pp.y), 5.45) * (1.0 - step(abs(pp.x), 3.4) * step(abs(pp.y), 5.1));
            col = mix(col, vec3(1.0, 0.82, 0.45) * 1.4, frame);
          }
        } else {
          // the room: wallpaper far off, the floor far below, the dresser you ride along
          if (part == 5) {
            float grain = n2(vec2(x * 0.5, along * 0.012)) * 0.55 + n2(vec2(x * 2.4, along * 0.04)) * 0.3 + 0.15 * sin(x * 1.3 + n2(vec2(along * 0.01, x)) * 6.0);
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
          } else {
            float st = fract(along / 34.0);
            col = mix(vec3(0.56, 0.48, 0.38), vec3(0.47, 0.37, 0.32), smoothstep(0.45, 0.5, st) * smoothstep(1.0, 0.95, st));
            vec2 fl = vec2(fract(along / 11.0) - 0.5, fract(h / 13.0) - 0.5);
            col = mix(col, vec3(0.62, 0.32, 0.34), smoothstep(0.12, 0.06, length(fl)) * 0.6);
          }
          col *= uLight;
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

export class Hall {
  constructor(scene, course, span, mat) {
    this.course = course; this.span = span;
    this.ring = RINGS[span.style](...(span.dims || []));
    this.style = STYLE[span.style];
    const N = 150, M = this.ring.length;
    this.N = N; this.M = M;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.coord = new Float32Array(N * M * 3); this.part = new Float32Array(N * M);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { if (this.ring[j][3] !== this.ring[j + 1][3]) continue; const a = i * M + j, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCoord', new THREE.BufferAttribute(this.coord, 3).setUsage(THREE.DynamicDrawUsage));
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.part[i * M + j] = this.ring[j][3];
    g.setAttribute('aPart', new THREE.BufferAttribute(this.part, 1));
    this.geo = g;
    this.mat = mat;
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -4;
    this.mesh.onBeforeRender = () => { mat.uniforms.uStyle.value = this.style; mat.uniformsNeedUpdate = true; };
    scene.add(this.mesh);
    // the walls at either end, with a door in them
    const want = span.caps || [true, true];
    this.caps = [span.from, span.to].map((t, k) => (want[k] ? this._cap(scene, t, k) : null)).filter(Boolean);
    this._p = new THREE.Vector3();
  }

  _cap(scene, t, k) {
    const sp = this.span, W = (sp.dims && sp.dims[0]) || (sp.style === 'room' ? 340 : 30);
    const rel = sp.style !== 'room';
    const fy = floorAt(this.course, t);
    const y0 = rel ? 0 : -150 - fy, y1 = rel ? (sp.dims && sp.dims[1]) || 24 : 420 - fy;
    const hw = 11, hh = 13;
    const quads = [[-W, y0, -hw, y1], [hw, y0, W, y1], [-hw, hh, hw, y1]];
    if (y0 < 0) quads.push([-hw, y0, hw, 0]);
    const parts = quads.map(([xa, ya, xb, yb]) => { const g = new THREE.PlaneGeometry(xb - xa, yb - ya); g.translate((xa + xb) / 2, (ya + yb) / 2, 0); return g; });
    // the door frame, lit
    const fr = [];
    for (const [xa, ya, xb, yb] of [[-hw - 0.6, 0, -hw, hh + 0.6], [hw, 0, hw + 0.6, hh + 0.6], [-hw, hh, hw, hh + 0.6]]) { const g = new THREE.PlaneGeometry(xb - xa, yb - ya); g.translate((xa + xb) / 2, (ya + yb) / 2, 0.05); fr.push(g); }
    const wallC = { auditorium: 0x0a0c14, lobby: 0x1a0306, room: 0x4a4034 }[sp.style];
    const wall = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ color: wallC, roughness: 0.9, side: THREE.DoubleSide }));
    const frame = new THREE.Mesh(merge(fr), new THREE.MeshBasicMaterial({ color: new THREE.Color(sp.style === 'room' ? 0xfff0d8 : 0xffc070).multiplyScalar(1.6), side: THREE.DoubleSide }));
    const grp = new THREE.Group(); grp.add(wall, frame);
    // EXIT over the auditorium's doors
    if (sp.style === 'auditorium' && k === 1) { const ex = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x30ff6a).multiplyScalar(2.2), side: THREE.DoubleSide })); ex.position.set(0, hh + 2.4, 0.1); grp.add(ex); }
    grp.userData = { t, fy, k };
    scene.add(grp);
    return grp;
  }

  update(track, rider, P, cam) {
    const sp = this.span, c = this.course;
    const ta = Math.max(sp.from, rider.t - 4), tb = Math.min(sp.to, rider.t + 46);
    const shown = rider.t > (sp.showFrom ?? -1e9);
    const on = tb > ta + 0.05 && shown;
    this.mesh.visible = on;
    for (const cap of this.caps) {
      const t = cap.userData.t;
      cap.visible = shown && t > rider.t - 3 && t < rider.t + 46;
      if (!cap.visible) continue;
      track.ground(t, 0, this._p);
      cap.position.set(this._p.x, sp.style === 'room' ? cap.userData.fy : cap.userData.fy, this._p.z);
      cap.rotation.set(0, c.sample(t).yaw, 0);
    }
    if (!on) return;
    const N = this.N, M = this.M, ring = this.ring;
    const cum = this._cum || (this._cum = new Float32Array(N));
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const t = ta + (tb - ta) * (i / (N - 1));
      const fy = floorAt(c, t);
      for (let j = 0; j < M; j++) {
        const [x, y, rel] = ring[j];
        track.ground(t, x, this._p);
        const o = (i * M + j) * 3;
        this.pos[o] = this._p.x; this.pos[o + 1] = rel ? fy + y : y; this.pos[o + 2] = this._p.z;
        this.coord[o] = x; this.coord[o + 1] = (rel ? y : y - fy);
      }
      track.ground(t, 0, this._p);
      cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0;
      lx = this._p.x; lz = this._p.z;
    }
    // distance along, fixed to the world so the patterns don't slide
    let base;
    if (rider.t <= ta) {
      // the hall is still ahead: walk the road from her to its first row
      let d = 0, px = 0, pz = 0;
      for (let k = 0; k <= 24; k++) { track.ground(rider.t + (ta - rider.t) * k / 24, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; }
      base = rider.stats.dist + d;
    } else {
      const fR = clamp((rider.t - ta) / (tb - ta), 0, 1) * (N - 1), iR = Math.min(N - 2, Math.floor(fR));
      base = rider.stats.dist - (cum[iR] + (cum[iR + 1] - cum[iR]) * (fR - iR));
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) this.coord[(i * M + j) * 3 + 2] = cum[i] + base;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aCoord.needsUpdate = true;
    if (sp.screenAt !== undefined) {
      // the screen's distance along, so its light falls off from it
      const ts = sp.screenAt;
      if (ts <= ta) this.screenAlong = base - (ta - ts) * Math.max(rider.v, 15);
      else if (ts >= tb) this.screenAlong = base + cum[N - 1] + (ts - tb) * Math.max(rider.v, 15);
      else { const f = (ts - ta) / (tb - ta) * (N - 1), i = Math.min(N - 2, Math.floor(f)); this.screenAlong = base + cum[i] + (cum[i + 1] - cum[i]) * (f - i); }
    }
  }
}

// ---------- seats, the claw machine, the concession stand, ducks great and small ----------
const CG = {
  seats() {
    // a block of four seats, facing +z (toward the screen behind you at the start)
    const parts = [];
    for (let k = 0; k < 4; k++) {
      const x = -1.35 + k * 0.9;
      const back = new THREE.BoxGeometry(0.78, 0.95, 0.14); back.translate(x, 0.95, -0.32); back.rotateX(0.06); parts.push(back);
      const seat = new THREE.BoxGeometry(0.78, 0.16, 0.6); seat.translate(x, 0.48, 0.0); parts.push(seat);
    }
    for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) { const a = new THREE.BoxGeometry(0.1, 0.62, 0.7); a.translate(x, 0.31, -0.04); parts.push(a); }
    return merge(parts);
  },
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
  frameMirror() {
    const parts = [];
    for (const [w, h, x, y] of [[44, 2.4, 0, 31.2], [44, 2.4, 0, -1.2], [2.4, 34.8, -21, 15], [2.4, 34.8, 21, 15]]) { const b = new THREE.BoxGeometry(w, h, 1.6); b.translate(x, y, 0); parts.push(b); }
    return merge(parts);
  },
  lampBase() {
    const b = new THREE.CylinderGeometry(9, 12, 6, 20); b.translate(0, 3, 0);
    const stem = new THREE.CylinderGeometry(1.4, 1.8, 40, 12); stem.translate(0, 26, 0);
    return merge([b, stem]);
  },
  lampShade() { const s = new THREE.CylinderGeometry(14, 22, 22, 24, 1, true); s.translate(0, 52, 0); return s; },
};

function mirrorMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; void main(){
      vec2 p = vUv - vec2(0.5, 0.0);
      vec3 c = mix(vec3(0.16, 0.15, 0.17), vec3(0.42, 0.4, 0.44), vUv.y) + vec3(0.25) * smoothstep(0.08, 0.0, abs(vUv.x - vUv.y * 0.6 - 0.15));
      // a red dress, from the back, standing in it
      float body = smoothstep(0.02, 0.0, abs(p.x) - (0.07 + 0.11 * smoothstep(0.62, 0.1, vUv.y))) * step(vUv.y, 0.66) * step(0.06, vUv.y);
      float head = smoothstep(0.05, 0.04, length((vUv - vec2(0.5, 0.74)) * vec2(1.0, 0.8)));
      c = mix(c, vec3(0.9, 0.06, 0.12) * 1.3, body);
      c = mix(c, vec3(0.08, 0.05, 0.04), head);
      gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.DoubleSide,
  });
}

function glowBox(color, k = 1.6) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }); }
function lightPanelMaterial() {
  // per-instance colour, lit from inside
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 aTint; varying vec3 vC; varying vec2 vUv; void main(){ vC = aTint; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT; varying vec3 vC; varying vec2 vUv; void main(){ float chase = 0.75 + 0.25 * step(0.5, fract(vUv.x * 6.0 - uT * 2.0)); gl_FragColor = vec4(vC * chase, 1.0); }`,
    uniforms: { uT: { value: 0 } }, side: THREE.DoubleSide,
  });
}
function glassMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCam; varying vec3 vN; varying vec3 vW; void main(){ vec3 V = normalize(uCam - vW); float f = pow(1.0 - abs(dot(normalize(vN), V)), 3.0); gl_FragColor = vec4(vec3(0.6, 0.8, 1.0) * (0.05 + 0.5 * f), 1.0); }`,
    uniforms: { uCam: { value: new THREE.Vector3() } }, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}
function duckMaterial() { return new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0, emissive: new THREE.Color(0x261a00) }); }
function tintedDuckMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.28, metalness: 0, emissive: new THREE.Color(0x140e00) });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n if (vColor.r > 0.9 && vColor.g > 0.6) diffuseColor.rgb = vTint;');
  };
  return m;
}

const TT = { aTint: 3 };
extend({
  layers: {
    seats: (M) => [CG.seats(), M.velvet || (M.velvet = tintMaterial(0xffffff, { rough: 0.95 })), 700, TT],
    claw: (M) => [CG.claw(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 40, TT],
    clawLight: (M) => [CG.clawLight(), M.panel || (M.panel = lightPanelMaterial()), 40, TT],
    claw2: (M) => [CG.claw2(), M.metal, 40, TT],
    glass: (M) => [CG.glass(), M.glass || (M.glass = glassMaterial()), 40, {}],
    pile: (M) => [(() => { const g = duckGeometry(); g.scale(0.3, 0.3, 0.3); return g; })(), M.duckM || (M.duckM = duckMaterial()), 900, {}],
    counter: (M) => [CG.counter(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 6, TT],
    popcorn: (M) => [CG.popcorn(), M.popcornM || (M.popcornM = glowBox(0xffd06a, 1.5)), 12, {}],
    menuBoard: (M) => [CG.menuBoard(), M.panel || (M.panel = lightPanelMaterial()), 6, TT],
    giantDuck: (M) => [(() => { const g = duckGeometry(); return g; })(), M.gDuck || (M.gDuck = tintedDuckMaterial()), 260, TT],
    pirateHat: (M) => [CG.pirateHat(), M.hat || (M.hat = tintMaterial(0xffffff, { rough: 0.6 })), 60, TT],
    captainHat: (M) => [CG.captainHat(), M.hat || (M.hat = tintMaterial(0xffffff, { rough: 0.6 })), 60, TT],
    mirrorFrame: (M) => [CG.frameMirror(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 4, TT],
    mirrorGlass: (M) => [(() => { const g = new THREE.PlaneGeometry(40, 30.6); g.translate(0, 15, 0.1); return g; })(), M.mirrorM || (M.mirrorM = mirrorMaterial()), 4, {}],
    lampBase: (M) => [CG.lampBase(), M.cabinet || (M.cabinet = tintMaterial(0xffffff, { rough: 0.35, metal: 0.3 })), 4, TT],
    lampShade: (M) => [CG.lampShade(), M.shade || (M.shade = glowBox(0xffd8a0, 1.3)), 4, {}],
  },
  parts: {
    seats(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.15, 1.15, 1.15)); S.layers.seats.add(m, { aTint: it.tint }); },
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
      // its light on the carpet
      poolAt(S, p.x, p.y + 0.05, p.z, 9 * it.s, it.light, 0.6);
    },
    concession(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1));
      S.layers.counter.add(m, { aTint: [0.55, 0.08, 0.1] });
      S.layers.menuBoard.add(m, { aTint: [1.6, 1.25, 0.7] });
      for (const x of [-4.5, 3.8]) { const o = S._o.set(x, 0.9, -0.2).applyQuaternion(q).add(p); m.compose(o, q, S._s.set(1, 1, 1)); S.layers.popcorn.add(m); glowAt(S, o.x, o.y + 2.2, o.z, 4, [1, 0.8, 0.4], 1.1); }
      poolAt(S, p.x, p.y + 0.06, p.z, 26, [1, 0.72, 0.4], 0.7);
    },
    giantDuck(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.giantDuck.add(m, { aTint: it.tint });
      if (it.hat) S.layers[it.hat].add(m, { aTint: it.hat === 'pirateHat' ? [0.08, 0.07, 0.08] : [0.95, 0.95, 0.97] });
    },
    mirror(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.mirrorFrame.add(m, { aTint: [0.75, 0.55, 0.22] }); S.layers.mirrorGlass.add(m); },
    roomLamp(S, it, p, q) {
      const k = it.s ?? 1;
      const m = S._m; m.compose(p, q, S._s.set(k, k, k)); S.layers.lampBase.add(m, { aTint: [0.55, 0.42, 0.3] }); S.layers.lampShade.add(m);
      glowAt(S, p.x, p.y + 50 * k, p.z, 90 * k, [1, 0.82, 0.55], 0.55);
      poolAt(S, p.x, p.y + 0.1, p.z, 120 * k, [1, 0.8, 0.5], 0.5);
    },
  },
  kits: {
    // rows of seats either side of the aisle
    seats(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      const reds = [[0.85, 0.1, 0.16], [0.78, 0.08, 0.14], [0.92, 0.12, 0.18]];
      for (let t = z.from; t < z.to; t += 0.06) {
        const fy = floorAt(c, t);
        for (const side of [-1, 1]) for (const x of [11.2, 15.6, 20.0]) S.items.push({ t, x: side * x, h: fy, rot: z.face === 'back' ? Math.PI : 0, parts: 'seats', tint: pick(R, reds), ahead: 6 });
      }
    },
    // the claw machines: one where the song says, then a row of them through the chorus
    claws(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      const lights = [[2.2, 0.6, 1.4], [2.2, 1.6, 0.4], [0.5, 1.8, 2.2], [2.0, 0.5, 0.6], [1.0, 2.2, 0.8]];
      const cab = [[0.9, 0.12, 0.3], [0.15, 0.3, 0.9], [0.95, 0.75, 0.1], [0.1, 0.6, 0.5], [0.85, 0.85, 0.9]];
      const add = (t, x, s) => {
        const ducks = [];
        for (let k = 0; k < 26; k++) ducks.push([(R() - 0.5) * 1.9, R() * 0.45 + (k > 18 ? 0.3 : 0), (R() - 0.5) * 1.5, (R() - 0.5) * 1.2, (R() - 0.5) * 0.5]);
        S.items.push({ t, x, h: floorAt(c, t), rot: x > 0 ? Math.PI / 2 : -Math.PI / 2, yaw0: c.sample(t).yaw + (x > 0 ? Math.PI / 2 : -Math.PI / 2), parts: 'claw', s, tint: pick(R, cab), light: pick(R, lights), seed: R(), ducks, ahead: 14 });
      };
      if (z.at !== undefined) add(z.at, z.x ?? 11.5, z.s ?? 2.6);
      if (z.row) for (let t = z.from; t < z.to; t += 0.32 + R() * 0.12) for (const side of [-1, 1]) if (R() < 0.85) add(t + R() * 0.05, side * (11.5 + R() * 1.5), 2.0 + R() * 0.4);
    },
    concession(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      S.items.push({ t: z.at, x: z.x ?? -15, h: floorAt(c, z.at), rot: (z.x ?? -15) > 0 ? -Math.PI / 2 : Math.PI / 2, parts: 'concession', ahead: 20 });
    },
    // every duck he ever won, standing along the dresser like statues
    dresser(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      const Y = [1, 0.78, 0.12];
      const tints = [Y, Y, Y, Y, [1, 0.42, 0.62], [0.3, 0.56, 1.0], [0.07, 0.07, 0.08], [0.95, 0.95, 0.97], [0.32, 0.78, 0.34], [0.58, 0.38, 0.9], [1, 0.55, 0.15]];
      for (let t = z.from; t < z.to; t += 0.16 + R() * 0.12) {
        for (const side of [-1, 1]) {
          if (R() < 0.25) continue;
          const x = side * (11 + R() * 16);
          const h = floorAt(c, t);
          const r = R();
          S.items.push({ t, x, h, rot: (side > 0 ? 1 : -1) * (Math.PI / 2 + 0.3) + (R() - 0.5) * 0.6, s: 3.5 + R() * 5.5, parts: 'giantDuck', tint: pick(R, tints), hat: r < 0.06 ? 'pirateHat' : (r < 0.12 ? 'captainHat' : null), ahead: 24 });
        }
      }
    },
    mirror(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      const x = z.x ?? -30;
      S.items.push({ t: z.at, x, h: floorAt(c, z.at), rot: x > 0 ? -Math.PI / 2 + 0.6 : Math.PI / 2 - 0.6, parts: 'mirror', ahead: 40 });
    },
    roomLamp(S, z, R) {
      const c = S.course; prepare(c, S.plan);
      S.items.push({ t: z.at, x: z.x ?? 28, h: floorAt(c, z.at), rot: 0, s: z.s ?? 0.5, parts: 'roomLamp', ahead: 46 });
    },
    // outside: the multiplex behind you, the car park under orange lamps
    carpark(S, z, R) {
      const c = S.course;
      for (let t = z.from; t < z.to; t += 0.36) {
        for (const side of [-1, 1]) {
          S.items.push({ t, x: side * 14, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), wake0: 0.6 });
          for (const row of [20, 27, 34, 41]) if (R() < 0.6) S.items.push({ t: t + R() * 0.15, x: side * (row + R()), rot: side * Math.PI / 2 + (R() < 0.5 ? 0 : Math.PI) + (R() - 0.5) * 0.1, parts: 'parked', tint: col(pick(R, [0xd8d0c8, 0x3a4a6a, 0xa83a3a, 0x2a2a2e, 0xe8e4dc, 0x5a7a5a, 0x8a8aa0])) });
        }
      }
      if (z.cinema) {
        // the multiplex's other screens along the lot, its signs out by the road
        for (const [dt, x] of [[2.5, -58], [5.5, 62], [9, -64], [13, 60]]) S.items.push({ t: z.from + dt, x, rot: x > 0 ? Math.PI / 2 : -Math.PI / 2, s: 2.2, sy: 0.5, parts: 'block', tint: col(0x5a4a6a), seed: R(), wake0: 0.9, keepLit: true });
        S.items.push({ t: z.from + 2.2, x: -22, s: 1.5, parts: 'sign', idx: S.atlas.index.MARQUEE, seed: R(), wake0: 1, keepLit: true });
        S.items.push({ t: z.from + 3.6, x: 22, s: 1.4, parts: 'sign', idx: S.atlas.index.CINEMA, seed: R(), wake0: 1, keepLit: true });
        S.items.push({ t: z.from + 12, x: -22, s: 1.4, parts: 'sign', idx: S.atlas.index.CINEMA, seed: R(), wake0: 1, keepLit: true });
      }
    },
  },
});

// ---------- the screen ----------
function screenMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 }, uCol: { value: new THREE.Color(0x2a8aff) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uT, uK; uniform vec3 uCol; varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 uv = vUv;
        // a blue night forest that glows: soft shapes, drifting lights
        float sky = smoothstep(0.2, 1.0, uv.y);
        vec3 c = mix(uCol * 0.5, uCol * 1.4 + vec3(0.0, 0.25, 0.35), sky);
        float trees = n2(vec2(uv.x * 7.0, 0.0) + uT * 0.02) * 0.35 + 0.18;
        c *= 0.55 + 0.45 * smoothstep(trees, trees + 0.05, uv.y);
        vec2 g = uv * vec2(46.0, 20.0) + vec2(uT * 0.4, -uT * 0.25);
        float sp = smoothstep(0.18, 0.0, length(fract(g) - 0.5)) * step(0.82, h2(floor(g)));
        c += vec3(0.4, 1.0, 1.0) * sp * (0.6 + 0.4 * sin(uT * 3.0 + h2(floor(g)) * 30.0));
        float edge = smoothstep(0.0, 0.015, uv.x) * smoothstep(1.0, 0.985, uv.x) * smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.97, uv.y);
        gl_FragColor = vec4(c * edge * uK, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

export class ScreenFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = 0;
    prepare(course, scenery.plan);
    this.mat = screenMaterial();
    const geo = new THREE.PlaneGeometry(64, 27);
    this.group = new THREE.Group(); scene.add(this.group);
    this.screen = new THREE.Mesh(geo, this.mat); this.group.add(this.screen);
    // the one you walked out on, behind you at the start
    this.first = new THREE.Mesh(geo, this.mat); scene.add(this.first);
    this.lit = 0.6; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const c = this.course;
    const fy = floorAt(c, this.t);
    track.ground(this.t, 0, this._p);
    this.group.position.set(this._p.x, fy + 17, this._p.z);
    this.group.rotation.set(0, c.sample(this.t).yaw + Math.PI, 0);
    const t0 = this.cfg.startT ?? -3.6;
    track.ground(t0, 0, this._p);
    this.first.position.set(this._p.x, floorAt(c, t0) + 15, this._p.z);
    this.first.rotation.set(0, c.sample(t0).yaw, 0);
    this.first.visible = rider.t < 40;
    this.lit += ((this.fired ? 1.6 + 0.8 * this.earned : 1) - this.lit) * Math.min(1, dt * 1.2);
    this.mat.uniforms.uT.value = songT; this.mat.uniforms.uK.value = this.lit;
    const S = this.S; if (!S) return;
    if (this.t - rider.t < 46) S.glow(this.group.position.x, this.group.position.y, this.group.position.z, 110, [0.2, 0.5, 1.0], 0.25 * this.lit);
  }
}

// ---------- the place, per frame ----------
export class CinemaWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    if (S.town) S.town.floorFn = (t) => floorAt(S.course, t);
    this.mat = hallMaterial(posterTexture());
    this.halls = (S.plan.halls || []).map((sp) => new Hall(scene, S.course, sp, this.mat));
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uCam.value.copy(camera.position);
    u.uFog.value.set(S.P.fog); u.uFogDensity.value = S.P.fogDensity;
    u.uWarm.value.set(S.P.lamp ?? 0xffc070); u.uAccent.value.set(S.P.windowAlt ?? 0xff4fb8);
    const bp = S.course.beatAt(S.rider.t); u.uBeat.value = Math.exp(-(bp - Math.floor(bp)) * 5);
    u.uLight.value.set(S.P.skyLight ?? 0xffffff).multiplyScalar((S.P.hemiK ?? 1.5) / 1.6);
    let screen = 0, sAt = -1e5;
    for (const h of this.halls) {
      h.update(S.track, S.rider, S.P, camera);
      if (h.span.screenAt !== undefined && h.mesh.visible) { screen = h.span.screenK ?? 1; sAt = h.screenAlong; }
    }
    u.uScreenK.value = screen; u.uScreenAt.value = sAt;
    if (S.town.mats.glass) S.town.mats.glass.uniforms.uCam.value.copy(camera.position);
    if (S.town.mats.panel) S.town.mats.panel.uniforms.uT.value = time;
    // in the room the world's own ground and far city would show below the dresser: hide them
    const room = (S.plan.halls || []).find((h) => h.style === 'room');
    const inRoom = room && S.rider.t > room.from - 0.5 && S.rider.t < room.to + 0.5;
    S.ground.visible = !inRoom; S.skyline.visible = !inRoom;
  }
}
