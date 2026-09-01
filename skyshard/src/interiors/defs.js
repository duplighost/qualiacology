// The insides. One entry per enterable destination. Every interior tells a
// little of the island's story with objects, not words: who worked here,
// what they loved, and what the shattering interrupted.

import * as THREE from 'three';
import { mats } from '../world/props.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (r0, r1, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
const glowMat = (color) => new THREE.MeshBasicMaterial({ color, fog: false });

export const INTERIORS = {

  // ---------------------------------------------------------- VERDANT VALE
  mill: {
    fog: [0.10, 0.09, 0.06], fogDensity: 0.028, sun: 0.35, hemiIntensity: 0.5, hemiColor: [0.9, 0.8, 0.6],
    spawn: { x: 0, z: 32, yaw: 0 }, doorOutZ: 7.0,
    bossAt: { x: 0, z: -23 }, bossWake: 14, packTrigger: 18,
    build(c) {
      const m = mats();
      c.room(50, 72, 30, { floor: m.wood, wall: m.stone });
      // the great gears, still slowly turning
      c._gears = [];
      for (const [x, z, r, y] of [[-7, -7, 2.6, 1.2], [-4.4, -7, 1.7, 2.2], [7, -6, 2.2, 1.6]]) {
        const gear = cyl(r, r, 0.5, 9, m.woodDark);
        gear.rotation.x = Math.PI / 2;
        gear.position.set(x, y, z);
        c.scene.add(gear);
        for (let t = 0; t < 6; t++) {
          const tooth = box(0.4, 0.5, 0.5, m.woodDark);
          tooth.position.set(Math.cos(t / 6 * Math.PI * 2) * r, Math.sin(t / 6 * Math.PI * 2) * r, 0);
          gear.add(tooth);
        }
        c._gears.push(gear);
      }
      // center shaft
      c.pillar(0, 0, 0.7, 10);
      // flour sacks, crates, the miller's corner
      c.place('crate', -8, 6, 0.3).place('crate', -7, 7.4, 1.1).place('crate', -6.4, 5.8, 0.7);
      c.place('table', 7.5, 7, -0.4).place('chair', 6.5, 6, 1.8);
      c.place('pot', 8.6, 5.6, 0, { moteChance: 0.5 });
      c.place('candle', 7.5, 7, 0, { y: 0.83 });
      c.loft(-7, 2, 6, 5, 3.4, { stairsFrom: [-3, 6] });
      for (const z of [25, 14, 3, -9, -20]) {
        c.place('lanternPost', 18, z, Math.PI).place('lanternPost', -18, z, 0);
      }
      for (const side of [-1, 1]) for (const z of [19, 4, -12]) {
        const wheel = cyl(4.2, 4.2, 0.42, 12, side < 0 ? m.woodDark : m.wood);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(side * 19.5, 7 + ((z + 12) % 4), z);
        c.scene.add(wheel);
        c._gears.push(wheel);
      }
      c.mural(0, 8.2, -35.7, 0, 'arrival', 9, 5.6);
      c.light(0, 6, 0, [1, 0.85, 0.6], 1.2);
      c.light(0, 13, -23, [0.65, 1, 0.42], 1.7);
    },
    update(c, dt) {
      for (const g of c._gears) g.rotation.z += dt * 0.4;
    },
  },

  hollowtree: {
    fog: [0.06, 0.05, 0.03], fogDensity: 0.04, sun: 0.15, hemiIntensity: 0.5, hemiColor: [0.95, 0.8, 0.55],
    spawn: { x: 0, z: 9.4, yaw: 0 }, doorOutZ: 5.6, packTrigger: 4,
    build(c) {
      const m = mats();
      const bark = new THREE.MeshStandardMaterial({ color: 0x54402c, roughness: 1, flatShading: true });
      c.room(18, 24, 12, { floor: m.wood, wall: bark });
      // someone small lived here, and left in a hurry
      c.place('bed', -2.8, -2.6, 0.4);
      c.place('table', 1.8, -2.4, 0).place('chair', 1.2, -1.2, 2.6).place('chair', 2.8, -3.4, -0.5);
      c.place('shelf', 3.6, 0.8, -Math.PI / 2);
      c.place('pot', -3.4, 1.8, 0, { moteChance: 0.6 }).place('pot', 3.2, 3.2, 0, { moteChance: 0.6 });
      c.place('candle', 1.8, -2.4, 0, { y: 0.83 }).place('candle', -3.5, -1.5, 0);
      // a second, tiny bed — sized for something smaller than a person
      const tiny = box(0.5, 0.18, 0.8, m.cloth);
      tiny.position.set(2.2, 0.1, 2.6);
      c.scene.add(tiny);
      for (const z of [7, 1, -6]) {
        const root = cyl(0.32, 0.72, 11, 7, m.woodDark);
        root.position.set(-8.2, 5.5, z);
        root.rotation.z = -0.12;
        c.scene.add(root);
      }
      c.mural(-8.7, 3.8, 0, Math.PI / 2, 'arrival', 4.2, 2.8);
      c.shard(0, -0.5);
      c.pack('hopper', 3, 0, -1.5, 3);
      c.light(0, 3.4, 0, [1, 0.75, 0.45], 1.0);
    },
  },

  belltower: {
    fog: [0.05, 0.05, 0.07], fogDensity: 0.03, sun: 0.55, hemiIntensity: 0.62,
    spawn: { x: 0, z: 7.1, yaw: 0 }, doorOutZ: 4.6, packTrigger: 3,
    build(c) {
      const m = mats();
      c.room(14, 18, 20, { floor: m.stone, wall: m.stone });
      // climb the scaffolding to the bell
      c.loft(-2.2, -2.2, 2.6, 2.6, 2.6);
      c.loft(2.2, -2.2, 2.6, 2.6, 5.2);
      c.loft(2.2, 2.2, 2.6, 2.6, 7.8);
      c.loft(-2.2, 2.2, 2.6, 2.6, 10.4);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.5, 8), m.iron);
      bell.position.set(0, 11.6, 0);
      c.scene.add(bell);
      c._bell = bell;
      c.shard(-2.2, 2.2, 10.4); // on the top loft — climb for it
      c.pack('puff', 4, 0, 0, 2.5);
      c.mural(0, 4.8, -8.7, 0, 'spire', 4.2, 3.2);
      c.light(0, 11.5, 0, [0.8, 0.9, 1], 0.9);
      c.light(0, 2.8, 0, [1, 0.8, 0.55], 0.85);       // the fight floor is lit, not guessed at
      c.light(2.2, 6.4, -2.2, [0.85, 0.9, 1], 0.6);   // mid-climb waypoint
    },
    update(c, dt, t) {
      c._bell.rotation.z = Math.sin(t * 0.7) * 0.04;
    },
  },

  // ---------------------------------------------------------- EMBER FLATS
  forge: {
    fog: [0.08, 0.025, 0.012], fogDensity: 0.019, sun: 0.24, hemiIntensity: 0.3,
    hemiColor: [0.9, 0.36, 0.16], hemiGround: [0.12, 0.025, 0.01],
    spawn: { x: 0, z: 30, yaw: 0 }, doorOutZ: 8.7,
    bossAt: { x: 0, z: -22 }, bossWake: 15,
    build(c) {
      const m = mats();
      const forgeFloor = new THREE.MeshStandardMaterial({ color: 0x21100c, roughness: 0.93, flatShading: true });
      const forgeWall = new THREE.MeshStandardMaterial({ color: 0x3b1e15, roughness: 0.88, flatShading: true });
      const hot = new THREE.MeshStandardMaterial({ color: 0xff5b18, emissive: 0xff3510, emissiveIntensity: 1.65, roughness: 0.28, metalness: 0.2 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xffb83d, emissive: 0xff6a16, emissiveIntensity: 1.25, roughness: 0.32, metalness: 0.18 });
      c.room(54, 70, 28, { floor: forgeFloor, wall: forgeWall });
      // rivers of light crossing the floor
      for (const [x, z, w, d] of [[-2.4, 5, 0.3, 46], [2.4, 5, 0.3, 46], [0, 0, 1.2, 18], [-5, -2, 9, 1.0], [5, 3, 8, 1.0]]) {
        const seam = box(w, 0.08, d, glowMat(0xff5a14));
        seam.position.set(x, 0.06, z);
        c.scene.add(seam);
      }
      // anvils and quenching pots
      for (const [x, z] of [[-6, 4], [6, -1], [-5.4, -5]]) {
        const anvil = box(1.2, 0.8, 0.5, m.iron);
        anvil.position.set(x, 0.4, z);
        c.scene.add(anvil);
        c.collide.addBox(x - 0.6, z - 0.25, x + 0.6, z + 0.25, 0, 0.8, { standable: true });
      }
      c.place('barrel', -7.5, 6.5, 0).place('barrel', -8.2, 5.2, 0.8, { moteChance: 0.5 });
      c.place('pot', 7.6, 6.8, 0, { moteChance: 0.5 }).place('pot', 8.3, 5.8, 0);
      // half-finished blades racked on the wall — the work never ended
      for (let i = 0; i < 5; i++) {
        const blade = box(0.12, 1.6, 0.05, m.iron);
        blade.position.set(-9.6, 1.6, -2 + i * 1.1);
        blade.rotation.z = 0.06 * (i % 2 ? 1 : -1);
        c.scene.add(blade);
      }
      for (const x of [-20, 20]) for (const z of [23, 7, -10, -25]) {
        const stack = cyl(0.9, 1.5, 18 + ((z + 25) % 5), 8, m.iron);
        stack.position.set(x, 9, z);
        c.scene.add(stack);
      }
      // The furnace-sun is visible from the door and turns the whole hall into
      // a pilgrimage toward a single impossible machine rather than a dark box.
      const furnaceHalo = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.48, 8, 36), hot);
      furnaceHalo.position.set(0, 10.5, -33.8);
      c.scene.add(furnaceHalo);
      const furnaceCore = new THREE.Mesh(new THREE.IcosahedronGeometry(2.15, 1), gold);
      furnaceCore.position.set(0, 10.5, -33.35);
      c.scene.add(furnaceCore);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        const spoke = box(0.2, 3.8, 0.28, i % 2 ? hot : gold);
        spoke.position.set(Math.cos(a) * 5.8, 10.5 + Math.sin(a) * 5.8, -33.65);
        spoke.rotation.z = -a;
        c.scene.add(spoke);
      }
      for (const [x, z, goldPool] of [[-11, 18, false], [11, 4, true], [-11, -12, true]]) {
        const brazier = cyl(0.5, 0.8, 1.8, 8, m.iron);
        brazier.position.set(x, 0.9, z);
        c.scene.add(brazier);
        const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), goldPool ? gold : hot);
        flame.position.set(x, 2.1, z);
        flame.scale.y = 1.55;
        c.scene.add(flame);
        c.light(x, 2.4, z, goldPool ? [1, 0.65, 0.18] : [1, 0.25, 0.05], 1.5);
      }
      c.mural(0, 7.4, -34.7, 0, 'shatter', 9, 5.6);
      c.light(0, 3, 0, [1, 0.4, 0.12], 1.6);
      c.light(-5, 1, -2, [1, 0.35, 0.1], 1.0);
      c.light(0, 10, -27, [1, 0.26, 0.06], 2.6);
    },
  },

  pyramid: {
    fog: [0.07, 0.05, 0.02], fogDensity: 0.05, sun: 0.05, hemiIntensity: 0.35, hemiColor: [1, 0.7, 0.4],
    spawn: { x: 0, z: 14.2, yaw: 0 }, doorOutZ: 10.2, packTrigger: 4,
    build(c) {
      const m = mats();
      const sand = new THREE.MeshStandardMaterial({ color: 0x6a4826, roughness: 1, flatShading: true });
      c.room(26, 34, 15, { floor: sand, wall: sand });
      // the sleeper's box — untouched, ringed by offerings
      const sarc = box(1.4, 1.1, 3.0, m.stone);
      sarc.position.set(0, 0.55, -2.4);
      c.scene.add(sarc);
      c.collide.addBox(-0.7, -3.9, 0.7, -0.9, 0, 1.1, { standable: true });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.place('pot', Math.cos(a) * 3.4, -2.4 + Math.sin(a) * 3.0, a, { moteChance: 0.7 });
      }
      c.place('candle', -1.4, -0.8, 0).place('candle', 1.4, -0.8, 0);
      c.mural(-12.7, 4.8, 0, Math.PI / 2, 'spire', 5.2, 3.8);
      c.mural(12.7, 4.8, 0, -Math.PI / 2, 'shatter', 5.2, 3.8);
      c.shard(0, -4.6);
      c.pack('hound', 2, 0, 1, 3).pack('turret', 1, -4, -2, 1);
      c.light(0, 2, -2.4, [1, 0.6, 0.25], 0.9);
    },
  },

  // ---------------------------------------------------------- FROSTMERE
  lighthouse: {
    fog: [0.025, 0.055, 0.09], fogDensity: 0.018, sun: 0.25, hemiIntensity: 0.28,
    hemiColor: [0.42, 0.68, 0.9], hemiGround: [0.035, 0.08, 0.13],
    spawn: { x: 0, z: 27, yaw: 0 }, doorOutZ: 4.6,
    bossAt: { x: 0, z: -19 }, bossWake: 13,
    build(c) {
      const m = mats();
      const ice = new THREE.MeshStandardMaterial({ color: 0x70b8d8, emissive: 0x102a3a, emissiveIntensity: 0.18, roughness: 0.3, flatShading: true });
      const iceFloor = new THREE.MeshStandardMaterial({ color: 0x24465f, roughness: 0.42, metalness: 0.08, flatShading: true });
      const iceWall = new THREE.MeshStandardMaterial({ color: 0x2c526b, roughness: 0.72, flatShading: true });
      const lensGold = new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffc45b, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.08 });
      const lensBlue = new THREE.MeshStandardMaterial({ color: 0x72d9ff, emissive: 0x3abfff, emissiveIntensity: 1.2, roughness: 0.18, metalness: 0.16 });
      c.room(44, 64, 34, { floor: iceFloor, wall: iceWall });
      for (const x of [-1.15, 1.15]) {
        const processional = box(0.18, 0.06, 48, lensBlue);
        processional.position.set(x, 0.045, 2);
        c.scene.add(processional);
      }
      // the lamp mechanism, fallen through from above, frozen mid-spill
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), glowMat(0xfff0c0));
      lamp.position.set(3.5, 1.2, -3.5);
      c.scene.add(lamp);
      c.collide.addCircle(3.5, -3.5, 1.3, 0, 2.4);
      const gearRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.3, 8, 18), m.iron);
      gearRing.rotation.x = Math.PI / 2.3;
      gearRing.position.set(3.5, 0.6, -3.5);
      c.scene.add(gearRing);
      // ice stalagmites
      for (const [x, z, s] of [[-4, -4, 1.4], [-5.5, 1, 1.0], [4.5, 3, 1.2], [-2, 4.5, 0.8]]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 2.4 * s, 6), ice);
        spike.position.set(x, 1.2 * s, z);
        c.scene.add(spike);
        c.collide.addCircle(x, z, 0.5 * s, 0, 2.4 * s);
      }
      // the keeper's chair faces the lamp, a cup still beside it
      c.place('chair', 5.5, -1.2, -2.2).place('pot', 6.1, -0.6, 0, { moteChance: 0.6 });
      for (const z of [20, 8, -5, -19]) {
        const lensRing = new THREE.Mesh(new THREE.TorusGeometry(8 + ((z + 19) % 3), 0.22, 8, 28), m.iron);
        lensRing.position.set(0, 12 + ((z + 19) % 4), z);
        lensRing.rotation.x = Math.PI / 2;
        c.scene.add(lensRing);
      }
      // A vertical beacon lens anchors the far wall while the older horizontal
      // rings describe the machinery that focuses it.
      const greatLens = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.42, 8, 36), lensBlue);
      greatLens.position.set(0, 11.5, -30.8);
      c.scene.add(greatLens);
      const lensCore = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 2), lensGold);
      lensCore.position.set(0, 11.5, -30.35);
      c.scene.add(lensCore);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const vane = box(0.18, 3.2, 0.24, i % 2 ? lensBlue : lensGold);
        vane.position.set(Math.cos(a) * 5.0, 11.5 + Math.sin(a) * 5.0, -30.55);
        vane.rotation.z = -a;
        c.scene.add(vane);
      }
      for (const [x, z] of [[-9, 15], [9, 1], [-9, -14]]) {
        const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), lensBlue);
        prism.position.set(x, 1.55, z);
        prism.scale.y = 1.8;
        c.scene.add(prism);
        c.light(x, 2.4, z, [0.35, 0.8, 1], 1.45);
      }
      c.mural(0, 8.4, -31.7, 0, 'wings', 8, 5.2);
      c.light(3.5, 2, -3.5, [1, 0.9, 0.6], 1.8);
      c.light(0, 12, -26, [0.72, 0.9, 1], 2.5);
    },
  },

  fisher: {
    fog: [0.04, 0.05, 0.08], fogDensity: 0.05, sun: 0.1, hemiIntensity: 0.5, hemiColor: [0.7, 0.8, 1],
    spawn: { x: 0, z: 7.6, yaw: 0 }, doorOutZ: 4.2, packTrigger: 2.5,
    build(c) {
      const m = mats();
      c.room(16, 20, 9, { floor: m.wood, wall: m.woodDark });
      // the ice hole goes down into black water; a line is still set
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.8, 12), glowMat(0x06121e));
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(-1.4, 0.02, -1.4);
      c.scene.add(hole);
      const rod = box(0.05, 0.05, 1.8, m.woodDark);
      rod.position.set(-0.7, 0.5, -0.8);
      rod.rotation.z = 0.5;
      rod.rotation.y = 0.7;
      c.scene.add(rod);
      c.place('bed', 2.2, -1.8, 1.2);
      c.place('table', 1.8, 1.6, 0.3).place('candle', 1.8, 1.6, 0, { y: 0.83 });
      c.place('barrel', -2.2, 1.8, 0, { moteChance: 0.6 });
      // fish bones arranged neatly by size on the wall — pride of craft
      for (let i = 0; i < 4; i++) {
        const bone = box(0.5 + i * 0.2, 0.06, 0.02, m.bone);
        bone.position.set(-3.1, 1.4 + i * 0.4, -0.8 + i * 0.4);
        c.scene.add(bone);
      }
      c.shard(0, -2.2);
      c.pack('wisp', 2, 0, 0, 2);
      c.light(1.8, 1.5, 1.6, [1, 0.7, 0.4], 0.8);
    },
  },

  // ---------------------------------------------------------- MYCEL HOLLOW
  chapel: {
    fog: [0.03, 0.06, 0.06], fogDensity: 0.022, sun: 0.5, hemiIntensity: 0.4, hemiColor: [0.4, 0.7, 0.65],
    spawn: { x: 0, z: 34, yaw: 0 }, doorOutZ: 8.8,
    bossAt: { x: 0, z: -25 }, bossWake: 15,
    build(c) {
      const m = mats();
      const moss = new THREE.MeshStandardMaterial({ color: 0x3a4a40, roughness: 1, flatShading: true });
      c.room(50, 80, 32, { floor: moss, wall: moss });
      // flooded nave: dark water panes between the pews
      for (const [x, z, w, d] of [[-3, 2, 4, 7], [3.5, -2, 4, 9]]) {
        const water = box(w, 0.05, d, glowMat(0x0c2622));
        water.position.set(x, 0.04, z);
        c.scene.add(water);
      }
      // pews marching toward the altar
      for (let i = 0; i < 4; i++) {
        c.place('bench', -2.2, 6 - i * 2.2, 0);
        c.place('bench', 2.2, 6 - i * 2.2, 0);
      }
      // the altar: a great cap that grew straight through it
      c.place('table', 0, -8.5, 0);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), new THREE.MeshStandardMaterial({ color: 0xa94e85, emissive: 0x5a123b, emissiveIntensity: 0.95, roughness: 0.84, flatShading: true }));
      cap.position.set(0, 1.15, -8.5);
      cap.scale.y = 0.66;
      c.scene.add(cap);
      const altarHalo = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.3, 8, 32), cap.material);
      altarHalo.position.set(0, 5.2, -10.2);
      c.scene.add(altarHalo);
      const altarHeart = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: 0x8cffd5, emissive: 0x45e8b5, emissiveIntensity: 1.2, roughness: 0.28 }));
      altarHeart.position.set(0, 5.2, -9.8);
      c.scene.add(altarHeart);
      // god-rays through the broken roof
      for (const [x, z, r] of [[-2, 0, 0.8], [2.5, -4, 1.1], [0.5, 4, 0.7]]) {
        const ray = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r, 11, 8, 1, true),
          new THREE.MeshBasicMaterial({ color: 0x9fffd8, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }));
        ray.position.set(x, 5.5, z);
        c.scene.add(ray);
      }
      for (const x of [-19, 19]) for (const z of [24, 8, -8, -24]) {
        const giantCap = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2.2), cap.material);
        giantCap.position.set(x, 7 + ((z + 24) % 5), z);
        giantCap.scale.y = 0.48;
        c.scene.add(giantCap);
      }
      const roseMat = new THREE.MeshStandardMaterial({ color: 0x8cffd5, emissive: 0x45e8b5, emissiveIntensity: 1.15, roughness: 0.28 });
      const roseHalo = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.34, 8, 36), roseMat);
      roseHalo.position.set(0, 11.5, -39.15);
      c.scene.add(roseHalo);
      const roseHeart = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 0), cap.material);
      roseHeart.position.set(0, 11.5, -38.75);
      c.scene.add(roseHeart);
      for (const x of [-10, 10]) {
        const votive = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), x < 0 ? roseMat : cap.material);
        votive.position.set(x, 2.0, -16);
        votive.scale.y = 1.7;
        c.scene.add(votive);
        c.light(x, 2.6, -16, x < 0 ? [0.45, 1, 0.78] : [0.9, 0.3, 0.7], 1.35);
      }
      c.mural(0, 8, -39.7, 0, 'spiral', 9, 6);
      c.light(0, 3, -8.5, [0.5, 1, 0.8], 1.4);
      c.light(0, 14, -25, [0.4, 1, 0.72], 2.1);
    },
  },

  capcottage: {
    fog: [0.03, 0.05, 0.05], fogDensity: 0.045, sun: 0.05, hemiIntensity: 0.5, hemiColor: [0.5, 0.9, 0.8],
    spawn: { x: 0, z: 9.2, yaw: 0 }, doorOutZ: 5.6, packTrigger: 3.5,
    build(c) {
      const m = mats();
      const shroom = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1, flatShading: true });
      c.room(20, 24, 13, { floor: shroom, wall: shroom });
      // everything here is grown, not built
      const stemTable = cyl(0.9, 1.1, 0.8, 8, m.paper);
      stemTable.position.set(1.8, 0.4, -1.5);
      c.scene.add(stemTable);
      c.collide.addCircle(1.8, -1.5, 1.0, 0, 0.85);
      for (const [x, z] of [[-2, -2.4], [-2.8, 0.6], [2.6, 1.8]]) {
        const stool = cyl(0.4, 0.5, 0.5, 7, new THREE.MeshStandardMaterial({ color: 0x8c5a7a, roughness: 1, flatShading: true }));
        stool.position.set(x, 0.25, z);
        c.scene.add(stool);
      }
      // glowing shelf-fungus staircase up the wall
      for (let i = 0; i < 5; i++) {
        const shelf = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.2, 7, 1, false, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x4a8a7a, emissive: 0x1a4a3a, emissiveIntensity: 0.7, roughness: 1, flatShading: true }));
        shelf.position.set(-3.9, 1 + i * 0.8, 2 - i * 0.9);
        shelf.rotation.y = Math.PI / 2;
        c.scene.add(shelf);
      }
      c.place('pot', 3.1, -3, 0, { moteChance: 0.7 }).place('pot', -3, -3.1, 0, { moteChance: 0.7 });
      c.shard(0, -2.8);
      c.pack('gasbag', 3, 0, 0, 2.5);
      c.light(0, 3, 0, [0.45, 1, 0.8], 1.1);
    },
  },

  // ---------------------------------------------------------- THE SHATTER
  tower: {
    fog: [0.05, 0.04, 0.08], fogDensity: 0.024, sun: 0.42, hemiIntensity: 0.62, hemiColor: [0.74, 0.68, 0.95],
    spawn: { x: 0, z: 29, y: 30, yaw: 0 }, doorOutZ: 4.2,
    bossAt: { x: 0, z: -23 }, bossWake: 13, packTrigger: 900, // no ambush — the descent is the show
    build(c) {
      const m = mats();
      const ruin = new THREE.MeshStandardMaterial({ color: 0x4a3f5c, roughness: 1, flatShading: true });
      c.room(46, 70, 48, { floor: ruin, wall: ruin });
      // you entered at the top of an upside-down tower: descend the shelves
      c.loft(0, 29, 10, 7, 30);          // entry shelf (spawn stands here)
      c.loft(-10, 19, 7, 7, 24.2);
      c.loft(9, 9, 7, 7, 18.4);
      c.loft(-9, -1, 7, 7, 12.6);
      c.loft(9, -11, 7, 7, 6.8);
      c.loft(0, -20, 12, 8, 1.2);
      // inverted architecture: arches point the wrong way, chandeliers rise
      for (const [x, z] of [[-5, -5], [5, -5], [-5, 5]]) {
        const chandelier = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 6), m.iron);
        chandelier.position.set(x, 2.4, z);
        chandelier.rotation.x = Math.PI;
        c.scene.add(chandelier);
      }
      // shelves of stone books — the archive, spilled upward
      for (let i = 0; i < 8; i++) {
        const bk = box(0.3, 0.5, 0.2, [m.cloth, m.paper, ruin][i % 3]);
        bk.position.set(-6.8, 13 - i * 1.4, -3 + (i % 4));
        bk.rotation.z = (i % 2) * 0.4;
        c.scene.add(bk);
      }
      c.mural(0, 37, -34.7, 0, 'shatter', 9, 6);
      c.mural(0, 3.2, -34.7, 0, 'arrival', 6, 4);   // the oldest painting is at the "top" (bottom)
      c.light(0, 20, 0, [0.7, 0.55, 1], 1.4);
      c.light(-4.5, 10.8, 2, [0.7, 0.55, 1], 0.7);    // each shelf of the descent glows
      c.light(3.5, 5.6, -1.5, [0.7, 0.55, 1], 0.7);
      c.light(5, 3.2, 3.5, [0.8, 0.6, 1], 0.6);
      c.light(0, 9, -23, [0.86, 0.52, 1], 2.1);
    },
  },

  observatory: {
    fog: [0.04, 0.03, 0.07], fogDensity: 0.03, sun: 0.3, hemiIntensity: 0.6, hemiColor: [0.72, 0.68, 0.95],
    spawn: { x: 0, z: 13.2, yaw: 0 }, doorOutZ: 5.7, packTrigger: 3.5,
    build(c) {
      const m = mats();
      const stone = new THREE.MeshStandardMaterial({ color: 0x4c4660, roughness: 1, flatShading: true });
      c.room(26, 32, 20, { floor: stone, wall: stone });
      // the great telescope, aimed at a sky that broke
      const scope = cyl(0.5, 0.7, 5, 8, m.iron);
      scope.position.set(0, 3.4, -1);
      scope.rotation.x = -0.7;
      c.scene.add(scope);
      const mount = cyl(0.9, 1.2, 1.8, 8, stone);
      mount.position.set(0, 0.9, 0.2);
      c.scene.add(mount);
      c.collide.addCircle(0, 0.2, 1.1, 0, 2.2);
      // the orrery still runs — worlds on brass arms
      c._orrery = new THREE.Group();
      c._orrery.position.set(-3.2, 1.4, 2.4);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xffd890));
      c._orrery.add(sun);
      for (let i = 0; i < 3; i++) {
        const planet = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.04, 7, 5),
          new THREE.MeshStandardMaterial({ color: [0x8fb2cc, 0xcc8f5a, 0x9a8fcc][i], roughness: 0.8 }));
        planet.userData.orbit = 0.6 + i * 0.45;
        planet.userData.speed = 1.2 - i * 0.3;
        c._orrery.add(planet);
      }
      c.scene.add(c._orrery);
      c.collide.addCircle(-3.2, 2.4, 0.5, 0, 1.6);
      // star charts
      c.mural(-12.7, 5.2, 0, Math.PI / 2, 'spire', 5.2, 3.8);
      c.mural(12.7, 5.2, 0, -Math.PI / 2, 'shatter', 5.2, 3.8);
      c.mural(0, 6.6, -15.7, 0, 'spiral', 6, 4);
      c.place('shelf', 3.8, -3.6, -Math.PI / 4);
      c.place('chair', -1.6, -2.6, 0.6);
      c.shard(3.6, 3.6);
      c.pack('sentinel', 2, 0, -2, 3);
      c.light(0, 5, 0, [0.65, 0.55, 1], 1.0);
    },
    update(c, dt, t) {
      let i = 0;
      for (const child of c._orrery.children) {
        if (!child.userData.orbit) continue;
        const a = t * child.userData.speed + i * 2.1;
        child.position.set(Math.cos(a) * child.userData.orbit, 0, Math.sin(a) * child.userData.orbit);
        i++;
      }
    },
  },
};
