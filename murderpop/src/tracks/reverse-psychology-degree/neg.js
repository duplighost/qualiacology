// THE NEGATIVE: on every "reverse psychology" the set and THE DOCTOR flip to a photographic negative. It's a material
// uniform on the arena, the stage pieces and the figurine (never a full-frame post negative: YOU, the telegraphs, the
// projectiles and the HUD keep their true colours, and pink stays pink for a red-green colourblind eye).
// The inverse attack's holes stay true on the floor: inside them it's the real dark lacquer.
// The same injection carries a dimmer for the set (blackouts that don't touch YOU or her telegraphs).
import * as THREE from 'three';

export const NEG = {
  uRpdNeg: { value: 0 },            // 0..1 how negative the world is
  uRpdHole: { value: Array.from({ length: 5 }, () => new THREE.Vector4(0, 0, -1, 0)) },   // x, z, r, kind (0 disc, 1 strip |x - x0| < r)
  uRpdHoleN: { value: 0 },
  uRpdExpo: { value: 1 },           // the picture's exposure (the flip is done in display terms)
  uRpdCap: { value: 0.72 },          // how bright the negative's whites get (display, 0..1)
  uRpdDim: { value: 1 },            // the set's dimmer
  uRpdFlash: { value: 0 },          // a white-hot flash when an inverse lands
};

const VERT_PARS = '\nvarying vec3 vRpdW;\n';
const VERT_POS = `
#ifdef USE_INSTANCING
  vRpdW = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
#else
  vRpdW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
#endif
`;
const FRAG_PARS = `
varying vec3 vRpdW;
uniform float uRpdNeg, uRpdExpo, uRpdCap, uRpdDim, uRpdFlash;
uniform vec4 uRpdHole[ 5 ];
uniform int uRpdHoleN;
float rpdHoleMask( vec2 p ) {
  float m = 0.0;
  for ( int i = 0; i < 5; i ++ ) {
    if ( i >= uRpdHoleN ) break;
    vec4 h = uRpdHole[ i ];
    float d = h.w < 0.5 ? length( p - h.xy ) - h.z : abs( p.x - h.x ) - h.z;
    m = max( m, 1.0 - smoothstep( -0.025, 0.025, d ) );
  }
  return m;
}
// in display terms: roughly what the filmic tone map shows (a knee at 0.22), flipped, capped at uRpdCap (bone, not
// glare), and mapped back to scene light. Every shade keeps its place in the order, reversed: dark lacquer goes bone,
// brass goes dark, her porcelain goes obsidian and her jet gown white. (A hard clamp here flattened everything
// darker than mid-grey, which is nearly the whole set, into one flat grey: a silhouette, not a negative.)
vec3 rpdNegative( vec3 c ) {
  vec3 e = max( c, vec3( 0.0 ) ) * uRpdExpo;
  vec3 d = e / ( e + 0.22 );
  vec3 n = ( 1.0 - d ) * uRpdCap + 0.015;
  vec3 o = 0.22 * n / max( 1.0 - n, vec3( 0.05 ) );
  return o * vec3( 1.0, 0.96, 0.88 ) / max( uRpdExpo, 1e-3 );
}
`;
const FRAG_END = (holes, dim) => `
{
  vec3 rpdC = gl_FragColor.rgb;
  ${dim ? 'rpdC *= uRpdDim;' : ''}
  float rpdK = uRpdNeg;
  ${holes ? 'rpdK *= 1.0 - rpdHoleMask( vRpdW.xz ) * step( vRpdW.y, 0.3 );' : ''}
  if ( rpdK > 0.001 ) rpdC = mix( rpdC, rpdNegative( rpdC ) * ( 1.0 + uRpdFlash * 1.5 ), rpdK );
  gl_FragColor.rgb = rpdC;
}
`;

// her glaze flips instead of her picture: the colour under the glass inverts and the room's real light still falls on
// it, so the porcelain goes obsidian (with its white glints), the jet gown white and the crimson velvet cyan. (Her
// picture flipped would be a flat pale ghost: in this dark room nearly all of her is dark, and dark flips to light.)
// Flipped, she is kept well darker than the bone floor (x0.32): a white gown in the lawn's light vanished into it,
// and in three of the inverses the floor's one true circle is on her: she has to be easy to find.
const ALBEDO = '\ndiffuseColor.rgb = mix( diffuseColor.rgb, ( 1.0 - diffuseColor.rgb ) * 0.32, uRpdNeg );\n';

// patch a built-in material (standard, physical, basic, lambert, phong): its final colour goes through the negative.
// holes: the inverse's true discs show on it near the floor; dim: the set's dimmer applies; albedo: the figurine's mode.
export function negify(mat, { holes = false, dim = true, albedo = false } = {}) {
  if (!mat || mat.userData.rpdNeg) return mat;
  if (!(mat.isMeshStandardMaterial || mat.isMeshBasicMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial)) return mat;
  mat.userData.rpdNeg = true;
  const prev = mat.onBeforeCompile;
  const key0 = mat.customProgramCacheKey();   // (the default key is the old onBeforeCompile's source: keep it)
  mat.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    Object.assign(sh.uniforms, NEG);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + VERT_PARS)
      .replace('#include <project_vertex>', '#include <project_vertex>' + VERT_POS);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + FRAG_PARS);
    sh.fragmentShader = albedo ? sh.fragmentShader.replace('#include <alphamap_fragment>', ALBEDO + '#include <alphamap_fragment>')
      : sh.fragmentShader.replace('#include <premultiplied_alpha_fragment>', FRAG_END(holes, dim) + '#include <premultiplied_alpha_fragment>');
  };
  const tag = albedo ? '-rpdnega' : `-rpdneg${holes ? 'h' : ''}${dim ? 'd' : ''}`;
  mat.customProgramCacheKey = () => key0 + tag;
  mat.needsUpdate = true;
  return mat;
}

// every material under an object (the arena's set, a stage piece, the figurine)
export function negifyTree(root, opts = {}, filter = null) {
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    if (o.userData.rpdTrue) return;            // things that stay true (decals, beams)
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) {
      if (!m || done.has(m)) continue;
      done.add(m);
      if (filter && !filter(o, m)) continue;
      negify(m, typeof opts === 'function' ? opts(o, m) : opts);
    }
  });
}

// the holes on the floor: [{x, z, r, strip}]
export function setHoles(list) {
  const H = NEG.uRpdHole.value;
  const n = Math.min(5, list.length);
  for (let i = 0; i < 5; i++) {
    const h = list[i];
    if (i < n) H[i].set(h.x, h.z, h.r, h.strip ? 1 : 0); else H[i].set(0, 0, -1, 0);
  }
  NEG.uRpdHoleN.value = n;
}
