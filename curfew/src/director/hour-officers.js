// The hour's officials are scenery with attention, never combatants or loot sources.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAJORS } from '../world/placedata.js';
import { dampAngle, clamp01 } from '../engine/math.js';

export const CARRIED_LIGHT_THRESHOLDS = Object.freeze([60, 240, 700]);
export const carriedLightTier = value => CARRIED_LIGHT_THRESHOLDS.reduce((n, t) => n + (value >= t ? 1 : 0), 0);
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); return g; };
const capsule = (r,h,x,y,z) => { const g = new THREE.CapsuleGeometry(r,h,3,8); g.translate(x,y,z); return g; };
function merged(parts) { const g = mergeGeometries(parts); for (const p of parts) p.dispose(); return g; }

export class CarriedLightAuditor {
  constructor(ctx, dread) {
    this.ctx=ctx; this.dread=dread; this.root=new THREE.Group(); this.root.name='the-auditor';
    this.root.visible=false; dread.root.add(this.root); this.off=[]; this.geos=[]; this.mats=[];
    this.tier=0; this.seenTier=0; this.search=0; this.closing=0; this.seen=false; this.count=0;
    const material=color=>{const m=dread.matBase.clone();m.color.setHex(color);this.mats.push(m);return m;};
    const dark=material(0x0b1012), wood=material(0x28221e), pale=material(0x676859), paper=material(0xb8ae8d);
    const add=(geo,mat,parent=this.root)=>{this.geos.push(geo);const mesh=new THREE.Mesh(geo,mat);parent.add(mesh);return mesh;};
    // Chair, upright seated torso, knees below the table. The hands count, never write.
    add(merged([box(.8,.1,.65,0,.51,-.48),box(.8,.9,.09,0,1.03,-.78),
      ...[-1,1].flatMap(s=>[box(.07,.53,.07,s*.32,.26,-.71),box(.07,.53,.07,s*.32,.26,-.20)])]),wood);
    add(merged([capsule(.22,.38,0,1.04,-.47),capsule(.15,.17,0,1.58,-.39),
      ...[-1,1].flatMap(s=>[box(.15,.2,.48,s*.17,.58,-.25),capsule(.07,.39,s*.18,.28,-.03),
        box(.10,.11,.5,s*.27,1.05,-.12)])]),dark);
    add(box(.20,.25,.08,0,1.6,-.23),pale);
    add(merged([box(1.28,.10,.80,0,.88,.26),...[-1,1].flatMap(s=>[-1,1].map(t=>box(.08,.83,.08,s*.52,.42,.26+t*.29)))]),wood);
    for(const side of [-1,1]) {
      const hand=add(box(.12,.05,.23,side*.27,.97,.29),pale); hand.userData.side=side;
      (this.hands||(this.hands=[])).push(hand);
    }
    add(box(.49,.065,.36,0,.97,.27),dark);
    this.book=new THREE.Group(); this.book.position.set(0,1.011,.27); this.root.add(this.book);
    add(box(.235,.012,.32,-.118,0,0),paper,this.book);
    this.cover=new THREE.Group();this.book.add(this.cover);
    add(box(.235,.012,.32,.118,0,0),paper,this.cover);
    this.off.push(ctx.bus.on('xp:banked',()=>this.close()));
    this.off.push(ctx.bus.on('player:died',()=>this.close()));
    this.off.push(ctx.bus.on('save:loaded',()=>{this.root.visible=false;this.tier=0;this.seenTier=0;this.search=0;}));
  }
  _sys(id){return this.ctx.systems?.get(id);}
  close(){this.seenTier=0;this.tier=0;if(this.root.visible)this.closing=1.25;}
  _site(pos){
    const places=this._sys('places'), terrain=this._sys('terrain'), col=this._sys('collision');
    const candidates=[];
    for(const u of this._sys('refuge')?._units || []) {
      if(!u.power)continue;
      const r=u.spec?.room;if(!r)continue;
      const ry=r.yaw||0,lx=r.x-Math.cos(ry)*r.w*.26,lz=r.z+Math.sin(ry)*r.w*.26;
      const x=u._wx(lx,lz),z=u._wz(lx,lz);
      candidates.push({id:u.siteId+':refuge',x,z,y:u.padY,yaw:u.yaw+ry});
    }
    for(const d of MAJORS) {
      if(!(d.lit||places?.isClaimed?.(d.id)))continue;
      // Ground at the lit yard's edge; the tower/tree claim itself may be high overhead.
      candidates.push({id:d.id,x:d.x+12,z:d.z+15,y:terrain?.heightAt?.(d.x+12,d.z+15)||0,yaw:0});
    }
    for(const c of places?.minorList?.()||[])if(c.kind==='campfire'||c.def?.id==='campfire')
      candidates.push({id:'campfire:'+c.i,x:c.x+2.5,z:c.z,y:terrain?.heightAt?.(c.x+2.5,c.z)||0,yaw:-Math.PI/2});
    let best=null,bd=110;
    for(const c of candidates){
      const d=Math.hypot(c.x-pos.x,c.z-pos.z);if(d<7||d>=bd)continue;
      if(col?.fits?!col.fits(c.x,c.z,c.y+.04,.9,1.85):col?.canOccupy&&!col.canOccupy(c.x,c.z,.9,1.85))continue;
      best=c;bd=d;
    }
    return best;
  }
  step(dt){
    if(!this.ctx.playing||this.ctx.paused)return;
    const pr=this._sys('progress'),pos=this._sys('player')?.pos;if(!pos)return;
    const tier=carriedLightTier(pr?.save?.data?.unbanked||0);
    if(this.ctx.shared?.lateBellFinal||this.ctx.shared?.morningReturned){if(this.root.visible&&!this.closing)this.close();}
    else if(tier>this.seenTier&&!this.root.visible){
      this.search-=dt;
      if(this.search<=0){this.search=2;const site=this._site(pos);if(site){
        this.root.position.set(site.x,site.y,site.z);this.root.rotation.y=site.yaw;
        this.root.visible=true;this.site=site.id;this.tier=tier;this.seenTier=tier;this.seen=false;this.closing=0;
        this.cover.rotation.z=0;
      }}
    }
    if(!this.root.visible)return;
    if(!this.closing&&tier===0)this.close();
    this.count+=dt;
    for(const hand of this.hands)hand.position.y=Math.max(0,Math.sin(this.count*1.8+hand.userData.side*.6))*.012;
    if(!this.seen&&this.dread.watching(this.root.position.x,this.root.position.y+1.6,this.root.position.z,.82,85)){
      this.seen=true;this.ctx.bus.emit('lore:sighting',{species:'auditor'});
    }
    if(tier>this.tier){this.tier=tier;this.seenTier=tier;}
    if(this.closing>0){
      this.closing=Math.max(0,this.closing-dt);this.cover.rotation.z=Math.PI*clamp01((1.25-this.closing)/.8);
      for(const m of this.mats)m.opacity=Math.min(1,this.closing/.35);
      if(this.closing<=0){this.root.visible=false;for(const m of this.mats)m.opacity=1;}
    }else if(Math.hypot(pos.x-this.root.position.x,pos.z-this.root.position.z)>150){
      this.root.visible=false;this.seenTier=0;this.search=3;
    }
  }
  state(){return{visible:this.root.visible,tier:this.tier,site:this.site||null,closing:this.closing>0};}
  dispose(){for(const f of this.off)f?.();this.root.removeFromParent();for(const g of this.geos)g.dispose();for(const m of this.mats)m.dispose();}
}

export class RoadPacer {
  constructor(ctx,dread){
    this.ctx=ctx;this.dread=dread;this.root=new THREE.Group();this.root.name='the-pacer';dread.root.add(this.root);
    this.bodyMat=dread.matRunner.clone();this.faceMat=dread.matFace.clone();
    this.bodyMat.opacity=1;this.faceMat.opacity=1;
    this.body=new THREE.Mesh(dread.figGeo,this.bodyMat);this.root.add(this.body);
    this.root.add(new THREE.Mesh(dread.faceGeo,this.faceMat));this.root.visible=false;
    this.turned=false;this.search=20;this.age=0;this.seen=false;this.turnT=0;this.dir={x:0,z:-1};
    this.off=ctx.bus.on('phase:changed',p=>{if(p?.phase==='dusk'&&p.prev){this.turned=false;this.root.visible=false;this.search=20;this.turnT=0;this._save();}});
    this.loaded=ctx.bus.on('save:loaded',()=>{this.turned=!!this._sys('progress')?.flag?.('pacer:turned');this.root.visible=false;});
    this.turned=!!this._sys('progress')?.flag?.('pacer:turned');
  }
  _sys(id){return this.ctx.systems?.get(id);}
  _save(){this._sys('progress')?.flag?.('pacer:turned',this.turned);}
  _appear(pos){
    const roads=this._sys('roads'),terrain=this._sys('terrain'),col=this._sys('collision');
    if(!roads?.nearestRoadInfo||!terrain)return false;
    const yaw=this._sys('camera')?.yaw||0,fx=-Math.sin(yaw),fz=-Math.cos(yaw);
    for(const dist of [64,88,110]){
      const r=roads.nearestRoadInfo(pos.x+fx*dist,pos.z+fz*dist,18);
      if(!r?.hit)continue;
      const x=r.x,z=r.z,y=terrain.heightAt(x,z);
      if(Math.hypot(x-pos.x,z-pos.z)<35||col?.canOccupy&&!col.canOccupy(x,z,.5,2.3))continue;
      if(!this.dread.watching(x,y+1.7,z,.65,125))continue;
      const len=Math.hypot(x-pos.x,z-pos.z);this.dir.x=(x-pos.x)/len;this.dir.z=(z-pos.z)/len;
      this.root.position.set(x,y,z);this.root.rotation.y=Math.atan2(this.dir.x,this.dir.z);
      this.root.visible=true;this.age=0;this.seen=false;return true;
    }
    return false;
  }
  step(dt){
    if(!this.ctx.playing||this.ctx.paused||!this.dread.enabled)return;
    if(this.ctx.shared?.lateBellFinal||this.ctx.shared?.morningReturned){this.root.visible=false;return;}
    const pos=this._sys('player')?.pos;if(!pos)return;
    if(!this.root.visible){this.search-=dt;if(this.search<=0){this.search=12;if(this.dread.permitOk())this._appear(pos);}return;}
    this.age+=dt;const p=this.root.position,dist=Math.hypot(p.x-pos.x,p.z-pos.z);
    if(dist<12||dist>155||this.age>60){this.root.visible=false;this.search=60;return;}
    const visible=this.dread.watching(p.x,p.y+1.85,p.z,.72,140);
    if(visible&&!this.seen){this.seen=true;this.ctx.bus.emit('lore:sighting',{species:'pacer'});}
    if(!this.turned&&this.age>4&&visible){
      const lamp=this._sys('dusk-to-dawn')?.warnVisiblePole?.((x,y,z)=>this.dread.watching(x,y,z,.62,180));
      if(lamp>=0){this.turned=true;this.turnT=4;this._save();this.ctx.bus.emit('pacer:turned',{lamp,x:p.x,z:p.z});}
    }
    if(this.turnT>0){
      this.turnT-=dt;this.root.rotation.y=dampAngle(this.root.rotation.y,Math.atan2(pos.x-p.x,pos.z-p.z),3,dt);
      if(this.turnT<=0){this.root.visible=false;this.search=90;}
      return;
    }
    const roads=this._sys('roads'),terrain=this._sys('terrain');
    const next=roads.nearestRoadInfo(p.x+this.dir.x*2,p.z+this.dir.z*2,12);
    if(next?.hit){const dx=next.x-p.x,dz=next.z-p.z,l=Math.hypot(dx,dz);if(l>.1){this.dir.x=dx/l;this.dir.z=dz/l;}}
    p.x+=this.dir.x*1.12*dt;p.z+=this.dir.z*1.12*dt;p.y=terrain.heightAt(p.x,p.z);
    this.root.rotation.y=Math.atan2(this.dir.x,this.dir.z);this.body.rotation.z=Math.sin(this.age*3.2)*.016;
  }
  state(){return{visible:this.root.visible,turned:this.turned,turning:this.turnT>0};}
  dispose(){this.off?.();this.loaded?.();this.root.removeFromParent();this.bodyMat.dispose();this.faceMat.dispose();}
}
