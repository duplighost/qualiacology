// A physical bedside light puzzle. E flips the aimed lamp and its neighbours.
// No control lock, separate screen or tutorial; the player can leave whenever they like.
import * as THREE from 'three';
import { Kit } from './sites.js';

export function flipLights(bits,index){
  const x=index%3,y=Math.floor(index/3);
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
    const xx=x+dx,yy=y+dy;if(xx>=0&&xx<3&&yy>=0&&yy<3)bits^=1<<(yy*3+xx);
  }
  return bits;
}
const startBits=[0,2,6,8].reduce(flipLights,511);

// Bed and room anchors are in the site's frame. Try either bedside before clamping
// the tabletop inside the room; this also handles beds facing away from the doorway.
export function bedsidePlacement(bag,room){
  const yaw=bag.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),rc=Math.cos(room.yaw||0),rs=Math.sin(room.yaw||0);
  const relative=yaw-(room.yaw||0),hx=.39*Math.abs(Math.cos(relative))+.305*Math.abs(Math.sin(relative));
  const hz=.39*Math.abs(Math.sin(relative))+.305*Math.abs(Math.cos(relative));
  const limitX=Math.max(0,room.w/2-.20-hx),limitZ=Math.max(0,room.d/2-.20-hz);
  let lx=0,lz=0;
  for(const side of [1,-1]){
    const dx=bag.x+side*1.03*c-.30*s-room.x,dz=bag.z-side*1.03*s-.30*c-room.z;
    lx=dx*rc-dz*rs;lz=dx*rs+dz*rc;
    if(Math.abs(lx)<=limitX&&Math.abs(lz)<=limitZ)break;
  }
  lx=Math.max(-limitX,Math.min(limitX,lx));lz=Math.max(-limitZ,Math.min(limitZ,lz));
  const x=room.x+lx*rc+lz*rs,z=room.z-lx*rs+lz*rc,dx=bag.x-x,dz=bag.z-z;
  return{x,z,yaw,rugX:dx*c-dz*s,rugZ:dx*s+dz*c-.02};
}

// ALEX, 2026-09-16: "puzzle in the morning / the mourning doesn't work because some of the
// 9 lights are in the wall and cant be activated."
//
// The board is a vertical panel on the back of the bedside cabinet and it faces that
// cabinet's own +Z. Which way that pointed was decided by the BED's yaw and by nothing else,
// so in a room whose bed stands with its foot at a wall the nine lamps face masonry: the
// sight line from the eye to a lamp ends inside the wall, segmentClear answers false, and
// there is no prompt however long you stand there. The clamp above only ever kept the
// CABINET inside the room; it never asked whether a person could stand in front of it.
//
// The facing is measured now. STAND_OFF is where a reader's body would be; a facing is only
// taken if that point is inside the room AND the collision world says a body fits there. The
// bed's own yaw is tried first, so nothing moves in a room that was already right.
const STAND_OFF = .92;           // m in front of the board: where the reader stands
const BODY_R = .34, BODY_H = 1.7;

/** The bed's yaw, then the two quarter turns, then straight about. */
export function bedsideFacings(base){
  return [base, base + Math.PI / 2, base - Math.PI / 2, base + Math.PI];
}

/** Is (x,z) at least `margin` inside the room, in the SITE's frame? */
export function insideRoom(room, x, z, margin){
  const rc = Math.cos(room.yaw || 0), rs = Math.sin(room.yaw || 0);
  const dx = x - room.x, dz = z - room.z;
  const lx = dx * rc - dz * rs, lz = dx * rs + dz * rc;
  return Math.abs(lx) <= room.w / 2 - margin && Math.abs(lz) <= room.d / 2 - margin;
}

export class RefugeComfort {
  constructor(unit){
    this.u=unit;this.ctx=unit.ctx;this.bits=startBits;this.loaded=false;this.usePrev=false;this.lamps=[];this.solved=false;
    this.eye=new THREE.Vector3();this.dir=new THREE.Vector3();this.at=new THREE.Vector3();this.delta=new THREE.Vector3();
    this.offLoad=this.ctx.bus.on('save:loaded',()=>{this.loaded=false;this.usePrev=!!this.ctx.input?.held('use');});
  }

  /**
   * WHICH WAY THE NINE LAMPS LOOK. The first facing with standing room in front of it wins;
   * if the room has none anywhere the bed's own yaw is kept rather than inventing a worse one.
   */
  _facing(placement){
    const u=this.u,room=u.spec.room,base=placement.yaw;
    const col=this.ctx.systems?.get?.('collision');
    for(const yaw of bedsideFacings(base)){
      const sx=placement.x+Math.sin(yaw)*STAND_OFF,sz=placement.z+Math.cos(yaw)*STAND_OFF;
      if(!insideRoom(room,sx,sz,.34))continue;
      if(typeof col?.fits!=='function')return yaw;
      const wx=u._wx?u._wx(sx,sz):sx,wz=u._wz?u._wz(sx,sz):sz;
      if(col.fits(wx,wz,u.padY+.06,BODY_R,BODY_H))return yaw;
    }
    return base;
  }

  build(){
    const u=this.u,placement=bedsidePlacement(u.anchors.bag,u.spec.room);
    placement.yaw=this._facing(placement);
    // The rug lies between the cabinet and the bed, so its offset is in the GROUP's frame
    // and has to be re-taken from whatever facing was chosen above.
    {
      const c=Math.cos(placement.yaw),s=Math.sin(placement.yaw);
      const dx=u.anchors.bag.x-placement.x,dz=u.anchors.bag.z-placement.z;
      placement.rugX=dx*c-dz*s;placement.rugZ=dx*s+dz*c-.02;
    }
    this.placement=placement;
    this.group=new THREE.Group();this.group.name='refuge-comfort-'+u.siteId;
    this.group.position.set(placement.x,u.padY,placement.z);this.group.rotation.y=placement.yaw;
    u.group.add(this.group);
    const k=new Kit();
    k.box(.72,.68,.55,0,.44,0,[.082,.057,.037]);
    k.box(.78,.075,.61,0,.82,0,[.17,.12,.068]);
    for(const yy of [.38,.65]){k.box(.58,.18,.016,0,yy,.285,[.115,.071,.035]);k.cyl(.025,.025,.025,8,0,yy,.307,[.33,.25,.12],Math.PI/2);}
    // Framed board sits upright at an easy standing eye angle beside the pillow.
    k.box(.68,.64,.055,0,1.17,-.16,[.18,.12,.06]);
    k.box(.60,.56,.018,0,1.17,-.12,[.018,.025,.029]);
    // The nearby torch is much stronger than the room lamps. Dark, rough timber
    // keeps the drawer edges, black board and warm bulbs distinct in its beam.
    this.wood=new THREE.MeshStandardMaterial({color:0x625a50,vertexColors:true,roughness:.98,metalness:0});
    this.wood.name='refuge-bedside-timber';
    this.body=new THREE.Mesh(k.build(),this.wood);this.body.castShadow=true;this.body.receiveShadow=true;this.group.add(this.body);
    this.dark=new THREE.MeshStandardMaterial({color:0x332d22,roughness:.85,metalness:.20});
    this.on=new THREE.MeshBasicMaterial({color:0xffd69b,toneMapped:false});
    this.geometry=new THREE.SphereGeometry(.037,14,10);
    for(let i=0;i<9;i++){
      const m=new THREE.Mesh(this.geometry,this.dark);m.position.set((i%3-1)*.17,1.17+(1-Math.floor(i/3))*.17,-.079);this.group.add(m);this.lamps.push(m);
    }
    // A warm enamel mug and folded wool square make this somebody's bedside.
    const mug=new Kit();mug.cyl(.070,.055,.13,16,.23,.92,.15,[.24,.29,.25]);
    const mm=new THREE.Mesh(mug.build(),this.wood);this.group.add(mm);
    const mat=new THREE.MeshStandardMaterial({color:0x9e8157,roughness:.98});this.rugMat=mat;
    const rug=new THREE.Mesh(new THREE.BoxGeometry(1.2,.022,2.3),mat);rug.position.set(placement.rugX,.129,placement.rugZ);this.group.add(rug);
  }
  step(){
    this.focus=-1;
    const use=!!this.ctx.input?.held('use'),pressed=use&&!this.usePrev;this.usePrev=use;
    const u=this.u,pr=this.ctx.systems.get('progress'),p=this.ctx.systems.get('player');if(!p)return;
    if(!this.loaded&&this.ctx.ready){const bits=pr.flag('refuge-puzzle:'+u.siteId);this.bits=Number.isInteger(bits)&&bits>=0&&bits<=511?bits:startBits;this.solved=!!pr.flag('refuge-puzzle-solved:'+u.siteId);this.loaded=true;}
    for(let i=0;i<9;i++)this.lamps[i].material=u.power&&(this.bits&(1<<i))?this.on:this.dark;
    if(!this.ctx.playing||this.ctx.paused||p.dead||this.ctx.shared?.inCar||!u._canRest()||!u.contains(p.pos.x,p.pos.y,p.pos.z)||this.solved)return;
    const cam=this.ctx.systems.get('camera');this.group.updateWorldMatrix(true,true);
    const {eye,dir,at,delta}=this;
    eye.set(p.pos.x,p.eyeY??p.pos.y+1.66,p.pos.z);
    dir.set(-Math.sin(cam.yaw)*Math.cos(cam.pitch),Math.sin(cam.pitch),-Math.cos(cam.yaw)*Math.cos(cam.pitch));
    // NEAREST TO THE RAY, not a fixed cone. A 0.995 dot is 5.7 degrees, and at arm's length
    // that is narrower than the gap between two lamps: an aim that fell between two of them
    // read as nothing at all. Perpendicular distance to the aim line picks the lamp you are
    // plainly pointing at from any range, and the 0.085 m bar is half the 0.17 m spacing, so
    // it still can never pick two.
    let best=-1,near=.085;
    for(let i=0;i<9;i++){
      this.lamps[i].getWorldPosition(at);delta.copy(at).sub(eye);
      const along=delta.dot(dir);
      if(along<.12||along>2.6)continue;
      const perp=Math.sqrt(Math.max(0,delta.lengthSq()-along*along));
      if(perp<near){near=perp;best=i;}
    }
    if(best<0)return;
    this.lamps[best].getWorldPosition(at);
    const m=this.group.matrixWorld.elements;
    if((eye.x-at.x)*m[8]+(eye.z-at.z)*m[10]<=.05)return;
    const collision=this.ctx.systems.get('collision');
    if(collision&&!collision.segmentClear(eye.x,eye.y,eye.z,at.x,at.y,at.z))return;
    this.focus=best;
    this.ctx.bus.emit('prompt',{kind:'use',label:'E',rank:7,x:at.x,y:at.y,z:at.z,k:0,detail:'TURN LIGHT',subdetail:'LIGHT ALL NINE',unavailable:false});
    if(pressed){
      this.bits=flipLights(this.bits,best);pr.flag('refuge-puzzle:'+u.siteId,this.bits);
      u._say('lantern',.17,at.x,at.y,at.z);
      if(this.bits===511){this.solved=true;pr.flag('refuge-puzzle-solved:'+u.siteId,true);pr.payCash(40,at.x,at.y,at.z,'nine-lights');this.ctx.bus.emit('refuge:puzzle',{id:u.siteId});}
    }
  }
  dispose(){this.offLoad?.();this.group?.removeFromParent();this.group?.traverse(o=>{if(o.geometry&&o.geometry!==this.geometry)o.geometry.dispose();});this.geometry?.dispose();this.wood?.dispose();this.dark?.dispose();this.on?.dispose();this.rugMat?.dispose();}
}
