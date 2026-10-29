import * as THREE from '../vendor/three.module.js';
import {createWorld} from './world.js';
import {createMission} from './mission.js';
import {createRiccoWorld} from './ricco-world.js';
import {createRiccoMission} from './ricco-mission.js';
import {createGelatoWorld} from './gelato-world.js';
import {createGelatoMission} from './gelato-mission.js';
import {createPinnaWorld} from './pinna-world.js';
import {createPinnaMission} from './pinna-mission.js';
import {createSirenaWorld} from './sirena-world.js';
import {createSirenaMission} from './sirena-mission.js';
import {createNokiWorld} from './noki-world.js';
import {createNokiMission} from './noki-mission.js';
import {createPiantaWorld} from './pianta-world.js';
import {createPiantaMission} from './pianta-mission.js';
import {createAirstripWorld} from './airstrip-world.js';
import {createAirstripMission} from './airstrip-mission.js';
import {createCoronaWorld} from './corona-world.js';
import {createCoronaMission} from './corona-mission.js';
import {createPlazaWorld} from './plaza-world.js';
import {createPlazaMission} from './plaza-mission.js';
import {createPachinkoWorld} from './pachinko-world.js';
import {createPachinkoMission} from './pachinko-mission.js';
import {createLilyWorld} from './lily-world.js';
import {createLilyMission} from './lily-mission.js';
import {createSlideWorld,createTurboWorld,createFieldWorld} from './plaza-secrets-world.js';
import {createSlideMission,createTurboMission,createFieldMission} from './plaza-secrets-mission.js';
import {createPlayer} from './controller.js';
import {getCourseInfo} from './campaign.js';

// Each course owns one root. No boss state, collision boxes, or platforms are
// shared between runs; only the character, materials and saved medals persist.
export function createLevelSession(id,scene,materials,callbacks={},options={}){
  const episode=options.episode??1;
  if(!getCourseInfo(id,episode))throw new Error('Unknown pasta course or episode: '+id+' / '+episode);
  const root=new THREE.Group();root.name=id+' course';scene.add(root);
  const factories={bianco:[createWorld,createMission],ricco:[createRiccoWorld,createRiccoMission],gelato:[createGelatoWorld,createGelatoMission],pinna:[createPinnaWorld,createPinnaMission],sirena:[createSirenaWorld,createSirenaMission],noki:[createNokiWorld,createNokiMission],pianta:[createPiantaWorld,createPiantaMission],airstrip:[createAirstripWorld,createAirstripMission],corona:[createCoronaWorld,createCoronaMission],plaza:[createPlazaWorld,createPlazaMission],pachinko:[createPachinkoWorld,createPachinkoMission],lily:[createLilyWorld,createLilyMission],slide:[createSlideWorld,createSlideMission],turbo:[createTurboWorld,createTurboMission],field:[createFieldWorld,createFieldMission]};
  const [worldFactory,missionFactory]=factories[id];
  const world=worldFactory(root,{...materials,blue:materials.lake},{...options,episode});
  const player=createPlayer(world);
  const hooks={...callbacks,pickup(){player.health=Math.min(8,player.health+1);callbacks.pickup?.();},bounce(velocity=6){player.velocity.y=Math.max(player.velocity.y,velocity);player.grounded=false;callbacks.bounce?.(velocity);}};
  const mission=missionFactory(root,materials,world,hooks,{...options,episode});
  let disposed=false;
  const api={
    id,episode,root,world,player,mission,
    reset(){world.reset?.();mission.reset();player.reset();player.health=8;player.nozzle='spray';world.update(0,0,player);mission.update(0,0,player,{});},
    step(dt,time,input,firmness){if(disposed)return;world.update(dt,time,player);player.update(dt,input,firmness);mission.update(dt,time,player,input);},
    spray(origin,direction,dt){if(disposed||world.nozzleAllowed===false)return;world.spray?.(origin,direction,dt);mission.spray(origin,direction,dt);},
    dispose(){
      if(disposed)return;disposed=true;scene.remove(root);
      const geometries=new Set(),ownedMaterials=new Set(),shared=new Set(Object.values(materials));
      root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!shared.has(m))ownedMaterials.add(m);});
      geometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());root.clear();
    }
  };
  api.reset();return api;
}
