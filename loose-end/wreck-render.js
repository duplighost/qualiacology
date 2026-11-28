/* LOOSE END — midnight funfair renderer.
   Painted environments, sculpted materials and articulated actors. Gameplay is owned by physics. */
(function () {
  'use strict';
  const W=1600,H=1000,TAU=Math.PI*2;
  const SURROUND={x:-800,y:-600,w:3200,h:2200,scale:.6};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),lerp=(a,b,t)=>a+(b-a)*t;
  const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  const INK='#09111d',GOLD='#b88a4c',LIGHT='#ffe2a8',RED='#e05e4c';
  const PALETTES=[
    {ground:'#1a3536',high:'#31504a',low:'#12252d',edge:'#647064',metal:'#598071',shadow:'#07151e',light:'#e4b273',outside:'#071c29',glow:'#a0cfb0'},
    {ground:'#202d48',high:'#344762',low:'#131e34',edge:'#5d6d83',metal:'#527a8e',shadow:'#070f23',light:'#b2c8dc',outside:'#080e20',glow:'#82cbd4'},
    {ground:'#30212f',high:'#543640',low:'#201b2b',edge:'#8a6866',metal:'#84675b',shadow:'#0c0c1b',light:'#f2bf84',outside:'#090d1a',glow:'#e7a18c'}
  ];
  const THEMES=['garden','baths','midway'];
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  function hash(str){let h=2166136261;for(const ch of String(str))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
  function ellipse(c,x,y,rx,ry,fill,rot=0){c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rot,0,TAU);if(fill){c.fillStyle=fill;c.fill();}}
  function circle(c,x,y,r,fill,stroke=null,width=1){ellipse(c,x,y,r,r,fill);if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function line(c,x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function box(c,x,y,w,h,fill,r=0){c.beginPath();c.roundRect(x,y,Math.max(0,w),Math.max(0,h),Math.max(0,Math.min(r,w/2,h/2)));c.fillStyle=fill;c.fill();}
  function polygon(c,x,y,r,sides,fill,rot=0){c.beginPath();for(let i=0;i<sides;i++){const a=i/sides*TAU+rot;i?c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();if(fill){c.fillStyle=fill;c.fill();}}
  function stroke(c,color=INK,width=2){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function gradient(c,x1,y1,x2,y2,colors){const g=c.createLinearGradient(x1,y1,x2,y2);colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));return g;}
  function shadow(c,x,y,rx,ry,alpha=.4,rot=0){if(rx<=0||ry<=0)return;c.save();c.translate(x,y);c.rotate(rot);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,rx*.10,0,0,rx);g.addColorStop(0,`rgba(2,7,14,${alpha})`);g.addColorStop(.65,`rgba(2,7,14,${alpha*.58})`);g.addColorStop(1,'rgba(2,7,14,0)');circle(c,0,0,rx,g);c.restore();}
  function glow(c,x,y,r,color,alpha=1){c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');circle(c,x,y,r,g);c.restore();}
  function rivet(c,x,y,r=2.5){circle(c,x+.6,y+1,r+1,'#090e16');circle(c,x,y,r,gradient(c,x-r,y-r,x+r,y+r,['#e1bd80','#94714a','#3b3840']));line(c,x-r*.5,y,x+r*.5,y,'#4b3b30',.7);}
  function leaf(c,x,y,length,width,angle,colors){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(-length*.5,0);c.bezierCurveTo(-length*.1,-width, length*.3,-width*.8,length*.5,0);c.bezierCurveTo(length*.13,width*.6,-length*.3,width*.5,-length*.5,0);c.fillStyle=gradient(c,0,-width,0,width,colors);c.fill();line(c,-length*.35,0,length*.4,0,'rgba(165,192,139,.19)',.8);c.restore();}
  function ring(c,x,y,r,width,color,start=0,end=TAU){c.beginPath();c.arc(x,y,Math.max(0,r),start,end);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function roundedPath(c,pts,fill){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const p=pts[i];if(p.length===6)c.bezierCurveTo(...p);else if(p.length===4)c.quadraticCurveTo(...p);else c.lineTo(...p);}c.closePath();c.fillStyle=fill;c.fill();}
  function weakRim(c,x,y,r,on=true){
    const color=on?'#ffe0a0':'#5b7281';
    for(let i=0;i<4;i++){const a=i*Math.PI/2+.15;ring(c,x,y,r,2,color,a,a+.48);}
    if(on){circle(c,x,y,2.5,'#fff1c8');}
  }
  function stripeZone(c,x,y,r,color){c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();for(let q=-r*2;q<r*2;q+=24)line(c,x+q,y-r,x+q+r*2,y+r,color,3);c.restore();}

  class WreckRenderer {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=canvas.clientWidth||innerWidth;this.height=canvas.clientHeight||innerHeight;
      this.dpr=Math.min(window.devicePixelRatio||1,2);this.scale=1;this.baseScale=1;this.cameraX=W/2;this.cameraY=H/2;
      this.centerX=this.width/2;this.centerY=this.height/2;this.landscape=this.width>this.height*1.05;this.rotation=0;
      this.floors=new Map();this.assets=new Map();this.imageSources=new Map();this.surroundCache=null;this.farTexture=null;this.weightTrail=[];this.lastTime=-1;this.lastRoom=-1;this.lastPlayer=null;this.bodyFacing=0;this.worldIndex=0;
      this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
      this.loadAssets();this.resize(this.width,this.height);
    }
    loadAssets(){
      const specs={garden:{src:'assets/garden.png'},baths:{src:'assets/baths.png'},midway:{src:'assets/midway.png'},hero:{src:'assets/hero.png',crop:{x:16,y:195,w:1228,h:928},anchor:{x:.492,y:.490},facing:0},topiarist:{src:'assets/topiarist.png',crop:{x:26,y:226,w:1202,h:797},anchor:{x:.486,y:.469},facing:0},bathmaster:{src:'assets/bathmaster.png',crop:{x:26,y:51,w:1202,h:1085},anchor:{x:.446,y:.500},facing:0},carousel:{src:'assets/carousel.png',crop:{x:30,y:23,w:1175,h:1193},anchor:{x:.500,y:.498},facing:0},'enemy-rusher':{src:'assets/enemies.png',crop:{x:44,y:206,w:645,h:377},anchor:{x:.50,y:.52},facing:0},'enemy-guard':{src:'assets/enemies.png',crop:{x:732,y:104,w:660,h:503},anchor:{x:.51,y:.50},facing:0},'enemy-thrower':{src:'assets/enemies.png',crop:{x:1473,y:128,w:672,h:479},anchor:{x:.47,y:.50},facing:0},'prop-glass':{src:'assets/props.png',crop:{x:100,y:14,w:329,h:479},anchor:{x:.50,y:.64}},'prop-crate':{src:'assets/props.png',crop:{x:557,y:44,w:422,h:439},anchor:{x:.50,y:.60}},'prop-machine':{src:'assets/props.png',crop:{x:1117,y:9,w:307,h:484},anchor:{x:.50,y:.64}},'prop-barrel':{src:'assets/props.png',crop:{x:80,y:533,w:366,h:462},anchor:{x:.50,y:.62}},'prop-core':{src:'assets/props.png',crop:{x:576,y:524,w:384,h:465},anchor:{x:.50,y:.60}},'prop-valve':{src:'assets/props.png',crop:{x:1024,y:540,w:454,h:455},anchor:{x:.50,y:.55}},...(window.LOOSE_END_ART||{})};
      Object.assign(specs,{'fixture-planter':{src:'assets/fixtures.png',crop:{x:12,y:162,w:696,h:409},anchor:{x:.5,y:.55}},weight:{src:'assets/fixtures.png',crop:{x:812,y:156,w:550,h:436},anchor:{x:.5927,y:.5},facing:0},'fixture-gate':{src:'assets/fixtures.png',crop:{x:1537,y:0,w:545,h:717},anchor:{x:.5,y:.66}},...(window.LOOSE_END_ART||{})});
      Object.assign(specs,{'carousel-arm':{src:'assets/carousel-arms.png',crop:{x:48,y:379,w:1034,h:136},anchor:{x:.5,y:.5},facing:0},'carousel-joint':{src:'assets/carousel-arms.png',crop:{x:1166,y:144,w:538,h:582},anchor:{x:.5,y:.5},facing:0},...(window.LOOSE_END_ART||{})});
      for(const theme of THEMES)if(!specs[theme+'-surround'])specs[theme+'-surround']={src:'assets/'+theme+'-surround.png'};
      if(typeof Image==='undefined')return;
      // Atlas aliases share a single decode; terrain caches only depend on their own source images.
      for(const[key,value]of Object.entries(specs)){const spec=typeof value==='string'?{src:value}:value;if(!spec?.src)continue;
        let source=this.imageSources.get(spec.src);if(!source){const image=new Image();image.decoding='async';source={image,assets:[],ready:false,failed:false,settled:false};this.imageSources.set(spec.src,source);}
        const asset={key,image:source.image,spec,ready:false,failed:false};source.assets.push(asset);this.assets.set(key,asset);
      }
      for(const[src,source]of this.imageSources){
        const settle=ready=>{if(source.settled)return;source.ready=ready;source.failed=!ready;source.settled=true;for(const asset of source.assets){asset.ready=ready;asset.failed=!ready;}
          for(let world=0;world<THEMES.length;world++){const theme=THEMES[world],terrain=source.assets.some(a=>a.key===theme),surround=source.assets.some(a=>a.key===theme+'-surround');
            if(terrain){this.floors.delete(world*2);this.floors.delete(world*2+1);}if((terrain||surround)&&this.surroundCache?.world===world)this.surroundCache=null;
          }
        };
        source.image.onload=()=>settle(true);source.image.onerror=()=>settle(false);source.image.src=src;
      }
    }
    sprite(c,key,x,y,width,height,angle=0,alpha=1){
      const a=this.assets.get(key);if(!a?.ready)return false;const im=a.image,s=a.spec,crop=s.crop||{x:0,y:0,w:im.naturalWidth,h:im.naturalHeight},anchor=s.anchor||{x:.5,y:.5};
      c.save();c.translate(x,y);c.rotate(angle-(s.facing||0));c.globalAlpha*=alpha;
      c.drawImage(im,crop.x,crop.y,crop.w,crop.h,-width*anchor.x,-height*anchor.y,width,height);c.restore();return true;
    }
    resize(width,height){
      this.width=Math.max(1,width);this.height=Math.max(1,height);this.dpr=Math.min(window.devicePixelRatio||1,2);
      this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.canvas.style.width=`${this.width}px`;this.canvas.style.height=`${this.height}px`;
      this.landscape=this.width>this.height*1.05;const top=Math.min(this.landscape?62:78,this.height*.13),bottom=Math.min(this.landscape?32:88,this.height*.15);
      this.centerX=this.width/2;this.centerY=top+(this.height-top-bottom)/2;this.viewHeight=this.height-top-bottom;
      this.baseScale=this.landscape?Math.min(1.8,this.width/1260):Math.max(this.width/660,this.viewHeight/940);
      this.scale=this.baseScale;this.cameraNeedsSnap=true;this.clampCamera();
    }
    clampCamera(){const hw=this.width/this.scale/2,hh=this.viewHeight/this.scale/2;this.cameraX=hw>=W/2?W/2:clamp(this.cameraX,hw,W-hw);this.cameraY=hh>=H/2?H/2:clamp(this.cameraY,hh,H-hh);}
    screenToWorld(x,y){const r=this.canvas.getBoundingClientRect();return{x:(x-r.left-this.centerX)/this.scale+this.cameraX,y:(y-r.top-this.centerY)/this.scale+this.cameraY};}
    worldToScreen(x,y){const r=this.canvas.getBoundingClientRect();return{x:r.left+this.centerX+(x-this.cameraX)*this.scale,y:r.top+this.centerY+(y-this.cameraY)*this.scale};}
    screenVectorToWorld(dx,dy){return{x:dx,y:dy};}
    worldVectorToScreen(dx,dy){return{x:dx,y:dy};}
    updateCamera(s){
      const p=s.player,reset=this.cameraNeedsSnap||s.roomIndex!==this.lastRoom||p!==this.lastPlayer||s.time<this.lastTime;
      if(reset){this.weightTrail.length=0;this.bodyFacing=p?.angle||0;}
      const boss=s.boss&&!s.boss.destroyed?s.boss:null;
      // Closer normal play, a stable wider arena view for large telegraphed boss patterns.
      const bossScale=this.landscape?Math.min(this.baseScale,this.viewHeight/720):Math.min(this.baseScale,this.width/870);
      this.scale=s.boss?bossScale:this.baseScale;
      if(p){const dx=(p.headX??p.x)-p.x,dy=(p.headY??p.y)-p.y;
        const tx=p.x+dx*(boss?.04:.14)+(boss?clamp((boss.x-p.x)*.34,-150,150):clamp((p.vx||0)*.07,-35,35));
        const ty=p.y+dy*(boss?.04:.10)+(boss?clamp((boss.y-p.y)*.28,-90,90):clamp((p.vy||0)*.05,-28,28));
        const dt=this.lastTime<0?1/60:clamp((s.time||0)-this.lastTime,0,.06),blend=reset?1:1-Math.exp(-dt*10);
        this.cameraX=lerp(this.cameraX,tx,blend);this.cameraY=lerp(this.cameraY,ty,blend);this.clampCamera();}
      this.cameraNeedsSnap=false;this.lastPlayer=p;this.lastRoom=s.roomIndex;
    }
    floorFor(room){
      room=clamp(room||0,0,5);if(this.floors.has(room))return this.floors.get(room);
      const world=Math.floor(room/2),p=PALETTES[world],random=rng(17391+room*771),canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const c=canvas.getContext('2d');c.lineJoin='round';c.lineCap='round';const art=this.assets.get(THEMES[world]);
      c.fillStyle=p.outside;c.fillRect(0,0,W,H);
      if(art?.ready){c.drawImage(art.image,0,0,W,H);}
      else{
        this.paintFloor(c,world,room,random);
        this.paintEdges(c,world,random);
      }
      // Small pools of practical light bind dynamic actors to the painted scenery.
      for(const[x,y]of[[130,140],[1450,180],[180,855],[1390,850]]){glow(c,x,y,220,world===1?'rgba(90,170,183,.07)':'rgba(230,152,65,.10)');}
      // Only the outer decorative fringe blends into the surrounding world; collision lanes start at 72/76.
      this.featherEdges(c,0,0,W,H,18);
      this.floors.set(room,canvas);while(this.floors.size>3)this.floors.delete(this.floors.keys().next().value);return canvas;
    }
    paintFloor(c,world,room,random){
      const p=PALETTES[world];shadow(c,810,540,835,510,.8);
      roundedPath(c,[[52,57],[1545,57],[1555,946],[48,946]],'#080f19');box(c,62,63,1478,868,gradient(c,60,50,1540,930,[p.high,p.ground,p.low]),5);
      c.save();c.beginPath();c.rect(72,76,1456,848);c.clip();
      if(world===2){
        for(let y=76;y<930;y+=34){const color=random()>.5?'#362632':'#3c2b34';box(c,72,y,1456,32,color);line(c,72,y+1,1528,y+1,'rgba(178,133,101,.16)',1);line(c,72,y+31,1528,y+31,'rgba(3,7,16,.45)',2);
          for(let x=72+Math.floor(y/34)%2*200;x<1528;x+=400){line(c,x,y,x,y+32,'#151520',2);for(let j=0;j<6;j++)line(c,x+12+random()*330,y+5+random()*20,x+50+random()*330,y+5+random()*20,'rgba(191,137,97,.07)',1);}}
        const cx=room%2?940:810,cy=500;
        ring(c,cx,cy,328,20,'rgba(156,105,76,.20)');ring(c,cx,cy,344,2,'rgba(234,175,105,.23)');ring(c,cx,cy,309,2,'rgba(215,158,94,.20)');
        for(let i=0;i<48;i++){const a=i/48*TAU;line(c,cx+Math.cos(a)*318,cy+Math.sin(a)*318,cx+Math.cos(a)*337,cy+Math.sin(a)*337,'rgba(242,191,118,.17)',2);}
      }else{
        const sy=world?48:74,sx=world?48:138;
        for(let y=76;y<925;y+=sy){for(let x=72-((Math.floor(y/sy)%2)*sx/2);x<1528;x+=sx){
          const tint=.04+random()*.09;box(c,x+1,y+1,sx-3,sy-3,world?`rgba(91,132,165,${tint})`:`rgba(112,138,112,${tint})`,world?1:3);
          line(c,x+2,y+1,x+sx-3,y+1,world?'rgba(156,188,194,.13)':'rgba(168,177,135,.14)',1);
          line(c,x,y+sy-1,x+sx,y+sy-1,'rgba(2,12,20,.34)',2);line(c,x,y,x,y+sy,'rgba(1,10,18,.3)',1.4);
          if(!world&&random()>.65){c.beginPath();c.moveTo(x+12,y+random()*sy);c.lineTo(x+sx*.4,y+sy*.5);c.lineTo(x+sx*.43,y+sy);c.strokeStyle='rgba(6,20,25,.28)';c.lineWidth=1.2;c.stroke();}
          if(world&&((Math.floor(x/sx)+Math.floor(y/sy))%4===0)){polygon(c,x+24,y+24,4,4,'rgba(126,170,183,.15)');}
        }}
        for(const y of[170,830]){line(c,72,y,1528,y,world?'#17233c':'#162b2c',30);line(c,72,y-17,1528,y-17,world?'#476078':'#557065',2);line(c,72,y+17,1528,y+17,'#0b1622',3);
          for(let x=90;x<1520;x+=25){if(world)polygon(c,x,y,5,4,'#536c7e');else{line(c,x,y-8,x+10,y+8,'#486253',2);line(c,x+10,y+8,x+20,y-8,'#486253',2);}}
        }
        const cx=room%2?1040:800,rr=world?245:288;ring(c,cx,500,rr,2,world?'rgba(100,142,166,.16)':'rgba(146,164,115,.18)');ring(c,cx,500,rr-14,12,world?'rgba(26,43,64,.22)':'rgba(11,36,34,.22)');
      }
      for(let i=0;i<7800;i++){const x=72+random()*1456,y=76+random()*848;c.fillStyle=i%2?'rgba(231,217,177,.035)':'rgba(0,6,16,.07)';c.fillRect(x,y,random()*2+1,random()*1.5+.5);}
      for(let i=0;i<38;i++){const x=80+random()*1440,y=100+random()*800;shadow(c,x,y,12+random()*45,3+random()*10,.12,random()*TAU);}
      if(world===1){for(let i=0;i<19;i++){const x=100+random()*1390,y=100+random()*800;ellipse(c,x,y,40+random()*90,6+random()*25,'rgba(68,122,154,.10)',-.15);line(c,x-25,y-3,x+15,y-5,'rgba(130,189,203,.11)',1);}}
      c.restore();
      const shade=c.createRadialGradient(800,470,180,800,470,900);shade.addColorStop(0,'rgba(0,4,13,0)');shade.addColorStop(1,'rgba(0,4,13,.45)');c.fillStyle=shade;c.fillRect(0,0,W,H);
    }
    paintEdges(c,world,random){
      const p=PALETTES[world];
      for(const y of[55,927]){box(c,43,y,1514,26,'#080e17',5);box(c,45,y-9,1510,23,gradient(c,0,y-9,0,y+14,[p.edge,p.ground,'#0c1721']),4);line(c,48,y-8,1552,y-8,'rgba(188,183,142,.28)',1.5);}
      for(const x of[45,1531]){box(c,x,62,25,861,'#07111c',3);box(c,x-4,58,25,863,gradient(c,x-4,0,x+21,0,[p.edge,p.ground,'#091520']),3);}
      for(const[x,y]of[[120,95],[1470,95],[110,900],[1470,900]])this.lantern(c,x,y,world);
      if(world===0){
        for(const x of[20,1580])for(const y of[190,365,655,830])this.bush(c,x,y,random,47);
        for(const y of[18,981])for(let x=200;x<1470;x+=185)this.bush(c,x,y,random,58);
      }else if(world===1){
        for(const y of[195,390,650,830])for(const x of[28,1571]){
          shadow(c,x+12,y+14,38,51,.45);box(c,x-22,y-37,44,79,'#0a1528',7);box(c,x-24,y-48,48,70,gradient(c,x-24,0,x+24,0,['#7c8b90','#425a6f','#1d2a41']),6);
          for(let d=-14;d<20;d+=9)line(c,x+d,y-36,x+d,y+12,'rgba(149,170,177,.22)',2);ellipse(c,x,y-45,29,13,gradient(c,x-25,y-50,x+25,y-37,['#a5a795','#657381','#253449']));ellipse(c,x,y+24,29,12,'#293d50');}
        for(const x of[300,600,900,1200])for(const y of[20,982]){ellipse(c,x,y,95,30,'#09243a');ring(c,x,y,32,8,'#334e61');}
      }else{
        for(const y of[17,983])for(const x of[230,560,1060,1370]){
          shadow(c,x+10,y+15,90,42,.5);c.save();c.translate(x,y);c.scale(1,y<500?1:-1);roundedPath(c,[[-90,-15],[0,-90],[90,-15],[80,15,0,35,-80,15]],'#40202b');
          for(let i=-3;i<=3;i++){roundedPath(c,[[i*24-13,5],[0,-85],[i*24+12,5]],i%2?'#785342':'#542536');}
          c.restore();}
        for(let x=110;x<1510;x+=50)for(const y of[38,961]){circle(c,x,y,4.5,'#3a292c');circle(c,x,y-1,2.4,'#e6b36e');}
      }
    }
    lantern(c,x,y,world){
      glow(c,x,y,150,world===1?'rgba(117,169,191,.18)':'rgba(232,146,49,.23)');shadow(c,x+10,y+14,24,17,.55);
      box(c,x-8,y-16,16,32,'#10121a',4);box(c,x-5,y-13,10,23,gradient(c,x,y-13,x,y+12,['#f3cd82','#a85e2b','#482b24']),2);
      line(c,x-9,y-15,x+9,y-15,'#a77b45',2);line(c,x-8,y+12,x+8,y+12,'#4e3830',3);line(c,x,y-13,x,y+11,'#332324',1.5);
      glow(c,x,y-4,19,'rgba(255,193,91,.22)');
    }
    bush(c,x,y,random,r=40){
      shadow(c,x+14,y+16,r*1.2,r*.7,.4);ellipse(c,x,y,r,r*.7,'#0c262b');
      for(let i=0;i<24;i++){const a=random()*TAU,d=random()*r;leaf(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.7,22+random()*24,8+random()*7,a,['#376f54','#1b4d42','#102e35']);}
      for(let i=0;i<8;i++){const a=random()*TAU,d=random()*r*.8;leaf(c,x-5+Math.cos(a)*d,y-7+Math.sin(a)*d*.7,15+random()*20,8,a,['#51866a','#34664f','#183d3d']);}
      for(let i=0;i<3;i++){const a=random()*TAU,d=random()*r;ellipse(c,x+Math.cos(a)*d,y+Math.sin(a)*d*.7,3,2.5,'#b37d59');}
    }
    render(s,input={}){
      if(!s)return;this.updateCamera(s);this.worldIndex=clamp(s.worldIndex??Math.floor((s.roomIndex||0)/2),0,2);
      const c=this.ctx,t=s.time||0,p=PALETTES[this.worldIndex];c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=p.outside;c.fillRect(0,0,this.width,this.height);
      let sx=0,sy=0;if(!this.reducedMotion&&s.shake>0){const q=Math.min(s.shake,9);sx=Math.sin(t*131)*q;sy=Math.cos(t*103)*q*.60;}
      c.save();c.translate(this.centerX,this.centerY);c.scale(this.scale,this.scale);c.translate(-this.cameraX+sx,-this.cameraY+sy);c.lineJoin='round';c.lineCap='round';
      this.surroundings(c,t,s.exit);c.drawImage(this.floorFor(s.roomIndex),0,0,W,H);this.ambient(c,t);
      for(const h of s.hazards||[])this.drawHazard(c,h,t);
      for(const o of s.objects||[])if(o.destroyed)this.drawRubble(c,o);
      for(const e of s.enemies||[])if(e.destroyed||e.hp<=0)this.drawEnemy(c,e,t);
      this.drawExit(c,s.exit,t);this.drawBossTell(c,s.boss,t);for(const e of s.enemies||[])this.drawEnemyTell(c,e,t);
      if(input.scene==='play'&&input.target&&s.phase!=='dead'&&s.phase!=='won'){c.save();c.translate(-sx,-sy);this.drawTarget(c,input.target,s.player?.target);c.restore();}
      this.drawWeightTrail(c,s.player,t);
      const actors=[];
      for(const w of s.walls||[])actors.push({y:w.y+w.h*.72,draw:()=>this.drawWall(c,w)});
      for(const o of s.objects||[])if(!o.destroyed)actors.push({y:o.y,draw:()=>this.drawObject(c,o,t)});
      if(s.boss)actors.push({y:s.boss.y,draw:()=>this.drawBoss(c,s.boss,t)});
      for(const e of s.enemies||[])if(!e.destroyed&&e.hp>0)actors.push({y:e.y,draw:()=>this.drawEnemy(c,e,t)});
      if(s.player)actors.push({y:s.player.y,draw:()=>this.drawPlayer(c,s.player,t)});
      actors.sort((a,b)=>a.y-b.y);for(const actor of actors)actor.draw();
      for(const q of s.projectiles||[])this.drawProjectile(c,q,t);
      this.drawCableAndWeight(c,s.player,t);this.drawEffects(c,s);
      c.restore();this.drawScreenAtmosphere(c,t,input.scene);this.drawTouch(c,input.touches||{});this.lastTime=t;
    }
    featherEdges(c,x,y,w,h,size){
      c.save();c.globalAlpha=1;c.globalCompositeOperation='destination-out';
      c.fillStyle=gradient(c,x,y,x+size,y,['rgba(0,0,0,1)','rgba(0,0,0,0)']);c.fillRect(x,y,size,h);
      c.fillStyle=gradient(c,x+w,y,x+w-size,y,['rgba(0,0,0,1)','rgba(0,0,0,0)']);c.fillRect(x+w-size,y,size,h);
      c.fillStyle=gradient(c,x,y,x,y+size,['rgba(0,0,0,1)','rgba(0,0,0,0)']);c.fillRect(x,y,w,size);
      c.fillStyle=gradient(c,x,y+h,x,y+h-size,['rgba(0,0,0,1)','rgba(0,0,0,0)']);c.fillRect(x,y+h-size,w,size);c.restore();
    }
    farFor(world){
      if(this.farTexture?.world===world)return this.farTexture.pattern;
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d'),random=rng(8319+world*932),base=['#09242c','#0d293b','#101e2b'][world];
      c.fillStyle=base;c.fillRect(0,0,512,384);
      for(let i=0;i<2400;i++){c.fillStyle=i%2?'rgba(117,151,150,.035)':'rgba(0,7,16,.12)';c.fillRect(random()*512,random()*384,1+random()*6,.5+random()*2);}
      for(let row=0;row<12;row++)for(const wrap of[-384,0,384]){
        const y=row*32+wrap,phase=row*1.37;c.beginPath();for(let x=-32;x<=544;x+=16){const yy=y+Math.sin(x/512*TAU*2+phase)*6+Math.cos(x/512*TAU*3-phase)*2;x===-32?c.moveTo(x,yy):c.lineTo(x,yy);}stroke(c,world===1?'rgba(110,155,171,.09)':'rgba(100,145,147,.09)',1.2);
      }
      const pattern=this.ctx.createPattern(canvas,'repeat');this.farTexture={world,canvas,pattern};return pattern;
    }
    surroundFor(world){
      if(this.surroundCache?.world===world)return this.surroundCache.canvas;
      const s=SURROUND,canvas=document.createElement('canvas');canvas.width=Math.round(s.w*s.scale);canvas.height=Math.round(s.h*s.scale);
      const c=canvas.getContext('2d');c.scale(s.scale,s.scale);c.translate(-s.x,-s.y);c.lineJoin='round';c.lineCap='round';const art=this.assets.get(THEMES[world]+'-surround');
      if(art?.ready)c.drawImage(art.image,s.x,s.y,s.w,s.h);else this.paintExteriorFallback(c,world);
      this.paintExitThreshold(c,world);
      // The distant coast dissolves into an unbounded water texture, rather than ending at an image rectangle.
      this.featherEdges(c,s.x,s.y,s.w,s.h,190);
      this.surroundCache={world,canvas};return canvas;
    }
    paintExteriorFallback(c,world){
      const p=PALETTES[world],random=rng(45198+world*867);c.fillStyle=this.farFor(world)||p.outside;c.fillRect(SURROUND.x,SURROUND.y,SURROUND.w,SURROUND.h);
      c.beginPath();c.roundRect(-285,-245,W+570,H+490,190);c.roundRect(-45,-40,W+90,H+80,40);c.fillStyle=gradient(c,-200,-200,1800,1200,world===2?['#473030','#2f242d','#1d202a']:world===1?['#40515b','#263f4d','#1b2d3d']:['#3d5146','#2e413c','#1a3036']);c.fill('evenodd');
      for(let y=-210;y<1230;y+=world===2?26:72)for(let x=-240;x<1870;x+=world===2?210:100){if(x>-45&&x<W&&y>-40&&y<H)continue;line(c,x,y,x+(world===2?205:94),y,'rgba(5,15,23,.35)',2);line(c,x,y+2,x+(world===2?205:94),y+2,'rgba(180,165,124,.10)',1);}
      if(world===0){
        for(const x of[-165,1765])for(const y of[100,310,710,920]){this.bush(c,x,y,random,75);this.bush(c,x-45,y+25,random,40);}
        for(const y of[-155,1155])for(const x of[180,510,1090,1420])this.bush(c,x,y,random,69);
        for(const[x,y]of[[-420,-230],[2020,1240]]){shadow(c,x+20,y+40,180,125,.45);ellipse(c,x,y,160,113,gradient(c,x-160,y-120,x+150,y+100,['#486056','#233d40','#142c37']));for(let i=0;i<7;i++){const off=(i-3)*39;c.beginPath();c.ellipse(x+off*.4,y,Math.max(15,150-Math.abs(off)),110,0,Math.PI,TAU);stroke(c,'#8d7b53',3);}line(c,x-155,y,x+155,y,'#ab8c56',4);}
      }else if(world===1){
        for(const x of[-555,1750]){box(c,x,-60,395,1120,'#142738',55);box(c,x+12,-48,371,1096,gradient(c,x,-50,x+380,1050,['#215566','#0b354d','#102c42']),43);for(let i=0;i<32;i++)line(c,x+30+random()*250,-25+i*33,x+65+random()*270,-28+i*33,'rgba(133,183,188,.12)',1.5);}
        for(const y of[-150,1150])for(let x=-100;x<1750;x+=220){shadow(c,x+20,y+22,47,34,.55);ellipse(c,x,y+14,34,24,'#203342');box(c,x-22,y-53,44,66,gradient(c,x-22,y,x+22,y,['#9b9d8d','#657c80','#2f495a']),7);for(const dx of[-13,-5,4,12])line(c,x+dx,y-43,x+dx,y+3,'rgba(180,189,165,.3)',2);ellipse(c,x,y-50,32,17,gradient(c,x-30,y-58,x+30,y-43,['#b5b29a','#72848a','#40596a']));}
      }else{
        for(const[x,y,r]of[[-420,-130,190],[2020,15,178],[-370,1090,198],[1990,1190,180],[500,-370,145],[1130,1370,150]]){shadow(c,x+24,y+38,r*1.2,r*.88,.58);for(let i=0;i<16;i++){const a=i*TAU/16,b=(i+1)*TAU/16;roundedPath(c,[[x,y-r*.34],[x+Math.cos(a)*r,y+Math.sin(a)*r*.75],[x+Math.cos(b)*r,y+Math.sin(b)*r*.75]],gradient(c,x-r,y-r,x+r,y+r,i%2?['#815c4d','#5d3436','#302631']:['#b09a75','#7a654f','#3f3635']));}ellipse(c,x,y,r,r*.75,null);stroke(c,'#ba935b',4);for(let i=0;i<22;i++){const a=i*TAU/22;circle(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.75,3.5,'#e3b06c');}}
      }
      for(const[x,y]of[[-220,30],[-220,970],[1820,30],[1820,970],[260,-200],[1340,-200],[260,1200],[1340,1200]])this.lantern(c,x,y,world);
    }
    paintExitThreshold(c,world){
      const art=this.assets.get(THEMES[world]);
      c.save();roundedPath(c,[[1582,426],[1719,426],[1734,581],[1582,587]],'rgba(2,10,18,.28)');
      c.beginPath();c.moveTo(1582,420);c.lineTo(1720,420);c.lineTo(1728,572);c.lineTo(1582,580);c.closePath();c.clip();
      if(art?.ready){const im=art.image;c.drawImage(im,im.naturalWidth*.71,im.naturalHeight*.44,im.naturalWidth*.10,im.naturalHeight*.15,1580,416,152,166);}
      else box(c,1580,416,152,166,gradient(c,1580,416,1732,582,world===2?['#533b32','#312a2d']:['#4a554d','#283b40']));
      if(world<2){c.save();c.globalCompositeOperation='screen';c.fillStyle=gradient(c,1584,500,1730,500,world===0?['rgba(163,143,93,.08)','rgba(191,161,104,.24)']:['rgba(134,157,157,.10)','rgba(185,166,115,.23)']);c.fillRect(1580,416,152,166);c.restore();}
      for(let x=1603;x<1730;x+=world===2?22:50){line(c,x,420,x+4,580,'rgba(5,15,22,.28)',1.8);line(c,x+2,420,x+6,580,'rgba(203,175,124,.11)',.8);}c.restore();
      line(c,1584,420,1720,420,'rgba(183,161,115,.27)',2);line(c,1584,580,1728,572,'rgba(8,20,28,.48)',3);
      if(world<2){
        // Shallow coping and turned balusters make the short threshold part of the adjacent stone bridge.
        const stone=world===0?['#a39e80','#707868','#3c5550']:['#b7b59f','#859693','#466371'];
        for(const[y0,y1]of[[420,420],[580,572]]){
          const left=1602,right=1724,at=x=>lerp(y0,y1,(x-left)/(right-left));
          line(c,left+5,y0+7,right+5,y1+7,'rgba(4,15,23,.25)',11);
          roundedPath(c,[[left,y0-2],[right,y1-2],[right,y1+8],[left,y0+8]],gradient(c,0,y0-2,0,y0+8,[stone[1],stone[2]]));
          line(c,left,y0-2,right,y1-2,stone[0],1.5);
          for(const x of[1608,1645,1683,1719]){const y=at(x);shadow(c,x+5,y+4,9,5,.28);c.save();c.translate(x,y);
            roundedPath(c,[[-5,0],[-4,-4],[-2,-8],[-5,-13],[-3,-20],[3,-20],[5,-13],[2,-8],[4,-4],[5,0]],gradient(c,-5,0,5,0,[stone[0],stone[1],stone[2]]));
            line(c,-2,-18,-2,-6,'rgba(227,215,172,.23)',.8);ellipse(c,0,-1,6,2.1,stone[1]);ellipse(c,0,-20,5.5,2,stone[0]);
            if(world===0)line(c,-4,1,4,1,'#365347',1.5);else line(c,-4,-5,4,-5,'#a98b54',1.2);c.restore();
          }
          roundedPath(c,[[left-3,y0-26],[right+3,y1-26],[right+3,y1-19],[left-3,y0-19]],gradient(c,0,y0-26,0,y0-18,[stone[0],stone[1],stone[2]]));
          line(c,left-3,y0-26,right+3,y1-26,world===0?'#c0b492':'#d0bc88',1.3);
          if(world===1)line(c,left,y0-21,right,y1-21,'#9b7a47',1.5);
          for(let x=1619;x<1710;x+=28){const y=at(x);line(c,x,y-26,x+2,y-21,'rgba(32,49,48,.25)',.8);}
        }
      }
    }
    exteriorBounds(){
      const pad=48;return{x:this.cameraX-this.centerX/this.scale-pad,y:this.cameraY-this.centerY/this.scale-pad,w:this.width/this.scale+pad*2,h:this.height/this.scale+pad*2};
    }
    surroundings(c,t,exit){
      const world=this.worldIndex,b=this.exteriorBounds(),s=SURROUND;c.save();
      // The floor fully covers this core. Keep only the 18-unit feather fringe and visible exterior in the backdrop pass.
      c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.rect(18,18,W-36,H-36);c.clip('evenodd');
      c.fillStyle=this.farFor(world)||PALETTES[world].outside;c.fillRect(b.x,b.y,b.w,b.h);
      c.drawImage(this.surroundFor(world),s.x,s.y,s.w,s.h);
      // All animation lives outside the arena. Gameplay tells and the established floor keep their contrast.
      c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.rect(0,0,W,H);c.clip('evenodd');
      this.exteriorAmbience(c,t,b,world);
      if(exit?.open)glow(c,1646,500,98,'rgba(237,183,98,.14)');c.restore();
    }
    exteriorAmbience(c,t,b,world){
      const clock=this.reducedMotion?0:t,inView=(x,y,r=100)=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
      const water=[[[.18,.28],[.18,.60],[.81,.28],[.85,.60],[.38,.19],[.60,.19],[.40,.80],[.70,.79]],[[.17,.41],[.17,.65],[.84,.27],[.87,.59],[.40,.15],[.64,.16],[.40,.80],[.62,.80]],[[.22,.36],[.21,.65],[.82,.36],[.82,.63],[.35,.22],[.60,.22],[.35,.76],[.65,.76]]][world];
      const lamps=[[[.197,.104],[.385,.035],[.502,.112],[.835,.086],[.925,.348],[.093,.835],[.212,.843],[.876,.849]],[[.202,.119],[.253,.166],[.422,.096],[.591,.096],[.814,.051],[.110,.452],[.112,.715],[.176,.820],[.756,.828],[.865,.653]],[[.215,.228],[.268,.070],[.350,.030],[.550,.030],[.860,.185],[.900,.398],[.967,.512],[.848,.625],[.623,.778],[.396,.762],[.258,.803],[.146,.598]]][world];
      for(let i=0;i<water.length;i++){const[xn,yn]=water[i],x=SURROUND.x+xn*SURROUND.w,y=SURROUND.y+yn*SURROUND.h;if(!inView(x,y,110))continue;
        const radius=33+Math.sin(clock*.55+i*1.8)*7;c.save();c.globalAlpha=.08+.025*Math.sin(clock*.4+i);ellipse(c,x,y,radius,7+Math.sin(clock*.55+i)*1.4,null,-.10);stroke(c,world===1?'#a2d5d4':'#98b6b5',1.3);ellipse(c,x+10,y+13,radius*.63,4,null,-.13);stroke(c,world===2?'#d8ad74':'#7baab7',1);
        for(let j=0;j<3;j++){const off=Math.sin(clock*.7+i+j)*5;line(c,x-12+off,y+24+j*5,x+7+off,y+23+j*5,world===2?'#d4a869':'#9ab7b1',1.2);}c.restore();
      }
      for(let i=0;i<lamps.length;i++){const[xn,yn]=lamps[i],x=SURROUND.x+xn*SURROUND.w,y=SURROUND.y+yn*SURROUND.h;if(!inView(x,y,95))continue;const flicker=.88+Math.sin(clock*1.1+i*2.1)*.05+Math.sin(clock*.4+i)*.03;glow(c,x,y,78,'rgba(235,160,72,.11)',flicker);glow(c,x,y,12,'rgba(255,210,128,.20)',flicker);}
      for(let i=0;i<3;i++){const q=water[(i*3+world)%water.length],x=SURROUND.x+q[0]*SURROUND.w+Math.sin(clock*.11+i)*26,y=SURROUND.y+q[1]*SURROUND.h+Math.cos(clock*.13+i)*10;if(!inView(x,y,200))continue;c.save();c.translate(x,y);c.scale(1,.31);glow(c,0,0,165+Math.sin(clock*.17+i)*12,world===1?'rgba(150,183,191,.047)':'rgba(137,165,174,.031)');c.restore();}
    }
    ambient(c,t){
      if(this.reducedMotion)return;c.save();
      if(this.worldIndex===0){for(let i=0;i<12;i++){const x=90+(i*163+t*(6+i%3))%1420,y=100+(i*211+Math.sin(t*.35+i)*15)%810;c.globalAlpha=.14;ellipse(c,x,y,2,4.5,i%3?'#c8b288':'#7aa58a',t*.4+i);}}
      else if(this.worldIndex===1){c.globalAlpha=.07;for(let i=0;i<18;i++){const x=130+(i*197)%1340,y=100+(i*173)%800;ellipse(c,x,y,30+Math.sin(t+i)*7,7+Math.sin(t+i)*2,null,-.2);stroke(c,'#8bb6d3',1.5);}}
      else{for(let i=0;i<10;i++){const x=150+(i*137)%1320,y=130+(i*227)%760;c.globalAlpha=.18;circle(c,x,y,1+Math.sin(t+i)*.3,'#cca77f');}}
      c.restore();
    }
    drawScreenAtmosphere(c,t,scene){
      // A gentle screen vignette holds the scene together without hiding contact silhouettes.
      const g=c.createRadialGradient(this.width*.50,this.height*.48,this.width*.20,this.width*.50,this.height*.48,Math.max(this.width,this.height)*.7);
      g.addColorStop(0,'rgba(0,4,12,0)');g.addColorStop(1,scene==='menu'?'rgba(0,4,12,.30)':'rgba(0,4,12,.12)');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);
    }
    drawWall(c,w){
      if(!w||!Number.isFinite(w.x)||w.w<=0||w.h<=0)return;const world=this.worldIndex,p=PALETTES[world];
      shadow(c,w.x+w.w*.56+12,w.y+w.h*.55+18,w.w*.66+20,w.h*.57+18,.5);
      if(world===0&&this.assets.get('fixture-planter')?.ready){
        const width=w.w+4,height=width*409/696,count=w.h>w.w?Math.ceil(w.h/(w.w*.55)):1;
        for(let i=0;i<count;i++){const bottom=w.y+w.h*(i+1)/count;this.sprite(c,'fixture-planter',w.x+w.w*.5,bottom-height*.45,width,height);}
        return;
      }
      box(c,w.x,w.y,w.w,w.h,'#0a111b',5);box(c,w.x+2,w.y+3,w.w-4,w.h-3,gradient(c,w.x,w.y,w.x,w.y+w.h,['#576b68','#2a3a40','#14202b']),4);
      // Visible stone thickness remains inside the collision footprint.
      box(c,w.x+2,w.y+w.h-15,w.w-4,13,gradient(c,0,w.y+w.h-15,0,w.y+w.h,['#53635b','#25323b','#14202b']),2);
      if(world===0){
        box(c,w.x+6,w.y+5,w.w-12,w.h-23,'#142d30',5);const random=rng(Math.round(w.x*5+w.y));c.save();c.beginPath();c.roundRect(w.x+7,w.y+6,w.w-14,w.h-25,4);c.clip();
        for(let y=w.y+15;y<w.y+w.h-14;y+=17)for(let x=w.x+13;x<w.x+w.w-5;x+=20){leaf(c,x,y,27,13,random()*TAU,['#4a8060','#24513f','#173536']);if(random()>.92)ellipse(c,x,y,3.5,2.5,'#bb855b');}
        c.restore();line(c,w.x+5,w.y+5,w.x+w.w-5,w.y+5,'#8c9781',2);
      }else if(world===1){
        box(c,w.x+8,w.y+8,w.w-16,w.h-32,'#0a223b',3);box(c,w.x+14,w.y+13,w.w-28,w.h-43,gradient(c,w.x,w.y,w.x+w.w,w.y+w.h,['#1d536a','#123c56','#0c2543']),2);
        c.save();c.beginPath();c.rect(w.x+14,w.y+13,w.w-28,w.h-43);c.clip();for(let j=0;j<10;j++){const yy=w.y+20+j*23;line(c,w.x+20,yy,w.x+w.w-20,yy-9,'rgba(108,178,185,.12)',2);}
        c.restore();for(let x=w.x+20;x<w.x+w.w-10;x+=25)box(c,x,w.y+3,12,5,'#71898a',1);line(c,w.x+7,w.y+7,w.x+w.w-7,w.y+7,'#a5a88e',2);
      }else{
        box(c,w.x+6,w.y+6,w.w-12,w.h-27,gradient(c,w.x,w.y,w.x+w.w,w.y+w.h,['#654134','#37232c','#1f202b']),3);
        for(let y=w.y+17;y<w.y+w.h-21;y+=28)line(c,w.x+10,y,w.x+w.w-11,y,'#211b23',2);
        for(const xx of[w.x+12,w.x+w.w-12]){line(c,xx,w.y+9,xx,w.y+w.h-19,'#a47c48',3);rivet(c,xx,w.y+13);rivet(c,xx,w.y+w.h-22);}
        line(c,w.x+5,w.y+5,w.x+w.w-5,w.y+5,'#b69460',2);
      }
    }
    drawExit(c,e,t){
      if(!e)return;const{x,y,w,h,open}=e;
      shadow(c,x+w*.6+10,y+h*.52+15,w*.9,h*.65,.6);
      const art=this.assets.get('fixture-gate');
      if(art?.ready){
        const gh=h+30,gw=gh*545/717,left=x+w*.5-gw*.5,top=y+h-gh,cx=x+w*.5,cy=top+gh*.66;
        if(open){
          glow(c,cx,y+h*.53,h*.8,'rgba(203,175,100,.21)');
          for(let xx=x-28;xx<x+w+8;xx+=21){line(c,xx,y+h*.5-8,xx+9,y+h*.5,'rgba(222,199,139,.6)',2);line(c,xx+9,y+h*.5,xx,y+h*.5+8,'rgba(222,199,139,.6)',2);}
          c.save();c.beginPath();c.rect(left-1,top-1,gw+2,gh+2);
          c.moveTo(left+gw*.215,top+gh*.98);c.lineTo(left+gw*.215,top+gh*.42);
          c.bezierCurveTo(left+gw*.215,top+gh*.27,left+gw*.40,top+gh*.18,left+gw*.50,top+gh*.18);
          c.bezierCurveTo(left+gw*.60,top+gh*.18,left+gw*.81,top+gh*.27,left+gw*.81,top+gh*.42);
          c.lineTo(left+gw*.81,top+gh*.98);c.closePath();c.clip('evenodd');this.sprite(c,'fixture-gate',cx,cy,gw,gh);c.restore();
          // The same painted grille folds against each jamb when the route is open.
          c.drawImage(art.image,1654,174,154,520,left+gw*.20,top+gh*.25,gw*.065,gh*.72);
          c.drawImage(art.image,1810,174,166,520,left+gw*.75,top+gh*.25,gw*.065,gh*.72);
          c.save();c.fillStyle='#e9cd94';c.textAlign='center';c.font='700 12px Georgia, serif';c.fillText('EXIT',cx,y+h+18);c.restore();
        }else this.sprite(c,'fixture-gate',cx,cy,gw,gh);
        return;
      }
      box(c,x-5,y-5,w+10,h+10,'#080e17',6);box(c,x,y,w,h,gradient(c,x,y,x+w,y,['#15232a','#080e17']),3);
      if(open){
        glow(c,x+w*.5,y+h*.5,h,'rgba(189,171,96,.14)');
        for(let yy=y+14;yy<y+h-8;yy+=24)line(c,x+9,yy,x+w-6,yy,'rgba(198,171,101,.12)',2);
        c.save();c.globalAlpha=.8+.1*Math.sin(t*2);c.fillStyle='#e6c995';c.textAlign='center';c.font='700 13px Georgia, serif';c.fillText('EXIT',x+w*.5,y+h*.52);c.restore();
        line(c,x+7,y+10,x+7,y+h-10,'#a6b98c',2);
      }else{
        for(let xx=x+15;xx<x+w-5;xx+=16){box(c,xx-2,y+8,5,h-16,gradient(c,xx-2,0,xx+3,0,['#8b805d','#493f34','#1d232b']),2);}
        for(const yy of[y+24,y+h-24])line(c,x+5,yy,x+w-5,yy,'#766145',5);
        box(c,x+w*.5-10,y+h*.5-12,20,25,gradient(c,x,y,x+w,y+h,['#a68850','#4d4339']),3);circle(c,x+w*.5,y+h*.5-2,3,'#10151e');
      }
      for(const xx of[x-8,x+w-3]){box(c,xx,y-8,13,h+16,gradient(c,xx,0,xx+13,0,['#8d8b72','#4b5b59','#1a2b34']),3);line(c,xx+2,y-6,xx+2,y+h+5,'#adb293',1);}
      box(c,x-10,y-13,w+20,16,gradient(c,0,y-13,0,y+3,['#8e927a','#405452','#182931']),4);for(const xx of[x-3,x+w+4])this.lantern(c,xx,y-19,this.worldIndex);
    }
    drawObject(c,o,t){
      const r=o.r||30,hp=clamp(o.hp/(o.maxHp||1),0,1),world=this.worldIndex;
      shadow(c,o.x+11,o.y+14,r*1.35,r*.94,.55,o.angle||0);
      c.save();c.translate(o.x,o.y);c.rotate(o.angle||0);
      const art=this.assets.get('prop-'+o.kind),artWidth=r*(o.kind==='machine'?1.65:1.8),artHeight=art?.spec?.crop?artWidth*art.spec.crop.h/art.spec.crop.w:r*2;
      if(!this.sprite(c,'prop-'+o.kind,0,0,artWidth,artHeight,0)){
      if(o.kind==='glass')this.glassObject(c,r,world);
      else if(o.kind==='crate')this.chestObject(c,r,world);
      else if(o.kind==='barrel')this.barrelObject(c,r);
      else if(o.kind==='valve')this.valveObject(c,r,t);
      else if(o.kind==='core')this.coreObject(c,r,t);
      else this.pumpObject(c,r,world);
      }
      if(hp<.72&&o.kind!=='glass'){line(c,-r*.68,-r*.18,-r*.14,r*.07,'#0c121d',2);line(c,-r*.14,r*.07,r*.05,r*.5,'#0c121d',1.3);line(c,-r*.12,r*.04,r*.30,-r*.22,'#59666a',.7);}
      if((o.flash||0)>0){c.globalAlpha=Math.min(.75,o.flash*4);c.globalCompositeOperation='screen';ellipse(c,0,-3,r*.94,r*.85,'#e5c892');}
      c.restore();
      if(hp<1&&hp>0&&(o.maxHp||1)>1){const width=Math.max(24,r*1.15);box(c,o.x-width/2-1,o.y-r-14,width+2,5,'#07101c',2);box(c,o.x-width/2,o.y-r-13,width*hp,2.5,'#dbb16d',1);}
    }
    glassObject(c,r,world){
      // Thick cut-glass vessels, with a base, rim and transmitted light.
      ellipse(c,0,r*.43,r*.62,r*.27,'#111f27');ellipse(c,0,r*.38,r*.59,r*.24,'#587c78');
      const colors=world===2?['#8d8ca6','#53546a','#273343']:world===1?['#91c3ca','#467f94','#183c59']:['#85baa1','#3b806d','#193e42'];
      roundedPath(c,[[-r*.42,-r*.68],[-r*.80,-r*.30,-r*.90,r*.30,-r*.48,r*.51],[0,r*.72,r*.70,r*.42,r*.68,r*.05],[r*.69,-r*.27,r*.43,-r*.68],[r*.20,-r*.83,-r*.25,-r*.83,-r*.42,-r*.68]],gradient(c,-r*.6,-r*.8,r*.7,r*.6,colors));stroke(c,'#162b35',1.6);
      for(const d of[-.48,-.18,.20,.47]){c.beginPath();c.moveTo(d*r*.75,-r*.66);c.quadraticCurveTo(d*r*1.6,r*.05,d*r,r*.5);c.strokeStyle=d<0?'rgba(208,239,205,.40)':'rgba(8,39,48,.45)';c.lineWidth=1.5;c.stroke();}
      ellipse(c,0,-r*.66,r*.43,r*.17,'#152d38');ring(c,0,-r*.67,r*.39,2,'#8fbeb0');
      line(c,-r*.42,-r*.43,-r*.58,r*.12,'rgba(228,248,220,.66)',3);line(c,-r*.28,-r*.44,-r*.37,r*.06,'rgba(232,248,229,.29)',1.3);
      ellipse(c,-r*.20,-r*.61,r*.19,r*.045,'#b7d8ba');ellipse(c,r*.30,r*.28,r*.18,r*.07,'rgba(122,182,169,.28)',-.4);
    }
    chestObject(c,r,world){
      const lid=world===2?['#7f4d40','#563239','#30242e']:['#8e7152','#5c4838','#352e30'];
      box(c,-r*.90,-r*.67,r*1.80,r*1.43,'#151b24',5);box(c,-r*.86,-r*.58,r*1.72,r*1.28,gradient(c,0,-r*.6,0,r*.7,['#58412f','#302a29']),3);
      box(c,-r*.91,-r*.78,r*1.82,r*.96,gradient(c,-r*.6,-r*.8,r*.9,r*.2,lid),6);line(c,-r*.82,-r*.72,r*.79,-r*.72,'#a58a62',1.4);
      for(let i=-2;i<=2;i++){line(c,-r*.76,-r*.6+i*r*.13,r*.76,-r*.6+i*r*.13,'rgba(24,24,29,.36)',1.1);}
      for(const x of[-r*.60,r*.60]){box(c,x-3,-r*.81,6,r*1.5,gradient(c,x-3,0,x+3,0,['#c09b59','#77623c','#282932']),1);for(const y of[-r*.63,r*.5])rivet(c,x,y,2.2);}
      box(c,-r*.13,-r*.02,r*.26,r*.40,gradient(c,-r*.15,0,r*.15,0,['#d5b26b','#947440','#493b31']),2);circle(c,0,r*.13,2.5,'#18202a');
      for(let i=0;i<7;i++){const x=-r*.72+i*r*.21;line(c,x,r*.36,x+8,r*.40,'rgba(141,104,69,.25)',.9);}
    }
    barrelObject(c,r){
      ellipse(c,0,r*.26,r*.84,r*.71,'#1b2029');box(c,-r*.82,-r*.45,r*1.64,r*.80,gradient(c,-r,0,r,0,['#b66c42','#694133','#31252b']),5);
      ellipse(c,0,-r*.24,r*.85,r*.64,gradient(c,-r,-r,r,r,['#c7854d','#8e5037','#4a3031']));stroke(c,'#1b222c',2);
      ellipse(c,0,-r*.28,r*.68,r*.48,null);stroke(c,'#d3a068',2);ellipse(c,0,-r*.28,r*.54,r*.36,'#744738');
      for(const yy of[-r*.53,r*.38]){c.beginPath();c.ellipse(0,yy,r*.84,r*.17,0,0,Math.PI);c.strokeStyle='#1d2731';c.lineWidth=6;c.stroke();c.beginPath();c.ellipse(0,yy-2,r*.84,r*.17,0,0,Math.PI);c.strokeStyle='#8e8b74';c.lineWidth=1.4;c.stroke();}
      circle(c,-r*.35,-r*.53,r*.16,'#131d2a','#a8a28a',2);line(c,-r*.40,-r*.55,-r*.31,-r*.51,'#cfbd82',1.3);
      roundedPath(c,[[-r*.21,-r*.24],[0,-r*.48],[r*.23,-r*.24],[0,r*.12]],'#debd7b');roundedPath(c,[[-r*.06,-r*.24],[r*.03,-r*.34],[r*.02,-r*.21],[r*.10,-r*.21],[-r*.05,-r*.05],[-r*.01,-r*.20]],'#64352e');
      line(c,-r*.58,-r*.65,-r*.1,-r*.79,'#e4ba80',1.7);
    }
    valveObject(c,r,t){
      const g=gradient(c,-r,-r,r,r,['#5c7574','#263d4c','#121e30']);
      box(c,-r*.86,-r*.47,r*1.72,r*.96,g,8);for(const x of[-r*.73,r*.73]){ellipse(c,x,0,r*.17,r*.57,'#a69060');ellipse(c,x,0,r*.11,r*.43,'#374d55');}
      ellipse(c,0,-4,r*.74,r*.71,'#151e2b');ellipse(c,0,-7,r*.70,r*.65,gradient(c,-r,-r,r,r,['#bc8957','#704a36','#302b30']));ellipse(c,0,-7,r*.49,r*.46,'#162835');
      for(let i=0;i<5;i++){const a=i*TAU/5+.2;line(c,Math.cos(a)*r*.11,Math.sin(a)*r*.11-7,Math.cos(a)*r*.55,Math.sin(a)*r*.52-7,'#b87845',6);line(c,Math.cos(a)*r*.17-1,Math.sin(a)*r*.17-9,Math.cos(a)*r*.55-1,Math.sin(a)*r*.52-9,'#e1ad68',1);}
      ring(c,0,-7,r*.64,6,'#875239');ring(c,-1,-8,r*.64,1,'#d0a16d');rivet(c,0,-7,5);
    }
    pumpObject(c,r,world){
      // A cast-iron pump: feet, pipes, fluted cylinder, flywheel and worn enamel.
      const col=world===2?['#876151','#4e3940','#222c36']:world===1?['#72949b','#34586c','#1c3049']:['#6c8c75','#355d51','#1e373b'];
      for(const yy of[-r*.60,r*.61])box(c,-r*.97,yy,r*1.94,r*.18,'#111d29',4);
      box(c,-r*.85,-r*.65,r*1.7,r*1.24,gradient(c,-r,-r,r,r,col),11);box(c,-r*.55,-r*.80,r*1.10,r*1.48,gradient(c,-r*.6,0,r*.6,0,[col[0],col[1],col[2]]),10);
      for(let x=-r*.43;x<r*.5;x+=6){line(c,x,-r*.63,x,r*.48,'#142734',2);line(c,x+1,-r*.61,x+1,r*.45,'rgba(161,176,149,.24)',1);}
      circle(c,0,-4,r*.40,'#0b1b2a','#9c9672',3);circle(c,0,-5,r*.29,'#2a4550');
      for(let i=0;i<7;i++){const a=i*TAU/7;roundedPath(c,[[Math.cos(a)*4,Math.sin(a)*4-5],[Math.cos(a+.15)*r*.25,Math.sin(a+.15)*r*.25-5],[Math.cos(a+.70)*r*.25,Math.sin(a+.70)*r*.25-5]],i%2?'#60827f':'#496764');}
      rivet(c,0,-5,3.4);for(const x of[-r*.70,r*.70])for(const y of[-r*.48,r*.40])rivet(c,x,y,2.7);
      box(c,r*.65,-r*.28,r*.26,r*.55,gradient(c,r*.6,0,r*.95,0,['#c3a46a','#796544','#3c3430']),3);
      line(c,-r*.73,-r*.55,-r*.59,-r*.55,'#bdd0b0',2);
    }
    coreObject(c,r,t){
      polygon(c,0,3,r,10,'#0d1928',Math.PI/10);polygon(c,0,-4,r*.93,10,gradient(c,-r,-r,r,r,['#9b8d66','#56605a','#243946']),Math.PI/10);
      polygon(c,0,-4,r*.75,10,'#162c3b',Math.PI/10);circle(c,0,-4,r*.55,'#0b1d2c','#768378',2);
      for(let i=0;i<10;i++){const a=i*TAU/10;box(c,Math.cos(a)*r*.82-2,Math.sin(a)*r*.82-5,4,4,'#c7a76a',1);}
      glow(c,0,-4,r*.53,'rgba(255,156,75,.23)');circle(c,0,-4,r*.36,gradient(c,-r,-r,r,r,['#ffe0a2','#dd8952','#673d3a']));
      for(let i=-2;i<=2;i++)line(c,-r*.29,i*r*.12-4,r*.29,i*r*.12-4,'#3d3d3e',3);weakRim(c,0,-4,r*.51,true);
    }
    drawRubble(c,o){
      const random=rng(hash(o.id??`${o.x},${o.y}`)),r=o.r||30;shadow(c,o.x+4,o.y+5,r*1.3,r*.8,.24);
      c.save();for(let i=0;i<9;i++){const a=random()*TAU,d=random()*r*1.2,x=o.x+Math.cos(a)*d,y=o.y+Math.sin(a)*d;
        c.save();c.translate(x,y);c.rotate(a);const size=3+random()*6;
        if(o.kind==='crate'){box(c,-size,-2,size*2.4,3,gradient(c,0,-2,0,2,['#877056','#3f352f']));line(c,-size,-2,size*.8,-2,'#a18c65',.6);}
        else{polygon(c,1,2,size,3,'#0b1823');polygon(c,0,0,size,3,o.kind==='glass'?'#3b6970':'#4e5b60');line(c,-size*.5,-size*.3,size*.25,-size*.5,o.kind==='glass'?'#91b3ac':'#b39767',.6);}
        c.restore();}c.restore();
    }
    drawEnemyTell(c,e,t){
      if(e.destroyed||e.hp<=0)return;
      if(e.telegraph){this.telegraph(c,e.telegraph,t);return;}
      if(e.phase==='windup'){const a=e.angle||0,r=e.r||23;this.telegraph(c,{shape:'line',x1:e.x+Math.cos(a)*r,y1:e.y+Math.sin(a)*r,x2:e.x+Math.cos(a)*250,y2:e.y+Math.sin(a)*250,width:r*1.9},t);}
      if(e.phase==='rush'){const a=e.angle||0;line(c,e.x-Math.cos(a)*85,e.y-Math.sin(a)*85,e.x,e.y,'rgba(232,105,67,.17)',e.r*1.8);}
    }
    drawEnemy(c,e,t){
      const r=e.r||23,dead=e.destroyed||e.hp<=0,kind=e.archetype||'rusher',a=e.angle||0;
      shadow(c,e.x+9,e.y+12,r*1.55,r,.52,a);c.save();c.translate(e.x,e.y);c.rotate(a);if(dead)c.globalAlpha=.45;
      const moving=e.phase==='rush'||e.phase==='seek',stride=moving?Math.sin(t*(e.phase==='rush'?30:16)):0;
      const spriteWidth=r*(kind==='rusher'?2.8:kind==='guard'?2.5:2.6),spriteHeight=r*(kind==='rusher'?1.78:kind==='guard'?2.0:1.95);
      if(!this.sprite(c,'enemy-'+kind,0,stride*.5,spriteWidth,spriteHeight,0)){
      // Articulated six-legged chassis. Facing is physical, so guard armor is honest.
      for(let side=-1;side<=1;side+=2)for(let i=0;i<3;i++){
        const x=(-.57+i*.53)*r,y=side*r*.51,kneeX=x-6+stride*(i%2?4:-4),kneeY=side*r*(.88+i%2*.12),footX=x+9-stride*5,footY=side*r*1.12;
        line(c,x,y,kneeX,kneeY,'#0a131f',6);line(c,kneeX,kneeY,footX,footY,'#0a131f',5);
        line(c,x-1,y-1,kneeX-1,kneeY-1,'#6b776e',3);line(c,kneeX-1,kneeY-1,footX-1,footY-1,'#a0885b',2);rivet(c,kneeX,kneeY,2.1);
      }
      roundedPath(c,[[-r*.88,-r*.36],[-r*.60,-r*.93,r*.15,-r*.88,r*.71,-r*.49],[r*.97,-r*.24,r*.97,r*.24,r*.71,r*.49],[r*.15,r*.88,-r*.60,r*.93,-r*.88,r*.36],[-r*1.01,0,-r*.88,-r*.36]],gradient(c,-r*.7,-r*.8,r*.9,r*.8,kind==='thrower'?['#746354','#3c464d','#182b3e']:kind==='guard'?['#8e8766','#4a6257','#213b40']:['#5c8b72','#325849','#1b343d']));stroke(c,'#0b1722',2);
      if(kind==='guard'){
        // Shield is a heavy convex sheet at the front, with a glowing rear vent.
        roundedPath(c,[[r*.08,-r*.98],[r*.88,-r*1.02,r*1.10,-r*.44,r*1.04,0],[r*1.10,r*.44,r*.88,r*1.02,r*.08,r*.98],[r*.42,0,r*.08,-r*.98]],gradient(c,r*.05,-r,r*1.1,r,['#b3a374','#5c6f65','#263d45']));stroke(c,'#10202b',2.5);
        c.beginPath();c.arc(0,0,r*1.03,-1.43,1.43);c.strokeStyle='#c6ad71';c.lineWidth=3;c.stroke();
        for(const yy of[-r*.55,0,r*.55])rivet(c,r*.64,yy,2.3);
        ellipse(c,-r*.61,0,r*.22,r*.39,'#0e222f');line(c,-r*.65,-r*.22,-r*.65,r*.22,'#d29355',3);
      }else if(kind==='thrower'){
        for(const yy of[-r*.48,r*.48]){box(c,-r*.79,yy-r*.20,r*.85,r*.40,gradient(c,0,yy-r*.2,0,yy+r*.2,['#9f9b76','#5d705e','#253949']),5);ellipse(c,-r*.79,yy,r*.15,r*.22,'#394e54');ring(c,-r*.78,yy,r*.14,2,'#c4a465');}
        box(c,r*.14,-r*.24,r*.97,r*.48,gradient(c,0,-r*.24,0,r*.24,['#af9c70','#615947','#253143']),5);ellipse(c,r*1.08,0,r*.12,r*.27,'#152433','#9d956f',2);ellipse(c,r*1.09,0,r*.07,r*.16,'#070f1d');
        circle(c,-r*.20,0,r*.25,'#172c3b','#8e946f',2);circle(c,-r*.2,0,r*.13,e.phase==='aim'?'#f0cc87':'#78a3ac');
      }else{
        c.beginPath();c.moveTo(-r*.55,-r*.56);c.bezierCurveTo(-r*.15,-r*.70,r*.49,-r*.56,r*.63,-r*.19);c.lineTo(-r*.63,-r*.19);c.closePath();c.fillStyle='#6a9274';c.fill();
        line(c,-r*.54,-r*.13,r*.60,-r*.13,'#c1a56f',2);line(c,-r*.53,r*.15,r*.56,r*.15,'#172f38',2);
        for(let i=0;i<4;i++)line(c,-r*.48+i*r*.21,-r*.50,-r*.42+i*r*.21,r*.49,'rgba(15,36,41,.50)',1.5);
        box(c,r*.44,-r*.32,r*.39,r*.64,'#142632',4);box(c,r*.67,-r*.20,r*.09,r*.40,e.phase==='windup'?'#ffe5a5':'#dc8b4e',2);
      }
      }
      if(e.phase==='stunned'&&!dead){for(let i=0;i<3;i++){const q=t*2+i*TAU/3;line(c,Math.cos(q)*r*1.05,Math.sin(q)*r*1.05,Math.cos(q)*r*1.23,Math.sin(q)*r*1.23,'#d2bc83',2);}}
      if(dead){line(c,-r*.67,-r*.40,r*.6,r*.47,'#111824',3);box(c,-r*.1,-r*.6,6,r*1.2,'#17222c',1);}
      if(e.flash>0){c.globalAlpha=Math.min(.70,e.flash*4);c.globalCompositeOperation='screen';ellipse(c,0,-2,r*.9,r*.75,'#e2c08c');}
      c.restore();
    }
    telegraph(c,tell,t){
      if(!tell)return;const cool=tell.reflectable===true,color=cool?'#7bd1d0':'#ed9870';
      if(tell.shape==='circle'){
        const x=tell.x,y=tell.y,r=tell.r;if(!Number.isFinite(x)||!Number.isFinite(r))return;
        circle(c,x,y,r,cool?'rgba(69,160,173,.065)':'rgba(213,83,52,.075)',color,2);
        stripeZone(c,x,y,r,cool?'rgba(110,207,211,.09)':'rgba(234,135,83,.10)');
        ring(c,x,y,r-5,1,'rgba(255,229,178,.35)');return;
      }
      if(!Number.isFinite(tell.x1)||!Number.isFinite(tell.x2))return;
      if(Array.isArray(tell.angles)&&tell.angles.length){const length=Math.hypot(tell.x2-tell.x1,tell.y2-tell.y1)||760;for(const a of tell.angles)this.telegraph(c,{...tell,angles:null,x2:tell.x1+Math.cos(a)*length,y2:tell.y1+Math.sin(a)*length},t);return;}
      const dx=tell.x2-tell.x1,dy=tell.y2-tell.y1,a=Math.atan2(dy,dx),length=Math.hypot(dx,dy),width=tell.width||60;
      c.save();c.translate(tell.x1,tell.y1);c.rotate(a);box(c,0,-width/2,length,width,cool?'rgba(89,183,191,.065)':'rgba(221,91,54,.08)',2);
      c.save();c.beginPath();c.rect(0,-width/2,length,width);c.clip();for(let x=-width;x<length+width;x+=36)line(c,x,-width/2,x+width,width/2,cool?'rgba(146,216,211,.10)':'rgba(248,166,105,.11)',4);c.restore();
      line(c,0,-width/2,length,-width/2,color,1.5);line(c,0,width/2,length,width/2,color,1.5);line(c,length,-width/2,length,width/2,'#f2d39c',2.5);
      for(let d=50;d<length;d+=110){line(c,d-8,-7,d+4,0,color,1.5);line(c,d+4,0,d-8,7,color,1.5);}
      c.restore();
    }
    drawBossTell(c,b,t){
      if(!b||b.destroyed)return;if(b.telegraph)this.telegraph(c,b.telegraph,t);
      if(b.kind==='carousel'){
        const inner=b.armInnerRadius||145;
        if(b.phase==='windup'){c.save();c.translate(b.x,b.y);for(const part of b.parts||[])if(!part.destroyed&&part.hp>0){
          const a=part.angle||Math.atan2(part.y-b.y,part.x-b.x),outer=(part.orbitRadius||208)+(part.r||35),arc=Number.isFinite(b.sweepArc)?b.sweepArc:1.7,anti=arc<0;
          c.beginPath();c.arc(0,0,outer,a,a+arc,anti);c.arc(0,0,inner,a+arc,a,!anti);c.closePath();c.fillStyle='rgba(212,92,54,.08)';c.fill();stroke(c,'rgba(235,171,111,.65)',1.7);
          for(let rr=inner+26;rr<outer;rr+=35){c.beginPath();c.arc(0,0,rr,a,a+arc,anti);c.strokeStyle='rgba(238,168,104,.15)';c.lineWidth=1;c.stroke();}
        }c.restore();}
      }
      const pulse=b.pulse;if(pulse&&Number.isFinite(pulse.r)&&pulse.r>0&&(b.kind==='carousel'||pulse.phase==='active')){
          const active=pulse.phase==='active'||b.phase==='pulse',inner=Math.max(0,Number.isFinite(pulse.innerR)?pulse.innerR:pulse.r-20);
          c.save();c.beginPath();c.arc(pulse.x??b.x,pulse.y??b.y,pulse.r,0,TAU);c.arc(pulse.x??b.x,pulse.y??b.y,inner,0,TAU,true);c.closePath();c.fillStyle=active?'rgba(244,153,83,.17)':'rgba(221,109,68,.07)';c.fill();
          ring(c,pulse.x??b.x,pulse.y??b.y,pulse.r,active?3:1.5,active?'#ffe2a1':'#ce9872');if(active)ring(c,pulse.x??b.x,pulse.y??b.y,inner,1,'rgba(255,208,147,.55)');c.restore();
      }
    }
    drawBoss(c,b,t){
      if(!b)return;const r=b.r||80;
      if(b.destroyed||b.hp<=0){
        shadow(c,b.x+12,b.y+15,r*1.5,r,.6);c.save();c.translate(b.x,b.y);c.rotate(b.angle||0);
        ellipse(c,0,0,r*.78,r*.65,gradient(c,-r,-r,r,r,['#3d504e','#1b2b3a','#101b2b']));
        for(let i=0;i<15;i++){const a=i*2.399,d=20+(i*23)%(r+20);polygon(c,Math.cos(a)*d,Math.sin(a)*d,7+i%4*4,i%2?3:5,gradient(c,-r,-r,r,r,['#637568','#302f35','#1c2a3a']),a);}
        for(let i=0;i<4;i++){const a=i*1.8;line(c,Math.cos(a)*15,Math.sin(a)*15,Math.cos(a+1)*r*.8,Math.sin(a+1)*r*.8,'#a68451',4);}
        c.restore();return;
      }
      if(b.kind==='carousel')this.drawCarousel(c,b,t);else if(b.kind==='bathmaster')this.drawBathmaster(c,b,t);else this.drawTopiarist(c,b,t);
      if(b.flash>0){c.save();c.globalAlpha=Math.min(.45,b.flash*3.5);c.globalCompositeOperation='screen';ellipse(c,b.x,b.y-4,r*.90,r*.85,'#dbc391');c.restore();}
    }
    bossLeg(c,x,y,side,step,scale,world){
      const kneeX=x-9*scale+step*4*scale,kneeY=y+side*24*scale,footX=x+13*scale-step*5*scale,footY=y+side*37*scale;
      line(c,x,y,kneeX,kneeY,'#0c1722',13*scale);line(c,kneeX,kneeY,footX,footY,'#101d29',10*scale);
      line(c,x-2,y-3,kneeX-2,kneeY-3,world===0?'#567765':'#74756a',8*scale);line(c,kneeX-2,kneeY-3,footX-2,footY-3,'#927b50',5*scale);
      rivet(c,kneeX,kneeY,5*scale);ellipse(c,footX,footY,12*scale,6*scale,gradient(c,footX-10,footY-4,footX+10,footY+5,['#8e8e6c','#344a49','#172b37']),side*.2);
    }
    drawTopiarist(c,b,t){
      const r=b.r||80,a=b.angle||0,stun=b.phase==='stunned',motion=b.phase==='charge'?1:b.phase==='stalk'?.5:0,step=Math.sin(t*(b.phase==='charge'?21:9))*motion;
      shadow(c,b.x+20,b.y+24,r*1.4,r*1.04,.67,a);c.save();c.translate(b.x,b.y);c.rotate(a);
      const painted=this.sprite(c,'topiarist',0,0,r*2.70,r*2.70*797/1202,0);
      if(!painted){
        for(const side of[-1,1])for(let i=0;i<3;i++)this.bossLeg(c,(-.61+i*.49)*r,side*r*.59,side,step*(i%2?-1:1),r/105,0);
        // Cast-bronze pruning automaton: overlapping mossy shell plates and a forked prow.
        roundedPath(c,[[-r*.87,-r*.37],[-r*.60,-r*.98,r*.20,-r*.98,r*.80,-r*.57],[r*1.04,-r*.30,r*1.03,r*.28,r*.79,r*.58],[r*.13,r*.99,-r*.63,r*.99,-r*.87,r*.38],[-r*.97,0,-r*.87,-r*.37]],gradient(c,-r*.6,-r*.9,r*.9,r*.9,['#687f64','#335749','#162f38']));stroke(c,'#091823',3);
        roundedPath(c,[[-r*.23,-r*.78],[r*.35,-r*.89,r*.72,-r*.44,r*.82,-r*.10],[r*.64,r*.58,r*.11,r*.73,-r*.28,r*.65],[-r*.03,r*.12,-r*.23,-r*.78]],gradient(c,-r*.2,-r*.8,r*.8,r*.7,['#80916c','#446957','#203e41']));
        for(let i=-2;i<=2;i++){
          const y=i*r*.26;c.beginPath();c.moveTo(-r*.13,y-r*.18);c.bezierCurveTo(r*.12,y-r*.28,r*.53,y-r*.18,r*.65,y+r*.06);c.strokeStyle='#182f35';c.lineWidth=4;c.stroke();c.beginPath();c.moveTo(-r*.12,y-r*.20);c.bezierCurveTo(r*.12,y-r*.29,r*.52,y-r*.19,r*.64,y+r*.04);c.strokeStyle='rgba(179,181,119,.24)';c.lineWidth=1;c.stroke();
        }
        // A plated shield at the exact front half of the physical body.
        roundedPath(c,[[r*.18,-r*.94],[r*.89,-r*.91,r*1.08,-r*.40,r*1.01,0],[r*1.08,r*.40,r*.89,r*.91,r*.18,r*.94],[r*.48,r*.25,r*.45,-r*.25,r*.18,-r*.94]],gradient(c,r*.1,-r*.8,r*1.05,r*.9,['#b39c6b','#637264','#253d43']));stroke(c,'#122630',3);
        c.beginPath();c.arc(0,0,r*1.015,-1.35,1.35);c.strokeStyle='#b9a374';c.lineWidth=4;c.stroke();c.beginPath();c.arc(-1,-3,r*.963,-1.33,1.33);c.strokeStyle='#e0cb92';c.lineWidth=1;c.stroke();
        for(let i=-2;i<=2;i++){const yy=i*r*.28;rivet(c,r*.69-Math.abs(i)*r*.08,yy,3.2);}
        ellipse(c,r*.73,0,r*.15,r*.23,'#132532');box(c,r*.77,-r*.11,r*.035,r*.22,b.phase==='windup'?'#ffe0a0':'#c9995a',2);
        // Worn leaf ornament is part of the metalwork, with physical moss clumps on the rear.
        for(let i=0;i<7;i++){const xx=-r*.33+(i%3)*r*.2,yy=-r*.59+Math.floor(i/3)*r*.55;leaf(c,xx,yy,20,10,i*.9,['#60865b','#365d43','#203d36']);}
      }
      // Exposed rear heart remains visible even when a painted body sprite is supplied.
      if(painted){
        const rx=-r*.85,ry=-r*.11;
        if(b.vulnerable){glow(c,rx,ry,r*.47,'rgba(255,185,100,.30)');weakRim(c,rx,ry,r*.40,true);}
        else{ellipse(c,rx,ry,r*.34,r*.37,'rgba(7,26,34,.42)');for(const yy of[-r*.17,r*.02,r*.21])line(c,rx-r*.26,ry+yy,rx+r*.26,ry+yy,'rgba(129,151,135,.75)',2.5);weakRim(c,rx,ry,r*.40,false);}
      }else{
      ellipse(c,-r*.65,0,r*.27,r*.42,'#101c29');ellipse(c,-r*.65,-3,r*.22,r*.35,gradient(c,-r,-r*.5,0,r*.5,['#bd905b','#6b4938','#302d32']));
      ellipse(c,-r*.67,-4,r*.12,r*.28,gradient(c,-r,-r*.4,0,r*.4,b.vulnerable?['#ffe9b1','#e6ac69','#97573c']:['#667d71','#3b5352','#213b46']));
      for(const yy of[-r*.19,0,r*.19])line(c,-r*.85,yy-3,-r*.48,yy-3,b.vulnerable?'#494b45':'#6b776b',b.vulnerable?3:5);weakRim(c,-r*.67,-3,r*.33,b.vulnerable!==false);
      }
      if(stun){for(let i=0;i<3;i++){const aa=t*1.8+i*TAU/3;line(c,Math.cos(aa)*r*.92,Math.sin(aa)*r*.84,Math.cos(aa)*r*1.08,Math.sin(aa)*r*.99,'#cfbb80',2);}}
      c.restore();
    }
    drawBathmaster(c,b,t){
      const r=b.r||84,a=b.angle||0,open=b.vulnerable||b.phase==='venting';shadow(c,b.x+21,b.y+26,r*1.55,r*1.10,.7);
      c.save();c.translate(b.x,b.y);
      const artWidth=r*2.35,artHeight=artWidth*1085/1202,painted=this.sprite(c,'bathmaster',0,0,artWidth,artHeight,a);
      if(!painted){
        for(const side of[-1,1])for(const x of[-r*.47,r*.49])this.bossLeg(c,x,side*r*.65,side,Math.sin(t*3+x)*.1,r/105,1);
        // A dark glazed pressure boiler: ceramic flank tanks, curled pipes and a brass shutter.
        for(const side of[-1,1]){ellipse(c,side*r*.67,r*.03,r*.36,r*.77,'#0c2032');ellipse(c,side*r*.67,r*.01,r*.31,r*.70,gradient(c,side*r*.67-r*.3,0,side*r*.67+r*.3,0,['#749395','#3e6678','#19394f']));
          for(const yy of[-r*.48,r*.46]){c.beginPath();c.ellipse(side*r*.67,yy,r*.31,r*.15,0,0,TAU);c.strokeStyle='#a79567';c.lineWidth=4;c.stroke();}}
        ellipse(c,0,1,r*.80,r*.93,gradient(c,-r*.6,-r*.9,r*.8,r*.8,['#8f9f9b','#476878','#18364e']));stroke(c,'#0c1e2e',3);
        ellipse(c,-r*.12,-r*.19,r*.63,r*.68,gradient(c,-r*.55,-r*.8,r*.65,r*.65,['#7897a2','#35586e','#19374d']));
        c.beginPath();c.ellipse(0,-3,r*.73,r*.83,0,Math.PI*1.08,Math.PI*1.81);c.strokeStyle='rgba(195,217,201,.48)';c.lineWidth=2;c.stroke();
        for(const x of[-r*.31,r*.31]){line(c,x,-r*.68,x,r*.63,'#203f52',3);line(c,x-2,-r*.69,x-2,r*.59,'#7d9a97',1);}
        for(let i=0;i<10;i++){const aa=i*TAU/10;rivet(c,Math.cos(aa)*r*.65,Math.sin(aa)*r*.70-3,3);}
      }
      if(painted){
        if(open){
          const iris=r*.35;glow(c,0,0,r*.58,'rgba(231,144,76,.27)');circle(c,0,0,iris,gradient(c,-iris,-iris,iris,iris,['#ffdf99','#c8844d','#6d3c30']));
          for(let i=0;i<6;i++){const aa=t*.6+i*TAU/6;leaf(c,Math.cos(aa)*r*.17,Math.sin(aa)*r*.17,r*.29,r*.09,aa+.8,['#604135','#b37c4a','#dcb56e']);}
          if(b.openCharges===1){c.save();c.rotate(a);c.beginPath();c.arc(0,0,iris,Math.PI,0);c.closePath();c.clip();this.sprite(c,'bathmaster',0,0,artWidth,artHeight,0);c.restore();}
          weakRim(c,0,0,r*.40,true);c.save();c.rotate(a);
          for(const side of[-1,1]){const lit=(b.openCharges??2)>=(side<0?1:2);if(lit)glow(c,side*r*.58,-r*.03,r*.18,'rgba(255,212,122,.65)');else ellipse(c,side*r*.58,-r*.03,r*.067,r*.16,'rgba(12,30,40,.76)');}
          c.restore();
          for(let i=0;i<4;i++){const f=(t*.5+i*.25)%1;glow(c,(i%2?1:-1)*r*.72,-r*.35-f*30,20+f*15,'rgba(146,190,189,.08)',1-f);}
        }
        c.restore();return;
      }
      c.save();c.rotate(a);box(c,r*.68,-r*.21,r*.59,r*.42,gradient(c,0,-r*.22,0,r*.22,['#bca06c','#6e5b46','#253241']),7);ellipse(c,r*1.25,0,r*.10,r*.26,'#988f70');ellipse(c,r*1.29,0,r*.065,r*.18,'#132638');
      line(c,r*.82,-r*.15,r*1.14,-r*.15,'#dfc58c',1.4);c.restore();
      circle(c,0,-5,r*.48,'#102435','#a88e60',5);circle(c,0,-5,r*.40,'#092036','#577c86',2);
      if(open){
        glow(c,0,-5,r*.6,'rgba(231,144,76,.25)');circle(c,0,-5,r*.36,gradient(c,-r*.3,-r*.4,r*.3,r*.3,['#ffe6a7','#e39c62','#874c42']));
        for(let i=0;i<6;i++){const aa=t*.6+i*TAU/6;leaf(c,Math.cos(aa)*r*.18,Math.sin(aa)*r*.18-5,r*.31,r*.09,aa+.8,['#734d3c','#a86b44','#d4a466']);}
        if(b.openCharges===1){c.save();c.translate(0,-5);c.beginPath();c.arc(0,0,r*.40,-Math.PI*.9,-Math.PI*.1);c.arc(0,0,r*.26,-Math.PI*.1,-Math.PI*.9,true);c.closePath();c.fillStyle=gradient(c,-r*.4,-r*.4,r*.4,0,['#b1b39a','#71858b','#314c65']);c.fill();stroke(c,'#233e51',1.5);c.restore();}
        for(const side of[-1,1]){const lit=(b.openCharges??2)>=(side<0?1:2);circle(c,side*r*.35,r*.24,r*.045,lit?'#f3c983':'#283f50');}
        weakRim(c,0,-5,r*.44,true);
        for(let i=0;i<4;i++){const f=(t*.5+i*.25)%1;glow(c,(i%2?1:-1)*r*.72,-r*.35-f*30,20+f*15,'rgba(146,190,189,.08)',1-f);}
      }else{
        for(let i=0;i<6;i++){const aa=i*TAU/6;c.save();c.rotate(aa);roundedPath(c,[[0,-5],[r*.37,-r*.18],[r*.45,r*.10,r*.22,r*.34],[0,-5]],gradient(c,0,-r*.2,r*.4,r*.3,['#b1b39a','#71858b','#314c65']));stroke(c,'#213e53',1.7);c.restore();}
        rivet(c,0,-5,6);
      }
      // Offset gauges are physical dials, not target badges.
      for(const side of[-1,1]){const x=side*r*.47,y=-r*.62;circle(c,x,y,15,'#0c2333','#b79d6a',3);circle(c,x,y,11,'#d1c59c');for(let i=0;i<6;i++){const aa=-2.5+i*.8;line(c,x+Math.cos(aa)*8,y+Math.sin(aa)*8,x+Math.cos(aa)*10,y+Math.sin(aa)*10,'#4b5556',1);}const needle=open?-1.1:.6;line(c,x,y,x+Math.cos(needle)*8,y+Math.sin(needle)*8,'#9a5343',2);}
      c.restore();
    }
    drawCarousel(c,b,t){
      const r=b.r||64,parts=b.parts||[],active=!!b.activeArms;
      for(const part of parts){
        const pr=part.r||35,a=Math.atan2(part.y-b.y,part.x-b.x),open=part.vulnerable??b.partsOpen??false;
        if(part.destroyed||part.hp<=0){shadow(c,part.x+8,part.y+10,pr*1.3,pr*.75,.35);c.save();c.translate(part.x,part.y);c.rotate(a);box(c,-pr*.6,-pr*.36,pr*1.2,pr*.72,'#293743',4);line(c,-pr,-pr*.2,pr*.8,pr*.4,'#77634c',5);line(c,-pr*.8,pr*.4,pr*.4,-pr*.5,'#3f5359',5);c.restore();continue;}
        const inner=b.armInnerRadius||145,ix=b.x+Math.cos(a)*inner,iy=b.y+Math.sin(a)*inner,len=Math.hypot(part.x-b.x,part.y-b.y);
        if(this.assets.get('carousel-arm')?.ready){
          // A slim raised linkage spans the harmless inner lane; the heavy beam starts at its exact attack radius.
          const safeStart=r*.82,safeLength=Math.max(0,inner-safeStart),safeMid=(inner+safeStart)*.5;
          this.sprite(c,'carousel-arm',b.x+Math.cos(a)*safeMid,b.y+Math.sin(a)*safeMid,safeLength,6,a,.5);
          line(c,ix+9,iy+13,part.x+9,part.y+13,'rgba(1,5,13,.40)',(b.armWidth||14)*2);
          this.sprite(c,'carousel-arm',(ix+part.x)*.5,(iy+part.y)*.5,Math.max(1,len-inner),(b.armWidth||14)*2,a);
        }else{
          line(c,b.x+12,b.y+19,part.x+12,part.y+19,'rgba(1,5,13,.42)',27);
          line(c,b.x,b.y,part.x,part.y,'#091421',25);line(c,b.x,b.y-3,part.x,part.y-3,'#635348',18);line(c,b.x-2,b.y-7,part.x-2,part.y-7,'#a5885b',3);
          for(let d=80;d<len-20;d+=38){const x=b.x+Math.cos(a)*d,y=b.y+Math.sin(a)*d;rivet(c,x,y-2,3);}
        }
        if(active){line(c,ix,iy,part.x,part.y,'rgba(225,140,69,.18)',38);line(c,ix,iy-4,part.x,part.y-4,'#d89357',3);}
        shadow(c,part.x+11,part.y+15,pr*1.35,pr*.85,.6,a);c.save();c.translate(part.x,part.y);c.rotate(a);
        // Each arm terminates in a suspended carved ride carriage surrounding an exposed bearing.
        if(this.sprite(c,'carousel-joint',0,0,pr*2,pr*2*582/538,0)){
          if(open){glow(c,0,0,pr*.57,'rgba(242,177,83,.27)');circle(c,0,0,pr*.43,'rgba(227,162,77,.30)');for(let i=0;i<4;i++){const aa=t*.6+i*TAU/4;line(c,Math.cos(aa)*pr*.15,Math.sin(aa)*pr*.15,Math.cos(aa+.4)*pr*.34,Math.sin(aa+.4)*pr*.34,'#d6ac66',2);}}
          else for(const yy of[-pr*.25,0,pr*.25]){const half=Math.sqrt((pr*.41)**2-yy**2);line(c,-half,yy+1,half,yy+1,'#1b202a',5);line(c,-half,yy-1,half,yy-1,'#9a7e52',2);}
          weakRim(c,0,0,pr*.53,open);
        }else{
        roundedPath(c,[[-pr*.84,-pr*.45],[-pr*.25,-pr*.97,pr*.52,-pr*.84,pr*.94,-pr*.34],[pr*.96,pr*.20,pr*.54,pr*.70,pr*.05,pr*.67],[-pr*.70,pr*.68,-pr*.96,pr*.20,-pr*.84,-pr*.45]],gradient(c,-pr,-pr,pr,pr,['#b29a6b','#795149','#302e3b']));stroke(c,'#0c1b29',2.5);
        for(const yy of[-pr*.55,pr*.5]){c.beginPath();c.moveTo(-pr*.52,yy);c.quadraticCurveTo(pr*.20,yy*.9,pr*.60,yy*.5);c.strokeStyle='#d0ae71';c.lineWidth=2;c.stroke();}
        box(c,-pr*.30,-pr*.49,pr*.73,pr*.98,'#18273a',6);box(c,-pr*.23,-pr*.40,pr*.59,pr*.80,gradient(c,-pr*.2,-pr*.4,pr*.4,pr*.4,open?['#edbc7f','#ba7952','#6c403b']:['#685a57','#3e3e4b','#1d2d40']),5);
        for(const yy of[-pr*.28,0,pr*.28])line(c,-pr*.21,yy,pr*.32,yy,open?'#6c523c':'#79837b',3);
        for(const x of[-pr*.57,pr*.61])rivet(c,x,0,3);weakRim(c,pr*.05,0,pr*.54,open);
        }
        if(part.flash>0){c.globalAlpha=Math.min(.65,part.flash*4);c.globalCompositeOperation='screen';ellipse(c,0,0,pr,pr*.8,'#e8c58a');}
        c.restore();
        const fraction=clamp(part.hp/(part.maxHp||4),0,1);if(fraction<1){box(c,part.x-19,part.y-pr-15,38,4,'#081522',2);box(c,part.x-18,part.y-pr-14,36*fraction,2,'#cda76b',1);}
      }
      shadow(c,b.x+18,b.y+25,r*1.58,r*1.12,.7);c.save();c.translate(b.x,b.y);
      const open=b.vulnerable||b.phase==='exposed';
      if(!this.sprite(c,'carousel',0,-5,r*2.15,r*2.15*1193/1175,0)){
        ellipse(c,0,9,r*1.06,r*.85,'#0e1c2d');ellipse(c,0,5,r*.99,r*.79,gradient(c,-r,-r,r,r,['#7c6a56','#433a40','#202a3a']));
        for(let i=0;i<12;i++){const aa=i*TAU/12;box(c,Math.cos(aa)*r*.92-2,Math.sin(aa)*r*.75+2,4,8,'#a2895c',1);}
        if(!open){
          // Faceted silk-and-bronze canopy with a raised central finial.
          for(let i=0;i<12;i++){const aa=i*TAU/12,bb=(i+1)*TAU/12;roundedPath(c,[[0,-r*.56],[Math.cos(aa)*r,Math.sin(aa)*r*.78],[Math.cos(bb)*r,Math.sin(bb)*r*.78],[0,-r*.56]],gradient(c,-r,-r,r,r,i%2?['#9b7855','#5c3639','#322a38']:['#556b70','#334454','#1a2b42']));stroke(c,'#1a2636',1);}
          ellipse(c,0,0,r,r*.78,null);stroke(c,'#bb9962',3);line(c,0,-r*.64,0,-r*.92,'#b9a070',5);ellipse(c,0,-r*.96,7,10,gradient(c,-5,-r*1.06,6,-r*.86,['#e1c58b','#a18a5e','#4d4b45']));
        }
      }
      if(open){
        ellipse(c,0,-4,r*.83,r*.73,gradient(c,-r,-r,r,r,['#8d795d','#4c4447','#202c3e']));ellipse(c,0,-6,r*.66,r*.58,'#102234');
        glow(c,0,-6,r*.64,'rgba(226,142,65,.18)');ellipse(c,0,-6,r*.48,r*.43,gradient(c,-r*.4,-r*.4,r*.4,r*.4,['#f3d18d','#bc7a4e','#6b453f']));
        for(let i=0;i<8;i++){const aa=t*.65+i*TAU/8;line(c,Math.cos(aa)*r*.15,Math.sin(aa)*r*.13-6,Math.cos(aa+.4)*r*.43,Math.sin(aa+.4)*r*.38-6,'#775744',5);}
        weakRim(c,0,-6,r*.59,true);
      }
      for(let i=0;i<14;i++){const aa=i*TAU/14,x=Math.cos(aa)*(r+1),y=Math.sin(aa)*r*.78;circle(c,x,y,3.7,'#403b35');circle(c,x-1,y-1,1.8,'#e0b775');}
      c.restore();
    }
    drawProjectile(c,q,t){
      const r=q.r||30,a=Math.atan2(q.vy||0,q.vx||1),friendly=!!q.reflected,spike=q.kind==='spike'||q.reflectable===false;
      shadow(c,q.x+8,q.y+11,r*1.1,r*.7,.4,a);c.save();c.translate(q.x,q.y);c.rotate(a);
      if(spike){
        line(c,-r*3,0,-r*.4,0,'rgba(219,93,57,.20)',r*.65);
        roundedPath(c,[[-r*.95,-r*.40],[r*1.25,0],[-r*.95,r*.40],[-r*.35,0],[-r*.95,-r*.40]],gradient(c,-r,-r*.4,r, r*.4,['#e6aa6f','#b2573e','#492c34']));stroke(c,'#1b2734',2);
        line(c,-r*.60,-r*.25,r*.88,0,'#f1c99a',1.5);line(c,-r*.5,0,-r*1.2,-r*.8,'#be6145',3);line(c,-r*.5,0,-r*1.2,r*.8,'#be6145',3);
      }else{
        line(c,-r*2.6,0,-r*.4,0,friendly?'rgba(220,207,140,.23)':'rgba(106,183,194,.20)',r*.75);
        const g=c.createRadialGradient(-r*.32,-r*.40,r*.06,r*.06,r*.08,r);g.addColorStop(0,friendly?'#fff0bd':'#d2f5ec');g.addColorStop(.32,friendly?'#dcc185':'#83c2ca');g.addColorStop(.70,friendly?'#8b825a':'#396d86');g.addColorStop(1,'#17304b');circle(c,0,0,r,g,'#102437',2);
        c.save();circle(c,0,0,r-1);c.clip();line(c,-r*.6,-r*1.2,r*.6,r*1.2,'#253d4e',r*.14);line(c,-r*.6-1,-r*1.2,r*.6-1,r*1.2,friendly?'#e6d391':'#96c9c6',1.5);c.restore();
        ellipse(c,-r*.29,-r*.45,r*.25,r*.11,'rgba(236,255,230,.74)',-.45);ellipse(c,r*.28,r*.30,r*.23,r*.10,'rgba(94,168,180,.3)',-.35);
        if(friendly){ring(c,0,0,r+5,1.5,'rgba(244,232,168,.65)');}
      }
      c.restore();
    }
    drawHazard(c,h,t){
      if(!h)return;const r=h.r||68;if(h.disabled||h.phase==='disabled'){ellipse(c,h.x,h.y,r*.42,r*.34,'rgba(13,35,48,.25)');return;}
      const warning=h.phase==='warning',active=h.phase==='active',impact=h.kind==='impact';
      c.save();c.translate(h.x,h.y);
      if(!h.transient&&!impact){ellipse(c,0,2,r*.43,r*.34,'#102539');ellipse(c,0,-2,r*.40,r*.32,gradient(c,-r*.4,-r*.3,r*.4,r*.3,['#617b82','#334d65','#172d47']));for(let i=-2;i<=2;i++)line(c,-r*.28,i*7-2,r*.28,i*7-2,'#10243b',3);}
      if(warning){circle(c,0,0,r,'rgba(221,120,63,.055)','#ddae74',1.7);stripeZone(c,0,0,r,'rgba(234,165,96,.10)');ring(c,0,0,r-5,1,'rgba(239,186,116,.23)');}
      if(active){
        circle(c,0,0,r,'rgba(179,194,188,.07)',impact?'#ebaf6c':'#a9d6d2',2);
        if(impact){ring(c,0,0,r*.85,2,'rgba(224,141,76,.35)');}
        else for(let i=0;i<8;i++){const f=(t*.9+i*.125)%1,a=i*2.4;const gx=Math.cos(a)*r*.35*f,gy=Math.sin(a)*r*.25*f-f*21;glow(c,gx,gy,r*(.20+f*.28),'rgba(165,204,207,.15)',1-f);}
      }c.restore();
    }
    drawPlayer(c,p,t){
      if(!p)return;const speed=Math.hypot(p.vx||0,p.vy||0),moving=clamp(speed/330,0,1),a=Number.isFinite(p.angle)?p.angle:0;
      const stride=this.reducedMotion?0:Math.sin(t*21)*moving,bob=this.reducedMotion?0:Math.sin(t*42)*moving*.55;
      shadow(c,p.x+8,p.y+12,31,22,.65,a);
      if(p.dashTime>0&&speed>1){
        c.save();c.lineCap='round';line(c,p.x-p.vx*.065,p.y-p.vy*.065,p.x,p.y,'rgba(214,179,112,.16)',32);line(c,p.x-p.vx*.040,p.y-p.vy*.040,p.x,p.y,'rgba(226,195,134,.18)',16);
        if(this.assets.get('hero')?.ready){this.sprite(c,'hero',p.x-p.vx*.033,p.y-p.vy*.033,94,71,a,.12);}
        c.restore();
      }
      c.save();c.translate(p.x,p.y);c.rotate(a);if(p.invulnerable>0)c.globalAlpha=.76+Math.sin(t*23)*.17;
      // Moving cloth is kept behind the painted body and the real physical attachment point.
      if(speed>20){const flutter=this.reducedMotion?0:Math.sin(t*15)*3;roundedPath(c,[[-12,-5],[-22,5,-33-flutter,2,-40-flutter,-4],[-33-flutter,6,-28,11,-21,8],[-10,3]],gradient(c,-35,0,-12,0,['#62222a','#a43832','#d56b43']));}
      const hasArt=this.assets.get('hero')?.ready;
      if(hasArt){
        c.translate(0,bob);c.rotate(stride*.016);this.sprite(c,'hero',0,0,94,71,0,1);
        // A restrained brass contact accent sits on the painted forearm bracer.
        ellipse(c,22,0,3.1,2.3,'#b7a17a');line(c,20.7,-1.1,23.3,-1.1,'#dfc38c',.7);
      }else{
        // Fully articulated cloak-and-leather fallback: limbs, engraved bracer, layered hood.
        c.rotate(Math.PI/2);
        for(const side of[-1,1]){const sy=side*stride,legX=side*8,footY=21+sy*6;
          line(c,legX,8,legX+side*3,footY,'#0d1725',10);line(c,legX-1,9,legX+side*3-1,footY-2,'#304051',6);
          box(c,legX-6+side*3,footY-1,13,15,gradient(c,0,footY,0,footY+15,['#79553b','#44372f','#1e2430']),5);line(c,legX-4+side*3,footY+8,legX+5+side*3,footY+8,'#a58658',1.4);}
        roundedPath(c,[[-17,-7],[-22,5,-20,20,-11,27],[0,22],[12,27],[22,15,21,3,17,-7]],gradient(c,-18,-6,18,27,['#b0a083','#655c52','#2e3441']));stroke(c,'#152131',1.5);
        roundedPath(c,[[-16,-9],[-8,-17,8,-17,16,-8],[13,12],[0,18],[-13,12]],gradient(c,-15,-10,14,15,['#d1bb91','#9b8b6e','#4d4b47']));
        line(c,-11,-7,-7,14,'#5a4a39',3);line(c,6,-11,0,16,'#58442f',5);box(c,-3,4,7,7,'#a58958',1);box(c,-1,6,3,3,'#3b302b');
        const leftY=5-stride*3;line(c,-15,-5,-22,leftY,'#152333',9);line(c,-15,-7,-22,leftY-2,'#c1aa84',6);ellipse(c,-23,leftY,4,5,'#6e5342');
        // Hand remains at the solver anchor after conversion into the rotated local frame.
        const hand=p.rope?.nodes?.[0],dx=(p.handX??hand?.x??p.x)-p.x,dy=(p.handY??hand?.y??p.y)-p.y,ar=a+Math.PI/2,hx=dx*Math.cos(ar)+dy*Math.sin(ar),hy=-dx*Math.sin(ar)+dy*Math.cos(ar);
        c.beginPath();c.moveTo(13,-7);c.quadraticCurveTo(hx*.5+8,hy*.5,hx,hy);c.strokeStyle='#142333';c.lineWidth=11;c.stroke();c.strokeStyle='#b5a080';c.lineWidth=7;c.stroke();
        ellipse(c,hx,hy,5,4.5,gradient(c,hx-4,hy-4,hx+4,hy+4,['#b99b66','#63553d','#253343']));
        roundedPath(c,[[-12,-8],[-14,-23,0,-31,13,-20],[15,-10,6,-4,-4,-5],[-12,-8]],gradient(c,-13,-24,14,-7,['#ecdbb0','#b7a888','#5b5d55']));stroke(c,'#263442',1.5);
        roundedPath(c,[[-5,-9],[-5,-18,9,-21,11,-12],[6,-5,-1,-4,-5,-9]],'#202637');ellipse(c,5,-11,4,3,'#b99b7b');line(c,4,-14,8,-13,'#0e1624',2);
        roundedPath(c,[[-11,-9],[-2,-4,8,-6,15,-11],[17,-5,4,2,-8,-3],[-11,-9]],gradient(c,-10,-10,14,0,['#9f3b33','#6e262b','#3b2430']));
      }
      c.restore();
    }
    drawWeightTrail(c,p,t){
      if(!p||!Number.isFinite(p.headX))return;const trail=this.weightTrail,last=trail[trail.length-1];
      if(last&&Math.hypot(last.x-p.headX,last.y-p.headY)>300)trail.length=0;
      if(!last||Math.hypot(last.x-p.headX,last.y-p.headY)>3)trail.push({x:p.headX,y:p.headY,t});
      while(trail.length&&t-trail[0].t>.115)trail.shift();const speed=Math.hypot(p.headVX||0,p.headVY||0);if(speed<330||trail.length<2||this.reducedMotion)return;
      c.save();for(let i=1;i<trail.length;i++){const f=i/trail.length;c.globalAlpha=f*clamp(speed/2800,.04,.21);line(c,trail[i-1].x,trail[i-1].y,trail[i].x,trail[i].y,'#d2b784',lerp(3,34,f));}
      if(speed>1000){c.globalAlpha=.4;for(let i=Math.max(1,trail.length-4);i<trail.length;i++)line(c,trail[i-1].x,trail[i-1].y-3,trail[i].x,trail[i].y-3,'#edd8ad',1.2);}
      c.restore();
    }
    drawCableAndWeight(c,p,t){
      if(!p||!Number.isFinite(p.headX)||!Number.isFinite(p.headY))return;const nodes=p.rope?.nodes||[{x:p.x,y:p.y},{x:p.headX,y:p.headY}];
      c.save();c.lineJoin='round';c.lineCap='round';const trace=(ox,oy)=>{c.beginPath();c.moveTo(nodes[0].x+ox,nodes[0].y+oy);for(let i=1;i<nodes.length;i++)c.lineTo(nodes[i].x+ox,nodes[i].y+oy);};
      trace(5,8);c.strokeStyle='rgba(1,7,16,.40)';c.lineWidth=7;c.stroke();trace(0,0);c.strokeStyle='#0c1a28';c.lineWidth=6.3;c.stroke();c.strokeStyle='#8f907b';c.lineWidth=4.1;c.stroke();c.strokeStyle='rgba(219,215,169,.65)';c.lineWidth=1.25;c.stroke();
      let traveled=0;for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.01)continue;const ux=(b.x-a.x)/length,uy=(b.y-a.y)/length;for(let d=(8-traveled%8)%8;d<length;d+=8){const x=a.x+ux*d,y=a.y+uy*d;line(c,x-ux*1.5-uy*1.5,y-uy*1.5+ux*1.5,x+ux*1.5+uy*1.5,y+uy*1.5-ux*1.5,'#3b4d55',1.2);}traveled+=length;}
      const x=p.headX,y=p.headY,r=p.headR||25;shadow(c,x+9,y+12,r*1.3,r,.65);c.translate(x,y);
      const prev=nodes[nodes.length-2]||p,cableAngle=Math.atan2(y-prev.y,x-prev.x),jx=-Math.cos(cableAngle)*(r+2),jy=-Math.sin(cableAngle)*(r+2);
      if(this.sprite(c,'weight',0,0,r*2.5,r*2.5*436/550,cableAngle)){c.restore();return;}
      ellipse(c,jx,jy,6,5,'#687568',cableAngle);stroke(c,'#142531',1.8);ellipse(c,jx,jy,3,2.5,'#0b1d2b',cableAngle);
      const rotation=Number.isFinite(p.weightAngle)?p.weightAngle:cableAngle;c.rotate(rotation);
      // A dense flanged wrecking head, lit as metal rather than a flat token.
      polygon(c,0,2,r+1,10,'#0a1927',Math.PI/10);
      const g=c.createRadialGradient(-r*.32,-r*.42,1,r*.18,r*.18,r*1.2);g.addColorStop(0,'#a7aea0');g.addColorStop(.33,'#627e7c');g.addColorStop(.68,'#2d505e');g.addColorStop(1,'#102839');polygon(c,0,-1,r,10,g,Math.PI/10);
      for(let i=0;i<10;i++){const a=i*TAU/10+Math.PI/10,b=(i+1)*TAU/10+Math.PI/10;line(c,Math.cos(a)*r,Math.sin(a)*r-1,Math.cos(b)*r,Math.sin(b)*r-1,i<5?'rgba(207,214,176,.45)':'rgba(9,31,46,.6)',1.4);}
      c.save();polygon(c,0,-1,r-.5,10,null,Math.PI/10);c.clip();
      for(const off of[-r*.25,r*.25]){line(c,-r*.9,off-r*.65,r*.9,off+r*.65,'#152839',8);line(c,-r*.9,off-r*.65-1,r*.9,off+r*.65-1,gradient(c,-r,-r,r,r,['#c5ad72','#8b7958','#4b4a44']),5);line(c,-r*.9,off-r*.65-2,r*.9,off+r*.65-2,'rgba(224,200,136,.65)',1);}
      c.restore();circle(c,0,-1,r*.28,'#183545','#8d9d86',1.5);rivet(c,0,-1,4);ellipse(c,-r*.31,-r*.49,r*.18,r*.08,'rgba(221,230,199,.48)',-.5);
      c.restore();
    }
    drawTarget(c,raw,reachable){
      if(!Number.isFinite(raw.x)||!Number.isFinite(raw.y))return;const target=reachable&&Number.isFinite(reachable.x)?reachable:raw,pixel=1/this.scale,limited=!!reachable?.clamped;
      for(let i=0;i<4;i++){const a=i*Math.PI/2;line(c,target.x+Math.cos(a)*4*pixel,target.y+Math.sin(a)*4*pixel,target.x+Math.cos(a)*7*pixel,target.y+Math.sin(a)*7*pixel,'rgba(9,20,31,.7)',3*pixel);line(c,target.x+Math.cos(a)*4*pixel,target.y+Math.sin(a)*4*pixel,target.x+Math.cos(a)*7*pixel,target.y+Math.sin(a)*7*pixel,limited?'#d0ac73':'#d4d3b0',pixel);}
    }
    drawEffects(c,s){
      c.save();c.lineCap='round';
      for(const r of s.rings||[]){const progress=1-clamp(r.life/(r.maxLife||.3),0,1),radius=Number.isFinite(r.r)?r.r:lerp(8,r.maxR||70,progress);c.globalAlpha=(1-progress)*.42;ring(c,r.x,r.y,radius,1.5+(1-progress)*2.5,r.color||'#dcc18a');}
      for(const p of s.particles||[]){const alpha=clamp(p.life/(p.maxLife||.5),0,1),size=(p.size||3)*(.5+alpha*.5);c.globalAlpha=alpha;
        if(Number.isFinite(p.angle)){polygon(c,p.x+2,p.y+3,size,3,'rgba(4,14,26,.35)',p.angle);polygon(c,p.x,p.y,size,3,p.color||'#bd9f6f',p.angle);if(size>3)line(c,p.x-1,p.y-1,p.x+size*.5,p.y-2,'rgba(242,227,180,.6)',.8);}
        else{line(c,p.x,p.y,p.x-(p.vx||0)*.024,p.y-(p.vy||0)*.024,p.color||'#e8c78c',Math.max(1,size));}
      }c.restore();
    }
    drawTouch(c,touches){
      for(const[kind,p]of Object.entries(touches)){if(!p||!Number.isFinite(p.ox))continue;const dx=p.x-p.ox,dy=p.y-p.oy,d=Math.hypot(dx,dy),k=d>52?52/d:1;c.save();c.globalAlpha=.8;circle(c,p.ox,p.oy,54,'rgba(5,15,28,.28)','rgba(198,180,139,.35)',1.4);circle(c,p.ox+dx*k,p.oy+dy*k,19,'rgba(221,206,162,.08)','rgba(224,209,163,.70)',1.4);c.fillStyle='#d6c59d';c.textAlign='center';c.font='600 10px system-ui, sans-serif';c.fillText(kind==='move'?'MOVE':'WEIGHT',p.ox,p.oy+74);c.restore();}
    }
  }
  window.WreckRenderer=WreckRenderer;
})();
