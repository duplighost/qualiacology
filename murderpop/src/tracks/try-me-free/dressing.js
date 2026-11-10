// The commercial's moving dressing: her box (and the record's boxes) tipping and pouring, cereal falling and
// lying where it fell, the prize pile and the packet she comes out of, the TV, the two lyric signs that are
// things in the world, the studio camera that pans to YOU, sugar frost, the tile popping, and the finish:
// the window bursts, the banks go out one by one, a cheap plastic ring rolls to YOU. Mixed into the set.
import * as THREE from 'three';
import * as P from './paint.js';
import { LAYER } from '../../game/arena.js';

const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const bump = (t, a, b) => (t < a || t > b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
const LOOPC = [0xff3a4a, 0xffd21a, 0xff8a1a, 0xa85aff, 0x3ab8ff, 0xff6ab0];
const RECORD = { ppg: -6.0, ifyd: 6.5, msayf: 12.0, rent: 17.5, stc: 23.0, lake: 28.5, kmlacc: -16.5, rpd: -22.0, ptsd: -27.5 };
const BOXH = { ppg: 10, ifyd: 10, msayf: 11, rent: 10, stc: 10.5, lake: 9.5, kmlacc: 10, rpd: 11, ptsd: 10.5 };
const FRONT = { kmlacc: 16.6, rpd: 16.6, ptsd: 16.6 };
const QUOTED = { court: 'ppg', funeral: 'msayf', suburb: 'ifyd' };

export const DRESSING = {
  _dressing() {
    const f = this.f;
    this.tilts = []; this.spills = []; this.drops = [];
    // cereal: falling pieces and the pieces lying where they fell (one instanced mesh each)
    const geo = new THREE.TorusGeometry(0.15, 0.065, 8, 16), mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, clearcoat: 0.4 });
    this.dropMesh = new THREE.InstancedMesh(geo, mat, 420); this.dropMesh.count = 0; this.dropMesh.frustumCulled = false;
    this.spillMesh = new THREE.InstancedMesh(geo, mat, 600); this.spillMesh.count = 0; this.spillMesh.frustumCulled = false; this.spillMesh.receiveShadow = true;
    for (let i = 0; i < 600; i++) { const c = new THREE.Color(LOOPC[i % 6]); if (i < 420) this.dropMesh.setColorAt(i, c); this.spillMesh.setColorAt(i, c); }
    this.group.add(this.dropMesh, this.spillMesh);
    // the prize pile against the riser (the opening pour's spill) and the packet she comes out of
    const pn = 46, pileGeo = new THREE.TorusGeometry(0.11, 0.05, 8, 16), pile = this.pile = new THREE.InstancedMesh(pileGeo, mat, pn), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), rnd = P.rng(77);
    for (let i = 0; i < pn; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 1.6; q.setFromEuler(new THREE.Euler(Math.PI / 2 + (rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5)); m4.compose(new THREE.Vector3(Math.sin(a) * r * 1.0, 0.05 + (1 - r / 1.6) * 0.16 + rnd() * 0.03, Math.cos(a) * r * 0.4), q, new THREE.Vector3(1, 1, 1)); pile.setMatrixAt(i, m4); pile.setColorAt(i, new THREE.Color(LOOPC[i % 6])); }
    pile.position.set(0, 0, -5.9); pile.receiveShadow = pile.castShadow = true; this.group.add(pile);
    const [pc, pg] = P.canvas(512, 256);
    pg.fillStyle = 'rgba(255,255,255,0.15)'; pg.fillRect(0, 0, 512, 256);
    pg.font = '64px "Archivo Black", Arial Black'; pg.textAlign = 'center'; pg.fillStyle = '#e8202e'; pg.fillText('FREE PRIZE', 256, 120); pg.fillStyle = '#3a6aff'; pg.fillText('INSIDE!', 256, 190);
    const packet = this.packet = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshPhysicalMaterial({ map: P.tex(pc), color: 0xffffff, roughness: 0.08, clearcoat: 1, transmission: 0, iridescence: 0.8, iridescenceIOR: 1.5, transparent: true, opacity: 0.92 }));
    packet.scale.set(1.0, 0.32, 0.7); packet.visible = false; this.group.add(packet);
    // the TV's screen (on the baked console)
    this.screen = new P.Screen();
    const tv = this.arena && this.arena.anchors.tv_screen;
    if (tv) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.62), new THREE.MeshBasicMaterial({ map: this.screen.t, color: new THREE.Color(1.5, 1.5, 1.5) })); s.position.copy(tv.position).add(new THREE.Vector3(0, 0, 0.045)); this.group.add(s); this.tvMesh = s; }
    // lyric sign 2: BLUE CHECK ON MY TRAUMA, a display card on a stalk beside her box
    const sign = this.checkSign = new THREE.Group();
    const card = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshPhysicalMaterial({ map: P.blueCheckSign(), transparent: true, alphaTest: 0.4, roughness: 0.3, clearcoat: 0.6, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.25, emissiveMap: null }));
    card.position.y = 1.3; card.scale.setScalar(0.85); sign.add(card);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), new THREE.MeshPhysicalMaterial({ color: 0xf0c860, metalness: 1, roughness: 0.3 })); stalk.position.y = 0.3; sign.add(stalk);
    sign.position.set(4.2, 0, -5.4); sign.scale.setScalar(1); sign.visible = false; this.group.add(sign);
    // lyric sign 3: MAKE DESTRUCTION SICKLY SWEET, unrolling down her box
    const ban = this.bannerM = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.6), new THREE.MeshPhysicalMaterial({ map: P.banner(), roughness: 0.35, clearcoat: 0.4 }));
    ban.geometry.translate(0, -3.8, 0); ban.position.set(-2.2, 12.6, 0.03); ban.visible = false; this.boxG.add(ban);
    // the studio camera on its crane past the right edge
    const cam = this.studio = new THREE.Group();
    const black = new THREE.MeshPhysicalMaterial({ color: 0x18181c, roughness: 0.35, clearcoat: 0.6 });
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 11.5, 0.3), black); arm.position.set(13.0, 0.6, 0.2); arm.rotation.z = 0.08; this.group.add(arm);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), black); cam.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.7, 20), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.1, clearcoat: 1 })); lens.rotation.z = Math.PI / 2; lens.position.x = -0.9; cam.add(lens);
    this.tally = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.02, 0.02) })); this.tally.position.set(0.2, 0.5, 0); cam.add(this.tally);
    cam.position.set(12.6, 6.2, 0.2); this.group.add(cam);
    // sugar frost over the floor
    this.frostU = { uK: { value: 0 }, uT: { value: 0 } };
    const fm = new THREE.ShaderMaterial({ uniforms: this.frostU, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uK, uT; varying vec2 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        void main(){ vec2 g = vP * 26.0; vec2 c = floor(g); vec2 fp = fract(g) - 0.5; float sp = step(0.9, h(c)) * (1.0 - smoothstep(0.05, 0.22, length(fp))) * (0.5 + 0.5 * sin(uT * 6.0 + h(c + 1.7) * 30.0));
          vec2 q = vP * 1.7; vec2 qi = floor(q), qf = fract(q); qf = qf * qf * (3.0 - 2.0 * qf); float n = mix(mix(h(qi), h(qi + vec2(1,0)), qf.x), mix(h(qi + vec2(0,1)), h(qi + vec2(1,1)), qf.x), qf.y);
          float a = uK * (0.22 + 0.22 * n) + sp * uK * 0.7;
          gl_FragColor = vec4(vec3(0.82, 0.92, 1.05) * a + vec3(1.4) * sp * uK, a); }` });
    this.frostM = new THREE.Mesh(new THREE.PlaneGeometry(23, 14.5), fm); this.frostM.rotation.x = -Math.PI / 2; this.frostM.position.set(-0.2, 0.025, 0.1); this.frostM.visible = false; this.frostM.layers.set(LAYER.NO_REFLECT); this.group.add(this.frostM);
    // the prize ring (the keepsake): cobalt injection-moulded plastic, a faceted starburst gem
    const ring = this.prizeRing = new THREE.Group();
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 40), new THREE.MeshPhysicalMaterial({ color: 0x2a5aff, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 })); ring.add(band);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshPhysicalMaterial({ color: 0x9ac8ff, roughness: 0.05, clearcoat: 1, emissive: 0x2a5aff, emissiveIntensity: 0.4 })); gem.position.y = 0.2; gem.scale.set(1, 0.7, 1); ring.add(gem);
    ring.scale.setScalar(1.6); ring.visible = false; this.group.add(ring);
    // her box tips on its own node in the bake; the record's boxes too
    const node = this.arena && this.arena.nodes.herobox;
    if (node) { node.updateWorldMatrix(true, false); node.attach(this.boxG); }
    this.boxNodes = {};
    this.boxArt = {};
    if (this.arena) for (const k of Object.keys(RECORD)) {
      const n = this.arena.nodes['box_' + k]; if (!n) continue;
      this.boxNodes[k] = n;
      // the box's printed front, riding the box when it tips
      const t = P.recordBox(k), h = BOXH[k], fz = -(FRONT[k] ?? 7.6);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.38, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0 }));
      m.position.set(RECORD[k], 1.2 + h / 2, fz + 0.035); this.group.add(m); n.updateWorldMatrix(true, false); n.attach(m);
      this.boxArt[k] = m;
    }
  },

  // falling cereal: lands at song time tLand
  _drop(x, y, z, tLand) { if (this.drops.length < 420) this.drops.push({ x, y, z, t0: this.t, t1: tLand, r: Math.random() * 6, s: Math.random() * 6 - 3 }); },

  _dressUpdate(f, dt, t, dark) {
    // ---- the boxes tip: her box at the opening and on the pours, every box at the final chorus
    let hero = 0;
    if (t >= 4.94 && t < 7.2) hero = 25 * (t < 5.5 ? ease(clamp01((t - 4.94) / 0.56)) : t < 6.55 ? 1 : 1 - ease(clamp01((t - 6.55) / 0.6)));
    for (const tl of this.tilts) if (Math.abs(tl.x) < 2) hero = Math.max(hero, 12 * bump(t, tl.t0, tl.t1));
    const every = t >= 271.9 && t < 282.92 ? 22 * ease(clamp01((t - 271.9) / 0.7)) : 0;
    hero = Math.max(hero, every);
    // what lands on her box rocks it (two springs, in degrees: a tip, forward +, and a roll), and her death scene tips
    // it over (sceneTip eases to tipT)
    { const R = this.rock;
      for (let n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n, i = 0; i < n; i++) {
        R.va += (-420 * R.a - 7.5 * R.va) * h; R.a += R.va * h;
        R.vr += (-520 * R.r - 9 * R.vr) * h; R.r += R.vr * h;
      }
      R.a = Math.max(-9, Math.min(9, R.a)); R.r = Math.max(-4, Math.min(4, R.r));
      this.sceneTip = (this.sceneTip || 0) + ((this.tipT || 0) - (this.sceneTip || 0)) * Math.min(1, dt * (this.tipRate || 6));
      this._tip = hero + R.a + this.sceneTip;
      const box = this.arena && this.arena.nodes.herobox ? this.arena.nodes.herobox : this.boxG;
      box.rotation.x = this._tip * Math.PI / 180; box.rotation.z = R.r * Math.PI / 180; }
    for (const [k, n] of Object.entries(this.boxNodes)) {
      let a = every * (0.85 + 0.15 * Math.sin(RECORD[k]));
      for (const tl of this.tilts) if (Math.abs(tl.x - RECORD[k]) < 2) a = Math.max(a, 14 * bump(t, tl.t0, tl.t1));
      n.rotation.x = a * Math.PI / 180;
    }
    // the quoted box glows in its spotlight
    const qk = QUOTED[(this.stateName || '').replace(/\d+$/, '')] || null;
    for (const [k, m] of Object.entries(this.boxArt || {})) { const want = dark ? 0 : k === qk ? 0.32 : 0.03; m.material.emissiveIntensity += (want - m.material.emissiveIntensity) * Math.min(1, dt * 10); }
    // the every-cereal pour: a steady waterfall from the box mouths onto the back of the table
    if (every > 5 && !dark && Math.random() < dt * 60) for (const x of [-6, 0, 6.5]) this._drop(x + (Math.random() - 0.5) * 2.6, 9 + Math.random() * 3, -6.7 + Math.random() * 0.4, t + 0.55 + Math.random() * 0.2);
    // the opening pour into the prize pile
    if (t >= 5.92 && t < 6.5 && Math.random() < dt * 90) this._drop((Math.random() - 0.5) * 3, 9 + Math.random() * 2, -6.4 + Math.random() * 1.2, t + 0.4 + Math.random() * 0.1);
    // ---- falling pieces
    const m4 = _m4, q = _q, v = _v, one = _one;
    let n = 0;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (t > d.t1 + 0.25 || t < d.t0) { this.drops.splice(i, 1); continue; }
      const k = clamp01((t - d.t0) / Math.max(0.05, d.t1 - d.t0));
      v.set(d.x, Math.max(0.12, d.y * (1 - k * k)), d.z);
      q.setFromEuler(_e.set(d.r + t * d.s, d.r * 2, t * d.s)); m4.compose(v, q, one); this.dropMesh.setMatrixAt(n++, m4);
    }
    this.dropMesh.count = n; this.dropMesh.instanceMatrix.needsUpdate = true;
    // ---- what spilled stays until the next dark
    if (this._spillDirty) {
      this._spillDirty = false; let c = 0;
      for (const s of this.spills) {
        const rnd = P.rng(Math.floor(s.seed * 1000)), sn = Math.sin(s.ang), cs = Math.cos(s.ang);
        for (let i = 0; i < 48 && c < 600; i++) { const d = 0.5 + rnd() * (s.len - 1), w = (rnd() - 0.5) * 2.2; v.set(s.x + sn * d + cs * w, 0.08, s.z + cs * d - sn * w); q.setFromEuler(new THREE.Euler(Math.PI / 2 + (rnd() - 0.5) * 0.6, rnd() * 6, 0)); m4.compose(v, q, one); this.spillMesh.setMatrixAt(c++, m4); }
      }
      this.spillMesh.count = c; this.spillMesh.instanceMatrix.needsUpdate = true;
    }
    if (dark && this.spills.length) { this.spills.length = 0; this._spillDirty = true; }
    // ---- the pile and the packet
    const pk = clamp01((t - 5.92) / 0.6);
    this.pile.visible = t >= 5.92; this.pile.scale.set(1, Math.max(0.05, pk), 1);
    const pkt = this.packet; pkt.visible = t >= 6.22 && t < 6.57;
    if (pkt.visible) { const k = ease(clamp01((t - 6.22) / 0.25)); pkt.position.set(0, 4.8 * (1 - k) + 0.62, -7.2 + 1.5 * k); pkt.rotation.set(-0.4 * (1 - k), 0, 0.1 * Math.sin(t * 30) * (t > 6.47 ? 1 : 0)); }
    // ---- the TV
    if (this.tvMesh) {
      const tv = this._tvMode(t, dark);
      this.screen.draw(tv.mode, tv.k, tv.n);
    }
    // ---- lyric signs
    const cs = this.checkSign; cs.visible = t >= 136.41 && t < 138.49 && !dark;
    if (cs.visible) { const k = clamp01((t - 136.41) / 0.45), sp = 1 + Math.sin(k * Math.PI * 2.5) * (1 - k) * 0.35; cs.scale.set(1, Math.max(0.01, k * sp), 1); cs.rotation.z = Math.sin(t * 5) * 0.05 * (1.2 - k); }
    this.bannerM.visible = t >= 262.41 && t < 271.9 && !dark;
    if (this.bannerM.visible) this.bannerM.scale.y = Math.max(0.01, ease(clamp01((t - 262.41) / 1.2)));
    // ---- the studio camera pans to YOU for the frames; its tally goes red from the bass-out
    const aim = this.camAim && t < this.camAim.t1 + 0.5 ? this.camAim.get() : { x: f.player.x * 0.5, z: f.player.z * 0.5 };
    const want = Math.atan2(-(aim.z - this.studio.position.z), -(aim.x - this.studio.position.x)) * 0 + Math.atan2(aim.z - this.studio.position.z, -(aim.x - this.studio.position.x));
    this.studio.rotation.y += (-want - this.studio.rotation.y) * Math.min(1, dt * 4);
    this.studio.rotation.z = -0.35;
    const red = (t >= 47.33 && t < 53.64) || (this.camAim && t < this.camAim.t1 + 0.3);
    this.tally.material.color.setRGB(red ? 5 : 0.25, red ? 0.2 : 0.02, red ? 0.15 : 0.02);
    // ---- sugar frost
    const fs = this.frostSpan; const fk = fs && t >= fs.t0 && t < fs.t1 + 0.6 ? (t < fs.t1 ? clamp01((t - fs.t0) / (fs.t1 - fs.t0)) : 1 - clamp01((t - fs.t1) / 0.6)) : 0;
    this.frostM.visible = fk > 0.001 && !dark; this.frostU.uK.value = fk; this.frostU.uT.value = t;
    // ---- the finish: the ring rolls to YOU and spins down
    if (this.ringRoll) this._ringUpdate(f, dt, t);
  },

  _tvMode(t, dark) {
    if (dark) { const s = this._darkT0 ?? t; return t - s < 0.35 ? { mode: 'collapse', k: (t - s) / 0.35 } : { mode: 'off' }; }
    if (t < 1.05) return { mode: 'title' };
    if (t >= 37.38 && t < 53.64) {
      if (t < 38.08) return { mode: 'live' };
      if (t < 41.5) return { mode: 'sub' };
      if (t >= 44.66 && t < 47.03) return { mode: 'swipe', k: (t - 44.66) * 1.6 };
      return { mode: 'live' };
    }
    if (t >= 103.52 && t < 113.56) {
      if (t < 110.79) return { mode: 'live' };
      const k = clamp01((t - 110.79) / (111.64 - 110.79));
      return { mode: 'count', n: 9990000 + 10000 * k * k };
    }
    if (t >= 289.54) return t < 291.34 ? { mode: 'title' } : { mode: 'off' };
    return { mode: 'title' };
  },

  // ---------------------------------------------------------------- the finish and the encore
  finish(f) {
    const b = this.prize.boss, r = this.prizeRing; r.visible = true;
    // her death scene ended her in the bowl: the ring comes up out of the milk, over the rim, and rolls to YOU
    if (this.dth && this.dth.on && this.dth.where === 'bowl') {
      r.position.set(b.x, 1.3, b.z);
      this.ringRoll = { st: 0, vy: 5.2, vz: 3.0, x: b.x + 0.3, y: 1.3, z: b.z + 0.3, spin: 18, bounces: 0, ticks: 0 };
      return;
    }
    // she went in her window: it bursts, and a cheap plastic ring drops out of her and rolls to YOU
    this.cello.visible = false;
    f.fx.glitter(0, 3.0, -7.0, new THREE.Color(3.6, 2.6, 1.0), 120, 2.4);
    f.fx.chips(0, 3.0, -7.0, new THREE.Color(2.6, 2.4, 2.2), 60);
    this.sound.play('cardboard', 0, { rate: 0.6, gain: 1.4 }); this.sound.play('crunch', 0, { rate: 0.8, gain: 1.2 });
    r.position.set(0, 2.2, -7.2);
    this.ringRoll = { st: 0, vy: 1.5, vz: 3.2, x: 0, y: 2.2, z: -7.2, spin: 18, bounces: 0, ticks: 0 };
  },
  _ringUpdate(f, dt, t) {
    const R = this.ringRoll, r = this.prizeRing, pl = f.player;
    R.st += dt;
    if (R.st < 2.6) {
      R.vy -= 14 * dt; R.y += R.vy * dt; R.z += R.vz * dt;
      const floor = R.z < -7 ? 1.2 : 0.06;
      if (R.y < floor + 0.2) { R.y = floor + 0.2; if (R.vy < -1) { R.vy = -R.vy * 0.45; R.bounces++; this.sound.play('clack', R.x, { rate: 2.2, gain: 0.7 }); } else R.vy = 0; }
      // then it rolls toward her feet
      const tx = pl.x + 0.6, tz = pl.z - 0.6, dx = tx - R.x, dz = tz - R.z, d = Math.hypot(dx, dz);
      if (R.z > -6.9 && d > 0.3) { const sp = Math.min(3.2, d * 1.4); R.x += dx / d * sp * dt; R.z += dz / d * sp * dt; R.vz *= 0.97; }
      r.position.set(R.x, R.y, R.z); r.rotation.set(0, Math.atan2(dx, dz), R.st * R.spin);
    } else {
      // spinning down like a dropped coin, tikitikitik
      const k = Math.min(1, (R.st - 2.6) / 2.2);
      r.position.y = 0.06 + 0.12 * (1 - k); r.rotation.x = (Math.PI / 2) * k; r.rotation.y += dt * 14 * (1 - k * 0.9);
      R.ticks += dt * (14 * (1 - k) + 2); if (R.ticks > 1 && k < 1) { R.ticks = 0; this.sound.play('clack', R.x, { rate: 2.6 + k, gain: 0.35 * (1 - k) + 0.1 }); }
    }
  },
  encore(f) {
    const b = this.prize.boss;
    if (b.boxed) this._box(f, false, f.t);          // (out of her box for it)
    b.root.position.y = 0; b.intangible = false; b.lockFacing = false;
    b.place(0, -5.6, 0); b.perform('Spell_Simple_Enter', { duration: 0.4, then: 'Idle_Talking_Loop' });
    f.fx.glitter(0, 2.0, -6.5, new THREE.Color(3.4, 2.6, 1.0), 60, 1.6); this.sound.play('crunch', 0);
  },
};
