// PORCELAIN FIGURINES: every boss is a glazed porcelain pop star built on a Quaternius base body
// (shared UAL skeleton, so assets/characters/anims.glb plays on it through a Rig). Assets come from
// tools/pack-figurines.mjs (assets/characters/figurine/). Parts: figurine/body.js (zones, landmarks),
// glaze.js (the material), face.js (paint + expressions), accessories.js, shards.js (debris, shatter).
//
//   const fig = await buildFigurine(kit, spec);   // kit: CharacterKit (src/engine/character.js), after kit.init()
//   scene.add(fig.root);                          // fig.world (chips, glitter, shards, fallen pieces, veil) joins root's parent on the first update
//   await fig.prepare(renderer, camera, scene);   // plans the shatter + break chunks, compiles every shader, uploads the shard meshes
//   fig.rig.play('Idle_Loop');                     // a Rig: play/once/upperOnce/hitStop/lookTarget/flash, as for the heroine
//   each frame: fig.update(dt)                     // runs the rig, expressions, springs/cloth, cracks, debris: don't also call rig.update
//   fig.setExpression('fury', { fade: 0.15 })      // neutral smug fury shock delight pout hurt sing
//   fig.setMouth(0..1)                             // lip-sync: the jaw opens on top of the expression (the lips really part)
//   fig.lookAt(worldPos | null)                    // the painted irises follow (turn the head with rig.lookTarget)
//   fig.setDamage(0..1)                            // the crack networks grow from the hits as damage rises
//   fig.hitAt(worldPos, dir, { power, chips })     // crack seed at the nearest surface point, white pop + hit ring, chips, flinch
//                                                  //   -> { bind, world, color } (color: the glaze that was hit, for sparks/sounds)
//   fig.breakPiece(name?)                          // a notch: the named (or next unbroken) entry of spec.breaks pops off with physics
//   fig.shatter({ dir, power, at })                // the finish: every glazed surface in its current pose -> ~600-1000 shards + glitter
//   fig.restorePieces(n | names)                   // a rewind: only the first n of spec.breaks (or the named ones) stay broken
//   fig.reset()                                    // whole again: no cracks, no breaks, unshattered (a retry)
//   fig.onEvent = (type, data) => {}               // 'hit' 'break' 'shatter' 'clink' (a shard/piece hits the floor: data.world, data.speed)
//   fig.dispose()
//
// The spec (all optional):
//   name, body: 'female' | 'male', scale: 1.12, floorY: 0, porcelain: 0xf6f1ea, gold: 0xffbd54
//   skin: { roughness, coatRough, translucency }
//   top: { from: 'hips', neckline: 'v'|'plunge'|'scoop'|'crew'|'high'|'turtle'|'boat'|'strapless'|'sweetheart', depth, width, color, finish, pattern, trim }
//   sleeves: 'cap'|'short'|'elbow'|'forearm'|'wrist'|'knuckle' | { to } | null      legs: { hem: 'thigh'|'midthigh'|'knee'|'calf'|'ankle', from: 'waist', color }
//   gloves: { from: 'wrist'|'forearm'|'elbow', color }    boots: { from: 'ankle'|'calf'|'knee', color }    (painted; see accessories.shoes for sculpted ones)
//   trim: 'gold' | { color, width, double } | false       pattern: 'stripes'|'polka'|'sequins'|'plaid'|'pinstripe' | { type, color2, period, duty, dir: 'v'|'h'|'d' }
//   finish (per layer): 'gloss' | 'lacquer' | 'satin' | 'matte' | 'gold' | 'silver' | 'chrome' | 'pearl'
//   layers: [{ kind: 'top'|'bottom'|'gloves'|'boots'|'belt'|'sash'|'lapels'|'patch', ...as above, shell: { thickness, smooth } }]
//           bottom to top, at most 8; replaces the shorthand. shell: the garment stands off the body as its own glazed cast.
//   seams: true | ['neck','elbow','wrist','waist','knee','ankle','shoulder','hip']      (mannequin joint lines)
//   hair: { style: 'long'|'buns'|'parted'|'buzz'|'crop', color, finish, gild, relief } | null, beard: { color }
//   face: { brows, liner, lashes, shadow, lips, blush, streaks, marks, freckles }  (see FACE_DEFAULT in figurine/face.js)
//   eyes: { iris, iris2, slit, ring, white }
//   accessories: [{ type, name, ...opts }]: hat veil catEars tiara sunglasses pearls skirt coat handcuffs cuffs nametag tape shoes
//   breaks: the three notch pieces, in order: accessory names/types, or body parts (hand_l/r forearm_l/r face
//           shoulder_l/r chest back; at most four, their masks are baked at build time)
import * as THREE from 'three';
import { Rig } from '../engine/character.js';
import { FXK } from '../engine/post.js';
import { analyzeBody, layerField, layerMode, seamField, partField, PARTS } from './figurine/body.js';
import { sharedUniforms, makeGlaze, makeDepth, FINISH } from './figurine/glaze.js';
import { paintFace, EXPRESSIONS } from './figurine/face.js';
import { ACCESSORIES } from './figurine/accessories.js';
import { Chips, Glitter, Shatter, Body, supportPoints, fracture, clusters, seedsFor } from './figurine/shards.js';

export { EXPRESSIONS };
const DIR = 'figurine/';
const texCache = new Map(), imgCache = new Map();

function loadTex(url, { color = false } = {}) {
  if (!texCache.has(url)) texCache.set(url, new THREE.TextureLoader().loadAsync(url).then((t) => { t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.flipY = false; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }));
  return texCache.get(url);
}
function loadImageData(url, rect) {
  if (!imgCache.has(url)) imgCache.set(url, new Promise((res, rej) => {
    const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, im.width, im.height); res({ width: im.width, height: im.height, data: d.data, rect }); }; im.onerror = rej; im.src = url;
  }));
  return imgCache.get(url);
}
// the lip masks cover this UV rect of the face (see tools/pack-figurines.mjs)
const LIP_RECT = [204 / 2048, 450 / 2048, 576 / 2048, 658 / 2048];

const color = (c, d) => new THREE.Color(c ?? d);
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const PATTERN_ID = { stripes: 1, polka: 2, sequins: 3, plaid: 4, pinstripe: 5 };

// ---------------------------------------------------------------------------------------------
// CPU skinning: world positions (and normals) of a skinned mesh's vertices in its current pose
function skinMatrices(mesh) {
  const sk = mesh.skeleton, n = sk.bones.length, M = new Float32Array(n * 16), t = new THREE.Matrix4();
  for (let b = 0; b < n; b++) { t.multiplyMatrices(sk.bones[b].matrixWorld, sk.boneInverses[b]).multiply(mesh.bindMatrix); M.set(t.elements, b * 16); }
  return M;
}
function skinVerts(mesh, list, outP, outN) {
  const M = skinMatrices(mesh);
  const g = mesh.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
  const count = list ? list.length : P.length / 3;
  for (let k = 0; k < count; k++) {
    const v = list ? list[k] : k;
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    let ox = 0, oy = 0, oz = 0, nx = 0, ny = 0, nz = 0;
    for (let j = 0; j < 4; j++) {
      const w = sw[v * 4 + j]; if (!w) continue;
      const o = si[v * 4 + j] * 16;
      ox += w * (M[o] * x + M[o + 4] * y + M[o + 8] * z + M[o + 12]);
      oy += w * (M[o + 1] * x + M[o + 5] * y + M[o + 9] * z + M[o + 13]);
      oz += w * (M[o + 2] * x + M[o + 6] * y + M[o + 10] * z + M[o + 14]);
      if (outN) { const a = N[v * 3], b = N[v * 3 + 1], c = N[v * 3 + 2]; nx += w * (M[o] * a + M[o + 4] * b + M[o + 8] * c); ny += w * (M[o + 1] * a + M[o + 5] * b + M[o + 9] * c); nz += w * (M[o + 2] * a + M[o + 6] * b + M[o + 10] * c); }
    }
    outP[k * 3] = ox; outP[k * 3 + 1] = oy; outP[k * 3 + 2] = oz;
    if (outN) { const l = Math.hypot(nx, ny, nz) || 1; outN[k * 3] = nx / l; outN[k * 3 + 1] = ny / l; outN[k * 3 + 2] = nz / l; }
  }
}
function rigidVerts(mesh, outP, outN) {
  const g = mesh.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, M = mesh.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(M);
  const v = new THREE.Vector3();
  for (let i = 0; i < P.length / 3; i++) { v.fromArray(P, i * 3).applyMatrix4(M); v.toArray(outP, i * 3); v.fromArray(N, i * 3).applyMatrix3(nm).normalize(); v.toArray(outN, i * 3); }
}

// ---------------------------------------------------------------------------------------------
function normTrim(t, base) {
  if (t === false || t === null) return null;
  if (t === undefined) t = base;
  if (t === undefined || t === false || t === null) return null;
  if (t === true || t === 'gold') return { color: 'gold', width: 0.011, relief: 0.0006, double: false };
  if (typeof t === 'string' || typeof t === 'number') return { color: t, width: 0.011, relief: 0.0004, double: false };
  return { color: t.color ?? 'gold', width: t.width ?? 0.011, relief: t.relief ?? 0.0006, double: !!t.double };
}
function normPattern(p) {
  if (!p) return null;
  if (typeof p === 'string') p = { type: p };
  const D = { stripes: { period: 0.05, duty: 0.5, dir: 1 }, polka: { period: 0.05, duty: 0.2 }, sequins: { period: 0.011, duty: 1 }, plaid: { period: 0.11, duty: 1 }, pinstripe: { period: 0.02, duty: 0.08, dir: 0 } }[p.type] || {};
  return { type: p.type, color2: p.color2 ?? p.color ?? 0xffffff, period: p.period ?? D.period, duty: p.duty ?? D.duty, dir: p.dir === 'v' ? 0 : p.dir === 'h' ? 1 : p.dir === 'd' ? 0.5 : (p.dir ?? D.dir ?? 0), seed: p.seed ?? 0 };
}
// the shorthand spec -> layers, bottom to top
function specLayers(spec) {
  if (spec.layers) return spec.layers.map((l) => ({ ...l, trim: normTrim(l.trim, spec.trim), pattern: normPattern(l.pattern) }));
  const out = [];
  if (spec.legs) out.push({ kind: 'bottom', from: spec.legs.from ?? 'waist', hem: spec.legs.hem ?? 'ankle', color: spec.legs.color ?? spec.top?.color, finish: spec.legs.finish ?? spec.top?.finish, trim: normTrim(spec.legs.trim, spec.trim), pattern: normPattern(spec.legs.pattern) });
  if (spec.top) {
    const sl = typeof spec.sleeves === 'object' && spec.sleeves !== null ? spec.sleeves.to : spec.sleeves;
    const nk = spec.top.neckline ?? (spec.top.to === 'bust' ? 'strapless' : 'crew');
    out.push({ kind: 'top', from: spec.top.from ?? 'hips', neckline: nk, sleeves: sl ?? null, legs: spec.top.legs, color: spec.top.color, finish: spec.top.finish, depth: spec.top.depth, width: spec.top.width, trim: normTrim(spec.top.trim, spec.trim), pattern: normPattern(spec.top.pattern ?? spec.pattern) });
  }
  if (spec.gloves) out.push({ kind: 'gloves', from: spec.gloves.from ?? 'wrist', color: spec.gloves.color, finish: spec.gloves.finish, trim: normTrim(spec.gloves.trim, spec.trim) });
  if (spec.boots) out.push({ kind: 'boots', from: spec.boots.from ?? 'ankle', color: spec.boots.color, finish: spec.boots.finish, trim: normTrim(spec.boots.trim, spec.trim) });
  return out;
}

// ---------------------------------------------------------------------------------------------
export async function buildFigurine(kit, spec = {}) {
  const base = (kit.base || 'assets/characters/') + DIR;
  const bodyKey = spec.body === 'male' ? 'male' : 'female';
  const hairStyle = spec.hair === null ? 'none' : (spec.hair?.style ?? 'long');
  const [gltf, lips, hairG, beardG] = await Promise.all([
    kit.load(base + `body-${bodyKey}.glb`),
    loadImageData(base + `lips-${bodyKey}.png`, LIP_RECT),
    hairStyle !== 'none' ? kit.load(base + `hair-${hairStyle}.glb`) : null,
    spec.beard ? kit.load(base + 'hair-beard.glb') : null,
  ]);
  let srcBody = null, srcEyes = null;
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh) { if (o.name.startsWith('Eyes')) srcEyes = o; else if (!srcBody || o.geometry.attributes.position.count > srcBody.geometry.attributes.position.count) srcBody = o; } });
  const I = analyzeBody(srcBody, srcEyes, lips);
  const hairTex = hairStyle !== 'none' || spec.beard ? await Promise.all(['1', '2'].map((s) => Promise.all([loadTex(base + `hair${s}-normal.jpg`), loadTex(base + `hair${s}-groove.jpg`)]))) : null;
  return new Figurine(kit, spec, { gltf, I, hairG, beardG, hairTex, hairStyle });
}

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

export class Figurine {
  constructor(kit, spec, { gltf, I, hairG, beardG, hairTex, hairStyle }) {
    this.kit = kit; this.spec = spec; this.I = I; this.hairStyle = hairStyle;
    this.floorY = spec.floorY ?? 0;
    this.scale = spec.scale ?? 1.12;
    this.onEvent = null;
    const U = this.U = sharedUniforms();
    if (spec.gold !== undefined) U.fGold.value.set(spec.gold);
    this.t = 0;

    // ---- the model (a skinned clone), the rig
    const model = this.model = kit.instance(gltf);
    let body = null, eyes = null;
    model.traverse((o) => { if (o.isSkinnedMesh) { if (o.name.startsWith('Eyes')) eyes = o; else if (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count) body = o; } });
    this.body = body; this.eyes = eyes;
    model.scale.setScalar(this.scale);
    this.rig = new Rig(kit, model);
    this.root = this.rig.root;
    this.root.name = spec.name || 'figurine';
    this.bones = this.rig.bones;
    this.boneIndex = new Map(body.skeleton.bones.map((b, i) => [b.name, i]));

    // ---- body geometry with the costume baked into per-vertex fields
    const geo = I.geo.clone();
    const nv = I.nv;
    const aBind = new Float32Array(nv * 4), aMisc = new Float32Array(nv * 4), aLayA = new Float32Array(nv * 4), aLayB = new Float32Array(nv * 4), aPart = new Float32Array(nv * 4);
    const seams = spec.seams ? seamField(I, spec.seams === true ? undefined : spec.seams) : null;
    for (let v = 0; v < nv; v++) {
      aBind[v * 4] = I.pos[v * 3]; aBind[v * 4 + 1] = I.pos[v * 3 + 1]; aBind[v * 4 + 2] = I.pos[v * 3 + 2]; aBind[v * 4 + 3] = seams ? seams[v] : 1;
      aMisc[v * 4] = I.cavFine[v]; aMisc[v * 4 + 1] = I.cavCoarse[v]; aMisc[v * 4 + 2] = I.purity[v]; aMisc[v * 4 + 3] = I.jawW[v];
    }
    const layers = this.layers = specLayers(spec).slice(0, 8);
    const fields = layers.map((l) => layerField(I, l.kind, l));
    this.fields = fields;
    for (let v = 0; v < nv; v++) for (let i = 0; i < 8; i++) { const val = fields[i] ? fields[i][v] : -1; if (i < 4) aLayA[v * 4 + i] = val; else aLayB[v * 4 + i - 4] = val; }
    // breakable body parts (up to four slots)
    this.parts = [];
    for (const name of spec.breaks || []) {
      if (!PARTS[name] || this.parts.length >= 4) continue;
      const f = partField(I, name); const slot = this.parts.length;
      for (let v = 0; v < nv; v++) aPart[v * 4 + slot] = f[v];
      this.parts.push({ name, slot, field: f, kind: PARTS[name].kind, broken: false });
    }
    geo.setAttribute('aBind', new THREE.BufferAttribute(aBind, 4));
    geo.setAttribute('aPat', new THREE.BufferAttribute(I.pat, 4));
    geo.setAttribute('aMisc', new THREE.BufferAttribute(aMisc, 4));
    geo.setAttribute('aLayA', new THREE.BufferAttribute(aLayA, 4));
    geo.setAttribute('aLayB', new THREE.BufferAttribute(aLayB, 4));
    geo.setAttribute('aPart', new THREE.BufferAttribute(aPart, 4));
    body.geometry = geo;

    // ---- body material
    const skinCol = color(spec.porcelain, 0xf6f1ea);
    const skinFin = FINISH[spec.skin?.finish || 'gloss'];
    const L = () => Array.from({ length: 8 }, () => new THREE.Vector4());
    const bodyU = this.bodyU = {
      fSkin: { value: skinCol }, fSkinMat: { value: new THREE.Vector4(spec.skin?.roughness ?? 0.32, skinFin.coat, spec.skin?.coatRough ?? 0.045, spec.skin?.translucency ?? 0.75) },
      fPoolTint: { value: new THREE.Color(0.95, 0.97, 1.0) }, fMouthCol: { value: new THREE.Color(0.045, 0.004, 0.008) },
      fLayCol: { value: L() }, fLayMat: { value: L() }, fLayPat: { value: L() }, fLayCol2: { value: L() }, fLayTrim: { value: L() }, fLayTrimCol: { value: L() },
      fLayMode: { value: L() }, fLayMode2: { value: L() },
      fFaceTex: { value: null }, fFaceRect: { value: new THREE.Vector4(...I.faceRect) },
      fSeam: { value: new THREE.Vector4(0.0014, 0.0009, 0.55, spec.seams ? 1 : 0) },
      fFaceA: { value: new THREE.Vector4() }, fFaceB: { value: new THREE.Vector4() }, fFaceC: { value: new THREE.Vector4() },
      fMouth: { value: new THREE.Vector4(0, I.MOUTH.y, I.MOUTH.cornerZ, I.MOUTH.halfW) },
      fJaw: { value: new THREE.Vector4(I.JAW.x, I.JAW.y, I.JAW.z, 0.32) },
      fBrowL: { value: new THREE.Vector4() }, fBrowR: { value: new THREE.Vector4() }, fLandmk: { value: new THREE.Vector4(I.side, 0.0, 0, 0) },
    };
    for (const s of ['l', 'r']) {
      const e = I.EYE[s]; const out = s === 'l' ? I.side : -I.side;
      const bx = e.c.x - out * 0.011, by = e.c.y + 0.021;
      bodyU[s === 'l' ? 'fBrowL' : 'fBrowR'].value.set(bx, by, I.faceZ(bx, by), e.c.x + out * 0.02);
    }
    bodyU.fLandmk.value.y = -0.002;
    bodyU.fMouth.value.z = I.faceZ(0, I.MOUTH.y);
    layers.forEach((l, i) => { this._layerUniforms(i, l); const [a, b] = layerMode(I, l.kind, l); bodyU.fLayMode.value[i].set(...a); bodyU.fLayMode2.value[i].set(...b); });
    const face = paintFace(I, spec.face || {});
    this.face = face; bodyU.fFaceTex.value = face.texture;
    this.bodyOpts = { layers: Math.max(1, layers.length), uniforms: bodyU, poolTint: [0.95, 0.97, 1.0] };
    body.material = makeGlaze('body', U, this.bodyOpts);
    body.customDepthMaterial = makeDepth(U);
    body.castShadow = true; body.receiveShadow = true;
    // garment shells: layers with volume (a jacket that stands off the body, a loose suit)
    this.shells = [];
    layers.forEach((l, i) => { if (l.shell) this._shell(i, l.shell === true ? {} : l.shell); });

    // ---- eyes
    const eyeU = this.eyeU = {
      fEyeL: { value: new THREE.Vector4(I.EYE.l.c.x, I.EYE.l.c.y, I.EYE.l.c.z, I.EYE.l.r) }, fEyeR: { value: new THREE.Vector4(I.EYE.r.c.x, I.EYE.r.c.y, I.EYE.r.c.z, I.EYE.r.r) },
      fLidL: { value: new THREE.Vector4() }, fLidR: { value: new THREE.Vector4() }, fIris: { value: new THREE.Vector4(0, 0, 1, 1) },
      fEyeOpen: { value: new THREE.Vector4(I.rims.l ? I.rims.l.open.top / I.EYE.l.r : 0.5, I.rims.l ? I.rims.l.open.bot / I.EYE.l.r : -0.4, 0, 0) },
      fIrisCol: { value: color(spec.eyes?.iris, 0x3a1d14) }, fIrisCol2: { value: color(spec.eyes?.iris2, 0x9a5a2a) },
      fLidCol: { value: skinCol.clone().lerp(color(spec.face?.shadow?.color, 0x8c5a6e), (spec.face?.shadow?.amount ?? 0.55) * 0.55) },
      fEyeStyle: { value: new THREE.Vector4(spec.eyes?.slit ? 1 : 0, spec.eyes?.ring ? 1 : 0, spec.eyes?.white ?? 0.3, 0) },
    };
    if (eyes) {
      const eg = eyes.geometry.clone(); const ep = eg.attributes.position.array; const eb = new Float32Array(ep.length / 3 * 4);
      for (let i = 0; i < ep.length / 3; i++) { eb[i * 4] = ep[i * 3]; eb[i * 4 + 1] = ep[i * 3 + 1]; eb[i * 4 + 2] = ep[i * 3 + 2]; }
      eg.setAttribute('aBind', new THREE.BufferAttribute(eb, 4)); eyes.geometry = eg;
      this.eyeOpts = { uniforms: eyeU };
      eyes.material = makeGlaze('eye', U, this.eyeOpts); eyes.castShadow = false;
    }

    // ---- hair (and beard): re-bound to this skeleton, bind positions for the cracks
    this.hairMeshes = [];
    const addHair = (g, hs, opts) => {
      if (!g) return;
      let src = null; g.scene.traverse((o) => { if (o.isSkinnedMesh) src = o; });
      const set = /long|buns/.test(hs) ? 1 : 0;
      const hg = src.geometry.clone();
      const boneMap = new Map(body.skeleton.bones.map((b) => [b.name, b]));
      const bones = src.skeleton.bones.map((b) => boneMap.get(b.name));
      // bind space of this body: inv(bodyIB) * hairIB * hairBind
      const P = hg.attributes.position.array, si = hg.attributes.skinIndex.array, sw = hg.attributes.skinWeight.array;
      const n = P.length / 3; const ab = new Float32Array(n * 4);
      const mats = src.skeleton.bones.map((b, i) => { const bi = this.boneIndex.get(b.name); return new THREE.Matrix4().copy(body.skeleton.boneInverses[bi]).invert().multiply(src.skeleton.boneInverses[i]).multiply(src.bindMatrix); });
      for (let v = 0; v < n; v++) { _v2.set(0, 0, 0); for (let j = 0; j < 4; j++) { const w = sw[v * 4 + j]; if (!w) continue; _v.fromArray(P, v * 3).applyMatrix4(mats[si[v * 4 + j]]); _v2.addScaledVector(_v, w); } ab[v * 4] = _v2.x; ab[v * 4 + 1] = _v2.y; ab[v * 4 + 2] = _v2.z; }
      hg.setAttribute('aBind', new THREE.BufferAttribute(ab, 4));
      const m = new THREE.SkinnedMesh(hg, null); m.name = 'hair:' + hs;
      m.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses.map((x) => x.clone())), src.bindMatrix.clone());
      const hairU = { fGroove: { value: hairTex[set][1] }, fHairStyle: { value: new THREE.Vector4(opts.gild ?? 0, opts.groove ?? 1, 0, 0) } };
      const ho = { color: color(opts.color, 0x0c0808), finish: opts.finish ?? 'gloss', normalMap: hairTex[set][0], normalScale: opts.relief ?? 1.15, side: THREE.DoubleSide, uniforms: hairU, roughness: 0.32 };
      m.material = makeGlaze('hair', U, ho); m.userData.figMake = { kind: 'hair', opts: ho };
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      body.parent.add(m);
      this.hairMeshes.push(m);
    };
    if (hairG) addHair(hairG, hairStyle, spec.hair || {});
    if (beardG) addHair(beardG, 'beard', spec.beard || {});
    this.rig.meshes = []; model.traverse((o) => { if (o.isMesh) this.rig.meshes.push(o); });

    // ---- world-space things: chips, glitter, shards, fallen pieces, cloth
    this.world = new THREE.Group(); this.world.name = (spec.name || 'figurine') + ':world';
    this.chips = new Chips(240); this.world.add(this.chips.mesh);
    this.glitter = new Glitter(1600); this.world.add(this.glitter.points);
    this.shards = new Shatter(U, 1400); this.world.add(this.shards.group);
    this.pieces = [];   // broken-off accessories as rigid bodies

    // ---- accessories
    this.acc = [];
    const ctx = {
      I, U, hairStyle,
      find: (name) => this.acc.find((a) => a.name === name || a.type === name),
      mat: (kind, o) => this._accMat(kind, o),
    };
    for (const a of spec.accessories || []) {
      const fn = ACCESSORIES[a.type]; if (!fn) { console.warn('figurine: no accessory', a.type); continue; }
      const def = fn(ctx, a);
      const rec = { name: a.name || a.type, type: a.type, def, opts: a, broken: false, objects: [] };
      this._attach(rec);
      this.acc.push(rec);
    }
    this.rig.meshes = []; model.traverse((o) => { if (o.isMesh) this.rig.meshes.push(o); });

    // ---- expression state
    this.expr = { ...EXPRESSIONS.neutral }; this.exprTarget = { ...EXPRESSIONS.neutral }; this.exprName = 'neutral'; this.exprFade = 0.18;
    this.mouth = 0; this.mouthS = 0; this.blinkT = 2 + Math.random() * 3; this.blink = 0; this.gazeTarget = null; this.gazeS = new THREE.Vector2();
    this.damage = 0; this.hits = []; this.flashAge = 9; this.shattered = false;
    this.breakAge = [9, 9, 9, 9];
    this._applyExpr(0);
  }

  // ------------------------------------------------------------------------------------------
  _layerUniforms(i, l) {
    const u = this.bodyU;
    const fin = FINISH[l.finish || 'gloss'] || FINISH.gloss;
    const c = l.finish === 'gold' ? this.U.fGold.value.clone() : color(l.color, 0x101010);
    u.fLayCol.value[i].set(c.r, c.g, c.b, l.translucency ?? (0.12 + 0.55 * lum(c)));
    u.fLayMat.value[i].set(l.roughness ?? fin.rough, l.clearcoat ?? fin.coat, l.coatRough ?? fin.coatRough, fin.metal ?? 0);
    const p = l.pattern;
    if (p) { const c2 = p.color2 === 'gold' ? this.U.fGold.value : color(p.color2); u.fLayPat.value[i].set(PATTERN_ID[p.type] || 0, p.period, p.type === 'sequins' ? p.seed : p.dir, p.duty); u.fLayCol2.value[i].set(c2.r, c2.g, c2.b, 1); }
    else u.fLayPat.value[i].set(0, 0, 0, 0);
    const t = l.trim;
    if (t) { const tc = t.color === 'gold' ? this.U.fGold.value : color(t.color); u.fLayTrim.value[i].set(t.width, t.relief, t.double ? 1 : 0, 0); u.fLayTrimCol.value[i].set(tc.r, tc.g, tc.b, t.color === 'gold' ? 1 : (t.metal ?? 0)); }
    else u.fLayTrim.value[i].set(0, 0, 0, 0);
  }

  // a skinned, offset, smoothed copy of the body under layer i (cut per fragment at the layer's edge)
  _shell(i, o) {
    const I = this.I, body = this.body, src = body.geometry, f = this.fields[i];
    const mode = this.bodyU.fLayMode.value[i], mode2 = this.bodyU.fLayMode2.value[i];
    const cover = (v) => layerCPU(mode, mode2, f[v], new THREE.Vector3(I.pos[v * 3], I.pos[v * 3 + 1], I.pos[v * 3 + 2]));
    const margin = o.margin ?? 0.03;
    const cv = new Float32Array(I.nv); for (let v = 0; v < I.nv; v++) cv[v] = cover(v);
    const tris = [];
    for (let t = 0; t < I.nt; t++) { const a = I.idx[t * 3], b = I.idx[t * 3 + 1], c = I.idx[t * 3 + 2]; if (Math.max(cv[a], cv[b], cv[c]) > -margin && !I.interior[a]) tris.push(a, b, c); }
    // compact the vertex set, keeping the body's attributes
    const remap = new Map(), list = [];
    const ind = tris.map((v) => { if (!remap.has(v)) { remap.set(v, list.length); list.push(v); } return remap.get(v); });
    const n = list.length;
    const g = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(src.attributes)) {
      const it = attr.itemSize, A = new attr.array.constructor(n * it);
      list.forEach((v, k) => { for (let c = 0; c < it; c++) A[k * it + c] = attr.array[v * it + c]; });
      g.setAttribute(name, new THREE.BufferAttribute(A, it, attr.normalized));
    }
    g.setIndex(ind);
    // offset along the normals, smooth (Taubin, no shrink) on welded neighbours, never sink below the offset
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    const th = o.thickness ?? 0.006, minTh = Math.min(th, o.min ?? 0.0035);
    const base = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const v = list[k]; for (let c = 0; c < 3; c++) { base[k * 3 + c] = I.pos[v * 3 + c]; nrm[k * 3 + c] = I.nrm[v * 3 + c]; P[k * 3 + c] = I.pos[v * 3 + c] + I.nrm[v * 3 + c] * th; } }
    const wk = list.map((v) => I.weld[v]);
    const byW = new Map(); wk.forEach((w, k) => { if (!byW.has(w)) byW.set(w, []); byW.get(w).push(k); });
    const nbr = list.map((v, k) => { const out = []; for (const w2 of I.nbrA[wk[k]]) { const ks = byW.get(w2); if (ks) out.push(ks[0]); } return out; });
    const it = o.smooth ?? 6;
    for (let s2 = 0; s2 < it * 2; s2++) {
      const lam = s2 % 2 ? -0.53 : 0.5; const nxt = P.slice();
      for (let k = 0; k < n; k++) { const ns = nbr[k]; if (!ns.length) continue; for (let c = 0; c < 3; c++) { let a = 0; for (const j of ns) a += P[j * 3 + c]; a /= ns.length; nxt[k * 3 + c] = P[k * 3 + c] + lam * (a - P[k * 3 + c]); } }
      P.set(nxt);
      for (let k = 0; k < n; k++) { const d = (P[k * 3] - base[k * 3]) * nrm[k * 3] + (P[k * 3 + 1] - base[k * 3 + 1]) * nrm[k * 3 + 1] + (P[k * 3 + 2] - base[k * 3 + 2]) * nrm[k * 3 + 2]; if (d < minTh) for (let c = 0; c < 3; c++) P[k * 3 + c] += nrm[k * 3 + c] * (minTh - d); }
    }
    // welded copies share one position (no cracks along UV seams)
    for (const ks of byW.values()) if (ks.length > 1) { const a = [0, 0, 0]; for (const k of ks) for (let c = 0; c < 3; c++) a[c] += P[k * 3 + c]; for (const k of ks) for (let c = 0; c < 3; c++) P[k * 3 + c] = a[c] / ks.length; }
    g.computeVertexNormals();
    // seams of the UV layout split normals: average them across welded copies
    for (const ks of byW.values()) if (ks.length > 1) { const a = [0, 0, 0]; for (const k of ks) for (let c = 0; c < 3; c++) a[c] += N[k * 3 + c]; const l = Math.hypot(...a) || 1; for (const k of ks) for (let c = 0; c < 3; c++) N[k * 3 + c] = a[c] / l; }
    const opts = { ...this.bodyOpts, shell: i };
    const m = new THREE.SkinnedMesh(g, makeGlaze('body', this.U, opts));
    m.name = 'shell:' + i; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    m.bind(body.skeleton, body.bindMatrix);
    m.customDepthMaterial = body.customDepthMaterial;
    m.userData.figShell = { layer: i, opts };
    body.parent.add(m);
    this.shells.push(m);
  }

  _accMat(kind, o) {
    const local = {
      fAccStyle: { value: new THREE.Vector4() }, fAccCol2: { value: color(o.pattern?.color2, 0xffffff) },
      fAccTrim: { value: new THREE.Vector4() }, fAccGold: { value: o.goldTint || o.finish === 'gold' ? 1 : 0 },
    };
    if (o.trim) local.fAccTrim.value.set(o.trim.hem ?? 0, o.trim.waist ?? 0, o.trim.sides ?? 0, 0.0005);
    if (o.pattern) { const p = normPattern(o.pattern); local.fAccStyle.value.set(PATTERN_ID[p.type] || 0, o.pattern.u ?? 24, o.pattern.v ?? 8, p.duty); local.fAccCol2.value = color(p.color2); }
    if (o.uniforms) Object.assign(local, o.uniforms);
    const opts = { ...o, uniforms: local };
    const m = makeGlaze(kind, this.U, opts);
    if (o.map) m.map = o.map;
    m.userData.figMake = { kind, opts };
    return m;
  }

  boneInverse(name) { return this.body.skeleton.boneInverses[this.boneIndex.get(name)]; }
  // a bind-space placement -> the local matrix under a bone
  boneLocal(name, bindM) { return new THREE.Matrix4().copy(this.boneInverse(name)).multiply(bindM); }
  bindToWorld(p, bone) { return p.clone().applyMatrix4(this.boneInverse(bone.name)).applyMatrix4(bone.matrixWorld); }
  worldToBind(p, bone) { return p.clone().applyMatrix4(_m.copy(bone.matrixWorld).invert()).applyMatrix4(_m.copy(this.boneInverse(bone.name)).invert()); }
  boneAxisOffset(name, d) { const b = this.bones[name]; const c = b.children.find((x) => x.isBone); return c ? c.position.clone().setLength(d / this.scale) : new THREE.Vector3(0, d / this.scale, 0); }

  _attach(rec) {
    const def = rec.def;
    const pieces = def.multi || [{ root: def.root, bone: def.bone, bind: def.bind }];
    if (def.skinned) { def.build(this); rec.objects.push(def.root); return; }
    if (def.world) { this.world.add(def.root); rec.objects.push(def.root); }
    else if (def.local) { this.model.add(def.root); rec.objects.push(def.root); }
    else for (const p of pieces) {
      const bone = this.bones[p.bone];
      if (!bone) { console.warn('figurine: no bone', p.bone); continue; }
      // bind positions of every vertex (for the crack shader), then hang the piece under the bone
      p.root.updateMatrixWorld(true);
      p.root.traverse((o) => {
        if (!o.isMesh || o.geometry.attributes.aBind) return;
        o.geometry = o.geometry.clone();
        const P = o.geometry.attributes.position.array, n = P.length / 3, ab = new Float32Array(n * 4);
        const M = new THREE.Matrix4().multiplyMatrices(p.bind, o.matrixWorld);
        if (o.isInstancedMesh) { const im = new THREE.Matrix4(); o.getMatrixAt(0, im); M.multiply(im); }
        for (let i = 0; i < n; i++) { _v.fromArray(P, i * 3).applyMatrix4(M); ab[i * 4] = _v.x; ab[i * 4 + 1] = _v.y; ab[i * 4 + 2] = _v.z; }
        o.geometry.setAttribute('aBind', new THREE.BufferAttribute(ab, 4));
      });
      const local = this.boneLocal(p.bone, p.bind);
      local.decompose(p.root.position, p.root.quaternion, p.root.scale);
      bone.add(p.root); rec.objects.push(p.root);
    }
    if (def.build) def.build(this);
    rec.home = rec.objects.map((o) => ({ obj: o, parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
  }

  // ------------------------------------------------------------------------------------------
  setExpression(name, { fade = 0.16 } = {}) {
    const e = EXPRESSIONS[name]; if (!e) { console.warn('figurine: no expression', name); return; }
    this.exprName = name; this.exprTarget = { ...e }; this.exprFade = Math.max(0.01, fade);
  }
  setMouth(m) { this.mouth = Math.max(0, Math.min(1, m)); }
  lookAt(p) { this.gazeTarget = p ? p.clone() : null; }

  _applyExpr(dt) {
    const k = dt > 0 ? 1 - Math.exp(-dt / (this.exprFade * 0.45)) : 1;
    for (const key in this.exprTarget) this.expr[key] += (this.exprTarget[key] - this.expr[key]) * k;
    const e = this.expr;
    // lip-sync on top: the jaw opens, the lips round a little
    this.mouthS += (this.mouth - this.mouthS) * (dt > 0 ? 1 - Math.exp(-dt * 30) : 1);
    const jaw = Math.min(1, e.jaw + this.mouthS * (1 - e.jaw * 0.6) * 0.95);
    const bu = this.bodyU;
    bu.fFaceA.value.set(jaw, e.smileL, e.smileR, Math.max(e.pucker, this.mouthS * 0.25));
    bu.fFaceB.value.set(e.browIL, e.browOL, e.browIR, e.browOR);
    bu.fFaceC.value.set(e.sneer, e.pout, e.cheek, 0);
    // blinks (not while the eyes are shut with delight)
    if (dt > 0) { this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 2.5 + Math.random() * 4; } this.blink = Math.max(0, this.blink - dt / 0.13); }
    const bl = Math.sin(Math.min(1, this.blink) * Math.PI) * (1 - e.happy);
    const lt = Math.max(e.lidT, bl * 1.02), lb = Math.max(e.lidB, bl * 0.35);
    this.eyeU.fLidL.value.set(lt, lb, e.happy, 0); this.eyeU.fLidR.value.set(lt, lb, e.happy, 0);
    // gaze
    let gx = 0, gy = e.gazeY;
    if (this.gazeTarget && this.bones.Head) {
      const p = this.worldToBind(this.gazeTarget, this.bones.Head);
      const c = this.I.headC; const dx = p.x - c.x, dy = p.y - (this.I.EYE.l.c.y), dz = p.z - c.z;
      if (dz > 0.05) { gx = Math.max(-0.32, Math.min(0.32, dx / dz * 0.6)); gy += Math.max(-0.2, Math.min(0.2, dy / dz * 0.6)); }
    }
    this.gazeS.x += (gx - this.gazeS.x) * (dt > 0 ? 1 - Math.exp(-dt * 12) : 1);
    this.gazeS.y += (gy - this.gazeS.y) * (dt > 0 ? 1 - Math.exp(-dt * 12) : 1);
    this.eyeU.fIris.value.set(this.gazeS.x, this.gazeS.y, e.iris, e.pupil);
  }

  // ------------------------------------------------------------------------------------------
  setDamage(d) { this.damage = Math.max(0, Math.min(1, d)); this.U.fDamage.value = this.damage; }

  // the glaze colour on the body at vertex v (what a chip from there looks like)
  colorAt(v) {
    let c = this.bodyU.fSkin.value.clone();
    const p = new THREE.Vector3(this.I.pos[v * 3], this.I.pos[v * 3 + 1], this.I.pos[v * 3 + 2]);
    this.layers.forEach((l, i) => { const d = layerCPU(this.bodyU.fLayMode.value[i], this.bodyU.fLayMode2.value[i], this.fields[i][v], p); if (d > 0) { const lc = this.bodyU.fLayCol.value[i]; c.setRGB(lc.x, lc.y, lc.z); if (l.trim && d < l.trim.width) c.copy(l.trim.color === 'gold' ? this.U.fGold.value : color(l.trim.color)); } });
    return c;
  }

  // a flash of colour from her heart outward: her tell before she hits back (the next hit's flash is its own colour)
  tell(color = new THREE.Color(3.2, 0.42, 1.5)) {
    if (this.shattered) return;
    this.U.fFlashColor.value.copy(color); this._tellColor = true;
    this.U.fFlash.value.set(0, this.I.Y.bust, 0.05, 0); this.flashAge = 0;
  }
  hitAt(worldPos, dir = new THREE.Vector3(0, 0, -1), { power = 1, chips = true } = {}) {
    if (this.shattered) return null;
    if (this._tellColor) { this.U.fFlashColor.value.setRGB(1.0, 0.85, 0.55); this._tellColor = false; }
    this.root.updateWorldMatrix(true, true);
    const I = this.I, set = I.hitSet;
    const P = new Float32Array(set.length * 3);
    skinVerts(this.body, set, P, null);
    let best = 0, bd = Infinity;
    for (let k = 0; k < set.length; k++) { const d = (P[k * 3] - worldPos.x) ** 2 + (P[k * 3 + 1] - worldPos.y) ** 2 + (P[k * 3 + 2] - worldPos.z) ** 2; if (d < bd) { bd = d; best = k; } }
    const v = set[best];
    const bind = new THREE.Vector3(I.pos[v * 3], I.pos[v * 3 + 1], I.pos[v * 3 + 2]);
    const world = new THREE.Vector3(P[best * 3], P[best * 3 + 1], P[best * 3 + 2]);
    // merge with a nearby crack seed or start a new one
    let h = this.hits.find((x) => x.p.distanceTo(bind) < 0.07);
    if (h) { h.s = Math.min(3, h.s + power * 0.6); }
    else {
      if (this.hits.length >= 16) { this.hits.sort((a, b) => a.s - b.s); const o = this.hits[0]; const near = this.hits.slice(1).reduce((m, x) => (x.p.distanceTo(o.p) < m.p.distanceTo(o.p) ? x : m), this.hits[1]); near.s += o.s * 0.5; this.hits.shift(); }
      h = { p: bind, s: power, r: 0 }; this.hits.push(h);
    }
    this.U.fFlash.value.set(bind.x, bind.y, bind.z, 0); this.flashAge = 0; this.pop = Math.min(1.2, 0.55 + 0.35 * power);
    const col = this.colorAt(v);
    if (chips) this.chips.burst(world, dir.clone().normalize(), col, Math.round(8 + 8 * power), 2.4 + power, this.scale * 1.35);
    // a flinch away from the blow
    _q.copy(this.root.quaternion).invert();
    this.rig.flinch = Math.min(1, 0.55 * power + 0.2); this.rig.flinchDir.copy(dir).applyQuaternion(_q).normalize();
    this._event('hit', { world, bind, color: col, power });
    return { bind, world, color: col };
  }

  _event(type, data) { if (this.onEvent) this.onEvent(type, data); }

  // ------------------------------------------------------------------------------------------
  breakPiece(name) {
    if (this.shattered) return null;
    if (!name) name = (this.spec.breaks || []).find((n) => !this._isBroken(n));
    if (!name) return null;
    this.root.updateWorldMatrix(true, true);
    const acc = this.acc.find((a) => (a.name === name || a.type === name) && !a.broken);
    if (acc) return this._breakAcc(acc);
    const part = this.parts.find((p) => p.name === name && !p.broken);
    if (part) return this._breakPart(part);
    if (PARTS[name] && !this.parts.some((p) => p.name === name)) console.warn('figurine: body part', name, 'is not in spec.breaks (its mask is baked at build time)');
    return null;
  }
  _isBroken(n) { const a = this.acc.find((x) => x.name === n || x.type === n); if (a) return a.broken; const p = this.parts.find((x) => x.name === n); return p ? p.broken : true; }

  _breakAcc(acc) {
    acc.broken = true; acc.def.broken = true; acc.pivots = [];
    const center = this._center();
    let at = center.clone();
    if (acc.def.cloth) { acc.def.onBreak && acc.def.onBreak(); at = acc.def.root.geometry.boundingSphere ? acc.def.root.geometry.boundingSphere.center.clone() : at; }
    else for (const obj0 of acc.objects) {
      // fall as one rigid piece, pivoting about its own centre
      obj0.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj0);
      const pivot = new THREE.Group(); box.getCenter(pivot.position); this.world.add(pivot); pivot.updateMatrixWorld(true);
      pivot.attach(obj0);
      const obj = pivot;
      const pts = []; obj.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
      obj.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; const step = Math.max(1, Math.floor(p.count / 60)); const M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); for (let i = 0; i < p.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(M)); });
      const wp = obj.getWorldPosition(new THREE.Vector3()); at = wp.clone();
      const sup = supportPoints(pts);
      let rad = 0.05; for (const p of pts) rad = Math.max(rad, p.length());
      const b = new Body(sup, { radius: rad, restitution: 0.3, friction: 0.6 });
      b.pos.copy(wp); obj.getWorldQuaternion(b.q);
      const away = wp.clone().sub(center).setY(0).normalize();
      b.vel.copy(away).multiplyScalar(1.6 + Math.random()).add(new THREE.Vector3(0, 2.6 + Math.random(), 0));
      b.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(9);
      b.obj = obj; b.objScale = obj.scale.clone();
      this.pieces.push(b); acc.pivots.push(pivot);
    }
    this.chips.burst(at, new THREE.Vector3(0, -1, 0), this._accColor(acc), 16, 3.2, this.scale);
    this.glitter.burst(at, 60, [new THREE.Color(1, 0.8, 0.4), new THREE.Color(1, 1, 1)], 0.5, 1.5);
    this._event('break', { name: acc.name, world: at });
    return { name: acc.name, world: at };
  }
  _accColor(acc) { let c = new THREE.Color(1, 1, 1); for (const o of acc.objects) o.traverse((m) => { if (m.isMesh && m.material && m.material.color && !m.material.userData.figMake?.opts?.goldTint) c = m.material.color.clone(); }); return c; }

  _breakPart(part) {
    part.broken = true;
    const s = part.slot;
    const U = this.U;
    if (part.kind === 'off') U.fOff.value.setComponent(s, 1); else U.fShell.value.setComponent(s, 1);
    this.breakAge[s] = 0;
    // the chunk that flies: this part's triangles in the current pose, as one shard (planned in advance)
    this.prepareShatter();
    const center = this._center();
    const { P, N } = this._pose(this.body);
    const bodies = this.shards.fire(part.plan, P, N, { center, power: 0.6 }) || [];
    const b = bodies[0];
    let at = center;
    if (b) { at = b.pos.clone(); const away = b.pos.clone().sub(center).setY(0).normalize(); b.vel.copy(away).multiplyScalar(1.8).add(new THREE.Vector3(0, 2.4, 0)); b.w.multiplyScalar(0.4); }
    this.chips.burst(at, new THREE.Vector3(0, -1, 0), this.bodyU.fSkin.value, 18, 3.4, this.scale);
    this._event('break', { name: part.name, world: at });
    return { name: part.name, world: at };
  }

  // the rewind: keep the first n entries of spec.breaks (or the named pieces) broken, put the rest back
  restorePieces(n = 0) {
    const keep = new Set(Array.isArray(n) ? n : (this.spec.breaks || []).slice(0, n));
    for (const a of this.acc) if (a.broken && !keep.has(a.name) && !keep.has(a.type)) this._restoreAcc(a);
    for (const p of this.parts) if (p.broken && !keep.has(p.name)) this._restorePart(p);
  }
  _restoreAcc(a) {
    a.broken = false; a.def.broken = false;
    if (a.def.cloth) { a.def.cloth.pinned = true; a.def.cloth.init = false; a.def.root.visible = true; return; }
    for (const pv of a.pivots || []) { this.pieces = this.pieces.filter((b) => b.obj !== pv); pv.parent && pv.parent.remove(pv); }
    a.pivots = [];
    for (const h of a.home || []) { h.parent.add(h.obj); h.obj.position.copy(h.p); h.obj.quaternion.copy(h.q); h.obj.scale.copy(h.s); h.obj.visible = true; }
    if (a.def.chains) for (const c of a.def.chains) { c.init = false; for (const l of c.links) l.visible = true; }
  }
  _restorePart(p) {
    p.broken = false;
    if (p.kind === 'off') this.U.fOff.value.setComponent(p.slot, 0); else this.U.fShell.value.setComponent(p.slot, 0);
    this.breakAge[p.slot] = 9;
    if (p.plan) this.shards.reset(p.plan);
  }
  // back to new: unbroken, uncracked, unshattered (a retry, practice from a section)
  reset() {
    for (const pl of this.shards.plans) this.shards.reset(pl);
    this.shattered = false; this.model.visible = true;
    for (const a of this.acc) { if (a.broken || a.pivots?.length) this._restoreAcc(a); for (const o of a.objects) o.visible = true; }
    for (const p of this.parts) if (p.broken) this._restorePart(p);
    this.hits = []; this.U.fHitN.value = 0; this.setDamage(0);
    this.chips.clear(); this.glitter.clear();
    this.flashAge = 9; this.pop = 0; this.shatterAge = undefined; this.U.fShardGlow.value = 0;
    this.setExpression('neutral', { fade: 0.01 }); this.setMouth(0);
  }

  _center() { const p = this.bones.spine_02 ? this.bones.spine_02.getWorldPosition(new THREE.Vector3()) : this.root.getWorldPosition(new THREE.Vector3()); return p; }

  _bodyAttrs(mesh) {
    const g = mesh.geometry; const attrs = {};
    for (const k of ['aBind', 'aPat', 'aMisc', 'aLayA', 'aLayB', 'aPart', 'uv']) if (g.attributes[k]) attrs[k] = g.attributes[k];
    return { index: g.index.array, attrs };
  }
  // world positions and normals of a mesh's vertices right now (skinned, rigid, or merged instances)
  _pose(mesh, geo = mesh.geometry) {
    const n = geo.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3);
    if (mesh.isSkinnedMesh) skinVerts(mesh, null, P, N);
    else { const tmp = new THREE.Mesh(geo); tmp.matrixWorld.copy(mesh.matrixWorld); rigidVerts(tmp, P, N); }
    return { P, N };
  }
  _shardMat(kind, opts) {
    this._shardMats = this._shardMats || new Map();
    if (!this._shardMats.has(opts)) this._shardMats.set(opts, makeGlaze(kind, this.U, { ...opts, shard: true, side: THREE.FrontSide }));
    const m = this._shardMats.get(opts);
    if (opts.map) m.map = opts.map;
    return m;
  }

  // the shatter is planned once (bind space: pose independent): fracture cells, walls, inner caps
  prepareShatter() {
    if (this._plans) return this._plans;
    const I = this.I, plans = [];
    // break chunks for the breakable body parts
    for (const part of this.parts) {
      const idx = I.idx, nt = I.nt, clusterOf = new Int32Array(nt).fill(-1);
      for (let t = 0; t < nt; t++) { const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2]; if ((part.field[a] + part.field[b] + part.field[c]) / 3 > 0.5) clusterOf[t] = 0; }
      part.plan = this.shards.plan(clusters(this._bodyAttrs(this.body), clusterOf), () => this._shardMat('body', this.bodyOpts), { thickness: part.kind === 'off' ? 0.012 : 0.005, keepGlaze: true, name: part.name });
    }
    // body: the face flies as one mask
    const g = this.body.geometry, idx = g.index.array, nt = idx.length / 3;
    const faceF = partField(I, 'face');
    const fixed = new Array(nt).fill(null);
    for (let t = 0; t < nt; t++) { const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2]; if ((faceF[a] + faceF[b] + faceF[c]) / 3 > 0.55) fixed[t] = 1; }
    const ab = g.attributes.aBind.array;
    plans.push({ mesh: this.body, name: 'body', plan: this.shards.plan(fracture(this._bodyAttrs(this.body), seedsFor(ab, 4, 0.09, new THREE.Vector3(0, I.Y.bust, 0.1), 0.6), 0.09, fixed), () => this._shardMat('body', this.bodyOpts), { thickness: 0.009, name: 'body' }), body: true });
    for (const sh of this.shells) plans.push({ mesh: sh, name: sh.name, plan: this.shards.plan(fracture(this._bodyAttrs(sh), seedsFor(sh.geometry.attributes.aBind.array, 4, 0.09), 0.09), () => this._shardMat('body', sh.userData.figShell.opts), { thickness: 0.007, name: sh.name }), body: true });
    for (const h of this.hairMeshes) {
      const hg = h.geometry;
      plans.push({ mesh: h, name: h.name, plan: this.shards.plan(fracture({ index: hg.index.array, attrs: { aBind: hg.attributes.aBind, uv: hg.attributes.uv } }, seedsFor(hg.attributes.aBind.array, 4, 0.06), 0.06), () => this._shardMat('hair', h.userData.figMake.opts), { thickness: 0.006, name: h.name }) });
    }
    if (this.eyes) {
      const eg = this.eyes.geometry, ei = eg.index.array, ecl = new Int32Array(ei.length / 3);
      for (let t = 0; t < ecl.length; t++) ecl[t] = eg.attributes.position.array[ei[t * 3] * 3] > 0 ? 0 : 1;
      plans.push({ mesh: this.eyes, name: 'eyes', plan: this.shards.plan(clusters({ index: ei, attrs: { aBind: eg.attributes.aBind, uv: eg.attributes.uv } }, ecl), () => this._shardMat('eye', this.eyeOpts), { thickness: 0.004, name: 'eyes' }) });
    }
    for (const a of this.acc) {
      if (a.def.cloth) continue;
      for (const obj of a.objects) obj.traverse((o) => {
        const make = o.isMesh && o.material?.userData?.figMake; if (!make) return;
        let geo = o.geometry;
        let cl = null;
        if (o.isInstancedMesh) {
          const parts = []; const im = new THREE.Matrix4();
          for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); const gg = geo.clone().applyMatrix4(im); gg.setAttribute('aInst', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count).fill(i), 1)); parts.push(gg); }
          geo = mergeSimple(parts);
          cl = new Int32Array(geo.index.count / 3); for (let t = 0; t < cl.length; t++) cl[t] = geo.attributes.aInst.array[geo.index.array[t * 3]];
        }
        if (!geo.index) withIndex(geo);
        const n = geo.attributes.position.count;
        if (!geo.attributes.aBind) geo.setAttribute('aBind', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
        if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
        const src = { index: geo.index.array, attrs: { aBind: geo.attributes.aBind, uv: geo.attributes.uv } };
        let fr;
        if (cl) fr = clusters(src, cl);
        else {
          const bb = new THREE.Box3().setFromBufferAttribute(geo.attributes.position); const size = bb.getSize(new THREE.Vector3()).length() * this.scale;
          const cell = Math.max(0.03, Math.min(0.07, size / 3));
          // rigid pieces fracture in their own space (their crack coordinates may all coincide)
          const local = new THREE.BufferAttribute(new Float32Array(n * 4), 4); const pa = geo.attributes.position.array;
          for (let i = 0; i < n; i++) { local.array[i * 4] = pa[i * 3] * this.scale; local.array[i * 4 + 1] = pa[i * 3 + 1] * this.scale; local.array[i * 4 + 2] = pa[i * 3 + 2] * this.scale; }
          const fsrc = { index: src.index, attrs: { aBind: local, uv: src.attrs.uv, aB2: geo.attributes.aBind } };
          fr = fracture(fsrc, seedsFor(local.array, 4, cell), cell);
          fr.attrs.aBind = fr.attrs.aB2; delete fr.attrs.aB2;
        }
        plans.push({ mesh: o, geo, acc: a, name: o.name, plan: this.shards.plan(fr, () => this._shardMat(make.kind, make.opts), { thickness: 0.004, name: o.name }) });
      });
    }
    this._plans = plans;
    return plans;
  }

  // ------------------------------------------------------------------------------------------
  shatter({ dir = new THREE.Vector3(0, 0, -1), power = 1, at = null } = {}) {
    if (this.shattered) return;
    this.shattered = true;
    this.root.updateWorldMatrix(true, true);
    const center = this._center();
    const I = this.I;
    const impact = { pos: at || center, dir: dir.clone().normalize() };
    const plans = this.prepareShatter();
    const fOff = this.U.fOff.value;
    for (const p of plans) {
      if (!p.plan || (p.acc && p.acc.broken)) continue;
      if (p.mesh.visible === false) continue;
      const { P, N } = this._pose(p.mesh, p.geo || p.mesh.geometry);
      const bodies = this.shards.fire(p.plan, P, N, { impact, center, power }) || [];
      // pieces of a body part that already broke off stay gone
      if (p.body && (fOff.x + fOff.y + fOff.z + fOff.w) > 0) {
        const part = p.plan.attrs.aPart.array, gone = [];
        for (const b of bodies) {
          const fv = p.plan.shardFront[b.local]; let sum = 0;
          for (const i of fv) sum += part[i * 4] * fOff.x + part[i * 4 + 1] * fOff.y + part[i * 4 + 2] * fOff.z + part[i * 4 + 3] * fOff.w;
          if (sum / Math.max(1, fv.length) > 0.5) gone.push(b);
        }
        this.shards.drop(gone);
      }
    }
    for (const a of this.acc) {
      if (a.broken) continue;
      if (a.def.cloth) { a.def.onBreak && a.def.onBreak(); continue; }
      a.broken = true;
      for (const obj of a.objects) obj.visible = false;
      if (a.def.chains) for (const c of a.def.chains) for (const l of c.links) l.visible = false;
    }
    this.model.visible = false;
    this.shards.write();
    // glitter and a burst of chips
    const pal = [new THREE.Color(1, 0.82, 0.42), new THREE.Color(1, 0.95, 0.85), new THREE.Color(1, 0.55, 0.75), this.layers[0] ? new THREE.Color(this.bodyU.fLayCol.value[0].x, this.bodyU.fLayCol.value[0].y, this.bodyU.fLayCol.value[0].z).lerp(new THREE.Color(1, 1, 1), 0.3) : new THREE.Color(1, 1, 1)];
    this.glitter.burst(center.clone().add(new THREE.Vector3(0, 0.1, 0)), 1200, pal, 1.4 * this.scale, 3.2 * power);
    this.chips.burst(center, impact.dir, this.bodyU.fSkin.value, 40, 4.5 * power, this.scale);
    this.U.fFlash.value.set(0, I.Y.bust, 0.05, 0); this.flashAge = 0; this.shatterAge = 0;
    this._event('shatter', { world: center });
  }

  // plan the shatter (and the break chunks), compile every shader this figurine can need and upload the
  // planned shard meshes, so nothing hitches mid-fight. Returns a promise (shaders compile in parallel).
  prepare(renderer, camera, scene = this.root.parent) {
    this.prepareShatter();
    if (!renderer) return Promise.resolve();
    const done = () => { this.shards.upload(renderer, camera, scene); };
    // compiled for what the game draws into (a linear HDR target, not the screen), with the room's lights:
    // otherwise the finishing blow compiles the shatter on the spot and the game stops for a second
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }), prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    if (renderer.compileAsync) {
      const tmp = new THREE.Scene(); tmp.add(this.shards.group);
      const ps = Promise.all([renderer.compileAsync(this.root, camera, scene), renderer.compileAsync(this.world, camera, scene), renderer.compileAsync(tmp, camera, scene)]);
      renderer.setRenderTarget(prev);
      this.world.add(this.shards.group);
      return ps.then(done).finally(() => rt.dispose());
    }
    renderer.compile(this.root, camera, scene); renderer.compile(this.world, camera, scene);
    renderer.setRenderTarget(prev); rt.dispose();
    done();
    return Promise.resolve();
  }

  // ------------------------------------------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 0.1);
    this.t += dt; this.U.fTime.value = this.t;
    if (!this.world.parent && this.root.parent) this.root.parent.add(this.world);
    this._applyExpr(dt);
    if (!this.shattered) this.rig.update(dt);
    this.root.updateWorldMatrix(true, true);
    for (const a of this.acc) if (a.def.update && (!a.broken || a.def.cloth || (a.def.alwaysUpdate && !this.shattered))) a.def.update(dt, this);
    // crack seeds grow toward their radius (bigger with damage and with repeated hits)
    const H = this.U.fHits.value;
    this.hits.forEach((h, i) => {
      const target = (0.05 + 0.24 * this.damage) * (0.55 + 0.45 * Math.min(2.5, h.s));
      h.r += (target - h.r) * (1 - Math.exp(-dt * 7));
      H[i].set(h.p.x, h.p.y, h.p.z, h.r);
    });
    this.U.fHitN.value = this.hits.length;
    this.flashAge += dt; this.U.fFlash.value.w = this.flashAge;
    if (this.shatterAge !== undefined) { this.shatterAge += dt; this.U.fShardGlow.value = (0.9 * Math.exp(-this.shatterAge * 2.5) + 0.06) * Math.min(1, FXK.value); }
    // the white pop on a hit: quieter in a dark room raised by exposure (a combo strobed her pale)
    // her silhouette keeps a pale rim, so she reads on a dark floor (scaled like every glow: FXK)
    if (this.U.fRim) this.U.fRim.value.setRGB(0.42, 0.36, 0.48).multiplyScalar((this.rimK ?? 1) * 0.55 * Math.min(1.2, FXK.value));
    this.pop = Math.max(0, (this.pop || 0) - dt * 14); this.U.fHitPop.value = Math.max(this.pop * 0.75, (this.hardK || 0) * 0.32) * Math.min(1, FXK.value);
    for (let s = 0; s < 4; s++) this.breakAge[s] += dt;
    this.U.fBreakAge.value.set(...this.breakAge);
    // debris
    const clink = (b, speed) => this._event('clink', { world: b.pos, speed });
    this.chips.update(dt, this.floorY);
    this.glitter.update(dt, this.floorY, this.t);
    this.shards.update(dt, this.floorY, clink);
    for (const b of this.pieces) { b.step(dt, this.floorY, clink); b.obj.position.copy(b.pos); b.obj.quaternion.copy(b.q); }
  }

  dispose() {
    this.root.parent && this.root.parent.remove(this.root);
    this.world.parent && this.world.parent.remove(this.world);
    const done = new Set();
    for (const g of [this.root, this.world]) g.traverse((o) => { if (o.geometry && !done.has(o.geometry)) { o.geometry.dispose(); done.add(o.geometry); } if (o.material && !done.has(o.material)) { o.material.dispose(); done.add(o.material); } });
    this.face.texture.dispose(); this.shards.tex.dispose();
  }
}

function layerCPU(m, m2, a, p) {
  if (m.x < 0.5) return a;
  if (m.x < 1.5) { const w = p.y < m2.y ? m.y * Math.pow(Math.max(0, (p.y - m2.x) / (m2.y - m2.x)), 0.8) : m.z; return Math.min(a, w - a, p.y - m2.x, m.w - Math.abs(p.x)); }
  if (m.x < 2.5) return Math.min(m.y - Math.abs(p.y - m.z), a);
  const dx = m2.x - m.z, dy = m2.y - m.w, l = Math.hypot(dx, dy);
  return Math.min(m.y - Math.abs((p.x - m.z) * dy - (p.y - m.w) * dx) / l, a);
}
function withIndex(g) { const n = g.attributes.position.count; g.setIndex(Array.from({ length: n }, (_, i) => i)); return g; }
function mergeSimple(geos) {
  const out = new THREE.BufferGeometry(); const names = Object.keys(geos[0].attributes);
  for (const k of names) { const s = geos[0].attributes[k].itemSize; const arr = []; for (const g of geos) arr.push(...g.attributes[k].array); out.setAttribute(k, new THREE.Float32BufferAttribute(arr, s)); }
  const ind = []; let off = 0; for (const g of geos) { const gi = g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, i) => i); for (const i of gi) ind.push(i + off); off += g.attributes.position.count; }
  out.setIndex(ind); return out;
}
