import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {VIEW_POSITION_GLSL} from './depth-position.js';

// Integrate moonlight through the current shadow map. Scene depth ends each ray
// at the first visible surface; buildings and the moving canopy shade the air.
// A small spatial field has no history buffer, so it cannot leave motion trails.
export class MoonAirField {
  constructor(ctx) {
    this.ctx=ctx;this.depthMistEnabled=true;
    this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
    this.target.texture.name='county-shadowed-moon-air';
    this.uniforms={
      tDepth:{value:null},tShadow:{value:null},tCloudField:{value:null},uInvProjection:{value:new THREE.Matrix4()},
      uCameraWorld:{value:new THREE.Matrix4()},uShadowMatrix:{value:new THREE.Matrix4()},
      uEye:{value:new THREE.Vector3()},uToMoon:{value:new THREE.Vector3()},
      uRadiance:{value:new THREE.Color()},uDensity:{value:.01},uGain:{value:.055},uReady:{value:0},
      uMistReady:{value:0},uMistTime:{value:0},uMistCol:{value:new THREE.Color()},uMistMoonCol:{value:new THREE.Color()},
      uMistMoonDir:{value:new THREE.Vector3()},uMistLayer0:{value:new THREE.Vector4()},uMistLayer1:{value:new THREE.Vector4()},
      uMistDrift0:{value:new THREE.Vector2()},uMistDrift1:{value:new THREE.Vector2()}
    };
    this.material=new THREE.ShaderMaterial({name:'CountyShadowedMoonAir',uniforms:this.uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tDepth,tShadow,tCloudField;
        uniform mat4 uInvProjection,uCameraWorld,uShadowMatrix;
        uniform vec3 uEye,uToMoon,uRadiance;
        uniform float uDensity,uGain,uReady;
        uniform float uMistReady,uMistTime;
        uniform vec3 uMistCol,uMistMoonCol,uMistMoonDir;
        uniform vec4 uMistLayer0,uMistLayer1;
        uniform vec2 uMistDrift0,uMistDrift1;
        ${VIEW_POSITION_GLSL}
        vec4 mistAt(vec3 world,vec3 ray,vec4 layer,vec2 drift,float sigma,float billow,float distanceM,float stepM){
          float height=min(layer.x+(billow-.5)*1.25,uEye.y-.30);
          float h=(world.y-height)/sigma;
          float heightDensity=exp(-.5*h*h)*(1.0-smoothstep(2.25,3.0,abs(h)));
          // Match the existing sheet's two wind speeds and world-anchored banks.
          vec2 p=world.xz*layer.z*.14+drift*uMistTime*.00065;
          float lod=clamp(log2(max(1.0,stepM*layer.z*.14*512.0)),0.0,3.0);
          vec4 current=textureLod(tCloudField,p*.37-drift*uMistTime*.00021,max(0.0,lod-1.4));
          vec4 detail=textureLod(tCloudField,p+(current.gb-.5)*.10,lod);
          float density=smoothstep(.44,.74,current.r*.78+detail.g*.35)*(.72+.28*detail.b);
          float amount=density*layer.y*heightDensity;
          amount*=smoothstep(.14,1.05,abs(uEye.y-height))*smoothstep(2.1,7.0,distanceM);
          amount*=exp(-pow(distanceM*.0085,2.0))*(1.0-smoothstep(layer.w-18.0,layer.w,distanceM));
          float moon=max(0.0,dot(ray,uMistMoonDir));
          vec3 color=mix(uMistCol*(.70+detail.b*.22),uMistMoonCol*.22,pow(moon,5.0)*.48*(1.0-density*.35));
          return vec4(color*amount,amount);
        }
        vec4 valleyMist(vec3 p,vec3 ray,float jitter){
          // Integrate only where the view ray can meet either finite height band.
          // This keeps steep views from skipping a metre-thick bank in a 175 m ray.
          float low=min(uMistLayer0.x-2.04,uMistLayer1.x-2.76)-.625;
          float high=max(uMistLayer0.x+2.04,uMistLayer1.x+2.76)+.625;
          float start=2.1,end=min(length(p),max(uMistLayer0.w,uMistLayer1.w));
          if(abs(ray.y)>.0001){
            vec2 span=(vec2(low,high)-uEye.y)/ray.y;
            start=max(start,min(span.x,span.y));end=min(end,max(span.x,span.y));
          }else if(uEye.y<low||uEye.y>high)return vec4(0.0,0.0,0.0,1.0);
          if(end<=start)return vec4(0.0,0.0,0.0,1.0);
          float stepM=(end-start)/12.0,transmission=1.0;vec3 scattered=vec3(0.0);
          for(int i=0;i<12;i++){
            float distanceM=start+(float(i)+.2+jitter*.6)*stepM;
            vec3 world=uEye+ray*distanceM;
            float billow=textureLod(tCloudField,world.xz*.005+vec2(uMistTime*.00009,0.0),0.0).g;
            vec4 a=mistAt(world,ray,uMistLayer0,uMistDrift0,.68,billow,distanceM,stepM);
            vec4 b=mistAt(world,ray,uMistLayer1,uMistDrift1,.92,billow,distanceM,stepM);
            float density=a.a+b.a,alpha=1.0-exp(-density*stepM*.075);
            scattered+=transmission*alpha*(a.rgb+b.rgb)/max(density,.000001);
            transmission*=1.0-alpha;
          }
          // A long horizontal ray must not accumulate a pale wall. Retain at
          // least 82% of scene contrast and scale in-scattering by the same amount.
          float original=1.0-transmission,opacity=min(.18,original);
          return vec4(scattered*(opacity/max(original,.000001)),1.0-opacity);
        }
        void main(){
          vec3 p=positionAt(vUv);
          vec3 air=vec3(0.0);float transmission=1.0;
          vec3 ray=normalize(mat3(uCameraWorld)*normalize(p));
          float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
          if(uReady>.5&&uGain>0.0){
            float lengthM=min(length(p),72.0),stepM=lengthM/24.0,litAir=0.0;
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
              float heightFalloff=exp(-max(ray.y*distanceM,0.0)*.055);
              litAir+=lit*segment*heightFalloff;
            }
            float phase=.4+.6*pow(max(0.0,dot(ray,uToMoon)),3.0);
            air=uRadiance*(uGain*phase*litAir);
          }
          if(uMistReady>.5){
            vec4 mist=valleyMist(p,ray,jitter);
            transmission=mist.a;
            // Scattered light is already premultiplied by its integrated opacity.
            // The resolve attenuates each full-resolution scene pixel by T; never
            // filter coarse scene colours across a trunk or headlight boundary.
            air=air*transmission+mist.rgb;
          }
          gl_FragColor=vec4(air,transmission);
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
    const mist=this.ctx.systems.get('sky')?.mistVolume?.();
    u.uMistReady.value=mist?1:0;
    if(u.uMistReady.value){
      const a=mist[0],b=mist[1],ma=a.mat.uniforms,mb=b.mat.uniforms;
      u.tCloudField.value=ma.uCloudField.value;u.uMistTime.value=ma.uTime.value;
      u.uMistCol.value.copy(ma.uCol.value);u.uMistMoonCol.value.copy(ma.uMoonCol.value);u.uMistMoonDir.value.copy(ma.uMoonDir.value);
      u.uMistLayer0.value.set(a.mesh.position.y,ma.uAmt.value,ma.uScale.value,ma.uFar.value);
      u.uMistLayer1.value.set(b.mesh.position.y,mb.uAmt.value,mb.uScale.value,mb.uFar.value);
      u.uMistDrift0.value.copy(ma.uDrift.value);u.uMistDrift1.value.copy(mb.uDrift.value);
      if(ma.uAmt.value+mb.uAmt.value<.00001)u.uMistReady.value=0;
    }
    u.uDensity.value=Math.min(.035,Math.max(.003,this.ctx.scene.fog?.density||.01));
    renderer.setRenderTarget(this.target);this.quad.render(renderer);
  }
  dispose(){this.depthMistEnabled=false;this.target.dispose();this.material.dispose();this.quad.dispose();this.ctx.systems.get('sky')?.refreshMistVisibility?.();}
}
