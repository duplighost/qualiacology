import * as THREE from 'three';

// A filtered night canopy provides a broad cold sky and broken horizon in metal,
// damp stone and glass. It is baked once; the real sky still owns the visible dome.
export function makeNightReflections(renderer){
  const w=256,h=128,data=new Float32Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h,az=u*Math.PI*2,elevation=Math.cos(v*Math.PI);
    const clouds=.73+.12*Math.sin(az*5+v*19)+.1*Math.sin(az*13-v*25);
    const crown=.055+.038*Math.sin(az*37)+.024*Math.sin(az*71);
    const sky=THREE.MathUtils.smoothstep(elevation,crown-.025,crown+.025);
    const upper=Math.max(0,elevation),moon=Math.exp(-((u-.63)**2/.00018+(v-.23)**2/.0006));
    const p=(y*w+x)*4;
    data[p]=(.003+sky*(.022+upper*.022)*clouds)+moon*.8;
    data[p+1]=(.004+sky*(.035+upper*.031)*clouds)+moon*.9;
    data[p+2]=(.005+sky*(.058+upper*.046)*clouds)+moon;
    data[p+3]=1;
  }
  const tex=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);
  tex.mapping=THREE.EquirectangularReflectionMapping;tex.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(tex);
  target.texture.name='county-filtered-night';tex.dispose();pmrem.dispose();return target;
}
