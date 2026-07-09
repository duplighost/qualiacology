// Atmosphere: renderer + post stack (bloom, grain, vignette), fog, a pooled
// candle-light system, drifting dust, lightning, and the grey lady herself.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GrainVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0.055 },
    vig: { value: 1.22 },
    fear: { value: 0 },       // 0..1 — pushes vignette + desaturation in scares
  },
  vertexShader: `varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float amount;
    uniform float vig; uniform float fear;
    varying vec2 vUv;
    float rnd(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float g = rnd(vUv * (1.0 + fract(time)) * vec2(1920.0, 1080.0));
      c.rgb += (g - 0.5) * amount * (1.0 + fear * 1.5);
      vec2 p = vUv - 0.5;
      float v = 1.0 - dot(p, p) * (vig + fear * 1.6);
      c.rgb *= clamp(v, 0.0, 1.0);
      float grey = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(grey) * vec3(0.75, 0.82, 1.0), fear * 0.55);
      gl_FragColor = c;
    }`,
};

export class Effects {
  constructor(renderer, scene, camera, world) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.renderer = renderer;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    scene.fog = new THREE.FogExp2(0x05060c, 0.024);
    scene.background = new THREE.Color(0x02040a);

    // ambient bases — kept as fields so the finale can flip the whole house on
    this.ambient = new THREE.AmbientLight(0x2a3348, 0.42);
    scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x232c42, 0x0d0906, 0.42);
    scene.add(this.hemi);
    this.lightsOn = false;      // set once the arrest finale throws the breaker

    // moonlight through the windows
    const moon = new THREE.DirectionalLight(0x7288b8, 1.1);
    moon.position.set(-40, 60, -60);
    moon.target.position.set(30, 0, 20);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -55; moon.shadow.camera.right = 55;
    moon.shadow.camera.top = 55; moon.shadow.camera.bottom = -55;
    moon.shadow.camera.far = 220;
    moon.shadow.bias = -0.0004;
    moon.shadow.camera.updateProjectionMatrix();
    // the moon doesn't move: render its shadow map once, then freeze it
    moon.shadow.autoUpdate = false;
    moon.shadow.needsUpdate = true;
    scene.add(moon, moon.target);
    this.moon = moon;

    // lightning
    this.lightning = new THREE.DirectionalLight(0xcdd8ff, 0);
    this.lightning.position.set(20, 80, 90);
    scene.add(this.lightning);
    this._boltT = 0;
    this._nextBolt = 7 + Math.random() * 14;
    this.onThunder = null;

    // player lantern
    this.lantern = new THREE.SpotLight(0xffc078, 0, 16, 0.62, 0.45, 1.4);
    this.lantern.castShadow = true;
    this.lantern.shadow.mapSize.set(1024, 1024);
    this.lantern.shadow.bias = -0.002;
    this.lanternOn = true;
    scene.add(this.lantern, this.lantern.target);

    // candle pool: fixed number of real lights reassigned to nearest candles
    this.POOL = 11;
    this.pool = [];
    for (let i = 0; i < this.POOL; i++) {
      const p = new THREE.PointLight(0xff9540, 0, 9, 1.8);
      scene.add(p);
      this.pool.push(p);
    }
    this.candles = [];
    this._poolT = 0;

    // ghost light (follows apparitions)
    this.ghostLight = new THREE.PointLight(0x8fb4ff, 0, 12, 1.6);
    scene.add(this.ghostLight);

    // dust motes around the camera
    const N = 420;
    const pts = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pts[i * 3] = (Math.random() - 0.5) * 14;
      pts[i * 3 + 1] = Math.random() * 3.4;
      pts[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.dust = new THREE.Points(this.dustGeo, new THREE.PointsMaterial({
      color: 0xbfae8a, size: 0.014, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(this.dust);

    // post stack
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    // tone mapping + sRGB conversion happen here; grain runs display-referred
    this.composer.addPass(new OutputPass());
    this.grain = new ShaderPass(GrainVignetteShader);
    this.composer.addPass(this.grain);

    // the grey lady
    this.ghost = this.buildGhost();
    scene.add(this.ghost);
    this.ghost.visible = false;
    this.ghostAlpha = 0;
    this.ghostTargetAlpha = 0;

    this.fear = 0;
    this.fearTarget = 0;
    this.time = 0;
    this.quality = 2;
  }

  buildGhost() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xaec6f0, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.ghostMat = mat;
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.55, 12, 6, true), mat);
    body.position.y = 0.78;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), mat);
    head.position.y = 1.62;
    g.add(head);
    const veil = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.75, 10, 4, true), mat);
    veil.position.y = 1.5;
    g.add(veil);
    return g;
  }

  showGhost(x, y, z, facing = 0, alpha = 0.55) {
    this.ghost.position.set(x, y, z);
    this.ghost.rotation.y = facing;
    this.ghost.visible = true;
    this.ghostTargetAlpha = alpha;
  }
  hideGhost() { this.ghostTargetAlpha = 0; }

  setLantern(on) { this.lanternOn = on; }

  setCandles(list) { this.candles = list; }

  // The arrest: the whole house comes on at once. Everything ordinary, all at
  // once. Kills the dread post-effect and lifts the fog so the room reads plain.
  flipAllLightsOn() {
    this.lightsOn = true;
    this.lanternOn = false;
    this.fearTarget = 0;
    this._flash = 1.4;              // a hard electrical flash on the throw
    this.renderer.toneMappingExposure = 1.0;
  }

  update(dt, playerPos, camera) {
    this.time += dt;
    this.grain.uniforms.time.value = this.time;
    this.fear += (this.fearTarget - this.fear) * Math.min(1, dt * 1.6);
    this.grain.uniforms.fear.value = this.fear;

    // the finale: ease the whole house up to plain, ordinary light
    if (this.lightsOn) {
      const k = Math.min(1, dt * 2.4);
      this.ambient.intensity += (2.15 - this.ambient.intensity) * k;
      this.ambient.color.lerp(new THREE.Color(0xede8df), k);
      this.hemi.intensity += (1.55 - this.hemi.intensity) * k;
      this.hemi.color.lerp(new THREE.Color(0xe8ecf2), k);
      this.moon.intensity += (1.9 - this.moon.intensity) * k;
      if (this.scene.fog) this.scene.fog.density += (0.0035 - this.scene.fog.density) * k;
      this.scene.background.lerp(new THREE.Color(0x1a1e28), k);
      this.grain.uniforms.vig.value += (0.55 - this.grain.uniforms.vig.value) * k;
      // note: only light intensity changes here, not the moon's position, so the
      // (frozen) shadow map stays valid — no per-frame shadow re-render needed.
    }

    // lantern follows camera with slight lag
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const lp = camera.position.clone().addScaledVector(fwd, 0.25);
    this.lantern.position.lerp(lp, Math.min(1, dt * 30));
    const tgt = camera.position.clone().addScaledVector(fwd, 8);
    this.lantern.target.position.lerp(tgt, Math.min(1, dt * 14));
    const wantI = this.lanternOn ? 30 : 0;
    this.lantern.intensity += (wantI - this.lantern.intensity) * Math.min(1, dt * 8);

    // candle pool: every 0.4s pick nearest candles; every frame flicker
    this._poolT -= dt;
    if (this._poolT <= 0) {
      this._poolT = 0.4;
      const sorted = this.candles
        .map(c => ({ c, d: (c.x - playerPos.x) ** 2 + (c.y - playerPos.y) ** 2 + (c.z - playerPos.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.POOL);
      for (let i = 0; i < this.POOL; i++) {
        const p = this.pool[i];
        if (sorted[i]) {
          const c = sorted[i].c;
          p.position.set(c.x, c.y, c.z);
          p.color.setHex(c.color);
          p.distance = c.r;
          p.userData.base = c.intensity;
        } else p.userData.base = 0;
      }
    }
    for (const p of this.pool) {
      const b = p.userData.base || 0;
      p.intensity = b * (0.82 + Math.sin(this.time * 11 + p.position.x * 7.7) * 0.09
        + Math.sin(this.time * 23 + p.position.z * 13.3) * 0.06 + Math.random() * 0.05);
    }

    // lightning storms
    this._boltT += dt;
    if (this._boltT > this._nextBolt) {
      this._boltT = 0;
      this._nextBolt = 9 + Math.random() * 20;
      this._flash = 1;
      if (this.onThunder) {
        const delay = 400 + Math.random() * 1800;
        setTimeout(() => this.onThunder(), delay);
      }
    }
    if (this._flash > 0) {
      this._flash -= dt * 2.2;
      const s = Math.max(0, this._flash);
      // double-strike shape
      this.lightning.intensity = (Math.sin(s * 24) > 0 ? s : s * 0.25) * 2.6;
    } else this.lightning.intensity = 0;

    // dust drifts around the player
    this.dust.position.set(playerPos.x, playerPos.y, playerPos.z);
    this.dust.rotation.y += dt * 0.014;

    // ghost fade + hover
    this.ghostAlpha += (this.ghostTargetAlpha - this.ghostAlpha) * Math.min(1, dt * 2.4);
    this.ghostMat.opacity = this.ghostAlpha;
    this.ghostLight.intensity = this.ghostAlpha * 5;
    if (this.ghost.visible) {
      this.ghost.position.y += Math.sin(this.time * 1.7) * 0.0016;
      this.ghostLight.position.copy(this.ghost.position).add(new THREE.Vector3(0, 1.4, 0));
      if (this.ghostAlpha < 0.01 && this.ghostTargetAlpha === 0) this.ghost.visible = false;
    }
  }

  render() { this.composer.render(); }
  resize(w, h) {
    this.composer.setSize(w, h);
  }

  // 2 = full, 1 = no bloom / no lantern shadow, 0 = no shadows at all
  setQuality(q) {
    if (q === this.quality) return;
    this.quality = q;
    this.bloom.enabled = q >= 2;
    this.lantern.castShadow = q >= 2;
    this.renderer.shadowMap.enabled = q >= 1;
    if (q >= 1) this.moon.shadow.needsUpdate = true;
    this.renderer.setPixelRatio(q >= 2 ? Math.min(devicePixelRatio, 1.75) : 1);
    // force material shadow recompile when toggling the shadow system
    this.scene.traverse(o => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
  }
}
