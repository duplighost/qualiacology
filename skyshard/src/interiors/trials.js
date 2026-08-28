// Authored ruin-expedition scenes. A shared low-level kit keeps shader and
// collision costs bounded; every destination supplies a different route and
// a destination-specific motif function, so layout, silhouette, encounter
// rhythm, and boss reveal are not palette swaps.

import * as THREE from 'three';
import { REGIONS } from '../world/regions.js';
import { mats, place, addGlow, canvasTex } from '../world/props.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r0, r1, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);

const MATERIALS = new Map();
function ruinMats(region) {
  if (MATERIALS.has(region)) return MATERIALS.get(region);
  const R = REGIONS[region];
  const key = new THREE.Color(...R.key);
  const base = new THREE.Color(...R.terra.cliff).multiplyScalar(0.9);
  const floorTex = canvasTex(`trial-floor-${region}`, 256, (g, s) => {
    const c = base.clone();
    g.fillStyle = `#${c.getHexString()}`;
    g.fillRect(0, 0, s, s);
    let seed = region.length * 917 + 31;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 1300; i++) {
      const v = 110 + (rnd() * 70 | 0);
      g.fillStyle = `rgba(${v},${v},${v},${0.025 + rnd() * 0.08})`;
      const n = 1 + rnd() * 5;
      g.fillRect(rnd() * s, rnd() * s, n, n * (0.35 + rnd()));
    }
    g.strokeStyle = 'rgba(8,10,18,.18)';
    g.lineWidth = 2;
    for (let y = 0; y < s; y += 32) {
      g.beginPath(); g.moveTo(0, y + (y % 64 ? 9 : 0)); g.lineTo(s, y); g.stroke();
    }
  });
  floorTex.repeat.set(10, 16);
  const out = {
    floor: new THREE.MeshStandardMaterial({ map: floorTex, color: base.clone().lerp(new THREE.Color(0xffffff), 0.2), roughness: 0.88, metalness: region === 'shatter' ? 0.18 : 0.02 }),
    stone: new THREE.MeshStandardMaterial({ color: base, roughness: 0.82, metalness: region === 'shatter' ? 0.24 : 0.02 }),
    stone2: new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.58), roughness: 0.96, metalness: region === 'shatter' ? 0.18 : 0 }),
    accent: new THREE.MeshStandardMaterial({ color: key.clone().multiplyScalar(0.55), emissive: key, emissiveIntensity: 0.72, roughness: 0.3, metalness: 0.22 }),
    glow: new THREE.MeshBasicMaterial({ color: key, transparent: true, opacity: 0.74, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    dark: new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.7, metalness: 0.48 }),
  };
  MATERIALS.set(region, out);
  return out;
}

function addMesh(ctx, mesh, x, y, z, cast = true) {
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return mesh;
}

function slab(ctx, x, z, w, d, h = 0.45, y = 0, mat = null) {
  const m = addMesh(ctx, box(w, h, d, mat || ctx.rm.floor), x, y - h / 2, z);
  ctx.collide.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2, y - h, y, { standable: true });
  return m;
}

function wall(ctx, x, z, w, h, rot = 0, mat = null) {
  const d = 0.58;
  const m = addMesh(ctx, box(w, h, d, mat || ctx.rm.stone), x, h / 2, z);
  m.rotation.y = rot;
  const hw = (Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * d) / 2;
  const hd = (Math.abs(Math.cos(rot)) * d + Math.abs(Math.sin(rot)) * w) / 2;
  ctx.collide.addBox(x - hw, z - hd, x + hw, z + hd, 0, h);
  return m;
}

function pillar(ctx, x, z, r = 0.55, h = 5, mat = null, sides = 8) {
  const p = addMesh(ctx, cyl(r * 0.82, r, h, sides, mat || ctx.rm.stone), x, h / 2, z);
  ctx.collide.addCircle(x, z, r, 0, h);
  return p;
}

function arch(ctx, x, z, w = 5, h = 5.5, rot = 0, mat = null) {
  const m = mat || ctx.rm.stone;
  const dx = Math.cos(rot) * w / 2, dz = -Math.sin(rot) * w / 2;
  pillar(ctx, x - dx, z - dz, 0.46, h, m);
  pillar(ctx, x + dx, z + dz, 0.46, h, m);
  const lintel = addMesh(ctx, box(w + 0.9, 0.7, 0.8, m), x, h - 0.35, z);
  lintel.rotation.y = rot;
  return lintel;
}

function crystal(ctx, x, z, s = 1, y = 0) {
  const c = addMesh(ctx, new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), ctx.rm.accent), x, y + s, z);
  c.scale.set(0.55, 1.7, 0.55);
  addGlow(x, y + s * 1.4, z, REGIONS[ctx.dest.region].key, 1.2 + s * 0.35);
  return c;
}

function ring(ctx, x, y, z, r, rotX = Math.PI / 2) {
  const q = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 7, 32), ctx.rm.accent), x, y, z);
  q.rotation.x = rotX;
  ctx._trialAnimated.push({ mesh: q, kind: 'spin', speed: 0.12 + r * 0.025 });
  return q;
}

function cap(ctx, x, z, s = 1, color = null) {
  const stem = addMesh(ctx, cyl(0.25 * s, 0.38 * s, 2.2 * s, 8, ctx.rm.stone2), x, 1.1 * s, z);
  const cm = color ? ctx.rm.accent.clone() : ctx.rm.accent;
  if (color) cm.color.set(color);
  const crown = addMesh(ctx, new THREE.Mesh(new THREE.SphereGeometry(1.1 * s, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), cm), x, 2.15 * s, z);
  crown.scale.y = 0.48;
  return { stem, crown };
}

function bone(ctx, x, z, len = 4, rot = 0) {
  const b = addMesh(ctx, cyl(0.16, 0.22, len, 7, mats().bone), x, len / 2, z);
  b.rotation.z = rot;
  return b;
}

function root(ctx, x, z, len = 7, rot = 0, y = 0) {
  const r = addMesh(ctx, cyl(0.22, 0.55, len, 7, mats().woodDark), x, y + len / 2, z);
  r.rotation.z = rot;
  return r;
}

function water(ctx, y = 0.03, color = 0x4c91a6, opacity = 0.42) {
  const w = addMesh(ctx, new THREE.Mesh(new THREE.PlaneGeometry(68, 108, 8, 12),
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.18, metalness: 0.15, depthWrite: false })), 0, y, 0, false);
  w.rotation.x = -Math.PI / 2;
  ctx._trialAnimated.push({ mesh: w, kind: 'breathe', baseY: y, speed: 0.65 });
  return w;
}

function stairs(ctx, x, z, count, dirX, dirZ, width = 5, rise = 0.34) {
  for (let i = 0; i < count; i++) {
    const y = i * rise;
    slab(ctx, x + dirX * i * 1.2, z + dirZ * i * 1.2, width, 1.35, y + 0.26, y, ctx.rm.stone);
  }
}

// Each motif is destination-specific. They intentionally use the same bounded
// material/geometry vocabulary while making different navigable compositions.
const MOTIFS = {
  weir(ctx) {
    water(ctx, 0.02, 0x397f78, 0.5);
    for (const x of [-18, -6, 6, 18]) arch(ctx, x, -2 + Math.sin(x) * 2, 5, 6.5, Math.PI / 2);
    for (let i = 0; i < 7; i++) root(ctx, -22 + i * 7, -26 + (i % 2) * 4, 8, (i % 2 ? -0.6 : 0.6));
    stairs(ctx, -18, 36, 7, 1, -1, 5, 0.24);
  },
  orchard(ctx) {
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1, z = 41 - (i >> 1) * 9;
      const trunk = pillar(ctx, side * (11 + (i % 3)), z, 0.55, 4.8, mats().woodDark, 7);
      const crown = addMesh(ctx, new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 0), ctx.rm.stone2), trunk.position.x, 5.3, z);
      crown.scale.y = 0.7;
      for (let k = 0; k < 3; k++) crystal(ctx, trunk.position.x + (k - 1) * 0.7, z + 0.8, 0.25, 4.5);
    }
    arch(ctx, 0, -32, 10, 7.5);
  },
  aqueduct(ctx) {
    water(ctx, -0.12, 0x446f92, 0.48);
    for (let z = 42; z > -43; z -= 11) arch(ctx, Math.sin(z * 0.13) * 8, z, 8, 8, 0);
    const channel = addMesh(ctx, box(5, 0.4, 88, ctx.rm.stone2), 0, 5.7, 0);
    channel.rotation.z = 0.02;
    ring(ctx, 0, 8, -39, 3.8, 0);
  },
  cloister(ctx) {
    for (const x of [-18, 18]) for (let z = 36; z > -31; z -= 8) pillar(ctx, x, z, 0.48, 6.2);
    for (const z of [34, -30]) for (let x = -14; x <= 14; x += 7) arch(ctx, x, z, 5, 5.8, Math.PI / 2);
    const garden = addMesh(ctx, new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.35, 32), ctx.rm.floor), 0, -1, 2);
    garden.position.y = -0.1;
    for (let i = 0; i < 9; i++) crystal(ctx, Math.cos(i) * 7, Math.sin(i) * 7 + 2, 0.35);
  },
  trenches(ctx) {
    for (let z = 42; z > -38; z -= 10) {
      wall(ctx, -15 + Math.sin(z) * 3, z, 10, 2.8, 0, ctx.rm.dark);
      wall(ctx, 15 + Math.cos(z) * 3, z - 4, 10, 3.8, 0, ctx.rm.dark);
      crystal(ctx, z % 20 ? -11 : 11, z, 0.42);
    }
    for (const x of [-9, 9]) ring(ctx, x, 4.5, -29, 3.2, 0);
  },
  ribs(ctx) {
    for (let z = 42; z > -40; z -= 8) {
      const a = arch(ctx, 0, z, 18 - Math.abs(z) * 0.08, 10, 0, ctx.rm.dark);
      a.rotation.z = Math.sin(z * 0.4) * 0.12;
    }
    const chainMat = ctx.rm.accent;
    for (const x of [-8, 0, 8]) for (let y = 2; y < 10; y += 1.3) addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 5, 12), chainMat), x, y, -13).rotation.x = Math.PI / 2;
  },
  lensmaze(ctx) {
    for (let i = 0; i < 16; i++) {
      const z = 42 - i * 5.4, x = (i % 4 < 2 ? -1 : 1) * (7 + (i % 3) * 3);
      wall(ctx, x, z, 11, 4 + (i % 3), (i % 2) * Math.PI / 2, i % 3 ? ctx.rm.stone2 : ctx.rm.dark);
      if (i % 3 === 0) ring(ctx, -x * 0.5, 5, z - 2, 2.2, 0);
    }
    crystal(ctx, 0, -41, 2.4, 1);
  },
  amphitheater(ctx) {
    for (let r = 13; r <= 27; r += 4.6) {
      for (let i = 0; i < 18; i++) {
        const a = Math.PI * (0.08 + i / 19 * 0.84);
        const x = Math.cos(a) * r, z = -24 + Math.sin(a) * r;
        slab(ctx, x, z, 3.8, 2.4, 0.45, (r - 13) * 0.22, ctx.rm.stone2);
      }
    }
    arch(ctx, 0, 31, 12, 9, 0, ctx.rm.dark);
    for (const x of [-14, -7, 7, 14]) crystal(ctx, x, -42, 0.8);
  },
  causeway(ctx) {
    water(ctx, -0.18, 0x86c8e8, 0.4);
    for (let i = 0; i < 12; i++) {
      const z = 44 - i * 8, x = Math.sin(i * 1.7) * 9;
      slab(ctx, x, z, 8 - (i % 3), 5, 0.55, i % 4 === 0 ? 0.45 : 0, ctx.rm.floor);
      if (i % 2 === 0) bone(ctx, x + 4, z, 4 + i * 0.2, 0.4);
    }
    const whale = addMesh(ctx, new THREE.Mesh(new THREE.CapsuleGeometry(2.5, 10, 6, 12), mats().bone), -14, 8, -18);
    whale.rotation.z = Math.PI / 2;
  },
  windnave(ctx) {
    for (const x of [-20, -12, 12, 20]) for (let z = 40; z > -38; z -= 13) pillar(ctx, x, z, 0.42, 10 - Math.abs(x) * 0.08, ctx.rm.stone);
    for (let i = 0; i < 11; i++) {
      const pipe = addMesh(ctx, cyl(0.28, 0.42, 3 + (i % 5) * 1.5, 10, ctx.rm.accent), -15 + i * 3, (3 + (i % 5) * 1.5) / 2, -28);
      ctx._trialAnimated.push({ mesh: pipe, kind: 'pulse', speed: 1 + i * 0.07 });
    }
    ring(ctx, 0, 10, -42, 5.2, 0);
  },
  ossuary(ctx) {
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1, z = 43 - (i >> 1) * 7;
      bone(ctx, side * (10 + (i % 5)), z, 4 + (i % 4), side * 0.55);
      if (i % 4 === 0) crystal(ctx, side * 7, z, 0.45);
    }
    for (let i = 0; i < 9; i++) arch(ctx, 0, 38 - i * 10, 11, 6 + i * 0.25, 0, mats().bone);
  },
  prismtarn(ctx) {
    water(ctx, 0.01, 0xa0d8f0, 0.3);
    for (let i = 0; i < 22; i++) {
      const a = i * 2.399, r = 6 + (i % 5) * 5;
      crystal(ctx, Math.cos(a) * r, Math.sin(a) * r - 4, 0.45 + (i % 4) * 0.18);
    }
    for (const z of [29, 5, -19]) ring(ctx, Math.sin(z) * 7, 4.5, z, 3.5, 0);
  },
  sporeorchard(ctx) {
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1, z = 43 - (i >> 1) * 7.3;
      cap(ctx, side * (8 + (i % 4) * 2.5), z, 0.7 + (i % 3) * 0.35);
    }
    for (let z = 35; z > -40; z -= 15) ring(ctx, Math.sin(z) * 8, 5, z, 3, 0);
  },
  rootlung(ctx) {
    for (let i = 0; i < 20; i++) {
      const z = 44 - i * 4.4, side = i % 2 ? 1 : -1;
      root(ctx, side * (15 - (i % 4) * 2), z, 8 + (i % 3), side * (0.45 + (i % 3) * 0.12));
    }
    const l = addMesh(ctx, new THREE.Mesh(new THREE.SphereGeometry(6, 18, 12), ctx.rm.accent), -7, 6, -34);
    l.scale.set(0.72, 1.2, 0.4);
    const r = l.clone(); r.position.x = 7; ctx.scene.add(r);
    ctx._trialAnimated.push({ mesh: l, kind: 'breathe', baseY: 6, speed: 1.4 }, { mesh: r, kind: 'breathe', baseY: 6, speed: 1.4, phase: Math.PI });
  },
  floodcrypt(ctx) {
    water(ctx, 0.12, 0x214f4a, 0.6);
    for (let i = 0; i < 13; i++) {
      const z = 44 - i * 7.3, x = Math.sin(i * 1.35) * 13;
      slab(ctx, x, z, 7, 4.5, 0.65, 0.35 + (i % 3) * 0.15, ctx.rm.stone);
      if (i % 2 === 0) cap(ctx, -x * 0.8, z - 2, 0.65);
    }
    for (const x of [-18, 18]) for (let z = 31; z > -34; z -= 14) arch(ctx, x, z, 5, 6, Math.PI / 2);
  },
  capcathedral(ctx) {
    for (const x of [-18, -11, 11, 18]) for (let z = 39; z > -39; z -= 13) cap(ctx, x, z, 1.1 + (Math.abs(x) > 15 ? 0.4 : 0));
    for (let z = 34; z > -39; z -= 12) arch(ctx, 0, z, 12, 9, 0, ctx.rm.stone2);
    const dome = addMesh(ctx, new THREE.Mesh(new THREE.SphereGeometry(12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), ctx.rm.accent), 0, 7, -40);
    dome.scale.y = 0.55;
  },
  gravitystair(ctx) {
    for (let i = 0; i < 18; i++) {
      const z = 44 - i * 5.2, x = (i % 2 ? 1 : -1) * (4 + (i % 5) * 2.2);
      const s = slab(ctx, x, z, 8, 3.7, 0.55, (i % 6) * 0.45, i % 3 ? ctx.rm.stone : ctx.rm.accent);
      s.rotation.z = (i % 2 ? 1 : -1) * 0.05;
    }
    for (const z of [25, -5, -34]) ring(ctx, 0, 7 + (z % 2), z, 5, Math.PI / 2);
  },
  orrery(ctx) {
    for (let i = 0; i < 9; i++) {
      const z = 40 - i * 10;
      ring(ctx, Math.sin(i) * 7, 5 + (i % 3) * 2, z, 2.5 + (i % 4), i % 2 ? 0 : Math.PI / 2);
      const planet = addMesh(ctx, new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + (i % 3) * 0.25, 1), ctx.rm.accent), Math.cos(i) * 9, 4 + (i % 4), z);
      ctx._trialAnimated.push({ mesh: planet, kind: 'orbit', ox: 0, oz: z, radius: 9, phase: i, speed: 0.12 + i * 0.01, y: planet.position.y });
    }
    crystal(ctx, 0, -44, 2.6, 1);
  },
  archive(ctx) {
    for (let i = 0; i < 24; i++) {
      const z = 42 - (i >> 2) * 15, x = -18 + (i % 4) * 12;
      const shelf = addMesh(ctx, box(6, 6 + (i % 3), 1.2, i % 2 ? ctx.rm.dark : ctx.rm.stone2), x, 3 + (i % 3) * 0.5, z);
      ctx.collide.addBox(x - 3, z - 0.6, x + 3, z + 0.6, 0, 8);
      for (let k = 0; k < 4; k++) crystal(ctx, x - 2.1 + k * 1.4, z - 0.8, 0.18, 1 + k * 0.7);
    }
    for (const z of [35, 5, -25]) arch(ctx, 0, z, 9, 8, 0);
  },
  tribunal(ctx) {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x = Math.cos(a) * 24, z = -19 + Math.sin(a) * 24;
      const cageMat = ctx.rm.dark.clone();
      cageMat.wireframe = true;
      const cage = addMesh(ctx, new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 5, 8, 1, true), cageMat), x, 7 + (i % 3) * 2, z);
      ctx._trialAnimated.push({ mesh: cage, kind: 'float', baseY: cage.position.y, speed: 0.45, phase: i });
    }
    for (const z of [32, 10, -12]) arch(ctx, 0, z, 14, 10, 0, ctx.rm.stone2);
    const dais = addMesh(ctx, new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 1.2, 18), ctx.rm.stone), 0, 0.2, -42);
    ctx.collide.addCircle(0, -42, 13, -1, 0.8);
    ring(ctx, 0, 11, -42, 7, 0);
  },
};

function addEncounter(ctx, id, center, enemyA, enemyB, count, gateZ) {
  const tag = `trial:${ctx.dest.id}:${id}`;
  const spawns = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + ctx.rng() * 0.45;
    spawns.push({
      type: i % 3 === 2 ? enemyB : enemyA,
      x: center[0] + Math.cos(a) * (4 + ctx.rng() * 4),
      z: center[1] + Math.sin(a) * (4 + ctx.rng() * 4),
    });
  }
  const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(...REGIONS[ctx.dest.region].key), transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const gate = addMesh(ctx, new THREE.Mesh(new THREE.PlaneGeometry(70, 8, 18, 2), gm), 0, 4, gateZ, false);
  const collider = ctx.collide.addBox(-35, gateZ - 0.35, 35, gateZ + 0.35, 0, 9);
  ctx.encounters.push({ id, tag, trigger: { x: center[0], z: center[1], r: 10 }, spawns, gate, collider, spawned: false, cleared: false });
}

function buildRoute(ctx) {
  const path = ctx.dest.path;
  // Base court and a denser chain of path plates. The route points themselves
  // are unique per destination and readable in the floor composition.
  slab(ctx, 0, 0, 72, 112, 0.5, 0, ctx.rm.floor);
  for (let i = 0; i < path.length; i++) {
    const [x, z] = path[i];
    slab(ctx, x, z, 11 - (i % 3), 8 + (i % 2) * 2, 0.22, 0.15, i === path.length - 1 ? ctx.rm.accent : ctx.rm.stone2);
    if (i < path.length - 1) {
      const [nx, nz] = path[i + 1];
      const dx = nx - x, dz = nz - z, len = Math.hypot(dx, dz);
      const bridge = addMesh(ctx, box(5.5, 0.22, len, ctx.rm.stone2), (x + nx) / 2, 0.03, (z + nz) / 2);
      bridge.rotation.y = Math.atan2(dx, dz);
    }
  }
  // Perimeter ruins keep the scene spatially bounded and block bypassing the
  // encounter seals without looking like an invisible videogame wall.
  wall(ctx, -36, 0, 112, 9, Math.PI / 2, ctx.rm.stone2);
  wall(ctx, 36, 0, 112, 9, Math.PI / 2, ctx.rm.stone2);
  wall(ctx, 0, -56, 72, 9, 0, ctx.rm.stone2);
  wall(ctx, -19, 56, 34, 7, 0, ctx.rm.stone2);
  wall(ctx, 19, 56, 34, 7, 0, ctx.rm.stone2);
}

export function makeTrialDef(dest) {
  const R = REGIONS[dest.region];
  const fog = R.fog.color.map((v) => v * (dest.region === 'frost' ? 0.72 : 0.42));
  const path = dest.path;
  const first = path[Math.min(2, path.length - 3)];
  const second = path[Math.max(3, path.length - 3)];
  const last = path[path.length - 1];
  const regionEnemies = {
    vale: ['hopper', 'puff'], ember: ['hound', 'turret'], frost: ['wisp', 'golem'],
    mycel: ['creeper', 'gasbag'], shatter: ['drone', 'sentinel'],
  }[dest.region];
  return {
    fog,
    fogDensity: dest.region === 'mycel' ? 0.017 : 0.009,
    hemiIntensity: dest.region === 'mycel' ? 0.62 : 0.82,
    hemiColor: R.hemi.sky,
    sun: dest.region === 'mycel' ? 0.36 : 0.62,
    spawn: { x: 0, y: 0, z: 51, yaw: 0 },
    exitOffset: 4,
    doorOutZ: 10,
    bossAt: { x: last[0], z: last[1] },
    bossWake: 12,
    packTrigger: 999,
    build(ctx) {
      ctx.rm = ruinMats(dest.region);
      ctx.encounters = [];
      ctx._trialAnimated = [];
      buildRoute(ctx);
      (MOTIFS[dest.layout] || MOTIFS.weir)(ctx);
      // Two staged battle seals. The first opens the deeper ruin, the second
      // opens the named arena; tagged enemies make completion exact.
      addEncounter(ctx, 'threshold', first, regionEnemies[0], regionEnemies[1], 4, (first[1] + second[1]) * 0.5);
      addEncounter(ctx, 'sanctum', second, regionEnemies[1], regionEnemies[0], 5, (second[1] + last[1]) * 0.5);
      arch(ctx, 0, 51, 7, 7.5, 0, ctx.rm.stone);
      arch(ctx, last[0], last[1] + 10, 13, 9, 0, ctx.rm.accent);
      const arena = addMesh(ctx, new THREE.Mesh(new THREE.CylinderGeometry(dest.arenaR + 4, dest.arenaR + 5, 0.7, 32), ctx.rm.floor), last[0], -0.1, last[1]);
      arena.receiveShadow = true;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        crystal(ctx, last[0] + Math.cos(a) * (dest.arenaR + 2.6), last[1] + Math.sin(a) * (dest.arenaR + 2.6), 0.42 + (i % 2) * 0.2);
      }
      // A safe relic plinth waits behind the arena and gives every expedition
      // a destination-like final silhouette before the fight begins.
      place(ctx.scene, ctx.collide, 'pedestal', last[0], 0, last[1] - dest.arenaR - 4, 0, { ctx: 'interior' });
    },
    update(ctx, dt, t) {
      for (const a of ctx._trialAnimated || []) {
        if (a.kind === 'spin') a.mesh.rotation.z += dt * a.speed;
        else if (a.kind === 'pulse') a.mesh.scale.y = 1 + Math.sin(t * a.speed) * 0.08;
        else if (a.kind === 'breathe') a.mesh.position.y = a.baseY + Math.sin(t * a.speed + (a.phase || 0)) * 0.12;
        else if (a.kind === 'float') a.mesh.position.y = a.baseY + Math.sin(t * a.speed + a.phase) * 1.1;
        else if (a.kind === 'orbit') {
          const q = t * a.speed + a.phase;
          a.mesh.position.set(a.ox + Math.cos(q) * a.radius, a.y + Math.sin(q * 1.7) * 0.7, a.oz + Math.sin(q) * a.radius);
          a.mesh.rotation.y += dt;
        }
      }
    },
  };
}
