import * as THREE from 'three';

/**
 * Shock Value: a storm sealed in glass. Metres, +Y up, -Z forward, like the other boards.
 * Two bulbs of glass, each with a white-hot electrode, pink current crawling from them to the
 * glass and from one to the other under her feet; a chrome bezel, fuse caps at either end, and a
 * Jacob's ladder on the tail whose arc climbs it once a beat. The current is a shader on the
 * glass (no textures, no per-frame geometry); it brightens with the board's glow, which the game
 * already pulses with the beat and a hit. userData.tick(dt, state) keeps its time and the ladder.
 */
export const SHOCK_BOARDS = [
  { id: 'shock-value', name: 'Shock Value', subtitle: 'Plasma glass / mirror chrome', color: '#ff4bd1', accent: '#ff4bd1', trail: 'Forked current', description: 'A storm sealed in glass. Pink current crawls nose to tail, a ladder of sparks climbs the back, and forked lightning tears loose behind it.' }
];

function material(name, color, metalness = .5, roughness = .3, extra = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat: .42, clearcoatRoughness: .23, ...extra });
  m.name = name;
  return m;
}
function glow(name, color, intensity = 1.3) {
  return material(name, color, .25, .24, { emissive: color, emissiveIntensity: intensity, clearcoat: .7 });
}
function mesh(group, name, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const o = new THREE.Mesh(geometry, mat); o.name = name; o.position.set(...position); o.rotation.set(...rotation); group.add(o); return o;
}
function plate(g, name, shape, y, depth, m, bevel = .014) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel * .65, bevelSegments: 2, curveSegments: 6, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  return mesh(g, name, geo, m, [0, y, 0]);
}
function box(g, name, w, h, d, m, x = 0, y = 0, z = 0, ry = 0) { return mesh(g, name, new THREE.BoxGeometry(w, h, d), m, [x, y, z], [0, ry, 0]); }
function ringY(g, name, r, t, m, x, y, z, seg = 40) { return mesh(g, name, new THREE.TorusGeometry(r, t, 6, seg), m, [x, y, z], [-Math.PI / 2, 0, 0]); }
function discY(g, name, r, h, m, x, y, z, seg = 32) { return mesh(g, name, new THREE.CylinderGeometry(r, r, h, seg, 1), m, [x, y, z]); }
function tube(g, name, pts, r, m, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed);
  return mesh(g, name, new THREE.TubeGeometry(curve, Math.max(10, pts.length * 6), r, 6, closed), m);
}

// The outline: two bulbs and a waist, like a tube that holds lightning. Points down the right
// side, nose to tail; the left is its mirror. Sampled smooth as a closed loop.
const RIGHT = [[.17, -1.0], [.30, -.86], [.335, -.64], [.305, -.40], [.258, -.17], [.248, 0], [.258, .17], [.305, .40], [.335, .64], [.30, .86], [.17, 1.0]];
function outline(n = 150) {
  const pts = [[0, -1.06], ...RIGHT, [0, 1.06], ...RIGHT.slice().reverse().map(([x, z]) => [-x, z])];
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  return curve.getSpacedPoints(n).slice(0, n).map((v) => [v.x, v.z]);
}
// a THREE.Shape from (x, z) points; the shape's y is -z so that, laid flat, z runs nose to tail
function shapeOf(pts, sx = 1, sz = 1) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x * sx, -z * sz) : s.moveTo(x * sx, -z * sz)));
  s.closePath();
  return s;
}
function holeOf(pts, sx, sz) {
  const h = new THREE.Path();
  pts.forEach(([x, z], i) => (i ? h.lineTo(x * sx, -z * sz) : h.moveTo(x * sx, -z * sz)));
  h.closePath();
  return h;
}
// the part of the outline past a cut across it (a cap on the nose or the tail)
function capOf(pts, zCut, sign, sx, sz) {
  const n = pts.length, inside = (p) => sign * p[1] * sz > zCut;
  let start = 0;
  while (start < n && !(inside(pts[start]) && !inside(pts[(start - 1 + n) % n]))) start++;
  const out = [];
  for (let i = 0; i < n; i++) { const p = pts[(start + i) % n]; if (!inside(p)) break; out.push([p[0] * sx, p[1] * sz]); }
  return shapeOf(out);
}

// the current in the glass, worked out where it's drawn: a shader on a physical material, so the
// glass keeps its lighting and highlights and the storm is its glow
const PLASMA = /* glsl */`
varying vec3 vSvP;
uniform float uSvTime;
float svH(float n){ return fract(sin(n) * 43758.5453123); }
// smooth noise for the crawl, straight-line noise (a kink at every whole number) for the jags
float svN(float x){ float i = floor(x), f = fract(x); return mix(svH(i), svH(i + 1.0), f * f * (3.0 - 2.0 * f)); }
float svJ(float x){ float i = floor(x); return mix(svH(i), svH(i + 1.0), fract(x)); }
float svF(float d, float w){ return exp(-d * d / (w * w)); }
vec3 svPlasma(vec2 p, float t, float kick){
  vec3 hot = vec3(1.0, 0.9, 1.0), pink = vec3(1.0, 0.16, 0.7), violet = vec3(0.42, 0.14, 1.0);
  vec3 col = violet * 0.014;
  float snap = floor(t * 12.0) / 12.0;
  for (int e = 0; e < 2; e++) {
    float ez = e == 0 ? -0.62 : 0.62;
    vec2 d = vec2(p.x, p.y - ez);
    float r2 = dot(d, d), r = sqrt(r2);
    col += hot * 0.0016 / (r2 + 0.0016) * (1.7 + 1.3 * kick);
    col += mix(pink, violet, clamp(r * 3.5, 0.0, 1.0)) * exp(-r * 12.0) * (0.32 + 0.35 * kick);
    for (int k = 0; k < 5; k++) {
      float fk = float(k) + float(e) * 7.0;
      float ang = fk * 1.2566 + 0.75 * sin(t * (0.37 + 0.11 * float(k)) + fk * 2.3) + 0.3 * sin(t * 1.3 + fk);
      vec2 u = vec2(sin(ang), cos(ang));
      float along = dot(d, u);
      if (along <= 0.0) continue;
      float ex = u.x / 0.255, ez2 = u.y / 0.36;
      float L = inversesqrt(ex * ex + ez2 * ez2);
      float side = d.x * u.y - d.y * u.x;
      float reach = along / L;
      float wig = ((svN(along * 9.0 - t * 3.0 + fk * 11.0) - 0.5) * 0.09 + (svJ(along * 34.0 - t * 6.0 + fk * 3.0) - 0.5) * 0.045) * reach;
      float flick = 0.72 + 0.28 * sin(t * 23.0 + fk * 4.1);
      float wc = 0.0032 * (1.0 + 0.5 * kick) * (0.8 + reach);
      float lit = (svF(side - wig, wc) + 0.25 * svF(side - wig, wc * 5.0)) * smoothstep(1.0, 0.88, reach);
      col += mix(hot, pink, smoothstep(0.0, 0.55, reach)) * lit * (1.9 + 1.9 * kick) * flick;
      vec2 tip = d - u * L * 0.93;
      col += pink * 0.0005 / (dot(tip, tip) + 0.0005) * (0.5 + 0.5 * flick) * (0.8 + kick);
    }
  }
  // two bolts nose to tail under her feet, snapping to a new shape twelve times a second
  if (abs(p.y) < 0.62) {
    float env = cos(p.y / 0.62 * 1.5708);
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float x = ((svN(p.y * 5.0 + snap * 1.9 + fk * 19.0) - 0.5) * 0.26 + (svJ(p.y * 29.0 + snap * 7.0 + fk * 7.0) - 0.5) * 0.07) * env;
      float d = p.x - x;
      col += mix(hot, mix(pink, violet, 0.3 + 0.4 * fk), 0.55) * (svF(d, 0.0038) + 0.25 * svF(d, 0.02)) * (1.5 + 1.8 * kick);
    }
  }
  return col;
}`;

function plasmaGlass(time) {
  // its glow is white at 1: the game pulses emissiveIntensity on the beat and a hit, and the
  // shader reads that back as how hard to kick the current
  const m = material('Shock Value • plasma glass', 0x0b0616, .1, .07, { clearcoat: 1, clearcoatRoughness: .05, emissive: 0xffffff, emissiveIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSvTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSvP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSvP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PLASMA)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float svKick = clamp(length(emissive) * 0.57735 - 1.0, 0.0, 1.0) * 1.8;
        totalEmissiveRadiance = svPlasma(vSvP.xz, uSvTime, svKick);`);
  };
  return m;
}

// the arc on the tail's ladder: a jagged white line between the two rods, at the height uClimb
const ARC_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0)); }`;
const ARC_FS = /* glsl */`
uniform float uTime, uClimb, uOn;
varying vec2 vUv;
float aH(float n){ return fract(sin(n) * 43758.5453); }
float aN(float x){ float i = floor(x), f = fract(x); return mix(aH(i), aH(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main(){
  float q = floor(uTime * 30.0);
  float jag = (aN(vUv.x * 7.0 + q * 3.7) - 0.5) * 0.18 + (aN(vUv.x * 19.0 + q * 1.3) - 0.5) * 0.07;
  float bow = sin(vUv.x * 3.14159) * 0.06;
  float d = vUv.y - (uClimb + (jag + bow) * smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x));
  float core = exp(-d * d / 0.0008), halo = exp(-d * d / 0.01) * 0.4;
  vec3 col = (vec3(1.0, 0.86, 1.0) * core * 4.2 + vec3(1.0, 0.22, 0.78) * halo * 2.6) * uOn;
  if (max(col.r, col.b) < 0.004) discard;
  gl_FragColor = vec4(col, 1.0);
}`;

function shockValue() {
  const g = new THREE.Group();
  const time = { value: 0 };
  const arcU = { uTime: { value: 0 }, uClimb: { value: 0 }, uOn: { value: 1 } };
  const dark = material('Shock Value • black glass chassis', 0x0d0a16, .55, .26, { clearcoat: .9, clearcoatRoughness: .12 });
  const shell = material('Shock Value • violet lacquer', 0x3a1060, .45, .2, { clearcoat: 1, clearcoatRoughness: .06 });
  // (no reflections to show here: a mirror would read black, so the chrome is a bright satin)
  const chrome = material('Shock Value • mirror chrome', 0xe4e8f2, .72, .26, { clearcoat: .8, clearcoatRoughness: .06 });
  const ceramic = material('Shock Value • white ceramic', 0xf1eef6, .05, .35, { clearcoat: .9, clearcoatRoughness: .1 });
  const glass = plasmaGlass(time);
  const pink = glow('Shock Value • pink neon', 0xff3fc8, 1.5);
  const violet = glow('Shock Value • violet field', 0x8a52ff, 1.35);
  const arc = new THREE.ShaderMaterial({ uniforms: arcU, vertexShader: ARC_VS, fragmentShader: ARC_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  arc.name = 'Shock Value • ladder arc';

  const pts = outline();
  plate(g, 'Black glass chassis', shapeOf(pts), -.12, .09, dark, .022);
  // (an extrusion's bevel pushes its walls out by the bevel's size: the band is scaled past the chassis's)
  plate(g, 'Mirror waist band', shapeOf(pts, 1.045, 1.02), -.036, .028, chrome, .014);
  plate(g, 'Violet lacquer shell', shapeOf(pts, .99, .995), -.012, .085, shell, .022);
  // the glass in a chrome bezel
  const bezel = shapeOf(pts, .955, .975); bezel.holes.push(holeOf(pts, .885, .935));
  plate(g, 'Chrome bezel', bezel, .068, .03, chrome, .008);
  plate(g, 'Plasma glass', shapeOf(pts, .87, .93), .058, .052, glass, .014);
  // fuse caps at nose and tail, with knurled bands across them
  for (const sign of [-1, 1]) {
    plate(g, 'Fuse cap', capOf(pts, .86, sign, .965, .985), .084, .036, chrome, .012);
    for (let i = 0; i < 3; i++) {
      const z = sign * (.885 + i * .04), hw = .3 * Math.sqrt(Math.max(0, 1 - Math.pow((Math.abs(z) - .62) / .45, 2))) - .02;
      if (hw > .04) box(g, 'Knurled band', hw * 2, .008, .012, dark, 0, .133, z);
    }
  }
  // the electrodes: a dome of glass over each, lit from inside by the shader
  for (const z of [-.62, .62]) {
    const dome = mesh(g, 'Electrode dome', new THREE.SphereGeometry(.068, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, .108, z]);
    dome.scale.y = .62;
    ringY(g, 'Dome collar', .07, .009, chrome, 0, .112, z, 36);
  }
  // where her feet are, chrome contact rings (the current goes where it's touched)
  for (const z of [-.32, .32]) { const r = ringY(g, 'Contact ring', .1, .0065, chrome, 0, .122, z, 40); r.scale.y = 1.45; }
  // neon along each side, under the chrome band
  for (const sign of [-1, 1]) {
    const side = RIGHT.slice(1, -1).map(([x, z]) => [sign * (x + .03), -.058, z * .985]);
    tube(g, 'Side neon', side, .0085, pink);
    // ceramic terminals at the waist
    for (const z of [-.08, .08]) {
      mesh(g, 'Ceramic terminal', new THREE.CylinderGeometry(.018, .022, .05, 14), ceramic, [sign * .272, -.02, z], [0, 0, Math.PI / 2]);
      discY(g, 'Terminal cap', .012, .012, chrome, sign * .3, -.02, z, 10).rotation.z = Math.PI / 2;
    }
  }
  // the Jacob's ladder on the tail: two rods spreading upward, an arc climbing between them
  const base = .045, top = .118, y0 = .118, y1 = .345, z0 = .955, z1 = 1.005;
  for (const sign of [-1, 1]) {
    tube(g, 'Ladder rod', [[sign * base, y0 - .02, z0], [sign * (base + top) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [sign * top, y1, z1]], .011, chrome);
    mesh(g, 'Rod insulator', new THREE.CylinderGeometry(.017, .022, .04, 14), ceramic, [sign * base, y0 + .005, z0]);
    mesh(g, 'Rod tip', new THREE.SphereGeometry(.019, 12, 8), pink, [sign * top, y1 + .01, z1]);
  }
  const arcGeo = new THREE.BufferGeometry();
  const ax0 = base - .004, ax1 = top - .006;
  arcGeo.setAttribute('position', new THREE.Float32BufferAttribute([-ax0, y0, z0, ax0, y0, z0, -ax1, y1, z1, ax1, y1, z1], 3));
  arcGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  arcGeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  arcGeo.setIndex([0, 1, 2, 2, 1, 3]);
  mesh(g, 'Ladder arc', arcGeo, arc);
  // underneath: a violet field ring under each bulb, a keel, and chrome coils at the tail
  for (const z of [-.6, .6]) {
    ringY(g, 'Field ring', .19, .015, violet, 0, -.138, z, 48);
    discY(g, 'Field core', .15, .016, dark, 0, -.14, z, 36);
    ringY(g, 'Field inner ring', .09, .009, pink, 0, -.15, z, 32);
  }
  for (let i = -2; i <= 2; i++) box(g, 'Keel fin', .022, .04, .5, dark, i * .05, -.145, 0);

  // the clock and the ladder: once a beat (a rising pulse) the arc starts again at the bottom
  // and climbs in about a beat; with no beat (the title, the locker) it just keeps climbing
  let t = 0, climb = 0, last = 0;
  g.userData.tick = (dt, s = {}) => {
    t += dt; time.value = t; arcU.uTime.value = t;
    const beat = s.beat || 0;
    if (beat > .8 && last <= .8) climb = 0;
    last = beat;
    climb += dt / .42;
    if (climb > 1.35) climb = 0;
    arcU.uClimb.value = Math.min(1, climb) * .92 + .04;
    arcU.uOn.value = climb < 1 ? 1 : Math.max(0, 1 - (climb - 1) * 6);
  };
  return finish(g, 'shock-value', .69, 2.12, .128);
}

function finish(g, id, width, length, foot = .14) {
  g.name = id;
  g.userData = { ...g.userData, id, forward: '-Z', up: '+Y', units: 'meters', nominalWidth: width, nominalLength: length, deckHeight: foot };
  for (const [n, p] of [['trail_left', [-.17, -.12, .9]], ['trail_right', [.17, -.12, .9]], ['foot_front', [0, foot, -.32]], ['foot_back', [0, foot, .32]]]) { const a = new THREE.Object3D(); a.name = n; a.position.set(...p); g.add(a); }
  return g;
}

export function createShockBoard(id) {
  if (id === 'shock-value') return shockValue();
  throw new Error(`Unknown shock board: ${id}`);
}
