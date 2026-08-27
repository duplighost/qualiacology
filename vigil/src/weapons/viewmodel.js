// The CINDER viewmodel: a procedural carbine in its OWN scene, rendered
// through its own 48° lens (44° ADS) after post with cleared depth — the gun
// never clips walls, never fisheyes, and its apparent size is independent of
// the world FOV (COMBAT_FEEL §1.1). Aim stays screen-centre: the ADS pose
// moves the model so the sight sits on the WORLD camera's centre ray.
//
// Gun local frame: +X right, +Y up, -Z down the bore. Muzzle z = -0.472.

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp, ease, Spring, Spring3, sway2 } from '../engine/math.js';
import { batchStaticMeshes } from '../gfx/geometry.js';
import { chamferedBox, taperedPanel } from '../gfx/shapes.js';

const REST = { pos: new THREE.Vector3(0.0975, -0.0880, -0.2820), rot: new THREE.Euler(-0.024, 0.038, 0.052) };
const SIGHT = new THREE.Vector3(0, 0.0680, -0.0790);
const ADS_DIST = 0.155;
const ADS_POS = new THREE.Vector3(-SIGHT.x, -SIGHT.y, -(ADS_DIST + SIGHT.z + 0.079) - 0.076 + 0.079);
ADS_POS.set(0, -SIGHT.y, -(ADS_DIST - (-SIGHT.z)));   // (0, -0.068, -0.076)
const MUZZLE = new THREE.Vector3(0, 0.012, -0.472);
const SPRINT_POSE = { pos: new THREE.Vector3(0.075, -0.045, -0.020), rot: new THREE.Euler(-14 * DEG, 8 * DEG, 32 * DEG) };

export function createViewmodel(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.01, 6);
  const rng = ctx.rng.fork('flash');
  const brassRng = ctx.rng.fork('brass');

  /* ---------------- lights (added once) ---------------- */
  const key = new THREE.DirectionalLight(0xcfe6ff, 3.2);
  key.position.set(-0.5, 0.9, 0.55);
  scene.add(key);
  const fillL = new THREE.DirectionalLight(0x8fa0c8, 0.7);
  fillL.position.set(0.45, -0.6, 0.35);
  scene.add(fillL);
  const rim = new THREE.DirectionalLight(0x9adfff, 0.9);
  rim.position.set(0.3, 0.25, -0.8);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x46587a, 0.85));
  const viewFlash = new THREE.PointLight(0xffc27a, 0, 4, 2);
  scene.add(viewFlash);

  /* ---------------- the carbine ---------------- */
  const root = new THREE.Group();
  scene.add(root);
  const gun = new THREE.Group();
  root.add(gun);

  // CINDER identity: oil-black titanium chassis, pale lunar-ceramic strike
  // plates, and a live cyan conduit. The high-value separation comes from
  // roughness/metal response as much as color, so it stays legible in shadow
  // without becoming a toy-bright skin.
  const anodized = new THREE.MeshStandardMaterial({ color: 0x17232d, roughness: 0.34, metalness: 0.72 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x0d141b, roughness: 0.82, metalness: 0.05 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9ca7a3, roughness: 0.28, metalness: 0.78 });
  // The lunar-ceramic armor stays visibly separate from exposed steel without
  // turning the top half of the weapon into a blown-out white slab. It uses
  // the same Standard shader feature set, so this adds a material batch but no
  // shader variant at the exact 60-program performance ceiling.
  const ceramic = new THREE.MeshStandardMaterial({ color: 0x617680, roughness: 0.39, metalness: 0.46 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x141d26, roughness: 0.96, metalness: 0.02 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x293b4b, roughness: 1.0, metalness: 0.01 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x0b3643, roughness: 0.30, metalness: 0.58, emissive: 0x35dfff, emissiveIntensity: 2.15 });
  const magWin = new THREE.MeshStandardMaterial({ color: 0x75e9f5, roughness: 0.20, metalness: 0.08, transparent: true, opacity: 0.40 });
  const portMat = new THREE.MeshBasicMaterial({ color: 0x04070a });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x183d50, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  const coatMat = new THREE.MeshBasicMaterial({ color: 0x5ad9ed, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false });

  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  const oct = (r, len) => {
    const g = new THREE.CylinderGeometry(r, r, len, 8, 1);
    g.rotateX(Math.PI / 2);
    g.rotateZ(Math.PI / 8);
    return g;
  };
  const ellipsoid = (width, height, depth) => {
    const g = new THREE.SphereGeometry(0.5, 12, 8);
    g.scale(width, height, depth);
    return g;
  };
  const sleeve = (wristR, elbowR, len) => {
    const g = new THREE.CylinderGeometry(wristR, elbowR, len, 10, 1);
    g.rotateX(Math.PI / 2);
    g.scale(1.12, 0.76, 1);
    return g;
  };

  // Rigid weapon shell. Every piece stays in the original CINDER envelope;
  // bevels and layered panels create the highlight language, not extra lights.
  const staticShell = new THREE.Group();
  staticShell.name = 'cinder-static-shell';
  gun.add(staticShell);

  // Upper/lower receiver, side armor, rear cap, and uninterrupted top rail.
  add(staticShell, chamferedBox(0.072, 0.076, 0.300, 0.012, 0.006), anodized, 0, 0.004, -0.075);
  add(staticShell, taperedPanel(0.066, 0.060, 0.130, 0.12), polymer, 0, -0.035, 0.012);
  add(staticShell, chamferedBox(0.068, 0.062, 0.030, 0.008, 0.004), anodized, 0, -0.002, 0.086);
  for (const x of [-0.039, 0.039]) {
    add(staticShell, chamferedBox(0.007, 0.052, 0.174, 0.003, 0.0015), ceramic, x, 0.002, -0.066);
  }
  add(staticShell, chamferedBox(0.058, 0.012, 0.340, 0.004, 0.002), anodized, 0, 0.048, -0.090);
  for (let i = 0; i < 13; i++) {
    add(staticShell, new THREE.BoxGeometry(0.056, 0.007, 0.017), ceramic, 0, 0.057, 0.055 - i * 0.025);
  }

  // Right-side ejection port, chamber glint, selector, and restrained fasteners.
  add(staticShell, new THREE.BoxGeometry(0.003, 0.029, 0.078), portMat, 0.0405, 0.010, -0.052);
  add(staticShell, new THREE.BoxGeometry(0.0018, 0.015, 0.046), steel, 0.0426, 0.012, -0.052);
  for (let i = 0; i < 6; i++) {
    add(staticShell, new THREE.BoxGeometry(0.003, 0.005, 0.018), portMat, 0.0408, -0.027, 0.050 - i * 0.024);
  }
  const screw = (x, y, z) => {
    const geo = new THREE.CylinderGeometry(0.0042, 0.0042, 0.003, 10);
    geo.rotateZ(Math.PI / 2);
    add(staticShell, geo, steel, x, y, z);
  };
  for (const [y, z] of [[0.027, 0.035], [-0.020, 0.026], [0.027, -0.135], [-0.020, -0.142]]) screw(0.041, y, z);
  const selectorGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 12);
  selectorGeo.rotateZ(Math.PI / 2);
  add(staticShell, selectorGeo, steel, 0.042, -0.016, 0.056, 0, 0, 0.28);

  // Chamfered handguard with inset side panels, ventilation, and a continuous
  // cyan identity line. Its forward face remains behind MUZZLE.z.
  add(staticShell, chamferedBox(0.082, 0.074, 0.225, 0.014, 0.006), polymer, 0, 0.003, -0.325);
  add(staticShell, chamferedBox(0.054, 0.007, 0.178, 0.003, 0.0015), ceramic, 0, 0.042, -0.318);
  add(staticShell, chamferedBox(0.054, 0.007, 0.164, 0.003, 0.0015), ceramic, 0, -0.039, -0.318);
  for (const x of [-0.044, 0.044]) {
    add(staticShell, chamferedBox(0.006, 0.044, 0.172, 0.003, 0.0015), ceramic, x, 0.002, -0.318);
    add(staticShell, new THREE.BoxGeometry(0.0035, 0.006, 0.118), accent, x > 0 ? 0.047 : -0.047, -0.018, -0.320);
    for (let i = 0; i < 5; i++) {
      add(staticShell, new THREE.BoxGeometry(0.0035, 0.014, 0.017), portMat, x > 0 ? 0.0475 : -0.0475, 0.007, -0.255 - i * 0.032);
    }
  }

  // Gas system, barrel, and compact vented muzzle device terminate exactly at
  // the existing authored MUZZLE point.
  add(staticShell, chamferedBox(0.052, 0.050, 0.038, 0.007, 0.004), steel, 0, 0.020, -0.419);
  const barrelGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.130, 12);
  barrelGeo.rotateX(Math.PI / 2);
  add(staticShell, barrelGeo, steel, 0, 0.012, -0.407);
  add(staticShell, oct(0.018, 0.038), steel, 0, 0.012, -0.453);
  for (const z of [-0.443, -0.462]) add(staticShell, new THREE.TorusGeometry(0.0178, 0.0015, 5, 16), portMat, 0, 0.012, z);

  // Buffer tube, layered stock, grip, and a real curved trigger guard.
  add(staticShell, oct(0.017, 0.140), steel, 0, 0.004, 0.105);
  add(staticShell, chamferedBox(0.054, 0.064, 0.095, 0.010, 0.005), polymer, 0, -0.005, 0.143);
  add(staticShell, chamferedBox(0.057, 0.070, 0.018, 0.007, 0.003), polymer, 0, -0.009, 0.190);
  add(staticShell, taperedPanel(0.048, 0.018, 0.110, 0.18), ceramic, 0, 0.033, 0.132);
  for (const x of [-0.0285, 0.0285]) {
    for (const y of [-0.020, 0, 0.020]) add(staticShell, new THREE.BoxGeometry(0.003, 0.006, 0.064), portMat, x, y, 0.145);
  }
  add(staticShell, chamferedBox(0.038, 0.085, 0.052, 0.008, 0.004), polymer, 0, -0.075, 0.035, 0.32);
  for (const x of [-0.0205, 0.0205]) add(staticShell, new THREE.BoxGeometry(0.003, 0.058, 0.035), ceramic, x, -0.075, 0.035, 0.32);
  const guardGeo = new THREE.TorusGeometry(0.024, 0.003, 6, 18, Math.PI);
  guardGeo.rotateY(Math.PI / 2);
  add(staticShell, guardGeo, steel, 0, -0.050, -0.006, 0, 0, Math.PI);
  add(staticShell, new THREE.BoxGeometry(0.004, 0.025, 0.004), steel, 0, -0.045, -0.015, -0.18);

  // Magazine shell moves as one authored unit; the follower remains outside
  // its static batch because ammo owns that transform every frame.
  const magG = new THREE.Group();
  magG.name = 'cinder-magazine';
  gun.add(magG);
  magG.position.set(0, -0.075, -0.045);
  magG.rotation.x = 0.14;
  const magShell = new THREE.Group();
  magG.add(magShell);
  add(magShell, chamferedBox(0.056, 0.130, 0.075, 0.009, 0.004), polymer, 0, -0.050, 0);
  add(magShell, chamferedBox(0.061, 0.012, 0.082, 0.004, 0.002), ceramic, 0, -0.116, 0.002);
  for (let i = 0; i < 5; i++) add(magShell, new THREE.BoxGeometry(0.059, 0.006, 0.078), polymer, 0, -0.018 - i * 0.022, 0);
  add(magShell, new THREE.BoxGeometry(0.054, 0.110, 0.020), magWin, 0, -0.050, -0.039);
  const follower = add(magG, chamferedBox(0.050, 0.012, 0.016, 0.003, 0.0015), steel, 0, -0.005, -0.039);

  // Bolt handle retains one moving owner but gains a tactile cap.
  const bolt = new THREE.Group();
  bolt.name = 'cinder-bolt';
  bolt.position.set(0.043, 0.020, -0.030);
  gun.add(bolt);
  add(bolt, chamferedBox(0.018, 0.016, 0.050, 0.004, 0.002), steel, 0, 0, 0);
  add(bolt, new THREE.SphereGeometry(0.008, 10, 6), steel, 0.011, 0, 0.012);

  // Reflex optic: layered housing, coated glass, and the original dot at the
  // exact SIGHT-local centre used by the hit-ray contract.
  const sightG = new THREE.Group();
  sightG.name = 'cinder-optic';
  gun.add(sightG);
  sightG.position.copy(SIGHT);
  const sightShell = new THREE.Group();
  sightG.add(sightShell);
  add(sightShell, chamferedBox(0.046, 0.012, 0.056, 0.004, 0.002), anodized, 0, -0.021, 0);
  for (const x of [-0.017, 0.017]) add(sightShell, chamferedBox(0.006, 0.038, 0.012, 0.0025, 0.001), anodized, x, -0.001, 0.012);
  add(sightShell, chamferedBox(0.040, 0.006, 0.012, 0.0025, 0.001), anodized, 0, 0.018, 0.012);
  const opticRing = new THREE.TorusGeometry(0.016, 0.0022, 6, 24);
  add(sightShell, opticRing, anodized, 0, 0, 0.012);
  for (const x of [-0.014, 0.014]) {
    const opticScrew = new THREE.CylinderGeometry(0.0026, 0.0026, 0.003, 8);
    opticScrew.rotateX(Math.PI / 2);
    add(sightShell, opticScrew, steel, x, -0.020, 0.029);
  }
  const glass = add(sightG, new THREE.CircleGeometry(0.0145, 24), glassMat, 0, 0, 0.011);
  add(sightG, new THREE.CircleGeometry(0.0128, 24), coatMat, 0, 0, 0.0115);
  const dot = add(sightG, new THREE.CircleGeometry(0.0016, 10), new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.6, 1.02, 0.14), toneMapped: false, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  }), 0, 0, 0.013);

  // Two restrained tactical hands complete the first-person silhouette. They
  // are rigid passengers on the existing gun pose; no animation timeline is
  // introduced or taken away from reload, recoil, sprint, ADS, or melee.
  const leftHand = new THREE.Group();
  leftHand.name = 'cinder-left-hand';
  leftHand.position.set(-0.036, -0.047, -0.276);
  leftHand.rotation.set(-0.04, 0.08, -0.10);
  gun.add(leftHand);
  add(leftHand, ellipsoid(0.070, 0.040, 0.076), glove, 0, -0.006, 0);
  for (let i = 0; i < 4; i++) add(leftHand, ellipsoid(0.014, 0.020, 0.068), glove, -0.024 + i * 0.016, 0.014, -0.020, 0.12);
  for (let i = 0; i < 4; i++) add(leftHand, chamferedBox(0.012, 0.005, 0.020, 0.003, 0.001), fabric, -0.024 + i * 0.016, 0.026, -0.040);
  add(leftHand, ellipsoid(0.020, 0.026, 0.055), glove, 0.038, -0.001, 0.006, 0.08, 0, -0.45);
  add(leftHand, chamferedBox(0.078, 0.052, 0.026, 0.009, 0.004), fabric, 0, -0.018, 0.054);
  add(leftHand, sleeve(0.034, 0.044, 0.150), fabric, 0, -0.028, 0.138, -0.08);
  for (let i = 0; i < 6; i++) add(leftHand, new THREE.BoxGeometry(0.068, 0.003, 0.007), glove, 0, -0.001, 0.086 + i * 0.024, -0.08);
  for (const x of [-0.030, 0.030]) add(leftHand, new THREE.BoxGeometry(0.006, 0.003, 0.130), glove, x, -0.001, 0.145, -0.08);

  const rightHand = new THREE.Group();
  rightHand.name = 'cinder-right-hand';
  rightHand.position.set(0.042, -0.080, 0.036);
  rightHand.rotation.set(0.26, 0.02, -0.08);
  gun.add(rightHand);
  add(rightHand, ellipsoid(0.068, 0.064, 0.060), glove, 0, 0, 0);
  for (let i = 0; i < 3; i++) add(rightHand, ellipsoid(0.015, 0.058, 0.026), glove, -0.020 + i * 0.020, -0.010, -0.022, 0.12);
  for (let i = 0; i < 3; i++) add(rightHand, chamferedBox(0.014, 0.006, 0.020, 0.003, 0.001), fabric, -0.020 + i * 0.020, 0.034, -0.018);
  add(rightHand, ellipsoid(0.022, 0.048, 0.030), glove, -0.038, 0.004, -0.004, 0, 0, 0.40);
  add(rightHand, chamferedBox(0.078, 0.060, 0.028, 0.010, 0.004), fabric, 0, -0.020, 0.058);
  add(rightHand, sleeve(0.036, 0.047, 0.170), fabric, 0, -0.036, 0.150, -0.05);
  for (let i = 0; i < 7; i++) add(rightHand, new THREE.BoxGeometry(0.072, 0.003, 0.007), glove, 0, -0.004, 0.082 + i * 0.022, -0.05);
  for (const x of [-0.032, 0.032]) add(rightHand, new THREE.BoxGeometry(0.006, 0.003, 0.145), glove, x, -0.003, 0.150, -0.05);
  add(rightHand, new THREE.BoxGeometry(0.034, 0.003, 0.125), glove, 0, -0.003, 0.155, -0.05);

  gun.userData.visualBatches = {
    receiver: batchStaticMeshes(staticShell),
    magazine: batchStaticMeshes(magShell),
    bolt: batchStaticMeshes(bolt),
    optic: batchStaticMeshes(sightShell),
    leftHand: batchStaticMeshes(leftHand),
    rightHand: batchStaticMeshes(rightHand),
  };

  gun.traverse(o => { o.frustumCulled = false; });

  /* ---------------- muzzle flash: star core + bore cone ---------------- */
  const flashUniforms = { uLife: { value: 1 }, uRot: { value: 0 }, uBoost: { value: 0 } };
  const coreMat = new THREE.ShaderMaterial({
    uniforms: flashUniforms,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform float uLife;   // 0 fresh .. 1 dead
      uniform float uRot;
      uniform float uBoost;
      void main() {
        float cr = cos(uRot), sr = sin(uRot);
        vec2 p = mat2(cr, -sr, sr, cr) * vUv;
        float r = length(p);
        float a2 = atan(p.y, p.x);
        float core = exp(-r * r * 26.0) * 2.6 + exp(-r * r * 9.0) * 0.9;
        float petals = pow(abs(cos(a2 * 2.0)), 2.6) * 0.9 + pow(abs(cos(a2 * 4.0 + 0.785)), 3.4) * 0.5;
        float spokes = pow(abs(cos(a2 * 8.5)), 12.0) * 0.6;
        float shape = core + (petals + spokes) * exp(-r * r * 5.0) * 0.8;
        shape *= 1.0 - smoothstep(0.75, 1.0, r);      // must reach 0 at the edge
        float alpha = clamp(shape, 0.0, 1.0) * (1.0 - uLife * uLife);
        vec3 col = mix(vec3(1.0, 0.93, 0.78), vec3(1.0, 0.62, 0.22), clamp(r * 1.6, 0.0, 1.0));
        vec3 charged = mix(vec3(1.0), vec3(0.45, 0.94, 1.0), clamp(r * 1.25, 0.0, 1.0));
        col = mix(col, charged, uBoost * 0.72);
        gl_FragColor = vec4(col * alpha, alpha);
      }`,
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const flashCore = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.23), coreMat);
  flashCore.visible = false;
  flashCore.frustumCulled = false;
  gun.add(flashCore);
  flashCore.position.copy(MUZZLE);

  const coneMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0, 0.55, 0.18), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const flashCone = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 10, 1, true), coneMat);
  flashCone.rotation.x = -Math.PI / 2;
  flashCone.position.copy(MUZZLE).z -= 0.13;
  flashCone.visible = false;
  flashCone.frustumCulled = false;
  gun.add(flashCone);

  // world-scene muzzle light (casts the flash onto the ground). Added once.
  const worldFlash = new THREE.PointLight(0xffc27a, 0, 18, 2);
  ctx.scene.add(worldFlash);

  let flashAge = 99, flashAds = 0, flashBoost = 0;

  /* ---------------- brass: instanced pool in the WORLD scene ---------------- */
  const BRASS_N = 48;
  const brassGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.019, 6);
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.35, metalness: 0.9 });
  const brass = new THREE.InstancedMesh(brassGeo, brassMat, BRASS_N);
  brass.frustumCulled = false;
  ctx.scene.add(brass);
  const brassState = [];
  for (let i = 0; i < BRASS_N; i++) brassState.push({ live: false, age: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), bounces: 0 });
  let brassCursor = 0;
  const pendingBrass = [];

  /* ---------------- pose springs + state ---------------- */
  const kickPos = new Spring3(16, 0.50);
  const kickRot = new Spring3(16, 0.50);
  const angLag = new Spring3(6.5, 0.72);
  const linLag = new Spring3(7.0, 0.80);
  const landDip = new Spring(6.2, 0.62);
  const jolt = new Spring(13, 0.55);
  const boltS = new Spring(22, 0.30);
  let boltAnim = 0;               // s since last shot for the 26/62 ms cycle
  let sprintT = 0;
  let st = { adsT: 0, firing: false, sinceShot: 99, ammo: 30, mag: 30, heat: 0, roundsRecent: 0, reloading: null, boostedRounds: 0 };
  let prevYaw = 0, prevPitch = 0;
  let reloadJolts = { contact: 0.18, seat: 0.5, boltrelease: 0.85, drop: 0.1 };
  let magDropT = -1, magRiseT = -1;

  ctx.bus.on('player:land', ({ speed }) => {
    landDip.nudge(-clamp(speed * 0.030, 0, 0.42) * 6.2);
  });

  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
  const _camQ = new THREE.Quaternion();

  return {
    scene, camera,
    onResize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    kick(index, mW) {
      kickPos.nudge((index % 2 ? -0.004 : 0.004) * mW * 16, 0.006 * mW * 16, 0.028 * mW * 16);
      kickRot.nudge(3.4 * DEG * mW * 16, (index % 2 ? 1.1 : -1.1) * DEG * mW * 16, (index % 2 ? 2.2 : -2.2) * DEG * mW * 16);
      boltS.nudge(1.0);
      boltAnim = 0;
    },

    flash(subT, adsT, boosted = false) {
      flashAge = -subT;
      flashAds = adsT;
      flashBoost = boosted ? 1 : 0;
      flashUniforms.uRot.value = Math.floor(rng.next() * 8) * (Math.PI / 4);
      flashUniforms.uBoost.value = flashBoost;
      coneMat.color.setHex(boosted ? 0xa7f7ff : 0xff8c2e);
      viewFlash.color.setHex(boosted ? 0xc8fbff : 0xffc27a);
      worldFlash.color.setHex(boosted ? 0xb7f6ff : 0xffc27a);
      // eject brass 28 ms after the shot (the bolt has to travel)
      pendingBrass.push(0.028 - subT);
    },

    onReloadBeat(name) {
      if (reloadJolts[name]) jolt.nudge(reloadJolts[name] * 10);
      if (name === 'drop') magDropT = 0;
      if (name === 'enter') { magRiseT = 0; magDropT = -1; }
    },
    onActiveReload(outcome) {
      jolt.nudge(outcome === 'success' ? 6 : -4);
    },
    onReloadEnd() {
      magDropT = -1;
      magRiseT = -1;
      magG.position.set(0, -0.075, -0.045);
      magG.rotation.set(0.14, 0, 0);
      magG.visible = true;
    },

    onMeleeStart() { /* pose is driven from st.melee in lateUpdate */ },
    onMeleeConnect(outcome = 'enemy') {
      if (outcome === 'enemy') {
        kickPos.nudge(-0.045 * 16, -0.034 * 16, -0.095 * 16);
        kickRot.nudge(-9 * DEG * 16, 7 * DEG * 16, 12 * DEG * 16);
        jolt.nudge(14);
      } else {
        kickPos.nudge(-0.025 * 16, -0.018 * 16, -0.045 * 16);
        kickRot.nudge(-5 * DEG * 16, 3 * DEG * 16, 6 * DEG * 16);
        jolt.nudge(7);
      }
    },
    onMeleeEnd() { /* pose falls out of st.melee */ },

    warmup() {
      flashCore.visible = true;
      flashCone.visible = true;
      ctx.renderer.compile(scene, camera);
      flashCore.visible = false;
      flashCone.visible = false;
    },

    update(dt, state) {
      st = state;
      sprintT = clamp01(sprintT + (state.sprintT > 0.5 ? dt / 0.18 : -dt / 0.13));
      kickPos.update(dt);
      kickRot.update(dt);
      angLag.update(dt);
      linLag.update(dt);
      landDip.update(dt);
      jolt.update(dt);
      boltS.update(dt);
      boltAnim += dt;
      flashAge += dt;

      // look lag targets from camera angular velocity
      const cam = ctx.systems.camera;
      const dyaw = (cam.yaw - prevYaw), dpitch = (cam.pitch - prevPitch);
      prevYaw = cam.yaw; prevPitch = cam.pitch;
      const lagScale = lerp(1, 0.30, st.adsT) * lerp(1, 1.15, sprintT);
      const yawRate = dyaw / Math.max(dt, 1e-4) / DEG;   // deg/s
      const pitchRate = dpitch / Math.max(dt, 1e-4) / DEG;
      angLag.y.target = clamp(-yawRate * 0.0125, -6.5, 6.5) * DEG * lagScale;
      angLag.x.target = clamp(pitchRate * 0.0125, -6.5, 6.5) * DEG * lagScale;
      angLag.z.target = angLag.y.target * 0.35;
      const p = ctx.systems.player;
      const vFwd = -(p.vel.x * -Math.sin(cam.yaw) + p.vel.z * -Math.cos(cam.yaw));
      const vRight = p.vel.x * Math.cos(cam.yaw) - p.vel.z * Math.sin(cam.yaw);
      linLag.x.target = clamp(-vRight * 0.006, -0.035, 0.035) * lagScale;
      linLag.y.target = clamp(-p.vel.y * 0.006, -0.035, 0.035) * lagScale;
      linLag.z.target = clamp(vFwd * 0.006, -0.035, 0.035) * lagScale;

      // viewmodel FOV 48 -> 44
      const vfov = lerp(48, 44, ease.inOutQuad(st.adsT));
      if (camera.fov !== vfov) { camera.fov = vfov; camera.updateProjectionMatrix(); }

      // flash lights + sprites
      if (flashAge >= 0 && flashAge < 0.06) {
        const t = flashAge;
        flashCore.visible = t < 0.034;
        flashCone.visible = t < 0.050;
        flashUniforms.uLife.value = clamp01(t / 0.034);
        const boostScale = lerp(1, 1.22, flashBoost);
        coneMat.opacity = (1 - clamp01(t / 0.050)) * 0.55 * lerp(1, 1.22, flashBoost);
        flashCone.scale.setScalar((1 + (t / 0.050) * 0.35) * boostScale);
        const env = Math.exp(-t / 0.018);
        viewFlash.intensity = 2.6 * env * lerp(1, 0.55, flashAds) * lerp(1, 1.30, flashBoost);
        worldFlash.intensity = 46 * env * lerp(1, 1.30, flashBoost);
        const scale = lerp(1, 0.55, flashAds) * boostScale;
        flashCore.scale.setScalar(scale);
        flashCore.position.copy(MUZZLE).z -= flashAds * 0.06;
      } else {
        flashCore.visible = false;
        flashCone.visible = false;
        viewFlash.intensity = 0;
        worldFlash.intensity = 0;
      }
      viewFlash.position.copy(MUZZLE).z -= 0.07;
      // world flash light rides the camera muzzle estimate
      worldFlash.position.set(
        p.pos.x - Math.sin(cam.yaw) * 0.6,
        p.eyeY - 0.1,
        p.pos.z - Math.cos(cam.yaw) * 0.6,
      );

      // A charged magazine reads on the gun itself, not only in HUD chrome.
      const chargePulse = st.boostedRounds > 0 ? 1.90 + Math.sin(ctx.time * 9) * 0.18 : 0.90;
      accent.emissiveIntensity = chargePulse;
      magWin.opacity = st.boostedRounds > 0 ? 0.46 : 0.32;
      magWin.color.setHex(st.boostedRounds > 0 ? 0x8cefff : 0x9fb8c8);

      // bolt: 32 mm back in 26 ms, forward by 62 ms with 1 mm overshoot;
      // rests ~20 ms between rounds — the stillness is the cadence.
      let boltZ = 0;
      if (st.ammo === 0 && !st.reloading) boltZ = 0.032;
      else if (boltAnim < 0.026) boltZ = 0.032 * ease.outQuad(boltAnim / 0.026);
      else if (boltAnim < 0.062) boltZ = 0.032 * (1 - ease.inQuad((boltAnim - 0.026) / 0.036)) - 0.001;
      bolt.position.z = -0.03 + boltZ + boltS.value * 0.004;

      // mag follower rises as the mag empties
      follower.position.y = -0.005 - (1 - st.ammo / st.mag) * 0.092;

      // reload mag choreography
      if (magDropT >= 0) {
        magDropT += dt;
        const d = magDropT;
        magG.position.y = -0.075 - d * 0.40 - 5.5 * d * d * 0.5;
        magG.rotation.z = d * 2.2;
        if (magG.position.y < -0.5) magG.visible = false;
      } else if (magRiseT >= 0) {
        magRiseT += dt;
        magG.visible = true;
        const r = clamp01(magRiseT / 0.38);
        magG.position.y = lerp(-0.42, -0.075, ease.outCubic(r));
        magG.position.x = lerp(-0.06, 0, ease.outCubic(r));
        magG.rotation.z = lerp(0.55, 0, ease.outCubic(r));
        if (r >= 1) magRiseT = -1;
      }

      // brass scheduling + integration (world scene)
      for (let i = pendingBrass.length - 1; i >= 0; i--) {
        pendingBrass[i] -= dt;
        if (pendingBrass[i] <= 0) {
          pendingBrass.splice(i, 1);
          const b = brassState[brassCursor];
          brassCursor = (brassCursor + 1) % BRASS_N;
          b.live = true; b.age = 0; b.bounces = 0;
          const right = _v.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
          b.pos.set(p.pos.x, p.eyeY - 0.06, p.pos.z)
            .addScaledVector(right, 0.16)
            .addScaledVector(new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), 0.28);
          const j = () => 1 + (brassRng.next() * 2 - 1) * 0.12;
          b.vel.copy(right).multiplyScalar(2.60 * j());
          b.vel.y = 1.50 * j();
          b.vel.addScaledVector(new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), -0.35 * j());
          b.vel.add(p.vel);                    // NOT optional
          b.rot.set(brassRng.next() * TAU, brassRng.next() * TAU, 0);
          b.spin.set(6 + brassRng.next() * 10, 18 + brassRng.next() * 10, 4);
        }
      }
      const world = ctx.systems.world;
      for (let i = 0; i < BRASS_N; i++) {
        const b = brassState[i];
        if (!b.live) { _m.makeScale(0, 0, 0); brass.setMatrixAt(i, _m); continue; }
        b.age += dt;
        if (b.age > 4.0) { b.live = false; continue; }
        b.vel.y -= 22 * dt;
        b.vel.multiplyScalar(Math.exp(-0.12 * dt));
        b.pos.addScaledVector(b.vel, dt);
        const g = world.terrainHeight(b.pos.x, b.pos.z);
        if (b.pos.y < g + 0.01 && b.vel.y < 0 && b.bounces < 2) {
          b.pos.y = g + 0.01;
          b.vel.y *= -0.32;
          b.vel.x *= 0.55; b.vel.z *= 0.55;
          b.spin.multiplyScalar(0.45);
          b.bounces++;
          if (b.bounces === 1) ctx.bus.emit('brass:tink', { pos: b.pos });
        } else if (b.pos.y < g) { b.pos.y = g; b.vel.set(0, 0, 0); }
        b.rot.x += b.spin.x * dt;
        b.rot.y += b.spin.y * dt;
        const sc = b.age > 3.4 ? 1 - (b.age - 3.4) / 0.6 : 1;
        _m.compose(b.pos, _q.setFromEuler(b.rot), _v.set(sc, sc, sc));
        brass.setMatrixAt(i, _m);
      }
      brass.instanceMatrix.needsUpdate = true;
    },

    /** compose the pose stack after the camera is final. */
    lateUpdate(dt) {
      const cam = ctx.systems.camera;
      const p = ctx.systems.player;
      const a = ease.outQuint(st.adsT);       // pose snaps; FOV eases separately
      const t = ctx.time;

      // base: rest -> ADS
      _v.copy(REST.pos).lerp(ADS_POS, a);
      _e.set(
        REST.rot.x * (1 - a), REST.rot.y * (1 - a), REST.rot.z * (1 - a),
      );

      // sprint cant
      const sp = ease.inOutQuad(sprintT) * (1 - a);
      _v.x += SPRINT_POSE.pos.x * sp;
      _v.y += SPRINT_POSE.pos.y * sp;
      _v.z += SPRINT_POSE.pos.z * sp;
      _e.x += SPRINT_POSE.rot.x * sp;
      _e.y += SPRINT_POSE.rot.y * sp;
      _e.z += SPRINT_POSE.rot.z * sp;

      // Shoulder-led buttstroke across the frame. The rifle seats high and
      // close for 200 ms, holds for the authored 60 ms anticipation, then the
      // shoulder drops as the stock crosses centre at the contact beat. The
      // broad follow-through and slower return make contact/recovery distinct.
      if (st.melee) {
        const M = st.meleeSpec;
        let swing = 0, brace = 0, drive = 0;
        if (st.melee.phase === 'windup') {
          const u = clamp01(st.melee.t / M.travel);      // holds at 1 for 60 ms
          swing = -ease.outCubic(u);
          brace = ease.outCubic(u);
        } else if (st.melee.phase === 'active') {
          const u = clamp01(st.melee.t / M.active);
          const contactU = M.contact / M.active;
          if (u < contactU) swing = lerp(-1, 0.12, ease.inCubic(u / contactU));
          else swing = lerp(0.12, 1.25, ease.outCubic((u - contactU) / (1 - contactU)));
          brace = 1 - u * 0.72;
          drive = Math.sin(Math.PI * u);                 // peaks exactly at contact
        } else {
          const u = clamp01(st.melee.t / M.recover);
          const settle = 1 - ease.outCubic(u);
          swing = 1.25 * settle;
          brace = 0.28 * settle;
        }
        _v.x += swing * 0.195;
        _v.y += brace * 0.070 - Math.abs(swing) * 0.022 - drive * 0.040;
        _v.z += brace * 0.072 - drive * 0.055;
        _e.y += -swing * 38 * DEG;
        _e.z += swing * 33 * DEG + brace * 18 * DEG;
        _e.x += brace * 19 * DEG - drive * 12 * DEG;
      }

      // reload body track
      if (st.reloading) {
        const rl = st.reloading;
        const w = Math.sin(Math.PI * clamp01(rl.t / rl.dur));
        _v.y += -0.045 * w;
        _e.x += 9 * DEG * w;
        _e.y += 22 * DEG * w;
        _e.z += -16 * DEG * w;
      }

      // sway: two-octave non-harmonic noise per axis
      const swayScale = lerp(1, 0.22, st.adsT) * lerp(1, 1.15, sprintT);
      _e.y += sway2(t, 0.19, 0.47, 0.68, 0.32, 11) * 0.55 * DEG * swayScale;
      _e.x += sway2(t, 0.17, 0.43, 0.68, 0.32, 23) * 0.42 * DEG * swayScale;
      _e.z += sway2(t, 0.13, 0.37, 0.72, 0.28, 37) * 0.30 * DEG * swayScale;
      _v.x += sway2(t, 0.13, 0.31, 0.70, 0.30, 41) * 0.0022 * swayScale;
      _v.y += sway2(t, 0.11, 0.29, 0.70, 0.30, 53) * 0.0018 * swayScale;
      _v.z += sway2(t, 0.09, 0.23, 0.75, 0.25, 67) * 0.0010 * swayScale;
      // ADS breath: 6.6 breaths/min
      _e.x += Math.sin(t * TAU * 0.11) * 0.09 * DEG * st.adsT;

      // bob: same stride clock, 0.55x of camera amplitude, lagged by springs
      const bph = p.bobPhase * 2;
      const ref = p.sprinting ? 6.6 : p.crouched ? 2.1 : 4.35;
      const amp = Math.pow(clamp(p.speed / ref, 0, 1.6), 0.85)
        * (p.grounded && !p.sliding ? 1 : 0) * lerp(1, 0.25, st.adsT) * 0.55;
      _v.y += -0.021 * Math.cos(2 * bph) * amp;
      _v.x += 0.014 * Math.sin(bph) * amp;

      // springs: look lag, velocity lag, kick, land dip, jolt
      _e.x += angLag.x.value + kickRot.x.value / 16;
      _e.y += angLag.y.value + kickRot.y.value / 16;
      _e.z += angLag.z.value + kickRot.z.value / 16;
      _v.x += linLag.x.value + kickPos.x.value / 16;
      _v.y += linLag.y.value + kickPos.y.value / 16 + landDip.value * 0.055 / 0.42 * 0.13 + jolt.value * -0.003;
      _v.z += linLag.z.value + kickPos.z.value / 16;
      _e.x += landDip.value * -1.4 * DEG + jolt.value * 0.6 * DEG;

      // root locked to camera orientation: rotate-then-place
      root.position.set(0, 0, 0);
      root.quaternion.identity();
      gun.position.copy(_v);
      gun.rotation.copy(_e);
    },

    render() {
      ctx.renderer.clearDepth();
      ctx.renderer.render(scene, camera);
    },

    /** projected NDC offset of the sight dot from screen centre (test probe). */
    sightScreenOffset() {
      const v = new THREE.Vector3();
      dot.getWorldPosition(v);
      v.project(camera);
      return { x: v.x, y: v.y };
    },

    debugState() {
      return {
        magPosition: { x: magG.position.x, y: magG.position.y, z: magG.position.z },
        magRotation: { x: magG.rotation.x, y: magG.rotation.y, z: magG.rotation.z },
        boostedRounds: st.boostedRounds || 0,
        flashBoost,
        visualBatches: gun.userData.visualBatches,
      };
    },
  };
}
