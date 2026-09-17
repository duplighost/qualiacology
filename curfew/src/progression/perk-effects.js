// Signature perk behaviours stay beside their installers. All simulation work uses
// existing public system methods; no copied combat, healing or ammo implementation.
const system=(ctx,id)=>ctx?.systems?.get(id);
function state(ctx,id){
  const pr=system(ctx,'progress');if(!pr)return null;
  pr._abilityState??=Object.create(null);
  return pr._abilityState[id]??=( {cooldown:0,wasOn:false,wasIn:false,said:0} );
}
function feedback(ctx,id,name,detail){
  const p=system(ctx,'player');if(!p?.pos)return;
  ctx.bus?.emit('perk:triggered',{id,name,detail,x:p.pos.x,y:p.pos.y,z:p.pos.z});
  const pr=system(ctx,'progress');pr?._chimeUI?.('xp_gain',1.12,.18);
}
// D3: legs_2 is 'Runner' now; 'Second Wind' is Iron's phrase. legs_4 (Wind) refills on a hard
// landing through the same function and gets its own name on the receipt.
export function refillSprint(ctx,id='legs_2'){
  const p=system(ctx,'player');if(!p||p.dead||ctx.shared?.inCar)return;
  if(!(p.tacT>.5||p.tacCooldown>0))return;
  p.tacT=0;p.tacCooldown=0;
  feedback(ctx,id,id==='legs_4'?'WIND':'RUNNER','SPRINT READY');
}
// D3: the WHOLE magazine. recoverRound(n) clamps to def.mag - ammo and mints nothing, so
// asking for the magazine size is asking for "fill it".
export function returnHeadshotRound(ctx,payload){
  if((payload?.zone||payload?.e?.lastZone)!=='head'||payload?.melee||payload?.kind==='melee')return;
  const w=system(ctx,'weapons');
  const mag=Math.max(1,(w?.def?.mag|0)||1);
  const got=w?.recoverRound?.(mag)||0;
  if(got>0)feedback(ctx,'hands_2','LAST ROUND','HEADSHOT · MAGAZINE FULL');
}
export function bloodPrice(ctx){
  const p=system(ctx,'player');if(!p||p.dead||p.hp<=0)return;
  const before=p.hp;p.heal?.(12);
  if(p.sinceHurt<ctx.cfg.player.health.regenDelay)p.sinceHurt=ctx.cfg.player.health.regenDelay;
  if(p.hp>before)feedback(ctx,'blood_3','BLOOD PRICE','+'+Math.round(p.hp-before)+' HEALTH');
}
// D3 / C5. The shove is a THROW: 6 m radius, 1.6 s stagger, force 9, and `airborne` so the
// enemies lane's grounded-stagger damping (rate 8, which ate a force-4 push inside half a
// metre) does not touch it. 12 s recharge, down from 25, because a reflex you see twice a
// fight is one you learn to count on. Frozen at module scope: onHurt is an event, but the
// options object must never be built on the hot path either.
const FIGHT_BACK_OPTS=Object.freeze({airborne:true});
const FIGHT_BACK_R=6;        // metres
const FIGHT_BACK_S=1.6;      // seconds of stagger
const FIGHT_BACK_F=9;        // m/s away from you
const FIGHT_BACK_CD=12;      // seconds
export function panicGuard(ctx){
  const p=system(ctx,'player'),s=state(ctx,'blood_2');if(!s||!p||p.dead||p.hp<=0||p.hp>p.hpMax*.35||s.cooldown>0||ctx.shared?.inCar)return;
  const n=system(ctx,'enemies')?.repel?.(p.pos.x,p.pos.z,FIGHT_BACK_R,FIGHT_BACK_S,FIGHT_BACK_F,FIGHT_BACK_OPTS)||0;
  if(n<=0)return;s.cooldown=FIGHT_BACK_CD;
  feedback(ctx,'blood_2','FIGHT BACK','THROWN BACK');
  // Seen and felt: a hot flash at chest height (sanctuaries light a crown at 26; a muzzle is
  // far less) and a short camera punch, pitch up and a little roll, the shape of a shove.
  const fx=system(ctx,'fx');fx?.flash?.(p.pos.x,p.pos.y+1.2,p.pos.z,0xffb08a,14,.16);fx?.addTrauma?.(.22);
  system(ctx,'camera')?.addPunch?.(-2.4,0,1.6);
}
export function tickPanic(ctx,dt){const s=state(ctx,'blood_2');if(s)s.cooldown=Math.max(0,s.cooldown-dt);}
export function flashlamp(ctx,dt){
  const s=state(ctx,'lamp_4'),p=system(ctx,'player'),lights=system(ctx,'lights');if(!s)return;
  s.cooldown=Math.max(0,s.cooldown-dt);
  const on=!!lights?.torchOn?.(),rising=on&&!s.wasOn;s.wasOn=on;
  if(!rising||s.cooldown>0||!ctx.playing||ctx.paused||!p||p.dead||ctx.shared?.inCar||lights?.torchFaulted?.())return;
  const n=system(ctx,'enemies')?.repel?.(p.pos.x,p.pos.z,8,1.4,5)||0;
  if(n<=0)return;s.cooldown=12;
  feedback(ctx,'lamp_4','FLASHBURN','THEY RECOIL');
  // D3: SEEN. It was intensity 5 for 0.14 s at the eye, which the torch's own high beam
  // (2x heat for 1.6 s) swallowed whole. 18 for a quarter second, just ahead of the eye so
  // the ball of light in the fog sits in front of the beam, not behind the camera.
  const fx=system(ctx,'fx');fx?.flash?.(p.pos.x,p.pos.y+1.35,p.pos.z,0xffdfa7,18,.25);
}
// D3: quiet_3 'Slip'. Every pursuer that cannot see you loses the trail (loseTrail beyond 0
// = all of them; it refuses anything with line of sight and every horror species itself),
// and it SAYS so, once — the place:near heartbeat repeats and a body that flickers aware
// without eyes on you would otherwise print a receipt a step. 6 s between receipts.
const SLIP_SAID_S=6;
export function slipAt(ctx,x,z){
  const s=state(ctx,'quiet_3'),p=system(ctx,'player'),en=system(ctx,'enemies');if(!s||!p?.pos)return 0;
  const px=Number.isFinite(x)?x:p.pos.x,pz=Number.isFinite(z)?z:p.pos.z;
  const n=en?.loseTrail?.(px,pz,0)||0;
  if(n<=0)return 0;
  if(s.said<=0){s.said=SLIP_SAID_S;feedback(ctx,'quiet_3','SLIP','TRAIL LOST');}
  return n;
}
// The car edge. car:entered is a bus event and a hook cannot subscribe to the bus, so the
// seat is watched here the way flashlamp watches the torch: ctx.shared.inCar rising.
export function slipStep(ctx,dt){
  const s=state(ctx,'quiet_3');if(!s)return;
  s.said=Math.max(0,s.said-dt);
  const inCar=!!ctx.shared?.inCar,rising=inCar&&!s.wasIn;s.wasIn=inCar;
  if(!rising||!ctx.playing||ctx.paused)return;
  slipAt(ctx,NaN,NaN);
}
