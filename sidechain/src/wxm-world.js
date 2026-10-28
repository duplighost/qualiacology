// White Christmas. Grandma's house at Christmas, and the street it's on. Outside: snow, every house
// strung with lights, snowmen and Santas and a reindeer made of light, the carolers, and in the
// choruses the snow coming down until everything's white. Inside: her pink bathroom with the door
// locked and the fan killed, the bulbs round the mirror, the magnifying mirror, the Santa on the toilet
// lid, the nativity, the Precious Moments girl whose painted eyes follow you; the dinner, ridden on the
// tablecloth among dad's cans, mom's paper crown, the dry ham, the cropped photo; the hall of coats,
// the basement's glow, mom's handbag; and the living room at 2 a.m. with the tree lights still on,
// the glasses all empty, the plate she left in the fridge with his name on it and a little heart.
// It ends with the fridge standing open in the snow.

import * as THREE from 'three';
import { Room, capQuad } from './summer.js';
import { prepare, floorAt } from './trail.js';
import { HOUSE, roomMaterial, TABLE } from './wxm-room.js';
import { merge, clamp, smooth, selfLit } from './wxm-lib.js';
import './wxm-street.js';
import './wxm-bath.js';
import './wxm-table.js';
import { NT, TREE_COLS, tapeTex, PLATE_Y } from './wxm-night.js';

const LAMP = [1, 0.8, 0.55];

// a room whose end walls can reach down past its floor (the dining room's floor is the tabletop,
// and its walls go on down to the carpet)
class WxmRoom extends Room {
  _cap(scene, t, k, spec) {
    if (!spec.down) return super._cap(scene, t, k, spec);
    prepare(this.course, null);
    const fy = floorAt(this.course, t), W = this.W, hw = spec.hw ?? 11, hh = spec.hh ?? 26, sill = spec.sill ?? 0;
    const top = Math.max(...this.ring.map((r) => r[1])), Y0 = -spec.down, Y1 = top;
    const parts = [];
    for (const [xa, ya, xb, yb] of [[-W, Y0, -hw, Y1], [hw, Y0, W, Y1], [-hw, hh, hw, Y1], [-hw, Y0, hw, sill]]) if (yb > ya + 0.01) parts.push(capQuad(xa, ya, xb, yb, 0, 6, 0));
    for (const z of [0.06, -0.06]) for (const [xa, ya, xb, yb] of [[-hw - 0.9, sill - 0.9, -hw, hh + 0.9], [hw, sill - 0.9, hw + 0.9, hh + 0.9], [-hw, hh, hw, hh + 0.9]]) parts.push(capQuad(xa, ya, xb, yb, z, 8, 0));
    const grp = new THREE.Group(), mesh = new THREE.Mesh(merge(parts), this.mat), style = this.style, mat = this.mat;
    mesh.onBeforeRender = () => { mat.uniforms.uStyle.value = style; mat.uniformsNeedUpdate = true; };
    mesh.frustumCulled = false; grp.add(mesh); grp.userData = { t, fy, k }; scene.add(grp);
    return grp;
  }
}

// the heavy snow of the choruses: big soft flakes drifting at you, many more than the weather's
function bigSnow(n) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 120; p[i * 3 + 1] = Math.random() * 70 - 20; p[i * 3 + 2] = (Math.random() - 0.5) * 120; sd[i] = Math.random(); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime; uniform vec3 uCam; uniform float uA; varying float vA;
      void main(){
        vec3 q = position;
        q.y -= uTime * (3.0 + aSeed * 2.5);
        q.x += sin(uTime * 0.6 + aSeed * 40.0) * 2.0;
        q.z += cos(uTime * 0.5 + aSeed * 30.0) * 2.0;
        // wrapped round the camera in a box 120 across and 70 high
        vec3 r = q - uCam; r.xz = mod(r.xz + 60.0, 120.0) - 60.0; r.y = mod(r.y + 25.0, 70.0) - 25.0;
        vec4 mv = viewMatrix * vec4(uCam + r, 1.0);
        gl_PointSize = clamp(240.0 * (0.6 + aSeed) / -mv.z, 1.5, 21.0);
        vA = uA * smoothstep(90.0, 10.0, -mv.z) * smoothstep(1.5, 5.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; varying float vA;
      void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.25, 0.02, dot(d, d)); gl_FragColor = vec4(uCol * a * vA, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.visible = false;
  return pts;
}

export class WxmWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new WxmRoom(scene, S.course, sp, this.mat, HOUSE));
    // where one room ends and the next begins at the same moment, both put their end wall there: one
    // wall twice, in two rooms' paint, fighting for the same depth (it flickered as you came up to the
    // door). The next room's goes a step further in, behind the first.
    for (const a of this.rooms) for (const ca of a.caps) if (ca.userData.k === 1) {
      for (const b of this.rooms) for (const cb of b.caps) if (cb.userData.k === 0 && Math.abs(cb.userData.t - ca.userData.t) < 0.05) cb.userData.t = ca.userData.t + 0.02;
    }
    this.snow = bigSnow(1900); scene.add(this.snow);
    this.cfg = S.plan.wxm || {};
    this._g = new THREE.Vector3();
    // his heart at 2 a.m.: beats that come too close together, then skip
    const hb = this.cfg.heart; this.beats = [];
    if (hb) { let t = hb[0]; const R = [0.62, 0.21, 0.95, 0.58, 0.18, 0.4, 1.1, 0.6, 0.22, 0.7]; for (let i = 0; t < hb[1]; i++) { this.beats.push(t); t += R[i % R.length]; } }
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, T = S.rider.t, cfg = this.cfg;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyLo.value.set(P.horizon); u.uSkyHi.value.set(P.zenith); u.uSnow.value = clamp(P.snow ?? 0, 0, 1);
    u.uLamps.value = T > 345 && T < 406.5 ? 0.15 : 1;
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    // the heavy snow: only when the weather is heavy, and never under a roof
    const inside = this.rooms.some((r) => T > r.span.from && T < r.span.to && !(r.span.snowIn && T > r.span.snowIn));
    const a = inside ? 0 : smooth(0.6, 1.0, P.snow ?? 0);
    this.snow.visible = a > 0.01; this.snow.material.uniforms.uA.value = a * 0.85; this.snow.material.uniforms.uTime.value = time; this.snow.material.uniforms.uCam.value.copy(camera.position);
    // what the things along the way read this frame (the scenery's S.wxm)
    const W = S.town.wxm || (S.town.wxm = {});
    // "may your heart keep on beating": every light on the street beats with the kick
    const pz = cfg.pulse; let pulse = 0;
    if (pz && T > pz[0] && T < pz[1]) { const b = S.course.beatAt(T), f = b - Math.floor(b); pulse = 1.4 * Math.exp(-f * 5) * smooth(pz[0], pz[0] + 0.3, T) * (1 - smooth(pz[1] - 0.4, pz[1], T)); }
    W.pulse = pulse;
    // the town's lights come up with how well you rode, at the end
    W.lights = 1;
    // the bulbs round her mirror: "better lighting than your apartment"
    W.blaze = 0; for (const [a0, a1, k] of cfg.blaze || []) W.blaze = Math.max(W.blaze, k * smooth(a0, a0 + 0.8, T) * (1 - smooth(a1 - 1, a1, T)));
    // his heart at 2 a.m., and the tree with it
    const hb = cfg.heart; let heartK = 0, beat = 0;
    if (hb) { heartK = smooth(hb[0] - 0.5, hb[0], T) * (1 - smooth(hb[1], hb[1] + 1.5, T)); for (const bt of this.beats) if (T >= bt) beat = Math.max(beat, Math.exp(-(T - bt) * 7)); }
    W.heartK = heartK; W.beat = beat;
    S.town.wxmRider = S.view.root.position;
    const M = S.town.mats;
    if (M.wxmFlameM) M.wxmFlameM.uniforms.uTime.value = time;
    if (M.wxmBulbM) M.wxmBulbM.userData.u.uPulse.value = pulse * 0.6;
  }
  // the ceiling lights of her rooms (none in the living room at 2 a.m.)
  draw(T) {
    const g = this._g;
    for (const r of this.rooms) {
      if (!r.mesh.visible || r.span.style === 'living') continue;
      const dining = r.span.style === 'dining';
      for (const f of r.fixtures) {
        const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g);
        if (dining) { T.glow(g.x, fy + 44, g.z, 16, LAMP, 0.9); T.glow(g.x, fy + 44, g.z, 46, LAMP, 0.18); T.pool(g.x, fy + 0.08, g.z, 60, LAMP, 0.3); }
        else { T.glow(g.x, fy + r.H - 1.4, g.z, 8, LAMP, 0.9); T.pool(g.x, fy + 0.08, g.z, 34, LAMP, 0.3); }
      }
    }
  }
}

// ---------- the end: the fridge standing open in the snow, her plate in its light, the tree beside ----------
export class WxmFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery;
    this.t = cfg.t; this.x = cfg.x ?? -36;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = selfLit({ roughness: 0.45 }, 0.3), foil = selfLit({ roughness: 0.18, metalness: 0.75 }, 0.6), tree = selfLit({ roughness: 0.5, metalness: 0.15 }, 0.25);
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    add(NT.fridge(), mat, 0, 0, 0);
    this.door = add(NT.fridgeDoor(), mat, -10, 0, 8.1, -1.9);
    add(NT.plate(), foil, 0, PLATE_Y, 3.4);
    const tape = tapeTex();
    add(NT.tape(), new THREE.MeshStandardMaterial({ map: tape, emissive: 0xffffff, emissiveMap: tape, emissiveIntensity: 0.7, roughness: 0.7, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }), 0, PLATE_Y, 3.4);
    add(NT.tree(), tree, 30, 0, -10, 0.4);
    this.group.scale.setScalar(cfg.s ?? 1.4);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this.earned = 0.6; this.fired = false;
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    // open toward her on the road (she stops a little short of it), so the light and the plate are what she sees
    const to = track.ground(Math.min(rider.t, this.t - 0.5), 0, this._w);
    this.group.rotation.set(0, Math.atan2(to.x - this._p.x, to.z - this._p.z) + (this.cfg.rot ?? 0), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.4, w = this._w, c = [0.85, 0.93, 1];
    // the fridge's light on the snow
    w.set(0, 30, 2).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 12 * s, c, 1.2);
    w.set(0, 18, 8).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 36 * s, c, 0.45);
    w.set(0, 0, 24).applyMatrix4(this.group.matrixWorld); S.pool(w.x, 0.2, w.z, 46 * s, c, 0.8);
    w.set(2.6, PLATE_Y + 4.0, 3.8).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 1.8 * s, [1, 0.15, 0.2], 0.9);
    // the tree's lights, on, and brighter for a ride that earned it
    const k = 0.6 + 0.6 * (this.fired ? this.earned : 0.4), T = songT;
    for (let j = 0; j < 40; j++) {
      const f = (j + 0.5) / 40, y = 6.5 + f * 25.5, r = 12.6 * (1 - f * 0.86) + 0.8, a = f * Math.PI * 14 + 0.7;
      w.set(30 + Math.cos(a) * r, y, -10 + Math.sin(a) * r).applyMatrix4(this.group.matrixWorld);
      S.glow(w.x, w.y, w.z, 4.2 * s, TREE_COLS[j % 6], k * (0.6 + 0.4 * Math.sin(T * 1.7 + j * 2.3)));
    }
    w.set(30, 39, -10).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 10 * s, [1, 0.85, 0.45], 1.2 * k);
    w.set(30, 0, -10).applyMatrix4(this.group.matrixWorld); S.pool(w.x, 0.2, w.z, 50 * s, [1, 0.6, 0.45], 0.4 * k);
  }
}
