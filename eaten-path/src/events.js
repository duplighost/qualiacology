// events.js — the forest noticing you. Eyes in trunk holes, dead cars waking
// up, sunlight cutting out to show you what it was hiding, junk switching on,
// and the sounds of the path knitting shut at your back.
import * as THREE from 'three';
import { RNG, clamp, lerp, canvasTexture, TAU } from './util.js';

const EYE_COLORS = [0xffb24d, 0x9dffb0, 0xc99dff, 0xff5c48];

export class Events {
  constructor(scene, world, audio, fx) {
    this.scene = scene; this.world = world; this.audio = audio;
    this.fx = fx; // { glitch(x), osdAnomaly() }
    this.rng = world.rng.fork(999);
    this.eyes = [];            // live eye instances
    this.eyeTimer = this.rng.range(8, 16);
    this.carSeq = null;
    this.sun = null;           // active sun-snap state
    this.flickerSuns = [];     // sunDatas mid relight-flicker
    this.actives = [];         // running junk activations
    this.sealLookWindow = 0; this.sealLookPos = new THREE.Vector3();
    this.sealCreakCooldown = 0;
    this.anomalyTimer = this.rng.range(60, 140);
    this.registeredHums = new Map(); // id -> segId
    this._v = new THREE.Vector3(); this._fwd = new THREE.Vector3();

    world.onCommit = (seg, parent, sealedMouths) => {
      const p = sealedMouths[0] || this.world.pointAt(parent, Math.max(0, parent.samples.length - 4));
      this.audio.sealRush(p);
      this.sealLookWindow = 4.5; this.sealLookPos.copy(p);
      this.fx.glitch(0.45);
    };
    world.onSealSpawn = (p) => {
      if (this.sealCreakCooldown <= 0) {
        this.audio.sealCreak(p);
        this.sealCreakCooldown = this.rng.range(2.2, 4.5);
      }
    };
    world.onSegEnter = (seg) => {
      this.audio.biome(seg.kind);
      if (seg.ruinBell && this.rng.chance(0.5)) this.audio.bell(this.world.pointAt(seg, seg.clearing ? seg.clearing.s : 4, 0));
    };

    // shared eye resources
    this.eyeGeo = new THREE.CircleGeometry(0.05, 8);
    this.socketGeo = new THREE.CircleGeometry(0.17, 10);
    this.socketMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // ---- the things ahead ----
    this.figAhead = this._makeFigure();   // the still watcher down the path
    this.figRun = this._makeFigure();      // the one that runs
    this.ahead = null;                     // active ahead-threat state
    this.runner = null;                    // active runner state
    this.aheadTimer = this.rng.range(20, 40);
    this.runnerTimer = this.rng.range(26, 50);
    this.footTimer = this.rng.range(16, 34);
    this.footPool = this._makeFootprintPool();
    this.foot = null;                      // active footprint trail
    this.prevDepth = 0;
    this.balkWhisperCd = 0;
    this._ap = new THREE.Vector3();
  }

  // ---------------- shared silhouettes ----------------

  _makeFigure() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x171b24, transparent: true, opacity: 1, fog: true });
    const g = new THREE.Group();
    const bx = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); return m;
    };
    g.add(bx(0.15, 1.15, 0.15, -0.13, 0.57, 0), bx(0.15, 1.15, 0.15, 0.13, 0.57, 0)); // legs
    g.add(bx(0.44, 0.98, 0.27, 0, 1.6, 0));                                            // torso
    g.add(bx(0.1, 1.08, 0.1, -0.27, 1.55, 0.02), bx(0.1, 1.08, 0.1, 0.27, 1.55, 0.02)); // long arms
    g.add(bx(0.23, 0.29, 0.23, 0, 2.24, 0.04));                                          // bowed head
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3, 4), mat);
    rope.position.set(0, 3.7, 0); rope.visible = false; g.add(rope);
    g.userData = { mat, rope };
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  _makeFootprintPool() {
    const tex = canvasTexture(32, 48, (gg, w, h) => {
      gg.clearRect(0, 0, w, h);
      gg.fillStyle = '#000';
      gg.globalAlpha = 0.95;
      gg.beginPath(); gg.ellipse(w / 2, h * 0.7, 6.5, 9, 0, 0, TAU); gg.fill();   // heel
      gg.beginPath(); gg.ellipse(w / 2, h * 0.33, 7.5, 12, 0, 0, TAU); gg.fill(); // ball
    });
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: 0x0d0a06, transparent: true, opacity: 0.8,
      alphaTest: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: true,
    });
    const geo = new THREE.PlaneGeometry(0.34, 0.5);
    geo.rotateX(-Math.PI / 2);
    const cap = 80;
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.frustumCulled = false;
    m.count = cap;
    const D = this.dummy || (this.dummy = new THREE.Object3D());
    for (let i = 0; i < cap; i++) { D.position.set(0, -50, 0); D.updateMatrix(); m.setMatrixAt(i, D.matrix); }
    m.instanceMatrix.needsUpdate = true;
    this.scene.add(m);
    return { mesh: m, cap, next: 0, D: new THREE.Object3D() };
  }

  // world-space point `dist` metres ahead of the player along the path
  _aheadPoint(dist, latOff = 0) {
    const seg = this.world.current;
    const targetS = this.world.sCur + dist;
    if (targetS <= seg.samples.length) return { seg, s: targetS, pos: this.world.pointAt(seg, targetS, latOff, this._ap.clone()) };
    const child = seg.children.find((c) => !c.sealed);
    if (child) {
      const cs = Math.min(targetS - seg.samples.length, child.samples.length);
      return { seg: child, s: cs, pos: this.world.pointAt(child, cs, latOff, this._ap.clone()) };
    }
    const cl = seg.samples.length;
    return { seg, s: cl, pos: this.world.pointAt(seg, cl, latOff, this._ap.clone()) };
  }

  // ---------------- eyes in the trees ----------------

  _spawnEyes(spot, camera) {
    spot.used = true;
    const rng = this.rng;
    const tier = this.world.tier();
    const color = EYE_COLORS[rng.chance(0.12 + tier * 0.05) ? 3 : rng.int(0, 2)];
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const g = new THREE.Group();
    const socket = new THREE.Mesh(this.socketGeo, this.socketMat);
    const eL = new THREE.Mesh(this.eyeGeo, mat);
    const eR = new THREE.Mesh(this.eyeGeo, mat);
    eL.position.set(-0.055, 0.01, 0.012);
    eR.position.set(0.055, 0.01, 0.012);
    g.add(socket, eL, eR);
    g.position.copy(spot.pos);
    // face the path
    const target = this.world.pointAt(spot.segRef, spot.s, 0);
    target.y = spot.pos.y;
    g.lookAt(target);
    this.scene.add(g);
    this.eyes.push({
      g, mat, eL, eR, t: 0, life: rng.range(5, 10), state: 'in',
      sacT: 0, sacX: 0, sacY: 0, blink: 0,
    });
    this.audio.eyeChitter(spot.pos);
  }

  _updateEyes(dt, camera) {
    for (let i = this.eyes.length - 1; i >= 0; i--) {
      const e = this.eyes[i];
      e.t += dt;
      if (e.state === 'in') {
        e.mat.opacity = Math.min(1, e.t / 0.8) * 0.9;
        if (e.t > 0.8) { e.state = 'live'; e.t = 0; }
      } else if (e.state === 'live') {
        // saccades — the eyes look around, sometimes at you
        e.sacT -= dt;
        if (e.sacT <= 0) {
          e.sacT = this.rng.range(0.5, 1.6);
          if (this.rng.chance(0.35)) { // stare at the camera
            const local = e.g.worldToLocal(camera.position.clone());
            e.sacX = clamp(local.x * 0.02, -0.05, 0.05);
            e.sacY = clamp(local.y * 0.02, -0.03, 0.03);
          } else {
            e.sacX = this.rng.range(-0.05, 0.05);
            e.sacY = this.rng.range(-0.03, 0.03);
          }
          if (this.rng.chance(0.25)) e.blink = 0.16;
        }
        e.eL.position.x = lerp(e.eL.position.x, -0.055 + e.sacX, 0.3);
        e.eR.position.x = lerp(e.eR.position.x, 0.055 + e.sacX, 0.3);
        e.eL.position.y = e.eR.position.y = lerp(e.eL.position.y, 0.01 + e.sacY, 0.3);
        if (e.blink > 0) {
          e.blink -= dt;
          const s = e.blink > 0.08 ? 0.15 : 1;
          e.eL.scale.y = e.eR.scale.y = s;
        } else { e.eL.scale.y = e.eR.scale.y = 1; }
        if (e.t > e.life) { e.state = 'out'; e.t = 0; }
      } else {
        e.mat.opacity = Math.max(0, 0.9 * (1 - e.t / 1.2));
        if (e.t > 1.2) {
          this.scene.remove(e.g);
          e.mat.dispose();
          this.eyes.splice(i, 1);
        }
      }
    }
  }

  _tryEyes(dt, playerPos, camera, info) {
    const tier = this.world.tier();
    this.eyeTimer -= dt;
    if (this.eyeTimer > 0) return;
    this.eyeTimer = this.rng.range(14, 30) / (1 + tier * 0.4);
    const segs = [info.seg, ...info.seg.children];
    const cands = [];
    camera.getWorldDirection(this._fwd);
    for (const seg of segs) {
      if (!seg.eyeSpots || seg.sealed) continue;
      for (const sp of seg.eyeSpots) {
        if (sp.used) continue;
        const d = sp.pos.distanceTo(playerPos);
        if (d < 7 || d > 22) continue;
        this._v.copy(sp.pos).sub(playerPos).normalize();
        if (this._v.dot(this._fwd) < -0.25) continue; // not fully behind
        sp.segRef = seg;
        cands.push(sp);
      }
    }
    if (cands.length) this._spawnEyes(this.rng.pick(cands), camera);
  }

  // ---------------- the dead car wakes ----------------

  _tryCar(playerPos) {
    if (this.carSeq) return; // one wreck wakes at a time
    for (const seg of [this.world.current, ...this.world.current.children]) {
      const cd = seg.carData;
      if (!cd || !cd.armed) continue;
      const d = cd.pos.distanceTo(playerPos);
      if (d > 17) continue;
      cd.armed = false;
      if (!this.rng.chance(0.6)) continue; // most stay dead
      const light = new THREE.PointLight(0xffe6b0, 0, 15, 2);
      light.position.set(2.3, 0.8, 0);
      cd.group.add(light);
      const onMat = new THREE.MeshBasicMaterial({ color: 0xffe9b8 });
      const nHonks = d < 7 ? 1 : this.rng.int(1, 3);
      const seq = { t: 0, cd, light, onMat, offMat: cd.heads[0].material, done: false, honks: [], flickers: [] };
      let ht = this.rng.range(0.8, 1.6);
      for (let i = 0; i < nHonks; i++) { seq.honks.push(ht); ht += this.rng.range(0.7, 1.7); }
      for (let t2 = 0.1; t2 < ht + 1.2; t2 += this.rng.range(0.08, 0.5)) seq.flickers.push(t2);
      seq.end = ht + this.rng.range(1, 2.2);
      seq.loud = d < 7;
      this.carSeq = seq;
      this.audio.carSputter(cd.pos);
      this.fx.glitch(0.3);
      return;
    }
  }

  _updateCar(dt) {
    const s = this.carSeq;
    if (!s) return;
    s.t += dt;
    while (s.flickers.length && s.flickers[0] <= s.t) {
      s.flickers.shift();
      const on = this.rng.chance(0.62);
      s.light.intensity = on ? this.rng.range(3, 9) : 0;
      for (const h of s.cd.heads) h.material = on ? s.onMat : s.offMat;
    }
    // decay glow between flickers
    s.light.intensity = Math.max(0, s.light.intensity - dt * 14);
    while (s.honks.length && s.honks[0] <= s.t) {
      s.honks.shift();
      this.audio.honk(s.cd.pos, s.loud);
      s.light.intensity = 9;
    }
    if (s.t > s.end) {
      s.light.intensity = 0;
      s.cd.group.remove(s.light);
      for (const h of s.cd.heads) h.material = s.offMat;
      s.onMat.dispose();
      this.audio.carDie(s.cd.pos);
      this.carSeq = null;
    }
  }

  // ---------------- sunlight, withdrawn ----------------

  _trySun(dt, playerPos, camera, info) {
    const sd = info.seg.sunData;
    if (this.sun || !sd || !sd.armed) return;
    const d = Math.hypot(playerPos.x - sd.center.x, playerPos.z - sd.center.z);
    if (d > sd.r + 2) { sd.linger = 0; return; }
    sd.linger = (sd.linger || 0) + dt;
    if (sd.linger > this.rng.range(2.5, 5) || d < sd.r * 0.35) {
      sd.armed = false;
      // SNAP.
      sd.shaftGroup.visible = false;
      sd.sun.intensity = 0;
      camera.getWorldDirection(this._fwd);
      const dist = this.rng.range(5.5, 9);
      const sx = playerPos.x + this._fwd.x * dist + this.rng.gauss() * 1.6;
      const sz = playerPos.z + this._fwd.z * dist + this.rng.gauss() * 1.6;
      sd.snag.position.set(sx, 0, sz);
      sd.snag.rotation.y = Math.atan2(playerPos.x - sx, playerPos.z - sz) + this.rng.gauss() * 0.3;
      sd.snag.visible = true;
      info.seg.colliders.push({ x: sx, z: sz, r: 0.55 }); // it is solid. it was always solid.
      this.audio.sunSnap();
      this.fx.glitch(0.85);
      if (this.rng.chance(0.35)) this.fx.osdAnomaly();
      this.sun = { sd, t: 0, relightAt: this.rng.range(8, 14), relit: false };
    }
  }

  _updateSun(dt) {
    const S = this.sun;
    if (!S) return;
    S.t += dt;
    if (!S.relit && S.t > S.relightAt) {
      S.relit = true;
      if (this.rng.chance(0.55)) {
        // the light stutters back, weaker — and it was only ever a tree. probably.
        S.sd.shaftGroup.visible = true;
        S.sd.flicker = 1;
        this.flickerSuns.push(S.sd); // tracked directly — the player may be segments away
        if (this.world.tier() >= 2 && this.rng.chance(0.5)) S.sd.snag.visible = false; // ...gone
        this.audio.relight(S.sd.center);
      }
      this.sun = null;
    }
  }

  // ---------------- junk switches on ----------------

  _tryActuators(playerPos) {
    const tier = this.world.tier();
    for (const seg of [this.world.current, ...this.world.current.children]) {
      if (!seg.actuators) continue;
      for (const a of seg.actuators) {
        if (a.fired) continue;
        if (a.pos.distanceTo(playerPos) > a.r) continue;
        a.fired = true;
        if (!this.rng.chance(0.55 + tier * 0.08)) continue; // most junk stays dead
        this._activate(a);
      }
    }
  }

  _activate(a) {
    const rng = this.rng;
    const act = { a, t: 0, dur: 5, kind: a.type };
    switch (a.type) {
      case 'tv': {
        act.dur = rng.range(3.5, 7);
        act.ctx = a.tex.image.getContext('2d');
        act.frame = 0;
        this.audio.tvStatic(a.pos, true, a);
        break;
      }
      case 'radio': act.dur = rng.range(6, 11); this.audio.radioSong(a.pos, act.dur); break;
      case 'swing': act.dur = rng.range(8, 14); act.amp = 0.5; this.audio.swingCreakLoop(a.pos, act.dur); break;
      case 'lamp': {
        act.dur = rng.range(3, 6);
        act.light = new THREE.PointLight(0xffdf9e, 0, 8, 2);
        act.light.position.copy(a.pos);
        this.scene.add(act.light);
        this.audio.lampBuzz(a.pos, act.dur);
        break;
      }
      case 'washer': act.dur = rng.range(3, 5); this.audio.washerThump(a.pos, act.dur); break;
      case 'phone': act.dur = rng.range(4, 8); this.audio.phoneRing(a.pos, act.dur); break;
    }
    this.fx.glitch(0.2);
    this.actives.push(act);
  }

  _updateActives(dt) {
    for (let i = this.actives.length - 1; i >= 0; i--) {
      const act = this.actives[i];
      act.t += dt;
      const done = act.t >= act.dur;
      switch (act.kind) {
        case 'tv': {
          act.frame += dt * 10;
          if (act.frame >= 1) {
            act.frame = 0;
            const g = act.ctx, w = 64, h = 48;
            const img = g.createImageData(w, h);
            for (let k = 0; k < img.data.length; k += 4) {
              const v = (Math.random() * 210) | 0;
              img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
            }
            g.putImageData(img, 0, 0);
            act.a.tex.needsUpdate = true;
            act.a.screen.material.color.setScalar(1);
          }
          if (done) {
            const g = act.ctx;
            g.fillStyle = '#0a0d0c'; g.fillRect(0, 0, 64, 48);
            act.a.tex.needsUpdate = true;
            this.audio.tvStatic(act.a.pos, false, act.a);
          }
          break;
        }
        case 'swing': {
          const decay = 1 - act.t / act.dur;
          act.a.pivot.rotation.x = Math.sin(act.t * 2.2) * 0.45 * decay;
          if (done) act.a.pivot.rotation.x = 0;
          break;
        }
        case 'lamp': {
          act.light.intensity = (Math.sin(act.t * 31) > -0.2 && Math.random() > 0.15) ? 2.6 : 0;
          if (act.a.shadeMat) act.a.shadeMat.emissive.setHex(act.light.intensity > 0 ? 0x664c1e : 0x000000);
          if (done) {
            this.scene.remove(act.light);
            if (act.a.shadeMat) act.a.shadeMat.emissive.setHex(0x000000);
          }
          break;
        }
      }
      if (done) this.actives.splice(i, 1);
    }
  }

  // ---------------- the thing standing down the path ----------------

  _tryAhead(dt, playerPos) {
    if (this.ahead) return;
    this.aheadTimer -= dt;
    if (this.aheadTimer > 0) return;
    const tier = this.world.tier();
    this.aheadTimer = this.rng.range(17, 34) / (1 + tier * 0.45);
    if (this.world.depth <= this.prevDepth + 0.02) { this.aheadTimer = this.rng.range(3, 6); return; }
    const type = this.rng.pick(tier >= 1 ? ['sentinel', 'sentinel', 'hanged', 'hunched'] : ['sentinel', 'sentinel', 'hunched']);
    const A = this._aheadPoint(this.rng.range(16, 26), this.rng.gauss() * 0.55);
    const fig = this.figAhead;
    fig.userData.mat.opacity = 1;
    fig.userData.rope.visible = false;
    fig.scale.set(1, 1, 1);
    fig.rotation.set(0, 0, 0);
    fig.position.set(A.pos.x, 0, A.pos.z);
    if (type === 'hanged') { fig.position.y = 1.4; fig.userData.rope.visible = true; }
    else if (type === 'hunched') { fig.scale.set(1.18, 0.78, 1.18); fig.rotation.x = 0.5; }
    fig.rotation.y = Math.atan2(playerPos.x - A.pos.x, playerPos.z - A.pos.z);
    fig.visible = true;
    this.ahead = { type, pos: new THREE.Vector3(A.pos.x, fig.position.y, A.pos.z), t: 0, ttl: this.rng.range(9, 16), vanishing: false, vt: 0, swayPh: this.rng.float() * TAU, approached: false };
    if (this.rng.chance(0.5)) this.audio.whisper(this.ahead.pos);
    this.fx.glitch(0.15);
  }

  _updateAhead(dt, playerPos) {
    const A = this.ahead; if (!A) return;
    A.t += dt;
    const fig = this.figAhead;
    const dxz = Math.hypot(playerPos.x - A.pos.x, playerPos.z - A.pos.z);
    fig.rotation.y = Math.atan2(playerPos.x - A.pos.x, playerPos.z - A.pos.z);
    if (A.type === 'hanged') {
      A.swayPh += dt * 1.3;
      fig.rotation.z = Math.sin(A.swayPh) * 0.06;
      fig.rotation.y += Math.sin(A.swayPh * 0.6) * 0.1;
    }
    if (!A.vanishing && (dxz < 8 || A.t > A.ttl)) {
      A.vanishing = true; A.vt = 0; A.approached = dxz < 8;
      if (A.approached) { this.audio.sealSting(); this.fx.glitch(0.5); } // the gut-punch: you got close, it's gone
    }
    if (A.vanishing) {
      A.vt += dt;
      fig.userData.mat.opacity = Math.max(0, 1 - A.vt / 0.35);
      if (A.vt > 0.42) { fig.visible = false; this.ahead = null; }
    }
  }

  // ---------------- the one that runs ----------------

  _tryRunner(dt) {
    if (this.runner) return;
    this.runnerTimer -= dt;
    if (this.runnerTimer > 0) return;
    const tier = this.world.tier();
    this.runnerTimer = this.rng.range(24, 46) / (1 + tier * 0.4);
    if (this.world.depth <= this.prevDepth + 0.02) { this.runnerTimer = this.rng.range(4, 8); return; }
    const kind = this.rng.chance(0.55) ? 'crosser' : 'fleer';
    const fig = this.figRun;
    fig.userData.mat.opacity = 1; fig.userData.rope.visible = false;
    fig.scale.set(0.98, 1, 0.98); fig.rotation.set(0, 0, 0);
    if (kind === 'crosser') {
      const A = this._aheadPoint(this.rng.range(12, 20), 0);
      const tn = this.world.tangentAt(A.seg, A.s);
      const perp = new THREE.Vector3(tn.z, 0, -tn.x);
      const side = this.rng.sign();
      const half = this.world.halfWidthAt(A.seg, A.s) + 3.8;
      const start = A.pos.clone().add(perp.clone().multiplyScalar(-side * half));
      const end = A.pos.clone().add(perp.clone().multiplyScalar(side * half));
      this.runner = { kind, t: 0, dur: this.rng.range(0.7, 1.1), start, end, stepCd: 0, pos: start.clone() };
      fig.position.set(start.x, 0, start.z);
      this.audio.brushCrash(start);
    } else {
      const A = this._aheadPoint(this.rng.range(10, 14), 0);
      const B = this._aheadPoint(this.rng.range(27, 35), 0);
      this.runner = { kind, t: 0, dur: this.rng.range(1.7, 2.7), start: A.pos.clone(), end: B.pos.clone(), stepCd: 0, pantCd: 0, pos: A.pos.clone() };
      fig.position.set(A.pos.x, 0, A.pos.z);
      this.audio.panting(A.pos);
    }
    fig.visible = true;
    this.fx.glitch(0.12);
  }

  _updateRunner(dt) {
    const R = this.runner; if (!R) return;
    R.t += dt;
    const k = Math.min(1, R.t / R.dur);
    const fig = this.figRun;
    R.pos.lerpVectors(R.start, R.end, k);
    const bounce = Math.abs(Math.sin(k * Math.PI * (R.kind === 'crosser' ? 6 : 8))) * 0.09;
    fig.position.set(R.pos.x, bounce, R.pos.z);
    const dir = this._v.subVectors(R.end, R.start);
    fig.rotation.set(0.28, Math.atan2(dir.x, dir.z), 0); // lean into the run
    R.stepCd -= dt;
    if (R.stepCd <= 0) { R.stepCd = 0.16; this.audio.footfall(R.pos, true); }
    if (R.kind === 'fleer') { R.pantCd -= dt; if (R.pantCd <= 0) { R.pantCd = this.rng.range(0.7, 1.2); this.audio.panting(R.pos); } }
    if (k > 0.85) fig.userData.mat.opacity = Math.max(0, (1 - k) / 0.15);
    if (k >= 1) {
      fig.visible = false;
      if (R.kind === 'crosser') this.audio.brushCrash(R.end);
      this.runner = null;
    }
  }

  // ---------------- footprints leading forward ----------------

  _tryFootprints(dt) {
    if (this.foot) return;
    this.footTimer -= dt;
    if (this.footTimer > 0) return;
    const tier = this.world.tier();
    this.footTimer = this.rng.range(18, 34) / (1 + tier * 0.4);
    if (this.world.depth <= this.prevDepth + 0.02) { this.footTimer = this.rng.range(4, 8); return; }
    const n = this.rng.int(7, 12);
    const wrong = tier >= 2 && this.rng.chance(0.42); // too many feet, or dragging
    const prints = [];
    let d0 = this.rng.range(2, 3.5);
    for (let i = 0; i < n; i++) {
      const dist = d0 + i * this.rng.range(0.7, 1.0);
      const foot = (i % 2 === 0) ? -1 : 1;
      let lat = foot * 0.2, drag = 1;
      if (wrong) { if (this.rng.chance(0.35)) lat = foot * 0.6; if (this.rng.chance(0.3)) drag = 1.9; }
      const A = this._aheadPoint(dist, lat);
      const tn = this.world.tangentAt(A.seg, A.s);
      const idx = this.footPool.next; this.footPool.next = (this.footPool.next + 1) % this.footPool.cap;
      prints.push({ idx, pos: A.pos.clone(), yaw: Math.atan2(tn.x, tn.z), foot, drag, appear: i * 0.14, landed: false });
    }
    this.foot = { prints, t: 0, dur: this.rng.range(7, 11) };
  }

  _updateFootprints(dt) {
    const F = this.foot; if (!F) return;
    F.t += dt;
    const D = this.footPool.D, m = this.footPool.mesh;
    for (const p of F.prints) {
      const local = F.t - p.appear;
      let env = 0;
      if (local > 0) {
        const fadeOut = clamp(1 - (F.t - (F.dur - 2)) / 2, 0, 1);
        env = Math.min(1, local / 0.22) * fadeOut;
        if (!p.landed) { p.landed = true; this.audio.footfall(p.pos, false); } // you hear the steps you can't see
      }
      D.position.set(p.pos.x, 0.03, p.pos.z);
      D.rotation.set(0, p.yaw, 0);
      D.scale.set(Math.max(0.001, env) * (p.foot < 0 ? -1 : 1), Math.max(0.001, env), Math.max(0.001, env) * p.drag);
      D.updateMatrix();
      m.setMatrixAt(p.idx, D.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (F.t > F.dur) {
      for (const p of F.prints) { D.position.set(0, -50, 0); D.scale.set(1, 1, 1); D.rotation.set(0, 0, 0); D.updateMatrix(); m.setMatrixAt(p.idx, D.matrix); }
      m.instanceMatrix.needsUpdate = true;
      this.foot = null;
    }
  }

  // ---------------- hums, stings, anomalies ----------------

  _syncHums() {
    const near = new Set();
    for (const seg of [this.world.current, ...this.world.current.children, this.world.current.parent]) {
      if (!seg || seg.sealed || !seg.humSources) continue;
      for (const h of seg.humSources) {
        near.add(h.id);
        if (!this.registeredHums.has(h.id)) {
          this.audio.addHum(h.id, h.pos, h.loud);
          this.registeredHums.set(h.id, seg.id);
        }
      }
    }
    for (const [id, segId] of this.registeredHums) {
      const seg = this.world.segs.get(segId);
      if (!near.has(id) || !seg || seg.sealed) {
        this.audio.removeHum(id);
        this.registeredHums.delete(id);
      }
    }
  }

  update(dt, playerPos, camera, info) {
    this.sealCreakCooldown -= dt;
    this._tryEyes(dt, playerPos, camera, info);
    this._updateEyes(dt, camera);
    this._tryCar(playerPos);
    this._updateCar(dt);
    this._trySun(dt, playerPos, camera, info);
    this._updateSun(dt);
    this._tryActuators(playerPos);
    this._updateActives(dt);
    this._syncHums();
    this._tryAhead(dt, playerPos);
    this._updateAhead(dt, playerPos);
    this._tryRunner(dt);
    this._updateRunner(dt);
    this._tryFootprints(dt);
    this._updateFootprints(dt);

    // the forest herds you: balk in front of the watcher and it closes behind you
    this.world.forwardUrge = 0;
    const advancing = this.world.depth > this.prevDepth + 0.01;
    if (this.ahead && !this.ahead.vanishing && !advancing) {
      const d = Math.hypot(playerPos.x - this.ahead.pos.x, playerPos.z - this.ahead.pos.z);
      this.world.forwardUrge = clamp(1 - (d - 8) / 20, 0.25, 1);
      this.balkWhisperCd -= dt;
      if (this.balkWhisperCd <= 0) { this.balkWhisperCd = this.rng.range(2.5, 5); this.audio.whisper(this.ahead.pos); this.fx.glitch(0.1); }
    }
    this.prevDepth = this.world.depth;

    // sun flicker-back (tracked list — works even after the player moved on)
    for (let i = this.flickerSuns.length - 1; i >= 0; i--) {
      const sd = this.flickerSuns[i];
      sd.flicker -= dt;
      const on = Math.random() > 0.4;
      sd.sun.intensity = on ? sd.sunBaseIntensity * 0.4 : 0;
      if (sd.flicker <= 0) {
        sd.sun.intensity = sd.sunBaseIntensity * 0.35;
        this.flickerSuns.splice(i, 1);
      }
    }

    // did you watch it close?
    if (this.sealLookWindow > 0) {
      this.sealLookWindow -= dt;
      camera.getWorldDirection(this._fwd);
      this._v.copy(this.sealLookPos).sub(playerPos).normalize();
      if (this._v.dot(this._fwd) > 0.55 && this.sealLookPos.distanceTo(playerPos) < 28) {
        this.sealLookWindow = 0;
        this.audio.sealSting();
        this.fx.glitch(0.3);
      }
    }

    // deep-forest OSD wrongness
    if (this.world.tier() >= 2) {
      this.anomalyTimer -= dt;
      if (this.anomalyTimer <= 0) {
        this.anomalyTimer = this.rng.range(60, 140);
        this.fx.osdAnomaly();
        if (this.rng.chance(0.4)) this.audio.distantCall(playerPos);
      }
    }
  }
}
