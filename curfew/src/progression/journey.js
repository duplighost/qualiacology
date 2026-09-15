import {BOSSES,bossMapPoint} from '../world/boss-catalog.js';
import {carriesMorning,readLastNight} from '../world/late-bell-state.js';

// Read the real systems. This is a reminder, never a second progression/save owner.
export function journeyState(ctx){
 const get=id=>ctx.systems.get(id),p=get('progress'),player=get('player'),refuge=get('refuge');
 const data=p?.save?.data||{},flags=data.worldFlags||{};
 // THE ELEVEN REWIRE: one source of truth, and it is the kill. A weapon finish comes out of
 // a sealed case now and says nothing about who is dead. Bell eligibility reads the same
 // list as LateBell does.
 const marks=BOSSES.filter(b=>p?.bossCleared?.(b.id)).length;
 const morningReady=carriesMorning(data.bossesCleared),lastNight=readLastNight(flags['morning:late-bell']);
 const nearStart=!!player?.pos&&Math.hypot(player.pos.x+520,player.pos.z-240)<105;
 const lamps=get('dusk-to-dawn'),lamp=lamps?.poles?.find(p=>p.opening),bulbs=lamps?.bulbs?.()||0;
 let next='Find the Eleven. Each one leaves a part on the car.',target=null;
 if(lastNight?.complete)next='Morning has returned.';
 else if(lastNight){next='The bell has rung. Drive east to Morning.';target=get('places')?.nodes?.get('morning')?.def;}
 else if(morningReady){next='Bring the car to the priory tower. Ring the day bell in the Black Hour.';target=get('places')?.nodes?.get('bell-tower')?.def;}
 else if(nearStart&&!flags['supply:opening:first-light']&&!refuge?.power){next='Open the brass-latched chest in the station yard.';target={x:-513,z:246};}
 else if(nearStart&&!refuge?.power){next='Follow the yellow cable. Restore the station power.';target=refuge&&{x:refuge.breakerWX,z:refuge.breakerWZ};}
 else if(nearStart&&!flags['journey:rested']&&!flags['opening:slept']){next='The station is lit. Shut the shelter door and rest.';target={x:-530.5,z:240.5};}
 else if(nearStart&&lamp&&!lamp.relit){
  if(bulbs>0){next='Use your spare bulb at the dark road lamp.';target={x:lamp.x,z:lamp.z};}
  else if(!flags['supply:opening:first-light']){next='Open the brass-latched chest in the station yard for a spare bulb.';target={x:-513,z:246};}
  else{next='Find a bulb at a dealer or in the Holdfast.';target={x:0,z:90};}
 }
 else if(!flags['gate:holdfast']){next='Follow the road to the Holdfast.';target={x:0,z:90};}
 else {
  const rumours=p?.rumours?.()||data.rumours||[];
  const unfinished=BOSSES.filter(b=>!p?.bossCleared?.(b.id));
  const known=unfinished.filter(b=>rumours.some(r=>r.id===b.id));
  const list=known.length?known:unfinished;
  const nextBoss=list.slice().sort((a,b)=>{const x=bossMapPoint(a),y=bossMapPoint(b),pos=player?.pos||{x:0,z:0};return Math.hypot(pos.x-x.x,pos.z-x.z)-Math.hypot(pos.x-y.x,pos.z-y.z);})[0];
  if(nextBoss){target=bossMapPoint(nextBoss);if(nextBoss.id==='underkeep')target={x:45,z:-43};next='Find '+nextBoss.name+' · '+nextBoss.location+'.';}
  else next='Ask the Holdfast residents about the Eleven.';
 }
 // Underground distance is measured to the local stair, never to a surface pin
 // thousands of metres away in the room's separate rendering space.
 if(get('boss-sites')?.inside){const kept=get('boss-encounters')?.all?.find(k=>k.id==='underkeep');if(kept?.alive){next='The Kept · Beneath the Holdfast.';target={x:kept.pos.x,z:kept.pos.z};}else{next='Return up the stair to the Holdfast.';target={x:3500,z:3540.3};}}
 const rows=[
  {icon:'◇',title:'Scavenge and fight',text:'Supplies and enemies give coins and XP.'},
  {icon:'☼',title:'Make a road home',text:'Coins buy bulbs, woodland light and equipment. Light holds ordinary threats back.'},
  {icon:'⌂',title:'Return to safety',text:'Restore power, shut the refuge door and rest. Bank carried XP, heal and choose perks.'},
  {icon:'◈',title:`The Eleven · ${marks} / ${BOSSES.length}`,text:'Each of the Eleven leaves a part on the car. Bring the whole car to the day bell.'},
  {icon:'♧',title:'The day bell',text:lastNight?.complete?'Morning has returned.':lastNight?'The bell has rung. Drive east to Morning.':morningReady?'Bring your car to the priory tower in the Black Hour. Then drive east to Morning.':'The final journey begins after the Eleven. Your route will be kept here.'},
 ];
 return{marks,total:BOSSES.length,next,target,rows};
}
