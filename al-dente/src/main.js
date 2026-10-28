// AL DENTE: boot, light, loop, states.
import * as THREE from 'three';
import { makeTextures } from './textures.js';
import { makeKit, G } from './materials.js';
import { Post } from './post.js';
import { buildWorld, SEA } from './world.js';
import { Hero } from './hero.js';
import { FollowCam } from './camera.js';
import { Input } from './input.js';
import { buildProps } from './props.js';
import { buildFlora } from './flora.js';
import { PastaAudio } from './audio.js';
import { clamp, lerp, damp, smoothstep } from './util.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SKIP_INTRO = params.has('nointro');
const setLoad = (f) => { const b = $('loadbar'); if (b) b.style.width = Math.round(f * 100) + '%'; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function boot() {
  const canvas = $('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setLoad(0.08); await nextFrame();

  const T = makeTextures(renderer);
  setLoad(0.3); await nextFrame();
  const K = makeKit(T);

  const scene = new THREE.Scene();
  const SUN_DIR = new THREE.Vector3(-0.72, 0.58, 0.32).normalize();
  const HAZE = new THREE.Color(0.98, 0.8, 0.6).multiplyScalar(0.95);
  scene.fog = new THREE.Fog(HAZE, 130, 950);
  scene.environment = studioEnv(renderer, SUN_DIR);
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.08, 1600);
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.9, 0.74), 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const SH = 24;
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 170 });
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  setLoad(0.45); await nextFrame();

  const W = buildWorld(scene, K);
  W.skyMat.uniforms.uSun.value.copy(SUN_DIR);
  setLoad(0.6); await nextFrame();

  const audio = new PastaAudio();
  const props = buildProps(scene, K, W, audio);
  setLoad(0.75); await nextFrame();
  const flora = buildFlora(scene, K, W);
  setLoad(0.9); await nextFrame();

  const input = new Input(canvas);
  const ctx = { colliders: W.colliders, audio, supports: props.supports, fx: props.fx, onRespawn: () => { props.resetBreakables(); cam.snap(hero); post.params.fade = 0; } };
  const hero = new Hero(scene, K, ctx);
  const SPAWN = new THREE.Vector3(0, 0, 58);
  SPAWN.y = W.colliders.floorBelow(SPAWN.x, 50, SPAWN.z) + 0.46;
  hero.reset(SPAWN.clone(), Math.PI);

  const cam = new FollowCam(camera, W.colliders);
  cam.zones = W.zones; cam.tube = props.tube;
  cam.yaw = 0; cam.snap(hero);

  const post = new Post(renderer);
  let scale = 1;
  const resize = () => {
    const w = Math.max(1, Math.floor(innerWidth * scale)), h = Math.max(1, Math.floor(innerHeight * scale));
    renderer.setSize(w, h, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    post.setSize(w, h);
  };
  addEventListener('resize', resize); resize();
  setLoad(1);

  // shadow camera follows the action, snapped to texels so edges don't crawl
  const right = new THREE.Vector3().crossVectors(SUN_DIR, new THREE.Vector3(0, 1, 0)).normalize();
  const upL = new THREE.Vector3().crossVectors(right, SUN_DIR).normalize();
  const texel = (2 * SH) / 2048;
  const sp = new THREE.Vector3();
  const placeSun = (center) => {
    const a = Math.round(center.dot(right) / texel) * texel, b = Math.round(center.dot(upL) / texel) * texel, c = center.dot(SUN_DIR);
    sp.set(0, 0, 0).addScaledVector(right, a).addScaledVector(upL, b).addScaledVector(SUN_DIR, c);
    sun.target.position.copy(sp);
    sun.position.copy(sp).addScaledVector(SUN_DIR, 90);
    sun.target.updateMatrixWorld();
  };

  // ---------------------------------------------------------------- UI
  const ui = { count: $('count'), countn: $('countn'), keys: $('keys'), title: $('title'), win: $('win') };
  props.pickups.onCount = (n) => {
    ui.countn.textContent = String(n);
    ui.count.classList.add('show');
    ui.count.classList.remove('bump'); void ui.count.offsetWidth; ui.count.classList.add('bump');
  };
  let movedT = 0, jumped = false;

  // ---------------------------------------------------------------- game state
  const STEP = 1 / 120;
  const game = { mode: SKIP_INTRO ? 'play' : 'intro', t: 0, timer: 0, timing: false, winT: 0 };
  const INTRO_LEN = 6.2;
  const st = props.star.home;
  const flyPath = new THREE.CatmullRomCurve3([
    st.clone().add(new THREE.Vector3(-3.2, 0.6, 4.2)), new THREE.Vector3(14, 30, -40), new THREE.Vector3(-6, 22, -24),
    new THREE.Vector3(2, 17, -6), new THREE.Vector3(1, 11, 24), new THREE.Vector3(0, 6, 54), new THREE.Vector3(0, 4.2, 64),
  ], false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3([
    st.clone(), st.clone().add(new THREE.Vector3(0, -2, 0)), new THREE.Vector3(10, 19, -45), new THREE.Vector3(0, 9, -14),
    new THREE.Vector3(0, 6, 8), new THREE.Vector3(0, 4, 24), new THREE.Vector3(0, 2.6, 40),
  ], false, 'centripetal');
  const flyPos = new THREE.Vector3(), flyLook = new THREE.Vector3(), flyM = new THREE.Matrix4(), flyQ = new THREE.Quaternion(), worldUp = new THREE.Vector3(0, 1, 0);
  if (!SKIP_INTRO) { hero.pos.y += 9; hero.state = 'hold'; }
  const endIntro = () => {
    if (game.mode !== 'intro') return;
    game.mode = 'play'; hero.state = 'play';
    ui.title.style.opacity = '0';
  };
  const restart = () => {
    ui.win.classList.remove('show');
    props.reset();
    hero.reset(SPAWN.clone().add(new THREE.Vector3(0, 6, 0)), Math.PI);
    cam.yaw = 0; cam.pitch = 0.3; cam.snap(hero);
    ui.countn.textContent = '0'; ui.count.classList.remove('show');
    game.mode = 'play'; game.timer = 0; game.timing = false; game.winT = 0;
    document.body.classList.add('play');
    canvas.focus({ preventScroll: true });
  };
  $('again').addEventListener('click', restart);
  input.onKey = (code) => {
    if (game.mode === 'intro') endIntro();
    if (game.mode === 'won' && game.winT > 1.5 && (code === 'Enter' || code === 'Space' || code === 'KeyR')) restart();
  };
  input.onFirst = () => { audio.unlock(); ui.title.style.opacity = '0'; document.body.classList.add('play'); };
  canvas.addEventListener('pointerdown', () => audio.unlock());

  const win = () => {
    game.mode = 'won'; game.winT = 0; game.timing = false;
    document.body.classList.remove('play');
    hero.state = 'win';
    props.star.taken = true;
    audio.star();
    const s = Math.floor(game.timer);
    $('wtime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('wcount').textContent = `${props.pickups.count} / ${props.pickups.total}`;
  };

  // ---------------------------------------------------------------- loop
  let acc = 0, last = performance.now(), time = 0, frameAvg = 16, paused = false, perfT = 0;
  const tmpV = new THREE.Vector3();
  window.__game = {
    hero, cam, camera, scene, renderer, post, W, K, game, sun, props, input,
    pause(p) { paused = p; },
    look(px, py, pz, lx, ly, lz) { camera.position.set(px, py, pz); camera.up.set(0, 1, 0); camera.lookAt(lx, ly, lz); this.manualCam = true; post.params.focus = Math.hypot(lx - px, ly - py, lz - pz); },
    follow() { this.manualCam = false; },
    teleport(x, y, z) { hero.reset(new THREE.Vector3(x, y, z), hero.facing); hero.state = 'play'; game.mode = 'play'; cam.snap(hero); },
    info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, frameAvg: +frameAvg.toFixed(1), scale, hero: hero.pos.toArray().map(v => +v.toFixed(2)), vel: hero.vel.toArray().map(v => +v.toFixed(2)), state: hero.state, mode: game.mode, grounded: hero.grounded, stuck: hero.stuck, wall: hero.wallCount, count: props.pickups.count }; },
  };

  function frame(now) {
    requestAnimationFrame(frame);
    renderer.info.reset();
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    frameAvg = lerp(frameAvg, dt * 1000, 0.05);
    if (paused) dt = 0;
    time += dt; game.t += dt;
    G.uTime.value = time;
    input.time = time;

    // intro: hold on the star, then drop the hero in and rack focus down to it
    if (game.mode === 'intro' && game.t > INTRO_LEN - 1.25 && hero.state === 'hold') hero.state = 'play';
    if (game.mode === 'intro' && game.t > INTRO_LEN) endIntro();

    acc += dt;
    let steps = 0;
    const live = game.mode === 'play';
    const ax = live ? input.axis() : { x: 0, y: 0 };
    while (acc >= STEP && steps < 8) {
      if (hero.state !== 'hold') hero.fixedUpdate(STEP, { x: ax.x, y: ax.y, camYaw: cam.yaw, jumpPressed: live && input.jumpPressed && steps === 0, jumpHeld: live && input.jumpHeld });
      props.fixed(STEP);
      acc -= STEP; steps++;
    }
    if (steps === 8) acc = 0;
    hero.updateMesh();
    props.update(dt, time, hero);
    flora.update(dt, time, hero);

    // the goal
    if (game.mode === 'play' && !props.star.taken && hero.pos.distanceTo(props.star.mesh.position) < 1.75) win();
    if (game.mode === 'won') {
      game.winT += dt;
      const st = props.star.mesh;
      tmpV.set(hero.pos.x, hero.pos.y + 1.45, hero.pos.z);
      st.position.lerp(tmpV, 1 - Math.exp(-6 * dt));
      st.rotation.y += dt * 0.6;
      if (game.winT > 2.4) ui.win.classList.add('show');
    }

    // timer + teaching overlays
    if (game.mode === 'play') {
      if (!game.timing && (Math.abs(ax.x) + Math.abs(ax.y) > 0 || input.jumpPressed)) game.timing = true;
      if (game.timing) game.timer += dt;
      if (Math.abs(ax.x) + Math.abs(ax.y) > 0) movedT += dt;
      if (input.jumpPressed) jumped = true;
      if ((movedT > 2.5 && jumped) || game.timer > 25) ui.keys.style.opacity = '0';
    }

    // sinking fades out; respawn fades back in
    if (hero.state === 'sink') post.params.fade = Math.min(post.params.fade, 1 - smoothstep(0.45, 0.95, hero.sinkT));
    else post.params.fade = Math.min(1, post.params.fade + dt * 2.8);
    G.uHero.value.copy(hero.pos);
    G.uHeroDent.value = damp(G.uHeroDent.value, hero.grounded && hero.groundC === 'ground' ? 1 : 0, 10, dt);

    if (!window.__game.manualCam) {
      if (game.mode === 'intro') {
        // fly from the star back over the route, then hand over to the follow camera
        cam.update(dt, hero, input, time);
        const fp = camera.position.clone(), fq = camera.quaternion.clone();
        const u = clamp(game.t / INTRO_LEN, 0, 1), e = u * u * (3 - 2 * u);
        flyPath.getPoint(e, flyPos); lookPath.getPoint(Math.min(1, e * 1.08), flyLook);
        const hand = smoothstep(0.82, 1.0, u);
        camera.position.copy(flyPos).lerp(fp, hand);
        flyM.lookAt(flyPos, flyLook, worldUp); flyQ.setFromRotationMatrix(flyM);
        camera.quaternion.copy(flyQ).slerp(fq, hand);
        post.params.focus = lerp(flyPos.distanceTo(flyLook), camera.position.distanceTo(hero.pos), hand);
      } else if (game.mode === 'won') {
        cam.yaw += dt * 0.35; cam.pitch = damp(cam.pitch, 0.22, 1.5, dt); cam.baseDist = damp(cam.baseDist, 5.2, 1.5, dt);
        cam.update(dt, hero, input, time);
        post.params.focus = camera.position.distanceTo(hero.pos);
      } else {
        cam.update(dt, hero, input, time);
        post.params.focus = damp(post.params.focus, camera.position.distanceTo(hero.pos), 8, dt);
      }
    }
    input.endFrame();
    placeSun(game.mode === 'intro' && game.t < INTRO_LEN * 0.8 ? flyLook : cam.target);
    audio.update(dt, { height01: clamp((hero.pos.y - 1) / 30, 0, 1), speed01: clamp(Math.hypot(hero.vel.x, hero.vel.z) / 7.4, 0, 1), inTube: cam.tubeBlend > 0.5 });
    post.render(scene, camera, time);

    // keep the frame rate: trade resolution for time
    perfT += dt;
    if (perfT > 1.5) {
      perfT = 0;
      const old = scale;
      if (frameAvg > 22 && scale > 0.6) scale = Math.max(0.6, scale - 0.1);
      else if (frameAvg < 15 && scale < 1) scale = Math.min(1, scale + 0.05);
      if (scale !== old) resize();
    }
    window.__ready = true;
  }
  requestAnimationFrame(frame);
  $('loading').hidden = true;
  ui.keys.hidden = false;
}

// A food-photography lighting box for reflections: warm key softbox near the sun, cooler fill, sky dome.
function studioEnv(renderer, sunDir) {
  const s = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: sunDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 zen = vec3(0.5, 0.52, 0.56); vec3 hor = vec3(0.86, 0.72, 0.55); vec3 gnd = vec3(0.42, 0.3, 0.16);
        vec3 c = h > 0.0 ? mix(hor, zen, pow(h, 0.6)) : mix(hor, gnd, clamp(-h * 3.0, 0.0, 1.0));
        float s = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.85, 0.6) * pow(s, 6.0) * 0.6;
        gl_FragColor = vec4(c * 0.6, 1.0); }`,
  }));
  s.add(dome);
  const box = (w, h, dir, inten, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(inten), side: THREE.DoubleSide }));
    m.position.copy(dir).normalize().multiplyScalar(40); m.lookAt(0, 0, 0); s.add(m);
  };
  box(22, 16, sunDir, 9, '#ffe2b8');
  box(36, 20, new THREE.Vector3(0.7, 0.45, 0.8), 2.0, '#e8f0ff');
  box(30, 30, new THREE.Vector3(0.1, 1, 0.2), 1.6, '#fff3e0');
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  return rt.texture;
}

boot().catch((e) => {
  console.error(e);
  const el = $('err'); if (el) { el.hidden = false; el.textContent = 'Could not start: ' + (e && e.message ? e.message : e); }
});
