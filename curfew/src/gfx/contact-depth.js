import * as THREE from 'three';
import {Pass, FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {MoonAirField} from './moon-air.js';
import {VIEW_POSITION_GLSL as POSITION, VIEW_NORMAL_GLSL as NORMAL} from './depth-position.js';

// Contact shading and restrained first-bounce light from visible luminous surfaces.
// Half-resolution neighborhoods are reconstructed along depth edges. No history
// buffer: moving foliage, doors and muzzle flashes cannot leave ghost trails.
const VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export class ContactDepthPass extends Pass {
  constructor(ctx){
    super();this.ctx=ctx;this.air=new MoonAirField(ctx);
    this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
    this.target.texture.name='county-contact-and-bounce';
    this.uniforms={tDiffuse:{value:null},tDepth:{value:null},uInvProjection:{value:new THREE.Matrix4()},uProjection:{value:new THREE.Matrix4()},uWorldUp:{value:new THREE.Vector3()},uResolution:{value:new THREE.Vector2(1,1)},uProjectionY:{value:1},uShadeCap:{value:.38},uReflectionStrength:{value:1}};
    this.material=new THREE.ShaderMaterial({name:'CountyContactField',uniforms:this.uniforms,depthTest:false,depthWrite:false,vertexShader:VERTEX,fragmentShader:`
      uniform sampler2D tDiffuse,tDepth;
      uniform mat4 uInvProjection,uProjection;
      uniform vec3 uWorldUp;
      uniform vec2 uResolution;
      uniform float uProjectionY,uShadeCap,uReflectionStrength;
      varying vec2 vUv;
      ${POSITION}
      ${NORMAL}
      void main(){
        float depth=depthAtPixel(pixelAt(vUv));
        if(depth>.999998){gl_FragColor=vec4(0.0);return;}
        vec3 p=positionAt(vUv);
        if(-p.z>155.0){gl_FragColor=vec4(0.0);return;}
        vec3 n=surfaceNormalAt(vUv,p);
        float radius=clamp(1.05*uProjectionY/max(.5,-p.z),.001,.10);
        float occ=0.0;vec3 bounce=vec3(0.0);
        // Decorrelate the sparse disk so an occluder cannot stamp sixteen
        // repeated outlines. The edge-aware resolve below removes sample grain.
        float rotation=6.28318530718*fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
        for(int i=0;i<16;i++){
          float a=float(i)*2.39996323+rotation;
          float ring=.13+.87*sqrt((float(i)+.5)/16.0);
          vec2 uv=vUv+vec2(cos(a)*uResolution.y/uResolution.x,sin(a))*radius*ring;
          float inFrame=step(0.0,uv.x)*step(0.0,uv.y)*step(uv.x,1.0)*step(uv.y,1.0);
          uv=clamp(uv,vec2(0.0),vec2(1.0));
          vec3 delta=positionAt(uv)-p;
          float dist=length(delta);
          float facing=max(0.0,dot(n,delta)/max(.001,dist)-.08);
          float reach=(1.0-smoothstep(.12,2.1,dist))*inFrame;
          occ+=facing*reach;
          // Excess radiance only: ordinary sky-lit walls cannot amplify themselves.
          vec3 light=texelFetch(tDiffuse,pixelAt(uv),0).rgb;
          float peak=max(light.r,max(light.g,light.b));
          bounce+=min(light,vec3(4.0))*smoothstep(.65,1.8,peak)*facing*reach;
        }
        float fade=1.0-smoothstep(65.0,155.0,-p.z);
        gl_FragColor=vec4(bounce*(.09*fade),min(occ*.12,uShadeCap)*fade);
      }`});
    // Reflections use a separate quarter-resolution field. Divergent ray marching
    // no longer inflates the contact shader, and the display remains full resolution.
    this.reflectionTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
    this.reflectionTarget.texture.name='county-wet-reflections';
    this.reflectionMaterial=new THREE.ShaderMaterial({name:'CountyWetReflectionField',uniforms:this.uniforms,depthTest:false,depthWrite:false,vertexShader:VERTEX,fragmentShader:`
      uniform sampler2D tDiffuse,tDepth;
      uniform mat4 uInvProjection,uProjection;
      uniform vec3 uWorldUp;
      uniform vec2 uResolution;
      uniform float uReflectionStrength;
      varying vec2 vUv;
      ${POSITION}
      ${NORMAL}
      void main(){
        if(depthAtPixel(pixelAt(vUv))>.999998){gl_FragColor=vec4(0.0);return;}
        vec3 p=positionAt(vUv);
        gl_FragColor=vec4(0.0,0.0,0.0,-p.z);
        float mask=clamp((.98-textureLod(tDiffuse,vUv,0.0).a)/.75,0.0,1.0);
        if(mask<.025 || uReflectionStrength<=0.0 || -p.z>100.0)return;
        vec3 n=surfaceNormalAt(vUv,p);
        vec3 reflected=vec3(0.0);
        // Opaque wet surfaces write a mask into unused HDR alpha. The road
        // retains its filtered sky reflection when a ray leaves the screen.
        float wet=clamp((.98-textureLod(tDiffuse,vUv,0.0).a)/.75,0.0,1.0);
        wet*=smoothstep(.75,.95,dot(n,uWorldUp));
        if(wet>.025 && uReflectionStrength>0.0 && -p.z<100.0){
          vec3 ray=reflect(normalize(p),n);
          vec3 start=p+n*.07;
          float lastT=.1;
          for(int j=0;j<18;j++){
            float t=.25+float(j)*.48+float(j*j)*.075;
            vec3 q=start+ray*t;
            vec4 clip=uProjection*vec4(q,1.0);
            vec2 uv=clip.xy/max(.001,clip.w)*.5+.5;
            if(q.z>-.25 || min(uv.x,uv.y)<.012 || max(uv.x,uv.y)>.988)break;
            float dz=positionAt(uv).z-q.z;
            if(dz>0.0 && dz<.55+t*.035){
              float lo=lastT,hi=t;
              for(int b=0;b<4;b++){
                float m=(lo+hi)*.5;
                vec4 cp=uProjection*vec4(start+ray*m,1.0);
                vec2 mu=cp.xy/cp.w*.5+.5;
                if(positionAt(mu).z>(start+ray*m).z)hi=m;else lo=m;
              }
              vec4 hit=uProjection*vec4(start+ray*hi,1.0);
              uv=hit.xy/hit.w*.5+.5;
              float edge=smoothstep(.01,.12,min(min(uv.x,uv.y),min(1.0-uv.x,1.0-uv.y)));
              float facing=clamp(1.0-dot(n,normalize(-p)),0.0,1.0);
              float fresnel=.04+.66*pow(facing,5.0);
              vec3 radiance=textureLod(tDiffuse,uv,0.0).rgb;
              reflected=min(radiance,vec3(6.0))*fresnel*edge*uReflectionStrength;
              break;
            }
            lastT=t;
          }
        }
        gl_FragColor=vec4(reflected,-p.z);
      }`});
    this.resolveMaterial=new THREE.ShaderMaterial({name:'CountyContactResolve',depthTest:false,depthWrite:false,vertexShader:VERTEX,
      uniforms:{tDiffuse:{value:null},tDepth:{value:null},tField:{value:this.target.texture},tReflection:{value:this.reflectionTarget.texture},tAir:{value:this.air.target.texture},uInvProjection:this.uniforms.uInvProjection,uFieldSize:{value:new THREE.Vector2(1,1)},uReflectionSize:{value:new THREE.Vector2(1,1)}},
      fragmentShader:`
        uniform sampler2D tDiffuse,tDepth,tField,tReflection,tAir;
        uniform mat4 uInvProjection;
        uniform vec2 uFieldSize,uReflectionSize;
        varying vec2 vUv;
        ${POSITION}
      ${NORMAL}
float contactB2(float x) {
  x = abs(x);
  return x < 0.5 ? 0.75-x*x : 0.5*pow(max(0.0,1.5-x),2.0);
}

vec3 contactFacingNormal(vec3 dx, vec3 dy, vec3 p) {
  vec3 n = cross(dx,dy);
  n *= inversesqrt(max(dot(n,n),1e-20));
  return dot(n,-p)<0.0 ? -n : n;
}

vec4 resolveContact(vec2 uv, vec3 p) {
  vec3 centreNormal=surfaceNormalAt(uv,p);
  vec2 cell=uv*uFieldSize-0.5;
  ivec2 nearest=ivec2(floor(cell+0.5));
  ivec2 last=ivec2(uFieldSize)-1;
  vec3 positions[9];
  vec4 values[9];
  float spatial[9];
  for(int y=0;y<3;y++)for(int x=0;x<3;x++){
    int i=y*3+x;
    ivec2 q=clamp(nearest+ivec2(x-1,y-1),ivec2(0),last);
    vec2 sampleUV=(vec2(q)+0.5)/uFieldSize;
    positions[i]=positionAt(sampleUV);
    values[i]=texelFetch(tField,q,0);
    vec2 delta=cell-vec2(nearest+ivec2(x-1,y-1));
    spatial[i]=contactB2(delta.x)*contactB2(delta.y);
  }
  float tolerance=0.015+min(100.0,-p.z)*0.0015;
  vec4 result=vec4(0.0);float total=0.0;
  for(int y=0;y<3;y++)for(int x=0;x<3;x++){
    int i=y*3+x;
    vec3 s=positions[i];
    // Reuse the nine positions for neighbour normals. No extra field-normal
    // texture and no nine-times nested depth-normal reconstruction.
    vec3 dl=s-positions[y*3+max(0,x-1)];
    vec3 dr=positions[y*3+min(2,x+1)]-s;
    vec3 db=s-positions[max(0,y-1)*3+x];
    vec3 dt=positions[min(2,y+1)*3+x]-s;
    vec3 dx=x==0?dr:(x==2?dl:(abs(dl.z)<abs(dr.z)?dl:dr));
    vec3 dy=y==0?dt:(y==2?db:(abs(db.z)<abs(dt.z)?db:dt));
    vec3 sampleNormal=contactFacingNormal(dx,dy,s);
    float normalWeight=smoothstep(0.70,0.95,dot(centreNormal,sampleNormal));
    float planeError=abs(dot(centreNormal,s-p));
    float planeWeight=1.0-smoothstep(tolerance,3.0*tolerance,planeError);
    float weight=spatial[i]*normalWeight*planeWeight;
    result+=values[i]*weight;total+=weight;
  }
  // If the thin foreground surface has no matching coarse sample, a rear
  // surface's occlusion/bounce does not belong to it.
  return total>0.00001?result/total:vec4(0.0);
}


        vec4 airAt(float z){
          vec2 cell=vUv*uReflectionSize-.5,base=(floor(cell)+.5)/uReflectionSize,f=fract(cell);
          vec4 air=vec4(0.0);float total=0.0;
          for(int y=0;y<2;y++)for(int x=0;x<2;x++){
            vec2 o=vec2(float(x),float(y)),uv=base+o/uReflectionSize,w=mix(1.0-f,f,o);
            vec4 a=textureLod(tAir,uv,0.0);
            float dz=abs(min(-positionAt(uv).z,200.0)-min(-z,200.0)),weight=w.x*w.y/(1.0+dz*dz*65.0);
            // Filter extinction instead of transmission. Exactly clear air then
            // stays exactly neutral even with very small edge weights.
            air+=vec4(a.rgb,1.0-a.a)*weight;total+=weight;
          }
          // A thin foreground silhouette may have no matching quarter-size
          // sample. Missing air is transparent; alpha zero would blacken it.
          return total>.00001?vec4(air.rgb/total,clamp(1.0-air.a/total,0.0,1.0)):vec4(0.0,0.0,0.0,1.0);
        }
        void main(){
          vec4 color=textureLod(tDiffuse,vUv,0.0);
          float z=positionAt(vUv).z;
          vec4 air=airAt(z);
          if(depthAtPixel(pixelAt(vUv))>.999998){gl_FragColor=vec4(color.rgb*air.a+air.rgb,1.0);return;}
          float wet=clamp((.98-color.a)/.75,0.0,1.0);
          vec4 field=resolveContact(vUv,positionAt(vUv));
          float bright=max(color.r,max(color.g,color.b));
          color.rgb*=1.0-field.a*(1.0-smoothstep(.65,2.5,bright));
          color.rgb+=field.rgb*min(sqrt(max(color.rgb,vec3(0.0))),vec3(.6));
          if(wet>.025){
            vec2 cell=vUv*uReflectionSize-.5,base=(floor(cell)+.5)/uReflectionSize,f=fract(cell);
            vec3 reflected=vec3(0.0);float total=0.0;
            for(int y=0;y<2;y++)for(int x=0;x<2;x++){
              vec2 o=vec2(float(x),float(y)),uv=base+o/uReflectionSize,w=mix(1.0-f,f,o);
              vec4 r=textureLod(tReflection,uv,0.0);
              float dz=abs(r.a+z),weight=w.x*w.y/(1.0+dz*dz*65.0);
              reflected+=r.rgb*weight;total+=weight;
            }
            // The exact full-resolution wet mask is applied only here, so
            // reflection RGB cannot bleed into an adjacent dry coplanar pixel.
            color.rgb+=reflected/max(total,.00001)*wet;
          }
          color.rgb=color.rgb*air.a+air.rgb; color.a=1.0;
          gl_FragColor=color;
        }`});
    this.quad=new FullScreenQuad(this.material);
  }
  setSize(w,h){
    this.air.setSize(w,h);
    this.uniforms.uResolution.value.set(w,h);
    const fw=Math.max(1,Math.ceil(w/2)),fh=Math.max(1,Math.ceil(h/2));
    this.target.setSize(fw,fh);this.resolveMaterial.uniforms.uFieldSize.value.set(fw,fh);
    const rw=Math.max(1,Math.ceil(w/4)),rh=Math.max(1,Math.ceil(h/4));
    this.reflectionTarget.setSize(rw,rh);this.resolveMaterial.uniforms.uReflectionSize.value.set(rw,rh);
  }
  render(renderer,writeBuffer,readBuffer,dt){
    const u=this.uniforms;u.tDepth.value=readBuffer.depthTexture;u.tDiffuse.value=readBuffer.texture;
    u.uInvProjection.value.copy(this.ctx.camera.projectionMatrixInverse);
    u.uProjection.value.copy(this.ctx.camera.projectionMatrix);
    u.uWorldUp.value.set(0,1,0).transformDirection(this.ctx.camera.matrixWorldInverse);
    u.uProjectionY.value=this.ctx.camera.projectionMatrix.elements[5];
    const ph=this.ctx.shared?.phase,want=(ph==='night'||ph==='black')?.46:.38;
    u.uShadeCap.value+=(want-u.uShadeCap.value)*(1-Math.exp(-1.5*(dt>0&&dt<1?dt:1/60)));
    this.quad.material=this.material;renderer.setRenderTarget(this.target);this.quad.render(renderer);
    this.quad.material=this.reflectionMaterial;renderer.setRenderTarget(this.reflectionTarget);this.quad.render(renderer);
    this.air.render(renderer,readBuffer.depthTexture);
    const r=this.resolveMaterial.uniforms;r.tDiffuse.value=readBuffer.texture;r.tDepth.value=readBuffer.depthTexture;
    this.quad.material=this.resolveMaterial;renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
  }
  dispose(){this.air.dispose();this.target.dispose();this.reflectionTarget.dispose();this.reflectionMaterial.dispose();this.material.dispose();this.resolveMaterial.dispose();this.quad.dispose();}
}
