// AL DENTE: boot, light, the opening screen, the select screen, two stages, the loop.
import * as THREE from 'three';
import { makeTextures } from './textures.js';
import { makeKit, G } from './materials.js';
import { Post } from './post.js';
import { Hero } from './hero.js';
import { FollowCam } from './camera.js';
import { Input } from './input.js';
import { buildLobby } from './lobby.js';
import { buildMeadow } from './meadow.js';
import { buildFortress } from './fortress.js';
import { buildBay } from './bay.js';
import { PastaAudio } from './audio.js';
import { clamp, lerp, damp, smoothstep } from './util.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const setLoad = (f) => { const b = $('loadbar'); if (b) b.style.width = Math.round(f * 100) + '%'; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const BUILDERS = { meadow: buildMeadow, fortress: buildFortress, bay: buildBay };
const PKEY = 'al-dente.stars';
const loadStars = () => { try { return new Set(JSON.parse(localStorage.getItem(PKEY) || '[]')); } catch (_) { return new Set(); } };
const saveStars = (s) => { try { localStorage.setItem(PKEY, JSON.stringify([...s])); } catch (_) { /* private window: keep it for this visit */ } };

async function boot() {
  const canvas = $('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setLoad(0.1); await nextFrame();
  const T = makeTextures(renderer);
  setLoad(0.4); await nextFrame();
  const K = makeKit(T);
  const SUN_DIR = new THREE.Vector3(-0.72, 0.58, 0.32).normalize();
  const HAZE = new THREE.Color(0.98, 0.8, 0.6).multiplyScalar(0.95);
  const env = studioEnv(renderer, SUN_DIR);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 1600);
  const audio = new PastaAudio();
  const input = new Input(canvas);
  const post = new Post(renderer);
  const SH = 24, texel = (2 * SH) / 2048;

  // every place gets its own scene, sun and shadow
  const built = {};
  const makeScene = () => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(HAZE, 130, 950);
    scene.environment = env; scene.environmentIntensity = 0.7;
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.9, 0.74), 3.1);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 170 });
    sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
    scene.add(sun, sun.target);
    return { scene, sun };
  };
  const getPlace = (id) => {
    if (built[id]) return built[id];
    const { scene, sun } = makeScene();
    const p = id === 'lobby' ? buildLobby(scene, K, audio) : BUILDERS[id](scene, K, audio, T);
    p.sun = sun; p.skyMat.uniforms.uSun.value.copy(SUN_DIR);
    built[id] = p;
    return p;
  };
  setLoad(0.6); await nextFrame();
  const lobby = getPlace('lobby');
  setLoad(0.85); await nextFrame();

  // ---------------------------------------------------------------- UI
  const ui = { count: $('count'), countn: $('countn'), keys: $('keys'), title: $('title'), hint: $('hintTitle'), win: $('win') };
  const show = (el, on) => { if (!el) return; el.hidden = false; el.style.opacity = on ? '' : '0'; };
  let movedT = 0, jumped = false;
  const onCount = (n) => {
    ui.countn.textContent = String(n);
    ui.count.classList.add('show');
    ui.count.classList.remove('bump'); void ui.count.offsetWidth; ui.count.classList.add('bump');
  };

  const ctxFor = (p) => ({ colliders: p.colliders, audio, supports: p.supports, fx: p.fx, onRespawn: () => { p.resetBreakables(); cam.snap(hero); post.params.fade = 0; },
    water: p.water ?? null, sinkY: p.sinkY, safeMinY: p.safeMinY, groundSurface: p.groundSurface, bubbles: p.bubbles ?? null });
  const hero = new Hero(lobby.scene, K, ctxFor(lobby));
  const cam = new FollowCam(camera, lobby.colliders);
  let active = lobby;
  const stars = loadStars();
  lobby.setStars(stars);

  const place = (p, pos, facing) => {
    if (active && active !== p) active.leave?.();
    active = p;
    hero.setScene(p.scene);
    hero.ctx = ctxFor(p);
    hero.reset(pos.clone(), facing);
    cam.col = p.colliders; cam.zones = p.zones; cam.tube = p.tube;
    cam.yaw = 0; cam.pitch = 0.3; cam.baseDist = 7.6; cam.dist = 7.6;
    cam.snap(hero);
    if (p.pickups) p.pickups.onCount = onCount;
    if (p !== lobby && camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
  };
  place(lobby, lobby.spawn, lobby.facing);

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

  const right = new THREE.Vector3().crossVectors(SUN_DIR, new THREE.Vector3(0, 1, 0)).normalize();
  const upL = new THREE.Vector3().crossVectors(right, SUN_DIR).normalize();
  const sp = new THREE.Vector3();
  const placeSun = (sun, center) => {
    const a = Math.round(center.dot(right) / texel) * texel, b = Math.round(center.dot(upL) / texel) * texel, c = center.dot(SUN_DIR);
    sp.set(0, 0, 0).addScaledVector(right, a).addScaledVector(upL, b).addScaledVector(SUN_DIR, c);
    sun.target.position.copy(sp); sun.position.copy(sp).addScaledVector(SUN_DIR, 90); sun.target.updateMatrixWorld();
  };

  // ---------------------------------------------------------------- modes
  const STEP = 1 / 120;
  const game = { mode: 'title', t: 0, timer: 0, timing: false, winT: 0, stage: null };
  const flyPos = new THREE.Vector3(), flyLook = new THREE.Vector3(), flyM = new THREE.Matrix4(), flyQ = new THREE.Quaternion(), worldUp = new THREE.Vector3(0, 1, 0);
  const tcPos = new THREE.Vector3(), tcLook = new THREE.Vector3();
  let fadeTarget = 1, pending = null;

  const toSelect = () => {
    if (game.mode !== 'title') return;
    game.mode = 'select'; game.t = 0;
    show(ui.title, false); show(ui.hint, false); show(ui.keys, true);
    document.body.classList.add('play');
    if (hero.grab) hero.endGrab();
  };
  const startStage = (id) => {
    game.mode = 'enter'; game.t = 0; fadeTarget = 0;
    hero.state = 'hold';
    audio.enter?.();
    pending = () => {
      const p = getPlace(id);
      p.reset();
      place(p, p.spawn.clone().add(new THREE.Vector3(0, 9, 0)), p.facing);
      hero.state = 'hold';
      ui.countn.textContent = '0'; ui.count.classList.remove('show');
      game.stage = id; game.timer = 0; game.timing = false; game.winT = 0;
      renderer.compile(p.scene, camera);
      game.mode = 'intro'; game.t = 0; fadeTarget = 1;
      show(ui.keys, !jumped);
    };
  };
  const toLobby = () => {
    if (game.mode === 'leave' || game.mode === 'enter') return;
    game.mode = 'leave'; game.t = 0; fadeTarget = 0;
    pending = () => {
      ui.win.classList.remove('show'); ui.count.classList.remove('show');
      lobby.setStars(stars);
      place(lobby, lobby.spawn, Math.PI);
      game.mode = 'select'; game.t = 99; game.stage = null; fadeTarget = 1;
      document.body.classList.add('play');
    };
  };
  const win = () => {
    game.mode = 'won'; game.winT = 0; game.timing = false;
    document.body.classList.remove('play');
    hero.state = 'win';
    active.star.taken = true;
    stars.add(game.stage); saveStars(stars);
    audio.star();
    const s = Math.floor(game.timer);
    $('wtime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('wcount').textContent = `${active.pickups.count} / ${active.pickups.total}`;
  };
  $('again').addEventListener('click', () => { toLobby(); canvas.focus({ preventScroll: true }); });
  input.onFirst = () => audio.unlock();
  canvas.addEventListener('pointerdown', () => audio.unlock());
  input.onKey = (code) => {
    if (game.mode === 'title' && (code === 'Space' || code === 'Enter' || code === 'KeyW' || code === 'ArrowUp')) { toSelect(); return; }
    if (game.mode === 'intro' && game.t > 0.4) { game.mode = 'play'; hero.state = 'play'; }
    if (game.mode === 'won' && game.winT > 1.5 && (code === 'Enter' || code === 'Space')) toLobby();
    if (code === 'Escape' && (game.mode === 'play' || game.mode === 'intro' || game.mode === 'won')) toLobby();
  };

  // grabbing noodles on the opening screen
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
  const pointer = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  canvas.addEventListener('pointerdown', (e) => {
    if (game.mode !== 'title') return;
    pointer(e);
    const idx = hero.pickPoint(ray.ray, 0.2);
    if (idx < 0) return;
    const p = hero.strandPoint(idx, new THREE.Vector3());
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), p);
    hero.startGrab(idx, p);
  });
  canvas.addEventListener('pointermove', (e) => {
    pointer(e);
    if (game.mode === 'title') { if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -(hero.pos.z + 1.2)), hit)) { hero.lookAt.copy(hit); hero.lookAtOn = true; } }
    if (!hero.grab) return;
    if (ray.ray.intersectPlane(plane, hit)) hero.moveGrab(hit);
  });
  const release = () => { if (!hero.grab) return; const s = hero.endGrab(); audio.wobble?.(clamp(s, 0, 1)); };
  addEventListener('pointerup', release); addEventListener('pointercancel', release);

  // ---------------------------------------------------------------- loop
  let acc = 0, last = performance.now(), time = 0, frameAvg = 16, paused = false, perfT = 0, goodT = 0, holdT = 2, ceilT = 0, uw = 0;
  const tmpV = new THREE.Vector3();
  window.__game = {
    hero, cam, camera, renderer, post, K, game, input, get active() { return active; }, get scene() { return active.scene; }, get props() { return active; }, get W() { return active; },
    pause(p) { paused = p; },
    look(px, py, pz, lx, ly, lz) { camera.position.set(px, py, pz); camera.up.set(0, 1, 0); camera.lookAt(lx, ly, lz); this.manualCam = true; post.params.focus = Math.hypot(lx - px, ly - py, lz - pz); },
    follow() { this.manualCam = false; },
    teleport(x, y, z) { hero.reset(new THREE.Vector3(x, y, z), hero.facing); hero.state = 'play'; if (game.mode !== 'title' && game.mode !== 'select') game.mode = 'play'; cam.snap(hero); },
    go(id) { const p = getPlace(id); p.reset(); place(p, p.spawn, p.facing); game.stage = id; game.mode = 'play'; hero.state = 'play'; show(ui.title, false); show(ui.hint, false); cam.snap(hero); document.body.classList.add('play'); },
    select() { toSelect(); },
    enter(id) { startStage(id); },
    info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, frameAvg: +frameAvg.toFixed(1), scale, place: active.id, mode: game.mode, hero: hero.pos.toArray().map(v => +v.toFixed(2)), vel: hero.vel.toArray().map(v => +v.toFixed(2)), state: hero.state, grounded: hero.grounded, stuck: hero.stuck, wall: hero.wallCount, water: hero.inWater, count: active.pickups ? active.pickups.count : 0, stars: [...stars] }; },
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

    // fades between places
    post.params.fade = hero.state === 'sink' ? Math.min(post.params.fade, 1 - smoothstep(0.45, 0.95, hero.sinkT)) : damp(post.params.fade, fadeTarget, fadeTarget > 0.5 ? 3.2 : 9, dt);
    if (pending && post.params.fade < 0.02) { const f = pending; pending = null; f(); holdT = 2; last = performance.now(); }

    if (game.mode === 'intro' && active.intro && game.t > active.intro.len - 1.25 && hero.state === 'hold') hero.state = 'play';
    if (game.mode === 'intro' && active.intro && game.t > active.intro.len) { game.mode = 'play'; hero.state = 'play'; }

    // in a nest on the select screen: go
    if (game.mode === 'select' && game.t > 0.5) { const n = lobby.nestAt(hero); if (n) startStage(n.stage); }

    acc += dt;
    let steps = 0;
    const live = game.mode === 'play' || game.mode === 'select';
    const ax = live ? input.axis() : { x: 0, y: 0 };
    const camYaw = game.mode === 'select' ? 0 : cam.yaw;
    while (acc >= STEP && steps < 8) {
      if (hero.state !== 'hold') hero.fixedUpdate(STEP, { x: ax.x, y: ax.y, camYaw, jumpPressed: live && input.jumpPressed && steps === 0, jumpHeld: live && input.jumpHeld });
      active.fixed(STEP);
      acc -= STEP; steps++;
    }
    if (steps === 8) acc = 0;
    hero.updateMesh();
    active.update(dt, time, hero);
    audio.stretch?.(hero.grab ? clamp(hero.grab.stretch, 0, 1) : 0);

    // the goal
    if (game.mode === 'play' && active.star && !active.star.taken && hero.pos.distanceTo(active.star.mesh.position) < 1.75) win();
    if (game.mode === 'won') {
      game.winT += dt;
      const st = active.star.mesh;
      tmpV.set(hero.pos.x, hero.pos.y + 1.45, hero.pos.z);
      st.position.lerp(tmpV, 1 - Math.exp(-6 * dt));
      st.rotation.y += dt * 0.6;
      if (game.winT > 2.4) ui.win.classList.add('show');
    }
    if (game.mode === 'play') {
      if (!game.timing && (Math.abs(ax.x) + Math.abs(ax.y) > 0 || input.jumpPressed)) game.timing = true;
      if (game.timing) game.timer += dt;
    }
    if (live) {
      if (Math.abs(ax.x) + Math.abs(ax.y) > 0) movedT += dt;
      if (input.jumpPressed) jumped = true;
      if (movedT > 2.5 && jumped) ui.keys.style.opacity = '0';
    }

    G.uHero.value.copy(hero.pos);
    G.uHeroDent.value = damp(G.uHeroDent.value, hero.grounded && hero.groundC === 'ground' ? 1 : 0, 10, dt);

    // camera
    if (!window.__game.manualCam) {
      if (active === lobby) {
        const L = lobby;
        const k = game.mode === 'title' ? 0 : smoothstep(0, 1.3, game.t);
        tcPos.copy(L.titleCam.pos).add(tmpV.set(Math.sin(time * 0.31) * 0.05, Math.sin(time * 0.43) * 0.03, 0));
        tcLook.copy(L.titleCam.look);
        camera.position.lerpVectors(tcPos, L.selectCam.pos, k);
        flyLook.lerpVectors(tcLook, L.selectCam.look, k);
        camera.up.set(0, 1, 0); camera.lookAt(flyLook);
        const fov = lerp(L.titleCam.fov, L.selectCam.fov, k);
        if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
        post.params.focus = damp(post.params.focus, camera.position.distanceTo(hero.pos), 6, dt);
        hero.lookAtOn = game.mode === 'title' ? hero.lookAtOn : false;
      } else if (game.mode === 'intro' && active.intro) {
        cam.update(dt, hero, input, time);
        const fp = camera.position.clone(), fq = camera.quaternion.clone();
        const u = clamp(game.t / active.intro.len, 0, 1), e = u * u * (3 - 2 * u);
        active.intro.fly.getPoint(e, flyPos); active.intro.look.getPoint(Math.min(1, e * 1.08), flyLook);
        const hand = smoothstep(0.82, 1.0, u);
        camera.position.copy(flyPos).lerp(fp, hand);
        flyM.lookAt(flyPos, flyLook, worldUp); flyQ.setFromRotationMatrix(flyM);
        camera.quaternion.copy(flyQ).slerp(fq, hand);
        post.params.focus = lerp(flyPos.distanceTo(flyLook), camera.position.distanceTo(hero.pos), hand);
      } else if (game.mode === 'won') {
        cam.yaw += dt * 0.35; cam.pitch = damp(cam.pitch, 0.22, 1.5, dt); cam.baseDist = damp(cam.baseDist, 5.2, 1.5, dt);
        cam.update(dt, hero, input, time);
        post.params.focus = camera.position.distanceTo(hero.pos);
      } else if (game.mode !== 'enter' && game.mode !== 'leave') {
        cam.update(dt, hero, input, time);
        post.params.focus = damp(post.params.focus, camera.position.distanceTo(hero.pos), 8, dt);
      }
    }
    input.endFrame();
    placeSun(active.sun, game.mode === 'intro' && active.intro && game.t < active.intro.len * 0.8 ? flyLook : (active === lobby ? tmpV.set(0, 1, 0) : cam.target));
    // the bay's water needs to know where the camera is before drawing
    const view = active.view ? active.view(dt, time, camera) : null;
    if (!view) G.uWaterOn.value = 0;
    uw = damp(uw, view ? view.underwater : 0, 10, dt);
    audio.update(dt, { height01: clamp((hero.pos.y - 1) / 30, 0, 1), speed01: clamp(Math.hypot(hero.vel.x, hero.vel.z) / 7.4, 0, 1), inTube: cam.tubeBlend > 0.5, menu: active === lobby,
      underwater: uw, depth01: view ? view.depth01 : 0, shore01: view ? view.shore01 : 0 });
    post.render(active.scene, camera, time);

    // keep the frame rate: trade resolution for time. Building a stage hitches, so ignore that;
    // with vsync a healthy frame reads ~16.7ms, so climb back after a few calm seconds.
    perfT += dt; ceilT = Math.max(0, ceilT - dt);
    if (holdT > 0) { holdT -= dt; frameAvg = 16.7; perfT = 0; }
    else if (perfT > 1.5) {
      perfT = 0;
      const old = scale;
      if (frameAvg > 22 && scale > 0.6) { scale = Math.max(0.6, scale - 0.1); goodT = 0; ceilT = 20; }
      else if (frameAvg < 18.2) { goodT += 1.5; if (goodT >= 4.5 && scale < 1 && ceilT <= 0) { scale = Math.min(1, scale + 0.05); goodT = 0; } }
      else goodT = 0;
      if (scale !== old) resize();
    }
    window.__ready = true;
  }
  requestAnimationFrame(frame);
  $('loading').hidden = true;
  show(ui.hint, true);
  if (params.has('stage')) window.__game.go(params.get('stage'));
  else if (params.has('select')) toSelect();
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
