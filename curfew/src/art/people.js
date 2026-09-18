// Human anatomy from CC0 MakeHuman graphical assets; clothing and rig authored for WWPM.
// Local forward is -Z, matching the enemy controller. No emissive eyes or reveal dimming.
//
// D16 (2026-09-17), "modern AAA visuals on these people", spent where the eye goes at
// talking distance: a skin program with wrapped diffuse and a normal map (surface-light.js),
// per-vertex ambient occlusion baked into the head, an indexed head whose mouth moves (R3: a
// per-vertex jaw weight in the skin program, lower lip and chin only) when the person is the
// one speaking, two eyeballs that lead the head and lids that close by scaling, a cornea for
// the catchlight, alpha-tested hair cards on one material, three hamlet palettes and two more
// cuts, breath and a weight shift, and rig.setAppearance(look) so a hamlet can author a face
// per person without a species per person (C14).
//
// Draw budget: 16-18 meshes per person. The second eye and the cornea cost two; the neck
// merged into the head and the boots into the shin gave three back, and the R3 mouth took the
// jaw's own mesh away. TWO shader programs are ours (skin, hair cards); the cornea shares the
// eye program and every human material is warmed by enemies.warmup() at boot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEADS, HEAD_INDEX } from './human-head-data.js';
import { readableSurface, skinSurface } from './surface-light.js';
import { loft, tendon, characterMaps, skinNormalMap, strandTexture } from './character-sculpt.js';

const cache = new Map();
const SKIN=[[.43,.285,.205],[.19,.102,.061],[.39,.253,.177],[.46,.303,.227]];
const HAIR=[[.097,.084,.067],[.022,.017,.013],[.038,.027,.020],[.080,.043,.021]];
const GREY=[.15,.145,.135];                     // the grey at the two older heads' temples
const leather=[.031,.027,.024], seam=[.025,.029,.029], WOOD=[.145,.092,.048], BRASS=[.126,.094,.041];
// THE MOUTH (R3), measured off each donor mesh in raw MakeHuman metres: s0 is where the lips
// part on the midline, (cx, cy) a mouth corner. Alex, 2026-09-18: "the mouths are so wide its
// freaky ... it opens up to like all the way to the sides of there head". The old jaw was every
// face triangle under a lip line painted 7.5 mm too high, cut ear to ear and swung as a block.
// Now only the lower lip and the chin under it move, inside the corners, on a per-vertex weight
// the skin program hinges (surface-light.js): the corners hold and the cheeks never move.
const MOUTH=[{s0:1.6235,cx:.0214,cy:1.6223},{s0:1.6250,cx:.0214,cy:1.6236},{s0:1.6332,cx:.0187,cy:1.6323},{s0:1.6363,cx:.0199,cy:1.6348}];
// Landmarks per donor head, head-local (x at the data's 1.10), measured off the mesh: the nose tip
// [y, z], the chin's most forward point [y, z], and the eyes' height.
const LAND=[{tip:[.149,-.150],chin:[.102,-.125],eye:.188},{tip:[.149,-.141],chin:[.113,-.132],eye:.189},
  {tip:[.160,-.140],chin:[.113,-.123],eye:.194},{tip:[.166,-.146],chin:[.112,-.123],eye:.192}];
const JAW_HINGE=[0,1.662-1.50,-.012];           // head-local, just in front of the ear
const JAW_OPEN=.055;                            // rad: the lower lip drops ~8 mm at the widest
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// How much of the jaw's swing a donor vertex takes (raw x, y, z; ny its normal's y).
function jawWeight(v,rx,y,z,ny){
  const M=MOUTH[v],ax=Math.abs(rx),pt=M.s0+(M.cy-M.s0)*Math.min(1,(ax/M.cx)**2);
  let wy=y<pt?1:0;
  // within 3 mm of the parting the lips interleave: an up-facing surface is the lower lip
  if(Math.abs(y-pt)<.003&&ax<M.cx+.002){if(ny>.2)wy=1;else if(ny<-.2)wy=0;}
  // stop at the corners on the lips, widen only a little across the chin
  const d=Math.max(0,Math.min(1,(pt-y)/.012));
  const a=M.cx*.65*(1-d)+.020*d,b=(M.cx+.003)*(1-d)+.034*d;
  return wy*(1-smooth(a,b,ax))*(1-smooth(-.085,-.060,z))*smooth(1.574,1.596,y);
}
// The inside of the mouth (the bag, the inner lips, its side walls): painted dark red-black, so
// a parted mouth reads as a dark oval and never as skin shards or the sky.
function mouthInside(v,rx,y,z,nx,nz){
  const M=MOUTH[v],ax=Math.abs(rx);
  // (not the outside of the nape, which faces backwards at the same height)
  if(y>M.s0-.025&&y<M.s0+.015&&z>-.10&&z<.03&&nz<.3&&(ax<M.cx||(ax<M.cx+.020&&nx*rx<0)))return true;
  if(!(ax<M.cx+.003&&y>M.s0-.012&&y<M.s0+.010&&z<-.02))return false;
  return nz>-.55||(ax<M.cx-.002&&z>-.115);
}

// PROPORTIONS (D16). Shoulders .186 -> .205 (a man's biacromial half-width at 1.80 m); the
// forearm .27 -> .30 so the wrist sits at .79; the head group 1.424 -> 1.41 because the neck
// showed a finger of daylight over the collar.
// THE HEAD (R3): the group was (1.10, 1.10, 1.08) on top of the head data's x 1.10, a net
// 1.21 wide by 1.10 tall: every feature 10% wider than it was tall, a squat mask 18.4 cm
// across on a head 22 cm chin to crown. Now (1.02, 1.14, 1.10): 17.1 cm across, 22.9 cm tall
// (7.6 heads to the body), eyes 59 mm apart and round. The data's x 1.10 stays so that every
// head-local fit (hair, brows, caps, hats) keeps working; they all scale with the group.
const HEAD_Y=1.41, SHOULDER_Y=1.382, ELBOW_Y=-.29, HIP_Y=.855, KNEE_Y=-.405;
const HEAD_SCALE=[1.02,1.14,1.10];
// THE NECK (R3). Alex: "the friendly npcs have giraffe necks (which is often successfully hid
// with scarfs". The skeleton was right (eye to arm pivot .235, which is the joint centre, not
// the acromion); the surface was not: an 8.5 cm tube under an 18 cm jaw, rising out of a flat
// coat shelf, with the scarf a column to the chin. Rings are head-local [y, rx, rz, cx, cz], one
// set per donor build (heads 0-1 are men, 2-3 women; keyed on the head, not the style, because
// Roan wears head 3 and Tobin head 1). At the cut the neck is as wide as the head's opening, the
// chin overhangs it in front, and the front leans ~20 degrees forward the way a neck does. The
// back meets the donor's nape (z .019-.023 at the cut, measured) instead of standing a centimetre
// proud of it; the top two rings run up inside the skull, hidden (painted as inside the mouth).
const NECK=[
  [[-.030,.058,.056,0,.004],[.010,.053,.051,0,-.006],[.050,.058,.054,0,-.020],[.086,.066,.0565,0,-.0335],[.110,.046,.043,0,-.033],[.135,.030,.030,0,-.025]],
  [[-.030,.056,.054,0,.004],[.010,.050,.049,0,-.004],[.050,.050,.045,0,-.014],[.080,.056,.045,0,-.023],[.105,.040,.032,0,-.028],[.130,.026,.026,0,-.022]]];

/* ================================================================ PALETTES ==
   One per hamlet (D16), picked by the `palette` argument. `cuts` is the torso cut per
   wardrobe (variant / 4): coat, shawl (a wide shoulder shawl over the coat), apron, longcoat
   (to the shin, vented, belted) or jumper (a knit with a rolled collar, no lapels). Every
   value is linear vertex colour and sits under the night sky (species.js's night-value
   law); the ridge apron is the one bright garment, in the bedsheet's tradition. */
const PALETTES={
  default:{
    coats:[[.105,.139,.132],[.165,.113,.079],[.093,.127,.181],[.178,.158,.123]],
    scarves:[[.215,.075,.054],[.119,.151,.112],[.236,.169,.082],[.086,.108,.173]],
    trousers:[[.063,.065,.068],[.085,.075,.059],[.038,.052,.069],[.081,.076,.067]],
    cuts:['coat','shawl','apron'],apron:null,hat:false},
  // Eelwater: waxed greens, rubber, oilskin. Waders on everyone.
  fen:{
    coats:[[.058,.086,.056],[.046,.070,.052],[.072,.092,.058],[.040,.060,.048]],
    scarves:[[.034,.038,.040],[.118,.126,.086],[.070,.078,.070],[.096,.058,.040]],
    trousers:[[.030,.034,.036],[.034,.038,.038],[.028,.032,.034],[.036,.040,.040]],
    cuts:['longcoat','coat','apron'],apron:[.032,.036,.038],hat:false},
  // The Cut: dust-grey wool, hide, lime-white aprons off the kiln.
  ridge:{
    coats:[[.135,.130,.120],[.105,.100,.094],[.160,.150,.138],[.120,.112,.100]],
    scarves:[[.086,.060,.038],[.112,.080,.052],[.076,.068,.058],[.128,.094,.060]],
    trousers:[[.086,.060,.038],[.070,.066,.060],[.080,.058,.042],[.064,.060,.056]],
    cuts:['jumper','shawl','apron'],apron:[.40,.41,.36],hat:false},
  // Highwood: reds and oranges, party remnants (the scarves are streamers, one wardrobe keeps
  // its paper hat), and the one sheet is Tobin, who is his own species.
  pines:{
    coats:[[.235,.070,.048],[.255,.118,.040],[.190,.052,.058],[.220,.100,.032]],
    scarves:[[.30,.24,.05],[.06,.20,.22],[.28,.06,.18],[.16,.15,.13]],   // (the white one went grey in the wash: at .22 it read as a paper collar)
    trousers:[[.063,.065,.068],[.085,.075,.059],[.050,.046,.060],[.081,.076,.067]],
    cuts:['coat','jumper','coat'],apron:null,hat:true},
};
export const PALETTE_NAMES=Object.freeze(Object.keys(PALETTES));
export const HAIR_STYLES=Object.freeze(['cropped','tied','loose','slicked']);

const hashF=(a,b)=>{let n=Math.imul(a|0,374761393)^Math.imul(b|0,668265263);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967295;};
const clamp=(n,a,b)=>n<a?a:n>b?b:n;

/* ============================================================ GEOMETRY KIT == */
function tint(g,c){
  const p=g.attributes.position, color=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++)color.set(c,i*3);
  g.setAttribute('color',new THREE.BufferAttribute(color,3));return g;
}
function finish(parts){
  if(!parts.length)return null;
  const flat=parts.map(g=>g.index?g.toNonIndexed():g);
  const g=mergeGeometries(flat,false);parts.forEach(p=>p.dispose());
  flat.forEach(p=>{if(!parts.includes(p))p.dispose();});g.computeBoundingSphere();return g;
}
// The indexed twin, for the head and the hair (D16): 4,778 shared vertices instead of 28k.
function finishIndexed(parts){
  if(!parts.length)return null;
  for(const g of parts){if(!g.index)throw new Error('finishIndexed: every part must be indexed');if(!g.attributes.normal)g.computeVertexNormals();}
  const g=parts.length===1?parts[0]:mergeGeometries(parts,false);
  if(parts.length>1)parts.forEach(p=>p.dispose());
  g.computeBoundingSphere();return g;
}
function oval(parts,x,y,z,rx,ry,rz,c){
  const g=new THREE.SphereGeometry(1,16,10);g.scale(rx,ry,rz);g.translate(x,y,z);parts.push(tint(g,c));
}
function box(parts,x,y,z,w,h,d,c,rz=0){
  const b=Math.min(w,h,d)*.22,shape=new THREE.Shape();
  shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*b,steps:1,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,curveSegments:1});
  g.translate(0,0,-d/2+b);g.rotateZ(rz);g.translate(x,y,z);parts.push(tint(g,c));
}
// A boot sole (polish): the old one was a square slab 16 x 28.5 cm, wider than the boot, and at
// two metres every pair of feet stood on an action figure's base. This is the boot's own outline
// (the boot ring's ellipse, rx x rz about cz), a narrower heel and a rounder toe, 4 mm in from the
// boot, with a bevelled edge. Its underside is at `bottom`, the lowest point of the leg.
function sole(parts,bottom,rx,rz,cz,thick,c){
  const shape=new THREE.Shape(),b=.004,N=28;
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2,t=Math.cos(a);                 // t 1 at the heel (+z), -1 at the toe
    const w=(rx-b)*(t>0?1-.20*t*t:1-.04*t*t);
    const x=Math.sin(a)*w,z=cz+t*(rz-b);
    i?shape.lineTo(x,z):shape.moveTo(x,z);
  }
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:thick-2*b,steps:1,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:2,curveSegments:1});
  g.rotateX(Math.PI/2);                                 // the outline's y is the foot's z; the extrusion runs down
  g.translate(0,bottom+thick-b,0);
  parts.push(tint(g,c));
}
// Extract the triangles keep(a,b,c) says yes to into a compact indexed geometry.
function subMesh(g,keep){
  const idx=g.index.array,n=g.attributes.position.count,map=new Int32Array(n).fill(-1),out=[],used=[];
  const take=j=>{if(map[j]<0){map[j]=used.length;used.push(j);}out.push(map[j]);};
  for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];if(!keep(a,b,c))continue;take(a);take(b);take(c);}
  const r=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv','color','jawW']){
    const src=g.attributes[name];if(!src)continue;
    const k=src.itemSize,dst=new Float32Array(used.length*k);
    for(let i=0;i<used.length;i++)for(let q=0;q<k;q++)dst[i*k+q]=src.array[used[i]*k+q];
    r.setAttribute(name,new THREE.BufferAttribute(dst,k));
  }
  r.setIndex(out);r.computeBoundingSphere();return r;
}
// Elliptical garment cross sections: shoulders, waist, hem and compression folds.
// Unlike stacked primitives this is a continuous sewn silhouette with irregular folds.
function garment(parts,rings,c,seed=0,cut='plain'){
  // (a sheet has 64 segments round: twelve folds on 32 were under three vertices each and never showed)
  const g=loft(rings.map(([y,rx,rz,cz=0])=>[y,rx,rz,0,cz]),{segments:cut==='sheet'?64:32,subdivisions:cut==='plain'?3:5,folds:.025,seed});
  tint(g,c);
  const p=g.attributes.position,colors=g.attributes.color;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const a=Math.atan2(x,z),front=Math.max(0,-Math.cos(a));
    const bell=(n,centre,width)=>Math.exp(-Math.pow((n-centre)/width,2));
    let relief=0;
    if(cut==='coat'){
      // Cloth bunches beneath the arms, pulls diagonally into the pockets and
      // gathers above the hem. Broad relief remains readable at two metres.
      relief+=Math.sin(y*55+a*3)*.010*bell(y,1.22,.13)*(1-front*.65);
      relief+=front*.008*(bell(y,1.08-Math.abs(x)*.65,.022)-bell(y,1.11-Math.abs(x)*.65,.020));
      relief+=front*.007*(bell(y,.82+Math.abs(x)*.44,.023)-bell(y,.86+Math.abs(x)*.44,.028));
      relief+=Math.sin(a*9+seed)*.010*bell(y,.73,.085);
      relief-=.006*bell(y,1.30,.026)*(1-front);
    }else if(cut==='longcoat'){
      // The same shoulders and pockets, then a skirt: long vertical folds and a hem that swings.
      relief+=Math.sin(y*55+a*3)*.010*bell(y,1.22,.13)*(1-front*.65);
      relief+=front*.008*(bell(y,.98-Math.abs(x)*.65,.022)-bell(y,1.01-Math.abs(x)*.65,.020));
      relief+=Math.sin(a*9+seed)*.012*bell(y,.62,.20);
      relief+=Math.sin(a*5-seed)*.008*bell(y,.46,.06);
      relief-=.006*bell(y,1.30,.026)*(1-front);
    }else if(cut==='knit'){
      // Ribbing the height of the jumper, a sag at the waist, the neck pulled in.
      relief+=Math.sin(a*64)*.0022;
      relief+=Math.sin(y*30+a*2+seed)*.006*bell(y,1.02,.07)*(1-front*.5);
      relief-=.004*bell(y,1.30,.03)*(1-front);
    }else if(cut==='sleeve'){
      relief+=Math.sin(y*82+a*1.8+seed)*.0075*bell(y,-.245,.075);
      relief+=Math.sin(y*48-a*2)*.005*bell(y,-.065,.09);
    }else if(cut==='cuff'){
      relief+=Math.sin(y*96+a*1.5+seed)*.006*bell(y,-.073,.09);
      relief+=Math.sin(y*64-a*2)*.004*bell(y,-.248,.055);
    }else if(cut==='scarf'){
      // polish: wound twice round, not a smooth tube. Outward only, so the neck's clearance holds.
      relief+=.0045*(.5+.5*Math.sin(a*1+y*190+seed))+.0015*(.5+.5*Math.sin(a*5-y*60));
    }else if(cut==='trouser'){
      relief+=Math.sin(y*75+a*2+seed)*.0075*bell(y,-.34,.08);
      relief+=front*.005*bell(x,0,.015);
    }
    let dy=0;
    if(cut==='sheet'){
      // polish: a bedsheet over a man, not a marshmallow. Twelve long folds that deepen toward
      // the hem, gathered above and below the rope, and a hem cut by hand, never level.
      const deep=.007+.019*clamp((1.25-y)/.85,0,1);
      // the folds only ever stand OUT from the old surface: his hands hang inside it, a trough uncovered them
      relief+=deep*(1+Math.sin(a*12+seed+y*1.7)*.7+Math.sin(a*7-seed*.5+y*2.3)*.3)*.5*(1-bell(y,1.06,.045));
      relief-=.012*bell(y,1.06,.05);
      dy=(.018*Math.sin(a*5+seed)+.010*Math.sin(a*11-seed*1.3))*clamp((.46-y)/.11,0,1);
    }
    const radius=Math.hypot(x,z)||1;
    p.setXYZ(i,x+x/radius*relief,y+dy,z+z/radius*relief);
    const wear=.93+.05*Math.sin(y*19+x*7)+.025*Math.sin(x*73+z*31)+Math.max(-.10,relief*5);
    colors.setXYZ(i,c[0]*wear,c[1]*wear,c[2]*wear);
  }
  g.computeVertexNormals();g.computeBoundingSphere();
  parts.push(g);
}

/* ============================================================== THE HEAD ==
   Indexed, vertex-painted, ambient-occluded, one mesh with a jaw weight per vertex, with
   the neck merged in. Cached per donor head (four), so the AO bake runs four times at
   boot and never again. */

// A few rays against the head's own mesh, once per head. Real occlusion, not curvature: the
// eye sockets, the nostrils, under the lip, behind the ears and under the chin go dark, and
// that darkness survives every light in the county because it is in the vertex colour.
function bakeAO(p,nrm,index){
  const n=p.length/3,ao=new Float32Array(n).fill(1),tris=index.length/3;
  let minX=1e9,minY=1e9,minZ=1e9,maxX=-1e9,maxY=-1e9,maxZ=-1e9;
  for(let i=0;i<n;i++){const x=p[i*3],y=p[i*3+1],z=p[i*3+2];if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;}
  // 2 cm rays: skin occlusion on a head is a crevice thing and a socket is under 2 cm deep.
  // 5 mm cells walked in ray order (a 3D DDA) with a stop at the first cell that holds the
  // nearest hit, so a ray tests the ~30 triangles it passes and not the ~300 in its reach
  // (measured: 11.8M triangle tests a head with 2 cm cells, ~1M this way). Vertices behind
  // the ear line (z > .03) and under the hair cap (y > .235) are skipped. ~50 ms per head.
  const CELL=.005,INV=1/CELL,MAXD=.02,EPS=.0012,BACK=.03,CROWN=.235;
  const nx=Math.ceil((maxX-minX)*INV)+1,ny=Math.ceil((maxY-minY)*INV)+1,nz=Math.ceil((maxZ-minZ)*INV)+1;
  // triangle corners, edges, face normals and a bounding sphere, flat, once
  const A=new Float32Array(tris*3),E1=new Float32Array(tris*3),E2=new Float32Array(tris*3),FN=new Float32Array(tris*3),CR=new Float32Array(tris*4),BB=new Int32Array(tris*6);
  const count=new Int32Array(nx*ny*nz+1);
  for(let t=0;t<tris;t++){
    const a=index[t*3]*3,b=index[t*3+1]*3,c=index[t*3+2]*3;
    A[t*3]=p[a];A[t*3+1]=p[a+1];A[t*3+2]=p[a+2];
    const e1X=E1[t*3]=p[b]-p[a],e1Y=E1[t*3+1]=p[b+1]-p[a+1],e1Z=E1[t*3+2]=p[b+2]-p[a+2];
    const e2X=E2[t*3]=p[c]-p[a],e2Y=E2[t*3+1]=p[c+1]-p[a+1],e2Z=E2[t*3+2]=p[c+2]-p[a+2];
    FN[t*3]=e1Y*e2Z-e1Z*e2Y;FN[t*3+1]=e1Z*e2X-e1X*e2Z;FN[t*3+2]=e1X*e2Y-e1Y*e2X;
    const mx=(p[a]+p[b]+p[c])/3,my=(p[a+1]+p[b+1]+p[c+1])/3,mz=(p[a+2]+p[b+2]+p[c+2])/3;
    CR[t*4]=mx;CR[t*4+1]=my;CR[t*4+2]=mz;
    CR[t*4+3]=Math.sqrt(Math.max((p[a]-mx)**2+(p[a+1]-my)**2+(p[a+2]-mz)**2,(p[b]-mx)**2+(p[b+1]-my)**2+(p[b+2]-mz)**2,(p[c]-mx)**2+(p[c+1]-my)**2+(p[c+2]-mz)**2));
    const x0=Math.min(p[a],p[b],p[c]),x1=Math.max(p[a],p[b],p[c]),y0=Math.min(p[a+1],p[b+1],p[c+1]),y1=Math.max(p[a+1],p[b+1],p[c+1]),z0=Math.min(p[a+2],p[b+2],p[c+2]),z1=Math.max(p[a+2],p[b+2],p[c+2]);
    const i0=BB[t*6]=((x0-minX)*INV)|0,i1=BB[t*6+1]=((x1-minX)*INV)|0,j0=BB[t*6+2]=((y0-minY)*INV)|0,j1=BB[t*6+3]=((y1-minY)*INV)|0,k0=BB[t*6+4]=((z0-minZ)*INV)|0,k1=BB[t*6+5]=((z1-minZ)*INV)|0;
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)for(let k=k0;k<=k1;k++)count[(i*ny+j)*nz+k+1]++;
  }
  for(let c=1;c<count.length;c++)count[c]+=count[c-1];
  const start=count,items=new Int32Array(start[start.length-1]),fill=new Int32Array(nx*ny*nz);
  for(let t=0;t<tris;t++){
    for(let i=BB[t*6];i<=BB[t*6+1];i++)for(let j=BB[t*6+2];j<=BB[t*6+3];j++)for(let k=BB[t*6+4];k<=BB[t*6+5];k++){const id=(i*ny+j)*nz+k;items[start[id]+fill[id]++]=t;}
  }
  // seven directions in tangent space (z is the normal), cosine-weighted
  const DIRS=[0,0,1,1, .5,0,.866,.87, -.25,.433,.866,.87, -.25,-.433,.866,.87, .45,.78,.43,.43, .45,-.78,.43,.43, -.9,0,.43,.43];
  const ND=DIRS.length/4;
  const stamp=new Int32Array(tris).fill(-1);let ray=0;
  for(let i=0;i<n;i++){
    if(p[i*3+2]>BACK||p[i*3+1]>CROWN)continue;
    const nX=nrm[i*3],nY=nrm[i*3+1],nZ=nrm[i*3+2];
    let tX,tY,tZ;
    if(Math.abs(nY)<.9){tX=nZ;tY=0;tZ=-nX;}else{tX=0;tY=-nZ;tZ=nY;}
    const tl=Math.hypot(tX,tY,tZ)||1;tX/=tl;tY/=tl;tZ/=tl;
    const bX=nY*tZ-nZ*tY,bY=nZ*tX-nX*tZ,bZ=nX*tY-nY*tX;
    const oX=p[i*3]+nX*EPS,oY=p[i*3+1]+nY*EPS,oZ=p[i*3+2]+nZ*EPS;
    let occ=0,wsum=0;
    for(let d=0;d<ND;d++){
      const w=DIRS[d*4+3];wsum+=w;ray++;
      const dX=tX*DIRS[d*4]+bX*DIRS[d*4+1]+nX*DIRS[d*4+2],dY=tY*DIRS[d*4]+bY*DIRS[d*4+1]+nY*DIRS[d*4+2],dZ=tZ*DIRS[d*4]+bZ*DIRS[d*4+1]+nZ*DIRS[d*4+2];
      // Amanatides-Woo: the cell the origin is in, then the next cell boundary along each axis
      let ci=((oX-minX)*INV)|0,cj=((oY-minY)*INV)|0,ck=((oZ-minZ)*INV)|0;
      const sx=dX>0?1:-1,sy=dY>0?1:-1,sz=dZ>0?1:-1;
      let tmx=dX!==0?(((ci+(dX>0?1:0))*CELL+minX)-oX)/dX:Infinity,tmy=dY!==0?(((cj+(dY>0?1:0))*CELL+minY)-oY)/dY:Infinity,tmz=dZ!==0?(((ck+(dZ>0?1:0))*CELL+minZ)-oZ)/dZ:Infinity;
      const tdx=dX!==0?CELL/Math.abs(dX):Infinity,tdy=dY!==0?CELL/Math.abs(dY):Infinity,tdz=dZ!==0?CELL/Math.abs(dZ):Infinity;
      let best=MAXD;
      for(let step=0;step<12;step++){
        if(ci<0||cj<0||ck<0||ci>=nx||cj>=ny||ck>=nz)break;
        const id=(ci*ny+cj)*nz+ck,q1=start[id+1];
        for(let q=start[id];q<q1;q++){
          const t=items[q];if(stamp[t]===ray)continue;stamp[t]=ray;
          const t3=t*3,t4=t*4;
          // a closed surface: an outward ray only ever meets a face that faces it
          if(FN[t3]*dX+FN[t3+1]*dY+FN[t3+2]*dZ>=0)continue;
          // and only one whose bounding sphere the ray can reach
          const cX=CR[t4]-oX,cY=CR[t4+1]-oY,cZ=CR[t4+2]-oZ,reach=MAXD+CR[t4+3];
          if(cX*cX+cY*cY+cZ*cZ>reach*reach)continue;
          if(index[t3]===i||index[t3+1]===i||index[t3+2]===i)continue;
          const e1X=E1[t3],e1Y=E1[t3+1],e1Z=E1[t3+2],e2X=E2[t3],e2Y=E2[t3+1],e2Z=E2[t3+2];
          const pvX=dY*e2Z-dZ*e2Y,pvY=dZ*e2X-dX*e2Z,pvZ=dX*e2Y-dY*e2X;
          const det=e1X*pvX+e1Y*pvY+e1Z*pvZ;if(det>-1e-12&&det<1e-12)continue;
          const inv=1/det,tvX=oX-A[t3],tvY=oY-A[t3+1],tvZ=oZ-A[t3+2];
          const u=(tvX*pvX+tvY*pvY+tvZ*pvZ)*inv;if(u<0||u>1)continue;
          const qvX=tvY*e1Z-tvZ*e1Y,qvY=tvZ*e1X-tvX*e1Z,qvZ=tvX*e1Y-tvY*e1X;
          const vv=(dX*qvX+dY*qvY+dZ*qvZ)*inv;if(vv<0||u+vv>1)continue;
          const tt=(e2X*qvX+e2Y*qvY+e2Z*qvZ)*inv;if(tt>1e-5&&tt<best)best=tt;
        }
        // leave this cell along the nearest boundary; done once the nearest hit is behind it
        const exit=tmx<tmy?(tmx<tmz?tmx:tmz):(tmy<tmz?tmy:tmz);
        if(best<=exit||exit>MAXD)break;
        if(tmx<tmy){if(tmx<tmz){ci+=sx;tmx+=tdx;}else{ck+=sz;tmz+=tdz;}}
        else if(tmy<tmz){cj+=sy;tmy+=tdy;}else{ck+=sz;tmz+=tdz;}
      }
      if(best<MAXD)occ+=w*(1-best/MAXD);
    }
    // .65: a fully enclosed vertex keeps a third of its light (skin scatters), and the
    // AO multiplies a colour that the skin program then lights, so it never goes to black
    ao[i]=1-.65*(occ/wsum);
  }
  return ao;
}

function headGeometry(v){
  const key='head'+v;if(cache.has(key))return cache.get(key);
  const data=HEADS[v],src=data.positions,n=src.length/3,p=new Float32Array(src.length);
  const color=new Float32Array(n*3),uv=new Float32Array(n*2),skin=SKIN[v];
  for(let i=0;i<n;i++){
    const x=src[i*3]*1.10,y=src[i*3+1],z=src[i*3+2];
    const front=Math.max(0,Math.min(1,(-z-.065)/.06));
    const cheeks=Math.exp(-Math.pow((Math.abs(x)-.046)/.025,2)-Math.pow((y-1.665)/.03,2))*front;
    const sockets=Math.exp(-Math.pow((Math.abs(x)-.032)/.020,2)-Math.pow((y-1.688)/.014,2))*front;
    const stubble=v<2?Math.exp(-Math.pow((y-1.632)/.022,2))*front*.10:0;
    const lips=Math.exp(-Math.pow(src[i*3]/(MOUTH[v].cx*1.05),4)-Math.pow((y-MOUTH[v].s0)/.0060,2))*front;
    // polish: sockets .11 -> .20 (the eyes sat on the face like buttons), and the blood that
    // shows at the ears and the tip of the nose in the cold
    const m=1-.20*sockets-stubble+.010*Math.sin(x*920+y*617+z*134);
    const L=LAND[v],cold=.10*smooth(.066,.076,Math.abs(x))*Math.exp(-Math.pow((y-1.665)/.028,2)-Math.pow(z/.035,2))
      +.08*Math.exp(-Math.pow(x/.012,2)-Math.pow((y-1.5-L.tip[0])/.012,2))*smooth(L.tip[1]+.03,L.tip[1]+.01,z);
    const hairLine=z>-.015?1.713:1.772;
    const hair=Math.max(0,Math.min(1,(y-hairLine)/.012));
    const hc=v<2?[.07,.064,.054]:[.019,.015,.012];
    color[i*3]=skin[0]*m*(1+cheeks*.10+lips*.08+cold)*(1-hair)+hc[0]*hair;
    color[i*3+1]=skin[1]*m*(1-cheeks*.055-lips*.18-cold*.5)*(1-hair)+hc[1]*hair;
    color[i*3+2]=skin[2]*m*(1-lips*.11-cold*.5)*(1-hair)+hc[2]*hair;
    // Cylindrical uv, seam at the back under the hair: 5.3 tiles round a 53 cm head at the
    // colour map's 10 tiles per metre. The old planar x*10 stretched the pores to streaks
    // on the temples, which a bump map hid and a normal map would not.
    uv[i*2]=Math.atan2(x,-z)/(Math.PI*2)*5.3;uv[i*2+1]=y*10;
    p[i*3]=x;p[i*3+1]=y-1.50;p[i*3+2]=z;
  }
  // THE CUT under the chin (R3): keep a triangle with any corner above CUT, then lay every kept
  // vertex below it onto it. A flat, closed chin underside instead of 13 mm of sawtooth, which
  // showed every time a head tipped back. (Polish: the R3 rule kept a triangle by its centre, which
  // left a notch wherever two corners were under the line, and at the nape the neck showed
  // through the notches as a zig-zag. Any corner above leaves the whole edge ON the line.)
  const CUT=v<2?.086:.080,neckCut=[];
  for(let i=0;i<HEAD_INDEX.length;i+=3){const a=HEAD_INDEX[i],b=HEAD_INDEX[i+1],c=HEAD_INDEX[i+2];if(Math.max(p[a*3+1],p[b*3+1],p[c*3+1])>CUT)neckCut.push(a,b,c);}
  const pAO=p.slice();                          // the donor as it was, for the occlusion bake below
  for(const j of neckCut)if(p[j*3+1]<CUT)p[j*3+1]=CUT;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(color,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(neckCut);g.computeVertexNormals();
  const nrm=g.attributes.normal.array;
  // Occlusion is baked on the UNCUT donor (polish): baked on the cut head, the flattened slivers
  // shaded their own rim, and the join under the jaw and at the nape read as a dark band.
  const gAO=new THREE.BufferGeometry();gAO.setAttribute('position',new THREE.BufferAttribute(pAO,3));gAO.setIndex(Array.from(HEAD_INDEX));gAO.computeVertexNormals();
  const ao=bakeAO(pAO,gAO.attributes.normal.array,HEAD_INDEX);gAO.dispose();
  for(let i=0;i<n;i++){const a=ao[i];color[i*3]*=a;color[i*3+1]*=a;color[i*3+2]*=a;}
  // THE MOUTH: one weight per vertex (the skin program swings it about JAW_HINGE), and the
  // inside of the mouth painted dark. One mesh, no seam, and a draw fewer than the old jaw.
  const jawW=new Float32Array(n);
  for(let i=0;i<n;i++){
    jawW[i]=jawWeight(v,src[i*3],src[i*3+1],src[i*3+2],nrm[i*3+1]);
    if(mouthInside(v,src[i*3],src[i*3+1],src[i*3+2],nrm[i*3],nrm[i*3+2])){color[i*3]=.030;color[i*3+1]=.010;color[i*3+2]=.009;}
  }
  g.setAttribute('jawW',new THREE.BufferAttribute(jawW,1));
  const face=subMesh(g,()=>true);          // only the vertices the kept triangles use
  // the neck, on the head so it turns with it; its uv brought to the head's tiling
  const neck=loft(NECK[v<2?0:1],{segments:32,subdivisions:3});
  // Above the cut the neck only fills the opening inside the skull; where the donor's nape curves
  // in just over the cut, the loft stood out of it by a few millimetres and showed as a ragged
  // band. Pulled in 15% over the first 6 mm, it stays inside the head (polish).
  {const np=neck.attributes.position;
    for(let i=0;i<np.count;i++){const y=np.getY(i),k=1-.15*smooth(CUT,CUT+.006,y);if(k<1){const cz=-.02;np.setX(i,np.getX(i)*k);np.setZ(i,cz+(np.getZ(i)-cz)*k);}}}
  tint(neck,skin.map(n=>n*.84));               // polish: always under a jaw and inside a collar (.93 read pale)
  // Under the jaw the neck is in the jaw's shadow (the head bakes its own AO; the neck has none),
  // most under the chin: without it the top of the neck was lit like a cheek and read as a roll.
  // The top of the neck runs up inside the skull, where the only way to see it is through an
  // open mouth: there it is the inside of the mouth, not a pale wall of skin.
  {const np=neck.attributes.position,nc=neck.attributes.color;
    for(let i=0;i<np.count;i++){
      const y=np.getY(i),front=smooth(.0,-.06,np.getZ(i)),k=1-(.20+.16*front)*smooth(.040,.090,y);
      nc.setXYZ(i,nc.getX(i)*k,nc.getY(i)*k,nc.getZ(i)*k);
      const t=smooth(.104,.114,y);if(t>0)nc.setXYZ(i,nc.getX(i)+(.030-nc.getX(i))*t,nc.getY(i)+(.010-nc.getY(i))*t,nc.getZ(i)+(.009-nc.getZ(i))*t);}
    // THE SEAM (polish): the head's edge is AO'd skin and the neck was flat tint, so the join read
    // as a band (paler on the dealer's nape) even where the shapes met. The neck's top now takes
    // the head's own colour at the same bearing, fading to its own over the 3.5 cm under the cut.
    const rimA=[],rimC=[];
    for(let i=0;i<n;i++)if(Math.abs(p[i*3+1]-CUT)<1e-6){rimA.push(Math.atan2(p[i*3],p[i*3+2]+.02));rimC.push(color[i*3],color[i*3+1],color[i*3+2]);}
    if(rimA.length)for(let i=0;i<np.count;i++){
      const y=np.getY(i),w=y<CUT?smooth(CUT-.035,CUT-.002,y):1-smooth(.088,.096,y);if(w<=0)continue;
      const a=Math.atan2(np.getX(i),np.getZ(i)+.02);let best=0,bd=9;
      for(let r=0;r<rimA.length;r++){let d=Math.abs(a-rimA[r]);if(d>Math.PI)d=2*Math.PI-d;if(d<bd){bd=d;best=r;}}
      nc.setXYZ(i,nc.getX(i)+(rimC[best*3]-nc.getX(i))*w,nc.getY(i)+(rimC[best*3+1]-nc.getY(i))*w,nc.getZ(i)+(rimC[best*3+2]-nc.getZ(i))*w);
    }}
  neck.setAttribute('jawW',new THREE.BufferAttribute(new Float32Array(neck.attributes.position.count),1));
  const nu=neck.attributes.uv;for(let i=0;i<nu.count;i++)nu.setXY(i,nu.getX(i)*1.35,nu.getY(i)*3.33);
  const teeth=teethGeometry(v);
  const head=mergeGeometries([face,neck,teeth],false);face.dispose();neck.dispose();teeth.dispose();g.dispose();head.computeBoundingSphere();
  // The two older donor heads' joint centres sit inside their upper eyelids: correct the
  // eyeball to the sculpted aperture and keep the eyelid geometry.
  const eyes=data.eyes.map(([x,y,z])=>[x*1.1,y-1.5-(v<2?.0048:0),z-.002]);
  const rec={head,eyes,nrm,faceCount:face.attributes.position.count};
  cache.set(key,rec);return rec;
}

/* ============================================================== THE FACES ==
   (polish) Four donor heads were four faces: Ness, Ilke, Wren, the candlekeeper and the dealer
   had one face between them, and every hamlet had two or three identical men within 20 m. Each
   look (variant, palette, hair, hair colour) now gets its own face from the donor: the nose
   longer or shorter, its bridge higher or lower, the chin forward or back, the jaw wider or
   narrower, the cheeks fuller or leaner. Pushed along the surface's own normals, a few
   millimetres, and kept off the eyes, the lips, the hair cap and the cut under the jaw, so every
   head-local fit (hair, brows, caps, hood, scarf) holds. Shares the donor head's colour, uv, jaw
   weight and index; a face owns only its positions and normals. */
function faceGeometry(v,id){
  const key='face'+v+':'+id;if(cache.has(key))return cache.get(key);
  const base=headGeometry(v),src=base.head,L=LAND[v],CUT=v<2?.086:.080,M=MOUTH[v];
  const sp=src.attributes.position.array,sn=src.attributes.normal.array,pos=new Float32Array(sp),nf=base.faceCount;
  const h=k=>hashF(id,90+k)*2-1;                 // -1..1 per feature
  // the nose and the chin only ever grow: pulled in along their normals, the nose's wings went
  // behind the dark nostrils and the crease under the lip folded through itself
  const nose=.0025+.0025*h(1),drop=.0035*h(2),bridge=.0030*h(3),chin=.0025+.0025*h(4),jaw=.090*h(5),cheek=.0035*h(6);
  const lipY=M.s0-1.50;
  for(let i=0;i<nf;i++){
    const x=sp[i*3],y=sp[i*3+1],z=sp[i*3+2],ax=Math.abs(x);
    if(z>.02||y>L.eye+.01)continue;               // the back of the head, and everything from the eyes up
    const above=smooth(CUT+.002,CUT+.016,y);      // the rim under the jaw never moves
    const wn=Math.exp(-Math.pow(x/.013,2)-Math.pow((y-L.tip[0]+.004)/.017,2))*smooth(L.tip[1]+.045,L.tip[1]+.025,z);
    const wd=Math.exp(-Math.pow(x/.010,2)-Math.pow((y-L.tip[0])/.010,2))*smooth(L.tip[1]+.03,L.tip[1]+.012,z);
    const wb=Math.exp(-Math.pow(x/.007,2))*Math.exp(-Math.pow((y-(L.eye+L.tip[0])*.5-.004)/.013,2))*smooth(L.tip[1]+.05,L.tip[1]+.03,z);
    const wc=Math.exp(-Math.pow(x/.020,2)-Math.pow((y-L.chin[0]+.004)/.013,2))*smooth(L.chin[1]+.035,L.chin[1]+.015,z)*above*(1-smooth(lipY-.020,lipY-.009,y));
    const wk=Math.exp(-Math.pow((ax-.050)/.017,2)-Math.pow((y-.155)/.014,2))*smooth(-.02,-.045,z);
    const along=nose*wn+bridge*wb+chin*wc+cheek*wk;
    pos[i*3]+=sn[i*3]*along;pos[i*3+1]+=sn[i*3+1]*along-drop*wd;pos[i*3+2]+=sn[i*3+2]*along;
    // the jaw: wider or narrower at the mandible, clear of the mouth and the fold beside the nose
    const wj=above*(1-smooth(.100,.122,y))*smooth(.028,.046,ax)*(1-smooth(-.005,.02,z));
    pos[i*3]+=x*jaw*wj;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  for(const name of ['color','uv','jawW'])g.setAttribute(name,src.attributes[name]);
  g.setIndex(src.index);g.computeVertexNormals();
  // the neck keeps the loft's own normals (welded across its seam)
  const gn=g.attributes.normal.array;for(let i=nf*3;i<gn.length;i++)gn[i]=sn[i];
  g.computeBoundingSphere();
  cache.set(key,g);return g;
}

// THE TEETH (polish). An open mouth was a black letterbox at 0.7 m. Two thin arched strips inside
// the mouth, facing out, on the head's own mesh and program: the upper row from 1.5 mm under the
// parting to 6 mm over it (still: jaw weight 0), the lower, dimmer row a little behind it and
// moving with the jaw (weight 1). The arch runs 13 mm behind the upper lip's front on the midline
// and curves back to 15 mm inside the face at the corners (measured off each donor), so a closed
// mouth hides them and nothing of them can show through a cheek.
const LIP_FRONT=[-.1331,-.1352,-.1334,-.1354];
function teethGeometry(v){
  const M=MOUTH[v],zf=LIP_FRONT[v]+.013,N=12,pos=[],col=[],jw=[],idx=[];
  for(const [lo,hi,back,w,k] of [[-.0015,.0060,0,0,1],[-.0065,-.0006,.0025,1,.55]]){
    const base=pos.length/3;
    for(let c=0;c<=N;c++){
      const xr=(c/N*2-1)*.018,z=zf+back+25*xr*xr,side=1-.55*smooth(.006,.018,Math.abs(xr));
      // a darker seam between teeth, every ~4 mm, and the gum line darker still
      const gap=Math.abs(Math.sin(xr*Math.PI/.0042))<.25?.72:1;
      for(const [y,g] of [[lo,1],[hi,.55]]){
        // (a little warm: under the blue of dusk the first grey read green in game)
        pos.push(xr*1.10,M.s0+y-1.50,z);const t=k*side*gap*g;col.push(.23*t,.205*t,.155*t);jw.push(w);
      }
    }
    for(let c=0;c<N;c++){const a=base+c*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pos.length/3*2),2));g.setAttribute('jawW',new THREE.Float32BufferAttribute(jw,1));
  g.setIndex(idx);g.computeVertexNormals();
  // facing out of the mouth (-z); flip the winding if it came out backwards
  const nz=g.attributes.normal.getZ(0);
  if(nz>0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}g.computeVertexNormals();}
  return g;
}

/* =============================================================== THE EYES ==
   One eyeball geometry per donor head, at its own origin, shared by both eye meshes; a
   cornea shell for both eyes, black and additive, so the only thing it ever adds to the
   frame is a light's reflection: the catchlight, without an emissive. */
// R3: the whites were brighter than any skin in the county (2.6x the dark head's) and read
// as a glowing ring round a small iris, a fixed stare. Now an off-white under the skin's
// value, shaded under the upper lid, round a full-size iris and a night-wide pupil. The radii
// are pre-divided by the head group's (1.02, 1.14) so the iris and pupil are round in the
// world: 11.8 mm and 5.5 mm across.
// Iris colours (polish): brown, dark brown, hazel, grey-blue, green-grey; one per face.
const IRIS=[[.050,.034,.020],[.030,.022,.015],[.058,.050,.028],[.040,.050,.056],[.045,.056,.036]];
function eyeGeometry(v,iris=-1){
  const key='eye'+v+':'+iris;if(cache.has(key))return cache.get(key);
  const parts=[];
  oval(parts,0,0,0,.0120,.0101,.0120,[.33,.31,.28]);
  {const sp=parts[0].attributes.position,sc=parts[0].attributes.color;
    for(let i=0;i<sp.count;i++){const k=1-.45*smooth(.0025,.0045,sp.getY(i));sc.setXYZ(i,sc.getX(i)*k,sc.getY(i)*k,sc.getZ(i)*k);}}
  oval(parts,0,0,-.0114,.0058,.0052,.0018,iris<0?[.049+v*.010,.056,.035]:IRIS[iris%IRIS.length]);
  oval(parts,0,0,-.0128,.0027,.0024,.001,[.008,.009,.008]);
  const g=finish(parts);cache.set(key,g);return g;
}
function corneaGeometry(v){
  const key='cornea'+v;if(cache.has(key))return cache.get(key);
  const e=headGeometry(v).eyes,d=(e[0][0]-e[1][0])*.5,parts=[];
  for(const side of [-1,1])oval(parts,side*d,0,0,.0125,.0125,.0125,[0,0,0]);
  const g=finish(parts);cache.set(key,g);return g;
}

/* =============================================================== THE HAIR ==
   A scalp cap (the licensed scalp itself, displaced, so temples and a parting survive) under
   48-96 alpha-tested cards, in ONE indexed geometry on one material. `bandUV` points a part
   that is not a card at the opaque root band of the strand texture. */
function bandUV(g,uScale=1){
  const uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++){const vv=uv.getY(i);uv.setXY(i,uv.getX(i)*uScale,.04+.26*(vv-Math.floor(vv)));}
  return g;
}
// The hairline's height (raw donor metres) at (x, z). Polish: it was three flat steps (over the
// ear, the temple, the brow) and head 0 receded 1.8-2.5 cm whatever his hair, so a long or tied
// style on him read as a balding man in a wig. Now one continuous line, set 5 mm up or down per
// person, and the old man recedes only where his hair is short enough to show it.
function hairLineY(v,x,z,seed,style){
  const front=smooth(-.062,-.088,z);
  let line=1.687+.020*smooth(-.004,-.030,z)+.033*front+(hashF(seed,77)-.5)*.010*front;
  if(v===0&&(style==='cropped'||style==='slicked'))line+=front*(.012+Math.abs(x)*.12);
  if(v>=2)line+=Math.sin(x*48+seed)*.007*smooth(-.068,-.080,z);
  return line;
}
function hairCap(v,hc,seed,style){
  const base=headGeometry(v),source=HEADS[v].positions,n=source.length/3;
  const positions=new Float32Array(n*3),colors=new Float32Array(n*3),uv=new Float32Array(n*2),inside=new Uint8Array(n),edge=new Float32Array(n);
  for(let i=0;i<n;i++){
    const x=source[i*3],y=source[i*3+1],z=source[i*3+2],a=Math.atan2(x,z+.027);
    edge[i]=y-hairLineY(v,x,z,seed,style);inside[i]=edge[i]>0?1:0;
    const wave=.0015*Math.sin(a*17+y*93)+.0007*Math.sin(a*39-y*112);
    positions[i*3]=x*1.10*(1.035+wave*6);
    positions[i*3+1]=y-1.50+.0025+Math.max(0,y-1.73)*.025;
    positions[i*3+2]=-.027+(z+.027)*(1.040+wave*7);
    const strand=1+.11*Math.sin(a*72+y*105)+.06*Math.sin(a*133-y*57);
    colors[i*3]=hc[0]*strand;colors[i*3+1]=hc[1]*strand;colors[i*3+2]=hc[2]*strand;
    uv[i*2]=a/Math.PI*.5+.5;uv[i*2+1]=y*5;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setIndex(Array.from(HEAD_INDEX));g.computeVertexNormals();
  // the height over the hairline rides through subMesh in the jawW slot (it copies that one), then goes
  const e=new Float32Array(n);for(let i=0;i<n;i++)e[i]=edge[i];g.setAttribute('jawW',new THREE.BufferAttribute(e,1));
  const cap=subMesh(g,(a,b,c)=>inside[a]&&inside[b]&&inside[c]);g.dispose();
  bandUV(cap,6);                       // six repeats of the strand columns round the head: combed
  // THE EDGE (polish): the cap's last centimetre is mapped up into the strand texture's taper, so
  // the alpha test breaks it into strands and the hairline feathers instead of ending on a line
  {const cu=cap.attributes.uv,ce=cap.attributes.jawW;
    for(let i=0;i<cu.count;i++){const d=ce.getX(i);if(d<.010)cu.setY(i,Math.max(cu.getY(i),.47+.40*(1-d/.010)));}
    cap.deleteAttribute('jawW');}
  return {cap,positions,inside,edge,nrm:base.nrm};
}
// Cards. Each is a quad bent along three segments, rooted on the displaced scalp and lit by
// the scalp's own normal (a hair card that shades like the head under it is what makes hair
// read as a mass and not as a fan of tickets).
function hairCards(v,style,hc,capY,seed,scalp){
  const {positions,inside,nrm}=scalp;
  const cand=[];
  for(let i=0;i<inside.length;i++){
    if(!inside[i])continue;
    const y=positions[i*3+1];
    if(capY!==null&&y>capY-.008)continue;
    cand.push(i);
  }
  // 96 loose, 72 tied, 64 cropped, 40 slicked: a few more where hair hangs and shows its
  // count, fewer where it lies flat and the cap does the work.
  const want=style==='loose'?96:style==='tied'?72:style==='slicked'?40:64;
  const minD=style==='slicked'?.020:style==='cropped'?.016:.015;
  cand.sort((a,b)=>hashF(a,seed)-hashF(b,seed));
  const seeds=[];
  for(let q=0;q<cand.length&&seeds.length<want;q++){
    const i=cand[q],x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2];let ok=true;
    for(let s=0;s<seeds.length;s++){const j=seeds[s];const dx=positions[j*3]-x,dy=positions[j*3+1]-y,dz=positions[j*3+2]-z;if(dx*dx+dy*dy+dz*dz<minD*minD){ok=false;break;}}
    if(ok)seeds.push(i);
  }
  // THE HAIRLINE ROW (polish): short cards rooted just inside the edge at the brow and temples,
  // running down the skin past it, so the hairline is soft (not for slicked, which is combed back)
  const edgeFrom=seeds.length;
  if(style!=='slicked'){
    const E=scalp.edge,src=HEADS[v].positions,cand2=[];
    for(let i=0;i<inside.length;i++)if(inside[i]&&E[i]>.006&&E[i]<.016&&src[i*3+2]<-.02&&(capY===null||positions[i*3+1]<capY-.008))cand2.push(i);
    cand2.sort((a,b)=>hashF(a,seed+5)-hashF(b,seed+5));
    const row=[];
    for(const i of cand2){
      if(row.length>=30)break;
      let ok=true;for(const j of row){const dx=positions[j*3]-positions[i*3],dy=positions[j*3+1]-positions[i*3+1],dz=positions[j*3+2]-positions[i*3+2];if(dx*dx+dy*dy+dz*dz<.0095*.0095){ok=false;break;}}
      if(ok)row.push(i);
    }
    seeds.push(...row);
  }
  const K=3,pos=[],nor=[],uvs=[],col=[],idx=[];
  const crown=[.01,.30,.01],tie=[0,.16,.085],centre=[0,.16,0];
  for(let s=0;s<seeds.length;s++){
    const i=seeds[s],px=positions[i*3],py=positions[i*3+1],pz=positions[i*3+2];
    let nx=nrm[i*3],ny=nrm[i*3+1],nz=nrm[i*3+2];
    const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
    const h1=hashF(i,seed+1),h2=hashF(i,seed+2),h3=hashF(i,seed+3);
    let fx,fy,fz;const edgeCard=s>=edgeFrom;
    if(edgeCard){fx=0;fy=-1;fz=-.15;}
    else if(style==='loose'){
      // outward from the skull's centre, then down: hair falls off the head, not through it
      let ox=px-centre[0],oz=pz-centre[2];const ol=Math.hypot(ox,oz)||1;ox/=ol;oz/=ol;
      fx=ox;fy=-2.6;fz=oz;           // R3: 22 degrees off the head, not 40: hair falls, it does not splay
    }else if(style==='tied'){
      // polish: from the brow, "toward the tie" (behind and below) lies straight down the forehead,
      // and a card hung over the eyes; hair at the front is drawn back over the crown to it
      fx=tie[0]-px;fy=tie[1]+.14*smooth(-.01,-.07,pz)-py;fz=tie[2]-pz;}
    else if(style==='slicked'){fx=0;fy=-.35;fz=1;}
    else{fx=px-crown[0];fy=py-crown[1];fz=pz-crown[2];}
    if(style!=='loose'||edgeCard){const d=fx*nx+fy*ny+fz*nz;fx-=nx*d;fy-=ny*d;fz-=nz*d;}
    let fl=Math.hypot(fx,fy,fz);if(fl<.02){fx=0;fy=-1;fz=0;fl=1;}fx/=fl;fy/=fl;fz/=fl;
    // the fringe: the hairline is at .24 and the brows at .20, so a card hanging off the front
    // gets 4-6.5 cm and stops at the brow, never over the eyes
    const fringe=pz<-.05&&py>.17;
    let len=style==='loose'?(fringe?.04+.025*h1:.12+.05*h1):style==='tied'?.07+.04*h1:style==='slicked'?.05:.045+.02*h1;
    if(style==='cropped'&&fringe)len*=.7;
    if(edgeCard)len=.018+.010*h1;
    const w=edgeCard?.016+.008*h2:.028+.012*h2;
    const hang=style==='loose'&&!edgeCard;
    let ax=fy*nz-fz*ny,ay=fz*nx-fx*nz,az=fx*ny-fy*nx;const al=Math.hypot(ax,ay,az)||1;ax/=al;ay/=al;az/=al;
    // shade per card; an older head goes grey at the temples only (R3: grey anywhere at .6 was
    // 3-14x the hair's own value and read as stripes and paper tags)
    // polish: .45 grey on a card read as a grey tile; .10-.26, varied card to card, reads as salt
    const shade=.82+.36*h3,grey=v<2&&h2<.35&&Math.abs(px)>.045?.10+.16*hashF(i,seed+4):0;
    const cr=(hc[0]*shade)*(1-grey)+GREY[0]*grey,cg=(hc[1]*shade)*(1-grey)+GREY[1]*grey,cb=(hc[2]*shade)*(1-grey)+GREY[2]*grey;
    const uOff=h1*3,uSpan=w/.04,base=pos.length/3;
    for(let k=0;k<=K;k++){
      const t=k/K,lift=hang?.002+.005*t:edgeCard?.0025+.0015*t:.003+.004*t,sag=hang?len*.30*t*t:0;
      // R3: a straight card rooted tangent to a round skull stands off it at the tip (6.5 cm of
      // card, 2 cm of air: spikes, and stray cards edge-on in the air). Every style but loose
      // is combed along the skull instead: an arc of 9 cm radius from the root.
      const s=len*t,along=hang?s:.09*Math.sin(s/.09),drop=hang?0:.09*(1-Math.cos(s/.09));
      const cx=px+fx*along+nx*(lift-drop),cy=py+fy*along+ny*(lift-drop)-sag,cz=pz+fz*along+nz*(lift-drop);
      const hw=w*.5*(1-.35*t);
      pos.push(cx-ax*hw,cy-ay*hw,cz-az*hw,cx+ax*hw,cy+ay*hw,cz+az*hw);
      nor.push(nx,ny,nz,nx,ny,nz);
      uvs.push(uOff,t*.98,uOff+uSpan,t*.98);
      col.push(cr,cg,cb,cr,cg,cb);
    }
    for(let k=0;k<K;k++){const r=base+k*2;idx.push(r,r+1,r+2,r+1,r+3,r+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);return g;
}
function defaultHair(style,variant){
  if(style==='roan')return 'slicked';
  const v=variant%4,w=Math.floor(variant/4)%3;
  return v>=2?(w===2?'loose':'tied'):(w===1?'loose':'cropped');
}
function hairSet(style,v,hstyle,colour,wardrobe,capY){
  const key='hair:'+style+':'+v+':'+hstyle+':'+colour+':'+wardrobe+':'+(capY===null?'-':capY.toFixed(3));
  if(cache.has(key))return cache.get(key);
  const hc=HAIR[colour&3].map(n=>n*(wardrobe===1?1.30:1)),seed=v*7+wardrobe,parts=[];
  const scalp=hairCap(v,hc,seed,hstyle);parts.push(scalp.cap);
  parts.push(hairCards(v,hstyle,hc,capY,seed+colour*13,scalp));
  // Brows follow each anatomical eye instead of a generic strip across the forehead.
  for(const [x,y,z] of headGeometry(v).eyes){
    const s=x<0?-1:1;
    parts.push(bandUV(tint(tendon([[x-s*.012,y+.014,z-.017],[x,y+.018,z-.016],[x+s*.015,y+.012,z-.008]],.0020,.0011,14,6),hc.map(n=>n*.60))));
  }
  if(hstyle==='tied'){
    // the tie at the nape and the strands drawn back into it
    oval(parts,v===2?.023:-.022,.174,.071,.045,.051,.037,hc);bandUV(parts[parts.length-1]);
    for(let i=0;i<8;i++)parts.push(bandUV(tint(tendon([[Math.cos(i*.82)*.054,.223,-.005],[Math.cos(i*.82)*.062,.172,.040],[.018,.150,.080]],.0068,.0032,17,6),hc.map(n=>n*(.85+i*.045)))));
  }
  if(hstyle==='slicked'){
    // Roan: flat to the skull and combed back (the cards lie along it), and the gold tooth at
    // the mouth line. R3: the dark oval that was his slicked mass stood 9 cm off the back of
    // his skull like a ball; it is gone, his hair is its black instead, and the seven combed
    // strands run ON the scalp (donor head 3, measured: top .290 on the midline falling
    // ~3.5*x*x to the side, the back of the crown .233 at z .03), not through it and off it.
    for(let i=0;i<7;i++){
      const x=(i-3)*.022,top=.290-3.5*x*x;
      parts.push(bandUV(tint(tendon([[x*.95,top-.006,-.085],[x,top+.004,-.020],[x*1.05,top-.040,.036]],.0045,.0026,14,6),HAIR[1].map(n=>n*(.82+i*.04)))));
    }
    oval(parts,.011,.128,-.104,.0042,.0036,.0024,[.198,.154,.056]);bandUV(parts[parts.length-1]);
  }
  const g=finishIndexed(parts);cache.set(key,g);return g;
}

/* ============================================================ THE CLOTHES == */
function clothing(style,variant,palette){
  const key=style+':'+variant+':'+palette;if(cache.has(key))return cache.get(key);
  const v=variant%4,wardrobe=Math.floor(variant/4)%3,PAL=PALETTES[palette]||PALETTES.default;
  // THE THREE FIXED FACES (greer, roan, sheet) are civilian coats underneath with an authored
  // silhouette over it, so they animate on the same rig as everybody else and still read
  // apart at twenty metres. hamlet-guard is a villager with a rifle.
  const authored=style==='greer'||style==='roan'||style==='sheet';
  const civilian=style==='resident'||style==='cashier'||style==='hamlet-guard'||authored;
  const torso=[],upper=[],fore=[],thigh=[],shin=[],headwear=[],hands=[];
  const c=style==='dealer'?[.065,.088,.078]:civilian?PAL.coats[v].map(n=>n*(wardrobe===1?.88:1)):[.067,.080,.067];
  const armored=style==='marshal'||style==='dealer',scarf=PAL.scarves[(v+wardrobe)%4];
  const cut=civilian?(style==='cashier'?'apron':PAL.cuts[wardrobe]):'coat';
  // R3: .7-1.4 cm in, and the sleeve head no longer puffs above the seam: padded, squared
  // shoulders made every head look small and every neck long
  const shoulder=[.198,.206,.184,.188][v],waist=[.155,.173,.146,.154][v];
  let capY=null;
  // A sloping shoulder seam, fitted waist and flared hem give the coat its cut.
  // The sleeve cap stays below the neck instead of forming a spherical shoulder.
  let hem=cut==='shawl'?.61:.75;
  if(cut==='longcoat'){
    hem=.42;
    garment(torso,[[hem,.222,.146],[hem+.08,.218,.142],[.62,.210,.134],[.78,.200,.128],[.89,.188,.126],[1.01,waist+.004,.112],
      [1.15,waist+.014,.118,-.004],[1.30,shoulder-.002,.121],[1.368,shoulder+.004,.106],
      [1.415,shoulder-.024,.090],[1.448,shoulder-.075,.080,-.004],[1.470,.092,.080,-.012],[1.480,.070,.068,-.026]],c,variant,'longcoat');
    box(torso,0,.62,.128,.010,.36,.006,seam);                       // the vent
    box(torso,0,.99,-.004,.36,.040,.242,c.map(n=>n*.55));           // the belt
    box(torso,0,.99,-.132,.046,.046,.018,BRASS);
  }else if(cut==='jumper'){
    hem=.92;
    garment(torso,[[hem,.190,.122],[hem+.03,.194,.126],[1.01,waist+.010,.114],[1.15,waist+.020,.120,-.004],
      [1.30,shoulder-.004,.122],[1.368,shoulder+.004,.106],[1.415,shoulder-.024,.090],[1.448,shoulder-.075,.080,-.004],[1.470,.090,.078,-.012],[1.482,.076,.072,-.024]],c,variant,'knit');
    garment(torso,[[hem-.015,.196,.128],[hem+.02,.194,.126]],c.map(n=>n*.62),variant,'plain');             // the ribbed welt
    // rolled collar, inside the scarf every civilian wears over it (it used to stand through it)
    garment(torso,[[1.458,.078,.076,-.014],[1.478,.078,.076,-.020],[1.492,.072,.070,-.026]],c.map(n=>n*.84),variant,'plain');
  }else{
    garment(torso,[[hem,.194,.121],[hem+.065,.198,.127],[.89,.184,.125],[1.01,waist,.110],
      [1.15,waist+.012,.117,-.004],[1.30,shoulder-.002,.121],[1.368,shoulder+.004,.106],
      [1.415,shoulder-.024,.090],[1.448,shoulder-.075,.080,-.004],[1.470,.092,.080,-.012],[1.480,.070,.068,-.026]],c,variant,'coat');
  }
  if(cut!=='jumper'){
    // Open lapels, layered collar, working pockets and buttons have actual thickness.
    const pocketY=cut==='longcoat'?.93:1.005;
    for(const side of [-1,1]){
      const lapel=new THREE.Shape();
      const points=[[.044,1.457],[.099,1.405],[.075,1.369],[.046,1.279],[.014,1.393]];
      points.forEach(([x,y],i)=>i?lapel.lineTo(side*x,y):lapel.moveTo(side*x,y));lapel.closePath();
      const fold=new THREE.ExtrudeGeometry(lapel,{depth:.008,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2,steps:1});
      const fp=fold.attributes.position;
      for(let i=0;i<fp.count;i++){const t=Math.max(0,Math.min(1,(1.455-fp.getY(i))/.115));fp.setZ(i,fp.getZ(i)-.084-.034*t);}
      fold.computeVertexNormals();if(cut!=='apron'||!civilian)torso.push(tint(fold,c.map(n=>n*1.22)));else fold.dispose();
      box(torso,side*.112,pocketY,-.108,.088,.115,.016,c,side*.11);
      box(torso,side*.112,pocketY+.052,-.119,.09,.014,.020,c.map(n=>n*.68));
      box(torso,side*.146,hem+.075,-.119,.009,.10,.006,seam,side*.08);
    }
    for(let i=0;i<(cut==='longcoat'?5:4);i++)oval(torso,.005,1.255-i*.102,-.122,.0055,.0055,.003,[.24,.215,.16]);
    // Jacket closure and back yoke are seams in the garment, visible at conversational distance.
    const seamColour=c.map(n=>n*.60);
    const stitch=(pts,r=.0018)=>{torso.push(tint(tendon(pts,r,r,18,5),seamColour));};
    stitch([[.012,hem+.025,-.129],[.009,.95,-.117],[.006,1.16,-.125],[.006,1.38,-.097]]);
    stitch([[-.155,1.31,.066],[0,1.30,.124],[.155,1.31,.066]]);
    for(const side of [-1,1]){
      stitch([[side*.190,hem+.03,.005],[side*waist,1.0,.007],[side*shoulder,1.30,.025]]);
      if(!civilian)box(torso,side*.116,1.31,-.117,.009,.016,.008,[.25,.23,.18]);
    }
  }
  garment(torso,[[1.440,.074,.075,-.012],[1.464,.071,.072,-.020],[1.486,.069,.069,-.028]],[.16,.148,.124]);   // the shirt collar
  if(civilian){
    // A woven scarf (a streamer in Highwood) and individually sewn workwear break the uniform.
    // R3: wrapped low and bulky round the neck, its top 1.6 cm under the chin, not a column to it;
    // a man's a centimetre bulkier, because his thicker neck swings further inside it when he
    // turns his head to you (measured: none of the neck crosses the wrap at any look it can take)
    garment(torso,v<2?[[1.430,.094,.094,-.014],[1.456,.093,.093,-.020],[1.478,.091,.090,-.026],[1.494,.088,.087,-.032]]
      :[[1.430,.086,.086,-.012],[1.456,.084,.084,-.018],[1.478,.081,.080,-.024],[1.494,.078,.077,-.030]],scarf,variant,'scarf');
    const wrap=new THREE.Shape();
    for(const [i,[x,y]] of [[-.047,1.442],[.024,1.431],[.052,1.304],[.024,1.235],[-.026,1.278]].entries())i?wrap.lineTo(x,y):wrap.moveTo(x,y);
    wrap.closePath();const hanging=new THREE.ExtrudeGeometry(wrap,{depth:.008,steps:1,bevelEnabled:true,bevelSize:.004,bevelThickness:.003,bevelSegments:2});
    const hp=hanging.attributes.position;
    for(let i=0;i<hp.count;i++){const t=Math.max(0,Math.min(1,(1.440-hp.getY(i))/.12));hp.setZ(i,hp.getZ(i)-.094-.037*t+Math.sin(hp.getX(i)*90)*.002);}
    hanging.computeVertexNormals();torso.push(tint(hanging,scarf.map(n=>n*.85)));
    if(cut==='shawl'){
      // A broad shoulder shawl tapers over the coat rather than inflating the arms.
      garment(torso,[[1.19,shoulder+.012,.131],[1.30,shoulder+.02,.132],[1.384,shoulder-.002,.111],[1.435,.093,.075]],c.map(n=>n*1.48),variant,'coat');
      for(let i=0;i<9;i++)torso.push(tint(tendon([[(i-4)*.034,1.20,-.116],[(i-4)*.035,1.177,-.117],[(i-4)*.035+.003,1.163,-.112]],.0022,.0013,6,5),scarf));
    }else if(cut==='apron'){
      const apron=PAL.apron||c.map((n,i)=>n*[1.27,1.16,.94][i]);
      box(torso,0,1.15,-.130,.183,.255,.015,apron);
      box(torso,0,.87,-.142,.267,.314,.014,apron);
      box(torso,.035,1.026,-.144,.111,.086,.010,apron.map(n=>n*.78));
      for(const side of [-1,1])box(torso,side*.068,1.338,-.119,.025,.215,.012,apron,side*-.15);
    }
  }
  if(armored){
    garment(torso,[[1.00,waist+.009,.128],[1.08,waist+.025,.141],[1.30,shoulder+.009,.145],[1.36,shoulder-.012,.115]],[.077,.084,.077]);
    for(const x of [-.115,0,.115]){box(torso,x,1.11,-.151,.09,.16,.044,leather);box(torso,x,1.192,-.154,.093,.020,.046,c);}
    box(torso,0,1.30,-.149,.27,.024,.016,[.11,.118,.108]);
  }
  if(style==='cashier')box(torso,-.096,1.30,-.137,.032,.047,.008,[.42,.30,.09]);
  garment(upper,[[.022,.010,.012],[.012,.036,.040],[-.004,.053,.057],[-.045,.060,.059],[-.12,.058,.055],[-.25,.050,.049],[-.31,.048,.048]],c,variant,'sleeve');
  // the forearm to -.30 (D16 proportions), the cuff band with it
  garment(fore,[[.023,.049,.049],[-.032,.052,.052],[-.125,.050,.049],[-.255,.040,.039],[-.30,.037,.037]],c,variant+1,'cuff');
  garment(fore,[[-.269,.040,.042],[-.303,.039,.040]],c.map(n=>n*.56));
  const skin=SKIN[v];
  // The hand moves down to the new wrist and gives back what the forearm took (a 7.4 cm palm,
  // 5.2 cm fingers): the fingertips still hang at mid-thigh, .68 m, not at the knee.
  garment(hands,[[-.287,.026,.021],[-.309,.031,.022],[-.338,.034,.021],[-.361,.030,.020]],skin,v);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.015,y=-.357+Math.abs(i-1.5)*.004, length=.052-Math.abs(i-1.5)*.008;
    // polish: curled at rest, the little finger most (i 0) and the index least: flat fingers were
    // half of what read as a shop dummy's hand
    const curl=1+.30*(3-i)/3;
    hands.push(tint(tendon([[x,y,-.002],[x,y-length*.42,-.012*curl],[x,y-length*.78,-.030*curl],[x,y-length*.90,-.039*curl]],.0074,.0054,12,8),skin));
    oval(hands,x,y-.004,.016,.008,.010,.002,skin.map(n=>n*1.07));
  }
  hands.push(tint(tendon([[.027,-.326,0],[.043,-.343,-.01],[.041,-.366,-.026]],.010,.007,12,8),skin));
  const trousers=civilian?PAL.trousers[v]:seam;
  garment(thigh,[[.035,.092,.101],[0,.098,.106],[-.12,.086,.095],[-.30,.069,.074],[-.41,.067,.070]],trousers,variant,'trouser');
  garment(shin,[[.025,.068,.071],[-.025,.071,.073],[-.13,.066,.074],[-.30,.054,.061],[-.37,.055,.060]],trousers,variant+1,'trouser');
  // boots live in the shin part now (one draw per leg, not two); leather is a colour here
  oval(shin,0,-.375,-.055,.077,.065,.143,leather);
  // the upper runs down to .428 and the sole overlaps it; the sole's underside is the leg's lowest
  // point and lands on the model's origin standing (it was the boot oval, 1 cm above it, and the
  // pool's foot-plane measure falls back to 0 for any rig with an empty mesh: those stood 1 cm up)
  garment(shin,[[-.310,.073,.078],[-.355,.076,.095,-.026],[-.412,.080,.142,-.05],[-.428,.079,.141,-.05]],leather);
  sole(shin,-.4485,.077,.139,-.050,.032,[.022,.019,.016]);       // under the boot ring (.080 x .142), 3 mm in
  for(let i=0;i<4;i++)box(shin,0,-.328-i*.016,-.107-i*.008,.069,.005,.008,[.084,.075,.060],i%2?.09:-.09);
  if(style==='sentry'||style==='cashier'||(civilian&&v===0&&wardrobe===2&&!PAL.hat)){
    garment(headwear,[[.213,.077,.084,-.018],[.240,.083,.087,-.019],[.273,.071,.073,-.024],[.299,.042,.045,-.024],[.306,.004,.004,-.024]],civilian?scarf:c,variant,'plain');
    garment(headwear,[[.215,.079,.086,-.018],[.236,.084,.089,-.019]],(civilian?scarf:c).map(n=>n*.72));
    capY=.213;
  }
  if(civilian&&PAL.hat&&wardrobe===2&&!authored){
    // a paper party hat, its elastic under the chin long gone, in a streamer colour
    garment(headwear,[[.235,.074,.074,-.012],[.30,.052,.052,-.008],[.40,.018,.018,-.004],[.43,.003,.003,-.002]],scarf,variant,'plain');
    oval(headwear,0,.43,-.002,.010,.010,.010,scarf.map(n=>n*1.3));
    capY=.235;
  }

  /* ============================================ THE THREE FIXED FACES ============ */

  // GREER, the eel-trapper out of Eelwater. Waxed thigh-length coat over hip waders, the
  // poacher rifle slung across her back, a wool cap, gloves, and a lantern hook on the belt.
  // Everything about her says she works on water in the dark and expects to come back.
  if(style==='greer'){
    const wax=[.038,.046,.043],rubber=[.030,.034,.036];
    // the coat: a long waxed skirt hanging past the knee, cut at the back for walking
    garment(torso,[[.52,.212,.132],[.62,.206,.128],[.78,.196,.124],[.95,.176,.114],[1.10,.170,.112]],wax,variant,'coat');
    for(const side of [-1,1])box(torso,side*.148,.70,-.086,.014,.42,.010,wax.map(n=>n*1.6),side*.03);
    // the belt, its buckle and the lantern hook
    box(torso,0,1.00,-.006,.372,.042,.238,[.052,.041,.033]);
    box(torso,0,1.00,-.133,.052,.050,.020,BRASS);
    torso.push(tint(tendon([[.152,1.00,-.055],[.176,.962,-.048],[.158,.928,-.040]],.0075,.0055,14,6),BRASS));
    // the rifle, slung muzzle-down across the back
    const bx=-.062,by=1.12,bz=.152;
    torso.push(tint(tendon([[bx-.09,by+.30,bz],[bx+.05,by-.22,bz+.02]],.0135,.0135,12,6),[.062,.055,.046]));
    box(torso,bx+.02,by-.10,bz+.03,.052,.30,.048,[.072,.050,.034],.24);
    torso.push(tint(tendon([[bx-.20,by+.44,bz-.02],[bx+.09,by-.40,bz+.04]],.0165,.0110,14,6),[.052,.056,.054]));
    box(torso,0,1.22,.128,.052,.30,.014,[.048,.042,.036],.30);      // the sling
    // hip waders: the legs go dark and heavy from the thigh down
    garment(thigh,[[.045,.101,.110],[0,.107,.115],[-.14,.096,.104],[-.31,.079,.084],[-.41,.077,.080]],rubber,variant,'trouser');
    garment(shin,[[.030,.078,.081],[-.03,.081,.083],[-.14,.077,.085],[-.30,.066,.073],[-.37,.068,.073]],rubber,variant+1,'trouser');
    sole(shin,-.4485,.080,.142,-.050,.038,[.022,.024,.025]);      // the wader's heavier sole, flush with the boot
    // gloves, and a cap with cropped hair under it
    garment(hands,[[-.280,.032,.027],[-.320,.037,.028],[-.360,.038,.026],[-.382,.032,.023]],[.056,.048,.040],v);
    // MEASURED ON THE HEAD, not guessed: the wool cap's lowest ring has to clear the brows,
    // which sit at head-local 0. At .196 the turn-up landed across her eyes.
    garment(headwear,[[.222,.088,.094,-.016],[.250,.093,.098,-.018],[.278,.081,.084,-.022],[.302,.046,.048,-.024],[.309,.006,.006,-.024]],[.061,.074,.070],variant,'plain');
    box(headwear,0,.226,-.082,.172,.022,.030,[.042,.052,.049]);
    capY=.222;
  }

  // ROAN, the ex-toll man out of The Cut. A sheepskin jacket worn open over a collarless
  // shirt, slicked hair, a ring, and one gold tooth. He stands too close; the jacket is cut
  // short so the whole of him is in your way. (The hair and the tooth are in hairSet.)
  if(style==='roan'){
    const fleece=[.196,.176,.138],hideC=[.086,.060,.038],gold=[.198,.154,.056];
    // the jacket: short, square, and the collar is up
    garment(torso,[[.92,.202,.136],[1.02,.198,.134],[1.16,.200,.135],[1.30,.208,.139],[1.372,.196,.118]],hideC,variant,'coat');
    for(const side of [-1,1]){
      // the fleece collar and the open lapel rolls
      torso.push(tint(tendon([[side*.020,1.470,-.082],[side*.112,1.400,-.090],[side*.140,1.270,-.066],[side*.098,1.150,-.062]],.0235,.0165,20,7),fleece));
      box(torso,side*.176,1.10,.012,.024,.34,.132,fleece,side*.05);
    }
    box(torso,0,.96,-.010,.352,.038,.226,[.048,.038,.030]);           // the belt
    box(torso,0,.96,-.126,.046,.046,.018,gold);
    // the shirt, open at the throat
    garment(torso,[[1.30,.148,.104],[1.40,.128,.088],[1.452,.096,.066,-.008]],[.200,.192,.172],variant,'plain');
    // the ring: one warm point, and it is him
    oval(hands,-.020,-.336,-.008,.0125,.0125,.0125,gold);
  }

  // TOBIN, Highwood. A full bedsheet from the shoulders to a cut hem, two dark eye holes,
  // a rope belt, boots showing, and a flat cap ON TOP OF THE SHEET. The arms come through
  // slits in sheet-coloured sleeves so the rig's pivots still animate underneath. He has not
  // taken it off since the last night the sun set and nobody in Highwood mentions it.
  if(style==='sheet'){
    const white=[.62,.60,.55],under=[.34,.33,.31],rope=[.128,.104,.064];
    // R3: the body of the sheet ends on the shoulders; the part over his head is headwear (below),
    // so it turns when he turns to look at you. It used to stop at his nose, with his face out
    // over the top and the eye holes cut at his chest.
    // polish: cinched at the rope (1.06), folds and a ragged hem from the 'sheet' cut
    garment(torso,[[.35,.360,.300],[.52,.330,.276],[.74,.292,.244],[.98,.252,.212],[1.06,.226,.190],[1.14,.224,.188],[1.22,.216,.182],
      [1.45,.190,.160],[1.50,.165,.140],[1.535,.110,.100]],white,variant,'sheet');
    // the underside of the hem, so the sheet reads as cloth over a person and not as a cone
    garment(torso,[[.34,.352,.294],[.40,.340,.284]],under,variant,'sheet');
    // the rope belt: a ring round the cinch, never through it. It was a box whose four corners
    // stood 3 cm out of the sheet at both hips (1.46 on the sheet's ellipse, anything over 1 is out).
    garment(torso,[[1.045,.2165,.1805],[1.052,.2235,.1875],[1.060,.2265,.1905],[1.068,.2235,.1875],[1.075,.2165,.1805]],rope,variant,'plain');
    torso.push(tint(tendon([[.050,1.050,-.178],[.066,1.000,-.172],[.058,.930,-.166]],.0085,.0060,14,6),rope));
    oval(torso,.046,1.058,-.182,.013,.011,.009,rope.map(n=>n*.85));                                // the knot
    // sleeves in the same cloth, so an arm reads as an arm through the sheet (closed over the
    // shoulder: an open tube top showed from any height)
    garment(upper,[[.062,.012,.012],[.042,.052,.054],[.020,.066,.070],[-.06,.068,.072],[-.19,.062,.065],[-.31,.055,.056]],white,variant,'sleeve');
    garment(fore,[[.026,.058,.058],[-.06,.058,.058],[-.19,.049,.048],[-.30,.042,.042]],white,variant+1,'cuff');
    // the hood: head-local, measured round donor head 1 (ears x .079, nose z -.141, crown .29)
    // with 1.5-2.5 cm of cloth to spare, its skirt tucked inside the sheet's shoulders
    garment(headwear,[[.030,.120,.115,-.030],[.080,.092,.100,-.040],[.110,.090,.110,-.045],[.150,.094,.112,-.046],
      [.200,.092,.110,-.042],[.250,.080,.094,-.040],[.290,.058,.068,-.036],[.315,.012,.012,-.032]],white,variant,'plain');
    // the eye holes, over his eyes (local y .189), centred on the cloth (z -.143 there)
    // cut by hand: not a pair, one wider and a little lower than the other
    oval(headwear,-.037,.188,-.144,.022,.014,.007,[.014,.013,.012]);
    oval(headwear,.035,.192,-.143,.018,.016,.007,[.014,.013,.012]);
    // the flat cap, on top of the sheet, which is the joke
    garment(headwear,[[.258,.084,.097,-.040],[.282,.088,.100,-.040],[.306,.072,.084,-.038],[.322,.030,.034,-.036]],[.092,.086,.068],variant,'plain');
    box(headwear,0,.258,-.132,.184,.018,.062,[.070,.066,.052],.06);
    capY=.238;
  }
  const set={shoulder,capY,cut,torso:finish(torso),upper:finish(upper),fore:finish(fore),thigh:finish(thigh),shin:finish(shin),headwear:finish(headwear),hands:finish(hands)};
  // The hands are drawn with the skin program too, and every mesh on it must carry the jaw
  // weight: a missing attribute reads whatever generic value the last program left there.
  set.hands.setAttribute('jawW',new THREE.BufferAttribute(new Float32Array(set.hands.attributes.position.count),1));
  cache.set(key,set);return set;
}

// The guns, cached per style: the sentry's short service rifle, and the hamlet guard's
// hunting rifle (C15): a longer, thinner barrel on a wood stock, no receiver plates.
function gunGeometry(style){
  const key='gun:'+style;if(cache.has(key))return cache.get(key);
  const p=[];
  if(style==='hamlet-guard'){
    box(p,0,-.030,.19,.058,.105,.30,WOOD);                      // the butt
    box(p,0,-.112,-.01,.048,.15,.080,WOOD,.12);                 // the grip
    box(p,0,.008,-.19,.050,.052,.46,WOOD);                      // the forend
    box(p,0,.030,-.05,.052,.068,.22,[.07,.075,.071]);           // the receiver
    p.push(tint(tendon([[.026,.052,-.02],[.058,.040,-.03]],.007,.005,6,6),[.11,.12,.11]));   // the bolt
    const barrel=new THREE.CylinderGeometry(.011,.013,.72,12);barrel.rotateX(Math.PI/2);barrel.translate(0,.026,-.57);p.push(tint(barrel,[.11,.12,.11]));
    box(p,0,.045,-.90,.010,.014,.010,[.14,.15,.14]);            // the foresight
  }else{
    box(p,0,0,0,.065,.11,.26,[.07,.075,.071]);
    box(p,0,-.025,.19,.083,.13,.24,leather);box(p,0,-.115,-.01,.057,.17,.085,leather,.12);
    box(p,0,-.096,-.10,.049,.17,.105,[.057,.065,.061]);
    box(p,0,.047,-.28,.070,.038,.33,[.07,.078,.072]);
    const barrel=new THREE.CylinderGeometry(.016,.019,.57,14);barrel.rotateX(Math.PI/2);barrel.translate(0,.025,-.40);p.push(tint(barrel,[.11,.12,.11]));
    for(let i=0;i<8;i++)box(p,0,.024,-.13-i*.028,.077,.061,.012,[.041,.046,.044]);
  }
  const g=finish(p);cache.set(key,g);return g;
}

/* ================================================================ THE RIG ==
   The one who is talking: read lazily off the debug surface, because a rig has no ctx of
   its own. Any owner with a ctx may hand over a probe instead (setSpeakerProbe). */
let speakerProbe=null,dialogueSys=null,dialogueLookT=-9,speakingItem=null;
export function setSpeakerProbe(fn){speakerProbe=typeof fn==='function'?fn:null;}
function speakingRig(now){
  speakingItem=null;
  if(speakerProbe)return speakerProbe();
  if(now-dialogueLookT>1||now<dialogueLookT){
    dialogueLookT=now;
    const C=globalThis.__CURFEW,ctx=C&&C.ctx;
    dialogueSys=ctx&&ctx.systems&&typeof ctx.systems.get==='function'?(ctx.systems.get('dialogue')||null):null;
  }
  const act=dialogueSys&&dialogueSys.active;
  if(!act||!act.opts)return null;
  speakingItem=act;
  const e=act.opts.speakerEntity;
  return e?(e.built||e.human||e):null;
}
const _v=new THREE.Vector3(),_q=new THREE.Quaternion(),_g=new THREE.Vector3(),_b=new THREE.Vector3(),_a=new THREE.Vector3();
// THE CARRIED RIFLE (polish). At aim 0 the rifle used to hang at 45 degrees in front of the chest
// with no hand on it: every hamlet guard between shots, every sentry on his round. Now it stands
// at the right side the way a guard stands with one: butt on the ground by the boot, upright,
// leaning a little forward and out, the right hand round the barrel above the forend (it slides
// there, as a hand does, so the butt stays on the ground whatever the arm is doing). It lifts a
// hand's width off the ground while he walks, and swings up into the old aim pose by aim .4.
// Gun-local points: where the hand closes (the barrel just above the forend), and the butt's heel.
const CARRY={'hamlet-guard':{grip:[0,.022,-.44],butt:[0,-.030,.34]},sentry:{grip:[0,.025,-.46],butt:[0,-.025,.31]}};
const CARRY_X=Math.PI/2-.07,CARRY_Z=-.045;      // upright, the muzzle 4 degrees forward and 2.6 out
const FIST=[.004,-.372,-.027];                  // hand-local: where a bar lies in the curled fingers
const GROUND=.0040;                             // model-local: the underside of the soles, standing
const norm12=n=>((Math.floor(n)%12)+12)%12;

export function buildHuman(style='resident',variant=0,height=1.80,palette='default'){
  variant=norm12(variant);
  if(!PALETTES[palette])palette='default';
  let v=variant%4,wardrobe=Math.floor(variant/4)%3,hairStyle=defaultHair(style,variant),hairColour=style==='roan'?1:v;
  const group=new THREE.Group();group.name='human:'+style;
  group.userData.appearance=variant;
  const cloth=new THREE.MeshStandardMaterial({vertexColors:true,...characterMaps('cloth'),bumpScale:.0015,roughness:1,metalness:0});
  // SKIN (D16): physical, roughness .52 so a cheek has one highlight, specular .35 (dry skin
  // is below a dielectric's .5), a warm sheen at .2 for the peach-fuzz rim, the pore normal
  // map at .9. The program itself is skinSurface's.
  const skin=new THREE.MeshPhysicalMaterial({vertexColors:true,map:characterMaps('skin').map,normalMap:skinNormalMap(),
    roughness:.52,metalness:0,specularIntensity:.35,sheen:.2,sheenRoughness:.65,sheenColor:new THREE.Color(.55,.30,.22)});
  skin.normalScale.set(.9,.9);
  const eye=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.26,clearcoat:.65,clearcoatRoughness:.14});
  // the cornea: black, additive, no depth write. It contributes exactly one thing, the
  // reflection of a light, and shares the eye's program (same defines, other uniforms).
  const cornea=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.05,clearcoat:1,clearcoatRoughness:.05,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  // hair cards: alphaTest .5, both sides. Roughness .85: at .55 a crown seen from behind or
  // below caught the sky as a white sheen and a tied bun read as a glossy ball (polish, A/B'd in
  // game). No cast shadow: an alpha-tested double-sided caster would be a third program.
  const hairMat=new THREE.MeshStandardMaterial({vertexColors:true,map:strandTexture(),alphaTest:.5,side:THREE.DoubleSide,roughness:.85,metalness:0});
  skin.name='human-skin';cloth.name='human-clothing';eye.name='human-eyes';cornea.name='human-cornea';hairMat.name='human-hair';
  for(const m of [cloth,eye,cornea,hairMat])readableSurface(m);
  skinSurface(skin);
  const model=new THREE.Group();model.scale.setScalar(height/1.80);group.add(model);
  const mesh=(g,mat,parent=model,cast=true)=>{const m=new THREE.Mesh(g||new THREE.BufferGeometry(),mat);m.userData.sharedHuman=true;m.castShadow=cast;m.receiveShadow=false;m.visible=!!g;parent.add(m);return m;};
  let geo=clothing(style,variant,palette),H=headGeometry(v);
  const torso=mesh(geo.torso,cloth),head=new THREE.Group();head.position.y=HEAD_Y;head.scale.set(HEAD_SCALE[0],HEAD_SCALE[1],HEAD_SCALE[2]);model.add(head);
  head.rotation.order='YXZ';     // R3: turn, then nod about the turned head's own axis, as a neck does
  const face=mesh(H.head,skin,head);
  // ONE PERSON (polish): everything the hamlet authors about someone (variant, palette, hair, its
  // colour) names one face, one iris, one skin tone and a small shift in the value of the cloth and
  // the hair, so two people in the same coat are still two people. Faces and hands share the skin
  // material, so they share the tone. Material colours only: no program, no geometry per person.
  const lookId=()=>variant+12*Math.max(0,PALETTE_NAMES.indexOf(palette))+48*Math.max(0,HAIR_STYLES.indexOf(hairStyle))+192*(hairColour&3);
  skin.userData.jawHinge.value.set(JAW_HINGE[0],JAW_HINGE[1],JAW_HINGE[2]);
  const headwear=mesh(geo.headwear,cloth,head);
  const hair=mesh(hairSet(style,v,hairStyle,hairColour,wardrobe,geo.capY),hairMat,head,false);
  const eyeL=mesh(eyeGeometry(v),eye,head,false),eyeR=mesh(eyeGeometry(v),eye,head,false),lens=mesh(corneaGeometry(v),cornea,head,false);
  const dressFace=()=>{
    const id=lookId();
    face.geometry=faceGeometry(v,id);
    eyeL.geometry=eyeR.geometry=eyeGeometry(v,Math.floor(hashF(id,97)*IRIS.length));
    const tone=.88+.24*hashF(id,98),warm=(hashF(id,99)-.5)*.10;
    skin.color.setRGB(tone*(1+warm),tone,tone*(1-warm));
    const c=.95+.10*hashF(id,100),hv=.88+.24*hashF(id,101);
    cloth.color.setRGB(c,c,c);hairMat.color.setRGB(hv,hv,hv);
  };
  dressFace();
  const placeEyes=()=>{
    const e=H.eyes;eyeL.position.set(e[0][0],e[0][1],e[0][2]);eyeR.position.set(e[1][0],e[1][1],e[1][2]);
    lens.position.set((e[0][0]+e[1][0])*.5,e[0][1],e[0][2]);
  };
  placeEyes();
  // Tobin is under his sheet: nothing of his head shows, so nothing of it is drawn
  if(style==='sheet')hair.visible=eyeL.visible=eyeR.visible=lens.visible=false;
  let gun=null;const carryAt=CARRY[style==='hamlet-guard'?'hamlet-guard':'sentry'];
  if(style==='sentry'||style==='dealer'||style==='dogcaller'||style==='hamlet-guard'){   // ROUND 22 lane C: the dog-caller carries the rifle his poacher brain fires; C15: the hamlet guard
    gun=new THREE.Group();gun.position.set(.20,1.16,-.16);gun.rotation.order='ZYX';model.add(gun);mesh(gunGeometry(style),cloth,gun);
  }
  const arms=[],legs=[];
  for(let i=0;i<2;i++){
    const side=i?1:-1,pivot=new THREE.Group(),elbow=new THREE.Group();
    pivot.position.set(side*geo.shoulder,SHOULDER_Y,0);model.add(pivot);const upper=mesh(geo.upper,cloth,pivot);elbow.position.y=ELBOW_Y;pivot.add(elbow);const fore=mesh(geo.fore,cloth,elbow);
    const hand=mesh(geo.hands,skin,elbow);if(side<0)hand.scale.x=-1;arms.push({pivot,elbow,upper,fore,hand});
    const hip=new THREE.Group(),knee=new THREE.Group();hip.position.set(side*.106,HIP_Y,.006);model.add(hip);const thigh=mesh(geo.thigh,cloth,hip);knee.position.y=KNEE_Y;hip.add(knee);const shin=mesh(geo.shin,cloth,knee);legs.push({pivot:hip,knee,thigh,shin});
  }
  const scale=height/1.80;
  const zones=[{x:0,y:1.62,z:-.04,r:.14,zone:'head'}];
  for(const y of [.86,1.03,1.20,1.37])zones.push({x:0,y,z:0,r:.225,zone:'torso'});
  for(const side of [-1,1]){
    for(const y of [.11,.27,.44,.60,.76])zones.push({x:side*.106,y,z:0,r:.13,zone:'limb'});
    for(const y of [.80,.94,1.10,1.25,1.40])zones.push({x:side*.25,y,z:0,r:.10,zone:'limb'});
  }
  zones.forEach(z=>{z.x*=scale;z.y*=scale;z.z*=scale;z.r*=scale;});
  const countDraws=()=>{let n=0;group.traverse(o=>{if(o.isMesh&&o.visible)n++;});return n;};
  // animation state: all of it declared here, none of it allocated in animate()
  let clock=variant*.91,lookYaw=0,lookPitch=0,eyeYaw=0,eyePitch=0,shift=0,shiftDir=1,shiftAt=6+3*hashF(variant,1),shiftN=1,jawT=0,mouth=0,talking=false;
  // THE REST (polish). Arms hung dead straight, palms forward, fingers flat: at 1.5 m the whole
  // cast stood to attention like shop dummies, and the forearms sank 1.5-4 cm into the coat hips.
  // A person at rest carries the shoulder a little forward and out, the elbow soft, the palm
  // turned to the thigh with the thumb forward. Per person and per side, so no two stand alike.
  // (Tobin's arms are under his sheet: his stay close in.) All of it fades out as the gun comes up.
  // (a jumper's ribbed welt flares to the hip, so its wearer's arms hang a little further out)
  const restFor=n=>[0,1].map(i=>{
    const h=k=>hashF(n*2+i,40+k),under=style==='sheet',out=geo.cut==='jumper'?.025:0;
    return {x:under?.015:.045+.03*h(1),z:under?.06:.115+out+.03*h(2),e:under?.15:.24+.14*h(3),turn:1.05+.30*h(4)};
  });
  let rest=restFor(variant);
  // the hunting rifle's muzzle is a third of a metre further out than the service rifle's
  const muzzle=style==='hamlet-guard'?{x:.20*scale,y:1.19*scale,z:-.89*scale}:{x:.22*scale,y:1.32*scale,z:-.58*scale};
  const rig={group,gun,zones,scale:1,drawCount:0,gait:'walk',muzzle,shellMat:cloth,eyeMat:skin,contactMat:cloth,
    look:{variant,palette,hair:hairStyle},talking:false,
    reveal(){},telegraph(v){cloth.emissive.setRGB(v*.025,v*.032,v*.023);},deathGlow(){},
    animate(a={}){
      const move=a.moveAmp||0,phase=a.gait||0,aim=a.aim||0,limp=Math.max(0,Math.min(1,a.limp||0));
      let dt=1/60,now=clock;
      if(Number.isFinite(a.time)){const t=a.time+variant*.91;dt=Math.max(0,Math.min(.1,t-clock));clock=t;now=a.time;}
      const settle=Math.sin(phase*2-.7)*.007*move;
      // BREATH at .25 Hz (1.57 rad/s): the chest .012 deep, the shoulders rising 4 mm with it.
      const br=Math.sin(clock*1.57),breath=br*.012;
      torso.scale.z=1+breath;torso.position.y=settle;
      // WEIGHT SHIFT every 6-9 s while standing: the torso leans .01, the hips .006 the other way.
      if(clock>shiftAt){shiftDir=-shiftDir;shiftN++;shiftAt=clock+6+3*hashF(variant,shiftN);}
      shift+=(shiftDir-shift)*(1-Math.exp(-dt*1.6));
      const stand=1-move;
      torso.rotation.z=Math.sin(phase)*.013*move+shift*.010*stand;
      torso.rotation.y=Math.sin(phase)*.026*move;
      // HEAD TRACKING (C14): yaw toward anim.lookX/Y/Z when present, clamped +-.6 / -.05..+.22,
      // lerped at 6/s; the eyes lead by up to .15 rad and hold it when the neck runs out.
      let yawT=0,pitchT=0,eyeYawT=0,eyePitchT=0;
      if(a.lookX!=null&&Number.isFinite(a.lookX)){
        _v.set(a.lookX-group.position.x,a.lookY-group.position.y,a.lookZ-group.position.z);
        _q.copy(group.quaternion).invert();_v.applyQuaternion(_q);
        // R3: from the EYES, not the neck base 27 cm under them, which tipped every head back
        // .22 rad at 1.2 m to look down its nose at you. The head turns .6 and nods -.05..+.22,
        // and the eyes do the rest (.15 aside, .28 down since the polish, .10 up; a crouched player
        // at a metre was looked over): measured, that is as far as a
        // neck this thick can go inside the scarf without any of it coming through. A crouched
        // player is looked down at, never up at.
        _v.y-=(HEAD_Y+H.eyes[0][1]*head.scale.y)*scale;
        const flat=Math.hypot(_v.x,_v.z)||1e-4;
        const yawRaw=Math.atan2(-_v.x,-_v.z),pitchRaw=Math.atan2(_v.y,flat);
        yawT=Math.max(-.6,Math.min(.6,yawRaw));pitchT=Math.max(-.05,Math.min(.22,pitchRaw));
        eyeYawT=Math.max(-.15,Math.min(.15,yawRaw-lookYaw));eyePitchT=Math.max(-.28,Math.min(.10,pitchRaw-lookPitch));
      }
      const k=1-Math.exp(-6*dt);
      lookYaw+=(yawT-lookYaw)*k;lookPitch+=(pitchT-lookPitch)*k;
      eyeYaw+=(eyeYawT-eyeYaw)*Math.min(1,k*2.5);eyePitch+=(eyePitchT-eyePitch)*Math.min(1,k*2.5);
      head.position.y=HEAD_Y+settle*.45+breath*.25;
      head.rotation.y=Math.sin(clock*.21)*.055*(1-aim)+torso.rotation.y*.35+lookYaw;
      head.rotation.x=-.028+breath*.5+limp*.36+lookPitch;head.rotation.z=Math.sin(clock*.38)*.010+torso.rotation.z*.3;
      eyeL.rotation.y=eyeR.rotation.y=eyeYaw;eyeL.rotation.x=eyeR.rotation.x=eyePitch;
      // BLINK by closing the lids: the eyeballs and the cornea flatten about their own centre
      // for 140 ms every 4.7 s, instead of vanishing.
      const blinkPhase=(clock+v*.83)%4.7;
      const lid=blinkPhase>4.56&&blinkPhase<4.70?1-Math.abs((blinkPhase-4.63)/.07):0;
      const sy=1-.88*lid;
      eyeL.scale.y=eyeR.scale.y=lens.scale.y=sy;
      // THE MOUTH follows the words while this body is the one speaking: the subtitle is read
      // at the line's own pace, a vowel opens it, m/b/p close it, a space or a comma lets it
      // fall shut. No line to read (a probe) falls back to a chew with a slower beat under it.
      // Closes over ~0.1 s when the line ends. Reads three fields, allocates nothing.
      talking=speakingRig(now)===rig;rig.talking=talking;
      jawT+=((talking?1:0)-jawT)*(1-Math.exp(-dt*10));
      let target=.5+.5*Math.sin(clock*13.7)*(.7+.3*Math.sin(clock*5.3));
      const it=talking?speakingItem:null,txt=it&&it.line&&it.line.text;
      if(txt){
        const k=Math.min(txt.length-1,Math.floor(it.t/Math.max(.001,it.dur)*txt.length)),c=txt.charCodeAt(k)|32;
        target=it.t>=it.dur?0:(c===97||c===101||c===105||c===121)?1:(c===111||c===117)?.8:(c===109||c===98||c===112)?0:(c===102||c===118)?.15:(c>=97&&c<=122)?.45:0;
      }
      mouth+=(target-mouth)*(1-Math.exp(-dt*18));
      skin.userData.jaw.value=-JAW_OPEN*jawT*(.15+.85*mouth);
      // the carry: 1 at aim 0, gone by aim .4 (the right arm and the rifle blend together)
      let carry=gun?clamp(1-aim/.4,0,1):0;carry=carry*carry*(3-2*carry);
      for(let i=0;i<2;i++){
        const ph=phase+(i?Math.PI:0),s=i?1:-1;
        arms[i].pivot.position.y=SHOULDER_Y+(br*.5+.5)*.004;
        const R=rest[i],free=1-aim;
        arms[i].pivot.rotation.x=(Math.sin(ph-.16)*.32*move+aim*.80+R.x*free-(a.coil||0)*.8+(a.swing||0)*1.2)*(1-limp)+limp*.24;
        arms[i].pivot.rotation.z=s*(.04+(R.z-.04)*free)+(i?-.035:.62)*aim+s*limp*.20;
        arms[i].elbow.rotation.x=.12+(R.e-.12)*free+aim*(i?.66:.47)+Math.max(0,Math.sin(ph))*.16*move-limp*.4;
        arms[i].hand.rotation.y=s*R.turn*free;
        if(i===1&&carry>0){
          // the right arm comes a little forward and out to hold the rifle clear of the coat
          arms[i].pivot.rotation.x+=(.13-arms[i].pivot.rotation.x)*carry;
          arms[i].pivot.rotation.z+=(.145-arms[i].pivot.rotation.z)*carry;
          // bent enough that the forearm leans off the upright barrel above the fist; more while
          // walking, which lifts the rifle clear of the ground with the hand
          arms[i].elbow.rotation.x+=(.34+.30*move-arms[i].elbow.rotation.x)*carry;
          arms[i].hand.rotation.y+=(.45-arms[i].hand.rotation.y)*carry;
        }        legs[i].pivot.rotation.x=-Math.sin(ph)*.43*move;
        legs[i].knee.rotation.x=-Math.max(0,Math.sin(ph-.35))*.64*move;
        legs[i].pivot.rotation.z=-s*.018+Math.sin(phase)*.012*move-shift*.006*stand;
      }
      if(gun){
        const rx=-.80*(1-aim),rz=Math.sin(phase)*.01*move;
        gun.position.set(.20,1.16+settle,-.16);gun.rotation.set(rx,0,rz);
        if(carry>0){
          // where the right fist is now, in the model's space (the arm was posed above)
          const A=arms[1];A.hand.updateMatrix();A.elbow.updateMatrix();A.pivot.updateMatrix();
          _v.set(FIST[0],FIST[1],FIST[2]).applyMatrix4(A.hand.matrix).applyMatrix4(A.elbow.matrix).applyMatrix4(A.pivot.matrix);
          // the upright rifle through it, then (standing) slid along its own axis until the butt is down
          gun.rotation.set(CARRY_X,0,CARRY_Z);gun.updateMatrix();_q.copy(gun.quaternion);
          _g.set(carryAt.grip[0],carryAt.grip[1],carryAt.grip[2]).applyQuaternion(_q);
          _b.set(carryAt.butt[0],carryAt.butt[1],carryAt.butt[2]).applyQuaternion(_q);
          _a.set(0,0,-1).applyQuaternion(_q);
          _v.sub(_g);
          const t=(GROUND-(_v.y+_b.y))/_a.y*(1-move);
          _v.addScaledVector(_a,t);
          gun.position.set(.20+(_v.x-.20)*carry,1.16+settle+(_v.y-1.16-settle)*carry,-.16+(_v.z+.16)*carry);
          gun.rotation.set(rx+(CARRY_X-rx)*carry,0,rz+(CARRY_Z-rz)*carry);
        }
      }
    },
    // C14: a hamlet authors a face per person. Every Mesh swaps its geometry from the cached
    // sets (nothing is built twice, nothing is disposed here: the sets are shared) and the
    // tints come with the vertices. { variant 0-11, palette, hair, hairColour } — any field
    // may be left out and keeps its current value.
    setAppearance(look){
      if(!look)return rig.look;
      if(look.variant!=null&&Number.isFinite(look.variant))variant=norm12(look.variant);
      if(look.palette&&PALETTES[look.palette])palette=look.palette;
      if(look.hair&&HAIR_STYLES.includes(look.hair))hairStyle=look.hair;
      else if(look.variant!=null&&!look.hair)hairStyle=defaultHair(style,variant);
      v=variant%4;wardrobe=Math.floor(variant/4)%3;
      hairColour=look.hairColour!=null&&Number.isFinite(look.hairColour)?(look.hairColour&3):style==='roan'?1:v;
      geo=clothing(style,variant,palette);H=headGeometry(v);rest=restFor(variant);
      torso.geometry=geo.torso;face.geometry=H.head;
      headwear.geometry=geo.headwear||headwear.geometry;headwear.visible=!!geo.headwear;
      hair.geometry=hairSet(style,v,hairStyle,hairColour,wardrobe,geo.capY);
      lens.geometry=corneaGeometry(v);placeEyes();dressFace();
      for(let i=0;i<2;i++){
        arms[i].pivot.position.x=(i?1:-1)*geo.shoulder;
        arms[i].upper.geometry=geo.upper;arms[i].fore.geometry=geo.fore;arms[i].hand.geometry=geo.hands;
        legs[i].thigh.geometry=geo.thigh;legs[i].shin.geometry=geo.shin;
      }
      group.userData.appearance=variant;
      rig.look={variant,palette,hair:hairStyle};
      rig.drawCount=countDraws();
      return rig.look;
    },
    dispose(){cloth.dispose();skin.dispose();eye.dispose();cornea.dispose();hairMat.dispose();}
  };
  // Built with the rifle raised: the pool measures its foot plane off this first pose, and the
  // carried rifle stands ON that plane, so it must not be in the measure (its bounding box
  // corners reach below the butt).
  rig.drawCount=countDraws();rig.animate(gun?{aim:1}:{});return rig;
}
