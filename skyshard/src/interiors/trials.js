// Authored ruin-expedition scenes. A shared low-level kit keeps shader and
// collision costs bounded; every destination supplies a different route and
// a destination-specific motif function, so layout, silhouette, encounter
// rhythm, and boss reveal are not palette swaps.

import * as THREE from 'three';
import { REGIONS } from '../world/regions.js';
import { mats, place, addGlow, canvasTex } from '../world/props.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r0, r1, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);

// Trial halls need to survive the game's fairly generous interior light rig.
// These palettes are intentionally much darker and more chromatic than the
// outdoor cliff colors: the key and secondary colors read as authored pools
// of light instead of bleaching every ruin toward the same neutral gray.
const TRIAL_PALETTES = {
  vale: {
    floor: 0x1b2d22, stone: 0x4b6248, stone2: 0x293b2e, path: 0x315c38,
    accent: 0x8df06d, secondary: 0xf0c46b, dark: 0x070d0a,
    fog: [0.055, 0.085, 0.062], hemi: [0.40, 0.56, 0.42], ground: [0.055, 0.085, 0.058],
  },
  ember: {
    floor: 0x26130d, stone: 0x563022, stone2: 0x21100c, path: 0x492015,
    accent: 0xff6b2e, secondary: 0xffc65b, dark: 0x0b0605,
    fog: [0.10, 0.035, 0.018], hemi: [0.54, 0.25, 0.16], ground: [0.08, 0.025, 0.012],
  },
  frost: {
    floor: 0x142131, stone: 0x405b70, stone2: 0x172536, path: 0x203f59,
    accent: 0x8edfff, secondary: 0xd7eeff, dark: 0x060b13,
    fog: [0.045, 0.075, 0.115], hemi: [0.34, 0.48, 0.66], ground: [0.04, 0.065, 0.10],
  },
  mycel: {
    floor: 0x10201d, stone: 0x29443a, stone2: 0x142823, path: 0x1d4638,
    accent: 0x68ffc2, secondary: 0xd56dff, dark: 0x050b0c,
    fog: [0.035, 0.075, 0.066], hemi: [0.26, 0.48, 0.42], ground: [0.025, 0.065, 0.055],
  },
  shatter: {
    floor: 0x1b1429, stone: 0x49365e, stone2: 0x21172f, path: 0x342354,
    accent: 0xc88cff, secondary: 0x6ee8ff, dark: 0x08060e,
    fog: [0.065, 0.035, 0.095], hemi: [0.44, 0.32, 0.58], ground: [0.055, 0.03, 0.08],
  },
};

const MATERIALS = new Map();
function ruinMats(region) {
  if (MATERIALS.has(region)) return MATERIALS.get(region);
  const palette = TRIAL_PALETTES[region];
  const key = new THREE.Color(palette.accent);
  const secondary = new THREE.Color(palette.secondary);
  const base = new THREE.Color(palette.floor);
  const floorTex = canvasTex(`trial-floor-${region}`, 256, (g, s) => {
    const c = base.clone();
    g.fillStyle = `#${c.getHexString()}`;
    g.fillRect(0, 0, s, s);
    let seed = region.length * 917 + 31;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 1300; i++) {
      const v = 125 + (rnd() * 70 | 0);
      g.fillStyle = `rgba(${v},${v},${v},${0.018 + rnd() * 0.045})`;
      const n = 1 + rnd() * 5;
      g.fillRect(rnd() * s, rnd() * s, n, n * (0.35 + rnd()));
    }
    g.strokeStyle = 'rgba(2,4,8,.42)';
    g.lineWidth = 2;
    for (let y = 0; y < s; y += 32) {
      g.beginPath(); g.moveTo(0, y + (y % 64 ? 9 : 0)); g.lineTo(s, y); g.stroke();
    }
    g.strokeStyle = `rgba(${Math.round(key.r * 255)},${Math.round(key.g * 255)},${Math.round(key.b * 255)},.13)`;
    g.lineWidth = 1;
    for (let x = 16; x < s; x += 64) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 12, s); g.stroke();
    }
  });
  floorTex.repeat.set(10, 16);
  const out = {
    palette,
    floor: new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 0.9, metalness: region === 'shatter' ? 0.16 : 0.01 }),
    stone: new THREE.MeshStandardMaterial({ color: palette.stone, roughness: 0.84, metalness: region === 'shatter' ? 0.22 : 0.02 }),
    stone2: new THREE.MeshStandardMaterial({ color: palette.stone2, roughness: 0.94, metalness: region === 'shatter' ? 0.15 : 0 }),
    path: new THREE.MeshStandardMaterial({ color: palette.path, emissive: key, emissiveIntensity: 0.13, roughness: 0.72, metalness: 0.08 }),
    pathEdge: new THREE.MeshBasicMaterial({ color: key.clone().multiplyScalar(0.72), transparent: true, opacity: 0.82, depthWrite: false }),
    accent: new THREE.MeshStandardMaterial({ color: key.clone().multiplyScalar(0.58), emissive: key, emissiveIntensity: 1.05, roughness: 0.26, metalness: 0.2 }),
    secondary: new THREE.MeshStandardMaterial({ color: secondary.clone().multiplyScalar(0.56), emissive: secondary, emissiveIntensity: 0.92, roughness: 0.3, metalness: 0.14 }),
    glow: new THREE.MeshBasicMaterial({ color: key, transparent: true, opacity: 0.74, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    secondaryGlow: new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    dark: new THREE.MeshStandardMaterial({ color: palette.dark, roughness: 0.74, metalness: region === 'shatter' ? 0.5 : 0.28 }),
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

// A floor-language mark, not terrain. Route graphics sit almost exactly on the
// base floor and deliberately own no collider, so entering an expedition never
// asks the player to jump an ornamental plate.
function inlay(ctx, x, z, w, d, mat = null, rot = 0) {
  const m = addMesh(ctx, box(w, 0.024, d, mat || ctx.rm.stone2), x, 0.006, z, false);
  m.rotation.y = rot;
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
  const springY = Math.max(2.8, h * 0.56);
  const rise = Math.max(1.25, h - springY);
  const pierR = Math.min(0.76, Math.max(0.42, w * 0.025));
  pillar(ctx, x - dx, z - dz, pierR, springY, m);
  pillar(ctx, x + dx, z + dz, pierR, springY, m);
  for (const side of [-1, 1]) {
    const px = x + dx * side, pz = z + dz * side;
    const base = addMesh(ctx, box(pierR * 2.25, 0.34, pierR * 2.45, ctx.rm.stone2), px, 0.17, pz);
    base.rotation.y = rot;
    const capital = addMesh(ctx, box(pierR * 2.5, 0.42, pierR * 2.7, ctx.rm.secondary), px, springY - 0.2, pz);
    capital.rotation.y = rot;
  }
  // A compressed half-torus gives the nave a true curved vault profile. The
  // previous horizontal box lintels were the main source of the scaffold look.
  const radius = w / 2;
  const curve = addMesh(ctx, new THREE.Mesh(
    new THREE.TorusGeometry(radius, Math.min(0.68, 0.28 + w * 0.008), 7, Math.max(16, Math.round(w * 0.7)), Math.PI),
    m,
  ), x, springY, z);
  curve.scale.y = rise / radius;
  curve.rotation.y = rot;
  const outer = addMesh(ctx, new THREE.Mesh(
    new THREE.TorusGeometry(radius + 0.65, 0.14, 5, Math.max(16, Math.round(w * 0.65)), Math.PI),
    ctx.rm.secondary,
  ), x, springY, z, false);
  outer.scale.y = rise / (radius + 0.65);
  outer.rotation.y = rot;
  const keystone = addMesh(ctx, box(Math.max(0.65, w * 0.035), Math.max(0.72, h * 0.07), 1.12, ctx.rm.secondary), x, h - 0.3, z);
  keystone.rotation.y = rot;
  return curve;
}

function floorHalo(ctx, x, z, r = 3, mat = null) {
  const halo = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(r, 0.075, 5, 30), mat || ctx.rm.pathEdge), x, 0.026, z, false);
  halo.rotation.x = Math.PI / 2;
  return halo;
}

function lightPool(ctx, x, z, secondary = false, scale = 1) {
  const material = secondary ? ctx.rm.secondary : ctx.rm.accent;
  const glowMaterial = secondary ? ctx.rm.secondaryGlow : ctx.rm.glow;
  const lamp = addMesh(ctx, new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 * scale, 0), material), x, 2.35 * scale, z, false);
  const cage = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(0.72 * scale, 0.075, 5, 16), glowMaterial), x, 2.35 * scale, z, false);
  cage.rotation.x = Math.PI / 2;
  const stem = addMesh(ctx, cyl(0.09, 0.14, 2.0 * scale, 6, ctx.rm.dark), x, 1.0 * scale, z, false);
  stem.rotation.z = (secondary ? -1 : 1) * 0.025;
  floorHalo(ctx, x, z, 2.4 * scale, secondary ? ctx.rm.secondaryGlow : ctx.rm.pathEdge);
  const c = new THREE.Color(secondary ? ctx.rm.palette.secondary : ctx.rm.palette.accent);
  addGlow(x, 2.6 * scale, z, [c.r, c.g, c.b], 1.6 + scale * 0.45, 0.16);
  ctx._trialAnimated.push({ mesh: cage, kind: 'spin', speed: secondary ? -0.12 : 0.14 });
  return lamp;
}

function routeRibbon(ctx, x, z, nx, nz) {
  const dx = nx - x, dz = nz - z, len = Math.hypot(dx, dz);
  const rot = Math.atan2(dx, dz);
  const mx = (x + nx) / 2, mz = (z + nz) / 2;
  inlay(ctx, mx, mz, 6.2, len, ctx.rm.path, rot);
  const lx = Math.cos(rot) * 2.72, lz = -Math.sin(rot) * 2.72;
  inlay(ctx, mx + lx, mz + lz, 0.12, len, ctx.rm.pathEdge, rot);
  inlay(ctx, mx - lx, mz - lz, 0.12, len, ctx.rm.pathEdge, rot);
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

function buildEncounterGate(ctx, gateZ) {
  const gate = new THREE.Group();
  gate.name = `expedition-gate-${ctx.dest.id}`;
  gate.position.set(0, 0, gateZ);
  ctx.scene.add(gate);

  const sealMat = new THREE.MeshStandardMaterial({
    color: ctx.rm.dark.color.clone().lerp(ctx.rm.accent.color, 0.18),
    emissive: ctx.rm.accent.emissive.clone(), emissiveIntensity: 0.38,
    transparent: true, opacity: 0.92, roughness: 0.7, metalness: ctx.dest.region === 'shatter' ? 0.42 : 0.12,
  });
  const crackMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(...REGIONS[ctx.dest.region].key), transparent: true, opacity: 0.34,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  // Keep the presentation material in userData. Giving a Group a top-level
  // `material` property makes Three's shader precompiler treat it like a Mesh
  // and dereference a nonexistent geometry.
  gate.userData.sealMaterial = crackMat;
  gate.userData.leaves = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.x = side * 17.6;
    // A deep portcullis frame seals the arena without becoming a flat opaque
    // wall. Players can read the destination and its far landmark through it.
    for (const y of [0.55, 7.5]) {
      const rail = box(35.2, 0.72, 1.35, sealMat);
      rail.position.y = y;
      leaf.add(rail);
    }
    const midRail = box(35.2, 0.26, 1.0, ctx.rm.secondary);
    midRail.position.y = 4.0;
    leaf.add(midRail);
    for (const braceRot of [-0.2, 0.2]) {
      const brace = box(35.8, 0.34, 1.08, ctx.rm.stone2);
      brace.position.y = 4.0;
      brace.rotation.z = braceRot * side;
      leaf.add(brace);
    }
    for (let x = -15.4; x <= 15.4; x += 4.4) {
      let rib;
      if (ctx.dest.region === 'vale' || ctx.dest.region === 'mycel') {
        rib = cyl(0.15, 0.38, 8.4, 7, ctx.dest.region === 'vale' ? ctx.rm.stone : ctx.rm.accent);
        rib.rotation.z = (x / 15.4) * 0.12;
      } else if (ctx.dest.region === 'frost') {
        rib = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), ctx.rm.accent);
        rib.scale.set(0.4, 5.2, 0.55);
      } else {
        rib = box(0.38, 8.4, 1.18, Math.round(x) % 2 ? ctx.rm.stone : ctx.rm.accent);
        rib.rotation.z = (x % 3 - 1) * 0.045;
      }
      rib.position.set(x, 4.1, 0);
      leaf.add(rib);
      const strand = box(0.065, 6.6, 0.16, crackMat);
      strand.position.set(x + 1.3, 4.0, 0.68);
      leaf.add(strand);
    }
    const sigil = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 7, 24), crackMat);
    sigil.position.set(side * -11.5, 4.2, 0.52);
    leaf.add(sigil);
    gate.add(leaf);
    gate.userData.leaves.push({ mesh: leaf, originX: leaf.position.x, side });
  }
  for (const x of [-35.2, 35.2]) {
    const pier = cyl(0.82, 1.05, 11.2, 8, ctx.rm.stone);
    pier.position.set(x, 5.6, 0);
    gate.add(pier);
    const capital = box(2.6, 0.55, 2.8, ctx.rm.secondary);
    capital.position.set(x, 10.85, 0);
    gate.add(capital);
  }
  const crest = new THREE.Mesh(new THREE.TorusGeometry(35.2, 0.5, 7, 48, Math.PI), ctx.rm.stone);
  crest.position.set(0, 8.6, 0);
  crest.scale.y = 0.11;
  gate.add(crest);
  const crestGlow = new THREE.Mesh(new THREE.TorusGeometry(34.2, 0.12, 5, 48, Math.PI), ctx.rm.secondaryGlow);
  crestGlow.position.set(0, 8.65, 0.55);
  crestGlow.scale.y = 0.12;
  gate.add(crestGlow);

  gate.userData.openT = 0;
  gate.userData.opening = false;
  const open = (instant = false) => {
    if (instant) {
      gate.userData.openT = 1;
      gate.userData.opening = false;
      gate.visible = false;
    } else if (gate.visible) {
      gate.userData.opening = true;
    }
  };
  const update = (dt) => {
    if (!gate.userData.opening) return;
    gate.userData.openT = Math.min(1, gate.userData.openT + dt / 1.05);
    const t = gate.userData.openT;
    const eased = t * t * (3 - 2 * t);
    for (const leaf of gate.userData.leaves) {
      leaf.mesh.position.x = leaf.originX + leaf.side * eased * 31;
      leaf.mesh.rotation.y = leaf.side * eased * 0.22;
      leaf.mesh.position.y = -eased * 1.4;
    }
    crackMat.opacity = Math.max(0, 0.34 * (1 - t));
    if (t >= 1) {
      gate.userData.opening = false;
      gate.visible = false;
    }
  };
  return { gate, open, update };
}

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
  const gateBuild = buildEncounterGate(ctx, gateZ);
  const gate = gateBuild.gate;
  const collider = ctx.collide.addBox(-35, gateZ - 0.35, 35, gateZ + 0.35, 0, 9);
  ctx.encounters.push({
    id, tag, trigger: { x: center[0], z: center[1], r: 10 }, spawns,
    gate, collider, open: gateBuild.open, updateGate: gateBuild.update,
    spawned: false, cleared: false,
  });
}

function wallRose(ctx, x, y, z, r, faceX = false, secondary = false) {
  const material = secondary ? ctx.rm.secondary : ctx.rm.accent;
  const rose = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(r, 0.22, 7, 32), material), x, y, z, false);
  if (faceX) rose.rotation.y = Math.PI / 2;
  const inner = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, 0.1, 5, 24), secondary ? ctx.rm.secondaryGlow : ctx.rm.glow), x, y, z, false);
  if (faceX) inner.rotation.y = Math.PI / 2;
  ctx._trialAnimated.push({ mesh: inner, kind: 'spin', speed: secondary ? -0.08 : 0.1 });
  return rose;
}

function buildSideChapel(ctx, x, z, index) {
  const facing = Math.sign(x) || 1;
  inlay(ctx, x, z, 17, 15, ctx.rm.dark);
  inlay(ctx, x - facing * 1.4, z, 12, 10, ctx.rm.path);
  arch(ctx, x - facing * 5.2, z, 13.5, 10.5, Math.PI / 2, ctx.rm.stone);
  const canopy = addMesh(ctx, new THREE.Mesh(
    new THREE.SphereGeometry(6.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    index % 2 ? ctx.rm.stone2 : ctx.rm.stone,
  ), x + facing * 1.6, 7.2, z, false);
  canopy.scale.set(1, 0.48, 0.9);
  wallRose(ctx, x + facing * 5.4, 6.6, z, 3.15, true, index % 2 === 1);
  const altarMat = index % 2 ? ctx.rm.secondary : ctx.rm.accent;
  const altar = addMesh(ctx, new THREE.Mesh(new THREE.DodecahedronGeometry(0.88, 0), altarMat), x + facing * 2.1, 1.55, z, false);
  altar.scale.y = 1.45;
  floorHalo(ctx, x + facing * 2.1, z, 3.4, index % 2 ? ctx.rm.secondaryGlow : ctx.rm.pathEdge);
}

function buildRegionButtresses(ctx) {
  if (ctx.dest.region === 'vale') {
    // Warm/cool vesper lamps just inside the threshold keep Vale's deliberately
    // shadowed masonry readable before the player reaches the deeper pools.
    lightPool(ctx, -11.5, 49, true, 0.86);
    lightPool(ctx, 11.5, 49, false, 0.86);
    for (const x of [-36, 36]) for (let z = 45; z > -50; z -= 18) {
      root(ctx, x, z, 13, x < 0 ? -0.72 : 0.72, 0.8);
      crystal(ctx, x * 0.91, z + 1.8, 0.32, 0.35);
    }
  } else if (ctx.dest.region === 'ember') {
    for (const x of [-34, 34]) for (const z of [39, 3, -34]) {
      const furnace = addMesh(ctx, cyl(1.4, 1.8, 11, 10, ctx.rm.dark), x, 5.5, z);
      const mouth = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.24, 7, 22), ctx.rm.secondary), x - Math.sign(x) * 1.55, 4.1, z, false);
      mouth.rotation.y = Math.PI / 2;
      const crown = addMesh(ctx, new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.3, 8, 1, true), ctx.rm.stone), x, 12.2, z, false);
      crown.rotation.z = x < 0 ? -0.08 : 0.08;
      ring(ctx, furnace.position.x, 8.4, z, 2.15, 0);
    }
  } else if (ctx.dest.region === 'frost') {
    for (let i = 0; i < 16; i++) {
      const x = (i % 2 ? 1 : -1) * (32 + (i % 3));
      const z = 49 - (i >> 1) * 13.5;
      crystal(ctx, x, z, 0.95 + (i % 4) * 0.3);
      const fin = addMesh(ctx, new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), i % 3 ? ctx.rm.stone : ctx.rm.secondary), x * 0.96, 8 + (i % 3) * 1.8, z, false);
      fin.scale.set(0.4, 3.2, 0.55);
      fin.rotation.z = x < 0 ? -0.18 : 0.18;
    }
  } else if (ctx.dest.region === 'mycel') {
    for (const x of [-33, 33]) for (let z = 43; z > -49; z -= 15) {
      cap(ctx, x, z, 1.45 + ((z + 48) % 3) * 0.12, z % 2 ? ctx.rm.palette.secondary : null);
      const gill = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.12, 6, 24), z % 2 ? ctx.rm.secondaryGlow : ctx.rm.glow), x, 6.1, z, false);
      gill.rotation.x = Math.PI / 2;
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const shard = addMesh(ctx, new THREE.Mesh(
        new THREE.OctahedronGeometry(0.9 + i % 3 * 0.32, 0),
        i % 3 ? ctx.rm.accent : ctx.rm.secondary,
      ), (i % 2 ? 1 : -1) * 33, 5 + i % 4 * 2.5, 47 - i * 7.6, false);
      shard.rotation.set(i * 0.2, i * 0.41, i * -0.14);
      ctx._trialAnimated.push({ mesh: shard, kind: 'float', baseY: shard.position.y, speed: 0.32 + i * 0.02, phase: i });
    }
  }
}

function buildProcessionalFocal(ctx, last) {
  const fx = Math.max(-9, Math.min(9, last[0] * 0.35));
  const fz = -60.7;
  wallRose(ctx, fx, 10.1, fz, 6.2, false, true);
  wallRose(ctx, fx, 10.1, fz + 0.08, 3.7, false, false);
  const heart = addMesh(ctx, new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), ctx.rm.accent), fx, 10.1, fz + 0.45, false);
  ctx._trialAnimated.push({ mesh: heart, kind: 'pulse', speed: 1.15 });
  const primary = new THREE.Color(ctx.rm.palette.accent);
  addGlow(fx, 9.5, fz + 1.2, [primary.r, primary.g, primary.b], 2.4, 0.08);

  if (ctx.dest.region === 'vale') {
    for (const side of [-1, 1]) root(ctx, fx + side * 7.2, fz + 1, 13, side * -0.5, 0.2);
    for (const x of [fx - 4.4, fx, fx + 4.4]) {
      const leaf = addMesh(ctx, new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), x === fx ? ctx.rm.secondary : ctx.rm.accent), x, 15.2 - Math.abs(x - fx) * 0.2, fz + 0.2, false);
      leaf.scale.y = 0.58;
    }
  } else if (ctx.dest.region === 'ember') {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const ray = addMesh(ctx, box(0.32, 4.1, 0.5, i % 2 ? ctx.rm.secondary : ctx.rm.accent), fx + Math.cos(a) * 8.8, 10.1 + Math.sin(a) * 8.8, fz + 0.15, false);
      ray.rotation.z = -a;
    }
  } else if (ctx.dest.region === 'frost') {
    for (let i = -2; i <= 2; i++) {
      const spire = addMesh(ctx, new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 0), i % 2 ? ctx.rm.secondary : ctx.rm.accent), fx + i * 3.0, 12.5 - Math.abs(i) * 1.1, fz + 0.2, false);
      spire.scale.set(0.5, 3.7 - Math.abs(i) * 0.45, 0.5);
    }
  } else if (ctx.dest.region === 'mycel') {
    const crown = addMesh(ctx, new THREE.Mesh(new THREE.SphereGeometry(8.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), ctx.rm.secondary), fx, 16.0, fz, false);
    crown.scale.y = 0.42;
    for (const side of [-1, 1]) cap(ctx, fx + side * 7.8, fz + 1, 1.8, ctx.rm.palette.secondary);
  } else {
    for (const [r, tilt] of [[8.7, 0], [6.4, Math.PI / 2], [4.9, Math.PI / 3]]) {
      const orbit = addMesh(ctx, new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 6, 32), r === 6.4 ? ctx.rm.secondary : ctx.rm.accent), fx, 10.1, fz + 0.2, false);
      orbit.rotation.set(tilt, tilt * 0.35, tilt * 0.2);
      ctx._trialAnimated.push({ mesh: orbit, kind: 'spin', speed: 0.05 + r * 0.006 });
    }
  }
}

function buildRoute(ctx) {
  const path = ctx.dest.path;
  // A generous vaulted court replaces the old identical runway. Route points
  // remain destination-specific but are now flush mosaic inlays over one stable
  // walking surface.
  slab(ctx, 0, 0, 80, 124, 0.5, 0, ctx.rm.floor);
  for (let i = 0; i < path.length; i++) {
    const [x, z] = path[i];
    inlay(ctx, x, z, 11 - (i % 3), 8 + (i % 2) * 2, i === path.length - 1 ? ctx.rm.accent : ctx.rm.path);
    floorHalo(ctx, x, z, 2.8 + (i % 2) * 0.45, i === path.length - 1 ? ctx.rm.secondaryGlow : ctx.rm.pathEdge);
    if (i < path.length - 1) {
      const [nx, nz] = path[i + 1];
      routeRibbon(ctx, x, z, nx, nz);
    }
  }
  // Dark masonry and a faceted barrel canopy establish a readable envelope.
  // The camera now sees a shadowed building around the light pools instead of
  // pale fog behind a collection of free-standing construction frames.
  wall(ctx, -40, 0, 124, 20, Math.PI / 2, ctx.rm.stone2);
  wall(ctx, 40, 0, 124, 20, Math.PI / 2, ctx.rm.stone2);
  wall(ctx, 0, -62, 80, 20, 0, ctx.rm.stone2);
  wall(ctx, -22, 62, 36, 15, 0, ctx.rm.stone2);
  wall(ctx, 22, 62, 36, 15, 0, ctx.rm.stone2);
  const crown = addMesh(ctx, box(34, 0.72, 122, ctx.rm.dark), 0, 20.3, 0, false);
  const leftCanopy = addMesh(ctx, box(24, 0.62, 122, ctx.rm.dark), -27.8, 18.6, 0, false);
  leftCanopy.rotation.z = -0.145;
  const rightCanopy = addMesh(ctx, box(24, 0.62, 122, ctx.rm.dark), 27.8, 18.6, 0, false);
  rightCanopy.rotation.z = 0.145;
  for (let z = 50; z >= -50; z -= 20) arch(ctx, 0, z, 62, 19 + ((Math.abs(z) / 20) & 1) * 1.2, 0, ctx.rm.stone);
  for (const x of [-39.55, 39.55]) for (let z = 50; z >= -50; z -= 20) {
    const buttress = addMesh(ctx, box(0.72, 14.5, 5.8, ctx.rm.stone), x, 7.25, z, false);
    buttress.rotation.z = x < 0 ? -0.025 : 0.025;
  }

  // Sculptural side chapels create breadth, alternating warm/cool devotions,
  // and recognizable rooms along the unmodified canonical route.
  const turn = (ctx.dest.id.length % 2) ? 1 : -1;
  [[turn * 28.5, 29], [-turn * 29, -7], [turn * 28, -36]].forEach(([x, z], i) => buildSideChapel(ctx, x, z, i));
  [[-24, 39, false], [24, 11, true], [-24, -19, false], [24, -44, true]].forEach(([x, z, secondary], i) => {
    lightPool(ctx, x * turn, z, secondary, i === 3 ? 1.12 : 0.92);
  });
  buildRegionButtresses(ctx);
}

export function makeTrialDef(dest) {
  const palette = TRIAL_PALETTES[dest.region];
  const fog = palette.fog;
  const path = dest.path;
  const first = path[Math.min(2, path.length - 3)];
  const second = path[Math.max(3, path.length - 3)];
  const last = path[path.length - 1];
  const regionEnemies = {
    vale: ['hopper', 'puff'], ember: ['hound', 'turret'], frost: ['wisp', 'golem'],
    mycel: ['creeper', 'gasbag'], shatter: ['drone', 'sentinel'],
  }[dest.region];
  const lightLevels = {
    vale: [0.28, 0.30], ember: [0.16, 0.28], frost: [0.24, 0.2],
    mycel: [0.18, 0.16], shatter: [0.18, 0.22],
  }[dest.region];
  return {
    fog,
    fogDensity: dest.region === 'mycel' ? 0.0105 : 0.0072,
    hemiIntensity: lightLevels[0],
    hemiColor: palette.hemi,
    hemiGround: palette.ground,
    sun: lightLevels[1],
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
      buildProcessionalFocal(ctx, last);
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
      for (const encounter of ctx.encounters || []) encounter.updateGate?.(dt);
    },
  };
}
