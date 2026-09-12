import * as THREE from 'three';
import {BOSSES} from '../world/boss-catalog.js';

export const FINISHES = Object.freeze([
  {id:'original', name:'Worn steel', location:'Original finish', pattern:'original', colors:{base:0x28313b,accent:0x8e7960}, index:0},
  ...BOSSES.map((b,i)=>({...b.skin, location:b.location, boss:b.name, index:i+1})),
]);
export const FINISH_BY_ID = Object.freeze(Object.fromEntries(FINISHES.map(f=>[f.id,f])));

// All ten finishes share one shader. Equipping changes uniforms, never the number of
// materials, lights or compiled programs. The same finish works on every weapon's metal,
// wood and grip, including subsequently acquired guns. Sights and gloves stay readable.
const HEADER = `
varying vec3 vFinishPosition;
uniform float uFinishIndex, uFinishStrength;
uniform vec3 uFinishBase, uFinishAccent;
float finishHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float finishPattern(vec3 p, float id){
  p*=110.0; float n=finishHash(floor(p*2.0)); float a=0.0;
  if(id<1.5){vec2 q=p.yz*1.3;q.x+=mod(floor(q.y),2.0)*.5;float r=length(fract(q)-.5);a=1.0-smoothstep(.012,.036,abs(r-.37));}
  else if(id<2.5){
    // A few irregular longitudinal copper veins, with fine intermittent branches.
    vec2 q=p.zy;float vein=abs(sin((q.y-.20*sin(q.x*.43)-.08*sin(q.x*1.7))*.55));
    float branch=abs(sin((q.y+q.x*.24)*.85));
    a=max(1.0-smoothstep(.028,.12,vein),(1.0-smoothstep(.02,.085,branch))*step(.45,sin(q.x*.37))*.72);
  }
  else if(id<3.5){a=smoothstep(.985,.999,cos(length(p.yz)*2.3));}
  else if(id<4.5){a=pow(abs(sin(p.z*2.4+sin(p.y*.6))),42.0)*(.4+.6*abs(sin(p.y)));}
  else if(id<5.5){vec3 q=fract(p*.7)-.5;float r=max(abs(q.x+sin(p.y)*.08),abs(q.z+sin(p.x)*.1));a=1.0-smoothstep(.012,.038,abs(r-.44));}
  else if(id<6.5){vec3 q=fract(p*.6)-.5;a=pow(max(0.0,1.0-length(q)*3.0),5.0)+step(.98,n)*.5;}
  else if(id<7.5){a=pow(abs(sin(p.x*.4+sin(p.z*.8)+sin(p.y*.9))),48.0);}
  else if(id<8.5){a=pow(abs(sin(p.z*1.7+abs(p.y)*.8)),36.0)*(.55+.45*sin(p.y*.7));}
  else if(id<9.5){a=smoothstep(.985,.999,abs(sin(p.z*1.2+abs(sin(p.y*.45))*4.0)));}
  else if(id<10.5){a=pow(abs(sin(p.z*1.8)),42.0)*smoothstep(.15,.75,abs(sin(p.y*.4)));}
  else {a=pow(abs(sin(p.y*1.7+sin(p.z*.65)*2.0)),28.0)*smoothstep(.15,.65,abs(sin(p.z*.23)));}
  return clamp(a,0.0,1.0);
}
`;
const SURFACE = `
if(uFinishIndex>.5 && uFinishStrength>0.0){
  float f=finishPattern(vFinishPosition,uFinishIndex);
  // A visibly distinct dark patina, retaining the source material's colour and light response.
  // Inlays stay local to the pattern; they never replace the whole surface.
  vec3 ground=mix(diffuseColor.rgb,uFinishBase*.78,.55*uFinishStrength);
  vec3 inlay=mix(ground,uFinishAccent*.45,.72);
  diffuseColor.rgb=mix(ground,inlay,smoothstep(.08,.72,f)*uFinishStrength);
}
`;

export function finishMaterial(material, strength=1) {
  if(material.userData.finishUniforms)return material;
  const previous=material.onBeforeCompile;
  const cache=material.customProgramCacheKey();
  const uniforms={uFinishIndex:{value:0},uFinishStrength:{value:strength},uFinishBase:{value:new THREE.Color()},uFinishAccent:{value:new THREE.Color()}};
  material.userData.finishUniforms=uniforms;
  material.userData.finishOriginal={roughness:material.roughness,metalness:material.metalness};
  material.onBeforeCompile=shader=>{
    previous.call(material,shader);
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFinishPosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+HEADER)
      .replace('#include <color_fragment>','#include <color_fragment>\n'+SURFACE);
  };
  material.customProgramCacheKey=()=>cache+'-trophies-3';
  material.needsUpdate=true;
  return material;
}

export function setMaterialFinish(material,id){
  const u=material.userData.finishUniforms;if(!u)return;
  const f=FINISH_BY_ID[id]||FINISHES[0],o=material.userData.finishOriginal;
  u.uFinishIndex.value=f.index;
  u.uFinishBase.value.setHex(f.colors.base);u.uFinishAccent.value.setHex(f.colors.accent);
  // Pearl, wet sap, tarnished brass, bone, fired ceramic, opal and frost have distinct light responses.
  const response=[[0,0],[.34,.48],[.7,.1],[.4,.72],[.6,.2],[.58,.44],[.35,.62],[.28,.5],[.54,.35],[.72,.3],[.46,.56],[.72,.18]][f.index]||[.65,.25];
  material.roughness=f.index?o.roughness*.65+response[0]*.35:o.roughness;
  material.metalness=f.index?o.metalness*.80+response[1]*.20:o.metalness;
}
