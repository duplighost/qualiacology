// What you see of yourself: the board and the girl on it. The body is
// Quaternius' Superhero_Female (CC0) with Hair_Buns, posed every frame from
// the physics: sideways stance, crouch into the dip, knees up in the air,
// lean into the line. Her clothes are painted in the shader by which bone
// moves each part (jacket, leggings, sneakers), so each song can dress her.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadSkater, attachSkater } from './skaters.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
let _riderAsset = null;
export function loadRider() {
  if (!_riderAsset) _riderAsset = new GLTFLoader().loadAsync('assets/rider/rider.glb').catch((e) => { console.warn('rider model', e); return null; });
  return _riderAsset;
}

// which outfit zone each bone belongs to: 0 skin, 1 jacket, 2 leggings, 3 shoes, 4 gloves
const ZONE = (name) => {
  if (/^(spine|clavicle|upperarm|lowerarm)/.test(name)) return 1;
  if (/^neck/.test(name)) return 1;
  if (/^(pelvis|thigh|calf)/.test(name)) return 2;
  if (/^(foot|ball)/.test(name)) return 3;
  if (/^(hand|thumb|index|middle|ring|pinky)/.test(name)) return 4;
  return 0;
};

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

export class RiderView {
  constructor(scene, P, skater = null) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.P = P;
    this.attached = false;

    // ----- board -----
    this.board = new THREE.Group();
    this.root.add(this.board);
    // the deck on its own, so it can flip and spin under her feet on a rail (a board you unlock goes in here too)
    this.deck = new THREE.Group();
    this.deck.position.y = 0.17;
    this.board.add(this.deck);
    const shape = new THREE.Shape();
    const L = 0.8, W = 0.24, r = 0.21;
    shape.moveTo(-L + r, -W); shape.lineTo(L - r, -W); shape.quadraticCurveTo(L, -W, L, -W + r); shape.lineTo(L, W - r);
    shape.quadraticCurveTo(L, W, L - r, W); shape.lineTo(-L + r, W); shape.quadraticCurveTo(-L, W, -L, W - r);
    shape.lineTo(-L, -W + r); shape.quadraticCurveTo(-L, -W, -L + r, -W);
    const bg = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3, curveSegments: 10 });
    bg.rotateX(-Math.PI / 2); bg.rotateY(Math.PI / 2);
    this.boardMat = new THREE.MeshStandardMaterial({ color: P.board, roughness: 0.42, metalness: 0.35 });
    rim(this.boardMat, P.edge, 1.0);
    const deck = new THREE.Mesh(bg, this.boardMat);
    deck.position.y = 0.16 - 0.17;
    this.deck.add(deck);
    // glowing underside strip and a stripe on the deck
    const ug = new THREE.PlaneGeometry(0.34, 1.42); ug.rotateX(Math.PI / 2);
    this.underMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.edge).multiplyScalar(3.5) });
    const under = new THREE.Mesh(ug, this.underMat); under.position.y = 0.135 - 0.17; this.deck.add(under);
    const sg = new THREE.PlaneGeometry(0.05, 1.3); sg.rotateX(-Math.PI / 2);
    this.stripeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.fret).multiplyScalar(2.2) });
    const stripe = new THREE.Mesh(sg, this.stripeMat); stripe.position.y = 0.232 - 0.17; this.deck.add(stripe);
    // hover glow on the ribbon under the board
    const pg = new THREE.PlaneGeometry(1.9, 2.6); pg.rotateX(-Math.PI / 2);
    this.poolMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.edge) }, uK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*(modelViewMatrix*vec4(position,1.0));} ',
      fragmentShader: 'uniform vec3 uColor; uniform float uK; varying vec2 vUv; void main(){ vec2 d=(vUv-0.5)*vec2(1.0,0.75)*2.0; float a=exp(-dot(d,d)*5.0); gl_FragColor=vec4(uColor*a*0.9*uK,1.0);} ',
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.pool = new THREE.Mesh(pg, this.poolMat);
    scene.add(this.pool);
    // a soft key light that travels with her so the outfit reads at night
    this.key = new THREE.PointLight(new THREE.Color(P.keyLight ?? 0xffd9ec), 9, 9, 1.6);
    this.key.position.set(0.9, 2.7, -2.4);   // behind and above: lights the side the camera sees
    this.root.add(this.key);

    // the girl
    this.char = new THREE.Group();
    this.char.rotation.y = -Math.PI / 2;      // regular stance: left foot forward, facing the right of the road
    this.char.position.y = 0.205;
    this.board.add(this.char);
    this.pose = { crouch: 0.3, lean: 0, air: 0, wipe: 0, spin: 0, look: 0, hands: 0, grab: 0, cheer: 0 };
    this.cheering = false; this.cheerT = 0; this.tempo = 2;   // beats a second, for the cheer (main.js sets the song's)
    this.clock = 0;
    this.trick = null;   // { kind, t, dur, turns }
    this._tq = new THREE.Quaternion(); this._te = new THREE.Euler(0, 0, 0, 'YXZ'); this._tc = new THREE.Vector3(); this._tp = new THREE.Vector3();
    this.mats = [];
    // one of Alex's skaters if one's chosen, else the classic girl (and her if theirs won't load)
    this.skater = null; this.titleK = 0;
    this.ready = skater && skater.file
      ? loadSkater(skater.file).then((g) => { if (g) this.skater = attachSkater(this, g, skater, P); else return loadRider().then((r) => { if (r) this._attach(r); }); })
      : loadRider().then((g) => { if (g) this._attach(g); });

    this._v = new THREE.Vector3(); this._f = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._pq = new THREE.Quaternion(); this._cq = new THREE.Quaternion(); this._ax = new THREE.Vector3();
  }

  _attach(g) {
    const P = this.P;
    const model = skClone(g.scene);
    this.char.add(model);
    this.bones = {};
    model.traverse((o) => {
      if (o.isBone) this.bones[o.name] = o;
      if (o.isMesh) {
        o.frustumCulled = false;
        const name = (o.material && o.material.name) || '';
        if (o.name.startsWith('Hair')) {
          o.material = new THREE.MeshStandardMaterial({ color: P.hair, roughness: 0.45, metalness: 0.0 });
          rim(o.material, P.rim, 1.4);
        } else if (o.name === 'Superhero_Female') {
          o.material = this._outfit(o, o.material);
        } else if (o.name === 'Eyes') {
          o.material = new THREE.MeshBasicMaterial({ color: 0x0c0a10 });
        } else if (o.material) {
          o.material = o.material.clone(); rim(o.material, P.rim, 0.6);
        }
        this.mats.push(o.material);
      }
    });
    this.rest = {};
    for (const [n, b] of Object.entries(this.bones)) this.rest[n] = { q: b.quaternion.clone(), p: b.position.clone() };
    this.attached = true;
  }

  // paint clothes by bone: every vertex blends the colours of the bones that move it
  _outfit(mesh, base) {
    const P = this.P, geo = mesh.geometry;
    const zones = mesh.skeleton.bones.map((b) => ZONE(b.name));
    const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
    const n = si.count, zone = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 4; k++) {
        const z = zones[si.getComponent(i, k)], w = sw.getComponent(i, k);
        if (z > 0 && z <= 4) zone[i * 4 + (z - 1)] += w;
      }
    }
    geo.setAttribute('aZone', new THREE.BufferAttribute(zone, 4));
    const m = new THREE.MeshStandardMaterial({ map: base.map || null, roughness: 0.62, metalness: 0.0, color: 0xffffff });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uJacket = { value: new THREE.Color(P.jacket) };
      sh.uniforms.uLegs = { value: new THREE.Color(P.suit) };
      sh.uniforms.uShoes = { value: new THREE.Color(P.shoes ?? 0xf2eef5) };
      sh.uniforms.uGloves = { value: new THREE.Color(P.gloves ?? 0x15121a) };
      sh.uniforms.uRim = { value: new THREE.Color(P.rim) }; sh.uniforms.uRimK = { value: 1 };
      m.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aZone; varying vec4 vZone; varying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = aZone; vObj = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uJacket, uLegs, uShoes, uGloves, uRim; uniform float uRimK; varying vec4 vZone; varying vec3 vObj;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec4 zw = clamp(vZone * 1.6 - 0.25, 0.0, 1.0);
          float any = clamp(zw.x + zw.y + zw.z + zw.w, 0.0, 1.0);
          vec3 cloth = (uJacket * zw.x + uLegs * zw.y + uShoes * zw.z + uGloves * zw.w) / max(zw.x + zw.y + zw.z + zw.w, 1e-3);
          // a seam of piping down the jacket and leggings
          float seam = smoothstep(0.012, 0.0, abs(abs(vObj.x) - 0.075)) * (zw.x + zw.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, cloth, any);
          diffuseColor.rgb += uRim * seam * 0.6;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.4);
          totalEmissiveRadiance += uRim * rimF * 0.9 * uRimK;`);
    };
    return m;
  }

  setTint(flow) {
    for (const m of this.mats) if (m.userData.shader && m.userData.shader.uniforms.uRimK) m.userData.shader.uniforms.uRimK.value = 0.45 + 0.8 * flow;
    // the deck's own edge light stays a line round it: at a standstill under the key light a full rim turned it into a white slab
    const bm = this.boardMat.userData.shader; if (bm && bm.uniforms.uRimK) bm.uniforms.uRimK.value = 0.2 + 0.35 * flow;
    this.underMat.color.set(this.P.edge).multiplyScalar(2 + 4 * flow);
    if (this.skater) this.skater.setRim(0.35 + 0.7 * flow);
  }

  // rotate a bone about an axis given in the character's own space
  _rot(name, axis, ang) {
    const b = this.bones[name]; if (!b || !ang) return;
    b.parent.getWorldQuaternion(this._pq);
    this.char.getWorldQuaternion(this._cq);
    this._ax.copy(axis).applyQuaternion(this._cq).applyQuaternion(this._pq.invert());
    this._q.setFromAxisAngle(this._ax.normalize(), ang);
    b.quaternion.premultiply(this._q);
  }
  _move(name, d) {
    const b = this.bones[name]; if (!b) return;
    b.parent.getWorldQuaternion(this._pq);
    this.char.getWorldQuaternion(this._cq);
    const s = new THREE.Vector3(); b.parent.getWorldScale(s);
    this._ax.copy(d).applyQuaternion(this._cq).applyQuaternion(this._pq.invert()).divide(s);
    b.position.add(this._ax);
  }

  // place on the course and pose
  update(track, rider, dt, beatPulse) {
    const t = rider.t;
    const groundY = rider.course.sample(t).y;
    // on a rail she rides up on it
    const railH = (rider.rail ? rider.rail.h : (this._railH || 0.5)) * rider.railK;
    if (rider.rail) this._railH = rider.rail.h;
    const pos = track.at(t, rider.x, rider.y - groundY + 0.42 + railH, this._v);
    const fwd = track.dirAt(t, this._f);
    const vh = Math.max(8, rider.v);
    const pitch = Math.atan2(rider.vy, vh);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const bank = track.bankAt(t);
    const p = this.pose;
    p.lean += (clamp(rider.lean, -1, 1) - p.lean) * Math.min(1, dt * 10);
    p.air += ((rider.grounded ? 0 : 1) - p.air) * Math.min(1, dt * 9);
    // a long flight and not diving: hands up (unless she's busy with a trick)
    const tk = this.trick && this.trick.kind, combo = this.trick && this.trick.combo;
    const handsT = !rider.grounded && rider.air > 0.45 && !rider.press && rider.wipe <= 0 && (!tk || (tk === 'spin' && !combo)) ? 1 : (rider.rail ? 0.45 : 0);
    p.grab += ((tk === 'grab' || tk === 'flip' || combo ? 1 : 0) - p.grab) * Math.min(1, dt * 10);
    p.hands += (handsT - p.hands) * Math.min(1, dt * (handsT ? 5 : 12));
    const crouchT = rider.press ? 0.92 : 0.32 + 0.12 * beatPulse;
    p.crouch += (clamp(crouchT + rider.compress * 0.5, 0, 1.15) - p.crouch) * Math.min(1, dt * (rider.press ? 18 : 9));
    p.wipe += ((rider.wipe > 0 ? 1 : 0) - p.wipe) * Math.min(1, dt * 6);
    if (rider.wipe > 0) p.spin += dt * 10; else p.spin *= Math.exp(-dt * 6);

    // the stop at the end: swing the board across, sit back on the heel edge, then stand
    const stopT = rider.stopping ? 1 : 0;
    p.stop = (p.stop ?? 0) + (stopT - (p.stop ?? 0)) * Math.min(1, dt * (stopT ? 9 : 4));
    // stopped: she stands up and cheers
    p.cheer += ((this.cheering ? 1 : 0) - p.cheer) * Math.min(1, dt * (this.cheering ? 5 : 8));
    if (this.cheering) this.cheerT += dt; else this.cheerT = 0;
    const braking = rider.stopping && rider.stopV0 > 0 ? rider.stopVel / rider.stopV0 : 0;
    // stopped and cheering: the board comes back level under her
    p.edge = (p.edge ?? 0) + ((rider.stopping && !this.cheering ? 0.2 + 0.55 * Math.sqrt(braking) : 0) - (p.edge ?? 0)) * Math.min(1, dt * (this.cheering ? 4 : 7));
    // ... and as she comes to a stop she stands up straight, however the hill runs under her: the
    // slope she stopped on had pitched her (and her cheer) a third of the way onto her back
    p.level = (p.level ?? 0) + ((rider.stopping ? 1 - braking : 0) - (p.level ?? 0)) * Math.min(1, dt * 3);

    // stopped, the board hovers: a slow bob and a little roll, never quite still
    this.clock += dt;
    p.rest = (p.rest ?? 0) + (((rider.stopping && rider.stopVel < 1) || this.titleK > 0.5 ? 1 : 0) - (p.rest ?? 0)) * Math.min(1, dt * 2.5);
    pos.y += p.rest * (0.045 * Math.sin(this.clock * 2.1) + 0.015 * Math.sin(this.clock * 3.7 + 1)) + (p.hop || 0);
    this.root.position.copy(pos);
    this.root.rotation.order = 'YXZ';
    const lv = p.level * p.level * (3 - 2 * p.level);
    this.root.rotation.set(-pitch * (1 - lv) + p.rest * 0.025 * Math.sin(this.clock * 1.6), yaw, (-bank * 0.85 + p.lean * 0.42) * (1 - 0.8 * lv) + p.rest * 0.03 * Math.sin(this.clock * 1.3 + 0.5));
    // tricks turn the whole board (she's strapped to it): about her middle for flips and rolls
    let ang = 0, ang2 = 0;
    const tr = this.trick;
    if (tr) {
      // paced to come round by the time she lands: if she dives it comes round quicker
      if (rider.grounded) tr.f = Math.min(1, tr.f + dt * 7);
      else {
        const total = rider.air + rider.airTimeAhead(rider.press);
        tr.f = Math.max(tr.f, clamp(rider.air / Math.max(0.3, total * (tr.kind === 'grab' ? 0.9 : 0.8)), 0, 1));
      }
      const f = tr.f;
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      ang = e * Math.PI * 2 * tr.turns;
      // a combo flip is a corkscrew: a turn about her length as well
      if (tr.combo && tr.kind === 'flip') ang2 = e * Math.PI * 2;
      if (f >= 1) { this.trick = null; ang = 0; ang2 = 0; }
    }
    const kind = tr ? tr.kind : null;
    // a trick she didn't land clean: a wobble
    this.bail = (this.bail || 0) * Math.exp(-dt * 3.5);
    const wob = this.bail * Math.sin(performance.now() * 0.03) * 0.35;
    // on a rail: board across it
    p.rail = (p.rail ?? 0) + ((rider.rail ? 1 : 0) - (p.rail ?? 0)) * Math.min(1, dt * 14);
    this._te.set(Math.sin(p.spin * 1.3) * 0.35 * p.wipe + (kind === 'flip' ? -ang : 0) + wob, Math.sin(p.spin) * 0.8 * p.wipe + (kind === 'spin' ? ang : 0) + ang2 + p.rail * 1.25, kind === 'roll' ? ang : wob * 0.6);
    this.board.quaternion.setFromEuler(this._te);
    if (p.stop > 0.001) {
      const st = p.stop * p.stop * (3 - 2 * p.stop);
      this._sq1 = this._sq1 || new THREE.Quaternion(); this._sq2 = this._sq2 || new THREE.Quaternion();
      this._sq1.setFromAxisAngle(Y, st * Math.PI * 0.5);
      this._sq2.setFromAxisAngle(X, -p.edge * st);
      this.board.quaternion.premultiply(this._sq1).premultiply(this._sq2);
    }
    if (kind === 'flip' || kind === 'roll') {
      this._tc.set(0, 0.95, 0);
      this._tp.copy(this._tc).applyQuaternion(this.board.quaternion);
      this.board.position.copy(this._tc).sub(this._tp);
    } else this.board.position.set(0, 0, 0);

    this._railTrickFrame(dt);
    if (this.skater) this.skater.update(p, rider, dt, this.titleK);
    else if (this.attached) this._pose(p, rider, dt);

    // glow pool on the ribbon below the board
    const ground = track.at(t, rider.x, 0.06, this._v);
    this.pool.position.copy(ground);
    const slope = Math.atan2(rider.course.sample(t).vy, vh);
    this.pool.rotation.order = 'YXZ';
    this.pool.rotation.set(-slope, yaw, -bank);
    const h = Math.max(0, rider.y - groundY);
    this.poolMat.uniforms.uK.value = (0.45 + 0.7 * rider.flow) / (1 + h * 0.7);
  }

  // a trick for this flight; dur is how long she'll be up
  startTrick(kind, dur, turns = 1, combo = false) { this.trick = { kind, f: 0, dur: Math.max(0.32, dur), turns, combo }; }
  // on a rail: she hops and the deck goes round under her feet (a kickflip, or a shove-it), back down on the rail
  railTrick(kind) { this.rt = { kind, f: 0 }; }
  _railTrickFrame(dt) {
    const rt = this.rt;
    if (!rt) return;
    rt.f = Math.min(1, rt.f + dt / 0.42);
    const f = rt.f, e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    const hop = Math.sin(Math.PI * f) * 0.68;
    this.deck.rotation.set(0, rt.kind === 'shuvit' ? e * Math.PI * 2 : 0, rt.kind === 'kickflip' ? e * Math.PI * 2 : 0);
    this.char.position.y = 0.205 + hop;
    this.deck.position.y = 0.17 + hop * 0.35;
    if (f >= 1) { this.rt = null; this.deck.rotation.set(0, 0, 0); this.char.position.y = 0.205; this.deck.position.y = 0.17; }
  }

  _pose(p, rider, dt) {
    for (const [n, r] of Object.entries(this.rest)) { this.bones[n].quaternion.copy(r.q); this.bones[n].position.copy(r.p); }
    const st = (p.stop ?? 0) * (p.stop ?? 0) * (3 - 2 * (p.stop ?? 0)), sk = st * clamp(((p.edge ?? 0) - 0.2) / 0.55, 0, 1);
    let c = clamp(p.crouch * (1 - st) + (0.58 + 0.55 * sk) * st, 0, 1.15);
    if (p.cheer > 0.001) c = this._cheerCrouch(c, p.cheer, this.cheerT);
    const air = p.air;
    const flex = 0.22 + 0.42 * c + 0.5 * air + 0.55 * p.grab;   // hip/knee bend, radians (tucked up in a grab)
    const spread = 0.17 + 0.03 * c;                         // feet apart along the board
    // drop the hips so the feet stay on the deck
    const legLen = 0.87;
    const drop = legLen * (1 - Math.cos(flex) * Math.cos(spread)) + 0.02;
    this._move('pelvis', new THREE.Vector3(0, -drop, -0.05 * c));
    this._rot('pelvis', Y, 0.12);
    this._rot('pelvis', X, 0.1 + 0.18 * c);
    // legs: apart along the board, knees forward, shins back, feet flat
    this._rot('thigh_l', Z, spread); this._rot('thigh_r', Z, -spread);
    this._rot('thigh_l', X, -flex); this._rot('thigh_r', X, -flex);
    this._rot('calf_l', X, flex * 1.9); this._rot('calf_r', X, flex * 1.9);
    this._rot('foot_l', X, -flex * 0.9); this._rot('foot_r', X, -flex * 0.9);
    this._rot('foot_l', Y, 0.35); this._rot('foot_r', Y, -0.15);
    // torso leans into the knees and opens toward the road ahead
    this._rot('spine_01', X, 0.12 + 0.16 * c);
    this._rot('spine_02', Y, 0.25 + 0.1 * air);
    this._rot('spine_03', Y, 0.25);
    this._rot('spine_03', Z, -p.lean * 0.18);
    // head: eyes down the road (in the stop, where the board was going: over her front shoulder)
    this._rot('neck_01', Y, 0.45 - 0.35 * st);
    this._rot('Head', Y, 0.55 - 0.45 * st);
    if (st > 0.01) { this._rot('spine_01', X, -0.22 * sk); this._rot('spine_02', Y, -0.25 * st); }
    this._rot('Head', X, 0.12 + 0.1 * c);
    // arms: down and out for balance, up and wide in the air
    const hu = p.hands * p.hands * (3 - 2 * p.hands);
    const gr = p.grab * p.grab * (3 - 2 * p.grab);
    let armDown = (1.05 - 0.75 * air - 0.15 * c) * (1 - hu) - 1.3 * hu;
    armDown = armDown * (1 - st) + (0.3 - 0.15 * sk) * st;      // arms out for the stop: the front one up and out
    // on a rail: arms out for balance, lower and wider in the crouch while she holds it down
    const ra = (p.rail ?? 0) * (1 - hu);
    if (ra > 0.01) armDown = armDown * (1 - ra) + (0.32 - 0.22 * clamp((c - 0.4) / 0.5, 0, 1)) * ra;
    // grab: the back hand reaches down to the edge of the board
    let armR = armDown * (1 - gr) + 1.55 * gr;
    if (st > 0.01) { armR = armR * (1 - st) + (0.95 - 0.25 * sk) * st; this._rot('upperarm_r', X, -0.55 * st); this._rot('lowerarm_r', Z, 0.4 * st); }
    this._rot('upperarm_l', Z, -armDown); this._rot('upperarm_r', Z, armR);
    if (gr > 0.01) { this._rot('upperarm_r', X, -0.5 * gr); this._rot('lowerarm_r', Z, 0.35 * gr); this._rot('spine_01', X, 0.3 * gr); }
    this._rot('upperarm_l', Y, (0.35 + 0.25 * c) * (1 - hu)); this._rot('upperarm_r', Y, (-0.1 - 0.3 * c) * (1 - hu));
    this._rot('lowerarm_l', Y, (0.35 + 0.3 * c) * (1 - hu) + 0.25 * hu); this._rot('lowerarm_r', Y, (-0.35 - 0.3 * c) * (1 - hu) - 0.25 * hu);
    // lean arms with the line
    this._rot('clavicle_l', Z, p.lean * 0.25); this._rot('clavicle_r', Z, p.lean * 0.25);
    if (p.cheer > 0.001) this._cheer(p.cheer, this.cheerT);
  }

  // The cheer, on the song's own beat (tempo): she stands up out of the stop, punches a fist up on
  // four beats with her knees dipping into each one, then both arms up, rocking side to side with
  // the bounce still in her knees and her hips, the board hovering under her. Nothing holds still.
  _cheerPhase(T) {
    const f = this.tempo || 2, ph = T * f;                     // beats since she started
    const dip = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ph), 2);   // 1 on each beat
    const both = Math.min(1, Math.max(0, (ph - 4.3) / 0.8)), bb = both * both * (3 - 2 * both);
    return { ph, dip, bb, sway: Math.sin(Math.PI * ph) };     // (sway: one way and back over two beats)
  }
  _cheerCrouch(c, w, T) {
    const ww = w * w * (3 - 2 * w), { dip, bb } = this._cheerPhase(T);
    const rise = Math.min(1, T / 0.45);
    // up out of the crouch, a dip into every beat (softer once both arms are up)
    const target = 0.34 + (0.2 - 0.08 * bb) * dip * rise;
    return c + (target - c) * ww;
  }
  _cheer(w, T) {
    // (these bones raise an arm about X: + for her left, - for her right; found by eye in work/posetest.html)
    const ww = w * w * (3 - 2 * w);
    const { ph, dip, bb, sway } = this._cheerPhase(T);
    const pumping = 1 - bb;
    // the pump: straight up on the beat, a fist by her head between
    const up = dip;
    // stand tall, chest a little up, nodding with each pump (not leaning back into them: from the
    // end shot she looked to be lying back)
    this._rot('spine_01', X, (-0.05 - 0.03 * up * pumping) * ww);
    this._rot('spine_02', X, -0.02 * ww);
    this._rot('Head', X, (-0.1 + 0.12 * dip) * ww);
    // hips and shoulders going with the rock
    this._rot('pelvis', Z, 0.07 * sway * ww);
    this._rot('spine_02', Z, -0.05 * sway * ww);
    this._rot('spine_03', Z, (0.08 * sway * bb) * ww);
    this._rot('spine_02', Y, 0.08 * Math.sin(Math.PI * ph * 0.5) * ww);
    this._rot('Head', Z, -0.08 * sway * ww);
    // her left arm: punching up on each beat, then up with the other
    const lUp = up * pumping + bb;
    this._rot('upperarm_l', X, (1.15 + 0.4 * lUp) * ww);
    this._rot('lowerarm_l', Y, (1.3 * (1 - lUp)) * ww);
    this._rot('hand_l', Y, 0.5 * ww);
    // her right arm: out to the side for balance, swinging a little, then up too; the two of them rocking
    this._rot('upperarm_r', X, (-0.55 - 0.12 * dip * pumping - 2.05 * bb) * ww);
    this._rot('lowerarm_r', Y, (-0.5 + 0.35 * bb) * ww);
    this._rot('upperarm_l', Z, -0.12 * sway * bb * ww);
    this._rot('upperarm_r', Z, -0.12 * sway * bb * ww);
  }

}

function rim(m, color, k) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: new THREE.Color(color) };
    sh.uniforms.uRimK = { value: k };
    m.userData.shader = sh;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += uRim * rimF * 1.5 * uRimK;`);
  };
}
