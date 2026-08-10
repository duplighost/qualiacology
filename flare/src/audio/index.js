// THE AUDIO RIG — one graph, one pool, one listener.
//
// W3-AUDIO's manifest entry. `create(ctx)` builds the whole rig at boot and then
// never constructs another AudioNode for the life of the process; `update()`
// re-pins the listener to the camera INCLUDING ROLL, drives the mood filter from
// the light field, runs the stem deck and ticks EARSHOT.
//
// Two rules this file exists to enforce:
//
//   THE LISTENER IS THE CAMERA, ROLL AND ALL. The up vector is read from
//   matrixWorld's column 1, not assumed to be +Y. Camera roll is a real signal
//   in this game (the bob carries 0.95 deg with a 0.35 rad phase lead) and a
//   soundfield that ignores it quietly detaches the mix from the body.
//
//   NOTHING IS LEFT UNPANNED. In the dark an unpanned explosion is a lie about
//   where the room is. `playAt` is the world path; `playFlat` — the cheap
//   StereoPanner — is allowlisted to the player's own weapon and UI only, and
//   tests/audio.mjs greps for every other caller.

import { FEEL } from '../feel.js';
import { clamp01 } from '../core/math.js';
import { NodeFactory, createBus } from './bus.js';
import { createVoicePool } from './voices.js';
import { createGunSynth } from './gunsynth.js';
import { createEarshot, multiplyVP } from './earshot.js';
import { createScore, Score } from './score.js';

const A = FEEL.audio;

export const RIG = Object.freeze({
  pressureRange: 6,        // inside this, ITD dominates and HRTF buys nothing
  identityFar: 14,         // the wide identity stem's reference distance
  crowdAbove: 8,           // past this, far stems collapse to one centroid voice
  identityLevel: 0.5,
  identityFloor: 0.18,
  bossFloor: 0.5,          // a boss is never untrackable on the sound stage
  bossScale: 0.82,
  pressureLevel: 0.35,
  crowdLevel: 0.22,
  stemTau: 0.25,
  pressureTau: 0.18,
  crowdTau: 0.50,
  maxTracked: 64,
});

// Module-scope scratch. CONTRACT §4 — the hot path allocates nothing.
const VP = new Float64Array(16);
const ORDER = new Int32Array(RIG.maxTracked);
const DIST = new Float64Array(RIG.maxTracked);

const IDENTITY_SLOTS = A.voices.identity;

export class Rig {
  constructor(actx, rng) {
    this.actx = actx;
    this.nodes = new NodeFactory(actx);
    this.bus = createBus(actx, this.nodes);
    this.pool = createVoicePool(actx, this.nodes, this.bus, rng);
    this.gun = createGunSynth(this.pool, this.bus, rng);
    this.earshot = createEarshot(this.pool, this.bus);
    this.score = createScore(actx, this.nodes, this.bus);

    this.pool.startAll(0);
    this.score.start(0);
    this.initialNodeCount = this.nodes.seal();

    this.hostiles = [];
    this.hostileProviderIsDefault = true;
    this.errors = [];

    this.listener = { x: 0, y: 0, z: 0, fx: 0, fz: -1 };
    this.vp = VP;
    this._throttle = new Map();
    this._identityOwner = new Int32Array(IDENTITY_SLOTS).fill(-1);
    this._pressureOwner = new Int32Array(this.pool.count('pressure')).fill(-1);
    this._crowdActive = false;
    this.time = 0;
  }

  get now() { return this.actx.currentTime; }
  get nodeCount() { return this.nodes.count; }
  get violations() { return this.nodes.violations; }

  /** The enemies system owns the truth about what is alive. No silent default. */
  setHostiles(list) {
    this.hostiles = list || [];
    this.hostileProviderIsDefault = false;
  }

  /**
   * Pin the listener to the camera's world matrix, including roll (column 1).
   * `e` is a three.js Matrix4 elements array; three's camera looks down -Z, so
   * forward is the negated column 2.
   */
  pinListener(e) {
    const L = this.actx.listener;
    const px = e[12], py = e[13], pz = e[14];
    const fx = -e[8], fy = -e[9], fz = -e[10];
    const ux = e[4], uy = e[5], uz = e[6];

    if (L.positionX) {
      L.positionX.value = px; L.positionY.value = py; L.positionZ.value = pz;
      L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz;
      L.upX.value = ux; L.upY.value = uy; L.upZ.value = uz;
    } else {
      L.setPosition(px, py, pz);
      L.setOrientation(fx, fy, fz, ux, uy, uz);
    }

    this.listener.x = px; this.listener.y = py; this.listener.z = pz;
    const flat = Math.hypot(fx, fz) || 1e-6;
    this.listener.fx = fx / flat;
    this.listener.fz = fz / flat;
  }

  /** vp = projection * viewInverse. EARSHOT and the renderer read the same one. */
  setViewProjection(proj, viewInverse) { multiplyVP(this.vp, proj, viewInverse); }

  /** Slow-motion spaces hits out instead of machine-gunning them. */
  throttled(kind, timeScale) {
    const gap = (A.throttle[kind] || 0) / (timeScale > 0 ? timeScale : 1);
    const last = this._throttle.get(kind) || -1;
    if (this.time - last < gap) return true;
    this._throttle.set(kind, this.time);
    return false;
  }

  /**
   * The stem deck. Six HRTF identity voices go to the six nearest live enemies;
   * anything past that, once more than eight are alive, collapses into one
   * equalpower crowd voice at the group centroid — a crowd reads as a crowd, and
   * spending an HRTF convolution on "one of nine" buys nothing.
   */
  updateStems(when) {
    const h = this.hostiles;
    const n = Math.min(h.length, ORDER.length);
    let live = 0;
    for (let i = 0; i < n; i++) {
      const e = h[i];
      if (!e || e.dead) continue;
      const dx = e.x - this.listener.x, dy = e.y - this.listener.y, dz = e.z - this.listener.z;
      DIST[live] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      ORDER[live] = i;
      live++;
    }
    // Insertion sort: bounded by the hard alive cap of 14, and stable, so a
    // voice does not hop between two enemies at equal range and chatter.
    for (let i = 1; i < live; i++) {
      const d = DIST[i], o = ORDER[i];
      let j = i - 1;
      while (j >= 0 && DIST[j] > d) { DIST[j + 1] = DIST[j]; ORDER[j + 1] = ORDER[j]; j--; }
      DIST[j + 1] = d; ORDER[j + 1] = o;
    }

    const idPool = this.pool.pools.get('identity');
    const prPool = this.pool.pools.get('pressure');

    for (let s = 0; s < idPool.length; s++) {
      const v = idPool[s];
      if (s < live) {
        const e = h[ORDER[s]];
        const dist = DIST[s];
        const table = FEEL.enemies[e.type] || FEEL.enemies.husk;
        v.setPosition(e.x, e.y, e.z);
        v.setRate(table.voice);
        v.setFilter(A.sfxLowpassHz);
        const floor = e.boss ? RIG.bossFloor : RIG.identityFloor;
        const level = clamp01(1 - dist / RIG.identityFar) * (e.boss ? 1 : RIG.bossScale) + floor;
        this.pool.hold(v, clamp01(level) * RIG.identityLevel, when, RIG.stemTau);
        this._identityOwner[s] = e.id;
      } else if (this._identityOwner[s] !== -1) {
        this.pool.release(v, when, RIG.stemTau);
        this._identityOwner[s] = -1;
      }
    }

    for (let s = 0; s < prPool.length; s++) {
      const v = prPool[s];
      const has = s < live && DIST[s] < RIG.pressureRange;
      if (has) {
        const e = h[ORDER[s]];
        const table = FEEL.enemies[e.type] || FEEL.enemies.husk;
        v.setPan(this._panOf(e.x, e.z));
        v.setRate(table.voice);
        v.setFilter(A.sfxLowpassHz);
        this.pool.hold(v, clamp01(1 - DIST[s] / RIG.pressureRange) * RIG.pressureLevel, when, RIG.pressureTau);
        this._pressureOwner[s] = e.id;
      } else if (this._pressureOwner[s] !== -1) {
        this.pool.release(v, when, RIG.pressureTau);
        this._pressureOwner[s] = -1;
      }
    }

    const crowd = this.pool.pools.get('crowd')[0];
    if (live > RIG.crowdAbove) {
      let cx = 0, cz = 0, k = 0;
      for (let s = IDENTITY_SLOTS; s < live; s++) { const e = h[ORDER[s]]; cx += e.x; cz += e.z; k++; }
      if (k > 0) {
        crowd.setPan(this._panOf(cx / k, cz / k));
        crowd.setFilter(A.sfxLowpassHz);
        this.pool.hold(crowd, clamp01(k / RIG.crowdAbove) * RIG.crowdLevel, when, RIG.crowdTau);
        this._crowdActive = true;
      }
    } else if (this._crowdActive) {
      this.pool.release(crowd, when, RIG.crowdTau);
      this._crowdActive = false;
    }
  }

  /** Lateral position relative to the listener's forward, as a stereo pan. */
  _panOf(x, z) {
    const dx = x - this.listener.x, dz = z - this.listener.z;
    const len = Math.hypot(dx, dz) || 1e-6;
    // right = forward rotated -90 deg in the XZ plane
    const rx = -this.listener.fz, rz = this.listener.fx;
    return clamp01((rx * dx + rz * dz) / len * 0.5 + 0.5) * 2 - 1;
  }

  /**
   * Everything that must happen once per presented frame. `tension` and
   * `combat` are left UNSET when undefined rather than defaulted to a number —
   * a silent default here would look identical to a wired director and would
   * defeat assertWired() (C2-F8).
   */
  update(rdt, timeScale, camera, litFraction, tension, combat) {
    this.time += rdt;
    const when = this.now;

    if (camera) {
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      this.pinListener(camera.matrixWorld.elements);
      this.setViewProjection(camera.projectionMatrix.elements, camera.matrixWorldInverse.elements);
    }

    this.score.setLit(litFraction);
    if (tension !== undefined) this.score.setTension(tension);
    if (combat !== undefined) this.score.setCombat(combat);
    this.score.setTimeScale(timeScale);
    this.score.update(when);

    this.updateStems(when);

    this.earshot.update(rdt, this.hostiles, this.vp,
      this.listener.x, this.listener.y, this.listener.z,
      this.listener.fx, this.listener.fz, when);

    this.pool.sweep(when);
  }

  /**
   * The no-silent-default gate (C2-F8). Standalone development keeps working;
   * the shipping page refuses to reach chamber-ready with a default still in
   * place, and names the one that is missing.
   */
  assertWired() {
    this.errors.length = 0;
    if (this.hostileProviderIsDefault) this.errors.push('audio: setHostiles() never called — EARSHOT has nothing to speak for');
    if (this.score.combatProviderIsDefault) this.errors.push('audio: score.setCombat() never called — the score cannot follow the fight');
    if (this.score.tensionProviderIsDefault) this.errors.push('audio: score.setTension() never called — the bed, the sub and the heart rate are all frozen at zero');
    return this.errors;
  }

  verify() {
    const hrtf = this.nodes.byKind.get('hrtf') || 0;
    return {
      ok: this.nodes.violations.length === 0 && hrtf === A.voices.earshot + A.voices.identity + A.voices.transient,
      nodeCount: this.nodes.count,
      initialNodeCount: this.initialNodeCount,
      hrtfPanners: hrtf,
      stereoPanners: this.nodes.byKind.get('stereo') || 0,
      violations: this.nodes.violations.length,
      state: this.actx.state,
      sampleRate: this.actx.sampleRate,
      sfxLowpassHz: this.bus.sfxLpA.frequency.value,
      moodHz: this.bus.mood.frequency.value,
      earshotTicks: this.earshot.ticks,
      shots: this.gun.shots,
      liveVoices: this.pool.liveCount(this.now),
      errors: this.errors.slice(),
    };
  }

  dispose() {
    this.pool.dispose();
    this.bus.dispose();
  }
}

export function createRig(actx, rng) { return new Rig(actx, rng); }

/**
 * THE MANIFEST ENTRY. Constructed once, in SYSTEMS order, by src/main.js.
 */
export async function create(ctx) {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) {
    ctx.audioError = 'Web Audio is not available in this browser.';
    return { update() {}, dispose() {}, verify: () => ({ ok: false, reason: ctx.audioError }) };
  }

  const actx = ctx.audioContext || new AC({ latencyHint: 'interactive' });
  const rig = createRig(actx, ctx.rng.fork('audio'));
  ctx.audio = rig;

  // The context starts suspended until a gesture. The start screen's Begin
  // button is that gesture; the pointer/key fallbacks cover a resumed tab.
  const resume = () => { if (actx.state === 'suspended') actx.resume().catch(() => {}); };
  if (ctx.ui && ctx.ui.begin) ctx.ui.begin.addEventListener('click', resume);
  addEventListener('pointerdown', resume, { passive: true });
  addEventListener('keydown', resume, { passive: true });

  return {
    rig,
    update(rdt, time) {
      const scale = time && typeof time.scale === 'number' && time.scale > 0 ? time.scale : 1;
      const lit = ctx.light ? Score.litFractionOf(ctx.light.total) : 0;
      // tension and combat stay UNSET here on purpose: the tension bus and the
      // director own them, and passing a number would forge their wiring.
      rig.update(rdt, scale, ctx.camera, lit, undefined, undefined);
    },
    /** The director/enemies wiring gate — call at chamber-ready (C2-F8). */
    assertWired() { return rig.assertWired(); },
    dispose() {
      removeEventListener('pointerdown', resume);
      removeEventListener('keydown', resume);
      rig.dispose();
      if (!ctx.audioContext) actx.close().catch(() => {});
    },
    /** CONTRACT §2 — an observable fact about the shipping page, not an opinion. */
    verify() { return rig.verify(); },
  };
}

export default create;
