// First-person controller: pointer-lock look, WASD, capsule-vs-AABB collision,
// stair ramps via ground-height query, head-bob and footstep hooks.
import * as THREE from 'three';

const EYE = 1.62;
const RADIUS = 0.34;
const STEP_UP = 0.5;      // colliders topping out below feet+STEP_UP are walkable
const HEAD = 1.75;        // colliders starting above feet+HEAD are overhead

export class Player {
  constructor(camera, world, dom) {
    this.camera = camera;
    this.world = world;
    this.dom = dom;
    this.pos = new THREE.Vector3(30, 0, 38.4);   // just inside the front door
    this.yaw = 0;                                 // camera -Z = north, into the foyer
    this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.fallV = 0;
    this.grounded = true;
    this.keys = {};
    this.enabled = false;       // pointer captured & game running
    this.frozen = false;        // cutscene / UI freeze
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.onFootstep = null;     // (running, level) callback
    this.speedWalk = 2.6;
    this.speedRun = 4.6;
    this.sens = 0.0023;

    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || this.frozen || document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * this.sens;
      this.pitch -= e.movementY * this.sens;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
  }

  lock() { this.dom.requestPointerLock(); }
  get locked() { return document.pointerLockElement === this.dom; }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    let fwd = 0, str = 0;
    if (!this.frozen && this.locked) {
      if (k['KeyW'] || k['ArrowUp']) fwd += 1;
      if (k['KeyS'] || k['ArrowDown']) fwd -= 1;
      if (k['KeyA'] || k['ArrowLeft']) str -= 1;
      if (k['KeyD'] || k['ArrowRight']) str += 1;
    }
    const running = (k['ShiftLeft'] || k['ShiftRight']) && fwd > 0;
    const speed = running ? this.speedRun : this.speedWalk;
    const dirX = -Math.sin(this.yaw), dirZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    let mx = (dirX * fwd + rightX * str);
    let mz = (dirZ * fwd + rightZ * str);
    const ml = Math.hypot(mx, mz);
    if (ml > 0) { mx /= ml; mz /= ml; }

    // smooth accel
    this.vel.x += (mx * speed - this.vel.x) * Math.min(1, dt * 10);
    this.vel.z += (mz * speed - this.vel.z) * Math.min(1, dt * 10);

    // integrate + collide, axis separated
    const feet = this.pos.y;
    this.moveAxis(this.vel.x * dt, 0, feet);
    this.moveAxis(0, this.vel.z * dt, feet);

    // ground
    const gh = this.world.groundHeightAt(this.pos.x, this.pos.z, this.pos.y);
    const dy = this.pos.y - gh;
    if (dy > 0.02) {
      // falling or descending stairs
      if (dy > 0.35) {
        this.fallV += 14 * dt;
        this.pos.y = Math.max(gh, this.pos.y - this.fallV * dt);
        this.grounded = this.pos.y <= gh + 0.01;
      } else {
        this.pos.y = Math.max(gh, this.pos.y - 8 * dt); // glide down steps
        this.grounded = true;
      }
      if (this.grounded) this.fallV = 0;
    } else {
      this.pos.y = this.pos.y + (gh - this.pos.y) * Math.min(1, dt * 14); // smooth up steps
      this.fallV = 0;
      this.grounded = true;
    }

    // head bob + footsteps
    const moving = ml > 0 && this.grounded;
    const targetAmp = moving ? (running ? 0.05 : 0.028) : 0;
    this.bobAmp += (targetAmp - this.bobAmp) * Math.min(1, dt * 6);
    const rate = running ? 9.4 : 6.2;
    const prev = this.bobPhase;
    if (moving) this.bobPhase += dt * rate;
    if (Math.floor(prev / Math.PI) !== Math.floor(this.bobPhase / Math.PI) && moving) {
      if (this.onFootstep) this.onFootstep(running, this.world.levelAt(this.pos.y));
    }
    const bobY = Math.sin(this.bobPhase) * this.bobAmp;
    const bobX = Math.cos(this.bobPhase * 0.5) * this.bobAmp * 0.6;

    // camera
    this.camera.position.set(
      this.pos.x + rightX * bobX,
      this.pos.y + EYE + bobY,
      this.pos.z + rightZ * bobX);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  moveAxis(dx, dz, feet) {
    this.pos.x += dx;
    this.pos.z += dz;
    const P = this.pos;
    for (const c of this.world.colliders) {
      // vertical relevance
      if (c.max.y <= feet + STEP_UP) continue;
      if (c.min.y >= feet + HEAD) continue;
      // quick reject
      if (P.x < c.min.x - RADIUS || P.x > c.max.x + RADIUS) continue;
      if (P.z < c.min.z - RADIUS || P.z > c.max.z + RADIUS) continue;
      // closest point on AABB (XZ)
      const cx = Math.max(c.min.x, Math.min(P.x, c.max.x));
      const cz = Math.max(c.min.z, Math.min(P.z, c.max.z));
      let ox = P.x - cx, oz = P.z - cz;
      let d2 = ox * ox + oz * oz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 < 1e-9) {
        // centre inside the box: push out along the shallowest face
        const pushW = P.x - (c.min.x - RADIUS), pushE = (c.max.x + RADIUS) - P.x;
        const pushN = P.z - (c.min.z - RADIUS), pushS = (c.max.z + RADIUS) - P.z;
        const m = Math.min(pushW, pushE, pushN, pushS);
        if (m === pushW) P.x = c.min.x - RADIUS;
        else if (m === pushE) P.x = c.max.x + RADIUS;
        else if (m === pushN) P.z = c.min.z - RADIUS;
        else P.z = c.max.z + RADIUS;
      } else {
        const d = Math.sqrt(d2);
        const push = (RADIUS - d) / d;
        P.x += ox * push;
        P.z += oz * push;
      }
    }
  }

  getForward() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }
}
