// Pressed sheet-metal surfaces. These helpers only produce geometry; the car's
// existing batches, hinge, collision envelope and materials remain the owners.
import * as THREE from 'three';

const WIDTH_PROFILE = [[.60,.885],[.72,.930],[.94,.964],[1.08,.958],[1.20,.936],[1.27,.906]];
const LENGTH_PROFILE = [[-2.10,-.075],[-1.91,-.022],[-1.56,0],[1.72,0],[2.12,-.052]];

// Monotone cubic interpolation avoids ripples/overshoot between the authored
// sections. Its derivative gives continuous broad-panel normals at each row.
function profile(points){
  if(points.length<2 || points.some((p,i)=>p.length!==2 || !p.every(Number.isFinite) || (i && p[0]<=points[i-1][0])))
    throw new Error('car shell profile must contain ascending finite section pairs');
  const slopes=points.slice(1).map((p,i)=>(p[1]-points[i][1])/(p[0]-points[i][0]));
  const tangents=points.map((_,i)=>{
    if(!i)return slopes[0];
    if(i===points.length-1)return slopes[i-1];
    const a=slopes[i-1],b=slopes[i];
    if(a*b<=0)return 0;
    const h0=points[i][0]-points[i-1][0],h1=points[i+1][0]-points[i][0];
    const w0=2*h1+h0,w1=h1+2*h0;
    return (w0+w1)/(w0/a+w1/b);
  });
  return value=>{
    if(value<=points[0][0])return [points[0][1],0];
    if(value>=points.at(-1)[0])return [points.at(-1)[1],0];
    let i=0;while(value>points[i+1][0])i++;
    const h=points[i+1][0]-points[i][0],t=(value-points[i][0])/h,t2=t*t,t3=t2*t;
    const a=points[i][1],b=points[i+1][1],ma=tangents[i]*h,mb=tangents[i+1]*h;
    return [(2*t3-3*t2+1)*a+(t3-2*t2+t)*ma+(-2*t3+3*t2)*b+(t3-t2)*mb,
      ((6*t2-6*t)*a+(3*t2-4*t+1)*ma+(-6*t2+6*t)*b+(3*t2-2*t)*mb)/h];
  };
}

function sectionCuts(points,offset){
  const cuts=[];
  for(let i=0;i<points.length;i++){
    cuts.push(points[i][0]-offset);
    if(i)cuts.push((points[i-1][0]+points[i][0])*.5-offset);
  }
  return cuts.sort((a,b)=>a-b);
}

function splitPolygon(poly,axis,value){
  const low=[],high=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=a[axis]-value,db=b[axis]-value;
    if(da<=0)low.push(a);
    if(da>=0)high.push(a);
    if((da<0 && db>0)||(da>0 && db<0)){
      const t=da/(da-db),p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      p[axis]=value;low.push(p);high.push(p);
    }
  }
  return [low,high].filter(p=>p.length>=3);
}

function cleanLoop(points){
  const result=[];
  for(const p of points)if(!result.length || p.distanceToSquared(result.at(-1))>1e-16)result.push(p.clone());
  if(result.length>1 && result[0].distanceToSquared(result.at(-1))<1e-16)result.pop();
  return result;
}

function geometryWriter(){
  const positions=[],normals=[],uvs=[];
  const edgeA=new THREE.Vector3(),edgeB=new THREE.Vector3(),face=new THREE.Vector3();
  const triangle=(a,b,c,na,nb,nc,ua,ub,uc)=>{
    edgeA.subVectors(b,a);edgeB.subVectors(c,a);face.crossVectors(edgeA,edgeB);
    if(face.lengthSq()<1e-22)return;
    if(face.dot(na)<0){[b,c]=[c,b];[nb,nc]=[nc,nb];[ub,uc]=[uc,ub];}
    for(const [p,n,uv] of [[a,na,ua],[b,nb,ub],[c,nc,uc]]){
      positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);uvs.push(...uv);
    }
  };
  return {triangle,finish(){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    g.computeBoundingBox();g.computeBoundingSphere();return g;
  }};
}

/**
 * Shape.x is longitudinal Z and Shape.y is height Y. The sampled outline and
 * holes are retained exactly; only X rolls through the supplied metre sections.
 * profileZOffset samples a local hinged-door shape in whole-car coordinates;
 * xOffset then converts the finished surface to that hinge's local X coordinate.
 */
export function curvedSidePanel(contour,{
  side=1,curveSegments=28,thickness=.045,widthProfile=WIDTH_PROFILE,
  longitudinalProfile=LENGTH_PROFILE,profileZOffset=0,xOffset=0,
}={}){
  if((side!==1 && side!==-1)||!Number.isFinite(thickness)||thickness<=0)
    throw new Error('car side panel needs side +/-1 and positive thickness');
  const width=profile(widthProfile),length=longitudinalProfile?profile(longitudinalProfile):()=>[0,0];
  const {shape,holes}=contour.extractPoints(curveSegments);
  const loops=[cleanLoop(shape),...holes.map(cleanLoop)];
  loops.forEach((loop,i)=>{if(THREE.ShapeUtils.isClockWise(loop)!==(i===0))loop.reverse();});
  const indices=THREE.ShapeUtils.triangulateShape(loops[0],loops.slice(1));
  const points=loops.flat(),writer=geometryWriter();
  const cuts=[...sectionCuts(widthProfile,0).map(v=>[1,v]),
    ...(longitudinalProfile?sectionCuts(longitudinalProfile,profileZOffset).map(v=>[0,v]):[])];
  const surface=(p,inner=false)=>{
    const [w,dy]=width(p[1]),[l,dz]=length(p[0]+profileZOffset);
    const position=new THREE.Vector3(xOffset+side*(w+l-(inner?thickness:0)),p[1],p[0]);
    const normal=new THREE.Vector3(side,-dy,-dz).normalize();if(inner)normal.negate();
    return [position,normal,[p[0]+profileZOffset,p[1]]];
  };
  const emitSurface=(tri,inner)=>{
    const [a,b,c]=tri.map(p=>surface(p,inner));
    writer.triangle(a[0],b[0],c[0],a[1],b[1],c[1],a[2],b[2],c[2]);
  };
  for(const ids of indices){
    let polygons=[ids.map(i=>[points[i].x,points[i].y])];
    for(const [axis,value]of cuts)polygons=polygons.flatMap(poly=>{
      const values=poly.map(p=>p[axis]);
      return value>Math.min(...values)+1e-10 && value<Math.max(...values)-1e-10 ? splitPolygon(poly,axis,value):[poly];
    });
    for(const poly of polygons)for(let i=1;i<poly.length-1;i++){
      const tri=[poly[0],poly[i],poly[i+1]];
      emitSurface(tri,false);emitSurface(tri,true);
    }
  }
  // Inner returns follow the exact sampled arch/door outline. They close the
  // panel without laying another cap over an opening or adding a material slot.
  for(const loop of loops){
    let distance=0;
    for(let i=0;i<loop.length;i++){
      const a=loop[i],b=loop[(i+1)%loop.length],dz=b.x-a.x,dy=b.y-a.y;
      const span=Math.hypot(dz,dy),ts=[0,1];
      for(const [axis,value]of cuts){
        const delta=axis===0?dz:dy,start=axis===0?a.x:a.y;
        if(Math.abs(delta)>1e-12){const t=(value-start)/delta;if(t>1e-10 && t<1-1e-10)ts.push(t);}
      }
      ts.sort((x,y)=>x-y);
      const normal=new THREE.Vector3(0,dz,-dy).normalize();
      for(let j=0;j<ts.length-1;j++){
        const t0=ts[j],t1=ts[j+1];if(t1-t0<1e-10)continue;
        const p=[a.x+dz*t0,a.y+dy*t0],q=[a.x+dz*t1,a.y+dy*t1];
        const outA=surface(p)[0],outB=surface(q)[0],inA=surface(p,true)[0],inB=surface(q,true)[0];
        const u0=distance+span*t0,u1=distance+span*t1;
        writer.triangle(outA,inA,inB,normal,normal,normal,[u0,0],[u0,thickness],[u1,thickness]);
        writer.triangle(outA,inB,outB,normal,normal,normal,[u0,0],[u1,thickness],[u1,0]);
      }
      distance+=span;
    }
  }
  return writer.finish();
}

/** A closed chamfered rectangular pressing between two car-space endpoints. */
export function pressedFrame(a,b,{width=.06,depth=.035,bevel=.006,normal=[1,0,0],capStart=true,capEnd=true}={}){
  const start=a.isVector3?a.clone():new THREE.Vector3(...a),end=b.isVector3?b.clone():new THREE.Vector3(...b);
  const axis=end.clone().sub(start),length=axis.length();
  if(!Number.isFinite(length)||length<1e-7||!Number.isFinite(width)||!Number.isFinite(depth)||width<=0||depth<=0)
    throw new Error('car frame needs distinct finite endpoints and positive width/depth');
  axis.multiplyScalar(1/length);
  const outward=normal.isVector3?normal.clone():new THREE.Vector3(...normal);
  outward.addScaledVector(axis,-outward.dot(axis));
  if(outward.lengthSq()<1e-10){outward.set(Math.abs(axis.x)<.8?1:0,Math.abs(axis.x)<.8?0:1,0);outward.addScaledVector(axis,-outward.dot(axis));}
  outward.normalize();const across=new THREE.Vector3().crossVectors(outward,axis).normalize();
  const w=width*.5,d=depth*.5,r=Math.max(0,Math.min(bevel,w*.8,d*.8));
  const section=r>0?[[w-r,d],[-w+r,d],[-w,d-r],[-w,-d+r],[-w+r,-d],[w-r,-d],[w,-d+r],[w,d-r]]:
    [[w,d],[-w,d],[-w,-d],[w,-d]];
  const point=(p,origin)=>origin.clone().addScaledVector(across,p[0]).addScaledVector(outward,p[1]);
  const writer=geometryWriter();let perimeter=0;
  for(let i=0;i<section.length;i++){
    const p=section[i],q=section[(i+1)%section.length],du=q[0]-p[0],dv=q[1]-p[1],span=Math.hypot(du,dv);
    const n=across.clone().multiplyScalar(dv).addScaledVector(outward,-du).normalize();
    const sa=point(p,start),sb=point(q,start),ea=point(p,end),eb=point(q,end);
    writer.triangle(sa,sb,eb,n,n,n,[perimeter,0],[perimeter+span,0],[perimeter+span,length]);
    writer.triangle(sa,eb,ea,n,n,n,[perimeter,0],[perimeter+span,length],[perimeter,length]);
    perimeter+=span;
  }
  for(const [enabled,origin,sign]of [[capStart,start,-1],[capEnd,end,1]])if(enabled){
    const n=axis.clone().multiplyScalar(sign);
    for(let i=1;i<section.length-1;i++)writer.triangle(point(section[0],origin),point(section[i],origin),point(section[i+1],origin),n,n,n,section[0],section[i],section[i+1]);
  }
  return writer.finish();
}
