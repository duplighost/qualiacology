// The planetarium sky — Relay//Eclipse's signature, rebuilt from its recipe.
// A camera-following group, NOT a cubemap: BackSide panorama sphere, three
// counter-rotating star layers, two terminator-shaded planets (one eclipsed,
// with an additive corona). Every backdrop material is depthWrite:false,
// toneMapped:false, fog:false with hard output caps — so ACES + bloom can
// exist without the night sky ever blowing out. The eclipse sits LOW (~12°)
// so the relay tower silhouettes against it, and it advances with the rounds.

import * as THREE from 'three';
import { TAU, clamp01 } from '../engine/math.js';

const SKY_RADIUS = 610;

function panoramaTexture() {
  const w = 1024, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#05060f');
  grad.addColorStop(0.42, '#0a0e1f');
  grad.addColorStop(0.58, '#141b33');
  grad.addColorStop(0.66, '#1c2742');
  grad.addColorStop(0.74, '#10142a');
  grad.addColorStop(1.0, '#04050c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  let s = 77031;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  // nebula blooms in the two-hue language only
  const blobs = [
    [0.16, 0.52, 120, 'rgba(93,180,220,0.10)'], [0.22, 0.58, 70, 'rgba(120,200,235,0.08)'],
    [0.62, 0.55, 150, 'rgba(140,110,220,0.10)'], [0.70, 0.48, 80, 'rgba(168,124,255,0.07)'],
    [0.88, 0.60, 100, 'rgba(80,140,200,0.07)'], [0.42, 0.62, 90, 'rgba(110,150,230,0.06)'],
  ];
  for (const [bx, by, br, col] of blobs) {
    const x = bx * w, y = by * h;
    const grd = g.createRadialGradient(x, y, 0, x, y, br);
    grd.addColorStop(0, col);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - br, y - br, br * 2, br * 2);
  }
  // faint dust band across the middle
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w;
    const y = h * 0.55 + (rnd() + rnd() - 1) * h * 0.10;
    g.fillStyle = `rgba(${170 + rnd() * 50 | 0},${180 + rnd() * 50 | 0},${210 + rnd() * 45 | 0},${0.02 + rnd() * 0.05})`;
    g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function makeStars(rng, count, rMin, rMax, sizeScale, opacity) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const attr = new Float32Array(count * 2); // size, phase
  const cyan = new THREE.Color(0x9de8ff), white = new THREE.Color(0xe7efff), violet = new THREE.Color(0xb9a7ff);
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // uniform on the upper-biased sphere
    const u = rng.next(), v = rng.next();
    const theta = u * TAU;
    const phi = Math.acos(1 - 1.35 * v); // biased above the horizon
    const r = rMin + (rMax - rMin) * rng.next();
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) * 0.9 + 12;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const t = rng.next();
    if (t < 0.28) tmp.copy(cyan).lerp(white, rng.next());
    else tmp.copy(white).lerp(violet, rng.next());
    const b = 0.72 + rng.next() * 0.22;
    col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
    attr[i * 2] = sizeScale * (0.72 + Math.pow(rng.next(), 5) * 2.15);
    attr[i * 2 + 1] = rng.next() * TAU;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aStar', new THREE.BufferAttribute(attr, 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */`
      attribute vec2 aStar;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      void main() {
        vColor = color;
        vTwinkle = 0.88 + 0.12 * sin(uTime * 0.72 + aStar.y);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float ps = aStar.x * clamp(430.0 / max(120.0, -mv.z), 0.58, 2.2);
        gl_PointSize = clamp(ps, 0.75, 4.6);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p) * 2.0;
        float core = 1.0 - smoothstep(0.0, 0.58, r);
        float halo = pow(max(0.0, 1.0 - r), 3.0) * 0.34;
        float a = min((core + halo) * uOpacity * vTwinkle, 0.92);
        vec3 c = min(vColor, vec3(0.94));
        gl_FragColor = vec4(c * a, a);
      }`,
    vertexColors: true, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

function terminatorPlanet(radius, dayHex, nightHex, rimHex) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: new THREE.Color(dayHex) },
      uNight: { value: new THREE.Color(nightHex) },
      uRim: { value: new THREE.Color(rimHex) },
      uPulse: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vV;
      uniform vec3 uDay, uNight, uRim;
      uniform float uPulse;
      void main() {
        vec3 L = normalize(vec3(-0.72, 0.46, 0.51));
        float d = smoothstep(-0.16, 0.72, dot(vN, L));
        vec3 c = mix(uNight, uDay, d);
        float fr = pow(1.0 - max(0.0, dot(vN, vV)), 3.4);
        c += uRim * fr * (0.34 + uPulse * 0.07);
        gl_FragColor = vec4(min(c, vec3(0.82)), 1.0);
      }`,
    depthWrite: false, toneMapped: false, fog: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), mat);
}

function makeCorona(radius, colorHex) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(colorHex) }, uOpacity: { value: 0.34 } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float d = length(vUv);
        float band = 1.0 - smoothstep(0.02, 0.18, abs(d - 0.86));
        // the additive quad must reach zero at its own edge
        band *= 1.0 - smoothstep(0.92, 1.0, d);
        gl_FragColor = vec4(uColor * 0.72 * band, band * uOpacity);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    toneMapped: false, fog: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.84, radius * 2.84), mat);
  return mesh;
}

export function createCosmos(rng) {
  const root = new THREE.Group();
  root.name = 'cosmos';

  const panoTex = panoramaTexture();
  panoTex.offset.x = 0.19;
  const pano = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, 48, 32),
    new THREE.MeshBasicMaterial({ map: panoTex, side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false, fog: false }),
  );
  pano.material.color.setHex(0x7582a5);
  pano.renderOrder = -1000;
  pano.rotation.y = -0.34;
  pano.frustumCulled = false;
  root.add(pano);

  const layers = [
    makeStars(rng.fork('stars0'), 560, 235, 330, 1.35, 0.54),
    makeStars(rng.fork('stars1'), 260, 350, 455, 1.75, 0.62),
    makeStars(rng.fork('stars2'), 90, 470, 565, 2.15, 0.68),
  ];
  for (const l of layers) { l.renderOrder = -890; root.add(l); }

  const iceGiant = terminatorPlanet(48, 0x2e91a8, 0x071222, 0x79dfff);
  iceGiant.position.set(-360, 146, -405);
  iceGiant.rotation.z = -0.24;
  iceGiant.renderOrder = -896;
  root.add(iceGiant);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(61, 83, 64),
    new THREE.MeshBasicMaterial({ color: 0x77cbe5, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false }),
  );
  ring.rotation.set(1.19, 0.08, -0.47);
  ring.position.copy(iceGiant.position);
  ring.renderOrder = -895;
  root.add(ring);

  // THE ECLIPSE — low on the horizon so the relay silhouettes against it.
  const eclipse = terminatorPlanet(35, 0x241a3a, 0x010207, 0x9d83ff);
  eclipse.position.set(315, 118, -465);
  eclipse.renderOrder = -897;
  root.add(eclipse);
  const corona = makeCorona(35, 0xa88cff);
  corona.position.copy(eclipse.position);
  corona.lookAt(0, 0, 0);
  corona.renderOrder = -895;
  root.add(corona);

  let t = 0;
  return {
    root,
    /**
     * @param anchor camera position (the sky follows it — infinitely distant)
     * @param threat 0-1 master atmosphere dial
     * @param progress 0-1 run progress: the eclipse advances across the run —
     *        the corona brightens and the body climbs slightly. The sky IS the
     *        wave counter.
     */
    update(dt, anchor, threat, progress) {
      t += dt;
      root.position.copy(anchor);
      layers[0].rotation.y += 0.0019 * dt;
      layers[1].rotation.y -= 0.0011 * dt;
      layers[1].rotation.x = Math.sin(t * 0.007) * 0.006;
      layers[2].rotation.y += 0.00055 * dt;
      iceGiant.rotation.y += 0.004 * dt;
      eclipse.rotation.y -= 0.003 * dt;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.43);
      iceGiant.material.uniforms.uPulse.value = pulse;
      eclipse.material.uniforms.uPulse.value = pulse;
      corona.material.uniforms.uOpacity.value = (0.28 + threat * 0.08 + progress * 0.30);
      const p = clamp01(progress);
      eclipse.position.set(315, 118 + p * 74, -465);
      corona.position.copy(eclipse.position);
      corona.lookAt(root.position.x, root.position.y, root.position.z);
      pano.material.color.setRGB(
        0.46 - threat * 0.035,
        0.51 - threat * 0.055,
        0.65 + threat * 0.015,
      );
    },
  };
}
