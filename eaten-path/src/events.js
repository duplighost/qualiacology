// events.js — the forest noticing you. Eyes in trunk holes, dead cars waking
// up, sunlight cutting out to show you what it was hiding, junk switching on,
// and the sounds of the path knitting shut at your back.
import * as THREE from 'three';
import { RNG, clamp, lerp, TAU } from './util.js';

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
    world.onSegEnter = (seg) => { this.audio.biome(seg.kind); };

    // shared eye resources
    this.eyeGeo = new THREE.CircleGeometry(0.05, 8);
    this.socketGeo = new THREE.CircleGeometry(0.17, 10);
    this.socketMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
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
