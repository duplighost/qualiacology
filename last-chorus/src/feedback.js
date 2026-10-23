// What tells you how you're doing, in the world: the diamonds you steer through, and
// the shockwave round the board when you hit a pump.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// a rubber duck: yellow body and head, orange beak, two black eyes, facing +z
export function duckGeometry() {
  const parts = [];
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  const Y = [1, 0.78, 0.12], O = [1, 0.42, 0.06], K = [0.03, 0.03, 0.04];
  const body = new THREE.SphereGeometry(0.5, 18, 12); body.scale(1.05, 0.72, 1.3); body.translate(0, 0, -0.05); parts.push(paint(body, Y));
  const tail = new THREE.ConeGeometry(0.2, 0.42, 10); tail.rotateX(-0.9); tail.translate(0, 0.22, -0.68); parts.push(paint(tail, Y));
  const head = new THREE.SphereGeometry(0.31, 16, 12); head.translate(0, 0.52, 0.36); parts.push(paint(head, Y));
  const beak = new THREE.SphereGeometry(0.16, 10, 6); beak.scale(1.15, 0.42, 1.25); beak.translate(0, 0.45, 0.68); parts.push(paint(beak, O));
  for (const x of [-0.14, 0.14]) { const e = new THREE.SphereGeometry(0.045, 8, 6); e.translate(x, 0.62, 0.62); parts.push(paint(e, K)); }
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  g.translate(0, -0.1, 0);
  return g;
}

// diamonds to steer through, each one a note of a melody. Collected ones fly into the
// board; missed ones go grey and drop away, so you always know which it was.
export class Notes {
  constructor(scene, course, P, kind) {
    this.course = course;
    this.duck = kind === 'duck';
    let g;
    if (this.duck) {
      // A Million Ducks: what you pick up are the ducks from the claw machine
      g = duckGeometry();
      this.color = new THREE.Color(P.gem ?? 0xffd23a);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.32, metalness: 0.0, emissive: new THREE.Color(0x3a2a00), emissiveIntensity: 1 });
    } else {
      g = new THREE.OctahedronGeometry(0.5, 0);
      g.scale(0.8, 1.25, 0.8);
      this.color = new THREE.Color(P.gem ?? P.glow).lerp(new THREE.Color(P.fret), 0.3);
      this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    }
    this.mesh = new THREE.InstancedMesh(g, this.mat, 256);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    // a soft halo per diamond, and a ring of light on the ribbon under it so you can read where it is across
    this.haloMat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 aCol; varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = aCol; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }`,
      fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vC * (exp(-d * d * 5.0) * 0.8 + exp(-d * d * 40.0) * 0.6), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    const hg = new THREE.PlaneGeometry(1, 1);
    this.haloCol = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3); this.haloCol.setUsage(THREE.DynamicDrawUsage);
    hg.setAttribute('aCol', this.haloCol);
    this.halo = new THREE.InstancedMesh(hg, this.haloMat, 256);
    this.halo.frustumCulled = false; this.halo.count = 0; scene.add(this.halo);
    this.spotMat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 aCol; varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = aCol; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float ring = exp(-pow((d - 0.78) / 0.09, 2.0)); gl_FragColor = vec4(vC * (ring * 0.9 + exp(-d * d * 3.0) * 0.35) * (1.0 - smoothstep(0.92, 1.0, d)), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: -3,
    });
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
    this.spotCol = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3); this.spotCol.setUsage(THREE.DynamicDrawUsage);
    sg.setAttribute('aCol', this.spotCol);
    this.spot = new THREE.InstancedMesh(sg, this.spotMat, 256);
    this.spot.frustumCulled = false; this.spot.count = 0; scene.add(this.spot);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
    this._b = new THREE.Vector3(); this._g = new THREE.Vector3(); this._c = new THREE.Color(); this._w = new THREE.Color(1, 1, 1);
    this.lo = 0;
  }

  update(track, rider, time, board, cam) {
    const notes = this.course.notes, t = rider.t;
    while (this.lo < notes.length && notes[this.lo].t < t - 1.5) this.lo++;
    let k = 0;
    const m = this._m, p = this._p, q = this._q, s = this._s, col = this._c;
    if (board) board.getWorldPosition(this._b);
    for (let i = this.lo; i < notes.length && k < 256; i++) {
      const n = notes[i];
      if (n.t > t + 9) break;
      let scale = n.bar ? 1.2 : 0.95, bright = 2.4;
      col.copy(this.color);
      const ahead = n.t - t;
      track.at(n.t, n.x, 1.2 + 0.12 * Math.sin(time * 4 + i), p);
      if (n.got) {
        if (n.gotT === undefined) n.gotT = t;
        // flies into the board and is gone
        const age = t - n.gotT;
        if (age > 0.16) continue;
        const f = age / 0.16;
        p.lerp(this._b, f * f);
        scale *= 1.3 - f;
        bright = 4;
        col.lerp(this._w, 0.5);
      } else if (ahead < -0.02) {
        // missed: goes grey and drops away
        const age = -ahead;
        if (age > 0.5) continue;
        col.setRGB(0.28, 0.27, 0.32);
        bright = 1.2 * (1 - age * 2);
        p.y -= age * age * 14;
        scale *= 1 - age * 1.2;
      } else {
        // the next few burn a little brighter
        bright *= 1 + 0.35 * Math.exp(-Math.max(0, ahead) * 1.5);
      }
      // right in front of the lens they'd fill the screen: fade the ones about to pass under the camera
      if (cam && !n.got) {
        const d = p.distanceTo(cam.position);
        const k = clamp((d - 2.5) / 6, 0, 1);
        bright *= 0.25 + 0.75 * k; scale *= this.duck ? k * (2 - k) : 0.55 + 0.45 * k;   // a duck is big: gone before the lens
      }
      if (this.duck) {
        // ducks face you coming, bobbing as if on water; bigger than a diamond, lit not glowing
        const yaw = this.course.sample(n.t).yaw + Math.PI;
        this._e.set(Math.sin(time * 3.1 + i) * 0.12, yaw + Math.sin(time * 1.7 + i * 2.3) * 0.35, Math.sin(time * 2.3 + i) * 0.15); q.setFromEuler(this._e);
        s.setScalar(scale * 1.25);
        m.compose(p, q, s);
        this.mesh.setMatrixAt(k, m);
        const db = n.got ? 2.2 : (ahead < -0.02 ? 0.45 : 1.15);
        const dc = ahead < -0.02 && !n.got ? 0.45 : 1;
        this.mesh.instanceColor.setXYZ(k, db * (dc + (1 - dc) * 0.6), db * (dc + (1 - dc) * 0.6), db * (dc + (1 - dc) * 0.7));
      } else {
      this._e.set(0, time * 2.5 + i, 0); q.setFromEuler(this._e);
      s.setScalar(scale);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(k, m);
      this.mesh.instanceColor.setXYZ(k, col.r * bright, col.g * bright, col.b * bright);
      }
      s.setScalar(scale * 3.4);
      m.compose(p, q.identity(), s);
      this.halo.setMatrixAt(k, m);
      const hb = (n.got ? 1.2 : (ahead < -0.02 ? 0.15 : 0.7)) * Math.min(1, bright / 2.4);
      this.haloCol.setXYZ(k, col.r * hb, col.g * hb, col.b * hb);
      // the ring of light on the ribbon under it, only while it's still to come
      const gp = track.at(n.t, n.x, 0.05, this._g);
      const sb = !n.got && ahead > -0.02 ? 0.55 * (1 - clamp((ahead - 4) / 3, 0, 1)) : 0;
      m.compose(gp, this._q.identity(), s.set(1.9, 1, 1.9));
      this.spot.setMatrixAt(k, m);
      this.spotCol.setXYZ(k, col.r * sb, col.g * sb, col.b * sb);
      k++;
    }
    this.mesh.count = k; this.halo.count = k; this.spot.count = k;
    this.mesh.instanceMatrix.needsUpdate = true; this.halo.instanceMatrix.needsUpdate = true; this.spot.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true; this.haloCol.needsUpdate = true; this.spotCol.needsUpdate = true;
  }
}

// shockwaves round the board when you hit a pump: they travel with you, opening out to the rails
export class Rings {
  constructor(scene, n = 10) {
    this.items = [];
    const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color() }, uA: { value: 0 }, uW: { value: 0.08 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uCol; uniform float uA, uW; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float ring = exp(-pow((d - 0.9) / uW, 2.0)); float fill = smoothstep(0.35, 0.9, d) * 0.06; float rear = 0.35 + 0.65 * smoothstep(0.12, 0.55, vUv.y); gl_FragColor = vec4(uCol * (ring * 1.9 + fill) * uA * rear * (1.0 - smoothstep(0.97, 1.0, d)), 1.0); }`,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
      });
      const mesh = new THREE.Mesh(g, mat); mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 5;
      scene.add(mesh);
      this.items.push({ mesh, mat, age: 1, life: 0.4, size: 6 });
    }
    this.next = 0;
    this._p = new THREE.Vector3(); this._f = new THREE.Vector3(); this._r = new THREE.Vector3(); this._u = new THREE.Vector3(); this._z = new THREE.Vector3(); this._m = new THREE.Matrix4();
  }
  fire(color, size = 6, life = 0.42, width = 0.08, delay = 0) {
    const it = this.items[this.next]; this.next = (this.next + 1) % this.items.length;
    it.age = -delay; it.life = life; it.size = size; it.mat.uniforms.uCol.value.set(color); it.mat.uniforms.uW.value = width;
  }
  update(track, rider, dt) {
    const t = rider.t;
    let placed = false;
    for (const it of this.items) {
      it.age += dt;
      const f = it.age / it.life;
      it.mesh.visible = f >= 0 && f < 1;
      if (!it.mesh.visible) continue;
      if (!placed) {
        // on the ribbon under the board, tilted with it
        track.at(t, rider.x, Math.max(0.08, rider.y - rider.course.sample(t).y + 0.08), this._p);
        const fwd = track.dirAt(t, this._f);
        const right = this._r.set(-fwd.z, 0, fwd.x).normalize().applyAxisAngle(fwd, track.bankAt(t));
        const up = this._u.crossVectors(right, fwd).normalize();
        if (up.y < 0) up.negate();
        const z = this._z.crossVectors(right, up).normalize();
        this._m.makeBasis(right, up, z);
        placed = true;
      }
      it.mesh.position.copy(this._p);
      it.mesh.quaternion.setFromRotationMatrix(this._m);
      const e = 1 - Math.pow(1 - f, 3);
      it.mesh.scale.setScalar(0.4 + it.size * e);
      it.mat.uniforms.uA.value = (1 - f) * (1 - f);
    }
  }
}
