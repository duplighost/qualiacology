// What you see of yourself: the board and the girl on it. The body is
// Quaternius' Superhero_Female (CC0) with Hair_Buns, posed every frame from
// the physics: sideways stance, crouch into the dip, knees up in the air,
// lean into the line. Her clothes are painted in the shader by which bone
// moves each part (jacket, leggings, sneakers), so each song can dress her.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

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
  constructor(scene, P) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.P = P;
    this.attached = false;

    // ----- board -----
    this.board = new THREE.Group();
    this.root.add(this.board);
    const shape = new THREE.Shape();
    const L = 0.8, W = 0.24, r = 0.21;
    shape.moveTo(-L + r, -W); shape.lineTo(L - r, -W); shape.quadraticCurveTo(L, -W, L, -W + r); shape.lineTo(L, W - r);
    shape.quadraticCurveTo(L, W, L - r, W); shape.lineTo(-L + r, W); shape.quadraticCurveTo(-L, W, -L, W - r);
    shape.lineTo(-L, -W + r); shape.quadraticCurveTo(-L, -W, -L + r, -W);
    const bg = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 3, curveSegments: 10 });
    bg.rotateX(-Math.PI / 2); bg.rotateY(Math.PI / 2);
    this.boardMat = new THREE.MeshStandardMaterial({ color: P.board, roughness: 0.25, metalness: 0.4 });
    rim(this.boardMat, P.edge, 1.0);
    const deck = new THREE.Mesh(bg, this.boardMat);
    deck.position.y = 0.16;
    this.board.add(deck);
    // glowing underside strip and a stripe on the deck
    const ug = new THREE.PlaneGeometry(0.34, 1.42); ug.rotateX(Math.PI / 2);
    this.underMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.edge).multiplyScalar(3.5) });
    const under = new THREE.Mesh(ug, this.underMat); under.position.y = 0.135; this.board.add(under);
    const sg = new THREE.PlaneGeometry(0.05, 1.3); sg.rotateX(-Math.PI / 2);
    this.stripeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.fret).multiplyScalar(2.2) });
    const stripe = new THREE.Mesh(sg, this.stripeMat); stripe.position.y = 0.232; this.board.add(stripe);
    // hover glow on the ribbon under the board
    const pg = new THREE.PlaneGeometry(1.9, 2.6); pg.rotateX(-Math.PI / 2);
    this.poolMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.edge) }, uK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
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
    this.pose = { crouch: 0.3, lean: 0, air: 0, wipe: 0, spin: 0, look: 0, hands: 0 };
    this.mats = [];
    this.ready = loadRider().then((g) => { if (g) this._attach(g); });

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
    for (const m of this.mats.concat([this.boardMat])) if (m.userData.shader && m.userData.shader.uniforms.uRimK) m.userData.shader.uniforms.uRimK.value = 0.45 + 0.8 * flow;
    this.underMat.color.set(this.P.edge).multiplyScalar(2 + 4 * flow);
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
    const pos = track.at(t, rider.x, rider.y - groundY + 0.42, this._v);
    const fwd = track.dirAt(t, this._f);
    const vh = Math.max(8, rider.v);
    const pitch = Math.atan2(rider.vy, vh);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const bank = track.bankAt(t);
    const p = this.pose;
    p.lean += (clamp(rider.lean, -1, 1) - p.lean) * Math.min(1, dt * 10);
    p.air += ((rider.grounded ? 0 : 1) - p.air) * Math.min(1, dt * 9);
    // a long flight and not diving: hands up
    const handsT = !rider.grounded && rider.air > 0.45 && !rider.press && rider.wipe <= 0 ? 1 : 0;
    p.hands += (handsT - p.hands) * Math.min(1, dt * (handsT ? 5 : 12));
    const crouchT = rider.press ? 0.92 : 0.32 + 0.12 * beatPulse;
    p.crouch += (clamp(crouchT + rider.compress * 0.5, 0, 1.15) - p.crouch) * Math.min(1, dt * (rider.press ? 18 : 9));
    p.wipe += ((rider.wipe > 0 ? 1 : 0) - p.wipe) * Math.min(1, dt * 6);
    if (rider.wipe > 0) p.spin += dt * 10; else p.spin *= Math.exp(-dt * 6);

    this.root.position.copy(pos);
    this.root.rotation.order = 'YXZ';
    this.root.rotation.set(-pitch, yaw, -bank * 0.85 + p.lean * 0.42);
    this.board.rotation.set(Math.sin(p.spin * 1.3) * 0.35 * p.wipe, Math.sin(p.spin) * 0.8 * p.wipe, 0);

    if (this.attached) this._pose(p, rider, dt);

    // glow pool on the ribbon below the board
    const ground = track.at(t, rider.x, 0.06, this._v);
    this.pool.position.copy(ground);
    const slope = Math.atan2(rider.course.sample(t).vy, vh);
    this.pool.rotation.order = 'YXZ';
    this.pool.rotation.set(-slope, yaw, -bank);
    const h = Math.max(0, rider.y - groundY);
    this.poolMat.uniforms.uK.value = (0.45 + 0.7 * rider.flow) / (1 + h * 0.7);
  }

  _pose(p, rider, dt) {
    for (const [n, r] of Object.entries(this.rest)) { this.bones[n].quaternion.copy(r.q); this.bones[n].position.copy(r.p); }
    const c = clamp(p.crouch, 0, 1.15), air = p.air;
    const flex = 0.22 + 0.42 * c + 0.5 * air;            // hip/knee bend, radians
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
    // head: eyes down the road
    this._rot('neck_01', Y, 0.45);
    this._rot('Head', Y, 0.55);
    this._rot('Head', X, 0.12 + 0.1 * c);
    // arms: down and out for balance, up and wide in the air
    const hu = p.hands * p.hands * (3 - 2 * p.hands);
    const armDown = (1.05 - 0.75 * air - 0.15 * c) * (1 - hu) - 1.3 * hu;
    this._rot('upperarm_l', Z, -armDown); this._rot('upperarm_r', Z, armDown);
    this._rot('upperarm_l', Y, (0.35 + 0.25 * c) * (1 - hu)); this._rot('upperarm_r', Y, (-0.1 - 0.3 * c) * (1 - hu));
    this._rot('lowerarm_l', Y, (0.35 + 0.3 * c) * (1 - hu) + 0.25 * hu); this._rot('lowerarm_r', Y, (-0.35 - 0.3 * c) * (1 - hu) - 0.25 * hu);
    // lean arms with the line
    this._rot('clavicle_l', Z, p.lean * 0.25); this._rot('clavicle_r', Z, p.lean * 0.25);
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
