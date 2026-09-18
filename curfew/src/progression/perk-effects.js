// Signature perk behaviours stay beside their installers. All simulation work uses
// existing public system methods; no copied combat, healing or ammo implementation.
const system=(ctx,id)=>ctx?.systems?.get(id);
function state(ctx,id){
  const pr=system(ctx,'progress');if(!pr)return null;
  pr._abilityState??=Object.create(null);
  return pr._abilityState[id]??=( {cooldown:0,wasOn:false,wasIn:false,said:0,at:-1e9,k:0} );
}
// ONE TELL FOR EVERY PERK. 2026-09-18, Alex: "i don't notice most of the perks i get in game
// having an effect." A perk acting used to sound exactly like picking up XP. Now each branch
// has its own pitch on the same soft chime, and hud.js rings the reticle in the branch's tint
// (nodes.js BRANCHES), so after a few he knows 'that was the torch' without reading. A QUIET
// tell (tell() below) is the ring and a softer chime with no words at all: used for the
// perks that act continuously or for a beat too small to be worth a line.
// The payload is a FRESH object per emit on purpose: it is an event, not a frame, and
// tests/perk-signatures.mjs keeps payload references and counts them afterwards.
const CHIME_RATE=Object.freeze({legs:1.0,hands:1.12,lamp:1.26,quiet:0.9,blood:0.8});
function feedback(ctx,id,name,detail,quiet){
  const p=system(ctx,'player');if(!p?.pos)return;
  const branch=id.slice(0,id.indexOf('_'));
  ctx.bus?.emit('perk:triggered',{id,branch,name,detail,quiet:!!quiet,x:p.pos.x,y:p.pos.y,z:p.pos.z});
  const pr=system(ctx,'progress');pr?._chimeUI?.('xp_gain',CHIME_RATE[branch]||1.12,quiet?.10:.18);
}
export function tell(ctx,id){feedback(ctx,id,'','',true);}
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
// lamp_4 'Flashburn'. 2026-09-18: the throw was repel(8, 1.4, 5) with no options, which the
// enemies lane's grounded-stagger damping eats inside half a metre ("it read as nothing
// happened", enemies.js). It goes AIRBORNE now like Fight Back, a real hop of a few metres.
// 'Ready' was invisible because the heat surge fired on every switch-on; nodes.js now asks
// flashReady() first, so the surge IS the charge, and the recharge ends on a soft lamp chime.
const FLASH_OPTS=Object.freeze({airborne:true});
const FLASH_R=8;             // metres
const FLASH_S=1.6;           // seconds of stagger
const FLASH_F=8;             // m/s away from you
const FLASH_CD=12;           // seconds
const FLASH_SURGE_S=1.6;     // nodes.js HIGH_BEAM.seconds: the surge that follows a throw
export function flashlamp(ctx,dt){
  const s=state(ctx,'lamp_4'),p=system(ctx,'player'),lights=system(ctx,'lights');if(!s)return;
  const was=s.cooldown;s.cooldown=Math.max(0,s.cooldown-dt);
  if(was>0&&s.cooldown===0&&ctx.playing&&!ctx.paused)tell(ctx,'lamp_4');
  const on=!!lights?.torchOn?.(),rising=on&&!s.wasOn;s.wasOn=on;
  if(!rising||s.cooldown>0||!ctx.playing||ctx.paused||!p||p.dead||ctx.shared?.inCar||lights?.torchFaulted?.())return;
  const n=system(ctx,'enemies')?.repel?.(p.pos.x,p.pos.z,FLASH_R,FLASH_S,FLASH_F,FLASH_OPTS)||0;
  if(n<=0)return;s.cooldown=FLASH_CD;
  feedback(ctx,'lamp_4','FLASHBURN',n===1?'1 THROWN BACK':n+' THROWN BACK');
  // D3: SEEN. It was intensity 5 for 0.14 s at the eye, which the torch's own high beam
  // (2x heat for 1.6 s) swallowed whole. 18 for a quarter second, just ahead of the eye so
  // the ball of light in the fog sits in front of the beam, not behind the camera.
  const fx=system(ctx,'fx');fx?.flash?.(p.pos.x,p.pos.y+1.35,p.pos.z,0xffdfa7,18,.25);
  system(ctx,'camera')?.addPunch?.(-1.2,0,0);
}
/** True while the flash is charged, or for the surge's length right after it fired. */
export function flashReady(ctx){
  const s=state(ctx,'lamp_4');
  return !s||s.cooldown<=0||s.cooldown>FLASH_CD-FLASH_SURGE_S;
}

// legs_1 'Drop-roll'. The roll itself is controller.js's (a landing with crouch held costs
// nothing); what was missing is any sign of it. The view tucks and rolls, alternating sides.
// A word appears only when the roll really saved health, or once in 90 s when he took a fall
// the perk would have saved and was not holding crouch: that is the one moment the
// instruction is worth printing.
const DROP_FREE=16;          // controller.js FALL_FREE: a landing below it never hurt
export function dropRollLand(ctx,pl){
  const p=system(ctx,'player'),pr=system(ctx,'progress'),s=state(ctx,'legs_1');
  if(!p||p.dead||!pl||!s)return;
  const v=+pl.speed||0,from=(pr&&pr.stats&&pr.stats.dropRollFromM)||9;
  if(v<=from)return;
  if(p.crouchHeld){
    s.k^=1;system(ctx,'camera')?.addPunch?.(3.2,0,s.k?4.5:-4.5);
    if(v>DROP_FREE)feedback(ctx,'legs_1','DROP-ROLL','NO DAMAGE');else tell(ctx,'legs_1');
  }else if(v>DROP_FREE){
    const t=ctx.time?.t??0;
    if(t-s.at>=90){s.at=t;feedback(ctx,'legs_1','DROP-ROLL','HOLD C AS YOU LAND');}
  }
}
// legs_3 'Cut'. There is no hard-sprint gauge, so the card's longer sprint is told the moment
// it passes the base 4 s and keeps going: a soft legs chime, the ring, a small lift of the view.
export function cutStep(ctx){
  const p=system(ctx,'player'),s=state(ctx,'legs_3');if(!p||!s)return;
  const base=(ctx.cfg&&ctx.cfg.player&&ctx.cfg.player.tacSprint&&ctx.cfg.player.tacSprint.time)||4;
  const over=!!p.tacSprinting&&p.tacT>=base;
  if(over&&!s.wasOn&&ctx.playing&&!ctx.paused){tell(ctx,'legs_3');system(ctx,'camera')?.addPunch?.(-.6,0,0);}
  s.wasOn=over;
}

// lamp_2 'Eyeshine' and lamp_3 'Cold Light' made visible. Eyeshine's only effect used to be the
// Pale freezing from further out; no eye ever changed. Cold Light slowed a body with no mark on
// it. Both now draw on the bodies the beam is REALLY catching (enemies.js litSelf, the same
// test the slow reads), through the pooled fx particles: no light, no material, no program.
// The spark sits on the body's own eye mesh (its bounding-sphere centre through matrixWorld),
// so nothing floats; no THREE import, because this file must load without a renderer.
const _E={fx:null,mode:0,px:0,pz:0,x:0,y:0,z:0,ax:0,ay:0,az:0,k:1};
function eyeWorld(e){
  const b=e.built,m=b&&b.parts&&b.parts.eyeMesh;if(!m||!b.group||!b.group.visible)return false;
  const g=m.geometry;if(!g)return false;if(!g.boundingSphere&&g.computeBoundingSphere)g.computeBoundingSphere();
  const bs=g.boundingSphere;if(!bs)return false;
  // The body was posed in present(); its world matrix is otherwise only brought up to date by
  // the next render. Walk the parents now (a few matrix products, nothing allocated).
  if(m.updateWorldMatrix)m.updateWorldMatrix(true,false);
  const c=bs.center,el=m.matrixWorld.elements,r=bs.radius*.55;
  _E.x=el[0]*c.x+el[4]*c.y+el[8]*c.z+el[12];_E.y=el[1]*c.x+el[5]*c.y+el[9]*c.z+el[13];_E.z=el[2]*c.x+el[6]*c.y+el[10]*c.z+el[14];
  _E.ax=el[0]*r;_E.ay=el[1]*r;_E.az=el[2]*r;
  // Never a spark away from the body it belongs to (a rig not yet in the scene has no parent).
  return Math.abs(_E.x-e.pos.x)<3&&Math.abs(_E.z-e.pos.z)<3;
}
const EYESHINE_NEAR=12;      // metres: a close face with sparks on it reads as jewellery
const EYESHINE_FAR=46;       // enemies.js: litSelf reaches 18 m x 2.5 with the card
const COLD_LIGHT_R=14;       // enemies.js LIT_SLOW_R: the slow acts inside this, so the frost does
function _lampBody(e){
  if(!e||e.neutral||e.initiallyNeutral||!e.litSelf||!e.pos||e.state==='dormant'||e.state==='corpse'||e.state==='rise')return;
  // The distance is measured here: a far body's perception (litSelf, dist) is not refreshed
  // every step, so a stale 'lit' on something across the county must not draw.
  const fx=_E.fx,d=Math.hypot(e.pos.x-_E.px,e.pos.z-_E.pz);
  if(_E.mode===0){
    if(d<EYESHINE_NEAR||d>EYESHINE_FAR||!eyeWorld(e))return;
    // Sized with distance so the pair reads about the same few pixels at 15 m and at 45 m.
    const sz=.02+d*.004;
    fx.spawnParticle(_E.x+_E.ax,_E.y+_E.ay,_E.z+_E.az,0,0,0,.16,sz,2.6,1.5,.6,0,0,1);
    fx.spawnParticle(_E.x-_E.ax,_E.y-_E.ay,_E.z-_E.az,0,0,0,.16,sz,2.6,1.5,.6,0,0,1);
  }else{
    if(!e.def||e.def.owner!=='pressure'||d>=COLD_LIGHT_R||!eyeWorld(e))return;
    // A breath, not an orb: two small, dim motes that rise and drift apart and are gone in a
    // second. Additive and unlit, so anything larger or brighter reads as a ball in the air.
    _E.k=-_E.k;
    fx.spawnParticle(_E.x,_E.y+.04,_E.z,.05*_E.k,.26,.03,.9,.05,.36,.46,.60,0,1.4,.28);
    fx.spawnParticle(_E.x,_E.y+.08,_E.z,-.04*_E.k,.20,-.03,.7,.04,.36,.46,.60,0,1.4,.22);
  }
}
function lampBodies(ctx,dt,id,mode,every){
  const s=state(ctx,id);if(!s)return;
  s.cooldown-=dt;if(s.cooldown>0)return;s.cooldown=every;
  if(!ctx.playing||ctx.paused||ctx.shared?.inCar)return;
  const lights=system(ctx,'lights'),fx=system(ctx,'fx'),en=system(ctx,'enemies'),p=system(ctx,'player');
  if(!lights?.torchOn?.()||!fx?.spawnParticle||!en?.forEachAlive||!p?.pos)return;
  _E.fx=fx;_E.mode=mode;_E.px=p.pos.x;_E.pz=p.pos.z;en.forEachAlive(_lampBody);_E.fx=null;
}
export function eyeshineStep(ctx,dt){lampBodies(ctx,dt,'lamp_2',0,.1);}
export function coldLightStep(ctx,dt){lampBodies(ctx,dt,'lamp_3',1,.25);}

// quiet_2 'Cold Barrel' and quiet_4 'Unheard'. Noise is invisible by design; what can be told
// is the result. After a shot that would have been heard, count the unaware pressure bodies
// that were inside the old radius and outside the new one, and say how many, at most once in
// 10 s and only when there was someone. Module-level callback, so the loop allocates nothing.
const _Q={x:0,z:0,lo2:0,hi2:0,n:0};
function _countDeaf(e){
  if(!e||e.neutral||e.initiallyNeutral||e.aware>0||!e.pos||!e.def||e.def.owner!=='pressure')return;
  const dx=e.pos.x-_Q.x,dz=e.pos.z-_Q.z,d2=dx*dx+dz*dz;
  if(d2>_Q.lo2&&d2<=_Q.hi2)_Q.n++;
}
const UNHEARD_SAID_S=10;
export function unheardShot(ctx,id,name,from,to){
  if(!(from>to))return;
  const s=state(ctx,id),t=ctx.time?.t??0;if(!s||t-s.at<UNHEARD_SAID_S)return;
  const p=system(ctx,'player'),en=system(ctx,'enemies');if(!p?.pos||!en?.forEachAlive)return;
  _Q.x=p.pos.x;_Q.z=p.pos.z;_Q.lo2=to*to;_Q.hi2=from*from;_Q.n=0;
  en.forEachAlive(_countDeaf);
  if(_Q.n<=0)return;
  s.at=t;feedback(ctx,id,name,_Q.n===1?'1 DID NOT HEAR IT':_Q.n+' DID NOT HEAR IT');
}
