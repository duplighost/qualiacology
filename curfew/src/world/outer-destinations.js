// Three outer-county expeditions. Geometry and collision share the same authored
// measurements. Long sightlines invite entry; side aisles and ordinary stairs reward it.
// No independent lights or materials: these reuse places' warmed, merged kit.
import * as THREE from 'three';

const P = Object.freeze({
  iron: [0.064, 0.072, 0.075], rust: [0.102, 0.057, 0.035],
  stone: [0.079, 0.083, 0.078], moss: [0.040, 0.062, 0.052],
  dark: [0.027, 0.030, 0.032], wood: [0.076, 0.052, 0.033],
  bone: [0.125, 0.123, 0.099], glass: [0.041, 0.076, 0.084],
  copper: [0.114, 0.080, 0.043], earth: [0.040, 0.043, 0.032],
});
const Y = 0.16;
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3(), _q = new THREE.Quaternion();

// These are also the authored route probes. Stairs have sub-STEP_UP rises and
// real upper slabs; entering a destination never needs a teleport or camera pan.
export const OUTER_ROUTES = Object.freeze({
  glasshouse: { entrance: [0, 31, Y], floor: [0, -48, Y], loot: [[-24, -36], [24, -16], [-24, 12], [0, -55]] },
  'bell-vault': { entrance: [0, 31, Y], floor: [0, -45, Y],
    stair: { x: 16, startZ: 17, endZ: -8.6, base: Y, top: 5.2, count: 32, width: 4.4 },
    loot: [[-17, -38], [-17, 8], [0, -50]], upperLoot: [16, -24, 5.2] },
  'red-quarry': { entrance: [0, 31, Y], floor: [0, -45, Y],
    stair: { x: 26, startZ: 23, endZ: -14.6, base: Y, top: 7.2, count: 47, width: 4.4 },
    loot: [[-25, -39], [-14, 12], [7, -48]], upperLoot: [26, -30, 7.2] },
});

function member(s, a, b, radius, col, segments = 6) {
  _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _dir.length();
  if (len < 0.001) return;
  const g = new THREE.CylinderGeometry(radius, radius, len, segments);
  _q.setFromUnitVectors(_up, _dir.normalize()); g.applyQuaternion(_q);
  g.translate((a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5);
  s.push(g, col);
}

function slab(k, api, x, z, w, d, top, col, thickness = .22) {
  const y = api.padY + top;
  k.solid.box(w, thickness, d, x, y - thickness * .5, z, col);
  // Collision deliberately rejects prop AABBs larger than 48 m. A whole floor
  // emitted as one box therefore looked solid but left the feet under it. Tile
  // the support beneath the one merged visual slab, with shared exact edges.
  const nx = Math.ceil(w / 40), nz = Math.ceil(d / 40);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    api.emit({ kind: 'obb', x: x - w * .5 + (ix + .5) * w / nx,
      z: z - d * .5 + (iz + .5) * d / nz, halfX: w / nx * .5, halfZ: d / nz * .5, yaw: 0,
      y0: y - thickness, y1: y, tag: 'stone', standable: true, climbable: false });
  }
}

function post(k, api, x, z, r, h, col, groundY) {
  const y = groundY(api, x, z) + .08;
  k.solid.cyl(r * .82, r, h, 8, x, y + h * .5, z, col);
  api.emit({ kind: 'circle', x, z, r, y0: y - .3, y1: y + h, tag: 'wall' });
}

function arch(k, api, z, half, rise, spring, thickness, col, groundY) {
  for (const x of [-half, half]) post(k, api, x, z, thickness, spring, col, groundY);
  const y = api.padY + .08 + spring;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI, b = (i + 1) / 16 * Math.PI;
    member(k.solid, [Math.cos(a) * half, y + Math.sin(a) * rise, z],
      [Math.cos(b) * half, y + Math.sin(b) * rise, z], thickness, col, 8);
  }
  // The arch crown is above the entire walking envelope. The side shafts are
  // separately collidable; a full wall AABB here would seal the open passage.
  for (const side of [-1, 1]) api.emit({ kind: 'obb', x: side * half * .5, z,
    halfX: half * .5, halfZ: thickness, yaw: 0,
    y0: y + rise * .78, y1: y + rise + thickness, tag: 'wall' });
}

function lamp(k, x, y, z, tint = [1, 1, 1]) {
  k.solid.cyl(.19, .23, .10, 8, x, y + .32, z, P.iron);
  k.solid.cyl(.21, .17, .09, 8, x, y - .04, z, P.iron);
  k.glow.cyl(.085, .085, .28, 8, x, y + .14, z, tint);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI * .5;
    k.solid.cyl(.022, .022, .34, 5, x + Math.sin(a) * .17, y + .13, z + Math.cos(a) * .17, P.iron);
  }
}

function chest(k, api, x, z, top = Y, strong = false) {
  const y = api.padY + top, s = k.solid, h = strong ? .60 : .80;
  s.open();
  s.box(1.14, h, .80, x, y + h * .5, z, P.wood);
  for (let i = 0; i < 5; i++) s.box(.018, h * .84, .014, x - .45 + i * .225, y + h * .5, z + .407, P.dark);
  for (const dx of [-.40, .40]) s.box(.082, h + .065, .84, x + dx, y + h * .5, z, strong ? P.iron : P.copper);
  s.box(1.18, .09, .84, x, y + h + .01, z, P.wood);
  s.box(.15, .19, .07, x, y + h * .68, z + .44, P.copper);
  s.close(x, z, .95, P.wood);
  api.emit({ kind: 'obb', x, z, halfX: .59, halfZ: .44, yaw: 0,
    y0: y, y1: y + h + .07, tag: strong ? 'strongbox' : 'crate', standable: true, breakable: true });
}

function stair(k, api, spec) {
  const run = (spec.startZ - spec.endZ) / spec.count;
  const rise = (spec.top - spec.base) / spec.count;
  for (let i = 0; i < spec.count; i++) {
    const z = spec.startZ - run * (i + .5), h = spec.base + rise * (i + 1);
    slab(k, api, spec.x, z, spec.width, run + .025, h, P.stone, .20);
    // A visible weathered nosing makes a real stair legible in the torch beam.
    k.solid.box(spec.width, .045, .055, spec.x, api.padY + h + .002, z + run * .5 - .03, P.copper);
  }
  for (const side of [-1, 1]) {
    const x = spec.x + side * (spec.width * .5 + .08);
    member(k.solid, [x, api.padY + spec.base + .85, spec.startZ],
      [x, api.padY + spec.top + .85, spec.endZ], .06, P.iron);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, z = spec.startZ + (spec.endZ - spec.startZ) * t;
      const h = spec.base + (spec.top - spec.base) * t;
      k.solid.cyl(.06, .06, .92, 6, x, api.padY + h + .46, z, P.iron);
    }
  }
}

function result(k, glowColour, cast = null) {
  return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour, cast };
}

export function makeOuterBuilders({ kits, GLOW, groundY }) {
  return {
    glasshouse: {
      landmark(api) {
        const k = kits(), y = api.padY;
        // Eighty-eight metres of curved iron, split into three aisles. The missing
        // panes leave actual holes in the roof through which the forest and sky show.
        for (let i = 0; i < 12; i++) {
          const z = 30 - i * 8;
          arch(k, api, z, 25, 15, 4.2, .23, P.iron, groundY);
          for (const x of [-10, 10]) post(k, api, x, z, .17, 15.8, P.iron, groundY);
          if (i < 11) for (const x of [-25, 25, -10, 10]) {
            member(k.solid, [x, y + (Math.abs(x) > 20 ? 4.28 : 15.88), z],
              [x, y + (Math.abs(x) > 20 ? 4.28 : 15.88), z - 8], .12, P.iron);
          }
          if (i % 3 === 0) lamp(k, 0, y + 16.6, z, [.60, .96, .86]);
          // Remaining roof shards are solid tinted glass, never transparent fog sheets.
          if (i % 3 !== 1) for (const sx of [-1, 1]) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
              sx * 24.4, y + 6.4, z - .5, sx * 20.4, y + 12.4, z - .5,
              sx * 21.6, y + 10.9, z - 5.4,
            ], 3));
            g.computeVertexNormals(); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .7, 1], 2));
            g.setIndex([0, 1, 2]);
            k.solid.push(g, P.glass);
          }
        }
        return result(k, GLOW.wisp);
      },
      body(api) {
        const k = kits(), y = api.padY;
        slab(k, api, 0, -14, 56, 94, Y, P.dark);
        // Broken growing beds leave clear 5 m side routes and a 9 m central aisle.
        for (const x of [-17, 17]) for (const z of [19, -1, -21, -41]) {
          slab(k, api, x, z, 7, 11, .69, P.moss, .53);
          k.solid.box(6.6, .07, 10.6, x, y + .70, z, P.earth);
          for (let n = 0; n < 7; n++) {
            const px = x + Math.sin(n * 2.7 + z) * 2.3, pz = z - 4 + n * 1.3;
            const h = 1.4 + (n % 3) * .47;
            member(k.solid, [px, y + .72, pz], [px + .3, y + h + .72, pz - .4], .06, P.moss);
            for (const side of [-1, 1]) {
              k.solid.cone(.32, .8, 5, px + side * .27, y + h * .72, pz, P.moss, 0, 0, side * .8);
            }
          }
        }
        // Empty linen cocoons hang in the upper aisle. Their distinct skull and shoulder
        // cavities read when the torch travels upward; they never occupy a walking route.
        for (const [x, z, h] of [[-6, 10, 6.4], [7, -12, 7.2], [-5, -36, 5.6]]) {
          member(k.solid, [x, y + h + 2.5, z], [x, y + 15, z], .028, P.iron);
          k.solid.cyl(.32, .07, 1.8, 9, x, y + h + .9, z, P.bone, 0, 0, .12);
          k.solid.cyl(.08, .48, .58, 9, x, y + h + 1.9, z, P.bone);
          k.solid.at(new THREE.SphereGeometry(.22, 10, 8), P.dark, x, y + h + 2.27, z + .14);
          for (let n = 0; n < 5; n++) member(k.solid, [x, y + h, z],
            [x + Math.sin(n * 2.4) * .38, y + h - .8 - n * .17, z + Math.cos(n * 2.4) * .3], .025, P.moss);
        }
        for (const [i, p] of OUTER_ROUTES.glasshouse.loot.entries()) chest(k, api, p[0], p[1], Y, i === 3);
        for (const z of [22, 2, -18, -38, -54]) for (const x of [-7, 7]) lamp(k, x, y + 1.7, z);
        return result(k, GLOW.wisp, [
          { species: 'standing', lx: -7, lz: -43, ly: Y, awake: false },
          { species: 'pale', lx: 21, lz: -28, ly: Y, awake: false },
        ]);
      },
    },
    'bell-vault': {
      landmark(api) {
        const k = kits(), y = api.padY;
        // Repeated open ribs make a ruined nave nearly a hundred metres deep.
        for (let i = 0; i < 9; i++) {
          const z = 30 - i * 11;
          arch(k, api, z, 22, 18, 7, 1.05, i % 3 === 0 ? P.moss : P.stone, groundY);
          for (const sx of [-1, 1]) {
            const x = sx * 26;
            post(k, api, x, z, 1.0, 13 + (i % 2) * 2, P.stone, groundY);
            member(k.solid, [sx * 22, y + 18, z], [x, y + 10, z], .54, P.stone);
          }
        }
        for (let i = 0; i < 5; i++) {
          const z = 19 - i * 14, h = 14 + (i % 3) * 2.1;
          member(k.solid, [0, y + h + 2, z], [0, y + 25, z], .07, P.iron);
          k.solid.tube(.46, 1.6, 2.1, 18, 0, y + h, z, P.copper);
          k.solid.at(new THREE.TorusGeometry(1.58, .12, 5, 20), P.copper, 0, y + h - 1.05, z, 0, Math.PI * .5);
          k.solid.cyl(.09, .18, 2.5, 7, 0, y + h -.5, z, P.iron);
          lamp(k, 0, y + h + 1.25, z);
        }
        return result(k, GLOW.cold);
      },
      body(api) {
        const k = kits(), y = api.padY;
        slab(k, api, 0, -14, 58, 94, Y, P.stone);
        for (const z of [18, 0, -18, -38]) {
          // Broken west chapels have two doors each and do not seal the nave.
          for (const pz of [z - 5, z + 5]) {
            k.solid.box(10, 2.2, .8, -20, y + 1.18, pz, P.moss);
            api.emit({ kind: 'obb', x: -20, z: pz, halfX: 5, halfZ: .4, yaw: 0,
              y0: y + .08, y1: y + 2.28, tag: 'wall' });
          }
          slab(k, api, -22, z, 3, 2.1, .96, P.dark, .8);
          for (let n = 0; n < 5; n++) k.solid.cyl(.045, .07, .34 + n * .055, 7,
            -23 + n * .46, y + 1.14, z, P.bone);
        }
        const route = OUTER_ROUTES['bell-vault']; stair(k, api, route.stair);
        slab(k, api, 16, -30, 6.2, 42.8, 5.2, P.stone, .45);
        // A parapet is a rail, never a waist-high solid across the stair landing.
        for (const x of [12.9, 19.1]) {
          for (let z = -12; z >= -50; z -= 4) post(k, { ...api, heightAt: () => y + 5.12 }, x, z, .11, 1.05, P.iron, groundY);
          member(k.solid, [x, y + 6.12, -10], [x, y + 6.12, -51], .07, P.iron);
        }
        for (const [i, p] of route.loot.entries()) chest(k, api, p[0], p[1], Y, i === 2);
        chest(k, api, route.upperLoot[0], route.upperLoot[1], route.upperLoot[2], true);
        for (const z of [25, 5, -15, -35, -53]) lamp(k, 0, y + .65, z);
        return result(k, GLOW.cold, [
          { species: 'pallbearer', lx: -19, lz: -18, ly: Y, awake: false },
          { species: 'standing', lx: 6, lz: -44, ly: Y, awake: false },
        ]);
      },
    },
    'red-quarry': {
      landmark(api) {
        const k = kits(), y = api.padY;
        for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
          const z = 22 - i * 10, x = side * (43 + Math.sin(i * 2.4) * 3);
          const h = 20 + (i % 4) * 5.2, r = 3.4 + (i % 3) * .65;
          const g = groundY(api, x, z);
          const geo = new THREE.CylinderGeometry(r * .58, r, h, 9, 6);
          const v = geo.attributes.position;
          for (let n = 0; n < v.count; n++) {
            const a = Math.atan2(v.getZ(n), v.getX(n)), q = v.getY(n) / h + .5;
            const rough = 1 + .13 * Math.sin(a * 3 + q * 9 + i) + .08 * Math.sin(a * 7 - q * 16);
            const top = q > .99 ? Math.sin(a * 4 + i) * 1.3 : 0;
            v.setXYZ(n, v.getX(n) * rough + Math.sin(q * 3 + i) * q * .7,
              v.getY(n) + top, v.getZ(n) * rough * 1.5);
          }
          geo.computeVertexNormals();
          k.solid.at(geo, i % 3 ? P.rust : P.dark, x, g + h * .5, z, i * .31);
          api.emit({ kind: 'obb', x, z, halfX: r * 1.2 + .7, halfZ: r * 1.8, yaw: i * .31,
            y0: g - .3, y1: g + h + 1.3, tag: 'stone' });
        }
        // Three abandoned lifting frames, with a six-metre stone hanging in the last.
        for (const z of [24, -10, -44]) {
          for (const x of [-29, 29]) post(k, api, x, z, .53, 27, P.iron, groundY);
          member(k.solid, [-29, y + 27, z], [29, y + 27, z], .52, P.rust);
          for (const side of [-1, 1]) member(k.solid, [side * 29, y + 20, z], [side * 21, y + 27, z], .27, P.iron);
          lamp(k, 0, y + 27.7, z);
        }
        for (const x of [-2.4, 2.4]) member(k.solid, [x, y + 18, -44], [x, y + 27, -44], .10, P.iron);
        k.solid.cyl(2.8, 3.5, 6, 7, 0, y + 15, -44, P.rust, .3, .05, -.08);
        api.emit({ kind: 'circle', x: 0, z: -44, r: 3.7, y0: y + 11.7, y1: y + 18.3, tag: 'stone' });
        return result(k, GLOW.ember);
      },
      body(api) {
        const k = kits(), y = api.padY;
        slab(k, api, 0, -14, 68, 94, Y, P.dark);
        // Extraction cuts form low, inspectable bays with breaks between them.
        for (const z of [14, -4, -23, -44]) {
          for (let i = 0; i < 3; i++) {
            const x = -26 + i * 3.4, h = .5 + (i % 2) * .65;
            slab(k, api, x, z + i * .7, 2.9, 5, h, P.rust, h - .05);
          }
          for (const x of [-9, 9]) {
            k.solid.box(.09, .055, 12, x, y + .195, z, P.iron);
            for (let n = 0; n < 6; n++) k.solid.box(2.1, .06, .19, x, y + .18, z - 5 + n * 2, P.wood);
          }
        }
        const route = OUTER_ROUTES['red-quarry']; stair(k, api, route.stair);
        slab(k, api, 26, -36, 6.2, 42.8, 7.2, P.wood, .4);
        for (const x of [22.9, 29.1]) {
          for (let z = -18; z >= -54; z -= 4) post(k, { ...api, heightAt: () => y + 7.12 }, x, z, .10, 1.05, P.iron, groundY);
          member(k.solid, [x, y + 8.1, -16], [x, y + 8.1, -57], .06, P.iron);
        }
        // The platform actually has visible legs down to the quarry floor.
        for (const z of [-18, -34, -52]) for (const x of [23.5, 28.5]) post(k, api, x, z, .23, 7.0, P.wood, groundY);
        for (const [i, p] of route.loot.entries()) chest(k, api, p[0], p[1], Y, i === 2);
        chest(k, api, route.upperLoot[0], route.upperLoot[1], route.upperLoot[2], true);
        for (const z of [25, 4, -17, -38, -54]) lamp(k, -6, y + 1.2, z);
        return result(k, GLOW.ember, [
          { species: 'hunter', lx: -14, lz: -31, ly: Y, awake: false },
          { species: 'hound', lx: 11, lz: -46, ly: Y, awake: false },
        ]);
      },
    },
  };
}
