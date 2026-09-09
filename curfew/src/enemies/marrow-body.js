// The Presence from Alex's MARROW, through FETCH's src/marrow.js adaptation.
// Anatomy and the held 14 Hz twitch are preserved. WWPM supplies combat, ground
// collision, emergence and death instead of the donor's untouchable encounter.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clamp,TAU} from '../engine/math.js';
import {readableSurface} from '../art/surface-light.js';

function malform(geo, amp, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 7.3 + seed) * Math.cos(y * 5.1 + seed * 2.1) * Math.sin(z * 6.7 + seed * 3.3)
      + Math.sin(y * 11.0 + seed) * 0.4;
    const k = 1 + n * amp;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildPresence(rng) {
  const P = {};
  const g = new THREE.Group();
  g.name = 'the presence';
  const flesh = new THREE.MeshPhysicalMaterial({
    color: 0x090606, roughness: 0.58, metalness: 0.0,
    clearcoat: 0.42, clearcoatRoughness: 0.74, emissive: 0x070202, emissiveIntensity: 0.08,
  });
  const bone = new THREE.MeshStandardMaterial({ color: 0x18130f, roughness: 0.82 });
  const cavity = new THREE.MeshBasicMaterial({ color: 0x040203 });
  P.mawMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a0608, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.62,
    emissive: 0x4a0206, emissiveIntensity: 0.0,
  });
  const shadowSkin = new THREE.MeshStandardMaterial({
    color: 0x171014, roughness: 0.8, transparent: true, opacity: 0.62, depthWrite: false,
  });
  const blackVeil = new THREE.MeshBasicMaterial({
    color: 0x050304, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false,
  });
  P.veinMat = new THREE.MeshStandardMaterial({
    color: 0x3a0508, roughness: 0.36, emissive: 0x140002, emissiveIntensity: 0.12,
  });
  P.eyeMat = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0xd8e0cf, emissiveIntensity: 1.7, roughness: 1,
  });

  const pelvis = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.13, 0.16, 4, 8), 0.16, 5), flesh);
  pelvis.position.y = 0.98; g.add(pelvis);
  const torso = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.17, 0.85, 5, 12), 0.2, 3), flesh);
  torso.position.set(0.02, 1.35, 0); torso.scale.set(1, 1, 0.6); torso.rotation.x = 0.14; g.add(torso);
  P.torso = torso;
  P.veins = [];
  for (let i = 0; i < 6; i++) {
    const vein = new THREE.Mesh(new THREE.CapsuleGeometry(0.006 + (i % 2) * 0.003, 0.26 + i * 0.025, 2, 5), P.veinMat);
    vein.position.set((i - 2.5) * 0.04, 1.35 + Math.sin(i * 1.7) * 0.18, 0.112);
    vein.rotation.set(0.32 + i * 0.04, 0.12 * Math.sin(i), (i - 2.5) * 0.22);
    g.add(vein); P.veins.push(vein);
  }
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.135 - i * 0.014, 0.011, 6, 12, Math.PI), bone);
    rib.position.set(0, 1.62 - i * 0.12, 0.05); rib.rotation.set(Math.PI / 2, 0, (i % 2 ? 1 : -1) * 0.06);
    g.add(rib);
  }
  const clav = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.34, 3, 6), bone);
  clav.position.set(0, 1.76, 0.05); clav.rotation.z = Math.PI / 2; g.add(clav);
  // the crooked rib-halo: antlers for one frame, exposed anatomy the next
  P.spines = [];
  for (let i = 0; i < 7; i++) {
    const sx = (i - 3) * 0.055;
    const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.48 + Math.abs(i - 3) * 0.08, 3, 6), bone);
    spine.position.set(sx, 1.73 - Math.abs(i - 3) * 0.035, -0.09);
    spine.rotation.set(0.68 + Math.abs(i - 3) * 0.08, sx * 4.5, sx * 3.0);
    g.add(spine); P.spines.push(spine);
  }
  P.head = new THREE.Group(); P.head.position.set(0.04, 1.92, 0.01); g.add(P.head);
  const tilt = new THREE.Group(); tilt.rotation.set(0.16, 0.05, 0.26); P.head.add(tilt);
  const skullM = new THREE.Mesh(malform(new THREE.SphereGeometry(0.15, 18, 18), 0.16, 7), flesh);
  skullM.scale.set(0.78, 1.28, 0.9); skullM.position.z = 0.01; tilt.add(skullM);
  // deep sockets, eyes too far back, plus a third wrong one
  const eyePts = [[-0.06, 0.03, 0.12], [0.065, 0.02, 0.12], [0.005, 0.11, 0.115]];
  eyePts.forEach((e, i) => {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), cavity);
    socket.position.set(e[0], e[1], e[2] - 0.03); socket.scale.set(1, 1.3, 0.5); tilt.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(i === 2 ? 0.015 : 0.023, 10, 10), P.eyeMat);
    eye.position.set(e[0], e[1], e[2] + 0.028); tilt.add(eye);
  });
  const maw = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), P.mawMat);
  maw.scale.set(0.62, 1.7, 0.6); maw.position.set(0, -0.07, 0.1); tilt.add(maw);
  P.jaw = new THREE.Group(); P.jaw.position.set(0, -0.04, 0.05); tilt.add(P.jaw);
  const jawMesh = new THREE.Mesh(malform(new THREE.BoxGeometry(0.11, 0.13, 0.11), 0.18, 9), flesh);
  jawMesh.position.y = -0.085; P.jaw.add(jawMesh);
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 4), bone);
    const a = (i / 6) * TAU;
    tooth.position.set(Math.cos(a) * 0.04, -0.02 + Math.sin(a) * 0.05, 0.12);
    tooth.rotation.x = Math.PI; tilt.add(tooth);
  }
  // the half-formed second face in the shoulder — there for the light to
  // accidentally find
  P.sideFace = new THREE.Group();
  P.sideFace.position.set(-0.19, 1.66, 0.04);
  P.sideFace.rotation.set(0.25, -0.72, -0.15);
  g.add(P.sideFace);
  const sideSkull = new THREE.Mesh(malform(new THREE.SphereGeometry(0.075, 12, 10), 0.2, 41), flesh);
  sideSkull.scale.set(0.65, 1.0, 0.8); P.sideFace.add(sideSkull);
  const sideEye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), P.eyeMat);
  sideEye.position.set(-0.018, 0.018, 0.065); P.sideFace.add(sideEye);
  const sideMaw = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.06, 0.012), P.mawMat);
  sideMaw.position.set(0.012, -0.035, 0.066); P.sideFace.add(sideMaw);
  // arms: too long, asymmetric, bent, splayed fingers
  P.arms = [];
  [[-1, 1.0, 11], [1, 1.18, 13]].forEach(([sx, len, seed]) => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.16, 1.74, 0); g.add(pivot);
    const upper = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.038, 0.46 * len, 3, 6), 0.12, seed), flesh);
    upper.position.y = -0.26 * len; pivot.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.52 * len; elbow.rotation.x = 0.55; pivot.add(elbow);
    const fore = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.03, 0.46 * len, 3, 6), 0.12, seed + 1), flesh);
    fore.position.y = -0.26 * len; elbow.add(fore);
    const hand = new THREE.Group(); hand.position.y = -0.52 * len; elbow.add(hand);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.016, 0.2, 5), flesh);
      finger.geometry.translate(0, -0.1, 0);
      finger.position.set((f - 1.5) * 0.022, 0, 0.01); finger.rotation.x = 0.25 + f * 0.04; hand.add(finger);
    }
    P.arms.push(pivot);
  });
  // wrong extra limbs folded against the ribs
  for (let i = 0; i < 3; i++) {
    const sx = i === 1 ? 0 : (i === 0 ? -1 : 1);
    const limb = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.022, 0.85 + i * 0.18, 3, 6), 0.18, 31 + i), flesh);
    limb.position.set(sx * (0.12 + i * 0.04), 1.34 - i * 0.08, -0.06);
    limb.rotation.set(0.9 + i * 0.25, sx * 0.35, sx * (0.65 + i * 0.2));
    g.add(limb);
  }
  // veil strips + ragged black negative-space; the rags stay unlit so the
  // silhouette stays wrong even under the skull's light
  P.veils = [];
  for (let i = 0; i < 7; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.04 + (i % 3) * 0.018, 0.85 + rng.next() * 0.6), shadowSkin);
    strip.position.set((i - 3) * 0.035, 1.62 - rng.next() * 0.25, -0.10 - rng.next() * 0.06);
    strip.rotation.set(0.2 + rng.next() * 0.3, (rng.next() - 0.5) * 0.4, (rng.next() - 0.5) * 0.5);
    g.add(strip); P.veils.push(strip);
  }
  P.rags = [];
  for (let i = 0; i < 9; i++) {
    const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.055 + (i % 3) * 0.025, 1.0 + rng.next() * 0.7), blackVeil);
    rag.position.set((i - 4) * 0.045, 1.16 + rng.next() * 0.26, 0.03 + (i % 2) * 0.035);
    rag.rotation.set((rng.next() - 0.5) * 0.22, (rng.next() - 0.5) * 0.8, (i - 4) * 0.08);
    rag.renderOrder = 2;
    g.add(rag); P.rags.push(rag);
  }
  P.chestEyes = [];
  for (let i = 0; i < 5; i++) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012 + (i % 2) * 0.006, 8, 8), P.eyeMat);
    eye.position.set((i - 2) * 0.045, 1.48 + Math.sin(i) * 0.09, 0.16);
    g.add(eye); P.chestEyes.push(eye);
  }
  P.legs = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.08, 0.92, 0); g.add(pivot);
    const thigh = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.05, 0.38, 3, 6), 0.1, sx + 5), flesh);
    thigh.position.y = -0.21; pivot.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.43; knee.rotation.x = -0.2; pivot.add(knee);
    const shin = new THREE.Mesh(malform(new THREE.CapsuleGeometry(0.038, 0.42, 3, 6), 0.1, sx + 7), flesh);
    shin.position.y = -0.22; knee.add(shin);
    P.legs.push(pivot);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  P.group = g;
  P.phase = 0;
  P._twitchUntil = 0;
  P._twitch = new THREE.Vector3();
  return P;
}

// MARROW's wrongness ticker (entity.js:466-549), guard/erupt/fold only —
// the modes this district uses. `ag` is the one aggression scalar.
function tickPresence(P, dt, dist, mode, anims, rng) {
  P.phase += dt;
  const guardLoom = mode === 'guard' ? clamp(1 - (dist - 1.0) / 7, 0, 1) : 0;
  const ag = mode === 'guard' ? clamp(0.35 + guardLoom * 0.65, 0, 1) : anims.ag ?? 0.6;
  P.group.scale.set(1 + guardLoom * 0.16, 1 + guardLoom * 0.40, 1 + guardLoom * 0.16);
  // sharp involuntary head twitches
  if (P.phase > P._twitchUntil) {
    P._twitchUntil = P.phase + 0.25 + rng.next() * (1.4 - ag);
    P._twitch.set((rng.next() - 0.5) * (0.3 + ag * 0.5), (rng.next() - 0.5) * 0.6, (rng.next() - 0.5) * 0.4);
  }
  const tw = P._twitch, sw = 1 - Math.min(1, (P._twitchUntil - P.phase) * 4);
  const lean = mode === 'guard' ? -guardLoom * 0.72 : 0;
  P.head.rotation.x = lean + tw.x * sw + Math.sin(P.phase * 9) * 0.02;
  P.head.rotation.y = tw.y * sw;
  P.head.rotation.z = tw.z * sw + Math.sin(P.phase * 6.1) * 0.03;
  P.jaw.rotation.x = 0.25 + ag * 0.7 + Math.sin(P.phase * 5) * 0.05 * ag;
  P.mawMat.emissiveIntensity = ag * (1.2 + Math.sin(P.phase * 11) * 0.4);
  P.eyeMat.emissiveIntensity = (mode === 'guard' ? 2.2 : 1.5) + ag * 1.5 + Math.sin(P.phase * 13) * 0.25 * ag;
  P.veinMat.emissiveIntensity = 0.1 + ag * 0.42;
  // the stop-motion jitter: held frames hashed by step index
  const jit = 0.006 + ag * 0.02;
  const step = Math.floor(P.phase * 14);
  const frac = (n) => n - Math.floor(n);
  const jx = frac(Math.sin(step * 12.9898) * 43758.5453) - 0.5;
  const jz = frac(Math.sin(step * 78.233 + 9.7) * 24634.6345) - 0.5;
  P.group.position.x = anims.x + jx * jit;
  P.group.position.z = anims.z + jz * jit;
  // secondary motion: veils, rags, chest eyes, spines, the turning side face
  for (let i = 0; i < P.veils.length; i++) {
    P.veils[i].rotation.z = Math.sin(P.phase * 3.1 + i) * 0.14;
    P.veils[i].material.opacity = 0.42 + ag * 0.26 + Math.sin(P.phase * 11 + i) * 0.08;
  }
  for (let i = 0; i < P.rags.length; i++) {
    P.rags[i].scale.y = 1 + Math.sin(P.phase * 2.3 + i * 1.7) * 0.06;
    P.rags[i].material.opacity = 0.52 + ag * 0.22;
  }
  for (let i = 0; i < P.chestEyes.length; i++) {
    P.chestEyes[i].scale.setScalar(0.7 + ag * 0.9 + Math.sin(P.phase * 17 + i) * 0.18);
  }
  for (let i = 0; i < P.spines.length; i++) {
    P.spines[i].rotation.y += Math.sin(P.phase * 1.9 + i) * 0.0006;
  }
  P.sideFace.rotation.y = -0.72 + Math.sin(P.phase * 7.5) * 0.08 + ag * 0.18;
}


export function buildMarrow(rng){
  const P=buildPresence(rng),group=new THREE.Group();group.name='enemy:marrow';group.visible=false;
  const turn=new THREE.Group();turn.rotation.y=Math.PI;group.add(turn);turn.add(P.group);
  const moving=new Set([P.torso,...P.spines,...P.veils,...P.rags,...P.chestEyes]);
  // Merge only rigid siblings. The face, jaw, spines and dangling limbs keep their pivots.
  const parents=[];P.group.traverse(o=>{if(o.children.length)parents.push(o);});
  for(const parent of parents){
    const batches=new Map();
    for(const child of parent.children){if(!child.isMesh||child.children.length||moving.has(child))continue;
      if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(child);}
    for(const [mat,meshes] of batches){if(meshes.length<2)continue;
      const parts=meshes.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
      const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
      if(!geo)continue;meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});
      const merged=new THREE.Mesh(geo,mat);merged.frustumCulled=false;parent.add(merged);
    }
  }
  const mats=new Set(),geos=new Set();let drawCount=0;
  group.traverse(o=>{if(o.isMesh){mats.add(o.material);geos.add(o.geometry);drawCount++;}});
  mats.forEach(m=>{if(m.isMeshStandardMaterial)readableSurface(m);});
  const zones=[{x:0,y:1.98,z:0,r:.19,zone:'head'},...Array.from({length:5},(_,i)=>({x:0,y:.9+i*.19,z:0,r:.24,zone:'torso'}))];
  for(const side of [-1,1])for(let i=0;i<5;i++)zones.push({x:side*.16,y:.2+i*.32,z:0,r:.14,zone:'limb'});
  let last=0,death=1;
  const state={x:0,z:0,ag:.6};
  return{group,zones,scale:1.08,drawCount,gait:'walk',muzzle:null,
    shellMat:P.torso.material,eyeMat:P.eyeMat,contactMat:P.eyeMat,
    reveal(){},telegraph(v){P.eyeMat.emissiveIntensity=1.5+v*2;},deathGlow(v){death=v;P.eyeMat.emissiveIntensity=v*.3;},
    animate(a){
      const dt=Math.max(0,Math.min(.05,(a.time||0)-last));last=a.time||0;if(a.dead)return;
      death=1;state.ag=.4+(a.moveAmp||0)*.3+(a.coil||0)*.3;
      tickPresence(P,dt,3,'pursue',state,rng);
      const step=Math.floor((a.time||0)*14)/14;
      for(let i=0;i<2;i++){
        const phase=(a.gait||0)*1.6+i*Math.PI;
        P.legs[i].rotation.x=Math.sin(phase)*.72*(a.moveAmp||0);
        P.arms[i].rotation.x=-.25+Math.sin(phase+1.3)*.60*(a.moveAmp||0)-(a.coil||0)*1.6+(a.swing||0)*1.9;
        P.arms[i].rotation.z=(i?1:-1)*(.08+Math.sin(step*11+i)*.08);
      }
      P.jaw.rotation.x+=Math.max(0,a.coil||0)*.8;
    },dispose(){mats.forEach(m=>m.dispose());geos.forEach(g=>g.dispose());}}
}
