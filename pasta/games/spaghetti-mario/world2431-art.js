// World 2–4 and World 3–1: new macro-food photographs, moonlit pasta,
// spring compression and damped loose strands on the moving hazards.
export function createWorld2431Art({ctx,material,strand,coil,photoShape,drawSprite,getTime=()=>0}) {
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const motions=new WeakMap(),bridgeMotion=new WeakMap();
  const CLOUDS=[[27,2,3],[45,2,3],[75,2,3],[93,2,3],[123,2,3],[141,2,3],[171,2,3],[189,2,3],[219,2,3],[18,3,3],[30,3,4],[48,3,4],[66,3,3],[78,3,4],[96,3,4],[114,3,3],[126,3,4],[144,3,4],[162,3,3],[174,3,4],[192,3,4],[210,3,3],[222,3,4]];
  const FENCES=[[14,12,4],[41,12,1],[62,12,4],[110,12,4],[134,12,2],[158,12,4],[182,12,1],[209,12,1]];
  const TREES=[[11,14],[23,14],[24,14],[40,14],[59,14],[71,14],[72,14],[107,14],[119,14],[120,14],[136,14],[155,14],[167,14],[168,14],[203,14],[215,14],[216,14],[13,15],[21,15],[43,15],[61,15],[69,15],[91,15],[109,15],[117,15],[157,15],[165,15],[213,15]];

  function lightShade(x,y,w,h,bright=.12,dark=.2){
    const g=ctx.createLinearGradient(x,y,x+w*.8,y+h);
    g.addColorStop(0,`rgba(219,238,255,${bright})`);g.addColorStop(.43,'rgba(220,240,255,0)');g.addColorStop(1,`rgba(3,9,22,${dark})`);
    ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  }

  function glow(x,y,r=1,power=.18){
    ctx.save();ctx.globalCompositeOperation='screen';
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,208,104,${power})`);g.addColorStop(.3,`rgba(255,103,26,${power*.57})`);g.addColorStop(1,'rgba(160,25,0,0)');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }

  // Each tail is a short Verlet chain. Anchor movement, inertia, gravity,
  // damping and repeated distance constraints produce the noodle motion.
  function looseStrand(owner,key,x,y,length,width,palette,{gravity=13,air=.984,alpha=1,side=0}={}){
    if(!owner)return;
    const now=getTime(),links=7,rest=length/links;
    let entries=motions.get(owner);if(!entries){entries=new Map();motions.set(owner,entries);}
    let m=entries.get(key);
    if(!m||Math.hypot(x-m.anchorX,y-m.anchorY)>2){
      const angle=side*.2;
      const points=Array.from({length:links+1},(_,i)=>({x:x+Math.sin(angle)*i*rest,y:y+Math.cos(angle)*i*rest,px:x+Math.sin(angle)*i*rest,py:y+Math.cos(angle)*i*rest}));
      m={points,time:now,anchorX:x,anchorY:y};entries.set(key,m);
    }
    let duration=clamp(now-m.time,0,1/24);m.time=now;m.anchorX=x;m.anchorY=y;
    const steps=Math.max(1,Math.ceil(duration*120)),dt=duration/steps;
    for(let sub=0;duration>0&&sub<steps;sub++){
      const ps=m.points;
      for(let i=1;i<ps.length;i++){
        const p=ps[i],vx=(p.x-p.px)*Math.pow(air,dt*120),vy=(p.y-p.py)*Math.pow(air,dt*120);
        p.px=p.x;p.py=p.y;p.x+=vx+Math.sin(now*2+i)*dt*dt*.2;p.y+=vy+gravity*dt*dt;
      }
      for(let pass=0;pass<7;pass++){
        ps[0].x=x;ps[0].y=y;
        for(let i=1;i<ps.length;i++){
          const a=ps[i-1],b=ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8,correction=(d-rest)/d;
          if(i===1){b.x-=dx*correction;b.y-=dy*correction;}else{a.x+=dx*correction*.5;a.y+=dy*correction*.5;b.x-=dx*correction*.5;b.y-=dy*correction*.5;}
        }
      }
      // A final anchored projection removes accumulated extension while
      // retaining the inertial bend of each strand.
      ps[0].x=x;ps[0].y=y;
      for(let i=1;i<ps.length;i++){
        const a=ps[i-1],b=ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8;
        b.x=a.x+dx/d*rest;b.y=a.y+dy/d*rest;
      }
    }
    strand(m.points.map(p=>[p.x,p.y]),width,palette,alpha);
  }

  function drawNightBackdrop({camera=0,viewWidth=20,sky=false}={}){
    const parallax=sky?.025:.045,tw=7,th=5,offset=camera*(1-parallax),first=Math.floor(camera*parallax/tw)*tw;
    for(let x=first;x<camera*parallax+viewWidth+tw;x+=tw)for(let y=0;y<15;y+=th){
      const flip=(Math.round(x/tw)+Math.round(y/th))%2!==0;
      ctx.save();ctx.translate(x+offset+(flip?tw:0),y);ctx.scale(flip?-1:1,1);material(25,0,0,tw,th);ctx.restore();
    }
    const g=ctx.createLinearGradient(0,0,0,15);
    g.addColorStop(0,'#02030bd1');g.addColorStop(.37,'#030712a8');g.addColorStop(1,'#03050dcc');ctx.fillStyle=g;ctx.fillRect(camera,0,viewWidth,15);
    // Moonlight is illumination on black-blue strands. The original black
    // sky gains no added moon, stars, solid scenery or non-pasta objects.
    const light=ctx.createRadialGradient(camera+viewWidth*.72,1,0,camera+viewWidth*.72,1,viewWidth*.85);
    light.addColorStop(0,'rgba(102,149,205,.065)');light.addColorStop(1,'rgba(102,149,205,0)');ctx.fillStyle=light;ctx.fillRect(camera,0,viewWidth,15);
  }

  function cloudPath(x,y,w,h){
    ctx.beginPath();ctx.moveTo(x+.05,y+h*.97);ctx.lineTo(x+.05,y+h*.55);
    const n=Math.max(2,Math.round(w));
    for(let i=0;i<n;i++){
      const xx=x+i*w/n,cw=w/n;
      ctx.bezierCurveTo(xx-.06,y+h*.16,xx+cw*.22,y-.05,xx+cw*.5,y+h*.14);
      ctx.bezierCurveTo(xx+cw*.75,y-h*.02,xx+cw+0.08,y+h*.17,xx+cw-.02,y+h*.56);
    }
    ctx.lineTo(x+w-.02,y+h*.97);ctx.closePath();
  }

  function drawNightCloud({x=0,y=0,w=3,h=2,face=true,alpha=1}={}){
    ctx.save();ctx.globalAlpha*=alpha;
    photoShape(27,()=>cloudPath(x,y,w,h),x-.1,y-.08,w+.2,h*1.15);
    ctx.save();cloudPath(x,y,w,h);ctx.clip();lightShade(x,y,w,h,.24,.27);ctx.restore();
    for(let k=0;k<Math.ceil(w/.54);k++){
      const xx=x+.22+k*.54;if(xx>x+w-.08)break;
      coil(xx,y+h*.7,.205,Math.min(.2,h*.25),'pale',.034,1.15);
    }
    for(let k=0;k<2;k++){
      const points=[];for(let j=0;j<=Math.ceil(w*6);j++)points.push([x+j*w/Math.ceil(w*6),y+h*(.79+k*.08)+Math.sin(j*.7+k)*.018]);
      strand(points,.031,k?'ice':'pale',.75);
    }
    if(face&&w>1.2)for(const dx of[-.17,.17])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,y+h*.43,.045,Math.min(.1,h*.14),0,0,TAU)},x+w*.5+dx-.05,y+h*.29,.1,h*.28);
    ctx.restore();
  }

  function drawNightCloudSurface(cloud,camera=-1e9,viewWidth=2e9){
    if(Array.isArray(cloud)){for(const c of cloud)drawNightCloudSurface(c,camera,viewWidth);return;}
    if(!cloud||cloud.removed)return;
    const left=Math.max(cloud.x,Math.floor(camera)-1),right=Math.min(cloud.x+cloud.w,Math.ceil(camera+viewWidth)+1);
    for(let x=left;x<right;x+=2)drawNightCloud({x,y:cloud.y+.025,w:Math.min(2,right-x),h:cloud.h??1,face:right-x>1.2});
  }

  function drawNightCloudPlatform(p){
    if(!p||p.removed)return;
    const w=p.w??3,h=Math.max(.6,p.visualHeight??p.h??.6);
    drawNightCloud({x:p.x,y:p.y+.015,w,h});
    for(let k=0;k<4;k++)looseStrand(p,'cloud'+k,p.x+.3+k*(w-.6)/3,p.y+h*.83,.24+hash(k)*.12,.034,'pale',{gravity:8,air:.978});
  }

  function drawFence(x,y,w){
    for(const yy of[y+.28,y+.72]){
      photoShape(27,()=>{ctx.beginPath();ctx.roundRect(x,yy-.05,w,.1,.045)},x,yy-.05,w,.1);
      strand([[x,yy-.025],[x+w*.5,yy-.031],[x+w,yy-.025]],.027,'ice',.8);
    }
    for(let px=x+.1;px<x+w;px+=.5){
      photoShape(27,()=>{ctx.beginPath();ctx.roundRect(px-.05,y+.025,.1,.975,.045)},px-.05,y,.1,1);
      strand([[px,y+.04],[px+.014,y+.47],[px,y+.98]],.03,'pale');
    }
  }

  function drawSnowTree(x,type){
    const y=type===15?10:11,w=1,h=type===15?3:2,cx=x+.5,crownH=h-.72,trunkTop=y+crownH*.68;
    photoShape(24,()=>{ctx.beginPath();ctx.roundRect(cx-.08,trunkTop,.16,y+h-trunkTop,.05)},cx-.08,trunkTop,.16,y+h-trunkTop);
    for(let k=0;k<3;k++)strand([[cx+(k-1)*.047,trunkTop],[cx+(k-1)*.047+.015,y+h-.45],[cx+(k-1)*.047,y+h]],.032,'ice');
    const shape=()=>{ctx.beginPath();ctx.moveTo(cx,y);if(type===14){ctx.quadraticCurveTo(x+.13,y+.11,x+.04,y+crownH*.83);ctx.quadraticCurveTo(cx,y+crownH*1.07,x+.96,y+crownH*.83);ctx.quadraticCurveTo(x+.87,y+.11,cx,y);}else{ctx.bezierCurveTo(x-.12,y+.05,x-.14,y+crownH*.83,x+.12,y+crownH*.95);ctx.quadraticCurveTo(cx,y+crownH*1.1,x+.88,y+crownH*.95);ctx.bezierCurveTo(x+1.14,y+crownH*.83,x+1.12,y+.05,cx,y);}ctx.closePath();};
    photoShape(27,shape,x-.1,y-.02,w+.2,crownH*1.1);ctx.save();shape();ctx.clip();lightShade(x,y,w,crownH,.2,.2);ctx.restore();
    for(let k=0;k<5;k++){
      const f=k/4,px=x+.14+f*.72;
      strand([[cx+(f-.5)*.18,y+.04],[px,y+crownH*.35],[px+(f-.5)*.04,y+crownH*.76],[cx+(f-.5)*.55,y+crownH*.98]],.035,'pale',.9);
    }
  }

  function drawNightScenery({camera=0,viewWidth=20}={}){
    for(const[x,y,w]of CLOUDS)if(x+w>camera-1&&x<camera+viewWidth+1){ctx.save();ctx.beginPath();ctx.rect(0,0,225,15);ctx.clip();drawNightCloud({x,y,w,h:2});ctx.restore();}
    for(const[x,y,w]of FENCES)if(x+w>camera-1&&x<camera+viewWidth+1)drawFence(x,y,w);
    for(const[x,type]of TREES)if(x+1>camera-1&&x<camera+viewWidth+1)drawSnowTree(x,type);
  }

  function drawCastleBackdrop({camera=0,viewWidth=20}={}){
    const now=getTime(),tw=6,th=5,parallax=.04,offset=camera*(1-parallax),first=Math.floor(camera*parallax/tw)*tw;
    for(let x=first;x<camera*parallax+viewWidth+tw;x+=tw)for(let y=0;y<15;y+=th){
      const flip=(Math.round(x/tw)+Math.round(y/th))%2!==0;
      ctx.save();ctx.translate(x+offset+(flip?tw:0),y);ctx.scale(flip?-1:1,1);material(26,0,0,tw,th);ctx.restore();
    }
    const g=ctx.createLinearGradient(0,0,0,15);g.addColorStop(0,'#01030aeb');g.addColorStop(.5,'#01030ac8');g.addColorStop(1,'#1607059b');ctx.fillStyle=g;ctx.fillRect(camera,0,viewWidth,15);
    const warm=ctx.createLinearGradient(0,8,0,15);warm.addColorStop(0,'rgba(255,103,18,0)');warm.addColorStop(1,`rgba(230,76,14,${.07+Math.sin(now*1.3)*.015})`);ctx.fillStyle=warm;ctx.fillRect(camera,8,viewWidth,7);
  }

  function drawPodoboo(p){
    if(!p||p.removed||p.hidden||p.active===false||p.y>15.3)return;
    // The NES sprite origin includes a blank upper half-tile. Keeping that
    // offset places the small original contact core inside the noodle body.
    const w=p.w??1,h=p.h??1,bodyY=p.y+.5,cx=p.x+w*.5,cy=bodyY+h*.5,now=getTime();
    glow(cx,cy,1.5,.22);
    for(let k=0;k<5;k++)looseStrand(p,'lava'+k,cx+(k-2)*w*.105,cy+h*.28,.24+hash(k+7)*.19,.038,k%2?'gold':'red',{gravity:10,air:.98,alpha:.93,side:k-2});
    ctx.save();ctx.translate(cx,cy);ctx.rotate(clamp(p.vy??0,-14,14)*.008);ctx.translate(-cx,-cy);
    drawSprite(14,p.x-.035,bodyY-.035,w+.07,h+.07,{flipY:(p.vy??0)>0,squash:Math.sin(now*6+p.x)*.018,wiggle:.012});ctx.restore();
    for(let k=0;k<2;k++)coil(cx+(k-.5)*.24,cy-.1,.12,.14,k?'gold':'pale',.035,1.2);
  }

  function drawHammerBro(e){
    if((e?.kind||e?.type)!=='hammerbro')return false;
    if(e.removed||e.hidden||e.dead&&e.deathTimer<=0)return true;
    const w=e.w??.92,h=e.h??1.6,side=e.facing??-1,now=getTime(),walk=e.walk??now*3;
    drawSprite(e.throwPose?20:19,e.x-.1,e.y-.07,w+.2,h+.1,{flip:side>0,flipY:!!e.flipped,squash:e.dead?0:Math.sin(walk)*.012,wiggle:e.dead?.012:.009,alpha:e.dead?.82:1});
    if(!e.dead){
      const px=e.x+w*(side<0?.43:.57),yy=e.y+h*.28;
      looseStrand(e,'helmetA',px,yy,.21,.031,'pale',{gravity:17,air:.982,side});
      looseStrand(e,'helmetB',px+side*.045,yy+.01,.18,.026,'pale',{gravity:17,air:.982,side});
    }
    return true;
  }

  function drawHammer(h){
    if(!h||h.removed||h.hidden||h.held)return;
    const w=h.w??.5,hh=h.h??.5,cx=h.x+w*.5,cy=h.y+hh*.5;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(h.angle??getTime()*9);drawSprite(21,-w*.62,-hh*.67,w*1.24,hh*1.34,{wiggle:.004});ctx.restore();
  }

  function drawSpringboard(s){
    if(!s||s.removed||s.active===false)return;
    const x=s.x,y=s.y,w=s.w??1,base=s.baseY??y+(s.h??2),compression=clamp(s.compression??0,0,1);
    const top=y+.13,bottom=base-.15,available=Math.max(.16,bottom-top),step=available/6;
    for(let k=0;k<6;k++){
      const yy=bottom-step*(k+.5),ry=Math.max(.038,Math.min(.14,step*.64)),rx=w*.39+compression*.035;
      photoShape(27,()=>{ctx.beginPath();ctx.ellipse(x+w*.5,yy,rx,ry,0,0,TAU);ctx.moveTo(x+w*.5+rx-.075,yy);ctx.ellipse(x+w*.5,yy,Math.max(.02,rx-.075),Math.max(.009,ry-.065),0,0,TAU,true);},x+w*.5-rx,yy-ry,rx*2,ry*2);
      const pts=[];for(let j=0;j<=16;j++){const a=Math.PI+j/16*Math.PI;pts.push([x+w*.5+Math.cos(a)*(rx-.013),yy+Math.sin(a)*(ry-.012)]);}strand(pts,.031,'pale',.85);
    }
    for(const yy of[y,base-.15]){
      photoShape(28,()=>{ctx.beginPath();ctx.roundRect(x-.08,yy,w+.16,.15,.06)},x-.08,yy,w+.16,.15);
      for(let k=0;k<3;k++)strand([[x-.06,yy+.035+k*.038],[x+w*.5,yy+.03+k*.038],[x+w+.06,yy+.035+k*.038]],.036,k===0?'pale':'green');
    }
    for(let k=0;k<2;k++)looseStrand(s,'spring'+k,x+(k?w:.0),y+.11,.16+compression*.07,.03,'pale',{gravity:20,air:.976,side:k?1:-1});
  }

  function drawPond(pond,camera=-1e9,viewWidth=2e9){
    if(Array.isArray(pond)){for(const p of pond)drawPond(p,camera,viewWidth);return;}
    if(!pond)return;
    const left=Math.max(pond.x,camera-.2),right=Math.min(pond.x+pond.w,camera+viewWidth+.2),y=pond.y??12,h=pond.h??3,now=getTime();
    if(right<=left)return;
    ctx.save();ctx.beginPath();ctx.rect(left,y,right-left,h);ctx.clip();
    for(let xx=Math.floor(left/3)*3;xx<right;xx+=3)material(21,xx,y,3,h);
    const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#7bc4ea33');g.addColorStop(1,'#01091cc5');ctx.fillStyle=g;ctx.fillRect(left,y,right-left,h);
    for(let k=0;k<9;k++){
      const yy=y+.055+k*h/9,pts=[];
      for(let xx=left-.05;xx<=right+.1;xx+=.16)pts.push([xx,yy+Math.sin(xx*3.3-now*.8+k)*.03+Math.sin(xx*7+now*.4+k)*.016]);
      strand(pts,k===0?.049:.037,k===0?'pale':'ice',k<2?.85:.45);
    }
    ctx.restore();
  }

  function drawNightBridge(b,{camera=-1e9,viewWidth=2e9}={}){
    if(!b||b.removed)return;
    const x=b.x,y=b.y,w=b.w??1,h=b.h??1,left=Math.max(x,Math.floor(camera)-1),right=Math.min(x+w,Math.ceil(camera+viewWidth)+1),now=getTime();
    if(right<=left)return;
    let m=bridgeMotion.get(b);if(!m){m={time:now,bend:0,v:0};bridgeMotion.set(b,m);}
    const dt=clamp(now-m.time,0,1/24);m.time=now;m.v+=((clamp(b.load??0,0,1)*.065-m.bend)*85-m.v*16)*dt;m.bend+=m.v*dt;
    for(let px=Math.ceil(left*2)/2;px<=right;px+=.5)strand([[px,y-.91],[px+.009,y-.43],[px,y+.01]],.056,'pale');
    for(const yy of[y-.88,y-.43])strand([[left,yy],[left+(right-left)*.5,yy+m.bend*.15],[right,yy]],.06,'pale');
    for(let xx=left;xx<right;xx+=1){
      const ww=Math.min(1,right-xx);photoShape(23,()=>{ctx.beginPath();ctx.roundRect(xx,y,ww,h,.035)},xx,y,ww,h);
      ctx.save();ctx.beginPath();ctx.rect(xx,y,ww,h);ctx.clip();lightShade(xx,y,ww,h,.14,.3);ctx.restore();
      for(let k=0;k<5;k++){
        const pts=[];for(let j=0;j<=8;j++){const f=j/8;pts.push([xx+f*ww,y+.065+k*(h-.13)/4+Math.sin(f*Math.PI)*m.bend*(k/4)]);}strand(pts,.052,k===0?'pale':'gold',k===0?1:.72);
      }
      for(const px of[xx+.08,xx+ww-.08]){coil(px,y+h*.5,.045,h*.44,'gold',.036,1.1);looseStrand(b,'bridge'+px,px,y+h-.035,.24,.032,'gold',{gravity:17,air:.982});}
    }
  }

  function drawRevealedBoss(b){
    if(!b||b.removed||b.active===false||b.y>17)return false;
    if(!(b.revealed||b.revealedEnemy||b.revealedKind||b.defeatCause==='fire'&&b.dead))return false;
    const w=b.w??2,h=b.h??2;
    drawSprite(2,b.x+w*.2,b.y+h*.18,w*.64,h*.68,{flip:b.facing>0,flipY:!!b.dead,wiggle:.012});return true;
  }

  return {drawNightBackdrop,drawNightScenery,drawNightCloud,drawNightCloudSurface,drawNightCloudPlatform,drawCastleBackdrop,drawPodoboo,drawHammerBro,drawHammer,drawSpringboard,drawPond,drawNightBridge,drawRevealedBoss};
}
