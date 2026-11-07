// THE PROBLEM SOLVER as a figurine: a sweet lakeside girlfriend done as a Lladro-style glaze. Buttercup sundress
// with white dots, a pink cardigan knotted over her shoulders, a honey-blonde bob with a pink headband, pearls,
// white Mary Janes, soaked to the knee. Her percolator (pink enamel, a perk knob that glows and bubbles on every
// beat) in her left hand; the key ring (YOUR car key on it) spinning on her right index finger.
// Her three notch pieces: the cardigan (75%), the headband and the left half of her hair (50%), her left forearm,
// pot and all (25%). Five faces: SWEET, SMALL TALK, ON CUE, REAL, WRECKED.
import * as THREE from 'three';
import { buildFigurine, EXPRESSIONS } from '../../game/figurine.js';
import { ACCESSORIES } from '../../game/figurine/accessories.js';
import { Body, supportPoints } from '../../game/figurine/shards.js';
import { Boss } from '../../game/boss.js';
import { floorAt } from './lake.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;
const _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _wt = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _up = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
export const BEAT = { phase: 0, pulse: 0, t: 0 };           // the song's beat, for the perk knob and the key ring
function mesh(g, m, name) { const o = new THREE.Mesh(g, m); o.name = name || ''; o.castShadow = true; o.receiveShadow = true; return o; }
function lathe(prof, seg = 32) { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.computeVertexNormals(); return g; }
const placeM = (p, e = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], 'YXZ')), V3(s, s, s));

// ---------------------------------------------------------------------------------------------- her faces
const FACES = {
  lake_sweet: { jaw: 0.0, smileL: 0.42, smileR: 0.42, pucker: 0.18, browIL: 0.18, browOL: 0.12, browIR: 0.18, browOR: 0.12, sneer: 0, pout: 0.1, cheek: 0.4, lidT: 0.26, lidB: 0.1, happy: 0, iris: 1.0, pupil: 1.08, gazeY: 0 },
  lake_talk: { jaw: 0.17, smileL: 0.8, smileR: 0.62, pucker: 0.0, browIL: 0.05, browOL: 0.75, browIR: -0.05, browOR: 0.05, sneer: 0, pout: 0, cheek: 0.65, lidT: 0.42, lidB: 0.44, happy: 0.35, iris: 1, pupil: 1, gazeY: 0 },
  lake_cue: { jaw: 0.48, smileL: -0.4, smileR: -0.4, pucker: 0.25, browIL: 1.0, browOL: -0.5, browIR: 1.0, browOR: -0.5, sneer: 0, pout: 0.6, cheek: 0.1, lidT: 0.42, lidB: 0.3, happy: 0, iris: 1.08, pupil: 1.3, gazeY: 0.1 },
  lake_real: { jaw: 0.24, smileL: 1.0, smileR: 1.0, pucker: 0.0, browIL: -0.85, browOL: -0.65, browIR: -0.85, browOR: -0.65, sneer: 0.35, pout: 0, cheek: 0.25, lidT: -0.16, lidB: 0.0, happy: 0, iris: 0.7, pupil: 0.28, gazeY: 0 },
  lake_wrecked: { jaw: 0.08, smileL: 0.7, smileR: 0.32, pucker: 0, browIL: 0.2, browOL: 0.4, browIR: -0.2, browOR: 0.1, sneer: 0.15, pout: 0, cheek: 0.3, lidT: 0.3, lidB: 0.15, happy: 0, iris: 0.9, pupil: 0.6, gazeY: 0 },
  lake_serene: { jaw: 0.0, smileL: 0.35, smileR: 0.35, pucker: 0.1, browIL: 0.25, browOL: 0.1, browIR: 0.25, browOR: 0.1, sneer: 0, pout: 0, cheek: 0.3, lidT: 1.0, lidB: 0.5, happy: 1.0, iris: 1, pupil: 1, gazeY: 0 },
};
const FACE_OF = { SWEET: 'lake_sweet', TALK: 'lake_talk', CUE: 'lake_cue', REAL: 'lake_real', WRECKED: 'lake_wrecked', SERENE: 'lake_serene' };

// ---------------------------------------------------------------------------------------------- her props
const PINK = 0xf7b7cb, GOLD = 0xffffff;
let registered = false;
function register() {
  if (registered) return; registered = true;
  Object.assign(EXPRESSIONS, FACES);

  // the percolator: pink enamel, chrome lid, spout and handle, a glass perk knob that glows amber and bubbles
  ACCESSORIES.lake_pot = (ctx, o) => {
    const g = new THREE.Group();
    const enamel = ctx.mat('acc', { color: PINK, finish: 'gloss' });
    const chrome = ctx.mat('acc', { color: 0xffffff, finish: 'chrome' });
    const body = mesh(lathe([[0.0, 0.0], [0.062, 0.0], [0.066, 0.008], [0.06, 0.09], [0.05, 0.16], [0.047, 0.17], [0.0, 0.17]], 40), enamel, 'pot');
    body.position.x = -0.085; g.add(body);
    const lid = mesh(lathe([[0.0, 0.0], [0.05, 0.0], [0.045, 0.02], [0.022, 0.034], [0.0, 0.036]], 32), chrome, 'potLid');
    lid.position.set(-0.085, 0.17, 0); g.add(lid);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 20, 14), new THREE.MeshStandardMaterial({ color: 0x3a1e08, emissive: new THREE.Color(1.0, 0.55, 0.18), emissiveIntensity: 2.2, roughness: 0.05, transparent: true, opacity: 0.92 }));
    knob.name = 'perkKnob'; knob.position.set(-0.085, 0.215, 0); knob.scale.y = 1.15; g.add(knob);
    const sp = new THREE.CatmullRomCurve3([V3(-0.135, 0.06, 0), V3(-0.165, 0.1, 0), V3(-0.18, 0.15, 0), V3(-0.2, 0.17, 0)]);
    g.add(mesh(new THREE.TubeGeometry(sp, 16, 0.009, 10, false), chrome, 'spout'));
    const hd = new THREE.CatmullRomCurve3([V3(-0.03, 0.15, 0), V3(0.0, 0.14, 0), V3(0.012, 0.09, 0), V3(0.0, 0.035, 0), V3(-0.028, 0.03, 0)]);
    g.add(mesh(new THREE.TubeGeometry(hd, 20, 0.009, 10, false), chrome, 'handle'));
    g.add(mesh(new THREE.TorusGeometry(0.05, 0.004, 8, 40).rotateX(Math.PI / 2).translate(-0.085, 0.09, 0), chrome, 'band'));
    g.scale.setScalar(1.35);
    const def = { root: g, bone: 'hand_l', bind: new THREE.Matrix4(), knob, alwaysUpdate: true, upright: 0.85,
      update(dt) {
        const k = BEAT.pulse; knob.scale.set(1 + k * 0.25, 1.15 + k * 0.35, 1 + k * 0.25); knob.material.emissiveIntensity = 1.6 + 3.2 * k;
        const o = def.holder; if (!o || !o.parent || !def.homeQ) return;
        o.parent.getWorldQuaternion(_pq); _wq.copy(_pq).multiply(def.homeQ);
        _up.set(0, 1, 0).applyQuaternion(_wq); _qa.setFromUnitVectors(_up, _Y); _wt.copy(_qa).multiply(_wq);
        def.uk += ((def.free ? 0 : def.upright) - def.uk) * Math.min(1, dt * 10);
        _wq.slerp(_wt, def.uk);
        o.quaternion.copy(_pq.invert()).multiply(_wq);
      }, uk: 0.85 };
    return def;
  };

  // the key ring: a gold ring with six keys (brass and nickel), YOUR car key with its umber fob and copper badge
  ACCESSORIES.lake_keys = (ctx, o) => {
    const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
    const goldM = ctx.mat('acc', { color: GOLD, finish: 'gold', goldTint: true });
    const brassM = ctx.mat('acc', { color: 0xd8b25a, finish: 'gold' });
    const nickelM = ctx.mat('acc', { color: 0xd6d8de, finish: 'silver' });
    const leather = ctx.mat('acc', { color: 0x6b3a1e, finish: 'satin' });
    const copper = ctx.mat('acc', { color: 0xb8733a, finish: 'gold' });
    spin.add(mesh(new THREE.TorusGeometry(0.036, 0.0035, 8, 40), goldM, 'keyring'));
    const shape = new THREE.Shape(); shape.moveTo(0, -0.008); shape.lineTo(0.05, -0.006); shape.lineTo(0.05, 0.0); shape.lineTo(0.044, 0.004); shape.lineTo(0.038, 0.0); shape.lineTo(0.032, 0.005); shape.lineTo(0.024, 0.002); shape.lineTo(0.0, 0.006); shape.lineTo(0, -0.008);
    const keyG = new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, k = new THREE.Group();
      const bow = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.003, 18).rotateX(Math.PI / 2), i % 2 ? nickelM : brassM, 'keyBow');
      const blade = mesh(keyG, i % 2 ? nickelM : brassM, 'key'); blade.position.set(0.008, 0, -0.001);
      k.add(bow, blade); k.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0); k.rotation.z = a;
      if (i === 0) {   // YOUR car key: a leather fob and a copper badge
        const fob = mesh(new THREE.BoxGeometry(0.03, 0.018, 0.006), leather, 'fob'); fob.position.set(-0.02, 0, 0); k.add(fob);
        const badge = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.0025, 14).rotateX(Math.PI / 2), copper, 'badge'); badge.position.set(-0.022, 0, 0.004); k.add(badge);
      }
      spin.add(k);
    }
    const def = { root: g, bone: 'hand_r', bind: new THREE.Matrix4(), spin, alwaysUpdate: true, rate: 4,
      update(dt) { if (def.hidden) return; const w = def.rate * (1 + 1.6 * BEAT.pulse); spin.rotation.z += w * dt; } };
    return def;
  };

  // a pastel pink headband over the crown, a tiny gold bow at the side
  ACCESSORIES.lake_headband = (ctx, o) => {
    const { I } = ctx;
    const g = new THREE.Group();
    const pink = ctx.mat('acc', { color: 0xf2a7c3, finish: 'gloss' });
    const goldM = ctx.mat('acc', { color: GOLD, finish: 'gold', goldTint: true });
    const R = 0.094;
    const band = mesh(new THREE.TorusGeometry(R, 0.0075, 10, 64, Math.PI * 1.08).rotateZ(-0.04 * Math.PI), pink, 'headband');
    band.scale.set(1.0, 1.0, 1.7); g.add(band);
    const bow = new THREE.Group();
    for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.012, 14, 10), goldM, 'bowLoop'); l.scale.set(1.3, 0.75, 0.45); l.position.x = s * 0.012; bow.add(l); }
    bow.add(mesh(new THREE.SphereGeometry(0.005, 10, 8), goldM, 'bowKnot'));
    bow.position.set(R * Math.cos(0.32), R * Math.sin(0.32), 0.012); bow.rotation.z = 0.3; g.add(bow);
    const pad = 0.018;
    return { root: g, bone: 'Head', bind: placeM(V3(0, I.Y.top + pad - R - 0.004, I.headC.z - 0.006), [-14 * deg, 0, 0]) };
  };

  // the cardigan's sleeves, knotted loosely at her collarbone (the cardigan itself is a shell layer)
  ACCESSORIES.lake_knot = (ctx, o) => {
    const { I } = ctx;
    const g = new THREE.Group();
    const knit = ctx.mat('acc', { color: 0xf2a7c3, finish: 'satin' });
    const goldM = ctx.mat('acc', { color: GOLD, finish: 'gold', goldTint: true });
    const y0 = I.Y.neckBase - 0.012, zc = I.zMid(y0);
    const front = (x, y) => { let z = -9; for (let v = 0; v < I.nv; v++) { if (I.region[v] !== 0) continue; if (Math.abs(I.pos[v * 3] - x) < 0.014 && Math.abs(I.pos[v * 3 + 1] - y) < 0.012) z = Math.max(z, I.pos[v * 3 + 2]); } return z > -9 ? z : zc + 0.08; };
    const knotY = I.Y.chest - 0.01, knotZ = front(0, knotY) + 0.03;
    for (const s of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; const x = s * (0.115 * (1 - t) + 0.012 * t), y = y0 + 0.005 * (1 - t) + (knotY - y0) * t * t; pts.push(V3(x, y, front(x, y) + 0.022 + 0.008 * Math.sin(t * Math.PI))); }
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.019, 12, false), knit, 'sleeve'));
      // the cuff ends hang down from the knot
      const cuff = mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.07, 14), knit, 'cuff'); cuff.position.set(s * 0.018, knotY - 0.045, knotZ - 0.004); cuff.rotation.z = s * 0.25; g.add(cuff);
    }
    const knot = mesh(new THREE.SphereGeometry(0.028, 18, 12), knit, 'knot'); knot.scale.set(1.3, 0.9, 0.8); knot.position.set(0, knotY, knotZ); g.add(knot);
    for (const s of [-1, 1]) { const b = mesh(new THREE.SphereGeometry(0.0055, 10, 8), goldM, 'button'); b.position.set(s * 0.06, y0 - 0.02, front(s * 0.06, y0 - 0.02) + 0.03); g.add(b); }
    return { root: g, bone: 'spine_03', bind: new THREE.Matrix4() };
  };

  // three tiny gold buttons down the bodice, the gold bow at her left hip, stud earrings
  ACCESSORIES.lake_trims = (ctx, o) => {
    const { I } = ctx;
    const goldM = ctx.mat('acc', { color: GOLD, finish: 'gold', goldTint: true });
    const pearl = ctx.mat('acc', { color: 0xfff7ee, finish: 'pearl', iridescence: 0.5 });
    const surf = (x, y) => { let z = -9; for (let v = 0; v < I.nv; v++) { if (I.region[v] !== 0) continue; if (Math.abs(I.pos[v * 3] - x) < 0.012 && Math.abs(I.pos[v * 3 + 1] - y) < 0.01) z = Math.max(z, I.pos[v * 3 + 2]); } return z; };
    const chest = new THREE.Group();
    const white = ctx.mat('acc', { color: 0xfffdf7, finish: 'gloss' });
    for (const s of [-1, 1]) {
      const lobe = new THREE.Shape(); const W = 0.074, H = 0.05;
      lobe.moveTo(0, 0); lobe.lineTo(s * W * 0.95, 0.002); lobe.quadraticCurveTo(s * W * 1.05, -H * 0.55, s * W * 0.55, -H); lobe.quadraticCurveTo(s * 0.004, -H * 1.05, 0, -H * 0.15); lobe.lineTo(0, 0);
      const y0 = I.Y.neckBase - 0.004, x0 = s * 0.006;
      const g = mesh(new THREE.ExtrudeGeometry(lobe, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2 }), white, 'collar');
      g.position.set(x0, y0, surf(s * 0.03, y0 - 0.02) + 0.004); g.rotation.x = -0.45; g.rotation.y = s * 0.25; chest.add(g);
      const pts = lobe.getSpacedPoints(48).map((q) => new THREE.Vector3(q.x, q.y, 0.0045));
      const pipe = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.0016, 5, true), goldM, 'piping');
      pipe.position.copy(g.position); pipe.rotation.copy(g.rotation); chest.add(pipe);
    }
    for (let k = 0; k < 3; k++) { const y = I.Y.underbust + 0.012 + k * 0.03; const b = mesh(new THREE.SphereGeometry(0.0045, 10, 8), goldM, 'button'); b.scale.z = 0.6; b.position.set(0, y, surf(0, y) + 0.002); chest.add(b); }
    const hip = new THREE.Group();
    const hx = I.side * 0.11, hy = I.Y.waist;
    for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.016, 14, 10), goldM, 'bow'); l.scale.set(1.4, 0.8, 0.5); l.position.set(hx + s * 0.016, hy, surf(hx, hy) + 0.004); hip.add(l); }
    for (const s of [-1, 1]) { const t = mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.05, 8), goldM, 'bowTail'); t.position.set(hx + s * 0.01, hy - 0.03, surf(hx, hy) + 0.006); t.rotation.z = s * 0.3; hip.add(t); }
    const ears = new THREE.Group();
    for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.0055, 12, 10), pearl, 'stud'); e.position.set(s * 0.078, I.EYE.l.c.y - 0.045, I.headC.z + 0.005); ears.add(e); }
    return { root: new THREE.Group(), multi: [{ root: chest, bone: 'spine_03', bind: new THREE.Matrix4() }, { root: hip, bone: 'pelvis', bind: new THREE.Matrix4() }, { root: ears, bone: 'Head', bind: new THREE.Matrix4() }] };
  };

  // the charm bracelet on her left wrist: a tiny copper car (YOUR car), a heart, an anchor
  ACCESSORIES.lake_bracelet = (ctx, o) => {
    const { I } = ctx;
    const goldM = ctx.mat('acc', { color: GOLD, finish: 'gold', goldTint: true });
    const copper = ctx.mat('acc', { color: 0xb8733a, finish: 'gold' });
    const pinkM = ctx.mat('acc', { color: 0xf05a8c, finish: 'gloss' });
    const c = I.ARM.l, s = I.A.wrist - 0.02;
    let seg = 0; while (seg < c.cum.length - 2 && c.cum[seg + 1] < s) seg++;
    const p = c.pts[seg].clone().lerp(c.pts[seg + 1], (s - c.cum[seg]) / c.lens[seg]);
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.036, 0.003, 8, 40), goldM, 'bracelet'); ring.rotation.y = Math.PI / 2; g.add(ring);
    const car = mesh(new THREE.BoxGeometry(0.012, 0.007, 0.02), copper, 'charmCar'); car.position.set(0, -0.042, 0.008); g.add(car);
    const heart = mesh(new THREE.SphereGeometry(0.006, 10, 8), pinkM, 'charmHeart'); heart.position.set(0, -0.041, -0.012); g.add(heart);
    const anchor = mesh(new THREE.TorusGeometry(0.005, 0.0015, 6, 12, Math.PI), goldM, 'charmAnchor'); anchor.position.set(0, -0.043, 0.0); g.add(anchor);
    return { root: g, bone: 'lowerarm_l', bind: placeM(p) };
  };

  // lake weed: two ribbons stuck to her wet hem, one wound round her left ankle
  ACCESSORIES.lake_weed = (ctx, o) => {
    const { I } = ctx;
    const weed = ctx.mat('acc', { color: 0x2f4b3e, finish: 'gloss', side: THREE.DoubleSide, interior: false });
    const strip = (pts, w) => {
      const curve = new THREE.CatmullRomCurve3(pts); const n = 24; const pos = [], ind = [];
      for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t); const side = V3(0, 0, 1).cross(tan).normalize().multiplyScalar(w * (1 - 0.6 * t)); pos.push(p.x + side.x, p.y + side.y, p.z + side.z, p.x - side.x, p.y - side.y, p.z - side.z); if (i < n) { const k = i * 2; ind.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ind); g.computeVertexNormals(); return mesh(g, weed, 'weed');
    };
    const out = [];
    for (const s of [1, -1]) {
      const leg = s > 0 ? 'l' : 'r', th = I.J['thigh_' + leg], kn = I.J['calf_' + leg];
      const a = th.clone().lerp(kn, 0.72), g = new THREE.Group();
      g.add(strip([a.clone().add(V3(I.side * s * 0.05, 0, 0.05)), a.clone().add(V3(I.side * s * 0.06, -0.06, 0.06)), a.clone().add(V3(I.side * s * 0.05, -0.13, 0.065))], 0.009));
      out.push({ root: g, bone: 'thigh_' + leg, bind: new THREE.Matrix4() });
    }
    const an = I.J.foot_l.clone().add(V3(0, 0.03, 0)), g2 = new THREE.Group();
    const pts = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2.4; pts.push(an.clone().add(V3(Math.cos(a) * 0.048, -0.01 + k * 0.004, Math.sin(a) * 0.048))); }
    g2.add(strip(pts, 0.007));
    out.push({ root: g2, bone: 'calf_l', bind: new THREE.Matrix4() });
    return { root: new THREE.Group(), multi: out };
  };

  // ON CUE: glassy painted tears on her cheeks; WRECKED: the left eye chipped out to a black hollow
  ACCESSORIES.lake_face = (ctx, o) => {
    const { I } = ctx;
    const g = new THREE.Group();
    const tearM = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.85, envMapIntensity: 2.5 });
    const tears = new THREE.Group(); tears.name = 'tears';
    for (const s of ['l', 'r']) {
      const e = I.EYE[s];
      const dz = I.faceZ ? I.faceZ(e.c.x, e.c.y - 0.03) : e.c.z + 0.01;
      const drop = mesh(new THREE.SphereGeometry(0.006, 12, 10), tearM, 'tear'); drop.scale.set(0.8, 1.4, 0.55); drop.position.set(e.c.x, e.c.y - e.r * 1.05, e.c.z + e.r * 0.75); tears.add(drop);
      const track = mesh(new THREE.CylinderGeometry(0.0018, 0.0028, 0.034, 6), tearM, 'track'); track.position.set(e.c.x, e.c.y - e.r - 0.02, Math.max(dz, e.c.z) + 0.003); tears.add(track);
    }
    tears.visible = false; g.add(tears);
    const hollow = new THREE.Group(); hollow.name = 'hollow';
    const e = I.EYE.l;
    const black = new THREE.Mesh(new THREE.CircleGeometry(e.r * 1.05, 20), new THREE.MeshStandardMaterial({ color: 0x030202, roughness: 0.9 }));
    black.position.set(e.c.x, e.c.y, e.c.z + e.r * 0.92); hollow.add(black);
    const bisque = new THREE.Mesh(new THREE.RingGeometry(e.r * 1.0, e.r * 1.5, 9, 1), new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.95 }));
    bisque.position.copy(black.position).add(V3(0, 0, 0.0015)); hollow.add(bisque);
    hollow.visible = false; g.add(hollow);
    return { root: g, bone: 'Head', bind: new THREE.Matrix4(), tears, hollow };
  };
}

// ---------------------------------------------------------------------------------------------- the spec
export const SPEC = {
  name: 'THE PROBLEM SOLVER', body: 'female', scale: 1.25, porcelain: 0xfbf3ee,
  skin: { roughness: 0.18, coatRough: 0.035, translucency: 0.6 },
  layers: [
    // the sundress, buttercup with white dots, painted to mid-thigh
    { kind: 'top', neckline: 'crew', sleeves: null, legs: 'midthigh', color: 0xf3c846, finish: 'gloss', pattern: { type: 'polka', color2: 0xfff8ea, period: 0.05, duty: 0.22 } },
    // the white waistband
    { kind: 'belt', at: 'waist', width: 0.04, color: 0xfffdf7, finish: 'gloss' },
    // the cardigan draped over her shoulders: pastel pink satin, open down the front, standing off her as its own cast
    { kind: 'top', from: 'bust', neckline: 'v', depth: 0.2, width: 0.1, sleeves: 'cap', color: 0xf2a7c3, finish: 'satin', roughness: 0.4, pattern: { type: 'stripes', color2: 0xf8bcd2, period: 0.016, duty: 0.35, dir: 'v' }, shell: { thickness: 0.009, smooth: 6 } },
  ],
  hair: { style: 'long', color: 0xe6bc68, finish: 'gloss', gild: 0.55 },
  face: {
    brows: { shape: 'high', color: '#8a5a2b', thick: 0.7 },
    liner: { color: '#1a0d10', thick: 0.75, wing: 0.45 },
    lashes: { color: '#120a0c', n: 4, len: 1.55, lower: 0.45 },
    lips: { color: '#e1356f', shape: 'heart', line: 0.28, gloss: 0.85 },
    blush: { color: '#f6a9be', amount: 0.36 },
    shadow: { color: '#d39ab2', amount: 0.32 },
    marks: [{ at: 'eye', side: 1, r: 0.0016 }],
  },
  eyes: { iris: 0x5b8fe6, iris2: 0xa9c8ff, white: 0.32 },
  accessories: [
    { type: 'skirt', from: 'waist', to: 'midthigh', flare: 1.72, color: 0xf3c846, finish: 'gloss', pattern: { type: 'polka', color2: 0xfff8ea, u: 44, v: 8, duty: 0.22 }, trim: { hem: 0.012, gold: true } },
    { type: 'pearls', size: 0.006, drop: 0.004, color: 0xfff7ee },
    { type: 'shoes', from: 'ankle', color: 0xffffff, finish: 'lacquer', toe: 'round', trim: false },
    { type: 'lake_pot', name: 'lake_pot' },
    { type: 'lake_keys', name: 'lake_keys' },
    { type: 'lake_headband', name: 'lake_headband' },
    { type: 'lake_knot', name: 'lake_knot' },
    { type: 'lake_trims', name: 'lake_trims' },
    { type: 'lake_bracelet', name: 'lake_bracelet' },
    { type: 'lake_weed', name: 'lake_weed' },
    { type: 'lake_face', name: 'lake_face' },
  ],
  breaks: ['lake_knot', 'lake_headband', 'forearm_l'],
};
const CARDIGAN_LAYER = 2;

// ---------------------------------------------------------------------------------------------- building her
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion();
function acc(fig, name) { return fig.acc.find((a) => a.name === name); }
// re-seat a rigid prop so it sits as `world` (a Matrix4) in the pose she is in now; keep it as its home
function reseat(fig, name, worldOf) {
  const a = acc(fig, name); if (!a) return;
  fig.root.updateMatrixWorld(true);
  for (const o of a.objects) {
    const W = worldOf(o.parent);
    if (!W) continue;
    _m.copy(o.parent.matrixWorld).invert().multiply(W);
    _m.decompose(o.position, o.quaternion, o.scale);
  }
  a.home = a.objects.map((o) => ({ obj: o, parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
}

export async function buildSolver(kit, f) {
  register();
  const fig = await buildFigurine(kit, SPEC);
  f.scene.add(fig.root);
  // seat the pot upright in her left hand and the key ring round her right index finger, in her idle pose
  fig.rig.play('Idle_Loop', { fade: 0 }); fig.rig.mixer.update(0.4); fig.root.updateMatrixWorld(true);
  const sc = fig.scale;
  reseat(fig, 'lake_pot', (hand) => {
    const p = hand.getWorldPosition(new THREE.Vector3());
    const out = fig.root.getWorldPosition(new THREE.Vector3()); out.y = p.y; const away = p.clone().sub(out).setY(0).normalize();
    // handle in the palm (a little below the wrist), the pot standing beside her hand, its spout forward
    const at = p.clone().add(V3(0, -0.085 * sc, 0)).addScaledVector(away, 0.02 * sc);
    const yaw = Math.atan2(away.x, away.z);
    return new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + Math.PI / 2, 0)), V3(sc, sc, sc).divideScalar(new THREE.Vector3().setFromMatrixScale(hand.matrixWorld).x).multiplyScalar(new THREE.Vector3().setFromMatrixScale(hand.matrixWorld).x / sc));
  });
  { const pa = acc(fig, 'lake_pot'); if (pa) { pa.def.holder = pa.objects[0]; pa.def.homeQ = pa.objects[0].quaternion.clone(); } }
  const fingerBone = fig.bones.index_01_r || fig.bones.hand_r;
  const keys = acc(fig, 'lake_keys');
  if (keys && fingerBone) {
    // under the finger bone: the ring's axis along the finger, a little way out from the knuckle
    const child = fingerBone.children.find((c) => c.isBone);
    const axis = child ? child.position.clone().normalize() : V3(0, 1, 0);
    const root = keys.objects[0];
    fingerBone.attach(root);
    const s = 1 / new THREE.Vector3().setFromMatrixScale(fingerBone.matrixWorld).x * sc;
    root.position.copy(axis).multiplyScalar((child ? child.position.length() : 0.03) * 0.45);
    root.quaternion.setFromUnitVectors(V3(0, 0, 1), axis);
    root.scale.setScalar(s);
    keys.home = keys.objects.map((o) => ({ obj: o, parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
  }
  // her tiny trinkets (keys, studs, buttons, charms, piping) cast nothing: they cost a draw in every shadow pass
  fig.root.updateMatrixWorld(true);
  for (const a of fig.acc) for (const o of a.objects) o.traverse((m) => {
    if (!m.isMesh || m.isSkinnedMesh) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    if (m.geometry.boundingSphere.radius < 0.035 || /key|stud|button|charm|piping|bow|band|bracelet|tear|knob|badge|fob/i.test(m.name)) { m.castShadow = false; m.userData.noCaster = true; }
  });
  return fig;
}

// ---------------------------------------------------------------------------------------------- the controller
// Everything the choreography asks of her that the Boss class doesn't do: her faces on the beat, the glide (a
// music-box figurine on a mirror tray), the vanish and its shimmer, the wobble, her feet on the porch and the pier,
// her prop states (the key ring off her finger, the pot gone), and the pieces only she breaks (the cardigan shell,
// half her hair, the pot bursting on the floor).
export class Solver {
  constructor(f, fig, boss) {
    this.f = f; this.fig = fig; this.boss = boss;
    this.face = 'SWEET'; this.faceUntil = 0; this.baseFace = 'SWEET';
    this.y = 0; this.glide = null; this.hidden = false; this.wobble = null; this.water = 0; this.floatY = 0;
    this.keysAcc = acc(fig, 'lake_keys'); this.potAcc = acc(fig, 'lake_pot'); this.faceAcc = acc(fig, 'lake_face');
    this.cardShell = fig.shells.find((s) => s.userData.figShell && s.userData.figShell.layer === CARDIGAN_LAYER) || null;
    this.cardMode = [fig.bodyU.fLayMode.value[CARDIGAN_LAYER].clone(), fig.bodyU.fLayMode2.value[CARDIGAN_LAYER].clone()];
    this.hair = fig.hairMeshes[0] || null;
    this.hairIndex = this.hair ? this.hair.geometry.index.clone() : null;
    this.hairPiece = null; this.potBody = null; this.potBurst = false;
    this.shimmer = makeShimmer(); f.scene.add(this.shimmer);
    this.glintT = 9;
    this.setFace('SWEET', 0);
  }

  // ---- faces: a held face, or a flash of one (REAL for a beat, ON CUE while a beam is on her)
  setFace(name, fade = 0.12) { this.baseFace = name; if (this.f.t >= this.faceUntil) this._apply(name, fade); }
  flash(name, sec, fade = 0.05) { this.faceUntil = this.f.t + sec; this._apply(name, fade); }
  _apply(name, fade) {
    if (this.boss.state === 'desperate' && name !== 'REAL') name = 'WRECKED';
    if (this.face === name) return; this.face = name;
    this.fig.setExpression(FACE_OF[name] || 'lake_sweet', { fade: Math.max(0.02, fade) });
    if (this.faceAcc) this.faceAcc.def.tears.visible = name === 'CUE';
  }

  // ---- the key ring: off her finger while it flies
  keysOn(on) { if (!this.keysAcc) return; for (const o of this.keysAcc.objects) o.visible = on; this.keysAcc.def.hidden = !on; }

  // ---- moving: walk (the Boss's own locomotion), or glide holding a pose
  glideTo(x, z, dur, { turn = true, ease = 'inOut' } = {}) {
    const b = this.boss;
    b.moveTo(x, z, dur, { easing: ease, face: false });
    this.glide = { t0: this.f.t, dur, turn, yaw0: b.facing };
    if (b.rig) b.rig.play('Idle_Loop', { fade: 0.15, speed: 0.0001 });
    b.busyUntil = Math.max(b.busyUntil || 0, this.f.t + dur);
  }
  // the vanish: a star glint on her glaze and she's gone; her pink shimmer where she'll be; there half a beat later
  vanish(x, z, arrive, { facing } = {}) {
    const f = this.f, b = this.boss;
    this.glintAt(b.x, 1.5, b.z);
    f.sfx.s && lakeSfx(f, 'glint', b.x);
    b.intangible = true; this.hidden = true; b.root.visible = false;
    this.shimmerAt = { x, z, t0: f.t, t1: arrive };
    f.at(arrive, () => {
      b.place(x, z, facing ?? Math.atan2(f.player.x - x, f.player.z - z));
      b.intangible = false; this.hidden = false; b.root.visible = true;
      this.shimmerAt = null; lakeSfx(f, 'tink', x);
      f.fx.glitter(x, 1.2, z, new THREE.Color(3, 1.2, 2.2), 14, 0.6);
    });
  }
  glintAt(x, y, z) { this.glint = { x, y, z }; this.glintT = 0; }

  // the wobble: rocking on the eighths like a figurine about to fall off a shelf
  wobbleFor(t0, t1, amp = 12 * deg) { this.wobble = { t0, t1, amp }; }

  // ---- her pieces
  breakCardigan({ silent = false } = {}) {
    const fig = this.fig;
    if (this.cardOff) return; this.cardOff = true;
    if (!silent && this.cardShell) {
      const plans = fig.prepareShatter();
      const p = plans.find((q) => q.mesh === this.cardShell);
      if (p) { fig.root.updateWorldMatrix(true, true); const { P, N } = fig._pose(p.mesh); fig.shards.fire(p.plan, P, N, { center: fig._center(), power: 0.55 }); fig.shards.write(); this._cardPlan = p.plan; }
    }
    // off for good: the layer covers nothing, on the body or its shell
    fig.bodyU.fLayMode.value[CARDIGAN_LAYER].set(2, -1, 0, 0);
    // hairline cracks on her bare shoulders
    if (!silent) for (const s of [1, -1]) if (fig.hits.length < 15) fig.hits.push({ p: new THREE.Vector3(s * 0.12, fig.I.Y.shoulder + 0.01, fig.I.zMid(fig.I.Y.shoulder)), s: 1.6, r: 0 });
  }
  restoreCardigan() {
    const fig = this.fig; this.cardOff = false;
    fig.bodyU.fLayMode.value[CARDIGAN_LAYER].copy(this.cardMode[0]); fig.bodyU.fLayMode2.value[CARDIGAN_LAYER].copy(this.cardMode[1]);
    if (this._cardPlan) { fig.shards.reset(this._cardPlan); this._cardPlan = null; }
  }
  // the left half of her bob comes away in one jagged plate, the hollow white inside of her showing
  breakHair({ silent = false } = {}) {
    const fig = this.fig, h = this.hair; if (!h || this.hairOff) return; this.hairOff = true;
    fig.root.updateWorldMatrix(true, true);
    const { P, N } = fig._pose(h);
    const g = h.geometry, ab = g.attributes.aBind.array, idx = this.hairIndex.array, side = fig.I.side;
    const left = (v) => ab[v * 4] * side > 0.004 + 0.01 * Math.sin(ab[v * 4 + 1] * 140) * Math.sin(ab[v * 4 + 2] * 90);
    const keep = [], off = [];
    for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; ((left(a) + left(b) + left(c)) >= 2 ? off : keep).push(a, b, c); }
    if (!off.length) return;
    g.setIndex(keep);
    if (silent) return;
    // the plate, frozen in her pose, falling as one rigid piece
    const map = new Map(), pos = [], nrm = [], uv = [], abd = [], ind = [];
    const uvA = g.attributes.uv ? g.attributes.uv.array : null;
    const c = new THREE.Vector3();
    for (const v of off) if (!map.has(v)) { map.set(v, pos.length / 3); pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); nrm.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); if (uvA) uv.push(uvA[v * 2], uvA[v * 2 + 1]); abd.push(ab[v * 4], ab[v * 4 + 1], ab[v * 4 + 2], 0); c.x += P[v * 3]; c.y += P[v * 3 + 1]; c.z += P[v * 3 + 2]; }
    for (const v of off) ind.push(map.get(v));
    c.divideScalar(map.size);
    for (let i = 0; i < pos.length; i += 3) { pos[i] -= c.x; pos[i + 1] -= c.y; pos[i + 2] -= c.z; }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    if (uv.length) pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    pg.setAttribute('aBind', new THREE.Float32BufferAttribute(abd, 4)); pg.setIndex(ind);
    const m = new THREE.Mesh(pg, h.material); m.castShadow = true; m.frustumCulled = false;
    const pivot = new THREE.Group(); pivot.add(m); fig.world.add(pivot);
    const pts = []; for (let i = 0; i < pos.length; i += 3 * 7) pts.push(V3(pos[i], pos[i + 1], pos[i + 2]));
    let rad = 0.05; for (const p of pts) rad = Math.max(rad, p.length());
    const body = new Body(supportPoints(pts), { radius: rad, restitution: 0.25, friction: 0.6 });
    body.pos.copy(c); body.q.identity();
    const away = c.clone().sub(fig._center()).setY(0).normalize();
    body.vel.copy(away).multiplyScalar(2.2).add(V3(0, 2.4, 0)); body.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8);
    body.obj = pivot; body.objScale = pivot.scale.clone();
    fig.pieces.push(body);
    this.hairPiece = { pivot, body };
    fig.chips.burst(c, V3(0, -1, 0), new THREE.Color(0xe6bc68), 18, 3.0, fig.scale);
    fig.glitter.burst(c, 70, [new THREE.Color(1, 0.82, 0.4), new THREE.Color(1, 1, 1)], 0.5, 1.6);
  }
  restoreHair() {
    if (!this.hair) return; this.hairOff = false;
    this.hair.geometry.setIndex(this.hairIndex.clone());
    if (this.hairPiece) { const hp = this.hairPiece; this.fig.pieces = this.fig.pieces.filter((b) => b !== hp.body); hp.pivot.parent && hp.pivot.parent.remove(hp.pivot); hp.pivot.children[0].geometry.dispose(); this.hairPiece = null; }
  }
  // the pot falls with her forearm and bursts on the floor in a hiss of steam
  breakPot() {
    const r = this.fig.breakPiece('lake_pot');
    this.potBody = this.fig.pieces[this.fig.pieces.length - 1] || null; this.potBurst = false;
    return r;
  }
  hidePot() { if (this.potAcc) for (const o of this.potAcc.objects) o.visible = false; this.potGone = true; }
  restorePot() { this.potGone = false; this.potBody = null; this.potBurst = false; if (this.potAcc) for (const o of this.potAcc.objects) o.visible = true; }

  // where her coffee comes from: the spout, or after the third notch the hollow of her elbow
  spout(out = new THREE.Vector3()) {
    const fig = this.fig;
    if (this.boss.broken >= 3 || this.potGone) { const e = fig.bones.lowerarm_l; return e ? e.getWorldPosition(out) : out.set(this.boss.x, 1.2, this.boss.z); }
    const a = this.potAcc && this.potAcc.objects[0];
    if (a) { a.updateWorldMatrix(true, false); return out.set(-0.2, 0.17, 0).applyMatrix4(a.matrixWorld); }
    return out.set(this.boss.x, 1.2, this.boss.z);
  }
  knob(out = new THREE.Vector3()) {
    const a = this.potAcc && this.potAcc.objects[0];
    if (a && !this.potGone && this.boss.broken < 3) { a.updateWorldMatrix(true, false); return out.set(-0.085, 0.23, 0).applyMatrix4(a.matrixWorld); }
    return null;
  }

  // ---- per frame (after the Boss's own update has placed her)
  update(dt) {
    const f = this.f, b = this.boss, t = f.t;
    if (t >= this.faceUntil && this.face !== this.baseFace) this._apply(this.baseFace, 0.12);
    if (b.state === 'desperate' && this.face !== 'WRECKED' && this.face !== 'REAL') this._apply('WRECKED', 0.2);
    if (this.faceAcc) this.faceAcc.def.hollow.visible = b.state === 'desperate' || b.state === 'finished';
    // the pot hangs upright from its handle, except when she swings it, throws from it or pours
    if (this.potAcc) { const n = (b.rig && b.rig.baseName) || ''; this.potAcc.def.free = b.busy && /Sword|Throw|Scratch|Pistol|Spell|Melee/.test(n); }
    // feet: the floor under her (the porch, the pier, the mirror water when she glides on it)
    const fl = floorAt(b.x, b.z);
    const want = Math.max(fl, this.glide && this.water > 0.01 ? this.water - 0.02 : 0) + this.floatY;
    this.y += (want - this.y) * Math.min(1, dt * 14);
    b.root.position.y = this.y;
    // the glide: posed, heels raised, one slow turn on her own axis as she slides
    if (this.glide) {
      const g = this.glide, k = Math.min(1, (t - g.t0) / g.dur);
      if (g.turn) b.facing = g.yaw0 + k * k * (3 - 2 * k) * Math.PI * 2;
      const ft = this.fig.bones.foot_l, fr = this.fig.bones.foot_r;
      if (ft) ft.rotation.x += 0.45; if (fr) fr.rotation.x += 0.45;
      b.root.position.y += 0.04;
      if (k >= 1) { this.glide = null; if (b.rig && b.idleClip) b.rig.play(b.idleClip, { fade: 0.2 }); }
    }
    // the wobble
    if (this.wobble && t >= this.wobble.t0 && t <= this.wobble.t1) {
      const ph = f.bm.beatAt(t) * 2 * Math.PI;       // rocking on the eighths: a full rock per beat
      b.root.rotation.z = Math.sin(ph) * this.wobble.amp * Math.min(1, (t - this.wobble.t0) * 4, (this.wobble.t1 - t) * 4);
    } else b.root.rotation.z *= Math.exp(-dt * 12);
    // the glint and the shimmer
    this.glintT += dt;
    const sh = this.shimmer;
    if (this.shimmerAt) {
      const s = this.shimmerAt, k = Math.min(1, (t - s.t0) / Math.max(0.05, s.t1 - s.t0));
      sh.visible = true; sh.position.set(s.x, floorAt(s.x, s.z) + this.water, s.z);
      sh.material.uniforms.uK.value = 0.35 + 0.65 * k; sh.material.uniforms.uT.value = t;
      sh.scale.setScalar(1.25 * (0.9 + 0.1 * Math.sin(t * 30)));
    } else sh.visible = false;
    // the pot: once it hits the floor, it bursts
    if (this.potBody && !this.potBurst && this.potBody.pos.y < this.fig.floorY + 0.25 && Math.abs(this.potBody.vel.y) < 1.2 && t > 0) {
      this.potBurst = true; this.hidePot();
      const p = this.potBody.pos;
      f.fx.chips(p.x, 0.3, p.z, new THREE.Color(2.6, 1.2, 1.5), 22); f.fx.dust(p.x, p.z, 10, new THREE.Color(1.1, 1.05, 1.0));
      lakeSfx(f, 'plateHeavy', p.x, { gain: 0.7 }); lakeSfx(f, 'glassLight', p.x, { at: 0.04 });
      this.onSteam && this.onSteam(p.x, p.z, 1.5);
    }
  }
  dispose() { this.shimmer.parent && this.shimmer.parent.remove(this.shimmer); this.shimmer.geometry.dispose(); this.shimmer.material.dispose(); }
}

// her pink shimmer: where she'll arrive, half a beat ahead (a ghost of her skirt's disc and a soft column)
function makeShimmer() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uK: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uK, uT; varying vec3 vP;
      void main(){ float r = length(vP.xz); float h = vP.y;
        float col = smoothstep(0.55, 0.1, r) * smoothstep(2.1, 0.2, h) * (0.6 + 0.4 * sin(h * 18.0 - uT * 9.0));
        float a = col * uK * 0.55; gl_FragColor = vec4(vec3(1.6, 0.35, 0.9) * a, a); }`,
  });
  const g = new THREE.CylinderGeometry(0.5, 0.62, 2.1, 24, 1, true); g.translate(0, 1.05, 0);
  const o = new THREE.Mesh(g, m); o.renderOrder = 7; o.visible = false; o.frustumCulled = false;
  return o;
}

// sounds this file plays live in sound.js; the track hands its player over
let _snd = null;
export function bindSound(fn) { _snd = fn; }
function lakeSfx(f, name, x, o) { if (_snd) _snd(name, x, o); }

// the Boss for her, with her notches and pieces
export function makeBoss(fig, f, hp) {
  const b = new Boss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE PROBLEM SOLVER', hp, notches: [0.75, 0.5, 0.25], pieces: SPEC.breaks, radius: 0.85 });
  b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Walk_Formal_Loop';
  b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop');
  b.faceTarget = f.player;
  return b;
}
