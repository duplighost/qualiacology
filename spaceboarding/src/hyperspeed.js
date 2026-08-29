// HYPERSPEED.
//
// Alex, three times about the same thing, the last time plainly: "boost still
// doesn't seem like it does anything after landing a trick. i really cant see
// it. it needs to show it like in a really cool hyperspeed way and actually do
// it."
//
// The reason he could not see it is that there was nothing to see. Before this
// file the game had NO speed cue tied to boost at all -- no streaks, no warp,
// no blur, nothing. The only things that moved were the road scrolling (which
// changes by a few per cent), a FOV that travels about three degrees across the
// entire speed range, and a number in the corner. Two rounds were spent tuning
// the size of a reward that had no way of reaching the screen.
//
// So: the thing itself. A tube of streaks around the camera axis that rushes
// past you, lit only by earned boost. It is deliberately IN-WORLD rather than a
// screen overlay, because that is the house rule -- the player should feel the
// state through the world, not read it off the HUD.
//
// Two constraints it is built around:
//
//  1. It must never cover the road, the rider, or the trick flame. Everything
//     lives outside INNER_RADIUS, so the streaks frame the middle of the screen
//     instead of filling it. The flame legibility gate measures pixels of world
//     against pixels of flame and would (correctly) fail a curtain drawn over
//     the whole viewport.
//  2. It is ONE draw call. The rider rig is already at 219 against a gate of
//     240, so a per-streak mesh was never an option -- this is a single
//     InstancedMesh whose per-instance matrices are rewritten each frame.
import * as THREE from 'three';

// Nothing inside this radius, ever. The road, the rider and the underglow all
// live in the middle of the frame and all of them have to stay readable.
const INNER_RADIUS = 7.2;
const OUTER_RADIUS = 46;
// How far ahead they spawn and how far behind they are recycled. Ahead is -z.
const FAR_Z = -190;
const NEAR_Z = 14;
// Below this much boost there are no streaks at all. That is what makes them a
// REWARD rather than ambience: they show up because you earned them, and their
// absence the rest of the time is what gives them meaning when they arrive.
const THRESHOLD = 0.12;
const FULL = 0.62;

const WHITE = new THREE.Color(0xffffff);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export class Hyperspeed {
  constructor({ parent, count = 240, reducedMotion = false, random = Math.random }) {
    this.reducedMotion = reducedMotion;
    this.count = reducedMotion ? Math.round(count * 0.35) : count;
    this.random = random;
    this.intensity = 0;

    // A thin bar, one unit long down +z, scaled per instance. A box rather
    // than a line: lines ignore width and vanish at distance, and a streak that
    // thins out with range is a streak nobody sees.
    const geometry = new THREE.BoxGeometry(0.055, 0.055, 1, 1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      // Additive so they read as light being outrun rather than as objects in
      // the road. They are travelling faster than anything else on screen and
      // they should look like it.
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
    this.mesh.name = 'hyperspeed-streaks';
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.visible = false;
    this.mesh.renderOrder = 2;
    this.material = material;
    parent.add(this.mesh);

    this.matrix = new THREE.Matrix4();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.position = new THREE.Vector3();

    this.streaks = Array.from({ length: this.count }, () => this._spawn(true));
  }

  _spawn(initial = false) {
    const r = this.random();
    // Biased outward: a uniform radius crowds the middle of the screen, which
    // is the one place these are not allowed to be.
    const radius = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * Math.sqrt(r);
    const angle = this.random() * Math.PI * 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.62 + 3.4,
      z: initial ? FAR_Z + this.random() * (NEAR_Z - FAR_Z) : FAR_Z - this.random() * 40,
      // Per-streak speed spread, so they do not move as one sheet.
      rate: 0.85 + this.random() * 0.5,
      length: 0.6 + this.random() * 0.85,
    };
  }

  /**
   * `boost` is the 0..1 band fraction the player reads off the burn meter, so
   * the streaks and the meter can never disagree about how fast you are going.
   */
  update({ boost = 0, speed = 0, dt = 1 / 60, anchorX = 0, anchorZ = 0 } = {}) {
    const wanted = smoothstep(THRESHOLD, FULL, boost);
    // Attack fast, release slow. The arrival is the reward; the fade is the
    // comedown, and a comedown that snaps off feels like a bug.
    const rate = wanted > this.intensity ? 9.5 : 2.4;
    this.intensity += (wanted - this.intensity) * clamp(rate * dt, 0, 1);
    if (this.intensity < 0.004) {
      if (this.mesh.visible) this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.material.opacity = this.intensity * (this.reducedMotion ? 0.34 : 0.82);

    // They travel toward the camera far faster than the world does -- that
    // difference IS the effect. At rest the world moves and these do not exist;
    // at full boost they tear past.
    const travel = (speed * 0.085 + 120) * (0.45 + this.intensity * 1.35);
    const stretch = (2.6 + this.intensity * 13.5);

    this.mesh.position.set(anchorX, 0, anchorZ);
    for (let i = 0; i < this.streaks.length; i += 1) {
      const s = this.streaks[i];
      s.z += travel * s.rate * dt;
      if (s.z > NEAR_Z) Object.assign(s, this._spawn(false));
      const length = s.length * stretch;
      this.position.set(s.x, s.y, s.z);
      this.scale.set(1, 1, length);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Tint the streaks. Called with the current world's accent, so the effect
   * belongs to the planet you are on rather than being the same white overlay
   * everywhere. Guarded on change because setHex touches the uniform.
   */
  setColor(hex) {
    if (hex == null || hex === this.tint) return;
    this.tint = hex;
    // Lifted toward white: at full saturation a deep accent reads as coloured
    // debris rather than as light, and these are supposed to be light.
    this.material.color.setHex(hex).lerp(WHITE, 0.45);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
