import * as THREE from '../vendor/three.module.js';
import {makeMaterials} from './materials.js';
import {createCharacter} from './character.js';
import {createEffects,createSound} from './effects.js';
import {createOpeningLogo} from './opening.js';
import {createLevelSession} from './session.js';
import {createCampaign,COURSE_INFO,COURSE_IDS,EPISODE_COUNTS,TOTAL_SHINES,episodeRecord,getCourseInfo} from './campaign.js';
import {paintPlazaMap} from './plaza-map.js';
import {clipCameraSegment} from './camera-collision.js';

const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp;
const PLAZA_AREAS=['plaza','pachinko','lily','slide','turbo','field'];
const DESTINATIONS=COURSE_IDS.filter(id=>id!=='plaza');
const DIRECT_ENTRIES=new Set(['corona','pachinko','lily','slide','turbo','field']);
let storage;try{storage=localStorage;}catch{}
const campaign=createCampaign(storage);
let selectedId='plaza',selectedEpisode=campaign.state.selectedEpisodes.plaza||1,activeId=null,activeEpisode=1,activeSublevel='main',transitionSerial=-1;
let renderer,scene,camera,world,character,mission,effects,player,materials,sun,skyLight,fillLight,openingLogo,session;
let pendingPortal=null,activeLaunchOptions={},lookMode=false;
let mode='loading',modeBeforeModal='title',time=0,levelTime=0,playTime=0,won=false,firmness=.62,quality='balanced';
let cameraYaw=Math.PI,cameraPitch=.43,cameraDistance=10.5,photoDistance=10.5,toastUntil=0,flashUntil=0,checkpointUntil=0,damageCooldown=0;
let checkpoint,checkpointStage=0,accumulator=0,last=performance.now(),hudClock=0,launchTicket=0;
const awardedThisVisit=new Set();let journalReturnMode='play',journalPreviousFocus=null,modalPreviousFocus=null;
const sound=createSound(),keys=new Set(),touchDevice=matchMedia('(pointer:coarse)').matches;
const touch={x:0,y:0,jump:false,spray:false,grab:false,trick:false},mouse={spray:false,drag:false,moved:false,x:0,y:0,id:null};
const input={forward:0,right:0,jump:false,jumpHeld:false,slide:false,flop:false,spray:false,grab:false,cameraYaw};
const origin=new THREE.Vector3(),direction=new THREE.Vector3(),target=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),cameraFocus=new THREE.Vector3(),tmp=new THREE.Vector3(),projection=new THREE.Vector3();

function fatal(error){console.error(error);hide('loading');show('fatal');$('fatal-message').textContent='The 3D game could not start. '+(error?.message||'Open in a browser with WebGL 2 enabled.');mode='error';}
function show(id){$(id)?.classList.remove('hidden');}
function hide(id){$(id)?.classList.add('hidden');}
function message(text,duration=5){$('toast').textContent=text;toastUntil=time+duration;show('toast');}
function saveSettings(){try{storage?.setItem('pasta-sunshine-settings',JSON.stringify({firmness,quality,sound:sound.enabled}));}catch{}}
function audioEvent(kind){sound.play(['shine','bossDefeat'].includes(kind)?'win':['bossHit','snap'].includes(kind)?'hit':kind==='grab'?'click':kind);}
function timeLabel(value){return Number.isFinite(value)?Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0'):'—';}
function makeEnvironment(){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,512);g.addColorStop(0,'#b5cccd');g.addColorStop(.44,'#f2efd3');g.addColorStop(.55,'#a7ad8c');g.addColorStop(1,'#4f5943');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
  const glow=ctx.createRadialGradient(730,152,4,730,152,130);glow.addColorStop(0,'rgba(255,250,229,1)');glow.addColorStop(.15,'rgba(255,247,219,.98)');glow.addColorStop(1,'rgba(255,242,207,0)');ctx.fillStyle=glow;ctx.fillRect(580,0,300,300);
  const tex=new THREE.CanvasTexture(c);tex.mapping=THREE.EquirectangularReflectionMapping;tex.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(tex).texture;tex.dispose();pmrem.dispose();
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
function setQuality(value){
  quality=['high','low','balanced'].includes(value)?value:'balanced';renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='high'?2:quality==='low'?1:1.35));renderer.shadowMap.enabled=quality!=='low';
  if(sun){sun.shadow.mapSize.setScalar(quality==='high'?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;}
  $('quality').value=quality;resize();saveSettings();
}
async function init(){
  try{
    try{const p=JSON.parse(storage?.getItem('pasta-sunshine-settings')||'{}');firmness=clamp(p.firmness??firmness,0,1);quality=p.quality||quality;if(p.sound===false)sound.setEnabled(false);}catch{}
    renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();scene.background=new THREE.Color(0xdcdac1);scene.fog=new THREE.FogExp2(0xdcdac1,.0045);camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.12,360);
    skyLight=new THREE.HemisphereLight(0xfff8df,0x647154,1.35);scene.add(skyLight);sun=new THREE.DirectionalLight(0xffedcc,3.3);sun.position.set(-25,40,24);sun.castShadow=true;sun.shadow.bias=-.00028;sun.shadow.normalBias=.03;sun.shadow.radius=3;Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:.5,far:190});sun.shadow.camera.updateProjectionMatrix();scene.add(sun,sun.target);
    fillLight=new THREE.DirectionalLight(0xd0e5e4,.65);fillLight.position.set(60,35,-50);scene.add(fillLight);makeEnvironment();materials=makeMaterials(renderer);character=createCharacter(materials);character.group.visible=false;scene.add(character.group);effects=createEffects(scene,materials);scene.add(camera);openingLogo=createOpeningLogo(camera,materials);
    setQuality(quality);$('firmness').value=firmness;updateFirmness();$('sound-btn').textContent=sound.enabled?'Sound on':'Sound off';installInput();resize();await showOpeningScreen();hide('loading');last=performance.now();requestAnimationFrame(animate);
  }catch(error){fatal(error);}
}
function updateFirmness(){firmness=Number($('firmness').value);$('firmness-label').textContent=firmness<.3?'Overcooked':firmness<.75?'Al dente':'Firm';saveSettings();}
function clearInput(){keys.clear();touch.x=touch.y=0;touch.jump=touch.spray=touch.grab=touch.trick=false;mouse.spray=mouse.drag=false;for(const id of ['touch-jump','touch-spray','touch-grab','touch-trick'])$(id).classList.remove('held');$('joystick-knob').style.transform='';}
function refreshOpening(){
  $('campaign-count').textContent=campaign.shineCount+' / '+TOTAL_SHINES;
  $('start-label').textContent=campaign.shineCount?'Continue in Delfino Plaza':'Start in Delfino Plaza';
  $('start').disabled=false;
}
async function showOpeningScreen(){
  pendingPortal=null;hide('episode-chooser');
  await launchCourse('plaza',campaign.state.selectedEpisodes.plaza||1,{resume:true,opening:true});
}
async function startGame(){
  if(mode!=='title'||!$('controls').classList.contains('hidden')||!$('about').classList.contains('hidden'))return;
  sound.resume();clearInput();
  if(activeId==='plaza'&&session){mode='play';hide('title');show('hud');setHudVisibility(true);openingLogo?.setVisible(false);character.group.visible=true;activeLaunchOptions={resume:true};resetCourseCamera(mission.getState());updateCamera(1,true);updateHUD();message('Welcome to Delfino Plaza. Explore the town and use its paintings, pipes and other entrances to reach the island.',7);}
  else await launchCourse('plaza',campaign.state.selectedEpisodes.plaza||1,{resume:true});
}
function portalOptions(id){return id==='pachinko'?{entry:'board'}:id==='lily'?{entry:'river'}:{};}
function requestPortal(id,preferredEpisode){
  if(mode!=='play'||activeId!=='plaza'||!DESTINATIONS.includes(id))return false;
  if(DIRECT_ENTRIES.has(id)){launchCourse(id,1,portalOptions(id));return true;}
  const preferred=id==='airstrip'?2:(campaign.state.selectedEpisodes[id]||preferredEpisode||1);
  pendingPortal={id,episode:getCourseInfo(id,preferred)?preferred:1};lookMode=false;document.body.dataset.look='false';character.group.visible=true;
  mode='episode-select';clearInput();hide('interaction');hide('toast');selectPortalEpisode(pendingPortal.episode);show('episode-chooser');$('entry-episode-'+pendingPortal.episode).focus?.();return true;
}
function selectPortalEpisode(episode){
  if(!pendingPortal||!getCourseInfo(pendingPortal.id,episode))return false;
  pendingPortal.episode=episode;const id=pendingPortal.id,info=getCourseInfo(id,episode),record=episodeRecord(campaign.state,id,episode);
  $('entry-course-name').textContent=info.name;$('entry-origin').textContent=id==='airstrip'?'DELFINO FERRY · 10 COINS':'FROM DELFINO PLAZA';
  $('entry-description').textContent=info.short;$('entry-status').textContent=record.shine?'SHINE COLLECTED · BEST '+timeLabel(record.bestTime):'CHOOSE AN EPISODE';
  $('entry-count').textContent=EPISODE_COUNTS[id]+' '+(EPISODE_COUNTS[id]===1?'EPISODE':'EPISODES');
  for(let ep=1;ep<=2;ep++){const button=$('entry-episode-'+ep),entry=getCourseInfo(id,ep),saved=episodeRecord(campaign.state,id,ep);button.classList.toggle('hidden',!entry);button.setAttribute('aria-pressed',String(ep===episode));button.setAttribute('aria-label',entry?(id==='airstrip'&&ep===1?'Arrival replay: ':'Episode '+ep+': ')+entry.episode:'Unavailable episode');button.querySelector('.episode-medal').textContent=saved?.shine?'✳':'○';button.querySelector('.episode-name').textContent=entry?(id==='airstrip'&&ep===1?'Arrival replay · ':'')+entry.episode:'';}
  $('entry-confirm').textContent='Enter '+info.episode+' ↗';return true;
}
async function confirmEpisode(){
  if(mode!=='episode-select'||!pendingPortal)return false;
  const {id,episode}=pendingPortal;mission.commitPortalEntry?.();pendingPortal=null;hide('episode-chooser');await launchCourse(id,episode,portalOptions(id));return true;
}
function cancelEpisodeSelect(){
  if(mode!=='episode-select')return;pendingPortal=null;hide('episode-chooser');mission.cancelPortalEntry?.();clearInput();mode='play';resetCourseCamera(mission.getState());updateHUD();
}
function continueExploring(){
  hide('win');clearInput();mode='play';if(activeId==='plaza'){won=false;mission.continueExploring?.();message('The Plaza stays open. Follow another lead in your journal, or explore the town.',5);}else message('Shine collected. Leave the episode from Pause to return to Delfino Plaza.',5);updateHUD();
}
async function returnToPlaza(){
  if(mode==='loading-level')return;
  if(activeId==='plaza'){continueExploring();return;}
  const from=activeId;await launchCourse('plaza',campaign.state.selectedEpisodes.plaza||1,{resume:true,returnFrom:from});
}
function toggleLook(){
  if(mode!=='play'||activeId!=='plaza')return false;
  lookMode=!lookMode;clearInput();cameraPitch=lookMode?.05:(mission.getState().cameraPitch??.43);document.body.dataset.look=String(lookMode);character.group.visible=!lookMode;updateCamera(1,true);updateHUD();return true;
}
function applyCourseAppearance(){
  const secret=activeSublevel==='secret',bonus=PLAZA_AREAS.includes(activeId)&&activeId!=='plaza'&&!['waterfront','approach'].includes(activeSublevel),plazaDay=activeId==='plaza'||PLAZA_AREAS.includes(activeId)&&!bonus,night=activeId==='pianta'&&activeEpisode===1,volcanic=activeId==='corona'&&!['bath','ending'].includes(activeSublevel);
  scene.background.set(bonus?0xc8dce2:plazaDay?0xc9ded6:volcanic?0x281714:activeId==='corona'?0xe2c5ac:activeId==='airstrip'?0xc5ddda:secret?(activeId==='pinna'?0xb5cab3:activeId==='sirena'?0x192128:0x172321):activeId==='pianta'?(night?0x172232:0xc6ddcb):activeId==='noki'?0xbbd2ce:activeId==='sirena'?(activeSublevel==='lobby'?0x372b25:0xbc9075):activeId==='pinna'?0xd9dfc6:activeId==='gelato'?0xd5e3d6:activeId==='ricco'?0xc7d5cc:0xd7dcc3);
  scene.fog.color.copy(scene.background);scene.fog.density=bonus?.0011:plazaDay?.0026:volcanic?.0024:activeId==='corona'?.0015:activeId==='airstrip'?.0028:secret?.0015:activeSublevel==='lobby'?.001:activeId==='noki'?.0026:activeId==='pianta'?.0034:activeId==='sirena'?.003:activeId==='pinna'?.0032:activeId==='gelato'?.0038:activeId==='ricco'?.0042:.0055;
  sun.color.set(volcanic?0xffb583:night?0xb8c8f5:activeId==='sirena'&&activeSublevel==='beach'?0xffb783:0xffedcc);sun.intensity=volcanic?2.2:night?1.65:3.3;
  if(skyLight){skyLight.color.set(volcanic?0xefb794:night?0xaebdde:0xfff8df);skyLight.groundColor.set(volcanic?0xb83619:night?0x34384e:0x647154);skyLight.intensity=volcanic?1.1:night?.95:1.35;}
  if(fillLight)fillLight.intensity=volcanic?.4:night?.35:.65;scene.environmentIntensity=volcanic?.45:night?.42:1;
  document.body.dataset.sublevel=activeSublevel;document.body.dataset.lighting=volcanic?'volcanic':night?'night':'day';
}
function resetCourseCamera(state={}){
  cameraYaw=state.cameraYaw??Math.PI;cameraPitch=state.cameraPitch??.43;
  cameraDistance=state.cameraDistance??(state.riding?7:activeSublevel==='lobby'?6.5:activeSublevel==='secret'?11.5:10.5);
  if(state.riding&&state.aimTarget){const dx=state.aimTarget.x-player.position.x,dz=state.aimTarget.z-player.position.z;cameraYaw=Math.atan2(dx,dz);cameraPitch=clamp(-Math.atan2(state.aimTarget.y-(player.position.y+1.4),Math.hypot(dx,dz)),-.45,1.05);}
}
function syncSublevel(state){
  const next=state.sublevel||'main',serial=state.transitionSerial??0;if(next===activeSublevel&&serial===transitionSerial)return;
  activeSublevel=next;transitionSerial=serial;checkpoint.copy(player.position);checkpointStage=0;resetCourseCamera(state);
  character.reset();effects.reset();damageCooldown=1.5;applyCourseAppearance();updateCamera(1,true);
}
function unloadCourse(){session?.dispose();session=null;world=mission=player=null;activeId=null;activeSublevel='main';transitionSerial=-1;effects?.reset();if(character)character.group.visible=false;}
async function launchCourse(id='plaza',episode=campaign.state.selectedEpisodes[id]||1,launchOptions={}){
  const info=getCourseInfo(id,episode);if(mode==='loading-level'||!info)return;
  const ticket=++launchTicket;sound.resume();sound.play('click');clearInput();mode='loading-level';$('start').disabled=true;$('start-label').textContent='Uncoiling '+info.name+'…';await new Promise(resolve=>requestAnimationFrame(resolve));
  try{
    if(ticket!==launchTicket)return;unloadCourse();pendingPortal=null;lookMode=false;document.body.dataset.look='false';activeLaunchOptions={...launchOptions};delete activeLaunchOptions.opening;activeId=id;activeEpisode=episode;selectedId=id;selectedEpisode=episode;campaign.select(id,episode);
    session=createLevelSession(id,scene,materials,{damage,message,sound:audioEvent,win,plazaState:()=>campaign.plazaProgress(),blueCoin:id=>campaign.collectBlueCoin(id),tradeBlueCoins:()=>campaign.tradeBlueCoins(),travel:(course,missionNumber)=>{if(mode!=='play')return;if(course==='plaza'){returnToPlaza();return;}if(activeId==='plaza')requestPortal(course,missionNumber);}},{...launchOptions,episode});({world,mission,player}=session);
    player.onJump=()=>sound.play('jump');player.onLand=impact=>{sound.play('land');if(impact>15)effects.burst(player.position,'hit');};player.onFall=respawn;
    checkpoint=player.position.clone();checkpointStage=0;playTime=levelTime=0;won=false;awardedThisVisit.clear();damageCooldown=1;cameraYaw=info.spawnYaw;cameraPitch=.43;cameraDistance=10.5;character.reset();character.setNozzleEnabled(mission.getState().nozzleVisualEnabled??player.nozzleEnabled);character.group.position.copy(player.position);if(mission.getState().playerVisualOffset)character.group.position.add(mission.getState().playerVisualOffset);character.group.rotation.y=player.heading;character.group.visible=!launchOptions.opening;openingLogo?.setVisible(!!launchOptions.opening);
    for(const key of ['title','pause','controls','about','win','photo-label','plaza-journal','episode-chooser'])hide(key);if(launchOptions.opening){hide('hud');show('title');mode='title';refreshOpening();}else{show('hud');setHudVisibility(true);mode='play';}document.body.dataset.course=id;
    $('hud-course').textContent=info.name.toUpperCase();$('hud-episode').textContent='EPISODE '+String(episode).padStart(2,'0');$('boss-name').textContent=info.boss;$('boss-health').innerHTML='<i></i>'.repeat(info.bossHP);
    const state=mission.getState();activeSublevel=state.sublevel||'main';transitionSerial=state.transitionSerial??0;resetCourseCamera(state);applyCourseAppearance();updateCamera(1,true);updateHUD();if(!launchOptions.opening)message(launchOptions.entry?(state.subobjective||state.challengeHint||info.intro):info.intro,7);$('start').disabled=false;
  }catch(error){fatal(error);}
}
function pauseGame(){if(mode!=='play')return;mode='paused';show('pause');clearInput();sound.play('click');}
function resumeGame(){hide('pause');hide('controls');mode='play';clearInput();sound.resume();}
function openControls(){if(!['title','play','paused'].includes(mode))return;modeBeforeModal=mode;modalPreviousFocus=document.activeElement;if(mode==='play')mode='paused';show('controls');clearInput();$('close-controls').focus?.();}
function closeControls(){hide('controls');clearInput();if(modeBeforeModal==='play')mode='play';modalPreviousFocus?.focus?.();}
function openAbout(){if(mode!=='title')return;modalPreviousFocus=document.activeElement;show('about');clearInput();$('close-about').focus?.();}
function closeAbout(){hide('about');clearInput();modalPreviousFocus?.focus?.();}
function openPlazaJournal(){
  if(activeId!=='plaza'||!['play','paused'].includes(mode))return;
  journalReturnMode=mode;journalPreviousFocus=document.activeElement;mode='journal';hide('pause');clearInput();
  const state=mission.getState(),bank=campaign.plazaProgress(),collected=new Set(bank.collectedEpisodes);
  for(const ep of state.collectedEpisodes||[])collected.add(ep);
  $('journal-summary').textContent=collected.size+' of 11 town Shines · '+bank.blueCoins.length+' of 19 blue coins found';
  $('journal-town-count').textContent=collected.size+' / 11';$('journal-blue').textContent=bank.blueCoins.length+' / 19 found';
  $('journal-trader').textContent=bank.trades?'1 exchange Shine saved · '+bank.balance+' blue coins remain.':bank.balance>=10?'You have '+bank.balance+' blue coins. Visit the boathouse to exchange ten for a Shine.':bank.balance+' saved · Find '+(10-bank.balance)+' more for the boathouse exchange.';
  for(let ep=1;ep<=11;ep++){const button=$('journal-focus-'+ep),done=collected.has(ep);button.textContent=(done?'✳ ':'○ ')+String(ep).padStart(2,'0')+' · '+getCourseInfo('plaza',ep).episode;button.setAttribute('aria-pressed',String(!state.trackedDestination&&(state.episode??activeEpisode)===ep));button.classList.toggle('complete',done);}
  for(const id of DESTINATIONS){const button=$('journal-'+id);button.classList.toggle('complete',!!episodeRecord(campaign.state,id,1)?.shine);button.setAttribute('aria-pressed',String(state.trackedDestination===id));}
  $('journal-location').textContent=(state.navigationLabel||'Tracked objective')+' · '+(state.area||'Delfino Plaza');
  paintPlazaMap($('journal-map'),world,player,state);show('plaza-journal');$('journal-close').focus?.();
}
function closePlazaJournal(){if(mode!=='journal')return;hide('plaza-journal');mode=journalReturnMode;clearInput();if(mode==='paused')show('pause');journalPreviousFocus?.focus?.();}
function setHudVisibility(visible){for(const el of document.querySelectorAll('.top-hud,.bottom-hud,.touch-controls'))el.style.visibility=visible?'':'hidden';}
function togglePhoto(){if(mode==='photo'){mode='play';hide('photo-label');setHudVisibility(true);return;}if(!['play','paused'].includes(mode))return;if(lookMode){lookMode=false;document.body.dataset.look='false';character.group.visible=true;resetCourseCamera(mission.getState());}mode='photo';photoDistance=cameraDistance;hide('pause');hide('boss-hud');hide('challenge-hud');hide('toast');hide('interaction');show('photo-label');clearInput();setHudVisibility(false);}
function switchNozzle(){
  if(!player)return;const state=mission.getState();
  if(state.riding){message('The coaster uses the jet. Aim with the camera; E / SPRAY fires a loaded rocket.',4);return;}
  if(state.nozzleLocked){message(state.nozzleLockHint||'The boat uses spray recoil. Spray behind you to move forward.',4);return;}
  if(player.nozzleEnabled===false){message(state.nozzleUnavailableHint||'The sprayer stays outside this secret. Jump across the pasta.',4);return;}
  const modes=world.nozzleModes||['spray','hover'];if(!modes.length)return;
  player.nozzle=modes[(modes.indexOf(player.nozzle)+1)%modes.length];player.turboCharge=player.rocketCharge=0;player.turboActive=false;
  audioEvent('click');message({spray:'Spaghetti Jet: hold E / SPRAY to clean and operate pasta mechanisms.',hover:'Linguine Hover: jump, then hold Space / JUMP in midair.',turbo:'Bucatini Turbo: hold E / BOOST to charge, then steer with movement. Jump over the boats.',rocket:'Rigatoni Rocket: hold E / CHARGE to launch. At the top, press F / DOWN to ground pound.'}[player.nozzle],4.5);
}
function damage(amount,impulse){if(mode!=='play'||damageCooldown>0||won||!player)return;player.health=Math.max(0,player.health-amount);player.impulse(impulse);damageCooldown=1.4;flashUntil=time+.35;effects.burst(player.position.clone().add(new THREE.Vector3(0,1,0)),'hit');if(player.health<=0)respawn();}
function respawn(){
  if(!player)return;mission.cancelInteraction?.();
  const handled=mission.onRespawn?.(player)===true;
  if(!handled)player.reset(checkpoint.clone().add(new THREE.Vector3(0,.15,0)));
  player.health=8;character.reset();damageCooldown=2.2;
  cameraYaw=activeId==='bianco'&&checkpointStage===2?2.6:Math.PI;
  if(handled){const state=mission.getState();activeSublevel=state.sublevel||'main';transitionSerial=state.transitionSerial??transitionSerial;checkpoint.copy(player.position);resetCourseCamera(state);applyCourseAppearance();effects.reset();}
  character.setNozzleEnabled(mission.getState().nozzleVisualEnabled??player.nozzleEnabled);updateCamera(1,true);
  if(!handled)message('Back on your feet. Your last checkpoint has you.',4);sound.play('land');
}
function win(result={}){
  if(!mission||activeId!=='plaza'&&won)return;
  const plaza=activeId==='plaza',exchange=plaza&&result.exchange===true,episode=plaza&&Number.isInteger(result.episode)?result.episode:activeEpisode;
  if(!exchange&&!getCourseInfo(activeId,episode))return;
  const key=exchange?'exchange':String(episode);if(awardedThisVisit.has(key))return;awardedThisVisit.add(key);
  won=true;mode='win';clearInput();const s=mission.getState();
  if(!exchange){activeEpisode=episode;selectedEpisode=episode;campaign.select(activeId,episode);campaign.complete(activeId,{episode,time:Math.max(.01,playTime),coins:result.coins??s.coins});}
  const info=exchange?{name:'Delfino Plaza',win:'Ten blue coins exchanged. Your new Shine and the remaining coins are saved.',completionLabel:'BLUE COINS EXCHANGED'}:getCourseInfo(activeId,episode);
  $('win-course').textContent=info.name.toUpperCase()+(exchange?' · BOATHOUSE EXCHANGE':' · SHINE '+String(episode).padStart(2,'0'));$('win-description').textContent=info.win;
  $('result-time').textContent=timeLabel(playTime);$('result-coins').textContent=exchange?campaign.plazaProgress().balance:result.coins??s.coins;$('result-clean').textContent=exchange?10:result.cleaned??s.resultValue??s.blocksCrossed??s.cleaned??0;$('result-clean-label').textContent=info.completionLabel;
  $('win-total').textContent=campaign.shineCount+' OF '+TOTAL_SHINES+' SHINES COLLECTED';$('win-return').textContent=plaza?'Continue in Delfino Plaza ↗':'Return to Delfino Plaza ↗';
  $('explore').textContent=plaza?'Keep exploring the Plaza':'Keep exploring';show('win');hide('boss-hud');hide('challenge-hud');hide('interaction');effects.burst(player.position.clone().add(new THREE.Vector3(0,2,0)),'win');sound.play('win');
}

function installInput(){
  addEventListener('resize',resize);addEventListener('blur',()=>{clearInput();if(mode==='play')pauseGame();});addEventListener('contextmenu',e=>e.preventDefault());
  const trapFocus=(e,choices)=>{e.preventDefault();const index=choices.indexOf(document.activeElement);choices[(index+(e.shiftKey?-1:1)+choices.length)%choices.length].focus?.();};
  addEventListener('keydown',e=>{
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
    const helpDialog=!$('controls').classList.contains('hidden')?'controls':!$('about').classList.contains('hidden')?'about':null;
    if(helpDialog){if(e.code==='Tab')trapFocus(e,[$('close-'+helpDialog)]);else if(e.code==='Escape'){e.preventDefault();helpDialog==='controls'?closeControls():closeAbout();}return;}
    if(mode==='episode-select'){
      if(e.code==='Tab'){trapFocus(e,[...Array.from({length:EPISODE_COUNTS[pendingPortal.id]},(_,i)=>$('entry-episode-'+(i+1))),$('entry-confirm'),$('entry-cancel')]);return;}
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape'].includes(e.code))e.preventDefault();
      if(!e.repeat){if(e.code==='Escape')cancelEpisodeSelect();else if(['Enter','Space'].includes(e.code)){const focused=document.activeElement,ep=[1,2].find(n=>focused===$('entry-episode-'+n));if(focused===$('entry-cancel'))cancelEpisodeSelect();else if(ep)selectPortalEpisode(ep);else if(focused===$('entry-confirm')||e.code==='Enter')confirmEpisode();}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){const count=EPISODE_COUNTS[pendingPortal.id],delta=['ArrowUp','ArrowLeft'].includes(e.code)?-1:1;selectPortalEpisode((pendingPortal.episode-1+delta+count)%count+1);$('entry-episode-'+pendingPortal.episode).focus?.();}}
      return;
    }
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&['play','title'].includes(mode)&&!(mode==='title'&&e.code==='Space'&&e.target?.tagName==='BUTTON'))e.preventDefault();
    if(!e.repeat){
      if(e.code==='Escape'){if(!$('plaza-journal').classList.contains('hidden'))closePlazaJournal();else if(mode==='play'&&lookMode)toggleLook();else if(mode==='play')pauseGame();else if(mode==='paused')resumeGame();else if(mode==='photo')togglePhoto();return;}
      if(mode==='title'&&$('controls').classList.contains('hidden')&&$('about').classList.contains('hidden')&&e.code==='Enter'&&e.target?.tagName!=='BUTTON'){e.preventDefault();startGame();return;}
      if(e.code==='Tab'&&mode==='journal'){trapFocus(e,[$('journal-close'),...Array.from({length:11},(_,i)=>$('journal-focus-'+(i+1))),...DESTINATIONS.map(id=>$('journal-'+id))]);return;}
      if(e.code==='Tab'&&activeId==='plaza'&&mode==='play'){e.preventDefault();openPlazaJournal();return;}
      if(e.code==='KeyV'&&mode==='play'){toggleLook();return;}
      if(e.code==='KeyQ'&&mode==='play')switchNozzle();
      if(e.code==='KeyC'&&mode==='play'){cameraYaw=player.heading;if(lookMode)cameraPitch=0;}
      if(e.code==='KeyR'&&mode==='play')respawn();
      if(e.code==='KeyP'&&['play','paused','photo'].includes(mode))togglePhoto();
      if(e.code==='KeyM'){sound.setEnabled(!sound.enabled);$('sound-btn').textContent=sound.enabled?'Sound on':'Sound off';saveSettings();}
    }
    if(mode==='play')keys.add(e.code);
  });
  addEventListener('keyup',e=>keys.delete(e.code));const canvas=$('world');
  canvas.addEventListener('pointerdown',e=>{if(!['play','photo'].includes(mode))return;mouse.drag=true;mouse.moved=false;mouse.x=e.clientX;mouse.y=e.clientY;mouse.id=e.pointerId;mouse.spray=e.pointerType==='mouse'&&e.button===0&&mode==='play'&&!lookMode;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!mouse.drag||e.pointerId!==mouse.id||mode!=='photo'&&mission?.getState().cameraMode==='fixed')return;const dx=e.clientX-mouse.x,dy=e.clientY-mouse.y;mouse.x=e.clientX;mouse.y=e.clientY;if(Math.abs(dx)+Math.abs(dy)>2){mouse.moved=true;mouse.spray=false;}cameraYaw-=dx*.005;cameraPitch=clamp(cameraPitch+dy*.003,lookMode?-1.55:mission?.getState().riding?-.45:.12,1.05);});
  const stopMouse=()=>{mouse.drag=false;mouse.spray=false;mouse.id=null;};canvas.addEventListener('pointerup',stopMouse);canvas.addEventListener('pointercancel',stopMouse);
  canvas.addEventListener('wheel',e=>{if(['play','photo'].includes(mode)){e.preventDefault();if(lookMode||mode!=='photo'&&mission?.getState().cameraMode==='fixed')return;if(mode==='photo')photoDistance=clamp(photoDistance+e.deltaY*.015,3,45);else cameraDistance=clamp(cameraDistance+e.deltaY*.012,5,18);}},{passive:false});
  let joyId=null;const joy=$('joystick'),knob=$('joystick-knob');const joyMove=e=>{if(e.pointerId!==joyId||mode!=='play'||lookMode)return;const r=joy.getBoundingClientRect(),max=r.width*.34;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const d=Math.hypot(x,y);if(d>max){x=x/d*max;y=y/d*max;}touch.x=x/max;touch.y=y/max;knob.style.transform=`translate(${x}px,${y}px)`;};joy.addEventListener('pointerdown',e=>{if(mode!=='play'||lookMode)return;e.preventDefault();joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e);});joy.addEventListener('pointermove',joyMove);const joyEnd=e=>{if(e.pointerId===joyId){joyId=null;touch.x=touch.y=0;knob.style.transform='';}};joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
  for(const [id,key] of [['touch-jump','jump'],['touch-spray','spray'],['touch-grab','grab'],['touch-trick','trick']]){const el=$(id);el.addEventListener('pointerdown',e=>{if(mode!=='play'||lookMode)return;e.preventDefault();touch[key]=true;el.setPointerCapture(e.pointerId);el.classList.add('held');});const end=()=>{touch[key]=false;el.classList.remove('held');};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);}
  $('start').onclick=startGame;$('title-controls').onclick=openControls;$('close-controls').onclick=closeControls;$('controls-btn').onclick=openControls;$('title-about').onclick=openAbout;$('close-about').onclick=closeAbout;$('pause-btn').onclick=pauseGame;$('resume').onclick=resumeGame;
  const restart=()=>launchCourse(activeId,activeEpisode,activeId==='plaza'?{}:{...activeLaunchOptions});$('restart').onclick=restart;$('replay').onclick=restart;$('explore').onclick=continueExploring;$('win-return').onclick=returnToPlaza;
  $('return-title').onclick=()=>activeId==='plaza'?showOpeningScreen():returnToPlaza();$('title-exit').onclick=showOpeningScreen;
  for(let ep=1;ep<=2;ep++)$('entry-episode-'+ep).onclick=()=>selectPortalEpisode(ep);$('entry-confirm').onclick=confirmEpisode;$('entry-cancel').onclick=cancelEpisodeSelect;
  $('look-btn').onclick=toggleLook;$('photo-btn').onclick=togglePhoto;$('nozzle-btn').onclick=switchNozzle;$('touch-nozzle').onclick=switchNozzle;$('sound-btn').onclick=()=>{sound.setEnabled(!sound.enabled);$('sound-btn').textContent=sound.enabled?'Sound on':'Sound off';saveSettings();};$('quality').onchange=e=>setQuality(e.target.value);$('firmness').oninput=updateFirmness;
  $('plaza-open').onclick=openPlazaJournal;$('pause-journal').onclick=openPlazaJournal;$('journal-close').onclick=closePlazaJournal;
  for(let ep=1;ep<=11;ep++)$('journal-focus-'+ep).onclick=()=>{if(mode!=='journal')return;if(mission?.setFocus?.(ep)!==false){activeEpisode=ep;selectedEpisode=ep;campaign.select('plaza',ep);closePlazaJournal();message('Tracking '+getCourseInfo('plaza',ep).episode+'. All other objectives remain available.',4);updateHUD();}};
  for(const id of DESTINATIONS)$('journal-'+id).onclick=()=>{if(mode!=='journal'||mission?.trackDestination?.(id)===false)return;closePlazaJournal();message(getCourseInfo(id,1).name+' entrance marked. Follow the guide through the Plaza.',5);updateHUD();};
}
function readInput(){
  input.lookMode=lookMode;
  if(lookMode){cameraYaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*.025;cameraPitch=clamp(cameraPitch+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*.025,-1.55,1.05);}
  input.forward=lookMode?0:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-touch.y;
  input.right=lookMode?0:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;
  input.jump=!lookMode&&(keys.has('Space')||touch.jump);input.jumpHeld=input.jump;
  const pound=(activeId==='sirena'&&activeSublevel==='secret')||['airstrip','corona','plaza','field'].includes(activeId);
  input.slide=!lookMode&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||(touch.trick&&!pound));input.flop=!lookMode&&(keys.has('KeyF')||(touch.trick&&pound));input.spray=!lookMode&&(keys.has('KeyE')||mouse.spray||touch.spray);
  input.grab=!lookMode&&['ricco','pinna','sirena','noki','pianta','airstrip','corona',...PLAZA_AREAS].includes(activeId)&&(keys.has('KeyG')||touch.grab);
  input.cameraYaw=mission?.getState().cameraMode==='fixed'?(mission.getState().cameraYaw??Math.PI):cameraYaw;input.cameraPitch=cameraPitch;
}
function checkCheckpoints(){const p=player.position;let next=checkpointStage,pos;if(activeId==='bianco'){if(next<1&&p.z<9&&p.x<-9){next=1;pos=[-36,7];}if(next<2&&p.x>1&&p.z<20){next=2;pos=[3,13];}}else if(activeId==='ricco'){if(next<1&&p.x>3&&p.z<-7&&p.y>3){next=1;pos=[4,-9];}if(next<2&&p.x>11&&p.z<-12&&p.y>3){next=2;pos=[14,-15];}if(next<3&&p.z<-28&&p.y>7){next=3;pos=[35,-30];}}if(next!==checkpointStage&&pos){checkpointStage=next;checkpoint.set(pos[0],world.heightAt(...pos)+.12,pos[1]);checkpointUntil=time+2.2;sound.play('coin');if(activeId==='ricco'&&next===3)message('Upper harbor checkpoint. Refill at the pasta fountain; inspect the crates ahead.',6);}}
function step(dt){
  time+=dt;damageCooldown=Math.max(0,damageCooldown-dt);if(mode==='title'||mode==='loading-level'){if(mode==='title')world?.update(dt,time,null);return;}
  if(mode==='play'&&session){
    levelTime+=dt;if(!won||activeId==='plaza')playTime+=dt;readInput();session.step(dt,levelTime,input,firmness);if(mode!=='play')return;const state=mission.getState();syncSublevel(state);character.group.position.copy(player.position);if(state.playerVisualOffset)character.group.position.add(state.playerVisualOffset);character.group.visible=!state.hidePlayer&&!lookMode;character.group.rotation.y=player.heading;character.update(dt,{time,speed:player.speed,grounded:player.grounded,vy:player.velocity.y,spraying:player.spraying,grabbing:!!state.grabbing,pullTension:state.pullTension||0,hovering:player.hovering,ragdoll:player.ragdoll,velocity:player.velocity,turnVelocity:player.turnVelocity,firmness,nozzleEnabled:state.nozzleVisualEnabled??player.nozzleEnabled});
    if(player.spraying){
      character.group.updateMatrixWorld(true);character.nozzle.getWorldPosition(origin);if(state.sprayOriginOffset)origin.copy(player.position).add(state.sprayOriginOffset);direction.set(Math.sin(player.heading),.09,Math.cos(player.heading)).normalize();
      if(state.riding)direction.set(Math.sin(cameraYaw)*Math.cos(cameraPitch),-Math.sin(cameraPitch),Math.cos(cameraYaw)*Math.cos(cameraPitch));
      const assistedTarget=state.aimTarget||(['bianco','ricco'].includes(activeId)?state.bossPosition:null);
      if(assistedTarget){target.copy(assistedTarget);if(!state.aimTarget)target.y+=2.7;tmp.copy(target).sub(origin);const distance=tmp.length(),allowed=!!state.aimTarget||(state.bossPhase!=='defeated'&&(activeId==='bianco'||state.bossPhase!=='hidden'));if(allowed&&distance<(state.aimRange??(state.riding?95:activeId==='gelato'?14:23))&&distance>0&&direction.dot(tmp.clone().normalize())>(state.aimThreshold??.63))direction.copy(tmp.normalize());}
      effects.spray(origin,direction,dt);session.spray(origin,direction,dt);sound.play('spray');
    }
    if(player.hovering||(player.rocketPowered&&player.velocity.y>0)){origin.copy(player.position);origin.y+=1;effects.hover(origin,dt);sound.play('hover');}
    if(player.turboActive){origin.copy(player.position);origin.y+=.7;direction.set(-Math.sin(player.heading),-.1,-Math.cos(player.heading));effects.spray(origin,direction,dt);sound.play('spray');}
    if(world.inkAt?.(player.position.x,player.position.z)&&player.wet)damage(1,new THREE.Vector3(0,2,0));sound.update(dt,player.grounded?player.speed:0,player.wet);checkCheckpoints();effects.update(dt,time,world);
  }else if(mode==='win'&&world){world.update(dt,levelTime,player);effects.update(dt,time,world);}
}
function fixedCourseCamera(view,width,height){
  const portrait=width<height,aspect=width/height,tan=Math.tan(THREE.MathUtils.degToRad(53/2));
  const normal=view.cameraPosition.clone().sub(view.cameraTarget),baseDistance=normal.length();normal.normalize();
  const verticalFraction=portrait?(height<650?.36:.55):.72;
  const distance=Math.max(baseDistance*Math.max(1,(view.cameraReferenceAspect||.72)/aspect),(view.cameraContentHeight||46)/(2*tan*verticalFraction),(view.cameraContentWidth||31)/(2*tan*aspect*(portrait?.92:.48)));
  const right=new THREE.Vector3(0,1,0).cross(normal).normalize(),up=normal.clone().cross(right).normalize();
  // Shift the complete board into the free middle of the screen; keep touch
  // controls outside the board instead of clipping the launcher or top pocket.
  const target=view.cameraTarget.clone().addScaledVector(up,-.06*distance*tan);
  return {target,position:target.clone().addScaledVector(normal,distance)};
}
function updateCamera(dt,snap=false){
  if(mode==='title'){cameraFocus.set(-4,7,-5);cameraDesired.set(-56+Math.sin(time*.045)*12,54,78+Math.cos(time*.045)*8);camera.position.lerp(cameraDesired,snap?1:1-Math.exp(-dt*2));camera.lookAt(cameraFocus);openingLogo?.update(time,camera.aspect);sun.position.set(-25,65,35);sun.target.position.set(0,4,0);return;}
  if(!player)return;if(lookMode&&mode!=='photo'){camera.position.copy(player.position).add(new THREE.Vector3(0,1.6,0));cameraFocus.copy(camera.position).add(new THREE.Vector3(Math.sin(cameraYaw)*Math.cos(cameraPitch),-Math.sin(cameraPitch),Math.cos(cameraYaw)*Math.cos(cameraPitch)));camera.lookAt(cameraFocus);return;}const view=mission.getState();if(mode!=='photo'&&view.cameraMode==='fixed'&&view.cameraPosition&&view.cameraTarget){const frame=fixedCourseCamera(view,innerWidth,innerHeight);cameraFocus.copy(frame.target);cameraDesired.copy(frame.position);camera.position.lerp(cameraDesired,snap?1:1-Math.exp(-dt*7));camera.lookAt(cameraFocus);sun.position.copy(cameraFocus).add(new THREE.Vector3(-25,40,30));sun.target.position.copy(cameraFocus);return;}const distance=mode==='photo'?photoDistance:cameraDistance;cameraFocus.copy(player.position);cameraFocus.y+=1.5;cameraDesired.set(cameraFocus.x-Math.sin(cameraYaw)*Math.cos(cameraPitch)*distance,cameraFocus.y+Math.sin(cameraPitch)*distance,cameraFocus.z-Math.cos(cameraYaw)*Math.cos(cameraPitch)*distance);
  if(mode!=='photo'&&!mission.getState().riding){cameraDesired.y=Math.max(cameraDesired.y,world.heightAt(cameraDesired.x,cameraDesired.z)+1.4);tmp.copy(cameraDesired).sub(cameraFocus);let allowed=1;for(let i=3;i<=18;i++){const t=i/18,px=cameraFocus.x+tmp.x*t,py=cameraFocus.y+tmp.y*t,pz=cameraFocus.z+tmp.z*t;if(world.colliders.some(c=>px>c.minX-.2&&px<c.maxX+.2&&pz>c.minZ-.2&&pz<c.maxZ+.2&&py>=(c.bottom??-10)&&py<c.top+.3)){allowed=Math.max(.23,(i-1)/18);break;}}if(allowed<1)cameraDesired.copy(cameraFocus).addScaledVector(tmp,allowed);}
  if(mode!=='photo'&&activeId==='plaza')clipCameraSegment(cameraFocus,cameraDesired,world.colliders,cameraDesired);
  camera.position.lerp(cameraDesired,snap?1:1-Math.exp(-dt*7));if(mode!=='photo'&&activeId==='plaza')clipCameraSegment(cameraFocus,camera.position,world.colliders,camera.position);camera.lookAt(cameraFocus);sun.position.set(player.position.x-35,player.position.y+65,player.position.z+32);sun.target.position.copy(player.position);
}
function drawCourseMap(s){
  const ctx=$('minimap').getContext('2d'),w=168,b=world.bounds,secret=s.sublevel==='secret',data=world.mapData||{};
  const mx=x=>(x-b.x0)/(b.x1-b.x0)*w,mz=z=>(z-b.z0)/(b.z1-b.z0)*w;
  ctx.clearRect(0,0,w,w);ctx.save();ctx.beginPath();ctx.arc(84,84,84,0,Math.PI*2);ctx.clip();ctx.fillStyle=secret?'#101e1de8':activeId==='corona'?'#4b2016e8':'#285a51e8';ctx.fillRect(0,0,w,w);
  if(!secret){
    // Sample the same beach surface used by locomotion so the shoreline and
    // small starting island stay aligned with the procedural world.
    const cells=28,step=w/cells;ctx.fillStyle='#d6bf85a8';
    for(let iz=0;iz<cells;iz++)for(let ix=0;ix<cells;ix++){const x=b.x0+(ix+.5)/cells*(b.x1-b.x0),z=b.z0+(iz+.5)/cells*(b.z1-b.z0),surface=world.surfaceAt(x,z);if(!['water','void','lava','poison'].includes(surface)){ctx.fillStyle=surface==='hot'?'#b24a28c0':'#d6bf85a8';ctx.fillRect(ix*step,iz*step,step+.2,step+.2);}}
  }
  for(const p of data.platforms||[]){const ww=p.w??p.width??p.size??3,dd=p.d??p.depth??p.size??3,x=p.minX??p.x-ww/2,z=p.minZ??p.z-dd/2;ctx.fillStyle=p.active===false||p.support===false||p.collapsed?'#b6ab7840':p.kind==='safe'||p.kind==='firm'||p.stable?'#c79055e0':'#ede0a6c2';ctx.fillRect(mx(x),mz(z),ww/(b.x1-b.x0)*w,dd/(b.z1-b.z0)*w);}
  const route=activeId==='plaza'?(s.navigationRoute||[]):data.route||[];ctx.strokeStyle='#f6dfa8a0';ctx.lineWidth=1;ctx.setLineDash([2,3]);ctx.beginPath();route.forEach((p,i)=>{const x=Array.isArray(p)?p[0]:p.x,z=Array.isArray(p)?p[1]:p.z;i?ctx.lineTo(mx(x),mz(z)):ctx.moveTo(mx(x),mz(z));});ctx.stroke();ctx.setLineDash([]);
  if(activeId==='gelato'&&!secret){const bud=world.landmarks.duneBud;if(bud){ctx.fillStyle='#82a76d';ctx.beginPath();ctx.arc(mx(bud.x),mz(bud.z),3.5,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#f9e7b7c9';ctx.font='7px Arial';ctx.textAlign='center';ctx.fillText('DUNE BUD',mx(-10),mz(12));}
  const mapGoal=activeId==='plaza'?s.navigationTarget:!s.shineCollected?s.goalPosition:null;if(mapGoal){ctx.strokeStyle='#f2cd73';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(mx(mapGoal.x),mz(mapGoal.z),4+Math.sin(time*3)*.7,0,Math.PI*2);ctx.stroke();}
  ctx.save();ctx.translate(mx(player.position.x),mz(player.position.z));ctx.rotate(-player.heading);ctx.fillStyle='#fff4d2';ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(-3,-3);ctx.lineTo(3,-3);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
}
function drawMap(s){
  if(['gelato','pinna','sirena','noki','pianta','airstrip','corona',...PLAZA_AREAS].includes(activeId)){drawCourseMap(s);return;}
  const ctx=$('minimap').getContext('2d'),w=168,b=world.bounds||{x0:-65,x1:72,z0:-51,z1:47};ctx.clearRect(0,0,w,w);ctx.save();ctx.beginPath();ctx.arc(84,84,84,0,Math.PI*2);ctx.clip();ctx.fillStyle=activeId==='ricco'?'#243e3ae8':'#1f2e19e8';ctx.fillRect(0,0,w,w);const mx=x=>(x-b.x0)/(b.x1-b.x0)*w,mz=z=>(z-b.z0)/(b.z1-b.z0)*w;
  if(activeId==='bianco'){ctx.fillStyle='#738f795c';ctx.beginPath();ctx.ellipse(mx(39),mz(-8),25/(b.x1-b.x0)*w,27/(b.z1-b.z0)*w,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#cdbb8080';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mx(-5),mz(-32));ctx.lineTo(mx(-5),mz(8));ctx.moveTo(mx(-5),mz(18));ctx.lineTo(mx(-5),mz(24));ctx.stroke();}else{ctx.fillStyle='#d6b87f60';for(const [x,z,ww,dd]of[[-47,29,14,14],[-41,5,20,23],[-15,-9,19,19],[27,-34,17,10],[17,-54,26,21]])ctx.fillRect(mx(x),mz(z),ww/(b.x1-b.x0)*w,dd/(b.z1-b.z0)*w);}
  ctx.strokeStyle='#e3c88580';ctx.lineWidth=1;ctx.setLineDash([2,3]);ctx.beginPath();const route=activeId==='bianco'?[[-43,36],[-37,18],[-37,9],[-28,4],[-10,4],[-10,13],[4,13],[8,4],[12,-4],[9,-14],[22,-25]]:[[-42,37],[-35,25],[-23,11],[-14,5],[-7,0],[4,-9],[14,-15],[19,-20],[28,-23],[33,-23],[35,-30],[29,-36],[29,-44]];route.forEach(([x,z],i)=>i?ctx.lineTo(mx(x),mz(z)):ctx.moveTo(mx(x),mz(z)));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#cabd8d94';for(const c of world.colliders.filter(c=>c.kind==='house'||c.kind==='warehouse'))ctx.fillRect(mx(c.minX),mz(c.minZ),Math.max(2,(c.maxX-c.minX)/(b.x1-b.x0)*w),(c.maxZ-c.minZ)/(b.z1-b.z0)*w);
  ctx.fillStyle='#eee2b69c';ctx.font='7px Arial';ctx.textAlign='center';if(activeId==='bianco'){ctx.fillText('VILLAGE',mx(-30),mz(-22));ctx.fillText('WINDMILL',mx(39),mz(-30));}else{ctx.fillText('FREIGHTER',mx(-31),mz(11));ctx.fillText('PLAZA',mx(29),mz(-48));}if(!s.shineCollected&&s.goalPosition){ctx.strokeStyle='#f2cd73';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(mx(s.goalPosition.x),mz(s.goalPosition.z),4+Math.sin(time*3)*.7,0,Math.PI*2);ctx.stroke();}ctx.save();ctx.translate(mx(player.position.x),mz(player.position.z));ctx.rotate(-player.heading);ctx.fillStyle='#fff0bc';ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(-3,-3);ctx.lineTo(3,-3);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
}
function updateHUD(){
  if(!mission||!player)return;
  const s=mission.getState(),info=getCourseInfo(activeId,activeEpisode),nozzleAvailable=player.nozzleEnabled!==false;
  $('coin-count').textContent=String(s.coins).padStart(2,'0');$('shine-count').innerHTML=(activeId==='plaza'?campaign.plazaProgress().collectedEpisodes.length:s.shineCollected?'1':'0')+'<span class="muted"> / '+(activeId==='plaza'?11:1)+'</span>';$('health-label').textContent=player.health+' / 8';
  document.querySelectorAll('#health i').forEach((e,i)=>e.classList.toggle('empty',i>=player.health));
  const nozzleName=s.nozzleName||{spray:'SPAGHETTI JET',hover:'LINGUINE HOVER',turbo:'BUCATINI TURBO',rocket:'RIGATONI ROCKET'}[player.nozzle]||'SPAGHETTI JET';
  const nozzleAction=s.sprayActionLabel||(player.nozzle==='turbo'?'BOOST':player.nozzle==='rocket'?'CHARGE':'SPRAY');
  $('tank-fill').style.width=(nozzleAvailable?player.tank:0)+'%';$('nozzle-label').textContent=s.riding?(s.rocketLoaded?'PASTA ROCKET · READY':'JET · NEXT ROCKET AHEAD'):!nozzleAvailable?(s.nozzleUnavailableLabel||'SECRET COURSE · NO SPRAYER'):s.boating?'JET · SPRAY RECOIL':player.rocketCharge>0?'ROCKET · '+Math.round(player.rocketCharge*100)+'%':player.turboActive?'TURBO · FULL THROTTLE':nozzleName;
  $('touch-spray-label').textContent=nozzleAction;$('touch-spray').setAttribute('aria-label',s.sprayActionAria|| (player.nozzle==='turbo'?'Hold to charge and use Turbo':player.nozzle==='rocket'?'Hold to charge a rocket jump':'Hold to spray'));$('spray-guide-label').textContent=s.sprayActionLabel?s.sprayActionLabel[0]+s.sprayActionLabel.slice(1).toLowerCase():player.nozzle==='spray'?'Spray':player.nozzle==='turbo'?'Boost':player.nozzle==='rocket'?'Charge':'Spray';
  document.body.dataset.nozzle=nozzleAvailable?'available':'removed';
  for(const id of ['nozzle-btn','touch-nozzle','touch-spray']){const disabled=!nozzleAvailable||((s.riding||s.nozzleLocked)&&id!=='touch-spray');$(id).disabled=!!disabled;$(id).classList.toggle('nozzle-disabled',!!disabled);}
  $('spray-guide').classList.toggle('hidden',!nozzleAvailable);$('nozzle-guide').classList.toggle('hidden',!nozzleAvailable||!!s.riding||!!s.nozzleLocked);
  $('refill-label').textContent=s.riding?'Rockets are collected along the rails':!nozzleAvailable?(s.nozzleUnavailableHint||'Secret course · sprayer removed'):player.wet||world.refillAt?.(player.position.x,player.position.z,player.position.y)?'REFILLING NOODLES…':s.refillHint||(activeId==='corona'?'Refill at the pasta sprinklers and nozzle boxes':activeId==='airstrip'?'Refill in the pasta sea or runway pool':activeId==='pianta'?'Refill in the cool pasta pool':activeId==='noki'?'Refill at fresh pasta springs':activeId==='ricco'?'Refill at the pasta fountain or sea':['gelato','pinna','sirena','noki','pianta'].includes(activeId)?'Refill in the spaghetti sea or pools':'Refill in the pasta river or lake');
  const inPlaza=activeId==='plaza';$('plaza-open').classList.toggle('hidden',!inPlaza);$('pause-journal').classList.toggle('hidden',!inPlaza);$('blue-count').classList.toggle('hidden',!inPlaza);
  if(inPlaza){const bank=campaign.plazaProgress();$('blue-count').textContent='◇ '+bank.blueCoins.length+' / 19';$('blue-count').setAttribute('aria-label',bank.blueCoins.length+' of nineteen blue coins found, '+bank.balance+' unspent');$('hud-episode').textContent=s.trackedDestination?'WORLD ENTRANCE':'TRACKING '+String(s.episode??activeEpisode).padStart(2,'0');}
  $('look-btn').classList.toggle('hidden',!inPlaza);$('look-btn').setAttribute('aria-pressed',String(lookMode));$('look-btn').textContent=lookMode?'EXIT LOOK':'LOOK';$('look-guide').classList.toggle('hidden',!lookMode||mode!=='play');$('return-title').textContent=inPlaza?'Return to opening screen':'Leave the episode · Delfino Plaza';$('title-exit').classList.toggle('hidden',inPlaza);$('restart').textContent=inPlaza?'Restart town objective':'Restart mission';
  const nav=inPlaza&&s.navigationTarget&&(!s.shineCollected||s.trackedDestination)&&mode==='play';$('goal-nav').classList.toggle('hidden',!nav);if(nav){const d=player.position.distanceTo(s.navigationTarget);$('goal-nav').textContent=(s.navigationLabel||'Tracked objective')+' · '+Math.round(d)+' m';}
  let title,subtitle,area;
  if(won&&activeId!=='plaza'){title='This Shine is yours';subtitle='Keep exploring, or leave the episode to return to Delfino Plaza.';area='EPISODE COMPLETE';}
  else if(['gelato','pinna','sirena','noki','pianta','airstrip','corona',...PLAZA_AREAS].includes(activeId)){title=s.objective||info.episode;subtitle=s.subobjective||info.intro;area=s.area||info.name.toUpperCase();}
  else if(activeId==='ricco'){
    title=s.objective||'Investigate the upper harbor';subtitle=s.subobjective||'Follow the pasta cranes toward the freight crates.';area=s.area||'RICCO HARBOR';
    if(s.bossPhase==='hidden'&&player.position.y<7){const p=player.position,ws=world.getState?.()||{};if(p.x<-20){title='Board the pasta freighter';subtitle='Take the ramp, then head right toward the moving crane.';area='THE CARGO SHIP';}else if(p.x<5){title='Cross the suspended pasta maze';subtitle='Ride the crane platform and follow the mesh walkways.';area='THE PASTA GANTRIES';}else if(p.x<20&&!ws.submarineRaised){title='Bring up the yellow submarine';subtitle='Spray the pasta fan beside the two Piantas.';area='THE SUBMARINE';}else{title='Reach the upper harbor';subtitle='Spray the Bloopads, cross the sub, and ride the red crane up.';area='THE CRANE LIFT';}}
  }else if(s.bossPhase==='defeated'){title='Collect the pasta Shine';subtitle='The road is clear. Walk into the golden Shine ahead.';area='THE RESTORED ROAD';}else if(s.bossPhase==='fighting'||s.bossPhase==='emerging'){title='Open mouth. Fresh spaghetti.';subtitle='Hold E / SPRAY when its mouth opens. Three hits to win.';area='PROTO PIRANHA';}else if(player.position.x>0){title='Clear the road to the windmill';subtitle='Spray dark tangles. Follow the uphill path to the mound.';area='THE LAKESIDE APPROACH';}else if(player.position.x>-17){title='The gate is closed';subtitle='Go around through the waterwheel on your right.';area='THE WATERWHEEL';}else if(player.position.z<11){title='Cross the pasta village';subtitle='Follow the rigatoni toward the wall and waterwheel.';area='WINDMILL VILLAGE';}else{title='Follow the path to the village';subtitle='Cross the spaghetti rope over the river.';area='THE ENTRY SLOPE';}
  $('objective').textContent=title;$('subobjective').textContent=subtitle;$('area-label').textContent=area;
  const nearBoss=info.bossHP>0&&s.bossPosition&&(s.riding||player.position.distanceTo(s.bossPosition)<24)&&!s.shineCollected&&s.bossPhase!=='defeated'&&mode==='play';
  $('boss-hud').classList.toggle('hidden',!nearBoss);document.querySelectorAll('.boss-health i').forEach((e,i)=>e.classList.toggle('empty',i>=s.bossHP));
  if(info.bossHP>0){$('mouth-status').textContent=s.bossStatus||(activeId==='pinna'?(s.bossStatus||(s.riding?(s.rocketLoaded?'ROCKET READY · AIM & FIRE':'SPRAY THE BILLS · NEXT ROCKET AHEAD'):'SPRAY A BOMB · GRAB · RELEASE TO THROW')):activeId==='ricco'?(s.bossPhase==='hidden'?'Pull the tentacle from the crate':s.grabbing?'PULL BACK · RELEASE WHEN STRETCHED':s.faceClean?'FACE CLEAN · GRAB AND PULL':'Wash the ink from its face'):(s.bossPhase==='hidden'?'Spray the mound to reveal it':s.bossPhase==='emerging'?'The tangle is waking up…':s.open?'MOUTH OPEN · SPRAY NOW':'Wait for the mouth to open'));$('mouth-status').style.color=s.open||s.faceClean?'#fff2af':'#ead1a4';}
  const secret=s.sublevel==='secret',remaining=Math.max(0,s.portalRemaining||0);
  const challenge=['gelato','pinna','sirena','noki','pianta','airstrip','corona',...PLAZA_AREAS].includes(activeId)&&mode==='play'&&(!won||activeId==='plaza')&&!nearBoss;
  $('challenge-hud').classList.toggle('hidden',!challenge);
  if(challenge){
    if(activeId==='gelato'){
      $('challenge-label').textContent=secret?'THE SAND CASTLE SECRET':remaining>0?'THE PORTAL IS OPEN':'THE DUNE BUD';
      $('challenge-status').textContent=secret?(s.blocksCrossed||0)+' BLOCKS CROSSED'+(s.retries?' · '+s.retries+' RETRIES':''):remaining>0?Math.ceil(remaining)+'s · ENTER THE ARCH':'SPRAY TO RAISE THE CASTLE';
      $('challenge-meter').classList.toggle('hidden',secret||remaining<=0);$('challenge-fill').style.width=clamp(remaining/(s.portalDuration||15),0,1)*100+'%';
      $('challenge-hint').textContent=secret?'Keep moving on pale pasta. Rest on orange blocks.':remaining>0?'Run through before it crumbles.':'Look beside the teardrop peninsula.';
    }else{
      $('challenge-label').textContent=s.challengeLabel||info.episode.toUpperCase();
      $('challenge-status').textContent=s.challengeStatus||(secret?(s.blocksCrossed||0)+' BLOCKS CROSSED'+(s.retries?' · '+s.retries+' RETRIES':''):s.stageLabel||'FOLLOW THE PASTA');
      $('challenge-hint').textContent=s.challengeHint||(secret?'No sprayer. Find your footing.':s.subobjective||'');
      const meter=Number.isFinite(s.progress)&&s.progressMax>0;$('challenge-meter').classList.toggle('hidden',!meter);$('challenge-fill').style.width=(meter?clamp(s.progress/s.progressMax,0,1)*100:0)+'%';
    }
  }
  const context=['ricco','pinna','sirena','noki','pianta','airstrip','corona',...PLAZA_AREAS].includes(activeId)&&(['airstrip','corona',...PLAZA_AREAS].includes(activeId)?s.contextAvailable===true:s.contextAvailable!==false)&&(!secret||PLAZA_AREAS.includes(activeId))&&!s.riding;
  $('touch-grab').classList.toggle('hidden',!context);$('grab-guide').classList.toggle('hidden',!context);
  const contextLabel=s.contextLabel||(activeId==='sirena'?'TALK':'GRAB');
  $('touch-grab-label').textContent=contextLabel;$('touch-grab').setAttribute('aria-label',s.contextAriaLabel||(contextLabel==='BOARD'?(activeId==='pinna'?'Board the roller coaster':'Board the pasta boat'):['DISEMBARK','LEAVE'].includes(contextLabel)?'Leave the pasta boat':contextLabel==='ENTER'?'Enter the nearby destination':contextLabel==='EXIT'?'Return to Delfino Plaza':contextLabel==='LAUNCH'?'Launch into the pachinko board':contextLabel==='RETURN'?'Return down the pasta chute':contextLabel==='RIDE'?'Ride Yoshi':contextLabel==='FEED'?'Feed Yoshi':contextLabel==='TAKE'?'Pick up the pasta fruit':contextLabel==='RACE'?'Start the race':contextLabel==='RETRY'?(activeId==='airstrip'?'Retry the red coin circuit':activeId==='plaza'?'Retry the crate challenge':'Retry the challenge'):contextLabel==='RELEASE'?'Release the stretched chain to launch':contextLabel==='DROP'?'Release to place the springboard':contextLabel==='TALK'?'Talk to the nearby character':contextLabel==='THROW'?'Release to throw the bomb':contextLabel==='PULL'?'Hold the chain, walk backward and release':'Hold to grab'));
  $('grab-guide-label').textContent=contextLabel==='BOARD'?'Board':['ENTER','EXIT','LAUNCH','RETURN','RIDE','FEED','EAT','TAKE','PLAZA','FRESH','DESCEND','CLIMB'].includes(contextLabel)?contextLabel[0]+contextLabel.slice(1).toLowerCase():['LEAVE','DISEMBARK'].includes(contextLabel)?'Leave boat':contextLabel==='RETRY'?'Retry':['TALK','RACE'].includes(contextLabel)?'Talk':activeId==='ricco'||activeId==='pianta'||(activeId==='noki'&&activeEpisode===2)?'Grab & pull':'Grab / release';
  const pound=(secret&&activeId==='sirena')||['airstrip','corona','plaza','field'].includes(activeId),trick=(secret&&['pinna','sirena'].includes(activeId))||((activeId==='pianta'&&activeEpisode===2||['airstrip','corona','plaza','slide','field'].includes(activeId))&&!context);
  $('touch-trick').classList.toggle('hidden',!trick);$('touch-trick-label').textContent=s.trickLabel||(pound?'DOWN':'DIVE');$('touch-trick').setAttribute('aria-label',activeId==='slide'?'Hold to brake on the slide':pound?'Ground pound while airborne':activeId==='pianta'?'Dive to gain speed in the race':'Dive along the disappearing path');$('trick-guide-label').textContent=activeId==='slide'?'Brake / Shift':pound?'Ground pound':'Flop';
  const interact=mode==='play'&&(!won||activeId==='plaza')&&!!(s.interactionPrompt||s.grabbing);
  $('interaction').classList.toggle('hidden',!interact);$('interaction-text').textContent=s.interactionPrompt||'Hold G / GRAB and walk backward.';$('pull-meter').classList.toggle('hidden',!s.grabbing);$('pull-fill').style.width=clamp(s.pullTension||0,0,1)*100+'%';$('pull-meter').classList.toggle('ready',(s.pullTension||0)>=1);
  $('toast').classList.toggle('hidden',time>toastUntil||mode!=='play');$('checkpoint-flash').classList.toggle('hidden',time>checkpointUntil||mode!=='play');$('reticle').classList.toggle('hidden',(!player.spraying&&!s.rocketLoaded&&!lookMode)||mode!=='play');$('damage-flash').style.opacity=time<flashUntil?'.65':'0';drawMap(s);
}
function animate(now){if(mode==='error')return;const elapsed=Math.min((now-last)/1000,.12);last=now;accumulator+=elapsed;let n=0;while(accumulator>=1/60&&n<7){step(1/60);accumulator-=1/60;n++;}updateCamera(elapsed);hudClock+=elapsed;if(hudClock>.1){updateHUD();hudClock=0;}renderer.render(scene,camera);requestAnimationFrame(animate);}
requestAnimationFrame(()=>setTimeout(init,40));
