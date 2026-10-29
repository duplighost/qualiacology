// Castle surfaces are macro photographs of cooked spaghetti. Heat is rendered
// as illumination on those noodles; no flame, liquid, stone or metal sprites.
export function createWorld14Art({ctx,material,strand,coil,photoShape,drawSprite,getTime=()=>0}) {
  const TAU=Math.PI*2;
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};

  function glow(x,y,r=1,power=.2){
    ctx.save();ctx.globalCompositeOperation='screen';
    const light=ctx.createRadialGradient(x,y,0,x,y,r);
    light.addColorStop(0,'rgba(255,183,58,'+power+')');
    light.addColorStop(.25,'rgba(255,92,18,'+(power*.55)+')');
    light.addColorStop(1,'rgba(150,25,0,0)');ctx.fillStyle=light;
    ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }

  // Call under the normal world translation (-camera, 0), before solids.
  function drawCastleBackdrop({camera=0,viewWidth=20}={}){
    const left=Math.floor(camera/6)*6,now=getTime();
    for(let x=left;x<camera+viewWidth+6;x+=6)for(let y=0;y<15;y+=5){
      ctx.save();const flip=(Math.floor(x/6)+Math.floor(y/5))%2!==0;
      ctx.translate(x+(flip?6:0),y);ctx.scale(flip?-1:1,1);material(16,0,0,6,5);ctx.restore();
    }
    const depth=ctx.createLinearGradient(0,0,0,15);
    depth.addColorStop(0,'#02050bdc');depth.addColorStop(.45,'#02050b9c');depth.addColorStop(1,'#140903a8');
    ctx.fillStyle=depth;ctx.fillRect(camera,0,viewWidth,15);
    // Low-amplitude reflected heat maintains the visible black noodle texture.
    const reflection=ctx.createLinearGradient(0,8,0,15);
    reflection.addColorStop(0,'rgba(139,44,11,0)');reflection.addColorStop(1,'rgba(160,62,13,'+(.07+Math.sin(now*1.1)*.015)+')');
    ctx.fillStyle=reflection;ctx.fillRect(camera,8,viewWidth,7);
  }

  function drawLava(lava,cameraX=-1e9,viewWidth=2e9){
    if(Array.isArray(lava)){for(const l of lava)drawLava(l,cameraX,viewWidth);return;}
    if(!lava)return;
    const left=Math.max(lava.x,cameraX-.2),right=Math.min(lava.x+lava.w,cameraX+viewWidth+.2);
    if(right<=left)return;
    const now=getTime(),y=lava.y??13,h=lava.h??2;
    ctx.save();ctx.beginPath();ctx.moveTo(left,y);
    for(let x=left;x<=right+.05;x+=.14)ctx.lineTo(Math.min(right,x),y+Math.sin(x*3.6-now*1.9)*.035+Math.sin(x*7.1+now*.9)*.018);
    ctx.lineTo(right,y+h);ctx.lineTo(left,y+h);ctx.closePath();ctx.clip();
    for(let x=Math.floor(left/1.5)*1.5;x<right;x+=1.5){
      ctx.save();ctx.translate(x,y);ctx.translate(0,Math.sin(now*.8+x)*.016);material(14,0,0,1.5,h+.08);ctx.restore();
    }
    const shade=ctx.createLinearGradient(0,y,0,y+h);shade.addColorStop(0,'#ffe8a936');shade.addColorStop(.3,'#ff8b0909');shade.addColorStop(1,'#361009c9');
    ctx.fillStyle=shade;ctx.fillRect(left,y,right-left,h);
    // A few loose strands move with delayed phases over the photographic pile.
    // Irregular spacing leaves its real wet noodle texture visible at game scale.
    const rows=Math.min(9,Math.max(5,Math.ceil(h*3.5)));
    for(let row=0;row<rows;row++){
      const points=[],f=row/(rows-1),yy=y+.025+Math.pow(f,1.6)*(h-.09);
      for(let x=left-.08;x<=right+.08;x+=.14)points.push([x,yy+Math.sin(x*(3.8+row*.17)-now*(1.2-row*.04)+row*.8)*.044+Math.sin(x*2.2+now*.65+row)*.026]);
      strand(points,.038+hash(row+17)*.016,row%4===0?'pale':row%3===0?'gold':'red',row<3?.82:.42);
    }
    ctx.restore();
    // Small loops lifted by the moving noodle pile; these are still strands.
    for(let x=Math.floor(left);x<right;x++){
      const phase=(now*.37+hash(x*3.7))%1,px=x+.15+hash(x+11)*.67;
      if(phase>.67&&phase<.96&&px>left&&px<right){
        const lift=Math.sin((phase-.67)/.29*Math.PI)*.16;
        coil(px,y-lift,.08,.025+lift*.35,'gold',.035,1.2);
      }
    }
    const reflected=ctx.createLinearGradient(0,y-2,0,y+.4);
    reflected.addColorStop(0,'rgba(255,118,22,0)');reflected.addColorStop(.72,'rgba(255,106,19,.045)');reflected.addColorStop(1,'rgba(255,143,34,.14)');
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=reflected;ctx.fillRect(left,y-2,right-left,2.4);ctx.restore();
  }

  function firebarBalls(bar){
    if(Array.isArray(bar.balls)&&bar.balls.length)return bar.balls;
    const count=bar.count??6,spacing=bar.spacing??.5,r=bar.radius??.24,angle=bar.angle??0;
    return Array.from({length:count},(_,i)=>({x:bar.x+Math.cos(angle)*i*spacing,y:bar.y+Math.sin(angle)*i*spacing,r}));
  }
  function drawFirebar(bar){
    if(!bar||bar.removed||bar.active===false)return;
    const balls=firebarBalls(bar),now=getTime();
    if(balls.length>1)strand(balls.map(p=>[p.x,p.y]),.055,'red');
    for(let i=0;i<balls.length;i++){
      const p=balls[i],r=p.r??bar.radius??.24;
      glow(p.x,p.y,r*3.1,.17+Math.sin(now*7+i*.6)*.018);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate((bar.angle??0)+i*.48+Math.sin(now*3+i)*.06);
      drawSprite(14,-r,-r,r*2,r*2,{wiggle:.006});ctx.restore();
      coil(p.x-r*.1,p.y-r*.1,r*.27,r*.24,'pale',.025);
    }
    if(balls.length){const p=balls[0];coil(p.x,p.y,.12,.12,'gold',.04,1.5);}
  }

  function drawBridge(bridge){
    if(Array.isArray(bridge)){for(const b of bridge)drawBridge(b);return;}
    if(!bridge||bridge.removed)return;
    const b=bridge,x=b.x,y=b.y,w=b.w??1,h=b.visualHeight??b.h??.38,now=getTime();
    ctx.save();if(b.rotation){ctx.translate(x+w/2,y+h/2);ctx.rotate(b.rotation);ctx.translate(-x-w/2,-y-h/2);}
    photoShape(15,()=>{ctx.beginPath();ctx.roundRect(x,y,w,h,.045)},x,y,w,h);
    for(let row=0;row<4;row++){
      const points=[];for(let j=0;j<=12;j++)points.push([x+.025+(w-.05)*j/12,y+.045+row*(h-.09)/3+Math.sin(j*1.4+row*1.1)*.013]);
      strand(points,.048,row===0?'pale':'gold');
    }
    for(const px of[x+.06,x+w-.06]){
      coil(px,y+h/2,.045,h*.43,'gold',.035,1.1);
      strand([[px,y+h-.02],[px+.025,y+h+.12],[px-.02+Math.sin(now*2.8+x)*.025,y+h+.27]],.035,'gold');
    }
    ctx.restore();
  }

  function drawAxe(axe){
    if(!axe||axe.triggered||axe.removed)return;
    const now=getTime(),w=axe.w??1,h=axe.h??1.5;
    glow(axe.x+w*.5,axe.y+h*.35,.85,.085+Math.sin(now*3)*.025);
    drawSprite(13,axe.x,axe.y,w,h,{wiggle:.006});
  }

  function drawBoss(boss){
    if(!boss||boss.removed||boss.active===false||boss.y>17)return;
    const b=boss,now=getTime(),w=b.w??2,h=b.h??2;
    if(b.revealed||b.revealedEnemy||b.revealedKind||b.defeatCause==='fire'&&b.dead){
      drawSprite(1,b.x+w*.2,b.y+h*.25,w*.6,h*.58,{flipY:!!b.dead,wiggle:.012});return;
    }
    const squash=b.dead?0:Math.sin(now*2.3)*.015;
    drawSprite(b.mouthOpen?15:11,b.x-.1,b.y-.08,w+.2,h+.12,{flip:b.facing>0,flipY:!!b.flipped,squash,wiggle:b.dead?.012:.018,alpha:b.hitFlash>0&&Math.floor(now*30)%2?.6:1});
    if(b.mouthOpen&&!b.dead){const mx=b.facing>0?b.x+w:b.x;glow(mx,b.y+h*.51,.7,.17);}
    // Loose hair strands and shell-rim tails bend gently behind the sculpture.
    if(!b.dead){
      const side=b.facing>0?-1:1,px=b.x+w*.5,yy=b.y+h*.25;
      for(let k=0;k<3;k++)strand([[px+side*w*.14,yy+k*.055],[px+side*w*.23,yy-.1+k*.07],[px+side*w*.3+Math.sin(now*4+k)*.035,yy-.14+k*.09]],.038,'red');
    }
  }

  function drawToad(toad){
    if(!toad||toad.hidden||toad.removed)return;
    const w=toad.w??1,h=toad.h??1.3,now=getTime();
    drawSprite(12,toad.x-.06,toad.y-.04,w+.12,h+.06,{wiggle:.008,squash:Math.sin(now*1.5)*.006});
  }

  function drawBreath(projectile){
    if(!projectile||projectile.removed)return;
    const p=projectile,now=getTime(),w=p.w??.9,h=p.h??.48,dir=(p.vx??-1)>0?1:-1;
    const cx=p.x+w*.5,cy=p.y+h*.5;
    glow(cx,cy,1.15,.19);
    // A trailing tangle stretches elastically, with no flame-shaped silhouette.
    for(let k=0;k<5;k++){
      const yy=cy+(k-2)*h*.12,tail=dir<0?p.x+w:p.x;
      strand([[cx,yy],[tail-dir*.12,yy+Math.sin(now*8+k)*.04],[tail-dir*.4,yy+Math.sin(now*8+k-1)*.07],[tail-dir*.65,yy+Math.sin(now*8+k-2)*.055]],.043,k%2?'red':'gold');
    }
    photoShape(14,()=>{ctx.beginPath();ctx.ellipse(cx,cy,w*.5,h*.5,0,0,TAU)},p.x,p.y,w,h);
    for(let k=0;k<3;k++)coil(cx-dir*k*w*.08,cy,w*(.42-k*.09),h*(.43-k*.08),k===2?'pale':k===1?'gold':'red',.043,1.3);
  }

  return {drawCastleBackdrop,drawLava,drawFirebar,drawBridge,drawAxe,drawBoss,drawToad,drawBreath,glow};
}
