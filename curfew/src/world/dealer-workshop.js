// A roadside armory opened out of a substantial workshop trailer.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function buildWorkshop(material,lampMaterial){
  const solid=[],glow=[],colliders=[];
  const steel=[.069,.082,.078],edge=[.14,.15,.13],wood=[.12,.076,.041],rubber=[.017,.021,.019],tarp=[.048,.072,.057];
  const part=(g,c,x,y,z,rx=0,ry=0,rz=0,arr=solid)=>{
    g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);
    const p=g.attributes.position,a=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){
      const grain=.95+.05*Math.sin(p.getX(i)*41+p.getY(i)*63+p.getZ(i)*39);
      a.set(c.map(v=>v*grain),i*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(a,3));solid===arr?solid.push(g):arr.push(g);
  };
  const box=(x,y,z,w,h,d,c=steel,ry=0)=>part(new THREE.BoxGeometry(w,h,d),c,x,y,z,0,ry);
  const cyl=(x,y,z,r,h,c=steel,rx=0,rz=0)=>part(new THREE.CylinderGeometry(r,r,h,16),c,x,y,z,rx,0,rz);
  const barrier=(x,z,hx,hz,y0,y1,tag='metal',standable=false)=>colliders.push({x,z,hx,hz,y0,y1,tag,standable});
  // Steel chassis, deep rear workshop and a low walk-in working deck.
  box(0,.04,-.30,8.2,.28,6.6,steel);barrier(0,-.30,4.1,3.3,-.20,.18,'metal',true);
  for(let i=0;i<28;i++)box(-3.95+i*.293,.17,-.30,.28,.025,6.4,wood);
  for(const x of [-3.85,3.85])for(const z of [-3.3,-1.4,.65,2.65])cyl(x,-.13,z,.065,.68,edge);
  for(let i=0;i<3;i++){
    const z=3.16+i*.29,top=.09-i*.12;
    box(0,top-.045,z,2.65,.09,.32,steel);barrier(0,z,1.325,.16,top-.25,top,'metal',true);
  }
  box(0,1.55,-3.55,7.8,2.74,.16);barrier(0,-3.55,3.9,.08,.18,2.92);
  for(const side of [-1,1]){
    box(side*3.86,1.55,-2.6,.16,2.74,1.9);barrier(side*3.86,-2.6,.08,.95,.18,2.92);
    box(side*3.7,3.0,-2.65,.14,.12,2.0,edge);
    // Hinged locker doors folded outward; shelves hold dense, tangible stock.
    box(side*3.56,1.60,-1.44,.58,2.64,.085,steel,side*.7);
    for(let shelf=0;shelf<4;shelf++){
      box(side*2.98,.63+shelf*.54,-3.04,1.4,.065,.70,edge);
      for(let k=0;k<4;k++){
        box(side*(2.45+k*.32),.79+shelf*.54,-3.0,.265,.25,.32,[.115,.109,.072]);
        box(side*(2.45+k*.32),.93+shelf*.54,-3.0,.28,.035,.34,edge);
      }
    }
    for(const x of [-2.7,2.7]){
      // Four proper wheels and hubs along the trailer's long axis.
      cyl(x,.44,-2.60+side*1.16,.47,.22,rubber,Math.PI/2);
      cyl(x,.44,-2.60+side*1.30,.245,.025,edge,Math.PI/2);
      cyl(x,.44,-2.60+side*1.32,.09,.065,steel,Math.PI/2);
      for(let n=0;n<6;n++)cyl(x+Math.sin(n*Math.PI/3)*.17,.44+Math.cos(n*Math.PI/3)*.17,-2.60+side*1.34,.022,.019,steel,Math.PI/2);
    }
    // Canopy props have base shoes and cap plates rather than naked sticks.
    cyl(side*3.85,1.72,2.65,.043,3.10,edge);box(side*3.85,.22,2.65,.34,.08,.34);
    barrier(side*3.85,2.65,.09,.09,.18,3.29);
  }
  box(0,2.96,-2.63,7.9,.11,2.04,steel);
  for(let x=-3.5;x<=3.5;x+=.35){box(x,1.54,-3.455,.016,2.6,.018,edge);}
  // Curved, thick canvas with a sag between its steel ribs.
  const points=[];
  for(let i=0;i<=32;i++){
    const x=-4.2+i*8.4/32,y=3.12+.28*(1-(x/4.2)**2);
    points.push(new THREE.Vector2(x,y));
  }
  for(let i=32;i>=0;i--){const x=-4.2+i*8.4/32;points.push(new THREE.Vector2(x,3.09+.28*(1-(x/4.2)**2)));}
  const canopy=new THREE.ExtrudeGeometry(new THREE.Shape(points),{depth:5.4,bevelEnabled:false,steps:1});
  part(canopy,tarp,0,0,-2.5);
  for(let i=0;i<12;i++)box(-3.84+i*.70,3.04,2.91,.034,.23,.035,[.16,.15,.112]);
  // Solid counter and a leather gun mat: the front is a shop, not an ambush silhouette.
  box(0,1.045,.65,4.5,.15,.76,wood);barrier(0,.65,2.25,.38,.18,1.12,'wood');
  for(const x of [-1.93,1.93]){box(x,.60,.65,.14,.87,.58);box(x,.20,.65,.36,.05,.64);}
  box(0,.46,.65,4.04,.075,.61,wood);box(0,1.126,.65,4.1,.011,.65,[.035,.031,.026]);
  const crate=(x,z,w,h,d)=>{
    box(x,.18+h/2,z,w,h,d,wood);
    for(let i=0;i<5;i++)box(x-w/2+(i+.5)*w/5,.18+h+.015,z,w/5-.01,.035,d+.025,[.15,.094,.049]);
    for(const dx of [-w*.34,w*.34]){box(x+dx,.18+h/2,z+d/2+.012,.055,h+.02,.025,steel);box(x+dx,.18+h+.035,z,.055,.018,d+.055,steel);}
    barrier(x,z,w/2,d/2,.18,.18+h,'wood');
  };
  crate(-3.13,.72,1.1,.88,1.20);crate(3.13,.65,1.15,1.20,1.32);
  crate(-2.98,-.82,.98,.68,.94);crate(3.11,-.90,1.2,.68,.90);
  // Shaped firearm displays: barrels, receivers, grips, magazines and separate stocks.
  const gun=(x,y,z,length,vertical=false)=>{
    if(vertical){
      box(x,y,z,.085,length*.55,.075,steel);box(x,y-length*.35,z,.13,length*.28,.10,wood);
      cyl(x,y+length*.40,z,.019,length*.30,edge);box(x+.05,y-.04,z,.105,.15,.10,steel);
    }else{
      box(x,y,z,length*.55,.075,.10,steel);box(x-length*.35,y-.025,z,length*.26,.12,.13,wood);
      cyl(x+length*.35,y+.009,z,.017,length*.36,edge,0,Math.PI/2);box(x,y-.06,z,.055,.16,.087,steel);
    }
  };
  [1.03,.86,.36].forEach((length,i)=>gun((i-1)*1.35,1.21,.67,length));
  for(let i=-2;i<=2;i++)gun(i*.43,1.74,-3.35,1.18,true);
  // Workbench tools, coiled cable, oil bottles, cartridges and bolted metal edging.
  for(let i=0;i<14;i++)cyl(-1.8+i*.042,1.20,.35,.011,.065,[.26,.19,.075]);
  for(const x of [-2.92,3.04]){cyl(x,1.15,.60,.067,.27,[.065,.085,.061]);cyl(x,1.31,.60,.03,.055,edge);}
  for(const x of [-3.94,3.94])for(let j=0;j<14;j++)cyl(x,.13,-3.37+j*.46,.021,.033,edge);
  // Caged lanterns and shielded warm work lights, separate from destination mains power.
  for(const x of [-2.30,2.30]){
    box(x,2.71,1.70,.30,.035,.27);box(x,2.32,1.70,.29,.045,.27);
    for(const sx of [-.115,.115])for(const sz of [-.09,.09])cyl(x+sx,2.51,1.70+sz,.012,.38,edge);
    part(new THREE.CylinderGeometry(.09,.095,.27,12),[.7,.56,.34],x,2.51,1.70,0,0,0,glow);
  }
  const make=(parts,mat,name)=>{
    const flat=parts.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(flat,false);
    parts.forEach(g=>g.dispose());flat.forEach(g=>{if(!parts.includes(g))g.dispose();});const m=new THREE.Mesh(g,mat);m.name=name;m.receiveShadow=true;m.castShadow=true;return m;
  };
  return{solid:make(solid,material,'dealer-workshop-trailer'),glow:make(glow,lampMaterial,'dealer-caged-lanterns'),colliders};
}
