import * as THREE from '../vendor/three.module.min.js';

const _v = new THREE.Vector3();
const _c = new THREE.Color();
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class EffectsSystem {
  constructor(scene, { maxParticles = 900, maxWarnings = 24 } = {}) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.cursor = 0;
    this.particles = Array.from({ length: maxParticles }, () => ({ life: 0, maxLife: 1, velocity: new THREE.Vector3(), drag: 0, gravity: 0 }));
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uPixelRatio: { value: Math.min(devicePixelRatio, 1.6) } },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 92.0 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = dot(p,p);
          if (d > 1.0) discard;
          float core = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(vColor * (1.1 + core), core * core);
        }
      `
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);

    this.warnings = [];
    const ringGeo = new THREE.RingGeometry(.975, 1, 96);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < maxWarnings; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff5ca8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 5;
      scene.add(mesh);
      this.warnings.push({ mesh, life: 0, maxLife: 1, from: 1, to: 1, kind: 'ring', follow: null, followOffset: new THREE.Vector3() });
    }
    this.warningCursor = 0;
    this.lineWarnings = [];
    this.lineWarningCursor = 0;
    this.lineWarningGeometry = new THREE.PlaneGeometry(1, 1);
    this.lineWarningGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xff5ca8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.lineWarningGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 4;
      scene.add(mesh);
      this.lineWarnings.push({ mesh, life: 0, maxLife: 1, follow: null, followOffset: new THREE.Vector3() });
    }
    this.trails = [];
    this.shockwaves = [];
    this.shockwaveCursor = 0;
    this.shockwaveGeometry = new THREE.RingGeometry(.88, 1, 96);
    this.shockwaveGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < 18; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.shockwaveGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 15;
      scene.add(mesh);
      this.shockwaves.push({ mesh, life: 0, maxLife: 1, radius: 1 });
    }

    // Contact marks are authored geometry rather than another cloud of points.
    // A restrained outer flare frames a separate knife-thin core. Successful
    // deflects reuse that core geometry for two equal crossing cuts, so the X
    // cannot collapse into one broad shard plus a smaller highlight.
    this.impactSlashes = [];
    this.impactSlashCursor = 0;
    // These profiles stay deliberately narrow: the contact point should read
    // as a directional cut without hiding either fighter.
    const impactSlashShape = new THREE.Shape();
    impactSlashShape.moveTo(-1, -0.012);
    impactSlashShape.quadraticCurveTo(-0.06, 0.26, 1, 0.025);
    impactSlashShape.lineTo(0.79, -0.025);
    impactSlashShape.quadraticCurveTo(-0.08, 0.105, -0.84, -0.052);
    impactSlashShape.closePath();
    this.impactSlashGeometry = new THREE.ShapeGeometry(impactSlashShape, 18);

    const impactSlashCoreShape = new THREE.Shape();
    impactSlashCoreShape.moveTo(-0.92, -0.008);
    impactSlashCoreShape.quadraticCurveTo(-0.03, 0.105, 0.92, 0.014);
    impactSlashCoreShape.lineTo(0.76, -0.012);
    impactSlashCoreShape.quadraticCurveTo(-0.04, 0.042, -0.78, -0.026);
    impactSlashCoreShape.closePath();
    this.impactSlashCoreGeometry = new THREE.ShapeGeometry(impactSlashCoreShape, 16);
    for (let i = 0; i < 22; i++) {
      const group = new THREE.Group();
      const outerMaterial = new THREE.MeshBasicMaterial({
        color: 0x8ef6ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xf6ffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const outer = new THREE.Mesh(this.impactSlashGeometry, outerMaterial);
      const core = new THREE.Mesh(this.impactSlashCoreGeometry, coreMaterial);
      outer.renderOrder = 21;
      core.renderOrder = 22;
      group.add(outer, core);
      group.visible = false;
      scene.add(group);
      this.impactSlashes.push({
        group,
        outer,
        core,
        life: 0,
        maxLife: 1,
        radius: 1,
        baseRotation: 0,
        spin: 0,
        crossed: false,
      });
    }

    // Two pooled quarter-discs make Hourbreak's danger geometry visible.  The
    // material is translucent rather than bloom-heavy, so the player remains
    // readable through it and the warning still works without relying on hue.
    const sectorPositions = [0, 0, 0];
    const sectorIndices = [];
    const sectorSteps = 32;
    for (let step = 0; step <= sectorSteps; step++) {
      const angle = step / sectorSteps * Math.PI * .5;
      sectorPositions.push(Math.cos(angle), 0, Math.sin(angle));
      if (step < sectorSteps) sectorIndices.push(0, step + 1, step + 2);
    }
    this.sectorGeometry = new THREE.BufferGeometry();
    this.sectorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sectorPositions, 3));
    this.sectorGeometry.setIndex(sectorIndices);
    this.sectorGeometry.computeVertexNormals();
    this.sectorWarnings = [];
    this.sectorCursor = 0;
    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group();
      const meshes = [];
      for (let side = 0; side < 2; side++) {
        const material = new THREE.MeshBasicMaterial({ color: 0xd9a0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(this.sectorGeometry, material);
        mesh.renderOrder = 4;
        group.add(mesh);
        meshes.push(mesh);
      }
      group.visible = false;
      group.position.y = .028;
      scene.add(group);
      this.sectorWarnings.push({ group, meshes, life: 0, maxLife: 1 });
    }
  }

  precompile(renderer, camera) {
    // WebGLRenderer.compile skips invisible scene branches. Every pooled
    // effect begins hidden, which otherwise moves shader compilation to the
    // player's first parry/heavy/special and can cause a long D3D11 driver
    // stall on older hardware. Reveal one representative of each pooled
    // program only while compiling; no frame is rendered in this state.
    const representatives = [
      this.warnings[0]?.mesh,
      this.lineWarnings[0]?.mesh,
      this.shockwaves[0]?.mesh,
      this.impactSlashes[0]?.group,
      this.sectorWarnings[0]?.group,
      ...this.trails.map((trail) => trail.mesh),
    ].filter(Boolean);
    const visibility = representatives.map((object) => object.visible);
    representatives.forEach((object) => { object.visible = true; });
    try {
      renderer.compile(this.scene, camera);
    } finally {
      representatives.forEach((object, index) => { object.visible = visibility[index]; });
    }
  }

  spawnParticle(position, velocity, color, size = .16, life = .5, gravity = -5, drag = 1.4) {
    const i = this.cursor++ % this.maxParticles;
    const p = this.particles[i];
    p.life = life;
    p.maxLife = life;
    p.velocity.copy(velocity);
    p.drag = drag;
    p.gravity = gravity;
    this.positions[i * 3] = position.x;
    this.positions[i * 3 + 1] = position.y;
    this.positions[i * 3 + 2] = position.z;
    _c.set(color);
    this.colors[i * 3] = _c.r;
    this.colors[i * 3 + 1] = _c.g;
    this.colors[i * 3 + 2] = _c.b;
    this.sizes[i] = size;
  }

  sparks(position, color = 0x9bf7ff, count = 18, strength = 5) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = Math.random() * .75 + .15;
      const s = strength * (.35 + Math.random() * .75);
      this.spawnParticle(position, _v.set(Math.cos(a) * s, y * s, Math.sin(a) * s).clone(), i % 4 === 0 ? 0xffffff : color, .08 + Math.random() * .16, .22 + Math.random() * .42, -9, 1.1);
    }
  }

  burst(position, color = 0xf4ae53, count = 32, strength = 7) {
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.6 - .2, Math.random() * 2 - 1).normalize().multiplyScalar(strength * (.25 + Math.random() * .75));
      this.spawnParticle(position, v, i % 5 === 0 ? 0xffffff : color, .12 + Math.random() * .28, .35 + Math.random() * .65, -5, 1.4);
    }
  }

  dust(position, color = 0x727a9b, count = 16, strength = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * strength;
      this.spawnParticle(position, new THREE.Vector3(Math.cos(a) * s, Math.random() * .6, Math.sin(a) * s), color, .28 + Math.random() * .5, .5 + Math.random() * .6, .25, 2.8);
    }
  }

  warning({ position, radius = 3, duration = .8, color = 0xff5ca8, from = 1.65, kind = 'ring', rotation = 0, follow = null } = {}) {
    const w = this.warnings[this.warningCursor++ % this.warnings.length];
    w.life = duration;
    w.maxLife = duration;
    w.from = from;
    w.to = radius;
    w.kind = kind;
    w.follow = follow;
    w.mesh.visible = true;
    w.mesh.position.copy(position || _v.set(0,.025,0));
    w.mesh.position.y = Math.max(.025, w.mesh.position.y);
    w.mesh.rotation.y = rotation;
    w.mesh.material.color.set(color);
    w.mesh.material.opacity = .75;
    w.mesh.scale.setScalar(radius * from);
    if (follow?.position) w.followOffset.copy(w.mesh.position).sub(follow.position);
    else w.followOffset.set(0, 0, 0);
    return w;
  }

  lineWarning({ from, to, width = .42, duration = .8, color = 0xff5ca8, follow = null } = {}) {
    const w = this.lineWarnings[this.lineWarningCursor++ % this.lineWarnings.length];
    w.life = duration;
    w.maxLife = duration;
    w.follow = follow;
    w.mesh.visible = true;
    w.mesh.position.copy(from).add(to).multiplyScalar(.5);
    const distance = from.distanceTo(to);
    w.mesh.scale.set(width * 2, 1, distance);
    w.mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    w.mesh.material.color.set(color);
    w.mesh.material.opacity = .2;
    if (follow?.position) w.followOffset.copy(w.mesh.position).sub(follow.position);
    else w.followOffset.set(0, 0, 0);
    return w;
  }

  sectorWarning({ dangerParity = 0, radius = 18, duration = .8, color = 0xd9a0ff } = {}) {
    const warning = this.sectorWarnings[this.sectorCursor++ % this.sectorWarnings.length];
    warning.life = duration;
    warning.maxLife = duration;
    warning.group.visible = true;
    warning.group.scale.setScalar(radius);
    warning.group.position.set(0, .028, 0);
    const firstSector = ((dangerParity % 2) + 2) % 2;
    warning.meshes.forEach((mesh, index) => {
      const start = (firstSector + index * 2) * Math.PI * .5;
      mesh.rotation.y = -start;
      mesh.material.color.set(color);
      mesh.material.opacity = .24;
    });
    return warning;
  }

  shockwave(position, color = 0xffffff, radius = 7, duration = .38) {
    const entry = this.shockwaves[this.shockwaveCursor++ % this.shockwaves.length];
    const { mesh } = entry;
    mesh.material.color.set(color);
    mesh.material.opacity = .75;
    mesh.position.copy(position);
    mesh.position.y += .04;
    mesh.scale.setScalar(.1);
    mesh.visible = true;
    entry.life = duration;
    entry.maxLife = duration;
    entry.radius = radius;
  }

  impactSlash(position, {
    color = 0x8ef6ff,
    coreColor = 0xf6ffff,
    radius = 1.15,
    duration = .24,
    facing = 0,
    crossed = false,
    spin = .18,
  } = {}) {
    const entry = this.impactSlashes[this.impactSlashCursor++ % this.impactSlashes.length];
    const { group, outer, core } = entry;
    entry.life = duration;
    entry.maxLife = duration;
    entry.radius = radius;
    entry.spin = spin;
    entry.crossed = crossed;
    entry.baseRotation = crossed ? 0 : -.42;
    group.position.copy(position);
    group.rotation.set(0, facing, entry.baseRotation);
    group.scale.setScalar(Math.max(.06, radius * (crossed ? .42 : .34)));
    group.visible = true;
    outer.material.color.set(color);
    core.material.color.set(coreColor);
    // Seed the contact frame itself. Hitstop may hold the effect at p === 0,
    // so visibility cannot depend on a later non-zero update.
    outer.material.opacity = crossed ? .67 : .58;
    core.material.opacity = crossed ? .67 : .72;
    outer.geometry = crossed ? this.impactSlashCoreGeometry : this.impactSlashGeometry;
    outer.rotation.z = crossed ? -Math.PI * .25 : 0;
    core.rotation.z = crossed ? Math.PI * .25 : .02;
    if (crossed) {
      outer.scale.set(1, 1, 1);
      core.scale.set(1, 1, 1);
    } else {
      outer.scale.set(1, .9, 1);
      core.scale.set(.82, .72, 1);
    }
    return entry;
  }

  createTrail(color = 0x8ef6ff, segments = 14, {
    baseAlpha = .08,
    tipAlpha = 1,
    fade = 17,
    renderOrder = 18,
    widthHistoryPower = 1.3,
    alphaHistoryPower = 2,
  } = {}) {
    const positions = new Float32Array(segments * 2 * 3);
    const alphas = new Float32Array(segments * 2);
    const indices = [];
    for (let i = 0; i < segments - 1; i++) indices.push(i*2, i*2+1, i*2+2, i*2+1, i*2+3, i*2+2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
      vertexShader: `attribute float aAlpha; varying float vAlpha; void main(){vAlpha=aAlpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vAlpha; void main(){gl_FragColor=vec4(uColor*(1.0+vAlpha*.75),vAlpha*uOpacity);}`
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = renderOrder;
    this.scene.add(mesh);
    const trail = {
      mesh,
      geometry,
      positions,
      alphas,
      segments,
      samples: Array.from({ length: segments }, () => ({ base: new THREE.Vector3(), tip: new THREE.Vector3() })),
      sampleCount: 0,
      opacity: 0,
      active: false,
      baseAlpha,
      tipAlpha,
      fade,
      widthHistoryPower,
      alphaHistoryPower,
    };
    this.trails.push(trail);
    return trail;
  }

  sampleTrail(trail, base, tip, active, opacity = .8, dt = 1 / 60) {
    const wasActive = trail.active;
    trail.active = active;
    if (active) {
      if (!wasActive && trail.opacity < .02) trail.sampleCount = 0;
      trail.opacity += (opacity - trail.opacity) * (1 - Math.exp(-42 * dt));
      const shiftEnd = Math.min(trail.sampleCount, trail.segments - 1);
      for (let i = shiftEnd; i > 0; i--) {
        trail.samples[i].base.copy(trail.samples[i - 1].base);
        trail.samples[i].tip.copy(trail.samples[i - 1].tip);
      }
      trail.samples[0].base.copy(base);
      trail.samples[0].tip.copy(tip);
      trail.sampleCount = Math.min(trail.segments, trail.sampleCount + 1);
    } else {
      trail.opacity *= Math.exp(-trail.fade * dt);
      if (trail.opacity < .012) {
        trail.opacity = 0;
        trail.sampleCount = 0;
        trail.mesh.visible = false;
        trail.mesh.material.uniforms.uOpacity.value = 0;
        return;
      }
    }
    if (!trail.sampleCount) return;
    const denominator = Math.max(1, trail.segments - 1);
    for (let i = 0; i < trail.segments; i++) {
      const sample = trail.samples[Math.min(i, trail.sampleCount - 1)];
      const j = i * 6;
      const history = clamp01(1 - i / denominator);
      const width = Math.pow(history, trail.widthHistoryPower);
      trail.positions[j] = sample.tip.x + (sample.base.x - sample.tip.x) * width;
      trail.positions[j+1] = sample.tip.y + (sample.base.y - sample.tip.y) * width;
      trail.positions[j+2] = sample.tip.z + (sample.base.z - sample.tip.z) * width;
      trail.positions[j+3] = sample.tip.x; trail.positions[j+4] = sample.tip.y; trail.positions[j+5] = sample.tip.z;
      const alpha = Math.pow(history, trail.alphaHistoryPower);
      trail.alphas[i*2] = alpha * trail.baseAlpha;
      trail.alphas[i*2+1] = alpha * trail.tipAlpha;
    }
    trail.geometry.attributes.position.needsUpdate = true;
    trail.geometry.attributes.aAlpha.needsUpdate = true;
    trail.mesh.material.uniforms.uOpacity.value = trail.opacity;
    trail.mesh.visible = trail.opacity > .015;
  }

  update(dt) {
    const posAttr = this.points.geometry.attributes.position;
    const colorAttr = this.points.geometry.attributes.color;
    const sizeAttr = this.points.geometry.attributes.aSize;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.life <= 0) { this.sizes[i] = 0; continue; }
      p.life -= dt;
      const drag = Math.exp(-p.drag * dt);
      p.velocity.x *= drag;
      p.velocity.z *= drag;
      p.velocity.y += p.gravity * dt;
      this.positions[i*3] += p.velocity.x * dt;
      this.positions[i*3+1] += p.velocity.y * dt;
      this.positions[i*3+2] += p.velocity.z * dt;
      const a = clamp01(p.life / p.maxLife);
      this.sizes[i] *= Math.pow(a, dt * 2.2);
      this.colors[i*3] *= .995;
      this.colors[i*3+1] *= .995;
      this.colors[i*3+2] *= .995;
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    for (const w of this.warnings) {
      if (w.life <= 0) continue;
      w.life -= dt;
      const p = clamp01(1 - w.life / w.maxLife);
      if (w.follow?.position) w.mesh.position.copy(w.follow.position).add(w.followOffset);
      if (w.kind === 'ring') {
        const s = w.to * (w.from + (1 - w.from) * p);
        w.mesh.scale.setScalar(s);
      }
      w.mesh.material.opacity = (.18 + (1-p)*.6) * Math.min(1, w.life * 7);
      if (w.life <= 0) w.mesh.visible = false;
    }
    for (const w of this.lineWarnings) {
      if (w.life <= 0) continue;
      w.life -= dt;
      const p = clamp01(1 - w.life / w.maxLife);
      if (w.follow?.position) w.mesh.position.copy(w.follow.position).add(w.followOffset);
      w.mesh.material.opacity = (.09 + (1 - p) * .16) * Math.min(1, w.life * 8) * (.9 + Math.sin(p * Math.PI * 12) * .1);
      if (w.life <= 0) w.mesh.visible = false;
    }
    for (const warning of this.sectorWarnings) {
      if (warning.life <= 0) continue;
      warning.life -= dt;
      const p = clamp01(1 - warning.life / warning.maxLife);
      const opacity = (.08 + (1 - p) * .22) * Math.min(1, warning.life * 7) * (.82 + Math.sin(p * Math.PI * 10) * .12);
      warning.meshes.forEach((mesh) => { mesh.material.opacity = opacity; });
      if (warning.life <= 0) warning.group.visible = false;
    }
    for (const s of this.shockwaves) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const p = clamp01(1 - s.life / s.maxLife);
      s.mesh.scale.setScalar(.1 + s.radius * (1 - Math.pow(1-p,2)));
      s.mesh.material.opacity = Math.pow(1-p,2) * .7;
      if (s.life <= 0) {
        s.life = 0;
        s.mesh.visible = false;
      }
    }
    for (const slash of this.impactSlashes) {
      if (slash.life <= 0) continue;
      slash.life -= dt;
      const p = clamp01(1 - slash.life / slash.maxLife);
      // Preserve the authored contact mark during a zero-delta hitstop frame,
      // then let it complete its short expansion and fade normally.
      const appear = .78 + .22 * Math.min(1, p * 10);
      const envelope = appear * Math.pow(1 - p, 1.42);
      const startScale = slash.crossed ? .42 : .34;
      const endScale = slash.crossed ? 1.02 : 1.08;
      const scale = slash.radius * (startScale + (endScale - startScale) * (1 - Math.pow(1 - p, 3)));
      slash.group.scale.setScalar(scale);
      slash.group.rotation.z = slash.baseRotation + slash.spin * p;
      slash.outer.material.opacity = envelope * (slash.crossed ? .86 : .74);
      slash.core.material.opacity = envelope * (slash.crossed ? .86 : .92);
      if (slash.life <= 0) {
        slash.life = 0;
        slash.group.visible = false;
      }
    }
  }

  clear() {
    for (const p of this.particles) p.life = 0;
    this.sizes.fill(0);
    for (const w of this.warnings) { w.life = 0; w.follow = null; w.mesh.visible = false; }
    for (const w of this.lineWarnings) { w.life = 0; w.follow = null; w.mesh.visible = false; }
    for (const warning of this.sectorWarnings) { warning.life = 0; warning.group.visible = false; }
    for (const s of this.shockwaves) { s.life = 0; s.mesh.visible = false; }
    for (const slash of this.impactSlashes) { slash.life = 0; slash.group.visible = false; }
    for (const trail of this.trails) { trail.sampleCount = 0; trail.opacity = 0; trail.mesh.visible = false; }
  }

  snapshot() {
    return { particles: this.particles.filter(p => p.life > 0).length, warnings: this.warnings.filter(w => w.life > 0).length + this.lineWarnings.filter(w => w.life > 0).length + this.sectorWarnings.filter(w => w.life > 0).length, shockwaves: this.shockwaves.filter(s => s.life > 0).length, impactSlashes: this.impactSlashes.filter(s => s.life > 0).length, trails: this.trails.length };
  }

  dispose() {
    this.clear();
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
    for (const w of this.warnings) { this.scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }
    for (const w of this.lineWarnings) { this.scene.remove(w.mesh); w.mesh.material.dispose(); }
    this.lineWarningGeometry.dispose();
    for (const warning of this.sectorWarnings) {
      this.scene.remove(warning.group);
      warning.meshes.forEach((mesh) => mesh.material.dispose());
    }
    this.sectorGeometry.dispose();
    for (const s of this.shockwaves) { this.scene.remove(s.mesh); s.mesh.material.dispose(); }
    this.shockwaveGeometry.dispose();
    for (const slash of this.impactSlashes) {
      this.scene.remove(slash.group);
      slash.outer.material.dispose();
      slash.core.material.dispose();
    }
    this.impactSlashGeometry.dispose();
    this.impactSlashCoreGeometry.dispose();
    for (const trail of this.trails) { this.scene.remove(trail.mesh); trail.geometry.dispose(); trail.mesh.material.dispose(); }
  }
}
