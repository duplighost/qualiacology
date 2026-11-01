// A boss stage, drawn and played: the rival on her board, the rings that close on her, what she
// throws and what comes down the road at you, the duel, the pin, the kiss, her heart in pieces
// along the top of the screen, and the camera going where the song takes it (side on for the race,
// face to face for the duel). The rules are boss-core.js; this is what you see and hear of them.

import * as THREE from 'three';
import { BossCore } from './boss-core.js';
import { BossSound } from './boss-sound.js';
import { RiderView } from './riderview.js';
import { mountBoard } from './hoverboard.js';
import { SKATERS } from './skaters.js';
import { haptics } from './haptics.js';
import { tintV } from './scenery.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const WHITE = new THREE.Color(1, 1, 1);
const PINK = new THREE.Color(1, 0.3, 0.62);
const GOLD = new THREE.Color(1, 0.82, 0.4);
const RED = new THREE.Color(1, 0.16, 0.12);
const AMBER = new THREE.Color(1, 0.62, 0.12);
// (colour arrays handed to the scenery's glows: made once, never changed)
const FIRE = [[1, 0.5, 0.12], [1, 0.62, 0.18], [1, 0.38, 0.08], [1, 0.75, 0.3]], HEAD = [1, 0.94, 0.8], TAIL = [1, 0.08, 0.1];
const BLINK = [1, 0.62, 0.12], SIREN_R = [1, 0.06, 0.08], SIREN_B = [0.12, 0.3, 1], POLICE = [0.92, 0.93, 0.98], COP_BODY = [0.1, 0.11, 0.14];
const CAR_TINTS = [[0.85, 0.82, 0.88], [0.22, 0.23, 0.27], [1, 0.42, 0.55], [0.55, 0.72, 1], [0.95, 0.88, 0.7]];
const DUST = [0.55, 0.45, 0.35];

// ---------- a ring that closes on someone, drawn over everything, the same size on screen ----------
const RING_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0)); }`;
const RING_FS = /* glsl */`
uniform vec3 uCol, uTgt; uniform float uR, uA, uFlash, uArc, uMode, uBeat, uCrack;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float d = length(p);
  float ang = fract(atan(p.x, p.y) / 6.2832 + 1.0);   // 0 at the top, round clockwise
  // the mark: where the ring closes to, thin
  float tgt = exp(-pow((d - 0.42) / 0.016, 2.0));
  // the fuse (the pin): a thicker cord round the clock from the top, burning back to it; what's
  // left bright, what's burnt a dim red line, and the burning end a white-hot spark
  float arc = 1.0;
  vec3 tip = vec3(0.0);
  if (uMode > 0.5) {
    float cord = exp(-pow((d - 0.42) / 0.042, 2.0));
    float lit = step(ang, uArc);
    tgt = cord * mix(0.22, 1.7, lit);
    vec2 tp = 0.42 * vec2(sin(uArc * 6.2832), cos(uArc * 6.2832));
    float td = length(p - tp);
    tip = vec3(1.0, 0.85, 0.55) * (exp(-td * td * 500.0) * 4.0 + exp(-td * td * 90.0) * 0.8) * (0.8 + 0.4 * uBeat);
  }
  // the closing ring, thicker on the beat; a broken one has gaps in it
  float w = 0.03 + 0.025 * uBeat;
  float ring = exp(-pow((d - uR) / w, 2.0)) * (uR > 0.0 ? 1.0 : 0.0);
  if (uCrack > 0.0) ring *= step(0.35, fract(ang * 7.0 + d * 3.0)) * (1.0 - uCrack);
  // a hit: the inside lights up
  float fill = (1.0 - smoothstep(0.0, 0.44, d)) * uFlash + exp(-pow((d - 0.42) / 0.08, 2.0)) * uFlash * 0.8;
  vec3 col = uTgt * tgt * 0.85 * arc + uCol * ring * 1.7 + mix(uCol, vec3(1.0), 0.4) * fill * 1.4 + tip;
  col *= 1.0 - smoothstep(0.92, 1.0, d);
  gl_FragColor = vec4(col * uA, 1.0);
}`;
class Ring {
  constructor(scene) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color() }, uTgt: { value: new THREE.Color(1, 1, 1) }, uR: { value: 1 }, uA: { value: 0 }, uFlash: { value: 0 }, uArc: { value: 1 }, uMode: { value: 0 }, uBeat: { value: 0 }, uCrack: { value: 0 } },
      vertexShader: RING_VS, fragmentShader: RING_FS,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 30; this.mesh.visible = false;
    scene.add(this.mesh);
    this.u = this.mat.uniforms;
  }
  // at p, facing the camera, the mark `frac` of the screen's height across
  place(p, camera, frac) {
    const m = this.mesh;
    m.position.copy(p); m.quaternion.copy(camera.quaternion);
    const d = Math.max(0.5, p.distanceTo(camera.position));
    const H = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    m.scale.setScalar(H * frac / 0.84);
    m.visible = true;
  }
  hide() { this.mesh.visible = false; }
}

// ---------- the marks on the road where something will be when you get there ----------
const MARK_VS = `attribute vec4 aCol; varying vec4 vC; varying vec2 vUv; void main(){ vUv = uv; vC = aCol; gl_Position = projectionMatrix * (modelViewMatrix * instanceMatrix * vec4(position, 1.0)); }`;
const MARK_FS = /* glsl */`varying vec4 vC; varying vec2 vUv;
float aaRing(float d, float r, float w){ float fw = fwidth(d); return 1.0 - smoothstep(w - fw, w + fw, abs(d - r)); }
void main(){
  vec2 p = (vUv - 0.5) * 2.0; float d = length(p);
  // a thin ring round where it'll be, a faint floor inside it, and a cross through it: not here
  float ring = aaRing(d, 0.88, 0.045);
  float fill = (1.0 - smoothstep(0.2, 0.88, d)) * 0.07;
  vec2 q = abs(mat2(0.7071, -0.7071, 0.7071, 0.7071) * p);
  float x = (1.0 - smoothstep(0.035, 0.07, min(q.x, q.y))) * (1.0 - smoothstep(0.5, 0.6, d));
  gl_FragColor = vec4(vC.rgb * (ring + fill + x * 0.75 * vC.a), 1.0);
}`;
// over her head, wherever she is: a diamond in her colour (on the beat, a little bigger)
const PIN_FS = /* glsl */`uniform vec3 uCol; uniform float uA, uBeat; varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float dm = abs(p.x) * 1.35 + abs(p.y + 0.15) * 0.95;
  float body = 1.0 - smoothstep(0.42, 0.5, dm);
  float edge = exp(-pow((dm - 0.5) / 0.05, 2.0));
  float glow = exp(-dm * dm * 6.0) * 0.5;
  gl_FragColor = vec4((uCol * (body * (0.55 + 0.45 * uBeat) + glow) + vec3(1.0) * edge * 0.6) * uA, 1.0);
}`;

// a bottle, a sawhorse with its lamp
function bottleGeometry() {
  const pts = [[0, 0], [0.11, 0], [0.12, 0.02], [0.12, 0.3], [0.1, 0.36], [0.045, 0.42], [0.04, 0.55], [0.046, 0.56], [0.046, 0.6], [0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y - 0.3));
  return new THREE.LatheGeometry(pts, 10);
}
function sawhorseGeometry() {
  const parts = [];
  const box = (w, h, d, x, y, z, rgb) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.set(rgb, i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g.toNonIndexed(); };
  // the board: orange and white stripes
  for (let i = 0; i < 6; i++) parts.push(box(0.32, 0.3, 0.06, -0.8 + i * 0.32, 0.95, 0, i % 2 ? [0.95, 0.93, 0.9] : [1, 0.42, 0.06]));
  parts.push(box(1.9, 0.07, 0.08, 0, 1.12, -0.02, [0.2, 0.2, 0.22]));
  for (const x of [-0.82, 0.82]) for (const z of [-0.22, 0.22]) { const g = new THREE.BoxGeometry(0.06, 1.1, 0.06); g.rotateX(z > 0 ? -0.2 : 0.2); g.translate(x, 0.52, z); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let k = 0; k < n; k++) c.set([0.3, 0.3, 0.32], k * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(g.toNonIndexed()); }
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.scale(1.25, 1.25, 1.25);
  return g;
}

export class BossStage {
  // env: { sound, kit, hud, chase, post, camera, rider (your skater's id), board (your board's id), step(e) }
  constructor(S, scene, env) {
    this.S = S; this.env = env;
    const c = S.course, P = S.P, cfg = S.entry.boss;
    this.cfg = cfg;
    this.core = env.core || new BossCore(c, cfg);
    this.snd = new BossSound(env.sound, env.kit);
    // her: someone other than you, on a board other than yours, in the cold colours of leaving
    const rc = cfg.rival || {};
    this.col = new THREE.Color(rc.color ?? 0x9fe7ff);
    this.colArr = [this.col.r, this.col.g, this.col.b];
    const rid = rc.rider !== env.rider ? rc.rider : rc.alt, bid = rc.board !== env.board ? rc.board : rc.altBoard;
    const P2 = { ...P, edge: rc.color ?? 0x9fe7ff, rim: rc.rim ?? 0xbfefff, fret: 0xe6f8ff, board: 0x1c2232, keyLight: 0xcfe6ff, jacket: 0x16181f, suit: 0x23262f, hair: 0x15121a, shoes: 0xdfe6f0, gloves: 0x101218 };
    this.view = new RiderView(scene, P2, SKATERS.find((s) => s.id === rid) || null);
    this.view.key.intensity = 6;
    this.view.tempo = S.view.tempo;
    this.board = mountBoard(this.view, scene, bid);
    this.ready = this.view.ready;
    // the rings: one on her (a tag, the kiss), four on you (the duel's answers), the fuse
    this.rings = [0, 1, 2, 3, 4, 5].map(() => new Ring(scene));
    this.tagRing = this.rings[0]; this.fuseRing = this.rings[5];
    // the marks on the road, the bottles, the barriers
    const mg = new THREE.PlaneGeometry(1, 1); mg.rotateX(-Math.PI / 2);
    this.markCol = new THREE.InstancedBufferAttribute(new Float32Array(64 * 4), 4); this.markCol.setUsage(THREE.DynamicDrawUsage);
    mg.setAttribute('aCol', this.markCol);
    this.marks = new THREE.InstancedMesh(mg, new THREE.ShaderMaterial({ vertexShader: MARK_VS, fragmentShader: MARK_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -4 }), 64);
    this.bottles = new THREE.InstancedMesh(bottleGeometry(), new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.15, metalness: 0.2, emissive: 0x6a2a06, emissiveIntensity: 0.9, transparent: false }), 48);
    this.horses = new THREE.InstancedMesh(sawhorseGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.12 }), 48);
    this.horses.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * 2.2;'); };
    for (const m of [this.marks, this.bottles, this.horses]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    // the diamond over her head
    this.pinMat = new THREE.ShaderMaterial({ uniforms: { uCol: { value: this.col.clone().multiplyScalar(1.6) }, uA: { value: 0 }, uBeat: { value: 0 } }, vertexShader: RING_VS, fragmentShader: PIN_FS, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true });
    this.marker = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.pinMat);
    this.marker.frustumCulled = false; this.marker.renderOrder = 29; scene.add(this.marker);
    // her heart, in pieces along the top
    this.hudEl = document.getElementById('boss');
    // working things
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._f = new THREE.Vector3(); this._r = new THREE.Vector3(); this._u = new THREE.Vector3(); this._z = new THREE.Vector3(); this._c = new THREE.Color();
    this._camPos = new THREE.Vector3(); this._camLook = new THREE.Vector3();
    this.camK = 0; this.camKind = null;
    this.lunge = null; this.flash = 0; this.herBail = 0; this.scheduled = new Set();
    this.fuseOn = false; this.ending = null;
    this.start();
  }

  // the start line: beside you, waiting
  start() {
    const S = this.S, r = S.rider;
    this.core.reset(r.t);
    this.core.lead = 0; this.core.side = -1;
    this.core.rival.x = -2.6;
    this.scheduled.clear(); this.lunge = null; this.flash = 0; this.herBail = 0; this.ending = null;
    this.snd.fuseOff(0.01); this.fuseOn = false;
    this._hud(true);
  }

  // ---------- her heart along the top ----------
  _hud(reset = false) {
    const el = this.hudEl;
    if (!el) return;
    if (reset) {
      el.style.setProperty('--boss', '#' + this.col.getHexString());
      const parts = el.querySelector('.parts');
      parts.innerHTML = Array.from({ length: this.core.parts }, () => '<i></i>').join('');
      this.pieces = [...parts.children];
      this._shown = 0;
    }
    const n = this.core.taken;
    while (this._shown < n && this.pieces) {
      const i = this.pieces.length - 1 - this._shown++;
      const p = this.pieces[i]; if (!p) break;
      p.classList.add('gone');
      p.animate([{ transform: 'scale(1.9, 2.6)', filter: 'brightness(3)', opacity: 1 }, { transform: 'scale(1)', filter: 'brightness(1)', opacity: 0.14 }], { duration: 520, easing: 'ease-out' });
    }
  }
  show(on) { if (this.hudEl) this.hudEl.classList.toggle('on', !!on); }

  // ---------- each frame, after the physics and her own update ----------
  update(dt, beat, time, riding) {
    const S = this.S, core = this.core, r = S.rider, c = S.course, track = S.track, t = r.t;
    const cam = this.env.camera;
    // her events: throws, landings, the boards meeting
    for (const e of core.events) this._event(e);
    core.events.length = 0;
    // she rides: her board, her light, and gone up the road when she's left you
    const her = core.rival;
    this.view.update(track, her, dt, beat);
    this.view.setTint(0.85);
    this.view.key.position.set(0.9, 2.7, -2.4).lerp(this.keyAt(this._s), this.camK);
    if (this.board) this.board.update(dt, { speed: her.v, beat, boost: clamp(0.5 + 0.5 * Math.abs(core.leadV), 0, 1), airborne: !her.grounded });
    const gone = core.lead > 3.2;
    this.view.root.visible = !gone; this.view.pool.visible = !gone;
    // her diamond: up the road over the hills where she is; not needed once she's beside you
    {
      const mk = this.marker, hp = this._a.copy(this.view.root.position); hp.y += 2.75;
      const d = Math.max(0.5, hp.distanceTo(cam.position));
      const H = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      mk.position.copy(hp); mk.quaternion.copy(cam.quaternion); mk.scale.setScalar(H * 0.046);
      this.pinMat.uniforms.uA.value = gone || !riding || this.camKind ? 0 : smooth(0.25, 0.6, Math.abs(core.lead)) * (1 - smooth(2.6, 3.2, core.lead));
      this.pinMat.uniforms.uBeat.value = beat;
      mk.visible = this.pinMat.uniforms.uA.value > 0.01;
    }
    // off the start line on the first note: a burst of her colour and the rush of her going
    const mode = core.moveAt(t).mode;
    if (riding && this._mode === 'start' && mode !== 'start') {
      const bp = this.view.board ? this.view.board.getWorldPosition(this._b) : this.view.root.position;
      this.S.sparks.emit(bp, this._u.set(0, 1.5, 0), this._c.copy(this.col).multiplyScalar(3), 70, { spread: 9, life: 0.7, size: 0.2, grav: 3, up: 1.2 });
      this.env.sound.whoosh(1.1);
    }
    this._mode = mode;
    // a tag on its way: the two boards lean in to meet on the downbeat, then spring apart
    this._lunge(dt, t);
    this.herBail *= Math.exp(-dt * 3);
    if (this.herBail > 0.02) this.view.bail = Math.max(this.view.bail || 0, this.herBail);
    // the rings
    this._rings(dt, t, beat, cam);
    // sounds put on their beats a little ahead (and the pin's fuse again, back from a pause)
    if (riding) this._schedule(t);
    if (riding && !this.fuseOn && core.holdingPin(t)) { this.snd.fuseOn(core.pin.tr); this.fuseOn = true; }
    // the marks and the things on the road
    this._road(t, beat);
    this.flash *= Math.exp(-dt * 6);
    this._hud();
    // the camera, where the song sends it
    this._camera(dt, t, riding);
  }

  _event(e) {
    const S = this.S, h = e.h;
    switch (e.type) {
      case 'arm': if (h.kind === 'bottle') this.snd.throw(h.t0); if (h.kind === 'cop') this.snd.land('cop', h.t0, 0.8); break;
      case 'contact': this._contact(e.q); break;
      case 'pinPull': this.snd.pull(); this.snd.fuseOn(this.core.pin.tr); this.fuseOn = true; this.flash = Math.max(this.flash, 0.4); haptics.buzz([14], 2); break;
      case 'pinFail': this.snd.fuseOff(); this.fuseOn = false; if (e.why === 'early') this.snd.fizzle(); break;
      case 'raceEnd': if (e.won) this._burstAt(S.view.root.position, GOLD, 50); break;
    }
  }

  // the rider's own events for the stage (main.js hands them over)
  onEvent(e) {
    const S = this.S, env = this.env, hud = env.hud, r = S.rider;
    const g = e.grade;
    switch (e.type) {
      case 'tag': case 'kiss': {
        if (g === 'miss') { this.snd.miss(); hud.judge('miss', 0, 0); env.broken(e); this._crackT = 0.45; break; }
        this.snd.zing(g);
        this.snd.contact(e.q.contact, e.type === 'kiss');
        hud.judge(g, e.streak, e.points);
        env.step(e);
        // the boards lean in to meet on the downbeat
        this.lunge = { q: e.q, from: r.t, to: e.q.contact, side: Math.sign((this.core.rival.x - r.x) || 1) };
        this._ringHit = 1;
        env.chase.punch(0.6); S.burst = Math.max(S.burst || 0, 0.7);
        haptics.buzz(g === 'perfect' ? [14, 30, 14] : [12], 2);
        break;
      }
      case 'duel': {
        if (g === 'miss') { this.snd.miss(); hud.judge('miss', 0, 0); env.broken(e); break; }
        const idx = e.note ? this._noteIndex(e.note) : 0;
        this.snd.answer(idx, g);
        hud.judge(g, e.streak, e.points);
        env.step(e);
        this._answerFlash = { note: e.note, k: 1 };
        this._burstAt(S.view.board ? S.view.board.getWorldPosition(this._a) : S.view.root.position, g === 'perfect' ? GOLD : WHITE, 18);
        haptics.buzz([10], 2);
        break;
      }
      case 'duelRound': hud.points(e.points, S.view.root, env.camera, ''); hud.bump(1.2); break;
      case 'pin': {
        if (g === 'miss') { this.snd.fuseOff(); this.fuseOn = false; hud.judge('miss', 0, 0); env.broken(e); break; }
        this.snd.fuseOff(0.02); this.fuseOn = false;
        this.snd.boom(this.core.pin.tr, g === 'perfect' ? 1 : 0.75);
        hud.judge(g, e.streak, e.points);
        env.step(e);
        S.flash = Math.max(S.flash, 0.42); env.post.comp.uniforms.uFlashColor.value.setRGB(1, 0.7, 0.45); S.flashTint = 1;
        env.chase.impulse(1.0, 0.4, 2.2); env.chase.punch(1.2);
        S.burst = 1; S.aberrK = 1.6;
        this._burstAt(S.view.root.position, new THREE.Color(1, 0.6, 0.25), 140, 16);
        this._burstAt(S.view.root.position, new THREE.Color(1, 0.9, 0.7), 60, 10);
        for (let i = 0; i < 5; i++) S.rings.fire(new THREE.Color().setHSL(0.03 + i * 0.05, 1, 0.6).multiplyScalar(2.6), 5 + i * 2.2, 0.6 + 0.1 * i, 0.06, i * 0.05);
        haptics.buzz([60, 30, 90], 5);
        break;
      }
      case 'hazard': {
        this.snd.hit();
        hud.judge('miss', 0, 0);
        env.broken(e);
        S.hurt = 1; S.muffle = Math.max(S.muffle, 0.7);
        env.chase.impulse(1.3, 0.6, 0);
        this._burstAt(S.view.root.position, e.h.kind === 'bottle' ? new THREE.Color(1, 0.5, 0.15) : new THREE.Color(1, 0.75, 0.5), 60, 9);
        haptics.buzz([70, 30, 110], 5);
        break;
      }
      case 'dodge': case 'close': {
        this.snd.dodge(e.type === 'close');
        if (e.type === 'close') { hud.points(e.points, S.view.root, env.camera, 'CLOSE', true); haptics.buzz([8], 1); }
        break;
      }
      case 'race': hud.points(e.points, S.view.root, env.camera, 'AHEAD'); break;
    }
  }

  _noteIndex(note) { for (const r of this.core.duel) { const i = r.answer.indexOf(note); if (i >= 0) return i; } return 0; }

  // the boards meeting: sparks of both colours where they touch, a flash, her knocked sideways
  _contact(q) {
    const S = this.S, env = this.env, big = q.kiss;
    const a = S.view.root.position, b = this.view.root.position;
    const mid = this._b.copy(a).lerp(b, 0.5); mid.y += 0.5;
    this._burstAt(mid, PINK, big ? 160 : 45, big ? 14 : 7);
    this._burstAt(mid, this.col, big ? 160 : 45, big ? 14 : 7);
    this._burstAt(mid, WHITE, big ? 60 : 14, 5);
    S.rings.fire(this.col.clone().multiplyScalar(2.2), big ? 9 : 4.5, big ? 0.8 : 0.45, 0.06);
    S.rings.fire(PINK.clone().multiplyScalar(2.2), big ? 7 : 3.5, big ? 0.7 : 0.4, 0.06, 0.05);
    S.flash = Math.max(S.flash, big ? 0.2 : 0.09); env.post.comp.uniforms.uFlashColor.value.copy(PINK).lerp(this.col, 0.5).lerp(WHITE, 0.3); S.flashTint = 1;
    env.chase.impulse(big ? 1.1 : 0.4, 0.3, big ? 2.4 : 0.9);
    env.chase.punch(big ? 1.6 : 0.7);
    S.burst = 1; S.aberrK = big ? 2 : 0.6;
    this.herBail = big ? 1 : 0.8;
    haptics.buzz(big ? [40, 30, 40, 30, 120] : [24, 20, 30], big ? 5 : 3);
    if (big) { this.kissed = true; for (let i = 0; i < 12; i++) { const from = S.track.ground(S.rider.t + 2.2 + i * 0.18, (i % 2 ? 1 : -1) * (30 + Math.random() * 30), new THREE.Vector3()); const to = from.clone(); to.y = 40 + Math.random() * 30; setTimeout(() => S.fireworks.launch(from, to, 1.1), i * 90); } }
  }

  _burstAt(p, color, n, spread = 8) {
    this.S.sparks.emit(p, this._u.set(0, 2.5, 0), this._c.copy(color).multiplyScalar(3), n, { spread, life: 0.8, size: 0.22, grav: 5, up: 1.4 });
  }

  // between the press and the downbeat, the boards lean in; on it they touch and spring apart
  _lunge(dt, t) {
    const S = this.S, L = this.lunge;
    let k = 0;
    if (L) {
      if (t < L.to) k = smooth(L.from, L.to, t);
      else { k = Math.max(0, 1 - (t - L.to) / 0.35); if (k <= 0) this.lunge = null; }
      k = k * k;
    }
    if (k <= 0) return;
    const her = this.core.rival, d = her.x - S.rider.x;
    // each goes a third of the way, so they meet in the middle-ish (never through each other)
    const reach = Math.max(0, Math.abs(d) - 1.1) * 0.5 * k * Math.sign(d);
    S.track.dirAt(S.rider.t, this._f);
    const right = this._r.set(-this._f.z, 0, this._f.x).normalize();
    S.view.root.position.addScaledVector(right, reach);
    this.view.root.position.addScaledVector(right, -reach);
    S.view.root.rotation.z -= 0.35 * k * Math.sign(d);
    this.view.root.rotation.z += 0.35 * k * Math.sign(d);
  }

  // ---------- the rings: on her for a tag, on you for the duel and the pin ----------
  _rings(dt, t, beat, cam) {
    const S = this.S, core = this.core;
    for (const rg of this.rings) rg.hide();
    if (this.S.rider.stopping) return;
    this._ringHit = Math.max(0, (this._ringHit || 0) - dt * 3);
    this._crackT = Math.max(0, (this._crackT || 0) - dt);
    // the next tag
    const herChest = this.view.root.getWorldPosition(this._a); herChest.y += 1.05;
    let q = null;
    for (const x of core.tags) { if (!x.done || (x.done && t < x.t + 0.45)) { q = x; break; } }
    if (q && t > q.t - 2.4 && t < q.t + 0.45 && this.view.root.visible) {
      const u = this.tagRing.u, ahead = q.t - t;
      const pend = !q.done;
      u.uR.value = pend ? 0.42 + 0.58 * clamp(ahead / 2.4, 0, 1) : (q.grade === 'miss' ? 0 : 0.42 + (t - q.t) * 2.2);
      u.uA.value = (pend ? smooth(-2.4, -1.9, -ahead) : clamp(1 - (t - q.t) / 0.45, 0, 1)) * (q.kiss ? 1.25 : 1);
      u.uBeat.value = beat;
      u.uFlash.value = q.done && q.grade !== 'miss' ? clamp(1 - (t - q.t) / 0.3, 0, 1) : 0;
      u.uCrack.value = q.done && q.grade === 'miss' ? clamp(1 - this._crackT / 0.45, 0, 1) * 0.9 + 0.1 : 0;
      // her colour far off, gold as it closes
      u.uCol.value.copy(this.col).lerp(GOLD, smooth(0.9, 0.05, ahead));
      if (q.kiss) u.uCol.value.lerp(PINK, 0.5);
      u.uTgt.value.copy(WHITE);
      u.uMode.value = 0;
      this.tagRing.place(herChest, cam, q.kiss ? 0.2 : 0.16);
    }
    // the duel: her bar (her ring lights on each of her notes), then rings closing on you for your answer
    const meChest = S.view.root.getWorldPosition(this._b); meChest.y += 1.05;
    let ri = 1;
    for (const r of core.duel) {
      // her notes
      for (const ct of r.call) {
        const d = t - ct;
        if (d > -0.05 && d < 0.35) {
          const rg = this.tagRing, u = rg.u;
          u.uR.value = 0.42 + d * 1.6; u.uA.value = clamp(1 - d / 0.35, 0, 1); u.uFlash.value = clamp(1 - d / 0.2, 0, 1); u.uBeat.value = 0; u.uCrack.value = 0; u.uMode.value = 0;
          u.uCol.value.copy(this.col); u.uTgt.value.copy(this.col);
          rg.place(herChest, cam, 0.13);
        }
      }
      // yours
      for (const n of r.answer) {
        const ahead = n.t - t, span = 0.7;
        if (ahead > span || ahead < -0.4 || ri > 4) continue;
        const rg = this.rings[ri++], u = rg.u;
        u.uMode.value = 0; u.uBeat.value = beat; u.uCrack.value = n.grade === 'miss' ? 0.6 : 0;
        if (!n.done || ahead > 0) { u.uR.value = 0.42 + 0.58 * clamp(ahead / span, 0, 1); u.uA.value = smooth(span, span - 0.2, ahead); u.uFlash.value = 0; }
        else { u.uR.value = n.grade === 'miss' ? 0 : 0.42 - ahead * 2; u.uA.value = clamp(1 + ahead / 0.4, 0, 1); u.uFlash.value = n.grade !== 'miss' ? clamp(1 + ahead / 0.25, 0, 1) : 0; }
        u.uCol.value.copy(PINK).lerp(GOLD, smooth(0.4, 0.05, ahead)); u.uTgt.value.copy(WHITE);
        rg.place(meChest, cam, 0.13);
      }
    }
    // the pin: a ring closing on you for "pin"; held, the fuse burning round to the drop
    const pn = core.pin;
    if (pn) {
      const rg = this.fuseRing, u = rg.u;
      if (!pn.pressed && !pn.done && t > pn.tp - 1.8 && t < pn.tp + 0.25) {
        const ahead = pn.tp - t;
        u.uMode.value = 0; u.uR.value = 0.42 + 0.58 * clamp(ahead / 1.8, 0, 1); u.uA.value = smooth(1.8, 1.4, ahead); u.uFlash.value = 0; u.uBeat.value = beat; u.uCrack.value = 0;
        u.uCol.value.copy(AMBER).lerp(GOLD, smooth(0.6, 0.05, ahead)); u.uTgt.value.copy(WHITE);
        rg.place(meChest, cam, 0.16);
      } else if (pn.pressed && !pn.done) {
        const left = clamp((pn.tr - t) / (pn.tr - pn.tp), 0, 1);
        // (the last bar: the ring closes in again on the drop, where you let go)
        const lastBar = 4 * (60 / (S.course.chart.bpm || 120));
        const closing = clamp((pn.tr - t) / lastBar, 0, 1);
        u.uMode.value = 1; u.uArc.value = left; u.uR.value = closing < 1 ? 0.42 + 0.58 * closing : 0; u.uA.value = 1; u.uFlash.value = 0; u.uBeat.value = beat; u.uCrack.value = 0;
        u.uCol.value.copy(AMBER).lerp(GOLD, smooth(0.5, 0.0, closing)); u.uTgt.value.copy(AMBER).lerp(RED, 0.5 * (1 - left));
        rg.place(meChest, cam, 0.22);
        // a spark or two off the burning end of it
        if (Math.random() < 0.35) {
          const ang = left * Math.PI * 2, sc = rg.mesh.scale.x * 0.21;
          const right = this._r.set(1, 0, 0).applyQuaternion(cam.quaternion), up = this._u.set(0, 1, 0).applyQuaternion(cam.quaternion);
          const sp = this._z.copy(meChest).addScaledVector(right, Math.sin(ang) * sc).addScaledVector(up, Math.cos(ang) * sc);
          S.sparks.emit(sp, this._f.set(0, 0.6, 0), this._c.setRGB(2.6, 1.6, 0.5), 1, { spread: 2.2, life: 0.3, size: 0.06, grav: 7, jitter: 0.02 });
        }
      } else if (pn.done && (pn.grade === 'perfect' || pn.grade === 'good') && t > pn.tr - 0.25 && t < pn.tr + 0.4) {
        const d = t - pn.tr;
        u.uMode.value = 0; u.uR.value = 0.42 + d * 3; u.uA.value = clamp(1 - d / 0.4, 0, 1); u.uFlash.value = clamp(1 - d / 0.25, 0, 1); u.uCrack.value = 0;
        u.uCol.value.copy(GOLD); u.uTgt.value.copy(WHITE);
        rg.place(meChest, cam, 0.18);
      }
    }
  }

  // ---------- sounds put on their beats ----------
  _schedule(t) {
    const core = this.core, c = this.S.course, sc = this.scheduled;
    const soon = (x) => x > t - 0.02 && x < t + 0.35;
    // the beat before each ring closes
    for (const q of core.tags) { const tk = c.timeOfBeat(c.beatAt(q.t) - 1); if (!q.done && soon(tk) && !sc.has(q)) { sc.add(q); this.snd.tick(tk, q.kiss ? 1.4 : 1); } }
    for (const h of core.hazards) {
      if (h.done) continue;
      if (h.kind === 'car') {
        const hk = c.timeOfBeat(c.beatAt(h.tp) - 1);
        // (a horn the beat before it reaches you, but never more than one a bar: a street of them
        // honking on every beat was too much)
        if (soon(hk) && !sc.has(h)) { sc.add(h); if (hk - (this._hornT ?? -9) > 1.3) { this._hornT = hk; this.snd.horn(hk, h.x < 0); } this.snd.pass(h.tp, 0.9); }
      } else if (h.kind !== 'barrier' && h.kind !== 'cop' && soon(h.tl) && !sc.has(h)) { sc.add(h); this.snd.land(h.kind, h.tl, 1); }
    }
    for (const r of core.duel) r.call.forEach((ct, i) => { const key = r.call[i] + 'c'; if (soon(ct) && !sc.has(key)) { sc.add(key); this.snd.call(ct, i); } });
  }

  // ---------- the marks on the road and the bottles and barriers ----------
  _road(t, beat) {
    const S = this.S, core = this.core, track = S.track, c = S.course;
    const m = this._m, q = this._q, s = this._s, p = this._p;
    let nm = 0, nb = 0, nh = 0;
    for (const h of core.hazards) {
      if (h.tp < t - 0.6) continue;
      if (h.t0 > t + 0.02 && h.kind !== 'barrier') continue;
      if (h.tp > t + 11) break;
      // the mark where it'll be when you get there: from when it's thrown (or a few seconds out)
      if (!h.done && nm < 64 && (h.armed || h.kind === 'barrier' || h.kind === 'car') && h.tp - t < 6.5) {
        this._roadAt(h.tp, h.x, 0.07, p, q);
        const r = (h.w + 0.45) * 2.1;
        m.compose(p, q, s.set(r, 1, r));
        this.marks.setMatrixAt(nm, m);
        // (bright as it comes, pulsing on the beat; gone just before it's under you, so it never
        // floods the bottom of the screen)
        const pulse = 0.6 + 0.4 * beat, near = smooth(6.5, 3, h.tp - t) * smooth(0.02, 0.3, h.tp - t);
        const col = h.kind === 'barrier' ? AMBER : RED, k = pulse * near * 0.95;
        this.markCol.setXYZW(nm, col.r * k, col.g * k, col.b * k, h.kind === 'car' ? 0.4 : 1);
        nm++;
      }
      if (h.kind === 'bottle' && nb < 48) {
        // from her hand, end over end, onto the road on the snare; then broken, burning
        if (t < h.tl) {
          const u = clamp((t - h.t0) / Math.max(0.1, h.tl - h.t0), 0, 1);
          const from = h._from || (h._from = { t: h.t0 + core.lead, x: core.rival.x });
          const ct = from.t + (h.tp - from.t) * u, cx = from.x + (h.x - from.x) * u;
          track.at(ct, cx, 1.4 * (1 - u) + 3.2 * Math.sin(Math.PI * u) + 0.15, p);
          this._e.set(u * 9, u * 3, u * 5); q.setFromEuler(this._e);
          m.compose(p, q, s.set(1.5, 1.5, 1.5));
          this.bottles.setMatrixAt(nb++, m);
        }
      } else if (h.kind === 'barrier' && nh < 48) {
        this._roadAt(h.tp, h.x, 0.02, p, q);
        m.compose(p, q, s.set(1, 1, 1));
        this.horses.setMatrixAt(nh++, m);
      }
    }
    this.marks.count = nm; this.bottles.count = nb; this.horses.count = nh;
    this.marks.instanceMatrix.needsUpdate = true; this.markCol.needsUpdate = true;
    this.bottles.instanceMatrix.needsUpdate = true; this.horses.instanceMatrix.needsUpdate = true;
  }

  // a point on the road (song time t, across x, h above) and the road's own turn there
  _roadAt(t, x, h, out, q) {
    const track = this.S.track;
    track.at(t, x, h, out);
    const f = track.dirAt(t, this._f);
    const right = this._r.set(-f.z, 0, f.x).normalize().applyAxisAngle(f, -track.bankAt(t));
    const up = this._u.crossVectors(right, f).normalize();
    if (up.y < 0) up.negate();
    const z = this._z.crossVectors(right, up).normalize();
    this._m2 = this._m2 || new THREE.Matrix4();
    this._m2.makeBasis(right, up, z);
    q.setFromRotationMatrix(this._m2);
    return out;
  }

  // ---------- drawn through the scenery's layers: the cars, the rocks, the cops, the fires, her light ----------
  draw(T) {
    const S = this.S, core = this.core, track = S.track, c = S.course, t = S.rider.t;
    const L = T.layers, m = this._m, q = this._q, s = this._s, p = this._p, e = this._e;
    const time = S.tNow ?? t;
    // her light: so she reads from up the road (gone as she comes near: close to, it made her a ghost)
    if (this.view.root.visible) {
      const hp = this.view.root.position, cd = hp.distanceTo(this.env.camera.position);
      const k = smooth(9, 26, cd);
      if (k > 0.01) T.glow(hp.x, hp.y + 1.1, hp.z, 3.2, this.colArr, (0.55 + 0.25 * (S.lift ? S.lift.beat || 0 : 0)) * k);
    }
    const beatF = c.beatAt(t) % 1, eighth = (c.beatAt(t) * 2) % 2 < 1;
    for (const h of core.hazards) {
      if (h.tp < t - 1.2) continue;
      if (h.tp > t + 11) break;
      if (h.kind === 'car') {
        if (t < h.t0) continue;
        // coming the wrong way down her road at you, passing on its beat
        const k = 0.55, ct = h.tp - k * (t - h.tp);
        if (ct < t - 0.6) continue;
        const yaw = c.sample(ct).yaw + Math.PI;
        track.at(ct, h.x, 0.05, p);
        e.set(0, yaw, 0); q.setFromEuler(e);
        m.compose(p, q, s.set(1.3, 1.3, 1.3));
        const tint = CAR_TINTS[h.i % CAR_TINTS.length];
        (L.kcCar || L.car).add(m, tintV(tint));
        const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
        for (const sd of [-0.8, 0.8]) T.glow(p.x + fx * 3 + rx * sd, p.y + 0.85, p.z + fz * 3 + rz * sd, 2.4, HEAD, 2.4);
        T.pool(p.x + fx * 9, p.y + 0.08, p.z + fz * 9, 9, HEAD, 0.6);
      } else if (h.kind === 'rock') {
        if (t < h.t0) continue;
        // off the hill on your left, bouncing, landing on the snare where you were
        const u = clamp((t - h.t0) / Math.max(0.1, h.tl - h.t0), 0, 1);
        let x, y;
        if (u < 1) { x = -38 + (h.x + 38) * u; y = 18 * (1 - u) * (1 - u) + 5 * Math.abs(Math.sin(u * Math.PI * 2)) * (1 - u) + 0.9; }
        else { x = h.x + Math.sin((t - h.tl) * 3) * 0.05; y = 0.9; }
        track.at(h.tp, x, y, p);
        const roll = (x + 38) / 1.2;
        e.set(roll * 0.5, 0.3, roll); q.setFromEuler(e);
        m.compose(p, q, s.set(1.3, 1.3, 1.3));
        if (L.kcRock) L.kcRock.add(m);
        if (u >= 1 && t - h.tl < 0.4) T.pool(p.x, p.y - 0.85, p.z, 6, DUST, 0.35 * (1 - (t - h.tl) / 0.4));
      } else if (h.kind === 'cop') {
        if (t < h.t0) continue;
        // in from the edge of the road on its siren, sitting across your way
        const u = smooth(h.t0, h.tl, t), wd = c.sample(h.tp).width + 2.5;
        const x = Math.sign(h.x || 1) * wd + (h.x - Math.sign(h.x || 1) * wd) * u;
        const yaw = c.sample(h.tp).yaw + (h.x > 0 ? 1 : -1) * (1.2 - 0.5 * u);
        track.at(h.tp, x, 0.05, p);
        e.set(0, yaw, 0); q.setFromEuler(e);
        m.compose(p, q, s.set(1.3, 1.3, 1.3));
        (L.kcCar || L.car).add(m, tintV(eighth ? POLICE : COP_BODY));
        const rx = -Math.cos(yaw), rz = Math.sin(yaw);
        T.glow(p.x + rx * 0.45, p.y + 1.9, p.z + rz * 0.45, 2.6, SIREN_R, eighth ? 3 : 0.5, 2);
        T.glow(p.x - rx * 0.45, p.y + 1.9, p.z - rz * 0.45, 2.6, SIREN_B, eighth ? 0.5 : 3, 3);
        T.pool(p.x, p.y + 0.06, p.z, 10, eighth ? SIREN_R : SIREN_B, 0.7);
      } else if (h.kind === 'barrier') {
        // its lamp blinks on the beat
        track.at(h.tp, h.x, 1.62, p);
        T.glow(p.x, p.y, p.z, 1.7, BLINK, beatF < 0.25 ? 2.6 : 0.35);
        if (beatF < 0.25) T.pool(p.x, p.y - 1.5, p.z, 5, BLINK, 0.5);
      } else if (h.kind === 'bottle' && t >= h.tl) {
        // broken on the road and burning till you're past it
        if (t > h.tp + 0.8) continue;
        track.at(h.tp, h.x, 0.1, p);
        const fade = 1 - smooth(h.tp + 0.3, h.tp + 0.8, t), born = smooth(h.tl, h.tl + 0.12, t);
        for (let j = 0; j < 6; j++) {
          const a = j * 2.4 + h.i, rr = 0.5 * (j % 3) * 0.6;
          const fl = 0.7 + 0.3 * Math.sin(time * (17 + j * 3) + j + h.i);
          T.glow(p.x + Math.cos(a) * rr, p.y + 0.35 + j * 0.22 * fl, p.z + Math.sin(a) * rr, (2.2 - j * 0.22) * born, FIRE[j % 4], 2.4 * fl * fade * born);
        }
        T.pool(p.x, p.y, p.z, 7, FIRE[0], 1.1 * fade * born);
      }
    }
  }

  // ---------- the camera ----------
  // side on for the race, face to face for the duel, low in the air over the freeway, round the kiss
  _camera(dt, t, riding) {
    const core = this.core, cm = riding ? core.camAt(t) : null;
    const want = cm ? 1 : 0;
    // (side on, it swings round to you; the others are cuts, on the beat they start and end on: a
    // blend from under the road or from in front of you went through the road or through you)
    const kind = cm ? cm.kind : this.camKind;
    if (kind !== 'side') { this.camK = want; this.camKind = cm ? cm.kind : null; return; }
    if (cm) this.camKind = cm.kind;
    this.camK += (want - this.camK) * Math.min(1, dt * (want ? 6 : 5));
    if (this.camK < 0.002 && !cm) { this.camK = 0; this.camKind = null; }
  }
  // where a rider's key light goes (in her own frame: +z ahead, +x her left) for the camera now, so
  // neither of you is a silhouette from the side or the front
  keyAt(out) {
    switch (this.camKind) {
      case 'front': return out.set(0.4, 2.3, 3.0);
      case 'side': return out.set(-3.0, 2.2, 0.6);
      case 'air': return out.set(2.4, 0.4, 1.0);
      case 'kiss': return out.set(0.6, 2.4, 2.6);
    }
    return out.set(0.9, 2.7, -2.4);
  }
  // what main.js gives the chase camera: where to be instead, how much, and its lens
  cam(rider) {
    if (!this.camKind || this.camK <= 0) return null;
    const S = this.S, core = this.core, track = S.track, c = S.course, t = rider.t;
    const me = S.view.root.position, her = this.view.root.position;
    const f = track.dirAt(t, this._f); f.y = 0; f.normalize();
    const left = this._r.set(f.z, 0, -f.x);   // (track.js: right is (-cos yaw, 0, sin yaw))
    const pos = this._camPos, look = this._camLook;
    const mid = this._a.copy(me).lerp(her, 0.5);
    const yS = smoothY(c, t);
    let fov = 46;
    switch (this.camKind) {
      case 'side': {
        // from the right side of the road (you ride left to right across the screen, nearer than
        // her), far enough out to keep you both in it
        const sep = Math.min(14, Math.abs(core.lead) * Math.max(20, rider.v));
        const d = Math.min(15, 9.5 + sep * 0.5);
        // (above the road enough to see along its top, the hold colour and the gates on it)
        pos.copy(me).addScaledVector(left, -d); pos.y = Math.max(yS, c.sample(t).y) + 3.6;
        look.copy(mid).lerp(me, 0.35); look.y = yS + 1.0;
        fov = 44;
        break;
      }
      case 'front': {
        // ahead of you both, looking back at you: her on your left, you on her right
        track.at(t + 0.17, -0.4, 1.35, pos);
        pos.y = Math.max(pos.y, yS + 1.45);
        look.copy(mid); look.y += 0.9;
        fov = 40;
        break;
      }
      case 'air': {
        // under you and off to the left, the two of you against the sky over the freeway
        track.at(t + 0.06, -5.0, 0, pos);
        pos.y = Math.max(pos.y + 0.45, mid.y - 1.3);
        look.copy(mid); look.y += 0.8;
        fov = 54;
        break;
      }
      case 'kiss': {
        // off the road's edge, coming round from beside you to ahead of you as the boards meet; low,
        // but never under the road where it stands (from behind, down a hill, it was in the hill)
        const qk = core.tags[core.tags.length - 1];
        const u = clamp((t - (qk.t - 0.05)) / Math.max(0.3, qk.contact - qk.t + 0.7), 0, 1);
        const e = u * u * (3 - 2 * u), a = -0.5 + 1.45 * e;
        const fwd = Math.sin(a) * 6.5 + 1.0, side = 5.2;
        pos.copy(mid).addScaledVector(left, side).addScaledVector(f, fwd);
        const roadHere = c.sample(t + fwd / Math.max(15, rider.v)).y;
        pos.y = Math.max(mid.y + 1.1, roadHere + 1.5);
        look.copy(mid); look.y += 0.8;
        fov = 44;
        break;
      }
    }
    return { k: this.camK, pos, look, fov, lift: 0 };
  }

  // ---------- the end of the song ----------
  stopFrame(rider) {
    const core = this.core;
    rider.heldIn = false;
    if (this.kissed) core.stopWith(rider);
    else { core.fled = true; core._her(rider, 1 / 60); }
  }
  result() {
    const core = this.core, kiss = core.tags.find((q) => q.kiss);
    return { caught: !!(kiss && kiss.grade && kiss.grade !== 'miss'), taken: core.taken, parts: core.parts };
  }
  dispose() { this.snd.fuseOff(0.01); this.show(false); }
}

// the road's height averaged over the hills around t, so the camera rides over them, not with them
function smoothY(c, t) {
  let sum = 0, ws = 0;
  for (let k = -5; k <= 5; k++) { const w = Math.exp(-0.5 * (k * 0.12 / 0.32) ** 2); sum += c.sample(t + k * 0.12).y * w; ws += w; }
  return sum / ws;
}
