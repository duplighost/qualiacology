// Ground marks that keep the fighters readable from the high camera: a soft contact shadow under each, a thin
// gold ring under YOU whose two pips are your dash charges, and a faint ring under her.
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position,1.0))); }';
const FS = /* glsl */`
uniform vec3 uCol; uniform float uR, uW, uShadow, uA, uPips, uPipK0, uPipK1, uFacing;
varying vec2 vUv;
void main() {
  float d = length(vUv);
  float w = fwidth(d);
  float shadow = smoothstep(0.62, 0.0, d) * uShadow;
  float ring = (1.0 - smoothstep(uW - w, uW + w, abs(d - uR))) * uA;
  // dash pips: two small arcs behind you
  float pip = 0.0;
  if (uPips > 0.5) {
    float ang = atan(vUv.x, vUv.y) - uFacing;
    ang = atan(sin(ang), cos(ang));
    float r = abs(d - (uR + 0.09));
    float a0 = abs(ang - 2.75), a1 = abs(ang + 2.75);
    float p0 = (1.0 - smoothstep(0.012, 0.03, r)) * (1.0 - smoothstep(0.16, 0.2, a0));
    float p1 = (1.0 - smoothstep(0.012, 0.03, r)) * (1.0 - smoothstep(0.16, 0.2, a1));
    pip = p0 * (0.2 + 0.8 * uPipK0) + p1 * (0.2 + 0.8 * uPipK1);
  }
  vec3 col = uCol * (ring + pip * 1.4);
  float a = max(shadow, max(ring, pip));
  if (a < 0.003) discard;
  // shadow darkens (premultiplied: dark colour with alpha), ring/pip add light
  gl_FragColor = vec4(col, a);
}`;

export class GroundMarks {
  constructor(scene) {
    const make = (col, r, w, shadow, a, pips) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { uCol: { value: col }, uR: { value: r }, uW: { value: w }, uShadow: { value: shadow }, uA: { value: a }, uPips: { value: pips ? 1 : 0 }, uPipK0: { value: 1 }, uPipK1: { value: 1 }, uFacing: { value: 0 } } }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.position.y = 0.025; scene.add(m); return m;
    };
    this.you = make(new THREE.Color(2.2, 1.45, 0.45), 0.62, 0.018, 0.55, 0.55, true);
    this.her = make(new THREE.Color(2.4, 0.35, 1.0), 0.9, 0.016, 0.5, 0.35, false);
    this.you.scale.setScalar(1.3); this.her.scale.setScalar(1.6);
  }
  update(player, boss, dashCharges, dashCool, maxCharges, recharge) {
    if (player) {
      this.you.position.set(player.x, 0.025, player.z);
      const u = this.you.material.uniforms;
      u.uFacing.value = player.facing;
      u.uPipK0.value = dashCharges >= 1 ? 1 : 0; u.uPipK1.value = dashCharges >= 2 ? 1 : (dashCharges === 1 ? 1 - Math.max(0, dashCool) / recharge : 0);
      this.you.visible = player.state !== 'dead';
    }
    if (boss) { this.her.position.set(boss.x, 0.025, boss.z); this.her.visible = boss.state !== 'finished' && boss.state !== 'gone' && !boss.intangible; }
  }
  dispose(scene) { scene.remove(this.you, this.her); }
}
