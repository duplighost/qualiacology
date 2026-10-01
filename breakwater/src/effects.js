import * as THREE from 'three';
export class Effects {
  constructor(scene){
    this.scene=scene;this.particles=[];this.lines=[];this.rings=[];this.max=480;this.maxLines=96;
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();
    const particleMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    this.mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.045,0),particleMat,this.max);this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;scene.add(this.mesh);
    this.lineMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5),particleMat.clone(),this.maxLines);this.lineMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.lineMesh.frustumCulled=false;this.lineMesh.count=0;scene.add(this.lineMesh);
    this.up=new THREE.Vector3(0,1,0);this.delta=new THREE.Vector3();
  }
  burst(pos,color=0x9be7ec,count=12,power=1){for(let i=0;i<count&&this.particles.length<this.max;i++){const life=.2+Math.random()*.4;this.particles.push({p:pos.clone(),v:new THREE.Vector3((Math.random()-.5)*7,Math.random()*5,(Math.random()-.5)*7).multiplyScalar(power),life,max:life,color,size:.45+Math.random()*1.2});}}
  trail(a,b,color=0x93e8ee,width=.04,life=.15){if(this.lines.length>=this.maxLines)this.lines.shift();this.lines.push({a:a.clone(),b:b.clone(),color,width,life,max:life});}
  ring(pos,color=0x92e7ed,radius=2,life=.3){if(this.rings.length>=16)return;const m=new THREE.Mesh(new THREE.TorusGeometry(1,.012,4,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.position.y+=.05;this.scene.add(m);this.rings.push({m,radius,life,max:life});}
  update(dt){
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.v.y-=8*dt;p.p.addScaledVector(p.v,dt);p.v.multiplyScalar(Math.exp(-dt*2));}
    this.particles.forEach((p,i)=>{this.dummy.position.copy(p.p);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(p.size*Math.sqrt(p.life/p.max));this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.mesh.setColorAt(i,this.color.setHex(p.color));});this.mesh.count=this.particles.length;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
    for(let i=this.lines.length-1;i>=0;i--){this.lines[i].life-=dt;if(this.lines[i].life<=0)this.lines.splice(i,1);}
    this.lines.forEach((l,i)=>{this.delta.subVectors(l.b,l.a);this.dummy.position.copy(l.a).addScaledVector(this.delta,.5);this.dummy.quaternion.setFromUnitVectors(this.up,this.delta.clone().normalize());this.dummy.scale.set(l.width*l.life/l.max,this.delta.length(),l.width*l.life/l.max);this.dummy.updateMatrix();this.lineMesh.setMatrixAt(i,this.dummy.matrix);this.lineMesh.setColorAt(i,this.color.setHex(l.color));});this.lineMesh.count=this.lines.length;this.lineMesh.instanceMatrix.needsUpdate=true;if(this.lineMesh.instanceColor)this.lineMesh.instanceColor.needsUpdate=true;
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;if(r.life<=0){r.m.removeFromParent();r.m.geometry.dispose();r.m.material.dispose();this.rings.splice(i,1);continue;}const t=1-r.life/r.max;r.m.scale.setScalar(r.radius*(.2+t*.8));r.m.material.opacity=(1-t)*.75;}
  }
  clear(){this.particles.length=0;this.lines.length=0;for(const r of this.rings){r.m.removeFromParent();r.m.geometry.dispose();r.m.material.dispose();}this.rings.length=0;this.mesh.count=this.lineMesh.count=0;}
}
