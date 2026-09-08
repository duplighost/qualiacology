// A rare road apparition. It never touches controls or deals damage.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class RearPresence {
  constructor(ctx) {
    this.ctx=ctx;this.rng=ctx.rng.fork('rear-presence');this.cooldown=35;
    this.t=0;this.wait=0;this.held=false;this.count=0;this.distance=0;
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
    this.mat=new THREE.MeshBasicMaterial({color:0x17241f,transparent:true,opacity:0,depthWrite:false,fog:false});
    this.mesh=new THREE.Mesh(mergeGeometries(parts,false),this.mat);parts.forEach(g=>g.dispose());
    this.mesh.name='rear-road-presence';this.mesh.visible=false;ctx.scene.add(this.mesh);
    const faceGeo=new THREE.SphereGeometry(.19,16,12);faceGeo.scale(.67,1.4,.68);
    this.faceMat=this.mat.clone();this.faceMat.color.setHex(0x6e7c70);
    const head=new THREE.Group();head.position.set(.23,2.03,.13);head.rotation.z=-.42;this.mesh.add(head);
    head.add(new THREE.Mesh(faceGeo,this.faceMat));
    this.voidMat=this.mat.clone();this.voidMat.color.setHex(0x010302);
    for(const x of [-.050,.050]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.033,12,8),this.voidMat);eye.scale.set(.68,.50,.40);eye.position.set(x,.055,.121);head.add(eye);}
    const mouth=new THREE.Mesh(new THREE.SphereGeometry(.041,12,8),this.voidMat);mouth.scale.set(.65,2.5,.40);mouth.position.set(0,-.09,.116);head.add(mouth);
  }
  step(dt,car){
    const held=car.mode==='driving'&&car._lookBackHeld();
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(car.mode==='driving')this.distance+=Math.abs(car.speed)*dt;
    if(held&&!this.held&&this.cooldown===0&&this.distance>130){
      this.cooldown=75+this.rng.next()*95;
      if(this.rng.next()<.42){this.wait=.32;this.distance=0;}
    }
    this.held=held;
    if(this.wait>0){
      this.wait-=dt;
      if(!held)this.wait=0;
      else if(this.wait<=0){
        const back=10+Math.abs(car.speed)*.25;
        const x=car.x+Math.sin(car.heading)*back,z=car.z+Math.cos(car.heading)*back;
        const terr=this.ctx.systems.get('terrain'),col=this.ctx.systems.get('collision'),y=terr.heightAt(x,z);
        const from=new THREE.Vector3(car.x,car.y+1.8,car.z),dir=new THREE.Vector3(x-from.x,y+1.8-from.y,z-from.z);
        const d=dir.length();dir.normalize();const hit=col.raycast(from,dir,d,(col.MASK?.SIGHT||4)|(col.MASK?.GROUND||8));
        if(!(hit&&hit.hit!==false)){
          this.mesh.position.set(x,y+.02,z);this.mesh.rotation.y=car.heading+Math.PI;
          this.mesh.visible=true;this.t=1.18;this.count++;
          this.ctx.systems.get('audio')?.dread('rear-presence',x,y+2,z,.62);
        }
      }
    }
    if(this.t>0){this.t=Math.max(0,this.t-dt*(held?1:3));this.mat.opacity=.76*Math.min(1,(1.18-this.t)/.09)*Math.min(1,this.t/.78);this.faceMat.opacity=this.mat.opacity;this.voidMat.opacity=this.mat.opacity;}
    if(this.t===0)this.mesh.visible=false;
  }
  dispose(){this.mesh.removeFromParent();this.mesh.traverse(o=>o.geometry?.dispose());this.mat.dispose();this.faceMat.dispose();this.voidMat.dispose();}
}
