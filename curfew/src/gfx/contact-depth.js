import * as THREE from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// World depth is sampled before the gun clears it. One full-screen pass, no
// duplicate scene render, no temporal noise, no extra lights or shadow maps.
//
// D18: 16 taps (was 12) and the shade cap opens from .32 to .40 through night and the black
// hour. The per-tap weight is scaled by 12/16 so the same crevice reads the same mean shade;
// the extra taps buy a smoother ring where four pinned them to a visible pattern on flat ground.
const TAPS = 16;
const SHADE_PER_TAP = 0.115 * 12 / TAPS;   // the 12-tap pass's .115, held per tap
const CAP_DAY = 0.32;                      // dusk and dawn: the old ceiling
const CAP_NIGHT = 0.40;                    // night and black: a deeper seat under every trunk and sill
const CAP_EASE = 1.5;                      // /s, so a phase change is not a step in the frame
export class ContactDepthPass extends ShaderPass {
  constructor(ctx){
    super({name:'CountyContactDepth',uniforms:{tDiffuse:{value:null},tDepth:{value:null},uInvProjection:{value:new THREE.Matrix4()},uResolution:{value:new THREE.Vector2(1,1)},uProjectionY:{value:1},uShadeCap:{value:CAP_DAY}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`
        uniform sampler2D tDiffuse,tDepth;
        uniform mat4 uInvProjection;
        uniform vec2 uResolution;
        uniform float uProjectionY;
        uniform float uShadeCap;
        varying vec2 vUv;
        vec3 positionAt(vec2 uv){float d=texture2D(tDepth,uv).r;vec4 p=uInvProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);return p.xyz/p.w;}
        void main(){
          vec4 color=texture2D(tDiffuse,vUv);
          float depth=texture2D(tDepth,vUv).r;
          if(depth>.999998){gl_FragColor=color;return;}
          vec3 p=positionAt(vUv);
          vec2 px=1.0/uResolution;
          // Choose the smaller depth discontinuity on each axis; silhouette
          // edges cannot masquerade as a surface normal and grow black halos.
          vec3 dl=p-positionAt(vUv-vec2(px.x,0.0)),dr=positionAt(vUv+vec2(px.x,0.0))-p;
          vec3 db=p-positionAt(vUv-vec2(0.0,px.y)),dt=positionAt(vUv+vec2(0.0,px.y))-p;
          vec3 n=normalize(cross(abs(dl.z)<abs(dr.z)?dl:dr,abs(db.z)<abs(dt.z)?db:dt));
          if(dot(n,-p)<0.0)n=-n;
          float radius=clamp(.9*uProjectionY/max(.5,-p.z),.0006,.08);
          float occ=0.0;
          for(int i=0;i<${TAPS};i++){
            float a=float(i)*2.39996323;
            float ring=.3+.7*sqrt((float(i)+.5)/${TAPS}.0);
            vec2 uv=vUv+vec2(cos(a)*uResolution.y/uResolution.x,sin(a))*radius*ring;
            if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)continue;
            vec3 delta=positionAt(uv)-p;
            float d=length(delta);
            float horizon=max(0.0,dot(n,delta)/max(.001,d)-.12);
            occ+=horizon*(1.0-smoothstep(.08,1.8,d));
          }
          float shade=clamp(occ*${SHADE_PER_TAP.toFixed(5)},0.0,uShadeCap)*(1.0-smoothstep(70.0,160.0,-p.z));
          // Preserve luminous organs and lamps while grounding their housings.
          float light=max(color.r,max(color.g,color.b));
          color.rgb*=1.0-shade*(1.0-smoothstep(.7,2.5,light));
          gl_FragColor=color;
        }`});
    this.ctx=ctx;
  }
  setSize(w,h){this.uniforms.uResolution.value.set(w,h);}
  render(renderer,writeBuffer,readBuffer,dt,mask){
    this.uniforms.tDepth.value=readBuffer.depthTexture;
    this.uniforms.uInvProjection.value.copy(this.ctx.camera.projectionMatrixInverse);
    this.uniforms.uProjectionY.value=this.ctx.camera.projectionMatrix.elements[5];
    // The cap follows the clock's phase (ctx.shared.phase is 'dusk'|'night'|'black'|'dawn'),
    // eased so the seat under a trunk deepens over a second rather than on the frame.
    const ph=this.ctx.shared&&this.ctx.shared.phase;
    const want=(ph==='night'||ph==='black')?CAP_NIGHT:CAP_DAY;
    const u=this.uniforms.uShadeCap;
    const k=1-Math.exp(-CAP_EASE*(dt>0&&dt<1?dt:1/60));
    u.value+=(want-u.value)*k;
    super.render(renderer,writeBuffer,readBuffer,dt,mask);
  }
}
