// Small deterministic material atlases. The car has paint, oxidised metal and leather,
// rather than one roughness value over every surface. No network or canvas at boot.
import * as THREE from 'three';

export function carSurfaces(seed=17){
  const size=256, height=new Float32Array(size*size);
  const albedo=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  const hash=(x,y)=>{let n=Math.imul(x+seed*17,374761393)^Math.imul(y+41,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  const field=(x,y,period)=>{
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const sample=(a,b)=>hash((a+period)%period,(b+period)%period);
    const a=sample(ix,iy)*(1-sx)+sample(ix+1,iy)*sx,b=sample(ix,iy+1)*(1-sx)+sample(ix+1,iy+1)*sx;
    return a*(1-sy)+b*sy;
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,j=i*4,n=hash(x,y),patch=field(x/64,y/64,4),orange=field(x/4,y/4,64);
    // Aged enamel is still a continuous coating. Broad oxidation varies its
    // polish; isolated pinholes interrupt it, without a ruler-straight scratch grid.
    const pit=n>.994&&patch>.52;
    const v=pit?.67:.91+patch*.065+n*.018;
    albedo.set([Math.round(v*255),Math.round(v*255),Math.round(v*255),255],j);
    const r=Math.round((pit?.96:.58+patch*.28+n*.035)*255);rough.set([r,r,r,255],j);
    height[i]=pit?-.16:(orange-.5)*.025+(n-.5)*.006;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const get=(a,b)=>height[((b+size)%size)*size+(a+size)%size];
    const dx=(get(x-1,y)-get(x+1,y))*.75,dy=(get(x,y-1)-get(x,y+1))*.75,inv=1/Math.hypot(dx,dy,1);
    normal.set([Math.round((dx*inv*.5+.5)*255),Math.round((dy*inv*.5+.5)*255),Math.round((inv*.5+.5)*255),255],(y*size+x)*4);
  }
  const tex=(data,color=false)=>{const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
  const map=tex(albedo,true),roughnessMap=tex(rough),normalMap=tex(normal);
  // Upholstery has shallow, interlocking grain. Sharing enamel's gouges and
  // straight scratches made the door card look like brown painted sheet metal.
  const hideHeight=new Float32Array(size*size),hideRough=new Uint8Array(size*size*4),hideNormal=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const gx=x/4,gy=y/4,cx=Math.floor(gx),cy=Math.floor(gy);let nearest=9,next=9;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const hx=(cx+dx+64)%64,hy=(cy+dy+64)%64;
      const px=cx+dx+.16+hash(hx+217,hy+31)*.68,py=cy+dy+.16+hash(hx+93,hy+173)*.68;
      const d=(gx-px)**2+(gy-py)**2;if(d<nearest){next=nearest;nearest=d;}else if(d<next)next=d;
    }
    const crease=Math.exp(-Math.max(0,next-nearest)*11),i=y*size+x,j=i*4;
    hideHeight[i]=-.12*crease+(hash(x+97,y+139)-.5)*.013;
    const r=Math.round((.79+crease*.15+hash(x+47,y+79)*.035)*255);hideRough.set([r,r,r,255],j);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const sample=(a,b)=>hideHeight[((b+size)%size)*size+(a+size)%size];
    const dx=(sample(x-1,y)-sample(x+1,y))*.9,dy=(sample(x,y-1)-sample(x,y+1))*.9,inv=1/Math.hypot(dx,dy,1);
    hideNormal.set([Math.round((dx*inv*.5+.5)*255),Math.round((dy*inv*.5+.5)*255),Math.round((inv*.5+.5)*255),255],(y*size+x)*4);
  }
  const leatherRoughness=tex(hideRough),leatherNormal=tex(hideNormal);
  const paint=new THREE.MeshStandardMaterial({color:0x536b61,map,roughnessMap,normalMap,normalScale:new THREE.Vector2(.22,.22),roughness:.78,metalness:.22,envMapIntensity:1.15});
  paint.name='car-weathered-enamel';
  const chrome=new THREE.MeshStandardMaterial({color:0x9eaba8,roughnessMap,normalMap,normalScale:new THREE.Vector2(.08,.08),roughness:.42,metalness:.68});chrome.name='car-brushed-metal';
  const rubber=new THREE.MeshStandardMaterial({color:0x111819,roughnessMap,normalMap,normalScale:new THREE.Vector2(.3,.3),roughness:.97});rubber.name='car-rubber';
  const leather=new THREE.MeshStandardMaterial({color:0x48332a,roughnessMap:leatherRoughness,normalMap:leatherNormal,normalScale:new THREE.Vector2(.23,.23),roughness:.84});leather.name='car-leather';
  const dark=new THREE.MeshStandardMaterial({color:0x252c2a,roughness:.80});dark.name='car-dashboard';
  // The glazing reflects the same filtered sky as the body. A thin transparent
  // pane has no opaque diffuse layer; bound the point-source glint so the carried
  // torch cannot become a second sun in the driver's view. No transmission pass.
  const glass=new THREE.MeshStandardMaterial({color:0x738d89,roughness:.17,metalness:0,envMapIntensity:1.4,transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide});glass.name='car-glass';
  glass.forceSinglePass=true;
  glass.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float paneFacing=abs(dot(normalize(normal),normalize(vViewPosition)));
      float paneFresnel=pow(1.0-clamp(paneFacing,0.0,1.0),5.0);
      outgoingLight=reflectedLight.indirectSpecular*1.35+
        (reflectedLight.directSpecular/(vec3(1.0)+reflectedLight.directSpecular))*.12;
      diffuseColor.a*=.50+paneFresnel*2.5;
      #include <opaque_fragment>`);
  };
  glass.customProgramCacheKey=()=> 'car-thin-glazing-1';
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
    dispose(){Object.values(materials).forEach(m=>m.dispose());[map,roughnessMap,normalMap,leatherRoughness,leatherNormal].forEach(t=>t.dispose());}};
}
