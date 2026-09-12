import * as THREE from 'three';

// Character shapes are authored as continuous cross sections. Each section is
// [height, width radius, depth radius, centre X, centre Z]. The same small kit
// gives cloth a sewn silhouette and anatomy a continuous taper at its joints.
export function loft(sections, { segments = 28, subdivisions = 3, folds = 0, seed = 0 } = {}) {
  const points = [], uv = [], indices = [];
  const rings = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const value = (j, k) => sections[clamp(j, 0, sections.length - 1)][k] || 0;
  for (let j = 0; j < sections.length - 1; j++) {
    for (let q = 0; q < subdivisions; q++) {
      const t = q / subdivisions, ring = [];
      for (let k = 0; k < 5; k++) {
        const a = value(j - 1, k), b = value(j, k), c = value(j + 1, k), d = value(j + 2, k);
        const n = 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        ring.push(k === 1 || k === 2 ? Math.max(0.0002, n) : n);
      }
      rings.push(ring);
    }
  }
  rings.push(sections.at(-1));
  rings.forEach(([y, rx, rz, cx = 0, cz = 0], j) => {
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2;
      const fold = 1 + folds * (Math.sin(a * 7 + y * 2.8 + seed) * .6 + Math.sin(a * 11 - y * 4.1 + seed) * .4);
      points.push(Math.sin(a) * rx * fold + cx, y, Math.cos(a) * rz * fold + cz);
      uv.push(i / segments * 2, y * 3);
      if (j && i < segments) {
        const b = j * (segments + 1) + i, p = b - segments - 1;
        if (rings[j][0] >= rings[j - 1][0]) indices.push(p, p + 1, b, p + 1, b + 1, b);
        else indices.push(p, b, p + 1, p + 1, b, b + 1);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals();
  // Welding normals across the seam prevents a vertical highlight on smooth skin.
  const normals = g.attributes.normal;
  for (let j = 0; j < rings.length; j++) {
    const a = j * (segments + 1), b = a + segments;
    const n = new THREE.Vector3().fromBufferAttribute(normals, a).add(new THREE.Vector3().fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
  }
  g.computeBoundingSphere(); return g;
}

// Tapered, curved bone/tendon. Unlike a stretched cone, the silhouette changes
// continuously from a broad attachment to a narrow hook with a rounded section.
export function tendon(points, radius = .025, tip = .004, segments = 20, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, segments, 1, radial, false);
  const p = g.attributes.position;
  for (let j = 0; j <= segments; j++) {
    const t = j / segments, c = curve.getPointAt(t);
    const r = radius * (1 - t) + tip * t;
    const swell = 1 + .12 * Math.sin(t * Math.PI * 3);
    for (let i = 0; i <= radial; i++) {
      const k = j * (radial + 1) + i;
      p.setXYZ(k, c.x + (p.getX(k) - c.x) * r * swell,
        c.y + (p.getY(k) - c.y) * r * swell, c.z + (p.getZ(k) - c.z) * r * swell);
    }
  }
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

export function boneHorn() {
  return loft([[-.50,.18,.19,0,0],[-.43,.33,.28,0,0],[-.24,.29,.26,.015,0],
    [0,.22,.19,.045,.015],[.24,.13,.12,.065,.04],[.43,.045,.04,.06,.095],[.50,.0005,.0005,.04,.14]],
  { segments: 14, subdivisions: 2, folds: .10 });
}

export function wornPlate() {
  const shape = new THREE.Shape(), r = .065;
  shape.moveTo(-.5 + r,-.5); shape.lineTo(.5-r,-.5); shape.quadraticCurveTo(.5,-.5,.5,-.5+r);
  shape.lineTo(.5,.5-r); shape.quadraticCurveTo(.5,.5,.5-r,.5); shape.lineTo(-.5+r,.5);
  shape.quadraticCurveTo(-.5,.5,-.5,.5-r); shape.lineTo(-.5,-.5+r); shape.quadraticCurveTo(-.5,-.5,-.5+r,-.5);
  const g = new THREE.ExtrudeGeometry(shape,{depth:.87, bevelEnabled:true,bevelThickness:.065,bevelSize:.04,bevelSegments:2,steps:1,curveSegments:2});
  g.translate(0,0,-.435);
  return g;
}

export function wingMembrane() {
  const shape=new THREE.Shape();
  shape.moveTo(0,0);shape.bezierCurveTo(-.08,.10,-.31,.25,-.33,.45);
  shape.bezierCurveTo(-.36,.61,-.24,.78,-.13,.80);
  // Scalloped trailing edge: the silhouette belongs to an insect, not a kite.
  shape.quadraticCurveTo(-.04,.72,.012,.77);shape.quadraticCurveTo(.09,.67,.15,.69);
  shape.quadraticCurveTo(.18,.60,.235,.60);shape.quadraticCurveTo(.22,.49,.28,.48);
  shape.bezierCurveTo(.25,.30,.075,.12,0,0);
  const g=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:false,curveSegments:12,steps:1});
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i);
    p.setZ(i,p.getZ(i)+Math.sin(y*4.3)*.027+(Math.sin(x*35+y*21)*.004)*Math.min(1,y*8));
  }
  g.computeVertexNormals();return g;
}

// Original procedural material maps; no downloaded or generated photo assets.
// Colour is a multiplier for authored linear vertex colour, not a second tint.
const MATERIAL_MAPS = new Map();
export function characterMaps(kind = 'hide') {
  if (MATERIAL_MAPS.has(kind)) return MATERIAL_MAPS.get(kind);
  const N = 512, col = new Uint8Array(N*N*4), bump = new Uint8Array(N*N*4), rough = new Uint8Array(N*N*4);
  const hash = (x,y) => { let n = Math.imul(x,374761393) ^ Math.imul(y,668265263); n = Math.imul(n ^ n>>>13,1274126177); return ((n ^ n>>>16)>>>0)/4294967295; };
  const smooth = (x,y,scale) => {
    const u=x/scale,v=y/scale, ix=Math.floor(u),iy=Math.floor(v), f=u-ix,g=v-iy;
    const a=f*f*(3-2*f),b=g*g*(3-2*g);
    const m=(p,q,t)=>p+(q-p)*t;
    return m(m(hash(ix,iy),hash(ix+1,iy),a),m(hash(ix,iy+1),hash(ix+1,iy+1),a),b);
  };
  for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
    const k=(y*N+x)*4, grain=hash(x,y), low=smooth(x,y,64), mid=smooth(x,y,13), small=smooth(x,y,4);
    let colour=1, height=.5, roughness=.85;
    if(kind==='cloth') {
      const weave=(Math.sin(x*Math.PI*.5)*Math.sin(y*Math.PI*.5))*.05;
      const twill=Math.sin((x+y)*Math.PI*.25)*.035;
      colour=.85+low*.08+mid*.05+grain*.025+weave;
      height=.48+weave+twill+(grain-.5)*.08; roughness=.88+mid*.10;
    } else if(kind==='skin') {
      const pores=Math.pow(grain,12), crease=Math.pow(1-Math.abs(Math.sin(x*.037+y*.013+mid*2.7)),20);
      colour=.93+mid*.045+(low-.5)*.035-pores*.022;
      height=.48+(small-.5)*.055-pores*.10-crease*.018; roughness=.70+mid*.12-pores*.035;
    } else if(kind==='leather') {
      const crease=Math.pow(1-Math.abs(Math.sin(x*.047+y*.014+low*8)),14);
      colour=.76+mid*.13+grain*.035-crease*.12; height=.5+small*.13-crease*.22;roughness=.62+mid*.20;
    } else {
      const grainLines=Math.sin(y*.105+Math.sin(x*.021)*3+low*9);
      const veins=Math.pow(1-Math.abs(Math.sin(x*.032+y*.012+low*5+mid*.45)),18);
      const scars=Math.pow(Math.max(0,grainLines),24)*(mid>.44?1:.2);
      colour=.75+low*.12+mid*.11+grain*.025-veins*.20;
      height=.45+small*.12+mid*.14-veins*.14+scars*.10;
      roughness=.64+mid*.24-veins*.19;
    }
    for(let c=0;c<3;c++) {
      col[k+c]=Math.max(0,Math.min(255,colour*255));
      bump[k+c]=Math.max(0,Math.min(255,height*255));
      rough[k+c]=Math.max(0,Math.min(255,roughness*255));
    }
    col[k+3]=bump[k+3]=rough[k+3]=255;
  }
  const texture=(data,name)=>{const t=new THREE.DataTexture(data,N,N);t.name='character-'+kind+'-'+name;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;
    t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;};
  const maps={map:texture(col,'colour'),bumpMap:texture(bump,'relief'),roughnessMap:texture(rough,'roughness')};
  MATERIAL_MAPS.set(kind,maps);return maps;
}
