// Rigid (and a few soft) porcelain accessories, modelled in three.js geometry and glazed like the body.
// Each builder places its piece in the body's bind space (the T-pose; metres; +z forward) using the
// landmarks from body.js, and names the bone it rides. figurine.js attaches it, gives every vertex a
// bind-space position for the crack shader, and can break it off.
import * as THREE from 'three';
import { Springs } from '../../engine/springs.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;
export const HAIR_PAD = { long: 0.016, buns: 0.018, parted: 0.02, buzz: 0.008, crop: 0.008, beard: 0.0, none: 0.0 };

function placeM(pos, euler = [0, 0, 0], s = 1) {
  return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(euler[0], euler[1], euler[2], 'YXZ')), new THREE.Vector3(s, s, s));
}
function lathe(profile, seg = 72) { const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.computeVertexNormals(); return g; }
function mesh(geo, mat, name) { const m = new THREE.Mesh(geo, mat); m.name = name || ''; m.castShadow = true; m.receiveShadow = true; return m; }

// ---------------------------------------------------------------------------------------------
export const ACCESSORIES = {
  // a wide-brimmed hat, tilted; a ribbon band in gold or a glaze colour, a jewelled pin on the side
  hat(ctx, o) {
    const { I } = ctx;
    const pad = HAIR_PAD[ctx.hairStyle] ?? 0.012;
    const g = new THREE.Group();
    const br = o.brim ?? 0.24, cr = o.crown ?? 0.092, ch = o.height ?? 0.1;
    const prof = [
      [0.0, ch - 0.002], [cr * 0.35, ch], [cr * 0.68, ch - 0.004], [cr * 0.88, ch - 0.014], [cr * 0.97, ch - 0.035], [cr, ch * 0.45], [cr * 1.01, 0.014],
      [cr * 1.08, 0.006], [cr + (br - cr) * 0.3, 0.002], [cr + (br - cr) * 0.65, -0.004], [br * 0.96, -0.012], [br, -0.017],
      [br * 1.008, -0.022], [br * 0.995, -0.027], [br * 0.955, -0.024], [cr + (br - cr) * 0.6, -0.012], [cr + (br - cr) * 0.25, -0.006], [cr * 1.03, -0.003],
      [cr * 0.95, 0.0], [cr * 0.93, ch * 0.55], [cr * 0.6, ch - 0.012], [0.0, ch - 0.01],
    ];
    const felt = ctx.mat('acc', { color: o.color ?? 0x060506, finish: o.finish ?? 'lacquer' });
    g.add(mesh(lathe(prof.map(([r, y]) => [r, y]).reverse(), 96), felt, 'hat'));
    const bandCol = o.band ?? 'gold';
    const band = ctx.mat('acc', bandCol === 'gold' ? { color: 0xffffff, finish: 'gold', goldTint: true } : { color: bandCol, finish: 'satin' });
    g.add(mesh(lathe([[cr * 1.012 + 0.0015, 0.011], [cr * 1.016 + 0.0025, 0.016], [cr * 1.0 + 0.0025, 0.034], [cr * 0.995 + 0.0015, 0.038]].reverse(), 96), band, 'hatband'));
    if (o.pin !== false) {
      const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
      const pin = new THREE.Group();
      const disc = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 24), gold); disc.rotation.x = Math.PI / 2; pin.add(disc);
      const jewel = mesh(new THREE.SphereGeometry(0.0085, 24, 16), ctx.mat('acc', { color: o.jewel ?? 0x8a0a1e, finish: 'lacquer' }), 'jewel'); jewel.position.z = 0.004; jewel.scale.z = 0.6; pin.add(jewel);
      pin.position.set(Math.sin(-62 * deg) * (cr + 0.004), 0.025, Math.cos(-62 * deg) * (cr + 0.004)); pin.lookAt(pin.position.clone().multiplyScalar(3).setY(0.025));
      g.add(pin);
    }
    const y = I.top + pad - ch + 0.014, z = I.headC.z - 0.006;
    return { root: g, bone: 'Head', bind: placeM(V3(0, y, z), [(o.tilt ?? -10) * deg, 0, (o.roll ?? 8) * deg]), anchorVeil: { radius: br * 0.86, y: -0.016 } };
  },

  // a birdcage veil of glazed lace under the hat's brim: a sheet that springs back to its rest drape
  // (porcelain lace is stiff) but sways and settles as she moves; it falls as cloth when it breaks
  veil(ctx, o) {
    const { I } = ctx;
    const hat = ctx.find('hat');
    const nx = 22, ny = 11;
    const drop = o.length ?? 0.15;
    const spanT = (o.span ?? 128) * deg, spanB = spanT * 0.82;
    const rT = hat ? hat.def.anchorVeil.radius : 0.12, yT = hat ? hat.def.anchorVeil.y : 0.03;
    const rB = o.chin ?? 0.135;
    // rest shape in the hat's (or head's) local space
    const restL = [];
    for (let j = 0; j < ny; j++) {
      const t = j / (ny - 1);
      const r = rT + (rB - rT) * Math.pow(t, 0.8) + Math.sin(t * Math.PI) * 0.012;
      const span = spanT + (spanB - spanT) * t;
      for (let i = 0; i < nx; i++) { const a = -span / 2 + span * i / (nx - 1); restL.push(V3(Math.sin(a) * r, yT - drop * t, Math.cos(a) * r)); }
    }
    const geo = new THREE.PlaneGeometry(1, 1, nx - 1, ny - 1);
    const N = nx * ny;
    const P = new Float32Array(N * 3), Q = new Float32Array(N * 3), T = new Float32Array(N * 3), uvA = geo.attributes.uv.array;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; uvA[k * 2] = i / (nx - 1); uvA[k * 2 + 1] = j / (ny - 1); }
    const ab = new Float32Array(N * 4); geo.setAttribute('aBind', new THREE.BufferAttribute(ab, 4));
    const cells = o.cells ?? 40;
    const mat = ctx.mat('acc', { color: o.color ?? 0x050405, finish: 'lacquer', side: THREE.DoubleSide, interior: false, alphaTest: 0.5, alphaToCoverage: true, cracks: false, alphaFn: LACE_ALPHA, uniforms: { fLaceScale: { value: new THREE.Vector2(cells, cells * drop / (rT * spanT)) } } });
    const m = mesh(geo, mat, 'veil'); m.castShadow = false; m.frustumCulled = false;
    const cloth = { nx, ny, P, Q, T, pinned: true, init: false, spheres: [], floorY: 0, anchor: hat ? hat.def.root : null, stiff: o.stiffness ?? 0.18 };
    const def = {
      root: m, world: true, cloth, bone: 'Head',
      update(dt, fig) {
        const M = cloth.anchor ? cloth.anchor.matrixWorld : fig.rig.bones.Head.matrixWorld.clone().multiply(fig.boneLocal('Head', placeM(V3(0, I.top - 0.02, I.headC.z), [0, 0, 0])));
        for (let k = 0; k < N; k++) { _t.copy(restL[k]).applyMatrix4(M); T[k * 3] = _t.x; T[k * 3 + 1] = _t.y; T[k * 3 + 2] = _t.z; }
        if (!cloth.init) { P.set(T); Q.set(T); cloth.init = true; cloth.rest = drop / (ny - 1); cloth.restX = rT * spanT / (nx - 1); }
        const hb = fig.rig.bones.Head;
        cloth.spheres = [
          { c: fig.bindToWorld(V3(0, I.headC.y, I.headC.z), hb), r: 0.098 * fig.scale },
          { c: fig.bindToWorld(V3(0, I.EYE.l.c.y - 0.028, I.headC.z + 0.05), hb), r: 0.072 * fig.scale },
        ];
        cloth.floorY = fig.floorY;
        stepCloth(cloth, dt, fig.scale);
        geo.attributes.position.array.set(P); geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      },
      onBreak() { cloth.pinned = false; },
    };
    return def;
  },

  // cat ears on a thin headband: lacquer outside, pink inside, a gold rim
  catEars(ctx, o) {
    const { I } = ctx;
    const pad = HAIR_PAD[ctx.hairStyle] ?? 0.012;
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const w = o.width ?? 0.06, h = o.height ?? 0.068;
    shape.moveTo(-w / 2, 0); shape.quadraticCurveTo(-w * 0.42, h * 0.55, -w * 0.06, h * 0.97); shape.quadraticCurveTo(0, h * 1.04, w * 0.08, h * 0.95);
    shape.quadraticCurveTo(w * 0.36, h * 0.5, w / 2, 0); shape.quadraticCurveTo(0, -h * 0.08, -w / 2, 0);
    const ext = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 4, curveSegments: 18 });
    ext.translate(0, 0, -0.004); ext.computeVertexNormals();
    const inner = new THREE.ShapeGeometry(shape, 18); inner.scale(0.62, 0.68, 1); inner.translate(0, h * 0.1, 0.0085);
    const outerM = ctx.mat('acc', { color: o.color ?? 0x050505, finish: 'lacquer' });
    const innerM = ctx.mat('acc', { color: o.inner ?? 0xff7aa6, finish: 'gloss' });
    const goldM = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    const rimPts = shape.getSpacedPoints(64).map((p) => V3(p.x, p.y, 0.0085));
    const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 96, 0.0016, 6, true);
    for (const s of [1, -1]) {
      const ear = new THREE.Group();
      ear.add(mesh(ext, outerM, 'ear'), mesh(inner, innerM, 'earInner'), mesh(rim, goldM, 'earRim'));
      ear.position.set(s * (o.spread ?? 0.052), 0, 0);
      ear.rotation.set(-8 * deg, s * -12 * deg, s * -16 * deg);
      g.add(ear);
    }
    // the headband hides under the hair; a little lacquer foot under each ear seats it
    for (const s of [1, -1]) { const foot = mesh(new THREE.SphereGeometry(0.012, 16, 10), outerM, 'earFoot'); foot.scale.set(1.6, 0.5, 1.1); foot.position.set(s * (o.spread ?? 0.052), 0.002, 0); g.add(foot); }
    return { root: g, bone: 'Head', bind: placeM(V3(0, I.top + pad - 0.024, I.headC.z - 0.012), [(o.tilt ?? -6) * deg, 0, 0]) };
  },

  // a pageant tiara: a bent gold crown band with peaks, crystal stones
  tiara(ctx, o) {
    const { I } = ctx;
    const pad = HAIR_PAD[ctx.hairStyle] ?? 0.012;
    const g = new THREE.Group();
    const s = new THREE.Shape();
    const W = 0.15, peaks = 7;
    s.moveTo(-W / 2, 0);
    for (let i = 0; i <= peaks * 2; i++) {
      const t = i / (peaks * 2), x = -W / 2 + W * t;
      const c = 1 - Math.abs(t - 0.5) * 2;
      const hpk = 0.012 + 0.03 * c * c;
      s.lineTo(x, i % 2 ? 0.01 + 0.006 * c : hpk);
    }
    s.lineTo(W / 2, 0); s.lineTo(-W / 2, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 4 });
    bendAround(geo, 0.088);
    const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    g.add(mesh(geo, gold, 'tiara'));
    const stoneM = ctx.mat('acc', { color: o.stone ?? 0xff4f8a, finish: 'lacquer', iridescence: 0.6 });
    for (let i = 0; i <= peaks * 2; i += 2) {
      const t = i / (peaks * 2), c = 1 - Math.abs(t - 0.5) * 2; const x = -W / 2 + W * t;
      const a = x / 0.088; const st = mesh(new THREE.SphereGeometry(0.0035 + 0.003 * c, 16, 12), stoneM, 'stone');
      st.position.set(Math.sin(a) * 0.0905, 0.012 + 0.03 * c * c - 0.004, Math.cos(a) * 0.0905); g.add(st);
    }
    return { root: g, bone: 'Head', bind: placeM(V3(0, I.top + pad - 0.05, I.headC.z - 0.004), [-18 * deg, 0, 0]) };
  },

  // cat-eye sunglasses, on the eyes or pushed up into the hair
  sunglasses(ctx, o) {
    const { I } = ctx;
    const g = new THREE.Group();
    const lens = new THREE.Shape();
    lens.moveTo(-0.024, 0.002); lens.bezierCurveTo(-0.024, 0.017, -0.006, 0.018, 0.012, 0.016); lens.bezierCurveTo(0.024, 0.016, 0.03, 0.022, 0.032, 0.026);
    lens.bezierCurveTo(0.03, 0.006, 0.024, -0.014, 0.004, -0.015); lens.bezierCurveTo(-0.014, -0.016, -0.024, -0.01, -0.024, 0.002);
    const frame = new THREE.Shape(); const pts = lens.getSpacedPoints(48);
    pts.forEach((p, i) => { const d = Math.hypot(p.x - 0.004, p.y); const k = 1 + 0.0055 / Math.max(0.01, d); const q = [0.004 + (p.x - 0.004) * k, p.y * k]; i ? frame.lineTo(q[0], q[1]) : frame.moveTo(q[0], q[1]); });
    frame.holes.push(new THREE.Path(pts.slice().reverse()));
    const fGeo = new THREE.ExtrudeGeometry(frame, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 12 });
    const lGeo = new THREE.ShapeGeometry(lens, 16);
    const fm = ctx.mat('acc', { color: o.color ?? 0x0a0506, finish: 'lacquer' });
    const lm = ctx.mat('acc', { color: o.lens ?? 0x120a14, finish: 'chrome', roughness: 0.05 });
    const ex = Math.abs(I.EYE.l.c.x);
    for (const sd of [1, -1]) {
      const side = new THREE.Group();
      const fmesh = mesh(fGeo, fm, 'frame'), lmesh = mesh(lGeo, lm, 'lens'); lmesh.position.z = 0.0015;
      side.add(fmesh, lmesh); side.scale.x = sd; side.position.x = sd * (ex - 0.004); side.rotation.y = sd * 10 * deg;
      g.add(side);
      const arm = mesh(new THREE.BoxGeometry(0.003, 0.004, 0.105), fm, 'temple'); arm.position.set(sd * (ex + 0.03), 0.012, -0.05); g.add(arm);
    }
    const bridge = mesh(new THREE.TorusGeometry(0.008, 0.0016, 6, 16, Math.PI), fm, 'bridge'); bridge.position.set(0, 0.006, 0.002); g.add(bridge);
    const ez = I.EYE.l.c.z + I.EYE.l.r + 0.012;
    if (o.up) {
      const pad = HAIR_PAD[ctx.hairStyle] ?? 0.012;
      return { root: g, bone: 'Head', bind: placeM(V3(0, I.top + pad - 0.022, I.headC.z + 0.055), [-62 * deg, 0, 0]) };
    }
    return { root: g, bone: 'Head', bind: placeM(V3(0, I.EYE.l.c.y - 0.004, ez), [4 * deg, 0, 0]) };
  },

  // a strand (or two) of pearls, draped lower in front
  pearls(ctx, o) {
    const { I } = ctx;
    const strands = o.strands ?? 1;
    const g = new THREE.Group();
    const m = ctx.mat('acc', { color: o.color ?? 0xf3ede4, finish: 'pearl', iridescence: 1.0 });
    for (let s = 0; s < strands; s++) {
      const r = (o.size ?? 0.0058) * (1 - s * 0.08);
      const drop = (o.drop ?? 0.03) + s * 0.028;
      const y0 = I.Y.neckBase - 0.018;
      const zc = I.zMid(y0) + 0.008;
      const pts = [];
      for (let i = 0; i < 64; i++) {
        const a = i / 64 * Math.PI * 2; const f = Math.max(0, Math.cos(a));
        pts.push(V3(Math.sin(a) * (0.072 + s * 0.012 + f * 0.012), y0 - drop * f * f * (0.5 + 0.5 * f), zc + Math.cos(a) * (0.068 + s * 0.012) + f * 0.012));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const L = curve.getLength(); const n = Math.floor(L / (r * 2.08));
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 18, 12), m, n); im.castShadow = true; im.name = 'pearls';
      const M = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { const p = curve.getPointAt(i / n); M.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, M); }
      g.add(im);
    }
    return { root: g, bone: 'spine_03', bind: new THREE.Matrix4() };
  },

  // a flared skirt: a rigid glazed bell from the waistband to the hem that rides the pelvis. Every frame
  // each of its columns hinges outward at the waistband just enough to clear the leg capsules (so a
  // kick or a crouch lifts the hem instead of passing through), springing up fast and settling slowly.
  skirt(ctx, o) {
    const { I } = ctx;
    const K = 12, S = 72;
    const yTop = typeof o.from === 'number' ? o.from : I.Y[o.from ?? 'waist'];
    const hemS = typeof o.to === 'number' ? o.to : I.L[o.to ?? 'midthigh'];
    const yHem = I.J.thigh_l.y - hemS;
    // the body's cross-sections (in the T-pose nothing but the body is at these heights): the waist,
    // and the widest point between the waist and the hem (the hips) so the bell always clears them
    const section = (y, tol) => { let x = 0, zf = -9, zb = 9; for (let v = 0; v < I.nv; v++) { if (Math.abs(I.pos[v * 3 + 1] - y) > tol || I.region[v] === 2 || I.region[v] === 3) continue; x = Math.max(x, Math.abs(I.pos[v * 3])); zf = Math.max(zf, I.pos[v * 3 + 2]); zb = Math.min(zb, I.pos[v * 3 + 2]); } return { x, zf, zb }; };
    const sw = section(yTop, 0.008);
    const cz = (sw.zf + sw.zb) / 2, rz0 = (sw.zf - sw.zb) / 2 + 0.008, rx0 = sw.x + 0.008;
    const need = [];   // [t, rx, rz] the body's extent down the skirt
    for (let k = 1; k <= 12; k++) { const t = k / 12; const y = yTop + (yHem - yTop) * t; const c = section(y, 0.01); need.push([t, c.x + 0.012, Math.max(c.zf - cz, cz - c.zb) + 0.012]); }
    const flare = o.flare ?? 1.55;
    const hemNeed = need[need.length - 1];
    const rxH = Math.max(rx0 * 1.05, hemNeed[1]) * flare, rzH = Math.max(rz0 * 1.1, hemNeed[2]) * flare * 0.92;
    const rest = new Float32Array((K + 1) * (S + 1) * 3);
    const geo = new THREE.BufferGeometry();
    const uvs = new Float32Array((K + 1) * (S + 1) * 2), idx = [];
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      const e = 1 - Math.pow(1 - t, 1.7);           // bell
      const y = yTop + (yHem - yTop) * t;
      // never narrower than the body under it (hips, seat)
      const nd = need.reduce((m, q) => (Math.abs(q[0] - t) < Math.abs(m[0] - t) ? q : m), need[0]);
      for (let s = 0; s <= S; s++) {
        const a = s / S * Math.PI * 2;
        const rx = Math.max(rx0 + (rxH - rx0) * e, t > 0.05 ? nd[1] * 1.04 : 0), rz = Math.max(rz0 + (rzH - rz0) * e, t > 0.05 ? nd[2] * 1.04 : 0);
        const pleat = o.pleats ? Math.pow(Math.abs(Math.sin(a * o.pleats / 2)), 0.5) * 0.008 * t : 0;
        const i = k * (S + 1) + s;
        rest[i * 3] = Math.sin(a) * (rx + pleat); rest[i * 3 + 1] = y; rest[i * 3 + 2] = cz + Math.cos(a) * (rz + pleat);
        uvs[i * 2] = s / S; uvs[i * 2 + 1] = t;
        if (k < K && s < S) { const a0 = i, b0 = i + 1, c0 = i + S + 1, d0 = i + S + 2; idx.push(a0, c0, b0, b0, c0, d0); }
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(rest.slice(), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const ab = new Float32Array((K + 1) * (S + 1) * 4); for (let i = 0; i < (K + 1) * (S + 1); i++) { ab[i * 4] = rest[i * 3]; ab[i * 4 + 1] = rest[i * 3 + 1]; ab[i * 4 + 2] = rest[i * 3 + 2]; }
    geo.setAttribute('aBind', new THREE.BufferAttribute(ab, 4));
    const mat = ctx.mat('acc', { color: o.color ?? 0xd0102c, finish: o.finish ?? 'gloss', side: THREE.DoubleSide, trim: o.trim ?? { hem: 0.012, waist: 0.0, gold: true }, pattern: o.pattern });
    const m = mesh(geo, mat, 'skirt'); m.frustumCulled = false;
    // the legs as capsules measured from the mesh: radius of the thigh below the hip, at the knee, the calf
    const legRad = (s0, s1) => { const rs = []; for (let v = 0; v < I.nv; v++) { if (I.region[v] < 4) continue; const sv = I.legS[v]; if (sv < s0 || sv > s1) continue; const sd = I.pos[v * 3] * I.side > 0 ? 'l' : 'r'; const c = I.LEG[sd]; const a = c.pts[0], b = c.pts[1], cc = c.pts[2]; const p = new THREE.Vector3(I.pos[v * 3], I.pos[v * 3 + 1], I.pos[v * 3 + 2]); const seg = sv < I.L.knee ? [a, b] : [b, cc]; const ab = seg[1].clone().sub(seg[0]); const u = Math.max(0, Math.min(1, p.clone().sub(seg[0]).dot(ab) / ab.lengthSq())); rs.push(p.distanceTo(seg[0].clone().addScaledVector(ab, u))); } rs.sort((x, y) => x - y); return rs[Math.floor(rs.length * 0.8)] || 0.07; };
    const rThigh = legRad(0.12, 0.2), rKnee = legRad(I.L.knee - 0.03, I.L.knee + 0.03), rCalf = legRad(I.L.calf - 0.03, I.L.calf + 0.03);
    const sStart = 0.1; // the capsule starts down the thigh (at the hip it is part of the pelvis)
    const margin = o.margin ?? 0.012;
    // per column: the current and target outward swing (radians)
    const theta = new Float32Array(S + 1), thetaT = new Float32Array(S + 1);
    const _p = new THREE.Vector3(), _w = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3(), _ax = new THREE.Vector3(), _q = new THREE.Quaternion(), _o = new THREE.Vector3();
    const ring = Array.from({ length: K + 1 }, () => new THREE.Vector3());
    const def = {
      root: m, local: true, dynamic: true,
      update(dt, fig) {
        if (def.broken) return;
        const Mi = new THREE.Matrix4().copy(fig.model.matrixWorld).invert();
        const Mp = new THREE.Matrix4().multiplyMatrices(Mi, fig.rig.bones.pelvis.matrixWorld).multiply(fig.boneInverse('pelvis'));
        // leg capsules in model space (bind units)
        const caps = [];
        for (const s of ['l', 'r']) {
          const a = fig.rig.bones['thigh_' + s].getWorldPosition(new THREE.Vector3()).applyMatrix4(Mi);
          const b = fig.rig.bones['calf_' + s].getWorldPosition(new THREE.Vector3()).applyMatrix4(Mi);
          const c = fig.rig.bones['foot_' + s].getWorldPosition(new THREE.Vector3()).applyMatrix4(Mi);
          const a2 = a.clone().lerp(b, sStart / a.distanceTo(b));
          caps.push([a2, b, rThigh + margin, rKnee + margin], [b, c, rKnee + margin, rCalf + margin]);
        }
        const inside = (p) => {
          for (const [a, b, ra, rb] of caps) {
            _d.subVectors(b, a); const u = Math.max(0, Math.min(1, _d.dot(_o.subVectors(p, a)) / _d.lengthSq()));
            const r = ra + (rb - ra) * u;
            if (_o.copy(a).addScaledVector(_d, u).distanceToSquared(p) < r * r) return true;
          }
          return false;
        };
        const ctr = new THREE.Vector3(0, yTop, cz).applyMatrix4(Mp);
        // each column hinges at its waistband point: find the least outward swing that clears the legs
        for (let s = 0; s < S; s++) {
          _w.set(rest[s * 3], rest[s * 3 + 1], rest[s * 3 + 2]).applyMatrix4(Mp);
          for (let k = 0; k <= K; k++) { const i = k * (S + 1) + s; ring[k].set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]).applyMatrix4(Mp); }
          _d.subVectors(ring[K], _w).normalize();                                // column direction
          _n.set(_w.x - ctr.x, 0, _w.z - ctr.z).normalize();                      // outward
          _ax.crossVectors(_d, _n).normalize();                                   // swing axis
          let th = 0;
          // rotating about d x n by +a swings the column out toward n (and up)
          const clear = (a) => { _q.setFromAxisAngle(_ax, a); for (let k = 2; k <= K; k++) { _p.subVectors(ring[k], _w).applyQuaternion(_q).add(_w); if (inside(_p)) return false; } return true; };
          if (!clear(0)) {
            let lo = 0, hi = 0.12; while (hi < 1.75 && !clear(hi)) { lo = hi; hi += 0.12; }
            for (let it = 0; it < 5; it++) { const mid = (lo + hi) / 2; if (clear(mid)) hi = mid; else lo = mid; }
            th = hi;
          }
          thetaT[s] = th;
        }
        thetaT[S] = thetaT[0];
        // fabric, not fingers: a lifted column lifts its neighbours (a wide falloff that keeps the peaks),
        // and the whole hem takes up a little of the tension so the bell stays one smooth shape
        for (let it = 0; it < 8; it++) { const t2 = thetaT.slice(); for (let s = 0; s < S; s++) { const l = t2[(s + S - 1) % S], r = t2[(s + 1) % S]; thetaT[s] = Math.max(t2[s] * 0.97, 0.4 * t2[s] + 0.3 * (l + r)); } thetaT[S] = thetaT[0]; }
        { let avg = 0; for (let s = 0; s < S; s++) avg += thetaT[s]; avg /= S; for (let s = 0; s <= S; s++) thetaT[s] = Math.max(thetaT[s], avg * 0.6); }
        const up = 1 - Math.exp(-dt * 40), down = 1 - Math.exp(-dt * 9);
        const pa = geo.attributes.position.array;
        for (let s = 0; s <= S; s++) {
          const ss = s % S;
          theta[ss] += (thetaT[ss] - theta[ss]) * (thetaT[ss] > theta[ss] ? up : down);
          _w.set(rest[ss * 3], rest[ss * 3 + 1], rest[ss * 3 + 2]).applyMatrix4(Mp);
          for (let k = 0; k <= K; k++) { const i = k * (S + 1) + ss; ring[k].set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]).applyMatrix4(Mp); }
          _d.subVectors(ring[K], _w).normalize(); _n.set(_w.x - ctr.x, 0, _w.z - ctr.z).normalize(); _ax.crossVectors(_d, _n).normalize();
          _q.setFromAxisAngle(_ax, theta[ss]);
          for (let k = 0; k <= K; k++) {
            const i = k * (S + 1) + s;
            // the swing bends in gradually down the column (stiff at the waistband)
            const f = Math.min(1, k / 3);
            _p.subVectors(ring[k], _w).applyQuaternion(_q).add(_w);
            pa[i * 3] = ring[k].x + (_p.x - ring[k].x) * f; pa[i * 3 + 1] = ring[k].y + (_p.y - ring[k].y) * f; pa[i * 3 + 2] = ring[k].z + (_p.z - ring[k].z) * f;
          }
        }
        geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      },
    };
    return def;
  },

  // coat tails / a long coat panel behind: two panels on spring-bone chains from the waist
  coat(ctx, o) {
    const { I } = ctx;
    const yTop = I.Y[o.from ?? 'waist'];
    const len = o.length ?? (yTop - (I.J.calf_l.y + 0.02));
    const g = new THREE.Group();
    const panels = [];
    const mat = ctx.mat('acc', { color: o.color ?? 0x0a0809, finish: o.finish ?? 'gloss', side: THREE.DoubleSide, interior: false, trim: o.trim ?? { hem: 0.01, sides: 0.008, gold: true } });
    const split = o.split ?? true;
    const parts = split ? [[-1, 0.0, 1.0], [1, 0.0, 1.0]] : [[0, -1, 1]];
    // back surface depth at a height
    const backZ = (y) => { let z = 9; for (let v = 0; v < I.nv; v++) { const yy = I.pos[v * 3 + 1]; if (Math.abs(yy - y) > 0.012) continue; if (I.region[v] === 1 || I.region[v] === 2 || I.region[v] === 3) continue; z = Math.min(z, I.pos[v * 3 + 2]); } return z; };
    const nb = 4;
    for (const [sd] of parts) {
      const bones = [];
      let parent = null;
      for (let b = 0; b <= nb; b++) {
        const t = b / nb; const y = yTop - len * t;
        const bone = new THREE.Bone(); bone.name = 'coat' + sd + '_' + b;
        const z = backZ(Math.max(y, I.J.calf_l.y)) - 0.015 - 0.03 * t;
        const pos = V3(sd * 0.06, y, z);
        bone.userData.bindPos = pos;
        bones.push(bone);
      }
      panels.push({ sd, bones });
    }
    return {
      root: g, bone: 'pelvis', bind: new THREE.Matrix4(), springs: true,
      build(fig) {
        // bones under the pelvis, in bind space; a skinned panel per chain
        const pel = fig.rig.bones.pelvis;
        const sp = new Springs();
        for (const P of panels) {
          let parent = pel; let parentBind = new THREE.Matrix4().copy(fig.boneInverse('pelvis')).invert();
          const names = [];
          for (const b of P.bones) {
            const wb = new THREE.Matrix4().makeTranslation(b.userData.bindPos.x, b.userData.bindPos.y, b.userData.bindPos.z);
            const local = new THREE.Matrix4().copy(parentBind).invert().multiply(wb);
            local.decompose(b.position, b.quaternion, b.scale);
            parent.add(b); parent = b; parentBind = wb; names.push(b.name);
          }
          const map = {}; for (const b of P.bones) map[b.name] = b;
          sp.addChain(map, names.slice(0, -1), { stiffness: o.stiffness ?? 0.55, drag: 0.42, gravity: 0.5, radius: 0.03 });
          // the panel mesh
          const W = 0.135, rows = 16, cols = 8;
          const geo = new THREE.BufferGeometry();
          const pos = [], uv = [], si = [], sw = [], ind = [], ab = [];
          for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
            const t = r / rows, u = c / cols;
            const by = yTop - len * t;
            const x = P.sd * 0.065 + (u - 0.5) * W * (1 + t * 0.5);
            const z = backZ(Math.max(by, I.J.calf_l.y)) - 0.012 - 0.03 * t + 0.035 * Math.pow(Math.abs(u - 0.5) * 2, 2) * (1 - t * 0.4);
            pos.push(x, by, z); uv.push(u, t); ab.push(x, by, z, 0);
            const f = t * nb; const b0 = Math.min(nb - 1, Math.floor(f)), wgt = f - b0;
            si.push(b0 + 1, b0 + 2, 0, 0); sw.push(1 - wgt, wgt, 0, 0);
            if (r < rows && c < cols) { const i = r * (cols + 1) + c; ind.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1); }
          }
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
          geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
          geo.setAttribute('aBind', new THREE.Float32BufferAttribute(ab, 4));
          geo.setIndex(ind); geo.computeVertexNormals();
          const bonesArr = [pel, ...P.bones];
          const inv = bonesArr.map((b, i) => (i === 0 ? fig.boneInverse('pelvis').clone() : new THREE.Matrix4().makeTranslation(b.userData.bindPos.x, b.userData.bindPos.y, b.userData.bindPos.z).invert()));
          const sm = new THREE.SkinnedMesh(geo, mat); sm.name = 'coat'; sm.castShadow = true; sm.frustumCulled = false;
          sm.bind(new THREE.Skeleton(bonesArr, inv), new THREE.Matrix4());
          fig.model.add(sm);
          P.mesh = sm;
        }
        // keep the panels off the legs and seat
        for (const s of ['l', 'r']) {
          sp.addCollider(fig.rig.bones['thigh_' + s], 0.085, V3(0, 0, 0));
          sp.addCollider(fig.rig.bones['thigh_' + s], 0.075, fig.boneAxisOffset('thigh_' + s, 0.18));
          sp.addCollider(fig.rig.bones['calf_' + s], 0.06, V3(0, 0, 0));
          sp.addCollider(fig.rig.bones['calf_' + s], 0.05, fig.boneAxisOffset('calf_' + s, 0.18));
        }
        this.springs = sp; this.panels = panels;
      },
      update(dt) { if (this.springs && !this.broken) this.springs.update(dt); },
      meshes() { return panels.map((p) => p.mesh).filter(Boolean); },
    };
  },

  // shoes (or boots): a shell of the body's own feet, pushed out a few millimetres and smoothed so the
  // toes merge into a toe box, skinned with the feet's weights; a pointed or round toe; gold top edge
  shoes(ctx, o) {
    return {
      root: new THREE.Group(), skinned: true,
      build(fig) {
        const I = fig.I, src = fig.body.geometry;
        const from = typeof o.from === 'number' ? o.from : I.L[o.from ?? 'ankle'];
        const P = I.pos, N = I.nrm, idx = I.idx;
        const keep = [];
        for (let t = 0; t < I.nt; t++) { let ok = true; for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; const wl = I.gW(v, 7) + I.gW(v, 8) + I.gW(v, 9) + I.gW(v, 10); if (I.legS[v] < from || wl < 0.5) ok = false; } if (ok) keep.push(t); }
        // weld the kept vertices by position
        const map = new Map(), verts = [];
        const key = (v) => Math.round(P[v * 3] * 2e4) + ',' + Math.round(P[v * 3 + 1] * 2e4) + ',' + Math.round(P[v * 3 + 2] * 2e4);
        const tri = [];
        for (const t of keep) for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; const kk = key(v); if (!map.has(kk)) { map.set(kk, verts.length); verts.push(v); } tri.push(map.get(kk)); }
        const n = verts.length;
        const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
        verts.forEach((v, i) => { for (let c = 0; c < 3; c++) { pos[i * 3 + c] = P[v * 3 + c]; nrm[i * 3 + c] = N[v * 3 + c]; } });
        const nb = Array.from({ length: n }, () => new Set());
        for (let i = 0; i < tri.length; i += 3) { const a = tri[i], b = tri[i + 1], c = tri[i + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
        const edge = new Map(); for (let i = 0; i < tri.length; i += 3) for (const [a, b] of [[tri[i], tri[i + 1]], [tri[i + 1], tri[i + 2]], [tri[i + 2], tri[i]]]) { const k2 = a < b ? a + '_' + b : b + '_' + a; edge.set(k2, (edge.get(k2) || 0) + 1); }
        const rim = new Uint8Array(n); for (const [k2, c] of edge) if (c === 1) { const [a, b] = k2.split('_').map(Number); rim[a] = 1; rim[b] = 1; }
        const nbA = nb.map((s2) => [...s2]);
        const off = o.thickness ?? 0.0045;
        for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] += nrm[i * 3 + c] * off;
        // Taubin smoothing (no shrink): the toes melt into one toe box; the rim stays put
        const it = o.smooth ?? 18;
        for (let k = 0; k < it * 2; k++) {
          const lam = k % 2 ? -0.53 : 0.5; const nxt = pos.slice();
          for (let i = 0; i < n; i++) { if (rim[i]) continue; const ns = nbA[i]; if (!ns.length) continue; for (let c = 0; c < 3; c++) { let a = 0; for (const j of ns) a += pos[j * 3 + c]; a /= ns.length; nxt[i * 3 + c] = pos[i * 3 + c] + lam * (a - pos[i * 3 + c]); } }
          pos.set(nxt);
        }
        // toe shape, and keep the sole on the floor
        const floor = (() => { let m = 9; for (const v of verts) m = Math.min(m, P[v * 3 + 1]); return m; })();
        for (let i = 0; i < n; i++) {
          const sd = pos[i * 3] * I.side > 0 ? 'l' : 'r';
          const ball = I.J['ball_' + sd], toe = I.J['ball_leaf_' + sd];
          const z = pos[i * 3 + 2];
          if (z > ball.z) {
            const t = Math.min(1.4, (z - ball.z) / Math.max(0.02, toe.z - ball.z));
            const pt = o.toe === 'round' ? 0.12 : 0.3;
            pos[i * 3 + 2] = z + (z - ball.z) * pt;
            pos[i * 3] = ball.x + (pos[i * 3] - ball.x) * (1 - (o.toe === 'round' ? 0.1 : 0.32) * t * t);
            pos[i * 3 + 1] = floor + (pos[i * 3 + 1] - floor) * (1 - 0.25 * t * t);
          }
          pos[i * 3 + 1] = Math.max(pos[i * 3 + 1], floor + 0.0005);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const si = src.attributes.skinIndex, swt = src.attributes.skinWeight, uvs = new Float32Array(n * 2), ab = new Float32Array(n * 4);
        const SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
        verts.forEach((v, i) => { for (let c = 0; c < 4; c++) { SI[i * 4 + c] = si.getComponent(v, c); SW[i * 4 + c] = swt.getComponent(v, c); } uvs[i * 2] = (Math.atan2(P[v * 3], P[v * 3 + 2]) / Math.PI + 1) / 2; uvs[i * 2 + 1] = Math.min(1, Math.max(0, (I.legS[v] - from) / 0.25)); ab[i * 4] = pos[i * 3]; ab[i * 4 + 1] = pos[i * 3 + 1]; ab[i * 4 + 2] = pos[i * 3 + 2]; });
        g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
        g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setAttribute('aBind', new THREE.BufferAttribute(ab, 4));
        g.setIndex(tri); g.computeVertexNormals();
        const mat = ctx.mat('acc', { color: o.color ?? 0x060506, finish: o.finish ?? 'lacquer', trim: o.trim === false ? null : { waist: o.trimWidth ?? 0.004 } });
        const sm = new THREE.SkinnedMesh(g, mat); sm.name = 'shoes'; sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
        sm.bind(fig.body.skeleton, fig.body.bindMatrix);
        fig.body.parent.add(sm);
        this.root = sm; this.mesh = sm;
      },
    };
  },

  // handcuffs worn as bangles: a cuff on each wrist, the hinge, a broken chain swinging from it
  handcuffs(ctx, o) {
    const { I } = ctx;
    const g = new THREE.Group();
    const metal = ctx.mat('acc', { color: o.color ?? 0xffffff, finish: o.finish ?? 'silver', goldTint: o.finish === 'gold' });
    const defs = [];
    const out = [];
    for (const s of ['l', 'r']) {
      const w = I.J['hand_' + s].clone().lerp(I.J['lowerarm_' + s], 0.12);
      const cuff = new THREE.Group();
      const ring = mesh(new THREE.TorusGeometry(o.radius ?? 0.04, 0.0058, 14, 48), metal, 'cuff');
      const ring2 = mesh(new THREE.TorusGeometry((o.radius ?? 0.04) - 0.0005, 0.0026, 8, 48), metal, 'cuff'); ring2.position.z = 0.0075;
      const hinge = mesh(new THREE.BoxGeometry(0.012, 0.014, 0.018), metal, 'hinge'); hinge.position.set(0, -(o.radius ?? 0.04) - 0.004, 0.003);
      cuff.add(ring, ring2, hinge);
      cuff.rotation.y = Math.PI / 2; // ring axis along the arm (x)
      const holder = new THREE.Group(); holder.add(cuff);
      // a chain: links hang from the hinge, driven by a small verlet string in world space
      const links = [];
      for (let i = 0; i < (o.links ?? 3); i++) { const l = mesh(new THREE.TorusGeometry(0.0085, 0.0019, 8, 20), metal, 'link'); l.scale.set(1, 1.45, 1); links.push(l); }
      out.push({ s, holder, w, links });
    }
    return {
      root: g, multi: out.map((c) => ({ root: c.holder, bone: 'hand_' + c.s, bind: placeM(c.w, [0, 0, 0]) })),
      chains: out,
      worldLinks: true, alwaysUpdate: true,
      update(dt, fig) {
        for (const c of out) {
          if (!c.pts) {
            c.pts = c.links.map(() => new THREE.Vector3()); c.prev = c.links.map(() => new THREE.Vector3()); c.init = false;
            for (const l of c.links) fig.world.add(l);
          }
          const anchor = new THREE.Vector3(0, -(o.radius ?? 0.04) - 0.012, 0.0).applyMatrix4(c.holder.children[0].matrixWorld);
          const seg = 0.019 * fig.scale;
          if (!c.init) { c.pts.forEach((p, i) => p.copy(anchor).add(V3(0, -seg * (i + 1), 0))); c.prev.forEach((p, i) => p.copy(c.pts[i])); c.init = true; }
          for (let i = 0; i < c.pts.length; i++) {
            const p = c.pts[i], pv = c.prev[i];
            const vx = (p.x - pv.x) * 0.96, vy = (p.y - pv.y) * 0.96, vz = (p.z - pv.z) * 0.96;
            pv.copy(p); p.x += vx; p.y += vy - 9.8 * dt * dt; p.z += vz;
            if (p.y < fig.floorY + 0.004) { p.y = fig.floorY + 0.004; pv.x = p.x; pv.z = p.z; }
          }
          for (let it = 0; it < 4; it++) {
            let prevP = anchor;
            for (let i = 0; i < c.pts.length; i++) { const p = c.pts[i]; const d = p.clone().sub(prevP); const l = d.length() || 1; p.copy(prevP).addScaledVector(d, seg / l); prevP = p; }
          }
          let prevP = anchor;
          c.links.forEach((l, i) => {
            const p = c.pts[i]; const mid = prevP.clone().add(p).multiplyScalar(0.5);
            l.position.copy(mid); l.scale.setScalar(fig.scale).multiply(V3(1, 1.45, 1));
            const dir = p.clone().sub(prevP).normalize();
            l.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
            if (i % 2) l.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI / 2));
            prevP = p;
          });
        }
      },
    };
  },

  // a gold cuff ring at a point on the arm (glove tops, bracelets)
  cuffs(ctx, o) {
    const { I } = ctx;
    const metal = ctx.mat('acc', { color: 0xffffff, finish: o.finish ?? 'gold', goldTint: true });
    const at = o.at ?? 'wrist';
    const out = [];
    for (const s of ['l', 'r']) {
      const c = I.ARM[s];
      const sArc = typeof at === 'number' ? at : I.A[at];
      let seg = 0; while (seg < c.cum.length - 2 && c.cum[seg + 1] < sArc) seg++;
      const t = (sArc - c.cum[seg]) / c.lens[seg];
      const p = c.pts[seg].clone().lerp(c.pts[seg + 1], t);
      const r = o.radius ?? (at === 'elbow' ? 0.047 : 0.038);
      const ring = mesh(new THREE.TorusGeometry(r, o.tube ?? 0.0045, 12, 48), metal, 'cuffring'); ring.rotation.y = Math.PI / 2; ring.scale.set(1, 1, 0.8);
      const h = new THREE.Group(); h.add(ring);
      out.push({ root: h, bone: at === 'elbow' || (typeof at === 'number' && at < I.A.elbow) ? 'upperarm_' + s : 'lowerarm_' + s, bind: placeM(p, [0, 0, 0]) });
    }
    return { root: new THREE.Group(), multi: out };
  },

  // a name tag on the chest: a small enamel plate with printed text
  nametag(ctx, o) {
    const { I } = ctx;
    const W = o.w ?? 0.085, H = o.h ?? 0.032;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * H / W);
    const c2 = cv.getContext('2d');
    c2.fillStyle = o.plate ?? '#f6f1e8'; c2.fillRect(0, 0, cv.width, cv.height);
    c2.fillStyle = o.band ?? '#e2581b'; c2.fillRect(0, 0, cv.width, cv.height * 0.3);
    c2.fillStyle = '#ffffff'; c2.font = `bold ${Math.round(cv.height * 0.2)}px Arial, Helvetica, sans-serif`; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText(o.header ?? 'HELLO', cv.width / 2, cv.height * 0.155);
    c2.fillStyle = '#141010';
    const lines = (o.text ?? 'NAME').split('\n');
    const fs = Math.round(cv.height * (lines.length > 1 ? 0.24 : 0.32));
    c2.font = `bold ${fs}px "Arial Narrow", Arial, Helvetica, sans-serif`;
    lines.forEach((t, i) => c2.fillText(t, cv.width / 2, cv.height * (0.3 + 0.7 * (i + 0.5) / lines.length)));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const shape = roundRect(W, H, 0.004);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 2 });
    // uv on the front face: map x,y to 0..1
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H);
    const face = ctx.mat('acc', { color: 0xffffff, finish: 'gloss', map: tex });
    const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    const g = new THREE.Group();
    g.add(mesh(geo, face, 'tag'));
    const rim = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shape.getSpacedPoints(80).map((q) => V3(q.x, q.y, 0.0028)), true), 120, 0.0011, 5, true);
    g.add(mesh(rim, gold, 'tagrim'));
    const side = o.side === 'r' ? -I.side : I.side;
    const x = side * (o.x ?? 0.065), y = o.y ?? (I.Y.bust + 0.045);
    let z = -9; for (let v = 0; v < I.nv; v++) { if (I.region[v] !== 0) continue; if (Math.abs(I.pos[v * 3] - x) < 0.02 && Math.abs(I.pos[v * 3 + 1] - y) < 0.015) z = Math.max(z, I.pos[v * 3 + 2]); }
    return { root: g, bone: 'spine_03', bind: placeM(V3(x, y, z + 0.006), [-14 * deg, side * 12 * deg, side * -4 * deg]) };
  },

  // a tailor's measuring tape around the neck, the ends hanging down the front
  tape(ctx, o) {
    const { I } = ctx;
    const surf = (x, y, front) => { let z = front ? -9 : 9; for (let v = 0; v < I.nv; v++) { if (I.region[v] !== 0) continue; if (Math.abs(I.pos[v * 3] - x) < 0.015 && Math.abs(I.pos[v * 3 + 1] - y) < 0.012) z = front ? Math.max(z, I.pos[v * 3 + 2]) : Math.min(z, I.pos[v * 3 + 2]); } return z; };
    const nb = I.Y.neckBase;
    const s = I.side;
    const lEnd = I.Y[o.left ?? 'underbust'], rEnd = I.Y[o.right ?? 'navel'];
    const pts = [];
    const add = (x, y, front, out = 0.007) => { const z = surf(x, y, front); pts.push(V3(x, y, z + (front ? out : -out))); };
    for (let k = 0; k <= 6; k++) { const y = lEnd + (nb - 0.03 - lEnd) * k / 6; add(s * (0.055 + 0.01 * (1 - k / 6)), y, true); }
    pts.push(V3(s * 0.06, nb + 0.002, I.zMid(nb) + 0.03), V3(s * 0.062, nb + 0.012, I.zMid(nb) - 0.02));
    pts.push(V3(0, nb + 0.024, I.zMid(nb + 0.03) - 0.055));
    pts.push(V3(-s * 0.062, nb + 0.012, I.zMid(nb) - 0.02), V3(-s * 0.06, nb + 0.002, I.zMid(nb) + 0.03));
    for (let k = 6; k >= 0; k--) { const y = rEnd + (nb - 0.03 - rEnd) * k / 6; add(-s * (0.05 + 0.012 * (1 - k / 6)), y, true); }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    const geo = ribbon(curve, 0.017, 200, (p, t) => V3(p.x * 0.6, 0, p.z - I.zMid(p.y)).normalize());
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 32;
    const c2 = cv.getContext('2d'); c2.fillStyle = o.color ?? '#f2c418'; c2.fillRect(0, 0, 2048, 32);
    c2.fillStyle = '#1a120a';
    for (let i = 0; i < 2048; i += 8) { const big = i % 40 === 0; c2.fillRect(i, 0, 2, big ? 14 : 7); c2.fillRect(i, 32 - (big ? 14 : 7), 2, big ? 14 : 7); }
    c2.font = 'bold 12px Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; for (let i = 40, n = 1; i < 2048; i += 80, n++) c2.fillText(String(n * 2), i, 16);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = ctx.mat('acc', { color: 0xffffff, finish: 'satin', map: tex, side: THREE.DoubleSide, interior: false });
    const g = new THREE.Group(); g.add(mesh(geo, m, 'tape'));
    const brass = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    const end = mesh(new THREE.BoxGeometry(0.02, 0.006, 0.004), brass, 'tapeEnd'); end.position.copy(pts[pts.length - 1]).add(V3(0, -0.003, 0)); g.add(end);
    return { root: g, bone: 'spine_03', bind: new THREE.Matrix4(), bindIsIdentity: true };
  },
};

// ---------------------------------------------------------------------------------------------
// Russian veiling: a diamond net of fine threads, chenille dots on some crossings, a fine edge
const LACE_ALPHA = /* glsl */`
{
  vec2 lu = vFigUv * fLaceScale;
  vec2 d = vec2(lu.x + lu.y, lu.x - lu.y);
  vec2 f = abs(fract(d) - 0.5);
  float fwN = max(fwidth(d.x), fwidth(d.y)) * 0.75;
  float thread = 0.035;
  float net = max(1.0 - smoothstep(thread - fwN, thread + fwN, 0.5 - f.x), 1.0 - smoothstep(thread - fwN, thread + fwN, 0.5 - f.y));
  vec2 cell = floor(d + 0.5);
  float dotM = (1.0 - smoothstep(0.12 - fwN, 0.12 + fwN, length(d - cell))) * step(0.6, fHash12(cell * 0.71 + 3.0));
  float edge = step(0.985, vFigUv.y) + step(vFigUv.y, 0.012);
  diffuseColor.a = max(max(net, dotM), edge);
}`;

const _t = new THREE.Vector3();
function stepCloth(c, dt, scale) {
  const { nx, ny, P, Q, T } = c;
  dt = Math.min(dt, 1 / 30);
  const N = nx * ny;
  const g = -9.8 * dt * dt;
  const damp = c.pinned ? 0.94 : 0.985;
  const k = c.pinned ? 1 - Math.pow(1 - c.stiff, dt * 60) : 0;
  for (let i = 0; i < N; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    P[i * 3] += (x - Q[i * 3]) * damp; P[i * 3 + 1] += (y - Q[i * 3 + 1]) * damp + g; P[i * 3 + 2] += (z - Q[i * 3 + 2]) * damp;
    Q[i * 3] = x; Q[i * 3 + 1] = y; Q[i * 3 + 2] = z;
    // stiff porcelain lace: pulled back toward its drape
    if (k > 0) { P[i * 3] += (T[i * 3] - P[i * 3]) * k; P[i * 3 + 1] += (T[i * 3 + 1] - P[i * 3 + 1]) * k; P[i * 3 + 2] += (T[i * 3 + 2] - P[i * 3 + 2]) * k; }
  }
  const rest = c.rest * scale, restX = c.restX * scale;
  const cons = (a, b, L) => {
    const dx = P[b * 3] - P[a * 3], dy = P[b * 3 + 1] - P[a * 3 + 1], dz = P[b * 3 + 2] - P[a * 3 + 2];
    const d = Math.hypot(dx, dy, dz) || 1e-6; const f = (d - L) / d;
    const wa = c.pinned && a < nx ? 0 : 1, wb = c.pinned && b < nx ? 0 : 1; const s = wa + wb; if (!s) return;
    P[a * 3] += dx * f * wa / s; P[a * 3 + 1] += dy * f * wa / s; P[a * 3 + 2] += dz * f * wa / s;
    P[b * 3] -= dx * f * wb / s; P[b * 3 + 1] -= dy * f * wb / s; P[b * 3 + 2] -= dz * f * wb / s;
  };
  for (let it = 0; it < 8; it++) {
    if (c.pinned) for (let i = 0; i < nx; i++) { P[i * 3] = T[i * 3]; P[i * 3 + 1] = T[i * 3 + 1]; P[i * 3 + 2] = T[i * 3 + 2]; }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const kk = j * nx + i;
      if (i < nx - 1) cons(kk, kk + 1, c.pinned ? dist3(T, kk, kk + 1) : restX * (1 - 0.12 * j / ny));
      if (j < ny - 1) cons(kk, kk + nx, c.pinned ? dist3(T, kk, kk + nx) : rest);
    }
    for (const s of c.spheres) for (let i = 0; i < N; i++) {
      const dx = P[i * 3] - s.c.x, dy = P[i * 3 + 1] - s.c.y, dz = P[i * 3 + 2] - s.c.z; const d = Math.hypot(dx, dy, dz);
      if (d < s.r && d > 1e-6) { const f = s.r / d; P[i * 3] = s.c.x + dx * f; P[i * 3 + 1] = s.c.y + dy * f; P[i * 3 + 2] = s.c.z + dz * f; }
    }
    for (let i = 0; i < N; i++) if (P[i * 3 + 1] < c.floorY + 0.003) { P[i * 3 + 1] = c.floorY + 0.003; Q[i * 3] = P[i * 3] * 0.3 + Q[i * 3] * 0.7; Q[i * 3 + 2] = P[i * 3 + 2] * 0.3 + Q[i * 3 + 2] * 0.7; }
  }
}
const dist3 = (A, a, b) => Math.hypot(A[b * 3] - A[a * 3], A[b * 3 + 1] - A[a * 3 + 1], A[b * 3 + 2] - A[a * 3 + 2]);

function bendAround(geo, R) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = x / R; const r = R + z; p.setXYZ(i, Math.sin(a) * r, p.getY(i), Math.cos(a) * r); }
  geo.computeVertexNormals();
}
function roundRect(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// a flat strip along a curve; `outward(p, t)` gives the side the strip faces
function ribbon(curve, width, n, outward) {
  const pos = [], uv = [], ind = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const p = curve.getPointAt(t); const tan = curve.getTangentAt(t);
    const out = outward(p, t); const side = new THREE.Vector3().crossVectors(tan, out).normalize();
    pos.push(p.x + side.x * width / 2, p.y + side.y * width / 2, p.z + side.z * width / 2, p.x - side.x * width / 2, p.y - side.y * width / 2, p.z - side.z * width / 2);
    uv.push(t, 0, t, 1);
    if (i < n) { const k = i * 2; ind.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind); g.computeVertexNormals(); return g;
}
