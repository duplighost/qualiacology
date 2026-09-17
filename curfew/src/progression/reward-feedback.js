import * as THREE from 'three';

const STYLE=`
#reward-receipt{position:fixed;top:19%;left:50%;transform:translate(-50%,12px);width:min(620px,75vw);padding:20px 28px 22px;box-sizing:border-box;text-align:center;background:linear-gradient(90deg,#08101900,#081019ec 14%,#081019ec 86%,#08101900);border-top:1px solid #d2bd7855;color:#eef1e7;pointer-events:none;opacity:0;transition:opacity .25s,transform .25s;z-index:22;font-family:Segoe UI,Arial,sans-serif}
#reward-receipt.show{opacity:1;transform:translate(-50%,0)}#reward-receipt .reward-title{font-size:23px;font-weight:500;letter-spacing:.045em}#reward-receipt .reward-items{display:flex;justify-content:center;gap:28px;margin-top:13px;flex-wrap:wrap;font:600 17px/1.5 Consolas,monospace}#reward-receipt .reward-items span{animation:receipt-in .4s both}#reward-receipt .reward-items .coins{color:#f0d17d}#reward-receipt .reward-items .xp{color:#a6e0e9}#reward-receipt .reward-detail{color:#b7c5c6;font-size:13px;line-height:1.55;margin-top:10px;white-space:pre-line}#reward-receipt .finish{color:#e6c4e9;border:1px solid #c0a3c35c;padding:6px 12px;font:14px/1.4 Segoe UI,Arial,sans-serif}#reward-receipt .reward-items .part{color:#d6dbe0;border:1px solid #9aa4ad5c;padding:6px 12px;font:14px/1.4 Segoe UI,Arial,sans-serif}#reward-receipt .reward-items .gas{color:#f0b47d}
@keyframes receipt-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
`;
const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
export class RewardFeedback{
 static id='reward-feedback';
 // D11: one ui tone per receipt, and none when receipts arrive on top of each other. The
 // world-bus xp_gain from progress already answered the pickup; the receipt's tone is the
 // card sliding in, not a second payment. Two timestamps: when this receipt started and
 // when the one before it did.
 constructor(ctx){this.ctx=ctx;this.off=[];this.queue=[];this.active=null;this.tokens=[];this.time=0;this.tone=0;this.lastStartAt=-1e9;this.prevStartAt=-1e9;}
 _sys(id){return this.ctx.systems.get(id);}
 init(){
  this.style=make('style');this.style.textContent=STYLE;document.head.append(this.style);this.panel=make('div');this.panel.id='reward-receipt';this.panel.setAttribute('role','status');this.panel.setAttribute('aria-live','polite');document.body.append(this.panel);
  this.root=new THREE.Group();this.root.name='earned-reward-tokens';this.ctx.scene.add(this.root);
  // 0 coin, 1 xp, 2 weapon finish, 3 CAR PART. The part is chrome and heavier-looking than
  // the rest, and it is the only one that flies to the CAR rather than to the camera.
  this.geos=[new THREE.CylinderGeometry(.31,.31,.075,12),new THREE.OctahedronGeometry(.27),new THREE.TorusGeometry(.40,.10,6,12),new THREE.OctahedronGeometry(.33,1)];
  this.mats=[new THREE.MeshBasicMaterial({color:0xecc268}),new THREE.MeshBasicMaterial({color:0x9fdbe1}),new THREE.MeshBasicMaterial({color:0xd7afe7}),new THREE.MeshBasicMaterial({color:0xc9d3da})];
  this.meshes=this.geos.map((g,i)=>{const m=new THREE.InstancedMesh(g,this.mats[i],48);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;m.frustumCulled=false;this.root.add(m);return m;});this.matrix=new THREE.Matrix4();this.quat=new THREE.Quaternion();this.scale=new THREE.Vector3();this.aim=new THREE.Vector3();this.point=new THREE.Vector3();this.right=new THREE.Vector3();
  const on=(e,f)=>this.off.push(this.ctx.bus.on(e,f));
  // THE ELEVEN REWIRE. A boss leaves a PART, and the part is the headline: it is already on
  // the car by the time this runs. The second line is Bo's, about the board he made — Alex's
  // words, and the first part you earn is the right place for them.
  on('boss:cleared',p=>{const part=p.part;this.show({title:p.name+' defeated',cash:p.cash,xp:p.xp,part:part?.name||'',
   detail:part?'Fitted to the car. Permanent.\nEverything you take from the eleven goes on it, and it holds.':'Permanent rewards saved.',
   x:p.x,y:p.y,z:p.z,boss:true});});
  // A sealed case. The coins arrive on their own through pickup:coin; this is the finish.
  on('finish:found',p=>this.show({title:'A sealed case',finish:(p.name||'').toUpperCase(),
   detail:'Every gun you own, now and later · Esc → Weapons'}));
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
  const kinds=[];if(p.cash>0)kinds.push(...Array(p.boss?16:7).fill(0));if(p.xp>0)kinds.push(...Array(p.boss?12:5).fill(1));if(p.finish||p.skin)kinds.push(2);if(p.part)kinds.push(3,3,3);if(!kinds.length)kinds.push(...Array(5).fill(1));
  for(let i=0;i<kinds.length&&this.tokens.length<120;i++){const a=i*2.39996,r=p.boss?7.0:2.2;this.tokens.push({kind:kinds[i],x,y,z,ox:x,oy:y,oz:z,vx:Math.cos(a)*r,vz:Math.sin(a)*r,vy:3.4+(i%4)*.55,age:-i*.023,phase:a,boss:!!p.boss,toCar:kinds[i]===3});}
 }
 _start(p){
  this.active=p;this.panel.replaceChildren(make('div','reward-title',p.title||'Supplies found'));const items=make('div','reward-items');
  const add=(cls,text)=>{const node=make('span',cls,text);node.style.animationDelay=items.childElementCount*.22+'s';items.append(node);};
  if(p.cash>0)add('coins','◉  +'+p.cash+' COINS');if(p.xp>0)add('xp','◆  +'+p.xp+' XP');if(p.ammo>0)add('ammo','▰  +'+p.ammo+' AMMO');if(p.bulbs>0)add('coins','☼  +'+p.bulbs+' BULB'+(p.bulbs===1?'':'S'));if(p.gas>0)add('gas','▮  +'+p.gas+' GAS');if(p.finish)add('finish',p.finish+' · WEAPON FINISH');if(p.part)add('part',p.part+' · CAR PART');this.panel.append(items,make('div','reward-detail',p.detail||'Added to your inventory.'));this.panel.classList.add('show');p.nextTone=0;
 }
 step(dt){
  if(!this.ctx.playing||this.ctx.paused){this.panel.style.visibility='hidden';return;}this.panel.style.visibility='';this.time+=dt;
  // D11: ONE tone, 0.5 s in (the card is on screen by then), and none at all when the
  // previous receipt started under 3 s ago — three ascending copies per receipt, times a
  // queue, was "the little melody that plays too many times".
  if(this.active){const p=this.active;p.age+=dt;if(!p.quiet&&p.nextTone<1&&p.age>.5&&p.age<p.life){p.nextTone=1;if(this.lastStartAt-this.prevStartAt>=3)this._sys('progress')?._chimeUI?.('xp_gain',1.12,p.boss?.24:.14);}if(p.age>p.life-.5)this.panel.classList.remove('show');if(p.age>=p.life)this.active=null;}
  if(!this.active&&this.queue.length){this.prevStartAt=this.lastStartAt;this.lastStartAt=this.time;this._start(this.queue.shift());}
  const camera=this.ctx.camera;if(!camera)return;camera.getWorldDirection(this.aim);this.point.copy(camera.position).addScaledVector(this.aim,1.7);this.right.setFromMatrixColumn(camera.matrixWorld,0);this.point.addScaledVector(this.right,-1.1);this.point.y+=.38;const counts=[0,0,0,0];
  // A PART goes to the CAR, not to your hands: it is the thing being fitted. Recomputed every
  // step so a car that is rolling is still the target. No car within 150 m and it flies to
  // the camera like everything else — ownership never depended on where a token went.
  const car=this._sys('car');let carX=0,carY=0,carZ=0,carNear=false;
  if(car&&Number.isFinite(car.x)){const dx=car.x-this.point.x,dz=car.z-this.point.z;carNear=dx*dx+dz*dz<150*150;carX=car.x;carY=car.y+1.2;carZ=car.z;}
  for(let i=this.tokens.length-1;i>=0;i--){const t=this.tokens[i];t.age+=dt;if(t.age<0)continue;if(t.age>3.1){this.tokens.splice(i,1);continue;}const scatter=.78;
   if(t.age<scatter){t.x=t.ox+t.vx*t.age;t.z=t.oz+t.vz*t.age;t.y=t.oy+t.vy*t.age-1.8*t.age*t.age;}
   const gx=t.toCar&&carNear?carX:this.point.x,gy=t.toCar&&carNear?carY:this.point.y,gz=t.toCar&&carNear?carZ:this.point.z;
   if(t.age>=scatter){const f=1-Math.exp(-dt*(2.0+(t.age-scatter)*3.1));t.x+=(gx-t.x)*f;t.y+=(gy-t.y)*f;t.z+=(gz-t.z)*f;}
   const dist=Math.hypot(t.x-gx,t.y-gy,t.z-gz),size=Math.min(t.boss?.85:.7,Math.max(.045,dist*.10));if(t.age>scatter&&dist<.24){this.tokens.splice(i,1);continue;}this.scale.setScalar(size);this.quat.setFromEuler(new THREE.Euler(t.age*3,t.phase+t.age*2.5,.5));this.matrix.compose(new THREE.Vector3(t.x,t.y,t.z),this.quat,this.scale);if(counts[t.kind]<48)this.meshes[t.kind].setMatrixAt(counts[t.kind]++,this.matrix);
  }
  for(let i=0;i<4;i++){this.meshes[i].count=counts[i];this.meshes[i].instanceMatrix.needsUpdate=true;}
 }
 dispose(){for(const off of this.off)off?.();for(const g of this.geos)g.dispose();for(const m of this.mats)m.dispose();this.root?.removeFromParent();this.panel?.remove();this.style?.remove();}
}
