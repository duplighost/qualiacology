// The Spire ascension appears only after the five original guardians fall.
// Its physical cloud stair lives in the existing world and uses the existing
// movement/collision model; no cutscene takes the camera or the player body.

import * as THREE from 'three';
import { G } from '../state.js';
import { SPIRE } from './destdata.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { cloudBillboardGeometry, cloudBillboardMaterial, worldFoliage } from './materials.js';

export const ORIGINAL_GUARDIANS = ['millwright', 'slag', 'keeper', 'choir', 'archivist'];

export const FINAL_DEST = {
  id: 'fluff', kind: 'final', region: 'frost', name: 'The Fluff Above',
  boss: 'skyshard', enter: true, x: SPIRE.x, z: SPIRE.z, y: SPIRE.y,
};

export function mainPathComplete(saveState = G.save) {
  return ORIGINAL_GUARDIANS.every((key) => !!saveState?.bossesDown?.[key]);
}

function allGuardianVerbs(saveState = G.save) {
  const a = saveState?.abilities || {}, alt = saveState?.altFires || {};
  return !!(a.dash && a.doubleJump && a.glide && a.grapple && a.slam && alt.lance && alt.seeker);
}

export class EndgameGate {
  constructor(scene, collide) {
    this.scene = scene;
    this.collide = collide;
    this.unlocked = false;
    this.triggerLatch = false;
    this.t = 0;
    this.group = new THREE.Group();
    this.group.position.set(SPIRE.x, SPIRE.y, SPIRE.z);
    this.group.visible = false;
    scene.add(this.group);
    this.platformColliders = [];
    this._build();
  }

  _build() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xe8f2ff, emissive: 0x7898c8, emissiveIntensity: .18,
      roughness: .72, transparent: true, opacity: .88,
    });
    const puffMat = cloudMat.clone();
    puffMat.opacity = .32;
    puffMat.depthWrite = false;
    const cloudSprite = worldFoliage('cloud');
    const fluffMat = cloudSprite ? cloudBillboardMaterial(cloudSprite, {
      base: [.50, .64, .90], peak: [1.0, .98, .94], opacity: .78,
    }) : null;
    const fluffEntries = [];
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xd8ecff, emissive: 0x87bfff, emissiveIntensity: 1.15,
      roughness: .12, metalness: .12,
    });
    const veilMat = new THREE.MeshBasicMaterial({
      color: 0xd8efff, transparent: true, opacity: .42,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide,
    });

    // A spiral wide enough to read from the ground and tuned around the exact
    // existing jump arc. Early rises are double-jumpable; the two long late
    // gaps strongly ask for glide/dash and the floating stars accept grapple.
    const path = [
      [9, 1.0, 5], [13, 3.6, 0], [12, 6.2, -7], [7, 8.9, -12], [0, 11.7, -14],
      [-7, 14.5, -11], [-12, 17.3, -5], [-13, 20.2, 3], [-8, 23.4, 10],
      [0, 27.2, 13], [9, 31.4, 8], [3, 36.2, 1],
    ];
    this.platforms = [];
    for (let i = 0; i < path.length; i++) {
      const [x, y, z] = path[i];
      const cloud = new THREE.Group();
      const n = i < 8 ? 5 : 7;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + i;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 + (k % 3) * .45, 1), puffMat);
        puff.position.set(Math.cos(a) * (1.5 + k % 2), Math.sin(k * 2.2) * .3, Math.sin(a) * (1.3 + (k + 1) % 2));
        puff.scale.y = .52; puff.castShadow = true; puff.receiveShadow = true; cloud.add(puff);
      }
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, .48, 14), cloudMat);
      plate.position.y = -.2; plate.receiveShadow = true; cloud.add(plate);
      cloud.position.set(x, y, z); this.group.add(cloud); this.platforms.push({ cloud, baseY: y, phase: i * .8 });
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * Math.PI * 2 + i * .71;
        fluffEntries.push({
          x: x + Math.cos(a) * (1.15 + (i % 3) * .22),
          y: y - .82 + (k % 2) * .26,
          z: z + Math.sin(a) * (1.05 + (i % 2) * .32),
          sx: 7.2 + (i % 4) * .65, sy: 3.1 + (k % 3) * .42,
          yaw: a + i * .13, tint: i < 6 ? [.92, .98, 1.08] : [.78, .88, 1.14],
        });
      }
      const c = this.collide.addBox(SPIRE.x + x - 3.4, SPIRE.z + z - 3.4, SPIRE.x + x + 3.4, SPIRE.z + z + 3.4,
        SPIRE.y + y - .5, SPIRE.y + y, { standable: true });
      c.dead = true; this.platformColliders.push(c);

      if (i >= 7) {
        const anchor = new THREE.Mesh(new THREE.OctahedronGeometry(.72, 1), starMat);
        anchor.position.set(x, y + 5.2 + (i % 2) * 1.2, z); this.group.add(anchor);
        const ac = this.collide.addCircle(SPIRE.x + x, SPIRE.z + z, .72, SPIRE.y + anchor.position.y - .8, SPIRE.y + anchor.position.y + .8);
        ac.dead = true; this.platformColliders.push(ac);
      }
    }

    // Five guardian-color rings make the unlock readable without a checklist.
    const colors = [0x8de378, 0xff7838, 0x91d8ff, 0x68ffc2, 0xc58cff];
    this.crown = new THREE.Group();
    this.crown.position.set(3, 40.5, 1);
    for (let i = 0; i < colors.length; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * .48, .09, 7, 36),
        new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      ring.rotation.set(i * .36, i * .55, i * .18); ring.userData.speed = .12 + i * .035; this.crown.add(ring);
    }
    this.portal = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), veilMat);
    this.portal.position.set(3, 40.5, 1); this.portal.rotation.y = Math.PI; this.group.add(this.crown, this.portal);

    // A high bank gives the opened route its biome-sized sky silhouette even
    // before the player climbs.
    for (let i = 0; i < 42; i++) {
      const a = i / 42 * Math.PI * 2, r = 22 + (i % 5) * 4;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + (i % 4) * .55, 1), puffMat);
      puff.position.set(Math.cos(a) * r, 34 + Math.sin(i * 1.8) * 5, Math.sin(a) * r); puff.scale.y = .45; this.group.add(puff);
    }

    // The generated real-alpha bank supplies the soft silhouette while the
    // existing solid plates keep every jump and collider exactly unchanged.
    if (fluffMat) {
      const fluffs = new THREE.InstancedMesh(cloudBillboardGeometry(), fluffMat, fluffEntries.length);
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
      const rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
      const color = new THREE.Color();
      for (let i = 0; i < fluffEntries.length; i++) {
        const f = fluffEntries[i];
        rotation.setFromEuler(new THREE.Euler(0, f.yaw, 0));
        matrix.compose(position.set(f.x, f.y, f.z), rotation, scale.set(f.sx, f.sy, 1));
        fluffs.setMatrixAt(i, matrix);
        color.setRGB(...f.tint); fluffs.setColorAt(i, color);
      }
      fluffs.instanceMatrix.needsUpdate = true;
      if (fluffs.instanceColor) fluffs.instanceColor.needsUpdate = true;
      fluffs.frustumCulled = false;
      fluffs.renderOrder = 2;
      this.group.add(fluffs);
      this.fluffs = fluffs;
    }
  }

  update(dt, t) {
    this.t = t;
    const shouldUnlock = mainPathComplete();
    if (shouldUnlock !== this.unlocked) {
      this.unlocked = shouldUnlock;
      this.group.visible = shouldUnlock;
      for (const c of this.platformColliders) c.dead = !shouldUnlock;
    }
    if (!shouldUnlock || G.mode !== 'world') return;

    for (const p of this.platforms) {
      p.cloud.position.y = p.baseY + Math.sin(t * .45 + p.phase) * .16;
      p.cloud.rotation.y = Math.sin(t * .12 + p.phase) * .05;
    }
    for (const ring of this.crown.children) ring.rotation.z += dt * ring.userData.speed;
    this.portal.material.opacity = .32 + Math.sin(t * 1.8) * .12;

    if (!G.save.finalGateShown) {
      G.save.finalGateShown = true; save();
      sfx('unlock');
      G.postfx?.pulse(1.3);
      G.hud?.whisper('THE SKY OPENS', 4.4);
      G.particles?.burst('soul', SPIRE.x, SPIRE.y + 30, SPIRE.z, 60, { color: [0.68, .84, 1], sizeMult: 2.1 });
    }

    const pl = G.player;
    const wx = SPIRE.x + this.portal.position.x;
    const wy = SPIRE.y + this.portal.position.y;
    const wz = SPIRE.z + this.portal.position.z;
    const inside = Math.hypot(pl.pos.x - wx, pl.pos.y + 1 - wy, pl.pos.z - wz) < 4.2;
    if (inside && !this.triggerLatch) {
      this.triggerLatch = true;
      if (allGuardianVerbs()) G.requestEnterFinal?.();
      else G.hud?.whisper('CLAIM THE FIVE GUARDIAN GIFTS', 3.2);
    }
    if (!inside) this.triggerLatch = false;
  }
}
