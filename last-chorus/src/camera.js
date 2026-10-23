// Chase camera: low behind the board, looking down the road ahead. Pulls back
// and widens a little with speed, dips with every pump, rolls into the banks.
// Smoothing happens on the offset from the rider, never on world position, so
// the camera can't fall behind at speed.

import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class ChaseCam {
  constructor(camera) {
    this.cam = camera;
    this.off = new THREE.Vector3(); this.offVel = new THREE.Vector3();
    this.look = new THREE.Vector3(); this.lookVel = new THREE.Vector3();
    this.fov = 60; this.roll = 0; this.shake = 0; this.dip = 0; this.kick = 0;
    this.lift = 0;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._c = new THREE.Vector3(); this._r = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this.first = true;
  }

  impulse(shake, dip = 0, kick = 0) { this.shake = Math.max(this.shake, shake); this.dip = Math.min(this.dip + dip, 0.8); this.kick = Math.max(this.kick, kick); }

  // orbit: { center: Vector3, k: 0..1, angle } eases the camera off the rider to circle a place
  update(track, rider, dt, titleK = 0, orbit = null) {
    const t = rider.t, v = rider.v;
    const sp = smooth(16, 80, v);
    const ground = rider.course.sample(t).y;
    const airH = Math.max(0, rider.y - ground);
    // the rider's own spot, at board height
    const R = track.at(t, rider.x, airH + 1.0, this._r);
    // where the camera wants to be: a few metres back along the road we just rode
    this.lift += (clamp(airH, 0, 30) * 0.35 - this.lift) * Math.min(1, dt * 4);
    const dist = 4.3 + 2.4 * sp;
    const back = dist / Math.max(rider.stopping ? rider.stopV0 : v, 12);
    const height = 2.25 + (this.lift0 || 0) + 0.55 * sp - this.dip * 0.4;
    const want = track.at(t - back, rider.x * 0.5, height, this._a);
    want.y = Math.max(want.y, R.y - airH * 0.65 + 0.7);  // follow jumps partway
    // look a little ahead of her, down the road
    const ahead = track.at(t + 0.28 + 0.1 * sp, rider.x * 0.4, 0.8, this._b);
    ahead.y = ahead.y * 0.6 + (R.y - 0.2) * 0.4;

    if (titleK > 0) {
      // before the first press: off her shoulder, looking back past her at the road we came up
      const tv = this.titleView || {};
      const side = track.at(t + (tv.ahead ?? 0.12), tv.x ?? 4.6, tv.h ?? 1.1, this._c);
      want.lerp(side, titleK);
      const her = track.at(t - (tv.back ?? 0.02), rider.x, tv.lookH ?? 1.15, this._c);
      ahead.lerp(her, tv.lookFast ? Math.min(1, titleK * 3) : titleK);
    }

    // springs on offsets relative to the rider
    want.sub(R); ahead.sub(R);
    if (this.first) { this.off.copy(want); this.look.copy(ahead); this.offVel.set(0, 0, 0); this.lookVel.set(0, 0, 0); this.first = false; }
    springTo(this.off, this.offVel, want, 9, dt);
    springTo(this.look, this.lookVel, ahead, 12, dt);

    const pos = this.cam.position.copy(R).add(this.off);
    // glide over the small hills instead of bobbing with each one: the camera rides a
    // smoothed height, so you see her dip into every valley rather than the whole screen
    const cy = rider.course, ys = smoothHeight(cy, t);
    const bob = (ground - ys) * (1 - titleK);
    pos.y -= bob * 0.8;
    // never sink into the ribbon
    const floor = track.at(t - back, rider.x * 0.85, 0.5, this._c).y;
    if (pos.y < floor) pos.y = floor;
    if (this.shake > 0.001) {
      const s = this.shake * this.shake;
      pos.x += (Math.random() - 0.5) * 0.35 * s;
      pos.y += (Math.random() - 0.5) * 0.35 * s;
      this.shake *= Math.exp(-dt * 8);
    }
    this.cam.up.copy(this._up);
    this._b.copy(R).add(this.look); this._b.y -= bob * 0.55;
    this.cam.lookAt(this._b);
    const bank = track.bankAt(t);
    const rollT = (bank * 0.25 - rider.lean * 0.03) * (1 - titleK);
    this.roll += (rollT - this.roll) * Math.min(1, dt * 4);
    this.cam.rotateZ(this.roll);

    if (orbit && orbit.k > 0) {
      const k = orbit.k * orbit.k * (3 - 2 * orbit.k);
      const rr = orbit.r ?? 14, hh = orbit.h ?? 2.6;
      const o = new THREE.Vector3(orbit.center.x + Math.cos(orbit.angle) * rr, orbit.center.y + hh, orbit.center.z + Math.sin(orbit.angle) * rr);
      this.cam.position.lerp(o, k);
      const look = this._b.lerp(orbit.look || orbit.center, k);
      this.cam.lookAt(look);
      this.cam.rotateZ(this.roll * (1 - k));
    }
    const fovT = 58 + 20 * sp + this.kick * 6 + (rider.grounded ? 0 : 2);
    this.fov += (fovT - this.fov) * Math.min(1, dt * 3);
    this.cam.fov = this.fov * (1 - titleK) + 46 * titleK;
    if (orbit && orbit.k > 0) this.cam.fov = this.cam.fov + (42 - this.cam.fov) * orbit.k;
    this.cam.updateProjectionMatrix();
    this.dip *= Math.exp(-dt * 6);
    this.kick *= Math.exp(-dt * 3);
  }
}

// the course height averaged over the hills around t (a Gaussian over about a second)
function smoothHeight(course, t) {
  let sum = 0, wsum = 0;
  for (let k = -6; k <= 6; k++) {
    const w = Math.exp(-0.5 * (k * 0.1 / 0.3) ** 2);
    sum += course.sample(t + k * 0.1).y * w; wsum += w;
  }
  return sum / wsum;
}

function springTo(x, v, target, w, dt) {
  // critically damped spring, stable at any dt
  const f = 1 + 2 * dt * w, oo = w * w, hoo = dt * oo, hhoo = dt * hoo;
  const detInv = 1 / (f + hhoo);
  for (const k of ['x', 'y', 'z']) {
    const detX = f * x[k] + dt * v[k] + hhoo * target[k];
    const detV = v[k] + hoo * (target[k] - x[k]);
    x[k] = detX * detInv; v[k] = detV * detInv;
  }
}
