// The party guests: porcelain mannequins in cheap "sexy YOU" costumes (auburn nylon wigs, ivory polyester coats
// with gold embroidery printed on, umber trousers, plastic copper rings round their wrists, copper heels). Everyone
// at this party came dressed as YOU. Nobody points it out. Twelve dance on the riser (from 107.99), three stand in the
// booths behind the sheer curtains (from 71.06), and in the final chorus four of them walk the room in sandwich boards.
import * as THREE from 'three';
import { Rig } from '../../engine/character.js';
import * as M from './moves.js';

const { toward, clamp, TAU } = M;
const step = (t, a, b) => clamp((t - a) / Math.max(1e-4, b - a), 0, 1);

function costume() {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ax = abs(vBind.x), y = vBind.y;
        // the knock-off YOU: umber leather sleeves and corset with gold print, ivory coat panels over the hips, a gold
        // collar, umber trousers, copper rings and heels; the blank face and the hands are cool porcelain (never skin)
        vec3 porc = vec3(0.82, 0.84, 0.9), ivory = vec3(0.93, 0.9, 0.84), gold = vec3(0.85, 0.6, 0.22), umber = vec3(0.2, 0.09, 0.05), copper = vec3(0.75, 0.38, 0.22);
        vec3 c = umber;
        if (y > 1.49 || ax > 0.665) c = porc;                       // the face, the hands
        else if (ax > 0.63) c = copper;                             // the plastic copper ring round each wrist
        else if (y < 0.08) c = copper;                              // heels
        else if (y > 1.43) c = gold;                                // the collar
        else if (y < 0.62 && ax < 0.3) c = umber;                   // trousers
        else if (y < 0.95 && ax < 0.3) c = ivory;                   // the coat's panels over the hips
        // gold embroidery printed on the leather (vines)
        if (c == umber && y > 0.95) { float e = sin(vBind.y * 60.0 + sin(vBind.x * 45.0) * 2.2); float e2 = sin(vBind.x * 70.0 - vBind.y * 20.0); if (e > 0.9 || (e2 > 0.95 && y > 1.1)) c = gold; }
        diffuseColor.rgb = c;`);
  };
  return m;
}

export async function buildGuests(R, kit) {
  const [body, hair] = await Promise.all([kit.load('assets/characters/figurine/body-female.glb'), kit.load('assets/characters/figurine/hair-long.glb')]);
  let hairSrc = null; hair.scene.traverse((o) => { if (o.isSkinnedMesh) hairSrc = o; });
  const mat = costume();
  const wig = new THREE.MeshPhysicalMaterial({ color: 0x7a2410, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color(0xff8a50) });
  const make = (shadow) => {
    const model = kit.instance(body);
    let bodyMesh = null;
    model.traverse((m) => { if (m.isSkinnedMesh) { m.material = mat; m.castShadow = shadow; if (!m.name.startsWith('Eyes')) bodyMesh = m; } });
    if (hairSrc && bodyMesh) {
      const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
      const h = new THREE.SkinnedMesh(hairSrc.geometry, wig);
      h.bind(new THREE.Skeleton(hairSrc.skeleton.bones.map((b) => bones[b.name]), hairSrc.skeleton.boneInverses), hairSrc.bindMatrix);
      h.frustumCulled = false; h.castShadow = shadow;
      bodyMesh.parent.add(h);
    }
    const rig = new Rig(kit, model);
    R.group.add(rig.root);
    return { rig, root: rig.root, x: 0, z: 0, alive: true };
  };
  const api = { riser: [], booth: [], bay: [], walkers: [] };
  // the riser: twelve, in two loose rows, dancing at random phases
  for (let i = 0; i < 13; i++) {
    const row = i % 2, x = -9.6 + i * 1.6 + (row ? 0.5 : 0), z = row ? -9.2 : -7.9;
    if (Math.abs(x) < 1.6 && row) continue;            // the DJ's booth
    const g = make(false);
    g.x = x; g.z = z; g.root.position.set(x, 0.6, z); g.root.rotation.y = (Math.random() - 0.5) * 0.5;
    g.phase = Math.random();
    api.riser.push(g);
  }
  // the booths and the bay
  for (const z of [-3.6, 0, 3.6]) { const g = make(true); g.x = -10.2; g.z = z; g.root.position.set(-10.2, 0, z); g.root.rotation.y = Math.PI / 2; api.booth.push(g); }
  for (const z of [1.2, -1.2]) { const g = make(true); g.x = 12.6; g.z = z; g.root.position.set(12.6, 0, z); g.root.rotation.y = -Math.PI / 2; api.bay.push(g); }
  for (const g of [...api.riser, ...api.booth, ...api.bay]) { g.rig.play('Idle_Loop', { fade: 0, offset: Math.random() }); g.root.visible = false; }

  let throwI = 0;
  api.thrower = () => {
    const live = api.riser.filter((g) => g.z > -8.5);
    const g = live[(throwI++ * 3) % live.length]; if (!g) return null;
    g.rig.once('OverhandThrow', { duration: 0.6, from: 0.2, to: 0.75, then: 'Dance_Loop' });
    return { x: g.x, z: g.z + 0.4 };
  };

  // what everyone does at song time t. The riser: hidden behind the wall until it flies, dancing, watching YOU in
  // the bridge, standing still for the till. The booths: a mannequin behind each sheer curtain from "SEE-through"
  // (two of them walk out in the final chorus). Applied as the song plays, and all at once on a rewind.
  const riserMode = (t) => (t < 107.5 ? null : t >= 118.66 && t < 129.33 ? 'watch' : t >= 182.66 ? 'stand' : 'dance');
  const boothShown = (i, t) => t >= 71.0 && (i === 1 || t < 144.99);
  api.sync = (t, snap = false) => {
    const m = riserMode(t);
    for (const g of api.riser) {
      if (g.mode === m) continue;
      g.mode = m; g.root.visible = !!m; g.watch = m === 'watch';
      if (m) g.rig.play(m === 'dance' ? 'Dance_Loop' : 'Idle_Loop', { fade: snap ? 0 : 0.4, offset: g.phase });
    }
    api.booth.forEach((g, i) => {
      if (api.walkers.some((w) => w.g === g)) return;          // walking the room now
      const s = boothShown(i, t);
      if (g.shown === s) return;
      g.shown = s; g.root.visible = s; g.root.position.set(-10.2, 0, g.z);
      if (s) { g.rig.play('Idle_Loop', { fade: 0, offset: i * 0.3 }); g.rig.timeScale = 0; g.rig.update(0.016); }
    });
  };
  api.at = (t) => {
    api.clearWalkers(); api.clapped = false;
    for (const g of api.riser) g.mode = undefined;
    for (const g of api.booth) g.shown = undefined;
    for (const g of api.bay) g.root.visible = false;
    api.sync(t, true);
  };
  const look = new THREE.Vector3();
  let tick = 0;
  api.update = (dt, t) => {
    const f = R.f;
    tick++;
    look.set(f.player.x, 1.4, f.player.z);
    api.sync(t);
    api.riser.forEach((g, i) => {
      if (!g.root.visible) return;
      // the bridge: they stopped dancing to watch YOU; S8 leaves them silhouettes
      const watch = g.mode === 'watch';
      g.rig.lookTarget = watch ? look : null;
      // backdrop: each guest animates on alternate frames (half the cost, nobody can tell)
      if ((i + tick) % 2 === 0) g.rig.update(dt * 2);
    });
    for (const g of api.booth) if (g.root.visible) g.rig.update(dt);
    // applause at the end
    if (t >= 214.9 && !api.clapped) { api.clapped = true; for (const g of api.riser) g.rig.play('Yes', { fade: 0.2 }); }
    api.walk(dt, t);
  };

  // ---------------------------------------------------------------------------- the walkers (S9)
  const PIC = [
    (c, w, h) => { c.fillStyle = '#1a2a6a'; c.beginPath(); c.moveTo(w * 0.45, h * 0.15); c.lineTo(w * 0.55, h * 0.15); c.lineTo(w * 0.62, h * 0.72); c.lineTo(w * 0.5, h * 0.88); c.lineTo(w * 0.38, h * 0.72); c.fill(); },
    (c, w, h) => { c.lineWidth = 10; c.strokeStyle = '#e03a2a'; c.beginPath(); c.moveTo(w * 0.15, h * 0.75); c.lineTo(w * 0.35, h * 0.4); c.lineTo(w * 0.55, h * 0.75); c.stroke(); c.strokeStyle = '#2a6ae0'; c.beginPath(); c.arc(w * 0.72, h * 0.35, w * 0.12, 0, TAU); c.stroke(); },
    (c, w, h) => { c.fillStyle = '#e01a5a'; c.beginPath(); c.moveTo(w / 2, h * 0.8); c.bezierCurveTo(w * 0.02, h * 0.5, w * 0.22, h * 0.12, w / 2, h * 0.34); c.bezierCurveTo(w * 0.78, h * 0.12, w * 0.98, h * 0.5, w / 2, h * 0.8); c.fill(); c.strokeStyle = '#fff4ea'; c.lineWidth = 8; c.beginPath(); c.moveTo(w * 0.5, h * 0.34); c.lineTo(w * 0.44, h * 0.5); c.lineTo(w * 0.56, h * 0.6); c.lineTo(w * 0.5, h * 0.8); c.stroke(); },
    (c, w, h) => { c.strokeStyle = '#c89a30'; c.lineWidth = 12; c.beginPath(); c.moveTo(w * 0.3, h * 0.15); c.lineTo(w * 0.62, h * 0.7); c.moveTo(w * 0.7, h * 0.15); c.lineTo(w * 0.38, h * 0.7); c.stroke(); c.beginPath(); c.arc(w * 0.33, h * 0.8, w * 0.09, 0, TAU); c.arc(w * 0.67, h * 0.8, w * 0.09, 0, TAU); c.stroke(); },
  ];
  const boardMat = PIC.map((draw) => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 160; const c = cv.getContext('2d');
    c.fillStyle = '#f4ece4'; c.fillRect(0, 0, 128, 160); c.strokeStyle = '#e2ae4c'; c.lineWidth = 8; c.strokeRect(4, 4, 120, 152); draw(c, 128, 160);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.3 });
  });
  const PATHS = [[[-9.5, -3.6], [9, -3.6]], [[10.5, 1.2], [-9, 1.2]], [[-9.5, 3.6], [9, 3.6]], [[10.5, -1.2], [-9, -1.2]]];
  api.clearWalkers = () => {
    for (const w of api.walkers) { w.board.parent && w.board.parent.remove(w.board); R._unstage(w.piece); w.g.root.visible = false; }
    api.walkers.length = 0;
  };
  api.startWalkers = (t0, tGo) => {
    api.clearWalkers();
    const who = [api.booth[0], api.bay[0], api.booth[2], api.bay[1]];
    PATHS.forEach(([a, b], i) => {
      const g = who[i]; g.root.visible = true; g.rig.timeScale = 1;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const tEnd = tGo + len / 3.2;
      M.area(R.f, { shape: 'rect', x: a[0], z: a[1], angle: Math.atan2(b[0] - a[0], b[1] - a[1]), w: 0.45, h: len, kind: 'white', start: t0, end: tEnd, damage: 0, sound: false, silent: i > 0 });
      // the sandwich boards: a picture front and back
      const board = new THREE.Group();
      for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.02), [boardMat[i], boardMat[i], boardMat[i], boardMat[i], boardMat[i], boardMat[i]]); p.position.set(0, 1.05, s * 0.2); p.rotation.x = s * -0.08; board.add(p); }
      g.root.add(board);
      const piece = R.stage.add(g.root, { solid: false, breakable: { hp: 3, chips: new THREE.Color(2.2, 2.1, 2.0), glitter: new THREE.Color(3, 2.2, 0.8), onBreak: () => { w.alive = false; R.f.player.addMeter(0.06); R.snd.porcelain(g.root.position.x); } } });
      g.root.visible = true;
      const w = { g, a, b, t0: tGo, tEnd, board, piece, alive: true, cool: -9, hits: new Set(), armed: null };
      api.walkers.push(w);
    });
  };
  api.walk = (dt, t) => {
    const f = R.f;
    for (const w of api.walkers) {
      const g = w.g;
      if (!w.alive) { g.root.visible = false; continue; }
      const k = step(t, w.t0, w.tEnd);
      const x = w.a[0] + (w.b[0] - w.a[0]) * k, z = w.a[1] + (w.b[1] - w.a[1]) * k;
      g.root.position.set(x, 0, z); g.x = x; g.z = z;
      g.root.rotation.y = Math.atan2(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      const moving = t >= w.t0 && k < 1;
      if (moving !== w.moving) { w.moving = moving; g.rig.play(moving ? 'Walk_Formal_Loop' : 'Idle_Loop', { fade: 0.2, speed: moving ? 1.45 : 1 }); }
      g.rig.update(dt);
      // the corners of the board hurt
      if (t > w.cool && t >= w.t0 - 0.3) { const r = M.touch(f, x, z, 0.55, { why: 'walker' }); if (r === 'hit') w.cool = t + 1.0; }
      // a return or a ring pass counts as a strike
      for (const p of f.proj.list) if (p.owner === 'you' && !p.dead && Math.hypot(p.x - x, p.z - z) < 0.9) { p.dead = true; R.stage.hit(w.piece, 1, 0); }
      for (const r of f.player.rings) { if (r.state === 'hand') { w.hits.delete(r); continue; } const key = r; if (!w.hits.has(key) && Math.hypot(r.pos.x - x, r.pos.z - z) < 0.9) { w.hits.add(key); R.stage.hit(w.piece, 1, 0); } if (r.state === 'back' && !w.hits.has('b' + r.side) && Math.hypot(r.pos.x - x, r.pos.z - z) < 0.9) { w.hits.add('b' + r.side); R.stage.hit(w.piece, 1, 0); } }
      if (w.armed && t >= w.armed) { w.alive = false; g.root.visible = false; R._unstage(w.piece); f.fx.glitter(x, 1.2, z, new THREE.Color(3, 2.2, 0.8), 40, 1.2); f.fx.chips(x, 1.2, z, new THREE.Color(2.2, 2.1, 2.0), 30); R.snd.thoom(); }
    }
  };
  // whoever is still walking gets a package from her, puts it on, and bursts on "DAM-age"
  api.arm = (t0, t1) => {
    const f = R.f;
    let n = 0;
    for (const w of api.walkers) {
      if (!w.alive) continue;
      w.armed = t1;
      // (one warning and one impact sound for them all)
      const q = n++ > 0;
      M.lob(f, { start: f.t, end: t0 + 0.3, at: { x: w.g.x, z: w.g.z }, r: 0.4, damage: 0, kind: 'pink', mesh: R.package('box'), shape: 'card', size: 0.4, silentCue: true, silent: q, sound: false, onLand: () => {} });
      M.circle(f, { at: { x: w.g.x, z: w.g.z }, start: t0, end: t1, w: 1.8, kind: 'white', silent: q, sound: !q, follow: () => ({ x: w.g.x, z: w.g.z }) });
    }
  };
  return api;
}
