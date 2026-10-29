import * as THREE from '../vendor/three.module.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const letters={
  P:[[[0,0],[0,1.3]],[[0,1.3],[.55,1.3],[.78,1.06],[.65,.77],[0,.70]]],
  A:[[[.02,0],[.39,1.3],[.8,0]],[[.16,.43],[.64,.43]]],
  S:[[[.77,1.12],[.55,1.3],[.23,1.25],[.06,1.05],[.15,.8],[.6,.56],[.78,.32],[.66,.08],[.32,0],[.05,.17]]],
  T:[[[.02,1.3],[.82,1.3]],[[.42,1.3],[.42,0]]],
  U:[[[.05,1.3],[.05,.3],[.24,.03],[.59,.03],[.78,.3],[.78,1.3]]],
  N:[[[.05,0],[.05,1.3],[.77,0],[.77,1.3]]],
  H:[[[.05,0],[.05,1.3]],[[.77,0],[.77,1.3]],[[.05,.65],[.77,.65]]],
  I:[[[.08,1.3],[.72,1.3]],[[.4,1.3],[.4,0]],[[.08,0],[.72,0]]],
  E:[[[.78,1.3],[.05,1.3],[.05,0],[.78,0]],[[.05,.67],[.65,.67]]]
};

// The opening's lettering is bundled spaghetti in front of the actual town.
// Camera-local placement keeps the complete title readable at every aspect.
export function createOpeningLogo(camera,materials){
  const group=new THREE.Group();group.name='Opening title made of bundled spaghetti';camera.add(group);
  const bins=new Map(),parts=[];
  for(const [text,y,scale,palette] of [['PASTA',1.75,.58,['cream']],['SUNSHINE',0,1,['tomato','gold','spinach','cream']]]){
    const width=text.length*1.05-.25;
    [...text].forEach((letter,index)=>{
      const key=palette[index%palette.length];if(!bins.has(key))bins.set(key,[]);
      for(const stroke of letters[letter])for(let strand=0;strand<3;strand++){
        const points=stroke.map(([x,h],j)=>V((index*1.05+x-width/2)*scale+(strand-1)*.043,y+h*scale,.026*Math.sin(j*1.7+strand)));
        bins.get(key).push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,stroke.length*6),.032*scale,7,false));
      }
    });
  }
  for(const [key,list] of bins){const geometry=mergeGeometries(list,false),mesh=new THREE.Mesh(geometry,materials[key]);mesh.name='Opening '+key+' spaghetti letters';mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);parts.push(geometry);for(const g of list)g.dispose();}
  function update(time,aspect){
    const halfHeight=9*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),scale=Math.min(1.12,halfHeight*2*aspect*.84/8.4);
    group.scale.setScalar(scale);group.position.set(0,halfHeight*.43-1.24*scale,-9);group.rotation.z=Math.sin(time*.6)*.009;
  }
  return{group,update,setVisible(value){group.visible=!!value;},dispose(){group.removeFromParent();parts.forEach(g=>g.dispose());}};
}
