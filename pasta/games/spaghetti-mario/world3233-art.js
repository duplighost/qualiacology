// Worlds 3–2 and 3–3. Photographic noodles retain the original night palette:
// pale scenery, green treetops, brown trunks and orange-brown moving boards.
// Decorative cells below come from the extracted original level grids.
export function createWorld3233Art({ctx,material,strand,coil,photoShape,getTime=()=>0,constraintPasses=48,perpendicularSeed=false}) {
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const CLOUDS32=[[27,2,3],[45,2,3],[75,2,3],[93,2,3],[123,2,3],[141,2,3],[171,2,3],[189,2,3],[219,2,3],[0,3,4],[18,3,3],[30,3,4],[48,3,4],[66,3,3],[78,3,4],[96,3,4],[114,3,3],[126,3,4],[144,3,4],[162,3,3],[174,3,4],[192,3,4],[210,3,3],[222,3,4]];
  const TREES32=[[11,14],[13,15],[21,15],[23,14],[24,14],[40,14],[43,15],[59,14],[61,15],[69,15],[71,14],[72,14],[88,14],[91,15],[107,14],[109,15],[117,15],[119,14],[120,14],[136,14],[139,15],[155,14],[157,15],[165,15],[167,14],[168,14],[184,14],[187,15],[203,14],[205,15],[232,14]];
  const FENCES32=[[14,12,4],[38,12,2],[41,12,1],[62,12,4],[86,12,2],[89,12,1],[110,12,4],[134,12,2],[137,12,1],[158,12,4],[182,12,2],[185,12,1],[206,12,3],[230,12,2],[233,12,1]];
  const CLOUDS33=[[3,3,4],[9,7,3],[18,2,4],[28,11,3],[35,7,3],[38,6,3],[46,11,3,[[0,1]]],[51,3,4],[57,7,3,[[1,0],[2,0],[1,1],[2,1]]],[66,2,4],[76,11,3,[[0,0],[1,0],[0,1],[1,1]]],[83,7,3],[86,6,3],[94,11,3],[99,3,4],[105,7,3,[[2,0],[2,1]]],[114,2,4],[131,7,3],[134,6,3],[142,11,3],[147,3,4],[153,7,3,[[0,0],[0,1]]],[162,2,4]];
  const TRUNK_RUNS=[[56,4,2],[56,5,2],[78,5,1],[56,6,2],[78,6,1],[105,6,2],[56,7,2],[78,7,1],[105,7,2],[23,8,4],[48,8,4],[56,8,2],[66,8,1],[70,8,1],[74,8,1],[78,8,1],[105,8,2],[109,8,1],[23,9,4],[48,9,4],[56,9,2],[66,9,1],[70,9,1],[74,9,1],[78,9,1],[105,9,2],[109,9,1],[23,10,4],[44,10,2],[48,10,4],[56,10,2],[66,10,1],[70,10,1],[74,10,1],[78,10,1],[98,10,1],[105,10,2],[109,10,1],[19,11,3],[23,11,4],[44,11,2],[56,11,2],[66,11,1],[70,11,1],[74,11,1],[78,11,1],[98,11,1],[105,11,2],[120,11,10],[19,12,3],[23,12,4],[44,12,2],[47,12,8],[56,12,2],[66,12,1],[70,12,1],[74,12,1],[78,12,1],[85,12,2],[98,12,1],[105,12,2],[108,12,3],[120,12,10],[19,13,3],[23,13,4],[37,13,5],[44,13,2],[47,13,8],[56,13,2],[85,13,2],[98,13,1],[105,13,2],[108,13,3],[120,13,10],[19,14,3],[23,14,4],[31,14,1],[37,14,5],[44,14,2],[47,14,8],[56,14,2],[66,14,14],[85,14,2],[98,14,1],[105,14,2],[108,14,3],[117,14,1],[120,14,10]];
  const chainStates=new WeakMap(),boardStates=new WeakMap(),pulleyStates=new WeakMap();

  function shade(x,y,w,h,bright=.16,dark=.28){
    const g=ctx.createLinearGradient(x,y,x+w*.7,y+h);
    g.addColorStop(0,`rgba(237,247,224,${bright})`);g.addColorStop(.4,'rgba(255,255,255,0)');g.addColorStop(1,`rgba(9,13,16,${dark})`);
    ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  }

  function cloudPath(x,y,w){
    ctx.beginPath();ctx.moveTo(x+.025,y+1.96);ctx.lineTo(x+.025,y+1.08);
    const n=Math.max(2,Math.round(w));
    for(let i=0;i<n;i++){
      const xx=x+i*w/n,cw=w/n;
      ctx.bezierCurveTo(xx-.04,y+.3,xx+cw*.22,y+.02,xx+cw*.5,y+.25);
      ctx.bezierCurveTo(xx+cw*.75,y+.01,xx+cw+.04,y+.31,xx+cw-.025,y+1.08);
    }
    ctx.lineTo(x+w-.025,y+1.96);ctx.closePath();
  }

  function drawCloud([x,y,w,mask]){
    ctx.save();
    // Some original clouds survive only as a fragment underneath a tree.
    // Clip those cells explicitly instead of painting the hidden cells back.
    if(mask){ctx.beginPath();for(const[dx,dy]of mask)ctx.rect(x+dx,y+dy,1,1);ctx.clip();}
    photoShape(27,()=>cloudPath(x,y,w),x-.05,y,w+.1,2);
    ctx.save();cloudPath(x,y,w);ctx.clip();shade(x,y,w,2,.22,.24);ctx.restore();
    for(let k=0;k<Math.ceil(w/.5);k++)coil(x+.23+k*.5,y+1.44,.195,.2,'pale',.034,1.18);
    for(let k=0;k<2;k++){
      const pts=[];for(let j=0;j<=w*8;j++)pts.push([x+.025+j*(w-.05)/(w*8),y+1.62+k*.15+Math.sin(j*.8+k)*.016]);
      strand(pts,.036,k?'pale':'ice',.84);
    }
    for(const dx of[-.17,.17])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,y+.85,.045,.11,0,0,TAU)},x+w*.5+dx-.05,y+.73,.1,.24);
    ctx.restore();
  }

  function drawFence(x,y,w){
    for(const yy of[y+.28,y+.72]){
      photoShape(27,()=>{ctx.beginPath();ctx.roundRect(x,yy-.05,w,.1,.045)},x,yy-.05,w,.1);
      strand([[x,yy-.025],[x+w*.5,yy-.031],[x+w,yy-.025]],.026,'pale',.9);
    }
    for(let px=x+.1;px<x+w;px+=.5){
      photoShape(27,()=>{ctx.beginPath();ctx.roundRect(px-.05,y+.025,.1,.975,.045)},px-.05,y,.1,1);
      strand([[px,y+.04],[px+.014,y+.47],[px,y+.98]],.033,'pale');
    }
  }

  function drawSceneryTree(x,type){
    const y=type===15?10:11,h=type===15?3:2,cx=x+.5,crownH=h-.72,trunkTop=y+crownH*.68;
    photoShape(27,()=>{ctx.beginPath();ctx.roundRect(cx-.08,trunkTop,.16,y+h-trunkTop,.05)},cx-.08,trunkTop,.16,y+h-trunkTop);
    for(let k=0;k<3;k++)strand([[cx+(k-1)*.047,trunkTop],[cx+(k-1)*.047+.015,y+h-.45],[cx+(k-1)*.047,y+h]],.032,'pale');
    const shape=()=>{ctx.beginPath();ctx.moveTo(cx,y);if(type===14){ctx.quadraticCurveTo(x+.13,y+.11,x+.04,y+crownH*.83);ctx.quadraticCurveTo(cx,y+crownH*1.07,x+.96,y+crownH*.83);ctx.quadraticCurveTo(x+.87,y+.11,cx,y);}else{ctx.bezierCurveTo(x-.12,y+.05,x-.14,y+crownH*.83,x+.12,y+crownH*.95);ctx.quadraticCurveTo(cx,y+crownH*1.1,x+.88,y+crownH*.95);ctx.bezierCurveTo(x+1.14,y+crownH*.83,x+1.12,y+.05,cx,y);}ctx.closePath();};
    photoShape(27,shape,x-.1,y,1.2,crownH*1.1);ctx.save();shape();ctx.clip();shade(x,y,1,crownH,.23,.2);ctx.restore();
    for(let k=0;k<5;k++){
      const f=k/4,px=x+.14+f*.72;
      strand([[cx+(f-.5)*.18,y+.04],[px,y+crownH*.35],[px+(f-.5)*.04,y+crownH*.76],[cx+(f-.5)*.55,y+crownH*.98]],.035,'pale',.9);
    }
  }

  function drawNightScenery({level='3-2',camera=0,viewWidth=20}={}){
    const cloudList=level==='3-3'?CLOUDS33:CLOUDS32;
    for(const c of cloudList)if(c[0]+c[2]>camera-1&&c[0]<camera+viewWidth+1)drawCloud(c);
    if(level==='3-3')return;
    for(const[x,y,w]of FENCES32)if(x+w>camera-1&&x<camera+viewWidth+1)drawFence(x,y,w);
    for(const[x,type]of TREES32)if(x+1>camera-1&&x<camera+viewWidth+1)drawSceneryTree(x,type);
  }

  function crownPath(x,y,w,h){
    ctx.beginPath();ctx.moveTo(x+.16,y+.015);ctx.lineTo(x+w-.16,y+.015);
    ctx.quadraticCurveTo(x+w-.015,y+.015,x+w-.015,y+.2);ctx.lineTo(x+w-.015,y+h-.21);
    ctx.quadraticCurveTo(x+w-.02,y+h+.015,x+w-.24,y+h-.045);
    const count=Math.ceil(w*2);
    for(let j=count-1;j>=0;j--){const xx=x+.2+j*(w-.4)/count;ctx.quadraticCurveTo(xx+.15,y+h+.06,xx,y+h-.045);}
    ctx.quadraticCurveTo(x+.015,y+h-.015,x+.015,y+h-.21);ctx.lineTo(x+.015,y+.2);ctx.quadraticCurveTo(x+.015,y+.015,x+.16,y+.015);ctx.closePath();
  }

  function drawTreetop(t){
    if(!t||t.removed)return;
    const x=t.x,y=t.y,w=t.w,h=t.h??1,tw=t.trunkWidth??t.trunkW??Math.max(.8,w-2),tx=t.trunkX??x+(w-tw)/2,bottom=t.trunkBottom??15.2,ty=y+h*.55,th=Math.max(.1,bottom-ty);
    ctx.save();ctx.beginPath();ctx.rect(tx,ty,tw,th);ctx.clip();
    // Original lower crowns replace the trunks of taller trees. The cell
    // mask preserves those surfaces and the surviving background fragments
    // regardless of the order in which the trees are drawn.
    ctx.beginPath();for(const[xx,yy,ww]of TRUNK_RUNS)if(xx+ww>tx&&xx<tx+tw&&yy+1>ty&&yy<bottom)ctx.rect(xx,yy,ww,1);ctx.clip();
    for(let xx=tx;xx<tx+tw;xx+=1)for(let yy=ty;yy<bottom;yy+=2)material(1,xx,yy,Math.min(1,tx+tw-xx),Math.min(2,bottom-yy));
    const g=ctx.createLinearGradient(tx,ty,tx+tw,ty);g.addColorStop(0,'#1e160e77');g.addColorStop(.22,'#fff0be16');g.addColorStop(.62,'#00000000');g.addColorStop(1,'#17191199');ctx.fillStyle=g;ctx.fillRect(tx,ty,tw,th);
    const count=Math.max(8,Math.ceil(tw/.13));
    for(let k=0;k<count;k++){
      const bx=tx+.05+k*(tw-.1)/(count-1),pts=[];
      for(let j=0;j<=Math.ceil(th*7);j++){const yy=ty+th*j/Math.ceil(th*7);pts.push([bx+Math.sin(yy*2.6+k*.79)*.026,yy]);}
      strand(pts,.051,k%5===0?'pale':'gold',k%5===0?.62:.7);
    }
    for(let k=0;k<Math.ceil(tw/.52);k++)for(const sign of[-1,1]){
      const bx=tx+.24+k*.52,pts=[];
      for(let j=0;j<=Math.ceil(th*7);j++){const yy=ty+th*j/Math.ceil(th*7);pts.push([bx+Math.sin((yy-ty)*4)*.13*sign,yy]);}
      strand(pts,.05,'gold',.53);
    }
    ctx.restore();
    ctx.save();crownPath(x,y,w,h);ctx.clip();
    for(let xx=x;xx<x+w;xx+=1)material(28,xx,y,Math.min(1,x+w-xx),h);
    const light=ctx.createLinearGradient(0,y,0,y+h);light.addColorStop(0,'#d1ffae30');light.addColorStop(.35,'#a0d46e04');light.addColorStop(1,'#0b1d0ca6');ctx.fillStyle=light;ctx.fillRect(x,y,w,h);
    for(let k=0;k<Math.ceil(w*4);k++)coil(x+.13+k*.25,y+.48+Math.sin(k*1.7+x)*.13,.15,.2,'green',.041,1.18);
    ctx.restore();
    // The top remains level at the collision height. Only cooked curls hang
    // beneath it; the renderer supplies contact-aware loose surface strands.
    for(let k=0;k<3;k++){
      const pts=[];for(let j=0;j<=Math.ceil(w*8);j++)pts.push([x+.04+(w-.08)*j/Math.ceil(w*8),y+.05+k*.095+Math.sin(j*.83+k)*.013]);
      strand(pts,.073,'green');
    }
    for(let k=0;k<Math.ceil(w*2.5);k++){
      const px=x+.14+k*(w-.28)/Math.max(1,Math.ceil(w*2.5)-1),len=.14+hash(k*9+x)*.18;
      strand([[px,y+h-.15],[px+.05,y+h-.025],[px-.025,y+h+len]],.046,'green',.9);
    }
  }

  // Small damped Verlet chains model the exposed spaghetti passing around
  // each pulley. Before a break both endpoints are pinned to the real pans;
  // afterward the lower ends fall freely while the pulley end stays fixed.
  function chain(owner,key,ax,ay,bx,by,{free=false,slack=1.002,gravity=15,width=.065}={}){
    const now=getTime(),distance=Math.hypot(bx-ax,by-ay),links=Math.max(8,Math.min(38,Math.ceil(distance*5)));
    let states=chainStates.get(owner);if(!states){states=new Map();chainStates.set(owner,states);}
    let m=states.get(key);
    if(!m||Math.abs(now-m.time)>1||Math.hypot(ax-m.ax,ay-m.ay)>2){
      const pts=Array.from({length:links+1},(_,i)=>{const f=i/links,bend=Math.sin(Math.PI*f)*distance*.012,x=ax+(bx-ax)*f-(perpendicularSeed?(by-ay)*bend/(distance||1):0),y=ay+(by-ay)*f+(perpendicularSeed?(bx-ax)*bend/(distance||1):bend);return{x,y,px:x,py:y};});
      m={pts,time:now,ax,ay,rest:Math.max(.005,distance*slack/links),free:false};states.set(key,m);
    }
    const dtTotal=clamp(now-m.time,0,1/24);m.time=now;m.ax=ax;m.ay=ay;
    if(!m.free&&!free)m.rest=Math.max(.005,distance*slack/(m.pts.length-1));
    if(free&&!m.free){m.free=true;for(let i=1;i<m.pts.length;i++)m.pts[i].px-=.002*(i/(m.pts.length-1));}
    const steps=Math.max(1,Math.ceil(dtTotal*120)),dt=dtTotal/steps,ps=m.pts,last=ps.length-1;
    for(let step=0;step<steps&&dtTotal>0;step++){
      for(let i=1;i<ps.length-(m.free?0:1);i++){
        const p=ps[i],vx=(p.x-p.px)*Math.pow(.977,dt*120),vy=(p.y-p.py)*Math.pow(.977,dt*120);
        p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+gravity*dt*dt;
      }
      for(let pass=0;pass<constraintPasses;pass++){
        ps[0].x=ax;ps[0].y=ay;if(!m.free){ps[last].x=bx;ps[last].y=by;}
        for(let i=1;i<ps.length;i++){
          const a=ps[i-1],b=ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8,c=(d-m.rest)/d,leftFixed=i===1,rightFixed=!m.free&&i===last;
          if(leftFixed&&!rightFixed){b.x-=dx*c;b.y-=dy*c;}else if(rightFixed&&!leftFixed){a.x+=dx*c;a.y+=dy*c;}else if(!leftFixed&&!rightFixed){a.x+=dx*c*.5;a.y+=dy*c*.5;b.x-=dx*c*.5;b.y-=dy*c*.5;}
        }
      }
      ps[0].x=ax;ps[0].y=ay;
      if(m.free){for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1e-8;b.x=a.x+dx/d*m.rest;b.y=a.y+dy/d*m.rest;}}
      else{ps[last].x=bx;ps[last].y=by;}
    }
    const points=ps.map(p=>[p.x,p.y]);strand(points,width,'gold');
    // Unstretched macro-food texture inside the tube, plus a small uneven
    // highlight, keeps the tensioned noodle from reading as metal wire.
    ctx.save();ctx.beginPath();
    const edges=points.map(([x,y],i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1,r=width*(.47+Math.sin(i*.91)*.035);return[[x-dy/d*r,y+dx/d*r],[x+dy/d*r,y-dx/d*r]];});
    edges.forEach((e,i)=>i?ctx.lineTo(...e[0]):ctx.moveTo(...e[0]));for(let i=edges.length-1;i>=0;i--)ctx.lineTo(...edges[i][1]);ctx.closePath();ctx.clip();
    const minX=Math.min(...points.map(p=>p[0]))-width,maxX=Math.max(...points.map(p=>p[0]))+width,minY=Math.min(...points.map(p=>p[1]))-width,maxY=Math.max(...points.map(p=>p[1]))+width;
    for(let x=minX;x<maxX;x+=.7)for(let y=minY;y<maxY;y+=.7)material(0,x,y,.7,.7,.66);
    ctx.restore();
    const offset=points.map(([x,y],i)=>[x+Math.sin(i*.85)*width*.16,y]);strand(offset,width*.2,'pale',.4);
    return points;
  }

  function drawScale(s){
    if(!s||s.removed||!s.left||!s.right)return;
    const left=s.left,right=s.right,lx=s.leftX??left.x+left.w*.5,rx=s.rightX??right.x+right.w*.5,top=s.topY??2.5,broken=!!s.broken,now=getTime();
    let spin=pulleyStates.get(s);if(!spin){spin={time:now,leftY:left.y,rightY:right.y,left:0,right:0,leftV:0,rightV:0};pulleyStates.set(s,spin);}
    const dt=clamp(now-spin.time,0,1/24);spin.time=now;
    if(dt>0)for(const[p,key]of[[left,'left'],[right,'right']]){
      if(!broken){const delta=(p.y-spin[key+'Y'])/.19;spin[key]+=delta;spin[key+'V']=delta/dt;}
      else{spin[key+'V']*=Math.exp(-dt*8);spin[key]+=spin[key+'V']*dt;}
      spin[key+'Y']=p.y;
    }
    chain(s,'span',lx,top-.12,rx,top-.12,{slack:1.0007,gravity:9,width:.063});
    for(const[p,key,x]of[[left,'left',lx],[right,'right',rx]]){
      chain(s,key,x,top,x,p.y+.02,{free:broken,slack:1.0015,gravity:18,width:.065});
      const rotation=spin[key];
      ctx.save();ctx.translate(x,top);ctx.rotate(rotation);
      photoShape(1,()=>{ctx.beginPath();ctx.ellipse(0,0,.18,.18,0,0,TAU)},-.18,-.18,.36,.36);
      coil(0,0,.15,.15,'gold',.055,1.75);coil(0,0,.052,.052,'pale',.035,1.15);
      ctx.restore();
      if(!broken){coil(x,p.y+.11,.13,.075,'gold',.045,1.3);}
    }
  }

  function drawPlatform(p){
    if(!p||p.removed||p.hidden)return;
    const x=p.x,y=p.y,w=p.w??3,h=p.visualHeight??.375,now=getTime();
    let m=boardStates.get(p);if(!m){m={time:now,deflection:0,v:0,previousY:y};boardStates.set(p,m);}
    const duration=clamp(now-m.time,0,1/24);m.time=now;
    const steps=Math.max(1,Math.ceil(duration*120)),dt=duration/steps,target=clamp(p.load??0,0,1)*.032;
    for(let i=0;i<steps&&duration>0;i++){m.v+=((target-m.deflection)*90-m.v*17)*dt;m.deflection+=m.v*dt;}
    m.previousY=y;
    const shape=()=>{ctx.beginPath();ctx.moveTo(x+.08,y+.012);ctx.lineTo(x+w-.08,y+.012);ctx.quadraticCurveTo(x+w,y+.012,x+w,y+.09);ctx.lineTo(x+w,y+h-.08);ctx.quadraticCurveTo(x+w,y+h,x+w-.1,y+h);ctx.quadraticCurveTo(x+w*.5,y+h+m.deflection,x+.1,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-.08);ctx.lineTo(x,y+.09);ctx.quadraticCurveTo(x,y+.012,x+.08,y+.012);ctx.closePath();};
    ctx.save();shape();ctx.clip();
    for(let xx=x;xx<x+w;xx+=.64)material(1,xx,y-.11,.64,.64);
    shade(x,y,w,h,.18,.3);ctx.restore();
    for(let k=0;k<4;k++){
      const pts=[];for(let j=0;j<=Math.ceil(w*10);j++){const f=j/Math.ceil(w*10);pts.push([x+.035+(w-.07)*f,y+.042+k*(h-.085)/3+Math.sin(f*Math.PI)*m.deflection*(k/3)+Math.sin(j*.8+k)*.009]);}
      strand(pts,k===0?.045:.034,k===0?'pale':'gold',k===0?.94:.68);
    }
    for(let i=0,px=x+.27;px<x+w-.1;px+=.42,i++){
      const yy=y+h*.55+Math.sin(i*2.1)*.012;
      photoShape(9,()=>{ctx.beginPath();ctx.moveTo(px-.055,yy-.025);ctx.quadraticCurveTo(px-.018,yy-.073,px+.06,yy-.018);ctx.quadraticCurveTo(px+.075,yy+.047,px-.025,yy+.06);ctx.quadraticCurveTo(px-.072,yy+.025,px-.055,yy-.025);ctx.closePath();},px-.08,yy-.075,.16,.15);
      strand([[px-.065,yy-.01],[px-.015,yy-.056],[px+.06,yy-.02]],.023,'gold',.74);
    }
    for(const px of[x+.065,x+w-.065])coil(px,y+h*.51,.052,h*.4,'gold',.035,1.2);
  }

  return {drawNightScenery,drawTreetop,drawScale,drawPlatform};
}
