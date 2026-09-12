// Lookout keepers use the same living, damageable people as the settlements.
// Recorded stock Windows speech is loaded locally and routed through the game's mixer.
//
// ROUND 18. This is now THE GARAGE as well as the repair shop. Alex, 2026-09-09:
// "Let's get the car upgrades out of the xp things. They should cost money from those other
// people who fix your car." So the keeper offers a list — the repair first when the car
// needs one, then every upgrade you have not bought — and T steps through it while E buys
// what is showing. T is the tune key, which does nothing on foot, so this costs no new
// binding and the grammar ("T moves along a list of things, E takes the one you are on")
// is the one the car radio already taught.
//
// And: "if you kill one of them, just have them respawn when you're not around. And don't
// make them aggro at you forever if you anger one and leave." Both below. A dead keeper is
// remembered with the TIME it died rather than as a permanent flag, and it comes back once
// enough of the night has passed and the player is nowhere near the tower.

import { UPGRADES } from '../vehicle/garage.js';
import { WorkshopCard } from '../vehicle/workshop-card.js';

// How long a killed keeper stays dead, and how far away you have to be for the tower to
// quietly get its person back. 150 s is about two minutes of driving; RESPAWN_AWAY is
// outside the 155 m at which this system releases the body at all, so the swap can never
// happen inside anyone's view.
const RESPAWN_S = 150;
const RESPAWN_AWAY = 190;

export class Mechanics {
  static id='mechanics';
  constructor(ctx){this.ctx=ctx;this.keepers=new Map();this.clock=0;this.hold=0;this.target='';this.release=false;this.bytes=[];this.buffers=[];
    // ROUND 18: which offer the keeper is showing, and the T edge that steps it on.
    this.offer=0;this.tuneRelease=false;this.offers=[];}
  _sys(id){return this.ctx.systems.get(id);}
  async init(){
    this.card=new WorkshopCard();
    const files=['mechanic-hello-1.wav','mechanic-hello-2.wav','mechanic-fixed.wav'];
    this.bytes=await Promise.all(files.map(async f=>{const r=await fetch(new URL('../../assets/voices/'+f,import.meta.url));if(!r.ok)throw new Error('Missing mechanic speech: '+f);return r.arrayBuffer();}));
    this.off=this.ctx.bus.on('enemy:killed',p=>{
      const id=p.e?.siteGuard;
      if(!id?.startsWith('mechanic:'))return;
      // Stamp WHEN, not that. A permanent ':dead' flag was the thing Alex asked to end:
      // one bad decision and that tower had nobody at it for the rest of the save.
      this._sys('progress').flag(id+':dead',Math.max(1,Math.round(this.clock)));
    });
  }
  ready(){return this.bytes.length===3;}
  async _voice(i,k){
    const audio=this._sys('audio');if(!audio?.actx||!audio.enabled)return;
    this.buffers[i]??=audio.actx.decodeAudioData(this.bytes[i].slice(0));
    const buffer=await this.buffers[i];
    if(!k.e?.alive)return;
    const s=audio.spec();s.x=k.e.pos.x;s.y=k.e.pos.y+1.5;s.z=k.e.pos.z;
    s.bus='world';s.gain=.82;s.ref=18;s.roll=1.05;s.maxDist=80;s.occl=false;s.priority=1;s.send=.06;
    audio.playBuf(buffer,s);
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

  /** The list this keeper is offering, rebuilt each frame it is in focus. Repair first. */
  _buildOffers(car,pr){
    const out=this.offers;out.length=0;
    if(car.wear>.005||!pr.flag('car:fully-repaired')){
      // ROUND 18. Alex: "The cash system is kind of broken. Things should cost much more."
      // A full rebuild used to top out at 32 coins, which is four searched bodies — the car
      // could be wrecked and repairing it was not a decision. x8, with a floor that means
      // a scratch is still worth paying to have out.
      out.push({kind:'repair',name:'FULL CAR REPAIR',line:'Engine, brakes and both headlamps restored.',
        price:Math.max(40,Math.ceil(car.wear*260))});
    }
    for(let i=0;i<UPGRADES.length;i++){
      const u=UPGRADES[i];
      if(pr.ownsUpgrade(u.id))continue;
      out.push({kind:'upgrade',id:u.id,name:u.name,line:u.line,price:u.price});
    }
    return out;
  }

  step(dt){
    if(!this.ctx.playing||this.ctx.paused){this.card?.hide();return;}this.clock+=dt;
    const p=this._sys('player'),en=this._sys('enemies'),pr=this._sys('progress'),car=this._sys('car'),wild=this._sys('wilds');
    const use=this.ctx.input.held('use');if(!use)this.release=false;
    const tune=this.ctx.input.held('radiotune');if(!tune)this.tuneRelease=false;
    let target=null,nearest=Infinity;
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
        k.helloAt=this.clock+65;this._voice(k.variant,k).catch(e=>console.warn('Mechanic speech:',e));
        this.ctx.bus.emit('mechanic:near',{id:t.id,x:t.x,z:t.z});
      }
      const pos=k.e.pos,d=Math.hypot(p.pos.x-pos.x,p.pos.z-pos.z),dy=Math.abs(p.pos.y-pos.y);
      if(d<2.9&&dy<1.2&&d<nearest){
        const cam=this._sys('camera'),dot=((pos.x-p.pos.x)*-Math.sin(cam.yaw)+(pos.z-p.pos.z)*-Math.cos(cam.yaw))/(d||1);
        if(dot>.60&&this._sys('collision').segmentClear(p.pos.x,p.eyeY,p.pos.z,pos.x,pos.y+1.5,pos.z)){nearest=d;target=k;}
      }
    }
    if(!target||p.dead||this.ctx.shared.inCar){this.card?.hide();this.hold=0;this.target='';return;}
    if(this.target!==target.id){this.target=target.id;this.hold=0;this.offer=0;}

    const list=this._buildOffers(car,pr);
    const e=target.e;
    if(!list.length){
      this.card?.show([],0,pr.cash(),UPGRADES.filter(u=>pr.ownsUpgrade(u.id)).map(u=>u.name));
      // Nothing left to sell and nothing to fix. Say so rather than showing a dead prompt.
      this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:6,x:e.pos.x,y:e.pos.y+1.38,z:e.pos.z,k:0,
        detail:'YOUR CAR IS IN GOOD SHAPE',subdetail:'NOTHING LEFT TO FIT',unavailable:true});
      this.hold=0;return;
    }
    // T steps the list on. The edge is taken here so holding T does not spin through it.
    if(tune&&!this.tuneRelease&&list.length>1){
      this.tuneRelease=true;this.offer=(this.offer+1)%list.length;this.hold=0;
    }
    if(this.offer>=list.length)this.offer=0;
    const o=list[this.offer],cash=pr.cash(),can=cash>=o.price;
    this.card?.show(list,this.offer,cash,UPGRADES.filter(u=>pr.ownsUpgrade(u.id)).map(u=>u.name));
    const more=list.length>1?' · T · NEXT':'';
    this.ctx.bus.emit('prompt',{kind:'hold',label:'E',rank:6,x:e.pos.x,y:e.pos.y+1.38,z:e.pos.z,k:this.hold/1.1,
      detail:o.name+' · '+o.price+' COINS',
      subdetail:(can?'HOLD E TO FIT':'YOU HAVE '+cash+' · NEED '+(o.price-cash))+more,
      unavailable:!can});
    if(!use||this.release||!can){this.hold=0;return;}
    this.hold+=dt;
    if(this.hold<1.1)return;
    this.release=true;this.hold=0;
    if(o.kind==='repair'){
      if(pr.spendCash(o.price,'full-car-repair')){car.repairFull();this._voice(2,target).catch(e2=>console.warn('Mechanic speech:',e2));}
    }else if(pr.buyUpgrade(o.id)){
      this._voice(2,target).catch(e2=>console.warn('Mechanic speech:',e2));
      this.offer=0;
    }
  }
  state(){return{keepers:[...this.keepers.values()].map(k=>({id:k.id,alive:!!k.e?.alive,position:k.e?.pos.toArray()})),
    offer:this.offer,offers:this.offers.map(o=>({name:o.name,price:o.price}))};}
  present(){if(!this.ctx.playing||this.ctx.paused||this.ctx.shared.inCar)this.card?.hide();}
  dispose(){this.off?.();this.card?.dispose();}
}
