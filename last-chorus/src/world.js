// The night around the ribbon: sky, the town below, and the things that wake
// up when you ride past them in time.

import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function makeSky(scene, P) {
  const g = new THREE.SphereGeometry(4000, 48, 24);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(P.zenith) }, uHorizon: { value: new THREE.Color(P.horizon) },
      uGlow: { value: new THREE.Color(P.skyGlow) }, uGlowDir: { value: new THREE.Vector3(...P.glowDir).normalize() },
      uMoonDir: { value: new THREE.Vector3(...P.moonDir).normalize() }, uMoon: { value: new THREE.Color(P.moon) },
      uFlow: { value: 0.3 }, uTime: { value: 0 }, uPulse: { value: 0 }, uStars: { value: P.stars ?? 1 }, uSun: { value: P.sunSize ?? 0 },
      uCloud: { value: new THREE.Color(P.cloud ?? 0xffffff) }, uCloudK: { value: P.cloud !== undefined ? 1 : 0 }, uClouds: { value: P.clouds ?? 0.45 },
      // Heart of the Party: a heart where the moon would be, and in the bridge a heart monitor under it
      uHeart: { value: 0 }, uHeartDir: { value: new THREE.Vector3(0, 0.15, 1).normalize() }, uHeartCol: { value: new THREE.Color(P.heart ?? 0xff2a50) },
      uHeartBeat: { value: 0 }, uHeartSize: { value: 0.115 },
      uMon: { value: 0 }, uMonNow: { value: 0 }, uMonCol: { value: new THREE.Color(0x5cffa8) },
      uSpk: { value: Array.from({ length: 16 }, () => new THREE.Vector2(-99, 0)) },
    },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZenith, uHorizon, uGlow, uGlowDir, uMoonDir, uMoon, uCloud; uniform float uFlow, uTime, uPulse, uStars, uSun, uCloudK, uClouds;
      uniform float uHeart, uHeartBeat, uHeartSize, uMon, uMonNow; uniform vec3 uHeartDir, uHeartCol, uMonCol; uniform vec2 uSpk[16];
      varying vec3 vD;
      float dot2(vec2 v){ return dot(v, v); }
      // Inigo Quilez's heart: tip at the origin, lobes up to y ~ 1.1
      float sdHeart(vec2 p){
        p.x = abs(p.x);
        if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - 0.35355;
        return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
      }
      // one beat of an ECG (P, QRS, T) for each heartbeat you made
      float ecg(float t){
        float y = 0.0;
        for (int i = 0; i < 16; i++) {
          float dt = t - uSpk[i].x, a = uSpk[i].y;
          if (a <= 0.0 || dt < -0.3 || dt > 0.4) continue;
          y += a * (0.12 * exp(-dot2(vec2((dt + 0.16) / 0.035, 0.0))) - 0.14 * exp(-dot2(vec2((dt + 0.032) / 0.011, 0.0)))
                  + exp(-dot2(vec2(dt / 0.013, 0.0))) - 0.3 * exp(-dot2(vec2((dt - 0.03) / 0.011, 0.0)))
                  + 0.24 * exp(-dot2(vec2((dt - 0.21) / 0.05, 0.0))));
        }
        return y;
      }
      float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        vec3 d = normalize(vD);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.02, 0.62, h), 0.7));
        float gd = max(dot(d, uGlowDir), 0.0);
        col += uGlow * pow(gd, 9.0) * (0.35 + 0.65 * smoothstep(0.25, -0.03, h)) * 0.75;
        col += uGlow * pow(gd, 2.5) * 0.07 * smoothstep(0.35, 0.0, h);
        // a thin band of haze on the horizon
        col += uHorizon * 0.5 * exp(-abs(h) * 30.0);
        // stars
        vec3 sp = d * 420.0;
        float st = smoothstep(0.985, 1.0, h3(floor(sp))) * smoothstep(0.05, 0.35, h);
        float tw = 0.6 + 0.4 * sin(uTime * 3.0 + h3(floor(sp) + 3.1) * 40.0);
        col += vec3(0.85, 0.9, 1.0) * st * tw * 1.4 * uStars;
        // moon (or, at dusk, a low sun with a wide warm glow)
        float md = dot(d, normalize(uMoonDir));
        if (uSun > 0.0) {
          col += uMoon * smoothstep(1.0 - 0.0009 * uSun, 1.0 - 0.0006 * uSun, md) * 3.0;
          col += uMoon * pow(max(md, 0.0), 60.0) * 0.8 * uSun + uMoon * pow(max(md, 0.0), 6.0) * 0.25 * uSun;
        } else {
        col += uMoon * smoothstep(0.99955, 0.99975, md) * 1.25;
        col += uMoon * pow(max(md, 0.0), 400.0) * 0.35 + uMoon * pow(max(md,0.0), 30.0) * 0.03;
        }
        // soft clouds lit from below by the town glow
        float cl = n3(d * vec3(3.0, 9.0, 3.0) + vec3(uTime * 0.004, 0.0, 0.0)) * 0.6 + n3(d * vec3(7.0, 20.0, 7.0)) * 0.4;
        cl = smoothstep(0.55, 0.85, cl) * smoothstep(0.02, 0.12, h) * smoothstep(0.55, 0.2, h);
        // by day the clouds are white and lit by the sun on one side
        vec3 cc = mix(uHorizon * 0.9 + uGlow * 0.25 * gd, uCloud * (0.82 + 0.3 * pow(max(dot(d, normalize(uMoonDir)), 0.0), 3.0)), uCloudK);
        col = mix(col, cc, cl * uClouds);
        col *= 0.85 + 0.25 * uFlow;
        if (uHeart > 0.001 || uMon > 0.001) {
          vec3 hd = normalize(uHeartDir);
          vec3 rt = normalize(cross(hd, vec3(0.0, 1.0, 0.0)));
          vec3 upv = cross(rt, hd);
          float fd = dot(d, hd);
          vec2 q = vec2(dot(d, rt), dot(d, upv));
          if (fd > 0.6 && uHeart > 0.001) {
            float s = uHeartSize * (1.0 + 0.075 * uHeartBeat);
            vec2 hp = q / s * 0.9 + vec2(0.0, 0.55);
            float sd = sdHeart(hp);
            float aa = max(fwidth(sd), 1e-4) * 0.9;
            float inside = 1.0 - smoothstep(-aa, aa, sd);
            // candy: lighter toward the top, a gloss on the left lobe, a darker rim
            float shade = 0.6 + 0.5 * smoothstep(0.0, 1.05, hp.y) - 0.3 * smoothstep(-0.1, 0.0, sd);
            float gloss = exp(-dot2((hp - vec2(-0.27, 0.83)) * vec2(7.0, 11.0)));
            vec3 hc = uHeartCol * shade * (0.5 + 0.85 * uHeartBeat) + vec3(1.0, 0.86, 0.9) * gloss * 0.3;
            // the zipper down the middle: a seam, and teeth that catch the light
            float zy = hp.y, zx = abs(hp.x);
            float on = smoothstep(0.05, 0.08, zy) * (1.0 - smoothstep(0.94, 0.97, zy));
            float seam = (1.0 - smoothstep(0.006, 0.014, zx)) * on;
            float tooth = (1.0 - smoothstep(0.028, 0.04, zx)) * step(0.5, fract(zy * 26.0 + step(0.0, hp.x) * 0.5)) * on;
            hc = mix(hc, hc * 0.3, seam);
            hc += vec3(1.0, 0.86, 0.62) * tooth * 0.45 * (0.6 + 0.8 * uHeartBeat);
            col = mix(col, hc * 1.5, inside * uHeart);
            float od = max(sd, 0.0);
            col += uHeartCol * (exp(-od * 4.0) * 0.3 + exp(-od * 18.0) * 0.55) * (1.0 - inside) * uHeart * (0.35 + 1.1 * uHeartBeat);
          }
          // the monitor under it: a sweep writes your heartbeats left to right
          if (uMon > 0.001 && fd > 0.3) {
            float az = atan(q.x, fd);
            float el = q.y;
            float span = 1.05, w = 0.15;
            float base = -uHeartSize * 0.95;
            if (abs(az) < span * 0.5 && el > base - 0.09 && el < base + 0.08) {
              float sweep = span / w;
              float head = fract(uMonNow / sweep) * span - span * 0.5;
              float behind = head - az;
              if (behind < 0.0) behind += span;
              float tt = uMonNow - behind / w;
              float f = el - (base + 0.052 * ecg(tt));
              float g = length(vec2(dFdx(f), dFdy(f))) + 1e-5;
              float px = abs(f) / g;
              // newest at the head, older to its left, an erased gap just ahead of it
              float fade = exp(-behind / w / 6.0) * (1.0 - smoothstep(span - 0.1, span - 0.03, behind));
              float headDot = exp(-behind * behind / 0.0003);
              float edgeFade = smoothstep(span * 0.5, span * 0.5 - 0.06, abs(az));
              col += uMonCol * ((exp(-px * px * 0.35) * 1.4 + exp(-px * 0.25) * 0.18) * fade + headDot * exp(-px * px * 0.08) * 1.8) * edgeFade * uMon;
            }
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(g, m);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);
  return sky;
}

// the city on the horizon: a ring of silhouettes with a few lit windows,
// a shade darker than the glowing haze so the skyline stands against it
export function makeSkyline(scene, P) {
  const g = new THREE.CylinderGeometry(2600, 2600, 520, 160, 1, true);
  g.translate(0, 230, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { uSil: { value: new THREE.Color(P.skyline ?? 0x150a1e) }, uFog: { value: new THREE.Color(P.fog) }, uWin: { value: new THREE.Color(P.window) }, uAlt: { value: new THREE.Color(P.windowAlt) }, uTime: { value: 0 }, uFlow: { value: 0.3 }, uStyle: { value: 0 }, uHills: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSil, uFog, uWin, uAlt; uniform float uTime, uFlow, uStyle, uHills; varying vec3 vP;
      float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
      void main(){
        float ang = atan(vP.z, vP.x);
        float y = vP.y;                          // metres above ground, on a ring 2.6 km out
        if (uStyle > 0.5) {
          // far hills, two ranges, the near one furred with trees; a few lights in the valleys at dusk
          float a = ang * 6.0;
          float far = 90.0 + 170.0 * n1(a * 1.3 + 4.0) + 60.0 * n1(a * 4.1);
          float near = 40.0 + 110.0 * n1(a * 2.2 + 11.0) + 30.0 * n1(a * 9.0) + 7.0 * n1(ang * 900.0);
          if (y > max(far, near)) discard;
          float front = step(y, near);
          vec3 col = mix(mix(uFog, uSil, 0.35), uSil, front * (0.55 + 0.45 * smoothstep(near - 80.0, near, y)));
          col = mix(col, uFog, 0.25 * (1.0 - smoothstep(0.0, 60.0, y)));
          vec2 cell = vec2(ang * 1800.0, y / 3.0);
          float on = step(h2(floor(cell)), 0.02 * uHills) * step(y, 24.0) * front;
          col += uWin * on * 0.9;
          gl_FragColor = vec4(col, 1.0);
          return;
        }
        // two layers of buildings: tall sparse towers, low dense blocks
        float u1 = ang * 260.0; float c1 = floor(u1);
        float hTall = pow(h1(c1), 3.0) * 210.0 * step(0.55, h1(c1 + 7.0));
        float u2 = ang * 900.0; float c2 = floor(u2);
        float hLow = 18.0 + h1(c2) * 46.0 + 30.0 * pow(max(sin(ang * 3.0 + 1.0), 0.0), 3.0);
        float h = max(hTall, hLow);
        if (y > h) discard;
        float tall = step(hLow, hTall) ;
        vec2 cell = vec2(tall > 0.5 ? u1 * 6.0 : u2 * 2.0, y / 4.2);
        vec2 f = fract(cell);
        float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.75);
        float on = step(h2(floor(cell)), 0.10 + 0.08 * uFlow) * win;
        vec3 wc = mix(uWin, uAlt, step(0.75, h2(floor(cell) + 3.0)));
        vec3 col = mix(uFog, uSil, 0.55 + 0.25 * smoothstep(0.0, 120.0, y));
        col += wc * on * 0.35;
        // aircraft lights on the tall ones
        float top = step(h - 2.5, y) * tall * step(0.5, fract(uTime * 0.6 + h1(c1)));
        col += vec3(1.0, 0.1, 0.1) * top * 1.5;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -9;
  scene.add(mesh);
  return mesh;
}

// ground: dark fields and a grid of lit streets, fogged into the horizon
export function makeGround(scene, P) {
  const g = new THREE.PlaneGeometry(9000, 9000, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity },
      uGround: { value: new THREE.Color(P.ground) }, uStreet: { value: new THREE.Color(P.street) }, uFlow: { value: 0.3 },
      uHorizon: { value: new THREE.Color(P.horizon) }, uStyle: { value: 0 }, uSnow: { value: P.snowGround ?? 0 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCam, uFog, uGround, uStreet, uHorizon; uniform float uFogDensity, uFlow, uStyle, uSnow; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float line(float x, float w){ float f = fwidth(x); return 1.0 - smoothstep(w - f, w + f, abs(fract(x) - 0.5) * 2.0 - (1.0 - w)); }
      void main(){
        vec2 p = vW.xz;
        if (uStyle > 0.5) {
          // fields in patches, woods in dark clumps, lanes between them, lit farms at dusk
          vec2 q = mat2(0.9, -0.43, 0.43, 0.9) * p;
          vec2 fc = floor(q / vec2(140.0, 95.0));
          float kind = h2(fc);
          vec3 field = uGround * (0.8 + 0.5 * kind) * mix(vec3(1.0), vec3(1.25, 1.1, 0.6), step(0.62, kind));
          float wood = smoothstep(0.55, 0.7, n2(p / 160.0) * 0.7 + n2(p / 37.0) * 0.3);
          vec3 col = mix(field, uGround * vec3(0.38, 0.48, 0.32), wood);
          vec2 e = abs(fract(q / vec2(140.0, 95.0)) - 0.5);
          float lane = smoothstep(0.012, 0.0, 0.5 - max(e.x, e.y));
          col = mix(col, uStreet * 0.3 + uGround * 0.4, lane * 0.6);
          vec2 fp = fract(q / 70.0) - 0.5;
          col += uStreet * smoothstep(0.03, 0.0, length(fp)) * step(0.8, h2(floor(q / 70.0))) * uFlow * 2.0;
          float d = length(uCam - vW);
          float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
          return;
        }
        vec3 col = uGround * (0.75 + 0.25 * h2(floor(p / 37.0)));
        // street grid: two scales, rotated a little so it doesn't line up with anything
        vec2 q = mat2(0.96, -0.28, 0.28, 0.96) * p;
        vec2 cell = q / 92.0;
        vec2 f = abs(fract(cell) - 0.5);
        float street = smoothstep(0.035, 0.0, min(0.5 - f.x, 0.5 - f.y) - 0.0);
        float lamps = 0.0;
        vec2 lp = fract(q / 23.0) - 0.5;
        lamps = smoothstep(0.08, 0.0, length(lp)) * street * (1.0 - smoothstep(0.03, 0.07, length(fwidth(q / 23.0))));
        col = mix(col, uStreet * 0.35, street * 0.8);
        col += uStreet * lamps * 3.5;
        col = mix(col, vec3(0.72, 0.77, 0.86) * (0.85 + 0.2 * h2(floor(p / 5.0))), uSnow * 0.7 * (1.0 - street * 0.6));
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        col = mix(col, uFog, clamp(fog, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
    // (pushed back in depth: a room's floor, a road or a lawn lying at the same height fought it,
    // the two taking turns frame by frame, a flicker beside the road in many songs)
    polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8,
  });
  const ground = new THREE.Mesh(g, m);
  ground.frustumCulled = false;
  scene.add(ground);
  return ground;
}

// Scenery attached to song time along the course: houses with windows that light
// when you pass them riding well, trees, street lamps.
export class Town {
  constructor(scene, course, P, seed = 7) {
    this.course = course;
    this.P = P;
    const R = mulberry32(seed);
    this.items = [];   // {t, x, kind, s (scale), r (rot), wake, h}
    const dur = course.duration;
    for (let t = -3; t < dur + 8; t += 0.11) {
      for (const side of [-1, 1]) {
        if (R() < 0.35) continue;
        const kindRoll = R();
        const lateral = side * (24 + Math.pow(R(), 1.4) * 170);
        let kind = 0;
        if (kindRoll < 0.55) kind = 0;          // house
        else if (kindRoll < 0.72) kind = 1;     // block
        else kind = 2;                           // tree clump
        const big = Math.abs(lateral) > 95 && R() < 0.45;
        if (kind === 1 && Math.abs(lateral) < 45) kind = 0;
        this.items.push({ t: t + R() * 0.1, x: lateral, kind: big && kind === 1 ? 3 : kind, s: 0.75 + R() * 0.7, r: R() * 6.28, wake: 0, seed: R(), passed: false });
      }
      if (R() < 0.3) this.items.push({ t, x: (R() < 0.5 ? -1 : 1) * (10 + R() * 4), kind: 4, s: 1, r: 0, wake: 0, seed: R(), passed: false });
    }
    this.items.sort((a, b) => a.t - b.t);

    // house: box + gable roof
    const house = new THREE.BoxGeometry(10, 7, 9); house.translate(0, 3.5, 0);
    const roof = new THREE.CylinderGeometry(0.01, 7.6, 4, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.9); roof.translate(0, 9, 0);
    this.houseMat = windowMaterial(P, null, [2.4, 2.9]);
    this.roofMat = new THREE.MeshStandardMaterial({ color: P.roof, roughness: 0.8, metalness: 0.0 });
    const block = new THREE.BoxGeometry(14, 26, 14); block.translate(0, 13, 0);
    const tower = new THREE.BoxGeometry(18, 60, 18); tower.translate(0, 30, 0);
    this.blockMat = windowMaterial(P, null, [2.6, 3.1]);
    this.towerMat = windowMaterial(P, null, [2.8, 3.3]);
    const tree = new THREE.ConeGeometry(4.2, 12, 7); tree.translate(0, 8, 0);
    const tree2 = new THREE.ConeGeometry(3.2, 9, 7); tree2.translate(3.5, 6, 2);
    this.treeMat = new THREE.MeshStandardMaterial({ color: P.tree, roughness: 0.9 });
    const lampPole = new THREE.CylinderGeometry(0.12, 0.16, 9, 6); lampPole.translate(0, 4.5, 0);
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0x1a1720, roughness: 0.6 });
    const MAXI = 900;
    const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, MAXI); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; scene.add(m); return m; };
    this.meshes = {
      house: mk(house, this.houseMat), roof: mk(roof, this.roofMat), block: mk(block, this.blockMat), tower: mk(tower, this.towerMat),
      tree: mk(tree, this.treeMat), tree2: mk(tree2, this.treeMat), lamp: mk(lampPole, this.lampMat),
    };
    for (const k of ['house', 'block', 'tower']) {
      const m = this.meshes[k];
      m.geometry.setAttribute('aWake', new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 2), 2).setUsage(THREE.DynamicDrawUsage));
    }
    // lamp heads: additive glowing sprites
    const lg = new THREE.PlaneGeometry(1, 1);
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(P.lamp) } },
      vertexShader: `attribute float aWake; varying vec2 vUv; varying float vW; void main(){ vUv = uv; vW = aWake;
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float s = length(instanceMatrix[0].xyz);
        c.xy += position.xy * s;
        gl_Position = projectionMatrix * c; }`,
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying float vW; void main(){ float d = length(vUv-0.5)*2.0; float a = exp(-d*d*5.0) + 0.6*exp(-d*d*60.0); gl_FragColor = vec4(uColor * a * (0.25 + 1.2*vW), 1.0); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    this.glow = new THREE.InstancedMesh(lg, this.glowMat, MAXI);
    this.glow.geometry.setAttribute('aWake', new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1).setUsage(THREE.DynamicDrawUsage));
    this.glow.count = 0; this.glow.frustumCulled = false; scene.add(this.glow);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
    this._lo = 0;
  }

  update(track, rider, dt) {
    const t = rider.t;
    const items = this.items;
    while (this._lo < items.length && items[this._lo].t < t - 4) this._lo++;
    const counts = { house: 0, roof: 0, block: 0, tower: 0, tree: 0, tree2: 0, lamp: 0, glow: 0 };
    const M = this.meshes;
    const wakeAttr = { house: M.house.geometry.attributes.aWake, block: M.block.geometry.attributes.aWake, tower: M.tower.geometry.attributes.aWake };
    const gw = this.glow.geometry.attributes.aWake;
    const p = this._p, m = this._m, q = this._q, sc = this._s, e = this._e;
    for (let i = this._lo; i < items.length; i++) {
      const it = items[i];
      if (it.t > t + 42) break;
      // waking: when you pass something in flow it lights; the better you ride the further it spreads
      if (!it.passed && it.t < t) { it.passed = true; it.target = clamp((rider.flow - 0.25) / 0.6, 0, 1) * clamp(1.25 - Math.abs(it.x) / 160, 0.2, 1); }
      if (it.passed) it.wake += ((it.target ?? 0) - it.wake) * Math.min(1, dt * (1.5 + it.seed * 2));
      track.at(it.t, 0, 0, p);
      // drop to the ground at a lateral offset (ignore bank, keep level)
      const yaw = this.course.sample(it.t).yaw;
      p.x += -Math.cos(yaw) * it.x; p.z += Math.sin(yaw) * it.x; p.y = 0;
      e.set(0, it.r, 0); q.setFromEuler(e);
      const add = (key, s, dy = 0) => {
        const mesh = M[key]; if (counts[key] >= mesh.instanceMatrix.count) return -1;
        sc.set(s, s * (key === 'block' || key === 'tower' ? (0.7 + it.seed * 0.8) : 1), s);
        m.compose(p.set(p.x, p.y + dy, p.z), q, sc);
        mesh.setMatrixAt(counts[key], m);
        return counts[key]++;
      };
      if (it.kind === 0) {
        const k = add('house', it.s); add('roof', it.s);
        if (k >= 0) wakeAttr.house.setXY(k, it.wake, it.seed);
      } else if (it.kind === 1) {
        const k = add('block', it.s); if (k >= 0) wakeAttr.block.setXY(k, it.wake, it.seed);
      } else if (it.kind === 3) {
        const k = add('tower', it.s); if (k >= 0) wakeAttr.tower.setXY(k, it.wake, it.seed);
      } else if (it.kind === 2) {
        add('tree', it.s); if (it.seed > 0.4) add('tree2', it.s * 0.9);
      } else if (it.kind === 4) {
        add('lamp', 1);
        // the lamp head: a glow sprite on top
        if (counts.glow < this.glow.instanceMatrix.count) {
          sc.set(5, 5, 5); m.compose(p.set(p.x, 9.2, p.z), q.identity(), sc);
          this.glow.setMatrixAt(counts.glow, m); gw.setX(counts.glow, 0.35 + 0.65 * it.wake); counts.glow++;
        }
      }
    }
    for (const k in M) { M[k].count = counts[k]; M[k].instanceMatrix.needsUpdate = true; }
    for (const k in wakeAttr) wakeAttr[k].needsUpdate = true;
    this.glow.count = counts.glow; this.glow.instanceMatrix.needsUpdate = true; gw.needsUpdate = true;
  }
}

function makeWindowTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  // 8x8 windows, each pixel channel: R = window mask, G = random id
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const id = Math.floor(Math.random() * 255);
    g.fillStyle = `rgb(255,${id},0)`;
    g.fillRect(x * 32 + 7, y * 32 + 6, 18, 20);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// walls whose windows wake: unlit windows are dark glass; a woken building's
// windows come on one by one in warm and candy colours
function windowMaterial(P, tex, cell) {
  // windows laid out in metres on each wall (object space), lit one by one as
  // the building wakes. cell = [window spacing across, floor height]
  const m = new THREE.MeshStandardMaterial({ color: P.wall, roughness: 0.85, metalness: 0.0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWarm = { value: new THREE.Color(P.window) };
    sh.uniforms.uCandy = { value: new THREE.Color(P.windowAlt) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aWake; varying vec2 vWake; varying vec2 vWin; varying float vUp; varying float vFace;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWake = aWake; vUp = normal.y;
        float sx = abs(normal.x) > 0.5 ? position.z : position.x;
        vFace = abs(normal.x) > 0.5 ? (normal.x > 0.0 ? 1.0 : 2.0) : (normal.z > 0.0 ? 3.0 : 4.0);
        vWin = vec2(sx / ${cell[0].toFixed(2)}, (position.y - 1.2) / ${cell[1].toFixed(2)});`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uWarm, uCandy; varying vec2 vWake; varying vec2 vWin; varying float vUp; varying float vFace;\nfloat wh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cellId = floor(vWin);
        vec2 f = fract(vWin);
        float mask = step(0.22, f.x) * step(f.x, 0.78) * step(0.18, f.y) * step(f.y, 0.72) * step(0.0, vWin.y) * step(abs(vUp), 0.5);
        float id = wh(cellId + vec2(vFace * 13.1, vWake.y * 91.7));
        float on = step(id, 0.08 + 0.7 * vWake.x) * mask;
        vec3 wc = mix(uWarm, uCandy, step(0.82, wh(cellId * 1.7 + vWake.y)));
        float flick = 0.85 + 0.15 * step(0.5, wh(cellId + 3.3));
        totalEmissiveRadiance += wc * on * flick * (0.5 + 1.5 * vWake.x);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.014, 0.025), mask * (1.0 - on) * 0.8);`);
  };
  return m;
}
