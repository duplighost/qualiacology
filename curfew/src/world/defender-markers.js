import * as THREE from 'three';

// Marks refer to the very same persisted cast slots that gate the power switch.
//
// 2026-09-18, Alex: "the last enemy i just couldn't find even though it was marked" and "the
// last defender was also marked and i just could not find it." What the marks did: an arrow
// parked at 6% of the screen width, which sat under the XP panel, and on the wrong side (the
// bearing was taken from the camera's forward to the target the mirror way round); a label in
// words; nothing that got stronger as you closed in; and nothing for upstairs or the cellar.
//
// The glyphs now, no words: ◆ a body that is there, ◇ something counted that is not showing
// yet (a grave that has not risen, a room still waiting), ▲ on a ring round the sight when it
// is off screen, pointing the way to turn, ▲ or ▼ after the distance when it is a floor above
// or below you, a slow pulse inside 12 m, and the mark bursts when the body it marked dies.
// Only the nearest mark carries its distance, plus any on-screen mark standing clear of the
// others; ring arrows that point the same way are drawn once, for the nearest. The count
// itself is in the objective panel (readouts.js), one string, one place (C1).
//
// Allocation: nodes are pooled and keyed by the target's save key; the distance strings and
// class names are tables built once; left/top/text/class are written only when they change.
// Nothing under src/world may use a timer callback (the law): the burst runs on ctx.time.t.
const DIST = Array.from({ length: 401 }, (_, i) => i + ' m');
const DIST_UP = DIST.map((s) => s + ' ▲');
const DIST_DN = DIST.map((s) => s + ' ▼');
const FLOOR_M = 2.2;         // a storey: further apart than this in height gets ▲ / ▼
const NEAR_M = 12;           // pulse inside this
const LABEL_FROM_M = 4;      // no distance once you are on top of it
const GONE_S = 0.45;         // the burst when a mark's body dies
// The on-screen window. A mark outside it is drawn on the ring instead, so none ever sits
// under the minimap, the economy panel, the way-forward card or the ammo box.
const ON_X = 0.66, ON_Y = 0.74;
const RING_R = 0.22;         // of the screen height: a circle round the sight
const RING_MERGE = Math.PI / 15;   // 12 degrees: ring arrows closer than this are one arrow
const LABEL_CLEAR_PX = 46;   // an on-screen mark this far from every labelled one gets its own
const ANG_Q = Math.PI / 60;  // 3 degrees: the arrow's rotation is rewritten only past this
// Every class combination, built once: bit 1 ring, 2 hollow, 4 boss, 8 near.
const CLS = Array.from({ length: 16 }, (_, c) => 'dm' + (c & 1 ? ' ring' : '') + (c & 2 ? ' hollow' : '') + (c & 4 ? ' boss' : '') + (c & 8 ? ' near' : ''));
const CLS_GONE = CLS.map((c) => c + ' gone');

const CSS = `
#defender-markers .dm{position:absolute;left:0;top:0;transform:translate(-50%,-50%);color:#f3b777;text-align:center;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap}
#defender-markers .dm b{display:block;font:15px/1 Georgia,serif}
#defender-markers .dm b s{display:inline-block;text-decoration:none}
#defender-markers .dm i{display:block;font:10px/1.4 Georgia,serif;font-style:normal;letter-spacing:.06em;opacity:.8;margin-top:2px}
#defender-markers .dm.hollow b{opacity:.85}
#defender-markers .dm.boss b{font-size:19px}
#defender-markers .dm.near b{animation:dm-pulse .9s ease-in-out infinite}
#defender-markers .dm.ring b{font-size:14px;opacity:.95}
#defender-markers .dm.gone b{animation:dm-gone .45s ease-out forwards}
#defender-markers .dm.gone i{opacity:0}
@keyframes dm-pulse{0%,100%{transform:scale(1);opacity:.72}50%{transform:scale(1.3);opacity:1}}
@keyframes dm-gone{0%{transform:scale(1);opacity:1}100%{transform:scale(1.9);opacity:0}}
@media(prefers-reduced-motion:reduce){#defender-markers .dm b{animation:none!important}}
`;

const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };

export class DefenderMarkers{
 constructor(ctx){
  this.ctx=ctx;this.point=new THREE.Vector3();this.view=new THREE.Vector3();this.forward=new THREE.Vector3();
  this.nodes=[];this.byKey=new Map();this.frame=0;this.rowId='';this._live=[];
  this.root=document.createElement('div');this.root.id='defender-markers';
  this.root.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9';
  const style=document.createElement('style');style.textContent=CSS;this.root.append(style);
  document.body.append(this.root);
 }
 _node(key){
  let n=this.byKey.get(key);if(n)return n;
  for(let i=0;i<this.nodes.length;i++){const q=this.nodes[i];if(!q.key){n=q;break;}}
  if(!n){
   const el=document.createElement('div');el.className='dm';el.hidden=true;
   const b=document.createElement('b'),g=document.createElement('s'),i=document.createElement('i');b.append(g);el.append(b,i);this.root.append(el);
   n={el,b,g,i,key:'',seen:0,goneAt:-1,x:-1e9,y:-1e9,ang:1e9,glyph:'',label:null,cls:'',code:0,
      on:false,px:0,py:0,pa:0,dist:0,full:'',glyph2:'',show:true,labelled:false};
   this.nodes.push(n);
  }
  n.key=key;n.goneAt=-1;n.cls='';n.el.className='dm';this.byKey.set(key,n);
  return n;
 }
 _release(n){this.byKey.delete(n.key);n.key='';n.goneAt=-1;n.el.hidden=true;n.x=n.y=-1e9;n.ang=1e9;}
 _clear(){for(let i=0;i<this.nodes.length;i++)if(this.nodes[i].key)this._release(this.nodes[i]);}
 _cls(n,c){if(n.cls!==c){n.cls=c;n.el.className=c;}}
 update(row,targets,count){
  const n0=count??targets?.length??0;
  const hidden=!row||!this.ctx.playing||this.ctx.paused||this.ctx.systems.get('player')?.dead;
  if(this.root.hidden!==!!hidden)this.root.hidden=!!hidden;
  if(!row){if(this.rowId){this.rowId='';this._clear();}return;}
  if(row.id!==this.rowId){this.rowId=row.id;this._clear();}
  if(hidden)return;
  const camera=this.ctx.camera;if(!camera)return;
  camera.getWorldDirection(this.forward);
  const fl=Math.hypot(this.forward.x,this.forward.z)||1,fx=this.forward.x/fl,fz=this.forward.z/fl;
  const w=window.innerWidth,h=window.innerHeight,ringR=RING_R*h;
  const p=this.ctx.systems.get('player'),feet=p?.pos?p.pos.y:camera.position.y;
  const now=this.ctx.time?.t||0,frame=++this.frame,live=this._live;
  live.length=0;
  let nearest=null;
  // Pass 1: where each mark goes, and what it would say.
  for(let k=0;k<n0;k++){
   const t=targets[k],n=this._node(t.key);n.seen=frame;live.push(n);
   this.point.set(t.x,t.y,t.z);
   const dx=t.x-camera.position.x,dz=t.z-camera.position.z;
   const dist=this.point.distanceTo(camera.position),front=dx*fx+dz*fz;
   this.view.copy(this.point).applyMatrix4(camera.matrixWorldInverse);
   this.point.project(camera);
   const on=front>0&&this.view.z<0&&Math.abs(this.point.x)<ON_X&&Math.abs(this.point.y)<ON_Y;
   t.onscreen=on;t.dist=dist;n.on=on;n.dist=dist;
   const hollow=!t.live||t.kind==='grave'||t.kind==='room';
   if(on){
    n.px=(this.point.x*.5+.5)*w;n.py=(-this.point.y*.5+.5)*h;n.pa=0;n.glyph2=hollow?'◇':'◆';
   }else{
    // The bearing to turn: the direction on the screen while it is ahead of the eye (camera
    // space, so a target square to one side does not divide by a projection's zero), and the
    // horizontal bearing off your right hand while it is behind you (that projection flips).
    const a=this.view.z<0?Math.atan2(this.view.x,this.view.y):Math.atan2(dx*-fz+dz*fx,front);
    n.pa=a;n.px=w*.5+Math.sin(a)*ringR;n.py=h*.5-Math.cos(a)*ringR;n.glyph2='▲';
   }
   n.code=(on?0:1)|(hollow?2:0)|(t.kind==='boss'?4:0)|(dist>3&&dist<NEAR_M?8:0);
   const m=Math.min(400,Math.round(dist)),dy=t.feet-feet;
   n.full=dist<LABEL_FROM_M?'':dy>FLOOR_M?DIST_UP[m]:dy<-FLOOR_M?DIST_DN[m]:DIST[m];
   if(!nearest||dist<nearest.dist)nearest=n;
  }
  // Pass 2: one arrow per direction, and a distance only where it can be read.
  for(let k=0;k<live.length;k++){
   const n=live[k];n.show=true;n.labelled=false;
   if(!n.on)for(let j=0;j<live.length;j++){const q=live[j];if(q!==n&&!q.on&&(q.dist<n.dist||q.dist===n.dist&&j<k)&&angDiff(q.pa,n.pa)<RING_MERGE){n.show=false;break;}}
  }
  if(nearest)nearest.labelled=true;
  for(let k=0;k<live.length;k++){
   const n=live[k];if(n.labelled||!n.on||!n.show)continue;
   let clear=true;
   for(let j=0;j<live.length;j++){const q=live[j];if(q!==n&&q.on&&q.show&&(q.labelled||q.dist<n.dist)&&Math.abs(q.px-n.px)<LABEL_CLEAR_PX&&Math.abs(q.py-n.py)<LABEL_CLEAR_PX*.6){clear=false;break;}}
   n.labelled=clear;
  }
  // Pass 3: write what changed.
  for(let k=0;k<live.length;k++){
   const n=live[k];
   if(n.goneAt>=0)n.goneAt=-1;
   if(!n.show){if(!n.el.hidden)n.el.hidden=true;continue;}
   this._cls(n,CLS[n.code]);
   if(n.el.hidden)n.el.hidden=false;
   const x=Math.round(n.px),y=Math.round(n.py);
   if(x!==n.x||y!==n.y){n.x=x;n.y=y;n.el.style.left=x+'px';n.el.style.top=y+'px';}
   const aq=n.on?0:Math.round(n.pa/ANG_Q);
   if(aq!==n.ang){n.ang=aq;n.g.style.transform=aq?'rotate('+(aq*ANG_Q).toFixed(3)+'rad)':'';}
   if(n.glyph2!==n.glyph){n.glyph=n.glyph2;n.g.textContent=n.glyph;}
   const label=n.labelled?n.full:'';
   if(label!==n.label){n.label=label;n.i.textContent=label;}
  }
  // A mark whose target left the list died (or stopped counting): it bursts where it was,
  // then its node goes back in the pool.
  for(let k=0;k<this.nodes.length;k++){
   const n=this.nodes[k];if(!n.key||n.seen===frame)continue;
   if(n.goneAt<0){if(!n.show){this._release(n);continue;}n.goneAt=now;this._cls(n,CLS_GONE[n.code]);}
   else if(now-n.goneAt>=GONE_S)this._release(n);
  }
 }
 dispose(){this.root.remove();}
}
