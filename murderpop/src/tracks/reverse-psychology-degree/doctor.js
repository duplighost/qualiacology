// THE DOCTOR as a porcelain figurine: a lecturer who looms (Superhero_Female at 1.30), jet glaze and crimson velvet,
// gold leaf piping, a black-lacquer bob with gold dust in its grooves, a mortarboard, half-moon glasses, a doctoral
// hood, bell cuffs, an ebony pointer with a red glass bead (her laser) and a clipboard of star stickers. Over her heart
// a self-awarded gold star: the only thing of her that doesn't break.
// Accessories are registered on the shared ACCESSORIES table under rpd* names (built in bind space, metres, +z forward).
import * as THREE from 'three';
import { ACCESSORIES, HAIR_PAD } from '../../game/figurine/accessories.js';
import { EXPRESSIONS } from '../../game/figurine.js';

export const SCALE = 1.3;
const S = 1 / SCALE;                 // world metres -> bind metres
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;
const C = { jet: 0x0b0a0d, jet2: 0x120f17, crimson: 0x8e0e1f, satin: 0xb3122a, gold: 'gold', smoke: 0x3a3840, collar: 0xf4f1ea, lacquer: 0x07070b, oxblood: 0x5a0c1c, cream: 0xf2ead8 };

function placeM(pos, euler = [0, 0, 0], s = 1) { return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(euler[0], euler[1], euler[2], 'YXZ')), new THREE.Vector3(s, s, s)); }
function mesh(geo, mat, name) { const m = new THREE.Mesh(geo, mat); m.name = name || ''; m.castShadow = true; m.receiveShadow = true; return m; }
function lathe(profile, seg = 48) { const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.computeVertexNormals(); return g; }
// a frame whose +y runs along dir (and +z as close to `up` as it can)
function alongM(pos, dir, up = V3(0, 1, 0)) {
  const y = dir.clone().normalize(); let z = up.clone().sub(y.clone().multiplyScalar(up.dot(y))); if (z.lengthSq() < 1e-6) z = V3(0, 0, 1); z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}
const gold = (ctx) => ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
function star5(r, inner = 0.42) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; }
function surfZ(I, x, y, front = true) { let z = front ? -9 : 9; for (let v = 0; v < I.nv; v++) { if (I.region[v] !== 0) continue; if (Math.abs(I.pos[v * 3] - x) < 0.02 && Math.abs(I.pos[v * 3 + 1] - y) < 0.014) z = front ? Math.max(z, I.pos[v * 3 + 2]) : Math.min(z, I.pos[v * 3 + 2]); } return z; }
function armAt(I, s, sArc) {
  const c = I.ARM[s]; let seg = 0; while (seg < c.cum.length - 2 && c.cum[seg + 1] < sArc) seg++;
  const t = (sArc - c.cum[seg]) / c.lens[seg];
  return { p: c.pts[seg].clone().lerp(c.pts[seg + 1], t), dir: c.pts[seg + 1].clone().sub(c.pts[seg]).normalize(), seg };
}

// ---------------------------------------------------------------------------------------------- the accessories
ACCESSORIES.rpdMortarboard = (ctx, o) => {
  const { I } = ctx;
  const pad = HAIR_PAD[ctx.hairStyle] ?? 0.016;
  const lac = ctx.mat('acc', { color: C.lacquer, finish: 'lacquer' }), g = gold(ctx);
  const half = 0.34 * S / 2, th = 0.012 * S;
  const top = I.top + pad;
  // the board in two triangular halves (it cracks on the diagonal), on a flattened skull cap
  const tri = (sgn) => { const sh = new THREE.Shape(); sh.moveTo(-half, -half); sh.lineTo(half, half); sh.lineTo(sgn > 0 ? half : -half, sgn > 0 ? -half : half); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 }); geo.rotateX(-Math.PI / 2); geo.translate(0, -th * 0.5, 0); return geo; };
  const capR = 0.105 * S;
  const capGeo = new THREE.SphereGeometry(capR, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); capGeo.scale(1.02, 0.62, 1.08);
  const pieces = [];
  const boardM = placeM(V3(0, top + 0.012, I.headC.z - 0.006), [-6 * deg, 0, -12 * deg * I.side]);
  for (const sgn of [1, -1]) { const gg = new THREE.Group(); gg.add(mesh(tri(sgn), lac, 'board')); if (sgn > 0) { const btn = mesh(new THREE.SphereGeometry(0.012 * S, 16, 8), g, 'button'); btn.scale.y = 0.5; btn.position.y = th * 0.6; gg.add(btn); } pieces.push({ root: gg, bone: 'Head', bind: boardM.clone() }); }
  const cap = new THREE.Group(); cap.add(mesh(capGeo, lac, 'cap'));
  pieces.push({ root: cap, bone: 'Head', bind: placeM(V3(0, top - capR * 0.42, I.headC.z - 0.004), [-6 * deg, 0, -10 * deg * I.side]) });
  // the tassel: a gold bullion cord over her right temple and a fringed cone (a little pendulum)
  const tas = new THREE.Group();
  const cord = mesh(new THREE.CylinderGeometry(0.0035 * S, 0.0035 * S, 0.17 * S, 6), g, 'cord'); cord.position.y = -0.085 * S; tas.add(cord);
  const cone = mesh(lathe([[0.0, 0.0], [0.006 * S, -0.004 * S], [0.018 * S, -0.06 * S], [0.024 * S, -0.09 * S], [0.0, -0.09 * S]], 16), g, 'fringe'); cone.position.y = -0.17 * S; tas.add(cone);
  const swing = new THREE.Group(); swing.add(tas);
  const rx = -I.side * half * 0.92;
  pieces.push({ root: swing, bone: 'Head', bind: placeM(V3(rx, top + 0.012 + Math.sin(12 * deg) * half * 0.9, I.headC.z + half * 0.2), [0, 0, 0]) });
  return {
    root: new THREE.Group(), multi: pieces,
    update(dt, fig) { const t = fig.t; swing.rotation.set(Math.sin(t * 2.1) * 0.12 + fig.rig.flinch * 0.4, 0, Math.sin(t * 1.7 + 1) * 0.1); },
  };
};

ACCESSORIES.rpdGlasses = (ctx, o) => {
  const { I } = ctx;
  const g = new THREE.Group(), au = gold(ctx);
  const lensM = ctx.mat('acc', { color: 0xdfe8f0, finish: 'gloss', transparent: true, opacity: 0.28, depthWrite: false, cracks: false });
  const r = 0.032 * S * 0.86, wire = 0.0013;
  const lens = (sd) => {
    const sh = new THREE.Shape(); sh.moveTo(-r, 0); sh.absarc(0, 0, r, Math.PI, Math.PI * 2, false); sh.lineTo(-r, 0);
    const side = new THREE.Group();
    const lm = mesh(new THREE.ShapeGeometry(sh, 16), lensM, 'lens'); lm.castShadow = false; side.add(lm);
    const pts = sh.getSpacedPoints(40).map((p) => V3(p.x, p.y, 0.0005));
    side.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 60, wire, 5, true), au, 'rim'));
    side.position.x = sd * Math.abs(I.EYE.l.c.x); side.rotation.y = sd * 8 * deg;
    side.userData.side = sd * I.side > 0 ? 'l' : 'r';
    return side;
  };
  const L = lens(1), R = lens(-1); g.add(L, R);
  const bridge = mesh(new THREE.TorusGeometry(0.008, wire, 5, 12, Math.PI), au, 'bridge'); bridge.position.set(0, 0.001, 0.001); g.add(bridge);
  for (const sd of [1, -1]) { const arm = mesh(new THREE.CylinderGeometry(wire, wire, 0.1, 4), au, 'temple'); arm.rotation.x = Math.PI / 2; arm.position.set(sd * (Math.abs(I.EYE.l.c.x) + r + 0.002), 0.004, -0.05); g.add(arm); }
  const ez = I.EYE.l.c.z + I.EYE.l.r + 0.014;
  const def = { root: g, bone: 'Head', bind: placeM(V3(0, I.EYE.l.c.y - 0.017, ez), [10 * deg, 0, 0]) };
  def.lensL = I.side > 0 ? L : R;      // her left lens (it shatters when the bar empties)
  return def;
};

// the doctoral hood: a U-shaped shell from the shoulders down her back, velvet outside, a V of crimson satin turned out
ACCESSORIES.rpdHood = (ctx, o) => {
  const { I } = ctx;
  const W = 0.38 * S, Hh = 0.55 * S;
  const yTop = I.Y.neckBase + 0.005, back = (y) => surfZ(I, 0, y, false) - 0.012;
  const nx = 14, ny = 12;
  const outer = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
  for (let j = 0; j <= ny; j++) {
    const t = j / ny, y = yTop - Hh * t;
    const halfW = (W / 2) * Math.pow(1 - t, 0.85) + 0.004;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx * 2 - 1, x = u * halfW;
      const z = back(Math.max(y, I.Y.waist)) - 0.018 * (1 - u * u) - 0.02 * t + Math.abs(u) * 0.025 * (1 - t);
      pos.push(x, y, z); uv.push(i / nx, t);
    }
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c2 = a + nx + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  outer.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); outer.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); outer.setIndex(idx); outer.computeVertexNormals();
  const velvet = ctx.mat('acc', { color: 0x0b090c, finish: 'matte', side: THREE.DoubleSide, roughness: 0.8 });
  const g = new THREE.Group(); g.add(mesh(outer, velvet, 'hood'));
  // the lining: a crimson satin V turned out, crossed by a gold chevron
  const vs = new THREE.Shape(); vs.moveTo(-W * 0.36, 0); vs.lineTo(W * 0.36, 0); vs.lineTo(0, -Hh * 0.72); vs.closePath();
  const vg = new THREE.ShapeGeometry(vs, 4); vg.translate(0, yTop - 0.012, 0);
  const vp = vg.attributes.position; for (let i = 0; i < vp.count; i++) { const y = vp.getY(i), x = vp.getX(i); vp.setZ(i, back(Math.max(y, I.Y.waist)) - 0.024 - 0.018 * (1 - (x / (W / 2)) ** 2)); }
  vg.computeVertexNormals();
  const satin = ctx.mat('acc', { color: C.satin, finish: 'gloss', side: THREE.DoubleSide });
  g.add(mesh(vg, satin, 'lining'));
  const ch = new THREE.Shape(); const cw = 0.03 * S; ch.moveTo(-W * 0.26, 0); ch.lineTo(0, -W * 0.24); ch.lineTo(W * 0.26, 0); ch.lineTo(W * 0.26, -cw); ch.lineTo(0, -W * 0.24 - cw); ch.lineTo(-W * 0.26, -cw); ch.closePath();
  const cg = new THREE.ShapeGeometry(ch, 2); cg.translate(0, yTop - Hh * 0.2, 0);
  const cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), x = cp.getX(i); cp.setZ(i, back(Math.max(y, I.Y.waist)) - 0.028 - 0.018 * (1 - (x / (W / 2)) ** 2)); }
  cg.computeVertexNormals();
  g.add(mesh(cg, gold(ctx), 'chevron'));
  return { root: g, bone: 'spine_03', bind: new THREE.Matrix4() };
};

// the doctoral bell sleeve, made rigid: a flared cone at each wrist, gold piping at the rim
ACCESSORIES.rpdCuffs = (ctx, o) => {
  const { I } = ctx;
  const m = ctx.mat('acc', { color: C.jet, finish: 'gloss', side: THREE.DoubleSide }), g = gold(ctx);
  const out = [];
  for (const s of ['l', 'r']) {
    const { p, dir } = armAt(I, s, I.A.wrist - 0.1 * S);
    const L = 0.11 * S, r0 = 0.06 * S * 0.78, r1 = 0.085 * S * 0.85;
    const h = new THREE.Group();
    h.add(mesh(lathe([[r0, 0], [r0 * 1.05, L * 0.3], [r1 * 0.9, L * 0.8], [r1, L]], 32), m, 'bell'));
    const rim = mesh(new THREE.TorusGeometry(r1, 0.0025, 6, 40), g, 'bellrim'); rim.rotation.x = Math.PI / 2; rim.position.y = L; h.add(rim);
    out.push({ root: h, bone: 'lowerarm_' + s, bind: alongM(p, dir, V3(0, 1, 0)) });
  }
  return { root: new THREE.Group(), multi: out };
};

// her pointer: an ebony rod with gold ferrules, a gold grip and a red glass bead (the laser comes from it)
ACCESSORIES.rpdPointer = (ctx, o) => {
  const { I } = ctx;
  const len = 1.1 * S, ebony = ctx.mat('acc', { color: 0x0d0907, finish: 'lacquer' }), g = gold(ctx);
  const root = new THREE.Group();
  const rod = mesh(new THREE.CylinderGeometry(0.006 * S, 0.012 * S, len, 10, 1), ebony, 'rod'); rod.position.y = len / 2 - 0.06 * S; root.add(rod);
  const grip = mesh(new THREE.CylinderGeometry(0.0145 * S, 0.0145 * S, 0.12 * S, 12), g, 'grip'); grip.position.y = 0; root.add(grip);
  for (let k = 1; k <= 3; k++) { const fr = mesh(new THREE.CylinderGeometry(0.0115 * S - k * 0.0012, 0.0115 * S - k * 0.0012, 0.012 * S, 10), g, 'ferrule'); fr.position.y = -0.06 * S + k * 0.25 * S; root.add(fr); }
  const bead = mesh(new THREE.SphereGeometry(0.009 * S * 1.4, 16, 10), ctx.mat('acc', { color: 0xc8101c, finish: 'lacquer', cracks: false }), 'bead');
  bead.position.y = len - 0.06 * S + 0.006; root.add(bead);
  // the bead glows (emissive on top of the glaze)
  bead.material.emissive = new THREE.Color(1.6, 0.05, 0.05);
  const hand = I.J.hand_r, fore = I.J.lowerarm_r;
  const dir = hand.clone().sub(fore).normalize();
  const at = hand.clone().addScaledVector(dir, 0.045).add(V3(0, -0.012, 0.006));
  return { root, bone: 'hand_r', bind: alongM(at, dir, V3(0, 0, 1)), bead };
};

// the clipboard: black lacquer, a big gold clip, a cream sheet of twelve pink star stickers
ACCESSORIES.rpdClipboard = (ctx, o) => {
  const { I } = ctx;
  const W = 0.23 * S, Hh = 0.32 * S, T = 0.008 * S;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 356; const c2 = cv.getContext('2d');
  c2.fillStyle = '#f2ead8'; c2.fillRect(0, 0, 256, 356);
  c2.strokeStyle = 'rgba(120,40,60,0.25)'; c2.lineWidth = 2; for (let y = 40; y < 356; y += 24) { c2.beginPath(); c2.moveTo(14, y); c2.lineTo(242, y); c2.stroke(); }
  c2.fillStyle = '#ff6fa8';
  for (let i = 0; i < 12; i++) { const x = 40 + (i % 3) * 88, y = 70 + Math.floor(i / 3) * 74; c2.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 11 : 26; k ? c2.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : c2.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c2.closePath(); c2.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const g = new THREE.Group();
  const board = mesh(new THREE.BoxGeometry(W, Hh, T), ctx.mat('acc', { color: C.lacquer, finish: 'lacquer' }), 'clipboard'); g.add(board);
  const sheetGeo = new THREE.PlaneGeometry(W * 0.88, Hh * 0.86); const sheet = mesh(sheetGeo, ctx.mat('acc', { color: 0xffffff, finish: 'satin', map: tex, cracks: false }), 'sheet'); sheet.position.set(0, -Hh * 0.04, T / 2 + 0.0008); g.add(sheet);
  const clip = mesh(new THREE.BoxGeometry(0.09 * S, 0.03 * S, 0.012 * S), gold(ctx), 'clip'); clip.position.set(0, Hh / 2 - 0.012 * S, T / 2 + 0.004); g.add(clip);
  // held by its edge in the left hand, the face toward the front
  const hand = I.J.hand_l, fore = I.J.lowerarm_l;
  const dir = hand.clone().sub(fore).normalize();
  const at = hand.clone().addScaledVector(dir, 0.03).add(V3(0, -Hh * 0.42, 0.03));
  return { root: g, bone: 'hand_l', bind: placeM(at, [0, 0, 0]) };
};

// the self-awarded gold star over her heart (and the crest brooch at her collar)
ACCESSORIES.rpdStar = (ctx, o) => {
  const { I } = ctx;
  const r = 0.055 * S / 2;
  const geo = new THREE.ExtrudeGeometry(star5(r), { depth: 0.002 * S, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 1 });
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (y > r * 0.55) p.setZ(i, p.getZ(i) + (y - r * 0.55) * 0.5); }   // one point creased
  geo.computeVertexNormals();
  const g = new THREE.Group(); g.add(mesh(geo, gold(ctx), 'goldstar'));
  const x = I.side * 0.062, y = I.Y.bust + 0.05;
  const z = surfZ(I, x, y, true);
  return { root: g, bone: 'spine_03', bind: placeM(V3(x, y, z + 0.007), [-12 * deg, I.side * 14 * deg, 9 * deg]), starR: r };
};
ACCESSORIES.rpdBrooch = (ctx, o) => {
  const { I } = ctx;
  const g = new THREE.Group(), au = gold(ctx);
  const disc = mesh(new THREE.CylinderGeometry(0.02 * S, 0.02 * S, 0.004, 24), au, 'brooch'); disc.rotation.x = Math.PI / 2; g.add(disc);
  const ring = mesh(new THREE.TorusGeometry(0.02 * S, 0.0018, 6, 28), au, 'broochrim'); ring.position.z = 0.002; g.add(ring);
  const eye = mesh(new THREE.SphereGeometry(0.006, 12, 8), ctx.mat('acc', { color: C.crimson, finish: 'lacquer' }), 'broocheye'); eye.scale.z = 0.5; eye.position.z = 0.003; g.add(eye);
  const y = I.Y.neck - 0.03, z = surfZ(I, 0, y, true);
  return { root: g, bone: 'spine_03', bind: placeM(V3(0, y, z + 0.012), [-8 * deg, 0, 0]) };
};
// gold stiletto heels
ACCESSORIES.rpdHeels = (ctx, o) => {
  const { I } = ctx;
  const out = [];
  for (const s of ['l', 'r']) {
    const f = I.J['foot_' + s];
    const h = new THREE.Group();
    const cone = mesh(new THREE.CylinderGeometry(0.009, 0.0028, 0.085 * S, 10), gold(ctx), 'heel'); cone.position.y = -0.085 * S / 2; h.add(cone);
    out.push({ root: h, bone: 'foot_' + s, bind: placeM(V3(f.x, f.y * 0.6, f.z - 0.035), [-14 * deg, 0, 0]) });
  }
  return { root: new THREE.Group(), multi: out };
};
// the diploma for the outro: a cream scroll, a crimson bow, a gold wax seal (hidden until she draws it)
ACCESSORIES.rpdDiploma = (ctx, o) => {
  const { I } = ctx;
  const g = new THREE.Group();
  const scroll = mesh(new THREE.CylinderGeometry(0.022 * S, 0.022 * S, 0.32 * S, 18), ctx.mat('acc', { color: C.cream, finish: 'satin' }), 'scroll'); g.add(scroll);
  const bow = mesh(new THREE.TorusGeometry(0.024 * S, 0.006 * S, 6, 20), ctx.mat('acc', { color: C.crimson, finish: 'satin' }), 'bow'); bow.rotation.x = Math.PI / 2; g.add(bow);
  const seal = mesh(new THREE.CylinderGeometry(0.014 * S, 0.014 * S, 0.004, 16), gold(ctx), 'seal'); seal.rotation.z = Math.PI / 2; seal.position.x = 0.025 * S; g.add(seal);
  g.visible = false;
  const hand = I.J.hand_r, fore = I.J.lowerarm_r, dir = hand.clone().sub(fore).normalize();
  return { root: g, bone: 'hand_r', bind: placeM(hand.clone().addScaledVector(dir, 0.05).add(V3(0, -0.01, 0.02)), [0, 0, Math.PI / 2]) };
};

// ---------------------------------------------------------------------------------------------- the five faces
const E0 = EXPRESSIONS.neutral;
Object.assign(EXPRESSIONS, {
  rpdPatient: { ...E0, smileL: 0.32, smileR: 0.32, browIL: 0.05, browOL: 0.2, browIR: 0.0, browOR: 0.05, cheek: 0.12, lidT: 0.46, lidB: 0.1, pupil: 0.9, gazeY: -0.04 },
  rpdSmirk: { ...E0, smileL: 0.05, smileR: 0.95, browIL: 0.25, browOL: 0.9, browIR: -0.15, browOR: 0.05, cheek: 0.35, lidT: 0.58, lidB: 0.22, sneer: 0.15, pupil: 0.85, gazeY: -0.05 },
  rpdConcern: { ...E0, smileL: -0.25, smileR: -0.25, pucker: 0.25, browIL: 1.0, browOL: -0.35, browIR: 1.0, browOR: -0.35, pout: 0.6, lidT: 0.12, lidB: 0.05, iris: 1.05, pupil: 1.15, gazeY: 0.02 },
  rpdCaught: { ...E0, jaw: 0.22, smileL: -0.05, smileR: -0.05, pucker: 0.45, browIL: 1.0, browOL: 0.9, browIR: 1.0, browOR: 0.9, lidT: -0.14, lidB: -0.02, iris: 0.9, pupil: 0.55 },
  rpdWrecked: { ...E0, smileL: 0.42, smileR: 0.3, browIL: 0.35, browOL: 0.2, browIR: 0.45, browOR: 0.1, lidT: -0.06, lidB: 0.0, iris: 0.95, pupil: 0.5 },
});

export const DOCTOR = {
  name: 'THE DOCTOR', body: 'female', scale: SCALE, porcelain: 0xeef0f3, gold: 0xe8b84a,
  skin: { roughness: 0.22, coatRough: 0.035, translucency: 0.6 },
  layers: [
    { kind: 'bottom', from: 'waist', hem: 'ankle', color: C.smoke, finish: 'satin', translucency: 0.7 },                 // stockings
    { kind: 'bottom', from: 'waist', hem: 'knee', color: C.jet, finish: 'gloss', trim: { color: 'gold', width: 0.004 } },  // the pencil skirt
    { kind: 'top', from: 'hips', neckline: 'high', sleeves: 'wrist', color: C.jet, finish: 'gloss', trim: false },          // the underdress
    { kind: 'boots', from: 'ankle', color: C.jet, finish: 'lacquer', trim: false },                                       // the pumps
    { kind: 'belt', at: 'neck', width: 0.022, color: C.collar, finish: 'gloss', trim: { color: 'gold', width: 0.003 } },    // the starched collar band
    { kind: 'top', from: 'hips', neckline: 'v', depth: 0.24, width: 0.1, sleeves: 'wrist', color: C.jet2, finish: 'lacquer', trim: { color: 'gold', width: 0.004 }, shell: { thickness: 0.006, smooth: 6 } }, // the gown
    { kind: 'lapels', of: { neckline: 'v', depth: 0.24, width: 0.1 }, width: 0.065, to: 'hips', color: C.crimson, finish: 'matte', trim: { color: 'gold', width: 0.004, double: true } }, // velvet facings
  ],
  seams: ['neck', 'wrist', 'knee'],
  hair: { style: 'long', color: C.lacquer, finish: 'lacquer', gild: 0.35, relief: 1.2 },
  face: {
    brows: { color: '#0a0809', shape: 'arch', thick: 0.7, lift: 0.004 },
    liner: { color: '#060405', thick: 1.35, wing: 1.6 },
    lashes: { color: '#060405', n: 8, len: 0.9, lower: 0.6 },
    shadow: { color: '#4a3a4e', amount: 0.45 },
    lips: { color: '#5a0c1c', shape: 'thin', line: 0.45, gloss: 0.6 },
    blush: { color: '#e8c8d0', amount: 0.15 },
  },
  eyes: { iris: 0x8a919a, iris2: 0xc9a24a, white: 0.25 },
  accessories: [
    { type: 'rpdMortarboard' }, { type: 'rpdGlasses' }, { type: 'rpdHood' }, { type: 'rpdCuffs' }, { type: 'rpdPointer' },
    { type: 'rpdClipboard' }, { type: 'rpdStar' }, { type: 'rpdBrooch' }, { type: 'rpdHeels' }, { type: 'rpdDiploma' },
  ],
  breaks: ['rpdMortarboard', 'shoulder_r', 'hand_l'],
};

// ---------------------------------------------------------------------------------------------- her faces over time
// a base face per moment of the song, and short flashes on top (the smirk when a lie cracks, the mask slipping)
export class Faces {
  constructor(fig) { this.fig = fig; this.base = 'rpdPatient'; this.flashName = null; this.flashUntil = -1; this.cur = ''; }
  setBase(name) { this.base = name; }
  flash(name, t, dur) { this.flashName = name; this.flashUntil = t + dur; }
  update(t) {
    const want = t < this.flashUntil && this.flashName ? this.flashName : this.base;
    if (want !== this.cur) { this.cur = want; this.fig.setExpression(want, { fade: want === 'rpdCaught' ? 0.05 : 0.08 }); }
  }
  reset() { this.flashUntil = -1; this.cur = ''; }
}
