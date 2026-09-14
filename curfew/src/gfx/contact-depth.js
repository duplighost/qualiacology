import * as THREE from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// World depth is sampled before the gun clears it. One full-screen pass, no
// duplicate scene render, no temporal noise, no extra lights or shadow maps.
export class ContactDepthPass extends ShaderPass {
  constructor(ctx){
    super({name:'CountyContactDepth',uniforms:{tDiffuse:{value:null},tDepth:{value:null},uInvProjection:{value:new THREE.Matrix4()},uResolution:{value:new THREE.Vector2(1,1)},uProjectionY:{value:1}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`
        uniform sampler2D tDiffuse,tDepth;
        uniform mat4 uInvProjection;
        uniform vec2 uResolution;
        uniform float uProjectionY;
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
          for(int i=0;i<12;i++){
            float a=float(i)*2.39996323;
            float ring=.3+.7*sqrt((float(i)+.5)/12.0);
            vec2 uv=vUv+vec2(cos(a)*uResolution.y/uResolution.x,sin(a))*radius*ring;
            if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0)continue;
            vec3 delta=positionAt(uv)-p;
            float d=length(delta);
            float horizon=max(0.0,dot(n,delta)/max(.001,d)-.12);
            occ+=horizon*(1.0-smoothstep(.08,1.8,d));
          }
          float shade=clamp(occ*.115,0.0,.32)*(1.0-smoothstep(70.0,160.0,-p.z));
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
    super.render(renderer,writeBuffer,readBuffer,dt,mask);
  }
}
