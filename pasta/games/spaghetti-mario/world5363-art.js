// Worlds5–3 through6–3. Every surface is photographic spaghetti or shaded
// noodle strands. Source-cell masks preserve partial clouds and overlapping
// treetop trunks; art never changes player, platform or collision state.
import { createWorld3233Art } from './world3233-art.js';
export function createWorld5363Art({ctx,material,materials,strand,coil,photoShape,drawSprite,getTime=()=>0}) {
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const flex=new WeakMap(),tilePatterns=new Map();
  const SCENERY={"treetops53":{"width":178,"clouds":[{"x":18,"y":2,"w":4,"cells":[[18,2,128],[19,2,129],[20,2,129],[21,2,130],[18,3,131],[19,3,132],[20,3,132],[21,3,133]]},{"x":66,"y":2,"w":4,"cells":[[66,2,128],[67,2,129],[68,2,129],[69,2,130],[66,3,131],[67,3,132],[68,3,132],[69,3,133]]},{"x":114,"y":2,"w":4,"cells":[[114,2,128],[115,2,129],[116,2,129],[117,2,130],[114,3,131],[115,3,132],[116,3,132],[117,3,133]]},{"x":162,"y":2,"w":4,"cells":[[162,2,128],[163,2,129],[164,2,129],[165,2,130],[162,3,131],[163,3,132],[164,3,132],[165,3,133]]},{"x":3,"y":3,"w":4,"cells":[[3,3,128],[4,3,129],[5,3,129],[6,3,130],[3,4,131],[4,4,132],[5,4,132],[6,4,133]]},{"x":51,"y":3,"w":4,"cells":[[51,3,128],[52,3,129],[53,3,129],[54,3,130],[51,4,131],[52,4,132],[53,4,132],[54,4,133]]},{"x":99,"y":3,"w":4,"cells":[[99,3,128],[100,3,129],[101,3,129],[102,3,130],[99,4,131],[100,4,132],[101,4,132],[102,4,133]]},{"x":147,"y":3,"w":4,"cells":[[147,3,128],[148,3,129],[149,3,129],[150,3,130],[147,4,131],[148,4,132],[149,4,132],[150,4,133]]},{"x":38,"y":6,"w":3,"cells":[[38,6,128],[39,6,129],[40,6,130],[38,7,131],[39,7,132],[40,7,133]]},{"x":86,"y":6,"w":3,"cells":[[86,6,128],[87,6,129],[88,6,130],[86,7,131],[87,7,132],[88,7,133]]},{"x":134,"y":6,"w":3,"cells":[[134,6,128],[135,6,129],[136,6,130],[134,7,131],[135,7,132],[136,7,133]]},{"x":9,"y":7,"w":3,"cells":[[9,7,128],[10,7,129],[11,7,130],[9,8,131],[10,8,132],[11,8,133]]},{"x":57,"y":7,"w":3,"cells":[[57,7,128],[58,7,129],[59,7,130],[57,8,131],[58,8,132],[59,8,133]]},{"x":153,"y":7,"w":3,"cells":[[153,7,128],[154,7,129],[153,8,131],[154,8,132]]},{"x":35,"y":7,"w":3,"cells":[[35,7,128],[36,7,129],[37,7,130]]},{"x":83,"y":7,"w":3,"cells":[[83,7,128],[84,7,129],[85,7,130],[83,8,131],[84,8,132],[85,8,133]]},{"x":131,"y":7,"w":3,"cells":[[131,7,128],[132,7,129],[133,7,130],[131,8,131],[132,8,132],[133,8,133]]},{"x":46,"y":11,"w":3,"cells":[[46,11,128],[47,11,129],[48,11,130],[46,12,131],[47,12,132],[48,12,133]]},{"x":94,"y":11,"w":3,"cells":[[94,11,128],[95,11,129],[96,11,130],[94,12,131],[95,12,132],[96,12,133]]},{"x":142,"y":11,"w":3,"cells":[[144,11,130],[144,12,133]]},{"x":76,"y":11,"w":3,"cells":[[76,11,128],[76,12,131]]},{"x":124,"y":11,"w":3,"cells":[[125,11,129],[125,12,132],[126,12,133],[126,11,130]]}],"trees":[],"fences":[],"mushrooms":[],"hillCells":[],"bushCells":[],"trunkRuns":[[41,5,5],[27,6,3],[41,6,5],[61,6,2],[27,7,3],[41,7,5],[61,7,2],[77,7,4],[27,8,3],[41,8,5],[61,8,2],[77,8,4],[105,8,6],[36,9,3],[41,9,5],[61,9,2],[77,9,4],[105,9,6],[25,10,6],[36,10,3],[41,10,5],[61,10,2],[71,10,1],[77,10,4],[105,10,6],[117,10,2],[123,10,2],[25,11,6],[36,11,3],[41,11,5],[61,11,2],[71,11,1],[77,11,4],[105,11,6],[117,11,2],[123,11,2],[25,12,6],[36,12,3],[41,12,5],[61,12,2],[71,12,1],[77,12,4],[99,12,2],[105,12,6],[117,12,2],[123,12,2],[19,13,2],[25,13,6],[33,13,1],[36,13,3],[41,13,5],[71,13,1],[77,13,4],[99,13,2],[105,13,6],[117,13,2],[123,13,2],[19,14,2],[25,14,6],[33,14,1],[36,14,3],[41,14,5],[51,14,2],[60,14,3],[66,14,3],[71,14,1],[77,14,4],[99,14,2],[105,14,6],[114,14,1],[117,14,2],[123,14,2]]},"overworld61":{"width":213,"clouds":[{"x":19,"y":2,"w":3,"cells":[[19,2,128],[20,2,129],[21,2,130],[19,3,131],[20,3,132],[21,3,133]]},{"x":67,"y":2,"w":3,"cells":[[67,2,128],[68,2,129],[69,2,130],[67,3,131],[68,3,132],[69,3,133]]},{"x":115,"y":2,"w":3,"cells":[[115,2,128],[116,2,129],[117,2,130],[115,3,131],[116,3,132],[117,3,133]]},{"x":163,"y":2,"w":3,"cells":[[163,2,128],[164,2,129],[165,2,130],[163,3,131],[164,3,132],[165,3,133]]},{"x":211,"y":2,"w":3,"cells":[[211,2,128],[212,2,129],[211,3,131],[212,3,132]]},{"x":36,"y":2,"w":4,"cells":[[36,2,128],[37,2,129],[38,2,129],[39,2,130],[36,3,131],[37,3,132],[38,3,132],[39,3,133]]},{"x":84,"y":2,"w":4,"cells":[[84,2,128],[85,2,129],[86,2,129],[87,2,130],[84,3,131],[85,3,132],[86,3,132],[87,3,133]]},{"x":132,"y":2,"w":4,"cells":[[132,2,128],[133,2,129],[134,2,129],[135,2,130],[132,3,131],[133,3,132],[134,3,132],[135,3,133]]},{"x":180,"y":2,"w":4,"cells":[[180,2,128],[181,2,129],[182,2,129],[183,2,130],[180,3,131],[181,3,132],[182,3,132],[183,3,133]]},{"x":8,"y":3,"w":3,"cells":[[8,3,128],[9,3,129],[10,3,130],[8,4,131],[9,4,132],[10,4,133]]},{"x":56,"y":3,"w":3,"cells":[[56,3,128],[57,3,129],[58,3,130],[56,4,131],[57,4,132],[58,4,133]]},{"x":104,"y":3,"w":3,"cells":[[104,3,128],[105,3,129],[106,3,130],[104,4,131],[105,4,132],[106,4,133]]},{"x":152,"y":3,"w":3,"cells":[[152,3,128],[153,3,129],[154,3,130],[152,4,131],[153,4,132],[154,4,133]]},{"x":200,"y":3,"w":3,"cells":[[200,3,128],[201,3,129],[202,3,130],[200,4,131],[201,4,132],[202,4,133]]},{"x":27,"y":3,"w":5,"cells":[[27,3,128],[28,3,129],[29,3,129],[30,3,129],[31,3,130],[27,4,131],[28,4,132],[29,4,132],[30,4,132],[31,4,133]]},{"x":75,"y":3,"w":5,"cells":[[75,3,128],[76,3,129],[77,3,129],[78,3,129],[79,3,130],[75,4,131],[76,4,132],[77,4,132],[78,4,132],[79,4,133]]},{"x":123,"y":3,"w":5,"cells":[[123,3,128],[124,3,129],[125,3,129],[126,3,129],[127,3,130],[123,4,131],[124,4,132],[125,4,132],[126,4,132],[127,4,133]]},{"x":171,"y":3,"w":5,"cells":[[171,3,128],[172,3,129],[173,3,129],[174,3,129],[175,3,130],[171,4,131],[172,4,132],[173,4,132],[174,4,132],[175,4,133]]}],"trees":[],"fences":[],"mushrooms":[],"hillCells":[[50,10,7],[98,10,7],[17,11,7],[49,11,5],[50,11,6],[51,11,8],[65,11,7],[97,11,5],[98,11,6],[99,11,8],[113,11,7],[161,11,7],[209,11,7],[16,12,5],[17,12,6],[18,12,8],[48,12,5],[49,12,6],[50,12,10],[51,12,9],[52,12,8],[64,12,5],[65,12,6],[66,12,8],[96,12,5],[97,12,6],[98,12,10],[99,12,9],[100,12,8],[112,12,5],[113,12,6],[114,12,8],[160,12,5],[161,12,6],[162,12,8],[208,12,5],[209,12,6],[210,12,8]],"bushCells":[[11,12,2],[12,12,3],[13,12,3],[14,12,3],[15,12,4],[23,12,2],[24,12,3],[25,12,4],[41,12,2],[42,12,3],[43,12,3],[44,12,4],[59,12,2],[60,12,3],[61,12,3],[62,12,3],[63,12,4],[90,12,3],[91,12,3],[92,12,4],[107,12,2],[108,12,3],[109,12,3],[110,12,3],[111,12,4],[119,12,2],[120,12,3],[121,12,4],[137,12,2],[138,12,3],[139,12,3],[140,12,4],[155,12,2],[156,12,3],[157,12,3],[158,12,3],[159,12,4],[167,12,2],[168,12,3],[185,12,2],[187,12,3],[188,12,4],[203,12,2],[204,12,3],[205,12,3],[206,12,3],[207,12,4]],"trunkRuns":[]},"overworld62":{"width":241,"clouds":[{"x":19,"y":2,"w":3,"cells":[[19,2,128],[20,2,129],[21,2,130],[19,3,131],[20,3,132],[21,3,133]]},{"x":67,"y":2,"w":3,"cells":[[67,2,128],[68,2,129],[69,2,130],[67,3,131],[68,3,132],[69,3,133]]},{"x":115,"y":2,"w":3,"cells":[[115,2,128],[116,2,129],[117,2,130],[115,3,131],[116,3,132],[117,3,133]]},{"x":163,"y":2,"w":3,"cells":[[163,2,128],[164,2,129],[165,2,130],[163,3,131],[164,3,132],[165,3,133]]},{"x":211,"y":2,"w":3,"cells":[[211,2,128],[212,2,129],[213,2,130],[211,3,131],[212,3,132],[213,3,133]]},{"x":36,"y":2,"w":4,"cells":[[36,2,128],[37,2,129],[38,2,129],[39,2,130],[36,3,131],[37,3,132],[38,3,132],[39,3,133]]},{"x":84,"y":2,"w":4,"cells":[[84,2,128],[85,2,129],[86,2,129],[87,2,130],[84,3,131],[85,3,132],[86,3,132],[87,3,133]]},{"x":132,"y":2,"w":4,"cells":[[132,2,128],[133,2,129],[134,2,129],[135,2,130],[132,3,131],[133,3,132],[134,3,132],[135,3,133]]},{"x":180,"y":2,"w":4,"cells":[[180,2,128],[181,2,129],[182,2,129],[183,2,130],[180,3,131],[181,3,132],[182,3,132],[183,3,133]]},{"x":228,"y":2,"w":4,"cells":[[228,2,128],[229,2,129],[230,2,129],[231,2,130],[228,3,131],[229,3,132],[230,3,132],[231,3,133]]},{"x":8,"y":3,"w":3,"cells":[[8,3,128],[9,3,129],[10,3,130],[8,4,131],[9,4,132],[10,4,133]]},{"x":56,"y":3,"w":3,"cells":[[56,3,128],[57,3,129],[58,3,130],[56,4,131],[57,4,132],[58,4,133]]},{"x":104,"y":3,"w":3,"cells":[[104,3,128],[105,3,129],[106,3,130],[104,4,131],[105,4,132],[106,4,133]]},{"x":152,"y":3,"w":3,"cells":[[152,3,128],[153,3,129],[154,3,130],[152,4,131],[153,4,132],[154,4,133]]},{"x":200,"y":3,"w":3,"cells":[[200,3,128],[201,3,129],[202,3,130],[200,4,131],[201,4,132],[202,4,133]]},{"x":27,"y":3,"w":5,"cells":[[27,3,128],[28,3,129],[29,3,129],[30,3,129],[31,3,130],[27,4,131],[28,4,132],[29,4,132],[30,4,132],[31,4,133]]},{"x":75,"y":3,"w":5,"cells":[[75,3,128],[76,3,129],[77,3,129],[78,3,129],[79,3,130],[75,4,131],[76,4,132],[77,4,132],[78,4,132],[79,4,133]]},{"x":123,"y":3,"w":5,"cells":[[123,3,128],[124,3,129],[125,3,129],[126,3,129],[127,3,130],[123,4,131],[124,4,132],[125,4,132],[126,4,132],[127,4,133]]},{"x":171,"y":3,"w":5,"cells":[[171,3,128],[172,3,129],[173,3,129],[174,3,129],[175,3,130],[171,4,131],[172,4,132],[173,4,132],[174,4,132],[175,4,133]]},{"x":219,"y":3,"w":5,"cells":[[219,3,128],[220,3,129],[221,3,129],[222,3,129],[223,3,130],[219,4,131],[220,4,132],[221,4,132],[222,4,132],[223,4,133]]}],"trees":[],"fences":[],"mushrooms":[],"hillCells":[[50,10,7],[98,10,7],[146,10,7],[194,10,7],[17,11,7],[49,11,5],[50,11,6],[51,11,8],[65,11,7],[97,11,5],[98,11,6],[99,11,8],[113,11,7],[145,11,5],[146,11,6],[147,11,8],[161,11,7],[193,11,5],[194,11,6],[195,11,8],[209,11,7],[16,12,5],[17,12,6],[18,12,8],[48,12,5],[49,12,6],[50,12,10],[51,12,9],[52,12,8],[64,12,5],[65,12,6],[66,12,8],[96,12,5],[97,12,6],[98,12,10],[99,12,9],[100,12,8],[112,12,5],[113,12,6],[114,12,8],[144,12,5],[145,12,6],[146,12,10],[147,12,9],[148,12,8],[160,12,5],[161,12,6],[162,12,8],[192,12,5],[193,12,6],[194,12,10],[195,12,9],[196,12,8],[208,12,5],[209,12,6],[210,12,8],[240,12,5]],"bushCells":[[11,12,2],[12,12,3],[13,12,3],[14,12,3],[15,12,4],[23,12,2],[24,12,3],[25,12,4],[41,12,2],[42,12,3],[43,12,3],[44,12,4],[59,12,2],[60,12,3],[61,12,3],[62,12,3],[63,12,4],[71,12,2],[72,12,3],[73,12,4],[89,12,2],[90,12,3],[91,12,3],[92,12,4],[107,12,2],[108,12,3],[109,12,3],[110,12,3],[111,12,4],[119,12,2],[120,12,3],[121,12,4],[137,12,2],[138,12,3],[139,12,3],[140,12,4],[155,12,2],[158,12,3],[159,12,4],[167,12,2],[168,12,3],[169,12,4],[185,12,2],[186,12,3],[187,12,3],[188,12,4],[215,12,2],[217,12,4],[233,12,2],[234,12,3],[235,12,3],[236,12,4]],"trunkRuns":[]},"treetops63":{"width":193,"clouds":[{"x":18,"y":2,"w":4,"cells":[[18,2,128],[19,2,129],[20,2,129],[21,2,130],[18,3,131],[19,3,132],[20,3,132],[21,3,133]]},{"x":66,"y":2,"w":4,"cells":[[66,2,128],[67,2,129],[68,2,129],[69,2,130],[66,3,131],[67,3,132],[68,3,132],[69,3,133]]},{"x":114,"y":2,"w":4,"cells":[[114,2,128],[115,2,129],[116,2,129],[117,2,130],[114,3,131],[115,3,132],[116,3,132],[117,3,133]]},{"x":3,"y":3,"w":4,"cells":[[3,3,128],[4,3,129],[5,3,129],[6,3,130],[3,4,131],[4,4,132],[5,4,132],[6,4,133]]},{"x":51,"y":3,"w":4,"cells":[[51,3,128],[52,3,129],[53,3,129],[54,3,130],[51,4,131],[52,4,132],[53,4,132],[54,4,133]]},{"x":99,"y":3,"w":4,"cells":[[99,3,128],[100,3,129],[101,3,129],[102,3,130],[99,4,131],[100,4,132],[101,4,132],[102,4,133]]},{"x":147,"y":3,"w":4,"cells":[[147,3,128],[148,3,129],[149,3,129],[150,3,130],[147,4,131],[148,4,132],[149,4,132],[150,4,133]]},{"x":38,"y":6,"w":3,"cells":[[38,6,128],[39,6,129],[40,6,130],[38,7,131],[39,7,132],[40,7,133]]},{"x":86,"y":6,"w":3,"cells":[[87,6,129],[88,6,130],[87,7,132],[88,7,133]]},{"x":134,"y":6,"w":3,"cells":[[134,6,128],[135,6,129],[136,6,130],[134,7,131],[135,7,132],[136,7,133]]},{"x":9,"y":7,"w":3,"cells":[[9,7,128],[10,7,129],[11,7,130],[9,8,131],[10,8,132],[11,8,133]]},{"x":57,"y":7,"w":3,"cells":[[57,7,128],[58,7,129],[59,7,130],[57,8,131],[58,8,132],[59,8,133]]},{"x":105,"y":7,"w":3,"cells":[[105,7,128],[106,7,129],[107,7,130],[105,8,131],[106,8,132],[107,8,133]]},{"x":153,"y":7,"w":3,"cells":[[153,7,128],[154,7,129],[155,7,130],[153,8,131],[154,8,132],[155,8,133]]},{"x":35,"y":7,"w":3,"cells":[[35,7,128],[36,7,129],[37,7,130],[35,8,131],[36,8,132],[37,8,133]]},{"x":83,"y":7,"w":3,"cells":[[83,7,128],[84,7,129],[85,7,130],[83,8,131],[84,8,132],[85,8,133]]},{"x":131,"y":7,"w":3,"cells":[[131,7,128],[132,7,129],[131,8,131],[132,8,132]]},{"x":28,"y":11,"w":3,"cells":[[28,11,128],[29,11,129],[30,11,130],[28,12,131],[29,12,132],[30,12,133]]},{"x":76,"y":11,"w":3,"cells":[[76,11,128],[77,11,129],[78,11,130],[76,12,131],[77,12,132],[78,12,133]]},{"x":124,"y":11,"w":3,"cells":[[124,11,128],[125,11,129],[126,11,130],[124,12,131],[125,12,132],[126,12,133]]},{"x":46,"y":11,"w":3,"cells":[[46,11,128],[47,11,129],[48,11,130],[46,12,131],[47,12,132],[48,12,133]]},{"x":94,"y":11,"w":3,"cells":[[94,11,128],[95,11,129],[96,11,130],[94,12,131],[95,12,132],[96,12,133]]},{"x":142,"y":11,"w":3,"cells":[[142,11,128],[143,11,129],[144,11,130],[142,12,131],[143,12,132],[144,12,133]]}],"trees":[],"fences":[],"mushrooms":[],"hillCells":[],"bushCells":[],"trunkRuns":[[86,4,1],[86,5,1],[86,6,1],[133,6,1],[157,6,1],[86,7,1],[133,7,1],[157,7,1],[86,8,1],[133,8,1],[157,8,1],[86,9,1],[91,9,1],[133,9,1],[157,9,1],[22,10,1],[32,10,2],[66,10,3],[91,10,1],[108,10,3],[133,10,1],[136,10,2],[157,10,1],[22,11,1],[32,11,2],[66,11,3],[86,11,3],[91,11,1],[108,11,3],[133,11,1],[136,11,2],[157,11,1],[22,12,1],[32,12,2],[50,12,2],[66,12,3],[86,12,3],[91,12,1],[108,12,3],[133,12,1],[136,12,2],[157,12,1],[22,13,1],[32,13,2],[50,13,2],[66,13,3],[86,13,3],[91,13,1],[108,13,3],[136,13,2],[157,13,1],[19,14,1],[22,14,1],[25,14,1],[32,14,2],[38,14,1],[44,14,1],[50,14,2],[66,14,3],[86,14,3],[91,14,1],[94,14,1],[98,14,2],[104,14,1],[108,14,3],[114,14,3],[124,14,1],[133,14,2],[136,14,2],[157,14,1]]}};
  function tiles(index,x,y,w,h,size=.85){
    // Square photographic cells retain round, visibly separate noodle strands
    // when the enclosing silhouette is wider or thinner than the photograph.
    const left=Math.floor(x/size)*size,top=Math.floor(y/size)*size;
    const im=materials?.[index];
    if(im&&typeof DOMMatrix!=='undefined'){
      const key=index+':'+size;let cached=tilePatterns.get(key);
      if(!cached||cached.image!==im){
        const pattern=ctx.createPattern(im,'repeat');
        if(pattern){cached={image:im,pattern,matrix:new DOMMatrix([size/im.width,0,0,size/im.height,0,0])};tilePatterns.set(key,cached);}
      }
      if(cached){cached.pattern.setTransform(cached.matrix);ctx.save();ctx.fillStyle=cached.pattern;ctx.fillRect(left,top,Math.ceil((x+w-left)/size)*size,Math.ceil((y+h-top)/size)*size);ctx.restore();return;}
    }
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
  function shadedShape(mat,shape,x,y,w,h,size=.75){
    shapedPhoto(mat,shape,x,y,w,h,size);
    ctx.save();shape();ctx.clip();
    const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fff6dc28');g.addColorStop(.4,'#ffffff00');g.addColorStop(1,'#0d100c66');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore();
  }
  function clipCells(cells){ctx.beginPath();for(const[x,y]of cells)ctx.rect(x,y,1,1);ctx.clip();}
  function cloudPath(x,y,w){
    ctx.beginPath();ctx.moveTo(x+.025,y+1.96);ctx.lineTo(x+.025,y+1.15);
    for(let k=0;k<w;k++){
      const xx=x+k;ctx.bezierCurveTo(xx-.02,y+.42,xx+.22,y+.04,xx+.5,y+.15);ctx.bezierCurveTo(xx+.78,y+.01,xx+1.04,y+.48,xx+.985,y+1.18);
    }
    ctx.lineTo(x+w-.025,y+1.96);ctx.closePath();
  }
  function drawCloud(c,gray=false){
    const{x,y,w}=c;ctx.save();clipCells(c.cells);shadedShape(gray?24:5,()=>cloudPath(x,y,w),x,y,w,2,.9);
    for(let k=0;k<w*2;k++)coil(x+.25+k*.5,y+1.45,.22,.2,gray?'stone':'pale',.034,1.12);
    for(const dx of[-.16,.16])photoShape(9,()=>{ctx.beginPath();ctx.ellipse(x+w*.5+dx,y+.94,.044,.115,0,0,TAU);},x+w*.5+dx-.05,y+.81,.1,.26);
    photoStrand([[x+.08,y+1.82],[x+w*.5,y+1.85],[x+w-.08,y+1.82]],.031,gray?'red':'pale',gray?6:5,.8);
    if(gray)for(let k=0;k<w*2;k++)photoStrand([[x+.08+k*.48,y+1.67],[x+.23+k*.48,y+1.75],[x+.38+k*.48,y+1.67]],.034,'red',6,.88);ctx.restore();
  }
  function drawHill(peak,cells){
    const[x,y]=peak,h=13-y,w=h*2-1,left=x-(h-1),right=left+w,cx=x+.5;
    ctx.save();clipCells(cells.filter(c=>c[0]>=left&&c[0]<right));
    const shape=()=>{ctx.beginPath();ctx.moveTo(left,13);ctx.lineTo(x,y+1);ctx.quadraticCurveTo(x,y+.16,cx,y+.12);ctx.quadraticCurveTo(x+1,y+.16,x+1,y+1);ctx.lineTo(right,13);ctx.closePath();};
    shadedShape(3,shape,left,y,w,h,.85);ctx.save();shape();ctx.clip();
    for(let k=0;k<7;k++){const f=k/6,px=left+.16+f*(w-.32),top=y+.2+Math.abs(f-.5)*h*1.5;photoStrand([[px,12.96],[px+(cx-px)*.17,(top+13)*.5],[cx+(px-cx)*.34,top]],.035,'green',3,.8);}
    ctx.restore();ctx.restore();
  }
  function drawBush(cells){
    const first=cells[0],last=cells.at(-1),left=first[0]-(first[2]===2?0:1),right=last[0]+1,w=right-left;
    ctx.save();clipCells(cells);
    const shape=()=>{ctx.beginPath();ctx.moveTo(left,13);ctx.quadraticCurveTo(left+.01,12.34,left+.45,12.25);for(let x=left+.45;x<right-.45;x+=.55)ctx.quadraticCurveTo(x+.22,11.98,Math.min(right-.45,x+.55),12.25);ctx.quadraticCurveTo(right-.01,12.34,right,13);ctx.closePath();};
    shapedPhoto(3,shape,left,12,w,1,.65);for(let x=left+.22;x<right;x+=.38)coil(x,12.71,.17,.18,'green',.03,1.13);ctx.restore();
  }

  for(const data of Object.values(SCENERY)){
    data.bushGroups=[];
    for(const cell of data.bushCells){const group=data.bushGroups.at(-1);if(!group||cell[0]!==group.at(-1)[0]+1)data.bushGroups.push([cell]);else group.push(cell);}
  }
  function drawScenery({area,camera=0,viewWidth=20}={}){
    const data=SCENERY[area];if(!data)return false;
    for(const c of data.clouds)if(c.x+c.w>camera-.1&&c.x<camera+viewWidth+.1)drawCloud(c,area==='treetops63');
    for(const[x,y,id]of data.hillCells)if(id===7&&x+3>camera&&x-3<camera+viewWidth)drawHill([x,y],data.hillCells);
    for(const cells of data.bushGroups)if(cells.at(-1)[0]+1>camera&&cells[0][0]<camera+viewWidth)drawBush(cells);
    return true;
  }
  function lowerLip(owner,target){
    const now=getTime();let f=flex.get(owner);
    if(!f||now<f.time||now-f.time>1){f={time:now,value:0,velocity:0};flex.set(owner,f);}
    const elapsed=clamp(now-f.time,0,1/24);f.time=now;
    const steps=Math.max(1,Math.ceil(elapsed*120)),dt=elapsed/steps;
    for(let i=0;elapsed>0&&i<steps;i++){f.velocity+=((target-f.value)*110-f.velocity*18)*dt;f.value+=f.velocity*dt;}
    return f.value;
  }
  function crownPath(x,y,w,h,lip){
    ctx.beginPath();ctx.moveTo(x+.16,y+.015);ctx.lineTo(x+w-.16,y+.015);
    ctx.quadraticCurveTo(x+w-.015,y+.015,x+w-.015,y+.2);ctx.lineTo(x+w-.015,y+h-.21);
    ctx.quadraticCurveTo(x+w-.02,y+h+.015,x+w-.24,y+h-.045);
    const count=Math.ceil(w*2);
    for(let j=count-1;j>=0;j--){const f=j/count,xx=x+.2+j*(w-.4)/count,deflect=Math.sin(Math.PI*f)*lip;ctx.quadraticCurveTo(xx+.15,y+h+.06+deflect,xx,y+h-.045+deflect);}
    ctx.quadraticCurveTo(x+.015,y+h-.015,x+.015,y+h-.21);ctx.lineTo(x+.015,y+.2);ctx.quadraticCurveTo(x+.015,y+.015,x+.16,y+.015);ctx.closePath();
  }
  function drawTreetop(t,{area,player}={}){
    if(area!=='treetops53'&&area!=='treetops63')return false;
    if(!t||t.removed)return true;
    const gray=area==='treetops63',data=SCENERY[area],x=t.x,y=t.y,w=t.w,h=t.h??1,
      tw=t.trunkWidth??t.trunkW??Math.max(.8,w-2),tx=t.trunkX??x+(w-tw)/2,
      bottom=t.trunkBottom??15.2,ty=y+h*.55,th=Math.max(.1,bottom-ty),palette=gray?'stone':'green';
    const loaded=!!player&&player.grounded&&Math.abs(player.y+player.h-y)<.11&&player.x+player.w>x&&player.x<x+w;
    const lip=lowerLip(t,loaded?.027:0);
    ctx.save();ctx.beginPath();ctx.rect(tx,ty,tw,th);ctx.clip();
    ctx.beginPath();for(const[xx,yy,ww]of data.trunkRuns)if(xx+ww>tx&&xx<tx+tw&&yy+1>ty&&yy<bottom)ctx.rect(xx,yy,ww,1);ctx.clip();
    tiles(gray?24:1,tx,ty,tw,th,.8);
    const shade=ctx.createLinearGradient(tx,ty,tx+tw,ty);shade.addColorStop(0,gray?'#1c242e66':'#1e160e77');shade.addColorStop(.22,'#fff4d61a');shade.addColorStop(.62,'#00000000');shade.addColorStop(1,'#17191199');ctx.fillStyle=shade;ctx.fillRect(tx,ty,tw,th);
    const count=Math.max(8,Math.ceil(tw/.14));
    for(let k=0;k<count;k++){
      const bx=tx+.05+k*(tw-.1)/(count-1),pts=[],steps=Math.ceil(th*6);
      for(let j=0;j<=steps;j++){const yy=ty+th*j/steps;pts.push([bx+Math.sin(yy*2.6+k*.79)*.026,yy]);}
      // The trunk already carries the full photographic material. Shaded
      // longitudinal noodles add round contours without repeatedly resampling
      // the same photograph inside every narrow strand.
      strand(pts,.045,gray?'stone':'gold',k%5===0?.78:.63);
    }
    ctx.restore();
    const shape=()=>crownPath(x,y,w,h,lip);
    ctx.save();shape();ctx.clip();tiles(gray?24:28,x,y,w,h+lip,.82);
    const light=ctx.createLinearGradient(0,y,0,y+h+.05);light.addColorStop(0,gray?'#f0f8ff3b':'#d1ffae30');light.addColorStop(.35,gray?'#dae5e906':'#a0d46e04');light.addColorStop(1,gray?'#17212a85':'#0b1d0ca6');ctx.fillStyle=light;ctx.fillRect(x,y,w,h+.09);
    for(let k=0;k<Math.ceil(w*4);k++)coil(x+.13+k*.25,y+.48+Math.sin(k*1.7+x)*.13,.15,.2,palette,.041,1.18);
    ctx.restore();
    // The contact edge is fixed. Loading only deforms the exposed cooked
    // curls on the underside, with a damped release when the rider leaves.
    for(let k=0;k<3;k++){
      const pts=[],steps=Math.ceil(w*8);for(let j=0;j<=steps;j++)pts.push([x+.04+(w-.08)*j/steps,y+.05+k*.095+Math.sin(j*.83+k)*.013]);
      strand(pts,.063,palette,.95);
    }
    const curls=Math.ceil(w*2.5);
    for(let k=0;k<curls;k++){
      const f=k/Math.max(1,curls-1),px=x+.14+f*(w-.28),len=.14+hash(k*9+x)*.18,dy=Math.sin(Math.PI*f)*lip;
      strand([[px,y+h-.15],[px+.05,y+h-.025+dy],[px-.025,y+h+len+dy]],.041,palette,.9);
    }
    return true;
  }
  // Reuse the already verified constrained rope and damped board integrator.
  // The palette adapter changes only photographic samples and noodle shading.
  const warmBoards=createWorld3233Art({ctx,material,strand,coil,photoShape,getTime});
  const grayIndex=i=>i===0||i===1||i===27?24:i;
  const grayPalette=p=>p==='gold'||p==='pale'?'stone':p;
  const grayBoards=createWorld3233Art({ctx,
    material:(i,...a)=>material(grayIndex(i),...a),
    strand:(p,w,c,...a)=>strand(p,w,grayPalette(c),...a),
    coil:(x,y,rx,ry,c,...a)=>coil(x,y,rx,ry,grayPalette(c),...a),
    photoShape:(i,...a)=>photoShape(grayIndex(i),...a),getTime,constraintPasses:192,perpendicularSeed:true});
  function drawPlatform(p,{area}={}){
    if(['treetops53','treetops63','castle54'].includes(area)){warmBoards.drawPlatform(p);return true;}
    return false;
  }
  function drawScale(s,{area}={}){if(area!=='treetops63')return false;grayBoards.drawScale(s);return true;}
  function drawRevealedBoss(b){
    if(!b||b.removed||b.active===false||b.y>17||(b.revealedKind||b.revealedEnemy)!=='lakitu'||!(b.revealed||b.dead))return false;
    const w=b.w??2,h=b.h??2;
    drawSprite(22,b.x+w*.22,b.y+h*.22,w*.56,h*.72,{flip:b.facing>0,flipY:!!b.dead,alpha:b.dead?.85:1});
    return true;
  }
  function drawEnemy(){return false;}
  return {drawScenery,drawTreetop,drawPlatform,drawScale,drawRevealedBoss,drawEnemy};
}
