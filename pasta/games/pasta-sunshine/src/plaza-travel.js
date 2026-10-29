import * as THREE from '../vendor/three.module.js';
import {AirstripPastaBatch as Batch,pastaCircle as circle,pastaBall as ball} from './airstrip-world.js';
import {plazaRayClear} from './plaza-visibility.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;
export const PLAZA_RETURN_POINTS=Object.freeze({
  bianco:[-16,3,13],ricco:[-42,3,28],gelato:[36,16/7,28],pinna:[-43,3,3],
  sirena:[-20,10,-3.5],noki:[9,3,-16],pianta:[6,22,-34.5],airstrip:[-42,3,28],
  corona:[0,3,-35],pachinko:[-33.5,3,9],lily:[0,3,39],slide:[28,3,6],
  turbo:[-3,3,-21],field:[-45.5,3,-35]
});

const hints={
  bianco:'Spray the Rainbow M on the Grand Pianta Statue, then jump into the open painting.',
  ricco:'Spray the Rainbow M on the boathouse, then jump into the open painting.',
  gelato:'Spray the Rainbow M at the lighthouse, then jump into the open painting.',
  pinna:'Jump into the cannon at the western edge of the Plaza.',
  sirena:'Bring Yoshi to the rooftop red pipe, eat its giant pineapple, then jump into the pipe.',
  noki:'Stand on the Shine-marked beam. Use LOOK / V and look up at the pasta sun.',
  pianta:'Reach the red pipe on top of the Shine Gate and jump down into its opening.',
  airstrip:'Speak to the captain beside the docked boat. A trip to the Airstrip costs ten yellow coins.',
  corona:'Walk through the cave entrance behind the Shine Gate.',
  pachinko:'Jump upward into the hidden opening underneath the western bridge.',
  lily:'Ride Yoshi across the three ferries, dissolve the island seal, then jump into its pipe.',
  slide:'Cross the northeastern offshore pillars and jump into the pipe at the top.',
  turbo:'Charge Turbo through the courthouse doors and continue through the opening.',
  field:'Climb to the northwestern cliff and jump into its red pipe.'
};

// Destination travel is driven by the modeled entrances. The journal only
// changes guidance; the chooser is opened by a successful physical trigger.
export function createPlazaTravel(parent,M,world,callbacks={},helpers={},options={}){
  const root=new THREE.Group();root.name='Physical Plaza entrances';parent.add(root);
  const paints=world.portals.filter(p=>p.kind==='paint').map(portal=>({portal,water:0,open:false,mesh:new THREE.Group()}));
  for(const paint of paints){
    const p=paint.portal.position;paint.mesh.position.copy(p);paint.mesh.visible=false;
    for(const [i,key]of ['tomato','gold','spinach','blue','cream'].entries()){
      const b=new Batch(M[key]??M.cream),r=1.15+i*.105;
      b.tube(circle(0,0,0,r,r,40).map(q=>V(q.x,q.z,.045+i*.012)),.065,7);
      b.finish(paint.mesh,'Living Rainbow M · '+key+' spaghetti');
    }
    root.add(paint.mesh);
  }
  const sirena=world.portals.find(p=>p.id==='sirena'),pineapple=new THREE.Group();
  if(sirena){const fruit=new Batch(M.gold),scales=new Batch(M.toasted),leaves=new Batch(M.spinach);
    ball(fruit,V(0,1.2,0),1.0,18,V(.92,1.3,.92));
    for(let j=0;j<12;j++){const a=j/12*TAU,p=[];for(let k=0;k<=24;k++){const t=k/24,angle=a+t*TAU*.65;p.push(V(Math.sin(angle)*Math.sin(t*Math.PI)*.95,t*2.5,Math.cos(angle)*Math.sin(t*Math.PI)*.95));}scales.tube(p,.055,6);}
    for(let j=0;j<9;j++){const a=j/9*TAU;leaves.tube([V(0,2.3,0),V(Math.sin(a)*.38,3.15,Math.cos(a)*.38),V(Math.sin(a)*.9,2.65,Math.cos(a)*.9)],.12,7);}
    fruit.finish(pineapple,'Giant coiled-pasta pineapple');scales.finish(pineapple,'Toasted spaghetti pineapple scales');leaves.finish(pineapple,'Spinach-linguine pineapple crown');
    pineapple.position.copy(sirena.position).add(V(0,.2,0));root.add(pineapple);
  }
  const sun=new THREE.Group(),sunPasta=new Batch(M.gold),beam=new Batch(M.cream),noki=world.portals.find(p=>p.id==='noki');
  if(noki){for(let r=.2;r<3.5;r+=.18)sunPasta.tube(circle(0,0,0,r,r,48),.105,7);
    for(let j=0;j<12;j++){const a=j/12*TAU;sunPasta.tube([V(Math.sin(a)*3.5,0,Math.cos(a)*3.5),V(Math.sin(a+.08)*4.9,0,Math.cos(a+.08)*4.9),V(Math.sin(a+.16)*3.5,0,Math.cos(a+.16)*3.5)],.15,7);}
    sunPasta.finish(sun,'Pasta sun above the Noki entrance');sun.position.set(noki.position.x,88,noki.position.z);root.add(sun);
    for(let j=0;j<8;j++){const a=j/8*TAU;beam.tube([V(noki.position.x+Math.sin(a)*1.15,3.12,noki.position.z+Math.cos(a)*1.15),V(noki.position.x+Math.sin(a)*.1,86,noki.position.z+Math.cos(a)*.1)],.018,4);}beam.finish(root,'Fine vermicelli rays mark Noki’s sunbeam');
  }
  let tracked=null,latched=null,pending=null,fare=0,pineappleEaten=false,lookTime=0,previous=null;
  const near=(player,p,r=1.5,v=2)=>Math.hypot(player.position.x-p.x,player.position.z-p.z)<r&&Math.abs(player.position.y+1-p.y)<v;
  const byId=id=>world.portals.find(p=>p.id===id);
  const allowed=p=>p.enabled!==false&&(p.id!=='lily'||helpers.lilyOpen?.())&&(p.id!=='sirena'||pineappleEaten);
  function request(portal){if(pending||typeof callbacks.travel!=='function')return false;pending=latched=portal.id;lookTime=0;callbacks.travel(portal.id,portal.id==='airstrip'?2:portal.episode??1);return true;}
  function context(player){if(!player||world.inSewer||pending)return null;
    if(sirena&&!pineappleEaten&&near(player,sirena.position,2.0,2.5))return helpers.mounted?.()?{kind:'travel-pineapple',label:'EAT',name:'Eat the giant pineapple blocking the Sirena pipe',priority:true}:{kind:'travel-hint',label:'LOOK',name:'Bring Yoshi to eat the pineapple over this pipe',priority:false};
    const boat=byId('airstrip');if(boat&&near(player,boat.position,2.2,1.8)&&player.grounded)return{kind:'travel-boat',label:helpers.getCoins()>=10?'SAIL':'TALK',name:'Pay ten yellow coins to visit Delfino Airstrip',priority:false};
    return null;
  }
  function interact(c,player){if(c.kind==='travel-pineapple'){if(!helpers.mounted?.())return false;pineappleEaten=true;pineapple.visible=false;callbacks.sound?.('reveal');callbacks.message?.('Yoshi ate the giant pineapple. Jump down into the rooftop pipe to reach Sirena Beach.');return true;}
    if(c.kind==='travel-hint'){callbacks.message?.(hints.sirena);return true;}
    if(c.kind==='travel-boat'){if(pending||typeof callbacks.travel!=='function')return true;if(helpers.mounted?.()||helpers.carryingFruit?.()){callbacks.message?.('Leave Yoshi and the carried fruit on the quay before boarding.');return true;}if(helpers.getCoins()<10){callbacks.message?.('The captain charges ten yellow coins. You have '+helpers.getCoins()+'.');return true;}if(helpers.spendCoins(10)){fare=10;request(byId('airstrip'));}return true;}return false;
  }
  function update(dt,time,player,input={}){
    if(!player)return false;
    for(const p of paints)if(p.open){p.mesh.rotation.z=Math.sin(time*.8)*.035;p.mesh.scale.setScalar(1+Math.sin(time*3)*.025);}
    sun.rotation.y=time*.025;
    if(latched){const p=byId(latched);if(!p||!near(player,p.position,3.4,4))latched=null;}
    if(pending||world.inSewer||helpers.carryingFruit?.()){previous=player.position.clone();return false;}
    for(const portal of world.portals){if(portal.id===latched||!allowed(portal)||portal.kind==='boat')continue;const p=portal.position;let enter=false;
      if(portal.kind==='paint'){const paint=paints.find(t=>t.portal===portal);enter=paint.open&&!player.grounded&&near(player,p,1.15,1.6);}
      else if(portal.kind==='shine'){
        const looking=near(player,p,1.25,1.4)&&player.grounded&&input.lookMode===true&&Number.isFinite(input.cameraPitch)&&input.cameraPitch<=-1.25;
        lookTime=looking?lookTime+dt:0;enter=lookTime>=.6;
      }else if(portal.kind==='pipe'||portal.kind==='cannon'){
        const mouth=p.y+.38;enter=!!previous&&!player.grounded&&player.velocity.y<0&&Math.hypot(player.position.x-p.x,player.position.z-p.z)<.88&&previous.y>=mouth-.08&&player.position.y<=mouth+.08;
      }else if(portal.kind==='hole'){
        // The controller resolves the bridge underside before this update,
        // so a rising head contact may already have zero vertical velocity.
        const rising=player.velocity.y>0||previous&&player.position.y>previous.y+.0001||player.hovering&&player.velocity.y>=0;
        enter=!!previous&&!player.grounded&&rising&&Math.hypot(player.position.x-p.x,player.position.z-p.z)<.8&&previous.y+1.9<=p.y+.15&&player.position.y+1.9>=p.y-.15;
      }else if(portal.kind==='cave'||portal.kind==='door')enter=near(player,p,1.05,1.65)&&player.grounded;
      if(enter&&request(portal)){previous=player.position.clone();return true;}
    }
    previous=player.position.clone();return false;
  }
  function spray(origin,direction,dt){if(world.inSewer||helpers.mounted?.()||!Number.isFinite(dt)||dt<=0||direction.lengthSq()<1e-8)return;
    const dir=direction.clone().normalize();for(const p of paints)if(!p.open){const d=p.portal.position.clone().sub(origin),along=d.dot(dir);if(along<=0||along>12||d.addScaledVector(dir,-along).length()>.3+along*.035||!plazaRayClear(world.colliders,origin,p.portal.position))continue;p.water=Math.min(.65,p.water+Math.min(.05,dt));if(p.water>=.65-1e-7){p.open=true;p.mesh.visible=true;callbacks.sound?.('reveal');callbacks.message?.('The Rainbow M is open. Jump into it to enter '+p.portal.label+'.');}}
  }
  function aimTarget(player){if(!player||world.inSewer||helpers.mounted?.())return null;const origin=player.position.clone().add(V(0,1.35,0)),facing=V(Math.sin(player.heading),.09,Math.cos(player.heading)).normalize();let best=null,range=12;
    for(const p of paints)if(!p.open){const d=p.portal.position.clone().sub(origin),distance=d.length();if(distance<range&&d.normalize().dot(facing)>.65&&plazaRayClear(world.colliders,origin,p.portal.position)){best=p.portal.position;range=distance;}}return best?.clone()??null;
  }
  function cancelPortalEntry(){if(fare){helpers.refundCoins(fare);fare=0;}pending=null;lookTime=0;return true;}
  function commitPortalEntry(){const had=!!pending;fare=0;return had;}
  function trackDestination(id){if(!byId(id))return false;tracked=id;return true;}
  function navigation(){const p=byId(tracked);return p?{trackedDestination:tracked,navigationTarget:p.position.clone(),navigationLabel:p.label,navigationHint:hints[tracked],navigationRoute:null}:null;}
  function getState(player){const p=player&&!world.inSewer?world.portals.find(p=>near(player,p.position,3,4)):null;return{trackedDestination:tracked,entranceHint:p?hints[p.id]:null,entranceId:p?.id??null,sirenaPineappleEaten:pineappleEaten,nokiLookProgress:lookTime/.6,portalPending:pending,portalStates:world.portals.map(p=>({id:p.id,kind:p.kind,open:allowed(p)&&(p.kind!=='paint'||paints.find(t=>t.portal===p).open),water:paints.find(t=>t.portal===p)?.water??0,position:p.position.clone()}))};}
  function reset(){tracked=latched=pending=null;fare=lookTime=0;previous=null;pineappleEaten=false;pineapple.visible=true;for(const p of paints){p.open=false;p.water=0;p.mesh.visible=false;}if(options.returnFrom)latched=options.returnFrom;}
  reset();return{root,context,interact,update,spray,aimTarget,navigation,getState,reset,trackDestination,cancelPortalEntry,commitPortalEntry,clearTracking(){tracked=null;}};
}
