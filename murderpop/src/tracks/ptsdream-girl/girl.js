// PTSDREAM GIRL as a porcelain figurine: a Dresden-lace pop star. Red lace over a deep-red slip, a frilled collar
// off the shoulders, frilled cuffs, a two-tier lace skirt, black-cherry hair with a wet gloss, gold hoops and a
// ruby hairpin, and her perfume grenade hanging at her sternum. She breaks at the notches: the skirt's hem tier,
// then her hair (snapped off at the nape, shattering on the floor), then her left forearm (her kissing hand).
// The kit's accessories don't have ruffles or a grenade, so this file adds its own (under ptsd* names).
import * as THREE from 'three';
import { ACCESSORIES } from '../../game/figurine/accessories.js';
import { buildFigurine } from '../../game/figurine.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;
const placeM = (pos, e = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], 'YXZ')), new THREE.Vector3(s, s, s));
const meshOf = (g, m, name) => { const o = new THREE.Mesh(g, m); o.name = name || ''; o.castShadow = true; o.receiveShadow = true; return o; };

export const RED = 0xd10a24, SLIP = 0x8e0a1c, LIP = 0xe8001e, CHERRY = 0x1e0306, GOLD = 0xe9b949, PORCELAIN = 0xf7edea;

// the front of the torso at (x, y) in bind space (the chest's surface, for things that lie on it)
function frontZ(I, x, y) {
  let z = -9;
  for (let v = 0; v < I.nv; v++) { const px = I.pos[v * 3], py = I.pos[v * 3 + 1]; if (Math.abs(px - x) < 0.012 && Math.abs(py - y) < 0.008) z = Math.max(z, I.pos[v * 3 + 2]); }
  return z > -9 ? z : I.zMid(y) + 0.1;
}

// a frilled band: a ring (rx, rz) that flares out by w and falls by drop, its outer edge fluted with n waves.
// Built around +y in its own frame (the ring in xz); `fall` is the direction the frill falls (-y for a collar).
function frill({ rx, rz, w, drop, n = 14, amp = 0.012, rows = 6, cols = 96, lift = 0 }) {
  const pos = [], uv = [], idx = [], edge = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    for (let j = 0; j <= cols; j++) {
      const a = (j / cols) * Math.PI * 2;
      const fl = Math.sin(a * n) * amp * Math.pow(t, 1.2);
      const r = 1 + (w / Math.max(rx, rz)) * t + fl * 0.4 / Math.max(rx, rz);
      const x = Math.sin(a) * rx * r, z = Math.cos(a) * rz * r;
      const y = -drop * t * t + lift * t + fl;
      pos.push(x, y, z); uv.push(j / cols, t);
      if (i === rows) edge.push(V3(x, y, z));
      if (i < rows && j < cols) { const p = i * (cols + 1) + j; idx.push(p, p + cols + 1, p + 1, p + 1, p + cols + 1, p + cols + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  edge.pop();
  return { geo: g, edge };
}
function edgeTube(points, r) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), points.length * 2, r, 5, true); }

// ---------------------------------------------------------------- her accessories (added to the kit's table)
const MINE = {
  // two frilled tiers of stiff porcelain lace off the shoulders, edged in gold
  ptsdCollar(ctx, o) {
    const { I } = ctx;
    const g = new THREE.Group();
    const lace = ctx.mat('acc', { color: o.color ?? RED, finish: 'gloss', side: THREE.DoubleSide, trim: { hem: 0.007, gold: true } });
    const y0 = I.Y.shoulder + 0.012, zc = I.zMid(y0) - 0.004;
    const sx = Math.abs(I.J.upperarm_l.x) + 0.035;
    for (const [k, tier] of [[0, { rx: sx, rz: 0.115, w: 0.05, drop: 0.045, n: 15, amp: 0.009 }], [1, { rx: sx * 0.9, rz: 0.105, w: 0.045, drop: 0.035, n: 17, amp: 0.008, lift: 0.004 }]]) {
      const f = frill(tier);
      const m = meshOf(f.geo, lace, 'collar'); m.position.y = -k * 0.02;
      g.add(m);
    }
    return { root: g, bone: 'spine_03', bind: placeM(V3(0, y0, zc)) };
  },

  // a frilled cuff at one wrist, flaring toward the hand
  ptsdCuff(ctx, o) {
    const { I } = ctx;
    const s = o.side || 'l';
    const c = I.ARM[s];
    const sArc = I.A.wrist - 0.03;
    let seg = 0; while (seg < c.cum.length - 2 && c.cum[seg + 1] < sArc) seg++;
    const p = c.pts[seg].clone().lerp(c.pts[seg + 1], (sArc - c.cum[seg]) / c.lens[seg]);
    const dir = c.pts[seg + 1].clone().sub(c.pts[seg]).normalize();
    const lace = ctx.mat('acc', { color: o.color ?? RED, finish: 'gloss', side: THREE.DoubleSide, trim: { hem: 0.006, gold: true } });
    const f = frill({ rx: 0.032, rz: 0.03, w: 0.026, drop: 0.0, lift: 0.045, n: 11, amp: 0.006, rows: 5, cols: 64 });
    const g = new THREE.Group();
    g.add(meshOf(f.geo, lace, 'cuff'));
    // the frill's +y goes along the arm toward the hand
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
    const M = new THREE.Matrix4().compose(p, q, V3(1, 1, 1));
    return { root: g, bone: 'lowerarm_' + s, bind: M };
  },

  // big gold hoops
  ptsdHoops(ctx, o) {
    const { I } = ctx;
    const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    const ex = Math.abs(I.EYE.l.c.x) + (o.out ?? 0.047), ey = I.EYE.l.c.y - (o.down ?? 0.048), ez = I.headC.z - 0.012;
    const g = new THREE.Group();
    const r = o.r ?? 0.024;
    for (const sd of [1, -1]) {
      const h = meshOf(new THREE.TorusGeometry(r, 0.0028, 10, 48), gold, 'hoop');
      h.rotation.y = Math.PI / 2; h.position.set(sd * ex, ey - r, ez);
      g.add(h);
    }
    return { root: g, bone: 'Head', bind: new THREE.Matrix4() };
  },

  // a gold hairpin with a ruby at her right temple
  ptsdHairpin(ctx, o) {
    const { I } = ctx;
    const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    const ruby = ctx.mat('acc', { color: 0x9a0018, finish: 'lacquer' });
    const g = new THREE.Group();
    const bar = meshOf(new THREE.CapsuleGeometry(0.0032, 0.06, 4, 10), gold, 'pin'); bar.rotation.z = 62 * deg; g.add(bar);
    const st = meshOf(new THREE.OctahedronGeometry(0.011, 0), ruby, 'ruby'); st.scale.set(1, 1.3, 0.7); st.position.set(-0.02, 0.012, 0.004); g.add(st);
    const set = meshOf(new THREE.TorusGeometry(0.012, 0.0022, 6, 20), gold, 'setting'); set.position.copy(st.position); g.add(set);
    const rx = -I.side * (Math.abs(I.EYE.l.c.x) + 0.05);
    return { root: g, bone: 'Head', bind: placeM(V3(rx, I.EYE.l.c.y + 0.045, I.headC.z + 0.035), [0, -I.side * 70 * deg, 0]) };
  },

  // her perfume grenade on a gold chain at her sternum: faceted ruby glass, a gold cap, lever and ring pin
  ptsdPendant(ctx, o) {
    const { I } = ctx;
    const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
    const ruby = ctx.mat('acc', { color: 0xb0001c, finish: 'lacquer' });
    const g = new THREE.Group();
    const H = o.height ?? 0.1;
    const bottle = grenadeGeometry(H);
    const b = meshOf(bottle.body, ruby, 'bottle'); g.add(b);
    for (const [geo, name] of bottle.gold) g.add(meshOf(geo, gold, name));
    const yTop = I.Y.chest + 0.012;
    const z0 = frontZ(I, 0, I.Y.bust + 0.01) + 0.016;
    g.position.set(0, -H * 0.55, 0);
    const root = new THREE.Group(); root.add(g);
    // the chain: from either side of her neck down to the cap
    const zN = frontZ(I, 0.045, I.Y.neckBase - 0.01) - 0.01;
    for (const sd of [1, -1]) {
      const pts = [V3(sd * 0.05, I.Y.neckBase + 0.005 - yTop, zN - z0), V3(sd * 0.032, (I.Y.neckBase + yTop) / 2 - 0.01 - yTop, (zN + z0) / 2 + 0.008 - z0), V3(0, 0.0, 0)];
      root.add(meshOf(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.0016, 5, false), gold, 'chain'));
    }
    return { root, bone: 'spine_03', bind: placeM(V3(0, yTop, z0)) };
  },
};
for (const [k, fn] of Object.entries(MINE)) if (!ACCESSORIES[k]) ACCESSORIES[k] = fn;

// the grenade bottle: a faceted ovoid (pineapple), a gold atomizer cap, a lever down one side, a ring pin
export function grenadeGeometry(H = 0.45) {
  const R = H * 0.34;
  const prof = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; const y = t * H * 0.78; const r = R * Math.sin(Math.PI * (0.06 + 0.88 * t)) * (1 - 0.18 * t); prof.push(new THREE.Vector2(Math.max(0.001, r), y)); }
  prof.push(new THREE.Vector2(R * 0.3, H * 0.79));
  const body = new THREE.LatheGeometry(prof, 8); body.computeVertexNormals();
  // pineapple facets: flat-shade by un-indexing
  const flat = body.toNonIndexed(); flat.computeVertexNormals();
  const cap = new THREE.CylinderGeometry(R * 0.34, R * 0.4, H * 0.12, 12); cap.translate(0, H * 0.84, 0);
  const nozzle = new THREE.CylinderGeometry(R * 0.12, R * 0.12, H * 0.07, 8); nozzle.translate(0, H * 0.93, 0);
  const lever = new THREE.BoxGeometry(R * 0.16, H * 0.46, R * 0.12); lever.translate(R * 0.86, H * 0.6, 0); lever.rotateZ(-0.06);
  const ring = new THREE.TorusGeometry(R * 0.32, R * 0.06, 6, 20); ring.rotateY(Math.PI / 2); ring.translate(-R * 0.55, H * 0.86, 0);
  return { body: flat, gold: [[cap, 'cap'], [nozzle, 'nozzle'], [lever, 'lever'], [ring, 'ring']] };
}

export const SPEC = {
  name: 'PTSDREAM GIRL', body: 'female', scale: 1.25, porcelain: PORCELAIN, gold: GOLD,
  skin: { roughness: 0.1, coatRough: 0.03 },
  layers: [
    // lace stockings, then the slip, then the lace bodice and sleeves over it, a gold cord at the waist
    { kind: 'bottom', from: 'waist', hem: 'ankle', color: RED, finish: 'satin', pattern: { type: 'polka', color2: SLIP, period: 0.014, duty: 0.32 } },
    { kind: 'top', from: 'hips', neckline: 'sweetheart', sleeves: null, color: SLIP, finish: 'gloss' },
    { kind: 'top', from: 'hips', neckline: 'sweetheart', sleeves: 'wrist', color: RED, finish: 'gloss', pattern: { type: 'polka', color2: SLIP, period: 0.012, duty: 0.3 }, trim: { color: 'gold', width: 0.006, relief: 0.0005 } },
    { kind: 'belt', at: 'waist', width: 0.012, color: GOLD, finish: 'gold' },
  ],
  hair: { style: 'long', color: CHERRY, finish: 'lacquer', relief: 1.0 },
  face: {
    brows: { color: '#1e0306', shape: 'arch', thick: 0.75, lift: 0.35 },
    liner: { color: '#050203', thick: 1.45, wing: 1.7 },
    lashes: { color: '#050203', n: 10, len: 1.3, lower: 0.3 },
    shadow: { color: '#7a1030', amount: 0.55 },
    lips: { color: '#e8001e', shape: 'overdrawn', line: 0.5, gloss: 0.9 },
    blush: { color: '#f0b9c2', amount: 0.4 },
    marks: [{ at: 'eye', side: 1, r: 0.0026 }],
  },
  eyes: { iris: 0x5a0a14, iris2: 0xa01830 },
  accessories: [
    { type: 'skirt', name: 'skirtTop', from: 'waist', to: 'midthigh', flare: 1.62, color: RED, finish: 'gloss', trim: { hem: 0.01, waist: 0.0, gold: true }, pleats: 18 },
    { type: 'skirt', name: 'skirtHem', from: 'hips', to: 'knee', flare: 1.95, color: 0xb80820, finish: 'gloss', trim: { hem: 0.016, waist: 0.0, gold: true }, pleats: 22, margin: 0.016 },
    { type: 'shoes', from: 'ankle', color: 0xc8001c, toe: 'point', smooth: 10 },
    { type: 'ptsdCollar' },
    { type: 'ptsdCuff', name: 'cuffL', side: 'l' },
    { type: 'ptsdCuff', name: 'cuffR', side: 'r' },
    { type: 'ptsdHoops' },
    { type: 'ptsdHairpin' },
    { type: 'ptsdPendant' },
  ],
  breaks: ['skirtHem', 'hair', 'forearm_l'],
};

// ---------------------------------------------------------------- the build, and what the kit doesn't do for her
export async function buildGirl(kit, f) {
  const fig = await buildFigurine(kit, SPEC);
  const extra = new Extras(fig, f);
  return { fig, extra };
}

// her hair breaking off (the kit breaks accessories and body parts, not hair), the glow in the stump, the things
// she holds (the hand mirror, the phone, a knife, the lace ribbon), the wrecked pink glow from inside her cracks
class Extras {
  constructor(fig, f) {
    this.fig = fig; this.f = f;
    this.hair = fig.hairMeshes.slice();
    this.fallen = null;   // the hair as a rigid piece on its way down
    this.stump = null;
    this.held = {};
    this._mkHeld();
    // made now, not at the break: a new glaze compiling mid-fight is a freeze
    this.hairShardM = new THREE.MeshPhysicalMaterial({ color: 0x1e0306, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });
    this.stumpM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.6, 1.6), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  }
  // stand-ins wearing the break-time materials, for the set's warm-up (it removes them after)
  warmObjects() {
    const out = [];
    for (const m of [this.hairShardM, this.stumpM]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), m); o.castShadow = m === this.hairShardM; o.position.set(0, 0.5, 0); this.f.scene.add(o); out.push(o); }
    return out;
  }
  _mkHeld() {
    const fig = this.fig;
    const goldM = new THREE.MeshPhysicalMaterial({ color: 0xe9b949, metalness: 1, roughness: 0.25 });
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xcfd6e6, metalness: 1, roughness: 0.04 });
    // the hand mirror: an oval of gold with a mirror face and a handle
    const mir = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 40), goldM); frame.scale.set(1, 1.3, 1); mir.add(frame);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), glassM); face.scale.set(1, 1.3, 1); mir.add(face);
    const back = face.clone(); back.material = goldM; back.rotation.y = Math.PI; back.position.z = -0.004; mir.add(back);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.14, 10), goldM); handle.position.y = -0.2; mir.add(handle);
    mir.userData.face = face;
    this._hold('mirror', mir, 'hand_r', new THREE.Vector3(0, 0.05, 0.02), new THREE.Euler(0, 0, 0));
    // the new girl's phone: rose gold in a mint case
    const ph = new THREE.Group();
    const caseM = new THREE.MeshPhysicalMaterial({ color: 0x9fe8cc, roughness: 0.35, clearcoat: 0.6 });
    const scr = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.8, 1.6) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.17, 0.012), caseM); ph.add(body);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.15), scr); s.position.z = 0.0065; ph.add(s);
    ph.userData.screen = s;
    this._hold('phone', ph, 'hand_r', new THREE.Vector3(0, 0.07, 0.03), new THREE.Euler(0.3, 0, 0));
    // a kitchen knife
    const kn = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.004), new THREE.MeshPhysicalMaterial({ color: 0xe8eef6, metalness: 1, roughness: 0.12 })); blade.position.y = 0.16; kn.add(blade);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x3a2214, roughness: 0.5 })); kn.add(hilt);
    this._hold('knife', kn, 'hand_r', new THREE.Vector3(0, 0.06, 0.02), new THREE.Euler(0, 0, 0));
  }
  _hold(name, obj, bone, pos, rot) {
    const b = this.fig.bones[bone]; if (!b) return;
    const s = 1 / this.fig.scale / (this.fig.model.scale.x / this.fig.scale || 1);
    obj.scale.setScalar(1 / this.fig.scale * 1.0 / 0.01 * 0.01);
    obj.position.copy(pos); obj.rotation.copy(rot);
    obj.visible = false;
    b.add(obj);
    // bones here are in the model's scaled space: undo the model scale and the armature's unit scale
    obj.updateWorldMatrix(true, false);
    const ws = new THREE.Vector3(); b.getWorldScale(ws);
    obj.scale.setScalar(1 / ws.x);
    obj.position.multiplyScalar(1 / ws.x);
    this.held[name] = obj;
    void s;
  }
  show(name, on) { const o = this.held[name]; if (o) o.visible = on; }
  hideAllHeld() { for (const o of Object.values(this.held)) o.visible = false; }

  // ---- the hair: snapped off at the nape, falls, shatters into black-cherry shards
  breakHair() {
    if (this.hairGone) return;
    this.hairGone = true;
    const fig = this.fig;
    for (const h of this.hair) {
      if (!h.visible) continue;
      const { P, N } = fig._pose(h);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      g.setIndex(h.geometry.index.clone());
      g.computeBoundingBox();
      const c = g.boundingBox.getCenter(new THREE.Vector3());
      g.translate(-c.x, -c.y, -c.z);
      const m = new THREE.Mesh(g, this.hairShardM);
      m.position.copy(c); m.castShadow = true;
      this.f.scene.add(m);
      const away = c.clone().sub(fig._center()).setY(0); if (away.lengthSq() < 1e-4) away.set(0, 0, -1); away.normalize();
      this.fallen = { m, vel: away.multiplyScalar(1.4).add(V3(0, 1.6, 0)), w: V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5), t: 0, minY: g.boundingBox.min.y };
      h.visible = false;
    }
  }
  restoreHair() {
    this.hairGone = false;
    for (const h of this.hair) h.visible = true;
    if (this.fallen) { this.f.scene.remove(this.fallen.m); this.fallen.m.geometry.dispose(); this.fallen = null; }
  }

  // ---- the left forearm: the stump glows pink inside
  // silent: a rewind past the third notch. The rewind has just put her cuff back on; take it off without it falling
  // (and chipping, and clinking) all over again
  breakArm(silent = false) {
    const fig = this.fig;
    const cuff = silent && fig.acc && fig.acc.find((a) => a.name === 'cuffL');
    if (cuff && !cuff.broken) { cuff.broken = true; cuff.def.broken = true; cuff.pivots = []; for (const o of cuff.objects) o.visible = false; }
    else if (!silent) fig.breakPiece('cuffL');
    if (!this.stump) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), this.stumpM);
      const b = fig.bones.lowerarm_l || fig.bones.upperarm_l;
      if (b) { b.add(g); const ws = new THREE.Vector3(); b.getWorldScale(ws); g.scale.setScalar(1 / ws.x); }
      this.stump = g;
    }
    this.stump.visible = true;
  }
  restoreArm() { if (this.stump) this.stump.visible = false; }

  update(dt) {
    const F = this.fallen;
    if (F) {
      F.t += dt;
      if (!F.landed) {
        F.vel.y -= 14 * dt;
        F.m.position.addScaledVector(F.vel, dt);
        F.m.rotation.x += F.w.x * dt; F.m.rotation.z += F.w.z * dt;
        if (F.m.position.y + F.minY * 0.5 <= 0.05 && F.vel.y < 0) {
          F.landed = true;
          const p = F.m.position;
          this.f.fx.chips(p.x, 0.3, p.z, new THREE.Color(0.25, 0.02, 0.04), 40);
          this.f.fx.chips(p.x, 0.3, p.z, new THREE.Color(1.6, 1.1, 0.4), 10);
          this.f.fx.glitter(p.x, 0.3, p.z, new THREE.Color(1.2, 0.2, 0.3), 20, 0.8);
          this.onShatterHair && this.onShatterHair(p);
          this.f.scene.remove(F.m); F.m.geometry.dispose(); this.fallen = null;
        }
      }
    }
    if (this.stump && this.stump.visible) this.stump.material.opacity = 0.6 + 0.25 * Math.sin(this.fig.t * 5);
  }
}
