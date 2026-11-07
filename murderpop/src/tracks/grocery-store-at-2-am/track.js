// CREDITS: Grocery Store at 2 AM. The run-out groove, and the one track nobody fights.
// A 24-hour store at 2 a.m., half its lights off. The aisle signs are the credits; the narrators' things
// turned up here, on clearance and in lost and found. On every "I see you" a warm light finds YOU.
// Out the doors with your plastic bag; the store's board is revised behind you; the building grieves its
// lights out panel by panel; a hard cut on the last hit.
import * as THREE from 'three';
import { buildStore, makeCart, LANES, DOOR } from './store.js';
import { CharacterKit, Rig } from '../../engine/character.js';
import * as P from './paint.js';

// the song (word times from the vocal map)
const W = {
  swells: [[2.65, 4.23], [5.97, 7.19], [9.39, 11.37]],
  lightsOn: 14.14,                    // "The ceiling hums its hollow hymns"
  man: 28.74, didntSee: 36.42,        // "There's a man in aisle three" / "And I pretend I didn't see"
  girl: 88.2, paper: 95.58, plastic: 101.58,
  see: [56.04, 69.48, 82.9, 129.9, 143.32, 183.5, 196.94, 200.28, 203.66],
  seeAll: 187.16,                     // "Yeah, I really fucking see you"
  cctv0: 158.86, cctv1: 169.6,        // "...a night manager / watching on the black and white screen"
  standing: 171.26, glow: 174.36,     // "And maybe love is just standing / in the same hollow glow"
  slide: 225.58,                      // "The automatic doors slide open"
  cold: 228.44,
  floorOut: 238.48,                   // "...but it's enough": the floor falls out of the music
  swab: 262.9, hollowWord: 275.58, fluorWord: 278.46, eerie: 283.0, grieve: 285.9, coolers: 289.0, sign: 289.4, outro: 289.65,
};
const LIT_LANE = 1, LX = LANES[LIT_LANE];
const TILL = { x: LX + 0.85, z: 3.3 };          // where a customer stands at the lit till
const BAGS = { paper: [LX - 0.2, 0.885, 5.15], plastic: [LX + 0.2, 0.885, 5.15] };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- people: the only two in the game who aren't porcelain ----------
let kit = null;
// clothes painted by region of the bind pose (T-pose, metres): head above the neck, hands past the wrists,
// a top down to the waist, trousers to the ankles, shoes. The top and trousers stand a little proud of the
// body, so they read as cloth. And a warm edge of light: they're the ones the song is looking at.
const DRESS = {
  man: { body: [1.535, 0.69, 0.9, 0.11], top: 0x262b33, bottom: 0x1c1b1a, skin: 0x7d5f50, hair: 0x15110e, shoe: 0x0c0c0c },
  girl: { body: [1.492, 0.625, 0.885, 0.1], top: 0x0e4a46, bottom: 0x141414, skin: 0x8f6c5b, hair: 0x2a1a12, shoe: 0x0c0c0c },
};
function warmMaterial(who) {
  const d = DRESS[who];
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  m.userData.rim = { value: 0.6 };
  const U = { uBody: { value: new THREE.Vector4(...d.body) }, uTop: { value: new THREE.Color(d.top) }, uBottom: { value: new THREE.Color(d.bottom) }, uSkin: { value: new THREE.Color(d.skin) }, uHair: { value: new THREE.Color(d.hair) }, uShoe: { value: new THREE.Color(d.shoe) } };
  const REGION = `
    int mpRegion(vec3 p) {
      if (p.y > uBody.x) return (p.y > uBody.x + 0.17 || (p.y > uBody.x + 0.07 && p.z < -0.035)) ? 4 : 3;
      if (abs(p.x) > uBody.y) return 3;
      if (p.y > uBody.z) return 1;
      if (p.y > uBody.w) return 2;
      return 5;
    }`;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { uRim: m.userData.rim });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec4 uBody; varying vec3 vBind;' + REGION)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position); vBind = position;
        int mpR = mpRegion(position); transformed += normal * (mpR == 1 ? 0.016 : mpR == 2 ? 0.009 : mpR == 5 ? 0.012 : 0.0);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRim; uniform vec4 uBody; uniform vec3 uTop, uBottom, uSkin, uHair, uShoe; varying vec3 vBind;' + REGION)
      .replace('#include <color_fragment>', `#include <color_fragment>
        int mpR = mpRegion(vBind);
        vec3 mpC = mpR == 1 ? uTop : mpR == 2 ? uBottom : mpR == 3 ? uSkin : mpR == 4 ? uHair : uShoe;
        float mpN = fract(sin(dot(floor(vBind * 260.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb = mpC * (mpR == 1 || mpR == 2 ? 0.88 + 0.16 * mpN : 1.0);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float mpFres = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 3.6);
        totalEmissiveRadiance += vec3(1.0, 0.66, 0.42) * mpFres * uRim;`);
  };
  return m;
}
async function person(url, scene, who) {
  if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
  const g = await kit.load(url);
  const model = kit.instance(g);
  const mat = warmMaterial(who), eye = new THREE.MeshStandardMaterial({ color: 0x0a0605, roughness: 0.3 });
  model.traverse((m) => { if (m.isMesh) { m.material = m.name.startsWith('Eye') ? eye : mat; m.castShadow = true; } });
  const rig = new Rig(kit, model);
  scene.add(rig.root);
  return { rig, mat, root: rig.root, look: 0, lightK: 0 };
}

// ---------- the narrators' things ----------
function keepsake(kind, mats) {
  const g = new THREE.Group(); const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b04a, roughness: 0.25, metalness: 0.9 }), brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.3, metalness: 0.85 });
  const pinkEnamel = new THREE.MeshStandardMaterial({ color: 0xff5f9e, roughness: 0.18, metalness: 0.1 });
  const heartShape = () => { const s = new THREE.Shape(); s.moveTo(0, -0.03); s.bezierCurveTo(0.05, 0.005, 0.03, 0.04, 0, 0.022); s.bezierCurveTo(-0.03, 0.04, -0.05, 0.005, 0, -0.03); return new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false }); };
  // A2: the brass house key, on a split ring with a pink enamel heart fob
  if (kind === 'key') { add(new THREE.TorusGeometry(0.035, 0.012, 8, 20), brass, 0, 0.05, 0); add(new THREE.BoxGeometry(0.014, 0.1, 0.008), brass, 0, -0.03, 0); add(new THREE.BoxGeometry(0.03, 0.012, 0.008), brass, 0.012, -0.06, 0); add(new THREE.TorusGeometry(0.022, 0.003, 6, 16), brass, 0, 0.095, 0); add(heartShape(), pinkEnamel, 0.02, 0.07, 0.004); }
  // B3: her long gilt key, her kiss on the bow, on lilac satin ribbon
  if (kind === 'giltkey') { add(new THREE.TorusGeometry(0.04, 0.01, 8, 22), gold, 0, 0.07, 0); add(new THREE.BoxGeometry(0.012, 0.17, 0.008), gold, 0, -0.05, 0); add(new THREE.BoxGeometry(0.036, 0.014, 0.008), gold, 0.014, -0.12, 0); add(new THREE.BoxGeometry(0.03, 0.12, 0.004), mats.lilac, 0, 0.15, 0.006, 0, 0, 0.3); add(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc0103a, roughness: 0.3 }), 0, 0.07, 0.01); }
  // A1: her price tag, torn off the choker
  if (kind === 'tag') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#d8a84a'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120); x.fillStyle = '#111'; x.font = "700 64px 'Space Grotesk', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$29.99', 128, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.BoxGeometry(0.12, 0.003, 0.06), [mats.card, mats.card, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), mats.card, mats.card, mats.card], 0, 0.002, 0);
    add(new THREE.BoxGeometry(0.004, 0.002, 0.09), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }), -0.07, 0.003, 0.03, 0, 0.6, 0);
  }
  // B4: the gold star she awarded herself, one point creased
  if (kind === 'star') { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.022 : 0.055; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) s.lineTo(px, py); else s.moveTo(px, py); } s.closePath(); add(new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xf2c24a, roughness: 0.22, metalness: 0.95 }), 0, 0.004, 0, -Math.PI / 2, 0, 0.12); }
  // B5: the gold pull-ring from her last perfume grenade, PULL on it
  if (kind === 'pin') { add(new THREE.TorusGeometry(0.03, 0.005, 8, 24), gold, 0, 0.006, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.004, 0.004, 0.06), gold, 0.03, 0.006, 0.02, 0, 0.5, 0); }
  if (kind === 'locket') { add(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24), gold, 0, 0.02, 0); add(new THREE.TorusGeometry(0.09, 0.004, 6, 32), gold, 0, 0.012, 0, Math.PI / 2); }
  // A3: her gold gavel charm, on its snapped chain
  if (kind === 'gavel') { add(new THREE.CylinderGeometry(0.006, 0.007, 0.09, 10), gold, 0, 0.01, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 14), gold, -0.045, 0.01, 0, Math.PI / 2); add(new THREE.TorusGeometry(0.05, 0.002, 4, 24, Math.PI * 1.3), gold, 0.03, 0.004, 0, Math.PI / 2); }
  if (kind === 'cereal') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, '#ff2e88'); gr.addColorStop(1, '#ffb347'); x.fillStyle = gr; x.fillRect(0, 0, 256, 320);
    x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(128, 210, 70, 0, 6.3); x.fill(); x.save(); x.translate(128, 70); x.rotate(-0.12); x.fillStyle = '#fff'; x.font = "900 46px 'Archivo Black', sans-serif"; x.textAlign = 'center'; x.fillText('TRY ME', 0, 0); x.fillText('FREE!', 0, 48); x.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const side = new THREE.MeshStandardMaterial({ color: 0xff5a8a, roughness: 0.5 }), face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
    add(new THREE.BoxGeometry(0.26, 0.34, 0.08), [side, side, side, side, face, side], 0, 0.17, 0);
  }
  if (kind === 'teddy') {
    const fur = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 1 }), dark = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 });
    add(new THREE.SphereGeometry(0.1, 16, 12), fur, 0, 0.1, 0); add(new THREE.SphereGeometry(0.075, 16, 12), fur, 0, 0.24, 0.01);
    for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.03, 10, 8), fur, s * 0.055, 0.31, 0); add(new THREE.SphereGeometry(0.035, 10, 8), fur, s * 0.1, 0.12, 0.03); add(new THREE.SphereGeometry(0.04, 10, 8), fur, s * 0.06, 0.03, 0.06); }
    add(new THREE.SphereGeometry(0.012, 8, 6), dark, -0.028, 0.26, 0.072);                       // one button eye
    add(new THREE.BoxGeometry(0.022, 0.004, 0.004), dark, 0.03, 0.26, 0.074, 0, 0, 0.7); add(new THREE.BoxGeometry(0.022, 0.004, 0.004), dark, 0.03, 0.26, 0.074, 0, 0, -0.7); // and where the other was
  }
  if (kind === 'housecoat') {
    const robe = new THREE.LatheGeometry([[0, 0], [0.24, 0], [0.22, 0.4], [0.17, 0.72], [0.09, 0.8], [0, 0.82]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
    robe.scale(1, 1, 0.4);
    add(robe, mats.lilac, 0, -0.84, 0); add(new THREE.BoxGeometry(0.38, 0.03, 0.12), mats.lilac, 0, -0.42, 0.02);
    add(new THREE.TorusGeometry(0.14, 0.006, 6, 20, Math.PI), mats.steel, 0, -0.04, 0); add(new THREE.BoxGeometry(0.008, 0.06, 0.008), mats.steel, 0, 0.0, 0);
  }
  if (kind === 'costume') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 360; const x = c.getContext('2d');
    x.fillStyle = '#16090f'; x.fillRect(0, 0, 256, 360); x.fillStyle = '#ff2e88'; x.fillRect(16, 16, 224, 60); x.fillStyle = '#f7efe4'; x.beginPath(); x.ellipse(128, 210, 70, 100, 0, 0, 6.3); x.fill();
    x.fillStyle = '#16090f'; x.beginPath(); x.ellipse(103, 190, 12, 7, 0, 0, 6.3); x.ellipse(153, 190, 12, 7, 0, 0, 6.3); x.fill(); x.fillStyle = '#c0103a'; x.beginPath(); x.ellipse(128, 250, 18, 8, 0, 0, 6.3); x.fill();
    x.fillStyle = '#ff2e88'; x.fillRect(16, 310, 224, 30);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const side = new THREE.MeshStandardMaterial({ color: 0x16090f, roughness: 0.5 }), face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
    add(new THREE.BoxGeometry(0.3, 0.42, 0.05), [side, side, side, side, face, side], 0, 0.025, 0, -Math.PI / 2);
  }
  if (kind === 'corn') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#1d6b34'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#f3c419'; x.fillRect(0, 32, 256, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16), [new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 }), mats.steel, mats.steel], 0, 0.06, 0);
  }
  if (kind === 'flowers') {
    add(new THREE.ConeGeometry(0.1, 0.32, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6, side: THREE.DoubleSide }), 0, 0.16, 0, Math.PI);
    const cols = [0xff4f7d, 0xffd34f, 0xffffff, 0xff8a3a, 0xb15bff];
    for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.8 }), Math.cos(i * 2.4) * 0.06, 0.34 + (i % 3) * 0.02, Math.sin(i * 2.4) * 0.06);
  }
  // B1: her car's one headlight, still faintly lit
  if (kind === 'headlight') {
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, roughness: 0.12, metalness: 1 });
    const lens = new THREE.MeshStandardMaterial({ color: 0xfff2d8, roughness: 0.05, emissive: 0xffd9a0, emissiveIntensity: 0.7, transparent: true, opacity: 0.92 });
    add(new THREE.TorusGeometry(0.068, 0.008, 10, 36), chrome, 0, 0.012, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.066, 0.05, 0.02, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8b8bc, roughness: 0.2, metalness: 1 }), 0, 0.004, 0);
    const dome = new THREE.SphereGeometry(0.189, 32, 6, 0, Math.PI * 2, 0, 0.357); dome.translate(0, -0.177, 0);
    add(dome, lens, 0, 0.012, 0);
  }
  if (kind === 'key' || kind === 'giltkey') { g.rotation.order = 'YXZ'; g.rotation.x = -Math.PI / 2; }   // lying in the tray
  g.userData.kind = kind;
  return g;
}

// ---------- the store's own small sounds (quiet; the song is the loud thing here) ----------
class StoreSound {
  constructor(audio) { this.a = audio; }
  _o(pan) { return pan ? this.a.pan(pan) : this.a.sfx; }
  rattle(k, pan) { const o = this._o(pan); this.a.noiseBurst({ type: 'bandpass', f: 2400 + Math.random() * 2200, q: 4, d: 0.045, peak: 0.012 + 0.04 * k, out: o }); if (Math.random() < 0.45) this.a.tone(150 + Math.random() * 50, { type: 'triangle', d: 0.05, peak: 0.03 * k, out: o }); }
  door(open) { this.a.noiseBurst({ type: 'lowpass', f: open ? 1100 : 800, fTo: open ? 320 : 260, d: 0.75, peak: 0.05 }); this.a.tone(96, { type: 'sawtooth', d: 0.65, peak: 0.008, glideTo: open ? 84 : 104 }); }
  pick(pan) { const o = this._o(pan); this.a.tone(560, { type: 'triangle', d: 0.07, peak: 0.045, out: o }); this.a.noiseBurst({ type: 'highpass', f: 3600, d: 0.05, peak: 0.035, out: o }); }
  land(pan) { const o = this._o(pan); this.a.tone(190, { type: 'sine', d: 0.09, peak: 0.05, glideTo: 120, out: o }); this.a.noiseBurst({ type: 'bandpass', f: 1300, q: 2, d: 0.06, peak: 0.04, out: o }); }
  beep(at = 0) { this.a.tone(1870, { type: 'sine', a: 0.003, d: 0.095, peak: 0.05, at: Math.max(0, at) }); }
  bag() { for (let i = 0; i < 6; i++) this.a.noiseBurst({ type: 'highpass', f: 2400 + i * 700, d: 0.05, peak: 0.035, at: i * 0.05 }); }
  grab() { this.a.noiseBurst({ type: 'bandpass', f: 3300, q: 7, d: 0.07, peak: 0.045 }); this.a.tone(880, { type: 'triangle', d: 0.04, peak: 0.015 }); }
  balloon() { this.a.noiseBurst({ type: 'bandpass', f: 600, fTo: 1700, q: 1, d: 0.5, peak: 0.022 }); }
}

// ---------- the security monitors: what the night manager sees ----------
const FEED_FS = /* glsl */`
uniform sampler2D tFeed; uniform float uTime, uOn; varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5; vec2 uv = 0.5 + c * (1.0 + 0.09 * dot(c, c));
  vec3 col = texture2D(tFeed, uv).rgb; col = col / (1.0 + col);
  float l = dot(col, vec3(0.3, 0.59, 0.11)); l = pow(l, 0.85) * 1.35;
  float scan = 0.84 + 0.16 * sin(vUv.y * 300.0 - uTime * 6.0);
  float n = fract(sin(dot(floor(vUv * vec2(160.0, 120.0)) + floor(uTime * 12.0), vec2(12.9898, 78.233))) * 43758.5453);
  l = l * scan + (n - 0.5) * 0.1;
  float e = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x) * smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.97, uv.y);
  gl_FragColor = vec4(vec3(0.85, 0.96, 1.0) * max(0.0, l) * e * uOn * 1.5, 1.0);
}`;

class World {
  constructor(f) { this.f = f; this.scene = f.scene; this.app = f.app; this.t = 0; }

  async build(onProgress) {
    await Promise.all(["900 64px 'Archivo Black'", "italic 600 52px 'Fraunces'", "700 30px 'Space Grotesk'"].map((s) => document.fonts.load(s).catch(() => null)));
    const s = this.s = buildStore(this.scene);
    this.bounds = s.bounds;
    this.sound = new StoreSound(this.f.audio);
    onProgress(0.25);
    // the two people
    this.man = await person('assets/characters/figurine/body-male.glb', this.scene, 'man');
    this.man.rig.play('Sitting_Idle_Loop', { fade: 0 });
    this.man.root.position.set(-4.36, 0.02, -3.4); this.man.root.rotation.y = Math.PI / 2;
    this.girl = await person('assets/characters/figurine/body-female.glb', this.scene, 'girl');
    this.girl.rig.play('Idle_Loop', { fade: 0, speed: 0.62 });
    this.girl.root.position.set(LX - 0.78, 0, 4.45); this.girl.root.rotation.y = Math.PI / 2;
    onProgress(0.6);
    // his seat: two cases of canned corn, and a can that rolled
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.34), s.mats.card); seat.position.set(-4.62, 0.22, -3.4); seat.castShadow = true; this.scene.add(seat);
    this.extra = [seat];
    // lights on the people
    this.manLight = new THREE.PointLight(0xffa86a, 0, 7, 1.6); this.manLight.position.set(-3.6, 1.9, -3.1); this.scene.add(this.manLight);
    this.girlLight = new THREE.PointLight(0xffd0a0, 0, 6, 1.6); this.girlLight.position.set(LX - 0.3, 2.4, 4.2); this.scene.add(this.girlLight);
    // the light that sees you
    const spot = this.spot = new THREE.SpotLight(0xffb070, 0, 0, 0.34, 0.7, 1.4);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0003; spot.shadow.camera.near = 2; spot.shadow.camera.far = 12;
    this.scene.add(spot, spot.target);
    // shadows on the floor for the people who move
    const blob = (r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), s.tex.blob); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; this.scene.add(m); this.extra.push(m); return m; };
    this.blobs = { you: blob(0.55), man: blob(0.6), girl: blob(0.5), cart: blob(0.7) };
    // the cart (a stray one in the lot, nosed toward the doors) and the corral's
    const cg = makeCart(s.mats); this.scene.add(cg);
    this.cart = { g: cg, x: 9.7, z: 11.6, h: Math.PI + 0.35, vx: 0, vz: 0, pushed: false, items: [], dist: 0 };
    for (let i = 0; i < 3; i++) { const c = makeCart(s.mats); c.position.set(2.5, 0, 14.0 + i * 0.55); c.rotation.y = 0; this.scene.add(c); this.extra.push(c); }
    this.extra.push(cg);
    // things to pick up (things you don't need; things you took back)
    const it = (kind, x, y, z, ry = 0) => { const g = keepsake(kind, s.mats); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(1.35); this.scene.add(g); const o = { g, kind, home: new THREE.Vector3(x, y, z), picked: false, fly: null, seed: Math.random() * 10 }; this.items.push(o); return o; };
    this.items = [];
    // the lost and found by the doors, the service desk, the bargain bin, the clearance table: what YOU took back
    it('key', -12.98, 1.15, 4.55, 0.4); it('giltkey', -12.92, 1.15, 4.95, -0.7); it('locket', -12.95, 1.16, 6.2, 0.4); it('headlight', -12.9, 1.15, 5.6, 0.2); it('star', LX - 0.22, 0.9, 3.7, 0.3);
    it('gavel', 1.15, 0.8, 3.45, 0.6); it('pin', 1.5, 0.79, 3.75); it('cereal', -0.5, 0.995, -0.12);
    it('teddy', 13.05, 0.71, 5.15, -0.5); it('costume', 11.95, 0.76, 4.9); it('tag', 12.55, 0.725, 5.2, 0.4); it('housecoat', 12.15, 1.66, 3.2, Math.PI / 2);
    it('corn', -3.95, 0.0, -2.95, 1.2); it('flowers', 10.7, 0.0, 6.9);
    // a balloon tied to the service counter
    this._balloon();
    // the checkout: bags arrive with "paper or plastic"
    this.bags = {};
    for (const k of ['paper', 'plastic']) {
      const m = k === 'paper' ? this._paperBag() : this._plasticBag();
      m.position.set(...BAGS[k]); m.visible = false; this.scene.add(m); this.bags[k] = m; this.extra.push(m);
    }
    this.carried = null; this.bagItems = []; this.pocket = []; this.belt = []; this.choice = null;
    // the monitors' feeds
    this._monitors();
    // cold air through the doors
    this._mist();
    // the CCTV overlay
    const ov = this.overlay = document.createElement('div'); ov.className = 'mp-cctv';
    ov.innerHTML = '<span class="cam">CAM 1</span><span class="rec">&#9679; REC</span><span class="ts">02:14:19</span>';
    document.body.appendChild(ov);
    // remember what we touch on shared things
    const fx = this.f.post.fx;
    this._fx0 = { desat: fx.desat, vhs: fx.vhs, grain: fx.grain, contrast: fx.contrast, vignette: fx.vignette, exposure: fx.exposure, ca: fx.ca, bloom: fx.bloom, saturation: fx.saturation, threshold: fx.threshold };
    this._fxBase = { ...this._fx0, exposure: 0.86, bloom: 0.42, threshold: 2.2, vignette: 0.75, contrast: 1.22, saturation: 1.1, grain: 0.022 };
    Object.assign(fx, this._fxBase);
    this._grade0 = { lift: fx.lift.clone(), gamma: fx.gamma.clone(), gain: fx.gain.clone(), shadowTint: fx.shadowTint.clone(), highTint: fx.highTint.clone() };
    fx.lift.setRGB(-0.035, -0.03, -0.025); fx.shadowTint.setRGB(0.92, 1.0, 1.02); fx.highTint.setRGB(1.0, 1.0, 0.97);
    this._cam0 = { pitch: this.f.cam.pitch, minDist: this.f.cam.minDist };
    this.f.cam.pitch = THREE.MathUtils.degToRad(50); this.f.cam.minDist = 10.5;
    this.board = { slots: [[], []], want: null, light: 1, dirty: true };
    for (let r = 0; r < 2; r++) for (let i = 0; i < 18; i++) this.board.slots[r][i] = { ch: ' ', want: ' ', k: 1, tilt: 0.6, glow: 0 };
    this.door = { k: 0, want: false, was: false };
    this._probe();
    this._dim = 1;
    this.facadeK = 1; this.liftK = 0; this.entered = false;
    onProgress(1);
  }

  // the store, captured once with its lights on, as what its glossy things reflect
  _probe() {
    const s = this.s, r = this.app.renderer;
    const c = new THREE.Color(2.2, 2.5, 2.3), off = new THREE.Color(0, 0, 0);
    s.panels.forEach((p, i) => s.pmesh.setColorAt(i, p.base ? c : off)); s.pmesh.instanceColor.needsUpdate = true;
    for (const g of s.groups) g.light.intensity = g.base * 0.8;
    const hide = [this.man.root, this.girl.root, this.f.player.root];
    hide.forEach((o) => { o.userData.v = o.visible; o.visible = false; });
    s.pmesh.layers.enableAll();
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(this.scene, 0.03, 0.1, 60, { position: new THREE.Vector3(0, 2.0, -2.5) });
    pm.dispose();
    s.pmesh.layers.set(1);
    hide.forEach((o) => { o.visible = o.userData.v; });
    this._env0 = { env: this.scene.environment, k: this.scene.environmentIntensity };
    this.scene.environment = this.env.texture; this.scene.environmentIntensity = 0.55;
  }

  // ---------- pieces ----------
  _plasticBag() {
    const g = new THREE.Group();
    const body = new THREE.LatheGeometry([[0, 0], [0.13, 0.0], [0.17, 0.08], [0.18, 0.2], [0.15, 0.3], [0.1, 0.34]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
    body.scale(1, 1, 0.62);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.55, transparent: true, opacity: 0.93, side: THREE.DoubleSide });
    const b = new THREE.Mesh(body, mat); b.castShadow = true; g.add(b);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI), mat); h.position.set(s * 0.05, 0.34, 0); g.add(h); }
    g.userData.body = b;
    return g;
  }
  _paperBag() {
    const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 0.95 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.18), mat); b.position.y = 0.19; b.castShadow = true; g.add(b);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.19), new THREE.MeshStandardMaterial({ color: 0xa27a4a, roughness: 0.95 })); top.position.y = 0.36; g.add(top);
    return g;
  }
  _balloon() {
    const s = this.s;
    const foil = new THREE.MeshStandardMaterial({ color: 0xf2a6c4, roughness: 0.18, metalness: 0.85, emissive: 0x401020, emissiveIntensity: 0.4 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), foil); m.scale.set(1, 1, 0.42); m.castShadow = true; this.scene.add(m);
    const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 10), s.mats.handle); weight.position.set(-12.75, 1.12, 6.75); this.scene.add(weight);
    const N = 9, pts = []; for (let i = 0; i < N; i++) pts.push(new THREE.Vector3(-12.75, 1.15 + i * 0.13, 6.75));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xd8d0c8 })); line.frustumCulled = false; this.scene.add(line);
    this.balloon = { m, line, pts, prev: pts.map((p) => p.clone()), tie: 'counter', anchor: new THREE.Vector3(-12.75, 1.15, 6.75), free: false, gone: false, weight };
    this.extra.push(m, line, weight);
  }
  _monitors() {
    this.feeds = [];
    const cams = [[-13.8, 4.1, 7.4, -4, 0.5, 3], [13.8, 4.1, -9.4, 4, 0.5, -3], [-13.8, 4.1, -9.4, -11, 0.5, -2], [13.8, 4.1, 7.4, 8, 0.5, 5]];
    this.s.monitors.forEach((scr, i) => {
      const rt = new THREE.WebGLRenderTarget(256, 192, { type: THREE.HalfFloatType });
      const cam = new THREE.PerspectiveCamera(62, 256 / 192, 0.2, 60); cam.layers.enable(1);
      const [x, y, z, lx, ly, lz] = cams[i]; cam.position.set(x, y, z); cam.userData.home = new THREE.Vector3(lx, ly, lz); cam.lookAt(cam.userData.home);
      const mat = new THREE.ShaderMaterial({ uniforms: { tFeed: { value: rt.texture }, uTime: { value: 0 }, uOn: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: FEED_FS });
      scr.material = mat;
      this.feeds.push({ rt, cam, mat, look: cam.userData.home.clone() });
    });
    this._feedI = 0;
  }
  _mist() {
    const N = 60, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), a = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aA', new THREE.BufferAttribute(a, 1));
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uSize: { value: 260 } },
      vertexShader: 'attribute float aA; varying float vA; uniform float uSize; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float k = pow(max(0.0, 1.0 - d), 2.0) * vA; gl_FragColor = vec4(vec3(0.55, 0.65, 0.75) * k * 0.35, k * 0.35); }' });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; this.scene.add(pts); this.extra.push(pts);
    this.mist = { pts, pos, a, p: Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, vx: 0, vz: 0, life: 0, max: 1 })) };
  }

  // ---------- collision ----------
  resolve(x, z, r) {
    x = Math.max(-22.5 + r, Math.min(22.5 - r, x)); z = Math.max(-9.95 + r, Math.min(28.5 - r, z));
    // beside the store: nothing out there
    if (z < 8.35 + r && Math.abs(x) > 15.3 - r) { if (z > 7.4) z = 8.35 + r; else x = Math.sign(x) * (15.3 - r); }
    for (const c of this.s.colliders) {
      if (!c.on) continue;
      if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) continue;
      const px = Math.min(x + r - c.minX, c.maxX - (x - r)), pz = Math.min(z + r - c.minZ, c.maxZ - (z - r));
      if (px < pz) x = (x - c.minX < c.maxX - x) ? c.minX - r : c.maxX + r; else z = (z - c.minZ < c.maxZ - z) ? c.minZ - r : c.maxZ + r;
    }
    // the people
    for (const [px, pz, pr] of [[this.man.root.position.x, this.man.root.position.z, 0.45], [this.girl.root.position.x, this.girl.root.position.z, 0.35]]) {
      const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz), m = pr + r; if (d < m && d > 1e-4) { x = px + dx / d * m; z = pz + dz / d * m; }
    }
    return { x, z };
  }

  // ---------- what YOU's hands do ----------
  interact(f) {
    const pl = f.player, t = f.t;
    // a bag
    if (t >= W.paper && !this.carried) {
      for (const k of ['plastic', 'paper']) { const b = this.bags[k]; if (b.visible && Math.hypot(pl.x - b.position.x, pl.z - b.position.z) < 1.4) { this._chooseBag(k, f); return; } }
    }
    // the balloon
    const bl = this.balloon;
    if (bl.tie === 'counter' && Math.hypot(pl.x - bl.anchor.x, pl.z - bl.anchor.z) < 1.5) {
      const c = this.cart, near = Math.hypot(c.x - pl.x, c.z - pl.z) < 2.6;
      bl.tie = near ? 'cart' : 'you'; this.sound.balloon(); pl.rig.upperOnce('Interact', { duration: 0.45, from: 0.1, to: 0.6 });
      return;
    }
    // the nearest thing within reach
    let best = null, bd = 1.7;
    for (const o of this.items) { if (o.picked) continue; const d = Math.hypot(pl.x - o.home.x, pl.z - o.home.z); if (d < bd) { bd = d; best = o; } }
    if (best) {
      best.picked = true;
      const c = this.cart, toCart = Math.hypot(c.x - pl.x, c.z - pl.z) < 7;
      best.fly = { t: 0, from: best.g.position.clone(), to: toCart ? 'cart' : 'you', slot: toCart ? c.items.length : this.pocket.length };
      if (toCart) c.items.push(best); else this.pocket.push(best);
      pl.rig.upperOnce(best.home.y < 0.5 ? 'PickUp_Table' : 'Interact', { duration: 0.5, from: 0.1, to: 0.6 });
      this.sound.pick(f.pan(best.home.x));
      return;
    }
    // the cart handle
    const c = this.cart, dx = Math.sin(c.h), dz = Math.cos(c.h);
    if (Math.hypot(pl.x - (c.x - dx * 0.62), pl.z - (c.z - dz * 0.62)) < 1.1) { c.pushed = !c.pushed; this.sound.grab(); }
  }
  _chooseBag(k, f) {
    if (f.t < W.plastic) { this.choice = k; return; }       // "I say plastic" hasn't happened yet
    this._takePlastic(f);
  }
  _takePlastic(f) {
    if (this.carried) return;
    this.carried = this.bags.plastic; this.carried.visible = true;
    this.bagItems.push(...this.pocket);
    this._swing = { ax: 0, az: 0, vx: 0, vz: 0, last: null };
    this.sound.bag();
    f.player.rig.upperOnce('Interact', { duration: 0.45, from: 0.1, to: 0.6 });
  }

  // the camera frames YOU and, out in the lot, the store's front
  camFocus(pl) {
    if (pl.z <= 8.6 || this.liftK >= 0.05) return null;
    const c = this._cf || (this._cf = { x: 0, z: 0 });
    c.x = THREE.MathUtils.clamp(pl.x * 0.7 + 2.0, -9, 11); c.z = 6.2;
    return c;
  }

  lookAt(pl) {
    const m = this.man.root.position, g = this.girl.root.position;
    if (Math.hypot(pl.x - m.x, pl.z - m.z) < 4.2) return (this._lk1 || (this._lk1 = new THREE.Vector3())).set(m.x, 1.0, m.z);
    if (Math.hypot(pl.x - g.x, pl.z - g.z) < 3.2) return (this._lk2 || (this._lk2 = new THREE.Vector3())).set(g.x, 1.5, g.z);
    return null;
  }

  // ---------- the frame ----------
  update(dt, t, f) {
    this.t = t;
    const pl = f.player, s = this.s;
    if (pl.z < 7.6) this.entered = true;
    this._doors(dt, t, pl);
    this._cart(dt, t, f);
    this._items(dt, t, f);
    this._checkout(dt, t, f);
    this._people(dt, t, pl);
    this._balloonUpdate(dt, t, f);
    this._lights(dt, t, f);
    this._board(dt, t);
    this._carry(dt, f);
    this._feeds(dt, t, f);
    this._mistUpdate(dt, t);
    // floor shadows
    const bl = this.blobs;
    bl.you.position.set(pl.x, 0.012, pl.z);
    bl.man.position.set(this.man.root.position.x + 0.1, 0.012, this.man.root.position.z);
    bl.girl.position.set(this.girl.root.position.x, 0.012, this.girl.root.position.z);
    bl.cart.position.set(this.cart.x, 0.012, this.cart.z); bl.cart.scale.set(0.8, 1.25, 1); bl.cart.rotation.z = -this.cart.h;
    // the aisle signs step aside (a little) when you're behind one
    for (const sg of s.aisleSigns) {
      const behind = pl.z < sg.z - 0.1 && pl.z > sg.z - 3.4 && Math.abs(pl.x - sg.x) < 1.9;
      sg.k += ((behind ? 0.14 : 1) - sg.k) * Math.min(1, dt * 6);
      for (const m of sg.mats) { m.opacity = sg.k; m.depthWrite = sg.k > 0.98; }
    }
    // the front of the building, cut away while you're inside
    const want = pl.z > 8.15 || this.liftK > 0.35 ? 1 : 0;
    this.facadeK += (want - this.facadeK) * Math.min(1, dt * 7);
    s.facade.visible = this.facadeK > 0.01;
    for (const m of s.facadeMats) { if (m.userData.op0 === undefined) m.userData.op0 = m.opacity; m.opacity = m.userData.op0 * this.facadeK; m.depthWrite = this.facadeK > 0.98 && m.userData.op0 > 0.99; }
  }

  _doors(dt, t, pl) {
    const s = this.s, d = this.door, c = this.cart;
    const cx = (DOOR.x0 + DOOR.x1) / 2;
    const near = (x, z, r) => Math.abs(x - cx) < r + 1.5 && Math.abs(z - DOOR.z) < r;
    let want = false;
    if (t < W.slide) {
      // the way in: from outside only
      want = (pl.z > DOOR.z - 0.2 && near(pl.x, pl.z, 2.8)) || (c.z > DOOR.z && near(c.x, c.z, 2.0)) || (pl.z > DOOR.z - 1.4 && pl.z < DOOR.z + 0.6 && Math.abs(pl.x - cx) < 1.6 && d.k > 0.2);
    } else {
      // the way out: from wherever you are, when you head for them
      const dx = cx - pl.x, dz = DOOR.z - pl.z, dist = Math.hypot(dx, dz), sp = Math.hypot(pl.vx, pl.vz);
      const toward = sp > 1 ? (pl.vx * dx + pl.vz * dz) / (sp * dist) : 0;
      want = dist < 3.4 || (dist < 16 && toward > 0.82) || (d.k > 0.5 && dist < 5.5) || near(c.x, c.z, 2.2);
    }
    if (want !== d.want) { d.want = want; this.sound.door(want); }
    d.k += ((want ? 1 : 0) - d.k) * Math.min(1, dt * (want ? 3.2 : 2.2));
    const e = ease(clamp01(d.k));
    for (const p of [s.doors.L, s.doors.R]) p.position.x = p.userData.home + (p.userData.open - p.userData.home) * e;
    s.doorCol.on = d.k < 0.75;
  }

  _cart(dt, t, f) {
    const c = this.cart, pl = f.player;
    let dx = Math.sin(c.h), dz = Math.cos(c.h);
    if (!c.pushed && pl.state !== 'dash') {
      const hx = c.x - dx * 0.62, hz = c.z - dz * 0.62;
      const sp = Math.hypot(pl.vx, pl.vz);
      if (Math.hypot(pl.x - hx, pl.z - hz) < 1.05 && sp > 1.2 && (pl.vx * dx + pl.vz * dz) / sp > 0.6) { c.pushed = true; this.sound.grab(); }
    }
    if (c.pushed) {
      const sp = Math.hypot(pl.vx, pl.vz);
      const want = sp > 0.8 ? Math.atan2(pl.vx, pl.vz) : c.h;
      c.h += angDiff(want, c.h) * Math.min(1, dt * 6.5);
      dx = Math.sin(c.h); dz = Math.cos(c.h);
      const tx = pl.x + dx * 1.0, tz = pl.z + dz * 1.0;
      const r = this.resolve(tx, tz, 0.5);
      const ex = r.x - tx, ez = r.z - tz;
      if (ex || ez) { pl.x += ex; pl.z += ez; const n = Math.hypot(ex, ez); const vn = (pl.vx * ex + pl.vz * ez) / n; if (vn < 0) { pl.vx -= ex / n * vn; pl.vz -= ez / n * vn; } pl._sync(); }
      c.vx = (r.x - c.x) / Math.max(1e-3, dt); c.vz = (r.z - c.z) / Math.max(1e-3, dt); c.x = r.x; c.z = r.z;
      if (pl.vx * dx + pl.vz * dz < -2.0) c.pushed = false;
      if (pl.state === 'dash') { c.pushed = false; c.vx = pl.vx * 0.55; c.vz = pl.vz * 0.55; this.sound.rattle(1, f.pan(c.x)); }
    } else {
      const sp = Math.hypot(c.vx, c.vz);
      if (sp > 0) { const dec = Math.min(sp, 2.4 * dt); c.vx -= c.vx / sp * dec; c.vz -= c.vz / sp * dec; }
      const d = Math.hypot(pl.x - c.x, pl.z - c.z);
      if (d < 0.98 && d > 1e-4) {
        const nx = (c.x - pl.x) / d, nz = (c.z - pl.z) / d, push = Math.max(0, pl.vx * nx + pl.vz * nz);
        c.vx += nx * push * 0.85; c.vz += nz * push * 0.85;
        pl.x = c.x - nx * 0.98; pl.z = c.z - nz * 0.98; pl._sync();
      }
      const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
      const r = this.resolve(nx, nz, 0.5);
      if (Math.abs(r.x - nx) > 1e-4) c.vx *= -0.3; if (Math.abs(r.z - nz) > 1e-4) c.vz *= -0.3;
      c.x = r.x; c.z = r.z;
      if (sp > 0.5) c.h += angDiff(Math.atan2(c.vx, c.vz), c.h) * Math.min(1, dt * 1.2);
    }
    c.g.position.set(c.x, 0, c.z); c.g.rotation.y = c.h + Math.PI;
    const speed = Math.hypot(c.vx, c.vz);
    c.dist += speed * dt;
    if (c.dist > 0.36) { c.dist = 0; this.sound.rattle(Math.min(1, speed / 6), f.pan(c.x)); }
  }
  _slot(i) { return new THREE.Vector3(-0.15 + (i % 3) * 0.15, 0.58 + Math.floor(i / 12) * 0.12, -0.3 + (Math.floor(i / 3) % 4) * 0.2); }

  _items(dt, t, f) {
    const pl = f.player, c = this.cart;
    for (const o of this.items) {
      if (!o.picked) {
        // a glint now and then, and a lift when you're close (pick me)
        const near = Math.hypot(pl.x - o.home.x, pl.z - o.home.z) < 1.7;
        o.near = (o.near || 0) + ((near ? 1 : 0) - (o.near || 0)) * Math.min(1, dt * 8);
        o.g.position.y = o.home.y + o.near * 0.05 + (near ? Math.sin(t * 5 + o.seed) * 0.01 : 0);
        o.g.rotation.y += o.near * dt * 0.8;
        continue;
      }
      const fl = o.fly; if (!fl) continue;
      fl.t += dt;
      const k = clamp01(fl.t / 0.55), e = ease(k);
      let to;
      if (fl.to === 'cart') to = c.g.localToWorld(this._slot(fl.slot));
      else if (fl.to === 'belt') to = fl.target;
      else { const ch = pl.h.rig.bones.spine_03 || pl.h.rig.bones.spine_02; to = ch ? ch.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(pl.x, 1.3, pl.z); }
      o.g.position.lerpVectors(fl.from, to, e); o.g.position.y += Math.sin(k * Math.PI) * 0.6;
      o.g.rotation.y += dt * 6;
      if (fl.to === 'you') o.g.scale.setScalar(1.35 * (1 - e * 0.9));
      if (k >= 1) {
        o.fly = null;
        if (fl.to === 'cart') { c.g.attach(o.g); o.g.position.copy(this._slot(fl.slot)); this.sound.land(f.pan(c.x)); }
        else if (fl.to === 'you') o.g.visible = false;
        else if (fl.to === 'belt') o.onBelt = true;
      }
    }
  }

  _checkout(dt, t, f) {
    const pl = f.player, s = this.s, c = this.cart;
    const belt = s.belts[LIT_LANE];
    const atTill = Math.hypot(pl.x - TILL.x, pl.z - TILL.z) < 2.3;
    const speed = atTill ? 0.55 : 0;
    belt.tex.offset.y -= speed * dt / (1.9 / 6);
    // the cart's things go up on the belt, one a beat
    if (atTill && Math.hypot(c.x - TILL.x, c.z - TILL.z) < 4.2 && c.items.length && !this._beltBusy) {
      if (!this._nextBeat || t >= this._nextBeat) {
        const o = c.items.pop();
        this.scene.attach(o.g);
        o.fly = { t: 0, from: o.g.position.clone(), to: 'belt', target: new THREE.Vector3(LX, 0.9, 2.6) };
        o.onBelt = false; this.belt.push(o);
        this._nextBeat = t + f.beat;
      }
    }
    for (let i = this.belt.length - 1; i >= 0; i--) {
      const o = this.belt[i]; if (!o.onBelt) continue;
      o.g.position.z += speed * dt * 1.6;
      if (o.g.position.z >= 4.3 && !o.scanned) { o.scanned = true; const nb = f.bm.nearest(t, 2); this.sound.beep(nb.time >= t ? nb.time - t : nb.time + f.beat / 2 - t); }
      if (o.g.position.z >= 4.75) {
        this.belt.splice(i, 1); o.onBelt = false;
        if (this.carried) { o.g.visible = false; this.bagItems.push(o); this.sound.bag(); }
        else { o.g.position.set(LX + (Math.random() - 0.5) * 0.3, 0.9, 5.25 + (Math.random() - 0.5) * 0.2); this.bagItems.push(o); this._counterPile = (this._counterPile || []).concat(o); }
      }
    }
    // the bags: "She asks me paper or plastic"
    for (const k of ['paper', 'plastic']) {
      const b = this.bags[k];
      if (b === this.carried) continue;
      const show = t >= W.paper;
      if (show && !b.visible) { b.visible = true; b.userData.pop = 0; }
      if (!show) b.visible = false;
      if (b.visible) { b.userData.pop = Math.min(1, (b.userData.pop ?? 1) + dt * 4); b.scale.setScalar(ease(b.userData.pop)); }
    }
    if (t >= W.paper && !this.carried) {
      for (const k of ['plastic', 'paper']) { const b = this.bags[k]; if (Math.hypot(pl.x - b.position.x, pl.z - b.position.z) < 1.6) this.choice = this.choice || k; }
      if (this.choice && t >= W.plastic) this._takePlastic(f);
    }
    // what was scanned before you had a bag goes in it
    if (this.carried && this._counterPile && this._counterPile.length) { for (const o of this._counterPile) o.g.visible = false; this._counterPile = null; }
  }

  _people(dt, t, pl) {
    // the man in aisle three: head down, crying; when you come close he looks up
    const m = this.man, mp = m.root.position, dm = Math.hypot(pl.x - mp.x, pl.z - mp.z);
    const close = dm < 3.0;
    m.look += ((close ? 1 : 0) - m.look) * Math.min(1, dt * 2.2);
    m.rig.lookTarget = close ? new THREE.Vector3(pl.x, 1.6, pl.z) : null;
    // he stands, if you're there with him, on "standing in the same hollow glow"
    if (!m.stood && t >= W.standing && t < W.standing + 4 && dm < 3.4) { m.stood = true; m.rig.once('Sitting_Exit', { duration: 1.3, then: 'Idle_Loop' }); m.standT = 0; }
    if (m.stood && m.standT < 1.3) { m.standT += dt; mp.x = -4.36 + ease(clamp01(m.standT / 1.3)) * 0.35; }
    m.rig.update(dt);
    const b = m.rig.bones;
    if (!m.stood) {
      const sob = (Math.sin(t * 0.7) > 0.2 ? 1 : 0.2) * Math.max(0, Math.sin(t * 7.5)) * 0.05 * (1 - m.look);
      if (b.spine_02) b.spine_02.rotation.x += (0.32 + sob) * (1 - m.look * 0.7);
      const hd = b.Head || b.head; if (hd) hd.rotation.x += 0.5 * (1 - m.look) - 0.12 * m.look;
    } else {
      m.root.rotation.y += angDiff(Math.atan2(pl.x - mp.x, pl.z - mp.z), m.root.rotation.y) * Math.min(1, dt * 2);
    }
    // his light: up when the song finds him; "I pretend I didn't see" dims it, unless you're there
    let mk = t < W.man ? 0 : clamp01((t - W.man) / 1.4);
    if (t >= W.didntSee && !close) mk *= 0.4 + 0.6 * Math.exp(-(t - W.didntSee) * 1.5);
    if (close && t >= W.man - 8) mk = Math.max(mk, 1);
    if (t >= W.glow && m.stood) mk = Math.max(mk, 1.4);
    m.lightK += (mk - m.lightK) * Math.min(1, dt * 2.5);
    this.manLight.intensity = 5.5 * m.lightK * this._dim;
    this.manLight.distance = m.stood && t >= W.glow ? 9 : 7;
    m.mat.userData.rim.value = (0.2 + 0.9 * m.lightK) * this._dim;
    // the checkout girl: tired; she asks paper or plastic
    const g = this.girl, gp = g.root.position, dg = Math.hypot(pl.x - gp.x, pl.z - gp.z);
    const talk = t >= W.paper - 0.5 && t < W.paper + 2.6;
    if (talk && !g.talking) { g.talking = true; g.rig.play('Idle_Talking_Loop', { fade: 0.3, speed: 0.8 }); }
    if (!talk && g.talking) { g.talking = false; g.rig.play('Idle_Loop', { fade: 0.4, speed: 0.62 }); }
    g.look += ((dg < 3.4 ? 1 : 0) - g.look) * Math.min(1, dt * 2);
    g.rig.lookTarget = dg < 3.4 ? new THREE.Vector3(pl.x, 1.6, pl.z) : null;
    g.rig.update(dt);
    const hd = g.rig.bones.Head || g.rig.bones.head; if (hd) hd.rotation.x += 0.22 * (1 - g.look);
    const gk = t < W.girl ? 0.25 : 0.25 + 0.75 * clamp01((t - W.girl) / 1.2);
    g.lightK += (gk - g.lightK) * Math.min(1, dt * 2.5);
    this.girlLight.intensity = 3.2 * g.lightK * this._dim;
    g.mat.userData.rim.value = (0.15 + 0.6 * g.lightK) * this._dim;
  }

  _balloonUpdate(dt, t, f) {
    const b = this.balloon; if (b.gone) return;
    const pl = f.player;
    if (b.tie === 'you' && t >= W.floorOut && !b.free) { b.free = true; this.sound.balloon(); }
    // the anchor
    if (!b.free) {
      if (b.tie === 'you') { const h = pl.h.rig.bones.hand_r; if (h) h.getWorldPosition(b.anchor); }
      else if (b.tie === 'cart') { const c = this.cart; b.anchor.set(c.x - Math.sin(c.h) * 0.66, 1.15, c.z - Math.cos(c.h) * 0.66); }
      if (b.tie !== 'counter') b.weight.visible = false;
    }
    // a light rope: verlet, the balloon pulls up
    const P = b.pts, Q = b.prev, N = P.length, seg = 0.13, h = Math.min(dt, 1 / 30);
    for (let i = 0; i < N; i++) {
      if (i === 0 && !b.free) { P[0].copy(b.anchor); Q[0].copy(b.anchor); continue; }
      const p = P[i], q = Q[i], vx = (p.x - q.x) * 0.96, vy = (p.y - q.y) * 0.96, vz = (p.z - q.z) * 0.96;
      q.copy(p);
      const lift = i === N - 1 ? 9.5 : -1.2;
      p.x += vx + (b.free ? 0.25 * h * h * 60 : 0); p.y += vy + lift * h * h; p.z += vz + Math.sin(t * 0.7 + i) * 0.0004;
    }
    for (let it = 0; it < 6; it++) for (let i = 0; i < N - 1; i++) {
      const a = P[i], c = P[i + 1], dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-4, diff = (d - seg) / d;
      const wa = i === 0 && !b.free ? 0 : 0.5, wc = i === 0 && !b.free ? 1 : 0.5;
      a.x += dx * diff * wa; a.y += dy * diff * wa; a.z += dz * diff * wa; c.x -= dx * diff * wc; c.y -= dy * diff * wc; c.z -= dz * diff * wc;
    }
    b.line.geometry.setFromPoints(P);
    b.m.position.copy(P[N - 1]).add(new THREE.Vector3(0, 0.22, 0));
    b.m.rotation.y = Math.sin(t * 0.6) * 0.5;
    if (b.free && P[N - 1].y > 30) { b.gone = true; b.m.visible = false; b.line.visible = false; }
  }

  _lights(dt, t, f) {
    const s = this.s, pl = f.player;
    const all = t >= W.seeAll && t < W.grieve;
    // every tube's state, from the song's time
    let i = 0;
    const col = this._col || (this._col = new THREE.Color());
    for (const p of s.panels) {
      if (p.order === undefined) { p.order = clamp01((p.z + 9.5) / 16); p.dieAt = W.grieve + p.order * 3.0 + hash(p.seed) * 0.4; p.swell = Math.floor(hash(p.seed + 3) * 3); }
      let k;
      if (t >= W.grieve && t > p.dieAt - 0.3) k = t > p.dieAt ? 0 : (hash(Math.floor(t * 30) + p.seed) > 0.5 ? 0.7 : 0.05);
      else if (all) k = 1;
      else if (t < W.lightsOn) {
        k = 0;
        W.swells.forEach(([a, b], si) => { if (p.swell === si && t > a && t < b) { const env = Math.sin(((t - a) / (b - a)) * Math.PI); k = hash(Math.floor(t * 24) + p.seed) > 0.6 ? 0.55 * env : 0.04 * env; } });
      } else {
        const on = W.lightsOn + p.order * 0.65;
        if (t < on) k = 0;
        else if (t < on + 0.2) k = (Math.sin((t - on) * 90) > 0 ? 1 : 0.12) * p.base;
        else if (!p.base) k = hash(Math.floor(t * 12) + p.seed) > 0.985 ? 0.35 : 0;
        else if (p.flick) k = hash(Math.floor(t * 18) + p.seed) > 0.82 ? 0.15 : (hash(Math.floor(t * 3) + p.seed) > 0.9 ? 0.4 : 1);
        else k = 1;
        if (t > W.fluorWord && t < W.fluorWord + 0.8) k *= hash(Math.floor(t * 40) + p.seed) > 0.35 ? 1 : 0.25;
      }
      p.k = k;
      const b = all ? 2.9 : 2.5;
      col.setRGB(0.86 * b * k, 1.0 * b * k, 0.92 * b * k);
      s.pmesh.setColorAt(i++, col);
    }
    s.pmesh.instanceColor.needsUpdate = true;
    for (const p of s.panels) p.boost = all ? 1.15 : 1;
    s.ceil.paint();
    for (const g of s.groups) { let m = 0; for (const p of g.members) m += p.k; m /= Math.max(1, g.members.length); g.light.intensity = g.base * m * (all ? 1.3 : 1); }
    // coolers and freezers hum all night, and go last
    const cool = t >= W.coolers ? 0 : 1;
    this._dim = t >= W.grieve ? clamp01(1 - (t - W.grieve) / 3.4) : 1;
    s.freezerLight.intensity = 3.2 * cool; s.dairyLight.intensity = 2.6 * cool;
    s.mats.coolerIn.color.setRGB(1.5 * cool, 1.85 * cool, 2.1 * cool); s.mats.dairyIn.color.setRGB(1.6 * cool, 1.75 * cool, 1.8 * cool);
    s.spill.intensity = 2.4 * (all ? 1.4 : 1) * (t < W.lightsOn ? 0.1 : 1) * clamp01(1 - (t - W.grieve) / 3.2);
    s.amb.intensity = 0.12 * (t < W.lightsOn ? 0.6 : 1) * (all ? 1.4 : 1);
    // what the glossy things reflect follows how much of the store is lit
    let lit = 0; for (const p of s.panels) lit += p.k; lit /= s.panels.length;
    this.scene.environmentIntensity = 0.62 * Math.min(1, lit / 0.78);
    // the sign out front, and the light over the doors: on all night, last to go
    const signOn = t < W.sign ? 1 : 0;
    const eerie = t > W.eerie && t < W.eerie + 1.0 ? (hash(Math.floor(t * 20)) > 0.4 ? 1 : 0.15) : 1;
    s.letters.material.color.setScalar(2.6 * signOn * eerie * this.facadeK);
    s.entry.intensity = 60 * signOn;
    // the lane light at the lit till
    s.laneBoxes[LIT_LANE].material.color.setScalar(2.2 * (t < W.lightsOn ? 0.2 : 1) * this._dim);
    // the light that sees you
    let env = 0;
    for (const x of W.see) { const u = t - x; if (u > -0.15 && u < 4) env = Math.max(env, u < 0 ? (u + 0.15) / 0.15 : u < 0.95 ? 1 : Math.exp(-(u - 0.95) * 1.7)); }
    { const u = t - W.seeAll; if (u > -0.1 && u < 8) env = Math.max(env, u < 0 ? 1 + u * 10 : u < 2.4 ? 1.2 : 1.2 * Math.exp(-(u - 2.4) * 1.2)); }
    this.spot.intensity = 260 * env;
    this.spot.position.set(pl.x + 0.9, 6.4, pl.z + 2.6); this.spot.target.position.set(pl.x, 0, pl.z);
    if (t >= W.seeAll && !this._flashed) { this._flashed = true; f.post.fx.flash.setRGB(0.5, 0.52, 0.5); f.cam.shake(0.3, 0.2); }
    if (t < W.seeAll) this._flashed = false;
  }

  // the letter board: OPEN 24 HOURS until the songwriter revises the first line, word by word, as sung
  _boardWant(t) {
    const rows = [Array(18).fill(' '), Array(18).fill(' ')];
    const put = (r, at, str) => { for (let i = 0; i < str.length; i++) if (at + i < 18) rows[r][at + i] = str[i]; };
    if (t < W.swab) { put(0, 2, 'OPEN 24 HOURS'); put(1, 2, 'CORN 3 FOR $1'); return rows; }
    const ev = [[263.66, 0, 0, 'FLUORESCENT'], [264.12, 0, 12, 'LIGHTS'], [264.5, 1, 0, 'ARE'], [264.7, 1, 4, 'HUMMING'], [265.0, 1, 12, 'HYMNS'],
      [266.6, 0, 1, 'THE '], [266.6, 0, 0, ' '], [267.9, 0, 5, 'CEILING '], [268.2, 0, 13, 'HUMS '], [268.6, 1, 0, ' ITS '], [268.8, 1, 5, 'HOLLOW '], [269.1, 1, 12, 'HYMNS']];
    for (const [at, r, i, str] of ev) if (t >= at - 0.05) put(r, i, str);
    return rows;
  }
  _board(dt, t) {
    const B = this.board, want = this._boardWant(t);
    let dirty = B.dirty; B.dirty = false;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 18; i++) {
      const s = B.slots[r][i], w = want[r][i];
      if (B.snap) { s.ch = w; s.k = 1; continue; }
      if (s.ch !== w) { if (s.ch === ' ') { s.ch = w; s.k = 0; s.tilt = (hash(i + r * 18 + t) - 0.5) * 1.4; } else { s.k -= dt * 7; if (s.k <= 0) { s.ch = w; s.k = 0; } } dirty = true; }
      else if (s.k < 1) { s.k = Math.min(1, s.k + dt * 6); dirty = true; }
      const glow = r === 1 && i >= 5 && i <= 10 && t > W.hollowWord && t < W.hollowWord + 1.5 ? Math.sin(((t - W.hollowWord) / 1.5) * Math.PI) : 0;
      if (Math.abs(glow - s.glow) > 0.01) { s.glow = glow; dirty = true; }
    }
    B.snap = false;
    let light = t < W.outro ? 1 : 0;
    if (t > W.eerie && t < W.eerie + 1.0) light *= hash(Math.floor(t * 17) + 5) > 0.45 ? 1 : 0.2;
    if (light !== B.light) { B.light = light; dirty = true; }
    if (dirty) this.s.board.draw(B.slots, light);
    this.s.boardMesh.material.color.setScalar(1.5 * Math.max(0.12, light));
  }

  _carry(dt, f) {
    const bag = this.carried; if (!bag) return;
    const h = f.player.h.rig.bones.hand_l; if (!h) return;
    const p = h.getWorldPosition(this._hp || (this._hp = new THREE.Vector3()));
    const sw = this._swing;
    if (sw.last) {
      const ax = (p.x - sw.last.x) / Math.max(1e-3, dt), az = (p.z - sw.last.z) / Math.max(1e-3, dt);
      sw.vx += (-sw.ax * 40 - ax * 0.9 - sw.vx * 4) * dt; sw.vz += (-sw.az * 40 - az * 0.9 - sw.vz * 4) * dt;
      sw.ax += sw.vx * dt * 0.2; sw.az += sw.vz * dt * 0.2;
      sw.ax = THREE.MathUtils.clamp(sw.ax, -0.7, 0.7); sw.az = THREE.MathUtils.clamp(sw.az, -0.7, 0.7);
    }
    sw.last = (sw.last || new THREE.Vector3()).copy(p);
    const pl = f.player, ox = p.x - pl.x, oz = p.z - pl.z, ol = Math.hypot(ox, oz) || 1;
    bag.position.set(p.x + ox / ol * 0.14, p.y - 0.52, p.z + oz / ol * 0.14);
    bag.scale.setScalar(1.45);
    bag.rotation.set(sw.az * 0.6, f.player.facing, -sw.ax * 0.6);
    const full = Math.min(1, this.bagItems.length / 6);
    bag.userData.body.scale.set(0.85 + full * 0.25, 0.9 + full * 0.15, 0.85 + full * 0.3);
  }

  _feeds(dt, t, f) {
    const r = this.app.renderer, pl = f.player;
    this._feedT = (this._feedT || 0) + dt;
    for (const fd of this.feeds) fd.mat.uniforms.uTime.value = t;
    if (this._feedT < 1 / 40) return;
    this._feedT = 0;
    const fd = this.feeds[this._feedI = (this._feedI + 1) % this.feeds.length];
    // after the night manager is named, every camera follows you
    const tgt = t >= W.cctv0 ? new THREE.Vector3(pl.x, 0.9, pl.z) : fd.cam.userData.home;
    fd.look.lerp(tgt, t >= W.cctv0 ? 0.5 : 1);
    fd.cam.lookAt(fd.look);
    const on = this._dim; fd.mat.uniforms.uOn.value = on;
    const vis = this.s.monitors.map((m) => m.visible);
    this.s.monitors.forEach((m) => { m.visible = false; });
    const au = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;
    const prev = r.getRenderTarget();
    r.setRenderTarget(fd.rt); r.render(this.scene, fd.cam); r.setRenderTarget(prev);
    r.shadowMap.autoUpdate = au;
    this.s.monitors.forEach((m, i) => { m.visible = vis[i]; });
  }

  _mistUpdate(dt, t) {
    const M = this.mist, open = this.door.k > 0.5 && t >= W.slide;
    for (let i = 0; i < M.p.length; i++) {
      const p = M.p[i];
      if (p.life <= 0 && open && Math.random() < dt * 8) { p.x = 6.2 + Math.random() * 2.6; p.y = 0.2 + Math.random() * 1.2; p.z = 8.4 + Math.random() * 0.6; p.vx = (Math.random() - 0.5) * 0.3; p.vz = -0.5 - Math.random() * 0.6; p.max = p.life = 2.5 + Math.random() * 2; }
      if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += 0.04 * dt; }
      M.pos[i * 3] = p.x; M.pos[i * 3 + 1] = p.y; M.pos[i * 3 + 2] = p.z;
      M.a[i] = p.life > 0 ? Math.sin(Math.PI * (1 - p.life / p.max)) : 0;
    }
    M.pts.geometry.attributes.position.needsUpdate = true; M.pts.geometry.attributes.aA.needsUpdate = true;
  }

  // ---------- the camera: a little closer inside; the night manager's screen; the lift at the end ----------
  camera(dt, t, f) {
    const cam = f.cam, pl = f.player, fx = f.post.fx;
    cam.closeK += ((pl.z < 8 ? 0.3 : 0) - cam.closeK) * Math.min(1, dt * 2);
    // the lift, from "but it's enough"
    const lk = t >= W.floorOut ? ease(clamp01((t - W.floorOut) / 9)) : 0;
    this.liftK = lk;
    if (lk > 0) {
      const fxx = pl.x * 0.55, fz = THREE.MathUtils.lerp(pl.z, 9, 0.45);
      if (!cam.override) cam.override = { pos: new THREE.Vector3(), look: new THREE.Vector3(), k: 0 };
      cam.override.pos.set(fxx, 27, fz + 15.5); cam.override.look.set(fxx, 0.5, fz - 2.5); cam.override.k = lk * 0.96;
    }
    // CCTV: the picture becomes the night manager's black and white screen
    const cc = t >= W.cctv0 && t < W.cctv1;
    if (cc) {
      const inside = pl.z < 7.8;
      const opts = inside ? [[-13.6, 4.15, 7.5], [0.4, 4.2, 7.6], [13.6, 4.15, 7.5]] : [[pl.x * 0.6, 7.2, Math.max(pl.z + 5, 13)]];
      let best = opts[0], bd = 1e9; for (const o of opts) { const d = Math.abs(o[0] - pl.x); if (d < bd) { bd = d; best = o; } }
      const c = this._cc || (this._cc = new THREE.PerspectiveCamera(66, 16 / 9, 0.2, 80));
      if (this._ccPos !== best) { this._ccPos = best; this._ccLook = new THREE.Vector3(pl.x, 0.8, pl.z); this._ccCam = opts.indexOf(best); }
      this._ccLook.lerp(new THREE.Vector3(pl.x, 0.8, pl.z), Math.min(1, dt * 3));
      c.position.set(...best); c.lookAt(this._ccLook);
      cam.cam.position.copy(c.position); cam.cam.quaternion.copy(c.quaternion); cam.cam.fov = 66; cam.cam.updateProjectionMatrix(); cam.cam.layers.enable(1);
      // ten frames a second, like the real thing
      this._ccT = (this._ccT || 0) + dt;
      f.skipRender = this._ccT < 0.1 && this._ccWas; if (!f.skipRender) this._ccT = 0;
      this._ccWas = true;
      fx.desat = 1; fx.contrast = 1.28; fx.grain = 0.16; fx.vignette = 1.15; fx.vhs = 0.1; fx.ca = 0.004; fx.bloom = 0.35;
      this.overlay.classList.add('on');
      const sec = 2 * 3600 + 11 * 60 + 40 + t, hh = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60, ss = Math.floor(sec) % 60;
      this.overlay.querySelector('.ts').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      this.overlay.querySelector('.cam').textContent = `CAM ${inside ? this._ccCam + 1 : 4}`;
    } else if (this._ccWas) {
      this._ccWas = false; f.skipRender = false; this.overlay.classList.remove('on');
      Object.assign(fx, this._fxBase);
      cam.cam.fov = cam.fov; cam.cam.updateProjectionMatrix(); cam.cam.layers.disable(1);
    }
  }

  onCut() { this.overlay.classList.remove('on'); }

  onStart(f, at) {
    // jumping in (tests, practice): put YOU and the set where the song is
    const pl = f.player;
    if (at > 1) {
      if (at < W.slide) pl.place(7.6, 5.2, Math.PI); else pl.place(7.4, 11.5, 0);
      this.entered = at > 1;
      this.cart.x = pl.x + 1.4; this.cart.z = pl.z - 0.6; this.cart.h = Math.PI;
      if (at > W.plastic) { this._takePlastic(f); }
    }
    this.board.snap = true;
  }

  dispose() {
    const f = this.f;
    Object.assign(f.post.fx, this._fx0);
    for (const k of Object.keys(this._grade0)) f.post.fx[k].copy(this._grade0[k]);
    f.cam.pitch = this._cam0.pitch; f.cam.minDist = this._cam0.minDist; f.cam.override = null; f.skipRender = false; f.cam.cam.layers.disable(1);
    this.overlay.remove();
    this.scene.environment = this._env0.env; this.scene.environmentIntensity = this._env0.k; this.env.dispose();
    for (const fd of this.feeds) fd.rt.dispose();
    const kill = (o) => { this.scene.remove(o); o.traverse((m) => { if (m.geometry) m.geometry.dispose(); const ms = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []; for (const x of ms) { for (const k of ['map', 'roughnessMap', 'alphaMap', 'emissiveMap']) if (x[k]) x[k].dispose(); x.dispose(); } }); };
    kill(this.s.root);
    for (const o of this.extra) kill(o);
    for (const o of this.items) kill(o.g);
    for (const p of [this.man, this.girl]) kill(p.root);
    this.scene.remove(this.manLight, this.girlLight, this.spot, this.spot.target);
    this.spot.dispose();
  }
}

export default {
  id: 'grocery-store-at-2-am',
  kind: 'walk',
  beats: 'grocery-store-at-2-am',
  end: 292.16,
  spawn: [7.5, 11.4, Math.PI],
  // the tour the test bot takes: [until song time, x, z, reach for something here]
  tour: [[6, 9.25, 12.3], [16, 7.5, 5.5], [24, -3, 1.2], [36, -3.6, -2.4], [38, -3.95, -2.4, 1], [44, -3.0, -0.2], [52, -0.5, 0.5, 1], [58, 1.3, 4.6, 1], [70, 4.8, 7.3, 1],
    [74, 2.0, 1.0], [78, -1.2, 1.0], [84, -5.6, 1.1], [90, -5.6, 3.4], [97, -5.65, 3.3], [104, -5.62, 4.9], [106, -5.6, 1.1], [118, -12.2, 6.3, 1], [126, -12.3, 6.6, 1], [150, -8, -3], [165, -8, -6], [172, -3.8, -2.6], [186, -3.6, -2.2], [200, 2, -4], [212, 12.2, 2.4, 1], [222, 11.5, 4.9, 1], [226, 7.5, 6.5], [236, 7.5, 12.5], [295, 6.5, 14.5]],
  async build(f, onProgress = () => {}) { const w = new World(f); await w.build(onProgress); f.track.onStart = (ff, at) => w.onStart(ff, at); return w; },
  script() {},
};
