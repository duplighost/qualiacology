import * as THREE from 'three';

// The service bay has no raised slab: its floor is the existing apron, authored
// at heightAt + APRON_LIFT. Localise wear on that mesh instead of layering a
// coplanar decal. Bounds stop at the three inner wall feet and the shutter mouth.
export const STATION_FLOOR=Object.freeze({x0:-27.84,x1:-18.16,z0:-4.98,z1:4.34,size:768});
const B=STATION_FLOOR,W=B.x1-B.x0,D=B.z1-B.z0;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function hash(x,z,seed){
  let h=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed,1442695041);
  h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;
}
function noise(x,z,seed){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const a=fx*fx*(3-2*fx),b=fz*fz*(3-2*fz);
  return (hash(ix,iz,seed)*(1-a)+hash(ix+1,iz,seed)*a)*(1-b)
    +(hash(ix,iz+1,seed)*(1-a)+hash(ix+1,iz+1,seed)*a)*b;
}

// One non-tiling packed texture: oil absorption, rubber, fine fractures, dirt.
// 768² RGBA8 = 2.25 MiB CPU + about 3 MiB GPU including all generated mip levels.
// The field is deterministic and only baked when the station apron streams in.
export function createStationFloorTexture(){
  const n=B.size,data=new Uint8Array(n*n*4),dx=W/n,dz=D/n;
  const put=(i,channel,value)=>{const old=data[i+channel]/255;data[i+channel]=Math.round(255*(1-(1-old)*(1-clamp(value))));};
  const region=(x0,z0,x1,z1,fn)=>{
    const left=Math.max(0,Math.floor((x0-B.x0)/dx)),right=Math.min(n-1,Math.ceil((x1-B.x0)/dx));
    const low=Math.max(0,Math.floor((z0-B.z0)/dz)),high=Math.min(n-1,Math.ceil((z1-B.z0)/dz));
    for(let iz=low;iz<=high;iz++)for(let ix=left;ix<=right;ix++)fn((iz*n+ix)*4,B.x0+(ix+.5)*dx,B.z0+(iz+.5)*dz);
  };
  region(B.x0,B.z0,B.x1,B.z1,(i,x,z)=>{
    const macro=noise(x*.76,z*.76,9),grain=noise(x*21,z*21,51);
    const wall=Math.min(x-B.x0,B.x1-x,B.z1-z);
    const edge=(1-smooth(.07,.62+macro*.38,wall))*(.42+noise(x*2.7,z*2.7,87)*.25);
    data[i+3]=Math.round(255*clamp(.055+macro*.12+(grain-.5)*.035+edge));
  });
  const soak=(x,z,rx,rz,amount,seed)=>{
    region(x-rx*1.2,z-rz*1.2,x+rx*1.2,z+rz*1.2,(i,px,pz)=>{
      const ux=(px-x)/rx,uz=(pz-z)/rz;
      const warp=noise(px*3.6,pz*3.6,seed)*.19+noise(px*9.3,pz*9.3,seed+13)*.09;
      const edge=Math.hypot(ux,uz)+warp;
      const core=1-smooth(.46,.97,edge),halo=1-smooth(.76,1.18,edge);
      put(i,0,amount*(core*.82+halo*.18)*(.83+noise(px*16,pz*16,seed+29)*.17));
    });
  };
  // Unequal spills: an old engine leak, the bench's working edge and the can rack.
  // Overlapping lobes give connected soak marks without repeated circular stamps.
  const pools=[[-23.15,-1.95,.76,.62,.70],[-23.58,-1.69,.43,.39,.44],
    [-22.76,-2.24,.39,.25,.45],[-24.30,.71,.55,.79,.41],[-24.56,1.19,.33,.40,.42],
    [-25.86,2.55,.73,.41,.60],[-25.29,2.76,.44,.36,.43],[-26.18,2.25,.24,.43,.28],
    [-20.17,2.88,.44,.60,.54],[-19.85,2.59,.27,.31,.42],[-25.15,-3.37,.37,.22,.20],
    [-22.23,.56,.34,.44,.27],[-26.31,-.42,.27,.17,.25],
    [-26.05,.10,.57,.44,.30],[-26.47,.39,.25,.36,.29]];
  pools.forEach((p,i)=>soak(...p,131+i*17));
  for(let i=0;i<31;i++){
    const base=pools[i%pools.length],r=.014+hash(i,0,88)*.044;
    soak(base[0]+(hash(i,2,96)-.5)*base[2]*3,base[1]+(hash(i,3,99)-.5)*base[3]*3,r,r*(.6+hash(i,4,81)),.18+hash(i,8,75)*.34,201+i);
  }
  function stroke(points,width,channel,amount,seed){
    for(let s=1;s<points.length;s++){
      const a=points[s-1],b=points[s],vx=b[0]-a[0],vz=b[1]-a[1],len2=vx*vx+vz*vz;
      const pad=width+Math.max(dx,dz);
      region(Math.min(a[0],b[0])-pad,Math.min(a[1],b[1])-pad,Math.max(a[0],b[0])+pad,Math.max(a[1],b[1])+pad,(i,x,z)=>{
        const t=clamp(((x-a[0])*vx+(z-a[1])*vz)/len2);
        const distance=Math.hypot(x-a[0]-t*vx,z-a[1]-t*vz);
        const broken=channel===1?.38+.62*smooth(.25,.76,noise(x*2.8,z*2.8,seed)):1;
        const edge=1-smooth(width*.26,width+dx*.65,distance);
        // Max avoids a brighter/darker bead at segment joins.
        data[i+channel]=Math.max(data[i+channel],Math.round(255*amount*edge*broken));
      });
    }
  }
  const curve=points=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z))).getPoints(45).map(p=>[p.x,p.z]);
  // Rubber follows the two wheel lanes, but fades and bends with different arrivals.
  // There are no repeated tread bars, perfect ruled stripes, or painted bay lines.
  const tracks=[
    [[-24.48,-4.9],[-24.20,-3.4],[-24.00,-1.6],[-23.96,1.78]],
    [[-22.66,-4.9],[-22.35,-3.2],[-22.13,-1.4],[-22.12,1.95]],
    [[-24.04,-4.3],[-23.85,-2.95],[-23.88,-.9]],
    [[-22.0,-3.75],[-22.12,-2.6],[-22.03,-.56]],
    [[-24.61,.63],[-24.40,1.08],[-24.08,1.34]],
    [[-22.45,1.45],[-22.17,1.57],[-21.96,1.88]],
  ];
  tracks.forEach((p,i)=>stroke(curve(p),i<2?.16:.105,1,i<2?.50:.33,400+i*19));
  // Short, irregular fractures originate at wall settlement and old point loads.
  // Each fork has its own direction; none crosses the bay as a repeated grid seam.
  const cracks=[
    [[-27.83,-1.58],[-27.26,-1.31],[-26.93,-1.34],[-26.54,-.98],[-26.24,-.94],[-25.87,-.49]],
    [[-26.93,-1.34],[-26.75,-1.77],[-26.39,-2.03]],
    [[-21.15,4.33],[-21.33,3.82],[-21.14,3.55],[-21.31,3.13],[-20.94,2.68]],
    [[-18.17,-2.87],[-18.68,-2.59],[-19.05,-2.69],[-19.38,-2.24],[-19.86,-2.12]],
    [[-25.41,-4.55],[-25.30,-4.22],[-24.97,-4.05],[-24.87,-3.58]],
    [[-23.36,2.81],[-23.09,2.67],[-22.84,2.73],[-22.61,2.45]],
  ];
  cracks.forEach((points,i)=>{
    const fracture=[points[0]];
    for(let s=1;s<points.length;s++){
      const a=points[s-1],b=points[s],vx=b[0]-a[0],vz=b[1]-a[1],length=Math.hypot(vx,vz),steps=Math.ceil(length/.06);
      for(let j=1;j<=steps;j++){
        const t=j/steps,jitter=j===steps?0:(hash(j,s,510+i)-.5)*.035;
        fracture.push([a[0]+vx*t-vz/length*jitter,a[1]+vz*t+vx/length*jitter]);
      }
    }
    stroke(fracture,.008+(i%3)*.002,2,.63,500+i);
  });
  const texture=new THREE.DataTexture(data,n,n,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.name='station-workshop-wear';texture.colorSpace=THREE.NoColorSpace;
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
  texture.userData.channels='oil/rubber/fracture/dirt';return texture;
}

export function installStationFloor(material,roadScan=null){
  const texture=createStationFloorTexture(),compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  // Borrow the county road's already-resident scan. Chunks owns its lifetime;
  // streaming this apron must release only its own workshop-wear texture.
  // The source tile covers 2.2 m; Places projects this apron at that exact scale.
  const scanned=!!(roadScan?.albedo&&roadScan?.physical);
  if(scanned){
    material.map=roadScan.albedo;material.bumpMap=roadScan.physical;
    material.bumpScale=.0065;
  }
  material.name='station-workshop-apron';
  material.onBeforeCompile=shader=>{
    compile(shader);
    shader.uniforms.uStationFloor={value:texture};
    shader.uniforms.uStationScanReady={value:scanned?1:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vStationFloorXZ;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvStationFloorXZ=position.xz;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec2 vStationFloorXZ;\nuniform sampler2D uStationFloor;\nuniform float uStationScanReady;')
      .replace('vec2 countyWallPlane =',`
        vec2 workshopUv=(vStationFloorXZ-vec2(${B.x0},${B.z0}))/vec2(${W},${D});
        vec2 workshopInside=step(vec2(0.0),workshopUv)*step(workshopUv,vec2(1.0));
        float workshopBay=workshopInside.x*workshopInside.y*smoothstep(0.72,0.96,vWxUp)
          *smoothstep(0.0,0.035,workshopUv.y);
        vec2 countyWallPlane =`)
      .replace('#ifdef USE_MAP\nif (uPlaceSurfaceType < 0.5)',
        'if (uStationScanReady > 0.5) countyFloor = workshopBay;\n#ifdef USE_MAP\nif (uPlaceSurfaceType < 0.5)')
      // The scan is stored around 0.5 so its full grain range survives packing.
      // Keep the apron vertex palette; the bay keeps the existing concrete field.
      .replace('#include <color_fragment>',`
        if (uStationScanReady > 0.5) diffuseColor.rgb *= mix(1.42,1.0,countyFloor);
        #include <color_fragment>`)
      .replace('countyPhysical = mix(countyPhysical, vec4(0.62, 0.88, 1.0, 0.0), countyFloor);',
        'countyPhysical = mix(countyPhysical, vec4(0.62, 0.88, 1.0, 0.0), countyFloor);\nif (uStationScanReady > 0.5) countyPhysical.a = 0.0;')
      // The asphalt family skips plaster phase hashes, but the concrete bay still
      // needs its small filtered relief. Keep derivatives outside a spatial branch.
      .replace('if (uPlaceSurfaceType < 0.5 || uWeather.x > 0.0) {',
        'if (uStationScanReady > 0.5 || uPlaceSurfaceType < 0.5 || uWeather.x > 0.0) {')
      .replace('#include <roughnessmap_fragment>',`
        vec4 workshopWear=texture2D(uStationFloor,clamp(workshopUv,vec2(0.0),vec2(1.0)));
        float workshopFloor=workshopBay*(1.0-countySnowCover);
        float workshopSoak=workshopWear.r*workshopFloor;
        float workshopRubber=workshopWear.g*workshopFloor;
        float workshopFracture=workshopWear.b*workshopFloor;
        float workshopDirt=workshopWear.a*workshopFloor;
        diffuseColor.rgb*=1.0+workshopFloor*.025-workshopDirt*.23-workshopSoak*.52-workshopRubber*.22-workshopFracture*.29;
        #include <roughnessmap_fragment>`)
      .replace('#include <metalnessmap_fragment>',`
        roughnessFactor=mix(roughnessFactor,min(roughnessFactor,0.45),workshopSoak*.76);
        #include <metalnessmap_fragment>`);
    material.userData.stationFloorPatched=shader.vertexShader.includes('vStationFloorXZ=position.xz;')
      &&shader.fragmentShader.includes('float workshopSoak=')&&shader.fragmentShader.includes('workshopSoak*.76');
    material.userData.stationScanPatched=shader.fragmentShader.includes('countyFloor = workshopBay;')
      &&shader.fragmentShader.includes('countyPhysical.a = 0.0;');
  };
  material.customProgramCacheKey=()=>key+'-forecourt-scan-1-workshop-wear-1';
  material.userData.stationFloor=texture;
  material.addEventListener('dispose',()=>texture.dispose());material.needsUpdate=true;
  return material;
}
