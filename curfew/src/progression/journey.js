import {BOSSES} from '../world/boss-catalog.js';
import {carriesMorning,readLastNight} from '../world/late-bell-state.js';

// Read the real systems. This is a reminder, never a second progression/save owner.
export function journeyState(ctx){
 const get=id=>ctx.systems.get(id),p=get('progress'),player=get('player'),refuge=get('refuge');
 const data=p?.save?.data||{},flags=data.worldFlags||{},finishes=new Set(data.finishes||[]);
 // An earned finish is also proof of its mark in saves made before the explicit
 // cleared list. Bell eligibility uses the same saved finishes as LateBell.
 const marks=BOSSES.filter(b=>p?.bossCleared?.(b.id)||finishes.has(b.skin.id)).length;
 const morningReady=carriesMorning(data.finishes),lastNight=readLastNight(flags['morning:late-bell']);
 const nearStart=!!player?.pos&&Math.hypot(player.pos.x+520,player.pos.z-240)<105;
 const lamps=get('dusk-to-dawn'),lamp=lamps?.poles?.find(p=>p.opening),bulbs=lamps?.bulbs?.()||0;
 let next='Find the Eleven. Their marks lead to the day bell.',target=null;
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
 else if(marks===0)next='Ask the Holdfast residents about the Eleven.';
 const rows=[
  {icon:'◇',title:'Scavenge and fight',text:'Supplies and enemies give coins and XP.'},
  {icon:'☼',title:'Make a road home',text:'Coins buy bulbs, woodland light and equipment. Light holds ordinary threats back.'},
  {icon:'⌂',title:'Return to safety',text:'Restore power, shut the refuge door and rest. Bank carried XP, heal and choose perks.'},
  {icon:'◈',title:`The Eleven · ${marks} / ${BOSSES.length}`,text:'Each boss leaves a permanent mark and a weapon finish. Bring all eleven to the day bell.'},
  {icon:'♧',title:'The day bell',text:lastNight?.complete?'Morning has returned.':lastNight?'The bell has rung. Drive east to Morning.':morningReady?'Bring your car to the priory tower in the Black Hour. Then drive east to Morning.':'The final journey begins after the Eleven. Your route will be kept here.'},
 ];
 return{marks,total:BOSSES.length,next,target,rows};
}
