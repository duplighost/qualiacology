import * as THREE from '../vendor/three.module.min.js';
import { ENCOUNTERS, TRANSIT_TIMELINE, encounterByIndex, transitBeat } from './campaign-data.js';

const TAU = Math.PI * 2;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function material(name, options = {}) {
  const surface = new THREE.MeshStandardMaterial({
    name,
    roughness: .38,
    metalness: .48,
    ...options,
  });
  surface.dithering = true;
  return surface;
}

function mesh(parent, geometry, surface, {
  name = '', position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1],
  castShadow = false, receiveShadow = false, renderOrder = 0,
} = {}) {
  const object = new THREE.Mesh(geometry, surface);
  object.name = name;
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = castShadow;
  object.receiveShadow = receiveShadow;
  object.renderOrder = renderOrder;
  parent.add(object);
  return object;
}

function group(parent, name, position = [0, 0, 0]) {
  const object = new THREE.Group();
  object.name = name;
  object.position.set(...position);
  parent?.add(object);
  return object;
}

function disposeTree(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const surface of list) {
      if (!surface) continue;
      materials.add(surface);
      for (const value of Object.values(surface)) if (value?.isTexture) textures.add(value);
    }
  });
  root.removeFromParent();
  for (const geometry of geometries) geometry.dispose?.();
  for (const surface of materials) surface.dispose?.();
  for (const texture of textures) texture.dispose?.();
}

function seeded(index) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function createStarfield(parent, { count = 750, radius = 110, color = 0xbadfff, size = .22 } = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(color);
  const warm = new THREE.Color(0xffd7a2);
  for (let index = 0; index < count; index += 1) {
    const y = seeded(index * 3 + 1) * 2 - 1;
    const angle = seeded(index * 3 + 2) * TAU;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const distance = radius * (.72 + seeded(index * 3 + 3) * .28);
    positions[index * 3] = Math.sin(angle) * radial * distance;
    positions[index * 3 + 1] = y * distance;
    positions[index * 3 + 2] = Math.cos(angle) * radial * distance;
    const tint = base.clone().lerp(warm, seeded(index * 7 + 5) > .91 ? .72 : 0);
    const intensity = .55 + seeded(index * 5 + 2) * .45;
    colors[index * 3] = tint.r * intensity;
    colors[index * 3 + 1] = tint.g * intensity;
    colors[index * 3 + 2] = tint.b * intensity;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const surface = new THREE.PointsMaterial({
    name: 'campaign authored starfield', size, sizeAttenuation: true,
    transparent: true, opacity: .9, vertexColors: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, surface);
  points.name = 'campaign deep starfield';
  parent.add(points);
  return points;
}

function createMirrorBasilica(scene) {
  const root = group(scene, 'THE MIRROR TIDE — complete arena');
  const sky = group(root, 'drowned basilica sky');
  const architecture = group(root, 'drowned basilica architecture');
  const floorGroup = group(root, 'living mirror floor');
  const mechanics = group(root, 'living prism anchor assembly');

  const abyss = material('mirror-tide abyss', {
    color: 0x030c18, roughness: .22, metalness: .62,
    emissive: 0x020813, emissiveIntensity: .7,
  });
  const pearl = material('drowned basilica pearl', {
    color: 0xd9f5f4, roughness: .32, metalness: .52,
    emissive: 0x0b2633, emissiveIntensity: .28,
  });
  const brass = material('drowned basilica rose gold', {
    color: 0xcc7ea8, roughness: .27, metalness: .82,
    emissive: 0x3b0d26, emissiveIntensity: .38,
  });
  const glass = new THREE.MeshStandardMaterial({
    name: 'living mirror glass', color: 0x82f3ff, roughness: .14, metalness: .38,
    transparent: true, opacity: .58,
    depthWrite: false, side: THREE.DoubleSide,
    emissive: new THREE.Color(0x0d4561), emissiveIntensity: .9,
  });
  const anchorLive = material('live prism anchor', {
    color: 0xb9ffff, roughness: .08, metalness: .12,
    emissive: 0x2abdd1, emissiveIntensity: 2.0,
  });
  const anchorBroken = material('broken prism anchor', {
    color: 0x2d3b48, roughness: .55, metalness: .4,
    emissive: 0x06121a, emissiveIntensity: .3,
  });
  const waterMaterial = new THREE.ShaderMaterial({
    name: 'animated mirror tide surface',
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uOpacity: { value: .42 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      uniform float uPhase;
      void main() {
        vUv = uv;
        vec3 p = position;
        float d = length(p.xy);
        p.z += sin(d * 2.4 - uTime * 1.4) * (0.025 + uPhase * 0.045);
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;
      void main() {
        vec2 p = vUv - .5;
        float r = length(p);
        float wave = sin(r * 92.0 - uTime * 2.1) * .5 + .5;
        float latticeBase = max(0.0, sin((p.x + p.y) * 74.0 + uTime) * sin((p.x - p.y) * 63.0 - uTime * .7));
        float lattice2 = latticeBase * latticeBase;
        float lattice = lattice2 * lattice2 * lattice2;
        vec3 cold = vec3(.06, .42, .58);
        vec3 rose = vec3(.66, .12, .48);
        vec3 color = mix(cold, rose, uPhase * .42) + wave * .08 + lattice * vec3(.22, .7, .8);
        float edge = 1.0 - smoothstep(.12, .5, r);
        vec3 abyss = vec3(.008, .035, .065);
        gl_FragColor = vec4(mix(abyss, color, edge * (.72 + uOpacity * .28)), 1.0);
      }
    `,
  });

  const collisionFloor = mesh(floorGroup, new THREE.CircleGeometry(16.6, 96), abyss, {
    name: 'mirror-tide collision floor', rotation: [-Math.PI * .5, 0, 0],
    receiveShadow: true,
  });
  collisionFloor.visible = false;
  const mirrorFloor = mesh(floorGroup, new THREE.CircleGeometry(16.45, 96), waterMaterial, {
    name: 'visible mirror tide', position: [0, .035, 0], rotation: [-Math.PI * .5, 0, 0],
    receiveShadow: false, renderOrder: 2,
  });
  mesh(floorGroup, new THREE.RingGeometry(15.85, 16.6, 96), brass, {
    name: 'rose-gold basilica boundary', position: [0, .055, 0], rotation: [-Math.PI * .5, 0, 0],
    receiveShadow: true,
  });
  for (const radius of [3.8, 7.4, 11.2, 14.6]) {
    mesh(floorGroup, new THREE.TorusGeometry(radius, .035, 6, 96), glass, {
      name: `mirror tide ritual ring ${radius}`, position: [0, .08, 0], rotation: [Math.PI * .5, 0, 0],
      renderOrder: 3,
    });
  }

  const petalGeometry = new THREE.CylinderGeometry(.32, .72, 1, 5);
  petalGeometry.rotateX(Math.PI * .5);
  const petals = new THREE.InstancedMesh(petalGeometry, glass, 64);
  petals.name = 'sixty-four submerged mirror petals';
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.castShadow = false;
  petals.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const petalState = [];
  for (let index = 0; index < 64; index += 1) {
    const ring = index < 24 ? 10.2 : 13.2;
    const local = index < 24 ? index : index - 24;
    const total = index < 24 ? 24 : 40;
    const angle = local / total * TAU;
    dummy.position.set(Math.sin(angle) * ring, .02, Math.cos(angle) * ring);
    dummy.rotation.set(Math.PI * .5, angle, angle);
    dummy.scale.set(.55 + (index % 3) * .08, .7 + (index % 2) * .12, 1.4 + (index % 4) * .12);
    dummy.updateMatrix();
    petals.setMatrixAt(index, dummy.matrix);
    petalState.push({ angle, ring, baseY: .02, spin: (index % 2 ? 1 : -1) * (.08 + (index % 5) * .015) });
  }
  floorGroup.add(petals);

  const archColumn = new THREE.CylinderGeometry(.24, .38, 6.8, 8);
  const archSpire = new THREE.ConeGeometry(.55, 3.2, 6);
  const archLintel = new THREE.TorusGeometry(1.5, .18, 8, 32, Math.PI);
  const archGlass = new THREE.OctahedronGeometry(.45, 1);
  const archBatch = (geometry, surface, count, name, { receiveShadow = false, renderOrder = 0 } = {}) => {
    const batch = new THREE.InstancedMesh(geometry, surface, count);
    batch.name = name;
    batch.castShadow = false;
    batch.receiveShadow = receiveShadow;
    batch.renderOrder = renderOrder;
    batch.frustumCulled = false;
    architecture.add(batch);
    return batch;
  };
  const archBatches = {
    pearlColumns: archBatch(archColumn, pearl, 14, 'fourteen pearl basilica columns', { receiveShadow: true }),
    abyssColumns: archBatch(archColumn, abyss, 14, 'fourteen obsidian basilica columns', { receiveShadow: true }),
    spires: archBatch(archSpire, brass, 28, 'twenty-eight rose-gold basilica needles'),
    lintels: archBatch(archLintel, pearl, 14, 'fourteen drowned basilica lintels'),
    tears: archBatch(archGlass, glass, 14, 'fourteen suspended basilica tears', { renderOrder: 3 }),
  };
  const archRootDummy = new THREE.Object3D();
  const archChildDummy = new THREE.Object3D();
  archRootDummy.add(archChildDummy);
  let pearlColumnIndex = 0;
  let abyssColumnIndex = 0;
  let spireIndex = 0;
  for (let index = 0; index < 14; index += 1) {
    const angle = index / 14 * TAU;
    const radius = 20.2;
    archRootDummy.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    archRootDummy.rotation.set(0, angle, 0);
    archRootDummy.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      archChildDummy.position.set(side * 1.5, 3.25, 0);
      archChildDummy.rotation.set(0, 0, 0);
      archChildDummy.scale.set(1, 1, 1);
      archChildDummy.updateMatrixWorld(true);
      if (index % 2) archBatches.pearlColumns.setMatrixAt(pearlColumnIndex++, archChildDummy.matrixWorld);
      else archBatches.abyssColumns.setMatrixAt(abyssColumnIndex++, archChildDummy.matrixWorld);
      archChildDummy.position.set(side * 1.5, 7.25, 0);
      archChildDummy.updateMatrixWorld(true);
      archBatches.spires.setMatrixAt(spireIndex++, archChildDummy.matrixWorld);
    }
    archChildDummy.position.set(0, 5.95, 0);
    archChildDummy.rotation.set(0, 0, Math.PI);
    archChildDummy.updateMatrixWorld(true);
    archBatches.lintels.setMatrixAt(index, archChildDummy.matrixWorld);
    archChildDummy.position.set(0, 5.2, 0);
    archChildDummy.rotation.set(0, 0, 0);
    archChildDummy.scale.set(.58, 1.5, .25);
    archChildDummy.updateMatrixWorld(true);
    archBatches.tears.setMatrixAt(index, archChildDummy.matrixWorld);
  }
  Object.values(archBatches).forEach((batch) => { batch.instanceMatrix.needsUpdate = true; });

  const moon = group(sky, 'the drowned mirror moon', [0, 25, -62]);
  mesh(moon, new THREE.CircleGeometry(14, 96), new THREE.MeshBasicMaterial({
    name: 'drowned moon face', color: 0xc9ffff, transparent: true, opacity: .72,
    side: THREE.DoubleSide, depthWrite: false,
  }), { name: 'enormous fractured mirror moon', renderOrder: -2 });
  const moonRings = [];
  for (let index = 0; index < 5; index += 1) {
    const ring = mesh(moon, new THREE.TorusGeometry(15.5 + index * 1.25, .09 + index * .025, 6, 96),
      index % 2 ? brass : glass, {
        name: `drowned moon orbit ${index + 1}`, rotation: [0, 0, index * .32], renderOrder: -1,
      });
    moonRings.push(ring);
  }
  const moonShardGeometry = new THREE.OctahedronGeometry(.8, 0);
  const moonShardInstances = new THREE.InstancedMesh(moonShardGeometry, glass, 46);
  moonShardInstances.name = 'forty-six instanced moon mirror shards';
  moonShardInstances.castShadow = false;
  moonShardInstances.receiveShadow = false;
  moonShardInstances.renderOrder = -1;
  moonShardInstances.frustumCulled = false;
  sky.add(moonShardInstances);
  const moonShardDummy = new THREE.Object3D();
  const moonShards = [];
  for (let index = 0; index < 46; index += 1) {
    const angle = seeded(index + 10) * TAU;
    const radius = 16 + seeded(index + 30) * 18;
    const entry = {
      x: Math.sin(angle) * radius,
      baseY: 16 + (seeded(index + 40) - .5) * 25,
      z: -52 + Math.cos(angle) * radius * .35,
      rotation: new THREE.Euler(seeded(index) * TAU, seeded(index + 3) * TAU, seeded(index + 7) * TAU),
      scale: new THREE.Vector3(.2 + seeded(index + 1) * .8, .6 + seeded(index + 2) * 1.8, .08 + seeded(index + 4) * .16),
      phase: seeded(index + 90) * TAU,
      speed: .08 + seeded(index + 80) * .16,
    };
    moonShards.push(entry);
    moonShardDummy.position.set(entry.x, entry.baseY, entry.z);
    moonShardDummy.rotation.copy(entry.rotation);
    moonShardDummy.scale.copy(entry.scale);
    moonShardDummy.updateMatrix();
    moonShardInstances.setMatrixAt(index, moonShardDummy.matrix);
  }
  moonShardInstances.instanceMatrix.needsUpdate = true;
  const stars = createStarfield(sky, { count: 820, radius: 125, color: 0xa5edff, size: .24 });

  const anchorGeometry = new THREE.OctahedronGeometry(.72, 1);
  const anchorNeedleGeometry = new THREE.ConeGeometry(.14, 2.8, 5);
  const anchorTargets = [];
  for (let index = 0; index < 4; index += 1) {
    const target = group(mechanics, `living mirror anchor ${index + 1}`);
    const pedestal = mesh(target, new THREE.CylinderGeometry(.74, 1.1, .65, 8), pearl, {
      name: `mirror anchor pedestal ${index + 1}`, position: [0, .32, 0], castShadow: false, receiveShadow: true,
    });
    const crystal = mesh(target, anchorGeometry, anchorLive, {
      name: `living prism crystal ${index + 1}`, position: [0, 2.1, 0], scale: [.78, 2.15, .78],
      castShadow: false,
    });
    const needle = mesh(target, anchorNeedleGeometry, brass, {
      name: `prism anchor needle ${index + 1}`, position: [0, 4.25, 0], castShadow: false,
    });
    const halo = mesh(target, new THREE.TorusGeometry(1.05, .055, 7, 42), glass, {
      name: `prism anchor halo ${index + 1}`, position: [0, 2.15, 0], rotation: [Math.PI * .5, 0, 0],
      renderOrder: 4,
    });
    const light = new THREE.PointLight(0x68efff, 12, 9, 2);
    light.name = `prism anchor light ${index + 1}`;
    light.position.set(0, 2.2, 0);
    // The crystal and halo already carry the anchor's glow. Keeping four live
    // forward-rendered point lights here multiplied the cost of every glass
    // fragment in phase three without adding readable combat information.
    light.visible = false;
    target.add(light);
    anchorTargets.push({ root: target, pedestal, crystal, needle, halo, light, broken: false, baseAngle: 0 });
  }

  const hemisphere = new THREE.HemisphereLight(0x83e9ff, 0x06101a, 1.8);
  hemisphere.name = 'mirror tide hemisphere light';
  root.add(hemisphere);
  const key = new THREE.DirectionalLight(0xd8ffff, 4.2);
  key.name = 'mirror moon key light';
  key.position.set(-10, 28, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  root.add(key);
  const under = new THREE.PointLight(0x27c8e8, 38, 42, 1.7);
  under.name = 'mirror tide underlight';
  under.position.set(0, -3, 0);
  root.add(under);
  const roseLight = new THREE.PointLight(0xff5fc8, 18, 34, 2);
  roseLight.name = 'widow rose horizon light';
  roseLight.position.set(0, 10, -20);
  root.add(roseLight);

  return {
    root,
    sky,
    architecture,
    floorGroup,
    mirrorFloor,
    waterMaterial,
    petals,
    petalState,
    archBatches,
    moon,
    moonRings,
    moonShardInstances,
    moonShardDummy,
    moonShards,
    stars,
    anchorTargets,
    anchorLive,
    anchorBroken,
    hemisphere,
    key,
    under,
    roseLight,
  };
}

function createBlackOrbit(scene) {
  const root = group(scene, 'THE BLACK ORBIT — complete arena');
  const sky = group(root, 'black orbit star grave');
  const platform = group(root, 'last-engine platform');
  const machinery = group(root, 'last-engine machinery');

  const voidMetal = material('last-engine void metal', {
    color: 0x111624, roughness: .28, metalness: .88,
    emissive: 0x080518, emissiveIntensity: .58,
  });
  const plate = material('last-engine armour plate', {
    color: 0x30394f, roughness: .34, metalness: .78,
    emissive: 0x0d1024, emissiveIntensity: .52,
  });
  const gold = material('last-engine burnt gold', {
    color: 0xc5842d, roughness: .24, metalness: .91,
    emissive: 0x501800, emissiveIntensity: .55,
  });
  const violet = material('last-engine singularity violet', {
    color: 0x925cff, roughness: .16, metalness: .42,
    emissive: 0x4b14bd, emissiveIntensity: 1.75,
  });
  const hot = new THREE.MeshBasicMaterial({
    name: 'last-engine captive sunlight', color: 0xffd060, toneMapped: false,
  });
  const holeMaterial = new THREE.ShaderMaterial({
    name: 'animated black-hole accretion disc',
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPhase: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPhase;
      void main(){
        vec2 p=vUv-.5;
        float r=length(p)*2.0;
        float a=atan(p.y,p.x);
        float bands=sin(r*72.0-a*8.0-uTime*5.0)*.5+.5;
        float spiral=pow(max(0.0,sin(r*34.0-a*5.0+uTime*2.2)),5.0);
        float ring=smoothstep(1.0,.13,r)*smoothstep(.18,.28,r);
        vec3 amber=vec3(1.0,.35,.035);
        vec3 violet=vec3(.46,.08,1.0);
        vec3 color=mix(amber,violet,.22+uPhase*.45)+bands*.25+spiral*.65;
        gl_FragColor=vec4(color,ring*(.26+bands*.42+spiral*.34));
      }
    `,
  });

  mesh(platform, new THREE.CircleGeometry(17.4, 6), plate, {
    name: 'hexagonal last-engine collision deck', rotation: [-Math.PI * .5, 0, 0],
    receiveShadow: true,
  });
  mesh(platform, new THREE.CircleGeometry(15.8, 6), voidMetal, {
    name: 'recessed last-engine inner deck', position: [0, .045, 0], rotation: [-Math.PI * .5, 0, Math.PI / 6],
    receiveShadow: true,
  });
  for (const radius of [4.2, 8.4, 12.6, 16.8]) {
    mesh(platform, new THREE.TorusGeometry(radius, radius === 16.8 ? .16 : .055, 8, 96),
      radius === 16.8 ? gold : violet, {
        name: `last-engine orbital rail ${radius}`, position: [0, .085, 0], rotation: [Math.PI * .5, 0, 0],
        receiveShadow: false,
      });
  }
  const spokeGeometry = new THREE.BoxGeometry(.18, .06, 16.1);
  for (let index = 0; index < 6; index += 1) {
    mesh(platform, spokeGeometry, index % 2 ? gold : violet, {
      name: `last-engine radial conductor ${index + 1}`, position: [0, .09, 0], rotation: [0, index * Math.PI / 3, 0],
      receiveShadow: false,
    });
  }

  const blackHole = group(root, 'black hole beneath the last engine', [0, -13.5, 0]);
  mesh(blackHole, new THREE.CircleGeometry(20, 128), holeMaterial, {
    name: 'black-hole accretion disc', rotation: [-Math.PI * .5, 0, 0], scale: [2.1, 2.1, 2.1],
    renderOrder: -3,
  });
  mesh(blackHole, new THREE.SphereGeometry(8.5, 48, 30), new THREE.MeshBasicMaterial({
    name: 'event horizon', color: 0x000000, side: THREE.FrontSide,
  }), { name: 'absolute event horizon', position: [0, -1.6, 0], renderOrder: -2 });
  const lens = mesh(blackHole, new THREE.TorusGeometry(9.2, .34, 10, 128), hot, {
    name: 'black-hole photon ring', position: [0, -1.5, 0], rotation: [Math.PI * .5, 0, 0], renderOrder: -1,
  });

  const pylonGeometry = new THREE.CylinderGeometry(.48, .8, 5.4, 6);
  const cageGeometry = new THREE.TorusGeometry(1.25, .11, 8, 40);
  const pylons = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * TAU;
    const rootPylon = group(machinery, `last-engine gravity pylon ${index + 1}`,
      [Math.sin(angle) * 20.5, 0, Math.cos(angle) * 20.5]);
    rootPylon.rotation.y = angle;
    mesh(rootPylon, pylonGeometry, index % 2 ? plate : voidMetal, {
      name: `gravity pylon body ${index + 1}`, position: [0, 2.7, 0], castShadow: true, receiveShadow: true,
    });
    const cage = mesh(rootPylon, cageGeometry, index % 2 ? gold : violet, {
      name: `gravity pylon cage ${index + 1}`, position: [0, 5.4, 0], rotation: [Math.PI * .5, 0, 0],
      castShadow: false,
    });
    const core = mesh(rootPylon, new THREE.OctahedronGeometry(.48, 1), hot, {
      name: `gravity pylon captive spark ${index + 1}`, position: [0, 5.4, 0], castShadow: false,
    });
    pylons.push({ root: rootPylon, cage, core, angle });
  }

  const debrisGeometry = new THREE.DodecahedronGeometry(1, 0);
  const debris = [];
  for (let index = 0; index < 72; index += 1) {
    const angle = seeded(index + 2) * TAU;
    const radius = 28 + seeded(index + 9) * 48;
    const object = mesh(sky, debrisGeometry, index % 7 === 0 ? gold : plate, {
      name: `orbital saint wreckage ${index + 1}`,
      position: [Math.sin(angle) * radius, -2 + seeded(index + 16) * 46, Math.cos(angle) * radius],
      rotation: [seeded(index + 30) * TAU, seeded(index + 40) * TAU, seeded(index + 50) * TAU],
      scale: [.2 + seeded(index + 60) * 1.5, .15 + seeded(index + 70) * .9, .3 + seeded(index + 80) * 2.1],
      castShadow: false,
    });
    debris.push({
      object,
      angle,
      radius,
      baseY: object.position.y,
      speed: .018 + seeded(index + 90) * .035,
      phase: seeded(index + 100) * TAU,
    });
  }
  const stars = createStarfield(sky, { count: 1050, radius: 145, color: 0xdbe8ff, size: .42 });

  // A distant Last Engine aperture gives the void a legible architectural
  // horizon without filling it with scenery. It is deliberately a handful of
  // unlit batches: the boss remains the brightest object, while the arena no
  // longer collapses into featureless black behind its crown.
  const horizonHalo = group(sky, 'distant last-engine aperture', [0, 18, -68]);
  const horizonViolet = new THREE.MeshBasicMaterial({
    name: 'distant aperture violet corona', color: 0x7136d9, transparent: true,
    opacity: .24, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, toneMapped: false, fog: false,
  });
  const horizonGold = new THREE.MeshBasicMaterial({
    name: 'distant aperture captive-sun rim', color: 0xff9b37, transparent: true,
    opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, toneMapped: false, fog: false,
  });
  mesh(horizonHalo, new THREE.RingGeometry(13.6, 15.2, 128), horizonViolet, {
    name: 'distant violet event-horizon corona', renderOrder: -8,
  });
  mesh(horizonHalo, new THREE.RingGeometry(17.6, 18.05, 128), horizonGold, {
    name: 'distant broken-sun perimeter', renderOrder: -7,
  });
  const horizonTickGeometry = new THREE.BoxGeometry(.24, 2.35, .08);
  const horizonTicks = new THREE.InstancedMesh(horizonTickGeometry, horizonGold, 12);
  horizonTicks.name = 'twelve distant last-engine hour scars';
  horizonTicks.frustumCulled = false;
  horizonTicks.renderOrder = -6;
  const horizonTick = new THREE.Object3D();
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * TAU;
    horizonTick.position.set(Math.sin(angle) * 16.35, Math.cos(angle) * 16.35, 0);
    horizonTick.rotation.z = -angle;
    horizonTick.scale.set(1, index % 3 === 0 ? 1.45 : .72, 1);
    horizonTick.updateMatrix();
    horizonTicks.setMatrixAt(index, horizonTick.matrix);
  }
  horizonTicks.instanceMatrix.needsUpdate = true;
  horizonHalo.add(horizonTicks);

  const hemisphere = new THREE.HemisphereLight(0xb19aff, 0x10061d, 1.42);
  hemisphere.name = 'black-orbit hemisphere light';
  root.add(hemisphere);
  const key = new THREE.DirectionalLight(0xffdfa2, 4.6);
  key.name = 'last-engine sun key';
  key.position.set(14, 25, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  root.add(key);
  const violetUnder = new THREE.PointLight(0x7c46ff, 52, 48, 1.65);
  violetUnder.name = 'event-horizon underlight';
  violetUnder.position.set(0, -5, 0);
  root.add(violetUnder);
  const amberRim = new THREE.PointLight(0xff6f2c, 28, 42, 1.8);
  amberRim.name = 'accretion amber rim';
  amberRim.position.set(-12, 7, -18);
  root.add(amberRim);

  return {
    root,
    sky,
    platform,
    machinery,
    blackHole,
    holeMaterial,
    lens,
    pylons,
    debris,
    stars,
    horizonHalo,
    hemisphere,
    key,
    violetUnder,
    amberRim,
  };
}

function createSaintship(scene) {
  const root = group(scene, 'WOUNDLIGHT — Nera player ship');
  root.visible = false;
  const hull = group(root, 'WOUNDLIGHT articulated hull');
  const black = material('WOUNDLIGHT void-black hull', {
    color: 0x181d2c, roughness: .22, metalness: .92,
    emissive: 0x102d49, emissiveIntensity: 1.18,
  });
  const pearl = material('WOUNDLIGHT pearl armour', {
    color: 0xe9edf2, roughness: .24, metalness: .76,
    emissive: 0x6a91a8, emissiveIntensity: .86,
  });
  const gold = material('WOUNDLIGHT antique gold', {
    color: 0xd39b43, roughness: .22, metalness: .9,
    emissive: 0x6b3507, emissiveIntensity: .9,
  });
  const crimson = new THREE.MeshPhysicalMaterial({
    name: 'WOUNDLIGHT crimson canopy', color: 0x9f1937, roughness: .12, metalness: .08,
    transmission: .32, thickness: .22, transparent: true, opacity: .82,
    emissive: new THREE.Color(0x72091f), emissiveIntensity: 1.35,
  });
  const driveGlass = new THREE.MeshBasicMaterial({
    name: 'WOUNDLIGHT cyan saintglass', color: 0x67eaff, toneMapped: false,
    transparent: true, opacity: .76, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const scripture = new THREE.MeshBasicMaterial({
    name: 'WOUNDLIGHT luminous pearl scripture', color: 0xdffbff, toneMapped: false,
    transparent: true, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outline = new THREE.LineBasicMaterial({
    name: 'WOUNDLIGHT cyan silhouette edge', color: 0x8bf6ff, toneMapped: false,
    transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const thruster = new THREE.MeshBasicMaterial({
    name: 'WOUNDLIGHT blue-white drive flame', color: 0xb8f7ff, toneMapped: false,
    transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false,
  });

  mesh(hull, new THREE.ConeGeometry(1.45, 7.8, 5), black, {
    name: 'WOUNDLIGHT spearhead fuselage', rotation: [Math.PI * .5, 0, 0], scale: [1, 1, .62],
    castShadow: true,
  });
  mesh(hull, new THREE.ConeGeometry(.82, 4.2, 5), pearl, {
    name: 'WOUNDLIGHT pearl dorsal blade', position: [0, .42, .4], rotation: [Math.PI * .5, 0, 0],
    scale: [.72, .76, .38], castShadow: true,
  });
  mesh(hull, new THREE.ConeGeometry(.58, 6.4, 5), pearl, {
    name: 'WOUNDLIGHT ventral pearl keel', position: [0, -.32, .28], rotation: [Math.PI * .5, 0, 0],
    scale: [.62, .82, .3], castShadow: false,
  });
  for (const side of [-1, 1]) {
    mesh(hull, new THREE.BoxGeometry(.09, .11, 5.6), gold, {
      name: `${side < 0 ? 'port' : 'starboard'} illuminated reliquary rail`,
      position: [side * .86, .08, .36], rotation: [0, side * -.055, 0], castShadow: false,
    });
    mesh(hull, new THREE.BoxGeometry(.055, .07, 4.6), driveGlass, {
      name: `${side < 0 ? 'port' : 'starboard'} saint-drive seam`,
      position: [side * .58, -.34, .62], rotation: [0, side * -.035, 0], castShadow: false,
      renderOrder: 7,
    });
  }
  mesh(hull, new THREE.SphereGeometry(.88, 24, 14), crimson, {
    name: 'WOUNDLIGHT bloodglass canopy', position: [0, .72, .15], scale: [.82, .42, 1.38],
    castShadow: false, renderOrder: 4,
  });
  mesh(hull, new THREE.TorusGeometry(1.34, .055, 7, 48), driveGlass, {
    name: 'WOUNDLIGHT saintglass drive halo', position: [0, .04, 2.38],
    scale: [1.16, .84, 1], renderOrder: 7,
  });
  const wingRoots = [];
  for (const side of [-1, 1]) {
    const wing = group(hull, `${side < 0 ? 'port' : 'starboard'} folding saint wing`, [side * .8, .02, .8]);
    wingRoots.push(wing);
    const wingShape = new THREE.BufferGeometry();
    wingShape.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, -2.5,  0, 0, 2.4,  side * 5.4, 0, 1.0,
      0, 0, -2.5,  side * 5.4, 0, 1.0,  side * 3.2, 0, -1.8,
    ], 3));
    wingShape.computeVertexNormals();
    mesh(wing, wingShape, black, {
      name: `${side < 0 ? 'port' : 'starboard'} calligraphic wing plane`, castShadow: true,
    });
    const wingOutline = new THREE.LineSegments(new THREE.EdgesGeometry(wingShape, 8), outline);
    wingOutline.name = `${side < 0 ? 'port' : 'starboard'} luminous calligraphic wing edge`;
    wingOutline.renderOrder = 8;
    wing.add(wingOutline);
    const inlayShape = new THREE.BufferGeometry();
    inlayShape.setAttribute('position', new THREE.Float32BufferAttribute([
      0, .035, -1.78,  0, .035, 1.82,  side * 3.65, .035, .82,
      0, .035, -1.78,  side * 3.65, .035, .82,  side * 2.18, .035, -1.18,
    ], 3));
    inlayShape.computeVertexNormals();
    mesh(wing, inlayShape, scripture, {
      name: `${side < 0 ? 'port' : 'starboard'} pearl wing scripture`, castShadow: false,
      renderOrder: 7,
    });
    mesh(wing, new THREE.BoxGeometry(4.9, .09, .14), gold, {
      name: `${side < 0 ? 'port' : 'starboard'} gold wing edge`, position: [side * 2.4, .06, .7],
      rotation: [0, side * -.12, 0], castShadow: false,
    });
    const tailGeometry = new THREE.BufferGeometry();
    tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      side * .18, 0, 0, side * 1.25, 0, .18, side * .42, 2.2, .7,
      side * .18, 0, 0, side * .42, 2.2, .7, side * .16, 0, 1.48,
    ], 3));
    tailGeometry.computeVertexNormals();
    mesh(wing, tailGeometry, side < 0 ? pearl : black, {
      name: `${side < 0 ? 'port' : 'starboard'} reliquary tail fin`,
      position: [side * .62, .03, 1.16], castShadow: true,
    });
  }
  const engines = [];
  for (const side of [-1, 1]) {
    const engine = group(hull, `${side < 0 ? 'port' : 'starboard'} WOUNDLIGHT engine`, [side * 1.08, -.18, 2.95]);
    mesh(engine, new THREE.CylinderGeometry(.38, .52, 1.6, 10), black, {
      name: `${side < 0 ? 'port' : 'starboard'} drive housing`, rotation: [Math.PI * .5, 0, 0], castShadow: true,
    });
    mesh(engine, new THREE.TorusGeometry(.46, .07, 8, 28), driveGlass, {
      name: `${side < 0 ? 'port' : 'starboard'} luminous drive crown`,
      position: [0, 0, .86], renderOrder: 7,
    });
    const flame = mesh(engine, new THREE.ConeGeometry(.48, 4.6, 10, 1, true), thruster, {
      name: `${side < 0 ? 'port' : 'starboard'} drive plume`, position: [0, 0, 2.8],
      rotation: [-Math.PI * .5, 0, 0], castShadow: false, receiveShadow: false, renderOrder: 8,
    });
    const innerFlame = mesh(engine, new THREE.ConeGeometry(.22, 5.8, 8, 1, true), scripture, {
      name: `${side < 0 ? 'port' : 'starboard'} white-hot drive needle`, position: [0, 0, 3.35],
      rotation: [-Math.PI * .5, 0, 0], castShadow: false, receiveShadow: false, renderOrder: 9,
    });
    engines.push({ engine, flame, innerFlame });
  }
  const boarding = group(hull, 'WOUNDLIGHT boarding aperture', [0, -.55, .2]);
  const boardingMaterial = new THREE.MeshBasicMaterial({
    name: 'WOUNDLIGHT geometric boarding radiance', color: 0x8ff7ff, toneMapped: false,
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const boardingBeam = mesh(boarding, new THREE.ConeGeometry(1.15, 8.5, 14, 1, true), boardingMaterial, {
    name: 'WOUNDLIGHT boarding light volume', position: [0, -4.35, 0], rotation: [0, 0, Math.PI],
    renderOrder: 6,
  });
  boardingBeam.visible = false;

  return { root, hull, wingRoots, engines, boarding, boardingBeam, boardingMaterial };
}

function createStarTunnel(scene) {
  const root = group(scene, 'WOUNDLIGHT inter-boss star tunnel');
  root.visible = false;
  const streakGeometry = new THREE.BoxGeometry(.105, .105, 1);
  const streakMaterial = new THREE.MeshBasicMaterial({
    name: 'star tunnel blue-white streak', color: 0xd9f9ff, transparent: true, opacity: .94,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const count = 320;
  const streaks = new THREE.InstancedMesh(streakGeometry, streakMaterial, count);
  streaks.name = 'three hundred twenty star-drive streaks';
  streaks.frustumCulled = false;
  root.add(streaks);
  const state = [];
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = seeded(index + 8) * TAU;
    const radius = 1.8 + Math.pow(seeded(index + 20), .6) * 20;
    const z = -80 + seeded(index + 40) * 160;
    const speed = 36 + seeded(index + 60) * 92;
    const length = 3 + seeded(index + 80) * 18;
    state.push({ angle, radius, z, speed, length });
    dummy.position.set(Math.sin(angle) * radius, Math.cos(angle) * radius, z);
    dummy.scale.set(1 + seeded(index + 90) * 2.5, 1 + seeded(index + 100) * 2.5, length);
    dummy.updateMatrix();
    streaks.setMatrixAt(index, dummy.matrix);
  }
  streaks.instanceMatrix.needsUpdate = true;

  const shellGeometry = new THREE.CylinderGeometry(5.5, 28, 132, 64, 8, true);
  const shellPosition = shellGeometry.getAttribute('position');
  const shellColors = new Float32Array(shellPosition.count * 3);
  const shellCyan = new THREE.Color(0x1b7699);
  const shellViolet = new THREE.Color(0x4d236f);
  const shellGold = new THREE.Color(0x6e3d18);
  const shellTint = new THREE.Color();
  for (let index = 0; index < shellPosition.count; index += 1) {
    const angle = Math.atan2(shellPosition.getZ(index), shellPosition.getX(index));
    const longitudinal = shellPosition.getY(index) / 132 + .5;
    const wave = .5 + Math.sin(angle * 3 + longitudinal * 9) * .5;
    shellTint.copy(shellViolet).lerp(shellCyan, wave);
    if (Math.sin(angle * 5 - longitudinal * 7) > .82) shellTint.lerp(shellGold, .38);
    const intensity = .45 + (.5 + Math.sin(angle * 2 - longitudinal * 11) * .5) * .55;
    shellColors[index * 3] = shellTint.r * intensity;
    shellColors[index * 3 + 1] = shellTint.g * intensity;
    shellColors[index * 3 + 2] = shellTint.b * intensity;
  }
  shellGeometry.setAttribute('color', new THREE.BufferAttribute(shellColors, 3));
  const shellMaterial = new THREE.MeshBasicMaterial({
    name: 'star-drive vertex aurora shell', color: 0xffffff, transparent: true, opacity: .3,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    side: THREE.BackSide, vertexColors: true,
  });
  mesh(root, shellGeometry, shellMaterial, {
    name: 'star-drive aurora throat', position: [0, 0, -48], rotation: [Math.PI * .5, 0, 0],
    renderOrder: -2,
  });
  const tunnelStars = createStarfield(root, { count: 900, radius: 86, color: 0xcaf6ff, size: .34 });
  tunnelStars.name = 'nine hundred distant star-drive sparks';

  const ringCount = 12;
  const ringMaterial = new THREE.MeshBasicMaterial({
    name: 'star-drive chromatic wake rings', color: 0xffffff, transparent: true, opacity: .58,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, vertexColors: true,
  });
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(1, .055, 6, 64), ringMaterial, ringCount);
  rings.name = 'twelve nested WOUNDLIGHT wake crowns';
  rings.frustumCulled = false;
  root.add(rings);
  const ringState = [];
  const ringPalette = [0x73efff, 0x9b72ff, 0xf3b65f].map((hex) => new THREE.Color(hex));
  for (let index = 0; index < ringCount; index += 1) {
    const z = -6 - index * 10;
    const radius = 5.1 + index * 2.05;
    const speed = 8.5 + index * .34;
    ringState.push({ z, radius, speed, twist: index * .37 });
    dummy.position.set(0, 0, z);
    dummy.rotation.set(0, 0, index * .37);
    dummy.scale.setScalar(radius);
    dummy.updateMatrix();
    rings.setMatrixAt(index, dummy.matrix);
    rings.setColorAt(index, ringPalette[index % ringPalette.length]);
  }
  rings.instanceMatrix.needsUpdate = true;
  if (rings.instanceColor) rings.instanceColor.needsUpdate = true;

  const aperture = group(root, 'saintfall vanishing aperture', [0, 0, -82]);
  const apertureCyan = new THREE.MeshBasicMaterial({
    name: 'saintfall aperture cyan', color: 0x72efff, transparent: true, opacity: .78,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const apertureViolet = apertureCyan.clone();
  apertureViolet.name = 'saintfall aperture violet';
  apertureViolet.color.setHex(0xa96cff);
  const apertureGold = apertureCyan.clone();
  apertureGold.name = 'saintfall aperture gold';
  apertureGold.color.setHex(0xffb854);
  mesh(aperture, new THREE.TorusGeometry(15, .18, 8, 96), apertureCyan, { name: 'outer saintfall aperture', renderOrder: 2 });
  mesh(aperture, new THREE.TorusGeometry(10.5, .11, 8, 80), apertureViolet, { name: 'violet saintfall aperture', rotation: [0, 0, .25], renderOrder: 2 });
  mesh(aperture, new THREE.TorusGeometry(4.2, .09, 8, 64), apertureGold, { name: 'gold saintfall aperture', rotation: [0, 0, -.3], renderOrder: 2 });
  const spokeMaterial = apertureCyan.clone();
  spokeMaterial.name = 'saintfall aperture scripture';
  spokeMaterial.opacity = .48;
  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(.07, 4.2, .06), spokeMaterial, 24);
  spokes.name = 'twenty-four radial aperture scriptures';
  for (let index = 0; index < 24; index += 1) {
    const angle = index / 24 * TAU;
    dummy.position.set(Math.sin(angle) * 7.2, Math.cos(angle) * 7.2, 0);
    dummy.rotation.set(0, 0, -angle);
    dummy.scale.set(1, index % 3 === 0 ? 1.45 : .72, 1);
    dummy.updateMatrix();
    spokes.setMatrixAt(index, dummy.matrix);
  }
  aperture.add(spokes);

  return {
    root, streaks, streakMaterial, state, dummy,
    rings, ringMaterial, ringState, aperture, tunnelStars,
  };
}

export function createCampaignWorld(scene, renderer, meridian) {
  const mirror = createMirrorBasilica(scene);
  const orbit = createBlackOrbit(scene);
  const ship = createSaintship(scene);
  const tunnel = createStarTunnel(scene);
  const baseBackground = scene.background;
  const baseFog = scene.fog;
  const mirrorBackground = new THREE.Color(0x031426);
  const mirrorFog = new THREE.FogExp2(0x031426, .0065);
  const orbitBackground = new THREE.Color(0x050411);
  const orbitFog = new THREE.FogExp2(0x0b061a, .0046);
  const tunnelBackground = new THREE.Color(0x020817);

  const pulsePools = [meridian.arenaGroup, mirror.root, orbit.root].map((parent, encounterIndex) => {
    const entries = [];
    for (let index = 0; index < 10; index += 1) {
      const surface = new THREE.MeshBasicMaterial({
        name: `campaign arena pulse ${encounterIndex}:${index}`, color: 0xffffff,
        transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const ring = mesh(parent, new THREE.RingGeometry(.92, 1.0, 48), surface, {
        name: `campaign arena impact ring ${encounterIndex}:${index}`,
        rotation: [-Math.PI * .5, 0, 0], renderOrder: 7,
      });
      ring.visible = false;
      entries.push({ ring, age: 0, duration: 0, strength: 0 });
    }
    return entries;
  });

  let encounterIndex = 0;
  let phaseGoal = 1;
  let phaseBlend = 0;
  let lastTime = 0;
  let pulseCursor = 0;
  let mechanicState = { total: 0, broken: 0, sealed: false };
  let transit = { active: false, from: 0, to: 1, progress: 0, switched: false };
  const transitCameraPosition = new THREE.Vector3();
  const transitCameraTarget = new THREE.Vector3();

  function applyVisibility() {
    const traveling = transit.active && transit.progress > .31 && transit.progress < .72;
    meridian.arenaGroup.visible = !traveling && encounterIndex === 0;
    meridian.skyGroup.visible = !traveling && encounterIndex === 0;
    mirror.root.visible = !traveling && encounterIndex === 1;
    orbit.root.visible = !traveling && encounterIndex === 2;
    tunnel.root.visible = traveling;
    if (traveling) {
      scene.background = tunnelBackground;
      scene.fog = null;
    } else if (encounterIndex === 1) {
      scene.background = mirrorBackground;
      scene.fog = mirrorFog;
    } else if (encounterIndex === 2) {
      scene.background = orbitBackground;
      scene.fog = orbitFog;
    } else {
      scene.background = baseBackground;
      scene.fog = baseFog;
    }
  }

  function setEncounter(index = 0, { immediate = false } = {}) {
    encounterIndex = Math.max(0, Math.min(ENCOUNTERS.length - 1, Math.round(index || 0)));
    phaseGoal = 1;
    if (immediate) phaseBlend = 0;
    mechanicState = { total: 0, broken: 0, sealed: false };
    applyVisibility();
    if (encounterIndex === 0) meridian.setPhase?.(1, { immediate });
    if (encounterIndex === 1) setMirrorTargets(3, 0);
  }

  function setPhase(phase, { immediate = false } = {}) {
    phaseGoal = Math.max(1, Math.min(3, Math.round(Number(phase) || 1)));
    if (immediate) phaseBlend = (phaseGoal - 1) * .5;
    if (encounterIndex === 0) meridian.setPhase?.(phaseGoal, { immediate });
  }

  function setMirrorTargets(total, broken, brokenIndices = []) {
    const safeTotal = Math.max(0, Math.min(mirror.anchorTargets.length, Math.round(total || 0)));
    const safeBroken = Math.max(0, Math.min(safeTotal, Math.round(broken || 0)));
    const explicitBroken = new Set((brokenIndices || [])
      .map((value) => Math.round(Number(value)))
      .filter((value) => value >= 0 && value < safeTotal));
    mirror.anchorTargets.forEach((target, index) => {
      const active = index < safeTotal;
      target.root.visible = active;
      target.broken = active && (explicitBroken.size ? explicitBroken.has(index) : index < safeBroken);
      if (!active) return;
      const angle = index / Math.max(1, safeTotal) * TAU + .18;
      target.baseAngle = angle;
      target.root.position.set(Math.sin(angle) * 10.9, 0, Math.cos(angle) * 10.9);
      target.root.rotation.y = angle;
      target.crystal.material = target.broken ? mirror.anchorBroken : mirror.anchorLive;
      target.crystal.scale.set(target.broken ? .5 : .78, target.broken ? .48 : 2.15, target.broken ? .72 : .78);
      target.crystal.position.y = target.broken ? .72 : 2.1;
      target.crystal.rotation.z = target.broken ? (index % 2 ? .78 : -.78) : 0;
      target.needle.visible = !target.broken;
      target.halo.visible = !target.broken;
      target.light.intensity = target.broken ? 1.2 : 12;
    });
  }

  function setMechanicState(state = {}) {
    mechanicState = { ...mechanicState, ...state };
    if (encounterIndex === 1) setMirrorTargets(mechanicState.total, mechanicState.broken, mechanicState.brokenIndices);
  }

  function mechanicTargets() {
    if (encounterIndex !== 1) return [];
    return mirror.anchorTargets
      .filter((target) => target.root.visible && !target.broken)
      .map((target, index) => ({ index: mirror.anchorTargets.indexOf(target), position: target.root.position.clone() }));
  }

  function beginTransit(from, to) {
    transit = {
      active: true,
      from: Math.max(0, Math.min(2, Math.round(from || 0))),
      to: Math.max(0, Math.min(2, Math.round(to || 0))),
      progress: 0,
      switched: false,
    };
    ship.root.visible = true;
    ship.root.position.set(0, 24, 12);
    ship.root.rotation.set(.22, Math.PI, 0);
    ship.root.scale.setScalar(.82);
    ship.boardingBeam.visible = false;
    ship.boardingMaterial.opacity = 0;
    applyVisibility();
  }

  function endTransit() {
    transit.active = false;
    transit.progress = 1;
    ship.root.visible = false;
    tunnel.root.visible = false;
    applyVisibility();
  }

  function updateTransit(progress, time = 0) {
    if (!transit.active) return;
    const beat = transitBeat(progress);
    transit.progress = beat.progress;
    const p = beat.progress;
    if (beat.swapped && !transit.switched) {
      transit.switched = true;
      encounterIndex = transit.to;
      phaseGoal = 1;
      phaseBlend = 0;
      if (encounterIndex === 0) meridian.setPhase?.(1, { immediate: true });
      if (encounterIndex === 1) setMirrorTargets(3, 0);
    }
    applyVisibility();

    if (beat.segment === 'pickup') {
      const local = smooth(p / TRANSIT_TIMELINE.tunnelStart);
      ship.root.position.set(
        Math.sin(local * Math.PI) * 3.2,
        THREE.MathUtils.lerp(25, 5.8, local),
        THREE.MathUtils.lerp(16, 2.8, local),
      );
      ship.root.rotation.set(.18 - local * .12, Math.PI + Math.sin(local * Math.PI) * .22, local * -.08);
      ship.root.scale.setScalar(.82 + local * .18);
      const boardingGlow = smooth((p - .10) / .10) * (1 - smooth((p - .27) / .05));
      ship.boardingBeam.visible = boardingGlow > .01;
      ship.boardingMaterial.opacity = boardingGlow * .38;
      transitCameraPosition.set(8.8 - local * 3.2, 5.4 + local * 1.5, 12.5 - local * 2.4);
      transitCameraTarget.copy(ship.root.position).lerp(new THREE.Vector3(0, 1.5, 0), .42);
    } else if (beat.segment === 'starDrive') {
      const local = (p - TRANSIT_TIMELINE.tunnelStart)
        / (TRANSIT_TIMELINE.arrivalStart - TRANSIT_TIMELINE.tunnelStart);
      ship.root.position.set(Math.sin(time * .9) * .2, Math.sin(time * .7) * .16, 0);
      ship.root.rotation.set(.02, Math.PI, Math.sin(time * .6) * .015);
      ship.root.scale.setScalar(1);
      ship.boardingBeam.visible = false;
      ship.boardingMaterial.opacity = 0;
      transitCameraPosition.set(6.8 - local * 1.4, 2.7 + Math.sin(local * Math.PI) * 1.2, 9.4);
      transitCameraTarget.set(0, .4, 0);
    } else {
      const local = smooth((p - TRANSIT_TIMELINE.arrivalStart) / (1 - TRANSIT_TIMELINE.arrivalStart));
      ship.root.position.set(
        Math.sin((1 - local) * Math.PI) * -2.8,
        THREE.MathUtils.lerp(22, 6.2, local),
        THREE.MathUtils.lerp(-15, 3.0, local),
      );
      ship.root.rotation.set(.08 + (1 - local) * -.22, Math.PI + Math.sin(local * Math.PI) * -.2, (1 - local) * .1);
      ship.root.scale.setScalar(.86 + local * .14);
      const boardingGlow = smooth((p - TRANSIT_TIMELINE.landingBeamStart) / .08);
      ship.boardingBeam.visible = boardingGlow > .01;
      ship.boardingMaterial.opacity = boardingGlow * .34;
      transitCameraPosition.set(-8.4 + local * 2.8, 6.2, 12.4 - local * 2.1);
      transitCameraTarget.copy(ship.root.position).lerp(new THREE.Vector3(0, 1.5, 0), .48);
    }
    ship.engines.forEach(({ flame }, index) => {
      const drive = p > TRANSIT_TIMELINE.driveBurnStart && p < TRANSIT_TIMELINE.driveBurnEnd ? 1.65 : .72;
      flame.scale.set(1 + Math.sin(time * 31 + index) * .08, drive * (1 + Math.sin(time * 24 + index) * .08), 1);
      flame.material.opacity = .72 + Math.sin(time * 37 + index) * .16;
    });
    ship.wingRoots.forEach((wing, index) => {
      const fold = p > TRANSIT_TIMELINE.actorsHidden && p < TRANSIT_TIMELINE.swap ? .58 : 0;
      wing.rotation.z = (index ? -1 : 1) * fold;
    });
  }

  function pulseAt(position, color = 0x8ffaff, strength = 1) {
    if (encounterIndex === 0) {
      meridian.pulse?.(position, color, strength);
      return;
    }
    const pool = pulsePools[encounterIndex];
    const entry = pool[pulseCursor++ % pool.length];
    entry.age = 0;
    entry.duration = .38 + strength * .16;
    entry.strength = strength;
    entry.ring.visible = true;
    entry.ring.position.copy(position).setY(.09);
    entry.ring.scale.setScalar(.15);
    entry.ring.material.color.setHex(color);
    entry.ring.material.opacity = .8;
  }

  function updatePulses(dt) {
    for (const pool of pulsePools) {
      for (const entry of pool) {
        if (!entry.ring.visible) continue;
        entry.age += dt;
        const p = clamp01(entry.age / Math.max(.01, entry.duration));
        entry.ring.scale.setScalar(THREE.MathUtils.lerp(.15, 2.5 + entry.strength * 2.4, smooth(p)));
        entry.ring.material.opacity = (1 - p) * .8;
        if (p >= 1) entry.ring.visible = false;
      }
    }
  }

  function updateMirror(time, dt, intensity) {
    phaseBlend += ((phaseGoal - 1) * .5 - phaseBlend) * (1 - Math.exp(-dt * 2.4));
    mirror.waterMaterial.uniforms.uTime.value = time;
    mirror.waterMaterial.uniforms.uPhase.value = phaseBlend;
    mirror.waterMaterial.uniforms.uOpacity.value = .38 + phaseBlend * .22 + intensity * .06;
    mirror.mirrorFloor.position.y = .035 + phaseBlend * .18;
    mirror.petals.rotation.y = time * .012 * (1 + phaseBlend * 2);
    mirror.anchorTargets.forEach((target, index) => {
      if (!target.root.visible) return;
      target.crystal.rotation.y = time * (target.broken ? .12 : .58) + index;
      target.halo.rotation.z = time * (index % 2 ? -.75 : .75);
      target.halo.scale.setScalar(1 + Math.sin(time * 3.4 + index) * .08);
      target.light.intensity = target.broken ? .8 : 9 + Math.sin(time * 4.1 + index) * 3 + intensity * 4;
    });
    mirror.moon.rotation.z = time * -.004;
    mirror.moonRings.forEach((ring, index) => {
      ring.rotation.z += dt * (index % 2 ? -.025 : .025) * (1 + phaseBlend * 2);
    });
    mirror.stars.rotation.y = time * .0015;
    mirror.under.intensity = 34 + phaseBlend * 22 + intensity * 12;
    mirror.roseLight.intensity = 12 + phaseBlend * 20 + intensity * 10;
    mirror.hemisphere.intensity = 1.65 + phaseBlend * .34;
    mirrorBackground.setHex(phaseGoal === 1 ? 0x031426 : phaseGoal === 2 ? 0x160a22 : 0x090719);
    mirrorFog.color.copy(mirrorBackground);
    mirrorFog.density = .0065 + phaseBlend * .0012;
  }

  function updateOrbit(time, dt, intensity) {
    phaseBlend += ((phaseGoal - 1) * .5 - phaseBlend) * (1 - Math.exp(-dt * 2.6));
    orbit.holeMaterial.uniforms.uTime.value = time;
    orbit.holeMaterial.uniforms.uPhase.value = phaseBlend;
    orbit.lens.rotation.z += dt * (1.4 + phaseBlend * 2.2);
    orbit.lens.scale.setScalar(1 + Math.sin(time * 2.2) * .03 + intensity * .035);
    orbit.pylons.forEach(({ root, cage, core }, index) => {
      root.position.y = Math.sin(time * .48 + index) * .12 * (1 + phaseBlend);
      cage.rotation.x += dt * (index % 2 ? -.8 : .8) * (1 + phaseBlend);
      cage.rotation.y += dt * .42;
      core.scale.setScalar(1 + Math.sin(time * 4.2 + index) * .14 + intensity * .08);
    });
    orbit.debris.forEach(({ object, angle, radius, baseY, speed, phase }, index) => {
      const a = angle + time * speed * (index % 2 ? -1 : 1);
      object.position.x = Math.sin(a) * radius;
      object.position.z = Math.cos(a) * radius;
      object.position.y = baseY + Math.sin(time * .25 + phase) * .18;
      object.rotation.x += dt * speed * 3;
      object.rotation.y += dt * speed * (index % 2 ? -2 : 2);
    });
    orbit.stars.rotation.y = time * -.0018;
    orbit.horizonHalo.rotation.z = time * -.006;
    orbit.violetUnder.intensity = 44 + phaseBlend * 30 + intensity * 18;
    orbit.amberRim.intensity = 22 + phaseBlend * 14 + intensity * 12;
    orbit.key.intensity = 4.1 + phaseBlend * .8;
    orbitBackground.setHex(phaseGoal === 1 ? 0x050411 : phaseGoal === 2 ? 0x120509 : 0x0b0218);
    orbitFog.color.copy(orbitBackground);
    orbitFog.density = .0048 + phaseBlend * .001;
  }

  function updateTunnel(time, dt) {
    if (!tunnel.root.visible) return;
    tunnel.state.forEach((entry, index) => {
      entry.z += entry.speed * dt;
      if (entry.z > 60) entry.z -= 160;
      tunnel.dummy.position.set(Math.sin(entry.angle) * entry.radius, Math.cos(entry.angle) * entry.radius, entry.z);
      tunnel.dummy.scale.set(1, 1, entry.length * (1 + Math.sin(time * 4 + index) * .08));
      tunnel.dummy.updateMatrix();
      tunnel.streaks.setMatrixAt(index, tunnel.dummy.matrix);
    });
    tunnel.streaks.instanceMatrix.needsUpdate = true;
    tunnel.streaks.rotation.z = Math.sin(time * .35) * .04;
    tunnel.streakMaterial.opacity = .82 + Math.sin(time * 8) * .1;
    tunnel.ringState.forEach((entry, index) => {
      entry.z += entry.speed * dt;
      if (entry.z > -4) entry.z -= 120;
      tunnel.dummy.position.set(0, 0, entry.z);
      tunnel.dummy.rotation.set(0, 0, entry.twist + time * (index % 2 ? -.12 : .1));
      tunnel.dummy.scale.setScalar(entry.radius * (1 + Math.sin(time * 2.1 + index) * .018));
      tunnel.dummy.updateMatrix();
      tunnel.rings.setMatrixAt(index, tunnel.dummy.matrix);
    });
    tunnel.rings.instanceMatrix.needsUpdate = true;
    tunnel.ringMaterial.opacity = .5 + Math.sin(time * 3.2) * .08;
    tunnel.aperture.rotation.z = time * -.045;
    tunnel.tunnelStars.rotation.z = time * .012;
    tunnel.tunnelStars.rotation.y = time * -.006;
  }

  function update(time = 0, dt = 0, intensity = 0) {
    const safeDt = Math.max(0, Math.min(.1, Number(dt) || 0));
    lastTime = Number(time) || lastTime;
    if (encounterIndex === 0 && !(transit.active && transit.progress > .31)) {
      meridian.update?.(time, safeDt, intensity);
    } else if (encounterIndex === 1 && mirror.root.visible) updateMirror(time, safeDt, intensity);
    else if (encounterIndex === 2 && orbit.root.visible) updateOrbit(time, safeDt, intensity);
    updateTunnel(time, safeDt);
    updatePulses(safeDt);
  }

  setEncounter(0, { immediate: true });

  return {
    meridian,
    mirror,
    orbit,
    ship,
    tunnel,
    get encounterIndex() { return encounterIndex; },
    get arenaRadius() { return encounterByIndex(encounterIndex).arenaRadius; },
    get finalPlayerRadius() { return encounterIndex === 0 ? (meridian.finalPlayerRadius || 12) : encounterByIndex(encounterIndex).arenaRadius; },
    get finalBossOrbitRadius() { return encounterIndex === 0 ? (meridian.finalBossOrbitRadius || 18.5) : encounterByIndex(encounterIndex).flightRadius || 0; },
    get finalBossFlightHeight() { return encounterIndex === 0 ? (meridian.finalBossFlightHeight || 5.2) : encounterByIndex(encounterIndex).flightHeight || 0; },
    get phaseTarget() { return encounterIndex === 0 ? meridian.phaseTarget : phaseGoal; },
    get phaseProgress() { return encounterIndex === 0 ? meridian.phaseProgress : phaseBlend; },
    get ruptureBlend() { return encounterIndex === 0 ? meridian.ruptureBlend : 0; },
    get transit() { return { ...transit }; },
    get transitCameraPosition() { return transitCameraPosition; },
    get transitCameraTarget() { return transitCameraTarget; },
    get arenaGroup() { return encounterIndex === 0 ? meridian.arenaGroup : encounterIndex === 1 ? mirror.root : orbit.root; },
    get skyGroup() { return encounterIndex === 0 ? meridian.skyGroup : encounterIndex === 1 ? mirror.sky : orbit.sky; },
    get cameraOccludedBoundarySegments() { return encounterIndex === 0 ? meridian.cameraOccludedBoundarySegments : 0; },
    get cameraNearOccludedBoundarySegments() { return encounterIndex === 0 ? meridian.cameraNearOccludedBoundarySegments : 0; },
    get cameraCompositionBoundarySegments() { return encounterIndex === 0 ? meridian.cameraCompositionBoundarySegments : 0; },
    get cameraScreenCompositionBoundarySegments() { return encounterIndex === 0 ? meridian.cameraScreenCompositionBoundarySegments : 0; },
    get cameraVisibleCompositionBoundarySegments() { return encounterIndex === 0 ? meridian.cameraVisibleCompositionBoundarySegments : 0; },
    get cameraVisibleScreenCompositionBoundarySegments() { return encounterIndex === 0 ? meridian.cameraVisibleScreenCompositionBoundarySegments : 0; },
    get cameraOccludedHourGates() { return encounterIndex === 0 ? meridian.cameraOccludedHourGates : 0; },
    get cameraSightlineHourGates() { return encounterIndex === 0 ? meridian.cameraSightlineHourGates : 0; },
    get cameraVisibleSightlineHourGates() { return encounterIndex === 0 ? meridian.cameraVisibleSightlineHourGates : 0; },
    get cameraCompositionFocusCount() { return encounterIndex === 0 ? meridian.cameraCompositionFocusCount : 0; },
    setEncounter,
    setPhase,
    setMechanicState,
    mechanicTargets,
    beginTransit,
    updateTransit,
    endTransit,
    pulse: pulseAt,
    update,
    setCameraOcclusion(camera, playerPosition, bossPosition) {
      if (encounterIndex === 0 && !(transit.active && transit.progress > .31)) {
        meridian.setCameraOcclusion?.(camera, playerPosition, bossPosition);
      } else if (encounterIndex === 1 && camera) {
        // Living mirrors are mechanic targets, not camera wipes. The one behind
        // Nera's opening position teaches the gaze interaction, so it briefly
        // contracts when the shoulder camera passes through its monumental
        // silhouette while retaining its exact world-space target position.
        mirror.anchorTargets.forEach((target) => {
          if (!target.root.visible) return;
          const distance = Math.hypot(
            camera.position.x - target.root.position.x,
            camera.position.z - target.root.position.z,
          );
          // The anchors stay monumental in the arena, but never become a
          // shoulder-camera wall. Horizontal distance is deliberate: their
          // five-metre needle should not escape contraction merely because
          // the camera is vertically offset from the mechanic point.
          const scale = distance < 7.8
            ? THREE.MathUtils.lerp(.14, .76, clamp01((distance - 2.8) / 5))
            : .76;
          target.root.scale.setScalar(scale);
        });
      }
    },
    dispose() {
      meridian.dispose?.();
      disposeTree(mirror.root);
      disposeTree(orbit.root);
      disposeTree(ship.root);
      disposeTree(tunnel.root);
      if (scene.background === mirrorBackground || scene.background === orbitBackground || scene.background === tunnelBackground) scene.background = baseBackground;
      if (scene.fog === mirrorFog || scene.fog === orbitFog) scene.fog = baseFog;
    },
  };
}
