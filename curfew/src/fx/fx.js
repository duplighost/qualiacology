// fx — pooled particles, tracers, decals, trauma and hitstop. Manifest #14.
//
// Lifted wholesale from vigil/src/fx/fx.js:14-168 (ring-buffer particles, instanced
// tracers with a screen-space minimum width, pooled decals, the impact() door). Two
// deliberate changes for CURFEW:
//
// 1. VIGIL kept its own pool of five PointLights. CURFEW has a census: every dynamic light
//    in the county comes from gfx/lights.js's 8-rover pool, so flash() BORROWS. fx owns no
//    lights at all.
// 2. Hitstop scales ctx.time.scale and NOTHING ELSE. CINDERBLOOM had two owners of that
//    scalar and melee hitstop silently could not use it. fx is the only writer.
//
// 3. PARTICLES AND TRACERS KEEP prev/curr AND ARE INTERPOLATED IN present(alpha). The
//    CONTRACT's loop law applies to the one effect the player sees on every single shot: a
//    tracer covers 340 m/s in a 55 ms life, so integrated only on the 60 Hz step it holds
//    THREE identical positions on a 144 Hz display — the CINDERBLOOM teleport in miniature.
//    step() therefore advances the simulation into pCur / t.dist and writes NOTHING the GPU
//    reads; present() lerps prev -> curr by alpha into the bound position buffer and the
//    tracer instance matrices, and is the only writer of either. Decals are exempt on
//    purpose: they are placed once and only fade, so they never move and have no prev.
//
// impact() is the ONLY door into hit feedback (FLARE's law): particles, light, decal and
// hitstop all route through it, so a hit can never half-happen.
//
// The hot path allocates nothing: every buffer, state object and scratch vector below is
// created once, at init.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { TAU, clamp, clamp01 } from '../engine/math.js';
// ROUND 18: snow falls where the frost lies, so it reads the same field the ground does.
// terrain.js imports config and math only, so there is no cycle.
import { frostAt } from '../world/terrain.js';

const MAX_PARTICLES = 1400;

/* ------------------------------------------------------------------ *
 * ROUND 18 — FALLING SNOW, WHERE THE FROST LIES.
 *
 * Alex, docs/ALEX-BRIEF.md section 10: "frost or snow on ground in areas. could even be FALLING
 * in some areas." The ground half shipped in this round as terrain.frostAt(); this is the air
 * half, and it is keyed on the same field, so snow falls exactly where snow is lying. You drive
 * into a frosted area and it starts; you drive out and it stops. Nothing to author and nothing
 * to keep in sync.
 *
 * IT COSTS NO PROGRAM AND NO DRAW. fx already owns one pooled Points buffer for impact sparks
 * (MAX_PARTICLES, one draw, one material), and snow is just particles in it. At the rate below,
 * with a 5.2 s life, the steady-state population is about 150 of 1400 - a tenth of the ring -
 * so a shotgun into a pack still has its budget. That is the whole reason this lives in fx and
 * not in a weather system of its own: a new system would be a new material would be a new
 * shader program, against a budget with three to spare.
 *
 * The flakes fall SLOWLY and drift. grav 0.55 with drag 0.86 terminal-velocities them in about
 * a second; the drift is a shared wind plus per-flake jitter so they do not fall as a sheet.
 */
const SNOW_START = 0.34;      // frostAt below this and nothing falls at all
const SNOW_RATE = 34;         // flakes/second at full frost
const SNOW_R = 15;            // spawned in a disc this wide around the eye
const SNOW_TOP = 7.5;         // and this far above it, so they enter frame from the top
const SNOW_LIFE = 5.2;
const SNOW_SIZE = 0.052;
const SNOW_FALL = -1.35;      // m/s at birth; drag and gravity settle it
const SNOW_WIND = 0.85;       // m/s of shared drift, so a fall has a direction
const SNOW_COL = Object.freeze({ r: 0.60, g: 0.65, b: 0.74 });   // cold, and under the sky

/* ROUND 21 — RAIN, in the same pool, on the same program.
 *
 * Rain is not snow with different numbers, and the reason is in the last two constants. A
 * round additive dot falling at 10 m/s is a SPARK; the eye reads falling water as a line, and
 * a line is what RAIN_ANISO makes by squeezing the point sprite's x in the fragment shader.
 * The rest follows from that: it is dim (additive over a black county goes bright fast), it
 * is short-lived, and its drag is nearly nothing so it never floats.
 *
 * The budget: 240/s at a 1.15 s life is about 275 of the 1400-slot ring at a full downpour,
 * on top of snow's 150. A shotgun into a pack still has two thirds of the ring.
 */
const RAIN_RATE = 420;        // drops/second at full rain
const RAIN_R = 12;            // spawned in a disc this wide around the eye — tighter than
                              // snow, because a drop crosses it in a fraction of the time
const RAIN_TOP = 9.0;
const RAIN_LIFE = 1.15;
// MEASURED, not guessed. The first pass was 0.085 m at alpha 0.34 and aniso 7, and the frame
// (tests/shots/weather-r21b) had 305 live drops in it that you had to hunt for: at 5 m that
// sprite is 12 px tall and the 7x squeeze left the visible streak 1.7 px wide, which is the
// sub-pixel additive line CINDERBLOOM's tracers already taught this project vanishes. Bigger,
// brighter, and a little less squeezed.
// The second pass came back as fat capsules — readable, but reading as falling SEEDS, because
// a 5x squeeze on a 12 px sprite is a lozenge and not a line. The sprite has to be LONG and the
// squeeze STRONG: at 8 m these are about 19 px tall and under 2 px wide, which is a rain streak.
const RAIN_SIZE = 0.22;
const RAIN_FALL = -9.5;       // m/s at birth, and it barely slows
const RAIN_ALPHA = 0.50;
const RAIN_ANISO = 8.0;       // the streak: 8x taller than it is wide
const RAIN_COL = Object.freeze({ r: 0.56, g: 0.64, b: 0.78 });
// ROUND 19: the is-there-sky-over-me ray. Module scope; _snow allocates nothing.
const _snowO = { x: 0, y: 0, z: 0 };
const _snowUp = Object.freeze({ x: 0, y: 1, z: 0 });
const MAX_TRACERS = 24;
const MAX_DECALS = 64;

// Trauma decays to zero in ~1/TRAUMA_DECAY seconds; shake is trauma squared so a small
// hit is a tap and a big one is a wallop [cinderbloom COMBAT_FEEL].
const TRAUMA_DECAY = 1.6;

/* ------------------------------------------------------------------ *
 * ROUND 22 lane F — EYESHINE IN THE TREELINE.
 *
 * Alex, 2026-09-10: "Eyeshine in the treeline. Pairs of reflected points when your beams
 * sweep. Deeper in, more pairs. Some at the wrong height."
 *
 * A pair is two additive points on the rim of a resident trunk, facing the beam that found
 * it, at the height of something on all fours — or, some of the time, at a height nothing
 * in the county should have. They exist only where a beam (the torch or the car's lamp) is
 * pointing, fade up as the beam settles on them and out when it sweeps off, and they are
 * NEVER seen up close: walk within EYE_NEAR and the pair is gone, stare at one straight for
 * EYE_LOOK_S and it looks away. Nothing is ever there. The count climbs with depth from
 * the county's centre, so the woods at the rim are full of them.
 *
 * IT COSTS NO PROGRAM AND ONE DRAW: a second THREE.Points on the SAME ShaderMaterial
 * instance as the particle ring (pMat below) — same program, its own small buffer, so a
 * pair can live 20 s without the ring's cursor wrapping over it. The bodies' night-value
 * law holds by construction: there is no body, only the glint.
 *
 * The hot path allocates nothing: a fixed array of EYE_PAIRS states built at init, two
 * module-level beam records, present() writes 48 alphas into a Float32Array.
 */
const EYE = (CFG.fx && CFG.fx.eyeshine) || {};
const EYE_PAIRS = EYE.pairs || 24;
const EYE_RANGE = EYE.range || [20, 60];
const EYE_H = EYE.h || [0.6, 1.1];
const EYE_H_WRONG = EYE.hWrong || [2.5, 3.5];
const EYE_WRONG_BASE = typeof EYE.wrongBase === 'number' ? EYE.wrongBase : 0.10;
const EYE_WRONG_DEPTH = typeof EYE.wrongDepth === 'number' ? EYE.wrongDepth : 0.35;
const EYE_NEAR = EYE.near || 12;
const EYE_LOOK_S = EYE.lookS || 1.5;
const EYE_DEPTH_FROM = EYE.depthFrom || 500;
// world/placedata.js MINOR_THINNING.fromR: where the county's minors start to thin, which is
// the rim the count climbs toward. Inlined rather than imported: placedata pulls staged.js
// and everything it dresses with, and this file must stay a leaf.
const EYE_DEPTH_TO = 1750;
const EYE_MIN_PAIRS = 6;          // the cap at the centre; EYE_PAIRS at the rim
const EYE_SPAWN_S = 0.25;         // one placement attempt per this many seconds
const EYE_TRIES = 4;              // trunk probes per attempt (nearestTagged is cheap)
// MEASURED from the driver's seat (tests/shots/round22-F-eyes.png): at 0.11 m apart the two
// points merged into one glint by 40 m. 0.28 m is about 8 px apart at 25 m and still one
// point past 60 m, which is how a pair reads at a distance anyway.
const EYE_SEP = 0.28;             // m between the two eyes
const EYE_SIZE = 0.16;            // m, the sprite's world diameter: 4 px at 25 m, 2 at 60
const EYE_ALPHA = 0.60;           // colour * alpha stays under post.js's 1.05 bloom threshold
const EYE_COL = [1.4, 1.6, 1.25]; // a green-white, the way a dog's eyes throw a lamp back
const EYE_LOOK_COS = Math.cos(0.09);
const EYE_AGE_MAX = 20;           // s; then it was never there
const EYE_LIT_FADE = 0.6;         // s to fade up in a beam, and out of one
const EYE_UNLIT_S = 3;            // s out of every beam before the pair is dropped
const EYE_TRUNK_R = 4;            // m: how far off the probe point a trunk may stand
const EYE_SPACING = 6;            // m: no two pairs closer than this
const EYE_BEAM_REACH = 70;        // m: past this no beam lights a pair
const TRUNK_TAGS = Object.freeze(['tree', 'trunk']);
// The two beams, read on the step. Reused records; `cos` is the cone's half-angle cosine.
const _beamTorch = { on: false, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1, cos: 0.7 };
const _beamCar = { on: false, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1, cos: 0.8 };
const _beams = [_beamTorch, _beamCar];
const _fwd = new THREE.Vector3();

// Module-level scratch.
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _zAxis = new THREE.Vector3(0, 0, 1);

const COLORS = {
  rock: new THREE.Color(0.55, 0.50, 0.42),
  dust: new THREE.Color(0.32, 0.33, 0.38),
  wood: new THREE.Color(0.42, 0.30, 0.18),
  metal: new THREE.Color(1.00, 0.75, 0.35),
  flesh: new THREE.Color(0.62, 0.16, 0.16),
  deflect: new THREE.Color(0.55, 0.62, 0.75),
};

export class Fx {
  static id = 'fx';

  constructor(ctx) {
    this.ctx = ctx;
    this.trauma = 0;
    this._freeze = 0;
    this.points = null;
    this.tracers = null;
    this.decals = null;
  }

  async init() {
    const scene = this.ctx.scene;
    if (!scene) throw new Error('fx: ctx.scene missing (gfx must be manifest #1)');
    this.scene = scene;
    this.rng = this.ctx.rng.fork('fx');

    /* ---------------- particles: one Points, CPU-integrated ring -------------- */
    // THREE buffers per interpolated quantity, with three different jobs:
    //   pPos / pAttr   — what the GPU reads. Written ONLY by present(), never by step().
    //   pCur / pAttrC  — the simulation's truth at the end of the last fixed step.
    //   pPrv / pAttrP  — the same, one step earlier.
    // Interpolating in place would feed a fractional position back into the next step and
    // the debris would drift, so the render buffer is its own array.
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCur = new Float32Array(MAX_PARTICLES * 3);
    this.pPrv = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    // ROUND 21: size, alpha, ANISO. The third float stretches the sprite vertically in the
    // fragment shader, and it is the whole difference between rain and glitter: a round
    // additive dot falling fast reads as a spark, and rain at night is a LINE. It costs one
    // float per particle and no new program — the alternative was a second material, against
    // a 94-program budget with two spare. 1 is round; snow and every spark stay at 1.
    this.pAttr = new Float32Array(MAX_PARTICLES * 3);
    this.pAttrC = new Float32Array(MAX_PARTICLES * 3);
    this.pAttrP = new Float32Array(MAX_PARTICLES * 3);
    this.pVel = new Float32Array(MAX_PARTICLES * 3);
    this.pLife = new Float32Array(MAX_PARTICLES * 2);   // age, life
    this.pDrag = new Float32Array(MAX_PARTICLES);
    this.pGrav = new Float32Array(MAX_PARTICLES);
    this.pSize0 = new Float32Array(MAX_PARTICLES);
    this.pAlpha0 = new Float32Array(MAX_PARTICLES);
    this.pPos.fill(-9999); this.pCur.fill(-9999); this.pPrv.fill(-9999);
    this.pCursor = 0;
    this.pColDirty = true;

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    pGeo.setAttribute('aP', new THREE.BufferAttribute(this.pAttr, 3));
    // never culled: the bounding sphere of a ring buffer is meaningless and recomputing
    // it every frame is the cost we are avoiding by pooling in the first place
    pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.pGeo = pGeo;

    const pMat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: /* glsl */`
        attribute vec3 aP;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vAniso;
        void main() {
          vColor = color;
          vAlpha = aP.y;
          vAniso = aP.z;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // aP.x is an approximate world diameter in metres
          gl_PointSize = clamp(aP.x * 700.0 / max(1.0, -mv.z), 1.5, 90.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vAlpha;
        varying float vAniso;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          // ROUND 21: squeeze the sprite's X by aniso and the same falloff draws a vertical
          // streak instead of a dot, inside the same square point. aniso 1 is the old
          // behaviour exactly, so sparks, blood and snow are untouched.
          p.x *= max(1.0, vAniso);
          float r = length(p) * 2.0;
          float a = (1.0 - smoothstep(0.35, 1.0, r)) * vAlpha;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.points = new THREE.Points(pGeo, pMat);
    this.points.frustumCulled = false;
    this.points.name = 'fx.particles';
    scene.add(this.points);

    /* ---------------- eyeshine (ROUND 22): a second Points on the SAME pMat -------- */
    // The same material INSTANCE, never a clone: a clone is a new program and the county
    // is at its budget. +1 draw, 48 vertices, parked under the world until a beam finds
    // a trunk. Depth-tested like the ring, so a nearer trunk hides a pair behind it.
    const eyeN = EYE_PAIRS * 2;
    this.eyePos = new Float32Array(eyeN * 3);
    this.eyeCol = new Float32Array(eyeN * 3);
    this.eyeAttr = new Float32Array(eyeN * 3);
    this.eyePos.fill(-9999);
    for (let i = 0; i < eyeN; i++) {
      this.eyeCol[i * 3] = EYE_COL[0]; this.eyeCol[i * 3 + 1] = EYE_COL[1]; this.eyeCol[i * 3 + 2] = EYE_COL[2];
      this.eyeAttr[i * 3] = EYE_SIZE; this.eyeAttr[i * 3 + 1] = 0; this.eyeAttr[i * 3 + 2] = 1;
    }
    const eyeGeo = new THREE.BufferGeometry();
    eyeGeo.setAttribute('position', new THREE.BufferAttribute(this.eyePos, 3));
    eyeGeo.setAttribute('color', new THREE.BufferAttribute(this.eyeCol, 3));
    eyeGeo.setAttribute('aP', new THREE.BufferAttribute(this.eyeAttr, 3));
    eyeGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.eyeGeo = eyeGeo;
    this.eyes = new THREE.Points(eyeGeo, pMat);
    this.eyes.frustumCulled = false;
    this.eyes.name = 'fx.eyeshine';
    scene.add(this.eyes);
    this.eyeState = [];
    for (let i = 0; i < EYE_PAIRS; i++) {
      this.eyeState.push({
        live: false, x: 0, y: 0, z: 0, age: 0, lit: 0, unlitT: 0, lookT: 0,
        wrong: false, blinkT: 0, blinkOff: 0, died: 0,
      });
    }
    this._eyeSpawnT = 0;
    this._eyePosDirty = false;
    this._eyeWasLive = false;   // so the alpha upload happens only while a pair is (or just was) on screen
    this._eyeLive = 0;

    /* ---------------- tracers: instanced stretched boxes ---------------------- */
    // Camera-facing ribbons approximated as thin instanced boxes oriented along flight.
    // The screen-space minimum width matters: a sub-pixel additive line vanishes entirely
    // (CINDERBLOOM's receipt), so a shot at range reads as nothing happening.
    const trGeo = new THREE.BoxGeometry(1, 1, 1);
    const trMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.5, 2.6, 1.15),   // >1 on purpose: this is what bloom is for
      transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.tracers = new THREE.InstancedMesh(trGeo, trMat, MAX_TRACERS);
    this.tracers.frustumCulled = false;
    this.tracers.count = MAX_TRACERS;
    this.tracers.name = 'fx.tracers';
    scene.add(this.tracers);
    this.trState = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      this.trState.push({
        // age/dist are curr; page/pdist are the same two one fixed step earlier.
        live: false, age: 0, dist: 0, page: 0, pdist: 0, speed: 340, maxDist: 0,
        origin: new THREE.Vector3(), dir: new THREE.Vector3(),
      });
      _m4.makeScale(0, 0, 0);
      this.tracers.setMatrixAt(i, _m4);
    }
    this.tracers.instanceMatrix.needsUpdate = true;
    this.trCursor = 0;

    /* ---------------- decals: pooled dark scorch discs ------------------------ */
    const dcGeo = new THREE.CircleGeometry(1, 10);
    const dcMat = new THREE.MeshBasicMaterial({
      color: 0x0a0d14, transparent: true, opacity: 0.55, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.decals = new THREE.InstancedMesh(dcGeo, dcMat, MAX_DECALS);
    this.decals.count = MAX_DECALS;
    this.decals.frustumCulled = false;
    this.decals.name = 'fx.decals';
    scene.add(this.decals);
    this.dcState = [];
    for (let i = 0; i < MAX_DECALS; i++) {
      this.dcState.push({ age: 99 });
      _m4.makeScale(0, 0, 0);
      this.decals.setMatrixAt(i, _m4);
    }
    this.decals.instanceMatrix.needsUpdate = true;
    this.dcCursor = 0;
    // A node suite (tests/round9-water-reward.mjs) constructs Fx with no bus; guard, do not throw.
    this._offBroken=this.ctx.bus?this.ctx.bus.on('world:broke',p=>this.clearDecalsNear(p.x,p.y,p.z,1.6)):null;
  }

  /* --------------------------------------------------------------- spawners -- */

  spawnParticle(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 12, drag = 0.9, alpha0 = 1, aniso = 1) {
    const i = this.pCursor;
    const i3 = i * 3, i2 = i * 2;
    this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;
    // prev = curr = render at birth. The ring reuses slots, and a slot whose prev still held
    // the last owner's position would draw one frame of streak from wherever that one died.
    this.pCur[i3] = x; this.pCur[i3 + 1] = y; this.pCur[i3 + 2] = z;
    this.pPrv[i3] = x; this.pPrv[i3 + 1] = y; this.pPrv[i3 + 2] = z;
    this.pPos[i3] = x; this.pPos[i3 + 1] = y; this.pPos[i3 + 2] = z;
    this.pVel[i3] = vx; this.pVel[i3 + 1] = vy; this.pVel[i3 + 2] = vz;
    this.pLife[i2] = 0; this.pLife[i2 + 1] = life;
    this.pCol[i3] = r; this.pCol[i3 + 1] = g; this.pCol[i3 + 2] = b;
    this.pGrav[i] = grav; this.pDrag[i] = drag;
    this.pSize0[i] = size; this.pAlpha0[i] = alpha0;
    // The attribute buffers stride by THREE now, so they share i3 with position. aniso is
    // written once, at birth, and no integrator touches it: it is a shape, not a state.
    this.pAttrC[i3] = size; this.pAttrC[i3 + 1] = alpha0; this.pAttrC[i3 + 2] = aniso;
    this.pAttrP[i3] = size; this.pAttrP[i3 + 1] = alpha0; this.pAttrP[i3 + 2] = aniso;
    this.pAttr[i3] = size; this.pAttr[i3 + 1] = alpha0; this.pAttr[i3 + 2] = aniso;
    this.pColDirty = true;   // colour is written on spawn only, never integrated
  }

  burst(point, normal, count, speed, life, size, color, opts) {
    const spread = opts && opts.spread !== undefined ? opts.spread : 1;
    const grav = opts && opts.grav !== undefined ? opts.grav : 12;
    const drag = opts && opts.drag !== undefined ? opts.drag : 0.9;
    const alpha = opts && opts.alpha !== undefined ? opts.alpha : 1;
    const rng = this.rng;
    for (let i = 0; i < count; i++) {
      const a = rng.next() * TAU;
      const up = rng.next();
      const s = speed * (0.4 + rng.next() * 0.8);
      const vx = (normal.x * (1 - spread * 0.5) + Math.cos(a) * spread * (1 - up * 0.5)) * s;
      const vy = (normal.y + up * spread) * s * 0.8;
      const vz = (normal.z * (1 - spread * 0.5) + Math.sin(a) * spread * (1 - up * 0.5)) * s;
      this.spawnParticle(point.x, point.y, point.z, vx, vy, vz,
        life * (0.6 + rng.next() * 0.8), size * (0.7 + rng.next() * 0.6),
        color.r, color.g, color.b, grav, drag, alpha);
    }
  }

  tracer(origin, dir, maxDist) {
    const t = this.trState[this.trCursor];
    this.trCursor = (this.trCursor + 1) % MAX_TRACERS;
    t.live = true; t.age = 0; t.dist = 1.2;   // hidden for the first 1.2 m: it left the barrel
    t.page = 0; t.pdist = 1.2;                // prev = curr at birth; see spawnParticle
    t.origin.copy(origin); t.dir.copy(dir); t.maxDist = maxDist;
  }

  decal(point, normal, size) {
    const i = this.dcCursor;
    this.dcCursor = (this.dcCursor + 1) % MAX_DECALS;
    this.dcState[i].age = 0;
    this.dcState[i].x=point.x;this.dcState[i].y=point.y;this.dcState[i].z=point.z;
    _q.setFromUnitVectors(_zAxis, normal);
    _p.copy(point).addScaledVector(normal, 0.02);
    _m4.compose(_p, _q, _s.set(size, size, size));
    this.decals.setMatrixAt(i, _m4);
    this.decals.instanceMatrix.needsUpdate = true;
  }

  clearDecalsNear(x,y,z,radius=1.6){
    if(!this.decals)return;
    let changed=false;
    for(let i=0;i<this.dcState.length;i++){
      const d=this.dcState[i];if(d.age>22||Math.hypot(d.x-x,d.y-y,d.z-z)>radius)continue;
      d.age=99;_m4.makeScale(0,0,0);this.decals.setMatrixAt(i,_m4);changed=true;
    }
    if(changed)this.decals.instanceMatrix.needsUpdate=true;
  }

  /**
   * A one-shot light. Borrows a rover from the census — fx owns no lights.
   * The rover pool's distance is fixed by CFG.lights.rovers.distance; a per-flash radius
   * is not part of the borrow() interface in CONTRACT.md.
   */
  flash(x, y, z, colour, intensity, life = 0.06) {
    const lights = this.ctx.systems && this.ctx.systems.get('lights');   // lazy, at use
    if (!lights) return null;
    // ROUND 20: and it lights the AIR as well as the surfaces. gfx/airlight.js's pulse is a
    // single frame's volume — no handle, no lifetime to manage — so a muzzle flash, an
    // impact spark and a claim now put a ball of light in the fog for exactly as long as the
    // rover they already borrow. Scaled off the same intensity, so nothing here needs a
    // second number kept in step with the first.
    const air = this.ctx.airlight;
    if (air) {
      air.pulse(x, y, z, 0.55 + Math.min(2.2, intensity * 0.055), colour,
        Math.min(1, intensity * 0.020));
    }
    return lights.borrow('flash', x, y, z, colour, intensity, life);
  }

  /**
   * The large, one-shot receipt for a found cache, claimed place or weapon reward.
   * It deliberately reuses the existing particle draw and one borrowed rover: no new
   * geometry, material, program or permanent light is born when the player gets paid.
   * Combat bursts throw debris away from an impact; this rises as a symmetric warm crown,
   * so it reads as "taken" even when the fixture itself is below the first-person camera.
   */
  reward(x, y, z, amount = 1) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    const rng = this.rng;
    const weight = clamp(Math.sqrt(Math.max(1, Number(amount) || 1)) / 8, 0, 1);
    const count = 28 + Math.round(weight * 12);
    for (let i = 0; i < count; i++) {
      const a = TAU * (i / count) + (rng.next() - 0.5) * 0.10;
      const band = i % 3;
      const radius = 0.38 + band * 0.24;
      const lift = 3.8 + band * 1.05 + rng.next() * 1.8;
      const speed = 1.7 + band * 0.65 + rng.next() * 0.9;
      // Three close warm values make a solid crown rather than rainbow confetti.
      const hot = i % 5 === 0;
      this.spawnParticle(
        x + Math.cos(a) * radius, y + 0.48 + band * 0.12, z + Math.sin(a) * radius,
        Math.cos(a) * speed, lift, Math.sin(a) * speed,
        0.68 + rng.next() * 0.36, 0.048 + band * 0.012,
        hot ? 1.00 : 0.94, hot ? 0.91 : 0.77, hot ? 0.64 : 0.43,
        5.8, 1.15, 0.98,
      );
    }
    // A brief vertical spine survives a crowded floor and makes the event readable from
    // several metres away. It is still the same pooled Points draw as every impact spark.
    for (let i = 0; i < 8; i++) {
      const a = TAU * (i / 8);
      this.spawnParticle(
        x + Math.cos(a) * 0.18, y + 0.58, z + Math.sin(a) * 0.18,
        Math.cos(a) * 0.25, 6.8 + i * 0.20, Math.sin(a) * 0.25,
        0.78 + i * 0.025, 0.085, 1.0, 0.86, 0.55, 5.2, 1.5, 1,
      );
    }
    this.flash(x, y + 1.0, z, 0xf0d49a, 10 + weight * 6, 0.24);
    this.addTrauma(0.035 + weight * 0.025);
  }

  /* ----------------------------------------------------------------- feel --- */

  /** Camera shake fuel, 0..1. The camera owner reads shake(), fx never moves the camera. */
  addTrauma(v) { this.trauma = Math.min(1, this.trauma + v); }
  shake() { return this.trauma * this.trauma; }

  /**
   * Freeze the simulation for t seconds. THE ONLY WRITER of ctx.time.scale in the game.
   * It is decayed on RAW frame time in present(), never on the scaled step — decaying it
   * with the scaled dt means scale 0 stops the clock that would have ended the freeze and
   * the game hangs forever.
   */
  hitstop(t) { this._freeze = Math.max(this._freeze, t); }

  /* ---------------------------------------------------------------- impact -- */

  impact(kind, point, normal, power = 1) {
    const n = normal || _up;
    switch (kind) {
      case 'rock':
        this.burst(point, n, 6, 5.2 * power, 0.24, 0.05, COLORS.rock, { grav: 14 });
        this.burst(point, n, 4, 1.8 * power, 0.80, 0.42, COLORS.dust, { grav: 2.5, drag: 2.4, spread: 1.4, alpha: 0.15 });
        this.decal(point, n, 0.16);
        break;
      case 'wood':
        this.burst(point, n, 7, 4.6 * power, 0.30, 0.055, COLORS.wood, { grav: 15 });
        this.burst(point, n, 3, 1.4 * power, 0.70, 0.34, COLORS.dust, { grav: 2.0, drag: 2.4, spread: 1.3, alpha: 0.12 });
        this.decal(point, n, 0.13);
        break;
      case 'metal':
        this.burst(point, n, 9, 6.5 * power, 0.18, 0.045, COLORS.metal, { grav: 16 });
        this.flash(point.x, point.y, point.z, 0xffc46a, 14, 0.05);
        this.decal(point, n, 0.11);
        break;
      case 'flesh':
        this.burst(point, n, 12, 3.6 * power, 0.42, 0.075, COLORS.flesh, { grav: 8, spread: 1.2, alpha: 0.9 });
        break;
      case 'deflect':
        this.burst(point, n, 8, 7.0 * power, 0.15, 0.04, COLORS.deflect, { grav: 12 });
        this.flash(point.x, point.y, point.z, 0x9fb4d8, 10, 0.04);
        break;
      default:
        this.burst(point, n, 5, 3.5 * power, 0.26, 0.05, COLORS.dust, { grav: 10, spread: 1.2, alpha: 0.4 });
        break;
    }
  }

  /**
   * One of everything, far below the world, so no shader in this module compiles on the
   * first shot of the game.
   */
  warmup() {
    _p.set(0, -400, 0);
    this.impact('rock', _p, _up); this.impact('wood', _p, _up);
    this.impact('metal', _p, _up); this.impact('flesh', _p, _up);
    this.impact('deflect', _p, _up);
    this.tracer(_p, _up, 1);
  }

  /* ------------------------------------------------------------------ loop -- */

  /**
   * Snow, spawned into the ordinary particle ring. Called from step().
   *
   * The rate IS the frost field's own strength, so this needs no authoring: it falls where the
   * ground is frosted and nowhere else, and driving out of an area stops it. Sampled at the
   * CAMERA once a frame — one fbm call, not one per flake — because the field's lobes are 260 m
   * across and a 15 m spawn disc sits well inside one.
   */
  _precip(dt) {
    const cam = this.ctx && this.ctx.camera;
    if (!cam || !(dt > 0)) return;
    // ROUND 19. ALEX: "Snowing inside castle."
    //
    // It was, everywhere. Flakes are spawned in a 15 m disc SNOW_TOP above the eye and fall,
    // and nothing ever asked whether there was a roof between the two — so it snowed in the
    // keep, in the manor, in the mine and under the filling station canopy. One ray straight
    // up from the camera, retested a few times a second rather than every frame (the answer
    // does not change inside one stride), and a roof stops the weather. The DRIFT is kept:
    // the accumulator is not zeroed here, so walking out from under a roof resumes rather
    // than paying back a debt of flakes in one frame.
    this._skyT = (this._skyT || 0) - dt;
    if (this._skyT <= 0) {
      this._skyT = 0.25;
      const col = this.ctx.systems && this.ctx.systems.get('collision');
      let open = true;
      if (col && col.raycast) {
        _snowO.x = cam.position.x; _snowO.y = cam.position.y + 0.2; _snowO.z = cam.position.z;
        open = !col.raycast(_snowO, _snowUp, SNOW_TOP + 2.0, col.MASK ? col.MASK.SOLID : 1);
      }
      this._underRoof = !open;
    }
    if (this._underRoof) return;

    // ROUND 21: TWO SOURCES OF SNOW, AND RAIN.
    //
    // The frost field is still a PLACE: stand in a cold hollow on a clear night and it is
    // snowing there, exactly as round 18 built it. Weather is a TIME laid over the whole
    // county, and where they overlap the deeper of the two wins rather than the two adding
    // into a whiteout. A warm front over a frost patch really can give you rain and lying
    // snow at once, and it looks like sleet, so that combination is allowed through.
    const place = Math.max(0, (frostAt(cam.position.x, cam.position.z) - SNOW_START) / (1 - SNOW_START));
    const snowK = Math.max(place, this._wxSnow || 0);
    const rainK = this._wxRain || 0;
    if (snowK <= 0 && rainK <= 0) { this._snowAcc = 0; this._rainAcc = 0; return; }

    const rng = this.rng;
    // The gentle wander is still here and is what a still night has; weather's gusts are
    // ADDED to it, so a squall leans the whole sky one way without ever making it uniform.
    this._snowPhase = (this._snowPhase || 0) + dt * 0.37;
    const wx = Math.cos(this._snowPhase) * SNOW_WIND + (this._wxWindX || 0);
    const wz = Math.sin(this._snowPhase * 0.8) * SNOW_WIND + (this._wxWindZ || 0);

    if (snowK > 0) {
      this._snowAcc = (this._snowAcc || 0) + SNOW_RATE * snowK * dt;
      let count = this._snowAcc | 0;
      this._snowAcc -= count;
      if (count > 8) count = 8;               // never let a long frame dump the ring
      for (let i = 0; i < count; i++) {
        const a = rng.next() * TAU;
        const r = Math.sqrt(rng.next()) * SNOW_R;   // sqrt: even across the disc, not clumped
        this.spawnParticle(
          cam.position.x + Math.cos(a) * r,
          cam.position.y + SNOW_TOP * (0.55 + rng.next() * 0.45),
          cam.position.z + Math.sin(a) * r,
          wx + (rng.next() - 0.5) * 0.5,
          SNOW_FALL * (0.7 + rng.next() * 0.6),
          wz + (rng.next() - 0.5) * 0.5,
          SNOW_LIFE * (0.7 + rng.next() * 0.6), SNOW_SIZE * (0.6 + rng.next() * 0.9),
          SNOW_COL.r, SNOW_COL.g, SNOW_COL.b, 0.55, 0.86, 0.85);
      }
    }

    if (rainK > 0) {
      // Rain is the same pool and the same program, and everything that makes it read as
      // rain instead of as falling sparks is in these numbers: it is FAST, it is SHORT-lived,
      // it is dim, and it is STRETCHED. RAIN_ANISO is the streak.
      this._rainAcc = (this._rainAcc || 0) + RAIN_RATE * rainK * dt;
      let count = this._rainAcc | 0;
      this._rainAcc -= count;
      if (count > 22) count = 22;
      for (let i = 0; i < count; i++) {
        const a = rng.next() * TAU;
        const r = Math.sqrt(rng.next()) * RAIN_R;
        this.spawnParticle(
          cam.position.x + Math.cos(a) * r,
          cam.position.y + RAIN_TOP * (0.5 + rng.next() * 0.5),
          cam.position.z + Math.sin(a) * r,
          wx * 0.5 + (rng.next() - 0.5) * 0.4,
          RAIN_FALL * (0.85 + rng.next() * 0.3),
          wz * 0.5 + (rng.next() - 0.5) * 0.4,
          RAIN_LIFE * (0.8 + rng.next() * 0.4), RAIN_SIZE * (0.7 + rng.next() * 0.6),
          RAIN_COL.r, RAIN_COL.g, RAIN_COL.b, 2.0, 0.06,
          RAIN_ALPHA * (0.6 + rng.next() * 0.7), RAIN_ANISO * (0.75 + rng.next() * 0.5));
      }
    }
  }

  /**
   * ROUND 21 — world/weather.js's one door into fx. Stores four numbers; spawns nothing here,
   * because spawning belongs on the fixed step and this may be called from anywhere.
   */
  setWeather(kind, strength, windX, windZ) {
    const s = strength > 0 ? (strength > 1 ? 1 : strength) : 0;
    this._wxSnow = kind === 'snow' ? s : 0;
    // ROUND 22: a storm rains like rain (1.0x, so the ring's ceiling is unchanged); the
    // lightning is weather's and the sky's, not a particle.
    this._wxRain = kind === 'rain' || kind === 'storm' ? s : kind === 'drizzle' ? s * 0.45 : 0;
    this._wxWindX = windX || 0;
    this._wxWindZ = windZ || 0;
  }

  /* ------------------------------------------------------------- eyeshine -- */

  /** The two beams that can find a pair, read lazily from lights and the car. */
  _beamPoses() {
    const sys = this.ctx.systems;
    const t = _beamTorch;
    t.on = false;
    const lights = sys ? sys.get('lights') : null;
    if (lights && lights.torch && lights.torch.intensity > 0) {
      const p = lights.torch.position, tt = lights.torch.target.position;
      const dx = tt.x - p.x, dy = tt.y - p.y, dz = tt.z - p.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 1e-4) {
        t.on = true; t.x = p.x; t.y = p.y; t.z = p.z;
        t.dx = dx / len; t.dy = dy / len; t.dz = dz / len;
        t.cos = Math.cos(lights.torch.angle || CFG.lights.torch.angle);
      }
    }
    const c = _beamCar;
    c.on = false;
    const car = sys ? sys.get('car') : null;
    const b = car && typeof car.beamPose === 'function' ? car.beamPose() : null;
    if (b && b.on > 0) {
      c.on = true; c.x = b.x; c.y = b.y; c.z = b.z; c.dx = b.dx; c.dy = b.dy; c.dz = b.dz;
      c.cos = Math.cos(CFG.lights.headlight.angle);
    }
  }

  /**
   * Age, light and drop the pairs; then, on its own clock, try to place one where a beam
   * meets a trunk. All on the fixed step. present() only writes the alphas.
   */
  _eyeshine(dt) {
    const cam = this.ctx.camera;
    const sys = this.ctx.systems;
    if (!cam || !sys || !(dt > 0)) return;
    this._beamPoses();
    cam.getWorldDirection(_fwd);
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const rng = this.rng;
    const litK = 1 - Math.exp(-dt / EYE_LIT_FADE);

    let live = 0;
    for (let i = 0; i < EYE_PAIRS; i++) {
      const e = this.eyeState[i];
      if (!e.live) continue;
      e.age += dt;
      const dx = e.x - cx, dy = e.y - cy, dz = e.z - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Is a beam on it? Inside either cone and within reach: yes. The glint has no
      // penumbra of its own; the fade below is the eye's memory of it.
      let target = 0;
      for (let b = 0; b < _beams.length; b++) {
        const bm = _beams[b];
        if (!bm.on) continue;
        const bx = e.x - bm.x, by = e.y - bm.y, bz = e.z - bm.z;
        const bd = Math.sqrt(bx * bx + by * by + bz * bz);
        if (bd < 1e-3 || bd > EYE_BEAM_REACH) continue;
        if ((bx * bm.dx + by * bm.dy + bz * bm.dz) / bd > bm.cos) { target = 1; break; }
      }
      e.lit += (target - e.lit) * litK;
      e.unlitT = target > 0 ? 0 : e.unlitT + dt;
      // Stared at straight: it looks away. Glancing across it costs nothing.
      const look = d > 1e-3 && (dx * _fwd.x + dy * _fwd.y + dz * _fwd.z) / d > EYE_LOOK_COS;
      e.lookT = look ? e.lookT + dt : Math.max(0, e.lookT - dt * 2);
      // A blink now and then: both points out for a tenth of a second. It is the one thing
      // that says these are eyes and not two bits of reflector.
      e.blinkT -= dt;
      if (e.blinkT <= 0) { e.blinkOff = 0.12; e.blinkT = 2.5 + rng.next() * 4; }
      if (e.blinkOff > 0) e.blinkOff -= dt;
      // Why a pair goes is kept as a small number, so a tool can say which rule fired:
      // 1 approached, 2 aged out, 3 stared at, 4 left in the dark.
      const why = d < EYE_NEAR ? 1 : e.age > EYE_AGE_MAX ? 2 : e.lookT > EYE_LOOK_S ? 3 : e.unlitT > EYE_UNLIT_S ? 4 : 0;
      if (why) {
        e.live = false;
        e.died = why;
        this._eyePosDirty = true;
        continue;
      }
      live++;
    }
    this._eyeLive = live;

    this._eyeSpawnT -= dt;
    if (this._eyeSpawnT > 0) return;
    this._eyeSpawnT = EYE_SPAWN_S;
    if ((!_beamTorch.on && !_beamCar.on) || this._underRoof) return;
    // Deeper in, more pairs: the cap climbs from the centre to the rim.
    const depthK = clamp01((Math.sqrt(cx * cx + cz * cz) - EYE_DEPTH_FROM) / (EYE_DEPTH_TO - EYE_DEPTH_FROM));
    const cap = Math.round(EYE_MIN_PAIRS + (EYE_PAIRS - EYE_MIN_PAIRS) * depthK);
    if (live >= cap) return;
    const col = sys.get('collision'), terrain = sys.get('terrain');
    if (!col || typeof col.nearestTagged !== 'function' || !terrain || typeof terrain.heightAt !== 'function') return;

    for (let t = 0; t < EYE_TRIES; t++) {
      const bm = _beamCar.on && (!_beamTorch.on || rng.next() < 0.5) ? _beamCar : _beamTorch;
      const dist = EYE_RANGE[0] + rng.next() * (EYE_RANGE[1] - EYE_RANGE[0]);
      // Somewhere inside the cone, in the ground plane: rotate the beam's heading by up to
      // 80% of its half-angle and walk out `dist`.
      const a = (rng.next() - 0.5) * 2 * Math.acos(clamp(bm.cos, -1, 1)) * 0.8;
      const bl = Math.sqrt(bm.dx * bm.dx + bm.dz * bm.dz) || 1;
      const ux = bm.dx / bl, uz = bm.dz / bl;
      const ca = Math.cos(a), sa = Math.sin(a);
      const px = bm.x + (ux * ca - uz * sa) * dist, pz = bm.z + (ux * sa + uz * ca) * dist;
      const hit = col.nearestTagged(px, pz, EYE_TRUNK_R, TRUNK_TAGS);
      if (!hit) continue;
      const tx = hit.x, tz = hit.z, tr = hit.radius;   // SHARED scratch: copied out at once
      if (Math.hypot(tx - cx, tz - cz) < EYE_NEAR + 4) continue;
      let crowded = false;
      for (let i = 0; i < EYE_PAIRS; i++) {
        const e = this.eyeState[i];
        if (e.live && Math.hypot(e.x - tx, e.z - tz) < EYE_SPACING) { crowded = true; break; }
      }
      if (crowded) continue;
      // On the rim of the trunk, facing whatever lit it, a hand's width off the bark.
      let fx = bm.x - tx, fz = bm.z - tz;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl; fz /= fl;
      const ex = tx + fx * (tr + 0.15), ez = tz + fz * (tr + 0.15);
      const g = terrain.heightAt(ex, ez);
      if (!isFinite(g)) continue;
      const wrong = rng.next() < EYE_WRONG_BASE + EYE_WRONG_DEPTH * depthK;
      const hr = wrong ? EYE_H_WRONG : EYE_H;
      const ey = g + hr[0] + rng.next() * (hr[1] - hr[0]);
      let slot = -1;
      for (let i = 0; i < EYE_PAIRS; i++) if (!this.eyeState[i].live) { slot = i; break; }
      if (slot < 0) return;
      const e = this.eyeState[slot];
      e.live = true; e.x = ex; e.y = ey; e.z = ez;
      e.age = 0; e.lit = 0; e.unlitT = 0; e.lookT = 0; e.wrong = wrong;
      e.blinkT = 1 + rng.next() * 4; e.blinkOff = 0;
      // The two eyes sit across the facing, EYE_SEP apart.
      const sx = -fz * EYE_SEP * 0.5, sz = fx * EYE_SEP * 0.5;
      const j = slot * 6;
      this.eyePos[j] = ex - sx; this.eyePos[j + 1] = ey; this.eyePos[j + 2] = ez - sz;
      this.eyePos[j + 3] = ex + sx; this.eyePos[j + 4] = ey; this.eyePos[j + 5] = ez + sz;
      this._eyePosDirty = true;
      this._eyeLive++;
      return;                                  // one pair per attempt
    }
  }

  /** Live pairs right now. Tools and tests. */
  eyeshineCount() { return this._eyeLive; }

  /** Every live pair, copied out, with its slot index. Tools only: it allocates. */
  eyeshine() {
    const out = [];
    for (let i = 0; i < EYE_PAIRS; i++) {
      const e = this.eyeState[i];
      if (!e.live) continue;
      out.push({ i, x: +e.x.toFixed(2), y: +e.y.toFixed(2), z: +e.z.toFixed(2), lit: +e.lit.toFixed(3), wrong: e.wrong, age: +e.age.toFixed(2), lookT: +e.lookT.toFixed(2) });
    }
    return out;
  }

  step(dt) {
    this._precip(dt);
    this._eyeshine(dt);
    // Particles, tracers and decals run on the SCALED step on purpose: during hitstop the
    // debris hangs in the air, which is the whole effect.
    //
    // NOTHING HERE TOUCHES pPos, pAttr OR A TRACER MATRIX. Those are the GPU's copies and
    // present() owns them; this method only advances curr and remembers prev.
    const pCur = this.pCur, pPrv = this.pPrv, pAC = this.pAttrC, pAP = this.pAttrP;
    const pVel = this.pVel, pLife = this.pLife;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3, i2 = i * 2;
      if (pLife[i2] >= pLife[i2 + 1]) continue;
      pPrv[i3] = pCur[i3]; pPrv[i3 + 1] = pCur[i3 + 1]; pPrv[i3 + 2] = pCur[i3 + 2];
      // Attributes stride by three now and share i3; index 2 is aniso, which is set at birth
      // and never integrated, so nothing in this loop reads or writes it.
      pAP[i3] = pAC[i3]; pAP[i3 + 1] = pAC[i3 + 1];
      pLife[i2] += dt;
      const t = pLife[i2] / pLife[i2 + 1];
      if (t >= 1) {
        // Dead: park BOTH ends under the world with zero alpha, so present has nothing to
        // interpolate between and cannot draw a streak down to the parking spot.
        pCur[i3 + 1] = -9999; pPrv[i3 + 1] = -9999;
        pAC[i3 + 1] = 0; pAP[i3 + 1] = 0;
        continue;
      }
      const dr = Math.exp(-this.pDrag[i] * dt);
      pVel[i3] *= dr;
      pVel[i3 + 1] = pVel[i3 + 1] * dr - this.pGrav[i] * dt;
      pVel[i3 + 2] *= dr;
      pCur[i3] += pVel[i3] * dt;
      pCur[i3 + 1] += pVel[i3 + 1] * dt;
      pCur[i3 + 2] += pVel[i3 + 2] * dt;
      pAC[i3 + 1] = this.pAlpha0[i] * (1 - t * t);
      pAC[i3] = this.pSize0[i] * (1 + t * 0.6);
    }

    // tracers: the head advances at 340 m/s. The matrix is composed in present().
    let trDirty = false;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = this.trState[i];
      if (!t.live) continue;
      t.page = t.age; t.pdist = t.dist;
      t.age += dt;
      t.dist += t.speed * dt;
      if (t.dist > t.maxDist + 2.6 || t.age > 0.055 + t.maxDist / t.speed) {
        t.live = false;
        _m4.makeScale(0, 0, 0);
        this.tracers.setMatrixAt(i, _m4);
        trDirty = true;
      }
    }
    if (trDirty) this.tracers.instanceMatrix.needsUpdate = true;

    // decals fade out over 22 s. They never move, so they keep no prev and are placed once.
    let dcDirty = false;
    for (let i = 0; i < MAX_DECALS; i++) {
      const d = this.dcState[i];
      if (d.age > 22) continue;
      d.age += dt;
      if (d.age > 22) {
        _m4.makeScale(0, 0, 0);
        this.decals.setMatrixAt(i, _m4);
        dcDirty = true;
      }
    }
    if (dcDirty) this.decals.instanceMatrix.needsUpdate = true;
  }

  /**
   * PRESENTATION ONLY, and it is the whole reason ctx.time.alpha exists for this system.
   * Every visible quantity is read prev -> curr at `alpha`; nothing here advances the sim.
   */
  present(alpha) {
    const a = alpha === undefined ? 1 : (alpha < 0 ? 0 : (alpha > 1 ? 1 : alpha));

    /* ---- particles ------------------------------------------------------- */
    const pPos = this.pPos, pCur = this.pCur, pPrv = this.pPrv;
    const pAttr = this.pAttr, pAC = this.pAttrC, pAP = this.pAttrP, pLife = this.pLife;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3, i2 = i * 2;
      if (pLife[i2] >= pLife[i2 + 1]) {
        // Idempotent, and only writes on the frame a particle actually retired.
        if (pAttr[i3 + 1] !== 0) { pAttr[i3 + 1] = 0; pPos[i3 + 1] = -9999; }
        continue;
      }
      pPos[i3] = pPrv[i3] + (pCur[i3] - pPrv[i3]) * a;
      pPos[i3 + 1] = pPrv[i3 + 1] + (pCur[i3 + 1] - pPrv[i3 + 1]) * a;
      pPos[i3 + 2] = pPrv[i3 + 2] + (pCur[i3 + 2] - pPrv[i3 + 2]) * a;
      pAttr[i3] = pAP[i3] + (pAC[i3] - pAP[i3]) * a;
      pAttr[i3 + 1] = pAP[i3 + 1] + (pAC[i3 + 1] - pAP[i3 + 1]) * a;
    }
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.aP.needsUpdate = true;
    if (this.pColDirty) { this.pGeo.attributes.color.needsUpdate = true; this.pColDirty = false; }

    /* ---- eyeshine (ROUND 22) --------------------------------------------- */
    // Alphas every frame from the step's `lit`; positions only when a pair was placed or
    // dropped. A dropped pair is parked under the world once, then left alone.
    const eyeAttr = this.eyeAttr, eyePos = this.eyePos;
    let anyLive = false;
    for (let i = 0; i < EYE_PAIRS; i++) {
      const e = this.eyeState[i], j = i * 6;
      let al = 0;
      if (e.live) { anyLive = true; al = e.blinkOff > 0 ? 0 : EYE_ALPHA * e.lit; }
      else if (eyePos[j + 1] !== -9999) { eyePos[j + 1] = -9999; eyePos[j + 4] = -9999; this._eyePosDirty = true; }
      eyeAttr[j + 1] = al; eyeAttr[j + 4] = al;
    }
    if (anyLive || this._eyeWasLive) this.eyeGeo.attributes.aP.needsUpdate = true;   // not a 576-byte upload every frame of an empty night
    this._eyeWasLive = anyLive;
    if (this._eyePosDirty) { this.eyeGeo.attributes.position.needsUpdate = true; this._eyePosDirty = false; }

    /* ---- tracers --------------------------------------------------------- */
    // 340 m/s is 5.7 m per fixed step: without this lerp a 144 Hz display sees the same
    // tracer three times in the same place and the shot reads as a stutter, not a shot.
    const camPos = this.ctx.camera ? this.ctx.camera.position : null;
    let trDirty = false;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = this.trState[i];
      if (!t.live) continue;
      const dist = t.pdist + (t.dist - t.pdist) * a;
      const age = t.page + (t.age - t.page) * a;
      const headD = Math.min(dist, t.maxDist);
      const tailD = clamp(dist - 2.6, 1.2, t.maxDist);
      const len = Math.max(headD - tailD, 0.05);
      const mid = (headD + tailD) / 2;
      _p.copy(t.origin).addScaledVector(t.dir, mid);
      // screen-space minimum width: thicken with distance so the line never falls under
      // a pixel and disappears
      const dCam = camPos ? _p.distanceTo(camPos) : 10;
      const wBase = 0.022 * (age < 0.12 ? 1.6 : 1);
      const w = Math.max(wBase, dCam * 0.0011);
      _q.setFromUnitVectors(_zAxis, t.dir);
      _m4.compose(_p, _q, _s.set(w, w, len));
      this.tracers.setMatrixAt(i, _m4);
      trDirty = true;
    }
    if (trDirty) this.tracers.instanceMatrix.needsUpdate = true;

    /* ---- feel ------------------------------------------------------------ */
    // RAW frame time. ctx.time.dt is the unscaled clamped frame dt (see HANDOFF.md):
    // hitstop must be able to end itself.
    const raw = (this.ctx.time && this.ctx.time.dt) || 1 / 60;
    if (this._freeze > 0) this._freeze = Math.max(0, this._freeze - raw);
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * raw);
    // The one and only write of ctx.time.scale.
    if (this.ctx.time) this.ctx.time.scale = this._freeze > 0 ? 0 : 1;
  }

  ready() { return !!(this.points && this.tracers && this.decals && this.eyes); }

  dispose() {
    this._offBroken?.();
    // The eyes share the ring's material: remove and drop the geometry, dispose the
    // material once, with the ring.
    if (this.eyes) { this.eyes.removeFromParent(); this.eyes.geometry.dispose(); this.eyes = null; }
    for (const m of [this.points, this.tracers, this.decals]) {
      if (!m) continue;
      m.removeFromParent();
      m.geometry.dispose();
      m.material.dispose();
      if (m.dispose) m.dispose();
    }
    this.points = this.tracers = this.decals = null;
  }
}

export default Fx;
