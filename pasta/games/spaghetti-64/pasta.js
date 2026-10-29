import * as THREE from './vendor/three.module.js';
import {PastaStrand} from './noodle-dynamics.js';

// Every visible surface made by this module is an actual pasta strand or ribbon.
// Shared merged meshes keep the numerous strands practical on mobile GPUs.
export function createPastaKit() {
  const TAU = Math.PI * 2;
  const v = (p) => p?.isVector3 ? p.clone() : new THREE.Vector3(...p);
  const rng = (seed = 1) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = grainCanvas.height = 128;
  const ctx = grainCanvas.getContext('2d');
  const image = ctx.createImageData(128, 128), rand = rng(7219);
  for (let i = 0; i < 128 * 128; i++) {
    const x = i % 128, y = Math.floor(i / 128);
    const b = 209 + rand() * 37 + 4 * Math.sin(y * .65 + Math.sin(x * .2));
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = b;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(2, 18);
  grain.anisotropy = 4;
  const mat = (color, roughness = .31) => new THREE.MeshPhysicalMaterial({
    color, metalness: 0, roughness, clearcoat: .68, clearcoatRoughness: .21,
    ior: 1.46, specularIntensity: .72, sheen: .16, sheenColor: new THREE.Color('#f2d39a'),
    sheenRoughness: .75, bumpMap: grain, bumpScale: .007,
    roughnessMap: grain, side: THREE.FrontSide,
  });
  const materials = {
    egg: mat('#e8c98a'), tomato: mat('#b65035'), spinach: mat('#77824a', .38),
    ink: mat('#292524', .34), saffron: mat('#e7ae3c'), white: mat('#eee0b7'),
    blue: mat('#586e81'), toasted: mat('#a26c39', .38), pink: mat('#cb8e79'),
    dark: mat('#171412', .43),
  };
  materials.egg.name = 'Cooked durum spaghetti';
  materials.tomato.name = 'Tomato-infused spaghetti';
  materials.spinach.name = 'Spinach spaghetti';
  materials.ink.name = 'Squid-ink spaghetti';
  materials.saffron.name = 'Saffron pasta';
  materials.white.name = 'Rice pasta';
  materials.blue.name = 'Butterfly-pea pasta';
  materials.toasted.name = 'Toasted pasta';
  const material = m => typeof m === 'string' ? (materials[m] || materials.egg) : (m || materials.egg);

  function tubePoints(points, radius, sides = 6) {
    const n = points.length;
    const positions = new Float32Array(n * sides * 3), normals = new Float32Array(n * sides * 3), uvs = new Float32Array(n * sides * 2);
    const indices = new Uint32Array((n - 1) * sides * 6);
    const tangent = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    let previous = new THREE.Vector3(1, 0, 0), length = 0;
    for (let i = 0; i < n; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
      tangent.subVectors(b, a).normalize();
      right.copy(previous).addScaledVector(tangent, -previous.dot(tangent));
      if (right.lengthSq() < .001) right.set(0, 1, 0).addScaledVector(tangent, -tangent.y);
      right.normalize(); up.crossVectors(tangent, right).normalize(); previous.copy(right);
      if (i) length += points[i].distanceTo(points[i - 1]);
      const r = radius * (1 + .028 * Math.sin(i * .79));
      for (let j = 0; j < sides; j++) {
        const c = Math.cos(j / sides * TAU), s = Math.sin(j / sides * TAU), k = (i * sides + j) * 3;
        const nx = right.x * c + up.x * s, ny = right.y * c + up.y * s, nz = right.z * c + up.z * s;
        positions[k] = points[i].x + nx * r; positions[k + 1] = points[i].y + ny * r; positions[k + 2] = points[i].z + nz * r;
        normals[k] = nx; normals[k + 1] = ny; normals[k + 2] = nz;
        const t = (i * sides + j) * 2; uvs[t] = j / sides; uvs[t + 1] = length;
      }
      if (i < n - 1) for (let j = 0; j < sides; j++) {
        const a0 = i * sides + j, b0 = i * sides + (j + 1) % sides, c0 = (i + 1) * sides + j, d0 = (i + 1) * sides + (j + 1) % sides;
        const k = (i * sides + j) * 6;
        indices.set([a0, b0, c0, b0, d0, c0], k);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return geometry;
  }

  function noodleGeometry(points, radius = .04, segments, sides = 5) {
    const ps = points.map(v);
    if (ps.length < 2) return new THREE.BufferGeometry();
    if (ps.length === 2) return tubePoints(ps, radius, sides);
    const curve = new THREE.CatmullRomCurve3(ps, false, 'centripetal', .5);
    return tubePoints(curve.getPoints(segments || Math.max(8, Math.min(180, ps.length * 3))), radius, sides);
  }

  function mergeGeometry(geometries) {
    geometries = geometries.filter(g => g?.attributes?.position);
    let vertices = 0, indexCount = 0;
    for (const g of geometries) { vertices += g.attributes.position.count; indexCount += g.index ? g.index.count : g.attributes.position.count; }
    const positions = new Float32Array(vertices * 3), normals = new Float32Array(vertices * 3), uvs = new Float32Array(vertices * 2), indices = new Uint32Array(indexCount);
    let p = 0, idx = 0;
    for (const g of geometries) {
      const n = g.attributes.position.count;
      if (!g.attributes.normal) g.computeVertexNormals();
      positions.set(g.attributes.position.array, p * 3); normals.set(g.attributes.normal.array, p * 3);
      if (g.attributes.uv) uvs.set(g.attributes.uv.array, p * 2);
      if (g.index) for (let j = 0; j < g.index.count; j++) indices[idx++] = p + g.index.array[j];
      else for (let j = 0; j < n; j++) indices[idx++] = p + j;
      p += n;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.computeBoundingSphere(); return g;
  }

  function mesh(geometry, m = materials.egg) {
    const o = new THREE.Mesh(geometry, material(m)); o.castShadow = true; o.receiveShadow = true; return o;
  }
  function strand(points, radius = .04, m = materials.egg, segments) { return mesh(noodleGeometry(points, radius, segments), m); }
  const translated = (g, x = 0, y = 0, z = 0) => g.translate(x, y, z);

  function winding(rx, ry, rz, radius, seed = 1, turns) {
    const random = rng(seed), phase = random() * TAU;
    turns ||= Math.max(9, Math.ceil(Math.PI * ry / (radius * 1.7)));
    const count = turns * 10, ps = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count, phi = .025 + (Math.PI - .05) * t, theta = t * TAU * turns + phase;
      const jitter = 1 + .016 * Math.sin(theta * 2.3 + 1.2) + .009 * Math.sin(theta * 7.1);
      ps.push(new THREE.Vector3(rx * Math.sin(phi) * Math.cos(theta) * jitter, ry * Math.cos(phi) + radius * .1 * Math.sin(theta * 3.7), rz * Math.sin(phi) * Math.sin(theta) * jitter));
    }
    return tubePoints(ps, radius, 5);
  }

  function coilBall(radius = .5, m = materials.egg, seed = 1) {
    const group = new THREE.Group(); group.add(mesh(winding(radius, radius, radius, radius * .063, seed), m));
    group.userData.radius = radius; return group;
  }
  const ellipsoid = (rx, ry, rz, m, radius = .027, seed = 1) => mesh(winding(rx, ry, rz, radius, seed), m);
  function bundle(a, b, width, m, count = 7, seed = 1) {
    a = v(a); b = v(b); const direction = b.clone().sub(a).normalize();
    const right = new THREE.Vector3(1, 0, 0).addScaledVector(direction, -direction.x).normalize();
    if (right.lengthSq() < .1) right.set(0, 0, 1);
    const up = new THREE.Vector3().crossVectors(direction, right).normalize(), gs = [];
    for (let i = 0; i < count; i++) {
      const phase = i / count * TAU + seed, points = [];
      for (let j = 0; j <= 7; j++) {
        const t = j / 7, angle = phase + t * TAU * 1.1;
        points.push(a.clone().lerp(b, t).addScaledVector(right, Math.cos(angle) * width * .62).addScaledVector(up, Math.sin(angle) * width * .62));
      }
      gs.push(noodleGeometry(points, width * .32, 18));
    }
    return mesh(mergeGeometry(gs), m);
  }

  function ringGeometry(rx, ry, z, radius, phase = 0, samples = 32, sides = 5) {
    const ps = [];
    for (let i = 0; i <= samples; i++) {
      const a = i / samples * TAU; ps.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, z + Math.sin(a * 3 + phase) * radius * .15));
    }
    return tubePoints(ps, radius, sides);
  }
  function eyeGeometry(x, y, z, size = .08) {
    return noodleGeometry([[x, y - size * .55, z], [x, y, z + size * .10], [x, y + size * .55, z]], size * .46, 5, 5);
  }
  function addEyes(g, y, z, spacing, size) {
    g.add(mesh(mergeGeometry([eyeGeometry(-spacing, y, z, size), eyeGeometry(spacing, y, z, size)]), materials.white));
    g.add(mesh(mergeGeometry([
      noodleGeometry([[-spacing, y - size * .34, z + size * .44], [-spacing, y + size * .34, z + size * .44]], size * .20, 2, 5),
      noodleGeometry([[spacing, y - size * .34, z + size * .44], [spacing, y + size * .34, z + size * .44]], size * .20, 2, 5),
    ]), materials.ink));
  }

  function spring(value, speed, target, stiffness, damping, dt) {
    speed += (target - value) * stiffness * dt; speed *= Math.exp(-damping * dt);
    return [value + speed * dt, speed];
  }

  function makeLooseStrand(anchor, length = .35, radius = .019, seed = 1, m = materials.egg) {
    const nodes=10,start=v(anchor),points=Array.from({length:nodes},(_,i)=>start.clone().add(new THREE.Vector3(Math.sin(i*.7+seed)*.018,-i*length/(nodes-1),Math.cos(i*.6+seed)*.014)));
    const simulation=new PastaStrand(points,{radius,iterations:9}),g=tubePoints(points,radius,6),o=mesh(g,m);o.frustumCulled=false;
    const update=(dt,acceleration=0,time=0,submerged=0,options={})=>{
      simulation.update(dt,{anchor:start,acceleration:typeof acceleration==='number'?{z:-acceleration}:acceleration,submerged,softness:options.softness??.55,floor:options.floor??-Infinity,colliders:options.colliders||[]});
      const next=tubePoints(simulation.points.map(p=>new THREE.Vector3(p.x,p.y,p.z)),radius,6);
      for(const name of ['position','normal']){g.attributes[name].array.set(next.attributes[name].array);g.attributes[name].needsUpdate=true;}next.dispose();
    };
    return{mesh:o,update,simulation};
  }
  let photoTask;
  function loadPhotographicSurfaces(){
    if(photoTask)return photoTask;
    photoTask=Promise.allSettled(['cooked-spaghetti-macro.png','rice-noodle-surface.png','ink-noodle-surface.png'].map(file=>new THREE.TextureLoader().loadAsync('./assets/'+file))).then(results=>{
      const maps=results.map(r=>r.status==='fulfilled'?r.value:null);
      for(const [name,m]of Object.entries(materials)){
        const base=maps[name==='white'||name==='blue'?1:name==='ink'||name==='dark'?2:0];if(!base)continue;
        const map=base.clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(.025,.19);map.offset.set(.42,.12);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;map.needsUpdate=true;
        m.map=map;m.bumpMap=grain;m.bumpScale=.006;m.roughnessMap=grain;m.clearcoat=name==='toasted'?.25:.46;m.clearcoatRoughness=.29;m.needsUpdate=true;
      }
      return maps;
    });return photoTask;
  }
  function keyModel(size=1){
    const g=new THREE.Group(),parts=[];for(let j=0;j<5;j++)parts.push(ringGeometry(.29+j*.032,.29+j*.032,0,.027,0,40,6).translate(0,.45,0));
    for(let i=0;i<4;i++)parts.push(noodleGeometry([[(i-1.5)*.041,.16,0],[(i-1.5)*.041,-.63,0],[(i-1.5)*.041+.32,-.63,0],[(i-1.5)*.041+.32,-.43,0]],.03,20,6));
    g.add(mesh(mergeGeometry(parts),materials.saffron));g.scale.setScalar(size);g.name='Key braided entirely from saffron spaghetti';return g;
  }

  function hero() {
    const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
    root.name = 'Spaghetti Mario';
    const torso = ellipsoid(.31, .30, .225, materials.tomato, .024, 12); torso.position.y = 1.02; rig.add(torso);
    const belly = ellipsoid(.29, .26, .23, materials.blue, .024, 33); belly.position.set(0, .85, .015); rig.add(belly);
    const bib = [];
    for (let x = -.15; x <= .151; x += .04) bib.push(noodleGeometry([[x, .88, .23], [x, 1.03, .22], [x, 1.14, .19]], .021, 12));
    for (const x of [-.17, .17]) bib.push(noodleGeometry([[x, .92, .23], [x, 1.18, .19], [x, 1.27, .025], [x, 1.16, -.20]], .033, 20));
    rig.add(mesh(mergeGeometry(bib), materials.blue));
    rig.add(mesh(mergeGeometry([translated(winding(.035, .035, .018, .010, 4, 7), -.16, 1.065, .244), translated(winding(.035, .035, .018, .010, 4, 7), .16, 1.065, .244)]), materials.saffron));
    const head = new THREE.Group(); head.position.y = 1.43; rig.add(head);
    head.add(ellipsoid(.275, .265, .25, materials.egg, .021, 7));
    for (const x of [-.275, .275]) { const e = ellipsoid(.065, .082, .044, materials.egg, .012, 8); e.position.set(x, -.01, -.01); head.add(e); }
    const nose = ellipsoid(.09, .085, .115, materials.egg, .016, 19); nose.position.set(0, -.015, .25); head.add(nose);
    addEyes(head, .070, .228, .09, .066);
    const facial = [];
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * .052;
      facial.push(noodleGeometry([[x - .035, -.065, .235], [x, -.102 - .02 * Math.abs(i - 2.5), .274], [x + .04, -.07, .245]], .022, 10));
    }
    facial.push(noodleGeometry([[-.155, .148, .19], [-.10, .164, .225], [-.04, .15, .215]], .018, 10));
    facial.push(noodleGeometry([[.04, .15, .215], [.10, .164, .225], [.155, .148, .19]], .018, 10));
    head.add(mesh(mergeGeometry(facial), materials.ink));
    const cap = ellipsoid(.31, .145, .285, materials.tomato, .025, 17); cap.position.set(0, .208, -.018); head.add(cap);
    const brim = [];
    for (let i = 0; i < 6; i++) {
      const ps = [];
      for (let j = 0; j <= 32; j++) { const a = Math.PI * j / 32; ps.push([Math.cos(a) * (.285 - i * .029), .13 + .012 * Math.sin(a), .08 + Math.sin(a) * (.27 - i * .025)]); }
      brim.push(noodleGeometry(ps, .020, 64));
    }
    const capBrim=mesh(mergeGeometry(brim), materials.tomato);head.add(capBrim);
    const badge = ellipsoid(.072, .069, .018, materials.white, .012, 21); badge.position.set(0, .232, .252); head.add(badge);
    const capMark=strand([[-.035, .205, .276], [-.030, .259, .278], [0, .228, .282], [.030, .259, .278], [.035, .205, .276]], .008, materials.tomato, 20);head.add(capMark);
    root.userData.setCapVisible=value=>{for(const part of[cap,capBrim,badge,capMark])part.visible=!!value;};
    const arms = [], legs = [], springs = {bounce: 0, bv: 0, lean: 0, lv: 0, head: 0, hv: 0};
    for (let side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .32, 1.12, 0); rig.add(arm); arms.push(arm);
      arm.add(bundle([0, 0, 0], [side * .055, -.31, .015], .090, materials.tomato, 7, 8));
      const glove = ellipsoid(.092, .104, .087, materials.white, .017, 32); glove.position.set(side * .06, -.36, .016); arm.add(glove);
      arm.userData.swing = 0; arm.userData.velocity = 0;
      const leg = new THREE.Group(); leg.position.set(side * .155, .63, 0); rig.add(leg); legs.push(leg);
      leg.add(bundle([0, 0, 0], [side * .01, -.38, 0], .105, materials.blue, 8, 4));
      const shoe = ellipsoid(.13, .105, .205, materials.toasted, .021, 17); shoe.position.set(side * .015, -.51, .085); leg.add(shoe);
      leg.userData.swing = 0; leg.userData.velocity = 0;
    }
    const loose = [];
    for (let i = 0; i < 4; i++) {
      const strand = makeLooseStrand([-.14 + i * .09, .97, -.23], .24 + i * .025, .014, i + 2, materials.blue);
      rig.add(strand.mesh); loose.push(strand);
    }
    for(let i=0;i<4;i++){
      const strand=makeLooseStrand([-.22+i*.145,1.19,.22],.18+(i%2)*.05,.012,20+i,materials.tomato);rig.add(strand.mesh);loose.push(strand);
    }
    const wings=new THREE.Group();root.userData.wingRig=wings;wings.name='Wing cap made of folded rice noodles';head.add(wings);wings.visible=false;
    for(const side of[-1,1]){const wing=new THREE.Group();wing.position.set(side*.25,.24,-.035);for(let i=0;i<7;i++){const x=side*(.08+i*.045),height=.32-i*.026;wing.add(strand([[0,0,0],[x,height*.75,-.04],[x+side*.08,height,-.07],[x+side*.095,height*.72,-.075],[x*.5,0,-.035]],.022,materials.white,20));}wings.add(wing);}
    const skin=[];root.traverse(part=>{if(part.material&&!Array.isArray(part.material)){part.material=part.material.clone();skin.push({material:part.material,color:part.material.color.clone(),roughness:part.material.roughness,opacity:part.material.opacity});}});
    let currentCap='';root.userData.setCapEffect=type=>{if(type===currentCap)return;currentCap=type||'';wings.visible=type==='wing';for(const item of skin){const m=item.material;m.color.copy(item.color);m.transparent=type==='vanish';m.opacity=type==='vanish'?.32:item.opacity;m.depthWrite=type!=='vanish';m.roughness=type==='metal'?.19:item.roughness;if(type==='metal')m.color.lerp(new THREE.Color('#aeb6a1'),.7);m.needsUpdate=true;}};
    let priorSpeed = 0, priorGrounded = true;
    root.userData.update = (dt, state = {}) => {
      dt = Math.min(dt, .04); const time = state.time || 0, speed = state.speed || 0;
      const flying=!!state.flying,swimming=!!state.swimming,swim=swimming?1:0,stroke=state.strokePhase??time*4,pole=!!state.climbingPole,poleTop=!!state.poleTop;
      const slide=Math.max(0,Math.min(1,state.slideBlend??(state.sliding?1:0)));
      const bank=(state.slideBank||0)*slide;
      const stride = Math.sin(time * (7.8 + Math.min(speed, 8) * .35)), moving = Math.min(1, speed / 4);
      if (state.grounded && !priorGrounded) springs.bv = -Math.min(.9, .25 + Math.abs(state.vy || 0) * .055);
      const targetBounce = swimming ? Math.sin(stroke)*.025 : slide>.1 ? Math.sin(time*(8+speed))*.009 : state.grounded ? Math.abs(stride) * .045 * moving : .025;
      [springs.bounce, springs.bv] = spring(springs.bounce, springs.bv, targetBounce, 95, 12, dt);
      [springs.lean, springs.lv] = spring(springs.lean, springs.lv, (swimming?Math.max(-.3,Math.min(1.65,1.08-(state.swimPitch||0)*.65)):slide>.1?-.3+(state.slidePitch||0)*.6:Math.min(.17, speed * .012)), 48, 9, dt);
      [springs.head, springs.hv] = spring(springs.head, springs.hv, -springs.lean * .5 + Math.sin(time * 2) * .014, 22, 5, dt);
      const explicitSquash = state.squash == null ? 0 : state.squash;
      rig.position.y = springs.bounce + swim*.35 - slide*.34; rig.position.z=pole&&!poleTop?-.40:0;rig.rotation.x=flying?1.2-(state.flightPitch||0):poleTop?Math.PI:pole?-.12:springs.lean;rig.rotation.z=flying?(state.flightBank||0):bank*.7;
      const stretch = Math.max(.76, Math.min(1.13, 1 + springs.bounce * .42 - explicitSquash * .12));
      rig.scale.set(1 / Math.sqrt(stretch), stretch, (1+slide*.06) / Math.sqrt(stretch));
      head.rotation.x = springs.head; head.rotation.z = Math.sin(time * 3.1) * .018 * moving-bank*.4;
      for (let i = 0; i < 2; i++) {
        const sign = i ? 1 : -1;
        const legTarget = flying?.16:pole?poleTop?-.08:-.8+Math.sin(time*5+i*Math.PI)*Math.min(.2,Math.abs(state.poleSpeed||0)*.08):swimming ? Math.sin(stroke*2+i*Math.PI)*(.18+moving*.15) : slide>.1 ? -1.28+Math.sin(time*5+i)*.025 : state.grounded ? sign * stride * .58 * moving : -.24 + sign * .12;
        [legs[i].userData.swing, legs[i].userData.velocity] = spring(legs[i].userData.swing, legs[i].userData.velocity, legTarget, 105, 13, dt);
        legs[i].rotation.x = legs[i].userData.swing;
        const punching=(state.punch||0)>0&&i===1;
        const armTarget = flying?-1.25:pole?poleTop?-3.05:-1.42+Math.sin(time*5+i*Math.PI)*Math.min(.22,Math.abs(state.poleSpeed||0)*.09):punching ? -1.9 : swimming ? -1.8+Math.cos(stroke+i*.16)*.85 : slide>.1 ? (state.slideBraking?.15:-.5)+Math.sin(time*4+i)*.06 : state.holding ? -2.5 : (state.grounded ? -sign * stride * .58 * moving : -.65);
        [arms[i].userData.swing, arms[i].userData.velocity] = spring(arms[i].userData.swing, arms[i].userData.velocity, armTarget, 64, 9, dt);
        arms[i].rotation.x = arms[i].userData.swing; arms[i].rotation.z = sign * (flying?.85:pole?-.26:swimming?.38+Math.sin(stroke)*.25:slide>.1?.52+Math.abs(bank)*.25:.10+moving*.07);
        arms[i].scale.y=1+(punching?.28*Math.sin(Math.min(1,(state.punch||0)/.3)*Math.PI):0);
      }
      const acceleration = Math.max(-25, Math.min(25, (speed - priorSpeed) / Math.max(.01, dt)));
      for (const l of loose) l.update(dt, acceleration*(1-slide)-slide*speed*2.2, time, swim,{softness:state.softness??.55,floor:state.grounded?-rig.position.y:.05-2});
      wings.children.forEach((wing,i)=>wing.rotation.z=(i?1:-1)*(Math.sin(time*(flying?11:3))*.08));
      priorSpeed = speed; priorGrounded = !!state.grounded;
    };
    root.userData.looseStrands=loose;root.userData.radius = .34; root.userData.height = 1.84; root.userData.rig = rig;
    return root;
  }

  const templates = new Map();
  function bomb({boss = false, friendly = false} = {}) {
    const key = `bomb-${boss}-${friendly}`;
    let root;
    if (templates.has(key)) root = templates.get(key).clone(true);
    else {
      root = new THREE.Group(); const r = boss ? 1.65 : .53, cy = r * 1.29, color = friendly ? materials.pink : materials.ink;
      const body = coilBall(r, color, boss ? 39 : 13); body.position.y = cy; body.name = 'body'; root.add(body);
      const feet = [];
      for (const x of [-r * .58, r * .58]) feet.push(translated(winding(r * .36, r * .22, r * .52, r * .05, 20), x, r * .22, r * .19));
      root.add(mesh(mergeGeometry(feet), materials.saffron));
      addEyes(root, cy + r * .10, r * .96, r * .28, r * .25);
      const fuse = [];
      for (let i = 0; i < 3; i++) fuse.push(noodleGeometry([[(i - 1) * r * .07, cy + r * .9, 0], [r * .04, cy + r * 1.2, 0], [r * .28, cy + r * 1.32, .02]], r * .042, 20));
      root.add(mesh(mergeGeometry(fuse), materials.egg));
      if (boss) {
        const crown = [];
        for (let i = 0; i < 3; i++) crown.push(ringGeometry(r * .62, r * .62, 0, r * .045).rotateX(Math.PI / 2).translate(0, cy + r * (.94 + i * .08), 0));
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, b = (i + .5) / 8 * TAU, c = (i + 1) / 8 * TAU;
          crown.push(noodleGeometry([[Math.cos(a) * r * .62, cy + r * 1.08, Math.sin(a) * r * .62], [Math.cos(b) * r * .66, cy + r * 1.43, Math.sin(b) * r * .66], [Math.cos(c) * r * .62, cy + r * 1.08, Math.sin(c) * r * .62]], r * .065, 15));
        }
        root.add(mesh(mergeGeometry(crown), materials.saffron));
        const moustache = [];
        for (let i = 0; i < 14; i++) {
          const x = (i - 6.5) * r * .105;
          moustache.push(noodleGeometry([[x, cy - .06, r * .94], [x * 1.1, cy - r * .19, r * 1.04], [x * 1.12, cy - r * .14, r * .95]], r * .055, 12));
        }
        root.add(mesh(mergeGeometry(moustache), materials.white));
        for (const sign of [-1, 1]) {
          root.add(bundle([sign * r * .85, cy, 0], [sign * r * 1.25, cy - r * .35, r * .18], r * .14, materials.ink, 6, 2));
          const hand = coilBall(r * .22, materials.white, 8); hand.position.set(sign * r * 1.25, cy - r * .35, r * .18); root.add(hand);
        }
      }
      root.name = boss ? 'King Bob-omb in squid-ink spaghetti' : friendly ? 'Friendly beet-pasta Bob-omb' : 'Squid-ink spaghetti Bob-omb';
      templates.set(key, root);
      root = root.clone(true);
    }
    const body = root.getObjectByName('body'); let springY = 1, speedY = 0;
    root.userData.radius = boss ? 1.65 : .53;
    root.userData.update = (dt, state = {}) => {
      if (typeof state === 'number') state = {time:state};
      const t = state.time || 0, target = state.squash ? .72 : 1 + Math.sin(t * (boss ? 2 : 6)) * .026;
      [springY, speedY] = spring(springY, speedY, target, 34, 6, Math.min(.04, dt));
      body.scale.set(1 / Math.sqrt(springY), springY, 1 / Math.sqrt(springY));
    };
    return root;
  }

  function chomp(radius = 1.15) {
    const g = new THREE.Group(), cy = radius * 1.13;
    const ball = coilBall(radius, materials.ink, 99); ball.position.y = cy; g.add(ball);
    // Flattened ribbons of dark pasta make the mouth cavity; folded rice noodles form teeth.
    const mouth = ellipsoid(radius * .78, radius * .38, radius * .07, materials.dark, radius * .035, 31); mouth.position.set(0, cy - radius * .13, radius * .90); g.add(mouth);
    const teeth = [];
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * radius * .21, edge = Math.sqrt(Math.max(0, 1 - (x / (radius * .85)) ** 2));
      for (let sign of [-1, 1]) teeth.push(noodleGeometry([[x - radius * .11, cy - radius * .13 + sign * edge * radius * .32, radius * .99], [x, cy - radius * .13 + sign * edge * radius * .06, radius * 1.05], [x + radius * .11, cy - radius * .13 + sign * edge * radius * .32, radius * .99]], radius * .035, 8));
    }
    g.add(mesh(mergeGeometry(teeth), materials.white));
    addEyes(g, cy + radius * .38, radius * .82, radius * .35, radius * .22);
    g.userData.radius = radius; g.userData.update = (dt, state = {}) => { const t = typeof state === 'number' ? state : state.time || 0; ball.scale.y = 1 + Math.sin(t * 5) * .035; };
    return g;
  }

  function tree(height = 4.2, seed = 1) {
    if (typeof height === 'object') { seed = height.seed || 1; height = height.height || 4.2; }
    const key = `tree-${Math.round(height * 10)}-${seed % 3}`;
    if (templates.has(key)) return templates.get(key).clone(true);
    const g = new THREE.Group(), h = height;
    const trunk = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      trunk.push(noodleGeometry([[Math.cos(a) * h * .035, 0, Math.sin(a) * h * .035], [.04 * h + Math.cos(a + 1) * h * .03, h * .36, Math.sin(a + 1) * h * .03], [.09 * h, h * .76, .025 * h]], h * .022, 8, 5));
    }
    g.add(mesh(mergeGeometry(trunk), materials.toasted));
    const crown = [];
    for (let i = 0; i < 3; i++) {
      const a = i * 2.4 + seed, x = i === 2 ? 0 : Math.cos(a) * h * .16, z = i === 2 ? 0 : Math.sin(a) * h * .16;
      crown.push(translated(winding(h * .235, h * .23, h * .23, h * .05, seed + i, 8), x, h * (.71 + (i === 2 ? .12 : 0)), z));
    }
    g.add(mesh(mergeGeometry(crown), materials.spinach)); templates.set(key, g); return g.clone(true);
  }

  function coin(radius = .25, red = false) {
    const key = `coin-${radius}-${red}`;
    if (templates.has(key)) return templates.get(key).clone(true);
    const g = new THREE.Group(), gs = [];
    for (let i = 0; i < 3; i++) gs.push(ringGeometry(radius * (1 - i * .34), radius * (1 - i * .34), 0, radius * .15, i, 16, 4));
    g.add(mesh(mergeGeometry(gs), red ? materials.tomato : materials.saffron));
    g.userData.radius = radius; templates.set(key, g); return g.clone(true);
  }

  function star(scale = 1) {
    const g = new THREE.Group(), gs = [];
    for (let layer = 0; layer < 7; layer++) {
      const points = [], r = (1 - layer * .127) * scale;
      for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i / 10 * TAU, radius = (i % 2 === 0 ? .68 : .31) * r; points.push([Math.cos(a) * radius, Math.sin(a) * radius, Math.sin(layer * .7) * .025 * scale]); }
      gs.push(noodleGeometry(points, scale * .038, 60, 7));
    }
    g.add(mesh(mergeGeometry(gs), materials.saffron));
    const eyes = [];
    for (let sign of [-1, 1]) eyes.push(noodleGeometry([[sign * .105 * scale, .10 * scale, .058 * scale], [sign * .105 * scale, .035 * scale, .064 * scale], [sign * .105 * scale, -.035 * scale, .058 * scale]], .018 * scale, 10));
    g.add(mesh(mergeGeometry(eyes), materials.ink)); g.userData.radius = .65 * scale; return g;
  }

  function fence(length = 5, height = .9, seed = 1) {
    const g = new THREE.Group(), geoms = [], count = Math.max(2, Math.ceil(length / 1.2));
    for (let i = 0; i <= count; i++) {
      const x = (i / count - .5) * length;
      for (let j = 0; j < 5; j++) {
        const phase = j / 5 * TAU; geoms.push(noodleGeometry([[x + Math.cos(phase) * .04, 0, Math.sin(phase) * .04], [x + .025 + Math.cos(phase + 1) * .04, height * .5, Math.sin(phase + 1) * .04], [x + Math.cos(phase + 2) * .04, height, Math.sin(phase + 2) * .04]], .032, 14));
      }
    }
    for (const y of [height * .36, height * .8]) for (let j = 0; j < 3; j++) {
      const ps = []; for (let i = 0; i <= count * 2; i++) ps.push([(i / (count * 2) - .5) * length, y - .035 * Math.sin(i / (count * 2) * Math.PI) + j * .025, .05 + Math.cos(i + j + seed) * .018]);
      geoms.push(noodleGeometry(ps, .032, count * 10));
    }
    g.add(mesh(mergeGeometry(geoms), materials.toasted)); return g;
  }

  function pole(height = 3, radius = .12) {
    const g = new THREE.Group(); g.add(bundle([0, 0, 0], [0, height, 0], radius, materials.toasted, 8, 7));
    const top = coin(radius * 1.5); top.rotation.x = Math.PI / 2; top.position.y = height; g.add(top); return g;
  }

  function gate(width = 3, height = 3) {
    const g = new THREE.Group(), gs = [];
    for (let x = -width / 2; x <= width / 2 + .01; x += width / 10) {
      for (let i = 0; i < 3; i++) gs.push(noodleGeometry([[x + (i - 1) * .028, 0, 0], [x + (i - 1) * .028, height * .5, .025], [x + (i - 1) * .028, height, 0]], .034, 16));
    }
    for (let y of [height * .12, height * .9]) for (let i = 0; i < 3; i++) gs.push(noodleGeometry([[-width * .53, y + i * .03, .02], [0, y + i * .03, .04], [width * .53, y + i * .03, .02]], .034, 16));
    g.add(mesh(mergeGeometry(gs), materials.ink)); return g;
  }

  function cannon(radius = .65) {
    const g = new THREE.Group(), gs = [];
    for (let i = 0; i < 14; i++) gs.push(ringGeometry(radius, radius, -radius * .8 + i * radius * .11, radius * .065));
    const tube = mesh(mergeGeometry(gs), materials.ink); tube.position.y = radius * .85; tube.rotation.x = -.23; g.add(tube);
    const rim = mesh(mergeGeometry([ringGeometry(radius * .98, radius * .98, radius * .72, radius * .09), ringGeometry(radius * .82, radius * .82, radius * .73, radius * .07)]), materials.toasted);
    rim.position.y = radius * .85; rim.rotation.x = -.23; g.add(rim);
    const base = ellipsoid(radius * 1.16, radius * .24, radius * 1.16, materials.toasted, radius * .07, 13); base.position.y = radius * .18; g.add(base);
    return g;
  }

  return {materials, loadPhotographicSurfaces, softStrand:makeLooseStrand, key:keyModel, strand, coilBall, hero, bomb, chomp, tree, coin, star, fence, pole, gate, cannon, noodleGeometry, mergeGeometry, winding, bundle};
}
