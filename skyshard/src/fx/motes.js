// Motes: the reward currency you can feel. Kills release an Aster/soul mote
// that streaks to the player (kill-confirm); breakables sometimes release
// health motes. Souls use a large constellation-seed silhouette, a broken
// orbit, and two braided corkscrew trails so they cannot read as hostile shots.
// Everything remains fixed-size and instanced: five draw calls, no hot-path
// geometry/material creation, and one shared object pool.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { G } from '../state.js';
import { Pool } from '../core/pool.js';
import { sfx } from '../core/audio.js';
import { hasSkill } from '../progression/constellation.js';

const TAU = Math.PI * 2;
const TAIL_SEGMENTS = 4;

// Kept as data (and surfaced by describe()) so browser QA can distinguish the
// collectible language from the 0.16-radius spherical hostile bolt language.
export const MOTE_VISUAL_CONTRACT = Object.freeze({
  version: 3,
  hostileBoltRadius: 0.16,
  soul: Object.freeze({
    currency: 'Aster',
    silhouette: 'faceted-star-diamond-constellation-seed',
    coreSize: 0.4,
    hostileScaleRatio: 2.5,
    facetPaletteSize: 8,
    bloomSafe: true,
    brokenOrbit: true,
    braidedTailCount: 2,
    tailSegments: TAIL_SEGMENTS,
    motion: 'corkscrew-homing',
  }),
  health: Object.freeze({
    silhouette: 'green-icosahedron',
    coreSize: 0.2,
    brokenOrbit: false,
    braidedTailCount: 0,
    motion: 'direct-homing',
  }),
});

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _side = new THREE.Vector3();
const _binormal = new THREE.Vector3();
const _segmentDir = new THREE.Vector3();
const _euler = new THREE.Euler();
const ZERO = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const ASTER_FACET_COLORS = [
  0x174e74, 0x2aa5bf, 0x564eb1, 0x9bdae5,
  0x2f709d, 0x774daf, 0x45c5d2, 0xa9cbea,
];

const KIND = {
  soul:   { heal: 0, size: MOTE_VISUAL_CONTRACT.soul.coreSize },
  health: { heal: 1, size: MOTE_VISUAL_CONTRACT.health.coreSize },
};

function instanced(geometry, material, count, name) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = count;
  return mesh;
}

function hideMatrix(mesh, index) {
  _q.identity();
  _m.compose(_p.set(0, -999, 0), _q, ZERO);
  mesh.setMatrixAt(index, _m);
}

function paintAsterFacets(geometry) {
  const faceted = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = faceted.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const palette = ASTER_FACET_COLORS.map((hex) => new THREE.Color(hex));
  for (let vertex = 0; vertex < position.count; vertex += 3) {
    const color = palette[(vertex / 3) % palette.length];
    for (let corner = 0; corner < 3; corner++) color.toArray(colors, (vertex + corner) * 3);
  }
  faceted.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return faceted;
}

export class Motes {
  constructor() {
    const N = CFG.fx.maxMotes;
    const soulMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      fog: false,
    });
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x7868c9,
      transparent: true,
      opacity: 0.78,
      fog: false,
      depthWrite: false,
    });
    const tailAMaterial = new THREE.MeshBasicMaterial({
      color: 0x20a8c8,
      transparent: true,
      opacity: 0.74,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const tailBMaterial = new THREE.MeshBasicMaterial({
      color: 0x7651ba,
      transparent: true,
      opacity: 0.68,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const healthMaterial = new THREE.MeshBasicMaterial({
      color: 0x65ff86,
      transparent: true,
      opacity: 0.95,
      fog: false,
    });

    const coreGeometry = paintAsterFacets(new THREE.OctahedronGeometry(1, 0));
    const orbitGeometry = new THREE.TorusGeometry(1, 0.085, 4, 18, Math.PI * 1.58);
    const tailGeometry = new THREE.ConeGeometry(0.14, 1, 3, 1, true);
    const healthGeometry = new THREE.IcosahedronGeometry(1, 1);

    this.group = new THREE.Group();
    this.group.name = 'aster-and-health-motes';
    this.group.userData.visualContract = MOTE_VISUAL_CONTRACT;

    this.soulCore = instanced(coreGeometry, soulMaterial, N, 'aster-faceted-seeds');
    this.soulOrbit = instanced(orbitGeometry, orbitMaterial, N, 'aster-broken-orbits');
    this.soulTailA = instanced(tailGeometry, tailAMaterial, N * TAIL_SEGMENTS, 'aster-tail-cyan');
    this.soulTailB = instanced(tailGeometry, tailBMaterial, N * TAIL_SEGMENTS, 'aster-tail-violet');
    this.healthMesh = instanced(healthGeometry, healthMaterial, N, 'health-motes');
    this.meshes = [this.soulCore, this.soulOrbit, this.soulTailA, this.soulTailB, this.healthMesh];
    this.group.add(...this.meshes);

    // Compatibility for any debug code that previously inspected motes.mesh.
    this.mesh = this.soulCore;
    this.pool = new Pool((i) => ({
      i,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      t: 0,
      phase: i * 2.399963229728653,
      kind: 'soul',
    }), N);
    this.capacity = N;
    for (let i = 0; i < N; i++) this._hideMote(i);
    this._markMatricesDirty();

    this.streak = 0; // rising chime pitch on quick collections
    this.lastCollect = -9;
  }

  addTo(scene) { scene.add(this.group); }

  moveTo(scene) {
    for (const mote of this.pool.active) this._hideMote(mote.i);
    this.pool.releaseAll();
    this._markMatricesDirty();
    this.group.removeFromParent();
    scene.add(this.group);
  }

  // Death invalidates every reward that has not reached the player yet. Keep
  // this separate from moveTo(): changing scenes should not erase a live
  // collection streak, while death must erase both the flight and its combo.
  discardUnclaimed() {
    for (const mote of this.pool.active) this._hideMote(mote.i);
    this.pool.releaseAll();
    this.streak = 0;
    this.lastCollect = -9;
    this._markMatricesDirty();
  }

  spawn(kind, x, y, z, n = 1) {
    const resolvedKind = KIND[kind] ? kind : 'soul';
    for (let k = 0; k < n; k++) {
      const mote = this.pool.obtain();
      if (!mote) return;
      mote.kind = resolvedKind;
      mote.x = x;
      mote.y = y;
      mote.z = z;
      mote.vx = (Math.random() - 0.5) * 5;
      mote.vy = 3 + Math.random() * 3;
      mote.vz = (Math.random() - 0.5) * 5;
      mote.t = 0;
      mote.phase = Math.random() * TAU;
    }
  }

  // Debug/QA surface: useful from G.motes.describe() without coupling main.js
  // to this renderer or making debug inspection part of the update hot path.
  describe() {
    let soul = 0;
    let health = 0;
    for (const mote of this.pool.active) {
      if (mote.kind === 'health') health++;
      else soul++;
    }
    return {
      capacity: this.capacity,
      active: { total: soul + health, soul, health },
      drawCalls: this.meshes.length,
      visual: MOTE_VISUAL_CONTRACT,
    };
  }

  update(dt, now) {
    const pl = G.player;
    if (!pl) return;
    const px = pl.pos.x;
    const py = pl.pos.y + 1.1;
    const pz = pl.pos.z;

    this.pool.update((mote) => {
      mote.t += dt;
      // Scatter briefly, then home with increasing hunger. Aster/soul motes
      // also orbit the home vector; damaging shots remain straight-line balls.
      const soulDraw = mote.kind === 'soul' && hasSkill('soul-draw');
      const kindVessel = mote.kind === 'health' && hasSkill('kind-vessel');
      const delay = soulDraw ? 0.08 : kindVessel ? 0.14 : 0.25;
      const hunger = soulDraw ? 68 : kindVessel ? 58 : 46;
      const ceiling = soulDraw ? 44 : kindVessel ? 38 : 28;
      const pull = Math.min(ceiling, Math.max(0, (mote.t - delay) * hunger));
      const dx = px - mote.x;
      const dy = py - mote.y;
      const dz = pz - mote.z;
      const distance = Math.hypot(dx, dy, dz) || 1;
      mote.vx += (dx / distance) * pull * dt;
      mote.vy += (dy / distance) * pull * dt;
      mote.vz += (dz / distance) * pull * dt;

      if (mote.kind === 'soul' && pull > 0) {
        const horizontal = Math.hypot(dx, dz) || 1;
        const orbitPhase = mote.t * 12 + mote.phase;
        const orbitPull = Math.min(7, pull * 0.16);
        const weave = Math.cos(orbitPhase) * orbitPull;
        mote.vx += (-dz / horizontal) * weave * dt;
        mote.vy += Math.sin(orbitPhase) * orbitPull * 0.42 * dt;
        mote.vz += (dx / horizontal) * weave * dt;
      }

      const drag = Math.pow(0.92, dt * 60);
      mote.vx *= drag;
      mote.vy *= drag;
      mote.vz *= drag;
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.z += mote.vz * dt;

      if (distance < 1.0 && mote.t > 0.2) {
        const kind = KIND[mote.kind];
        if (kind.heal) {
          pl.heal(kind.heal);
        } else {
          this.streak = (now - this.lastCollect < 0.9) ? this.streak + 1 : 0;
          this.lastCollect = now;
          sfx('mote', { pitch: 1 + Math.min(this.streak, 8) * 0.09 });
          G.onSoulCollected?.({ x: mote.x, y: mote.y, z: mote.z, streak: this.streak });
        }
        G.particles?.burst(mote.kind === 'health' ? 'heal' : 'soul', mote.x, mote.y, mote.z, 5);
        this._hideMote(mote.i);
        return false;
      }

      if (mote.kind === 'health') this._placeHealth(mote);
      else this._placeSoul(mote);
      return true;
    });

    this._markMatricesDirty();
  }

  _placeHealth(mote) {
    this._hideSoul(mote.i);
    const pulse = KIND.health.size * (1 + Math.sin(mote.t * 9 + mote.i) * 0.22);
    _q.setFromEuler(_euler.set(mote.t * 1.7, mote.t * 2.4 + mote.phase, 0));
    _m.compose(_p.set(mote.x, mote.y, mote.z), _q, _s.set(pulse, pulse, pulse));
    this.healthMesh.setMatrixAt(mote.i, _m);
  }

  _placeSoul(mote) {
    hideMatrix(this.healthMesh, mote.i);
    const pulse = 1 + Math.sin(mote.t * 8 + mote.phase) * 0.1;
    const coreSize = KIND.soul.size * pulse;

    // Tall low-poly octahedron: readable as a faceted star/diamond at distance.
    _q.setFromEuler(_euler.set(mote.t * 2.1 + mote.phase, mote.t * 3.7, mote.t * 1.3));
    _m.compose(
      _p.set(mote.x, mote.y, mote.z),
      _q,
      _s.set(coreSize * 0.64, coreSize * 1.18, coreSize * 0.64),
    );
    this.soulCore.setMatrixAt(mote.i, _m);

    // An incomplete low-poly torus reads as an orbit glyph, not a hitbox ball.
    const orbitSize = 0.43 * pulse;
    _q.setFromEuler(_euler.set(mote.t * 1.2, mote.t * 1.9 + mote.phase, Math.PI * 0.28));
    _m.compose(
      _p.set(mote.x, mote.y, mote.z),
      _q,
      _s.set(orbitSize, orbitSize, orbitSize),
    );
    this.soulOrbit.setMatrixAt(mote.i, _m);

    this._placeBraidedTails(mote);
  }

  _placeBraidedTails(mote) {
    const speed = Math.hypot(mote.vx, mote.vy, mote.vz);
    if (speed > 0.01) _dir.set(mote.vx / speed, mote.vy / speed, mote.vz / speed);
    else _dir.set(0, 1, 0);

    _side.crossVectors(_dir, Math.abs(_dir.y) < 0.9 ? UP : RIGHT).normalize();
    _binormal.crossVectors(_dir, _side).normalize();
    const tailLength = Math.min(1.55, 0.82 + speed * 0.03);
    const segmentLength = tailLength / TAIL_SEGMENTS * 1.14;

    for (let segment = 0; segment < TAIL_SEGMENTS; segment++) {
      const progress = (segment + 0.55) / TAIL_SEGMENTS;
      const helixPhase = mote.t * 15 + mote.phase - progress * TAU * 0.82;
      const radius = 0.16 * (1 - progress * 0.42);
      const taper = 1 - progress * 0.58;
      const index = mote.i * TAIL_SEGMENTS + segment;
      this._placeTailSegment(mote, index, helixPhase, progress, radius, taper, segmentLength, this.soulTailA);
      this._placeTailSegment(mote, index, helixPhase + Math.PI, progress, radius, taper, segmentLength, this.soulTailB);
    }
  }

  _placeTailSegment(mote, index, phase, progress, radius, taper, segmentLength, mesh) {
    const cos = Math.cos(phase);
    const sin = Math.sin(phase);
    _p.set(
      mote.x - _dir.x * progress * segmentLength * TAIL_SEGMENTS + _side.x * cos * radius + _binormal.x * sin * radius,
      mote.y - _dir.y * progress * segmentLength * TAIL_SEGMENTS + _side.y * cos * radius + _binormal.y * sin * radius,
      mote.z - _dir.z * progress * segmentLength * TAIL_SEGMENTS + _side.z * cos * radius + _binormal.z * sin * radius,
    );

    // Tangent to the helix. The two opposite phases create a literal braid.
    _segmentDir.set(
      -_dir.x + (_side.x * sin - _binormal.x * cos) * 0.32,
      -_dir.y + (_side.y * sin - _binormal.y * cos) * 0.32,
      -_dir.z + (_side.z * sin - _binormal.z * cos) * 0.32,
    ).normalize();
    _q.setFromUnitVectors(UP, _segmentDir);
    _m.compose(_p, _q, _s.set(taper, segmentLength, taper));
    mesh.setMatrixAt(index, _m);
  }

  _hideSoul(index) {
    hideMatrix(this.soulCore, index);
    hideMatrix(this.soulOrbit, index);
    for (let segment = 0; segment < TAIL_SEGMENTS; segment++) {
      const tailIndex = index * TAIL_SEGMENTS + segment;
      hideMatrix(this.soulTailA, tailIndex);
      hideMatrix(this.soulTailB, tailIndex);
    }
  }

  _hideMote(index) {
    this._hideSoul(index);
    hideMatrix(this.healthMesh, index);
  }

  _markMatricesDirty() {
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
}
