import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

// Every visible surface is a noodle: no skin, cloth, metal, plastic or painted
// body primitives. Each anatomical part is a small batch of curved pasta tubes.
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const TAU = Math.PI*2;
const Y = V(0,1,0);
const clamp = THREE.MathUtils.clamp;
const smooth = (a,b,t) => a+(b-a)*t;

function tube(points,r=.035,segments=32,sides=7) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, r, sides, false);
}

class NoodleBatch {
  constructor(group) { this.group=group; this.bins=new Map(); }
  add(points,material,r=.035,segments=32,sides=7) {
    if (!this.bins.has(material)) this.bins.set(material,[]);
    this.bins.get(material).push(tube(points,r,segments,sides));
  }
  spiral(center,radii,material,r=.035,turns=10,phase=0) {
    const points=[], count=Math.ceil(turns*24);
    for(let i=0;i<=count;i++) {
      const u=i/count, lat=-Math.PI/2+.12+u*(Math.PI-.24), theta=u*TAU*turns+phase;
      const c=Math.cos(lat);
      points.push(V(center.x+radii.x*c*Math.cos(theta),center.y+radii.y*Math.sin(lat),center.z+radii.z*c*Math.sin(theta)));
    }
    this.add(points,material,r,count,7);
  }
  ring(center,rx,rz,material,r=.03,yWave=0) {
    const points=[];
    for(let i=0;i<=48;i++) {
      const a=i/48*TAU;
      points.push(V(center.x+Math.cos(a)*rx,center.y+Math.sin(a*5)*yWave,center.z+Math.sin(a)*rz));
    }
    this.add(points,material,r,56);
  }
  finish() {
    for (const [mat,geos] of this.bins) {
      const geo=mergeGeometries(geos,false);
      const mesh=new THREE.Mesh(geo,mat);
      mesh.castShadow=true; mesh.receiveShadow=true;
      this.group.add(mesh);
      geos.forEach(g=>g.dispose());
    }
    this.bins.clear();
  }
}

function limb(parent,origin,end,mat,radius=.105) {
  const group=new THREE.Group(); group.position.copy(origin); parent.add(group);
  const b=new NoodleBatch(group);
  // A cylindrical bundle of slightly irregular individual noodles, not a solid
  // skinned limb. The helical winding remains legible even in silhouette.
  for(let j=0;j<9;j++) {
    const pts=[];
    for(let i=0;i<=12;i++) {
      const u=i/12,a=j/9*TAU+u*.8;
      pts.push(V(end.x*u+Math.cos(a)*radius, end.y*u, end.z*u+Math.sin(a)*radius));
    }
    b.add(pts,mat,.029,18);
  }
  b.finish(); return group;
}

function hand(parent,side,materials) {
  const b=new NoodleBatch(parent);
  b.spiral(V(0,-.58,.015),V(.12,.13,.10),materials.cream,.029,5);
  for(let i=0;i<3;i++) {
    const x=(i-1)*.06;
    b.add([V(x,-.60,.075),V(x,-.70,.1),V(x+.025,-.71,.04)],materials.cream,.026,12);
  }
  b.add([V(side*.08,-.52,.03),V(side*.17,-.59,.04),V(side*.14,-.63,.08)],materials.cream,.033,14);
  b.finish();
}

function shoe(parent,mat) {
  const b=new NoodleBatch(parent);
  // Conchiglie-like shell ribs form the toe; all the ribs are actual pasta.
  for(let i=0;i<13;i++) {
    const q=i/12, a=-Math.PI/2+q*Math.PI;
    const x=Math.sin(a)*.145, w=Math.cos(a);
    b.add([V(x,-.69,-.12),V(x*1.1,-.59,-.01),V(x*1.12,-.59,.16),V(x,-.67,.32*w),V(x*.9,-.72,.27*w)],mat,.030,20);
  }
  for(let i=0;i<2;i++) b.ring(V(0,-.72+i*.04,.08),.15,.24,mat,.026);
  b.finish();
}

// Position-based rope simulation. Distance constraints approximate the near
// inextensibility of cooked spaghetti; weak second-neighbor constraints resist
// bending. Free ends retain momentum and collide with body and ground.
class LooseSpaghetti {
  constructor(root,material) {
    this.root=root; this.ropes=[]; this.ready=false;
    this.maxSegments=600;
    const mat=material.clone(); mat.color.set(0xffffff);
    this.mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,7,1,false),mat,this.maxSegments);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow=true; this.mesh.receiveShadow=true;
    this.mesh.frustumCulled=false; this.mesh.count=0;
    root.add(this.mesh);
    this.tmp=new THREE.Object3D(); this.delta=V(); this.anchor=V();
    this.rootInverse=new THREE.Matrix4(); this.lastVelocity=V(); this.accel=V();
    this.color=new THREE.Color(); this.segmentCount=0;
  }
  add(pivot,offset,length,color,phase=0) {
    const n=7, p=[],old=[];
    for(let i=0;i<n;i++) {p.push(V());old.push(V());}
    this.ropes.push({pivot,offset:offset.clone(),length,rest:length/(n-1),p,old,phase,color:new THREE.Color(color)});
    for(let i=0;i<n-1;i++) this.mesh.setColorAt(this.segmentCount++,new THREE.Color(color));
    this.mesh.count=this.segmentCount;
    this.mesh.instanceColor.needsUpdate=true;
  }
  reset() {this.ready=false;this.lastVelocity.set(0,0,0);}
  update(dt,state) {
    dt=Math.min(Math.max(dt,1/240),1/30);
    const firmness=clamp(Number.isFinite(state.firmness)?state.firmness:.62,0,1);
    this.root.updateMatrixWorld(true);
    this.rootInverse.copy(this.root.matrixWorld).invert();
    const yaw=this.root.rotation.y,v=state.velocity||{x:0,y:0,z:0};
    this.delta.set(v.x||0,v.y||0,v.z||0);
    this.accel.copy(this.delta).sub(this.lastVelocity).multiplyScalar(-1/Math.max(dt,.01));
    this.lastVelocity.copy(this.delta);
    const ax=this.accel.x*Math.cos(yaw)-this.accel.z*Math.sin(yaw),az=this.accel.x*Math.sin(yaw)+this.accel.z*Math.cos(yaw);
    this.accel.set(clamp(ax,-36,36),-14,clamp(az,-36,36));
    const h=dt/2;
    // Softer noodles dissipate movement and permit tighter bends. Firmer pasta
    // retains a straighter local shape; neither setting changes strand length.
    const damping=Math.exp(-(3.8-2.8*firmness)*h);
    const bendStrength=.012+.22*firmness*firmness*firmness;
    const minimumBendSpan=1.10+.86*firmness;
    for(let sub=0;sub<2;sub++) {
      for(const rope of this.ropes) {
        this.anchor.copy(rope.offset).applyMatrix4(rope.pivot.matrixWorld).applyMatrix4(this.rootInverse);
        const {p,old,rest}=rope;
        if(!this.ready) {
          for(let j=0;j<p.length;j++) {
            p[j].copy(this.anchor).add(V(Math.sin(rope.phase+j*.65)*.025,-j*rest,Math.cos(rope.phase+j*.7)*.025));
            old[j].copy(p[j]);
          }
        }
        for(let j=1;j<p.length;j++) {
          const x=p[j].x,y=p[j].y,z=p[j].z;
          p[j].x+=(x-old[j].x)*damping+this.accel.x*h*h;
          p[j].y+=(y-old[j].y)*damping+this.accel.y*h*h;
          p[j].z+=(z-old[j].z)*damping+this.accel.z*h*h;
          old[j].set(x,y,z);
        }
        p[0].copy(this.anchor);old[0].copy(this.anchor);
        for(let iter=0;iter<6;iter++) {
          p[0].copy(this.anchor);
          for(let j=0;j<p.length-1;j++) {
            this.delta.copy(p[j+1]).sub(p[j]);
            const len=this.delta.length()||1, f=(len-rest)/len;
            if(j===0) p[j+1].addScaledVector(this.delta,-f);
            else {p[j].addScaledVector(this.delta,f*.5);p[j+1].addScaledVector(this.delta,-f*.5);}
          }
          for(let j=0;j<p.length-2;j++) {
            this.delta.copy(p[j+2]).sub(p[j]);
            const len=this.delta.length()||1, min=rest*minimumBendSpan;
            if(len<min) {const f=(len-min)/len*bendStrength;p[j+2].addScaledVector(this.delta,-f);if(j>0)p[j].addScaledVector(this.delta,f);}
            // Continuous curvature resistance is visible even when a bend is
            // gentler than the fold limit above. Corrections remain local.
            this.delta.copy(p[j]).add(p[j+2]).multiplyScalar(.5).sub(p[j+1]);
            p[j+1].addScaledVector(this.delta,bendStrength*.5);
            if(j>0)p[j].addScaledVector(this.delta,-bendStrength*.25);
            p[j+2].addScaledVector(this.delta,-bendStrength*.25);
          }
          if(!state.ragdoll) for(let j=2;j<p.length;j++) {
            // Approximate the torso as an ellipsoid for loose-strand contact.
            const qx=p[j].x/.385,qy=(p[j].y-1.1)/.34,qz=p[j].z/.26;
            const q=Math.sqrt(qx*qx+qy*qy+qz*qz);
            if(q<1&&q>.001) {p[j].x=qx/q*.385;p[j].y=1.1+qy/q*.34;p[j].z=qz/q*.26;}
          }
          if(state.grounded) for(let j=1;j<p.length;j++) if(p[j].y<.04) {p[j].y=.04;old[j].x=smooth(old[j].x,p[j].x,.32);old[j].z=smooth(old[j].z,p[j].z,.32);}
        }
      }
      this.ready=true;
    }
    let idx=0;
    for(const rope of this.ropes) {
      for(let j=0;j<rope.p.length-1;j++) {
        const a=rope.p[j],b=rope.p[j+1];
        this.delta.copy(b).sub(a);const len=this.delta.length();
        this.tmp.position.copy(a).add(b).multiplyScalar(.5);
        this.tmp.quaternion.setFromUnitVectors(Y,this.delta.normalize());
        const visible=rope.pivot.visible!==false;
        this.tmp.scale.set(visible?.025:0,visible?len+.018:0,visible?.025:0);this.tmp.updateMatrix();
        this.mesh.setMatrixAt(idx++,this.tmp.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate=true;
  }
}

export function createCharacter(materials) {
  const m={...materials};
  m.egg ||= m.cream; m.cream ||= m.egg; m.ink ||= m.toasted;
  m.tomato ||= m.egg; m.blue ||= m.ink; m.gold ||= m.egg; m.toasted ||= m.egg;
  const group=new THREE.Group();group.name='Mario — entirely pasta';
  const rig=new THREE.Group();group.add(rig);
  const torso=new THREE.Group();torso.position.y=1.10;rig.add(torso);
  let b=new NoodleBatch(torso);
  b.spiral(V(),V(.39,.36,.26),m.tomato,.035,11,.5);
  // Broad, dark-blue spaghetti overalls and separate curved shoulder straps.
  for(let i=0;i<12;i++) {
    const x=(i-5.5)*.058, z=.26*Math.sqrt(Math.max(0,1-x*x/.16));
    b.add([V(x,-.28,z*.72),V(x,-.13,z),V(x,.03,z+.015),V(x,.13,z*.85)],m.blue,.033,16);
    b.add([V(x,-.28,-z*.7),V(x,-.12,-z),V(x,.02,-z)],m.blue,.033,12);
  }
  for(const s of [-1,1]) {
    for(let j=0;j<2;j++) b.add([V(s*(.20+j*.055),.06,.25),V(s*(.25+j*.05),.25,.22),V(s*(.25+j*.05),.34,0),V(s*(.23+j*.05),.21,-.24),V(s*(.22+j*.05),-.08,-.25)],m.blue,.031,30);
    const button=[];for(let k=0;k<=24;k++){const a=k/24*TAU;button.push(V(s*.23+Math.cos(a)*.046,.12+Math.sin(a)*.046,.285));}b.add(button,m.gold,.018,28);
  }
  b.finish();
  const leftLeg=limb(rig,V(-.19,.78,0),V(0,-.53,0),m.blue,.105);
  const rightLeg=limb(rig,V(.19,.78,0),V(0,-.53,0),m.blue,.105);
  shoe(leftLeg,m.toasted);shoe(rightLeg,m.toasted);
  const leftArm=limb(rig,V(-.45,1.34,0),V(-.03,-.46,.025),m.tomato,.095);
  const rightArm=limb(rig,V(.45,1.34,0),V(.03,-.46,.025),m.tomato,.095);
  hand(leftArm,-1,m);hand(rightArm,1,m);
  const head=new THREE.Group();head.position.set(0,1.76,.025);rig.add(head);
  b=new NoodleBatch(head);
  b.spiral(V(0,0,0),V(.32,.32,.275),m.egg,.028,12,1.2);
  b.spiral(V(0,-.015,.29),V(.135,.105,.115),m.egg,.024,5,.8);
  // Ears are little pasta nests; the moustache is six black noodle curls.
  for(const s of [-1,1]) {
    b.spiral(V(s*.32,-.02,-.01),V(.075,.12,.06),m.egg,.023,4);
    for(let j=0;j<3;j++) {
      const x=s*(.035+j*.065), y=-.106-j*.012;
      b.add([V(x,y+.02,.292),V(x+s*.034,y-.045,.31),V(x+s*.067,y-.017,.29),V(x+s*.06,y+.01,.273)],m.ink,.026,16);
    }
    b.add([V(s*.13,.17,.24),V(s*.17,.20,.22),V(s*.23,.17,.19)],m.ink,.022,15);
    b.spiral(V(s*.145,.10,.244),V(.063,.09,.037),m.cream,.016,5);
    b.spiral(V(s*.14,.10,.278),V(.023,.052,.018),m.ink,.011,4);
    b.add([V(s*.28,.04,-.07),V(s*.29,-.10,-.09),V(s*.26,-.15,-.08)],m.ink,.032,14);
  }
  for(let i=0;i<6;i++) {
    const a=(i/5)*Math.PI;
    b.add([V(Math.cos(a)*.27,.07,-Math.sin(a)*.25),V(Math.cos(a)*.28,-.05,-Math.sin(a)*.27),V(Math.cos(a)*.24,-.15,-Math.sin(a)*.24)],m.ink,.031,14);
  }
  b.finish();
  const hat=new THREE.Group();hat.position.y=.22;head.add(hat);
  b=new NoodleBatch(hat);
  b.spiral(V(0,.06,-.025),V(.365,.17,.31),m.tomato,.031,7);
  // Pancaked spiral brim, visibly separate strands around its outer edge.
  for(let i=0;i<6;i++) b.ring(V(0,-.014,.155),.35-i*.034,.27-i*.024,m.tomato,.026,.003);
  b.ring(V(0,-.015,-.025),.335,.285,m.tomato,.032);
  const badge=[];for(let k=0;k<=36;k++){const a=k/36*TAU;badge.push(V(Math.cos(a)*.10,.055+Math.sin(a)*.10,.287));}
  b.add(badge,m.cream,.027,42);
  b.add([V(-.065,.02,.309),V(-.048,.102,.31),V(0,.052,.312),V(.048,.102,.31),V(.065,.02,.309)],m.cream,.019,20);
  b.finish();
  const pack=new THREE.Group();pack.name='Pasta sprayer pack';pack.position.set(0,1.25,-.30);rig.add(pack);
  b=new NoodleBatch(pack);
  b.spiral(V(0,-.04,-.10),V(.25,.34,.19),m.gold,.034,11);
  for(const s of [-1,1]) {
    b.spiral(V(s*.25,0,-.09),V(.092,.28,.10),m.cream,.024,9);
    b.add([V(s*.20,.21,-.10),V(s*.36,.29,-.06),V(s*.40,.25,.14),V(s*.32,.13,.28)],m.gold,.045,28);
    b.ring(V(s*.25,.28,-.09),.08,.08,m.gold,.024);
  }
  b.finish();
  const nozzle=new THREE.Group();nozzle.position.set(.37,1.55,.15);rig.add(nozzle);
  b=new NoodleBatch(nozzle);
  // Parallel bucatini tubes point forwards. Their open annular ends read as pasta.
  for(let j=0;j<8;j++) {
    const a=j/8*TAU,x=Math.cos(a)*.075,y=Math.sin(a)*.075;
    b.add([V(x,y,-.18),V(x,y,.02),V(x,y,.25)],m.gold,.027,12);
  }
  for(let j=0;j<3;j++) {
    const pts=[];for(let k=0;k<=32;k++){const a=k/32*TAU;pts.push(V(Math.cos(a)*.085,Math.sin(a)*.085,.20+j*.035));}
    b.add(pts,m.cream,.022,36);
  }
  b.finish();

  const loose=new LooseSpaghetti(group,m.egg);
  for(let i=0;i<10;i++) {
    const a=i/10*TAU;
    loose.add(hat,V(Math.cos(a)*.33,-.02,Math.sin(a)*.28-.025),.17+(i%3)*.035,m.tomato.color,a);
  }
  for(let i=0;i<8;i++) {
    const a=i/8*TAU;
    loose.add(torso,V(Math.cos(a)*.32,-.24,Math.sin(a)*.21),.23+(i%3)*.03,m.blue.color,a);
  }
  for(const arm of [leftArm,rightArm]) {
    for(let i=0;i<4;i++) {
      const a=i/4*TAU;loose.add(arm,V(Math.cos(a)*.10,-.44,Math.sin(a)*.10),.17+i*.015,m.tomato.color,a);
    }
  }
  for(let i=0;i<6;i++) {
    const a=i/6*TAU;
    loose.add(pack,V(Math.cos(a)*.18,-.26,-.10+Math.sin(a)*.13),.23+i*.025,m.gold.color,a);
  }
  let gait=0,squash=0,wasGrounded=true,flop=0,previousVy=0;
  const lerpAngle=(current,target,f)=>current+(target-current)*f;
  return {
    group,
    nozzle,
    setNozzleEnabled(enabled){pack.visible=nozzle.visible=enabled!==false;},
    reset() { pack.visible=nozzle.visible=true;loose.reset();gait=0;squash=0;flop=0;wasGrounded=true;previousVy=0; },
    update(dt,state={}) {
      dt=Math.min(dt,.05);
      pack.visible=nozzle.visible=state.nozzleEnabled!==false;
      const firmness=clamp(Number.isFinite(state.firmness)?state.firmness:.62,0,1);
      const time=state.time||0,speed=Math.min(state.speed||0,11);
      const ground=state.grounded!==false, spraying=!!state.spraying||!!state.grabbing, hovering=!!state.hovering;
      if(ground&&!wasGrounded) squash=Math.min(.29-.14*firmness,(Math.abs(previousVy)*.018+.04)*(1.35-.65*firmness));
      previousVy=state.vy||0;wasGrounded=ground;
      squash*=Math.exp(-dt*(8+10*firmness));
      gait+=dt*speed*2.25;
      const moving=Math.min(speed/3,1), swing=Math.sin(gait)*.62*moving;
      flop=lerpAngle(flop,state.ragdoll?1:0,1-Math.exp(-dt*10));
      rig.rotation.x=flop*(1.38-.28*firmness)+(hovering?-.10:0);
      rig.rotation.z=flop*Math.sin(time*5)*.18;
      rig.position.y=flop*.06+(ground?Math.abs(Math.sin(gait))*.025*moving:0);
      rig.scale.set(1+squash*.55,1-squash,1+squash*.55);
      leftLeg.rotation.x=(ground?swing:-.25)+flop*.50;
      rightLeg.rotation.x=(ground?-swing:.32)-flop*.35;
      leftLeg.rotation.z=flop*.36;
      rightLeg.rotation.z=-flop*.36;
      leftArm.rotation.x=spraying?-1.03:(hovering?-.45:-swing*.68);
      rightArm.rotation.x=spraying?-1.34:(hovering?-.45:swing*.68);
      leftArm.rotation.z=-.10-flop*.9-(hovering?.42:0);
      rightArm.rotation.z=.10+flop*.9+(hovering?.42:0);
      torso.rotation.z=Math.sin(gait)*.025*moving;
      head.rotation.y=Math.sin(time*1.7)*.025+(spraying?-.03:0);
      head.rotation.z=-torso.rotation.z*.7;
      hat.rotation.x=Math.sin(time*4)*.013;
      nozzle.rotation.x=spraying?-.03:.04;
      loose.update(dt,state);
    },
  };
}
