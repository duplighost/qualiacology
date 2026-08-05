(function(){
  'use strict';

  const C=window.PotCore, D=window.PotContent, Audio=window.PotAudio;
  const $=id=>document.getElementById(id);
  const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  const lightCanvas=document.createElement('canvas'),lightCtx=lightCanvas.getContext('2d');
  const dom={
    title:$('titleScreen'),settings:$('settingsScreen'),pause:$('pauseScreen'),death:$('deathScreen'),end:$('endScreen'),hud:$('hud'),
    start:$('startBtn'),settingsBtn:$('settingsBtn'),closeSettings:$('closeSettingsBtn'),resume:$('resumeBtn'),pauseRestart:$('pauseRestartBtn'),pauseTitle:$('pauseTitleBtn'),retry:$('retryBtn'),deathTitle:$('deathTitleBtn'),again:$('againBtn'),endTitle:$('endTitleBtn'),pauseBtn:$('pauseBtn'),
    difficulty:$('difficultySelect'),shake:$('shakeRange'),flash:$('flashRange'),audio:$('audioToggle'),aimAssist:$('aimAssistToggle'),resetRecord:$('resetRecordBtn'),
    zone:$('zoneName'),objective:$('objective'),rank:$('styleRank'),styleScore:$('styleScore'),clarityBar:$('clarityBar'),clarityNumber:$('clarityNumber'),warmthBar:$('warmthBar'),warmthNumber:$('warmthNumber'),focusBar:$('focusBar'),focusNumber:$('focusNumber'),verbs:$('verbs'),bossHud:$('bossHud'),bossName:$('bossName'),bossPhase:$('bossPhase'),bossBar:$('bossBar'),minimap:$('minimap'),
    prompt:$('prompt'),promptKey:$('promptKey'),promptText:$('promptText'),toast:$('toast'),toastTitle:$('toastTitle'),toastCopy:$('toastCopy'),banner:$('banner'),bannerKicker:$('bannerKicker'),bannerTitle:$('bannerTitle'),bannerSub:$('bannerSub'),endStats:$('endStats'),deathCopy:$('deathCopy'),flashEl:$('flash'),
    touch:$('touchControls'),movePad:$('movePad'),moveKnob:$('moveKnob'),aimPad:$('aimPad'),rotate:$('rotateScreen')
  };
  const touchUI={blade:document.querySelector('[data-touch="blade"]'),dash:document.querySelector('[data-touch="dash"]'),read:document.querySelector('[data-touch="read"]'),focus:document.querySelector('[data-touch="focus"]')};

  const params=new URLSearchParams(location.search);
  const QA=params.has('qa');
  const REDUCED_MOTION=matchMedia('(prefers-reduced-motion: reduce)');
  const COARSE_POINTER=matchMedia('(any-pointer: coarse)');
  const view={w:innerWidth,h:innerHeight,dpr:1};
  const camera={x:480,y:420,z:0,zoom:1,targetZoom:1,trauma:0,shakeX:0,shakeY:0,leadX:0,leadY:0,kickX:0,kickY:0};
  const world=D.buildWorld();
  const settings=C.Store.get('potlight.settings',{difficulty:'route',shake:.8,flash:.75,audio:true,aimAssist:true});
  const record=C.Store.get('potlight.record',{bestScore:0,bestRank:'D',bestTime:null,completions:0,pie:false});
  Object.assign(dom.difficulty,{value:settings.difficulty});dom.shake.value=settings.shake;dom.flash.value=settings.flash;dom.audio.checked=settings.audio;dom.aimAssist.checked=settings.aimAssist;

  const input={keys:new Set(),pressed:new Set(),released:new Set(),mouseX:view.w*.65,mouseY:view.h*.45,mouseDown:false,rightDown:false,mousePressed:false,rightPressed:false,touchMove:{x:0,y:0,id:null},touchAim:{x:1,y:0,id:null,fire:false},touchActions:new Set(),buffers:{fire:0,dash:0,blade:0,interact:0,focus:0},gamepadPrev:{},lastDevice:'mouse'};

  const game={
    mode:'title',time:0,runTime:0,lastTime:0,accumulator:0,stage:0,phase:'title',waveIndex:0,wavePending:0,stageKills:0,gatesOpen:new Set(),abilities:new Set(),checkpoint:0,
    enemies:[],bullets:[],pickups:[],particles:[],rings:[],slashes:[],chains:[],telegraphs:[],afterimages:[],decoys:[],echoShots:[],scheduled:[],history:new C.RingBuffer(480),
    player:null,companion:null,score:0,style:0,stylePeak:0,comboTimer:0,kills:0,perfects:0,shots:0,hits:0,damageTaken:0,pie:false,careRead:[],optionalUsed:false,
    hitstop:0,toastTimer:0,bannerTimer:0,promptTarget:null,boss:null,bossMaxHp:0,weatherLevel:.4,qaInvulnerable:QA,completed:false,
    tutorial:{move:false,blade:false,dash:false,pulse:false,focus:false,echo:false},statsDirty:true,uiClock:0,decor:[],lastHistorySample:0,lastEchoTime:0,
    routePath:[],routeClock:0,routeTargetKey:'',routeLabel:'',routeTarget:null,threatClock:0,portraitBlocked:false,orientationPause:false,sheltered:false,weather:null,
    perf:{lastFrame:0,samples:[],longFrames:0,maxMs:0}
  };

  function makePlayer(){
    const x=D.STAGES[0].entry.x,y=D.STAGES[0].entry.y;
    return {x,y,z:0,r:22,collisionR:14,vx:0,vy:0,angle:0,aimAngle:0,aimX:1,aimY:0,aimTargetX:x+480,aimTargetY:y,clarity:100,maxClarity:100,warmth:0,maxWarmth:100,
      shotCd:0,bladeCd:0,bladeTime:0,bladeStep:0,comboWindow:0,dashCd:0,dashTime:0,dashX:0,dashY:0,dashPerfect:false,invuln:0,focusCd:0,focusTime:0,pulseCd:0,
      hurtFlash:0,hurtAngle:0,homeShield:0,homeShieldUsed:false,moveSpeed:286,alive:true,styleGlow:0,trailClock:0,lastSafeX:x,lastSafeY:y,stuckTime:0,
      walkPhase:0,moveAmount:0,footstepClock:0,recoil:0,muzzleTime:0,bladeImpact:0,dashStretch:0,wetness:.78,interactGlow:0};
  }

  function resetDynamicWorld(){
    for(const d of world.destructibles){d.hp=d.maxHp;d.dead=false;}
  }

  function createDecor(){
    const rng=C.seeded('POTLIGHT-RAIN-ROUTE-2');game.decor.length=0;
    for(let s=0;s<D.STAGES.length;s++){
      const b=D.STAGES[s].bounds;
      const count=s===4?42:26;
      for(let i=0;i<count;i++){
        const x=rng.range(b.x+40,b.x+b.w-40),y=rng.range(b.y+40,b.y+b.h-40);
        if(D.isWalkable(world,x,y))game.decor.push({type:s===4||rng.float()<.48?'puddle':rng.float()<.55?'leaf':'crack',x,y,r:rng.range(12,54),a:rng.range(0,C.TAU),stage:s,t:rng.float()});
      }
    }
  }
  createDecor();

  function saveSettings(){
    settings.difficulty=dom.difficulty.value;settings.shake=+dom.shake.value;settings.flash=+dom.flash.value;settings.audio=dom.audio.checked;settings.aimAssist=dom.aimAssist.checked;
    C.Store.set('potlight.settings',settings);Audio.setEnabled(settings.audio);
  }

  function resize(){
    view.w=Math.max(1,innerWidth);view.h=Math.max(1,innerHeight);view.dpr=Math.min(devicePixelRatio||1,2);
    for(const c of [canvas,lightCanvas]){c.width=Math.round(view.w*view.dpr);c.height=Math.round(view.h*view.dpr);c.style.width=view.w+'px';c.style.height=view.h+'px';}
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);lightCtx.setTransform(view.dpr,0,0,view.dpr,0,0);
    camera.targetZoom=C.clamp(Math.min(view.w/900,view.h/560)*1.08,.86,1.68);
    const coarse=COARSE_POINTER.matches||matchMedia('(pointer:coarse)').matches;
    game.portraitBlocked=coarse&&view.h>view.w;
    dom.touch.classList.toggle('hidden',!coarse||game.mode!=='play');
    dom.touch.setAttribute('aria-hidden',coarse&&game.mode==='play'?'false':'true');
    dom.rotate.classList.toggle('hidden',!game.portraitBlocked);dom.rotate.setAttribute('aria-hidden',game.portraitBlocked?'false':'true');if(game.portraitBlocked&&game.mode==='play'){game.orientationPause=true;pauseGame();}
  }
  addEventListener('resize',resize,{passive:true});resize();

  function screenToWorld(sx,sy,z=game.player?game.player.z:0){return C.isoUnproject(sx,sy,z,camera,view);}
  function worldToScreen(x,y,z=0){return C.isoProject(x,y,z,camera,view);}
  // Keyboard and stick directions are expressed in screen space. Convert them into
  // world-space axes so pressing right actually moves and aims right on the display.
  function screenVectorToWorld(sx,sy){
    if(Math.abs(sx)+Math.abs(sy)<1e-6)return {x:0,y:0,m:0};
    const a=sx/C.ISO_X,b=sy/C.ISO_Y,n=C.norm((a+b)*.5,(b-a)*.5);return n;
  }
  function worldVectorToScreen(wx,wy){return C.norm((wx-wy)*C.ISO_X,(wx+wy)*C.ISO_Y);}
  function projectedAngle(angle){const n=worldVectorToScreen(Math.cos(angle),Math.sin(angle));return Math.atan2(n.y,n.x);}

  function keyName(e){return e.code||e.key;}
  addEventListener('keydown',e=>{
    const k=keyName(e);if(!input.keys.has(k))input.pressed.add(k);input.keys.add(k);input.lastDevice='keyboard';
    if(k==='KeyJ')input.buffers.fire=.14;if(k==='Space'||k==='KeyK')input.buffers.blade=.14;if(k==='ShiftLeft'||k==='ShiftRight')input.buffers.dash=.14;if(k==='KeyE')input.buffers.interact=.14;if(k==='KeyQ')input.buffers.focus=.14;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault();
    if((k==='Escape'||k==='KeyP')&&game.mode==='play'){e.preventDefault();pauseGame();}
    else if((k==='Escape'||k==='KeyP')&&game.mode==='paused'){e.preventDefault();resumeGame();}
    if(k==='KeyM'){settings.audio=!settings.audio;dom.audio.checked=settings.audio;saveSettings();showToast('AUDIO',settings.audio?'The rain has opinions again.':'The rain is now mime.');}
    if(k==='KeyR'&&game.mode==='play')restartCheckpoint();
  },{passive:false});
  addEventListener('keyup',e=>{const k=keyName(e);input.keys.delete(k);input.released.add(k);});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;input.mouseX=e.clientX;input.mouseY=e.clientY;input.lastDevice='mouse';});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;Audio.start();if(e.button===0){input.mouseDown=true;input.mousePressed=true;input.buffers.fire=.14;}if(e.button===2){input.rightDown=true;input.rightPressed=true;input.buffers.dash=.14;}input.lastDevice='mouse';});
  addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;if(e.button===0)input.mouseDown=false;if(e.button===2)input.rightDown=false;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{if(game.mode==='play'&&game.abilities.has('colorRead')){e.preventDefault();input.buffers.focus=.14;}},{passive:false});
  addEventListener('blur',()=>{input.keys.clear();input.mouseDown=false;input.rightDown=false;if(game.mode==='play')pauseGame();});

  function touchVector(el,e){const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,n=C.norm(dx,dy),m=Math.min(1,n.m/(r.width*.36));return {x:n.x*m,y:n.y*m,dx:n.x*m*r.width*.27,dy:n.y*m*r.height*.27};}
  dom.movePad.addEventListener('pointerdown',e=>{e.preventDefault();try{dom.movePad.setPointerCapture(e.pointerId);}catch{}input.touchMove.id=e.pointerId;const v=touchVector(dom.movePad,e);input.touchMove.x=v.x;input.touchMove.y=v.y;dom.moveKnob.style.transform=`translate(${v.dx}px,${v.dy}px)`;input.lastDevice='touch';Audio.start();});
  dom.movePad.addEventListener('pointermove',e=>{if(input.touchMove.id!==e.pointerId)return;const v=touchVector(dom.movePad,e);input.touchMove.x=v.x;input.touchMove.y=v.y;dom.moveKnob.style.transform=`translate(${v.dx}px,${v.dy}px)`;});
  const endMove=e=>{if(input.touchMove.id!==e.pointerId)return;input.touchMove.id=null;input.touchMove.x=input.touchMove.y=0;dom.moveKnob.style.transform='translate(0,0)';};
  dom.movePad.addEventListener('pointerup',endMove);dom.movePad.addEventListener('pointercancel',endMove);
  dom.aimPad.addEventListener('pointerdown',e=>{e.preventDefault();try{dom.aimPad.setPointerCapture(e.pointerId);}catch{}input.touchAim.id=e.pointerId;input.touchAim.fire=true;input.buffers.fire=.14;updateTouchAim(e);input.lastDevice='touch';Audio.start();});
  dom.aimPad.addEventListener('pointermove',e=>{if(input.touchAim.id===e.pointerId)updateTouchAim(e);});
  const endAim=e=>{if(input.touchAim.id!==e.pointerId)return;input.touchAim.id=null;input.touchAim.fire=false;};dom.aimPad.addEventListener('pointerup',endAim);dom.aimPad.addEventListener('pointercancel',endAim);
  function updateTouchAim(e){if(!game.player)return;const p=screenToWorld(e.clientX,e.clientY,game.player.z);const n=C.norm(p.x-game.player.x,p.y-game.player.y);input.touchAim.x=n.x;input.touchAim.y=n.y;input.mouseX=e.clientX;input.mouseY=e.clientY;}
  document.querySelectorAll('[data-touch]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const action=b.dataset.touch;input.touchActions.add(action);if(action==='read')input.buffers.interact=.14;else if(input.buffers[action]!==undefined)input.buffers[action]=.14;input.lastDevice='touch';Audio.start();});});

  function pollGamepad(){
    const pads=navigator.getGamepads?navigator.getGamepads():[];const p=pads&&pads[0];if(!p)return null;
    const dead=v=>Math.abs(v)<.18?0:v;
    const moveX=dead(p.axes[0]||0),moveY=dead(p.axes[1]||0),aimX=dead(p.axes[2]||0),aimY=dead(p.axes[3]||0);
    const pressed=i=>!!p.buttons[i]?.pressed,edge=i=>{const v=pressed(i),old=!!input.gamepadPrev[i];input.gamepadPrev[i]=v;return v&&!old;};
    const state={moveX,moveY,aimX,aimY,fire:pressed(7)||pressed(0),blade:edge(2)||edge(1),dash:edge(5)||edge(4),interact:edge(3),focus:edge(6),pause:edge(9)};if(Math.abs(moveX)+Math.abs(moveY)+Math.abs(aimX)+Math.abs(aimY)>.2||state.fire||state.blade||state.dash||state.interact||state.focus||state.pause)input.lastDevice='gamepad';return state;
  }

  function actions(){
    const gp=pollGamepad();if(gp?.pause){game.mode==='play'?pauseGame():game.mode==='paused'&&resumeGame();}
    if(gp?.blade)input.buffers.blade=.14;if(gp?.dash)input.buffers.dash=.14;if(gp?.interact)input.buffers.interact=.14;if(gp?.focus)input.buffers.focus=.14;
    let smx=(input.keys.has('KeyD')||input.keys.has('ArrowRight')?1:0)-(input.keys.has('KeyA')||input.keys.has('ArrowLeft')?1:0);
    let smy=(input.keys.has('KeyS')||input.keys.has('ArrowDown')?1:0)-(input.keys.has('KeyW')||input.keys.has('ArrowUp')?1:0);
    if(input.touchMove.id!==null){smx=input.touchMove.x;smy=input.touchMove.y;}else if(gp&&(Math.abs(gp.moveX)+Math.abs(gp.moveY)>.05)){smx=gp.moveX;smy=gp.moveY;}
    const move=screenVectorToWorld(smx,smy);let mx=move.x*Math.min(1,Math.hypot(smx,smy)),my=move.y*Math.min(1,Math.hypot(smx,smy));
    let aimX=1,aimY=0,aimTargetX=game.player?.x+520,aimTargetY=game.player?.y;
    if(game.player){
      if(input.touchAim.id!==null){aimX=input.touchAim.x;aimY=input.touchAim.y;aimTargetX=game.player.x+aimX*560;aimTargetY=game.player.y+aimY*560;}
      else if(gp&&(Math.abs(gp.aimX)+Math.abs(gp.aimY)>.22)){const n=screenVectorToWorld(gp.aimX,gp.aimY);aimX=n.x;aimY=n.y;aimTargetX=game.player.x+aimX*560;aimTargetY=game.player.y+aimY*560;}
      else{const ps=worldToScreen(game.player.x,game.player.y,game.player.z),screenAim=screenVectorToWorld(input.mouseX-ps.x,input.mouseY-ps.y),wp=screenToWorld(input.mouseX,input.mouseY,game.player.z);if(screenAim.m>.001){aimX=screenAim.x;aimY=screenAim.y;}aimTargetX=wp.x;aimTargetY=wp.y;}
    }
    input.touchActions.clear();
    const fire=input.mouseDown||input.keys.has('KeyJ')||input.touchAim.fire||!!gp?.fire||input.buffers.fire>0;
    const dash=input.buffers.dash>0;
    const blade=input.buffers.blade>0;
    const interact=input.buffers.interact>0;
    const focus=input.buffers.focus>0;
    return {moveX:mx,moveY:my,aimX,aimY,aimTargetX,aimTargetY,fire,dash,blade,interact,focus};
  }

  function clearEdges(){input.pressed.clear();input.released.clear();input.mousePressed=false;input.rightPressed=false;}
  function decayActionBuffers(dt){for(const k of Object.keys(input.buffers))input.buffers[k]=Math.max(0,input.buffers[k]-dt);}

  function setScreen(el,show){el.classList.toggle('hidden',!show);el.setAttribute('aria-hidden',show?'false':'true');}
  function setMode(mode){game.mode=mode;setScreen(dom.title,mode==='title');setScreen(dom.settings,mode==='settings');setScreen(dom.pause,mode==='paused');setScreen(dom.death,mode==='dead');setScreen(dom.end,mode==='ended');setScreen(dom.hud,mode==='play'||mode==='paused');resize();}
  function pauseGame(){if(game.mode!=='play')return;setMode('paused');Audio.setIntensity(.05);}
  function resumeGame(){if(game.mode!=='paused'||game.portraitBlocked){game.orientationPause=game.portraitBlocked;return;}game.orientationPause=false;setMode('play');Audio.start();}
  function returnTitle(){game.completed=false;setMode('title');camera.x=470;camera.y=430;camera.z=0;Audio.setIntensity(0);hidePrompt();hideToast();}

  dom.start.onclick=()=>{Audio.start();startRun();};dom.settingsBtn.onclick=()=>setMode('settings');dom.closeSettings.onclick=()=>{saveSettings();setMode('title');};
  dom.resume.onclick=resumeGame;dom.pauseRestart.onclick=restartCheckpoint;dom.pauseTitle.onclick=returnTitle;dom.retry.onclick=restartCheckpoint;dom.deathTitle.onclick=returnTitle;dom.again.onclick=startRun;dom.endTitle.onclick=returnTitle;dom.pauseBtn.onclick=pauseGame;
  for(const el of [dom.difficulty,dom.shake,dom.flash,dom.audio,dom.aimAssist])el.addEventListener('change',saveSettings);
  dom.resetRecord.onclick=()=>{C.Store.remove('potlight.record');record.bestScore=0;record.bestRank='D';record.bestTime=null;record.completions=0;record.pie=false;showToast('LOCAL RECORDS','Gone. The municipal clerk is devastated.');};

  function startRun(){
    resetDynamicWorld();
    Object.assign(game,{time:0,runTime:0,stage:0,phase:'intro',waveIndex:0,wavePending:.8,stageKills:0,checkpoint:0,score:0,style:0,stylePeak:0,comboTimer:0,kills:0,perfects:0,shots:0,hits:0,damageTaken:0,pie:false,optionalUsed:false,completed:false,boss:null,bossMaxHp:0,hitstop:0,weatherLevel:.42,lastHistorySample:0,lastEchoTime:0,uiClock:0});game.perf.samples.length=0;game.perf.longFrames=0;game.perf.maxMs=0;
    game.gatesOpen.clear();game.abilities.clear();game.careRead=[];game.enemies.length=0;game.bullets.length=0;game.pickups.length=0;game.particles.length=0;game.rings.length=0;game.slashes.length=0;game.chains.length=0;game.telegraphs.length=0;game.afterimages.length=0;game.decoys.length=0;game.echoShots.length=0;game.scheduled.length=0;game.history.clear();
    game.player=makePlayer();game.companion=null;game.routePath=[];game.routeClock=0;game.routeTargetKey='';game.qaInvulnerable=QA;game.tutorial={move:false,blade:false,dash:false,pulse:false,focus:false,echo:false};
    beginStage(0,true);setMode('play');Audio.setStage(0);Audio.setIntensity(.25);showBanner(D.STAGES[0].kicker,D.STAGES[0].name,'KEEP MOVING');const touchIntro=(COARSE_POINTER.matches||matchMedia('(pointer:coarse)').matches)&&D.TUTORIALS.moveTouch;scheduleEvent(1.35,()=>showToast('CONTROL IS YOURS',touchIntro||D.TUTORIALS.move,3.8),game.player,false);
  }

  function restartCheckpoint(){
    if(!game.player)return;
    const stage=Math.min(game.checkpoint,D.STAGES.length-1),unlocked=new Set(game.abilities),reads=game.careRead.slice(),pie=game.pie;
    game.enemies.length=0;game.bullets.length=0;game.pickups.length=0;game.particles.length=0;game.rings.length=0;game.slashes.length=0;game.chains.length=0;game.telegraphs.length=0;game.afterimages.length=0;game.decoys.length=0;game.echoShots.length=0;game.scheduled.length=0;game.history.clear();
    game.player=makePlayer();game.player.x=D.STAGES[stage].entry.x;game.player.y=D.STAGES[stage].entry.y;game.player.z=D.groundZ(world,game.player.x,game.player.y);game.player.lastSafeX=game.player.x;game.player.lastSafeY=game.player.y;game.routePath=[];game.routeClock=0;game.routeTargetKey='';game.player.homeShield=unlocked.has('homeLit')?1:0;
    game.stage=stage;game.abilities=unlocked;game.careRead=reads;game.pie=pie;game.phase='intro';game.waveIndex=0;game.wavePending=.65;game.boss=null;game.bossMaxHp=0;game.style=Math.max(0,game.style*.35);game.comboTimer=0;game.companion=null;
    for(let i=0;i<stage;i++)game.gatesOpen.add(i);if(stage>0&&game.careRead[stage-1])game.gatesOpen.add(stage-1);
    beginStage(stage,true);setMode('play');showBanner('CHECKPOINT',D.STAGES[stage].name,'THE ROUTE DID NOT MOVE');
  }

  function beginStage(index,respawn=false){
    hideToast();hidePrompt();
    const s=D.STAGES[index],needsPreCare=!!s.preCare&&!game.careRead[index];game.stage=index;game.phase=needsPreCare?'precare':'intro';game.waveIndex=0;game.wavePending=needsPreCare?0:.85;game.stageKills=0;game.boss=null;game.bossMaxHp=0;Audio.setStage(index);game.weatherLevel=s.weather?.rain??(.72+index*.08);Audio.setWeather(game.weatherLevel,s.weather?.wind||0);
    if(!respawn){game.player.x=s.entry.x;game.player.y=s.entry.y;game.player.z=D.groundZ(world,game.player.x,game.player.y);}
    if(needsPreCare){showBanner(s.kicker,s.name,'READ THE LIGHT');}
    updateObjective();updateUI(true);
  }

  function difficulty(){
    if(QA)return {damage:.08,bullet:.78,hp:.34,spawnDelay:.22};
    if(settings.difficulty==='open')return {damage:.68,bullet:.82,hp:.82,spawnDelay:.78};
    if(settings.difficulty==='cold')return {damage:1.28,bullet:1.14,hp:1.22,spawnDelay:.48};
    return {damage:1,bullet:1,hp:1,spawnDelay:.62};
  }

  function gateLocked(index){return !game.gatesOpen.has(index);}
  function currentStage(){return D.STAGES[game.stage];}
  function currentCare(){return currentStage().care;}
  function careAvailable(){return game.phase==='care'||game.phase==='precare';}

  function updateObjective(){
    const s=currentStage();let text=s.objective;
    if(game.phase==='care')text=`Read the ${careLabel(s.care)}.`;
    else if(game.phase==='precare')text=`Read the ${careLabel(s.care)} before the weather notices you.`;
    else if(game.phase==='travel')text=game.stage<D.STAGES.length-1?`The way is open. Cross into ${D.STAGES[game.stage+1].name}.`:'Go through the door.';
    else if(game.phase==='finish')text='Go through the lit door.';
    else if(game.phase==='combat'&&game.boss)text=`End ${game.boss.name}.`;
    dom.objective.textContent=text;
  }
  function careLabel(c){return ({bench:'bench',pot:'pot',chimes:'wind chimes',mural:'mural',note:'note',porchlight:'porch light'})[c.type]||c.type;}

  function showToast(title,copy,seconds=3.8){dom.toastTitle.textContent=title;dom.toastCopy.textContent=copy;dom.toast.classList.remove('hidden');game.toastTimer=seconds;}
  function hideToast(){dom.toast.classList.add('hidden');game.toastTimer=0;}
  function showBanner(kicker,title,sub,seconds=1.2){dom.bannerKicker.textContent=kicker;dom.bannerTitle.textContent=title;dom.bannerSub.textContent=sub;dom.banner.classList.remove('hidden');game.bannerTimer=seconds;}
  function hideBanner(){dom.banner.classList.add('hidden');game.bannerTimer=0;}
  function showPrompt(text,target){const same=game.promptTarget?.kind===target?.kind&&game.promptTarget?.data===target?.data&&dom.promptText.textContent===text;if(same)return;dom.promptText.textContent=text;dom.prompt.classList.remove('hidden');game.promptTarget=target;}
  function hidePrompt(){if(!game.promptTarget&&dom.prompt.classList.contains('hidden'))return;dom.prompt.classList.add('hidden');game.promptTarget=null;}
  function flashScreen(color='#fff',amount=.55){if(+settings.flash<=0)return;dom.flashEl.style.background=color;dom.flashEl.animate([{opacity:amount*(+settings.flash)},{opacity:0}],{duration:150,easing:'ease-out'});}
  function trauma(v){camera.trauma=C.clamp(camera.trauma+v*(+settings.shake),0,1);}

  function spawnWave(specs){
    const s=currentStage(),diff=difficulty();game.phase='combat';game.wavePending=0;
    for(const spec of specs){for(let i=0;i<spec.count;i++)spawnEnemy(spec.type,findSpawnPoint(s,i,spec.count,D.ENEMIES[spec.type].r+12),diff.hp);}
    Audio.setIntensity(game.boss?.boss?1:.65);updateObjective();
  }

  function spawnPointClear(x,y,r){
    if(!D.isWalkable(world,x,y))return false;const z=D.groundZ(world,x,y);
    for(const w of world.walls)if(Math.abs((w.z||0)-z)<100&&C.circleRect(x,y,r,w))return false;
    for(const c of world.colliders||[])if(Math.abs((c.z||0)-z)<100&&C.circleRect(x,y,r,c))return false;
    for(const d of world.destructibles)if(!d.dead&&Math.abs((d.z||0)-z)<100&&C.circleRect(x,y,r,d))return false;
    for(let i=0;i<D.STAGES.length-1;i++)if(gateLocked(i)&&C.circleRect(x,y,r,D.STAGES[i].gate))return false;
    return true;
  }

  function findSpawnPoint(stage,i,total,r=36){
    const b=stage.bounds,p=game.player||stage.entry;let best=null;
    for(let tries=0;tries<36;tries++){
      const edge=(i+tries)%4;let x,y;
      if(edge===0){x=b.x+70;y=b.y+70+Math.random()*(b.h-140);}else if(edge===1){x=b.x+b.w-70;y=b.y+70+Math.random()*(b.h-140);}else if(edge===2){x=b.x+70+Math.random()*(b.w-140);y=b.y+70;}else{x=b.x+70+Math.random()*(b.w-140);y=b.y+b.h-70;}
      if(spawnPointClear(x,y,r)&&C.dist2(x,y,p.x,p.y)>320*320){best={x,y};break;}
    }
    if(!best){
      for(let y=b.y+90;y<b.y+b.h-70&&!best;y+=90)for(let x=b.x+90;x<b.x+b.w-70;x+=90)if(spawnPointClear(x,y,r)&&C.dist2(x,y,p.x,p.y)>300*300){best={x,y};break;}
    }
    return best||{x:stage.center.x,y:stage.center.y};
  }

  function spawnEnemy(type,pos,hpScale=1){
    const def=D.ENEMIES[type];if(!def)throw new Error('Unknown enemy '+type);
    const e={id:Math.random().toString(36).slice(2),type,name:def.name,x:pos.x,y:pos.y,z:D.groundZ(world,pos.x,pos.y),r:def.r,hp:def.hp*hpScale,maxHp:def.hp*hpScale,speed:def.speed,damage:def.damage,color:def.color,accent:def.accent,score:def.score,behavior:def.behavior,boss:!!def.boss,
      vx:0,vy:0,angle:Math.random()*C.TAU,aim:0,attackCd:.4+Math.random()*.7,state:'idle',stateTime:0,phase:1,phaseTimer:0,hitFlash:0,hitStun:0,hitAngle:0,squash:0,dead:false,shield:1,telegraph:0,orbit:Math.random()<.5?-1:1,seed:Math.random()*999,shotIndex:0,invuln:0,knockX:0,knockY:0,spawnTime:.45,weakAngle:Math.random()*C.TAU,stepPhase:Math.random()*C.TAU,lockedAttackAngle:null};
    game.enemies.push(e);
    if(e.boss){game.boss=e;game.bossMaxHp=e.maxHp;hideToast();Audio.boss();showBanner('BOSS',e.name,e.type==='bossWeather'?'THE STORM GOT PERSONAL':'IT LIES WITH CONFIDENCE',1.8);}
    spawnRing(e.x,e.y,e.z,26,e.color,.55);for(let i=0;i<12;i++)spawnParticle(e.x,e.y,e.z+20,{color:e.color,speed:90+Math.random()*150,life:.5+Math.random()*.4,size:2+Math.random()*4});
    return e;
  }

  function updateStage(dt){
    const s=currentStage();
    if(game.phase==='intro'){
      game.wavePending-=dt;if(game.wavePending<=0)spawnWave(s.waves[0]);
    }else if(game.phase==='combat'){
      const alive=game.enemies.some(e=>!e.dead);
      if(!alive&&!game.boss){
        if(game.wavePending>0){game.wavePending-=dt;if(game.wavePending<=0){game.waveIndex++;spawnWave(s.waves[game.waveIndex]);}}
        else if(game.waveIndex<s.waves.length-1){game.wavePending=difficulty().spawnDelay;showBanner('WAVE CLEARED','KEEP MOVING',`${game.waveIndex+1} / ${s.waves.length}`,1.2);}
        else if(s.id==='home'){
          game.phase='finish';game.gatesOpen.add(5);Audio.setIntensity(.08);showBanner('THE WEATHER BROKE','THE DOOR IS OPEN','GO HOME',3);updateObjective();
        }else{
          game.phase='care';game.bullets=game.bullets.filter(b=>b.team==='player');game.telegraphs.length=0;Audio.setIntensity(.12);showBanner('THE NOISE STOPS',currentCare().title,`READ THE ${careLabel(currentCare()).toUpperCase()}`,2.2);updateObjective();
        }
      }
    }else if(game.phase==='travel'){
      if(game.stage<D.STAGES.length-1){const n=D.STAGES[game.stage+1];if(C.pointInRect(game.player.x,game.player.y,n.bounds)&&C.dist2(game.player.x,game.player.y,n.entry.x,n.entry.y)<390*390){game.checkpoint=game.stage+1;beginStage(game.stage+1,false);showBanner(n.kicker,n.name,n.preCare?'READ BEFORE THE FIGHT':'THE ROUTE CONTINUES');}}
    }
  }

  function nearestInteraction(){
    if(!game.player)return null;const p=game.player,s=currentStage();let best=null,bd=Infinity;
    if(careAvailable()){
      const c=s.care,d=C.dist2(p.x,p.y,c.x,c.y);if(d<110*110&&d<bd){best={kind:'care',data:c};bd=d;}
    }
    if(s.optional&&!game.optionalUsed){const o=s.optional,d=C.dist2(p.x,p.y,o.x,o.y);if(d<100*100&&d<bd){best={kind:'optional',data:o};bd=d;}}
    if(game.phase==='finish'&&s.finish){const f=s.finish,d=C.dist2(p.x,p.y,f.x,f.y);if(d<120*120&&d<bd){best={kind:'finish',data:f};bd=d;}}
    return best;
  }

  function updatePrompt(){
    const t=nearestInteraction();if(!t){hidePrompt();return;}dom.promptKey.textContent=input.lastDevice==='touch'?'TAP':'E';
    if(t.kind==='care')showPrompt(`Read the ${careLabel(t.data)}`,t);
    else if(t.kind==='optional')showPrompt('Notice the pie',t);
    else showPrompt('Open the door',t);
  }

  function interact(){
    const t=nearestInteraction();
    if(t?.kind==='care'){readCare(t.data);return true;}
    if(t?.kind==='optional'){readOptional(t.data);return true;}
    if(t?.kind==='finish'){finishRun();return true;}
    return false;
  }

  function readCare(care){
    if(game.careRead[game.stage])return;
    game.careRead[game.stage]=true;game.abilities.add(care.verb);game.score+=500+game.stage*120;game.style+=240;game.stylePeak=Math.max(game.stylePeak,game.style);game.player.clarity=game.player.maxClarity;game.player.warmth=Math.min(100,game.player.warmth+45);game.player.interactGlow=1;
    if(care.verb==='homeLit'){game.player.homeShield=1;game.player.homeShieldUsed=false;}
    if(care.verb==='secondStranger'){game.companion={x:game.player.x,y:game.player.y,z:game.player.z,angle:game.player.angle,alpha:0};}
    Audio.care(game.stage);flashScreen(care.verb==='colorRead'?'#d799ff':'#fff1b0',.7);spawnRing(care.x,care.y,D.groundZ(world,care.x,care.y)+15,38,currentStage().palette.accent,1.2);game.weather?.splash(care.x,care.y,D.groundZ(world,care.x,care.y),1.25,currentStage().palette.light);for(let i=0;i<34;i++)spawnParticle(care.x,care.y,D.groundZ(world,care.x,care.y)+20,{color:i%3===0?'#fff7d8':currentStage().palette.accent,speed:80+Math.random()*220,life:.7+Math.random()*.8,size:2+Math.random()*5});
    showToast(care.title,care.copy,4.2);renderVerbs();
    if(care.verb==='restStep'&&!game.tutorial.dash){game.tutorial.dash=true;scheduleEvent(.9,()=>showToast('HOW IT WORKS',D.TUTORIALS.dash,3.8),game.player,false);}
    if(care.verb==='shelterPulse'&&!game.tutorial.pulse){game.tutorial.pulse=true;scheduleEvent(.9,()=>showToast('HOW IT WORKS',D.TUTORIALS.pulse,3.8),game.player,false);}
    if(care.verb==='colorRead'&&!game.tutorial.focus){game.tutorial.focus=true;scheduleEvent(.9,()=>showToast('HOW IT WORKS',D.TUTORIALS.focus,3.8),game.player,false);}
    if(care.verb==='secondStranger'&&!game.tutorial.echo){game.tutorial.echo=true;scheduleEvent(.9,()=>showToast('NOT ALONE',D.TUTORIALS.echo,4.0),game.player,false);}
    if(currentStage().preCare){game.phase='intro';game.wavePending=.65;showBanner('THE LIGHT STAYS ON','THE WEATHER ARRIVES','DON’T LET IT IN',2.7);}
    else{game.phase='travel';game.gatesOpen.add(game.stage);game.checkpoint=Math.min(game.stage+1,D.STAGES.length-1);showBanner('VERB LEARNED',care.title,game.stage<D.STAGES.length-1?`THE WAY TO ${D.STAGES[game.stage+1].name} IS OPEN`:'THE DOOR IS OPEN',2.5);}
    updateObjective();game.statsDirty=true;
  }

  function readOptional(o){
    if(game.optionalUsed)return;game.optionalUsed=true;game.pie=true;game.score+=1;record.pie=true;C.Store.set('potlight.record',record);Audio.chime();spawnRing(o.x,o.y,D.groundZ(world,o.x,o.y)+35,20,'#ffcf84',1.5);showToast(o.title,o.copy,4.5);game.player.clarity=Math.min(game.player.maxClarity,game.player.clarity+1);
  }

  function finishRun(){
    if(game.completed)return;game.completed=true;game.mode='ended';Audio.victory();
    const rank=getRank(game.stylePeak).rank;record.bestScore=Math.max(record.bestScore,Math.floor(game.score));if(rankValue(rank)>rankValue(record.bestRank))record.bestRank=rank;if(record.bestTime===null||game.runTime<record.bestTime)record.bestTime=game.runTime;record.completions=(record.completions||0)+1;record.pie=record.pie||game.pie;C.Store.set('potlight.record',record);
    dom.endStats.innerHTML=`<div><span>Score</span><b>${Math.floor(game.score).toLocaleString()}</b></div><div><span>Best read</span><b>${rank}</b></div><div><span>Route time</span><b>${C.formatTime(game.runTime)}</b></div><div><span>Perfect steps</span><b>${game.perfects}</b></div><div><span>Threats ended</span><b>${game.kills}</b></div><div><span>Care read</span><b>${game.careRead.filter(Boolean).length}/6</b></div><div><span>Pie</span><b>${game.pie?'Noticed':'Missed'}</b></div><div><span>Damage taken</span><b>${Math.floor(game.damageTaken)}</b></div>`;
    setMode('ended');
  }

  function rankValue(r){return ['D','C','B','A','S'].indexOf(r);}
  function getRank(score){let out=D.RANKS[0];for(const r of D.RANKS)if(score>=r.score)out=r;return out;}

  const SHELTERS=[
    {x:350,y:54,w:330,h:235},
    {x:1320,y:420,w:580,h:500},
    {x:6230,y:690,w:480,h:370}
  ];
  function inShelter(x,y){return SHELTERS.some(r=>C.pointInRect(x,y,r));}
  function scheduleEvent(delay,fn,owner=null,hostile=true){game.scheduled.push({left:Math.max(0,delay),fn,owner,hostile});}
  function updateScheduled(dt){
    const hostileScale=game.player?.focusTime>0?.38:1;
    for(let i=game.scheduled.length-1;i>=0;i--){const e=game.scheduled[i];e.left-=dt*(e.hostile?hostileScale:1);if(e.left>0)continue;game.scheduled.splice(i,1);const active=!e.owner||(e.owner===game.player?e.owner.alive:window.__potEnemyActive(e.owner));if(active)e.fn();}
  }
  function spawnFootSplash(p,power=.45){
    const color=currentStage().palette.rain,z=D.groundZ(world,p.x,p.y);game.weather?.splash(p.x,p.y,z,power,color);
    for(let i=0;i<3+Math.ceil(power*4);i++)spawnParticle(p.x+(Math.random()-.5)*14,p.y+(Math.random()-.5)*14,z+2,{color:i%3?'#b8ecf7':color,speed:35+Math.random()*95,life:.22+Math.random()*.22,size:1.4+Math.random()*2.2,vz:26+Math.random()*76,gravity:220,kind:'water'});
    if(power>.3)Audio.splash(power);
  }

  function spawnPickup(x,y,z,type='warmth',amount=8,burst=1){
    if(game.pickups.length>=48)game.pickups.shift();
    const a=(game.kills*2.399+game.pickups.length*1.733+type.length)%C.TAU,s=45+burst*52;
    game.pickups.push({x,y,z:z+18,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:110+burst*45,type,amount,life:12,maxLife:12,age:0,spin:a,ground:z});
  }

  function collectPickup(pickup){
    const p=game.player;if(!p)return;
    if(pickup.type==='clarity')p.clarity=Math.min(p.maxClarity,p.clarity+pickup.amount);
    else if(pickup.type==='memory'){p.clarity=Math.min(p.maxClarity,p.clarity+pickup.amount*.7);p.warmth=Math.min(p.maxWarmth,p.warmth+pickup.amount*.7);game.style+=80;}
    else p.warmth=Math.min(p.maxWarmth,p.warmth+pickup.amount);
    p.interactGlow=Math.max(p.interactGlow,.55);game.score+=25;Audio.chime();spawnRing(pickup.x,pickup.y,pickup.ground+5,12,pickup.type==='clarity'?'#9fefff':pickup.type==='memory'?'#d9b4ff':'#ffe48d',.34);
    for(let i=0;i<7;i++)spawnParticle(pickup.x,pickup.y,pickup.z,{color:i%2?'#fff8d8':pickup.type==='clarity'?'#79e8ff':pickup.type==='memory'?'#cf9cff':'#ffd875',speed:45+Math.random()*100,life:.24+Math.random()*.25,size:2+Math.random()*2.5});
  }

  function updatePickups(dt){
    const p=game.player;
    for(let i=game.pickups.length-1;i>=0;i--){const o=game.pickups[i];o.life-=dt;o.age+=dt;o.spin+=dt*3.2;o.ground=D.groundZ(world,o.x,o.y);if(o.life<=0){game.pickups.splice(i,1);continue;}
      if(p&&p.alive){const n=C.norm(p.x-o.x,p.y-o.y);if(n.m<220&&o.age>.2){const pull=C.lerp(180,940,1-n.m/220);o.vx+=n.x*pull*dt;o.vy+=n.y*pull*dt;o.vz+=C.clamp((p.z+28-o.z)*7,-220,220)*dt;}}
      o.x+=o.vx*dt;o.y+=o.vy*dt;o.z+=o.vz*dt;o.vz-=350*dt;o.vx*=Math.exp(-2.7*dt);o.vy*=Math.exp(-2.7*dt);
      if(o.z<o.ground+9){o.z=o.ground+9;if(Math.abs(o.vz)>28){o.vz=Math.abs(o.vz)*.34;game.weather?.splash(o.x,o.y,o.ground,.24,o.type==='clarity'?'#8cecff':'#ffe28d');}else o.vz=0;}
      if(p&&C.dist2(o.x,o.y,p.x,p.y)<34*34&&Math.abs(o.z-(p.z+20))<55){collectPickup(o);game.pickups.splice(i,1);}
    }
  }

  function updatePlayer(dt,a){
    const p=game.player;if(!p||!p.alive)return;
    p.shotCd=Math.max(0,p.shotCd-dt);p.bladeCd=Math.max(0,p.bladeCd-dt);p.bladeTime=Math.max(0,p.bladeTime-dt);p.comboWindow=Math.max(0,p.comboWindow-dt);p.dashCd=Math.max(0,p.dashCd-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.invuln=Math.max(0,p.invuln-dt);p.focusCd=Math.max(0,p.focusCd-dt);p.focusTime=Math.max(0,p.focusTime-dt);p.pulseCd=Math.max(0,p.pulseCd-dt);p.hurtFlash=Math.max(0,p.hurtFlash-dt);p.styleGlow=Math.max(0,p.styleGlow-dt);p.muzzleTime=Math.max(0,p.muzzleTime-dt);p.bladeImpact=Math.max(0,p.bladeImpact-dt);p.recoil=C.approach(p.recoil,0,dt*7.5);p.dashStretch=C.approach(p.dashStretch,0,dt*4.8);p.interactGlow=C.approach(p.interactGlow,0,dt*2.2);p.footstepClock-=dt;
    const aim=C.norm(a.aimX,a.aimY);if(aim.m>.001){p.aimX=aim.x;p.aimY=aim.y;p.aimAngle=Math.atan2(aim.y,aim.x);}p.aimTargetX=a.aimTargetX;p.aimTargetY=a.aimTargetY;
    // Action direction is immediate. The old eased facing visibly lagged behind the
    // reticle, so the weapon could point somewhere the next projectile would not go.
    p.angle=p.aimAngle;
    if(a.focus&&activateFocus())input.buffers.focus=0;
    if(a.dash&&startDash(a.moveX,a.moveY,p.aimX,p.aimY))input.buffers.dash=0;
    if(a.blade&&startBlade())input.buffers.blade=0;
    if(a.interact){const used=interact()||shelterPulse();if(used)input.buffers.interact=0;}
    if(a.fire&&p.shotCd<=0&&firePlayerShot(false))input.buffers.fire=0;

    let mx=a.moveX,my=a.moveY;const m=C.norm(mx,my);if(m.m>1){mx=m.x;my=m.y;}
    if(p.dashTime>0){
      p.vx=p.dashX*820;p.vy=p.dashY*820;p.invuln=Math.max(p.invuln,.08);p.trailClock-=dt;
      p.dashStretch=Math.max(p.dashStretch,.72);
      if(p.trailClock<=0){p.trailClock=.025;game.afterimages.push({x:p.x,y:p.y,z:p.z,angle:p.angle,life:.22,max:.22,color:currentStage().palette.accent});}
      checkPerfectDash();
    }else{
      const focusBoost=p.focusTime>0?1.08:1;const targetX=mx*p.moveSpeed*focusBoost,targetY=my*p.moveSpeed*focusBoost;
      p.vx=C.lerp(p.vx,targetX,1-Math.pow(.00035,dt));p.vy=C.lerp(p.vy,targetY,1-Math.pow(.00035,dt));
      if(m.m<.08){p.vx=C.approach(p.vx,0,1180*dt);p.vy=C.approach(p.vy,0,1180*dt);}
    }
    const wanted=Math.hypot(p.vx*dt,p.vy*dt),moved=moveEntity(p,p.vx*dt,p.vy*dt,true);
    p.z=D.groundZ(world,p.x,p.y);const speed=Math.hypot(p.vx,p.vy);p.moveAmount=C.lerp(p.moveAmount,C.clamp(speed/p.moveSpeed,0,1.45),1-Math.pow(.0008,dt));p.walkPhase+=speed*dt*.045;
    game.sheltered=inShelter(p.x,p.y);p.wetness=C.approach(p.wetness,game.sheltered ? .34 : 1,dt*(game.sheltered ? .12 : .08));
    if(speed>72&&p.dashTime<=0&&p.footstepClock<=0){p.footstepClock=C.lerp(.2,.125,C.clamp(speed/p.moveSpeed,0,1));spawnFootSplash(p,.28+.32*C.clamp(speed/p.moveSpeed,0,1));}
    if(p.dashTime>0&&p.trailClock>.015&&Math.random()<.34)game.weather?.splash(p.x-p.dashX*18,p.y-p.dashY*18,p.z,.68,currentStage().palette.rain);
    if(wanted>.7&&moved<wanted*.08&&m.m>.15)p.stuckTime+=dt;else p.stuckTime=Math.max(0,p.stuckTime-dt*3);
    if(p.stuckTime>.32){unstickEntity(p,true);p.stuckTime=0;p.vx*=.35;p.vy*=.35;}
    if(game.abilities.has('homeLit')&&inSafeLight(p.x,p.y)){p.clarity=Math.min(p.maxClarity,p.clarity+10*dt);p.warmth=Math.min(p.maxWarmth,p.warmth+4*dt);}
    if(game.stage===4&&currentStage().id==='flood'){p.vx*=1-.18*dt;p.vy*=1-.18*dt;}
    recordHistory();
  }

  function startDash(mx,my,ax,ay){
    const p=game.player;if(p.dashCd>0||p.dashTime>0)return false;let n=C.norm(mx,my);if(n.m<.15)n=C.norm(ax,ay);
    p.dashX=n.x;p.dashY=n.y;p.dashTime=.18;p.dashCd=.48;p.invuln=.24;p.dashPerfect=false;p.trailClock=0;p.dashStretch=1;Audio.dash(false);trauma(.1);spawnFootSplash(p,.82);for(let i=0;i<12;i++)spawnParticle(p.x,p.y,p.z+12,{color:i%3?currentStage().palette.accent:currentStage().palette.rain,speed:60+Math.random()*190,life:.25+Math.random()*.32,size:2+Math.random()*3,backward:{x:-n.x,y:-n.y},kind:i%3?'spark':'water'});
    return true;
  }

  function checkPerfectDash(){
    const p=game.player;if(p.dashPerfect)return;let danger=false;
    for(const b of game.bullets){if(b.team==='enemy'&&C.segmentCircle(p.x-p.dashX*42,p.y-p.dashY*42,p.x,p.y,b.x,b.y,p.r+b.r+38)){danger=true;break;}}
    if(!danger)for(const e of game.enemies){if(!e.dead&&C.dist2(p.x,p.y,e.x,e.y)<(p.r+e.r+62)**2&&(e.state==='charge'||e.state==='strike'||e.telegraph>0)){danger=true;break;}}
    if(!danger)return;p.dashPerfect=true;game.perfects++;game.style+=260;game.stylePeak=Math.max(game.stylePeak,game.style);game.comboTimer=3.2;p.clarity=Math.min(p.maxClarity,p.clarity+(game.abilities.has('restStep')?14:4));p.warmth=Math.min(p.maxWarmth,p.warmth+24);Audio.dash(true);Audio.parry();flashScreen('#8ffff0',.52);trauma(.22);spawnRing(p.x,p.y,p.z,26,'#8ffff0',.7);showMicroToast('PERFECT STEP',game.abilities.has('restStep')?'+clarity +warmth':'+warmth');
  }

  function startBlade(){
    const p=game.player;if(p.bladeCd>0)return false;
    if(p.comboWindow>0)p.bladeStep=(p.bladeStep+1)%3;else p.bladeStep=0;
    const step=p.bladeStep;p.bladeCd=step===2?.4:.25;p.bladeTime=.24;p.comboWindow=.46;p.invuln=Math.max(p.invuln,.055);p.recoil=Math.max(p.recoil,.18);Audio.blade(step);trauma(step===2?.14:.055);scheduleEvent(step===2?.065:.045,()=>resolveBladeStrike(step),p,false);return true;
  }

  function resolveBladeStrike(step){
    const p=game.player;if(!p||!p.alive)return;p.bladeImpact=.14;p.vx+=Math.cos(p.angle)*(step===2?145:80);p.vy+=Math.sin(p.angle)*(step===2?145:80);
    const radius=step===2?135:112,arc=step===1?1.9:1.55,damage=step===2?4.1:step===1?2.7:2.25;
    game.slashes.push({x:p.x,y:p.y,z:p.z+20,angle:p.angle,arc,radius,life:.18,max:.18,step});
    let hit=false;
    for(const e of game.enemies){if(e.dead||e.spawnTime>0)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),ad=Math.abs(C.angleDiff(p.angle,Math.atan2(dy,dx)));if(d<radius+e.r&&ad<arc*.5&&!lineHitsWall(p.x,p.y,e.x,e.y,p.z)){damageEnemy(e,damage,Math.cos(p.angle)*340,Math.sin(p.angle)*340,step===2);hit=true;}}
    for(let i=game.bullets.length-1;i>=0;i--){const b=game.bullets[i];if(b.team!=='enemy')continue;const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),ad=Math.abs(C.angleDiff(p.angle,Math.atan2(dy,dx)));if(d<radius+b.r&&ad<arc*.58&&!lineHitsWall(p.x,p.y,b.x,b.y,p.z)){game.bullets.splice(i,1);p.warmth=Math.min(100,p.warmth+6);game.style+=36;game.comboTimer=2.5;spawnParticle(b.x,b.y,b.z,{color:'#fff5bd',speed:160,life:.35,size:4});hit=true;}}
    for(const d of world.destructibles){if(d.dead)continue;const x=d.x+d.w*.5,y=d.y+d.h*.5,dx=x-p.x,dy=y-p.y,distance=Math.hypot(dx,dy),ad=Math.abs(C.angleDiff(p.angle,Math.atan2(dy,dx)));if(distance<radius+Math.max(d.w,d.h)*.45&&ad<arc*.56){damageDestructible(d,step===2?3:2);hit=true;}}
    if(hit){game.hits++;game.style+=65+step*30;game.stylePeak=Math.max(game.stylePeak,game.style);p.styleGlow=.18;game.hitstop=Math.max(game.hitstop,step===2?.045:.018);trauma(step===2?.24:.1);game.weather?.splash(p.x+Math.cos(p.angle)*72,p.y+Math.sin(p.angle)*72,p.z,step===2?.9:.5,currentStage().palette.rain);}
  }

  function activateFocus(){
    const p=game.player;if(!game.abilities.has('colorRead')||p.focusCd>0||p.focusTime>0)return false;p.focusTime=2.2;p.focusCd=6.3;Audio.focus(true);flashScreen('#b78cff',.34);spawnRing(p.x,p.y,p.z,32,'#c69cff',1);showMicroToast('COLOR READ','hostile time bends');return true;
  }

  function shelterPulse(){
    const p=game.player;if(!game.abilities.has('shelterPulse')||p.pulseCd>0)return false;if(p.warmth<35){showMicroToast('NOT ENOUGH WARMTH','perfect dash or cut bullets');return false;}p.warmth-=35;p.pulseCd=1.2;Audio.pulse();trauma(.42);flashScreen('#ffe0a1',.38);spawnRing(p.x,p.y,p.z,55,'#ffc66e',1.1);
    for(let i=game.bullets.length-1;i>=0;i--){const b=game.bullets[i];if(b.team==='enemy'&&C.dist2(p.x,p.y,b.x,b.y)<300*300){spawnParticle(b.x,b.y,b.z,{color:'#ffe6a9',speed:180,life:.45,size:4});game.bullets.splice(i,1);game.style+=20;}}
    for(const e of game.enemies){if(e.dead)continue;const n=C.norm(e.x-p.x,e.y-p.y);if(n.m<320){damageEnemy(e,1.7,n.x*610,n.y*610,false);e.attackCd=Math.max(e.attackCd,.8);}}
    game.style+=120;game.comboTimer=3;return true;
  }

  function aimAssistDirection(x,y,dx,dy){
    if(!settings.aimAssist||input.lastDevice==='mouse'||input.lastDevice==='keyboard')return {x:dx,y:dy};let best=null,score=.88;
    for(const e of game.enemies){if(e.dead||e.spawnTime>0)continue;const n=C.norm(e.x-x,e.y-y),alignment=C.dot(dx,dy,n.x,n.y),candidate=alignment-n.m/6500;if(candidate>score&&n.m<650&&!lineHitsWall(x,y,e.x,e.y,D.groundZ(world,x,y))){score=candidate;best=n;}}
    return best?C.norm(C.lerp(dx,best.x,.45),C.lerp(dy,best.y,.45)):{x:dx,y:dy};
  }

  function firePlayerShot(echo=false,source=null,aimOverride=null){
    const p=source||game.player;if(!p)return false;let dx=aimOverride?.x??Math.cos(p.aimAngle??p.angle),dy=aimOverride?.y??Math.sin(p.aimAngle??p.angle);const assisted=aimAssistDirection(p.x,p.y,dx,dy);dx=assisted.x;dy=assisted.y;
    if(!echo){if(game.player.shotCd>0)return false;game.player.shotCd=game.player.focusTime>0?.082:.112;game.player.muzzleTime=.085;game.player.recoil=1;game.shots++;game.echoShots.push({time:game.time,x:p.x,y:p.y,z:p.z,dx,dy,replayed:false});}
    const speed=echo?820:970,mx=p.x+dx*31,my=p.y+dy*31,mz=p.z+27;game.bullets.push({team:'player',x:mx,y:my,z:mz,vx:dx*speed,vy:dy*speed,r:echo?5:6.5,damage:echo?.85:1.7,life:echo?1.05:.95,age:0,color:echo?'#b9fff6':game.player.focusTime>0?'#e1b4ff':'#fff4bd',chain:game.abilities.has('harmonicShot'),chained:false,pierce:game.player.focusTime>0?2:0,echo});
    Audio.shot(echo?.65:1,echo);if(!echo){game.player.vx-=dx*18;game.player.vy-=dy*18;const screenDir=worldVectorToScreen(dx,dy);camera.kickX-=screenDir.x*4.5;camera.kickY-=screenDir.y*3.5;for(let i=0;i<5;i++)spawnParticle(mx,my,mz,{color:i<2?'#ffffff':currentStage().palette.accent,speed:60+Math.random()*150,life:.09+Math.random()*.1,size:1.5+Math.random()*3,vz:(Math.random()-.5)*45,gravity:35,backward:{x:dx,y:dy},kind:'muzzle'});}return true;
  }

  function recordHistory(){
    if(!game.player||game.time-game.lastHistorySample<.035)return;game.lastHistorySample=game.time;game.history.push({time:game.time,x:game.player.x,y:game.player.y,z:game.player.z,angle:game.player.angle,clarity:game.player.clarity});
  }

  function updateCompanion(dt){
    if(!game.abilities.has('secondStranger')||!game.companion)return;
    const targetTime=game.time-2.35,found=game.history.findTime(targetTime);if(found){const a=found.prev,b=found.next,t=found.t;game.companion.x=C.lerp(a.x,b.x,t);game.companion.y=C.lerp(a.y,b.y,t);game.companion.z=C.lerp(a.z,b.z,t);game.companion.angle=C.lerpAngle(a.angle,b.angle,t);game.companion.alpha=C.approach(game.companion.alpha,1,dt*1.7);}
    for(const s of game.echoShots){if(!s.replayed&&s.time+2.35<=game.time){s.replayed=true;firePlayerShot(true,game.companion,{x:s.dx,y:s.dy});}}
    while(game.echoShots.length&&game.echoShots[0].time<game.time-7)game.echoShots.shift();
  }

  function inSafeLight(x,y){for(const l of world.lights)if(l.safe&&C.dist2(x,y,l.x,l.y)<(l.r*.65)**2)return true;return false;}

  function collisionRadius(e,isPlayer=false){return isPlayer?(e.collisionR||Math.min(15,e.r*.7)):(e.collisionR||Math.max(10,e.r*.76));}
  function wallRelevantAt(w,z){return Math.abs((w.z||0)-z)<100;}
  function circleInsideWalkable(x,y,r){
    if(!D.isWalkable(world,x,y))return false;
    const rr=r*.72;
    for(let i=0;i<8;i++){const a=i*C.TAU/8;if(!D.isWalkable(world,x+Math.cos(a)*rr,y+Math.sin(a)*rr))return false;}
    return true;
  }
  function blockingRectsAt(e,x,y,r){
    const z=D.groundZ(world,x,y),hits=[];
    for(const w of world.walls)if(wallRelevantAt(w,z)&&C.circleRect(x,y,r,w))hits.push(w);
    for(const c of world.colliders||[])if(wallRelevantAt(c,z)&&C.circleRect(x,y,r,c))hits.push(c);
    for(const d of world.destructibles)if(!d.dead&&wallRelevantAt(d,z)&&C.circleRect(x,y,r,d))hits.push(d);
    for(let i=0;i<D.STAGES.length-1;i++){if(!gateLocked(i))continue;const g=D.STAGES[i].gate;if(C.circleRect(x,y,r,g))hits.push(g);}
    return hits;
  }
  function canOccupy(e,x,y,isPlayer=false){const r=collisionRadius(e,isPlayer);return circleInsideWalkable(x,y,r)&&blockingRectsAt(e,x,y,r).length===0;}
  function rectEscapeNormal(x,y,r){
    const nx=C.clamp(x,r.x,r.x+r.w),ny=C.clamp(y,r.y,r.y+r.h),dx=x-nx,dy=y-ny;
    if(Math.abs(dx)+Math.abs(dy)>.0001)return C.norm(dx,dy);
    const sides=[{d:Math.abs(x-r.x),x:-1,y:0},{d:Math.abs(r.x+r.w-x),x:1,y:0},{d:Math.abs(y-r.y),x:0,y:-1},{d:Math.abs(r.y+r.h-y),x:0,y:1}].sort((a,b)=>a.d-b.d);return sides[0];
  }
  function unstickEntity(e,isPlayer=false){
    const ox=e.x,oy=e.y;if(canOccupy(e,ox,oy,isPlayer)){if(isPlayer){e.lastSafeX=ox;e.lastSafeY=oy;}return true;}
    let best=null,bestD=Infinity;
    for(let radius=3;radius<=72;radius+=3){for(let i=0;i<24;i++){const a=i*C.TAU/24,x=ox+Math.cos(a)*radius,y=oy+Math.sin(a)*radius;if(canOccupy(e,x,y,isPlayer)&&radius<bestD){best={x,y};bestD=radius;}}if(best)break;}
    if(!best&&isPlayer&&Number.isFinite(e.lastSafeX)&&canOccupy(e,e.lastSafeX,e.lastSafeY,true))best={x:e.lastSafeX,y:e.lastSafeY};
    if(!best)return false;e.x=best.x;e.y=best.y;e.z=D.groundZ(world,e.x,e.y);if(isPlayer){e.lastSafeX=e.x;e.lastSafeY=e.y;}return true;
  }
  function moveEntity(e,dx,dy,isPlayer=false){
    const ox=e.x,oy=e.y,length=Math.hypot(dx,dy);if(length<1e-6)return 0;
    const r=collisionRadius(e,isPlayer),steps=Math.max(1,Math.ceil(length/Math.max(5,r*.42))),sx=dx/steps,sy=dy/steps;
    for(let step=0;step<steps;step++){
      const bx=e.x,by=e.y,tx=bx+sx,ty=by+sy;
      if(canOccupy(e,tx,ty,isPlayer)){e.x=tx;e.y=ty;continue;}
      const candidates=[];
      const hits=blockingRectsAt(e,tx,ty,r);
      if(hits.length){let nx=0,ny=0;for(const h of hits){const n=rectEscapeNormal(tx,ty,h);nx+=n.x;ny+=n.y;}const n=C.norm(nx,ny);if(n.m>.001){const into=sx*n.x+sy*n.y,slx=sx-(into<0?into*n.x:0),sly=sy-(into<0?into*n.y:0);if(Math.hypot(slx,sly)>.001&&canOccupy(e,bx+slx,by+sly,isPlayer))candidates.push({x:bx+slx,y:by+sly,score:slx*sx+sly*sy});}}
      if(Math.abs(sx)>.001&&canOccupy(e,bx+sx,by,isPlayer))candidates.push({x:bx+sx,y:by,score:sx*sx});
      if(Math.abs(sy)>.001&&canOccupy(e,bx,by+sy,isPlayer))candidates.push({x:bx,y:by+sy,score:sy*sy});
      if(candidates.length){candidates.sort((a,b)=>b.score-a.score);e.x=candidates[0].x;e.y=candidates[0].y;}else{
        if(e.vx!==undefined){if(Math.abs(sx)>Math.abs(sy))e.vx=0;else e.vy=0;}
        break;
      }
    }
    if(!canOccupy(e,e.x,e.y,isPlayer))unstickEntity(e,isPlayer);
    if(isPlayer&&canOccupy(e,e.x,e.y,true)){e.lastSafeX=e.x;e.lastSafeY=e.y;}
    return Math.hypot(e.x-ox,e.y-oy);
  }

  function wallRelevant(w,e){const wz=w.z||0;return Math.abs(wz-(e.z||0))<100;}
  function collideWorld(e,isPlayer=false){return unstickEntity(e,isPlayer);}

  function lineHitsWall(x1,y1,x2,y2,z){
    for(const w of world.walls){if(Math.abs((w.z||0)-z)<85&&C.lineIntersectsRect(x1,y1,x2,y2,w))return w;}
    // Prop collision and projectile collision share the same authored footprints. If a
    // table, bench, tree, or dumpster stops the player, it also stops the aim trace.
    for(const c of world.colliders||[]){if(Math.abs((c.z||0)-z)<85&&C.lineIntersectsRect(x1,y1,x2,y2,c))return c;}
    for(const d of world.destructibles){if(!d.dead&&Math.abs((d.z||0)-z)<85&&C.lineIntersectsRect(x1,y1,x2,y2,d))return d;}
    for(let i=0;i<D.STAGES.length-1;i++){if(gateLocked(i)&&C.lineIntersectsRect(x1,y1,x2,y2,D.STAGES[i].gate))return D.STAGES[i].gate;}
    return null;
  }

  function updateEnemies(dt){
    const p=game.player;if(!p)return;const hostileDt=p.focusTime>0?dt*.38:dt;
    for(const e of game.enemies){
      if(e.dead)continue;e.spawnTime=Math.max(0,e.spawnTime-dt);e.invuln=Math.max(0,e.invuln-dt);e.hitFlash=Math.max(0,e.hitFlash-dt);e.hitStun=Math.max(0,e.hitStun-hostileDt);e.squash=C.approach(e.squash,0,hostileDt*5.5);e.attackCd=Math.max(0,e.attackCd-hostileDt);e.stateTime=Math.max(0,e.stateTime-hostileDt);e.telegraph=Math.max(0,e.telegraph-hostileDt);e.phaseTimer+=hostileDt;e.stepPhase+=Math.hypot(e.vx,e.vy)*hostileDt*.035;
      if(e.spawnTime>0)continue;
      e.z=D.groundZ(world,e.x,e.y);const dx=p.x-e.x,dy=p.y-e.y,n=C.norm(dx,dy),distance=n.m;e.aim=Math.atan2(dy,dx);
      if(e.knockX||e.knockY){moveEntity(e,e.knockX*hostileDt,e.knockY*hostileDt);e.knockX=C.approach(e.knockX,0,900*hostileDt);e.knockY=C.approach(e.knockY,0,900*hostileDt);}if(e.hitStun>0){e.vx*=Math.pow(.025,hostileDt);e.vy*=Math.pow(.025,hostileDt);continue;}
      if(e.behavior==='chase')updateDrifter(e,n,distance,hostileDt);
      else if(e.behavior==='shooter')updateGlare(e,n,distance,hostileDt);
      else if(e.behavior==='charger')updateLatch(e,n,distance,hostileDt);
      else if(e.behavior==='orbiter')updateMurmur(e,n,distance,hostileDt);
      else if(e.behavior==='blink')updateMisprint(e,n,distance,hostileDt);
      else if(e.behavior==='bossMisread')updateBossMisread(e,n,distance,hostileDt);
      else if(e.behavior==='bossWeather')updateBossWeather(e,n,distance,hostileDt);
      if(!e.boss&&distance<e.r+p.r+2&&e.state!=='charge')damagePlayer(e.damage*.65,e.x,e.y);
    }
    resolveActorSeparation();
    for(let i=game.enemies.length-1;i>=0;i--)if(game.enemies[i].dead&&game.enemies[i].deathTimer<=0)game.enemies.splice(i,1);
  }

  function resolveActorSeparation(){
    const live=game.enemies.filter(e=>!e.dead&&e.spawnTime<=0),p=game.player;
    for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){const a=live[i],b=live[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.r+b.r)*1.06;if(d>=min)continue;const angle=d>.001?Math.atan2(dy,dx):((i*2.399+j)*1.7)%C.TAU,nx=Math.cos(angle),ny=Math.sin(angle),push=(min-Math.max(.001,d))*.62;moveEntity(a,-nx*push,-ny*push);moveEntity(b,nx*push,ny*push);}
    if(!p)return;for(const e of live){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),min=(e.r+p.r)*.98;if(d>=min)continue;const angle=d>.001?Math.atan2(dy,dx):(e.seed%C.TAU),nx=Math.cos(angle),ny=Math.sin(angle),push=min-Math.max(.001,d);moveEntity(e,nx*push*.8,ny*push*.8);if(p.dashTime<=0)moveEntity(p,-nx*push*.2,-ny*push*.2,true);}
  }

  function enemyMove(e,x,y,dt,mult=1){const n=C.norm(x,y);e.vx=C.lerp(e.vx,n.x*e.speed*mult,1-Math.pow(.002,dt));e.vy=C.lerp(e.vy,n.y*e.speed*mult,1-Math.pow(.002,dt));moveEntity(e,e.vx*dt,e.vy*dt);e.angle=Math.atan2(e.vy,e.vx);}
  function enemyStop(e,dt){e.vx=C.approach(e.vx,0,500*dt);e.vy=C.approach(e.vy,0,500*dt);moveEntity(e,e.vx*dt,e.vy*dt);}

  function updateDrifter(e,n,d,dt){
    if(e.state==='strike'){
      if(e.stateTime>.12){enemyStop(e,dt);}else{enemyMove(e,n.x,n.y,dt,3.5);if(d<e.r+game.player.r+30){damagePlayer(e.damage,e.x,e.y);e.state='recover';e.stateTime=.55;}}
      return;
    }
    if(e.state==='recover'){enemyStop(e,dt);if(e.stateTime<=0)e.state='idle';return;}
    if(d<125&&e.attackCd<=0){e.state='strike';e.stateTime=.36;e.telegraph=.24;e.attackCd=1.1;spawnTelegraph('arc',e.x,e.y,e.z,Math.atan2(n.y,n.x),110,e.color,.24);return;}
    const side=Math.sin(game.time*1.6+e.seed)*.25;enemyMove(e,n.x-n.y*side,n.y+n.x*side,dt,d>340?1.2:1);
  }

  function updateGlare(e,n,d,dt){
    const desired=340;if(d<desired-60)enemyMove(e,-n.x,-n.y,dt,.9);else if(d>desired+80)enemyMove(e,n.x,n.y,dt,.75);else enemyMove(e,-n.y*e.orbit,n.x*e.orbit,dt,.42);
    if(e.attackCd<=0){const lockedAim=e.aim;e.lockedAttackAngle=lockedAim;e.telegraph=.48;e.attackCd=1.55-Math.min(.25,game.stage*.035);spawnTelegraph('line',e.x,e.y,e.z,lockedAim,760,e.color,.48);scheduleEvent(.44,()=>{enemyFan(e,1,0,390,.95,0,lockedAim);e.lockedAttackAngle=null;},e,true);}
  }

  function updateLatch(e,n,d,dt){
    if(e.state==='charge'){
      e.vx=e.chargeX*520;e.vy=e.chargeY*520;moveEntity(e,e.vx*dt,e.vy*dt);if(d<e.r+game.player.r+15)damagePlayer(e.damage*1.2,e.x,e.y);if(e.stateTime<=0){e.state='recover';e.stateTime=.7;e.vx*=.2;e.vy*=.2;e.lockedAttackAngle=null;}return;
    }
    if(e.state==='telegraph'){enemyStop(e,dt);if(e.stateTime<=0){e.state='charge';e.stateTime=.55;Audio.hit(false);}return;}
    if(e.state==='recover'){enemyStop(e,dt);if(e.stateTime<=0)e.state='idle';return;}
    if(d<430&&e.attackCd<=0){e.state='telegraph';e.stateTime=.72;e.telegraph=.72;e.attackCd=2.3;e.chargeX=n.x;e.chargeY=n.y;e.lockedAttackAngle=Math.atan2(e.chargeY,e.chargeX);spawnTelegraph('line',e.x,e.y,e.z,e.lockedAttackAngle,520,e.color,.72);return;}
    enemyMove(e,n.x,n.y,dt,.7);
  }

  function updateMurmur(e,n,d,dt){
    const desired=250,radial=(d-desired)/desired,tan={x:-n.y*e.orbit,y:n.x*e.orbit};enemyMove(e,tan.x+n.x*radial*.8,tan.y+n.y*radial*.8,dt,.95);
    if(e.attackCd<=0){e.attackCd=1.8;e.telegraph=.38;spawnTelegraph('ring',e.x,e.y,e.z,0,85,e.color,.38);scheduleEvent(.34,()=>enemyRadial(e,8+(game.stage>3?2:0),250,.9),e,true);}
  }

  function updateMisprint(e,n,d,dt){
    if(e.state==='vanish'){
      enemyStop(e,dt);e.invuln=.1;if(e.stateTime<=0){
        const a=e.aim+(Math.random()<.5?-1:1)*(1+Math.random()*.7),radius=180+Math.random()*130;let tx=game.player.x+Math.cos(a)*radius,ty=game.player.y+Math.sin(a)*radius;
        if(!D.isWalkable(world,tx,ty)){tx=game.player.x-Math.cos(a)*radius;ty=game.player.y-Math.sin(a)*radius;}
        spawnRing(e.x,e.y,e.z,18,e.color,.35);e.x=tx;e.y=ty;e.z=D.groundZ(world,tx,ty);spawnRing(e.x,e.y,e.z,25,e.color,.45);game.decoys.push({x:e.x+Math.random()*80-40,y:e.y+Math.random()*80-40,z:e.z,life:.6,max:.6,color:e.color});e.state='fire';e.stateTime=.45;
      }return;
    }
    if(e.state==='fire'){enemyStop(e,dt);if(e.stateTime<=.22&&!e.didFire){e.didFire=true;enemyFan(e,5,.18,310,.86);}if(e.stateTime<=0){e.state='idle';e.didFire=false;}return;}
    if(e.attackCd<=0){e.attackCd=2.15;e.state='vanish';e.stateTime=.38;e.telegraph=.38;spawnTelegraph('ring',e.x,e.y,e.z,0,45,e.color,.38);return;}
    enemyMove(e,n.x*.3-n.y*.75*e.orbit,n.y*.3+n.x*.75*e.orbit,dt,.9);
  }

  function updateBossMisread(e,n,d,dt){
    const ratio=e.hp/e.maxHp;e.phase=ratio>.66?1:ratio>.32?2:3;
    if(e.state==='dash'){
      e.vx=e.chargeX*(e.phase===3?720:610);e.vy=e.chargeY*(e.phase===3?720:610);moveEntity(e,e.vx*dt,e.vy*dt);if(d<e.r+game.player.r+12)damagePlayer(e.damage,e.x,e.y);if(e.stateTime<=0){e.state='idle';e.lockedAttackAngle=null;enemyRadial(e,6+e.phase*2,250+e.phase*25,.9);e.attackCd=.75;}return;
    }
    if(e.state==='telegraphDash'){enemyStop(e,dt);if(e.stateTime<=0){e.state='dash';e.stateTime=.46;e.chargeX=Math.cos(e.lockedAttackAngle);e.chargeY=Math.sin(e.lockedAttackAngle);Audio.dash(false);}return;}
    if(e.state==='burst'){enemyStop(e,dt);if(e.stateTime<=0){for(let k=0;k<e.phase;k++)scheduleEvent(k*.17,()=>enemyFan(e,7,.14,340,.9,k*.12),e,true);e.state='idle';e.attackCd=1.05;}return;}
    const orbit=e.phase===1?.3:.55;enemyMove(e,-n.y*e.orbit*orbit+n.x*(d>360?.45:-.12),n.x*e.orbit*orbit+n.y*(d>360?.45:-.12),dt,.7+e.phase*.09);
    if(e.attackCd<=0){
      e.shotIndex++;
      if(e.shotIndex%3===0){e.state='telegraphDash';e.stateTime=.68;e.telegraph=.68;e.lockedAttackAngle=e.aim;spawnTelegraph('line',e.x,e.y,e.z,e.lockedAttackAngle,720,e.color,.68);}
      else if(e.shotIndex%3===1){e.state='burst';e.stateTime=.48;e.telegraph=.48;e.lockedAttackAngle=e.aim;spawnTelegraph('fan',e.x,e.y,e.z,e.lockedAttackAngle,340,e.color,.48);}
      else{enemyRadial(e,10+e.phase*2,260+e.phase*25,.92);e.attackCd=1.15;}
      if(e.phase>=2&&Math.random()<.45){for(let i=0;i<e.phase;i++)game.decoys.push({x:e.x+Math.cos(i*C.TAU/e.phase)*90,y:e.y+Math.sin(i*C.TAU/e.phase)*90,z:e.z,life:1.1,max:1.1,color:e.color});}
    }
  }

  function updateBossWeather(e,n,d,dt){
    const ratio=e.hp/e.maxHp;e.phase=ratio>.68?1:ratio>.34?2:3;
    if(e.state==='stormDash'){
      e.vx=e.chargeX*(540+e.phase*80);e.vy=e.chargeY*(540+e.phase*80);moveEntity(e,e.vx*dt,e.vy*dt);if(d<e.r+game.player.r+18)damagePlayer(e.damage*1.1,e.x,e.y);if(e.stateTime<=0){e.state='idle';e.lockedAttackAngle=null;e.attackCd=.55;enemyRadial(e,8+e.phase*2,280,1);}return;
    }
    if(e.state==='windup'){enemyStop(e,dt);if(e.stateTime<=0){e.state='stormDash';e.stateTime=.58;Audio.dash(false);}return;}
    const swirl={x:-n.y*e.orbit,y:n.x*e.orbit};enemyMove(e,swirl.x+n.x*(d>420?.35:-.18),swirl.y+n.y*(d>420?.35:-.18),dt,.78);
    if(e.attackCd<=0){
      e.shotIndex++;const mode=e.shotIndex%4;
      if(mode===0){e.state='windup';e.stateTime=.82;e.telegraph=.82;e.chargeX=n.x;e.chargeY=n.y;e.lockedAttackAngle=Math.atan2(e.chargeY,e.chargeX);spawnTelegraph('line',e.x,e.y,e.z,e.lockedAttackAngle,800,e.color,.82);}
      else if(mode===1){spawnLightningField(e,e.phase);e.attackCd=1.7;}
      else if(mode===2){for(let k=0;k<3+e.phase;k++)scheduleEvent(k*.15,()=>enemyRadial(e,9+e.phase*2,220+k*30,.85,k*.13),e,true);e.attackCd=1.9;}
      else{spawnRainWall(e,e.phase);e.attackCd=1.55;}
    }
  }

  function enemyFan(e,count,spread,speed,damageScale=1,angleOffset=0,baseAngle=e.aim){
    const diff=difficulty();Audio.enemyShot(C.clamp(count/7,.4,1));for(let i=0;i<count;i++){const t=count===1?0:(i/(count-1)-.5),a=baseAngle+t*spread*(count-1)+angleOffset;spawnEnemyBullet(e.x+Math.cos(a)*(e.r+10),e.y+Math.sin(a)*(e.r+10),e.z+24,Math.cos(a)*speed*diff.bullet,Math.sin(a)*speed*diff.bullet,e.damage*damageScale,e.color,7);}
  }
  function enemyRadial(e,count,speed,damageScale=1,offset=0){const diff=difficulty();Audio.enemyShot(C.clamp(count/12,.55,1));for(let i=0;i<count;i++){const a=i*C.TAU/count+game.time*.4+offset;spawnEnemyBullet(e.x,e.y,e.z+25,Math.cos(a)*speed*diff.bullet,Math.sin(a)*speed*diff.bullet,e.damage*damageScale,e.color,7);}}
  function spawnEnemyBullet(x,y,z,vx,vy,damage,color,r=7,extra={}){game.bullets.push({team:'enemy',x,y,z,vx,vy,r,damage,life:4.8,color,graze:false,...extra});}

  function spawnLightningField(e,phase){
    const p=game.player;for(let i=0;i<2+phase;i++){const a=Math.random()*C.TAU,r=i===0?0:90+Math.random()*220,tx=p.x+Math.cos(a)*r,ty=p.y+Math.sin(a)*r;game.telegraphs.push({kind:'lightning',x:tx,y:ty,z:D.groundZ(world,tx,ty),life:.9,max:.9,r:58+phase*5,color:'#dbe9ff',damage:e.damage*1.15,owner:e,fired:false});}
  }
  function spawnRainWall(e,phase){
    const p=game.player,a=Math.atan2(p.y-e.y,p.x-e.x)+Math.PI/2,n={x:Math.cos(a),y:Math.sin(a)};for(let i=-3-phase;i<=3+phase;i++){const x=e.x+n.x*i*62,y=e.y+n.y*i*62,dir=C.norm(p.x-x,p.y-y);spawnEnemyBullet(x,y,e.z+55,dir.x*(245+phase*25)*difficulty().bullet,dir.y*(245+phase*25)*difficulty().bullet,e.damage*.75,'#9ec9ff',9,{rain:true});}
  }

  function spawnTelegraph(kind,x,y,z,angle,size,color,life){game.telegraphs.push({kind,x,y,z,angle,size,color,life,max:life,fired:true});}

  function updateTelegraphs(dt){
    for(let i=game.telegraphs.length-1;i>=0;i--){const t=game.telegraphs[i];t.life-=dt;
      if(t.kind==='lightning'&&!t.fired&&t.life<=.08){t.fired=true;Audio.hit(true);flashScreen('#cbe5ff',.3);trauma(.28);spawnRing(t.x,t.y,t.z,30,'#dbeaff',.6);if(C.dist2(t.x,t.y,game.player.x,game.player.y)<(t.r+game.player.r)**2)damagePlayer(t.damage,t.x,t.y);for(const e of game.enemies){if(!e.dead&&e!==t.owner&&C.dist2(t.x,t.y,e.x,e.y)<(t.r+e.r)**2)damageEnemy(e,3.5,0,0,true);}}
      if(t.life<=0)game.telegraphs.splice(i,1);
    }
  }

  function updateBullets(dt){
    const p=game.player;
    for(let i=game.bullets.length-1;i>=0;i--){const b=game.bullets[i],step=b.team==='enemy'&&p?.focusTime>0?dt*.38:dt;b.life-=step;b.age=(b.age||0)+step;const ox=b.x,oy=b.y;b.x+=b.vx*step;b.y+=b.vy*step;b.z=D.groundZ(world,b.x,b.y)+24;
      if(b.life<=0||!D.isWalkable(world,b.x,b.y)){game.bullets.splice(i,1);continue;}
      const wall=lineHitsWall(ox,oy,b.x,b.y,b.z-24);if(wall){if(wall.maxHp&&!wall.dead)damageDestructible(wall,b.team==='player'?1:0);spawnParticle(b.x,b.y,b.z,{color:b.color,speed:110,life:.28,size:2.5});game.weather?.splash(b.x,b.y,b.z-24,b.team==='player'?.38:.25,currentStage().palette.rain);if(b.team==='player')Audio.enemyHit(false);game.bullets.splice(i,1);continue;}
      if(b.team==='player'){
        let removed=false;
        for(const e of game.enemies){if(e.dead||e.spawnTime>0||e.invuln>0)continue;if(C.circleCircle(b.x,b.y,b.r,e.x,e.y,e.r)){damageEnemy(e,b.damage,b.vx*.09,b.vy*.09,false);game.hits++;if(b.chain&&!b.chained)chainFrom(e,b);if(b.pierce>0){b.pierce--;b.damage*=.82;b.x+=b.vx*.015;b.y+=b.vy*.015;}else{game.bullets.splice(i,1);removed=true;}break;}}
        if(removed)continue;
      }else if(p&&p.alive){
        if(!b.graze&&C.dist2(b.x,b.y,p.x,p.y)<(p.r+b.r+45)**2){b.graze=true;p.warmth=Math.min(100,p.warmth+1.5);game.style+=4;}
        if(C.circleCircle(b.x,b.y,b.r,p.x,p.y,p.r)){damagePlayer(b.damage,b.x,b.y);game.bullets.splice(i,1);continue;}
      }
    }
  }

  function chainFrom(hit,b){
    let target=null,bd=240*240;for(const e of game.enemies){if(e.dead||e===hit)continue;const d=C.dist2(hit.x,hit.y,e.x,e.y);if(d<bd){bd=d;target=e;}}
    if(!target)return;b.chained=true;damageEnemy(target,b.damage*.62,0,0,false);game.chains.push({x1:hit.x,y1:hit.y,z1:hit.z+25,x2:target.x,y2:target.y,z2:target.z+25,life:.16,max:.16,color:'#9affef'});Audio.chime();
  }

  function damageDestructible(d,amount){
    if(!amount||d.dead)return;d.hp-=amount;spawnParticle(d.x+d.w*.5,d.y+d.h*.5,d.z||0,{color:'#d4c19b',speed:120,life:.45,size:4});
    if(d.hp<=0){const x=d.x+d.w*.5,y=d.y+d.h*.5,z=d.z||D.groundZ(world,x,y);d.dead=true;game.score+=40;game.style+=55;Audio.hit(true);trauma(.18);spawnPickup(x,y,z,'warmth',7,.7);game.weather?.splash(x,y,z,.64,currentStage().palette.rain);for(let i=0;i<16;i++)spawnParticle(d.x+d.w*Math.random(),d.y+d.h*Math.random(),z+20,{color:i%2?'#aa8f69':'#d9c6a1',speed:100+Math.random()*220,life:.5+Math.random()*.5,size:3+Math.random()*5});}
  }

  function damageEnemy(e,damage,kx=0,ky=0,heavy=false){
    if(e.dead||e.invuln>0)return;const p=game.player;
    if(e.type==='latch'&&e.state!=='charge'&&e.state!=='recover'){
      const hitAngle=Math.atan2(ky||Math.sin(p?.angle||0),kx||Math.cos(p?.angle||0));const facing=e.aim+Math.PI;const front=Math.abs(C.angleDiff(facing,hitAngle))<1.05;if(front&&e.shield>0){e.shield=Math.max(0,e.shield-damage*.12);damage*=.22;spawnRing(e.x,e.y,e.z,20,'#ffe19a',.3);Audio.parry();}
    }
    e.hp-=damage;e.hitFlash=.13;e.hitAngle=Math.atan2(ky||Math.sin(game.player?.angle||0),kx||Math.cos(game.player?.angle||0));e.squash=Math.max(e.squash,heavy?1:.52);e.hitStun=Math.max(e.hitStun,e.boss?(heavy?.065:.025):(heavy?.22:.075));e.knockX+=kx/(e.boss?3:1);e.knockY+=ky/(e.boss?3:1);Audio.enemyHit(heavy||e.boss);spawnHitParticles(e.x,e.y,e.z+25,e.color,heavy?14:8);game.hitstop=Math.max(game.hitstop,heavy?.026:.012);if(heavy)trauma(.12);
    game.score+=damage*8;game.style+=damage*7;game.comboTimer=Math.max(game.comboTimer,2.6);game.stylePeak=Math.max(game.stylePeak,game.style);
    if(e.hp<=0)killEnemy(e);
  }

  function killEnemy(e){
    if(e.dead)return;e.dead=true;e.deathTimer=e.boss?.7:.46;e.deathAngle=e.hitAngle||Math.atan2(e.y-game.player.y,e.x-game.player.x);e.deathSpin=(Math.random()<.5?-1:1)*(e.boss?.28:.7);game.kills++;game.stageKills++;game.score+=e.score;game.style+=e.boss?1100:150;game.stylePeak=Math.max(game.stylePeak,game.style);game.comboTimer=3.5;Audio.kill(!!e.boss);trauma(e.boss?.65:.22);spawnRing(e.x,e.y,e.z,e.r,e.color,e.boss?1.4:.62);game.weather?.splash(e.x,e.y,e.z,e.boss?1.35:.72,currentStage().palette.rain);for(let i=0;i<(e.boss?72:24);i++)spawnParticle(e.x,e.y,e.z+e.r*.7,{color:i%4===0?'#ffffff':i%3===0?e.accent:e.color,speed:80+Math.random()*(e.boss?410:260),life:.5+Math.random()*(e.boss?1.25:.7),size:2+Math.random()*(e.boss?8:5),kind:i%4===0?'water':'spark'});game.hitstop=e.boss?.16:.052;
    if(e.boss){for(let i=0;i<7;i++)spawnPickup(e.x+(i-3)*13,e.y+Math.sin(i)*16,e.z,i%3===0?'memory':i%2?'clarity':'warmth',i%3===0?16:11,1.2);}
    else if(game.kills%2===0||e.type==='misprint')spawnPickup(e.x,e.y,e.z,e.type==='misprint'?'clarity':game.kills%4===0?'clarity':'warmth',e.type==='misprint'?10:8,.82);
    if(e===game.boss){game.boss=null;game.bullets=game.bullets.filter(b=>b.team==='player');flashScreen('#fff7d6',.86);showBanner('BOSS ENDED',e.name,e.type==='bossWeather'?'THE RAIN FORGOT YOUR ADDRESS':'THE TRUE ATTACK WAS THE ONE YOU SURVIVED',3);}
  }

  function damagePlayer(amount,x,y){
    const p=game.player;if(!p||!p.alive||p.invuln>0||game.qaInvulnerable)return;
    if(p.homeShield>0&&!p.homeShieldUsed&&amount>=p.clarity){p.homeShieldUsed=true;p.homeShield=0;p.clarity=28;p.invuln=2;Audio.care(5);flashScreen('#ffeaa5',.9);spawnRing(p.x,p.y,p.z,38,'#ffe89d',1.5);showToast('HOME LIT','The light refuses your death once.',4);return;}
    amount*=difficulty().damage;p.clarity-=amount;p.invuln=.55;p.hurtFlash=.25;p.hurtAngle=Math.atan2(y-p.y,x-p.x);game.damageTaken+=amount;game.style*=.58;game.comboTimer=0;Audio.hit(amount>14);trauma(.4);flashScreen('#ff5878',.5);const n=C.norm(p.x-x,p.y-y);p.vx+=n.x*260;p.vy+=n.y*260;const sd=worldVectorToScreen(n.x,n.y);camera.kickX+=sd.x*9;camera.kickY+=sd.y*7;spawnHitParticles(p.x,p.y,p.z+20,'#ff7d8f',16);
    if(p.clarity<=0)killPlayer();
  }

  function killPlayer(){const p=game.player;if(!p||!p.alive)return;p.alive=false;game.mode='dead';Audio.setIntensity(.02);showBanner('CLARITY LOST','THE WEATHER WON THAT SENTENCE','TRY THE CHECKPOINT',2);setTimeout(()=>{if(game.mode==='dead')setMode('dead');},650);}

  function showMicroToast(title,copy){showToast(title,copy,1.45);}

  function spawnParticle(x,y,z,opts={}){
    if(game.particles.length>720)game.particles.splice(0,game.particles.length-720);
    const a=Math.random()*C.TAU,s=opts.speed??(60+Math.random()*130),back=opts.backward;
    const vx=back?back.x*s+(Math.random()-.5)*80:Math.cos(a)*s,vy=back?back.y*s+(Math.random()-.5)*80:Math.sin(a)*s;
    game.particles.push({x,y,z:z||0,vx,vy,vz:opts.vz??(35+Math.random()*120),life:opts.life??.55,max:opts.life??.55,size:opts.size??(2+Math.random()*3),color:opts.color||'#fff',gravity:opts.gravity??180,drag:opts.drag??2.6,kind:opts.kind||'spark'});
  }
  function spawnHitParticles(x,y,z,color,count=8){for(let i=0;i<count;i++)spawnParticle(x,y,z,{color:i%3===0?'#fff6d5':color,speed:90+Math.random()*250,life:.25+Math.random()*.4,size:2+Math.random()*4,vz:40+Math.random()*150});}
  function spawnRing(x,y,z,r,color,life=.55){game.rings.push({x,y,z,r,life,max:life,color});}

  function updateFx(dt){
    for(let i=game.particles.length-1;i>=0;i--){const p=game.particles[i];p.life-=dt;if(p.life<=0){game.particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=p.gravity*dt;const drag=Math.exp(-p.drag*dt);p.vx*=drag;p.vy*=drag;}
    for(const arr of [game.rings,game.slashes,game.chains,game.afterimages,game.decoys])for(let i=arr.length-1;i>=0;i--){arr[i].life-=dt;if(arr[i].life<=0)arr.splice(i,1);}
    for(const e of game.enemies){if(e.dead)e.deathTimer-=dt;}
    game.style=C.approach(game.style,0,(game.comboTimer>0?18:95)*dt);game.comboTimer=Math.max(0,game.comboTimer-dt);game.stylePeak=Math.max(game.stylePeak,game.style);
    if(game.toastTimer>0){game.toastTimer-=dt;if(game.toastTimer<=0)hideToast();}
    if(game.bannerTimer>0){game.bannerTimer-=dt;if(game.bannerTimer<=0)hideBanner();}
    camera.trauma=Math.max(0,camera.trauma-dt*2.2);camera.kickX=C.approach(camera.kickX,0,dt*34);camera.kickY=C.approach(camera.kickY,0,dt*28);const t=camera.trauma*camera.trauma;camera.shakeX=(Math.random()*2-1)*t*18+camera.kickX;camera.shakeY=(Math.random()*2-1)*t*14+camera.kickY;
  }

  function objectiveTarget(){
    const s=currentStage();if(!s||!game.player)return null;
    if(game.phase==='care'||game.phase==='precare')return {x:s.care.x,y:s.care.y,label:'READ',kind:'care',color:s.palette.light};
    if(game.phase==='travel'&&game.stage<D.STAGES.length-1){const n=D.STAGES[game.stage+1];return {x:n.entry.x,y:n.entry.y,label:'NEXT STREET',kind:'exit',color:s.palette.light};}
    if(game.phase==='finish'&&s.finish)return {x:s.finish.x,y:s.finish.y,label:'LIT DOOR',kind:'door',color:'#fff0a8'};
    return null;
  }

  function nearestFreeApproach(target){
    const probe={r:14,collisionR:14,z:D.groundZ(world,target.x,target.y)};let best=null,bd=Infinity;
    const radii=target.kind==='exit'?[0,34,68]:[70,88,104];
    for(const radius of radii){for(let i=0;i<(radius?24:1);i++){const a=i*C.TAU/24,x=target.x+Math.cos(a)*radius,y=target.y+Math.sin(a)*radius;if(!canOccupy(probe,x,y,true))continue;const d=C.dist2(game.player.x,game.player.y,x,y);if(d<bd){bd=d;best={x,y};}}if(best&&radius===0)break;}
    return best||{x:target.x,y:target.y};
  }

  function navSegmentClear(a,b){
    const probe={r:14,collisionR:14,z:0},d=C.dist(a.x,a.y,b.x,b.y),steps=Math.max(1,Math.ceil(d/18));
    for(let i=1;i<=steps;i++){const t=i/steps,x=C.lerp(a.x,b.x,t),y=C.lerp(a.y,b.y,t);if(!canOccupy(probe,x,y,true))return false;}return true;
  }

  function computeRoutePath(start,target){
    const goal=nearestFreeApproach(target),step=46,margin=180;
    const minX=Math.floor((Math.min(start.x,goal.x)-margin)/step)*step,maxX=Math.ceil((Math.max(start.x,goal.x)+margin)/step)*step;
    const minY=Math.floor((Math.min(start.y,goal.y)-margin)/step)*step,maxY=Math.ceil((Math.max(start.y,goal.y)+margin)/step)*step;
    const probe={r:14,collisionR:14,z:0},key=(x,y)=>`${x},${y}`,sx=Math.round(start.x/step)*step,sy=Math.round(start.y/step)*step,gx=Math.round(goal.x/step)*step,gy=Math.round(goal.y/step)*step;
    const startNode={x:sx,y:sy,g:0,f:C.dist(sx,sy,gx,gy),parent:null},open=[startNode],best=new Map([[key(sx,sy),0]]),closed=new Set();
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];let found=null,loops=0;
    while(open.length&&loops++<4200){
      let bi=0;for(let i=1;i<open.length;i++)if(open[i].f<open[bi].f)bi=i;const q=open.splice(bi,1)[0],qk=key(q.x,q.y);if(closed.has(qk))continue;closed.add(qk);
      if(C.dist2(q.x,q.y,gx,gy)<step*step*1.6){found=q;break;}
      for(const [dx,dy] of dirs){const x=q.x+dx*step,y=q.y+dy*step;if(x<minX||x>maxX||y<minY||y>maxY)continue;if(!canOccupy(probe,x,y,true))continue;
        if(dx&&dy&&(!canOccupy(probe,q.x+dx*step,q.y,true)||!canOccupy(probe,q.x,q.y+dy*step,true)))continue;
        const g=q.g+step*(dx&&dy?1.414:1),k=key(x,y);if(best.has(k)&&best.get(k)<=g)continue;best.set(k,g);open.push({x,y,g,f:g+C.dist(x,y,gx,gy),parent:q});
      }
    }
    if(!found)return navSegmentClear(start,goal)?[start,goal]:[];
    const raw=[goal];for(let q=found;q;q=q.parent)raw.push({x:q.x,y:q.y});raw.push(start);raw.reverse();
    const smooth=[raw[0]];let i=0;while(i<raw.length-1){let j=raw.length-1;for(;j>i+1;j--)if(navSegmentClear(raw[i],raw[j]))break;smooth.push(raw[j]);i=j;}return smooth;
  }

  function updateRoute(dt){
    game.routeClock-=dt;const t=objectiveTarget(),key=t?`${game.stage}:${game.phase}:${Math.round(t.x)}:${Math.round(t.y)}`:'';
    if(!t){game.routeTarget=null;game.routePath=[];game.routeTargetKey='';return;}
    game.routeTarget=t;if(key!==game.routeTargetKey||game.routeClock<=0){game.routeTargetKey=key;game.routeClock=.48;game.routePath=computeRoutePath({x:game.player.x,y:game.player.y},t);}
  }

  function updateCamera(dt){
    if(game.mode==='title'||!game.player){const t=performance.now()/1000;const tx=530+Math.cos(t*.12)*110,ty=410+Math.sin(t*.17)*80;camera.x=C.lerp(camera.x,tx,1-Math.pow(.06,dt));camera.y=C.lerp(camera.y,ty,1-Math.pow(.06,dt));camera.z=C.lerp(camera.z,0,1-Math.pow(.06,dt));camera.zoom=C.lerp(camera.zoom,camera.targetZoom*.94,1-Math.pow(.05,dt));return;}
    const p=game.player,lead=38,s=currentStage();let tx=p.x+Math.cos(p.aimAngle)*lead+(p.vx*.09),ty=p.y+Math.sin(p.aimAngle)*lead+(p.vy*.09),tz=p.z,bossScale=1;
    if(game.boss&&!game.boss.dead){
      const b=game.boss,dx=b.x-p.x,dy=b.y-p.y,sdx=(dx-dy)*C.ISO_X,sdy=(dx+dy)*C.ISO_Y;
      // Boss framing uses the midpoint and reserves space for the bodies, HUD and boss bar,
      // not merely their ground contact points.
      tx=C.lerp(p.x,b.x,.50);ty=C.lerp(p.y,b.y,.50);tz=Math.max(p.z,b.z+b.r*.65);
      const fitX=(view.w-420)/(Math.abs(sdx)+420),fitY=(view.h-330)/(Math.abs(sdy)+420);
      bossScale=C.clamp(Math.min(.78,fitX,fitY),.65,.78);
      if(view.w>980){const rightBias=64/(2*C.ISO_X*camera.targetZoom*bossScale);tx-=rightBias;ty+=rightBias;}
    }
    if(game.phase!=='travel'&&game.phase!=='finish'){tx=C.clamp(tx,s.bounds.x+170,s.bounds.x+s.bounds.w-170);ty=C.clamp(ty,s.bounds.y+150,s.bounds.y+s.bounds.h-150);}camera.x=C.lerp(camera.x,tx,1-Math.pow(.0025,dt));camera.y=C.lerp(camera.y,ty,1-Math.pow(.0025,dt));camera.z=C.lerp(camera.z,tz,1-Math.pow(.004,dt));camera.zoom=C.lerp(camera.zoom,camera.targetZoom*bossScale,1-Math.pow(.02,dt));
  }

  function update(dt){
    if(game.mode!=='play'){updateCamera(dt);updateFx(dt);game.weather?.update(dt,{level:game.weatherLevel||.82,stageIndex:game.stage||0,player:game.player,sheltered:game.sheltered,reducedMotion:REDUCED_MOTION.matches});Audio.setClarity(1);return;}
    game.time+=dt;game.runTime+=dt;
    const a=actions();
    if(game.hitstop>0){game.hitstop=Math.max(0,game.hitstop-dt);updateFx(dt*.35);updateCamera(dt);clearEdges();return;}
    updatePlayer(dt,a);updateCompanion(dt);updateScheduled(dt);updateEnemies(dt);updateBullets(dt);updatePickups(dt);updateTelegraphs(game.player?.focusTime>0?dt*.38:dt);updateStage(dt);updatePrompt();updateRoute(dt);updateFx(dt);updateCamera(dt);game.weather?.update(dt,{level:game.weatherLevel,stageIndex:game.stage,player:game.player,sheltered:game.sheltered,reducedMotion:REDUCED_MOTION.matches});game.uiClock-=dt;if(game.uiClock<=0){game.uiClock=1/30;updateUI();Audio.setClarity(game.player.clarity/game.player.maxClarity);Audio.setIntensity(game.boss?1:game.enemies.length?Math.min(1,.42+game.enemies.length*.035):.12);Audio.setWeather(game.sheltered?game.weatherLevel*.48:game.weatherLevel,currentStage().weather?.wind||0);}
    decayActionBuffers(dt);clearEdges();
  }

  function renderVerbs(){
    const order=['restStep','shelterPulse','harmonicShot','colorRead','secondStranger','homeLit'];dom.verbs.innerHTML=order.filter(v=>game.abilities.has(v)).map(v=>{const d=D.VERBS[v];return `<div class="verb"><kbd>${d.key}</kbd><b>${d.title}</b><span>${d.desc}</span></div>`;}).join('');
  }

  function buildMinimap(){
    let html='';for(let i=0;i<D.STAGES.length;i++){if(i)html+='<i class="mapLine"></i>';const cls=i<game.stage||game.careRead[i]?'done':i===game.stage?'current':'';html+=`<i class="mapNode ${cls}" title="${D.STAGES[i].name}"></i>`;}dom.minimap.innerHTML=html;
  }

  function updateUI(force=false){
    if(!game.player)return;const p=game.player,r=getRank(game.style);dom.zone.textContent=currentStage().name;dom.clarityBar.style.transform=`scaleX(${C.clamp(p.clarity/p.maxClarity,0,1)})`;dom.clarityNumber.value=Math.max(0,Math.ceil(p.clarity));dom.warmthBar.style.transform=`scaleX(${p.warmth/100})`;dom.warmthNumber.value=Math.floor(p.warmth);
    const focusReady=game.abilities.has('colorRead'),fp=focusReady?(p.focusTime>0?1:C.clamp(1-p.focusCd/6.3,0,1)):0;dom.focusBar.style.transform=`scaleX(${fp})`;dom.focusNumber.value=focusReady?(p.focusTime>0?'READING':p.focusCd>0?`${p.focusCd.toFixed(1)}s`:'READY'):'—';dom.rank.dataset.rank=r.rank;dom.rank.querySelector('small').textContent=r.name;dom.rank.querySelector('b').textContent=r.rank;dom.styleScore.textContent=Math.floor(game.style);
    if(game.boss&&!game.boss.dead){dom.bossHud.classList.remove('hidden');dom.bossName.textContent=game.boss.name;dom.bossPhase.value=['','I','II','III'][game.boss.phase]||'I';dom.bossBar.style.transform=`scaleX(${C.clamp(game.boss.hp/game.boss.maxHp,0,1)})`;}else dom.bossHud.classList.add('hidden');
    const interaction=nearestInteraction(),pulseReady=game.abilities.has('shelterPulse');touchUI.read.textContent=interaction?'READ':pulseReady?(p.warmth>=35&&p.pulseCd<=0?'PULSE':p.pulseCd>0?`${p.pulseCd.toFixed(1)}s`:'35 WARM'):'READ';touchUI.read.classList.toggle('is-locked',!interaction&&(!pulseReady||p.warmth<35||p.pulseCd>0));touchUI.read.setAttribute('aria-disabled',touchUI.read.classList.contains('is-locked')?'true':'false');
    touchUI.focus.classList.toggle('hidden',!focusReady);touchUI.focus.classList.toggle('is-locked',focusReady&&p.focusCd>0);touchUI.focus.classList.toggle('is-unavailable',!focusReady);touchUI.focus.textContent=!focusReady?'COLOR':p.focusTime>0?'READING':p.focusCd>0?`${Math.ceil(p.focusCd)}s`:'COLOR';touchUI.focus.setAttribute('aria-disabled',!focusReady||p.focusCd>0?'true':'false');
    touchUI.dash.classList.toggle('is-cooling',p.dashCd>0);touchUI.blade.classList.toggle('is-cooling',p.bladeCd>0);
    if(force||game.statsDirty){renderVerbs();buildMinimap();game.statsDirty=false;}
  }

  function fixedLoop(now){
    if(game.perf.lastFrame){const ms=now-game.perf.lastFrame;if(ms>0&&ms<250&&!document.hidden){game.perf.samples.push(ms);if(game.perf.samples.length>900)game.perf.samples.shift();if(ms>20)game.perf.longFrames++;game.perf.maxMs=Math.max(game.perf.maxMs,ms);}}game.perf.lastFrame=now;
    if(!game.lastTime)game.lastTime=now;let frameDt=Math.min(.05,(now-game.lastTime)/1000);game.lastTime=now;game.accumulator+=frameDt;
    const step=1/120;let loops=0;while(game.accumulator>=step&&loops<7){update(step);game.accumulator-=step;loops++;}
    render();requestAnimationFrame(fixedLoop);
  }

  function perfStats(){const samples=game.perf.samples.slice().sort((a,b)=>a-b),at=q=>samples.length?samples[Math.min(samples.length-1,Math.floor((samples.length-1)*q))]:null,average=samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:null;return {frames:samples.length,averageMs:average,p50Ms:at(.5),p95Ms:at(.95),p99Ms:at(.99),maxMs:samples.length?samples[samples.length-1]:null,longFrames:samples.filter(v=>v>20).length,framesOver33:samples.filter(v=>v>33.34).length};}

  function hexRgb(hex){hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const n=parseInt(hex,16);return {r:n>>16,g:(n>>8)&255,b:n&255};}
  function rgba(hex,a=1){const c=hexRgb(hex);return `rgba(${c.r},${c.g},${c.b},${a})`;}
  function shade(hex,amount){const c=hexRgb(hex),f=v=>Math.round(C.clamp(v+255*amount,0,255));return `rgb(${f(c.r)},${f(c.g)},${f(c.b)})`;}
  function P(x,y,z=0){return worldToScreen(x,y,z);}
  function visiblePoint(x,y,z=0,pad=220){const p=P(x,y,z);return p.x>-pad&&p.x<view.w+pad&&p.y>-pad&&p.y<view.h+pad;}

  function isoRectPoints(r,z=0){return [P(r.x,r.y,z),P(r.x+r.w,r.y,z),P(r.x+r.w,r.y+r.h,z),P(r.x,r.y+r.h,z)];}
  function pathPoints(points){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();}
  function fillPoly(points,fill,stroke=null,line=1){pathPoints(points);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
  function drawIsoBox(r,z,h,top,sideA=shade(top,-.12),sideB=shade(top,-.22),stroke='rgba(255,255,255,.08)'){
    const a=P(r.x,r.y,z),b=P(r.x+r.w,r.y,z),c=P(r.x+r.w,r.y+r.h,z),d=P(r.x,r.y+r.h,z),at=P(r.x,r.y,z+h),bt=P(r.x+r.w,r.y,z+h),ct=P(r.x+r.w,r.y+r.h,z+h),dt=P(r.x,r.y+r.h,z+h);
    fillPoly([d,c,ct,dt],sideA,stroke);fillPoly([b,c,ct,bt],sideB,stroke);fillPoly([at,bt,ct,dt],top,stroke);
  }
  function drawShadow(x,y,z,r,alpha=.35){const p=P(x,y,z+1);ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.42);const g=ctx.createRadialGradient(0,0,0,0,0,r*1.5*camera.zoom);g.addColorStop(0,`rgba(0,0,0,${alpha})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.5*camera.zoom,0,C.TAU);ctx.fill();ctx.restore();}

  function surfaceColor(s){const pal=D.STAGES[s.stage]?.palette||D.STAGES[0].palette;switch(s.kind){case'asphalt':return pal.road;case'sidewalk':return shade(pal.ground,.07);case'grass':return pal.ground;case'path':return shade(pal.road,.07);case'wood':return '#56473d';case'alley':return pal.road;case'wetStone':return shade(pal.road,.05);case'roof':return pal.ground;case'ramp':return '#39434a';case'flood':return pal.ground;case'water':return '#0b3440';case'porch':return '#5a4738';default:return pal.ground;}}

  function drawSurfaces(){
    const ordered=world.surfaces.slice().sort((a,b)=>a.z-b.z);
    for(const s of ordered){const cx=s.x+s.w*.5,cy=s.y+s.h*.5;if(!visiblePoint(cx,cy,s.z,900))continue;const pts=isoRectPoints(s,s.z),base=surfaceColor(s),pal=D.STAGES[s.stage]?.palette||D.STAGES[0].palette;fillPoly(pts,base,rgba(pal.edge||'#fff',.3),1);
      drawWetSurface(s,pts,pal);
      if(s.kind==='water'||s.kind==='flood'){ctx.save();pathPoints(pts);ctx.clip();ctx.globalAlpha=.31;ctx.strokeStyle='#9cecff';ctx.lineWidth=1.25;for(let i=0;i<11;i++){const yy=((i*83+game.time*24)%700)-40;ctx.beginPath();ctx.moveTo(0,pts[0].y+yy);ctx.lineTo(view.w,pts[0].y+yy+Math.sin(i+game.time)*7);ctx.stroke();}ctx.restore();}
      else if(s.kind==='asphalt'||s.kind==='alley'||s.kind==='roof'||s.kind==='wetStone')drawSurfaceGrid(s,rgba('#d9f7f1',s.kind==='roof'?.085:.055));
    }
  }

  function drawWetSurface(s,pts,pal){
    const wet=['asphalt','alley','roof','wetStone','sidewalk','path','porch','flood','water'].includes(s.kind);if(!wet)return;
    const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y)),g=ctx.createLinearGradient(minX,minY,maxX,maxY);
    g.addColorStop(0,rgba(pal.rain||'#8bdcf0',.015));g.addColorStop(.38,rgba('#dffaff',.085));g.addColorStop(.48,rgba('#ffffff',.018));g.addColorStop(1,rgba(pal.accent||'#76ded8',.045));
    ctx.save();pathPoints(pts);ctx.clip();ctx.globalCompositeOperation='screen';ctx.fillStyle=g;ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
    ctx.lineCap='round';for(let i=0;i<3;i++){const t=((i*.347+s.stage*.173)%1),y=s.y+s.h*(.18+t*.64),x0=s.x+s.w*(.08+(i%2)*.13),x1=s.x+s.w*(.4+(i%3)*.17),a=P(x0,y,s.z+1),b=P(Math.min(s.x+s.w*.92,x1),y,s.z+1);ctx.strokeStyle=rgba(i%2?pal.light:'#dffaff',.075);ctx.lineWidth=(1+i*.5)*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.restore();
  }

  function drawSurfaceGrid(s,color){
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1;
    const step=s.kind==='roof'?120:160;
    for(let x=s.x+step;x<s.x+s.w;x+=step){const a=P(x,s.y,s.z+1),b=P(x,s.y+s.h,s.z+1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(let y=s.y+step;y<s.y+s.h;y+=step){const a=P(s.x,y,s.z+1),b=P(s.x+s.w,y,s.z+1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.restore();
  }

  function drawDecor(){
    for(const d of game.decor){if(!visiblePoint(d.x,d.y,0,100))continue;const z=D.groundZ(world,d.x,d.y),p=P(d.x,d.y,z+1);ctx.save();ctx.translate(p.x,p.y);
      if(d.type==='puddle'){ctx.scale(1,.42);const pulse=.8+Math.sin(game.time*1.8+d.t*9)*.08,g=ctx.createLinearGradient(-d.r,0,d.r,0);g.addColorStop(0,rgba('#06151c',.34));g.addColorStop(.5,rgba(D.STAGES[d.stage].palette.rain,.25));g.addColorStop(1,rgba('#d5f7ff',.08));ctx.fillStyle=g;ctx.strokeStyle=rgba('#bcefff',.31);ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,0,d.r*camera.zoom*pulse,d.r*.48*camera.zoom,0,0,C.TAU);ctx.fill();ctx.stroke();ctx.strokeStyle=rgba('#f2ffff',.2);ctx.beginPath();ctx.arc(0,0,d.r*.42*camera.zoom,-2.7,-1.2);ctx.stroke();}
      else if(d.type==='leaf'){ctx.rotate(d.a);ctx.fillStyle=d.stage===3?'rgba(214,148,255,.14)':'rgba(225,172,76,.14)';ctx.beginPath();ctx.ellipse(0,0,5*camera.zoom,2*camera.zoom,0,0,C.TAU);ctx.fill();}
      else{ctx.rotate(d.a);ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-d.r*.25*camera.zoom,0);ctx.lineTo(0,-d.r*.08*camera.zoom);ctx.lineTo(d.r*.25*camera.zoom,d.r*.1*camera.zoom);ctx.stroke();}
      ctx.restore();
    }
  }

  function drawGroundEllipse(x,y,z,rx,ry,color,alpha=1,line=2){
    const q=P(x,y,z+2);ctx.save();ctx.translate(q.x,q.y);ctx.scale(1,.48);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=line;ctx.beginPath();ctx.ellipse(0,0,rx*camera.zoom,ry*camera.zoom,0,0,C.TAU);ctx.stroke();ctx.restore();
  }

  function drawWorldArc(x,y,z,r,a0,a1,color,width=3,fill=null){
    const steps=20,pts=[];for(let i=0;i<=steps;i++){const a=C.lerp(a0,a1,i/steps);pts.push(P(x+Math.cos(a)*r,y+Math.sin(a)*r,z+4));}
    if(fill){const c=P(x,y,z+4);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }

  function drawRouteGuidance(){
    const path=game.routePath,target=game.routeTarget;if(!target||!game.player)return;
    const color=target.color||currentStage().palette.light;
    if(path.length>1){
      let carry=0,index=0;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],len=C.dist(a.x,a.y,b.x,b.y),n=C.norm(b.x-a.x,b.y-a.y);for(let d=Math.max(0,58-carry);d<len;d+=58){const x=a.x+n.x*d,y=a.y+n.y*d,z=D.groundZ(world,x,y),q=P(x,y,z+3),sd=worldVectorToScreen(n.x,n.y),ang=Math.atan2(sd.y,sd.x),pulse=.58+.32*Math.sin(game.time*5-index*.55);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(ang);ctx.globalAlpha=pulse;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(11*camera.zoom,0);ctx.lineTo(-7*camera.zoom,-6*camera.zoom);ctx.lineTo(-3*camera.zoom,0);ctx.lineTo(-7*camera.zoom,6*camera.zoom);ctx.closePath();ctx.fill();ctx.restore();index++;}carry=(carry+len)%58;}
    }
    const z=D.groundZ(world,target.x,target.y),q=P(target.x,target.y,z+4),top=P(target.x,target.y,z+135),pulse=.72+.28*Math.sin(game.time*4);
    drawGroundEllipse(target.x,target.y,z,target.kind==='care'?55:48,target.kind==='care'?55:48,color,.55*pulse,3);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba(color,.48*pulse);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(top.x,top.y);ctx.stroke();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(top.x,top.y,6+2*pulse,0,C.TAU);ctx.fill();ctx.restore();
  }

  function traceAimPoint(){
    const p=game.player;if(!p)return null;let dx=p.aimX||Math.cos(p.aimAngle),dy=p.aimY||Math.sin(p.aimAngle),desired=C.norm((p.aimTargetX??p.x+dx*560)-p.x,(p.aimTargetY??p.y+dy*560)-p.y);if(desired.m>.001){dx=desired.x;dy=desired.y;}
    const assisted=aimAssistDirection(p.x,p.y,dx,dy);dx=assisted.x;dy=assisted.y;const maxRange=input.lastDevice==='mouse'||input.lastDevice==='keyboard'?Math.min(920,Math.max(130,desired.m||560)):920,steps=Math.ceil(maxRange/14);let x=p.x,y=p.y,lastX=x,lastY=y;
    for(let i=1;i<=steps;i++){x=p.x+dx*Math.min(maxRange,i*14);y=p.y+dy*Math.min(maxRange,i*14);if(lineHitsWall(lastX,lastY,x,y,p.z)){x=lastX;y=lastY;break;}lastX=x;lastY=y;}
    let target=null,best=32;
    const len=C.dist(p.x,p.y,x,y)||1;for(const e of game.enemies){if(e.dead||e.spawnTime>0)continue;const t=C.clamp(((e.x-p.x)*(x-p.x)+(e.y-p.y)*(y-p.y))/(len*len),0,1),px=C.lerp(p.x,x,t),py=C.lerp(p.y,y,t),d=C.dist(px,py,e.x,e.y);if(t>.04&&d<e.r+18&&d<best+e.r){best=d-e.r;target=e;}}
    return {x,y,dx,dy,target};
  }

  function drawAimGuide(){
    if(!game.player||game.mode!=='play')return;const p=game.player,a=traceAimPoint();if(!a)return;const color=a.target?a.target.accent:currentStage().palette.accent,startX=p.x+a.dx*31,startY=p.y+a.dy*31,dist=C.dist(startX,startY,a.x,a.y),steps=Math.max(2,Math.floor(dist/38));
    ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<=steps;i++){const t=i/steps,x=C.lerp(startX,a.x,t),y=C.lerp(startY,a.y,t),z=D.groundZ(world,x,y)+24,q=P(x,y,z);ctx.globalAlpha=.12+.42*t;ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,(1.6+1.4*t)*camera.zoom,0,C.TAU);ctx.fill();}ctx.restore();
    const z=D.groundZ(world,a.x,a.y);drawGroundEllipse(a.x,a.y,z,a.target?a.target.r+12:16,a.target?a.target.r+12:16,color,a.target?.82:.58,2.5);
    if(a.target){const q=P(a.target.x,a.target.y,a.target.z+a.target.r*2.35);ctx.save();ctx.textAlign='center';ctx.font=`900 ${Math.max(8,10*camera.zoom)}px ui-sans-serif`;ctx.fillStyle=a.target.accent;ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(a.target.name,q.x,q.y);ctx.restore();}
  }

  function edgeMarkerFor(x,y,color,label){
    const q=P(x,y,D.groundZ(world,x,y)+40),margin=54;if(q.x>=margin&&q.x<=view.w-margin&&q.y>=margin&&q.y<=view.h-margin)return;
    const cx=view.w*.5,cy=view.h*.5,dx=q.x-cx,dy=q.y-cy,n=C.norm(dx,dy);if(n.m<.001)return;
    const tx=Math.abs(n.x)>.001?(n.x>0?(view.w-margin-cx)/n.x:(margin-cx)/n.x):Infinity,ty=Math.abs(n.y)>.001?(n.y>0?(view.h-margin-cy)/n.y:(margin-cy)/n.y):Infinity,t=Math.min(Math.abs(tx),Math.abs(ty)),ex=cx+n.x*t,ey=cy+n.y*t,ang=Math.atan2(n.y,n.x);
    ctx.save();ctx.translate(ex,ey);ctx.rotate(ang);ctx.fillStyle=color;ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-7,-8);ctx.lineTo(-4,0);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.rotate(-ang);ctx.font='900 9px ui-sans-serif';ctx.textAlign='center';ctx.fillText(label,0,-14);ctx.restore();
  }

  function drawScreenGuidance(){
    if(!game.player||game.mode!=='play')return;
    if(game.routeTarget)edgeMarkerFor(game.routeTarget.x,game.routeTarget.y,game.routeTarget.color||'#ffe08a',game.routeTarget.label||'NEXT');
    const threats=game.enemies.filter(e=>!e.dead&&e.spawnTime<=0).sort((a,b)=>C.dist2(game.player.x,game.player.y,a.x,a.y)-C.dist2(game.player.x,game.player.y,b.x,b.y)).slice(0,5);for(const e of threats)edgeMarkerFor(e.x,e.y,e.color,'THREAT');
    if(game.runTime<5){const p=game.player,q=P(p.x,p.y,p.z+70),fade=C.clamp((5-game.runTime)/2,0,1),pulse=.65+.35*Math.sin(game.time*6);ctx.save();ctx.translate(q.x,q.y);ctx.globalAlpha=fade;ctx.fillStyle=`rgba(255,247,215,${.72+.2*pulse})`;ctx.strokeStyle='rgba(5,14,18,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(-7,-5);ctx.lineTo(7,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  }

  function drawTelegraphs(){
    for(const t of game.telegraphs){const a=C.clamp(t.life/t.max,0,1),pulse=.55+.45*Math.sin((1-a)*18);
      ctx.save();ctx.globalAlpha=(.18+.45*(1-a))*pulse;ctx.strokeStyle=t.color;ctx.fillStyle=rgba(t.color,.12);ctx.lineWidth=2+3*(1-a);
      if(t.kind==='line'){const p=P(t.x,t.y,t.z+4),q=P(t.x+Math.cos(t.angle)*t.size,t.y+Math.sin(t.angle)*t.size,t.z+4);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
      else if(t.kind==='arc'){drawWorldArc(t.x,t.y,t.z,t.size,t.angle-.72,t.angle+.72,t.color,2+3*(1-a));const c=P(t.x,t.y,t.z+4),l=P(t.x+Math.cos(t.angle-.72)*t.size,t.y+Math.sin(t.angle-.72)*t.size,t.z+4),r=P(t.x+Math.cos(t.angle+.72)*t.size,t.y+Math.sin(t.angle+.72)*t.size,t.z+4);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(l.x,l.y);ctx.moveTo(c.x,c.y);ctx.lineTo(r.x,r.y);ctx.stroke();}
      else if(t.kind==='ring'||t.kind==='lightning'){const p=P(t.x,t.y,t.z+3),r=(t.r||t.size)*camera.zoom;ctx.translate(p.x,p.y);ctx.scale(1,.48);ctx.beginPath();ctx.arc(0,0,r,0,C.TAU);ctx.fill();ctx.stroke();}
      else if(t.kind==='fan'){drawWorldArc(t.x,t.y,t.z,t.size,t.angle-.65,t.angle+.65,t.color,2+3*(1-a),rgba(t.color,.12));}
      ctx.restore();
    }
  }

  function boxScreenBounds(r,z=0,h=0){
    const pts=[...isoRectPoints(r,z),...isoRectPoints(r,z+h)];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of pts){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}return {minX,minY,maxX,maxY};
  }
  function worldObjectFade(kind,o,depth){
    if(!game.player||kind==='player'||kind==='enemy'||kind==='companion'||kind==='after'||kind==='decoy')return 1;
    const playerDepth=game.player.x+game.player.y+game.player.z*2;if(depth<=playerDepth+4)return 1;
    let r=null,z=o.z||0,h=o.height||0;
    if(kind==='wall'||kind==='destruct'||kind==='gate')r=o;
    else if(kind==='prop'&&(o.type==='house'||o.type==='finalHouse')){const w=o.w||580,hh=o.h||500;r={x:o.x-w*.5,y:o.y-hh*.5,w,h:hh};h=220;}
    else if(kind==='prop'&&(o.type==='car'||o.type==='van'||o.type==='dumpster')){const w=o.type==='van'?210:o.type==='dumpster'?130:185,hh=o.type==='van'?90:o.type==='dumpster'?68:92;r={x:o.x-w*.5,y:o.y-hh*.5,w,h:hh};h=o.type==='dumpster'?62:77;}
    else if(kind==='prop'&&o.type==='tree'){const scale=o.scale||1;r={x:o.x-46*scale,y:o.y-46*scale,w:92*scale,h:92*scale};h=165*scale;}
    else if(kind==='prop'&&o.type==='waterTower'){r={x:o.x-90,y:o.y-80,w:180,h:160};h=240;}
    if(!r)return 1;const b=boxScreenBounds(r,z,h),p=P(game.player.x,game.player.y,game.player.z+30),pad=15*camera.zoom;
    return p.x>=b.minX-pad&&p.x<=b.maxX+pad&&p.y>=b.minY-pad&&p.y<=b.maxY+pad?.2:1;
  }

  function renderWorldObjects(){
    const draws=[];
    for(const w of world.walls){if(w.kind==='car'||w.kind==='van')continue;const cx=w.x+w.w*.5,cy=w.y+w.h*.5;if(visiblePoint(cx,cy,(w.z||0)+w.height,450))draws.push({depth:cx+cy+(w.z||0)*2,kind:'wall',o:w});}
    for(const d of world.destructibles){if(!d.dead){const cx=d.x+d.w*.5,cy=d.y+d.h*.5;if(visiblePoint(cx,cy,(d.z||0)+d.height,350))draws.push({depth:cx+cy+(d.z||0)*2,kind:'destruct',o:d});}}
    for(let i=0;i<D.STAGES.length-1;i++){if(gateLocked(i)){const g=D.STAGES[i].gate,cx=g.x+g.w*.5,cy=g.y+g.h*.5;draws.push({depth:cx+cy,kind:'gate',o:{...g,stage:i}});}}
    for(const p of world.props){if(visiblePoint(p.x,p.y,p.z,520))draws.push({depth:p.x+p.y+p.z*2,kind:'prop',o:p});}
    for(const a of game.afterimages)draws.push({depth:a.x+a.y+a.z*2-.2,kind:'after',o:a});
    for(const d of game.decoys)draws.push({depth:d.x+d.y+d.z*2,kind:'decoy',o:d});
    for(const p of game.pickups)if(visiblePoint(p.x,p.y,p.z,90))draws.push({depth:p.x+p.y+p.ground*2+.5,kind:'pickup',o:p});
    for(const e of game.enemies)if(!e.dead||e.deathTimer>0)draws.push({depth:e.x+e.y+e.z*2,kind:'enemy',o:e});
    if(game.companion)draws.push({depth:game.companion.x+game.companion.y+game.companion.z*2-.1,kind:'companion',o:game.companion});
    if(game.player)draws.push({depth:game.player.x+game.player.y+game.player.z*2,kind:'player',o:game.player});
    draws.sort((a,b)=>a.depth-b.depth);
    for(const d of draws){
      const fade=worldObjectFade(d.kind,d.o,d.depth);ctx.save();if(fade<1){ctx.globalAlpha=fade;ctx.setLineDash([7,5]);}
      if(d.kind==='wall')drawWall(d.o);else if(d.kind==='destruct')drawDestructible(d.o);else if(d.kind==='gate')drawGate(d.o);else if(d.kind==='prop')drawProp(d.o);else if(d.kind==='pickup')drawPickup(d.o);else if(d.kind==='enemy')drawEnemy(d.o);else if(d.kind==='player')drawPlayer(d.o,1,false);else if(d.kind==='companion')drawPlayer(d.o,d.o.alpha*.68,true);else if(d.kind==='after')drawPlayer(d.o,d.o.life/d.o.max*.35,true);else if(d.kind==='decoy')drawDecoy(d.o);ctx.restore();
    }
  }

  function drawPickup(o){
    const color=o.type==='clarity'?'#86eaff':o.type==='memory'?'#d6a8ff':'#ffe18b',q=P(o.x,o.y,o.z+Math.sin(o.age*6)*4),s=camera.zoom*(o.type==='memory'?1.25:1);
    drawGroundEllipse(o.x,o.y,o.ground,13,13,color,.34+.16*Math.sin(o.age*5),2);
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(o.spin);ctx.globalCompositeOperation='lighter';ctx.shadowColor=color;ctx.shadowBlur=18*s;ctx.fillStyle=color;ctx.strokeStyle='#f8ffff';ctx.lineWidth=1.4*s;ctx.beginPath();if(o.type==='warmth'){ctx.moveTo(0,-7*s);ctx.lineTo(7*s,0);ctx.lineTo(0,7*s);ctx.lineTo(-7*s,0);}else if(o.type==='clarity'){ctx.moveTo(0,-10*s);ctx.lineTo(6*s,-1*s);ctx.lineTo(0,10*s);ctx.lineTo(-6*s,-1*s);}else{for(let i=0;i<8;i++){const a=i*C.TAU/8,r=i%2?5*s:11*s;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }

  function drawWall(w){
    const z=w.z||0,pal=D.STAGES[w.stage]?.palette||D.STAGES[0].palette;let color='#314248';
    if(w.kind==='fence'||w.kind==='parapet')color=pal.edge;else if(w.kind==='houseWall')color='#48564f';else if(w.kind==='insideWall')color='#6a5a4d';else if(w.kind==='building')color='#26333c';else if(w.kind==='busShelter')color='#27434b';else if(w.kind==='car')color='#26363e';else if(w.kind==='tower')color='#49515a';else if(w.kind==='vent')color='#39454e';else if(w.kind==='van')color='#263b40';
    if(w.kind==='fence'){drawFenceWall(w,z,pal);return;}
    if(w.kind==='busShelter')drawIsoBox(w,z,w.height,'rgba(100,178,188,.13)','rgba(51,117,128,.18)','rgba(32,80,91,.2)','rgba(183,239,243,.22)');else drawIsoBox(w,z,w.height,color,shade(color,-.08),shade(color,-.2),rgba(pal.edge,.2));
    const topA=P(w.x,w.y,z+w.height+1),topB=P(w.x+w.w,w.y,z+w.height+1),topC=P(w.x+w.w,w.y+w.h,z+w.height+1);ctx.strokeStyle=rgba('#e4fbff',.18);ctx.lineWidth=1.5*camera.zoom;ctx.beginPath();ctx.moveTo(topA.x,topA.y);ctx.lineTo(topB.x,topB.y);ctx.lineTo(topC.x,topC.y);ctx.stroke();
    if(['building','houseWall','insideWall','tower'].includes(w.kind)&&w.height>62)drawWallDetails(w,z,pal);
    if(w.kind==='busShelter'){const corners=[P(w.x,w.y,z),P(w.x+w.w,w.y,z),P(w.x+w.w,w.y+w.h,z),P(w.x,w.y+w.h,z)],tops=[P(w.x,w.y,z+w.height),P(w.x+w.w,w.y,z+w.height),P(w.x+w.w,w.y+w.h,z+w.height),P(w.x,w.y+w.h,z+w.height)];ctx.strokeStyle='rgba(183,235,238,.52)';ctx.lineWidth=3*camera.zoom;ctx.beginPath();for(let i=0;i<4;i++){ctx.moveTo(corners[i].x,corners[i].y);ctx.lineTo(tops[i].x,tops[i].y);ctx.lineTo(tops[(i+1)%4].x,tops[(i+1)%4].y);}ctx.stroke();}
  }

  function drawFenceWall(w,z,pal){
    const horizontal=w.w>=w.h,length=horizontal?w.w:w.h,count=C.clamp(Math.ceil(length/125),2,11),x0=horizontal?w.x:w.x+w.w*.5,y0=horizontal?w.y+w.h*.5:w.y,x1=horizontal?w.x+w.w:w.x+w.w*.5,y1=horizontal?w.y+w.h*.5:w.y+w.h;
    ctx.lineCap='round';for(let i=0;i<=count;i++){const t=i/count,x=C.lerp(x0,x1,t),y=C.lerp(y0,y1,t),a=P(x,y,z),b=P(x,y,z+w.height);ctx.strokeStyle='#10252b';ctx.lineWidth=7*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=rgba(pal.edge,.62);ctx.lineWidth=2.2*camera.zoom;ctx.stroke();}
    for(const h of [w.height*.38,w.height*.78]){const a=P(x0,y0,z+h),b=P(x1,y1,z+h);ctx.strokeStyle='#10252b';ctx.lineWidth=7*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=rgba('#b9e8e7',.44);ctx.lineWidth=2*camera.zoom;ctx.stroke();}
  }

  function drawWallDetails(w,z,pal){
    const count=C.clamp(Math.floor(w.w/115),1,6),faceY=w.y+w.h+.5;
    for(let i=1;i<=count;i++){const x=w.x+w.w*i/(count+1),top=P(x,faceY,z+w.height*.82),bottom=P(x,faceY,z+7),hash=(Math.floor(x*3+w.y+(w.stage||0)*11)+i)%5;ctx.strokeStyle=rgba('#b9eafa',.08+(i%2)*.035);ctx.lineWidth=(1+i%2)*camera.zoom;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(bottom.x,bottom.y);ctx.stroke();
      if(w.kind==='building'||w.kind==='houseWall'){const a=P(x-16,faceY+1,z+w.height*.38),b=P(x+16,faceY+1,z+w.height*.38),bt=P(x+16,faceY+1,z+w.height*.69),at=P(x-16,faceY+1,z+w.height*.69);fillPoly([a,b,bt,at],hash===0?rgba(pal.light,.52):'rgba(7,22,30,.78)',rgba('#d5f7ff',.16),1);const mid=P(x,faceY+1,z+w.height*.38),midT=P(x,faceY+1,z+w.height*.69);ctx.strokeStyle=rgba('#d7f5f4',.12);ctx.beginPath();ctx.moveTo(mid.x,mid.y);ctx.lineTo(midT.x,midT.y);ctx.stroke();}
    }
  }
  function drawDestructible(d){const color=d.kind==='fence'?'#725b43':d.kind==='chainFence'?'#53676b':'#67513d';drawIsoBox(d,d.z||0,d.height,color);const ratio=d.hp/d.maxHp;if(ratio<.7){const c=P(d.x+d.w*.5,d.y+d.h*.5,(d.z||0)+d.height+1);ctx.strokeStyle='rgba(25,16,10,.65)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c.x-10,c.y-10);ctx.lineTo(c.x+8,c.y+9);ctx.moveTo(c.x+4,c.y-12);ctx.lineTo(c.x-6,c.y+8);ctx.stroke();}}
  function drawGate(g){drawIsoBox(g,0,98,'#314c50','#20383c','#182b30');const p=P(g.x+g.w*.5,g.y+g.h*.5,112);ctx.fillStyle=rgba(D.STAGES[g.stage].palette.accent,.75);ctx.beginPath();ctx.arc(p.x,p.y,5+Math.sin(game.time*5)*2,0,C.TAU);ctx.fill();}

  function propCareActive(p){const s=currentStage(),c=s?.care;return !!(p.care&&c&&Math.abs(p.x-c.x)<3&&Math.abs(p.y-c.y)<3&&careAvailable());}
  function drawCareAura(p,color){
    const z=p.z||D.groundZ(world,p.x,p.y),q=P(p.x,p.y,z+34),top=P(p.x,p.y,z+118),pulse=.82+.18*Math.sin(game.time*3+p.x*.01),r=88*camera.zoom*pulse,g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r);
    ctx.save();ctx.globalCompositeOperation='lighter';g.addColorStop(0,rgba('#fff8d6',.34));g.addColorStop(.26,rgba(color,.22));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,r,0,C.TAU);ctx.fill();ctx.strokeStyle=rgba(color,.22);ctx.lineWidth=3*camera.zoom;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(top.x,top.y);ctx.stroke();ctx.fillStyle=rgba('#fff9dd',.58);for(let i=0;i<5;i++){const a=game.time*(.65+i*.08)+i*C.TAU/5,rr=(30+i*7)*camera.zoom,y=Math.sin(game.time*1.7+i)*9*camera.zoom;ctx.beginPath();ctx.arc(q.x+Math.cos(a)*rr,q.y+y,1.5+(i%2),0,C.TAU);ctx.fill();}ctx.restore();drawGroundEllipse(p.x,p.y,z,66,66,color,.55*pulse,3);
  }

  function drawProp(p){
    const z=p.z||D.groundZ(world,p.x,p.y),active=propCareActive(p),pal=D.STAGES[p.stage]?.palette||D.STAGES[0].palette;if(active)drawCareAura(p,pal.accent);
    switch(p.type){
      case'bench':{drawShadow(p.x,p.y,z,45,.25);drawIsoBox({x:p.x-50,y:p.y-16,w:100,h:32},z+14,15,'#8b6a47');drawIsoBox({x:p.x-48,y:p.y+10,w:96,h:10},z+28,45,'#755236');for(const sx of [-38,38])drawIsoBox({x:p.x+sx-3,y:p.y-12,w:6,h:24},z,17,'#4b4d49');break;}
      case'pot':{const size=active?1.55:1;drawShadow(p.x,p.y,z,22*size,.22);const q=P(p.x,p.y,z+5),s=camera.zoom*size;ctx.save();ctx.translate(q.x,q.y);ctx.scale(1,.55);ctx.fillStyle=p.care&&game.careRead[p.stage]?'#76553e':'#b5794e';ctx.strokeStyle='#251a18';ctx.lineWidth=3*s;ctx.beginPath();ctx.ellipse(0,0,18*s,13*s,0,0,C.TAU);ctx.fill();ctx.stroke();ctx.restore();for(let i=-2;i<=2;i++){const leaf=P(p.x+i*5*size,p.y,z+19+Math.abs(i)*2);ctx.strokeStyle='#1c332b';ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(q.x,q.y-4*s);ctx.lineTo(leaf.x,leaf.y);ctx.stroke();ctx.fillStyle=i%2?'#73d9b5':'#4c9d87';ctx.beginPath();ctx.ellipse(leaf.x,leaf.y,7*s,3.5*s,i*.42,0,C.TAU);ctx.fill();}if(active){const seed=P(p.x,p.y,z+34);ctx.fillStyle='#fff1a3';ctx.shadowColor='#ffe17d';ctx.shadowBlur=22*s;ctx.beginPath();ctx.arc(seed.x,seed.y,4.5*s,0,C.TAU);ctx.fill();ctx.shadowBlur=0;}break;}
      case'busSign':drawPole(p,'#77d9e7','BUS');break;
      case'lamp':drawLamp(p,false);break;
      case'porchLight':case'porchlight':drawLamp(p,true);break;
      case'car':case'van':drawVehicle(p);break;
      case'bollard':drawIsoBox({x:p.x-8,y:p.y-8,w:16,h:16},z,40,'#a28b64');break;
      case'gatePost':drawIsoBox({x:p.x-11,y:p.y-11,w:22,h:22},z,118,'#42565a');break;
      case'house':case'finalHouse':drawHouse(p);break;
      case'table':drawIsoBox({x:p.x-48,y:p.y-36,w:96,h:72},z,32,'#76563e');break;
      case'sofa':drawIsoBox({x:p.x-65,y:p.y-32,w:130,h:64},z,38,'#3f665f');break;
      case'rug':{const pts=isoRectPoints({x:p.x-80,y:p.y-55,w:160,h:110},z);fillPoly(pts,'#61435e','rgba(255,255,255,.05)');break;}
      case'tree':drawTree(p);break;
      case'window':drawWindow(p);break;
      case'dumpster':drawIsoBox({x:p.x-65,y:p.y-34,w:130,h:68},z,62,'#2f5a55');break;
      case'chimes':case'windChime':drawChimes(p,active);break;
      case'fireEscape':drawFireEscape(p);break;
      case'laundry':drawLaundry(p);break;
      case'vent':drawIsoBox({x:p.x-55,y:p.y-42,w:110,h:84},z,52,'#48525b');break;
      case'waterTower':drawWaterTower(p);break;
      case'mural':drawMural(p,active);break;
      case'antenna':drawAntenna(p);break;
      case'roofLight':drawRoofLight(p);break;
      case'note':drawNote(p,active);break;
      case'windowsill':drawIsoBox({x:p.x-60,y:p.y-15,w:120,h:30},z,18,'#7b654e');break;
      case'pie':drawPie(p);break;
      case'drain':drawDrain(p);break;
      case'stormDrain':drawStormDrain(p);break;
      case'waterDebris':drawWaterDebris(p);break;
      case'homeDoor':drawHomeDoor(p);break;
      case'hydrant':drawHydrant(p);break;
      case'newspaper':drawNewspaper(p);break;
      case'roadStripe':drawRoadStripe(p);break;
      case'mailbox':drawMailbox(p);break;
      case'garden':drawGarden(p);break;
      case'downspout':drawDownspout(p);break;
      case'neonSign':drawNeonSign(p);break;
      case'pipe':drawPipe(p);break;
      case'trashBag':drawTrashBag(p);break;
      case'satellite':drawSatellite(p);break;
      case'roofPipe':drawRoofPipe(p);break;
      case'barrel':drawBarrel(p);break;
      case'umbrella':drawUmbrella(p);break;
      case'warningSign':drawWarningSign(p);break;
      case'porchRail':drawPorchRail(p);break;
    }
  }

  function drawPole(p,color,label){const z=p.z||0,a=P(p.x,p.y,z),b=P(p.x,p.y,z+100);ctx.strokeStyle='#5c7072';ctx.lineWidth=4*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const q=P(p.x,p.y,z+108);ctx.fillStyle=color;ctx.fillRect(q.x-18*camera.zoom,q.y-8*camera.zoom,36*camera.zoom,16*camera.zoom);if(label){ctx.fillStyle='#092025';ctx.font=`${Math.max(6,8*camera.zoom)}px ui-sans-serif`;ctx.textAlign='center';ctx.fillText(label,q.x,q.y+3*camera.zoom);}}
  function drawVehicle(p){const z=p.z||0,w=p.type==='van'?210:185,h=p.type==='van'?90:92,s=camera.zoom,color=p.color||'#315968';drawShadow(p.x,p.y,z,88,.4);drawIsoBox({x:p.x-w*.5,y:p.y-h*.5,w,h},z,36,color,shade(color,-.12),shade(color,-.25),'rgba(214,246,247,.16)');drawIsoBox({x:p.x-w*.2,y:p.y-h*.34,w:w*.43,h:h*.68},z+36,p.type==='van'?38:25,'#18323d','#10262f','#0b1d25','rgba(196,238,244,.2)');
    const wheelPoints=[P(p.x-w*.31,p.y+h*.51,z+9),P(p.x+w*.3,p.y+h*.51,z+9)];for(const q of wheelPoints){ctx.fillStyle='#081116';ctx.strokeStyle='#80969a';ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(q.x,q.y,10*s,0,C.TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#26363b';ctx.beginPath();ctx.arc(q.x,q.y,4*s,0,C.TAU);ctx.fill();}
    const lamp=P(p.x+w*.47,p.y+h*.25,z+27),tail=P(p.x-w*.47,p.y+h*.25,z+24);ctx.fillStyle='#fff0a0';ctx.shadowColor='#ffd166';ctx.shadowBlur=13*s;ctx.beginPath();ctx.arc(lamp.x,lamp.y,4*s,0,C.TAU);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#79ddeb';ctx.beginPath();ctx.rect(tail.x-3*s,tail.y-2*s,6*s,4*s);ctx.fill();}
  function drawLamp(p,porch){const z=p.z||0,a=P(p.x,p.y,z),b=P(p.x,p.y,z+(porch?82:115));if(!porch){ctx.strokeStyle='#3c5054';ctx.lineWidth=5*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}const q=b,r=(porch?8:12)*camera.zoom;ctx.fillStyle='#fff1b2';ctx.shadowColor='#ffcf75';ctx.shadowBlur=24*camera.zoom;ctx.beginPath();ctx.arc(q.x,q.y,r,0,C.TAU);ctx.fill();ctx.shadowBlur=0;}
  function drawHouse(p){const z=p.z||0,w=p.w||580,h=p.h||500,c=p.color||'#3d5148';drawIsoBox({x:p.x-w*.5,y:p.y-h*.5,w,h},z,120,c);const a=P(p.x-w*.56,p.y-h*.56,z+120),b=P(p.x+w*.56,p.y-h*.56,z+120),c1=P(p.x+w*.56,p.y+h*.56,z+120),d=P(p.x-w*.56,p.y+h*.56,z+120),ridge1=P(p.x,p.y-h*.56,z+220),ridge2=P(p.x,p.y+h*.56,z+220);fillPoly([a,b,ridge1],'#263c39','rgba(255,255,255,.08)');fillPoly([b,c1,ridge2,ridge1],'#213432','rgba(255,255,255,.08)');fillPoly([d,a,ridge1,ridge2],'#2d4540','rgba(255,255,255,.08)');}
  function drawTree(p){const z=p.z||0,scale=p.scale||1,a=P(p.x,p.y,z),b=P(p.x,p.y,z+95*scale);ctx.strokeStyle='#4b3729';ctx.lineWidth=12*scale*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();for(let i=0;i<5;i++){const q=P(p.x+(i-2)*12*scale,p.y+Math.sin(i)*16*scale,z+95*scale+i*8),r=(34-i*2)*scale*camera.zoom;ctx.fillStyle=i%2?'#263f37':'#315044';ctx.beginPath();ctx.arc(q.x,q.y,r,0,C.TAU);ctx.fill();}}
  function drawWindow(p){const q=P(p.x,p.y,p.z||75),w=34*camera.zoom,h=48*camera.zoom;ctx.fillStyle=p.lit?'#f9d686':'#11222b';ctx.shadowColor=p.lit?'#f8c767':'transparent';ctx.shadowBlur=p.lit?16*camera.zoom:0;ctx.fillRect(q.x-w*.5,q.y-h*.5,w,h);ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.18)';ctx.strokeRect(q.x-w*.5,q.y-h*.5,w,h);}
  function drawChimes(p,active){const z=p.z||95,top=P(p.x,p.y,z),base=P(p.x,p.y,z-58);ctx.strokeStyle=active?'#a7fff5':'#9bbfc3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(base.x,base.y);ctx.stroke();for(let i=-2;i<=2;i++){const q=P(p.x+i*10,p.y,z-35-Math.abs(i)*3+Math.sin(game.time*2+i)*3);ctx.strokeStyle=active?'#e9fff9':'#a9c6c9';ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillStyle=active?'#9affed':'#789396';ctx.beginPath();ctx.moveTo(q.x-3,q.y);ctx.lineTo(q.x+3,q.y);ctx.lineTo(q.x,q.y+14*camera.zoom);ctx.closePath();ctx.fill();}}
  function drawFireEscape(p){for(let i=0;i<4;i++){const a=P(p.x-55,p.y,p.z+30+i*30),b=P(p.x+55,p.y,p.z+30+i*30);ctx.strokeStyle='#50616b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
  function drawLaundry(p){const a=P(p.x-55,p.y,p.z),b=P(p.x+55,p.y,p.z);ctx.strokeStyle='rgba(220,239,235,.35)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle=p.x%2?'#b96d7e':'#5d91a1';const q=P(p.x,p.y,p.z-4);ctx.fillRect(q.x-15,q.y,30*camera.zoom,21*camera.zoom);}
  function drawWaterTower(p){const z=p.z||140;drawShadow(p.x,p.y,z,80,.3);for(const a of [-55,55]){const q=P(p.x+a,p.y,z),r=P(p.x+a*.55,p.y,z+130);ctx.strokeStyle='#4e5962';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.stroke();}const c=P(p.x,p.y,z+145);ctx.save();ctx.translate(c.x,c.y);ctx.scale(1,.58);ctx.fillStyle='#49545c';ctx.beginPath();ctx.ellipse(0,0,75*camera.zoom,62*camera.zoom,0,0,C.TAU);ctx.fill();ctx.restore();}
  function drawMural(p,active){const z=p.z||145,a=P(p.x-92,p.y,z),b=P(p.x+92,p.y,z),at=P(p.x-92,p.y,z+110),bt=P(p.x+92,p.y,z+110);fillPoly([a,b,bt,at],'#342f48','rgba(255,255,255,.15)');ctx.save();pathPoints([a,b,bt,at]);ctx.clip();for(let i=0;i<9;i++){const x=C.lerp(at.x,b.x,(i*.137)%1),y=C.lerp(at.y,b.y,(i*.271)%1);ctx.fillStyle=[rgba('#5eead4',active?.9:.45),rgba('#ffb454',active?.85:.38),rgba('#d18cff',active?.85:.38)][i%3];ctx.beginPath();ctx.arc(x,y,(10+i%3*7)*camera.zoom,0,C.TAU);ctx.fill();}ctx.restore();}
  function drawAntenna(p){const a=P(p.x,p.y,p.z),b=P(p.x,p.y,p.z+120);ctx.strokeStyle='#87979a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(b.x-18,b.y+15);ctx.lineTo(b.x+18,b.y+15);ctx.stroke();}
  function drawRoofLight(p){const q=P(p.x,p.y,p.z+12);ctx.fillStyle=p.lit?'#ffe0a0':'#4e5661';ctx.fillRect(q.x-10,q.y-5,20,10);}
  function drawNote(p,active){const scale=camera.zoom*(active?1.7:1),hover=active?22+Math.sin(game.time*3)*4:0,q=P(p.x,p.y,(p.z||4)+12+hover);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-.2+Math.sin(game.time*1.7)*.025);ctx.fillStyle='#f4eedc';ctx.strokeStyle='#283a40';ctx.lineWidth=1.5*scale;ctx.shadowColor=active?'#fff0a0':'transparent';ctx.shadowBlur=active?22*scale:0;ctx.fillRect(-14*scale,-10*scale,28*scale,20*scale);ctx.strokeRect(-14*scale,-10*scale,28*scale,20*scale);ctx.shadowBlur=0;ctx.strokeStyle='#33414a';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-9*scale,(-5+i*5)*scale);ctx.lineTo(8*scale,(-5+i*5)*scale);ctx.stroke();}ctx.restore();}
  function drawPie(p){const q=P(p.x,p.y,(p.z||45)+8);ctx.save();ctx.translate(q.x,q.y);ctx.scale(1,.52);ctx.fillStyle='#b66a3d';ctx.beginPath();ctx.arc(0,0,25*camera.zoom,0,C.TAU);ctx.fill();ctx.strokeStyle='#f4c27e';ctx.lineWidth=4;for(let a=0;a<C.TAU;a+=Math.PI/3){ctx.beginPath();ctx.moveTo(Math.cos(a)*6,Math.sin(a)*6);ctx.lineTo(Math.cos(a)*22*camera.zoom,Math.sin(a)*22*camera.zoom);ctx.stroke();}ctx.restore();for(let i=0;i<3;i++){ctx.strokeStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.moveTo(q.x+(i-1)*6,q.y-8);ctx.bezierCurveTo(q.x+(i-1)*9,q.y-18,q.x+(i-1)*2,q.y-25,q.x+(i-1)*7,q.y-34);ctx.stroke();}}
  function drawDrain(p){const q=P(p.x,p.y,p.z||0);ctx.strokeStyle='rgba(120,183,194,.28)';for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(q.x+i*6,q.y-7);ctx.lineTo(q.x+i*6,q.y+7);ctx.stroke();}}
  function drawWaterDebris(p){const q=P(p.x,p.y,p.z||0);ctx.fillStyle=p.kind===0?'rgba(132,102,68,.42)':p.kind===1?'rgba(180,190,180,.24)':'rgba(105,145,152,.3)';ctx.save();ctx.translate(q.x,q.y);ctx.rotate(p.x*.01);ctx.fillRect(-8,-3,16,6);ctx.restore();}
  function drawHomeDoor(p){const z=p.z||5,a=P(p.x,p.y,z),b=P(p.x,p.y,z+105);ctx.strokeStyle=game.phase==='finish'?'#fff2ad':'#4e5a54';ctx.lineWidth=42*camera.zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(game.phase==='finish')drawCareAura(p,'#ffe8a0');}
  function drawHydrant(p){const z=p.z||0,s=camera.zoom;drawShadow(p.x,p.y,z,23,.3);drawIsoBox({x:p.x-12,y:p.y-12,w:24,h:24},z,39,'#efc45f','#aa7d31','#775421');const q=P(p.x,p.y,z+47);ctx.fillStyle='#ffe18a';ctx.strokeStyle='#17242b';ctx.lineWidth=3*s;ctx.beginPath();ctx.arc(q.x,q.y,12*s,0,C.TAU);ctx.fill();ctx.stroke();for(const side of [-1,1]){ctx.beginPath();ctx.arc(q.x+side*12*s,q.y+7*s,5*s,0,C.TAU);ctx.fill();ctx.stroke();}}
  function drawNewspaper(p){const z=p.z||0,r={x:p.x-24,y:p.y-16,w:48,h:32},pts=isoRectPoints(r,z+2);fillPoly(pts,'#d7d8cf','rgba(7,18,24,.52)',1);const a=P(p.x-15,p.y,z+3),b=P(p.x+14,p.y,z+3);ctx.strokeStyle='rgba(22,42,48,.55)';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(a.x,a.y+i*3);ctx.lineTo(b.x,b.y+i*3);ctx.stroke();}}
  function drawRoadStripe(p){const z=p.z||0,len=p.length||230,pts=isoRectPoints({x:p.x-len*.5,y:p.y-6,w:len,h:12},z+2);fillPoly(pts,'rgba(255,224,133,.48)','rgba(255,249,213,.24)',1);}
  function drawStormDrain(p){const z=p.z||0,pts=isoRectPoints({x:p.x-34,y:p.y-18,w:68,h:36},z+2);fillPoly(pts,'#101d22','rgba(139,211,223,.34)',1.2);for(let i=-3;i<=3;i++){const a=P(p.x+i*8,p.y-15,z+3),b=P(p.x+i*8,p.y+15,z+3);ctx.strokeStyle='rgba(140,205,214,.43)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
  function drawMailbox(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z),b=P(p.x,p.y,z+68),q=P(p.x,p.y,z+91);ctx.strokeStyle='#16262b';ctx.lineWidth=7*s;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#70cdda';ctx.strokeStyle='#08171d';ctx.lineWidth=3*s;ctx.beginPath();ctx.roundRect(q.x-22*s,q.y-15*s,44*s,28*s,7*s);ctx.fill();ctx.stroke();ctx.fillStyle='#ffe087';ctx.fillRect(q.x+16*s,q.y-25*s,4*s,18*s);}
  function drawGarden(p){const z=p.z||0,scale=(p.scale||1)*camera.zoom;for(let i=0;i<9;i++){const a=i*C.TAU/9+(p.x%7),r=18+(i%3)*10,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r,q=P(x,y,z+7+(i%2)*5);ctx.strokeStyle='#608c76';ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(q.x,q.y+8*scale);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.fillStyle=i%3===0?'#ffe68c':i%3===1?'#85e7ec':'#dbb1ff';ctx.beginPath();ctx.arc(q.x,q.y,3.8*scale,0,C.TAU);ctx.fill();}}
  function drawDownspout(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z+114),b=P(p.x,p.y,z+8),c=P(p.x+25,p.y,z+8);ctx.strokeStyle='#91afb5';ctx.lineWidth=7*s;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.strokeStyle='rgba(181,236,248,.55)';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();}
  function drawNeonSign(p){const q=P(p.x,p.y,p.z||110),s=camera.zoom,text=p.text||'OPEN';ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-.02);ctx.fillStyle='rgba(4,18,26,.9)';ctx.strokeStyle='#75e5ed';ctx.lineWidth=3*s;ctx.shadowColor='#63e1ed';ctx.shadowBlur=22*s;ctx.fillRect(-35*s,-17*s,70*s,34*s);ctx.strokeRect(-35*s,-17*s,70*s,34*s);ctx.fillStyle='#fff1a0';ctx.font=`900 ${Math.max(8,13*s)}px ui-sans-serif`;ctx.textAlign='center';ctx.fillText(text,0,5*s);ctx.restore();}
  function drawPipe(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z),b=P(p.x,p.y,z+82),c=P(p.x+25,p.y,z+82);ctx.strokeStyle='#1d2c32';ctx.lineWidth=13*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.strokeStyle='#6f8990';ctx.lineWidth=5*s;ctx.stroke();}
  function drawTrashBag(p){const z=p.z||0,q=P(p.x,p.y,z+20),s=camera.zoom;drawShadow(p.x,p.y,z,25,.32);ctx.fillStyle='#111c22';ctx.strokeStyle='rgba(172,222,226,.18)';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(q.x,q.y-28*s);ctx.quadraticCurveTo(q.x+25*s,q.y-19*s,q.x+20*s,q.y+17*s);ctx.quadraticCurveTo(q.x,q.y+29*s,q.x-22*s,q.y+16*s);ctx.quadraticCurveTo(q.x-27*s,q.y-17*s,q.x,q.y-28*s);ctx.fill();ctx.stroke();ctx.strokeStyle='#86a9ac';ctx.beginPath();ctx.moveTo(q.x-7*s,q.y-29*s);ctx.lineTo(q.x+7*s,q.y-29*s);ctx.stroke();}
  function drawSatellite(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z),q=P(p.x,p.y,z+52);ctx.strokeStyle='#687b82';ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.save();ctx.translate(q.x,q.y);ctx.rotate(-.45);ctx.scale(1,.48);ctx.fillStyle='#60727a';ctx.strokeStyle='#c2e2e7';ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(0,0,28*s,.1,Math.PI-.1);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  function drawRoofPipe(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z),b=P(p.x,p.y,z+55);ctx.strokeStyle='#17262d';ctx.lineWidth=14*s;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#829aa0';ctx.lineWidth=6*s;ctx.stroke();ctx.fillStyle='#a2b7ba';ctx.beginPath();ctx.ellipse(b.x,b.y,8*s,4*s,0,0,C.TAU);ctx.fill();}
  function drawBarrel(p){const z=p.z||0,s=camera.zoom;drawShadow(p.x,p.y,z,30,.34);drawIsoBox({x:p.x-24,y:p.y-24,w:48,h:48},z,58,'#c49a47','#7d5e2d','#5e4422');const q=P(p.x,p.y,z+59);ctx.strokeStyle='#f2d17d';ctx.lineWidth=2*s;ctx.beginPath();ctx.ellipse(q.x,q.y,22*s,10*s,0,0,C.TAU);ctx.stroke();}
  function drawUmbrella(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z),b=P(p.x,p.y,z+68),q=P(p.x,p.y,z+82);ctx.strokeStyle='#c7d9d8';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(b.x+8*s,b.y+4*s,b.x+8*s,b.y+12*s);ctx.stroke();ctx.fillStyle=p.color||'#70cedc';ctx.strokeStyle='#07161c';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(q.x-38*s,q.y);ctx.quadraticCurveTo(q.x,q.y-34*s,q.x+38*s,q.y);ctx.quadraticCurveTo(q.x+19*s,q.y-7*s,q.x,q.y);ctx.quadraticCurveTo(q.x-20*s,q.y-7*s,q.x-38*s,q.y);ctx.fill();ctx.stroke();}
  function drawWarningSign(p){const z=p.z||0,s=camera.zoom,a=P(p.x,p.y,z),q=P(p.x,p.y,z+62);ctx.strokeStyle='#202b2e';ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(a.x-14*s,a.y);ctx.lineTo(q.x,q.y);ctx.lineTo(a.x+14*s,a.y);ctx.stroke();ctx.fillStyle='#ffe273';ctx.strokeStyle='#15242a';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(q.x,q.y-27*s);ctx.lineTo(q.x+25*s,q.y+18*s);ctx.lineTo(q.x-25*s,q.y+18*s);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#15242a';ctx.font=`900 ${15*s}px ui-sans-serif`;ctx.textAlign='center';ctx.fillText('!',q.x,q.y+12*s);}
  function drawPorchRail(p){const z=p.z||0,len=p.length||320,s=camera.zoom,a=P(p.x-len*.5,p.y,z+8),b=P(p.x+len*.5,p.y,z+8),at=P(p.x-len*.5,p.y,z+54),bt=P(p.x+len*.5,p.y,z+54);ctx.strokeStyle='#d3d2bd';ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.lineTo(b.x,b.y);for(let i=1;i<8;i++){const x=p.x-len*.5+len*i/8,c=P(x,p.y,z+8),d=P(x,p.y,z+50);ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);}ctx.stroke();}

  function drawEnemy(e){
    if(e.dead){const a=C.clamp(e.deathTimer/.4,0,1);ctx.save();ctx.globalAlpha=a;drawEnemyBody(e,a);ctx.restore();return;}drawEnemyBody(e,1);
  }
  function drawEnemyBody(e,alpha){
    const scale=camera.zoom*1.12,spawn=C.clamp(1-e.spawnTime/.45,0,1),faceAngle=e.lockedAttackAngle??e.aim??e.angle??0,f=worldVectorToScreen(Math.cos(faceAngle),Math.sin(faceAngle)),perp={x:-f.y,y:f.x};
    drawShadow(e.x,e.y,e.z,e.r*(e.boss?1.5:1),e.boss?.48:.38);drawGroundEllipse(e.x,e.y,e.z,e.r+7,e.r+7,e.color,e.boss?.52:.3,2);
    const q=P(e.x,e.y,e.z+(e.boss?e.r*.8:31)),stepBob=e.boss?Math.sin(game.time*2+e.seed)*2:Math.abs(Math.sin(e.stepPhase||0))*2.5,impact=worldVectorToScreen(Math.cos(e.hitAngle||0),Math.sin(e.hitAngle||0));ctx.save();ctx.globalAlpha=alpha*spawn;ctx.translate(q.x-impact.x*(e.hitStun||0)*34*scale,q.y-stepBob*scale-impact.y*(e.hitStun||0)*24*scale);
    if(e.dead){const total=e.boss?.7:.46,t=C.clamp(1-e.deathTimer/total,0,1),fall=worldVectorToScreen(Math.cos(e.deathAngle||0),Math.sin(e.deathAngle||0));ctx.translate(fall.x*t*24*scale,fall.y*t*14*scale+t*t*18*scale);ctx.rotate((e.deathSpin||.5)*t);ctx.scale(spawn*(1+t*.12),spawn*(1-t*.52));}
    else{const sq=e.squash||0,wind=e.telegraph>0?C.clamp(e.telegraph/.7,0,1):0;ctx.translate(-f.x*wind*4*scale,-f.y*wind*3*scale);ctx.scale(spawn*(1+sq*.14),spawn*(1-sq*.2));}
    if(e.hitFlash>0){ctx.shadowColor='#fff';ctx.shadowBlur=26*scale;}
    const fill=e.hitFlash>0?'#fff':e.color,ink='#071017',outline='rgba(3,9,13,.92)';
    if(e.behavior==='bossMisread'||e.behavior==='bossWeather'){
      ctx.rotate(projectedAngle(faceAngle));if(e.behavior==='bossMisread')drawBossMisread(e,scale);else drawBossWeather(e,scale);
    }else if(e.behavior==='chase'){
      // Hunched raincoat stalker: head, coat, reaching arms, planted feet.
      ctx.strokeStyle=outline;ctx.lineWidth=8*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7*scale,14*scale);ctx.lineTo(-9*scale,28*scale);ctx.moveTo(7*scale,14*scale);ctx.lineTo(10*scale,28*scale);ctx.stroke();
      ctx.fillStyle=fill;ctx.strokeStyle=outline;ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo((-14+f.x*4)*scale,-7*scale);ctx.quadraticCurveTo(0,-17*scale,(14+f.x*4)*scale,-7*scale);ctx.lineTo(19*scale,20*scale);ctx.lineTo(-19*scale,20*scale);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle=fill;ctx.lineWidth=7*scale;ctx.beginPath();ctx.moveTo(f.x*4*scale,-2*scale);ctx.lineTo((f.x*25+perp.x*8)*scale,(f.y*17+perp.y*8)*scale);ctx.moveTo(-f.x*2*scale,1*scale);ctx.lineTo((f.x*22-perp.x*9)*scale,(f.y*17-perp.y*9)*scale);ctx.stroke();
      ctx.fillStyle='#18242a';ctx.strokeStyle=outline;ctx.lineWidth=3*scale;ctx.beginPath();ctx.arc(f.x*4*scale,-18*scale,10*scale,0,C.TAU);ctx.fill();ctx.stroke();ctx.fillStyle=e.accent;ctx.beginPath();ctx.arc((f.x*8)*scale,-19*scale,2.5*scale,0,C.TAU);ctx.fill();
    }else if(e.behavior==='shooter'){
      // Tall lamp-eyed marksman. Its visible gun arm always matches the locked firing line.
      ctx.strokeStyle=outline;ctx.lineWidth=7*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7*scale,13*scale);ctx.lineTo(-8*scale,29*scale);ctx.moveTo(7*scale,13*scale);ctx.lineTo(8*scale,29*scale);ctx.stroke();
      ctx.fillStyle=fill;ctx.strokeStyle=outline;ctx.lineWidth=3*scale;roundRectPath(-13*scale,-9*scale,26*scale,31*scale,7*scale);ctx.fill();ctx.stroke();
      ctx.fillStyle='#0b1820';ctx.strokeStyle=outline;ctx.beginPath();ctx.arc(0,-20*scale,12*scale,0,C.TAU);ctx.fill();ctx.stroke();ctx.fillStyle=e.accent;ctx.shadowColor=e.accent;ctx.shadowBlur=16*scale;ctx.beginPath();ctx.arc(f.x*4*scale,-20*scale,5.5*scale,0,C.TAU);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle=outline;ctx.lineWidth=10*scale;ctx.beginPath();ctx.moveTo(f.x*5*scale,-4*scale);ctx.lineTo(f.x*31*scale,f.y*26*scale-4*scale);ctx.stroke();ctx.strokeStyle=e.accent;ctx.lineWidth=4*scale;ctx.beginPath();ctx.moveTo(f.x*7*scale,-4*scale);ctx.lineTo(f.x*34*scale,f.y*28*scale-4*scale);ctx.stroke();
    }else if(e.behavior==='charger'){
      // Broad shield carrier. The shield face makes charge direction readable before motion.
      ctx.fillStyle='#172126';ctx.strokeStyle=outline;ctx.lineWidth=3*scale;ctx.beginPath();ctx.arc(-f.x*5*scale,-15*scale,10*scale,0,C.TAU);ctx.fill();ctx.stroke();roundRectPath(-15*scale,-9*scale,30*scale,34*scale,9*scale);ctx.fillStyle=fill;ctx.fill();ctx.stroke();
      ctx.save();ctx.translate(f.x*20*scale,f.y*17*scale+2*scale);ctx.rotate(Math.atan2(f.y,f.x));ctx.fillStyle=e.shield>0?e.accent:shade(e.color,-.16);ctx.strokeStyle=outline;ctx.lineWidth=4*scale;roundRectPath(-5*scale,-27*scale,17*scale,54*scale,7*scale);ctx.fill();ctx.stroke();ctx.restore();
      ctx.strokeStyle=outline;ctx.lineWidth=8*scale;ctx.beginPath();ctx.moveTo(-8*scale,20*scale);ctx.lineTo(-10*scale,31*scale);ctx.moveTo(8*scale,20*scale);ctx.lineTo(10*scale,31*scale);ctx.stroke();
    }else if(e.behavior==='orbiter'){
      // Floating bell-keeper: readable robed body with orbiting chime pieces.
      ctx.fillStyle=fill;ctx.strokeStyle=outline;ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(0,-12*scale);ctx.quadraticCurveTo(18*scale,2*scale,22*scale,24*scale);ctx.lineTo(-22*scale,24*scale);ctx.quadraticCurveTo(-18*scale,2*scale,0,-12*scale);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#101b24';ctx.beginPath();ctx.arc(0,-20*scale,10*scale,0,C.TAU);ctx.fill();ctx.stroke();ctx.fillStyle=e.accent;ctx.beginPath();ctx.arc(f.x*4*scale,-20*scale,3*scale,0,C.TAU);ctx.fill();
      ctx.strokeStyle=e.accent;ctx.lineWidth=2.5*scale;ctx.beginPath();ctx.ellipse(0,3*scale,34*scale,14*scale,game.time*1.8,0,C.TAU);ctx.stroke();for(let i=0;i<3;i++){const a=game.time*2*e.orbit+i*C.TAU/3,x=Math.cos(a)*34*scale,y=3*scale+Math.sin(a)*14*scale;ctx.fillStyle=e.accent;ctx.fillRect(x-3*scale,y-5*scale,6*scale,10*scale);}
    }else if(e.behavior==='blink'){
      // Thin broken humanoid with offset copies instead of an anonymous star.
      for(const offset of [-8,8]){ctx.globalAlpha=alpha*spawn*.18;ctx.strokeStyle=e.accent;ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(offset*scale,-27*scale);ctx.lineTo(offset*scale,19*scale);ctx.stroke();}ctx.globalAlpha=alpha*spawn;
      ctx.strokeStyle=outline;ctx.lineWidth=8*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-8*scale);ctx.lineTo(0,18*scale);ctx.moveTo(0,0);ctx.lineTo((f.x*20+perp.x*8)*scale,(f.y*15+perp.y*8)*scale);ctx.moveTo(0,18*scale);ctx.lineTo(-8*scale,31*scale);ctx.moveTo(0,18*scale);ctx.lineTo(9*scale,31*scale);ctx.stroke();
      ctx.strokeStyle=fill;ctx.lineWidth=4*scale;ctx.beginPath();ctx.moveTo(0,-8*scale);ctx.lineTo(0,18*scale);ctx.stroke();ctx.fillStyle=fill;ctx.strokeStyle=outline;ctx.lineWidth=3*scale;ctx.beginPath();ctx.arc(0,-20*scale,10*scale,0,C.TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#08141a';ctx.fillRect(-8*scale,-22*scale,16*scale,4*scale);
    }
    ctx.shadowBlur=0;ctx.restore();
    if(e.hp<e.maxHp&&!e.boss){const h=P(e.x,e.y,e.z+66),w=48*scale;ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(h.x-w*.5,h.y-3,w,5);ctx.fillStyle=e.color;ctx.fillRect(h.x-w*.5,h.y-3,w*C.clamp(e.hp/e.maxHp,0,1),5);}
  }

  function roundRectPath(x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
  function drawBossMisread(e,s){
    // A crooked municipal sign-creature, not an anonymous star. Its huge eye and
    // arrow arms make the dash direction readable even before the ground telegraph.
    const pulse=1+Math.sin(game.time*4)*.025,ink='#071017',panel=e.hitFlash>0?'#fff':e.color;
    ctx.save();ctx.scale(pulse,pulse);ctx.lineJoin='round';ctx.lineCap='round';
    // Two planted signpost legs.
    ctx.strokeStyle=ink;ctx.lineWidth=13*s;ctx.beginPath();ctx.moveTo(-23*s,30*s);ctx.lineTo(-27*s,66*s);ctx.moveTo(23*s,30*s);ctx.lineTo(28*s,66*s);ctx.stroke();
    ctx.strokeStyle=e.accent;ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(-23*s,30*s);ctx.lineTo(-27*s,66*s);ctx.moveTo(23*s,30*s);ctx.lineTo(28*s,66*s);ctx.stroke();
    // Arrow arms point along the boss's actual facing axis (parent context is rotated).
    for(const side of [-1,1]){
      ctx.save();ctx.translate(side*52*s,3*s);ctx.scale(side,1);ctx.fillStyle=e.accent;ctx.strokeStyle=ink;ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(-8*s,-10*s);ctx.lineTo(22*s,-10*s);ctx.lineTo(22*s,-22*s);ctx.lineTo(48*s,0);ctx.lineTo(22*s,22*s);ctx.lineTo(22*s,10*s);ctx.lineTo(-8*s,10*s);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    // Bent billboard body.
    ctx.fillStyle=panel;ctx.strokeStyle=ink;ctx.lineWidth=6*s;ctx.beginPath();ctx.moveTo(-60*s,-37*s);ctx.lineTo(48*s,-44*s);ctx.lineTo(64*s,29*s);ctx.lineTo(-51*s,39*s);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=shade(e.color,-.28);ctx.beginPath();ctx.moveTo(-43*s,-22*s);ctx.lineTo(39*s,-28*s);ctx.lineTo(48*s,20*s);ctx.lineTo(-35*s,26*s);ctx.closePath();ctx.fill();
    // One enormous tracking eye.
    const lookX=Math.cos(game.time*1.7+e.weakAngle)*6*s,lookY=Math.sin(game.time*1.3+e.weakAngle)*3*s;
    ctx.fillStyle='#fff4ef';ctx.strokeStyle=ink;ctx.lineWidth=4*s;ctx.beginPath();ctx.ellipse(4*s,-3*s,27*s,18*s,-.05,0,C.TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(4*s+lookX,-3*s+lookY,8*s,0,C.TAU);ctx.fill();ctx.fillStyle=e.accent;ctx.beginPath();ctx.arc(7*s+lookX,-6*s+lookY,2.6*s,0,C.TAU);ctx.fill();
    // Crooked direction bars sell the idea that it lies about where attacks are.
    ctx.strokeStyle=e.accent;ctx.lineWidth=4*s;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((-39+i*4)*s,(7+i*8)*s);ctx.lineTo((-8+i*5)*s,(3+i*7)*s);ctx.stroke();}
    // Phase fragments orbit like torn road signs.
    for(let i=0;i<e.phase+1;i++){const a=game.time*(.7+i*.08)+i*C.TAU/(e.phase+1),r=(80+i*10)*s;ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r*.55);ctx.rotate(a*.8);ctx.fillStyle=rgba(e.accent,.72);ctx.strokeStyle=ink;ctx.lineWidth=2*s;ctx.fillRect(-8*s,-5*s,16*s,10*s);ctx.strokeRect(-8*s,-5*s,16*s,10*s);ctx.restore();}
    ctx.restore();
  }
  function drawBossWeather(e,s){
    // The storm has a body: a central eye, a raincoat-shaped cloud mass, lightning
    // arms, and streaming rain legs. The silhouette remains readable in grayscale.
    const ink='#071017',body=e.hitFlash>0?'#fff':e.color,sway=Math.sin(game.time*1.8)*4*s;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    // Rain legs visibly connect the hovering body to the ground.
    ctx.strokeStyle=ink;ctx.lineWidth=12*s;ctx.beginPath();ctx.moveTo(-25*s,34*s);ctx.lineTo(-34*s,76*s);ctx.moveTo(25*s,34*s);ctx.lineTo(35*s,76*s);ctx.stroke();
    ctx.strokeStyle='#a9d8ff';ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(-25*s,34*s);ctx.lineTo(-34*s,76*s);ctx.moveTo(25*s,34*s);ctx.lineTo(35*s,76*s);ctx.stroke();
    // Lightning arms indicate the active facing direction inherited from the parent.
    for(const side of [-1,1]){ctx.save();ctx.translate(side*58*s,sway*.25);ctx.scale(side,1);ctx.strokeStyle=ink;ctx.lineWidth=13*s;ctx.beginPath();ctx.moveTo(-8*s,-6*s);ctx.lineTo(14*s,6*s);ctx.lineTo(5*s,22*s);ctx.lineTo(38*s,38*s);ctx.stroke();ctx.strokeStyle=e.accent;ctx.lineWidth=5*s;ctx.stroke();ctx.restore();}
    // Unified storm-body contour instead of a pile of unrelated circles.
    ctx.fillStyle=body;ctx.strokeStyle=ink;ctx.lineWidth=7*s;ctx.beginPath();ctx.moveTo(-66*s,20*s);ctx.bezierCurveTo(-82*s,-2*s,-68*s,-35*s,-38*s,-35*s);ctx.bezierCurveTo(-30*s,-64*s,11*s,-68*s,27*s,-42*s);ctx.bezierCurveTo(60*s,-51*s,78*s,-20*s,65*s,2*s);ctx.bezierCurveTo(83*s,24*s,58*s,48*s,32*s,43*s);ctx.lineTo(-36*s,43*s);ctx.bezierCurveTo(-61*s,48*s,-78*s,38*s,-66*s,20*s);ctx.closePath();ctx.fill();ctx.stroke();
    // Layered cloud highlights create volume without sacrificing the silhouette.
    ctx.fillStyle=rgba('#d9ebff',.32);ctx.beginPath();ctx.arc(-31*s,-22*s,24*s,0,C.TAU);ctx.arc(6*s,-35*s,30*s,0,C.TAU);ctx.arc(38*s,-15*s,24*s,0,C.TAU);ctx.fill();
    // Central eye/face.
    ctx.fillStyle='#eef7ff';ctx.strokeStyle=ink;ctx.lineWidth=5*s;ctx.beginPath();ctx.ellipse(4*s,2*s,29*s,21*s,0,0,C.TAU);ctx.fill();ctx.stroke();const pupilX=Math.cos(game.time*1.2+e.weakAngle)*7*s,pupilY=Math.sin(game.time*1.5+e.weakAngle)*4*s;ctx.fillStyle='#0a1520';ctx.beginPath();ctx.arc(4*s+pupilX,2*s+pupilY,9*s,0,C.TAU);ctx.fill();ctx.fillStyle=e.accent;ctx.beginPath();ctx.arc(8*s+pupilX,-2*s+pupilY,3*s,0,C.TAU);ctx.fill();
    // Rain mouth and phase lightning crown.
    ctx.strokeStyle='#bedfff';ctx.lineWidth=3*s;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo((i*9-2)*s,27*s);ctx.lineTo((i*9+2)*s,38*s);ctx.stroke();}
    for(let i=0;i<e.phase;i++){const x=(-22+i*22)*s;ctx.strokeStyle=e.accent;ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(x,-51*s);ctx.lineTo((x+7*s),-68*s);ctx.lineTo((x-1*s),-68*s);ctx.lineTo((x+10*s),-86*s);ctx.stroke();}
    // Rotating pressure rings remain as a secondary effect, not the body itself.
    for(let i=0;i<e.phase;i++){ctx.strokeStyle=rgba('#a8d7ff',.35);ctx.lineWidth=2*s;ctx.beginPath();ctx.ellipse(0,3*s,(88+i*14)*s,(48+i*8)*s,0,game.time*.7+i,game.time*.7+i+2.2);ctx.stroke();}
    ctx.restore();
  }

  function drawPlayer(p,alpha=1,echo=false){
    const z=p.z||0,s=camera.zoom*1.3,f=worldVectorToScreen(Math.cos(p.angle||0),Math.sin(p.angle||0)),perp={x:-f.y,y:f.x},move=p.moveAmount||0,walk=p.walkPhase||0,gait=Math.sin(walk)*Math.min(1,move),bob=Math.abs(Math.sin(walk))*2.4*s*move,dash=p.dashStretch||0,recoil=p.recoil||0,ground=P(p.x,p.y,z+1),base=P(p.x,p.y,z+31),accent=echo?'#8ffff0':currentStage().palette.accent,wet=p.wetness??.7,coat=echo?'rgba(104,247,230,.58)':p.hurtFlash>0?'#ffffff':'#19313b';
    const q={x:base.x+f.x*(dash*7-recoil*3)*s,y:base.y-bob+f.y*(dash*5-recoil*3)*s},bodyWide=(16+dash*5)*s;
    drawShadow(p.x,p.y,z,27+dash*8,echo?.2:.46);drawGroundEllipse(p.x,p.y,z,29+dash*5,27,echo?'#8ffff0':'#fff0a1',echo?.26:.58+(p.interactGlow||0)*.22,2.6);
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.lineJoin='round';if(!echo&&p.hurtFlash>0){ctx.shadowColor='#ffffff';ctx.shadowBlur=30*s;}else{ctx.shadowColor=accent;ctx.shadowBlur=(echo?13:7+(p.interactGlow||0)*20)*s;}
    // Feet visibly plant, alternate, and drag spray through the actual collision point.
    const footA={x:ground.x+perp.x*7*s+f.x*gait*8*s,y:ground.y+perp.y*7*s+f.y*gait*5*s},footB={x:ground.x-perp.x*7*s-f.x*gait*8*s,y:ground.y-perp.y*7*s-f.y*gait*5*s};
    ctx.strokeStyle='#061017';ctx.lineWidth=9*s;ctx.beginPath();ctx.moveTo(q.x+perp.x*7*s,q.y+12*s+perp.y*4*s);ctx.lineTo(footA.x,footA.y);ctx.moveTo(q.x-perp.x*7*s,q.y+12*s-perp.y*4*s);ctx.lineTo(footB.x,footB.y);ctx.stroke();ctx.strokeStyle=echo?'#8cece4':'#b9c9c8';ctx.lineWidth=3.2*s;ctx.stroke();ctx.strokeStyle='#e8f7f1';ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(footA.x-perp.x*5*s,footA.y-perp.y*5*s);ctx.lineTo(footA.x+f.x*7*s,footA.y+f.y*4*s);ctx.moveTo(footB.x+perp.x*5*s,footB.y+perp.y*5*s);ctx.lineTo(footB.x+f.x*7*s,footB.y+f.y*4*s);ctx.stroke();
    // Raincoat silhouette: broad hem, cinched shoulders, bright wet edge.
    ctx.fillStyle=coat;ctx.strokeStyle='#061017';ctx.lineWidth=3.5*s;ctx.beginPath();ctx.moveTo(q.x-perp.x*11*s-f.x*5*s,q.y-9*s-perp.y*11*s-f.y*5*s);ctx.quadraticCurveTo(q.x-f.x*5*s,q.y-16*s-f.y*5*s,q.x+perp.x*11*s-f.x*5*s,q.y-9*s+perp.y*11*s-f.y*5*s);ctx.lineTo(q.x+perp.x*bodyWide+f.x*4*s,q.y+19*s+perp.y*bodyWide+f.y*4*s);ctx.lineTo(q.x-perp.x*bodyWide+f.x*4*s,q.y+19*s-perp.y*bodyWide+f.y*4*s);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=rgba('#bfeef2',.18+.28*wet);ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(q.x-perp.x*12*s,q.y-7*s-perp.y*12*s);ctx.lineTo(q.x-perp.x*bodyWide,q.y+17*s-perp.y*bodyWide);ctx.stroke();
    // Hood, face, and gaze produce a specific person rather than a board-game token.
    const head={x:q.x+f.x*4*s,y:q.y-23*s+f.y*3*s};ctx.fillStyle=echo?'#bafff7':'#e9d7ba';ctx.strokeStyle='#061017';ctx.lineWidth=3*s;ctx.beginPath();ctx.arc(head.x,head.y,11.5*s,0,C.TAU);ctx.fill();ctx.stroke();ctx.strokeStyle=echo?'#9ffff2':'#203943';ctx.lineWidth=6*s;ctx.beginPath();ctx.arc(head.x-f.x*2*s,head.y-f.y*2*s,13*s,Math.atan2(f.y,f.x)+.35,Math.atan2(f.y,f.x)+Math.PI*1.65);ctx.stroke();ctx.fillStyle='#071017';ctx.beginPath();ctx.arc(head.x+f.x*7*s+perp.x*2*s,head.y+f.y*4*s+perp.y*2*s,2.2*s,0,C.TAU);ctx.fill();
    // Scarf and coat tails expose speed even when the player is moving diagonally.
    const scarf={x:q.x-f.x*6*s-perp.x*9*s,y:q.y-9*s-f.y*4*s-perp.y*9*s},flutter=(Math.sin(game.time*9+p.x*.01)*5+move*5)*s;ctx.strokeStyle=accent;ctx.lineWidth=5*s;ctx.beginPath();ctx.moveTo(scarf.x,scarf.y);ctx.bezierCurveTo(scarf.x-f.x*(18+move*9)*s+perp.x*flutter,scarf.y-f.y*15*s+perp.y*flutter,scarf.x-f.x*(35+dash*20)*s-perp.x*flutter*.3,scarf.y-f.y*19*s-perp.y*flutter*.3,scarf.x-f.x*(43+dash*22)*s,scarf.y-f.y*22*s);ctx.stroke();
    // The weapon, recoil, muzzle flare, and blade sweep all share the authoritative aim.
    const reach=(39-recoil*7)*s,hand={x:q.x+f.x*10*s+perp.x*5*s,y:q.y-2*s+f.y*10*s+perp.y*5*s},muzzle={x:q.x+f.x*reach+perp.x*5*s,y:q.y-2*s+f.y*reach+perp.y*5*s};ctx.strokeStyle='#061017';ctx.lineWidth=10*s;ctx.beginPath();ctx.moveTo(q.x+perp.x*4*s,q.y-2*s+perp.y*4*s);ctx.lineTo(hand.x,hand.y);ctx.stroke();ctx.strokeStyle=echo?'#b8fff7':'#fff1ad';ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(hand.x,hand.y);ctx.lineTo(muzzle.x,muzzle.y);ctx.stroke();ctx.fillStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=16*s;ctx.beginPath();ctx.arc(muzzle.x,muzzle.y,3.4*s,0,C.TAU);ctx.fill();
    if(!echo&&(p.muzzleTime||0)>0){const t=(p.muzzleTime/.085),sd=worldVectorToScreen(Math.cos(p.angle),Math.sin(p.angle));ctx.fillStyle='#fffbe7';ctx.shadowColor='#ffe18d';ctx.shadowBlur=28*s;ctx.beginPath();ctx.moveTo(muzzle.x+sd.x*23*s*t,muzzle.y+sd.y*23*s*t);ctx.lineTo(muzzle.x+perp.x*8*s*t,muzzle.y+perp.y*8*s*t);ctx.lineTo(muzzle.x-perp.x*8*s*t,muzzle.y-perp.y*8*s*t);ctx.closePath();ctx.fill();}
    if(!echo&&(p.bladeTime||0)>0){const t=C.clamp(1-p.bladeTime/.24,0,1),sweep=C.lerp(-1.2,1.05,t),a=(p.angle||0)+sweep,bladeDir=worldVectorToScreen(Math.cos(a),Math.sin(a)),hilt={x:q.x+f.x*9*s,y:q.y+f.y*8*s},tip={x:hilt.x+bladeDir.x*50*s,y:hilt.y+bladeDir.y*50*s};ctx.strokeStyle='#061017';ctx.lineWidth=9*s;ctx.beginPath();ctx.moveTo(hilt.x,hilt.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.strokeStyle=p.bladeStep===2?'#ffe59b':'#b9fff5';ctx.lineWidth=4*s;ctx.stroke();}
    ctx.shadowBlur=0;ctx.restore();
    if(!echo&&p.homeShield>0)drawGroundEllipse(p.x,p.y,z,39,39,'#ffe8a0',.7+.2*Math.sin(game.time*3),2.5);
  }

  function drawDecoy(d){const a=d.life/d.max,q=P(d.x,d.y,d.z+24);ctx.save();ctx.globalAlpha=a*.38;ctx.translate(q.x,q.y);ctx.rotate(game.time*3);ctx.strokeStyle=d.color;ctx.lineWidth=3;ctx.beginPath();ctx.rect(-18*camera.zoom,-18*camera.zoom,36*camera.zoom,36*camera.zoom);ctx.stroke();ctx.restore();}

  function drawBullets(){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';for(const b of game.bullets){if(!visiblePoint(b.x,b.y,b.z,80))continue;const p=P(b.x,b.y,b.z),tail=P(b.x-b.vx*(b.team==='enemy'?.032:.044),b.y-b.vy*(b.team==='enemy'?.032:.044),b.z),s=camera.zoom,sd=C.norm(p.x-tail.x,p.y-tail.y);ctx.shadowColor=b.color;ctx.shadowBlur=(b.team==='enemy'?10:17)*s;ctx.strokeStyle=rgba(b.color,b.team==='enemy'?.76:.94);ctx.lineWidth=(b.r*(b.team==='enemy'?.82:1.18))*s;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.shadowBlur=0;
      if(b.team==='enemy'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(sd.y,sd.x));ctx.fillStyle=b.rain?'#d8f4ff':b.color;ctx.strokeStyle='rgba(244,252,255,.88)';ctx.lineWidth=1.4*s;ctx.beginPath();if(b.rain){ctx.moveTo(10*s,0);ctx.lineTo(-5*s,-5*s);ctx.lineTo(-8*s,0);ctx.lineTo(-5*s,5*s);}else{ctx.arc(0,0,b.r*.7*s,0,C.TAU);}ctx.fill();ctx.stroke();ctx.restore();}
      else{ctx.fillStyle='#fffde8';ctx.beginPath();ctx.arc(p.x,p.y,b.r*.55*s,0,C.TAU);ctx.fill();ctx.strokeStyle=b.echo?'#8ffff0':'#ffe78f';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(p.x-sd.x*8*s,p.y-sd.y*8*s);ctx.lineTo(p.x+sd.x*6*s,p.y+sd.y*6*s);ctx.stroke();}
    }
    ctx.restore();
  }

  function drawCombatFx(){
    for(const s of game.slashes){const a=s.life/s.max,color=s.step===2?'#ffcf7b':'#effff9';ctx.save();ctx.globalAlpha=a;ctx.shadowColor=s.step===2?'#ffad56':'#8ffff0';ctx.shadowBlur=22;drawWorldArc(s.x,s.y,s.z,s.radius,s.angle-s.arc*.5,s.angle+s.arc*.5,color,(5+s.step*2.4)*camera.zoom,rgba(s.step===2?'#ffd06f':'#8ffff0',.08*a));ctx.restore();}
    for(const r of game.rings){const p=P(r.x,r.y,r.z),t=1-r.life/r.max,rad=(r.r+220*t)*camera.zoom;ctx.save();ctx.globalAlpha=(1-t)*.72;ctx.translate(p.x,p.y);ctx.scale(1,.48);ctx.strokeStyle=r.color;ctx.lineWidth=(2+4*(1-t))*camera.zoom;ctx.beginPath();ctx.arc(0,0,rad,0,C.TAU);ctx.stroke();ctx.restore();}
    for(const c of game.chains){const a=P(c.x1,c.y1,c.z1),b=P(c.x2,c.y2,c.z2),t=c.life/c.max;ctx.strokeStyle=rgba(c.color,t);ctx.lineWidth=3*camera.zoom;ctx.shadowColor=c.color;ctx.shadowBlur=16;ctx.beginPath();ctx.moveTo(a.x,a.y);for(let i=1;i<5;i++){const u=i/5,j=Math.sin(game.time*71+i*19+c.x1*.01)*6*t,x=C.lerp(a.x,b.x,u)+j,y=C.lerp(a.y,b.y,u)-j*.65;ctx.lineTo(x,y);}ctx.lineTo(b.x,b.y);ctx.stroke();ctx.shadowBlur=0;}
    for(const p of game.particles){if(!visiblePoint(p.x,p.y,p.z,80))continue;const q=P(p.x,p.y,p.z),a=C.clamp(p.life/p.max,0,1),s=p.size*camera.zoom;ctx.fillStyle=rgba(p.color,a);if(p.kind==='water'){ctx.beginPath();ctx.ellipse(q.x,q.y,s*.72,s,0,0,C.TAU);ctx.fill();}else if(p.kind==='muzzle'){const n=worldVectorToScreen(p.vx,p.vy);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(n.y,n.x));ctx.fillRect(-s*1.4,-s*.35,s*2.8,s*.7);ctx.restore();}else{ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillRect(-s,-s*.35,s*2,s*.7);ctx.restore();}}
  }

  function drawLightGlow(){
    ctx.save();ctx.globalCompositeOperation='lighter';for(const l of world.lights){if(!visiblePoint(l.x,l.y,l.z,l.r))continue;const p=P(l.x,l.y,l.z),r=l.r*camera.zoom,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,rgba(l.color,.12));g.addColorStop(1,rgba(l.color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,C.TAU);ctx.fill();}ctx.restore();
  }

  function carveLight(lctx,x,y,r,intensity=1){const g=lctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${intensity})`);g.addColorStop(.38,`rgba(0,0,0,${intensity*.83})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.beginPath();lctx.arc(x,y,r,0,C.TAU);lctx.fill();}
  function drawLighting(){
    const clarity=game.player?C.clamp(game.player.clarity/game.player.maxClarity,0,1):1,stage=game.player?game.stage:0,dark=.25+stage*.018+(1-clarity)*.24;
    lightCtx.clearRect(0,0,view.w,view.h);lightCtx.globalCompositeOperation='source-over';lightCtx.fillStyle=`rgba(2,8,13,${dark})`;lightCtx.fillRect(0,0,view.w,view.h);lightCtx.globalCompositeOperation='destination-out';
    for(const l of world.lights){if(!visiblePoint(l.x,l.y,l.z,l.r))continue;const p=P(l.x,l.y,l.z);carveLight(lightCtx,p.x,p.y,l.r*camera.zoom,l.safe?1:.8);}
    if(game.player){const p=P(game.player.x,game.player.y,game.player.z+28);carveLight(lightCtx,p.x,p.y,(game.player.focusTime>0?200:135)*camera.zoom,.68);}
    if(careAvailable()){const c=currentCare(),p=P(c.x,c.y,D.groundZ(world,c.x,c.y)+30);carveLight(lightCtx,p.x,p.y,185*camera.zoom,.8);}
    lightCtx.globalCompositeOperation='source-over';ctx.drawImage(lightCanvas,0,0,view.w,view.h);
  }

  function drawRain(){
    const amount=Math.floor(74+game.weatherLevel*58),speed=520+game.stage*38;ctx.save();ctx.lineCap='round';for(let i=0;i<amount;i++){const x=((i*91.37+game.time*170)% (view.w+260))-130,y=((i*151.11+game.time*speed)% (view.h+220))-110,len=9+(i%7)*2;ctx.strokeStyle=`rgba(155,218,240,${.055+(i%5)*.012})`;ctx.lineWidth=i%9===0?1.6:1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+len);ctx.stroke();}ctx.restore();
  }

  function drawPostFx(){
    const clarity=game.player?C.clamp(game.player.clarity/game.player.maxClarity,0,1):1,low=1-clarity;
    const g=ctx.createRadialGradient(view.w*.5,view.h*.47,Math.min(view.w,view.h)*.22,view.w*.5,view.h*.5,Math.max(view.w,view.h)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,2,5,${.24+low*.28})`);ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);
    if(low>.2){ctx.save();ctx.globalAlpha=(low-.2)*.34;for(let i=0;i<12;i++){const y=((i*73+game.time*83)%view.h)|0,h=1+(i%3);ctx.fillStyle=i%2?'#ff5577':'#63dff0';ctx.fillRect((i%2?-1:1)*low*8,y,view.w,h);}ctx.restore();}
    if(game.player?.focusTime>0){ctx.strokeStyle=rgba('#bc8cff',.35+Math.sin(game.time*7)*.12);ctx.lineWidth=8;ctx.strokeRect(4,4,view.w-8,view.h-8);}
    if(game.player?.hurtFlash>0){const t=C.clamp(game.player.hurtFlash/.25,0,1),d=worldVectorToScreen(Math.cos(game.player.hurtAngle),Math.sin(game.player.hurtAngle)),cx=view.w*.5+d.x*view.w*.42,cy=view.h*.5+d.y*view.h*.42,g2=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(view.w,view.h)*.38);g2.addColorStop(0,`rgba(255,247,224,${.28*t})`);g2.addColorStop(.22,`rgba(255,92,123,${.16*t})`);g2.addColorStop(1,'rgba(255,92,123,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,view.w,view.h);ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(d.y,d.x)+Math.PI*.5);ctx.strokeStyle=`rgba(255,250,234,${.72*t})`;ctx.lineWidth=4+5*t;ctx.beginPath();ctx.arc(0,0,34+22*(1-t),-.9,.9);ctx.stroke();ctx.restore();}
    if(game.stage===5&&game.boss){const pulse=Math.max(0,Math.sin(game.time*.78-1.4));if(pulse>.92){ctx.fillStyle=`rgba(197,225,255,${(pulse-.92)*1.7})`;ctx.fillRect(0,0,view.w,view.h);}}
  }

  function render(){
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.fillStyle='#071017';ctx.fillRect(0,0,view.w,view.h);
    const sky=ctx.createLinearGradient(0,0,0,view.h);sky.addColorStop(0,'#0b1821');sky.addColorStop(.58,'#10252b');sky.addColorStop(1,'#071116');ctx.fillStyle=sky;ctx.fillRect(0,0,view.w,view.h);
    drawSurfaces();game.weather?.drawGround();drawDecor();drawLightGlow();game.weather?.drawBack();renderWorldObjects();drawLighting();drawPostFx();if(game.weather){game.weather.drawFront();game.weather.drawPost();}else drawRain();
    // Gameplay information is rendered above architecture and weather. A threat may hide in the fiction; its attack cannot hide from the player.
    drawRouteGuidance();drawTelegraphs();drawAimGuide();drawBullets();drawCombatFx();drawScreenGuidance();
  }

  function aimGuideSnapshot(){
    const p=game.player,a=traceAimPoint();if(!p||!a)return null;
    const muzzleWorld={x:p.x+a.dx*28,y:p.y+a.dy*28,z:p.z+27},muzzleScreen=worldToScreen(muzzleWorld.x,muzzleWorld.y,muzzleWorld.z),reticleScreen=worldToScreen(a.x,a.y,D.groundZ(world,a.x,a.y)+24),screenDirection=worldVectorToScreen(a.dx,a.dy);
    return {x:a.x,y:a.y,dx:a.dx,dy:a.dy,target:a.target?{id:a.target.id,name:a.target.name}:null,muzzleWorld,muzzleScreen,reticleScreen,screenDirection};
  }

  function snapshot(){
    const care=currentStage()?.care,aimGuide=aimGuideSnapshot();
    return {
      version:D.VERSION,mode:game.mode,time:game.time,runTime:game.runTime,stage:game.stage,stageName:currentStage()?.name,phase:game.phase,score:Math.floor(game.score),style:Math.floor(game.style),rank:getRank(game.style).rank,combat:{shots:game.shots,hits:game.hits,kills:game.kills,damageTaken:game.damageTaken,hitstop:game.hitstop,scheduled:game.scheduled.length},
      player:game.player?{x:game.player.x,y:game.player.y,z:game.player.z,clarity:game.player.clarity,warmth:game.player.warmth,focusCd:game.player.focusCd,shotCd:game.player.shotCd,bladeCd:game.player.bladeCd,bladeTime:game.player.bladeTime,dashCd:game.player.dashCd,dashTime:game.player.dashTime,alive:game.player.alive,angle:game.player.angle,aimAngle:game.player.aimAngle,aimX:game.player.aimX,aimY:game.player.aimY,aimTargetX:game.player.aimTargetX,aimTargetY:game.player.aimTargetY,screen:worldToScreen(game.player.x,game.player.y,game.player.z),valid:canOccupy(game.player,game.player.x,game.player.y,true),stuckTime:game.player.stuckTime}:null,
      enemies:game.enemies.filter(e=>!e.dead).map(e=>({id:e.id,type:e.type,name:e.name,x:e.x,y:e.y,z:e.z,hp:e.hp,maxHp:e.maxHp,boss:e.boss,phase:e.phase,state:e.state,screen:worldToScreen(e.x,e.y,e.z+e.r)})),
      bullets:game.bullets.length,bulletData:game.bullets.slice(0,24).map(b=>({team:b.team,x:b.x,y:b.y,z:b.z,vx:b.vx,vy:b.vy,r:b.r,echo:!!b.echo,screen:worldToScreen(b.x,b.y,b.z),screenTail:worldToScreen(b.x-b.vx*.02,b.y-b.vy*.02,b.z)})),enemyBullets:game.bullets.filter(b=>b.team==='enemy').length,echoBullets:game.bullets.filter(b=>b.echo).length,telegraphs:game.telegraphs.length,pickups:game.pickups.map(o=>({type:o.type,x:o.x,y:o.y,z:o.z,amount:o.amount})),companion:game.companion?{x:game.companion.x,y:game.companion.y,z:game.companion.z,alpha:game.companion.alpha}:null,care:care?{x:care.x,y:care.y,available:careAvailable(),screen:worldToScreen(care.x,care.y,D.groundZ(world,care.x,care.y)+20)}:null,
      finish:currentStage()?.finish?{...currentStage().finish,screen:worldToScreen(currentStage().finish.x,currentStage().finish.y,10)}:null,
      abilities:[...game.abilities],gatesOpen:[...game.gatesOpen],completed:game.completed,pie:game.pie,objective:dom.objective.textContent,aimGuide,route:{target:game.routeTarget?{...game.routeTarget}:null,path:game.routePath.map(p=>({x:p.x,y:p.y})),label:game.routeLabel},camera:{x:camera.x,y:camera.y,z:camera.z,zoom:camera.zoom},sheltered:game.sheltered,weather:game.weather?.snapshot()||null,perf:perfStats(),input:{lastDevice:input.lastDevice,buffers:{...input.buffers}}
    };
  }

  window.__POTLIGHT__={
    version:D.VERSION,snapshot,worldToScreen:(x,y,z=0)=>worldToScreen(x,y,z),screenToWorld:(x,y,z=0)=>screenToWorld(x,y,z),
    start:startRun,restart:restartCheckpoint,pause:pauseGame,resume:resumeGame,
    qa:QA?{
      setInvulnerable(v=true){game.qaInvulnerable=!!v;},
      soften(){game.qaInvulnerable=true;if(game.player){game.player.warmth=100;game.player.clarity=100;}},
      clearEnemies(){for(const e of [...game.enemies])if(!e.dead)killEnemy(e);},
      clearProjectiles(){game.bullets.length=0;game.telegraphs.length=0;},
      teleport(x,y){if(game.player){game.player.x=x;game.player.y=y;game.player.z=D.groundZ(world,x,y);game.player.vx=0;game.player.vy=0;game.player.lastSafeX=x;game.player.lastSafeY=y;unstickEntity(game.player,true);camera.x=game.player.x;camera.y=game.player.y;camera.z=game.player.z;game.routeClock=0;}},
      setStage(i){i=C.clamp(Math.floor(i)||0,0,D.STAGES.length-1);game.enemies.length=0;game.bullets.length=0;game.pickups.length=0;game.telegraphs.length=0;game.scheduled.length=0;game.careRead[i]=false;game.stage=i;game.phase='care';game.checkpoint=i;game.weatherLevel=D.STAGES[i].weather?.rain??.85;game.player.x=D.STAGES[i].entry.x;game.player.y=D.STAGES[i].entry.y;game.player.z=D.groundZ(world,game.player.x,game.player.y);game.player.vx=0;game.player.vy=0;game.player.lastSafeX=game.player.x;game.player.lastSafeY=game.player.y;camera.x=game.player.x;camera.y=game.player.y;camera.z=game.player.z;game.routeClock=0;Audio.setWeather(game.weatherLevel,D.STAGES[i].weather?.wind||0);updateObjective();},
      setPhase(v){game.phase=v;game.routeClock=0;updateObjective();},
      auditCollisions(){
        if(!game.player)return {pass:false,tested:0,skipped:0,blockedApproaches:0,failures:[{reason:'no player'}]};
        const p=game.player,save={x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,lastSafeX:p.lastSafeX,lastSafeY:p.lastSafeY,stuckTime:p.stuckTime},radius=collisionRadius(p,true),failures=[];let tested=0,skipped=0,blockedApproaches=0;
        const rects=[...world.walls.map(r=>({r,kind:r.kind||'wall'})),...(world.colliders||[]).map(r=>({r,kind:r.source||'prop'})),...world.destructibles.filter(r=>!r.dead).map(r=>({r,kind:r.kind||'breakable'}))];
        const sides=[
          {name:'left',sx:r=>r.x-radius-6,sy:r=>r.y+r.h*.5,ix:1,iy:0},
          {name:'right',sx:r=>r.x+r.w+radius+6,sy:r=>r.y+r.h*.5,ix:-1,iy:0},
          {name:'top',sx:r=>r.x+r.w*.5,sy:r=>r.y-radius-6,ix:0,iy:1},
          {name:'bottom',sx:r=>r.x+r.w*.5,sy:r=>r.y+r.h+radius+6,ix:0,iy:-1}
        ];
        for(const item of rects){for(const side of sides){
          const x=side.sx(item.r),y=side.sy(item.r),z=D.groundZ(world,x,y);
          // A low wall beside a high roof/ramp is intentionally irrelevant at this elevation.
          if(!wallRelevantAt(item.r,z)){skipped++;continue;}
          p.x=x;p.y=y;p.z=z;p.vx=p.vy=0;p.lastSafeX=x;p.lastSafeY=y;p.stuckTime=0;
          if(!canOccupy(p,x,y,true)){skipped++;continue;}
          const before={x,y};
          const approach=moveEntity(p,side.ix*(radius+48),side.iy*(radius+48),true),contact={x:p.x,y:p.y};
          const relevant=wallRelevantAt(item.r,D.groundZ(world,p.x,p.y));
          const valid=canOccupy(p,p.x,p.y,true),penetrated=relevant&&C.circleRect(p.x,p.y,radius,item.r);
          // Return to the exact valid starting point instead of overshooting into an unrelated
          // world boundary. This is a direct test that backing away from contact is never sticky.
          const reverse=moveEntity(p,before.x-p.x,before.y-p.y,true),returned=C.dist(p.x,p.y,before.x,before.y)<1.6&&canOccupy(p,p.x,p.y,true);
          if(approach<.8){blockedApproaches++;continue;}
          tested++;
          if(!valid||penetrated||!returned)failures.push({kind:item.kind,stage:item.r.stage,side:side.name,valid,penetrated,returned,approach,reverse,contact,afterReverse:{x:p.x,y:p.y},rect:{x:item.r.x,y:item.r.y,w:item.r.w,h:item.r.h,z:item.r.z||0}});
        }}
        Object.assign(p,save);return {pass:failures.length===0,tested,skipped,blockedApproaches,failures};
      },
      probeMove(x,y,dx,dy){
        if(!game.player)return {pass:false,reason:'no player'};
        const p=game.player,save={x:p.x,y:p.y,z:p.z,vx:p.vx,vy:p.vy,lastSafeX:p.lastSafeX,lastSafeY:p.lastSafeY,stuckTime:p.stuckTime};
        p.x=x;p.y=y;p.z=D.groundZ(world,x,y);p.vx=p.vy=0;p.lastSafeX=x;p.lastSafeY=y;p.stuckTime=0;
        const startValid=canOccupy(p,p.x,p.y,true);if(!startValid)unstickEntity(p,true);
        const start={x:p.x,y:p.y},distance=moveEntity(p,dx,dy,true),end={x:p.x,y:p.y},valid=canOccupy(p,p.x,p.y,true);
        const reversed=moveEntity(p,start.x-p.x,start.y-p.y,true),returnError=C.dist(p.x,p.y,start.x,start.y),returned=returnError<1.6&&canOccupy(p,p.x,p.y,true);
        const result={pass:valid&&returned,startValid,start,end,distance,reversed,returnError,valid,returned};Object.assign(p,save);return result;
      },
      readCare(){if(careAvailable())readCare(currentCare());},
      finish(){if(game.stage===5){game.phase='finish';game.enemies.length=0;game.boss=null;game.qaInvulnerable=true;updateObjective();}},
      giveAll(){for(const v of Object.keys(D.VERBS))game.abilities.add(v);game.player.homeShield=1;renderVerbs();},
      setWeather(level=.9){game.weatherLevel=C.clamp(+level||0,0,1);Audio.setWeather(game.weatherLevel,currentStage().weather?.wind||0);return game.weather?.snapshot()||null;},
      spawnEnemy(type='drifter',x=null,y=null){if(!D.ENEMIES[type]||!game.player)return null;const pos={x:Number.isFinite(x)?x:game.player.x+260,y:Number.isFinite(y)?y:game.player.y};return spawnEnemy(type,pos,difficulty().hp).id;},
      spawnPickup(type='warmth'){if(game.player)spawnPickup(game.player.x+70,game.player.y,game.player.z,type,12,1);return game.pickups.length;},
      setHitstop(seconds=.1){game.hitstop=C.clamp(+seconds||0,0,.5);return game.hitstop;},
      aimAt(x,y){if(!game.player)return null;const n=C.norm(x-game.player.x,y-game.player.y);game.player.aimX=n.x;game.player.aimY=n.y;game.player.aimAngle=Math.atan2(n.y,n.x);game.player.angle=game.player.aimAngle;game.player.aimTargetX=x;game.player.aimTargetY=y;return {x:n.x,y:n.y};},
      destructibles(){return world.destructibles.map((d,i)=>({i,x:d.x,y:d.y,w:d.w,h:d.h,hp:d.hp,maxHp:d.maxHp,dead:d.dead,stage:d.stage}));},
      stepTicks(count=1){count=C.clamp(Math.floor(count)||1,1,240);for(let i=0;i<count;i++)update(1/120);return snapshot();},
      getPerfStats(){return perfStats();},
      resetPerf(){game.perf.samples.length=0;game.perf.longFrames=0;game.perf.maxMs=0;game.perf.lastFrame=performance.now();return perfStats();},
      benchmarkRender(frames=90){
        frames=Math.max(1,Math.min(360,Math.floor(frames)||90));
        const samples=[];
        for(let i=0;i<frames;i++){
          const started=performance.now();
          render();
          samples.push(performance.now()-started);
        }
        const sorted=samples.slice().sort((a,b)=>a-b);
        const total=samples.reduce((sum,value)=>sum+value,0);
        const percentile=q=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*q))];
        const average=total/samples.length;
        return {frames,averageMs:average,p50Ms:percentile(.5),p95Ms:percentile(.95),maxMs:sorted[sorted.length-1],equivalentFps:average>0?1000/average:null};
      }
    }:null
  };

  // Fix old asynchronous enemy callbacks after a checkpoint reset by making membership the source of truth.
  window.__potEnemyActive=e=>game.enemies.includes(e)&&!e.dead&&game.mode==='play';

  if(window.PotWeather)game.weather=window.PotWeather.create({ctx,C,P,visiblePoint,groundZ:(x,y)=>D.groundZ(world,x,y),rgba,view,camera,world,currentStage});

  Audio.setEnabled(settings.audio,false);
  setMode('title');
  requestAnimationFrame(fixedLoop);
})();
