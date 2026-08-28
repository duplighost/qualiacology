// Large-scale atmosphere and the Spire reliquary. Everything is instanced or
// pooled so the denser authored horizon costs a handful of draw calls rather
// than hundreds.

import * as THREE from 'three';
import { SPIRE } from './destdata.js';
import { TRIAL_DESTS } from './trialdata.js';
import { REGIONS } from './regions.js';
import { makeRng } from '../core/rng.js';
import { G } from '../state.js';
import { hasSkill } from '../progression/constellation.js';
import { worldFoliage } from './materials.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

function ridgeRingGeometry(radius, baseY, baseHeight, amplitude, segments, seed, depth) {
  // A continuous irregular ring reads as one distant mountain range from
  // anywhere on the island. Connected crests eliminate the old picket fence
  // of repeated paper-triangle props.
  const rng = makeRng(seed);
  const heights = [], radii = [];
  for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2;
    const broad = .5 + Math.sin(a * 3 + .8) * .19 + Math.sin(a * 7 - 1.4) * .11;
    heights.push(baseHeight + amplitude * Math.max(.10, broad + (rng() - .5) * .22));
    radii.push(radius + Math.sin(a * 5 + .3) * depth * .12 + (rng() - .5) * depth * .10);
  }
  const smooth = heights.map((h, i) => h * .54
    + heights[(i - 1 + segments) % segments] * .23
    + heights[(i + 1) % segments] * .23);
  const positions = [], colors = [];
  const point = (i, r, y) => {
    const a = (i % segments) / segments * Math.PI * 2;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  const tri = (a, b, c, color, shade) => {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color[0] * shade, color[1] * shade, color[2] * shade);
  };
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    const a = (i + .5) / segments * Math.PI * 2;
    const R = REGIONS[horizonRegion(a)];
    const color = [
      R.terra.cliff[0] * .52 + .035,
      R.terra.cliff[1] * .55 + .045,
      R.terra.cliff[2] * .62 + .075,
    ];
    const in0 = point(i, radii[i] - depth, baseY);
    const in1 = point(j, radii[j] - depth, baseY);
    const crest0 = point(i, radii[i], baseY + smooth[i]);
    const crest1 = point(j, radii[j], baseY + smooth[j]);
    const out0 = point(i, radii[i] + depth * .42, baseY - 2);
    const out1 = point(j, radii[j] + depth * .42, baseY - 2);
    tri(in0, in1, crest1, color, .94); tri(in0, crest1, crest0, color, .87);
    tri(crest0, crest1, out1, color, .69); tri(crest0, out1, out0, color, .64);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function horizonRegion(a) {
  let region = 'vale', best = Infinity;
  for (const [key, R] of Object.entries(REGIONS)) {
    const d = Math.abs(Math.atan2(Math.sin(a - R.angle), Math.cos(a - R.angle)));
    if (d < best) { best = d; region = key; }
  }
  return region;
}

export class ModernWorld {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;
    this.compassT = 0;
    this._buildHorizon();
    this._buildCloudBanks();
    this._buildReliquary();
    this._buildCompass();
  }

  _buildHorizon() {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, fog: false, toneMapped: true,
      transparent: true, opacity: .42, depthWrite: false,
      roughness: 1, metalness: 0, emissive: 0x0c1020, emissiveIntensity: .12,
      side: THREE.DoubleSide, flatShading: false,
    });
    this.mountains = new THREE.Mesh(ridgeRingGeometry(790, -18, 38, 50, 216, 71391, 76), mat);
    this.mountains.frustumCulled = false;
    this.mountains.renderOrder = -4;
    this.scene.add(this.mountains);

    const foothillMat = new THREE.MeshStandardMaterial({
      vertexColors: true, fog: false, toneMapped: true,
      transparent: true, opacity: .27, depthWrite: false,
      roughness: 1, metalness: 0, emissive: 0x101421, emissiveIntensity: .16,
      side: THREE.DoubleSide, flatShading: false,
    });
    this.foothills = new THREE.Mesh(ridgeRingGeometry(690, -10, 18, 27, 188, 71392, 58), foothillMat);
    this.foothills.frustumCulled = false;
    this.foothills.renderOrder = -3;
    this.scene.add(this.foothills);
  }

  _buildCloudBanks() {
    // The old translucent icosahedra exposed their polygon facets across the
    // whole sky. R5.1 uses clustered, real-alpha photographic cloud banks:
    // one draw call, softer depth cues, and no giant low-poly blobs.
    const count = 128;
    const geo = new THREE.PlaneGeometry(1, 1);
    const cloud = worldFoliage('cloud');
    const mat = new THREE.MeshBasicMaterial({
      map: cloud, alphaMap: cloud, color: 0xe8eef7,
      transparent: true, opacity: .42, alphaTest: .018,
      depthWrite: false, vertexColors: true, fog: true,
      side: THREE.DoubleSide, toneMapped: true,
    });
    this.clouds = new THREE.InstancedMesh(geo, mat, count);
    const rng = makeRng(99314);
    let i = 0;
    for (let bank = 0; bank < 32; bank++) {
      const baseA = rng() * Math.PI * 2;
      const baseR = 300 + rng() * 390;
      const baseY = 78 + rng() * 92 + Math.sin(baseA * 3) * 10;
      const baseW = 72 + rng() * 90;
      for (let lobe = 0; lobe < 4; lobe++, i++) {
        const a = baseA + (lobe - 1.5) * (.018 + rng() * .018);
        const r = baseR + (rng() - .5) * 34;
        const y = baseY + (rng() - .5) * 22 + Math.sin(lobe * 2.1) * 6;
        _p.set(Math.cos(a) * r, y, Math.sin(a) * r);
        _q.setFromEuler(new THREE.Euler((rng() - .5) * .08, -Math.PI / 2 - a, (rng() - .5) * .08));
        const w = baseW * (.56 + rng() * .58);
        _s.set(w, w * (.42 + rng() * .16), 1);
        _m.compose(_p, _q, _s); this.clouds.setMatrixAt(i, _m);
        const v = .78 + rng() * .19;
        _c.setRGB(v * .92, v * .96, Math.min(1, v * 1.05)); this.clouds.setColorAt(i, _c);
      }
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    if (this.clouds.instanceColor) this.clouds.instanceColor.needsUpdate = true;
    this.clouds.renderOrder = -2;
    this.clouds.frustumCulled = false;
    this.scene.add(this.clouds);
  }

  _buildReliquary() {
    this.reliquary = new THREE.Group();
    this.reliquary.position.set(SPIRE.x, SPIRE.y + .3, SPIRE.z);
    this.trophies = [];
    const pedestalGeo = new THREE.LatheGeometry([
      new THREE.Vector2(.72, 0), new THREE.Vector2(.74, .08),
      new THREE.Vector2(.57, .17), new THREE.Vector2(.50, .38),
      new THREE.Vector2(.46, .48), new THREE.Vector2(.55, .54),
    ], 12);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x34425f, emissive: 0x09162d, emissiveIntensity: .34,
      roughness: .48, metalness: .24, flatShading: true,
    });
    const socketGeo = new THREE.TorusGeometry(.31, .035, 6, 18);
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x6b81b5, transparent: true, opacity: .52, fog: true });
    for (let i = 0; i < TRIAL_DESTS.length; i++) {
      const d = TRIAL_DESTS[i];
      const ring = i < 10 ? 8.8 : 12.2;
      const slot = i < 10 ? i : i - 10;
      const a = slot / 10 * Math.PI * 2 + (i < 10 ? 0 : Math.PI / 10);
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.set(Math.cos(a) * ring, 0, Math.sin(a) * ring);
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.position.set(pedestal.position.x, .555, pedestal.position.z);
      socket.rotation.x = Math.PI / 2;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.34, 1),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(...d.relic.color), emissive: new THREE.Color(...d.relic.color), emissiveIntensity: .9, roughness: .16 }));
      gem.position.set(pedestal.position.x, 1.05, pedestal.position.z);
      gem.visible = false;
      this.reliquary.add(pedestal, socket, gem);
      this.trophies.push({ id: d.relic.id, gem, baseY: gem.position.y, phase: i * 1.7 });
    }
    this.scene.add(this.reliquary);
  }

  _buildCompass() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xc2a7ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.compass = new THREE.Group();
    this.compass.visible = false;
    this.compass.position.set(SPIRE.x, SPIRE.y + 23, SPIRE.z);
    this.compassRay = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, 28), mat);
    this.compassRay.geometry.translate(0, 0, -14);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(.6, 1), mat.clone());
    star.position.z = -28;
    this.compass.add(this.compassRay, star);
    this.scene.add(this.compass);
  }

  pointTo(dest) {
    if (!dest) return;
    this.compassT = 6;
    this.compass.visible = true;
    this.compass.rotation.y = Math.atan2(dest.x - SPIRE.x, dest.z - SPIRE.z);
  }

  update(dt, t) {
    this.t = t;
    // Cloud movement is intentionally glacial; silhouettes stay dependable for
    // navigation while the high sky never looks frozen.
    this.clouds.rotation.y = Math.sin(t * .006) * .018;
    for (const trophy of this.trophies) {
      trophy.gem.visible = !!G.save.relics?.[trophy.id];
      if (trophy.gem.visible) {
        trophy.gem.position.y = trophy.baseY + Math.sin(t * 1.3 + trophy.phase) * .12;
        trophy.gem.rotation.y += dt * .7;
        if (hasSkill('trophy-light')) {
          G.rovers?.request(SPIRE.x + trophy.gem.position.x, SPIRE.y + trophy.gem.position.y,
            SPIRE.z + trophy.gem.position.z, [trophy.gem.material.color.r, trophy.gem.material.color.g, trophy.gem.material.color.b], .55, 6);
        }
      }
    }
    if (this.compassT > 0) {
      this.compassT -= dt;
      this.compass.visible = true;
      this.compass.scale.setScalar(.92 + Math.sin(t * 3) * .08);
      for (const child of this.compass.children) child.material.opacity = Math.min(.65, this.compassT * .18);
    } else this.compass.visible = false;
  }
}
