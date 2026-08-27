// The director — Cinderbloom's wave contract run as a horde loop:
// CONTACT (one bearing, 34–66° off the player's facing) → SQUEEZE (artillery
// + a second bearing 110–155° away) → ANCHOR (1.4 s rumble, then the warden)
// → SILENCE (7 designed seconds of nothing). Queue = duration, cap =
// pressure: kills pull the next body. Waves ramp by BODIES ONLY — never
// speed, never telegraphs (that law is why fast enemies stay fair). Mercy:
// −7% bodies per death past the first, floor −25%; the wave index NEVER
// advances on a death.
//
// Spawn laws (hard): ≥14 m from the player, outside the 90° view cone,
// ≥600 ms between spawn events, inside the arena, off the structure core.
// Blocked orders defer 0.35 s and retry forever — a jammed arena runs waves
// late, never short.

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp } from '../engine/math.js';
import { mergeBufferGeometries } from '../gfx/geometry.js';
import { chamferedBox, taperedPanel } from '../gfx/shapes.js';
import { createMetalSurface } from '../gfx/surfaces.js';

const FINAL_WAVE = 10;
const ALIVE_CAP = 16;
const MIN_SPAWN_DIST = 14, VIEW_CONE = Math.PI / 4, SPAWN_GAP = 0.6;
const BANDS = { thrall: [16, 28], chorister: [24, 38], warden: [30, 44] };
const SPAWN_RADII = { thrall: 0.42, chorister: 0.5, warden: 0.85 };
const SILENCE_S = 7.0;
const CRASH_COUNT = 2;
const CRASH_AMMO = 45, CRASH_HEAL = 20;
const CRASH_WARNING_S = 0.80;
const CRASH_FALL_S = 1.35;
const CRASH_OPEN_S = 0.72;
const CRASH_REWARD_S = 1.18;
const CRASH_COLLECT_S = 0.52;
const CRASH_REWARD_MOTES = 8;

export function create(ctx) {
  const rng = ctx.rng.fork('director');
  let wave = 0, attempt = 1;
  let phase = 'idle';            // idle | contact | squeeze | anchor | cleanup | silence | won
  let phaseT = 0, waveT = 0;
  let queue = [];                // [{species, at, bearing}]
  let sinceSpawn = 99;
  let rumbleSent = false;
  let running = false;
  let underAttackT = 0;

  /* ---------------- dry-ammo emergency pod ---------------- */
  const podGroup = new THREE.Group();
  const podMat = new THREE.MeshStandardMaterial({ color: 0x223244, roughness: 0.4, metalness: 0.6, emissive: 0x35dfff, emissiveIntensity: 0.8 });
  const pod = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), podMat);
  pod.position.y = 0.6;
  pod.castShadow = true;
  podGroup.add(pod);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.4, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 20;
  podGroup.add(beam);
  podGroup.visible = false;
  ctx.scene.add(podGroup);
  let podLive = false, podT = 0;

  function dropEmergencyPod() {
    const p = ctx.systems.player;
    const a = Math.atan2(p.pos.z, p.pos.x);
    const r = 20;
    podGroup.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    podGroup.position.y = ctx.systems.world.groundAt(podGroup.position.x, podGroup.position.z, 100);
    podGroup.visible = true;
    podLive = true;
    podT = 0;
    ctx.bus.emit('supply:drop', { pos: podGroup.position, kind: 'emergency' });
  }

  /* ---------------- outer satellite crash salvages ----------------
   * Two boot-built, pooled wrecks split the old 90-ammo/40-heal wave supply.
   * They descend visibly, hit through the existing pooled impact language,
   * and remain for the full wave. No runtime geometry or material creation. */
  const salvageSurface = createMetalSurface(0x5a7e11);
  const salvageDark = new THREE.MeshStandardMaterial({
    // A blue-grey aircraft alloy, not near-black: the wreck must retain its
    // planes against both the night sky and the blue lunar ground.
    color: 0x64798d, roughness: 0.48, metalness: 0.62,
    emissive: 0x0a1722, emissiveIntensity: 0.34,
    map: salvageSurface.color,
    bumpMap: salvageSurface.bump,
    bumpScale: 0.045,
    roughnessMap: salvageSurface.roughness,
    envMapIntensity: 1.12,
  });
  const salvageCyan = new THREE.MeshStandardMaterial({
    color: 0x173446, roughness: 0.32, metalness: 0.62,
    emissive: 0x35dfff, emissiveIntensity: 1.15,
    // Use the hull's already-compiled mapped physical variant. Emissive still
    // carries the cyan signal, while this avoids a 61st shader program.
    map: salvageSurface.color,
    bumpMap: salvageSurface.bump,
    bumpScale: 0.018,
    roughnessMap: salvageSurface.roughness,
    envMapIntensity: 1.12,
  });
  // One fabricated hull draw per wreck: chamfered avionics bus, mismatched
  // broken panel wings, skids, radiator ribs, and a physical antenna yoke.
  const hullParts = [];
  const hullMatrix = new THREE.Matrix4();
  const hullQ = new THREE.Quaternion();
  const hullE = new THREE.Euler();
  const hullP = new THREE.Vector3();
  const hullS = new THREE.Vector3();
  const hullPart = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    hullMatrix.compose(hullP.set(x, y, z), hullQ.setFromEuler(hullE.set(rx, ry, rz)), hullS.set(sx, sy, sz));
    geo.applyMatrix4(hullMatrix);
    hullParts.push(geo);
  };
  hullPart(chamferedBox(0.94, 0.50, 0.66, 0.09, 0.028), 0, 0.39, 0);
  hullPart(taperedPanel(1.10, 0.48, 0.055, 0.08), -1.00, 0.40, 0, Math.PI / 2, 0, -0.08);
  hullPart(taperedPanel(0.64, 0.46, 0.055, 0.16), 0.82, 0.42, 0.06, Math.PI / 2, 0.12, 0.16);
  hullPart(taperedPanel(0.42, 0.38, 0.05, 0.20), 1.31, 0.31, -0.09, Math.PI / 2, -0.18, -0.32);
  for (const side of [-1, 1]) {
    hullPart(new THREE.CapsuleGeometry(0.055, 0.72, 3, 6), side * 0.29, 0.12, 0.27, 0, 0, Math.PI / 2);
    for (let j = 0; j < 3; j++) {
      hullPart(new THREE.BoxGeometry(0.035, 0.30, 0.70), side * (0.29 + j * 0.07), 0.40, 0, 0, 0, 0);
    }
  }
  hullPart(new THREE.CylinderGeometry(0.035, 0.055, 0.72, 8), 0, 0.96, 0.08, 0, 0, -0.18);
  hullPart(new THREE.TorusGeometry(0.23, 0.035, 6, 18), 0.03, 1.20, 0.09, Math.PI / 2, 0, -0.18);
  hullPart(new THREE.CylinderGeometry(0.11, 0.15, 0.08, 10), 0.03, 1.20, 0.09, Math.PI / 2, 0, -0.18);
  const hullGeo = mergeBufferGeometries(hullParts);
  for (const geo of hullParts) geo.dispose();
  // Three luminous service strips share the beacon material/program. They
  // trace the bus and broken wing without adding another shader variant.
  const accentParts = [];
  const accentPart = (geo, x, y, z, ry = 0, rz = 0) => {
    hullMatrix.compose(hullP.set(x, y, z), hullQ.setFromEuler(hullE.set(0, ry, rz)), hullS.set(1, 1, 1));
    geo.applyMatrix4(hullMatrix);
    accentParts.push(geo);
  };
  accentPart(new THREE.BoxGeometry(0.44, 0.022, 0.052), 0, 0.66, -0.18);
  accentPart(new THREE.BoxGeometry(0.30, 0.020, 0.045), -0.96, 0.44, -0.20, 0, -0.08);
  accentPart(new THREE.BoxGeometry(0.22, 0.020, 0.045), 0.80, 0.47, -0.15, 0.12, 0.16);
  const accentGeo = mergeBufferGeometries(accentParts);
  for (const geo of accentParts) geo.dispose();
  const beaconGeo = new THREE.OctahedronGeometry(0.12, 0);
  // A two-layer world-aligned re-entry plume. The old cone inherited the
  // wreck's tumble and read as a rigid cyan blade; this plume follows the
  // opposite of flight velocity while the hull is free to spin inside it.
  const plumeGeometry = (segments, sides) => {
    const parts = segments.map(([top, bottom, height, centerY]) => {
      const geo = new THREE.CylinderGeometry(top, bottom, height, sides, 1, true);
      geo.translate(0, centerY, 0);
      return geo;
    });
    const merged = mergeBufferGeometries(parts);
    for (const geo of parts) geo.dispose();
    return merged;
  };
  // Narrow at the hot attachment, bloom through turbulent gas, then taper to
  // nothing. Avoiding a wide end-cap is what keeps the trail from reading as
  // a laser/cone primitive when viewed along its axis.
  const plumeOuterGeo = plumeGeometry([
    [0.30, 0.04, 1.35, 0.675],
    [0.018, 0.30, 3.00, 2.85],
  ], 10);
  const plumeCoreGeo = plumeGeometry([
    [0.11, 0.018, 0.85, 0.425],
    [0.012, 0.11, 1.85, 1.775],
  ], 8);
  const plumeOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff6844, transparent: true, opacity: 0.115,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    side: THREE.DoubleSide,
  });
  const plumeCoreMat = new THREE.MeshBasicMaterial({
    color: 0xc8f9ff, transparent: true, opacity: 0.30,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    side: THREE.DoubleSide,
  });
  // The warning, hatch, locator, and reward language is entirely boot-built.
  // It reuses the two existing material programs so a crash can get louder
  // without compiling anything new when the wave is already under pressure.
  const hatchGeo = taperedPanel(0.48, 0.50, 0.045, 0.14);
  const signalParts = [
    new THREE.RingGeometry(0.30, 1.82, 28),
    new THREE.TorusGeometry(1.05, 0.050, 5, 28),
    new THREE.TorusGeometry(1.78, 0.030, 5, 32),
  ];
  for (const geo of signalParts) {
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.035, 0);
  }
  signalParts.push(new THREE.BoxGeometry(3.52, 0.018, 0.035));
  signalParts.push(new THREE.BoxGeometry(0.035, 0.018, 3.52));
  const signalGroundGeo = mergeBufferGeometries(signalParts);
  for (const geo of signalParts) geo.dispose();
  const signalBeamGeo = new THREE.CylinderGeometry(0.045, 0.46, 1, 12, 1, true);
  const signalCoreGeo = new THREE.CylinderGeometry(0.014, 0.12, 1, 10, 1, true);
  const impactRingGeo = new THREE.TorusGeometry(0.78, 0.058, 6, 32);
  impactRingGeo.rotateX(-Math.PI / 2);
  const rewardAmmoGeo = new THREE.BoxGeometry(0.075, 0.25, 0.075);
  const rewardHealGeo = new THREE.OctahedronGeometry(0.13, 0);
  const rewardAmmoMat = plumeCoreMat.clone();
  rewardAmmoMat.color.setHex(0x74f8ff); rewardAmmoMat.opacity = 0.88;
  const rewardHealMat = plumeCoreMat.clone();
  rewardHealMat.color.setHex(0xdceeff); rewardHealMat.opacity = 0.90;
  const crashes = [];
  for (let i = 0; i < CRASH_COUNT; i++) {
    const group = new THREE.Group();
    group.visible = false;
    const hull = new THREE.Mesh(hullGeo, salvageDark);
    hull.castShadow = true; hull.receiveShadow = true; group.add(hull);
    const accents = new THREE.Mesh(accentGeo, salvageCyan);
    group.add(accents);
    const beacon = new THREE.Mesh(beaconGeo, salvageCyan);
    beacon.position.set(0.08, 1.34, 0.08); group.add(beacon);
    // Hinged service petals sit flush over the avionics bay in flight, then
    // physically unfold after collection. The reward core is hidden under
    // them until the mechanism has actually opened.
    const hatchL = new THREE.Group();
    hatchL.position.set(-0.23, 0.73, -0.02);
    const hatchLPanel = new THREE.Mesh(hatchGeo, salvageDark);
    hatchLPanel.position.x = -0.23; hatchLPanel.rotation.x = -Math.PI / 2;
    hatchL.add(hatchLPanel); group.add(hatchL);
    const hatchR = new THREE.Group();
    hatchR.position.set(0.23, 0.73, -0.02);
    const hatchRPanel = new THREE.Mesh(hatchGeo, salvageDark);
    hatchRPanel.position.x = 0.23; hatchRPanel.rotation.x = -Math.PI / 2;
    hatchR.add(hatchRPanel); group.add(hatchR);
    const core = new THREE.Mesh(beaconGeo, salvageCyan);
    core.position.set(0, 0.76, -0.02); core.scale.setScalar(0.08);
    group.add(core);
    const trail = new THREE.Group();
    const plumeOuter = new THREE.Mesh(plumeOuterGeo, plumeOuterMat);
    const plumeCore = new THREE.Mesh(plumeCoreGeo, plumeCoreMat);
    trail.add(plumeOuter, plumeCore);
    trail.visible = false;
    // A ground wash plus a tapered sky column announces the certified site
    // before descent, then contracts into the wreck's persistent locator.
    const signal = new THREE.Group();
    const signalMat = plumeCoreMat.clone();
    signalMat.color.setHex(0x74f8ff); signalMat.opacity = 0.42;
    const signalGroundMat = signalMat.clone();
    signalGroundMat.opacity = 0.21;
    const signalGround = new THREE.Mesh(signalGroundGeo, signalGroundMat);
    const signalBeam = new THREE.Mesh(signalBeamGeo, signalMat);
    const signalCoreMat = signalMat.clone();
    signalCoreMat.opacity = 0.62;
    const signalCore = new THREE.Mesh(signalCoreGeo, signalCoreMat);
    const signalRingMat = signalMat.clone();
    signalRingMat.opacity = 0.28;
    const signalSkyRings = [];
    for (let j = 0; j < 4; j++) {
      const ring = new THREE.Mesh(impactRingGeo, signalRingMat);
      ring.visible = false;
      signalSkyRings.push(ring);
      signal.add(ring);
    }
    signal.add(signalGround, signalBeam, signalCore);
    const impactMat = plumeOuterMat.clone();
    impactMat.color.setHex(0xff8a55); impactMat.opacity = 0.72;
    const impactRing = new THREE.Mesh(impactRingGeo, impactMat);
    impactRing.visible = false; impactRing.position.y = 0.08;
    signal.add(impactRing);
    signal.visible = false;
    // Five cyan cartridge-slivers and three ice-white vitality diamonds stream
    // from the revealed bay to the moving player. They are representative
    // shapes; the authored grant remains exactly 45 ammo + 20 health.
    const rewardGroup = new THREE.Group();
    const rewardMotes = [];
    for (let j = 0; j < CRASH_REWARD_MOTES; j++) {
      const ammoMote = j < 5;
      const mesh = new THREE.Mesh(ammoMote ? rewardAmmoGeo : rewardHealGeo, ammoMote ? rewardAmmoMat : rewardHealMat);
      mesh.visible = false;
      rewardGroup.add(mesh);
      const a = j * 2.399963 + i * 0.73;
      rewardMotes.push({
        mesh, delay: j * 0.055,
        sourceX: ((j % 3) - 1) * 0.16,
        sourceY: 0.90 + (j % 2) * 0.11,
        sourceZ: (j % 2 ? -1 : 1) * 0.12,
        sideX: Math.cos(a), sideZ: Math.sin(a),
        arc: 0.42 + (j % 3) * 0.13,
        spin: (j % 2 ? -1 : 1) * (4.0 + j * 0.31),
      });
    }
    rewardGroup.visible = false;
    ctx.scene.add(trail);
    ctx.scene.add(signal);
    ctx.scene.add(rewardGroup);
    ctx.scene.add(group);
    crashes.push({
      slot: i, group, beacon, hatchL, hatchR, core,
      trail, signal, signalMat, signalGroundMat, signalGround, signalBeam,
      signalCore, signalCoreMat, signalSkyRings, signalRingMat, impactRing, impactMat,
      rewardGroup, rewardMotes,
      state: 'inactive', age: 0, stateT: 0,
      site: null, siteId: -1, startX: 0, startZ: 0, startY: 0,
      baseY: 0, delay: i * 0.9, spin: i ? -1 : 1,
      ammoGranted: 0, healGranted: 0,
    });
  }
  const eligibleCrashSites = ctx.systems.world.spawnPoints.outer
    .map((site, siteId) => ({ ...site, siteId }))
    .filter(site => ctx.systems.world.isCrashSiteAccessible(site));
  let previousCrashA = -1, previousCrashB = -1;
  const _up = new THREE.Vector3(0, 1, 0);
  const _trailDir = new THREE.Vector3();

  function setSignalHeight(c, height, opacity, groundScale, beamOpacityScale = 1) {
    const pulse = 1 + Math.sin(ctx.time * 5.4 + c.slot * 1.7) * 0.075;
    const preImpact = c.state === 'warning';
    const descending = c.state === 'falling';
    c.signal.visible = true;
    // The broad cone is only an atmospheric halo; a narrow core carries the
    // actual sky-to-ground read. This prevents the old opaque cyan slab while
    // retaining a locator that can be picked out across the whole arena.
    const haloOpacity = preImpact ? 0.30 : descending ? 0.42 : beamOpacityScale;
    c.signalMat.opacity = opacity * haloOpacity;
    c.signalGroundMat.opacity = opacity * 0.52;
    c.signalBeam.position.y = height * 0.5;
    c.signalBeam.scale.set(pulse, height, pulse);
    // A razor core and four descending scan rings turn the warning into a
    // staged orbital lock rather than a single primitive cone. They share the
    // existing additive shader and disappear after descent, so landed wreck
    // machinery remains readable and the effect adds no runtime compilation.
    c.signalCore.visible = preImpact || descending;
    c.signalCoreMat.opacity = opacity * (preImpact ? 1.34 : 0.82);
    c.signalCore.position.y = height * 0.5;
    c.signalCore.scale.set(pulse * 0.34, height, pulse * 0.34);
    c.signalRingMat.opacity = opacity * 0.66;
    for (let j = 0; j < c.signalSkyRings.length; j++) {
      const ring = c.signalSkyRings[j];
      ring.visible = preImpact;
      if (!preImpact) continue;
      const phase = 1 - ((ctx.time * 0.58 + j / c.signalSkyRings.length + c.slot * 0.17) % 1);
      const fade = Math.sin(phase * Math.PI);
      const ringScale = lerp(1.45, 0.44, phase) * (0.48 + fade * 0.52) * pulse;
      ring.position.y = height * (0.08 + phase * 0.86);
      ring.scale.setScalar(ringScale);
    }
    c.signalGround.scale.set(groundScale * pulse, 1, groundScale * pulse);
  }

  function resetCrashVisuals(c) {
    c.group.visible = false;
    c.group.scale.set(1, 1, 1);
    c.hatchL.rotation.set(0, 0, 0);
    c.hatchR.rotation.set(0, 0, 0);
    c.core.position.set(0, 0.76, -0.02);
    c.core.scale.setScalar(0.08);
    c.trail.visible = false;
    c.signal.visible = false;
    c.signal.scale.set(1, 1, 1);
    c.signalGround.rotation.set(0, 0, 0);
    c.signalGround.scale.set(1, 1, 1);
    c.signalBeam.scale.set(1, 1, 1);
    c.signalCore.visible = false;
    c.signalCore.scale.set(1, 1, 1);
    for (const ring of c.signalSkyRings) {
      ring.visible = false;
      ring.scale.set(1, 1, 1);
    }
    c.impactRing.visible = false;
    c.impactRing.scale.set(1, 1, 1);
    c.rewardGroup.visible = false;
    for (const mote of c.rewardMotes) {
      mote.mesh.visible = false;
      mote.mesh.scale.set(1, 1, 1);
    }
    c.ammoGranted = 0;
    c.healGranted = 0;
  }

  function siteFarEnough(site, p) {
    return Math.hypot(site.x - p.pos.x, site.z - p.pos.z) >= 18;
  }

  function separatedSites(a, b) {
    const al = Math.hypot(a.x, a.z) || 1, bl = Math.hypot(b.x, b.z) || 1;
    return (a.x * b.x + a.z * b.z) / (al * bl) <= 0; // >= 90 degrees
  }

  function armCrash(slot, site) {
    const r = Math.hypot(site.x, site.z) || 1;
    const tangentX = -site.z / r, tangentZ = site.x / r;
    resetCrashVisuals(slot);
    slot.site = site; slot.siteId = site.siteId;
    slot.state = 'waiting'; slot.age = -slot.delay; slot.stateT = 0;
    slot.startX = site.x + tangentX * 8;
    slot.startZ = site.z + tangentZ * 8;
    slot.startY = site.y + 24;
    slot.baseY = site.y + 0.16;
    slot.group.position.set(site.x, slot.baseY, site.z);
    slot.group.rotation.set(0, 0, 0);
    slot.signal.position.set(site.x, site.y + 0.035, site.z);
    ctx.bus.emit('supply:crash-scheduled', {
      wave, slot: slot.slot, siteId: site.siteId, pos: site,
      ammo: CRASH_AMMO, heal: CRASH_HEAL,
    });
  }

  function scheduleCrashes() {
    const p = ctx.systems.player;
    if (eligibleCrashSites.length < CRASH_COUNT) return;
    const start = Math.floor(rng.next() * eligibleCrashSites.length);
    let first = null, second = null;
    for (let pass = 0; pass < 2 && !first; pass++) {
      for (let i = 0; i < eligibleCrashSites.length; i++) {
        const site = eligibleCrashSites[(start + i) % eligibleCrashSites.length];
        if (pass === 0 && (site.siteId === previousCrashA || site.siteId === previousCrashB)) continue;
        if (!siteFarEnough(site, p)) continue;
        first = site; break;
      }
    }
    if (!first) first = eligibleCrashSites[start];
    for (let pass = 0; pass < 2 && !second; pass++) {
      for (let i = 1; i <= eligibleCrashSites.length; i++) {
        const site = eligibleCrashSites[(start + i) % eligibleCrashSites.length];
        if (site === first || !separatedSites(first, site) || !siteFarEnough(site, p)) continue;
        if (pass === 0 && (site.siteId === previousCrashA || site.siteId === previousCrashB)) continue;
        second = site; break;
      }
    }
    if (!second) second = eligibleCrashSites.find(site => site !== first && separatedSites(first, site));
    if (!second) return;
    previousCrashA = first.siteId; previousCrashB = second.siteId;
    armCrash(crashes[0], first);
    armCrash(crashes[1], second);
  }

  function updateCrashes(dt, p) {
    for (const c of crashes) {
      if (c.state === 'inactive' || c.state === 'spent' || !c.site) continue;
      c.age += dt;
      if (c.state === 'waiting') {
        if (c.age < 0) continue;
        c.state = 'warning';
        c.stateT = 0;
        setSignalHeight(c, 30, 0.46, 1);
        ctx.bus.emit('supply:crash-warning', {
          pos: c.signal.position, kind: 'satellite', wave,
          slot: c.slot, siteId: c.siteId,
        });
      }
      c.stateT += dt;
      if (c.state === 'warning') {
        const t = clamp01(c.stateT / CRASH_WARNING_S);
        const gather = 1 - t * 0.18;
        setSignalHeight(c, lerp(34, 27, t), 0.42 + Math.sin(t * Math.PI) * 0.14, gather);
        c.signalGround.rotation.y += dt * 0.72 * c.spin;
        if (t >= 1) {
          c.state = 'falling';
          c.stateT = 0;
          c.group.visible = true;
          c.trail.visible = true;
          ctx.bus.emit('supply:crash-descent', {
            pos: c.group.position, kind: 'satellite', wave,
            slot: c.slot, siteId: c.siteId,
          });
        }
        continue;
      }
      if (c.state === 'falling') {
        const t = clamp01(c.stateT / CRASH_FALL_S);
        const fall = (1 - t) * (1 - t);
        c.group.position.set(
          lerp(c.startX, c.site.x, t),
          c.baseY + fall * (c.startY - c.baseY),
          lerp(c.startZ, c.site.z, t),
        );
        c.group.rotation.set(t * 4.8 * c.spin, t * 7.2, t * 2.6 * c.spin);
        setSignalHeight(c, lerp(26, 8.5, t), lerp(0.42, 0.31, t), lerp(0.86, 1.08, t));
        c.signalGround.rotation.y += dt * (0.9 + t * 1.8) * c.spin;
        c.trail.visible = t < 0.9;
        if (c.trail.visible) {
          _trailDir.set(
            c.startX - c.site.x,
            2 * (1 - t) * (c.startY - c.baseY),
            c.startZ - c.site.z,
          ).normalize();
          c.trail.position.copy(c.group.position).addScaledVector(_trailDir, 0.12);
          c.trail.quaternion.setFromUnitVectors(_up, _trailDir);
          const plumePulse = 0.92 + Math.sin(ctx.time * 31 + c.slot * 2.7) * 0.08;
          c.trail.scale.set(plumePulse, 0.88 + (1 - t) * 0.18, plumePulse);
        }
        if (t >= 1) {
          c.state = 'live';
          c.stateT = 0;
          c.group.position.set(c.site.x, c.baseY, c.site.z);
          c.group.rotation.set(0.08 * c.spin, c.siteId * 0.71, 0.34 * c.spin);
          c.trail.visible = false;
          c.impactRing.visible = true;
          c.impactRing.scale.setScalar(0.68);
          c.impactMat.opacity = 0.72;
          ctx.systems.fx.impact('rock', c.group.position, _up, 1.8);
          ctx.systems.fx.impact('metal', c.group.position, _up, 1.05);
          const pd = Math.hypot(p.pos.x - c.site.x, p.pos.z - c.site.z);
          if (pd < 42) ctx.systems.camera.addTrauma(0.04 + (1 - pd / 42) * 0.10);
          ctx.bus.emit('supply:drop', {
            pos: c.group.position, kind: 'satellite', wave,
            slot: c.slot, siteId: c.siteId,
          });
          ctx.bus.emit('supply:crash-impact', {
            pos: c.group.position, kind: 'satellite', wave,
            slot: c.slot, siteId: c.siteId,
          });
        }
        continue;
      }
      if (c.state === 'live') {
        // After impact the ground rings remain the locator. The sky column
        // fades behind them so it frames the wreck instead of bleaching the
        // service petals and reward shapes at pickup distance.
        setSignalHeight(c, 8.5, 0.36, 1.06, 0.34);
        c.signalGround.rotation.y += dt * 0.58 * c.spin;
        c.beacon.rotation.y += dt * 1.8;
        c.beacon.scale.setScalar(1 + Math.sin(ctx.time * 4.2 + c.slot) * 0.12);
        if (c.stateT < 0.62) {
          const impactT = clamp01(c.stateT / 0.62);
          c.impactRing.visible = true;
          c.impactRing.scale.setScalar(0.68 + impactT * 5.8);
          c.impactMat.opacity = (1 - impactT) * 0.72;
        } else {
          c.impactRing.visible = false;
        }
        if (_v.set(p.pos.x - c.group.position.x, 0, p.pos.z - c.group.position.z).length() < 2.0) {
          c.state = 'opening';
          c.stateT = 0;
          const got = ctx.systems.weapons.addReserve(CRASH_AMMO);
          const before = p.hp;
          p.heal(CRASH_HEAL);
          c.ammoGranted = got;
          c.healGranted = p.hp - before;
          ctx.bus.emit('supply:crash-open', {
            pos: c.group.position, kind: 'satellite', wave,
            slot: c.slot, siteId: c.siteId,
          });
          ctx.bus.emit('supply:collect', {
            ammo: got, heal: p.hp - before, kind: 'satellite',
            awardAmmo: CRASH_AMMO, awardHeal: CRASH_HEAL,
            slot: c.slot, siteId: c.siteId,
          });
        }
        continue;
      }
      if (c.state === 'opening') {
        const t = clamp01(c.stateT / CRASH_OPEN_S);
        const open = 1 - (1 - t) * (1 - t) * (1 - t);
        c.hatchL.rotation.z = open * 1.14;
        c.hatchR.rotation.z = -open * 1.14;
        c.core.position.y = 0.76 + open * 0.48;
        c.core.scale.setScalar(0.08 + open * 1.34);
        c.core.rotation.y += dt * 3.8;
        c.beacon.rotation.y += dt * 2.6;
        setSignalHeight(c, 9.0 + open * 1.2, 0.34 + open * 0.04, 1.05 + open * 0.08, 0.30);
        c.signalGround.rotation.y += dt * (0.8 + open * 1.6) * c.spin;
        if (t >= 1) {
          c.state = 'rewarding';
          c.stateT = 0;
          c.rewardGroup.visible = true;
          for (const mote of c.rewardMotes) {
            mote.mesh.visible = false;
            mote.mesh.position.set(
              c.group.position.x + mote.sourceX,
              c.group.position.y + mote.sourceY,
              c.group.position.z + mote.sourceZ,
            );
          }
          ctx.bus.emit('supply:crash-reward', {
            pos: c.group.position, kind: 'satellite', wave,
            slot: c.slot, siteId: c.siteId,
            ammo: c.ammoGranted, heal: c.healGranted,
          });
        }
        continue;
      }
      if (c.state === 'rewarding') {
        c.hatchL.rotation.z = 1.14;
        c.hatchR.rotation.z = -1.14;
        c.core.rotation.y += dt * 5.2;
        c.core.scale.setScalar(1.36 + Math.sin(ctx.time * 11 + c.slot) * 0.15);
        setSignalHeight(c, 7.6, 0.30, 1.08, 0.28);
        c.signalGround.rotation.y += dt * 2.4 * c.spin;
        for (const mote of c.rewardMotes) {
          const t = clamp01((c.stateT - mote.delay) / 0.74);
          if (c.stateT < mote.delay || t >= 1) {
            mote.mesh.visible = false;
            continue;
          }
          const travel = 1 - (1 - t) * (1 - t) * (1 - t);
          const bow = Math.sin(t * Math.PI);
          mote.mesh.visible = true;
          mote.mesh.position.set(
            lerp(c.group.position.x + mote.sourceX, p.pos.x, travel) + mote.sideX * bow * 0.34,
            lerp(c.group.position.y + mote.sourceY, p.eyeY - 0.10, travel) + bow * mote.arc,
            lerp(c.group.position.z + mote.sourceZ, p.pos.z, travel) + mote.sideZ * bow * 0.34,
          );
          mote.mesh.rotation.x += dt * mote.spin;
          mote.mesh.rotation.y += dt * mote.spin * 1.27;
          const moteScale = 0.46 + bow * 0.72;
          mote.mesh.scale.setScalar(moteScale);
        }
        if (c.stateT >= CRASH_REWARD_S) {
          c.state = 'collected';
          c.stateT = 0;
          c.rewardGroup.visible = false;
        }
        continue;
      }
      if (c.state === 'collected') {
        const t = clamp01(c.stateT / CRASH_COLLECT_S);
        const settle = t * t;
        c.hatchL.rotation.z = lerp(1.14, 0.32, settle);
        c.hatchR.rotation.z = lerp(-1.14, -0.32, settle);
        c.core.scale.setScalar(lerp(1.34, 0.05, settle));
        setSignalHeight(c, lerp(9.5, 0.5, settle), (1 - settle) * 0.40, lerp(1.18, 1.72, t), 0.30);
        c.signalGround.rotation.y += dt * 3.2 * c.spin;
        if (t >= 1) {
          c.state = 'spent';
          c.group.visible = false;
          c.signal.visible = false;
          c.rewardGroup.visible = false;
          ctx.bus.emit('supply:crash-complete', {
            pos: c.group.position, kind: 'satellite', wave,
            slot: c.slot, siteId: c.siteId,
          });
        }
      }
    }
  }

  /* ---------------- wave building ---------------- */
  function bodies(base) {
    const ramp = 1 + 0.18 * (wave - 1);
    const mercy = 1 - clamp((attempt - 1) * 0.07, 0, 0.25);
    return Math.max(1, Math.round(base * ramp * mercy));
  }

  /**
   * The player's facing as a bearing in the SAME frame the spawn ring uses
   * (x = cos a, z = sin a), i.e. atan2(dz, dx). Forward is
   * (-sin yaw, 0, -cos yaw). Mixing atan2(x,z) here with atan2(z,x) at the
   * comparison site silently rotates the whole view-cone law into nonsense.
   */
  function playerBearing() {
    const cam = ctx.systems.camera;
    return Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw));
  }

  function enqueue(species, count, bearing, atBase, spacing) {
    for (let i = 0; i < count; i++) {
      queue.push({
        species,
        at: waveT + atBase + i * (spacing + rng.next() * 0.4),
        bearing: bearing + (rng.next() - 0.5) * 0.5,
      });
    }
  }

  function buildWave() {
    queue.length = 0;
    const facing = playerBearing();
    // CONTACT: one bearing, deliberately 34–66° OFF the facing axis
    const side = rng.sign();
    const contactBearing = facing + side * (0.6 + rng.next() * 0.55);
    enqueue('thrall', bodies(3), contactBearing, 0.5, 0.9);
    // SQUEEZE at +8 s: artillery + second bearing 110–155° away
    const squeezeBearing = contactBearing + rng.sign() * (1.9 + rng.next() * 0.8);
    enqueue('chorister', wave >= 3 ? 2 : 1, squeezeBearing, 8.0, 4.0);
    enqueue('thrall', bodies(4), squeezeBearing, 9.0, 1.5);
    // ANCHOR at +28 s from wave 2: rumble first, then the warden(s)
    if (wave >= 2) {
      enqueue('warden', wave >= 6 ? 2 : 1, contactBearing + Math.PI + (rng.next() - 0.5), 28.0, 8);
    }
    // late thrall pressure on big waves
    if (wave >= 4) enqueue('thrall', bodies(3), facing + Math.PI, 30, 1.8);
    rumbleSent = false;
  }

  /* ---------------- spawn legality ---------------- */
  const _v = new THREE.Vector3();
  function trySpawn(order) {
    const p = ctx.systems.player;
    const world = ctx.systems.world;
    const enemies = ctx.systems.enemies;
    if (enemies.aliveCount >= ALIVE_CAP) return false;
    if (sinceSpawn < SPAWN_GAP) return false;
    const [rMin, rMax] = BANDS[order.species];
    const facing = playerBearing();
    for (let attempt2 = 0; attempt2 < 12; attempt2++) {
      const a = order.bearing + (rng.next() - 0.5) * 0.7 * (1 + attempt2 * 0.3);
      const r = rMin + Math.sqrt(rng.next()) * (rMax - rMin);
      const x = p.pos.x + Math.cos(a) * r;
      const z = p.pos.z + Math.sin(a) * r;
      // laws
      if (Math.hypot(x, z) > world.playRadius - 3) continue;
      if (Math.hypot(x - p.pos.x, z - p.pos.z) < MIN_SPAWN_DIST) continue;
      if (Math.hypot(x, z) < world.structure.floorR + 1) continue;
      const groundY = world.terrainHeight(x, z);
      const spawnRadius = SPAWN_RADII[order.species] ?? 0.5;
      if (!world.canOccupyCircle(x, z, spawnRadius, groundY, 0.18)) continue;
      let da = Math.atan2(z - p.pos.z, x - p.pos.x) - facing;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      if (Math.abs(da) < VIEW_CONE) continue;             // never in the view cone
      const e = enemies.spawn(order.species, x, z);
      if (e) {
        sinceSpawn = 0;
        return true;
      }
      return false; // pool jammed — defer
    }
    return false;
  }

  /* ---------------- run control ---------------- */
  function startWave(n) {
    wave = n;
    waveT = 0;
    phase = 'contact';
    phaseT = 0;
    buildWave();
    ctx.systems.world.setPower(wave / FINAL_WAVE);
    ctx.systems.world.setProgress((wave - 1) / FINAL_WAVE);
    ctx.bus.emit('wave:start', { wave, final: FINAL_WAVE });
    scheduleCrashes();
  }

  ctx.bus.on('player:hurt', () => { underAttackT = 2.5; });
  ctx.bus.on('player:died', () => { attempt++; });
  let dryT = 0;                 // truly out of ammo -> emergency pod

  return {
    id: 'director',
    get wave() { return wave; },
    get phase() { return phase; },
    get queued() { return queue.length; },
    get running() { return running; },
    crashes,
    eligibleCrashSites,
    crashReward: { ammo: CRASH_AMMO, heal: CRASH_HEAL },
    /** fresh=false restarts the CURRENT wave (death retry, mercy applied);
     *  the wave index never advances — and never resets — on a death. */
    startRun({ retry = false } = {}) {
      running = true;
      if (!retry) attempt = 1;
      startWave(retry ? Math.max(1, wave) : 1);
    },
    reset() {
      running = false;
      queue.length = 0;
      phase = 'idle';
      podLive = false;
      podGroup.visible = false;
      dryT = 0;
      for (const c of crashes) {
        c.state = 'inactive'; c.site = null; c.stateT = 0;
        resetCrashVisuals(c);
      }
      // wave stays — a death restarts the SAME wave (never advances on death)
    },
    debugSpawnWave(n) { startWave(n ?? Math.max(1, wave)); },

    update(dt) {
      if (!running || ctx.state !== 'playing') return;
      const enemies = ctx.systems.enemies;
      const p = ctx.systems.player;
      waveT += dt;
      phaseT += dt;
      sinceSpawn += dt;
      underAttackT = Math.max(0, underAttackT - dt);

      // threat dial: the sky, fog, and trim all follow this one scalar
      ctx.systems.world.setThreat(
        (wave / FINAL_WAVE) * 0.7 + (enemies.aliveCount / 24) * 0.25 + (underAttackT > 0 ? 0.12 : 0),
      );

      // ANCHOR rumble: part of the spawn, not decoration
      if (!rumbleSent && queue.some(o => o.species === 'warden') && wave >= 2) {
        const next = queue.find(o => o.species === 'warden');
        if (next && waveT >= next.at - 1.4) {
          rumbleSent = true;
          ctx.bus.emit('enemy:rumble', {});
          ctx.systems.camera.addTrauma(0.18);
        }
      }

      // drain the queue under the laws; blocked orders defer 0.35 s
      for (let i = 0; i < queue.length; i++) {
        const o = queue[i];
        if (waveT < o.at) continue;
        if (trySpawn(o)) {
          queue.splice(i, 1);
          break;                       // one spawn event per frame max
        } else {
          o.at = waveT + 0.35;
        }
      }

      // phase bookkeeping (for tests + the banner rhythm)
      if (phase === 'contact' && waveT >= 8) { phase = 'squeeze'; phaseT = 0; }
      else if (phase === 'squeeze' && waveT >= 28) { phase = 'anchor'; phaseT = 0; }
      else if (phase === 'anchor' && queue.length === 0) { phase = 'cleanup'; phaseT = 0; }
      else if ((phase === 'cleanup' || phase === 'contact' || phase === 'squeeze') && queue.length === 0 && enemies.aliveCount === 0) {
        // field is clear — the designed silence
        phase = 'silence';
        phaseT = 0;
        ctx.bus.emit('wave:clear', { wave });
      } else if (phase === 'silence') {
        if (phaseT >= SILENCE_S) {
          if (wave >= FINAL_WAVE) {
            phase = 'won';
            running = false;
            ctx.systems.world.setProgress(1);
            ctx.bus.emit('run:won', { wave });
          } else {
            startWave(wave + 1);
          }
        }
      }

      // emergency pod: a player with literally no rounds gets a lifeline
      const a = ctx.systems.weapons.ammoState();
      dryT = (a.ammo + (a.reserve ?? 0) === 0) ? dryT + dt : 0;
      if (dryT > 5 && !podLive) dropEmergencyPod();

      updateCrashes(dt, p);

      // supply pod: collect by touch
      if (podLive) {
        podT += dt;
        pod.rotation.y += dt * 1.4;
        pod.position.y = 0.6 + Math.sin(podT * 2.2) * 0.12;
        beam.material.opacity = 0.16 + Math.sin(podT * 3.1) * 0.05;
        if (_v.set(p.pos.x - podGroup.position.x, 0, p.pos.z - podGroup.position.z).length() < 2.0) {
          podLive = false;
          podGroup.visible = false;
          const got = ctx.systems.weapons.addReserve(90);
          p.heal(40);
          ctx.bus.emit('supply:collect', { ammo: got, heal: 40, kind: 'emergency' });
        }
        if (podT > 30 + SILENCE_S) { podLive = false; podGroup.visible = false; }
      }
    },
  };
}
