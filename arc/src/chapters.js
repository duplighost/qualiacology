// Authored chapter layouts. The valley runs north: chapter I at the origin, the dam at
// z ~ -1950. Every gap is authored against the throw budget in config.js:
//   standstill flat throw from a 6 m roof reaches ~28-50 m (charge), aimed up ~100 m;
//   a throw from a rail at 30-45 m/s reaches 80-150 m. Chapter III is beyond any standstill throw.
// Helpers keep the data readable. `roof(x,z,w,d,h,{ridge,rot})`, `spire(x,z,r,h)`.
export function roof(x, z, w, d, h, o = {}) { return { kind: 'roof', x, z, w, d, h, ridge: o.ridge ?? 0, rot: o.rot ?? 0, tag: o.tag }; }
export function spire(x, z, r, h, o = {}) { return { kind: 'spire', x, z, r, h, rot: 0, tag: o.tag }; }

// A small seeded RNG so layouts are deterministic but not hand-placed one by one.
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export const CHAPTERS = [];

// ---- I. THE SHALLOWS — the teach --------------------------------------------------
{
  const b = [];
  // the four roofs: 18 / 20 / 26 / 35 m gaps, then the fourth is higher than a flat throw
  b.push(roof(0, 0, 10, 12, 6, { ridge: 2.4, tag: 'route' }));            // A: spawn
  b.push(roof(2, -32, 9, 10, 6, { ridge: 2.2, rot: 0.15, tag: 'route' })); // B
  b.push(roof(14, -63, 9, 12, 6.5, { ridge: 2.4, tag: 'route' }));         // C
  b.push(roof(6, -101, 10, 12, 6, { ridge: 2.6, rot: -0.2, tag: 'route' }));// D
  b.push(roof(-10, -166, 12, 14, 15, { ridge: 3.2, tag: 'route' }));       // E: the fourth. Higher, 60 m out. You learn RMB here.
  // a wall to throw at, then the chain
  b.push(roof(-40, -215, 14, 22, 22, { ridge: 0, tag: 'route' }));         // F: a tall flat block: throw at its wall, call, dash onto it
  b.push(roof(-8, -262, 9, 11, 7, { ridge: 2.2, rot: 0.4, tag: 'route' }));
  b.push(roof(28, -300, 9, 11, 8, { ridge: 2.4, rot: -0.3, tag: 'route' }));
  b.push(roof(52, -350, 11, 13, 9, { ridge: 2.8, tag: 'route' }));
  // the ridge of roofs and the bay: 10 roofs, every gap 22-35 m. (14 roofs over the same 245 m gave
  // 10-14 m gaps, and a 10-14 m gap is the WORST case for these verbs: a charge-0 road hangs 60 m
  // out and the 30 m/s minimum dash overshoots, so the call window measured 0.1 s. tests/route.mjs
  // reads the route from the 'route' / 'chain' tags.)
  const r = rng(11);
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = 40 + Math.sin(t * 5.2) * 30 + (r() - 0.5) * 8;
    const z = -370 - t * 245 + (r() - 0.5) * 8;
    b.push(roof(x, z, 8 + r() * 5, 9 + r() * 6, 5.5 + r() * 4, { ridge: 1.8 + r() * 1.6, rot: (r() - 0.5) * 0.9, tag: 'chain' }));
  }
  // scattered drowned houses for texture (never on the route, mostly lower)
  for (let i = 0; i < 46; i++) {
    const x = (r() - 0.5) * 520, z = -60 - r() * 620;
    if ((Math.abs(x) < 70 && z > -420) || (Math.abs(x - 40) < 60 && z > -640)) continue; // never on the route or the chain
    b.push(roof(x, z, 7 + r() * 6, 8 + r() * 8, 3.5 + r() * 4, { ridge: 1.5 + r() * 1.8, rot: r() * 6.28 }));
  }
  // the bay's far shore: the tortoise stands here
  b.push(roof(-120, -700, 16, 20, 11, { ridge: 3.4, rot: 0.3, tag: 'bay-a' }));
  b.push(roof(120, -690, 14, 18, 10, { ridge: 3.0, rot: -0.2, tag: 'bay-b' }));
  b.push(roof(0, -790, 18, 24, 12, { ridge: 0, tag: 'exit' }));   // the way out, north, once the tortoise kneels
  CHAPTERS.push({
    name: 'THE SHALLOWS', index: 0,
    spawn: { x: 0, y: 8.4, z: 0, yaw: 0 },
    buildings: b,
    boss: { kind: 'tortoise', x: 0, z: -680, trigger: { x: 40, z: -560, r: 120 } },  // z -680, not -640: at -640 its head (z -576, r 12) and neck (z -588, r 8) sat on chain roofs 19-22 and every rail there stuck to the boss
    exit: { x: 0, z: -790 },
    wakeLight: { x: 0, y: 40, z: -700 },
  });
}

// ---- II. THE TOWERS -------------------------------------------------------------------
{
  const b = [];
  const r = rng(29);
  const cx = 0, cz = -1000;
  // a ring of spires 40-120 m tall; gaps 30-80 m at height
  const N = 26;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rad = 120 + Math.sin(i * 2.3) * 40 + r() * 30;
    const x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad * 0.8;
    b.push(spire(x, z, 5 + r() * 4, 40 + r() * 80));
  }
  // an inner cluster around the heron's stance
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, rad = 40 + r() * 50;
    b.push(spire(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, 4 + r() * 3, 35 + r() * 45));
  }
  // an approach: from the shallows' exit up into the towers
  b.push(spire(-20, -860, 6, 22)); b.push(spire(24, -905, 6, 34)); b.push(spire(-30, -950, 7, 48)); b.push(spire(10, -985, 6, 60));
  // drowned blocks for texture
  for (let i = 0; i < 40; i++) {
    const x = cx + (r() - 0.5) * 560, z = cz + (r() - 0.5) * 520;
    b.push(roof(x, z, 9 + r() * 8, 10 + r() * 10, 4 + r() * 12, { ridge: r() < 0.5 ? 0 : 2 + r() * 2, rot: r() * 6.28 }));
  }
  b.push(spire(0, -1290, 8, 70, { tag: 'exit' }));
  CHAPTERS.push({
    name: 'THE TOWERS', index: 1,
    spawn: { x: 0, y: 14.4, z: -790, yaw: 0 },
    buildings: b,
    boss: { kind: 'heron', x: 0, z: -1010, trigger: { x: 0, z: -960, r: 140 } },
    exit: { x: 0, z: -1290 },
    wakeLight: { x: 0, y: 80, z: -1000 },
  });
}

// ---- III. THE DEEP ---------------------------------------------------------------------
{
  const b = [];
  const r = rng(47);
  // stacks: tall thin rocks-as-spires across open water, 60-110 m apart, beyond a standstill throw
  // 180 m apart: a standstill road hangs ~110 m out and a dash adds ~50, so these need a throw from speed
  const pts = [[0, -1330], [40, -1510], [-30, -1690], [-50, -1880]];
  for (const [i, [x, z]] of pts.entries()) b.push(spire(x, z, 5 + r() * 2, 26 + r() * 18, { tag: i === pts.length - 1 ? 'exit' : undefined }));
  // a few drowned wrecks low on the horizon so 700 m of water never reads as empty
  for (let i = 0; i < 18; i++) b.push(roof((r() - 0.5) * 700, -1320 - r() * 620, 8 + r() * 10, 10 + r() * 14, 2 + r() * 3, { ridge: 1 + r() * 2, rot: r() * 6.28 }));
  CHAPTERS.push({
    name: 'THE DEEP', index: 2,
    spawn: { x: 3, y: 70.6, z: -1290, yaw: 0 },
    buildings: b,
    boss: { kind: 'eel', x: 0, z: -1650, trigger: { x: 0, z: -1560, r: 160 } },
    exit: { x: -50, z: -1880 },
    wakeLight: { x: 0, y: 30, z: -1650 },
  });
}

// ---- IV. THE DAM ------------------------------------------------------------------------
{
  const b = [];
  const r = rng(83);
  // the dam face at z = -1990, a 200 m wall running x = -400..400. Ledges climb it.
  b.push(roof(0, -2000, 820, 40, 200, { ridge: 0, tag: 'dam' }));
  // buttresses: vertical rhythm on the face so it reads as a dam and not a lit slab
  for (let i = -7; i <= 7; i++) b.push(roof(i * 56 + 28, -1978, 10, 8, 204 - Math.abs(i) * 3, { ridge: 0, tag: 'buttress' }));
  // ledges: alternating left/right, each higher, 30-70 m apart
  let y = 12, x = -30;
  for (let i = 0; i < 12; i++) {
    b.push(roof(x, -1975 + (i % 2) * 2, 12, 8, y, { ridge: 0, tag: 'ledge' }));
    y += 15 + r() * 5; x = -x + (r() - 0.5) * 40;
  }
  b.push(roof(0, -1972, 18, 10, 196, { ridge: 0, tag: 'socket-ledge' }));
  // approach stacks
  b.push(spire(-70, -1920, 5, 18)); b.push(spire(20, -1945, 5, 12));
  CHAPTERS.push({
    name: 'THE DAM', index: 3,
    spawn: { x: -47, y: 40.6, z: -1880, yaw: 0 },
    buildings: b,
    boss: null,
    socket: { x: 0, y: 206, z: -1990 },
    exit: null,
    wakeLight: { x: 0, y: 220, z: -1990 },
  });
}
