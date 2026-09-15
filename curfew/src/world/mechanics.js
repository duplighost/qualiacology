// Lookout keepers use the same living, damageable people as the settlements.
// Recorded stock Windows speech is loaded locally and routed through the game's mixer.
//
// THE ELEVEN REWIRE. The keeper no longer repairs your car and no longer sells you a part:
// the Eleven give the parts, and a can of gas is the repair. What a person at the top of a
// lookout tower has that nobody else in the county has is HEIGHT, so that is what they sell.
//
//   GAS CAN, 100 coins, unlimited. One can fills the car.
//   A LOOK FROM THE TOP, 60 coins. One or two nearby things you did not know were there —
//   a boss, or a sealed case — pinned on the map. Never charged when there is nothing new
//   to see, which is the only rule that makes it worth buying twice.
//
// T steps the list and E buys what is showing. T is the tune key, which does nothing on
// foot, so this costs no new binding and the grammar ("T moves along a list of things, E
// takes the one you are on") is the one the car radio already taught.
//
// And: "if you kill one of them, just have them respawn when you're not around. And don't
// make them aggro at you forever if you anger one and leave." Both below. A dead keeper is
// remembered with the TIME it died rather than as a permanent flag, and it comes back once
// enough of the night has passed and the player is nowhere near the tower.

import { WorkshopCard } from '../vehicle/workshop-card.js';
import { BOSSES, bossMapPoint } from './boss-catalog.js';
import { CASE_SITE } from './climbs-and-caches.js';
import { MAJOR_BY_ID } from './placedata.js';

// How long a killed keeper stays dead, and how far away you have to be for the tower to
// quietly get its person back. 150 s is about two minutes of driving; RESPAWN_AWAY is
// outside the 155 m at which this system releases the body at all, so the swap can never
// happen inside anyone's view.
const RESPAWN_S = 150;
const RESPAWN_AWAY = 190;
// THE ELEVEN REWIRE's two prices, and how far a Look reaches before it gives up and shows
// you the nearest thing anywhere instead. Alex may reprice all three.
const GAS_PRICE = 100;
const LOOK_PRICE = 60;
const LOOK_RANGE = 1500;

export class Mechanics {
  static id='mechanics';
  constructor(ctx){this.ctx=ctx;this.keepers=new Map();this.clock=0;this.hold=0;this.target='';this.release=false;
    // ROUND 18: which offer the keeper is showing, and the T edge that steps it on.
    this.offer=0;this.tuneRelease=false;this.offers=[];}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    this.card=new WorkshopCard();
    // THE ELEVEN REWIRE: this file no longer fetches, decodes or plays a single byte. Every
    // keeper line is a request to dialogue/dialogue.js, which owns the recordings, the
    // subtitles, the cooldowns and who is allowed to talk over whom. The old loader threw on
    // a missing wav inside init, which took the whole boot down with it; nothing here can.
    this.off=this.ctx.bus.on('enemy:killed',p=>{
      const id=p.e?.siteGuard;
      if(!id?.startsWith('mechanic:'))return;
      // Stamp WHEN, not that. A permanent ':dead' flag was the thing Alex asked to end:
      // one bad decision and that tower had nobody at it for the rest of the save.
      this._sys('progress').flag(id+':dead',Math.max(1,Math.round(this.clock)));
    });
  }
  ready(){return !!this.card;}
  /** One line, from this keeper, through the one system that owns spoken lines. */
  _voice(id,k){
    if(!k?.e?.alive)return;
    this._sys('dialogue')?.say(id,{speakerEntity:k.e,name:'The keeper'});
  }

  /**
   * Is this keeper dead RIGHT NOW? A stamped death expires: once RESPAWN_S of play has gone
   * by and the player is more than RESPAWN_AWAY from the tower, the flag is cleared and the
   * next pass spawns a fresh keeper. "Just have them respawn when you're not around."
   */
  _deadNow(id,dist){
    const pr=this._sys('progress');
    let at=Number(pr.flag(id+':dead'))||0;
    if(!at)return false;
    // ROUND 21: THE STAMP AND THE CLOCK HAVE TO SHARE A ZERO.
    //
    // this.clock counts THIS session and starts at 0, but the stamp is saved and outlives
    // the page. Kill a keeper half an hour in, reload, and the sum below was 0 - 1800: the
    // countdown could not start until the new session had run out the whole old one, so
    // that tower stayed empty for another half hour — the permanent-dead keeper Alex asked
    // to end, wearing a timer. A stamp ahead of the clock is from a session that no longer
    // exists, so re-stamp it to now and let the 150 s run from the reload.
    if(at>this.clock){at=Math.max(1,Math.round(this.clock));pr.flag(id+':dead',at);}
    if(this.clock-at>=RESPAWN_S&&dist>RESPAWN_AWAY){pr.flag(id+':dead',0);return false;}
    return true;
  }

  /**
   * WHAT THE LOOK WOULD SHOW YOU, from this tower, right now: bosses and sealed cases whose
   * whereabouts you do not have, nearest first. Up to two inside LOOK_RANGE, and if nothing
   * is that close, the two nearest anywhere — a tower in an empty corner is still a tower.
   *
   * An EMPTY list is the whole honesty of the offer: the row goes unavailable and E does
   * nothing, so you are never charged sixty coins for a view of things you already know.
   */
  _lookPoints(pr,tx,tz){
    const out=[];
    for(const b of BOSSES){
      if(pr.mapStatus(b.id)!=='unknown')continue;
      const p=bossMapPoint(b);
      out.push({id:b.id,name:b.location,x:p.x,z:p.z,kind:'boss',
        d:Math.hypot(tx-b.x,tz-b.z)});
    }
    for(const site of Object.values(CASE_SITE)){
      if(pr.mapStatus('case:'+site)!=='unknown')continue;
      const d=MAJOR_BY_ID[site];if(!d)continue;
      out.push({id:'case:'+site,name:d.name+' · a sealed case',x:d.x,z:d.z,kind:'place',
        d:Math.hypot(tx-d.x,tz-d.z)});
    }
    out.sort((a,b)=>a.d-b.d);
    const near=out.filter(o=>o.d<=LOOK_RANGE).slice(0,2);
    return near.length?near:out.slice(0,2);
  }

  /** The list this keeper is offering, rebuilt each frame it is in focus. */
  _buildOffers(pr,tower){
    const out=this.offers;out.length=0;
    out.push({kind:'gas',name:'GAS CAN',line:'One can. It fills the car.',price:GAS_PRICE});
    const look=this._lookPoints(pr,tower?tower.x:0,tower?tower.z:0);
    out.push({kind:'look',name:'A LOOK FROM THE TOP',price:LOOK_PRICE,points:look,
      line:look.length
        ?'Two things worth the climb. '+look.map(p=>p.name).join(', ')+'.'
        :'Nothing new from up here.'});
    return out;
  }

  step(dt){
    if(!this.ctx.playing||this.ctx.paused){this.card?.hide();return;}this.clock+=dt;
    const p=this._sys('player'),en=this._sys('enemies'),pr=this._sys('progress'),wild=this._sys('wilds');
    const use=this.ctx.input.held('use');if(!use)this.release=false;
    const tune=this.ctx.input.held('radiotune');if(!tune)this.tuneRelease=false;
    let target=null,targetTower=null,nearest=Infinity;
    const towers=wild.lookouts();
    for(let i=0;i<towers.length;i++){
      const t=towers[i],dist=Math.hypot(p.pos.x-t.x,p.pos.z-t.z),id='mechanic:'+t.id;
      let k=this.keepers.get(id);
      if(dist>155){if(k?.e?.alive&&k.e.gen===k.gen)en._release(k.e);if(k)k.e=null;
        // Clear an expired death from out here too, so the tower is already staffed by the
        // time it streams back in rather than a beat afterwards.
        this._deadNow(id,dist);continue;}
      if(!t.rec||!t.topY||this._deadNow(id,dist))continue;
      if(!k){k={id,e:null,gen:0,helloAt:0,variant:i%2};this.keepers.set(id,k);}
      if(!k.e||k.e.gen!==k.gen){
        const cy=Math.cos(t.yaw),sy=Math.sin(t.yaw),lx=1.15,lz=-1.25;
        k.e=en.spawn('resident',t.x+lx*cy+lz*sy,t.z-lx*sy+lz*cy,{feetY:t.topY,staged:true,neutral:true,siteGuard:id,yaw:t.yaw+Math.PI});
        if(!k.e)continue;k.gen=k.e.gen;
      }
      if(!k.e.alive||!k.e.neutral)continue;
      if(dist<40&&this.clock>=k.helloAt&&!p.dead){
        k.helloAt=this.clock+65;this._voice(k.variant?'keeper.hello2':'keeper.hello',k);
        this.ctx.bus.emit('mechanic:near',{id:t.id,x:t.x,z:t.z});
      }
      const pos=k.e.pos,d=Math.hypot(p.pos.x-pos.x,p.pos.z-pos.z),dy=Math.abs(p.pos.y-pos.y);
      if(d<2.9&&dy<1.2&&d<nearest){
        const cam=this._sys('camera'),dot=((pos.x-p.pos.x)*-Math.sin(cam.yaw)+(pos.z-p.pos.z)*-Math.cos(cam.yaw))/(d||1);
        if(dot>.60&&this._sys('collision').segmentClear(p.pos.x,p.eyeY,p.pos.z,pos.x,pos.y+1.5,pos.z)){nearest=d;target=k;targetTower=t;}
      }
    }
    if(!target||p.dead||this.ctx.shared.inCar){this.card?.hide();this.hold=0;this.target='';return;}
    if(this.target!==target.id){this.target=target.id;this.hold=0;this.offer=0;}

    const list=this._buildOffers(pr,targetTower);
    const e=target.e;
    // T steps the list on. The edge is taken here so holding T does not spin through it.
    if(tune&&!this.tuneRelease&&list.length>1){
      this.tuneRelease=true;this.offer=(this.offer+1)%list.length;this.hold=0;
    }
    if(this.offer>=list.length)this.offer=0;
    const o=list[this.offer],cash=pr.cash();
    // A LOOK with nothing to show is not for sale at any price. It is the one offer in the
    // county that can refuse your money, and it is the reason it stays worth buying.
    const empty=o.kind==='look'&&!o.points.length;
    const can=!empty&&cash>=o.price;
    this.card?.show(list,this.offer,cash,pr.gas());
    const more=list.length>1?' · T · NEXT':'';
    this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:6,x:e.pos.x,y:e.pos.y+1.38,z:e.pos.z,k:this.hold/1.1,
      detail:empty?'A LOOK FROM THE TOP':o.name+' · '+o.price+' COINS',
      subdetail:empty?'NOTHING NEW FROM UP HERE'
        :(can?'HOLD E TO BUY':'YOU HAVE '+cash+' · NEED '+(o.price-cash))+more,
      unavailable:!can});
    // A SILENT REFUSAL is indistinguishable from a game that is not listening. Pressing E on
    // a Look with nothing behind it gets you the keeper saying so, once a cooldown.
    if(empty&&use&&!this.release){this.release=true;this._voice('keeper.nothing',target);}
    if(!use||this.release||!can){this.hold=0;return;}
    this.hold+=dt;
    if(this.hold<1.1)return;
    this.release=true;this.hold=0;
    if(o.kind==='gas'){
      if(pr.spendCash(o.price,'keeper:gas')){pr.addGas(1);this._voice('keeper.gas',target);}
    }else if(o.kind==='look'){
      if(pr.spendCash(o.price,'keeper:look')){for(const pt of o.points)pr.learnRumour(pt);this._voice('keeper.look',target);}
    }
  }
  state(){return{keepers:[...this.keepers.values()].map(k=>({id:k.id,alive:!!k.e?.alive,position:k.e?.pos.toArray()})),
    offer:this.offer,offers:this.offers.map(o=>({name:o.name,price:o.price,points:o.points?o.points.length:0}))};}
  present(){if(!this.ctx.playing||this.ctx.paused||this.ctx.shared.inCar)this.card?.hide();}
  dispose(){this.off?.();this.card?.dispose();}
}
