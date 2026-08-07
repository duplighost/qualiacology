// THE LAG — the world: a foggy mirror labyrinth, a lantern, and the figure you
// keep seeing in the glass a half-second behind. One dial (this.lag) authors the
// tutorial, the map, the monster, and the ending.
import * as THREE from 'three';
import { Mirror, Mirrors, LAYER_WORLD, LAYER_HELD, LAYER_DOUBLE, LAYER_TRUTH } from './mirrors.js';
import { makeFigure, PoseBuffer } from './double.js';
import { makeMaze, distanceField, stepToward, rngFrom } from './maze.js';

const C = 3.4;          // cell size (m)
const H = 3.2;          // wall height
const WT = 0.14;        // collision half-thickness padding
const FOG = 0x05070a;
const FOG_D = 0.165;
const FOG_THIN = 0.085;
const EYE = 1.62;
const PR = 0.30;        // player radius
const BREAKOUT_T = 158; // seconds until the double steps out (unless found earlier)

export class World {
  constructor(container, hooks) {
    this.container = container;
    this.hooks = hooks || {};
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this._look = { dx: 0, dy: 0 };
    this.yaw = 0; this.pitch = 0;
    this.state = 'play'; // play | won | lost
    this.elapsed = 0;
    this.lag = 0.25;
    this.diverged = false;
    this.hunting = false;
    this.truthWindow = 0;
    this.lagPenalty = 0;
    this._bob = 0; this._stepDist = 0; this._flicker = 0;
    this._flare = 0; this._raiseAmt = 0;
    this._nearBox = null; this._nearExit = false;
    this._said = new Set();

    this._buildRenderer();
    this._buildScene();
    this._buildMaze();
    this._buildPlayer();
    this._buildDoubles();
    this._placeExitAndBoxes();
    this._exposeDebug();
  }

  // ---------------------------------------------------------------- renderer
  _buildRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.autoClear = true;
    this.container.appendChild(this.renderer.domElement);
  }

  _buildScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG);
    scene.fog = new THREE.FogExp2(FOG, FOG_D);
    this.scene = scene;

    const amb = new THREE.AmbientLight(0x2c3d47, 0.55);
    scene.add(amb);

    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 60);
    this.camera.rotation.order = 'YXZ';
    this.camera.layers.set(LAYER_WORLD);
    this.camera.layers.enable(LAYER_HELD);
    scene.add(this.camera);

    this.mirrors = new Mirrors(this.renderer, { budget: 6, size: 512, maxDist: 13, fogColor: FOG });
  }

  // ---------------------------------------------------------------- maze
  _buildMaze() {
    const seed = (Math.random() * 1e9) | 0;
    const rng = rngFrom(seed);
    this.cols = 6; this.rows = 6;
    this.maze = makeMaze(this.cols, this.rows, rng);
    this.walls = []; // collision AABBs {minx,maxx,minz,maxz}

    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2013, roughness: 0.5, metalness: 0.6 });

    // floor + ceiling
    const span = Math.max(this.cols, this.rows) * C + 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(span, span),
      new THREE.MeshStandardMaterial({ color: 0x3a4249, roughness: 0.55, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(this.cols * C / 2, 0, this.rows * C / 2);
    floor.layers.set(LAYER_WORLD); this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(span, span),
      new THREE.MeshStandardMaterial({ color: 0x080b0e, roughness: 1.0 }));
    ceil.rotation.x = Math.PI / 2; ceil.position.set(this.cols * C / 2, H, this.rows * C / 2);
    ceil.layers.set(LAYER_WORLD); this.scene.add(ceil);

    const { vWall, hWall, cols, rows } = this.maze;
    const addAABB = (cx, cz, hx, hz) => this.walls.push({ minx: cx - hx, maxx: cx + hx, minz: cz - hz, maxz: cz + hz });

    // vertical walls (normal along X): x = cc*C, z spans row rr
    for (let rr = 0; rr < rows; rr++) {
      for (let cc = 0; cc <= cols; cc++) {
        if (!vWall[rr][cc]) continue;
        const x = cc * C, z = rr * C + C / 2;
        addAABB(x, z, WT, C / 2);
        // face east into cell (rr,cc)
        if (cc <= cols - 1) this._addMirror(x, z, Math.PI / 2, rr, cc);
        // face west into cell (rr,cc-1)
        if (cc - 1 >= 0) this._addMirror(x, z, -Math.PI / 2, rr, cc - 1);
      }
    }
    // horizontal walls (normal along Z): z = rr*C, x spans col cc
    for (let rr = 0; rr <= rows; rr++) {
      for (let cc = 0; cc < cols; cc++) {
        if (!hWall[rr][cc]) continue;
        const z = rr * C, x = cc * C + C / 2;
        addAABB(x, z, C / 2, WT);
        if (rr <= rows - 1) this._addMirror(x, z, 0, rr, cc);         // south into (rr,cc)
        if (rr - 1 >= 0) this._addMirror(x, z, Math.PI, rr - 1, cc);  // north into (rr-1,cc)
      }
    }

    // corner posts where walls meet — hide the seams, give the eye a little brass
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, H, 6);
    for (let rr = 0; rr <= rows; rr++) {
      for (let cc = 0; cc <= cols; cc++) {
        const touch = (rr < rows && vWall[rr][cc]) || (rr > 0 && vWall[rr - 1][cc]) ||
          (cc < cols && hWall[rr][cc]) || (cc > 0 && hWall[rr][cc - 1]);
        if (!touch) continue;
        const p = new THREE.Mesh(postGeo, postMat);
        p.position.set(cc * C, H / 2, rr * C); p.layers.set(LAYER_WORLD); this.scene.add(p);
      }
    }
  }

  _addMirror(x, z, rotY, cellR, cellC, truth = false) {
    const m = new Mirror(C - 0.02, H - 0.02, { truth, fogColor: FOG, fogDensity: FOG_D, edge: 0 });
    m.place(x, H / 2, z, rotY);
    m.mesh.layers.set(LAYER_WORLD);
    this.scene.add(m.mesh);
    this.mirrors.add(m);
    return m;
  }

  // ---------------------------------------------------------------- player + lantern
  _buildPlayer() {
    // start in cell (0,0), face the open direction
    this.startCell = [0, 0];
    this.px = C / 2; this.pz = C / 2;
    // face toward whichever neighbor is open
    if (!this.maze.vWall[0][1]) this.yaw = -Math.PI / 2;      // east open -> face +x... forward=(-sin,-cos); east is +x => yaw=-90
    else this.yaw = 0;                                        // else face south (+z) forward=(0,-1)? default look -z; pick something
    this.yaw = this._openYaw(0, 0);

    // lantern light (lights the world; reflected correctly)
    this.lantern = new THREE.PointLight(0xffb060, 20, 13, 2.0);
    this.lantern.position.set(0.18, -0.16, -0.28);
    this.lantern.layers.enable(LAYER_WORLD);
    this.camera.add(this.lantern);
    this._lanternBase = 20;

    // held lantern (seen by main camera only, layer 2) — a small warm glow you carry
    const held = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffcf8a }));
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 12),
      new THREE.MeshBasicMaterial({ color: 0x3a2a16 }));
    cage.rotation.x = Math.PI / 2;
    held.add(glass); held.add(cage);
    held.position.set(0.34, -0.5, -0.62);
    held.traverse((o) => o.layers.set(LAYER_HELD));
    this.camera.add(held);
    this._heldGlow = glass;

    this._syncCamera();
  }

  _openYaw(r, c) {
    const { vWall, hWall } = this.maze;
    if (!vWall[r][c + 1]) return -Math.PI / 2;   // east
    if (!hWall[r + 1][c]) return Math.PI;         // south (forward -z faces north; to face +z yaw=PI)
    if (!vWall[r][c]) return Math.PI / 2;         // west
    if (!hWall[r][c]) return 0;                   // north
    return 0;
  }

  // ---------------------------------------------------------------- the doubles
  _buildDoubles() {
    this.poses = new PoseBuffer(5);

    // lagged double — the thing in the glass (reflection-only, layer 3)
    this.dbl = makeFigure({ color: 0xb9c8cf, opacity: 0.9, layer: LAYER_DOUBLE });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd28a }));
    glow.layers.set(LAYER_DOUBLE);
    this.dbl.lanternNode.add(glow);
    this.dblLight = new THREE.PointLight(0xffb060, 15, 10, 2.0);
    this.dblLight.layers.set(LAYER_WORLD);
    this.dbl.lanternNode.add(this.dblLight);
    this.scene.add(this.dbl.group);

    // synced double — appears only in the one truth-mirror (layer 4)
    this.truth = makeFigure({ color: 0xc4d2d8, opacity: 0.95, layer: LAYER_TRUTH });
    const tglow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffc07a }));
    tglow.layers.set(LAYER_TRUTH);
    this.truth.lanternNode.add(tglow);
    this.scene.add(this.truth.group);
  }

  // ---------------------------------------------------------------- exit + boxes
  _placeExitAndBoxes() {
    const df = distanceField(this.maze, this.startCell[0], this.startCell[1]);
    // farthest boundary cell = the way out
    let best = null, bestD = -1;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const onEdge = r === 0 || c === 0 || r === this.rows - 1 || c === this.cols - 1;
      if (onEdge && df.map[r][c] > bestD) { bestD = df.map[r][c]; best = [r, c]; }
    }
    this.exitCell = best;
    const [er, ec] = best;
    // pick the outward perimeter side and put the truth-mirror there
    let x, z, rotY;
    if (er === 0) { x = ec * C + C / 2; z = 0; rotY = 0; }
    else if (er === this.rows - 1) { x = ec * C + C / 2; z = this.rows * C; rotY = Math.PI; }
    else if (ec === 0) { x = 0; z = er * C + C / 2; rotY = Math.PI / 2; }
    else { x = this.cols * C; z = er * C + C / 2; rotY = -Math.PI / 2; }
    this.exitMirror = this._addMirror(x, z, rotY, er, ec, true);
    this.exitMirror.material.uniforms.uTint.value.set(0xd7dee2);
    this.exitPos = new THREE.Vector3(ec * C + C / 2, EYE, er * C + C / 2);

    // faint dawn-grey beacon just inside the exit — the only non-amber colour
    this.exitGlow = new THREE.PointLight(0x9fb6c4, 0.0, 8, 2.0);
    this.exitGlow.position.set(this.exitPos.x, 1.8, this.exitPos.z);
    this.exitGlow.layers.set(LAYER_WORLD);
    this.scene.add(this.exitGlow);

    // music boxes on the floor in a couple of far-ish cells
    this.boxes = [];
    const boxCells = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const d = df.map[r][c];
      if (d > 3 && !(r === er && c === ec)) boxCells.push([r, c, d]);
    }
    boxCells.sort((a, b) => b[2] - a[2]);
    const picks = [boxCells[0], boxCells[Math.floor(boxCells.length / 2)]].filter(Boolean);
    for (const [r, c] of picks) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.5, metalness: 0.4 }));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x3a2a16, roughness: 0.4, metalness: 0.6 }));
      lid.position.y = 0.13;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05),
        new THREE.MeshBasicMaterial({ color: 0xd9b06a }));
      gem.position.y = 0.2;
      g.add(body, lid, gem);
      g.position.set(c * C + C / 2, 0.42, r * C + C / 2);
      g.traverse((o) => o.layers.set(LAYER_WORLD));
      this.scene.add(g);
      const light = new THREE.PointLight(0xd9b06a, 5, 4.5, 2.0);
      light.position.set(g.position.x, 0.7, g.position.z); light.layers.set(LAYER_WORLD);
      this.scene.add(light);
      this.boxes.push({ group: g, gem, light, pos: new THREE.Vector3(g.position.x, EYE, g.position.z), cooldown: 0 });
    }
  }

  // ---------------------------------------------------------------- input glue
  look(dx, dy) { this._look.dx += dx; this._look.dy += dy; }
  key(code, down) { if (down) this.keys.add(code); else this.keys.delete(code); }

  flare() {
    if (this.state !== 'play') return;
    this._flare = 1;
    this.hooks.audio && this.hooks.audio.flare();
  }

  interact() {
    if (this.state !== 'play') return;
    if (this._nearExit) return this._win();
    if (this._nearBox && this._nearBox.cooldown <= 0) {
      this._nearBox.cooldown = 26;
      this.truthWindow = 25;
      this.lagPenalty += 0.18;
      this.hooks.audio && this.hooks.audio.musicBox();
      this.hooks.say && this.hooks.say('The glass tells the truth — for a little while.', 3);
    }
  }

  // ---------------------------------------------------------------- update
  update(forcedDt) {
    const dt = forcedDt != null ? forcedDt : Math.min(0.05, this.clock.getDelta());
    if (this.state !== 'play') { this.hooks.audio && this.hooks.audio.update(dt); this._render(); return dt; }
    this.elapsed += dt;

    this._updateLook();
    this._updateMove(dt);
    this._updateLagCurve(dt);
    this._updatePoses(dt);
    if (this.hunting) this._updateHunter(dt);
    this._tickCooldowns(dt);
    this._updateProximity();
    this._updateLantern(dt);
    this._beats();

    this.hooks.audio && (this.hooks.audio.setLag(this.lag), this.hooks.audio.update(dt));
    this._render();
    return dt;
  }

  _updateLook() {
    const s = 0.0022;
    this.yaw -= this._look.dx * s;
    this.pitch -= this._look.dy * s;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    this._look.dx = 0; this._look.dy = 0;
  }

  _updateMove(dt) {
    const k = this.keys;
    let iz = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let ix = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const raising = this._raiseActive;
    const fwd = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    const right = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
    let dx = fwd.x * iz + right.x * ix;
    let dz = fwd.z * iz + right.z * ix;
    const len = Math.hypot(dx, dz);
    const moving = len > 0.001;
    if (moving) { dx /= len; dz /= len; }
    const speed = raising ? 1.3 : 2.7;
    let nx = this.px + dx * speed * dt;
    let nz = this.pz + dz * speed * dt;
    [nx, nz] = this._collide(nx, nz);
    const dist = Math.hypot(nx - this.px, nz - this.pz);
    this.px = nx; this.pz = nz;
    this._moving = moving && dist > 1e-4;

    // head bob + footsteps
    if (this._moving) {
      this._bob += dist * 3.4;
      this._stepDist += dist;
      if (this._stepDist > 1.85) {
        this._stepDist = 0;
        this.hooks.audio && this.hooks.audio.footstep(1);
      }
    }
    this._syncCamera();
  }

  _collide(nx, nz) {
    for (let pass = 0; pass < 2; pass++) {
      for (const w of this.walls) {
        const cx = Math.max(w.minx, Math.min(nx, w.maxx));
        const cz = Math.max(w.minz, Math.min(nz, w.maxz));
        let ddx = nx - cx, ddz = nz - cz;
        let d2 = ddx * ddx + ddz * ddz;
        if (d2 < PR * PR) {
          let d = Math.sqrt(d2) || 1e-4;
          if (d2 < 1e-8) { // center inside: push out along smallest axis
            const ox = Math.min(nx - w.minx, w.maxx - nx);
            const oz = Math.min(nz - w.minz, w.maxz - nz);
            if (ox < oz) { nx += (nx > (w.minx + w.maxx) / 2 ? 1 : -1) * (PR - ox); }
            else { nz += (nz > (w.minz + w.maxz) / 2 ? 1 : -1) * (PR - oz); }
          } else {
            const push = (PR - d) / d;
            nx += ddx * push; nz += ddz * push;
          }
        }
      }
    }
    return [nx, nz];
  }

  _syncCamera() {
    const bob = this._moving ? Math.sin(this._bob) * 0.035 : 0;
    this.camera.position.set(this.px, EYE + bob, this.pz);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  _updateLagCurve(dt) {
    if (this.truthWindow > 0) {
      this.truthWindow -= dt;
      this.lag = 0;
      this.scene.fog.density += (FOG_THIN - this.scene.fog.density) * Math.min(1, dt * 2);
      return;
    }
    this.scene.fog.density += (FOG_D - this.scene.fog.density) * Math.min(1, dt * 1.2);
    const t = this.elapsed;
    let base;
    if (t < 30) base = 0.25;
    else if (t < 90) base = 0.25 + (t - 30) / 60 * (1.3 - 0.25);
    else if (t < 158) base = 1.3 + (t - 90) / 68 * (2.5 - 1.3);
    else base = 2.5;
    this.lag = Math.min(3.2, base + this.lagPenalty);
  }

  _updatePoses(dt) {
    // record current pose
    this.poses.push(dt, {
      x: this.px, z: this.pz, yaw: this.yaw,
      walk: this._bob, raise: this._raiseAmt, moving: this._moving,
    });

    // synced double (truth mirror) — always at the current pose
    this._applyFigure(this.truth, { x: this.px, z: this.pz, yaw: this.yaw, walk: this._bob, raise: this._raiseAmt, moving: this._moving });

    if (this.hunting) { this.dbl.group.visible = false; return; }
    this.dbl.group.visible = true;
    const p = this.poses.sample(this.lag);
    if (!p) return;
    let raise = p.raise;
    // divergence: past ~1.5s it finishes your gesture its own way, and gains a little ground
    if (this.lag > 1.5) {
      raise = Math.min(1, raise + 0.28 + 0.12 * Math.sin(this.elapsed * 1.2));
      const toX = this.px - p.x, toZ = this.pz - p.z;
      p.x += toX * Math.min(1, dt * 0.35);
      p.z += toZ * Math.min(1, dt * 0.35);
    }
    this._applyFigure(this.dbl, { ...p, raise });
  }

  _applyFigure(fig, p) {
    fig.group.position.set(p.x, 0, p.z);
    fig.group.rotation.y = p.yaw;
    fig.pose(p.walk, p.raise, p.moving);
  }

  _updateLantern(dt) {
    this._raiseActive = this.keys.has('KeyR') || this._mouseRight;
    const shutter = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this._raiseAmt += ((this._raiseActive ? 1 : 0) - this._raiseAmt) * Math.min(1, dt * 8);
    this._flicker = 0.82 + Math.random() * 0.18;
    let intensity = this._lanternBase * this._flicker;
    if (this._raiseActive) intensity *= 1.55;
    if (shutter) intensity *= 0.12;
    if (this._flare > 0) { intensity *= 1 + this._flare * 2.5; this._flare = Math.max(0, this._flare - dt * 4); }
    this.lantern.intensity = intensity;
    this._heldGlow.material.color.setRGB(1, 0.72 + this._flicker * 0.12, 0.4).multiplyScalar(shutter ? 0.25 : 1);
    this.hooks.audio && this.hooks.audio.setLanternOpen(shutter ? 0.12 : (this._raiseActive ? 1 : 0.6));

    // flare pops a glint on active glass
    const edge = this._flare * 0.22;
    for (const m of this.mirrors.mirrors) m.setFlare(m.material.uniforms.uActive.value > 0.5 ? edge : 0);
  }

  _updateProximity() {
    // exit
    const de = Math.hypot(this.px - this.exitPos.x, this.pz - this.exitPos.z);
    this._nearExit = de < 1.5;
    this.exitGlow.intensity += ((this.hunting ? 7 : 3.2) - this.exitGlow.intensity) * 0.05;
    // boxes
    this._nearBox = null;
    for (const b of this.boxes) {
      const d = Math.hypot(this.px - b.pos.x, this.pz - b.pos.z);
      b.gem.rotation.y += 0.02;
      if (d < 1.6 && !this._nearBox) this._nearBox = b;
    }
    // prompt
    let prompt = null;
    if (this._nearExit) prompt = 'Step through';
    else if (this._nearBox && this._nearBox.cooldown <= 0) prompt = 'Wind the music box';
    this.hooks.prompt && this.hooks.prompt(prompt);
  }

  // decrement box cooldowns with real dt (called from update loop start indirectly)
  _tickCooldowns(dt) { for (const b of this.boxes) if (b.cooldown > 0) b.cooldown -= dt; }

  // ---------------------------------------------------------------- director / beats
  _beats() {
    const say = (id, text, dur) => { if (!this._said.has(id)) { this._said.add(id); this.hooks.say && this.hooks.say(text, dur); } };
    if (this.elapsed > 2) say('intro', 'Your light comes back in the glass. Follow it out.', 4);
    if (this.elapsed > 34) say('seed', 'It waves back. A little late.', 3.5);
    if (!this.diverged && this.lag > 1.5) {
      this.diverged = true;
      this.hooks.audio && (this.hooks.audio.groan(), this.hooks.audio.hush(0.6));
      say('diverge', "It isn't quite copying you anymore.", 3.5);
      this.hooks.objective && this.hooks.objective('Don\'t trust the glass. Find the way out.');
    }
    if (!this.hunting && this.elapsed > BREAKOUT_T) this._breakout();
  }

  _breakout() {
    this.hunting = true;
    this.hooks.audio && (this.hooks.audio.hush(0.8), this.hooks.audio.shatter(), this.hooks.audio.spawnColdHum());
    // it steps out a few corridors back — never on top of you — then gives chase
    const pc = this._cellOf(this.px, this.pz);
    const df = distanceField(this.maze, pc[0], pc[1]);
    let cell = pc, want = 5, bestErr = Infinity, fallback = pc, fbd = -1;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const d = df.map[r][c];
      if (d < 0) continue;
      if (d > fbd) { fbd = d; fallback = [r, c]; }
      const err = Math.abs(d - want);
      if (d >= 3 && err < bestErr) { bestErr = err; cell = [r, c]; }
    }
    if (bestErr === Infinity) cell = fallback;
    this.hunter = makeFigure({ color: 0x8fe0ec, opacity: 1, layer: LAYER_WORLD });
    const hglow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x6fe0f0 }));
    hglow.layers.set(LAYER_WORLD);
    this.hunter.lanternNode.add(hglow);
    this.hunterLight = new THREE.PointLight(0x5fd0ea, 17, 11, 2.0);
    this.hunterLight.layers.set(LAYER_WORLD);
    this.hunter.lanternNode.add(this.hunterLight);
    this.hunter.group.position.set(cell[1] * C + C / 2, 0, cell[0] * C + C / 2);
    this.hunter.pose(0, 1, false);
    this.scene.add(this.hunter.group);
    this.hunterCell = cell;
    this.hunterTarget = new THREE.Vector3(this.hunter.group.position.x, 0, this.hunter.group.position.z);
    this.hunterRepath = 0;
    this.hooks.say && this.hooks.say('It stepped out of the glass.', 4);
    this.hooks.objective && this.hooks.objective('Find the one mirror that does not lag. Go through it.');
  }

  _updateHunter(dt) {
    const h = this.hunter;
    // repath toward the player's cell every ~0.4s
    this.hunterRepath -= dt;
    if (this.hunterRepath <= 0) {
      this.hunterRepath = 0.4;
      const pc = this._cellOf(this.px, this.pz);
      const next = stepToward(this.maze, this.hunterCell, pc);
      if (next) {
        this.hunterCell = next;
        this.hunterTarget.set(next[1] * C + C / 2, 0, next[0] * C + C / 2);
      } else {
        this.hunterTarget.set(this.px, 0, this.pz);
      }
    }
    // move toward target
    const hp = h.group.position;
    const tx = this.hunterTarget.x, tz = this.hunterTarget.z;
    const dx = tx - hp.x, dz = tz - hp.z;
    const d = Math.hypot(dx, dz) || 1e-4;
    const spd = 2.35 * dt;
    if (d > spd) { hp.x += dx / d * spd; hp.z += dz / d * spd; } else { hp.x = tx; hp.z = tz; }
    h.group.rotation.y = Math.atan2(-(dx), -(dz)); // face travel dir (forward = -z at yaw 0)
    h._walk = (h._walk || 0) + spd * 3.2;
    h.pose(h._walk, 0.7, d > 0.05);

    const dToPlayer = Math.hypot(this.px - hp.x, this.pz - hp.z);
    this.hooks.audio && this.hooks.audio.setColdNear(Math.max(0, 1 - dToPlayer / 8));
    if (dToPlayer < 1.15) this._lose();
  }

  _cellOf(x, z) {
    let c = Math.floor(x / C), r = Math.floor(z / C);
    r = Math.max(0, Math.min(this.rows - 1, r)); c = Math.max(0, Math.min(this.cols - 1, c));
    return [r, c];
  }

  _win() {
    this.state = 'won';
    this.hooks.audio && this.hooks.audio.shatter();
    this.hooks.prompt && this.hooks.prompt(null);
    this.hooks.win && this.hooks.win();
  }
  _lose() {
    this.state = 'lost';
    this.hooks.prompt && this.hooks.prompt(null);
    this.hooks.lose && this.hooks.lose();
  }

  // ---------------------------------------------------------------- render
  _render() {
    // the double's lantern lights the reflected maze, but not your real view —
    // so you see a glow in the glass with nothing behind you when you turn.
    this.dblLight.visible = !this.hunting;
    this.mirrors.update(this.scene, this.camera);
    this.dblLight.visible = false;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  // ---------------------------------------------------------------- debug
  _exposeDebug() {
    window.HOM = {
      world: this,
      // fixed-timestep advance + render, for headless verification without RAF
      step: (dt = 0.016, n = 1) => { for (let i = 0; i < n; i++) this.update(dt); },
      shot: async (name) => {
        this._render();
        const url = this.renderer.domElement.toDataURL('image/png');
        const r = await fetch('/__save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, data: url }) });
        return r.status;
      },
      look: (yawDeg, pitchDeg = 0) => { this.yaw = yawDeg * Math.PI / 180; this.pitch = pitchDeg * Math.PI / 180; this._syncCamera(); },
      lag: (x) => { this.lagPenalty = x - 0.25; this.elapsed = Math.max(this.elapsed, 95); },
      skip: (s) => { this.elapsed += s; },
      breakout: () => { if (!this.hunting) this.elapsed = BREAKOUT_T + 0.1; },
      win: () => this._win(),
      lose: () => this._lose(),
      tp_exit: () => { this.px = this.exitPos.x; this.pz = this.exitPos.z; this._syncCamera(); },
      state: () => ({ elapsed: this.elapsed.toFixed(1), lag: this.lag.toFixed(2), hunting: this.hunting, state: this.state }),
    };
  }
}
