const l=`
  float wetHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float wetNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wetHash(i), wetHash(i + vec2(1.0, 0.0)), f.x), mix(wetHash(i + vec2(0.0, 1.0)), wetHash(i + vec2(1.0, 1.0)), f.x), f.y); }`;function c(e,{wet:o=.45,puddles:r=.55,scale:u=.22,puddleRough:n=.12}={}){const a={uWet:{value:o},uPuddles:{value:r},uWetScale:{value:u},uPuddleRough:{value:n}};return e.userData.wet=a,e.onBeforeCompile=t=>{Object.assign(t.uniforms,a),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vWetWorld;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
        vec4 wetWp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wetWp = instanceMatrix * wetWp;
        #endif
        vWetWorld = (modelMatrix * wetWp).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
        varying vec3 vWetWorld;
        uniform float uWet, uPuddles, uWetScale, uPuddleRough;
        ${l}
        float wetMask;`).replace("#include <map_fragment>",`#include <map_fragment>
        {
          vec2 wp = vWetWorld.xz * uWetScale;
          float n = wetNoise(wp) * 0.65 + wetNoise(wp * 3.1 + 7.0) * 0.35;
          float puddle = smoothstep(1.0 - uPuddles, 1.0 - uPuddles + 0.08, n);
          wetMask = max(uWet, puddle);
          diffuseColor.rgb *= mix(1.0, 0.45, wetMask);
        }`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, mix(roughnessFactor * 0.6, uPuddleRough, step(0.999, wetMask)), wetMask);`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
        normal = normalize(mix(normal, nonPerturbedNormal, step(0.999, wetMask)));`).replace("#include <opaque_fragment>",`#include <opaque_fragment>
        gl_FragColor.a = 1.0 - wetMask;`)},e.customProgramCacheKey=()=>"olly-wet-1",e.needsUpdate=!0,e}export{c as m};
