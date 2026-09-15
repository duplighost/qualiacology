// CURFEW — THREE HAMLETS. The Eleven rewire.
//
// ALEX: "more little towns. Not like that big gates town, but places with a few smaller
// houses where people live. Each one very different. They must be related to some unique
// environment. Make 3 of them."
//
// So: not a second Holdfast. No gate, no toll, no guards, no walls. Four or five houses, one
// warm chimney, somebody who will talk to you, and ground that could not be anywhere else in
// the county. Each one is a place you drive past and stop at, and the reason you stop is the
// environment, not a quest marker.
//
//   EELWATER   fen. Five houses on timber stilts over black water. The boards are the only
//              path and the gaps between them are real. Eel traps, a smokehouse with the one
//              warm chimney, and a bell buoy that answers the wind.
//   THE CUT    ridge. Cottages built into a quarry face on two terraces, a rope hoist, a lime
//              kiln that is the only light, stone dust on everything, and a ramp the car can
//              climb to the lower terrace.
//   HIGHWOOD   pines. Four platforms six to nine metres up in the big trees, rope bridges
//              between them, a winch basket, and the Halloween party still up on every rail:
//              jack-o-lanterns, paper skeletons in the windows. Nobody took the costumes off,
//              because you take them off in the morning.
//
// SAME CONTRACT as sites.js's other BUILDERS: { landmark(api), body(api) } returning
// { solid, glow, moving, glowColour }. Every collider is emitted here beside the geometry it
// belongs to, so the two can never drift. Guarded for tests/sites.mjs's stub api, where emit
// returns -1 and heightAt is a constant.
//
// THE FLOORS HAVE TO HOLD. Everything a person can stand on is emitted `standable: true` with
// its top at the y its geometry actually has; tools/standing-check.mjs is the probe.

export function makeHamletBuilders({ kits, C, GLOW, groundY }) {
  // The glow kit takes a LINEAR [r, g, b]; GLOW.* are sRGB hexes and are only for the
  // glowColour a builder returns. Two different things, one letter apart, so they are named.
  const LAMP = [1, 0.70, 0.38];     // a filament behind dirty glass
  const EMBER = [1, 0.48, 0.15];    // fire, a kiln mouth, a cut pumpkin
  const P = {
    board: [0.078, 0.058, 0.040], post: [0.052, 0.040, 0.030],
    tar: [0.030, 0.029, 0.028], water: [0.014, 0.020, 0.022],
    plank: [0.092, 0.072, 0.050], slate: [0.048, 0.050, 0.052],
    lime: [0.148, 0.144, 0.130], dust: [0.120, 0.116, 0.104],
    stone: [0.074, 0.075, 0.070], rope: [0.104, 0.086, 0.056],
    iron: [0.058, 0.064, 0.066], moss: [0.038, 0.058, 0.046],
    pumpkin: [0.240, 0.108, 0.026], paper: [0.230, 0.222, 0.196],
    bark: [0.062, 0.048, 0.036], canvas: [0.126, 0.118, 0.098],
  };

  /** A box and its collider in one call, so geometry and collision cannot disagree. */
  const solid = (k, api, w, h, d, x, y, z, col, yaw, tag, extra) => {
    k.solid.box(w, h, d, x, y, z, col, yaw || 0);
    api.emit(Object.assign({
      kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: yaw || 0,
      y0: y - h * 0.5, y1: y + h * 0.5, tag: tag || 'wood',
    }, extra || null));
  };

  /** A floor you stand on. Its TOP is `top`; the slab hangs below it. */
  const deck = (k, api, w, d, x, top, z, col, yaw, tag) => {
    k.solid.box(w, 0.22, d, x, top - 0.11, z, col, yaw || 0);
    api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: yaw || 0,
      y0: top - 0.34, y1: top, tag: tag || 'wood', standable: true, climbable: false });
  };

  /** A plain gabled shed: four walls, a doorway on -Z, a roof. Returns nothing. */
  const hut = (k, api, x, z, floor, w, d, h, yaw, wallCol, roofCol, doorW = 1.25) => {
    const hw = w * 0.5, hd = d * 0.5;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    // back and sides
    let [px, pz] = at(0, hd);
    solid(k, api, w, h, 0.18, px, floor + h * 0.5, pz, wallCol, yaw, 'wood');
    for (const side of [-1, 1]) {
      [px, pz] = at(side * hw, 0);
      solid(k, api, 0.18, h, d, px, floor + h * 0.5, pz, wallCol, yaw, 'wood');
    }
    // the front, with a doorway cut out of it
    const cheek = (w - doorW) * 0.5;
    for (const side of [-1, 1]) {
      [px, pz] = at(side * (hw - cheek * 0.5), -hd);
      solid(k, api, cheek, h, 0.18, px, floor + h * 0.5, pz, wallCol, yaw, 'wood');
    }
    [px, pz] = at(0, -hd);
    solid(k, api, doorW, h - 2.05, 0.18, px, floor + 2.05 + (h - 2.05) * 0.5, pz, wallCol, yaw, 'wood');
    // the roof: two pitched planes and a ridge
    [px, pz] = at(0, 0);
    for (const side of [-1, 1]) {
      const [rx, rz] = at(0, side * hd * 0.5);
      k.solid.box(w + 0.5, 0.11, d * 0.62, rx, floor + h + 0.46, rz, roofCol, yaw, 0, side * 0.42);
    }
    k.solid.box(w + 0.6, 0.14, 0.24, px, floor + h + 0.90, pz, roofCol, yaw);
    api.emit({ kind: 'obb', x: px, z: pz, halfX: (w + 0.6) * 0.5, halfZ: d * 0.5, yaw,
      y0: floor + h + 0.30, y1: floor + h + 0.98, tag: 'wood', standable: true, climbable: false });
  };

  return {

    /* ==================================================================== EELWATER == */
    // A fen village on stilts. The WATER IS NOT GROUND: it is a dark plane a little above the
    // pad with no collider at all, so the only way across is the boardwalk — which has gaps
    // in it you step over. The houses stand on posts, the lanterns hang on the posts, and
    // the one warm thing is the smokehouse chimney.
    stilts: {
      landmark(api) {
        const k = kits(), y = api.padY;
        // the black water, wide enough that the far edge is under the trees
        k.solid.box(96, 0.05, 96, 0, y + 0.34, 0, P.water);
        // the bell buoy: the far read, and the only thing above the houses
        const bx = -22, bz = -19;
        k.solid.box(1.9, 0.30, 1.9, bx, y + 0.52, bz, P.iron);
        for (const side of [-1, 1]) for (const zz of [-1, 1]) {
          k.solid.box(0.11, 5.4, 0.11, bx + side * 0.62, y + 3.2, bz + zz * 0.62, P.iron, side * zz * 0.05);
        }
        k.solid.box(1.35, 0.20, 1.35, bx, y + 5.9, bz, P.iron);
        k.glow.cyl(0.46, 0.58, 0.88, 12, bx, y + 5.36, bz, LAMP);
        api.emit({ kind: 'circle', x: bx, z: bz, r: 1.1, y0: y, y1: y + 6.0, tag: 'metal' });
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const DECK = 1.45;                 // how high the boards ride over the water
        // THE BOARDWALK. One spine with two spurs, and REAL GAPS: each run is its own deck
        // with a step of clear air between it and the next, so crossing the hamlet is a
        // sequence of small commitments rather than a corridor.
        const runs = [
          [0, -26, 0, -14], [0, -12.2, 0, -1.5], [0, 0.3, 0, 11], [0, 12.8, 0, 22],
          [-1.6, 6, -12, 6], [-13.4, 6, -19, 6],
          [1.6, -6, 12, -6], [13.4, -6, 19, -6],
          [1.6, 15, 11, 15],
        ];
        for (const [x0, z0, x1, z1] of runs) {
          const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
          const len = Math.hypot(x1 - x0, z1 - z0);
          const yaw = Math.atan2(x1 - x0, z1 - z0);
          deck(k, api, 1.9, len, mx, y + DECK, mz, P.board, yaw, 'wood');
          // the posts under it, and a rail on one side only
          const n = Math.max(2, Math.round(len / 3.2));
          for (let i = 0; i <= n; i++) {
            const t = i / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
            k.solid.box(0.17, DECK + 0.9, 0.17, px, y + (DECK + 0.9) * 0.5 - 0.3, pz, P.post);
            if (i % 2 === 0) {
              const rx = px + Math.cos(yaw) * 0.88, rz = pz - Math.sin(yaw) * 0.88;
              k.solid.box(0.09, 0.95, 0.09, rx, y + DECK + 0.48, rz, P.post);
            }
          }
          const rx = mx + Math.cos(yaw) * 0.88, rz = mz - Math.sin(yaw) * 0.88;
          k.solid.box(0.07, 0.08, len, rx, y + DECK + 0.92, rz, P.post, yaw);
        }

        // FIVE HOUSES on their own platforms, each reached off one of the runs.
        const houses = [
          { x: -8.2, z: 6.0, w: 5.4, d: 5.0, h: 2.75, yaw: Math.PI * 0.5 },
          { x: -16.6, z: 6.0, w: 4.8, d: 4.6, h: 2.6, yaw: Math.PI * 0.5 },
          { x: 8.2, z: -6.0, w: 5.2, d: 4.8, h: 2.7, yaw: -Math.PI * 0.5 },
          { x: 16.6, z: -6.0, w: 4.6, d: 4.4, h: 2.55, yaw: -Math.PI * 0.5 },
          { x: 7.6, z: 15.0, w: 5.0, d: 4.6, h: 2.65, yaw: -Math.PI * 0.5 },
        ];
        for (const h of houses) {
          deck(k, api, h.w + 1.8, h.d + 1.8, h.x, y + DECK, h.z, P.board, h.yaw, 'wood');
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            k.solid.box(0.20, DECK + 0.6, 0.20,
              h.x + sx * (h.w * 0.5 + 0.6), y + (DECK + 0.6) * 0.5 - 0.3, h.z + sz * (h.d * 0.5 + 0.6), P.post);
          }
          hut(k, api, h.x, h.z, y + DECK, h.w, h.d, h.h, h.yaw, P.plank, P.tar);
          // one window with its shutter open, on the side that faces the boards
          const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
          const wx = h.x + (-h.d * 0.5 - 0.1) * s, wz = h.z + (-h.d * 0.5 - 0.1) * c;
          k.glow.box(1.10, 0.84, 0.05, wx, y + DECK + 1.58, wz, LAMP, h.yaw);
          // a second window on the long side, so a house reads as lived in from any angle
          k.glow.box(0.05, 0.72, 0.92, h.x + (h.w * 0.5 + 0.1) * c, y + DECK + 1.58,
            h.z - (h.w * 0.5 + 0.1) * s, LAMP, h.yaw);
        }

        // THE SMOKEHOUSE, and its chimney is the one warm thing in the hamlet.
        const sx = -8.4, sz = -18.2;
        deck(k, api, 7.4, 6.6, sx, y + DECK, sz, P.board, 0, 'wood');
        for (const ox of [-1, 1]) for (const oz of [-1, 1]) {
          k.solid.box(0.22, DECK + 0.6, 0.22, sx + ox * 3.2, y + (DECK + 0.6) * 0.5 - 0.3, sz + oz * 2.8, P.post);
        }
        hut(k, api, sx, sz, y + DECK, 5.6, 5.0, 3.1, 0, P.plank, P.tar, 1.4);
        solid(k, api, 1.05, 3.4, 1.05, sx + 1.8, y + DECK + 3.9, sz + 1.6, P.slate, 0.12, 'stone');
        k.glow.box(0.92, 0.42, 0.92, sx + 1.8, y + DECK + 5.62, sz + 1.6, EMBER);
        k.glow.box(1.55, 1.10, 0.06, sx, y + DECK + 1.15, sz - 2.6, EMBER);   // the open door
        k.glow.box(1.10, 0.10, 1.10, sx, y + DECK + 0.02, sz, EMBER);

        // EEL TRAPS: wicker cones on the water, on lines off the posts. Not standable, not
        // in the way — the thing that says what these people eat and how.
        for (let i = 0; i < 14; i++) {
          const a = i * 2.39996;
          const tx = Math.sin(a) * (9 + (i % 5) * 3.6), tz = Math.cos(a) * (11 + (i % 4) * 3.1);
          k.solid.cyl(0.24, 0.10, 0.92, 9, tx, y + 0.62, tz, P.rope, i * 0.4, Math.PI * 0.46, 0);
          k.solid.box(0.06, 0.06, 1.15, tx, y + 0.98, tz, P.post, i * 0.4);
        }
        // the lanterns, hung on posts down the spine
        for (const lz of [-22, -16, -9, -3, 4, 10, 16, 21]) {
          k.solid.box(0.12, 2.5, 0.12, 1.25, y + DECK + 1.25, lz, P.post);
          k.solid.box(0.42, 0.10, 0.42, 1.25, y + DECK + 2.62, lz, P.iron);
          k.glow.cyl(0.24, 0.20, 0.50, 10, 1.25, y + DECK + 2.30, lz, LAMP);
        }
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
    },

    /* ===================================================================== THE CUT == */
    // Cottages cut into a quarry face on two terraces. The RAMP is the point: it is wide
    // enough and shallow enough that the car climbs to the lower terrace, which is the only
    // place in the county you can park above the road.
    'quarry-cut': {
      landmark(api) {
        const k = kits(), y = api.padY;
        // THE FACE. BEHIND the terraces, stepping up and away — the road comes in from +Z and
        // this is what the hamlet has its back to. MEASURED, not reasoned: the first cut put
        // the face at z +22, on top of the lower terrace and between the road and every
        // cottage, so the whole place read as a blank wall (tools/_hamlet-look.mjs).
        for (let i = 0; i < 9; i++) {
          const z = -19 - i * 2.6, h = 5.0 + i * 1.35;
          k.solid.box(46 - i * 1.4, h, 3.0, (i % 3 - 1) * 1.1, y + h * 0.5, z, i & 1 ? P.stone : P.slate, i * 0.006);
          api.emit({ kind: 'obb', x: (i % 3 - 1) * 1.1, z, halfX: (46 - i * 1.4) * 0.5, halfZ: 1.5,
            yaw: i * 0.006, y0: y - 0.4, y1: y + h, tag: 'stone', standable: true, climbable: false });
        }
        // THE LIME KILN: a stone bottle with a fire in the bottom of it, and the only light.
        // It stands ON the lower terrace (body() puts that at +3.4), off to one side, where
        // it is the first warm thing you see coming up the ramp.
        const kx = -16.5, kz = -2.0, kb = y + 3.4;
        for (let i = 0; i < 6; i++) {
          const r = 3.3 - i * 0.42;
          k.solid.cyl(r, r - 0.25, 1.35, 14, kx, kb + 0.68 + i * 1.3, kz, i & 1 ? P.lime : P.stone);
        }
        api.emit({ kind: 'circle', x: kx, z: kz, r: 3.4, y0: kb - 0.4, y1: kb + 8.4, tag: 'stone' });
        k.solid.box(2.4, 2.3, 0.9, kx, kb + 1.15, kz + 3.1, P.iron);
        k.glow.box(2.05, 1.85, 0.35, kx, kb + 1.08, kz + 3.40, EMBER);
        // 1.4 x 1.4, not 3.2 x 3.2: tests/sites.mjs holds the county to 2 square metres of
        // HORIZONTAL additive pane anywhere, because a big flat one is a glowing carpet from
        // above and reads as a bug rather than as firelight.
        k.glow.box(1.4, 0.10, 1.4, kx, kb + 0.06, kz + 2.0, EMBER);       // firelight on the dust
        k.glow.cyl(1.35, 1.95, 1.1, 12, kx, kb + 8.4, kz, EMBER);         // the plume off the top
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const LOW = 3.4, HIGH = 7.2;
        // THE RAMP the car climbs. 34 m long for 3.4 m of rise is under 6 degrees, which is
        // nothing to a car and nothing to walk. Built as eleven overlapping slabs so the
        // wheels never find a seam.
        for (let i = 0; i < 12; i++) {
          const t = i / 11, z = 30 - t * 34, top = y + 0.1 + t * (LOW - 0.1);
          k.solid.box(7.2, 0.9, 3.4, 20.5 - t * 2.2, top - 0.45, z, P.dust, 0.02);
          api.emit({ kind: 'obb', x: 20.5 - t * 2.2, z, halfX: 3.6, halfZ: 1.75, yaw: 0.02,
            y0: top - 1.0, y1: top, tag: 'stone', standable: true, climbable: false });
        }
        // the two terraces; the road side of the lower one is open to the ramp
        deck(k, api, 40, 15, 0, y + LOW, -3.0, P.dust, 0, 'stone');
        deck(k, api, 30, 9.5, -2.5, y + HIGH, -14.0, P.dust, 0, 'stone');
        // the stair between them: ordinary steps, nine of them
        for (let i = 0; i < 9; i++) {
          const top = y + LOW + (i + 1) * (HIGH - LOW) / 9;
          deck(k, api, 3.2, 0.9, 12.0, top, -8.0 - i * 0.92, P.stone, 0, 'stone');
        }

        // FIVE COTTAGES, three on the lower terrace and two on the upper, their backs into
        // the face. Stone walls, slate roofs, and the dust is on everything.
        const cots = [
          { x: -8.0, z: -7.0, top: LOW, w: 6.2, d: 5.4, h: 2.9 },
          { x: 1.0, z: -7.0, top: LOW, w: 5.8, d: 5.2, h: 2.8 },
          { x: 9.6, z: -7.0, top: LOW, w: 6.0, d: 5.2, h: 2.85 },
          { x: -11.5, z: -15.5, top: HIGH, w: 5.6, d: 5.0, h: 2.75 },
          { x: 0.5, z: -15.5, top: HIGH, w: 5.4, d: 4.8, h: 2.7 },
        ];
        for (const c of cots) {
          hut(k, api, c.x, c.z, y + c.top, c.w, c.d, c.h, 0, P.stone, P.slate);
          k.glow.box(1.10, 0.82, 0.05, c.x, y + c.top + 1.62, c.z - c.d * 0.5 - 0.11, LAMP);
          // a chimney each, and a stack of cut blocks by every door
          k.solid.box(0.75, 2.3, 0.75, c.x + c.w * 0.35, y + c.top + c.h + 1.4, c.z + 1.0, P.stone, 0.05);
          for (let i = 0; i < 5; i++) {
            k.solid.box(0.95, 0.34, 0.62, c.x - c.w * 0.36 + (i % 2) * 0.12,
              y + c.top + 0.17 + i * 0.34, c.z - c.d * 0.5 - 1.3, P.lime, (i % 2 ? 1 : -1) * 0.05);
          }
        }

        // Lamps on posts along both terrace edges, so the shape of the cut reads at night.
        for (const [lx, lz, top] of [[-17, 3.5, LOW], [-6, 3.5, LOW], [5, 3.5, LOW], [15, 3.5, LOW],
          [-12, -9.4, HIGH], [0, -9.4, HIGH], [10, -9.4, HIGH]]) {
          k.solid.box(0.13, 2.7, 0.13, lx, y + top + 1.35, lz, P.iron);
          k.solid.box(0.44, 0.10, 0.44, lx, y + top + 2.82, lz, P.iron);
          k.glow.cyl(0.25, 0.21, 0.52, 10, lx, y + top + 2.50, lz, LAMP);
        }

        // THE ROPE HOIST between the terraces: a timber gantry with a hanging block, the one
        // piece of machinery in the hamlet and the reason the upper terrace is livable.
        for (const side of [-1, 1]) {
          k.solid.box(0.28, HIGH - LOW + 3.0, 0.28, -21.5 + side * 1.6, y + LOW + (HIGH - LOW + 3.0) * 0.5, -9.5, P.board);
          api.emit({ kind: 'obb', x: -21.5 + side * 1.6, z: -9.5, halfX: 0.18, halfZ: 0.18, yaw: 0,
            y0: y + LOW, y1: y + HIGH + 3.0, tag: 'wood' });
        }
        k.solid.box(4.4, 0.34, 0.34, -21.5, y + HIGH + 2.8, -9.5, P.board);
        k.solid.box(0.10, 2.4, 0.10, -21.5, y + HIGH + 1.5, -9.5, P.rope);
        k.solid.box(0.9, 0.7, 0.9, -21.5, y + HIGH - 0.1, -9.5, P.board, 0.18);
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
    },

    /* ==================================================================== HIGHWOOD == */
    // Four platforms in the big pines, rope bridges between them, a winch basket on the
    // ground, and the party that never came down. Every rail has a jack-o-lantern on it and
    // every window has a paper skeleton in it, because the last night the sun set was
    // Halloween and you take a costume off in the morning.
    treehouses: {
      landmark(api) {
        const k = kits(), y = api.padY;
        // The four trunks, tall enough to read from the road with the platforms in them.
        for (const [x, z, h] of [[-9, -7, 21], [8, -6, 23], [10, 9, 20], [-8, 8, 22]]) {
          k.solid.cyl(0.92, 0.62, h, 10, x, y + h * 0.5, z, P.bark);
          api.emit({ kind: 'circle', x, z, r: 0.95, y0: y - 0.5, y1: y + h, tag: 'tree' });
          // the crown, so the silhouette is a pine and not a pole
          for (let i = 0; i < 4; i++) {
            k.solid.cyl(3.4 - i * 0.7, 0.9, 3.0, 9, x, y + h - 4.2 + i * 2.5, z, P.moss);
          }
        }
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const PLAT = [
          { x: -9, z: -7, top: 6.4, w: 7.0, d: 6.4 },
          { x: 8, z: -6, top: 8.2, w: 6.6, d: 6.2 },
          { x: 10, z: 9, top: 7.0, w: 6.4, d: 6.0 },
          { x: -8, z: 8, top: 9.0, w: 6.8, d: 6.4 },
        ];
        for (let i = 0; i < PLAT.length; i++) {
          const p = PLAT[i];
          deck(k, api, p.w, p.d, p.x, y + p.top, p.z, P.board, 0, 'wood');
          // braces back to the trunk, so the platform reads as built rather than floating
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            k.solid.box(0.16, 2.2, 0.16, p.x + sx * (p.w * 0.42), y + p.top - 1.4, p.z + sz * (p.d * 0.42), P.board, sx * 0.2);
          }
          // the rail, with a gap where the bridge lands
          for (const [ox, oz, lw, ld] of [[0, p.d * 0.5, p.w, 0.12], [0, -p.d * 0.5, p.w, 0.12],
            [p.w * 0.5, 0, 0.12, p.d], [-p.w * 0.5, 0, 0.12, p.d]]) {
            k.solid.box(lw, 0.10, ld, p.x + ox, y + p.top + 0.98, p.z + oz, P.board);
            for (let n = 0; n < 4; n++) {
              const t = (n + 0.5) / 4 - 0.5;
              k.solid.box(0.10, 1.0, 0.10, p.x + ox + (lw > ld ? t * lw : 0),
                y + p.top + 0.5, p.z + oz + (ld > lw ? t * ld : 0), P.board);
            }
          }
          // A CABIN on each platform, with a lit window and a paper skeleton in it.
          hut(k, api, p.x, p.z + 0.3, y + p.top, p.w - 2.0, p.d - 2.2, 2.4, i * Math.PI * 0.5, P.plank, P.tar, 1.1);
          k.glow.box(1.00, 0.76, 0.05, p.x + (i === 1 ? p.w * 0.45 : 0), y + p.top + 1.48,
            p.z + (i === 1 ? 0.3 : -p.d * 0.5 + 0.9), LAMP, i * Math.PI * 0.5);
          // paper lanterns strung under the bridge landings: what is left of the party
          for (let n = 0; n < 3; n++) {
            k.glow.cyl(0.11, 0.09, 0.19, 8, p.x - 1.6 + n * 1.6, y + p.top + 2.18, p.z - p.d * 0.42, EMBER);
            k.solid.box(0.05, 0.22, 0.05, p.x - 1.6 + n * 1.6, y + p.top + 2.40, p.z - p.d * 0.42, P.rope);
          }
          // the skeleton: five pale bars in the window, and they are paper
          for (let b = 0; b < 5; b++) {
            k.solid.box(0.42 - Math.abs(b - 2) * 0.09, 0.05, 0.02,
              p.x, y + p.top + 1.78 - b * 0.13, p.z - p.d * 0.5 + 0.86, P.paper, i * Math.PI * 0.5);
          }
          // JACK-O-LANTERNS on the rail. Still lit. Nobody blew them out.
          for (let n = 0; n < 4; n++) {
            const a = n * Math.PI * 0.5 + 0.4;
            const lx = p.x + Math.sin(a) * (p.w * 0.42), lz = p.z + Math.cos(a) * (p.d * 0.42);
            k.solid.cyl(0.24, 0.21, 0.34, 10, lx, y + p.top + 1.20, lz, P.pumpkin);
            k.glow.cyl(0.22, 0.19, 0.36, 9, lx, y + p.top + 1.20, lz, EMBER);
          }
        }

        // THE ROPE BRIDGES. Real walkable spans with rope rails: the only way between the
        // platforms once you are up, and the reason the hamlet has a shape at all.
        const spans = [[0, 1], [1, 2], [2, 3]];
        for (const [a, b] of spans) {
          const A = PLAT[a], B = PLAT[b];
          const mx = (A.x + B.x) * 0.5, mz = (A.z + B.z) * 0.5;
          const top = (A.top + B.top) * 0.5;
          const len = Math.hypot(B.x - A.x, B.z - A.z);
          const yaw = Math.atan2(B.x - A.x, B.z - A.z);
          deck(k, api, 1.5, len, mx, y + top, mz, P.board, yaw, 'wood');
          for (const side of [-1, 1]) {
            const rx = mx + Math.cos(yaw) * side * 0.72, rz = mz - Math.sin(yaw) * side * 0.72;
            k.solid.box(0.07, 0.07, len, rx, y + top + 0.95, rz, P.rope, yaw);
            const n = Math.max(3, Math.round(len / 2.2));
            for (let i = 0; i <= n; i++) {
              const t = i / n - 0.5;
              k.solid.box(0.05, 0.95, 0.05, rx + Math.sin(yaw) * t * len,
                y + top + 0.48, rz + Math.cos(yaw) * t * len, P.rope);
            }
          }
        }

        // THE WINCH BASKET on the ground: how everything that is up there got up there, and
        // a landmark at eye level for a player who has not looked up yet.
        k.solid.box(1.9, 1.1, 1.9, 0, y + 0.55, -14.0, P.canvas, 0.08);
        api.emit({ kind: 'obb', x: 0, z: -14.0, halfX: 0.95, halfZ: 0.95, yaw: 0.08,
          y0: y - 0.3, y1: y + 1.1, tag: 'wood', standable: true });
        for (const side of [-1, 1]) {
          k.solid.box(0.22, 8.4, 0.22, side * 1.5, y + 4.2, -14.0, P.board);
          api.emit({ kind: 'obb', x: side * 1.5, z: -14.0, halfX: 0.14, halfZ: 0.14, yaw: 0,
            y0: y - 0.3, y1: y + 8.4, tag: 'wood' });
        }
        k.solid.box(3.6, 0.28, 0.28, 0, y + 8.3, -14.0, P.board);
        k.solid.box(0.07, 7.0, 0.07, 0, y + 4.7, -14.0, P.rope);
        // and the climb up to the first platform: a laddered face on the trunk
        for (let i = 0; i < 13; i++) {
          k.solid.box(0.72, 0.09, 0.09, -9, y + 0.6 + i * 0.46, -5.9, P.board);
        }
        api.emit({ kind: 'obb', x: -9, z: -5.85, halfX: 0.46, halfZ: 0.14, yaw: 0,
          y0: y + 0.4, y1: y + 6.4, tag: 'wood', climbable: true });
        void C;
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
    },
  };
}

export default makeHamletBuilders;
