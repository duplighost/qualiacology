import * as THREE from 'three';
import {Kit} from './sites.js';
import {journeyState} from '../progression/journey.js';

export class FirstLight{
 static id='first-light';
 constructor(ctx){this.ctx=ctx;this.off=[];this.time=0;this.last='';this.boardKey='';}
 _sys(id){return this.ctx.systems.get(id);}
 init(){
  const station=this._sys('places').nodes.get('filling-station'),y=station.padY;this.root=new THREE.Group();this.root.name='station-way-forward';this.ctx.scene.add(this.root);
  // A cable physically leads from the supplies through the yard to the real
  // breaker. It is laid on the ground, clear of the doorway and walking volume.
  const points=[[-513,246],[-517.3,246],[-521.8,246],[-523.9,243.5],[-524.68,240.2]];
  const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,y+.085,z)));
  const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.055,6,false),new THREE.MeshStandardMaterial({color:0xb89439,roughness:.74}));tube.receiveShadow=true;this.root.add(tube);
  const k=new Kit();for(const[x,z]of points)for(const dx of[-.12,.12])k.box(.045,.035,.28,x+dx,y+.095,z,[.25,.22,.12]);
  const caseGeo=k.build(),caseMat=this._sys('places').matBody;this.root.add(new THREE.Mesh(caseGeo,caseMat));
  this.marker=new THREE.Mesh(new THREE.TorusGeometry(.19,.035,6,16),new THREE.MeshBasicMaterial({color:0xffcd68,transparent:true,opacity:.8}));this.root.add(this.marker);
  this.canvas=document.createElement('canvas');this.canvas.width=960;this.canvas.height=1100;this.texture=new THREE.CanvasTexture(this.canvas);this.texture.colorSpace=THREE.SRGBColorSpace;this.texture.anisotropy=4;
  // ABOVE THE COUNTER. ALEX, 2026-09-18: "sign at the first spawn point is partly blocked."
  // The station's own body stands in front of its bottom third and ate the last line and the
  // eleven marks. MEASURED by casting at the face on a 10 cm ladder from a reader's stance
  // 2.7 m out, eye 1.68: blocked at padY+0.90 through +1.30, clear from +1.40 up. The plane
  // is 1.89 tall, so a centre at +1.98 put its bottom at +1.035, a third of a metre inside
  // that. At +2.40 the bottom sits at +1.455 and the whole board is readable; the top goes to
  // +3.345, which is a 32-degree look up from that stance and is what a board over a counter
  // is. The texture keeps its aspect, so nothing in the drawing is squashed to fit.
  const board=new THREE.Mesh(new THREE.PlaneGeometry(1.65,1.89),new THREE.MeshBasicMaterial({map:this.texture,color:0xb7b09b}));board.position.set(-524.82,y+2.40,237.75);board.rotation.y=Math.PI/2;this.root.add(board);
  this.style=document.createElement('style');this.style.textContent='#journey-cue{position:fixed;right:28px;top:90px;width:250px;padding:13px 16px;border-left:2px solid #d0b67688;background:linear-gradient(90deg,#080e17cb,#080e1700);color:#dedcca;font:13px/1.55 Segoe UI,Arial,sans-serif;z-index:15;pointer-events:none}#journey-cue small{display:block;color:#a8b8bc;font:10px/1.5 Consolas,monospace;letter-spacing:.12em;margin-bottom:4px}';document.head.append(this.style);this.cue=document.createElement('div');this.cue.id='journey-cue';this.cue.hidden=true;document.body.append(this.cue);
  this.off.push(this.ctx.bus.on('place:rested',p=>{this._sys('progress').flag('journey:rested',true);if(p.id==='filling-station')this._sys('progress').flag('journey:station-rested',true);}));
  this.off.push(this.ctx.bus.on('boss:cleared',()=>{this.afterBoss=11;}));
  this.off.push(this.ctx.bus.on('save:loaded',()=>{this.last='';this.boardKey='';}));
 }
 ready(){return !!this.root;}
 _board(state,power){
  const key=state.marks+':'+power;if(key===this.boardKey)return;this.boardKey=key;const c=this.canvas.getContext('2d'),w=960;
  c.fillStyle='#242b28';c.fillRect(0,0,w,1100);c.strokeStyle='#ae9d6e';c.lineWidth=9;c.strokeRect(22,22,916,1056);c.fillStyle='#e1d4ad';c.font='bold 60px Georgia';c.textAlign='center';c.fillText('A ROAD TO MORNING',480,110);
  const rows=[['◇','SUPPLIES','Coins. Bulbs. Something to fight with.'],['☼','POWER','The switch lights this shelter.'],['⌂','REST','Shut the door. Bank what you earned.'],['☼','THE ROAD','Replace a bulb. Make a way home.']];
  rows.forEach((r,i)=>{const y=245+i*150;c.textAlign='left';c.fillStyle=i===1&&power?'#ffdd86':'#d6c694';c.font='58px Georgia';c.fillText(r[0],72,y+30);c.font='bold 37px Georgia';c.fillText(r[1],170,y+13);c.font='28px Georgia';c.fillStyle='#bec7b8';c.fillText(r[2],170,y+62);if(i<3){c.strokeStyle='#6d7966';c.lineWidth=3;c.beginPath();c.moveTo(100,y+52);c.lineTo(100,y+90);c.stroke();}});
  c.textAlign='center';c.fillStyle='#ded3ad';c.font='34px Georgia';c.fillText('ELEVEN MARKS → THE DAY BELL → MORNING',480,891);for(let i=0;i<11;i++){c.beginPath();c.arc(135+i*69,956,20,0,Math.PI*2);c.fillStyle=i<state.marks?'#f1c86b':'#101816';c.fill();c.strokeStyle='#a09569';c.lineWidth=3;c.stroke();}c.font='27px Georgia';c.fillStyle='#bac3b3';c.fillText('The people in the Holdfast know where to look.',480,1030);this.texture.needsUpdate=true;
 }
 step(dt){
  if(!this.ctx.ready)return;const p=this._sys('player');if(!p?.pos)return;const near=Math.hypot(p.pos.x+520,p.pos.z-240)<105,state=journeyState(this.ctx),refuge=this._sys('refuge'),pr=this._sys('progress');this._board(state,!!refuge?.power);this.time+=dt;this.afterBoss=Math.max(0,(this.afterBoss||0)-dt);
  const guidance=!pr.flag('guidance:hidden');this.root.visible=near;this.cue.hidden=this.ctx.paused||!this.ctx.playing||p.dead||!guidance||!!this._sys('boss-encounters')?.active?.alive;
  const cueKey=state.next+':'+state.marks;
  if(cueKey!==this.last){this.last=cueKey;this.cue.replaceChildren();const label=document.createElement('small');label.textContent=state.marks?'THE ELEVEN · '+state.marks+' / 11':'A WAY FORWARD';const text=document.createElement('span');text.textContent=state.next;this.bearing=document.createElement('small');this.bearing.style.marginTop='7px';this.cue.append(label,text,this.bearing);}
  const target=state.target;this.marker.visible=guidance&&near&&!!target&&!(target.near>0&&Math.hypot(p.pos.x-target.x,p.pos.z-target.z)<target.near);
  if(this.bearing){this.bearing.hidden=!target;if(target){this._look??=new THREE.Vector3();this.ctx.camera.getWorldDirection(this._look);const dx=target.x-p.pos.x,dz=target.z-p.pos.z,angle=Math.atan2(dx,dz)-Math.atan2(this._look.x,this._look.z),arrows=['↑','↗','→','↘','↓','↙','←','↖'];this.bearing.textContent=arrows[((Math.round(angle/(Math.PI/4))%8)+8)%8]+'  '+Math.round(Math.hypot(dx,dz))+' m';}}
  if(target){let y=Number.isFinite(target.y)?target.y:this._sys('terrain').heightAt(target.x,target.z)+1.05;if(!refuge?.power&&pr.flag('supply:opening:first-light'))y=refuge.breakerWY;const lamp=this._sys('dusk-to-dawn').poles.find(q=>q.opening);if(lamp&&target.x===lamp.x)y=lamp.gy+1.5;this.marker.position.set(target.x,y+.065*Math.sin(this.time*2),target.z);this.marker.lookAt(this.ctx.camera.position);this.marker.material.opacity=.6+.18*Math.sin(this.time*2);}
 }
 dispose(){this.off.forEach(f=>f?.());this.root?.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==this._sys('places').matBody)o.material.dispose();});this.root?.removeFromParent();this.texture?.dispose();this.cue?.remove();this.style?.remove();}
}
