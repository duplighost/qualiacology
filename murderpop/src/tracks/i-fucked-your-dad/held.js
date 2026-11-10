// What she holds, and when (design §3, props): your phone, a match (struck, held up, flicked), the gold gas can,
// the giant match (her staff, bridge 1 to the end of chorus 1), the Polaroid camera, the carving knife and fork,
// the branding iron, the gravy boat. Each rides a hand bone; each is shown in its windows of song time, so a
// rewind is exact. The match's and the staff's flames are real flames (fire.js).
import * as THREE from 'three';
import * as P from './props.js';
import { Flames } from './fire.js';
import { M, GLOW, Merger, roundBox, canvasTex } from './mats.js';

const W = {
  phone: [[0, 4.04], [5.6, 21.52], [22.59, 46.46], [171.4, 176.17], [208.0, 213.24]],
  phoneL: [[74.6, 77.1]],
  burning: [[20.8, 21.52]],
  match: [[4.2, 5.11], [9.95, 10.46], [137.1, 137.4], [195.0, 196.3], [230.9, 231.6]],
  lit: [[4.39, 5.11], [10.11, 10.46], [137.29, 137.4], [195.06, 196.3], [231.07, 231.6]],
  can: [[46.82, 51.48], [129.47, 131.29]],
  staff: [[52.52, 93.836]],
  camera: [[116.65, 125.56]],
  knife: [[167.25, 170.81]], fork: [[167.25, 170.81]],
  iron: [[164.39, 166.0]],
  gravy: [[178.0, 179.5]],
};
const inW = (w, t) => w.some(([a, b]) => t >= a && t < b);

function knife() { const g = new THREE.Group(), m = new Merger(); m.box(M.gold, 0.035, 0.42, 0.006, 0, 0.32, 0); m.cyl(M.cream, 0.018, 0.018, 0.16, 0, 0.04, 0, 8); m.build(g); return g; }
function fork() { const g = new THREE.Group(), m = new Merger(); for (const x of [-0.02, 0.02]) m.cyl(M.gold, 0.006, 0.006, 0.12, x, 0.38, 0, 6); m.box(M.gold, 0.05, 0.03, 0.01, 0, 0.31, 0); m.cyl(M.gold, 0.008, 0.008, 0.22, 0, 0.18, 0, 6); m.cyl(M.cream, 0.016, 0.016, 0.14, 0, 0.03, 0, 8); m.build(g); return g; }
function camera() { const g = new THREE.Group(), m = new Merger(); m.rbox(M.cream, 0.15, 0.12, 0.1, 0.015, 0, 0, 0); m.cyl(M.gold, 0.035, 0.035, 0.03, 0, -0.01, 0.06, 16, Math.PI / 2); m.cyl(M.black, 0.026, 0.026, 0.032, 0, -0.01, 0.065, 16, Math.PI / 2); m.build(g); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.025), GLOW.white); fl.position.set(0.035, 0.04, 0.051); g.add(fl); g.userData.flash = fl; return g; }
function iron() { const g = new THREE.Group(), m = new Merger(); m.cyl(M.steel, 0.012, 0.012, 1.0, 0, 0.5, 0, 6); m.cyl(M.cream, 0.025, 0.025, 0.18, 0, 0.0, 0, 8); m.build(g); const tex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.font = '900 110px "Archivo Black", Arial Black'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff7a2a'; c.shadowColor = '#ff5a1a'; c.shadowBlur = 20; c.fillText('DAD', w / 2, h / 2 + 6); }); const head = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2.2, 2.2, 2.2), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); head.position.y = 1.05; g.add(head); return g; }
function gravy() { const g = new THREE.Group(), m = new Merger(); m.sphere(M.gold, 0.1, 0, 0.04, 0, 1.4, 0.55, 0.8, 14); m.cyl(M.gold, 0.02, 0.02, 0.1, 0.16, 0.06, 0, 6, 0, 1.2); m.build(g); return g; }

export class Held {
  constructor(set, boss) {
    this.set = set; this.boss = boss; const fig = boss.fig; this.fig = fig;
    const s = 1 / fig.scale;
    const R = fig.bones.hand_r, Lh = fig.bones.hand_l;
    this.items = {};
    // each prop under a holder on a bone: the holder's local transform puts it in the fist (tuned by eye)
    const mount = (name, obj, bone, pos, rot, scale = 1) => {
      const h = new THREE.Group(); h.position.set(...pos).multiplyScalar(s); h.rotation.set(...rot); h.scale.setScalar(s * scale); h.add(obj); bone.add(h); h.visible = false;
      this.items[name] = { h, obj }; return h;
    };
    const GRIP = [0, 0.085, 0.02], ROT = [0, 0, 0];
    this.phone = P.phone(); mount('phone', this.phone, R, [0.0, 0.1, 0.03], [0, Math.PI / 2, 0], 1.2);
    this.phoneL = P.phone(); mount('phoneL', this.phoneL, Lh, [0.0, 0.1, 0.03], [0, -Math.PI / 2, 0], 1.2);
    this.match = P.smallMatch(); mount('match', this.match, Lh, [0.0, 0.08, 0.03], [0, 0, 0], 2.2);
    this.matchR = P.smallMatch(); mount('matchR', this.matchR, R, [0.0, 0.08, 0.03], [0, 0, 0], 2.2);
    this.matchRFire = new Flames(set.scene, this.matchR); this.matchRFire.add({ x: 0, z: 0, y: 0.12, w: 0.06, h: 0.14, group: 'm' }); this.matchRFire.build();
    this.matchFire = new Flames(set.scene, this.match); this.matchFire.add({ x: 0, z: 0, y: 0.12, w: 0.06, h: 0.14, group: 'm' }); this.matchFire.build();
    this.phoneFire = new Flames(set.scene, this.phone); for (let i = 0; i < 3; i++) this.phoneFire.add({ x: (i - 1) * 0.03, z: 0, y: 0.05, w: 0.12, h: 0.22, group: 'p' }); this.phoneFire.build();
    this.can = P.gasCan(); mount('can', this.can, R, [0.0, 0.05, 0.0], [Math.PI, 0, 0], 1);
    this.camera = camera(); mount('camera', this.camera, R, [0.0, 0.1, 0.05], [0, Math.PI / 2, 0], 1.3);
    this.knife = knife(); mount('knife', this.knife, R, [0.0, 0.08, 0.02], [Math.PI / 2, 0, 0], 1.5);
    this.fork = fork(); mount('fork', this.fork, Lh, [0.0, 0.08, 0.02], [Math.PI / 2, 0, 0], 1.5);
    this.iron = iron(); mount('iron', this.iron, R, [0.0, 0.08, 0.02], [Math.PI / 2, 0, 0], 1.3);
    this.gravy = gravy(); mount('gravy', this.gravy, R, [0.0, 0.08, 0.04], [0, 0, 0], 1.5);
    // the giant match: a staff in her fist
    const gm = P.giantMatch(); gm.position.y = -1.0;
    mount('staff', gm, R, [0.0, 0.06, 0.02], [Math.PI / 2, 0, 0], 1);
    this.staffFire = new Flames(set.scene, gm);
    for (let i = 0; i < 3; i++) this.staffFire.add({ x: (i - 1) * 0.05, z: 0, y: 2.3, w: 0.36, h: 0.66 * (1 - Math.abs(i - 1) * 0.25), group: 'flame' });
    this.staffFire.build();
    this.gm = gm;
  }
  update(dt, t, set) {
    const I = this.items, wrecked = this.boss.state === 'desperate', fin = set._finished;
    const handless = this.boss.broken >= 3;   // the match hand broke off: everything goes in the right hand
    for (const k of Object.keys(I)) I[k].h.visible = !fin && inW(W[k] || [], t);
    if (handless) { I.matchR.h.visible = !fin && inW(W.match, t); I.match.h.visible = false; I.fork.h.visible = false; if (I.phoneL.h.visible) { I.phoneL.h.visible = false; I.phone.h.visible = !fin && !I.staff.h.visible; } }
    else I.matchR.h.visible = false;
    // her death scene: only the can, while she still has it (the match there is the scene's own: death.js)
    const K = set.kill, live = !!(K && K.live);
    if (live) { for (const k of Object.keys(I)) I[k].h.visible = false; I.can.h.visible = !fin && K.canInHand; }
    I.can.h.scale.setScalar((live ? 1.35 : 1) / this.fig.scale);
    // the phone's screen brightens as she reads it up close; static white for the lies
    const scr = this.phone.userData.screen;
    const read = t > 19.37 && t < 20.8 ? 1 + Math.floor((t - 19.37) / 0.357) * 0.5 : 1;
    if (t > 36.84 && t < 38.6) scr.color.setRGB(3, 3, 3.3); else scr.color.setRGB(1.6 * read, 1.5 * read, 1.4 * read);
    this.phoneFire.set('p', inW(W.burning, t) ? 1 : 0, 1); this.phoneFire.update(dt, t);
    this.matchFire.set('m', inW(W.lit, t) ? 1 : 0, 1); this.matchFire.update(dt, t);
    this.matchRFire.set('m', inW(W.lit, t) ? 1 : 0, 1); this.matchRFire.update(dt, t);
    const staffLit = t >= 53.259 && t < 93.836;
    this.staffFire.set('flame', staffLit ? 1 : 0, t >= 53.259 && t < 53.66 ? 2.2 - 3 * (t - 53.259) : t > 55.37 && t < 58.2 ? 1.25 : 1); this.staffFire.update(dt, t);
    this.camera.userData.flash.visible = (t > 117.7 && t < 117.85) || (t > 124.84 && t < 125.0);
    return { staffLit, staffTip: () => this.gm.localToWorld(new THREE.Vector3(0, 2.4, 0)) };
  }
  dispose() { this.matchFire.dispose(); this.matchRFire.dispose(); this.phoneFire.dispose(); this.staffFire.dispose(); }
}
