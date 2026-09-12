// Signature perk behaviours stay beside their installers. All simulation work uses
// existing public system methods; no copied combat, healing or ammo implementation.
const system=(ctx,id)=>ctx?.systems?.get(id);
function state(ctx,id){
  const pr=system(ctx,'progress');if(!pr)return null;
  pr._abilityState??=Object.create(null);
  return pr._abilityState[id]??=( {cooldown:0,wasOn:false} );
}
function feedback(ctx,id,name,detail){
  const p=system(ctx,'player');if(!p?.pos)return;
  ctx.bus?.emit('perk:triggered',{id,name,detail,x:p.pos.x,y:p.pos.y,z:p.pos.z});
  const pr=system(ctx,'progress');pr?._chimeUI?.('xp_gain',1.12,.18);
}
export function refillSprint(ctx,id='legs_2'){
  const p=system(ctx,'player');if(!p||p.dead||ctx.shared?.inCar)return;
  if(!(p.tacT>.5||p.tacCooldown>0))return;
  p.tacT=0;p.tacCooldown=0;
  feedback(ctx,id,'SECOND WIND','SPRINT READY');
}
export function returnHeadshotRound(ctx,payload){
  if((payload?.zone||payload?.e?.lastZone)!=='head'||payload?.melee||payload?.kind==='melee')return;
  const got=system(ctx,'weapons')?.recoverRound?.(1)||0;
  if(got>0)feedback(ctx,'hands_2','LAST ROUND','HEADSHOT · ROUND RETURNED');
}
export function bloodPrice(ctx){
  const p=system(ctx,'player');if(!p||p.dead||p.hp<=0)return;
  const before=p.hp;p.heal?.(12);
  if(p.sinceHurt<ctx.cfg.player.health.regenDelay)p.sinceHurt=ctx.cfg.player.health.regenDelay;
  if(p.hp>before)feedback(ctx,'blood_3','BLOOD PRICE','+'+Math.round(p.hp-before)+' HEALTH');
}
export function panicGuard(ctx){
  const p=system(ctx,'player'),s=state(ctx,'blood_2');if(!s||!p||p.dead||p.hp<=0||p.hp>p.hpMax*.35||s.cooldown>0||ctx.shared?.inCar)return;
  const n=system(ctx,'enemies')?.repel?.(p.pos.x,p.pos.z,4.5,1.0,4)||0;
  if(n<=0)return;s.cooldown=25;
  feedback(ctx,'blood_2','FIGHT BACK','ROOM TO BREATHE');
  system(ctx,'fx')?.addTrauma?.(.12);
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
  const fx=system(ctx,'fx');fx?.flash?.(p.pos.x,p.pos.y+1.35,p.pos.z,0xffdfa7,5,.14);
}
