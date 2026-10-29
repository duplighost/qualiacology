import * as THREE from '../vendor/three.module.js';

const UP=new THREE.Vector3(0,1,0);
const NODES=5, CAPACITY=420;
const clamp=THREE.MathUtils.clamp;

// A bounded pool of individually simulated short noodles. These are actual
// three-dimensional pasta segments, including in the nozzle jet and bursts.
export function createEffects(scene,materials) {
  const material=materials.egg.clone();material.color.set(0xffffff);
  const geometry=new THREE.CylinderGeometry(1,1,1,7,1,false);
  const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY*(NODES-1));
  mesh.name='Ballistic spaghetti strands';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.count=0;
  scene.add(mesh);
  const pool=Array.from({length:CAPACITY},()=>({active:false,p:new Float32Array(NODES*3),old:new Float32Array(NODES*3),life:0,rest:.16,radius:.035,h:1/120,color:new THREE.Color()}));
  const object=new THREE.Object3D(), delta=new THREE.Vector3(), midpoint=new THREE.Vector3();
  const axis=new THREE.Vector3(), originTmp=new THREE.Vector3(), dirTmp=new THREE.Vector3();
  let cursor=0,sprayAccumulator=0,hoverAccumulator=0,activeCount=0;
  function emit(origin,direction,velocity,length,radius,color,life,scatter=.12) {
    const s=pool[cursor];cursor=(cursor+1)%CAPACITY;
    s.active=true;s.life=life;s.rest=length/(NODES-1);s.radius=radius;s.h=1/120;s.color.copy(color);
    const dx=direction.x,dy=direction.y,dz=direction.z;
    const vx=dx*velocity+(Math.random()-.5)*scatter*velocity;
    const vy=dy*velocity+(Math.random()-.5)*scatter*velocity;
    const vz=dz*velocity+(Math.random()-.5)*scatter*velocity;
    const phase=Math.random()*Math.PI*2;
    for(let i=0;i<NODES;i++) {
      const j=i*3, bend=Math.sin(phase+i*.6)*.035;
      s.p[j]=origin.x-dx*i*s.rest+bend;
      s.p[j+1]=origin.y-dy*i*s.rest;
      s.p[j+2]=origin.z-dz*i*s.rest+Math.cos(phase+i*.7)*.035;
      s.old[j]=s.p[j]-(vx+Math.sin(i*.8+phase)*.5)*s.h;
      s.old[j+1]=s.p[j+1]-(vy+Math.cos(i+phase)*.3)*s.h;
      s.old[j+2]=s.p[j+2]-(vz+Math.cos(i*.6+phase)*.5)*s.h;
    }
  }
  const api={
    spray(origin,direction,dt) {
      sprayAccumulator+=Math.min(dt,.08)*36;
      dirTmp.copy(direction).normalize();
      while(sprayAccumulator>=1) {
        emit(origin,dirTmp,25,.50+Math.random()*.24,.030+Math.random()*.007,materials.cream.color,2.8+Math.random(),.075);
        sprayAccumulator--;
      }
    },
    hover(origin,dt) {
      hoverAccumulator+=Math.min(dt,.08)*30;
      dirTmp.set(0,-1,0);
      while(hoverAccumulator>=1) {
        for(const side of [-1,1]) {
          originTmp.copy(origin);originTmp.x+=side*.28;
          emit(originTmp,dirTmp,11,.42+Math.random()*.16,.033,materials.cream.color,1.7,.2);
        }
        hoverAccumulator--;
      }
    },
    burst(position,kind='coin') {
      const count=kind==='win'?65:kind==='hit'?22:14;
      const palette=kind==='win'?[materials.gold.color,materials.egg.color,materials.cream.color,materials.tomato.color]:[kind==='hit'?materials.tomato.color:materials.gold.color];
      for(let i=0;i<count;i++) {
        const a=Math.random()*Math.PI*2;
        dirTmp.set(Math.cos(a)*.7,.45+Math.random()*.7,Math.sin(a)*.7).normalize();
        emit(position,dirTmp,3+Math.random()*(kind==='win'?7:4),.20+Math.random()*.4,.035,palette[i%palette.length],3+Math.random()*1.5,.25);
      }
    },
    reset() {
      pool.forEach(s=>{s.active=false;});mesh.count=0;activeCount=0;cursor=0;sprayAccumulator=0;hoverAccumulator=0;
    },
    update(dt,time,world) {
      dt=Math.min(Math.max(dt,0),.04);
      if(dt===0)return;
      const h=dt/2,gravity=17;
      activeCount=0;
      for(const s of pool) {
        if(!s.active)continue;
        s.life-=dt;
        if(s.life<=0){s.active=false;continue;}
        activeCount++;
        for(let sub=0;sub<2;sub++) {
          const p=s.p,old=s.old,ratio=h/s.h,damping=Math.exp(-h*.70);
          for(let i=0;i<NODES;i++) {
            const j=i*3,x=p[j],y=p[j+1],z=p[j+2];
            p[j]+=(x-old[j])*ratio*damping;
            p[j+1]+=(y-old[j+1])*ratio*damping-gravity*h*h;
            p[j+2]+=(z-old[j+2])*ratio*damping;
            old[j]=x;old[j+1]=y;old[j+2]=z;
          }
          s.h=h;
          for(let iter=0;iter<4;iter++) {
            for(let i=0;i<NODES-1;i++) {
              const j=i*3,k=j+3;
              const dx=p[k]-p[j],dy=p[k+1]-p[j+1],dz=p[k+2]-p[j+2];
              const dist=Math.hypot(dx,dy,dz)||1,f=(dist-s.rest)/dist*.5;
              p[j]+=dx*f;p[j+1]+=dy*f;p[j+2]+=dz*f;
              p[k]-=dx*f;p[k+1]-=dy*f;p[k+2]-=dz*f;
            }
            // Cooked spaghetti bends freely but does not fold to zero radius.
            for(let i=0;i<NODES-2;i++) {
              const j=i*3,k=j+6,dx=p[k]-p[j],dy=p[k+1]-p[j+1],dz=p[k+2]-p[j+2];
              const dist=Math.hypot(dx,dy,dz)||1,minimum=s.rest*1.30;
              if(dist<minimum) {
                const f=(dist-minimum)/dist*.035;
                p[j]+=dx*f;p[j+1]+=dy*f;p[j+2]+=dz*f;
                p[k]-=dx*f;p[k+1]-=dy*f;p[k+2]-=dz*f;
              }
            }
          }
          for(let i=0;i<NODES;i++) {
            const j=i*3;
            const floor=(world?.heightAt?.(p[j],p[j+2])??0)+s.radius;
            if(p[j+1]<floor) {
              p[j+1]=floor;
              old[j]+=(p[j]-old[j])*.60;old[j+2]+=(p[j+2]-old[j+2])*.60;
              old[j+1]=floor;
            }
          }
        }
      }
      let index=0;
      for(const s of pool) {
        if(!s.active)continue;
        const radius=s.radius*Math.min(1,s.life/.35);
        for(let i=0;i<NODES-1;i++) {
          const j=i*3,k=j+3,p=s.p;
          midpoint.set((p[j]+p[k])*.5,(p[j+1]+p[k+1])*.5,(p[j+2]+p[k+2])*.5);
          delta.set(p[k]-p[j],p[k+1]-p[j+1],p[k+2]-p[j+2]);
          const len=delta.length();if(len<.00001)delta.set(0,1,0);else delta.multiplyScalar(1/len);
          object.position.copy(midpoint);object.quaternion.setFromUnitVectors(UP,delta);
          object.scale.set(radius,len+.012,radius);object.updateMatrix();
          mesh.setMatrixAt(index,object.matrix);mesh.setColorAt(index,s.color);index++;
        }
      }
      mesh.count=index;mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    },
    get activeCount(){return activeCount;}
  };
  return api;
}

// Procedural effects only. The context is created/resumed exclusively by the
// caller's user gesture. No recordings, copyrighted music, or network requests.
export function createSound() {
  let context=null,master=null,noiseBuffer=null,on=true,footClock=0;
  const last=new Map();
  function tone(frequency,duration=.15,volume=.10,type='sine',delay=0,slide=1) {
    if(!context||!on||context.state!=='running')return;
    const t=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*slide),t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.009);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.03);
  }
  function noise(duration,volume,frequency=400,q=.8) {
    if(!context||!on||context.state!=='running')return;
    const t=context.currentTime,src=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    src.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,t);filter.Q.value=q;
    filter.frequency.exponentialRampToValueAtTime(Math.max(60,frequency*.5),t+duration);
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(t,Math.random()*.35);src.stop(t+duration);
  }
  const api={
    async resume() {
      if(!context) {
        const AudioCtx=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioCtx)return;
        context=new AudioCtx();master=context.createGain();master.gain.value=on?.38:0;master.connect(context.destination);
        noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noiseBuffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.65;
      }
      if(context.state==='suspended')await context.resume();
    },
    setEnabled(enabled) {on=!!enabled;if(context&&master)master.gain.setTargetAtTime(on?.38:0,context.currentTime,.03);},
    play(kind) {
      if(!context||!on||context.state!=='running')return;
      const t=context.currentTime,spacing=kind==='spray'||kind==='hover'?.12:kind==='footstep'||kind==='squish'?.09:.07;
      if(t-(last.get(kind)??-99)<spacing)return;last.set(kind,t);
      if(kind==='coin'){tone(1046.5,.16,.12);tone(1568,.22,.075,'sine',.065);}
      else if(kind==='jump'){tone(190,.20,.10,'sine',0,2.2);noise(.09,.09,550);}
      else if(kind==='hit'||kind==='damage'){tone(125,.20,.11,'triangle',0,.55);noise(.16,.22,250);}
      else if(kind==='win'){[392,523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,.35,.11,'sine',i*.105));}
      else if(kind==='spray'||kind==='hover'){noise(.16,.12,kind==='hover'?420:900,.65);tone(105,.11,.035,'sine',0,.85);}
      else if(kind==='land'||kind==='squish'){noise(.15,.20,250,1.5);tone(95,.11,.075,'sine',0,.75);}
      else if(kind==='footstep'){noise(.075,.13,330,1.2);tone(140,.07,.025,'sine',0,.8);}
      else if(kind==='reveal'){tone(95,.5,.11,'triangle',0,1.5);noise(.45,.16,200);}
      else if(kind==='click'){tone(420,.06,.06);}
    },
    update(dt,speed,wet) {
      if(!on||speed<.6){footClock=0;return;}
      footClock+=dt;
      if(footClock>clamp(1.75/Math.max(speed,.1),.16,.6)){footClock=0;api.play(wet?'squish':'footstep');}
    },
    get enabled(){return on;}
  };
  return api;
}
