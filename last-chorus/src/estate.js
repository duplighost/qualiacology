// Your Wife, My Number. One summer day at a big house, from the glare to the blue of the evening.
// The estate's wall and its gate swinging open on the drop; the cypress allée over mown lawns,
// sprinklers ticking round on the beat in the heat; all the money on your wrist, frost and a
// clenched red fist, my digits writing themselves on a napkin, her steps in gold, the champagne
// tower going over on "messy"; one gate shut, four open. The choruses run between canals whose
// jets leap on the beat, magnums popping all down both sides; the privacy hedges come up out of
// the lawn, thunder you can see, doves for peace, his brother kissed in oils, the gold phone
// ringing, the grin, her standing there in gold, the house turning its floors round as its plan
// changes. Evening at the valet curb: the velvet rope, the martini going over, twelve dumb grey
// texts and her wink and a set of hearts, his clothes out of the window. The storm, umbrellas
// opening on the beat under the lightning. The marble bathroom: the pearls, my number in lipstick
// on the mirror. After the rain, the jump over the pool, brunch with its cloches lifting, the
// rumour flashing in the hedge, swans, the gold fountain, the cage of polished wood splintered all
// round you. At the end, the glass house at dusk with every room lit and the number on its glass.
// (The pieces are in ywn-place.js, ywn-sets.js, ywn-sets2.js and ywn-house.js; names start ywn.)

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { extend, glowAt, poolAt, local, PARTS } from './scenery.js';
import { prepare, floorAt, groundAt, Terrain } from './trail.js';
import { Room } from './summer.js';
import { AA_GLSL } from './aa.js';
import { SELF, clamp, smooth } from './ywn-lib.js';
import { WaterStrip } from './ywn-place.js';
import './ywn-sets.js';
import './ywn-sets2.js';
import { GlassHouseFinale } from './ywn-house.js';

export { GlassHouseFinale };

// the lyric boards were stone plaques before; the name still answers, as a text bubble
extend({ parts: { ymSign: (S, it, p, q, yaw) => PARTS.ywnBubble(S, it, p, q, yaw) } });

// parts whose heights aren't on the lawn (they find their own)
const OWN_HEIGHT = new Set(['ywnBubble', 'ymSign', 'ywnPrint', 'ywnRope']);
// the song's own palette keys, and what they are when a look doesn't say
const KDEF = { ywnSelf: 0.25, ywnWind: 0.2, ywnLamps: 0.3, ywnDry: 0.25 };

// ---------- the marble bathroom ----------
const ringBath = (W = 32, H = 36) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const BATH = { rings: { bath: ringBath }, ringOf: () => 'bath', styles: { marble: 0 }, dims: { marble: [32, 36] }, lights: () => [18, 9] };
function bathMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFogDensity; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float edge(vec2 f, float w){ return smoothstep(0.0, w, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))); }
      // veins: thin dark lines wandering through it, faded out where they'd be finer than a pixel
      float vein(vec2 q){ float n = n2(q * 0.08) * 0.6 + n2(q * 0.2) * 0.3 + n2(q * 0.6) * 0.1; float v = abs(sin(q.x * 0.05 + q.y * 0.03 + n * 7.0)); float w = fwidth(v) + 0.004; return smoothstep(0.03 + w, 0.0, v) * clamp(0.03 / w, 0.0, 1.0); }
      ${AA_GLSL}
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float wa = part == 6 ? x : along;
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) { col = vec3(0.92, 0.9, 0.86) * 0.7; }
        else if (part == 8) { col = vec3(0.88, 0.72, 0.36); glow += vec3(0.3, 0.22, 0.08); }
        else if (part == 0) {
          // the floor: big squares of white and black marble, a gold line between them
          vec2 q = vec2(x, along); vec2 t = q / 8.0;
          float dark = aaChk(t + 0.5);
          col = mix(vec3(0.95, 0.94, 0.92), vec3(0.1, 0.1, 0.11), dark);
          col = mix(col, dark > 0.5 ? vec3(0.32, 0.32, 0.34) : vec3(0.6, 0.6, 0.62), vein(q * 3.0) * 0.6);
          float ln = 1.0 - edge(fract(t), 0.012); float fl = fwidth(t.x) * 40.0;
          col = mix(col, vec3(0.86, 0.68, 0.32), ln * clamp(1.0 - fl, 0.0, 1.0) * 0.8);
          // the lamps' light lying on the polish
          col += vec3(0.25, 0.22, 0.18) * pow(max(0.0, sin(along * 0.105 + 0.4)), 8.0) * smoothstep(20.0, 4.0, abs(x));
        }
        else if (part == 3) {
          // the ceiling: coffers edged in gold, a rose in each
          col = vec3(0.96, 0.95, 0.93); vec2 q = fract(vec2(x, along) / 12.0);
          col *= 0.84 + 0.16 * edge(q, 0.1);
          col = mix(col, vec3(0.88, 0.72, 0.36), 1.0 - edge(q, 0.035));
          col = mix(col, vec3(0.9, 0.76, 0.42), smoothstep(0.13, 0.1, length(q - 0.5)) * 0.8);
        }
        else {
          vec2 q = vec2(wa, h); col = vec3(0.96, 0.95, 0.93); col = mix(col, vec3(0.5, 0.5, 0.54), vein(q * 2.0) * 0.75);
          float notCap = part == 6 ? 0.0 : 1.0;
          // tall arched mirrors in gold frames down the walls, a sconce either side of each
          float per = 30.0; vec2 mv = vec2(mod(wa, per), h);
          float ax = abs(mv.x - 15.0), top = 28.0 + sqrt(max(0.0, 81.0 - ax * ax)) * 0.6;
          float mir = notCap * step(ax, 9.0) * step(10.0, mv.y) * step(mv.y, top);
          float frm = notCap * step(ax, 9.9) * step(9.2, mv.y) * step(mv.y, top + 0.9) * (1.0 - mir);
          vec3 mc = mix(vec3(0.5, 0.56, 0.6), vec3(0.92, 0.94, 0.96), smoothstep(10.0, 34.0, mv.y + sin(wa * 0.1) * 3.0));
          mc += vec3(0.18) * pow(max(sin((wa + h) * 0.21), 0.0), 10.0);
          col = mix(col, mc, mir); glow += mc * mir * 0.08; col = mix(col, vec3(0.88, 0.72, 0.36), frm); glow += vec3(0.22, 0.16, 0.06) * frm;
          float sc = notCap * (smoothstep(1.3, 0.0, length(mv - vec2(3.0, 24.0))) + smoothstep(1.3, 0.0, length(mv - vec2(27.0, 24.0))));
          glow += vec3(1.0, 0.85, 0.6) * sc * 1.0;
          // a gold dado rail and a black marble skirting
          col = mix(col, vec3(0.88, 0.72, 0.36), step(abs(h - 8.0), 0.3) * notCap);
          col = mix(col, vec3(0.08, 0.08, 0.09), step(h, 2.0) * notCap);
        }
        col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the place, per frame ----------
export class EstateWorld {
  constructor(scene, S) {
    this.S = S;
    const c = S.course, plan = S.plan || {};
    prepare(c, plan);
    this.gy = (t, x) => groundAt(c, t, x);
    // the lawns: the ground comes up under her, mown in stripes, a little parched in the heat
    this.terrain = new Terrain(scene, c, S.P, plan);
    const tu = this.terrain.mat.uniforms; tu.uPath.value = 0; tu.uLawn.value = 1; tu.uDry.value = 0.25; tu.uWood.value = 0;
    if (S.town) {
      S.town.floorFn = this.gy;
      for (const r of S.town.roadMeshes) r.floorFn = this.gy;
      for (const it of S.town.items) if (!it.abs && !OWN_HEIGHT.has(it.parts)) it.h = (it.h || 0) + this.gy(it.t, it.x);
      // the texts know when their line is sung
      const ly = plan.lyrics || [], idx = S.town.atlas.index;
      for (const it of S.town.items) if (it.parts === 'ywnBubble' || it.parts === 'ymSign') { const i = ly.findIndex((l, j) => idx['LYR' + j] === it.idx); if (i >= 0) it.sung = ly[i].t; }
    }
    // the marble bathroom
    this.mat = bathMaterial();
    this.rooms = (plan.rooms || []).map((sp) => new Room(scene, c, sp, this.mat, BATH));
    this.spans = this.rooms.map((r) => [r.span.from, r.span.to]);
    // the canals, and the pool under the jump
    this.water = (plan.ywnWater || []).map((w) => new WaterStrip(scene, c, w));
    // the pearls on the rail through the bathroom
    this.pearlRail = (c.rails || []).find((r) => this.spans.some(([a, b]) => r.t0 > a && r.t0 < b)) || null;
    // her car at the valet curb
    const car = plan.car;
    if (car) {
      this.carGroup = new THREE.Group(); scene.add(this.carGroup);
      new GLTFLoader().loadAsync('assets/props/coupe.glb').then((g) => {
        const obj = g.scene;
        obj.traverse((o) => {
          if (!o.isMesh) return; o.frustumCulled = false;
          const n = (o.material && o.material.name) || '';
          if (n === 'Glass') o.material = new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.8 });
          else o.material = o.material.clone();
          const m = o.material;
          if (n === 'Paint 1 Carmine') { m.color = new THREE.Color(car.paint ?? 0xf2f0ea); m.metalness = 0.6; m.roughness = 0.2; m.emissive = new THREE.Color(car.paint ?? 0xf2f0ea); m.emissiveIntensity = 0.25; }
          if (n === 'Headlight') { m.emissive = new THREE.Color(0xfff2d8); m.emissiveIntensity = 1.2; }
        });
        const bb = new THREE.Box3().setFromObject(obj), sz = new THREE.Vector3(); bb.getSize(sz);
        const k = (car.len ?? 26) / Math.max(sz.x, sz.z); obj.scale.setScalar(k); obj.position.y = -bb.min.y * k;
        this.carGroup.add(obj); this.car = obj; this._warm = 4;
      }).catch(() => {});
    }
    this._g = new THREE.Vector3(); this._a = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }

  // the song's own light keys (the looks only blend the shared ones): blended here the same way
  blend(S, t) {
    const K = S.look && S.look.keys, out = this.k || (this.k = { ...KDEF });
    if (!K) return out;
    let i = 0; while (i + 1 < K.length && t >= K[i + 1].t) i++;
    const a = K[i].P, nx = K[i + 1]; let f = 0, b = a;
    if (nx && t > nx.t - nx.fade) { f = (t - (nx.t - nx.fade)) / nx.fade; b = nx.P; }
    f = f * f * (3 - 2 * f);
    for (const k in KDEF) { const va = a[k] ?? KDEF[k], vb = b[k] ?? va; out[k] = va + (vb - va) * f; }
    return out;
  }

  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t;
    // the light in the props, the wind in the trees, the lamps: from the look of the moment
    const k = this.blend(S, t);
    SELF.value = k.ywnSelf;
    if (S.town) { S.town.ywnWind = k.ywnWind; S.town.ywnK = { lamps: k.ywnLamps, self: k.ywnSelf, wind: k.ywnWind }; }
    for (const w of this.water) w.lampK = k.ywnLamps;
    const T = this.terrain;
    T.update(S.track, S.rider, P, camera, 0);
    T.mat.uniforms.uWood.value = 0; T.mat.uniforms.uDry.value = k.ywnDry;
    // under the bathroom the lawn goes down out of the way of its floor
    const t0 = t - 4, t1 = t + 46;
    let sunk = false;
    for (let i = 0; i < T.N; i++) {
      const tt = t0 + (t1 - t0) * (i / (T.N - 1));
      if (!this.spans.some(([a, b]) => tt > a + 0.25 && tt < b - 0.25)) continue;
      for (let j = 0; j < T.M; j++) T.pos[(i * T.M + j) * 3 + 1] -= 9;
      sunk = true;
    }
    if (sunk) T.geo.attributes.position.needsUpdate = true;
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    for (const w of this.water) w.update(S.track, S.rider, P, camera, time);
    if (this.carGroup) {
      const c = S.plan.car, show = t > c.t - 46 && t < c.t + 3, warm = (this._warm ?? 0) > 0; if (warm) this._warm--;
      this.carGroup.visible = show || warm;
      if (show || warm) { S.track.ground(c.t, c.x, this._g); this.carGroup.position.set(this._g.x, this.gy(c.t, c.x) + (c.y ?? 0.05), this._g.z); this.carGroup.rotation.set(0, S.course.sample(c.t).yaw + (c.rot ?? 0.5), 0); }
    }
  }

  draw(T) {
    const g = this._g, S = this.S, c = S.course;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(c, f.t); S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 3, g.z, 7, [1, 0.9, 0.75], 0.65); T.glow(g.x, fy + r.H - 3, g.z, 16, [1, 0.85, 0.6], 0.1); T.pool(g.x, fy + 0.08, g.z, 26, [1, 0.9, 0.8], 0.18); }
    }
    // the pearls strung along the rail; at its end the clasp goes and they're everywhere
    const pr = this.pearlRail, rt = T.tNow ?? 0;
    if (pr && rt > pr.t0 - 8 && rt < pr.t1 + 3) {
      const L = T.layers.ywnPearl, m = this._m, a = this._a;
      const from = Math.max(pr.t0, rt - 1), to = Math.min(pr.t1, rt + 6);
      for (let tt = from, k = 0; tt <= to; tt += 0.028, k++) {
        const idx = Math.round((tt - pr.t0) / 0.028);
        S.track.at(pr.t0 + idx * 0.028, pr.x, pr.h, a);
        const f = rt - pr.t1;
        if (f > 0 && pr.t0 + idx * 0.028 > pr.t1 - 1.4) {
          // loose: out and down, bouncing on the marble
          const h1 = Math.sin(idx * 12.9898) * 43758.5453, r1 = h1 - Math.floor(h1), h2 = Math.sin(idx * 78.233) * 12345.678, r2 = h2 - Math.floor(h2);
          const fy = floorAt(c, pr.t1);
          a.x += (r1 - 0.5) * 24 * f; a.z += (r2 - 0.5) * 24 * f;
          let y = a.y + (4 + 6 * r2) * f - 11 * f * f; if (y < fy + 0.45) y = fy + 0.45 + Math.abs(Math.sin(f * 6 + r1 * 6)) * 2 * Math.exp(-f * 2);
          a.y = y;
        }
        m.compose(a, this._q, this._s.set(0.42, 0.42, 0.42)); L.add(m);
      }
    }
  }
}
