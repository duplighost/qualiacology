// The inhabited Holdfast: the same real bodies, weapons, cash and map as the county.
import * as THREE from 'three';
import { HOLDFAST_TOWN as TOWN } from './holdfast-town-layout.js';
import { BOSSES, bossMapPoint } from './boss-catalog.js';
import { STOCK } from './dealer.js';
import { UPGRADES } from '../vehicle/garage.js';
import { CFG } from '../config.js';
import { faceYaw } from '../enemies/nav.js';

const STORIES = {
  candlekeeper: ['Mara · candle keeper', ['We used to light these for the dead. Now we light them so people know which doors will open.', 'Keep a bulb with you. A road looks different when you know you can make one piece of it safe.']],
  mender: ['Els · mender', ['The flags were bed sheets. There was enough blue left for everyone to have the same sky.', 'They call the place east of here Morning. I do not know whether that is a name or a promise.'], 'morning'],
  baker: ['Tomas · baker', ['The ovens have not gone cold in six years. Someone always takes the next shift.', 'You can sleep here knowing someone else is awake. That used to be an ordinary thing.']],
  nurse: ['Ruth · infirmary', ['Leave the door open if you need help. Close it if you need quiet.', 'The people we pulled out of the western marsh all had the same white threads in their mouths.'], 'mire'],
  teacher: ['Iona · schoolkeeper', ['The children draw the sun from other drawings of the sun. We have to be careful what we get wrong.', 'A driver said there are seats facing a white roof in Morning. Perhaps they are waiting for something.'], 'morning'],
  'watch-wife': ['Ada · the watch house', ['The watch will shoot anything that follows you in. Leave your car in the road. There are people behind these walls.', 'One of the north patrols came back without their engine. The hoofprints were bigger than the car.'], 'antler'],
  innkeeper: ['Oren · innkeeper', ['There is a clean cup on the table. Nobody asks where you slept before this.', 'At the southern silos they heard a whole crowd singing. They found no footprints going in.'], 'choir'],
  cook: ['Nell · cook', ['You cannot live on whatever you find in a dead man’s pockets. Sit down a moment.', 'The bowl on the eastern stair comes back empty. I stopped putting my name on it.'], 'underkeep'],
  archivist: ['Vera · keeper of days', ['The first year is written in three different hands. After that we stopped numbering them.', 'Morning is on the old road maps. Every witness gives a different account. A dome. A machine. An hour that repeats.'], 'morning'],
  gardener: ['Em · gardener', ['The glass keeps the frost out. We carry the soil inside in our coats.', 'There is an orchard where the roots move before the wind. The trunks have the shape of people holding each other.'], 'rootmother'],
  bellkeeper: ['Hale · bell keeper', ['We ring ours by hand. Only when someone comes home.', 'The bell beyond Jackfield rings without a rope. If you hear a second note, move.'], 'bellwether'],
  widower: ['Seth · the empty chairs', ['That chair is taken. It can stay empty and still be taken.', 'We sealed the stair after the third group. There are names scratched under the warning. My brother’s is the last.'], 'underkeep'],
  traveller: ['Joss · road traveller', ['From the station, stay on the gravel until you see our low walls. The gaps are for people; the wide road is for engines.', 'The light under the south-east viaduct has followed me twice. It goes out when you turn to look straight at it.'], 'lantern'],
  roadcook: ['Min · gate cook', ['The soup is hot. That is the whole advertisement.', 'The charcoal works east of here were closed before the sky went wrong. They are burning again.'], 'furnace'],
  wellkeeper: ['Bram · well keeper', ['We lower the bucket slowly. There are things you do not want to wake by being careless.', 'At the western lock the boats wash up folded. You can still hear water inside the wood.'], 'blacktide'],
  shrinekeeper: ['Leda · keeper of the lamps', ['The statues face the streets. We decided it was kinder than making them look at the sky.', 'The northern conservatory looks like it is wearing snow. A trader told me the snow breathed.'], 'moth'],
};
const NAMES=['Perrin','Moss','Una','Dara','Silas','Wren','Kit'];
const UPPER_STORIES={
 'roof-seamstress':['Linn · the washing lines',['The wind dries everything stiff. Bring the sheets in before they break.','The little houses south of here used to have their lights on all night. They were waiting for a family who never arrived.']],
 'roof-baker':['Aven · oven watch',['You can tell who is awake by which chimney is warm.','Tomas says the ovens have never gone out. They have. I stayed up with him until we got them going again.']],
 'roof-gardener':['Fern · roof garden',['Nothing grows down in the alleys. Up here we can still pretend it knows which way the sun is.','The seeds came from under the white roof in Morning. That is what the packet said.'],'morning'],
 'roof-teacher':['Ansel · the lookout',['Come up here when you lose your way. Roads make more sense when you can see where they stop.','There is a forest road that simply ends. A house used to be there. Its washing line is still tied to two trees.']],
 'roof-watch':['Mae · roof watch',['Stay on the stone when you cross the bridges. The ice on the parapets is not a path.','Something underneath the western field pushes the soil up in long lines. Keep to the road.'],'fieldmaw'],
 'keep-cook':['Cora · the common kitchen',['The upper floors eat later. Getting everything up those stairs takes a while.','When somebody comes back, we move a chair to make room. We have never run out of chairs.']],
 'keep-nurse':['Edith · the upper infirmary',['There is clean water by the bed. Let it thaw before you drink.','The men from the sealed stair had old cuts on their palms. They had held the same handrail all the way down.'],'underkeep'],
 'keep-reader':['Orla · the map room',['A route crossed out is useful. Somebody lived long enough to come back and cross it out.','Morning is circled on every edition. Nobody ever wrote what they found there.'],'morning'],
 'keep-weaver':['Nessa · the looms',['The first moon banner was a blanket. We make the edges stronger now.','The old notices said the roads were open. We turned them over. Good paper is hard to find.']],
 'keep-watcher':['Ives · the high watch',['You made it. On a clear night you can see three watch fires from here.','We do not ring the bell for what we see outside. Only for the people who come back.']],
};
const _from=new THREE.Vector3(),_to=new THREE.Vector3(),_ray=new THREE.Vector3();
// These are the residents' accounts. The underlying account stays out of their mouths.
const LORE_LINES={
 archivist:'Aven wrote when I could not. Then Orla. Then me again. Three hands in the first year. After that, moons.',
 cook:'I put one bowl aside. Whatever we ate. Hot, still. It goes at the foot of the east stair.',
 widower:'Amos. My brother. The last name under the warning. Purple cloth for the stair. Pale for the road.',
 baker:'Someone always takes the next shift. The stone stays warm. Both things help.',
 teacher:'Nineteen children. Eleven born since. I took them to Morning once, on foot. I would not take them again.',
 nurse:'The threads do not pull free. I leave them now. I can still keep someone warm.',
 'watch-wife':'Four chairs at our table. Three used. Leave the car in the road. Nothing good comes up through a road.',
 shrinekeeper:'I trim them every night. They do not need it. If that ever changes, somebody should remember how.',
 wellkeeper:'That thing with the ledger has my father’s hands. Lower the bucket quietly.',
 gardener:'Moonlight will grow something. We watch very carefully what it grows.',
 roadcook:'Marguerite asked me to shut the number four door. Somebody had to. There is soup.',
 traveller:'It followed me from the viaduct. I did not turn around. Not once.',
 'keep-nurse':'The same cut across the palm. The same handrail. An old cut, even on the ones who only just went down.',
 'keep-reader':'Morning is circled on every edition. Different hands. I trust the roads somebody crossed out.',
 'roof-gardener':'The seeds came up in the foyer cracks at Morning. Warm ground. We count them every moon.',
 'keep-weaver':'We turned the evacuation notices over. The first banner was a blanket. We use stronger edges now.',
};

export class HoldfastLife {
  static id='holdfast-life';
  constructor(ctx){
    this.ctx=ctx;this.people=[];this.time=0;this.away=0;this.epoch=0;this.target='';
    this.hold=0;this.useLock=false;this.tuneLock=false;this.offer=0;this.chat=null;
    this.off=[];this.shotAt=new Map();this.signs=[];this.lamps=new Map();this.lightAt=0;
  }
  _sys(id){return this.ctx.systems.get(id);}
  _frame(){return this._sys('places')?.nodes.get('holdfast');}
  world(x,z,y=0){const f=this._frame(),yaw=f?.yaw||0,cy=Math.cos(yaw),sy=Math.sin(yaw);return {x:(f?.def.x||0)+x*cy+z*sy,y:(f?.padY||0)+y,z:(f?.def.z||0)-x*sy+z*cy};}
  local(x,z){const f=this._frame(),yaw=f?.yaw||0,dx=x-(f?.def.x||0),dz=z-(f?.def.z||0);return{x:dx*Math.cos(yaw)-dz*Math.sin(yaw),z:dx*Math.sin(yaw)+dz*Math.cos(yaw)};}
  contains(x,z,padding=0){const p=this.local(x,z),b=TOWN.bounds;return p.x>b.minX-padding&&p.x<b.maxX+padding&&p.z>b.minZ-padding&&p.z<b.maxZ+padding;}
  async init(){
    this._sys('progress')?.flag('gate-hostile:holdfast',0);
    for(const r of TOWN.residents)this.people.push({...r,story:STORIES[r.id],e:null,gen:0,line:0});
    for(const r of TOWN.elevatedResidents||[])this.people.push({...r,story:UPPER_STORIES[r.id]||['The upper watch',['We can see the road from here. Someone has to.']],e:null,gen:0,line:0});
    for(const r of TOWN.guards||[])this.people.push({...r,guard:true,story:['The Holdfast watch',['Keep your weapon down in the streets. If something follows you here, bring it to us.']],e:null,gen:0,line:0});
    TOWN.routes.forEach((route,i)=>this.people.push({id:'walker-'+i,x:route[0][0],z:route[0][1],y:route[0][2]||0,yaw:0,route,waypoint:1,direction:1,pause:i*.4,story:[NAMES[i%NAMES.length],['People still knock here. I like that.','Every lamp has someone who cleans the glass. That is how this place stays here.']],e:null,gen:0,line:0}));
    for(const s of TOWN.shops)this.people.push({...s,shop:s.kind,story:[s.kind==='weapons'?(s.outside?'Fen · road armourer':'Merrit · armourer'):(s.outside?'Bo · gate mechanic':'Ari · engine keeper'),[s.kind==='weapons'?'Clean barrels. Dry rounds. Keep both that way.':'Bring the car back in one piece. Or as close as you can manage.']],e:null,gen:0,line:0});
    this._buildUI();this._signs();
    for(const r of this.people)if(LORE_LINES[r.id])r.story=[r.story[0],[r.story[1][0],LORE_LINES[r.id],...r.story[1].slice(1)],r.story[2]];
    const linn=this.people.find(r=>r.id==='roof-seamstress');if(linn)linn.story[1][0]='The washing hangs still. It has not moved in six years. Bring the sheets in before they freeze.';
    const aven=this.people.find(r=>r.id==='roof-baker');if(aven)aven.story[1][1]='The stone underneath the ovens stays warm. Tomas talks about the shifts. I let him.';
    this.off.push(this.ctx.bus.on('player:respawn',()=>this.reset()));
    this.off.push(this.ctx.bus.on('save:loaded',()=>this.reset()));
    this.off.push(this.ctx.bus.on('gate:hostile',e=>{if(e.id==='holdfast'){this.chat=null;this._sys('audio')?.dread?.('dealer-rack',this.world(0,66).x,this.world(0,66).y+1.5,this.world(0,66).z,.3);}}));
  }
  ready(){return this.people.length>=20;}
  _buildUI(){
    this.ui=document.createElement('section');this.ui.id='holdfast-conversation';this.ui.setAttribute('aria-live','polite');
    this.ui.style.cssText='position:fixed;left:50%;bottom:10%;transform:translateX(-50%);width:min(650px,76vw);padding:22px 28px;color:#e3e1db;background:linear-gradient(110deg,rgba(13,17,27,.96),rgba(20,24,33,.93));border:1px solid #76798b66;border-left:3px solid #b7b0d0;box-shadow:0 18px 70px #0008;border-radius:3px;font:17px/1.6 Georgia,serif;z-index:22;display:none;pointer-events:none';
    this.personEl=document.createElement('div');this.personEl.style.cssText='font:11px/1.4 system-ui;letter-spacing:.17em;text-transform:uppercase;color:#b8b3d0;margin-bottom:9px';
    this.textEl=document.createElement('div');this.footer=document.createElement('div');this.footer.style.cssText='font:10px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#979ba6;margin-top:13px';
    this.ui.append(this.personEl,this.textEl,this.footer);document.body.append(this.ui);
    this.shopEl=document.createElement('section');this.shopEl.id='holdfast-shop';
    this.shopEl.style.cssText='position:fixed;right:4%;top:22%;width:310px;max-height:60vh;overflow:hidden;background:linear-gradient(135deg,#101721f2,#12131eee);color:#e4e1da;border:1px solid #8f869966;border-radius:4px;padding:22px;box-shadow:0 20px 80px #0008;font:13px/1.5 system-ui;display:none;pointer-events:none;z-index:21';document.body.append(this.shopEl);
  }
  _signs(){
    const group=this.signGroup=new THREE.Group();group.name='holdfast-painted-signs';this.ctx.scene.add(group);
    for(const s of TOWN.signs){
      const c=document.createElement('canvas');c.width=768;c.height=256;const a=c.getContext('2d');
      a.fillStyle='#030406';a.fillRect(0,0,768,256);a.strokeStyle='#343442';a.lineWidth=3;a.strokeRect(12,12,744,232);
      const lines=s.text.split('\n');a.textAlign='center';a.textBaseline='middle';a.fillStyle='#524f43';
      lines.forEach((line,i)=>{a.font=(i===0?'28px':'24px')+' Georgia';a.fillText(line,384,128+(i-(lines.length-1)/2)*49);});
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.NoColorSpace;const mat=this._sys('places').matBody.clone();mat.map=tex;mat.bumpScale=0;
      const geo=new THREE.PlaneGeometry(2.6,.87);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));const mesh=new THREE.Mesh(geo,mat),p=this.world(s.x,s.z,s.y||2.3);mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=(this._frame()?.yaw||0)+s.yaw;mesh.name='painted-town-sign';group.add(mesh);this.signs.push(mesh);
    }
  }
  reset(){
    const en=this._sys('enemies'),places=this._sys('places');
    this.epoch++;this.away=0;this.chat=null;this.target='';this.hold=0;this.offer=0;this.useLock=false;this.tuneLock=false;
    this.shotAt.clear();this._sys('progress')?.flag('gate-hostile:holdfast',0);
    // A pooled record may already belong to another person. Release only this life,
    // and return its attack token before releasing its body slot.
    const release=(e,gen)=>{if(e&&e.gen===gen){en?._uncommit(e);en?._release(e);}};
    for(const r of this.people){
      release(r.e,r.gen);r.e=null;r.gen=0;r.dead=false;
      if(r.route){r.waypoint=1;r.direction=1;r.pause=0;}
    }
    const cast=places?._casts.get('major:holdfast');
    if(cast)for(const c of cast.cast){
      if(!c.neutral)continue;release(c.entity,c.generation);c.entity=null;c.generation=0;c.spawned=false;
      cast.placed=false;cast.retryAt=0;places._castDone.delete(cast.key);
    }
    if(en?._gateAway?.holdfast)en._gateAway.holdfast.t=0;
    for(const h of this.lamps.values())this._sys('lights')?.release(h);this.lamps.clear();
  }
  _spawn(r){
    const p=this.world(r.x,r.z,(r.y||0)+.035),yaw=(this._frame()?.yaw||0)+(r.yaw||0)+Math.PI,en=this._sys('enemies');
    r.e=en.spawn(r.guard?'marshal':'resident',p.x,p.z,{staged:true,neutral:true,initiallyNeutral:true,siteGuard:'holdfast',townGuard:!!r.guard,townCivilian:!r.guard,feetY:p.y,yaw,placementRadius:1.2});
    if(r.e){
      r.gen=r.e.gen;r.e.looted=true;r.e.townName=r.story[0];r.e.townHome={x:p.x,z:p.z};
      // A guard whose pool slot became available after the crime joins the same fight.
      if(r.guard&&this._sys('progress')?.flag('gate-hostile:holdfast'))en.provokeGate('holdfast');
    }
  }
  _walk(r,dt){
    const e=r.e;if(!r.route||!e?.alive||!e.neutral)return;
    if(this.chat?.id===r.id || this.target===r.id){e.townWalk=0;return;}
    if(r.pause>0){r.pause-=dt;e.townWalk=0;return;}
    const q=r.route[r.waypoint],goal=this.world(q[0],q[1],(q[2]||0)+.035),dx=goal.x-e.stagedX,dz=goal.z-e.stagedZ,d=Math.hypot(dx,dz);
    if(d<.22){r.waypoint+=r.direction;if(r.waypoint>=r.route.length||r.waypoint<0){r.direction*=-1;r.waypoint+=r.direction*2;r.pause=3+r.line%3;}return;}
    const speed=this._sys('progress').flag('gate-hostile:holdfast')?1.65:.74;
    _from.set(e.stagedX,e.stagedY+.8,e.stagedZ);_ray.set(dx/d,0,dz/d);
    const col=this._sys('collision'),blocked=col.raycast(_from,_ray,.65,col.MASK.SOLID);
    if(blocked&&blocked.hit!==false){r.direction*=-1;r.waypoint=Math.max(0,Math.min(r.route.length-1,r.waypoint+r.direction));r.pause=1;e.townWalk=0;return;}
    const p=this._sys('player');if(Math.hypot(p.pos.x-e.pos.x,p.pos.z-e.pos.z)<1.4){e.townWalk=0;return;}
    e.stagedYaw=faceYaw(e.stagedX,e.stagedZ,goal.x,goal.z);e.stagedX+=dx/d*Math.min(d,speed*dt);e.stagedZ+=dz/d*Math.min(d,speed*dt);e.townWalk=speed;
    e.stagedY+=(goal.y-e.stagedY)*Math.min(1,speed*dt/Math.max(d,.01));
  }
  _sight(a,b,height=1.2){
    _from.set(a.x,a.y+height,a.z);_to.set(b.x,b.y+1.15,b.z);_ray.subVectors(_to,_from);const d=_ray.length();_ray.multiplyScalar(1/Math.max(.001,d));
    const col=this._sys('collision'),h=col.raycast(_from,_ray,Math.max(0,d-.35),col.MASK.SIGHT|col.MASK.GROUND);return !(h&&h.hit!==false);
  }
  _light(){
    if(this.time<this.lightAt)return;this.lightAt=this.time+.5;
    const p=this._sys('player').pos,lights=this._sys('lights');
    if(this.ctx.shared.holdfastBlackout){for(const h of this.lamps.values())lights.release(h);this.lamps.clear();return;}
    const nearby=[...TOWN.buildings.map(b=>({...b,y:(b.y||0)+2.9})),...TOWN.lamps].map(b=>({b,p:this.world(b.x,b.z,b.y)})).map(q=>({...q,d:Math.hypot(p.x-q.p.x,p.y-q.p.y,p.z-q.p.z)})).filter(q=>q.d<28).sort((a,b)=>a.d-b.d).slice(0,2);
    const want=new Set(nearby.map(q=>q.b.id));for(const[id,h]of this.lamps)if(!want.has(id)){lights.release(h);this.lamps.delete(id);}
    for(const q of nearby){const relight=this.ctx.shared.holdfastRelight??1,index=[...TOWN.buildings,...TOWN.lamps].findIndex(b=>b.id===q.b.id);if(relight<1&&index/Math.max(1,TOWN.buildings.length+TOWN.lamps.length)>relight)continue;const old=this.lamps.get(q.b.id);if(old?.inUse)continue;const h=lights.borrow('holdfast:'+q.b.id,q.p.x,q.p.y,q.p.z,0xffbd79,18,0);if(h){h.distance=19;this.lamps.set(q.b.id,h);}}
  }
  _protect(dt){
    const en=this._sys('enemies'),p=this._sys('player');if(!this.contains(p.pos.x,p.pos.z,100))return;
    const guards=en.all.filter(e=>e.alive&&e.initiallyNeutral&&e.siteGuard==='holdfast'&&!e.townCivilian);
    for(const g of guards){g.townGuard=true;g.townAim=0;if(!g.neutral)continue;
      let target=null,dist=56;for(const e of en.all){if(!e.alive||e.initiallyNeutral||e.neutral)continue;const d=Math.hypot(e.pos.x-g.pos.x,e.pos.z-g.pos.z);if(d<dist&&this._sight(g.pos,e.pos)){target=e;dist=d;}}
      if(!target)continue;g.stagedYaw=faceYaw(g.pos.x,g.pos.z,target.pos.x,target.pos.z);g.townAim=1;
      const last=this.shotAt.get(g.id)||0;if(this.time<last)continue;this.shotAt.set(g.id,this.time+.8);
      const mz=g.built.muzzle,sy=Math.sin(g.stagedYaw),cy=Math.cos(g.stagedYaw),scale=g.scale;
      _from.set(g.pos.x+(mz?mz.x*cy+mz.z*sy:0)*scale,g.pos.y+(mz?mz.y*scale:1.5),g.pos.z+(mz?-mz.x*sy+mz.z*cy:0)*scale);
      _ray.set(target.pos.x-_from.x,target.pos.y+1-_from.y,target.pos.z-_from.z).normalize();
      this._sys('fx')?.tracer?.(_from,_ray,dist);
      this._sys('lights')?.borrow('holdfast-guard',_from.x,_from.y,_from.z,0xffc27a,26,.05);
      en.damage(target,68,{zone:'torso',point:target.pos,dist,source:'guard'});
      this._sys('audio')?.dread?.('dealer-shot',g.pos.x,g.pos.y+1.5,g.pos.z,.16);
      this.ctx.bus.emit('holdfast:guard-shot',{x:g.pos.x,y:g.pos.y+1.5,z:g.pos.z,target:target.pos});
    }
    // The curtain is a refuge boundary, including monsters already active on arrival.
    // Gate defenders handle the approach; nobody spawns inside somebody's bedroom.
    for(const e of en.all){if(!e.alive||e.initiallyNeutral||e.neutral)continue;const q=this.local(e.pos.x,e.pos.z);if(Math.abs(q.x)<64&&q.z>-63&&q.z<64)en._release(e);}
  }
  _rumour(r){
    const id=r.story[2];if(!id)return;const pr=this._sys('progress');
    if(id==='morning'){const d=this._sys('places').nodes.get('morning')?.def;if(d)pr.learnRumour({id,name:d.name,x:d.x,z:d.z,kind:'place'});return;}
    const b=BOSSES.find(b=>b.id===id);if(b)pr.learnRumour({id:b.id,name:b.location,...bossMapPoint(b),kind:'boss'});
  }
  _insideGate(use){
    const a=TOWN.insideGate||{x:5.8,z:62,y:1.3},p=this._sys('player'),places=this._sys('places');
    if(p.dead||this.ctx.shared.inCar||places.gateIsOpen('holdfast'))return false;
    const local=this.local(p.pos.x,p.pos.z),at=this.world(a.x,a.z,a.y||1.3);
    if(local.z>=64||Math.hypot(p.pos.x-at.x,p.pos.z-at.z)>2.8||Math.abs(p.pos.y+1.2-at.y)>2)return false;
    this.ctx.bus.emit('prompt',{kind:'use',label:'E',rank:12,x:at.x,y:at.y,z:at.z,k:0,detail:'OPEN THE GATE',subdetail:'INNER CRANK',unavailable:false});
    if(use&&!this.useLock){this.useLock=true;this._sys('progress').flag('gate:holdfast',true);places.openGate('holdfast');this.ctx.bus.emit('holdfast:gate-opened-inside',{});}
    return true;
  }
  _talk(r){
    const pr=this._sys('progress'),complete=BOSSES.every(b=>pr.unlockedFinishes().includes(b.skin.id));
    const privateHint=r.id==='bellkeeper'&&complete;
    let lines=r.story[1];
    if(r.id==='keep-watcher'){const n=this._sys('lore-lookout')?.getPoweredCount()??Array.from(this._sys('places').nodes.values()).filter(n=>this._sys('places').isClaimed(n.def.id)||n.def.lit).length;const old=Number(pr.flag('story:ives-count'))||3;lines=[`${n} fires. ${n>old?'There were fewer when you last came. I counted them twice.':'I count them every night.'}`,r.story[1][1]];pr.flag('story:ives-count',n);}
    if(privateHint)lines=['You have brought the Eleven home. I can feel the stone wanting it back.','The day bell. The priory tower in the north pines. Ring it in the Black Hour with your car in the yard, where the bell can see it. Then drive east. All the way to Morning.'];
    if(r.id==='cook'&&pr.bossCleared('underkeep'))lines=['The bowl was still full.','I put it out again. Hot, still. Whatever we ate.'];
    if(r.id==='shrinekeeper'&&pr.bossCleared('underkeep'))lines=['I remembered how.','A wick. Oil. A clean glass. We can do that much ourselves.'];
    const i=r.line++%lines.length;this.chat={id:r.id,name:r.story[0],text:lines[i],until:this.time+Math.max(14,lines[i].length/15)};
    // Each rumour is spoken before being marked, including on repeat conversations.
    if(i===lines.length-1)this._rumour(r);
    this.ctx.bus.emit('holdfast:conversation',{id:r.id,name:r.story[0],text:lines[i],final:i===lines.length-1,rumour:r.story[2],privateHint});
    const e=r.e,p=this._sys('player');e.stagedYaw=faceYaw(e.pos.x,e.pos.z,p.pos.x,p.pos.z);
  }
  _offers(r){
    const pr=this._sys('progress'),w=this._sys('weapons'),car=this._sys('car');
    if(r.shop==='car')return [
      ...(car.wear>.005?[{id:'repair',name:'Repair the car',line:'Engine, brakes and headlamps restored.',price:Math.max(40,Math.ceil(car.wear*260))}]:[]),
      ...UPGRADES.filter(u=>!pr.ownsUpgrade(u.id)).map(u=>({...u,line:u.line||'',upgrade:true})),
    ];
    return STOCK.map(s=>{if(s.item)return{...s,line:'A new light for one of the county’s roadside poles.'};const owned=w.has(s.id),bundle=CFG.weapons.defs[s.id].reserve,rounds=Math.max(0,Math.min(bundle,bundle*2-w.reserveOf(s.id)));return{...s,owned,rounds,full:owned&&rounds===0,price:owned?Math.max(1,Math.ceil(Math.max(6,Math.round(s.price*.25))*rounds/bundle)):s.price,line:owned?`${rounds} rounds · ${w.reserveOf(s.id)} in reserve`:'Weapon and a full reserve of ammunition.'};});
  }
  _trade(r,dt,use,tune){
    const pr=this._sys('progress'),list=this._offers(r);if(!list.length){this._shopCard(r,[],0);return;}
    if(tune&&!this.tuneLock){this.offer=(this.offer+1)%list.length;this.tuneLock=true;this.hold=0;}
    this.offer%=list.length;const o=list[this.offer],can=!o.full&&pr.cash()>=o.price;
    this._shopCard(r,list,this.offer);
    this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:9,x:r.e.pos.x,y:r.e.pos.y+1.5,z:r.e.pos.z,k:this.hold/.8,detail:o.full?'AMMUNITION FULL':o.name+' · '+o.price+' COINS',subdetail:can?'HOLD E TO BUY · T NEXT':'T NEXT',unavailable:!can});
    if(!use||this.useLock||!can){this.hold=0;return;}this.hold+=dt;if(this.hold<.8)return;this.hold=0;this.useLock=true;
    if(o.upgrade){pr.buyUpgrade(o.id);this.offer=0;}
    else if(pr.spendCash(o.price,'holdfast:'+o.id)){
      if(o.id==='repair')this._sys('car').repairFull();
      else if(o.item)this._sys('dusk-to-dawn').addBulb(1);
      else if(o.owned)this._sys('weapons').addReserveTo(o.id,o.rounds);
      else{this._sys('weapons').reward(o.id);pr.flag('dealer:weapon:'+o.id,true);}
      this.ctx.bus.emit('dealer:bought',{id:o.id,price:o.price,ammo:o.owned,rounds:o.rounds||0});
    }
  }
  _shopCard(r,list,chosen){
    if(this.lastShopMet!==r.id){this.lastShopMet=r.id;this.ctx.bus.emit('holdfast:conversation',{id:r.id,name:r.story[0],text:r.story[1][0],final:true});}
    const key=r.id+':'+chosen+':'+this._sys('progress').cash()+':'+list.map(o=>o.id+o.rounds+o.price).join(',');
    if(key!==this.cardKey){this.cardKey=key;this.shopEl.replaceChildren();const title=document.createElement('h3');title.style.cssText='font:22px Georgia;margin:0 0 6px';title.textContent=r.shop==='car'?'Parts & repairs':'Arms & ammunition';const sub=document.createElement('div');sub.style.cssText='color:#a7a8bc;font-size:11px;letter-spacing:.1em;margin-bottom:18px';sub.textContent=r.story[0]+' · '+this._sys('progress').cash()+' COINS';this.shopEl.append(title,sub);
      const greeting=document.createElement('div');greeting.textContent=r.story[1][0];greeting.style.cssText='font:14px/1.5 Georgia;color:#cec8be;margin:8px 0 14px';this.shopEl.append(greeting);
      list.forEach((o,i)=>{const row=document.createElement('div');row.style.cssText='padding:9px 11px;margin:3px 0;border-left:2px solid '+(i===chosen?'#cec7e9':'transparent')+';background:'+(i===chosen?'#77738b33':'transparent')+';color:'+(i===chosen?'#f0edf5':'#949ba7');row.textContent=o.name+' · '+(o.full?'full':o.price);this.shopEl.append(row);if(i===chosen){const line=document.createElement('div');line.style.cssText='font-size:12px;color:#bbb8c9;padding:0 11px 10px';line.textContent=o.line;this.shopEl.append(line);}});
      const foot=document.createElement('div');foot.style.cssText='border-top:1px solid #85809144;margin-top:16px;padding-top:13px;color:#bab5cc;font-size:11px';foot.textContent=list.length?'T  Browse     Hold E  Buy':'Everything is fitted. Bring it back when it needs work.';this.shopEl.append(foot);
    }this.shopEl.style.display='block';
  }
  step(dt){
    if(!this.ctx.playing||this.ctx.paused)return;this.time+=dt;const p=this._sys('player'),en=this._sys('enemies');
    const far=!this.contains(p.pos.x,p.pos.z,140);this.away=far?this.away+dt:0;
    if(this.away>4){if(this.people.some(r=>r.e||r.dead)||this._sys('progress').flag('gate-hostile:holdfast'))this.reset();this.chat=null;this.target='';return;}
    const near=this.contains(p.pos.x,p.pos.z,70),hostile=this._sys('progress').flag('gate-hostile:holdfast');
    for(const r of this.people){
      if(r.e&&r.e.gen!==r.gen){r.e=null;r.dead=true;}
      if(r.e&&!r.e.alive)r.dead=true;
      if(!r.e&&!r.dead&&near)this._spawn(r);
      if(r.e?.alive)this._walk(r,dt);
    }
    this._protect(dt);this._light();this._addresses();
    if(this.ctx.shared.holdfastBlackout&&this.time>(this.nextBlackoutBell||0)){this.nextBlackoutBell=this.time+3.4;const at=this.world(31,-48,9);this._sys('audio')?.whisper('bell','Hale',at.x,at.y,at.z);this.ctx.bus.emit('holdfast:bell',{...at,reason:'kept'});}
    const use=this.ctx.input.held('use'),tune=this.ctx.input.held('radiotune');if(!use)this.useLock=false;if(!tune)this.tuneLock=false;
    if(this._insideGate(use)){this.target='';this.chat=null;this.shopEl.style.display='none';return;}
    let target=null,best=3.3;const cam=this._sys('camera');
    if(!p.dead&&!this.ctx.shared.inCar&&!hostile)for(const r of this.people){const e=r.e;if(!e?.alive||e.gen!==r.gen)continue;const dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,d=Math.hypot(dx,dz);if(d<best&&Math.abs(e.pos.y-p.pos.y)<1.7&&(-Math.sin(cam.yaw)*dx-Math.cos(cam.yaw)*dz)/Math.max(d,.001)>.64&&this._sight(p.pos,e.pos)){target=r;best=d;}}
    if(this.target!==target?.id){this.hold=0;this.offer=0;this.cardKey='';}this.target=target?.id||'';this.shopEl.style.display='none';
    if(target?.shop){this.chat=null;target.e.stagedYaw=faceYaw(target.e.pos.x,target.e.pos.z,p.pos.x,p.pos.z);this._trade(target,dt,use,tune);}
    else if(target){const e=target.e;this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:9,x:e.pos.x,y:e.pos.y+1.6,z:e.pos.z,k:0,detail:target.story[0],subdetail:this.chat?.id===target.id?'E · LISTEN':'E · TALK',unavailable:false});if(use&&!this.useLock){this.useLock=true;this._talk(target);}}
    if(this.chat){const speaker=this.people.find(r=>r.id===this.chat.id)?.e;if(this.time>this.chat.until||p.dead||hostile||!speaker?.alive||Math.hypot(speaker.pos.x-p.pos.x,speaker.pos.z-p.pos.z)>8)this.chat=null;}
  }
  present(){
    const active=this.ctx.playing&&!this.ctx.paused&&!this._sys('player')?.dead;
    this.signGroup.visible=this.contains(this._sys('player').pos.x,this._sys('player').pos.z,180);
    const level=this.ctx.shared.holdfastBlackout?0:(this.ctx.shared.holdfastRelight??1),places=this._sys('places'),n=places?.nodes.get('holdfast');
    if(n?.glow){n.glow.visible=level>0;n.glow.material.opacity*=level;}
    for(const group of places?.bodies.values()||[])for(const b of group)if(b.id==='holdfast')b.group.traverse(o=>{if(o.isMesh&&o.name.includes('glow')){o.visible=level>0;o.material.opacity=level;}});
    if(!active||!this.target)this.shopEl.style.display='none';
    if(active&&this.chat){this.ui.style.display='block';this.personEl.textContent=this.chat.name;this.textEl.textContent=this.chat.text;this.footer.textContent=this.target===this.chat.id?'E  Listen':'The Holdfast';}else this.ui.style.display='none';
  }
  _addresses(){
    const p=this._sys('player'),q=this.local(p.pos.x,p.pos.z),y=p.pos.y-(this._frame()?.padY||0);let address=null;
    if(!p.dead&&!this.ctx.shared.inCar)for(const b of TOWN.buildings){const dx=q.x-b.x,dz=q.z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=dx*c-dz*s,z=dx*s+dz*c;if(Math.abs(x)<b.w/2-.22&&Math.abs(z)<b.d/2-.22&&y>=(b.y||0)-.4&&y<(b.y||0)+2.8){address=b;break;}}
    if(address?.id!==this.address){this.address=address?.id||'';if(address)this.ctx.bus.emit('holdfast:address',{id:address.id,name:address.name});}
  }
  state(){return{residents:this.people.map(r=>({id:r.id,alive:!!r.e?.alive,dead:!!r.dead,pos:r.e?.pos.toArray(),shop:r.shop||null,walking:!!r.route})),hostile:!!this._sys('progress').flag('gate-hostile:holdfast'),chat:this.chat,target:this.target,epoch:this.epoch};}
  dispose(){this.off.forEach(f=>f?.());for(const h of this.lamps.values())this._sys('lights')?.release(h);this.ui?.remove();this.shopEl?.remove();for(const s of this.signs){s.geometry.dispose();s.material.map.dispose();s.material.dispose();}this.signGroup?.removeFromParent();}
}
