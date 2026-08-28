// The Fluff Above is a full navigable biome scene: cloud sea, storm orchard,
// moon ruins, three staged battles, an overlook, and the final crown arena.

import * as THREE from 'three';
import { REGIONS } from '../world/regions.js';
import { mats, addGlow, canvasTex } from '../world/props.js';
import { cloudBillboardGeometry, cloudBillboardMaterial, worldFoliage } from '../world/materials.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

export function makeFinalDef() {
  return {
    // InteriorBuilder boosts its compact light rig for the old dark rooms.
    // These deliberately restrained values leave enough headroom for white
    // clouds to keep shape and for the violet ruins to silhouette cleanly.
    fog: [0.07, 0.10, 0.22], fogDensity: 0.0054,
    hemiIntensity: 0.27, hemiColor: [0.48, 0.62, 0.94], sun: 0.34,
    spawn: { x: 0, y: 0, z: 82, yaw: 0 },
    exitOffset: 4,
    doorOutZ: 12,
    bossAt: { x: 0, z: -83 }, bossWake: 16,
    build(ctx) {
      const cloudTex = canvasTex('final-stormcloud', 512, (g, size) => {
        g.fillStyle = '#c9d7ee'; g.fillRect(0, 0, size, size);
        const rnd = (i, seed) => {
          const v = Math.sin(i * 91.731 + seed * 17.117) * 43758.5453;
          return v - Math.floor(v);
        };
        for (let i = 0; i < 1450; i++) {
          const x = rnd(i, 1) * size, y = rnd(i, 2) * size;
          const rx = 3 + rnd(i, 3) * 22, ry = 1.5 + rnd(i, 4) * 9;
          const v = 145 + (rnd(i, 5) * 96 | 0);
          g.fillStyle = `rgba(${v - 12},${v},${Math.min(255, v + 24)},${.08 + rnd(i, 6) * .25})`;
          g.beginPath(); g.ellipse(x, y, rx, ry, rnd(i, 7) * Math.PI, 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = 'rgba(70,92,150,.18)'; g.lineWidth = 1.2;
        for (let i = 0; i < 76; i++) {
          const y = rnd(i, 8) * size;
          g.beginPath(); g.moveTo(0, y);
          g.bezierCurveTo(size * .28, y + (rnd(i, 9) - .5) * 34,
            size * .72, y + (rnd(i, 10) - .5) * 34, size, y + (rnd(i, 11) - .5) * 18);
          g.stroke();
        }
      });
      cloudTex.repeat.set(5, 6);
      const cloudBump = cloudTex.clone(); cloudBump.colorSpace = THREE.NoColorSpace; cloudBump.needsUpdate = true;
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xb8cbea, map: cloudTex, bumpMap: cloudBump, bumpScale: .15,
        emissive: 0x213b6b, emissiveIntensity: .10, roughness: .62, metalness: .025,
      });
      const crownMat = cloudMat.clone();
      crownMat.color.setHex(0xd2e4ff); crownMat.emissive.setHex(0x4f73c8); crownMat.emissiveIntensity = .52;
      const duskMat = new THREE.MeshStandardMaterial({ color: 0x9587c4, emissive: 0x4d3f95, emissiveIntensity: .46, roughness: .58, metalness: .08, flatShading: true });
      const moonMat = new THREE.MeshStandardMaterial({ color: 0x9bb7df, emissive: 0x38588f, emissiveIntensity: .20, roughness: .60, metalness: .05, flatShading: true });
      const starMat = new THREE.MeshStandardMaterial({ color: 0xe6f8ff, emissive: 0x72cfff, emissiveIntensity: 1.35, roughness: .08 });
      const cloudSprite = worldFoliage('cloud');
      const fluffEntries = [];
      const fluffMat = cloudSprite ? cloudBillboardMaterial(cloudSprite, {
        base: [.45, .59, .86], peak: [1.0, .97, .94], opacity: .70,
      }) : null;
      const gateCloud = cloudSprite?.clone() || null;
      if (gateCloud) {
        gateCloud.wrapS = THREE.MirroredRepeatWrapping;
        gateCloud.wrapT = THREE.ClampToEdgeWrapping;
        gateCloud.repeat.set(7, 1);
        gateCloud.needsUpdate = true;
      }
      const gateMat = gateCloud ? cloudBillboardMaterial(gateCloud, {
        base: [.38, .56, .92], peak: [.86, .94, 1.0], opacity: .26,
      }) : new THREE.MeshBasicMaterial({
        color: 0x9fc5ff, transparent: true, opacity: .025,
        depthWrite: false, side: THREE.DoubleSide,
      });
      ctx.encounters = [];
      ctx._finalAnimated = [];

      // A real sky volume gives the biome a blue-hour horizon instead of a
      // flat clear color. It is deliberately quiet behind the navigable cloud
      // silhouettes and costs one draw call.
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(175, 32, 18),
        new THREE.ShaderMaterial({
          side: THREE.BackSide, depthWrite: false, fog: false,
          vertexShader: `varying vec3 vDir; void main(){vDir=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`,
          fragmentShader: `
            varying vec3 vDir;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
            float fbm(vec2 p){float v=0.0,a=.52;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.03+vec2(4.7,-3.1);a*=.5;}return v;}
            void main(){
              vec3 d=normalize(vDir);
              float h=clamp(d.y*.72+.28,0.0,1.0);
              vec3 horizon=vec3(.63,.31,.53);
              vec3 middle=vec3(.13,.27,.55);
              vec3 zenith=vec3(.018,.045,.14);
              vec3 col=mix(horizon,middle,smoothstep(0.0,.38,h));
              col=mix(col,zenith,smoothstep(.35,1.0,h));
              float sun=dot(d,normalize(vec3(-.56,.22,-.36)));
              col+=vec3(1.0,.57,.31)*(pow(max(sun,0.0),72.0)*.50+smoothstep(.995,.9992,sun)*.88);
              vec2 uv=vec2(atan(d.z,d.x)*1.45,h*4.0);
              float n=fbm(uv+vec2(5.2,-8.1));
              float cloud=smoothstep(.43,.68,n)*smoothstep(.02,.22,h);
              float rim=smoothstep(.37,.51,n)-smoothstep(.59,.73,n);
              col=mix(col,vec3(.025,.05,.15)+vec3(.08,.11,.25)*n,cloud*.52);
              col+=mix(vec3(.12,.44,.72),vec3(.48,.14,.78),n)*rim*.30;
              float veil=pow(.5+.5*sin(atan(d.z,d.x)*5.0+n*6.0),5.0)*smoothstep(.12,.4,h)*(1.0-smoothstep(.72,.95,h));
              col+=mix(vec3(.08,.52,.75),vec3(.51,.16,.78),n)*veil*.11;
              if(d.y>.08){vec2 sp=d.xz/(d.y+.35)*48.0;vec2 cell=floor(sp);vec2 dotUv=fract(sp)-.5;float st=hash(cell);float spark=smoothstep(.075,0.0,length(dotUv))*step(.992,st);col+=vec3(.8,.9,1.0)*spark*(1.0-cloud)*.55;}
              gl_FragColor=vec4(col,1.0);
            }`,
        })
      );
      sky.renderOrder = -10; sky.frustumCulled = false; ctx.scene.add(sky);

      const warm = new THREE.PointLight(0xffa36a, 10, 75, 2);
      warm.position.set(-32, 20, 58); ctx.scene.add(warm);
      const cool = new THREE.PointLight(0x769dff, 8, 95, 2);
      cool.position.set(28, 26, -38); ctx.scene.add(cool);

      // The walkable cloud sea uses the same analytic ground plane as every
      // interior; broad overlapping banks make that floor feel physical.
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(170, 190, 24, 28), cloudMat);
      sea.rotation.x = -Math.PI / 2; sea.position.y = -.25; sea.receiveShadow = true; ctx.scene.add(sea);
      ctx.collide.addBox(-85, -95, 85, -94, 0, 12);
      ctx.collide.addBox(-85, 94, 85, 95, 0, 12);
      ctx.collide.addBox(-85, -95, -84, 95, 0, 12);
      ctx.collide.addBox(84, -95, 85, 95, 0, 12);

      const cloudGeo = new THREE.DodecahedronGeometry(1, 1);
      const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat.clone(), 260);
      const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
      for (let i = 0; i < 260; i++) {
        const a = i * 2.399, r = 18 + (i % 17) * 4.4;
        const z = 86 - (i % 29) * 6.1;
        p.set(Math.cos(a) * r * .72, -1.2 + Math.sin(i * 1.7) * .8, z);
        q.setFromEuler(new THREE.Euler(0, a, 0));
        s.set(3 + (i % 4), .7 + (i % 3) * .3, 2.5 + (i % 5));
        mat4.compose(p, q, s); clouds.setMatrixAt(i, mat4);
      }
      clouds.instanceMatrix.needsUpdate = true; clouds.receiveShadow = true; ctx.scene.add(clouds);

      const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; ctx.scene.add(mesh); return mesh; };
      const pillar = (x, z, h, mat = moonMat, r = .55) => {
        const p = add(new THREE.Mesh(new THREE.CylinderGeometry(r * .8, r, h, 9), mat), x, h / 2, z);
        ctx.collide.addCircle(x, z, r, 0, h); return p;
      };
      const arch = (x, z, w, h, mat = moonMat) => {
        pillar(x - w / 2, z, h, mat); pillar(x + w / 2, z, h, mat);
        add(box(w + 1, .65, .8, mat), x, h - .32, z);
      };
      const island = (x, z, r, y = 0, mat = cloudMat) => {
        const m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, .65, 18), mat), x, y - .2, z);
        ctx.collide.addBox(x - r, z - r, x + r, z + r, y - .6, y, { standable: true }); return m;
      };
      const star = (x, y, z, s = .5) => {
        const m = add(new THREE.Mesh(new THREE.OctahedronGeometry(s, 1), starMat), x, y, z);
        ctx._finalAnimated.push({ mesh: m, baseY: y, phase: x + z, kind: 'star' }); addGlow(x, y, z, [0.58, .84, 1], 1.5); return m;
      };
      const cloudTree = (x, z, h, index) => {
        const tree = new THREE.Group();
        tree.position.set(x, 0, z);
        tree.rotation.y = index * 1.37;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .32, h, 10, 3), duskMat);
        trunk.position.y = h * .5;
        trunk.rotation.z = Math.sin(index * 2.3) * .055;
        trunk.castShadow = true;
        tree.add(trunk);
        for (const side of [-1, 1]) {
          const length = h * (.25 + (index % 3) * .025);
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(.055, .13, length, 8, 2), duskMat);
          branch.position.set(side * .34, h * (.68 + side * .025), 0);
          branch.rotation.z = side * (.72 + (index % 2) * .08);
          branch.rotation.y = side * .38;
          branch.castShadow = true;
          tree.add(branch);
        }
        ctx.scene.add(tree);
        ctx.collide.addCircle(x, z, .34, 0, h);
        return tree;
      };

      // Arrival garden: gentle, broad, and safe enough to make the new biome
      // feel like a place before it starts asking for violence.
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2, r = 10 + (i % 3) * 5;
        const x = Math.cos(a) * r, z = 61 + Math.sin(a) * 11;
        const h = 4.2 + (i % 4) * .9;
        cloudTree(x, z, h, i);
        if (fluffMat) {
          for (let k = 0; k < 2; k++) {
            const offsetA = a + (k ? 1.45 : -1.1);
            fluffEntries.push({
              x: x + Math.cos(offsetA) * (k ? 1.0 : .72),
              y: h - 1.15 + k * .78,
              z: z + Math.sin(offsetA) * (k ? .82 : .58),
              sx: 4.0 + ((i + k * 2) % 5) * .62,
              sy: 2.7 + ((i + k) % 4) * .34,
              yaw: offsetA,
              tint: (i + k) % 3 === 0 ? [.92, .98, 1.10] : [1.03, .96, 1.02],
            });
          }
        } else {
          const crown = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + (i % 3) * .4, 1), crownMat), x, h + .6, z);
          crown.scale.set(1.28, .52, 1.0);
        }
        if (i % 2 === 0) star(x + Math.cos(a + .7) * 1.1, h * .72, z + Math.sin(a + .7) * 1.1, .17);
      }
      for (const x of [-18, -9, 0, 9, 18]) arch(x, 42 + Math.sin(x) * 3, 6, 7 + Math.abs(x) * .08);

      // Storm orchard: floating dark fruit and moving rings telegraph the first
      // large battle from a distance.
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, r = 10 + (i % 4) * 3;
        const fruit = add(new THREE.Mesh(new THREE.IcosahedronGeometry(.9 + (i % 3) * .25, 1), duskMat), Math.cos(a) * r, 3 + (i % 5), 23 + Math.sin(a) * 13);
        ctx._finalAnimated.push({ mesh: fruit, baseY: fruit.position.y, phase: i, kind: 'float' });
      }
      const stormRing = add(new THREE.Mesh(new THREE.TorusGeometry(13, .14, 7, 48), starMat), 0, 5, 23);
      stormRing.rotation.x = Math.PI / 2; ctx._finalAnimated.push({ mesh: stormRing, kind: 'ring', speed: .13 });

      // Moon ruins and the safe overlook beyond the second battle.
      for (const z of [3, -8, -19, -30]) {
        arch(Math.sin(z) * 8, z, 13 - (Math.abs(z) % 4), 9 + (Math.abs(z) % 5));
        for (const x of [-20, 20]) pillar(x + Math.sin(z), z, 5 + (Math.abs(z) % 6), moonMat, .42);
      }
      island(-27, -42, 10, 1.4, duskMat); island(27, -42, 10, 1.4, duskMat);
      for (const x of [-27, 27]) for (let i = 0; i < 7; i++) star(x + Math.cos(i) * 6, 3 + i * .6, -42 + Math.sin(i) * 6, .28 + i * .025);

      // Final causeway and crown. The arena is enormous relative to original
      // rooms so dash, glide, seeker arcs, and grapple travel all have space.
      for (let i = 0; i < 9; i++) {
        const x = (i % 2 ? 1 : -1) * (3 + i * 1.45), z = -48 - i * 4;
        island(x, z, 5.2, (i % 3) * .35, i % 2 ? cloudMat : moonMat);
        star(-x, 5 + (i % 4) * 1.2, z, .42);
      }
      const crown = add(new THREE.Mesh(new THREE.TorusGeometry(23, .28, 8, 64), duskMat), 0, .35, -83);
      crown.rotation.x = Math.PI / 2;
      const arena = add(new THREE.Mesh(new THREE.CylinderGeometry(25, 28, .8, 48), moonMat), 0, -.2, -83);
      arena.receiveShadow = true;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        pillar(Math.cos(a) * 22, -83 + Math.sin(a) * 22, 7 + (i % 3) * 2, i % 2 ? duskMat : moonMat, .5);
        const sx = Math.cos(a) * 19, sy = 7 + (i % 4), sz = -83 + Math.sin(a) * 19;
        star(sx, sy, sz, .52);
        ctx.collide.addCircle(sx, sz, .7, sy - .8, sy + .8); // visible grapple stars
      }

      // R6 carries the real-alpha cloud-bank asset into the complete final
      // biome. These are spatially composed as orchard crowns, side banks,
      // high drifting masses and an arena wreath rather than uniform scatter.
      // They add one draw call and no collision, trigger, or progression state.
      if (fluffMat) {
        for (let i = 0; i < 32; i++) {
          const side = i % 2 ? 1 : -1, step = Math.floor(i / 2);
          fluffEntries.push({
            x: side * (28 + (step % 4) * 3.2 + Math.sin(step * 1.7) * 2.4),
            y: -.25 + (i % 4) * .52,
            z: 83 - step * 10.7,
            sx: 7.0 + (i % 5) * 1.05, sy: 3.5 + (i % 4) * .52,
            yaw: side * (.18 + (i % 3) * .12),
            tint: side > 0 ? [.76, .88, 1.12] : [1.05, .82, 1.02],
          });
        }
        for (let i = 0; i < 8; i++) {
          const a = i * 2.3999632297;
          fluffEntries.push({
            x: Math.cos(a) * (22 + (i % 4) * 9),
            y: 15 + (i % 4) * 4.2,
            z: 48 - i * 19,
            sx: 10 + (i % 4) * 2.1, sy: 4.8 + (i % 3) * 1.25,
            yaw: a, tint: [.70 + (i % 3) * .07, .82, 1.10],
          });
        }
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2;
          fluffEntries.push({
            x: Math.cos(a) * (27 + (i % 3) * 1.8),
            y: -.25 + (i % 4) * .55,
            z: -83 + Math.sin(a) * (27 + (i % 3) * 1.8),
            sx: 6.2 + (i % 5) * .85, sy: 3.2 + (i % 4) * .48,
            yaw: -a, tint: [.78, .88, 1.14],
          });
        }
        const fluffs = new THREE.InstancedMesh(cloudBillboardGeometry(), fluffMat, fluffEntries.length);
        const fluffColor = new THREE.Color();
        for (let i = 0; i < fluffEntries.length; i++) {
          const f = fluffEntries[i];
          q.setFromEuler(new THREE.Euler(0, f.yaw, 0));
          mat4.compose(p.set(f.x, f.y, f.z), q, s.set(f.sx, f.sy, 1));
          fluffs.setMatrixAt(i, mat4);
          fluffColor.setRGB(...f.tint); fluffs.setColorAt(i, fluffColor);
        }
        fluffs.instanceMatrix.needsUpdate = true;
        if (fluffs.instanceColor) fluffs.instanceColor.needsUpdate = true;
        fluffs.frustumCulled = false;
        fluffs.renderOrder = 2;
        ctx.scene.add(fluffs);
        ctx._finalFluffs = fluffs;
      }

      const addEncounter = (id, x, z, types, gateZ) => {
        const tag = `final:${id}`;
        const spawns = [];
        for (let i = 0; i < types.length; i++) {
          const a = i / types.length * Math.PI * 2;
          spawns.push({ type: types[i], x: x + Math.cos(a) * (6 + i % 3), z: z + Math.sin(a) * (6 + i % 2) });
        }
        const gate = add(new THREE.Mesh(new THREE.PlaneGeometry(168, 11, 24, 2), gateMat), 0, 5.5, gateZ);
        const collider = ctx.collide.addBox(-84, gateZ - .4, 84, gateZ + .4, 0, 12);
        ctx.encounters.push({ id, tag, trigger: { x, z, r: 13 }, spawns, gate, collider, spawned: false, cleared: false });
      };
      addEncounter('garden', 0, 48, ['puff', 'hopper', 'wisp', 'puff', 'hopper'], 35);
      addEncounter('storm', 0, 23, ['hound', 'sentinel', 'gasbag', 'turret', 'drone', 'wisp'], 9);
      addEncounter('moon', 0, -21, ['golem', 'sentinel', 'creeper', 'drone', 'wisp', 'hound', 'gasbag'], -43);
    },
    update(ctx, dt, t) {
      for (const a of ctx._finalAnimated || []) {
        if (a.kind === 'star') { a.mesh.position.y = a.baseY + Math.sin(t * 1.2 + a.phase) * .25; a.mesh.rotation.y += dt; }
        else if (a.kind === 'float') { a.mesh.position.y = a.baseY + Math.sin(t * .8 + a.phase) * .8; a.mesh.rotation.y += dt * .24; }
        else if (a.kind === 'ring') a.mesh.rotation.z += dt * a.speed;
      }
    },
  };
}
