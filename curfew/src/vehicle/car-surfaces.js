// Small deterministic material atlases. The car has paint, oxidised metal and leather,
// rather than one roughness value over every surface. No network or canvas at boot.
import * as THREE from 'three';

export function carSurfaces(seed=17){
  const size=256, height=new Float32Array(size*size);
  const albedo=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  const hash=(x,y)=>{let n=Math.imul(x+seed*17,374761393)^Math.imul(y+41,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,j=i*4,n=hash(x,y),patch=hash(x>>4,y>>4);
    const scratch=(x%71===0&&hash(x,y>>4)>.42)||(y%113===0&&x%49<32);
    const pit=n>.972&&patch>.43;
    const v=pit?.43:scratch?.73:.89+n*.11;
    albedo.set([Math.round(v*255),Math.round(v*255),Math.round(v*255),255],j);
    const r=Math.round((pit?.98:scratch?.82:.68+n*.20)*255);rough.set([r,r,r,255],j);
    height[i]=pit?-.8:scratch?-.24:(n-.5)*.04;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const get=(a,b)=>height[((b+size)%size)*size+(a+size)%size];
    const dx=(get(x-1,y)-get(x+1,y))*.75,dy=(get(x,y-1)-get(x,y+1))*.75,inv=1/Math.hypot(dx,dy,1);
    normal.set([Math.round((dx*inv*.5+.5)*255),Math.round((dy*inv*.5+.5)*255),Math.round((inv*.5+.5)*255),255],(y*size+x)*4);
  }
  const tex=(data,color=false)=>{const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
  const map=tex(albedo,true),roughnessMap=tex(rough),normalMap=tex(normal);
  const paint=new THREE.MeshStandardMaterial({color:0x536b61,map,roughnessMap,normalMap,normalScale:new THREE.Vector2(.22,.22),roughness:.78,metalness:.22});
  paint.name='car-weathered-enamel';
  const chrome=new THREE.MeshStandardMaterial({color:0x9eaba8,roughnessMap,normalMap,normalScale:new THREE.Vector2(.08,.08),roughness:.47,metalness:.84});chrome.name='car-brushed-metal';
  const rubber=new THREE.MeshStandardMaterial({color:0x111819,roughnessMap,normalMap,normalScale:new THREE.Vector2(.3,.3),roughness:.97});rubber.name='car-rubber';
  const leather=new THREE.MeshStandardMaterial({color:0x48332a,roughnessMap,normalMap,normalScale:new THREE.Vector2(.32,.32),roughness:.94});leather.name='car-leather';
  const dark=new THREE.MeshStandardMaterial({color:0x142022,roughness:.85});dark.name='car-dashboard';
  // Direct torch specular on a transparent Standard pane made a second sun in the
  // driver's view. Restrained tinted transmission keeps the windscreen readable.
  const glass=new THREE.MeshBasicMaterial({color:0x1b3335,transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide});glass.name='car-glass';
  const warm=new THREE.MeshStandardMaterial({color:0xffd19b,emissive:0xffb66f,emissiveIntensity:.28,roughness:.45});warm.name='car-courtesy';
  const materials={paint,chrome,rubber,leather,dark,glass,warm};
  // THE ELEVEN REWIRE. restored() no longer sets a COLOUR: the colour is Ari's (vehicle/
  // paint.js), and a rebuilt car used to be repainted green whatever scheme you had bought.
  // Rebuilt layers over paint — it takes the tired roughness out of whatever is on the car.
  // ALEX, 2026-09-16: "some actions clearly don't have enough feedback. The car should
  // glimmer or something when you fill it up." A pour zeroes the wear on one frame and the
  // only answer was a needle sweeping up behind a windscreen you are not sitting behind.
  // This is the answer from OUTSIDE the car, where the player is standing with the can: a
  // warm sheen runs over the enamel and the chrome and dies away. It is emissive only —
  // nothing here is a light, nothing casts, and REBUILT's gloss is untouched because the
  // roughness it owns is restored from whatever it was set to, not from a constant.
  let glimmerK=0;
  const paintRough0={v:paint.roughness},chromeRough0={v:chrome.roughness};
  const glimmer=k=>{
    k=k>1?1:(k<0?0:k);
    if(k===glimmerK)return;
    if(glimmerK<=0){paintRough0.v=paint.roughness;chromeRough0.v=chrome.roughness;}
    glimmerK=k;
    paint.emissive.setHex(0xffcf93);paint.emissiveIntensity=k*.62;
    chrome.emissive.setHex(0xfff0cf);chrome.emissiveIntensity=k*.85;
    paint.roughness=paintRough0.v*(1-k*.45);
    chrome.roughness=chromeRough0.v*(1-k*.50);
    if(k<=0){paint.roughness=paintRough0.v;chrome.roughness=chromeRough0.v;}
  };
  return{...materials,materials:Object.values(materials),glimmer,
    restored(on){paint.roughness=on?.36:.78;paint.metalness=on?.32:.22;paintRough0.v=paint.roughness;},
    setPaint(hex){if(hex>=0)paint.color.setHex(hex);},
    dispose(){Object.values(materials).forEach(m=>m.dispose());[map,roughnessMap,normalMap].forEach(t=>t.dispose());}};
}
