// The alien you can unlock. Red's body and her riding clips, under a silver suit: at load her head
// comes off (every triangle that moves mostly with the head bone), she's drawn in thinner (much
// thinner at the neck), and a modelled head goes on the head bone in its place: a big pale green
// bulb, black almond eyes that catch the light whichever way she turns, a slit of a mouth.
// Nothing extra to download: it's her file, reshaped here.
import * as THREE from 'three';

const SKIN = '#9ecf90', SUIT = '#c6ccd6';

// what each of the base model's meshes becomes, by name (first match wins)
const ROLES = [
  [/hair|^eyes|brows|lashes|freckles|frayed/i, 'hide'],
  [/^body$/i, 'body'],
  [/tee|jeans|shirt|top|pants|denim/i, 'suit'],
];

// how much each bone's flesh is pulled in towards it (1 keeps it)
const SLIM = [
  [/Head|Hair/, 1], [/Neck$/, 0.5],
  [/(Thumb|Index|Middle|Ring|Pinky)\d$/, 0.9], [/Hand$/, 0.93],
  [/ForeArm$/, 0.8], [/Arm$/, 0.83], [/Shoulder$/, 0.9],
  [/Spine2$/, 0.84], [/Spine1$/, 0.85], [/Spine$/, 0.86], [/Hips$/, 0.84],
  [/UpLeg$/, 0.8], [/Leg$/, 0.82], [/Foot$|Toe/, 1],
];
const slimOf = (n) => { for (const [re, k] of SLIM) if (re.test(n)) return k; return 1; };
// and her chest flatter still, from the front
const flatOf = (n) => (/Spine2$/.test(n) ? 0.62 : /Spine1$/.test(n) ? 0.8 : 1);
// the body's own skin is the suit wherever these bones move it (her arms below the sleeves, her
// hands and her neck stay skin)
const SUITED = /(Hips|Spine\d?|Shoulder|UpLeg|Leg|Foot|ToeBase)$/;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- the head, in the head bone's rest frame: metres, y up, z the way she faces ----------
const H = { cy: 0.092, cz: 0.012, rx: 0.123, ry: 0.162, rz: 0.128 };
const BOT = H.cy - H.ry;
// all of it scaled up from the head bone, and lifted a little so there's a neck under it
const SIZE = 1.2, LIFT = 0.014;
// the eyes: centre (azimuth, height), half length and half height along the face, tilt (outer
// corner up), and the face's radius there (to turn length along it into azimuth)
const E = { th: 0.7, y: 0.042, a: 0.066, b: 0.037, tilt: 0.5, R: 0.1 };
// the lens: rounder at its outer end, a point at its inner one
const lensE = (c) => 0.35 + 0.35 * smooth(0.3, -0.3, c);

// a point on the skull from its azimuth (0 straight ahead) and angle down from the crown
function skull(th, ph, out) {
  const sp = Math.sin(ph), cp = Math.cos(ph);
  let x = H.rx * sp * Math.sin(th), y = H.cy + H.ry * cp, z = H.rz * sp * Math.cos(th);
  // below the temples the face narrows to a small chin and comes forward a little
  const t = clamp((0.14 - y) / (0.14 - BOT), 0, 1);
  x *= 1 - 0.6 * Math.pow(t, 1.5);
  z *= 1 - 0.32 * Math.pow(t, 1.3);
  z += 0.02 * Math.pow(t, 1.4);
  // the cranium swells out behind and rises
  const back = Math.max(0, -Math.cos(th)) * sp, up = smooth(-0.02, 0.2, y);
  z -= 0.028 * back * up;
  y += 0.012 * back * up;
  // a flatter face between the eyes and the chin
  const front = Math.max(0, Math.cos(th));
  z -= 0.012 * Math.pow(front, 3) * smooth(0.11, 0.0, y) * smooth(-0.075, -0.02, y);
  return out.set(x, y, z + H.cz);
}
// the same by height, for the front of the face (where height alone picks the angle)
function face(th, y, out) { return skull(th, Math.acos(clamp((y - H.cy) / H.ry, -1, 1)), out); }
function faceNormal(th, y, out) {
  const e = 1e-4, a = face(th - e, y, _a), b = face(th + e, y, _b), c = face(th, y - e, _c), d = face(th, y + e, _d);
  const du = b.sub(a), dv = d.sub(c);
  return out.crossVectors(du, dv).normalize();
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

// the outline of an eye: a lens, pointed at both ends
const lensV = (u) => E.b * Math.pow(Math.max(0, 1 - (u / E.a) * (u / E.a)), (1 + lensE(u / E.a)) / 2);
// how far a point of the face (azimuth, height) is outside the eye on its side (< 0 inside)
function eyeDist(th, y) {
  const up = (Math.abs(th) - E.th) * E.R, vp = y - E.y;
  const c = Math.cos(E.tilt), s = Math.sin(E.tilt);
  const u = up * c + vp * s, v = -up * s + vp * c;
  if (Math.abs(u) < E.a) return Math.abs(v) - lensV(u);
  return Math.hypot(Math.abs(u) - E.a, v);
}

function headGeometry() {
  const NU = 128, NV = 96;
  const n = 2 + (NV - 1) * NU;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  let k = 0;
  const put = (th, ph) => {
    skull(th, ph, p);
    // a slit of a mouth and two pin nostrils, pressed in a little and shaded; a shadow round each eye
    let shade = 0.88 + 0.12 * smooth(BOT, 0.04, p.y) + 0.04 * smooth(0.1, 0.24, p.y);
    const front = Math.cos(th) > 0.5;
    if (front) {
      const m = Math.exp(-Math.pow((p.y + 0.044) / 0.0017, 2)) * (1 - smooth(0.008, 0.0125, Math.abs(p.x)));
      const nl = Math.exp(-((p.x - 0.0058) ** 2 + (p.y + 0.014) ** 2) / (0.0017 ** 2)) + Math.exp(-((p.x + 0.0058) ** 2 + (p.y + 0.014) ** 2) / (0.0017 ** 2));
      const dent = 0.0011 * m + 0.0008 * nl;
      if (dent > 1e-6) { q.set(p.x, p.y - H.cy, p.z - H.cz).normalize(); p.addScaledVector(q, -dent); }
      shade *= 1 - 0.6 * m - 0.45 * Math.min(1, nl);
    }
    if (Math.cos(th) > 0) {
      const d = eyeDist(th, p.y);
      if (d > -0.004) shade *= 1 - 0.3 * Math.exp(-Math.pow(Math.max(0, d) / 0.006, 2));
    }
    pos.set([p.x, p.y, p.z], k * 3);
    col.set([shade, shade, shade], k * 3);
    k++;
  };
  put(0, 0);
  for (let j = 1; j < NV; j++) for (let i = 0; i < NU; i++) put((i / NU) * Math.PI * 2, (j / NV) * Math.PI);
  put(0, Math.PI);
  const idx = [];
  const at = (j, i) => 1 + (j - 1) * NU + (i % NU);
  for (let i = 0; i < NU; i++) idx.push(0, at(1, i), at(1, i + 1));
  for (let j = 1; j < NV - 1; j++) for (let i = 0; i < NU; i++) {
    const a = at(j, i), b = at(j, i + 1), c = at(j + 1, i), d = at(j + 1, i + 1);
    idx.push(a, c, b, b, c, d);
  }
  for (let i = 0; i < NU; i++) idx.push(n - 1, at(NV - 1, i + 1), at(NV - 1, i));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// both eyes: lenses that follow the face's curve, domed, their rims tucked just under the skin, each
// with a soft glint high on the same side (aGl), so they look wet from anywhere
function eyesGeometry() {
  const NR = 18, NA = 72;
  const pos = [], gl = [], idx = [];
  const p = new THREE.Vector3(), nrm = new THREE.Vector3();
  const c = Math.cos(E.tilt), s = Math.sin(E.tilt);
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    const add = (r, al) => {
      const sa = Math.sin(al), ca = Math.cos(al);
      const u = E.a * r * ca, v = E.b * r * sa * Math.pow(Math.abs(sa), lensE(ca));
      const up = u * c - v * s, vp = u * s + v * c;
      const th = side * (E.th + up / E.R), y = E.y + vp;
      face(th, y, p); faceNormal(th, y, nrm);
      if (nrm.dot(_a.set(p.x, p.y - H.cy, p.z - H.cz)) < 0) nrm.negate();
      const off = -0.0024 + 0.0082 * Math.pow(Math.max(0, 1 - r * r), 0.55);
      p.addScaledVector(nrm, off);
      pos.push(p.x, p.y, p.z);
      const gu = r * ca + side * 0.3, gv = r * sa - 0.42;
      gl.push(Math.exp(-(gu * gu / 0.016 + gv * gv / 0.012)));
    };
    add(0, 0);
    for (let ri = 1; ri <= NR; ri++) for (let ai = 0; ai < NA; ai++) add(ri / NR, (ai / NA) * Math.PI * 2);
    const at = (ri, ai) => base + 1 + (ri - 1) * NA + (ai % NA);
    const tri = (a, b, d) => { if (side > 0) idx.push(a, b, d); else idx.push(a, d, b); };
    for (let ai = 0; ai < NA; ai++) tri(base, at(1, ai), at(1, ai + 1));
    for (let ri = 1; ri < NR; ri++) for (let ai = 0; ai < NA; ai++) {
      const a = at(ri, ai), b = at(ri + 1, ai), d = at(ri, ai + 1), e = at(ri + 1, ai + 1);
      tri(a, b, d); tri(d, b, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aGl', new THREE.Float32BufferAttribute(gl, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- materials: an edge light like the other skaters', and a reflection of a soft studio
// (there's no environment map in a ride: without one, the silver and the eyes went flat black) ----------
const LC_ENV = /* glsl */`
uniform vec3 uRim; uniform float uRimK, uEnvK, uRimF;
vec3 lcEnv(vec3 R) {
  vec3 c = mix(vec3(0.03, 0.028, 0.045), vec3(0.38, 0.42, 0.52), smoothstep(-0.3, 0.9, R.y));
  c += vec3(0.95, 0.97, 1.0) * exp(-pow((R.y - 0.14) * 6.0, 2.0)) * 0.6;
  c += vec3(1.0) * pow(max(dot(R, normalize(vec3(-0.45, 0.6, 0.66))), 0.0), 40.0) * 2.4;
  c += vec3(1.0) * pow(max(dot(R, normalize(vec3(0.7, 0.35, -0.6))), 0.0), 24.0) * 0.9;
  return mix(c, c * (0.55 + uRim), 0.4);
}`;
function dress(m, { rim, rimK = 0.55, rimF = 1, env = 0.5, suit = null, stripe = false, glint = false }) {
  m.userData.rimF = rimF;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: new THREE.Color(rim) };
    sh.uniforms.uRimK = { value: rimK * rimF };
    sh.uniforms.uRimF = { value: rimF };
    sh.uniforms.uEnvK = { value: env };
    m.userData.shader = sh;
    let vs = sh.vertexShader, fs = sh.fragmentShader;
    if (glint) {
      vs = vs.replace('#include <common>', '#include <common>\nattribute float aGl; varying float vGl;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGl = aGl;');
      fs = fs.replace('#include <common>', '#include <common>\nvarying float vGl;');
    }
    if (stripe) {
      // a line of the song's edge colour down the outside of each arm, side and leg of the suit,
      // brighter as the run builds
      vs = vs.replace('#include <common>', '#include <common>\nattribute float aLat; varying float vLat;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLat = aLat;');
      fs = fs.replace('#include <common>', '#include <common>\nvarying float vLat;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lcStripe = smoothstep(0.935, 0.968, vLat)${suit ? ' * smoothstep(0.4, 0.6, vSuit)' : ''};
        totalEmissiveRadiance += uRim * lcStripe * (0.5 + 2.2 * uRimK);`);
    }
    if (suit) {
      sh.uniforms.uSkin = { value: new THREE.Color(suit.skin) };
      sh.uniforms.uSuit = { value: new THREE.Color(suit.suit) };
      vs = vs.replace('#include <common>', '#include <common>\nattribute float aSuit; varying float vSuit;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSuit = aSuit;');
      fs = fs.replace('#include <common>', '#include <common>\nuniform vec3 uSkin, uSuit; varying float vSuit;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat lcSuit = smoothstep(0.4, 0.6, vSuit);\ndiffuseColor.rgb = mix(uSkin, uSuit, lcSuit);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.44, 0.3, lcSuit);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.0, 0.55, lcSuit);');
    }
    fs = fs.replace('#include <common>', '#include <common>\n' + LC_ENV)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += uRim * rimF * 1.2 * uRimK;`)
      .replace('#include <opaque_fragment>', `{
        vec3 lcV = normalize(vViewPosition), lcN = normalize(normal);
        vec3 lcR = normalize((vec4(reflect(-lcV, lcN), 0.0) * viewMatrix).xyz);
        float lcF = pow(1.0 - clamp(dot(lcN, lcV), 0.0, 1.0), 5.0);
        vec3 lcF0 = mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);
        outgoingLight += lcEnv(lcR) * (lcF0 + (1.0 - lcF0) * lcF) * uEnvK * (1.0 - 0.7 * roughnessFactor);
        ${glint ? 'outgoingLight += vec3(1.7) * smoothstep(0.3, 0.8, vGl);' : ''}
      }
      #include <opaque_fragment>`);
    sh.vertexShader = vs; sh.fragmentShader = fs;
  };
  return m;
}

// ---------- reshaping her ----------
// her bones where they stand at rest, and the line each one's flesh is pulled in towards
function rig(mesh) {
  const sk = mesh.skeleton, bones = sk.bones;
  const at = new Map(bones.map((b, i) => [b, i]));
  const pos = sk.boneInverses.map((m) => new THREE.Vector3().setFromMatrixPosition(m.clone().invert()));
  const end = bones.map((b, i) => {
    const kids = b.children.filter((c) => at.has(c));
    if (!kids.length) return pos[i];
    const dir = b.parent && at.has(b.parent) ? pos[i].clone().sub(pos[at.get(b.parent)]).normalize() : new THREE.Vector3(0, 1, 0);
    let best = kids[0], bd = -2;
    for (const c of kids) { const d = pos[at.get(c)].clone().sub(pos[i]).normalize().dot(dir); if (d > bd) { bd = d; best = c; } }
    return pos[at.get(best)];
  });
  const head = bones.findIndex((b) => /Head$/.test(b.name));
  const inHead = bones.map((b) => { for (let o = b; o; o = o.parent) if (o === bones[head]) return true; return false; });
  return { bones, pos, end, head, inHead, slim: bones.map((b) => slimOf(b.name)), flat: bones.map((b) => flatOf(b.name)), suited: bones.map((b) => (SUITED.test(b.name) ? 1 : 0)),
    side: pos.map((q) => (q.x > 0.03 ? 1 : q.x < -0.03 ? -1 : 0)) };
}

// a copy of a mesh's shape, pulled in towards its bones, knowing how far round to the outside of
// its limb each point is (for the suit's stripe); the body also loses its head and learns which of
// it is suit
function reshape(mesh, R, body, loose = 0) {
  const src = mesh.geometry, g = new THREE.BufferGeometry();
  for (const k in src.attributes) if (k !== 'position') g.setAttribute(k, src.attributes[k]);
  const P = src.attributes.position, si = src.attributes.skinIndex, sw = src.attributes.skinWeight, n = P.count;
  const out = new Float32Array(n * 3), lat = new Float32Array(n), suit = body ? new Float32Array(n) : null, headW = body ? new Float32Array(n) : null;
  const bm = mesh.bindMatrix, bmi = mesh.bindMatrixInverse;
  const v = new THREE.Vector3(), t = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), av = new THREE.Vector3();
  const get = [(a, i) => a.getX(i), (a, i) => a.getY(i), (a, i) => a.getZ(i), (a, i) => a.getW(i)];
  for (let i = 0; i < n; i++) {
    v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(bm);
    t.set(0, 0, 0);
    let k = 0, ws = 0, su = 0, hw = 0, fl = 0, la = 0;
    for (let j = 0; j < 4; j++) {
      const w = get[j](sw, i); if (w <= 0) continue;
      const b = get[j](si, i);
      const a0 = R.pos[b], a1 = R.end[b];
      ab.subVectors(a1, a0); const L2 = ab.lengthSq();
      const f = L2 > 1e-10 ? clamp(av.subVectors(v, a0).dot(ab) / L2, 0, 1) : 0;
      c.copy(a0).addScaledVector(ab, f);
      const ox = v.x - c.x, ol = Math.max(1e-6, v.distanceTo(c));
      la += w * (R.side[b] ? R.side[b] * ox : Math.abs(ox)) / ol;
      t.addScaledVector(c, w); k += w * R.slim[b]; fl += w * R.flat[b]; ws += w; su += w * R.suited[b]; if (R.inHead[b]) hw += w;
    }
    if (ws > 0) {
      t.multiplyScalar(1 / ws); k /= ws; fl /= ws; lat[i] = la / ws;
      if (loose) k = Math.min(1, k + loose * (1 - k));
      v.sub(t).multiplyScalar(k);
      if (v.z > 0) v.z *= loose ? Math.min(1, fl + loose * (1 - fl)) : fl;   // (at rest she faces +z)
      v.add(t);
    }
    v.applyMatrix4(bmi);
    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    if (body) { suit[i] = ws > 0 ? su / ws : 0; headW[i] = ws > 0 ? hw / ws : 0; }
  }
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.setAttribute('aLat', new THREE.BufferAttribute(lat, 1));
  if (body) {
    g.setAttribute('aSuit', new THREE.BufferAttribute(suit, 1));
    // her head goes: every triangle with a corner that moves mostly with it
    const ix = src.index ? src.index.array : null, tri = ix ? ix.length / 3 : n / 3, keep = [];
    for (let f = 0; f < tri; f++) {
      const a = ix ? ix[f * 3] : f * 3, b = ix ? ix[f * 3 + 1] : f * 3 + 1, d = ix ? ix[f * 3 + 2] : f * 3 + 2;
      if (headW[a] > 0.5 || headW[b] > 0.5 || headW[d] > 0.5) continue;
      keep.push(a, b, d);
    }
    g.setIndex(keep);
  } else g.setIndex(src.index);
  for (const k in src.morphAttributes) g.morphAttributes[k] = src.morphAttributes[k];
  g.groups = src.groups.slice();
  return g;
}

const made = new WeakMap();   // per loaded file: the reshaped shapes and the head, made once

// dress a fresh copy of the base model as the alien; returns its materials (for the edge light)
export function alienize(model, gltf, P) {
  const rim = P.rim ?? P.edge ?? 0x5ff2ff;
  let kit = made.get(gltf);
  if (!kit) { kit = { geo: new Map(), head: null, eyes: null }; made.set(gltf, kit); }
  const mats = [];
  const skin = dress(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.44, metalness: 0, side: THREE.DoubleSide }), { rim, env: 0.6, suit: { skin: SKIN, suit: SUIT }, stripe: true });
  const suitMat = dress(new THREE.MeshStandardMaterial({ color: SUIT, roughness: 0.3, metalness: 0.55, side: THREE.DoubleSide }), { rim, env: 1.0, stripe: true });
  mats.push(skin, suitMat);
  let R = null, headBone = null;
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    let role = null;
    for (const [re, r] of ROLES) if (re.test(o.name)) { role = r; break; }
    if (role === 'hide') { o.visible = false; o.userData.lcOwn = true; return; }
    if (!role) return;                                     // (her shoes stay hers)
    if (!R) R = rig(o);
    if (!headBone) headBone = o.skeleton.bones[R.head];
    let g = kit.geo.get(o.geometry);
    if (!g) { g = reshape(o, R, role === 'body', role === 'suit' ? 0.08 : 0); kit.geo.set(o.geometry, g); }
    o.geometry = g;
    if (role === 'body') o.material = skin;
    else {
      const old = Array.isArray(o.material) ? o.material[0] : o.material;
      if (old && old.normalMap && !suitMat.normalMap) { suitMat.normalMap = old.normalMap; suitMat.normalScale.copy(old.normalScale); }
      o.material = suitMat;
    }
    o.userData.lcOwn = true;
  });
  if (!R || !headBone) return mats;
  // the head: built in the head bone's rest frame (where it stands, upright, facing the way she
  // does), then put into the bone's own space so it rides with it
  if (!kit.head) {
    const inv = findInverse(model, headBone);
    const m = new THREE.Matrix4().makeScale(SIZE, SIZE, SIZE)
      .premultiply(new THREE.Matrix4().makeTranslation(R.pos[R.head].x, R.pos[R.head].y + LIFT, R.pos[R.head].z)).premultiply(inv);
    kit.head = headGeometry().applyMatrix4(m);
    kit.eyes = eyesGeometry().applyMatrix4(m);
  }
  const headMat = dress(new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.42, metalness: 0, vertexColors: true }), { rim, env: 0.7 });
  const eyeMat = dress(new THREE.MeshStandardMaterial({ color: 0x020305, roughness: 0.07, metalness: 0 }), { rim, rimF: 0, env: 4.0, glint: true });
  mats.push(headMat, eyeMat);
  for (const [geo, mat, name] of [[kit.head, headMat, 'Alien_head'], [kit.eyes, eyeMat, 'Alien_eyes']]) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name; mesh.frustumCulled = false; mesh.userData.lcOwn = true;
    headBone.add(mesh);
  }
  return mats;
}

// the head bone's inverse rest matrix, from whichever skinned mesh is bound to it
function findInverse(model, bone) {
  let inv = null;
  model.traverse((o) => {
    if (inv || !o.isSkinnedMesh) return;
    const i = o.skeleton.bones.indexOf(bone);
    if (i >= 0) inv = o.skeleton.boneInverses[i].clone();
  });
  return inv || new THREE.Matrix4();
}
