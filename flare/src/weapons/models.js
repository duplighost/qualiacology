// THE WEAPON MODELS — four procedural guns, built as raw vertex data.
//
// WHY THIS FILE EXISTS AT ALL. The viewmodel is the one object in FLARE that is
// on screen in every frame of the game, and in a dark room it is very often the
// only object the player can see. It is therefore the whole of the game's
// craft budget in a single mesh. docs/RENDER.md's critic rubric lists "a weapon
// that reads as a grey box" as automatic failure #12, and the first build was
// exactly that: four untextured `BoxGeometry` cubes.
//
// WHY IT IMPORTS NOTHING. Not three, not feel, not even math. It emits plain
// `Float32Array` / `Uint16Array` triples and nothing else, for three reasons:
//
//   1. `viewmodel.js` must stay loadable in node (it takes three off `ctx.THREE`
//      precisely so tests/weapons.mjs can assert the sight maths with no GPU).
//      A single `import ... from 'three'` anywhere in its import graph deletes
//      that property, so this file cannot have one either.
//   2. Vertex data is data. Building it without a device means the silhouettes
//      can be measured analytically — bounding boxes, part counts, front-post
//      positions — in the fast tier, before anything is drawn.
//   3. `BufferGeometryUtils` is not vendored. Merging is done here, by
//      construction: every part of a weapon that shares a material lands in ONE
//      builder, so one weapon is three draw calls, not thirty.
//
// HOW A PART IS BUILT. Every part is an extruded, END-CHAMFERED prism:
//
//      z0 ─┬─ inset ring (shrunk by the chamfer)
//          ├─ full ring
//          │      ... the body ...
//          ├─ full ring
//      z1 ─┴─ inset ring
//
// so all twelve edges of what would have been a box are broken by a ~1 mm
// facet. That single detail is what a browser FPS most reliably gives itself
// away on: a perfectly sharp 90-degree corner catches the rim term as a
// mathematically straight line and reads as a primitive. A chamfer gives every
// edge a highlight of its own, which is most of what "modelled" means at this
// distance. The cross-section is either a corner-chamfered rectangle or an
// n-gon, so the same twenty lines make a receiver, a barrel and a scope tube.
//
// Normals are FLAT (per face, vertices duplicated). That is correct for hard
// surface, it costs nothing at these triangle counts, and a smoothed normal on
// a chamfer would defeat the point of having one.

/**
 * The ONE frozen table this module owns.
 *
 * Distances are metres in WEAPON space: the origin sits at the rear face of the
 * receiver on the bore axis, -Z runs out of the muzzle, +Y is up, +X is the
 * ejection side. `VIEWMODEL_TABLE.shapes[id].len` is the distance from that
 * origin to the muzzle crown and `.sight` to the front post — the parts below
 * are authored against those two numbers, so the ADS solve and the model can
 * never disagree about where the sights are.
 *
 * Part fields:
 *   g          material group: 'steel' | 'polymer' | 'bright'
 *   k          'rect' (corner-chamfered rectangle) or 'round' (n-gon)
 *   w,h,c      rect half-width, half-height, corner chamfer
 *   r,n        n-gon radius and side count
 *   z0,z1      extrusion span in the part's own frame, z0 < z1
 *   ch         end chamfer
 *   s0,s1      cross-section scale at each end (a taper / flare / crown)
 *   x,y,z      translation applied after rotation
 *   rx,ry,rz   Euler XYZ rotation, radians
 *   rep        {n, dz} repeat the part n times, stepping dz along local Z
 */
export const MODEL_TABLE = Object.freeze({
  // Material groups. Three albedos and three rim strengths, and the three of
  // them differ in LUMINANCE only — never in hue (CONTRACT §6: the player has
  // moderate deuteranomaly, so a "blued steel vs brown polymer" read would be
  // worth nothing). The rim strength is the only gloss channel the viewmodel
  // shader has, so it carries the roughness story: bead-blasted polymer barely
  // catches an edge, a cold-hammered barrel catches a lot.
  //
  // These albedos are DARK on purpose and they are the fix for the second half
  // of automatic failure #12. FEEL.render.drab is a concrete wall; a weapon
  // finished at wall albedo is the brightest large object in a dark frame, and
  // in this game that is a lie about where the light is.
  groupOrder: Object.freeze(['polymer', 'steel', 'bright']),
  groups: Object.freeze({
    polymer: Object.freeze({ color: 0x15181b, rim: 0.12 }),   // grips, handguards, inset panels
    steel: Object.freeze({ color: 0x24272b, rim: 0.21 }),     // receivers, stocks, sights
    bright: Object.freeze({ color: 0x3d4248, rim: 0.34 }),    // barrels, bolts, muzzle devices
  }),

  // The reserve readout. Blocks on the LEFT flank of the receiver, which is the
  // face the eye actually sees (the gun sits right of centre), each one its own
  // mesh so the readout is COUNTABLE and not a brightness ramp. Four are laid
  // out; `viewmodel.js` builds TABLE.reserveNotchMax of them, and the spare is
  // there so the readout can grow without a model change.
  notch: Object.freeze({ w: 0.0018, h: 0.0032, d: 0.0080, c: 0.0006, ch: 0.0005, proud: 0.0008 }),

  weapons: Object.freeze({
    // ---- SIDEARM — short, blocky, a tall grip under a stubby slide. The only
    //      weapon with no forward mass at all: an "L" in silhouette.
    sidearm: Object.freeze({
      notch: Object.freeze({ x: -0.0235, y: 0.0080, z: -0.052, dz: -0.0165 }),
      parts: Object.freeze([
        // slide
        { g: 'steel', k: 'rect', w: 0.0235, h: 0.0165, c: 0.0055, z0: -0.205, z1: 0.006, ch: 0.0035, y: 0.004 },
        // slide serrations — six proud ribs at the rear, the pistol's signature
        { g: 'bright', k: 'rect', w: 0.0245, h: 0.0125, c: 0.0035, z0: -0.0035, z1: 0.0035, ch: 0.0009, y: 0.004, z: -0.012, rep: { n: 6, dz: -0.0105 } },
        // frame under the slide
        { g: 'polymer', k: 'rect', w: 0.0195, h: 0.0095, c: 0.004, z0: -0.148, z1: 0.004, ch: 0.003, y: -0.020 },
        // dust cover / rail
        { g: 'polymer', k: 'rect', w: 0.0125, h: 0.0055, c: 0.002, z0: -0.152, z1: -0.09, ch: 0.002, y: -0.029 },
        // ejection port — an inset dark panel, which is how a port reads without
        // a boolean: the frame around it is the slide, the hole is this.
        { g: 'polymer', k: 'rect', w: 0.0022, h: 0.0092, c: 0.0022, z0: -0.088, z1: -0.036, ch: 0.0018, x: 0.0225, y: 0.0075 },
        { g: 'bright', k: 'rect', w: 0.0026, h: 0.0030, c: 0.0009, z0: -0.040, z1: -0.030, ch: 0.0008, x: 0.0228, y: 0.0075 },
        // barrel, protruding past the slide, and its crown
        { g: 'bright', k: 'round', r: 0.0082, n: 12, z0: -0.293, z1: -0.185, ch: 0.0022, y: 0.004 },
        { g: 'bright', k: 'round', r: 0.0108, n: 12, z0: -0.300, z1: -0.286, ch: 0.0025, y: 0.004, s1: 0.86 },
        // grip, raked back
        { g: 'polymer', k: 'rect', w: 0.0165, h: 0.0205, c: 0.006, z0: 0, z1: 0.086, ch: 0.004, y: -0.028, z: 0.018, rx: 1.2908 },
        { g: 'steel', k: 'rect', w: 0.0180, h: 0.0215, c: 0.005, z0: 0.086, z1: 0.094, ch: 0.0025, y: -0.028, z: 0.018, rx: 1.2908 },
        // grip stippling — four shallow bands, the cheapest "not a box" there is
        { g: 'bright', k: 'rect', w: 0.0172, h: 0.0212, c: 0.0055, z0: 0.030, z1: 0.0345, ch: 0.0012, y: -0.028, z: 0.018, rx: 1.2908, rep: { n: 4, dz: 0.0130 } },
        // trigger guard: front strut, bottom bow, and the blade inside it
        { g: 'polymer', k: 'rect', w: 0.0055, h: 0.0075, c: 0.002, z0: 0, z1: 0.040, ch: 0.0018, y: -0.055, z: -0.048, rx: 1.396 },
        { g: 'polymer', k: 'rect', w: 0.0055, h: 0.0048, c: 0.0018, z0: -0.052, z1: -0.010, ch: 0.0018, y: -0.062 },
        { g: 'bright', k: 'rect', w: 0.0022, h: 0.0068, c: 0.0012, z0: -0.036, z1: -0.026, ch: 0.001, y: -0.044 },
        // hammer shroud at the rear, and the rear sight with a real notch gap
        { g: 'steel', k: 'rect', w: 0.0125, h: 0.0075, c: 0.003, z0: 0.004, z1: 0.016, ch: 0.0025, y: 0.0125 },
        { g: 'steel', k: 'rect', w: 0.0038, h: 0.0042, c: 0.0012, z0: -0.028, z1: -0.019, ch: 0.001, x: -0.0092, y: 0.0225 },
        { g: 'steel', k: 'rect', w: 0.0038, h: 0.0042, c: 0.0012, z0: -0.028, z1: -0.019, ch: 0.001, x: 0.0092, y: 0.0225 },
        // front post — its tip is at z = -sight, which is what the ADS solve reads
        { g: 'bright', k: 'rect', w: 0.0030, h: 0.0052, c: 0.0011, z0: -0.264, z1: -0.256, ch: 0.001, y: 0.0225 },
      ]),
    }),

    // ---- REPEATER — long, thin, horizontal. A ribbed rail on top, a deep
    //      curved magazine under the middle, a skeleton stub stock behind:
    //      a "T with a tail".
    repeater: Object.freeze({
      notch: Object.freeze({ x: -0.0225, y: 0.0100, z: -0.048, dz: -0.0175 }),
      parts: Object.freeze([
        { g: 'steel', k: 'rect', w: 0.0225, h: 0.0245, c: 0.006, z0: -0.198, z1: 0.020, ch: 0.004 },
        // top rail — seven cross-cut teeth. Reads as machined at any distance.
        { g: 'steel', k: 'rect', w: 0.0105, h: 0.0032, c: 0.001, z0: -0.0045, z1: 0.0045, ch: 0.0011, y: 0.0272, z: -0.030, rep: { n: 7, dz: -0.0205 } },
        { g: 'polymer', k: 'rect', w: 0.0092, h: 0.0022, c: 0.0008, z0: -0.176, z1: -0.020, ch: 0.0012, y: 0.0262 },
        // handguard: a hexagonal tube, so it never presents a flat face square-on
        { g: 'polymer', k: 'round', r: 0.0205, n: 6, z0: -0.392, z1: -0.196, ch: 0.004, rz: 0.5236 },
        // three vent slots per flank, as inset dark panels
        { g: 'steel', k: 'rect', w: 0.0022, h: 0.0055, c: 0.0018, z0: -0.360, z1: -0.300, ch: 0.0016, x: 0.0180, rep: { n: 3, dz: 0.0480 } },
        { g: 'steel', k: 'rect', w: 0.0022, h: 0.0055, c: 0.0018, z0: -0.360, z1: -0.300, ch: 0.0016, x: -0.0180, rep: { n: 3, dz: 0.0480 } },
        // barrel and a slotted brake
        { g: 'bright', k: 'round', r: 0.0068, n: 12, z0: -0.502, z1: -0.386, ch: 0.002 },
        { g: 'bright', k: 'round', r: 0.0112, n: 12, z0: -0.520, z1: -0.494, ch: 0.0028, s1: 0.90 },
        { g: 'polymer', k: 'rect', w: 0.0125, h: 0.0018, c: 0.0006, z0: -0.516, z1: -0.508, ch: 0.0006, y: 0.0056 },
        { g: 'polymer', k: 'rect', w: 0.0018, h: 0.0125, c: 0.0006, z0: -0.505, z1: -0.497, ch: 0.0006, x: 0.0056 },
        { g: 'polymer', k: 'rect', w: 0.0018, h: 0.0125, c: 0.0006, z0: -0.505, z1: -0.497, ch: 0.0006, x: -0.0056 },
        // magazine, canted forward
        { g: 'polymer', k: 'rect', w: 0.0125, h: 0.0245, c: 0.005, z0: 0, z1: 0.100, ch: 0.0035, y: -0.020, z: -0.088, rx: 1.6930 },
        { g: 'steel', k: 'rect', w: 0.0138, h: 0.0255, c: 0.004, z0: 0.100, z1: 0.108, ch: 0.0022, y: -0.020, z: -0.088, rx: 1.6930 },
        // grip
        { g: 'polymer', k: 'rect', w: 0.0148, h: 0.0182, c: 0.005, z0: 0, z1: 0.078, ch: 0.0035, y: -0.021, z: 0.010, rx: 1.2392 },
        { g: 'bright', k: 'rect', w: 0.0155, h: 0.0188, c: 0.005, z0: 0.024, z1: 0.028, ch: 0.001, y: -0.021, z: 0.010, rx: 1.2392, rep: { n: 3, dz: 0.0155 } },
        // skeleton stub stock: two rails and a butt plate, all behind the receiver
        { g: 'steel', k: 'rect', w: 0.0038, h: 0.0042, c: 0.0012, z0: 0.018, z1: 0.062, ch: 0.0012, x: 0.0135, y: 0.0125 },
        { g: 'steel', k: 'rect', w: 0.0038, h: 0.0042, c: 0.0012, z0: 0.018, z1: 0.062, ch: 0.0012, x: -0.0135, y: 0.0125 },
        { g: 'steel', k: 'rect', w: 0.0038, h: 0.0042, c: 0.0012, z0: 0.018, z1: 0.062, ch: 0.0012, y: -0.0125 },
        { g: 'polymer', k: 'rect', w: 0.0175, h: 0.0215, c: 0.006, z0: 0.058, z1: 0.068, ch: 0.0035, y: 0.002 },
        // trigger guard and blade
        { g: 'polymer', k: 'rect', w: 0.0048, h: 0.0042, c: 0.0015, z0: -0.040, z1: 0.004, ch: 0.0016, y: -0.049 },
        { g: 'bright', k: 'rect', w: 0.0020, h: 0.0062, c: 0.001, z0: -0.024, z1: -0.015, ch: 0.0009, y: -0.034 },
        // sights: a rear ring on the rail, a front post at z = -sight
        { g: 'steel', k: 'round', r: 0.0092, n: 10, z0: -0.052, z1: -0.036, ch: 0.0022, y: 0.0355 },
        { g: 'bright', k: 'rect', w: 0.0028, h: 0.0058, c: 0.001, z0: -0.464, z1: -0.456, ch: 0.001, y: 0.0135 },
        { g: 'steel', k: 'rect', w: 0.0075, h: 0.0038, c: 0.0012, z0: -0.470, z1: -0.450, ch: 0.0012, y: 0.0090 },
      ]),
    }),

    // ---- BREACHER — the only TWO-TUBE silhouette in the set: a fat barrel with
    //      a magazine tube slung under it and a ribbed pump around that. Short,
    //      deep, and unmistakable at a glance in the dark.
    breacher: Object.freeze({
      notch: Object.freeze({ x: -0.0345, y: 0.0130, z: -0.044, dz: -0.0165 }),
      parts: Object.freeze([
        { g: 'steel', k: 'rect', w: 0.0345, h: 0.0375, c: 0.009, z0: -0.150, z1: 0.034, ch: 0.006 },
        // loading port, underneath
        { g: 'polymer', k: 'rect', w: 0.0155, h: 0.0026, c: 0.0015, z0: -0.116, z1: -0.044, ch: 0.002, y: -0.0365 },
        // ejection port, right flank
        { g: 'polymer', k: 'rect', w: 0.0026, h: 0.0125, c: 0.0026, z0: -0.104, z1: -0.046, ch: 0.002, x: 0.0338, y: 0.0095 },
        // upper barrel
        { g: 'bright', k: 'round', r: 0.0198, n: 14, z0: -0.402, z1: -0.142, ch: 0.0035, y: 0.0075 },
        // flared choke
        { g: 'bright', k: 'round', r: 0.0202, n: 14, z0: -0.420, z1: -0.396, ch: 0.003, y: 0.0075, s0: 1.0, s1: 1.28 },
        // magazine tube, slung under it — the second tube
        { g: 'steel', k: 'round', r: 0.0152, n: 12, z0: -0.376, z1: -0.142, ch: 0.003, y: -0.0395 },
        { g: 'bright', k: 'round', r: 0.0166, n: 12, z0: -0.388, z1: -0.372, ch: 0.0028, y: -0.0395 },
        // pump / forend, ribbed
        { g: 'polymer', k: 'rect', w: 0.0305, h: 0.0245, c: 0.008, z0: -0.340, z1: -0.226, ch: 0.006, y: -0.0345 },
        { g: 'bright', k: 'rect', w: 0.0312, h: 0.0252, c: 0.008, z0: -0.0035, z1: 0.0035, ch: 0.0011, y: -0.0345, z: -0.322, rep: { n: 6, dz: 0.0165 } },
        // barrel band tying the two tubes together
        { g: 'steel', k: 'rect', w: 0.0190, h: 0.0082, c: 0.0022, z0: -0.382, z1: -0.368, ch: 0.0025, y: -0.0155 },
        // top rib and its bead sight — the bead tip is at z = -sight
        { g: 'steel', k: 'rect', w: 0.0062, h: 0.0028, c: 0.0009, z0: -0.394, z1: -0.158, ch: 0.0012, y: 0.0282 },
        { g: 'bright', k: 'round', r: 0.0038, n: 8, z0: -0.364, z1: -0.356, ch: 0.0012, y: 0.0322 },
        // grip and comb
        { g: 'polymer', k: 'rect', w: 0.0205, h: 0.0245, c: 0.006, z0: 0, z1: 0.088, ch: 0.004, y: -0.030, z: 0.020, rx: 1.3208 },
        { g: 'steel', k: 'rect', w: 0.0218, h: 0.0255, c: 0.005, z0: 0.088, z1: 0.096, ch: 0.0025, y: -0.030, z: 0.020, rx: 1.3208 },
        { g: 'polymer', k: 'rect', w: 0.0195, h: 0.0225, c: 0.007, z0: 0.030, z1: 0.076, ch: 0.005, y: 0.0135 },
        { g: 'bright', k: 'rect', w: 0.0202, h: 0.0232, c: 0.007, z0: 0.044, z1: 0.0475, ch: 0.0011, y: 0.0135, rep: { n: 3, dz: 0.0115 } },
        // trigger guard and blade
        { g: 'polymer', k: 'rect', w: 0.0062, h: 0.0050, c: 0.0018, z0: -0.050, z1: 0.004, ch: 0.0018, y: -0.0635 },
        { g: 'bright', k: 'rect', w: 0.0024, h: 0.0072, c: 0.0011, z0: -0.030, z1: -0.020, ch: 0.001, y: -0.0465 },
      ]),
    }),

    // ---- LANCE — long and thin with a heavy optic riding high on two rings.
    //      Nothing else in the set has mass above the bore, so it reads from the
    //      top edge of its silhouette alone.
    lance: Object.freeze({
      notch: Object.freeze({ x: -0.0205, y: 0.0040, z: -0.058, dz: -0.0175 }),
      parts: Object.freeze([
        { g: 'steel', k: 'rect', w: 0.0205, h: 0.0225, c: 0.0055, z0: -0.216, z1: 0.028, ch: 0.004 },
        // scope: eyepiece, tube, objective bell, and two rings
        { g: 'steel', k: 'round', r: 0.0225, n: 14, z0: -0.022, z1: 0.012, ch: 0.003, y: 0.0555, s0: 0.92 },
        { g: 'polymer', k: 'round', r: 0.0172, n: 14, z0: -0.158, z1: -0.020, ch: 0.0028, y: 0.0555 },
        { g: 'steel', k: 'round', r: 0.0242, n: 14, z0: -0.196, z1: -0.156, ch: 0.0032, y: 0.0555, s0: 1.0, s1: 0.94 },
        { g: 'bright', k: 'round', r: 0.0225, n: 14, z0: -0.200, z1: -0.194, ch: 0.0018, y: 0.0555 },
        { g: 'steel', k: 'rect', w: 0.0092, h: 0.0175, c: 0.0035, z0: -0.062, z1: -0.044, ch: 0.0028, y: 0.0355 },
        { g: 'steel', k: 'rect', w: 0.0092, h: 0.0175, c: 0.0035, z0: -0.140, z1: -0.122, ch: 0.0028, y: 0.0355 },
        // elevation turret, sticking out of the top of the tube
        { g: 'bright', k: 'round', r: 0.0092, n: 10, z0: 0, z1: 0.020, ch: 0.0022, y: 0.0705, z: -0.098, rx: -1.5708 },
        // bolt handle out the right — a second unmistakable silhouette cue
        { g: 'bright', k: 'round', r: 0.0052, n: 10, z0: 0, z1: 0.042, ch: 0.0018, x: 0.0195, y: 0.0075, z: -0.046, ry: 1.5708 },
        { g: 'bright', k: 'round', r: 0.0085, n: 10, z0: 0.038, z1: 0.052, ch: 0.002, x: 0.0195, y: 0.0075, z: -0.046, ry: 1.5708 },
        // barrel: long, thin, fluted, with a slotted brake
        { g: 'bright', k: 'round', r: 0.0092, n: 12, z0: -0.628, z1: -0.208, ch: 0.0025, s0: 0.86 },
        { g: 'polymer', k: 'rect', w: 0.0016, h: 0.0035, c: 0.0012, z0: -0.560, z1: -0.300, ch: 0.0025, x: 0.0086 },
        { g: 'polymer', k: 'rect', w: 0.0016, h: 0.0035, c: 0.0012, z0: -0.560, z1: -0.300, ch: 0.0025, x: -0.0086 },
        { g: 'polymer', k: 'rect', w: 0.0035, h: 0.0016, c: 0.0012, z0: -0.560, z1: -0.300, ch: 0.0025, y: 0.0086 },
        { g: 'bright', k: 'round', r: 0.0138, n: 12, z0: -0.680, z1: -0.622, ch: 0.003 },
        { g: 'polymer', k: 'rect', w: 0.0145, h: 0.0020, c: 0.0007, z0: -0.668, z1: -0.658, ch: 0.0007, y: 0.0062, rep: { n: 3, dz: 0.0155 } },
        // magazine
        { g: 'polymer', k: 'rect', w: 0.0115, h: 0.0195, c: 0.004, z0: 0, z1: 0.064, ch: 0.0032, y: -0.019, z: -0.088, rx: 1.5708 },
        { g: 'steel', k: 'rect', w: 0.0128, h: 0.0205, c: 0.0035, z0: 0.064, z1: 0.071, ch: 0.002, y: -0.019, z: -0.088, rx: 1.5708 },
        // grip
        { g: 'polymer', k: 'rect', w: 0.0142, h: 0.0175, c: 0.005, z0: 0, z1: 0.080, ch: 0.0035, y: -0.019, z: 0.012, rx: 1.2216 },
        { g: 'bright', k: 'rect', w: 0.0148, h: 0.0182, c: 0.005, z0: 0.026, z1: 0.030, ch: 0.001, y: -0.019, z: 0.012, rx: 1.2216, rep: { n: 3, dz: 0.0165 } },
        // skeleton stock with a thumbhole: spine, underrail, comb, butt
        { g: 'steel', k: 'rect', w: 0.0052, h: 0.0068, c: 0.0018, z0: 0.024, z1: 0.070, ch: 0.0016, y: 0.0135 },
        { g: 'steel', k: 'rect', w: 0.0052, h: 0.0055, c: 0.0016, z0: 0.024, z1: 0.070, ch: 0.0016, y: -0.0165 },
        { g: 'polymer', k: 'rect', w: 0.0092, h: 0.0072, c: 0.0025, z0: 0.020, z1: 0.062, ch: 0.0022, y: 0.0265 },
        { g: 'polymer', k: 'rect', w: 0.0155, h: 0.0225, c: 0.006, z0: 0.062, z1: 0.072, ch: 0.0035, y: 0.0055 },
        // trigger guard and blade
        { g: 'polymer', k: 'rect', w: 0.0045, h: 0.0042, c: 0.0015, z0: -0.044, z1: 0.002, ch: 0.0016, y: -0.0455 },
        { g: 'bright', k: 'rect', w: 0.0020, h: 0.0062, c: 0.001, z0: -0.028, z1: -0.019, ch: 0.0009, y: -0.0315 },
      ]),
    }),
  }),
});

const M = MODEL_TABLE;
const GROUPS = M.groupOrder;

// ---------------------------------------------------------------------------
// The builder. Positions and flat normals into growable arrays, then frozen
// into typed arrays once. Nothing here runs per frame — `viewmodel.js` calls it
// exactly once, at construction, for all four weapons.
// ---------------------------------------------------------------------------

function newBuilder() {
  return { pos: [], nrm: [], idx: [] };
}

/**
 * One convex polygon, CCW when seen from outside. The normal is computed from
 * the winding, so a face that ends up dark is a winding bug and not a lighting
 * one — which is the whole reason not to hand-author normals.
 */
function addFace(b, v) {
  const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
  const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz);
  if (!(l > 1e-12)) return;                       // degenerate: drop it silently
  nx /= l; ny /= l; nz /= l;
  const base = b.pos.length / 3;
  for (let i = 0; i < v.length; i++) {
    b.pos.push(v[i][0], v[i][1], v[i][2]);
    b.nrm.push(nx, ny, nz);
  }
  for (let i = 2; i < v.length; i++) b.idx.push(base, base + i - 1, base + i);
}

/** The cross-section, in the part's own XY, shrunk by `s` and scaled by `k`. */
function section(part, shrink, k) {
  const out = [];
  if (part.k === 'round') {
    const n = part.n || 12;
    const r = Math.max(1e-4, part.r * k - shrink);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return out;
  }
  const w = Math.max(1e-4, part.w * k - shrink);
  const h = Math.max(1e-4, part.h * k - shrink);
  const c = Math.min(part.c || 0, w * 0.49, h * 0.49);
  out.push([w - c, -h], [w, -h + c], [w, h - c], [w - c, h],
    [-w + c, h], [-w, h - c], [-w, -h + c], [-w + c, -h]);
  return out;
}

/** Euler XYZ, applied as Rx·Ry·Rz, then translate. Written out to allocate nothing. */
function place(part, x, y, z, out) {
  const rx = part.rx || 0, ry = part.ry || 0, rz = part.rz || 0;
  let px = x, py = y, pz = z;
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); const nx = px * c - py * s; py = px * s + py * c; px = nx; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); const nx = px * c + pz * s; pz = -px * s + pz * c; px = nx; }
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); const ny = py * c - pz * s; pz = py * s + pz * c; py = ny; }
  out[0] = px + (part.x || 0);
  out[1] = py + (part.y || 0);
  out[2] = pz + (part.z || 0);
  return out;
}

/** One end-chamfered extruded prism. Four rings, two caps, flat normals. */
function addPart(b, part, zOffset) {
  const z0 = part.z0 + zOffset, z1 = part.z1 + zOffset;
  const span = z1 - z0;
  const ch = Math.min(part.ch === undefined ? 0 : part.ch, span * 0.45);
  const s0 = part.s0 === undefined ? 1 : part.s0;
  const s1 = part.s1 === undefined ? 1 : part.s1;
  const zs = [z0, z0 + ch, z1 - ch, z1];
  const shrink = [ch, 0, 0, ch];
  const rings = [];
  const tmp = [0, 0, 0];
  for (let r = 0; r < 4; r++) {
    const t = span > 1e-9 ? (zs[r] - z0) / span : 0;
    const pts = section(part, shrink[r], s0 + (s1 - s0) * t);
    const ring = [];
    for (let i = 0; i < pts.length; i++) {
      place(part, pts[i][0], pts[i][1], zs[r], tmp);
      ring.push([tmp[0], tmp[1], tmp[2]]);
    }
    rings.push(ring);
  }
  const n = rings[0].length;
  for (let r = 0; r < 3; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      addFace(b, [A[i], A[j], B[j], B[i]]);
    }
  }
  addFace(b, rings[3].slice());                    // +Z cap
  addFace(b, rings[0].slice().reverse());          // -Z cap
}

function finish(b) {
  return {
    position: new Float32Array(b.pos),
    normal: new Float32Array(b.nrm),
    index: b.idx.length > 65535 ? new Uint32Array(b.idx) : new Uint16Array(b.idx),
    triangles: b.idx.length / 3,
  };
}

/**
 * Build one weapon.
 *
 * Returns `{ groups: { polymer, steel, bright }, notches: [4 mesh data] }` —
 * three merged surface geometries (one draw call each, whatever the part count)
 * and four separate readout blocks, because a reserve you cannot COUNT is a
 * brightness ramp, and a brightness ramp is unreadable through a 17x gain range
 * and a deuteran eye alike.
 */
export function buildWeapon(id) {
  const spec = M.weapons[id];
  if (!spec) throw new Error(`models: no weapon '${id}'`);
  const builders = { polymer: newBuilder(), steel: newBuilder(), bright: newBuilder() };
  for (const part of spec.parts) {
    const b = builders[part.g] || builders.steel;
    const rep = part.rep;
    const n = rep ? rep.n : 1;
    for (let i = 0; i < n; i++) addPart(b, part, rep ? rep.dz * i : 0);
  }
  const groups = {};
  for (const g of GROUPS)groups[g] = finish(builders[g]);

  const N = M.notch;
  const notches = [];
  for (let i = 0; i < 4; i++) {
    const b = newBuilder();
    addPart(b, {
      k: 'rect', w: N.d * 0.5, h: N.h, c: N.c, ch: N.ch,
      z0: -N.w, z1: N.w,
      x: spec.notch.x - N.proud, y: spec.notch.y, z: spec.notch.z + spec.notch.dz * i,
      ry: Math.PI / 2,
    }, 0);
    notches.push(finish(b));
  }
  return { groups, notches };
}

/** Every weapon, built once. */
export function buildAll(ids) {
  const out = {};
  for (const id of ids) out[id] = buildWeapon(id);
  return out;
}

/**
 * The axis-aligned bounds of a weapon's surface geometry, in weapon space.
 * The fast tier asserts silhouettes off this without a GPU: four weapons whose
 * bounding boxes agree are four weapons the player cannot tell apart.
 */
export function boundsOf(built) {
  const bb = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity, triangles: 0 };
  for (const g of GROUPS){
    const d = built.groups[g];
    bb.triangles += d.triangles;
    const p = d.position;
    for (let i = 0; i < p.length; i += 3) {
      if (p[i] < bb.minX) bb.minX = p[i];
      if (p[i] > bb.maxX) bb.maxX = p[i];
      if (p[i + 1] < bb.minY) bb.minY = p[i + 1];
      if (p[i + 1] > bb.maxY) bb.maxY = p[i + 1];
      if (p[i + 2] < bb.minZ) bb.minZ = p[i + 2];
      if (p[i + 2] > bb.maxZ) bb.maxZ = p[i + 2];
    }
  }
  return bb;
}

export default buildWeapon;
