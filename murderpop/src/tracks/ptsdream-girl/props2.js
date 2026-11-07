// Set pieces, continued: the 24-hour store, her stage, the bedroom in October, the office and its journal, the
// inside of your head at 3:47, and the table for two.
import * as THREE from 'three';
import { M, MAT, glowMat, mesh, rbox, box, cyl, lathe, tube, grp, canvas, tex, windowUnit } from './props.js';
import { grenadeGeometry } from './girl.js';

const TAU = Math.PI * 2;
const C = (h) => new THREE.Color(h);
let RNG = 777;
const rnd = () => { RNG = (RNG * 16807) % 2147483647; return RNG / 2147483647; };
const SANS = (px) => `900 ${Math.round(px)}px "Archivo Black", Arial Black, sans-serif`;
const SCRIPT = (px) => `italic 700 ${Math.round(px)}px Fraunces, Georgia, serif`;
const HAND = (px) => `italic 600 ${Math.round(px)}px "Segoe Script", "Brush Script MT", cursive`;

function flatBox(c, w = 22.4, h = 4.4, d = 0.16, rough = 0.5) {
  const t = tex(c); const front = new THREE.MeshPhysicalMaterial({ map: t, roughness: rough, clearcoat: rough < 0.3 ? 0.6 : 0 }); const e = MAT.white();
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, [e, e, e, e, front, e]); m.castShadow = true; m.receiveShadow = true; return m;
}
// draw on a flat 22.4 x 4.4 m: x -11.2..11.2, y 0..4.4
function flatCanvas(paint, W = 4032) { const s = W / 22.4; return canvas(W, Math.round(4.4 * s), (g) => { g.save(); g.scale(s, s); g.translate(11.2, 4.4); g.scale(1, -1); paint(g); g.restore(); }); }
// text on a flat (the canvas is flipped for drawing in metres): draw upright text at (x, y) metres
function flatText(g, txt, x, y, px, fontFn, fill, glow = null) { g.save(); g.translate(x, y); g.scale(1, -1); g.font = fontFn(px); g.textAlign = 'center'; g.textBaseline = 'middle'; if (glow) { g.shadowColor = glow; g.shadowBlur = px * 0.4; } g.fillStyle = fill; g.fillText(txt, 0, 0); g.restore(); }

// ---------------------------------------------------------------- B: THE 24-HOUR STORE
export function backFlatB() {
  const c = flatCanvas((g) => {
    g.fillStyle = '#d9ddd8'; g.fillRect(-11.2, 0, 22.4, 4.4);
    for (let y = 0, r = 0; y < 4.4; y += 0.075, r++) for (let x = -11.2 - (r % 2) * 0.075; x < 11.2; x += 0.15) { const v = 0.94 + rnd() * 0.06; g.fillStyle = `rgb(${(246 * v) | 0},${(248 * v) | 0},${(244 * v) | 0})`; g.fillRect(x + 0.004, y + 0.004, 0.142, 0.067); }
    g.fillStyle = '#9aa29c'; g.fillRect(-11.2, 0, 22.4, 0.12);
    // the doorway the steel door hangs in, dark
    g.fillStyle = '#2a2c30'; g.fillRect(-0.62, 0, 1.24, 2.32);
  });
  const g = grp(flatBox(c, 22.4, 4.4, 0.16, 0.25));
  // EMERGENCY EXIT / ALARM WILL SOUND: a red box over the door
  const sc = canvas(512, 160, (x, w, h) => { x.fillStyle = '#c8102e'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = SANS(40); x.textAlign = 'center'; x.fillText('EMERGENCY EXIT', w / 2, 62); x.font = SANS(30); x.fillText('ALARM WILL SOUND', w / 2, 118); });
  const sign = mesh(new THREE.BoxGeometry(1.3, 0.4, 0.08), [MAT.red(), MAT.red(), MAT.red(), MAT.red(), new THREE.MeshBasicMaterial({ map: tex(sc), color: C(0xffffff).multiplyScalar(1.3) }), MAT.red()], { name: 'exitBox' });
  sign.position.set(0, 2.62, 0.12); g.add(sign);
  // OPEN 24 HOURS, mint neon (x +7)
  const nc = canvas(1024, 256, (x, w, h) => { x.font = SCRIPT(120); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#5affc8'; x.shadowBlur = 30; x.fillStyle = '#c8fff0'; x.fillText('OPEN 24 HOURS', w / 2, h / 2); x.fillText('OPEN 24 HOURS', w / 2, h / 2); });
  const neon = mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: tex(nc), transparent: true, depthWrite: false, color: C(0xffffff).multiplyScalar(2.4), blending: THREE.AdditiveBlending }), { cast: false, name: 'open24' });
  neon.position.set(7, 2.6, 0.12); g.add(neon);
  // the perfume endcap (x -6): shelves stacked with her red grenade bottles
  const cap = new THREE.Group(); cap.position.set(-6, 0, 0.5);
  cap.add(box(1.6, 1.9, 0.8, MAT.white()));
  const gg = grenadeGeometry(0.18);
  const bot = new THREE.InstancedMesh(gg.body, M('ruby', { color: 0x9a0016, roughness: 0.08, clearcoat: 1 }), 36);
  let k = 0; const m4 = new THREE.Matrix4();
  for (const y of [0.42, 0.9, 1.38]) for (let i = 0; i < 12 && k < 36; i++, k++) { m4.makeTranslation(-0.66 + i * 0.12, y, 0.32); bot.setMatrixAt(k, m4); }
  cap.add(bot);
  for (const y of [0.4, 0.88, 1.36]) { const s = box(1.62, 0.02, 0.82, MAT.steel()); s.position.y = y; cap.add(s); }
  const capSign = mesh(new THREE.PlaneGeometry(1.4, 0.3), new THREE.MeshBasicMaterial({ map: tex(canvas(256, 64, (x, w, h) => { x.fillStyle = '#ff2e7a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = SCRIPT(40); x.textAlign = 'center'; x.fillText('dream girl', w / 2, 46); })) }));
  capSign.position.set(0, 2.05, 0.41); cap.add(capSign);
  g.add(cap);
  return g;
}
// a gondola: 1.0 deep x 10.2 long x 2.0 tall, double-sided white steel, stocked
export function gondola() {
  const g = new THREE.Group();
  const L = 10.2, D = 1.0, Hh = 2.0;
  g.add(box(D, 0.12, L, MAT.steel()));
  const spine = box(0.06, Hh, L, MAT.white()); g.add(spine);
  for (const y of [0.12, 0.55, 1.0, 1.45, 1.9]) for (const s of [-1, 1]) { const sh = box(D / 2 - 0.03, 0.03, L, MAT.white()); sh.position.set(s * D / 4, y, 0); g.add(sh); const lip = box(0.02, 0.06, L, M('lip', { color: 0xffd9e4, roughness: 0.4 })); lip.position.set(s * (D / 2 - 0.01), y, 0); g.add(lip); }
  for (const z of [-L / 2, L / 2]) { const e = box(D + 0.02, Hh + 0.06, 0.04, MAT.white()); e.position.z = z; g.add(e); }
  // stock: pastel boxes, cans, rows of her perfume
  const colors = [0xf6c6d4, 0xbfe6d8, 0xc6d8f4, 0xfbe6b0, 0xf4f0ea, 0xe8c6f0];
  const nB = 300, boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ roughness: 0.45 }), nB);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let i = 0;
  for (const y of [0.15, 0.58, 1.03, 1.48]) for (const sd of [-1, 1]) for (let z = -L / 2 + 0.2; z < L / 2 - 0.2 && i < nB; z += 0.26 + rnd() * 0.1) {
    if (rnd() < 0.18) continue;
    const w = 0.16 + rnd() * 0.12, h = 0.22 + rnd() * 0.16, d = 0.3;
    p.set(sd * (D / 2 - 0.2), y + h / 2, z); s.set(d, h, w); m4.compose(p, q, s); boxes.setMatrixAt(i, m4); boxes.setColorAt(i, C(colors[(rnd() * colors.length) | 0])); i++;
  }
  boxes.count = i; boxes.castShadow = true; g.add(boxes);
  const gg = grenadeGeometry(0.16);
  const nP = 48, perf = new THREE.InstancedMesh(gg.body, M('ruby', {}), nP);
  for (let k = 0; k < nP; k++) { const sd = k % 2 ? 1 : -1; m4.makeTranslation(sd * (D / 2 - 0.12), 1.93, -L / 2 + 0.3 + (k >> 1) * 0.4); perf.setMatrixAt(k, m4); }
  g.add(perf);
  return g;
}
export function aisleSign() {
  const g = new THREE.Group();
  const board = new THREE.Group(); board.position.y = 3.4;
  const bc = canvas(512, 384, (x, w, h) => { x.fillStyle = '#1d4fa8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffffff'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20); x.fillStyle = '#fff'; x.font = SANS(250); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('4', w / 2, h / 2 + 10); });
  // its own materials, always blend-ready: it ghosts when it hangs between the eye and the fight (opacity only, no recompile)
  const bm = new THREE.MeshPhysicalMaterial({ map: tex(bc), roughness: 0.35, emissive: C(0xffffff), emissiveMap: null, emissiveIntensity: 0, transparent: true });
  const wm = MAT.white().clone(), sm = MAT.steel().clone(); wm.transparent = true; sm.transparent = true;
  const b = mesh(new THREE.BoxGeometry(1.6, 1.2, 0.05), [wm, wm, wm, wm, bm, bm]); b.rotation.x = -0.25; board.add(b);
  for (const x of [-0.6, 0.6]) { const r = cyl(0.012, 0.012, 3.0, sm); r.position.set(x, 0.55, 0); board.add(r); }
  g.add(board);
  g.userData = { board, mats: [bm, wm, sm] };
  return g;
}
export function checkout() {
  const g = new THREE.Group();
  g.add(rbox(2.2, 0.9, 0.8, MAT.white(), 0.03));
  const belt = box(1.5, 0.02, 0.5, M('belt', { color: 0x1a1a1c, roughness: 0.6 })); belt.position.set(-0.3, 0.9, 0); g.add(belt);
  const scan = mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: C(0xff2030).multiplyScalar(2) }), { cast: false }); scan.rotation.x = -Math.PI / 2; scan.position.set(0.6, 0.92, 0); g.add(scan);
  return g;
}
// three rows of fluorescent banks at 4.5 m
export function fluoros() {
  const g = new THREE.Group(); const banks = [];
  for (const x of [-3.4, 0, 3.4]) {
    const b = new THREE.Group(); b.position.set(x, 4.5, -0.5);
    b.add(box(0.5, 0.08, 10, MAT.white()));
    const tubeM = new THREE.MeshBasicMaterial({ color: C(0xe8fff0).multiplyScalar(3) });
    for (const dx of [-0.12, 0.12]) { const t = mesh(new THREE.CylinderGeometry(0.03, 0.03, 9.6, 8), tubeM, { cast: false }); t.rotation.x = Math.PI / 2; t.position.set(dx, -0.02, 0); b.add(t); }
    b.userData = { tubeM }; banks.push(b); g.add(b);
  }
  g.userData = { banks };
  return g;
}
// the EXIT door: a freestanding steel door in a frame, the sign above it, an alarm light on top
export function exitDoor() {
  const g = new THREE.Group();
  const st = M('exitSteel', { color: 0x8a9096, metalness: 0.8, roughness: 0.35 });
  for (const x of [-0.62, 0.62]) { const p = box(0.12, 2.42, 0.2, st); p.position.x = x; g.add(p); }
  const top = box(1.36, 0.12, 0.2, st); top.position.y = 2.36; g.add(top);
  const hinge = new THREE.Group(); hinge.position.set(-0.56, 0, 0.0);
  const leaf = rbox(1.1, 2.32, 0.06, st, 0.01); leaf.position.x = 0.55; hinge.add(leaf);
  const bar = box(0.86, 0.06, 0.06, MAT.chrome()); bar.position.set(0.58, 1.0, 0.07); hinge.add(bar);
  g.add(hinge);
  const sc = canvas(256, 96, (x, w, h) => { x.fillStyle = '#300'; x.fillRect(0, 0, w, h); x.font = SANS(64); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff2030'; x.shadowBlur = 18; x.fillStyle = '#ff5060'; x.fillText('EXIT', w / 2, h / 2 + 4); });
  const signM = new THREE.MeshBasicMaterial({ map: tex(sc), color: C(0xffffff).multiplyScalar(2) });
  const sign = mesh(new THREE.BoxGeometry(0.72, 0.28, 0.06), [st, st, st, st, signM, signM], { cast: false }); sign.position.set(0, 2.65, 0); g.add(sign);
  const alarmM = new THREE.MeshBasicMaterial({ color: C(0xff1020).multiplyScalar(3) });
  const alarm = mesh(new THREE.SphereGeometry(0.1, 14, 10, 0, TAU, 0, Math.PI / 2), alarmM, { cast: false }); alarm.position.set(0, 2.85, 0); g.add(alarm);
  const gapM = new THREE.MeshBasicMaterial({ color: C(0xff2040).multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const gap = mesh(new THREE.PlaneGeometry(1.1, 2.3), gapM, { cast: false }); gap.position.set(0, 1.16, -0.04); g.add(gap);
  g.userData = { hinge, signM, alarmM, gapM };
  return g;
}

// ---------------------------------------------------------------- C: HER STAGE
export function riser() {
  // round, r 2.2, low (a lift in the floor): red lacquer, a gold rim, a ring of bulbs
  const g = new THREE.Group(); const H = 0.09;
  g.add(cyl(2.2, 2.2, H, M('riserRed', { color: 0x6a0010, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }), 72));
  const rim = mesh(new THREE.TorusGeometry(2.2, 0.035, 8, 96), MAT.gold()); rim.rotation.x = Math.PI / 2; rim.position.y = H; g.add(rim);
  const n = 36, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), glowMat(0xffe6b0, 3), n);
  const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { const a = i * TAU / n; m4.makeTranslation(Math.sin(a) * 2.05, H + 0.02, Math.cos(a) * 2.05); bulbs.setMatrixAt(i, m4); }
  g.add(bulbs);
  g.userData = { H };
  return g;
}
export function plinthCushion() {
  const g = new THREE.Group();
  g.add(cyl(0.32, 0.26, 0.9, MAT.gold(), 32));
  const cap = cyl(0.36, 0.36, 0.05, MAT.gold(), 32); cap.position.y = 0.9; g.add(cap);
  const cush = rbox(0.62, 0.16, 0.62, MAT.velvetRed(), 0.07); cush.position.y = 0.95; g.add(cush);
  // the crown-shaped dent: an empty crown's outline pressed in gold-thread
  const dent = mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 40), MAT.gold()); dent.rotation.x = Math.PI / 2; dent.position.y = 1.115; g.add(dent);
  for (const [x, z] of [[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]]) { const t = lathe([[0, 0], [0.03, -0.02], [0.02, -0.12], [0, -0.13]], MAT.gold(), 10); t.position.set(x, 1.0, z); g.add(t); }
  return g;
}
export function beacon() {
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.22, 0.06, MAT.chrome()));
  g.add(cyl(0.05, 0.05, 2.4, MAT.chrome()));
  const domeM = new THREE.MeshPhysicalMaterial({ color: 0xff1a30, roughness: 0.1, transparent: true, opacity: 0.85, emissive: C(0xff1020), emissiveIntensity: 1.2 });
  const dome = lathe([[0.14, 0], [0.14, 0.12], [0.1, 0.22], [0, 0.26]], domeM, 20); dome.position.y = 2.4; g.add(dome);
  // inside the dome, a mirror that turns (its sweep is a red pool on the floor: see the set)
  const spin = new THREE.Group(); spin.position.y = 2.5; const refl = mesh(new THREE.PlaneGeometry(0.16, 0.14), MAT.chrome(), { cast: false }); refl.position.y = 0.08; spin.add(refl); g.add(spin);
  g.userData = { spin, domeM };
  return g;
}
export function dreamGirlNeon() {
  const c = canvas(2048, 400, (x, w, h) => { x.font = SCRIPT(300); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff3a7a'; x.shadowBlur = 50; x.fillStyle = '#ff9cc6'; x.fillText('Dream Girl', w / 2, h / 2); x.shadowBlur = 10; x.fillStyle = '#fff4fa'; x.fillText('Dream Girl', w / 2, h / 2); });
  const m = new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: C(0xffffff).multiplyScalar(2.6) });
  const g = new THREE.Group();
  const p = mesh(new THREE.PlaneGeometry(10, 1.95), m, { cast: false }); p.position.y = 5.0; g.add(p);
  const grid = new THREE.Group(); for (let i = 0; i <= 10; i++) { const r = box(0.03, 2.4, 0.03, MAT.black()); r.position.set(-5 + i, 3.8, -0.06); grid.add(r); } g.add(grid);
  g.userData = { m };
  return g;
}

// ---------------------------------------------------------------- D: THE BEDROOM, OCTOBER
export function backFlatD() {
  const c = flatCanvas((g) => {
    g.fillStyle = '#efe4cf'; g.fillRect(-11.2, 0, 22.4, 4.4);
    for (let x = -11.2; x < 11.2; x += 0.32) { g.fillStyle = 'rgba(214,190,150,0.35)'; g.fillRect(x, 0, 0.08, 4.4); for (let y = 0.2; y < 4.4; y += 0.45) { g.fillStyle = 'rgba(200,150,140,0.35)'; g.beginPath(); g.arc(x + 0.2, y + ((x * 3) % 0.3), 0.03, 0, TAU); g.fill(); } }
    g.fillStyle = '#fbf7ee'; g.fillRect(-11.2, 0, 22.4, 0.14);
    // the calendar (x -6, y 1.8): OCTOBER, days crossed off
    g.fillStyle = '#fbfaf6'; g.fillRect(-6.4, 1.45, 0.8, 0.9); g.fillStyle = '#d0402a'; g.fillRect(-6.4, 2.15, 0.8, 0.2);
    flatText(g, 'OCTOBER', -6.0, 2.25, 0.11, SANS, '#ffffff');
    for (let i = 0; i < 31; i++) { const cx = -6.33 + (i % 7) * 0.11, cy = 2.05 - Math.floor(i / 7) * 0.12; g.fillStyle = '#7a7068'; g.fillRect(cx, cy, 0.06, 0.06); if (i < 23) { g.strokeStyle = '#c0182a'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(cx - 0.01, cy - 0.01); g.lineTo(cx + 0.07, cy + 0.07); g.moveTo(cx + 0.07, cy - 0.01); g.lineTo(cx - 0.01, cy + 0.07); g.stroke(); } }
  });
  const g = grp(flatBox(c));
  // the window (x +6): 3.2 x 2.2, venetian blinds; outside, an October street: a sodium lamp, leaves
  const out = canvas(512, 352, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0e22'); gr.addColorStop(1, '#2a1a12'); x.fillStyle = gr; x.fillRect(0, 0, w, h); const lg = x.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.5); lg.addColorStop(0, 'rgba(255,170,70,0.95)'); lg.addColorStop(0.2, 'rgba(255,140,50,0.4)'); lg.addColorStop(1, 'rgba(255,140,50,0)'); x.fillStyle = lg; x.fillRect(0, 0, w, h); x.fillStyle = '#100a08'; x.fillRect(w * 0.69, h * 0.3, 6, h); for (let i = 0; i < 40; i++) { x.fillStyle = ['#c0602a', '#e08a30', '#902a18'][i % 3]; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 5, 3, rnd() * 3, 0, TAU); x.fill(); } });
  const win = windowUnit(3.2, 2.2, 0.9, { glow: 0xffffff, outside: out }); win.position.set(6, 0, 0); win.name = 'window'; g.add(win);
  // the dresser (x -6) under the calendar
  const dr = new THREE.Group(); dr.position.set(-6, 0, 0.45);
  dr.add(rbox(1.5, 0.95, 0.55, M('dresser', { color: 0xf4ede0, roughness: 0.35, clearcoat: 0.4 }), 0.03));
  for (const y of [0.25, 0.6]) { const k1 = mesh(new THREE.SphereGeometry(0.025, 10, 8), MAT.brass()); k1.position.set(-0.3, y, 0.29); dr.add(k1); const k2 = k1.clone(); k2.position.x = 0.3; dr.add(k2); }
  g.add(dr);
  g.userData = { win };
  return g;
}
export function bed() {
  // 2.4 wide x 2.8 long, the headboard at the back; tufted cream velvet, rumpled white sheets, a heap of pillows
  const g = new THREE.Group();
  const frame = rbox(2.4, 0.38, 2.8, MAT.velvetCream(), 0.06); g.add(frame);
  const matt = rbox(2.3, 0.22, 2.7, M('sheet', { color: 0xfbf9f6, roughness: 0.75 }), 0.1); matt.position.y = 0.38; g.add(matt);
  const duvet = new THREE.PlaneGeometry(2.5, 1.9, 24, 18); duvet.rotateX(-Math.PI / 2);
  const pa = duvet.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); const edge = Math.max(Math.abs(x) / 1.25, 0); pa.setY(i, 0.62 + 0.05 * Math.sin(x * 4 + z * 3) * Math.cos(z * 5) - (edge > 0.9 ? (edge - 0.9) * 2.2 : 0)); } duvet.computeVertexNormals();
  const dv = mesh(duvet, M('duvet', { color: 0xf8f5f0, roughness: 0.8, side: THREE.DoubleSide })); dv.position.z = 0.4; g.add(dv);
  const head = rbox(2.4, 1.4, 0.18, MAT.velvetCream(), 0.08); head.position.set(0, 0, -1.4); g.add(head);
  for (let i = 0; i < 12; i++) { const b = mesh(new THREE.SphereGeometry(0.03, 8, 6), MAT.velvetCream()); b.position.set(-0.9 + (i % 4) * 0.6, 0.6 + Math.floor(i / 4) * 0.3, -1.3); g.add(b); }
  for (const [x, r] of [[-0.6, 0.1], [0.55, -0.15], [0, 0.05]]) { const p = rbox(0.75, 0.2, 0.45, M('pillow', { color: 0xffffff, roughness: 0.7 }), 0.09); p.position.set(x, 0.6, -1.0); p.rotation.set(-0.4, r, 0); g.add(p); }
  return g;
}
export function nightstand(withClock) {
  const g = new THREE.Group();
  g.add(rbox(0.6, 0.6, 0.5, M('dresser', {}), 0.03));
  const lampB = lathe([[0, 0], [0.09, 0], [0.11, 0.06], [0.05, 0.12], [0.03, 0.34], [0, 0.34]], MAT.brass(), 20); lampB.position.y = 0.6; g.add(lampB);
  const shadeM = new THREE.MeshPhysicalMaterial({ color: 0xf6e8cc, roughness: 0.6, emissive: C(0xffc070), emissiveIntensity: 0, side: THREE.DoubleSide });
  const shade = lathe([[0.18, 0], [0.12, 0.22], [0.115, 0.22]], shadeM, 24); shade.position.y = 0.88; g.add(shade);
  if (withClock) {
    const ck = new THREE.Group(); ck.position.set(0.14, 0.6, 0.06);
    ck.add(cyl(0.07, 0.07, 0.04, MAT.brass())); const face = cyl(0.065, 0.065, 0.02, MAT.white()); face.rotation.x = Math.PI / 2; face.position.set(0, 0.09, 0.02); ck.add(face);
    const hands = mesh(new THREE.BoxGeometry(0.008, 0.05, 0.004), glowMat(0x40ff80, 3), { cast: false }); hands.position.set(0, 0.105, 0.035); ck.add(hands);
    const h2 = hands.clone(); h2.rotation.z = 1.2; h2.scale.y = 0.7; ck.add(h2);
    g.add(ck); g.userData.hands = [hands, h2];
  } else {
    const ph = new THREE.Group(); ph.position.set(0.12, 0.61, 0.05);
    ph.add(box(0.09, 0.012, 0.17, M('phonecase', { color: 0x9fe8cc, roughness: 0.35 })));
    const scrM = new THREE.MeshBasicMaterial({ color: C(0x101418) }); const scr = mesh(new THREE.PlaneGeometry(0.07, 0.15), scrM, { cast: false }); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.014; ph.add(scr);
    g.add(ph); g.userData.phone = ph; g.userData.scrM = scrM;
  }
  g.userData.shadeM = shadeM;
  return g;
}
export function floorLamp() {
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.22, 0.04, MAT.brass())); g.add(cyl(0.018, 0.018, 1.45, MAT.brass()));
  const shadeM = new THREE.MeshPhysicalMaterial({ color: 0xf4e4c4, roughness: 0.6, emissive: C(0xffd090), emissiveIntensity: 0, side: THREE.DoubleSide });
  const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; pts.push([0, 0]); void a; }
  const sh = new THREE.LatheGeometry([new THREE.Vector2(0.28, 0), new THREE.Vector2(0.17, 0.32)], 36);
  const pa = sh.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), a = Math.atan2(x, z), k = 1 + 0.04 * Math.sin(a * 18); pa.setX(i, x * k); pa.setZ(i, z * k); } sh.computeVertexNormals();
  const shade = mesh(sh, shadeM); shade.position.y = 1.4; g.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: C(0x302010) }), { cast: false }); bulb.position.y = 1.5; g.add(bulb);
  g.userData = { shadeM, bulb };
  return g;
}

// ---------------------------------------------------------------- E: THE OFFICE AND THE JOURNAL
export function backFlatE() {
  const c = flatCanvas((g) => {
    g.fillStyle = '#3a2214'; g.fillRect(-11.2, 0, 22.4, 4.4);
    for (let y = 0.4; y < 4.4; y += 0.48) {
      g.fillStyle = '#5a3a24'; g.fillRect(-11.2, y - 0.05, 22.4, 0.05);
      for (let x = -11.1; x < 11.1;) { const w = 0.05 + rnd() * 0.05, h = 0.26 + rnd() * 0.14; g.fillStyle = ['#7a1a22', '#1e3a5a', '#2a4a30', '#d8c8a0', '#5a2a4a', '#9a6a2a', '#e8dcc8'][(rnd() * 7) | 0]; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,220,150,0.25)'; g.fillRect(x, y + h * 0.7, w, 0.012); x += w + 0.004; if (rnd() < 0.04) x += 0.3; }
    }
    g.fillStyle = '#2a160c'; g.fillRect(-11.2, 0, 22.4, 0.4);
  });
  const g = grp(flatBox(c, 22.4, 4.4, 0.16, 0.45));
  // the wall clock (x +1, y 3.0): brass, 1.2 m
  const ck = new THREE.Group(); ck.position.set(1.0, 3.0, 0.12);
  const rim = mesh(new THREE.TorusGeometry(0.6, 0.05, 12, 48), MAT.brass()); ck.add(rim);
  const face = mesh(new THREE.CircleGeometry(0.58, 48), new THREE.MeshPhysicalMaterial({ map: tex(canvas(256, 256, (x, w, h) => { x.fillStyle = '#f4ead4'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a1a10'; x.font = SANS(22); x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; x.fillText(String(i), w / 2 + Math.sin(a) * 100, h / 2 - Math.cos(a) * 100); } })), roughness: 0.5 }));
  ck.add(face);
  const hm = M('hand', { color: 0x1a0d08, roughness: 0.4 });
  const hh = box(0.03, 0.3, 0.01, hm); hh.rotation.z = -0.5; ck.add(hh); const mh = box(0.02, 0.45, 0.01, hm); mh.rotation.z = 1.4; ck.add(mh);
  g.add(ck);
  return g;
}
export function armchair() {
  const g = new THREE.Group(), L = MAT.leather();
  g.add(rbox(1.0, 0.45, 0.9, L, 0.08));
  const back = rbox(1.0, 1.15, 0.22, L, 0.09); back.position.set(0, 0.3, -0.38); g.add(back);
  for (const s of [-1, 1]) { const arm = rbox(0.18, 0.32, 0.85, L, 0.07); arm.position.set(s * 0.48, 0.42, 0.02); g.add(arm); const wing = rbox(0.14, 0.5, 0.35, L, 0.06); wing.position.set(s * 0.46, 0.95, -0.3); g.add(wing); }
  const seat = rbox(0.75, 0.12, 0.7, L, 0.05); seat.position.set(0, 0.45, 0.05); g.add(seat);
  for (const [x, z] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.38], [0.4, 0.38]]) { const f = cyl(0.03, 0.025, 0.08, MAT.brass()); f.position.set(x, -0.08, z); g.add(f); }
  g.children.forEach((c) => { c.position.y += 0.08; });
  return g;
}
export function sideTable() {
  const g = new THREE.Group();
  g.add(cyl(0.25, 0.25, 0.03, MAT.walnut())); g.add(cyl(0.03, 0.03, 0.62, MAT.brass())); const top = cyl(0.3, 0.3, 0.03, MAT.walnut()); top.position.y = 0.62; g.add(top);
  const lamp = lathe([[0, 0], [0.07, 0], [0.04, 0.05], [0.02, 0.3], [0, 0.3]], MAT.brass(), 16); lamp.position.set(-0.08, 0.65, 0); g.add(lamp);
  const shadeM = new THREE.MeshPhysicalMaterial({ color: 0x3a6a3a, roughness: 0.3, emissive: C(0xffc070), emissiveIntensity: 0, side: THREE.DoubleSide });
  const shade = lathe([[0.15, 0], [0.08, 0.1], [0.075, 0.1]], shadeM, 20); shade.position.set(-0.08, 0.9, 0); g.add(shade);
  const tissues = box(0.22, 0.1, 0.12, M('tissue', { color: 0xc8d8f0, roughness: 0.6 })); tissues.position.set(0.12, 0.65, 0.05); g.add(tissues);
  const puff = mesh(new THREE.SphereGeometry(0.05, 8, 6), M('tissueW', { color: 0xffffff, roughness: 0.9 })); puff.position.set(0.12, 0.77, 0.05); puff.scale.set(1, 0.7, 0.6); g.add(puff);
  g.userData = { shadeM };
  return g;
}
export function legalPad() {
  // a giant yellow legal pad (1.2 x 1.6) on an easel; its top sheet is the lyric sign
  const g = new THREE.Group();
  for (const [x, rz] of [[-0.45, 0.12], [0.45, -0.12]]) { const l = box(0.05, 2.3, 0.05, MAT.walnut()); l.position.set(x, 0, 0.1); l.rotation.z = rz; l.rotation.x = -0.12; g.add(l); }
  const back = box(0.05, 2.0, 0.05, MAT.walnut()); back.position.set(0, 0, -0.35); back.rotation.x = 0.25; g.add(back);
  const pad = new THREE.Group(); pad.position.set(0, 0.85, 0.02); pad.rotation.x = -0.12;
  const sheet = canvas(600, 800, (x, w, h) => { x.fillStyle = '#f8ec7a'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(80,120,200,0.55)'; x.lineWidth = 2; for (let y = 130; y < h; y += 36) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.strokeStyle = 'rgba(220,60,60,0.7)'; x.beginPath(); x.moveTo(70, 0); x.lineTo(70, h); x.stroke(); x.fillStyle = '#8a1a20'; x.fillRect(0, 0, w, 60); });
  pad.add(mesh(new THREE.BoxGeometry(1.2, 1.6, 0.04), [M('padEdge', { color: 0xf0e090 }), M('padEdge', {}), M('padEdge', {}), M('padEdge', {}), new THREE.MeshPhysicalMaterial({ map: tex(sheet), roughness: 0.75 }), M('padEdge', {})]));
  const tray = box(1.3, 0.05, 0.12, MAT.walnut()); tray.position.set(0, -0.82, 0.06); pad.add(tray);
  g.add(pad);
  g.userData = { pad };
  return g;
}
export function chaise() {
  const g = new THREE.Group(), v = MAT.velvetTeal();
  g.add(rbox(1.9, 0.38, 0.75, v, 0.1));
  const back = rbox(0.7, 0.55, 0.2, v, 0.09); back.position.set(-0.6, 0.3, -0.3); back.rotation.z = 0.15; g.add(back);
  const roll = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.75, 20), v); roll.rotation.x = Math.PI / 2; roll.position.set(-0.85, 0.52, 0); g.add(roll);
  for (const [x, z] of [[-0.85, -0.3], [0.85, -0.3], [-0.85, 0.3], [0.85, 0.3]]) { const f = cyl(0.025, 0.02, 0.08, MAT.gold()); f.position.set(x, -0.08, z); g.add(f); }
  g.children.forEach((c) => { c.position.y += 0.08; });
  return g;
}

// ---------------------------------------------------------------- F: INSIDE YOUR HEAD, 3:47
export function giantClock() {
  const g = new THREE.Group(), b = MAT.brass();
  const body = new THREE.Group(); body.position.y = 1.55;
  const drum = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 48), b); drum.rotation.x = Math.PI / 2; body.add(drum);
  const fc = canvas(512, 512, (x, w, h) => { x.fillStyle = '#f6ecd6'; x.beginPath(); x.arc(w / 2, h / 2, w / 2, 0, TAU); x.fill(); x.fillStyle = '#1a1208'; x.font = SANS(48); x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; x.fillText(String(i), w / 2 + Math.sin(a) * 200, h / 2 - Math.cos(a) * 200); } });
  const face = mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshPhysicalMaterial({ map: tex(fc), roughness: 0.4, clearcoat: 1 })); face.position.z = 0.26; body.add(face);
  const handM = glowMat(0x40ff80, 2.5);
  const hr = mesh(new THREE.BoxGeometry(0.07, 0.62, 0.02), handM, { cast: false }); hr.geometry.translate(0, 0.28, 0); hr.position.z = 0.28; hr.rotation.z = -(3 + 47 / 60) / 12 * TAU; body.add(hr);
  const mn = mesh(new THREE.BoxGeometry(0.05, 0.92, 0.02), handM, { cast: false }); mn.geometry.translate(0, 0.42, 0); mn.position.z = 0.29; mn.rotation.z = -(47 / 60) * TAU; body.add(mn);
  for (const s of [-1, 1]) { const bell = lathe([[0, 0], [0.42, 0], [0.4, 0.15], [0.25, 0.32], [0, 0.36]], b, 32); bell.position.set(s * 0.75, 1.0, 0); bell.rotation.z = -s * 0.5; body.add(bell); }
  const knob = lathe([[0, 0], [0.12, 0], [0.12, 0.1], [0, 0.12]], b, 16); knob.position.y = 1.2; body.add(knob);
  for (const s of [-1, 1]) { const leg = cyl(0.08, 0.05, 0.5, b); leg.position.set(s * 0.8, -1.4, 0); leg.rotation.z = s * 0.35; body.add(leg); }
  g.add(body); g.userData = { body };
  return g;
}
export function wineGlass() {
  const g = new THREE.Group();
  const tilt = new THREE.Group(); g.add(tilt);
  const gl = MAT.glass();
  tilt.add(lathe([[0, 0], [0.8, 0], [0.82, 0.04], [0.1, 0.12], [0.07, 1.25]], gl, 36));
  const bowl = lathe([[0.07, 1.25], [0.6, 1.55], [0.82, 2.0], [0.78, 2.45], [0.72, 2.6]], gl, 40); tilt.add(bowl);
  const wineM = new THREE.MeshPhysicalMaterial({ color: 0x5a0010, roughness: 0.05, clearcoat: 1, emissive: C(0x200004), transparent: true, opacity: 0.9 });
  const wine = lathe([[0.0, 1.3], [0.55, 1.55], [0.78, 2.0], [0.0, 2.0]], wineM, 36); tilt.add(wine);
  g.userData = { tilt };
  return g;
}
export function cameraStalk() {
  const g = new THREE.Group();
  g.add(cyl(0.25, 0.28, 0.05, MAT.chrome())); g.add(cyl(0.06, 0.06, 3.0, MAT.chrome()));
  const head = new THREE.Group(); head.position.y = 3.05;
  const bodyM = M('cam', { color: 0xf0f0f2, roughness: 0.3, clearcoat: 0.6 });
  const b = rbox(0.24, 0.24, 0.55, bodyM, 0.05); b.position.set(0, -0.12, 0.05); head.add(b);
  const lens = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 18), M('lens', { color: 0x101014, roughness: 0.1, metalness: 0.5 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, 0.34); head.add(lens);
  const ledM = new THREE.MeshBasicMaterial({ color: C(0xff1020).multiplyScalar(3) }); const led = mesh(new THREE.SphereGeometry(0.025, 8, 6), ledM, { cast: false }); led.position.set(0.08, 0.06, 0.3); head.add(led);
  g.add(head); g.userData = { head, ledM };
  return g;
}
export function seahorse() {
  // a giant porcelain hippocampus, 3.5 m: blue-white glaze, gold fins, head bowed, tail curled
  const g = new THREE.Group();
  const glazeT = tex(canvas(512, 512, (x, w, h) => { x.fillStyle = '#f4f6fa'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a4aa8'; x.lineWidth = 5; for (let i = 0; i < 26; i++) { x.beginPath(); const cx = rnd() * w, cy = rnd() * h; for (let k = 0; k < 3; k++) { x.arc(cx + k * 12, cy, 20 + k * 6, 0, Math.PI * (1 + rnd())); } x.stroke(); } x.fillStyle = 'rgba(40,70,170,0.6)'; for (let i = 0; i < 60; i++) { x.beginPath(); x.arc(rnd() * w, rnd() * h, 3 + rnd() * 6, 0, TAU); x.fill(); } }), { repeat: [3, 3] });
  const glaze = new THREE.MeshPhysicalMaterial({ map: glazeT, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 });
  // the spine: from the curled tail up the body to the bowed head
  const pts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; let x, y, z = 0; if (t < 0.35) { const a = t / 0.35 * TAU * 0.9; x = 0.35 + Math.cos(a) * 0.35 * (1 - t); y = 0.35 + Math.sin(a) * 0.35 * (1 - t); } else { const k = (t - 0.35) / 0.65; x = 0.2 - Math.sin(k * 1.4) * 0.5; y = 0.5 + k * 2.6; } pts.push(new THREE.Vector3(x, y, z)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tg = new THREE.TubeGeometry(curve, 80, 1, 18, false);
  const pa = tg.attributes.position, uv = tg.attributes.uv;
  for (let i = 0; i < pa.count; i++) { const u = uv.getX(i); const p = curve.getPointAt(u); const r = 0.12 + 0.48 * Math.sin(Math.min(1, Math.max(0, (u - 0.25) / 0.7)) * Math.PI) ** 0.8; pa.setXYZ(i, p.x + (pa.getX(i) - p.x) * r, p.y + (pa.getY(i) - p.y) * r, p.z + (pa.getZ(i) - p.z) * r); }
  tg.computeVertexNormals();
  g.add(mesh(tg, glaze));
  const head = new THREE.Group(); head.position.set(-0.3, 3.15, 0); head.rotation.z = 0.9;
  head.add(mesh(new THREE.SphereGeometry(0.42, 24, 16), glaze));
  const snout = mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.7, 16), glaze); snout.rotation.z = Math.PI / 2; snout.position.set(-0.55, -0.05, 0); head.add(snout);
  const crown = lathe([[0.18, 0], [0.12, 0.2], [0.04, 0.3], [0, 0.3]], MAT.gold(), 8); crown.position.y = 0.35; head.add(crown);
  for (const s of [-1, 1]) { const eye = mesh(new THREE.SphereGeometry(0.06, 10, 8), M('seaEye', { color: 0x1a2a6a, roughness: 0.1, clearcoat: 1 })); eye.position.set(-0.1, 0.1, s * 0.36); head.add(eye); }
  g.add(head);
  // gold fins: a fan on its back
  const fin = new THREE.Shape(); fin.moveTo(0, 0); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; fin.lineTo(-Math.sin(a) * 0.55 * (i % 2 ? 0.8 : 1), Math.cos(a) * 0.7 - 0.0); } fin.lineTo(0, 0);
  const fm = mesh(new THREE.ShapeGeometry(fin, 4), new THREE.MeshPhysicalMaterial({ color: 0xe9b949, metalness: 1, roughness: 0.22, side: THREE.DoubleSide })); fm.position.set(0.55, 1.9, 0); fm.rotation.y = Math.PI / 2; g.add(fm);
  // the belly plate that takes her initials
  const plateM = new THREE.MeshBasicMaterial({ map: tex(canvas(256, 128, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.font = SANS(80); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ff7ab0'; x.shadowColor = '#ff2a8a'; x.shadowBlur = 20; x.fillText('PTSD', w / 2, h / 2); })), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const plate = mesh(new THREE.PlaneGeometry(0.9, 0.45), plateM, { cast: false }); plate.position.set(0.0, 1.6, 0.52); g.add(plate);
  g.userData = { plateM };
  g.scale.setScalar(1.0);
  return g;
}

// ---------------------------------------------------------------- H: THE DREAM (a table for two)
export function tableForTwo() {
  const g = new THREE.Group();
  g.add(cyl(0.3, 0.35, 0.03, MAT.gold())); g.add(cyl(0.05, 0.05, 0.72, MAT.gold()));
  const top = cyl(0.46, 0.46, 0.03, MAT.white(), 40); top.position.y = 0.72; g.add(top);
  const cloth = lathe([[0.0, 0.76], [0.48, 0.76], [0.52, 0.7], [0.55, 0.42], [0.54, 0.4]], MAT.cloth(), 40); g.add(cloth);
  for (const s of [-1, 1]) {
    const ch = new THREE.Group(); ch.position.set(s * 0.8, 0, 0); ch.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    ch.add(cyl(0.2, 0.2, 0.04, MAT.gold())); const seat = cyl(0.22, 0.22, 0.05, MAT.velvetRed()); seat.position.y = 0.45; ch.add(seat);
    for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) { const l = cyl(0.015, 0.015, 0.45, MAT.gold()); l.position.set(x, 0, z); ch.add(l); }
    const back = tube([[-0.18, 0.47, -0.2], [-0.18, 0.95, -0.22], [0.18, 0.95, -0.22], [0.18, 0.47, -0.2]], 0.015, MAT.gold(), { seg: 20 }); ch.add(back);
    g.add(ch);
    const wg = lathe([[0, 0], [0.04, 0], [0.005, 0.01], [0.005, 0.1], [0.05, 0.14], [0.045, 0.22]], MAT.glass(), 16); wg.position.set(s * 0.22, 0.76, 0.1); g.add(wg);
  }
  const cdl = cyl(0.03, 0.03, 0.22, MAT.wax()); cdl.position.y = 0.76; g.add(cdl);
  const fl = mesh(new THREE.SphereGeometry(0.02, 8, 6), glowMat(0xffb24a, 4), { cast: false }); fl.scale.y = 1.8; fl.position.y = 1.01; g.add(fl);
  return g;
}
// red lace that climbs: a lace pattern on a transparent plane, revealed bottom-up
export function laceSheet(w, h) {
  const c = canvas(512, 512, (x, W, H) => { x.strokeStyle = 'rgba(210,10,36,0.95)'; x.lineWidth = 3; for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const cx = i * 64 + (j % 2) * 32, cy = j * 64; x.beginPath(); x.arc(cx, cy, 22, 0, TAU); x.stroke(); x.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); } x.stroke(); x.beginPath(); x.arc(cx, cy, 8, 0, TAU); x.stroke(); } });
  const t = tex(c, { repeat: [w / 1.2, h / 1.2] });
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: C(0xffffff).multiplyScalar(1.1), opacity: 0.9 });
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
  const p = mesh(g, m, { cast: false });
  p.userData = { t, w, h };
  return p;
}
export { HAND, SANS, SCRIPT };
