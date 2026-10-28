// Pasta material kit. MeshPhysicalMaterial plus:
//  - translucency (light through thin semolina: amber glow when backlit, soft wrap)
//  - per-piece color variation (aShade), macro albedo variation in world space
//  - vertex sway for hanging strands and grass (wind + pushed aside by the hero)
//  - a soft dent in cooked sheets under the hero
import * as THREE from 'three';

export const G = {
  uTime: { value: 0 },
  uHero: { value: new THREE.Vector3(0, -999, 0) },
  uHeroDent: { value: 0 },
  uWind: { value: 1 },
  uMacroTex: { value: null },
  // water (the bay): off everywhere else, so other stages pay one uniform test
  uWaterOn: { value: 0 },
  uWaterY: { value: 0 },
  uWaterCol: { value: new THREE.Color(0.64, 0.56, 0.31) },    // light scattered back by starchy water
  uWaterView: { value: new THREE.Vector3(0.064, 0.06, 0.074) }, // how fast you lose sight of things, per meter
  uWaterLight: { value: new THREE.Vector3(0.05, 0.047, 0.062) }, // how fast sunlight dies going down
  uWaterSun: { value: new THREE.Vector3(-0.72, 0.58, 0.32).normalize() },
  uCaustTex: { value: null },
};

// Caustics are drawn once into a tileable texture; underwater, two drifting copies cross.
function makeCausticTexture(N = 256) {
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = (x / N) * Math.PI * 2 - 250, py = (y / N) * Math.PI * 2 - 250;
    let ix = px, iy = py, c = 1;
    for (let n = 0; n < 4; n++) {
      const tt = 1.7 * (1 - 3.5 / (n + 1));
      const nx = px + Math.cos(tt - ix) + Math.sin(tt + iy), ny = py + Math.sin(tt - iy) + Math.cos(tt + ix);
      ix = nx; iy = ny;
      c += 1 / Math.hypot(px / (Math.sin(ix + tt) / 0.005), py / (Math.cos(iy + tt) / 0.005));
    }
    c /= 4; c = 1.17 - Math.pow(c, 1.4);
    const v = Math.min(255, Math.round(Math.pow(Math.abs(c), 7) * 255));
    const i = (y * N + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

// Shared with the water surface shader: value noise, the floating pastina rafts, caustics, the sky.
export const WATER_GLSL = /* glsl */`
float pwHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float pwVN( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( pwHash( i ), pwHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( pwHash( i + vec2( 0.0, 1.0 ) ), pwHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y ); }
// islands of pastina drifting on the surface: 1 inside a raft
float pastaRaftN( vec2 p, float t ) {
	vec2 q = p * 0.05 + vec2( t * 0.006, t * 0.0035 );
	return pwVN( q ) * 0.58 + pwVN( q * 2.7 + 3.1 ) * 0.3 + pwVN( q * 8.1 - 1.7 ) * 0.12;
}
float pastaRaft( vec2 p, float t ) { return smoothstep( 0.6, 0.64, pastaRaftN( p, t ) ); }
// tileable water caustics (after joltz0r / Dave Hoskins), three iterations
float pastaCaust( vec2 p, float t ) {
	vec2 q = mod( p * 6.28318, 6.28318 ) - 250.0;
	vec2 i = q; float c = 1.0;
	for ( int n = 0; n < 3; n++ ) {
		float tt = t * ( 1.0 - ( 3.5 / float( n + 1 ) ) );
		i = q + vec2( cos( tt - i.x ) + sin( tt + i.y ), sin( tt - i.y ) + cos( tt + i.x ) );
		c += 1.0 / length( vec2( q.x / ( sin( i.x + tt ) / 0.005 ), q.y / ( cos( i.y + tt ) / 0.005 ) ) );
	}
	c /= 3.0; c = 1.17 - pow( c, 1.4 );
	return pow( abs( c ), 8.0 );
}
`;

const SSS = /* glsl */`
	vec3 pastaUL = pastaUnderLight();
	{
		vec3 sssH = normalize( directLight.direction + geometryNormal * pastaSSSDistort );
		float sssBack = pow( saturate( dot( geometryViewDir, -sssH ) ), pastaSSSPower ) * pastaSSSScale;
		float sssNL = dot( geometryNormal, directLight.direction );
		float sssWrap = max( 0.0, ( sssNL + pastaWrap ) / ( 1.0 + pastaWrap ) ) - saturate( sssNL );
		reflectedLight.directDiffuse += directLight.color * pastaUL * material.diffuseColor * pastaSSSColor * ( sssBack + sssWrap * pastaWrapAmt ) * RECIPROCAL_PI;
	}
	vec3 irradiance = dotNL * directLight.color * pastaUL;`;

const VERT_PARS = /* glsl */`
#include <common>
#ifdef PASTA_SHADE
attribute float aShade;
varying float vPastaShade;
#endif
#if defined( PASTA_SWAY ) || defined( PASTA_DENT ) || defined( PASTA_FLAP )
uniform float uTime;
uniform vec3 uHero;
uniform float uWind;
uniform float uHeroDent;
#endif
#ifdef PASTA_SWAY
attribute float aHang;
uniform vec4 pastaSway;
#endif
#ifdef PASTA_FLAP
attribute float aWing;
uniform float pastaFlapRate;
#endif
#ifdef PASTA_WORLD
varying vec3 vPastaWorld;
#endif
varying vec3 vPastaWater;
`;

const VERT_BODY = /* glsl */`
#include <begin_vertex>
#ifdef PASTA_SHADE
vPastaShade = aShade;
#endif
#ifdef PASTA_FLAP
{
	float ph = float( gl_InstanceID ) * 1.37;
	float fa = 0.3 + 0.62 * sin( uTime * 12.0 * pastaFlapRate + ph ) + 0.15 * sin( uTime * 3.1 * pastaFlapRate + ph * 2.0 );
	float aa = fa * clamp( abs( aWing ) * 1.4 - 0.1, 0.0, 1.0 );
	float wx = transformed.x;
	transformed.x = wx * cos( aa );
	transformed.z += abs( wx ) * sin( aa );
	objectNormal = normalize( vec3( objectNormal.x * cos( aa ) - sign( wx ) * objectNormal.z * sin( aa ) * 0.0, objectNormal.y, objectNormal.z ) );
}
#endif
#if defined( PASTA_SWAY ) || defined( PASTA_DENT )
{
	mat4 pastaM = modelMatrix;
	#ifdef USE_INSTANCING
	pastaM = modelMatrix * instanceMatrix;
	#endif
	vec3 pastaW = ( pastaM * vec4( transformed, 1.0 ) ).xyz;
	vec3 pastaD = vec3( 0.0 );
	#ifdef PASTA_SWAY
	{
		float hang = aHang * aHang;
		float t = uTime * pastaSway.w;
		vec2 ph = pastaW.xz * 0.21;
		vec2 wind = vec2( sin( t * 1.3 + ph.x + ph.y * 0.7 ) + 0.5 * sin( t * 2.9 + ph.y * 1.7 ),
		                  cos( t * 1.1 + ph.y - ph.x * 0.4 ) + 0.5 * cos( t * 3.3 + ph.x * 1.3 ) );
		pastaD.xz += wind * pastaSway.x * uWind * hang;
		vec3 tv = pastaW - uHero;
		float dxz = length( tv.xz );
		float band = 1.0 - smoothstep( 0.7, 1.9, abs( tv.y + 0.1 ) );
		float push = ( 1.0 - smoothstep( pastaSway.y * 0.3, pastaSway.y, dxz ) ) * band;
		pastaD.xz += ( tv.xz / max( dxz, 1e-3 ) ) * push * pastaSway.z * hang;
		pastaD.y -= push * pastaSway.z * 0.4 * hang;
	}
	#endif
	#ifdef PASTA_DENT
	{
		vec2 dd = pastaW.xz - uHero.xz;
		float near = 1.0 - smoothstep( 0.3, 1.6, abs( pastaW.y - ( uHero.y - 0.45 ) ) );
		pastaD.y -= uHeroDent * 0.12 * exp( -dot( dd, dd ) * 2.6 ) * near;
	}
	#endif
	float pastaS2 = max( dot( pastaM[ 0 ].xyz, pastaM[ 0 ].xyz ), 1e-6 );
	transformed += ( transpose( mat3( pastaM ) ) * pastaD ) / pastaS2;
}
#endif
#ifdef PASTA_WORLD
{
	mat4 pm = modelMatrix;
	#ifdef USE_INSTANCING
	pm = modelMatrix * instanceMatrix;
	#endif
	vPastaWorld = ( pm * vec4( transformed, 1.0 ) ).xyz;
}
#endif
{
	mat4 pwm = modelMatrix;
	#ifdef USE_INSTANCING
	pwm = modelMatrix * instanceMatrix;
	#endif
	vPastaWater = ( pwm * vec4( transformed, 1.0 ) ).xyz;
}
`;

const FRAG_PARS = /* glsl */`
#include <common>
uniform vec3 pastaSSSColor;
uniform float pastaSSSScale;
uniform float pastaSSSPower;
uniform float pastaSSSDistort;
uniform float pastaWrap;
uniform float pastaWrapAmt;
#ifdef PASTA_SHADE
varying float vPastaShade;
uniform vec3 pastaShadeLo;
uniform vec3 pastaShadeHi;
#endif
#ifdef PASTA_WORLD
varying vec3 vPastaWorld;
uniform sampler2D uMacroTex;
uniform float pastaMacro;
#endif
#ifdef PASTA_TANGLE
uniform sampler2D tangleMap;
uniform sampler2D tangleNormal;
uniform float tangleScale;
uniform vec3 tangleTint;
uniform float tangleBias;
float pastaHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float pastaVN( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( pastaHash( i ), pastaHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( pastaHash( i + vec2( 0.0, 1.0 ) ), pastaHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y ); }
float tangleMaskAt( vec2 p ) { float n = pastaVN( p * 0.05 ) * 0.62 + pastaVN( p * 0.17 + 7.0 ) * 0.38 + tangleBias; return smoothstep( 0.4, 0.53, n ); }
#endif
uniform float uTime;
uniform float uWaterOn;
uniform float uWaterY;
uniform vec3 uWaterCol;
uniform vec3 uWaterView;
uniform vec3 uWaterLight;
uniform vec3 uWaterSun;
uniform sampler2D uCaustTex;
varying vec3 vPastaWater;
` + WATER_GLSL + /* glsl */`
// sunlight reaching this point through the water: dimmer with depth, rippled by caustics,
// shaded where pastina floats overhead
vec3 pastaUnderLight() {
	if ( uWaterOn < 0.5 ) return vec3( 1.0 );
	float d = uWaterY - vPastaWater.y;
	if ( d <= 0.0 ) return vec3( 1.0 );
	float sy = max( uWaterSun.y, 0.25 );
	vec2 sp = vPastaWater.xz + uWaterSun.xz / sy * d;
	vec2 cu = sp * 0.1;
	float c = min( texture2D( uCaustTex, cu + vec2( uTime * 0.021, uTime * 0.013 ) ).r,
	               texture2D( uCaustTex, cu * 1.31 + vec2( 0.37 - uTime * 0.017, uTime * 0.019 ) ).r ) * 1.7;
	float k = mix( 0.45 + 2.4 * c, 1.0, smoothstep( 3.0, 20.0, d ) * 0.65 );
	float shade = 1.0 - 0.8 * pastaRaft( sp, uTime );
	return mix( vec3( 1.0 ), exp( -uWaterLight * d / sy ) * k * shade, smoothstep( 0.0, 0.3, d ) );
}
`;

const FRAG_COLOR = /* glsl */`
#include <color_fragment>
#ifdef PASTA_SHADE
diffuseColor.rgb *= mix( pastaShadeLo, pastaShadeHi, vPastaShade );
#endif
#ifdef PASTA_WORLD
{
	vec3 mac = texture2D( uMacroTex, vPastaWorld.xz * 0.019 ).rgb;
	vec3 mac2 = texture2D( uMacroTex, vPastaWorld.xz * 0.0057 + 0.37 ).rgb;
	diffuseColor.rgb *= mix( vec3( 1.0 ), mac * mac2 * 1.17, pastaMacro );
}
#endif
#ifdef PASTA_TANGLE
float tMask = tangleMaskAt( vPastaWorld.xz );
#ifdef PASTA_TANGLE_TOP
tMask *= smoothstep( 0.82, 0.96, abs( normalize( cross( dFdx( vPastaWorld ), dFdy( vPastaWorld ) ) ).y ) );
#endif
vec3 tAlb = texture2D( tangleMap, vPastaWorld.xz * tangleScale ).rgb;
diffuseColor.rgb = mix( diffuseColor.rgb, tAlb * tangleTint, tMask );
#endif
`;

const PHYS_PARS = THREE.ShaderChunk.lights_physical_pars_fragment;
const HAS_HOOK = PHYS_PARS.includes('vec3 irradiance = dotNL * directLight.color;');
if (!HAS_HOOK) console.warn('pasta: translucency hook not found in this three.js version');
const PHYS_PARS_SSS = PHYS_PARS.replace('vec3 irradiance = dotNL * directLight.color;', SSS)
  .replace('vec3 ccIrradiance = dotNLcc * directLight.color;', 'vec3 ccIrradiance = dotNLcc * directLight.color * pastaUL;');

// Looking through water: the part of the sight line under the surface fades to the water's own color.
const WATER_FOG = /* glsl */`
if ( uWaterOn > 0.5 ) {
	vec3 P = vPastaWater, C = cameraPosition;
	float W = uWaterY, len = distance( P, C ), Lw = 0.0;
	if ( P.y < W && C.y < W ) Lw = len;
	else if ( P.y < W ) Lw = len * ( W - P.y ) / max( C.y - P.y, 1e-4 );
	else if ( C.y < W ) Lw = len * ( W - C.y ) / max( P.y - C.y, 1e-4 );
	float dP = max( W - P.y, 0.0 ), dC = max( W - C.y, 0.0 );
	gl_FragColor.rgb *= exp( -0.022 * dP );                        // less sky light reaches the deep
	if ( Lw > 0.0 ) {
		vec3 scat = uWaterCol * exp( -uWaterLight * ( dP + dC ) * 0.34 );
		vec3 tr = exp( -uWaterView * Lw );
		gl_FragColor.rgb = gl_FragColor.rgb * tr + scat * ( 1.0 - tr );
	}
}
#include <fog_fragment>`;

const FRAG_ROUGH = /* glsl */`
#include <roughnessmap_fragment>
#ifdef PASTA_TANGLE
roughnessFactor = mix( roughnessFactor, 0.3, tMask );
#endif
`;
const FRAG_NORMAL = /* glsl */`
#include <normal_fragment_maps>
#if defined( PASTA_TANGLE ) && defined( USE_NORMALMAP_TANGENTSPACE )
{
	vec3 tN = texture2D( tangleNormal, vPastaWorld.xz * tangleScale ).xyz * 2.0 - 1.0;
	tN.xy *= 1.6;
	normal = normalize( mix( normal, normalize( tbn * tN ), tMask ) );
}
#endif
`;

function onBeforeCompile(shader) {
  Object.assign(shader.uniforms, this.userData.pastaUniforms, G);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', VERT_PARS)
    .replace('#include <begin_vertex>', VERT_BODY);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', FRAG_PARS)
    .replace('#include <color_fragment>', FRAG_COLOR)
    .replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
    .replace('#include <normal_fragment_maps>', FRAG_NORMAL)
    .replace('#include <lights_physical_pars_fragment>', PHYS_PARS_SSS)
    .replace('#include <fog_fragment>', WATER_FOG);
}

/**
 * opts: color, roughness, clearcoat, clearcoatRoughness, sheen, sheenColor, sheenRoughness,
 *  normalMap, normalScale, roughnessMap, map, side, vertexColors,
 *  sss: { color, scale, power, distort, wrap, wrapAmt },
 *  shade: [loColor, hiColor] (needs aShade), sway: [windAmp, pushRadius, pushAmt, speed] (needs aHang),
 *  dent: bool, macro: number (0..1, world-space albedo variation)
 */
export function pastaMaterial(o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(o.color ?? '#f2d48e'),
    roughness: o.roughness ?? 0.5,
    metalness: 0,
    ior: 1.45,
    clearcoat: o.clearcoat ?? 0,
    clearcoatRoughness: o.clearcoatRoughness ?? 0.3,
    sheen: o.sheen ?? 0,
    sheenColor: new THREE.Color(o.sheenColor ?? '#fff1cf'),
    sheenRoughness: o.sheenRoughness ?? 0.55,
    normalMap: o.normalMap ?? null,
    normalScale: new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1),
    roughnessMap: o.roughnessMap ?? null,
    map: o.map ?? null,
    side: o.side ?? THREE.FrontSide,
    vertexColors: !!o.vertexColors,
    flatShading: !!o.flatShading,
  });
  const s = o.sss ?? {};
  m.userData.pastaUniforms = {
    pastaSSSColor: { value: new THREE.Color(s.color ?? '#ffb04d') },
    pastaSSSScale: { value: s.scale ?? 1.2 },
    pastaSSSPower: { value: s.power ?? 3.0 },
    pastaSSSDistort: { value: s.distort ?? 0.3 },
    pastaWrap: { value: s.wrap ?? 0.5 },
    pastaWrapAmt: { value: s.wrapAmt ?? 0.5 },
    pastaShadeLo: { value: new THREE.Color(o.shade?.[0] ?? '#ffffff') },
    pastaShadeHi: { value: new THREE.Color(o.shade?.[1] ?? '#ffffff') },
    pastaSway: { value: new THREE.Vector4(...(o.sway ?? [0, 1, 0, 1])) },
    pastaMacro: { value: o.macro ?? 0 },
    pastaFlapRate: { value: o.flapRate ?? 1 },
  };
  m.defines = m.defines || {};
  if (o.shade) m.defines.PASTA_SHADE = '';
  if (o.sway) m.defines.PASTA_SWAY = '';
  if (o.dent) m.defines.PASTA_DENT = '';
  if (o.macro) m.defines.PASTA_WORLD = '';
  if (o.flap) m.defines.PASTA_FLAP = '';
  if (o.tangle) {
    m.defines.PASTA_TANGLE = '';
    if (o.tangle.topOnly) m.defines.PASTA_TANGLE_TOP = '';
    Object.assign(m.userData.pastaUniforms, { tangleMap: { value: o.tangle.map }, tangleNormal: { value: o.tangle.normal }, tangleScale: { value: 1 / o.tangle.tile }, tangleTint: { value: new THREE.Color(o.tangle.tint ?? '#ffffff') }, tangleBias: { value: o.tangle.bias ?? 0 } });
  }
  m.onBeforeCompile = onBeforeCompile;
  return m;
}

// The shared kit. Every surface in the world draws from these roles.
export function makeKit(T) {
  G.uMacroTex.value = T.albedo;
  G.uCaustTex.value = makeCausticTexture();
  const tex = (n, tile) => T.at(n, 1 / tile); // UVs are in meters; tile = meters per texture repeat
  const COOKED_SSS = { color: '#ffae4a', scale: 1.7, power: 2.6, distort: 0.25, wrap: 0.6, wrapAmt: 0.55 };
  const DRY_SSS = { color: '#ffb04a', scale: 1.6, power: 3.2, distort: 0.2, wrap: 0.3, wrapAmt: 0.3 };
  const SHEET_SSS = { color: '#ffb35a', scale: 0.6, power: 3.0, distort: 0.3, wrap: 0.5, wrapAmt: 0.45 };
  const K = {};

  // Cooked spaghetti: pale, wet starch coat, glows when backlit.
  K.cookedStrand = pastaMaterial({ color: '#f0cf80', roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.24, sheen: 0.15,
    normalMap: tex('nPores', 0.14), normalScale: 0.35, roughnessMap: tex('rough', 0.3), sss: COOKED_SSS });
  // Hero: same, a touch richer.
  K.hero = pastaMaterial({ color: '#ecc466', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.14, sheen: 0.0,
    normalMap: tex('nPores', 0.12), normalScale: 0.3, roughnessMap: tex('rough', 0.25), sss: COOKED_SSS });
  K.heroCore = pastaMaterial({ color: '#d9b366', roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3,
    normalMap: tex('nPores', 0.2), normalScale: 0.6, sss: { ...COOKED_SSS, scale: 0.5 } });
  // Cooked lasagna sheets (the ground, cliffs).
  K.sheet = pastaMaterial({ color: '#f4d488', roughness: 0.48, clearcoat: 0.45, clearcoatRoughness: 0.22, sheen: 0.2,
    normalMap: tex('nPores', 0.7), normalScale: 0.9, roughnessMap: tex('rough', 1.1), map: tex('albedo', 1.6),
    sss: SHEET_SSS, macro: 0.8, vertexColors: true, tangle: { map: T.tangle, normal: T.tangleN, tile: 2.6, tint: '#fff6e8', topOnly: true } });
  // the select island: a sheet mostly buried in a bed of spaghetti
  K.bed = pastaMaterial({ color: '#f4d488', roughness: 0.48, clearcoat: 0.45, clearcoatRoughness: 0.22, sheen: 0.2,
    normalMap: tex('nPores', 0.7), normalScale: 0.9, roughnessMap: tex('rough', 1.1), map: tex('albedo', 1.6),
    sss: SHEET_SSS, macro: 0.8, vertexColors: true, tangle: { map: T.tangle, normal: T.tangleN, tile: 1.9, tint: '#fff6e8', topOnly: true, bias: 0.32 } });
  K.sheetVerde = pastaMaterial({ color: '#7f9f48', roughness: 0.52, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.2,
    normalMap: tex('nPores', 0.7), normalScale: 0.9, roughnessMap: tex('rough', 1.1), map: tex('albedo', 1.6),
    sss: { ...SHEET_SSS, color: '#c8ff6a' }, macro: 0.7 });
  K.ground = pastaMaterial({ color: '#f2d184', roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.2, sheen: 0.2,
    normalMap: tex('nPores', 1.5), normalScale: 1.35, roughnessMap: tex('rough', 1.3), map: tex('albedo', 2.2),
    sss: SHEET_SSS, macro: 1.0, dent: true, tangle: { map: T.tangle, normal: T.tangleN, tile: 2.6, tint: '#fff6e8' } });
  // Dry durum: amber, bronze-die streaks, glassy translucency.
  K.dry = pastaMaterial({ color: '#efcb7c', roughness: 0.6, clearcoat: 0.16, clearcoatRoughness: 0.4, sheen: 0.25, sheenColor: '#fff6dc',
    normalMap: tex('nStriate', 0.18), normalScale: 0.7, roughnessMap: tex('rough', 0.35), sss: DRY_SSS });
  K.dryShade = pastaMaterial({ color: '#efcb7c', roughness: 0.6, clearcoat: 0.16, clearcoatRoughness: 0.4, sheen: 0.25,
    normalMap: tex('nStriate', 0.18), normalScale: 0.7, roughnessMap: tex('rough', 0.35), sss: DRY_SSS,
    shade: ['#e2ae55', '#fff0c0'] });
  K.dryBig = pastaMaterial({ color: '#edc679', roughness: 0.58, clearcoat: 0.14, clearcoatRoughness: 0.4, sheen: 0.25,
    normalMap: tex('nStriate', 0.6), normalScale: 0.8, roughnessMap: tex('rough', 0.9), map: tex('albedo', 1.2), sss: { ...DRY_SSS, scale: 0.9 } });
  // Whole-wheat dry rods (tree trunks, pillars).
  K.wheat = pastaMaterial({ color: '#d2a774', roughness: 0.66, clearcoat: 0.1, clearcoatRoughness: 0.45, sheen: 0.3, sheenColor: '#ffe6c4',
    normalMap: tex('nStriate', 0.2), normalScale: 0.8, roughnessMap: tex('rough', 0.4), sss: { ...DRY_SSS, color: '#ffc27a', scale: 0.45 },
    shade: ['#c79a66', '#f0cf9e'] });
  // Spinach spaghetti (willow curtains), capellini grass.
  K.verdeStrand = pastaMaterial({ color: '#86a84c', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.15,
    normalMap: tex('nPores', 0.14), normalScale: 0.3, sss: { ...COOKED_SSS, color: '#d9ff7a', scale: 1.9 },
    shade: ['#5c7d2c', '#b4c86a'], sway: [0.16, 1.5, 0.9, 0.8] });
  K.grass = pastaMaterial({ color: '#ffffff', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.25,
    sss: { ...COOKED_SSS, color: '#e2ff8a', scale: 2.2 }, sway: [0.06, 0.95, 0.42, 1.2], side: THREE.DoubleSide });
  K.grassGold = pastaMaterial({ color: '#ffffff', roughness: 0.48, clearcoat: 0.4, clearcoatRoughness: 0.25,
    sss: { ...COOKED_SSS, scale: 2.2 }, sway: [0.06, 0.95, 0.42, 1.2], side: THREE.DoubleSide });
  // Colored doughs for flowers, butterflies, snails.
  K.tomato = pastaMaterial({ color: '#e0743f', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.2,
    normalMap: tex('nPores', 0.12), normalScale: 0.5, sss: { ...COOKED_SSS, color: '#ff6a2a', scale: 1.6 } });
  K.beet = pastaMaterial({ color: '#c0506a', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.2,
    normalMap: tex('nPores', 0.12), normalScale: 0.5, sss: { ...COOKED_SSS, color: '#ff4f7a', scale: 1.6 } });
  K.turmeric = pastaMaterial({ color: '#f2b52c', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.2,
    normalMap: tex('nPores', 0.12), normalScale: 0.5, sss: { ...COOKED_SSS, scale: 1.6 } });
  K.ink = pastaMaterial({ color: '#2b2a2c', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.1,
    normalMap: tex('nPores', 0.12), normalScale: 0.5, sss: { ...COOKED_SSS, color: '#5a4a6a', scale: 0.4 } });
  K.flower = pastaMaterial({ color: '#ffffff', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.2,
    normalMap: tex('nPores', 0.12), normalScale: 0.5, sss: { ...COOKED_SSS, scale: 1.8 }, side: THREE.DoubleSide });
  K.flower.vertexColors = false;
  K.butterfly = pastaMaterial({ color: '#ffffff', roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.35, sheen: 0.3,
    normalMap: tex('nStriate', 0.1), normalScale: 0.6, sss: { ...DRY_SSS, scale: 2.4 }, side: THREE.DoubleSide, flap: true });
  K.rigatoni = pastaMaterial({ color: '#efc86f', roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.25, sheen: 0.15,
    normalMap: tex('nPores', 0.45), normalScale: 0.8, roughnessMap: tex('rough', 0.8), map: tex('albedo', 1.4), sss: { ...COOKED_SSS, scale: 1.1 } });
  K.cookedRibbon = pastaMaterial({ color: '#f1c463', roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.2, sheen: 0.15,
    normalMap: tex('nPores', 0.2), normalScale: 0.5, roughnessMap: tex('rough', 0.4), sss: { ...COOKED_SSS, scale: 1.8 } });
  K.nest = pastaMaterial({ color: '#efcb7d', roughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.4, sheen: 0.3,
    normalMap: tex('nStriate', 0.15), normalScale: 0.8, sss: DRY_SSS, shade: ['#e3b663', '#fff0c4'] });
  K.star = pastaMaterial({ color: '#f2bd4e', roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: '#fff3d0',
    normalMap: tex('nStriate', 0.35), normalScale: 0.8, roughnessMap: tex('rough', 0.6), sss: { ...DRY_SSS, scale: 2.6 } });
  K.verdeSolid = pastaMaterial({ color: '#7f9f46', roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.22, sheen: 0.15,
    normalMap: tex('nPores', 0.15), normalScale: 0.5, sss: { ...COOKED_SSS, color: '#d9ff7a', scale: 1.5 } });
  // ---- the dry fortress: teflon-die smooth, glassy, amber at thin edges
  K.dryStack = pastaMaterial({ color: '#efc675', roughness: 0.34, clearcoat: 0.3, clearcoatRoughness: 0.18, sheen: 0.2, sheenColor: '#fff4d8',
    normalMap: tex('nStriate', 0.5), normalScale: 0.55, roughnessMap: tex('rough', 0.9), map: tex('albedo', 1.4),
    sss: { ...DRY_SSS, scale: 1.1, power: 2.6 }, macro: 0.5, vertexColors: true });
  K.drySheet = pastaMaterial({ color: '#e6b85c', roughness: 0.46, clearcoat: 0.14, clearcoatRoughness: 0.38, sheen: 0.12,
    normalMap: tex('nStriate', 0.6), normalScale: 0.6, roughnessMap: tex('rough', 1.0), map: tex('albedo', 1.6),
    sss: { ...DRY_SSS, scale: 1.4 }, macro: 0.6, side: THREE.DoubleSide });
  // cooked spinach lasagna: the only thing on a dry wall that holds you
  K.banner = pastaMaterial({ color: '#8aab4e', roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.16, sheen: 0.15,
    normalMap: tex('nPores', 0.35), normalScale: 0.5, roughnessMap: tex('rough', 0.6), sss: { ...COOKED_SSS, color: '#d4ff6e', scale: 1.9 },
    sway: [0.05, 0.1, 0.0, 0.7], side: THREE.DoubleSide });
  K.beetDry = pastaMaterial({ color: '#a83c55', roughness: 0.5, clearcoat: 0.16, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: '#ffc0cc',
    normalMap: tex('nStriate', 0.22), normalScale: 0.7, roughnessMap: tex('rough', 0.4), sss: { ...DRY_SSS, color: '#ff4a72', scale: 0.9 } });
  K.inkDry = pastaMaterial({ color: '#2b2622', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.25, sheen: 0.35, sheenColor: '#8a7a68',
    normalMap: tex('nStriate', 0.25), normalScale: 0.7, sss: { ...DRY_SSS, color: '#6a4a3a', scale: 0.3 } });
  // ---- the face: orecchiette with squid-ink pastina pupils
  K.eye = pastaMaterial({ color: '#f7e7bf', roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.16, sheen: 0.1,
    normalMap: tex('nPores', 0.08), normalScale: 0.4, sss: { ...COOKED_SSS, scale: 1.4 } });
  K.pupil = pastaMaterial({ color: '#141214', roughness: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.06,
    sss: { ...COOKED_SSS, color: '#30283a', scale: 0.2 } });
  // ---- the mountain
  // Its orzo texture is drawn on first use, so the snow and the drifts are made the first time the mountain asks.
  const rep = (t, r) => { const c = t.clone(); c.repeat.set(r, r); c.needsUpdate = true; return c; };
  // snow: drifts of orzo
  const snowOf = (map, normalMap) => pastaMaterial({ color: '#ffffff', roughness: 0.8, clearcoat: 0.06, clearcoatRoughness: 0.5, sheen: 0.45, sheenColor: '#fffaf0',
    map, normalMap, normalScale: 1.2, sss: { ...DRY_SSS, color: '#fff1d2', scale: 0.6, wrap: 0.6, wrapAmt: 0.5 }, macro: 0.25, vertexColors: true });
  let snow = null, drift = null;
  Object.defineProperty(K, 'snow', { get: () => snow || (snow = snowOf(rep(T.orzo, 1 / 1.5), rep(T.orzoN, 1 / 1.5))) });
  // the island's patch of it: a quarter-size piece of orzo, repeated twice as often
  K.snowPatch = snowOf(rep(T.orzoSmall, 1 / 0.75), rep(T.orzoSmallN, 1 / 0.75));
  // the plain of deep drifts round the mountain (no vertex colors: one big flat plane)
  Object.defineProperty(K, 'drift', { get: () => drift || (drift = pastaMaterial({ color: '#f6f1e6', roughness: 0.85, sheen: 0.45, sheenColor: '#fffaf0',
    map: rep(T.orzo, 1 / 2.6), normalMap: rep(T.orzoN, 1 / 2.6), normalScale: 1.0, sss: { ...DRY_SSS, color: '#fff1d2', scale: 0.6 }, macro: 0.35 })) });
  // the run: one long ribbon of cooked lasagna, wet and slick
  K.run = pastaMaterial({ color: '#f3d283', roughness: 0.24, clearcoat: 0.85, clearcoatRoughness: 0.07, sheen: 0.15,
    normalMap: tex('nPores', 0.6), normalScale: 0.5, roughnessMap: tex('rough', 1.2), map: tex('albedo', 1.6),
    sss: { ...SHEET_SSS, scale: 0.9 }, vertexColors: true, side: THREE.DoubleSide });
  // pine tiers of spinach lasagna, their tops white with orzo (vertex colors carry both)
  K.pine = pastaMaterial({ color: '#ffffff', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.25, sheen: 0.2,
    normalMap: tex('nPores', 0.4), normalScale: 0.6, sss: { ...COOKED_SSS, color: '#d4ff7a', scale: 1.3 }, vertexColors: true, side: THREE.DoubleSide });
  // falling stelline
  K.flake = pastaMaterial({ color: '#fbf3df', roughness: 0.55, clearcoat: 0.1, sheen: 0.4, sss: { ...DRY_SSS, scale: 1.2 }, side: THREE.DoubleSide });
  // ---- the bay
  const sa = T.pastina.clone(); sa.repeat.set(1 / 1.7, 1 / 1.7); sa.needsUpdate = true;
  const sn = T.pastinaN.clone(); sn.repeat.set(1 / 1.7, 1 / 1.7); sn.needsUpdate = true;
  // sand of pastina: wet and darker below the waterline (vertex colors)
  K.sand = pastaMaterial({ color: '#ffffff', roughness: 0.72, clearcoat: 0.08, clearcoatRoughness: 0.5, sheen: 0.25,
    map: sa, normalMap: sn, normalScale: 1.1, sss: { ...DRY_SSS, scale: 0.35 }, macro: 0.55, vertexColors: true });
  // mafaldine kelp: long ruffled ribbons of cooked pasta, colored per instance
  K.kelp = pastaMaterial({ color: '#ffffff', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.2, sheen: 0.15,
    normalMap: tex('nPores', 0.25), normalScale: 0.4, sss: { ...COOKED_SSS, color: '#e2ff8a', scale: 2.0 },
    sway: [1.15, 1.9, 1.35, 0.32], side: THREE.DoubleSide });
  // a giant cooked conchiglione
  K.shell = pastaMaterial({ color: '#f2d08a', roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.18, sheen: 0.18,
    normalMap: tex('nPores', 0.5), normalScale: 0.7, roughnessMap: tex('rough', 0.9), map: tex('albedo', 1.4),
    sss: { ...COOKED_SSS, scale: 1.4 }, side: THREE.DoubleSide });
  // farfalle swimming like rays: slow wingbeats
  K.ray = pastaMaterial({ color: '#ffffff', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.25, sheen: 0.25,
    normalMap: tex('nStriate', 0.1), normalScale: 0.6, sss: { ...COOKED_SSS, scale: 2.2 }, side: THREE.DoubleSide, flap: true, flapRate: 0.3 });
  // Pastina sea.
  const pa = T.pastina.clone(); pa.repeat.set(1 / 5.2, 1 / 5.2); pa.needsUpdate = true;
  const pn = T.pastinaN.clone(); pn.repeat.set(1 / 5.2, 1 / 5.2); pn.needsUpdate = true;
  K.pastina = pastaMaterial({ color: '#ffffff', roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.3,
    map: pa, normalMap: pn, normalScale: 1.4, sss: { ...DRY_SSS, scale: 0.5 } });
  return K;
}
