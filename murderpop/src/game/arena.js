// The arena: a set built and lit by tools/arena/kit.py (Blender + Cycles), shown in three.js.
//
//   const arena = await Arena.load('assets/arenas/ballroom/ballroom.json', renderer, scene, { camera });
//   arena.addCaster(heroine.root); arena.addCaster(boss.root);      // characters: they cast and stand in shade
//   each frame: arena.setOccluders([...]); arena.update(dt); then render (post.fx.exposure = arena.exposure)
//   (update(dt, camera, focus): focus is where a point key aims, e.g. the heroine)
//
// What it does:
// - Set surfaces show the baked light (one lightmap per lighting state on one UV atlas; setState(a, b, k) blends two).
//   They take no real-time light: the bake already holds it, direct and bounced.
// - Specular comes from an env map captured from the arena itself (PMREM, box-projected onto the room so window
//   reflections land in the right place); the floor gets a planar mirror instead.
// - Characters get a real-time key light that matches the state's key (a sun, or a lamp where the bake has it),
//   shadowed by the set, so walking into a shaft of sun lights them up; their fill is the arena's env map.
// - Their shadows on the set: the bake stores how much of each texel's light is the key's direct light (keymap), and
//   a character's shadow takes exactly that away, so shadows appear in the sun pools and not in the shade.
//   setOccluders() adds soft contact occlusion (spheres) for the rest of the light.
// - 2D colliders on the floor plane (x, z): resolve(x, z, r) pushes a circle out of them and keeps it in bounds.
//
// Frame: three.js, x right, y up, z toward the camera. Layers: set meshes are on ARENA (+ 0 when visible); 'hidden'
// set meshes (ceiling, the wall behind the camera) are only seen by reflections and the env capture; anything on
// NO_REFLECT (and not 0) is drawn by the main camera but not mirrored (floor decals: telegraphs).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const LAYER = { HIDDEN: 3, NO_REFLECT: 4, CASTER: 5, ARENA: 6 };
const MAX_OCC = 8;
const LUM = new THREE.Vector3(0.2126, 0.7152, 0.0722);

// ------------------------------------------------------------------------------------------------ shaders
const PARS = /* glsl */`
varying vec3 vArenaW;
uniform sampler2D uLmA, uLmB, uKeyA, uKeyB;
uniform float uLmK;
uniform vec3 uKeyChromaA, uKeyChromaB;
uniform highp sampler2DShadow uCasterMapA, uCasterMapB;
uniform mat4 uCasterMatrixA, uCasterMatrixB;
uniform vec3 uCasterOn;   // x: state A's key has casters drawn, y: state B's, z: B's key is A's (one map for both)
uniform vec2 uCasterTexel;
uniform vec4 uOcc[ ${MAX_OCC} ];
uniform int uOccN;
uniform float uOccStrength;
uniform vec3 uBoxMin, uBoxMax, uCapture;
uniform float uBoxOn, uSpecOcc, uSpecOccScale;
#ifdef ARENA_MIRROR
	uniform sampler2D uMirrorTex;
	uniform float uMirrorOn, uMirrorLod, uMirrorGain, uMirrorWarp;
	varying vec4 vMirrorCoord;
#endif
float arenaLum( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }
vec3 arenaDecode( vec3 c ) { vec3 e = pow( c, vec3( 2.2 ) ); return e / max( vec3( 1e-4 ), 1.0 - e ); }
vec3 arenaBox( vec3 d ) {
	if ( uBoxOn < 0.5 ) return d;
	vec3 p = clamp( vArenaW, uBoxMin + 0.01, uBoxMax - 0.01 );
	vec3 dd = d + sign( d ) * 1e-5 + vec3( equal( d, vec3( 0.0 ) ) ) * 1e-5;
	vec3 t = max( ( uBoxMax - p ) / dd, ( uBoxMin - p ) / dd );
	float s = min( min( t.x, t.y ), t.z );
	return normalize( p + d * s - uCapture );
}
const vec2 ARENA_DISC[ 12 ] = vec2[ 12 ]( vec2( -0.326, -0.406 ), vec2( -0.840, -0.074 ), vec2( -0.696, 0.457 ),
	vec2( -0.203, 0.621 ), vec2( 0.962, -0.195 ), vec2( 0.473, -0.480 ), vec2( 0.519, 0.767 ), vec2( 0.185, -0.893 ),
	vec2( 0.507, 0.064 ), vec2( 0.896, 0.412 ), vec2( -0.322, -0.933 ), vec2( -0.792, -0.598 ) );
// how much of a key's light reaches p past the characters (their depth seen from that key: parallel or from a lamp)
float arenaCasterShadow( highp sampler2DShadow map, mat4 m, vec3 p, vec3 n ) {
	vec4 c = m * vec4( p + n * 0.03, 1.0 );
	if ( c.w <= 0.0 ) return 1.0;
	vec3 sc = c.xyz / c.w;
	if ( any( lessThan( sc, vec3( 0.0 ) ) ) || any( greaterThan( sc, vec3( 1.0 ) ) ) ) return 1.0;
	float s = 0.0;
	for ( int i = 0; i < 12; i ++ ) s += textureGrad( map, vec3( sc.xy + ARENA_DISC[ i ] * uCasterTexel * 2.2, sc.z - 0.002 ), vec2( 0.0 ), vec2( 0.0 ) );
	return s / 12.0;
}
float arenaOcclusion( vec3 p, vec3 n ) {
	float o = 1.0;
	for ( int i = 0; i < ${MAX_OCC}; i ++ ) {
		if ( i >= uOccN ) break;
		vec3 d = uOcc[ i ].xyz - p;
		float l2 = max( dot( d, d ), 1e-4 );
		float r = uOcc[ i ].w;
		float k = clamp( dot( n, d ) * inversesqrt( l2 ) * r * r / l2, 0.0, 1.0 );
		o *= 1.0 - k * uOccStrength;
	}
	return o;
}
`;

// replaces three's lights_fragment_maps for set surfaces
const MAPS = /* glsl */`
vec3 arenaL = vec3( 0.0 );
#if defined( RE_IndirectDiffuse )
	irradiance = vec3( 0.0 );
	{
		vec3 La = arenaDecode( texture2D( uLmA, vLightMapUv ).rgb );
		vec3 Lb = arenaDecode( texture2D( uLmB, vLightMapUv ).rgb );
		float ka = texture2D( uKeyA, vLightMapUv ).r;
		float kb = texture2D( uKeyB, vLightMapUv ).r;
		vec3 L = mix( La, Lb, uLmK );
		vec3 LkA = uKeyChromaA * ( ka * arenaLum( La ) ), LkB = uKeyChromaB * ( kb * arenaLum( Lb ) );
		vec3 Lk = min( mix( LkA, LkB, uLmK ), L );
		vec3 nW = inverseTransformDirection( geometryNormal, viewMatrix );
		float ao = arenaOcclusion( vArenaW, nW );
		// each state's key is shadowed by the characters from where that key is
		float sA = uCasterOn.x > 0.5 ? arenaCasterShadow( uCasterMapA, uCasterMatrixA, vArenaW, nW ) : 1.0;
		float sB = uCasterOn.z > 0.5 ? sA : ( uCasterOn.y > 0.5 ? arenaCasterShadow( uCasterMapB, uCasterMatrixB, vArenaW, nW ) : 1.0 );
		float wA = arenaLum( LkA ) * ( 1.0 - uLmK ), wB = arenaLum( LkB ) * uLmK;
		float sh = ( wA * sA + wB * sB ) / max( wA + wB, 1e-6 );
		arenaL = Lk * ( sh * mix( 1.0, ao, 0.55 ) ) + ( L - Lk ) * ao;
		iblIrradiance = arenaL * PI;
	}
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	{
		vec3 iblR = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
		float so = mix( 1.0, clamp( arenaLum( arenaL ) * uSpecOccScale, 0.06, 1.0 ), uSpecOcc );
		#ifdef ARENA_MIRROR
			if ( uMirrorOn > 0.0 ) {
				vec2 muv = vMirrorCoord.xy / vMirrorCoord.w + ( normal.xy - nonPerturbedNormal.xy ) * uMirrorWarp;
				vec3 m = textureLod( uMirrorTex, muv, uMirrorLod + material.roughness * 12.0 ).rgb * uMirrorGain;
				iblR = mix( iblR * so, m, uMirrorOn );
				so = 1.0;
			}
		#endif
		radiance += iblR * so;
		#ifdef USE_CLEARCOAT
			clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness ) * so;
		#endif
	}
#endif
`;

const SHAFT_VS = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main() {
	vUv = uv;
	vN = normalize( mat3( modelMatrix ) * normal );
	vec4 w = modelMatrix * vec4( position, 1.0 );
	vW = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SHAFT_FS = /* glsl */`
uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
float h3( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float vn( vec3 x ) {
	vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( mix( h3( i ), h3( i + vec3( 1, 0, 0 ) ), f.x ), mix( h3( i + vec3( 0, 1, 0 ) ), h3( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
		mix( mix( h3( i + vec3( 0, 0, 1 ) ), h3( i + vec3( 1, 0, 1 ) ), f.x ), mix( h3( i + vec3( 0, 1, 1 ) ), h3( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
void main() {
	vec3 V = normalize( cameraPosition - vW );
	float face = abs( dot( normalize( vN ), V ) );
	float along = vUv.y;
	float a = pow( face, 2.2 ) * smoothstep( 0.0, 0.18, along ) * ( 1.0 - smoothstep( 0.62, 1.0, along ) );
	float dust = vn( vW * 1.3 + vec3( 0.0, uTime * 0.06, uTime * 0.04 ) ) * 0.6 + vn( vW * 4.1 - vec3( uTime * 0.09 ) ) * 0.4;
	a *= 0.7 + 0.6 * dust;
	a *= smoothstep( 1.5, 6.0, distance( cameraPosition, vW ) );   // no fog in the lens when the camera is in a beam
	gl_FragColor = vec4( uColor * ( a * uIntensity * 0.22 ), 1.0 );
}`;

// ------------------------------------------------------------------------------------------------ helpers
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Vector4(), _m = new THREE.Matrix4();
const _plane = new THREE.Plane(), _clip = new THREE.Vector4(), _size = new THREE.Vector2(), _white = new THREE.Color(1, 1, 1);
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

function parseExtra(o) {
  const a = o && o.userData && o.userData.arena;
  if (!a) return {};
  try { return typeof a === 'string' ? JSON.parse(a) : a; } catch { return {}; }
}

function setKey(light, c) {
  const max = Math.max(c.r, c.g, c.b);
  light.intensity = max;
  if (max > 0) light.color.copy(c).multiplyScalar(1 / max);
  light.shadow.autoUpdate = max > 1e-5;
}

function chroma(c) {
  const l = Math.max(1e-4, c[0] * LUM.x + c[1] * LUM.y + c[2] * LUM.z);
  return new THREE.Vector3(c[0] / l, c[1] / l, c[2] / l);
}

// A planar mirror for the floor (the maths of three's Reflector), rendered at a fraction of the screen.
class Mirror {
  constructor(height, scale) {
    this.height = height;
    this.scale = scale;
    this.cam = new THREE.PerspectiveCamera();
    this.cam.layers.set(0);
    this.cam.layers.enable(LAYER.HIDDEN);
    this.matrix = new THREE.Matrix4();
    this.rt = new THREE.WebGLRenderTarget(16, 16, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: true, colorSpace: THREE.LinearSRGBColorSpace,
    });
  }

  render(renderer, scene, camera, hide) {
    const size = renderer.getDrawingBufferSize(_size);
    const w = Math.max(16, Math.round(size.x * this.scale)), h = Math.max(16, Math.round(size.y * this.scale));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    const normal = _v.set(0, 1, 0);
    const mirrorPos = new THREE.Vector3(0, this.height, 0);
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const view = mirrorPos.clone().sub(camPos);
    if (view.dot(normal) > 0) return false;
    view.reflect(normal).negate().add(mirrorPos);
    const rot = _m.extractRotation(camera.matrixWorld);
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(camPos);
    const target = mirrorPos.clone().sub(look).reflect(normal).negate().add(mirrorPos);
    const c = this.cam;
    c.position.copy(view);
    c.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal);
    c.lookAt(target);
    c.far = camera.far;
    c.updateMatrixWorld();
    c.projectionMatrix.copy(camera.projectionMatrix);
    this.matrix.copy(BIAS).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
    _plane.setFromNormalAndCoplanarPoint(normal, mirrorPos).applyMatrix4(c.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const p = c.projectionMatrix.elements;
    _q.x = (Math.sign(_clip.x) + p[8]) / p[0];
    _q.y = (Math.sign(_clip.y) + p[9]) / p[5];
    _q.z = -1.0;
    _q.w = (1.0 + p[10]) / p[14];
    _clip.multiplyScalar(2.0 / _clip.dot(_q));
    p[2] = _clip.x; p[6] = _clip.y; p[10] = _clip.z + 1.0 - 0.003; p[14] = _clip.w;
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
    const vis = hide.map((o) => o.visible);
    for (const o of hide) o.visible = false;
    const prev = renderer.getRenderTarget();
    const xr = renderer.xr.enabled;
    renderer.xr.enabled = false;
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, c);
    renderer.setRenderTarget(prev);
    renderer.xr.enabled = xr;
    hide.forEach((o, i) => { o.visible = vis[i]; });
    return true;
  }
}

// ------------------------------------------------------------------------------------------------ the arena
export class Arena {
  /**
   * Load an arena. url: its sidecar (.json) or its .glb (the sidecar sits next to it).
   * opts: { camera, state = 0, mirrorScale = 0.5, shadowSize = 4096, casterSize = 2048, envSize = 256 }
   */
  static async load(url, renderer, scene, opts = {}) {
    const a = new Arena(renderer, scene, opts);
    await a._load(url.replace(/\.glb$/, '.json'));
    return a;
  }

  constructor(renderer, scene, opts) {
    this.renderer = renderer;
    this.scene = scene;
    this.opts = Object.assign({ mirrorScale: 0.5, shadowSize: 4096, casterSize: 2048, envSize: 256, state: 0 }, opts);
    this.camera = opts.camera || null;   // the game camera the floor mirror follows (or pass it to update())
    this.group = new THREE.Group();
    this.group.name = 'arena';
    this.time = 0;
    this.exposure = 1;
    this.anchors = {};
    this.nodes = {};
    this.spawns = {};
    this.meshes = [];
    this.casters = [];
    this.occluders = [];
    this._out = { x: 0, z: 0, hit: false, nx: 0, nz: 0 };
    this._blend = { a: 0, b: 0, k: 0 };
    this._envBlend = null;
    this._envAge = 0;
    this.u = {
      uLmA: { value: null }, uLmB: { value: null }, uKeyA: { value: null }, uKeyB: { value: null }, uLmK: { value: 0 },
      uKeyChromaA: { value: new THREE.Vector3(1, 1, 1) }, uKeyChromaB: { value: new THREE.Vector3(1, 1, 1) },
      uCasterMapA: { value: null }, uCasterMapB: { value: null },
      uCasterMatrixA: { value: new THREE.Matrix4() }, uCasterMatrixB: { value: new THREE.Matrix4() },
      uCasterOn: { value: new THREE.Vector3() }, uCasterTexel: { value: new THREE.Vector2(1 / 2048, 1 / 2048) },
      uOcc: { value: Array.from({ length: MAX_OCC }, () => new THREE.Vector4()) }, uOccN: { value: 0 }, uOccStrength: { value: 0.85 },
      uBoxMin: { value: new THREE.Vector3() }, uBoxMax: { value: new THREE.Vector3() }, uCapture: { value: new THREE.Vector3() },
      uBoxOn: { value: 1 }, uSpecOcc: { value: 0.7 }, uSpecOccScale: { value: 2.0 },
      uMirrorTex: { value: null }, uMirrorOn: { value: 1 }, uMirrorLod: { value: 0.4 }, uMirrorGain: { value: 1 },
      uMirrorWarp: { value: 0.04 }, uMirrorMatrix: { value: new THREE.Matrix4() },
    };
  }

  async _load(url) {
    const base = url.slice(0, url.lastIndexOf('/') + 1);
    const data = await (await fetch(url)).json();
    this.data = data;
    const texLoader = new THREE.TextureLoader();
    const tex = (f) => texLoader.loadAsync(base + f).then((t) => {
      t.flipY = false;
      t.colorSpace = THREE.NoColorSpace;
      t.channel = 1;
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      return t;
    });
    const [gltf, lms, keys] = await Promise.all([
      new GLTFLoader().loadAsync(base + data.glb),
      Promise.all(data.states.map((s) => tex(s.lightmap))),
      Promise.all(data.states.map((s) => tex(s.keymap))),
    ]);
    this.lightmaps = lms;
    this.keymaps = keys;
    this.states = data.states;
    this.stateIndex = Object.fromEntries(data.states.map((s, i) => [s.name, i]));
    const b = data.bounds;
    this.bounds = { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
    this.colliders = data.colliders.map((c) => (c.type === 'box' ? { ...c, cos: Math.cos(c.rot), sin: Math.sin(c.rot) } : { ...c }));
    this.spawns = data.spawns;
    this.room = { min: new THREE.Vector3(...data.room.min), max: new THREE.Vector3(...data.room.max) };
    this.capture = new THREE.Vector3(...data.capture);
    this.u.uBoxMin.value.copy(this.room.min);
    this.u.uBoxMax.value.copy(this.room.max);
    this.u.uCapture.value.copy(this.capture);
    this.group.add(gltf.scene);
    this.mirrors = [];
    this.shafts = {};
    this.emissive = [];
    this.water = [];
    gltf.scene.updateMatrixWorld(true);
    // a material shared by lightmapped and real-time-lit parts (gilt mouldings and a sconce's gilt plate) gets
    // its own copy for the real-time ones: the lightmap patch must not reach meshes without lightmap UVs
    const lmMats = new Set();
    gltf.scene.traverse((o) => { if (o.isMesh && parseExtra(o).lm) lmMats.add(o.material); });
    gltf.scene.traverse((o) => { if (o.isMesh && !parseExtra(o).lm && lmMats.has(o.material)) o.material = o.material.clone(); });
    gltf.scene.traverse((o) => {
      const ex = parseExtra(o);
      if (ex.anchor) this.anchors[ex.anchor] = o;
      if (ex.node) this.nodes[ex.node] = o;
      if (!o.isMesh) return;
      if (ex.shaft !== undefined) { this._setupShaft(o, ex.shaft); return; }
      this.meshes.push(o);
      const mex = parseExtra(o.material);
      o.material.userData.kind = mex.kind || 'solid';
      if (ex.view === 'hidden') { o.layers.set(LAYER.HIDDEN); } else { o.layers.set(0); }
      o.layers.enable(LAYER.ARENA);
      o.castShadow = !!ex.cast;
      o.receiveShadow = !ex.lm;            // parts without a lightmap are lit in real time, shadowed by the set
      o.frustumCulled = true;
      if (mex.emit) this.emissive.push({ mat: o.material, name: ex.mat });
      if (mex.kind === 'water' && o.material.normalMap) this.water.push({ map: o.material.normalMap, flow: mex.flow || [0.02, 0.01] });
      if (ex.lm) this._patch(o.material, !!ex.mirror);
      if (ex.mirror) {
        if (!this.mirrors.length) {
          const box = new THREE.Box3().setFromObject(o);
          this.mirror = new Mirror(box.max.y, this.opts.mirrorScale);
          this.u.uMirrorTex.value = this.mirror.rt.texture;
        }
        this.mirrors.push(o);
      }
    });
    // anchors: the sidecar has their positions; the GLB has an empty for each (and a node per dynamic set piece)
    for (const [name, a] of Object.entries(data.anchors)) {
      const node = this.anchors[name];
      this.anchors[name] = { position: new THREE.Vector3(...a.pos), dir: new THREE.Vector2(...a.dir), object: node || null,
        node: a.node ? this.nodes[a.node] || null : null };
    }
    this.scene.add(this.group);
    this._setupLights();
    this._setupCaster();
    this._setupEnv();
    const s = this.opts.state;
    this.setState(s, s, 0);
    this._captureEnv();
    // once more, now that the room has an env map: the set's shaders for every later capture compile here, not
    // at the first change of light in the middle of a song
    this._captureEnv();
    // every state's light: up to the GPU now, not on its first use mid-song
    for (const t of [...this.lightmaps, ...this.keymaps]) if (t && t.image) { try { this.renderer.initTexture(t); } catch (e) { /* uploaded on first use */ } }
  }

  // ---------------------------------------------------------------- materials
  _patch(mat, mirror) {
    const u = this.u;
    mat.lightMap = this.lightmaps[0];
    mat.lightMapIntensity = 1;
    if (mirror) { mat.defines = mat.defines || {}; mat.defines.ARENA_MIRROR = ''; }
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
varying vec3 vArenaW;
#ifdef ARENA_MIRROR
	uniform mat4 uMirrorMatrix;
	varying vec4 vMirrorCoord;
#endif`)
        .replace('#include <project_vertex>', `#include <project_vertex>
vArenaW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
#ifdef ARENA_MIRROR
	vMirrorCoord = uMirrorMatrix * vec4( vArenaW, 1.0 );
#endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + PARS)
        .replace('#include <envmap_physical_pars_fragment>', THREE.ShaderChunk.envmap_physical_pars_fragment
          .replaceAll('reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );',
            'reflectVec = arenaBox( transformDirectionByInverseViewMatrix( reflectVec, viewMatrix ) );'))
        .replace('#include <lights_fragment_begin>', '#undef RE_Direct\n#undef RE_Direct_RectArea\n#include <lights_fragment_begin>')
        .replace('#include <lights_fragment_maps>', MAPS);
    };
    mat.customProgramCacheKey = () => 'arena' + (mirror ? '-mirror' : '');
    mat.needsUpdate = true;
  }

  _setupShaft(o, stateName) {
    const m = new THREE.ShaderMaterial({
      vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(1, 0.8, 0.6) }, uIntensity: { value: 0 }, uTime: { value: 0 } },
    });
    o.material = m;
    o.layers.set(LAYER.NO_REFLECT);
    o.renderOrder = 10;
    o.frustumCulled = false;
    this.shafts[stateName] = o;
  }

  // ---------------------------------------------------------------- lights for characters
  // Two real-time keys for characters, shared by all states: a sun (parallel light over the whole room) and a lamp (a
  // spot light where a point, spot or area key is in the bake). Each takes its state's key, weighted by the blend.
  // Both always exist, at intensity 0 and with no shadow pass when unused, so a change of state never recompiles.
  _setupLights() {
    const S = this.opts.shadowSize;
    const sun = new THREE.DirectionalLight(0xffffff, 0);
    sun.name = 'arena-sun';
    sun.castShadow = true;
    sun.shadow.mapSize.set(S, S);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    sun.shadow.camera.layers.enable(LAYER.HIDDEN);
    const lamp = new THREE.SpotLight(0xffffff, 0, 0, 1, 0.5, 2);
    lamp.name = 'arena-lamp';
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(S / 2, S / 2);
    lamp.shadow.bias = -0.0002;
    lamp.shadow.normalBias = 0.02;
    lamp.shadow.radius = 3;
    lamp.shadow.camera.near = 0.25;
    lamp.shadow.camera.far = this.room.max.distanceTo(this.room.min) + 2;
    lamp.shadow.camera.layers.enable(LAYER.HIDDEN);
    this.sun = sun;
    this.lamp = lamp;
    this.scene.add(sun, sun.target, lamp, lamp.target);
    const sm = this.renderer.shadowMap;
    sm.enabled = true;
    sm.type = THREE.PCFShadowMap;
    sm.autoUpdate = false;
    this._sunDir = new THREE.Vector3(0, 1, 0);
    this._sunFitted = false;
  }

  // the sun's shadow covers the whole room (a sphere round it, so it doesn't care which way the light points)
  _fitSunShadow(dir) {
    const cam = this.sun.shadow.camera;
    const c = this.room.min.clone().add(this.room.max).multiplyScalar(0.5);
    const R = this.room.max.distanceTo(this.room.min) / 2 + 0.5;
    this.sun.position.copy(c).addScaledVector(dir, R + 20);
    this.sun.target.position.copy(c);
    this.sun.updateMatrixWorld();
    this.sun.target.updateMatrixWorld();
    Object.assign(cam, { left: -R, right: R, bottom: -R, top: R, near: 20 - 0.5, far: 2 * R + 20.5 });
    cam.updateProjectionMatrix();
  }

  // a lamp key as a spot light: where it is, where it points, its cone and how it softens (Blender's spot blend is
  // linear in cos from the edge inward, and so is three's penumbra: they match)
  _lampOf(key, focus) {
    const pos = new THREE.Vector3(...key.pos);
    let aim, angle, penumbra;
    if (key.type === 'spot') {
      aim = new THREE.Vector3(...key.aim);
      angle = key.cone;
      const ce = Math.cos(angle), inner = Math.acos(Math.min(1, ce + (1 - ce) * (key.blend || 0)));
      penumbra = THREE.MathUtils.clamp(1 - inner / angle, 0, 1);
    } else if (key.type === 'area') {         // a lit rectangle: its light falls away toward edge-on
      aim = new THREE.Vector3(...(key.aim || [0, -1, 0]));
      angle = 1.45;
      penumbra = 1;
    } else {                                   // a point: aimed at the fight, wide
      aim = (focus ? focus.clone() : new THREE.Vector3(this.capture.x, 0, this.capture.z)).sub(pos);
      if (aim.lengthSq() < 1e-6) aim.set(0, -1, 0);
      angle = 1.25;
      penumbra = 0.2;
    }
    return { pos, aim: aim.normalize(), angle, penumbra, color: new THREE.Color(...key.color).multiplyScalar(key.intensity) };
  }

  // each state's key on the real-time light of its kind, weighted by the blend
  _aimKeys(focus) {
    const A = this._keyA, B = this._keyB, k = this._keyK;
    const ws = [[A, 1 - k], [B, k]];
    // the sun: the states' sun keys summed; it points the way of the stronger
    const cs = new THREE.Color(0, 0, 0), ds = new THREE.Vector3();
    for (const [key, w] of ws) {
      if (key.type !== 'sun' || w <= 0) continue;
      const e = w * key.intensity;
      cs.r += key.color[0] * e; cs.g += key.color[1] * e; cs.b += key.color[2] * e;
      ds.addScaledVector(new THREE.Vector3(...key.dir).normalize(), e * Math.max(...key.color));
    }
    setKey(this.sun, cs);
    if (ds.lengthSq() > 1e-12) {
      ds.normalize();
      if (!this._sunFitted || !ds.equals(this._sunDir)) { this._sunDir.copy(ds); this._fitSunShadow(ds); this._sunFitted = true; }
    }
    // the lamp: one state's lamp, or two lamps crossfading (the light moves from one to the other)
    const lamps = ws.filter(([key, w]) => key.type !== 'sun' && w > 0).map(([key, w]) => [this._lampOf(key, focus), w]);
    if (!lamps.length) { setKey(this.lamp, cs.setRGB(0, 0, 0)); return; }
    let [L, w] = lamps[0];
    const col = L.color.clone().multiplyScalar(w);
    if (lamps.length === 2) {
      const [L2, w2] = lamps[1];
      L = { pos: L.pos.lerp(L2.pos, k), aim: L.aim.lerp(L2.aim, k).normalize(), angle: THREE.MathUtils.lerp(L.angle, L2.angle, k),
        penumbra: THREE.MathUtils.lerp(L.penumbra, L2.penumbra, k) };
      col.add(L2.color.clone().multiplyScalar(w2));
    }
    const lamp = this.lamp;
    lamp.position.copy(L.pos);
    lamp.target.position.copy(L.pos).addScaledVector(L.aim, 4);
    lamp.angle = L.angle;
    lamp.penumbra = L.penumbra;
    lamp.updateMatrixWorld();
    lamp.target.updateMatrixWorld();
    setKey(lamp, col);
  }

  // the casters' own depth maps, one per state's key (parallel from a sun, from the lamp otherwise), sampled by set
  // surfaces: character shadows on the set
  _setupCaster() {
    const n = this.opts.casterSize;
    const slot = () => {
      const dt = new THREE.DepthTexture(n, n);
      dt.compareFunction = THREE.LessEqualCompare;
      dt.minFilter = dt.magFilter = THREE.LinearFilter;
      const rt = new THREE.WebGLRenderTarget(n, n, { depthTexture: dt, depthBuffer: true });
      const ortho = new THREE.OrthographicCamera(), persp = new THREE.PerspectiveCamera();
      ortho.layers.set(LAYER.CASTER);
      persp.layers.set(LAYER.CASTER);
      return { rt, ortho, persp };
    };
    this.casterSlots = [slot(), slot()];
    this.casterMat = new THREE.MeshDepthMaterial({ colorWrite: false });
    this.u.uCasterMapA.value = this.casterSlots[0].rt.depthTexture;
    this.u.uCasterMapB.value = this.casterSlots[1].rt.depthTexture;
    this.u.uCasterTexel.value.set(1 / n, 1 / n);
    const prev = this.renderer.getRenderTarget();
    for (const s of this.casterSlots) { this.renderer.setRenderTarget(s.rt); this.renderer.clear(); }
    this.renderer.setRenderTarget(prev);
  }

  _renderCasters() {
    const on = this.u.uCasterOn.value;
    if (!this.casters.length) { on.set(0, 0, 0); return; }
    const k = this._keyK, share = this._keyShare;
    const doA = share || k < 1, doB = !share && k > 0;
    if (doA) this._renderCasterSlot(this.casterSlots[0], this._keyA, this.u.uCasterMatrixA.value);
    if (doB) this._renderCasterSlot(this.casterSlots[1], this._keyB, this.u.uCasterMatrixB.value);
    on.set(doA ? 1 : 0, doB ? 1 : 0, share ? 1 : 0);
  }

  _renderCasterSlot(slot, key, matrix) {
    const b = this.bounds;
    const c = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    const corner = (i) => _v.set(i & 1 ? b.maxX + 1 : b.minX - 1, i & 2 ? 3.5 : 0, i & 4 ? b.maxZ + 1 : b.minZ - 1);
    let cam;
    if (key.type === 'sun') {
      const dir = new THREE.Vector3(...key.dir).normalize();
      cam = slot.ortho;
      cam.position.copy(c).addScaledVector(dir, 30);
      cam.up.set(0, 1, 0);
      if (Math.abs(dir.y) > 0.99) cam.up.set(0, 0, -1);
      cam.lookAt(c);
      cam.updateMatrixWorld();
      const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (let i = 0; i < 8; i++) { corner(i).applyMatrix4(cam.matrixWorldInverse); lo.min(_v); hi.max(_v); }
      Object.assign(cam, { left: lo.x, right: hi.x, bottom: lo.y, top: hi.y, near: Math.max(0.1, -hi.z - 1), far: -lo.z + 1 });
    } else {
      // from the lamp, framing the floor and everyone on it
      const pos = new THREE.Vector3(...key.pos);
      cam = slot.persp;
      cam.position.copy(pos);
      const look = c.clone().setY(1.0).sub(pos).normalize();
      cam.up.set(0, 1, 0);
      if (Math.abs(look.y) > 0.99) cam.up.set(0, 0, -1);
      cam.lookAt(c.clone().setY(1.0));
      cam.updateMatrixWorld();
      let tx = 0.05, ty = 0.05, zn = Infinity, zf = 0;
      for (let i = 0; i < 8; i++) {
        corner(i).applyMatrix4(cam.matrixWorldInverse);
        const d = Math.max(0.05, -_v.z);
        tx = Math.max(tx, Math.abs(_v.x) / d); ty = Math.max(ty, Math.abs(_v.y) / d);
        zn = Math.min(zn, -_v.z); zf = Math.max(zf, -_v.z);
      }
      tx = Math.min(tx, 4); ty = Math.min(ty, 4);
      Object.assign(cam, { fov: THREE.MathUtils.radToDeg(2 * Math.atan(ty)), aspect: tx / ty, near: Math.max(0.05, zn - 0.5), far: Math.max(zf + 0.5, 1) });
    }
    cam.updateProjectionMatrix();
    const r = this.renderer, sc = this.scene;
    const bg = sc.background, ov = sc.overrideMaterial, prev = r.getRenderTarget();
    sc.background = null;
    sc.overrideMaterial = this.casterMat;
    r.setRenderTarget(slot.rt);
    r.clear();
    r.render(sc, cam);
    r.setRenderTarget(prev);
    sc.overrideMaterial = ov;
    sc.background = bg;
    matrix.copy(BIAS).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
  }

  // ---------------------------------------------------------------- the env map (the arena, seen from its middle)
  _setupEnv() {
    const n = this.opts.envSize;
    this.cubeRT = new THREE.WebGLCubeRenderTarget(n, { type: THREE.HalfFloatType, generateMipmaps: false });
    this.cubeCam = new THREE.CubeCamera(0.05, 200, this.cubeRT);
    this.cubeCam.position.copy(this.capture);
    for (const c of this.cubeCam.children) c.layers.set(LAYER.ARENA);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = null;
  }

  _captureEnv() {
    const r = this.renderer, sc = this.scene;
    const mo = this.u.uMirrorOn.value, bg = sc.background;
    this.u.uMirrorOn.value = 0;
    this.u.uOccN.value = 0;
    const casterOn = this.u.uCasterOn.value.clone();
    this.u.uCasterOn.value.set(0, 0, 0);
    if (!bg) sc.background = new THREE.Color(0, 0, 0);
    this.cubeCam.updateMatrixWorld();
    this.cubeCam.update(r, sc);
    sc.background = bg;
    this.envRT = this.pmrem.fromCubemap(this.cubeRT.texture, this.envRT);
    sc.environment = this.envRT.texture;
    this.u.uMirrorOn.value = mo;
    this.u.uCasterOn.value.copy(casterOn);
    this.u.uOccN.value = Math.min(MAX_OCC, this.occluders.length);
    this._envBlend = { ...this._blend };
    this._envAge = 0;
  }

  // ---------------------------------------------------------------- states
  /** Show state a blended toward state b by k (0..1). States by name or index. */
  setState(a, b = a, k = 0) {
    const ia = typeof a === 'string' ? this.stateIndex[a] : a;
    const ib = typeof b === 'string' ? this.stateIndex[b] : b;
    if (ia === undefined || ib === undefined) throw new Error(`arena ${this.data.name}: no state ${a} / ${b}`);
    k = THREE.MathUtils.clamp(k, 0, 1);
    this._blend = { a: ia, b: ib, k };
    const sa = this.states[ia], sb = this.states[ib];
    const u = this.u;
    u.uLmA.value = this.lightmaps[ia]; u.uLmB.value = this.lightmaps[ib];
    u.uKeyA.value = this.keymaps[ia]; u.uKeyB.value = this.keymaps[ib];
    u.uLmK.value = k;
    u.uKeyChromaA.value.copy(chroma(sa.key.color));
    u.uKeyChromaB.value.copy(chroma(sb.key.color));
    const lerp = THREE.MathUtils.lerp;
    this.exposure = lerp(sa.exposure, sb.exposure, k);
    u.uSpecOccScale.value = 1.6 / Math.max(0.05, lerp(sa.stats.mean_lum, sb.stats.mean_lum, k));
    u.uMirrorGain.value = lerp(sa.mirror ?? 1, sb.mirror ?? 1, k);
    for (const e of this.emissive) {
      const ea = sa.emit[e.name] || [0, 0, 0], eb = sb.emit[e.name] || [0, 0, 0];
      e.mat.emissive.setRGB(lerp(ea[0], eb[0], k), lerp(ea[1], eb[1], k), lerp(ea[2], eb[2], k));
      e.mat.emissiveIntensity = 1;
    }
    for (const [name, o] of Object.entries(this.shafts)) {
      const s = this.states[this.stateIndex[name]];
      const w = (name === sa.name ? 1 - k : 0) + (name === sb.name ? k : 0);
      o.material.uniforms.uIntensity.value = (s.shafts || 0) * w;
      o.material.uniforms.uColor.value.setRGB(...(s.shaft_color || s.key.color)).lerp(_white, 0.35);   // luminous, not muddy
      o.visible = o.material.uniforms.uIntensity.value > 0.001;
    }
    this._keyA = sa.key; this._keyB = sb.key; this._keyK = k;
    this._keyShare = sa.key === sb.key || JSON.stringify(sa.key) === JSON.stringify(sb.key);
    this._aimKeys(this._focus);
  }

  // ---------------------------------------------------------------- per frame
  /** Register a character (or anything): it casts on the set and in the key light, and the set's shadow falls on it
   *  (out of the sun's pools it is lit by the room alone). */
  addCaster(obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.arenaShadow ??= [o.castShadow, o.receiveShadow];
      o.castShadow = o.receiveShadow = true;
      o.layers.enable(LAYER.CASTER);
    });
    this.casters.push(obj);
  }

  removeCaster(obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.layers.disable(LAYER.CASTER);
      if (o.userData.arenaShadow) { [o.castShadow, o.receiveShadow] = o.userData.arenaShadow; delete o.userData.arenaShadow; }
    });
    this.casters = this.casters.filter((c) => c !== obj);
  }

  /** Soft contact occlusion on the set: spheres [{x, y, z, r}] (two per character works: hips and chest). */
  setOccluders(list) {
    this.occluders = list;
    const n = Math.min(MAX_OCC, list.length);
    for (let i = 0; i < n; i++) { const s = list[i]; this.u.uOcc.value[i].set(s.x, s.y, s.z, s.r); }
    this.u.uOccN.value = n;
  }

  /** Let the main camera see the NO_REFLECT layer (shafts, decals). update() does this too. */
  prepareCamera(camera) { camera.layers.enable(LAYER.NO_REFLECT); }

  /** Call once per frame before rendering. camera: the game camera (default arena.camera). focus: where point keys
   *  aim for characters (default the room's middle). */
  update(dt, camera = this.camera, focus = null) {
    this.time += dt;
    if (camera) { this.camera = camera; this.prepareCamera(camera); camera.updateMatrixWorld(); }
    if (focus) this._focus = focus;
    if (this._keyA.type === 'point' || this._keyB.type === 'point') this._aimKeys(this._focus);
    for (const o of Object.values(this.shafts)) o.material.uniforms.uTime.value = this.time;
    for (const w of this.water) w.map.offset.set(w.map.offset.x + w.flow[0] * dt, w.map.offset.y + w.flow[1] * dt);
    this._envAge++;
    // the reflections follow the light: at once on a change of state, every few frames through a blend
    const eb = this._envBlend, bl = this._blend;
    if (eb && (((eb.a !== bl.a || eb.b !== bl.b) && this._envAge > 1) || (Math.abs(eb.k - bl.k) > 0.08 && this._envAge > 4))) this._captureEnv();
    this._renderCasters();
    this.renderer.shadowMap.needsUpdate = true;
    if (this.mirror && camera) {
      const hide = [...this.mirrors, ...Object.values(this.shafts)];
      this.u.uMirrorOn.value = this.mirror.render(this.renderer, this.scene, camera, hide) ? 1 : 0;
      this.u.uMirrorMatrix.value.copy(this.mirror.matrix);
    }
  }

  // ---------------------------------------------------------------- the floor plane
  /** Push a circle (x, z, radius r) out of the colliders and keep it inside the bounds.
   *  Returns {x, z, hit, nx, nz} (the same object every call; nx, nz is the last push direction). */
  resolve(x, z, r = 0.35, out = this._out) {
    let hit = false, nx = 0, nz = 0;
    for (let it = 0; it < 4; it++) {
      let moved = false;
      for (const c of this.colliders) {
        if (c.type === 'circle') {
          const dx = x - c.x, dz = z - c.z, R = c.r + r, d2 = dx * dx + dz * dz;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1e-6;
            const ux = d2 > 1e-12 ? dx / d : 1, uz = d2 > 1e-12 ? dz / d : 0;
            x = c.x + ux * R; z = c.z + uz * R; nx = ux; nz = uz; moved = hit = true;
          }
        } else {
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;
          const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
          let ox = lx - qx, oz = lz - qz;
          const d2 = ox * ox + oz * oz;
          if (d2 < r * r) {
            let px, pz;
            if (d2 > 1e-12) {
              const d = Math.sqrt(d2);
              ox /= d; oz /= d;
              px = qx + ox * r; pz = qz + oz * r;
            } else {
              const ex = c.hx - Math.abs(lx), ez = c.hz - Math.abs(lz);
              if (ex < ez) { ox = Math.sign(lx) || 1; oz = 0; px = ox * (c.hx + r); pz = lz; } else { ox = 0; oz = Math.sign(lz) || 1; px = lx; pz = oz * (c.hz + r); }
            }
            x = c.x + px * c.cos - pz * c.sin; z = c.z + px * c.sin + pz * c.cos;
            nx = ox * c.cos - oz * c.sin; nz = ox * c.sin + oz * c.cos; moved = hit = true;
          }
        }
      }
      if (!moved) break;
    }
    const b = this.bounds;
    if (x < b.minX + r) { x = b.minX + r; nx = 1; nz = 0; hit = true; }
    if (x > b.maxX - r) { x = b.maxX - r; nx = -1; nz = 0; hit = true; }
    if (z < b.minZ + r) { z = b.minZ + r; nx = 0; nz = 1; hit = true; }
    if (z > b.maxZ - r) { z = b.maxZ - r; nx = 0; nz = -1; hit = true; }
    out.x = x; out.z = z; out.hit = hit; out.nx = nx; out.nz = nz;
    return out;
  }

  /** First hit of a moving circle (radius r) from (x, z) along unit (dx, dz) within max metres, against the colliders
   *  and the bounds: {t, nx, nz, collider} or null. For projectiles and thrown rings. */
  raycast(x, z, dx, dz, max = 100, r = 0) {
    let best = null;
    const take = (t, nx, nz, c) => { if (t >= 0 && t <= max && (!best || t < best.t)) best = { t, nx, nz, collider: c }; };
    for (const c of this.colliders) {
      if (c.type === 'circle') {
        const ox = x - c.x, oz = z - c.z, R = c.r + r;
        const bq = ox * dx + oz * dz, cq = ox * ox + oz * oz - R * R, disc = bq * bq - cq;
        if (disc < 0 || cq < 0) continue;
        const t = -bq - Math.sqrt(disc);
        take(t, (ox + dx * t) / R, (oz + dz * t) / R, c);
      } else {
        const ox = x - c.x, oz = z - c.z;
        const lx = ox * c.cos + oz * c.sin, lz = -ox * c.sin + oz * c.cos;
        const ldx = dx * c.cos + dz * c.sin, ldz = -dx * c.sin + dz * c.cos;
        const hx = c.hx + r, hz = c.hz + r;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) continue;
        let t0 = -Infinity, t1 = Infinity, ax = 0, az = 0;
        for (const [o, d, h, axis] of [[lx, ldx, hx, 0], [lz, ldz, hz, 1]]) {
          if (Math.abs(d) < 1e-9) { if (Math.abs(o) > h) { t0 = Infinity; } continue; }
          let ta = (-h - o) / d, tb = (h - o) / d, s = -1;
          if (ta > tb) { [ta, tb] = [tb, ta]; s = 1; }
          if (ta > t0) { t0 = ta; ax = axis === 0 ? s : 0; az = axis === 1 ? s : 0; }
          t1 = Math.min(t1, tb);
        }
        if (t0 <= t1 && t0 >= 0) take(t0, ax * c.cos - az * c.sin, ax * c.sin + az * c.cos, c);
      }
    }
    const b = this.bounds;
    if (dx > 1e-9) take((b.maxX - r - x) / dx, -1, 0, null);
    if (dx < -1e-9) take((b.minX + r - x) / dx, 1, 0, null);
    if (dz > 1e-9) take((b.maxZ - r - z) / dz, 0, -1, null);
    if (dz < -1e-9) take((b.minZ + r - z) / dz, 0, 1, null);
    return best;
  }

  dispose() {
    this.scene.remove(this.group, this.sun, this.sun.target, this.lamp, this.lamp.target);
    if (this.scene.environment === (this.envRT && this.envRT.texture)) this.scene.environment = null;
    this.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); const m = o.material; for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); } });
    for (const t of [...this.lightmaps, ...this.keymaps]) t.dispose();
    for (const c of this.casterSlots) { c.rt.depthTexture.dispose(); c.rt.dispose(); }
    this.casterMat.dispose();
    this.cubeRT.dispose(); if (this.envRT) this.envRT.dispose(); this.pmrem.dispose();
    if (this.mirror) this.mirror.rt.dispose();
    this.sun.dispose(); this.lamp.dispose();
  }
}
