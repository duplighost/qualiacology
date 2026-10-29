// NES title composition, rebuilt from photographic spaghetti. Coordinates in
// this module are the original 256 by 240 screen pixels, not CSS pixels.
export function createMenuArt({ctx,materials,actors,material,strand,coil,photoShape}) {
  const letters={
    A:['01110','11011','11011','11111','11011','11011','11011'],B:['11110','11011','11011','11110','11011','11011','11110'],
    C:['01111','11000','11000','11000','11000','11000','01111'],D:['11110','11011','11011','11011','11011','11011','11110'],
    E:['11111','11000','11000','11110','11000','11000','11111'],F:['11111','11000','11000','11110','11000','11000','11000'],
    G:['01111','11000','11000','11011','11011','11011','01111'],H:['11011','11011','11011','11111','11011','11011','11011'],
    I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00011','00011','00011','11011','11011','01110'],
    K:['11011','11011','11110','11100','11110','11011','11011'],L:['11000','11000','11000','11000','11000','11000','11111'],
    M:['11011','11111','11111','11011','11011','11011','11011'],N:['11011','11111','11111','11111','11011','11011','11011'],
    O:['01110','11011','11011','11011','11011','11011','01110'],P:['11110','11011','11011','11110','11000','11000','11000'],
    Q:['01110','11011','11011','11011','11111','00110','00011'],R:['11110','11011','11011','11110','11100','11010','11011'],
    S:['01111','11000','11000','01110','00011','00011','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],
    U:['11011','11011','11011','11011','11011','11011','01110'],V:['11011','11011','11011','11011','11011','01110','00100'],
    W:['11011','11011','11011','11011','11111','11111','01010'],X:['11011','11011','01110','00100','01110','11011','11011'],
    Y:['11011','11011','11011','01110','00100','00100','00100'],Z:['11111','00011','00110','00100','01100','11000','11111'],
    '0':['01110','11011','11011','11011','11011','11011','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','11011','00011','00110','01100','11000','11111'],'3':['11110','00011','00011','01110','00011','00011','11110'],
    '4':['11011','11011','11011','11111','00011','00011','00011'],'5':['11111','11000','11000','11110','00011','00011','11110'],
    '6':['01111','11000','11000','11110','11011','11011','01110'],'7':['11111','00011','00011','00110','00110','01100','01100'],
    '8':['01110','11011','11011','01110','11011','11011','01110'],'9':['01110','11011','11011','01111','00011','00011','11110'],
    '-':['00000','00000','00000','11111','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],
    ':':['00000','00110','00110','00000','00110','00110','00000'],'!':['00100','00100','00100','00100','00100','00000','00100'],
    '/':['00001','00011','00110','00100','01100','11000','10000'],'©':['01110','10001','10111','10101','10111','10001','01110'],
    '+':['00000','00100','00100','11111','00100','00100','00000']
  };
  const glyphs=new Map();
  function glyph(char,mat=5){
    const key=char+':'+mat;if(glyphs.has(key))return glyphs.get(key);
    const rows=letters[char];if(!rows)return null;
    const c=document.createElement('canvas');c.width=60;c.height=84;
    const g=c.getContext('2d'),mask=new Path2D();
    for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(rows[y][x]==='1')mask.roundRect(x*12,y*12,12,12,1.7);
    g.save();g.clip(mask);g.drawImage(materials[mat],0,0,c.width,c.height);
    const shine=g.createLinearGradient(0,0,60,84);shine.addColorStop(0,'#fff7d448');shine.addColorStop(.4,'#ffffff00');shine.addColorStop(1,'#2b1d1d50');g.fillStyle=shine;g.fillRect(0,0,60,84);g.restore();
    // Individual rounded strands remain visible along the lettering strokes.
    g.save();g.clip(mask);g.lineCap='round';
    for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(rows[y][x]==='1'){
      for(let n=0;n<3;n++){g.beginPath();g.moveTo(x*12+1,y*12+2+n*3.8);g.quadraticCurveTo(x*12+6,y*12+1+n*3.8,x*12+11,y*12+2.5+n*3.8);g.strokeStyle=mat===9?'#24271f':'#8b78593b';g.lineWidth=2.8;g.stroke();g.strokeStyle=mat===9?'#68705a65':'#fff6cfaa';g.lineWidth=.65;g.stroke();}
    }g.restore();glyphs.set(key,c);return c;
  }
  function text(value,x,y,{cw=1.2,ch=1,advance=8,mat=5,align='left',shadow=false}={}){
    value=String(value).toUpperCase();const width=(value.length-1)*advance+5*cw;
    if(align==='center')x-=width/2;else if(align==='right')x-=width;
    for(let i=0;i<value.length;i++){const im=glyph(value[i],mat);if(!im)continue;if(shadow){const sh=glyph(value[i],9);ctx.drawImage(sh,x+i*advance+1.5,y+2.5,5*cw,7*ch);}ctx.drawImage(im,x+i*advance,y,5*cw,7*ch);}
  }
  function fillBackground(mat=4,height=240,width=256){
    for(let x=0;x<width;x+=128)for(let y=0;y<height;y+=128){ctx.save();ctx.translate(x+((x/128)%2?128:0),y);ctx.scale((x/128)%2?-1:1,1);material(mat,0,0,128,128);ctx.restore();}
    if(mat===9){ctx.fillStyle='#02040ba8';ctx.fillRect(0,0,width,height);}
  }
  function hud({name='MARIO',score=0,coins=0,level='1-1',time=null}={}){
    text(name,24,16);text(String(score).padStart(6,'0'),24,24);
    if(actors[3])ctx.drawImage(actors[3],88,23,5,8);text('X'+String(coins).padStart(2,'0'),96,24);
    text('WORLD',144,16);text(level==='q1-1'?'1-1 II':level,152,24);text('TIME',200,16);if(time!==null)text(String(Math.ceil(time)).padStart(3,'0'),208,24);
  }
  function titleLandscape(){
    photoShape(3,()=>{ctx.beginPath();ctx.moveTo(0,208);ctx.lineTo(29,181);ctx.quadraticCurveTo(40,169,48,179);ctx.lineTo(80,208);ctx.closePath();},0,173,80,35);
    strand([[0,207],[29,182],[39,173],[48,178],[80,208]],1.2,'green');coil(41,180,.7,1.5,'dark',.8);coil(47,181,.7,1.5,'dark',.8);
    photoShape(3,()=>{ctx.beginPath();ctx.moveTo(184,208);for(let x=184;x<248;x+=16)ctx.bezierCurveTo(x+1,196,x+7,186,x+16,199);ctx.lineTo(248,208);ctx.closePath();},184,192,64,16);
    for(let j=0;j<13;j++)coil(188+j*4.6,202+(j%2),3,4,'green',.65);
    for(let row=0;row<2;row++)for(let col=0;col<16;col++){
      const x=col*16,y=208+row*16;material(1,x,y,16,16);
      strand([[x,y+15.5],[x,y+.5],[x+15.4,y+.5]],.9,'pale');strand([[x+15.5,y+.5],[x+15.5,y+15.5],[x,y+15.5]],.85,'dark');
      strand([[x+.5,y+8],[x+15.5,y+8]],.7,'dark');strand([[x+8,y],[x+8,y+7.5]],.65,'dark');strand([[x+4,y+8],[x+4,y+16]],.6,'dark');
    }
    if(actors[0])ctx.drawImage(actors[0],40,191,16,17);
  }
  function title({choice=0,topScore=0}={}){
    fillBackground(4);titleLandscape();hud();
    material(1,40,32,176,88);ctx.fillStyle='#5a210e70';ctx.fillRect(40,32,176,88);
    for(const edge of [[[40,119],[40,32]],[[40,32],[215,32]],[[215,32],[215,119]],[[215,119],[40,119]]])strand(edge,1.4,'dark');
    for(const [x,y]of[[43,35],[212,35],[43,116],[212,116]])coil(x,y,.75,.75,'pale',.7);
    text('SUPER',49,39,{cw:2.45,ch:3.9,advance:16,shadow:true});
    text('MARIO',49,72,{cw:2.45,ch:5.5,advance:16,shadow:true});
    text('BROS.',132,72,{cw:2.45,ch:5.5,advance:16,shadow:true});
    text('©1985 NINTENDO',104,121,{cw:1,ch:0.9,advance:8});
    text('1 PLAYER GAME',88,144);text('2 PLAYER GAME',88,160);
    if(actors[4])ctx.drawImage(actors[4],72,144+choice*16,8,8);
    text('TOP- '+String(topScore).padStart(6,'0'),96,184);
  }
  function worldIcon(level,x,y){
    if(level==='1-2'||level==='4-2'){
      material(3,x+5,y+3,17,22);for(let n=0;n<5;n++)strand([[x+6+n*3,y+5],[x+6+n*3,y+25]],1.1,'green');
      for(let n=0;n<3;n++)strand([[x+2,y+3+n*1.5],[x+24,y+3+n*1.5]],1.7,'green');
    }else if(level==='4-3'){
      for(const [cx,cy,w]of[[x+7,y+10,17],[x+23,y+1,19]]){
        for(let k=0;k<3;k++)strand([[cx-2+k*2,cy+7],[cx-3+k*2,y+27]],1.3,'pale');
        photoShape(0,()=>{ctx.beginPath();ctx.ellipse(cx,cy+5,w/2,5,0,0,Math.PI*2)},cx-w/2,cy,w,10);
        for(const dx of[-4,0,4])coil(cx+dx,cy+4,1.5,1.7,'red',1.3);
      }
    }else if(level==='1-3'||level==='5-3'){
      material(0,x+12,y+10,6,17);for(let n=0;n<3;n++)strand([[x+13+n*2,y+10],[x+12+n*2,y+18],[x+13+n*2,y+27]],1.2,'gold');
      photoShape(3,()=>{ctx.beginPath();ctx.roundRect(x,y+2,29,9,3)},x,y,29,12);for(let n=0;n<5;n++)strand([[x+1,y+3+n*1.5],[x+14,y+2+n*1.5],[x+28,y+3+n*1.5]],.9,'green');
      if(level==='5-3'&&actors[27])ctx.drawImage(actors[27],x+18,y+15,17,10);
    }else if(level==='6-2'){
      for(const[px,py,h]of[[x+1,y+2,25],[x+19,y+12,15]]){
        material(3,px,py,12,h);
        for(let n=0;n<4;n++)strand([[px+1+n*3,py+3],[px+1+n*3,py+h]],.9,'green');
        for(let n=0;n<3;n++)strand([[px-1,py+n*1.4],[px+13,py+n*1.4]],1.4,'green');
      }
      if(actors[3])ctx.drawImage(actors[3],x+22,y+1,6,9);
    }else if(level==='2-2'||level==='7-2'){
      if(actors[16])ctx.drawImage(actors[16],x+7,y+1,19,26);
      coil(x+4,y+9,2,2,'pale',.7);coil(x+28,y+3,1.4,1.4,'pale',.6);
    }else if(level==='2-3'||level==='7-3'){
      material(23,x,y+19,32,7);for(let k=0;k<4;k++)strand([[x,y+20+k*1.5],[x+15,y+22+k*1.1],[x+32,y+20+k*1.5]],.8,'gold');
      if(actors[17])ctx.drawImage(actors[17],x+9,y,17,17);
    }else if(level==='2-1'){
      photoShape(5,()=>{ctx.beginPath();ctx.ellipse(x+17,y+6,13,5,0,0,Math.PI*2)},x+4,y+1,26,10);
      for(let k=0;k<3;k++)strand([[x+10+k*2,y+27],[x+13+k*2,y+18],[x+11+k*2,y+7]],1.5,'green');
      for(let k=0;k<3;k++){const yy=y+13+k*5;strand([[x+13,yy],[x+6,yy-3],[x+8,yy+1],[x+13,yy]],1.2,'green');strand([[x+14,yy-2],[x+22,yy-5],[x+20,yy-1],[x+14,yy-2]],1.2,'green');}
    }else if(level==='3-1'){
      if(actors[19])ctx.drawImage(actors[19],x+7,y,20,28);
      if(actors[21])ctx.drawImage(actors[21],x-1,y+1,10,11);
    }else if(level==='3-2'){
      material(1,x,y+24,32,4);
      if(actors[2])ctx.drawImage(actors[2],x+1,y+5,15,21);
      if(actors[6])ctx.drawImage(actors[6],x+17,y,16,17);
      for(let k=0;k<3;k++)strand([[x+2,y+25+k],[x+30,y+25+k]],.7,'gold');
    }else if(level==='3-3'||level==='6-3'){
      const ropePalette=level==='6-3'?'stone':'gold';
      strand([[x+7,y+19],[x+7,y+3],[x+25,y+3],[x+25,y+13]],1.1,ropePalette);
      coil(x+7,y+4,2,2,level==='6-3'?'stone':'pale',.7);coil(x+25,y+4,2,2,level==='6-3'?'stone':'pale',.7);
      for(const [px,py]of[[x,y+19],[x+18,y+13]]){
        photoShape(1,()=>{ctx.beginPath();ctx.roundRect(px,py,14,5,2)},px,py,14,5);
        for(let k=0;k<3;k++)strand([[px+.5,py+1+k],[px+13.5,py+1+k]],.7,k===0?'pale':'gold');
      }
    }else if(level==='5-1'){
      if(actors[27])ctx.drawImage(actors[27],x+2,y,28,15);
      photoShape(3,()=>{ctx.beginPath();ctx.ellipse(x+16,y+23,11,6,0,0,Math.PI*2)},x+5,y+17,22,12);for(let k=0;k<3;k++)coil(x+16,y+23,10-k*2,5-k,'green',1.1);
    }else if(level==='5-2'){
      if(actors[19])ctx.drawImage(actors[19],x+2,y+1,19,27);
      if(actors[27])ctx.drawImage(actors[27],x+18,y+8,17,10);
    }else if(level==='4-1'||level==='6-1'){
      if(actors[22])ctx.drawImage(actors[22],x+5,y-2,24,31);
      if(actors[24])ctx.drawImage(actors[24],x-2,y+17,11,12);
    }else if(level==='7-1'){
      material(27,x+2,y+8,13,19);for(let k=0;k<5;k++)strand([[x+3+k*2.5,y+8],[x+3+k*2.5,y+27]],1,'stone');
      for(let k=0;k<3;k++)strand([[x,y+7+k*1.5],[x+17,y+7+k*1.5]],1.4,'stone');
      if(actors[27])ctx.drawImage(actors[27],x+13,y+1,22,13);
    }else if(level==='8-1'){
      for(const [dx,w]of[[0,12],[18,14]]){material(1,x+dx,y+24,w,4);strand([[x+dx,y+24],[x+dx+w,y+24]],.8,'gold');}
      if(actors[28])ctx.drawImage(actors[28],x+1,y+13,15,12);
      if(actors[2])ctx.drawImage(actors[2],x+18,y+2,15,22);
    }else if(level==='8-2'){
      if(actors[27])ctx.drawImage(actors[27],x+4,y,27,15);
      for(let k=0;k<3;k++)coil(x+10,y+19+k*3,7,2.7,'gold',1);
      strand([[x+1,y+16],[x+19,y+16]],1.8,'pale');
    }else if(level==='8-3'){
      if(actors[19]){ctx.drawImage(actors[19],x,y+1,18,26);ctx.drawImage(actors[19],x+17,y+5,18,23);}
    }else if(level==='q1-1'){
      material(1,x,y+24,32,4);
      if(actors[28])ctx.drawImage(actors[28],x+2,y+4,29,23);
    }else if(['1-4','2-4','3-4','4-4','5-4','6-4','7-4','8-4'].includes(level)){
      photoShape(13,()=>{ctx.beginPath();ctx.moveTo(x,y+27);ctx.lineTo(x,y+5);ctx.lineTo(x+7,y+5);ctx.lineTo(x+7,y+11);ctx.lineTo(x+11,y+11);ctx.lineTo(x+11,y+1);ctx.lineTo(x+20,y+1);ctx.lineTo(x+20,y+11);ctx.lineTo(x+25,y+11);ctx.lineTo(x+25,y+5);ctx.lineTo(x+32,y+5);ctx.lineTo(x+32,y+27);ctx.closePath()},x,y,32,28);
      photoShape(16,()=>{ctx.beginPath();ctx.roundRect(x+12,y+17,8,11,4)},x+12,y+17,8,11);
      for(let n=0;n<3;n++)strand([[x,y+13+n*6],[x+32,y+13+n*6]],.8,'ice');
      if(level!=='1-4'&&actors[14])ctx.drawImage(actors[14],x+21,y+15,13,13);
      if(level==='8-4'&&actors[29])ctx.drawImage(actors[29],x+11,y+3,12,24);
    }else{
      photoShape(3,()=>{ctx.beginPath();ctx.moveTo(x,y+24);ctx.lineTo(x+11,y+5);ctx.quadraticCurveTo(x+15,y,x+20,y+8);ctx.lineTo(x+31,y+24);ctx.closePath();},x,y,32,26);
      material(1,x,y+24,32,4);strand([[x,y+24],[x+32,y+24]],1,'gold');
    }
  }
  function selector({selected=0,players=1,topScore=0,columns=1}={}){
    const names=['OVERWORLD','UNDERGROUND','TREETOPS','BOWSER CASTLE','VINE AND SKY','UNDERWATER','FLYING FISH','LAVA AND LIFTS','NIGHT AND HAMMERS','SHELLS AND STARS','NIGHT AND SCALES','FIREBARS AND LAVA','LAKITU AND SPINIES','VINES AND WARPS','MUSHROOMS AND LIFTS','THE LOOPING CASTLE','CANNONS AND SHELLS','HAMMERS AND SKY','BILLS AND TREETOPS','FIREBARS AND LIFTS','NIGHT AND LAKITU','PIPES AND SECRETS','PALE NIGHT LIFTS','FIRE AND HAMMERS','SNOW AND CANNONS','THE DEEPER SEA','FISH AND KOOPAS','THE FINAL MAZE','THE LONG ROAD','SPRINGS AND BILLS','HAMMER GAUNTLET','THE LAST CASTLE','BUZZY BEETLE RETURN'];
    const levels=['1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2','3-3','3-4','4-1','4-2','4-3','4-4','5-1','5-2','5-3','5-4','6-1','6-2','6-3','6-4','7-1','7-2','7-3','7-4','8-1','8-2','8-3','8-4','q1-1'];
    const wide=columns===2,page=Math.floor(selected/9),first=page*9,last=Math.min(first+9,levels.length);
    fillBackground(9,wide?256:416,wide?480:256);
    if(!wide)hud({score:topScore,level:levels[selected]});
    text('SELECT A WORLD',wide?240:128,wide?12:41,{align:'center'});
    text(players+' PLAYER GAME',wide?240:128,wide?27:54,{align:'center',ch:.85,cw:1.05,advance:7});
    text((page+1)+'/'+Math.ceil(levels.length/9),wide?458:228,wide?27:54,{align:'right',ch:.85,cw:1.05,advance:7});
    for(let i=first;i<last;i++){
      const local=i-first,rows=wide?Math.ceil((last-first)/2):last-first,y=wide?47+(5-rows)*14.75+(local%rows)*29.5:68+local*29.5;
      ctx.save();if(wide&&local>=rows)ctx.translate(240,0);
      if(i===selected){photoShape(7,()=>{ctx.beginPath();ctx.roundRect(28,y-5,200,29,4)},28,y-5,200,29,.7);for(const edge of [[[30,y+23],[30,y-3]],[[30,y-3],[225,y-3]],[[225,y-3],[225,y+23]],[[225,y+23],[30,y+23]]])strand(edge,.9,'pale',.7);}
      ctx.save();ctx.translate(48,y-2);ctx.scale(.72,.72);worldIcon(levels[i],0,0);ctx.restore();text(levels[i]==='q1-1'?'QUEST II 1-1':'WORLD '+levels[i],92,y-1);text(names[i],92,y+12,{cw:1,ch:.9,advance:7});
      if(i===selected&&actors[4])ctx.drawImage(actors[4],32,y+4,8,8);
      ctx.restore();
    }
    ctx.save();if(page===0)ctx.globalAlpha=.35;text('PREVIOUS',wide?92:72,wide?220:355,{align:'center',advance:7,cw:1.05});ctx.restore();
    ctx.save();if(last===levels.length)ctx.globalAlpha=.35;text('NEXT',wide?388:184,wide?220:355,{align:'center',advance:7,cw:1.05});ctx.restore();
    text('BACK',wide?240:128,wide?220:386,{align:'center'});
  }
  function interstitial({name='MARIO',score=0,coins=0,level='1-1',lives=3,actor=0}={}){
    fillBackground(9);hud({name,score,coins,level});text(level==='q1-1'?'QUEST II 1-1':'WORLD '+level,128,81,{align:'center'});
    if(actors[actor])ctx.drawImage(actors[actor],91,108,16,20);text('X  '+lives,119,116);text(name,128,151,{align:'center'});
  }
  function simpleMenu({heading,lines=[],options=[],selected=0}={}){
    fillBackground(9);text(heading,128,48,{align:'center'});
    lines.forEach((line,i)=>text(line,128,74+i*15,{align:'center',advance:7,cw:1.05}));
    options.forEach((option,i)=>{const y=126+i*23;text(option.label,128,y,{align:'center'});if(i===selected&&actors[4])ctx.drawImage(actors[4],27,y,8,8);});
  }
  return {text,title,selector,interstitial,simpleMenu,hud,fillBackground};
}
