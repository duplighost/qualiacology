// Your Apartment Smells Like Summer, per frame. Her rooms (summer.js's Room, painted by
// yas-room.js); the song's clock for every shader on the block (yas-kit.js's U): the beat, the
// wind that throws the curtains out of the windows when the chorus hits, the storm, the party;
// the war inside the wall dropping plaster; the hallway's lights in their cages, the busted one
// stuttering with moths round it; fireworks off the roofs through the choruses and up out of the
// alley on "fireworks in the alley"; the firecracker at the end of its fuse; umbrellas torn off
// the fire escapes in the storm chorus.

import * as THREE from 'three';
import { extend, col } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { clamp, smooth, TAU, merge, box, cyl, sph, seeded, rgb, paint, tag, mergeTagged, VCM, U } from './yas-kit.js';
import { yasRoomMaterial, YAS_ROOMS } from './yas-room.js';
import './yas-street.js';
import './yas-sets.js';

// an umbrella, open: eight panels in two colours, the handle
function umbrella(v) {
  const parts = [], cA = rgb([0xff4a5a, 0x3a8ad8, 0xf4c83a, 0x2ab88a][v]), cB = rgb([0xffffff, 0xffffff, 0x1a1a1a, 0xffffff][v]);
  for (let k = 0; k < 8; k++) {
    const g = new THREE.ConeGeometry(2.2, 1.1, 2, 1, true, (k / 8) * TAU, TAU / 8); g.translate(0, 2.3, 0);
    parts.push(paint(g, k % 2 ? cA : cB));
  }
  parts.push(paint(cyl(0.05, 0.05, 2.6, 6, 0, 1.4, 0), rgb(0x2a2a2a)));
  parts.push(paint(new THREE.TorusGeometry(0.25, 0.05, 6, 10, Math.PI).rotateZ(Math.PI).translate(0.25, 0.1, 0), rgb(0x2a2a2a)));
  return merge(parts);
}
const UMB = { k: 0.42, side: THREE.DoubleSide, roughness: 0.6 };
const CHUNK = { k: 0.25, roughness: 0.9 };
extend({
  layers: {
    yasUmb0: (M) => [umbrella(0), VCM(M, 'yasUmbM', UMB), 24, {}],
    yasUmb1: (M) => [umbrella(1), VCM(M, 'yasUmbM', UMB), 24, {}],
    yasUmb2: (M) => [umbrella(2), VCM(M, 'yasUmbM', UMB), 24, {}],
    yasUmb3: (M) => [umbrella(3), VCM(M, 'yasUmbM', UMB), 24, {}],
    yasChunk: (M) => [merge([paint(box(2.2, 1.6, 0.8), rgb(0xd8ccb8)), paint(box(1.6, 0.4, 0.82, 0.3, 0.7, 0), rgb(0xb89a78))]), VCM(M, 'yasChunkM', CHUNK), 40, {}],
  },
});

export class YasWorld {
  constructor(scene, S, Room) {
    this.S = S;
    prepare(S.course, S.plan);
    // the projector's beam is first drawn mid-ride: made now so the loading card compiles it
    if (S.town) void S.town.layers.yasBeam;
    this.mat = yasRoomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, YAS_ROOMS));
    this.cfg = S.plan.yas || {};
    // the layers drawn straight from here: made now, so they're compiled with everything else
    if (S.town) for (const k of ['yasCage', 'yasChunk', 'yasUmb0', 'yasUmb1', 'yasUmb2', 'yasUmb3']) void S.town.layers[k];
    this.flicker = 1; this.wind = 0; this.party = 0; this.storm = 0;
    this.done = new Set();
    this.mat.uniforms.uRoofT.value = this.cfg.roofT ?? 1e5;
    this._g = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._s = new THREE.Vector3(1, 1, 1); this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
    // the umbrellas the storm takes: one or two a bar through the storm chorus
    this.umbs = [];
    const R = seeded(71), c = S.course;
    for (const [a, b] of this.cfg.umbrellas || []) {
      for (let bi = Math.ceil(c.beatAt(a)); c.timeOfBeat(bi) < b; bi += 4) {
        const t0 = c.timeOfBeat(bi);
        for (let n = 0; n < (R() < 0.5 ? 1 : 2); n++) {
          const side = R() < 0.5 ? -1 : 1;
          this.umbs.push({ t0, tp: t0 + 2.2 + R() * 1.4, side, x0: side * (15 + R() * 3), dx: -side * (8 + R() * 22), up: 10 + R() * 16, spin: (R() - 0.5) * 9, tumble: 1 + R() * 3, v: Math.floor(R() * 4), dur: 3.6 + R() * 1.2 });
        }
      }
    }
    // the plaster the war brings down, along the left wall as she goes past it
    this.chunks = [];
    if (S.plan.roomEvents && S.plan.roomEvents.war !== undefined) {
      const w = S.plan.roomEvents.war;
      for (let k = 0; k < 26; k++) this.chunks.push({ tp: w - 1.2 + k * 0.11 + R() * 0.08, x: -(35.5 + R() * 2), y0: 14 + R() * 12, ts: 0, spin: [R() * 6, R() * 6, R() * 6], s: 0.6 + R() * 0.9, bounce: 0.3 + R() * 0.3 });
      for (const ch of this.chunks) ch.ts = ch.tp - 2.0 - Math.random() * 0.4;
    }
  }

  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, r = S.rider, t = r.t, c = S.course;
    // ---- the song's clock for every shader here ----
    const sec = c.sectionAt(t), kind = sec.kind;
    const inside = this.rooms.some((rm) => rm.mesh.visible && t > rm.span.from && t < rm.span.to && !(rm.span.fallAt !== undefined && t > rm.span.fallAt + 1.5));
    const party = kind === 'chorus' || kind === 'final' ? 1 : (kind === 'post' ? 0.55 : 0);
    const windT = (kind === 'chorus' || kind === 'final' ? 1 : kind === 'post' ? 0.7 : kind === 'pre' ? 0.28 : 0.1) * (this.cfg.windK ?? 1);
    this.wind += (windT - this.wind) * Math.min(1, dt * (windT > this.wind ? 4 : 1.2));
    this.party += (party - this.party) * Math.min(1, dt * (party > this.party ? 5 : 1));
    const stormT = clamp(((P.rain ?? 0) - 0.2) / 0.6, 0, 1);
    this.storm += (stormT - this.storm) * Math.min(1, dt * 2);
    U.uTime.value = time; U.uBeat.value = S.town.beat || 0; U.uBeatPos.value = c.beatAt(t); U.uSongT.value = t;
    U.uWind.value = this.wind; U.uParty.value = this.party; U.uStorm.value = this.storm; U.uLift.value = S.lift ? S.lift.k : 0;
    U.uEnergy.value = c.sample(t).energy;
    U.uFlash.value = S.flash || 0;
    // ---- her rooms ----
    u.uCam.value.copy(camera.position);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffc070);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon); u.uCity.value.set(P.wall ?? 0x3a2a30);
    u.uFairy.value = this.cfg.fairyFrom !== undefined && t > this.cfg.fairyFrom ? 1.6 : 1;
    const ev = S.plan.roomEvents || {};
    u.uWar.value.set(ev.war ?? -1e5, ev.war !== undefined ? 1 : 0);
    u.uFight.value.set(ev.fight ?? -1e5, ev.fight !== undefined ? 1 : 0);
    u.uHands.value.set(ev.hands ?? -1e5, ev.hands !== undefined ? 1 : 0);
    // the busted light: mostly on, then not, then a stutter
    if (ev.bust !== undefined) {
      const near = Math.abs(t - ev.bust) < 6;
      const rr = Math.sin(time * 37.0) * Math.sin(time * 11.3 + 1.7), hold = Math.sin(time * 1.9) > 0.55;
      const target = near ? (hold ? 0.05 : (rr > 0.15 ? 1 : 0.12)) : 1;
      this.flicker += (target - this.flicker) * Math.min(1, dt * 30);
    }
    u.uFlicker.value = this.flicker;
    let bustAlong = -1e5;
    for (const rm of this.rooms) {
      rm.update(S.track, r, t);
      if (ev.bust !== undefined && rm.style === 2 && rm.mesh.visible) { const A = rm.tToAlong(ev.bust); if (A !== null) bustAlong = Math.round(A / 24) * 24; }
    }
    if (bustAlong > -1e4) this._bustAlong = bustAlong;
    u.uBust.value = this._bustAlong ?? -1e5;
    this.inside = inside;
    // ---- what happens on its time ----
    if (S.fireworks) this._events(S, t);
  }

  _events(S, t) {
    const cfg = this.cfg, c = S.course, T = S.track, r = S.rider;
    // fireworks up off the roofs, every other bar through the choruses (more the better she rides)
    for (const [a, b, every, k] of cfg.roofworks || []) {
      if (t < a || t > b) continue;
      const bi = Math.floor(c.beatAt(t));
      if (!c.isBar(bi) || Math.floor((bi - c.nearestBeatIndex(a)) / 4) % (every ?? 2)) continue;
      const key = 'rw' + bi; if (this.done.has(key)) continue; this.done.add(key);
      const n = Math.round((k ?? 2) * (0.6 + 0.8 * r.flow));
      for (let i = 0; i < n; i++) {
        const side = (i + bi) % 2 ? 1 : -1, ta = t + 3.2 + Math.random() * 2.4;
        const from = T.ground(ta, side * (26 + Math.random() * 40), new THREE.Vector3()); from.y = 14 + Math.random() * 10;
        const to = from.clone(); to.y = c.sample(ta).y + 34 + Math.random() * 30; to.x += (Math.random() - 0.5) * 20;
        setTimeout(() => S.fireworks.launch(from, to, 0.8 + 0.5 * r.flow), i * 140);
      }
    }
    for (const e of cfg.events || []) {
      if (t < e.t || t > e.t + 0.6 || this.done.has(e)) continue;
      this.done.add(e);
      if (e.kind === 'alley') {
        // up out of the alley under her: shells that burst round her as she comes down
        for (let i = 0; i < (e.n ?? 8); i++) {
          const side = i % 2 ? 1 : -1, ta = e.t + (e.ahead ?? 0.8) + i * 0.18;
          const from = T.ground(ta, side * (6 + Math.random() * 16), new THREE.Vector3()); from.y = 1;
          const to = from.clone(); to.y = c.sample(ta).y + 12 + Math.random() * 22; to.x += (Math.random() - 0.5) * 10;
          setTimeout(() => S.fireworks.launch(from, to, 1.0), i * 90);
        }
      }
      if (e.kind === 'boom') {
        // the firecracker: a burst of sparks, a pop, a flash, the street lit up
        const ck = S.town.items.find((i) => i.parts === 'yasCracker');
        const p = ck ? T.ground(ck.t, ck.x, new THREE.Vector3()) : T.ground(e.at ?? e.t, e.x ?? 20, new THREE.Vector3());
        p.y = ck ? ck.h + 6 * (ck.s ?? 1) : (e.over !== undefined ? c.sample(e.at ?? e.t).y + e.over : (e.h ?? 14)) + 4;
        S.sparks.emit(p, new THREE.Vector3(0, 6, 0), new THREE.Color(1, 0.7, 0.35).multiplyScalar(3.2), 160, { spread: 14, life: 1.0, size: 0.3, grav: 9, up: 1.4 });
        S.sparks.emit(p, new THREE.Vector3(0, 3, 0), new THREE.Color(1, 0.3, 0.2).multiplyScalar(3), 70, { spread: 9, life: 0.7, size: 0.22, grav: 6 });
        if (S.sound && S.sound.pop) S.sound.pop(e.k ?? 0.8);
        if (S.sound && S.sound.impact) S.sound.impact(0.35);
        S.flash = Math.max(S.flash || 0, e.flash ?? 0.3);
        for (let i = 0; i < 5; i++) { const from = p.clone(); const to = p.clone(); to.y += 20 + Math.random() * 25; to.x += (Math.random() - 0.5) * 30; to.z += (Math.random() - 0.5) * 30; setTimeout(() => S.fireworks.launch(from, to, 0.7), 60 + i * 70); }
      }
    }
  }

  // what hangs in the rooms, and what's in the air
  draw(Tn, rider, songT) {
    const S = this.S, lamp = col(S.P.lamp ?? 0xffc070), cool = [1, 0.95, 0.82];
    const m = this._m, q = this._q, sc = this._s, t = rider.t;
    for (const rm of this.rooms) {
      if (!rm.mesh.visible) continue;
      for (const f of rm.fixtures) {
        const g = S.track.ground(f.t, 0, this._g);
        const fy = floorAt(S.course, f.t);
        if (rm.style === 2) {
          const busted = this._bustAlong !== undefined && Math.abs(f.along - this._bustAlong) < 12;
          const k = busted ? this.flicker : 1;
          // the cage on its stem, the bulb in it
          this._e.set(0, S.course.sample(f.t).yaw, 0); q.setFromEuler(this._e);
          this._w.set(g.x, fy + rm.H - 0.25, g.z); m.compose(this._w, q, sc.set(1.3, 1.3, 1.3)); Tn.layers.yasCage.add(m, { aTint: [k, 0, 0] });
          Tn.glow(g.x, fy + rm.H - 2.3, g.z, 9, cool, 0.9 * k);
          Tn.pool(g.x, fy + 0.08, g.z, 26, cool, 0.35 * k);
          if (busted) for (let n = 0; n < 7; n++) { const a = songT * (2.2 + n * 0.37) + n * 1.9, rr = 2.0 + 0.9 * Math.sin(songT * 1.3 + n); Tn.glow(g.x + Math.cos(a) * rr, fy + rm.H - 2.3 + Math.sin(songT * 3.1 + n * 2) * 1.0, g.z + Math.sin(a) * rr, 0.55, [0.9, 0.85, 0.75], 0.8); }
        } else {
          Tn.glow(g.x, fy + rm.H - 1.2, g.z, 16, lamp, 0.9);
          Tn.pool(g.x, fy + 0.08, g.z, 70, lamp, 0.35);
        }
      }
    }
    // plaster off the wall where the war is
    for (const ch of this.chunks) {
      if (t < ch.ts - 0.2 || t > ch.tp + 1.5) continue;
      const k = Math.max(0, t - ch.ts), fy = floorAt(S.course, ch.tp);
      let y = ch.y0 - 0.5 * 22 * k * k;
      if (y < 0.4) { const kk = k - Math.sqrt(2 * (ch.y0 - 0.4) / 22); y = 0.4 + Math.max(0, ch.bounce * 6 * kk - 0.5 * 22 * kk * kk); }
      const g = S.track.ground(ch.tp, ch.x + (t > ch.ts ? Math.min(k, 0.8) * 1.5 : 0), this._w); g.y = fy + y;
      this._e.set(ch.spin[0] * k, ch.spin[1] * k, ch.spin[2] * k); q.setFromEuler(this._e);
      m.compose(g, q, sc.set(ch.s, ch.s, ch.s)); Tn.layers.yasChunk.add(m);
    }
    // umbrellas the storm takes off the fire escapes, up and over the street
    for (const ub of this.umbs) {
      const k = (songT - ub.t0) / ub.dur;
      if (k < 0 || k > 1) continue;
      const e = 1 - Math.pow(1 - k, 2);
      const g = S.track.ground(ub.tp, ub.x0 + ub.dx * e, this._w); g.y = S.course.sample(ub.tp).y - 2 + ub.up * e + 4 * Math.sin(k * 6 + ub.spin);
      this._e.set(Math.sin(k * ub.tumble * 3) * 1.4, ub.spin * k, Math.cos(k * ub.tumble * 2.3) * 1.1); q.setFromEuler(this._e);
      m.compose(g, q, sc.set(1.6, 1.6, 1.6)); Tn.layers['yasUmb' + ub.v].add(m);
    }
  }
}
