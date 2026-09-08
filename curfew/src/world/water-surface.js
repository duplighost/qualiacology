// Opaque night water. It reflects the actual procedural sky shader and its live uniforms:
// moon, moving clouds, ridges and the clock's colours cannot drift from the sky overhead.
// Nearby objects are not planar-reflected; that would redraw the forest for every pool.
// One shared material, allocated before shader warmup, for every streamed wet surface.
import * as THREE from 'three';

function replaceRequired(source, anchor, replacement) {
  if (!source.includes(anchor)) throw new Error('water: sky shader contract changed: ' + anchor);
  return source.replace(anchor, replacement);
}

export function createWaterMaterial(sky) {
  const dome = sky && sky.dome && sky.dome.material;
  if (!dome) throw new Error('water requires the sky material before wilds init');
  let fragment = replaceRequired(dome.fragmentShader, 'varying vec3 vDir;', /* glsl */`
    varying vec3 vWaterWorld;
    varying float vWaterDepth;
    #include <fog_pars_fragment>
  `);
  fragment = replaceRequired(fragment, 'vec3 d = normalize(vDir);', /* glsl */`
    vec2 p = vWaterWorld.xz;
    vec3 eye = normalize(cameraPosition - vWaterWorld);
    float depth = clamp(vWaterDepth, 0.0, 1.0);
    // Metre-scale crossing swells carry fine wind ripples. Slopes are analytical, so the
    // reflection keeps moving even when a near-bank triangle fills the entire screen.
    float swellA = dot(p, vec2(0.81, 0.59)) * 2.2 + uTime * 0.73;
    float swellB = dot(p, vec2(-0.34, 0.94)) * 3.7 - uTime * 0.52;
    float wind = dot(p, vec2(0.95, 0.31)) * 18.0 + sin(swellB) * 0.7 - uTime * 1.6;
    vec2 slope = vec2(0.81, 0.59) * cos(swellA) * 0.065
      + vec2(-0.34, 0.94) * cos(swellB) * 0.028
      + vec2(0.95, 0.31) * cos(wind) * 0.012;
    vec3 waterNormal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 d = normalize(reflect(-eye, waterNormal));
  `);
  fragment = replaceRequired(fragment, 'gl_FragColor = vec4(col, 1.0);', /* glsl */`
    // Dark submerged silt at the edge; increasingly cold sky reflection toward the far
    // bank. The surface always writes opaque depth, so approach never fades it into mist.
    float fresnel = 0.18 + 0.76 * pow(1.0 - max(0.0, dot(eye, waterNormal)), 2.7);
    // Reflection loses energy. A blue-channel boost made the far bank look electrically
    // blue against the same night sky; retain its colour with neutral attenuation.
    vec3 reflectedSky = col * 0.82;
    float silt = 0.45 + 0.55 * vn2(p * 3.1 + vec2(sin(swellA), cos(swellB)) * 0.06);
    vec3 bed = uHorizon * vec3(0.10, 0.13, 0.12) * silt;
    col = mix(bed, reflectedSky, fresnel * mix(0.52, 1.0, smoothstep(0.0, 0.24, depth)));
    // Broken capillary lines describe a shore, rather than painted glowing bars.
    float shore = (1.0 - smoothstep(0.025, 0.090, depth)) * smoothstep(0.0, 0.016, depth);
    float broken = smoothstep(0.53, 0.79, vn2(p * 2.6 + uTime * vec2(0.045, -0.028)));
    col += uHorizon * vec3(0.26, 0.37, 0.42) * shore * broken;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  `);
  const material = new THREE.ShaderMaterial({
    name: 'night-water',
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...dome.uniforms },
    vertexShader: /* glsl */`
      attribute float waterDepth;
      varying vec3 vWaterWorld;
      varying float vWaterDepth;
      #include <fog_pars_vertex>
      void main() {
        vWaterWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vWaterDepth = waterDepth;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
    fog: true,
    toneMapped: false,
  });
  return material;
}

/** The distinct surface geometry is also the reliable target for the water visual probe. */
export function prepareWaterGeometry(geometry, site, poolRX, poolRZ, pondRX, pondRZ) {
  const p = geometry.attributes.position;
  const depth = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let d;
    if (site.variant === 'pool' || site.variant === 'pond') {
      const rx = site.variant === 'pool' ? poolRX : pondRX;
      const rz = site.variant === 'pool' ? poolRZ : pondRZ;
      const a = Math.atan2(z / rz, x / rx);
      const edge = site.variant === 'pool'
        ? 1 + 0.075 * Math.sin(a * 3 + 0.6) + 0.045 * Math.sin(a * 7 - 0.4)
        : 1 + 0.055 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 5 - 0.3);
      d = 1 - Math.hypot(x / rx, z / rz) / edge;
    } else if (site.variant === 'ford') {
      const t = z / 72 + 0.5;
      const centre = Math.sin(t * 8 - 1.4) * 0.82;
      const width = 8.4 + 0.70 * Math.sin(t * Math.PI * 4 + 0.7);
      d = 1 - Math.abs(x - centre) * 2 / width;
    } else {
      const t = (z + 8.2) / 16.4;
      const centre = Math.sin(t * 7.5) * 1.12;
      const width = 1.55 + 0.24 * Math.sin(t * Math.PI * 4 + 0.4);
      d = 1 - Math.abs(x - centre) * 2 / width;
    }
    depth[i] = Math.max(0, Math.min(1, d));
  }
  geometry.setAttribute('waterDepth', new THREE.BufferAttribute(depth, 1));
  return geometry;
}
