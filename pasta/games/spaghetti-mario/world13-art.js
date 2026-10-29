// World 1-3 sculptures. World coordinates use one tile = sixteen NES pixels.
// Every filled surface uses one of the existing photographic noodle textures.
export function createWorld13Art({ctx,material,strand,coil,photoShape,getTime=()=>0}) {
  const TAU=Math.PI*2;
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};

  function crownPath(x,y,w,h) {
    ctx.beginPath();
    ctx.moveTo(x+.18,y+.025);
    ctx.lineTo(x+w-.18,y+.025);
    ctx.quadraticCurveTo(x+w-.02,y+.025,x+w-.015,y+.23);
    ctx.lineTo(x+w-.015,y+h-.22);
    ctx.quadraticCurveTo(x+w-.04,y+h+.02,x+w-.3,y+h-.055);
    for(let j=Math.ceil(w*2)-1;j>=0;j--){
      const xx=x+.22+j*(w-.44)/Math.ceil(w*2);
      ctx.quadraticCurveTo(xx+.18,y+h+.08,xx,y+h-.06);
    }
    ctx.quadraticCurveTo(x+.01,y+h-.01,x+.015,y+h-.24);
    ctx.lineTo(x+.015,y+.24);
    ctx.quadraticCurveTo(x+.02,y+.025,x+.18,y+.025);
    ctx.closePath();
  }

  function drawTreetop(t) {
    const x=t.x,y=t.y,w=t.w,h=t.h??1;
    const trunkW=t.trunkWidth??t.trunkW??Math.max(.8,w-2),trunkX=t.trunkX??x+(w-trunkW)/2;
    const bottom=t.trunkBottom??15.2,trunkY=y+h*.55,trunkH=Math.max(.1,bottom-trunkY);

    // Tight straight bundles give the stem its original broad silhouette.
    // They remain visibly round, bent strands, rather than bark or timber.
    ctx.save();
    ctx.beginPath();ctx.rect(trunkX,trunkY,trunkW,trunkH);ctx.clip();
    for(let tx=trunkX;tx<trunkX+trunkW;tx+=1)for(let ty=trunkY;ty<bottom;ty+=2)
      material(1,tx,ty,Math.min(1,trunkX+trunkW-tx),Math.min(2,bottom-ty));
    const shade=ctx.createLinearGradient(trunkX,0,trunkX+trunkW,0);
    shade.addColorStop(0,'#281b0d90');shade.addColorStop(.18,'#ffeab719');
    shade.addColorStop(.6,'#00000000');shade.addColorStop(1,'#2a1c0f99');
    ctx.fillStyle=shade;ctx.fillRect(trunkX,trunkY,trunkW,trunkH);
    const count=Math.max(8,Math.ceil(trunkW/.13));
    for(let k=0;k<count;k++){
      const bx=trunkX+.05+k*(trunkW-.1)/(count-1),points=[];
      for(let j=0;j<=24;j++){
        const py=trunkY+trunkH*j/24;
        points.push([bx+Math.sin(py*2.8+k*.79)*.035,py]);
      }
      strand(points,.052,k%4===0?'pale':'gold',.72);
    }
    // Crossed pairs of long noodles form loose braids down the trunk.
    for(let k=0;k<Math.ceil(trunkW/.48);k++){
      const bx=trunkX+.24+k*.48;
      for(const sign of[-1,1]){
        const points=[];
        for(let j=0;j<=Math.ceil(trunkH*6);j++){
          const py=trunkY+trunkH*j/Math.ceil(trunkH*6);
          points.push([bx+Math.sin((py-trunkY)*4)*.15*sign,py]);
        }
        strand(points,.055,'gold',.6);
      }
    }
    ctx.restore();

    // A level upper edge matches the collision surface; a curled lower edge
    // gives the thick spinach-noodle bundle an irregular cooked surface.
    ctx.save();crownPath(x,y,w,h);ctx.clip();
    for(let k=0;k<Math.ceil(w);k++)material(3,x+k,y,Math.min(1,w-k),h);
    const topShade=ctx.createLinearGradient(0,y,0,y+h);
    topShade.addColorStop(0,'#edffd925');topShade.addColorStop(.32,'#00000000');topShade.addColorStop(1,'#10220baa');
    ctx.fillStyle=topShade;ctx.fillRect(x,y,w,h);
    for(let k=0;k<Math.ceil(w*4);k++){
      const px=x+.14+k*.25,py=y+.43+Math.sin(k*1.7+x)*.14;
      coil(px,py,.16,.19,'green',.04,1.1);
    }
    ctx.restore();
    for(let k=0;k<3;k++){
      const points=[];
      for(let j=0;j<=Math.ceil(w*8);j++)points.push([x+.05+(w-.1)*j/Math.ceil(w*8),y+.06+k*.09+Math.sin(j*.9+k)*.016]);
      strand(points,.075,'green');
    }
    strand([[x+.08,y+.18],[x+.06,y+.58],[x+.22,y+h-.08],[x+.46,y+h-.04]],.075,'green');
    strand([[x+w-.08,y+.18],[x+w-.06,y+.58],[x+w-.22,y+h-.08],[x+w-.46,y+h-.04]],.075,'green');
    for(let k=0;k<Math.ceil(w*2.5);k++){
      const px=x+.15+k*(w-.3)/Math.max(1,Math.ceil(w*2.5)-1);
      const len=.17+hash(k*9+x)*.22;
      strand([[px,y+h-.16],[px+.055,y+h-.03],[px-.03,y+h+len]],.045,'green',.9);
    }
  }

  function drawWings(e) {
    if(!e.winged||e.dead||e.removed)return;
    const now=getTime(),phase=Math.sin(now*5.2+(e.flightPhase||e.x||0));
    const centerX=e.x+e.w*.59,centerY=e.y+e.h*.43;
    for(const side of[-1,1]){
      const spread=.88+phase*.12;
      ctx.save();ctx.translate(centerX,centerY);ctx.scale(side*spread,1);
      ctx.rotate(-.22-phase*.16);
      photoShape(5,()=>{
        ctx.beginPath();ctx.moveTo(.02,.23);
        ctx.bezierCurveTo(.22,-.05,.23,-.65,.56,-.9);
        ctx.bezierCurveTo(.65,-.94,.74,-.82,.7,-.66);
        ctx.bezierCurveTo(.99,-.82,1.04,-.56,.85,-.34);
        ctx.bezierCurveTo(1.05,-.42,1.05,-.15,.84,.03);
        ctx.bezierCurveTo(.63,.22,.33,.38,.02,.23);ctx.closePath();
      },0,-.95,1.08,1.35,.97);
      for(let k=0;k<5;k++){
        const tipX=.5+Math.sin(k*.58)*.43,tipY=-.88+k*.21;
        strand([[.06,.22],[.2+k*.045,-.02],[tipX*.94,tipY-.03],[tipX,tipY+.06],[.31+k*.06,.13],[.06,.22]],.055,'pale');
      }
      strand([[.04,.23],[.29,.27],[.58,.16],[.83,-.02]],.07,'pale');
      ctx.restore();
    }
  }

  function drawLargeCastle({doorX=159,tile,cameraX=-1e9,viewWidth=2e9,wallRight=null,trimPalette='gold'}) {
    const offset=doorX-159;
    const visible=x=>x+offset+1>=cameraX&&x+offset<=cameraX+viewWidth;
    function brick(x,y,kind='body') {
      if(!visible(x))return;
      const px=x+offset;
      ctx.save();
      if(kind==='crown'){
        ctx.beginPath();ctx.moveTo(px,y+1);ctx.lineTo(px,y+.1);
        ctx.lineTo(px+.23,y+.1);ctx.lineTo(px+.23,y+.37);
        ctx.lineTo(px+.42,y+.37);ctx.lineTo(px+.42,y+.1);
        ctx.lineTo(px+.68,y+.1);ctx.lineTo(px+.68,y+.37);
        ctx.lineTo(px+.87,y+.37);ctx.lineTo(px+.87,y+.1);
        ctx.lineTo(px+1,y+.1);ctx.lineTo(px+1,y+1);ctx.closePath();ctx.clip();
      }
      tile({x:px,y,type:'brick'});
      if(kind==='trim'){
        strand([[px+.02,y+.13],[px+.5,y+.12],[px+.98,y+.13]],.07,trimPalette);
        strand([[px+.02,y+.29],[px+.5,y+.3],[px+.98,y+.29]],.06,trimPalette);
      }
      ctx.restore();
    }
    // The original data includes the wall continuing fourteen tiles to the
    // right of the nine-tile castle. Keep its full silhouette, with culling.
    for(let y=7;y<=12;y++)for(let x=155;x<=(wallRight===null?177:Math.min(177,wallRight-offset));x++)brick(x,y,y===7?(x>=157&&x<=161?'trim':'crown'):'body');
    for(let y=4;y<=6;y++)for(let x=157;x<=161;x++)brick(x,y,y===4?(x===157||x===161?'crown':'trim'):'body');
    for(let y=2;y<=3;y++)for(let x=158;x<=160;x++)brick(x,y,y===2?'crown':'body');

    function arch(x,y,h=2) {
      if(!visible(x))return;
      const px=x+offset;
      photoShape(9,()=>{
        ctx.beginPath();ctx.moveTo(px+.13,y+h);
        ctx.lineTo(px+.13,y+.54);
        ctx.bezierCurveTo(px+.13,y+.02,px+.87,y+.02,px+.87,y+.54);
        ctx.lineTo(px+.87,y+h);ctx.closePath();
      },px+.1,y+.08,.8,h-.08);
      strand([[px+.1,y+h],[px+.1,y+.65],[px+.14,y+.28],[px+.5,y+.08],[px+.86,y+.28],[px+.9,y+.65],[px+.9,y+h]],.06,trimPalette,.9);
      for(let k=0;k<3;k++)strand([[px+.22+k*.25,y+h-.05],[px+.21+k*.25,y+.85],[px+.24+k*.25,y+.52]],.04,'dark',.6);
    }
    arch(159,5);arch(158,8);arch(160,8);
    arch(157,11);arch(159,11);arch(161,11);
  }

  return {drawTreetop,drawWings,drawLargeCastle};
}
