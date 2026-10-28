// The bay's water: starchy pasta water with islands of pastina floating on it.
// From above: sky reflection, sun glint, the rafts. From below: the bright window overhead,
// mirrored murk outside it, the rafts as dark shapes. Everything under the surface is fogged
// by the pasta materials themselves (see WATER_FOG in materials.js), so this is only a skin.
import * as THREE from 'three';
import { G, WATER_GLSL } from './materials.js';
import { mulberry32, clamp, TAU } from './util.js';

export class Water {
  constructor(scene, T, { y = 0, sun }) {
    this.y = y;
    const tex = T.pastina.clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1); tex.needsUpdate = true;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      uniforms: {
        uTime: G.uTime, uY: { value: y }, uSun: { value: sun.clone() }, uPastina: { value: tex },
        uWaterCol: G.uWaterCol, uWaterView: G.uWaterView, uWaterLight: G.uWaterLight,
        uFogCol: { value: new THREE.Color() }, uFogNear: { value: 130 }, uFogFar: { value: 950 },
      },
      vertexShader: /* glsl */`
        varying vec3 vW;
        void main() { vec4 w = modelMatrix * vec4( position, 1.0 ); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uY, uFogNear, uFogFar;
        uniform vec3 uSun, uWaterCol, uWaterView, uWaterLight, uFogCol;
        uniform sampler2D uPastina;
        varying vec3 vW;
        ${WATER_GLSL}
        vec3 skyCol( vec3 d ) {
          float h = d.y;
          vec3 zen = vec3( 0.16, 0.33, 0.72 ) * 1.15, hor = vec3( 1.0, 0.8, 0.58 ) * 1.1, low = vec3( 0.95, 0.74, 0.5 ) * 1.1;
          vec3 c = h > 0.0 ? mix( hor, zen, pow( clamp( h, 0.0, 1.0 ), 0.38 ) ) : mix( hor, low, clamp( -h * 4.0, 0.0, 1.0 ) );
          float s = max( dot( d, uSun ), 0.0 );
          return c + vec3( 1.0, 0.82, 0.55 ) * ( pow( s, 7.0 ) * 0.55 + pow( s, 60.0 ) * 1.4 );
        }
        // calm bay: a few long swells and a fine chop, as surface slopes
        vec3 waveN( vec2 p, float t ) {
          vec2 g = vec2( 0.0 );
          g += vec2( 0.8, 0.6 ) * 0.035 * cos( dot( vec2( 0.8, 0.6 ), p ) * 0.55 + t * 0.9 );
          g += vec2( -0.5, 0.86 ) * 0.03 * cos( dot( vec2( -0.5, 0.86 ), p ) * 0.9 + t * 1.3 );
          g += vec2( 0.95, -0.3 ) * 0.022 * cos( dot( vec2( 0.95, -0.3 ), p ) * 1.7 + t * 1.9 );
          g += vec2( 0.2, 0.98 ) * 0.016 * cos( dot( vec2( 0.2, 0.98 ), p ) * 3.1 + t * 2.6 );
          vec2 q = p * 1.3 + vec2( t * 0.3, -t * 0.22 );
          float e = 0.07;
          float n0 = pwVN( q ), nx = pwVN( q + vec2( e, 0.0 ) ), nz = pwVN( q + vec2( 0.0, e ) );
          g += vec2( nx - n0, nz - n0 ) / e * 0.018;
          return normalize( vec3( -g.x, 1.0, -g.y ) );
        }
        void main() {
          vec3 C = cameraPosition;
          vec3 V = normalize( C - vW );
          float t = uTime;
          vec3 N = waveN( vW.xz, t );
          float rn = pastaRaftN( vW.xz, t );
          vec3 grain = texture2D( uPastina, vW.xz / 1.25 + vec2( t * 0.006, t * 0.0035 ) * 20.0 ).rgb;
          float lum = dot( grain, vec3( 0.33 ) );
          float raft = smoothstep( 0.6, 0.64, rn + ( lum - 0.55 ) * 0.07 );
          float dist = length( C - vW );
          vec3 col; float a;
          if ( C.y >= uY ) {
            // starchy water: less mirror, more milk
            float fres = ( 0.02 + 0.98 * pow( 1.0 - max( dot( N, V ), 0.0 ), 5.0 ) ) * 0.32;
            vec3 R = reflect( -V, N );
            R.y = abs( R.y );
            vec3 refl = mix( skyCol( R ), vec3( 1.0, 0.86, 0.58 ), 0.6 ) * vec3( 1.0, 0.93, 0.78 );
            float glint = pow( max( dot( R, uSun ), 0.0 ), 900.0 ) * 50.0 + pow( max( dot( R, uSun ), 0.0 ), 90.0 ) * 0.5;
            col = refl * fres + vec3( 1.0, 0.86, 0.62 ) * glint;
            a = clamp( fres + glint, 0.0, 1.0 );
            // a thin milky skin: starch catches the light right at the surface
            col += vec3( 0.78, 0.6, 0.26 ) * 0.85 * ( 1.0 - fres ); a = max( a, 0.42 );
            // pastina rafts: lit like the dry pastina sea
            float nl = max( dot( vec3( N.x * 0.3, 1.0, N.z * 0.3 ), uSun ), 0.0 );
            vec3 pc = grain * ( vec3( 1.0, 0.93, 0.78 ) * ( 0.35 + 1.25 * nl ) + skyCol( vec3( 0.0, 1.0, 0.0 ) ) * 0.25 );
            col = mix( col, pc, raft ); a = mix( a, 1.0, raft );
            // haze, same as the scene fog
            float f = smoothstep( uFogNear, uFogFar, dist );
            col = mix( col, uFogCol, f ); a = mix( a, 1.0, f );
          } else {
            // under the surface looking up: the sky only shows inside the window (critical angle ~48.6 deg)
            vec3 up = normalize( vec3( N.x * 1.6, 1.0, N.z * 1.6 ) );
            float cosI = dot( -V, up );
            float win = smoothstep( 0.63, 0.71, cosI );
            vec3 rd = refract( -V, -up, 1.0 / 1.333 );
            vec3 sky = length( rd ) > 0.0 ? skyCol( normalize( vec3( rd.x, abs( rd.y ), rd.z ) ) ) : vec3( 0.0 );
            float dC = uY - C.y;
            vec3 scat = uWaterCol * exp( -uWaterLight * dC * 0.34 );
            col = mix( scat * 0.8, sky * 0.95, win );
            a = 1.0 - win * 0.82;
            // pastina rafts from below: shadows against the light
            col *= mix( 1.0, 0.16, raft ); a = mix( a, 1.0, raft );
            vec3 tr = exp( -uWaterView * dist );
            col = col * tr + scat * ( 1.0 - tr ); a = mix( 1.0, a, tr.g );
          }
          gl_FragColor = vec4( col, a );
        }`,
    });
    const geo = new THREE.PlaneGeometry(2400, 2400, 1, 1); geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.y = y; this.mesh.frustumCulled = false; this.mesh.renderOrder = 10;
    scene.add(this.mesh);

    // tiny pasta drifting in the water around you: stelline and orzo, shown only near the camera
    this.motes = new Motes(scene);
    this.bubbles = new Bubbles(scene, y);
  }
  // camera-dependent bits: the scene fog, sort order, motes
  update(dt, time, camera, scene) {
    const under = camera.position.y < this.y;
    this.mat.uniforms.uFogCol.value.copy(scene.fog.color);
    this.mat.uniforms.uFogNear.value = this.fogNear ?? 130; this.mat.uniforms.uFogFar.value = this.fogFar ?? 950;
    this.mesh.renderOrder = under ? 5 : 20;
    this.bubbles.mesh.renderOrder = under ? 20 : 5;
    this.motes.update(dt, time, camera, this.y);
    this.bubbles.update(dt, time);
    return under;
  }
}

// ------------------------------------------------------------------ drifting pastina motes
class Motes {
  constructor(scene) {
    const g = new THREE.IcosahedronGeometry(0.022, 0); g.scale(1.6, 0.55, 1);
    this.n = 520;
    this.mat = new THREE.MeshStandardMaterial({ color: '#f3d07a', roughness: 0.6 });
    // motes are pasta too: give them the water treatment by reusing a pasta material if supplied later
    this.mesh = new THREE.InstancedMesh(g, this.mat, this.n);
    this.mesh.frustumCulled = false;
    const rnd = mulberry32(5);
    this.p = new Float32Array(this.n * 3); this.ph = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) { this.p[i * 3] = (rnd() - 0.5) * 22; this.p[i * 3 + 1] = (rnd() - 0.5) * 14; this.p[i * 3 + 2] = (rnd() - 0.5) * 22; this.ph[i] = rnd() * TAU; }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3();
    scene.add(this.mesh);
  }
  setMaterial(m) { this.mesh.material = m; }
  update(dt, time, camera, wy) {
    const c = camera.position, B = 11, H = 7;
    for (let i = 0; i < this.n; i++) {
      const o = i * 3, ph = this.ph[i];
      // slow drift, settling
      this.p[o] += Math.sin(time * 0.21 + ph) * 0.05 * dt; this.p[o + 1] -= 0.035 * dt; this.p[o + 2] += Math.cos(time * 0.17 + ph * 1.7) * 0.05 * dt;
      // wrap into a box around the camera
      let x = this.p[o], y = this.p[o + 1], z = this.p[o + 2];
      x = ((x - c.x + B) % (2 * B) + 2 * B) % (2 * B) - B + c.x;
      y = ((y - c.y + H) % (2 * H) + 2 * H) % (2 * H) - H + c.y;
      z = ((z - c.z + B) % (2 * B) + 2 * B) % (2 * B) - B + c.z;
      this.p[o] = x; this.p[o + 1] = y; this.p[o + 2] = z;
      const s = y < wy - 0.05 ? 1 : 0;
      this._e.set(ph + time * 0.3, ph * 2.1 + time * 0.2, 0); this._q.setFromEuler(this._e);
      this._m.compose(this._v.set(x, y, z), this._q, this._s.setScalar(s * (0.7 + (i % 5) * 0.15)));
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ bubbles
export class Bubbles {
  constructor(scene, wy) {
    this.wy = wy; this.n = 220;
    const g = new THREE.SphereGeometry(1, 10, 8);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uWaterCol: G.uWaterCol },
      vertexShader: /* glsl */`
        varying vec3 vN; varying vec3 vV;
        void main() { vec4 w = modelMatrix * instanceMatrix * vec4( position, 1.0 ); vN = normalize( mat3( modelMatrix * instanceMatrix ) * normal ); vV = normalize( cameraPosition - w.xyz ); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uWaterCol; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) );
          float rim = pow( f, 2.2 );
          float hi = pow( max( dot( reflect( -normalize( vV ), normalize( vN ) ), normalize( vec3( -0.4, 1.0, 0.3 ) ) ), 0.0 ), 30.0 );
          gl_FragColor = vec4( mix( uWaterCol * 1.6, vec3( 1.0, 0.97, 0.88 ), rim ) + hi * 2.0, rim * 0.75 + hi * 0.6 + 0.04 );
        }`,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, this.n);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.b = [];
    for (let i = 0; i < this.n; i++) this.b.push({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: 0.05, t: 0, ph: 0 });
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
    this.onPop = null;
    scene.add(this.mesh);
  }
  emit(p, r = 0.05, spread = 0.1, vy = 0.8) {
    if (p.y > this.wy - 0.05) return;
    const b = this.b.find(x => !x.live); if (!b) return;
    b.live = true; b.t = 0; b.r = r * (0.7 + Math.random() * 0.6); b.ph = Math.random() * TAU;
    b.p.set(p.x + (Math.random() - 0.5) * spread, p.y + (Math.random() - 0.5) * spread, p.z + (Math.random() - 0.5) * spread);
    b.v.set((Math.random() - 0.5) * 0.3, vy * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * 0.3);
  }
  update(dt, time) {
    let k = 0;
    for (const b of this.b) {
      if (!b.live) continue;
      b.t += dt;
      // bubbles rise faster the bigger they are, and wobble
      const rise = 0.9 + b.r * 9;
      b.v.y += (rise - b.v.y) * Math.min(1, dt * 2.5);
      b.p.x += (b.v.x + Math.sin(time * 7 + b.ph) * 0.12) * dt; b.p.y += b.v.y * dt; b.p.z += (b.v.z + Math.cos(time * 6 + b.ph) * 0.12) * dt;
      b.v.x *= 0.98; b.v.z *= 0.98;
      if (b.p.y > this.wy - b.r * 0.5 || b.t > 14) { b.live = false; if (this.onPop && b.r > 0.05) this.onPop(b.p, b.r); continue; }
      const sq = 1 + Math.sin(time * 11 + b.ph) * 0.08;
      this._m.compose(b.p, this._q, this._s.set(b.r * sq, b.r / sq, b.r * sq));
      this.mesh.setMatrixAt(k++, this._m);
    }
    this.mesh.count = k;
    if (k) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
