/* LOOSE END — painted actor rigs.
   Install after wreck-render.js. Animation state belongs to the renderer; simulation objects are read-only. */
(function () {
  'use strict';
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dead=a=>!a||a.destroyed||a.hp<=0;
  const mix=(a,b,t)=>a+(b-a)*t;
  const hash=s=>{let n=0;for(const ch of String(s||''))n=(n*31+ch.charCodeAt(0))>>>0;return n;};
  function gradient(c,x1,y1,x2,y2,colors){const g=c.createLinearGradient(x1,y1,x2,y2);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
  function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rotation,0,TAU);if(fill){c.fillStyle=fill;c.fill();}}
  function circle(c,x,y,r,fill){ellipse(c,x,y,r,r,fill);}
  function line(c,x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function ring(c,x,y,r,width,color,start=0,end=TAU){c.beginPath();c.arc(x,y,Math.max(0,r),start,end);c.lineWidth=width;c.strokeStyle=color;c.stroke();}
  function box(c,x,y,w,h,color,radius=0){c.beginPath();c.roundRect(x,y,Math.max(0,w),Math.max(0,h),Math.min(radius,w/2,h/2));c.fillStyle=color;c.fill();}
  function shadow(c,x,y,rx,ry,alpha=.55){c.save();c.translate(x,y);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,rx*.12,0,0,rx);g.addColorStop(0,`rgba(2,8,16,${alpha})`);g.addColorStop(1,'rgba(2,8,16,0)');circle(c,0,0,rx,g);c.restore();}
  function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');circle(c,x,y,r,g);}
  function bolt(c,x,y,r=2){circle(c,x+.6,y+.8,r+1,'#18212a');circle(c,x,y,r,gradient(c,x-r,y-r,x+r,y+r,['#e1bf80','#977144','#43362b']));line(c,x-r*.5,y,x+r*.5,y,'#60462f',.7);}
  function brackets(c,x,y,r,open){const color=open?'#ffe0a0':'#708580';for(let i=0;i<4;i++)ring(c,x,y,r,1.8,color,i*Math.PI/2+.15,i*Math.PI/2+.62);if(open){line(c,x-3,y,x+3,y,'#ffe9bc',1.6);line(c,x,y-3,x,y+3,'#ffe9bc',1.6);}}
  function polygon(c,pts){c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();}

  // Pieces are masks into the original painting, so the moving feet, armor and barrels retain its material detail.
  const RIGS={
    rusher:{legs:[{poly:[[.10,.49],[.40,.49],[.41,1],[.10,1]],pivot:[.33,.57],side:1},{poly:[[.49,.56],[.76,.56],[.78,.99],[.49,.99]],pivot:[.58,.60],side:-1}],front:{poly:[[.72,.13],[1,.13],[1,.57],[.78,.57],[.69,.39]],pivot:[.74,.40]}},
    guard:{legs:[{poly:[[.12,.64],[.34,.64],[.34,1],[.12,1]],pivot:[.26,.70],side:1},{poly:[[.50,.65],[.70,.65],[.70,1],[.50,1]],pivot:[.60,.70],side:-1}],front:{poly:[[.71,0],[1,0],[1,1],[.71,1],[.69,.67],[.65,.60],[.65,.26]],pivot:[.69,.48]}},
    thrower:{legs:[{poly:[[.11,.69],[.33,.69],[.33,1],[.11,1]],pivot:[.28,.73],side:1},{poly:[[.56,.69],[.79,.69],[.79,1],[.56,1]],pivot:[.61,.73],side:-1}],front:{poly:[[.66,.21],[1,.21],[1,.56],[.66,.56]],pivot:[.67,.39]}},
    topiarist:{legs:[{poly:[[.18,.01],[.38,.01],[.38,.23],[.18,.23]],pivot:[.33,.20],side:1},{poly:[[.59,.05],[.80,.05],[.80,.28],[.59,.28]],pivot:[.64,.24],side:-1},{poly:[[.17,.65],[.38,.65],[.38,1],[.17,1]],pivot:[.31,.68],side:-1},{poly:[[.49,.62],[.75,.62],[.75,1],[.49,1]],pivot:[.57,.68],side:1}],front:{poly:[[.52,.29],[.73,.29],[1,.46],[1,.64],[.77,.62],[.53,.48]],pivot:[.56,.43]}},
    bathmaster:{front:{poly:[[.72,.375],[1,.375],[1,.66],[.72,.66]],pivot:[.73,.51]}}
  };

  class WreckActors {
    constructor(renderer){this.renderer=renderer;this.records=new WeakMap();}
    static install(Renderer){
      if(!Renderer?.prototype||Renderer.prototype.__paintedActorsInstalled)return false;
      const names=['drawEnemy','drawTopiarist','drawBathmaster','drawCarousel'];
      for(const name of names){const original=Renderer.prototype[name];if(typeof original!=='function')continue;
        Renderer.prototype[name]=function(c,actor,t=0){
          if(!actor)return;
          if(dead(actor)){
            const method=name==='drawEnemy'?'drawEnemyRemains':'drawBossRemains';
            if(typeof this[method]==='function')return this[method](c,actor,t);
            if(name==='drawEnemy')return original.call(this,c,{...actor,phase:'dead',flash:0,blockFlash:0,vx:0,vy:0},0);
            return;
          }
          if(!this.actors)this.actors=new WreckActors(this);
          if(this.actors[name](c,actor,t))return;
          const fallback=name==='drawCarousel'?{...actor,parts:(actor.parts||[]).filter(p=>!dead(p))}:actor;
          return original.call(this,c,fallback,this.reducedMotion?0:t);
        };
      }
      Object.defineProperty(Renderer.prototype,'__paintedActorsInstalled',{value:true});return true;
    }
    ready(key){return!!this.renderer.assets?.get(key)?.ready;}
    frame(key,w,h){const a=this.renderer.assets.get(key),anchor=a.spec.anchor||{x:.5,y:.5};return{key,w,h,anchor,left:-w*anchor.x,top:-h*anchor.y};}
    point(f,p){return[(p[0]-f.anchor.x)*f.w,(p[1]-f.anchor.y)*f.h];}
    path(c,f,part){polygon(c,part.poly.map(p=>this.point(f,p)));}
    body(c,f,cuts){c.save();for(const part of cuts){c.beginPath();c.rect(f.left-1,f.top-1,f.w+2,f.h+2);this.path(c,f,part);c.clip('evenodd');}this.renderer.sprite(c,f.key,0,0,f.w,f.h,0);c.restore();}
    piece(c,f,part,angle=0,dx=0,dy=0){
      const pivot=this.point(f,part.pivot),asset=this.renderer.assets.get(f.key),crop=asset.spec.crop||{x:0,y:0,w:asset.image.naturalWidth,h:asset.image.naturalHeight};
      const us=part.poly.map(p=>p[0]),vs=part.poly.map(p=>p[1]),u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs);
      c.save();c.translate(pivot[0]+dx,pivot[1]+dy);c.rotate(angle);c.translate(-pivot[0],-pivot[1]);c.beginPath();this.path(c,f,part);c.clip();
      c.drawImage(asset.image,crop.x+u0*crop.w,crop.y+v0*crop.h,(u1-u0)*crop.w,(v1-v0)*crop.h,f.left+u0*f.w,f.top+v0*f.h,(u1-u0)*f.w,(v1-v0)*f.h);c.restore();
    }
    disk(c,f,x,y,r,angle){c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();c.translate(x,y);c.rotate(angle);c.translate(-x,-y);this.renderer.sprite(c,f.key,0,0,f.w,f.h,0);c.restore();}
    duration(actor,phase){
      if(actor.archetype)return{windup:.85,aim:.9,rush:actor.archetype==='guard'?.28:.46,recover:actor.archetype==='thrower'?1.35:.85,stunned:.7}[phase]||1;
      if(actor.kind==='topiarist')return{windup:.88,charge:.53,stunned:1.2,stagger:.25,'sweep-windup':.9,sweep:.28}[phase]||1;
      if(actor.kind==='bathmaster')return{aim:.85,venting:3,armored:1}[phase]||1;
      return{windup:1,sweep:1.18,'pulse-windup':1.05,pulse:2,recovery:1.2,idle:2}[phase]||1;
    }
    pose(actor,t,phaseOverride){
      const phase=phaseOverride||actor.phase||'idle',speed=Math.hypot(actor.vx||0,actor.vy||0),nominal=this.duration(actor,phase),remaining=Math.max(0,Number.isFinite(actor.timer)?actor.timer:nominal),reduced=this.renderer.reducedMotion;
      const vulnerable=phaseOverride==='open'||actor.vulnerable,top=actor.kind==='bathmaster'?(vulnerable&&actor.openCharges>1?1:0):(vulnerable?1:0),bottom=actor.kind==='bathmaster'?(vulnerable&&actor.openCharges>0?1:0):(vulnerable?1:0);
      let r=this.records.get(actor);
      if(!r||t<r.lastTime){r={lastTime:t,x:actor.x,y:actor.y,phase,phaseStart:t-Math.max(0,nominal-remaining),duration:Math.max(nominal,remaining),gait:hash(actor.id)%17,gear:0,recoil:0,lastFlash:actor.flash||0,lastVolley:actor.volleyIndex||0,openTop:top,openBottom:bottom};this.records.set(actor,r);}
      const dt=clamp(t-r.lastTime,0,.08),changed=phase!==r.phase;
      if(changed){if((r.phase==='aim'&&phase!=='aim')||(['charge','rush','sweep'].includes(r.phase)&&['stunned','recover','recovery','stagger'].includes(phase)))r.recoil=1;r.phase=phase;r.phaseStart=t;r.duration=Math.max(nominal,remaining);}
      if((actor.flash||0)>r.lastFlash+.12||(actor.volleyIndex||0)>r.lastVolley)r.recoil=1;
      if(dt>0){
        let distance=Math.hypot((actor.x??r.x)-r.x,(actor.y??r.y)-r.y);if(distance>(actor.r||30)*8)distance=0;
        if(!reduced){r.gait+=Math.min((distance||speed*dt)/Math.max(28,(actor.r||25)*2),dt*8)*TAU;const rate=['charge','rush','sweep'].includes(phase)?8:['aim','windup','sweep-windup','pulse-windup'].includes(phase)?3.5:phase==='venting'?2.8:.65;r.gear+=dt*rate;}
        r.recoil=Math.max(0,r.recoil-dt*4.2);
        r.openTop=top?(reduced?1:Math.min(1,r.openTop+dt*7)):0;r.openBottom=bottom?(reduced?1:Math.min(1,r.openBottom+dt*7)):0;
      }
      r.lastTime=t;r.x=actor.x;r.y=actor.y;r.lastFlash=actor.flash||0;r.lastVolley=actor.volleyIndex||0;
      const progress=clamp(1-remaining/r.duration,0,1),wind=['aim','windup','sweep-windup','pulse-windup'].includes(phase)?progress*progress:0;
      return{record:r,phase,progress,wind,speed,move:clamp(speed/170,0,1),step:reduced?0:Math.sin(r.gait),gear:r.gear,kick:reduced?0:r.recoil,age:Math.max(0,t-r.phaseStart),idle:reduced?0:Math.sin(t*2.2+hash(actor.id)%11),reduced};
    }
    gear(c,x,y,r,angle,hot=false){
      c.save();c.translate(x,y);c.rotate(angle);circle(c,0,0,r,'#18222b');
      for(let i=0;i<12;i++){c.save();c.rotate(i*TAU/12);box(c,r*.72,-r*.12,r*.31,r*.24,gradient(c,0,-r*.1,0,r*.1,hot?['#d4ae6e','#8a633b']:['#a88a58','#65503b']),1);c.restore();}
      circle(c,0,0,r*.78,gradient(c,-r,-r,r,r,hot?['#ecc987','#b48246','#68412c']:['#c5a465','#8a704a','#3c3b36']));circle(c,0,0,r*.52,'#172a35');
      for(let i=0;i<5;i++){const a=i*TAU/5;line(c,Math.cos(a)*r*.12,Math.sin(a)*r*.12,Math.cos(a)*r*.56,Math.sin(a)*r*.56,hot?'#deb16a':'#a78b5a',Math.max(1.2,r*.13));}bolt(c,0,0,Math.max(1.7,r*.14));c.restore();
    }
    iris(c,r,top,bottom,gearAngle,paintClosed,open){
      c.save();circle(c,0,0,r,'#11222e');c.clip();if(open)glow(c,0,0,r*1.05,'rgba(242,174,74,.42)');this.gear(c,0,0,r*.77,gearAngle,open);
      for(const[side,amount]of[[-1,top],[1,bottom]]){c.save();c.translate(0,side*amount*r*1.65);c.beginPath();c.arc(0,0,r,side<0?Math.PI:0,side<0?TAU:Math.PI);c.closePath();c.clip();paintClosed();c.restore();}c.restore();
      ring(c,0,0,r+1,1.1,open?'#d5ac6d':'#8e805e');
    }
    drawEnemy(c,e,t){
      const kind=e.archetype||'rusher',key='enemy-'+kind;if(!this.ready(key))return false;
      const r=e.r||23,a=e.angle||0,p=this.pose(e,t),rig=RIGS[kind]||RIGS.rusher,asset=this.renderer.assets.get(key),crop=asset.spec.crop||{w:asset.image.naturalWidth,h:asset.image.naturalHeight},w=r*(kind==='rusher'?2.8:kind==='guard'?2.5:2.6),h=w*crop.h/crop.w,f=this.frame(key,w,h);
      const rush=e.phase==='rush',brace=p.wind,compression=brace*.085+(rush?.035:0),bob=p.step*p.move*(kind==='guard'?1.7:2.5),kick=p.kick*r*.12;
      shadow(c,e.x+8,e.y+11,r*1.46,r*.88,.52);c.save();c.translate(e.x,e.y);c.rotate(a);c.lineJoin='round';c.lineCap='round';
      c.save();c.translate(-brace*r*.10-kick,bob+brace*r*.10);c.scale(1+compression*.35,1-compression);
      for(const leg of rig.legs){const step=p.step*leg.side*p.move,angle=step*(kind==='guard'?.21:.30)+(brace?leg.side*.10*brace:0);this.piece(c,f,leg,angle,-step*r*.11,Math.max(0,-step)*r*.10);}
      this.body(c,f,[...rig.legs,rig.front]);
      const frontAngle=kind==='guard'?-brace*.13+(rush?.05:0):kind==='rusher'?-brace*.11+(rush?.08:0):0;
      const frontDx=kind==='thrower'?-p.kick*r*.38+brace*r*.12:kind==='guard'?brace*r*.10:brace*r*.08;
      this.piece(c,f,rig.front,frontAngle,frontDx,kind==='rusher'?-brace*r*.11:0);
      if(kind==='thrower'){
        const gx=-r*.06,gy=r*.06;this.gear(c,gx,gy,r*.13,p.gear,true);
        const charge=e.phase==='aim'?p.progress:0;if(charge){ellipse(c,r*1.14+frontDx,-r*.03,r*.052,r*.13,'#c8f0df');line(c,r*.72+frontDx,-r*.16,r*.99+frontDx,-r*.16,'#bbdccc',1.3);}
      }else if(kind==='rusher')this.gear(c,-r*.47,r*.12,r*.15,p.gear,false);
      else{line(c,-r*.94,-r*.13,-r*.94,r*.16,'#bd8b52',2.4);if(e.blockFlash>0){c.globalAlpha=Math.min(.55,e.blockFlash);line(c,r*.96,-r*.51,r*.96,r*.51,'#fff0bc',2.5);c.globalAlpha=1;}}
      c.restore();
      if(e.phase==='stunned'){const sag=p.reduced?0:Math.sin(p.age*8)*.04;line(c,-r*.40,-r*.75,r*.42,-r*.72+sag*r,'#cdbb8d',1.3);}
      if(e.flash>0){c.save();c.globalCompositeOperation='screen';c.globalAlpha=Math.min(.55,e.flash*2.8);ellipse(c,0,0,r*.83,r*.68,'#f0d3a0');c.restore();}c.restore();return true;
    }
    drawTopiarist(c,b,t){
      if(!this.ready('topiarist'))return false;
      const r=b.r||80,a=b.angle||0,p=this.pose(b,t),rig=RIGS.topiarist,w=r*2.70,h=w*797/1202,f=this.frame('topiarist',w,h),charging=b.phase==='charge',sweep=b.phase==='sweep',stunned=b.phase==='stunned';
      const crouch=p.wind*.08,step=p.step*p.move,bob=step*2.8,slam=p.kick*4;
      shadow(c,b.x+16,b.y+22,r*1.4,r,.65);c.save();c.translate(b.x,b.y);c.rotate(a);c.lineJoin='round';c.lineCap='round';
      c.save();c.translate(-p.wind*3+slam,bob+p.wind*5+slam);c.scale(1+crouch*.25,1-crouch);
      for(let i=0;i<rig.legs.length;i++){const leg=rig.legs[i],stride=step*leg.side,spread=p.wind*(i<2?-1:1);this.piece(c,f,leg,stride*.18+spread*.10,-stride*4,(i<2?-1:1)*Math.max(0,stride)*4);}
      this.body(c,f,[...rig.legs,rig.front]);
      const flex=sweep?Math.sin(p.progress*Math.PI)*.24:charging?.055:-p.wind*.11;
      this.piece(c,f,rig.front,flex,charging?3:p.wind*-2,sweep?-5:p.wind*3);
      const wheel=this.point(f,[.178,.405]),wr=r*.335;this.disk(c,f,wheel[0],wheel[1],wr,p.gear*(charging?1.4:1));
      if(!b.vulnerable){for(const yy of[-wr*.52,0,wr*.52]){const reach=Math.sqrt(wr*wr-yy*yy);line(c,wheel[0]-reach,wheel[1]+yy,wheel[0]+reach,wheel[1]+yy,'rgba(30,55,55,.76)',3.8);line(c,wheel[0]-reach,wheel[1]+yy-1,wheel[0]+reach,wheel[1]+yy-1,'#87917c',1.2);}}
      else glow(c,wheel[0],wheel[1],wr*1.4,'rgba(250,181,83,.22)');brackets(c,wheel[0],wheel[1],wr*1.18,!!b.vulnerable);
      c.restore();
      // The pruning linkage physically folds back for the warned sweep and snaps through during the strike.
      if(b.phase==='sweep-windup'||sweep){const extension=sweep?Math.sin(Math.min(1,p.progress)*Math.PI):p.wind*.55,openAngle=sweep?p.progress*TAU:.25+p.wind*.65;
        for(const side of[-1,1]){const ang=side*openAngle,x0=r*.38,y0=side*r*.48,x1=x0+Math.cos(ang)*r*.55*extension,y1=y0+Math.sin(ang)*r*.55*extension;line(c,x0,y0,x1,y1,'#172d35',8);line(c,x0-1,y0-1,x1-1,y1-1,'#ad9562',4);bolt(c,x0,y0,3);}}
      if(stunned){const tilt=p.reduced?0:Math.sin(p.age*5)*.08;line(c,-r*.20,-r*.74,r*.21,-r*.74+tilt*r,'#c2a67c',2);}
      c.restore();return true;
    }
    drawBathmaster(c,b,t){
      if(!this.ready('bathmaster'))return false;
      const r=b.r||84,a=b.angle||0,p=this.pose(b,t),w=r*2.35,h=w*1085/1202,f=this.frame('bathmaster',w,h),barrel=RIGS.bathmaster.front,open=!!b.vulnerable;
      shadow(c,b.x+18,b.y+22,r*1.5,r*1.04,.68);c.save();c.translate(b.x,b.y);c.rotate(a);c.lineJoin='round';c.lineCap='round';
      // The boiler stays planted; its barrel and working machinery move independently of its physical core.
      this.body(c,f,[barrel]);this.piece(c,f,barrel,0,-p.kick*r*.19+p.wind*r*.065,0);
      const valve=this.point(f,[.446,.108]);this.disk(c,f,valve[0],valve[1],r*.205,p.gear*(open?1.8:1));
      const gauge=this.point(f,[.625,.173]),gr=r*.12;circle(c,gauge[0],gauge[1],gr,'#d4c398');
      for(let i=0;i<6;i++){const a0=-2.4+i*.78;line(c,gauge[0]+Math.cos(a0)*gr*.72,gauge[1]+Math.sin(a0)*gr*.72,gauge[0]+Math.cos(a0)*gr*.94,gauge[1]+Math.sin(a0)*gr*.94,'#5c584b',.9);}
      const needle=-2.1+p.wind*3.6+(open?.9:0)-p.kick*.75;line(c,gauge[0],gauge[1],gauge[0]+Math.cos(needle)*gr*.78,gauge[1]+Math.sin(needle)*gr*.78,'#a04f33',1.8);bolt(c,gauge[0],gauge[1],1.6);
      for(const side of[-1,1]){const x=side*r*.61,y=r*.50,stroke=(p.reduced?0:Math.sin(p.gear*2+side))*4;line(c,x,y-10,x,y+12+stroke,'#172c38',6);line(c,x-1,y-10,x-1,y+12+stroke,'#b99c62',3);box(c,x-5,y+7+stroke,10,8,gradient(c,x-5,0,x+5,0,['#c3ae78','#68716b','#263f4e']),2);}
      this.iris(c,r*.35,p.record.openTop,p.record.openBottom,p.gear*1.35,()=>this.renderer.sprite(c,'bathmaster',0,0,w,h,0),open);
      if(open)brackets(c,0,0,r*.42,true);
      for(const side of[-1,1]){const lit=open&&(b.openCharges??2)>=(side<0?1:2);if(lit)glow(c,side*r*.58,-r*.03,r*.18,'rgba(255,212,122,.50)');else if(open)ellipse(c,side*r*.58,-r*.03,r*.067,r*.16,'rgba(12,30,40,.75)');}
      c.restore();return true;
    }
    drawCarousel(c,b,t){
      if(!this.ready('carousel')||!this.ready('carousel-arm')||!this.ready('carousel-joint'))return false;
      const r=b.r||64,p=this.pose(b,t),active=!!b.activeArms;
      for(const part of b.parts||[]){
        if(dead(part))continue;const pr=part.r||35,a=Math.atan2(part.y-b.y,part.x-b.x),open=!!(part.vulnerable??b.partsOpen),q=this.pose(part,t,open?'open':'closed');
        const inner=b.armInnerRadius||145,ix=b.x+Math.cos(a)*inner,iy=b.y+Math.sin(a)*inner,len=Math.hypot(part.x-b.x,part.y-b.y),safeStart=r*.82,safeMid=(inner+safeStart)*.5;
        this.renderer.sprite(c,'carousel-arm',b.x+Math.cos(a)*safeMid,b.y+Math.sin(a)*safeMid,Math.max(0,inner-safeStart),6,a,.5);
        line(c,ix+9,iy+13,part.x+9,part.y+13,'rgba(1,5,13,.40)',(b.armWidth||14)*2);
        this.renderer.sprite(c,'carousel-arm',(ix+part.x)*.5,(iy+part.y)*.5,Math.max(1,len-inner),(b.armWidth||14)*2,a);
        if(active){line(c,ix,iy,part.x,part.y,'rgba(225,140,69,.16)',38);line(c,ix,iy-3,part.x,part.y-3,'#d89357',2.6);}
        shadow(c,part.x+10,part.y+13,pr*1.34,pr*.88,.58);c.save();c.translate(part.x,part.y);c.rotate(a);
        const jw=pr*2,jh=jw*582/538;this.renderer.sprite(c,'carousel-joint',0,0,jw,jh,0);
        const shaftStroke=p.reduced?0:Math.sin(p.gear*2)*3;box(c,-pr*.87+shaftStroke,-4,10,8,gradient(c,0,-4,0,4,['#c9ab6e','#735f43','#243239']),2);
        this.iris(c,pr*.425,q.record.openTop,q.record.openBottom,q.gear+(active?p.gear:0),()=>{this.renderer.sprite(c,'carousel-joint',0,0,jw,jh,0);for(const yy of[-pr*.25,0,pr*.25]){const half=Math.sqrt((pr*.41)**2-yy**2);line(c,-half,yy+1,half,yy+1,'#1b202a',5);line(c,-half,yy-1,half,yy-1,'#9a7e52',2);}},open);
        brackets(c,0,0,pr*.53,open);
        if(part.flash>0){c.save();c.globalCompositeOperation='screen';c.globalAlpha=Math.min(.5,part.flash*2.6);ellipse(c,0,0,pr,pr*.80,'#efd09a');c.restore();}c.restore();
        const fraction=clamp(part.hp/(part.maxHp||4),0,1);if(fraction<1){box(c,part.x-19,part.y-pr-15,38,4,'#081522',2);box(c,part.x-18,part.y-pr-14,36*fraction,2,'#cda76b',1);}
      }
      shadow(c,b.x+16,b.y+22,r*1.53,r*1.10,.67);c.save();c.translate(b.x,b.y);c.lineJoin='round';c.lineCap='round';
      const w=r*2.15,h=w*1193/1175,f=this.frame('carousel',w,h),pulseWind=b.phase==='pulse-windup',pulse=b.phase==='pulse',tension=pulseWind?p.wind:0,compression=pulse?Math.max(0,1-p.age/.20)*.075:0;
      c.save();c.scale(1+tension*.035-compression,1+tension*.035-compression);c.rotate(b.angle||0);this.renderer.sprite(c,'carousel',0,0,w,h,0);
      this.disk(c,f,0,0,r*.69,-p.gear*.72);c.restore();
      const open=!!b.vulnerable;
      if(open||pulseWind||pulse){const progress=open?1:pulseWind?p.wind*.20:0;this.iris(c,r*.48,open?p.record.openTop:progress,open?p.record.openBottom:progress,p.gear,()=>this.renderer.sprite(c,'carousel',0,0,w,h,b.angle||0),open);}
      if(open)brackets(c,0,0,r*.57,true);
      // The pulse charge winds the central flywheel, then the crown settles after the mechanical release.
      if(pulseWind){for(let i=0;i<3;i++){const a0=i*TAU/3+p.gear,x=Math.cos(a0)*r*.72,y=Math.sin(a0)*r*.72;line(c,x,y,x*(1-p.wind*.12),y*(1-p.wind*.12),'#d8ad69',3);}}
      c.restore();return true;
    }
  }
  window.WreckActors=WreckActors;
})();
