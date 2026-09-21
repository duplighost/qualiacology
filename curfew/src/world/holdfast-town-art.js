import * as THREE from 'three';
import { groundY, glowColumn, bulb, PANE_LAMP, ON_APRON } from './sites.js';

export const P = Object.freeze({
  stone: [0.105, 0.113, 0.128], darkStone: [0.055, 0.060, 0.073], edge: [0.141, 0.152, 0.173],
  snow: [0.25, 0.28, 0.32], ice: [0.12, 0.18, 0.22], slate: [0.042, 0.049, 0.065],
  wood: [0.067, 0.048, 0.036], cutWood: [0.12, 0.089, 0.056], iron: [0.046, 0.050, 0.058],
  purple: [0.063, 0.038, 0.105], violet: [0.088, 0.050, 0.129], moon: [0.33, 0.33, 0.38],
  paper: [0.23, 0.21, 0.16], red: [0.15, 0.036, 0.025], cloth: [0.09, 0.105, 0.113],
});
const shade = (c, k) => c.map(v => v * k);
export function solid(k, api, w, h, d, x, y, z, c = P.stone, yaw = 0, tag = 'wall', standable = true) {
  k.solid.box(w, h, d, x, y, z, c, yaw);
  api.emit({ kind: 'obb', x, z, halfX: w / 2, halfZ: d / 2, yaw,
    y0: y - h / 2, y1: y + h / 2, tag, standable });
}
export function cylinder(k, api, r, h, x, y, z, c, tag = 'stone') {
  k.solid.cyl(r * 0.91, r, h, 12, x, y, z, c);
  api.emit({ kind: 'circle', x, z, r, y0: y - h / 2, y1: y + h / 2, tag, standable: true });
}
const indexed = geometry => {
  if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
  return geometry;
};

// Small real bevels keep a stone edge visible in grazing light. This joins an existing
// solid batch; unlike a wall primitive it deliberately emits no new collider.
export function chamferedBlock(kit, w, h, d, x, y, z, colour, yaw = 0, bevel = 0.045) {
  const b = Math.min(bevel, w * 0.18, h * 0.18, d * 0.18);
  const shape = new THREE.Shape();
  const hw = w / 2 - b, hh = h / 2 - b;
  shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh); shape.closePath();
  const geometry = indexed(new THREE.ExtrudeGeometry(shape, {
    depth: d - b * 2, steps: 1, bevelEnabled: true, bevelSegments: 1,
    bevelSize: b, bevelThickness: b, curveSegments: 1,
  }));
  geometry.translate(0, 0, -(d - b * 2) / 2);
  kit.at(geometry, colour, x, y, z, yaw);
}

// The emblem is real crescent-shaped relief, not a bright circle painted on a square.
export function crescent(k, x, y, z, radius, yaw, col = P.moon, depth = 0.025) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 32; i++) {
    const a = (55 + i / 32 * 250) * Math.PI / 180;
    const p = [Math.cos(a) * radius, Math.sin(a) * radius];
    if (i === 0) shape.moveTo(...p); else shape.lineTo(...p);
  }
  const tx = Math.cos(55 * Math.PI / 180) * radius, ty = Math.sin(55 * Math.PI / 180) * radius;
  for (let i = 0; i <= 32; i++) {
    const a = (-90 - i / 32 * 180) * Math.PI / 180;
    shape.lineTo(tx + Math.cos(a) * radius * 0.78, Math.sin(a) * ty);
  }
  shape.closePath();
  k.at(indexed(new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false, curveSegments: 1 })), col, x, y, z, yaw);
}

export function banner(k, x, y, z, w, h, yaw, phases = false) {
  const geo = new THREE.PlaneGeometry(w, h, 5, 12), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const u = a.getX(i), v = a.getY(i), loose = (h / 2 - v) / h;
    a.setZ(i, Math.sin(u * 3.2 + v * 1.5) * 0.08 * loose + loose * 0.16);
    if (v < -h * 0.4) a.setY(i, v + (Math.abs(u) / w) * 0.4 + (i % 3) * 0.045);
  }
  geo.computeVertexNormals(); k.cloth.at(geo, P.purple, x, y, z, yaw);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  k.solid.box(w + 0.35, 0.08, 0.09, x, y + h / 2 + 0.05, z, P.iron, yaw);
  const mark = (dy, r) => crescent(k.cloth, x + sy * 0.20, y + dy, z + cy * 0.20, r, yaw);
  mark(phases ? h * 0.21 : h * 0.15, w * 0.28);
  if (phases) {
    mark(-h * 0.16, w * 0.20);
    k.cloth.cyl(w * 0.18, w * 0.18, 0.024, 20, x + sy * 0.22, y - h * 0.36, z + cy * 0.22, P.moon, yaw, Math.PI / 2);
  }
  for (const s of [-1, 1]) {
    const dx = s * (w / 2 - 0.05);
    k.cloth.box(0.035, h - 0.35, 0.035, x + dx * cy + sy * 0.08, y + 0.1, z - dx * sy + cy * 0.08, shade(P.moon, 0.45), yaw);
  }
}

/* --------------------------------------------------------------------------- *
 * SNOW ON A LEDGE.
 *
 * winterline/src/snow.js, the line the whole file is built on: "A box of snow reads as a
 * box... The one place a slab is right is snow lying on a ledge, and that stays a slab."
 * Every cap in this town is exactly that case — a roof, a sill, a parapet, a string course
 * — so the slab stays. What it never had was the two things that make a slab read as snow
 * and not as a painted plane, and Alex named the result on 2026-09-18: "those piles are
 * like, terrible."
 *
 *   IT HAD NO THICKNESS. It was a PlaneGeometry whose mound fell to zero at the rim, so
 *   the edge you actually look at from the street — the one against the dark slate — was
 *   a zero-height line. Snow settles 15 cm deep and you can SEE the 15 cm. The cap now
 *   keeps 30% of its depth out at the rim and closes with a vertical skirt down to the
 *   surface it sits on, shaded like the underside it is.
 *
 *   ITS EDGE WAS A RULED LINE. Four straight sides, to the millimetre, on eight hundred
 *   caps. The rim now wanders, more at the corners than the middles, so no two caps in a
 *   row end on the same line.
 *
 * The tone follows snow-field.js rather than a flat multiply: the crest is EXACTLY the
 * county's snow albedo and never brighter (the night-value law is not bent here — this is
 * masonry-scale snow under lantern light), and the form is in the dark half, which drops to
 * 0.70 and turns BLUE the way a snow shadow does.
 * --------------------------------------------------------------------------- */
export function snowCap(k, x, y, z, w, d, yaw=0, depth=.16, seed=1, profile=null) {
  const nx=Math.max(3,Math.ceil(w/.36)),nz=Math.max(3,Math.ceil(d/.28)),gx=nx+1,gz=nz+1;
  const RIM=.30;                       // the fraction of the depth the rim keeps: the slab's edge
  // `uv` is not decoration: every other part in this kit is a Plane/Box/Cylinder and
  // mergeGeometries drops the WHOLE channel if one member's attribute set differs.
  const pos=[],cs=[],uv=[],idx=[];
  // Two grains at different scales and angles, both well under the grid's Nyquist so the
  // surface never moires: one about a metre across, one about seventy centimetres.
  const coarse=(a,b)=>.5+.5*Math.sin(a*5.2+b*3.7+seed)*Math.sin(a*1.91-b*5.3+seed*2);
  const fine=(a,b)=>.5+.5*Math.sin(a*7.4+b*5.9+seed*3.1)*Math.sin(a*5.1-b*8.3+seed*1.3);
  const tint=(shade,k2)=>{
    const t=Math.max(.62,Math.min(1,shade))*k2,s=1-t;
    cs.push(.330*(t-s*.18),.345*t,.385*(t+s*.34));
  };
  const top=[];                        // one entry per grid vertex: px, pz, y, base, shade
  for(let j=0;j<gz;j++)for(let i=0;i<gx;i++){
    const u=i/nx*2-1,v=j/nz*2-1,edge=Math.max(Math.abs(u),Math.abs(v));
    const wob=1+.055*Math.sin((u*5.1+v*7.3)*1.9+seed)*edge*edge;
    const px=u*w/2*wob,pz=v*d/2*wob,g=coarse(px,pz),f=fine(px,pz);
    const dome=Math.pow(Math.max(0,1-edge*edge),.7);
    const mound=depth*(RIM+(1-RIM)*dome)*(.74+g*.26)+(f-.5)*depth*.26;
    const base=profile?profile(px,pz):0;
    top.push({px,pz,y:base+.045+mound,base,shade:.70+g*.20+f*.10+dome*.06,u:i/nx,v:j/nz});
  }
  for(const t of top){pos.push(t.px,t.y,t.pz);uv.push(t.u,t.v);tint(t.shade,1);}
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const a=j*gx+i,b=a+1,c=a+gx,e=c+1;idx.push(a,c,b,b,c,e);
  }
  // THE SKIRT. Walk the rim once — front, right, back, left — and drop a wall from it to
  // whatever it is lying on. Wound outward; the underside of settled snow sees no sky.
  const ring=[];
  for(let i=0;i<gx;i++)ring.push(i);
  for(let j=1;j<gz;j++)ring.push(j*gx+nx);
  for(let i=nx-1;i>=0;i--)ring.push(nz*gx+i);
  for(let j=gz-2;j>=1;j--)ring.push(j*gx);
  const skirt0=top.length;
  for(const r of ring){const t=top[r];pos.push(t.px,t.base,t.pz);uv.push(t.u,t.v);tint(t.shade,.60);}
  for(let s=0;s<ring.length;s++){
    const s2=(s+1)%ring.length;
    idx.push(ring[s],ring[s2],skirt0+s, ring[s2],skirt0+s2,skirt0+s);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);
  geo.computeVertexNormals();k.cloth.at(geo,P.snow,x,y,z,yaw);
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));
}

/* --------------------------------------------------------------------------- *
 * A DRIFT ALONG THE KERB — the one piece of snow in this game you walk INTO.
 *
 * ALEX, 2026-09-18: "some things like the kind of piles of snow people stand right through."
 * These are them. Every path in the foretown had a snowCap laid down each verge — a flat
 * domed sheet, 20 cm at its highest, with NO COLLIDER, so you stood in the middle of it
 * with your boots at the bottom of a snow bank. That is the working-but-wrong failure the
 * slag heaps in sites.js already have a note about: drawing and colliding are separate here
 * and a pile that only draws is a pile that is not there.
 *
 * SHAPE, from winterline/src/snow.js's snowBank: a run of overlapping FLATTENED DOMES of
 * varied height and width, thrown off-centre toward the thing that stopped them (here the
 * kerb, the way a plough's ridge sits off-centre), with a crest dome every few segments and
 * a thin refrozen crust slab on some of them. Four tints in rotation so two neighbouring
 * lobes never merge into one blob. Each dome is sunk so its rim is under the ground: a drift
 * has no visible base.
 *
 * COLLIDER, and why THIS one and not the caps on the roofs: winterline's own rule is "a
 * drift you have to walk round is a wall", and it gives its banks nothing. But its banks are
 * beside a road you drive down. This is a footpath in a walled town, the drift tops out at
 * 0.32 m — well inside the player's STEP_UP of 0.52 — so ONE standable obb per segment makes
 * it something you walk UP and over, never something that stops you. The obb's top is the
 * drift's own highest point, measured, never a guess: a collider taller than its snow is the
 * same bug the other way round. `tag: 'snow'` is not in NON_PHYSICAL_TAGS (note 'verge' is,
 * which is why this is not called one), and at 7 m long the shape is far outside both the
 * crush and the break-open size gates, so no car and no buttstroke can delete it.
 * --------------------------------------------------------------------------- */
// Rounded snow lit from the side reads a stop brighter than the same snow on a flat ledge
// (winterline/src/snow.js), so the drifted tints sit BELOW snowCap's crest, not at it.
const DRIFT_TINTS = [0.74, 0.83, 0.89, 0.95].map(t =>
  [0.330 * (t - (1 - t) * 0.18), 0.345 * t, 0.385 * (t + (1 - t) * 0.34)]);
const driftRng = seed => k2 => {
  let n = Math.imul(seed + k2 * 911, 2246822519) ^ Math.imul(k2 - 104729, 3266489917);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
};
export function snowDrift(k, api, x, g, z, width, length, yaw, seed) {
  const at = driftRng(Math.round(seed * 37 + x * 3 + z * 7));
  // Along the run is (sin yaw, cos yaw); across it is (cos yaw, -sin yaw). Same frame
  // bakePaths lays the kerb in, so the drift cannot end up on the wrong side of it.
  const ay = Math.sin(yaw), az = Math.cos(yaw), bx = Math.cos(yaw), bz = -Math.sin(yaw);
  const place = (u, v) => [x + ay * u + bx * v, z + az * u + bz * v];
  const n = Math.max(2, Math.round(length / 2.5));
  let top = 0;
  const dome = (u, v, w2, h2, d2, tone, spin) => {
    // 9 x 3 on a half-sphere is 45 triangles. A lobe of snow has no silhouette detail worth
    // more than that, and there are several hundred of these: the whole run has to come in
    // under the flat sheet it replaces.
    const geo = new THREE.SphereGeometry(1, 9, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geo.scale(w2 * 0.5, h2, d2 * 0.5);
    const [px, pz] = place(u, v);
    // Sunk by a tenth of its height: the rim of a dome is a circle and a drift has no rim.
    k.cloth.at(geo, DRIFT_TINTS[tone & 3], px, g - h2 * 0.10, pz, yaw + spin);
    if (h2 * 0.90 > top) top = h2 * 0.90;
  };
  for (let i = 0; i < n; i++) {
    const u = -length / 2 + (i + 0.5) * (length / n);
    // 0.15 .. 0.35 m, so the obb below tops out at 0.315 — under the player's STEP_UP of
    // 0.52 AND under the 0.34 m band car.js:2363 ignores as a kerb, so a drift beside the
    // foretown path is something both of them ride over rather than something that stops them.
    const h2 = 0.265 * (0.58 + at(i) * 0.74);
    const w2 = width * (0.70 + at(i + 40) * 0.62);
    const run = length / n * (1.10 + at(i + 80) * 0.55);
    // Thrown against the kerb: the mass sits inboard and the tail feathers out.
    dome(u, (width - w2) * 0.22, w2, h2, run, i + (at(i + 120) > 0.5 ? 1 : 0), (at(i + 160) - 0.5) * 0.5);
    if (at(i + 200) > 0.46) {                              // the crest the wind left on it
      dome(u + run * 0.16, -width * 0.10, w2 * 0.60, h2 * 0.66, run * 0.62, i + 2, (at(i + 240) - 0.5) * 0.9);
    }
    if (at(i + 280) > 0.58) {                              // slid, then froze again: a crust
      const [cx, cz] = place(u - run * 0.12, width * 0.30);
      k.cloth.box(w2 * 0.46, 0.05, run * 0.54, cx, g + h2 * 0.30, cz, DRIFT_TINTS[3], yaw + (at(i + 320) - 0.5) * 0.6);
    }
  }
  api.emit({ kind: 'obb', x, z, halfX: width * 0.46, halfZ: length * 0.5, yaw,
    y0: g - 0.30, y1: g + top, tag: 'snow', standable: true });
}

export function stucco(k, w,h,d,x,y,z,col,yaw=0,seed=1) {
  const geo=new THREE.BoxGeometry(w,h,d,Math.max(1,Math.ceil(w/.25)),Math.max(1,Math.ceil(h/.25)),Math.max(1,Math.ceil(d/.25)));
  const p=geo.attributes.position,normal=geo.attributes.normal,cs=[];
  for(let i=0;i<p.count;i++){
    const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),v=(py+h/2)/h;
    const q=.5+.5*Math.sin(px*3.7+pz*4.1+seed)*Math.sin(py*7.3+px*1.7+seed*2.1);
    const fine=.5+.5*Math.sin(px*24.3+py*17.1+pz*19.1+seed);
    const streak=(.5+.5*Math.sin(px*7.8+pz*8.9+seed))*Math.max(0,1-v*1.5);
    const wear=.69+q*.23+fine*.08-streak*.14;
    cs.push(col[0]*wear,col[1]*wear*(1-streak*.06),col[2]*wear*(1-streak*.14));
    // A few millimetres of broken render catch grazing light, not silhouette noise.
    const relief=(fine-.5)*.011;p.setXYZ(i,px+normal.getX(i)*relief,py+normal.getY(i)*relief,pz+normal.getZ(i)*relief);
  }
  geo.computeVertexNormals();k.cloth.at(geo,col,x,y,z,yaw);geo.setAttribute('color',new THREE.Float32BufferAttribute(cs,3));
}

// An occupied room seen through old glass. The frame, reveal, curtains and sill objects
// all join the town's existing batches; nothing here changes a wall or its collision.
// Position is the glass plane, with local +Z facing out of the building.
export function inhabitedWindow(k, x, y, z, w, h, yaw, seed, reveal = 0.13) {
  const random = driftRng(Math.round(seed * 47 + x * 11 + z * 17));
  const kind = Math.floor(random(1) * 5), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const glow = k.live || k.glow;
  const point = (px, py, pz) => [x + px * cy + pz * sy, y + py, z - px * sy + pz * cy];
  const box = (kit, ww, hh, dd, px, py, pz, colour) => kit.box(ww, hh, dd, ...point(px, py, pz), colour, yaw);
  const timber = random(2) > 0.5 ? [0.065, 0.052, 0.042] : [0.047, 0.057, 0.062];
  const frame = [timber[0] * 1.6, timber[1] * 1.6, timber[2] * 1.6];
  box(k.cloth, w + 0.025, h + 0.025, 0.028, 0, 0, -0.017, [0.012, 0.017, 0.024]);

  // A room lights the whole rectangular opening, with a narrow dirty border. The old
  // broad vignette made every opening look like the same circular orange lamp.
  const brightness = 0.62 + random(3) * 0.35;
  const lampSide = random(4) > 0.5 ? 1 : -1;
  const pane = glow.pane(w, h, ...point(0, 0, 0.002), (u, v) => {
    const edge = Math.min(1, Math.max(0, (1 - Math.max(Math.abs(u), Math.abs(v))) / 0.07));
    const room = 0.17 + 0.12 * (v * 0.5 + 0.5) + 0.045 * lampSide * u;
    const uneven = 0.91 + 0.09 * Math.sin(u * 4.3 + seed) * Math.sin(v * 3.1 + seed * 0.7);
    return edge * room * brightness * uneven;
  }, yaw, 0, 4, 6);
  // Put the outer interior vertices near the frame. A uniform coarse grid would
  // stretch the edge fade across a quarter of the opening and turn it round again.
  const vertices = pane.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    let u = ((vertices.getX(i) - x) * cy - (vertices.getZ(i) - z) * sy) / (w / 2);
    let v = (vertices.getY(i) - y) / (h / 2);
    if (Math.abs(u) < 0.999) u *= 1.84;
    if (Math.abs(v) < 0.999) v *= 1.395;
    vertices.setXYZ(i, ...point(u * w / 2, v * h / 2, 0.002));
  }
  // Existing live/glow batches are ember-coloured. Compensate in the vertices so these
  // windows read as lamplit cream, while the nearby fires keep their authored orange.
  const tones = [[0.76, 2.35, 7.5], [0.70, 2.62, 9.8], [0.88, 2.17, 6.1]];
  const tone = tones[Math.floor(random(5) * tones.length)];
  const colours = pane.attributes.color;
  for (let i = 0; i < colours.count; i++) {
    const gain = colours.getX(i);
    colours.setXYZ(i, gain * tone[0], gain * tone[1], gain * tone[2]);
  }

  // Deep side cheeks stay dark; the thin outer bead catches grazing lantern light.
  for (const side of [-1, 1]) {
    box(k.cloth, 0.075, h + 0.12, reveal + 0.05, side * (w / 2 + 0.035), 0, reveal / 2, timber);
    box(k.cloth, 0.095, h + 0.22, 0.055, side * (w / 2 + 0.055), 0, reveal + 0.022, frame);
    box(k.cloth, w + 0.20, 0.09, 0.07, 0, side * (h / 2 + 0.05), reveal + 0.025, frame);
  }
  const sash = reveal + 0.009;
  box(k.cloth, 0.043, h + 0.04, 0.065, 0, 0, sash, timber);
  const cross = h > 2.3 ? [h * -0.23, h * 0.21] : [h * (random(6) * 0.12 - 0.06)];
  for (const yy of cross) box(k.cloth, w, 0.041, 0.064, 0, yy, sash, timber);
  // The small brass sash catch is an occasional glint, below the crossbar.
  box(k.cloth, 0.076, 0.025, 0.027, 0, cross[0] - 0.042, sash + 0.044, [0.19, 0.139, 0.067]);

  const curtain = (side, width) => {
    const geometry = new THREE.PlaneGeometry(width, h * 0.98, 3, 5);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = p.getY(i) / h + 0.5, u = p.getX(i) / width + 0.5;
      const pull = 0.50 + 0.50 * Math.pow(Math.abs(v - 0.43) * 1.7, 1.2);
      p.setX(i, side * (w / 2 - width * u * pull));
      p.setZ(i, 0.021 + Math.sin(u * Math.PI * 7) * 0.008);
    }
    if (side > 0) {
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const b = indices.getX(i + 1);
        indices.setX(i + 1, indices.getX(i + 2)); indices.setX(i + 2, b);
      }
    }
    geometry.computeVertexNormals();
    k.cloth.at(geometry, kind === 2 ? [0.090, 0.071, 0.054] : [0.058, 0.066, 0.070], x, y, z, yaw);
  };
  if (kind === 1 || kind === 2) {
    curtain(-1, w * (0.27 + random(7) * 0.15));
    if (kind === 2) curtain(1, w * 0.31);
  } else if (kind === 3) {
    const blindH = h * (0.19 + random(8) * 0.21);
    box(k.cloth, w * 0.99, blindH, 0.023, 0, h / 2 - blindH / 2, 0.023, [0.103, 0.094, 0.078]);
    box(k.cloth, 0.009, blindH + h * 0.18, 0.012, w * 0.40, h / 2 - blindH * 0.55, 0.043, P.paper);
  }

  // Quiet interior silhouettes make adjacent rooms different without adding fake people.
  const baseY = -h / 2 + 0.06, objectX = w * (random(9) * 0.44 - 0.22);
  if (kind === 0 || kind === 4) {
    for (let book = 0; book < 3; book++) {
      const bh = Math.min(h * 0.23, 0.17 + random(12 + book) * 0.16);
      box(k.cloth, 0.052 + book * 0.006, bh, 0.034, objectX + book * 0.067, baseY + bh / 2, 0.026,
        book === 1 ? P.purple : P.wood);
    }
  } else if (kind === 1) {
    k.cloth.cyl(0.065, 0.052, 0.12, 6, ...point(objectX, baseY + 0.06, 0.035), P.cutWood);
    box(k.cloth, 0.012, 0.24, 0.012, objectX, baseY + 0.23, 0.032, [0.035, 0.049, 0.039]);
    for (const side of [-1, 1]) box(k.cloth, 0.095, 0.035, 0.013,
      objectX + side * 0.046, baseY + 0.24 + side * 0.025, 0.034, [0.036, 0.057, 0.043]);
  }
}

export function icicles(k, x, y, z, length, yaw, rng) {
  const cy=Math.cos(yaw),sy=Math.sin(yaw),n=Math.ceil(length*2.2);
  for(let i=0;i<n;i++){
    const off=(i+.5)/n*length-length/2,h=rng.range(.13,.79),radius=rng.range(.025,.074);
    k.cloth.cone(radius,h,6,x+cy*off,y-h/2,z-sy*off,[.19,.26,.30],0,Math.PI);
    if(i%4===0)k.cloth.cone(radius*.45,h*.65,5,x+cy*(off+.085),y-h*.325,z-sy*(off+.085),[.25,.30,.34],0,Math.PI);
  }
  snowCap(k,x,y+.015,z,length,.38,yaw,.13,length);
}

export function lantern(k, x, y, z, yaw = 0, large = false) {
  const r = large ? 0.25 : 0.15;
  k.solid.box(r * 2.3, r * 0.35, r * 2.3, x, y - r, z, P.iron, yaw);
  k.solid.cone(r * 1.8, r, 4, x, y + r * 1.6, z, P.iron, yaw + Math.PI / 4);
  for (const dx of [-r, r]) for (const dz of [-r, r]) k.solid.box(0.035, r * 2.6, 0.035, x + dx, y + r * 0.2, z + dz, P.iron);
  k.live.cyl(r * 0.72, r * 0.72, r * 1.8, 8, x, y + r * 0.1, z, [0.30, 0.24, 0.17]);
  k.live.pane(r * 3.0, r * 3.6, x, y, z + r, PANE_LAMP, yaw, 0, 4, 4);
  // D18: the flame's core, over the bloom threshold, inside the glass: a lantern is a small
  // hard bright thing in a soft warm one, and the soft part alone was the smudge.
  bulb(k.live, x, y + r * 0.1, z, r * 0.26);
}

export function brazier(k, api, x, z, tall = false) {
  const g = groundY(api, x, z) + ON_APRON, h = tall ? 1.35 : 0.65;
  cylinder(k, api, 0.58, 0.26, x, g + 0.13, z, P.darkStone);
  k.solid.cyl(0.24, 0.37, h, 8, x, g + h / 2 + 0.20, z, P.iron);
  k.solid.cyl(0.56, 0.32, 0.42, 10, x, g + h + 0.28, z, P.iron);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    k.solid.box(0.05, 0.50, 0.05, x + Math.cos(a) * 0.43, g + h + 0.40, z + Math.sin(a) * 0.43, P.iron, a);
  }
  glowColumn(k.live, x, g + h + 0.27, z, 0.34, 0.87, 0.25);
  k.live.pane(0.75, 0.75, x, g + h + 0.37, z, PANE_LAMP, 0, -Math.PI / 2, 5, 5);
  api.emit({ kind: 'circle', x, z, r: 0.54, y0: g + 0.2, y1: g + h + 0.64, tag: 'metal', standable: true });
}

export function statue(k, api, x, z, yaw = 0, size = 1) {
  const g = groundY(api, x, z) + ON_APRON;
  cylinder(k, api, 1.12 * size, 0.45 * size, x, g + 0.225 * size, z, P.darkStone);
  cylinder(k, api, 0.90 * size, 0.22 * size, x, g + 0.55 * size, z, P.edge);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const pos = (px, py, pz) => [x + (px * cy + pz * sy) * size, g + py * size, z + (-px * sy + pz * cy) * size];
  k.solid.cyl(0.38 * size, 0.69 * size, 2.4 * size, 12, ...pos(0, 1.86, 0), P.stone, yaw);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    k.solid.cyl(0.028 * size, 0.13 * size, 2.1 * size, 5, ...pos(Math.cos(a) * 0.39, 1.76, Math.sin(a) * 0.39), shade(P.edge, i % 2 ? 0.85 : 0.65), yaw);
  }
  k.solid.cyl(0.51 * size, 0.42 * size, 0.85 * size, 10, ...pos(0, 3.18, 0), P.stone, yaw);
  k.solid.cone(0.54 * size, 0.76 * size, 10, ...pos(0, 3.72, -0.03), P.stone, yaw);
  k.solid.cyl(0.24 * size, 0.19 * size, 0.46 * size, 9, ...pos(0, 3.19, 0.36), P.darkStone, yaw);
  for (const side of [-1, 1]) {
    k.solid.cyl(0.24 * size, 0.31 * size, 1.15 * size, 8, ...pos(side * 0.48, 2.68, 0.08), P.stone, yaw, 0, side * 0.40);
    k.solid.cyl(0.13 * size, 0.17 * size, 0.6 * size, 8, ...pos(side * 0.26, 2.28, 0.46), P.edge, yaw, Math.PI / 2, side * 0.45);
  }
  crescent(k.solid, ...pos(0, 3.91, -0.04), 0.99 * size, yaw, P.edge, 0.13 * size);
  api.emit({ kind: 'circle', x, z, r: 0.70 * size, y0: g + 0.59 * size, y1: g + 4.0 * size, tag: 'stone', standable: false });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, [cx, yy, cz] = pos(Math.cos(a) * 0.95, 0.57, Math.sin(a) * 0.95);
    k.solid.cyl(0.047, 0.051, 0.17 + i % 3 * 0.05, 6, cx, yy + 0.10, cz, P.paper);
    k.live.cyl(0.019, 0.027, 0.053, 5, cx, yy + 0.24, cz, [0.35, 0.26, 0.12]);
  }
}

// A real arched opening with radial wedge stones and open sky between its legs.
export function arch(k, api, x, z, width, spring, rise, depth, y, yaw = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), radius = width / 2;
  for (const side of [-1, 1]) {
    const lx = side * (radius + 0.38);
    solid(k, api, 0.76, spring, depth, x + lx * cy, y + spring / 2, z - lx * sy, P.stone, yaw);
    k.solid.box(1.00, 0.28, depth + 0.24, x + lx * cy, y + spring - 0.06, z - lx * sy, P.edge, yaw);
  }
  // Filled spandrels carry the curve into the level street above. Without this
  // masonry the arch is a bent beam with open triangular holes above it.
  const fill = new THREE.Shape(), span = radius + 0.73, top = rise + 0.60;
  fill.moveTo(-span, 0); fill.lineTo(-radius, 0);
  for (let i = 1; i <= 24; i++) {
    const a = i / 24 * Math.PI; fill.lineTo(-Math.cos(a) * radius, Math.sin(a) * rise);
  }
  fill.lineTo(span, 0); fill.lineTo(span, top); fill.lineTo(-span, top); fill.closePath();
  const fillGeo = indexed(new THREE.ExtrudeGeometry(fill, { depth: depth - 0.08, steps: 1, bevelEnabled: false }));
  fillGeo.translate(0, 0, -(depth - 0.08) / 2);
  k.solid.at(fillGeo, P.stone, x, y + spring, z, yaw);
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI, b = (i + 1) / 18 * Math.PI, s = new THREE.Shape();
    s.moveTo(Math.cos(a) * radius, Math.sin(a) * rise);
    s.lineTo(Math.cos(b) * radius, Math.sin(b) * rise);
    s.lineTo(Math.cos(b) * (radius + 0.73), Math.sin(b) * (rise + 0.60));
    s.lineTo(Math.cos(a) * (radius + 0.73), Math.sin(a) * (rise + 0.60)); s.closePath();
    const geo = indexed(new THREE.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: false }));
    geo.translate(0, 0, -depth / 2);
    k.solid.at(geo, i % 4 === 0 ? P.darkStone : P.edge, x, y + spring, z, yaw);
  }
  const bands = 16, bw = span * 2 / bands;
  for (let i = 0; i < bands; i++) {
    const px = -span + (i + 0.5) * bw, near = Math.max(0, Math.abs(px) - bw / 2);
    const bottom = near < radius ? rise * Math.sqrt(1 - (near / radius) ** 2) : 0;
    api.emit({ kind: 'obb', x: x + px * cy, z: z - px * sy, halfX: bw / 2, halfZ: depth / 2, yaw,
      y0: y + spring + bottom, y1: y + spring + top, tag: 'wall', standable: true });
  }
}

export function path(k, api, points, width) {
  (k.pathRuns ||= []).push(...points.slice(1).map((b,i)=>({a:points[i],b,width})));
}

export function bakePaths(k, api) {
  const runs=k.pathRuns||[],distance=(x,z,r)=>{
    const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],len=dx*dx+dz*dz;
    const t=Math.max(0,Math.min(1,((x-r.a[0])*dx+(z-r.a[1])*dz)/len));
    return Math.hypot(x-r.a[0]-t*dx,z-r.a[1]-t*dz)-r.width/2;
  };
  const positions=[],indices=[],uvs=[],colors=[];
  // A union of the path footprints has one surface at each point, including every
  // junction. It removes the coplanar crossing sheets visible in the previous town.
  const step=.8;
  for(let z=-62.4;z<169.6;z+=step)for(let x=-62.4;x<63.2;x+=step){
    if(x+step>41.5&&x<48.5&&z+step>-47.5&&z<-36)continue;
    if(!runs.some(r=>distance(x+step/2,z+step/2,r)<=0))continue;
    const n=positions.length/3,shade=.94+((Math.round(x*5)*13+Math.round(z*5)*7)%9+9)%9*.018;
    for(const[px,pz]of[[x,z],[x,z+step],[x+step,z+step],[x+step,z]]){
      positions.push(px,groundY(api,px,pz)+ON_APRON+.032,pz);uvs.push(px*.8,pz*.8);colors.push(.079*shade,.083*shade,.089*shade);
    }
    indices.push(n,n+1,n+2,n,n+2,n+3);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  k.solid.push(geo,P.stone);geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  // FEET ON THE PAVING. The sheet above is drawn 6.9 cm over the terrain and had no collider,
  // so the player (terrain.heightAt) walked with his boots inside it. One thin standable obb
  // per run puts the floor where the stone is. Runs are cut into <= 12 m pieces, each at its
  // own midpoint's ground, so a slight fall across a piece is a centimetre, not a step; every
  // town run lies inside the level core of the pads anyway. Tag 'floor' is STRUCTURE (never
  // crushed) and 7 cm tops are under the car's 0.34 m kerb rule, so the road through the
  // foretown drives over them; `authored` because collision refuses long boxes otherwise.
  for(const r of runs){
    const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),n=Math.max(1,Math.ceil(length/12));
    for(let i=0;i<n;i++){
      const t0=i/n,t1=(i+1)/n,tm=(t0+t1)/2,x=r.a[0]+dx*tm,z=r.a[1]+dz*tm,top=groundY(api,x,z)+ON_APRON+.032;
      api.emit({kind:'obb',x,z,halfX:r.width/2,halfZ:length*(t1-t0)/2+.02,yaw,y0:top-.30,y1:top,tag:'floor',standable:true,authored:true});
    }
  }
  for(const r of runs){
    const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),n=Math.ceil(length/7);
    for(let i=0;i<n;i++)for(const side of[-1,1]){
      const t=(i+.5)/n,x=r.a[0]+dx*t+Math.cos(yaw)*(r.width/2+.43)*side,z=r.a[1]+dz*t-Math.sin(yaw)*(r.width/2+.43)*side;
      if(runs.some(other=>other!==r&&distance(x,z,other)<.55))continue;
      if(x>40&&x<50&&z>-49&&z<-34)continue;
      snowDrift(k,api,x,groundY(api,x,z)+ON_APRON,z,1.24,length/n+.3,yaw,i*11+side*7);
    }
  }
  // Kerbs stop before another path joins them; they never run through junctions.
  for(const r of runs){
    const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),n=Math.ceil(length/2.2);
    for(let i=0;i<n;i++)for(const side of[-1,1]){
      const t=(i+.5)/n,x=r.a[0]+dx*t+Math.cos(yaw)*r.width/2*side,z=r.a[1]+dz*t-Math.sin(yaw)*r.width/2*side;
      if(runs.some(other=>other!==r&&distance(x,z,other)<.65))continue;
      if(x>40.9&&x<49.1&&z>-48.1&&z<-35.4)continue;
      k.solid.box(.23,.10,length/n-.08,x,groundY(api,x,z)+ON_APRON+.084,z,P.edge,yaw);
    }
  }
}

export function lowWall(k, api, x, z, length, yaw) {
  const n = Math.ceil(length / 3), cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * length / n - length / 2, px = x + t * cy, pz = z - t * sy, g = groundY(api, px, pz);
    solid(k, api, length / n + 0.02, 0.97, 0.68, px, g + 0.47, pz, P.darkStone, yaw);
    k.solid.box(length / n + 0.09, 0.16, 0.84, px, g + 1.03, pz, P.edge, yaw);
    k.solid.box(length / n - 0.08, 0.06, 0.68, px, g + 1.14, pz, P.snow, yaw);
  }
}

export function chair(k, api, x, y, z, yaw = 0) {
  solid(k, api, 0.58, 0.12, 0.57, x, y + 0.48, z, P.wood, yaw, 'wood');
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  k.solid.box(0.59, 0.62, 0.09, x + sy * 0.24, y + 0.85, z + cy * 0.24, P.wood, yaw);
  api.emit({ kind: 'obb', x: x + sy * 0.24, z: z + cy * 0.24, halfX: 0.295, halfZ: 0.045, yaw,
    y0: y + 0.54, y1: y + 1.16, tag: 'wood', standable: true });
  for (const xx of [-0.23, 0.23]) for (const zz of [-0.22, 0.22]) k.solid.box(0.07, 0.46, 0.07, x + xx * cy + zz * sy, y + 0.23, z - xx * sy + zz * cy, P.wood, yaw);
}

export function chest(k, api, x, y, z, yaw = 0) {
  k.solid.open(); k.solid.box(0.87, 0.56, 0.60, x, y + 0.28, z, P.cutWood, yaw);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (const off of [-0.30, 0.30]) k.solid.box(0.055, 0.62, 0.65, x + off * cy, y + 0.30, z - off * sy, P.iron, yaw);
  k.solid.box(0.14, 0.13, 0.07, x + sy * 0.34, y + 0.30, z + cy * 0.34, P.iron, yaw);
  k.solid.close(x, z, 0.70, P.cutWood);
  api.emit({ kind: 'obb', x, z, halfX: 0.45, halfZ: 0.32, yaw, y0: y, y1: y + 0.61, tag: 'strongbox', standable: true, breakable: true });
}
