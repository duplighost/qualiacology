import {xpForLevel} from '../progression/nodes.js';

// Explicit, quiet information for the things the player earns and loses. These read the
// authoritative systems; receipt events never change a balance or award a second reward.
export class Readouts {
  constructor(ctx, parent) {
    this.ctx=ctx;this.off=[];this.receipts=[];this.hurtUntil=0;this.lastHp=100;this.trail=1;this.trailAt=0;
    this.root=document.createElement('div');this.root.id='curfew-readouts';
    this.root.innerHTML=`<style>
#curfew-readouts{font:12px/1.45 ui-monospace,Consolas,monospace;color:#e2e8e8;pointer-events:none}
#curfew-readouts .economy{position:fixed;left:26px;top:210px;width:204px;padding:10px 12px;background:linear-gradient(100deg,rgba(5,9,13,.86),rgba(5,9,13,.22));border-left:2px solid #697986}
#curfew-readouts .money{color:#e9c785;font-size:15px;margin-bottom:5px}
#curfew-readouts .small{font-size:10px;color:#a7b7c1;letter-spacing:.03em}
#curfew-readouts .track{position:relative;height:5px;background:#263039;margin:5px 0;overflow:hidden}
#curfew-readouts .track i{position:absolute;inset:0 auto 0 0;width:0;background:#86c3c8}
#curfew-readouts .health{position:fixed;bottom:30px;left:26px;width:204px;padding:10px 12px;background:rgba(5,9,13,.76);border-left:2px solid #bdc9c2}
#curfew-readouts .health .track{height:8px;margin-bottom:0}
#curfew-readouts .health .now{background:#b2c4bb;transition:width .10s linear}
#curfew-readouts .health .lost{background:#a65748}
#curfew-readouts .health.hurt{color:#f1b8a9;border-color:#c66856}
#curfew-readouts .health.hurt .now,#curfew-readouts .health.low .now{background:#bd6554}
#curfew-readouts .receipts{position:fixed;right:30px;bottom:126px;display:flex;align-items:flex-end;flex-direction:column;gap:5px}
#curfew-readouts .receipt{padding:6px 11px;background:rgba(5,9,13,.82);border-right:2px solid currentColor;color:#95d2d6;font-size:14px}
#curfew-readouts .receipt.cash{color:#e9c785}
#curfew-readouts .capture{position:fixed;left:50%;top:22px;transform:translateX(-50%);color:#bac8d0;background:#080d12b8;padding:6px 12px;font-size:11px}
/* NITRO. Alex, 2026-09-09: "just a meter that lets you go fast and its fun for a bit. then it
   automatically regenerates." It exists only in the seat, and only once WHEEL 3 is bought, so
   nobody who has not got it ever sees a gauge. Wider and taller than the economy tracks and
   low centre-right, where the eye is while driving. */
#curfew-readouts .nitro{position:fixed;right:30px;bottom:34px;width:172px;padding:7px 10px 8px;background:rgba(5,9,13,.7);border-right:2px solid #c98a4e}
#curfew-readouts .nitro .track{height:9px;margin:0;background:#241c16}
#curfew-readouts .nitro .track i{background:linear-gradient(90deg,#8a5a2a,#e8a24e);transition:width .06s linear}
#curfew-readouts .nitro.burn{border-color:#ffd08a}
#curfew-readouts .nitro.burn .track i{background:linear-gradient(90deg,#e8a24e,#fff1cf)}
#curfew-readouts .nitro.dry .track i{background:#4a3524}
#curfew-readouts [hidden]{display:none!important}
@media(max-height:620px){#curfew-readouts .economy{top:198px;padding:5px 10px}}
</style><div class="economy"><div class="money"></div><div class="xp small"></div><div class="track"><i></i></div><div class="carried small"></div></div><div class="health"><div class="value"></div><div class="track"><i class="lost"></i><i class="now"></i></div></div><div class="receipts" role="status" aria-live="polite"></div><div class="nitro" hidden><div class="track"><i></i></div></div><div class="capture" hidden>CLICK TO CAPTURE MOUSE</div>`;
    parent.appendChild(this.root);
    this.condition=document.createElement('div');this.condition.className='small';this.condition.hidden=true;
    this.root.querySelector('.economy').appendChild(this.condition);
    for(const [key,selector] of Object.entries({money:'.money',xp:'.xp',xpFill:'.economy i',carried:'.carried',health:'.health',hp:'.value',hpFill:'.now',hpTrail:'.lost',list:'.receipts',nitro:'.nitro',nitroFill:'.nitro i',capture:'.capture'}))this[key]=this.root.querySelector(selector);
    const on=(event,fn)=>this.off.push(ctx.bus.on(event,fn));
    on('cash:gained',p=>this.receipt('+'+p.amount+' COINS','cash'));
    on('cash:spent',p=>this.receipt('−'+p.amount+' COINS','cash'));
    on('xp:gained',p=>{if(p.reason!=='road')this.receipt('+'+p.amount+' XP','xp',p.amount);});
    on('xp:banked',p=>this.receipt(p.amount+' XP BANKED','bank'));
    on('level:up',p=>this.receipt('LEVEL '+p.level+' · SKILL POINT','level'));
    on('loot:searched',p=>{if(!p.coins)this.receipt('EMPTY POCKETS','empty');});
    on('car:repaired',()=>this.receipt('CAR RESTORED · 100%','repair'));
    on('pickup:ammo',p=>{if(p.n>0)this.receipt('+'+p.n+' AMMO','ammo');});
    on('player:hurt',()=>{this.hurtUntil=this.now()+.65;this.trailAt=this.now()+.7;});
    on('player:secondwind',()=>this.receipt('STILL STANDING','wind'));
  }
  now(){return this.ctx.time.t||0;}
  receipt(text,kind,amount=0){
    const time=this.now(),last=this.receipts.at(-1);
    if(amount&&last?.kind===kind&&time-last.born<.45){last.amount+=amount;last.el.textContent='+'+last.amount+' XP';last.until=time+3.2;return;}
    const el=document.createElement('div');el.className='receipt '+kind;el.textContent=text;this.list.appendChild(el);
    this.receipts.push({el,kind,amount,born:time,until:time+3.2});
    if(this.receipts.length>4)this.receipts.shift().el.remove();
  }
  text(el,value){if(el.textContent!==value)el.textContent=value;}
  update(){
    const time=this.now(),dt=Math.max(0,Math.min(.1,time-(this.lastTime??time))),s=this.ctx.systems,p=s.get('player'),pr=s.get('progress');
    this.lastTime=time;
    for(let i=this.receipts.length-1;i>=0;i--)if(time>this.receipts[i].until){this.receipts[i].el.remove();this.receipts.splice(i,1);}
    if(pr){const d=pr.save.data,L=pr.level,from=xpForLevel(L),span=Math.max(1,xpForLevel(L+1)-from),here=Math.max(0,d.xp-from);
      this.text(this.money,(pr.cash()||0)+' COINS');this.text(this.xp,'LV '+L+' · '+Math.floor(here)+' / '+span+' XP');
      this.xpFill.style.width=Math.min(100,here/span*100).toFixed(1)+'%';
      this.text(this.carried,d.unbanked>0?Math.floor(d.unbanked)+' UNBANKED · RESTORE A LIGHT':'XP BANKED');
    }
    if(p){const frac=Math.max(0,Math.min(1,p.hp/p.hpMax));
      if(p.hp<this.lastHp)this.trailAt=time+.7;
      if(frac>this.trail)this.trail=frac;else if(time>this.trailAt)this.trail=Math.max(frac,this.trail-dt*.72);
      this.lastHp=p.hp;this.text(this.hp,'HEALTH '+Math.ceil(Math.max(0,p.hp))+' / '+p.hpMax);
      this.hpFill.style.width=(frac*100).toFixed(1)+'%';this.hpTrail.style.width=(this.trail*100).toFixed(1)+'%';
      this.health.classList.toggle('hurt',time<this.hurtUntil);this.health.classList.toggle('low',frac<.3);
    }
    this.capture.hidden=!this.ctx.input.unlockedPlay;
    const car=s.get('car');const inCar=!!this.ctx.shared.inCar;this.condition.hidden=!inCar;
    if(car){const condition=Math.max(0,Math.round((1-car.wear)*100));
      this.text(this.condition,condition<=0?'ENGINE STOPPED · FIND A MECHANIC':'CAR CONDITION '+condition+'%');
      this.condition.style.color=condition<25?'#e2a087':'#a7b7c1';
      // WHEEL 3 'Nitro'. The meter exists only in the seat and only once the tank does —
      // car._nitroSeen is set the first step the perk answers, so a player without the node
      // never sees a gauge for a control they have not got.
      const tank=Math.max(0,Math.min(1,car.boost||0));
      this.nitro.hidden=!(inCar&&car._nitroSeen);
      if(!this.nitro.hidden){
        this.nitroFill.style.width=(tank*100).toFixed(1)+'%';
        this.nitro.classList.toggle('burn',!!car.boosting);
        this.nitro.classList.toggle('dry',tank<=0.001);
      }}
  }
  dispose(){this.off.forEach(f=>f?.());this.root.remove();}
}
