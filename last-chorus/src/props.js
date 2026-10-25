// The prop library: every building, lamp, sign and car in the night, built from
// code. Buildings light their windows as they "wake"; signs glow and breathe.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const merge = (gs) => { const m = mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false); return m; };

// ---------- shader patches ----------

// tint per instance (aTint) + windows that wake (aWake.x wake, aWake.y seed)
export function buildingMaterial(P, cell, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0 });
  // each window layout compiles its own program (three caches by function source otherwise)
  m.customProgramCacheKey = () => 'bld-' + cell.join('x') + '-' + (opts.floors ?? 99) + '-' + (opts.sill ?? 1.2);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWarm = { value: new THREE.Color(P.window) };
    sh.uniforms.uCandy = { value: new THREE.Color(P.windowAlt) };
    sh.uniforms.uBeat = { value: 0 };
    sh.uniforms.uWinK = { value: P.windowK ?? 1 };
    sh.uniforms.uGlass = { value: new THREE.Color(P.glass ?? 0x030406) };
    m.userData.shader = sh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aWake; attribute vec3 aTint; varying vec3 vWake; varying vec3 vTint; varying vec2 vWin; varying float vUp; varying float vFace; varying float vObjY;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWake = aWake; vTint = aTint; vUp = normal.y; vObjY = position.y;
        float sx = abs(normal.x) > 0.5 ? position.z : position.x;
        vFace = abs(normal.x) > 0.5 ? (normal.x > 0.0 ? 1.0 : 2.0) : (normal.z > 0.0 ? 3.0 : 4.0);
        vWin = vec2(sx / ${cell[0].toFixed(2)}, (position.y - ${(opts.sill ?? 1.2).toFixed(2)}) / ${cell[1].toFixed(2)});`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uWarm, uCandy, uGlass; uniform float uBeat, uWinK; varying vec3 vWake; varying vec3 vTint; varying vec2 vWin; varying float vUp; varying float vFace; varying float vObjY;
        float wh(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cellId = floor(vWin);
        vec2 f = fract(vWin);
        vec2 fw = max(fwidth(vWin), vec2(1e-4));
        float far = smoothstep(0.16, 0.45, max(fw.x, fw.y));      // windows smaller than a few pixels: average them (they shimmered as they went by)
        vec2 m2 = smoothstep(vec2(0.2, 0.16) - fw, vec2(0.2, 0.16) + fw, f) * (1.0 - smoothstep(vec2(0.8, 0.74) - fw, vec2(0.8, 0.74) + fw, f));
        float wall = step(0.0, vWin.y) * step(vWin.y, ${(opts.floors ?? 99).toFixed(1)}) * step(abs(vUp), 0.5);
        float mask = mix(m2.x * m2.y, 0.33, far) * wall;
        // per-building values arrive through interpolation with tiny wobble; snap them before hashing
        float seedI = floor(vWake.y * 97.0 + 0.5), faceI = floor(vFace + 0.5);
        float id = wh(cellId + vec2(faceI * 13.0, seedI * 7.0));
        float pOn = 0.07 + 0.72 * vWake.x;
        float on = mix(step(id, pOn) * m2.x * m2.y, pOn * 0.33, far) * wall;
        vec3 wc = mix(uWarm, uCandy, mix(step(0.8, wh(cellId * 1.7 + seedI)), 0.2, far));
        float flick = 0.8 + 0.2 * step(0.5, wh(cellId + 3.3)) + uBeat * 0.25 * step(0.9, wh(cellId + 9.1)) * vWake.x;
        totalEmissiveRadiance += wc * on * flick * (0.45 + 1.4 * vWake.x) * uWinK;
        // street light washing up the walls, stronger once the place is awake
        float up = exp(-max(vObjY, 0.0) * 0.32) * step(abs(vUp), 0.5);
        totalEmissiveRadiance += diffuseColor.rgb * uWarm * up * (0.10 + 0.22 * vWake.x) * uWinK;
        diffuseColor.rgb = mix(diffuseColor.rgb, uGlass, mask * (1.0 - on * uWinK) * 0.85);
        // boarded up for the winter: plywood over the glass, nothing lit behind it
        float ply = vWake.z * mask;
        totalEmissiveRadiance *= 1.0 - ply;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.31, 0.2) * (0.8 + 0.2 * wh(cellId + 5.0)), ply);`);
  };
  return m;
}

// plain lit material with per-instance tint
export function tintMaterial(color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0.0, emissive: opts.emissive ?? 0x000000 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;');
  };
  return m;
}

// camera-facing additive glow sprites, per-instance colour and strength
export function glowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 } },
    vertexShader: /* glsl */`
      attribute vec3 aTint; attribute vec2 aWake; varying vec2 vUv; varying vec3 vC; varying float vA;
      uniform float uTime, uBeat;
      void main(){
        vUv = uv; vC = aTint;
        // aWake.x = strength, aWake.y = blink mode (0 steady, 1 blink slow, 2 strobe A, 3 strobe B, 4 beat, 5 turn signal)
        float m = aWake.y, k = 1.0;
        if (m > 0.5 && m < 1.5) k = step(0.5, fract(uTime * 0.8));
        else if (m > 1.5 && m < 2.5) k = step(0.5, fract(uTime * 3.0));
        else if (m > 2.5 && m < 3.5) k = 1.0 - step(0.5, fract(uTime * 3.0));
        else if (m > 3.5 && m < 4.5) k = 0.55 + 0.9 * uBeat;
        else if (m > 4.5) k = step(0.45, fract(uTime * 1.45));
        vA = aWake.x * k;
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float s = length(instanceMatrix[0].xyz);
        c.xy += position.xy * s;
        gl_Position = projectionMatrix * c;
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying vec3 vC; varying float vA;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = exp(-d * d * 4.5) * 0.7 + exp(-d * d * 40.0) * 0.8; gl_FragColor = vec4(vC * a * vA, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

// shop fronts: a canvas of four kinds of front (cafe, shop, bar, laundromat), one per instance,
// lit as the block wakes up
export function storeMaterial() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  const kinds = [
    { light: '#ffd9a0', frame: '#2a1c14', fill: (y) => { for (let i = 0; i < 5; i++) { g.fillStyle = '#5a3020'; g.fillRect(40 + i * 95, y + 86, 36, 26); g.fillRect(52 + i * 95, y + 70, 12, 18); } } },
    { light: '#f4f6ff', frame: '#1a1c22', fill: (y) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { g.fillStyle = ['#c84a5a', '#4a8ac8', '#e8c050', '#60b070'][(i + r) % 4]; g.fillRect(24 + i * 52, y + 22 + r * 30, 38, 18); } } },
    { light: '#ff6fb4', frame: '#120a10', fill: (y) => { g.strokeStyle = '#ffd0f0'; g.lineWidth = 6; g.beginPath(); g.arc(256, y + 56, 34, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#3a0a28'; g.fillRect(0, y + 96, 512, 32); } },
    { light: '#bfe8ff', frame: '#1c2026', fill: (y) => { for (let i = 0; i < 6; i++) { g.fillStyle = '#e8eef4'; g.fillRect(28 + i * 80, y + 40, 64, 70); g.fillStyle = '#5a6a7a'; g.beginPath(); g.arc(60 + i * 80, y + 76, 22, 0, Math.PI * 2); g.fill(); } } },
  ];
  kinds.forEach((k, r) => {
    const y = r * 128;
    const grad = g.createLinearGradient(0, y, 0, y + 128);
    grad.addColorStop(0, k.light); grad.addColorStop(1, '#3a2a20');
    g.fillStyle = grad; g.fillRect(0, y, 512, 128);
    k.fill(y);
    // frames, a door, the sign band
    g.fillStyle = k.frame;
    for (let x = 0; x <= 512; x += 128) g.fillRect(x - 5, y, 10, 128);
    g.fillRect(0, y, 512, 14); g.fillRect(0, y + 120, 512, 8);
    g.fillRect(232, y + 30, 48, 98);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: t }, uFog: { value: new THREE.Color(0x200818) }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute vec3 aWake; varying vec2 vUv; varying float vW; varying float vRow; varying vec3 vP;
      void main(){ vUv = uv; vW = aWake.x; vRow = floor(aWake.y * 3.999); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uFog, uCam; uniform float uFogDensity; varying vec2 vUv; varying float vW; varying float vRow; varying vec3 vP;
      void main(){
        vec2 uv = vec2(vUv.x, (3.0 - vRow + vUv.y) / 4.0);
        vec3 c = texture2D(uMap, uv).rgb * (0.12 + 1.25 * vW);
        float d = length(uCam - vP); float fog = 1.0 - exp(-pow(d * uFogDensity * 0.7, 1.5));
        gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

// light pooled on the ground under a lamp: flat additive disc, per-instance colour/strength
export function poolMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */`
      attribute vec3 aTint; attribute vec2 aWake; varying vec2 vUv; varying vec3 vC; varying float vA;
      void main(){ vUv = uv; vC = aTint; vA = aWake.x; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying vec3 vC; varying float vA;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = exp(-d * d * 3.2) * (1.0 - smoothstep(0.85, 1.0, d)); gl_FragColor = vec4(vC * a * vA * 0.55, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -2,
  });
}

// signs: emissive panel sampling a text atlas cell (aIdx), breathing with the beat
export function signMaterial(atlas, cols, rows) {
  return new THREE.ShaderMaterial({
    uniforms: { tAtlas: { value: atlas }, uBeat: { value: 0 }, uTime: { value: 0 }, uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute float aIdx; attribute vec2 aWake; varying vec2 vUv; varying float vWake; varying vec3 vW;
      void main(){
        float col = mod(aIdx, ${cols.toFixed(1)}), row = floor(aIdx / ${cols.toFixed(1)});
        vUv = vec2((col + uv.x) / ${cols.toFixed(1)}, 1.0 - (row + 1.0 - uv.y) / ${rows.toFixed(1)});
        vWake = aWake.x;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tAtlas; uniform float uBeat, uTime, uFogDensity; uniform vec3 uFogColor, uCam;
      varying vec2 vUv; varying float vWake; varying vec3 vW;
      void main(){
        vec4 t = texture2D(tAtlas, vUv);
        float k = (0.35 + 0.65 * vWake) * (0.85 + 0.35 * uBeat);
        vec3 col = t.rgb * k * 2.2 + vec3(0.012, 0.01, 0.02);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity * 0.7, 1.5));
        gl_FragColor = vec4(mix(col, uFogColor, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the text atlas ----------
export function makeAtlas(entries, cols = 4, rows = 8, cw = 512, ch = 160) {
  const cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  const index = {};
  entries.forEach((e, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    index[e.key] = i;
    g.save();
    g.beginPath(); g.rect(x, y, cw, ch); g.clip();
    if (e.bg) { g.fillStyle = e.bg; g.fillRect(x + 6, y + 6, cw - 12, ch - 12); }
    if (e.frame) { g.strokeStyle = e.frame; g.lineWidth = 6; g.shadowColor = e.frame; g.shadowBlur = 18; g.strokeRect(x + 14, y + 14, cw - 28, ch - 28); }
    const lines = e.text.split('\n');
    let size = e.size || 84;
    g.font = `${e.weight || 900} ${size}px ${e.font || '"Arial Black", Impact, sans-serif'}`;
    const maxW = cw - 60;
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (widest > maxW) { size = Math.floor(size * maxW / widest); g.font = `${e.weight || 900} ${size}px ${e.font || '"Arial Black", Impact, sans-serif'}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = size * 1.05, y0 = y + ch / 2 - (lines.length - 1) * lh / 2;
    for (let pass = 0; pass < 3; pass++) {
      g.shadowColor = e.color; g.shadowBlur = [26, 10, 0][pass];
      g.fillStyle = pass === 2 ? (e.core || '#ffffff') : e.color;
      lines.forEach((l, k) => g.fillText(l, x + cw / 2, y0 + k * lh));
    }
    g.restore();
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, index, cols, rows, aspect: cw / ch };
}

// ---------- geometries ----------
export const GEO = {
  house() {
    const body = new THREE.BoxGeometry(9, 6, 8); body.translate(0, 3, 0);
    const roof = new THREE.CylinderGeometry(0.01, 6.9, 3.4, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.88); roof.translate(0, 7.7, 0);
    return { body, roof };
  },
  porch() { const g = new THREE.BoxGeometry(3.2, 0.25, 2.2); g.translate(0, 2.6, 4.9); return g; },
  block() { const g = new THREE.BoxGeometry(14, 24, 14); g.translate(0, 12, 0); return g; },
  tower() { const g = new THREE.BoxGeometry(18, 64, 18); g.translate(0, 32, 0); return g; },
  shop() { const g = new THREE.BoxGeometry(16, 5, 10); g.translate(0, 2.5, 0); return g; },
  motel() {
    const g = new THREE.BoxGeometry(42, 6.5, 9); g.translate(0, 3.25, 0);
    const walk = new THREE.BoxGeometry(42, 0.3, 2.2); walk.translate(0, 3.3, 5.4);
    return merge([g, walk]);
  },
  canopy() {
    const top = new THREE.BoxGeometry(18, 1.0, 12); top.translate(0, 6, 0);
    const parts = [top];
    for (const x of [-7, 7]) for (const z of [-4, 4]) { const p = new THREE.CylinderGeometry(0.3, 0.3, 5.6, 8); p.translate(x, 2.8, z); parts.push(p); }
    return merge(parts);
  },
  canopyLight() { const g = new THREE.PlaneGeometry(16, 10); g.rotateX(Math.PI / 2); g.translate(0, 5.48, 0); return g; },
  tree() {
    const crown = new THREE.IcosahedronGeometry(3.4, 1); crown.scale(1, 1.25, 1); crown.translate(0, 6.2, 0);
    const trunk = new THREE.CylinderGeometry(0.28, 0.4, 3.4, 6); trunk.translate(0, 1.7, 0);
    return merge([crown, trunk]);
  },
  pine() {
    const a = new THREE.ConeGeometry(3.2, 7, 7); a.translate(0, 6.5, 0);
    const b = new THREE.ConeGeometry(2.4, 5, 7); b.translate(0, 9.5, 0);
    const trunk = new THREE.CylinderGeometry(0.25, 0.35, 3.2, 6); trunk.translate(0, 1.6, 0);
    return merge([a, b, trunk]);
  },
  lamp() {
    const pole = new THREE.CylinderGeometry(0.1, 0.15, 8, 6); pole.translate(0, 4, 0);
    const arm = new THREE.BoxGeometry(0.12, 0.12, 2.2); arm.translate(0, 7.9, 1.1);
    return merge([pole, arm]);
  },
  hwLamp() {
    const pole = new THREE.CylinderGeometry(0.16, 0.24, 13, 6); pole.translate(0, 6.5, 0);
    const arm = new THREE.BoxGeometry(0.15, 0.15, 6); arm.translate(0, 12.8, 0);
    return merge([pole, arm]);
  },
  billboard() {
    const parts = [];
    for (const x of [-4.5, 4.5]) { const p = new THREE.BoxGeometry(0.5, 11, 0.5); p.translate(x, 5.5, -0.3); parts.push(p); }
    const back = new THREE.BoxGeometry(15.6, 5.4, 0.4); back.translate(0, 13, -0.35); parts.push(back);
    const walk = new THREE.BoxGeometry(15, 0.15, 1.2); walk.translate(0, 10.2, 0.4); parts.push(walk);
    return merge(parts);
  },
  billboardFace() { const g = new THREE.PlaneGeometry(15, 4.8); g.translate(0, 13, -0.13); return g; },
  signPole() { const p = new THREE.BoxGeometry(0.45, 9, 0.45); p.translate(0, 4.5, 0); return p; },
  signFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.translate(0, 10.4, 0); return g; },
  wallSign() { const g = new THREE.PlaneGeometry(7.5, 2.35); return g; },
  car() {
    // low, sleek: body + cabin, nose toward +z
    const body = new THREE.BoxGeometry(1.85, 0.62, 4.5); body.translate(0, 0.55, 0);
    const cabin = new THREE.BoxGeometry(1.55, 0.55, 2.2); cabin.translate(0, 1.12, -0.25);
    const wheels = [];
    for (const x of [-0.85, 0.85]) for (const z of [-1.45, 1.45]) { const w = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 10); w.rotateZ(Math.PI / 2); w.translate(x, 0.34, z); wheels.push(w); }
    return merge([body, cabin, ...wheels]);
  },
  overpass() {
    const deck = new THREE.BoxGeometry(260, 1.6, 16); deck.translate(0, 9, 0);
    const parts = [deck];
    for (let x = -120; x <= 120; x += 30) { const p = new THREE.BoxGeometry(2.2, 9, 2.2); p.translate(x, 4.5, 0); parts.push(p); }
    const rail1 = new THREE.BoxGeometry(260, 1.1, 0.3); rail1.translate(0, 10.3, 7.8); parts.push(rail1);
    const rail2 = rail1.clone(); rail2.translate(0, 0, -15.6); parts.push(rail2);
    return merge(parts);
  },
  waterTower() {
    const tank = new THREE.CylinderGeometry(4, 4, 5, 14); tank.translate(0, 20, 0);
    const cap = new THREE.ConeGeometry(4.3, 2, 14); cap.translate(0, 23.5, 0);
    const parts = [tank, cap];
    for (let a = 0; a < 4; a++) { const l = new THREE.CylinderGeometry(0.25, 0.25, 18, 6); l.translate(Math.cos(a * 1.57) * 3.2, 9, Math.sin(a * 1.57) * 3.2); parts.push(l); }
    return merge(parts);
  },
  // what's on a flat roof: a parapet round the edge, air handlers, sometimes a water tank (roof at y = 0)
  roofKit(tank) {
    const parts = [];
    for (const [w, d, x, z] of [[14.4, 0.4, 0, 7], [14.4, 0.4, 0, -7], [0.4, 14.4, 7, 0], [0.4, 14.4, -7, 0]]) { const b = new THREE.BoxGeometry(w, 1.1, d); b.translate(x, 0.55, z); parts.push(b); }
    const ac = new THREE.BoxGeometry(2.4, 1.4, 3.2); ac.translate(-3, 0.7, -2.5); parts.push(ac);
    const ac2 = new THREE.BoxGeometry(1.6, 1.0, 1.6); ac2.translate(2.6, 0.5, -3.8); parts.push(ac2);
    const stair = new THREE.BoxGeometry(3, 2.6, 3); stair.translate(3.5, 1.3, 3.2); parts.push(stair);
    if (tank) {
      const t = new THREE.CylinderGeometry(1.7, 1.7, 3.2, 12); t.translate(-2.8, 4.6, 3.2); parts.push(t);
      const c = new THREE.ConeGeometry(1.85, 1.1, 12); c.translate(-2.8, 6.75, 3.2); parts.push(c);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.CylinderGeometry(0.12, 0.12, 3, 5); l.translate(-2.8 + dx * 1.1, 1.5, 3.2 + dz * 1.1); parts.push(l); }
    }
    return merge(parts);
  },
  // the top of a tower: a stepped crown and a mast (tower roof at y = 0)
  towerTop() {
    const a = new THREE.BoxGeometry(14, 4, 14); a.translate(0, 2, 0);
    const b = new THREE.BoxGeometry(8, 3, 8); b.translate(0, 5.5, 0);
    const m = new THREE.CylinderGeometry(0.25, 0.4, 16, 6); m.translate(0, 15, 0);
    return merge([a, b, m]);
  },
  // a lit shop front along the bottom of a block, with an awning (front face at z = +7)
  storefront() {
    const g = new THREE.PlaneGeometry(13, 3.6); g.translate(0, 2.1, 7.06);
    return g;
  },
  awning() {
    const g = new THREE.BoxGeometry(13.4, 0.2, 1.6); g.rotateX(0.32); g.translate(0, 4.25, 7.75);
    return g;
  },
  quad() { return new THREE.PlaneGeometry(1, 1); },
  flat() { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; },
  fence() { const parts = []; const rail = new THREE.BoxGeometry(0.08, 0.08, 6); rail.translate(0, 0.75, 0); parts.push(rail); const r2 = rail.clone(); r2.translate(0, -0.4, 0); parts.push(r2); for (let z = -3; z <= 3; z += 0.5) { const p2 = new THREE.BoxGeometry(0.09, 1.0, 0.07); p2.translate(0, 0.5, z); parts.push(p2); } return merge(parts); },
};
