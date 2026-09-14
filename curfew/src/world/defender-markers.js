import * as THREE from 'three';

// Marks refer to the very same persisted cast slots that gate the power switch.
export class DefenderMarkers{
 constructor(ctx){this.ctx=ctx;this.point=new THREE.Vector3();this.forward=new THREE.Vector3();this.nodes=[];this.root=document.createElement('div');this.root.id='defender-markers';this.root.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9';document.body.append(this.root);this.title=document.createElement('div');this.title.style.cssText='position:absolute;left:50%;top:12%;transform:translateX(-50%);font:13px Georgia;color:#efd6b7;text-shadow:0 1px 5px #000;background:#111924cc;padding:9px 15px';this.root.append(this.title);}
 update(row,targets){
  this.root.hidden=!row||!this.ctx.playing||this.ctx.paused||this.ctx.systems.get('player')?.dead;if(this.root.hidden)return;
  this.title.textContent=row.remaining?row.name+' · '+row.remaining+' marked '+(row.remaining===1?'defender':'defenders'):row.name+' · Clear. Restore the power.';
  const camera=this.ctx.camera;camera.getWorldDirection(this.forward);const w=window.innerWidth,h=window.innerHeight;
  targets.forEach((t,i)=>{
   let n=this.nodes[i];if(!n){n=document.createElement('div');n.style.cssText='position:absolute;transform:translate(-50%,-50%);color:#f3b777;font:11px Georgia;letter-spacing:.07em;text-shadow:0 1px 3px #000,0 0 6px #000;text-align:center';this.root.append(n);this.nodes.push(n);}
   this.point.set(t.x,t.y,t.z);const distance=this.point.distanceTo(camera.position),dx=t.x-camera.position.x,dz=t.z-camera.position.z,front=dx*this.forward.x+dz*this.forward.z;this.point.project(camera);
   const onscreen=front>0&&Math.abs(this.point.x)<.88&&Math.abs(this.point.y)<.70;
   const angle=Math.atan2(dx,dz)-Math.atan2(this.forward.x,this.forward.z),side=Math.sin(angle);
   n.style.left=(onscreen?(this.point.x*.5+.5)*w:side>=0?w*.94:w*.06)+'px';n.style.top=(onscreen?(-this.point.y*.5+.5)*h:h*(.30+(i%6)*.072))+'px';n.hidden=false;
   n.textContent=(onscreen?'◇':side>=0?'→':'←')+' '+t.label+' · '+Math.round(distance)+' m';
  });
  for(let i=targets.length;i<this.nodes.length;i++)this.nodes[i].hidden=true;
 }
 dispose(){this.root.remove();}
}
