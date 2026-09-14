import * as THREE from 'three';
import {FINISH_BY_ID} from '../weapons/finishes.js';

const STYLE=`
#reward-receipt{position:fixed;top:19%;left:50%;transform:translate(-50%,12px);width:min(620px,75vw);padding:20px 28px 22px;box-sizing:border-box;text-align:center;background:linear-gradient(90deg,#08101900,#081019ec 14%,#081019ec 86%,#08101900);border-top:1px solid #d2bd7855;color:#eef1e7;pointer-events:none;opacity:0;transition:opacity .25s,transform .25s;z-index:22;font-family:Segoe UI,Arial,sans-serif}
#reward-receipt.show{opacity:1;transform:translate(-50%,0)}#reward-receipt .reward-title{font-size:23px;font-weight:500;letter-spacing:.045em}#reward-receipt .reward-items{display:flex;justify-content:center;gap:28px;margin-top:13px;flex-wrap:wrap;font:600 17px/1.5 Consolas,monospace}#reward-receipt .reward-items span{animation:receipt-in .4s both}#reward-receipt .reward-items .coins{color:#f0d17d}#reward-receipt .reward-items .xp{color:#a6e0e9}#reward-receipt .reward-detail{color:#b7c5c6;font-size:13px;line-height:1.55;margin-top:10px;white-space:pre-line}#reward-receipt .finish{color:#e6c4e9;border:1px solid #c0a3c35c;padding:6px 12px;font:14px/1.4 Segoe UI,Arial,sans-serif}
@keyframes receipt-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
`;
const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
export class RewardFeedback{
 static id='reward-feedback';
 constructor(ctx){this.ctx=ctx;this.off=[];this.queue=[];this.active=null;this.tokens=[];this.time=0;this.tone=0;}
 _sys(id){return this.ctx.systems.get(id);}
 init(){
  this.style=make('style');this.style.textContent=STYLE;document.head.append(this.style);this.panel=make('div');this.panel.id='reward-receipt';this.panel.setAttribute('role','status');this.panel.setAttribute('aria-live','polite');document.body.append(this.panel);
  this.root=new THREE.Group();this.root.name='earned-reward-tokens';this.ctx.scene.add(this.root);
  this.geos=[new THREE.CylinderGeometry(.31,.31,.075,12),new THREE.OctahedronGeometry(.27),new THREE.TorusGeometry(.40,.10,6,12)];
  this.mats=[new THREE.MeshBasicMaterial({color:0xecc268}),new THREE.MeshBasicMaterial({color:0x9fdbe1}),new THREE.MeshBasicMaterial({color:0xd7afe7})];
  this.meshes=this.geos.map((g,i)=>{const m=new THREE.InstancedMesh(g,this.mats[i],48);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;m.frustumCulled=false;this.root.add(m);return m;});this.matrix=new THREE.Matrix4();this.quat=new THREE.Quaternion();this.scale=new THREE.Vector3();this.aim=new THREE.Vector3();this.point=new THREE.Vector3();this.right=new THREE.Vector3();
  const on=(e,f)=>this.off.push(this.ctx.bus.on(e,f));
  on('boss:cleared',p=>{const finish=FINISH_BY_ID[p.skin];this.show({title:p.name+' defeated',cash:p.cash,xp:p.xp,finish:finish?.name||p.skin,detail:'Permanent rewards saved.\n'+(finish?'Weapon finish available on every gun · Esc → Weapons':''),x:p.x,y:p.y,z:p.z,boss:true});});
  on('reward:bundle',p=>this.show(p));
  on('refuge:power',p=>{if(p.on)this.show({title:'Power restored',detail:'The shelter is lit. Shut the door and rest.',quiet:true});});
  on('place:rested',()=>this.show({title:'Rested',detail:'Health restored. Carried XP banked.\nYour lit shelters are places to return to.',quiet:true}));
  on('lamp:replaced',()=>this.show({title:'Road light restored',detail:'One bulb used. A lit stretch of road to come back to.',quiet:true}));
  on('sanctuary:lit',()=>this.show({title:'The woods are lit',detail:'Your coins made a permanent circle of safe ground.',quiet:true}));
  on('gate:opened',()=>this.show({title:'Gate opened',detail:'The way through is clear.',quiet:true}));
  on('node:bought',p=>{if(p.auto)return;this.show({title:p.name||'Perk learned',detail:p.line||'Permanently yours.',quiet:true});});
  on('save:loaded',()=>{this.queue.length=0;this.tokens.length=0;this.active=null;this.panel.classList.remove('show');});
 }
 ready(){return !!this.panel;}
 show(p={}){
  // One complete receipt replaces anonymous overlapping flashes. Banked inventory
  // remains owned by Progress; particles are presentation and can never repay it.
  const item={...p,life:p.boss?8.5:p.quiet?4.7:5.4,age:0};
  if(p.boss){this.queue.unshift(item);if(this.active&&!this.active.boss)this.active.age=this.active.life;}
  else this.queue.push(item);
  if(!p.quiet)this._burst(p);
 }
 _burst(p){
  const player=this._sys('player');if(!player?.pos)return;
  const x=Number.isFinite(p.x)?p.x:player.pos.x,y=Number.isFinite(p.y)?p.y:player.pos.y+1,z=Number.isFinite(p.z)?p.z:player.pos.z;
  const kinds=[];if(p.cash>0)kinds.push(...Array(p.boss?16:7).fill(0));if(p.xp>0)kinds.push(...Array(p.boss?12:5).fill(1));if(p.finish||p.skin)kinds.push(2);if(!kinds.length)kinds.push(...Array(5).fill(1));
  for(let i=0;i<kinds.length&&this.tokens.length<120;i++){const a=i*2.39996,r=p.boss?7.0:2.2;this.tokens.push({kind:kinds[i],x,y,z,ox:x,oy:y,oz:z,vx:Math.cos(a)*r,vz:Math.sin(a)*r,vy:3.4+(i%4)*.55,age:-i*.023,phase:a,boss:!!p.boss});}
 }
 _start(p){
  this.active=p;this.panel.replaceChildren(make('div','reward-title',p.title||'Supplies found'));const items=make('div','reward-items');
  const add=(cls,text)=>{const node=make('span',cls,text);node.style.animationDelay=items.childElementCount*.22+'s';items.append(node);};
  if(p.cash>0)add('coins','◉  +'+p.cash+' COINS');if(p.xp>0)add('xp','◆  +'+p.xp+' XP');if(p.ammo>0)add('ammo','▰  +'+p.ammo+' AMMO');if(p.bulbs>0)add('coins','☼  +'+p.bulbs+' BULB'+(p.bulbs===1?'':'S'));if(p.finish)add('finish',p.finish+' · WEAPON FINISH');this.panel.append(items,make('div','reward-detail',p.detail||'Added to your inventory.'));this.panel.classList.add('show');p.nextTone=0;
 }
 step(dt){
  if(!this.ctx.playing||this.ctx.paused){this.panel.style.visibility='hidden';return;}this.panel.style.visibility='';this.time+=dt;
  if(this.active){const p=this.active;p.age+=dt;if(!p.quiet&&p.nextTone<3&&p.age>.5+p.nextTone*.42){this._sys('progress')?._chimeUI?.('xp_gain',1.04+p.nextTone*.17,p.boss?.28:.18);p.nextTone++;}if(p.age>p.life-.5)this.panel.classList.remove('show');if(p.age>=p.life)this.active=null;}
  if(!this.active&&this.queue.length)this._start(this.queue.shift());
  const camera=this.ctx.camera;if(!camera)return;camera.getWorldDirection(this.aim);this.point.copy(camera.position).addScaledVector(this.aim,1.7);this.right.setFromMatrixColumn(camera.matrixWorld,0);this.point.addScaledVector(this.right,-1.1);this.point.y+=.38;const counts=[0,0,0];
  for(let i=this.tokens.length-1;i>=0;i--){const t=this.tokens[i];t.age+=dt;if(t.age<0)continue;if(t.age>3.1){this.tokens.splice(i,1);continue;}const scatter=.78;
   if(t.age<scatter){t.x=t.ox+t.vx*t.age;t.z=t.oz+t.vz*t.age;t.y=t.oy+t.vy*t.age-1.8*t.age*t.age;}
   else{const f=1-Math.exp(-dt*(2.0+(t.age-scatter)*3.1));t.x+=(this.point.x-t.x)*f;t.y+=(this.point.y-t.y)*f;t.z+=(this.point.z-t.z)*f;}
   const dist=Math.hypot(t.x-this.point.x,t.y-this.point.y,t.z-this.point.z),size=Math.min(t.boss?.85:.7,Math.max(.045,dist*.10));if(t.age>scatter&&dist<.24){this.tokens.splice(i,1);continue;}this.scale.setScalar(size);this.quat.setFromEuler(new THREE.Euler(t.age*3,t.phase+t.age*2.5,.5));this.matrix.compose(new THREE.Vector3(t.x,t.y,t.z),this.quat,this.scale);if(counts[t.kind]<48)this.meshes[t.kind].setMatrixAt(counts[t.kind]++,this.matrix);
  }
  for(let i=0;i<3;i++){this.meshes[i].count=counts[i];this.meshes[i].instanceMatrix.needsUpdate=true;}
 }
 dispose(){for(const off of this.off)off?.();for(const g of this.geos)g.dispose();for(const m of this.mats)m.dispose();this.root?.removeFromParent();this.panel?.remove();this.style?.remove();}
}
