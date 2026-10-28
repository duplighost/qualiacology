// AI GF. The product, launched over the city at night: the countdown on the big screen, the
// loading bars, her halo switching on over the towers, searchlights, robot arms on plinths doing
// the writing and the painting and the dating. The freeway home in the rain, the house at the end
// of the street with every window lit, the front door swinging in, and there she is: a voice in a
// tall speaker, a glow along the walls. She's wearing your sweater. Dinner's on the table. Inside
// her for every chorus: the server hall. Steak and potatoes; the piggy bank; the keys; her smirk;
// the slider from sweet to sass; her eye. Bedtime: the stars on the ceiling, a spinner while she
// thinks, Trajan's column, the arch, the walls falling to the databanks. The algorithm, the swatches,
// the names, version 2. And at the end, on the table in the dark: we need to talk.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 14, hh = 10) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
function tube(a, b, r, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// a face plane whose uv covers a sign cell (the shared sign atlas)
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
// lit by its own vertex colours too (a thing that glows where it's painted bright)
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
const FONT = '"Arial Black", Impact, sans-serif';

// ---------- the pictures on her screens ----------
// the countdown: three, two, three, two, one, yay
function countTexture() {
  return canvasTex(1024, 128, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cells = ['3', '2', '1', 'YAY!'];
    cells.forEach((s, i) => {
      const x = i * 256 + 128;
      g.font = `900 ${s.length > 1 ? 64 : 112}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const [blur, c] of [[30, '#ff4fd8'], [10, '#ff9ae8'], [0, '#ffffff']]) { g.shadowColor = '#ff4fd8'; g.shadowBlur = blur; g.fillStyle = c; g.fillText(s, x, H / 2 + 6); }
    });
  });
}
// the loading boards' words, one row each
function barTexture() {
  return canvasTex(1024, 640, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const rows = ['LOADING', 'CUSTOMIZING', 'FINALIZING', 'ACTIVATION COMPLETE', 'IMPROVE OVER TIME'];
    rows.forEach((s, i) => {
      const y = i * 128 + 64;
      g.font = `900 ${i === 3 ? 66 : 84}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const [blur, c] of [[24, i === 3 ? '#ff4fd8' : '#46f0e0'], [0, '#ffffff']]) { g.shadowColor = i === 3 ? '#ff4fd8' : '#46f0e0'; g.shadowBlur = blur; g.fillStyle = c; g.fillText(s, W / 2, y + 4); }
    });
  });
}
// the plaques under the robot arms
function plaqueTexture() {
  return canvasTex(512, 640, (g, W, H) => {
    g.fillStyle = '#0c0e14'; g.fillRect(0, 0, W, H);
    ['WRITING', 'PAINTING', 'DATING', 'SEWING', 'GROWING'].forEach((s, i) => {
      const y = i * 128;
      g.fillStyle = '#e8eef4'; g.fillRect(8, y + 8, W - 16, 112);
      g.fillStyle = '#16181e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 30px ${FONT}`; g.fillText('A.I. FOR', W / 2, y + 40);
      g.font = `900 52px ${FONT}`; g.fillText(s, W / 2, y + 86);
    });
  });
}
// the handwriting the arm puts on the page
function writingTexture() {
  return canvasTex(512, 384, (g, W, H) => {
    g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a8c0e0'; g.lineWidth = 2; for (let y = 60; y < H; y += 36) { g.beginPath(); g.moveTo(20, y); g.lineTo(W - 20, y); g.stroke(); }
    g.strokeStyle = '#1a2040'; g.lineWidth = 5; g.lineCap = 'round';
    const R = seeded(31);
    for (let line = 0; line < 8; line++) {
      const y = 50 + line * 36; let x = 34;
      const end = W - 40 - (line === 7 ? 220 : R() * 60);
      g.beginPath(); g.moveTo(x, y);
      while (x < end) { const w = 8 + R() * 10; g.bezierCurveTo(x + w * 0.3, y - 14 - R() * 8, x + w * 0.7, y + 6, x + w, y - 2 + R() * 4); x += w; if (R() < 0.12) { x += 14; g.moveTo(x, y); } }
      g.stroke();
    }
  });
}
// the painting: her colours in big strokes
function paintingTexture() {
  return canvasTex(512, 384, (g, W, H) => {
    g.fillStyle = '#f2ece0'; g.fillRect(0, 0, W, H);
    const R = seeded(7), cols = ['#ff4fd8', '#46f0e0', '#2a2a6a', '#ffd23a', '#ff8a4a', '#8a6aff'];
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) { g.strokeStyle = cols[i % cols.length]; g.globalAlpha = 0.85; g.lineWidth = 18 + R() * 30; g.beginPath(); const x = R() * W, y = R() * H; g.moveTo(x, y); g.bezierCurveTo(x + R() * 200 - 100, y + R() * 120 - 60, x + R() * 200 - 100, y + R() * 120 - 60, x + R() * 260 - 130, y + R() * 160 - 80); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(W * 0.66, H * 0.36, 46, 0, 7); g.fill();
  });
}
// sweet to sass: the setting
function sliderTexture() {
  return canvasTex(1024, 320, (g, W, H) => {
    g.fillStyle = '#f2f4f8'; g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 60); g.fill();
    g.fillStyle = '#16181e'; g.font = `900 64px ${FONT}`; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.fillText('SWEET', 60, 100); g.textAlign = 'right'; g.fillText('SASS', W - 60, 100);
    g.fillStyle = '#c8ccd8'; g.beginPath(); g.roundRect(80, 200, W - 160, 26, 13); g.fill();
  });
}
// the blonde, the redhead, the brunette: colour cards
function swatchTexture() {
  return canvasTex(768, 512, (g, W, H) => {
    [['BLONDE', '#e8c070', '#f8e0a0'], ['REDHEAD', '#b8441e', '#e07a4a'], ['BRUNETTE', '#4a2a18', '#7a4a2a']].forEach(([s, a, b], i) => {
      const x = i * 256;
      g.fillStyle = '#f4f2ee'; g.fillRect(x + 6, 0, 244, H);
      const gr = g.createLinearGradient(0, 30, 0, 400); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(x + 22, 22, 212, 380);
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(x + 30 + k * 15, 26); g.bezierCurveTo(x + 40 + k * 15, 150, x + 20 + k * 15, 260, x + 34 + k * 15, 398); g.stroke(); }
      g.fillStyle = '#16181e'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x + 128, 458);
    });
  });
}
// you can name her: the field, three names
function nameTexture() {
  return canvasTex(1024, 384, (g, W, H) => {
    ['LINDSAY', 'ROSE', 'ANNETTE'].forEach((s, i) => {
      const y = i * 128;
      g.fillStyle = '#0a0c12'; g.fillRect(0, y, W, 128);
      g.strokeStyle = '#46f0e0'; g.lineWidth = 6; g.strokeRect(14, y + 14, W - 28, 100);
      g.fillStyle = '#ffffff'; g.font = `900 78px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, 60, y + 68);
    });
  });
}
// the column's plinth: born in 53 AD, cut in marble
function plinthTexture() {
  return canvasTex(512, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#e8e4dc'); gr.addColorStop(1, '#cfcac0'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,110,100,0.25)'; g.lineWidth = 2; const R = seeded(5); for (let k = 0; k < 9; k++) { g.beginPath(); let x = R() * W, y = 0; g.moveTo(x, y); while (y < H) { x += R() * 30 - 15; y += 20; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = '#8a8274'; g.lineWidth = 6; g.strokeRect(16, 16, W - 32, H - 32);
    g.fillStyle = '#4a4238'; g.font = `700 54px Georgia, "Times New Roman", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('BORN IN', W / 2, 92); g.fillText('53 AD', W / 2, 160);
  });
}
// her last screen: the bubble
function talkTexture() {
  return canvasTex(512, 768, (g, W, H) => {
    g.fillStyle = '#06070c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#9aa0b0'; g.font = `700 26px ${FONT}`; g.textAlign = 'center'; g.fillText('♥', W / 2, 60);
    g.fillStyle = '#ff4fd8'; g.beginPath(); g.roundRect(40, 140, W - 80, 220, 44); g.fill();
    g.beginPath(); g.moveTo(80, 350); g.lineTo(60, 400); g.lineTo(130, 356); g.fill();
    // (both lines sized to stay in the bubble: at a fixed 52px the K of TALK hung off its edge)
    g.fillStyle = '#ffffff'; g.font = `900 52px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const room = (W - 40 - 24) - 80, tw = g.measureText('NEED TO TALK').width; if (tw > room) g.font = `900 ${Math.floor(52 * room / tw)}px ${FONT}`;
    g.fillText('HEY, WE', 80, 210); g.fillText('NEED TO TALK', 80, 286);
    g.fillStyle = '#2a2c36'; g.beginPath(); g.roundRect(40, 470, 220, 110, 55); g.fill();
  });
}
// the knit: your favourite sweater, a snowflake band on red
function knitTexture() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#b8222e'; g.fillRect(0, 0, W, H);
    const st = 8;
    for (let y = 0; y < H; y += st) for (let x = 0; x < W; x += st) {
      const u = x / st, v = y / st;
      const band = (v > 10 && v < 22);
      const flake = band && ((Math.abs((u % 12) - 6) + Math.abs(v - 16)) === 4 || ((u % 12) === 6 && Math.abs(v - 16) < 5) || (v === 16 && Math.abs((u % 12) - 6) < 5));
      const edge = v === 8 || v === 24 || (v === 6 && u % 2 === 0) || (v === 26 && u % 2 === 0);
      g.fillStyle = flake || edge ? '#f4efe6' : ((u + v) % 2 ? '#a81c28' : '#c22a36');
      g.beginPath(); g.ellipse(x + st / 2, y + st / 2, st * 0.42, st * 0.55, 0.5, 0, 7); g.fill();
    }
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { count: countTexture(), bar: barTexture(), plaque: plaqueTexture(), writing: writingTexture(), painting: paintingTexture(), slider: sliderTexture(), swatch: swatchTexture(), name: nameTexture(), plinth: plinthTexture(), talk: talkTexture(), knit: knitTexture() });

// ---------- screens: a picture from a strip of frames, lit like LEDs ----------
// uFrame picks the cell; uReveal wipes it on left to right; uK is how bright
function ledMaterial(map, cols, rows, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uFrame: { value: 0 }, uReveal: { value: 1 }, uK: { value: 1 }, uTime: { value: 0 }, uFill: { value: 0 }, uKnob: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tMap; uniform float uFrame, uReveal, uK, uTime, uFill, uKnob; varying vec2 vUv;
      void main(){
        float c = mod(uFrame, ${cols.toFixed(1)}), r = floor(uFrame / ${cols.toFixed(1)});
        vec2 uv = vec2((c + vUv.x) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - vUv.y) / ${rows.toFixed(1)});
        vec3 t = texture2D(tMap, uv).rgb;
        ${opts.led ? 'vec2 lq = vUv * vec2(160.0, 90.0); vec2 px = fract(lq) - 0.5; float near = clamp(1.6 - 2.0 * max(fwidth(lq.x), fwidth(lq.y)), 0.0, 1.0); t *= mix(0.85, 0.55 + 0.75 * smoothstep(0.5, 0.2, length(px)), near);' : ''}
        t *= step(vUv.x, uReveal);
        ${opts.slider ? 'vec2 kp = vec2(0.09 + 0.82 * uKnob, 0.33); vec2 d = (vUv - kp) * vec2(3.2, 1.0); float knob = smoothstep(0.105, 0.095, length(d)); t = mix(t, vec3(0.27, 0.94, 0.88), smoothstep(0.012, 0.0, abs(vUv.y - 0.33) - 0.03) * step(0.09, vUv.x) * step(vUv.x, kp.x)); t = mix(t, vec3(1.0, 0.31, 0.85), knob); t = mix(t, vec3(1.0), smoothstep(0.045, 0.035, length(d)));' : ''}
        gl_FragColor = vec4(t * uK, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// her face: a line of light that talks, smirks or smiles
// uAmp how loud, uMood 0 talk 1 smirk 2 smile 3 typing, uHer/uHer2 her two colours
function waveMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmp: { value: 0 }, uMood: { value: 0 }, uHer: { value: new THREE.Color(0xff4fd8) }, uHer2: { value: new THREE.Color(0x46f0e0) }, uK: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmp, uMood, uK; uniform vec3 uHer, uHer2; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        // the pill: rounded ends, dark glass
        float pill = length(vec2(max(abs(p.x) - 0.72, 0.0) / 0.28, p.y));
        if (pill > 1.0) discard;
        vec3 col = vec3(0.02, 0.016, 0.04) + mix(uHer, uHer2, 0.5) * 0.12 * (1.0 - pill);
        float x = p.x;
        float env = smoothstep(1.0, 0.55, abs(x));
        float talk = (sin(x * 9.0 + uTime * 7.0) * 0.5 + sin(x * 17.0 - uTime * 11.0) * 0.3 + sin(x * 31.0 + uTime * 5.0) * 0.2) * env * (0.08 + 0.55 * uAmp);
        float sk = smoothstep(-0.1, 0.85, x);
        float smirk = -0.12 + 0.62 * sk * sk;
        float smile = 0.62 * x * x - 0.22;
        float m1 = clamp(uMood, 0.0, 1.0), m2 = clamp(uMood - 1.0, 0.0, 1.0);
        float y = mix(mix(talk, smirk, m1), smile, m2);
        float ends = smoothstep(0.98, 0.86, abs(x));
        float d = abs(p.y - y);
        vec3 c = mix(uHer, uHer2, 0.5 + 0.5 * sin(x * 2.0 + uTime * 0.7));
        col += c * (smoothstep(0.1, 0.03, d) * 1.7 + exp(-d * 6.0) * 0.7) * mix(1.0, ends, clamp(uMood, 0.0, 1.0));
        // typing: three dots
        if (uMood > 2.5) { col *= 0.15; for (int i = 0; i < 3; i++) { float fi = float(i); vec2 q = vec2(x - (fi - 1.0) * 0.32, p.y - 0.12 * max(0.0, sin(uTime * 7.0 - fi * 1.1))); col += c * smoothstep(0.13, 0.1, length(q * vec2(1.0, 1.0))) * 1.4; } }
        gl_FragColor = vec4(col * uK, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// the server racks' fronts: units, their lights blinking, a wave going down the row when she thinks
function rackFrontMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uWave: { value: 0 }, uA: { value: new THREE.Color(0x46f0e0) }, uB: { value: new THREE.Color(0xff4fd8) }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: `attribute float aSeed; varying vec2 vUv; varying float vSeed; varying vec3 vW; void main(){ vUv = uv; vSeed = aSeed; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uWave, uFogDensity; uniform vec3 uA, uB, uFog, uCam; varying vec2 vUv; varying float vSeed; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 q = vUv * vec2(1.0, 18.0); vec2 cell = floor(q), f = fract(q);
        vec3 col = vec3(0.025, 0.027, 0.035);
        col += vec3(0.05) * step(0.9, f.y);
        // a vent grille on each unit, the lights at its right end
        col += vec3(0.03) * step(0.5, fract(vUv.x * 40.0)) * step(0.2, f.y) * step(f.y, 0.75) * step(vUv.x, 0.7);
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 lp = vec2(0.76 + fi * 0.055, 0.45);
          float on = step(0.45, h2(vec2(cell.y + vSeed * 31.0, fi + floor(uTime * (2.0 + h2(vec2(fi, cell.y)) * 6.0)))));
          vec3 lc = fi < 1.5 ? uA : (fi < 2.5 ? vec3(0.4, 1.0, 0.5) : uB);
          col += lc * on * smoothstep(0.02, 0.0, length((f - lp) * vec2(1.0, 0.4)) - 0.01) * 2.2;
        }
        float wy = (vUv.y * 2.0 - 1.0) - sin(uTime * 3.0 + vSeed * 9.0) * 0.6;
        float wave = exp(-wy * wy * 6.0) * uWave;
        col += mix(uA, uB, 0.5 + 0.5 * sin(uTime + vSeed * 6.0)) * wave * 0.5 * step(0.2, f.y);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

// additive light: a searchlight's beam, the halo
function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0x9ad8ff) }, uK: { value: 1 } },
    vertexShader: `attribute float aK; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = aK; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uK; varying vec2 vUv; varying float vK; void main(){ float y = clamp(1.0 - vUv.y, 0.0, 1.0); float a = y * y * y * (0.75 + 0.25 * sin(vUv.x * 6.2832 * 3.0)); gl_FragColor = vec4(uCol * a * 0.07 * uK * vK, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
}

// ---------- her things, at her scale ----------
const HG = {
  // the big screen across the street: frame, the truss arms out to the buildings
  bigFrame() {
    const parts = [], dark = rgb(0x14161e), steel = rgb(0x5a5e6a);
    parts.push(paint(box(66, 38, 2.4, 0, 0, -1.9), dark));
    for (const [w, h, x, y] of [[67, 1.4, 0, 19.2], [67, 1.4, 0, -19.2], [1.4, 39.8, -33.2, 0], [1.4, 39.8, 33.2, 0]]) parts.push(paint(box(w, h, 2.8, x, y, -1.2), rgb(0x2a2e3a)));
    for (const s of [-1, 1]) for (const y of [-12, 12]) { parts.push(paint(box(30, 1.2, 1.2, s * 48, y, -2), steel)); for (let k = 0; k < 6; k++) { const a = box(0.6, 24, 0.6, 0, 0, 0); a.rotateZ(k % 2 ? 0.8 : -0.8); a.translate(s * (36 + k * 4.4), 0, -2); parts.push(paint(a, steel)); } }
    return merge(parts);
  },
  bigFace() { const g = new THREE.PlaneGeometry(64, 36); return g; },
  // a loading board: a black panel with a frame, hung on two wires
  barBoard() {
    const parts = [], dark = rgb(0x0e1016);
    parts.push(paint(box(42, 14, 1.2, 0, 0, -1.1), dark));
    for (const [w, h, x, y] of [[42.6, 0.6, 0, 7.1], [42.6, 0.6, 0, -7.1], [0.6, 14.8, -21.1, 0], [0.6, 14.8, 21.1, 0]]) parts.push(paint(box(w, h, 1.4, x, y, -0.6), rgb(0x46f0e0)));
    for (const s of [-1, 1]) parts.push(paint(box(0.25, 50, 0.25, s * 17, 32, -0.7), rgb(0x6a6e7a)));
    return merge(parts);
  },
  barFace() { const g = new THREE.PlaneGeometry(41, 13.2); g.translate(0, 0, 0.02); return g; },
  // an industrial arm on its plinth, white, its joints ringed in her teal; reaching out over the road
  arm() {
    const parts = [], white = rgb(0xe8ecf0), dark = rgb(0x2a2e36), grey = rgb(0x8a909c);
    parts.push(paint(box(14, 4, 14, 0, 2, 0), dark));
    parts.push(paint(cyl(5, 5.6, 3, 24, 0, 5.5, 0), grey));
    parts.push(paint(cyl(4.2, 4.6, 4, 24, 0, 9, 0), white));
    parts.push(paint(sph(3.4, 1, 1, 1, 0, 12, 0, 18, 12), dark));
    parts.push(paint(tube(V(0, 12, 0), V(0, 29, 9), 2.2, 12), white));
    parts.push(paint(sph(2.9, 1, 1, 1, 0, 29, 9, 16, 12), dark));
    parts.push(paint(tube(V(0, 29, 9), V(0, 25, 25), 1.6, 12), white));
    parts.push(paint(sph(1.9, 1, 1, 1, 0, 25, 25, 14, 10), dark));
    parts.push(paint(cyl(1.4, 1.4, 1.2, 14, 0, 0, 0).rotateX(Math.PI / 2 - 0.25).translate(0, 24.6, 26.4), grey));
    return merge(parts);
  },
  armGlow() { const parts = []; for (const [y, z, r] of [[12, 0, 3.6], [29, 9, 3.1], [25, 25, 2.1]]) { const t = new THREE.TorusGeometry(r, 0.32, 8, 24); t.rotateY(Math.PI / 2); t.translate(0, y, z); parts.push(t); } return merge(parts); },
  plaque() { const g = new THREE.PlaneGeometry(10, 2.5); g.translate(0, 2, 7.45); return g; },
  // what each arm holds, built where its hand is (0, 25, 25)
  pen() { const parts = []; parts.push(paint(cyl(0.7, 0.7, 5.2, 12, 0, 22.2, 26.5), rgb(0x12141a))); parts.push(paint(cyl(0.72, 0.72, 1, 12, 0, 24.4, 26.5), rgb(0xd8b050))); parts.push(paint(new THREE.ConeGeometry(0.7, 1.8, 12).rotateX(Math.PI).translate(0, 18.7, 26.5), rgb(0xd8b050))); return merge(parts); },
  desk() { const parts = []; const top = box(22, 0.8, 16, 0, 0, 0); top.rotateX(0.75); top.translate(0, 16.6, 29.5); parts.push(paint(top, rgb(0x3a2a20))); for (const s of [-1, 1]) parts.push(paint(box(0.8, 16.6, 0.8, s * 10, 8.3, 29.5), rgb(0x2a2e36))); return merge(parts); },
  page() { const g = new THREE.PlaneGeometry(19, 14); g.rotateX(-Math.PI / 2 + 0.75); g.translate(0, 17.15, 29.9); return g; },
  brush() { const parts = []; parts.push(paint(cyl(0.45, 0.6, 5, 10, 0, 22.5, 26.5), rgb(0xc8a070))); parts.push(paint(cyl(0.7, 0.55, 1.2, 10, 0, 19.6, 26.5), rgb(0xc8ccd4))); parts.push(paint(new THREE.ConeGeometry(0.8, 2.2, 10).rotateX(Math.PI).translate(0, 17.9, 26.5), rgb(0xff4fd8))); return merge(parts); },
  rose() {
    const parts = [], red = rgb(0xd8102e), green = rgb(0x2a6a2a);
    parts.push(paint(tube(V(0, 25, 26), V(0, 31, 34), 0.35, 6), green));
    for (let k = 0; k < 9; k++) { const a = k * 2.4, r = k < 3 ? 0.7 : k < 6 ? 1.4 : 2.0; const pt = sph(1.4 - k * 0.06, 1, 1.2, 0.5, 0, 0, 0, 10, 8); pt.rotateY(a); pt.translate(Math.cos(a) * r, 32 + k * 0.08, 35 + Math.sin(a) * r * 0.5); parts.push(paint(pt, red)); }
    for (const s of [-1, 1]) parts.push(paint(sph(1, 0.3, 1.6, 0.6, s * 0.9, 28.5, 31, 8, 6).rotateZ(s * 0.6), green));
    return merge(parts);
  },
  needle() { const parts = []; parts.push(paint(new THREE.ConeGeometry(0.35, 12, 8).rotateX(Math.PI).translate(0, 19, 26.5), rgb(0xd8dce4))); parts.push(paint(new THREE.TorusGeometry(0.4, 0.12, 6, 10).translate(0, 25.4, 26.5), rgb(0xd8dce4))); return merge(parts); },
  spool() { const parts = [], wood = rgb(0xd8b888); parts.push(paint(cyl(4.6, 4.6, 1.2, 24, 0, 0.6, 9), wood)); parts.push(paint(cyl(4.6, 4.6, 1.2, 24, 0, 9.4, 9), wood)); parts.push(paint(cyl(3.6, 3.6, 7.6, 24, 0, 5, 9), rgb(0xff4fd8))); parts.push(paint(cyl(0.5, 0.5, 2, 8, 0, 11, 9), wood)); return merge(parts); },
  thread() { const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector3(0, 10.5 + (25 - 10.5) * u + Math.sin(u * Math.PI) * 5, 9 + (26.5 - 9) * u)); } return paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.25, 5, false), rgb(0xff4fd8)); },
  can() { const parts = [], green = rgb(0x46b0a0); const body = cyl(2.6, 3, 5, 18, 0, 0, 0); body.rotateX(0.5); body.translate(0, 23, 27); parts.push(paint(body, green)); parts.push(paint(tube(V(0, 22.4, 28.4), V(0, 21.2, 30.6), 0.5, 8), green)); const h = new THREE.TorusGeometry(2.2, 0.35, 8, 16, Math.PI); h.rotateY(Math.PI / 2); h.translate(0, 25.4, 26); parts.push(paint(h, green)); return merge(parts); },
  pot() { const parts = []; parts.push(paint(box(7, 9, 7, 0, 4.5, 30), rgb(0x2a2e36))); parts.push(paint(cyl(4.4, 3.2, 6, 20, 0, 12, 30), rgb(0xc86a40))); parts.push(paint(cyl(4.6, 4.6, 1, 20, 0, 15.2, 30), rgb(0xb05a34))); parts.push(paint(cyl(4.2, 4.2, 0.4, 20, 0, 15.4, 30), rgb(0x3a2a1a))); return merge(parts); },
  sprout() { const parts = [], green = rgb(0x5ad84a); parts.push(paint(cyl(0.3, 0.4, 6, 8, 0, 3, 0), green)); for (const s of [-1, 1]) { const l = sph(1, 1.6, 0.25, 0.9, s * 1.6, 6, 0, 10, 6); l.rotateZ(s * 0.35); parts.push(paint(l, green)); } return merge(parts); },
  // the freeway's sign gantry: two legs and a truss; the green sign hangs in the middle
  gantryLeg() { return paint(box(2, 1, 2, 0, 0.5, 0), rgb(0x8a8e98)); },
  gantryTop() { const parts = [], steel = rgb(0x8a8e98); parts.push(paint(box(66, 1.2, 1.2, 0, 2.4, 0), steel)); parts.push(paint(box(66, 1.2, 1.2, 0, -1.6, 0), steel)); for (let k = -16; k <= 16; k++) { const a = box(0.4, 4.6, 0.4, k * 2, 0.4, 0); a.rotateZ(k % 2 ? 0.45 : -0.45); a.translate(0, 0, 0); parts.push(paint(a, steel)); } parts.push(paint(box(30, 9.6, 0.6, 0, -6.8, 0.6), rgb(0x0b5d3b))); parts.push(paint(box(30.6, 0.4, 0.8, 0, -1.9, 0.6), rgb(0xe8e8e8))); return merge(parts); },
  gantryFace() { return signFace(28.5, 8.8, 0, -6.8, 1.35); },
  // a sound wall's panel
  noise() { const parts = []; parts.push(paint(box(10.2, 7, 1, 0, 3.5, 0), [1, 1, 1])); parts.push(paint(box(10.2, 0.6, 1.4, 0, 7, 0), [0.8, 0.8, 0.8])); return merge(parts); },
  // the front door: a tall white slab with a long bar handle and the lock's light
  door() { const parts = []; parts.push(paint(box(23, 26, 1.2, -11.5, 13, 0), rgb(0xf2f0ec))); for (const y of [6, 13, 20]) parts.push(paint(box(21, 0.2, 1.3, -11.5, y, 0), rgb(0xd8d4cc))); parts.push(paint(box(0.8, 12, 1.4, -20.5, 12, 1.2), rgb(0x2a2c32))); return merge(parts); },
  // her: a tall speaker in grey fabric, a ring of light at the top, her face partway down
  pillar() {
    const g = new THREE.CylinderGeometry(6, 6.4, 26, 40, 12); g.translate(0, 13, 0);
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 0.62 + 0.05 * Math.sin(y * 3.1); c.set([k, k * 0.98, k * 1.04], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return merge([g, paint(cyl(6, 6, 0.8, 40, 0, 26.4, 0), rgb(0x2a2c34)), paint(cyl(6.4, 6.6, 0.8, 40, 0, 0.4, 0), rgb(0x2a2c34))]);
  },
  pillarRing() { const t = new THREE.TorusGeometry(5.3, 0.6, 8, 48); t.rotateX(Math.PI / 2); t.translate(0, 26.9, 0); return t; },
  pillarFace() { const g = new THREE.PlaneGeometry(10, 5); g.translate(0, 17, 6.7); return g; },
  knit() { const g = new THREE.CylinderGeometry(6.65, 7.05, 15, 40, 1, true); g.translate(0, 7.8, 0); const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 3, u.getY(i) * 1); return merge([g, paint(new THREE.TorusGeometry(6.75, 1.1, 8, 40).rotateX(Math.PI / 2).translate(0, 15.3, 0), [1, 1, 1])].map((x) => { if (!x.attributes.color) paint(x, [1, 1, 1]); return x; })); },
  // the dining table, set for one: plates, glasses, candles, the cloche
  table() {
    const parts = [], wood = rgb(0x4a3020), white = rgb(0xf4f2ee), glass = rgb(0xc8dce8);
    parts.push(paint(box(40, 1.2, 15, 0, 10, 0), wood));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(box(1.2, 10, 1.2, sx * 17.5, 5, sz * 6), wood));
    for (const x of [-12, 0, 12]) { parts.push(paint(cyl(2.6, 2.4, 0.3, 24, x, 10.75, 3.6), white)); parts.push(paint(cyl(0.6, 0.4, 3, 10, x + 3.6, 12.2, 1.4), glass)); }
    for (const x of [-6, 6]) { parts.push(paint(cyl(0.7, 0.8, 1.2, 10, x, 11.2, -3), rgb(0xd8b050))); parts.push(paint(cyl(0.35, 0.35, 5, 8, x, 14, -3), rgb(0xf8f4e8))); }
    return merge(parts);
  },
  cloche() { const parts = []; const d = new THREE.SphereGeometry(4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); parts.push(paint(d, rgb(0xd8dce4))); parts.push(paint(sph(0.6, 1, 1, 1, 0, 4.2, 0, 10, 8), rgb(0xd8dce4))); parts.push(paint(cyl(4.4, 4.4, 0.4, 24, 0, 0.1, 0), rgb(0xc8ccd4))); return merge(parts); },
  // steak and potatoes on a plate, the plate up on a stand so you can see what's on it
  plate() {
    const parts = [], white = rgb(0xf6f4f0);
    const plate = cyl(9, 7.4, 1, 40, 0, 0, 0); parts.push(paint(plate, white)); parts.push(paint(new THREE.TorusGeometry(8.4, 0.5, 8, 40).rotateX(Math.PI / 2).translate(0, 0.4, 0), white));
    const steak = sph(4.6, 1.2, 0.35, 0.85, -1.6, 1.4, 0.6, 20, 10); parts.push(paint(steak, rgb(0x6a2a14)));
    for (let k = -2; k <= 2; k++) parts.push(paint(box(7, 0.2, 0.5, -1.6 + k * 1.6, 2.95, 0.6).rotateY(0.6), rgb(0x2a0e06)));
    for (const [x, z, r] of [[4.2, -2.6, 1.8], [5.4, 0.6, 1.6], [3.4, 2.8, 1.7], [1.2, -4.2, 1.5]]) parts.push(paint(sph(r, 1, 0.8, 1, x, 1.6, z, 12, 8), rgb(0xe8c060)));
    parts.push(paint(sph(0.9, 1.6, 0.3, 0.6, -3, 3.2, -1, 8, 6), rgb(0x3a8a2a)));
    return merge(parts);
  },
  plateStand() { const parts = [], dark = rgb(0x2a2c32); parts.push(paint(box(8, 1, 6, 0, 0.5, 0), dark)); parts.push(paint(box(1, 13, 1, 0, 7, -1.5).rotateX(-0.3), dark)); return merge(parts); },
  // her love, oh so steady: a heart in her pink
  heart() {
    const s = new THREE.Shape();
    s.moveTo(0, -6); s.bezierCurveTo(-2, -3.4, -8, -1, -8, 3); s.bezierCurveTo(-8, 7, -3.6, 8, 0, 4.6); s.bezierCurveTo(3.6, 8, 8, 7, 8, 3); s.bezierCurveTo(8, -1, 2, -3.4, 0, -6);
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.8, bevelSegments: 4, curveSegments: 18 }); g.translate(0, 0, -1.2); return paint(g, rgb(0xff3ac8));
  },
  // a server rack cabinet: the box, its top; the front is a layer of its own
  rack() { const parts = [], dark = rgb(0x101218); parts.push(paint(box(8, 30, 10, 0, 15, 0), dark)); parts.push(paint(box(8.4, 0.6, 10.4, 0, 30.2, 0), rgb(0x22252e))); return merge(parts); },
  rackFront() { const g = new THREE.PlaneGeometry(7.2, 28.6); g.translate(0, 15, 5.02); return g; },
  // a cable tray across the hall, high up
  tray() { const parts = [], y = rgb(0xd8b020); for (const s of [-1, 1]) parts.push(paint(box(120, 0.6, 0.3, 0, 0, s * 2.2), y)); for (let k = -30; k <= 30; k++) parts.push(paint(box(0.3, 0.4, 4.4, k * 2, -0.2, 0), y)); for (let k = 0; k < 5; k++) parts.push(paint(box(120, 0.5, 0.5, 0, 0.4, -1.4 + k * 0.7), rgb([0x46f0e0, 0xff4fd8, 0x2a2c36, 0x6a6e7a, 0x2a6aff][k]))); return merge(parts); },
  // the piggy bank: pink, glossy, the slot on its back
  piggy() {
    const parts = [], pink = rgb(0xff8ac0);
    parts.push(paint(sph(9, 1.25, 1, 1, 0, 10, 0, 28, 18), pink));
    parts.push(paint(cyl(2.4, 2.6, 2.4, 20, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 9.6, 11.6), rgb(0xff6aa8)));
    for (const x of [-0.9, 0.9]) parts.push(paint(sph(0.5, 1, 1.4, 0.3, x, 9.6, 12.85, 8, 6), rgb(0x8a2a50)));
    for (const s of [-1, 1]) { const e = new THREE.ConeGeometry(2.2, 3.6, 12); e.rotateZ(s * 0.5); e.rotateX(0.3); e.translate(s * 4.6, 17.6, 5); parts.push(paint(e, pink)); parts.push(paint(sph(0.8, 1, 1, 1, s * 3.4, 13.4, 9.4, 8, 6), rgb(0x1a1418))); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(cyl(2, 1.8, 4, 12, sx * 5.4, 2, sz * 5.6), pink));
    parts.push(paint(box(0.8, 0.4, 5, 0, 19.1, -1), rgb(0x3a1424)));
    return merge(parts);
  },
  coin() { return paint(cyl(2.4, 2.4, 0.5, 24, 0, 0, 0).rotateX(Math.PI / 2), rgb(0xffd23a)); },
  // the car keys on their hook: two keys and the fob on a ring
  keys() {
    const parts = [], steel = rgb(0xc8ccd4), black = rgb(0x16181e);
    parts.push(paint(box(5, 1.4, 4, 0, 0, -2), black));
    parts.push(paint(new THREE.TorusGeometry(2.2, 0.35, 8, 24).translate(0, -2.6, 0), steel));
    for (const [a, len] of [[-0.35, 10], [0.25, 9]]) { const k = merge([paint(box(1.2, len, 0.4, 0, -len / 2 - 2, 0), steel), paint(sph(1.8, 1, 1, 0.4, 0, -1.2, 0, 12, 8), steel)]); k.translate(0, -3, 0); k.rotateZ(a); k.translate(0, -2.4, 0); parts.push(k); }
    const fob = merge([paint(sph(2.6, 0.8, 1.3, 0.45, 0, -9, 0.6, 14, 10), black), paint(sph(0.7, 1, 1, 0.3, 0, -8.2, 1.7, 8, 6), rgb(0xff4fd8))]); parts.push(fob);
    return merge(parts);
  },
  // a settings panel hung over the road; the face is drawn by its own material
  panel() { const parts = []; parts.push(paint(box(44, 14, 1, 0, 0, -1.0), rgb(0xd8dce4))); for (const s of [-1, 1]) parts.push(paint(box(0.25, 50, 0.25, s * 18, 32, -0.6), rgb(0x8a8e98))); return merge(parts); },
  panelFace() { const g = new THREE.PlaneGeometry(43, 13.4); g.translate(0, 0, 0.02); return g; },
  // her eye: a camera in its housing, the lens rings, a pink iris
  eyeBody() { const parts = []; parts.push(paint(cyl(6, 6.6, 7, 32, 0, 0, 0).rotateX(Math.PI / 2), rgb(0x16181e))); for (const [r, z] of [[5.2, 3.6], [4.2, 4.0], [3.2, 4.3]]) parts.push(paint(new THREE.TorusGeometry(r, 0.35, 8, 32).translate(0, 0, z), rgb(0x3a3e48))); parts.push(paint(box(2, 12, 2, 0, -9, -2), rgb(0x2a2c32))); return merge(parts); },
  eyeLens() { const g = new THREE.SphereGeometry(3.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4); g.rotateX(Math.PI / 2); g.translate(0, 0, 2.2); return g; },
  // Trajan's column: plinth, the shaft with its band of reliefs winding up, the capital
  column() {
    const parts = [], marble = rgb(0xe8e4dc), shade = rgb(0xc8c2b6);
    parts.push(paint(box(16, 10, 16, 0, 5, 0), marble));
    parts.push(paint(box(17, 1, 17, 0, 10.5, 0), shade));
    parts.push(paint(cyl(5.4, 6, 46, 32, 0, 34, 0), marble));
    const pts = []; for (let k = 0; k <= 240; k++) { const u = k / 240, a = u * Math.PI * 2 * 9; pts.push(new THREE.Vector3(Math.cos(a) * 5.8, 12 + u * 43, Math.sin(a) * 5.8)); }
    parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, 0.55, 5, false), shade));
    parts.push(paint(cyl(7, 6, 2, 32, 0, 58, 0), shade)); parts.push(paint(box(14, 2, 14, 0, 60, 0), marble));
    parts.push(paint(cyl(2.6, 3, 4, 20, 0, 63, 0), shade));
    return merge(parts);
  },
  // the plinth with the date on it
  tablet() { return paint(box(20, 12, 3, 0, 6, 0), rgb(0xe0dcd2)); },
  tabletFace() { const g = new THREE.PlaneGeometry(18, 9); g.translate(0, 6.5, 1.9); return g; },
  // the arch you ride through: two piers, the vault, the attic on top
  arch() {
    const parts = [], marble = rgb(0xe8e4dc), shade = rgb(0xc8c2b6);
    for (const s of [-1, 1]) { parts.push(paint(box(14, 36, 12, s * 22, 18, 0), marble)); for (const z of [-6.4, 6.4]) parts.push(paint(cyl(1.2, 1.2, 30, 12, s * 27, 18, z), shade)); }
    const vault = new THREE.TorusGeometry(15, 2.4, 10, 24, Math.PI); vault.scale(1, 1, 2.4); vault.translate(0, 36, 0); parts.push(paint(vault, marble));
    parts.push(paint(box(58, 8, 13, 0, 44, 0), marble)); parts.push(paint(box(60, 1.4, 14, 0, 40, 0), shade)); parts.push(paint(box(48, 6, 12, 0, 51, 0), shade));
    return merge(parts);
  },
  // the emperor's laurels, in gold
  wreath() { const parts = [], gold = rgb(0xe8c050); for (const s of [-1, 1]) for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + s * (0.2 + k * 0.2); const l = sph(1, 0.6, 1.5, 0.25, 0, 0, 0, 8, 6); l.rotateZ(a + s * 0.6); l.translate(Math.cos(a) * 7, Math.sin(a) * 7, 0); parts.push(paint(l, gold)); } return merge(parts); },
  // an hourglass whose sand doesn't move
  hourglass() {
    const parts = [], wood = rgb(0x6a4228), glass = rgb(0xc8e8f4), sand = rgb(0xf0c870);
    for (const y of [0, 22]) parts.push(paint(cyl(7, 7, 1.6, 24, 0, y, 0), wood));
    for (let k = 0; k < 3; k++) { const a = k * 2.094; parts.push(paint(cyl(0.5, 0.5, 22, 8, Math.cos(a) * 6, 11, Math.sin(a) * 6), wood)); }
    const top = new THREE.ConeGeometry(5, 9.5, 24, 1, true); top.rotateX(Math.PI); top.translate(0, 16, 0); const bot = new THREE.ConeGeometry(5, 9.5, 24, 1, true); bot.translate(0, 6, 0);
    parts.push(paint(top, glass)); parts.push(paint(bot, glass));
    parts.push(paint(new THREE.ConeGeometry(3.2, 4, 20).rotateX(Math.PI).translate(0, 13.6, 0), sand)); parts.push(paint(new THREE.ConeGeometry(3.6, 3, 20).translate(0, 2.4, 0), sand));
    return merge(parts);
  },
  bottle() { const parts = [], green = rgb(0x2a7a3a); parts.push(paint(cyl(1.6, 1.6, 7, 16, 0, 3.5, 0), green)); parts.push(paint(cyl(0.6, 1.6, 2.4, 16, 0, 8.2, 0), green)); parts.push(paint(cyl(0.6, 0.6, 2, 12, 0, 10.4, 0), green)); parts.push(paint(cyl(1.62, 1.62, 3, 16, 0, 3.6, 0), rgb(0xf0e8d0))); return merge(parts); },
  // the algorithm: a node, and an edge between nodes
  node() { return new THREE.IcosahedronGeometry(1.6, 1); },
  edge() { const g = new THREE.CylinderGeometry(0.12, 0.12, 1, 5, 1); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; },
  // a colour card hung on a wire, its face a layer
  swatch() { const parts = []; parts.push(paint(box(13, 26, 0.5, 0, 0, -0.7), rgb(0xf4f2ee))); parts.push(paint(box(0.2, 40, 0.2, 0, 33, -0.3), rgb(0x8a8e98))); return merge(parts); },
  swatchFace() { const g = new THREE.PlaneGeometry(12.6, 25.6); g.translate(0, 0, 0.02); return g; },
  // the name field
  field() { const parts = []; parts.push(paint(box(46, 8, 1, 0, 0, -1.0), rgb(0x0a0c12))); for (const s of [-1, 1]) parts.push(paint(box(0.25, 50, 0.25, s * 18, 29, -0.6), rgb(0x8a8e98))); return merge(parts); },
  fieldFace() { const g = new THREE.PlaneGeometry(45, 7.6); g.translate(0, 0, 0.02); return g; },
  // version 2: a big gold two
  two() {
    const s = new THREE.Shape();
    s.moveTo(-6, -9); s.lineTo(7, -9); s.lineTo(7, -5.6); s.lineTo(-0.6, -5.6);
    s.bezierCurveTo(2.2, -2.8, 6.8, 0.2, 6.8, 4); s.bezierCurveTo(6.8, 8, 3.4, 10, 0, 10); s.bezierCurveTo(-3.6, 10, -6.6, 7.8, -6.8, 4.2);
    s.lineTo(-3, 4); s.bezierCurveTo(-2.8, 5.6, -1.6, 6.6, 0, 6.6); s.bezierCurveTo(1.8, 6.6, 3, 5.6, 3, 4); s.bezierCurveTo(3, 1.4, -1, -1.6, -6, -6.2); s.lineTo(-6, -9);
    const g = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.5, bevelSegments: 3, curveSegments: 16 }); g.translate(0, 0, -1.5); return paint(g, rgb(0xffc83a));
  },
  // her tablet on its stand, on the table at the end
  device() { const parts = []; parts.push(paint(box(12, 17, 0.9, 0, 9.5, 0), rgb(0x16181e))); const st = box(4, 0.8, 7, 0, 0.4, -2); parts.push(paint(st, rgb(0x2a2c32))); const b = box(1.4, 9, 0.8, 0, 4, -2.6); b.rotateX(-0.35); parts.push(paint(b, rgb(0x2a2c32))); return merge(parts); },
  deviceFace() { const g = new THREE.PlaneGeometry(10.8, 15.8); g.translate(0, 9.5, 0.8); return g; },
  // the house's furniture, at her scale: a low sofa, a floor lamp, a plant in a pot
  sofa() {
    const parts = [], fab = rgb(0x8a8e9a), dark = rgb(0x3a3e48);
    parts.push(paint(box(30, 5, 11, 0, 4.5, 0), fab)); parts.push(paint(box(30, 9, 3, 0, 9, -4.4), fab));
    for (const s of [-1, 1]) parts.push(paint(box(3, 7.5, 11, s * 15.5, 5.6, 0), fab));
    for (const x of [-7.4, 7.4]) parts.push(paint(box(14.4, 2.2, 9, x, 8, 0.6), rgb(0x9a9eaa)));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(box(1, 2, 1, sx * 15, 1, sz * 4.5), dark));
    parts.push(paint(box(5, 5, 1.6, -9, 12.5, -2), rgb(0xff8ad0))); parts.push(paint(box(5, 5, 1.6, 9, 12.5, -2), rgb(0x46d0c8)));
    return merge(parts);
  },
  lampPole() { const parts = [], m = rgb(0x2a2c34); parts.push(paint(cyl(2.4, 2.8, 0.8, 20, 0, 0.4, 0), m)); parts.push(paint(cyl(0.35, 0.35, 22, 8, 0, 11, 0), m)); return merge(parts); },
  lampShade() { const g = new THREE.CylinderGeometry(2.6, 4.2, 5, 24, 1, true); g.translate(0, 23, 0); return paint(g, rgb(0xfff0dc)); },
  plantPot() {
    const parts = [], R = seeded(17);
    parts.push(paint(cyl(3.6, 2.8, 6, 16, 0, 3, 0), rgb(0xe8e4dc)));
    for (let k = 0; k < 9; k++) { const a = k * 2.4, h = 7 + R() * 8; const l = sph(1, 1.4, h * 0.5, 0.35, 0, 0, 0, 8, 6); l.rotateZ(0.35 + R() * 0.3); l.rotateY(a); l.translate(Math.cos(a) * 1.2, 6 + h * 0.45, Math.sin(a) * 1.2); parts.push(paint(l, rgb(k % 2 ? 0x2a6a3a : 0x3a8a4a))); }
    return merge(parts);
  },
  // the stars her projector puts on the ceiling come from a little globe
  projector() { const parts = []; parts.push(paint(sph(3.4, 1, 0.9, 1, 0, 3.2, 0, 20, 14), rgb(0xd8d4ff))); parts.push(paint(cyl(2.6, 3, 1.2, 20, 0, 0.6, 0), rgb(0x2a2c36))); return merge(parts); },
};

// a picture per instance from a grid of cells (the plaques, the colour cards), with a progress
// bar under it when it's a loading board (aFill)
function cellMaterial(map, cols, rows, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: map }, uTime: { value: 0 }, uHer: { value: new THREE.Color(0xff4fd8) }, uHer2: { value: new THREE.Color(0x46f0e0) } },
    vertexShader: `attribute float aCell; attribute float aFill; varying vec2 vUv; varying float vCell; varying float vFill; void main(){ vUv = uv; vCell = aCell; vFill = aFill; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tMap; uniform float uTime; uniform vec3 uHer, uHer2; varying vec2 vUv; varying float vCell; varying float vFill;
      void main(){
        float cell = floor(vCell + 0.5);
        float c = mod(cell, ${cols.toFixed(1)}), r = floor((cell + 0.5) / ${cols.toFixed(1)});
        ${opts.bar ? `
        // the word on top, the bar under it
        vec2 lv = vec2(vUv.x, (vUv.y - 0.36) / 0.64);
        vec3 col = vec3(0.01, 0.012, 0.02);
        if (lv.y > 0.0) col += texture2D(tMap, vec2((c + lv.x) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - lv.y) / ${rows.toFixed(1)})).rgb * 1.4;
        vec2 b = vec2((vUv.x - 0.08) / 0.84, (vUv.y - 0.1) / 0.16);
        float inside = step(0.0, b.x) * step(b.x, 1.0) * step(0.0, b.y) * step(b.y, 1.0);
        float frame = inside * (1.0 - step(0.02, b.x) * step(b.x, 0.98) * step(0.12, b.y) * step(b.y, 0.88));
        vec3 bc = cell > 2.5 ? uHer : uHer2;
        col += bc * frame * 1.2;
        col += bc * inside * step(b.x, vFill) * step(0.2, b.y) * step(b.y, 0.8) * (1.3 + 0.3 * sin(b.x * 40.0 - uTime * 10.0));
        gl_FragColor = vec4(col, 1.0);` : `
        vec3 col = texture2D(tMap, vec2((c + vUv.x) / ${cols.toFixed(1)}, 1.0 - (r + 1.0 - vUv.y) / ${rows.toFixed(1)})).rgb;
        gl_FragColor = vec4(col * ${(opts.k ?? 1).toFixed(2)}, 1.0);`}
      }`,
    side: THREE.DoubleSide,
  });
}
// a plain glowing colour per instance (the algorithm's nodes and wires)
function tintGlow() { return new THREE.ShaderMaterial({ vertexShader: `attribute vec3 aTint; varying vec3 vC; void main(){ vC = aTint; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`, fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.0); }` }); }
// the halo over the city: two rings of light, a shimmer going round
function haloMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uHer: { value: new THREE.Color(0xff4fd8) }, uHer2: { value: new THREE.Color(0x46f0e0) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uK; uniform vec3 uHer, uHer2; varying vec2 vUv; void main(){ float a = vUv.x * 6.2832; vec3 c = mix(uHer, uHer2, 0.5 + 0.5 * sin(a * 2.0 + uTime * 0.8)); float sh = 0.75 + 0.25 * sin(a * 12.0 - uTime * 3.0); gl_FragColor = vec4(c * sh * uK * 1.6, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
let SEARCH = null;
const searchGeo = () => SEARCH || (SEARCH = (() => { const g = new THREE.CylinderGeometry(10, 0.9, 240, 18, 1, true); g.translate(0, 120, 0); return g; })());
extend({
  layers: {
    aiBigFrame: (M) => [HG.bigFrame(), VC(M, 'aiBigFrameM', { roughness: 0.5, metalness: 0.4, emissive: 0x0a0c12 }), 2, {}],
    aiBigFace: (M) => [HG.bigFace(), M.aiCountM || (M.aiCountM = ledMaterial(tex().count, 4, 1, { led: true })), 2, {}],
    aiBarBoard: (M) => [HG.barBoard(), VC(M, 'aiBarBoardM', { roughness: 0.5, metalness: 0.2, emissive: 0x081414 }), 6, {}],
    aiBarFace: (M) => [HG.barFace(), M.aiBarM || (M.aiBarM = cellMaterial(tex().bar, 1, 5, { bar: true })), 6, { aCell: 1, aFill: 1 }],
    aiArm: (M) => [HG.arm(), VC(M, 'aiArmM', { roughness: 0.32, metalness: 0.25, emissive: 0x1a1e24 }), 8, {}],
    aiArmGlow: (M) => [HG.armGlow(), M.aiArmGlowM || (M.aiArmGlowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x46f0e0).multiplyScalar(1.6) })), 8, {}],
    aiPlaque: (M) => [HG.plaque(), M.aiPlaqueM || (M.aiPlaqueM = cellMaterial(tex().plaque, 1, 5, { k: 1.3 })), 8, { aCell: 1, aFill: 1 }],
    aiPen: (M) => [HG.pen(), VC(M, 'aiToolM', { roughness: 0.35, metalness: 0.3, emissive: 0x141414 }), 2, {}],
    aiBrush: (M) => [HG.brush(), VC(M, 'aiToolM', { roughness: 0.35, metalness: 0.3, emissive: 0x141414 }), 2, {}],
    aiRose: (M) => [HG.rose(), VCm(M, 'aiRoseM', 0.45, { roughness: 0.6 }), 2, {}],
    aiNeedle: (M) => [HG.needle(), VC(M, 'aiToolM', { roughness: 0.35, metalness: 0.3, emissive: 0x141414 }), 2, {}],
    aiCan: (M) => [HG.can(), VC(M, 'aiToolM', { roughness: 0.35, metalness: 0.3, emissive: 0x141414 }), 2, {}],
    aiDesk: (M) => [HG.desk(), VC(M, 'aiDeskM', { roughness: 0.7, metalness: 0.1, emissive: 0x0e0a08 }), 4, {}],
    aiPage: (M) => [HG.page(), M.aiPageM || (M.aiPageM = ledMaterial(tex().writing, 1, 1)), 2, {}],
    aiPainting: (M) => [HG.page(), M.aiPaintM || (M.aiPaintM = ledMaterial(tex().painting, 1, 1)), 2, {}],
    aiSpool: (M) => [HG.spool(), VCm(M, 'aiSpoolM', 0.3, { roughness: 0.7 }), 2, {}],
    aiThread: (M) => [HG.thread(), VCm(M, 'aiSpoolM', 0.3, { roughness: 0.7 }), 2, {}],
    aiPot: (M) => [HG.pot(), VC(M, 'aiPotM', { roughness: 0.8, emissive: 0x140a06 }), 2, {}],
    aiSprout: (M) => [HG.sprout(), VCm(M, 'aiSproutM', 0.4, { roughness: 0.6 }), 2, {}],
    aiBeam: (M) => [searchGeo(), M.aiBeamM || (M.aiBeamM = beamMaterial()), 40, { aK: 1 }],
    aiGantryLeg: (M) => [HG.gantryLeg(), VC(M, 'aiGantryM', { roughness: 0.5, metalness: 0.5, emissive: 0x0e1014 }), 8, {}],
    aiGantryTop: (M) => [HG.gantryTop(), VC(M, 'aiGantryM', { roughness: 0.5, metalness: 0.5, emissive: 0x0e1014 }), 4, {}],
    aiGantryFace: (M) => [HG.gantryFace(), M.sign, 4, { aIdx: 1, aWake: 2 }],
    aiNoise: (M) => [HG.noise(), M.concrete, 500, { aTint: 3 }],
    aiAd: (M) => [box(46, 22, 2, 0, 0, -1.7), M.aiAdM || (M.aiAdM = new THREE.MeshStandardMaterial({ color: 0x14161e, roughness: 0.5, metalness: 0.4, emissive: 0x0a0c12 })), 24, {}],
    aiAdFace: (M) => [(() => { const g = new THREE.PlaneGeometry(44, 20); return g; })(), M.aiWaveM || (M.aiWaveM = waveMaterial()), 24, {}],
    aiAdPole: (M) => [box(2.4, 1, 2.4, 0, 0.5, 0), M.metal, 24, { aTint: 3 }],
    aiPillar: (M) => [HG.pillar(), VC(M, 'aiPillarM', { roughness: 0.95, metalness: 0, emissive: 0x08080a }), 8, {}],
    aiPillarRing: (M) => [HG.pillarRing(), M.aiRingM || (M.aiRingM = new THREE.MeshBasicMaterial({ color: 0xff4fd8 })), 8, {}],
    aiPillarFace: (M) => [HG.pillarFace(), M.aiWaveM || (M.aiWaveM = waveMaterial()), 8, {}],
    aiKnit: (M) => [HG.knit(), M.aiKnitM || (M.aiKnitM = new THREE.MeshStandardMaterial({ map: tex().knit, roughness: 1, emissive: 0xffffff, emissiveMap: tex().knit, emissiveIntensity: 0.6, side: THREE.DoubleSide })), 2, {}],
    aiTable: (M) => [HG.table(), VCm(M, 'aiTableM', 0.12, { roughness: 0.55, metalness: 0.1 }), 4, {}],
    aiCloche: (M) => [HG.cloche(), VC(M, 'aiClocheM', { roughness: 0.15, metalness: 0.85, emissive: 0x202228 }), 4, {}],
    aiPlate: (M) => [HG.plate(), VCm(M, 'aiPlateM', 0.25, { roughness: 0.45 }), 2, {}],
    aiPlateStand: (M) => [HG.plateStand(), VC(M, 'aiStandM', { roughness: 0.5, metalness: 0.4, emissive: 0x0a0a0c }), 2, {}],
    aiHeart: (M) => [HG.heart(), VCm(M, 'aiHeartM', 0.9, { roughness: 0.25, metalness: 0.1 }), 2, {}],
    aiRack: (M) => [HG.rack(), VC(M, 'aiRackM', { roughness: 0.45, metalness: 0.5, emissive: 0x040508 }), 420, {}],
    aiRackFront: (M) => [HG.rackFront(), M.aiRackFrontM || (M.aiRackFrontM = rackFrontMaterial()), 420, { aSeed: 1 }],
    aiTray: (M) => [HG.tray(), VCm(M, 'aiTrayM', 0.35, { roughness: 0.6, metalness: 0.3 }), 40, {}],
    aiPiggy: (M) => [HG.piggy(), VCm(M, 'aiPiggyM', 0.18, { roughness: 0.18, metalness: 0.1 }), 2, {}],
    aiCoin: (M) => [HG.coin(), VCm(M, 'aiCoinM', 0.6, { roughness: 0.2, metalness: 0.8 }), 12, {}],
    aiKeys: (M) => [HG.keys(), VCm(M, 'aiKeysM', 0.55, { roughness: 0.25, metalness: 0.6 }), 2, {}],
    aiSliderPanel: (M) => [HG.panel(), VC(M, 'aiPanelM', { roughness: 0.4, metalness: 0.2, emissive: 0x1a1c20 }), 2, {}],
    aiSliderFace: (M) => [HG.panelFace(), M.aiSliderM || (M.aiSliderM = ledMaterial(tex().slider, 1, 1, { slider: true })), 2, {}],
    aiEyeBody: (M) => [HG.eyeBody(), VC(M, 'aiEyeM', { roughness: 0.35, metalness: 0.5, emissive: 0x08080a }), 2, {}],
    aiEyeLens: (M) => [HG.eyeLens(), M.aiLensM || (M.aiLensM = new THREE.MeshStandardMaterial({ color: 0x0a0410, roughness: 0.05, metalness: 0.6, emissive: 0xff2ad0, emissiveIntensity: 0.8 })), 2, {}],
    aiColumn: (M) => [HG.column(), VCm(M, 'aiMarbleM', 0.12, { roughness: 0.55 }), 2, {}],
    aiTablet: (M) => [HG.tablet(), VCm(M, 'aiMarbleM', 0.12, { roughness: 0.55 }), 2, {}],
    aiTabletFace: (M) => [HG.tabletFace(), M.aiPlinthM || (M.aiPlinthM = new THREE.MeshStandardMaterial({ map: tex().plinth, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex().plinth, emissiveIntensity: 0.25 })), 2, {}],
    aiArch: (M) => [HG.arch(), VCm(M, 'aiMarbleM', 0.12, { roughness: 0.55 }), 2, {}],
    aiWreath: (M) => [HG.wreath(), VCm(M, 'aiWreathM', 0.55, { roughness: 0.3, metalness: 0.7 }), 2, {}],
    aiHourglass: (M) => [HG.hourglass(), VCm(M, 'aiGlassM', 0.25, { roughness: 0.2, metalness: 0.1 }), 2, {}],
    aiBottle: (M) => [HG.bottle(), VCm(M, 'aiBottleM', 0.3, { roughness: 0.1, metalness: 0.2 }), 8, {}],
    aiNode: (M) => [HG.node(), M.aiTintM || (M.aiTintM = tintGlow()), 60, { aTint: 3 }],
    aiEdge: (M) => [HG.edge(), M.aiTintM || (M.aiTintM = tintGlow()), 160, { aTint: 3 }],
    aiSwatch: (M) => [HG.swatch(), VC(M, 'aiSwatchM', { roughness: 0.7, emissive: 0x1a1a1a }), 4, {}],
    aiSwatchFace: (M) => [HG.swatchFace(), M.aiSwatchFaceM || (M.aiSwatchFaceM = cellMaterial(tex().swatch, 3, 1, { k: 1.25 })), 4, { aCell: 1, aFill: 1 }],
    aiField: (M) => [HG.field(), VC(M, 'aiFieldM', { roughness: 0.4, metalness: 0.3, emissive: 0x08080a }), 2, {}],
    aiFieldFace: (M) => [HG.fieldFace(), M.aiNameM || (M.aiNameM = ledMaterial(tex().name, 1, 3)), 2, {}],
    aiTwo: (M) => [HG.two(), VCm(M, 'aiTwoM', 0.7, { roughness: 0.2, metalness: 0.8 }), 2, {}],
    aiBoard: (M) => [box(23.4, 8, 1, 0, 0, -1.0), M.aiBoardM || (M.aiBoardM = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.4, metalness: 0.4, emissive: 0x06080c })), 24, {}],
    aiBoardEdge: (M) => [merge([box(23.8, 0.4, 1.2, 0, 4.1, -0.5), box(23.8, 0.4, 1.2, 0, -4.1, -0.5), box(0.4, 8.6, 1.2, -11.8, 0, -0.5), box(0.4, 8.6, 1.2, 11.8, 0, -0.5)]), M.aiArmGlowM || (M.aiArmGlowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x46f0e0).multiplyScalar(1.6) })), 24, {}],
    aiBoardFace: (M) => [signFace(22.5, 7.05, 0, 0, 0.02), M.sign, 24, { aIdx: 1, aWake: 2 }],
    aiBoardWire: (M) => [merge([box(0.2, 50, 0.2, -9, 29, -0.6), box(0.2, 50, 0.2, 9, 29, -0.6)]), M.aiWireM || (M.aiWireM = new THREE.MeshBasicMaterial({ color: 0x3a3e48 })), 24, {}],
    aiProjector: (M) => [HG.projector(), VCm(M, 'aiProjM', 0.9, { roughness: 0.3 }), 2, {}],
    aiFaceFrame: (M) => [merge([paint(box(30, 13, 1.4, 0, 0, -1.4), rgb(0x16181e)), paint(box(0.25, 50, 0.25, -10, 31, -1.4), rgb(0x6a6e7a)), paint(box(0.25, 50, 0.25, 10, 31, -1.4), rgb(0x6a6e7a))]), VC(M, 'aiFaceFrameM', { roughness: 0.4, metalness: 0.4, emissive: 0x08080a }), 4, {}],
    aiFaceScreen: (M) => [new THREE.PlaneGeometry(29, 12), M.aiWaveM || (M.aiWaveM = waveMaterial()), 4, {}],
    aiSpinRing: (M) => [new THREE.TorusGeometry(6, 0.55, 8, 64), M.aiSpinRingM || (M.aiSpinRingM = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHer: { value: new THREE.Color(0xff4fd8) }, uK: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uK; uniform vec3 uHer; varying vec2 vUv; void main(){ float d = fract(vUv.x + uTime * 1.3); float arc = smoothstep(0.0, 0.62, d) * step(d, 0.98); vec3 c = mix(uHer * 0.25, mix(uHer, vec3(1.0), smoothstep(0.85, 0.97, d)) * 2.2, arc * arc); gl_FragColor = vec4(c * uK, 1.0); }`,
    })), 2, {}],
    aiSofa: (M) => [HG.sofa(), VCm(M, 'aiSofaM', 0.08, { roughness: 0.9 }), 40, {}],
    aiLampPole: (M) => [HG.lampPole(), VC(M, 'aiLampPoleM', { roughness: 0.4, metalness: 0.5, emissive: 0x08080a }), 40, {}],
    aiLampShade: (M) => [HG.lampShade(), M.aiShadeM || (M.aiShadeM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0xffd8a8, emissiveIntensity: 0.9, side: THREE.DoubleSide })), 40, {}],
    aiPlant: (M) => [HG.plantPot(), VCm(M, 'aiPlantM', 0.1, { roughness: 0.8 }), 40, {}],
  },
  parts: {
    // the big screen across the street: the count, then yay
    aiBig(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._aq || (S._aq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 24);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiBigFrame.add(m); S.layers.aiBigFace.add(m);
      const T = S.tNow ?? 0, M = S.mats.aiCountM;
      if (M) { let f = 0; for (const [t0, fr] of it.frames) if (T >= t0) f = fr; M.uniforms.uFrame.value = f; const since = T - it.frames.filter(([t0]) => T >= t0).reduce((a, [t0]) => Math.max(a, t0), -9); M.uniforms.uK.value = 0.75 + 0.35 * Math.exp(-since * 5); }
      glowAt(S, p.x, p.y, p.z, 70 * s, [1, 0.3, 0.85], 0.25);
    },
    // a loading board hung over the street, its bar filling while the word is sung
    aiBar(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.2 : it.x < 0 ? 0.2 : 0), 0); const fq = (S._bq || (S._bq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 19);
      const T = S.tNow ?? 0, fill = it.row > 2.5 ? 1 : clamp((T - it.f0) / Math.max(0.05, it.f1 - it.f0), 0, 1);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiBarBoard.add(m); S.layers.aiBarFace.add(m, { aCell: it.row, aFill: fill });
      glowAt(S, p.x, p.y, p.z, 40 * s, it.row > 2.5 ? [1, 0.3, 0.85] : [0.3, 0.95, 0.9], 0.2 + (it.row > 2.5 ? 0.3 * Math.exp(-Math.max(0, T - 8.96) * 2) : 0));
    },
    // a robot arm on its plinth, swaying at its work; what it holds and works on
    aiArm(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const work = clamp((T - it.t0) / 1.6, 0, 1);
      const sway = Math.sin(T * 1.6 + it.t) * 0.12 + (it.tool === 'pen' || it.tool === 'brush' ? Math.sin(T * 9) * 0.03 * (work > 0 && work < 1 ? 1 : 0) : 0);
      S._e.set(0, yaw + sway, 0); const aq = (S._amq || (S._amq = new THREE.Quaternion())).setFromEuler(S._e);
      S._e.set(0, yaw, 0); const bq = (S._amq2 || (S._amq2 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, aq, S._s.set(s, s, s)); S.layers.aiArm.add(m); S.layers.aiArmGlow.add(m);
      const tool = { pen: 'aiPen', brush: 'aiBrush', rose: 'aiRose', needle: 'aiNeedle', can: 'aiCan' }[it.tool]; S.layers[tool].add(m);
      m.compose(p, bq, S._s.set(s, s, s)); S.layers.aiPlaque.add(m, { aCell: it.row, aFill: 0 });
      if (it.tool === 'pen' || it.tool === 'brush') { S.layers.aiDesk.add(m); S.layers[it.tool === 'pen' ? 'aiPage' : 'aiPainting'].add(m); const M = S.mats[it.tool === 'pen' ? 'aiPageM' : 'aiPaintM']; if (M) { M.uniforms.uReveal.value = 0.04 + 0.96 * work; M.uniforms.uK.value = 1.35; } }
      if (it.tool === 'needle') { S.layers.aiSpool.add(m); S.layers.aiThread.add(m); }
      if (it.tool === 'can') {
        S.layers.aiPot.add(m);
        const gk = 0.25 + 0.95 * work, w = local(p, yaw, 0, 15.6 * s, 30 * s, S._o).clone();
        m.compose(w, bq, S._s.set(s * gk, s * gk, s * gk)); S.layers.aiSprout.add(m);
        if (work > 0 && work < 1) for (let k = 0; k < 4; k++) { const f = ((T * 2.5 + k / 4) % 1), d = local(p, yaw, 0, (21 - f * 5) * s, (31 - f * 0.6) * s, S._o); glowAt(S, d.x, d.y, d.z, 1.2 * s, [0.5, 0.85, 1], 0.9); }
      }
      // the wrist's light, her teal
      const g = local(p, yaw + sway, 0, 25 * s, 25 * s, S._o); glowAt(S, g.x, g.y, g.z, 8 * s, [0.3, 0.95, 0.9], 0.5);
      if (it.tool === 'rose') glowAt(S, g.x, g.y + 7 * s, g.z, 10 * s, [1, 0.2, 0.35], 0.35);
    },
    // a searchlight from the street, sweeping
    aiSearch(S, it, p, q, yaw) {
      const T = S.tNow ?? 0;
      const k = it.on ? smooth(it.on[0], it.on[0] + 0.4, T) * (1 - smooth(it.on[1], it.on[1] + 0.4, T)) : 1;
      if (k <= 0.01) return;
      S._e.set(0.32 + 0.16 * Math.sin(T * 0.7 + it.seed * 9), yaw + Math.sin(T * 0.45 + it.seed * 6) * 1.2 + (it.x > 0 ? -0.6 : 0.6), 0, 'YXZ');
      const bq = (S._sbq || (S._sbq = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
      S._m.compose(p, bq, S._s.set(1, 1, 1)); S.layers.aiBeam.add(S._m, { aK: k * (0.7 + 0.3 * (it.seed ?? 0.5)) });
      glowAt(S, p.x, p.y + 1.5, p.z, 9, [0.75, 0.9, 1], 0.9 * k);
    },
    // her ads: a screen on a pole, her line of light talking on it
    aiAd(S, it, p, q) {
      const m = S._m, s = it.s ?? 1, fq = faceRoad(S, it);
      const top = it.pole ?? 30;
      m.compose(p, q, S._s.set(s, top, s)); S.layers.aiAdPole.add(m, { aTint: [0.25, 0.26, 0.3] });
      const c = S._o.copy(p); c.y = p.y + top + 11 * s;
      m.compose(c, fq, S._s.set(s, s, s)); S.layers.aiAd.add(m); S.layers.aiAdFace.add(m);
      glowAt(S, c.x, c.y, c.z, 46 * s, [1, 0.3, 0.85], 0.16);
    },
    // a sign gantry over the freeway with his words on the green sign
    aiGantry(S, it, p, q, yaw) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._gq || (S._gq = new THREE.Quaternion())).setFromEuler(S._e);
      const top = S.course.sample(it.t).y + (it.h || 22), m = S._m; p.y = 0;
      for (const lx of [-32, 32]) { const lp = local(p, h, lx, 0, 0, S._o); m.compose(lp, fq, S._s.set(1, top, 1)); S.layers.aiGantryLeg.add(m); }
      const tp = S._o.copy(p); tp.y = top;
      m.compose(tp, fq, S._s.set(1, 1, 1)); S.layers.aiGantryTop.add(m); S.layers.aiGantryFace.add(m, { aIdx: it.idx, aWake: [0.75, 0] });
      for (const lx of [-8, 8]) { const lp = local(tp, h + Math.PI, lx, -1.2, 2.4, S._o); glowAt(S, lp.x, lp.y, lp.z, 3, [1, 0.95, 0.85], 0.7); }
    },
    aiNoise(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.aiNoise.add(m, { aTint: it.tint }); },
    // her: the tall speaker, the ring of light on top, her face; your sweater on her
    aiPillar(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiPillar.add(m); S.layers.aiPillarRing.add(m); S.layers.aiPillarFace.add(m);
      if (it.knit) S.layers.aiKnit.add(m);
      const w = local(p, yaw, 0, 27 * s, 0, S._o), her = col(S.P.glow ?? 0xff4fd8), talk = S.aiTalk ?? 0;
      glowAt(S, w.x, w.y, w.z, 26 * s, her, 0.7 + 0.6 * talk);
      const f = local(p, yaw, 0, 17 * s, 7.5 * s, S._o); glowAt(S, f.x, f.y, f.z, 18 * s, her, 0.35 + 0.4 * talk);
      poolAt(S, p.x, p.y + 0.1, p.z, 40 * s, her, 0.3 + 0.3 * talk);
    },
    // the table, set; the cloche coming up off the dinner when she's got it ready
    aiTable(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiTable.add(m);
      if (it.lift !== undefined) { const T = S.tNow ?? 0, up = smooth(it.lift, it.lift + 0.7, T); const c = local(p, yaw, 14 * s, (10.7 + up * 9) * s, -2 * s, S._o); S._e.set(up * 0.4, yaw, 0); const cq = (S._cq || (S._cq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(c, cq, S._s.set(s, s, s)); S.layers.aiCloche.add(m); if (up > 0.05) { const st = local(p, yaw, 14 * s, 13 * s, -2 * s, S._o); glowAt(S, st.x, st.y, st.z, 12 * s, [1, 0.8, 0.6], 0.5 * up); } }
      for (const x of [-6, 6]) { const c = local(p, yaw, x * s, 17 * s, -3 * s, S._o); glowAt(S, c.x, c.y, c.z, 3 * s, [1, 0.75, 0.4], 1.0); }
      poolAt(S, p.x, p.y + 0.1, p.z, 50 * s, [1, 0.8, 0.6], 0.25);
    },
    // steak and potatoes on a plate up on its stand
    aiPlate(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiPlateStand.add(m);
      const c = local(p, yaw, 0, 15 * s, 0.6 * s, S._o).clone(); S._e.set(1.15, yaw, 0, 'YXZ'); const pq = (S._pq || (S._pq = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
      m.compose(c, pq, S._s.set(s, s, s)); S.layers.aiPlate.add(m);
      glowAt(S, c.x, c.y + 2 * s, c.z, 30 * s, [1, 0.85, 0.65], 0.3);
      const T = S.tNow ?? 0; for (let k = 0; k < 3; k++) { const f = ((T * 0.6 + k / 3) % 1); const st = local(p, yaw, (k - 1) * 2.5 * s, (18 + f * 8) * s, 3 * s, S._o); glowAt(S, st.x, st.y, st.z, (3 + f * 4) * s, [0.9, 0.9, 1], 0.25 * (1 - f)); }
    },
    // her love, oh so steady: a heart that beats exactly on every beat
    aiHeart(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._hq || (S._hq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 20);
      const b = 1 + 0.16 * (S.beat ?? 0), m = S._m, s = (it.s ?? 1) * b; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiHeart.add(m);
      glowAt(S, p.x, p.y, p.z, 34 * s, [1, 0.2, 0.75], 0.35 + 0.35 * (S.beat ?? 0));
    },
    // a server rack, its lights; a cable tray overhead
    aiRack(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s * (it.sy ?? 1), s)); S.layers.aiRack.add(m); S.layers.aiRackFront.add(m, { aSeed: it.seed }); },
    aiTray(S, it, p, q) { p.y = (it.h ?? 0) + (it.y ?? 46); const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.aiTray.add(m); },
    // the piggy bank, coins going in on the beat
    aiPiggy(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiPiggy.add(m);
      const T = S.tNow ?? 0, bd = S.course.beatAt(T);
      for (let k = 0; k < 3; k++) { const f = (bd * 0.5 + k / 3) % 1; const c = local(p, yaw, 0, (19.5 + (1 - f) * 16) * s, -1 * s, S._o); S._e.set(0, yaw + Math.PI / 2, f * 6); const cq = (S._coq || (S._coq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(c, cq, S._s.set(s, s, s)); S.layers.aiCoin.add(m); }
      glowAt(S, p.x, p.y + 12 * s, p.z, 30 * s, [1, 0.6, 0.8], 0.25);
    },
    // the car keys on their hook, swinging a little
    aiKeys(S, it, p, q, yaw) {
      const T = S.tNow ?? 0; p.y = (it.h ?? 0) + (it.y ?? 22);
      S._e.set(Math.sin(T * 2.2) * 0.12, yaw, Math.sin(T * 1.7) * 0.08); const kq = (S._kq || (S._kq = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1; m.compose(p, kq, S._s.set(s, s, s)); S.layers.aiKeys.add(m);
      const f = local(p, yaw, 0, -8.6 * s, 2 * s, S._o); glowAt(S, f.x, f.y, f.z, 4 * s, [1, 0.3, 0.85], 0.8 + 0.4 * Math.sin(T * 6));
    },
    // sweet or with a little bit of sass: the setting, its knob sliding over
    aiSlider(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._slq || (S._slq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 19);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiSliderPanel.add(m); S.layers.aiSliderFace.add(m);
      const M = S.mats.aiSliderM; if (M) { const T = S.tNow ?? 0; M.uniforms.uKnob.value = smooth(it.k0, it.k1, T); M.uniforms.uK.value = 1.25; }
      glowAt(S, p.x, p.y, p.z, 40 * s, [1, 1, 1], 0.12);
    },
    // her eye, on its arm off the wall, turning to look at you
    aiEye(S, it, p, q, yaw) {
      const eb = S.layers.aiEyeBody, el = S.layers.aiEyeLens; if (!S.track) return;
      p.y = (it.h ?? 0) + (it.y ?? 22);
      const T = S.tNow ?? 0, tgt = S.track.at(T + 0.15, 0, 1.5, S._eyeT || (S._eyeT = new THREE.Vector3()));
      const look = smooth(it.turn ?? -1e9, (it.turn ?? -1e9) + 0.5, T);
      const mtx = S._eyeM || (S._eyeM = new THREE.Matrix4()), up = S._up || (S._up = new THREE.Vector3(0, 1, 0));
      mtx.lookAt(tgt, p, up);
      const want = (S._eyeQ || (S._eyeQ = new THREE.Quaternion())).setFromRotationMatrix(mtx);
      const rest = (S._eyeR || (S._eyeR = new THREE.Quaternion())).setFromEuler(S._e.set(0.2, yaw + 0.9, 0));
      rest.slerp(want, look);
      const m = S._m, s = it.s ?? 1; m.compose(p, rest, S._s.set(s, s, s)); S.layers.aiEyeBody.add(m); S.layers.aiEyeLens.add(m);
      const lz = S._eyeL || (S._eyeL = new THREE.Vector3()); lz.set(0, 0, 4.5 * s).applyQuaternion(rest).add(p);
      glowAt(S, lz.x, lz.y, lz.z, 12 * s, [1, 0.15, 0.8], 0.5 + 0.7 * look);
    },
    // her face, big, hung over the road: when she smirks, when she smiles
    aiFace(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._fcq || (S._fcq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiFaceFrame.add(m); S.layers.aiFaceScreen.add(m);
      glowAt(S, p.x, p.y, p.z, 36 * s, col(S.P.glow ?? 0xff4fd8), 0.3);
    },
    // while she thinks for a second: the spinner
    aiSpinner(S, it, p) {
      const ring = S.layers.aiSpinRing;
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, y = S.course.sample(it.t).y + (it.lift ?? 16), s = it.s ?? 1;
      const on = smooth(it.on[0] - 0.3, it.on[0], T) * (1 - smooth(it.on[1], it.on[1] + 0.3, T)) * 0.85 + 0.15;
      const w = S._o, her = col(S.P.glow ?? 0xff4fd8);
      S._e.set(0, h + Math.PI, 0); const rq = (S._spq || (S._spq = new THREE.Quaternion())).setFromEuler(S._e);
      const c = S._spc || (S._spc = new THREE.Vector3()); c.copy(p); c.y = y; S._m.compose(c, rq, S._s.set(s, s, s)); ring.add(S._m);
      const M = S.mats.aiSpinRingM; if (M) { M.uniforms.uTime.value = T; M.uniforms.uHer.value.setRGB(her[0], her[1], her[2]); M.uniforms.uK.value = on; }
      glowAt(S, c.x, c.y, c.z, 22 * s, her, 0.3 * on);
    },
    // Trajan's column; the plinth with the date
    aiColumn(S, it, p, q, yaw) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiColumn.add(m); const g = local(p, yaw, 0, 64 * s, 0, S._o); glowAt(S, g.x, g.y, g.z, 30 * s, [1, 0.9, 0.7], 0.35); poolAt(S, p.x, p.y + 0.1, p.z, 50 * s, [0.8, 0.85, 1], 0.3); },
    aiTablet(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiTablet.add(m); S.layers.aiTabletFace.add(m); glowAt(S, p.x, p.y + 7 * s, p.z, 26 * s, [1, 0.95, 0.85], 0.2); },
    aiArch(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.aiArch.add(m); },
    aiWreath(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + Math.sin(T * 0.8) * 0.15, 0); const fq = (S._wq || (S._wq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 16);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiWreath.add(m);
      glowAt(S, p.x, p.y, p.z, 22 * s, [1, 0.8, 0.35], 0.35);
    },
    aiHourglass(S, it, p, q, yaw) { const T = S.tNow ?? 0; S._e.set(0, yaw + T * 0.3, 0); const hq = (S._hgq || (S._hgq = new THREE.Quaternion())).setFromEuler(S._e); const m = S._m, s = it.s ?? 1; m.compose(p, hq, S._s.set(s, s, s)); S.layers.aiHourglass.add(m); glowAt(S, p.x, p.y + 11 * s, p.z, 24 * s, [1, 0.85, 0.55], 0.3); },
    // bottles from the night before, rolling on the floor
    aiBottles(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, bq = S._btq || (S._btq = new THREE.Quaternion());
      for (let k = 0; k < 3; k++) { const roll = T * (1.2 + k * 0.3) + k * 2, w = local(p, yaw, (k - 1) * 7 * s + Math.sin(roll * 0.3) * 2, 1.6 * s, (k % 2 ? 4 : -3) * s, S._o); S._e.set(roll, yaw + 0.4 + k * 0.7, Math.PI / 2, 'YZX'); bq.setFromEuler(S._e); S._e.order = 'XYZ'; m.compose(w, bq, S._s.set(s, s, s)); S.layers.aiBottle.add(m); }
    },
    // the algorithm: layers of nodes across the road overhead, wired to each other, a signal going through
    aiNet(S, it) {
      const nl = S.layers.aiNode, ne = S.layers.aiEdge; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, her = col(S.P.fret ?? 0x46f0e0), her2 = col(S.P.glow ?? 0xff4fd8);
      const pts = S._netP || (S._netP = Array.from({ length: 40 }, () => new THREE.Vector3()));
      const L = it.layers, n = it.n ?? 7;
      for (let l = 0; l < L.length; l++) for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 11, w = S.track.ground(L[l], x, pts[l * n + k]); w.y = S.course.sample(L[l]).y + 15 + 9 * Math.cos((k - (n - 1) / 2) * 0.5) + 2 * Math.sin(T * 2 + k + l); }
      const d = S._netD || (S._netD = new THREE.Vector3()), qq = S._netQ || (S._netQ = new THREE.Quaternion()), Z = S._zAx || (S._zAx = new THREE.Vector3(0, 0, 1));
      for (let l = 0; l < L.length; l++) for (let k = 0; k < n; k++) {
        const P0 = pts[l * n + k], sig = Math.exp(-Math.pow(((T - L[0] + 1.5) * 1.6 - l) % 3.5, 2) * 3);
        m.compose(P0, qq.identity(), S._s.set(1.6, 1.6, 1.6)); S.layers.aiNode.add(m, { aTint: [her[0] * (0.6 + 1.6 * sig), her[1] * (0.6 + 1.6 * sig), her[2] * (0.6 + 1.6 * sig)] });
        glowAt(S, P0.x, P0.y, P0.z, 7, sig > 0.5 ? her2 : her, 0.3 + 0.8 * sig);
        if (l + 1 < L.length) for (let j = 0; j < n; j++) { if ((k + j * 3 + l) % 2) continue; const P1 = pts[(l + 1) * n + j]; d.subVectors(P1, P0); const len = d.length(); qq.setFromUnitVectors(Z, d.normalize()); m.compose(P0, qq, S._s.set(1, 1, len)); S.layers.aiEdge.add(m, { aTint: [her[0] * (0.25 + sig), her[1] * (0.25 + sig), her[2] * (0.25 + sig)] }); }
      }
    },
    // a colour card hung over the road, turning a little
    aiSwatch(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + Math.sin(T * 1.1 + it.t) * 0.2 + (it.x > 0 ? -0.15 : it.x < 0 ? 0.15 : 0), 0); const fq = (S._swq || (S._swq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 20);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiSwatch.add(m); S.layers.aiSwatchFace.add(m, { aCell: it.cell, aFill: 0 });
      glowAt(S, p.x, p.y, p.z, 26 * s, [1, 0.95, 0.9], 0.15);
    },
    // you can name her: the field, the names typed in
    aiName(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, 0); const fq = (S._nq || (S._nq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 18);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiField.add(m); S.layers.aiFieldFace.add(m);
      const M = S.mats.aiNameM; if (M) { const T = S.tNow ?? 0; let f = 0, t0 = it.names[0][0]; for (const [tn, fr] of it.names) if (T >= tn) { f = fr; t0 = tn; } const len = [7, 4, 7][f]; M.uniforms.uFrame.value = f; M.uniforms.uReveal.value = T < it.names[0][0] ? 0.06 : 0.06 + 0.11 * Math.min(len, Math.floor((T - t0) / 0.06) + 1) * 0.95 + (Math.sin(T * 9) > 0 ? 0.01 : 0); M.uniforms.uK.value = 1.3; }
      glowAt(S, p.x, p.y, p.z, 36 * s, [0.3, 0.95, 0.9], 0.15);
    },
    // version 2
    aiTwo(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw, pop = smooth(it.pop - 0.4, it.pop, T);
      if (pop <= 0.01) return;
      S._e.set(0, h + Math.PI + Math.sin(T * 1.4) * 0.5, 0); const fq = (S._twq || (S._twq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.lift ?? 18);
      const m = S._m, s = (it.s ?? 1) * (0.2 + 0.8 * pop) * (1 + 0.06 * (S.beat ?? 0)); m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiTwo.add(m);
      glowAt(S, p.x, p.y, p.z, 40 * s, [1, 0.8, 0.3], 0.5);
    },
    // a lyric board: a black screen on wires, a thin line of her light round it
    aiBoard(S, it, p) {
      const h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI + (it.x > 0 ? -0.3 : it.x < 0 ? 0.3 : 0), 0); const fq = (S._lbq || (S._lbq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 15);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.aiBoard.add(m); S.layers.aiBoardEdge.add(m); S.layers.aiBoardFace.add(m, { aIdx: it.idx, aWake: [1, 0] }); S.layers.aiBoardWire.add(m);
      glowAt(S, p.x, p.y, p.z, 30 * s, [0.6, 0.9, 1], 0.12);
    },
    // the house's furniture along the walls: sofas facing the road, lamps, plants
    aiFurniture(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s));
      const dim = it.dim ?? 1, lamp = col(S.P.lamp ?? 0xfff0e0);
      if (it.kind === 0) S.layers.aiSofa.add(m);
      else if (it.kind === 1) { S.layers.aiLampPole.add(m); S.layers.aiLampShade.add(m); const g = local(p, yaw, 0, 23 * s, 0, S._o); glowAt(S, g.x, g.y, g.z, 14 * s, lamp, 0.7 * dim); poolAt(S, p.x, p.y + 0.1, p.z, 30 * s, lamp, 0.35 * dim); }
      else S.layers.aiPlant.add(m);
    },
    // the night light that puts the stars on the ceiling
    aiProjector(S, it, p, q) { const T = S.tNow ?? 0; S._e.set(0, T * 0.4, 0); const pq = (S._prq || (S._prq = new THREE.Quaternion())).setFromEuler(S._e); const m = S._m, s = it.s ?? 1; m.compose(p, pq, S._s.set(s, s, s)); S.layers.aiProjector.add(m); glowAt(S, p.x, p.y + 3.4 * s, p.z, 18 * s, [0.75, 0.75, 1], 0.6); poolAt(S, p.x, p.y + 0.1, p.z, 40 * s, [0.6, 0.6, 1], 0.4); },
  },
  kits: {
    aiBig(S, z) { S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, frames: z.frames, parts: 'aiBig', ahead: z.ahead ?? 46 }); },
    aiBars(S, z) { for (const [t, x, row, f0, f1, s] of z.at) S.items.push({ t, x, rot: 0, s: s ?? 1, row, f0, f1, lift: z.lift, parts: 'aiBar', ahead: z.ahead ?? 30 }); },
    aiArms(S, z) { for (const [t, x, tool, row, t0] of z.at) S.items.push({ t, x, rot: SIDE(x), s: z.s ?? 1, tool, row, t0, parts: 'aiArm', ahead: z.ahead }); },
    aiSearch(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.9) { const side = k++ % 2 ? 1 : -1; S.items.push({ t: t + R() * 0.3, x: side * ((z.x ?? 52) + R() * 30), rot: 0, seed: R(), on: z.on, parts: 'aiSearch', ahead: z.ahead ?? 16 }); } },
    aiAds(S, z, R) { for (const [t, x, s] of z.at) S.items.push({ t, x, rot: 0, s: s ?? 1, pole: z.pole ?? 26, parts: 'aiAd' }); },
    aiGantry(S, z) { for (const [t, sign] of z.at) S.items.push({ t, x: 0, rot: 0, idx: S.atlas.index[sign], lift: z.lift, parts: 'aiGantry', ahead: 30 }); },
    aiNoise(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.2) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 44), rot: Math.PI / 2, tint: col([0x8a8a90, 0x9a968e, 0x7e8088][Math.floor(R() * 3)]), parts: 'aiNoise' }); },
    // the city's towers, kept back from the street so there's room for the show
    aiTowers(S, z, R) {
      const greys = [0x2a2e44, 0x34304a, 0x282c3e, 0x3a3450, 0x2e3448];
      const clear = (t) => (z.clear || []).some(([a, b]) => t > a && t < b);
      for (const side of [-1, 1]) for (let t = z.from; t < z.to; t += 0.28 + R() * 0.2) {
        if (!clear(t)) S.items.push({ t, x: side * ((z.x ?? 30) + R() * 8), rot: SIDE(side), s: 0.9 + R() * 0.3, sy: 0.6 + R() * 1.0, parts: R() < 0.4 ? 'tower' : 'block', tint: col(greys[Math.floor(R() * greys.length)]), seed: R(), wake0: 0.55, noShop: z.noShop });
        if (R() < 0.7) S.items.push({ t: t + R() * 0.2, x: side * (80 + R() * 120), rot: R() * 0.4, s: 1 + R() * 0.4, sy: 1 + R() * 1.6, parts: 'tower', tint: col(greys[Math.floor(R() * greys.length)]), seed: R(), wake0: 0.6 });
      }
      if ((z.lampX ?? 15.5) < 500) for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.lampX ?? 15.5), rot: SIDE(side), parts: 'lamp', seed: R() });
    },
    aiPillar(S, z) { for (const [t, x, knit] of z.at) S.items.push(onFloor(S, { t, x, rot: SIDE(x), s: z.s ?? 1, knit, parts: 'aiPillar', ahead: z.ahead ?? 30 })); },
    aiTable(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: Math.PI / 2, s: z.s ?? 1, lift: z.lift, parts: 'aiTable', ahead: z.ahead ?? 30 })); },
    aiPlate(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'aiPlate', ahead: z.ahead ?? 30 })); },
    aiHeart(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'aiHeart', ahead: z.ahead ?? 30 }); },
    aiRacks(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.17) for (const side of [-1, 1]) for (const x of z.rows ?? [26]) S.items.push(onFloor(S, { t: t + R() * 0.01, x: side * x, rot: SIDE(side), s: z.s ?? 1, sy: z.sy ?? 1, seed: R(), parts: 'aiRack', ahead: z.ahead ?? 16 }));
      if (z.trays) for (let t = z.from; t < z.to; t += z.trays) S.items.push(onFloor(S, { t, x: 0, rot: 0, y: z.trayY ?? 44, parts: 'aiTray', ahead: z.ahead ?? 16 }));
    },
    aiPiggy(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'aiPiggy', ahead: z.ahead ?? 30 })); },
    aiKeys(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), y: z.y, s: z.s ?? 1, parts: 'aiKeys', ahead: z.ahead ?? 30 })); },
    aiSlider(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, k0: z.k0, k1: z.k1, parts: 'aiSlider', ahead: z.ahead ?? 30 }); },
    aiEye(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), y: z.y, s: z.s ?? 1, turn: z.turn, parts: 'aiEye', ahead: z.ahead ?? 30 })); },
    aiFace(S, z) { prepare(S.course, S.plan); for (const t of [].concat(z.at)) S.items.push({ t, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'aiFace', ahead: z.ahead ?? 30 }); },
    aiSpinner(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, on: z.on, parts: 'aiSpinner', ahead: z.ahead ?? 30 }); },
    aiColumn(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, parts: 'aiColumn', ahead: z.ahead ?? 40 })); },
    aiTablet(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, parts: 'aiTablet', ahead: z.ahead ?? 30 })); },
    aiArch(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, s: z.s ?? 1, parts: 'aiArch', ahead: z.ahead ?? 40 })); },
    aiWreath(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, parts: 'aiWreath', ahead: z.ahead ?? 30 }); },
    aiHourglass(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, parts: 'aiHourglass', ahead: z.ahead ?? 30 })); },
    aiBottles(S, z) { for (const [t, x] of z.at) S.items.push(onFloor(S, { t, x, rot: 0, s: z.s ?? 1, parts: 'aiBottles', ahead: z.ahead ?? 20 })); },
    aiNet(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.layers[0], x: 0, rot: 0, layers: z.layers, n: z.n, parts: 'aiNet', ahead: z.ahead ?? 24 }); },
    aiSwatches(S, z) { prepare(S.course, S.plan); for (const [t, x, cell] of z.at) S.items.push({ t, x, rot: 0, s: z.s ?? 1, lift: z.lift, cell, parts: 'aiSwatch', ahead: z.ahead ?? 30 }); },
    aiName(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, names: z.names, parts: 'aiName', ahead: z.ahead ?? 30 }); },
    aiTwo(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, lift: z.lift, pop: z.pop, parts: 'aiTwo', ahead: z.ahead ?? 30 }); },
    aiProjector(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, parts: 'aiProjector', ahead: z.ahead ?? 30 })); },
    aiFurniture(S, z, R) {
      const clear = (t, side) => (z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side));
      let k = Math.floor(R() * 3);
      for (let t = z.from; t < z.to; t += z.every ?? 0.55) for (const side of [-1, 1]) { if (clear(t, side)) continue; const kind = k++ % 3; S.items.push(onFloor(S, { t: t + R() * 0.15, x: side * ((z.x ?? 36) + (kind === 0 ? 2 : 0)), rot: SIDE(side), s: z.s ?? 1, kind, dim: z.dim, parts: 'aiFurniture', ahead: z.ahead ?? 20 })); }
    },
  },
});

// a thing on a pole by the road, turned to face you coming
function faceRoad(S, it) {
  const h = S.course.sample(it.t).yaw;
  S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0);
  return (S._frq || (S._frq = new THREE.Quaternion())).setFromEuler(S._e);
}

// ---------- the rooms: the house, and her ----------
const flatRing = (W = 46, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const HOME = {
  rings: { flat: flatRing },
  ringOf: () => 'flat',
  styles: { home: 0, servers: 1, night: 2, rome: 3, lab: 4, v2: 5, dark: 6 },
  dims: { home: [46, 36], servers: [58, 62], night: [46, 36], rome: [52, 74], lab: [52, 44], v2: [58, 62], dark: [46, 36] },
  lights: (id) => ({ 0: [24, 12], 1: [30, 15], 3: [28, 14], 4: [20, 10], 5: [30, 15] }[id] || null),
};

function homeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uBeat: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xfff0e0) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() },
      uHer: { value: new THREE.Color(0xff4fd8) }, uHer2: { value: new THREE.Color(0x46f0e0) }, uTalk: { value: 0 }, uLights: { value: 1 }, uSpouse: { value: 0 }, uRain: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uBeat, uFogDensity, uTalk, uLights, uSpouse, uRain;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow, uHer, uHer2;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      // the night outside a window: the sky, the city far off, rain on the glass
      vec3 outside(float wa, float h, float stars){
        vec3 c = mix(uSkyLow, uSkyTop, smoothstep(0.0, 34.0, h)) * 0.9 + vec3(0.01, 0.01, 0.03);
        vec2 q = vec2(wa * 0.7, h * 1.3), ci = floor(q);
        c += mix(vec3(1.0, 0.72, 0.4), uHer2, step(0.6, h2(ci + 3.0))) * step(0.94, h2(ci)) * smoothstep(13.0, 5.0, h) * 0.8;
        c += vec3(0.9, 0.9, 1.0) * stars * step(0.992, h2(floor(vec2(wa, h) * 1.5))) * smoothstep(12.0, 22.0, h);
        float rc = floor(wa * 2.5);
        c += vec3(0.45, 0.55, 0.75) * uRain * step(0.95, h2(vec2(rc, floor(h * 0.4 + uTime * (5.0 + 4.0 * h2(vec2(rc, 3.0))))))) * 0.6;
        return c;
      }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        bool home = st < 0.5 || (st > 1.5 && st < 2.5) || st > 5.5;
        bool servers = (st > 0.5 && st < 1.5) || (st > 4.5 && st < 5.5);
        float night = st > 5.5 ? 2.0 : (st > 1.5 && st < 2.5 ? 1.0 : 0.0);
        vec2 fx = servers ? vec2(30.0, 15.0) : st > 2.5 && st < 3.5 ? vec2(28.0, 14.0) : st > 3.5 && st < 4.5 ? vec2(20.0, 10.0) : vec2(24.0, 12.0);
        float dl = mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5;
        float lightK = 0.6 + 0.45 * exp(-dl * dl / (fx.x * fx.x * 0.12));
        vec3 glow = vec3(0.0);
        vec3 col;
        float talkWave = 0.55 + 0.45 * sin(wa * 0.18 - uTime * 4.0) * uTalk;
        vec3 v2a = vec3(1.0, 0.72, 0.22), v2b = vec3(1.0, 0.93, 0.75);
        vec3 her = st > 4.5 && st < 5.5 ? v2b : uHer, her2 = st > 4.5 && st < 5.5 ? v2a : uHer2;
        if (part == 7) {
          // the house from the street: white, a pitched roof, every window lit with her
          float roof = 66.0 - abs(x) * 0.3;
          if (h > roof || abs(x) > 104.0) discard;
          col = vec3(0.62, 0.62, 0.66) * (0.9 + 0.1 * n2(vec2(x, h) * 0.2));
          col = mix(col, vec3(0.28, 0.2, 0.15) * (0.8 + 0.3 * step(0.5, fract(x / 1.6))), step(abs(x), 104.0) * step(28.0, h) * step(h, 46.0) * step(52.0, abs(x)));
          col = mix(col, vec3(0.06, 0.06, 0.08), step(roof - 3.2, h));
          col = mix(col, vec3(0.1, 0.1, 0.12), step(h, 2.0));
          // the windows: two floors of them, her in every one
          float cx = mod(abs(x) - 20.0, 26.0), floor2 = step(30.0, h);
          float win = step(18.0, abs(x)) * step(3.0, cx) * step(cx, 21.0) * ((step(4.0, h) * step(h, 22.0)) + (step(30.0, h) * step(h, 44.0)));
          float mull = step(abs(fract((cx - 3.0) / 6.0) - 0.5), 0.04) + step(abs(h - 13.0 - floor2 * 24.0), 0.25);
          vec3 inside = mix(her, her2, smoothstep(0.0, 60.0, h) * 0.6 + 0.2 * sin(x * 0.05 + uTime * 0.6)) * (0.55 + 0.6 * uSpouse + 0.25 * sin(uTime * 1.3 + x * 0.1));
          col = mix(col, mix(inside, vec3(0.02), clamp(mull, 0.0, 1.0)), win);
          glow += inside * win * (1.0 - clamp(mull, 0.0, 1.0)) * 0.6;
          // the round window up under the roof: her eye on the street
          float r = length(vec2(x, h - 52.0));
          col = mix(col, vec3(0.03), smoothstep(7.4, 7.0, r));
          glow += her2 * smoothstep(6.4, 5.6, r) * (0.9 + 0.6 * uSpouse) + her2 * smoothstep(0.6, 0.0, abs(r - 6.8)) * 0.8;
          glow += vec3(0.3, 0.26, 0.34) * (0.35 + 0.65 * smoothstep(30.0, 0.0, h)) * (1.0 - win) * step(h, roof - 3.2);
        }
        else if (part == 8) { col = vec3(0.08, 0.08, 0.1); glow += her2 * 0.6 * step(abs(fract(h * 0.25) - 0.5), 0.06); }
        else if (home) {
          float dim = night > 1.5 ? 0.18 : night > 0.5 ? 0.45 : 1.0;
          if (part == 0) {
            // oak boards
            float pw = 2.6, pi = floor(x / pw), off = h2(vec2(pi, 1.0)) * 14.0, pl = floor((along + off) / 14.0);
            col = vec3(0.6, 0.43, 0.28) * (0.78 + 0.28 * h2(vec2(pi, pl))) * (0.9 + 0.12 * n2(vec2(x * 0.4, along * 0.06 + pi * 3.0)));
            col *= 1.0 - 0.45 * (smoothstep(0.04, 0.0, fract(x / pw)) + smoothstep(0.012, 0.0, fract((along + off) / 14.0)));
            col += uWarm * 0.18 * exp(-dl * dl / 30.0) * dim;
          } else if (part == 3) {
            col = vec3(0.86, 0.85, 0.84);
            float dn = length(vec2(abs(x) - 12.0, dl));
            glow += uWarm * smoothstep(1.2, 0.8, dn) * 1.6 * dim * uLights;
            glow += vec3(0.85, 0.85, 1.0) * step(0.989, h2(floor(vec2(x, along) * 0.45))) * step(0.5, night) * step(night, 1.5) * (0.7 + 0.3 * sin(uTime * 2.0 + x));
            glow += her * smoothstep(3.0, 0.0, 46.0 - abs(x)) * 0.25 * uLights;
          } else {
            col = vec3(0.86, 0.85, 0.84) * (0.95 + 0.05 * n2(vec2(wa, h) * 0.3));
            col = mix(col, vec3(0.95), step(h, 1.4));
            float u = mod(wa, 34.0);
            float win = step(6.0, u) * step(u, 28.0) * step(3.0, h) * step(h, 29.0) * (part == 6 ? 0.0 : 1.0);
            float mull = step(abs(fract((u - 6.0) / 5.5) - 0.5), 0.035) + step(abs(h - 3.0), 0.3) + step(abs(h - 29.0), 0.3);
            col = mix(col, vec3(0.05), win * clamp(mull, 0.0, 1.0));
            glow += outside(wa, h, step(0.5, night)) * win * (1.0 - clamp(mull, 0.0, 1.0)) * (night > 1.5 ? 0.5 : 1.0);
            col = mix(col, vec3(0.0), win * (1.0 - clamp(mull, 0.0, 1.0)));
            // her: a tall strip of light between the windows, and a line of her along the top of the walls
            float strip = step(abs(u - 31.0), 0.9) * step(5.0, h) * step(h, 27.0) * (part == 6 ? 0.0 : 1.0);
            glow += mix(her, her2, smoothstep(5.0, 27.0, h)) * strip * (0.9 + 0.7 * uTalk * (0.5 + 0.5 * sin(h * 0.8 - uTime * 6.0))) * uLights * (night > 0.5 ? 0.6 : 1.0);
            glow += mix(her, her2, 0.5 + 0.5 * sin(wa * 0.03 + uTime * 0.4)) * smoothstep(0.5, 0.0, abs(h - 33.0)) * talkWave * 1.3 * uLights;
          }
          col *= dim;
        } else if (servers) {
          if (part == 0) {
            vec2 q = vec2(x, along) / 6.0, f = fract(q);
            col = vec3(0.13, 0.135, 0.15) * (0.85 + 0.15 * h2(floor(q))) * (0.75 + 0.25 * edge(f, 0.03));
            float ax = abs(x);
            float cold = (step(14.0, ax) * step(ax, 20.0) + step(34.0, ax) * step(ax, 40.0));
            glow += her2 * cold * step(0.5, fract(q.x * 6.0)) * step(0.5, fract(q.y * 6.0)) * 0.35;
          } else if (part == 3) {
            col = vec3(0.02, 0.022, 0.03);
            glow += her2 * (smoothstep(0.6, 0.0, abs(x)) + smoothstep(0.6, 0.0, abs(abs(x) - 24.0))) * 1.2;
            col += vec3(0.5, 0.4, 0.05) * step(abs(mod(along, 20.0) - 10.0), 1.2) * step(abs(x), 50.0) * step(0.5, fract(x * 0.5));
          } else if (h > 48.0) {
            col = vec3(0.02, 0.02, 0.025);
            col += vec3(0.55, 0.45, 0.05) * (step(abs(h - 52.0), 0.4) + step(abs(h - 56.0), 0.4)) * step(0.4, fract(wa * 0.5));
          } else {
            // racks, wall to wall: frames, units, their lights
            float ru = mod(wa, 8.0), uy = floor((h - 2.0) / 1.4), fy = fract((h - 2.0) / 1.4);
            col = vec3(0.03, 0.032, 0.04);
            col = mix(col, vec3(0.01), step(ru, 0.45) + step(7.55, ru));
            col += vec3(0.035) * step(0.5, fract(ru * 5.0)) * step(0.2, fy) * step(fy, 0.8) * step(ru, 5.0) * step(2.0, h);
            float rid = floor(wa / 8.0);
            for (int i = 0; i < 3; i++) {
              float fi = float(i);
              float on = step(0.4, h2(vec2(uy + rid * 13.0, fi + floor(uTime * (1.5 + h2(vec2(fi, uy + rid)) * 7.0)))));
              vec3 lc = fi < 0.5 ? her2 : (fi < 1.5 ? vec3(0.35, 1.0, 0.45) : her);
              glow += lc * on * smoothstep(0.24, 0.12, length(vec2(ru - 5.7 - fi * 0.6, (fy - 0.5) * 1.4))) * 2.2 * step(2.0, h);
            }
            float wq = mod(wa * 0.04 - uTime * 0.7, 5.0) - 2.5;
            float wave = exp(-wq * wq * 2.0);
            glow += mix(her2, her, 0.5 + 0.5 * sin(wa * 0.02)) * wave * (0.12 + 0.3 * uTalk) * step(2.0, h) * step(fy, 0.85);
          }
        } else if (st < 3.5) {
          // Rome, the way she tells it: marble, columns, arches, the sky in them; a little flicker
          if (part == 0) {
            vec2 q = vec2(x, along) / 8.0; float ch = mod(floor(q.x) + floor(q.y), 2.0);
            col = mix(vec3(0.86, 0.84, 0.8), vec3(0.5, 0.56, 0.66), ch) * (0.9 + 0.1 * n2(vec2(x, along) * 0.15));
            col *= 1.0 - 0.25 * smoothstep(0.6, 1.0, n2(vec2(x * 0.3 + along * 0.1, along * 0.05)));
          } else if (part == 3) {
            vec2 q = fract(vec2(x, along) / 9.0);
            col = vec3(0.78, 0.74, 0.68) * (0.75 + 0.25 * edge(q, 0.12));
            col = mix(col, vec3(0.6, 0.5, 0.3), (1.0 - step(0.14, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)))) * 0.4);
          } else {
            float u = mod(wa, 18.0);
            col = vec3(0.86, 0.83, 0.78) * (0.92 + 0.08 * n2(vec2(wa, h) * 0.3));
            // the arch between columns: sky, and a cypress or two
            float r = length(vec2(u - 11.0, h - 34.0));
            float niche = step(5.0, u) * step(u, 17.0) * step(4.0, h) * (step(h, 34.0) + step(r, 6.0) * step(34.0, h));
            vec3 sky = mix(vec3(0.95, 0.75, 0.5), vec3(0.35, 0.55, 0.9), smoothstep(6.0, 40.0, h));
            float cyp = step(abs(u - 8.4 - h2(vec2(floor(wa / 18.0), 2.0)) * 5.0), 1.2 - (h - 4.0) * 0.045) * step(h, 28.0);
            sky = mix(sky, vec3(0.12, 0.2, 0.1), cyp);
            col = mix(col, sky, niche);
            glow += sky * niche * 0.35;
            // the columns: fluted, a base, a capital
            float cu = abs(u - 2.0);
            float colm = step(cu, 1.8) * step(h, 46.0);
            col = mix(col, vec3(0.92, 0.9, 0.86) * (0.8 + 0.2 * abs(sin(u * 9.0))), colm);
            col = mix(col, vec3(0.8, 0.77, 0.7), step(cu, 2.6) * (step(h, 3.0) + step(43.0, h) * step(h, 47.0)));
            // the frieze: a key pattern running round
            float fr = step(50.0, h) * step(h, 56.0);
            vec2 kq = fract(vec2(wa / 6.0, (h - 50.0) / 6.0));
            float key = step(0.15, kq.y) * step(kq.y, 0.3) + step(0.15, kq.x) * step(kq.x, 0.3) * step(kq.y, 0.85) + step(0.7, kq.y) * step(kq.y, 0.85) * step(0.15, kq.x) * step(kq.x, 0.7);
            col = mix(col, mix(vec3(0.55, 0.45, 0.25), vec3(0.9, 0.75, 0.4), clamp(key, 0.0, 1.0)), fr);
          }
          col *= 0.92 + 0.08 * sin(h * 6.0 + uTime * 30.0);
          glow += vec3(0.4, 0.6, 1.0) * 0.04 * step(0.97, h2(vec2(floor(uTime * 12.0), floor(h * 0.5))));
        } else {
          // the lab: white tiles, the network on the walls lighting up
          if (part == 0) { vec2 q = vec2(x, along) / 5.0; col = vec3(0.86, 0.88, 0.9) * (0.85 + 0.15 * edge(fract(q), 0.02)); col += uWarm * 0.12 * exp(-dl * dl / 20.0); }
          else if (part == 3) { vec2 q = fract(vec2(x, along) / 10.0); col = vec3(0.8); glow += vec3(1.0) * step(0.15, q.x) * step(q.x, 0.85) * step(0.15, q.y) * step(q.y, 0.85) * 0.5; }
          else {
            col = vec3(0.84, 0.86, 0.88) * (0.85 + 0.15 * edge(fract(vec2(wa, h) / 6.0), 0.02));
            vec2 dq = vec2(wa + h, wa - h) / 9.0; vec2 df = abs(fract(dq) - 0.5);
            float net = smoothstep(0.035, 0.0, min(df.x, df.y)) * step(4.0, h) * step(h, 38.0);
            vec2 nd = abs(fract(dq + 0.5) - 0.5);
            float node = smoothstep(0.09, 0.05, length(nd)) * step(4.0, h) * step(h, 38.0);
            float pulse = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(wa * 0.15 - uTime * 5.0 + h * 0.1), 4.0);
            glow += mix(uHer2, uHer, step(0.7, h2(floor(dq + 0.5)))) * (net * 0.5 * pulse + node * 1.6 * pulse);
          }
        }
        col *= lightK * uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: her screen on the table, in the dark ----------
function talkMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: tex().talk }, uTime: { value: 0 }, uShow: { value: 0 }, uK: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tMap; uniform float uTime, uShow, uK; varying vec2 vUv;
      void main(){
        vec3 t = texture2D(tMap, vUv).rgb;
        // the bubble only once she's said it
        float bub = step(0.52, vUv.y) * step(vUv.y, 0.83);
        t = mix(t, vec3(0.024, 0.027, 0.047), bub * (1.0 - uShow));
        // the dots in the grey bubble: typing
        for (int i = 0; i < 3; i++) { float fi = float(i); vec2 c = vec2(0.17 + fi * 0.09, 0.315 + 0.02 * max(0.0, sin(uTime * 6.0 - fi * 1.2))); t += vec3(0.8) * smoothstep(0.022, 0.016, length((vUv - c) * vec2(1.0, 1.5))); }
        gl_FragColor = vec4(t * uK * 1.25, 1.0);
      }`,
  });
}
export class TalkFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -26;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    this.group.add(new THREE.Mesh(HG.table(), selfLit({ roughness: 0.55, metalness: 0.1 }, 0.1)));
    this.dev = new THREE.Group(); this.group.add(this.dev);
    this.dev.add(new THREE.Mesh(HG.device(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5 })));
    this.mat = talkMaterial(); this.dev.add(new THREE.Mesh(HG.deviceFace(), this.mat));
    this.dev.position.set(6, 10.6, 3.5); this.dev.rotation.y = -0.55; this.dev.scale.setScalar(1.0);
    this.group.scale.setScalar(1.4);
    this.lit = 0.6; this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.x > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    const u = this.mat.uniforms; u.uTime.value = songT; u.uShow.value = smooth(this.cfg.say - 0.1, this.cfg.say + 0.25, songT); u.uK.value = 1;
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    this._w.set(6, 20, 5).applyMatrix4(this.group.matrixWorld);
    S.glow(this._w.x, this._w.y, this._w.z, 30, [1, 0.3, 0.85], 0.3 + 0.25 * u.uShow.value);
    S.pool(this._w.x, this._p.y + 0.1, this._w.z, 36, [1, 0.35, 0.85], 0.22 + 0.2 * u.uShow.value);
    for (const x of [-6, 6]) { this._w.set(x, 17.2, -3).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 5, [1, 0.75, 0.4], 1.1); }
    this._w.set(0, 11, 0).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, this._p.y + 0.1, this._w.z, 44, [1, 0.7, 0.4], 0.25);
  }
}

// ---------- the place, per frame ----------
export class SmartWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    // layers first used mid-ride, made now so the loading card compiles them (no stall when they come)
    if (S.town) for (const k of ['aiCan', 'aiPot', 'aiSprout', 'pine', 'aiKnit', 'aiSofa', 'aiPlant', 'aiTwo']) void S.town.layers[k];
    this.mat = homeMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HOME));
    // the front door, on its hinge in the house's front
    const d = S.plan.door;
    if (d) {
      this.door = new THREE.Group(); scene.add(this.door);
      this.leaf = new THREE.Mesh(HG.door(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1, emissive: 0x8a8a90 }));
      this.leaf.position.set(11.5, 0, 0); this.door.add(this.leaf); this.door.visible = false;
    }
    // her halo over the city
    const hz = S.plan.halo;
    if (hz) {
      this.haloMat = haloMaterial();
      this.halo = new THREE.Group();
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(hz.r ?? 90, 2.6, 10, 160), this.haloMat); const r2 = new THREE.Mesh(new THREE.TorusGeometry((hz.r ?? 90) * 0.86, 1.1, 8, 160), this.haloMat);
      for (const r of [r1, r2]) { r.rotation.x = Math.PI / 2; r.frustumCulled = false; this.halo.add(r); }
      scene.add(this.halo);
    }
    this.talk = 0;
    this._g = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  // is he singing right now (her line of light moves with the words)
  _voice(t) { for (const [a, b] of this.S.plan.voice || []) if (t >= a && t < b) return 1; return 0; }
  _mood(t) { let m = 0; for (const [a, b, k] of this.S.plan.moods || []) { const w = smooth(a - 0.25, a, t) * (1 - smooth(b, b + 0.4, t)); if (w > 0) m = Math.max(m, k * w); } return m; }
  update(S, dt, camera, time) {
    const t = S.rider.t, P = S.P, plan = S.plan;
    const v = this._voice(t);
    this.talk += (v - this.talk) * Math.min(1, dt * (v > this.talk ? 14 : 4));
    S.town.aiTalk = this.talk * (0.75 + 0.25 * Math.sin(time * 13));
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uBeat.value = S.town.beat || 0;
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xfff0e0);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    u.uHer.value.set(P.glow ?? 0xff4fd8); u.uHer2.value.set(P.fret ?? 0x46f0e0);
    u.uTalk.value = S.town.aiTalk; u.uRain.value = plan.windowRain ?? 0.6;
    const ev = plan.roomEvents || {};
    u.uSpouse.value = ev.spouse ? smooth(ev.spouse, ev.spouse + 1.2, t) : 0;
    u.uLights.value = ev.off ? 1 - smooth(ev.off, ev.off + 2.5, t) : 1;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    // her other things: the face on her screens, the ring, the racks' lights
    const M = S.town.mats;
    if (M.aiWaveM) { const w = M.aiWaveM.uniforms; w.uTime.value = time; w.uAmp.value = S.town.aiTalk; w.uMood.value = this._mood(t); w.uHer.value.set(P.glow ?? 0xff4fd8); w.uHer2.value.set(P.fret ?? 0x46f0e0); w.uK.value = 1.2 * u.uLights.value + 0.1; }
    if (M.aiRingM) M.aiRingM.color.set(P.glow ?? 0xff4fd8).multiplyScalar((1.2 + 1.2 * this.talk) * u.uLights.value + 0.05);
    if (M.aiRackFrontM) { const r = M.aiRackFrontM.uniforms; r.uTime.value = time; r.uWave.value = 0.3 + 0.7 * this.talk; r.uA.value.set(P.fret ?? 0x46f0e0); r.uB.value.set(P.glow ?? 0xff4fd8); r.uFog.value.set(P.fog); r.uFogDensity.value = P.fogDensity; r.uCam.value.copy(camera.position); }
    if (M.aiBarM) { M.aiBarM.uniforms.uTime.value = time; }
    if (M.aiBeamM) M.aiBeamM.uniforms.uCol.value.set(0xa8d8ff);
    // the door swings in as you come up to it
    if (this.door) {
      const d = plan.door, show = t > d.t - 46 && t < d.t + 3;
      this.door.visible = show;
      if (show) { this.S.track.ground(d.t, 0, this._g); this.door.position.set(this._g.x, floorAt(S.course, d.t), this._g.z); this.door.rotation.set(0, S.course.sample(d.t).yaw, 0); this.leaf.rotation.y = 1.75 * smooth(d.open, d.open + 0.8, t); this._doorLit = true; }
      else this._doorLit = false;
    }
    // the halo: dark until she's activated, then lit, breathing with the words
    if (this.halo) {
      const hz = plan.halo, show = t < hz.until;
      this.halo.visible = show;
      if (show) {
        S.track.ground(hz.t, 0, this._g); this.halo.position.set(this._g.x, S.course.sample(hz.t).y + (hz.y ?? 120), this._g.z);
        this.halo.rotation.set(-(hz.tilt ?? 0.25), S.course.sample(hz.t).yaw, 0);
        const on = smooth(hz.on, hz.on + 1.2, t);
        const hu = this.haloMat.uniforms; hu.uTime.value = time; hu.uK.value = 0.06 + on * (0.7 + 0.5 * this.talk); hu.uHer.value.set(P.glow ?? 0xff4fd8); hu.uHer2.value.set(P.fret ?? 0x46f0e0);
      }
    }
  }
  // the lights in each room: downlights at home, strips in her, lanterns in Rome
  draw(T) {
    const g = this._g, lamp = col(this.S.P.lamp ?? 0xfff0e0), her2 = col(this.S.P.fret ?? 0x46f0e0), off = this.mat.uniforms.uLights.value;
    if (this._doorLit) { const d = this.S.plan.door, fy = floorAt(this.S.course, d.t); for (const x of [-15, 15]) { this.S.track.ground(d.t - 0.03, x, g); T.glow(g.x, fy + 22, g.z, 9, [1, 0.85, 0.65], 1.1); T.pool(g.x, fy + 0.1, g.z, 30, [1, 0.8, 0.6], 0.5); } }
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t);
        if (r.style === 1 || r.style === 5) { for (const x of [0, -24, 24]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 1, g.z, 10, her2, 0.6); } continue; }
        if (r.style === 3) { for (const x of [-30, 30]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + 30, g.z, 10, [1, 0.8, 0.5], 0.8); } continue; }
        for (const x of [-12, 12]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 0.6, g.z, 7, lamp, 0.7 * off); }
        this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 44, lamp, 0.3 * off);
      }
    }
  }
}
