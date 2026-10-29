import { GameSession } from './session.js';
import { buildSprites } from './sprites.js';
import { createWorld13Art } from './world13-art.js';
import { createWorld14Art } from './world14-art.js';
import { createWorld21Art } from './world21-art.js';
import { createWorld23Art } from './world23-art.js';
import { createWorld2431Art } from './world2431-art.js';
import { createWorld3233Art } from './world3233-art.js';
import { createWorld3441Art } from './world3441-art.js';
import { createWorld4252Art } from './world4252-art.js';
import { createWorld5363Art } from './world5363-art.js';
import { createWorld6484Art } from './world6484-art.js';
import { createMenuArt } from './menu-art.js';

const canvas=document.querySelector('#canvas'),ctx=canvas.getContext('2d',{alpha:false});
const $=s=>document.querySelector(s),TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=n=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),scale=48,ox=0,oy=0,vw=20,menuScale=3,menuX=0,menuY=0,menuWidth=256,menuHeight=240,selectorColumns=1;
let pendingJump=false,pendingJumpOff=false,pendingFire=false;
const WORLD_LEVELS=['1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2','3-3','3-4','4-1','4-2','4-3','4-4','5-1','5-2','5-3','5-4','6-1','6-2','6-3','6-4','7-1','7-2','7-3','7-4','8-1','8-2','8-3','8-4','q1-1'];
const SELECT_PAGE_SIZE=9;
const WORLD_SHORTCUTS=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','BracketLeft','BracketRight','Backslash','KeyQ','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote','KeyC','KeyV','KeyB'];
const worldLabel=level=>level==='q1-1'?'1-1':level;
const stageLabel=level=>level==='q1-1'?'Second Quest 1-1':'World '+level;
let ready=false,paused=false,muted=false,clock=0,last=0,accumulator=0,shake=0;
let kick=0,kickV=0,lastArea='overworld',musicClock=0,musicIndex=0;
const coarse=()=>matchMedia('(pointer:coarse)').matches||W<750;
const keys=new Set(),touch=new Set(),ropes=[],floaters=[];
const assets={},mats=[],actors=[];
const session=new GameSession({onEvent:onGameEvent});
let game=session.game,menuIndex=0;
const world21Art=createWorld21Art({ctx,material,strand,coil,photoShape,drawSprite,getTime:()=>clock});
const world23Art=createWorld23Art({ctx,material,strand,coil,photoShape,drawSprite,drawCloud:world21Art.drawCloud,getTime:()=>clock});
const world2431Art=createWorld2431Art({ctx,material,strand,coil,photoShape,drawSprite,drawCloud:world21Art.drawCloud,getTime:()=>clock});
const world3233Art=createWorld3233Art({ctx,material,strand,coil,photoShape,drawSprite,getTime:()=>game.clock});
const world3441Art=createWorld3441Art({ctx,material,strand,coil,photoShape,drawSprite,getTime:()=>game.clock});
const world4252Art=createWorld4252Art({ctx,material,strand,coil,photoShape,drawSprite,getTime:()=>game.clock});
const world5363Art=createWorld5363Art({ctx,materials:mats,material,strand,coil,photoShape,drawSprite,getTime:()=>game.clock});
const world6484Art=createWorld6484Art({ctx,materials:mats,actors,material,strand,coil,photoShape,drawSprite,getTime:()=>game.clock});
const world14Art=createWorld14Art({ctx,material,strand,coil,photoShape,drawSprite,getTime:()=>clock});
const world13Art=createWorld13Art({ctx,material,strand,coil,photoShape,getTime:()=>clock});
const menuArt=createMenuArt({ctx,materials:mats,actors,material,strand,coil,photoShape});
const isBelowGround=()=>['underground','underworld','bonus12','bonus21','bonus31','bonus41','underground42','bonus42','bonus51','bonus62a','bonus62b','bonus71','bonus81','bonus82'].includes(game.area);
const isCastle=()=>['castle','castle24','castle34','castle44','castle54','castle64','castle74','castle84'].includes(game.area);
const isInterior=()=>isBelowGround()||isCastle();
const isSky=()=>['sky21','sky31','sky42','sky52','sky62'].includes(game.area);
const isNight=()=>['overworld31','sky31','overworld32','treetops33','overworld61','overworld62','sky62','treetops63'].includes(game.area);
const isMonochrome=()=>game.area==='treetops63';
const usesPaleSolids=()=>['overworld31','sky31','overworld32','treetops33','overworld51','overworld52','overworld71'].includes(game.area);
const isNewNight=()=>['overworld32','treetops33'].includes(game.area);
const isUnderwater=()=>['underwater22','underwater52','underwater62','underwater72','underwater84'].includes(game.area);
const isBridge=()=>['bridges23','bridges73'].includes(game.area);
const isDaylight=()=>['overworld21','intro22','exit22','bridges23','sky21','overworld41','intro42','exit42','sky42','mushrooms43','overworld51','overworld52','sky52','treetops53','overworld71','intro72','exit72','bridges73','overworld81','overworld82','overworld83'].includes(game.area);
const WORLD21_SCENERY={"clouds":[{"x":18,"y":3,"w":3,"h":2},{"x":27,"y":2,"w":3,"h":2},{"x":30,"y":3,"w":4,"h":2},{"x":45,"y":2,"w":3,"h":2},{"x":48,"y":3,"w":4,"h":2},{"x":66,"y":3,"w":3,"h":2},{"x":75,"y":2,"w":3,"h":2},{"x":78,"y":3,"w":4,"h":2},{"x":93,"y":2,"w":3,"h":2},{"x":96,"y":3,"w":4,"h":2},{"x":114,"y":3,"w":3,"h":2},{"x":123,"y":2,"w":3,"h":2},{"x":126,"y":3,"w":4,"h":2},{"x":141,"y":2,"w":3,"h":2},{"x":144,"y":3,"w":4,"h":2},{"x":162,"y":3,"w":3,"h":2},{"x":171,"y":2,"w":3,"h":2},{"x":174,"y":3,"w":4,"h":2},{"x":189,"y":2,"w":3,"h":2,"visibleTiles":[{"x":189,"y":2,"id":128},{"x":190,"y":2,"id":129},{"x":191,"y":2,"id":130},{"x":189,"y":3,"id":131}],"occludedByTerrain":true},{"x":192,"y":3,"w":4,"h":2},{"x":210,"y":3,"w":3,"h":2},{"x":219,"y":2,"w":3,"h":2},{"x":222,"y":3,"w":3,"h":2,"naturalW":4,"clipRight":225}],"fences":[{"x":14,"y":12,"w":4,"h":1},{"x":38,"y":12,"w":2,"h":1},{"x":41,"y":12,"w":1,"h":1},{"x":62,"y":12,"w":4,"h":1},{"x":86,"y":12,"w":2,"h":1},{"x":89,"y":12,"w":1,"h":1},{"x":110,"y":12,"w":4,"h":1},{"x":134,"y":12,"w":2,"h":1},{"x":137,"y":12,"w":1,"h":1},{"x":158,"y":12,"w":4,"h":1},{"x":182,"y":12,"w":2,"h":1},{"x":185,"y":12,"w":1,"h":1},{"x":209,"y":12,"w":1,"h":1}],"trees":[{"x":11,"y":11,"w":1,"h":2,"type":"short"},{"x":13,"y":10,"w":1,"h":3,"type":"tall"},{"x":21,"y":10,"w":1,"h":3,"type":"tall","visibleTiles":[{"x":21,"y":10,"id":13}],"occludedByTerrain":true},{"x":40,"y":11,"w":1,"h":2,"type":"short"},{"x":43,"y":10,"w":1,"h":3,"type":"tall"},{"x":59,"y":11,"w":1,"h":2,"type":"short"},{"x":61,"y":10,"w":1,"h":3,"type":"tall"},{"x":69,"y":10,"w":1,"h":3,"type":"tall"},{"x":71,"y":11,"w":1,"h":2,"type":"short"},{"x":72,"y":11,"w":1,"h":2,"type":"short"},{"x":88,"y":11,"w":1,"h":2,"type":"short"},{"x":91,"y":10,"w":1,"h":3,"type":"tall"},{"x":109,"y":10,"w":1,"h":3,"type":"tall"},{"x":117,"y":10,"w":1,"h":3,"type":"tall"},{"x":119,"y":11,"w":1,"h":2,"type":"short"},{"x":120,"y":11,"w":1,"h":2,"type":"short"},{"x":136,"y":11,"w":1,"h":2,"type":"short"},{"x":155,"y":11,"w":1,"h":2,"type":"short"},{"x":157,"y":10,"w":1,"h":3,"type":"tall"},{"x":165,"y":10,"w":1,"h":3,"type":"tall"},{"x":167,"y":11,"w":1,"h":2,"type":"short"},{"x":168,"y":11,"w":1,"h":2,"type":"short"},{"x":184,"y":11,"w":1,"h":2,"type":"short"},{"x":187,"y":10,"w":1,"h":3,"type":"tall"},{"x":203,"y":11,"w":1,"h":2,"type":"short"},{"x":213,"y":10,"w":1,"h":3,"type":"tall"},{"x":215,"y":11,"w":1,"h":2,"type":"short"},{"x":216,"y":11,"w":1,"h":2,"type":"short"}]};
const input=()=>({left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left'),right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right'),up:keys.has('ArrowUp')||keys.has('KeyW')||touch.has('up'),jump:pendingJump||keys.has('Space')||keys.has('KeyZ')||keys.has('ArrowUp')||keys.has('KeyW')||touch.has('jump')||touch.has('up'),jumpOff:pendingJumpOff||keys.has('Space')||keys.has('KeyZ')||touch.has('jump'),run:keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('KeyX')||touch.has('run'),fire:pendingFire||keys.has('KeyX')||touch.has('run'),down:keys.has('ArrowDown')||keys.has('KeyS')||touch.has('down')});

// Each visible contour is shaded as a round, moist strand of spaghetti.
function path(points){ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];if(i===0)ctx.moveTo(p[0],p[1]);else if(i<points.length-1){const n=points[i+1];ctx.quadraticCurveTo(p[0],p[1],(p[0]+n[0])/2,(p[1]+n[1])/2)}else ctx.lineTo(p[0],p[1])}}
const palettes={magenta:['#531335','#9a225f','#d55094','#ffc1e1'],pink:['#84525c','#c98e96','#f1c2c7','#fff0eb'],cyan:['#064f56','#128a9a','#46d2d4','#d1ffff'],coral:['#824a3c','#c77f69','#eab29a','#fff0d5'],stone:['#242329','#62615f','#bcb7a6','#eee6d0'],ember:['#631808','#cb4513','#ff9d32','#fff1aa'],ice:['#102c41','#346c88','#70abc2','#cbeaf2'],gold:['#59421b','#b18a3f','#e4bf68','#ffeba9'],pale:['#675536','#c7ae76','#f0dda3','#fff8d7'],green:['#112b0c','#36571c','#688b36','#b3c576'],red:['#411810','#a84325','#d36839','#f9b774'],blue:['#152d35','#315969','#588091','#9bbdc4'],dark:['#171b14','#343b25','#69704d','#afb18a']};
function strand(points,width=.06,palette='gold',alpha=1){if(points.length<2)return;const c=palettes[palette]||palettes.gold;ctx.save();ctx.globalAlpha*=alpha;ctx.lineJoin='round';ctx.lineCap='round';path(points);ctx.strokeStyle=c[0];ctx.lineWidth=width*1.3;ctx.stroke();ctx.strokeStyle=c[1];ctx.lineWidth=width;ctx.stroke();ctx.translate(-width*.1,-width*.13);path(points);ctx.strokeStyle=c[2];ctx.lineWidth=width*.66;ctx.stroke();ctx.translate(-width*.08,-width*.1);path(points);ctx.strokeStyle=c[3];ctx.lineWidth=width*.18;ctx.stroke();ctx.restore()}
function coil(x,y,rx,ry,palette='gold',width=.07,turns=1){const p=[];for(let i=0;i<=34*turns;i++){const a=i/(34*turns)*TAU*turns;const z=1-i/(34*turns)*.12;p.push([x+Math.cos(a)*rx*z,y+Math.sin(a)*ry*z])}strand(p,width,palette)}

// Single-line alphabet: the letters themselves are curved pasta strands.
const glyphs={
 A:[[[0,1],[.5,0],[1,1]],[[.22,.58],[.78,.58]]],B:[[[0,1],[0,0],[.65,0],[1,.18],[.65,.48],[0,.48]],[[.5,.48],[1,.67],[.85,1],[0,1]]],C:[[[1,.12],[.7,0],[.15,.08],[0,.5],[.15,.92],[.7,1],[1,.88]]],D:[[[0,1],[0,0],[.55,0],[1,.25],[1,.75],[.55,1],[0,1]]],E:[[[1,0],[0,0],[0,1],[1,1]],[[0,.48],[.8,.48]]],F:[[[1,0],[0,0],[0,1]],[[0,.48],[.8,.48]]],G:[[[1,.12],[.65,0],[.1,.1],[0,.5],[.1,.9],[.65,1],[1,.85],[1,.55],[.6,.55]]],H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]],I:[[[.5,0],[.5,1]],[[.12,0],[.88,0]],[[.12,1],[.88,1]]],J:[[[1,0],[1,.8],[.7,1],[.2,1],[0,.75]]],K:[[[0,0],[0,1]],[[1,0],[0,.55],[1,1]]],L:[[[0,0],[0,1],[1,1]]],M:[[[0,1],[0,0],[.5,.55],[1,0],[1,1]]],N:[[[0,1],[0,0],[1,1],[1,0]]],O:[[[.5,0],[.08,.08],[0,.5],[.08,.92],[.5,1],[.92,.92],[1,.5],[.92,.08],[.5,0]]],P:[[[0,1],[0,0],[.7,0],[1,.2],[.9,.48],[0,.5]]],Q:[[[.5,0],[.08,.08],[0,.5],[.08,.92],[.5,1],[.92,.92],[1,.5],[.92,.08],[.5,0]],[[.6,.72],[1.05,1.1]]],R:[[[0,1],[0,0],[.7,0],[1,.2],[.9,.48],[0,.5]],[[.45,.5],[1,1]]],S:[[[1,.12],[.65,0],[.15,.05],[0,.3],[.3,.47],[.8,.55],[1,.75],[.85,.95],[.3,1],[0,.88]]],T:[[[0,0],[1,0]],[[.5,0],[.5,1]]],U:[[[0,0],[0,.75],[.2,1],[.8,1],[1,.75],[1,0]]],V:[[[0,0],[.5,1],[1,0]]],W:[[[0,0],[.22,1],[.5,.5],[.78,1],[1,0]]],X:[[[0,0],[1,1]],[[1,0],[0,1]]],Y:[[[0,0],[.5,.5],[1,0]],[[.5,.5],[.5,1]]],Z:[[[0,0],[1,0],[0,1],[1,1]]],
 '0':[[[.5,0],[.1,.06],[0,.5],[.1,.94],[.5,1],[.9,.94],[1,.5],[.9,.06],[.5,0]]],'1':[[[.2,.2],[.6,0],[.6,1]],[[.2,1],[1,1]]],'2':[[[0,.2],[.2,0],[.8,0],[1,.22],[.8,.45],[0,1],[1,1]]],'3':[[[0,.05],[.7,0],[1,.2],[.55,.48],[1,.7],[.8,.98],[0,1]]],'4':[[[.75,1],[.75,0],[0,.65],[1,.65]]],'5':[[[1,0],[0,0],[0,.48],[.7,.48],[1,.65],[.9,.95],[0,1]]],'6':[[[.9,.05],[.4,0],[.05,.35],[0,.75],[.2,1],[.8,1],[1,.7],[.8,.48],[0,.5]]],'7':[[[0,0],[1,0],[.35,1]]],'8':[[[.5,0],[.1,0],[0,.25],[.5,.5],[1,.75],[.85,1],[.15,1],[0,.75],[.5,.5],[1,.25],[.9,0],[.5,0]]],'9':[[[1,.5],[.2,.5],[0,.25],[.2,0],[.8,0],[1,.25],[.95,.7],[.65,1],[.1,1]]],'?':[[[0,.2],[.2,0],[.75,0],[1,.25],[.7,.5],[.5,.6],[.5,.7]],[[.5,.98],[.5,1]]],'-':[[[.15,.5],[.85,.5]]],':':[[[.5,.25],[.5,.27]],[[.5,.75],[.5,.77]]],'/':[[[0,1],[1,0]]],'+':[[[.1,.5],[.9,.5]],[[.5,.1],[.5,.9]]],'.':[[[.5,.98],[.5,1]]],'!':[[[.5,0],[.5,.7]],[[.5,.98],[.5,1]]]
};
function textWidth(t,h){return Math.max(0,t.length*.78-.2)*h}
function pastaText(t,x,y,h=.35,{align='left',palette='pale',alpha=1,weight=.105}={}){t=String(t).toUpperCase();if(align==='center')x-=textWidth(t,h)/2;if(align==='right')x-=textWidth(t,h);for(let k=0;k<t.length;k++){const ps=glyphs[t[k]];if(!ps)continue;for(const p of ps)strand(p.map(([a,b])=>[x+k*h*.78+a*h*.58,y+b*h]),h*weight,palette,alpha)}}

function material(index,x,y,w,h,alpha=1){ctx.save();ctx.globalAlpha*=alpha;if(mats[index])ctx.drawImage(mats[index],x,y,w,h);else{ctx.fillStyle=['#d1ad61','#9a7137','#e7ce8d','#4e6c2a','#577985','#e9dfbc'][index]||'#d1ad61';ctx.fillRect(x,y,w,h);for(let k=0;k<18;k++){const yy=y+(k+.5)/18*h;strand([[x,yy],[x+w*.3,yy+.03],[x+w*.7,yy-.03],[x+w,yy]],h*.035,index===3?'green':index===4?'blue':'gold')}}ctx.restore()}
function mirroredMaterial(index,x,y,w,h,flipX=false,flipY=false,alpha=1){ctx.save();ctx.translate(x+(flipX?w:0),y+(flipY?h:0));ctx.scale(flipX?-1:1,flipY?-1:1);material(index,0,0,w,h,alpha);ctx.restore()}
function photoShape(index,build,x,y,w,h,alpha=1){ctx.save();build();ctx.clip();material(index,x,y,w,h,alpha);ctx.restore()}
function castleWarmth(x,y){
 if(!isCastle())return 0;let heat=0;
 for(const l of game.lava||[]){const dx=Math.max(l.x-x,0,x-l.x-l.w),dy=Math.abs(y-l.y);heat=Math.max(heat,Math.max(0,1-dx/3.5-dy/5)*.38)}
 for(const bar of game.firebars||[])for(const b of bar.balls||[]){const d=(b.x-x)**2+(b.y-y)**2;if(d<10)heat=Math.max(heat,(1-d/10)*.23)}
 for(const p of game.podoboos||[])if(p.active&&!p.hidden){const d=(p.x+.5-x)**2+(p.y+1-y)**2;if(d<12)heat=Math.max(heat,(1-d/12)*.32)}
 return heat*(.92+Math.sin(clock*3.1+x*.7)*.08);
}
function tile(b){
 if(b.removed||(b.type==='hidden'&&!b.used))return;
 if(isUnderwater()&&b.submerged){if(!world6484Art.drawUnderwaterTile(b,{area:game.area}))world23Art.drawUnderwaterTile(b);return;}
 const x=b.x,y=b.y+(b.bump||0),below=isBelowGround(),castle=isCastle(),nightSolid=usesPaleSolids()&&b.type==='solid',t=castle?(b.type==='question'&&!b.used?2:['castle24','castle54'].includes(game.area)?26:13):below?(b.used||b.type==='brick'?10:b.type==='question'?12:11):isMonochrome()&&!(b.type==='question'&&!b.used)?24:nightSolid?27:(b.used||b.type==='brick'?1:2);
 ctx.save();ctx.beginPath();ctx.roundRect(x+.015,y+.02,.97,.97,.065);ctx.clip();material(t,x,y,1,1);
 const shade=ctx.createLinearGradient(x,y,x+1,y+1);shade.addColorStop(0,below?'#c1eafa25':'#fff3c621');shade.addColorStop(.5,'#00000000');shade.addColorStop(1,castle?'#08080a8c':below?'#00122170':isMonochrome()?'#10202b58':'#35230c58');ctx.fillStyle=shade;ctx.fillRect(x,y,1,1);
 if(castle){const heat=castleWarmth(x+.5,y+.5);if(heat>0){const reflected=ctx.createLinearGradient(0,y,0,y+1);reflected.addColorStop(0,'rgba(255,90,18,0)');reflected.addColorStop(1,'rgba(255,109,25,'+heat+')');ctx.globalCompositeOperation='screen';ctx.fillStyle=reflected;ctx.fillRect(x,y,1,1)}}ctx.restore();
 strand([[x+.07,y+.92],[x+.04,y+.48],[x+.07,y+.07],[x+.5,y+.04],[x+.94,y+.07],[x+.96,y+.5],[x+.93,y+.94],[x+.5,y+.96],[x+.07,y+.92]],.06,castle||nightSolid||isMonochrome()?'stone':below?'ice':t===1?'gold':'pale');
 if((b.type==='brick'||castle&&b.type!=='question')&&!b.used){strand([[x+.04,y+.5],[x+.95,y+.5]],.025,'dark',.65);strand([[x+.5,y+.06],[x+.5,y+.49]],.025,'dark',.65);strand([[x+.27,y+.51],[x+.27,y+.93]],.025,'dark',.65);strand([[x+.75,y+.51],[x+.75,y+.93]],.025,'dark',.65)}
 if(b.type==='question'&&!b.used)pastaText('?',x+.5,y+.21,.53,{align:'center',palette:below?'pale':'gold',weight:.15});
 if(b.used)for(let k=0;k<3;k++)strand([[x+.16,y+.25+k*.24],[x+.55,y+.24+k*.24],[x+.82,y+.29+k*.24]],.035,below?'ice':isMonochrome()?'stone':'gold',.8);
}
function pipe(p){if(p.horizontal){ctx.save();ctx.translate(p.x,p.y+p.h);ctx.rotate(-Math.PI/2);pipe({x:0,y:0,w:p.h,h:p.w});ctx.restore();return}const x=p.x,y=p.y,w=p.w||2,h=p.h,magenta=game.area==='underwater84'&&x===3,night=['overworld31','overworld32','overworld51','overworld52','overworld71','castle84'].includes(game.area),pipeMat=magenta?6:night?27:3,pipePalette=magenta?'magenta':night?'stone':'green';ctx.save();ctx.beginPath();ctx.roundRect(x+.08,y+.2,w-.16,h-.19,.1);ctx.clip();if(magenta)ctx.filter='hue-rotate(305deg) saturate(1.25)';material(pipeMat,x,y,w,h);if(magenta)ctx.filter='none';const gr=ctx.createLinearGradient(x,y,x+w,y);gr.addColorStop(0,magenta?'#41102c66':night?'#0a172d70':'#0f240952');gr.addColorStop(.35,magenta?'#ffc1e144':night?'#d9edff44':'#d8e99826');gr.addColorStop(.68,'#00000000');gr.addColorStop(1,magenta?'#2c0a269c':night?'#06142a9c':'#0b1e0a87');ctx.fillStyle=gr;ctx.fillRect(x,y,w,h);ctx.restore();for(let k=0;k<8;k++){const px=x+.16+k*(w-.32)/7;strand([[px,y+.28],[px+Math.sin(k)*.035,y+h*.5],[px,y+h-.04]],.055,magenta?'magenta':night?'stone':k<6?'green':'dark',.6)}ctx.save();if(magenta)ctx.filter='hue-rotate(305deg) saturate(1.25)';photoShape(pipeMat,()=>{ctx.beginPath();ctx.ellipse(x+w/2,y+.18,w*.53,.19,0,0,TAU)},x-.06,y-.02,w+.12,.4);ctx.restore();ctx.save();ctx.globalAlpha=.55;ctx.fillStyle=magenta?'#25091f':night?'#091421':'#0b200c';ctx.beginPath();ctx.ellipse(x+w/2,y+.12,w*.43,.075,0,0,TAU);ctx.fill();ctx.restore();for(let k=0;k<3;k++)strand([[x-.04,y+.08+k*.1],[x+.25,y+.1+k*.1],[x+w-.25,y+.1+k*.1],[x+w+.04,y+.08+k*.1]],.105,pipePalette);strand([[x+.02,y+.4],[x+w/2,y+.43],[x+w-.02,y+.4]],.08,pipePalette)}
function ground(f){
 const left=Math.max(f.x,Math.floor(game.camera)-1),right=Math.min(f.x+f.w,Math.ceil(game.camera+vw)+1),below=isBelowGround(),h=f.h||2;
 if(right<=left)return;
 if(isUnderwater()){if(!world6484Art.drawSeabed({...f,x:left,w:right-left},{area:game.area,camera:game.camera,viewWidth:vw}))world23Art.drawSeabed({...f,x:left,w:right-left});return;}
 if(isCastle()){for(let x=left;x<right;x++)for(let y=f.y;y<f.y+h;y++)tile({x,y,type:'castle'});return;}
 for(let x=left;x<right;x++){mirroredMaterial(below?11:isMonochrome()?24:(isNight()||['intro42','exit42','mushrooms43','overworld51','overworld52','treetops53','overworld71','intro72','exit72','bridges73','overworld81','overworld82','overworld83'].includes(game.area))?1:0,x,f.y,Math.min(1,right-x),h,Math.floor(x)%2!==0,false);const grad=ctx.createLinearGradient(0,f.y,0,f.y+h);grad.addColorStop(0,'#00000000');grad.addColorStop(.25,below?'#0a172b25':isMonochrome()?'#101b2925':'#301a0925');grad.addColorStop(1,below?'#050e1999':isMonochrome()?'#09152199':'#1f190a99');ctx.fillStyle=grad;ctx.fillRect(x,f.y,Math.min(1,right-x),h)}
 for(let row=0;row<3;row++){const pts=[];for(let x=left;x<=right;x+=.18)pts.push([x,f.y+.025+row*.075+Math.sin(x*9+row)*.025]);strand(pts,.08,below?'ice':isMonochrome()?'stone':row===0?'pale':'gold')}
 if(left===f.x)for(let k=0;k<7;k++)strand([[left+.08+k*.08,f.y+.1],[left-.03+k*.08,f.y+.45],[left+.03+k*.06,f.y+1.15]],.065,below?'ice':isMonochrome()?'stone':'gold');
 if(right===f.x+f.w)for(let k=0;k<7;k++)strand([[right-.08-k*.08,f.y+.1],[right+.03-k*.08,f.y+.55],[right-.03-k*.05,f.y+1.2]],.065,below?'ice':isMonochrome()?'stone':'gold');
}
function movingPlatform(p){
 const x=p.x,y=p.y,w=p.w,h=p.h||.32;
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,.13);ctx.clip();material(0,x,y,w,h);ctx.restore();
 for(let k=0;k<4;k++){const pts=[];for(let j=0;j<=24;j++)pts.push([x+.04+(w-.08)*j/24,y+.05+k*.07+Math.sin(j*.9+k*Math.PI/2)*.025]);strand(pts,.065,k===0?'pale':'gold')}
 coil(x+.08,y+h/2,.07,h*.4,'pale',.045);coil(x+w-.08,y+h/2,.07,h*.4,'pale',.045);
}
function cloud(x,y,w){const h=.95;photoShape(5,()=>{ctx.beginPath();ctx.moveTo(x,y+h);ctx.bezierCurveTo(x-.35,y+.35,x+.4,y+.15,x+.8,y+.35);ctx.bezierCurveTo(x+.6,y-.25,x+1.4,y-.35,x+1.6,y+.15);ctx.bezierCurveTo(x+w*.65,y-.2,x+w-.15,y-.1,x+w-.3,y+.4);ctx.bezierCurveTo(x+w+.45,y+.2,x+w+.3,y+1.1,x+w-.1,y+h);ctx.closePath()},x-.3,y-.3,w+.6,h+.6,.95);for(let k=0;k<6;k++){const pts=[];for(let j=0;j<12;j++)pts.push([x-.03+j*w/11,y+.4+k*.09+Math.sin(j*1.2+k)*.07]);strand(pts,.065,'pale',.65)}}
function hill(x,width,height){photoShape(3,()=>{ctx.beginPath();ctx.moveTo(x,13);ctx.bezierCurveTo(x+width*.1,13-height*.4,x+width*.3,13-height,x+width/2,13-height);ctx.bezierCurveTo(x+width*.7,13-height,x+width*.9,13-height*.4,x+width,13);ctx.closePath()},x,13-height,width,height,.68);for(let k=0;k<9;k++){const f=k/8;const yy=13-height*Math.sin(f*Math.PI);strand([[x+width*f,13],[x+width*f*.9+width*.05,(13+yy)/2],[x+width*f,yy+.09]],.045,'green',.45)}}
function bush(x,w){photoShape(3,()=>{ctx.beginPath();ctx.moveTo(x,13);for(let i=0;i<w;i++){ctx.quadraticCurveTo(x+i+.05,12,x+i+.5,12.35);ctx.quadraticCurveTo(x+i+.9,11.95,x+i+1,12.8)}ctx.lineTo(x+w,13);ctx.closePath()},x,12,w,1,.9);for(let i=0;i<w*4;i++)coil(x+i*.25,12.7,.2,.24,'green',.045)}
function scenery(){if(world6484Art.drawScenery({area:game.area,level:game.level,camera:game.camera,viewWidth:vw}))return;if(world5363Art.drawScenery({area:game.area,level:game.level,camera:game.camera,viewWidth:vw}))return;if(world4252Art.drawScenery({area:game.area,level:game.level,camera:game.camera,viewWidth:vw}))return;if(isInterior()||isSky()||isUnderwater())return;if(game.area==='overworld41'){world3441Art.drawDayScenery({camera:game.camera,viewWidth:vw});return;}if(isNight()){if(isNewNight())world3233Art.drawNightScenery({level:game.level,camera:game.camera,viewWidth:vw});else world2431Art.drawNightScenery({camera:game.camera,viewWidth:vw});return;}if(isBridge()){world23Art.drawBridgeScenery({camera:game.camera,viewWidth:vw});return;}if(game.area==='exit22'){world23Art.drawExitScenery({camera:game.camera,viewWidth:vw});return;}if(game.area==='overworld21'){for(const c of WORLD21_SCENERY.clouds)if(c.x+c.w>game.camera-1&&c.x<game.camera+vw+1){ctx.save();if(c.clipRight!==undefined){ctx.beginPath();ctx.rect(c.x-.2,c.y-.3,c.clipRight-c.x+.2,c.h+.6);ctx.clip()}world21Art.drawCloud({...c,w:c.naturalW??c.w});ctx.restore()}for(const f of WORLD21_SCENERY.fences)if(f.x+f.w>game.camera-1&&f.x<game.camera+vw+1)world21Art.drawFence(f);for(const t of WORLD21_SCENERY.trees)if(t.x+t.w>game.camera-1&&t.x<game.camera+vw+1)world21Art.drawSceneryTree(t);return;}if(['intro12','intro22','intro42','intro72'].includes(game.area)){cloud(3,3,4);cloud(9,7,3);cloud(18,2,4);return;}for(let rep=-1;rep<6;rep++){const base=48*rep;if(base+48<game.camera||base>game.camera+vw)continue;if(game.area==='treetops'){for(const[x,y,w]of[[3,3,4],[9,7,3],[18,2,4],[35,7,3],[38,6,3],[46,11,3]])cloud(base+x,y,w);continue;}if(game.area!=='treetops'){hill(base,5,3);hill(base+16,3,2);bush(base+11,5);bush(base+23,3);bush(base+41,4)}cloud(base+8,3,3);cloud(base+19,2,3);cloud(base+27,3,5);cloud(base+36,2,4)}}

function drawSprite(id,x,y,w,h,{flip=false,flipY=false,squash=0,wiggle=0,alpha=1}={}){const im=actors[id];if(!im){for(let k=0;k<12;k++){const yy=y+h*.1+k*h*.065;strand([[x+w*.15,yy],[x+w*.4,yy-.05],[x+w*.75,yy+.03]],h*.08,id===0?'red':id===2?'green':'gold')}return}ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x+w/2,y+h);if(flip)ctx.scale(-1,1);if(flipY){ctx.translate(0,-h);ctx.scale(1,-1)}ctx.scale(1+squash,1-squash);const slices=12;for(let i=0;i<slices;i++){const sy=i*im.height/slices,hh=im.height/slices+.9,dy=-h+i*h/slices;const sway=Math.sin(i*.68+clock*9)*wiggle*(1-i/slices);ctx.drawImage(im,0,sy,im.width,Math.min(hh,im.height-sy),-w/2+sway,dy,w,h/slices+.012)}ctx.restore()}
function player(){const p=game.player;if(!p||p.hidden)return;if(p.invincible>0&&Math.floor(clock*17)%2===0&&game.state!=='dead')ctx.globalAlpha=.55;const squ=clamp(kick*.16,-.18,.18);const bounce=p.grounded?Math.abs(Math.sin((p.walk||0)*1.7))*.032:0;ctx.save();if(p.star>0){ctx.shadowColor=['#ffd970','#95eeb3','#b0e8ff'][Math.floor(clock*7)%3];ctx.shadowBlur=12}if(p.swimming)world23Art.drawSwimmingPlayer(p,session.actorIndex,{squash:squ,wiggle:.025+Math.abs(p.vx||0)*.003});else drawSprite(session.actorIndex,p.x-.15,p.y-.09-bounce,p.w+.3,p.h+.15,{flip:p.facing<0,squash:squ,wiggle:.025+Math.abs(p.vx||0)*.003});if(p.fire){for(let k=0;k<4;k++)strand([[p.x+.1,p.y+.4+k*.09],[p.x+p.w*.5,p.y+.37+k*.09],[p.x+p.w-.05,p.y+.42+k*.09]],.045,'pale',.75)}ctx.restore();ctx.globalAlpha=1}
function enemy(e){if(e.removed||e.invisibleSourcePlant||(e.hidden&&!e.dead)||e.dead&&e.deathTimer<=0)return;if(world6484Art.drawEnemy(e,{area:game.area}))return;if(world5363Art.drawEnemy(e,{area:game.area}))return;if(world4252Art.drawEnemy(e,{area:game.area}))return;if(world3441Art.drawLakitu(e)||world3441Art.drawSpiny(e))return;if(world23Art.drawAquaticEnemy(e))return;if(e.kind==='hammerbro'||e.type==='hammerbro'){world2431Art.drawHammerBro(e);return;}if(e.type==='piranha'||e.kind==='piranha'){ctx.save();if(!e.dead){ctx.beginPath();ctx.rect(e.x-.3,e.y-.2,e.w+.6,Math.max(0,(e.pipeY??e.y+e.h)-e.y+.22));ctx.clip()}drawSprite(8,e.x-.08,e.y-.03,e.w+.16,e.h+.08,{wiggle:.025,flipY:!!e.flipped});ctx.restore();return;}if(e.winged&&!e.dead)world13Art.drawWings(e);const stomp=e.flat;const shell=e.type==='shell'||e.shell,red=e.red||e.color==='red';ctx.save();if(shell){photoShape(red?6:3,()=>{ctx.beginPath();ctx.ellipse(e.x+e.w/2,e.y+e.h*.53,e.w*.55,e.h*.48,0,0,TAU)},e.x-.05,e.y,e.w+.1,e.h);for(let k=0;k<4;k++)coil(e.x+e.w/2,e.y+e.h*.54,e.w*(.49-k*.09),e.h*(.44-k*.08),red?'red':'green',.05);ctx.restore();return}drawSprite(e.type==='koopa'?(red?9:2):1,e.x-.12,stomp?e.y+e.h-.28:e.y-.08,e.w+.24,stomp?.28:e.h+.12,{squash:stomp?.2:Math.sin(clock*7+e.x)*.035,wiggle:.018,flip:e.vx>0,flipY:!!e.flipped,alpha:e.dead?.8:1});ctx.restore()}
function item(it){if(it.removed)return;const type=it.type||it.kind;const map={mushroom:4,flower:5,fireflower:5,star:6,'1up':4,coin:3,fireball:7};const id=map[type]??4;ctx.save();if(type==='1up')ctx.filter='hue-rotate(68deg)';if(type==='coin'){const width=.45+Math.abs(Math.sin(clock*5+it.x))*.25;drawSprite(3,it.x+(it.w-width)/2,it.y,width,it.h||.8)}else drawSprite(id,it.x-.05,it.y-.04,(it.w||.85)+.1,(it.h||.85)+.08,{wiggle:.025,squash:type==='star'?Math.sin(clock*9)*.08:0});ctx.restore()}
function castle(){
 if(isInterior()||isSky()||isUnderwater())return;
 const intro=['intro12','intro22','intro42','intro72'].includes(game.area),door=intro?2:(game.castleX??204),flagX=game.flagX??198;
 function smallCastle(d){
  const x=d-2;if(game.camera+vw<x-1||game.camera>x+6)return;
  if(['2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2','4-3','5-1','5-2','5-3','6-1','6-2','6-3','7-1','7-2','7-3','8-1','8-2','8-3'].includes(game.level)){
   const brick=(bx,by,crown=false)=>{ctx.save();if(crown){ctx.beginPath();ctx.moveTo(bx,by+1);ctx.lineTo(bx,by+.08);for(let i=0;i<3;i++){ctx.lineTo(bx+i/3+.16,by+.08);ctx.lineTo(bx+i/3+.16,by+.34);ctx.lineTo(bx+(i+1)/3,by+.34);ctx.lineTo(bx+(i+1)/3,by+.08)}ctx.lineTo(bx+1,by+1);ctx.closePath();ctx.clip()}tile({x:bx,y:by,type:'brick'});ctx.restore()};
   for(let yy=10;yy<13;yy++)for(let xx=0;xx<5;xx++){if(yy>10&&xx===2)continue;brick(x+xx,yy,yy===10&&(xx===0||xx===4))}
   for(let yy=8;yy<10;yy++)for(let xx=-1;xx<=1;xx++)brick(d+xx,yy,yy===8);
   for(let yy=0;yy<2;yy++)strand([[d-1,10.12+yy*.18],[d+.5,10.12+yy*.18],[d+2,10.12+yy*.18]],.055,isMonochrome()?'stone':'gold');
  }else{
   for(let yy=0;yy<4;yy++)for(let xx=0;xx<5;xx++){if(yy>1&&xx===2)continue;tile({x:x+xx,y:9+yy,type:'brick'})}
   for(const xx of[0,2,4])tile({x:x+xx,y:8,type:'solid'});
  }
  photoShape(9,()=>{ctx.beginPath();ctx.moveTo(d,13);ctx.lineTo(d,11);ctx.quadraticCurveTo(d+.5,10.3,d+1,11);ctx.lineTo(d+1,13);ctx.closePath()},d,10.5,1,2.5);
  strand([[d+.04,13],[d+.04,11.1],[d+.17,10.72],[d+.5,10.52],[d+.83,10.72],[d+.96,11.1],[d+.96,13]],.06,isMonochrome()?'stone':'gold');
 }
 if(['overworld21','overworld31','overworld41','overworld61','overworld71','overworld81'].includes(game.area)){world13Art.drawLargeCastle({doorX:2,wallRight:6,tile,cameraX:game.camera,viewWidth:vw});smallCastle(door)}else if(['treetops','treetops33','mushrooms43','treetops53','treetops63','overworld83'].includes(game.area)||isBridge()){smallCastle(2);world13Art.drawLargeCastle({doorX:['treetops33','mushrooms43','treetops53','treetops63','bridges73','overworld83'].includes(game.area)?door+2:door,wallRight:isBridge()||['treetops33','mushrooms43','treetops53','treetops63','bridges73','overworld83'].includes(game.area)?game.worldWidth-1:null,trimPalette:isMonochrome()?'stone':'gold',tile,cameraX:game.camera,viewWidth:vw})}else{if(['overworld32','overworld51','overworld52','overworld62','overworld82'].includes(game.area))smallCastle(2);smallCastle(door)}
 if(intro||game.camera+vw<flagX-2||game.camera>flagX+2)return;
 const pole=flagX+.4;
 for(let k=0;k<4;k++)strand([[pole+(k-1.5)*.045,12.05],[pole+(k-1.5)*.035,7],[pole+(k-1.5)*.045,2.1]],.052,isMonochrome()?'stone':'pale');
 coil(pole,2.05,.17,.17,isMonochrome()?'stone':'gold',.065,3);const fy=game.flagY??3;
 if(isMonochrome()){
  photoShape(22,()=>{ctx.beginPath();ctx.moveTo(pole-.08,fy);ctx.lineTo(pole-1.12,fy);ctx.lineTo(pole-.08,fy+1.04);ctx.closePath()},pole-1.15,fy,1.15,1.05);
  for(let k=0;k<7;k++){const yy=fy+.06+k*.14;strand([[pole-1.04+k*.14,yy],[pole-.5+k*.05,yy+.012],[pole-.1,yy]],.045,'pink');}
  const ex=pole-.39,ey=fy+.25;
  strand([[ex-.13,ey-.12],[ex+.12,ey-.12],[ex+.12,ey+.12],[ex-.13,ey+.12],[ex-.13,ey-.12]],.045,'cyan');
  strand([[ex-.06,ey-.02],[ex+.06,ey-.02]],.04,'cyan');
  strand([[ex,ey-.1],[ex,ey+.08]],.04,'cyan');
 }else{
  photoShape(5,()=>{ctx.beginPath();ctx.moveTo(pole-.08,fy);ctx.lineTo(pole-1.2,fy+.55);ctx.lineTo(pole-.08,fy+1.05);ctx.closePath()},pole-1.3,fy,1.3,1.1);
  for(let k=0;k<7;k++)strand([[pole-.1,fy+.08+k*.14],[pole-.45,fy+.2+k*.1],[pole-1.05+Math.abs(3-k)*.23,fy+.55]],.04,'pale');
 }
}

function warpSigns(){
 if(!game.warpVisible)return;
 if(game.area==='underworld'){
  if(game.camera+vw<175)return;
  pastaText('WELCOME TO WARP ZONE!',182.5,4.2,.34,{align:'center'});
  for(const [x,dest]of[[178,4],[182,3],[186,2]])pastaText(String(dest),x+1,8.4,.48,{align:'center',palette:'gold'});
 }else if(['underground42','sky42'].includes(game.area)){
  const cx=game.area==='sky42'?54:214;
  pastaText('WELCOME TO WARP ZONE!',cx,5,.34,{align:'center'});
  for(const p of game.pipes)if(p.warp&&p.x>game.camera-3&&p.x<game.camera+vw+2)pastaText(String(p.warp),p.x+(p.w??2)/2,p.y-.6,.48,{align:'center',palette:'gold'});
 }
}

// Nearby exposed surfaces are indexed once per simulation step. Loose strands
// now settle on bricks, treetops, lifts and bridge segments as well as floors.
let noodleContacts=new Map();
function refreshNoodleContacts(){
 noodleContacts=new Map();const visible=b=>!b.removed&&b.x+b.w>=game.camera-2&&b.x<=game.camera+vw+2;
 const blocks=game.blocks.filter(b=>!b.removed&&(b.type!=='hidden'||b.used)),cells=new Set(blocks.map(b=>b.x+','+b.y));
 const surfaces=[...game.floors,...game.pipes,...(game.treetops||[]),...(game.platforms||[]),...(game.bridge||[]),...(game.corals||[]),...(game.clouds||[]),...(game.springboards||[]),...blocks.filter(b=>!cells.has(b.x+','+(b.y-1)))].filter(visible);
 for(const b of surfaces)for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.w);x++){if(!noodleContacts.has(x))noodleContacts.set(x,[]);noodleContacts.get(x).push({x:b.x,y:b.y+(b.bump||0),w:b.w,dx:b.dx||0})}
}
class Noodle{
 constructor(x,y,len,segments=7,{palette='gold',pinned=false,vx=0,vy=0,angle=.5,width=.055,life=6}={}){this.palette=palette;this.pinned=pinned;this.len=len/segments;this.width=width;this.life=life;this.age=0;this.p=[];for(let i=0;i<=segments;i++){const xx=x+Math.cos(angle)*this.len*i,yy=y+Math.sin(angle)*this.len*i;this.p.push({x:xx,y:yy,px:xx-vx/60,py:yy-vy/60})}}
 step(dt,anchor){
  this.age+=dt;const wet=isUnderwater(),damp=Math.pow(wet?.94:.975,dt*60),gravity=(wet?3:22)*dt*dt;
  for(let i=0;i<this.p.length;i++){const p=this.p[i];if(i===0&&this.pinned&&anchor){p.x=anchor.x;p.y=anchor.y;p.px=p.x;p.py=p.y;continue}const vx=(p.x-p.px)*damp,vy=(p.y-p.py)*damp;p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+gravity;if(wet){const flow=(game.currents||[]).find(c=>p.x>=c.x&&p.x<c.x+c.w&&p.y>=c.y&&p.y<c.y+c.h);p.x+=(Math.sin(clock*.8+p.y*.65)*.6+(flow?(flow.center-p.x)*1.8:0))*dt*dt;p.y+=(flow?8:0)*dt*dt;}}
  for(let it=0;it<5;it++){
   for(let i=1;i<this.p.length;i++){const a=this.p[i-1],b=this.p[i],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||.001,d=(dist-this.len)/dist;if(i===1&&this.pinned){b.x-=dx*d;b.y-=dy*d}else{a.x+=dx*d*.5;a.y+=dy*d*.5;b.x-=dx*d*.5;b.y-=dy*d*.5}}
   if(this.pinned&&anchor){this.p[0].x=anchor.x;this.p[0].y=anchor.y}
  }
  for(let i=this.pinned?1:0;i<this.p.length;i++){
   const p=this.p[i];for(const f of noodleContacts.get(Math.floor(p.x))||[])if(p.x>=f.x&&p.x<=f.x+f.w&&p.y>f.y-.008&&p.py<f.y+.08){const vy=p.y-p.py;p.y=f.y-.012;p.py=p.y+Math.min(.04,Math.max(0,vy)*.08);p.px=p.x-(p.x-p.px)*.62;p.x+=f.dx*.6;break}
   if(!this.pinned&&isCastle())for(const l of game.lava||[])if(p.x>=l.x&&p.x<l.x+l.w&&p.y>=l.y){this.palette='ember';this.life=Math.min(this.life,this.age+.65);p.px=p.x-(p.x-p.px)*.6;p.py=p.y-(p.y-p.py)*.7}
  }
 }

 draw(){strand(this.p.map(p=>[p.x,p.y]),this.width,this.palette,this.pinned?1:clamp((this.life-this.age)*1.5,0,1))}
}
const heroNoodles=[],surfaceNoodles=new Map();
function resetRopes(){surfaceNoodles.clear();ropes.length=0;floaters.length=0;kick=0;kickV=0;heroNoodles.length=0;for(let k=0;k<12;k++){const side=k%2;heroNoodles.push({rope:new Noodle(game.player.x,game.player.y,.32+hash(k)*.46,6,{pinned:true,palette:session.actorIndex===10?(k<3?'green':'pale'):(k<3?'red':k<7?'blue':'pale'),width:.038}),side,u:.12+(k/12)*.7,v:k<3?.15:k<7?.7:.45})}}
function updateNoodles(dt){if(lastArea!==game.area){lastArea=game.area;resetRopes()}const p=game.player;refreshNoodleContacts();updateSurfaceNoodles(dt);for(const a of heroNoodles)a.rope.step(dt,{x:p.x+a.u*p.w,y:p.y+a.v*p.h});for(let i=ropes.length-1;i>=0;i--){ropes[i].step(dt);if(ropes[i].age>ropes[i].life)ropes.splice(i,1)}for(let i=floaters.length-1;i>=0;i--){floaters[i].age+=dt;floaters[i].y-=dt*.5;if(floaters[i].age>1.1)floaters.splice(i,1)}kickV+=(-kick*120-kickV*13)*dt;kick+=kickV*dt;shake*=Math.pow(.03,dt)}
function updateSurfaceNoodles(dt){
 const targets=[],below=isBelowGround(),solidCells=new Set(game.blocks.filter(b=>!b.removed&&b.type!=='hidden').map(b=>b.x+','+b.y));
 for(const b of game.blocks){
  if(b.removed||(b.type==='hidden'&&!b.used)||b.x<game.camera-1||b.x>game.camera+vw+1||solidCells.has(b.x+','+(b.y+1)))continue;
  if(b.type==='solid'&&hash(b.x+b.y*7)>.28)continue;
  for(let k=0;k<2;k++)targets.push({key:'b'+b.x+','+b.y+','+k,x:b.x+.2+k*.58,y:b.y+1+(b.bump||0)-.04,len:.17+hash(b.x*2+b.y+k)*.34,palette:game.area==='underwater84'?'green':isCastle()||isMonochrome()?'stone':below?'ice':b.type==='brick'?'gold':'pale'});
 }
 for(const p of game.pipes)if(!p.horizontal&&p.x>game.camera-3&&p.x<game.camera+vw+1)for(let k=0;k<3;k++)targets.push({key:'p'+p.x+','+k,x:p.x+.12+k*.87,y:p.y+.28,len:.45+hash(k+p.x)*.5,palette:game.area==='underwater84'&&p.x===3?'magenta':['overworld31','overworld32','overworld51','overworld52','overworld71','castle84'].includes(game.area)?'stone':'green'});
 for(const t of game.treetops||[])if(t.x+t.w>game.camera-1&&t.x<game.camera+vw+1)for(let k=0;k<t.w;k++)targets.push({key:'tree'+t.x+','+k,x:t.x+k+.5,y:t.y+.95,len:.3+hash(k+t.x)*.45,palette:isMonochrome()?'stone':t.mushroom?'gold':'green'});
 for(const [j,p] of (game.platforms||[]).entries())if(!p.hidden&&!p.removed&&p.x>game.camera-4&&p.x<game.camera+vw+1)for(let k=0;k<5;k++)targets.push({key:'lift'+(p.id??j)+','+k,x:p.x+.18+k*(p.w-.36)/4,y:p.y+(p.visualHeight??p.h??.3)-.05,len:.32+hash(k+j)*.6,palette:p.kind==='cloud'?'pale':'gold'});
 for(const c of game.clouds||[])if(c.x+c.w>game.camera-1&&c.x<game.camera+vw+1)for(let k=Math.max(0,Math.floor(game.camera-c.x));k<Math.min(c.w,Math.ceil(game.camera+vw-c.x));k+=2)targets.push({key:'sky'+c.x+','+k,x:c.x+k+.7,y:c.y+c.h-.1,len:.16+hash(k+c.x)*.28,palette:'pale'});
 if(isBridge()||game.area==='overworld31')for(const b of game.bridge||[])if(!b.removed&&b.x+b.w>game.camera-1&&b.x<game.camera+vw+1)for(let k=Math.max(0,Math.floor(game.camera-b.x));k<Math.min(b.w,Math.ceil(game.camera+vw-b.x));k+=2)targets.push({key:'span'+b.x+','+k,x:b.x+k+.65,y:b.y+.9,len:.22+hash(k+b.x)*.6,palette:'gold'});
 for(const f of game.floors)for(const edge of[f.x,f.x+f.w])if(edge>game.camera-1&&edge<game.camera+vw+1)for(let k=0;k<3;k++)targets.push({key:'g'+edge+','+k,x:edge+(edge===f.x?.025:-.025),y:f.y+.08*k,len:.7+hash(k+edge)*.4,palette:game.area==='underwater84'?'green':isCastle()||isMonochrome()?'stone':below?'ice':'gold'});
 const alive=new Set();for(const t of targets){alive.add(t.key);let r=surfaceNoodles.get(t.key);if(!r){r=new Noodle(t.x,t.y,t.len,5,{pinned:true,palette:t.palette,width:.04,angle:1.3});surfaceNoodles.set(t.key,r)}r.step(dt,t)}for(const key of surfaceNoodles.keys())if(!alive.has(key))surfaceNoodles.delete(key);
}
function spill(x,y,n=9,palette='gold',power=1){for(let i=0;i<n;i++)ropes.push(new Noodle(x+(hash(i+clock)-.5)*.5,y,.35+hash(i*3+clock)*.6,6,{palette,vx:(hash(i*11+clock)-.5)*9*power,vy:-3-hash(i*23+clock)*6*power,angle:hash(i+1)*TAU,width:.04+hash(i)*.035,life:4+hash(i)*2}));if(ropes.length>180)ropes.splice(0,ropes.length-180)}

let audio=null;
function initAudio(){if(!audio)try{audio=new (window.AudioContext||window.webkitAudioContext)()}catch{}if(audio?.state==='suspended')audio.resume()}
function tone(freq,delay=0,duration=.15,volume=.06,kind='triangle',slide=0){if(!audio||muted)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain(),filter=audio.createBiquadFilter();o.type=kind;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(35,freq+slide),t+duration);filter.type='lowpass';filter.frequency.value=2600;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(filter);filter.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.01)}
const melody=[[659,1],[659,1],[0,1],[659,1],[0,1],[523,1],[659,1],[0,1],[784,2],[0,2],[392,2],[0,2],[523,1.5],[0,.5],[392,1.5],[0,.5],[330,1.5],[0,.5],[440,1],[494,1],[466,.5],[440,1.5],[392,.67],[659,.67],[784,.67],[880,1],[698,.5],[784,.5],[0,1],[659,1],[523,.5],[587,.5],[494,1],[0,1]];
const undergroundMelody=[[131,.5],[262,.5],[110,.5],[220,.5],[117,.5],[233,.5],[0,2],[131,.5],[262,.5],[110,.5],[220,.5],[117,.5],[233,.5],[0,2],[87,.5],[175,.5],[73,.5],[147,.5],[78,.5],[156,.5],[0,2],[87,.5],[175,.5],[73,.5],[147,.5],[78,.5],[156,.5],[0,1.5],[156,.4],[147,.4],[139,.4],[131,.4],[123,.4],[117,.4],[110,.4],[104,.4],[98,.4],[93,.4],[87,.4],[0,2]];
const castleMelody=[[147,.5],[156,.5],[147,.5],[139,.5],[147,.5],[156,.5],[147,.5],[139,.5],[147,.5],[156,.5],[147,.5],[139,.5],[131,.5],[139,.5],[131,.5],[123,.5],[131,.5],[139,.5],[131,.5],[123,.5],[117,.5],[123,.5],[117,.5],[110,.5],[104,1],[0,1]];
const cloudMelody=[[523,.5],[659,.5],[784,.5],[1047,1],[0,.5],[988,.5],[880,.5],[784,1],[659,.5],[784,.5],[880,.5],[1047,.5],[1175,1],[1047,.5],[880,.5],[784,.5],[659,.5],[587,.5],[523,1],[0,1]];
const underwaterMelody=[[262,1],[330,.5],[392,.5],[523,1],[494,1],[440,.5],[392,.5],[330,1],[294,1],[349,.5],[440,.5],[523,1],[494,.5],[440,.5],[392,1],[294,1],[262,1.5],[0,.5],[392,1]];
// VictoryMusData, FreqRegLookupTbl and MusicLengthLookupTbl from the original
// disassembly. Preserve its three voices and note timing; Web Audio envelopes
// are a rendering approximation, not an emulation of the NES audio hardware.
const victoryLengths=[3,6,12,24,48,18,36,8],victoryRate=60.0988138974405;
const victoryPeriods=[0x0088,0x002f,0,0x02a6,0x0280,0x025c,0x023a,0x021a,0x01df,0x01c4,0x01ab,0x0193,0x017c,0x0167,0x0153,0x0140,0x012e,0x011d,0x010d,0x00fe,0x00ef,0x00e2,0x00d5,0x00c9,0x00be,0x00b3,0x00a9,0x00a0,0x0097,0x008e,0x0086,0x0077,0x007e,0x0071,0x0054,0x0064,0x005f,0x0059,0x0050,0x0047,0x0043,0x003b,0x0035,0x002a,0x0023,0x0475,0x0357,0x02f9,0x02cf,0x01fc,0x006a];
function decodeVictoryVoice(bytes,voice,packed=false){
 let tick=0,length=24;const notes=[];
 for(let i=0;i<bytes.length;i++){
  let note=bytes[i];if(!note)break;
  if(packed){length=victoryLengths[((note>>6)&3)|((note&1)<<2)];note&=0x3e;}
  else if(note&0x80){length=victoryLengths[note&7];note=bytes[++i];}
  const period=victoryPeriods[note/2],frequency=period?1789772.727/(voice===2?32:16)/(period+1):0;
  if(frequency)notes.push({tick,frames:length,frequency,voice});tick+=length;
 }
 return{notes,ticks:tick};
}
const victoryVoices=[
 decodeVictoryVoice([0x83,0x04,0x84,0x0c,0x83,0x62,0x10,0x84,0x12,0x83,0x1c,0x22,0x1e,0x22,0x26,0x18,0x1e,0x04,0x1c,0],0),
 decodeVictoryVoice([0xe3,0xe1,0xe3,0x1d,0xde,0xe0,0x23,0xec,0x75,0x74,0xf0,0xf4,0xf6,0xea,0x31,0x2d],1,true),
 decodeVictoryVoice([0x83,0x12,0x14,0x04,0x18,0x1a,0x1c,0x14,0x26,0x22,0x1e,0x1c,0x18,0x1e,0x22,0x0c,0x14],2)
];
const victoryNotes=victoryVoices.flatMap(v=>v.notes).filter(n=>n.tick<victoryVoices[0].ticks).map(n=>({...n,frames:Math.min(n.frames,victoryVoices[0].ticks-n.tick)})).sort((a,b)=>a.tick-b.tick||a.voice-b.voice);
let victoryClock=0,victoryCursor=0,victoryCycle=0;
function resetVictoryMusic(){victoryClock=0;victoryCursor=0;victoryCycle=0;}
function playVictoryMusic(dt){
 victoryClock+=dt;
 for(let n=0;n<12;n++){
  const note=victoryNotes[victoryCursor],at=(victoryCycle*victoryVoices[0].ticks+note.tick)/victoryRate;
  if(at>victoryClock)break;
  tone(note.frequency,0,Math.max(.035,note.frames/victoryRate*.91),note.voice===2?.019:.014,note.voice===2?'triangle':'square');
  if(++victoryCursor===victoryNotes.length){victoryCursor=0;victoryCycle++;}
 }
}
function music(dt){if(!audio||muted||paused||session.screen!=='play')return;if(game.castleEnding?.final&&game.castleEnding.messageProgress>=2){playVictoryMusic(dt);return;}if(game.state!=='playing')return;musicClock-=dt;if(musicClock<=0){const cloudMusic=isSky()&&game.area!=='sky42',track=isUnderwater()?underwaterMelody:cloudMusic?cloudMelody:isCastle()?castleMelody:isBelowGround()?undergroundMelody:melody;const [f,d]=track[musicIndex++%track.length];musicClock=d*(isUnderwater()?.26:cloudMusic?.125:isCastle()?.19:isBelowGround()?.235:.145);if(f){tone(f,0,d*(isUnderwater()?.24:.135),.024,isUnderwater()?'sine':'triangle');tone(f/2,.012,d*.16,.013,'sine')}}}
function onGameEvent(e){if(!ready)return;const x=e.x??game.player?.x??0,y=e.y??game.player?.y??0;switch(e.type){case'respawn':case'area':case'level':resetRopes();musicClock=0;musicIndex=0;break;case'jump':kick=-.6;kickV=0;tone(210,0,.15,.07,'sine',430);break;case'land':kick=.6;kickV=0;spill(x,y,3,isMonochrome()?'stone':'gold',.25);tone(95,0,.08,.04,'sine',-40);break;case'coin':tone(988,0,.08,.045);tone(1319,.07,.23,.04);break;case'bump':kick=.25;tone(135,0,.12,.065,'triangle',-65);spill(x,y,3,isBelowGround()?'ice':isMonochrome()?'stone':'gold',.3);break;case'defeat':spill(x,y,13,'gold',.8);tone(140,0,.13,.04,'sine',-70);break;case'break':shake=.06;spill(x,y,19,isBelowGround()?'ice':isMonochrome()?'stone':'gold',1.2);tone(110,0,.18,.08,'sawtooth',-70);break;case'stomp':spill(x,y,8,'gold',.5);kick=.65;tone(190,0,.1,.06,'sine',-110);break;case'power':case'1up':case'star':[330,392,523,659,784,1047].forEach((f,i)=>tone(f,i*.065,.16,.045));spill(x,y,12,'pale',.6);break;case'hurt':spill(x,y,15,'red');tone(420,0,.3,.065,'sawtooth',-300);shake=.1;break;case'death':spill(x,y,22,'gold',1.3);[494,349,330,294,261].forEach((f,i)=>tone(f,i*.12,.22,.05));$('#announcer').textContent='One life lost.';break;case'vine-grow':[196,247,294,392].forEach((f,i)=>tone(f,i*.1,.2,.028,'sine'));$('#announcer').textContent='A spaghetti vine is growing. Climb with Up or W. Space or Z jumps off.';break;
case'maze-loop':resetRopes();$('#announcer').textContent='The castle corridor repeats.';break;
case'vine-grab':kick=.15;tone(180,0,.09,.025,'sine',70);break;
case'vine-jump':kick=-.5;tone(230,0,.16,.045,'sine',360);break;
case'spring-compress':kick=.55;tone(105,0,.22,.045,'triangle',-60);break;
case'spring-release':kick=-1.1;kickV=0;shake=.02;spill(x,y,4,'gold',.25);tone(e.boosted?225:170,0,.32,.055,'sine',e.boosted?1050:450);break;
case'cloud-ride':tone(523,0,.13,.025);tone(659,.09,.2,.02);break;
case'sky-return':$('#announcer').textContent='Back in World '+game.level+'.';break;
case'swim':kick=-.2;kickV=0;tone(145,0,.15,.023,'sine',160);break;
case'current-enter':$('#announcer').textContent='Downward current. Tap jump to keep swimming.';break;
case'splash':spill(x,y,5,'pale',.2);tone(110,0,.18,.02,'sine',-50);break;
case'fish-leap':if(x>game.camera-1&&x<game.camera+vw+1)tone(180,0,.12,.012,'sine',90);break;
case'warp-level':$('#announcer').textContent='Warping to World '+(e.level||game.level)+'.';tone(180,0,.4,.04,'triangle',-90);break;
case'podoboo-leap':if(x>game.camera-1&&x<game.camera+vw+1){spill(x,y,4,'ember',.3);tone(110,0,.23,.026,'sine',190)}break;
case'hammer-throw':if(x>game.camera-1&&x<game.camera+vw+1)tone(170,0,.11,.022,'triangle',-70);break;
case'bullet-fire':case'cannon-fire':if(x>game.camera-2&&x<game.camera+vw+2){tone(96,0,.2,.048,'sawtooth',-56);tone(180,0,.065,.025,'triangle',-115)}break;
case'scale-snap':spill(x,y,8,isMonochrome()?'stone':'gold',.4);shake=.035;tone(170,0,.18,.035,'triangle',-90);$('#announcer').textContent='The spaghetti balance rope snapped. Both platforms are falling.';break;
case'drop-start':if(x>game.camera-1&&x<game.camera+vw+1)tone(130,0,.15,.02,'sine',-65);break;
case'lava':spill(x,y,18,'ember',.65);tone(75,0,.45,.06,'sawtooth',-35);break;
case'axe':tone(740,0,.16,.06);tone(988,.12,.24,.05);$('#announcer').textContent='Axe reached. The bridge is coming apart.';break;
case'bridge-snap':for(let i=0;i<8;i++)ropes.push(new Noodle(x-.45+hash(i+x)*.4,y,.65+hash(i*3+x)*.4,7,{palette:'gold',vx:(hash(i*11+x)-.5)*2,vy:1.5,angle:hash(i+1)*.55,width:.04,life:4.5}));shake=.025;tone(90,0,.11,.035,'triangle',-45);break;
case'boss-fire':tone(105,0,.32,.04,'sawtooth',-50);break;
case'boss-hit':spill(x,y,7,'gold',.45);tone(240,0,.12,.05,'square',-95);break;
case'boss-defeat':spill(x,y,18,'green',.65);tone(105,0,.6,.06,'sawtooth',-65);break;
case'rescue':$('#announcer').textContent=game.level==='8-4'?'Thank you '+session.playerName+'! The princess is rescued.':'Thank you '+session.playerName+'! But our princess is in another castle.';[262,330,392,523].forEach((f,i)=>tone(f,i*.13,.27,.04));break;
case'victory-music':resetVictoryMusic();$('#announcer').textContent='Your quest is over. We present you a new quest.';break;
case'win':if(game.level!=='8-4')[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.15,.3,.06));$('#announcer').textContent=game.level==='8-4'?'The eight-world quest is complete. Press B or X to select a world, or choose New Quest.':stageLabel(game.level)+' complete!';break;case'fire':tone(150,0,.12,.055,'sine',100);spill(x,y,2,'pale',.3);break;case'pipe':tone(180,0,.4,.04,'triangle',-90);break}}

function backdrop(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#18323b';ctx.fillRect(0,0,W,H);if(mats[4]){ctx.globalAlpha=.42;for(let x=0;x<W;x+=420)for(let y=0;y<H;y+=420)ctx.drawImage(mats[isUnderwater()?21:isNight()?25:['castle24','castle54'].includes(game.area)?26:isCastle()?16:isBelowGround()?9:isDaylight()?17:4],x,y,420,420);ctx.globalAlpha=1}const vignette=ctx.createRadialGradient(W*.5,H*.4,Math.min(W,H)*.2,W*.5,H*.5,Math.max(W,H)*.75);vignette.addColorStop(0,'#183b4200');vignette.addColorStop(1,'#09151dde');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H)}
function world(){
 ctx.save();ctx.beginPath();ctx.rect(ox,oy,vw*scale,15*scale);ctx.clip();ctx.translate(ox+(hash(clock)*2-1)*shake*scale,oy);ctx.scale(scale,scale);
 if(isBelowGround()){
   for(let col=0;col<Math.ceil(vw/6);col++)for(let row=0;row<3;row++)mirroredMaterial(9,col*6,row*6,6,6,col%2===1,row%2===1);
   const dark=ctx.createLinearGradient(0,0,0,15);dark.addColorStop(0,'#04080de0');dark.addColorStop(.55,'#01040bba');dark.addColorStop(1,'#00020ed9');ctx.fillStyle=dark;ctx.fillRect(0,0,vw,15);
 }else if(!isCastle()&&!isDaylight()&&!isUnderwater()&&!isNight()){
   for(let col=0;col<Math.ceil(vw/7);col++)for(let row=0;row<3;row++)mirroredMaterial(4,col*7,row*7,7,7,col%2===1,row%2===1);
   const sky=ctx.createLinearGradient(0,0,0,13);sky.addColorStop(0,'#082e4a99');sky.addColorStop(.5,'#38758c44');sky.addColorStop(1,'#9db9ac33');ctx.fillStyle=sky;ctx.fillRect(0,0,vw,15);
 }
 ctx.translate(-game.camera,0);
 if(isUnderwater()&&!world6484Art.drawUnderwaterBackdrop({area:game.area,camera:game.camera,viewWidth:vw}))world23Art.drawUnderwaterBackdrop({camera:game.camera,viewWidth:vw});
 if(isNight())world2431Art.drawNightBackdrop({camera:game.camera,viewWidth:vw,sky:isSky()});
 if(isDaylight())world21Art.drawOverworldBackdrop({camera:game.camera,viewWidth:vw,sky:isSky()});
 if(isCastle()){if(['castle24','castle54'].includes(game.area))world2431Art.drawCastleBackdrop({camera:game.camera,viewWidth:vw,lava:game.lava});else world14Art.drawCastleBackdrop({camera:game.camera,viewWidth:vw});world14Art.drawLava(game.lava,game.camera,vw)}
 scenery();castle();warpSigns();
 if(isUnderwater())for(const c of game.currents||[])if(c.x+c.w>game.camera-1&&c.x<game.camera+vw+1)world23Art.drawCurrent(c);
 if(game.area==='overworld31')world2431Art.drawPond(game.ponds,game.camera,vw);
 for(const f of game.floors)ground(f);
 if(game.area==='overworld31')for(const b of game.bridge||[])if(!b.removed&&b.x+b.w>game.camera-1&&b.x<game.camera+vw+1)world2431Art.drawNightBridge(b,{camera:game.camera,viewWidth:vw});
 if(isUnderwater())for(const c of game.corals||[])if(c.x+c.w>game.camera-1&&c.x<game.camera+vw+1)world23Art.drawCoral(c);
 if(isBridge())for(const b of game.bridge||[])if(!b.removed&&b.x+b.w>game.camera-1&&b.x<game.camera+vw+1)world23Art.drawBridge(b,{camera:game.camera,viewWidth:vw});
 for(const c of game.clouds||[]){if(['sky31','sky62'].includes(game.area))world2431Art.drawNightCloudSurface(c,game.camera,vw);else world21Art.drawCloudSurface(c,game.camera,vw);}
 for(const v of game.vines||[])if(v.x>game.camera-2&&v.x<game.camera+vw+2)world21Art.drawVine(v,game.player);
 for(const t of game.treetops||[])if(t.x+t.w>game.camera-1&&t.x<game.camera+vw+1){if(world5363Art.drawTreetop(t,{area:game.area,player:game.player}))continue;if(t.mushroom)world4252Art.drawMushroom(t,{area:game.area,player:game.player});else if(game.area==='treetops33')world3233Art.drawTreetop(t);else world13Art.drawTreetop(t);}
 for(const it of game.items)if(it.emerge>0&&it.x>game.camera-2&&it.x<game.camera+vw+2)item(it);
 for(const b of game.blocks)if(b.x>game.camera-2&&b.x<game.camera+vw+2)tile(b);
 for(const s of game.scales||[])if(!world5363Art.drawScale(s,{area:game.area})&&['treetops33','mushrooms43'].includes(game.area))world3233Art.drawScale(s);
 for(const p of game.platforms||[])if(!p.hidden&&!p.removed&&p.x>game.camera-4&&p.x<game.camera+vw+1){if(world6484Art.drawPlatform(p,{area:game.area}))continue;if(world5363Art.drawPlatform(p,{area:game.area}))continue;if(p.kind==='cloud'){if(['sky31','sky62'].includes(game.area))world2431Art.drawNightCloudPlatform(p);else world21Art.drawCloudPlatform(p)}else if(['treetops33','mushrooms43'].includes(game.area))world3233Art.drawPlatform(p);else movingPlatform(p)}
 for(const s of game.springboards||[])if(s.x>game.camera-2&&s.x<game.camera+vw+1){if(game.level==='3-1')world2431Art.drawSpringboard(s);else world21Art.drawSpringboard(s);}
 if(isCastle()){
  for(const b of game.bridge)if(b.x>game.camera-2&&b.x<game.camera+vw+1)world14Art.drawBridge(b);
  if(game.axe&&!game.axe.triggered&&game.axe.x<game.camera+vw+1){for(let k=0;k<5;k++)coil(140.15+(game.castleRoomOffset||0)+k*.24,9.55-k*.21,.14,.085,'gold',.055);world14Art.drawAxe(game.axe)}
  if(game.princess)world6484Art.drawPrincess(game.princess,{ending:game.castleEnding,player:game.player});else world14Art.drawToad(game.toad);
 }
 const drawHero=()=>{player();if(!game.player.hidden){for(const a of heroNoodles)a.rope.draw();if(game.player.swimming)world23Art.drawSwimmingPlayerOverlay(game.player,{luigi:session.activePlayer===1});}};
 if(game.state==='pipe')drawHero();
 for(const e of game.enemies)if((e.kind==='piranha'||e.type==='piranha')&&e.x>game.camera-2&&e.x<game.camera+vw+2)enemy(e);
 for(const p of game.pipes)if(p.x>game.camera-3&&p.x<game.camera+vw+2)pipe(p);
 for(const c of game.cannons||[])if(c.x+(c.w??1)>game.camera-2&&c.x<game.camera+vw+2)world4252Art.drawCannon(c);
 for(const it of game.items)if(!(it.emerge>0)&&it.x>game.camera-2&&it.x<game.camera+vw+2)item(it);
 for(const e of game.enemies)if(e.kind!=='piranha'&&e.type!=='piranha'&&e.x>game.camera-2&&e.x<game.camera+vw+2)enemy(e);
 if(isCastle()||game.area==='underwater84'){
  for(const b of game.firebars)if(b.x>game.camera-3&&b.x<game.camera+vw+3)world14Art.drawFirebar(b);
  if(!world6484Art.drawRevealedBoss(game.boss,{area:game.area})&&!world5363Art.drawRevealedBoss(game.boss)&&!world4252Art.drawRevealedBoss(game.boss)&&!world3441Art.drawRevealedBoss(game.boss)){if(game.area==='castle24'&&game.boss?.revealedKind==='koopa')world2431Art.drawRevealedBoss(game.boss);else world14Art.drawBoss(game.boss);}
  for(const p of game.podoboos||[])if(p.x>game.camera-2&&p.x<game.camera+vw+2)world2431Art.drawPodoboo(p);
  for(const f of game.bossFlames)if(f.x>game.camera-3&&f.x<game.camera+vw+3)world14Art.drawBreath(f);
 }
 for(const h of game.hammers||[])if(!h.removed&&h.x>game.camera-2&&h.x<game.camera+vw+2)world2431Art.drawHammer(h);
 for(const sh of game.shots)if(!sh.removed)drawSprite(7,sh.x,sh.y,sh.w||.45,sh.h||.45,{wiggle:.03});
 if(game.state!=='pipe')drawHero();
 if(game.player.climbing)for(const v of game.vines||[])world21Art.drawVineGrip(v,game.player);
 for(const r of surfaceNoodles.values())r.draw();
 for(const r of ropes)r.draw();
 for(const e of game.effects||[])if(e.type==='coin')drawSprite(3,e.x,e.y,e.w,e.h);else if(e.type==='score')pastaText(e.text,e.x+.5,e.y,.25,{align:'center',alpha:clamp(e.life*2,0,1)});
 for(const f of floaters)pastaText(f.text,f.x+.5,f.y-.15,.25,{align:'center',alpha:1-f.age/1.1});
 if(isUnderwater()&&!world6484Art.drawUnderwaterForeground({area:game.area,camera:game.camera,viewWidth:vw,player:game.player}))world23Art.drawUnderwaterForeground({camera:game.camera,viewWidth:vw,player:game.player});
 ctx.restore();
}
function castleMessage(){
 if(!isCastle()||!game.castleEnding||!['castle-end','won'].includes(game.state))return;
 const n=game.castleEnding.messageProgress;if(!n)return;
 ctx.save();screenTransform();ctx.scale(1/16,1/16);
 const x=clamp((151.5+(game.castleRoomOffset||0)-game.camera)*16,90,vw*16-90),options={align:'center',shadow:true};
 if(n>=1)menuArt.text('THANK YOU '+session.playerName+'!',x,72,options);
 if(game.castleEnding.final){
  if(n>=2)menuArt.text('YOUR QUEST IS OVER.',x,104,options);
  if(n>=3)menuArt.text('WE PRESENT YOU A NEW QUEST.',x,120,options);
  if(n>=4)menuArt.text('PUSH BUTTON B',x,152,options);
  if(n>=5)menuArt.text('TO SELECT A WORLD',x,168,options);
 }else{
  if(n>=2)menuArt.text('BUT OUR PRINCESS IS IN',x,104,options);
  if(n>=3)menuArt.text('ANOTHER CASTLE!',x,120,options);
 }
 ctx.restore();
}
function finishMessage(){
 if(game.state!=='won'||game.level!=='q1-1')return;
 ctx.save();screenTransform();ctx.scale(1/16,1/16);
 const cx=vw*8;
 photoShape(9,()=>{ctx.beginPath();ctx.roundRect(cx-70,60,140,36,4)},cx-70,60,140,36,.92);
 strand([[cx-67,93],[cx-67,63],[cx+67,63],[cx+67,93],[cx-67,93]],.65,'gold',.7);
 menuArt.text('QUEST II 1-1 CLEAR',vw*8,67,{align:'center',shadow:true});
 menuArt.text('SCORE '+String(game.score).padStart(6,'0'),vw*8,82,{align:'center',shadow:true,advance:7,cw:1.05});
 ctx.restore();
}
function screenTransform(){ctx.setTransform(DPR*scale,0,0,DPR*scale,DPR*ox,DPR*oy)}
function hud(){
 ctx.save();screenTransform();ctx.scale(1/16,1/16);
 const columns=[12,vw*16*.32,vw*16*.54,vw*16*.75],y=12,options={shadow:true};
 menuArt.text(session.playerName,columns[0],y,options);menuArt.text(String(game.score).padStart(6,'0'),columns[0],y+9,options);
 if(actors[3])ctx.drawImage(actors[3],columns[1],y+8,5,8);menuArt.text('X'+String(game.coins).padStart(2,'0'),columns[1]+8,y+9,options);
 menuArt.text('WORLD',columns[2],y,options);menuArt.text(worldLabel(game.level),columns[2]+8,y+9,options);
 menuArt.text('TIME',columns[3],y,options);menuArt.text(String(Math.max(0,Math.ceil(game.time))).padStart(3,'0'),columns[3]+8,y+9,options);
 if(game.player?.star>0)menuArt.text('STAR '+Math.ceil(game.player.star),12,35,{...options,cw:1,ch:.8,advance:7});
 if(game.level==='q1-1')menuArt.text('QUEST II',vw*16-12,35,{...options,align:'right',cw:1,ch:.8,advance:7});
 ctx.restore();
}

const menuButtonIds=['one-player','two-player',...WORLD_LEVELS.map(level=>'world-'+level),'menu-sound','menu-fullscreen','select-prev','select-next','back','resume','restart','level-select','title-screen','next-player','new-quest','return-warp'];
function isMenuScreen(){return session.screen!=='play'||paused||['won','gameover','warped'].includes(game.state)}
function menuTransform(){ctx.setTransform(DPR*menuScale,0,0,DPR*menuScale,DPR*menuX,DPR*menuY)}
function layoutMenus(){const selecting=session.screen==='select';selectorColumns=selecting&&W/H>1.4&&H<600?2:1;menuWidth=selecting&&selectorColumns===2?480:256;menuHeight=selecting?(selectorColumns===2?256:416):240;menuScale=Math.min(W/menuWidth,H/menuHeight);menuX=(W-menuWidth*menuScale)/2;menuY=(H-menuHeight*menuScale)/2;}
function setMenuButton(id,x,y,w,h,label,{unit=menuScale,left=menuX,top=menuY}={}){const el=$('#'+id);el.hidden=false;el.style.left=(left+x*unit)+'px';el.style.top=(top+y*unit)+'px';el.style.width=w*unit+'px';el.style.height=h*unit+'px';if(label)el.setAttribute('aria-label',label)}
function menuOptions(){
 if(paused)return[{id:'resume',label:'CONTINUE'},{id:'level-select',label:'LEVEL SELECT'},{id:'menu-sound',label:muted?'SOUND ON':'SOUND OFF'},{id:'menu-fullscreen',label:'FULL SCREEN'},{id:'title-screen',label:'TITLE SCREEN'}];
 if(game.state==='warped')return[{id:'return-warp',label:'RETURN TO WARP ZONE'},{id:'level-select',label:'LEVEL SELECT'},{id:'title-screen',label:'TITLE SCREEN'}];
 if(game.state==='won'){
  const other=session.games[1-session.activePlayer],canNext=session.playerCount===2&&other&&other.lives>0&&!(other.state==='won'&&other.level==='q1-1');
  return[...(canNext?[{id:'next-player',label:(session.activePlayer===0?'LUIGI':'MARIO')+' TURN'}]:[]),...(game.level==='8-4'?[{id:'new-quest',label:'NEW QUEST'}]:[]),{id:'level-select',label:'LEVEL SELECT'},{id:'title-screen',label:'TITLE SCREEN'}];
 }
 return[{id:'restart',label:'PLAY AGAIN'},{id:'level-select',label:'LEVEL SELECT'},{id:'title-screen',label:'TITLE SCREEN'}];
}
function finishMenu(){
 const options=menuOptions();menuIndex=clamp(menuIndex,0,options.length-1);
 const available=H-(oy+15*scale),portrait=coarse()&&H>W*1.25&&available>=options.length*44+8,unit=menuScale,left=menuX;
 if(['8-4','q1-1'].includes(game.level)&&!portrait){
  // Keep the final-stage characters clear above the ground.
  const columns=W>=700?options.length:2,rows=Math.ceil(options.length/columns),gap=8,pad=12,height=clamp(H*.06,44,56),width=(W-pad*2-gap*(columns-1))/columns,top=H-4-rows*height-(rows-1)*gap;
  const longest=Math.max(...options.map(o=>o.label.length)),typeScale=Math.min(menuScale,(width-36)/(longest*7));
  ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);
  options.forEach((option,i)=>{
   const x=pad+(i%columns)*(width+gap),y=top+Math.floor(i/columns)*(height+gap);
   photoShape(9,()=>{ctx.beginPath();ctx.roundRect(x,y,width,height,5)},x,y,width,height,.94);
   if(i===menuIndex)for(const edge of [[[x+2,y+height-2],[x+2,y+2]],[[x+2,y+2],[x+width-2,y+2]],[[x+width-2,y+2],[x+width-2,y+height-2]],[[x+width-2,y+height-2],[x+2,y+height-2]]])strand(edge,1.2,'pale',.9);
   ctx.save();ctx.translate(x+width/2,y+height/2-4*typeScale);ctx.scale(typeScale,typeScale);menuArt.text(option.label,0,0,{align:'center',shadow:true,advance:7,cw:1.05});ctx.restore();
   if(i===menuIndex&&actors[4])ctx.drawImage(actors[4],x+7,y+height/2-7,14,14);
   setMenuButton(option.id,x,y,width,height,option.label,{unit:1,left:0,top:0});
  });
  ctx.restore();return;
 }
 const gap=clamp((available-options.length*44-16)/Math.max(1,options.length-1),4,10),stride=44+gap,navHeight=options.length*44+(options.length-1)*gap;
 const top=portrait?Math.min(H-navHeight-4,Math.max(oy+15*scale+8,H-navHeight-24)):menuY;
 ctx.save();ctx.setTransform(DPR*unit,0,0,DPR*unit,DPR*left,DPR*top);
 options.forEach((option,i)=>{
  const y=portrait?i*stride/unit+15/unit:225-(options.length-1-i)*14;
  const tw=(option.label.length-1)*7+5.25,px=portrait?23:128-tw/2-3,pw=portrait?210:tw+6;
  const py=portrait?i*stride/unit:y-2,ph=portrait?44/unit:12;
  photoShape(9,()=>{ctx.beginPath();ctx.roundRect(px,py,pw,ph,portrait?4:2)},px,py,pw,ph,.9);
  if(portrait&&i===menuIndex)for(const edge of [[[px+2,py+ph-2],[px+2,py+2]],[[px+2,py+2],[px+pw-2,py+2]],[[px+pw-2,py+2],[px+pw-2,py+ph-2]],[[px+pw-2,py+ph-2],[px+2,py+ph-2]]])strand(edge,.7,'pale',.8);
  menuArt.text(option.label,128,y,{align:'center',shadow:true,advance:7,cw:1.05});
  if(i===menuIndex&&actors[4])ctx.drawImage(actors[4],portrait?32:27,y,7,7);
  setMenuButton(option.id,23,portrait?i*stride/unit:y-3,210,portrait?44/unit:14,option.label,{unit,left,top});
 });
 ctx.restore();
}
function menu(){
 for(const id of menuButtonIds)$('#'+id).hidden=true;
 const modal=isMenuScreen();$('#toolbar').hidden=modal;$('#touch').hidden=modal||!coarse();$('#touch-up').hidden=!['2-1','3-1','4-2','5-2','6-2'].includes(game.level);$('#touch-jump').setAttribute('aria-label',isUnderwater()?'Swim stroke':'Jump');
 if(!modal)return;
 if(session.screen==='play'&&game.state==='won'&&!paused){finishMenu();return}
 ctx.save();menuTransform();ctx.beginPath();ctx.rect(0,0,menuWidth,menuHeight);ctx.clip();
 if(session.screen==='title'){
  menuArt.title({choice:session.titleChoice,topScore:session.topScore});
  setMenuButton('one-player',64,138,160,16,'1 player game');setMenuButton('two-player',64,154,160,16,'2 player game');
 }else if(session.screen==='select'){
  menuArt.selector({selected:session.selection,players:session.playerCount,topScore:session.topScore,columns:selectorColumns});
  const page=Math.floor(session.selection/SELECT_PAGE_SIZE),first=page*SELECT_PAGE_SIZE,count=Math.min(SELECT_PAGE_SIZE,WORLD_LEVELS.length-first),rows=selectorColumns===2?Math.ceil(count/2):count;
  WORLD_LEVELS.slice(first,first+SELECT_PAGE_SIZE).forEach((level,i)=>setMenuButton('world-'+level,28+(selectorColumns===2&&i>=rows?240:0),selectorColumns===2?42+(5-rows)*14.75+(i%rows)*29.5:63+i*29.5,200,29,'Start '+stageLabel(level)));
  if(selectorColumns===2){setMenuButton('select-prev',28,209,128,29,'Previous page');setMenuButton('back',176,209,128,29,'Back');setMenuButton('select-next',324,209,128,29,'Next page');}
  else{setMenuButton('select-prev',28,344,88,29,'Previous page');setMenuButton('select-next',140,344,88,29,'Next page');setMenuButton('back',96,375,64,29,'Back');}
  $('#select-prev').disabled=page===0;$('#select-next').disabled=first+SELECT_PAGE_SIZE>=WORLD_LEVELS.length;
 }else if(session.screen==='interstitial'){
  menuArt.interstitial({name:session.playerName,actor:session.actorIndex,score:game.score,coins:game.coins,level:game.level,lives:game.lives});
 }else{
  const options=menuOptions();menuIndex=clamp(menuIndex,0,options.length-1);
  let heading=paused?'PAUSE':game.state==='warped'?'WARP ZONE':game.state==='won'?stageLabel(game.level).toUpperCase()+' CLEAR':'GAME OVER';
  let lines=paused?[session.playerName+' - '+stageLabel(game.level).toUpperCase(),'SCORE '+String(game.score).padStart(6,'0')]:game.state==='warped'?['PIPE TO WORLD '+game.warpDestination,'DESTINATION NOT INCLUDED']:game.state==='won'?[session.playerName+' FINISHED','SCORE '+String(game.score).padStart(6,'0')]:[session.playerName,'SCORE '+String(game.score).padStart(6,'0')];
  menuArt.simpleMenu({heading,lines,options,selected:menuIndex});
  options.forEach((option,i)=>setMenuButton(option.id,23,119+i*23,210,21,option.label));
 }
 ctx.restore();
}

function controls(){
 if(isMenuScreen())return;
 ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);
 const buttons=[['sound',muted?'M':'S'],['pause','II'],['fullscreen','+']];
 for(const[id,icon]of buttons){const r=$('#'+id).getBoundingClientRect();if(r.width===0||r.height===0)continue;ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.width,r.height);photoShape(4,()=>{ctx.beginPath();ctx.arc(.5,.5,.45,0,TAU)},.05,.05,.9,.9);coil(.5,.5,.45,.45,'gold',.036);pastaText(icon,.5,.32,.31,{align:'center',weight:.13});ctx.restore()}
 if(coarse())for(const el of document.querySelectorAll('#touch button')){
  const r=el.getBoundingClientRect(),key=el.dataset.key;if(r.width===0||r.height===0)continue;ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.width,r.height);photoShape(4,()=>{ctx.beginPath();ctx.arc(.5,.5,.46,0,TAU)},.04,.04,.92,.92);
  coil(.5,.5,.46,.46,touch.has(key)?'pale':'gold',.04,2);
  if(key==='left')strand([[.6,.27],[.35,.5],[.6,.73]],.065,'pale');else if(key==='right')strand([[.4,.27],[.65,.5],[.4,.73]],.065,'pale');else if(key==='down')strand([[.27,.4],[.5,.65],[.73,.4]],.065,'pale');else if(key==='up')strand([[.27,.6],[.5,.35],[.73,.6]],.065,'pale');else pastaText(key==='jump'?'A':'B',.5,.31,.35,{align:'center',weight:.14});ctx.restore();
 }
 if(coarse()&&isUnderwater()&&H>W*1.25){
  const label='TAP A TO SWIM',size=12,tw=textWidth(label,size),y=Math.min(H-134,oy+15*scale+18);
  photoShape(9,()=>{ctx.beginPath();ctx.roundRect(W/2-tw/2-10,y-6,tw+20,26,5)},W/2-tw/2-10,y-6,tw+20,26,.8);
  pastaText(label,W/2,y,size,{align:'center',palette:'pale'});
 }
 ctx.restore();ctx.save();screenTransform();
 if(!coarse()){
  const hint=isUnderwater()?'MOVE A D / ARROWS    SWIM TAP SPACE / Z    THROW X':['2-1','3-1'].includes(game.level)?'MOVE A D / ARROWS   JUMP SPACE   RUN X   CLIMB UP / DOWN':'MOVE A D / ARROWS    JUMP SPACE    RUN X / SHIFT    PIPE DOWN',size=Math.min(.19,(vw-1)/57*.7),tw=textWidth(hint,size);
  if(isUnderwater())photoShape(9,()=>{ctx.beginPath();ctx.roundRect(vw/2-tw/2-.16,14.36,tw+.32,size+.18,.08)},vw/2-tw/2-.16,14.36,tw+.32,size+.18,.75);
  pastaText(hint,vw/2,14.45,size,{align:'center',palette:'pale',alpha:.95});
 }
 const lifeLabel='LIVES '+game.lives,lifeSize=coarse()?Math.min(.44,10/scale):.23;
 if(isUnderwater())photoShape(9,()=>{ctx.beginPath();ctx.roundRect(.5,13.67,textWidth(lifeLabel,lifeSize)+.2,lifeSize+.17,.06)},.5,13.67,textWidth(lifeLabel,lifeSize)+.2,lifeSize+.17,.8);
 pastaText(lifeLabel,.6,13.75,lifeSize,{palette:'pale'});ctx.restore();
}
function resize(){
 W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
 vw=clamp(W/H*15,16,28);scale=Math.min(W/vw,H/15);ox=(W-vw*scale)/2;oy=H>W*1.25?Math.max(75,(H-15*scale)*.34):(H-15*scale)/2;
 layoutMenus();game.viewWidth=vw;
 if(isCastle()&&(game.state==='won'||game.castleEnding?.phase==='message'))game.camera=Math.max(0,Math.min(144+(game.castleRoomOffset||0),game.worldWidth-vw));
}
function syncInterface({focus=true}={}){
 game=session.game;game.viewWidth=vw;layoutMenus();keys.clear();touch.clear();pendingJump=false;pendingJumpOff=false;pendingFire=false;accumulator=0;
 lastArea=game.area;resetRopes();musicClock=0;musicIndex=0;resetVictoryMusic();menuIndex=0;
 $('#pause').setAttribute('aria-label',paused?'Resume game':'Pause game');
 if(focus)canvas.focus();
 $('#announcer').textContent=session.screen==='select'?'Select a course. '+WORLD_LEVELS.map(stageLabel).join(', ')+'.':session.screen==='title'?'Super Mario Bros. Choose 1 player or 2 player game.':session.playerName+'. '+stageLabel(game.level)+'. '+game.lives+' lives.';
 $('#game').setAttribute('aria-label','Spaghetti Mario, complete eight-world campaign and Second Quest 1-1');document.title='Spaghetti Mario · Worlds 1–1 through 8–4 + Second Quest';
}
function choosePlayers(count){if(!ready)return;initAudio();paused=false;session.openSelect(count);syncInterface()}
function startLevel(level){if(!ready)return;initAudio();paused=false;session.startLevel(level);syncInterface()}
function openLevelSelect(){session.openSelect();paused=false;syncInterface()}
function selectPageStep(delta){if(!ready||session.screen!=='select')return;const page=Math.floor(session.selection/SELECT_PAGE_SIZE)+delta;if(page<0||page>=Math.ceil(WORLD_LEVELS.length/SELECT_PAGE_SIZE))return;session.selection=Math.min(WORLD_LEVELS.length-1,page*SELECT_PAGE_SIZE+session.selection%SELECT_PAGE_SIZE);canvas.focus();$('#announcer').textContent='Level selection page '+(page+1)+'. '+stageLabel(WORLD_LEVELS[session.selection])+'.';}
function back(){session.back();paused=session.screen==='play'&&!['won','gameover','warped'].includes(session.game.state);syncInterface()}
function returnTitle(){session.returnTitle();paused=false;syncInterface()}
function restart(){session.restartCurrent();paused=false;syncInterface()}
function returnToWarp(){session.returnFromWarp();paused=false;syncInterface()}
function nextPlayer(){session.nextPlayer();paused=false;syncInterface()}
function startSecondQuest(){if(!session.startSecondQuest())return;paused=false;syncInterface()}
function openSecondQuestSelect(){session.openSelect();session.selection=WORLD_LEVELS.indexOf('q1-1');paused=false;syncInterface()}
function togglePause(){if(!ready||session.screen!=='play'||['won','gameover','warped'].includes(game.state))return;paused=!paused;keys.clear();touch.clear();pendingJump=false;pendingJumpOff=false;pendingFire=false;menuIndex=0;$('#pause').setAttribute('aria-label',paused?'Resume game':'Pause game')}
function toggleSound(){initAudio();muted=!muted;$('#sound').setAttribute('aria-label',muted?'Turn sound on':'Turn sound off')}
async function fullScreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#game').requestFullscreen()}catch{}}
const actions={'one-player':()=>choosePlayers(1),'two-player':()=>choosePlayers(2),...Object.fromEntries(WORLD_LEVELS.map(level=>['world-'+level,()=>startLevel(level)])),'menu-sound':toggleSound,'menu-fullscreen':fullScreen,'select-prev':()=>selectPageStep(-1),'select-next':()=>selectPageStep(1),back,resume:togglePause,restart,'level-select':openLevelSelect,'title-screen':returnTitle,'return-warp':returnToWarp,'next-player':nextPlayer,'new-quest':startSecondQuest};
for(const[id,action]of Object.entries(actions)){
 const el=$('#'+id);el.addEventListener('click',action);
 const select=()=>{if(id==='one-player')session.titleChoice=0;else if(id==='two-player')session.titleChoice=1;else if(id.startsWith('world-'))session.selection=WORLD_LEVELS.indexOf(id.slice(6));else{const i=menuOptions().findIndex(o=>o.id===id);if(i>=0)menuIndex=i}};
 el.addEventListener('focus',select);el.addEventListener('pointerenter',select);
}
$('#pause').addEventListener('click',togglePause);$('#sound').addEventListener('click',toggleSound);$('#fullscreen').addEventListener('click',fullScreen);
addEventListener('keydown',e=>{
 canvas.dataset.lastKey=e.code;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyZ','KeyX','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(e.code==='KeyM'){toggleSound();return}if(e.code==='KeyF'){fullScreen();return}
 if(e.code==='KeyP'&&session.screen==='play'&&!['won','gameover','warped'].includes(game.state)){e.preventDefault();togglePause();return}
 if(isMenuScreen()){
  if(['Enter','Space','Escape'].includes(e.code))e.preventDefault();
  if(session.screen==='interstitial')return;
  if(session.screen==='play'&&game.state==='won'&&game.level==='8-4'&&['KeyB','KeyX'].includes(e.code)){openSecondQuestSelect();return;}
  const up=['ArrowUp','ArrowLeft','KeyW','KeyA'].includes(e.code),down=['ArrowDown','ArrowRight','KeyS','KeyD'].includes(e.code),confirm=e.code==='Space'||e.code==='Enter'||e.code==='KeyZ';
  if(up||down)canvas.focus();
  const focused=document.activeElement;
  if(confirm&&focused&&!focused.hidden&&actions[focused.id]){actions[focused.id]();return}
  if(session.screen==='title'){if(up||down)session.titleChoice=1-session.titleChoice;if(confirm)choosePlayers(session.titleChoice+1);return}
  if(session.screen==='select'){if(e.code==='PageUp'||e.code==='PageDown'){e.preventDefault();selectPageStep(e.code==='PageUp'?-1:1);return;}if(selectorColumns===2&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){const first=Math.floor(session.selection/SELECT_PAGE_SIZE)*SELECT_PAGE_SIZE,count=Math.min(SELECT_PAGE_SIZE,WORLD_LEVELS.length-first),rows=Math.ceil(count/2),local=session.selection-first,target=local<rows?local+rows:local-rows;if(target<count)session.selection=first+target;}else{if(up)session.selection=(session.selection+WORLD_LEVELS.length-1)%WORLD_LEVELS.length;if(down)session.selection=(session.selection+1)%WORLD_LEVELS.length;}const shortcut=WORLD_SHORTCUTS.indexOf(e.code);if(shortcut>=0){session.selection=shortcut;canvas.focus();}if(confirm)startLevel(WORLD_LEVELS[session.selection]);if(e.code==='Escape')back();return}
  const options=menuOptions();if(up)menuIndex=(menuIndex+options.length-1)%options.length;if(down)menuIndex=(menuIndex+1)%options.length;if(confirm)actions[options[menuIndex].id]();if(e.code==='Escape'&&paused)togglePause();return;
 }
 if(e.code==='Escape'||e.code==='KeyP'){togglePause();return}
 if(['Space','KeyZ','ArrowUp','KeyW'].includes(e.code))pendingJump=true;if(['Space','KeyZ'].includes(e.code))pendingJumpOff=true;if(e.code==='KeyX')pendingFire=true;keys.add(e.code);initAudio();
});
addEventListener('keyup',e=>keys.delete(e.code));
function loseFocus(){keys.clear();touch.clear();if(session.screen==='play'&&game.state==='playing')paused=true}
addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus()});
for(const el of document.querySelectorAll('#touch button')){
 el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();el.setPointerCapture(e.pointerId);touch.add(el.dataset.key);if(['jump','up'].includes(el.dataset.key))pendingJump=true;if(el.dataset.key==='jump')pendingJumpOff=true;if(el.dataset.key==='run')pendingFire=true});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>touch.delete(el.dataset.key));
}
addEventListener('resize',resize);canvas.addEventListener('pointerdown',()=>canvas.focus());
function frame(ts){
 const renderStart=performance.now(),elapsed=Math.max(0,(ts-last)/1000||0),dt=Math.min(elapsed,1/20);last=ts;clock+=dt;accumulator+=dt;
 if(ready){
  const inp=input(),previousRevision=session.revision;let stepped=false;
  if(session.screen==='interstitial'){session.update(elapsed,{}, {paused});accumulator=0;stepped=true;}
  else while(accumulator>=1/120){session.update(1/120,inp,{paused});game=session.game;if(session.screen==='play'&&!paused)updateNoodles(1/120);stepped=true;accumulator-=1/120;}
  if(session.revision!==previousRevision){paused=false;syncInterface({focus:false})}
  if(stepped){pendingJump=false;pendingJumpOff=false;pendingFire=false}
  music(dt);backdrop();if(!isMenuScreen()||session.screen==='play'&&game.state==='won'&&!paused){world();hud();castleMessage();finishMessage()}menu();controls();
  canvas.dataset.state=game.state;canvas.dataset.screen=session.screen;canvas.dataset.level=game.level;canvas.dataset.activePlayer=session.playerName;canvas.dataset.players=String(session.playerCount);canvas.dataset.paused=String(paused);
  canvas.dataset.playerX=game.player.x.toFixed(2);canvas.dataset.playerY=game.player.y.toFixed(2);canvas.dataset.area=game.area;canvas.dataset.assetsReady=String(actors.length===30&&mats.length===29);canvas.dataset.renderMs=(performance.now()-renderStart).toFixed(1);
 }
 requestAnimationFrame(frame);
}

function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Unable to load '+src));im.src=src})}
function tintMaterial(image,filter){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.filter=filter;g.drawImage(image,0,0);return c}
function slice(im,sx,sy,sw,sh){const c=document.createElement('canvas');c.width=Math.ceil(sw);c.height=Math.ceil(sh);c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);return c}
async function boot(){
 try{
  [assets.terrain,assets.details,assets.castle,assets.world21,assets.world23,assets.world2431,assets.princess]=await Promise.all([loadImage('assets/pasta-terrain.png'),loadImage('assets/pasta-details.png'),loadImage('assets/pasta-castle.png'),loadImage('assets/pasta-world21.png'),loadImage('assets/pasta-world23.png'),loadImage('assets/pasta-world2431.png'),loadImage('assets/pasta-princess.png')]);
  const t=assets.terrain;for(let i=0;i<6;i++)mats.push(slice(t,i%3*t.width/3,Math.floor(i/3)*t.height/2,t.width/3,t.height/2));
  const a=assets.details;for(let i=0;i<4;i++)mats.push(slice(a,i%2*a.width/2,Math.floor(i/2)*a.height/2,a.width/2,a.height/2));
  mats[10]=tintMaterial(mats[1],'hue-rotate(165deg) saturate(.65) brightness(.78)');mats[11]=tintMaterial(mats[0],'hue-rotate(165deg) saturate(.6) brightness(.75)');mats[12]=tintMaterial(mats[2],'hue-rotate(165deg) saturate(.55) brightness(.88)');
  const c=assets.castle;for(let i=0;i<4;i++)mats[13+i]=slice(c,i%2*c.width/2,Math.floor(i/2)*c.height/2,c.width/2,c.height/2);
  const n=assets.world21;for(let i=0;i<4;i++)mats[17+i]=slice(n,i%2*n.width/2,Math.floor(i/2)*n.height/2,n.width/2,n.height/2);
  const w=assets.world23;for(let i=0;i<4;i++)mats[21+i]=slice(w,i%2*w.width/2,Math.floor(i/2)*w.height/2,w.width/2,w.height/2);
  const z=assets.world2431;for(let i=0;i<4;i++)mats[25+i]=slice(z,i%2*z.width/2,Math.floor(i/2)*z.height/2,z.width/2,z.height/2);
  actors.push(...buildSprites(mats));world6484Art.loadPrincess(assets.princess);
 }catch(e){console.error(e);$('#announcer').textContent='Some photographic assets could not load. Reload to try again.'}
 ready=true;resize();resetRopes();$('#loading').classList.add('done');setTimeout(()=>$('#loading').remove(),600);requestAnimationFrame(frame);
}
// Read-only state makes a stuck game diagnosable without exposing gameplay cheats.
Object.defineProperty(window,'spaghettiGame',{value:{snapshot:()=>({screen:session.screen,activePlayer:session.playerName,playerCount:session.playerCount,state:game.state,level:game.level,area:game.area,score:game.score,coins:game.coins,lives:game.lives,time:game.time,player:{...game.player},camera:game.camera,paused,assetsReady:actors.length===30&&mats.length===29,activeNoodles:ropes.length+heroNoodles.length+surfaceNoodles.size}),version:'8.4.1'}});
boot();
