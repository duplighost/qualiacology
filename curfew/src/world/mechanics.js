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
// D7. The list is the one shop menu (ui/shop-menu.js): the digit picks a row, a click buys
// it outright, the hold on E buys it the way a claim is claimed. T is the car radio and
// nothing else. The old aside on the right (vehicle/workshop-card.js) is gone with it.
//
// And: "if you kill one of them, just have them respawn when you're not around. And don't
// make them aggro at you forever if you anger one and leave." Both below. A dead keeper is
// remembered with the TIME it died rather than as a permanent flag, and it comes back once
// enough of the night has passed and the player is nowhere near the tower.

import { ShopMenu } from '../ui/shop-menu.js';
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
// How often the Look's two rows are re-read from the map while you stand there: the list
// only changes when you buy it or learn a pin, and a rebuild allocates the point list.
const OFFERS_REFRESH_S = 1;

export class Mechanics {
  static id='mechanics';
  constructor(ctx){this.ctx=ctx;this.keepers=new Map();this.clock=0;this.target='';this.release=false;
    // D7: the two rows, made once and rewritten in place; the spec is the menu's feed.
    this.offers=[
      {kind:'gas',id:'gas',name:'GAS CAN',line:'One can. It fills the car.',price:GAS_PRICE,owned:false,full:false,unavailable:false,tag:'',note:''},
      {kind:'look',id:'look',name:'A LOOK FROM THE TOP',line:'',price:LOOK_PRICE,points:[],owned:false,full:false,unavailable:false,tag:'',note:'NOTHING NEW FROM UP HERE'},
    ];
    this.spec={key:'',title:'The keeper',rank:6,cash:0,x:0,y:0,z:0,offers:this.offers,buy:o=>this._buy(o)};
    this.offersAt=-Infinity;this.menu=null;}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    this.menu=new ShopMenu(this.ctx);
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
  ready(){return !!this.menu;}
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

  /** The list this keeper is offering: the Look's rows re-read from the map once a second. */
  _buildOffers(pr,tower){
    if(this.clock-this.offersAt<OFFERS_REFRESH_S)return this.offers;
    this.offersAt=this.clock;
    const look=this.offers[1];
    look.points=this._lookPoints(pr,tower?tower.x:0,tower?tower.z:0);
    look.unavailable=!look.points.length;
    look.line=look.points.length
      ?'Two things worth the climb. '+look.points.map(p=>p.name).join(', ')+'.'
      :'Nothing new from up here.';
    return this.offers;
  }

  /** One purchase, from the menu, only when the row could be bought and the purse covered it. */
  _buy(o){
    const pr=this._sys('progress'),k=this.keepers.get(this.target);
    if(o.kind==='gas'){
      if(pr.spendCash(o.price,'keeper:gas')){pr.addGas(1);this._voice('keeper.gas',k);}
    }else if(o.kind==='look'){
      if(!o.points.length)return;
      if(pr.spendCash(o.price,'keeper:look')){for(const pt of o.points)pr.learnRumour(pt);this._voice('keeper.look',k);}
      this.offersAt=-Infinity;   // what you just bought is no longer new: re-read the map now
    }
  }

  step(dt){
    if(!this.ctx.playing||this.ctx.paused){this.menu?.close();return;}this.clock+=dt;
    const p=this._sys('player'),en=this._sys('enemies'),pr=this._sys('progress'),wild=this._sys('wilds');
    const use=this.ctx.input.held('use');if(!use)this.release=false;
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
    if(!target||p.dead||this.ctx.shared.inCar){this.menu?.close();this.target='';return;}
    if(this.target!==target.id){this.target=target.id;this.offersAt=-Infinity;}

    const list=this._buildOffers(pr,targetTower),e=target.e,spec=this.spec;
    spec.key=target.id;spec.cash=pr.cash();spec.x=e.pos.x;spec.y=e.pos.y+1.38;spec.z=e.pos.z;
    if(!this.menu)this.menu=new ShopMenu(this.ctx);
    this.menu.show(spec,dt);
    // A SILENT REFUSAL is indistinguishable from a game that is not listening. Pressing E on
    // a Look with nothing behind it gets you the keeper saying so, once a cooldown.
    const o=list[this.menu.row];
    if(o&&o.kind==='look'&&o.unavailable&&use&&!this.release){this.release=true;this._voice('keeper.nothing',target);}
  }
  state(){return{keepers:[...this.keepers.values()].map(k=>({id:k.id,alive:!!k.e?.alive,position:k.e?.pos.toArray()})),
    offer:this.menu?this.menu.row:0,offers:this.offers.map(o=>({name:o.name,price:o.price,points:o.points?o.points.length:0}))};}
  present(){this.menu?.present();}
  dispose(){this.off?.();this.menu?.dispose();}
}
