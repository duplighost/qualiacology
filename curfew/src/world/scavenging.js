import * as THREE from 'three';
import {Kit} from './sites.js';
import {MAJORS} from './placedata.js';
import {skeleton} from './remains.js';
import {OPENING} from './opening-layout.js';
import {supplyChestGeometry} from './supply-chest.js';

const WOOD=[.13,.085,.046],METAL=[.20,.135,.055],SOIL=[.065,.034,.019];

/* ROUND 18. The graves you can dig, in each site's own local frame. Twelve down the two
 * sides of the Garden of Rest's central avenue, clear of the mortuary gatehouse (0, -10.5),
 * the mausoleum (0, ~10) and the two columbarium ranges at x = +-19, so none of them lands
 * inside a wall. The load-time placement pass in _build() moves any that still cannot fit. */
const GRAVE_SITES = Object.freeze([
  { site: 'garden-of-rest', rows: [
    [-6.2, -6.4], [-6.6, -2.6], [-6.1, 1.2], [-6.5, 5.0],
    [6.2, -6.4], [6.6, -2.6], [6.1, 1.2], [6.5, 5.0],
    [-11.4, -3.2], [11.4, -3.2], [-11.0, 3.6], [11.0, 3.6],
  ] },
]);
const _from=new THREE.Vector3(),_dir=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0);

/* ROUND 19: hands on a box. See _stepHandOpen. The reach is the melee's, so anything you
 * could swing at you can also put your hands on; the facing is looser than a body's (0.45)
 * because a crate is a big target you stand over. */
const BOX_REACH=2.4;
// ROUND 22. Alex, 2026-09-11: "you can open everything on the map. any piece of wood or metal or
// whatever." Round 14 made every SMALL wood/metal/stone shape crushable so the car could run
// it over, and round 19 put the E-hold on every breakable; this round lined every road with
// small wood and metal (sign stakes, pole posts, chairs, crosses), so OPEN stood on all of it.
// The hold keeps to the hand-tagged breakables (crate, drum, fence, strongbox...) and the
// containers; a thing that is breakable only because it is small gets no prompt. The car and
// the stock still break it.
// 'gascan' is here because a petrol can is not a box. It is crushable by SIZE (collision.js's
// size rule, not BREAKABLE_TAGS), so nearestBreakable offered it to this verb, and OPEN on a
// fuel can was the only prompt the county's cans had ever shown — world/gas.js's own TAKE
// never fired, because the can occluded itself. Both halves fixed 2026-09-15.
const NO_HOLD_TAG=new Set(['wood','metal','stone','wall','plank','vehicle','glass','concrete','earth','rust','dark','gascan']);
const BOX_FACE=0.55;
const BOX_HOLD_BASE=0.38;
const BOX_HOLD_PER=0.22;   // per landing the stock would have needed: 0.6 s wood .. 1.3 s stone
const BOX_LOS_SLACK=0.55;  // how much of its own body the eye-ray may end inside
const _rayO={x:0,y:0,z:0},_rayD={x:0,y:0,z:0};

export class Scavenging {
  static id='scavenging';
  constructor(ctx){this.ctx=ctx;this.sites=[];this.root=new THREE.Group();this.root.name='buried-supplies';this.time=0;this.hold=0;this.target=null;this.release=false;this.boxTarget=null;this.boxHold=0;}
  _sys(id){return this.ctx.systems.get(id);}
  init(){
    this.ctx.scene.add(this.root);this.mat=this._sys('wilds').matBody;
    const chest=supplyChestGeometry(),earth=new Kit(),marker=new Kit(),excavated=new Kit();
    this.seamMat=new THREE.MeshBasicMaterial({color:0xe6b353,transparent:true,opacity:.75,toneMapped:false});
    this.seamGeo=new THREE.BoxGeometry(1.12,.022,.022);
    // ALEX, 2026-09-16: "not so many of those piles of dirt look diggable anymore. they need
    // to still look more special when they are diggable, and more of them need to be there."
    //
    // The mound, the rag, the stake and the half-exposed lid are all cut from the SAME wilds
    // body material as the soil around them, so a turned patch at night was a slightly
    // different shade of black. This is the one thing the county never gives ordinary ground:
    // the spade cuts hold light. It breathes, slowly, and it is switched off the moment the
    // third strike lands, so a seam is never a lie about a hole that is already open.
    this.cutMat=new THREE.MeshBasicMaterial({color:0xd9a558,transparent:true,opacity:.62,toneMapped:false,depthWrite:false});
    this.cutGeo=new THREE.BoxGeometry(1,.03,.035);
    const soil=new THREE.CylinderGeometry(.65,1.05,.25,24,3),v=soil.attributes.position;
    for(let i=0;i<v.count;i++){
      const x=v.getX(i),z=v.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);
      const edge=1+.10*Math.sin(a*5)+.065*Math.cos(a*9);
      v.setXYZ(i,x*edge,v.getY(i)+.125+.018*Math.sin(a*7)*Math.min(1,r),z*edge*.78);
    }
    soil.computeVertexNormals();earth.push(soil,SOIL);
    for(let i=0;i<18;i++){const a=i*2.399,r=.48+(i%4)*.16;
      earth.box(.16,.065,.11,Math.cos(a)*r,.043,Math.sin(a)*r*.78,[.16,.095,.048],a);
    }
    // Fresh spade cuts, a partly exposed lid and a tied rag carry the same
    // invitation at safe caches and ambush graves. The outcome never changes the art.
    earth.box(.82,.055,.12,-.13,.27,-.13,[.25,.18,.095],.5);
    earth.box(.48,.045,.08,.23,.245,.14,[.21,.14,.072],-.65);
    marker.box(.055,.74,.065,-.68,.37,.29,[.20,.13,.065],.12,0,-.08);
    marker.box(.095,.07,.105,-.65,.70,.29,[.25,.19,.11]);
    const rag=new THREE.PlaneGeometry(.26,.32,4,5),rp=rag.attributes.position;
    for(let i=0;i<rp.count;i++)rp.setXYZ(i,rp.getX(i),rp.getY(i),.022*Math.sin(rp.getX(i)*31+rp.getY(i)*19));
    rag.computeVertexNormals();marker.at(rag,[.34,.28,.16],-.52,.53,.30,.3,0,-.12);
    // A low upturned metal corner catches torchlight beside the split timber.
    marker.box(.31,.025,.20,.28,.265,-.12,[.26,.20,.105],.4,.17,.12);
    const spoil=new THREE.RingGeometry(.53,1.06,24,3);spoil.rotateX(-Math.PI/2);
    const sp=spoil.attributes.position;for(let i=0;i<sp.count;i++){const x=sp.getX(i),z=sp.getZ(i),a=Math.atan2(z,x);sp.setXYZ(i,x*(1+.065*Math.sin(a*5)),.026+.035*Math.sin(a*9)**2,z*.78);}
    spoil.computeVertexNormals();excavated.push(spoil,[.14,.073,.035]);
    const hollow=new THREE.CircleGeometry(.56,24);hollow.rotateX(-Math.PI/2);hollow.scale(1,1,.78);hollow.translate(0,.025,0);excavated.push(hollow,[.025,.016,.009]);
    this.geos={...chest,earth:earth.build(),digMarker:marker.build(),excavated:excavated.build()};
    const rng=this.ctx.rng.fork('buried-supplies');
    const add=(id,x,z,kind,bones=false)=>this.sites.push({id:'supply:'+id,x,z,kind,bones,seed:rng.next(),stage:0,node:null});
    for(const m of MAJORS.filter(m=>m.id!==OPENING.id))for(let i=0;i<3;i++){
      const a=(i/3)*Math.PI*2+.48,r=(m.flat?.radius||30)*(i===2?1.22:(.52+i*.10));
      add(m.id+':'+i,m.x+Math.cos(a)*r,m.z+Math.sin(a)*r,i===2?'dig':'crate',i===2);
    }
    // TWO MORE TURNED PATCHES AT EVERY DESTINATION, on their own ids so that not one flag in
    // an existing save changes meaning. They are further out than the ring above and on a
    // different bearing, so a destination has ground worth walking rather than one hole by
    // the door. The ambush roll is the ordinary one: about a third of these have something
    // in them, and what comes up out of a plain dig is still the MARROW.
    for(const m of MAJORS.filter(m=>m.id!==OPENING.id))for(let i=0;i<2;i++){
      const a=(i/2)*Math.PI*2+2.31,r=(m.flat?.radius||30)*(.78+i*.46);
      add(m.id+':dug:'+i,m.x+Math.cos(a)*r,m.z+Math.sin(a)*r,'dig',true);
    }
    const wild=this._sys('wilds');wild.lookouts();
    const station=this._sys('places').nodes.get(OPENING.id),cy=Math.cos(station.yaw),sy=Math.sin(station.yaw);
    for(const q of OPENING.supplies){
      add('opening:'+q.id,OPENING.x+q.x*cy+q.z*sy,OPENING.z-q.x*sy+q.z*cy,q.kind);
      Object.assign(this.sites.at(-1),{authored:true,noAmbush:true,deckY:q.y===undefined?null:station.padY+q.y,cash:q.cash,xp:q.xp});
    }
    add('opening:first-light',-513,246,'crate');
    Object.assign(this.sites.at(-1),{authored:true,noAmbush:true,cash:40,xp:30,ammo:8,bulbs:1});
    for(let i=0;i<wild.sites.length;i++){
      const w=wild.sites[i];if(w.kind==='travel-water')continue;
      const a=rng.next()*Math.PI*2,r=7+rng.next()*5;
      add('wild:'+w.id,w.x+Math.cos(a)*r,w.z+Math.sin(a)*r,i%4===0?'crate':'dig',true);
    }

    /* ---- ROUND 18: THE GRAVES ------------------------------------------------------
     * ALEX, 2026-09-09: "In that cemetery location I want to be able to use the melee dig
     * thing to dig up graves. Some rewards. Some of those enemies we usually have popping
     * out."
     *
     * The verb already exists and he named it: three melee strikes on disturbed earth. So a
     * grave is a dig site, placed by hand along the Garden of Rest's actual grave field, and
     * it differs from an ordinary one in exactly three numbers — twice the money, a much
     * higher chance of something coming up, and a PALLBEARER when it does.
     *
     * The positions are the site's own local frame, converted here with its real yaw the
     * same way the opening's supplies are. They run down both sides of the central avenue
     * between the mortuary gatehouse and the mausoleum, which is where the graves are.
     */
    const places=this._sys('places');
    for(const g of GRAVE_SITES){
      const node=places.nodes.get(g.site);
      if(!node)continue;
      const m=MAJORS.find(q=>q.id===g.site);
      if(!m)continue;
      const cy2=Math.cos(node.yaw),sy2=Math.sin(node.yaw);
      for(let i=0;i<g.rows.length;i++){
        const q=g.rows[i];
        add(g.site+':grave:'+i, m.x+q[0]*cy2+q[1]*sy2, m.z-q[0]*sy2+q[1]*cy2, 'dig');
        Object.assign(this.sites.at(-1), {
          authored:true, grave:true,
          cash:38+Math.floor(rng.next()*30), xp:34,
          ambushChance:0.45, ambushSpecies:'pallbearer',
        });
      }
    }
    // Geometry and its existing surface program take part in normal boot warmup.
    this.warm=new THREE.Mesh(this.geos.wood,this.mat);this.warm.position.y=-10000;this.root.add(this.warm);
    this.off=this.ctx.bus.on('world:broke',p=>{if(p.tag==='supply')for(const s of this.sites)if(s.node&&Math.hypot(s.x-p.x,s.z-p.z)<1.1&&Math.abs(s.y-p.y)<1)this._take(s);});
  }
  ready(){return !!this.geos&&this.sites.length>0;}
  _build(s){
    const col=this._sys('collision'),terr=this._sys('terrain'),pr=this._sys('progress');
    if(!s.placed){
      const ox=s.x,oz=s.z;let found=false;
      // ROUND 18: a GRAVE is authored (exact spot, tight fit radius) but gets a short search
      // anyway, because twelve of them are hand-placed among monuments whose footprints move
      // whenever the cemetery's dress is edited. One attempt each and a single overlapping
      // plinth would silently cost a grave for the life of the save; eight small steps keeps
      // it in its own row.
      const tries = s.grave ? 8 : (s.authored ? 1 : 20);
      for(let i=0;i<tries;i++){
        const a=i*2.399,r=i===0?0:(s.grave?0.55:1)+Math.sqrt(i)*(s.grave?0.5:1.2),x=ox+Math.cos(a)*r,z=oz+Math.sin(a)*r,y=s.deckY??terr.heightAt(x,z);
        if(this._sys('roads').roadDistance(x,z)<3.4||y<.5||!col.fits(x,z,y+.03,s.authored?.74:.86,s.authored?1.05:1.7))continue;
        if(!s.authored&&(Math.abs(y-terr.heightAt(x+1,z))>.32||Math.abs(y-terr.heightAt(x,z+1))>.32))continue;
        s.x=x;s.y=y+.04;s.z=z;found=true;break;
      }
      if(!found){s.retry=this.time+15;return;}
      s.placed=true;
    }
    s.stage=Number(pr.flag(s.id))||0;
    const root=new THREE.Group();root.position.set(s.x,s.y,s.z);root.name=s.id;
    const chest=new THREE.Group(),body=new THREE.Mesh(this.geos.wood,this.mat),lid=new THREE.Mesh(this.geos.lid,this.mat),contents=new THREE.Mesh(this.geos.inside,this.mat);
    const seam=new THREE.Mesh(this.seamGeo,this.seamMat);seam.position.set(0,.652,-.49);chest.add(body,contents,lid,seam);lid.position.set(0,.66,.43);root.add(chest);
    const earth=new THREE.Mesh(this.geos.earth,this.mat);earth.visible=s.kind==='dig'&&s.stage<3;root.add(earth);
    const marker=s.kind==='dig'?new THREE.Mesh(this.geos.digMarker,this.mat):null,excavated=s.kind==='dig'?new THREE.Mesh(this.geos.excavated,this.mat):null;
    if(marker){marker.name='dig-rag-and-exposed-lid';marker.castShadow=true;marker.receiveShadow=true;root.add(marker,excavated);}
    // The spade cuts, lit. They sit exactly on the two cuts modelled into the mound.
    let cuts=null;
    if(s.kind==='dig'){
      cuts=new THREE.Group();cuts.name='dig-seam';
      const bar=(w,x,y,z,ry)=>{const m2=new THREE.Mesh(this.cutGeo,this.cutMat);m2.scale.x=w;m2.position.set(x,y,z);m2.rotation.y=ry;cuts.add(m2);};
      bar(.86,-.13,.301,-.13,.5);
      bar(.52,.23,.276,.14,-.65);
      bar(.34,.28,.291,-.12,.4);
      root.add(cuts);
    }
    earth.receiveShadow=true;
    s.node={root,chest,body,lid,contents,seam,earth,marker,excavated,cuts,collider:-1,open:s.stage>=4?1:0};this.root.add(root);
    if(s.bones){
      const kit=new Kit(),rng=this.ctx.rng.fork(s.id+':bones');
      const api={scatteredBones:true,heightAt:(x,z)=>terr.heightAt(x,z)-s.y,wx:(x,z)=>s.x+x,wz:(x,z)=>s.z+z,
        emit:()=>{},body:(x,z,y)=>this._sys('search').addBody(s.id+':bones',s.x+x,s.y+y,s.z+z)};
      skeleton(kit,api,1.9,-.5,s.seed*6.28,rng);
      s.node.boneGeo=kit.build();root.add(new THREE.Mesh(s.node.boneGeo,this.mat));
    }
    this._appearance(s);
  }
  _appearance(s){
    const n=s.node;if(!n)return;const buried=s.kind==='dig'&&s.stage<3,taken=s.stage>=4;
    n.earth.visible=buried;n.earth.scale.y=Math.max(.12,1-s.stage*.34);
    if(n.marker){n.marker.visible=buried;n.excavated.visible=!buried;}
    if(n.cuts)n.cuts.visible=buried;
    n.chest.visible=s.stage!==5&&(!buried||s.stage>=2);n.chest.position.y=buried?-.46:0;
    n.contents.visible=!taken||n.open<.85;n.lid.rotation.x=n.open*1.92;n.seam.visible=!taken;
    if(!buried&&!taken&&n.collider<0)n.collider=this._sys('collision').addCollider({kind:'obb',x:s.x,z:s.z,halfX:.71,halfZ:.50,yaw:0,y0:s.y-.05,y1:s.y+.93,tag:'supply',breakable:22,standable:true},s.id);
    if(taken&&s.stage!==5&&n.collider<0)n.collider=this._sys('collision').addCollider({kind:'obb',x:s.x,z:s.z,halfX:.71,halfZ:.50,yaw:0,y0:s.y-.05,y1:s.y+.66,tag:'strongbox-empty',standable:true},s.id);
  }
  _take(s){
    if(s.stage>=4||!s.node||s.kind==='dig'&&s.stage<3)return;
    s.stage=4;this._sys('progress').flag(s.id,4);
    this._sys('collision').removeChunk(s.id);s.node.collider=-1;
    this._sys('fx')?.clearDecalsNear(s.x,s.y+.35,s.z,1.25);
    // ROUND 18: a buried cache is 22-40 now, not 4-9 — the same x4 the rest of the county took.
    const pr=this._sys('progress'),cash=pr.payCash(s.cash??(22+Math.floor(s.seed*19)),s.x,s.y+.4,s.z,'supplies'),xp=pr.award(s.xp??18,s.x,s.y+.4,s.z,'supplies');
    const ammo=Math.max(0,this._sys('weapons')?.addReserve?.(s.ammo??(4+Math.floor(s.seed*5)))||0);
    const lamps=this._sys('dusk-to-dawn'),beforeBulbs=lamps?.bulbs?.()||0;if(s.bulbs)lamps?.addBulb?.(s.bulbs);const bulbs=Math.max(0,(lamps?.bulbs?.()||0)-beforeBulbs);
    this.ctx.bus.emit('reward:bundle',{title:'Supplies found',cash:cash||0,xp:xp||0,ammo,bulbs,detail:bulbs?'A spare bulb for a dark stretch of road.':'Added to your inventory.',x:s.x,y:s.y+.7,z:s.z});
    this._sys('audio')?.dread('branch',s.x,s.y+.3,s.z,.40);
    this._appearance(s);
  }
  strike(origin,dir,range){
    if(dir.y>=-.12)return false;let best=null,near=range;
    for(const s of this.sites){if(!s.node||s.kind!=='dig'||s.stage>=3)continue;
      const t=(s.y+.18-origin.y)/dir.y;if(t<0||t>near)continue;
      const x=origin.x+dir.x*t,z=origin.z+dir.z*t;
      if(Math.hypot(x-s.x,z-s.z)<1.05){best=s;near=t;}}
    if(!best)return false;const s=best;s.stage++;this._sys('progress').flag(s.id,s.stage);
    _from.set(s.x,s.y+.1,s.z);this._sys('fx')?.impact?.('dirt',_from,_up,.65);
    this._sys('audio')?.dread('branch',s.x,s.y+.1,s.z,.38);
    // ROUND 18. Alex, 2026-09-09, about the cemetery: "I want to be able to use the melee
    // dig thing to dig up graves. Some rewards. Some of those enemies we usually have
    // popping out." A GRAVE is an ordinary dig site with two numbers changed — a much higher
    // chance that something comes out of it, and a PALLBEARER rather than a MARROW when it
    // does, because the pallbearer is already the species that lies in the ground and rises
    // where it was lying (species.js) and there is no sense inventing a second one.
    const chance=s.ambushChance===undefined?.32:s.ambushChance;
    if(s.stage===3&&s.seed<chance&&!s.noAmbush){
      const kind=s.ambushSpecies||'marrow';
      const e=this._sys('enemies').spawn(kind,s.x,s.z,{feetY:s.y,awake:true,ambush:true,riseS:.95});
      if(e){s.stage=5;this._sys('progress').flag(s.id,5);this._sys('audio')?.dread('canopy-rush',s.x,s.y+.3,s.z,.55);s.node.chest.visible=false;s.ambush=true;}
    }
    this._appearance(s);if(s.ambush)s.node.chest.visible=false;
    this.ctx.bus.emit('dig:struck',{id:s.id,stage:s.stage,ambush:!!s.ambush});return true;
  }
  step(dt){
    if(!this.ctx.playing||this.ctx.paused)return;this.time+=dt;
    // One shared material, one write a step: every turned patch in the county breathes
    // together, which is what makes a row of them read as the same KIND of thing.
    this.cutMat.opacity=.40+.26*(.5+.5*Math.sin(this.time*1.35));
    const p=this._sys('player'),col=this._sys('collision'),use=this.ctx.input.held('use');if(!use)this.release=false;
    const cam=this._sys('camera');cam.aimDir(_dir);_from.set(p.pos.x,p.eyeY,p.pos.z);
    let target=null,near=3,budget=1;
    for(const s of this.sites){const d=Math.hypot(p.pos.x-s.x,p.pos.z-s.z);
      if(d<85&&!s.node&&budget>0&&(!s.retry||this.time>s.retry)){this._build(s);budget--;}
      if(d>165&&s.node){col.removeChunk(s.id);s.node.root.removeFromParent();s.node.boneGeo?.dispose();s.node=null;}
      if(!s.node)continue;
      if(s.stage>=4&&s.node.open<1){s.node.open=Math.min(1,s.node.open+dt/.75);const u=s.node.open;s.node.lid.rotation.x=(u*u*(3-2*u))*1.92;s.node.contents.visible=u<.85;}
      if(s.node.collider>=0&&col.massOf(s.node.collider)<0)this._take(s);
      if(s.stage>=4||this.ctx.shared.inCar||p.dead||d>near||Math.abs(p.pos.y-s.y)>1.5)continue;
      const dx=s.x-p.pos.x,dz=s.z-p.pos.z,dot=(dx*_dir.x+dz*_dir.z)/(d||1);
      if(dot<.60||!col.segmentClear(p.pos.x,p.eyeY,p.pos.z,s.x,s.y+.78,s.z))continue;
      target=s;near=d;
    }
    if(target!==this.target){this.target=target;this.hold=0;if(use)this.release=true;}
    if(!target){this._stepHandOpen(dt,p,col,_dir,use);return;}
    const dig=target.kind==='dig'&&target.stage<3;
    this.ctx.bus.emit('prompt',{kind:dig?'dig':'hold',label:dig?'V':'E',rank:3,x:target.x,y:target.y+(dig?.3:.6),z:target.z,
      k:dig?target.stage/3:this.hold/.7,detail:dig?(target.grave?'A GRAVE, RECENTLY TURNED':'DISTURBED EARTH'):'OPEN SUPPLIES',subdetail:dig?'MELEE':''});
    if(!dig&&use&&!this.release){this.hold+=dt;if(this.hold>=.7){this._take(target);this.release=true;this.hold=0;}}
    else this.hold=0;
    this.boxTarget=null;this.boxHold=0;
  }

  /* ------------------------------------------------------ HANDS ON A BOX --
   * ROUND 19. ALEX: "I guess all the boxes should both be able to hold e to open or smash
   * them to open when you melee."
   *
   * The smash half has existed since round 13 and the shape rule since round 18. This is the
   * other half, and it lives here because this file already owns the held-E-to-open verb,
   * its ring prompt and its release latch — a second implementation of a hold somewhere else
   * is how two verbs end up disagreeing about what a hold is.
   *
   * The target is whatever collision says is the nearest breakable in front of you
   * (collision.nearestBreakable, which is the exact set the stock opens). The HOLD is the
   * cost, and it is the material's: a wooden crate the stock takes in one swing is 0.6 s in
   * the hands, a concrete block that needs four is 1.4. So the stock is still the fast way
   * and the hands are the quiet, deliberate one — and combat.openBreakable pays out through
   * the same path either way, so nothing about the reward can drift between them.
   */
  _stepHandOpen(dt,p,col,dir,use){
    // Never from the driver's seat: E is the door there, and a crate beside a parked car
    // must not answer the press that gets you into it.
    if(this.ctx.shared&&this.ctx.shared.inCar){this.boxTarget=null;this.boxHold=0;return;}
    if(!col||typeof col.nearestBreakable!=='function'){this.boxTarget=null;return;}
    const b=col.nearestBreakable(p.pos.x,p.pos.z,BOX_REACH,p.pos.y,2.1);
    let ok=!!b&&!NO_HOLD_TAG.has(b.tag);
    if(ok){
      const dx=b.x-p.pos.x,dz=b.z-p.pos.z,d=Math.hypot(dx,dz)||1;
      // Facing, and a clear line: a box behind a wall is not a box you have your hands on.
      //
      // THE LINE STOPS SHORT OF THE BOX. Aiming segmentClear at the box's CENTRE meant the
      // ray had to pass through the box's own near face to get there, so every box in the
      // county reported itself occluded and the verb never fired once. It is tested to a
      // point just outside its footprint instead, which is the thing the test was for: a
      // wall between you and it, not the box itself.
      if((dx*dir.x+dz*dir.z)/d<BOX_FACE)ok=false;
      else{
        // IS THE BOX THE FIRST THING THE EYE REACHES? A segmentClear to the box's CENTRE
        // cannot answer that — the ray has to pass through the box's own near face to get
        // there, so every box in the county reported itself occluded and the verb never
        // fired once (measured with tools/_box-probe.mjs). And a segment stopped short of
        // the footprint fails too on a stack: at the station's crate stair the short line
        // clips the neighbouring column. So: cast at it, and accept if nothing solid is in
        // the way before its own surface. A wall between you and it still refuses.
        const my=(b.y0+b.y1)*.5,ey=p.eyeY,dyy=my-ey;
        const len=Math.hypot(dx,dyy,dz)||1;
        _rayD.x=dx/len;_rayD.y=dyy/len;_rayD.z=dz/len;
        _rayO.x=p.pos.x;_rayO.y=ey;_rayO.z=p.pos.z;
        const hit=col.raycast(_rayO,_rayD,len,col.MASK?col.MASK.SOLID:1);
        if(hit&&hit.t<len-((b.radius||0.4)+BOX_LOS_SLACK))ok=false;
      }
    }
    if(!ok){this.boxTarget=null;this.boxHold=0;return;}
    const need=Math.max(1,b.need||1),span=BOX_HOLD_BASE+BOX_HOLD_PER*need;
    const y=(b.y0+b.y1)*.5,mid={id:b.id,x:b.x,y,z:b.z,span};
    if(!this.boxTarget||this.boxTarget.id!==b.id){this.boxTarget=mid;this.boxHold=0;}
    else this.boxTarget=mid;
    this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:2,x:b.x,y:b.y1+.18,z:b.z,
      k:this.boxHold/span,detail:'OPEN',subdetail:''});
    if(use&&!this.release){
      this.boxHold+=dt;
      if(this.boxHold>=span){
        const combat=this._sys('combat');
        const dx=b.x-p.pos.x,dz=b.z-p.pos.z;
        if(combat&&typeof combat.openBreakable==='function')combat.openBreakable(b.id,b.x,y,b.z,dx,dz);
        this.release=true;this.boxHold=0;this.boxTarget=null;
      }
    }else this.boxHold=0;
  }
  state(){return{sites:this.sites.length,digs:this.sites.filter(s=>s.kind==='dig').length,resident:this.sites.filter(s=>s.node).map(s=>({id:s.id,kind:s.kind,x:s.x,y:s.y,z:s.z,stage:s.stage,seed:s.seed}))};}
  dispose(){this.off?.();this.root.removeFromParent();for(const s of this.sites){this._sys('collision').removeChunk(s.id);s.node?.boneGeo?.dispose();}Object.values(this.geos).forEach(g=>g.dispose());this.seamGeo?.dispose();this.seamMat?.dispose();this.cutGeo?.dispose();this.cutMat?.dispose();}
}
