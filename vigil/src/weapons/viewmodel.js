// The CINDER viewmodel: a procedural carbine in its OWN scene, rendered
// through its own 48° lens (44° ADS) after post with cleared depth — the gun
// never clips walls, never fisheyes, and its apparent size is independent of
// the world FOV (COMBAT_FEEL §1.1). Aim stays screen-centre: the ADS pose
// moves the model so the sight sits on the WORLD camera's centre ray.
//
// Gun local frame: +X right, +Y up, -Z down the bore. Muzzle z = -0.472.

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp, ease, Spring, Spring3, sway2 } from '../engine/math.js';

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

  const anodized = new THREE.MeshStandardMaterial({ color: 0x353c46, roughness: 0.48, metalness: 0.35 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.85, metalness: 0.08 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x59636e, roughness: 0.35, metalness: 0.7 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x14303c, roughness: 0.4, metalness: 0.5, emissive: 0x35dfff, emissiveIntensity: 0.9 });
  const magWin = new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.32 });

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

  // receiver + rail
  add(gun, new THREE.BoxGeometry(0.066, 0.082, 0.30), anodized, 0, 0, -0.075);
  add(gun, new THREE.BoxGeometry(0.058, 0.014, 0.34), anodized, 0, 0.048, -0.09);
  // the authored silhouette: long squared handguard with a visible gas block
  add(gun, oct(0.036, 0.24), polymer, 0, 0.004, -0.335);
  add(gun, new THREE.BoxGeometry(0.05, 0.05, 0.045), steel, 0, 0.022, -0.405);
  add(gun, new THREE.CylinderGeometry(0.011, 0.011, 0.085, 10).rotateX(Math.PI / 2), steel, 0, 0.012, -0.443);
  // muzzle device
  add(gun, oct(0.017, 0.052), steel, 0, 0.012, -0.462);
  // stock + grip
  add(gun, new THREE.BoxGeometry(0.04, 0.05, 0.12), polymer, 0, -0.004, 0.11);
  add(gun, new THREE.BoxGeometry(0.046, 0.066, 0.024), polymer, 0, -0.008, 0.168);
  add(gun, new THREE.BoxGeometry(0.034, 0.085, 0.05), polymer, 0, -0.075, 0.035, 0.32);
  // trigger guard
  add(gun, new THREE.BoxGeometry(0.006, 0.004, 0.06), steel, 0, -0.052, -0.012);
  // accent identity stripe (cyan = ours)
  add(gun, new THREE.BoxGeometry(0.068, 0.006, 0.04), accent, 0, -0.018, -0.20);

  // magazine with translucent window + follower
  const magG = new THREE.Group();
  gun.add(magG);
  magG.position.set(0, -0.075, -0.045);
  magG.rotation.x = 0.14;
  add(magG, new THREE.BoxGeometry(0.052, 0.13, 0.075), polymer, 0, -0.05, 0);
  add(magG, new THREE.BoxGeometry(0.054, 0.11, 0.02), magWin, 0, -0.05, -0.039);
  const follower = add(magG, new THREE.BoxGeometry(0.05, 0.012, 0.016), steel, 0, -0.005, -0.039);

  // bolt handle (cycles) + ejection port shadow
  const bolt = add(gun, new THREE.BoxGeometry(0.018, 0.016, 0.05), steel, 0.043, 0.02, -0.03);
  add(gun, new THREE.BoxGeometry(0.002, 0.03, 0.07), new THREE.MeshBasicMaterial({ color: 0x05070a }), 0.0335, 0.008, -0.035);

  // reflex sight: housing + emissive dot floated at the aperture
  const sightG = new THREE.Group();
  gun.add(sightG);
  sightG.position.copy(SIGHT);
  add(sightG, new THREE.BoxGeometry(0.03, 0.012, 0.05), anodized, 0, -0.021, 0);
  const ringGeo = new THREE.TorusGeometry(0.016, 0.0022, 6, 24);
  add(sightG, ringGeo, anodized, 0, 0, 0.012);
  const glass = add(sightG, new THREE.CircleGeometry(0.0145, 20), new THREE.MeshBasicMaterial({
    color: 0x1a3a4a, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
  }), 0, 0, 0.011);
  const dot = add(sightG, new THREE.CircleGeometry(0.0016, 10), new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.6, 1.02, 0.14), toneMapped: false, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  }), 0, 0, 0.013);

  gun.traverse(o => { o.frustumCulled = false; });

  /* ---------------- muzzle flash: star core + bore cone ---------------- */
  const flashUniforms = { uLife: { value: 1 }, uRot: { value: 0 } };
  const coreMat = new THREE.ShaderMaterial({
    uniforms: flashUniforms,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform float uLife;   // 0 fresh .. 1 dead
      uniform float uRot;
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

  let flashAge = 99, flashAds = 0;

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
  let st = { adsT: 0, firing: false, sinceShot: 99, ammo: 30, mag: 30, heat: 0, roundsRecent: 0, reloading: null };
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

    flash(subT, adsT) {
      flashAge = -subT;
      flashAds = adsT;
      flashUniforms.uRot.value = Math.floor(rng.next() * 8) * (Math.PI / 4);
      // eject brass 28 ms after the shot (the bolt has to travel)
      pendingBrass.push(0.028 - subT);
    },

    onReloadBeat(name) {
      if (reloadJolts[name]) jolt.nudge(reloadJolts[name] * 10);
      if (name === 'drop') magDropT = 0;
      if (name === 'enter') { magRiseT = 0; magDropT = -1; }
    },
    onReloadEnd() { magDropT = -1; magRiseT = -1; magG.position.set(0, -0.075, -0.045); magG.visible = true; },

    onMeleeStart() { /* pose is driven from st.melee in lateUpdate */ },
    onMeleeConnect() {
      kickPos.nudge(-0.030 * 16, -0.026 * 16, -0.070 * 16);
      kickRot.nudge(-7 * DEG * 16, 5 * DEG * 16, 9 * DEG * 16);
      jolt.nudge(10);
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
        coneMat.opacity = (1 - clamp01(t / 0.050)) * 0.55;
        flashCone.scale.setScalar(1 + (t / 0.050) * 0.35);
        const env = Math.exp(-t / 0.018);
        viewFlash.intensity = 2.6 * env * lerp(1, 0.55, flashAds);
        worldFlash.intensity = 46 * env;
        const scale = lerp(1, 0.55, flashAds);
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

      // melee: a horizontal buttstroke ACROSS the frame, never a thrust —
      // Z motion is the one axis a first-person camera reads worst. The
      // wind-up travels for 200 ms then HOLDS still for 60 ms; that stillness
      // is the whole anticipation.
      if (st.melee) {
        const M = st.meleeSpec;
        let swing = 0, lift = 0;
        if (st.melee.phase === 'windup') {
          const u = clamp01(st.melee.t / M.travel);      // holds at 1 for 60 ms
          swing = -ease.outCubic(u);
          lift = ease.outCubic(u);
        } else if (st.melee.phase === 'active') {
          const u = clamp01(st.melee.t / M.active);
          swing = lerp(-1, 1.15, ease.inQuad(u));
          lift = 1 - u * 0.7;
        } else {
          const u = clamp01(st.melee.t / M.recover);
          swing = 1.15 * (1 - ease.outCubic(u));
          lift = 0.3 * (1 - ease.outCubic(u));
        }
        _v.x += swing * 0.155;
        _v.y += lift * 0.052 - Math.abs(swing) * 0.018;
        _v.z += lift * 0.052;
        _e.y += -swing * 30 * DEG;
        _e.z += swing * 26 * DEG + lift * 14 * DEG;
        _e.x += lift * 13 * DEG;
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
  };
}
