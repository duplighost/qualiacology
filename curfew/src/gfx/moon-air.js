import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

// Integrate moonlight through the current shadow map. Scene depth ends each ray
// at the first visible surface; buildings and the moving canopy shade the air.
// A small spatial field has no history buffer, so it cannot leave motion trails.
export class MoonAirField {
  constructor(ctx) {
    this.ctx=ctx;
    this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
    this.target.texture.name='county-shadowed-moon-air';
    this.uniforms={
      tDepth:{value:null},tShadow:{value:null},uInvProjection:{value:new THREE.Matrix4()},
      uCameraWorld:{value:new THREE.Matrix4()},uShadowMatrix:{value:new THREE.Matrix4()},
      uEye:{value:new THREE.Vector3()},uToMoon:{value:new THREE.Vector3()},
      uRadiance:{value:new THREE.Color()},uDensity:{value:.01},uGain:{value:.055},uReady:{value:0}
    };
    this.material=new THREE.ShaderMaterial({name:'CountyShadowedMoonAir',uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tDepth,tShadow;
        uniform mat4 uInvProjection,uCameraWorld,uShadowMatrix;
        uniform vec3 uEye,uToMoon,uRadiance;
        uniform float uDensity,uGain,uReady;
        void main(){
          float depth=textureLod(tDepth,vUv,0.0).r;
          vec4 vp=uInvProjection*vec4(vUv*2.0-1.0,depth*2.0-1.0,1.0);
          vec3 p=vp.xyz/max(vp.w,.00001);
          float viewDepth=min(-p.z,200.0);
          gl_FragColor=vec4(0.0,0.0,0.0,viewDepth);
          if(uReady<.5 || uGain<=0.0)return;
          vec3 ray=normalize(mat3(uCameraWorld)*normalize(p));
          float lengthM=min(length(p),72.0);
          float stepM=lengthM/24.0;
          float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
          float litAir=0.0;
          for(int i=0;i<24;i++){
            float distanceM=(float(i)+.2+jitter*.6)*stepM;
            vec3 world=uEye+ray*distanceM;
            vec4 projected=uShadowMatrix*vec4(world,1.0);
            vec3 s=projected.xyz/projected.w;
            // Fade the integration before the finite shadow volume ends. Treating
            // missing shadow data as lit would put a glowing box around the player.
            float border=min(min(s.x,1.0-s.x),min(s.y,1.0-s.y));
            float valid=smoothstep(.015,.085,border)*step(0.0,s.z)*step(s.z,1.0);
            float blocker=unpackRGBAToDepth(textureLod(tShadow,clamp(s.xy,vec2(0.0),vec2(1.0)),0.0));
            float lit=step(s.z-.00035,blocker)*valid;
            float optical=uDensity*uDensity*distanceM*distanceM;
            float segment=2.0*uDensity*uDensity*distanceM*exp(-optical)*stepM;
            // Thin the suspended ground mist above the viewing horizon, so
            // scattered light separates woodland layers without bleaching sky.
            float heightFalloff=exp(-max(ray.y*distanceM,0.0)*.055);
            litAir+=lit*segment*heightFalloff;
          }
          float phase=.4+.6*pow(max(0.0,dot(ray,uToMoon)),3.0);
          gl_FragColor=vec4(uRadiance*(uGain*phase*litAir),viewDepth);
        }`});
    this.quad=new FullScreenQuad(this.material);
  }
  setSize(w,h){this.target.setSize(Math.max(1,Math.ceil(w/4)),Math.max(1,Math.ceil(h/4)));}
  render(renderer,depth){
    const u=this.uniforms,camera=this.ctx.camera,moon=this.ctx.systems.get('lights')?.moon;
    u.tDepth.value=depth;u.uInvProjection.value.copy(camera.projectionMatrixInverse);
    u.uCameraWorld.value.copy(camera.matrixWorld);camera.getWorldPosition(u.uEye.value);
    u.uReady.value=moon?.shadow?.map?1:0;
    if(u.uReady.value){
      u.tShadow.value=moon.shadow.map.texture;u.uShadowMatrix.value.copy(moon.shadow.matrix);
      u.uToMoon.value.copy(moon.position).sub(moon.target.position).normalize();
      u.uRadiance.value.copy(moon.color).multiplyScalar(Math.min(moon.intensity,4));
    }
    u.uDensity.value=Math.min(.035,Math.max(.003,this.ctx.scene.fog?.density||.01));
    renderer.setRenderTarget(this.target);this.quad.render(renderer);
  }
  dispose(){this.target.dispose();this.material.dispose();this.quad.dispose();}
}
