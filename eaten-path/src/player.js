// player.js — first-person walker. Pointer lock, WASD, head bob, step events.
import * as THREE from 'three';
import { clamp, damp, lerp } from './util.js';

const EYE_HEIGHT = 1.62;
const WALK = 2.3, HURRY = 4.1;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3(0, 0, 2);
    this.yaw = 0; this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.keys = { f: false, b: false, l: false, r: false, hurry: false };
    this.bobPhase = 0; this.bobAmp = 0;
    this.speed2D = 0;
    this.onStep = null;       // (surface, hurry) => {}
    this.locked = false;
    this.testInput = null;    // {f,b,l,r,hurry,yawRate} for the harness
    this.sens = 0.0023;
    // Touch: an analog move vector from the left thumb, and a hurry flag raised by
    // pushing that stick to its edge (so there is no separate run button to find).
    // Look comes through applyTouchLook, which feeds the same yaw/pitch the mouse does.
    this.touchMove = { x: 0, z: 0 };
    this.touchHurry = false;
    this.touchSens = 0.0034;  // px -> radians; a thumb travels less than a mouse

    dom.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sens;
      this.pitch = clamp(this.pitch - e.movementY * this.sens, -1.35, 1.35);
    });
    const setKey = (code, down) => {
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.f = down;
      else if (code === 'KeyS' || code === 'ArrowDown') this.keys.b = down;
      else if (code === 'KeyA' || code === 'ArrowLeft') this.keys.l = down;
      else if (code === 'KeyD' || code === 'ArrowRight') this.keys.r = down;
      else if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.hurry = down;
    };
    addEventListener('keydown', (e) => setKey(e.code, true));
    addEventListener('keyup', (e) => setKey(e.code, false));
  }

  get moving() { return this.speed2D > 0.25; }

  // Right-thumb drag. Same relative-delta model as the mouse, so everything
  // downstream (bob, step events, the camera) is unchanged.
  applyTouchLook(dx, dy) {
    this.yaw -= dx * this.touchSens;
    this.pitch = clamp(this.pitch - dy * this.touchSens, -1.35, 1.35);
  }

  update(dt, world) {
    const k = this.testInput || this.keys;
    if (this.testInput && this.testInput.yawRate) this.yaw += this.testInput.yawRate * dt;
    // The harness drives keys directly; don't let a stray thumb vector into its runs.
    const t = this.testInput ? { x: 0, z: 0 } : this.touchMove;
    const hurry = k.hurry || (!this.testInput && this.touchHurry);
    const fwd = (k.f ? 1 : 0) - (k.b ? 1 : 0) + t.z;
    const str = (k.r ? 1 : 0) - (k.l ? 1 : 0) + t.x;
    // camera looks along (-sin yaw, -cos yaw); right is (cos yaw, -sin yaw)
    const target = new THREE.Vector3(
      -Math.sin(this.yaw) * fwd + Math.cos(this.yaw) * str,
      0,
      -Math.cos(this.yaw) * fwd - Math.sin(this.yaw) * str,
    );
    if (target.lengthSq() > 1) target.normalize();
    const speed = hurry ? HURRY : WALK;
    target.multiplyScalar(speed);
    this.vel.x = damp(this.vel.x, target.x, 9, dt);
    this.vel.z = damp(this.vel.z, target.z, 9, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.speed2D = Math.hypot(this.vel.x, this.vel.z);

    const info = world.updatePlayer(this.pos, dt, this.moving);

    // head bob + step events
    const bobFreq = (hurry ? 2.5 : 1.85) * Math.PI;
    const prevPhase = this.bobPhase;
    this.bobAmp = damp(this.bobAmp, this.moving ? 1 : 0, 6, dt);
    if (this.moving) this.bobPhase += dt * bobFreq * (this.speed2D / WALK) * 0.85;
    const stepped = Math.floor(this.bobPhase / Math.PI) !== Math.floor(prevPhase / Math.PI);
    if (stepped && this.onStep) {
      const surface = Math.abs(info.lat) < Math.min(1.4, info.halfW * 0.55) ? 'dirt' : 'leaves';
      this.onStep(surface, hurry, this.speed2D);
    }

    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.055 * this.bobAmp;
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.02 * this.bobAmp;
    this.camera.position.set(
      this.pos.x + Math.cos(this.yaw) * bobX,
      EYE_HEIGHT + bobY - 0.02 * this.bobAmp,
      this.pos.z - Math.sin(this.yaw) * bobX,
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = Math.sin(this.bobPhase * 0.5) * 0.004 * this.bobAmp;
    return info;
  }
}
