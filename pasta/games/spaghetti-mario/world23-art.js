// Worlds 2–2 and 2–3: photographic spaghetti surfaces, floating strands,
// soft aquatic silhouettes, and loaded bridge noodles. No non-pasta surfaces.
export function createWorld23Art({ctx,material,strand,coil,photoShape,drawSprite,drawCloud,getTime=()=>0}) {
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const bridgeMotion=new WeakMap(),bubbleMotion=new WeakMap();
  const BRIDGE_CLOUDS=[[18,2,4],[66,2,4],[114,2,4],[162,2,4],[210,2,4],[3,3,4],[51,3,4],[99,3,4],[147,3,4],[195,3,4],[243,3,4],[38,6,3],[86,6,3],[134,6,3],[182,6,3],[9,7,3],[35,7,3],[57,7,3],[83,7,3],[105,7,3],[131,7,3],[153,7,3],[179,7,3],[201,7,3],[227,7,3],[28,11,3],[46,11,3],[76,11,3],[94,11,3],[124,11,3],[142,11,3],[172,11,3],[190,11,3],[220,11,3]];

  function translucentCoil(x,y,rx,ry,palette,width,turns,alpha){
    ctx.save();ctx.globalAlpha*=alpha;coil(x,y,rx,ry,palette,width,turns);ctx.restore();
  }

  function litSurface(x,y,w,h,brightness=.12,shade=.18){
    const light=ctx.createLinearGradient(x,y,x+w*.65,y+h);
    light.addColorStop(0,'rgba(245,255,246,'+brightness+')');
    light.addColorStop(.4,'rgba(255,255,255,0)');
    light.addColorStop(1,'rgba(4,18,30,'+shade+')');
    ctx.fillStyle=light;ctx.fillRect(x,y,w,h);
  }

  // World-coordinate drawing: call after the renderer translates by -camera.
  function drawUnderwaterBackdrop({camera=0,viewWidth=20}={}){
    const now=getTime(),tw=6,th=5,parallax=.055,offset=camera*(1-parallax);
    const first=Math.floor(camera*parallax/tw)*tw;
    for(let x=first;x<camera*parallax+viewWidth+tw;x+=tw)for(let y=0;y<15;y+=th){
      const flip=(Math.round(x/tw)+Math.round(y/th))%2!==0;
      ctx.save();ctx.translate(x+offset+(flip?tw:0),y);ctx.scale(flip?-1:1,1);material(21,0,0,tw,th);ctx.restore();
    }
    const depth=ctx.createLinearGradient(0,0,0,15);
    depth.addColorStop(0,'#032b4155');depth.addColorStop(.25,'#07304963');depth.addColorStop(.65,'#03203984');depth.addColorStop(1,'#051326a6');
    ctx.fillStyle=depth;ctx.fillRect(camera,0,viewWidth,15);
    // Soft moving illumination falls across the photographed noodles. It adds
    // depth without introducing an actual water surface or liquid particles.
    for(let i=-1;i<4;i++){
      const x=camera+((i*.29+.12)*viewWidth)+Math.sin(now*.23+i)*.3;
      const g=ctx.createLinearGradient(x-1,0,x+5,15);
      g.addColorStop(0,'rgba(110,236,238,0)');g.addColorStop(.42,'rgba(110,236,238,.025)');g.addColorStop(.52,'rgba(174,249,232,.055)');g.addColorStop(.65,'rgba(110,236,238,0)');
      ctx.fillStyle=g;ctx.fillRect(camera,2,viewWidth,13);
    }
    drawWaterSurface({camera,viewWidth});
  }

  function drawWaterSurface({x=0,y=2,w=206,camera=0,viewWidth=20}={}){
    const left=Math.max(x,camera-.2),right=Math.min(x+w,camera+viewWidth+.2),now=getTime();
    if(right<=left)return;
    // The classic waterline is a continuous fringe of small pale pasta loops.
    for(let xx=Math.floor(left/.5)*.5;xx<right;xx+=.5){
      const drift=Math.sin(xx*2.4+now*.75)*.012;
      coil(xx+.25,y-.045+drift,.26,.07,'ice',.039,1.2);
      strand([[xx,y+.04],[xx+.25,y+.07+drift],[xx+.5,y+.04]],.04,'blue',.7);
    }
  }

  function drawUnderwaterTile(b){
    if(!b||b.removed)return;
    const x=b.x,y=b.y+(b.bump||0),w=b.w??1,h=b.h??1;
    photoShape(24,()=>{ctx.beginPath();ctx.roundRect(x+.012,y+.012,w-.024,h-.024,.055)},x,y,w,h);
    ctx.save();ctx.beginPath();ctx.roundRect(x+.012,y+.012,w-.024,h-.024,.055);ctx.clip();litSurface(x,y,w,h,.12,.25);ctx.restore();
    // Edges are tied strands, not mortar. Keep the exact square collision face.
    strand([[x+.055,y+h-.055],[x+.045,y+.075],[x+w*.5,y+.04],[x+w-.055,y+.075],[x+w-.045,y+h-.065],[x+.055,y+h-.055]],.047,'ice',.92);
    for(let k=0;k<3;k++){
      const yy=y+.22+k*.25,phase=hash(x*13+y*7+k)*TAU;
      const pts=[];for(let j=0;j<=8;j++)pts.push([x+.09+(w-.18)*j/8,yy+Math.sin(j*.65+phase)*.026]);
      strand(pts,.038,k===0?'pale':'ice',.65);
    }
  }

  function drawSeabed(f,camera=-1e9,viewWidth=2e9){
    if(!f||f.removed)return;
    const left=Math.max(f.x,Math.floor(camera)-1),right=Math.min(f.x+f.w,Math.ceil(camera+viewWidth)+1);
    for(let y=f.y;y<f.y+(f.h??2);y++)for(let x=left;x<right;x++)drawUnderwaterTile({x,y,w:Math.min(1,right-x),h:Math.min(1,f.y+(f.h??2)-y)});
    for(let x=Math.floor(left);x<right;x++){
      const px=x+.27+hash(x*3.4)*.46;
      strand([[px,f.y+.03],[px-.11,f.y-.06],[px+.02,f.y-.12],[px+.12,f.y-.04]],.038,'pale',.7);
    }
  }

  function drawCoral(c){
    if(!c||c.removed)return;
    const {x,y}=c,w=c.w??1,h=c.h??1,base=y+h,now=getTime();
    const stemX=x+w*.5;
    // Solid coral occupies the original one-tile column. Only loose outer tips
    // sway: its central dense food silhouette keeps the collision legible.
    const silhouette=()=>{
      ctx.beginPath();ctx.moveTo(x+.11,base);ctx.lineTo(x+.12,y+.1);
      ctx.quadraticCurveTo(x+.24,y-.015,x+.34,y+.08);ctx.lineTo(x+.39,y+.28);
      ctx.quadraticCurveTo(x+.51,y+.34,x+.55,y+.05);ctx.quadraticCurveTo(x+.68,y-.02,x+.77,y+.09);
      ctx.lineTo(x+w-.10,base);ctx.closePath();
    };
    photoShape(22,silhouette,x+.06,y-.025,w-.12,h+.03);
    ctx.save();silhouette();ctx.clip();litSurface(x,y,w,h,.12,.25);ctx.restore();
    for(let k=0;k<5;k++){
      const pts=[];for(let j=0;j<=Math.ceil(h*10);j++){
        const f=j/Math.ceil(h*10),yy=base-f*h;
        pts.push([stemX+(k-2)*.13+Math.sin(f*h*6+k*1.4)*.035,yy]);
      }
      strand(pts,.061,k%2?'pale':'coral',.9);
    }
    let n=0;
    for(let yy=base-.4;yy>y+.18;yy-=.55){
      for(const side of[-1,1]){
        const bend=Math.sin(now*1.3+yy*1.7+x)*.026,px=stemX+side*.13;
        const outer=stemX+side*(.42+hash(x*11+n)*.035),rise=.22+hash(n+x)*.15;
        strand([[px,yy+.1],[outer,yy+.02],[outer+side*bend,yy-rise],[outer-side*.06+side*bend,yy-rise-.1]],.075,n%2?'pale':'coral');
        coil(outer-side*.015,yy-rise,.055,.08,'pale',.03,1.1);
      }n++;
    }
    for(let k=0;k<3;k++)coil(x+.27+k*.22,y+.13+(k%2)*.08,.105,.11,'pale',.043,1.3);
  }

  function drawCurrent(c){
    if(!c)return;
    const now=getTime(),left=c.x,right=c.x+c.w,center=c.center??left+c.w/2;
    const top=Math.max(c.y??2,9.3),bottom=15.3;
    // A few faint noodle curls descend into each pit. They describe the
    // current while leaving the swimmer and collectibles unobscured.
    for(let k=0;k<5;k++){
      const phase=(now*.33+k*.21+hash(left))%1,yy=top+phase*(bottom-top);
      const radius=(1-phase)*Math.min(c.w*.33,2)+.16;
      const px=center+Math.sin(phase*TAU+k)*radius*.18;
      const alpha=(c.active?.36:.15)*Math.sin(phase*Math.PI);
      translucentCoil(px,yy,radius,.08+radius*.12,'ice',.03,1.45,alpha);
    }
  }

  function drawBridge(b,{camera=-1e9,viewWidth=2e9}={}){
    if(!b||b.removed)return;
    const now=getTime(),x=b.x,y=b.y,w=b.w??1,h=b.h??1;
    const left=Math.max(x,Math.floor(camera)-1),right=Math.min(x+w,Math.ceil(camera+viewWidth)+1);
    if(right<=left)return;
    let motion=bridgeMotion.get(b);
    if(!motion){motion={bend:0,velocity:0,time:now};bridgeMotion.set(b,motion);}
    const dt=clamp(now-motion.time,0,1/24);motion.time=now;
    const target=clamp(b.load??0,0,1)*.07;
    motion.velocity+=((target-motion.bend)*80-motion.velocity*15)*dt;motion.bend+=motion.velocity*dt;
    const belly=clamp(motion.bend,-.03,.11);
    const railRight=Math.min(x+w+(x===48&&y===10?1:0),Math.ceil(camera+viewWidth)+1);
    // Original railing row sits immediately above the solid bridge row.
    for(let px=Math.ceil(left*2)/2;px<=railRight;px+=.5){
      photoShape(23,()=>{ctx.beginPath();ctx.roundRect(px-.035,y-.91,.07,.96,.03)},px-.035,y-.91,.07,.96);
      strand([[px,y-.91],[px+.009,y-.43],[px,y+.02]],.032,'gold');
    }
    for(const yy of[y-.88,y-.43]){
      const pts=[];for(let xx=left;xx<=railRight+.01;xx+=.16)pts.push([Math.min(xx,railRight),yy+Math.sin((xx-x)*.5)*belly*.25]);
      strand(pts,.06,'gold');strand(pts.map(([px,py])=>[px,py-.014]),.025,'pale',.8);
    }
    for(let xx=left;xx<right;xx+=1){
      const ww=Math.min(1,right-xx);
      photoShape(23,()=>{ctx.beginPath();ctx.roundRect(xx,y,ww,h,.035)},xx,y,ww,h);
      ctx.save();ctx.beginPath();ctx.rect(xx,y,ww,h);ctx.clip();litSurface(xx,y,ww,h,.15,.28);ctx.restore();
      for(let k=0;k<5;k++){
        const pts=[];for(let j=0;j<=8;j++){const f=j/8;pts.push([xx+f*ww,y+.065+k*(h-.13)/4+Math.sin(f*Math.PI)*belly*(k/4)]);}
        strand(pts,.055,k===0?'pale':'gold',k===0?1:.72);
      }
      for(const px of[xx+.08,xx+ww-.08]){
        coil(px,y+h*.5,.045,h*.44,'gold',.037,1.08);
        strand([[px,y+h-.03],[px+.025,y+h+.12+belly],[px-.018+Math.sin(now*2.2+px*4)*.035,y+h+.25+belly]],.034,'gold');
      }
    }
  }

  function fallbackCloud({x,y,w,h=2}){
    photoShape(18,()=>{ctx.beginPath();ctx.roundRect(x,y+h*.3,w,h*.65,.28);for(let i=0;i<Math.ceil(w);i++){ctx.moveTo(x+i+.9,y+.6);ctx.ellipse(x+i+.45,y+.6,.55,.6,0,0,TAU)}},x-.1,y,w+.2,h);
    for(let i=0;i<w*2;i++)coil(x+.25+i*.5,y+h*.72,.22,.2,'pale',.035,1.15);
  }

  function drawBridgeScenery({camera=0,viewWidth=20}={}){
    const cloud=drawCloud||fallbackCloud;
    for(const[x,y,w]of BRIDGE_CLOUDS)if(x+w>camera-1&&x<camera+viewWidth+1)cloud({x,y,w,h:2});
  }

  function drawExitScenery({camera=0,viewWidth=20}={}){
    const cloud=drawCloud||fallbackCloud;
    // The surface exit is the original World1–1 ending page, rebased by176.
    for(const[x,y,w]of[[4,2,4],[24,3,3],[35,2,3],[43,3,5]])if(x+w>camera-1&&x<camera+viewWidth+1){
      ctx.save();if(x===43){ctx.beginPath();ctx.rect(42.8,1,4.2,5);ctx.clip();}cloud({x,y,w,h:2});ctx.restore();
    }
    for(const[x,w,h]of[[16,5,3],[32,3,2]])if(x+w>camera-1&&x<camera+viewWidth+1){
      const top=13-h;
      photoShape(19,()=>{ctx.beginPath();ctx.moveTo(x,13);ctx.bezierCurveTo(x+w*.12,13-h*.34,x+w*.31,top,x+w*.5,top);ctx.bezierCurveTo(x+w*.69,top,x+w*.88,13-h*.34,x+w,13);ctx.closePath();},x,top,w,h);
      for(let k=0;k<7;k++){
        const f=(k+.5)/7,xx=x+f*w,tip=13-h*Math.sin(f*Math.PI);
        strand([[xx,13],[xx-w*.035,13-h*.4],[xx,tip+.06]],.045,'green',.65);
      }
      for(const dx of[-.18,.18])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,top+.64,.055,.09,0,0,TAU);},x+w*.5+dx-.06,top+.55,.12,.18,.9);
    }
    for(const x of[29,39])if(x+3>camera-1&&x<camera+viewWidth+1){
      photoShape(19,()=>{ctx.beginPath();ctx.moveTo(x,13);for(let i=0;i<3;i++){ctx.quadraticCurveTo(x+i+.08,12.04,x+i+.5,12.27);ctx.quadraticCurveTo(x+i+.89,11.98,x+i+1,12.78);}ctx.lineTo(x+3,13);ctx.closePath();},x,12,3,1);
      for(let i=0;i<11;i++)coil(x+.22+i*.25,12.7,.2,.22,'green',.035,1.1);
    }
  }

  function swimAngle(p){return (p.facing??1)*(.13+clamp(Math.abs(p.vx??0),0,5)*.035+clamp(p.vy??0,-5,5)*.012);}

  function drawSwimmingPlayer(p,actorIndex=0,options={}){
    if(!p||p.hidden)return;
    const cx=p.x+p.w*.5,cy=p.y+p.h*.52;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(swimAngle(p));ctx.translate(-cx,-cy);
    drawSprite(actorIndex,p.x-.15,p.y-.09,p.w+.3,p.h+.15,{...options,flip:p.facing<0,wiggle:options.wiggle??.028});
    ctx.restore();
  }

  function drawSwimmingPlayerOverlay(p,{luigi=false}={}){
    if(!p||p.hidden||p.dead)return;
    const cx=p.x+p.w*.5,cy=p.y+p.h*.52,side=p.facing??1;
    const now=getTime(),phase=p.swimPhase??now*4,stroke=clamp((p.swimStroke??0)/.24,0,1),swing=Math.sin(phase*TAU)*.06+stroke*.09;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(swimAngle(p));ctx.translate(-cx,-cy);
    const px=p.x+p.w*(side>0?.7:.3),yy=p.y+p.h*.57;
    strand([[px,yy],[px+side*.18,yy+.09-swing],[px+side*.32,yy+.02-swing]],.045,luigi?'green':'red',.9);
    coil(px+side*.32,yy+.02-swing,.065,.055,'gold',.032,1.3);
    for(let k=0;k<2;k++){
      const xx=p.x+p.w*(.32+k*.35),by=p.y+p.h*.89;
      strand([[xx,by],[xx-side*(.10+k*.04),by+.10+Math.sin(phase*TAU+k*Math.PI)*.055],[xx-side*.24,by+.08+Math.sin(phase*TAU+k*Math.PI)*.07]],.045,luigi?'pale':'blue',.8);
    }
    ctx.restore();
  }

  function drawAquaticEnemy(e){
    const kind=e?.kind||e?.type;
    if(kind!=='blooper'&&kind!=='cheep')return false;
    if(e.removed||(e.hidden&&!e.dead)||e.dead&&e.deathTimer<=0)return true;
    const now=getTime(),w=e.w??.9,h=e.h??1;
    if(kind==='blooper'){
      const pulse=clamp(e.pulse??0,0,1),phase=e.swimPhase??now*.8;
      drawSprite(16,e.x-.08,e.y-.045,w+.16,h+.09,{squash:pulse*.095,wiggle:.012,flipY:!!e.flipped,alpha:e.dead?.75:1});
      if(!e.dead)for(let k=0;k<6;k++){
        const px=e.x+w*(.19+k*.124),by=e.y+h*.77,tail=.25+h*.13;
        const drag=clamp(e.vx??0,-4,4)*.015,flex=Math.sin(phase*TAU+k*.9)*(.04+pulse*.07);
        strand([[px,by],[px-drag+flex*.4,by+tail*.38],[px-drag*2+flex,by+tail*.76],[px-drag*2+flex*.8+(k<3?-.035:.035),by+tail]],.037,'pale',.95);
      }
    }else{
      const side=e.facing??((e.vx??-1)>0?1:-1),phase=e.swimPhase??now*1.7;
      const angle=e.dead?0:clamp((e.vy??0)*.025,-.36,.36)*side;
      const cx=e.x+w*.5,cy=e.y+h*.5;
      ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.translate(-cx,-cy);
      drawSprite(e.red===false?18:17,e.x-.1,e.y-.07,w+.2,h+.14,{flip:side>0,flipY:!!e.flipped,squash:e.dead?0:Math.sin(phase*TAU)*.035,wiggle:e.flying?.025:.017,alpha:e.dead?.75:1});
      if(!e.dead){
        const tailX=e.x+w*(side>0?.12:.88),tailY=e.y+h*.5,flex=Math.sin(phase*TAU)*.09;
        for(let k=0;k<3;k++)strand([[tailX,tailY],[tailX-side*.12,tailY+(k-1)*.1+flex*.5],[tailX-side*.24,tailY+(k-1)*.14+flex]],.034,'pale',.86);
        const finX=e.x+w*.53,finY=e.y+h*.59;
        strand([[finX,finY],[finX-side*.12,finY+.05+flex],[finX-side*.18,finY+.16+flex]],.042,'pale',.9);
      }
      ctx.restore();
    }
    return true;
  }

  function drawUnderwaterForeground({camera=0,viewWidth=20,player}={}){
    const now=getTime();
    if(player&&player.swimming&&!player.hidden&&!player.dead){
      let motion=bubbleMotion.get(player);
      if(!motion){motion={time:now,next:now+.15,serial:0,bubbles:[]};bubbleMotion.set(player,motion);}
      const dt=clamp(now-motion.time,0,1/24);motion.time=now;
      if(now>=motion.next){
        const serial=motion.serial++,side=player.facing??1;
        motion.bubbles.push({x:player.x+player.w*(side>0?.94:.06),y:player.y+player.h*.22,r:.035+hash(serial+3)*.03,age:0,seed:serial,vx:(player.vx??0)*.13});
        motion.next=now+.47+hash(serial)*.27;
      }
      for(const b of motion.bubbles){b.age+=dt;b.y-=(.65+b.age*.16)*dt;b.x+=(b.vx*Math.exp(-b.age*3)+Math.sin(b.age*2+b.seed)*.07)*dt;}
      motion.bubbles=motion.bubbles.filter(b=>b.age<3.4&&b.y>2.1&&b.x>camera-.5);
      for(const b of motion.bubbles){
        const a=Math.min(1,(3.4-b.age)*1.2),r=b.r*(1+b.age*.11);
        translucentCoil(b.x,b.y,r,r*(1.08+Math.sin(now*3+b.seed)*.05),'ice',.018,1.1,a*.9);
        strand([[b.x-r*.65,b.y],[b.x-r*.46,b.y-r*.55],[b.x,b.y-r*.78]],.013,'pale',a*.8);
      }
    }
    // Isolated fine noodle loops recede into the background at two depths.
    for(let i=0;i<10;i++){
      const f=hash(i*17+5),x=camera+((hash(i*7)+now*.002*(i%2?1:-1))%1+1)%1*viewWidth;
      const y=2.4+((f*12-now*.12*(.5+hash(i)))%12+12)%12;
      translucentCoil(x,y,.025+hash(i+11)*.035,.045+hash(i+9)*.035,'ice',.012,1.1,.13);
    }
  }

  return {drawUnderwaterBackdrop,drawWaterSurface,drawUnderwaterTile,drawSeabed,drawCoral,drawCurrent,drawBridge,drawBridgeScenery,drawExitScenery,drawSwimmingPlayer,drawSwimmingPlayerOverlay,drawAquaticEnemy,drawUnderwaterForeground};
}
