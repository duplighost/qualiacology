// The Boston kit for Technically Thirty-Two. Brick, brownstone, clapboard, slate and granite
// drawn once into canvases; materials that take the snow on everything that faces up and go
// into the haze with distance; and the houses: South End bow fronts, brownstones with their
// angled bays, the Federal fronts up the hill with black shutters and window boxes, the
// triple-deckers with their stacked porches, granite blocks downtown. Every house is built
// with its front at z = 0 facing +z (the street), its width along x, its back at z = -D.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// merged indexed: a box is 24 vertices rather than 36
const ix = (g) => { if (!g.index) { const n = g.attributes.position.count, a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = i; g.setIndex(new THREE.BufferAttribute(a, 1)); } return g; };
export const merge = (gs) => mergeGeometries(gs.map(ix), false);
export function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
export const B = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
export const C = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

// the uniforms every Boston material shares, set once a frame by the place (cold.js)
export const BOS = {
  fog: { value: new THREE.Color(0xc6d4e8) }, fogD: { value: 0.0012 }, cam: { value: new THREE.Vector3() },
  snow: { value: 0.4 }, snowC: { value: new THREE.Color(0xeef3f8) },
  skyTop: { value: new THREE.Color(0x2a62d0) }, skyLow: { value: new THREE.Color(0xdbe7f5) },
  sun: { value: new THREE.Color(0xfff0d8) }, sunDir: { value: new THREE.Vector3(-0.5, 0.18, 0.85).normalize() },
  warm: { value: new THREE.Color(0xffd8a0) }, winK: { value: 0.3 }, time: { value: 0 }, beat: { value: 0 }, lift: { value: 0 },
  flash: { value: 0 }, sunK: { value: 1 }, cats: { value: 0 }, lights: { value: 0 },
};

// ---------- the surfaces ----------
function canvasTex(w, h, draw, tile) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(1 / tile[0], 1 / tile[1]);
  return t;
}
const hsl = (h, s, l) => `hsl(${h.toFixed(1)},${(s * 100).toFixed(1)}%,${(l * 100).toFixed(1)}%)`;

// common red brick in running bond, 3.2 m square: 16 bricks a course, 48 courses
export function brickTexture(seed = 3, base = [9, 0.5, 0.36]) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = seeded(seed), n = 16, m = 48, bw = W / n, ch = H / m;
    g.fillStyle = '#a49a8e'; g.fillRect(0, 0, W, H);
    const cols = [];
    for (let c = 0; c < m; c++) { cols.push([]); for (let k = 0; k < n; k++) {
      let h = base[0] + (R() - 0.5) * 9, s = base[1] + (R() - 0.5) * 0.14, l = base[2] + (R() - 0.5) * 0.09;
      const q = R(); if (q < 0.08) { l -= 0.1; s -= 0.08; } else if (q < 0.13) { l += 0.05; s -= 0.1; h += 6; } else if (q < 0.17) { h -= 5; l -= 0.04; }
      cols[c].push([h, s, l]);
    } }
    for (let c = 0; c < m; c++) {
      const off = (c % 2) * bw / 2;
      for (let k = -1; k <= n; k++) {
        const [h, s, l] = cols[c][(k + n) % n], x = k * bw + off, y = c * ch;
        const gr = g.createLinearGradient(0, y, 0, y + ch);
        gr.addColorStop(0, hsl(h, s, l + 0.035)); gr.addColorStop(0.7, hsl(h, s, l)); gr.addColorStop(1, hsl(h, s, l - 0.05));
        g.fillStyle = gr; g.fillRect(x + 1.6, y + 1.6, bw - 3.2, ch - 3.2);
      }
    }
    // weather: a little soot and lime in the joints, blotches of fading
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '20,14,12' : '230,220,200'},${(0.02 + R() * 0.05).toFixed(3)})`; const r = 2 + R() * 30; g.beginPath(); g.arc(R() * W, R() * H, r, 0, 6.283); g.fill(); }
  }, [3.2, 3.2]);
}
// brownstone: smooth chocolate sandstone in big blocks, the joints barely there
export function brownstoneTexture(seed = 5) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = seeded(seed);
    g.fillStyle = hsl(18, 0.28, 0.27); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { const l = 0.2 + R() * 0.14; g.fillStyle = `hsla(${(14 + R() * 10).toFixed(1)},${(22 + R() * 14).toFixed(1)}%,${(l * 100).toFixed(1)}%,0.18)`; const r = 3 + R() * 26; g.beginPath(); g.ellipse(R() * W, R() * H, r * 1.6, r, 0, 0, 6.283); g.fill(); }
    const bw = W / 4, ch = H / 8;
    g.strokeStyle = 'rgba(30,18,12,0.35)'; g.lineWidth = 2;
    for (let c = 0; c < 8; c++) { g.beginPath(); g.moveTo(0, c * ch); g.lineTo(W, c * ch); g.stroke(); for (let k = 0; k <= 4; k++) { const x = k * bw + (c % 2) * bw / 2; g.beginPath(); g.moveTo(x, c * ch); g.lineTo(x, c * ch + ch); g.stroke(); } }
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(16,10,8,0.08)'; g.fillRect(R() * W, R() * H, 2 + R() * 4, 30 + R() * 160); }
  }, [4, 4]);
}
// clapboard: painted boards, 11 cm to the weather, each throwing a shadow on the next
export function clapboardTexture(seed = 7) {
  return canvasTex(512, 1024, (g, W, H) => {
    const R = seeded(seed), n = 36, bh = H / n;
    for (let k = 0; k < n; k++) {
      const y = k * bh, l = 0.9 + (R() - 0.5) * 0.04;
      const gr = g.createLinearGradient(0, y, 0, y + bh);
      gr.addColorStop(0, hsl(40, 0.12, l - 0.05)); gr.addColorStop(0.25, hsl(40, 0.12, l)); gr.addColorStop(0.88, hsl(40, 0.1, l - 0.02)); gr.addColorStop(1, hsl(40, 0.1, l - 0.3));
      g.fillStyle = gr; g.fillRect(0, y, W, bh);
    }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,80,70,${(0.02 + R() * 0.04).toFixed(3)})`; g.fillRect(R() * W, R() * H, 20 + R() * 120, 2 + R() * 6); }
  }, [2, 4]);
}
// slate: rectangular slates in staggered rows, grey with purple and green ones among them
export function slateTexture(seed = 11) {
  return canvasTex(512, 512, (g, W, H) => {
    const R = seeded(seed), rows = 16, per = 8, rh = H / rows, sw = W / per;
    g.fillStyle = '#16161a'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let k = -1; k <= per; k++) {
      const q = R(), h = q < 0.3 ? 265 : (q < 0.45 ? 150 : 220), s = q < 0.3 ? 0.12 : 0.06, l = 0.25 + R() * 0.1;
      const x = k * sw + (r % 2) * sw / 2, y = r * rh;
      const gr = g.createLinearGradient(0, y, 0, y + rh); gr.addColorStop(0, hsl(h, s, l - 0.06)); gr.addColorStop(1, hsl(h, s, l + 0.04));
      g.fillStyle = gr; g.fillRect(x + 1.5, y + 1, sw - 3, rh - 2);
    }
  }, [2, 2]);
}
// granite: big grey blocks, speckled, the joints sharp
export function graniteTexture(seed = 13, base = [210, 0.04, 0.6]) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const R = seeded(seed), rows = 10, per = 4, rh = H / rows, bw = W / per;
    g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let k = -1; k <= per; k++) {
      const x = k * bw + (r % 2) * bw / 2, y = r * rh, l = base[2] + (R() - 0.5) * 0.08;
      g.fillStyle = hsl(base[0] + (R() - 0.5) * 20, base[1], l); g.fillRect(x + 2, y + 2, bw - 4, rh - 4);
    }
    for (let i = 0; i < 20000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(20,20,24,0.25)' : 'rgba(255,255,255,0.18)'; g.fillRect(R() * W, R() * H, 1.5, 1.5); }
  }, [6, 6]);
}
// the far rows: a whole front painted at once, brick with windows, 8 m by 16 m (five floors)
export function farTexture(kind = 'brick', seed = 17) {
  return canvasTex(512, 1024, (g, W, H) => {
    const R = seeded(seed);
    const wall = kind === 'granite' ? [210, 0.05, 0.56] : (kind === 'brown' ? [18, 0.28, 0.27] : [9, 0.48, 0.34]);
    g.fillStyle = hsl(...wall); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `hsla(${wall[0] + (R() - 0.5) * 10},${wall[1] * 100}%,${(wall[2] + (R() - 0.5) * 0.1) * 100}%,0.35)`; g.fillRect(R() * W, R() * H, 6 + R() * 30, 2 + R() * 4); }
    if (kind === 'brick') { g.fillStyle = 'rgba(200,190,175,0.18)'; for (let y = 0; y < H; y += 5.3) g.fillRect(0, y, W, 1); }
    const fl = H / 5;
    for (let f = 0; f < 5; f++) for (let c = 0; c < 2; c++) {
      const x = W * (0.16 + c * 0.5), y = f * fl + fl * 0.2, w = W * 0.2, h = fl * 0.56;
      g.fillStyle = kind === 'granite' ? '#d8d4ca' : '#5a3a2c'; g.fillRect(x - 6, y - 12, w + 12, 12); g.fillRect(x - 4, y + h, w + 8, 6);
      g.fillStyle = '#e8e2d6'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#7a96b8'); gr.addColorStop(0.5, '#3a4a5e'); gr.addColorStop(1, '#1a2028');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (R() < 0.25) { g.fillStyle = 'rgba(255,214,160,0.55)'; g.fillRect(x + 2, y + h * 0.4, w - 4, h * 0.58); }
      g.fillStyle = '#e8e2d6'; g.fillRect(x, y + h / 2 - 2, w, 4); g.fillRect(x + w / 2 - 1.5, y, 3, h);
    }
  }, [8, 16]);
}

// ---------- materials ----------
// a lit material for the houses: an instance tint (or a door / trim colour picked per vertex),
// snow on whatever faces up, and the distance going into the haze
export function bosMaterial({ map = null, tint = false, vcol = false, kt = false, rough = 0.88, metal = 0, emissive = 0x000000, snowK = 1, key }) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map, vertexColors: vcol, roughness: rough, metalness: metal, emissive });
  m.customProgramCacheKey = () => 'bos-' + key;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBosFog = BOS.fog; sh.uniforms.uBosFogD = BOS.fogD; sh.uniforms.uBosCam = BOS.cam; sh.uniforms.uBosSnow = BOS.snow; sh.uniforms.uBosSnowC = BOS.snowC;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBosW; varying float vBosUp;
        ${tint ? 'attribute vec3 aTint; varying vec3 vBosT;' : ''}
        ${kt ? 'attribute float aK; attribute vec3 aDoor; attribute vec3 aTrim; varying vec3 vBosK; varying float vBosKK;' : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        { vec4 bw = vec4(transformed, 1.0); vec3 bn = objectNormal;
          #ifdef USE_INSTANCING
          bw = instanceMatrix * bw; bn = mat3(instanceMatrix) * bn;
          #endif
          vBosW = (modelMatrix * bw).xyz; vBosUp = normalize(mat3(modelMatrix) * bn).y; }
        ${tint ? 'vBosT = aTint;' : ''}
        ${kt ? 'vBosKK = aK; vBosK = aK > 1.5 ? aTrim : aDoor;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uBosFog, uBosCam, uBosSnowC; uniform float uBosFogD, uBosSnow;
        varying vec3 vBosW; varying float vBosUp;
        ${tint ? 'varying vec3 vBosT;' : ''}
        ${kt ? 'varying vec3 vBosK; varying float vBosKK;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${tint ? 'diffuseColor.rgb *= vBosT;' : ''}
        ${kt ? 'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vBosK, step(0.5, vBosKK));' : ''}
        float bosSn = smoothstep(0.5, 0.86, vBosUp) * uBosSnow * ${snowK.toFixed(2)};
        diffuseColor.rgb = mix(diffuseColor.rgb, uBosSnowC, bosSn);`)
      .replace('#include <fog_fragment>', `{ float bd = length(uBosCam - vBosW); float bf = 1.0 - exp(-pow(bd * uBosFogD, 1.5)); gl_FragColor.rgb = mix(gl_FragColor.rgb, uBosFog, clamp(bf, 0.0, 1.0)); }`);
  };
  return m;
}

// window glass: the sky in it at an angle and the sun's glint, the room behind it when you
// look straight in (curtains, blinds, a plant, a lamp on once the house is awake), the sashes
export function glassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uSkyTop: BOS.skyTop, uSkyLow: BOS.skyLow, uSun: BOS.sun, uSunDir: BOS.sunDir, uWarm: BOS.warm, uWinK: BOS.winK, uFog: BOS.fog, uFogD: BOS.fogD, uCam: BOS.cam, uTime: BOS.time, uCats: BOS.cats },
    vertexShader: /* glsl */`
      attribute vec2 aWin; attribute vec3 aWake; varying vec2 vUv; varying vec3 vN; varying vec3 vWP; varying vec3 vWake; varying vec2 vWin;
      void main(){
        vUv = uv; vWin = aWin; vWake = aWake;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vWP = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSkyTop, uSkyLow, uSun, uSunDir, uWarm, uFog, uCam; uniform float uWinK, uFogD, uTime, uCats;
      varying vec2 vUv; varying vec3 vN; varying vec3 vWP; varying vec3 vWake; varying vec2 vWin;
      float h1(float x){ return fract(sin(x * 91.7 + 13.1) * 43758.5453); }
      float aaL(float d, float w){ float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }
      void main(){
        float id = vWin.x, kind = vWin.y, seed = vWake.y;
        float hh = h1(id * 17.0 + seed * 131.0), h2 = h1(id * 5.3 + seed * 71.0 + 3.0);
        vec3 V = normalize(uCam - vWP), N = normalize(vN);
        // old glass: each pane tilted a hair differently
        N = normalize(N + vec3(h1(id + 1.0) - 0.5, h1(id + 2.0) - 0.5, h1(id + 4.0) - 0.5) * 0.06);
        float ndv = max(dot(N, V), 0.0);
        float F = 0.08 + 0.8 * pow(1.0 - ndv, 4.0);
        vec3 Rf = reflect(-V, N);
        vec3 sky = mix(uSkyLow, uSkyTop, smoothstep(0.2, 0.75, Rf.y));
        sky += uSun * pow(max(dot(Rf, normalize(uSunDir)), 0.0), 120.0) * 5.0;
        // in a street a window mostly sees the houses across it: brick in shade, their windows,
        // and only above their roofline the sky
        vec3 opp = mix(vec3(0.075, 0.05, 0.045), vec3(0.13, 0.1, 0.09), h2) + uSkyLow * 0.05;
        opp *= 0.75 + 0.5 * step(0.5, fract(Rf.x * 7.0 + Rf.z * 7.0 + hh));
        float roofline = 0.2 + 0.16 * hh;
        vec3 refl = mix(opp, sky, smoothstep(roofline - 0.04, roofline + 0.06, Rf.y));
        refl = mix(vec3(0.05, 0.05, 0.055), refl, smoothstep(-0.25, -0.02, Rf.y));
        sky = refl;
        // the room: dark, or blinds, or curtains drawn to the sides; a lamp on if the house is awake
        vec2 u = vUv;
        vec3 room = vec3(0.025, 0.024, 0.03) * (0.7 + 0.8 * h2);
        float blinds = step(0.72, hh) * step(kind, 1.5);
        room = mix(room, vec3(0.5, 0.46, 0.38) * (0.75 + 0.25 * step(0.5, fract(u.y * 22.0))), blinds * step(1.0 - (0.35 + 0.5 * h2), u.y));
        float curt = step(0.5, hh) * step(hh, 0.72) * step(kind, 1.5);
        vec3 cc = mix(vec3(0.55, 0.12, 0.1), vec3(0.75, 0.68, 0.5), step(0.6, h2));
        room = mix(room, cc * 0.45, curt * (step(u.x, 0.22) + step(0.78, u.x)));
        float on = step(h1(id * 3.1 + seed * 7.7 + 9.0), 0.06 + 0.8 * vWake.x) * step(kind, 3.5);
        vec3 lamp = uWarm * (0.35 + 0.65 * smoothstep(1.0, 0.2, length(u - vec2(0.5, 0.35)))) * (0.6 + 1.4 * vWake.x) * uWinK;
        room += lamp * on;
        vec3 col = mix(room, sky, F);
        // a cat on the sill, looking out
        if (uCats > 0.01) {
          float c = step(h1(id * 7.7 + seed * 3.3), uCats * 0.55) * step(kind, 1.5);
          vec2 cp = u - vec2(0.5 + (hh - 0.5) * 0.3, 0.0);
          float body = step(length((cp - vec2(0.0, 0.15)) / vec2(0.19, 0.15)), 1.0);
          float head = step(length((cp - vec2(0.12, 0.34)) / vec2(0.1, 0.09)), 1.0);
          float ears = step(0.38, cp.y) * (step(abs(cp.x - 0.075) * 1.7 + (cp.y - 0.44), 0.0) + step(abs(cp.x - 0.165) * 1.7 + (cp.y - 0.44), 0.0));
          float tail = step(abs(cp.y - 0.05 - 0.06 * sin(cp.x * 14.0 + uTime * 2.0)), 0.025) * step(-0.36, cp.x) * step(cp.x, -0.12);
          col = mix(col, vec3(0.015, 0.014, 0.016), clamp(body + head + ears + tail, 0.0, 1.0) * c * (1.0 - 0.5 * F));
        }
        // sashes: the frame, the meeting rail, the muntins (2 over 2, 6 over 6, one big pane)
        float fr = 0.06;
        float bar = max(max(step(u.x, fr), step(1.0 - fr, u.x)), max(step(u.y, fr * 0.7), step(1.0 - fr * 0.7, u.y)));
        if (kind < 0.5) bar = max(bar, max(aaL(u.y - 0.5, 0.025), aaL(u.x - 0.5, 0.018)));
        else if (kind < 1.5) bar = max(bar, max(aaL(fract(u.y * 2.0) - 0.5, 0.06) * 0.0 + aaL(u.y - 0.5, 0.03), max(aaL(fract(u.x * 3.0 + 0.5) - 0.5, 0.05), aaL(fract(u.y * 6.0 + 0.5) - 0.5, 0.08))));
        else if (kind < 2.5) bar = max(bar, aaL(u.y - 0.78, 0.02));
        else if (kind < 3.5) bar = max(bar, aaL(u.y - 0.5, 0.03));
        else { float r = length((u - vec2(0.5, 0.0)) * vec2(1.0, 2.0)); bar = max(step(1.0, r) , aaL(fract(atan(u.y, u.x - 0.5) / 3.14159 * 5.0) - 0.5, 0.08) * step(0.25, r)); }
        vec3 sash = vec3(0.86, 0.84, 0.8) * (0.55 + 0.45 * max(dot(N, normalize(uSunDir)), 0.0)) + uSkyLow * 0.12;
        col = mix(col, sash, bar * step(kind, 4.5));
        float d = length(uCam - vWP), fog = 1.0 - exp(-pow(d * uFogD, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

// gold leaf: the sky in it, the sun across it, a hot highlight; uFlash lifts it on the beat
const LIT_VS = /* glsl */`
  varying vec3 vN; varying vec3 vWP; varying vec3 vObj;
  void main(){ vObj = position; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vWP = w.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
export function goldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: BOS.sun, uSunDir: BOS.sunDir, uSkyTop: BOS.skyTop, uSkyLow: BOS.skyLow, uFog: BOS.fog, uFogD: BOS.fogD, uCam: BOS.cam, uFlash: BOS.flash, uSunK: BOS.sunK },
    vertexShader: LIT_VS,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunDir, uSkyTop, uSkyLow, uFog, uCam; uniform float uFogD, uFlash, uSunK;
      varying vec3 vN; varying vec3 vWP; varying vec3 vObj;
      void main(){
        vec3 N = normalize(vN), V = normalize(uCam - vWP), L = normalize(uSunDir);
        vec3 gold = vec3(1.0, 0.7, 0.26);
        vec3 R = reflect(-V, N);
        vec3 env = mix(uSkyLow, uSkyTop, smoothstep(0.0, 0.6, R.y));
        env = mix(vec3(0.3, 0.24, 0.2), env, smoothstep(-0.25, 0.05, R.y));
        float F = 0.65 + 0.35 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = gold * env * F * 0.95;
        col += gold * uSun * max(dot(N, L), 0.0) * 0.32 * uSunK;
        vec3 H = normalize(L + V);
        col += mix(gold, vec3(1.0), 0.35) * uSun * pow(max(dot(N, H), 0.0), 50.0) * 2.4 * uSunK;
        col *= 1.0 + 1.6 * uFlash;
        float d = length(uCam - vWP), fog = 1.0 - exp(-pow(d * uFogD, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}
// a curtain wall of mirror glass: the sky and the city in it, the mullions, the sun's glint
export function curtainMaterial(tint = [0.05, 0.09, 0.12], panel = [1.5, 3.9]) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: BOS.sun, uSunDir: BOS.sunDir, uSkyTop: BOS.skyTop, uSkyLow: BOS.skyLow, uFog: BOS.fog, uFogD: BOS.fogD, uCam: BOS.cam, uTint: { value: new THREE.Vector3(...tint) } },
    vertexShader: LIT_VS,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uSunDir, uSkyTop, uSkyLow, uFog, uCam, uTint; uniform float uFogD;
      varying vec3 vN; varying vec3 vWP; varying vec3 vObj;
      float aaL(float d, float w){ float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }
      void main(){
        vec3 N = normalize(vN), V = normalize(uCam - vWP), L = normalize(uSunDir);
        vec3 R = reflect(-V, N);
        vec3 sky = mix(uSkyLow, uSkyTop, smoothstep(-0.02, 0.5, R.y));
        sky = mix(vec3(0.14, 0.13, 0.14), sky, smoothstep(-0.12, 0.03, R.y));
        float F = 0.22 + 0.78 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(uTint, sky * vec3(0.8, 0.92, 1.0), F);
        col += uSun * pow(max(dot(R, L), 0.0), 300.0) * 6.0;
        vec2 q = vec2(abs(N.x) > abs(N.z) ? vObj.z : vObj.x, vObj.y) / vec2(${panel[0].toFixed(2)}, ${panel[1].toFixed(2)});
        float near = 1.0 - smoothstep(0.25, 0.7, length(fwidth(q)));
        // the spandrel across each floor: opaque, a shade off the glass, catching the sun a little
        float fy = fract(q.y), fw = fwidth(q.y) + 1e-4;
        float span = smoothstep(0.7 - fw, 0.7 + fw, fy) * (1.0 - smoothstep(0.97 - fw, 0.97 + fw, fy));
        vec3 spanC = uTint * 2.4 + vec3(0.06, 0.07, 0.08) + uSun * max(dot(N, L), 0.0) * 0.08;
        col = mix(col, spanC, mix(0.35, span, near) * 0.85);
        float m = max(aaL(fract(q.x) - 0.5, 0.04), aaL(fract(q.y) - 0.5, 0.03));
        col = mix(col, vec3(0.1, 0.11, 0.13), m * 0.75 * near);
        float d = length(uCam - vWP), fog = 1.0 - exp(-pow(d * uFogD, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}

// ---------- building blocks ----------
// metric texture coordinates on whatever faces a piece has (metres along the face), so a tiled
// surface keeps its scale and runs on across neighbouring pieces
export function muv(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay > 0.8) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (ax > az) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  return g;
}
// a curved wall: part of a cylinder round (cx, cz), radius r, from angle -th to th (0 = +z)
export function arcWall(r, th, h, y0, cx, cz, segs = 14, closed = false) {
  const g = new THREE.CylinderGeometry(r, r, h, segs, 1, !closed, -th, 2 * th);
  g.translate(cx, y0 + h / 2, cz);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(n.getY(i)) > 0.8) uv.setXY(i, p.getX(i), p.getZ(i));
    else uv.setXY(i, Math.atan2(p.getX(i) - cx, p.getZ(i) - cz) * r, p.getY(i));
  }
  return g;
}
// colour every vertex of a trim piece; k: 0 as painted, 1 the house's door colour, 2 its trim colour
export function tr(g, hex, k = 0) {
  const n = g.attributes.position.count, c = lin(hex), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(n).fill(k), 1));
  return g;
}
// a pane of glass facing +z: kind 0 two over two, 1 six over six, 2 shop window, 3 one over one, 4 fanlight
export function pane(w, h, kind, id) {
  const g = new THREE.PlaneGeometry(w, h), n = g.attributes.position.count, a = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { a[i * 2] = id; a[i * 2 + 1] = kind; }
  g.setAttribute('aWin', new THREE.BufferAttribute(a, 2));
  return g;
}
// put a piece made facing +z at the origin onto a wall: turned to angle a about y, at (x, y, z)
const place = (g, a, x, y, z) => { g.rotateY(a); g.translate(x, y, z); return g; };

const WHITE = 0xe9e4d8, CREAM = 0xd8ccb0, BROWN = 0x5a4232, GRANITE = 0x8f8d88, BLACK = 0x18181a, LIMESTONE = 0xbab2a2;

// a window on a wall (facing angle a, centred x,z at height y0..y0+h): glass, lintel, sill
function windowOn(out, a, x, z, y0, w, h, kind, R, o = {}) {
  const ca = Math.sin(a), sa = Math.cos(a);   // the wall's outward normal is (sin a, 0, cos a)
  const at = (d) => [x + ca * d, z + sa * d];
  const [gx, gz] = at(0.025);
  out.glass.push(place(pane(w, h, kind, R()), a, gx, y0 + h / 2, gz));
  // the frame round the glass, and the shutters if the house has them
  const [fx, fz] = at(0.012);
  out.trim.push(tr(place(B(w + 0.16, h + 0.16, 0.02, 0, 0, 0), a, fx, y0 + h / 2, fz), o.frame ?? WHITE, o.frameK ?? 2));
  const [lx, lz] = at(0.07);
  if (o.lintel !== false) out.trim.push(tr(place(B(w + 0.36, o.lintelH ?? 0.26, 0.14, 0, 0, 0), a, lx, y0 + h + 0.21, lz), o.lintelC ?? BROWN, o.lintelK ?? 0));
  const [sx, sz] = at(0.09);
  out.trim.push(tr(place(B(w + 0.24, 0.09, 0.18, 0, 0, 0), a, sx, y0 - 0.1, sz), o.sillC ?? BROWN, o.sillK ?? 0));
  if (o.shutters) for (const s of [-1, 1]) {
    const px = x + Math.cos(a) * s * (w / 2 + 0.3), pz = z - Math.sin(a) * s * (w / 2 + 0.3);
    out.trim.push(tr(place(B(0.5, h + 0.1, 0.05, 0, 0, 0), a, px + ca * 0.05, y0 + h / 2, pz + sa * 0.05), 0x141816, 0));
  }
  if (o.box) {
    // a window box of evergreen with red berries in it
    const [bx, bz] = at(0.3);
    out.trim.push(tr(place(B(w + 0.2, 0.32, 0.36, 0, 0, 0), a, bx, y0 - 0.32, bz), 0x2a1a12, 0));
    out.trim.push(tr(place(B(w + 0.1, 0.26, 0.3, 0, 0.02, 0), a, bx, y0 - 0.06, bz), 0x1e3a22, 0));
    out.trim.push(tr(place(B(w * 0.5, 0.2, 0.26, w * 0.18, 0.2, 0.02), a, bx, y0 - 0.06, bz), 0x2a4a28, 0));
    for (const dx of [-0.3, 0.12, 0.34]) out.trim.push(tr(place(B(0.09, 0.09, 0.09, dx * w, 0.2, 0.16), a, bx, y0 - 0.06, bz), 0xc0182a, 0));
  }
}
// iron: a rail from p0 to p1 with balusters every `every` metres down to the ground line (y0)
function ironRail(out, x0, y0, z0, x1, y1, z1, h, every = 0.16) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1e-3;
  const top = new THREE.BoxGeometry(0.06, 0.06, Math.hypot(dx, dy, dz));
  top.lookAt(new THREE.Vector3(dx, dy, dz)); top.translate((x0 + x1) / 2, (y0 + y1) / 2 + h, (z0 + z1) / 2); out.iron.push(top);
  const n = Math.max(1, Math.round(L / every));
  for (let k = 0; k <= n; k++) { const u = k / n; out.iron.push(B(0.03, h, 0.03, x0 + dx * u, y0 + dy * u + h / 2, z0 + dz * u)); }
}
// the stoop: granite (or brownstone) steps up to the door at height top, its iron rails
function stoop(out, x, top, n, w, c = GRANITE) {
  const rise = top / (n + 1), run = 0.3, land = 0.95;
  out.trim.push(tr(B(w, top, land, x, top / 2, land / 2), c));
  for (let k = 0; k < n; k++) { const y = rise * (k + 1), z = land + run * (n - 1 - k); out.trim.push(tr(B(w, y, run, x, y / 2, z + run / 2), c)); }
  const zb = land + run * n;
  for (const s of [-1, 1]) {
    ironRail(out, x + s * (w / 2 - 0.05), 0.05, zb, x + s * (w / 2 - 0.05), top, land, 0.95);
    ironRail(out, x + s * (w / 2 - 0.05), top, land, x + s * (w / 2 - 0.05), top, 0.15, 0.95);
    out.iron.push(B(0.11, 1.15, 0.11, x + s * (w / 2 - 0.05), 0.58, zb));
    out.iron.push(new THREE.SphereGeometry(0.09, 6, 4).translate(x + s * (w / 2 - 0.05), 1.2, zb));
  }
  return zb;
}
// a front door at x on the flat front: the door (in the house's colour), the transom, the surround
function door(out, x, y0, R, o = {}) {
  const w = o.w ?? 1.15, h = o.h ?? 2.45;
  out.trim.push(tr(B(w, h, 0.08, x, y0 + h / 2, 0.05), 0xffffff, 1));
  for (let k = 0; k < 2; k++) out.trim.push(tr(B(w * 0.36, h * 0.3, 0.03, x + (k - 0.5) * w * 0.45, y0 + h * 0.62, 0.1), 0xffffff, 1));
  out.trim.push(tr(B(0.06, 0.06, 0.06, x + w * 0.32, y0 + h * 0.48, 0.12), 0xd8b060));
  if (o.fan) out.glass.push(pane(w, w / 2, 4, R()).translate(x, y0 + h + 0.08 + w / 4, 0.04));
  else out.glass.push(pane(w, 0.42, 3, R()).translate(x, y0 + h + 0.3, 0.04));
  const tc = o.surround ?? BROWN, top = y0 + h + (o.fan ? w / 2 + 0.2 : 0.62);
  for (const s of [-1, 1]) out.trim.push(tr(B(0.24, top - y0, 0.16, x + s * (w / 2 + 0.14), y0 + (top - y0) / 2, 0.08), tc, o.surroundK ?? 0));
  out.trim.push(tr(B(w + 0.75, 0.3, 0.4, x, top + 0.15, 0.2), tc, o.surroundK ?? 0));
}
// a dormer in a mansard: cheeks, the window, a round top
function dormer(out, x, y0, zf, R, glassKind = 0) {
  out.trim.push(tr(B(1.3, 1.7, 1.5, x, y0 + 0.85, zf - 0.75), WHITE, 2));
  out.glass.push(pane(0.78, 1.15, glassKind, R()).translate(x, y0 + 0.82, zf + 0.012));
  const cap = new THREE.CylinderGeometry(0.72, 0.72, 1.6, 10, 1, false, -Math.PI / 2, Math.PI); cap.rotateX(Math.PI / 2); cap.rotateZ(Math.PI / 2); cap.scale(1, 0.55, 1);
  cap.translate(x, y0 + 1.7, zf - 0.75); out.roof.push(muv(cap));
}
// a mansard on a wall top: the steep slate face from z0 back by `back`, flat on top, width W
function mansard(out, W, y0, H, z0, back, D) {
  const s = new THREE.Shape(); s.moveTo(z0, 0); s.lineTo(z0 - back, H); s.lineTo(-D, H); s.lineTo(-D, 0); s.lineTo(z0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(W / 2, y0, 0);
  out.roof.push(muv(g));
  // the copper (or painted) cresting at the top of the slope, and the flashing at its foot
  out.trim.push(tr(B(W, 0.14, 0.2, 0, y0 + H + 0.07, z0 - back), 0x3a2a22));
}
const chimney = (out, x, z, y0, h) => { out.wall.push(muv(B(0.9, h, 1.7, x, y0 + h / 2, z))); out.wall.push(muv(B(1.06, 0.2, 1.86, x, y0 + h - 0.1, z))); for (const dz of [-0.4, 0.4]) out.trim.push(tr(C(0.12, 0.15, 0.55, 8, x, y0 + h + 0.27, z + dz), 0x9a5a3a)); };
const newOut = () => ({ wall: [], trim: [], glass: [], roof: [], iron: [] });
const finish = (o) => { const r = {}; for (const k in o) r[k] = o[k].length ? merge(o[k]) : null; return r; };

// a South End bow front: four floors over the garden level, the bow up the left, the door at
// the top of the stoop on the right, a bracketed cornice and a slate mansard with two dormers
export function bowHouse(seed = 1) {
  const R = seeded(seed), o = newOut();
  const W = 6.8, D = 13, TOP = 11.4;
  const r = 2.25, th = 1.2, cx = -W / 2 + 0.3 + r * Math.sin(th), cz = -r * Math.cos(th);
  const xd = (cx + r * Math.sin(th) + W / 2) / 2;
  o.wall.push(muv(B(W, TOP, D, 0, TOP / 2, -D / 2)));
  o.wall.push(arcWall(r, th, TOP, 0, cx, cz, 16));
  // brownstone courses at the parlour floor and the top of the garden level, round the bow too
  for (const y of [1.55, 5.05]) {
    o.trim.push(tr(B(W, 0.2, 0.08, 0, y, 0.04), BROWN));
    o.trim.push(tr(arcWall(r + 0.05, th + 0.02, 0.2, y - 0.1, cx, cz, 16, true), BROWN));
  }
  // the windows round the bow: three a floor, two small ones at the garden level
  const floors = [[1.95, 2.55, 0], [5.5, 2.15, 0], [8.65, 1.95, 0]];
  for (const [y0, h, k] of floors) for (const a of [-0.78, 0, 0.78]) {
    const wx = cx + (r) * Math.sin(a), wz = cz + (r) * Math.cos(a);
    windowOn(o, a, wx, wz, y0, 1.0, h, k, R);
  }
  for (const a of [-0.45, 0.45]) windowOn(o, a, cx + r * Math.sin(a), cz + r * Math.cos(a), 0.4, 0.9, 0.85, 3, R, { lintelH: 0.18 });
  // the door side: the stoop, the door, a window a floor above it
  const zb = stoop(o, xd, 1.55, 5, 1.85, seed % 3 ? GRANITE : 0x6a5040);
  door(o, xd, 1.55, R, { fan: seed % 2 === 0 });
  windowOn(o, 0, xd, 0, 5.5, 1.0, 2.15, 0, R);
  windowOn(o, 0, xd, 0, 8.65, 1.0, 1.95, 0, R);
  // the areaway fence under the bow
  ironRail(o, -W / 2 + 0.1, 0, zb - 0.1, xd - 1.05, 0, zb - 0.1, 1.0, 0.15);
  // the cornice: a frieze, brackets, the projecting top, following the bow round
  o.trim.push(tr(B(W, 0.5, 0.12, 0, TOP - 0.25, 0.06), WHITE, 2));
  o.trim.push(tr(arcWall(r + 0.06, th + 0.02, 0.5, TOP - 0.5, cx, cz, 16, true), WHITE, 2));
  o.trim.push(tr(B(W, 0.32, 0.75, 0, TOP + 0.16, 0.3), WHITE, 2));
  o.trim.push(tr(arcWall(r + 0.45, th + 0.08, 0.32, TOP, cx, cz, 16, true), WHITE, 2));
  for (let k = 0; k < 7; k++) { const a = -th + (k + 0.5) * (2 * th / 7); o.trim.push(tr(place(B(0.14, 0.34, 0.4, 0, 0, 0), a, cx + (r + 0.2) * Math.sin(a), TOP - 0.17, cz + (r + 0.2) * Math.cos(a)), WHITE, 2)); }
  for (const x of [xd - 0.8, xd + 0.8]) o.trim.push(tr(B(0.14, 0.34, 0.4, x, TOP - 0.17, 0.2), WHITE, 2));
  // the mansard and its dormers; a chimney on the party wall
  mansard(o, W, TOP + 0.32, 3.0, 0.2, 1.3, D);
  dormer(o, cx, TOP + 0.75, 0.05, R);
  dormer(o, xd, TOP + 0.75, -0.05, R);
  chimney(o, W / 2 - 0.45, -4.5, TOP + 2.6, 2.4);
  return finish(o);
}

// a brownstone: the angled bay, a high stoop, heavy hoods over the windows, a flat roof
// behind a bracketed cornice
export function bayHouse(seed = 2) {
  const R = seeded(seed), o = newOut();
  const W = 6.6, D = 13, TOP = 12.2;
  const bw = 2.1, bd = 1.25, cx = -0.95;              // the bay's front face width, depth, centre
  o.wall.push(muv(B(W, TOP, D, 0, TOP / 2, -D / 2)));
  // the bay: front face and two cheeks at 45 degrees
  const ch = bd * Math.SQRT2;
  o.wall.push(muv(B(bw, TOP - 0.0, 0.3, cx, TOP / 2, bd - 0.15)));
  for (const s of [-1, 1]) { const g = B(ch, TOP, 0.3, 0, TOP / 2, 0); g.rotateY(-s * Math.PI / 4); g.translate(cx + s * (bw / 2 + bd / 2), 0, bd / 2 - 0.1); o.wall.push(muv(g)); }
  const floors = [[2.3, 2.6], [6.0, 2.3], [9.4, 2.0]];
  for (const [y0, h] of floors) {
    windowOn(o, 0, cx, bd, y0, 1.15, h, 0, R, { lintelH: 0.36, lintelC: 0x4a3226, sillC: 0x4a3226 });
    for (const s of [-1, 1]) windowOn(o, s * Math.PI / 4, cx + s * (bw / 2 + bd / 2), bd / 2 + 0.05, y0, 0.75, h, 0, R, { lintelH: 0.36, lintelC: 0x4a3226, sillC: 0x4a3226 });
  }
  const xd = 2.1;
  const zb = stoop(o, xd, 2.0, 7, 1.9, 0x5a4034);
  door(o, xd, 2.0, R, { fan: false, surround: 0x3a2a20 });
  windowOn(o, 0, xd, 0, 6.0, 1.05, 2.3, 0, R, { lintelH: 0.36, lintelC: 0x4a3226, sillC: 0x4a3226 });
  windowOn(o, 0, xd, 0, 9.4, 1.05, 2.0, 0, R, { lintelH: 0.36, lintelC: 0x4a3226, sillC: 0x4a3226 });
  ironRail(o, -W / 2 + 0.1, 0, zb - 0.1, xd - 1.05, 0, zb - 0.1, 1.05, 0.15);
  // cornice with big brackets across the whole front, over the bay too
  o.trim.push(tr(B(W, 0.55, bd + 0.5, 0, TOP + 0.27, (bd + 0.5) / 2 - 0.1), 0x2a2420, 2));
  for (let k = 0; k < 8; k++) o.trim.push(tr(B(0.16, 0.5, 0.5, -W / 2 + 0.4 + k * (W - 0.8) / 7, TOP - 0.25, (k > 1 && k < 5 ? bd : 0) + 0.2), 0x2a2420, 2));
  o.roof.push(muv(B(W, 0.3, D - 0.5, 0, TOP + 0.4, -D / 2)));
  chimney(o, W / 2 - 0.45, -5, TOP, 2.6);
  return finish(o);
}

// up the hill: a Federal front, flat, three windows a floor with black shutters and window
// boxes, the door with its fanlight, a slate roof with dormers, gas lamps out front (cold.js)
export function fedHouse(seed = 3) {
  const R = seeded(seed), o = newOut();
  const W = 7.6, D = 12, TOP = 11.0;
  o.wall.push(muv(B(W, TOP, D, 0, TOP / 2, -D / 2)));
  o.trim.push(tr(B(W, 0.18, 0.06, 0, 0.9, 0.03), GRANITE));
  const xs = [-2.6, 0, 2.6];
  const floors = [[1.4, 2.3], [4.9, 2.2], [8.3, 1.8]];
  floors.forEach(([y0, h], f) => xs.forEach((x, i) => {
    if (f === 0 && i === 2) return;
    windowOn(o, 0, x, 0, y0, 1.05, h, 1, R, { shutters: true, box: f < 2, lintel: true, lintelH: 0.22, lintelC: LIMESTONE, sillC: LIMESTONE });
  }));
  door(o, 2.6, 0.7, R, { fan: true, surround: WHITE, surroundK: 2, h: 2.4 });
  for (let k = 0; k < 2; k++) o.trim.push(tr(B(1.8, 0.24, 0.34 + k * 0.32, 2.6, 0.12 + k * 0.24, (0.34 + k * 0.32) / 2), GRANITE));
  o.trim.push(tr(B(W, 0.4, 0.4, 0, TOP + 0.2, 0.15), WHITE, 2));
  // the roof: a gable along the street, slate, two dormers
  const s = new THREE.Shape(); s.moveTo(0.3, 0); s.lineTo(-D / 2, 3.6); s.lineTo(-D - 0.3, 0); s.lineTo(0.3, 0);
  const rg = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false }); rg.rotateY(-Math.PI / 2); rg.translate(W / 2, TOP + 0.4, 0); o.roof.push(muv(rg));
  for (const x of [-1.9, 1.9]) dormer(o, x, TOP + 0.9, -0.8, R, 1);
  chimney(o, -W / 2 + 0.45, -6, TOP + 2.2, 2.6);
  chimney(o, W / 2 - 0.45, -6, TOP + 2.2, 2.6);
  return finish(o);
}

// a triple-decker: three floors of clapboard, the porches stacked up the right side of the
// front with their posts and rails, a bay up the left, a deep bracketed cornice on a flat roof
export function tripleDecker(seed = 4) {
  const R = seeded(seed), o = newOut();
  const W = 7.6, D = 15, FH = 3.0, TOP = 9.6;
  o.wall.push(muv(B(W, TOP, D, 0, TOP / 2 + 0.7, -D / 2)));
  o.trim.push(tr(B(W + 0.04, 0.7, D + 0.04, 0, 0.35, -D / 2), 0x6a625a));   // the foundation
  // the bay up the left: three windows a floor
  const bx = -1.9, bw = 2.4, bd = 0.85;
  o.wall.push(muv(B(bw, TOP - 0.1, bd, bx, (TOP - 0.1) / 2 + 0.75, bd / 2)));
  for (let f = 0; f < 3; f++) {
    const y0 = 0.7 + f * FH + 0.75;
    windowOn(o, 0, bx, bd, y0, 0.95, 1.75, 3, R, { lintel: false, sillC: WHITE, sillK: 2, frameK: 2 });
    for (const s of [-1, 1]) windowOn(o, s * Math.PI / 2, bx + s * (bw / 2), bd / 2, y0, 0.5, 1.75, 3, R, { lintel: false, sillC: WHITE, sillK: 2, frameK: 2 });
    o.trim.push(tr(B(bw + 0.08, 0.14, bd + 0.08, bx, 0.7 + f * FH + 0.02, bd / 2), WHITE, 2));
  }
  // corner boards
  for (const x of [-W / 2, W / 2]) o.trim.push(tr(B(0.16, TOP, 0.16, x, TOP / 2 + 0.7, 0.02), WHITE, 2));
  // the porches: a deck at each floor, posts at the corners, a rail with balusters, the doors behind
  const px = 1.85, pw = 3.6, pd = 2.4;
  for (let f = 0; f < 3; f++) {
    const y = 0.7 + f * FH;
    o.trim.push(tr(B(pw, 0.22, pd, px, y + 0.11, pd / 2), WHITE, 2));
    for (const sx of [-1, 1]) o.trim.push(tr(B(0.18, FH - 0.22, 0.18, px + sx * (pw / 2 - 0.12), y + 0.22 + (FH - 0.22) / 2, pd - 0.12), WHITE, 2));
    o.trim.push(tr(B(pw, 0.08, 0.1, px, y + 1.05, pd - 0.1), WHITE, 2));
    o.trim.push(tr(B(0.1, 0.08, pd, px + pw / 2 - 0.1, y + 1.05, pd / 2), WHITE, 2));
    for (let k = 0; k <= 16; k++) o.trim.push(tr(B(0.05, 0.8, 0.05, px - pw / 2 + 0.15 + k * (pw - 0.3) / 16, y + 0.62, pd - 0.1), WHITE, 2));
    door(o, px + 0.8, y + 0.22, R, { w: 0.95, h: 2.15, surround: WHITE, surroundK: 2 });
    windowOn(o, 0, px - 0.75, 0, y + 0.95, 0.95, 1.75, 3, R, { lintel: false, sillC: WHITE, sillK: 2, frameK: 2 });
  }
  o.trim.push(tr(B(pw, 0.22, pd + 0.1, px, 0.7 + 3 * FH + 0.11, pd / 2), WHITE, 2));
  // front steps up to the first porch
  for (let k = 0; k < 4; k++) o.trim.push(tr(B(1.4, 0.18 * (k + 1), 0.3, px + 0.8, 0.09 * (k + 1), pd + 0.15 + (3 - k) * 0.3), 0x7a7268));
  // the side windows, so the gaps between houses aren't blank
  for (let f = 0; f < 3; f++) for (const z of [-4.2, -9.5]) for (const s of [-1, 1]) windowOn(o, s * Math.PI / 2, s * W / 2, z, 0.7 + f * FH + 0.75, 0.95, 1.7, 3, R, { lintel: false, sillC: WHITE, sillK: 2, frameK: 2 });
  // the cornice: deep, with brackets, all the way round the front
  o.trim.push(tr(B(W + 0.9, 0.5, 1.0 + pd, 0, TOP + 0.95, (pd - 1.0) / 2 + 0.25), WHITE, 2));
  o.trim.push(tr(B(W + 0.5, 0.35, 0.5, 0, TOP + 0.55, pd + 0.1), WHITE, 2));
  for (let k = 0; k < 9; k++) o.trim.push(tr(B(0.14, 0.45, 0.55, -W / 2 + 0.2 + k * (W - 0.4) / 8, TOP + 0.45, pd + 0.1), WHITE, 2));
  o.roof.push(muv(B(W, 0.25, D, 0, TOP + 0.95, -D / 2)));
  return finish(o);
}

// downtown: a granite (or brick) block, shop windows at the street with their sign band,
// seven floors of windows, a heavy cornice
export function cityBlock(seed = 5) {
  const R = seeded(seed), o = newOut();
  const W = 14, D = 16, FH = 3.4, NF = 7, TOP = 4.6 + (NF - 1) * FH + 0.4;
  o.wall.push(muv(B(W, TOP, D, 0, TOP / 2, -D / 2)));
  // the shop fronts: big glass between granite piers, a sign band over them
  for (let k = 0; k < 3; k++) {
    const x = -W / 2 + W * (k + 0.5) / 3;
    o.glass.push(pane(W / 3 - 1.0, 3.3, 2, R()).translate(x, 2.0, 0.03));
    o.trim.push(tr(B(W / 3 - 0.8, 0.12, 0.2, x, 0.3, 0.08), 0x3a3a3c));
  }
  for (let k = 0; k <= 3; k++) o.trim.push(tr(B(0.7, 4.4, 0.3, -W / 2 + k * W / 3, 2.2, 0.12), GRANITE));
  o.trim.push(tr(B(W, 0.9, 0.3, 0, 4.15, 0.14), 0x22201e, 2));
  // the upper floors: four windows each
  for (let f = 0; f < NF - 1; f++) for (let k = 0; k < 4; k++) {
    const x = -W / 2 + W * (k + 0.5) / 4;
    windowOn(o, 0, x, 0, 5.2 + f * FH, 1.4, 2.3, 0, R, { lintelC: 0xb8b0a0, sillC: 0xb8b0a0 });
  }
  for (const y of [4.75, 4.75 + 3 * FH]) o.trim.push(tr(B(W + 0.2, 0.3, 0.3, 0, y, 0.12), LIMESTONE));
  o.trim.push(tr(B(W + 0.6, 0.7, 1.1, 0, TOP - 0.1, 0.4), 0xa8a294));
  for (let k = 0; k < 14; k++) o.trim.push(tr(B(0.18, 0.4, 0.6, -W / 2 + 0.5 + k * (W - 1) / 13, TOP - 0.6, 0.3), 0xa8a294));
  o.roof.push(muv(B(W, 0.3, D, 0, TOP + 0.2, -D / 2)));
  return finish(o);
}

// a brick loft downtown: five tall floors of round-headed windows in pairs, the shop windows
// under them, a corbelled brick cornice
export function loftBlock(seed = 6) {
  const R = seeded(seed), o = newOut();
  const W = 16, D = 18, FH = 3.7, TOP = 4.8 + 4 * FH + 1.6;
  o.wall.push(muv(B(W, TOP, D, 0, TOP / 2, -D / 2)));
  for (let k = 0; k < 4; k++) { const x = -W / 2 + W * (k + 0.5) / 4; o.glass.push(pane(W / 4 - 1.1, 3.4, 2, R()).translate(x, 2.0, 0.03)); }
  for (let k = 0; k <= 4; k++) o.trim.push(tr(B(0.6, 4.6, 0.3, -W / 2 + k * W / 4, 2.3, 0.12), 0x6a3a2a));
  o.trim.push(tr(B(W, 0.7, 0.35, 0, 4.55, 0.16), 0x2a2220, 2));
  for (let f = 0; f < 4; f++) for (let k = 0; k < 5; k++) {
    const x = -W / 2 + W * (k + 0.5) / 5, y0 = 5.6 + f * FH, w = 1.5, h = 2.3;
    o.glass.push(pane(w, h, 0, R()).translate(x, y0 + h / 2, 0.03));
    o.glass.push(pane(w, w / 2, 4, R()).translate(x, y0 + h + w / 4 + 0.02, 0.03));
    // the brick arch over it and a stone sill
    const arch = arcWall(w / 2 + 0.22, Math.PI / 2, 0.24, 0, 0, 0, 10, true); arch.rotateX(Math.PI / 2); arch.translate(x, y0 + h + 0.02, 0.14); o.trim.push(tr(arch, 0x7a3e2c));
    o.trim.push(tr(B(w + 0.3, 0.12, 0.22, x, y0 - 0.06, 0.1), 0xb8b0a0));
  }
  for (let k = 0; k < 20; k++) o.trim.push(tr(B(0.3, 0.5, 0.4, -W / 2 + 0.4 + k * (W - 0.8) / 19, TOP - 1.1, 0.2), 0x6a3426));
  o.trim.push(tr(B(W + 0.4, 0.6, 0.7, 0, TOP - 0.5, 0.3), 0x6a3426));
  o.roof.push(muv(B(W, 0.3, D, 0, TOP + 0.1, -D / 2)));
  return finish(o);
}
// an office tower: a granite base, then glass all the way up (the wall takes the curtain-wall
// material), a parapet
export function officeBlock(seed = 7) {
  const R = seeded(seed), o = newOut();
  const W = 18, D = 18, H = 52;
  o.wall.push(B(W, H - 6, D, 0, 6 + (H - 6) / 2, -D / 2));
  o.trim.push(tr(B(W + 0.6, 6, D + 0.6, 0, 3, -D / 2), 0x8a8884));
  for (let k = 0; k < 3; k++) o.glass.push(pane(4.2, 4.2, 2, R()).translate(-6 + k * 6, 2.4, 0.33));
  o.trim.push(tr(B(W + 0.3, 1.2, D + 0.3, 0, H + 0.6, -D / 2), 0x6a6a6e));
  o.roof.push(muv(B(W, 0.3, D, 0, H + 0.2, -D / 2)));
  return finish(o);
}

// a far row: a box with its front painted on, and a mansard or a flat top
export function farBlock(kind = 'mansard') {
  const o = newOut();
  const W = 8, D = 12, H = kind === 'tall' ? 32 : 14;
  o.wall.push(muv(B(W, H, D, 0, H / 2, -D / 2)));
  if (kind === 'mansard') mansard(o, W, H, 2.6, 0.1, 1.1, D);
  else o.roof.push(muv(B(W + 0.4, 0.6, D + 0.4, 0, H + 0.3, -D / 2)));
  o.trim = []; o.glass = []; o.iron = [];
  return finish(o);
}
