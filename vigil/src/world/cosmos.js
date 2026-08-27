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
  // Layered ion veils and dark occlusion lanes give the band real depth while
  // remaining entirely in VIGIL's cyan/violet language.
  for (let i = 0; i < 11; i++) {
    const x = rnd() * w, y = h * (0.47 + rnd() * 0.18);
    const rx = 65 + rnd() * 145, ry = 8 + rnd() * 19;
    g.save();
    g.translate(x, y);
    g.rotate((rnd() - 0.5) * 0.34);
    g.scale(rx / ry, 1);
    const veil = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    veil.addColorStop(0, i & 1 ? 'rgba(130,105,220,0.055)' : 'rgba(74,172,215,0.06)');
    veil.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = veil;
    g.fillRect(-ry, -ry, ry * 2, ry * 2);
    g.restore();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const y = h * (0.50 + rnd() * 0.13);
    g.strokeStyle = `rgba(2,3,10,${0.09 + rnd() * 0.07})`;
    g.lineWidth = 5 + rnd() * 12;
    g.beginPath();
    g.moveTo(-40, y);
    g.bezierCurveTo(w * 0.24, y + (rnd() - 0.5) * 75, w * 0.66, y + (rnd() - 0.5) * 80, w + 40, y + (rnd() - 0.5) * 26);
    g.stroke();
  }
  // Faint particulate band across the middle.
  for (let i = 0; i < 1500; i++) {
    const x = rnd() * w;
    const y = h * 0.55 + (rnd() + rnd() - 1) * h * 0.10;
    const violet = rnd() > 0.72;
    const r = violet ? 175 + rnd() * 45 : 145 + rnd() * 45;
    const gg = violet ? 155 + rnd() * 50 : 190 + rnd() * 45;
    const b = 215 + rnd() * 40;
    g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${0.018 + rnd() * 0.052})`;
    g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function panoramaMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTint: { value: new THREE.Color(0x7582a5) },
      uThreat: { value: 0 },
      uDawn: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying float vSkyY;
      void main() {
        vUv = uv;
        vSkyY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      varying float vSkyY;
      uniform sampler2D uMap;
      uniform vec3 uTint;
      uniform float uThreat;
      uniform float uDawn;
      void main() {
        vec3 c = texture2D(uMap, vUv).rgb * uTint;
        float latitude = 1.0 - smoothstep(0.0, 0.22, abs(vUv.y - 0.56));
        float filament = sin(vUv.x * 37.0 + sin(vUv.x * 9.0) * 2.4 + vUv.y * 11.0);
        filament = pow(max(0.0, filament), 5.0) * latitude;
        vec3 ion = mix(vec3(0.12, 0.46, 0.60), vec3(0.42, 0.25, 0.66),
                       0.5 + 0.5 * sin(vUv.x * 12.0));
        c += ion * filament * (0.018 + uThreat * 0.007);
        // The completed watch owns a real pre-dawn state. Keep the effect in
        // this existing sky pass: a cold horizon lift, not another translucent
        // dome or a fullscreen overlay that would tax fill-rate.
        float horizon = exp(-max(0.0, vSkyY) * 7.5)
                      * smoothstep(-0.18, 0.015, vSkyY);
        float highVeil = exp(-max(0.0, vSkyY) * 2.5)
                       * smoothstep(-0.26, 0.03, vSkyY);
        vec3 dawn = mix(vec3(0.10, 0.24, 0.39), vec3(0.58, 0.75, 0.83), horizon);
        c += dawn * uDawn * (horizon * 0.24 + highVeil * 0.035);
        gl_FragColor = vec4(min(c, vec3(0.84)), 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
  });
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

function terminatorPlanet(radius, dayHex, nightHex, rimHex, { banding = 0, seed = 0 } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: new THREE.Color(dayHex) },
      uNight: { value: new THREE.Color(nightHex) },
      uRim: { value: new THREE.Color(rimHex) },
      uPulse: { value: 0 },
      uBanding: { value: banding },
      uSeed: { value: seed },
    },
    vertexShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vObjN;
      void main() {
        vN = normalize(normalMatrix * normal);
        vObjN = normal;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vObjN;
      uniform vec3 uDay, uNight, uRim;
      uniform float uPulse, uBanding, uSeed;
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      float valueNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                   mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
      }
      float fbm(vec2 p) {
        float n = valueNoise(p) * 0.55;
        p = p * 2.03 + vec2(7.1, 3.7);
        n += valueNoise(p) * 0.28;
        p = p * 2.01 + vec2(2.3, 9.2);
        return n + valueNoise(p) * 0.17;
      }
      void main() {
        vec3 objN = normalize(vObjN);
        vec2 suv = vec2(atan(objN.z, objN.x) / 6.2831853 + 0.5,
                         asin(clamp(objN.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        float macro = fbm(suv * vec2(9.0, 6.0) + uSeed);
        float fine = valueNoise(suv * vec2(37.0, 23.0) + uSeed * 3.1);
        float belts = 0.5 + 0.34 * sin((suv.y + macro * 0.021) * 88.0)
                           + 0.16 * sin(suv.y * 173.0 + macro * 4.2);
        vec3 L = normalize(vec3(-0.72, 0.46, 0.51));
        float d = smoothstep(-0.16, 0.72, dot(vN, L) + (macro - 0.5) * 0.045);
        vec3 c = mix(uNight, uDay, d);
        float rocky = (macro - 0.5) * 0.15 + (fine - 0.5) * 0.055;
        float banded = (belts - 0.5) * 0.20 + (macro - 0.5) * 0.055;
        float relief = mix(rocky, banded, uBanding) * (0.34 + d * 0.66);
        c *= 1.0 + relief;
        float cloud = max(0.0, fine - 0.63) * uBanding * d;
        c += mix(uRim, uDay, 0.35) * cloud * 0.11;
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
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: 0.34 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      void main() {
        float d = length(vUv);
        float a = atan(vUv.y, vUv.x);
        float warp = sin(a * 5.0 + uTime * 0.11) * 0.012
                   + sin(a * 11.0 - uTime * 0.07) * 0.006;
        float ringR = 0.835 + warp;
        float rim = 1.0 - smoothstep(0.018, 0.085, abs(d - ringR));
        float halo = smoothstep(0.66, 0.78, d) * (1.0 - smoothstep(0.88, 0.995, d));
        float rayShape = 0.5 + 0.5 * sin(a * 7.0 - uTime * 0.09 + sin(a * 3.0) * 1.7);
        float rays = pow(rayShape, 9.0) * smoothstep(ringR - 0.015, 0.96, d);
        float plume = pow(max(0.0, sin(a * 3.0 + 0.8 + uTime * 0.045)), 15.0)
                    * smoothstep(0.79, 0.87, d);
        // The additive quad must reach zero at its own edge.
        float edgeFade = 1.0 - smoothstep(0.955, 1.0, d);
        float band = (rim * 0.76 + halo * 0.27 + rays * 0.12 + plume * 0.10) * edgeFade;
        gl_FragColor = vec4(uColor * (0.58 + rim * 0.18) * band, band * uOpacity);
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
    panoramaMaterial(panoTex),
  );
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

  const iceGiant = terminatorPlanet(48, 0x2e91a8, 0x071222, 0x79dfff, { banding: 1, seed: 2.13 });
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
  const eclipse = terminatorPlanet(35, 0x241a3a, 0x010207, 0x9d83ff, { banding: 0.12, seed: 7.4 });
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
      layers[0].material.uniforms.uTime.value = t;
      layers[1].material.uniforms.uTime.value = t;
      layers[2].material.uniforms.uTime.value = t;
      iceGiant.rotation.y += 0.004 * dt;
      eclipse.rotation.y -= 0.003 * dt;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.43);
      iceGiant.material.uniforms.uPulse.value = pulse;
      eclipse.material.uniforms.uPulse.value = pulse;
      corona.material.uniforms.uOpacity.value = (0.28 + threat * 0.08 + progress * 0.30);
      corona.material.uniforms.uTime.value = t;
      const p = clamp01(progress);
      const dawn = THREE.MathUtils.smoothstep(p, 0.94, 1.0);
      eclipse.position.set(315, 118 + p * 74, -465);
      corona.position.copy(eclipse.position);
      corona.lookAt(root.position.x, root.position.y, root.position.z);
      pano.material.uniforms.uThreat.value = threat;
      pano.material.uniforms.uDawn.value = dawn;
      pano.material.uniforms.uTint.value.setRGB(
        0.46 - threat * 0.035 + dawn * 0.10,
        0.51 - threat * 0.055 + dawn * 0.11,
        0.65 + threat * 0.015 + dawn * 0.08,
      );
      // Stars do not pop off; they wash out naturally under the new sky lift.
      layers[0].material.uniforms.uOpacity.value = 0.54 * (1 - dawn * 0.70);
      layers[1].material.uniforms.uOpacity.value = 0.62 * (1 - dawn * 0.73);
      layers[2].material.uniforms.uOpacity.value = 0.68 * (1 - dawn * 0.76);
      corona.material.uniforms.uColor.value.setRGB(
        0.66 + dawn * 0.18,
        0.55 + dawn * 0.27,
        1.00,
      );
      corona.material.uniforms.uOpacity.value = 0.28 + threat * 0.08 + p * 0.30 + dawn * 0.20;
    },
  };
}
