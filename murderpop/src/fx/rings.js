// Ground marks that keep the fighters readable from the high camera: a soft contact shadow under each, a thin
// gold ring under YOU whose two pips are your dash charges, and a faint ring under her. Round YOU's ring, the
// spotlight's meter: an arc that fills as you earn it (it starts at the top and goes round), blazing when full.
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position,1.0))); }';
const FS = /* glsl */`
uniform vec3 uCol; uniform float uR, uW, uShadow, uA, uPips, uPipK0, uPipK1, uFacing, uFull, uBeat, uMeter;
varying vec2 vUv;
void main() {
  float d = length(vUv);
  float w = fwidth(d);
  float shadow = smoothstep(0.62, 0.0, d) * uShadow;
  // the spotlight is ready: the ring is thicker and brighter, breathing with the beat
  float ww = uW * (1.0 + 1.6 * uFull);
  float ring = (1.0 - smoothstep(ww - w, ww + w, abs(d - uR))) * uA * (1.0 + 1.4 * uFull + 0.9 * uBeat);
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
  // the meter: an arc just outside the ring, clockwise from the top of the screen (-z)
  float meter = 0.0;
  if (uMeter > 0.001) {
    float am = atan(vUv.x, -vUv.y);                          // 0 at the top, going round clockwise
    am = am < 0.0 ? am + 6.28318 : am;
    float band = 1.0 - smoothstep(0.02, 0.045, abs(d - (uR + 0.2)));
    float filled = step(am, uMeter * 6.28318);
    meter = band * (0.22 + 0.78 * filled) * (uMeter >= 0.999 ? 0.8 + 0.45 * uBeat : 0.8) * step(0.5, uPips);
  }
  vec3 col = uCol * (ring + pip * 1.4 + meter * 1.25);
  float a = max(shadow, max(ring, max(pip, meter)));
  if (a < 0.003) discard;
  // shadow darkens (premultiplied: dark colour with alpha), ring/pip add light
  gl_FragColor = vec4(col, a);
}`;

export class GroundMarks {
  constructor(scene) {
    const make = (col, r, w, shadow, a, pips) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { uCol: { value: col }, uR: { value: r }, uW: { value: w }, uShadow: { value: shadow }, uA: { value: a }, uPips: { value: pips ? 1 : 0 }, uPipK0: { value: 1 }, uPipK1: { value: 1 }, uFacing: { value: 0 }, uFull: { value: 0 }, uBeat: { value: 0 }, uMeter: { value: 0 } } }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.position.y = 0.025; scene.add(m); return m;
    };
    this.you = make(new THREE.Color(2.2, 1.45, 0.45), 0.62, 0.018, 0.55, 0.55, true);
    this.her = make(new THREE.Color(2.4, 0.35, 1.0), 0.9, 0.016, 0.5, 0.35, false);
    this.you.scale.setScalar(1.3); this.her.scale.setScalar(1.6);
  }
  update(player, boss, dashCharges, dashCool, maxCharges, recharge, beatPulse = 0) {
    if (player) {
      this.you.position.set(player.x, 0.025, player.z);
      const u = this.you.material.uniforms;
      u.uFull.value = player.meter >= 1 && !player.solo ? 0.45 + 0.55 * beatPulse : 0;
      // YOU's ring ticks with the beat: the metronome at your feet
      u.uBeat.value = player.state === 'dead' ? 0 : beatPulse * beatPulse;
      u.uMeter.value = player.solo ? 0 : Math.min(1, player.meter || 0);
      u.uFacing.value = player.facing;
      u.uPipK0.value = dashCharges >= 1 ? 1 : 0; u.uPipK1.value = dashCharges >= 2 ? 1 : (dashCharges === 1 ? 1 - Math.max(0, dashCool) / recharge : 0);
      this.you.visible = player.state !== 'dead';
    }
    // her ring stands where she stands (up on something, it's up there with her); a track can fade it where it would
    // mislead (behind a counter it would show on the floor in front of it: she'd look to be inside it)
    if (boss) {
      this.her.position.set(boss.x, (boss.root ? boss.root.position.y : 0) + 0.025, boss.z);
      this.her.material.uniforms.uA.value = 0.35 * (boss.markK ?? 1);
      this.her.visible = boss.state !== 'finished' && boss.state !== 'gone' && !boss.intangible && (boss.markK ?? 1) > 0.01;
    }
  }
  dispose(scene) { scene.remove(this.you, this.her); }
}
