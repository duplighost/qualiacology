// three.js keys a material's shader program by its onBeforeCompile's source text. Two materials
// made by one helper that writes different numbers into the shader (a glow strength, a window
// size) read the same, so they shared the program of whichever drew first and the second was
// drawn with the first one's numbers. Key every hooked material by what its hook actually
// writes instead: run it once on the stock shader for that material and hash the result.
import * as THREE from 'three';

const IDS = {
  MeshDepthMaterial: 'depth', MeshDistanceMaterial: 'distance', MeshNormalMaterial: 'normal', MeshBasicMaterial: 'basic',
  MeshLambertMaterial: 'lambert', MeshPhongMaterial: 'phong', MeshToonMaterial: 'toon', MeshStandardMaterial: 'physical',
  MeshPhysicalMaterial: 'physical', MeshMatcapMaterial: 'matcap', LineBasicMaterial: 'basic', LineDashedMaterial: 'dashed',
  PointsMaterial: 'points', ShadowMaterial: 'shadow', SpriteMaterial: 'sprite',
};
const proto = THREE.Material.prototype, stock = proto.onBeforeCompile, baseKey = proto.customProgramCacheKey;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

proto.customProgramCacheKey = function () {
  const hook = this.onBeforeCompile;
  if (hook === stock) return baseKey.call(this);
  if (this._lcHook === hook) return this._lcKey;
  let key;
  try {
    const lib = THREE.ShaderLib[IDS[this.type]];
    const sh = {
      vertexShader: this.vertexShader || (lib && lib.vertexShader) || '',
      fragmentShader: this.fragmentShader || (lib && lib.fragmentShader) || '',
      uniforms: THREE.UniformsUtils.clone((lib && lib.uniforms) || this.uniforms || {}),
      defines: { ...(this.defines || {}) },
    };
    // (a hook that keeps its shader, m.userData.shader = sh, gets the real one again at compile)
    hook.call(this, sh, null);
    key = baseKey.call(this) + '|' + hash(sh.vertexShader) + '.' + hash(sh.fragmentShader) + '.' + hash(JSON.stringify(sh.defines));
  } catch (e) {
    key = baseKey.call(this) + '|' + this.uuid;   // couldn't tell: give it a program of its own
  }
  this._lcHook = hook; this._lcKey = key;
  return key;
};
