import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loft,tendon,characterMaps} from '../art/character-sculpt.js';

// A sewn work glove: continuous palm/wrist volumes, tapered jointed fingers,
// separate thumb web, leather reinforcement, rolled seams and a cloth sleeve.
// Geometry is merged by material; only the five fingers need independent poses.
export function climbingHandMaterials(){
 const leather=new THREE.MeshStandardMaterial({color:0xc2ae89,vertexColors:true,roughness:.89,metalness:0,...characterMaps('leather'),bumpScale:.00085});
 const cloth=new THREE.MeshStandardMaterial({color:0x656b63,vertexColors:true,roughness:.98,metalness:0,...characterMaps('cloth'),bumpScale:.0007});
 leather.name='worn-climbing-glove';cloth.name='climbing-coat-cuff';
 return{leather,cloth};
}
function batch(material){
 const parts=[];
 return{
  add(g,c=[.62,.58,.48]){
   if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}
   const p=g.attributes.position,uv=g.attributes.uv,colour=[];
   for(let i=0;i<p.count;i++){
    const grain=.91+.06*Math.sin(p.getX(i)*83+p.getY(i)*49)+.03*Math.cos(p.getY(i)*147-p.getZ(i)*91);
    colour.push(c[0]*grain,c[1]*grain,c[2]*grain);
    if(uv)uv.setXY(i,uv.getX(i)*.45,uv.getY(i)*4);
   }
   if(!uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2));
   g.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));parts.push(g);
  },
  mesh(){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const m=new THREE.Mesh(geometry,material);m.frustumCulled=false;return m;},
 };
}
function oval(rx,ry,rz,x,y,z){const g=new THREE.SphereGeometry(1,24,16);g.scale(rx,ry,rz);g.translate(x,y,z);return g;}
const seam=(points,r=.0007)=>tendon(points,r,r,24,5);
export function buildClimbingHand(side,materials){
 const root=new THREE.Group();root.name=(side<0?'left':'right')+'-climbing-hand';root.userData.side=side;
 const palm=batch(materials.leather),cloth=batch(materials.cloth),fingers=[];
 palm.add(loft([[-.123,.026,.023,0,.042],[-.095,.034,.025,0,.025],[-.060,.042,.026,-side*.003,.009],[-.017,.050,.023,-side*.002,0],[.017,.047,.021,0,-.002],[.039,.042,.016,0,-.002],[.043,.002,.002,0,0]],{segments:36,subdivisions:4,folds:.023,seed:side}),[.52,.50,.43]);
 palm.add(oval(.037,.039,.004,-side*.005,-.025,.022),[.32,.33,.29]);
 // The padded thumb mound and web blend into the palm rather than a block stuck on its side.
 palm.add(oval(.024,.041,.024,-side*.034,-.055,-.002),[.48,.46,.39]);
 for(const edge of[-1,1])palm.add(seam([[edge*.026,-.112,.046],[edge*.038,-.064,.027],[edge*.049,-.013,.005],[edge*.041,.034,.005]]),[.71,.65,.49]);
 palm.add(seam([[-.029,-.061,.030],[-.022,-.019,.027],[0,.009,.026],[.025,-.003,.026],[.032,-.039,.027]]),[.62,.58,.46]);
 // Rolled wrist edge, pull tab and two narrow stitched cuff bands.
 for(const y of[-.108,-.096]){
  const pts=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;pts.push([Math.sin(a)*.034,y,Math.cos(a)*.027+.028]);}
  palm.add(seam(pts,.0013),[.29,.30,.27]);
 }
 cloth.add(loft([[-.365,.060,.050,side*.025,.18],[-.29,.055,.047,side*.016,.12],[-.22,.047,.040,side*.008,.079],[-.16,.045,.032,0,.05],[-.13,.040,.029,0,.043],[-.115,.039,.028,0,.035]],{segments:36,subdivisions:4,folds:.065,seed:side*4}),[.42,.45,.42]);
 for(let i=0;i<5;i++)cloth.add(seam([[-.034,-.145-i*.026,.077+i*.019],[0,-.152-i*.025,.085+i*.023],[.035,-.140-i*.025,.075+i*.019]],.0014),[.30,.34,.31]);
 root.add(palm.mesh(),cloth.mesh());
 const finger=(index,x,y,length,width,angle=0)=>{
  const b=batch(materials.leather),pivot=new THREE.Group();pivot.position.set(x,y,0);pivot.rotation.z=angle;
  b.add(loft([[0,width*.92,width*.91,0,0],[length*.13,width,width,0,-.001],[length*.39,width*.93,width*.9,0,-.002],[length*.55,width*.83,width*.78,0,-.012],[length*.79,width*.70,width*.72,0,-.025],[length*.93,width*.67,width*.6,0,-.032],[length,width*.2,width*.23,0,-.032],[length*1.015,.00025,.00025,0,-.031]],{segments:28,subdivisions:4,folds:.012,seed:index}),[.53,.51,.43]);
  for(const sign of[-1,1])b.add(seam([[sign*width*.85,length*.07,.002],[sign*width*.88,length*.34,-.003],[sign*width*.66,length*.64,-.018],[sign*width*.45,length*.91,-.031]],.00058),[.58,.56,.45]);
  pivot.add(b.mesh());root.add(pivot);fingers.push({pivot,angle,index});
 };
 finger(0,-.033,.025,.083,.0107,-.075);finger(1,-.0105,.032,.101,.0113,-.018);finger(2,.0135,.030,.093,.0109,.025);finger(3,.035,.023,.073,.0093,.095);
 finger(4,-side*.054,-.061,.064,.014,-side*.64);
 root.userData.fingers=fingers;
 root.userData.pose=grip=>{for(const f of fingers)f.pivot.rotation.x=-.025-grip*(f.index===4?.28:.24);};
 return root;
}

const origin=new THREE.Vector3(),orientation=new THREE.Quaternion(),rotation=new THREE.Euler(),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4(),lens=new THREE.Matrix4();
export function placeClimbingHand(hand,player,worldCamera,viewCamera){
 const face=player.scaling||player.scaleDescending?player.scaleFace:player.climbSurface;if(!face)return false;
 worldCamera.updateMatrixWorld();worldCamera.matrixWorldInverse.copy(worldCamera.matrixWorld).invert();
 const pos=player.renderPos||player.pos,eye=player.renderEyeY??player.eyeY,side=hand.userData.side;
 const nx=face.nx,nz=face.nz,d=(pos.x-face.x)*nx+(pos.z-face.z)*nz;
 const phase=(eye+.18)/.34+(side<0?.5:0),step=Math.floor(phase),part=phase-step;
 const lift=Math.max(0,(part-.68)/.32),ease=lift*lift*(3-2*lift),offset=Math.sin(lift*Math.PI)*.075;
 const y=Math.min(face.top+.055,(step+ease-(side<0?.5:0))*.34);
 origin.set(pos.x-nx*d+nx*(.07+offset)+nz*side*.145,y-.12,pos.z-nz*d+nz*(.07+offset)-nx*side*.145);
 const contact=hand.userData.contact||(hand.userData.contact={x:0,y:0,z:0});contact.x=origin.x-nx*.07;contact.y=y;contact.z=origin.z-nz*.07;
 rotation.set(0,Math.atan2(nx,nz),side*.025);orientation.setFromEuler(rotation);
 matrix.compose(origin,orientation,scale).premultiply(worldCamera.matrixWorldInverse);
 // The weapon lens differs from the world lens. Matching their projection here
 // keeps every fingertip on the real surface while the player looks around.
 const ratio=Math.tan(viewCamera.fov*Math.PI/360)/Math.tan(worldCamera.fov*Math.PI/360);
 lens.makeScale(ratio,ratio,1);matrix.premultiply(lens);
 hand.matrixAutoUpdate=false;hand.matrix.copy(matrix);hand.matrixWorldNeedsUpdate=true;
 hand.userData.pose(1-lift*.85);
 return matrix.elements[14]<-.02;
}
