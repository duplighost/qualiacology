// Small lights: the notes you collect, sparks, the streaks of air that rush past.

import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Notes {
  constructor(scene, course, P) {
    this.course = course;
    const g = new THREE.OctahedronGeometry(0.42, 0);
    g.scale(0.8, 1.25, 0.8);
    this.mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.glow).lerp(new THREE.Color(P.fret), 0.35).multiplyScalar(2.4) });
    this.mesh = new THREE.InstancedMesh(g, this.mat, 256);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    // soft halo sprite per note
    this.haloMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.glow) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0); float s = length(instanceMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }`,
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv; void main(){ float d = length(vUv-0.5)*2.0; gl_FragColor = vec4(uColor * exp(-d*d*6.0) * 0.9, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.haloMat, 256);
    this.halo.frustumCulled = false; this.halo.count = 0; scene.add(this.halo);
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
    this.lo = 0;
  }

  update(track, rider, time) {
    const notes = this.course.notes, t = rider.t;
    while (this.lo < notes.length && notes[this.lo].t < t - 1.5) this.lo++;
    let k = 0;
    const m = this._m, p = this._p, q = this._q, s = this._s;
    for (let i = this.lo; i < notes.length && k < 256; i++) {
      const n = notes[i];
      if (n.t > t + 9) break;
      let scale = n.bar ? 1.25 : 0.9;
      if (n.got) {
        if (n.gotT === undefined) n.gotT = t;
        const age = t - n.gotT;
        if (age > 0.35) continue;
        scale *= 1 + age * 6;
      } else if (n.t < t - 0.1) continue;
      track.at(n.t, n.x, 1.15 + 0.12 * Math.sin(time * 4 + i), p);
      this._e.set(0, time * 2.5 + i, 0); q.setFromEuler(this._e);
      s.setScalar(scale);
      m.compose(p, q, s);
      this.mesh.setMatrixAt(k, m);
      s.setScalar(scale * 3.2);
      m.compose(p, q.identity(), s);
      this.halo.setMatrixAt(k, m);
      k++;
    }
    this.mesh.count = k; this.halo.count = k;
    this.mesh.instanceMatrix.needsUpdate = true; this.halo.instanceMatrix.needsUpdate = true;
  }
}

// a pool of glowing points: sparks, bursts, the trail off the board
export class Sparks {
  constructor(scene, max = 1500) {
    this.max = max;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max); this.size = new Float32Array(max);
    this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.alpha = new Float32Array(max);
    g.setAttribute('aA', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute float aA; attribute float aS; varying vec3 vC; varying float vA; uniform float uScale;
        void main(){ vC = color; vA = aA; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aS * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d)*4.0; float a = exp(-r*3.0); gl_FragColor = vec4(vC * a * vA, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.next = 0;
  }

  emit(p, v, color, n = 10, opts = {}) {
    const spread = opts.spread ?? 4, life = opts.life ?? 0.7, size = opts.size ?? 0.25;
    for (let i = 0; i < n; i++) {
      const k = this.next; this.next = (this.next + 1) % this.max;
      this.pos[k * 3] = p.x + (Math.random() - 0.5) * (opts.jitter ?? 0.3);
      this.pos[k * 3 + 1] = p.y + (Math.random() - 0.5) * (opts.jitter ?? 0.3);
      this.pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * (opts.jitter ?? 0.3);
      const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1);
      const sp = spread * (0.3 + Math.random() * 0.7);
      this.vel[k * 3] = v.x + Math.sin(b) * Math.cos(a) * sp;
      this.vel[k * 3 + 1] = v.y + Math.abs(Math.cos(b)) * sp * (opts.up ?? 1);
      this.vel[k * 3 + 2] = v.z + Math.sin(b) * Math.sin(a) * sp;
      this.col[k * 3] = color.r; this.col[k * 3 + 1] = color.g; this.col[k * 3 + 2] = color.b;
      this.life[k] = life * (0.6 + Math.random() * 0.6); this.age[k] = 0;
      this.size[k] = size * (0.6 + Math.random() * 0.8);
      this.drag[k] = opts.drag ?? 1.5; this.grav[k] = opts.grav ?? 6;
    }
  }

  update(dt) {
    for (let k = 0; k < this.max; k++) {
      if (this.age[k] >= this.life[k]) { this.alpha[k] = 0; continue; }
      this.age[k] += dt;
      const dr = Math.exp(-this.drag[k] * dt);
      this.vel[k * 3] *= dr; this.vel[k * 3 + 1] = this.vel[k * 3 + 1] * dr - this.grav[k] * dt; this.vel[k * 3 + 2] *= dr;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      const f = this.age[k] / this.life[k];
      this.alpha[k] = (1 - f) * (1 - f) * Math.min(1, this.age[k] * 30);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.color.needsUpdate = true; a.aA.needsUpdate = true; a.aS.needsUpdate = true;
  }
}

// streaks of air: short lines in the world that the board rushes through
export class Streaks {
  constructor(scene, P, n = 260) {
    this.n = n;
    this.p = new Float32Array(n * 3);
    this.seed = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    this.lp = new Float32Array(n * 2 * 3); this.la = new Float32Array(n * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.lp, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.la, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.edge) } },
      vertexShader: `attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor * vA, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.geo = g; this.init = false;
    this._v = new THREE.Vector3();
  }

  update(cam, vel, speed, intensity) {
    // vel: rider world velocity (m/s)
    const n = this.n, p = this.p;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const sp = Math.max(1, Math.hypot(vel.x, vel.y, vel.z));
    const fx = vel.x / sp, fy = vel.y / sp, fz = vel.z / sp;
    const respawn = (i, ahead) => {
      const d = ahead ? 30 + Math.random() * 90 : Math.random() * 110;
      const r = 4 + Math.random() * 26, a = Math.random() * 6.283;
      // perpendicular basis
      const ux = -fz, uz = fx;
      p[i * 3] = cx + fx * d + ux * Math.cos(a) * r;
      p[i * 3 + 1] = cy + fy * d + Math.sin(a) * r * 0.6 - 1;
      p[i * 3 + 2] = cz + fz * d + uz * Math.cos(a) * r;
      this.seed[i] = Math.random();
    };
    if (!this.init) { for (let i = 0; i < n; i++) respawn(i, false); this.init = true; }
    const len = clamp(speed * 0.045, 0.2, 4.5);
    for (let i = 0; i < n; i++) {
      const dx = p[i * 3] - cx, dy = p[i * 3 + 1] - cy, dz = p[i * 3 + 2] - cz;
      const along = dx * fx + dy * fy + dz * fz;
      if (along < -2 || along > 140) respawn(i, true);
      const o = i * 6;
      this.lp[o] = p[i * 3]; this.lp[o + 1] = p[i * 3 + 1]; this.lp[o + 2] = p[i * 3 + 2];
      this.lp[o + 3] = p[i * 3] - fx * len; this.lp[o + 4] = p[i * 3 + 1] - fy * len; this.lp[o + 5] = p[i * 3 + 2] - fz * len;
      const near = clamp(1 - along / 120, 0, 1);
      const a = intensity * near * (0.25 + 0.75 * this.seed[i]);
      this.la[i * 2] = a; this.la[i * 2 + 1] = 0;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aA.needsUpdate = true;
  }
}

// fireworks: shells that climb, burst into a sphere of sparks, fall and fade
export class Fireworks {
  constructor(scene, colors, max = 5000) {
    this.max = max; this.colors = colors.map((c) => new THREE.Color(c));
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.c = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.age = new Float32Array(max).fill(99); this.a = new Float32Array(max); this.sz = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aS', new THREE.BufferAttribute(this.sz, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 700 } },
      vertexShader: `attribute float aA; attribute float aS; varying vec3 vC; varying float vA; uniform float uScale;
        void main(){ vC = color; vA = aA; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = max(1.5, aS * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d)*4.0; gl_FragColor = vec4(vC * exp(-r * 3.5) * vA, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.shells = []; this.next = 0;
  }
  // launch a shell from ground point `from` to burst at `at` after `t` seconds
  launch(from, at, size = 1, color = null) {
    this.shells.push({ p: from.clone(), v: at.clone().sub(from).multiplyScalar(1 / 1.1).add(new THREE.Vector3(0, 0.5 * 18 * 1.1, 0)), t: 1.1, size, color: color || this.colors[Math.floor(Math.random() * this.colors.length)] });
  }
  _spark(p, v, c, life, size) {
    const k = this.next; this.next = (this.next + 1) % this.max;
    this.p.set([p.x, p.y, p.z], k * 3); this.v.set([v.x, v.y, v.z], k * 3); this.c.set([c.r, c.g, c.b], k * 3);
    this.life[k] = life; this.age[k] = 0; this.sz[k] = size;
  }
  update(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.t -= dt; s.v.y -= 18 * dt; s.p.addScaledVector(s.v, dt);
      // a fizzing trail on the way up
      this._spark(s.p, new THREE.Vector3((Math.random() - 0.5) * 2, -3, (Math.random() - 0.5) * 2), new THREE.Color(1, 0.8, 0.5), 0.5, 0.5);
      if (s.t <= 0) {
        const n = Math.round(110 * s.size);
        const c2 = this.colors[Math.floor(Math.random() * this.colors.length)];
        for (let k = 0; k < n; k++) {
          const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1);
          const sp = (16 + Math.random() * 6) * s.size;
          const dir = new THREE.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a));
          this._spark(s.p, dir.multiplyScalar(sp), k % 5 === 0 ? c2 : s.color, 1.6 + Math.random() * 0.8, 1.6 * s.size);
        }
        this.shells.splice(i, 1);
      }
    }
    for (let k = 0; k < this.max; k++) {
      if (this.age[k] >= this.life[k]) { this.a[k] = 0; continue; }
      this.age[k] += dt;
      const dr = Math.exp(-1.4 * dt);
      this.v[k * 3] *= dr; this.v[k * 3 + 1] = this.v[k * 3 + 1] * dr - 7 * dt; this.v[k * 3 + 2] *= dr;
      this.p[k * 3] += this.v[k * 3] * dt; this.p[k * 3 + 1] += this.v[k * 3 + 1] * dt; this.p[k * 3 + 2] += this.v[k * 3 + 2] * dt;
      const f = this.age[k] / this.life[k];
      this.a[k] = (1 - f) * (1 - f) * (0.7 + 0.3 * Math.sin(this.age[k] * 40 + k)) * 2.2;
    }
    const at = this.geo.attributes;
    at.position.needsUpdate = true; at.color.needsUpdate = true; at.aA.needsUpdate = true; at.aS.needsUpdate = true;
  }
}

// the light the board leaves behind: a ribbon from the tail, brighter in flow
export class Trail {
  constructor(scene, P, n = 90) {
    this.n = n;
    this.pts = [];   // {l: Vector3, r: Vector3, a}
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.al = new Float32Array(n * 2); this.uvx = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aX', new THREE.BufferAttribute(this.uvx, 1));
    for (let i = 0; i < n; i++) { this.uvx[i * 2] = -1; this.uvx[i * 2 + 1] = 1; }
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: new THREE.Color(P.jacket) }, uB: { value: new THREE.Color(P.edge) } },
      vertexShader: `attribute float aA; attribute float aX; varying float vA; varying float vX; void main(){ vA = aA; vX = aX; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uA, uB; varying float vA; varying float vX; void main(){ float core = exp(-vX * vX * 5.0); vec3 c = mix(uB, uA, vA) * (0.4 + 1.8 * core); gl_FragColor = vec4(c * vA * (0.5 + 0.5 * core), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this._r = new THREE.Vector3();
  }

  // board: the board Object3D; strength 0..1
  push(board, strength) {
    board.updateWorldMatrix(true, false);
    const e = board.matrixWorld.elements;
    // tail of the board in world space, and its lateral axis
    const c = new THREE.Vector3(0, 0.12, -0.75).applyMatrix4(board.matrixWorld);
    this._r.set(e[0], e[1], e[2]).normalize().multiplyScalar(0.2);
    this.pts.unshift({ l: c.clone().sub(this._r), r: c.clone().add(this._r), a: strength });
    if (this.pts.length > this.n) this.pts.pop();
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const p = this.pts[Math.min(i, this.pts.length - 1)];
      const o = i * 6;
      this.pos[o] = p.l.x; this.pos[o + 1] = p.l.y; this.pos[o + 2] = p.l.z;
      this.pos[o + 3] = p.r.x; this.pos[o + 4] = p.r.y; this.pos[o + 5] = p.r.z;
      const f = 1 - i / (n - 1);
      const a = i < this.pts.length ? p.a * f * f : 0;
      this.al[i * 2] = a; this.al[i * 2 + 1] = a;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aA.needsUpdate = true;
  }
}

// weather around the camera: snow that drifts, rain that streaks with your speed
export class Weather {
  constructor(scene, n = 1800) {
    this.n = n; this.snow = 0; this.rain = 0;
    this.p = new Float32Array(n * 3); this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.p[i * 3] = (Math.random() - 0.5) * 80; this.p[i * 3 + 1] = Math.random() * 40 - 10; this.p[i * 3 + 2] = (Math.random() - 0.5) * 80; this.seed[i] = Math.random(); }
    // snow: points
    const sg = new THREE.BufferGeometry();
    this.sp = new Float32Array(n * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(this.sp, 3).setUsage(THREE.DynamicDrawUsage));
    this.snowMat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      vertexShader: `uniform float uA; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(90.0 / -mv.z, 1.0, 9.0); vA = uA * smoothstep(60.0, 8.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.25, 0.0, dot(d, d)); gl_FragColor = vec4(vec3(0.9, 0.93, 1.0) * a * vA, 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.snowPts = new THREE.Points(sg, this.snowMat); this.snowPts.frustumCulled = false; scene.add(this.snowPts);
    this.sg = sg;
    // rain: short lines
    const rg = new THREE.BufferGeometry();
    this.rp = new Float32Array(n * 2 * 3);
    rg.setAttribute('position', new THREE.BufferAttribute(this.rp, 3).setUsage(THREE.DynamicDrawUsage));
    this.rainMat = new THREE.LineBasicMaterial({ color: 0x8fa0c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.rainLines = new THREE.LineSegments(rg, this.rainMat); this.rainLines.frustumCulled = false; scene.add(this.rainLines);
    this.rg = rg;
    this.snowPts.visible = false; this.rainLines.visible = false;
  }
  set(snow, rain) { this.snow = snow; this.rain = rain; }
  update(cam, vel, dt, time) {
    const n = this.n, p = this.p;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    const show = this.snow > 0.01 || this.rain > 0.01;
    this.snowPts.visible = this.snow > 0.01; this.rainLines.visible = this.rain > 0.01;
    if (!show) return;
    for (let i = 0; i < n; i++) {
      const s = this.seed[i];
      // fall in world space; wrap inside a box that travels with the camera
      p[i * 3 + 1] -= dt * (this.rain > this.snow ? 26 + s * 10 : 1.6 + s * 1.4);
      p[i * 3] += dt * Math.sin(time * 0.7 + s * 30) * 0.8 * this.snow;
      let x = p[i * 3] - cx, y = p[i * 3 + 1] - cy, z = p[i * 3 + 2] - cz;
      if (x < -40) p[i * 3] += 80; else if (x > 40) p[i * 3] -= 80;
      if (z < -40) p[i * 3 + 2] += 80; else if (z > 40) p[i * 3 + 2] -= 80;
      if (y < -14) p[i * 3 + 1] += 40; else if (y > 26) p[i * 3 + 1] -= 40;
      this.sp[i * 3] = p[i * 3]; this.sp[i * 3 + 1] = p[i * 3 + 1]; this.sp[i * 3 + 2] = p[i * 3 + 2];
      const o = i * 6;
      const len = 0.012;
      this.rp[o] = p[i * 3]; this.rp[o + 1] = p[i * 3 + 1]; this.rp[o + 2] = p[i * 3 + 2];
      // streak against your motion: rain hits the visor sideways at speed
      this.rp[o + 3] = p[i * 3] - vel.x * len; this.rp[o + 4] = p[i * 3 + 1] + 0.9 - vel.y * len; this.rp[o + 5] = p[i * 3 + 2] - vel.z * len;
    }
    this.snowMat.uniforms.uA.value = this.snow * 1.2;
    this.rainMat.opacity = this.rain * 0.28;
    this.sg.attributes.position.needsUpdate = true; this.rg.attributes.position.needsUpdate = true;
  }
}
