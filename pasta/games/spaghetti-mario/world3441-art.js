// World 3–4 and World 4–1: photographed spaghetti sculptures and short
// constrained noodle strands. Rendering follows simulation time and never
// changes collision geometry, enemy timing, velocities or gameplay state.
export function createWorld3441Art({ctx,material,strand,coil,photoShape,drawSprite,getTime=()=>0}) {
  const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const motion=new WeakMap(),poses=new WeakMap();
  const CLOUDS=[[19,2,3],[36,2,4],[67,2,3],[84,2,4],[115,2,3],[132,2,4],[163,2,3],[180,2,4],[211,2,3],[228,2,4],[8,3,3],[27,3,5],[56,3,3],[75,3,5],[104,3,3],[123,3,5],[152,3,3],[171,3,5],[200,3,3],[219,3,5],[248,3,2]];
  const HILL_CELLS=[[50,10,7],[98,10,7],[146,10,7],[194,10,7],[242,10,7],[17,11,7],[49,11,5],[50,11,6],[51,11,8],[65,11,7],[97,11,5],[98,11,6],[99,11,8],[113,11,7],[145,11,5],[146,11,6],[147,11,8],[161,11,7],[193,11,5],[194,11,6],[195,11,8],[241,11,5],[242,11,6],[243,11,8],[16,12,5],[17,12,6],[18,12,8],[48,12,5],[49,12,6],[50,12,10],[51,12,9],[52,12,8],[64,12,5],[65,12,6],[66,12,8],[96,12,5],[97,12,6],[98,12,10],[99,12,9],[100,12,8],[112,12,5],[113,12,6],[114,12,8],[144,12,5],[145,12,6],[146,12,10],[147,12,9],[148,12,8],[160,12,5],[161,12,6],[162,12,8],[192,12,5],[193,12,6],[194,12,10],[195,12,9],[196,12,8],[240,12,5],[241,12,6],[242,12,10],[243,12,9],[244,12,8]];
  const HILL_PEAKS=[[50,10],[98,10],[146,10],[194,10],[242,10],[17,11],[65,11],[113,11],[161,11]];
  const BUSH_CELLS=[[11,12,2],[12,12,3],[13,12,3],[14,12,3],[15,12,4],[23,12,2],[24,12,3],[25,12,4],[41,12,2],[42,12,3],[43,12,3],[44,12,4],[59,12,2],[60,12,3],[61,12,3],[62,12,3],[63,12,4],[71,12,2],[72,12,3],[73,12,4],[89,12,2],[90,12,3],[91,12,3],[92,12,4],[107,12,2],[108,12,3],[109,12,3],[110,12,3],[111,12,4],[119,12,2],[120,12,3],[121,12,4],[137,12,2],[138,12,3],[139,12,3],[140,12,4],[155,12,2],[156,12,3],[157,12,3],[158,12,3],[159,12,4],[167,12,2],[168,12,3],[169,12,4],[185,12,2],[186,12,3],[187,12,3],[188,12,4],[203,12,2],[204,12,3],[205,12,3],[206,12,3],[207,12,4],[217,12,4],[234,12,3],[235,12,3],[236,12,4]];

  function tiles(index,x,y,w,h,size=.85){
    // Square photographic cells retain round, visibly separate noodle strands
    // when the enclosing silhouette is wider or thinner than the photograph.
    const left=Math.floor(x/size)*size,top=Math.floor(y/size)*size;
    for(let yy=top;yy<y+h;yy+=size)for(let xx=left;xx<x+w;xx+=size)material(index,xx,yy,size,size);
  }
  function shapedPhoto(index,shape,x,y,w,h,size=.85){ctx.save();shape();ctx.clip();tiles(index,x,y,w,h,size);ctx.restore();}
  function tubePath(points,width){
    const left=[],right=[],r=width*.5;
    for(let i=0;i<points.length;i++){
      const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1;
      left.push([points[i][0]-dy/d*r,points[i][1]+dx/d*r]);right.push([points[i][0]+dy/d*r,points[i][1]-dx/d*r]);
    }
    ctx.beginPath();ctx.moveTo(...left[0]);for(let i=1;i<left.length;i++)ctx.lineTo(...left[i]);
    const e=points.at(-1);ctx.quadraticCurveTo(e[0]+(e[0]-points.at(-2)[0])*.3,e[1]+(e[1]-points.at(-2)[1])*.3,...right.at(-1));
    for(let i=right.length-2;i>=0;i--)ctx.lineTo(...right[i]);ctx.closePath();
  }
  function photoStrand(points,width,palette='pale',index=5,alpha=1){
    if(points.length<2)return;
    ctx.save();ctx.globalAlpha*=alpha;
    strand(points,width,palette,.85);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs)-width,y=Math.min(...ys)-width,w=Math.max(...xs)-x+width,h=Math.max(...ys)-y+width;
    shapedPhoto(index,()=>tubePath(points,width*.83),x,y,w,h,.3);
    const hi=points.map(p=>[p[0]-width*.14,p[1]-width*.14]);strand(hi,width*.12,palette,.65);ctx.restore();
  }
  function softStrand(owner,key,x,y,length,width,palette='pale',index=5,{gravity=12,air=.978,angle=0,impulse=0,bend=.17,mirrored=false}={}){
    const now=getTime(),links=6,rest=length/links;
    let entries=motion.get(owner);if(!entries){entries=new Map();motion.set(owner,entries);}
    let m=entries.get(key);
    if(!m||Math.hypot(x-m.ax,y-m.ay)>2){
      const ps=Array.from({length:links+1},(_,i)=>{const d=i*rest,xx=x+Math.sin(angle)*d,yy=y+Math.cos(angle)*d;return{x:xx,y:yy,px:xx,py:yy};});
      m={ps,time:now,ax:x,ay:y,lastImpulse:0,mirrored};entries.set(key,m);
    }
    if(m.mirrored!==mirrored){for(const p of m.ps){p.x+=x-m.ax;p.px+=x-m.ax;p.y=y-(p.y-m.ay);p.py=y-(p.py-m.ay);}m.mirrored=mirrored;}
    const elapsed=clamp(now-m.time,0,1/24);m.time=now;m.ax=x;m.ay=y;
    if(impulse&&!m.lastImpulse){for(let i=1;i<m.ps.length;i++){m.ps[i].px-=Math.sin(angle)*impulse*i/links;m.ps[i].py+=impulse*i/links;}}
    m.lastImpulse=impulse;
    const steps=Math.max(1,Math.ceil(elapsed*120)),dt=elapsed/steps;
    for(let sub=0;elapsed>0&&sub<steps;sub++){
      for(let i=1;i<m.ps.length;i++){
        const p=m.ps[i],vx=(p.x-p.px)*Math.pow(air,dt*120),vy=(p.y-p.py)*Math.pow(air,dt*120);
        p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+gravity*dt*dt;
        // A weak bending memory keeps a cooked spine curled while allowing
        // the tip to lag behind a changing shell or cloud anchor.
        const t=i/links,rx=x+Math.sin(angle)*i*rest,ry=y+Math.cos(angle)*i*rest;
        p.x+=(rx-p.x)*bend*dt*120*(1-t*.75);p.y+=(ry-p.y)*bend*dt*120*(1-t*.75);
      }
      for(let pass=0;pass<7;pass++){
        m.ps[0].x=x;m.ps[0].y=y;
        for(let i=1;i<m.ps.length;i++){
          const a=m.ps[i-1],b=m.ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8,f=(d-rest)/d;
          if(i===1){b.x-=dx*f;b.y-=dy*f;}else{a.x+=dx*f*.5;a.y+=dy*f*.5;b.x-=dx*f*.5;b.y-=dy*f*.5;}
        }
      }
      m.ps[0].x=x;m.ps[0].y=y;
      for(let i=1;i<m.ps.length;i++){
        const a=m.ps[i-1],b=m.ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8;b.x=a.x+dx/d*rest;b.y=a.y+dy/d*rest;
      }
    }
    photoStrand(m.ps.map(p=>[p.x,p.y]),width,palette,index);
  }
  function actorPose(e){
    const now=getTime();let p=poses.get(e);
    if(!p){p={time:now,x:e.x,y:e.y,egg:!!e.egg,squash:0,velocity:0,hatchTime:-1e6};poses.set(e,p);}
    const dt=clamp(now-p.time,0,1/24);
    if(p.egg&&!e.egg){p.velocity=2.1;p.hatchTime=now;}
    const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
    for(let i=0;dt>0&&i<steps;i++){p.velocity+=(-p.squash*145-p.velocity*17)*step;p.squash+=p.velocity*step;}
    p.egg=!!e.egg;p.x=e.x;p.y=e.y;p.time=now;
    return p;
  }
  function inactive(e){return !e||e.removed||e.active===false||e.hidden||e.dead&&e.deathTimer<=0;}
  function drawLakitu(e){
    if((e?.kind||e?.type)!=='lakitu')return false;if(inactive(e))return true;
    const w=e.w??1,h=e.h??1.5,side=e.facing??-1;
    // The full source 16×24 silhouette includes its cloud. No independent
    // sine-wave hovering or sprite slice warp moves the photographic food.
    drawSprite(e.throwPose?23:22,e.x-.06,e.y-.025,w+.12,h+.04,{flip:side>0,flipY:!!e.flipped,alpha:e.dead?.82:1});
    if(!e.dead)for(let k=0;k<4;k++)softStrand(e,'cloud'+k,e.x+.2+k*.2,e.y+h-.065,.15+(k%2)*.035,.028,'pale',5,{gravity:10,air:.977,angle:(k-1.5)*.12,bend:.018});
    return true;
  }
  function drawSpinyEgg(e){
    if((e?.kind||e?.type)!=='spiny'||!e.egg)return false;if(inactive(e))return true;
    const w=e.w??1,bodyY=e.y+.5,cx=e.x+w*.5,cy=bodyY+.5;actorPose(e);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(e.eggAngle??0);drawSprite(24,-w*.5,-.5,w,1,{flipY:!!e.flipped,alpha:e.dead?.82:1});ctx.restore();
    if(!e.dead)for(let k=0;k<3;k++){
      const a=(e.eggAngle??0)+k*TAU/3,x=cx+Math.cos(a)*.3,y=cy+Math.sin(a)*.3;
      softStrand(e,'egg'+k,x,y,.12,.027,'pale',5,{gravity:10,air:.976,angle:Math.PI*.5-a,bend:.09});
    }
    return true;
  }
  function drawSpiny(e){
    if((e?.kind||e?.type)!=='spiny')return false;if(e.egg)return drawSpinyEgg(e);if(inactive(e))return true;
    const w=e.w??1,bodyY=e.y+.5,p=actorPose(e),side=e.facing??-1,flip=side>0,compress=clamp(p.squash,-.04,.1);
    drawSprite(25,e.x-.035,bodyY-.015,w+.07,1.015,{flip,flipY:!!e.flipped,squash:compress,alpha:e.dead?.82:1});
    if(!e.dead){
      const hatch=getTime()-p.hatchTime<.05?.014:0;
      for(let k=0;k<3;k++){
        const x=e.x+w*(flip?(.63-k*.16):(.37+k*.16)),normalY=bodyY+.39+Math.abs(k-1)*.015;
        const y=e.flipped?2*(bodyY-.015)+1.015-normalY:normalY,normalAngle=Math.PI+(flip?-1:1)*(k-1)*.25;
        softStrand(e,'spine'+k,x,y,.135+(k===1?.025:0),.027,'pale',5,{gravity:3,air:.972,angle:e.flipped?Math.PI-normalAngle:normalAngle,impulse:hatch,bend:.12,mirrored:!!e.flipped});
      }
    }
    return true;
  }
  function drawRevealedBoss(b){
    if(!b||b.removed||b.active===false||b.y>17)return false;
    if((b.revealedKind||b.revealedEnemy)!=='buzzy'||!(b.revealed||b.dead))return false;
    const w=b.w??2,h=b.h??2;drawSprite(26,b.x+w*.13,b.y+h*.34,w*.74,h*.55,{flip:b.facing>0,flipY:!!b.dead});return true;
  }

  function cloudPath(x,y,w,h=2){
    ctx.beginPath();ctx.moveTo(x+.04,y+h*.96);ctx.lineTo(x+.04,y+h*.6);
    const n=Math.max(2,Math.round(w));for(let k=0;k<n;k++){
      const xx=x+k*w/n,cw=w/n;ctx.bezierCurveTo(xx-.03,y+h*.26,xx+cw*.2,y+.02,xx+cw*.5,y+h*.13);ctx.bezierCurveTo(xx+cw*.77,y-.03,xx+cw+0.06,y+h*.3,xx+cw-.02,y+h*.6);
    }
    ctx.lineTo(x+w-.02,y+h*.96);ctx.closePath();
  }
  function drawCloud(x,y,w,clipWidth=w){
    ctx.save();ctx.beginPath();ctx.rect(x-.04,y-.06,clipWidth+.04,2.1);ctx.clip();
    shapedPhoto(5,()=>cloudPath(x,y,w),x-.05,y-.05,w+.1,2.1,1);
    for(let k=0;k<w*2;k++)coil(x+.23+k*.5,y+1.44,.23,.2,'pale',.035,1.12);
    for(const dx of[-.18,.18])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,y+.93,.046,.12,0,0,TAU)},x+w*.5+dx-.06,y+.8,.12,.27);
    photoStrand([[x+.1,y+1.78],[x+w*.33,y+1.83],[x+w*.67,y+1.81],[x+w-.08,y+1.78]],.035,'pale',5,.75);ctx.restore();
  }
  function drawHill(x,y){
    const h=13-y,w=h*2-1,left=x-(h-1),right=left+w,cx=x+.5;
    ctx.save();ctx.beginPath();for(const[xx,yy]of HILL_CELLS)if(xx>=left&&xx<right)ctx.rect(xx,yy,1,1);ctx.clip();
    const shape=()=>{ctx.beginPath();ctx.moveTo(left,13);ctx.lineTo(x,y+1);ctx.quadraticCurveTo(x,y+.16,cx,y+.12);ctx.quadraticCurveTo(x+1,y+.16,x+1,y+1);ctx.lineTo(right,13);ctx.closePath();};
    shape();ctx.clip();
    shapedPhoto(3,shape,left,y,w,h,1);
    for(let k=0;k<7;k++){
      const f=k/6,px=left+.16+f*(w-.32),top=y+.19+Math.abs(f-.5)*h*1.5;
      photoStrand([[px,12.96],[px+(cx-px)*.17,(top+13)*.5],[cx+(px-cx)*.34,top]],.037,'green',3,.8);
    }
    for(const[xx,yy,tile]of HILL_CELLS)if(xx>=left&&xx<right&&(tile===9||tile===10||tile===6&&h===2)){
      for(const dx of tile===10?[.27,.7]:[.48])photoStrand([[xx+dx,yy+.37],[xx+dx-.025,yy+.53],[xx+dx+.02,yy+.62]],.055,'dark',9,.85);
    }
    ctx.restore();
  }
  function drawBushGroup(cells){
    const first=cells[0],last=cells.at(-1),left=first[0]-(first[2]===2?0:1),right=last[0]+1,w=right-left,y=12;
    ctx.save();ctx.beginPath();for(const[x,yy]of cells)ctx.rect(x,yy,1,1);ctx.clip();
    const shape=()=>{ctx.beginPath();ctx.moveTo(left,13);ctx.quadraticCurveTo(left+.01,12.34,left+.45,12.25);for(let x=left+.45;x<right-.45;x+=.55)ctx.quadraticCurveTo(x+.22,11.98,Math.min(right-.45,x+.55),12.25);ctx.quadraticCurveTo(right-.01,12.34,right,13);ctx.closePath();};
    shapedPhoto(3,shape,left,y,w,1,.8);
    for(let x=left+.22;x<right;x+=.38)coil(x,12.71,.17,.18,'green',.032,1.14);
    photoStrand([[left+.02,12.95],[left+w*.5,12.92],[right-.02,12.95]],.034,'green',3,.85);ctx.restore();
  }
  const BUSH_GROUPS=[];for(const cell of BUSH_CELLS){const group=BUSH_GROUPS.at(-1);if(!group||cell[0]!==group.at(-1)[0]+1)BUSH_GROUPS.push([cell]);else group.push(cell);}
  function drawDayScenery({camera=0,viewWidth=20}={}){
    for(const[x,y,w]of CLOUDS)if(x+w>camera-.2&&x<camera+viewWidth+.2)drawCloud(x,y,x===248?3:w,w);
    for(const[x,y]of HILL_PEAKS)if(x+3>camera&&x-3<camera+viewWidth)drawHill(x,y);
    for(const cells of BUSH_GROUPS)if(cells.at(-1)[0]+1>camera&&cells[0][0]<camera+viewWidth)drawBushGroup(cells);
  }
  return {drawLakitu,drawSpiny,drawSpinyEgg,drawRevealedBoss,drawDayScenery};
}
