import {xpForLevel} from '../progression/nodes.js';
import {MAJOR_BY_ID} from '../world/placedata.js';

const clamp01=v=>v<0?0:v>1?1:v;
// C1. ONE string for every counted fight, destinations and hamlet sieges alike. Alex,
// 2026-09-18: "we should say 0/x enemies defeated somewhere during the events."
const ENEMIES_DEFEATED=' ENEMIES DEFEATED';

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
/* BLOOD 1 'Mend', and everyone: the notch is where health stops coming back on its own (40,
   or 70 with Mend). Buying Mend moves it, which is the tell. It shimmers while regen is
   climbing toward it, and the bar warms for a moment when a kill pays health back. */
#curfew-readouts .health .ceil{left:40%;width:2px;margin-left:-1px;background:rgba(236,242,238,.55)}
@keyframes curfew-mend{0%,100%{filter:none}50%{filter:brightness(1.35)}}
#curfew-readouts .health.mending .now{animation:curfew-mend 1.2s ease-in-out infinite}
#curfew-readouts .health.gain{border-color:#d98476}
#curfew-readouts .health.gain .now{background:#e6c9bf}
#curfew-readouts .health.hurt{color:#f1b8a9;border-color:#c66856}
#curfew-readouts .health.hurt .now,#curfew-readouts .health.low .now{background:#bd6554}
#curfew-readouts .receipts{position:fixed;right:30px;bottom:126px;display:flex;align-items:flex-end;flex-direction:column;gap:5px}
#curfew-readouts .receipt{padding:6px 11px;background:rgba(5,9,13,.82);border-right:2px solid currentColor;color:#95d2d6;font-size:14px}
#curfew-readouts .receipt.cash{color:#e9c785}
/* A perk's receipt is in its branch's tint, the same colour as the ring at the sight. */
#curfew-readouts .receipt.b-legs{color:#9fb4d8}#curfew-readouts .receipt.b-hands{color:#d8c07a}#curfew-readouts .receipt.b-lamp{color:#f0dca8}#curfew-readouts .receipt.b-quiet{color:#8ec4c8}#curfew-readouts .receipt.b-blood{color:#d98476}
/* THE OBJECTIVE. The place's name, then one line. While a counted fight is on (C1), the line
   is the count, warm and larger, and it glows for a beat on every kill. */
#curfew-readouts .objective{margin-top:12px;line-height:1.65;color:#e9d6ac;white-space:pre-line}
#curfew-readouts .objective .ol{transition:text-shadow .3s}
#curfew-readouts .objective.count .ol{font-size:13px;color:#f1c187;letter-spacing:.04em}
#curfew-readouts .objective.count .ol.tick{text-shadow:0 0 8px #f1c187aa;transition:none}
/* A CAR PART SAYS WHAT IT DOES. Alex, 2026-09-16: "I never know what my car part does when i
   get it. it should tell you." One of the Eleven dies and a permanent part goes on the car;
   the receipt used to read "STEEL SHELL · FITTED" and the sentence explaining it was sitting
   unread on the event payload. The name stays the loud line and the sentence goes under it. */
#curfew-readouts .receipt.part{color:#e9c785;max-width:330px;text-align:right}
#curfew-readouts .receipt.part b{display:block;font-weight:400;font-size:15px;letter-spacing:.06em}
#curfew-readouts .receipt.part i{display:block;font-style:normal;font-size:11px;line-height:1.5;color:#b9c3bd;margin-top:5px}
/* THE LEVEL. Alex, 2026-09-15: "leveling up kind of makes a sound and you can see it better?
   we should do that." It was a 14 px line the same size as a coin pickup, gone in 3.2 s, for
   the one event in the game that grows the tree. Bigger, gold, its own rule top and bottom,
   and it arrives with a short rise so the eye catches the movement rather than the text. */
#curfew-readouts .receipt.level{color:#f0cf8a;font-size:19px;letter-spacing:.09em;padding:10px 16px;
  background:rgba(8,12,17,.92);border-right:3px solid currentColor;border-top:1px solid #f0cf8a55;
  border-bottom:1px solid #f0cf8a55;animation:curfew-level .42s ease-out both}
@keyframes curfew-level{from{opacity:0;transform:translateY(9px) scale(.96)}to{opacity:1;transform:none}}
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
</style><div class="economy"><div class="money"></div><div class="xp small"></div><div class="track"><i></i></div><div class="carried small"></div></div><div class="health"><div class="value"></div><div class="track"><i class="lost"></i><i class="now"></i><i class="ceil"></i></div></div><div class="receipts" role="status" aria-live="polite"></div><div class="nitro" hidden><div class="track"><i></i></div></div><div class="capture" hidden>CLICK TO CAPTURE MOUSE</div>`;
    parent.appendChild(this.root);
    this.condition=document.createElement('div');this.condition.className='small';this.condition.hidden=true;
    this.root.querySelector('.economy').appendChild(this.condition);
    this.objective=document.createElement('div');this.objective.className='small objective';this.root.querySelector('.economy').appendChild(this.objective);
    this.objName=document.createElement('div');this.objName.className='on';this.objLine=document.createElement('div');this.objLine.className='ol';this.objective.append(this.objName,this.objLine);
    this._countUi=false;this._tickAt=-1;this._ck=-1;this._ct=-1;this._cs='';this._ceilF=-1;this.gainUntil=0;this._throughAt=-1e9;this._hamletKeys=Object.create(null);
    this.waypoint=document.createElement('div');this.waypoint.className='small';this.waypoint.style.cssText='margin:0 0 8px;color:#f1c187;line-height:1.5';this.waypoint.hidden=true;this.root.querySelector('.economy').prepend(this.waypoint);
    for(const [key,selector] of Object.entries({money:'.money',xp:'.xp',xpFill:'.economy i',carried:'.carried',health:'.health',hp:'.value',hpFill:'.now',hpTrail:'.lost',hpCeil:'.health .ceil',list:'.receipts',nitro:'.nitro',nitroFill:'.nitro i',capture:'.capture'}))this[key]=this.root.querySelector(selector);
    const on=(event,fn)=>this.off.push(ctx.bus.on(event,fn));
    on('cash:gained',p=>this.receipt('+'+p.amount+' COINS','cash'));
    on('cash:spent',p=>this.receipt('−'+p.amount+' COINS','cash'));
    on('xp:gained',p=>{if(p.reason!=='road')this.receipt('+'+p.amount+' XP','xp',p.amount);});
    on('xp:banked',p=>this.receipt(p.amount+' XP BANKED','bank'));
    on('level:up',p=>{this.receipt('LEVEL '+p.level+' · SKILL POINT','level');this.receipts.at(-1).until=this.now()+7;});
    on('loot:searched',p=>{if(!p.coins)this.receipt('EMPTY POCKETS','empty');});
    on('car:repaired',()=>this.receipt('CAR RESTORED · 100%','repair'));
    on('car:failed',()=>{if(this.ctx.shared.inCar)this.receipt('ENGINE DEAD','empty');});
    on('node:bought',p=>{if(!p.auto)this.receipt(p.name||'ABILITY LEARNED','ability');});
    on('garage:bought',p=>{
      this.receipt((p.name||'UPGRADE')+' · FITTED ON THE CAR','part',0,p.line||'');
      this.receipts.at(-1).until=this.now()+9;
    });
    // D3/D4 receipts ride this one channel: 'SLIP · TRAIL LOST', 'FIGHT BACK · THROWN BACK',
    // 'LAST ROUND · HEADSHOT · MAGAZINE FULL'. The one exception in shape is the max-health
    // grant (progress.grantHpMax, id 'hpmax', name 'MAX HEALTH', detail '+10'), which reads
    // as a number first: '+10 MAX HEALTH', the way '+12 HEALTH' and '+N COINS' already do.
    // 2026-09-18: a QUIET tell (perk-effects tell()) is the ring and the chime with no words;
    // everything else is tinted by its branch. A blood perk also warms the health bar.
    on('perk:triggered',p=>{
      const br=p.branch||(p.id==='hpmax'?'blood':'');
      if(br==='blood')this.gainUntil=this.now()+.6;
      if(p.quiet)return;
      this.receipt(p.id==='hpmax'&&p.detail?p.detail+' '+p.name:p.name+(p.detail?' · '+p.detail:''),br?'ability b-'+br:'ability');
    });
    // HANDS 4 'Through'. Base penetration already throws exit sparks, so nothing tied a hit
    // behind cover to the card. weapon:hit fires per pellet, hence the 6 s limit.
    on('weapon:hit',p=>{
      if(!p||!p.enemy||!p.pen)return;
      if(!this.ctx.systems.get('progress')?.ownedSet?.()?.has?.('hands_4'))return;
      const t=this.now();if(t-this._throughAt<6)return;this._throughAt=t;
      this.receipt(p.killed?'THROUGH · KILLED BEHIND COVER':'THROUGH · HIT BEHIND COVER','ability b-hands');
    });
    // D3 hands_1 'Primed': the hit on the reload click. weapon.js emits the beat 'active' on
    // every hit (the window is base); the receipt is printed only when the node is owned,
    // which is when the hit means anything (progress.stats.primedMul above its base 1).
    on('weapon:reload',p=>{
      if(p?.name!=='active')return;
      const mul=this.ctx.systems.get('progress')?.stats?.primedMul;
      if(typeof mul==='number'&&mul>1)this.receipt('PRIMED','ability b-hands');
    });
    on('sanctuary:lit',()=>{this.receipt('THE WOODS ARE LIT · 96 M OF SAFE GROUND','light');this.receipts.at(-1).until=this.now()+6;});
    // Finding a crown is the only moment anything ever tells you a crown can be bought.
    on('sanctuary:found',()=>{this.receipt('A LANTERN CROWN · COINS AT ITS BOX LIGHT THE WOOD','light');this.receipts.at(-1).until=this.now()+7;});
    on('territory:secured',p=>this.receipt(p.name+' · SECURED','light'));
    // C1, the clear moment. The last counted body of a place is down: one receipt and one
    // soft, low chime (territory.js emits it once). The panel line turns to RESTORE POWER.
    on('territory:clear',p=>{this.receipt((p.name||'').toUpperCase()+' · CLEAR','light');this.receipts.at(-1).until=this.now()+5;this.ctx.systems.get('progress')?._chimeUI?.('xp_node',.75,.22);});
    // C2. A siege that ends one way or the other says so at the side as well as in the panel.
    on('hamlet:defended',p=>{this.receipt((p.name||'').toUpperCase()+' · HELD','light');this.receipts.at(-1).until=this.now()+5;});
    on('hamlet:siege-lost',p=>this.receipt((p.name||'').toUpperCase()+' · NOT HELD','empty'));
    on('refuge:puzzle',()=>this.receipt('NINE LIGHTS','light'));
    on('map:rumour',p=>{if(p.forgotten)return;this.receipt('MAP UPDATED · '+p.name+' · M','rumour');this.receipts.at(-1).until=this.now()+6.5;});
    on('map:waypoint',p=>this.receipt(p.cleared?'WAYPOINT CLEARED':'WAYPOINT SET · '+p.name,'rumour'));
    // THE ELEVEN REWIRE: a boss leaves a CAR PART, which arrives on 'garage:bought' just
    // above and is already receipted there. What a boss no longer leaves is a weapon
    // finish — that comes out of a sealed case, and this is it.
    on('finish:found',p=>{this.receipt((p.name||'A FINISH').toUpperCase()+' · WEAPON FINISH UNLOCKED','ability');this.receipts.at(-1).until=this.now()+8;});
    // p?.n, not p.n: weapons/weapon.js listens on this same channel and deliberately takes a
    // missing payload as nothing (`p ? ... : 0`). This one threw on it instead, inside the
    // fixed step — which is why tests/weapon.mjs aborted at (j) and the 60-odd checks after
    // it, the auto-reload sight and the swap curve, never ran at all.
    on('pickup:ammo',p=>{if(p?.n>0)this.receipt('+'+p.n+' AMMO','ammo');});
    on('player:hurt',()=>{this.hurtUntil=this.now()+.65;this.trailAt=this.now()+.7;});
    on('player:secondwind',()=>this.receipt('STILL STANDING','wind'));
  }
  now(){return this.ctx.time.t||0;}
  receipt(text,kind,amount=0,sub=''){
    const time=this.now(),last=this.receipts.at(-1);
    if(amount&&last?.kind===kind&&time-last.born<.45){last.amount+=amount;last.el.textContent='+'+last.amount+' XP';last.until=time+3.2;return;}
    const el=document.createElement('div');el.className='receipt '+kind;
    if(sub){const b=document.createElement('b');b.textContent=text;const i=document.createElement('i');i.textContent=sub;el.append(b,i);}
    else el.textContent=text;
    this.list.appendChild(el);
    this.receipts.push({el,kind,amount,born:time,until:time+3.2});
    if(this.receipts.length>4)this.receipts.shift().el.remove();
  }
  text(el,value){if(el.textContent!==value)el.textContent=value;}
  // Built only when the numbers change: update() runs every presented frame.
  _counter(k,t){if(k!==this._ck||t!==this._ct){this._ck=k;this._ct=t;this._cs=k+' / '+t+ENEMIES_DEFEATED;}return this._cs;}
  _hamletKey(id){return this._hamletKeys[id]??='hamlet-siege:'+id;}
  // The three hamlets: hamlet-defence's own list when it is running, else the data (a lit
  // major with nothing to claim that is not a hub, which is exactly those three).
  _isHamlet(id){
    const sites=this.ctx.systems.get('hamlet-defence')?.sites;
    if(Array.isArray(sites)){for(let i=0;i<sites.length;i++)if(sites[i].id===id)return true;return false;}
    const d=MAJOR_BY_ID[id];return !!d&&d.claim?.how==='none'&&d.lit===true&&!d.hub;
  }
  update(){
    const time=this.now(),dt=Math.max(0,Math.min(.1,time-(this.lastTime??time))),s=this.ctx.systems,p=s.get('player'),pr=s.get('progress');
    this.lastTime=time;
    const place=s.get('places'),territory=s.get('territory'),refuge=s.get('refuge');
    const row=place?.near?territory?.status(place.near):null;
    const sheltered=p&&refuge?.isProtected(p.pos.x,p.pos.y,p.pos.z);
    const waypoint=pr?.waypoint?.(),origin=this.ctx.shared.locationOverride||p?.pos;
    this.waypoint.hidden=!(waypoint&&origin);
    if(waypoint&&origin){const d=Math.hypot(waypoint.x-origin.x,waypoint.z-origin.z),distance=d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m';this.text(this.waypoint,'◆ '+waypoint.name+' · '+(this.ctx.shared.locationOverride?'SURFACE':d<14?'HERE':distance));}
    // C1 / C2. A live hamlet siege beats everything, wherever you are standing: its count is
    // the one thing you need until it is over (hamlet-defence readout(): null, a live siege,
    // or 8 s of the finished count after a win). A hamlet never says RESTORE POWER, because
    // there is nothing to claim there; it says HELD once its siege is won. A destination with
    // anything counted left standing shows the count; cleared, it says to restore the power.
    const siege=s.get('hamlet-defence')?.readout?.()||null;
    let name='',line='',count=false;
    if(siege&&(siege.live||siege.won)&&siege.total>0){name=siege.name||'';line=this._counter(siege.killed|0,siege.total|0);count=true;}
    else if(sheltered)line='DOOR SHUT · YOU CAN REST';
    else if(this.ctx.shared.sanctuary)line='THE WOODS ARE LIT';
    else if(row?.id==='holdfast'){name=row.name;line='INHABITED · TRADERS & SHELTER';}
    else if(row&&this._isHamlet(row.id)){name=row.name;line=pr?.flag?.(this._hamletKey(row.id))==='won'?'HELD':'';}
    else if(row){
      name=row.name;
      if(row.remaining>0){territory.track(row.id);line=this._counter(row.killed??(row.total-row.remaining),row.total);count=true;}
      else if(row.secured)line=refuge?._units?.some(u=>u.siteId===row.id)?'SECURED · CLOSE THE REFUGE DOOR':'SECURED';
      else line='CLEAR · RESTORE POWER';
    }
    if(count!==this._countUi){this._countUi=count;this.objective.classList.toggle('count',count);}
    if(count&&line!==this.objLine.textContent&&this.objLine.textContent)this._tickAt=time;
    const tick=count&&time-this._tickAt<.35;
    if(tick!==this.objLine.classList.contains('tick'))this.objLine.classList.toggle('tick',tick);
    this.text(this.objName,name);this.text(this.objLine,line);
    this.objName.hidden=!name;this.objLine.hidden=!line;this.objective.hidden=!name&&!line;
    for(let i=this.receipts.length-1;i>=0;i--)if(time>this.receipts[i].until){this.receipts[i].el.remove();this.receipts.splice(i,1);}
    if(pr){const d=pr.save.data,L=pr.level,from=xpForLevel(L),span=Math.max(1,xpForLevel(L+1)-from),here=Math.max(0,d.xp-from);
      this.text(this.money,(pr.cash()||0)+' COINS');this.text(this.xp,'LV '+L+' · '+Math.floor(here)+' / '+span+' XP');
      this.xpFill.style.width=Math.min(100,here/span*100).toFixed(1)+'%';
      this.text(this.carried,d.unbanked>0?Math.floor(d.unbanked)+' XP CARRIED · BANKS AT A LIGHT':'ALL XP BANKED');
    }
    if(p){const frac=Math.max(0,Math.min(1,p.hp/p.hpMax));
      if(p.hp<this.lastHp)this.trailAt=time+.7;
      if(frac>this.trail)this.trail=frac;else if(time>this.trailAt)this.trail=Math.max(frac,this.trail-dt*.72);
      this.lastHp=p.hp;this.text(this.hp,'HEALTH '+Math.ceil(Math.max(0,p.hp))+' / '+p.hpMax);
      this.hpFill.style.width=(frac*100).toFixed(1)+'%';this.hpTrail.style.width=(this.trail*100).toFixed(1)+'%';
      this.health.classList.toggle('hurt',time<this.hurtUntil);this.health.classList.toggle('low',frac<.3);
      const H=this.ctx.cfg?.player?.health||{max:100,regenCeiling:40,regenDelay:6};
      const cf=clamp01((pr?.stats?.regenCeiling??H.regenCeiling??40)/(H.max||100));
      if(cf!==this._ceilF){this._ceilF=cf;this.hpCeil.style.left=(cf*100).toFixed(1)+'%';}
      this.health.classList.toggle('mending',p.hp>0&&p.hp<cf*p.hpMax-.5&&(p.sinceHurt||0)>(H.regenDelay??6));
      this.health.classList.toggle('gain',time<this.gainUntil);
    }
    this.capture.hidden=!this.ctx.input.unlockedPlay;
    const car=s.get('car');const inCar=!!this.ctx.shared.inCar;
    // ROUND 18. Alex, 2026-09-09: "have it on the cars dashboard and not on the hud." The
    // line that used to read "CAR CONDITION 84%" here is now a NEEDLE on the binnacle's
    // left dial (vehicle/carbody.js setCondition, driven from car.js present()). The one
    // thing that still belongs on screen is the engine having actually stopped, because
    // that is a state the gauge's needle resting on its bottom stop cannot say out loud.
    this.condition.hidden=!(inCar&&car&&car.wear>=.999);
    if(car){
      if(!this.condition.hidden){
        this.text(this.condition,Math.abs(car.speed)>1.6?'ENGINE DEAD · SPACE TO STOP':'ENGINE DEAD · E GET OUT · USE GAS');
        this.condition.style.color='#e2a087';
      }
      // Nitro. The meter exists only in the seat and only once the tank does —
      // car._nitroSeen is set the first step the perk answers, so a player without the node
      // never sees a gauge for a control they have not got.
      const tank=Math.max(0,Math.min(1,car.boost||0));
      this.nitro.hidden=!(inCar&&car._nitroSeen&&car.wear<.999);
      if(!this.nitro.hidden){
        this.nitroFill.style.width=(tank*100).toFixed(1)+'%';
        this.nitro.classList.toggle('burn',!!car.boosting);
        this.nitro.classList.toggle('dry',tank<=0.001);
      }}
  }
  dispose(){this.off.forEach(f=>f?.());this.root.remove();}
}
