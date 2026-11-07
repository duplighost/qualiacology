// Body analysis for the porcelain figurines: everything the glaze needs to paint an outfit on a bare
// Quaternius body, computed once per body from its bind pose (a T-pose: arms along ±x, y up, facing +z).
//  - bone groups and per-vertex group weights (torso, neck, head, arms, hands, legs, feet)
//  - continuous body coordinates: height, arc length along each arm and leg (negative inside the torso)
//  - fabric coordinates per region (angle around the limb or torso, length along it) and a "purity"
//    that fades patterns where two regions' coordinate systems meet (the garment seams)
//  - curvature at two scales (glaze pools in hollows, thins on edges)
//  - landmarks: named heights, joint positions, eyes, mouth, jaw hinge, the face's UV<->xy map,
//    the eye-socket rims and lip outline in UV (for the face painter)
// Then, per costume, layer fields: a signed distance (metres, + inside) for every painted garment.
import * as THREE from 'three';

const FINGERS = ['index', 'middle', 'pinky', 'ring', 'thumb'];
export const G = { torso: 0, neck: 1, head: 2, arm_l: 3, hand_l: 4, arm_r: 5, hand_r: 6, leg_l: 7, foot_l: 8, leg_r: 9, foot_r: 10 };
const NG = 11;
export const REGION = { torso: 0, head: 1, arm_l: 2, arm_r: 3, leg_l: 4, leg_r: 5 };

export function boneGroup(name) {
  if (name === 'Head') return G.head;
  if (name === 'neck_01') return G.neck;
  const s = name.endsWith('_l') ? 'l' : name.endsWith('_r') ? 'r' : '';
  if (/^(upperarm|lowerarm)_/.test(name)) return G['arm_' + s];
  if (/^hand_/.test(name) || FINGERS.some((f) => name.startsWith(f + '_'))) return G['hand_' + s];
  if (/^(thigh|calf)_/.test(name)) return G['leg_' + s];
  if (/^(foot|ball)/.test(name)) return G['foot_' + s];
  return G.torso;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------------------------
// the sculpt's lips are joined along their parting line; duplicate the vertices there (and split the
// mouth's interior plate) so the jaw can open a real gap. Returns a new geometry.
function splitMouth(geo, headIdx) {
  const pos = geo.attributes.position.array, uv = geo.attributes.uv.array, si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array;
  const idx = geo.index.array, nv = pos.length / 3, nt = idx.length / 3;
  const hw = (v) => { let s = 0; for (let k = 0; k < 4; k++) if (si[v * 4 + k] === headIdx) s += sw[v * 4 + k]; return s; };
  let my = 0, mn = 0, x0 = 9, x1 = -9, mz = -9;
  for (let v = 0; v < nv; v++) if (hw(v) > 0.5 && uv[v * 2 + 1] > 0.55 && uv[v * 2] < 0.2) { my += pos[v * 3 + 1]; mn++; x0 = Math.min(x0, pos[v * 3]); x1 = Math.max(x1, pos[v * 3]); mz = Math.max(mz, pos[v * 3 + 2]); }
  if (!mn) return { geo, lower: new Uint8Array(nv) };
  my /= mn; const half = (x1 - x0) / 2;
  const inMouth = (v) => hw(v) > 0.5 && Math.abs(pos[v * 3]) < half * 0.9 && Math.abs(pos[v * 3 + 1] - my) < 0.009 && pos[v * 3 + 2] > mz - 0.03;
  // triangles of the lower lip / lower interior, by their centroid
  const lowerTri = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    if (!(inMouth(a) && inMouth(b) && inMouth(c))) continue;
    const cy = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
    if (cy < my) lowerTri[t] = 1;
  }
  // vertices used by both an upper and a lower mouth triangle get a lower copy
  const usedUpper = new Uint8Array(nv), usedLower = new Uint8Array(nv);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; if (lowerTri[t]) usedLower[v] = 1; else usedUpper[v] = 1; }
  const dup = new Map(); let next = nv;
  for (let v = 0; v < nv; v++) if (usedLower[v] && usedUpper[v] && inMouth(v)) dup.set(v, next++);
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const it = attr.itemSize, A = new attr.array.constructor(next * it);
    A.set(attr.array);
    for (const [v, d] of dup) for (let c = 0; c < it; c++) A[d * it + c] = attr.array[v * it + c];
    out.setAttribute(name, new THREE.BufferAttribute(A, it, attr.normalized));
  }
  const ni = new (next > 65535 ? Uint32Array : Uint16Array)(idx.length);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; ni[t * 3 + k] = lowerTri[t] && dup.has(v) ? dup.get(v) : v; }
  out.setIndex(new THREE.BufferAttribute(ni, 1));
  const lower = new Uint8Array(next);
  for (let t = 0; t < nt; t++) if (lowerTri[t]) for (let k = 0; k < 3; k++) lower[ni[t * 3 + k]] = 1;
  const upper = new Uint8Array(next);
  for (let t = 0; t < nt; t++) if (!lowerTri[t]) for (let k = 0; k < 3; k++) { const v = ni[t * 3 + k]; if (inMouth(v < nv ? v : v)) upper[v] = 1; }
  return { geo: out, lower, upper, splitCount: dup.size };
}

export function analyzeBody(body, eyes, lipsImage) {
  const geo0 = body.geometry;
  if (geo0.userData.fig) return geo0.userData.fig;
  const headIdx = body.skeleton.bones.findIndex((b) => b.name === 'Head');
  const split = splitMouth(geo0, headIdx);
  const geo = split.geo;
  const pos = geo.attributes.position.array, nrm = geo.attributes.normal.array, uv = geo.attributes.uv.array;
  const si = geo.attributes.skinIndex.array, sw = geo.attributes.skinWeight.array;
  const idx = geo.index.array;
  const nv = pos.length / 3, nt = idx.length / 3;
  const bones = body.skeleton.bones;
  const boneG = bones.map((b) => boneGroup(b.name));

  // joints in bind (mesh) space
  const J = {};
  const bindInv = body.bindMatrixInverse;
  bones.forEach((b, i) => { const m = new THREE.Matrix4().copy(body.skeleton.boneInverses[i]).invert().premultiply(bindInv); J[b.name] = new THREE.Vector3().setFromMatrixPosition(m); });
  const side = J.upperarm_l.x > 0 ? 1 : -1; // sign of x on the _l side

  // group weights
  const gw = new Float32Array(nv * NG);
  for (let v = 0; v < nv; v++) for (let k = 0; k < 4; k++) { const w = sw[v * 4 + k]; if (w > 0) gw[v * NG + boneG[si[v * 4 + k]]] += w; }
  const gW = (v, g) => gw[v * NG + g];

  // weld by position (UV seams split vertices), adjacency on the welded mesh
  const weld = new Int32Array(nv), wmap = new Map(); let nw = 0; const wRep = [];
  for (let v = 0; v < nv; v++) {
    const k = Math.round(pos[v * 3] * 2e4) + ',' + Math.round(pos[v * 3 + 1] * 2e4) + ',' + Math.round(pos[v * 3 + 2] * 2e4);
    let w = wmap.get(k); if (w === undefined) { w = nw++; wmap.set(k, w); wRep.push(v); } weld[v] = w;
  }
  const nbr = Array.from({ length: nw }, () => new Set());
  const edgeCount = new Map();
  for (let t = 0; t < nt; t++) {
    const a = weld[idx[t * 3]], b = weld[idx[t * 3 + 1]], c = weld[idx[t * 3 + 2]];
    nbr[a].add(b); nbr[a].add(c); nbr[b].add(a); nbr[b].add(c); nbr[c].add(a); nbr[c].add(b);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? p * nw + q : q * nw + p; edgeCount.set(k, (edgeCount.get(k) || 0) + 1); }
  }
  const nbrA = nbr.map((s) => [...s]);
  // welded normals (average)
  const wn = new Float32Array(nw * 3), wp = new Float32Array(nw * 3);
  for (let v = 0; v < nv; v++) { const w = weld[v]; for (let c = 0; c < 3; c++) { wn[w * 3 + c] += nrm[v * 3 + c]; wp[w * 3 + c] = pos[v * 3 + c]; } }
  for (let w = 0; w < nw; w++) { const l = Math.hypot(wn[w * 3], wn[w * 3 + 1], wn[w * 3 + 2]) || 1; wn[w * 3] /= l; wn[w * 3 + 1] /= l; wn[w * 3 + 2] /= l; }

  // curvature: signed offset of the neighbour centroid along the normal (+ = hollow), two scales
  const curvAt = (P) => {
    const k = new Float32Array(nw);
    for (let w = 0; w < nw; w++) {
      const ns = nbrA[w]; if (!ns.length) continue;
      let cx = 0, cy = 0, cz = 0, el = 0;
      for (const n of ns) { cx += P[n * 3]; cy += P[n * 3 + 1]; cz += P[n * 3 + 2]; el += Math.hypot(P[n * 3] - P[w * 3], P[n * 3 + 1] - P[w * 3 + 1], P[n * 3 + 2] - P[w * 3 + 2]); }
      cx = cx / ns.length - P[w * 3]; cy = cy / ns.length - P[w * 3 + 1]; cz = cz / ns.length - P[w * 3 + 2]; el /= ns.length;
      k[w] = (cx * wn[w * 3] + cy * wn[w * 3 + 1] + cz * wn[w * 3 + 2]) / Math.max(1e-5, el);
    }
    return k;
  };
  const relax = (f, it) => { let a = f; for (let i = 0; i < it; i++) { const b = new Float32Array(nw); for (let w = 0; w < nw; w++) { const ns = nbrA[w]; let s = a[w]; for (const n of ns) s += a[n]; b[w] = s / (ns.length + 1); } a = b; } return a; };
  const kFine = relax(curvAt(wp), 1);
  // coarse: curvature of a smoothed surface (hollows at the scale of a few cm: armpits, under the bust, cleavage)
  let sp = wp; for (let i = 0; i < 6; i++) { const b = new Float32Array(nw * 3); for (let w = 0; w < nw; w++) { const ns = nbrA[w]; let x = sp[w * 3], y = sp[w * 3 + 1], z = sp[w * 3 + 2]; for (const n of ns) { x += sp[n * 3]; y += sp[n * 3 + 1]; z += sp[n * 3 + 2]; } const d = ns.length + 1; b[w * 3] = x / d; b[w * 3 + 1] = y / d; b[w * 3 + 2] = z / d; } sp = b; }
  const kCoarse = relax(curvAt(sp), 2);
  const wdisp = new Float32Array(nw); // how far smoothing moved the vertex, along the normal (+ = the vertex sits in a hollow)
  for (let w = 0; w < nw; w++) wdisp[w] = (sp[w * 3] - wp[w * 3]) * wn[w * 3] + (sp[w * 3 + 1] - wp[w * 3 + 1]) * wn[w * 3 + 1] + (sp[w * 3 + 2] - wp[w * 3 + 2]) * wn[w * 3 + 2];

  // regions (dominant group), welded purity
  const region = new Uint8Array(nv);
  for (let v = 0; v < nv; v++) {
    const t = gW(v, G.torso) + gW(v, G.neck), h = gW(v, G.head), al = gW(v, G.arm_l) + gW(v, G.hand_l), ar = gW(v, G.arm_r) + gW(v, G.hand_r);
    const ll = gW(v, G.leg_l) + gW(v, G.foot_l), lr = gW(v, G.leg_r) + gW(v, G.foot_r);
    const arr = [t, h, al, ar, ll, lr]; let best = 0; for (let i = 1; i < 6; i++) if (arr[i] > arr[best]) best = i;
    region[v] = best;
  }
  const triRegion = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) { const a = region[idx[t * 3]], b = region[idx[t * 3 + 1]], c = region[idx[t * 3 + 2]]; triRegion[t] = a === b || a === c ? a : b === c ? b : a; }
  const pAcc = new Float32Array(nw), pCnt = new Float32Array(nw), wRegion = new Uint8Array(nw);
  for (let v = 0; v < nv; v++) wRegion[weld[v]] = region[v];
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const w = weld[idx[t * 3 + k]]; pCnt[w]++; if (triRegion[t] === wRegion[w]) pAcc[w]++; }

  // arm and leg arc coordinates
  const chain = (names) => { const pts = names.map((n) => J[n]); const lens = []; let acc = 0; const cum = [0]; for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); lens.push(l); acc += l; cum.push(acc); } return { pts, lens, cum }; };
  const sideName = (s) => (s === side ? 'l' : 'r');
  const ARM = { l: chain(['upperarm_l', 'lowerarm_l', 'hand_l', 'middle_04_leaf_l']), r: chain(['upperarm_r', 'lowerarm_r', 'hand_r', 'middle_04_leaf_r']) };
  const LEG = { l: chain(['thigh_l', 'calf_l', 'foot_l', 'ball_leaf_l']), r: chain(['thigh_r', 'calf_r', 'foot_r', 'ball_leaf_r']) };
  const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
  const arcOn = (c, p) => {
    let best = Infinity, s = 0;
    for (let i = 0; i < c.pts.length - 1; i++) {
      const a = c.pts[i], b = c.pts[i + 1];
      _e.subVectors(b, a); const L2 = _e.lengthSq();
      let t = _d.subVectors(p, a).dot(_e) / L2;
      if (i > 0) t = Math.max(0, t);
      if (i < c.pts.length - 2) t = Math.min(1, t);
      const dist = _d.subVectors(p, a).addScaledVector(_e, -t).lengthSq();
      if (dist < best - 1e-9) { best = dist; s = c.cum[i] + t * c.lens[i]; }
    }
    return s;
  };
  const armS = new Float32Array(nv), legS = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    _p.fromArray(pos, v * 3);
    const sd = sideName(Math.sign(_p.x) || 1);
    armS[v] = arcOn(ARM[sd], _p);
    legS[v] = arcOn(LEG[sd], _p);
  }

  // torso centre line (z of the spine at a height) for "front" and around-angles
  const spineNames = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head'];
  const spine = spineNames.map((n) => J[n]);
  // the torso surface centre is in front of the spine joints: use the mesh's mid-z at each height
  const zMid = (() => {
    const bins = 40, y0 = J.pelvis.y - 0.15, y1 = J.Head.y + 0.25; const lo = new Float32Array(bins).fill(9), hi = new Float32Array(bins).fill(-9);
    for (let v = 0; v < nv; v++) { if (region[v] !== REGION.torso && region[v] !== REGION.head) continue; const y = pos[v * 3 + 1]; const b = Math.floor((y - y0) / (y1 - y0) * bins); if (b < 0 || b >= bins) continue; if (Math.abs(pos[v * 3]) > 0.06) continue; lo[b] = Math.min(lo[b], pos[v * 3 + 2]); hi[b] = Math.max(hi[b], pos[v * 3 + 2]); }
    const mid = new Float32Array(bins); for (let b = 0; b < bins; b++) mid[b] = lo[b] < hi[b] ? (lo[b] + hi[b]) / 2 : NaN;
    for (let b = 0; b < bins; b++) if (isNaN(mid[b])) { let k = 1; while (k < bins) { if (b - k >= 0 && !isNaN(mid[b - k])) { mid[b] = mid[b - k]; break; } if (b + k < bins && !isNaN(mid[b + k])) { mid[b] = mid[b + k]; break; } k++; } }
    return (y) => { const f = clamp((y - y0) / (y1 - y0) * bins - 0.5, 0, bins - 1.001); const i = Math.floor(f); return lerp(mid[i], mid[i + 1], f - i); };
  })();

  // fabric coordinates: cos/sin of the angle around the region's axis, length along it, circumference
  const pat = new Float32Array(nv * 4);
  const armFrame = {};
  for (const s of ['l', 'r']) {
    const a = new THREE.Vector3().subVectors(ARM[s].pts[2], ARM[s].pts[0]).normalize();
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(a, -a.y).normalize();
    const fw = new THREE.Vector3().crossVectors(a, up); if (fw.z < 0) fw.negate();
    armFrame[s] = { o: ARM[s].pts[0], a, up, fw };
  }
  for (let v = 0; v < nv; v++) {
    _p.fromArray(pos, v * 3);
    let th, along, C;
    const r = region[v];
    if (r === REGION.arm_l || r === REGION.arm_r) {
      const f = armFrame[r === REGION.arm_l ? 'l' : 'r'];
      _d.subVectors(_p, f.o); along = _d.dot(f.a); th = Math.atan2(_d.dot(f.up), _d.dot(f.fw)); C = 0.30;
    } else if (r === REGION.leg_l || r === REGION.leg_r) {
      const s = r === REGION.leg_l ? 'l' : 'r'; const c = LEG[s];
      const t = clamp((c.pts[0].y - _p.y) / (c.pts[0].y - c.pts[2].y), 0, 1);
      const ax = lerp(c.pts[0].x, c.pts[2].x, t), az = lerp(c.pts[0].z, c.pts[2].z, t) + 0.03;
      const out = Math.sign(c.pts[0].x);
      th = Math.atan2((_p.x - ax) * out, _p.z - az); along = _p.y; C = 0.48;
    } else {
      th = Math.atan2(_p.x, _p.z - zMid(_p.y) + 0.01); along = _p.y; C = 0.86;
    }
    pat[v * 4] = Math.cos(th); pat[v * 4 + 1] = Math.sin(th); pat[v * 4 + 2] = along; pat[v * 4 + 3] = C;
  }

  // ---- named heights and limb positions
  const Y = {};
  Y.head = J.Head.y; Y.neckBase = J.neck_01.y; Y.shoulder = J.upperarm_l.y;
  // chin: lowest front head vertex near the centre
  let chin = 9, top = -9, noseZ = -9;
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    // the face's UV island reaches down to the chin
    if (gW(v, G.head) + gW(v, G.neck) > 0.5 && uv[v * 2] < 0.37 && uv[v * 2 + 1] < 0.35 && Math.abs(x) < 0.02 && z > 0.02) chin = Math.min(chin, y);
    if (gW(v, G.head) < 0.9) continue;
    top = Math.max(top, y); if (Math.abs(x) < 0.01) noseZ = Math.max(noseZ, z);
  }
  Y.chin = chin; Y.top = top; Y.neck = lerp(Y.neckBase, chin, 0.55);
  // widths per height (torso only): waist = the narrowest between pelvis and spine_03, bust = the deepest z on the front
  const prof = (y0, y1, f) => { let best = null; for (let y = y0; y <= y1; y += 0.005) { const val = f(y); if (best === null || val < best.v) best = { y, v: val }; } return best.y; };
  const torsoVerts = []; for (let v = 0; v < nv; v++) if (region[v] === REGION.torso) torsoVerts.push(v);
  const widthAt = (y) => { let w = 0; for (const v of torsoVerts) if (Math.abs(pos[v * 3 + 1] - y) < 0.006) w = Math.max(w, Math.abs(pos[v * 3])); return w; };
  const frontAt = (y) => { let z = -9; for (const v of torsoVerts) if (Math.abs(pos[v * 3 + 1] - y) < 0.006 && Math.abs(pos[v * 3]) < 0.12) z = Math.max(z, pos[v * 3 + 2]); return z; };
  Y.waist = prof(J.spine_01.y - 0.05, J.spine_02.y + 0.03, widthAt);
  Y.bust = prof(J.spine_02.y, Y.shoulder - 0.06, (y) => -frontAt(y));
  Y.underbust = lerp(Y.waist, Y.bust, 0.55);
  Y.chest = lerp(Y.bust, Y.neckBase, 0.45);
  Y.hips = J.pelvis.y; Y.crotch = J.thigh_l.y - 0.06; Y.navel = lerp(Y.hips, Y.waist, 0.55);
  Y.lowhip = lerp(Y.crotch, Y.hips, 0.4);
  const A = { shoulder: 0, cap: 0.05, short: 0.11, elbow: ARM.l.cum[1], forearm: lerp(ARM.l.cum[1], ARM.l.cum[2], 0.5), wrist: ARM.l.cum[2] - 0.005, knuckle: ARM.l.cum[2] + 0.085, tips: ARM.l.cum[3] };
  const L = { hip: 0, thigh: LEG.l.cum[1] * 0.3, midthigh: LEG.l.cum[1] * 0.55, knee: LEG.l.cum[1] + 0.015, calf: lerp(LEG.l.cum[1], LEG.l.cum[2], 0.45), ankle: LEG.l.cum[2] - 0.035, toes: LEG.l.cum[3] };

  // ---- eyes: fit a sphere to each eyeball
  const EYE = {};
  if (eyes) {
    const ep = eyes.geometry.attributes.position.array; const n = ep.length / 3;
    for (const s of [1, -1]) {
      const pts = []; for (let v = 0; v < n; v++) if (Math.sign(ep[v * 3]) === s) pts.push(new THREE.Vector3().fromArray(ep, v * 3));
      EYE[s === side ? 'l' : 'r'] = fitSphere(pts);
    }
  }
  // ---- mouth: the interior plate (head-weighted, its own UV island below the face) gives the slit
  const interior = new Uint8Array(nv);
  let mx0 = 9, mx1 = -9, my = 0, mn = 0, mz = -9;
  for (let v = 0; v < nv; v++) { if (gW(v, G.head) > 0.5 && uv[v * 2 + 1] > 0.55 && uv[v * 2] < 0.2) { interior[v] = 1; mx0 = Math.min(mx0, pos[v * 3]); mx1 = Math.max(mx1, pos[v * 3]); my += pos[v * 3 + 1]; mn++; mz = Math.max(mz, pos[v * 3 + 2]); } }
  const MOUTH = { y: mn ? my / mn : chin + 0.04, halfW: mn ? (mx1 - mx0) / 2 : 0.024, z: mz };
  // lip front z at the corners
  let cz = -9; for (let v = 0; v < nv; v++) { if (gW(v, G.head) < 0.9 || interior[v]) continue; if (Math.abs(Math.abs(pos[v * 3]) - MOUTH.halfW) < 0.004 && Math.abs(pos[v * 3 + 1] - MOUTH.y) < 0.004) cz = Math.max(cz, pos[v * 3 + 2]); }
  MOUTH.cornerZ = cz;
  let lipFront = -9; for (let v = 0; v < nv; v++) { if (gW(v, G.head) < 0.9 || interior[v]) continue; if (Math.abs(pos[v * 3]) < 0.004 && Math.abs(pos[v * 3 + 1] - MOUTH.y) < 0.012) lipFront = Math.max(lipFront, pos[v * 3 + 2]); }
  MOUTH.frontZ = lipFront;
  const headC = new THREE.Vector3(0, lerp(chin, top, 0.5), 0);
  { let z0 = 9, z1 = -9; for (let v = 0; v < nv; v++) if (gW(v, G.head) > 0.9 && Math.abs(pos[v * 3 + 1] - headC.y) < 0.01 && Math.abs(pos[v * 3]) < 0.01) { z0 = Math.min(z0, pos[v * 3 + 2]); z1 = Math.max(z1, pos[v * 3 + 2]); } headC.z = (z0 + z1) / 2; }
  const JAW = new THREE.Vector3(0, MOUTH.y + 0.032, headC.z - 0.012);
  // the face's surface depth at (x, y): landmarks for the expressions sit on the skin
  const faceZ = (x, y) => { let z = -9; for (let v = 0; v < nv; v++) { if (gW(v, G.head) < 0.8 || interior[v]) continue; if (Math.abs(pos[v * 3] - x) < 0.006 && Math.abs(pos[v * 3 + 1] - y) < 0.006) z = Math.max(z, pos[v * 3 + 2]); } return z > -9 ? z : headC.z + 0.08; };

  // jaw weight per vertex (+2 marks the mouth interior)
  const jawW = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const hw = gW(v, G.head) + gW(v, G.neck) * 0.6; if (hw < 0.05) continue;
    const x = Math.abs(pos[v * 3]), y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let w;
    if (split.lower[v]) w = 1;                       // the lower lip and the lower half of the mouth
    else if (split.upper[v]) w = 0;
    else {
      const band = lerp(0.006, 0.03, smooth(MOUTH.halfW - 0.004, MOUTH.halfW + 0.03, x));
      w = smooth(MOUTH.y + 0.001, MOUTH.y - band, y);
    }
    w *= smooth(JAW.z - 0.045, JAW.z + 0.03, z);
    w *= smooth(chin - 0.05, chin - 0.012, y) * Math.min(1, hw);
    jawW[v] = w + (interior[v] ? 2 : 0);
  }

  // ---- face UV map (front of the face is a planar projection): u,v = A [x, y, 1]
  const rows = [];
  for (let v = 0; v < nv; v++) { if (gW(v, G.head) < 0.95 || nrm[v * 3 + 2] < 0.55 || uv[v * 2] > 0.37 || uv[v * 2 + 1] > 0.35) continue; rows.push(v); }
  const fitAff = (comp) => { // least squares of uv[comp] on (x, y, 1)
    let a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (const v of rows) { const r = [pos[v * 3], pos[v * 3 + 1], 1]; const t = uv[v * 2 + comp]; for (let i = 0; i < 3; i++) { b[i] += r[i] * t; for (let k = 0; k < 3; k++) a[i][k] += r[i] * r[k]; } }
    return solve3(a, b);
  };
  const au = fitAff(0), av = fitAff(1);
  const toUV = (x, y) => [au[0] * x + au[1] * y + au[2], av[0] * x + av[1] * y + av[2]];
  const det = au[0] * av[1] - au[1] * av[0];
  const toXY = (u, w) => { const du = u - au[2], dv = w - av[2]; return [(du * av[1] - dv * au[1]) / det, (dv * au[0] - du * av[0]) / det]; };
  // face island rect
  let fu0 = 9, fu1 = -9, fv0 = 9, fv1 = -9;
  for (let v = 0; v < nv; v++) { if (gW(v, G.head) < 0.5 || interior[v]) continue; const u = uv[v * 2], w = uv[v * 2 + 1]; if (u > 0.37 || w > 0.35) continue; fu0 = Math.min(fu0, u); fu1 = Math.max(fu1, u); fv0 = Math.min(fv0, w); fv1 = Math.max(fv1, w); }
  const faceRect = [fu0 - 0.004, fv0 - 0.004, fu1 + 0.004, fv1 + 0.004];
  // eye openings: where the eyeball is visible from the front. Rasterize the head's triangles over a
  // grid around each eye; a grid point sees the eyeball if no face triangle lies in front of the sphere.
  // The lid margins are the top and bottom of that region per column (bind x,y -> UV via the face map).
  const rims = {};
  const headTris = [];
  for (let t = 0; t < nt; t++) { const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2]; if (interior[a] || gW(a, G.head) < 0.5) continue; headTris.push(t); }
  for (const s of ['l', 'r']) {
    const e = EYE[s]; if (!e) continue;
    const tris = headTris.filter((t) => { for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; if (Math.abs(pos[v * 3] - e.c.x) < e.r * 1.8 && Math.abs(pos[v * 3 + 1] - e.c.y) < e.r * 1.5 && pos[v * 3 + 2] > e.c.z - e.r * 0.3) return true; } return false; });
    const NX = 72, NY = 56, x0 = e.c.x - e.r * 1.3, x1 = e.c.x + e.r * 1.3, y0 = e.c.y - e.r * 1.0, y1 = e.c.y + e.r * 1.0;
    const vis = new Uint8Array(NX * NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x = x0 + (x1 - x0) * (i + 0.5) / NX, y = y0 + (y1 - y0) * (j + 0.5) / NY;
      const dx = x - e.c.x, dy = y - e.c.y; const h2 = e.r * e.r - dx * dx - dy * dy; if (h2 <= 0) continue;
      const ze = e.c.z + Math.sqrt(h2);
      let hidden = false;
      for (const t of tris) {
        const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
        const ax = pos[a * 3], ay = pos[a * 3 + 1], bx = pos[b * 3], by = pos[b * 3 + 1], cx = pos[c * 3], cy = pos[c * 3 + 1];
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-12) continue;
        const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * pos[a * 3 + 2] + w1 * pos[b * 3 + 2] + w2 * pos[c * 3 + 2];
        if (z > ze + 0.0002) { hidden = true; break; }
      }
      if (!hidden) vis[j * NX + i] = 1;
    }
    const upper = [], lower = [];
    for (let i = 0; i < NX; i++) {
      let top = -1, bot = -1;
      for (let j = 0; j < NY; j++) if (vis[j * NX + i]) { if (bot < 0) bot = j; top = j; }
      if (top < 0) continue;
      const x = x0 + (x1 - x0) * (i + 0.5) / NX;
      upper.push([x, y0 + (y1 - y0) * (top + 1) / NY]); lower.push([x, y0 + (y1 - y0) * bot / NY]);
    }
    const smooth3 = (arr) => arr.map((p, i) => { let sy = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(arr.length - 1, i + 2); k++) { sy += arr[k][1]; n++; } return [p[0], sy / n]; });
    const U = smooth3(upper), Lo = smooth3(lower);
    const toPt = ([x, y]) => { const [u, v] = toUV(x, y); return { u, v, x, y }; };
    rims[s] = { c: toUV(e.c.x, e.c.y), upper: U.map(toPt), lower: Lo.map(toPt), pts: [...U, ...Lo].map(toPt), open: { top: U.length ? Math.max(...U.map((p) => p[1])) - e.c.y : e.r * 0.5, bot: Lo.length ? Math.min(...Lo.map((p) => p[1])) - e.c.y : -e.r * 0.4, x0: U.length ? U[0][0] : x0, x1: U.length ? U[U.length - 1][0] : x1 } };
  }
  // lips outline from the baked redness mask: per UV column, the top and bottom of the lips
  let lips = null;
  if (lipsImage) lips = lipOutline(lipsImage, toUV, MOUTH);

  // hit-query subset: about 700 vertices spread over the body
  const hitSet = [];
  { const seen = new Set(); for (let v = 0; v < nv; v++) { const k = Math.round(pos[v * 3] / 0.035) + ',' + Math.round(pos[v * 3 + 1] / 0.035) + ',' + Math.round(pos[v * 3 + 2] / 0.035); if (!seen.has(k)) { seen.add(k); hitSet.push(v); } } }

  const info = {
    nv, nt, pos, nrm, uv, idx, weld, nw, nbrA, wp, gw, gW, region, triRegion, armS, legS, pat, side, J, Y, A, L, ARM, LEG, EYE, MOUTH, JAW, headC,
    chin, top, noseZ, interior, jawW, zMid, faceZ, toUV, toXY, faceRect, rims, lips, hitSet, edgeCount, wRep,
    cavFine: new Float32Array(nv), cavCoarse: new Float32Array(nv), purity: new Float32Array(nv),
  };
  for (let v = 0; v < nv; v++) {
    const w = weld[v];
    info.cavFine[v] = clamp(kFine[w] * 2.2, -1, 1);
    info.cavCoarse[v] = clamp(wdisp[w] * 55 + kCoarse[w] * 1.5, -1, 1);
    info.purity[v] = pCnt[w] ? pAcc[w] / pCnt[w] : 1;
  }
  info.geo = geo; info.mouthSplit = split.splitCount;
  geo0.userData.fig = info;
  return info;
}

function smoothstep01(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function solve3(a, b) {
  const m = a.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i; for (let k = i + 1; k < 3; k++) if (Math.abs(m[k][i]) > Math.abs(m[p][i])) p = k;
    [m[i], m[p]] = [m[p], m[i]];
    for (let k = 0; k < 3; k++) if (k !== i) { const f = m[k][i] / m[i][i]; for (let c = i; c < 4; c++) m[k][c] -= f * m[i][c]; }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

function fitSphere(pts) {
  // algebraic fit: x^2+y^2+z^2 = 2cx x + 2cy y + 2cz z + k
  const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], B = [0, 0, 0, 0];
  for (const p of pts) { const r = [2 * p.x, 2 * p.y, 2 * p.z, 1], t = p.lengthSq(); for (let i = 0; i < 4; i++) { B[i] += r[i] * t; for (let k = 0; k < 4; k++) A[i][k] += r[i] * r[k]; } }
  const m = A.map((r, i) => [...r, B[i]]);
  for (let i = 0; i < 4; i++) { let p = i; for (let k = i + 1; k < 4; k++) if (Math.abs(m[k][i]) > Math.abs(m[p][i])) p = k; [m[i], m[p]] = [m[p], m[i]]; for (let k = 0; k < 4; k++) if (k !== i) { const f = m[k][i] / m[i][i]; for (let c = i; c < 5; c++) m[k][c] -= f * m[i][c]; } }
  const c = new THREE.Vector3(m[0][4] / m[0][0], m[1][4] / m[1][1], m[2][4] / m[2][2]);
  const k = m[3][4] / m[3][3];
  return { c, r: Math.sqrt(k + c.lengthSq()) };
}

// the lips in UV: for each column across the mouth, where the (redness) mask is above the local skin
function lipOutline(img, toUV, MOUTH) {
  const { width: W, height: H, data, rect } = img; // rect: UV of the image [u0, v0, u1, v1]
  const at = (x, y) => data[(y * W + x) * 4];
  const pu = (u) => (u - rect[0]) / (rect[2] - rect[0]) * W, pv = (v) => (v - rect[1]) / (rect[3] - rect[1]) * H;
  const [cu, cv] = toUV(0, MOUTH.y);
  const [ru] = toUV(MOUTH.halfW * 1.45, MOUTH.y);
  const x0 = Math.floor(pu(2 * cu - ru)), x1 = Math.ceil(pu(ru)), yc = Math.round(pv(cv));
  const [, vTop] = toUV(0, MOUTH.y + 0.016), [, vBot] = toUV(0, MOUTH.y - 0.02);
  const yT = Math.max(0, Math.floor(pv(vTop))), yB = Math.min(H - 1, Math.ceil(pv(vBot)));
  // local skin level: median of the band above the upper lip and below the lower lip
  const sk = []; for (let x = x0; x <= x1; x++) { if (yT - 3 >= 0) sk.push(at(x, yT - 3)); if (yB + 3 < H) sk.push(at(x, yB + 3)); }
  sk.sort((a, b) => a - b); const skin = sk[Math.floor(sk.length / 2)] || 80;
  const thr = skin + 34;
  const cols = [];
  for (let x = x0; x <= x1; x++) {
    let up = null, dn = null;
    for (let y = yc; y >= yT; y--) { if (at(x, y) > thr) up = y; else if (up !== null && yc - y > 2) break; }
    for (let y = yc; y <= yB; y++) { if (at(x, y) > thr) dn = y; else if (dn !== null && y - yc > 2) break; }
    if (up !== null || dn !== null) cols.push({ u: rect[0] + (x + 0.5) / W * (rect[2] - rect[0]), top: rect[1] + ((up ?? yc) + 0.0) / H * (rect[3] - rect[1]), bot: rect[1] + ((dn ?? yc) + 1.0) / H * (rect[3] - rect[1]) });
  }
  // smooth the measured upper edge; the corners converge on the mouth line at the sculpt's corners;
  // the lower lip is a full curve whose depth is the mask's depth at the centre (the mask leaks into
  // the shadow under the lip at the sides)
  const sm = (arr, r) => arr.map((c, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - r); j <= Math.min(arr.length - 1, i + r); j++) { s += arr[j]; n++; } return s / n; });
  const [cu1] = toUV(MOUTH.halfW * 1.1, MOUTH.y);
  const hwU = Math.abs(cu1 - cu);
  const inside = cols.filter((c) => Math.abs(c.u - cu) <= hwU);
  const T = sm(inside.map((c) => c.top), 3);
  const mid = inside.filter((c) => Math.abs(c.u - cu) < hwU * 0.25).map((c) => c.bot).sort((a, b) => a - b);
  const depth = Math.min((mid[Math.floor(mid.length / 2)] ?? cv + 0.01) - cv, Math.abs(toUV(0, MOUTH.y - 0.013)[1] - cv));
  const out = inside.map((c, i) => {
    const t = (c.u - cu) / hwU; const e = Math.max(0, 1 - t * t);
    const top = cv - (cv - T[i]) * Math.pow(e, 0.18) * smoothstep01(1 - Math.abs(t), 0, 0.12);
    const bot = cv + depth * Math.pow(e, 0.62);
    return { u: c.u, top, bot };
  });
  return { cols: out, center: [cu, cv], hwU, depth };
}

// ---------------------------------------------------------------------------------------------
// Costume layer fields. A layer is a painted garment with a signed distance per vertex (+ inside).
const NECK = {
  // y of the neckline's top edge at (x, front-ness f)
  high: (I, x, f) => I.Y.neck + 0.004,
  turtle: (I, x, f) => lerp(I.Y.neck, I.Y.chin, 0.35),
  crew: (I, x, f, o) => I.Y.neckBase + 0.012 - f * 0.028 * Math.max(0, 1 - (x / 0.07) ** 2),
  scoop: (I, x, f, o) => I.Y.neckBase + 0.008 - f * (o.depth ?? 0.13) * Math.sqrt(Math.max(0, 1 - (x / (o.width ?? 0.095)) ** 2)),
  v: (I, x, f, o) => I.Y.neckBase + 0.008 - f * (o.depth ?? 0.19) * Math.max(0, 1 - Math.abs(x) / (o.width ?? 0.085)),
  plunge: (I, x, f, o) => I.Y.neckBase + 0.008 - f * (o.depth ?? (I.Y.neckBase - I.Y.waist + 0.012)) * Math.max(0, 1 - Math.abs(x) / (o.width ?? 0.11)) ** 0.85,
  boat: (I, x, f) => I.Y.neckBase + 0.006 - f * 0.012,
  strapless: (I, x, f) => I.Y.bust + 0.045 - (1 - f) * 0.02,
  sweetheart: (I, x, f) => I.Y.bust + 0.03 + f * (0.018 * Math.max(0, 1 - ((Math.abs(x) - 0.065) / 0.07) ** 2) - 0.04 * Math.exp(-((x / 0.022) ** 2))) - (1 - f) * 0.03,
};
const hY = (I, k) => (typeof k === 'number' ? k : I.Y[k] ?? I.Y.hips);
const hA = (I, k) => (k == null ? null : typeof k === 'number' ? k : I.A[k]);
const hL = (I, k) => (k == null ? null : typeof k === 'number' ? k : I.L[k]);

// a garment covering the torso between `from` and the neckline, the arms to `sleeves`, the legs to `legs`
function garment(I, v, o) {
  const x = I.pos[v * 3], y = I.pos[v * 3 + 1], z = I.pos[v * 3 + 2];
  const f = smooth(-0.015, 0.05, z - I.zMid(y));
  const nk = NECK[o.neckline || 'crew'] || NECK.crew;
  const top = nk(I, x, f, o);
  // distance to the neckline measured across it (a deep V is steep and has corners): the nearest
  // point of the curve top(x') in the front view, coarse to fine
  let best = Math.abs(top - y), bx = x;
  for (let k = -24; k <= 24; k++) { const xx = x + k * 0.007; const d = Math.hypot(xx - x, nk(I, xx, f, o) - y); if (d < best) { best = d; bx = xx; } }
  for (let k = -7; k <= 7; k++) { const xx = bx + k * 0.001; const d = Math.hypot(xx - x, nk(I, xx, f, o) - y); if (d < best) best = d; }
  const dNeck = (top >= y ? 1 : -1) * best;
  const legEnd = hL(I, o.legs);
  // a garment that runs onto the legs ends at the same height on the torso side of the hips
  const bottom = legEnd !== null && legEnd !== undefined ? I.J.thigh_l.y - legEnd : hY(I, o.from ?? 'hips');
  let dT = Math.min(y - bottom, dNeck);
  if (o.neckline === 'strapless' || o.neckline === 'sweetheart') dT = Math.min(dT, y < I.Y.shoulder - 0.05 ? 9 : I.Y.shoulder - 0.05 - y);
  const sl = o.sleeves === undefined ? null : hA(I, o.sleeves);
  const armT = sl === null ? (o.neckline === 'strapless' || o.neckline === 'sweetheart' ? -0.06 : -0.035) : sl;
  const dA = armT - I.armS[v];
  const dL = (legEnd ?? -0.08) - I.legS[v];
  const wa = I.gW(v, G.arm_l) + I.gW(v, G.hand_l) + I.gW(v, G.arm_r) + I.gW(v, G.hand_r);
  const wl = I.gW(v, G.leg_l) + I.gW(v, G.foot_l) + I.gW(v, G.leg_r) + I.gW(v, G.foot_r);
  const wh = I.gW(v, G.head);
  let d = dT;
  d = lerp(d, dA, smooth(0.15, 0.85, wa));
  d = lerp(d, dL, smooth(0.2, 0.8, wl));
  d = lerp(d, Math.min(d, dNeck), wh);
  return { d, dNeck, f };
}

const LAYER = {
  // tops, jackets, dresses, catsuits: torso + optional sleeves + optional legs
  top: (I, v, o) => garment(I, v, o).d,
  // trousers / shorts / painted skirts: from the waistband down each leg to the hem
  bottom: (I, v, o) => {
    const y = I.pos[v * 3 + 1];
    const dT = hY(I, o.from ?? 'waist') - y;
    const dL = hL(I, o.hem ?? 'ankle') - I.legS[v];
    const wl = I.gW(v, G.leg_l) + I.gW(v, G.foot_l) + I.gW(v, G.leg_r) + I.gW(v, G.foot_r);
    const wa = I.gW(v, G.arm_l) + I.gW(v, G.hand_l) + I.gW(v, G.arm_r) + I.gW(v, G.hand_r);
    return lerp(lerp(dT, dL, smooth(0.2, 0.8, wl)), -0.2, wa);
  },
  gloves: (I, v, o) => {
    const wa = I.gW(v, G.arm_l) + I.gW(v, G.hand_l) + I.gW(v, G.arm_r) + I.gW(v, G.hand_r);
    return lerp(-0.2, I.armS[v] - hA(I, o.from ?? 'wrist'), smooth(0.2, 0.8, wa));
  },
  boots: (I, v, o) => {
    const wl = I.gW(v, G.leg_l) + I.gW(v, G.foot_l) + I.gW(v, G.leg_r) + I.gW(v, G.foot_r);
    return lerp(-0.2, I.legS[v] - hL(I, o.from ?? 'ankle'), smooth(0.2, 0.8, wl));
  },
  // lapels: per vertex only the (smooth) distance to the garment's neckline; the band itself (width
  // profile: nothing at the button, widest at the peak, a notch into the collar) is built per fragment
  lapels: (I, v, o) => {
    const g = garment(I, v, o.of || o);
    const wa = I.gW(v, G.arm_l) + I.gW(v, G.hand_l) + I.gW(v, G.arm_r) + I.gW(v, G.hand_r);
    return lerp(g.dNeck, 0.25, smooth(0.1, 0.5, wa));
  },
  // belts and sashes are evaluated per fragment from the bind position; per vertex: the torso mask
  belt: (I, v) => lerp(-0.05, 0.05, smooth(0.3, 0.9, I.gW(v, G.torso) + I.gW(v, G.neck))),
  sash: (I, v) => lerp(-0.05, 0.05, smooth(0.3, 0.9, I.gW(v, G.torso) + I.gW(v, G.neck))),
  // a painted patch anywhere: a disc around a bind-space point
  patch: (I, v, o) => {
    const dx = I.pos[v * 3] - o.at[0], dy = I.pos[v * 3 + 1] - o.at[1], dz = (I.pos[v * 3 + 2] - o.at[2]) * 0.6;
    return o.r - Math.hypot(dx, dy, dz);
  },
};
export const LAYER_KINDS = Object.keys(LAYER);

// how the shader turns a layer's per-vertex value into coverage: [mode, a, b, c], [d, e, f, g]
// mode 0: the value is the signed distance. 1: lapel band. 2: belt (y band). 3: sash (a slanted band)
export function layerMode(I, kind, o) {
  if (kind === 'lapels') {
    const yTo = hY(I, o.to ?? 'waist'), yPeak = o.peak !== undefined ? hY(I, o.peak) : lerp(I.Y.bust, I.Y.neckBase, 0.45);
    return [[1, o.width ?? 0.06, o.collar ?? 0.024, 0.135], [yTo, yPeak, 0, 0]];
  }
  if (kind === 'belt') return [[2, (o.width ?? 0.035) / 2, hY(I, o.at ?? 'waist'), 0], [0, 0, 0, 0]];
  if (kind === 'sash') {
    const s = o.side === 'r' ? -I.side : I.side;
    return [[3, (o.width ?? 0.075) / 2, s * 0.11, I.Y.shoulder + 0.03], [-s * 0.14, I.Y.hips - 0.01, 0, 0]];
  }
  return [[0, 0, 0, 0], [0, 0, 0, 0]];
}

export function layerField(I, kind, o) {
  const fn = LAYER[kind]; if (!fn) throw new Error('figurine: unknown layer kind ' + kind);
  // every kind is built from metric pieces (heights, arc lengths, distances across the neckline)
  const out = new Float32Array(I.nv);
  for (let v = 0; v < I.nv; v++) out[v] = I.interior[v] ? -1 : clamp(fn(I, v, o), -0.25, 0.25);
  return out;
}

// turn a field into (approximately) metres from its zero line: divide by its surface gradient,
// measured per vertex on the welded mesh and smoothed, so painted edges keep an even width
export function metric(I, f, minG = 0.2) {
  const { nw, nbrA, wp, weld } = I;
  const fw = new Float32Array(nw); for (let v = 0; v < I.nv; v++) fw[weld[v]] = f[v];
  let g = new Float32Array(nw);
  for (let w = 0; w < nw; w++) {
    const ns = nbrA[w]; if (!ns.length) { g[w] = 1; continue; }
    let s2 = 0;
    for (const n of ns) { const l = Math.hypot(wp[n * 3] - wp[w * 3], wp[n * 3 + 1] - wp[w * 3 + 1], wp[n * 3 + 2] - wp[w * 3 + 2]) || 1e-4; const d = (fw[n] - fw[w]) / l; s2 += d * d; }
    g[w] = Math.sqrt(2 * s2 / ns.length);
  }
  for (let it = 0; it < 3; it++) { const b = new Float32Array(nw); for (let w = 0; w < nw; w++) { let s = g[w] * 2, c = 2; for (const n of nbrA[w]) { s += g[n]; c++; } b[w] = s / c; } g = b; }
  for (let v = 0; v < I.nv; v++) f[v] /= Math.max(minG, g[weld[v]]);
  return f;
}

// mannequin seams: a field that is zero on every joint line (neck, elbows, wrists, waist, knees, ankles)
export function seamField(I, which = ['neck', 'elbow', 'wrist', 'waist', 'knee', 'ankle']) {
  const out = new Float32Array(I.nv);
  const has = (k) => which.includes(k);
  for (let v = 0; v < I.nv; v++) {
    const y = I.pos[v * 3 + 1];
    let fT = 1;
    if (has('neck')) fT *= (y - (I.Y.neckBase + 0.012)) / 0.1;
    if (has('waist')) fT *= (y - I.Y.waist) / 0.1;
    let fA = 1; if (has('elbow')) fA *= (I.armS[v] - I.A.elbow) / 0.1; if (has('wrist')) fA *= (I.armS[v] - I.A.wrist) / 0.1; if (has('shoulder')) fA *= (I.armS[v] - 0.03) / 0.1;
    let fL = 1; if (has('knee')) fL *= (I.legS[v] - I.L.knee) / 0.1; if (has('ankle')) fL *= (I.legS[v] - (I.L.ankle + 0.02)) / 0.1; if (has('hip')) fL *= (I.legS[v] - 0.05) / 0.1;
    const wa = I.gW(v, G.arm_l) + I.gW(v, G.hand_l) + I.gW(v, G.arm_r) + I.gW(v, G.hand_r);
    const wl = I.gW(v, G.leg_l) + I.gW(v, G.foot_l) + I.gW(v, G.leg_r) + I.gW(v, G.foot_r);
    let f = lerp(lerp(fT, fA, smooth(0.25, 0.75, wa)), fL, smooth(0.25, 0.75, wl));
    if (I.gW(v, G.head) > 0.5 || I.interior[v]) f = 1;
    out[v] = f * 0.1;
  }
  metric(I, out, 0.05);
  for (let v = 0; v < I.nv; v++) out[v] = clamp(out[v], -0.25, 0.25);
  return out;
}

// body parts that can break off at a notch: per-vertex membership 0..1
export const PARTS = {
  hand_l: { groups: ['hand_l'], kind: 'off' }, hand_r: { groups: ['hand_r'], kind: 'off' },
  forearm_l: { groups: ['hand_l'], arm: 'l', from: 'forearm', kind: 'off' }, forearm_r: { groups: ['hand_r'], arm: 'r', from: 'forearm', kind: 'off' },
  face: { kind: 'shell', fn: (I, v) => { const y = I.pos[v * 3 + 1], z = I.pos[v * 3 + 2], x = I.pos[v * 3]; return I.gW(v, G.head) * smooth(I.headC.z + 0.0, I.headC.z + 0.03, z) * smooth(I.chin - 0.004, I.chin + 0.012, y) * smooth(I.EYE.l.c.y + 0.05, I.EYE.l.c.y + 0.03, y) * smooth(0.08, 0.06, Math.abs(x)); } },
  shoulder_l: { kind: 'shell', arm: 'l', fn: (I, v) => armSide(I, v, 'l') * smooth(-0.07, -0.03, I.armS[v]) * smooth(0.16, 0.1, I.armS[v]) * smooth(I.Y.shoulder - 0.06, I.Y.shoulder - 0.02, I.pos[v * 3 + 1]) },
  shoulder_r: { kind: 'shell', arm: 'r', fn: (I, v) => armSide(I, v, 'r') * smooth(-0.07, -0.03, I.armS[v]) * smooth(0.16, 0.1, I.armS[v]) * smooth(I.Y.shoulder - 0.06, I.Y.shoulder - 0.02, I.pos[v * 3 + 1]) },
  chest: { kind: 'shell', fn: (I, v) => { const x = I.pos[v * 3], y = I.pos[v * 3 + 1], z = I.pos[v * 3 + 2]; return I.gW(v, G.torso) * smooth(-0.005, 0.03, z - I.zMid(y)) * smooth(0.12, 0.08, Math.abs(x)) * smooth(I.Y.underbust, I.Y.bust, y) * smooth(I.Y.neckBase - 0.01, I.Y.chest, y); } },
  back: { kind: 'shell', fn: (I, v) => { const x = I.pos[v * 3], y = I.pos[v * 3 + 1], z = I.pos[v * 3 + 2]; return I.gW(v, G.torso) * smooth(0.01, -0.03, z - I.zMid(y)) * smooth(0.14, 0.09, Math.abs(x)) * smooth(I.Y.waist, I.Y.underbust, y) * smooth(I.Y.neckBase, I.Y.chest, y); } },
};
function armSide(I, v, s) { const x = I.pos[v * 3]; return (s === 'l' ? x * I.side : -x * I.side) > 0 ? 1 : 0; }
export function partField(I, name) {
  const P = PARTS[name]; if (!P) return null;
  const out = new Float32Array(I.nv);
  for (let v = 0; v < I.nv; v++) {
    let m = 0;
    if (P.fn) m = P.fn(I, v);
    else {
      for (const g of P.groups) m += I.gW(v, G[g]);
      if (P.from) { const sd = P.arm; if (armSide(I, v, sd)) m = Math.max(m, smooth(I.A[P.from] - 0.03, I.A[P.from] + 0.03, I.armS[v])); }
    }
    out[v] = clamp(m, 0, 1);
  }
  return out;
}
