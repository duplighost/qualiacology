// World 2–1 uses four photographic spaghetti materials at slots 17–20.
// Geometry is supplied by the engine; all decorations remain noodle surfaces.
export function createWorld21Art({ctx,material,strand,coil,photoShape,drawSprite,getTime=()=>0}) {
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const vineMotion=new WeakMap();

  function wetShade(x,y,w,h,strength=.12){
    const light=ctx.createLinearGradient(x,y,x+w,y+h);
    light.addColorStop(0,'rgba(255,255,225,'+strength+')');
    light.addColorStop(.4,'rgba(255,255,255,0)');
    light.addColorStop(1,'rgba(45,38,10,'+(strength*1.3)+')');
    ctx.fillStyle=light;ctx.fillRect(x,y,w,h);
  }

  // Use under the usual -camera world translation. The photograph moves at
  // 8% of foreground speed, giving depth without adding non-pasta scenery.
  function drawOverworldBackdrop({camera=0,viewWidth=20,sky=false}={}){
    const parallax=sky?.045:.08,tw=5.5,th=5.5,offset=camera*(1-parallax);
    const first=Math.floor(camera*parallax/tw)*tw;
    for(let x=first;x<camera*parallax+viewWidth+tw;x+=tw)for(let y=0;y<15;y+=th){
      const flip=(Math.round(x/tw)+Math.round(y/th))%2!==0;
      ctx.save();ctx.translate(x+offset+(flip?tw:0),y);ctx.scale(flip?-1:1,1);material(17,0,0,tw,th);ctx.restore();
    }
    const depth=ctx.createLinearGradient(0,0,0,15);
    depth.addColorStop(0,sky?'#123f7d88':'#164a6882');
    depth.addColorStop(.55,sky?'#3287a333':'#579fae26');
    depth.addColorStop(1,sky?'#bce9df3d':'#fff4c83a');
    ctx.fillStyle=depth;ctx.fillRect(camera,0,viewWidth,15);
    // Broad daylight is illumination of the photograph, never a separate sun.
    const daylight=ctx.createRadialGradient(camera+viewWidth*.18,1.5,.1,camera+viewWidth*.18,1.5,viewWidth*.8);
    daylight.addColorStop(0,'#fffbe626');daylight.addColorStop(1,'#fffbe600');
    ctx.fillStyle=daylight;ctx.fillRect(camera,0,viewWidth,15);
  }

  function cloudPath(x,y,w,h){
    const lobes=Math.max(2,Math.ceil(w/.85)),step=w/lobes;
    ctx.beginPath();ctx.roundRect(x,y+h*.24,w,h*.7,Math.min(.34,h*.28));
    // Overlapping round noodle piles make soft scallops even on tall clouds.
    for(let i=0;i<lobes;i++){
      const cx=x+step*(i+.5),cy=y+h*(.31+(i===0||i===lobes-1?.06:0));
      const rx=step*.64,ry=h*(i===0||i===lobes-1?.3:.34);
      ctx.moveTo(cx+rx,cy);ctx.ellipse(cx,cy,rx,ry,0,0,TAU);
    }
  }

  function drawCloud({x,y,w=3,h=1,alpha=1,face=true}={}){
    ctx.save();ctx.globalAlpha*=alpha;
    photoShape(18,()=>cloudPath(x,y,w,h),x-.14,y-.1,w+.28,h*1.2);
    ctx.save();cloudPath(x,y,w,h);ctx.clip();wetShade(x,y,w,h,.18);ctx.restore();
    // Small wet noodle curls describe the silhouette, rather than hard outlines.
    for(let i=0;i<Math.ceil(w/.62);i++){
      const px=x+.23+i*.62;
      if(px>x+w-.08)break;
      coil(px,y+h*.7,.23,Math.min(.19,h*.24),'pale',.035,1.15);
    }
    for(let k=0;k<2;k++){
      const points=[];for(let j=0;j<=Math.ceil(w/.18);j++){const px=x+w*j/Math.ceil(w/.18);points.push([px,y+h*(.78+k*.08)+Math.sin(px*7+k)*.024]);}
      strand(points,.033,'pale',.65);
    }
    if(face&&w>=1.15){
      for(const dx of[-.16,.16])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,y+h*.43,.043,Math.min(.1,h*.14),0,0,TAU)},x+w*.5+dx-.05,y+h*.3,.1,h*.28);
    }
    ctx.restore();
  }

  function drawCloudSurface(cloud,camera=-1e9,viewWidth=2e9){
    if(Array.isArray(cloud)){for(const c of cloud)drawCloudSurface(c,camera,viewWidth);return;}
    if(!cloud||cloud.removed)return;
    const left=Math.max(cloud.x,Math.floor(camera)-1),right=Math.min(cloud.x+cloud.w,Math.ceil(camera+viewWidth)+1),h=cloud.h??1;
    for(let x=left;x<right;x+=2){
      const w=Math.min(2,right-x);
      drawCloud({x,y:cloud.y+.025,w,h,face:w>1.25});
    }
  }

  function drawCloudPlatform(platform){
    if(!platform||platform.removed)return;
    const p=platform,now=getTime(),h=Math.max(.62,p.visualHeight??p.h??.62);
    drawCloud({x:p.x,y:p.y+.015,w:p.w??3,h,face:true});
    // Trailing strands follow the motion direction and drag behind the carrier.
    const speed=p.vx??((p.dx??0)*120),tail=clamp(speed*.017,-.12,.12);
    for(let k=0;k<4;k++){
      const x=p.x+.3+k*((p.w??3)-.6)/3,yy=p.y+h*.83;
      strand([[x,yy],[x-tail*.4,yy+.17],[x-tail+Math.sin(now*3.2+k)*.025,yy+.3+hash(k)*.1]],.035,'pale');
    }
  }

  function drawFence({x,y=12,w=3,h=1}={}){
    if(!(w>0&&h>0))return;
    for(const f of[.28,.72]){
      photoShape(20,()=>{ctx.beginPath();ctx.roundRect(x,y+h*f-.055,w,.11,.05)},x,y+h*f-.055,w,.11);
      strand([[x,y+h*f-.026],[x+w*.5,y+h*f-.03],[x+w,y+h*f-.025]],.033,'pale',.9);
    }
    for(let px=x+.1;px<x+w;px+=.5){
      photoShape(20,()=>{ctx.beginPath();ctx.roundRect(px-.065,y+.025,.13,h-.025,.06)},px-.065,y,.13,h);
      for(let k=0;k<2;k++){
        const points=[];for(let j=0;j<=10;j++)points.push([px+(k-.5)*.038+Math.sin(j*1.6+k*Math.PI)*.018,y+.04+j*(h-.08)/10]);
        strand(points,.032,'gold');
      }
      coil(px,y+.06,.045,.035,'pale',.025);
    }
  }

  function drawSceneryTree({x,y,w=1,h=2}={}){
    const crownH=Math.max(.75,h-.8),cx=x+w*.5;
    photoShape(20,()=>{ctx.beginPath();ctx.roundRect(cx-.085,y+crownH*.62,.17,h-crownH*.62,.06)},cx-.085,y+crownH*.62,.17,h-crownH*.62);
    for(let k=0;k<3;k++)strand([[cx+(k-1)*.05,y+crownH*.68],[cx+(k-1)*.045+Math.sin(k)*.025,y+h-.45],[cx+(k-1)*.055,y+h]],.035,'gold');
    const shape=()=>{ctx.beginPath();ctx.moveTo(cx,y);ctx.bezierCurveTo(x-.08,y+.05,x-.14,y+crownH*.75,x+.12,y+crownH*.94);ctx.quadraticCurveTo(cx,y+crownH*1.04,x+w-.12,y+crownH*.94);ctx.bezierCurveTo(x+w+.14,y+crownH*.75,x+w+.08,y+.05,cx,y);ctx.closePath();};
    photoShape(19,shape,x-.12,y,w+.24,crownH*1.04);
    ctx.save();shape();ctx.clip();wetShade(x,y,w,crownH,.17);ctx.restore();
    for(let k=0;k<5;k++){
      const f=k/4,px=x+w*(.15+f*.7),bulge=(f-.5)*.14;
      strand([[cx+(f-.5)*w*.22,y+.06],[px+bulge,y+crownH*.35],[px,y+crownH*.77],[cx+(f-.5)*w*.5,y+crownH*.96]],.039,'green',.85);
    }
    coil(cx,y+.17,.12,.14,'green',.03,1.2);
  }

  function vineState(vine,player){
    const now=getTime();let state=vineMotion.get(vine);
    if(!state){state={bend:0,velocity:0,time:now};vineMotion.set(vine,state);}
    const holding=!!player?.climbing&&(!player.vineId||player.vineId===vine.id);
    const target=holding?clamp(((player.x+player.w*.5)-(vine.x+vine.w*.5))*.24,-.13,.13):0;
    const dt=clamp(now-state.time,0,1/24);state.time=now;
    state.velocity+=((target-state.bend)*105-state.velocity*19)*dt;state.bend+=state.velocity*dt;
    state.bend=clamp(state.bend,-.16,.16);
    return {state,holding,handY:holding?player.y+player.h*.4:(vine.y+(vine.h??0)*.5)};
  }

  function drawVine(vine,player){
    if(!vine||vine.removed||vine.active===false||!(vine.h>0))return;
    const now=getTime(),x=vine.x,w=vine.w??.3,top=vine.y,base=vine.baseY??top+vine.h;
    const {state,holding,handY}=vineState(vine,player);
    const center=yy=>x+w*.5+Math.sin((base-yy)*2.6-now*1.6)*.012+state.bend*Math.exp(-(((yy-handY)/1.3)**2));
    const steps=Math.max(6,Math.ceil(vine.h*10)),points=[];
    for(let i=0;i<=steps;i++){const y=top+(base-top)*i/steps;points.push([center(y),y]);}
    photoShape(19,()=>{
      ctx.beginPath();for(let i=0;i<points.length;i++){const[p,y]=points[i];if(!i)ctx.moveTo(p-w*.4,y);else ctx.lineTo(p-w*.4,y);}
      for(let i=points.length-1;i>=0;i--)ctx.lineTo(points[i][0]+w*.4,points[i][1]);ctx.closePath();
    },x-.18,top,w+.36,base-top);
    for(let k=0;k<3;k++)strand(points.map(([px,y])=>[px+(k-1)*w*.24+Math.sin((base-y)*7+k*2.1)*.022,y]),.046,'green',.93);
    let leaf=0;
    for(let yy=base-.4;yy>top+.16;yy-=.5){
      const side=(leaf++%2?1:-1),cx=center(yy),length=.55+hash(leaf+vine.x)*.12;
      const sway=Math.sin(now*2.4+yy*2.7)*.022+(holding?state.bend*.2:0);
      photoShape(19,()=>{ctx.beginPath();ctx.moveTo(cx,yy+.16);ctx.bezierCurveTo(cx+side*.17,yy-.12,cx+side*(length*.7),yy-.2+sway,cx+side*length,yy-.08+sway);ctx.bezierCurveTo(cx+side*(length*.72),yy+.26+sway,cx+side*.23,yy+.34,cx,yy+.16);ctx.closePath();},cx+(side<0?-length:0),yy-.22,length,.6);
      const endX=cx+side*length,endY=yy-.08+sway;
      strand([[cx,yy+.16],[cx+side*.24,yy+.11],[endX,endY]],.047,'green');
      strand([[cx+side*.06,yy+.12],[cx+side*.22,yy-.08],[endX,endY]],.031,'green',.9);
      strand([[cx+side*.08,yy+.18],[cx+side*.3,yy+.26],[endX,endY]],.031,'green',.9);
    }
    // The tender growing tip is a coiled noodle, with a short dangling end.
    const tip=center(top+.06),curl=Math.min(.13,Math.max(.045,vine.h*.18));
    coil(tip+curl*.5,top+.08,curl,.1,'green',.043,1.15);
    strand([[tip,top+.06],[tip+.035,top-.08],[tip+.1+Math.sin(now*2.7)*.018,top-.13]],.035,'green');
  }

  function drawVineGrip(vine,player){
    if(!vine||!player?.climbing||player.vineId&&player.vineId!==vine.id)return;
    const state=vineMotion.get(vine),now=getTime(),x=vine.x+(vine.w??.3)*.5+(state?.bend??0);
    const hand=player.x+player.w*.5,cy=player.y+player.h*.37;
    for(let k=0;k<2;k++){
      const y=cy+k*player.h*.25+Math.sin((player.climbTime??now)*5+k)*.015;
      strand([[hand+(player.facing>0?-.08:.08),y-.035],[x+(hand>x?.15:-.15),y-.04],[x,y+.03],[x+(hand>x?-.09:.09),y]],.05,'pale');
      coil(x,y+.025,.1,.055,'pale',.035,1.1);
    }
  }

  function springRing(x,y,rx,ry){
    const thickness=Math.min(.085,ry*.66);
    photoShape(20,()=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.moveTo(x+rx-thickness,y);ctx.ellipse(x,y,rx-thickness,Math.max(.01,ry-thickness),0,0,TAU,true);},x-rx,y-ry,rx*2,ry*2);
    const points=[];for(let i=0;i<=16;i++){const a=Math.PI+i/16*Math.PI;points.push([x+Math.cos(a)*(rx-.012),y+Math.sin(a)*(ry-.01)]);}
    strand(points,.019,'pale',.72);
  }

  function drawSpringboard(spring){
    if(!spring||spring.removed||spring.active===false)return;
    const s=spring,x=s.x,w=s.w??1,y=s.y,h=s.h??2,base=s.baseY??y+h;
    const compression=clamp(s.compression??0,0,1),top=y+.13,bottom=base-.16;
    const height=Math.max(.15,bottom-top),turns=6,step=height/turns,now=getTime();
    const flex=s.phase==='release'?Math.sin(now*23)*compression*.025:0;
    // Loops actually flatten and stack as the collision surface compresses.
    for(let i=0;i<turns;i++){
      const yy=bottom-step*(i+.5),px=x+w*.5+Math.sin(i*1.3)*flex;
      springRing(px,yy,w*.39,Math.max(.047,Math.min(.14,step*.62)));
    }
    for(const yy of[y,base-.15]){
      photoShape(6,()=>{ctx.beginPath();ctx.roundRect(x-.09,yy,w+.18,.15,.06)},x-.09,yy,w+.18,.15);
      for(let k=0;k<3;k++)strand([[x-.07,yy+.035+k*.04],[x+w*.5,yy+.027+k*.04],[x+w+.07,yy+.035+k*.04]],.042,k===0?'pale':'red');
    }
    for(const side of[-1,1]){
      const px=x+w*.5+side*w*.4;
      strand([[px,y+.11],[px+side*.09,y+.23],[px+side*(.06+compression*.1),y+.28+Math.sin(now*4+side)*.015]],.034,'gold');
    }
  }

  return {drawOverworldBackdrop,drawCloud,drawCloudSurface,drawCloudPlatform,drawFence,drawSceneryTree,drawVine,drawVineGrip,drawSpringboard};
}
