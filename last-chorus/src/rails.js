// Rails you can ride: a pipe on short posts along the ribbon, lit from inside in the song's
// colour and brighter on every beat. Steer onto one and it takes you; it runs you to its end
// and pops you off (rider.js). Drawn fresh every frame along the road as it's laid out now.

import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const STEP = 1 / 30;          // song seconds between pipe segments
const POST = 0.5;             // ... and between posts

export class Rails {
  constructor(scene, course, P) {
    this.course = course;
    this.list = course.rails || [];
    this.on = this.list.length > 0;
    if (!this.on) return;
    const seg = new THREE.CylinderGeometry(0.13, 0.13, 1, 12, 1, true); seg.rotateX(Math.PI / 2); seg.translate(0, 0, 0.5);
    const post = new THREE.CylinderGeometry(0.05, 0.07, 1, 6); post.translate(0, -0.5, 0);
    const cap = new THREE.SphereGeometry(0.2, 12, 8);
    this.edge = new THREE.Color(P.rail ?? P.edge);
    this.pipeMat = new THREE.MeshStandardMaterial({ color: 0xe8e6f0, roughness: 0.28, metalness: 0.55, emissive: this.edge.clone(), emissiveIntensity: 0.6 });
    this.pipeMat.onBeforeCompile = (sh) => {
      sh.uniforms.uBeat = { value: 0 }; sh.uniforms.uRim = { value: this.edge };
      this.pipeMat.userData.shader = sh;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uBeat; uniform vec3 uRim;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.0);
          totalEmissiveRadiance = uRim * (0.35 + 1.4 * rimF) * (0.75 + 0.9 * uBeat);`);
    };
    this.postMat = new THREE.MeshStandardMaterial({ color: 0x24222c, roughness: 0.6, metalness: 0.3 });
    this.segs = new THREE.InstancedMesh(seg, this.pipeMat, 900);
    // the light it throws on the ribbon under it: a soft strip
    const strip = new THREE.PlaneGeometry(1, 1); strip.rotateX(-Math.PI / 2); strip.translate(0, 0, 0.5);
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: this.edge.clone() }, uK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uCol; uniform float uK; varying vec2 vUv; void main(){ float d = abs(vUv.x - 0.5) * 2.0; gl_FragColor = vec4(uCol * exp(-d * d * 6.0) * 0.55 * uK, 1.0); }',
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -2,
    });
    this.glow = new THREE.InstancedMesh(strip, this.glowMat, 900);
    this.posts = new THREE.InstancedMesh(post, this.postMat, 200);
    this.caps = new THREE.InstancedMesh(cap, this.pipeMat, 16);
    for (const m of [this.segs, this.posts, this.caps, this.glow]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._z = new THREE.Vector3(0, 0, 1); this._d = new THREE.Vector3(); this._g = new THREE.Vector3();
  }

  update(track, rider, beat) {
    if (!this.on) return;
    const t = rider.t;
    let ns = 0, np = 0, nc = 0;
    const m = this._m, q = this._q, s = this._s, a = this._a, b = this._b, d = this._d;
    for (const r of this.list) {
      const from = Math.max(r.t0, t - 1.2), to = Math.min(r.t1, t + 11);
      if (to <= from) continue;
      // the pipe: short straight pieces from point to point
      track.at(from, r.x, r.h, a);
      for (let tt = from + STEP; ns < 900; tt += STEP) {
        const te = Math.min(tt, to);
        track.at(te, r.x, r.h, b);
        d.copy(b).sub(a); const len = d.length();
        if (len > 1e-4) {
          q.setFromUnitVectors(this._z, d.multiplyScalar(1 / len)); m.compose(a, q, s.set(1, 1, len)); this.segs.setMatrixAt(ns, m);
          // the strip on the ribbon right under it, a little wider than the pipe
          this._g.copy(a); this._g.y -= r.h - 0.04; m.compose(this._g, q, s.set(1.6, 1, len)); this.glow.setMatrixAt(ns, m); ns++;
        }
        a.copy(b);
        if (te >= to) break;
      }
      // posts down to the ribbon, every half second of song
      const p0 = Math.ceil(from / POST) * POST;
      for (let tt = p0; tt <= to && np < 200; tt += POST) {
        track.at(tt, r.x, r.h, a);
        m.compose(a, q.identity(), s.set(1, r.h + 0.05, 1)); this.posts.setMatrixAt(np++, m);
      }
      // round ends
      for (const te of [r.t0, r.t1]) if (te >= from - 0.01 && te <= to + 0.01 && nc < 16) { track.at(te, r.x, r.h, a); m.compose(a, q.identity(), s.set(1, 1, 1)); this.caps.setMatrixAt(nc++, m); }
    }
    this.segs.count = ns; this.glow.count = ns; this.posts.count = np; this.caps.count = nc;
    this.segs.instanceMatrix.needsUpdate = true; this.glow.instanceMatrix.needsUpdate = true; this.posts.instanceMatrix.needsUpdate = true; this.caps.instanceMatrix.needsUpdate = true;
    this.glowMat.uniforms.uK.value = 0.7 + 0.8 * clamp(beat, 0, 1) + (rider.rail ? 0.6 : 0);
    const sh = this.pipeMat.userData.shader;
    if (sh) sh.uniforms.uBeat.value = clamp(beat, 0, 1) * (rider.rail ? 1.4 : 1);
  }
}
