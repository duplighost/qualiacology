// Procedural lunar terrain. The mesh and every gameplay system sample this
// exact analytic height field, so the larger battlefield stays cheap and solid.

import * as THREE from 'three';
import { lerp, clamp01 } from '../engine/math.js';
import {
  POND, WATER_Y, POND_DEPTH, pondDist, setPondLevel,
  ENTRANCES, ENTRANCE_CARVE, TUNNEL_FLOOR, CAVERN_R,
  caveSDF, caveFloorY, caveCeilY, isUnder,
} from './layout.js';

const PLAY_RADIUS = 82;
const SIZE = 420;
const SEG = 192;

// --- deterministic value-noise fbm ---------------------------------------
function hash(x, z) {
  let h = (x | 0) * 374761393 + (z | 0) * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = fade(xf), v = fade(zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, z) {
  let f = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 4; i++) { f += vnoise(x * freq, z * freq) * amp; freq *= 2.03; amp *= 0.5; }
  return f;
}

// The height field. REAL rolling hills now (two octaves of big shapes), a pond
// basin, sinkhole craters that funnel down into the underground, a roof clamp
// over the cavern so the ground never dips through it, and a steep rise past
// PLAY_RADIUS to fence the arena in naturally.
// the raw hill shapes (no pond / no craters) — used for pond calibration too
function baseHeight(x, z) {
  const rolling = (fbm(x * 0.013 + 11, z * 0.013 + 7) - 0.5) * 11.0;
  const medium = (fbm(x * 0.035 + 31, z * 0.035 + 57) - 0.5) * 5.2;
  const detail = (fbm(x * 0.11, z * 0.11) - 0.5) * 0.72;
  let h = rolling + medium + detail + 0.6;
  const craters = [
    [-43, -22, 18, 3.4], [39, -37, 13, 2.6], [46, 31, 19, 4.2],
    [-35, 42, 11, 2.2], [8, 50, 15, 2.8], [-58, 12, 9, 1.8],
  ];
  for (const [cx, cz, radius, depth] of craters) {
    const d = Math.hypot(x - cx, z - cz) / radius;
    if (d < 1.38) {
      const bowl = d < 1
        ? -(1 - d * d) * depth
        : Math.sin(((d - 1) / 0.38) * Math.PI) * depth * 0.32;
      h += bowl;
    }
  }
  // keep enough rock between the surface and the cavern ceiling below it
  const sdf = caveSDF(x, z);
  if (sdf < 6) h = Math.max(h, lerp(-4.8, h, clamp01(sdf / 6)));
  const d = Math.hypot(x, z);
  // fence the arena with a ridge of highlands — capped, so it reads as a
  // valley rim with real sky and distant peaks above it, not an endless wall
  // (uncapped, the far vertices climbed to ~2000 and the fogged cliff face
  // WAS the visible "sky", depth-occluding everything behind it)
  if (d > PLAY_RADIUS) h += Math.min(Math.pow((d - PLAY_RADIUS) / 25, 2.0) * 13, 24);
  return h;
}

export function terrainHeight(x, z) {
  let h = baseHeight(x, z);
  // pond basin: carve DOWN into whatever terrain is here (never raise it), so
  // the water always sits in a genuine bowl
  const pd = pondDist(x, z);
  const pondOuter = POND.r + POND.rimBlend;
  if (pd < pondOuter) {
    const k = clamp01((pondOuter - pd) / (pondOuter - POND.r * 0.3));
    const ease = k * k * (3 - 2 * k);
    h = Math.min(h, lerp(h, WATER_Y - POND_DEPTH, ease));
    if (pd < POND.r * 0.92) h = Math.min(h, lerp(WATER_Y - 0.2, WATER_Y - POND_DEPTH, 1 - pd / POND.r));
  }
  // sinkhole craters: the surface funnels down to the tunnel floor, with a
  // wide flat mouth so the way in reads clearly from the rim
  for (const e of ENTRANCES) {
    const ed = Math.hypot(x - e.x, z - e.z);
    if (ed < ENTRANCE_CARVE) {
      const k = clamp01((ENTRANCE_CARVE - ed) / (ENTRANCE_CARVE - 3.2));
      h = Math.min(h, lerp(h, TUNNEL_FLOOR, k * k * (3 - 2 * k)));
    }
  }
  return h;
}

// Calibrate the waterline to the basin's LOWEST rim point (sampled once at
// load) so the pond is a depression wherever the hills happen to put it.
{
  let rimMin = Infinity;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = POND.r + POND.rimBlend;
    rimMin = Math.min(rimMin, baseHeight(POND.x + Math.cos(a) * r, POND.z + Math.sin(a) * r));
  }
  setPondLevel(rimMin - 0.35);
}

// Layer-aware ground: if the point is inside the underground space (and below
// its ceiling), the floor under it is the cave floor, else the surface terrain.
// Everything walks/lands/bounces on this one function.
export function groundAt(x, z, y) {
  if (isUnder(x, z, y)) return caveFloorY(x, z);
  return terrainHeight(x, z);
}

export function terrainNormal(x, z, out = new THREE.Vector3()) {
  const e = 0.6;
  const hL = terrainHeight(x - e, z), hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e), hU = terrainHeight(x, z + e);
  return out.set(hL - hR, 2 * e, hD - hU).normalize();
}

// --- ground detail texture ------------------------------------------------
function lunarTexture() {
  const s = 256;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6d727b'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    const g = 90 + Math.random() * 95;
    ctx.fillStyle = `rgba(${(g * 0.88) | 0},${(g * 0.94) | 0},${g | 0},${0.18 + Math.random() * 0.35})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 1 + Math.random() * 4;
    const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    grad.addColorStop(0, 'rgba(35,39,48,.38)');
    grad.addColorStop(.72, 'rgba(72,78,90,.22)');
    grad.addColorStop(1, 'rgba(205,215,230,.12)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(72, 72);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Lunar mineral colors blended per vertex by slope, height, and impact wear.
const C_GRASS = new THREE.Color(0x6b7079);
const C_GRASS_DRY = new THREE.Color(0x9299a5);
const C_DIRT = new THREE.Color(0x4a4f59);
const C_ROCK = new THREE.Color(0x6a6560);
const C_SAND = new THREE.Color(0x39495b);
const C_MUD = new THREE.Color(0x252934);
// The sinkhole throat. Deliberately far darker than any other ground mineral:
// the way down has to read as a hole punched in the plain, by brightness alone.
const C_CRATER = new THREE.Color(0x101319);

export function buildTerrain(scene) {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    terrainNormal(x, z, n);
    const slope = 1 - clamp01(n.y);                 // 0 flat → 1 vertical
    const dry = clamp01((fbm(x * 0.04 + 40, z * 0.04) - 0.4) * 2); // patchy dry grass
    col.copy(C_GRASS).lerp(C_GRASS_DRY, dry * 0.6);
    if (slope > 0.32) col.lerp(C_DIRT, clamp01((slope - 0.32) / 0.2));
    if (slope > 0.55) col.lerp(C_ROCK, clamp01((slope - 0.55) / 0.25));
    if (h < -2.5) col.lerp(C_DIRT, clamp01((-2.5 - h) / 3) * 0.5); // valleys darker
    // sandy shore ringing the pond, muddy bed under the water
    const pd = pondDist(x, z);
    if (pd < POND.r + 2.5) {
      col.lerp(C_SAND, clamp01((POND.r + 2.5 - pd) / 3) * 0.8);
      if (h < WATER_Y) col.lerp(C_MUD, 0.55);
    }
    // The sinkhole craters. C_ROCK used to be within a few percent of the plain
    // it sat in, so a crater had no albedo read at all and the bowl only existed
    // as shading — which at this light level is nothing. Now the throat falls
    // away to near-black well before the rim, so each mouth is a dark disc on a
    // lighter field: legible at any distance, and legible without colour.
    for (const e of ENTRANCES) {
      const ed = Math.hypot(x - e.x, z - e.z);
      if (ed < ENTRANCE_CARVE) {
        const into = clamp01((ENTRANCE_CARVE - ed) / (ENTRANCE_CARVE * 0.78));
        col.lerp(C_CRATER, into * into * 0.94);
      }
    }
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: lunarTexture(), roughness: 0.91, metalness: 0.08,
  });
  // season blend, on the GPU: warm the ground in autumn, then lay snow on the
  // up-facing surfaces in winter. vUpFactor is the object-space normal.y, which
  // equals world-up because the terrain mesh is never rotated.
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = { value: 0 };
    shader.uniforms.uAutumn = { value: 0 };
    shader.vertexShader = 'varying float vUpFactor;\n' + shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\n  vUpFactor = normalize(objectNormal).y;'
    );
    shader.fragmentShader = 'uniform float uSnow;\nuniform float uAutumn;\nvarying float vUpFactor;\n' + shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.35, 0.88, 0.5) + vec3(0.06, 0.015, 0.0), uAutumn);
       float _snow = smoothstep(0.45, 0.9, vUpFactor) * uSnow;
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 1.0), _snow);`
    );
    mat._shader = shader;
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);

  return {
    mesh,
    height: terrainHeight,
    groundAt,               // layer-aware: (x, z, y) → floor under that point
    ceilAt: caveCeilY,      // underground ceiling
    isUnder,                // (x, z, y) → in the underground space?
    normal: terrainNormal,
    playRadius: PLAY_RADIUS,
    size: SIZE,
    // season 0 = summer, 1 = deep winter
    setSeason(season) {
      const s = mat._shader; if (!s) return;
      const snow = clamp01((season - 0.42) / 0.58);
      s.uniforms.uSnow.value = snow;
      s.uniforms.uAutumn.value = clamp01(season * 2.2) * (1 - snow);
    },
  };
}
