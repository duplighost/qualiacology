// THE CLERK's end: RUNG UP. The outro's stop-time hits are the presses. She fires her price gun at YOU; YOU catches
// the sticker and puts it on her forehead ($0.99). A cut, a lunge that folds her back over her own counter, YOU up on
// the counter after her; six more stickers on the six quick hits; then YOU lifts her over her head, holds her there
// through the ta-da, and on the last hit brings her down on the register. The bell, the drawer, NO SALE.
// (src/game/execution.js runs it: each step's `lead` puts the two of them on their marks as its ring starts to close, so
// the scene works from any step if her bar empties late; `do` is the beat itself.)
import * as THREE from 'three';

const TOP = 1.05;                                   // the counter's top
const REG = { x: 1.8, z: -6.15 };                   // the register on it
const M = { her0: [1.9, -3.6], you0: [-0.4, -3.6], herC: [1.95, -5.0], youC: [1.25, -4.05], youT: [0.75, -5.95], herT: [1.75, -5.95] };

function plate(text, w = 0.17, h = 0.11, col = '#b01428') {
  const c = document.createElement('canvas'); c.width = 192; c.height = 124;
  const g = c.getContext('2d');
  g.fillStyle = '#fff8ea'; g.fillRect(0, 0, 192, 124); g.strokeStyle = '#e9b949'; g.lineWidth = 8; g.strokeRect(4, 4, 184, 116);
  g.fillStyle = col; g.font = 'bold 64px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 96, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }));
}
// a sticker on her: on her head (the first), or anywhere on her front
function stick(X, text, onHead = false) {
  const b = X.her, fig = b.fig, m = plate(text, onHead ? 0.17 : 0.13, onHead ? 0.11 : 0.085);
  const bone = fig && fig.rig ? (onHead ? fig.rig.bones.Head || fig.rig.bones.head : fig.rig.bones.spine_02 || fig.rig.bones.spine_01) : null;
  const a = b.facing, p = new THREE.Vector3();
  if (bone) bone.getWorldPosition(p); else p.set(b.x, 1.8, b.z);
  const side = onHead ? 0 : (Math.random() - 0.5) * 0.42, up = onHead ? 0.1 : (Math.random() - 0.5) * 0.5;
  m.position.set(p.x + Math.sin(a) * 0.17 + Math.cos(a) * side, p.y + up, p.z + Math.cos(a) * 0.17 - Math.sin(a) * side);
  m.rotation.set(0, a, (Math.random() - 0.5) * (onHead ? 0.2 : 0.9), 'YXZ');
  X.add(m); if (bone) bone.attach(m);
  (X._stickers ||= []).push(m);
  X.fx.sparks(m.position.x, p.y + up, m.position.z, new THREE.Color(3, 2.6, 2.2), 6, a);
  return m;
}

export const death = {
  beats: 28,
  enter(X) {
    const f = X.f, C = f.clerk, b = X.her;
    // on the floor, in front of her counter
    C.y = C.yT = 0; C.inBooth = false; b.root.position.y = 0; b.markK = 1;
    X.go('her', ...M.her0, X.beat * 2, { ease: 'out' }); X.go('you', ...M.you0, X.beat * 2.4, { ease: 'out' });
    X.face('her', M.you0[0], M.you0[1]); X.face('you', M.her0[0], M.her0[1]);
    X.clip('her', 'Zombie_Walk_Fwd_Loop', { loop: true }); X.clip('you', 'Walk_Loop', { loop: true, speed: 1.4 });
    X.after(X.beat * 2.4, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
    X.after(X.beat * 2, () => { C.draw('gun'); X.clip('her', 'Pistol_Idle_Loop', { loop: true, fade: 0.12 }); });
    X.follow('two', { dist: 6.2 });
  },
  steps: [
    // "she fires": the sticker. Caught: it's hers
    { t: 206.48, key: 'parry',
      lead(X) { X.place('her', ...M.her0); X.place('you', ...M.you0); X.faceEach(); X.f.clerk.draw('gun'); X.clip('her', 'Pistol_Idle_Loop', { loop: true, fade: 0.1 }); X.follow('over', { dist: 2.3 }); },
      do(X, ok) {
        const p = X.you, b = X.her;
        X.clip('her', 'Pistol_Shoot', { dur: 0.3 });
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.12, from: 0.08, to: 0.3 }); X.fx.caught(p.x, 1.4, p.z, true); X.sfx.catch && X.sfx.catch('perfect', 0);
          X.after(0.16, () => { X.clip('you', 'Punch_Jab', { dur: 0.2 }); X.go('you', b.x - 1.0, b.z, 0.12, { ease: 'out' }); });
          X.after(0.3, () => { stick(X, '$0.99', true); X.hit({ power: 0.8, gold: true, y: 1.75 }); X.clip('her', 'Hit_Head', { dur: 0.4 }); X.follow('her', { dist: 2.6 }); X.expr('A_Amused'); });
        } else { X.fx.sparks(p.x, 1.5, p.z, new THREE.Color(2.4, 2.4, 2.6), 10); X.clip('you', 'Hit_Chest', { dur: 0.3 }); }
      } },
    // the cut: she spins on her heel
    { t: 207.48, key: 'strike',
      lead(X, s) { X.go('you', M.her0[0] - 1.9, M.her0[1], 0.12); X.faceEach(); X.strike('cut', s.t); X.follow('two', { dist: 5.4 }); },
      do(X, ok) { X.slash('cut', { gold: ok }); X.hit({ power: ok ? 1.2 : 0.6, gold: ok }); X.clip('her', 'Hit_Chest', { dur: 0.45 }); X.body('her', { spin: (X.her.rig.body.spin || 0) + Math.PI * 2 }, 0.5, 'out'); X.f.clerk.draw(null); } },
    // the lunge: folded back over her own counter
    { t: 209.15, key: 'strike',
      lead(X, s) { X.place('her', ...M.her0); X.faceEach(); X.strike('thrust', s.t); X.follow('two', { dist: 5.6 }); },
      do(X, ok) {
        X.slash('thrust', { gold: ok }); X.hit({ power: ok ? 1.5 : 0.7, gold: ok });
        X.go('her', ...M.herC, 0.2, { ease: 'out' }); X.go('you', ...M.youC, 0.22, { ease: 'out' });
        X.clip('her', 'Hit_Knockback', { dur: 0.5, to: 0.55 }); X.body('her', { pitch: -0.5 }, 0.25, 'out');
        X.after(0.2, () => { X.shake(0.5, 0.15); X.fx.dust(M.herC[0], M.herC[1] - 0.3, 8); X.sfx.slamSet && X.sfx.slamSet(0.2); X.follow('over', { dist: 2.4 }); });
      } },
    // up on the counter, and her with you
    { t: 210.32, key: 'jump',
      lead(X, s) { X.place('her', ...M.herC); X.place('you', ...M.youC); X.faceEach(); X.strike('lift', s.t); X.follow('low', { dist: 4.4 }); },
      do(X, ok) {
        X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.3 : 0.7, gold: ok });
        X.go('you', ...M.youT, 0.32, { ease: 'out', arc: 0.7, y: TOP }); X.go('her', ...M.herT, 0.3, { ease: 'out', arc: 0.5, y: TOP });
        X.body('her', { pitch: 0 }, 0.3); X.clip('her', 'Hit_Knockback', { dur: 0.5, to: 0.7 });
        X.after(0.34, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); X.clip('her', 'Crouch_Idle_Loop', { loop: true, fade: 0.15 }); X.follow('two', { dist: 4.8, h: 1.9 }); });
        // the six quick ones: a sticker each
        [211.49, 211.66, 211.82, 211.99, 212.16, 212.32].forEach((t, i) => X.at(t, () => {
          X.clip('you', i % 2 ? 'Punch_Cross' : 'Punch_Jab', { dur: 0.15 }); stick(X, ['50%', 'SALE', '$0', 'AS IS', 'FINAL', 'OFF'][i]);
          X.hit({ power: 0.45, gold: true, y: 1.2, quiet: i % 2 === 1 }); X.sfx.hitProp && X.sfx.hitProp(0.2);
        }));
      } },
    // over her head: held there through the ta-da
    { t: 212.66, key: 'strike',
      lead(X) { X.place('you', ...M.youT); X.place('her', ...M.herT); X.lift('you', TOP, 0.05); X.lift('her', TOP, 0.05); X.faceEach(); },
      do(X, ok) {
        const end = X.f.lastHit;
        X.strike('slam', end);
        X.go('her', M.youT[0] + 0.15, M.youT[1], 0.3, { ease: 'out', y: TOP + (ok ? 0.95 : 0.7) }); X.body('her', { pitch: Math.PI / 2, spin: 0 }, 0.3, 'out');
        X.clip('her', 'Jump_Loop', { loop: true, fade: 0.1 }); X.hit({ power: ok ? 1.0 : 0.5, gold: ok, y: 1.3, quiet: true });
        X.follow({ pos: [M.youT[0] - 1.9, 1.25, M.youT[1] + 5.7], look: [M.youT[0] + 0.1, TOP + 1.75, M.youT[1]] }, { fov: 36 }); X.expr('A_Exertion');
      } },
    // the register
    { last: true, key: 'strike',
      lead(X) { X.follow({ pos: [REG.x + 2.3, 1.55, -2.9], look: [REG.x - 0.2, TOP + 0.75, REG.z] }, { fov: 36 }); },
      do(X, ok) {
        const f = X.f, R = f.room;
        X.go('her', REG.x, REG.z + 0.1, 0.05, { ease: 'in', y: TOP + 0.35 }); X.body('her', { pitch: Math.PI * 0.85 }, 0.05, 'in');
        X.after(0.05, () => {
          X.hit({ power: 2.3, gold: ok, at: { x: REG.x, y: TOP + 0.5, z: REG.z + 0.2 } });
          noSale(X); R && R.snd && R.snd.bell && R.snd.bell();
          X.fx.ring && X.fx.ring(REG.x, REG.z + 1.4, new THREE.Color(3.2, 2.0, 0.55), 3.4);
        });
        X.shatter({ dir: new THREE.Vector3(0.1, -1, 0.5), power: ok ? 1.6 : 1.1, at: new THREE.Vector3(REG.x, TOP + 0.4, REG.z) });
      } },
  ],
  after(X) {
    const f = X.f, R = f.room;
    for (const m of X._stickers || []) if (m.parent) m.parent.remove(m);
    try { R && R.receipt && R.receipt(f.t, f.t + 0.7, false); R && R.snd && R.snd.printer && R.snd.printer(f.t, f.t + 0.7); } catch (e) { /* the till's own */ }
    X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.3 }); X.face('you', M.youT[0], 6); X.expr('A_Amused');
    X.follow('you', { dist: 3.4, h: 0.9 });
    // down off the counter before the scene lets go of her
    X.after(1.15, () => { X.go('you', M.youC[0], M.youC[1] + 0.5, 0.36, { arc: 0.35, y: 0, ease: 'inOut' }); X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); });
    X.after(1.52, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }));
  },
  hold: 1.7,
};

// the register: the drawer shoots out, and the flags come up NO SALE
function noSale(X) {
  const R = X.f.room, reg = R && R.register; if (!reg) return;
  'NOSALE'.split('').forEach((ch, i) => {
    const fl = reg.flags[i]; if (!fl) return;
    const c = document.createElement('canvas'); c.width = 64; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = '#f6efe2'; g.fillRect(0, 0, 64, 96); g.strokeStyle = '#c89a4a'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 90);
    g.fillStyle = '#b01428'; g.font = 'bold 64px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    fl.m.material = fl.m.material.clone(); fl.m.material.map = t; fl.m.material.emissiveMap = t; fl.m.material.emissiveIntensity = 1.4; fl.at = -1; fl.m.position.y = 0.52;
  });
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.42), new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.3 }));
  drawer.position.set(0, 0.08, 0.05); reg.g.add(drawer);
  let k = 0; const tick = () => { k = Math.min(1, k + 0.2); drawer.position.z = 0.05 + 0.4 * (1 - (1 - k) * (1 - k)); if (k < 1) requestAnimationFrame(tick); }; tick();
  X.fx.glitter(REG.x, TOP + 0.5, REG.z + 0.5, new THREE.Color(3.2, 2.2, 0.7), 40, 0.6);
}
