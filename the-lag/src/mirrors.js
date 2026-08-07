// The reflection engine.
//
// Real planar reflections (a virtual camera mirrored across each pane), but:
//   1. Render targets are POOLED. Only the few panes nearest / most in-view get a
//      live reflection each frame; the rest fall back to cheap "dark glass". Heavy
//      fog hides the seam, so a whole labyrinth costs only ~6 scene renders/frame.
//   2. Each pane carries a LAYER MASK for its reflection camera. Most panes reflect
//      layer 0 (world) + layer 3 (your lagged double). The single truth-mirror
//      reflects layer 0 + layer 4 (a perfectly-synced double). The double therefore
//      exists ONLY inside glass — turn around and there is nothing behind you.
import * as THREE from 'three';

export const LAYER_WORLD = 0; // maze geometry — seen by everyone
export const LAYER_HELD = 2;  // the player's own held lantern — main camera only
export const LAYER_DOUBLE = 3; // the lagged reflection-double — mirror cameras only
export const LAYER_TRUTH = 4;  // the zero-lag double — the exit pane only

const MASK_DOUBLE = (1 << LAYER_WORLD) | (1 << LAYER_DOUBLE);
const MASK_TRUTH = (1 << LAYER_WORLD) | (1 << LAYER_TRUTH);

const V = () => new THREE.Vector3();

function mirrorMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uTextureMatrix: { value: new THREE.Matrix4() },
      uTint: { value: new THREE.Color(opts.tint || 0xcdd6db) },
      uFogColor: { value: new THREE.Color(opts.fogColor ?? 0x05070a) },
      uFogDensity: { value: opts.fogDensity ?? 0.15 },
      uActive: { value: 0 },
      uEdge: { value: opts.edge ?? 0.0 }, // cool rim glint on the glass
    },
    vertexShader: /* glsl */`
      uniform mat4 uTextureMatrix;
      varying vec4 vProj;
      varying float vDepth;
      varying vec2 vLocal;
      void main() {
        // uTextureMatrix already includes the model matrix — use LOCAL position
        vProj = uTextureMatrix * vec4(position, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        vLocal = uv;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform vec3 uTint;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uActive;
      uniform float uEdge;
      varying vec4 vProj;
      varying float vDepth;
      varying vec2 vLocal;
      void main() {
        vec3 col;
        if (uActive > 0.5) {
          vec2 uv = vProj.xy / vProj.w;
          col = texture2D(tDiffuse, uv).rgb * uTint;
        } else {
          // dim silvered glass — a mirror too far/oblique to resolve, not a black void
          col = vec3(0.050, 0.066, 0.082);
        }
        // faint cool glint along the pane edges — reads as "glass" when a flare hits
        float e = smoothstep(0.5, 0.5 - uEdge, abs(vLocal.x - 0.5))
                + smoothstep(0.5, 0.5 - uEdge, abs(vLocal.y - 0.5));
        col += vec3(0.10, 0.16, 0.20) * uEdge * e;
        float f = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
        col = mix(col, uFogColor, clamp(f, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export class Mirror {
  constructor(width, height, opts = {}) {
    this.geometry = new THREE.PlaneGeometry(width, height);
    this.material = mirrorMaterial(opts);
    this.material.toneMapped = false;
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.userData.mirror = this;
    this.reflectMask = opts.truth ? MASK_TRUTH : MASK_DOUBLE;
    this.isTruth = !!opts.truth;
    this._wp = V();
    this._n = V();
  }
  place(x, y, z, rotY) {
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.set(0, rotY, 0);
    this.mesh.updateMatrix();
    this.mesh.updateMatrixWorld(true);
    return this;
  }
  worldNormal(out) { return out.set(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize(); }
  setActive(on) { this.material.uniforms.uActive.value = on ? 1 : 0; }
  setFlare(v) { this.material.uniforms.uEdge.value = v; }
}

export class Mirrors {
  constructor(renderer, { budget = 6, size = 512, maxDist = 13, fogColor = 0x05070a } = {}) {
    this.renderer = renderer;
    this.budget = budget;
    this.maxDist = maxDist;
    this.mirrors = [];
    this.pool = [];
    for (let i = 0; i < budget; i++) {
      const rt = new THREE.WebGLRenderTarget(size, size, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
      });
      rt.texture.generateMipmaps = false;
      this.pool.push(rt);
    }
    // scratch
    this._vcam = new THREE.PerspectiveCamera();
    this._rPos = V(); this._cPos = V(); this._rot = new THREE.Matrix4();
    this._normal = V(); this._view = V(); this._look = V(); this._target = V();
    this._plane = new THREE.Plane(); this._clip = new THREE.Vector4(); this._q = new THREE.Vector4();
    this._texMat = new THREE.Matrix4();
    this._fwd = V(); this._to = V(); this._tmp = V();
    this.clipBias = 0.0008;
    this._activeCount = 0;
  }

  add(mirror) { this.mirrors.push(mirror); return mirror; }

  // Choose panes worth reflecting this frame and render them into the pool.
  update(scene, camera) {
    camera.updateMatrixWorld();
    this._cPos.setFromMatrixPosition(camera.matrixWorld);
    this._fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

    const cands = [];
    for (const m of this.mirrors) {
      m._wp.setFromMatrixPosition(m.mesh.matrixWorld);
      m.worldNormal(m._n);
      this._to.subVectors(m._wp, this._cPos);
      const dist = this._to.length();
      if (dist > this.maxDist) continue;
      // camera must be on the front (+normal) side to see a reflection
      const facing = -this._to.dot(m._n) / (dist || 1); // >0 when we face the front
      if (facing <= 0.02) continue;
      const ahead = this._to.clone().normalize().dot(this._fwd); // in front of us?
      if (ahead < -0.35 && dist > 3.5) continue;
      const priority = ahead * 1.6 + facing * 0.6 - dist * 0.12;
      cands.push({ m, dist, priority });
    }
    cands.sort((a, b) => b.priority - a.priority);
    const chosen = cands.slice(0, this.budget);

    // Everything is dark glass during the reflection passes (prevents feedback and
    // gives a clean single-bounce; fog hides that mirrors-in-mirrors read as glass).
    for (const m of this.mirrors) m.setActive(false);

    const rendered = [];
    for (let i = 0; i < chosen.length; i++) {
      const ok = this._renderPane(scene, camera, chosen[i].m, this.pool[i]);
      if (ok) rendered.push({ m: chosen[i].m, rt: this.pool[i] });
    }
    for (const r of rendered) {
      r.m.material.uniforms.tDiffuse.value = r.rt.texture;
      r.m.material.uniforms.uTextureMatrix.value.copy(r.m._texMatrix);
      r.m.setActive(true);
    }
    this._activeCount = rendered.length;
  }

  _renderPane(scene, camera, mirror, rt) {
    const scope = mirror.mesh;
    this._rPos.setFromMatrixPosition(scope.matrixWorld);
    this._cPos.setFromMatrixPosition(camera.matrixWorld);
    this._rot.extractRotation(scope.matrixWorld);
    this._normal.set(0, 0, 1).applyMatrix4(this._rot).normalize();

    this._view.subVectors(this._rPos, this._cPos);
    if (this._view.dot(this._normal) > 0) return false; // facing away
    this._view.reflect(this._normal).negate().add(this._rPos);

    this._rot.extractRotation(camera.matrixWorld);
    this._look.set(0, 0, -1).applyMatrix4(this._rot).add(this._cPos);
    this._target.subVectors(this._rPos, this._look);
    this._target.reflect(this._normal).negate().add(this._rPos);

    const vc = this._vcam;
    vc.position.copy(this._view);
    vc.up.set(0, 1, 0).applyMatrix4(this._rot).reflect(this._normal);
    vc.lookAt(this._target);
    vc.far = camera.far; vc.near = camera.near;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    vc.layers.mask = mirror.reflectMask;

    // texture matrix maps world position -> reflection UV
    this._texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this._texMat.multiply(vc.projectionMatrix);
    this._texMat.multiply(vc.matrixWorldInverse);
    this._texMat.multiply(scope.matrixWorld);
    if (!mirror._texMatrix) mirror._texMatrix = new THREE.Matrix4();
    mirror._texMatrix.copy(this._texMat);

    // oblique near-clip at the mirror plane, so nothing behind the glass leaks in
    if (!this.noClip) {
      this._plane.setFromNormalAndCoplanarPoint(this._normal, this._rPos);
      this._plane.applyMatrix4(vc.matrixWorldInverse);
      this._clip.set(this._plane.normal.x, this._plane.normal.y, this._plane.normal.z, this._plane.constant);
      const p = vc.projectionMatrix.elements;
      this._q.x = (Math.sign(this._clip.x) + p[8]) / p[0];
      this._q.y = (Math.sign(this._clip.y) + p[9]) / p[5];
      this._q.z = -1.0;
      this._q.w = (1.0 + p[10]) / p[14];
      this._clip.multiplyScalar(2.0 / this._clip.dot(this._q));
      p[2] = this._clip.x; p[6] = this._clip.y;
      p[10] = this._clip.z + 1.0 - this.clipBias; p[14] = this._clip.w;
    }

    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    scope.visible = false;
    r.setRenderTarget(rt);
    r.clear();
    r.render(scene, vc);
    r.setRenderTarget(prevTarget);
    scope.visible = true;
    return true;
  }
}
