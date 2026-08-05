(function(global){
  'use strict';

  const TAU = Math.PI * 2;
  const EPS = 1e-6;
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const invLerp = (a,b,v)=>a===b?0:(v-a)/(b-a);
  const smoothstep = (a,b,v)=>{ const t=clamp(invLerp(a,b,v),0,1); return t*t*(3-2*t); };
  const approach = (v,target,delta)=>v<target?Math.min(v+delta,target):Math.max(v-delta,target);
  const remap = (v,a,b,c,d)=>lerp(c,d,clamp(invLerp(a,b,v),0,1));
  const hypot = Math.hypot;
  const dist2 = (ax,ay,bx,by)=>{const x=bx-ax,y=by-ay;return x*x+y*y;};
  const dist = (ax,ay,bx,by)=>Math.sqrt(dist2(ax,ay,bx,by));
  const norm = (x,y)=>{const m=Math.hypot(x,y);return m<EPS?{x:0,y:0,m:0}:{x:x/m,y:y/m,m};};
  const dot = (ax,ay,bx,by)=>ax*bx+ay*by;
  const cross = (ax,ay,bx,by)=>ax*by-ay*bx;
  const angleWrap = a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a;};
  const angleDiff = (a,b)=>angleWrap(b-a);
  const lerpAngle = (a,b,t)=>a+angleDiff(a,b)*t;
  const rotate = (x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
  const pointInRect = (x,y,r)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
  const circleRect = (cx,cy,cr,r)=>{
    const nx=clamp(cx,r.x,r.x+r.w), ny=clamp(cy,r.y,r.y+r.h);
    const dx=cx-nx,dy=cy-ny; return dx*dx+dy*dy<cr*cr;
  };
  const circleCircle = (ax,ay,ar,bx,by,br)=>dist2(ax,ay,bx,by)<(ar+br)*(ar+br);
  const segmentCircle = (ax,ay,bx,by,cx,cy,r)=>{
    const abx=bx-ax,aby=by-ay, denom=abx*abx+aby*aby||1;
    const t=clamp(((cx-ax)*abx+(cy-ay)*aby)/denom,0,1);
    const px=ax+abx*t,py=ay+aby*t; return dist2(px,py,cx,cy)<=r*r;
  };
  const lineIntersectsRect = (x1,y1,x2,y2,r)=>{
    if(pointInRect(x1,y1,r)||pointInRect(x2,y2,r))return true;
    const edges=[[r.x,r.y,r.x+r.w,r.y],[r.x+r.w,r.y,r.x+r.w,r.y+r.h],[r.x+r.w,r.y+r.h,r.x,r.y+r.h],[r.x,r.y+r.h,r.x,r.y]];
    for(const e of edges){ if(segmentsIntersect(x1,y1,x2,y2,...e)) return true; }
    return false;
  };
  const segmentsIntersect=(ax,ay,bx,by,cx,cy,dx,dy)=>{
    const r1x=bx-ax,r1y=by-ay,r2x=dx-cx,r2y=dy-cy;
    const den=cross(r1x,r1y,r2x,r2y); if(Math.abs(den)<EPS)return false;
    const t=cross(cx-ax,cy-ay,r2x,r2y)/den;
    const u=cross(cx-ax,cy-ay,r1x,r1y)/den;
    return t>=0&&t<=1&&u>=0&&u<=1;
  };

  function resolveCircleRect(entity,rect){
    if(!circleRect(entity.x,entity.y,entity.r,rect))return false;
    const nx=clamp(entity.x,rect.x,rect.x+rect.w),ny=clamp(entity.y,rect.y,rect.y+rect.h);
    let dx=entity.x-nx,dy=entity.y-ny;
    if(Math.abs(dx)<EPS&&Math.abs(dy)<EPS){
      const left=Math.abs(entity.x-rect.x),right=Math.abs(rect.x+rect.w-entity.x),top=Math.abs(entity.y-rect.y),bottom=Math.abs(rect.y+rect.h-entity.y);
      const m=Math.min(left,right,top,bottom);
      if(m===left){dx=-1;dy=0;}else if(m===right){dx=1;dy=0;}else if(m===top){dx=0;dy=-1;}else{dx=0;dy=1;}
    }
    const n=norm(dx,dy); const push=entity.r-n.m+0.01;
    entity.x+=n.x*push; entity.y+=n.y*push;
    if(entity.vx!==undefined){ const vn=dot(entity.vx,entity.vy,n.x,n.y); if(vn<0){entity.vx-=vn*n.x;entity.vy-=vn*n.y;} }
    return true;
  }

  function hashString(str){
    let h=2166136261>>>0;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function mulberry32(seed){
    let a=seed>>>0;
    return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
  }
  function seeded(seed){
    const r=mulberry32(typeof seed==='string'?hashString(seed):seed||1);
    return {float:r,range:(a,b)=>a+(b-a)*r(),int:(a,b)=>Math.floor(a+r()*(b-a+1)),pick:a=>a[Math.floor(r()*a.length)],sign:()=>r()<.5?-1:1};
  }

  class Pool{
    constructor(factory,reset,initial=0){this.factory=factory;this.reset=reset;this.free=[];this.live=[];for(let i=0;i<initial;i++)this.free.push(factory());}
    acquire(data){const o=this.free.pop()||this.factory();this.reset(o,data);o.active=true;this.live.push(o);return o;}
    release(o){if(!o||!o.active)return;o.active=false;const i=this.live.indexOf(o);if(i>=0)this.live.splice(i,1);this.free.push(o);}
    sweep(predicate){for(let i=this.live.length-1;i>=0;i--){const o=this.live[i];if(predicate(o)){this.live.splice(i,1);o.active=false;this.free.push(o);}}}
    clear(){for(const o of this.live){o.active=false;this.free.push(o);}this.live.length=0;}
  }

  class RingBuffer{
    constructor(capacity){this.capacity=capacity;this.items=new Array(capacity);this.start=0;this.length=0;}
    push(value){const idx=(this.start+this.length)%this.capacity;this.items[idx]=value;if(this.length<this.capacity)this.length++;else this.start=(this.start+1)%this.capacity;}
    get(i){if(i<0||i>=this.length)return undefined;return this.items[(this.start+i)%this.capacity];}
    clear(){this.start=0;this.length=0;}
    toArray(){const a=[];for(let i=0;i<this.length;i++)a.push(this.get(i));return a;}
    findTime(time,key='time'){
      if(!this.length)return null;
      let prev=this.get(0),next=prev;
      for(let i=1;i<this.length;i++){next=this.get(i);if(next[key]>=time){const t=clamp(invLerp(prev[key],next[key],time),0,1);return {prev,next,t};}prev=next;}
      return {prev:next,next,t:1};
    }
  }

  const Store={
    get(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}},
    set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}},
    remove(key){try{localStorage.removeItem(key);}catch{}}
  };

  const ISO_X=.70710678;
  const ISO_Y=.35355339;
  function isoProject(x,y,z,camera,view){
    const zoom=camera.zoom||1;
    return {
      x:view.w*.5+((x-y)-(camera.x-camera.y))*ISO_X*zoom+camera.shakeX,
      y:view.h*.5+((x+y)-(camera.x+camera.y))*ISO_Y*zoom-(z-camera.z)*zoom+camera.shakeY
    };
  }
  function isoUnproject(sx,sy,z,camera,view){
    const zoom=camera.zoom||1;
    const dx=(sx-view.w*.5-camera.shakeX)/(ISO_X*zoom)+(camera.x-camera.y);
    const dy=(sy-view.h*.5-camera.shakeY+(z-camera.z)*zoom)/(ISO_Y*zoom)+(camera.x+camera.y);
    return {x:(dx+dy)*.5,y:(dy-dx)*.5};
  }

  function polygonContains(point,poly){
    let c=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[i],b=poly[j];
      if(((a.y>point.y)!==(b.y>point.y))&&(point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x))c=!c;
    }
    return c;
  }

  function formatTime(seconds){
    seconds=Math.max(0,seconds|0);const m=(seconds/60)|0,s=seconds%60;return `${m}:${String(s).padStart(2,'0')}`;
  }

  global.PotCore={TAU,EPS,clamp,lerp,invLerp,smoothstep,approach,remap,hypot,dist2,dist,norm,dot,cross,angleWrap,angleDiff,lerpAngle,rotate,pointInRect,circleRect,circleCircle,segmentCircle,lineIntersectsRect,segmentsIntersect,resolveCircleRect,hashString,mulberry32,seeded,Pool,RingBuffer,Store,ISO_X,ISO_Y,isoProject,isoUnproject,polygonContains,formatTime};
})(window);
