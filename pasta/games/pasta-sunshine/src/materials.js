import * as THREE from '../vendor/three.module.js';

// Small variations in semolina grain and hydration survive close inspection.
// These textures describe the surface of the pasta; every silhouette is geometry.
export function makeMaterials(renderer) {
  const size=512,tau=Math.PI*2,anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const textures={};
  for(const key of ['color','height','roughness','hydration']){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),data=ctx.createImageData(size,size);
    let seed=7218;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size,index=(y*size+x)*4,grain=random()-.5;
      const broad=Math.sin(tau*(u*3+v*2))*.5+Math.cos(tau*(u*7-v*5))*.25+Math.sin(tau*(u*13+v*11))*.125;
      const ridges=Math.sin(tau*u*47+Math.sin(tau*v*3)*.22),fine=Math.sin(tau*(u*113+v*2));
      const pore=grain>.477?(grain-.477)*470:0;
      const value=key==='color'?244+broad*7+grain*3-pore*.35:key==='height'?145+ridges*5+fine*2+grain*21+broad*7-pore:key==='roughness'?209+broad*21+grain*9+pore:201+broad*32-pore*.3;
      data.data[index]=data.data[index+1]=data.data[index+2]=Math.max(0,Math.min(255,Math.round(value)));data.data[index+3]=255;
    }
    ctx.putImageData(data,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1,4);texture.anisotropy=anisotropy;
    texture.name='Pasta '+key+' · semolina pores, extrusion lines and hydration';if(key==='color')texture.colorSpace=THREE.SRGBColorSpace;textures[key]=texture;
  }
  const make=(name,color,roughness=.43,extra={})=>{
    const material=new THREE.MeshPhysicalMaterial({color,map:textures.color,roughness,roughnessMap:textures.roughness,metalness:0,ior:1.42,specularIntensity:.72,specularColor:0xfff5df,clearcoat:.24,clearcoatRoughness:.25,clearcoatMap:textures.hydration,bumpMap:textures.height,bumpScale:.007,sheen:.08,sheenColor:0xffdf9f,sheenRoughness:.78,envMapIntensity:.82,...extra});
    material.name=name+' pasta';material.userData.ingredient=name;return material;
  };
  return {
    egg:make('Egg spaghetti',0xe6bf79),cream:make('Cream linguine',0xf0d49a,.46),tomato:make('Tomato spaghetti',0xb95131,.48),
    spinach:make('Spinach spaghetti',0x6e7b3e,.52),ink:make('Ink spaghetti',0x302b23,.36),blue:make('Blue dyed spaghetti',0x39596c,.43),
    gold:make('Golden egg spaghetti',0xf4c75d,.34,{clearcoat:.3,emissive:0x865214,emissiveIntensity:.07}),
    toasted:make('Dry toasted spaghetti',0xa17442,.72,{clearcoat:.06,specularIntensity:.5,bumpScale:.011}),lake:make('Hydrated teal linguine',0x80aaa3,.31,{clearcoat:.43,clearcoatRoughness:.19}),
    pale:make('Pale dried pasta',0xf0e1bb,.64,{clearcoat:.06}),darkGreen:make('Dark spinach spaghetti',0x3c4d2b,.56)
  };
}

export function noodle(points,radius,material,segments=24,sides=7) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,sides,false),material);
  mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function noodleBall(radius,material,count=14,seed=0) {
  const group=new THREE.Group();
  for(let j=0;j<count;j++){
    const p=[];const a=j*2.3999632297+seed;
    const tilt=(j/(count-1)-.5)*2.4;
    for(let k=0;k<=30;k++){
      const t=k/30*Math.PI*2.1;
      const r=radius*(.85+.1*Math.sin(t*5+j));
      const v=new THREE.Vector3(r*Math.cos(t),r*Math.sin(t),Math.sin(t*3+j)*radius*.13);
      v.applyAxisAngle(new THREE.Vector3(0,1,0),a);v.applyAxisAngle(new THREE.Vector3(1,0,0),tilt);p.push(v);
    }
    group.add(noodle(p,Math.max(.04,radius*.075),material,36,6));
  }
  return group;
}
