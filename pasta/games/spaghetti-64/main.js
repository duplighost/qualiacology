import * as THREE from './vendor/three.module.js';
import {createPastaKit} from './pasta.js';
import {CoursePhysics,NoodleController} from './physics.js';
import {createWorld} from './world.js';
import {BossEncounter} from './mission.js';
import {PastaAudio} from './audio.js';
import {CanvasPastaRenderer} from './compat-renderer.js';
import {createHazards} from './hazards.js';
import {COURSES,COURSE_COUNT,getProgress,saveStar,starsCollected} from './courses.js';
import {createWhompWorld,createWhompModel} from './whomp-world.js';
import {WhompEncounter} from './whomp-mission.js';
import {SwimmingController} from './swimming.js';
import {createJrbWorld} from './jrb-world.js';
import {SlidingController} from './sliding.js';
import {createCcmWorld} from './ccm-world.js';
import {createBbhWorld} from './bbh-world.js';
import {createHmcWorld} from './hmc-world.js';
import {HmcController} from './hmc-mission.js';
import {createLllWorld} from './lll-world.js';
import {createSslWorld} from './ssl-world.js';
import {SslController,SslPhysics} from './ssl-mission.js';
import {createDddWorld} from './ddd-world.js';
import {DddController} from './ddd-mission.js';
import {createSlWorld} from './sl-world.js';
import {SlController} from './sl-mission.js';
import {createWdwWorld} from './wdw-world.js';
import {WdwController} from './wdw-mission.js';
import {createTtmWorld} from './ttm-world.js';
import {TtmController} from './ttm-mission.js';
import {createThiWorld} from './thi-world.js';
import {ThiController} from './thi-mission.js';
import {createTtcWorld} from './ttc-world.js';
import {TtcController} from './ttc-mission.js';
import {createRrWorld} from './rr-world.js';
import {RrController} from './rr-mission.js';
import {createBowserWorld} from './bowser-world.js';
import {BowserController} from './bowser-mission.js';
import {createCastleWorld} from './castle-world.js';
import {CastleController} from './castle-mission.js';
import {createSecretWorld} from './secret-world.js';
import {SecretController} from './secret-mission.js';
import {createBowserArenaWorld} from './bowser-arena-world.js';
import {BowserArenaController} from './bowser-arena-mission.js';
import {DESTINATIONS,BOWSER_LINKS} from './destinations.js';
import {getAdventure,saveAdventure,saveAdventureReward,collectionTotal,extraStarsCollected,STAR_TOTAL,castleCheckpoint,castleEntry,courseEntry,destinationUrl} from './adventure.js';
import {attachWorldConnections} from './connections.js';

const $=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),TAU=Math.PI*2;
const show=(id,value=true)=>$(id).classList.toggle('hidden',!value);
const isTouch=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0||innerWidth<760;
const params=new URLSearchParams(location.search),config=DESTINATIONS[params.get('course')]||COURSES.bob;
const isCastle=config.id==='castle',isSecret=config.kind==='secret',isBowserArena=config.kind==='arena',isKingdom=isCastle||isSecret||isBowserArena;
const entryOptions=courseEntry(params,config.id);
let adventure=getAdventure(),navigationPending=false,checkpointClock=0,worldConnections=null;
const isWhomp=config.id==='wf',isJrb=config.id==='jrb',isCcm=config.id==='ccm',isBbh=config.id==='bbh',isHmc=config.id==='hmc',isLll=config.id==='lll',isSsl=config.id==='ssl',isDdd=config.id==='ddd',isSl=config.id==='sl',isWdw=config.id==='wdw',isTtm=config.id==='ttm',isThi=config.id==='thi',isTtc=config.id==='ttc',isRr=config.id==='rr',isBitdw=config.id==='bitdw',isBitfs=config.id==='bitfs',isBits=config.id==='bits',isBowserStage=isBitdw||isBitfs||isBits,isFinalFive=isTtc||isRr||isBowserStage,isBob=config.id==='bob',newCourse=isKingdom||isSl||isWdw||isTtm||isThi||isFinalFive,multiArea=isJrb||isCcm||isDdd||isThi,worldMission=multiArea||isBbh||isHmc||isLll||isSsl||newCourse,canSwim=isJrb||isBbh||isHmc||isSsl||isDdd||newCourse,permanentStar=isHmc||isDdd||isSl||isTtm||isTtc||isRr,punchCourse=isBbh||isLll||isSsl||newCourse;
let renderer,scene,camera,kit,course,renderData,physics,player,world,hero,boss,bossMesh,starMesh,hazards;
let mode='loading',time=0,elapsed=0,coins=0,starCollected=false,deathTimer=0,dialogReturn='playing';
let cameraYaw=135*Math.PI/180,cameraPitch=.33,cameraDistance=8.4,cameraTouched=-99;
let softness=.55,routeVisible=false,quality='balanced',toastTimer=0,frameTime=0,frameCount=0,fps=60;
let punchTimer=0,heldEnemy=null,shake=0,steps=0,grateOpen=false,chompPhase=0,slowFrames=0;
let key={},edge={jump:false,action:false,pound:false,dive:false},stick={x:0,y:0},gamepadPrevious=[];
const audio=new PastaAudio(),particles=[],cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3();
let sun,shadowTarget,mapBackground,healthDisplay=-1,bossHealthDisplay=-1,qualityAdjusted=false;
let gamepadMove={x:0,y:0},gamepadRun=false;
let abovePastaBackdrop,belowPastaBackdrop,immersion=0;
const atmosphereClouds=[];
let mapProjection={x:0,z:0,scale:1.35},mapHeight=-Infinity;
const status=document.createElement('output');status.id='game-status';status.setAttribute('aria-live','polite');status.style.cssText='position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';document.body.append(status);

function toast(text,duration=4){$('toast').textContent=text;$('toast').classList.add('visible');toastTimer=duration;}
function fail(error){console.error(error);$('error-message').textContent='The 3D scene could not load. '+(error?.message||error)+'. Try reloading in a browser with WebGL 2 enabled.';show('error');mode='error';}
window.addEventListener('error',e=>{if(mode==='loading')fail(e.error||e.message);});
function setProgress(x){$('load-progress').style.width=`${x}%`;}
function setMode(next){mode=next;show('welcome',next==='intro');show('pause',next==='paused');show('help',next==='help');show('victory',next==='victory');const inGame=['playing','dialogue','exploring','victory'].includes(next);show('hud',inGame);show('power',inGame);show('map-wrap',inGame);show('desktop-help',inGame&&!isTouch);show('touch-controls',isTouch&&['playing','exploring'].includes(next));show('voyage-hud',inGame&&worldMission&&!starCollected);if(!['playing','exploring','dialogue'].includes(next))show('cap-hud',false);if(!inGame){show('context',false);show('boss-hud',false);show('breath-hud',false);}if(!['playing','exploring'].includes(next))audio.setSliding?.(0);key={};Object.assign(edge,{jump:false,action:false,pound:false,dive:false});stick.x=stick.y=0;resetKnob();}
function pause(){saveCastlePosition();if(mode==='playing'||mode==='exploring'){audio.squish(.1);setMode('paused');}else if(mode==='paused')setMode(starCollected?'exploring':'playing');}
function dialogue(name,text){dialogReturn=mode==='exploring'?'exploring':'playing';$('dialog-name').textContent=name;$('dialog-text').textContent=text;show('dialog');setMode('dialogue');}
function closeDialogue(){if(mode!=='dialogue')return;show('dialog',false);setMode(dialogReturn);edge.action=false;}

function configureCourseUI(){
  document.title=`Spaghetti 64 · ${config.name}`;
  $('game').classList.toggle('castle-course',isCastle);$('game').classList.toggle('secret-course',isSecret);$('game').classList.toggle('bowser-arena',isBowserArena);
  $('game').classList.toggle('winter-course',isCcm||isSl);
  $('game').classList.toggle('haunted-course',isBbh);
  $('game').classList.toggle('cavern-course',isHmc);
  $('game').classList.toggle('lava-course',isLll||isBitfs);
  $('game').classList.toggle('clock-course',isTtc);$('game').classList.toggle('sky-course',isRr||isBits);$('game').classList.toggle('dark-world-course',isBitdw);show('clock-entry-setting',isTtc);
  $('game').classList.toggle('desert-course',isSsl);
  $('game').classList.toggle('docks-course',isDdd);
  $('game').classList.toggle('flooded-course',isWdw);
  $('game').classList.toggle('highland-course',isTtm);
  $('game').classList.toggle('island-course',isThi);
  show('boss-health',!isLll&&!isSsl&&!isDdd&&!newCourse);
  document.querySelector('meta[name="description"]')?.setAttribute('content',`${config.name}, rebuilt from pasta. ${config.brief}`);
  document.querySelector('.course-label .eyebrow').textContent=`${isCastle?'CASTLE':isBowserArena?'BOWSER ARENA':isSecret?'SECRET COURSE':config.kind==='bonus'?'BONUS STAGE':'COURSE'} ${isCastle?'':config.number}`;
  document.querySelector('.course-label strong').textContent=config.name.toUpperCase();
  $('objective').textContent=config.objective;
  document.querySelector('.mission-number').textContent=config.number;
  document.querySelector('.mission-name small').textContent=config.name.toUpperCase();
  document.querySelector('.mission-name h2').textContent=config.mission;
  document.querySelector('#welcome .intro > p').textContent=config.tagline;
  document.querySelector('#welcome .intro-detail').textContent=config.brief;
  document.querySelector('#boss-hud .eyebrow').textContent=config.boss.toUpperCase();
  document.querySelector('#boss-hud strong').textContent=config.bossSubtitle;
  $('boss-hint').textContent=config.bossHint;
  const help=document.querySelector('#help .help-sheet > p'),label=document.createElement('b');label.textContent='The mission: ';
  help.replaceChildren(label,document.createTextNode(config.instructions));
  document.querySelector('#pause .sheet > p').textContent=isTtc?'The clock can spare a moment.':isRr?'The carpets will keep their place.':isBowserStage?'The pasta course will wait.':isSl?'The snowman will keep his cool.':isWdw?'The waterworks will wait.':isTtm?'The summit will still be there.':isThi?'The island will keep its proportions.':isSsl?'The desert supper will wait.':isDdd?'The submarine will stay afloat.':isHmc?'Dorrie can wait. The noodles will keep floating.':isLll?'The pasta will keep boiling.':isBbh?'The haunted supper will wait.':isCcm?'The slippery supper will wait.':isJrb?'The sunken supper will wait.':isWhomp?'The noodle fortress will wait.':'The noodle mountain will wait.';
  $('resume').replaceChildren(document.createTextNode(isTtc?'Back to the clock ':isRr?'Back to the rainbow ':isBowserStage?'Back to the red coins ':isSl?'Back to the snowfield ':isWdw?'Back to the waterworks ':isTtm?'Back to the mountain ':isThi?'Back to the island ':isSsl?'Back to the desert ':isDdd?'Back to the docks ':isHmc?'Back to the cavern ':isLll?'Back to the lava land ':isBbh?'Back to the mansion ':isCcm?'Back to the mountain ':isJrb?'Back to the bay ':isWhomp?'Back to the fortress ':'Back to the battlefield '),Object.assign(document.createElement('span'),{textContent:'↗'}));
  document.querySelector('#victory .eyebrow').textContent=`${config.kind==='bonus'?'BONUS STAGE':'COURSE'} ${config.number} · MISSION COMPLETE`;
  document.querySelector('#victory h3').textContent=config.mission;
  document.querySelector('#victory .sheet > p').textContent=isBowserStage?'Eight red pasta coins. One well-earned star.':isTtc?'The clockwork is crossed. The cage star is yours.':isRr?'You boarded the flying pasta cruiser. Your star is ready.':isSl?'You climbed an enormous snowman made of capellini. Your star is ready.':isWdw?'The water is settled. The lifts are crossed. The star is yours.':isTtm?'A mountain climbed, strand by strand. Your summit star is ready.':isThi?'Five enormous flowers, thoroughly plucked. Your pasta star is ready.':isSsl?'Klepto has relinquished his dinner. The star is yours.':isDdd?'You boarded an entire submarine made of pasta. Your star is ready.':isHmc?'A ride across the cavern. One extremely helpful pasta beast.':isLll?'The Bully has been boiled. Your pasta star is ready.':isBbh?'Five little ghosts. One Big Boo. A mansion finally free of leftovers.':isCcm?'A full mountain serving. Delivered downhill. Your star is ready.':isJrb?'The ship is drained. The treasure is yours. Somehow, dinner survived.':isWhomp?'The Whomp King has been thoroughly flattened.':'The king has been thoroughly overcooked.';
  $('result-total').textContent=`${collectionTotal(getProgress(),adventure)} / ${STAR_TOTAL}`;
  const next=DESTINATIONS[config.next]||COURSES.bob;$('next-course').href=`./play.html?course=${next.id}`;
  $('next-course').replaceChildren(document.createTextNode(`Next: ${next.name} `),Object.assign(document.createElement('span'),{textContent:'↗'}));
  $('scene').setAttribute('aria-label',`${config.name} in 3D pasta. Move with WASD or arrows, jump with Space, ${isBowserStage?'jump into poles to grab them, use forward and backward to climb, left and right to turn, and jump to leap away. Collect eight red coins.':isTtc?'choose a clock speed before entering, ride the machinery, and collect the cage star.':isRr?'ride the flying carpets and board the cruiser for its star.':newCourse?'hold Space to swim up, hold C or Ctrl to dive or ground pound, and press E or J to punch or interact.':isSsl?'run up a pillar and jump into Klepto to release the star; E or J also punches.':isDdd?'hold Space to swim up, hold C or Ctrl to dive, and cross the switch blocks to board the submarine.':isHmc?'hold Space to swim up, hold C or Ctrl to dive, and ground pound Dorrie’s back to lower her head.':isLll?'punch with E or J and knock Big Bully off his platform into the hot noodles.':isBbh?'punch with E or J, and ground pound with C or Ctrl. Hunt five Boos, then defeat Big Boo.':isCcm?'steer down the slide, hold C or Ctrl to brake, and press E to read or use a door.':isJrb?'hold Space to swim up, hold C or Ctrl to dive, and press E to interact.':isWhomp?'ground pound with Ctrl or C.':'grab and throw with E.'}`);
  if(isFinalFive){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move / climb</span><span><kbd>SPACE</kbd> jump</span><span><kbd>E / J</kbd> punch</span><span><kbd>C / CTRL</kbd> pound</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='PUNCH';$('touch-action').setAttribute('aria-label','Punch or interact');
    document.querySelector('#help dt:nth-of-type(4)').textContent='Punch / interact';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · PUNCH';
    document.querySelector('#help .small-copy').textContent=isBowserStage?'On a pole, forward climbs and backward slides. Left and right turn your body; jump launches away from the pole. Climb to the very top for a handstand and a forward jump. Run + crouch + jump for a long jump.':isTtc?'The four clock settings change the machinery. Your choice is kept when you restart. Run + crouch + jump to clear longer gaps. The cage star is already waiting.':'Stay with the carpet and return promptly after jumping. The cruiser star is already waiting. Run + crouch + jump to clear longer gaps.';
  }else if(newCourse){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move</span><span><kbd>SPACE</kbd> jump / swim up</span><span><kbd>E / J</kbd> punch</span><span><kbd>C / CTRL</kbd> pound / dive</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='PUNCH';$('touch-action').setAttribute('aria-label','Punch or interact with nearby pasta');
    document.querySelector('#help dt:nth-of-type(2)').textContent='Jump / swim up';document.querySelector('#help dd:nth-of-type(2)').textContent='Space · A · JUMP / SWIM UP';
    document.querySelector('#help dt:nth-of-type(4)').textContent='Punch / interact';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · PUNCH';
    document.querySelector('#help dt:nth-of-type(5)').textContent='Ground pound / dive';document.querySelector('#help dd:nth-of-type(5)').textContent='Ctrl or C · B · POUND / DIVE';
    document.querySelector('#help .small-copy').textContent=isTtm?'Run + crouch + jump for a long jump. The log responds to your weight and carries you while you stand on it. Stay on the narrow trail when Fwoosh blows.':isSl?'The penguin changes speed and may stop or turn. Match its movement to keep its body between you and the wind. Cold water drains health.':isWdw?'Stand on each arrow lift to activate it. Water diamonds stay locked while the level changes. Surface to recover your breath.': 'Enter a pipe to change island size. The five giant flowers are on Huge Island; tiny flowers do not count toward this star.';
  }else if(isSsl){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move</span><span><kbd>SHIFT</kbd> run up pillars</span><span><kbd>SPACE</kbd> jump</span><span><kbd>E / J</kbd> punch</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='PUNCH';$('touch-action').setAttribute('aria-label','Punch Klepto or read a sign');
    document.querySelector('#help dt:nth-of-type(3)').textContent='Run / climb pillars';document.querySelector('#help dd:nth-of-type(3)').textContent='Shift · push the stick all the way';
    document.querySelector('#help dt:nth-of-type(4)').textContent='Punch / read';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · PUNCH';
    document.querySelector('#help .small-copy').textContent='Run straight at a pillar’s sloping face to climb it. Time a jump into Klepto when he passes. The star flies to the side of the pyramid; it does not remain in the bird’s talons. Keep moving in shallow quicksand and avoid the dark pits.';
  }else if(isDdd){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> swim / move</span><span><kbd>SPACE</kbd> swim up / jump</span><span><kbd>C / CTRL</kbd> dive</span><span><kbd>E</kbd> read</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='ACT';$('touch-action').setAttribute('aria-label','Read a dock sign or interact');
    document.querySelector('#help dt:nth-of-type(2)').textContent='Swim up / jump';document.querySelector('#help dd:nth-of-type(2)').textContent='Hold Space · hold A · hold SWIM UP';
    document.querySelector('#help dt:nth-of-type(4)').textContent='Read / interact';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · ACT';
    document.querySelector('#help dt:nth-of-type(5)').textContent='Dive / ground pound';document.querySelector('#help dd:nth-of-type(5)').textContent='Hold Ctrl or C · hold B · hold DIVE';
    document.querySelector('#help .small-copy').textContent='Follow the submerged passage to the submarine dock. Your momentum carries through the passage. Surface for air, then step onto the purple switch on the walkway. Its temporary blocks give you a timed route onto the submarine. The star is already on the upper deck.';
  }else if(isHmc){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move / steer Dorrie</span><span><kbd>SPACE</kbd> jump / swim up</span><span><kbd>C / CTRL</kbd> pound / dive</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='ACT';$('touch-action').setAttribute('aria-label','Read a cavern sign or use a door');
    document.querySelector('#help dt:nth-of-type(2)').textContent='Jump / swim up';document.querySelector('#help dd:nth-of-type(2)').textContent='Space · A · JUMP / SWIM UP';
    document.querySelector('#help dt:nth-of-type(4)').textContent='Read / interact';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · ACT';
    document.querySelector('#help dt:nth-of-type(5)').textContent='Ground pound / dive';document.querySelector('#help dd:nth-of-type(5)').textContent='Ctrl or C · B · POUND / DIVE';
    document.querySelector('#help .small-copy').textContent='Run + crouch + jump to clear the entrance gap (Shift + Ctrl + Space, or full stick + POUND + JUMP). The star is already waiting on the lake’s central island. Dorrie follows the direction you face while riding. Ground pound her back to lower her head, move onto it, and let her raise you toward the island. Surface to recover your breath.';
  }else if(isLll){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move</span><span><kbd>SPACE</kbd> jump</span><span><kbd>E / J</kbd> punch</span><span><kbd>C / CTRL</kbd> pound</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='PUNCH';$('touch-action').setAttribute('aria-label','Punch a Bully or read a sign');
    document.querySelector('#help dt:nth-of-type(4)').textContent='Punch / read';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · PUNCH';
    document.querySelector('#help .small-copy').textContent='Bully fights are about momentum. Keep the platform’s center behind you, then strike toward the edge. A hit alone does not defeat him. The hot pasta burns and launches you upward; steer toward a safe landing. His ring-out opens the bridge to the star.';
  }else if(isBbh){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move</span><span><kbd>SPACE</kbd> jump</span><span><kbd>E / J</kbd> punch</span><span><kbd>C / CTRL</kbd> pound</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='PUNCH';$('touch-action').setAttribute('aria-label','Punch a solid Boo or open a nearby door');
    document.querySelector('#help dt:nth-of-type(4)').textContent='Punch / door';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · PUNCH';
    document.querySelector('#help .small-copy').textContent='Boos shy away when watched. Turn your back, let them come close, then strike while they are solid. Jump before pressing C / Ctrl / POUND for a ground pound. Doors open as you approach. In the cellar, hold Space to swim up and C / Ctrl to dive.';
  }else if(isCcm){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move / steer</span><span><kbd>S / CTRL</kbd> brake</span><span><kbd>SPACE</kbd> jump</span><span><kbd>E</kbd> interact</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='ACT';$('touch-action').setAttribute('aria-label','Read a sign or use a cottage door');
    document.querySelector('#help dt:nth-of-type(1)').textContent='Move / steer';document.querySelector('#help dd:nth-of-type(1)').textContent='WASD / arrows · left stick';
    document.querySelector('#help dt:nth-of-type(3)').textContent='Run / tuck';document.querySelector('#help dd:nth-of-type(3)').textContent='Shift · push forward on the slide';
    document.querySelector('#help dt:nth-of-type(4)').textContent='Read / door';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · ACT';
    document.querySelector('#help dt:nth-of-type(5)').textContent='Brake / ground pound';document.querySelector('#help dd:nth-of-type(5)').textContent='Ctrl or C · B · BRAKE inside the slide';
    document.querySelector('#help .small-copy').textContent='The noodles keep their downhill momentum. Brake before tight bends and steer early. The camera follows your direction unless you move it yourself. Space jumps across gaps. Outside, normal walking and jumping return.';
  }else if(isJrb){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> swim / move</span><span><kbd>SPACE</kbd> swim up / jump</span><span><kbd>C / CTRL</kbd> dive</span><span><kbd>E</kbd> interact</span><span><kbd>DRAG</kbd> look</span>';
    $('touch-action').textContent='ACT';$('touch-action').setAttribute('aria-label','Interact, read a sign, or strike the star box');
    document.querySelector('#help dt:nth-of-type(2)').textContent='Swim up / jump';document.querySelector('#help dd:nth-of-type(2)').textContent='Hold Space · hold A · hold SWIM UP';
    document.querySelector('#help dt:nth-of-type(4)').textContent='Interact / strike';document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · ACT';
    document.querySelector('#help dt:nth-of-type(5)').textContent='Dive / ground pound';document.querySelector('#help dd:nth-of-type(5)').textContent='Hold Ctrl or C · hold B · hold DIVE';
    document.querySelector('#help .small-copy').textContent='The noodles keep drifting when you stop swimming. Hold the up or down control to change depth. Surface to refill your breath; coins and chest bubbles also help. The chest puzzle belongs inside the ship, not the ocean cave.';
  }else if(isWhomp){
    $('desktop-help').innerHTML='<span><kbd>W A S D</kbd> move</span><span><kbd>SPACE</kbd> jump</span><span><kbd>C / CTRL</kbd> ground pound</span><span><kbd>DRAG</kbd> camera</span><span><kbd>H</kbd> help</span>';
    $('touch-action').textContent='PUNCH';$('touch-action').setAttribute('aria-label','Punch a sleeping Piranha Plant or read a sign');
    document.querySelector('#help dt:nth-of-type(4)').textContent='Punch / read';
    document.querySelector('#help dd:nth-of-type(4)').textContent='E or J · X · PUNCH';
  }
}

function configureKingdomUI(){
  const returnUrl='./play.html?course=castle&entry=return';
  $('return-castle').href=isCastle?'./index.html#courses':returnUrl;
  $('return-castle').textContent=isCastle?'Course select':'Return to the castle';
  $('victory-castle').href=returnUrl;$('victory-castle').textContent='Return to the castle';
  $('castle-map-link').href='./play.html?course=castle&entry=resume';
  if(!isKingdom)return;
  document.querySelector('#pause .sheet > p').textContent='Your place in the pasta kingdom is saved.';
  $('resume').textContent='Continue exploring';
  $('touch-action').textContent=isBowserArena?'GRAB':'ACT';
  $('touch-action').setAttribute('aria-label',isBowserArena?'Grab Bowser’s tail or release the throw':'Talk, open, or interact');
  document.querySelector('#help dt:nth-of-type(4)').textContent=isBowserArena?'Grab / throw':'Talk / interact';
  document.querySelector('#help dd:nth-of-type(4)').textContent=isBowserArena?'E or J · gamepad X · GRAB':'E or J · gamepad X · ACT';
  document.querySelector('#help .small-copy').textContent=isBowserArena?'While holding the tail, use left or right to build spin, then press the action again to throw toward a bomb.':isCastle?'Drag to look around; Q / R turn the view and I / K look up and down. Stand on the lobby sun and look up to find the Wing Cap tower. Your last castle position is saved.':config.instructions;
  $('desktop-help').innerHTML=isBowserArena?'<span><kbd>W A S D</kbd> move / spin</span><span><kbd>E / J</kbd> grab / throw</span><span><kbd>SPACE</kbd> jump</span><span><kbd>DRAG</kbd> look</span>':'<span><kbd>W A S D</kbd> move / steer</span><span><kbd>SPACE</kbd> jump / swim</span><span><kbd>E / J</kbd> interact</span><span><kbd>I / K</kbd> look up / down</span>';
  if(isCastle){show('boss-hud',false);document.querySelector('#welcome .mission-name h2').textContent='The Pasta Kingdom';}
  if(isBowserArena){show('boss-health',true);document.querySelector('#victory h2').textContent=config.id==='bowser_3'?'The Grand Star is yours.':'You got the key.';document.querySelector('#victory .sheet > p').textContent=config.id==='bowser_3'?'Bowser is defeated. The pasta kingdom is free.':'A saffron-pasta key, won by a well-aimed throw.';}
  else if(isSecret)document.querySelector('#victory .sheet > p').textContent='Another secret of the pasta kingdom, uncovered.';
}
function currentAdventure(){return{...adventure,courseProgress:getProgress(),starCount:collectionTotal(getProgress(),adventure)};}
function updateAdventure(patch){adventure=saveAdventure(patch);world?.setAdventure?.(currentAdventure());return adventure;}
function registerAdventureReward(reward){const before=extraStarsCollected(adventure);adventure=saveAdventureReward(reward);world?.setAdventure?.(currentAdventure());if(extraStarsCollected(adventure)>before){audio.star();toast('Another pasta star! Your collection is saved.',4);}return adventure;}
function saveCastlePosition(){if(isCastle&&player&&world&&!player.dead&&!navigationPending&&(player.grounded||player.swimming||player.inCannon)){const point=castleCheckpoint(world.area,player);if(point)adventure=saveAdventure({lastCastle:point});}}
function navigateWorld(destination){
  if(navigationPending||!destination)return;const id=typeof destination==='string'?destination:destination.course;if(!DESTINATIONS[id])return;
  if(isCastle){const point=destination.returnPosition?{area:destination.returnArea||world.area,position:destination.returnPosition,yaw:destination.returnYaw??player.yaw*180/Math.PI}:castleCheckpoint(world.area,player);adventure=saveAdventure({lastCastle:point,returnToCastle:point});}
  adventure=saveAdventure({visited:[id]});navigationPending=true;mode='transition';
  const fade=$('area-transition');fade.textContent=DESTINATIONS[id].name.toUpperCase();fade.classList.add('arriving');
  location.href=id==='castle'?'./play.html?course=castle&entry=return':destinationUrl(id,{fromCastle:true,...(typeof destination==='object'?destination:{})});
}
async function init(){
  configureCourseUI();configureKingdomUI();
  setProgress(8);
  const canvas=$('scene');let context=null;try{context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});}catch{}
  renderer=context?new THREE.WebGLRenderer({canvas,context,antialias:true,powerPreference:'high-performance'}):new CanvasPastaRenderer({canvas});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(isTtc?'#88785e':isRr?'#afbdba':isBitdw?'#302936':isBitfs?'#8c4d30':isBits?'#8a8caa':isSsl?'#d6ac69':isDdd?'#344f63':isHmc?'#303d35':isLll?'#6a2b1b':isBbh?'#292436':isSl?'#dce7e5':isWdw?'#8ba6a3':isTtm?'#c0c7a1':isThi?'#c5c9a2':isCcm?'#dce4e5':'#e7dfc8');scene.fog=new THREE.Fog(isTtc?'#88785e':isRr?'#afbdba':isBitdw?'#302936':isBitfs?'#8c4d30':isBits?'#8a8caa':isSsl?'#d6ac69':isDdd?'#344f63':isHmc?'#303d35':isLll?'#6a2b1b':isBbh?'#292436':isSl?'#dce7e5':isWdw?'#8ba6a3':isTtm?'#c0c7a1':isThi?'#c5c9a2':isCcm?'#dce4e5':'#e7dfc8',140,320);
  camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.08,500);
  const environmentCanvas=document.createElement('canvas');environmentCanvas.width=512;environmentCanvas.height=256;
  const ec=environmentCanvas.getContext('2d'),grad=ec.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#fff1d5');grad.addColorStop(.45,'#eadbc0');grad.addColorStop(.57,'#d1bd8f');grad.addColorStop(1,'#81704b');ec.fillStyle=grad;ec.fillRect(0,0,512,256);
  const glow=ec.createRadialGradient(130,65,5,130,65,94);glow.addColorStop(0,'#ffffff');glow.addColorStop(1,'#fff3df00');ec.fillStyle=glow;ec.fillRect(0,0,512,256);
  const envTexture=new THREE.CanvasTexture(environmentCanvas);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.colorSpace=THREE.SRGBColorSpace;if(!renderer.isSoftware){const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(envTexture).texture;scene.environmentIntensity=.65;pmrem.dispose();}envTexture.dispose();
  scene.add(new THREE.HemisphereLight(isSsl?'#fff0c7':isDdd?'#dceff2':isHmc?'#e5f0d6':isLll?'#ffe6b9':isBbh?'#ece3ff':isCcm?'#f1f8f8':'#fff4db',isSsl?'#ac7849':isDdd?'#344759':isHmc?'#35463a':isLll?'#8c3021':isBbh?'#35304b':isCcm?'#657e89':'#72633d',isDdd?1.6:isSsl?1.2:isHmc?1.5:isLll?1.45:isBbh?1.55:isCcm?1.35:1.05));
  sun=new THREE.DirectionalLight(isCcm?'#fff7e7':'#fff1d1',3.2);sun.position.set(-45,80,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;sun.shadow.camera.near=1;sun.shadow.camera.far=180;sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;sun.shadow.radius=2;scene.add(sun);shadowTarget=sun.target;scene.add(shadowTarget);
  const fill=new THREE.DirectionalLight('#d7e1db',.6);fill.position.set(40,25,-70);scene.add(fill);
  [course,renderData]=await Promise.all([fetch(`./data/${config.data}`).then(checkJson),fetch(`./data/${config.render}`).then(checkJson)]);course.star=course.star?.position||course.star||[20,45,-45];if(isWdw&&entryOptions.waterEntry){const i=['low','middle','high'].indexOf(entryOptions.waterEntry);course.mission.water.initialLevel=course.mission.water.entryPresets[i];}setProgress(23);
  physics=isSsl?new SslPhysics(course):new CoursePhysics(course);player=isCastle?new CastleController(physics,course.start,course):isSecret?new SecretController(physics,course.start,course):isBowserArena?new BowserArenaController(physics,course.start,course):isTtc?new TtcController(physics,course.start):isRr?new RrController(physics,course.start):isBowserStage?new BowserController(physics,course.start):isSl?new SlController(physics,course.start):isWdw?new WdwController(physics,course.start):isTtm?new TtmController(physics,course.start):isThi?new ThiController(physics,course.start):isSsl?new SslController(physics,course.start):isDdd?new DddController(physics,course.start):isHmc?new HmcController(physics,course.start):isCcm?new SlidingController(physics,course.start):canSwim?new SwimmingController(physics,course.start):new NoodleController(physics,course.start);kit=createPastaKit();setProgress(32);
  const encounterCallbacks={dialogue,message:toast,hit:()=>{audio.hit();shake=.3;burst(boss.position,22,kit.materials.egg);updateHud();},damage:()=>{audio.hit();shake=.22;},defeat:()=>{if(permanentStar){if(world&&boss)spawnStar();return;}audio.star();burst(worldMission?player.position:boss.position,50,kit.materials.saffron);spawnStar();toast(isThi?'All five flowers are plucked. Collect your pasta star!':isWdw?'The box is open. Catch your pasta star!':isSsl?'Klepto dropped the star. Find it beside the pyramid!':isLll?'Big Bully is boiled. Cross the new bridge to your pasta star!':isBbh?'The haunting is over. Climb the rising stairs to your pasta star!':isCcm?'The slide is behind you. Collect your pasta star outside!':isJrb?'The treasure is free. Catch your pasta star!':`${config.boss} is cooked. Collect your star!`,5);}};
  const createCourseWorld=isCastle?createCastleWorld:isSecret?createSecretWorld:isBowserArena?createBowserArenaWorld:isTtc?createTtcWorld:isRr?createRrWorld:isBowserStage?createBowserWorld:isSl?createSlWorld:isWdw?createWdwWorld:isTtm?createTtmWorld:isThi?createThiWorld:isSsl?createSslWorld:isDdd?createDddWorld:isHmc?createHmcWorld:isLll?createLllWorld:isBbh?createBbhWorld:isCcm?createCcmWorld:isJrb?createJrbWorld:isWhomp?createWhompWorld:createWorld;
  const callbacks={...encounterCallbacks,navigate:navigateWorld,adventureChanged:updateAdventure,reward:registerAdventureReward,adventure:registerAdventureReward,aimCamera:({yaw,pitch})=>{cameraYaw=yaw;cameraPitch=pitch;cameraTouched=time;},onProgress:x=>setProgress(35+x*.43),damage:damageFrom,burst,message:toast,areaChanged:onAreaChanged,roomChanged:onRoomChanged,lavaBounce:()=>{audio.hit();shake=.22;burst(player.position,13,kit.materials.tomato);}};
  world=await createCourseWorld(scene,kit,course,renderData,physics,callbacks);
  if(world.callbacks)Object.assign(world.callbacks,callbacks);
  world.setAdventure?.(currentAdventure());world.bindPlayer?.(player);player.setSecretWorld?.(world);player.setArenaWorld?.(world);
  player.setPoleSource?.(()=>world.poles||[]);
  await kit.loadPhotographicSurfaces?.();
  worldConnections=await attachWorldConnections({course,world,physics,kit,navigate:navigateWorld});
  if(isTtc){const mode=entryOptions.clockMode||'slow';world.setClockMode(mode);$('clock-entry').value=mode;}
  if(canSwim)player.setWaterSource((x,z,p)=>world.getWaterInfo(x,z,p));
  if(isCcm)player.setSlideSource((x,z,p)=>world.getSlideInfo(x,z,p));
  hero=kit.hero();hero.position.copy(player.position);hero.rotation.y=player.yaw;scene.add(hero);
  bossMesh=worldMission?new THREE.Group():isWhomp?createWhompModel(kit,{boss:true}):kit.bomb({boss:true});scene.add(bossMesh);
  const Encounter=isWhomp?WhompEncounter:BossEncounter;
  boss=worldMission?world.mission:new Encounter(physics,course.boss,encounterCallbacks);
  if(worldMission)boss.callbacks={...encounterCallbacks,navigate:navigateWorld,adventureChanged:updateAdventure,reward:registerAdventureReward,adventure:registerAdventureReward,...(isBowserStage||isSecret?{redCoin:()=>updateHud(),star:()=>{spawnStar();audio.star();toast('Eight red coins! Reach the pasta star at the end of the course.',5);}}:{}),...(isJrb?{chest:()=>audio.coin()}:{ }),...(isWdw?{water:()=>audio.squish(.6),boxBroken:()=>audio.squish(.7)}:{}),...(isThi?{flowerDefeated:()=>{audio.hit();updateHud();}}:{}),...(isDdd?{switch:()=>audio.squish(.8),boxBroken:()=>audio.squish(.7)}:{}),...(isBbh?{ghostHit:()=>{audio.squish(.75);shake=.12;},ghostDefeated:()=>{audio.coin();updateHud();},stairs:()=>{audio.squish(.9);toast('The staircase is rising. Jump up to the star above the hall.',4);}}:{})};
  bossMesh.position.copy(boss.position);bossMesh.rotation.y=boss.yaw||0;
  hazards=isBob?createHazards(scene,kit,course,physics,{damage:damageFrom,burst,message:toast}):null;
  if(permanentStar&&boss.starReady)spawnStar();
  if(isBowserArena)$('boss-health').replaceChildren(...Array.from({length:boss.maxHealth||3},()=>document.createElement('i')));
  createAtmosphere();createMap();wireInputs();setQuality('balanced');resize();
  setProgress(100);$('play-label').textContent=config.enter;$('play').disabled=false;setMode('intro');
  positionIntroCamera();
  status.textContent=`Ready. ${config.name} loaded. First star mission. ${renderer.isSoftware?'Compatibility renderer.':'Full WebGL renderer.'}`;
  let last=performance.now();function frame(now){const rawDt=Math.max(.001,(now-last)/1000),dt=Math.min(.3,rawDt);last=now;frameTime+=rawDt;frameCount++;if(frameTime>1.3){fps=frameCount/frameTime;frameCount=0;frameTime=0;if(fps<28&&(!renderer.isSoftware||renderer.lastRenderMs>26)&&mode==='playing'&&quality==='balanced')slowFrames++;else slowFrames=0;if(slowFrames>=4&&!qualityAdjusted){qualityAdjusted=true;setQuality('low');$('quality').value='low';}}try{const steps=Math.max(1,Math.ceil(dt/.04));for(let i=0;i<steps;i++){time+=dt/steps;update(dt/steps);}renderer.render(scene,camera);}catch(e){fail(e);return;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
  if(params.get('from')==='castle'||isCastle&&params.has('entry'))start();
}
function positionIntroCamera(){const p=player.position;if((isHmc||isLll||isSsl||isDdd||newCourse)&&course.introCamera){camera.position.set(...course.introCamera.position);camera.lookAt(...course.introCamera.target);}else if(isHmc){camera.position.set(p.x+7,p.y+4,p.z+8);camera.lookAt(p.x,p.y-1,p.z-7);}else if(isLll){camera.position.set(p.x-13,p.y+13,p.z+18);camera.lookAt(p.x+10,p.y+1,p.z-12);}else if(isBbh){camera.position.set(55,34,82);camera.lookAt(3,11,4);}else if(isCcm){const a=course.start.position,e=course.mission.entry.position;camera.position.set(a[0]-14,a[1]+17,a[2]-11);camera.lookAt((a[0]+e[0])*.5,e[1]+1.3,(a[2]+e[2])*.5);}else if(isJrb){camera.position.set(p.x-9,p.y+8,p.z+14);camera.lookAt(p.x+28,p.y-4,p.z+18);}else if(isWhomp){camera.position.set(p.x+14+Math.sin(time*.1),p.y+9,p.z+15);camera.lookAt(p.x-5,p.y+5,p.z-10);}else{camera.position.set(p.x-7.8+Math.sin(time*.1)*1.1,p.y+5.5,p.z+10.2);camera.lookAt(p.x+5.8,p.y+3.3,p.z-12);}}
async function checkJson(r){if(!r.ok)throw new Error(`Course data ${r.status}`);return r.json();}
function createAtmosphere(){
  const noodleImage=Object.values(world.materials||{}).find(m=>m.map?.image)?.map.image;
  function backdrop(tint,photoAlpha){
    const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const c=cv.getContext('2d');
    c.fillStyle=isTtc?'#b9a47b':isRr?'#e4d5ad':isBitdw?'#494153':isBitfs?'#ac6741':isBits?'#b6b2c8':isSsl?'#ddbc7d':isDdd?'#a8c4c6':isHmc?'#35443a':isLll?'#7c3820':isBbh?'#312d3f':isSl?'#edf0e3':isWdw?'#afc4bd':isTtm?'#ded6ad':isThi?'#d7d4a5':isCcm?'#e6e9e3':isJrb?'#d7ded0':'#f4e8ca';c.fillRect(0,0,1024,512);
    if(noodleImage){c.globalAlpha=photoAlpha;c.drawImage(noodleImage,0,0,1024,512);c.globalAlpha=1;}
    if(tint){c.globalCompositeOperation='multiply';c.fillStyle=tint;c.fillRect(0,0,1024,512);}
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  abovePastaBackdrop=backdrop(isTtc?'#baa37a':isRr?'#b9c5c0':isBitdw?'#574c64':isBitfs?'#d18453':isBits?'#a7a2bd':isSsl?'#edd1a0':isDdd?'#668c98':isHmc?'#5c6d57':isLll?'#db7644':isBbh?'#514664':isSl?'#c3d4d5':isWdw?'#80a2a1':isTtm?'#c2cfa6':isThi?'#b8d0ae':isCcm?'#afc6cf':isJrb?'#93b5b8':null,isBbh?.7:isCcm?.32:.4);
  belowPastaBackdrop=isFinalFive?abovePastaBackdrop:newCourse?backdrop(isSl?'#59778a':'#457b79',.32):isDdd?backdrop('#2e697c',.28):isHmc?backdrop('#325e56',.45):isLll?abovePastaBackdrop:isBbh?backdrop('#302c40',.5):isCcm?backdrop('#59788e',.3):isJrb?backdrop('#2c6d77',.22):abovePastaBackdrop;
  scene.background=abovePastaBackdrop;
  const positions=[[-120,65,-130],[65,72,-165],[135,60,50],[-145,55,45],[10,88,-190]];
  positions.forEach((p,i)=>{const cloud=kit.coilBall(1,isSsl?kit.materials.egg:isDdd?kit.materials.blue:isHmc?kit.materials.spinach:isLll?kit.materials.tomato:isBbh?kit.materials.ink:isJrb?kit.materials.blue:kit.materials.white,i+812);cloud.scale.set(17+i*2,6+i,9);cloud.position.set(...p);cloud.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});scene.add(cloud);atmosphereClouds.push(cloud);});
}
function starLocation(){const p=worldMission?(boss?.starPosition||world?.starPosition):world?.starPosition;return p?(Array.isArray(p)?p:[p.x,p.y,p.z]):(course.star||[20,45,-45]);}
function onAreaChanged({area,spawn,start,displacement}={}){
  if(!world||!player||!camera)return;
  if(isDdd&&displacement){
    const shift=Array.isArray(displacement)?new THREE.Vector3(...displacement):new THREE.Vector3(displacement.x,displacement.y,displacement.z);
    camera.position.add(shift);cameraTarget.add(shift);desiredCamera.add(shift);
    createMap();if(world.guide)world.guide.visible=routeVisible;if(hero)hero.position.copy(player.position);
    $('area-name').textContent=areaLabel();updateEnvironment(.01,true);return;
  }
  const arrival=spawn||start||world.activeCourse?.start;
  cameraYaw=(arrival?.yaw??player.yaw*180/Math.PI)*Math.PI/180;cameraPitch=isCcm&&area===2?.17:.24;cameraTouched=time;
  createMap();if(world.guide)world.guide.visible=routeVisible;
  if(hero)hero.position.copy(player.position);updateCamera(.016,true);updateEnvironment(.01,true);
  $('area-name').textContent=areaLabel();
  const fade=$('area-transition');fade.textContent=areaLabel();fade.classList.remove('arriving');void fade.offsetWidth;fade.classList.add('arriving');
}
function areaLabel(){return isCastle?(world?.roomName||world?.areaName||'PEACH’S CASTLE').toUpperCase():isThi?(world?.area===2?'HUGE ISLAND':'TINY ISLAND'):newCourse?config.name.toUpperCase():isSsl?'SHIFTING SAND LAND':isDdd?(world?.area===2?'THE SUBMARINE DOCK':'THE ENTRANCE BASIN'):isHmc?(world?.roomName||'HAZY MAZE CAVE').toUpperCase():isLll?'LETHAL LAVA LAND':isBbh?(world?.roomName||'BIG BOO’S HAUNT').toUpperCase():isCcm?(world?.area===2?'THE SECRET SLIDE':'COOL, COOL MOUNTAIN'):(world?.area===2?'INSIDE THE SUNKEN SHIP':'JOLLY ROGER BAY');}
function onRoomChanged(){
  if(!(isBbh||isHmc||isCastle)||!world||!player||!camera)return;
  $('area-name').textContent=areaLabel();createMap();
  updateEnvironment(.01,true);updateCamera(.016,true);
}
function updateEnvironment(dt,instant=false){
  if(isCastle&&world){
    updateImmersion(dt,instant);const indoors=world.inside;
    if(immersion<.5){scene.fog.color.set(indoors?'#7c5834':'#d4c394');scene.fog.near=indoors?22:110;scene.fog.far=indoors?125:300;sun.intensity=indoors?2.4:3.1;renderer.toneMappingExposure=indoors?1.22:1.06;}
    for(const cloud of atmosphereClouds)cloud.visible=!indoors&&immersion<.5;
    scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:scene.fog.near,far:scene.fog.far,amount:.8};return;
  }
  if(isJrb||isDdd||newCourse){updateImmersion(dt,instant);return;}
  if(isSsl&&world){scene.fog.color.set('#d7b77d');scene.fog.near=105;scene.fog.far=300;scene.background=abovePastaBackdrop;scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:105,far:300,amount:.68};sun.color.set('#ffe7bc');sun.intensity=3.35;renderer.toneMappingExposure=1.02;audio.setUnderwater?.(0);return;}
  if(isHmc&&world){
    const raw=world.getWaterInfo(camera.position.x,camera.position.z,player),level=typeof raw==='number'?raw:raw?.level;
    const submerged=Number.isFinite(level)&&camera.position.y<level-.12;
    immersion+=(Number(submerged)-immersion)*(instant?1:1-Math.exp(-5*dt));
    const lake=player.position.y<-30;
    scene.fog.color.set(submerged?'#244f4c':lake?'#4b6358':'#445340');scene.fog.near=submerged?7:lake?28:18;scene.fog.far=submerged?65:lake?145:105;
    scene.background=submerged?belowPastaBackdrop:abovePastaBackdrop;
    scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:scene.fog.near,far:scene.fog.far,amount:.86};
    sun.color.set(lake?'#d4e8d1':'#eee4bd');sun.intensity=lake?2.3:2.65;renderer.toneMappingExposure=1.25+immersion*.08;
    for(const cloud of atmosphereClouds)cloud.visible=false;
    $('game').style.setProperty('--immersion',immersion.toFixed(3));audio.setUnderwater?.(immersion);return;
  }
  if(isLll&&world){
    scene.fog.color.set('#994c30');scene.fog.near=75;scene.fog.far=250;
    scene.background=abovePastaBackdrop;
    scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:75,far:250,amount:.72};
    sun.color.set('#ffe1b5');sun.intensity=2.7;renderer.toneMappingExposure=1.04;
    $('game').style.setProperty('--immersion','0');audio.setUnderwater?.(0);return;
  }
  if(isBbh&&world){
    const inside=world.inside??!!world.roomId;
    const water=world.getWaterInfo(camera.position.x,camera.position.z,player);
    const submerged=water&&camera.position.y<water.level-.12;
    immersion+=(Number(!!submerged)-immersion)*(instant?1:1-Math.exp(-5*dt));
    scene.fog.color.set(submerged?'#263d48':inside?'#352e43':'#514258');scene.fog.near=inside?18:65;scene.fog.far=inside?75:190;
    scene.background=inside?belowPastaBackdrop:abovePastaBackdrop;
    scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:scene.fog.near,far:scene.fog.far,amount:.92};
    sun.color.set(inside?'#e5d4f5':'#d2dcff');sun.intensity=inside?2.05:2.65;renderer.toneMappingExposure=inside?1.3:1.16;
    for(const cloud of atmosphereClouds)cloud.visible=!inside;
    $('game').classList.toggle('inside-mansion',inside);$('game').style.setProperty('--immersion',immersion.toFixed(3));
    audio.setUnderwater?.(immersion);return;
  }
  if(!isCcm||!world)return;
  const inside=world.area===2;
  scene.fog.color.set(inside?'#516e85':'#cbdadf');scene.fog.near=inside?30:100;scene.fog.far=inside?165:300;
  scene.background=inside?belowPastaBackdrop:abovePastaBackdrop;
  scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:scene.fog.near,far:scene.fog.far,amount:.94};
  for(const cloud of atmosphereClouds)cloud.visible=!inside;
  sun.intensity=inside?2.5:3.15;renderer.toneMappingExposure=inside?1.13:1.04;
  $('game').classList.toggle('inside-slide',inside);
}
function updateImmersion(dt,instant=false){
  if(!(isJrb||isDdd||newCourse)||!world)return;
  const raw=world.getWaterInfo(camera.position.x,camera.position.z,player),level=typeof raw==='number'?raw:raw?.level;
  const submerged=Number.isFinite(level)&&camera.position.y<level-.12;
  immersion+=(Number(submerged)-immersion)*(instant?1:1-Math.exp(-5*dt));
  const above=new THREE.Color(isTtc?'#b29b75':isRr?'#bbc8be':isBitdw?'#493f55':isBitfs?'#c27b4d':isBits?'#a29bb6':isSl?'#d2dedd':isWdw?'#9cb9b7':isTtm?'#c2c9a6':isThi?'#becfa9':isDdd?'#78999f':'#bbc9bf'),below=new THREE.Color(isSl?'#567489':isDdd?'#285f78':'#285c67');scene.fog.color.copy(above).lerp(below,immersion);
  scene.fog.near=95*(1-immersion)+6*immersion;scene.fog.far=250*(1-immersion)+64*immersion;
  scene.background=immersion>.45?belowPastaBackdrop:abovePastaBackdrop;
  scene.userData.pastaFog={color:scene.fog.color.getStyle(),near:scene.fog.near,far:scene.fog.far,amount:.93};
  sun.intensity=3.2-immersion*.6;renderer.toneMappingExposure=1.08+immersion*.08;
  $('game').style.setProperty('--immersion',immersion.toFixed(3));
  for(const cloud of atmosphereClouds)cloud.visible=!isDdd&&(isThi||world.area!==2)&&immersion<.5;
  audio.setUnderwater?.(immersion);
}

function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<innerHeight?66:57;camera.updateProjectionMatrix();}
function setQuality(value){quality=value;if(renderer.isSoftware){renderer.maxWidth=value==='high'?1280:value==='low'?720:960;renderer.maxHeight=value==='high'?800:value==='low'?500:640;renderer.maxSegments=isHmc||isLll||isSsl||isDdd||newCourse?(value==='high'?10000:value==='low'?3400:6500):(value==='high'?5500:value==='low'?2600:3600);}const ratio=value==='high'?Math.min(devicePixelRatio,2):value==='low'?1:Math.min(devicePixelRatio,isTouch?1.25:1.5);renderer.setPixelRatio(ratio);renderer.shadowMap.enabled=value!=='low';sun.shadow.mapSize.set(value==='high'?2048:1024,value==='high'?2048:1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}if(world?.setQuality)world.setQuality(value);resize();}
function start(){audio.start();resetGame();setMode('playing');$('scene').focus();if(newCourse){toast(config.brief,7);return;}if(isSsl){toast('Run up a pillar and jump into Klepto. Avoid the dark quicksand; collect the star where it lands beside the pyramid.',6);return;}if(isDdd){toast('Dive through the passage to the submarine dock. Surface for breath, then step on the purple switch to board the sub.',6);return;}if(isHmc){toast('Take the left path. Run, crouch, then jump across the gap. Find the elevator down to Dorrie’s lake.',6);return;}if(isLll){toast(isTouch?'Cross the hot pasta. PUNCH Big Bully toward the edge.':'Cross the hot pasta · E / J to punch · Knock Big Bully over the edge.',6);return;}if(isBbh){toast(isTouch?'Hunt five Boos. Let them follow, then PUNCH while they are solid.':'Hunt five Boos · E / J to punch · Jump, then C / Ctrl to ground pound.',6);return;}if(isCcm){toast(isTouch?'Jump into the chimney. On the slide, steer with the stick and hold BRAKE before tight bends.':'Jump into the cottage chimney · WASD to steer · C / Ctrl to brake · Space to jump.',6);return;}if(isJrb){toast(isTouch?'Hold SWIM UP to rise. Hold DIVE to descend. Keep an eye on your breath.':'WASD to swim · Hold Space to rise · Hold C / Ctrl to dive · E to interact.',6);return;}if(isTouch)toast(isWhomp?'Left thumb moves. Jump, then POUND to strike an exposed Whomp.':'Left thumb moves. Right thumb jumps. Drag the right side to look.',5);else toast(isWhomp?'WASD to move · Space to jump · Ctrl / C to ground pound.':'WASD to move · Space to jump · E to grab. Drag to look around.',4);}
function startingCameraYaw(){if(isCcm){const a=course.start.position,e=course.mission.entry.position;return Math.atan2(e[0]-a[0],e[2]-a[2]);}return course.start.yaw*Math.PI/180;}
function resetGame(){
  Object.assign(edge,{jump:false,action:false,pound:false,dive:false});
  navigationPending=false;worldConnections?.reset?.();world.reset?.();
  player.reset({position:course.start.entryPosition||course.start.position,yaw:course.start.yaw});boss.reset(player);hero.visible=true;hero.position.copy(player.position);coins=0;elapsed=0;deathTimer=0;starCollected=false;heldEnemy=null;grateOpen=false;cameraYaw=startingCameraYaw();cameraPitch=.33;cameraDistance=8.4;cameraTouched=time;healthDisplay=-1;bossHealthDisplay=-1;
  if(isCastle){world.setAdventure?.(currentAdventure());world.enterFromSaved?.(castleEntry(params,adventure),player);cameraYaw=player.yaw;}
  if(isThi&&entryOptions.area===2){world.setArea(2,player,{warp:false});player.warp(world.activeCourse.start,{physics,preserveVitals:false});cameraYaw=player.yaw;}
  if(isSecret)player.setSecretWorld?.(world);if(isBowserArena)player.setArenaWorld?.(world);
  hero.userData.setCapEffect?.(player.cap||'');
  if(starMesh){scene.remove(starMesh);starMesh=null;}bossMesh.visible=true;bossMesh.scale.setScalar(1);if(isBob)physics.setDynamicEnabled('grate_door',true);
  for(const c of world.coins){c.collected=false;c.mesh.visible=true;}
  for(const e of world.enemies){e.alive=true;e.mesh.visible=true;e.mesh.scale.setScalar(1);e.position.copy(e.home);e.mesh.position.copy(e.home);e.fuse=0;e.thrown=null;e.held=false;e.respawn=0;}
  for(const p of particles)scene.remove(p.mesh);particles.length=0;
  hazards?.reset();show('dialog',false);$('stars').textContent='0 / 1';if(permanentStar&&boss.starReady)spawnStar();if(worldMission){createMap();immersion=0;updateEnvironment(.01,true);}updateHud();updateCamera(.016,true);
}
function spawnStar(){if(starMesh||isCastle)return;starMesh=isBowserArena&&boss.rewardKind!=='grand-star'?kit.key(1.35):kit.star(isBowserArena?2:1.3);starMesh.position.set(...starLocation());starMesh.visible=world?.starVisible!==false;scene.add(starMesh);}
function win(){
  if(isCastle||starCollected||player.dead||!starMesh)return;
  const event=world.onRewardCollected?.();if(isBowserArena&&!event)return;if(event)registerAdventureReward(event);
  starCollected=true;$('stars').textContent='1 / 1';audio.star();burst(starMesh.position,60,kit.materials.saffron);starMesh.visible=false;
  const progress=isBowserArena?getProgress():saveStar(config.id,elapsed,coins);adventure=saveAdventure({visited:[config.id]});
  $('result-time').textContent=formatTime(elapsed);$('result-coins').textContent=String(coins);$('result-total').textContent=`${collectionTotal(progress,adventure)} / ${STAR_TOTAL}`;
  if(isBowserArena){$('next-course').href=config.id==='bowser_3'?'./ending.html':'./play.html?course=castle&entry=return';$('next-course').textContent=config.id==='bowser_3'?'Return to the kingdom':'Return to the castle';}
  else if(isBowserStage){$('next-course').href=destinationUrl(BOWSER_LINKS[config.id],{fromCastle:true});$('next-course').textContent='Continue to Bowser';}
  else if(params.get('from')==='castle'){$('next-course').href='./play.html?course=castle&entry=return';$('next-course').textContent='Return to the castle';}
  status.textContent=`${config.name} complete. ${isBowserArena?config.mission:'Star collected'}. ${coins} coins. Time ${formatTime(elapsed)}.`;setMode('victory');
}
function formatTime(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
function update(dt){
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}
  pollGamepad(dt);
  const playing=mode==='playing'||mode==='exploring';
  if(mode==='intro'){
    hero.userData.update?.(dt,{time,speed:0,grounded:true,vy:0,squash:0});bossMesh.userData.update?.(dt,{time,speed:0,state:boss.state,fall:boss.fall||0,hitTimer:boss.hitTimer});
    positionIntroCamera();world.update?.(time,dt,isBob?player:undefined);if(worldMission)updateEnvironment(dt);return;
  }
  if(!playing){if(mode==='victory'){hero.rotation.y+=dt*.35;hero.userData.update?.(dt,{time,speed:0,grounded:true});updateParticles(dt);}return;}
  elapsed+=dt;checkpointClock+=dt;if(checkpointClock>3){checkpointClock=0;saveCastlePosition();}punchTimer=Math.max(0,punchTimer-dt);
  if(key.KeyQ){cameraYaw+=dt*1.8;cameraTouched=time;}if(key.KeyR){cameraYaw-=dt*1.8;cameraTouched=time;}
  if(key.KeyI){cameraPitch-=dt;cameraTouched=time;}if(key.KeyK){cameraPitch+=dt;cameraTouched=time;}
  let ix=(key.KeyD||key.ArrowRight?1:0)-(key.KeyA||key.ArrowLeft?1:0)+stick.x+gamepadMove.x;
  let iz=(key.KeyW||key.ArrowUp?1:0)-(key.KeyS||key.ArrowDown?1:0)-stick.y-gamepadMove.y;
  const n=Math.max(1,Math.hypot(ix,iz));ix/=n;iz/=n;
  const held=boss.state==='held'||!!heldEnemy,moveScale=isBowserArena&&held?0:held?.52:1;
  const input={rawAxisX:ix,rawAxisY:iz,flightTurn:ix,flightPitch:iz,spin:ix,poleUp:Math.max(0,iz),poleDown:Math.max(0,-iz),poleTurn:ix,x:(-Math.cos(cameraYaw)*ix+Math.sin(cameraYaw)*iz)*moveScale,z:(Math.sin(cameraYaw)*ix+Math.cos(cameraYaw)*iz)*moveScale,jump:edge.jump,run:!!(key.ShiftLeft||key.ShiftRight||gamepadRun||Math.hypot(stick.x,stick.y)>.8),crouch:!!(key.ControlLeft||key.ControlRight||key.KeyC||key.touchCrouch||key.gamepadCrouch),groundPound:edge.pound,dive:edge.dive,swimUp:!!(key.Space||key.touchJump||key.gamepadSwimUp),swimDown:!!(key.ControlLeft||key.ControlRight||key.KeyC||key.touchCrouch||key.gamepadCrouch),slideBrake:!!(key.ControlLeft||key.ControlRight||key.KeyC||key.touchCrouch||key.gamepadCrouch)||((isCcm||config.id==='pss')&&iz<-.55),slideTuck:!!(key.ShiftLeft||key.ShiftRight)||(isCcm&&iz>.72)||(config.id==='pss'&&(iz>.72||gamepadRun||Math.hypot(stick.x,stick.y)>.8))};
  if(boss.state==='grabbing'||boss.state==='holdingPlayer'){input.x=input.z=0;input.jump=false;}
  world.setView?.({yaw:cameraYaw,pitch:cameraPitch});
  if(!isBob)world.update?.(time,dt,player);
  const result=player.update(dt,input);if(result.jumped)audio.jump();if(result.landed){audio.squish(Math.min(1,result.landingSpeed/16));shake=Math.min(.12,result.landingSpeed*.003);if(result.groundPound){burst(player.position,13,kit.materials.egg);groundPound();}}
  world.afterPlayerUpdate?.(time,dt,player);worldConnections?.update?.(dt,player);
  if(navigationPending)return;
  if(edge.action)action();edge={jump:false,action:false,pound:false,dive:false};
  if(mode==='dialogue')return;
  boss.update(dt,player);if(mode==='dialogue')return;
  updateEnemies(dt);updateChomp(dt);updateBoulders(dt);hazards?.update(time,dt,player);collectCoins();updateInteractions(dt);updateParticles(dt);
  const p=player.position;hero.position.set(p.x,p.y+.015-(isSsl||isTtm?player.quicksandDepth||0:0),p.z);hero.rotation.y=player.yaw;hero.userData.setCapVisible?.(!player.capLost);hero.userData.setCapEffect?.(player.cap||'');if(hero.userData.wingRig)hero.userData.wingRig.visible=player.cap==='wing'&&!world.wingMesh;hero.visible=!player.pipeHidden&&(player.invincible<=0||Math.floor(time*12)%2===0);hero.userData.update?.(dt,{time,flying:player.flying,flightPitch:player.flightPitch,flightBank:player.flightBank,speed:player.speed,grounded:player.grounded,vy:player.velocity.y,squash:player.squash*(.6+softness),heading:player.yaw,holding:held,softness,diving:player.diving,pounding:player.pounding,swimming:player.swimming,swimPitch:player.swimPitch,strokePhase:player.strokePhase,sliding:player.sliding,slideBlend:player.slideBlend,slidePitch:player.slidePitch,slideBank:player.slideBank,slideBraking:player.slideBraking,punch:punchCourse?punchTimer:0,climbingPole:player.climbingPole,poleTop:player.poleTop,poleSpeed:player.poleSpeed});
  bossMesh.position.copy(boss.position);bossMesh.rotation.y=boss.yaw;bossMesh.userData.update?.(dt,{time,state:boss.state,fall:boss.fall||0,hitTimer:boss.hitTimer,speed:boss.state==='chasing'?.9:0,squash:boss.hitTimer>0?.18*Math.sin(boss.hitTimer*14):0,held:boss.state==='held'});
  if(isBob&&boss.state==='defeated'){bossMesh.scale.y=Math.max(.07,bossMesh.scale.y-dt*.55);bossMesh.scale.x=bossMesh.scale.z=1+(1-bossMesh.scale.y)*.7;if(bossMesh.scale.y<=.08)bossMesh.visible=false;}
  if(starMesh&&!starCollected){starMesh.visible=(!multiArea||world.area===(isCcm?1:2))&&world.starVisible!==false;starMesh.rotation.y=time*1.3;starMesh.position.set(...starLocation());if(!worldMission||world.starCollectible!==false)starMesh.position.y+=Math.sin(time*2)*.18;const collectible=(!multiArea||world.area===(isCcm?1:2))&&world.starVisible!==false&&(!worldMission||world.starCollectible!==false);if(!player.dead&&collectible&&dist(p,starMesh.position)<1.4&&Math.abs(p.y+1-starMesh.position.y)<2.2)win();}
  if(isBob)world.update?.(time,dt,player);updateCamera(dt);if(worldMission)updateEnvironment(dt);updateHud();drawMap();audio.update(dt,playing);if(isCcm||config.id==='pss')audio.setSliding?.(player.slideSpeed||0,player.slideBraking);
  if(player.grounded&&!player.sliding&&player.speed>2){steps+=dt*player.speed;if(steps>2.1){steps=0;audio.squish(.05+softness*.12);}}
  if(player.dead){deathTimer+=dt;if(deathTimer<dt*2)toast('You have become a particularly tragic bowl of spaghetti.',2.5);if(deathTimer>2){const savedCoins=coins;world.reset?.();hazards?.reset();player.reset(isCastle?world.areaRecords[world.area].data.start:isFinalFive?{position:course.start.entryPosition||course.start.position,yaw:course.start.yaw}:course.start);if(isThi&&entryOptions.area===2){world.setArea(2,player,{warp:false});player.warp(world.activeCourse.start,{physics,preserveVitals:false});}worldConnections?.reset?.();if(!starCollected){boss.reset(player);bossMesh.visible=true;bossMesh.scale.setScalar(1);if(starMesh){scene.remove(starMesh);starMesh=null;}}if(heldEnemy){heldEnemy.held=false;heldEnemy.position.copy(heldEnemy.home);heldEnemy.fuse=0;}heldEnemy=null;coins=Math.max(0,savedCoins-5);deathTimer=0;if(permanentStar&&!starCollected&&boss.starReady)spawnStar();cameraYaw=isCastle||isThi&&entryOptions.area===2?player.yaw:startingCameraYaw();cameraTouched=time;if(worldMission){createMap();updateCamera(.016,true);updateEnvironment(.01,true);}toast(newCourse?`Back at the entrance. ${config.objective}.`:isSsl?'Back at the desert entrance. Keep clear of the deepest pasta pits.':isDdd?'Back in the entrance basin. Take a breath, then head for the submarine.':isHmc?'Back at the cave entrance. Dorrie is still waiting in the lake.':isLll?'Back at the start. Keep your feet out of the boiling noodles.':isBbh?'Back outside. The mansion is still haunted.':isCcm?'Back on the mountain. Enter the chimney for another slide.':isJrb?'Back on shore. Take a breath, then try the ship again.':isWhomp?'Back to the start. The fortress is still hungry.':'Back to the start. The mountain is still hungry.',3);}}
  if(Math.floor(time*2)!==Math.floor((time-dt)*2))status.textContent=`${mode}. Health ${player.health} of 8. Coins ${coins}. Altitude ${p.y.toFixed(1)}. ${newCourse?`${areaLabel()}. ${boss.objective}. ${isBowserStage?`Red coins ${boss.redCoinCount||0} of 8. ${player.climbingPole?'Climbing pole.':''}`:isTtc?`Clock ${world.clockMode}.`:isRr?`Climb ${Math.round((boss.climbFraction||0)*100)} percent.`:isThi?`Flowers ${boss.defeatedCount||0} of 5.`:isWdw?`Water ${Number(boss.waterLevel||0).toFixed(1)} meters.`:isTtm?`Climb ${Math.round((boss.climbFraction||0)*100)} percent.`:''}`:isSsl?`Klepto ${boss.state}. Quicksand ${(player.quicksandDepth||0).toFixed(2)}. ${boss.objective}.`:isDdd?`Area ${world.area}. Breath ${Math.round((player.oxygen??1)*(player.breathSeconds??64))} seconds. Platforms ${Math.ceil(boss.switchRemaining||0)} seconds. ${boss.objective}.`:isHmc?`Region ${world.roomName||'cavern'}. Breath ${Math.round((player.oxygen??1)*(player.breathSeconds??64))} seconds. ${boss.objective}.`:isLll?`Big Bully ${boss.state}. ${boss.objective}.`:isBbh?`Room ${world.roomName||world.roomId}. Boos ${boss.defeatedCount??boss.ghostCount??0} of 5. Big Boo ${boss.health} of 3, ${boss.state}.`:isCcm?`Area ${world.area}. Slide speed ${(player.slideSpeed||0).toFixed(1)}. Progress ${Math.round((boss.slideProgress||0)*100)} percent. ${boss.state}.`:isJrb?`Area ${world.area}. Breath ${Math.round((player.oxygen??1)*(player.breathSeconds??64))} seconds. Chests ${boss.openedCount??0} of 4. ${boss.state}.`:`Boss ${boss.health} of 3, ${boss.state}.`} Star ${starCollected?'collected':starMesh?'available':'not available'}. ${Math.round(fps)} frames per second.${renderer.isSoftware?` Compatibility rendering ${Math.round(renderer.lastRenderMs||0)} milliseconds.`:''}`;
}
function action(){
  audio.start();if(mode==='dialogue'){closeDialogue();return;}if(!['playing','exploring'].includes(mode))return;
  if(heldEnemy){const e=heldEnemy;e.held=false;e.thrown={x:Math.sin(player.yaw)*11,y:8,z:Math.cos(player.yaw)*11};heldEnemy=null;audio.throw();return;}
  if(worldMission){const used=world.action?.(player);if(used){if(punchCourse)punchTimer=.3;audio.squish(.4);return;}}
  const wasCaptured=boss.state==='grabbing',r=worldMission?'none':boss.action(player);if(r==='grabbed'){audio.grab();toast('Carry him toward the center, then throw.',3);return;}if(r==='thrown'){audio.throw();return;}if(r==='blocked'){if(!wasCaptured)toast('Get behind him to grab.',2);return;}
  if(!worldMission&&world.action?.(player)){punchTimer=.3;audio.squish(.6);return;}
  for(const f of world.friends){if(dist(player.position,f.position)<2.2){dialogue(f.name||'BOB-OMB BUDDY',f.text||(isBob?'Welcome to Bob-omb Battlefield. Cross the bridge and take the winding path up the mountain. Watch the rolling pasta balls! The king is waiting at the very top. Get behind him, lift him, and throw him onto the summit three times.':config.instructions));return;}}
  for(const s of world.signs||[]){if(dist(player.position,s.position)<1.9&&Math.abs(player.position.y-s.position.y)<2.5){dialogue('A SIGN MADE OF LASAGNA',s.text||config.instructions);return;}}
  for(const e of world.enemies){if(!e.alive||dist(player.position,e.position)>1.9||Math.abs(player.position.y-e.position.y)>1.5)continue;const dx=e.position.x-player.position.x,dz=e.position.z-player.position.z;if(dx*Math.sin(player.yaw)+dz*Math.cos(player.yaw)<-.2)continue;if(e.kind?.includes('bobomb')||e.kind?.includes('Bobomb')){heldEnemy=e;e.held=true;e.fuse=2.6;audio.grab();return;}killEnemy(e);punchTimer=.3;return;}
  punchTimer=.22;audio.tone(180,.08,'triangle',.06,0,110);
}
function collectCoins(){if(player.dead)return;for(const c of world.coins){if(c.collected)continue;const overlaps=c.hitRadius!==undefined?dist(player.position,c.position)<c.hitRadius+player.radius&&player.position.y+player.height>c.position.y-(c.downOffset||0)&&player.position.y<c.position.y+(c.hitHeight||.64):dist(player.position,c.position)<.85&&Math.abs(player.position.y+.8-c.position.y)<1.3;if(overlaps){c.collected=true;c.mesh.visible=false;coins+=c.value||1;player.health=Math.min(8,player.health+(isBbh||isHmc||isLll||isSsl||isDdd||newCourse?(c.value||1):1));if(canSwim)player.refillBreath?.((isBbh||isHmc||isLll||isSsl||isDdd||newCourse?(c.value||1):1)/8);audio.coin();burst(c.position,4,kit.materials.saffron);}}}
function killEnemy(e){if(!e.alive)return;e.alive=false;e.mesh.visible=false;e.respawn=14;coins++;player.health=Math.min(8,player.health+1);burst(e.position,10,kit.materials.egg);audio.squish(.6);}
function damageFrom(pos,amount=1){if(player.knockback(player.position.x-pos.x,player.position.z-pos.z,amount)){audio.hit();shake=.2;}}
function updateEnemies(dt){
  for(const e of world.enemies){if(!e.alive){e.respawn=(e.respawn||14)-dt;if(e.respawn<=0&&dist(player.position,e.home)>12){e.alive=true;e.mesh.visible=true;e.position.copy(e.home);e.fuse=0;}continue;}
    const bombType=/bobomb/i.test(e.kind),p=player.position;
    if(e.held){e.position.set(p.x+Math.sin(player.yaw)*.8,p.y+1.9,p.z+Math.cos(player.yaw)*.8);e.mesh.position.copy(e.position);e.mesh.rotation.y=player.yaw;e.fuse-=dt;if(e.fuse<=0){heldEnemy=null;e.held=false;burst(e.position,28,kit.materials.egg);killEnemy(e);damageFrom(e.position,2);}continue;}
    if(e.thrown){const v=e.thrown;e.position.x+=v.x*dt;e.position.z+=v.z*dt;e.position.y+=v.y*dt;v.y-=26*dt;e.mesh.rotation.x+=dt*8;const g=physics.groundAt(e.position.x,e.position.z,e.position.y+1);if(g&&e.position.y<=g.height+.1){burst(e.position,24,kit.materials.egg);e.thrown=null;killEnemy(e);}e.mesh.position.copy(e.position);continue;}
    const d=dist(p,e.position),near=d<6&&Math.abs(p.y-e.position.y)<2.3;
    const tx=near?p.x:e.home.x+Math.sin(time*.35+e.phase)*1.3,tz=near?p.z:e.home.z+Math.cos(time*.4+e.phase)*1.3;
    const dx=tx-e.position.x,dz=tz-e.position.z,len=Math.hypot(dx,dz)||1,speed=near?(bombType?1.5:1.0):.45;
    if(len>.2){const nx=e.position.x+dx/len*speed*dt,nz=e.position.z+dz/len*speed*dt,g=physics.groundAt(nx,nz,e.position.y+.6);if(g&&Math.abs(g.height-e.position.y)<.6){e.position.x=nx;e.position.z=nz;e.position.y=g.height;}e.mesh.rotation.y=Math.atan2(dx,dz);}
    if(bombType){if(near&&d<2.8)e.fuse=(e.fuse||0)+dt;else e.fuse=Math.max(0,(e.fuse||0)-dt*.3);if(e.fuse>2){burst(e.position,25,kit.materials.toasted);if(d<3&&Math.abs(p.y-e.position.y)<3)damageFrom(e.position,2);killEnemy(e);continue;}const f=1+Math.sin(time*(6+e.fuse*10))*.025*e.fuse;e.mesh.scale.set(f,2-f,f);}
    if(d<(bombType?.95:1.0)&&Math.abs(p.y-e.position.y)<1.65){if(player.velocity.y<-.5&&p.y>e.position.y+.55){killEnemy(e);player.velocity.y=8;player.grounded=false;}else if(punchTimer>0)killEnemy(e);else damageFrom(e.position,1);}
    e.mesh.position.copy(e.position);e.mesh.userData.update?.(dt,{time:time+e.phase,speed:near?1.2:.4});
  }
}
function updateChomp(dt){const c=world.chomp;if(!c)return;chompPhase+=dt;const p=player.position,near=dist(p,c.anchor)<12&&Math.abs(p.y-c.anchor.y)<3;const phase=(chompPhase%4.5),lunge=phase>2.3&&phase<3.1,reach=lunge?7.2:2.1;
  if(!c.direction)c.direction=new THREE.Vector3(0,0,1);if(phase<2.3&&near)c.direction.set(p.x-c.anchor.x,0,p.z-c.anchor.z).normalize();if(!near)c.direction.set(Math.sin(time*.4),0,Math.cos(time*.4));
  const target=c.anchor.clone().addScaledVector(c.direction,reach);const speed=lunge?10:3;c.position.lerp(target,1-Math.exp(-speed*dt));c.position.y=c.anchor.y+Math.abs(Math.sin(time*4))*.18;c.mesh.position.copy(c.position);c.mesh.rotation.y=Math.atan2(c.direction.x,c.direction.z);c.mesh.userData.update?.(dt,{time});
  if(c.chain?.children?.length){const links=c.chain.children;for(let i=0;i<links.length;i++){const t=(i+1)/(links.length+1),q=c.anchor.clone().lerp(c.position,t);q.y+=.3-Math.sin(t*Math.PI)*.55;links[i].position.copy(q);links[i].rotation.y=Math.atan2(c.direction.x,c.direction.z);}}
  if(dist(p,c.position)<1.7&&Math.abs(p.y-c.position.y)<2.5)damageFrom(c.position,3);
}
function pathSample(path,distance){let remain=distance;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=a.distanceTo(b);if(remain<=len)return a.clone().lerp(b,remain/len);remain-=len;}return path[path.length-1].clone();}
function updateBoulders(dt){for(const b of world.rollingBalls||[]){if(!b.length)b.length=b.path.slice(1).reduce((s,p,i)=>s+p.distanceTo(b.path[i]),0);b.distance=((b.distance||0)+dt*(b.speed||6.5))%b.length;const p=pathSample(b.path,b.distance);p.y+=b.radius||.75;b.mesh.position.copy(p);b.mesh.rotation.z+=dt*3;b.mesh.rotation.x+=dt*2;if(dist(player.position,p)<1.15&&Math.abs(player.position.y+.8-p.y)<1.5)damageFrom(p,3);}}
function groundPound(){if(!worldMission)boss.onGroundPound?.(player);world.onGroundPound?.(player);for(const e of world.enemies)if(e.alive&&dist(player.position,e.position)<2.2&&Math.abs(player.position.y-e.position.y)<2)killEnemy(e);if(isBob){const sw=course.objects.find(o=>o.kind==='bhvFloorSwitchGrills');if(sw&&dist(player.position,{x:sw.position[0],z:sw.position[2]})<2.5){grateOpen=true;physics.setDynamicEnabled('grate_door',false);if(world.grate)world.grate.visible=false;toast('The pasta gate opened.',3);}}}
function updateInteractions(dt){
  let text=boss.context?.(player)||'';if(boss.state==='held'&&!isBowserArena)text='Carry him inward · E / GRAB to throw';
  if(heldEnemy)text='E / GRAB to throw the Bob-omb';
  if(!text)for(const f of world.friends)if(dist(player.position,f.position)<2.1&&Math.abs(player.position.y-f.position.y)<2){text=punchCourse?'E / PUNCH to talk':'E / GRAB to talk';break;}
  if(!text)for(const s of world.signs||[])if(dist(player.position,s.position)<1.9&&Math.abs(player.position.y-s.position.y)<2){text=punchCourse?'E / PUNCH to read':multiArea||isHmc?'E / ACT to read':isWhomp?'E / PUNCH to read':'E / GRAB to read';break;}
  if(isBob&&!text&&player.position.y>25&&player.position.y<28.5&&Math.hypot(player.position.x-1.67,player.position.z+41.5)<4)text='A gap ahead. Jump across the noodle trail.';
  if(text){$('context').textContent=text;show('context');}else show('context',false);
  const bActive=isBowserArena?boss.active&&!boss.starReady:!multiArea&&!isHmc&&!isSsl&&!newCourse&&boss.active&&boss.state!=='defeated'&&player.position.y>(boss.homeFloor??boss.home?.y??course.boss?.position?.[1]??-Infinity)-10;show('boss-hud',bActive);if(isBbh||isLll)show('voyage-hud',!starCollected&&!bActive);if(isLll)$('boss-hint').textContent=boss.starReady?'Cross the new bridge to the star.':boss.state==='knockback'?'Keep the pressure. Push toward the edge.':config.bossHint;
  $('objective').textContent=starCollected?'First star collected':worldMission?boss.objective:starMesh?'Collect the pasta star':bActive?`Defeat ${config.boss}`:player.position.y>15?config.climb:config.objective;
  const heart=(course.objects||[]).find(o=>o.kind==='macro_recovery_heart');if(heart&&Math.hypot(player.position.x-heart.position[0],player.position.z-heart.position[2])<1.5&&Math.abs(player.position.y-heart.position[1])<2)player.health=8;
}
function burst(pos,count,material){const base=kit.noodleGeometry([[0,0,0],[.1,.05,0],[.19,0,.03],[.21,-.07,.04]],.027,undefined,4);for(let i=0;i<count;i++){const mesh=new THREE.Mesh(base,material);mesh.position.set(pos.x,pos.y+.5,pos.z);mesh.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);scene.add(mesh);particles.push({mesh,v:new THREE.Vector3((Math.random()-.5)*6,2+Math.random()*5,(Math.random()-.5)*6),life:.8+Math.random()*.6});}}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.v.y-=18*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*4;p.mesh.scale.setScalar(Math.min(1,p.life*3));if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);}}}
function updateCamera(dt,instant=false){
  const p=player.position;if(isCcm&&player.sliding&&player.speed>1.5&&time-cameraTouched>.85){const delta=Math.atan2(Math.sin(player.yaw-cameraYaw),Math.cos(player.yaw-cameraYaw));cameraYaw+=delta*(1-Math.exp(-2.8*dt));}cameraPitch=clamp(cameraPitch,isCastle||player.flying?-.95:canSwim&&player.swimming?-.58:.12,isCastle?1.25:isBbh||isHmc||isDdd?.72:.95);cameraDistance=clamp(cameraDistance,5,14);
  const lookY=p.y+(isCcm&&player.sliding?.72:isBbh&&boss.active?2.3:isLll&&boss.active?2.4:isWhomp&&boss.active?2.6:boss.state==='held'?2.4:1.2);const target=new THREE.Vector3(p.x,lookY,p.z);cameraTarget.lerp(target,instant?1:1-Math.exp(-11*dt));
  const indoors=(isBbh||isHmc||isDdd||isCastle)&&world.inside;
  const d=indoors?Math.min(cameraDistance,boss.active?6.4:5.4):boss.active?cameraDistance+(isWhomp?3.8:isLll?3.2:1.4):cameraDistance;desiredCamera.set(p.x-Math.sin(cameraYaw)*Math.cos(cameraPitch)*d,lookY+Math.sin(cameraPitch)*d+(indoors?.4:1.2),p.z-Math.cos(cameraYaw)*Math.cos(cameraPitch)*d);
  const hit=physics.raycastSegment(cameraTarget,desiredCamera,.38);if(hit){if(isBbh||isHmc||isDdd||isCastle){const ray=desiredCamera.clone().sub(cameraTarget),length=ray.length();desiredCamera.copy(cameraTarget).addScaledVector(ray.normalize(),Math.max(.18,Math.min(length,cameraTarget.distanceTo(hit.point)-.3)));}else{desiredCamera.copy(hit.point);desiredCamera.addScaledVector(new THREE.Vector3(...hit.normal),.45);if(desiredCamera.distanceTo(cameraTarget)<2){desiredCamera.copy(cameraTarget).add(new THREE.Vector3(-Math.sin(cameraYaw)*2.2,3,-Math.cos(cameraYaw)*2.2));}}}
  const cg=physics.groundAt(desiredCamera.x,desiredCamera.z,desiredCamera.y+1);if(cg&&desiredCamera.y<cg.height+.6)desiredCamera.y=cg.height+.6;
  camera.position.lerp(desiredCamera,instant?1:1-Math.exp(-9*dt));if(isBbh||isHmc||isDdd||isCastle){const obstruction=physics.raycastSegment(cameraTarget,camera.position,.15);if(obstruction){const ray=camera.position.clone().sub(cameraTarget).normalize();camera.position.copy(cameraTarget).addScaledVector(ray,Math.max(.16,cameraTarget.distanceTo(obstruction.point)-.2));}}shake=Math.max(0,shake-dt*.6);if(shake>0)camera.position.add(new THREE.Vector3((Math.random()-.5)*shake,(Math.random()-.5)*shake,0));camera.lookAt(cameraTarget);
  if(isCcm){const targetFov=(innerWidth<innerHeight?66:57)+Math.min(6,(player.slideSpeed||0)*.22);camera.fov+=(targetFov-camera.fov)*(instant?1:1-Math.exp(-3*dt));camera.updateProjectionMatrix();}
  sun.position.set(p.x-40,p.y+65,p.z+32);shadowTarget.position.set(p.x,p.y,p.z);shadowTarget.updateMatrixWorld();
}
function updateHud(){
  if(healthDisplay!==player.health){healthDisplay=player.health;$('health').innerHTML=Array.from({length:8},(_,i)=>`<i class="${i>=player.health?'empty':''}"></i>`).join('');$('health').setAttribute('aria-label',`${player.health} of 8 health`);}
  if(bossHealthDisplay!==boss.health){bossHealthDisplay=boss.health;[...$('boss-health').children].forEach((e,i)=>e.classList.toggle('empty',i>=boss.health));}
  $('coins').textContent=String(coins).padStart(2,'0');
  if(isKingdom){updateKingdomHud();return;}
  if(newCourse){
    const air=clamp(player.oxygen??1,0,1),inPlay=['playing','exploring','dialogue'].includes(mode),swimming=!!player.swimming;
    show('breath-hud',inPlay&&(swimming||air<.995));$('breath-fill').style.width=`${air*100}%`;$('breath-time').textContent=`${Math.ceil(air*(player.breathSeconds||64))}s`;$('breath-hud').classList.toggle('low-air',air<.25);
    $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;$('objective').textContent=boss.objective||config.objective;
    show('chest-progress',false);show('slide-readout',false);show('ghost-progress',false);show('course-meter',inPlay&&!starCollected);
    const value=isBowserStage?(boss.redCoinCount||0)/8:isTtc||isRr?boss.climbFraction||0:isWdw?clamp((boss.waterLevel||0)/(boss.maxWaterLevel||28.16),0,1):isTtm?boss.climbFraction||0:isThi?(boss.defeatedCount||0)/5:clamp((player.position.y-course.start.position[1])/(43-course.start.position[1]),0,1);
    $('course-meter-label').textContent=isBowserStage?'RED PASTA COINS':isTtc?'CLOCK · '+String(world.clockMode).toUpperCase():isRr?'CRUISER CLIMB':isWdw?'WATER LEVEL':isTtm?'SUMMIT CLIMB':isThi?'GIANT FLOWERS':'SNOWMAN CLIMB';$('course-meter-value').textContent=isBowserStage?`${boss.redCoinCount||0} / 8`:isWdw?`${Number(boss.waterLevel||0).toFixed(1)} m`:isThi?`${boss.defeatedCount||0} / 5`:`${Math.round(value*100)}%`;$('course-meter-fill').style.width=`${clamp(value,0,1)*100}%`;$('course-meter').classList.toggle('urgent',isSl&&swimming);$('course-meter').setAttribute('aria-label',isBowserStage?`${boss.redCoinCount||0} of 8 red pasta coins collected`:isTtc?`${world.clockMode} clock. Climb ${Math.round(value*100)} percent`:isWdw?`Water level ${Number(boss.waterLevel||0).toFixed(1)} meters`:isThi?`${boss.defeatedCount||0} of 5 giant flowers defeated`:`Climb ${Math.round(value*100)} percent`);
    $('altitude').textContent=player.climbingPole?'CLIMBING POLE':swimming?`${Math.round(Math.max(0,(player.waterLevel??player.position.y)-player.position.y))} m deep`:`${Math.round(player.position.y)} m`;
    $('touch-jump').textContent=swimming?'SWIM UP':'JUMP';$('touch-pound').textContent=player.climbingPole?'DROP':swimming?'DIVE':'POUND';$('touch-jump').setAttribute('aria-label',swimming?'Hold to swim up':'Jump');$('touch-pound').setAttribute('aria-label',swimming?'Hold to dive':'Crouch or ground pound');$('breath-hud').setAttribute('aria-label',`${Math.round(air*100)} percent breath remaining`);if((isTtm||isTtc||isBowserStage)&&Math.abs(mapHeight-player.position.y)>8)createMap();
  }else if(isJrb){
    const air=clamp(player.oxygen??1,0,1),inPlay=['playing','exploring','dialogue'].includes(mode);
    show('breath-hud',inPlay&&(player.swimming||air<.995));
    $('breath-fill').style.width=`${air*100}%`;$('breath-hud').classList.toggle('low-air',air<.25);
    $('breath-time').textContent=`${Math.ceil(air*(player.breathSeconds||64))}s`;$('breath-hud').setAttribute('aria-label',`${Math.round(air*100)} percent breath remaining`);
    $('area-name').textContent=world.area===2?'INSIDE THE SUNKEN SHIP':'JOLLY ROGER BAY';
    $('voyage-status').textContent=boss.objective||config.objective;
    show('chest-progress',world.area===2);
    const count=boss.openedCount??0;[...$('chest-progress').children].forEach((e,i)=>e.classList.toggle('opened',i<count));$('chest-progress').setAttribute('aria-label',`${count} of 4 treasure chests opened`);
    const swimming=!!player.swimming;$('touch-jump').textContent=swimming?'SWIM UP':'JUMP';$('touch-pound').textContent=player.climbingPole?'DROP':swimming?'DIVE':'POUND';
    $('touch-jump').setAttribute('aria-label',swimming?'Hold to swim up':'Jump');$('touch-pound').setAttribute('aria-label',swimming?'Hold to dive':'Crouch or ground pound');
    const depth=Math.max(0,(player.waterLevel??player.position.y)-player.position.y);$('altitude').textContent=player.climbingPole?'CLIMBING POLE':swimming?`${Math.round(depth)} m deep`:`${Math.round(player.position.y)} m`;
  }else if(isSsl||isDdd){
    $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;
    show('chest-progress',false);show('slide-readout',false);show('ghost-progress',false);show('boss-health',false);
    const air=clamp(player.oxygen??1,0,1),inPlay=['playing','exploring','dialogue'].includes(mode),swimming=!!player.swimming;
    show('breath-hud',inPlay&&(swimming||air<.995));$('breath-fill').style.width=`${air*100}%`;$('breath-hud').classList.toggle('low-air',air<.25);$('breath-time').textContent=`${Math.ceil(air*(player.breathSeconds||64))}s`;
    $('breath-hud').setAttribute('aria-label',`${Math.round(air*100)} percent breath remaining`);
    $('touch-jump').textContent=swimming?'SWIM UP':'JUMP';$('touch-pound').textContent=player.climbingPole?'DROP':swimming?'DIVE':'POUND';
    $('touch-jump').setAttribute('aria-label',swimming?'Hold to swim up':'Jump');$('touch-pound').setAttribute('aria-label',swimming?'Hold to dive':'Crouch or ground pound');
    const remaining=isDdd?boss.switchRemaining||0:0,sinking=isSsl?(player.quicksandDepth||0):0;
    show('course-meter',remaining>0||sinking>.04);
    $('course-meter-label').textContent=isDdd?'PLATFORMS':'QUICKSAND';$('course-meter-value').textContent=isDdd?`${Math.ceil(remaining)}s`:'JUMP';
    $('course-meter-fill').style.width=`${clamp(isDdd?remaining/(boss.switchDuration||13.333):sinking/1.6,0,1)*100}%`;
    $('course-meter').classList.toggle('urgent',isDdd?remaining>0&&remaining<4:sinking>.65);
    $('course-meter').setAttribute('aria-label',isDdd?`${Math.ceil(remaining)} seconds of temporary platforms remaining`:`Sinking in quicksand. Jump to escape.`);
    $('altitude').textContent=player.climbingPole?'CLIMBING POLE':swimming?`${Math.round(Math.max(0,(player.waterLevel??player.position.y)-player.position.y))} m deep`:isSsl&&player.tornadoActive?'IN THE TWISTER':isSsl&&sinking>.04?'SINKING':`${Math.round(player.position.y)} m`;
  }else if(isCcm){
    const inside=world.area===2,progress=clamp(boss.slideProgress||0,0,1);
    $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;
    show('chest-progress',false);show('slide-readout',inside);
    $('slide-speed').textContent=String(Math.round(player.slideSpeed||0));$('slide-fill').style.width=`${progress*100}%`;
    $('slide-section').textContent=player.slideBraking?'BRAKING':progress>.985?'THE FINISH':player.sliding?'SLIDING':'ON FOOT';
    $('slide-readout').setAttribute('aria-label',`${Math.round(player.slideSpeed||0)} meters per second. ${Math.round(progress*100)} percent down the slide.`);
    $('touch-pound').textContent=inside?'BRAKE':'POUND';$('touch-pound').setAttribute('aria-label',inside?'Hold to brake on the slide':'Crouch or ground pound');
    $('altitude').textContent=inside?`${Math.round(progress*100)}% down`:`${Math.round(player.position.y)} m`;
  }else if(isHmc){
    $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;
    show('chest-progress',false);show('slide-readout',false);show('ghost-progress',false);
    const air=clamp(player.oxygen??1,0,1),inPlay=['playing','exploring','dialogue'].includes(mode),swimming=!!player.swimming;
    show('breath-hud',inPlay&&(swimming||air<.995));$('breath-fill').style.width=`${air*100}%`;$('breath-hud').classList.toggle('low-air',air<.25);$('breath-time').textContent=`${Math.ceil(air*(player.breathSeconds||64))}s`;
    $('breath-hud').setAttribute('aria-label',`${Math.round(air*100)} percent breath remaining`);
    $('touch-jump').textContent=swimming?'SWIM UP':'JUMP';$('touch-pound').textContent=player.climbingPole?'DROP':swimming?'DIVE':'POUND';
    $('touch-jump').setAttribute('aria-label',swimming?'Hold to swim up':'Jump');$('touch-pound').setAttribute('aria-label',swimming?'Hold to dive':'Crouch or ground pound');
    $('altitude').textContent=boss.dorrie?.riding?'RIDING DORRIE':swimming?`${Math.round(Math.max(0,(player.waterLevel??player.position.y)-player.position.y))} m deep`:`${Math.round(player.position.y)} m`;
    if(Math.abs(mapHeight-player.position.y)>8)createMap();
  }else if(isLll){
    $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;
    show('chest-progress',false);show('slide-readout',false);show('ghost-progress',false);show('breath-hud',false);show('boss-health',false);
    $('altitude').textContent=player.surface?.includes('BURNING')?'TOO HOT':`${Math.round(player.position.y)} m`;
  }else if(isBbh){
    const count=boss.defeatedCount??boss.ghostCount??0;
    $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;
    show('chest-progress',false);show('slide-readout',false);show('ghost-progress',!boss.starReady);
    [...$('ghost-progress').children].filter(e=>e.tagName==='I').forEach((e,i)=>e.classList.toggle('defeated',i<count));
    $('ghost-count').textContent=`${count} / 5 BOOS`;$('ghost-progress').setAttribute('aria-label',`${count} of 5 Boos defeated`);
    const air=clamp(player.oxygen??1,0,1),inPlay=['playing','exploring','dialogue'].includes(mode),swimming=!!player.swimming;
    show('breath-hud',inPlay&&(swimming||air<.995));$('breath-fill').style.width=`${air*100}%`;$('breath-hud').classList.toggle('low-air',air<.25);$('breath-time').textContent=`${Math.ceil(air*(player.breathSeconds||64))}s`;
    $('breath-hud').setAttribute('aria-label',`${Math.round(air*100)} percent breath remaining`);
    $('touch-jump').textContent=swimming?'SWIM UP':'JUMP';$('touch-pound').textContent=player.climbingPole?'DROP':swimming?'DIVE':'POUND';
    $('touch-jump').setAttribute('aria-label',swimming?'Hold to swim up':'Jump');$('touch-pound').setAttribute('aria-label',swimming?'Hold to dive':'Crouch or ground pound');
    $('altitude').textContent=player.climbingPole?'CLIMBING POLE':swimming?'CELLAR POOL':world.inside?(player.position.y>5?'UPPER FLOOR':player.position.y<-10?'CELLAR':'FIRST FLOOR'):'COURTYARD';
  }else $('altitude').textContent=`${Math.max(0,Math.round(player.position.y))} m`;
}
function updateKingdomHud(){
  const active=['playing','exploring','dialogue'].includes(mode),air=clamp(player.oxygen??1,0,1),swimming=!!player.swimming,flight=!!player.flying;
  $('area-name').textContent=areaLabel();$('voyage-status').textContent=boss.objective||config.objective;$('objective').textContent=starCollected?'Reward collected':boss.objective||config.objective;
  show('chest-progress',false);show('ghost-progress',false);show('slide-readout',config.id==='pss'&&active);
  if(config.id==='pss'){$('slide-speed').textContent=Math.round(player.slideSpeed||player.speed||0);$('slide-section').textContent=`${Number(boss.slideTime||boss.elapsed||0).toFixed(1)} s · TARGET < 21 s`;$('slide-fill').style.width=`${clamp(boss.slideProgress||0,0,1)*100}%`;}
  show('breath-hud',active&&(swimming||air<.995));$('breath-fill').style.width=`${air*100}%`;$('breath-time').textContent=`${Math.ceil(air*(player.breathSeconds||64))}s`;$('breath-hud').classList.toggle('low-air',air<.25);
  const cap=player.cap,remaining=player.capRemaining||0;show('cap-hud',active&&!!cap);$('cap-label').textContent=cap==='wing'?'WING CAP':cap==='metal'?'METAL CAP':'VANISH CAP';$('cap-time').textContent=`${Math.ceil(remaining)}s`;$('cap-fill').style.width=`${clamp(remaining/(cap==='wing'?120:20),0,1)*100}%`;
  $('touch-action').textContent=isBowserArena?(boss.state==='held'?'THROW':'GRAB'):player.inCannon?'FIRE':'ACT';$('touch-jump').textContent=player.cannon?((player.cannonLift??1)<1?'RISING':'FIRE'):flight?'NOSE UP':swimming?'SWIM UP':'JUMP';$('touch-pound').textContent=flight?'FOLD WINGS':swimming?'DIVE':config.id==='pss'?'BRAKE':'POUND';
  $('touch-jump').setAttribute('aria-label',player.cannon?((player.cannonLift??1)<1?'Cannon rising; wait before firing':'Fire cannon'):flight?'Hold to pitch upward':swimming?'Hold to swim up':'Jump');$('touch-action').setAttribute('aria-label',isBowserArena?(boss.state==='held'?'Release Bowser toward a bomb':'Grab Bowser’s tail'):player.inCannon?'Fire the castle cannon':'Talk, open, or interact');$('touch-pound').setAttribute('aria-label',flight?'Fold wings and descend':swimming?'Hold to dive':config.id==='pss'?'Hold to brake on the slide':'Crouch or ground pound');
  $('altitude').textContent=flight?'FLYING':player.cannon||player.inCannon?'CANNON':swimming?`${Math.round(Math.max(0,(player.waterLevel??player.position.y)-player.position.y))} m deep`:`${Math.round(player.position.y)} m`;
  show('course-meter',active&&!starCollected&&config.id!=='pss');let label,value,text;
  if(isCastle){label='KINGDOM STARS';value=collectionTotal(getProgress(),adventure)/STAR_TOTAL;text=`${Math.round(value*STAR_TOTAL)} / ${STAR_TOTAL}`;$('stars').textContent=text;}
  else if(isBowserArena){label=boss.state==='held'?'THROW POWER':'BOWSER';value=boss.state==='held'?clamp(boss.spinFraction||0,0,1):1-boss.health/(boss.maxHealth||3);text=boss.state==='held'?`${Math.round(value*100)}%`:`${boss.health} / ${boss.maxHealth}`;}
  else{label='RED PASTA COINS';value=(boss.redCoinCount||0)/8;text=`${boss.redCoinCount||0} / 8`;}
  $('course-meter-label').textContent=label;$('course-meter-value').textContent=text;$('course-meter-fill').style.width=`${clamp(value||0,0,1)*100}%`;
  if(isCastle&&Math.abs(mapHeight-player.position.y)>5)createMap();
}
function mapPoint(p){return [(p.x-mapProjection.x)*mapProjection.scale+120,(p.z-mapProjection.z)*mapProjection.scale+120];}
function createMap(){
  if(!world||!course)return;
  mapHeight=player.position.y;
  const active=worldMission?world.activeCourse||course:course;
  mapProjection={x:0,z:0,scale:1.35};
  if(worldMission&&active.bounds){const b=Array.isArray(active.bounds)?active.bounds:active.bounds.min.map((v,i)=>[v,active.bounds.max[i]]);mapProjection={x:(b[0][0]+b[0][1])*.5,z:(b[2][0]+b[2][1])*.5,scale:212/Math.max(b[0][1]-b[0][0],b[2][1]-b[2][0])};}
  mapBackground=document.createElement('canvas');mapBackground.width=mapBackground.height=240;
  const c=mapBackground.getContext('2d');c.fillStyle=isSsl?'#755331':isDdd?'#1f4054':isHmc?'#253c32':isLll?'#512b24':isBbh?'#2e253e':isCcm?'#263d4b':isJrb?'#172e32':'#3c341e';c.fillRect(0,0,240,240);
  for(const t of active.triangles){const vs=t.slice(0,3).map(i=>active.vertices[i]);if(Math.abs((vs[1][0]-vs[0][0])*(vs[2][2]-vs[0][2])-(vs[1][2]-vs[0][2])*(vs[2][0]-vs[0][0]))<.05)continue;const h=vs.reduce((a,v)=>a+v[1],0)/3;if((isCastle||isBbh||isHmc||isTtm||isTtc||isBowserStage)&&Math.abs(h-player.position.y)>(isHmc?16:isTtm||isTtc||isBowserStage?12:5))continue;if(isHmc&&t[3]?.includes('INTANGIBLE'))continue;c.fillStyle=isHmc?`hsl(126,16%,${clamp(43+h*.16,24,60)}%)`:isLll?t[3]?.includes('BURNING')?'#bf5a31':`hsl(34,22%,${clamp(44+h*.25,28,66)}%)`:isBbh?`hsl(278,18%,${clamp(39+h*.3,22,60)}%)`:isCcm?`hsl(201,16%,${clamp(50+h*.4,20,75)}%)`:isJrb?`hsl(${world.area===2?37:164},${world.area===2?30:15}%,${clamp(32+h*.32,16,63)}%)`:`hsl(${50-h*.25},${26+h*.3}%,${28+h*.65}%)`;c.beginPath();vs.forEach((v,i)=>{const [x,z]=mapPoint({x:v[0],z:v[2]});i?c.lineTo(x,z):c.moveTo(x,z);});c.closePath();c.fill();}
  drawMap();
}
function drawMap(){
  if(!mapBackground||!player)return;const c=$('map').getContext('2d');c.drawImage(mapBackground,0,0);
  if(isBbh&&routeVisible)for(const ghost of boss.ghosts||[]){if(!ghost.alive)continue;const q=mapPoint(ghost.position);c.fillStyle='#eadff3';c.beginPath();c.arc(q[0],q[1],3,0,TAU);c.fill();}
  if(routeVisible){c.strokeStyle='#f3ce72';c.lineWidth=2;c.setLineDash([3,4]);c.beginPath();(world.routePoints||[]).forEach((p,i)=>{const [x,z]=mapPoint(p);i?c.lineTo(x,z):c.moveTo(x,z);});c.stroke();c.setLineDash([]);}
  const rawTarget=newCourse||isSsl||isDdd||isHmc||isLll?(world.mapGoal||starLocation()):isBbh?(world.mapGoal||starLocation()):isCcm?(world.mapGoal||starLocation()):isJrb&&world.area===1?(course.mission?.hatch?.position||starLocation()):starLocation(),target=Array.isArray(rawTarget)?rawTarget:[rawTarget.x,rawTarget.y,rawTarget.z],goal=mapPoint({x:target[0],z:target[2]});
  c.fillStyle='#f7d277';c.font='19px Georgia';c.fillText(((isJrb||isDdd)&&world.area===1)||((isCcm||isBbh||isLll||isSsl)&&!boss.starReady)?'◇':'★',goal[0]-8,goal[1]+7);
  const p=mapPoint(player.position);c.save();c.translate(...p);c.rotate(-player.yaw);c.fillStyle='#fff1c7';c.beginPath();c.moveTo(0,9);c.lineTo(-5,-6);c.lineTo(0,-3);c.lineTo(5,-6);c.closePath();c.fill();c.restore();
}

function resetKnob(){$('stick-knob').style.transform='translate(-50%, -50%)';}
function wireInputs(){
  $('clock-entry').onchange=e=>{if(isTtc&&mode==='intro'){world.setClockMode(e.target.value);toast(`Clock entry: ${e.target.options?.[e.target.selectedIndex]?.textContent||e.target.value}`,2);}};
  $('play').onclick=start;$('pause-button').onclick=pause;$('resume').onclick=()=>setMode(starCollected?'exploring':'playing');$('restart').onclick=()=>{resetGame();setMode('playing');};$('again').onclick=()=>{resetGame();setMode('playing');};$('explore').onclick=()=>setMode('exploring');$('help-button').onclick=()=>setMode('help');$('close-help').onclick=()=>setMode('paused');$('dialog-close').onclick=closeDialogue;
  $('softness').oninput=e=>{softness=+e.target.value;player.cookingSoftness=softness;$('softness-label').textContent=softness<.3?'Al dente':softness>.75?'Overcooked':'Tender';};
  $('quality').onchange=e=>{qualityAdjusted=true;setQuality(e.target.value);};$('sound').onclick=()=>{audio.start();audio.setEnabled(!audio.enabled);$('sound').textContent=audio.enabled?'On':'Off';$('sound').setAttribute('aria-pressed',String(audio.enabled));};
  $('route').onclick=()=>{routeVisible=!routeVisible;if(world.guide)world.guide.visible=routeVisible;$('route').textContent=routeVisible?'On':'Off';$('route').setAttribute('aria-pressed',String(routeVisible));};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen();}catch{toast('Rotate your phone for a wider view.',3);}};
  addEventListener('pagehide',saveCastlePosition);
  addEventListener('resize',resize);addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',()=>{key={};stick={x:0,y:0};resetKnob();if(mode==='playing'||mode==='exploring')setMode('paused');});
  addEventListener('keydown',e=>{const inPlay=['playing','exploring'].includes(mode);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&inPlay)e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){if(mode==='help')setMode('paused');else if(mode==='dialogue')closeDialogue();else pause();return;}if(mode==='intro'&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();start();return;}if(mode==='dialogue'&&['KeyE','KeyJ','Enter','Space'].includes(e.code)){e.preventDefault();closeDialogue();return;}if(!inPlay)return;key[e.code]=true;if(e.code==='Space')edge.jump=true;if(e.code==='KeyE'||e.code==='KeyJ')edge.action=true;if(['ControlLeft','ControlRight','KeyC'].includes(e.code))edge.pound=true;if(e.code==='KeyX')edge.dive=true;if(e.code==='KeyH')setMode('help');});addEventListener('keyup',e=>{key[e.code]=false;});
  let drag=null;$('scene').addEventListener('pointerdown',e=>{if(!['playing','exploring'].includes(mode))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};$('scene').setPointerCapture(e.pointerId);});$('scene').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;cameraYaw-=(e.clientX-drag.x)*.006;cameraPitch+=(e.clientY-drag.y)*.004;cameraTouched=time;drag.x=e.clientX;drag.y=e.clientY;});$('scene').addEventListener('pointerup',()=>drag=null);$('scene').addEventListener('pointercancel',()=>drag=null);$('scene').addEventListener('wheel',e=>{e.preventDefault();cameraDistance+=e.deltaY*.008;},{passive:false});
  let stickId=null;const zone=$('stick-zone');const moveStick=e=>{const r=zone.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,len=Math.max(47,Math.hypot(x,y));stick.x=clamp(x/len,-1,1);stick.y=clamp(y/len,-1,1);$('stick-knob').style.transform=`translate(calc(-50% + ${stick.x*36}px),calc(-50% + ${stick.y*36}px))`;};zone.addEventListener('pointerdown',e=>{e.preventDefault();stickId=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e);});zone.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});const endStick=()=>{stickId=null;stick.x=stick.y=0;resetKnob();};zone.addEventListener('pointerup',endStick);zone.addEventListener('pointercancel',endStick);
  $('touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();edge.jump=true;key.touchJump=true;$('touch-jump').setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('touch-jump').addEventListener(ev,()=>key.touchJump=false);$('touch-action').addEventListener('pointerdown',e=>{e.preventDefault();edge.action=true;});$('touch-dive').addEventListener('pointerdown',e=>{e.preventDefault();if(['playing','exploring'].includes(mode))edge.dive=true;});$('touch-pound').addEventListener('pointerdown',e=>{e.preventDefault();edge.pound=true;key.touchCrouch=true;$('touch-pound').setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('touch-pound').addEventListener(ev,()=>key.touchCrouch=false);
}
function pollGamepad(dt){
  const g=Array.from(navigator.getGamepads?.()||[]).find(Boolean);gamepadMove.x=gamepadMove.y=0;gamepadRun=false;key.gamepadCrouch=false;key.gamepadSwimUp=false;
  if(!g){gamepadPrevious=[];return;}
  const pressed=i=>g.buttons[i]?.pressed&&!gamepadPrevious[i];
  const buttons=g.buttons.map(b=>b.pressed),modeAtPoll=mode;
  if(modeAtPoll==='intro'){if(pressed(0)||pressed(9))start();}
  else if(modeAtPoll==='dialogue'){if(pressed(0)||pressed(2)||pressed(9))closeDialogue();}
  else if(modeAtPoll==='paused'){if(pressed(0)||pressed(1)||pressed(9))setMode(starCollected?'exploring':'playing');}
  else if(modeAtPoll==='help'){if(pressed(1)||pressed(9))setMode('paused');}
  else if(modeAtPoll==='victory'){
    if(pressed(0))location.href=$('next-course').href;
    else if(pressed(1))location.href='./index.html#courses';
    else if(pressed(2))setMode('exploring');
    else if(pressed(3)){resetGame();setMode('playing');}
  }else if(modeAtPoll==='playing'||modeAtPoll==='exploring'){
    const dz=x=>Math.abs(x)<.15?0:x;gamepadMove.x=dz(g.axes[0]||0);gamepadMove.y=dz(g.axes[1]||0);gamepadRun=Math.hypot(gamepadMove.x,gamepadMove.y)>.8;
    cameraYaw-=dz(g.axes[2]||0)*dt*2;cameraPitch+=dz(g.axes[3]||0)*dt;if(dz(g.axes[2]||0)||dz(g.axes[3]||0))cameraTouched=time;
    if(pressed(0))edge.jump=true;if(pressed(2))edge.action=true;if(pressed(1))edge.pound=true;if(pressed(3))edge.dive=true;
    key.gamepadCrouch=!!g.buttons[1]?.pressed;key.gamepadSwimUp=!!g.buttons[0]?.pressed;if(pressed(9))pause();
  }
  gamepadPrevious=buttons;
}

init().catch(fail);
