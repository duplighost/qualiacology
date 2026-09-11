// airlight — LIGHT THAT HAS A BODY.
//
// THE FAULT THIS EXISTS TO FIX, measured before a line of it was written
// (tools/value.mjs, this build, frame B in the pines and frame D in the black hour):
//
//     share of the frame in luma 48-127, "where form lives"     6.5%   and   0%
//     share of the frame under luma 48                         93.5%   and  99.9%
//
// A night game whose every frame is one narrow dark band is not dark, it is FLAT, and the
// reason is in one line of world/places.js:1082 — "every lamp, window, ember and beam in the
// county is this one material", `matGlow`, a MeshBasicMaterial. Every light in the county is
// a STICKER. It emits nothing, it lands on nothing, and the air between it and you is empty.
// Photographed: tests/shots/vis-a/02-opening-tower.png is a lantern burning over a patch of
// ground that is pure black.
//
// Alex, round 9 playtest: "is there a day and night cycle? i don't notice. the forest needs to
// be wayyy darker. there is no point to the light i can turn on." The torch is not the
// problem — a SpotLight lights what it hits perfectly well. What is missing is the AIR: the
// cone you can see, the pool on the ground, the halo round the bulb. That is the whole visual
// language of a night horror game and this game had none of it.
//
// WHAT THIS IS NOT. It is not a fourteenth light. gfx/lights.js's census is pinned at 13 and
// stays pinned (ART.md 1.5); nothing here constructs a THREE light or touches one. These are
// additive MESHES in the shape a volume of lit air would be, and they cost exactly:
//
//     ONE program   — one ShaderMaterial, three InstancedMeshes that share it, so the
//                     USE_INSTANCING define is identical across all three.
//     THREE draws   — pools, halos, beams; `count` is written per frame, never `visible`.
//     ZERO lights.
//
// THE FALLOFF IS THE GEOMETRY'S OWN SILHOUETTE, which is the trick that makes this cheap.
// For a convex volume the chord a view ray cuts through it is longest where the surface
// faces you and zero at the silhouette, so pow(abs(dot(N, V)), soft) IS the thickness, to
// within a constant. A sphere shaded that way is a soft round glow with no edge; a cone is a
// beam with no edge. No depth prepass, no scene depth texture, no soft-particle plumbing.
//
// Discs opt out (aSoft 0) because a flat disc seen at a grazing angle has N.V ~ 0 and would
// vanish exactly when a ground pool is most visible; they carry their falloff in aCore.
//
// GLSL laws honoured (AGENTS.md): no backtick anywhere inside the template literal, and no
// identifier named flat, half or sat.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp, clamp01, damp, smoothstep } from '../engine/math.js';

/* -------------------------------------------------------------------------- *
 * Capacities. Fixed pools, like every other pool in this project: `count` moves,
 * the buffers never do. The nearest N are seated and the rest wait, which is the
 * same rule gfx/lights.js's rover pool uses and for the same reason.
 * -------------------------------------------------------------------------- */
const MAX_POOLS = 40;
const MAX_HALOS = 40;
const MAX_BEAMS = 12;
/* One-frame volumes: muzzle flashes, impacts, the reward burst. A fixed ring, because these
 * are pushed from the fixed step and the hot path allocates nothing. */
const MAX_PULSE = 12;

/* The whole system's master gain. Alex on sound, and it reads the same way on light:
 * "nothing loud or anoying". A haze you NOTICE is a bug; a haze you would miss if it were
 * switched off is the point. Every number below was set by A/B against a screenshot. */
const GAIN = 1.0;

/* Beyond this the volumes are not worth their fill and are dropped from the seating.
 * A lamp is still a lamp past it — places.js's own bead and halo carry the far read. */
const CULL_M = 190;

/* A volume that has just been seated fades IN rather than appearing, or walking round a
 * corner pops a cone into the frame. An exp rate, not a time: 4.5 is about a fifth of a
 * second to nine tenths. */
const FADE_RATE = 4.5;

/* ---- the torch beam ------------------------------------------------------- *
 * The one dynamic volume the player owns, and the direct answer to "there is no point to
 * the light i can turn on". Numbers, all A/B'd against tests/shots/air-torch-*.png:
 *
 *  - it starts 0.55 m in FRONT of the eye. A cone whose apex is at the camera is clipped by
 *    the near plane along its whole axis and reads as a bright wash over the middle of the
 *    screen. 0.55 puts the whole volume in front of the near plane at 0.1.
 *  - it is NARROWER than the SpotLight (0.62 against CFG.lights.torch.angle 0.80). The lit
 *    disc on a wall is the spot's penumbra; the visible core of a torch beam in air is the
 *    hot middle of it, and matching the two makes the haze read as a lens flare.
 *  - the core ramps to nothing by 20 m. The spot reaches 68 m; air does not.
 *  - GAIN_MIST doubles it in a mist bank, because that is when a beam is a beam.
 */
const TORCH_LEN = 20.0;
const TORCH_START = 0.55;
const TORCH_ANGLE = 0.62;
const TORCH_GAIN = 0.023;
const TORCH_COLOUR = 0xffe9c0;
const TORCH_MIST_MUL = 1.85;

/* ---- the headlights ------------------------------------------------------- *
 * Two beams, narrower and longer than the torch, and they are the reason a night drive
 * reads as a drive. Alex, 2026-09-05: "The headlights of the car can be a little stronger if
 * possible." The SpotLight was made stronger in round 13; this is the half of that ask that
 * a SpotLight cannot do at all. */
const HEAD_LEN = 30.0;
const HEAD_ANGLE = 0.40;
const HEAD_GAIN = 0.030;
const HEAD_COLOUR = 0xffdca6;

/* How much air there is to light, by clock phase. The same ordering sky.js's mist sheets
 * use, so a beam is at its most visible in the hour the game is most frightening. */
const MIST_BY_PHASE = { dusk: 0.28, night: 0.46, black: 0.78, dawn: 0.38 };

/* Beams dim as you look along them: a cone seen end-on is all core and blows out the middle
 * of the frame. `dot(view, axis)` above this starts the taper, and it is never fully off. */
const AXIAL_FROM = 0.86, AXIAL_TO = 1.0, AXIAL_MIN = 0.30;

/* Where the beam's ellipsoid sits on its own reach, and how long it is, both as fractions of
 * `len`. Centred at 0.36 and half as long again: the volume runs from about 0.02 of the reach
 * (so it is never clipped by the near plane at the lens) to about 0.70 of it, which is where
 * a torch stops lighting the air anyway. */
const BEAM_MID = 0.36, BEAM_HALF = 0.34;

/* ---- THE SCAN ------------------------------------------------------------- *
 * Every lamp, window, ember and bulb in this county is a mesh on ONE of four additive
 * materials, all four of which say so in their own name. Rather than edit five files to
 * hand-register a few hundred lamps — and rather than leave the next one somebody authors
 * dark — this walks the scene on a slow timer and gives a volume to everything wearing one
 * of those materials. Anything added later is lit the day it is added, with no edit here.
 *
 * The traverse skips `chunks` and `flora` by name. Those two subtrees are the county's
 * thousands of meshes and neither can ever carry a glow material; without the skip this
 * would be the most expensive thing in the frame it runs on.
 */
const GLOW_MATS = new Set(['place-glow', 'refuge-glow', 'wild-glow', 'dread-lantern']);
/* ...except the FAR READS. A landmark's 20 m glyph (land-mark-*, round 19's shaped horizon
 * marker) and a tower's never-culled horizon lantern are billboards sized to hold their
 * pixels at a kilometre. Giving one a light volume hangs a bonfire in the sky over every
 * destination in the county. */
const NOT_A_LAMP = /(^|-)(mark|horizon)(-|$)/;
const SKIP_SUBTREES = new Set(['chunks', 'flora', 'airlight', 'sky', 'impostor-bake']);
const SCAN_S = 0.45;
/* A halo is bigger than the bulb that makes it. 3.4x, floored so a 4 cm bead still has a
 * glow and ceilinged so a 12 m cathedral window does not fill the sky. */
const HALO_MUL = 1.75, HALO_MIN = 0.42, HALO_MAX = 3.0;
/* AND THE FIRST VERSION OF THESE WAS FAR TOO LOUD. 3.4x radius at a gain of 0.62 put a
 * two-metre orange balloon over every stall in the Holdfast's market
 * (tests/shots/vis-hold2/61-holdfast-gate.png) — the lamps stopped being lamps and became
 * the brightest objects in the county. Alex on sound, and it is the same rule for light:
 * "nothing loud or anoying". A halo is what you see AROUND a lamp on a damp night, so it is
 * a little bigger than the bulb and a lot fainter, and the mist term is what makes it
 * grow — a halo IS the air, so with no air there is barely one. */
const HALO_GAIN = 0.115, HALO_GAIN_MIST = 0.26;
/* The pool reads at roughly this against a cobbled apron and a forest floor; unlike the
 * halo it is landing on a real surface, so it can afford to be the stronger of the two. */
const POOL_GAIN = 1.30;
/* Past this a glow mesh is a beacon or a sign, not a lamp, and it lights nothing. */
const SRC_MAX_R = 14.0;
/* How far apart two glow vertices have to be before they are two different lamps. 1.4 m is
 * wider than any single pane, bead or window in the county and narrower than the gap between
 * two of them; see _clusters for why one forward pass is enough. */
const CLUSTER_JOIN = 1.4;
const CLUSTER_MAX = 28;
/* An unlit lamp in this county is a DARK VERTEX COLOUR, not a hidden mesh (places.js writes
 * the claim's ignition straight into the colour attribute). So the volume's switch is read
 * off that colour: below the floor it is out, at full it is a lamp. */
const GLOW_ON_FLOOR = 0.14, GLOW_ON_FULL = 0.46;

/* -------------------------------------------------------------------------- *
 * The shared material.
 * -------------------------------------------------------------------------- */
// three's own vertex prefix declares `attribute mat4 instanceMatrix` and
// `attribute vec3 instanceColor` under those two defines, for every ShaderMaterial that is
// not a RawShaderMaterial. It does NOT carry either into the fragment stage — the built-in
// colour chunks do that, and we are not using them — so vTone is written here by hand.
//
// The instance normal is un-skewed the way three's own begin_normal_vertex does it, dividing
// by the squared column lengths before the rotation. Without that, an instance scaled
// (mouth, mouth, length) — which is EVERY beam, at 30:1 — has normals lying so far over that
// the silhouette falloff runs round the cone instead of across it.
const VERT = /* glsl */`
  attribute float aCore;
  attribute float aSoft;
  attribute vec3 aTint;
  varying float vCore;
  varying float vSoft;
  varying vec3 vTone;
  varying vec3 vNrm;
  varying vec3 vView;
  void main() {
    vCore = aCore;
    vSoft = aSoft;
    vTone = aTint;
    vec3 nrm = normal;
    #ifdef USE_INSTANCING
      mat3 im3 = mat3(instanceMatrix);
      nrm /= vec3(dot(im3[0], im3[0]), dot(im3[1], im3[1]), dot(im3[2], im3[2]));
      nrm = im3 * nrm;
      vec4 wp = instanceMatrix * vec4(position, 1.0);
    #else
      vec4 wp = vec4(position, 1.0);
    #endif
    #ifdef USE_INSTANCING_COLOR
      vTone *= instanceColor;
    #endif
    vec4 mv = modelViewMatrix * wp;
    vView = -mv.xyz;
    vNrm = normalMatrix * nrm;
    gl_Position = projectionMatrix * mv;
  }
`;

// vTone carries the light's colour AND its intensity in its magnitude, so an instance can be
// dimmed to nothing without being moved out of the frame. uGain is the master.
const FRAG = /* glsl */`
  uniform float uGain;
  varying float vCore;
  varying float vSoft;
  varying vec3 vTone;
  varying vec3 vNrm;
  varying vec3 vView;
  void main() {
    float thick = 1.0;
    if (vSoft > 0.001) {
      float ndv = abs(dot(normalize(vNrm), normalize(vView)));
      thick = pow(clamp(ndv, 0.0, 1.0) + 1e-4, vSoft);
    }
    float a = vCore * thick * uGain;
    gl_FragColor = vec4(vTone * a, 1.0);
  }
`;

/* -------------------------------------------------------------------------- *
 * Geometry. Every one carries aCore (how much light is in the volume here) and
 * aSoft (the N.V exponent, 0 to opt out) so ONE program serves all three shapes.
 * -------------------------------------------------------------------------- */

function tagGeo(geo, coreFn, soft, tint) {
  const p = geo.attributes.position;
  const n = p.count;
  const core = new Float32Array(n);
  const sf = new Float32Array(n);
  const tn = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    core[i] = coreFn(p.getX(i), p.getY(i), p.getZ(i));
    sf[i] = soft;
    tn[i * 3] = tint[0]; tn[i * 3 + 1] = tint[1]; tn[i * 3 + 2] = tint[2];
  }
  geo.setAttribute('aCore', new THREE.BufferAttribute(core, 1));
  geo.setAttribute('aSoft', new THREE.BufferAttribute(sf, 1));
  geo.setAttribute('aTint', new THREE.BufferAttribute(tn, 3));
  return geo;
}

/** A halo: unit sphere, all core, falloff entirely from its own silhouette. */
function haloGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 3);
  return tagGeo(g, () => 1, 3.4, [1, 1, 1]);
}

/**
 * A ground pool: a unit disc in the XZ plane with a radial ramp baked into aCore, and
 * aSoft 0 so a grazing view does not delete it. The ramp is quartic — a lamp's pool has a
 * bright middle and a long faint edge, and a linear ramp reads as a painted circle.
 */
function poolGeometry() {
  const g = new THREE.CircleGeometry(1, 40);
  g.rotateX(-Math.PI / 2);
  return tagGeo(g, (x, y, z) => {
    const r = clamp01(Math.hypot(x, z));
    const k = 1 - r;
    return k * k * (0.35 + 0.65 * k * k);
  }, 0, [1, 1, 1]);
}

/**
 * A beam, and THE FIRST VERSION OF THIS WAS A CONE AND IT WAS INVISIBLE.
 *
 * The N.V thickness trick at the top of this file is exact for a sphere from every angle
 * and for a cone seen from the SIDE. It fails for a cone seen END-ON, and it fails hard: a
 * cone's normals are all perpendicular to its axis, so looking down the axis puts N.V at
 * zero over the whole surface and the beam disappears. A first-person torch is looked down
 * its own axis ALWAYS. Three screenshot rounds photographed a beam that was drawing every
 * frame with a thickness of nought (tests/shots/vis-round/72-forest-mist-torch.png).
 *
 * So a beam is a BILLBOARDED WEDGE instead — the classic light-shaft card, a flat quad
 * spun about the beam axis to face the camera, with its falloff baked into aCore and aSoft
 * 0 so the normal never enters the arithmetic. It reads the same from behind the lens, from
 * the side and from anywhere between, which a single cone cannot.
 *
 * Local frame: z runs 0 (the lens) to -1 (the far end); x runs -1..1 across, tapered so the
 * card is a wedge and not a slab. present() supplies the basis that faces it.
 */
function beamGeometry() {
  // A unit sphere, stretched by present() into an ellipsoid lying along the beam. aSoft is
  // lower than the halo's because a beam is a long thin volume and wants a broad, gradual
  // falloff rather than a concentrated bead.
  // Denser near the lens: local +Z is the source end (the quaternion maps local -Z onto the
  // beam direction), so this ramps 1.0 at the lamp to 0.55 at the far end.
  return tagGeo(new THREE.IcosahedronGeometry(1, 3),
    (x, y, z) => 0.55 + 0.45 * clamp01((z + 1) * 0.5), 1.9, [1, 1, 1]);
}

/* -------------------------------------------------------------------------- *
 * The system.
 * -------------------------------------------------------------------------- */
export class AirLight {
  static id = 'airlight';

  constructor(ctx) {
    this.ctx = ctx;
    this.mat = null;
    this.pools = null;
    this.halos = null;
    this.beams = null;
    this.group = null;
    // Every standing light volume in the county, keyed by "<mesh uuid>:<cluster>". Written by
    // _scan on a slow timer, read every frame. A Map so removing one cannot leave a hole in an
    // array being iterated.
    this._src = new Map();
    // Per-frame dynamic volumes, cleared at the top of every present().
    this._live = [];
    this._mist = 0;
    // Scratch. The hot path allocates nothing.
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._col = new THREE.Color();
    this._axis = new THREE.Vector3(0, 0, -1);
    this._seat = [];
    this._seen = new Set();
    this._stack = [];
    this._scanT = 0;
    this._pulses = [];
    for (let i = 0; i < MAX_PULSE; i++) {
      this._pulses.push({
        x: 0, y: 0, z: 0, r: 1, cr: 1, cg: 1, cb: 1,
        on: 0, pool: 0, halo: 1, poolY: null, fade: 1, _d2: 0, poolR: 0, poolGain: 1,
      });
    }
  }

  async init() {
    const scene = this.ctx.scene;
    if (!scene) throw new Error('airlight: no ctx.scene');

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uGain: { value: GAIN } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: true,
    });
    this.mat.name = 'airlight';

    this.group = new THREE.Group();
    this.group.name = 'airlight';
    // Never frustum-culled as a group: the instance matrices move every frame and three
    // would test a bounding sphere computed at construction. The individual meshes carry
    // frustumCulled false for the same reason.
    this.group.frustumCulled = false;
    // AFTER the world, so the additive pass composites over solid geometry that has already
    // written depth. Under the viewmodel's own overlay, which draws in its own pass.
    this.group.renderOrder = 6;

    this.pools = this._instanced(poolGeometry(), MAX_POOLS, 'airlight-pools');
    this.halos = this._instanced(haloGeometry(), MAX_HALOS, 'airlight-halos');
    this.beams = this._instanced(beamGeometry(), MAX_BEAMS, 'airlight-beams');
    scene.add(this.group);

    this.ctx.airlight = this;
  }

  _instanced(geo, n, name) {
    const m = new THREE.InstancedMesh(geo, this.mat, n);
    m.name = name;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = false;
    // INVISIBLE TO EVERY RAYCASTER, and this is not an optimisation. A light volume is not a
    // surface: it has no collision, it blocks no sight line, and a torch beam is a 20 m
    // ellipsoid sitting over the camera at all times. This project raycasts the scene for
    // "what is the player looking at" (tools/seat-what.mjs), for door and bed reachability
    // (tests/destination-refuges.mjs) and for the roof check that stops the snow indoors —
    // and every one of those would start hitting the air.
    m.raycast = _noRaycast;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.count = 0;
    this.group.add(m);
    return m;
  }

  /* ---------------------------------------------------------------- api -- */

  // THERE IS NO register()/release() HERE, ON PURPOSE. The first draft had one and
  // nothing ever called it: the scan above already finds every standing lamp in the county,
  // including ones authored after this file was written, and a second way in would be a
  // public surface with no caller to keep it honest. Everything dynamic goes through pulse().

  /**
   * A volume for THIS FRAME only — a muzzle flash, a fire's flicker, a thing that is only
   * lit while something is happening. Called from present(), before ours runs.
   */
  pulse(x, y, z, r, colour, on, poolY) {
    const n = this._live.length;
    if (n >= MAX_PULSE) return;
    // A fixed ring, filled in place. This is called from the fixed step (fx.flash, once per
    // shot) and the law in main.js's header is that the hot path allocates nothing.
    const s = this._pulses[n];
    this._col.set(colour === undefined ? 0xffc98a : colour);
    s.x = x; s.y = y; s.z = z; s.r = r;
    s.cr = this._col.r; s.cg = this._col.g; s.cb = this._col.b;
    s.on = on; s.halo = 1; s.fade = 1;
    s.poolY = poolY === undefined ? null : poolY;
    s.pool = s.poolY === null ? 0 : 1;
    this._live.push(s);
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    // Sources fade in and out rather than pop. This is the only state the step owns.
    for (const s of this._src.values()) {
      const want = s.on > 0 ? 1 : 0;
      s.fade = damp(s.fade, want, FADE_RATE, dt);
    }
    // How much air there is to light. The clock drives it: the black hour is the thickest
    // and the dusk the thinnest, which is the same ordering sky.js's mist sheets use, and
    // it means the torch beam is at its most visible in the hour the game is most
    // frightening. Damped, so a phase change is not a step in the middle of the frame.
    const ph = (this.ctx.shared && this.ctx.shared.phase) || 'night';
    this._mist = damp(this._mist, MIST_BY_PHASE[ph] === undefined ? 0.45 : MIST_BY_PHASE[ph],
      1.6, dt);

    this._scanT -= dt;
    if (this._scanT <= 0) { this._scanT = SCAN_S; this._scan(); }
  }

  /**
   * Find every glow mesh in the county and give it a body. See GLOW_MATS. Runs on the fixed
   * step at SCAN_S, so a chunk that streamed in is lit within half a second of arriving.
   */
  _scan() {
    const scene = this.ctx.scene;
    if (!scene) return;
    const terrain = this.ctx.systems && this.ctx.systems.get('terrain');
    const heightAt = terrain && typeof terrain.heightAt === 'function' ? terrain : null;
    const seen = this._seen;
    seen.clear();
    const stack = this._stack;
    stack.length = 0;
    for (let i = scene.children.length - 1; i >= 0; i--) stack.push(scene.children[i]);
    let guard = 120000;   // a cycle guard, not a budget: the scene minus chunks and flora is a few thousand nodes
    while (stack.length && guard-- > 0) {
      const o = stack.pop();
      if (!o.visible) continue;
      if (o.name && SKIP_SUBTREES.has(o.name)) continue;
      const m = o.isMesh ? (Array.isArray(o.material) ? o.material[0] : o.material) : null;
      if (m && m.name && GLOW_MATS.has(m.name) && !NOT_A_LAMP.test(o.name || '')) {
        this._seat1(o, m, heightAt, seen);
      }
      const kids = o.children;
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    }
    // Anything that has gone (a chunk unloaded, a place disposed) loses its volume.
    for (const key of this._src.keys()) {
      if (!seen.has(key)) this._src.delete(key);
    }
  }

  /**
   * ONE VOLUME PER LAMP, NOT ONE PER MESH — and this is the whole difficulty of the scan.
   *
   * Every builder in this project merges: `opening-lamp-cores` is EIGHT lantern panes in one
   * geometry, `body-glow-<id>` is every window of a building. The first version of this used
   * geometry.boundingSphere, which for those meshes is the whole station and the whole house,
   * so the sources came out at 20-40 m and were rejected by SRC_MAX_R — the pass ran, found
   * things, and lit nothing. Photographed: tests/shots/vis-lamp/51-opening-tower.png, a
   * lantern burning with no halo and no pool under it.
   *
   * mergeGeometries CONCATENATES, so the vertices of one lamp are contiguous. A single
   * forward pass that starts a new cluster whenever a vertex leaves the current one's box
   * therefore separates them exactly, in one pass, with no spatial structure. Cached on the
   * mesh: a merged glow geometry is built once and never edited.
   */
  _clusters(mesh, geo) {
    let c = mesh.userData.__airClusters;
    if (c && c.rev === geo.attributes.position.version) return c.list;
    const p = geo.attributes.position;
    const ca = geo.attributes.color;
    const list = [];
    let cur = null;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (cur && x >= cur.x0 - CLUSTER_JOIN && x <= cur.x1 + CLUSTER_JOIN
        && y >= cur.y0 - CLUSTER_JOIN && y <= cur.y1 + CLUSTER_JOIN
        && z >= cur.z0 - CLUSTER_JOIN && z <= cur.z1 + CLUSTER_JOIN) {
        if (x < cur.x0) cur.x0 = x; else if (x > cur.x1) cur.x1 = x;
        if (y < cur.y0) cur.y0 = y; else if (y > cur.y1) cur.y1 = y;
        if (z < cur.z0) cur.z0 = z; else if (z > cur.z1) cur.z1 = z;
      } else {
        if (list.length >= CLUSTER_MAX) break;
        cur = { x0: x, x1: x, y0: y, y1: y, z0: z, z1: z, pk: -1, pi: -1 };
        list.push(cur);
      }
      // THE BRIGHTEST VERTEX IN THE CLUSTER, not its first. Every glow card in this project
      // is a GRADIENT — a bright core with a rim faded to nothing — and the first vertex of
      // one is a rim vertex. The first version of this read vertex 0 and measured the
      // Holdfast's market lanterns at a peak of 0.05 against a mesh maximum of 0.574, so
      // every lamp in the town came back "off" and the pass lit one glint in the whole
      // county (tools/air-why.mjs: near 16, onPos 1).
      if (ca) {
        const r = ca.getX(i), g = ca.getY(i), b = ca.getZ(i);
        const pk = r > g ? (r > b ? r : b) : (g > b ? g : b);
        // The INDEX is what is cached, not the colour. places.js's ignition ripple writes
        // base * s(t) into this same attribute for RIPPLE_S seconds and then writes the base
        // back, so a cached colour is a photograph of whatever the lamp was doing the first
        // time it was scanned. The position never moves, so the clustering is still cached.
        if (pk > cur.pk) { cur.pk = pk; cur.pi = i; }
      } else if (cur.pk < 0) { cur.pk = 1; cur.pi = -1; }
    }
    for (const k of list) {
      k.cx = (k.x0 + k.x1) * 0.5; k.cy = (k.y0 + k.y1) * 0.5; k.cz = (k.z0 + k.z1) * 0.5;
      k.r = 0.5 * Math.hypot(k.x1 - k.x0, k.y1 - k.y0, k.z1 - k.z0);
    }
    mesh.userData.__airClusters = { rev: p.version, list };
    return list;
  }

  _seat1(mesh, mat, heightAt, seen) {
    const geo = mesh.geometry;
    if (!geo || !geo.attributes || !geo.attributes.position) return;
    const list = this._clusters(mesh, geo);
    if (!list.length) return;
    mesh.updateWorldMatrix(true, false);
    const e = mesh.matrixWorld.elements;
    const scale = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]),
      Math.hypot(e[8], e[9], e[10]));
    const mo = mat.opacity === undefined ? 1 : mat.opacity;
    const mr = mat.color ? mat.color.r : 1, mg = mat.color ? mat.color.g : 1;
    const mb = mat.color ? mat.color.b : 1;
    const vc = !!mat.vertexColors;
    const ca = geo.attributes.color;

    for (let i = 0; i < list.length; i++) {
      const k = list[i];
      const r = k.r * scale;
      if (r > SRC_MAX_R) continue;
      this._v.set(k.cx, k.cy, k.cz).applyMatrix4(mesh.matrixWorld);
      const key = mesh.uuid + ':' + i;
      seen.add(key);
      // The lamp's own colour: the material's, times this cluster's vertex colour. matGlow
      // is vertexColors, so the material colour alone is white for every lamp in the county
      // and a fire would come out the same hue as a window.
      let cr = mr, cg = mg, cb = mb;
      if (vc && ca && k.pi >= 0) { cr *= ca.getX(k.pi); cg *= ca.getY(k.pi); cb *= ca.getZ(k.pi); }
      // Additive glows are authored bright and the brightness IS the switch — an unlit lamp
      // in this county is a dark vertex colour, not a hidden mesh. Normalise so the volume's
      // HUE comes from the lamp and its STRENGTH from the numbers in this file.
      const peak = Math.max(cr, cg, cb, 1e-4);
      const on = mo * smoothstep(GLOW_ON_FLOOR, GLOW_ON_FULL, peak);
      cr /= peak; cg /= peak; cb /= peak;

      let s = this._src.get(key);
      if (!s) {
        s = { x: 0, y: 0, z: 0, r: 1, cr: 1, cg: 1, cb: 1, on: 0, pool: 1, halo: 1, poolY: null, fade: 0,
          poolR: 0, poolGain: 1 };
        this._src.set(key, s);
      }
      s.x = this._v.x; s.y = this._v.y; s.z = this._v.z;
      s.r = clamp(r * HALO_MUL, HALO_MIN, HALO_MAX);
      s.cr = cr; s.cg = cg; s.cb = cb;
      s.on = on;
      const gy = heightAt ? heightAt.heightAt(this._v.x, this._v.z) : null;
      // A lamp more than this far over its own ground is in a tower or a lamp room, and its
      // pool would be a disc of light on a field nobody can stand in.
      s.poolY = gy === null || this._v.y - gy > 9 ? null : gy;
      // ROUND 22: a mesh may say what its pool is. The dusk-to-dawn poles hang a bead 4.6 m
      // up, and by the drop below that is an 8 m disc at a seventh of the gain — invisible on
      // a road, and that pool is the fence the hounds refuse (world/dusk-to-dawn.js), so it
      // has to be READ. poolR is metres on the ground; poolGain multiplies the drop's result.
      const ov = mesh.userData.air;
      s.poolR = ov && ov.poolR > 0 ? ov.poolR : 0;
      s.poolGain = ov && ov.poolGain > 0 ? ov.poolGain : 1;
    }
  }

  /* ------------------------------------------------------------ present -- */

  present() {
    const live = this._live;
    if (!this.mat) { live.length = 0; return; }
    const cam = this.ctx.camera;
    if (!cam) { live.length = 0; return; }

    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const mist = this._mist;

    /* ---- seat the nearest sources ------------------------------------- */
    const seat = this._seat;
    seat.length = 0;
    for (const s of this._src.values()) {
      if (s.fade < 0.004) continue;
      const dx = s.x - cx, dy = s.y - cy, dz = s.z - cz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > CULL_M * CULL_M) continue;
      s._d2 = d2;
      seat.push(s);
    }
    for (let i = 0; i < live.length; i++) { live[i]._d2 = 0; seat.push(live[i]); }
    if (seat.length > 1) seat.sort(_byD2);

    let np = 0, nh = 0;
    for (let i = 0; i < seat.length; i++) {
      const s = seat[i];
      const k = s.fade * s.on;
      if (k <= 0.004) continue;
      // Aerial perspective on the volume itself: a halo 150 m off is a glint, not a bloom.
      const d = Math.sqrt(s._d2);
      const far = 1 - 0.72 * clamp01((d - 40) / (CULL_M - 40));

      if (nh < MAX_HALOS && s.halo > 0) {
        const r = s.r * (1 + 0.45 * mist);
        this._m.makeScale(r, r, r);
        this._m.setPosition(s.x, s.y, s.z);
        this.halos.setMatrixAt(nh, this._m);
        // YOU CANNOT SEE A HALO FROM INSIDE IT, and this is not only physics — it is the one
        // place this system can break ART.md 0.3 row 12, "lamps, glints and glows are the only
        // pixels over 150, and at most 1.5% of the frame". tests/sites.mjs measured 2.683% at
        // a claim fixture with the yard lamp on, standing at the lever: at a metre the halo
        // sphere fills a quarter of the screen and adds its whole gain to a surface the torch
        // and the lamp are already lighting. Faded out inside its own radius and full again at
        // 2.2x it, so a lamp across a yard is unchanged and a lamp in your face is not a flare.
        const nearK = smoothstep(s.r * 0.95, s.r * 2.2, d);
        const g = k * s.halo * far * nearK * (HALO_GAIN + HALO_GAIN_MIST * mist);
        this.halos.instanceColor.setXYZ(nh, s.cr * g, s.cg * g, s.cb * g);
        nh++;
      }
      if (np < MAX_POOLS && s.pool > 0 && s.poolY !== null) {
        const h = Math.max(0.35, s.y - s.poolY);
        // A pool is as wide as the lamp is high, plus its own body. A bulb 4 m up throws a
        // wider, fainter disc than the same bulb on a table: both terms are in here.
        const rr = s.poolR > 0 ? s.poolR : (h * 1.75 + s.r * 0.9);
        this._m.makeScale(rr, 1, rr);
        this._m.setPosition(s.x, s.poolY + 0.055, s.z);
        this.pools.setMatrixAt(np, this._m);
        // Inverse-square on the drop, so a high lamp does not paint a bright floor.
        const g = k * s.pool * far * s.poolGain * POOL_GAIN / (1 + 0.34 * h * h);
        this.pools.instanceColor.setXYZ(np, s.cr * g, s.cg * g, s.cb * g);
        np++;
      }
    }

    /* ---- the beams ----------------------------------------------------- */
    let nb = 0;
    nb = this._torchBeam(nb, cam);
    nb = this._carBeams(nb, cam);

    this.pools.count = np;
    this.halos.count = nh;
    this.beams.count = nb;
    if (np) { this.pools.instanceMatrix.needsUpdate = true; this.pools.instanceColor.needsUpdate = true; }
    if (nh) { this.halos.instanceMatrix.needsUpdate = true; this.halos.instanceColor.needsUpdate = true; }
    if (nb) { this.beams.instanceMatrix.needsUpdate = true; this.beams.instanceColor.needsUpdate = true; }

    live.length = 0;
  }

  /**
   * Place one beam volume — an ellipsoid lying along the axis, centred a third of the way
   * down the reach. `ox,oy,oz` is the lens, `dx,dy,dz` a unit direction, `len` the reach and
   * `ang` the half-angle at the mouth. Returns the next free slot.
   *
   * AND THE TWO SHAPES THIS REPLACED BOTH FAILED, for the same underlying reason, so the
   * reason is written down here rather than rediscovered a third time:
   *
   *   a CONE — every normal on a cone is perpendicular to its axis, so looking down the
   *     axis puts N.V at zero over the whole surface and the beam has no thickness at all.
   *   a BILLBOARDED SHAFT — a card spun about the axis to face the eye. Its "across" vector
   *     is axis x toEye, which is DEGENERATE when the eye is ON the axis. A first-person
   *     torch is held at the eye, so it is always exactly that degenerate case, and the card
   *     is seen edge-on for ever. (tools/beam-probe.mjs printed a perfectly correct matrix
   *     for an invisible beam, which is what sent me looking at the geometry rather than the
   *     numbers.)
   *
   * An ellipsoid has no preferred view direction. Seen from the side it is a long soft
   * shaft; seen from the lens end — with the camera INSIDE it, which DoubleSide handles —
   * the far wall has N.V near 1 down the middle of the view and near 0 at the rim, so it
   * reads as the cone of lit air spreading away from you. That is the same trick as the
   * halo, doing the same job, on a shape that happens to be long.
   */
  _beam(i, ox, oy, oz, dx, dy, dz, len, ang, r, g, b) {
    if (i >= MAX_BEAMS) return i;
    const mid = len * BEAM_MID;
    const cross = Math.tan(ang) * mid;
    this._v.set(dx, dy, dz);
    this._q.setFromUnitVectors(this._axis, this._v);
    this._v2.set(cross, cross, len * BEAM_HALF);
    this._m.compose(this._v.set(ox + dx * mid, oy + dy * mid, oz + dz * mid),
      this._q, this._v2);
    this.beams.setMatrixAt(i, this._m);
    this.beams.instanceColor.setXYZ(i, r, g, b);
    return i + 1;
  }

  /** How much a beam is dimmed for being looked along. See AXIAL_FROM. */
  _axial(dx, dy, dz, cam) {
    cam.getWorldDirection(this._v2);
    const d = this._v2.x * dx + this._v2.y * dy + this._v2.z * dz;
    const t = clamp01((Math.abs(d) - AXIAL_FROM) / (AXIAL_TO - AXIAL_FROM));
    return 1 - (1 - AXIAL_MIN) * t;
  }

  _torchBeam(i, cam) {
    const L = this.ctx.systems && this.ctx.systems.get('lights');
    if (!L || !L.torch || !(L.torch.intensity > 0)) return i;
    // The SpotLight's own position and target ARE the torch. Reading them rather than the
    // camera means a torch the controller has swung, dropped or faulted is followed exactly,
    // and a blackout (lights.torchFault) takes the beam with it for free.
    const t = L.torch;
    const px = t.position.x, py = t.position.y, pz = t.position.z;
    this._v.set(t.target.position.x - px, t.target.position.y - py, t.target.position.z - pz);
    if (this._v.lengthSq() < 1e-6) return i;
    this._v.normalize();
    const dx = this._v.x, dy = this._v.y, dz = this._v.z;
    // Intensity relative to the torch's own working value, so High Beam and the fault ramp
    // carry through without a second copy of either number.
    const rel = clamp(t.intensity / Math.max(1e-3, CFG.lights.torch.hot), 0, 2.2);
    // NO AXIAL TAPER ON THE TORCH, and the first version had one. _axial exists so a car's
    // beam does not blow out the middle of the frame when you happen to be looking straight
    // down it — but a hand torch is ALWAYS looked straight down, so the taper simply pinned
    // the beam at its floor of 0.30 for ever and it never appeared in a single screenshot.
    // Seeing the sides of the cone while looking along it is what a torch beam IS.
    const g = TORCH_GAIN * rel * (1 + (TORCH_MIST_MUL - 1) * this._mist);
    if (g <= 0.002) return i;
    this._col.set(TORCH_COLOUR);
    return this._beam(i,
      px + dx * TORCH_START, py + dy * TORCH_START, pz + dz * TORCH_START,
      dx, dy, dz, TORCH_LEN, TORCH_ANGLE,
      this._col.r * g, this._col.g * g, this._col.b * g);
  }

  _carBeams(i, cam) {
    const car = this.ctx.systems && this.ctx.systems.get('car');
    if (!car || typeof car.beamPose !== 'function') return i;
    const p = car.beamPose();
    if (!p || !(p.on > 0)) return i;
    const g0 = HEAD_GAIN * p.on * (1 + (TORCH_MIST_MUL - 1) * this._mist)
      * this._axial(p.dx, p.dy, p.dz, cam);
    if (g0 <= 0.002) return i;
    this._col.set(HEAD_COLOUR);
    const r = this._col.r * g0, g = this._col.g * g0, b = this._col.b * g0;
    // ONE beam by default, because this car has one working filament and car.js aims the
    // census SpotLight from that single lens. `spread` above zero splits it into a pair
    // offset across the axis — the right vector is (dz, 0, -dx) for a unit direction — for
    // the day a repaired car has two.
    const half = p.spread || 0;
    if (half <= 0) {
      return this._beam(i, p.x, p.y, p.z, p.dx, p.dy, p.dz, HEAD_LEN, HEAD_ANGLE, r, g, b);
    }
    const rx = p.dz, rz = -p.dx;
    i = this._beam(i, p.x + rx * half, p.y, p.z + rz * half, p.dx, p.dy, p.dz,
      HEAD_LEN, HEAD_ANGLE, r, g, b);
    i = this._beam(i, p.x - rx * half, p.y, p.z - rz * half, p.dx, p.dy, p.dz,
      HEAD_LEN, HEAD_ANGLE, r, g, b);
    return i;
  }

  /* -------------------------------------------------------------- misc -- */

  /** For tests and the debug surface. */
  counts() {
    return {
      pools: this.pools ? this.pools.count : 0,
      halos: this.halos ? this.halos.count : 0,
      beams: this.beams ? this.beams.count : 0,
      sources: this._src.size,
    };
  }

  ready() { return !!(this.mat && this.pools && this.halos && this.beams && this.group.parent); }

  dispose() {
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
    for (const m of [this.pools, this.halos, this.beams]) {
      if (m) { m.geometry.dispose(); m.dispose(); }
    }
    if (this.mat) this.mat.dispose();
    this.pools = this.halos = this.beams = this.mat = null;
    this._src.clear();
    this._live.length = 0;
  }
}

function _byD2(a, b) { return a._d2 - b._d2; }

/** Assigned to every airlight mesh. See the note at _instanced. */
function _noRaycast() { /* light is not a surface */ }

export default AirLight;
