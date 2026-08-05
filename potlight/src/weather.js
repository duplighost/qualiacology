(function(global){
  'use strict';

  const VERSION='1.0.0';
  const BUDGETS=Object.freeze({
    farStreaks:80,
    midStreaks:56,
    nearStreaks:28,
    ripples:48,
    spray:96,
    runoffAnchors:48,
    mistBanks:10,
    lensDrops:8,
    maxAutoImpactsPerSecond:20,
    maxAutoImpactsPerUpdate:3
  });

  function create(options={}){
    const ctx=options.ctx;
    const C=options.C||options.core;
    const P=options.P||options.project;
    const visiblePoint=options.visiblePoint;
    const groundZ=options.groundZ;
    const rgba=options.rgba;
    const view=options.view;
    const camera=options.camera;
    const world=options.world||{};
    const currentStage=options.currentStage;

    if(!ctx)throw new TypeError('PotWeather.create requires a 2D rendering context.');
    if(!C||typeof C.clamp!=='function'||typeof C.seeded!=='function')throw new TypeError('PotWeather.create requires PotCore as C/core.');
    if(typeof P!=='function')throw new TypeError('PotWeather.create requires the world projection function as P/project.');
    if(typeof visiblePoint!=='function')throw new TypeError('PotWeather.create requires visiblePoint.');
    if(typeof groundZ!=='function')throw new TypeError('PotWeather.create requires groundZ.');
    if(typeof rgba!=='function')throw new TypeError('PotWeather.create requires rgba.');
    if(!view||!camera)throw new TypeError('PotWeather.create requires the live view and camera objects.');

    const rng=C.seeded(options.seed||'POTLIGHT-DOWNPOUR-1');
    const TAU=C.TAU||Math.PI*2;
    const clamp=C.clamp;
    const lerp=C.lerp||((a,b,t)=>a+(b-a)*t);
    const approach=C.approach||((v,target,delta)=>v<target?Math.min(v+delta,target):Math.max(v-delta,target));
    const pointInRect=C.pointInRect||((x,y,r)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
    const stageWind=[-58,-44,-76,-104,-52,-70];

    const state={
      time:0,
      level:.52,
      stageIndex:0,
      shelter:0,
      shelterTarget:0,
      reducedMotion:false,
      player:null,
      windX:-58,
      windY:600,
      gust:0,
      gustSigned:0,
      impactCarry:0,
      automaticImpacts:0,
      manualSplashes:0,
      lensWetness:.22
    };

    const farStreaks=makeStreaks(BUDGETS.farStreaks,0);
    const midStreaks=makeStreaks(BUDGETS.midStreaks,1);
    const nearStreaks=makeStreaks(BUDGETS.nearStreaks,2);
    const ripples=makePool(BUDGETS.ripples,()=>({
      active:false,x:0,y:0,z:0,age:0,life:1,startRadius:2,endRadius:28,
      alpha:.5,power:1,color:'#86c9e8',stage:0
    }));
    const spray=makePool(BUDGETS.spray,()=>({
      active:false,x:0,y:0,z:0,floorZ:0,vx:0,vy:0,vz:0,age:0,life:.4,
      size:2,color:'#dff8ff',stage:0
    }));
    const runoffAnchors=buildRunoffAnchors();
    const mistBanks=makeMist(BUDGETS.mistBanks);
    const lensDrops=makeLensDrops(BUDGETS.lensDrops);
    const streakScratch={x:0,y:0,length:0,slant:0};
    let rippleCursor=0;
    let sprayCursor=0;

    function makePool(count,factory){
      const out=new Array(count);
      for(let i=0;i<count;i++)out[i]=factory();
      return out;
    }

    function makeStreaks(count,band){
      const out=new Array(count);
      for(let i=0;i<count;i++){
        const speedBase=band===0?270:band===1?520:820;
        const lengthBase=band===0?13:band===1?22:34;
        out[i]={
          u:rng.float(),
          v:rng.float(),
          phase:rng.range(0,TAU),
          speed:speedBase*rng.range(.78,1.28),
          length:lengthBase*rng.range(.72,1.42),
          drift:rng.range(.72,1.24),
          bright:rng.float()<.16
        };
      }
      return out;
    }

    function makeMist(count){
      const out=new Array(count);
      for(let i=0;i<count;i++)out[i]={
        u:rng.float(),
        v:rng.range(.48,1.02),
        w:rng.range(.13,.31),
        h:rng.range(10,28),
        speed:rng.range(.7,1.35),
        phase:rng.range(0,TAU)
      };
      return out;
    }

    function makeLensDrops(count){
      const out=new Array(count);
      for(let i=0;i<count;i++)out[i]={
        u:rng.range(.05,.95),
        v:rng.range(.04,.88),
        r:rng.range(5,13),
        phase:rng.range(0,TAU),
        drift:rng.range(.45,1.15)
      };
      return out;
    }

    function buildRunoffAnchors(){
      const out=[];
      const walls=world.walls||[];
      const wetKinds=new Set(['busShelter','houseWall','building','parapet','insideWall']);
      for(let i=0;i<walls.length&&out.length<BUDGETS.runoffAnchors;i++){
        const w=walls[i];
        if(!wetKinds.has(w.kind))continue;
        const span=Math.max(w.w||0,w.h||0);
        const pieces=clamp(Math.floor(span/260)+1,1,3);
        for(let j=0;j<pieces&&out.length<BUDGETS.runoffAnchors;j++){
          const t=(j+1)/(pieces+1);
          const horizontal=(w.w||0)>=(w.h||0);
          out.push({
            x:horizontal?w.x+w.w*t:w.x+w.w*rng.range(.28,.72),
            y:horizontal?w.y+w.h*rng.range(.58,.92):w.y+w.h*t,
            z:w.z||0,
            height:w.height||70,
            stage:w.stage||0,
            phase:rng.float(),
            speed:rng.range(.75,1.28),
            width:rng.range(.72,1.35)
          });
        }
      }
      return out;
    }

    function stageData(){
      try{return typeof currentStage==='function'?currentStage():currentStage||null;}
      catch{return null;}
    }

    function rainColor(){
      const stage=stageData();
      return stage&&stage.palette&&stage.palette.rain||'#86c9e8';
    }

    function toRgba(color,alpha){
      try{return rgba(color,clamp(alpha,0,1));}
      catch{return `rgba(134,201,232,${clamp(alpha,0,1)})`;}
    }

    function wrap(value,size){
      value%=size;
      return value<0?value+size:value;
    }

    function exposure(){return 1-state.shelter*.82;}

    function areaScale(){
      const area=Math.max(1,(view.w||1)*(view.h||1));
      return clamp(Math.sqrt(area/(1280*720)),.62,1.08);
    }

    function drawCount(max){
      const pressure=.72+clamp(state.level,0,1)*.28;
      const motionDensity=state.reducedMotion?.68:1;
      return clamp(Math.floor(max*areaScale()*pressure*motionDensity),1,max);
    }

    function surfaceAt(x,y){
      const surfaces=world.surfaces||[];
      for(let i=surfaces.length-1;i>=0;i--){
        const surface=surfaces[i];
        if(pointInRect(x,y,surface))return surface;
      }
      return null;
    }

    function acquireRipple(x,y,z,power,color,stageIndex){
      const r=ripples[rippleCursor++%ripples.length];
      r.active=true;
      r.x=x;r.y=y;r.z=z+1;
      r.age=0;r.life=.48+power*.42;
      r.startRadius=2+power*3;r.endRadius=18+power*31;
      r.alpha=.32+Math.min(.42,power*.19);
      r.power=power;r.color=color;r.stage=stageIndex;
      return r;
    }

    function acquireSpray(x,y,z,power,color,stageIndex,index,total){
      const p=spray[sprayCursor++%spray.length];
      const spread=total<=1?0:index/(total-1)-.5;
      const angle=-Math.PI*.5+spread*1.8+rng.range(-.24,.24);
      const speed=rng.range(26,72)*(0.7+power*.55);
      p.active=true;
      p.x=x;p.y=y;p.z=z+2;p.floorZ=z+1;
      p.vx=Math.cos(angle)*speed+state.windX*.075;
      p.vy=Math.sin(angle)*speed+state.windX*.025;
      p.vz=rng.range(48,112)*(0.65+power*.45);
      p.age=0;p.life=rng.range(.26,.52)*(state.reducedMotion?.82:1);
      p.size=rng.range(1.2,2.8)*(0.8+power*.25);
      p.color=color;p.stage=stageIndex;
      return p;
    }

    function emitImpact(x,y,z,power,color,sprayCount,stageIndex){
      const safePower=clamp(Number(power)||.5,.08,2.2);
      const safeColor=color||rainColor();
      const safeStage=Number.isFinite(stageIndex)?stageIndex:state.stageIndex;
      acquireRipple(x,y,z,safePower,safeColor,safeStage);
      const count=clamp(Math.floor(sprayCount)||0,0,10);
      for(let i=0;i<count;i++)acquireSpray(x,y,z,safePower,safeColor,safeStage,i,count);
    }

    function automaticImpact(){
      const origin=state.player||camera;
      if(!origin)return false;
      for(let attempt=0;attempt<6;attempt++){
        const angle=rng.range(0,TAU);
        const distance=Math.sqrt(rng.float())*rng.range(130,560);
        const x=origin.x+Math.cos(angle)*distance;
        const y=origin.y+Math.sin(angle)*distance;
        const surface=surfaceAt(x,y);
        if(!surface||!visiblePoint(x,y,surface.z||0,100))continue;
        const z=groundZ(x,y);
        const power=rng.range(.16,.46)*(0.8+state.level*.5);
        emitImpact(x,y,z,power,rainColor(),rng.float()<.42?2:1,state.stageIndex);
        state.automaticImpacts++;
        return true;
      }
      return false;
    }

    function update(dt,next={}){
      dt=clamp(Number(dt)||0,0,.05);
      state.time+=dt*(next.reducedMotion?.62:1);
      state.level=clamp(Number.isFinite(next.level)?next.level:state.level,0,1);
      state.stageIndex=clamp(Math.floor(Number.isFinite(next.stageIndex)?next.stageIndex:state.stageIndex),0,999);
      state.player=next.player||null;
      state.reducedMotion=!!next.reducedMotion;
      state.shelterTarget=clamp(typeof next.sheltered==='number'?next.sheltered:next.sheltered?1:0,0,1);
      state.shelter=approach(state.shelter,state.shelterTarget,dt*3.8);

      const stageBase=stageWind[state.stageIndex%stageWind.length];
      const wave=Math.sin(state.time*.37+state.stageIndex*1.13)*.54+
        Math.sin(state.time*.137+2.7)*.29+
        Math.sin(state.time*.83+state.stageIndex*.41)*.17;
      state.gustSigned=clamp(wave,-1,1);
      state.gust=clamp((Math.abs(wave)-.18)/.72,0,1);
      const motion=state.reducedMotion?.55:1;
      state.windX=(stageBase+wave*(34+state.level*46))*motion;
      state.windY=(480+state.stageIndex*28+state.level*250)*(state.reducedMotion?.68:1);

      const wetTarget=exposure()*(.26+state.level*.58);
      state.lensWetness=approach(state.lensWetness,wetTarget,dt*(state.shelterTarget?.22:.16));

      const impactRate=Math.min(BUDGETS.maxAutoImpactsPerSecond,
        (5+state.level*15)*exposure()*(state.reducedMotion?.52:1));
      state.impactCarry=Math.min(BUDGETS.maxAutoImpactsPerUpdate,state.impactCarry+dt*impactRate);
      let emitted=0;
      while(state.impactCarry>=1&&emitted<BUDGETS.maxAutoImpactsPerUpdate){
        state.impactCarry-=1;
        automaticImpact();
        emitted++;
      }

      for(let i=0;i<ripples.length;i++){
        const r=ripples[i];
        if(!r.active)continue;
        r.age+=dt;
        if(r.age>=r.life)r.active=false;
      }

      for(let i=0;i<spray.length;i++){
        const p=spray[i];
        if(!p.active)continue;
        p.age+=dt;
        if(p.age>=p.life){p.active=false;continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        p.vz-=360*dt;
        p.vx+=state.windX*.018*dt;
        if(p.z<=p.floorZ&&p.vz<0){
          p.active=false;
          acquireRipple(p.x,p.y,p.floorZ,.12,p.color,p.stage);
        }
      }
    }

    function splash(x,y,z,power=1,color){
      if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      const floor=Number.isFinite(z)?z:groundZ(x,y);
      const safePower=clamp(Number(power)||1,.1,2.2);
      emitImpact(x,y,floor,safePower,color||rainColor(),Math.ceil(3+safePower*3),state.stageIndex);
      state.manualSplashes++;
      return true;
    }

    function drawGround(){
      const zoom=camera.zoom||1;
      ctx.save();
      ctx.lineCap='round';
      for(let i=0;i<ripples.length;i++){
        const r=ripples[i];
        if(!r.active||r.stage!==state.stageIndex||!visiblePoint(r.x,r.y,r.z,80))continue;
        const life=1-r.age/r.life;
        const progress=1-life;
        const q=P(r.x,r.y,r.z);
        const radius=lerp(r.startRadius,r.endRadius,progress)*zoom;
        ctx.save();
        ctx.translate(q.x,q.y);
        ctx.scale(1,.45);
        ctx.globalAlpha=r.alpha*life*exposure();
        ctx.strokeStyle=toRgba(r.color,1);
        ctx.lineWidth=(.8+r.power*.8)*zoom;
        ctx.beginPath();
        ctx.arc(0,0,radius,0,TAU);
        ctx.stroke();
        if(r.power>.55){
          ctx.globalAlpha*=.48;
          ctx.beginPath();
          ctx.arc(0,0,radius*.62,0,TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    function streakPosition(drop,band){
      const margin=band===0?90:band===1?130:180;
      const width=(view.w||1)+margin*2;
      const height=(view.h||1)+margin*2;
      const motion=state.reducedMotion?.62:1;
      const x=wrap(drop.u*width+state.time*state.windX*drop.drift*motion+
        Math.sin(state.time*.8+drop.phase)*state.gust*18,width)-margin;
      const y=wrap(drop.v*height+state.time*drop.speed*motion,height)-margin;
      const screenScale=clamp(Math.min(view.w||1,view.h||1)/600,.72,1.18);
      const length=drop.length*screenScale*(.9+state.level*.28);
      const slant=(state.windX/Math.max(180,drop.speed))*length*1.65+
        state.gustSigned*(band+1)*1.5;
      streakScratch.x=x;streakScratch.y=y;streakScratch.length=length;streakScratch.slant=slant;
      return streakScratch;
    }

    function strokeStreakPass(drops,count,band,heavy){
      ctx.beginPath();
      for(let i=0;i<count;i++){
        const drop=drops[i];
        if(drop.bright!==heavy)continue;
        const p=streakPosition(drop,band);
        ctx.moveTo(p.x,p.y);
        ctx.lineTo(p.x+p.slant,p.y+p.length);
      }
      ctx.stroke();
    }

    function drawStreakLayer(drops,band,baseAlpha){
      const count=drawCount(drops.length);
      const color=rainColor();
      const alpha=baseAlpha*(.78+state.level*.42)*exposure();
      if(alpha<=.005)return;
      ctx.save();
      ctx.lineCap='round';
      ctx.strokeStyle=toRgba(color,1);
      ctx.globalAlpha=alpha;
      ctx.lineWidth=band===0?.75:band===1?1.1:1.65;
      strokeStreakPass(drops,count,band,false);
      ctx.strokeStyle=toRgba('#e7f9ff',1);
      ctx.globalAlpha=Math.min(.82,alpha*1.42);
      ctx.lineWidth=band===0?1:band===1?1.55:2.25;
      strokeStreakPass(drops,count,band,true);
      ctx.restore();
    }

    function drawMist(){
      const count=clamp(Math.floor(mistBanks.length*areaScale()*(state.reducedMotion?.7:1)),2,mistBanks.length);
      const color=rainColor();
      ctx.save();
      ctx.fillStyle=toRgba(color,1);
      ctx.globalAlpha=(.026+state.level*.025)*exposure();
      ctx.beginPath();
      for(let i=0;i<count;i++){
        const m=mistBanks[i];
        const x=wrap(m.u*(view.w+260)+state.time*state.windX*.12*m.speed,view.w+260)-130;
        const y=view.h*m.v+Math.sin(state.time*.25+m.phase)*8;
        ctx.ellipse(x,y,view.w*m.w,m.h*(.8+state.gust*.45),0,0,TAU);
      }
      ctx.fill();
      ctx.restore();
    }

    function drawRunoff(){
      if(!runoffAnchors.length)return;
      const color=rainColor();
      const strength=(.11+state.level*.14)*(.76+state.shelter*.82);
      ctx.save();
      ctx.lineCap='round';
      ctx.strokeStyle=toRgba(color,1);
      ctx.globalAlpha=strength;
      ctx.lineWidth=1;
      ctx.beginPath();
      for(let i=0;i<runoffAnchors.length;i++){
        const a=runoffAnchors[i];
        if(a.stage!==state.stageIndex||!visiblePoint(a.x,a.y,a.z+a.height,90))continue;
        const top=P(a.x,a.y,a.z+a.height);
        const bottom=P(a.x,a.y,a.z+2);
        const sway=Math.sin(state.time*2.2+a.phase*TAU)*2.2*state.gust;
        ctx.moveTo(top.x,top.y);
        ctx.quadraticCurveTo((top.x+bottom.x)*.5+sway,(top.y+bottom.y)*.5,bottom.x+sway*.4,bottom.y);
      }
      ctx.stroke();

      ctx.globalAlpha=Math.min(.68,strength*2.1);
      ctx.lineWidth=1.5;
      ctx.beginPath();
      for(let i=0;i<runoffAnchors.length;i++){
        const a=runoffAnchors[i];
        if(a.stage!==state.stageIndex||!visiblePoint(a.x,a.y,a.z+a.height,90))continue;
        const top=P(a.x,a.y,a.z+a.height);
        const bottom=P(a.x,a.y,a.z+2);
        const t=wrap(state.time*(.72+state.level*.55)*a.speed+a.phase,1);
        const x=lerp(top.x,bottom.x,t)+Math.sin(t*TAU+a.phase)*1.8;
        const y=lerp(top.y,bottom.y,t);
        ctx.moveTo(x,y);
        ctx.lineTo(x+state.windX*.018,y+5+a.width*3);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawSpray(){
      const zoom=camera.zoom||1;
      ctx.save();
      ctx.lineCap='round';
      for(let i=0;i<spray.length;i++){
        const p=spray[i];
        if(!p.active||p.stage!==state.stageIndex||!visiblePoint(p.x,p.y,p.z,70))continue;
        const life=1-p.age/p.life;
        const q=P(p.x,p.y,p.z);
        const tail=P(p.x-p.vx*.014,p.y-p.vy*.014,p.z-p.vz*.014);
        ctx.globalAlpha=clamp(life*.62*exposure(),0,1);
        ctx.strokeStyle=toRgba(p.color,1);
        ctx.lineWidth=Math.max(.75,p.size*zoom);
        ctx.beginPath();
        ctx.moveTo(tail.x,tail.y);
        ctx.lineTo(q.x,q.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBack(){
      drawMist();
      drawStreakLayer(farStreaks,0,.18);
      drawStreakLayer(midStreaks,1,.28);
      drawRunoff();
    }

    function drawFront(){
      drawSpray();
      drawStreakLayer(nearStreaks,2,.40);
    }

    function drawPost(){
      const exposed=exposure();
      const color=rainColor();
      if(state.gust>.32&&exposed>.15){
        ctx.save();
        ctx.globalCompositeOperation='screen';
        ctx.strokeStyle=toRgba(color,1);
        ctx.globalAlpha=(state.gust-.32)*.045*exposed;
        ctx.lineWidth=18+state.gust*24;
        const shift=wrap(state.time*state.windX*.55,view.h+260)-130;
        ctx.beginPath();
        ctx.moveTo(-180,shift);
        ctx.lineTo(view.w+180,shift+view.h*.54);
        ctx.moveTo(-120,shift-170);
        ctx.lineTo(view.w+240,shift+view.h*.54-170);
        ctx.stroke();
        ctx.restore();
      }

      const wet=state.lensWetness*exposed;
      if(wet<.035)return;
      const count=clamp(Math.ceil(lensDrops.length*wet*(state.reducedMotion?.55:1)),1,lensDrops.length);
      ctx.save();
      ctx.lineCap='round';
      ctx.strokeStyle=toRgba('#e8faff',1);
      ctx.globalAlpha=.055+.105*wet;
      ctx.lineWidth=1.15;
      ctx.beginPath();
      for(let i=0;i<count;i++){
        const d=lensDrops[i];
        const drift=state.reducedMotion?0:wrap(state.time*7*d.drift+d.phase*40,44);
        const x=view.w*d.u+Math.sin(d.phase+state.time*.08)*state.windX*.025;
        const y=wrap(view.h*d.v+drift,view.h+30)-15;
        const r=d.r*(.82+wet*.35);
        ctx.ellipse(x,y,r*.7,r,0,0,TAU);
      }
      ctx.stroke();

      ctx.globalAlpha=.11+.12*wet;
      ctx.lineWidth=.8;
      ctx.beginPath();
      for(let i=0;i<count;i++){
        const d=lensDrops[i];
        const drift=state.reducedMotion?0:wrap(state.time*7*d.drift+d.phase*40,44);
        const x=view.w*d.u+Math.sin(d.phase+state.time*.08)*state.windX*.025;
        const y=wrap(view.h*d.v+drift,view.h+30)-15;
        ctx.arc(x-d.r*.18,y-d.r*.22,d.r*.18,Math.PI,TAU);
      }
      ctx.stroke();
      ctx.restore();
    }

    function activeIn(pool){
      let count=0;
      for(let i=0;i<pool.length;i++)if(pool[i].active)count++;
      return count;
    }

    function stageRunoffCount(){
      let count=0;
      for(let i=0;i<runoffAnchors.length;i++)if(runoffAnchors[i].stage===state.stageIndex)count++;
      return count;
    }

    function snapshot(){
      return {
        version:VERSION,
        deterministic:true,
        drawOrder:'drawGround -> drawBack -> world/lighting -> drawFront -> drawPost -> combat cues',
        time:state.time,
        level:state.level,
        stageIndex:state.stageIndex,
        sheltered:state.shelter,
        reducedMotion:state.reducedMotion,
        rainColor:rainColor(),
        wind:{x:state.windX,y:state.windY,gust:state.gust,signed:state.gustSigned},
        drawCounts:{
          far:drawCount(farStreaks.length),
          mid:drawCount(midStreaks.length),
          near:drawCount(nearStreaks.length),
          runoff:stageRunoffCount(),
          mist:mistBanks.length,
          lens:Math.ceil(lensDrops.length*state.lensWetness*exposure())
        },
        pools:{ripples:activeIn(ripples),spray:activeIn(spray)},
        events:{automaticImpacts:state.automaticImpacts,manualSplashes:state.manualSplashes},
        budgets:{...BUDGETS}
      };
    }

    return Object.freeze({update,splash,drawGround,drawBack,drawFront,drawPost,snapshot});
  }

  global.PotWeather=Object.freeze({VERSION,BUDGETS,create});
})(window);
