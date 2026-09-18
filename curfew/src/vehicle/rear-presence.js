// A rare road apparition. It never touches controls or deals damage.
//
// HORROR 4/5. Three things live here, one mesh's worth of geometry and ONE program:
//   THE ROAD FIGURE — hold B (look back) after 130 m driven, cooldown 75-170 s, 42%: a figure
//     10 m + speed*.25 behind, 1.18 s, gone. Unchanged.
//   prime(seconds) — the car's cabin beat (car.js _stepCabinBeats) breathes at your ear and
//     then calls this: the NEXT look-back inside `seconds` gets the road figure without the
//     roll or the distance gate. Breath, then look-back, then figure is the whole beat;
//     without the prime the breath would be a lie 58% of the time. The eye-sight test stays
//     (a figure inside a bank is worse than none); a refused placement keeps the prime for
//     what is left of it.
//   THE BACK SEAT — a second, smaller placement of the SAME geometry and material family
//     (cloned materials with identical parameters share the program) parented to the car
//     body, so it rides the interpolated pose, at car-local (0.25, 0.45, +1.15), scale .55,
//     facing forward. Rolled on the FIRST frame of a look-back (12%, its own fork), shown
//     once the view has come round (the swing takes ~0.2 s and it would be a subliminal
//     flash otherwise), gone 0.30 s later while B is still held, gone at once if B is
//     released. It is in the back seat and then it is not. No sound. Never a mirror: a
//     real one is a second render and a program family.
//
// PROGRAMS. Both meshes start hidden; main.js warm() reveals every hidden object before it
// compiles, and car.warmup()'s render draws the body root with the seat figure on it, so
// nothing links during play.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ROAD_LIFE = 1.18;       // s the road figure stands
const SEAT_ROLL = 0.12;       // chance per look-back of the back-seat placement
const SEAT_SHOW_AT = 0.80;    // fraction of the look-back swing (car._lookBackT) before it shows
const SEAT_LIFE = 0.30;       // s it stays
const SEAT_RAMP = 0.05;       // s of opacity ramp in
const SEAT_OPACITY = 0.76;    // the road figure's, so the two read as the same thing
const SEAT_LOCAL = { x: 0.25, y: 0.45, z: 1.15, scale: 0.55 };   // car-local; +Z is behind the driver

export class RearPresence {
  constructor(ctx, carRoot) {
    this.ctx=ctx;this.rng=ctx.rng.fork('rear-presence');this.seatRng=ctx.rng.fork('rear-presence:seat');
    this.cooldown=35;this.t=0;this.wait=0;this.held=false;this.count=0;this.distance=0;
    this.primed=0;this.seatT=0;this.seatArmed=false;this.seatCount=0;
    const parts=[];
    const bone=(a,b,r)=>{
      const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
      const g=new THREE.CylinderGeometry(r*.6,r,delta.length(),9);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
      const mid=start.add(end).multiplyScalar(.5);g.translate(mid.x,mid.y,mid.z);parts.push(g);
    };
    bone([-.48,.07,.20],[-.55,.52,-.24],.13);bone([-.55,.52,-.24],[0,.88,0],.19);
    bone([.45,.07,-.08],[.59,.50,.24],.12);bone([.59,.50,.24],[0,.88,0],.18);
    bone([0,.85,0],[-.10,1.72,-.22],.36);
    bone([-.1,1.72,-.22],[.20,1.96,.11],.11);
    const hump=new THREE.SphereGeometry(.34,16,12);hump.scale(1,1.24,.70);hump.translate(-.16,1.70,-.22);parts.push(hump);
    bone([.10,1.68,0],[.65,.85,-.1],.14);bone([.65,.85,-.1],[.90,.18,.1],.09);
    bone([-.22,1.68,0],[-.55,1.05,.05],.14);bone([-.55,1.05,.05],[-.24,1.55,.24],.075);
    for(let i=0;i<4;i++)bone([.86+i*.025,.21,.10],[.88+i*.04,.025,.17+(i%2)*.035],.018);
    for(let i=0;i<4;i++)bone([-.26+i*.023,1.55,.24],[-.21+i*.028,1.73,.26],.014);
    this.geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
    this.mat=new THREE.MeshBasicMaterial({color:0x17241f,transparent:true,opacity:0,depthWrite:false,fog:false});
    this.mesh=new THREE.Mesh(this.geo,this.mat);
    this.mesh.name='rear-road-presence';this.mesh.visible=false;ctx.scene.add(this.mesh);
    // One set of head geometries for both placements (a geometry may be shared by any
    // number of meshes; the materials are cloned so each placement fades on its own).
    this.faceGeo=new THREE.SphereGeometry(.19,16,12);this.faceGeo.scale(.67,1.4,.68);
    this.eyeGeo=new THREE.SphereGeometry(.033,12,8);this.mouthGeo=new THREE.SphereGeometry(.041,12,8);
    this.faceMat=this.mat.clone();this.faceMat.color.setHex(0x6e7c70);
    this.voidMat=this.mat.clone();this.voidMat.color.setHex(0x010302);
    const head=(faceMat,voidMat)=>{
      const h=new THREE.Group();h.position.set(.23,2.03,.13);h.rotation.z=-.42;
      h.add(new THREE.Mesh(this.faceGeo,faceMat));
      for(const x of [-.050,.050]){const eye=new THREE.Mesh(this.eyeGeo,voidMat);eye.scale.set(.68,.50,.40);eye.position.set(x,.055,.121);h.add(eye);}
      const mouth=new THREE.Mesh(this.mouthGeo,voidMat);mouth.scale.set(.65,2.5,.40);mouth.position.set(0,-.09,.116);h.add(mouth);
      return h;
    };
    this.mesh.add(head(this.faceMat,this.voidMat));
    // THE BACK SEAT (HORROR 5): same geometry, same material family, on the car body.
    this.seatMat=this.mat.clone();this.seatFaceMat=this.faceMat.clone();this.seatVoidMat=this.voidMat.clone();
    this.seat=new THREE.Mesh(this.geo,this.seatMat);this.seat.name='rear-seat-presence';
    this.seat.position.set(SEAT_LOCAL.x,SEAT_LOCAL.y,SEAT_LOCAL.z);this.seat.scale.setScalar(SEAT_LOCAL.scale);
    this.seat.rotation.y=Math.PI;   // its face is on its own +Z; forward in the car is -Z
    this.seat.visible=false;this.seat.add(head(this.seatFaceMat,this.seatVoidMat));
    this.seatRoot=carRoot||null;
    if(this.seatRoot)this.seatRoot.add(this.seat);else ctx.scene.add(this.seat);
  }
  /** The next look-back inside `seconds` gets the road figure, no roll, no distance gate. */
  prime(seconds){this.primed=Math.max(this.primed,Number(seconds)||0);}
  step(dt,car){
    const held=car.mode==='driving'&&car._lookBackHeld();
    const rising=held&&!this.held;
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.primed>0)this.primed=Math.max(0,this.primed-dt);
    if(car.mode==='driving')this.distance+=Math.abs(car.speed)*dt;
    if(rising){
      if(this.primed>0){
        // the breath promised this one; the ordinary roll waits its full cooldown after it
        this.wait=.32;this.distance=0;this.cooldown=Math.max(this.cooldown,75+this.rng.next()*95);
      }else if(this.cooldown===0&&this.distance>130){
        this.cooldown=75+this.rng.next()*95;
        if(this.rng.next()<.42){this.wait=.32;this.distance=0;}
      }
      this.seatArmed=this.seatRng.next()<SEAT_ROLL;   // HORROR 5: rolled on the first frame
    }
    this.held=held;
    if(this.wait>0){
      this.wait-=dt;
      if(!held)this.wait=0;
      else if(this.wait<=0){
        const back=10+Math.abs(car.speed)*.25;
        const x=car.x+Math.sin(car.heading)*back,z=car.z+Math.cos(car.heading)*back;
        const terr=this.ctx.systems.get('terrain'),col=this.ctx.systems.get('collision');
        const y=terr.surfaceAt?terr.surfaceAt(x,z):terr.heightAt(x,z);   // C9: it stands on the ice too
        const from=new THREE.Vector3(car.x,car.y+1.8,car.z),dir=new THREE.Vector3(x-from.x,y+1.8-from.y,z-from.z);
        const d=dir.length();dir.normalize();const hit=col.raycast(from,dir,d,(col.MASK?.SIGHT||4)|(col.MASK?.GROUND||8));
        if(!(hit&&hit.hit!==false)){
          this.mesh.position.set(x,y+.02,z);this.mesh.rotation.y=car.heading+Math.PI;
          this.mesh.visible=true;this.t=ROAD_LIFE;this.count++;this.primed=0;
          this.ctx.systems.get('audio')?.dread('rear-presence',x,y+2,z,.62);
        }
      }
    }
    if(this.t>0){this.t=Math.max(0,this.t-dt*(held?1:3));this.mat.opacity=SEAT_OPACITY*Math.min(1,(ROAD_LIFE-this.t)/.09)*Math.min(1,this.t/.78);this.faceMat.opacity=this.mat.opacity;this.voidMat.opacity=this.mat.opacity;}
    if(this.t===0)this.mesh.visible=false;
    // THE BACK SEAT. Armed on the rising edge above; shown once the view has come round;
    // 0.30 s; gone the instant B is released.
    if(!held){this.seatArmed=false;this.seatT=0;}
    else if(this.seatArmed&&(car._lookBackT||0)>=SEAT_SHOW_AT){this.seatArmed=false;this.seatT=SEAT_LIFE;this.seatCount++;}
    if(this.seatT>0){
      this.seatT=Math.max(0,this.seatT-dt);
      const o=SEAT_OPACITY*Math.min(1,(SEAT_LIFE-this.seatT)/SEAT_RAMP)*Math.min(1,this.seatT/.04);
      this.seatMat.opacity=o;this.seatFaceMat.opacity=o;this.seatVoidMat.opacity=o;this.seat.visible=o>0;
    }else if(this.seat.visible)this.seat.visible=false;
  }
  dispose(){
    this.mesh.removeFromParent();this.seat.removeFromParent();
    this.geo.dispose();this.faceGeo.dispose();this.eyeGeo.dispose();this.mouthGeo.dispose();
    for(const m of [this.mat,this.faceMat,this.voidMat,this.seatMat,this.seatFaceMat,this.seatVoidMat])m.dispose();
  }
}
