// Ground overlays laid over the baked floor (drawn under the telegraphs, never mirrored):
//  soak   gasoline: the felt goes dark and glossy with a thin-film rainbow sheen, a white dashed outline at its edge
//         (the dormant telegraph: drawn, not filling yet)
//  char   scorched felt: black char, a crack mask glowing orange from inside, pulsing on the beat
//  snow   the cream snow sheet (never cyan-white, so WHITE telegraphs stay unmistakable), mica glitter
//  frost  a ring of frost (the cloche)
// Each is one quad over a rectangle with a few uniforms the set drives from song time.
import * as THREE from 'three';
import { LAYER } from '../../game/arena.js';

const VS = /* glsl */`
varying vec2 vP; varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vP = position.xy; gl_Position = projectionMatrix * viewMatrix * w; }`;
const NOISE = /* glsl */`
float h2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.28 + vn(p * 4.1 + 3.3) * 0.17; }
vec2 vor(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(h2(i + g), h2(i + g + 17.0)); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(d1, d2); }
`;
const FS_SOAK = /* glsl */`
uniform vec2 uHalf; uniform float uK, uDash, uTime, uLight, uFill;
varying vec2 vP; varying vec3 vW;
${NOISE}
void main() {
  // distance to the rectangle's edge (inside > 0)
  vec2 q = uHalf - abs(vP);
  float inside = min(q.x, q.y);
  if (inside < -0.05) discard;
  // a ragged wet edge spreading from the middle as it soaks in
  float rag = (fbm(vW.xz * 1.7) - 0.5) * 0.45;
  float wet = smoothstep(0.0, 0.25, inside + rag + (uK - 1.0) * 2.5) * uK;
  // thin-film sheen: bands of hue that drift with the view
  vec3 V = normalize(cameraPosition - vW);
  float film = fbm(vW.xz * 0.6 + uTime * 0.03) * 6.0 + V.x * 2.0 + V.z * 1.5;
  vec3 rainbow = 0.5 + 0.5 * cos(6.2832 * (film + vec3(0.0, 0.33, 0.67)));
  float sheenMask = smoothstep(0.55, 0.85, fbm(vW.xz * 0.9 + 3.0)) * 0.6 + 0.12;
  vec3 col = rainbow * sheenMask * 0.10 * uLight;
  float a = wet * 0.62;
  // the dashed outline, 6 cm, dashes 0.4 m
  float edge = 1.0 - smoothstep(0.0, 0.06, abs(inside - 0.06));
  float along = abs(q.x) < abs(q.y) ? vW.z : vW.x;
  float dash = step(0.5, fract(along / 0.4 + uTime * 0.0));
  float line = edge * dash * uDash;
  col += vec3(1.25, 1.55, 1.9) * line * 0.9;
  a = max(a, line * 0.85);
  // the fill (white, rising from the far edge toward the near one as the impact nears) is the telegraph's;
  // here only a faint glisten that brightens with it
  col += vec3(0.9, 1.0, 1.2) * wet * uFill * 0.05;
  gl_FragColor = vec4(col, a);
}`;
const FS_CHAR = /* glsl */`
uniform vec2 uHalf; uniform float uK, uGlow, uPulse, uTime, uLight;
varying vec2 vP; varying vec3 vW;
${NOISE}
void main() {
  vec2 q = uHalf - abs(vP);
  float inside = min(q.x, q.y);
  if (inside < 0.0) discard;
  float edgeFade = smoothstep(0.0, 0.18, inside + (fbm(vW.xz * 2.2) - 0.5) * 0.3);
  vec2 v = vor(vW.xz * 1.6);
  float crack = 1.0 - smoothstep(0.0, 0.06, v.y - v.x);
  float soot = fbm(vW.xz * 3.0);
  vec3 col = mix(vec3(0.018, 0.012, 0.012), vec3(0.06, 0.035, 0.03), soot) * uLight;
  float ember = crack * (0.55 + 0.45 * sin(uTime * 2.0 + v.x * 20.0)) * (0.6 + 0.6 * uPulse);
  col += vec3(1.0, 0.28, 0.05) * ember * uGlow * 1.6;
  gl_FragColor = vec4(col, uK * edgeFade * 0.94);
}`;
const FS_SNOW = /* glsl */`
uniform vec2 uHalf; uniform float uK, uTime, uLight; uniform vec3 uTint;
varying vec2 vP; varying vec3 vW;
${NOISE}
void main() {
  vec2 q = uHalf - abs(vP);
  float inside = min(q.x, q.y);
  if (inside < 0.0) discard;
  float drift = fbm(vW.xz * 0.8);
  float a = smoothstep(0.0, 0.35, inside + (drift - 0.5) * 0.5) * uK;
  vec3 col = vec3(0.96, 0.925, 0.86) * (0.78 + 0.22 * drift) * uTint * uLight;
  // mica glitter: sparse cells that catch the light as you move
  vec2 cell = floor(vW.xz * 22.0);
  float g = h2(cell); vec3 V = normalize(cameraPosition - vW);
  float glint = step(0.985, g) * pow(max(0.0, sin(dot(V, vec3(g * 40.0, 1.0, g * 17.0)) * 6.0)), 8.0);
  col += vec3(1.4, 1.3, 1.1) * glint * uLight;
  gl_FragColor = vec4(col * a, a);
}`;
const FS_FROST = /* glsl */`
uniform float uK, uR, uTime; varying vec2 vP; varying vec3 vW;
${NOISE}
void main() {
  float d = length(vP);
  float ring = smoothstep(uR - 0.7, uR - 0.1, d) * (1.0 - smoothstep(uR, uR + 0.25 + fbm(vW.xz * 3.0) * 0.4, d));
  float a = ring * uK * (0.55 + 0.45 * fbm(vW.xz * 6.0));
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * 0.8, a * 0.7);
}`;

function quad(scene, x0, z0, x1, z1, fs, uniforms, y = 0.012, blend = 'normal') {
  const w = x1 - x0, d = z1 - z0;
  const geo = new THREE.PlaneGeometry(w + 0.2, d + 0.2);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: { uHalf: { value: new THREE.Vector2(w / 2, d / 2) }, ...uniforms },
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    blending: blend === 'premul' ? THREE.CustomBlending : THREE.NormalBlending,
    ...(blend === 'premul' ? { blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor } : {}) });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.renderOrder = 1; m.frustumCulled = false;
  m.layers.set(LAYER.NO_REFLECT);
  scene.add(m);
  return m;
}

export function soak(scene, r, y) {
  const u = { uK: { value: 0 }, uDash: { value: 0 }, uTime: { value: 0 }, uLight: { value: 1 }, uFill: { value: 0 } };
  const m = quad(scene, r[0], r[1], r[2], r[3], FS_SOAK, u, y);
  return { m, u, set(k, dash) { u.uK.value = k; u.uDash.value = dash; m.visible = k > 0.001 || dash > 0.001; } };
}
export function char(scene, r, y) {
  const u = { uK: { value: 0 }, uGlow: { value: 1 }, uPulse: { value: 0 }, uTime: { value: 0 }, uLight: { value: 1 } };
  const m = quad(scene, r[0], r[1], r[2], r[3], FS_CHAR, u, y);
  return { m, u, set(k, glow) { u.uK.value = k; u.uGlow.value = glow; m.visible = k > 0.001; } };
}
export function snow(scene, r, y) {
  const u = { uK: { value: 0 }, uTime: { value: 0 }, uLight: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } };
  const m = quad(scene, r[0], r[1], r[2], r[3], FS_SNOW, u, y, 'premul');
  m.renderOrder = 1.2;   // always over the scorched felt under it, whatever the camera's distance sort says
  return { m, u, set(k) { u.uK.value = k; m.visible = k > 0.001; } };
}
export function frost(scene, x, z, R) {
  const u = { uK: { value: 0 }, uR: { value: R }, uTime: { value: 0 } };
  const m = quad(scene, x - R - 0.6, z - R - 0.6, x + R + 0.6, z + R + 0.6, FS_FROST, u, 0.016, 'premul');
  return { m, u, set(k) { u.uK.value = k; m.visible = k > 0.001; } };
}

// a dashed ring on the floor (a drip spot: the dormant telegraph under a hanging present)
const FS_DASH = /* glsl */`
uniform float uK, uR; varying vec2 vP; varying vec3 vW;
void main() {
  float d = length(vP);
  float line = 1.0 - smoothstep(0.0, 0.035, abs(d - uR + 0.05));
  float ang = atan(vP.y, vP.x);
  float dash = step(0.5, fract(ang * uR / 0.4));
  float a = line * dash * uK;
  float wet = (1.0 - smoothstep(uR * 0.2, uR, d)) * 0.35 * uK;
  if (a + wet < 0.01) discard;
  gl_FragColor = vec4(vec3(1.25, 1.55, 1.9) * a * 0.9, max(a * 0.85, wet));
}`;
export function dashRing(scene, R) {
  const u = { uK: { value: 0 }, uR: { value: R } };
  const geo = new THREE.PlaneGeometry(R * 2 + 0.3, R * 2 + 0.3);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS_DASH, uniforms: u, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.017; m.renderOrder = 1.3; m.frustumCulled = false; m.layers.set(LAYER.NO_REFLECT);   // over the snow sheet
  scene.add(m);
  return { m, u, set(k) { u.uK.value = k; m.visible = k > 0.001; } };
}
// a soft pool of light (or shadow) on the floor
const FS_POOL = /* glsl */`
uniform float uK; uniform vec3 uC; uniform float uDark; varying vec2 vP;
void main() { float d = length(vP); float a = (1.0 - smoothstep(0.0, 1.0, d)); a = a * a * uK; if (a < 0.003) discard;
  gl_FragColor = uDark > 0.5 ? vec4(uC * a, a) : vec4(uC * a, 0.0); }`;
export function pool(scene, x, z, R, color, dark = false) {
  const u = { uK: { value: 0 }, uC: { value: new THREE.Color(color) }, uDark: { value: dark ? 1 : 0 } };
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS_POOL, uniforms: u, transparent: true, depthWrite: false,
    blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending, premultipliedAlpha: !dark, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.scale.set(R, R, 1); m.position.set(x, 0.018, z); m.renderOrder = 1; m.frustumCulled = false; m.layers.set(LAYER.NO_REFLECT);
  scene.add(m);
  return { mesh: m, u, set(k) { u.uK.value = k; m.visible = k > 0.001; } };
}
