// Small position-based strands for the visible loose pasta. Rest-length and
// bending constraints are solved at a fixed rate; no whole-body softness claim.
export class PastaStrand {
  constructor(points,{iterations=8,radius=.02}={}){
    this.points=points.map(p=>({x:p.x??p[0],y:p.y??p[1],z:p.z??p[2]}));
    this.previous=this.points.map(p=>({...p}));this.rest=this.points.slice(1).map((p,i)=>Math.hypot(p.x-this.points[i].x,p.y-this.points[i].y,p.z-this.points[i].z));
    this.radius=radius;this.iterations=iterations;this.accumulator=0;this.steps=0;this.contactCount=0;
  }
  reset(points){for(let i=0;i<this.points.length;i++){const p=points?.[i]||this.points[i];Object.assign(this.points[i],{x:p.x??p[0],y:p.y??p[1],z:p.z??p[2]});Object.assign(this.previous[i],this.points[i]);}this.accumulator=0;}
  update(dt,{anchor=this.points[0],acceleration={},gravity=9.81,softness=.55,submerged=0,floor=-Infinity,colliders=[]}={}){
    if(!Number.isFinite(dt)||dt<=0)return this.points;
    const step=1/120,wet=Math.max(0,Math.min(1,submerged)),soft=Math.max(0,Math.min(1,softness));
    this.accumulator+=Math.min(.1,dt);
    while(this.accumulator>=step){this.accumulator-=step;this.steps++;const drag=Math.exp(-(1.8+wet*11+soft*1.4)*step);
      Object.assign(this.points[0],anchor);Object.assign(this.previous[0],anchor);
      for(let i=1;i<this.points.length;i++){const p=this.points[i],old={...p},prev=this.previous[i];
        p.x+=(p.x-prev.x)*drag-(acceleration.x||0)*step*step;
        p.y+=(p.y-prev.y)*drag-(gravity*(1-wet*.94)+(acceleration.y||0))*step*step;
        p.z+=(p.z-prev.z)*drag-(acceleration.z||0)*step*step;Object.assign(prev,old);
      }
      for(let k=0;k<this.iterations;k++){
        // A weak curvature energy keeps al-dente strands straighter while
        // allowing a cooked strand to drape under its own weight.
        const bend=(1-soft)*.055;
        if(bend)for(let i=1;i<this.points.length-1;i++){const a=this.points[i-1],b=this.points[i],c=this.points[i+1];b.x+=((a.x+c.x)*.5-b.x)*bend;b.y+=((a.y+c.y)*.5-b.y)*bend;b.z+=((a.z+c.z)*.5-b.z)*bend;}
        for(let i=1;i<this.points.length;i++){const a=this.points[i-1],b=this.points[i],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz)||1e-9,c=(len-this.rest[i-1])/len,w=i===1?1:.5;b.x-=dx*c*w;b.y-=dy*c*w;b.z-=dz*c*w;if(i>1){a.x+=dx*c*.5;a.y+=dy*c*.5;a.z+=dz*c*.5;}}
        for(let i=1;i<this.points.length;i++){const p=this.points[i];if(p.y<floor+this.radius){p.y=floor+this.radius;this.previous[i].x=p.x+(this.previous[i].x-p.x)*.75;this.previous[i].z=p.z+(this.previous[i].z-p.z)*.75;this.contactCount++;}
          for(const collider of colliders){const a=collider.a||collider.center,b=collider.b||a;if(!a||!b)continue;const abx=b.x-a.x,aby=b.y-a.y,abz=b.z-a.z,l2=abx*abx+aby*aby+abz*abz,t=Math.max(0,Math.min(1,l2?((p.x-a.x)*abx+(p.y-a.y)*aby+(p.z-a.z)*abz)/l2:0)),x=a.x+abx*t,y=a.y+aby*t,z=a.z+abz*t,dx=p.x-x,dy=p.y-y,dz=p.z-z,d=Math.hypot(dx,dy,dz),radius=(collider.radius||0)+this.radius;if(d<radius&&d>1e-8){p.x=x+dx/d*radius;p.y=y+dy/d*radius;p.z=z+dz/d*radius;this.contactCount++;}}
        }
        Object.assign(this.points[0],anchor);
      }
    }
    return this.points;
  }
  get maximumStretch(){return this.rest.reduce((max,rest,i)=>{const a=this.points[i],b=this.points[i+1];return Math.max(max,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)/rest);},1);}
}
