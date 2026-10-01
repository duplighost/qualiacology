import * as THREE from 'three';

// Maintenance equipment, built as rigid assemblies. Every coloured bolt, grille,
// panel and hydraulic fitting is baked into one vertex-colour draw per assembly.
// Instances share geometry; only their warning lenses own a material.
const PALETTE = { shell: 0x66777b, edge: 0xadb9b4, dark: 0x172126, rubber: 0x202527, copper: 0xa76838, stripe: 0xd8a452, white: 0xd9ddd2 };
const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.57, metalness: 0.72 });
const templates = new Map();
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const vector = new THREE.Vector3();
const scale = new THREE.Vector3(1, 1, 1);
const colours = new Map();
const C = (n) => { if (!colours.has(n)) colours.set(n, new THREE.Color(n)); return colours.get(n); };

class Assembly {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; }
  add(geometry, xyz, colour = PALETTE.shell, rotation = [0, 0, 0], sizing = [1, 1, 1]) {
    quaternion.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(vector.set(...xyz), quaternion, scale.set(...sizing));
    const raw = geometry.index ? geometry.toNonIndexed() : geometry;
    raw.applyMatrix4(matrix);
    const p = raw.attributes.position, n = raw.attributes.normal, col = C(colour);
    for (let i = 0; i < p.count; i++) {
      this.p.push(p.getX(i), p.getY(i), p.getZ(i));
      this.n.push(n.getX(i), n.getY(i), n.getZ(i));
      this.c.push(col.r, col.g, col.b);
      // Metre-scale planar UVs preserve the size of machining marks across
      // plates and fittings. Parts stay one batched draw with real PBR maps.
      const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
      if (ny > nx && ny > nz) this.uv.push(p.getX(i) * .65, p.getZ(i) * .65);
      else if (nx > nz) this.uv.push(p.getZ(i) * .65, p.getY(i) * .65);
      else this.uv.push(p.getX(i) * .65, p.getY(i) * .65);
    }
    raw.dispose(); if (raw !== geometry) geometry.dispose();
    return this;
  }
  box(x, y, z, w, h, d, color = PALETTE.shell, rotation) {
    let geometry;
    const radius = Math.min(.027, w * .055, h * .055, d * .055);
    if (Math.min(w, h, d) > .15) {
      const shape = new THREE.Shape(), x0 = -w / 2 + radius, x1 = w / 2 - radius, y0 = -h / 2 + radius, y1 = h / 2 - radius;
      shape.moveTo(x0, y0); shape.lineTo(x1, y0); shape.lineTo(x1, y1); shape.lineTo(x0, y1); shape.closePath();
      geometry = new THREE.ExtrudeGeometry(shape, { depth: d - radius * 2, bevelEnabled: true, bevelThickness: radius, bevelSize: radius, bevelSegments: 1, steps: 1 });
      geometry.translate(0, 0, -d / 2 + radius);
    } else geometry = new THREE.BoxGeometry(w, h, d);
    return this.add(geometry, [x, y, z], color, rotation);
  }
  cylinder(x, y, z, top, bottom, h, color = PALETTE.edge, rotation = [0, 0, 0], segments = 12) {
    return this.add(new THREE.CylinderGeometry(top, bottom, h, segments, 1), [x, y, z], color, rotation);
  }
  sphere(x, y, z, radius, color = PALETTE.edge, sizing = [1, 1, 1]) { return this.add(new THREE.SphereGeometry(radius, 10, 7), [x, y, z], color, [0, 0, 0], sizing); }
  ring(x, y, z, radius, tube, color = PALETTE.edge, rotation = [0, 0, 0]) {
    return this.add(new THREE.TorusGeometry(radius, tube, 6, 18), [x, y, z], color, rotation);
  }
  hose(points, radius = .045, color = PALETTE.dark) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return this.add(new THREE.TubeGeometry(curve, 12, radius, 6, false), [0, 0, 0], color);
  }
  rivets(x, y, z, count, spacing, axis = 'x') {
    for (let i = 0; i < count; i++) this.sphere(x + (axis === 'x' ? i * spacing : 0), y + (axis === 'y' ? i * spacing : 0), z, .027, PALETTE.edge);
    return this;
  }
  mesh(name = '') {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, metal); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
}

export function configureMachineMaterials(materials) {
  if (!materials?.get) return;
  const reference = materials.get('steel', { roughness: .81, metalness: .76, repeat: 2 });
  metal.map = reference.map || null; metal.normalMap = reference.normalMap || null;
  metal.roughnessMap = reference.roughnessMap || null; metal.metalnessMap = reference.metalnessMap || null;
  metal.normalScale.set(.38, .38); metal.roughness = .81; metal.metalness = .76;
  metal.envMapIntensity = 1.15; metal.needsUpdate = true;
}

function warningLens(group, x, y, z, r = .12, name = 'core', wide = 1) {
  const housing = new Assembly();
  housing.add(new THREE.CylinderGeometry(r * 1.26, r * 1.3, r * .40, 20), [x, y, z - r * .28], PALETTE.dark, [Math.PI / 2, 0, 0], [wide, 1, .85]);
  housing.add(new THREE.TorusGeometry(r * 1.10, r * .11, 8, 24), [x, y, z], PALETTE.edge, [0, 0, 0], [wide, .85, 1]);
  for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + Math.PI / 4; housing.sphere(x + Math.cos(t) * r * 1.22 * wide, y + Math.sin(t) * r * 1.08, z + .012, Math.max(.013, r * .052), PALETTE.copper); }
  group.add(housing.mesh('optic-housing'));
  const m = new THREE.MeshStandardMaterial({ color: 0x992d21, emissive: 0xff2918, emissiveIntensity: .75, roughness: .16, metalness: .35 });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
  lens.name = name; lens.position.set(x, y, z); lens.scale.set(wide, .85, .21); group.add(lens);
  return lens;
}

function chassis(group, width, length, y, color, wheeled = true) {
  const a = new Assembly();
  a.box(0, y, 0, width, .28, length, PALETTE.dark);
  a.box(0, y + .19, -.08, width * .85, .22, length * .82, color);
  a.box(0, y + .32, -.15, width * .68, .075, length * .62, PALETTE.edge);
  for (const side of [-1, 1]) {
    a.box(side * width * .49, y + .1, 0, .08, .34, length * .93, PALETTE.edge);
    a.box(side * width * .32, y + .26, length * .37, width * .18, .085, .12, PALETTE.stripe);
    if (wheeled) {
      a.box(side * width * .55, y - .13, -.02, .28, .28, length * .94, PALETTE.rubber);
      for (let i = 0; i < 4; i++) {
        const z = (i / 3 - .5) * length * .73;
        a.cylinder(side * width * .57, y - .13, z, .17, .17, .33, PALETTE.dark, [0, 0, Math.PI / 2]);
        a.cylinder(side * width * .75, y - .13, z, .085, .085, .016, PALETTE.edge, [0, 0, Math.PI / 2], 8);
      }
    }
  }
  a.rivets(-width * .3, y + .3, length * .32, 4, width * .2);
  group.add(a.mesh('chassis'));
}

function leg(group, side, front, y = .56, spread = .7, length = .65, index = 0) {
  const pivot = new THREE.Group(); pivot.name = `leg-${index}`;
  pivot.position.set(side * .4, y, front); group.add(pivot);
  const a = new Assembly();
  a.sphere(0, 0, 0, .13, PALETTE.copper);
  a.box(side * spread * .42, -.06, 0, spread, .13, .18, PALETTE.shell, [0, 0, side * -.2]);
  a.cylinder(side * spread * .84, -.23, 0, .10, .065, length, PALETTE.dark, [0, 0, side * .35]);
  a.cylinder(side * spread * .62, -.16, .10, .036, .036, length * .65, PALETTE.edge, [0, 0, side * -.35], 6);
  a.box(side * spread, -.47, .035, .26, .075, .34, PALETTE.rubber);
  pivot.add(a.mesh());
  return pivot;
}

function turret(group, height = 1.05, barrel = .65, double = false) {
  const pivot = new THREE.Group(); pivot.name = 'turret'; pivot.position.y = height; group.add(pivot);
  const a = new Assembly();
  a.cylinder(0, -.12, 0, .29, .34, .22, PALETTE.dark);
  a.box(0, .07, 0, .55, .40, .55, PALETTE.shell);
  for (const x of double ? [-.17, .17] : [0]) {
    a.cylinder(x, .09, barrel * .43 + .22, .075, .09, barrel, PALETTE.dark, [Math.PI / 2, 0, 0], 10);
    a.cylinder(x, .09, barrel + .12, .11, .1, .16, PALETTE.edge, [Math.PI / 2, 0, 0]);
  }
  for (let i = 0; i < 4; i++) a.box(-.23 + i * .15, .30, -.07, .05, .04, .38, PALETTE.dark);
  a.box(.35, .11, -.14, .16, .28, .4, PALETTE.copper);
  pivot.add(a.mesh());
  return pivot;
}

function createOrdinary(type) {
  const group = new THREE.Group(); group.name = type;
  const a = new Assembly();
  if (type === 'skitter') {
    a.box(0, .56, 0, .7, .3, .8, PALETTE.shell);
    a.box(0, .76, -.09, .52, .095, .51, PALETTE.copper);
    a.box(0, .46, .49, .82, .15, .13, PALETTE.stripe);
    a.cylinder(0, .52, .39, .21, .17, .25, PALETTE.dark, [Math.PI / 2, 0, 0]);
    a.rivets(-.25, .73, .3, 3, .25);
    group.add(a.mesh('body'));
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) leg(group, s, (i - 1) * .3, .52, .43, .4, (s + 1) * 1.5 + i);
    warningLens(group, 0, .62, .43, .12, 'core', 1.45);
  } else if (type === 'rifle') {
    chassis(group, .8, 1.1, .4, PALETTE.shell);
    a.cylinder(0, .77, -.08, .18, .25, .55, PALETTE.edge);
    a.box(0, .78, -.25, .43, .4, .28, PALETTE.copper);
    group.add(a.mesh('body')); const t = turret(group, 1.2, .64);
    warningLens(t, -.18, .1, .295, .105);
  } else if (type === 'shield') {
    chassis(group, 1.25, 1.45, .42, 0x586b68);
    a.box(0, 1.05, -.15, .96, 1.05, .85, 0x586b68);
    a.box(0, 1.58, -.18, 1.04, .1, .93, PALETTE.edge);
    a.cylinder(0, 1.21, -.67, .3, .3, .12, PALETTE.copper, [Math.PI / 2, 0, 0]);
    group.add(a.mesh('body'));
    const shield = new THREE.Group(); shield.name = 'shield'; shield.position.set(0, 1, .67); group.add(shield);
    const b = new Assembly(); b.box(0, 0, 0, 1.62, 1.45, .16, PALETTE.dark);
    b.box(0, .02, .08, 1.48, 1.28, .10, 0x829290);
    for (const s of [-1, 1]) b.box(s * .48, .02, .15, .12, 1.23, .06, PALETTE.stripe, [0, 0, s * .18]);
    b.box(0, .34, .16, .58, .07, .06, PALETTE.dark);
    b.rivets(-.63, .57, .17, 5, .315); b.rivets(-.63, -.56, .17, 5, .315);
    shield.add(b.mesh()); warningLens(group, 0, 1.64, .1, .16);
    warningLens(group, 0, 1.19, -.76, .23, 'rear-core');
  } else if (type === 'mortar') {
    chassis(group, 1.15, 1.25, .4, 0x86775e);
    a.cylinder(0, .87, -.02, .43, .5, .50, PALETTE.shell);
    a.ring(0, 1.11, -.02, .41, .07, PALETTE.copper, [Math.PI / 2, 0, 0]);
    a.box(-.44, .98, -.35, .22, .7, .37, PALETTE.stripe);
    group.add(a.mesh('body'));
    const barrel = new THREE.Group(); barrel.name = 'turret'; barrel.position.set(0, 1.07, 0); group.add(barrel);
    const b = new Assembly(); b.cylinder(0, .40, .13, .22, .27, .89, PALETTE.dark, [.35, 0, 0]);
    b.ring(0, .82, .28, .21, .08, PALETTE.edge, [Math.PI / 2 + .35, 0, 0]);
    b.cylinder(.31, .14, -.07, .06, .06, .63, PALETTE.edge, [.35, 0, 0], 8);
    barrel.add(b.mesh()); warningLens(group, .36, .96, .45, .14);
  } else if (type === 'hunter') {
    a.box(0, .77, 0, .71, .48, 1.16, PALETTE.dark);
    a.box(0, 1.03, -.18, .58, .13, .77, 0x62756e);
    for (let i = 0; i < 5; i++) a.box(0, 1.07, -.45 + i * .18, .64, .055, .06, PALETTE.edge);
    a.box(0, .75, .66, .47, .28, .36, PALETTE.shell);
    a.box(0, .62, .83, .60, .095, .13, PALETTE.copper);
    group.add(a.mesh('body'));
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) leg(group, s, -.43 + i * .81, .74, .55, .75, (s + 1) + i);
    warningLens(group, 0, .83, .855, .14, 'core', 1.55);
  } else if (type === 'furnace') {
    chassis(group, 1.3, 1.58, .41, PALETTE.copper);
    a.cylinder(0, 1.22, -.15, .49, .55, 1.26, 0x695948);
    for (let i = 0; i < 3; i++) a.ring(0, .76 + i * .38, -.15, .53, .045, PALETTE.edge, [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
      a.cylinder(s * .55, 1.59, -.39, .11, .13, .75, PALETTE.dark);
      a.cylinder(s * .55, 1.99, -.39, .16, .14, .12, PALETTE.edge);
      a.box(s * .58, 1.17, .19, .22, .58, .64, PALETTE.stripe);
    }
    a.cylinder(0, 1.11, .51, .22, .25, .47, PALETTE.dark, [Math.PI / 2, 0, 0]);
    a.ring(0, 1.11, .76, .22, .065, PALETTE.copper);
    group.add(a.mesh('body')); warningLens(group, 0, 1.45, .375, .2);
  } else if (type === 'sniper') {
    a.cylinder(0, 1.1, 0, .095, .20, 1.65, PALETTE.dark);
    a.cylinder(0, 1.34, 0, .14, .14, .54, PALETTE.edge);
    a.box(.20, 1.10, -.05, .17, .65, .27, PALETTE.copper);
    a.cylinder(0, 1.9, 0, .25, .19, .16, PALETTE.shell);
    group.add(a.mesh('body'));
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Group(); p.rotation.y = i * Math.PI * 2 / 3; group.add(p);
      const b = new Assembly(); b.box(0, .35, .43, .11, .1, 1.15, PALETTE.shell, [-.47, 0, 0]);
      b.box(0, .06, .94, .25, .1, .35, PALETTE.rubber); p.add(b.mesh());
    }
    const t = turret(group, 2.05, 1.05); warningLens(t, .19, .17, .35, .125);
  } else if (type === 'tether') {
    chassis(group, 1.05, 1.25, .4, 0x58777a);
    a.box(0, .94, -.05, .55, .70, .71, PALETTE.shell);
    a.cylinder(0, 1.11, .07, .37, .37, .75, PALETTE.dark, [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) {
      a.cylinder(s * .45, 1.11, .07, .43, .43, .07, PALETTE.copper, [0, 0, Math.PI / 2]);
      a.ring(s * .5, 1.11, .07, .26, .07, PALETTE.edge, [0, Math.PI / 2, 0]);
    }
    a.cylinder(0, 1.50, .02, .11, .15, .62, PALETTE.edge);
    group.add(a.mesh('body')); warningLens(group, 0, 1.61, .13, .15);
  } else {
    chassis(group, .92, 1.1, .38, 0x52777c, false);
    a.cylinder(0, .8, 0, .24, .35, .67, PALETTE.dark);
    a.ring(0, 1.18, 0, .52, .095, PALETTE.edge, [Math.PI / 2, 0, 0]);
    group.add(a.mesh('body'));
    const rotor = new THREE.Group(); rotor.name = 'rotor'; rotor.position.y = 1.25; group.add(rotor);
    const b = new Assembly();
    for (let i = 0; i < 3; i++) {
      const t = i * Math.PI * 2 / 3;
      b.box(Math.sin(t) * .43, 0, Math.cos(t) * .43, .43, .70, .12, 0x9bada9, [0, t, .12]);
      b.box(Math.sin(t) * .43, .39, Math.cos(t) * .43, .49, .055, .16, PALETTE.copper, [0, t, .12]);
    }
    rotor.add(b.mesh()); warningLens(group, 0, 1.33, .29, .23);
  }
  return group;
}

const BOSS_COLORS = { counterweight: 0x778680, switchman: 0x9a784c, glasskeeper: 0x7c9990, crucible: 0x866448, floodgate: 0x5c838b, warden: 0x66717c, heart: 0x8c8372 };

function claw(parent, side, length, index) {
  const pivot = new THREE.Group(); pivot.position.set(side * 1.25, 2.5, .1); pivot.name = `arm-${index}`; parent.add(pivot);
  const a = new Assembly();
  a.cylinder(side * .5, -.16, 0, .21, .25, 1.30, PALETTE.dark, [0, 0, side * -.90]);
  a.cylinder(side * .53, -.09, .22, .095, .095, 1.02, PALETTE.edge, [0, 0, side * -.90]);
  a.sphere(side * .98, -.48, 0, .25, PALETTE.copper);
  a.box(side * 1.04, -.65, length * .4, .39, .38, length, PALETTE.shell, [.08, 0, 0]);
  a.box(side * 1.04, -.79, length * .95, .58, .19, .65, PALETTE.stripe);
  a.box(side * 1.04, -.53, length * 1.07, .22, .22, .25, PALETTE.dark);
  pivot.add(a.mesh());
}

function createBoss(type) {
  const group = new THREE.Group(); group.name = type;
  const a = new Assembly(), color = BOSS_COLORS[type];
  if (type === 'counterweight') {
    a.box(0, 3.35, 0, 4.6, .6, 1.65, color);
    a.box(0, 3.75, -.08, 4.85, .17, 1.81, PALETTE.edge);
    a.box(0, 3.12, .58, 3.6, .11, .18, PALETTE.stripe);
    a.cylinder(0, 2.67, -.45, .46, .46, 1.9, PALETTE.dark, [0, 0, Math.PI / 2]);
    a.rivets(-2.10, 3.50, .845, 12, .38);
    for (const sx of [-1, 1]) {
      a.cylinder(sx * 1.25, 3.96, -.24, .29, .29, .75, PALETTE.dark, [0, 0, Math.PI / 2]);
      a.cylinder(sx * 1.25, 3.96, -.24, .32, .32, .07, PALETTE.copper, [0, 0, Math.PI / 2]);
      a.hose([[sx * .8, 3.36, .38], [sx * .93, 2.94, .39], [sx * 1.28, 2.61, .43], [sx * 1.61, 2.53, .35]], .06);
    }
    for (const s of [-1, 1]) {
      a.box(s * 1.83, 1.72, -.19, .52, 2.72, .63, color);
      a.cylinder(s * 1.83, 1.67, .21, .10, .1, 2.50, PALETTE.edge);
      a.box(s * 1.83, .28, .15, 1.14, .5, 1.72, PALETTE.dark);
      a.box(s * 1.83, .55, .55, .99, .11, .63, PALETTE.stripe);
      a.cylinder(s * 1.62, 1.68, -.15, .06, .06, 2.26, PALETTE.dark, [0, 0, s * .21]);
      a.rivets(s * 1.83, .87, .15, 5, .39, 'y');
    }
    const weight = new THREE.Group(); weight.name = 'weight'; weight.position.set(0, 1.30, .35); group.add(weight);
    const b = new Assembly(); b.box(0, 0, 0, 1.42, 1.45, 1.04, PALETTE.dark);
    for (let i = 0; i < 4; i++) b.box(0, -.52 + i * .34, 0, 1.58, .10, 1.15, PALETTE.edge);
    for (const s of [-1, 1]) b.cylinder(s * .41, 1.27, 0, .055, .055, 1.45, PALETTE.copper);
    weight.add(b.mesh()); warningLens(group, 0, 2.85, .85, .34, 'core', 1.65);
  } else if (type === 'switchman') {
    chassis(group, 2.6, 3.75, .56, color);
    a.box(0, 1.57, -.38, 1.75, 1.60, 2.20, color);
    a.box(0, 2.39, -.41, 1.96, .14, 2.4, PALETTE.edge);
    a.rivets(-.7, 2.12, .735, 6, .28);
    for (let i = 0; i < 7; i++) a.box(-.63 + i * .21, 2.49, -.52, .085, .095, 1.42, PALETTE.dark);
    for (const s of [-1, 1]) {
      a.cylinder(s * .70, 1.5, .90, .29, .29, .30, PALETTE.dark, [Math.PI / 2, 0, 0]);
      a.box(s * 1.08, .83, 1.48, .18, .8, .40, PALETTE.stripe, [0, 0, s * .28]);
      a.hose([[s * .67, 2.15, -.9], [s * 1.02, 1.97, -.85], [s * 1.14, 1.41, -.15], [s * .89, 1.08, .47]], .055);
    }
    a.box(0, .73, 1.62, 2.80, .58, .20, PALETTE.dark);
    for (let i = 0; i < 7; i++) a.box(-1.16 + i * .38, .75, 1.75, .16, .6, .09, PALETTE.stripe, [0, 0, -.3]);
    a.cylinder(.69, 2.91, -.8, .035, .035, 1.05, PALETTE.edge, [0, 0, -.12], 6);
    warningLens(group, 0, 1.86, .91, .37, 'core', 1.4);
  } else if (type === 'glasskeeper') {
    a.cylinder(0, 1.85, 0, .63, 1.08, 2.8, PALETTE.dark);
    a.cylinder(0, 1.72, 0, .81, .82, 1.08, color);
    a.ring(0, 2.52, 0, 1.07, .13, PALETTE.copper, [Math.PI / 2, 0, 0]);
    a.ring(0, .61, 0, 1.05, .16, PALETTE.edge, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4;
      a.cylinder(Math.sin(t) * .66, 2.04, Math.cos(t) * .66, .038, .038, 2.65, PALETTE.copper);
      a.box(Math.sin(t) * .92, .39, Math.cos(t) * .92, .19, .2, .42, PALETTE.dark, [0, t, 0]);
    }
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Group(); p.name = `panel-${i}`; p.rotation.y = i * Math.PI / 2; group.add(p);
      const b = new Assembly(); b.box(0, 2.12, 1.17, 1.15, 2.26, .15, color);
      b.box(0, 2.12, 1.26, .89, 1.94, .08, 0x9fc1b5);
      b.box(0, 2.12, 1.31, .045, 1.89, .025, PALETTE.edge);
      for (const s of [-1, 1]) b.box(s * .49, 2.12, 1.30, .055, 2.26, .09, PALETTE.copper);
      for (let row = 0; row < 4; row++) b.box(0, 1.28 + row * .55, 1.32, .87, .022, .025, PALETTE.edge);
      p.add(b.mesh());
    }
    warningLens(group, 0, 2.17, .71, .46);
  } else if (type === 'crucible') {
    chassis(group, 2.5, 2.95, .58, color);
    a.cylinder(0, 1.99, -.22, .85, 1.0, 2.67, color);
    for (let i = 0; i < 4; i++) a.ring(0, .85 + i * .64, -.22, 1.01, .075, PALETTE.dark, [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
      a.cylinder(s * .72, 3.28, -.42, .19, .19, 1.19, PALETTE.dark); claw(group, s, 1.1, s === -1 ? 0 : 1);
      a.hose([[s * .63, 2.75, -.4], [s * 1.01, 2.86, -.49], [s * 1.48, 2.59, -.22], [s * 1.65, 2.11, .12]], .075);
      a.rivets(s * .63, 1.10, .69, 5, .38, 'y');
    }
    a.ring(0, 1.75, .76, .53, .15, PALETTE.copper);
    for (let i = 0; i < 7; i++) a.box(-.57 + i * .19, 2.83, .54, .075, .30, .11, PALETTE.dark);
    warningLens(group, 0, 1.75, .83, .44);
  } else if (type === 'floodgate') {
    chassis(group, 2.5, 2.4, .58, color);
    a.box(0, 1.3, -.15, 2.2, 1.4, 1.45, color);
    a.rivets(-.95, .94, .6, 8, .27);
    for (const s of [-1, 1]) a.hose([[s * .53, 1.76, -.45], [s * 1.08, 2.09, -.4], [s * 1.49, 1.79, .0], [s * 1.38, 1.5, .53]], .13, PALETTE.edge);
    const rotor = new THREE.Group(); rotor.name = 'rotor'; rotor.position.set(0, 2.2, 0); group.add(rotor);
    const b = new Assembly(); b.ring(0, 0, 0, 1.68, .16, PALETTE.edge); b.ring(0, 0, 0, 1.13, .14, PALETTE.dark);
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; b.box(Math.sin(t) * .72, Math.cos(t) * .72, 0, .15, 1.2, .20, PALETTE.copper, [0, 0, -t]); }
    rotor.add(b.mesh());
    for (const s of [-1, 1]) a.cylinder(s * 1.38, 1.5, .53, .28, .28, 1.2, PALETTE.dark, [Math.PI / 2, 0, 0]);
    warningLens(group, 0, 2.2, .23, .48);
  } else if (type === 'warden') {
    chassis(group, 2.6, 2.7, .59, color);
    a.cylinder(0, 2.08, -.12, .68, 1.05, 2.77, PALETTE.dark);
    a.box(0, 2.07, 0, 1.46, 2.18, 1.24, color);
    a.box(0, 3.25, 0, 1.76, .24, 1.51, PALETTE.edge);
    a.rivets(-.59, 1.23, .64, 5, .295); a.rivets(-.59, 2.89, .64, 5, .295);
    for (let i = 0; i < 5; i++) a.box(0, 1.40 + i * .18, .65, .91, .055, .08, PALETTE.dark);
    for (const s of [-1, 1]) {
      a.box(s * 1.08, 2.29, -.04, .32, 1.88, .78, PALETTE.stripe);
      const t = turret(group, 2.82, 1.24, true); t.position.x = s * 1.31; t.name = `turret-${s}`;
      a.cylinder(s * .39, 3.9, -.28, .04, .055, 1.24, PALETTE.edge, [0, 0, s * .10], 6);
      a.hose([[s * .40, 2.96, -.5], [s * .84, 3.10, -.53], [s * 1.19, 3.02, -.31], [s * 1.29, 2.80, -.20]], .085);
    }
    warningLens(group, 0, 2.77, .69, .3, 'core', 1.75);
  } else {
    a.cylinder(0, .43, 0, 1.48, 1.84, .85, PALETTE.dark);
    a.cylinder(0, 2.03, 0, .58, .82, 3.53, PALETTE.edge);
    for (const y of [1.12, 3.14]) a.ring(0, y, 0, 1.35, .17, PALETTE.copper, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 10; i++) {
      const t = i * Math.PI / 5;
      a.cylinder(Math.sin(t) * .74, 2.14, Math.cos(t) * .74, .055, .055, 2.35, PALETTE.dark);
      a.hose([[Math.sin(t) * 1.1, .65, Math.cos(t) * 1.1], [Math.sin(t) * 1.25, .9, Math.cos(t) * 1.25], [Math.sin(t) * .80, 1.38, Math.cos(t) * .80]], .06, PALETTE.copper);
    }
    for (let i = 0; i < 3; i++) {
      const rotor = new THREE.Group(); rotor.name = `halo-${i}`; rotor.position.y = 2.55; rotor.rotation.set(i * .75, i * 1.1, i * .55); group.add(rotor);
      const b = new Assembly(); b.ring(0, 0, 0, 1.72 + i * .30, .10, color);
      for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; b.box(Math.sin(t) * (1.72 + i * .3), Math.cos(t) * (1.72 + i * .3), 0, .23, .34, .26, k % 2 ? PALETTE.edge : PALETTE.copper, [0, 0, -t]); }
      rotor.add(b.mesh());
    }
    for (const s of [-1, 1]) a.box(s * 1.77, .28, 0, .48, .46, 3.8, PALETTE.dark);
    warningLens(group, 0, 2.54, .62, .65);
  }
  group.add(a.mesh('body'));
  return group;
}

export function createMachine(type, isBoss = false) {
  const key = `${isBoss ? 'boss:' : ''}${type}`;
  if (!templates.has(key)) templates.set(key, isBoss ? createBoss(type) : createOrdinary(type));
  const group = templates.get(key).clone(true);
  const parts = { legs: [], arms: [], turrets: [], panels: [], halos: [], cores: [], rotor: null, weight: null, shield: null };
  group.traverse((o) => {
    if (o.name.startsWith('leg-')) { parts.legs.push(o); o.userData.baseY = o.position.y; }
    if (o.name.startsWith('arm-')) parts.arms.push(o);
    if (o.name.startsWith('turret')) { parts.turrets.push(o); o.userData.baseZ = o.position.z; }
    if (o.name.startsWith('panel-')) { parts.panels.push(o); o.userData.baseRotation = o.rotation.y; }
    if (o.name.startsWith('halo-')) parts.halos.push(o);
    if (o.name === 'rotor') parts.rotor = o;
    if (o.name === 'weight') { parts.weight = o; o.userData.baseY = o.position.y; }
    if (o.name === 'shield') parts.shield = o;
    if (o.name === 'core' || o.name === 'rear-core') { o.material = o.material.clone(); parts.cores.push(o); }
  });
  group.userData.parts = parts;
  return group;
}

export function animateMachine(enemy, time, dt) {
  const parts = enemy.mesh.userData.parts;
  const pace = enemy.speedVisual || 0, tell = enemy.state === 'windup' ? 1 : 0, hurt = Math.max(0, enemy.flash || 0);
  for (let i = 0; i < parts.legs.length; i++) {
    const leg = parts.legs[i], stride = Math.sin(time * (7 + pace * 2) + i * 2.4);
    leg.rotation.y = stride * Math.min(.32, pace * .085);
    leg.position.y = leg.userData.baseY + Math.max(0, stride) * Math.min(.16, pace * .055);
  }
  for (let i = 0; i < parts.arms.length; i++) {
    const arm = parts.arms[i]; arm.rotation.x += ((tell ? -.6 : enemy.impactAnimation > 0 ? .7 : enemy.state === 'attack' ? .34 : Math.sin(time * 1.3 + i) * .08) - arm.rotation.x) * Math.min(1, dt * 11);
  }
  for (const turret of parts.turrets) turret.position.z = turret.userData.baseZ - (enemy.recoil || 0) * .58;
  if (parts.rotor) parts.rotor.rotation[enemy.boss ? 'z' : 'y'] += dt * (enemy.exposed > 0 ? .3 : tell ? 5.8 : enemy.state === 'attack' ? 3.7 : 1.1);
  if (parts.weight) parts.weight.position.y += ((parts.weight.userData.baseY + (enemy.impactAnimation > 0 ? -.67 : tell ? 1.15 : 0)) - parts.weight.position.y) * Math.min(1, dt * (enemy.impactAnimation > 0 ? 20 : 8));
  for (const panel of parts.panels) {
    const open = enemy.exposed > 0 || enemy.stun > 0;
    const goal = panel.userData.baseRotation + (open ? .7 : Math.sin(time * .6) * .08);
    panel.rotation.y += (goal - panel.rotation.y) * Math.min(1, dt * 6);
  }
  parts.halos.forEach((h, i) => { const phaseRate = 1 + ((enemy.phase || 1) - 1) * .45; h.rotation.y += dt * (.18 + i * .10) * phaseRate; h.rotation.z -= dt * (.14 + i * .055) * phaseRate * (enemy.state === 'attack' ? 2 : 1); });
  if (parts.shield) {
    const down = enemy.shieldDown > 0;
    parts.shield.rotation.x += ((down ? -1.2 : 0) - parts.shield.rotation.x) * Math.min(1, dt * 8);
  }
  for (const core of parts.cores) {
    const exposed = enemy.exposed > 0 || enemy.stun > 0 || enemy.shieldDown > 0;
    core.material.color.setHex(hurt > 0 ? 0xe0fff8 : exposed ? 0xffd36b : 0xff4b35);
    core.material.emissive.setHex(hurt > 0 ? 0x5ffff0 : exposed ? 0xff9f24 : 0xd81d0e);
    core.material.emissiveIntensity = hurt > 0 ? 1.8 : exposed ? 1.05 : .60 + tell * (.45 + Math.sin(time * 26) * .30);
  }
}

export function releaseMachine(group) {
  group.userData.parts?.cores.forEach((c) => c.material.dispose());
  group.removeFromParent();
}

export function disposeMachineLibrary() {
  const geos = new Set(), mats = new Set();
  templates.forEach((g) => g.traverse((o) => { if (o.isMesh) { geos.add(o.geometry); if (o.material !== metal) mats.add(o.material); } }));
  geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); templates.clear();
}
