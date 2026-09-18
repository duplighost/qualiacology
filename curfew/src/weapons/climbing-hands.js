import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loft,characterMaps} from '../art/character-sculpt.js';

// A brown leather work glove on a coat sleeve, and the arm it belongs to. Alex: "we need
// gloves. also i don't see a thumb... they look like robot hands with a circular thing in the
// middle... the hands are just detached from the body if you climb and look down they come from
// nothing. better if they came from off screen." So: no disc on the back, no seam wires, a
// rounded knuckle ridge with knuckles, four fingers side by side the way a hand grips and a thumb
// that stands out past the edge of the palm where it can be seen; a gauntlet cuff over the
// sleeve; a forearm to an elbow that bends at the wrist; and an upper arm placed every frame from
// that elbow back to a shoulder beside and below the eye, so the arm always leaves through the
// edge of the frame. At the top of a wall the hands go over the lip and lie flat on it.
// Hand-local frame: +Y runs up the fingers, +Z faces the camera (the back of the hand), and X
// is mirrored by `side` (-1 left, +1 right) so both hands have their thumbs on the inside.
// Geometry is merged by material; the five fingers, the forearm and the upper arm move.
export function climbingHandMaterials(){
 const leather=new THREE.MeshStandardMaterial({color:0x8f6848,vertexColors:true,roughness:.86,metalness:0,...characterMaps('leather'),bumpScale:.00085});
 const cloth=new THREE.MeshStandardMaterial({color:0x585244,vertexColors:true,roughness:.98,metalness:0,...characterMaps('cloth'),bumpScale:.0007});
 leather.name='worn-climbing-glove';cloth.name='climbing-coat-cuff';
 return{leather,cloth};
}
// The leather and cloth maps tile TEX times a metre in both directions. Each piece passes the
// scale of its own UVs (loft: u runs 0..2 round the section, v is 3 per metre along it), so a
// finger and a cuff get the same grain. One scale for everything stretched the grain three times
// round the back of the hand and it read as horizontal smears (r3 critic, z-glove-back.png).
const TEX=12;
const loftUV=perimeter=>[TEX*perimeter/2,TEX/3];
function batch(material){
 const parts=[];
 return{
  add(g,c=[.9,.86,.8],shade=null,[su,sv]=[.45,4]){
   if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}
   const p=g.attributes.position,uv=g.attributes.uv,colour=[];
   for(let i=0;i<p.count;i++){
    let grain=.93+.05*Math.sin(p.getX(i)*83+p.getY(i)*49)+.02*Math.cos(p.getY(i)*147-p.getZ(i)*91);
    if(shade)grain*=shade(p.getX(i),p.getY(i),p.getZ(i));
    colour.push(c[0]*grain,c[1]*grain,c[2]*grain);
    if(uv)uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);
   }
   if(!uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2));
   g.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));parts.push(g);
  },
  mesh(){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const m=new THREE.Mesh(geometry,material);m.frustumCulled=false;return m;},
 };
}
function oval(rx,ry,rz,x,y,z,ws=24,hs=16){const g=new THREE.SphereGeometry(1,ws,hs);g.scale(rx,ry,rz);g.translate(x,y,z);return g;}
const ovalUV=(r,ry)=>[TEX*2*Math.PI*r,TEX*Math.PI*ry];
// A coat sleeve along a curve: radius(t) along it, soft fabric folds, no swelling.
function sleeve(points,radius,{segments=28,radial=20,folds=.035,seed=0}={}){
 const curve=new THREE.CatmullRomCurve3(points.map(q=>new THREE.Vector3(...q)));
 const g=new THREE.TubeGeometry(curve,segments,1,radial,false),p=g.attributes.position,c=new THREE.Vector3();
 for(let j=0;j<=segments;j++){
  const t=j/segments,r=radius(t);curve.getPointAt(t,c);
  for(let i=0;i<=radial;i++){
   const k=j*(radial+1)+i,a=i/radial*Math.PI*2,f=r*(1+folds*(Math.sin(a*5+t*11+seed)*.6+Math.sin(a*3-t*7+seed)*.4));
   p.setXYZ(k,c.x+(p.getX(k)-c.x)*f,c.y+(p.getY(k)-c.y)*f,c.z+(p.getZ(k)-c.z)*f);
  }
 }
 g.computeVertexNormals();g.userData.length=curve.getLength();return g;
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// The four knuckles (hand-local x before the side mirror, and their row's y). Sculpted INTO the
// back of the hand as soft rises, so there is no seam or bead where a knuckle meets it.
const KNUCKLE_X=[-.030,-.010,.011,.0305],KNUCKLE_Y=.004;
const knuckleAt=(x,y,side)=>{let d=0;for(let k=0;k<4;k++){const u=(x-side*KNUCKLE_X[k])/.0078,v=(y-KNUCKLE_Y)/.0085;d+=Math.exp(-u*u-v*v);}return d;};
function raiseKnuckles(g,side,segments){
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const z=p.getZ(i);if(z>0)p.setZ(i,z+.0026*knuckleAt(p.getX(i),p.getY(i),side)*Math.min(1,z/.008));}
 g.computeVertexNormals();
 // Re-weld the loft's seam (it runs down the back of the hand), as loft() does.
 const n=g.attributes.normal,rings=p.count/(segments+1),a=new THREE.Vector3(),b=new THREE.Vector3();
 for(let j=0;j<rings;j++){const i0=j*(segments+1),i1=i0+segments;a.fromBufferAttribute(n,i0).add(b.fromBufferAttribute(n,i1)).normalize();n.setXYZ(i0,a.x,a.y,a.z);n.setXYZ(i1,a.x,a.y,a.z);}
 return g;
}

// The wrist, where the cuff and forearm turn (hand-local, x mirrored by side): just under the
// cuff's edge, inside the glove.
const WRIST=[0,-.106,.028];
// The elbow, hand-local (x mirrored by side): below the wrist, back toward the player and out
// to the side the way a climber's elbows go, so looking down between your arms you see the wall
// and not an elbow in the middle of the frame.
const ELBOW=[.085,-.345,.170];
// The shoulder, in the BODY's frame (metres right, up and forward of the eye; right mirrored by
// side): it turns with the look's yaw but not its pitch. It used to hang off the lens, so looking
// down swung both shoulders out in front of you and the arms crossed the frame with an elbow at
// the crosshair (r3 critic, c-downside-c.png).
const SHOULDER=[.22,-.30,-.10];
// Extra curl per finger (index, middle, ring, little, thumb): a hand on a ledge is not flat.
const REST=[0,.03,.06,.10,.10];
// Flat on the top of a wall: the fingers lift a little at the root so their curved length lies
// along the stone instead of digging into it; the thumb lies along the lip.
const FLAT=[.25,.25,.25,.25,.30];

export function buildClimbingHand(side,materials,{arm=true}={}){
 const root=new THREE.Group();root.name=(side<0?'left':'right')+'-climbing-hand';root.userData.side=side;
 const palm=batch(materials.leather),cuff=batch(materials.leather),cloth=batch(materials.cloth),fingers=[];
 // The back of the hand, wrist to knuckles about ten centimetres: it narrows into the wrist and
 // ends in a rounded knuckle ridge, not a flat cap the fingers poke out of. A little darker
 // toward the wrist, where the cuff shades it.
 palm.add(raiseKnuckles(loft([[-.128,.030,.025,0,.030],[-.100,.031,.024,0,.024],[-.072,.038,.023,-side*.003,.016],[-.040,.045,.021,-side*.003,.008],[-.010,.047,.019,-side*.002,.003],[.006,.046,.017,0,0],[.016,.041,.014,0,-.002],[.023,.031,.010,0,-.003],[.027,.006,.005,0,-.003]],{segments:36,subdivisions:4,folds:.010,seed:side}),side,36),[.92,.86,.78],(x,y,z)=>(.92+.08*smooth(-.105,-.06,y))*(1+(z>0?.07*knuckleAt(x,y,side):0)),loftUV(.20));
 // The gauntlet cuff: it flares from the wrist, where its edge lies just INSIDE the glove's own
 // surface (same centre, a millimetre smaller), so there is no ring standing proud of the hand
 // with a gap inside it; one leather, a shade darker, no separate hem. It turns with the forearm.
 cuff.add(loft([[-.186,.052,.051,side*.014,.078],[-.160,.047,.048,side*.006,.064],[-.136,.041,.041,0,.050],[-.120,.036,.033,0,.040],[-.110,.032,.027,0,.031],[-.100,.0295,.0215,0,.0245]],{segments:36,subdivisions:3,folds:.015,seed:side*3}),[.80,.74,.66],(x,y)=>.90+.10*smooth(-.18,-.11,y),loftUV(.26));
 // The thumb's mound, low on the inside of the palm.
 palm.add(oval(.019,.030,.017,-side*.032,-.046,-.004),[.88,.82,.74],null,ovalUV(.018,.030));
 root.add(palm.mesh());
 // The forearm, in the coat sleeve, from well inside the cuff to an elbow that never opens. It
 // hangs off the WRIST with the cuff, so both turn there when the hand lies flat on a ledge.
 const s=sleeve([[0,-.140,.047],[side*.035,-.235,.098],[side*ELBOW[0],ELBOW[1],ELBOW[2]]],t=>t<.22?.025+.018*smooth(0,.22,t):.043+.004*(t-.22)/.78,{seed:side*5});
 cloth.add(s,[.86,.86,.82],null,[TEX*s.userData.length,TEX*2*Math.PI*.042]);
 cloth.add(oval(.054,.054,.054,side*ELBOW[0],ELBOW[1],ELBOW[2],20,14),[.84,.84,.80],null,ovalUV(.054,.054));
 const wrist=new THREE.Group();wrist.name='climbing-wrist';wrist.position.set(side*WRIST[0],WRIST[1],WRIST[2]);
 for(const m of [cuff.mesh(),cloth.mesh()]){m.position.set(-side*WRIST[0],-WRIST[1],-WRIST[2]);wrist.add(m);}
 root.add(wrist);root.userData.wrist=wrist;
 const finger=(index,x,y,length,width,angle=0)=>{
  const b=batch(materials.leather),pivot=new THREE.Group();pivot.position.set(x,y,0);pivot.rotation.z=angle;
  // A gloved finger: broad and a little flat at the root where it meets its neighbour, a slight
  // waist at each joint, narrowing to a round blunt tip.
  const w=width,L=length;
  b.add(loft([[0,w*1.06,w*.90,0,0],[L*.14,w*1.08,w*.92,0,-.001],[L*.36,w*.96,w*.84,0,-.003],[L*.47,w*.97,w*.86,0,-.007],[L*.62,w*.88,w*.80,0,-.013],[L*.74,w*.83,w*.76,0,-.019],[L*.86,w*.80,w*.72,0,-.026],[L*.95,w*.70,w*.62,0,-.031],[L*.99,w*.45,w*.40,0,-.033],[L*1.005,w*.08,w*.08,0,-.033]],{segments:24,subdivisions:4,folds:.010,seed:index}),[.95,.90,.82],(x,y)=>.80+.20*smooth(0,L*.3,y),loftUV(Math.PI*1.8*w));
  pivot.add(b.mesh());root.add(pivot);fingers.push({pivot,angle,index});
 };
 // Index to little finger, side by side with only a little spread, the way a hand takes a hold.
 // Mirrored by side: the index finger is always the one beside the thumb.
 finger(0,side*-.030,.012,.073,.0106,side*.035);finger(1,side*-.0100,.018,.083,.0112,side*.008);
 finger(2,side*.0110,.017,.078,.0108,side*-.012);finger(3,side*.0305,.010,.062,.0094,side*-.045);
 // The thumb stands out past the palm's edge where it shows, and turns in toward the palm the
 // way a thumb does, rather than straight out to the side.
 finger(4,-side*.040,-.040,.058,.0135,side*.44);fingers[4].pivot.position.z=-.008;fingers[4].pivot.rotation.y=-side*.18;
 root.userData.fingers=fingers;
 // g: grip, 0 open .. 1 closed. flat: 0 on the face of the wall .. 1 lying on the top of it.
 root.userData.pose=(g,flat=0)=>{for(let k=0;k<fingers.length;k++){const f=fingers[k],wall=-.025-REST[f.index]-g*(f.index===4?.28:.24);f.pivot.rotation.x=wall+(FLAT[f.index]-wall)*flat;}};
 if(arm){
  // The upper arm: a unit tube along +Y, stretched and aimed from the elbow to the shoulder
  // every frame by placeClimbingHand.
  const up=batch(materials.cloth);
  up.add(loft([[0,.047,.047],[.12,.052,.051],[.5,.057,.055],[1,.061,.059]],{segments:28,subdivisions:3,folds:.04,seed:side*7}),[.80,.80,.76],null,[TEX*2*Math.PI*.055/2,TEX*.5/3]);
  const upper=up.mesh();upper.name='climbing-upper-arm';upper.matrixAutoUpdate=false;
  root.add(upper);root.userData.arm=upper;
 }
 return root;
}

const origin=new THREE.Vector3(),orientation=new THREE.Quaternion(),rotation=new THREE.Euler(0,0,0,'YXZ'),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4(),lens=new THREE.Matrix4();
const _inv=new THREE.Matrix4(),_armM=new THREE.Matrix4(),_el=new THREE.Vector3(),_sh=new THREE.Vector3(),_sl=new THREE.Vector3(),_dir=new THREE.Vector3(),_q=new THREE.Quaternion(),_sc=new THREE.Vector3(),_UP=new THREE.Vector3(0,1,0);
const WRIST_MAX=1.75;   // how far back the wrist bends, radians: a push-up, not a break
export function placeClimbingHand(hand,player,worldCamera,viewCamera){
 const face=player.scaling||player.scaleDescending?player.scaleFace:player.climbSurface;if(!face)return false;
 worldCamera.updateMatrixWorld();worldCamera.matrixWorldInverse.copy(worldCamera.matrixWorld).invert();
 const pos=player.renderPos||player.pos,eye=player.renderEyeY??player.eyeY,side=hand.userData.side;
 const nx=face.nx,nz=face.nz,d=(pos.x-face.x)*nx+(pos.z-face.z)*nz,top=+face.top;
 // OVER THE LIP. 0 while the eye is under the top of the wall, 1 once it is 15 cm over it: the
 // hands go over and lie flat on the top, the heel of the hand at the edge, and stay there while
 // you pull yourself up past them. They used to stand upright 7 cm out from the wall to the end,
 // so the last frames of every climb were two hands pressed flat on air above the lip (r3
 // critic, k-pull0.png). It waits for the eye because this scene draws over the world: hands on a
 // top the eye cannot see yet were drawn in the sky above the lip (measured: eye 8 cm under the
 // top at the second pull frame). Until then they hold the face just under the lip.
 const over=Number.isFinite(top)?smooth(top-.15,top+.15,eye):0;
 const phase=(eye+.18)/.34+(side<0?.5:0),step=Math.floor(phase),part=phase-step;
 const lift=Math.max(0,(part-.68)/.32)*(1-over),ease=lift*lift*(3-2*lift),offset=Math.sin(lift*Math.PI)*.075;
 const y=Math.min(top+.01,(step+ease-(side<0?.5:0))*.34);
 // The point on the face of the wall in front of this hand.
 const fx=pos.x-nx*d+nz*side*.145,fz=pos.z-nz*d-nx*side*.145;
 const out=.07+offset+(-.09-.07-offset)*over,arc=Math.sin(Math.PI*over)*.08;
 origin.set(fx+nx*out,y-.12+(top+.02-(y-.12))*over+arc,fz+nz*out);
 const contact=hand.userData.contact||(hand.userData.contact={x:0,y:0,z:0});contact.x=fx;contact.y=y+(top-y)*over;contact.z=fz;
 // Pitch about the hand's own knuckle line: 0 upright on the face, -90 degrees flat on the top.
 rotation.set(-Math.PI/2*over,Math.atan2(nx,nz),side*.025);orientation.setFromEuler(rotation);
 matrix.compose(origin,orientation,scale).premultiply(worldCamera.matrixWorldInverse);
 // The shoulder: beside, below and a little behind the eye, turned by the look's yaw alone.
 // The look's level heading is taken from its forward and up vectors together, so it holds
 // straight up and straight down too.
 const e=worldCamera.matrixWorld.elements,fwx=-e[8],fwy=-e[9],fwz=-e[10],cp=Math.hypot(fwx,fwz);
 let hx=fwx*cp-e[4]*fwy,hz=fwz*cp-e[6]*fwy;const hl=Math.hypot(hx,hz)||1;hx/=hl;hz/=hl;
 const rgt=SHOULDER[0]*side;
 _sh.set(e[12]-hz*rgt+hx*SHOULDER[2],e[13]+SHOULDER[1],e[14]+hx*rgt+hz*SHOULDER[2]).applyMatrix4(worldCamera.matrixWorldInverse);
 // The wrist turns the forearm toward that shoulder once the hand is on top, so the arm comes
 // down to you from the ledge instead of up out of the top of the frame.
 _inv.copy(matrix).invert();
 const wrist=hand.userData.wrist;let bend=0;
 if(wrist){
  _sl.copy(_sh).applyMatrix4(_inv);
  const wy=WRIST[1],wz=WRIST[2];
  const want=Math.atan2(_sl.z-wz,-(_sl.y-wy)),baked=Math.atan2(ELBOW[2]-wz,-(ELBOW[1]-wy));
  bend=Math.max(0,Math.min(WRIST_MAX,baked-want))*over;
  wrist.rotation.x=bend;
 }
 const arm=hand.userData.arm;
 if(arm){
  // The elbow, where the (possibly turned) forearm puts it, then the upper arm from there to
  // the shoulder, written as a child of the hand. The lens below then applies to both alike.
  const cb=Math.cos(bend),sb=Math.sin(bend),ey=ELBOW[1]-WRIST[1],ez=ELBOW[2]-WRIST[2];
  _el.set(ELBOW[0]*side,WRIST[1]+ey*cb-ez*sb,WRIST[2]+ey*sb+ez*cb).applyMatrix4(matrix);
  _dir.copy(_sh).sub(_el);
  const len=Math.max(_dir.length(),1e-4);_dir.multiplyScalar(1/len);
  _q.setFromUnitVectors(_UP,_dir);_sc.set(1,len+.08,1);
  _armM.compose(_el,_q,_sc);
  arm.matrix.copy(_inv).multiply(_armM);
 }
 // The weapon lens differs from the world lens. Matching their projection here
 // keeps every fingertip on the real surface while the player looks around.
 const ratio=Math.tan(viewCamera.fov*Math.PI/360)/Math.tan(worldCamera.fov*Math.PI/360);
 lens.makeScale(ratio,ratio,1);matrix.premultiply(lens);
 hand.matrixAutoUpdate=false;hand.matrix.copy(matrix);hand.matrixWorldNeedsUpdate=true;
 hand.userData.pose(1-lift*.85,over);
 return matrix.elements[14]<-.02;
}
