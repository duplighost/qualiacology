import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {World} from './world.js';
import {createMaterials} from './materials.js';
import {createProps} from './props.js';
import {Combat} from './combat.js';
import {AudioSystem} from './audio.js';
import {UI} from './ui.js';
import {DISTRICTS,SECTORS} from './campaign.js';
import {SKILLS} from './progression.js';
import {Input} from './input.js';
import {Player} from './player.js';
import {Weapon} from './weapon.js';
import {Effects} from './effects.js';
import {newSave,loadSave,saveProgress,xpForLevel} from './storage.js';

const params=new URLSearchParams(location.search),DEV=params.get('dev')==='1';
let save=loadSave(),mode='loading',sector=SECTORS[0],district=DISTRICTS[0],world,player,combat,weapon,materials,props;
let combo=0,comboTime=0,score=0,kills=0,sectorTime=0,totalTime=0,accumulator=0,saveClock=0,lastFrame=performance.now(),hitFlash=0,trauma=0,shakePhase=0,completionLock=false,bossState=null;
const frameTimes=[],events=[],diagnostics={errors:[],warnings:[],loads:[],assetErrors:[]};
const canvas=document.querySelector('#game');
const input=new Input(canvas),audio=new AudioSystem(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(save.settings.fov,innerWidth/innerHeight,.07,650);scene.add(camera);
let renderer,composer,bloom,ssao,output,adaptiveScale=1;
const ui=new UI({onStart:startRun,onResume:resume,onRestart:restart,onSelectSector:selectSector,onBuySkill:buySkill,onSettings:settings,onExitSkills:resume,onOpenSkills:skills});
const log=(type,data={})=>{events.push({type,t:Math.round(totalTime*100)/100,...data});if(events.length>1500)events.shift();};
window.addEventListener('error',e=>diagnostics.errors.push(e.message));
window.addEventListener('unhandledrejection',e=>diagnostics.errors.push(String(e.reason?.stack||e.reason)));

function loadStatus(text){const el=document.querySelector('#load-status');if(el)el.textContent=text;}
function persist(){saveProgress(save);}
function setMode(next){mode=next;input.playing=next==='playing';audio.pause(next!=='playing');if(next!=='playing'){input.clear();weapon&&(weapon.charge=0);}log('mode',{mode:next});}
function settings(patch){Object.assign(save.settings,patch);input.sensitivity=save.settings.sensitivity;input.inverted=save.settings.inverted;audio.setVolume(save.settings.volume,save.settings.music);camera.fov=save.settings.fov;camera.updateProjectionMatrix();if(combat){const d=save.settings.difficulty;combat.difficulty=d;combat.damageScale=d==='story'?.62:d==='relentless'?1.2:1;combat.attackScale=d==='story'?.84:d==='relentless'?1.1:1;}if(weapon)weapon.damageScale=save.settings.difficulty==='story'?1.2:1;resize();persist();return save.settings;}
function shadowQuality(){const resolution=save.settings.quality==='low'?512:save.settings.quality==='medium'?1024:2048;scene.traverse(o=>{if(!o.isLight||!o.shadow||o.shadow.mapSize.x===resolution)return;o.shadow.mapSize.set(resolution,resolution);o.shadow.map?.dispose();o.shadow.map=null;o.shadow.needsUpdate=true;});}
function resize(){if(!renderer)return;const q=save.settings.quality,scale=q==='low'?.7:q==='medium'?.9:1;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)*scale*adaptiveScale);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(innerWidth,innerHeight);if(bloom)bloom.enabled=q!=='low';if(ssao){ssao.enabled=q==='high';ssao.setSize(Math.ceil(innerWidth*renderer.getPixelRatio()*.5),Math.ceil(innerHeight*renderer.getPixelRatio()*.5));}shadowQuality();}
window.addEventListener('resize',resize);
function pause(){if(mode!=='playing')return;setMode('paused');input.unlock();ui.showPause({save,settings:save.settings,sectorName:sector.name,districtName:district.name,health:player.health,score,elapsed:sectorTime});persist();}
function skills(){if(mode!=='playing'&&mode!=='paused')return;setMode('skills');input.unlock();ui.showSkills(save,SKILLS);persist();}
input.onUnlock=pause;input.onMenu=pause;input.onSkills=skills;
async function resume(){if(!['paused','skills','playing'].includes(mode))return;ui.hidePanels();input.clear();setMode('playing');await input.lock();if(!input.locked&&!DEV){setMode('paused');ui.showPause({save,settings:save.settings,sectorName:sector.name});ui.toast('Click Resume to capture the mouse.','info');}}
function buySkill(id){const skill=SKILLS.find(s=>s.id===id);if(!skill||save.skills.includes(id)||save.skillPoints<skill.cost||!(skill.requires||[]).every(x=>save.skills.includes(x)))return save;
  save.skillPoints-=skill.cost;save.skills.push(id);player.skillSet=new Set(save.skills);audio.sfx('level');persist();log('skill',{id});return save;}
function addXP(amount){save.xp+=Math.max(0,Math.round(amount));while(save.level<12&&save.xp>=xpForLevel(save.level+1)){save.level++;save.skillPoints=Math.min(SKILLS.length-save.skills.length,save.skillPoints+1);audio.sfx('level');ui.toast(`LEVEL ${save.level}  ·  Constellation point earned`,'level');log('level',{level:save.level});}}
function gainCombo(amount){combo=Math.min(99,combo+amount);comboTime=5.5;}
function rank(){return combo>=30?'FLOW':combo>=22?'SS':combo>=14?'S':combo>=8?'A':combo>=4?'B':combo>=1?'C':'—';}
function onKill(event){
  if(mode!=='playing')return;kills++;save.stats.kills++;const multiplier=1+Math.min(3,Math.floor(combo/6));const points=Math.round((event.score||100)*multiplier);score+=points;save.stats.score+=points;addXP(event.xp||20);ui.award?.({points,xp:event.xp||20,returning:event.returning,boss:event.boss});gainCombo(event.boss?6:2);
  const near=event.position&&player.position.distanceTo(event.position)<10;player.health=Math.min(player.maxHealth,player.health+(near?(event.returning?7:4):2)+(near&&event.returning&&player.hasSkill('bloodtide')?12:0));
  player.dashCd=Math.max(0,player.dashCd-.35);
  if(player.sliding&&player.hasSkill('slidevault')){player.velocity.y=8.5;player.grounded=false;audio.sfx('jump');}
  if(event.boss){audio.sfx('complete');ui.toast('NETWORK NODE RESTORED','reward');}
  log('kill',{type:event.type,returning:event.returning,boss:event.boss,sector:sector.index});
}
function takeDamage(amount,source,kind){
  if(mode!=='playing'||player.invuln>0)return;const factor=1; // Combat applies the selected difficulty exactly once.
  player.health=Math.max(0,player.health-amount*factor);player.invuln=.36;combo=Math.max(0,combo-3);hitFlash=.8;trauma=Math.max(trauma,.28);audio.sfx('hurt');log('damage',{amount:amount*factor,kind});
  if(player.health<=0){save.stats.deaths++;persist();setMode('dead');input.unlock();audio.sfx('death');ui.showDeath?.({sectorName:sector.name,checkpoint:save.checkpoint,kills,score,elapsed:sectorTime,save});}
}
function onArenaClear(index){
  world.setGate(index,true);save.checkpoint=Math.max(save.checkpoint,index+1);save.sector=sector.index;persist();audio.sfx('gate');comboTime=Math.max(comboTime,10);ui.toast(index===sector.arenas.length-1?'PASSAGE RESTORED  ·  Follow the amber line':'ROUTE OPEN','success');
  log('checkpoint',{sector:sector.index,checkpoint:save.checkpoint});
}
function safeCheckpoint(){const checkpoint=save.checkpoint||0;if(checkpoint===0)return world.spawn.clone();const a=world.arenas[Math.min(checkpoint-1,world.arenas.length-1)];return new THREE.Vector3(a.center.x,a.center.y+.02,a.center.z-a.length*.30);}
function fallen(){if(mode!=='playing')return;player.position.copy(safeCheckpoint());player.velocity.set(0,0,0);player.health=Math.max(20,player.health-12);player.invuln=1;audio.sfx('hurt');ui.toast('Safety tether engaged','info');log('fall');}

function loadSector(index,{checkpoint=0,playing=false,preserveHealth=false}={}){
  const started=performance.now();completionLock=false;sector=SECTORS[Math.max(0,Math.min(SECTORS.length-1,index))];district=DISTRICTS[sector.district];
  if(!sector||!district)throw new Error(`Missing sector/district ${index}`);
  const health=player?.health||100;effects.clear();weapon?.reset();world.build(sector,district);shadowQuality();combat.load(sector,district,save.settings.difficulty);save.sector=sector.index;save.checkpoint=Math.min(checkpoint,sector.arenas.length);
  for(let i=0;i<save.checkpoint;i++){combat.cleared.add(i);world.setGate(i,true);}combat.activeArena=-1;
  player.reset(safeCheckpoint());player.skillSet=new Set(save.skills);if(preserveHealth)player.health=Math.min(100,Math.max(45,health+20));
  for(const p of world.pickups||[])if(save.secrets.includes(p.id)){p.claimed=true;p.mesh&&(p.mesh.visible=false);}
  sectorTime=0;kills=0;score=0;bossState=null;weapon.reset();audio.setDistrict(sector.district);input.clear();camera.position.copy(player.eye());camera.rotation.set(0,0,0,'YXZ');
  diagnostics.loads.push({sector:sector.id,ms:performance.now()-started,solids:world.solids.length,arenas:world.arenas.length});log('sector',{sector:sector.index,checkpoint:save.checkpoint});
  if(playing){ui.hidePanels();setMode('playing');ui.toast(`${String(sector.index+1).padStart(2,'0')}  /  ${sector.name.toUpperCase()}`);if(save.settings.subtitles)ui.radio(sector.briefing.replace(/^MARA:\s*/,''));}
}
async function startRun(kind='new'){
  await audio.unlock();
  if(kind==='new'){const keepSettings={...save.settings};save=newSave();save.settings=keepSettings;persist();}
  if(save.completed&&kind==='continue'&&save.sector===SECTORS.length-1&&save.checkpoint>=SECTORS.at(-1).arenas.length){save.sector=0;save.checkpoint=0;}
  loadSector(save.sector,{checkpoint:save.checkpoint,playing:true});settings(save.settings);await input.lock();
  if(!input.locked&&!DEV){setMode('paused');ui.showPause({save,settings:save.settings,sectorName:sector.name});}
}
async function captureOrPause(){await input.lock();if(!input.locked&&!DEV){setMode('paused');ui.showPause({save,settings:save.settings,sectorName:sector.name});}}
async function restart(){await audio.unlock();combo=0;comboTime=0;loadSector(sector.index,{checkpoint:save.checkpoint,playing:true});await captureOrPause();}
async function selectSector(index){index=Math.floor(index);if(!Number.isFinite(index)||index<0||index>save.unlockedSector||index>=SECTORS.length)return;await audio.unlock();loadSector(index,{playing:true});persist();await captureOrPause();}
function finishSector(){
  if(completionLock)return;completionLock=true;
  save.stats.sectors.push({sector:sector.index,seconds:Math.round(sectorTime),kills,score,rank:rank(),secret:(world.pickups||[]).some(p=>p.type==='secret'&&p.claimed)});
  addXP(120);audio.sfx('complete');log('sectorComplete',{sector:sector.index,seconds:sectorTime});
  if(sector.index===SECTORS.length-1){save.completed=true;save.unlockedSector=SECTORS.length-1;persist();setMode('ending');input.unlock();audio.sfx('complete');ui.showEnding({save,completion:sector.completion,score:save.stats.score,kills:save.stats.kills,elapsed:save.stats.activeSeconds,rank:rank(),secrets:save.secrets.length});return;}
  save.unlockedSector=Math.max(save.unlockedSector,sector.index+1);save.sector=sector.index+1;save.checkpoint=0;persist();
  if(save.settings.subtitles)ui.radio(sector.completion);
  loadSector(save.sector,{playing:true,preserveHealth:true});
}

let effects;
async function boot(){
  try{
    loadStatus('Bringing the harbor online…');
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.info.autoReset=false;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples||0)});
    composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
    ssao=new SSAOPass(scene,camera,Math.ceil(innerWidth*.5),Math.ceil(innerHeight*.5),16);ssao.kernelRadius=1.6;ssao.minDistance=.00006;ssao.maxDistance=.006;
    const renderAO=ssao.render.bind(ssao);
    ssao.render=(...args)=>{const shadows=renderer.shadowMap.autoUpdate,heldVisible=weapon?.view.visible;renderer.shadowMap.autoUpdate=false;if(weapon)weapon.view.visible=false;try{renderAO(...args);}finally{renderer.shadowMap.autoUpdate=shadows;if(weapon)weapon.view.visible=heldVisible;}};
    composer.addPass(ssao);bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.5,1.05);composer.addPass(bloom);output=new OutputPass();composer.addPass(output);resize();
    [materials,props]=await Promise.all([createMaterials(renderer),createProps()]);diagnostics.assetErrors=[...(materials.errors||[]),...(props.errors||[])];
    world=new World(scene,renderer,materials,props);effects=new Effects(scene);player=new Player(world,input,audio,effects,fallen);
    combat=new Combat({scene,world,effects,audio,onKill,onDamage:takeDamage,onMessage:t=>ui.toast(t),onArenaClear,onBoss:b=>bossState=b});
    weapon=new Weapon({scene,camera,player,input,combat,world,effects,audio,materials,onPerfect:()=>{save.stats.perfectCatches++;gainCombo(3);score+=150;save.stats.score+=150;ui.toast('PERFECT CATCH','perfect');log('perfect');},onHit:(n,returning)=>{gainCombo(returning?1.5:.5);hitFlash=Math.max(hitFlash,.08);},onShake:n=>trauma=Math.max(trauma,n),onMessage:t=>{gainCombo(2);ui.toast(t,'perfect');}});
    player.onDash=()=>{trauma=Math.max(trauma,.06);};
    const preservedProgress={sector:save.sector,checkpoint:save.checkpoint};
    loadSector(DEV&&params.has('sector')?Number(params.get('sector')):0);
    await world.ready;
    Object.assign(save,preservedProgress);
    settings(save.settings);document.querySelector('#loading')?.setAttribute('hidden','');setMode('menu');ui.showMenu(save,SECTORS);
    if(DEV)installDebug();lastFrame=performance.now();requestAnimationFrame(frame);
  }catch(error){console.error(error);loadStatus(`Unable to start: ${error.message}. Please reload in a browser with WebGL 2.`);const loading=document.querySelector('#loading');loading?.removeAttribute('hidden');diagnostics.errors.push(error.stack||String(error));}
}

function interact(){
  if(!input.events.has('KeyE')||weapon.state==='returning')return;
  for(const item of world.interactables||[]){if(player.position.distanceTo(item.position)>3.1)continue;
    if(item.kind==='ladder'&&item.target){input.pressed('KeyE');player.position.copy(item.target);player.velocity.set(0,0,0);audio.sfx('step');ui.toast('UP AND OVER');return;}
  }
}
function step(dt){
  interact();player.step(dt);
  if(player.dashTime>0&&player.hasSkill('wake'))combat.pulse(player.position,1.5,20*dt/.18,{dash:true});
  weapon.step(dt);combat.update(dt,player);effects.update(dt);world.update(dt,totalTime,player.position);
  let next=0;while(combat.cleared.has(next)&&next<world.arenas.length)next++;
  if(next<world.arenas.length&&combat.activeArena!==next){const a=world.arenas[next];if(player.position.z<=a.triggerZ+1.5){combat.startArena(next);world.setGate(next,false);log('arena',{sector:sector.index,arena:next});}}
  for(const p of world.pickups||[]){if(p.claimed||player.position.distanceTo(p.position)>1.8)continue;p.claimed=true;if(p.mesh)p.mesh.visible=false;
    if(p.type==='secret'){if(!save.secrets.includes(p.id)){save.secrets.push(p.id);const reward=sector.secret?.reward||150;addXP(reward);audio.sfx('secret');ui.toast(`${sector.secret?.name||'HIDDEN REFUGE'}  ·  +${reward} XP`,'secret');if(save.settings.subtitles)ui.radio(sector.secret?.text||'Someone kept a light on down here.','FIELD RECORD');persist();}}
    else{player.health=Math.min(player.maxHealth,player.health+30);audio.sfx('catch');}
  }
  if(next>=world.arenas.length&&player.position.distanceTo(world.exit)<5.5)finishSector();
}
function hud(){
  const next=world.arenas.findIndex((_,i)=>!combat.cleared.has(i));const target=next<0?world.exit:world.arenas[next].center;
  ui.update({health:player.health,maxHealth:100,charge:weapon.charge,lanceState:weapon.state,perfectWindow:weapon.perfectWindow,combo,rank:rank(),score,xp:save.xp,xpProgress:save.level>=12?1:(save.xp-xpForLevel(save.level))/(xpForLevel(save.level+1)-xpForLevel(save.level)),level:save.level,skillPoints:save.skillPoints,sectorName:sector.name,districtName:district.name,objective:next<0?'Follow the restored passage':sector.objective,objectiveDistance:Math.round(player.position.distanceTo(target)),arenaIndex:next<0?world.arenas.length:next,arenaCount:world.arenas.length,kills,elapsed:sectorTime,boss:bossState,paused:mode!=='playing',speed:player.speed,catchFlash:weapon.catchFlash});
  document.documentElement.style.setProperty('--damage',String(Math.max(0,hitFlash-.12)));
  const water=world.waterAt?.(player.position.x,player.position.z),underwater=mode==='playing'&&Number.isFinite(water)&&camera.position.y<water-.05;
  document.documentElement.classList.toggle('swimming',underwater);audio.setUnderwater?.(underwater);
}
function frame(now){
  const real=Math.max(0,(now-lastFrame)/1000),raw=Math.min(.05,real);frameTimes.push(now-lastFrame);if(frameTimes.length>900)frameTimes.shift();lastFrame=now;totalTime+=raw;
  const active=mode==='playing';input.playing=active;
  if(active){
    player.look();sectorTime+=real;save.stats.activeSeconds+=real;saveClock+=real;accumulator=Math.min(.1,accumulator+raw);
    while(accumulator>=1/60&&mode==='playing'){step(1/60);accumulator-=1/60;}
    if(saveClock>20){saveClock=0;persist();}
    comboTime=Math.max(0,comboTime-raw);if(comboTime===0)combo=Math.max(0,combo-raw*1.5);
    player.eye(camera.position);camera.position.y-=player.landDip;camera.position.y+=Math.sin(player.bob)*.018*Math.min(1,player.speed/10)*(player.grounded?1:0);
    shakePhase+=raw*31;const shake=trauma*trauma*save.settings.shake;
    camera.rotation.set(player.pitch+Math.sin(shakePhase*1.7)*shake*.045,player.yaw+Math.cos(shakePhase*2.3)*shake*.025,player.cameraRoll*save.settings.shake,'YXZ');
    camera.fov=THREE.MathUtils.lerp(camera.fov,save.settings.fov+(player.dashTime>0?7:Math.min(player.speed,14)*.15),1-Math.exp(-raw*9));camera.updateProjectionMatrix();
    audio.setIntensity(Math.min(1,(combat.enemies.filter(e=>e.alive&&e.health>0).length/8)+(bossState?.2:0)+combo/65));audio.update(raw,player.position,player.aim());
  }else{
    accumulator=0;effects.update(raw);world.update(raw,totalTime,player.position);
    if(mode==='menu'){camera.position.set(world.spawn.x+4.3,world.spawn.y+3.4,world.spawn.z+2);camera.lookAt(world.spawn.x+Math.sin(totalTime*.07)*1.6,world.spawn.y+2.1,-35);}
  }
  trauma=Math.max(0,trauma-raw*1.8);hitFlash=Math.max(0,hitFlash-raw*2.5);weapon.render(raw,active);hud();
  if(ssao?.enabled){ssao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);ssao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);}
  renderer.info.reset();if(save.settings.quality==='low')renderer.render(scene,camera);else composer.render();
  requestAnimationFrame(frame);
}

function installDebug(){
  window.__BREAKWATER__={
    ready:true,version:'1.0',scene,camera,world,player,combat,weapon,input,renderer,ui,ssao,
    snapshot:()=>({mode,sector:sector.index,sectorName:sector.name,position:player.position.toArray(),velocity:player.velocity.toArray(),health:player.health,grounded:player.grounded,swimming:player.swimming,checkpoint:save.checkpoint,unlockedSector:save.unlockedSector,completed:save.completed,skills:[...save.skills],xp:save.xp,level:save.level,skillPoints:save.skillPoints,lance:weapon.state,enemyCount:combat.enemies.filter(e=>e.alive&&e.health>0).length,activeArena:combat.activeArena,cleared:[...combat.cleared],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frames:[...frameTimes],diagnostics,events:[...events]}),
    loadSector:(i,play=false)=>{loadSector(i,{playing:play});if(play)ui.hidePanels();},
    start:()=>startRun('new'),pause,resume,restart,selectSector,
    step:(dt=1/60)=>{if(mode==='playing')step(Math.min(.05,dt));},
    setPosition:(x,y,z)=>{player.position.set(x,y,z);player.velocity.set(0,0,0);},
    setAim:(yaw,pitch=0)=>{player.yaw=yaw;player.pitch=pitch;},
    getSave:()=>structuredClone(save),settings,
  };
}
boot();
