// Terrain: one analytic height function (used by rendering, collision, AI,
// and prop placement — they can never disagree), rendered as lazily-built
// chunk meshes around the player. Vertex color carries biome identity; a
// procedural stormglass detail adds modern material response without
// changing the analytic collision height or loading external assets.

import * as THREE from 'three';
import { fbm2, noise2, hash2 } from '../core/rng.js';
import { clamp01, lerp, smoothstep } from '../core/math.js';
import { REGIONS, REGION_KEYS, regionWeights } from './regions.js';
import { DESTS, FROZEN_LAKE, SPIRE } from './destdata.js';
import { CFG } from '../config.js';
import { R6_THRESHOLDS, STARFALL_THRESHOLD, WONDERS } from './wonderdata.js';
import { worldGround } from './materials.js';

const ridge = (x, z, seed) => 1 - Math.abs(fbm2(x, z, 3, seed));

// Raw island height, before building sites flatten it.
function rawHeight(x, z) {
  const d = Math.hypot(x, z);

  // Island silhouette: rises from the sea floor, falls off past ~620m.
  const edge = smoothstep(690, 540, d);
  let h = -8 + edge * (14 + 4 * fbm2(x * 0.004, z * 0.004, 3, 11));

  if (edge > 0.001) {
    const w = regionWeights(x, z);
    h += edge * w.vale * (6.0 * fbm2(x * 0.013, z * 0.013, 4, 21) + 3.0);
    h += edge * w.ember * (2.8 * ridge(x * 0.02, z * 0.02, 31) + 0.4);
    h += edge * w.frost * (7.5 * fbm2(x * 0.009, z * 0.009, 4, 41) + 4.5);
    h += edge * w.mycel * (2.2 * fbm2(x * 0.02, z * 0.02, 3, 51) - 3.4);
    h += edge * w.shatter * (14 + 9 * ridge(x * 0.012, z * 0.012, 61));
  }

  // The hub hill under the Spire.
  h += 14 * Math.exp(-(d * d) / (95 * 95));
  return h;
}

// Sites that flatten the terrain (destinations, spire, frozen lake). Their
// heights derive from the raw terrain (with earlier flats applied, so the
// fisher's hut inherits the lake surface) — buildings always sit naturally.
const FLATS = [];
function flatsHeight(x, z, upTo) {
  let h = rawHeight(x, z);
  for (let i = 0; i < upTo; i++) {
    const f = FLATS[i];
    const dd = Math.hypot(x - f.x, z - f.z);
    if (dd < f.r) h = lerp(f.y, h, smoothstep(f.rim, f.r, dd));
  }
  return h;
}
{
  const sites = [
    { ref: FROZEN_LAKE, r: FROZEN_LAKE.r, rimF: 0.8, dy: -2.0 },   // the lake sinks below the snowfield
    { ref: SPIRE, r: SPIRE.r, rimF: 0.7, dy: 0 },
    ...DESTS.map((d) => ({ ref: d, r: d.r, rimF: 0.85, dy: 0 })),
  ];
  for (const s of sites) {
    const y = flatsHeight(s.ref.x, s.ref.z, FLATS.length) + s.dy;
    s.ref.y = y;                     // buildings/props read the same number
    FLATS.push({ x: s.ref.x, z: s.ref.z, r: s.r, rim: s.r * s.rimF, y });
  }
}

export function terrainHeight(x, z) {
  return flatsHeight(x, z, FLATS.length);
}

// Approximate normal by central differences — for slope checks + placement.
export function terrainNormal(x, z, out = new THREE.Vector3()) {
  const e = 0.6;
  const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

// ---------------------------------------------------------------------------

const CHUNK = CFG.world.chunk;         // 70m
const SEGS = 42;                       // 1.67m per quad, collision stays analytic

const SITE_GROUND = {
  vale: [.19, .27, .14], ember: [.12, .07, .055], frost: [.73, .80, .83],
  mycel: [.12, .27, .22], shatter: [.24, .19, .31],
};
const R6_SITES = Object.freeze([...WONDERS, ...R6_THRESHOLDS]);

function chunkKey(cx, cz) { return cx + ',' + cz; }

let detailTex = null;
let detailBump = null;
function terrainDetailTextures() {
  if (detailTex) return { detailTex, detailBump };
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const size = c.width;
  g.fillStyle = '#b9bbb6'; g.fillRect(0, 0, size, size);

  // Fine mineral grain breaks up broad color fields without turning nearby
  // ground into a collage of dark paper scraps. The palette stays almost
  // neutral so each biome's vertex color remains authoritative.
  for (let i = 0; i < 3400; i++) {
    const x = hash2(i * 1.17, 4, 874) * size;
    const y = hash2(i * .83, 9, 391) * size;
    const r = 1 + hash2(i, 6, 77) * 5;
    const v = 176 + (hash2(i, 11, 55) * 48 | 0);
    const cool = hash2(i, 13, 91) > .76 ? 5 : 0;
    g.fillStyle = `rgba(${v - cool},${v},${Math.min(255, v + cool)},${.07 + hash2(i, 3, 12) * .11})`;
    g.beginPath();
    g.moveTo(x - r, y + r * .18);
    g.lineTo(x + r * .24, y - r * .62);
    g.lineTo(x + r, y + r * .36);
    g.lineTo(x - r * .15, y + r * .72);
    g.closePath(); g.fill();
  }

  // Short, hairline fibres bridge the distance where instanced vegetation
  // becomes sub-pixel. They are deliberately low-contrast: shape now comes
  // from the real blade clusters instead of black marks baked into the soil.
  for (let i = 0; i < 5200; i++) {
    const x = hash2(i * 1.41, 51, 147) * size;
    const y = hash2(i * .91, 67, 271) * size;
    const len = 1 + hash2(i, 71, 119) * 3.5;
    const ang = hash2(i, 79, 331) * Math.PI * 2;
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    g.fillStyle = `rgba(54,70,67,${.035 + hash2(i, 83, 401) * .065})`;
    g.beginPath();
    g.moveTo(x - dy * .24, y + dx * .24);
    g.lineTo(x + dx, y + dy);
    g.lineTo(x + dy * .24, y - dx * .24);
    g.closePath(); g.fill();
  }

  // Sparse branching hairline fractures catch the bump light like wet slate,
  // with no grid or obvious texture-tile boundary.
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    let x = hash2(i, 17, 19) * size, y = hash2(i, 29, 23) * size;
    g.strokeStyle = `rgba(58,70,78,${.055 + hash2(i, 31, 8) * .085})`;
    g.lineWidth = .35 + hash2(i, 41, 18) * .65;
    g.beginPath(); g.moveTo(x, y);
    const steps = 2 + (hash2(i, 47, 3) * 4 | 0);
    for (let j = 0; j < steps; j++) {
      x += (hash2(i * 13 + j, 1, 7) - .5) * 24;
      y += (hash2(i * 7 + j, 5, 11) - .5) * 20;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  detailTex = new THREE.CanvasTexture(c);
  detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
  detailTex.repeat.set(11.5, 11.5);
  detailTex.colorSpace = THREE.SRGBColorSpace;
  detailTex.anisotropy = 12;
  detailBump = detailTex.clone();
  detailBump.colorSpace = THREE.NoColorSpace;
  detailBump.needsUpdate = true;
  return { detailTex, detailBump };
}

function installBiomeGround(material) {
  const textures = {
    vale: worldGround('vale'), ember: worldGround('ember'),
    frost: worldGround('frost'), mycel: worldGround('mycel'),
    shatter: worldGround('shatter'),
  };
  if (Object.values(textures).some((texture) => !texture)) return;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.r6ValeGround = { value: textures.vale };
    shader.uniforms.r6EmberGround = { value: textures.ember };
    shader.uniforms.r6FrostGround = { value: textures.frost };
    shader.uniforms.r6MycelGround = { value: textures.mycel };
    shader.uniforms.r6ShatterGround = { value: textures.shatter };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 r6BiomeA;
attribute float r6BiomeB;
varying vec4 vR6BiomeA;
varying float vR6BiomeB;
varying vec3 vR6WorldPos;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
vR6BiomeA = r6BiomeA;
vR6BiomeB = r6BiomeB;
vR6WorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D r6ValeGround;
uniform sampler2D r6EmberGround;
uniform sampler2D r6FrostGround;
uniform sampler2D r6MycelGround;
uniform sampler2D r6ShatterGround;
varying vec4 vR6BiomeA;
varying float vR6BiomeB;
varying vec3 vR6WorldPos;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec2 r6FineUv = vR6WorldPos.xz * 0.082;
vec2 r6MacroUv = mat2(0.8, -0.6, 0.6, 0.8) * vR6WorldPos.xz * 0.014 + vec2(0.37, 0.61);
vec4 r6WeightsA = max(vR6BiomeA, vec4(0.0));
float r6WeightB = max(vR6BiomeB, 0.0);
float r6WeightTotal = max(dot(r6WeightsA, vec4(1.0)) + r6WeightB, 0.0001);
r6WeightsA /= r6WeightTotal;
r6WeightB /= r6WeightTotal;
vec3 r6Fine = texture2D(r6ValeGround, r6FineUv).rgb * r6WeightsA.x
  + texture2D(r6EmberGround, r6FineUv).rgb * r6WeightsA.y
  + texture2D(r6FrostGround, r6FineUv).rgb * r6WeightsA.z
  + texture2D(r6MycelGround, r6FineUv).rgb * r6WeightsA.w
  + texture2D(r6ShatterGround, r6FineUv).rgb * r6WeightB;
vec3 r6Macro = texture2D(r6ValeGround, r6MacroUv).rgb * r6WeightsA.x
  + texture2D(r6EmberGround, r6MacroUv).rgb * r6WeightsA.y
  + texture2D(r6FrostGround, r6MacroUv).rgb * r6WeightsA.z
  + texture2D(r6MycelGround, r6MacroUv).rgb * r6WeightsA.w
  + texture2D(r6ShatterGround, r6MacroUv).rgb * r6WeightB;
vec3 r6Surface = mix(r6Fine, r6Macro, 0.18);
float r6Luma = max(dot(r6Surface, vec3(0.2126, 0.7152, 0.0722)), 0.02);
// Keep the authored regional tint, but let the scan's real dark soil, ash,
// ice and slate value structure survive. Normalising the scan completely made
// Vale read as fluorescent green instead of moss over earth.
vec3 r6Relative = clamp(r6Surface / r6Luma, vec3(0.72), vec3(1.32));
vec3 r6Chroma = mix(vec3(1.0), r6Relative, 0.50);
float r6Value = mix(0.70, 1.06, smoothstep(0.05, 0.44, r6Luma));
vec3 r6Absolute = clamp(r6Surface * 1.68, vec3(0.035), vec3(1.0));
float r6AbsoluteMix = 0.36 + r6WeightsA.w * 0.30 - r6WeightsA.z * 0.10;
vec3 r6TexturedTint = mix(diffuseColor.rgb * r6Chroma * r6Value, r6Absolute, r6AbsoluteMix);
diffuseColor.rgb = mix(diffuseColor.rgb, r6TexturedTint, 0.82);
diffuseColor.rgb *= mix(vec3(1.0), vec3(1.05, 0.88, 0.78), r6WeightsA.w);
diffuseColor.rgb *= mix(1.0, 0.88, r6WeightsA.z);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
// Material identity now reaches the highlight response as well as color:
// damp Mycel and wind-polished Frost catch a broad restrained sheen, while
// moss, ash and fractured slate remain convincingly rough. Fine scan value
// variation keeps the result from reading as one uniform plastic setting.
float r6BiomeRoughness = dot(r6WeightsA, vec4(0.88, 0.82, 0.52, 0.70))
  + r6WeightB * 0.79;
float r6SurfaceRoughness = clamp(r6BiomeRoughness + (0.34 - r6Luma) * 0.12, 0.42, 0.96);
roughnessFactor = mix(roughnessFactor, r6SurfaceRoughness, 0.48);`);
  };
  material.customProgramCacheKey = () => 'skyshard-r6-biome-ground-v2';
  material.userData.r6GroundTextures = textures;
  material.needsUpdate = true;
}

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    const detail = terrainDetailTextures();
    this.mat = new THREE.MeshStandardMaterial({
      vertexColors: true, bumpMap: detail.detailBump,
      bumpScale: .12, roughness: .90, metalness: .003,
      flatShading: false,
    });
    installBiomeGround(this.mat);
    this.lastCx = null;
    this.lastCz = null;
  }

  buildChunk(cx, cz) {
    const ox = cx * CHUNK, oz = cz * CHUNK;
    // Skip chunks that are entirely deep sea (beyond the island).
    const dc = Math.hypot(ox + CHUNK / 2, oz + CHUNK / 2);
    if (dc > 900) return null;

    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const biomeA = new Float32Array(pos.count * 4);
    const biomeB = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + ox + CHUNK / 2;
      const z = pos.getZ(i) + oz + CHUNK / 2;
      const h = terrainHeight(x, z);
      pos.setY(i, h);

      // Color: region palette, height-shaded, cliff tint on slopes,
      // sand near the waterline, per-vertex jitter so fields aren't flat.
      const w = regionWeights(x, z);
      biomeA[i * 4] = w.vale;
      biomeA[i * 4 + 1] = w.ember;
      biomeA[i * 4 + 2] = w.frost;
      biomeA[i * 4 + 3] = w.mycel;
      biomeB[i] = w.shatter;
      let r = 0, g = 0, b = 0;
      for (const k of REGION_KEYS) {
        const t = REGIONS[k].terra;
        const macro = fbm2(x * .007, z * .007, 4, 199);
        const grain = noise2(x * .052, z * .052, 99);
        const m = clamp01(.42 + macro * .22 + grain * .17 + h * .011);
        r += lerp(t.lo[0], t.hi[0], m) * w[k];
        g += lerp(t.lo[1], t.hi[1], m) * w[k];
        b += lerp(t.lo[2], t.hi[2], m) * w[k];
      }
      // slope → cliff color
      const e = 1.2;
      const slope = Math.abs(terrainHeight(x + e, z) - terrainHeight(x - e, z)) +
                    Math.abs(terrainHeight(x, z + e) - terrainHeight(x, z - e));
      const cliff = clamp01((slope - 1.6) * 0.7);
      if (cliff > 0) {
        let cr = 0, cg = 0, cb = 0;
        for (const k of REGION_KEYS) {
          const c = REGIONS[k].terra.cliff;
          cr += c[0] * w[k]; cg += c[1] * w[k]; cb += c[2] * w[k];
        }
        r = lerp(r, cr, cliff); g = lerp(g, cg, cliff); b = lerp(b, cb, cliff);
      }
      // waterline sand
      const sand = smoothstep(1.6, 0.4, h);
      if (sand > 0) { r = lerp(r, 0.76, sand * 0.8); g = lerp(g, 0.70, sand * 0.8); b = lerp(b, 0.52, sand * 0.8); }
      // the frozen lake reads as ice
      const dLake = Math.hypot(x - FROZEN_LAKE.x, z - FROZEN_LAKE.z);
      if (dLake < FROZEN_LAKE.r * 0.92) {
        const ice = smoothstep(FROZEN_LAKE.r * 0.92, FROZEN_LAKE.r * 0.7, dLake);
        r = lerp(r, 0.72, ice); g = lerp(g, 0.82, ice); b = lerp(b, 0.92, ice);
      }
      // Authored sites grow out of a material skirt rather than landing on an
      // unrelated flat field. Irregular biome soil gathers around the focal
      // mass, while a narrow worn lane points back toward the island hub.
      let site = null, siteD2 = 46 * 46;
      for (const wSite of R6_SITES) {
        const sdx = x - wSite.x, sdz = z - wSite.z;
        const sd2 = sdx * sdx + sdz * sdz;
        if (sd2 < siteD2) { siteD2 = sd2; site = wSite; }
      }
      if (site) {
        const sd = Math.sqrt(siteD2);
        const edgeNoise = noise2(x * .061, z * .061, 661) * 3.2;
        const skirt = smoothstep(43 + edgeNoise, 11, sd);
        const sg = SITE_GROUND[site.region];
        const groundMix = skirt * (.34 + noise2(x * .034, z * .034, 517) * .12);
        r = lerp(r, sg[0], groundMix); g = lerp(g, sg[1], groundMix); b = lerp(b, sg[2], groundMix);
        const dx = x - site.x, dz = z - site.z;
        const c = Math.cos(site.rotation), s = Math.sin(site.rotation);
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        const approachZ = site === STARFALL_THRESHOLD ? -lz : lz;
        const path = smoothstep(5.3, 2.2, Math.abs(lx))
          * smoothstep(-3, 5, approachZ) * smoothstep(38, 29, approachZ);
        if (path > 0) {
          const wear = path * (.28 + noise2(x * .13, z * .13, 809) * .08);
          r = lerp(r, sg[0] * .78 + .055, wear);
          g = lerp(g, sg[1] * .74 + .05, wear);
          b = lerp(b, sg[2] * .72 + .045, wear);
        }
      }
      // jitter
      const mineral = fbm2(x * .026, z * .026, 3, 305) * .035;
      const j = (hash2(x * 7, z * 7, 5) - .5) * .035;
      const warm = noise2(x * .014, z * .014, 417) * .018;
      colors[i * 3] = clamp01(r * (1 + mineral) + j + warm);
      colors[i * 3 + 1] = clamp01(g * (1 + mineral * .72) + j);
      colors[i * 3 + 2] = clamp01(b * (1 + mineral * .48) + j - warm * .35);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('r6BiomeA', new THREE.BufferAttribute(biomeA, 4));
    geo.setAttribute('r6BiomeB', new THREE.BufferAttribute(biomeB, 1));
    geo.computeVertexNormals(); // flatShading ignores these, but keeps raycast sane

    // vertices are already chunk-center-local (only heights were baked in),
    // so the mesh transform alone places the chunk in the world
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(ox + CHUNK / 2, 0, oz + CHUNK / 2);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }

  // Ensure chunks exist around the player; toggle visibility by ring distance.
  // Missing chunks go into a queue drained a few per frame (building a chunk
  // is noise-heavy; fog hides the brief pop-in at the horizon).
  update(px, pz) {
    const cx = Math.floor(px / CHUNK), cz = Math.floor(pz / CHUNK);
    if (cx !== this.lastCx || cz !== this.lastCz) {
      this.lastCx = cx; this.lastCz = cz;
      const R = CFG.world.chunksVisible;

      for (const [key, mesh] of this.chunks) {
        if (!mesh) continue;
        const [kx, kz] = key.split(',').map(Number);
        mesh.visible = Math.abs(kx - cx) <= R && Math.abs(kz - cz) <= R;
      }
      this.queue = [];
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const key = chunkKey(cx + dx, cz + dz);
          if (this.chunks.has(key)) continue;
          this.queue.push([cx + dx, cz + dz, dx * dx + dz * dz]);
        }
      }
      this.queue.sort((a, b) => a[2] - b[2]); // nearest first
    }
    let budget = 2;
    while (this.queue && this.queue.length && budget-- > 0) {
      const [kx, kz] = this.queue.shift();
      const key = chunkKey(kx, kz);
      if (this.chunks.has(key)) continue;
      const mesh = this.buildChunk(kx, kz);
      this.chunks.set(key, mesh);
      if (mesh) this.scene.add(mesh);
    }
  }

  // Build everything within the ring synchronously (used during load and by
  // teleports so the ground exists before the fade lifts).
  buildAround(px, pz) {
    this.lastCx = null;
    this.update(px, pz);
    while (this.queue && this.queue.length) {
      const [kx, kz] = this.queue.shift();
      const key = chunkKey(kx, kz);
      if (this.chunks.has(key)) continue;
      const mesh = this.buildChunk(kx, kz);
      this.chunks.set(key, mesh);
      if (mesh) this.scene.add(mesh);
    }
  }
}
