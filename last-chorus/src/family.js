// I FUCKED YOUR DAD. The family's year in their suburb, told back to him. The street at night and the
// phone left unlocked; the supermarket: the frozen-foods aisle, a coffee, the cart, the scales; the
// match struck, and the fire; his dad's driveway: the mug, the grill, the podium, the car; the
// sprinklers, the apple rotting on the branch; Christmas and a single click; the trophy; the helix,
// same genetics; Thanksgiving, Father's Day, the table with the empty chair and the flames under the
// dishes, the yard in the rain, the letters on the hill; revenge served cold; and at the end the
// family's house dressed for every holiday at once.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function tube(a, b, r0, r1 = r0, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const paper = (M, key, map, k = 0.5) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));
const FONT = '"Arial Black", Impact, sans-serif';
const FLAMEC = [1, 0.55, 0.15], WARM = [1, 0.8, 0.5], GOLD = rgb(0xe8b850), SILVER = rgb(0xd8dce4), WHITE = rgb(0xf4f2ee);
const BULBS = [[1, 0.2, 0.15], [0.2, 1, 0.3], [0.3, 0.5, 1], [1, 0.85, 0.2], [1, 0.4, 0.8]];

// ---------- the pictures ----------
// the mug: WORLD'S BEST DAD round it
function mugTexture() {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c82a2a'; g.font = `900 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("WORLD'S BEST DAD", W / 2, H / 2 + 4);
    g.fillStyle = '#2a4aa8'; g.fillRect(0, 14, W, 12); g.fillRect(0, H - 26, W, 12);
  });
}
// the phone: the lock screen open, the messages coming up
function phoneTexture() {
  return canvasTex(512, 1024, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#1a2a5a'); grd.addColorStop(1, '#4a1a4a'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff'; g.lineWidth = 14; g.beginPath(); g.arc(W / 2, 170, 46, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 64, 180, 128, 100);
    g.fillStyle = '#e8e8f0'; g.font = `700 90px ${FONT}`; g.textAlign = 'center'; g.fillText('2:47', W / 2, 400);
    const R = seeded(4);
    for (let k = 0; k < 6; k++) { const y = 470 + k * 88, me = k % 2; g.fillStyle = me ? '#2a8aff' : '#e8e8ee'; const w = 200 + R() * 140, x = me ? W - 40 - w : 40; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, 64, 28) : g.rect(x, y, w, 64); g.fill(); g.fillStyle = me ? '#dbe8ff' : '#7a7a8a'; for (let j = 0; j < 2; j++) g.fillRect(x + 22, y + 18 + j * 18, (w - 50) * (0.5 + R() * 0.5), 8); }
  });
}
// the scales' face, the market's aisle sign, the gift's card
function aisleTexture() {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#1a4a8a'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f8ff'; g.font = `900 120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FROZEN FOODS', W / 2, H / 2 + 6);
    g.fillStyle = '#e82a2a'; g.fillRect(0, 0, W, 16); g.fillRect(0, H - 16, W, 16);
  });
}
function cardTexture() {
  return canvasTex(512, 384, (g, W, H) => {
    g.fillStyle = '#f2eada'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a4a8a'; g.lineWidth = 10; g.strokeRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#2a4a8a'; g.font = `900 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HAPPY', W / 2, 110); g.fillText("FATHER'S", W / 2, 190); g.fillText('DAY', W / 2, 270);
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { mug: mugTexture(), phone: phoneTexture(), aisle: aisleTexture(), card: cardTexture() });

// flames: a billboard with a flickering fire in it
function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aK; attribute float aSeed; varying vec2 vUv; varying float vK; varying float vSeed; void main(){ vUv = uv; vK = aK; vSeed = aSeed; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz); c.xy += position.xy * vec2(sx, sy); gl_Position = projectionMatrix * c; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying float vK; varying float vSeed;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 q = vUv; float t = uTime * 2.4 + vSeed * 10.0;
        float n = n2(vec2(q.x * 4.0, q.y * 3.0 - t)) * 0.6 + n2(vec2(q.x * 9.0, q.y * 7.0 - t * 1.7)) * 0.4;
        float w = (1.0 - q.y) * 0.5 + 0.06;
        float shape = smoothstep(w, w * 0.2, abs(q.x - 0.5 + (n - 0.5) * 0.25 * q.y)) * smoothstep(1.0, 0.25, q.y + (n - 0.5) * 0.5) * smoothstep(0.0, 0.08, q.y);
        vec3 c = mix(vec3(1.0, 0.95, 0.6), mix(vec3(1.0, 0.5, 0.1), vec3(0.8, 0.12, 0.04), smoothstep(0.3, 0.9, q.y)), smoothstep(0.05, 0.5, q.y + (n - 0.5) * 0.3));
        float a = clamp(shape * vK * 1.3, 0.0, 1.0);
        gl_FragColor = vec4(c * 1.35, a * 0.92);
      }`,
    depthWrite: false, transparent: true,
  });
}
function tintLit(rough = 0.5, metal = 0, k = 0.2) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, metalness: metal });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
  };
  return m;
}

// ---------- the family's things, at their (enormous) scale ----------
const FG = {
  phone() { return merge([paint(box(14, 28, 1.6, 0, 14, -0.9), rgb(0x0c0c10)), paint(box(14.4, 28.4, 1.2, 0, 14, -1.2), rgb(0x8a8e98)), paint(box(10, 1.2, 2, 0, 0.6, -0.9), rgb(0x2a2a30))]); },
  phoneFace() { const g = new THREE.PlaneGeometry(12.6, 25.2); g.translate(0, 14.2, 0.1); return g; },
  // two coffees on a little round table
  coffee() { const parts = [paint(cyl(7, 7, 0.6, 32, 0, 10, 0), rgb(0x2a2a30)), paint(cyl(0.6, 0.8, 10, 12, 0, 5, 0), rgb(0x2a2a30)), paint(cyl(3, 3.4, 0.5, 20, 0, 0.25, 0), rgb(0x2a2a30))]; for (const x of [-3, 3]) { parts.push(paint(cyl(1.8, 1.4, 5, 20, x, 12.8, 0), WHITE)); parts.push(paint(cyl(1.9, 1.9, 0.6, 20, x, 15.5, 0), rgb(0x2a2a2a))); parts.push(paint(cyl(1.75, 1.55, 1.6, 20, x, 12.6, 0), rgb(0x8a5a2a))); } return merge(parts); },
  // the shopping cart: the basket in wire, the handle, the wheels
  cart() {
    const parts = [], wire = rgb(0xc8ccd4);
    for (let k = 0; k <= 8; k++) { parts.push(paint(box(0.2, 7, 0.2, -6 + k * 1.5, 9, 4), wire)); parts.push(paint(box(0.2, 7, 0.2, -6 + k * 1.5, 9, -4), wire)); }
    for (let k = 0; k <= 5; k++) { parts.push(paint(box(0.2, 7, 0.2, -6, 9, -4 + k * 1.6), wire)); parts.push(paint(box(0.2, 7, 0.2, 6, 9, -4 + k * 1.6), wire)); }
    for (const y of [5.6, 9, 12.4]) { parts.push(paint(box(12.2, 0.2, 0.2, 0, y, 4), wire)); parts.push(paint(box(12.2, 0.2, 0.2, 0, y, -4), wire)); parts.push(paint(box(0.2, 0.2, 8.2, -6, y, 0), wire)); parts.push(paint(box(0.2, 0.2, 8.2, 6, y, 0), wire)); }
    parts.push(paint(box(12, 0.3, 8, 0, 5.6, 0), wire)); parts.push(paint(box(0.6, 0.6, 9, -7.6, 13.4, 0), rgb(0xd82a2a)));
    for (const [x, z] of [[-5, 3], [5, 3], [-5, -3], [5, -3]]) { parts.push(paint(box(0.3, 4, 0.3, x, 3, z), wire)); parts.push(paint(cyl(0.9, 0.9, 0.6, 12, x, 0.9, z).rotateX(Math.PI / 2), rgb(0x1a1a1e))); }
    for (const [x, y, z, w, h, d, c] of [[-2, 7, 1, 3, 2.4, 2, 0x8ad8ff], [2, 7.4, -1, 2.6, 3, 2.4, 0xf4c84a], [0, 8.2, 1.8, 2.4, 1.6, 1.8, 0xe84a3a]]) parts.push(paint(box(w, h, d, x, y, z), rgb(c)));
    return merge(parts);
  },
  // the scales: a brass post, the beam, the pans on their chains; the beam is its own
  scaleBase() { return merge([paint(cyl(5, 6, 1.4, 24, 0, 0.7, 0), rgb(0x6a4a2a)), paint(cyl(0.8, 1, 22, 12, 0, 12, 0), rgb(0xc8a050)), paint(sph(1.4, 1, 1, 1, 0, 23.4, 0), rgb(0xd8b060))]); },
  scaleBeam() { const parts = [paint(box(30, 0.8, 0.8, 0, 0, 0), rgb(0xd8b060))]; for (const s of [-1, 1]) { for (const a of [0, 2.1, 4.2]) parts.push(paint(tube(V(s * 14.6, 0, 0), V(s * 14.6 + Math.cos(a) * 3.6, -9, Math.sin(a) * 3.6), 0.08), rgb(0xa8a8b0))); parts.push(paint(lathe([[0, 0], [4.2, 0.4], [4.4, 1], [0, 0.6]], 24).translate(s * 14.6, -9.4, 0), rgb(0xd8b060))); } return merge(parts); },
  // the match: a wooden stick, the red head; the flame is the fire layer
  match() { return merge([paint(box(1.6, 34, 1.6, 0, 17, 0), rgb(0xe8c890)), paint(sph(1.8, 1, 1.5, 1, 0, 35, 0), rgb(0xc8281e))]); },
  // the mug
  mug() { return merge([paint(lathe([[0, 0], [8, 0], [8.2, 0.4], [8.2, 18], [7.6, 18.2], [7.6, 1], [0, 1]], 40), WHITE), paint(new THREE.TorusGeometry(4.4, 1.3, 10, 20, Math.PI * 1.1).rotateZ(-Math.PI * 0.55).translate(8.4, 9.4, 0), WHITE), paint(cyl(7.5, 7.5, 0.4, 32, 0, 15.6, 0), rgb(0x4a2a14))]); },
  mugBand() { const g = new THREE.CylinderGeometry(8.28, 8.28, 6, 40, 1, true, -1.2, 2.4); g.translate(0, 9, 0); return g; },
  // the grill: kettle and lid, legs, the wheels
  grill() { const parts = [], k = rgb(0x1a1a1e); const bowl = new THREE.SphereGeometry(6, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); bowl.translate(0, 12, 0); parts.push(paint(bowl, k)); const lid = new THREE.SphereGeometry(6.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hdl = box(3, 0.7, 0.9, 0, 6.5, 0); for (const g of [lid, hdl]) { g.translate(0, 0, 6.05); g.rotateX(-0.5); g.translate(0, 12.1, -6.05); } parts.push(paint(lid, k)); parts.push(paint(hdl, rgb(0x3a3a40))); for (const a of [0, 2.1, 4.2]) parts.push(paint(tube(V(Math.cos(a) * 4, 8, Math.sin(a) * 4), V(Math.cos(a) * 6, 0, Math.sin(a) * 6), 0.35), rgb(0x8a8e98))); parts.push(paint(box(9, 0.3, 9, 0, 12.1, 0), rgb(0x5a5e68))); for (let i = 0; i < 4; i++) parts.push(paint(cyl(0.7, 0.7, 3, 10, -2.4 + i * 1.6, 12.6, 0).rotateZ(Math.PI / 2).translate(0, 0, 0), rgb(0x8a3a1a))); return merge(parts); },
  // the podium: 1 and 2, the gold cup on top, a little one beside it
  podium() { const parts = [paint(box(12, 10, 10, 0, 5, 0), rgb(0xf4f2ee)), paint(box(12, 6, 10, -12, 3, 0), rgb(0xd8dce4)), paint(box(4, 4.6, 0.3, 0, 6, 5.1), rgb(0xd8b050)), paint(box(4, 3, 0.3, -12, 3.4, 5.1), rgb(0xa8acb4))]; parts.push(paint(lathe([[0, 0], [3, 0], [3, 1], [1, 2], [0.8, 6], [2, 7], [4, 10], [4.6, 15], [4.7, 15.4], [0, 15]], 28).translate(0, 10, 0), GOLD)); parts.push(paint(lathe([[0, 0], [1.4, 0], [1.4, 0.5], [0.4, 1], [0.3, 2.6], [0.9, 3], [1.8, 4.2], [2, 5.8], [0, 5.6]], 20).translate(-12, 6, 0), rgb(0x8a8a90))); return merge(parts); },
  // the apple tree: trunk, a round crown; the apples are a layer, the rotten one is its own
  appleTree() { const parts = [paint(tube(V(0, 0, 0), V(0.8, 14, 0), 2.2, 1.4, 10), rgb(0x4a3020))]; for (const [a, b] of [[V(0.8, 12, 0), V(8, 20, 2)], [V(0.8, 12, 0), V(-7, 19, -2)], [V(0.6, 10, 0), V(2, 18, -7)]]) parts.push(paint(tube(a, b, 1.1, 0.6, 8), rgb(0x4a3020))); const R = seeded(8); for (let k = 0; k < 9; k++) parts.push(paint(sph(6 + R() * 2, 1, 0.8, 1, (R() - 0.5) * 12, 22 + R() * 5, (R() - 0.5) * 10, 12, 8), rgb(0x2a6a2a).map((c) => c * (0.8 + R() * 0.4)))); return merge(parts); },
  apple(rot) { return merge([paint(sph(1, 1.05, 0.95, 1.05, 0, 0, 0, 16, 12), rot ? rgb(0x5a3a1a) : [1, 0.15, 0.12]), paint(cyl(0.08, 0.1, 0.6, 6, 0, 1.1, 0), rgb(0x4a3020)), paint(sph(0.3, 1.6, 0.2, 0.8, 0.35, 1.1, 0), rot ? rgb(0x3a2a10) : rgb(0x3a8a2a))]); },
  // the Christmas tree, its presents
  xmasTree() { const parts = [paint(cyl(1.4, 1.8, 6, 10, 0, 3, 0), rgb(0x4a3020))]; for (let k = 0; k < 5; k++) parts.push(paint(new THREE.ConeGeometry(14 - k * 2.4, 12, 18).translate(0, 10 + k * 7, 0), rgb(0x1a4a2a))); parts.push(paint(new THREE.OctahedronGeometry(2.4, 0).translate(0, 50, 0), rgb(0xffe060))); const R = seeded(12); for (let k = 0; k < 8; k++) { const a = R() * 6.28, r = 9 + R() * 6, w = 2.4 + R() * 3, c = [0xd82a2a, 0x2a8ad8, 0xe8c040, 0xe8e8f0, 0x2ad86a][k % 5]; parts.push(paint(box(w, w * 0.8, w, Math.cos(a) * r, w * 0.4, Math.sin(a) * r), rgb(c))); parts.push(paint(box(w + 0.1, w * 0.82, 0.5, Math.cos(a) * r, w * 0.4, Math.sin(a) * r), rgb(0xf4f0e8))); } return merge(parts); },
  // the trophy: gold, on its plinth
  trophy() { return merge([paint(box(12, 6, 12, 0, 3, 0), rgb(0x1a1a20)), paint(lathe([[0, 0], [5, 0], [5, 1.4], [2, 3], [1.4, 9], [3, 11], [7, 15], [8.6, 24], [9, 25], [0, 24]], 32).translate(0, 6, 0), GOLD), ...[-1, 1].map((s) => paint(new THREE.TorusGeometry(4, 0.9, 8, 20, Math.PI).rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2).translate(s * 8.6, 25, 0), GOLD))]); },
  // the helix: two strands of beads and the rungs between, as tall as a building
  helix() { const parts = []; for (let k = 0; k < 60; k++) { const a = k * 0.42, y = k * 1.1; for (const s of [0, Math.PI]) parts.push(paint(sph(1.1, 1, 1, 1, Math.cos(a + s) * 6, y, Math.sin(a + s) * 6, 10, 8), s ? [0.4, 0.7, 1] : [1, 0.45, 0.6])); if (k % 2 === 0) parts.push(paint(tube(V(Math.cos(a) * 6, y, Math.sin(a) * 6), V(Math.cos(a + Math.PI) * 6, y, Math.sin(a + Math.PI) * 6), 0.35), [0.9, 0.9, 0.95])); } return merge(parts); },
  // the turkey on its platter on the table
  turkey() { const parts = [paint(cyl(9, 9, 0.6, 32, 0, 9.4, 0), SILVER), paint(box(28, 0.8, 14, 0, 8.6, 0), WHITE), paint(box(28.4, 8, 14.4, 0, 4.4, 0), rgb(0x8a4a2a)), paint(sph(5, 1.3, 0.75, 1, 0, 13, 0), rgb(0xb8662a))]; for (const s of [-1, 1]) { parts.push(paint(sph(1.6, 1.8, 0.9, 1, 5.6, 12.6, s * 2.6), rgb(0xa8561e))); parts.push(paint(sph(0.6, 1, 1, 1, 7.6, 12.8, s * 2.6), WHITE)); } for (let k = 0; k < 6; k++) parts.push(paint(sph(1.2, 1, 1, 1, -7 + k * 2.6, 10.4, 5), [[0.9, 0.4, 0.1], [0.3, 0.6, 0.2], [0.8, 0.7, 0.3]][k % 3])); return merge(parts); },
  // the gift: a box, a bow, the tie over it; the card is its own
  gift() { const parts = [paint(box(14, 10, 14, 0, 5, 0), rgb(0x2a4aa8)), paint(box(14.2, 10.2, 2, 0, 5, 0), rgb(0xe8c040)), paint(box(2, 10.2, 14.2, 0, 5, 0), rgb(0xe8c040))]; for (const s of [-1, 1]) parts.push(paint(new THREE.TorusGeometry(2, 0.6, 8, 16).rotateY(s * 0.6).translate(s * 1.8, 11.6, 0), rgb(0xe8c040))); const tie = new THREE.Shape(); tie.moveTo(-1, 0); tie.lineTo(1, 0); tie.lineTo(2.2, -12); tie.lineTo(0, -15); tie.lineTo(-2.2, -12); tie.closePath(); const tg = new THREE.ExtrudeGeometry(tie, { depth: 0.3, bevelEnabled: false }); tg.translate(0, 0, 7.2); tg.translate(3, 16, 0); parts.push(paint(tg, rgb(0xc82a3a))); return merge(parts); },
  cardFace() { const g = new THREE.PlaneGeometry(8, 6); g.rotateX(-0.4); g.translate(-3, 11.4, 4); return g; },
  // the long table for the family, the chairs down both sides
  table() { const parts = [paint(box(60, 0.8, 12, 0, 8, 0), WHITE), paint(box(60.6, 7.2, 12.6, 0, 4.2, 0), rgb(0xe8e4dc))]; for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { const x = -25 + k * 10; parts.push(paint(box(4, 0.8, 4, x, 5.4, s * 9), rgb(0x9a6a3a))); for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) parts.push(paint(box(0.5, 5, 0.5, x + dx, 2.5, s * 9 + dz), rgb(0x8a5a2a))); parts.push(paint(box(4, 8, 0.6, x, 9.8, s * 11), rgb(0x9a6a3a))); } for (const x of [-20, 0, 20]) parts.push(paint(cyl(0.4, 0.4, 5, 8, x, 11, 0), WHITE)); for (let k = 0; k < 10; k++) parts.push(paint(cyl(1.6, 1.6, 0.2, 16, -27 + k * 6, 8.5, (k % 2 ? 1 : -1) * 3), WHITE)); return merge(parts); },
  ghost() { return merge([paint(box(4.2, 6.2, 4.2, 0, 3, 0), [1, 1, 1]), paint(box(4.2, 8.2, 0.9, 0, 10, 2), [1, 1, 1])]); },
  chafing() { return merge([paint(box(8, 3, 5, 0, 11, 0), SILVER), paint(cyl(2.6, 2.6, 1.2, 16, 0, 13, 0).rotateZ(Math.PI / 2).translate(0, 0, 0), SILVER), ...[-3, 3].map((x) => paint(box(0.4, 2.4, 4, x, 9.2, 0), rgb(0x1a1a1e)))]); },
  // the swing set, swinging empty in the rain
  swingFrame() { const parts = []; for (const s of [-1, 1]) { parts.push(paint(tube(V(-12, 0, s * 4), V(-10, 16, 0), 0.5), rgb(0xd82a2a))); parts.push(paint(tube(V(12, 0, s * 4), V(10, 16, 0), 0.5), rgb(0xd82a2a))); } parts.push(paint(cyl(0.5, 0.5, 21, 10, 0, 16, 0).rotateZ(Math.PI / 2).translate(0, 0, 0), rgb(0xd82a2a))); return merge(parts); },
  swing() { return merge([paint(box(0.15, 12, 0.15, -2, -6, 0), rgb(0x8a8e98)), paint(box(0.15, 12, 0.15, 2, -6, 0), rgb(0x8a8e98)), paint(box(4.6, 0.4, 1.6, 0, -12, 0), rgb(0x2a2a30))]); },
  // the letters on the hill
  letters() { const parts = [], w = WHITE; const D = (x) => { parts.push(paint(box(3, 22, 1.2, x - 5, 11, 0), w)); const arc = new THREE.TorusGeometry(9, 1.5, 8, 24, Math.PI); arc.rotateZ(-Math.PI / 2); arc.scale(0.9, 1.2, 0.6); arc.translate(x - 5, 11, 0); parts.push(paint(arc, w)); }; D(-16); D(28); parts.push(paint(tube(V(-4, 0, 0), V(6, 22, 0), 1.6), w)); parts.push(paint(tube(V(16, 0, 0), V(6, 22, 0), 1.6), w)); parts.push(paint(box(10, 2.6, 1.2, 6, 8, 0), w)); for (let k = 0; k < 6; k++) parts.push(paint(box(0.4, 10, 0.4, -24 + k * 10, -4, -1), rgb(0x5a5e68))); return merge(parts); },
  // the platter and its cloche; the ice beneath it
  platter() { return merge([paint(cyl(10, 10, 0.6, 40, 0, 10, 0), SILVER), paint(box(30, 0.8, 16, 0, 9.2, 0), WHITE), paint(box(30.4, 8.6, 16.4, 0, 4.6, 0), rgb(0x6a3a1a))]); },
  cloche() { return paint(lathe([[0, 0], [8.4, 0], [8, 2.6], [6.4, 6], [3.4, 8.2], [0, 8.6]], 40), SILVER); },
  iceBlock() { const g = new THREE.BoxGeometry(9, 6, 9, 1, 1, 1); g.translate(0, 13.6, 0); return paint(g, [0.75, 0.92, 1]); },
  // the marquee board for his lines, on two posts, two lamps over it
  signBoard() { return merge([paint(box(25.4, 9.8, 1.2, 0, 0, -1.1), rgb(0x16161a)), paint(box(24.4, 8.8, 0.4, 0, 0, -0.5), rgb(0xf4f2ea)), ...[-9, 9].map((x) => paint(box(0.3, 40, 0.3, x, 25.4, -1.1), rgb(0x3a3a40))), ...[-8, 8].map((x) => paint(box(2.4, 0.8, 1.6, x, 5.4, 0.2), rgb(0x2a2a30)))]); },
};

const L_ = (M, k) => M[k];
extend({
  layers: {
    fdPhone: (M) => [FG.phone(), VCm(M, 'fdPhoneM', 0.1, { roughness: 0.2, metalness: 0.6 }), 2, {}],
    fdPhoneFace: (M) => [FG.phoneFace(), M.fdPhoneFaceM || (M.fdPhoneFaceM = new THREE.MeshBasicMaterial({ map: tex().phone, color: new THREE.Color(1.15, 1.15, 1.15) })), 2, {}],
    fdCoffee: (M) => [FG.coffee(), VCm(M, 'fdCoffeeM', 0.3, { roughness: 0.6 }), 2, {}],
    fdCart: (M) => [FG.cart(), VCm(M, 'fdCartM', 0.25, { roughness: 0.3, metalness: 0.6 }), 2, {}],
    fdScaleBase: (M) => [FG.scaleBase(), VCm(M, 'fdScaleM', 0.3, { roughness: 0.25, metalness: 0.8 }), 2, {}],
    fdScaleBeam: (M) => [FG.scaleBeam(), VCm(M, 'fdScaleM', 0.3, { roughness: 0.25, metalness: 0.8 }), 2, {}],
    fdMatch: (M) => [FG.match(), VCm(M, 'fdMatchM', 0.3, { roughness: 0.7 }), 2, {}],
    fdFlame: (M) => [new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), M.fdFlameM || (M.fdFlameM = flameMaterial()), 700, { aK: 1, aSeed: 1 }],
    fdMug: (M) => [FG.mug(), VCm(M, 'fdMugM', 0.35, { roughness: 0.25 }), 2, {}],
    fdMugBand: (M) => [FG.mugBand(), M.fdMugBandM || (M.fdMugBandM = new THREE.MeshStandardMaterial({ map: tex().mug, roughness: 0.3, emissive: 0xffffff, emissiveMap: tex().mug, emissiveIntensity: 0.4, side: THREE.DoubleSide })), 2, {}],
    fdGrill: (M) => [FG.grill(), VCm(M, 'fdGrillM', 0.15, { roughness: 0.4, metalness: 0.5 }), 2, {}],
    fdPodium: (M) => [FG.podium(), VCm(M, 'fdPodiumM', 0.35, { roughness: 0.3, metalness: 0.5 }), 2, {}],
    fdAppleTree: (M) => [FG.appleTree(), VCm(M, 'fdAppleTreeM', 0.2, { roughness: 0.8 }), 2, {}],
    fdApple: (M) => [FG.apple(false), VCm(M, 'fdAppleM', 0.5, { roughness: 0.3 }), 60, {}],
    fdRotten: (M) => [FG.apple(true), VCm(M, 'fdRottenM', 0.25, { roughness: 0.8 }), 2, {}],
    fdXmasTree: (M) => [FG.xmasTree(), VCm(M, 'fdXmasM', 0.25, { roughness: 0.8 }), 2, {}],
    fdTrophy: (M) => [FG.trophy(), VCm(M, 'fdTrophyM', 0.45, { roughness: 0.2, metalness: 0.8 }), 2, {}],
    fdHelix: (M) => [FG.helix(), VCm(M, 'fdHelixM', 0.9, { roughness: 0.3 }), 2, {}],
    fdTurkey: (M) => [FG.turkey(), VCm(M, 'fdTurkeyM', 0.3, { roughness: 0.5 }), 2, {}],
    fdGift: (M) => [FG.gift(), VCm(M, 'fdGiftM', 0.35, { roughness: 0.5 }), 2, {}],
    fdCard: (M) => [FG.cardFace(), paper(M, 'fdCardM', tex().card, 0.8), 2, {}],
    fdTable: (M) => [FG.table(), VCm(M, 'fdTableM', 0.18, { roughness: 0.6 }), 4, {}],
    fdGhost: (M) => [FG.ghost(), M.fdGhostM || (M.fdGhostM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.95, 1).multiplyScalar(1.4), transparent: true, opacity: 0.75 })), 2, {}],
    fdChafing: (M) => [FG.chafing(), VCm(M, 'fdChafingM', 0.3, { roughness: 0.2, metalness: 0.8 }), 8, {}],
    fdSwingFrame: (M) => [FG.swingFrame(), VCm(M, 'fdSwingM', 0.25, { roughness: 0.5 }), 2, {}],
    fdSwing: (M) => [FG.swing(), VCm(M, 'fdSwingSeatM', 0.2, { roughness: 0.5 }), 4, {}],
    fdLetters: (M) => [FG.letters(), VCm(M, 'fdLettersM', 0.5, { roughness: 0.5 }), 2, {}],
    fdPlatter: (M) => [FG.platter(), VCm(M, 'fdPlatterM', 0.25, { roughness: 0.3, metalness: 0.4 }), 2, {}],
    fdCloche: (M) => [FG.cloche(), VCm(M, 'fdClocheM', 0.35, { roughness: 0.1, metalness: 0.9 }), 2, {}],
    fdIce: (M) => [FG.iceBlock(), M.fdIceM || (M.fdIceM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x6ac8ff, emissiveIntensity: 0.8 })), 2, {}],
    fdAisle: (M) => [box(26, 7, 1, 0, 0, -0.8), M.fdAisleM || (M.fdAisleM = new THREE.MeshStandardMaterial({ color: 0x1a4a8a, roughness: 0.5, emissive: 0x0a1a3a })), 2, {}],
    fdAisleFace: (M) => [new THREE.PlaneGeometry(25, 6.2), M.fdAisleFaceM || (M.fdAisleFaceM = new THREE.MeshBasicMaterial({ map: tex().aisle, color: new THREE.Color(1.1, 1.1, 1.1), side: THREE.DoubleSide })), 2, {}],
    fdSignBoard: (M) => [FG.signBoard(), VCm(M, 'fdSignM', 0.3, { roughness: 0.5 }), 16, {}],
    fdSignFace: (M) => [signFace(23.4, 7.8, 0, 0, 0.05), M.sign, 16, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // the set-pieces standing by the road
    fdProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['fdPhone', 'fdPhoneFace', 'fdCoffee', 'fdCart', 'fdScaleBase', 'fdScaleBeam', 'fdMatch', 'fdFlame', 'fdMug', 'fdMugBand', 'fdGrill', 'fdPodium', 'fdAppleTree', 'fdApple', 'fdRotten', 'fdXmasTree', 'fdTrophy', 'fdHelix', 'fdTurkey', 'fdGift', 'fdCard', 'fdTable', 'fdGhost', 'fdChafing', 'fdSwingFrame', 'fdSwing', 'fdLetters', 'fdPlatter', 'fdCloche', 'fdIce']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind, base = (it.h ?? 0) + (it.y ?? 0);
      const at = S._pv || (S._pv = new THREE.Vector3()); at.set(p.x, base, p.z);
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (y, size, c, k2, z = 6) => { const w = local(at, yaw, 0, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.6, c = WARM) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, 40 * s, c, k2);
      const fire = (x, y, z, w, h, k2, seed) => { const fw = local(at, yaw, x * s, y * s, z * s, S._o); m.makeScale(w * s, h * s, 1); m.setPosition(fw.x, fw.y, fw.z); L.fdFlame.add(m, { aK: k2, aSeed: seed }); };
      if (k === 'phone') { put('fdPhone'); put('fdPhoneFace'); const burn = smooth(it.burn ?? 1e9, (it.burn ?? 1e9) + 0.8, T); light(14, 40, burn > 0 ? FLAMEC : [0.5, 0.6, 1], 0.3 + 0.5 * burn); if (burn > 0) for (let j = 0; j < 5; j++) fire(-5 + j * 2.5, 26 + Math.sin(j) * 2, 0.6, 5, 10 * burn, burn, j * 1.7); spot(0.5, [0.6, 0.7, 1]); }
      else if (k === 'coffee') { put('fdCoffee'); for (const x of [-3, 3]) for (let j = 0; j < 4; j++) { const f = ((T * 0.4 + j / 4 + x * 0.1) % 1); const w = local(at, yaw, (x + Math.sin(T + j) * 0.8) * s, (16.5 + f * 8) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, (1.4 + f * 2) * s, [1, 0.97, 0.92], 0.5 * (1 - f)); } light(14, 30, WARM, 0.35); spot(); }
      else if (k === 'cart') { put('fdCart'); light(9, 28, [0.9, 0.95, 1], 0.3); spot(); }
      else if (k === 'scales') {
        put('fdScaleBase'); const lev = smooth(it.level ?? 1e9, (it.level ?? 1e9) + 1.5, T), tilt = 0.35 * (1 - lev) * (0.85 + 0.15 * Math.sin(T * 2));
        S._e.set(0, yaw, tilt); const bq = (S._bq || (S._bq = new THREE.Quaternion())).setFromEuler(S._e); put('fdScaleBeam', 0, 23, 0, bq);
        light(20, 36, [1, 0.9, 0.6], 0.3 + 0.4 * lev); spot();
      }
      else if (k === 'match') {
        S._e.set(0, yaw, 0.25); const mq = (S._mq || (S._mq = new THREE.Quaternion())).setFromEuler(S._e); put('fdMatch', 0, 0, 0, mq);
        const lit = smooth(it.strike ?? 1e9, (it.strike ?? 1e9) + 0.15, T), flare = Math.exp(-Math.max(0, T - (it.strike ?? 1e9)) * 3);
        if (lit > 0) { const head = local(at, yaw, -Math.sin(0.25) * 35 * s, Math.cos(0.25) * 35 * s, 0, S._o); m.makeScale((8 + 10 * flare) * s, (14 + 12 * flare) * s, 1); m.setPosition(head.x, head.y - 1 * s, head.z); L.fdFlame.add(m, { aK: lit * (1 + flare), aSeed: 3 }); glowAt(S, head.x, head.y + 4 * s, head.z, (30 + 40 * flare) * s, FLAMEC, lit * (0.8 + 1.4 * flare)); poolAt(S, at.x, 0.2, at.z, 60 * s, FLAMEC, 0.6 * lit); }
      }
      else if (k === 'mug') { put('fdMug'); put('fdMugBand'); for (let j = 0; j < 4; j++) { const f = ((T * 0.35 + j / 4) % 1); const w = local(at, yaw, Math.sin(T + j) * 2 * s, (19 + f * 10) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, (3 + f * 4) * s, [1, 0.97, 0.92], 0.45 * (1 - f)); } light(10, 34, WARM, 0.35); spot(); }
      else if (k === 'grill') { put('fdGrill'); for (let j = 0; j < 6; j++) { const f = ((T * 0.5 + j / 6) % 1); const w = local(at, yaw, (Math.sin(T * 1.3 + j) * 2 + f * 4) * s, (14 + f * 22) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, (4 + f * 8) * s, [0.8, 0.8, 0.82], 0.35 * (1 - f)); } for (let j = 0; j < 4; j++) fire(-2.4 + j * 1.6, 12.2, 0, 2.4, 3.6, 0.9, j); light(13, 30, FLAMEC, 0.5); spot(0.6, FLAMEC); }
      else if (k === 'podium') { put('fdPodium'); light(20, 40, [1, 0.85, 0.4], 0.45); spot(0.7, [1, 0.9, 0.6]); }
      else if (k === 'appletree') {
        put('fdAppleTree'); const R = seeded(19);
        for (let j = 0; j < 18; j++) { const w = local(at, yaw, (R() - 0.5) * 22 * s, (17 + R() * 10) * s, (R() - 0.5) * 18 * s + 4 * s, S._o); m.compose(w, q, S._s.set(1.2 * s, 1.2 * s, 1.2 * s)); L.fdApple.add(m); }
        const sw = Math.sin(T * 1.6) * 0.15; S._e.set(0, yaw, sw); const rq = (S._rq || (S._rq = new THREE.Quaternion())).setFromEuler(S._e);
        put('fdRotten', 8, 17.5, 3, rq, s * 2.6); light(18, 44, [1, 0.9, 0.7], 0.3); spot();
      }
      else if (k === 'xmas') { put('fdXmasTree'); const off = it.click && T > it.click && T < it.click + 0.45; const R = seeded(21); for (let j = 0; j < 40; j++) { const lv = R(), y = (8 + lv * 40) * s, r = (14 - lv * 11) * s * (0.9 + R() * 0.1), a = R() * 6.28 + T * 0.1; const w = local(at, yaw, Math.cos(a) * r, y, Math.sin(a) * r, S._o); glowAt(S, w.x, w.y, w.z, 2.2 * s, BULBS[j % BULBS.length], off ? 0.05 : 1.1 + 0.4 * Math.sin(T * 4 + j)); } const st = local(at, yaw, 0, 50 * s, 0, S._o); glowAt(S, st.x, st.y, st.z, 14 * s, [1, 0.9, 0.4], off ? 0.1 : 1.3); spot(off ? 0.1 : 0.6, [1, 0.8, 0.6]); }
      else if (k === 'trophy') { put('fdTrophy'); for (let j = 0; j < 6; j++) { const a = T * 1.5 + j; if (Math.sin(T * 6 + j * 2) > 0.5) { const w = local(at, yaw, Math.cos(a) * 9 * s, (20 + Math.sin(a * 1.3) * 8) * s, Math.sin(a) * 9 * s, S._o); glowAt(S, w.x, w.y, w.z, 2.4 * s, [1, 0.9, 0.5], 1.4); } } light(22, 44, [1, 0.85, 0.4], 0.5); spot(0.8, [1, 0.9, 0.6]); }
      else if (k === 'helix') { S._e.set(0, yaw + T * 0.6, 0); const hq = (S._hq || (S._hq = new THREE.Quaternion())).setFromEuler(S._e); put('fdHelix', 0, 0, 0, hq); light(33, 70, [0.9, 0.6, 1], 0.25); spot(0.4, [0.8, 0.6, 1]); }
      else if (k === 'turkey') { put('fdTurkey'); for (let j = 0; j < 5; j++) { const f = ((T * 0.4 + j / 5) % 1); const w = local(at, yaw, Math.sin(T + j) * 3 * s, (17 + f * 10) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, (2.4 + f * 3) * s, [1, 0.95, 0.9], 0.4 * (1 - f)); } light(14, 36, [1, 0.8, 0.5], 0.4); spot(); }
      else if (k === 'gift') { put('fdGift'); put('fdCard'); light(12, 30, [0.8, 0.85, 1], 0.35); spot(); }
      else if (k === 'table') {
        put('fdTable'); const ghost = local(at, yaw, 5 * s, 0, 9 * s, S._o); m.compose(ghost, q, S._s.set(s, s, s)); L.fdGhost.add(m);
        glowAt(S, ghost.x, ghost.y + 8 * s, ghost.z, 18 * s, [0.85, 0.92, 1], 0.6 + 0.2 * Math.sin(T * 3));
        if (it.hell) { for (let j = 0; j < 5; j++) { const x = -20 + j * 10; put('fdChafing', x, 0, 0); fire(x - 2.5, 8.6, 0, 5, 9, 1.2, j); fire(x + 2.5, 8.6, 0, 5, 11, 1.2, j + 0.5); } light(14, 70, FLAMEC, 0.35); }
        for (const x of [-20, 0, 20]) { const w = local(at, yaw, x * s, 14 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, WARM, 1.1 + 0.15 * Math.sin(T * 9 + x)); }
        spot(0.6);
      }
      else if (k === 'swing') { put('fdSwingFrame'); for (const x of [-5, 5]) { S._e.set(Math.sin(T * 1.8 + x) * 0.5, yaw, 0); const sq = (S._sq || (S._sq = new THREE.Quaternion())).setFromEuler(S._e); put('fdSwing', x, 16, 0, sq); } light(12, 30, [0.7, 0.75, 0.9], 0.2); }
      else if (k === 'letters') { put('fdLetters'); const on = smooth(it.on ?? -1e9, (it.on ?? -1e9) + 0.3, T); for (let j = 0; j < 9; j++) { const w = local(at, yaw, (-24 + j * 6.4) * s, -2 * s, 3 * s, S._o); glowAt(S, w.x, w.y + 6 * s, w.z, 10 * s, [1, 0.95, 0.85], 0.2 + 0.8 * on); } }
      else if (k === 'cold') {
        put('fdPlatter'); put('fdIce'); const lift = smooth(it.lift ?? 1e9, (it.lift ?? 1e9) + 0.8, T);
        S._e.set(0, yaw, -1.0 * lift); const cq = (S._cq || (S._cq = new THREE.Quaternion())).setFromEuler(S._e); put('fdCloche', 8 * lift, 10.4 + 10 * lift, 0, cq);
        light(14, 40, [0.6, 0.85, 1], 0.2 + 0.7 * lift); for (let j = 0; j < 8; j++) { const f = ((T * 0.3 + j / 8) % 1); const w = local(at, yaw, (Math.sin(j * 2) * 5 + f * 2) * s, (14 + f * 6) * s, Math.cos(j * 3) * 4 * s, S._o); glowAt(S, w.x, w.y, w.z, (3 + f * 4) * s, [0.85, 0.95, 1], 0.4 * lift * (1 - f)); } spot(0.5, [0.7, 0.9, 1]);
      }
    },
    // the aisle sign hung over the floor
    fdAisle(S, it, p) {
      const L = S.layers; L.fdAisle; L.fdAisleFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, sm = S.course.sample(it.t); S._e.set(0, sm.yaw + Math.PI, Math.sin(T * 1.3 + it.t) * 0.03); const fq = (S._afq || (S._afq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.lift ?? 13); const m = S._m; m.compose(p, fq, S._s.set(0.8, 0.8, 0.8)); L.fdAisle.add(m); L.fdAisleFace.add(m); glowAt(S, p.x, p.y, p.z, 26, [0.6, 0.8, 1], 0.2);
    },
    // a fire along the road: flames on the hedges both sides, rising when it catches
    fdFire(S, it, p, q, yaw) {
      const L = S.layers; L.fdFlame;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, on = smooth(it.on, it.on + 0.6, T) * (1 - smooth(it.off ?? 1e9, (it.off ?? 1e9) + 1.5, T)); if (on <= 0) return;
      for (let j = 0; j < 4; j++) { const w = local(p, yaw, (hash(it.seed * 9 + j) - 0.5) * 16, 0, (j - 1.5) * 6, S._o); const h = (14 + 18 * hash(it.seed + j)) * on; m.makeScale(h * 0.75, h, 1); m.setPosition(w.x, 0, w.z); L.fdFlame.add(m, { aK: on, aSeed: it.seed * 10 + j }); }
      glowAt(S, p.x, 8, p.z, 34, FLAMEC, 0.18 * on); poolAt(S, p.x, 0.2, p.z, 46, FLAMEC, 0.35 * on);
    },
    // sprinklers on the lawns, arcs of water catching the light
    fdSprinkler(S, it, p, q, yaw) {
      if (!S.track) return;
      const T = S.tNow ?? 0, sweep = Math.sin(T * 1.1 + it.seed * 6) * 0.9;
      for (let j = 0; j < 14; j++) { const u = j / 13, r = u * 22, h = 4 * 9 * u * (1 - u) + 0.5; const w = local(p, yaw + sweep, -Math.sign(it.x) * r * 0.6, h, r * 0.8, S._o); glowAt(S, w.x, w.y, w.z, 1.4, [0.8, 0.9, 1], 0.6 * (0.6 + 0.4 * Math.sin(T * 8 + j))); }
    },
    // strings of Christmas bulbs along the eaves of the houses
    fdLights(S, it, p, q, yaw) {
      if (!S.track) return;
      const T = S.tNow ?? 0, off = it.click && T > it.click && T < it.click + 0.45;
      for (let j = 0; j < 10; j++) { const w = local(p, yaw, 0, 6.2 + Math.sin(j * 0.6) * 0.4, (j - 4.5) * 2.2, S._o); glowAt(S, w.x, w.y, w.z, 1.5, BULBS[(j + Math.floor(it.seed * 7)) % BULBS.length], off ? 0.03 : 1.2 + 0.4 * Math.sin(T * 3 + j)); }
    },
    // his lines on the marquee board, hung over the road
    fdSign(S, it, p) {
      const T = S.tNow ?? 0, h = S.course.sample(it.t).yaw; S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._fsq || (S._fsq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = S.course.sample(it.t).y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.fdSignBoard.add(m); S.layers.fdSignFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      const w = S._o; for (const sd of [-1, 1]) { local(p, h + Math.PI, sd * 8 * s, 5.4 * s, 1.0 * s, w); glowAt(S, w.x, w.y, w.z, 4 * s, WARM, 1.1); }
      glowAt(S, p.x, p.y, p.z, 30 * s, WARM, 0.14);
    },
  },
  kits: {
    fdProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, burn: c.burn, level: c.level, strike: c.strike, click: c.click, on: c.on, lift: c.lift, hell: c.hell, h: 0, parts: 'fdProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    fdFire(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.3) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.1, x: side * ((z.x ?? 22) + R() * 14), rot: 0, on: z.on ?? z.from, off: z.off, seed: R(), h: 0, parts: 'fdFire', ahead: z.ahead ?? 30 }); },
    fdSprinklers(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) { const side = R() < 0.5 ? -1 : 1; S.items.push({ t: t + R() * 0.2, x: side * (14 + R() * 4), rot: SIDE(side), seed: R(), h: 0, parts: 'fdSprinkler', ahead: 24 }); } },
    fdAisle(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, h: 0, lift: z.lift, parts: 'fdAisle', ahead: 30 }); },
    fdLights(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.25) for (const side of [-1, 1]) S.items.push({ t: t + R() * 0.05, x: side * (z.x ?? 16), rot: 0, seed: R(), click: z.click, h: 0, parts: 'fdLights', ahead: 26 }); },
  },
});

// ---------- the supermarket ----------
const flatRing = (W = 40, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const MARKET = {
  rings: { flat: flatRing },
  ringOf: () => 'flat',
  styles: { market: 0 },
  dims: { market: [40, 26] },
  lights: (id) => ({ 0: [8, 4] }[id] || null),
};
function marketMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float wa = part == 6 ? x * 1.3 + 9.0 : (side > 0.0 ? along + 11.0 : along);
        vec3 glow = vec3(0.0); vec3 col;
        float notCap = part == 6 ? 0.0 : 1.0;
        if (part == 7) {
          // the store from the car park: the long glass front lit white, a red band, the doors
          col = vec3(0.75, 0.74, 0.72);
          float glass = step(2.0, h) * step(h, 16.0) * step(0.08, fract(x / 6.0));
          col = mix(col, vec3(0.1, 0.12, 0.14), glass); glow += vec3(0.9, 0.95, 1.0) * glass * 0.8;
          col = mix(col, vec3(0.8, 0.1, 0.1), step(abs(h - 20.0), 2.5)); glow += vec3(1.0, 0.2, 0.15) * step(abs(h - 20.0), 2.5) * 0.3;
          col *= 0.6;
        }
        else if (part == 8) { col = vec3(0.6, 0.6, 0.62); glow += vec3(0.6) * 0.1; }
        else if (part == 0) { vec2 q = vec2(x, along) / 2.0; col = mix(vec3(0.88, 0.88, 0.86), vec3(0.7, 0.72, 0.74), mod(floor(q.x) + floor(q.y), 2.0)) * (0.9 + 0.1 * edge(fract(q), 0.04)); col += vec3(0.25) * smoothstep(0.92, 1.0, sin(along * 0.79) * 0.5 + 0.5) * step(abs(x), 14.0); }
        else if (part == 3) { col = vec3(0.7, 0.7, 0.7); vec2 q = fract(vec2(x / 4.0, along / 2.0)); col *= 0.85 + 0.15 * edge(q, 0.04); float tube = step(abs(abs(x) - 12.0), 0.5) * step(abs(mod(along, 8.0) - 4.0), 3.0); glow += vec3(0.95, 1.0, 1.0) * tube * 1.6; }
        else {
          // the freezers: glass doors, frost, the boxes lit up inside; a white band over them
          col = vec3(0.82, 0.84, 0.86);
          float door = step(1.0, h) * step(h, 15.0) * notCap; vec2 dq = vec2(mod(wa, 4.0) / 4.0, (h - 1.0) / 14.0);
          float frame = 1.0 - edge(dq, 0.05);
          vec2 bq = vec2(wa / 1.3, floor((h - 1.0) / 2.8)); float shelf = step(0.88, fract((h - 1.0) / 2.8));
          float id = h2(floor(bq)); vec3 pk = id < 0.3 ? vec3(0.2, 0.5, 0.9) : id < 0.55 ? vec3(0.9, 0.3, 0.2) : id < 0.8 ? vec3(0.95, 0.85, 0.3) : vec3(0.3, 0.75, 0.4);
          float boxk = step(0.12, fract(bq.x)) * step(fract((h - 1.0) / 2.8), 0.75);
          vec3 inside = mix(vec3(0.65, 0.85, 1.0) * 0.5, pk * 0.8, boxk) * (1.0 - shelf * 0.5);
          float frost = smoothstep(0.55, 1.0, h2(floor(vec2(wa * 3.0, h * 3.0))) * 0.5 + 0.5 * (1.0 - dq.y)) * 0.35;
          col = mix(col, mix(inside, vec3(0.85, 0.92, 1.0), frost), door * (1.0 - frame));
          col = mix(col, vec3(0.75, 0.78, 0.8), door * frame);
          glow += vec3(0.6, 0.85, 1.0) * door * (1.0 - frame) * 0.45;
          col = mix(col, vec3(0.2, 0.4, 0.8), step(abs(h - 18.5), 1.5) * notCap);
        }
        col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the family's house, dressed for every holiday at once ----------
export class HouseFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -40;
    this.group = new THREE.Group(); scene.add(this.group);
    const s = cfg.s ?? 3;
    const parts = [];
    parts.push(paint(box(24, 12, 16, 0, 6, 0), rgb(0xe8dcc8)));
    const roof = new THREE.CylinderGeometry(0.1, 15, 9, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1.15, 1, 0.82); roof.translate(0, 16.5, 0); parts.push(paint(roof, rgb(0x5a2a24)));
    parts.push(paint(box(4, 7, 0.4, 0, 3.5, 8.1), rgb(0x8a2a1e)));
    for (const x of [-7.5, 7.5]) { parts.push(paint(box(4, 4, 0.3, x, 7, 8.1), rgb(0xffd890))); parts.push(paint(box(4.4, 0.4, 0.4, x, 9.2, 8.2), WHITE)); }
    parts.push(paint(box(26, 0.6, 4, 0, 0.3, 10), rgb(0x8a8a8a)));
    // pumpkins on the steps, a wreath, a flag, the father's day banner, the Christmas tree in the window
    for (const x of [-7.5, 7.5]) parts.push(paint(box(4.8, 0.4, 1.2, x, 4.8, 8.5), WHITE));
    for (const [x, y, z] of [[-8.7, 5.8, 8.7], [-6.5, 5.8, 8.7], [6.5, 5.8, 8.7], [8.7, 5.8, 8.7], [-3.2, 0.9, 10.6], [3.2, 0.9, 10.6]]) { parts.push(paint(sph(0.9, 1.2, 0.85, 1.2, x, y, z, 12, 8), rgb(0xff9a2a))); parts.push(paint(cyl(0.12, 0.15, 0.5, 6, x, y + 0.95, z), rgb(0x3a6a1a))); }
    parts.push(paint(new THREE.TorusGeometry(1.2, 0.35, 8, 16).translate(0, 5.6, 8.4), rgb(0x2a6a2a)));
    parts.push(paint(box(0.2, 8, 0.2, 11, 10, 8.4).rotateZ(0.5).translate(0, 0, 0), rgb(0x8a8e98))); parts.push(paint(box(4, 2.4, 0.1, 12.4, 13, 8.6), rgb(0xd83a3a)));
    parts.push(paint(box(14, 2, 0.2, 0, 10.6, 8.5), rgb(0x2a4aa8)));
    this.house = new THREE.Mesh(merge(parts), selfLit({ roughness: 0.7 }, 0.12)); this.group.add(this.house);
    const bt = canvasTex(1024, 146, (g, W, H) => { g.fillStyle = '#2a4aa8'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f2ee'; g.font = `900 78px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("HAPPY FATHER'S DAY", W / 2, H / 2 + 5); });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(14, 2), new THREE.MeshBasicMaterial({ map: bt, color: new THREE.Color(0.85, 0.85, 0.85) })); banner.position.set(0, 10.6, 8.62); this.group.add(banner);
    this.group.scale.setScalar(s);
    this.bulbs = []; for (let k = 0; k < 30; k++) { const u = k / 29; this.bulbs.push([-13 + u * 26, 12.2 + Math.sin(u * Math.PI * 6) * 0.3, 8.6, BULBS[k % BULBS.length]]); }
    for (let k = 0; k < 14; k++) { const u = k / 13; this.bulbs.push([(-14 + u * 28) * 0.98, 12.4 + 8.2 * (1 - Math.abs(u - 0.5) * 2), 7.4, BULBS[(k + 2) % BULBS.length]]); }
    this.fired = false; this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 3;
    for (const [x, y, z, c] of this.bulbs) { this._w.set(x, y, z).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 1.4 * s, c, 1.2 + 0.3 * Math.sin(songT * 3 + x)); }
    for (const x of [-7.5, 7.5]) { this._w.set(x, 7, 9).applyMatrix4(this.group.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 5 * s, [1, 0.85, 0.55], 0.8); }
    this._w.set(0, 0, 12).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, 0.2, this._w.z, 30 * s, [1, 0.8, 0.55], 0.5);
  }
}

// ---------- the place, per frame ----------
export class FamilyWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = marketMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, MARKET));
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, t = S.rider.t;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const M = S.town.mats; if (M.fdFlameM) M.fdFlameM.uniforms.uTime.value = time;
  }
  // the fluorescent tubes in the market's ceiling
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); for (const x of [-12, 12]) { this.S.track.ground(f.t, x, g); T.glow(g.x, fy + r.H - 0.8, g.z, 5, [0.92, 0.97, 1], 0.7); } this.S.track.ground(f.t, 0, g); T.pool(g.x, fy + 0.08, g.z, 26, [0.9, 0.95, 1], 0.22); }
    }
  }
}
